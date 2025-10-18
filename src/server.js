import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import db from "./db.js";
import { verifyInitData } from "./verifyInitData.js";
import { createStarsInvoiceLink } from "./payments.js";
import bot from "./bot.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended:true }));

app.use(express.static(path.join(__dirname, "..", "public")));

app.use((req,res,next) => {
  const initData = req.headers["x-telegram-init-data"] || req.query.initData || req.body.initData;
  const user = verifyInitData(initData, process.env.BOT_TOKEN);
  req.tgUser = user;
  next();
});

app.get("/api/me", (req,res) => {
  if (!req.tgUser) return res.status(401).json({ error:"Unauthorized" });
  const row = db.prepare("SELECT is_premium, subscription_until FROM users WHERE user_id=?").get(req.tgUser.id);
  res.json({ ok:true, user: {
    id: req.tgUser.id,
    username: req.tgUser.username || "",
    is_premium: row?.is_premium === 1 && (row.subscription_until ?? 0) > Date.now()
  }});
});

// tasks
app.get("/api/tasks", (req,res)=>{
  if (!req.tgUser) return res.status(401).json({ error:"Unauthorized" });
  const rows = db.prepare("SELECT * FROM tasks WHERE user_id=? ORDER BY id DESC").all(req.tgUser.id);
  res.json({ ok:true, items: rows });
});
app.post("/api/tasks", (req,res)=>{
  if (!req.tgUser) return res.status(401).json({ error:"Unauthorized" });
  const { title } = req.body;
  const info = db.prepare("INSERT INTO tasks(user_id, title, done, created_at) VALUES(?,?,0,?)")
    .run(req.tgUser.id, title, Date.now());
  res.json({ ok:true, id: info.lastInsertRowid });
});
app.post("/api/tasks/:id/toggle", (req,res)=>{
  if (!req.tgUser) return res.status(401).json({ error:"Unauthorized" });
  const { id } = req.params;
  const row = db.prepare("SELECT done FROM tasks WHERE id=? AND user_id=?").get(id, req.tgUser.id);
  if (!row) return res.status(404).json({ error:"Not found" });
  db.prepare("UPDATE tasks SET done=? WHERE id=?").run(row.done ? 0 : 1, id);
  res.json({ ok:true });
});

// habits
app.get("/api/habits", (req,res)=>{
  if (!req.tgUser) return res.status(401).json({ error:"Unauthorized" });
  const rows = db.prepare("SELECT * FROM habits WHERE user_id=? ORDER BY id DESC").all(req.tgUser.id);
  res.json({ ok:true, items: rows });
});
app.post("/api/habits", (req,res)=>{
  if (!req.tgUser) return res.status(401).json({ error:"Unauthorized" });
  const { title } = req.body;
  const info = db.prepare('INSERT INTO habits(user_id, title, streak, last_tick_date, created_at) VALUES(?, ?, 0, "", ?)')
    .run(req.tgUser.id, title, Date.now());
  res.json({ ok:true, id: info.lastInsertRowid });
});
app.post("/api/habits/:id/tick", (req,res)=>{
  if (!req.tgUser) return res.status(401).json({ error:"Unauthorized" });
  const { id } = req.params;
  const today = new Date().toISOString().slice(0,10);
  const h = db.prepare("SELECT * FROM habits WHERE id=? AND user_id=?").get(id, req.tgUser.id);
  if (!h) return res.status(404).json({ error:"Not found" });
  if (h.last_tick_date !== today) {
    db.prepare("UPDATE habits SET streak=streak+1, last_tick_date=? WHERE id=?").run(today, id);
  }
  res.json({ ok:true });
});

// goals
app.get("/api/goals", (req,res)=>{
  if (!req.tgUser) return res.status(401).json({ error:"Unauthorized" });
  const rows = db.prepare("SELECT * FROM goals WHERE user_id=? ORDER BY id DESC").all(req.tgUser.id);
  res.json({ ok:true, items: rows });
});
app.post("/api/goals", (req,res)=>{
  if (!req.tgUser) return res.status(401).json({ error:"Unauthorized" });
  const { title, target = 100 } = req.body;
  const info = db.prepare("INSERT INTO goals(user_id, title, progress, target, created_at) VALUES(?, ?, 0, ?, ?)")
    .run(req.tgUser.id, title, target, Date.now());
  res.json({ ok:true, id: info.lastInsertRowid });
});
app.post("/api/goals/:id/update", (req,res)=>{
  if (!req.tgUser) return res.status(401).json({ error:"Unauthorized" });
  const { id } = req.params;
  const { progress } = req.body;
  db.prepare("UPDATE goals SET progress=? WHERE id=? AND user_id=?").run(progress, id, req.tgUser.id);
  res.json({ ok:true });
});

// Stars invoice
app.post("/api/subscription/invoice", async (req,res)=>{
  if (!req.tgUser) return res.status(401).json({ error:"Unauthorized" });
  try {
    const link = await createStarsInvoiceLink({
      botToken: process.env.BOT_TOKEN,
      title: "PRO-подписка на 30 дней",
      description: "Премиум функции планера",
      payload: `sub:${req.tgUser.id}:30d:${Date.now()}`,
      amountStars: 499
    });
    res.json({ ok:true, link });
  } catch (e) {
    res.status(500).json({ ok:false, error: e.message });
  }
});

const port = process.env.PORT || 8080;
app.listen(port, async () => {
  console.log("Server on", port);
  bot.launch();
  console.log("Bot started");
});

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
