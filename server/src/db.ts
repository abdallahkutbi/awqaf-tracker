import Database from "better-sqlite3";
import dotenv from "dotenv";
dotenv.config(); 

export const DB_PATH = process.env.SQLITE_PATH || "db.sqlite";
const db = new Database(DB_PATH);
db.pragma("foreign_keys = ON");

// Ensure users table exists in THIS file
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    national_id TEXT NOT NULL UNIQUE,
    name TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// Profits table (if missing)
db.exec(`
  CREATE TABLE IF NOT EXISTS profits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    waqf_gov_id INTEGER NOT NULL,
    profit_amount INTEGER NOT NULL,
    currency TEXT DEFAULT 'USD',
    profit_period_start TEXT NOT NULL,
    profit_period_end TEXT,
    status TEXT DEFAULT 'allocated',
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// Add percent_share to beneficiaries if not present
try {
  const cols = db.prepare(`PRAGMA table_info(beneficiaries)`).all() as Array<{ name: string }>;
  const hasPercent = Array.isArray(cols) && cols.some(c => c.name === "percent_share");
  if (!hasPercent) {
    db.exec(`ALTER TABLE beneficiaries ADD COLUMN percent_share REAL`);
  }
} catch {}

export default db;
