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

mongoose.connect("mongodb+srv://lilzeng1admin:George11Nasa@atlas.sujnqrt.mongodb.net/?appName=Atlas", {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log("MongoDB Connected")).catch(err => console.log(err))

const suggestionSchema = new mongoose.Schema({
    id: String,
    text: String,
    user: Object,
    likes: [String],
    dislikes: [String],
    timestamp: Date
})

const Suggestion = mongoose.model("Suggestion", suggestionSchema)

app.set("trust proxy", 1)
app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
        res.header("Access-Control-Allow-Origin", origin);
    } else {
        res.header("Access-Control-Allow-Origin", "*");
    }
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
    if (req.method === "OPTIONS") return res.sendStatus(200);
    next();
});
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
const { BOT_TOKEN, CLIENT_ID, CLIENT_SECRET, BASE_URL, SUGGESTION_CHANNEL_ID } = process.env
const REDIRECT_URI = `${BASE_URL}/api/auth/discord/redirect`
const sessions = new Map()
const authStates = new Map()

app.get("/api/user", (req, res) => {
    const token = req.headers.authorization?.split(" ")[1]
    if (!token || !sessions.has(token)) return res.status(401).json({ logged: false })
    res.json({ logged: true, user: sessions.get(token).user })
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
    } catch (error) {
        res.redirect(returnTo)
    }
});

app.get("/api/suggestions", async (req, res) => {
    try {
        const suggestions = await Suggestion.find().sort({ timestamp: -1 })
        res.json(suggestions)
    } catch (e) {
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
        id: Date.now().toString(),
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
                    title: "✨ Yeni Öneri",
                    description: text,
                    color: 0x000000,
                    author: { name: user.username, icon_url: avatar },
                    footer: { text: "ATLAS Discourse System" },
                    timestamp: new Date()
                }]
            })
        })
        const m = await discordRes.json()
        if (m.id) {
            await fetch(`https://discord.com/api/v10/channels/${SUGGESTION_CHANNEL_ID}/messages/${m.id}/reactions/%F0%9F%91%8D/@me`, { method: "PUT", headers: { Authorization: `Bot ${BOT_TOKEN}` } })
            await fetch(`https://discord.com/api/v10/channels/${SUGGESTION_CHANNEL_ID}/messages/${m.id}/reactions/%F0%9F%91%8E/@me`, { method: "PUT", headers: { Authorization: `Bot ${BOT_TOKEN}` } })
        }
        res.json({ success: true })
    } catch (e) {
        res.status(500).json({ error: "Failed to save suggestion" })
    }
});

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
    } catch (e) {
        res.status(500).json({ error: "Database error" })
    }
});

app.listen(process.env.PORT || 3000)
