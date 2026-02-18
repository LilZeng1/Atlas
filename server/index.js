// Imports
import express from "express"
import bodyParser from "body-parser"
import fetch from "node-fetch"
import { Client, Intents } from "discord.js"
import dotenv from "dotenv"
dotenv.config()

// App()
const app = express()
app.use(bodyParser.json())

// .Env
const BOT_TOKEN = process.env.BOT_TOKEN
const GUILD_ID = process.env.GUILD_ID

const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MEMBERS] })


app.post("/api/assign-role", async (req, res) => {
    const roleId = req.body.roleId
    const userId = req.body.userId
    if (!roleId || !userId) return res.status(400).send({ error: "Missing parameters" })
    const url = `https://discord.com/api/v10/guilds/${GUILD_ID}/members/${userId}/roles/${roleId}`
    const result = await fetch(url, { method: "PUT", headers: { Authorization: `Bot ${BOT_TOKEN}` } })
    if (result.ok) res.send({ success: true })
    else res.status(result.status).send({ error: "Failed" })
})

app.listen(process.env.PORT || 3000)
client.login(BOT_TOKEN)
