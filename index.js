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
app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && (origin.includes("github.io") || origin.includes("localhost"))) {
        res.header("Access-Control-Allow-Origin", origin);
    }
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
    if (req.method === "OPTIONS") return res.sendStatus(200);
    next();
});
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(session({
    name: "atlas_session",
    secret: process.env.SESSION_SECRET || "atlas_secret_key",
    resave: true,
    saveUninitialized: false,
    proxy: true,
    cookie: {
        secure: true,
        httpOnly: true,
        sameSite: "none",
        maxAge: 1000 * 60 * 60 * 24 * 7
    }
}))
const { BOT_TOKEN, CLIENT_ID, CLIENT_SECRET, BASE_URL, SUGGESTION_CHANNEL_ID } = process.env
const REDIRECT_URI = `${BASE_URL}/api/auth/discord/redirect`
let suggestions = []
app.get("/api/user", (req, res) => {
    if (!req.session.user) return res.status(401).json({ logged: false })
    res.json({ logged: true, user: req.session.user })
})
app.get("/auth/login", (req, res) => {
    req.session.returnTo = req.query.returnTo || "https://lilzeng1.github.io/Atlas";
    const discordUrl = `https://discord.com/oauth2/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=identify%20guilds.join`;
    req.session.save(() => res.redirect(discordUrl));
})
app.get("/auth/logout", (req, res) => {
    const returnTo = req.query.returnTo || "https://lilzeng1.github.io/Atlas";
    req.session.destroy(() => {
        res.clearCookie("atlas_session", { sameSite: 'none', secure: true });
        res.redirect(returnTo);
    });
})
app.get("/api/auth/discord/redirect", async (req, res) => {
    const code = req.query.code
    const returnTo = req.session.returnTo || "https://lilzeng1.github.io/Atlas";
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
        req.session.user = { id: userData.id, username: userData.username, avatar: userData.avatar }
        req.session.save(() => res.redirect(returnTo))
    } catch (error) {
        res.redirect(returnTo)
    }
})
app.get("/api/suggestions", (req, res) => res.json(suggestions))
app.post("/api/suggestions", async (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: "Unauthorized" })
    const { text } = req.body
    if (!text || text.length < 5) return res.status(400).json({ error: "Too short" })
    const suggestion = { 
        id: Date.now().toString(), 
        text, 
        user: req.session.user, 
        likes: [], 
        dislikes: [],
        timestamp: new Date()
    }
    suggestions.unshift(suggestion)
    const avatar = req.session.user.avatar 
        ? `https://cdn.discordapp.com/avatars/${req.session.user.id}/${req.session.user.avatar}.png`
        : `https://cdn.discordapp.com/embed/avatars/0.png`;
    try {
        const discordRes = await fetch(`https://discord.com/api/v10/channels/${SUGGESTION_CHANNEL_ID}/messages`, {
            method: "POST",
            headers: { Authorization: `Bot ${BOT_TOKEN}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                embeds: [{
                    title: "✨ Yeni Öneri",
                    description: text,
                    color: 0x000000,
                    author: { name: req.session.user.username, icon_url: avatar },
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
    } catch (e) { }
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
    res.json({ success: true, likes: s.likes.length, dislikes: s.dislikes.length })
})
app.listen(process.env.PORT || 3000)
