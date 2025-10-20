import { Telegraf, Markup } from "telegraf";
import db from "./db.js";

// Проверяем токен
const token = process.env.BOT_TOKEN;
if (!token || !/^\d+:[\w-]{30,}$/.test(token)) {
  console.error("❌ BOT_TOKEN отсутствует или неверный. Проверь .env или Environment в Render");
  process.exit(1);
}

// Создаём экземпляр бота
const bot = new Telegraf(token);

// Проверяем, какой бот запущен
bot.telegram.getMe().then(info => {
  console.log(`✅ Бот запущен: @${info.username}`);
}).catch(err => {
  console.error("Ошибка при получении информации о боте:", err);
});

// Обработка команды /start
bot.start(async (ctx) => {
  try {
    const user = ctx.from;

    // сохраняем или обновляем пользователя в БД
    db.prepare(`
      INSERT INTO users(user_id, username)
      VALUES(?, ?)
      ON CONFLICT(user_id) DO UPDATE SET username = excluded.username
    `).run(user.id, user.username || "");

    // отправляем приветствие с inline WebApp-кнопкой
    await ctx.reply(
      "Привет 👋\nНажми, чтобы открыть Планер.",
      Markup.inlineKeyboard([
        Markup.button.webApp("🚀 Открыть Планер", process.env.WEBAPP_URL)
      ])
    );

  } catch (err) {
    console.error("Ошибка при выполнении /start:", err);
    await ctx.reply("⚠️ Произошла ошибка. Попробуй позже.");
  }
});

export default bot;
