"use client";

//The home page for the awqaf tracker
//changes to this file will affect the home page

//imports
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { API_BASE } from "@/lib/config";

export default function Page() {
  const [currentFaqIndex, setCurrentFaqIndex] = useState(0);
  const r = useRouter();
  const sp = useSearchParams();
  const desiredGovId = sp?.get("govId") || null;
  const [credential, setCredential] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [userNationalId, setUserNationalId] = useState<string | null>(null);
  const [waqf, setWaqf] = useState<null | { waqf_gov_id: number; waqf_name: string; waqf_type: string; asset_kind: string; asset_label: string | null }>(null);
  const [summary, setSummary] = useState<null | { totals: { totalPayouts: number; lastYearProfit: number; corpus: number }; month: { inflow: number; outflow: number } }>(null);
  const [graphMode, setGraphMode] = useState<"yearly" | "top" | "totals">("yearly");
  const [prevYearProfit, setPrevYearProfit] = useState<number | null>(null);
  const [yearly, setYearly] = useState<Array<{ year: number; total: number }>>([]);
  const [topBeneficiaries, setTopBeneficiaries] = useState<Array<{ name: string; amount: number }>>([]);

  async function loadWaqfForNationalId(nationalId: string, preferGovId: string | null) {
    try {
      const res = await fetch(`${API_BASE}/waqf?nationalId=${encodeURIComponent(nationalId)}`, { cache: "no-store" });
      const waqfs = await res.json();
      if (Array.isArray(waqfs) && waqfs.length > 0 && waqfs[0]?.waqf_gov_id) {
        const selected = preferGovId ? (waqfs.find((w: any) => String(w.waqf_gov_id) === String(preferGovId)) || waqfs[0]) : waqfs[0];
        setWaqf({
          waqf_gov_id: selected.waqf_gov_id,
          waqf_name: selected.waqf_name,
          waqf_type: selected.waqf_type,
          asset_kind: selected.asset_kind,
          asset_label: selected.asset_label ?? null,
        });
        const sRes = await fetch(`${API_BASE}/waqf/${encodeURIComponent(String(selected.waqf_gov_id))}/summary`, { cache: "no-store" });
        if (sRes.ok) {
          const s = await sRes.json();
          setSummary({
            totals: {
              totalPayouts: Number(s?.totals?.totalPayouts || 0),
              lastYearProfit: Number(s?.totals?.lastYearProfit || 0),
              corpus: Number(s?.totals?.corpus || 0)
            },
            month: {
              inflow: Number(s?.month?.inflow || 0),
              outflow: Number(s?.month?.outflow || 0)
            }
          });
          // Top 5 beneficiaries by percent_share using current year profit
          try {
            const bRes = await fetch(`${API_BASE}/waqf/${encodeURIComponent(String(selected.waqf_gov_id))}/beneficiaries`, { cache: "no-store" });
            if (bRes.ok) {
              const blist = await bRes.json();
              const profit = Number(s?.totals?.lastYearProfit || 0);
              const computed = blist
                .map((b: any) => ({ name: b.full_name as string, amount: profit * (Number(b.percent_share || 0) / 100) }))
                .filter((x: any) => x.amount > 0)
                .sort((a: any, b: any) => b.amount - a.amount)
                .slice(0, 5);
              setTopBeneficiaries(computed);
            }
          } catch {}
        }
        // yearly series + prev year
        try {
          const yRes = await fetch(`${API_BASE}/waqf/${encodeURIComponent(String(selected.waqf_gov_id))}/profits`, { cache: "no-store" });
          if (yRes.ok) {
            const rows = await yRes.json();
            const grouped: Record<string, number> = {};
            for (const row of rows) {
              const year = String(row.profit_period_start || "").slice(0, 4);
              if (!year) continue;
              grouped[year] = (grouped[year] || 0) + Number(row.profit_amount || 0);
            }
            const series = Object.entries(grouped)
              .map(([y, total]) => ({ year: Number(y), total: Number(total) }))
              .sort((a, b) => a.year - b.year);
            setYearly(series);
            const py = new Date().getFullYear() - 1;
            const prev = series.find(s => s.year === py)?.total ?? null;
            setPrevYearProfit(prev);
          }
        } catch {}
      }
    } catch {}
  }

  // If already logged in, show first waqf summary instead of redirecting
  useEffect(() => {
    try {
      const raw = localStorage.getItem("awqaf_user");
      if (!raw) return;
      const u = JSON.parse(raw) as { nationalId?: string } | null;
      if (!u?.nationalId) return;
      setUserNationalId(u.nationalId);
      loadWaqfForNationalId(u.nationalId, desiredGovId);
    } catch {}
  }, [r, desiredGovId]);

  // React to login/logout events so no hard refresh is needed
  useEffect(() => {
    const handler = () => {
      try {
        const raw = localStorage.getItem("awqaf_user");
        if (!raw) {
          setUserNationalId(null);
          setWaqf(null);
          setSummary(null);
          setYearly([]);
          setPrevYearProfit(null);
          return;
        }
        const u = JSON.parse(raw) as { nationalId?: string } | null;
        if (u?.nationalId) {
          setUserNationalId(u.nationalId);
          loadWaqfForNationalId(u.nationalId, desiredGovId);
        }
      } catch {}
    };
    window.addEventListener("awqaf_user_changed", handler as EventListener);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("awqaf_user_changed", handler as EventListener);
      window.removeEventListener("storage", handler);
    };
  }, [desiredGovId]);

  const graphData = useMemo(() => {
    if (!summary) return [] as Array<{ label: string; value: number; color: string }>;
    if (graphMode === "totals") {
      return [
        { label: "Total Payouts", value: summary.totals.totalPayouts, color: "#7db3ff" },
        { label: "Last Year Profit", value: summary.totals.lastYearProfit, color: "#4caf50" },
        { label: "Corpus", value: summary.totals.corpus, color: "#ff9800" },
      ];
    }
    if (graphMode === "top") {
      return topBeneficiaries.map((b, i) => ({ label: b.name, value: b.amount, color: ["#7db3ff","#4caf50","#ff9800","#ab47bc","#ff7043"][i % 5] }));
    }
    return [];
  }, [summary, graphMode, topBeneficiaries]);

  const maxValue = useMemo(() => graphData.reduce((m, d) => Math.max(m, d.value), 0) || 1, [graphData]);
  const fmt = (n: number) => Number(n).toLocaleString();

  const faqData = [
    {
      question: "What is a waqf?",
      answer: "A waqif is an islamic endowment that can be split into two types of organizations: a charitable or a family waqf.\n A charitable waqf is when the profits of an asset are used to benefit the public. \n A family waqf is when the profits of an asset are used to benefit the family."
    },
    {
      question: "What type of assets can be used to create a waqf?",
      answer: "Any asset that can be used to generate income can be used to create a waqf. This includes real estate, stocks, bonds, and other investments."
    },
    {
      question: "what does waqf tracker do?",
      answer: "Waqf tracker is a platform that helps manage and track waqf funds with complete transparency and accountability. this includes tracking the profits of an asset, the beneficiaries of the profits, and the distribution of the profits."
    },
    {
      question: "How does waqf tracker work?",
      answer: "waqf trackeer works by using the regisrterd govermennt id of the waqf to gather information about the waqfs corpus and authorized representatives. benficeries are added through waqf tracker and payouts are made to the beneficiaries."
    },
    {
      question: "how can the bank that owns waqf tracker benefit from this?",
      answer: "The bank that owns waqf tracker can benefit from by manging the assets of the waqf and the proccissing payments to the beneficiaries of the waqf throguh the holding bank."
    }
  ];

  const nextFaq = () => {
    setCurrentFaqIndex((prev) => (prev + 1) % faqData.length);
  };

  const prevFaq = () => {
    setCurrentFaqIndex((prev) => (prev - 1 + faqData.length) % faqData.length);
  };

  const goToFaq = (index: number) => {
    setCurrentFaqIndex(index);
  };

  async function onLoginSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (!credential || !password) {
      setMsg("Email/National ID and password are required");
      return;
    }
    setLoading(true);
    try {
      const isEmail = credential.includes("@");
      const body: Record<string, string> = { password };
      if (isEmail) body.email = credential.trim().toLowerCase();
      else body.nationalId = credential.trim();

      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error || "Login failed");
        return;
      }

      // Persist minimal user info for nav gating
      try {
        const stored = {
          userId: data.userId,
          email: data.email,
          nationalId: data.nationalId || (isEmail ? undefined : body.nationalId),
          name: data.name || undefined,
        };
        localStorage.setItem("awqaf_user", JSON.stringify(stored));
        window.dispatchEvent(new Event("awqaf_user_changed"));
      } catch {}

      if (!isEmail) {
        // Fetch waqfs for this nationalId and send to first waqf dashboard if available
        try {
          const waqfRes = await fetch(`${API_BASE}/waqf?nationalId=${encodeURIComponent(body.nationalId!)}`, { cache: "no-store" });
          const waqfs = await waqfRes.json();
          if (Array.isArray(waqfs) && waqfs.length > 0 && waqfs[0]?.waqf_gov_id) {
            const govId = String(waqfs[0].waqf_gov_id);
            // update state immediately (no refresh needed)
            setUserNationalId(body.nationalId!);
            await loadWaqfForNationalId(body.nationalId!, govId);
            r.replace(`/?govId=${encodeURIComponent(govId)}`);
            return;
          }
          // Fallback to dashboard with nationalId context to choose later
          r.replace(`/`);
          return;
        } catch {
          r.replace("/");
          return;
        }
      }

      // Email login: redirect to generic dashboard; user can select waqf there
      r.replace("/");
    } catch (err: any) {
      setMsg(err?.message || "Network error");
    } finally {
      setLoading(false);
    }
  }

  // If logged in and have a waqf summary, show the overview instead of login form
  if (userNationalId && waqf && summary) {
    return (
      <div className="home-page">
        <div className="home-container" style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 24 }}>
          {/* Left: Summary */}
          <div className="login-section">
            <div className="login-container">
              <h2 className="login-title">{waqf.waqf_name}</h2>
              <div style={{ color: "#555", marginBottom: 12, lineHeight: 1.5 }}>
                <div>Gov ID: {waqf.waqf_gov_id}</div>
                <div>Type: {waqf.waqf_type}</div>
                <div>Asset: {waqf.asset_kind}</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ border: "1px solid #ddd", padding: 12 }}>
                  <b>Corpus</b>
                  <div style={{ fontSize: 22, marginTop: 6 }}>${fmt(summary.totals.corpus)}</div>
                </div>
                <div style={{ border: "1px solid #ddd", padding: 12 }}>
                  <b>Current Year Profit</b>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 22, marginTop: 6 }}>
                    <span>${fmt(summary.totals.lastYearProfit)}</span>
                    {prevYearProfit !== null && (
                      (() => {
                        const diff = summary.totals.lastYearProfit - prevYearProfit;
                        const pct = prevYearProfit === 0 ? 0 : (diff / prevYearProfit) * 100;
                        const up = diff >= 0;
                        return (
                          <span style={{ color: up ? '#2e7d32' : '#c62828', fontSize: 16 }}>
                            {up ? '▲' : '▼'} {Math.abs(pct).toFixed(1)}%
                          </span>
                        );
                      })()
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Graphs */}
          <div className="faq-section">
            <h2 className="faq-title">Overview</h2>
            {graphMode !== "yearly" && (
              <div style={{ display: "flex", alignItems: "flex-end", gap: 24, height: 360, border: "1px solid #eee", padding: 24, position: "relative" }}>
                {graphData.map((d) => (
                  <div key={d.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, position: "relative" }}>
                    <div
                      style={{ background: d.color, width: 60, height: Math.max(8, (d.value / maxValue) * 280), position: "relative" }}
                      title={`$${fmt(d.value)}`}
                    ></div>
                    <small style={{ whiteSpace: "nowrap" }}>{d.label}</small>
                    <small>${fmt(d.value)}</small>
                  </div>
                ))}
              </div>
            )}
            {graphMode === "yearly" && (
              <div style={{ border: "1px solid #eee", padding: 24 }}>
                <svg viewBox="0 0 800 360" width="100%" height="360">
                  {/* axes */}
                  <line x1="50" y1="20" x2="50" y2="320" stroke="#aaa" />
                  <line x1="50" y1="320" x2="780" y2="320" stroke="#aaa" />
                  {(() => {
                    if (!yearly.length) return null;
                    const yMax = Math.max(...yearly.map(p => p.total)) || 1;
                    const xStep = yearly.length > 1 ? (730 / (yearly.length - 1)) : 0;
                    const pts = yearly.map((p, i) => {
                      const x = 50 + i * xStep;
                      const y = 320 - Math.max(8, (p.total / yMax) * 280);
                      return `${x},${y}`;
                    }).join(" ");
                    return (
                      <>
                        <polyline fill="none" stroke="#0077ff" strokeWidth="3" points={pts} />
                        {yearly.map((p, i) => {
                          const x = 50 + i * xStep;
                          const y = 320 - Math.max(8, (p.total / yMax) * 280);
                          return (
                            <g key={p.year}>
                              <circle cx={x} cy={y} r="4" fill="#0077ff" >
                                <title>${fmt(p.total)}</title>
                              </circle>
                              <text x={x} y={y - 8} textAnchor="middle" fontSize="10" fill="#333">${fmt(p.total)}</text>
                              <text x={x} y={335} textAnchor="middle" fontSize="10" fill="#666">{p.year}</text>
                            </g>
                          );
                        })}
                      </>
                    );
                  })()}
                </svg>
              </div>
            )}
            <div style={{ marginTop: 12 }}>
              <label style={{ marginRight: 8 }}>Display:</label>
              <select value={graphMode} onChange={(e) => setGraphMode(e.target.value as any)} className="form-input" style={{ width: 280 }}>
                <option value="yearly">Yearly Profit</option>
                <option value="top">Top 5 Beneficiaries</option>
                <option value="totals">Totals (Profit / Corpus)</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="home-page">
      <div className="home-container">
        {/* Login Form - Left Side */}
        <div className="login-section">
          <div className="login-container">
            <h2 className="login-title">Sign In</h2>
            <form className="login-form" onSubmit={onLoginSubmit}>
              <div className="form-group">
                <label htmlFor="email" className="form-label">Email or ID</label>
                <input 
                  type="text" 
                  id="email" 
                  className="form-input" 
                  placeholder="Enter your email or ID"
                  value={credential}
                  onChange={(e) => setCredential(e.target.value)}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="password" className="form-label">Password</label>
                <input 
                  type="password" 
                  id="password" 
                  className="form-input" 
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              
              <button type="submit" className="login-button" disabled={loading}>
                {loading ? "Signing in…" : "Log In"}
              </button>
              
              <Link href="/signup" className="signup-link">
                Sign Up
              </Link>
              
              <div className="login-help">
                {msg && <p style={{ marginTop: 10, color: "crimson" }}>{msg}</p>}
              </div>
            </form>
          </div>
        </div>

        {/* FAQ Slideshow - Right Side */}
        <div className="faq-section">
          <h2 className="faq-title">Frequently Asked Questions</h2>
          
          <div className="faq-slideshow">
            <div className="faq-slide">
              <h3 className="faq-question">{faqData[currentFaqIndex].question}</h3>
              <p className="faq-answer">{faqData[currentFaqIndex].answer}</p>
            </div>
            
            <div className="faq-navigation">
              <button 
                className="faq-nav-btn faq-prev" 
                onClick={prevFaq}
                aria-label="Previous question"
              >
                ←
              </button>
              
              <div className="faq-dots">
                {faqData.map((_, index) => (
                  <button
                    key={index}
                    className={`faq-dot ${index === currentFaqIndex ? 'active' : ''}`}
                    onClick={() => goToFaq(index)}
                    aria-label={`Go to question ${index + 1}`}
                  />
                ))}
              </div>
              
              <button 
                className="faq-nav-btn faq-next" 
                onClick={nextFaq}
                aria-label="Next question"
              >
                →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}