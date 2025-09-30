//config for the web app to connect to the api server
const raw = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";
const base = raw.replace(/\/+$/, "");
export const API_BASE = /^https?:\/\//.test(base) ? base : `https://${base}`;
