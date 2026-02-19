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

if (!BOT_TOKEN || !CLIENT_ID || !CLIENT_SECRET || !GUILD_ID || !BASE_URL) {
    console.error("ENV MISSING")
    process.exit(1)
}

const REDIRECT_URI = `${BASE_URL}/api/auth/discord/redirect`

app.use("/Styles", express.static(path.join(__dirname, "Styles")))

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

        if (!tokenData.access_token) {
            console.error(tokenData)
            return res.status(500).send("Token exchange failed")
        }

        const userRes = await fetch("https://discord.com/api/users/@me", {
            headers: { Authorization: `Bearer ${tokenData.access_token}` }
        })

        const userData = await userRes.json()

        req.session.user = {
            id: userData.id,
            username: userData.username,
            avatar: userData.avatar
        }

        const joinRes = await fetch(`https://discord.com/api/v10/guilds/${GUILD_ID}/members/${userData.id}`, {
            method: "PUT",
            headers: {
                Authorization: `Bot ${BOT_TOKEN}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                access_token: tokenData.access_token
            })
        })

        if (!joinRes.ok) {
            const errText = await joinRes.text()
            console.error("Guild join error:", errText)
        }

        res.redirect("/")
    } catch (err) {
        console.error("Callback crash:", err)
        res.status(500).send("Internal Server Error")
    }
})

app.post("/api/assign-role", async (req, res) => {
    try {
        if (!req.session.user) return res.status(401).json({ error: "Not logged in" })

        const roleId = req.body.roleId
        if (!roleId) return res.status(400).json({ error: "Missing roleId" })

        const roleRes = await fetch(`https://discord.com/api/v10/guilds/${GUILD_ID}/members/${req.session.user.id}/roles/${roleId}`, {
            method: "PUT",
            headers: {
                Authorization: `Bot ${BOT_TOKEN}`
            }
        })

        if (!roleRes.ok) {
            const errText = await roleRes.text()
            return res.status(roleRes.status).json({ error: errText })
        }

        res.json({ success: true })
    } catch (err) {
        console.error("Role error:", err)
        res.status(500).json({ error: "Role assign crash" })
    }
})

app.listen(process.env.PORT || 3000, () => {
    console.log("Server running")
})
