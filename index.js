import { Telegraf } from "telegraf";
import fetch from "node-fetch";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

const bot = new Telegraf(process.env.TELEGRAM_TOKEN);
const HISTORY_FILE = "history.json";

// Charger historique local
let history = {};
if (fs.existsSync(HISTORY_FILE)) {
  history = JSON.parse(fs.readFileSync(HISTORY_FILE, "utf8"));
}

function saveHistory() {
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
}

async function askGroq(userId, message) {
  if (!history[userId]) history[userId] = [];
  history[userId].push({ role: "user", content: message });
  history[userId] = history[userId].slice(-10);

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      messages: history[userId]
    })
  });

  const data = await response.json();
  let reply = data?.choices?.[0]?.message?.content || "❌ Erreur Groq API";

  history[userId].push({ role: "assistant", content: reply });
  saveHistory();

  return reply;
}

// Commande /reset
bot.command("reset", (ctx) => {
  const userId = ctx.from.id.toString();
  history[userId] = [];
  saveHistory();
  ctx.reply("🗑️ Ton historique a été réinitialisé !");
});

bot.on("text", async (ctx) => {
  const userId = ctx.from.id.toString();
  ctx.reply("💭 Réflexion en cours...");
  try {
    const answer = await askGroq(userId, ctx.message.text);
    ctx.reply(answer);
  } catch (e) {
    console.error(e);
    ctx.reply("⚠️ Erreur IA.");
  }
});

bot.launch();
console.log("🤖 Bot Telegram AI lancé !");
