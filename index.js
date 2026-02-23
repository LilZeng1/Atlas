// Imports
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
mongoose.connect(process.env.MONGO_URI || "mongodb+srv://lilzeng1admin:George11Nasa@atlas.sujnqrt.mongodb.net/Atlas?retryWrites=true&w=majority&appName=Atlas", {
    dbName: "Atlas",
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000
}).then(() => { }).catch(() => { })
const suggestionSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    text: String,
    user: Object,
    likes: [String],
    dislikes: [String],
    timestamp: Date,
    approved: { type: Boolean, default: false },
    rejected: { type: Boolean, default: false }
}, { collection: "suggestions" })

// Suggestion Model()
const Suggestion = mongoose.model("Suggestion", suggestionSchema)
app.set("trust proxy", 1)
app.use((req, res, next) => {
    const origin = req.headers.origin
    res.header("Access-Control-Allow-Origin", origin || "*")
    res.header("Access-Control-Allow-Credentials", "true")
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization")
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE")
    if (req.method === "OPTIONS") return res.sendStatus(200)
    next()
})

// App() setup
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
const { BOT_TOKEN, CLIENT_ID, CLIENT_SECRET, BASE_URL, GUILD_ID, WEBHOOK_URL } = process.env
const REDIRECT_URI = `${BASE_URL}/api/auth/discord/redirect`
const sessions = new Map()
const authStates = new Map()
const ALLOWED_USERNAMES = ["lilzeng1", "2uom", "godhimself__sdsd", "09.i", "shira.5", "yra6", "eng.joseph666"]
async function getMemberData(userId) {
    try {
        const res = await fetch(`https://discord.com/api/v10/guilds/${GUILD_ID}/members/${userId}`, {
            headers: { Authorization: `Bot ${BOT_TOKEN}` }
        })
        if (!res.ok) return null
        return await res.json()
    } catch {
        return null
    }
}

app.get("/api/user", async (req, res) => {
    const token = req.headers.authorization?.split(" ")[1]
    if (!token || !sessions.has(token)) return res.status(401).json({ logged: false })
    const session = sessions.get(token)
    const isStaff = ALLOWED_USERNAMES.includes(session.user.username)
    const member = await getMemberData(session.user.id)
    res.json({
        logged: true,
        user: session.user,
        isStaff,
        roles: member ? member.roles : []
    })
})

app.get("/auth/login", (req, res) => {
    const returnTo = req.query.returnTo || "https://lilzeng1.github.io/Atlas/"
    const state = crypto.randomBytes(16).toString("hex")
    authStates.set(state, returnTo)
    const discordUrl = `https://discord.com/oauth2/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=identify%20guilds.join&state=${state}`
    res.redirect(discordUrl)
});

app.get("/api/auth/discord/redirect", async (req, res) => {
    const { code, state } = req.query
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
                code,
                redirect_uri: REDIRECT_URI
            })
        })
        const tokenData = await tokenRes.json()
        const userRes = await fetch("https://discord.com/api/users/@me", {
            headers: { Authorization: `Bearer ${tokenData.access_token}` }
        })
        const userData = await userRes.json()
        const sessionToken = crypto.randomBytes(32).toString("hex")
        sessions.set(sessionToken, {
            user: { id: userData.id, username: userData.username, avatar: userData.avatar },
            createdAt: Date.now()
        })
        const sep = returnTo.includes("?") ? "&" : "?"
        res.redirect(`${returnTo}${sep}token=${sessionToken}`)
    } catch {
        res.redirect(returnTo)
    }
});

app.get("/api/guild/search", async (req, res) => {
    const token = req.headers.authorization?.split(" ")[1]
    if (!token || !sessions.has(token)) return res.status(401).json({ error: "Unauthorized" })
    const session = sessions.get(token)
    if (!ALLOWED_USERNAMES.includes(session.user.username)) return res.status(403).json({ error: "Forbidden" })
    const q = req.query.q
    if (!q) return res.json([])
    try {
        const resp = await fetch(`https://discord.com/api/v10/guilds/${GUILD_ID}/members/search?query=${q}&limit=20`, {
            headers: { Authorization: `Bot ${BOT_TOKEN}` }
        })
        const data = await resp.json()
        res.json(Array.isArray(data) ? data : [])
    } catch {
        res.status(500).json({ error: "API Error" })
    }
});

app.post("/api/guild/action", async (req, res) => {
    const token = req.headers.authorization?.split(" ")[1]
    if (!token || !sessions.has(token)) return res.status(401).json({ error: "Unauthorized" })
    const session = sessions.get(token)
    if (!ALLOWED_USERNAMES.includes(session.user.username)) return res.status(403).json({ error: "Forbidden" })
    const { targetId, action } = req.body
    let url = `https://discord.com/api/v10/guilds/${GUILD_ID}`
    let method = action === "kick" ? "DELETE" : (action === "ban" ? "PUT" : "")
    if (!method) return res.status(400).json({ error: "Invalid action" })
    url += action === "kick" ? `/members/${targetId}` : `/bans/${targetId}`
    try {
        const resp = await fetch(url, { method, headers: { Authorization: `Bot ${BOT_TOKEN}` } })
        if (resp.ok || resp.status === 204) res.json({ success: true })
        else res.status(400).json({ error: "Hierarchy or Permission Error" })
    } catch {
        res.status(500).json({ error: "Server error" })
    }
});

