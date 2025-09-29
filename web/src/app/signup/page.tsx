"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

export default function SignupPage() {
  const r = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    nationalId: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const update =
    (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm({ ...form, [k]: e.target.value });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);

    // simple client-side checks
    if (!form.email || !form.password || !form.nationalId) {
      setMsg("email, password, and national ID are required");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          nationalId: form.nationalId,
          name: form.name || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error || "Sign up failed");
        return;
      }
      // Store user for nav gating
      try {
        localStorage.setItem("awqaf_user", JSON.stringify({
          userId: data.userId,
          email: form.email,
          nationalId: form.nationalId,
          name: form.name || undefined,
        }));
        window.dispatchEvent(new Event("awqaf_user_changed"));
      } catch {}
      // redirect using authorized waqfs if present
      const authorized = Array.isArray(data.authorizedWaqfs) ? data.authorizedWaqfs : [];
      if (authorized.length > 0 && authorized[0]?.waqf_gov_id) {
        r.push(`/dashboard?govId=${encodeURIComponent(String(authorized[0].waqf_gov_id))}`);
        return;
      }
      // fallback to waqf list by nationalId
      r.push(`/waqf?nationalId=${encodeURIComponent(form.nationalId)}`);
    } catch (err: any) {
      setMsg(err?.message || "Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <div className="login-container">
        <h2 className="login-title">Sign Up</h2>
        <p style={{ color: "#555", marginBottom: 12 }}>
        </p>

        <form onSubmit={onSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="name" className="form-label">Full name </label>
            <input
              id="name"
              className="form-input"
              placeholder="Full name"
              value={form.name}
              onChange={update("name")}
            />
          </div>

          <div className="form-group">
            <label htmlFor="email" className="form-label">Email</label>
            <input
              id="email"
              className="form-input"
              placeholder="Email"
              type="email"
              value={form.email}
              onChange={update("email")}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="nationalId" className="form-label">National ID</label>
            <input
              id="nationalId"
              className="form-input"
              placeholder="National ID"
              value={form.nationalId}
              onChange={update("nationalId")}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">Password</label>
            <input
              id="password"
              className="form-input"
              placeholder="Password"
              type="password"
              value={form.password}
              onChange={update("password")}
              required
            />
          </div>

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? "Creating…" : "Create account"}
          </button>
        </form>

        {msg && <p style={{ marginTop: 10, color: "crimson" }}>{msg}</p>}

        <div style={{ marginTop: 16 }}>
          <small>
          </small>
        </div>
      </div>
    </main>
  );
}