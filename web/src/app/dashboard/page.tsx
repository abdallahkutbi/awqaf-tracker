"use client";

//The dashboard page for the awqaf tracker

//imports
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


export default function DashboardPage() {
  const searchParams = useSearchParams();
  const govId = searchParams.get("govId");
  const nationalId = searchParams.get("nationalId");
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!govId) {
        setLoading(false);
        return;
      }
      
      try {
        const res = await fetch(`${API_BASE}/waqf/${encodeURIComponent(govId)}/summary`, { cache: "no-store" });
        if (res.ok) {
          const summaryData = await res.json();
          setData(summaryData);
        }
      } catch (error) {
        console.error("Error fetching summary:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [govId]);

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
          const currentProfit = Number(data.totals.lastYearProfit || 0);
          const completedPayouts = Number(data.totals.executedPayouts || 0);
          const remainingBalance = Math.max(0, currentProfit - completedPayouts);
          const isFullyPaid = currentProfit > 0 && completedPayouts >= currentProfit;
          const hasPartialPayouts = completedPayouts > 0 && !isFullyPaid;
          
          let statusLabel, statusColor;
          if (isFullyPaid) {
            statusLabel = "All amount paid out";
            statusColor = "#2e7d32";
          } else if (hasPartialPayouts) {
            statusLabel = "Remaining balance not paid out";
            statusColor = "#ff9800";
          } else {
            statusLabel = "Pending payout to beneficiaries";
            statusColor = "#c62828";
          }
          
          return (
            <div style={{ border: "1px solid #ddd", padding: 12 }}>
              <b>Status:</b>
              <div style={{ color: statusColor }}>{statusLabel}</div>
            </div>
          );
        })()}
        {(() => {
          const currentProfit = Number(data.totals.lastYearProfit || 0);
          const completedPayouts = Number(data.totals.executedPayouts || 0);
          const remainingBalance = Math.max(0, currentProfit - completedPayouts);
          
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
