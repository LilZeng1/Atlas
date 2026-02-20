import express from "express"
import session from "express-session"
import fetch from "node-fetch"
import dotenv from "dotenv"
import path from "path"
import { fileURLToPath } from "url"

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.set("trust proxy", 1)

app.use(session({
    name: "atlas_session",
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: true,
        httpOnly: true,
        sameSite: "none",
        maxAge: 1000 * 60 * 60 * 24
    }
}))

const BOT_TOKEN = process.env.BOT_TOKEN
const CLIENT_ID = process.env.CLIENT_ID
const CLIENT_SECRET = process.env.CLIENT_SECRET
const GUILD_ID = process.env.GUILD_ID
const BASE_URL = process.env.BASE_URL

const SUGGESTION_CHANNEL_ID = "1474169182852743230"

if (!BOT_TOKEN || !CLIENT_ID || !CLIENT_SECRET || !GUILD_ID || !BASE_URL) {
    console.error("ENV MISSING")
    process.exit(1)
}

const REDIRECT_URI = `${BASE_URL}/api/auth/discord/redirect`

app.use("/Styles", express.static(path.join(__dirname, "Styles")))

let suggestions = []

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"))
})

app.get("/api/user", (req, res) => {
    if (!req.session.user) return res.json({ logged: false })
    res.json({ logged: true, user: req.session.user })
})

app.get("/auth/login", (req, res) => {
    const url = `https://discord.com/oauth2/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=identify%20guilds.join`
    res.redirect(url)
})

app.get("/api/auth/discord/redirect", async (req, res) => {
    try {
        const code = req.query.code
        if (!code) return res.status(400).send("No code")

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
        if (!tokenData.access_token) return res.status(500).send("Token exchange failed")

        const userRes = await fetch("https://discord.com/api/users/@me", {
            headers: { Authorization: `Bearer ${tokenData.access_token}` }
        })

        const userData = await userRes.json()

        req.session.user = {
            id: userData.id,
            username: userData.username,
            avatar: userData.avatar
        }

        await fetch(`https://discord.com/api/v10/guilds/${GUILD_ID}/members/${userData.id}`, {
            method: "PUT",
            headers: {
                Authorization: `Bot ${BOT_TOKEN}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                access_token: tokenData.access_token
            })
        })

        res.redirect("/")
    } catch {
        res.status(500).send("Internal Server Error")
    }
})

app.get("/api/suggestions", (req, res) => {
    res.json(suggestions)
})

app.post("/api/suggestions", async (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: "Login required" })

    const { text } = req.body
    if (!text) return res.status(400).json({ error: "Missing text" })

    const suggestion = {
        id: Date.now().toString(),
        text,
        user: req.session.user,
        likes: [],
        dislikes: []
    }

    suggestions.unshift(suggestion)

    const avatarUrl = `https://cdn.discordapp.com/avatars/${req.session.user.id}/${req.session.user.avatar}.png`

    const messageRes = await fetch(`https://discord.com/api/v10/channels/${SUGGESTION_CHANNEL_ID}/messages`, {
        method: "POST",
        headers: {
            Authorization: `Bot ${BOT_TOKEN}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            embeds: [{
                title: "New Suggestion",
                description: text,
                color: 16777215,
                author: {
                    name: req.session.user.username,
                    icon_url: avatarUrl
                }
            }]
        })
    })

    const messageData = await messageRes.json()

    await fetch(`https://discord.com/api/v10/channels/${SUGGESTION_CHANNEL_ID}/messages/${messageData.id}/reactions/%F0%9F%91%8D/@me`, {
        method: "PUT",
        headers: { Authorization: `Bot ${BOT_TOKEN}` }
    })

    await fetch(`https://discord.com/api/v10/channels/${SUGGESTION_CHANNEL_ID}/messages/${messageData.id}/reactions/%F0%9F%91%8E/@me`, {
        method: "PUT",
        headers: { Authorization: `Bot ${BOT_TOKEN}` }
    })

    res.json({ success: true })
})

app.post("/api/suggestions/react", (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: "Login required" })

    const { id, type } = req.body
    const suggestion = suggestions.find(s => s.id === id)
    if (!suggestion) return res.status(404).json({ error: "Not found" })

    suggestion.likes = suggestion.likes.filter(u => u !== req.session.user.id)
    suggestion.dislikes = suggestion.dislikes.filter(u => u !== req.session.user.id)

    if (type === "like") suggestion.likes.push(req.session.user.id)
    if (type === "dislike") suggestion.dislikes.push(req.session.user.id)

    res.json({ success: true })
})

app.listen(process.env.PORT || 3000)
