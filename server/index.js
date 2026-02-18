import express from "express"
import dotenv from "dotenv"
import { Client, GatewayIntentBits } from "discord.js"

dotenv.config()

const app = express()
app.use(express.json())
app.use(express.static("public"))

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] })

client.login(process.env.BOT_TOKEN)

app.post("/api/assign-role", async (req, res) => {
    const { roleId } = req.body
    const guild = await client.guilds.fetch(process.env.GUILD_ID)
    const member = await guild.members.fetch(process.env.TEST_USER_ID)
    await member.roles.add(roleId)
    res.json({ success: true })
})

app.listen(3000)
