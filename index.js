import express from "express"
import session from "express-session"
import fetch from "node-fetch"
import dotenv from "dotenv"
dotenv.config()

const app = express()
app.use(express.json())
app.set("trust proxy", 1)

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: true,
        sameSite: "none",
        httpOnly: true
    }
}))

const {
    BOT_TOKEN,
    CLIENT_ID,
    CLIENT_SECRET,
    GUILD_ID,
    BASE_URL
} = process.env

const REDIRECT_URI = `${BASE_URL}/auth/callback`

app.use(express.static("public"))

app.get("/auth/login", (req, res) => {
    const url = `https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=identify%20guilds.join`
    res.redirect(url)
})

app.get("/auth/callback", async (req, res) => {
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
    if (!tokenData.access_token) return res.redirect("/")

    const userRes = await fetch("https://discord.com/api/users/@me", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` }
    })

    const userData = await userRes.json()

    req.session.user = {
        id: userData.id,
        username: userData.username
    }

    await fetch(`https://discord.com/api/v10/guilds/${GUILD_ID}/members/${userData.id}`, {
        method: "PUT",
        headers: {
            Authorization: `Bot ${BOT_TOKEN}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ access_token: tokenData.access_token })
    })

    res.redirect("/")
})

app.get("/api/user", (req, res) => {
    if (!req.session.user) return res.json({ logged: false })
    res.json({ logged: true, user: req.session.user })
})

app.post("/api/assign-role", async (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: "Not logged in" })

    const roleId = req.body.roleId
    const userId = req.session.user.id
    if (!roleId) return res.status(400).json({ error: "Missing roleId" })

    const memberCheck = await fetch(`https://discord.com/api/v10/guilds/${GUILD_ID}/members/${userId}`, {
        headers: { Authorization: `Bot ${BOT_TOKEN}` }
    })

    if (!memberCheck.ok) return res.status(403).json({ error: "User not in guild" })

    const roleRes = await fetch(`https://discord.com/api/v10/guilds/${GUILD_ID}/members/${userId}/roles/${roleId}`, {
        method: "PUT",
        headers: { Authorization: `Bot ${BOT_TOKEN}` }
    })

    if (roleRes.ok) return res.json({ success: true })
    return res.status(roleRes.status).json({ error: "Failed to assign role" })
})

app.listen(process.env.PORT || 3000), () => {
    console.log("Server running")
}
