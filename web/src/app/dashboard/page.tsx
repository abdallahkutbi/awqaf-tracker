"use client";

//The dashboard page for the awqaf tracker

//imports
import { Suspense } from "react";
import { API_BASE } from "@/lib/config";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";

type Summary = {
  waqfId: number;
  waqfName: string;
  totals: { corpus: number; lastYearProfit: number; totalPayouts: number; executedPayouts: number; beneficiaries: number; distributionRules: number };
  month: { inflow: number; outflow: number };
  pending: { currentYearProfit: number; pendingPayout: number };
};

type PayoutStatus = {
  waqf_gov_id: number;
  profit_year: number;
  payout_year: number;
  totals: {
    profit_total: number;
    executed_payouts: number;
    pending_payout: number;
  };
  status: string;
};


function DashboardInner() {
  const searchParams = useSearchParams();
  const govId = searchParams.get("govId");
  const nationalId = searchParams.get("nationalId");
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [payoutStatus, setPayoutStatus] = useState<PayoutStatus | null>(null);

  const fetchData = async () => {
    if (!govId) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/waqf/${encodeURIComponent(govId)}/summary`, { cache: "no-store" });
      if (res.ok) {
        const summaryData = await res.json();
        setData(summaryData);
      }
      // Also fetch last-year payout status (server defaults to last year)
      const st = await fetch(`${API_BASE}/waqf/${encodeURIComponent(govId)}/payout-status`, { cache: "no-store" });
      if (st.ok) {
        const statusJson = await st.json();
        setPayoutStatus(statusJson);
      }
    } catch (error) {
      console.error("Error fetching summary/status:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [govId]);

  // Refresh data when returning from payout processing
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('success')) {
      // Refresh data after successful payout processing
      fetchData();
      // Clean up URL
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('success');
      window.history.replaceState({}, '', newUrl.toString());
    }
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  // If no govId provided, optionally show a helper or a link back
  if (!data) {
    return (
      <main>
        <h2>Trustee Dashboard</h2>
        <p>Please select a waqf to view its summary.</p>
        {nationalId && (
          <p>
            View your waqf list: <Link href={`/waqf?nationalId=${encodeURIComponent(nationalId)}`}>/waqf</Link>
          </p>
        )}
      </main>
    );
  }
  return (
    <main>
      <h2>Trustee Dashboard</h2>
      <div style={{ marginBottom: 8, color: "#555" }}>{data.waqfName} (Gov ID: {data.waqfId})</div>
      <div style={{ 
        display: "flex", 
        gap: 0, 
        marginBottom: 20,
        border: "1px solid #ddd",
        borderRadius: 8,
        overflow: "hidden",
        backgroundColor: "#f8f9fa"
      }}>
        <Link 
          href={`/beneficiaries?govId=${encodeURIComponent(String(data.waqfId))}`}
          style={{
            flex: 1,
            padding: "12px 16px",
            textAlign: "center",
            textDecoration: "none",
            color: "#333",
            backgroundColor: "white",
            borderRight: "1px solid #ddd",
            transition: "background-color 0.2s ease"
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#e3f2fd"}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "white"}
        >
          Beneficiaries
        </Link>
        <Link 
          href={`/payouts?govId=${encodeURIComponent(String(data.waqfId))}`}
          style={{
            flex: 1,
            padding: "12px 16px",
            textAlign: "center",
            textDecoration: "none",
            color: "#333",
            backgroundColor: "white",
            borderRight: "1px solid #ddd",
            transition: "background-color 0.2s ease"
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#e3f2fd"}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "white"}
        >
          Payouts
        </Link>
        <Link 
          href={`/payout-select?govId=${encodeURIComponent(String(data.waqfId))}`}
          style={{
            flex: 1,
            padding: "12px 16px",
            textAlign: "center",
            textDecoration: "none",
            color: "white",
            backgroundColor: "#2e7d32",
            transition: "background-color 0.2s ease"
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#1b5e20"}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#2e7d32"}
        >
          Make Payout
        </Link>
      </div>
      {null}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        <div style={{ border: "1px solid #ddd", padding: 12 }}>
          <b>Last Year Profit:</b>
          <div>${Number(data.totals.lastYearProfit).toLocaleString()}</div>
        </div>
        {(() => {
          // Prefer server-computed last-year status if available
          if (payoutStatus) {
            const label = payoutStatus.status;
            const color = label.includes("✅") ? "#2e7d32" : label.includes("🟡") ? "#ff9800" : label.includes("🔴") ? "#c62828" : "#555";
            return (
              <div style={{ border: "1px solid #ddd", padding: 12 }}>
                <b>Last-Year Status:</b>
                <div style={{ color }}>{label}</div>
                <div style={{ marginTop: 6, fontSize: 12, color: "#666" }}>Profit {payoutStatus.profit_year} • Payouts {payoutStatus.payout_year}</div>
              </div>
            );
          }
          // Fallback to local computation from summary
          const currentProfit = Number(data.totals.lastYearProfit || 0);
          const completedPayouts = Number(data.totals.executedPayouts || 0);
          const isFullyPaid = currentProfit > 0 && completedPayouts >= currentProfit;
          const hasPartialPayouts = completedPayouts > 0 && !isFullyPaid;
          let statusLabel = isFullyPaid ? "All amount paid out" : hasPartialPayouts ? "Remaining balance not paid out" : "Pending payout to beneficiaries";
          let statusColor = isFullyPaid ? "#2e7d32" : hasPartialPayouts ? "#ff9800" : "#c62828";
          return (
            <div style={{ border: "1px solid #ddd", padding: 12 }}>
              <b>Status:</b>
              <div style={{ color: statusColor }}>{statusLabel}</div>
            </div>
          );
        })()}
        {(() => {
          if (payoutStatus) {
            const pending = Number(payoutStatus.totals.pending_payout || 0);
            return (
              <div style={{ border: "1px solid #ddd", padding: 12 }}>
                <b>To Be Paid Out:</b>
                <div style={{ color: pending > 0 ? "#c62828" : "#2e7d32" }}>
                  ${pending.toLocaleString()}
                </div>
              </div>
            );
          }
          // Use totalPayouts field which now contains the "To Be Paid Out" amount
          const toBePaidOut = Number(data.totals.totalPayouts || 0);
          const completedPayouts = Number(data.totals.executedPayouts || 0);
          const remainingBalance = Math.max(0, toBePaidOut - completedPayouts);
          return (
            <div style={{ border: "1px solid #ddd", padding: 12 }}>
              <b>To Be Paid Out:</b>
              <div style={{ color: remainingBalance > 0 ? "#c62828" : "#2e7d32" }}>
                ${remainingBalance.toLocaleString()}
              </div>
            </div>
          );
        })()}
        <div style={{ border: "1px solid #ddd", padding: 12 }}>
          <b>Corpus:</b>
          <div>${Number(data.totals.corpus).toLocaleString()}</div>
        </div>
      </div>
    </main>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DashboardInner />
    </Suspense>
  );
}
