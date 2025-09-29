"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { API_BASE } from "@/lib/config";

type StoredUser = {
  userId: number;
  email?: string;
  nationalId?: string;
  name?: string;
};

export default function NavLinks() {
  const r = useRouter();
  const [user, setUser] = useState<StoredUser | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem("awqaf_user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const handleUpdate = () => {
      try {
        const raw = localStorage.getItem("awqaf_user");
        setUser(raw ? JSON.parse(raw) : null);
      } catch {
        setUser(null);
      }
    };
    window.addEventListener("awqaf_user_changed", handleUpdate as EventListener);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener("awqaf_user_changed", handleUpdate as EventListener);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  // If name is missing, fetch profile once to populate full name
  useEffect(() => {
    (async () => {
      if (!user || user.name) return;
      try {
        const res = await fetch(`${API_BASE}/users/${user.userId}`, { cache: "no-store" });
        if (!res.ok) return;
        const row = await res.json();
        const updated: StoredUser = { ...user, name: row?.name || user.name, nationalId: user.nationalId ?? row?.national_id };
        setUser(updated);
        try {
          localStorage.setItem("awqaf_user", JSON.stringify(updated));
          window.dispatchEvent(new Event("awqaf_user_changed"));
        } catch {}
      } catch {}
    })();
  }, [user]);

  async function goDashboard() {
    if (!user) {
      r.push("/");
      return;
    }
    if (user.nationalId) {
      try {
        const res = await fetch(`${API_BASE}/waqf?nationalId=${encodeURIComponent(user.nationalId)}`);
        const waqfs = await res.json();
        if (Array.isArray(waqfs) && waqfs.length > 0 && waqfs[0]?.waqf_gov_id) {
          r.push(`/dashboard?govId=${encodeURIComponent(String(waqfs[0].waqf_gov_id))}`);
          return;
        }
        r.push(`/waqf?nationalId=${encodeURIComponent(user.nationalId)}`);
        return;
      } catch {
        r.push("/dashboard");
        return;
      }
    }
    r.push("/dashboard");
  }

  async function goHome() {
    if (!user) {
      r.replace("/");
      return;
    }
    if (user.nationalId) {
      try {
        const res = await fetch(`${API_BASE}/waqf?nationalId=${encodeURIComponent(user.nationalId)}`);
        const waqfs = await res.json();
        if (Array.isArray(waqfs) && waqfs.length > 0 && waqfs[0]?.waqf_gov_id) {
          r.replace(`/?govId=${encodeURIComponent(String(waqfs[0].waqf_gov_id))}`);
          return;
        }
      } catch {}
    }
    r.replace("/");
  }

  function logout() {
    try {
      localStorage.removeItem("awqaf_user");
      window.dispatchEvent(new Event("awqaf_user_changed"));
    } catch {}
    setUser(null);
    r.replace("/");
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, width: "100%", position: "relative" }}>
      <div className="nav__menu" id="nav-menu" style={{ margin: "0 auto" }}>
        <ul className="nav__list" style={{ display: "inline-flex", alignItems: "center", gap: 16 }}>
          <li className="nav__item">
            <button className="nav__link" onClick={goHome} style={{ background: "none", border: 0, padding: 0, cursor: "pointer" }}>Home</button>
          </li>
          <li className="nav__item">
            {/* Dashboard gated button */}
            <button className="nav__link" onClick={goDashboard} style={{ background: "none", border: 0, padding: 0, cursor: "pointer" }}>Dashboard</button>
          </li>
          <li className="nav__item">
            <Link href="/profile" className="nav__link">Profile</Link>
          </li>
        </ul>
      </div>

      <div className="nav__actions" style={{ display: "flex", alignItems: "center", gap: 12, position: "absolute", right: 0 }}>
        {user ? (
          <>
            <span style={{ color: "#333", fontSize: 14 }}>
              {user.name && user.name.trim().length > 0 ? user.name : (user.email || "User")} {user.nationalId ? `· ${user.nationalId}` : ""}
            </span>
            <button onClick={logout} className="nav__link" style={{ background: "none", border: 0, cursor: "pointer" }}>Logout</button>
          </>
        ) : (
          <Link href="/signup" className="nav__link">Sign Up</Link>
        )}
        <i className="nav__toggle" id="nav-toggle">☰</i>
      </div>
    </div>
  );
}


