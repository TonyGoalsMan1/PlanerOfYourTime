import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DATABASE_URL || path.join(__dirname, "..", "planner.db");
const firstRun = !fs.existsSync(dbPath);
const db = new Database(dbPath);

if (firstRun) {
  db.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS users (
      user_id INTEGER PRIMARY KEY,
      username TEXT,
      is_premium INTEGER DEFAULT 0,
      subscription_until INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      title TEXT,
      done INTEGER DEFAULT 0,
      created_at INTEGER,
      FOREIGN KEY(user_id) REFERENCES users(user_id)
    );
    CREATE TABLE IF NOT EXISTS habits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      title TEXT,
      streak INTEGER DEFAULT 0,
      last_tick_date TEXT,
      created_at INTEGER,
      FOREIGN KEY(user_id) REFERENCES users(user_id)
    );
    CREATE TABLE IF NOT EXISTS goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      title TEXT,
      progress INTEGER DEFAULT 0,
      target INTEGER DEFAULT 100,
      created_at INTEGER,
      FOREIGN KEY(user_id) REFERENCES users(user_id)
    );
  `);
}

export default db;
