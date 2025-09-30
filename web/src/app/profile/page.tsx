"use client";

import { useEffect, useState } from "react";
import { API_BASE } from "@/lib/config";

type User = { id: number; email: string; name: string | null; national_id: string };

export default function ProfilePage() {
  const [userId, setUserId] = useState<number | null>(null);
  const [data, setData] = useState<User | null>(null);
  const [form, setForm] = useState({ email: "", name: "", password: "" });
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("awqaf_user");
      if (!raw) return;
      const u = JSON.parse(raw) as { userId?: number } | null;
      if (u?.userId) setUserId(u.userId);
    } catch {}
  }, []);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/users/${userId}`, { cache: "no-store" });
        const row = await res.json();
        if (!res.ok) throw new Error(row?.error || "Failed to load user");
        setData(row);
        setForm({ email: row.email || "", name: row.name || "", password: "" });
      } catch (e: any) {
        setMsg(e?.message || "Failed to load user");
      }
    })();
  }, [userId]);

  function update(k: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (!userId) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email || undefined,
          name: form.name || undefined,
          password: form.password || undefined,
        })
      });
      const out = await res.json();
      if (!res.ok) throw new Error(out?.error || "Failed to update user");
      setMsg("Saved");
      // reflect new name/email in nav storage
      try {
        const raw = localStorage.getItem("awqaf_user");
        const u = raw ? JSON.parse(raw) : {};
        localStorage.setItem("awqaf_user", JSON.stringify({ ...u, email: out?.user?.email, name: out?.user?.name }));
        window.dispatchEvent(new Event("awqaf_user_changed"));
      } catch {}
    } catch (e: any) {
      setMsg(e?.message || "Failed to update user");
    } finally {
      setLoading(false);
    }
  }

  if (!userId) return <main><p>Please log in to view your profile.</p></main>;
  if (!data) return <main><p>Loading…</p></main>;

  return (
    <main>
      <h2>Profile</h2>
      {msg && <p style={{ color: msg === "Saved" ? "#2e7d32" : "crimson" }}>{msg}</p>}
      <form onSubmit={onSave} className="login-form" style={{ maxWidth: 420 }}>
        <div className="form-group">
          <label className="form-label">Full Name</label>
          <input className="form-input" value={form.name} onChange={update("name")} placeholder="Full name" />
        </div>
        <div className="form-group">
          <label className="form-label">Email</label>
          <input className="form-input" value={form.email} onChange={update("email")} placeholder="Email" type="email" />
        </div>
        <div className="form-group">
          <label className="form-label">National ID</label>
          <input className="form-input" value={data.national_id} disabled />
        </div>
        <div className="form-group">
          <label className="form-label">New Password</label>
          <input className="form-input" value={form.password} onChange={update("password")} placeholder="New password" type="password" />
        </div>
        <button type="submit" className="login-button" disabled={loading}>{loading ? "Saving…" : "Save Changes"}</button>
      </form>
    </main>
  );
}