app.get("/api/suggestions", async (req, res) => {
    try {
        const suggestions = await Suggestion.find().sort({ timestamp: -1 })
        res.json(suggestions)
    } catch {
        res.status(500).json({ error: "Database error" })
    }
});

app.post("/api/suggestions", async (req, res) => {
    const token = req.headers.authorization?.split(" ")[1]
    if (!token || !sessions.has(token)) return res.status(401).json({ error: "Unauthorized" })
    const session = sessions.get(token)
    const { text } = req.body
    if (!text || text.trim().length < 5) return res.status(400).json({ error: "Invalid text" })
    try {
        const newSuggestion = new Suggestion({
            id: crypto.randomBytes(16).toString("hex"),
            text: text.trim(),
            user: session.user,
            likes: [],
            dislikes: [],
            timestamp: new Date(),
            approved: false,
            rejected: false
        })
        await newSuggestion.save()
        if (WEBHOOK_URL) {
            const avatarUrl = session.user.avatar ? `https://cdn.discordapp.com/avatars/${session.user.id}/${session.user.avatar}.png` : `https://cdn.discordapp.com/embed/avatars/0.png`
            await fetch(WEBHOOK_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    embeds: [{
                        author: { name: session.user.username, icon_url: avatarUrl },
                        description: text.trim(),
                        color: 0xffffff,
                        thumbnail: { url: avatarUrl },
                        footer: { text: `0 Likes | 0 Dislikes` },
                        timestamp: new Date().toISOString()
                    }]
                })
            }).catch(() => { })
        }
        res.json({ success: true })
    } catch {
        res.status(500).json({ error: "Server error" })
    }
});

app.post("/api/suggestions/react", async (req, res) => {
    const token = req.headers.authorization?.split(" ")[1]
    if (!token || !sessions.has(token)) return res.status(401).json({ error: "Unauthorized" })
    const session = sessions.get(token)
    const { id, type } = req.body
    try {
        const suggestion = await Suggestion.findOne({ id })
        if (!suggestion) return res.status(404).json({ error: "Not found" })
        if (suggestion.approved || suggestion.rejected) return res.status(400).json({ error: "Cannot react to a moderated suggestion" })
        const userId = session.user.id
        suggestion.likes = suggestion.likes.filter(uid => uid !== userId)
        suggestion.dislikes = suggestion.dislikes.filter(uid => uid !== userId)
        if (type === "like") suggestion.likes.push(userId)
        if (type === "dislike") suggestion.dislikes.push(userId)
        await suggestion.save()
        res.json({ success: true })
    } catch {
        res.status(500).json({ error: "Server error" })
    }
});

app.post("/api/suggestions/moderate", async (req, res) => {
    const token = req.headers.authorization?.split(" ")[1]
    if (!token || !sessions.has(token)) return res.status(401).json({ error: "Unauthorized" })
    const session = sessions.get(token)
    if (!ALLOWED_USERNAMES.includes(session.user.username)) return res.status(403).json({ error: "Forbidden" })

    const { id, action } = req.body
    if (!["approve", "reject"].includes(action)) return res.status(400).json({ error: "Invalid action" })

    try {
        const suggestion = await Suggestion.findOne({ id })
        if (!suggestion) return res.status(404).json({ error: "Not found" })
        suggestion.approved = action === "approve"
        suggestion.rejected = action === "reject"
        await suggestion.save()
        if (WEBHOOK_URL) {
            const avatarUrl = session.user.avatar ? `https://cdn.discordapp.com/avatars/${session.user.id}/${session.user.avatar}.png` : `https://cdn.discordapp.com/embed/avatars/0.png`
            await fetch(WEBHOOK_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    embeds: [{
                        title: `Suggestion ${action === "approve" ? "Approved" : "Rejected"}`,
                        description: `Suggestion ID: ${id}\nContent: ${suggestion.text}`,
                        color: action === "approve" ? 0x00ff00 : 0xff0000,
                        thumbnail: { url: avatarUrl },
                        footer: { text: `${session.user.username} moderated this suggestion` },
                        timestamp: new Date().toISOString()
                    }]
                })
            }).catch(() => { })
        }
        res.json({ success: true })
    } catch (err) {
        res.status(500).json({ error: "Server error" })
    }
});

app.get("/api/suggestions/styled", async (req, res) => {
    try {
        const suggestions = await Suggestion.find().sort({ timestamp: -1 })
        const styledSuggestions = suggestions.map(s => ({
            id: s.id,
            text: s.text,
            user: s.user,
            likes: s.likes,
            dislikes: s.dislikes,
            timestamp: s.timestamp,
            approved: s.approved || false,
            rejected: s.rejected || false,
            style: s.approved ? "approved" : (s.rejected ? "rejected" : "pending")
        }))
        res.json(styledSuggestions)
    } catch (err) {
        res.status(500).json({ error: "Database error" })
    }
});

app.listen(process.env.PORT || 3000)
