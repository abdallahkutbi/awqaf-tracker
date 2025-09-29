import { API_BASE } from "@/lib/config";
import Link from "next/link";

type WaqfRow = {
  waqf_gov_id: number;
  waqf_name: string;
  waqf_type: string;
  asset_kind: string;
  asset_label: string | null;
  is_founder?: 0 | 1;
};

async function fetchWaqfs(nationalId: string): Promise<WaqfRow[]> {
  const res = await fetch(`${API_BASE}/waqf?nationalId=${encodeURIComponent(nationalId)}`, { cache: "no-store" });
  if (!res.ok) return [];
  return res.json();
}

export default async function WaqfListPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const nationalId = typeof sp?.nationalId === "string" ? sp.nationalId : "";
  const waqfs = nationalId ? await fetchWaqfs(nationalId) : [];

  return (
    <main>
      <h2>Your Waqf Records</h2>
      {!nationalId && <p>Provide a nationalId in the URL to view waqf list, e.g. <code>/waqf?nationalId=1234567890</code></p>}
      {nationalId && waqfs.length === 0 && <p>No waqf records found for national ID {nationalId}.</p>}
      {waqfs.length > 0 && (
        <div style={{ display: "grid", gap: 8 }}>
          {waqfs.map((w) => (
            <div key={`${w.waqf_gov_id}-${w.asset_kind}-${w.asset_label ?? ""}`} style={{ border: "1px solid #ddd", padding: 12 }}>
              <div style={{ fontWeight: 600 }}>{w.waqf_name}</div>
              <div style={{ color: "#555" }}>{w.waqf_type} • {w.asset_kind}{w.asset_label ? ` • ${w.asset_label}` : ""}</div>
              <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Link href={`/dashboard?govId=${encodeURIComponent(String(w.waqf_gov_id))}`}>View dashboard</Link>
                <Link href={`/beneficiaries?govId=${encodeURIComponent(String(w.waqf_gov_id))}`}>Beneficiaries</Link>
                <Link href={`/distribution-rules?govId=${encodeURIComponent(String(w.waqf_gov_id))}`}>Distribution Rules</Link>
                <Link href={`/payouts?govId=${encodeURIComponent(String(w.waqf_gov_id))}`}>Payouts</Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}


