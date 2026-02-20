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
app.set("trust proxy", 1)
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

const isProduction = process.env.BASE_URL.startsWith("https://")

app.use(session({
    name: "atlas_session",
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    proxy: true,
    cookie: {
        secure: isProduction,
        httpOnly: true,
        sameSite: isProduction ? "none" : "lax",
        maxAge: 1000 * 60 * 60 * 24 * 7
    }
}))

const { BOT_TOKEN, CLIENT_ID, CLIENT_SECRET, GUILD_ID, BASE_URL, SUGGESTION_CHANNEL_ID } = process.env
const REDIRECT_URI = `${BASE_URL}/api/auth/discord/redirect`

app.use("/Styles", express.static(path.join(__dirname, "Styles")))
app.use("/Scripts", express.static(path.join(__dirname, "Scripts")))
app.use("/Assets", express.static(path.join(__dirname, "Assets")))
app.use(express.static(__dirname))

let suggestions = []

app.get("/", (req, res) => res.sendFile(path.join(__dirname, "index.html")))

app.get("/api/user", (req, res) => {
    if (!req.session.user) return res.json({ logged: false })
    res.json({ logged: true, user: req.session.user })
})

app.get("/auth/login", (req, res) => {
    res.redirect(`https://discord.com/oauth2/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=identify%20guilds.join`)
})

app.get("/auth/logout", (req, res) => {
    req.session.destroy()
    res.redirect("/")
})

app.get("/api/auth/discord/redirect", async (req, res) => {
    const code = req.query.code
    if (!code) return res.redirect("/")

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
    const userRes = await fetch("https://discord.com/api/users/@me", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` }
    })

    const userData = await userRes.json()
    req.session.user = { id: userData.id, username: userData.username, avatar: userData.avatar }
    res.redirect("/")
})

app.get("/api/suggestions", (req, res) => res.json(suggestions))

app.post("/api/suggestions", async (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: "Unauthorized" })
    const { text } = req.body
    const suggestion = { id: Date.now().toString(), text, user: req.session.user, likes: [], dislikes: [] }
    suggestions.unshift(suggestion)

    const avatar = `https://cdn.discordapp.com/avatars/${req.session.user.id}/${req.session.user.avatar}.png`

    await fetch(`https://discord.com/api/v10/channels/${SUGGESTION_CHANNEL_ID}/messages`, {
        method: "POST",
        headers: { Authorization: `Bot ${BOT_TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify({
            embeds: [{
                title: "New Suggestion",
                description: text,
                color: 0xffffff,
                author: { name: req.session.user.username, icon_url: avatar }
            }]
        })
    }).then(r => r.json()).then(m => {
        fetch(`https://discord.com/api/v10/channels/${SUGGESTION_CHANNEL_ID}/messages/${m.id}/reactions/%F0%9F%91%8D/@me`, { method: "PUT", headers: { Authorization: `Bot ${BOT_TOKEN}` } })
        fetch(`https://discord.com/api/v10/channels/${SUGGESTION_CHANNEL_ID}/messages/${m.id}/reactions/%F0%9F%91%8E/@me`, { method: "PUT", headers: { Authorization: `Bot ${BOT_TOKEN}` } })
    })

    res.json({ success: true })
})

app.post("/api/suggestions/react", (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: "Unauthorized" })
    const { id, type } = req.body
    const s = suggestions.find(x => x.id === id)
    if (!s) return res.status(404).json({ error: "Not found" })

    s.likes = s.likes.filter(u => u !== req.session.user.id)
    s.dislikes = s.dislikes.filter(u => u !== req.session.user.id)

    if (type === "like") s.likes.push(req.session.user.id)
    else s.dislikes.push(req.session.user.id)

    res.json({ success: true })
})

app.listen(process.env.PORT || 3000)
