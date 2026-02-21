import express from "express"
import fetch from "node-fetch"
import dotenv from "dotenv"
import path from "path"
import { fileURLToPath } from "url"
import crypto from "crypto"
import mongoose from "mongoose"

dotenv.config()
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const app = express()

mongoose.connect("mongodb+srv://lilzeng1admin:George11Nasa@atlas.sujnqrt.mongodb.net/Atlas?retryWrites=true&w=majority&appName=Atlas", {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => { }).catch(e => { })

const suggestionSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    text: String,
    user: Object,
    likes: [String],
    dislikes: [String],
    timestamp: Date
})

const Suggestion = mongoose.model("Suggestion", suggestionSchema)

app.set("trust proxy", 1)
app.use((req, res, next) => {
    const origin = req.headers.origin
    if (origin) {
        res.header("Access-Control-Allow-Origin", origin)
    } else {
        res.header("Access-Control-Allow-Origin", "*")
    }
    res.header("Access-Control-Allow-Credentials", "true")
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization")
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE")
    if (req.method === "OPTIONS") return res.sendStatus(200)
    next()
})
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

const { BOT_TOKEN, CLIENT_ID, CLIENT_SECRET, BASE_URL, GUILD_ID } = process.env
const SUGGESTION_CHANNEL_ID = "1474169182852743230"
const REDIRECT_URI = `${BASE_URL}/api/auth/discord/redirect`
const sessions = new Map()
const authStates = new Map()
const ALLOWED_ROLES = ["1472759257769312256", "1468394439226691725", "1472058610308612157", "1470530769641410560"]

async function checkUserRole(userId) {
    try {
        const res = await fetch(`https://discord.com/api/v10/guilds/${GUILD_ID}/members/${userId}`, {
            headers: { Authorization: `Bot ${BOT_TOKEN}` }
        })
        if (!res.ok) return false
        const member = await res.json()
        return member.roles.some(r => ALLOWED_ROLES.includes(r))
    } catch {
        return false
    }
}

app.get("/api/user", async (req, res) => {
    const token = req.headers.authorization?.split(" ")[1]
    if (!token || !sessions.has(token)) return res.status(401).json({ logged: false })
    const user = sessions.get(token).user
    const isStaff = await checkUserRole(user.id)
    res.json({ logged: true, user: user, isStaff })
})

app.get("/auth/login", (req, res) => {
    const returnTo = req.query.returnTo || "https://lilzeng1.github.io/Atlas/"
    const state = crypto.randomBytes(16).toString("hex")
    authStates.set(state, returnTo)
    const discordUrl = `https://discord.com/oauth2/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=identify%20guilds.join&state=${state}`
    res.redirect(discordUrl)
})

app.get("/auth/logout", (req, res) => {
    const token = req.query.token
    if (token) sessions.delete(token)
    const returnTo = req.query.returnTo || "https://lilzeng1.github.io/Atlas/"
    res.redirect(returnTo)
})

app.get("/api/auth/discord/redirect", async (req, res) => {
    const code = req.query.code
    const state = req.query.state
    const returnTo = authStates.get(state) || "https://lilzeng1.github.io/Atlas/"
    if (state) authStates.delete(state)
    if (!code) return res.redirect(returnTo)
    try {
        const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                grant_type: "authorization_code",
                code: code,
                redirect_uri: REDIRECT_URI
            })
        })
        const tokenData = await tokenRes.json()
        if (!tokenData.access_token) return res.redirect(returnTo)
        const userRes = await fetch("https://discord.com/api/users/@me", {
            headers: { Authorization: `Bearer ${tokenData.access_token}` }
        })
        const userData = await userRes.json()
        const sessionToken = crypto.randomBytes(32).toString("hex")
        sessions.set(sessionToken, {
            user: { id: userData.id, username: userData.username, avatar: userData.avatar },
            createdAt: Date.now()
        })
        const separator = returnTo.includes("?") ? "&" : "?"
        res.redirect(`${returnTo}${separator}token=${sessionToken}`)
    } catch {
        res.redirect(returnTo)
    }
})

app.get("/api/suggestions", async (req, res) => {
    try {
        const suggestions = await Suggestion.find().sort({ timestamp: -1 })
        res.json(suggestions)
    } catch {
        res.status(500).json({ error: "Database error" })
    }
})

