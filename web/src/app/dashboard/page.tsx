//The dashboard page for the awqaf tracker

//imports
import { API_BASE } from "@/lib/config";


async function getSummary() {
  const res = await fetch(`${API_BASE}/waqf/wqf_1/summary`, { cache: "no-store" });
  if (!res.ok) return { waqfId: "wqf_1", totals: { donations: 0, payouts: 0, corpus: 0 }, month: { inflow: 0, outflow: 0 } };
  return res.json();
}

export default async function DashboardPage() {
  const data = await getSummary();
  return (
    <main>
      <h2>Trustee Dashboard</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        <div style={{ border: "1px solid #ddd", padding: 12 }}>
          <b>Total Donations</b>
          <div>${data.totals.donations}</div>
        </div>
        <div style={{ border: "1px solid #ddd", padding: 12 }}>
          <b>Total Payouts</b>
          <div>${data.totals.payouts}</div>
        </div>
        <div style={{ border: "1px solid #ddd", padding: 12 }}>
          <b>Corpus</b>
          <div>${data.totals.corpus}</div>
        </div>
      </div>
      <h3 style={{ marginTop: 16 }}>This Month</h3>
      <div>Inflow: ${data.month.inflow} | Outflow: ${data.month.outflow}</div>
    </main>
  );
}
