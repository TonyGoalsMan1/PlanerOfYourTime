import { Telegraf, Markup } from "telegraf";
import db from "./db.js";

const token = process.env.BOT_TOKEN;
if (!token || !/^\d+:[\w-]{30,}$/.test(token)) {
  console.error("BOT_TOKEN отсутствует или неверный. Проверь .env");
  process.exit(1);
}

const bot = new Telegraf(token);

// лог: какой именно бот запущен
bot.telegram.getMe().then(info => {
  console.log("Bot username:", "@" + info.username);
});

bot.start(async (ctx) => {
  const u = ctx.from;
  db.prepare(`
    INSERT INTO users(user_id, username) VALUES(?,?)
    ON CONFLICT(user_id) DO UPDATE SET username=excluded.username
  `).run(u.id, u.username || "");

  await ctx.reply(
    "Привет! Нажми, чтобы открыть Планер.",
    Markup.keyboard([
      Markup.button.webApp("🚀 Открыть Планер", `${process.env.WEBAPP_URL}`)
    ]).resize()
  );
});

export default bot;
