import { API_BASE } from "@/lib/config";

type Payout = {
  id: number;
  waqf_gov_id: number;
  beneficiary_id: number | null;
  beneficiary_name?: string | null;
  amount_usd: number;
  status: string;
  payout_date: string;
  reference_number: string | null;
};

async function fetchPayouts(govId: string): Promise<Payout[]> {
  const res = await fetch(`${API_BASE}/waqf/${encodeURIComponent(govId)}/payouts`, { cache: "no-store" });
  if (!res.ok) return [];
  return res.json();
}

export default async function PayoutsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const govId = typeof sp?.govId === "string" ? sp.govId : "";
  const list = govId ? await fetchPayouts(govId) : [];

  return (
    <main>
      <h2>Payouts</h2>
      {!govId && <p>Provide a govId in the URL, e.g. <code>/payouts?govId=482931</code></p>}
      {govId && list.length === 0 && <p>No payouts found for waqf {govId}.</p>}
      {list.length > 0 && (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>Date</th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>Beneficiary</th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>Amount</th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>Status</th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>Ref</th>
            </tr>
          </thead>
          <tbody>
            {list.map(p => (
              <tr key={p.id}>
                <td style={{ borderBottom: "1px solid #f0f0f0", padding: 8 }}>{p.payout_date}</td>
                <td style={{ borderBottom: "1px solid #f0f0f0", padding: 8 }}>{p.beneficiary_name || "—"}</td>
                <td style={{ borderBottom: "1px solid #f0f0f0", padding: 8 }}>${p.amount_usd}</td>
                <td style={{ borderBottom: "1px solid #f0f0f0", padding: 8 }}>{p.status}</td>
                <td style={{ borderBottom: "1px solid #f0f0f0", padding: 8 }}>{p.reference_number || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}


