"use client";
import { API_BASE } from "@/lib/config";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

type Beneficiary = {
  id: number;
  waqf_gov_id: number;
  full_name: string;
  national_id: string | null;
  relation: string | null;
  percent_share?: number | null;
};

export default function BeneficiariesPage() {
  const sp = useSearchParams();
  const r = useRouter();
  const govId = sp.get("govId") || "";
  const [list, setList] = useState<Beneficiary[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [profitAmount, setProfitAmount] = useState<number | "">("");

  useEffect(() => {
    let active = true;
    if (!govId) return;
    (async () => {
      setLoading(true);
      try {
        // Fetch waqf to prefill last year profit (profitAmount default)
        try {
          const w = await fetch(`${API_BASE}/waqf/${encodeURIComponent(govId)}/summary`, { cache: "no-store" });
          if (w.ok) {
            const ws = await w.json();
            if (typeof ws?.totals?.lastYearProfit === "number") {
              setProfitAmount(ws.totals.lastYearProfit);
            }
          }
        } catch {}
        const res = await fetch(`${API_BASE}/waqf/${encodeURIComponent(govId)}/beneficiaries`, { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Failed to load");
        if (active) {
          // If no percent_share present from API, keep as null (user will adjust), else use existing
          setList(data);
        }
      } catch (e: any) {
        if (active) setMsg(e?.message || "Failed to load");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [govId]);

  const totalPercent = useMemo(() => list.reduce((sum, b) => sum + (Number(b.percent_share) || 0), 0), [list]);
  const cashFor = (percent: number | null | undefined) => {
    const p = Number(percent) || 0;
    const base = profitAmount === "" ? 0 : Number(profitAmount) || 0;
    return Math.round((base * p / 100) * 100) / 100;
  };

  function fmt(n: number) {
    return Number(n).toLocaleString();
  }

  function adjustPercent(id: number, delta: number) {
    setList(prev => {
      const next = prev.map(b => b.id === id ? { ...b, percent_share: Math.max(0, (Number(b.percent_share) || 0) + delta) } : b);
      const sum = next.reduce((s, x) => s + (Number(x.percent_share) || 0), 0);
      // Do not allow exceeding 100%
      if (sum > 100) return prev;
      return next;
    });
  }

  function onChangePercent(id: number, value: string) {
    const v = value === "" ? null : Number(value);
    if (v !== null && (isNaN(v) || v < 0 || v > 100)) return;
    setList(prev => {
      const next = prev.map(b => b.id === id ? { ...b, percent_share: v } : b);
      const sum = next.reduce((s, x) => s + (Number(x.percent_share) || 0), 0);
      if (sum > 100) return prev;
      return next;
    });
  }

  async function saveAll() {
    setMsg(null);
    if (Math.round(totalPercent * 100) / 100 !== 100) {
      setMsg("Percentages must sum to 100%.");
      return;
    }
    try {
      for (const b of list) {
        await fetch(`${API_BASE}/beneficiaries/${b.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ percent_share: Number(b.percent_share) || 0 })
        });
      }
      setMsg("Saved");
    } catch (e: any) {
      setMsg(e?.message || "Failed to save");
    }
  }

  async function addRow() {
    const name = prompt("New beneficiary name");
    if (!name) return;
    try {
      const res = await fetch(`${API_BASE}/waqf/${encodeURIComponent(govId)}/beneficiaries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: name })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to add");
      // reload
      const res2 = await fetch(`${API_BASE}/waqf/${encodeURIComponent(govId)}/beneficiaries`, { cache: "no-store" });
      setList(await res2.json());
    } catch (e: any) {
      setMsg(e?.message || "Failed to add beneficiary");
    }
  }

  async function removeRow(id: number) {
    if (!confirm("Remove this beneficiary?")) return;
    try {
      await fetch(`${API_BASE}/beneficiaries/${id}`, { method: "DELETE" });
      setList(prev => prev.filter(b => b.id !== id));
    } catch (e: any) {
      setMsg(e?.message || "Failed to remove beneficiary");
    }
  }

  return (
    <main>
      <h2>Beneficiaries</h2>
      {!govId && <p>Provide a govId in the URL, e.g. <code>/beneficiaries?govId=482931</code></p>}
      {msg && <p style={{ color: "crimson" }}>{msg}</p>}
      {govId && (
        <div style={{ marginBottom: 12 }}>
          <label>Profit amount for preview: </label>
          <input value={profitAmount} onChange={(e) => setProfitAmount(e.target.value === "" ? "" : Number(e.target.value))} placeholder="e.g. 85000" className="form-input" style={{ width: 160 }} />
        </div>
      )}
      {loading && <p>Loading…</p>}
      {!loading && list.length > 0 && (
        <>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>Name</th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>Relation</th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>National ID</th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>Percent %</th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>Cash Value</th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map(b => (
                <tr key={b.id}>
                  <td style={{ borderBottom: "1px solid #f0f0f0", padding: 8 }}>{b.full_name}</td>
                  <td style={{ borderBottom: "1px solid #f0f0f0", padding: 8 }}>{b.relation || "—"}</td>
                  <td style={{ borderBottom: "1px solid #f0f0f0", padding: 8 }}>{b.national_id || "—"}</td>
                  <td style={{ borderBottom: "1px solid #f0f0f0", padding: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <button onClick={() => adjustPercent(b.id, -1)} aria-label="decrease" className="login-button" style={{ padding: "2px 8px" }}>−</button>
                      <input
                        value={b.percent_share ?? ""}
                        onChange={(e) => onChangePercent(b.id, e.target.value)}
                        placeholder="0"
                        className="form-input"
                        style={{ width: 70 }}
                      />
                      <button onClick={() => adjustPercent(b.id, +1)} aria-label="increase" className="login-button" style={{ padding: "2px 8px" }}>+</button>
                    </div>
                  </td>
                  <td style={{ borderBottom: "1px solid #f0f0f0", padding: 8 }}>${fmt(cashFor(b.percent_share))}</td>
                  <td style={{ borderBottom: "1px solid #f0f0f0", padding: 8 }}>
                    <button onClick={() => removeRow(b.id)} className="signup-link">Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3} style={{ padding: 8, textAlign: "right" }}><b>Total</b></td>
                <td style={{ padding: 8 }}><b>{(Math.round(totalPercent * 100) / 100).toFixed(2)}%</b></td>
                <td style={{ padding: 8 }}></td>
                <td style={{ padding: 8 }}></td>
              </tr>
            </tfoot>
          </table>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button onClick={addRow} className="login-button">Add Beneficiary</button>
            <button onClick={saveAll} className="login-button" disabled={Math.round(totalPercent * 100) / 100 !== 100}>Save Changes</button>
          </div>
        </>
      )}
    </main>
  );
}