app.post("/api/suggestions", async (req, res) => {
    const token = req.headers.authorization?.split(" ")[1]
    if (!token || !sessions.has(token)) return res.status(401).json({ error: "Unauthorized" })
    const user = sessions.get(token).user
    const { text } = req.body
    if (!text || text.length < 5) return res.status(400).json({ error: "Too short" })
    const newSuggestion = new Suggestion({
        id: Date.now().toString() + crypto.randomBytes(4).toString("hex"),
        text,
        user: user,
        likes: [],
        dislikes: [],
        timestamp: new Date()
    })
    try {
        await newSuggestion.save()
        const avatar = user.avatar
            ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
            : `https://cdn.discordapp.com/embed/avatars/0.png`
        const discordRes = await fetch(`https://discord.com/api/v10/channels/${SUGGESTION_CHANNEL_ID}/messages`, {
            method: "POST",
            headers: { Authorization: `Bot ${BOT_TOKEN}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                embeds: [{
                    title: "✨ Yeni ATLAS Önerisi",
                    description: `**Öneri:**\n\`\`\`${text}\`\`\``,
                    color: 0xffffff,
                    author: { name: user.username, icon_url: avatar },
                    footer: { text: "ATLAS Community Hub" },
                    timestamp: new Date()
                }]
            })
        })
        const m = await discordRes.json()
        if (m.id) {
            await fetch(`https://discord.com/api/v10/channels/${SUGGESTION_CHANNEL_ID}/messages/${m.id}/reactions/%E2%9C%85/@me`, { method: "PUT", headers: { Authorization: `Bot ${BOT_TOKEN}` } })
            await fetch(`https://discord.com/api/v10/channels/${SUGGESTION_CHANNEL_ID}/messages/${m.id}/reactions/%E2%9D%8C/@me`, { method: "PUT", headers: { Authorization: `Bot ${BOT_TOKEN}` } })
        }
        res.json({ success: true })
    } catch {
        res.status(500).json({ error: "Failed" })
    }
})

app.post("/api/suggestions/react", async (req, res) => {
    const token = req.headers.authorization?.split(" ")[1]
    if (!token || !sessions.has(token)) return res.status(401).json({ error: "Unauthorized" })
    const user = sessions.get(token).user
    const { id, type } = req.body
    try {
        const s = await Suggestion.findOne({ id: id })
        if (!s) return res.status(404).json({ error: "Not found" })
        s.likes = s.likes.filter(u => u !== user.id)
        s.dislikes = s.dislikes.filter(u => u !== user.id)
        if (type === "like") s.likes.push(user.id)
        else s.dislikes.push(user.id)
        await s.save()
        res.json({ success: true, likes: s.likes.length, dislikes: s.dislikes.length })
    } catch {
        res.status(500).json({ error: "Database error" })
    }
})

app.get("/api/guild/search", async (req, res) => {
    const token = req.headers.authorization?.split(" ")[1]
    if (!token || !sessions.has(token)) return res.status(401).json({ error: "Unauthorized" })
    const user = sessions.get(token).user
    const hasRole = await checkUserRole(user.id)
    if (!hasRole) return res.status(403).json({ error: "Forbidden" })
    const q = req.query.q
    if (!q) return res.json([])
    try {
        const resp = await fetch(`https://discord.com/api/v10/guilds/${GUILD_ID}/members/search?query=${q}&limit=50`, {
            headers: { Authorization: `Bot ${BOT_TOKEN}` }
        })
        const data = await resp.json()
        res.json(data)
    } catch {
        res.status(500).json({ error: "API Error" })
    }
})

app.post("/api/guild/action", async (req, res) => {
    const token = req.headers.authorization?.split(" ")[1]
    if (!token || !sessions.has(token)) return res.status(401).json({ error: "Unauthorized" })
    const user = sessions.get(token).user
    const hasRole = await checkUserRole(user.id)
    if (!hasRole) return res.status(403).json({ error: "Forbidden" })
    const { targetId, action } = req.body
    let url = `https://discord.com/api/v10/guilds/${GUILD_ID}`
    let method = ""
    if (action === "kick") {
        url += `/members/${targetId}`
        method = "DELETE"
    } else if (action === "ban") {
        url += `/bans/${targetId}`
        method = "PUT"
    } else {
        return res.status(400).json({ error: "Invalid action" })
    }
    try {
        const resp = await fetch(url, { method, headers: { Authorization: `Bot ${BOT_TOKEN}` } })
        if (resp.ok || resp.status === 204) res.json({ success: true })
        else res.status(400).json({ error: "Action failed" })
    } catch {
        res.status(500).json({ error: "Server error" })
    }
})

app.listen(process.env.PORT || 3000)
