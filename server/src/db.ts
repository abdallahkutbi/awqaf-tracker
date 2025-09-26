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

export default db;
