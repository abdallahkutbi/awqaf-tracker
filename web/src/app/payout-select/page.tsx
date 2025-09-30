"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { API_BASE } from "@/lib/config";

type Beneficiary = {
  id: number;
  full_name: string;
  national_id: string;
  relation: string;
  percent_share: number;
  iban?: string;
  bank_name?: string;
  account_holder_name?: string;
  asset_kind?: string;
  asset_label?: string;
};

type Payout = {
  id: number;
  beneficiary_id: number;
  amount_usd: number;
  status: string;
  payout_date: string;
};

type Waqf = {
  waqf_gov_id: number;
  waqf_name: string;
  waqf_type: string;
  asset_kind: string;
  asset_label: string;
  last_year_profit_usd: number;
};

function PayoutSelectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const govId = searchParams.get("govId");
  
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [waqf, setWaqf] = useState<Waqf | null>(null);
  const [selectedBeneficiaries, setSelectedBeneficiaries] = useState<Set<number>>(new Set());
  const [profitAmount, setProfitAmount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [paidBeneficiaries, setPaidBeneficiaries] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!govId) return;
    
    const fetchData = async () => {
      try {
        // Fetch beneficiaries
        const beneficiariesRes = await fetch(`${API_BASE}/waqf/${govId}/beneficiaries`);
        if (beneficiariesRes.ok) {
          const beneficiariesData = await beneficiariesRes.json();
          setBeneficiaries(beneficiariesData);
        }

        // Fetch waqf details from summary endpoint
        const waqfRes = await fetch(`${API_BASE}/waqf/${govId}/summary`);
        if (waqfRes.ok) {
          const summaryData = await waqfRes.json();
          // Create waqf object from summary data
          const waqfData = {
            waqf_gov_id: summaryData.waqfId,
            waqf_name: summaryData.waqfName,
            waqf_type: "Family", // Default, could be enhanced
            asset_kind: "Property", // Default, could be enhanced
            asset_label: "Asset", // Default, could be enhanced
            last_year_profit_usd: summaryData.totals.lastYearProfit
          };
          setWaqf(waqfData);
          setProfitAmount(summaryData.totals.lastYearProfit || 0);
        }

        // Fetch existing payouts to check who's already been paid
        const payoutsRes = await fetch(`${API_BASE}/waqf/${govId}/payouts?status=completed`);
        if (payoutsRes.ok) {
          const payoutsData = await payoutsRes.json() as Payout[];
          const paidIds = new Set(payoutsData.map((payout: Payout) => payout.beneficiary_id));
          setPaidBeneficiaries(paidIds);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [govId]);

  const handleBeneficiaryToggle = (beneficiaryId: number) => {
    // Don't allow toggling if already paid
    if (paidBeneficiaries.has(beneficiaryId)) {
      return;
    }
    
    const newSelected = new Set(selectedBeneficiaries);
    if (newSelected.has(beneficiaryId)) {
      newSelected.delete(beneficiaryId);
    } else {
      newSelected.add(beneficiaryId);
    }
    setSelectedBeneficiaries(newSelected);
  };

  const handleSelectAll = () => {
    const unpaidBeneficiaries = beneficiaries
      .filter(b => !paidBeneficiaries.has(b.id))
      .map(b => b.id);
    
    const allUnpaidSelected = unpaidBeneficiaries.every(id => selectedBeneficiaries.has(id));
    
    if (allUnpaidSelected) {
      // Deselect all unpaid beneficiaries
      const newSelected = new Set(selectedBeneficiaries);
      unpaidBeneficiaries.forEach(id => newSelected.delete(id));
      setSelectedBeneficiaries(newSelected);
    } else {
      // Select all unpaid beneficiaries
      const newSelected = new Set(selectedBeneficiaries);
      unpaidBeneficiaries.forEach(id => newSelected.add(id));
      setSelectedBeneficiaries(newSelected);
    }
  };

  const handleContinue = () => {
    if (selectedBeneficiaries.size === 0) {
      alert("Please select at least one beneficiary");
      return;
    }
    
    const selectedIds = Array.from(selectedBeneficiaries);
    const queryParams = new URLSearchParams({
      govId: govId || "",
      selectedIds: selectedIds.join(","),
      profitAmount: profitAmount.toString()
    });
    
    router.push(`/payout-confirm?${queryParams.toString()}`);
  };

  const calculateAmount = (percentShare: number) => {
    return (profitAmount * percentShare) / 100;
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!waqf) {
    return <div>Waqf not found</div>;
  }

  return (
    <main style={{ maxWidth: 1200, margin: "0 auto", padding: 20 }}>
      <h2>Select Beneficiaries for Payout</h2>
      <div style={{ marginBottom: 20, padding: 16, backgroundColor: "#f5f5f5", borderRadius: 8 }}>
        <h3>{waqf.waqf_name} (Gov ID: {waqf.waqf_gov_id})</h3>
        <div style={{ marginBottom: 12 }}>
          <label>
            <strong>Profit Amount for Distribution:</strong>
            <input
              type="number"
              value={profitAmount}
              onChange={(e) => setProfitAmount(Number(e.target.value))}
              style={{ marginLeft: 8, padding: 4, width: 150 }}
            />
          </label>
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <h3 style={{ margin: 0 }}>Select Beneficiaries ({selectedBeneficiaries.size} selected)</h3>
          {(() => {
            const unpaidBeneficiaries = beneficiaries.filter(b => !paidBeneficiaries.has(b.id));
            const allUnpaidSelected = unpaidBeneficiaries.length > 0 && unpaidBeneficiaries.every(b => selectedBeneficiaries.has(b.id));
            const someUnpaidSelected = unpaidBeneficiaries.some(b => selectedBeneficiaries.has(b.id));
            
            return (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="checkbox"
                  checked={allUnpaidSelected}
                  ref={(input) => {
                    if (input) input.indeterminate = someUnpaidSelected && !allUnpaidSelected;
                  }}
                  onChange={handleSelectAll}
                  style={{ transform: "scale(1.2)" }}
                />
                <label style={{ fontSize: 14, color: "#666", cursor: "pointer" }}>
                  Select All Unpaid ({unpaidBeneficiaries.length})
                </label>
              </div>
            );
          })()}
        </div>
        <div style={{ display: "grid", gap: 12 }}>
          {beneficiaries.map((beneficiary) => {
            const isSelected = selectedBeneficiaries.has(beneficiary.id);
            const isPaid = paidBeneficiaries.has(beneficiary.id);
            const amount = calculateAmount(beneficiary.percent_share);
            
            return (
              <div
                key={beneficiary.id}
                style={{
                  border: "1px solid #ddd",
                  borderRadius: 8,
                  padding: 16,
                  backgroundColor: isPaid ? "#f5f5f5" : (isSelected ? "#e8f5e8" : "white"),
                  cursor: isPaid ? "not-allowed" : "pointer",
                  opacity: isPaid ? 0.6 : 1
                }}
                onClick={() => handleBeneficiaryToggle(beneficiary.id)}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    disabled={isPaid}
                    onChange={() => handleBeneficiaryToggle(beneficiary.id)}
                    style={{ transform: "scale(1.2)" }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 16, alignItems: "center" }}>
                      <div>
                        <strong>{beneficiary.full_name}</strong>
                        <div style={{ color: "#666", fontSize: 14 }}>
                          {beneficiary.relation} • {beneficiary.national_id}
                        </div>
                        {isPaid && (
                          <div style={{ color: "#2e7d32", fontSize: 12, fontWeight: "bold", marginTop: 4 }}>
                            ✓ Already Paid
                          </div>
                        )}
                      </div>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 14, color: "#666" }}>Percentage</div>
                        <div><strong>{beneficiary.percent_share}%</strong></div>
                      </div>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 14, color: "#666" }}>Amount</div>
                        <div><strong>${amount.toLocaleString()}</strong></div>
                      </div>
                      <div>
                        <div style={{ fontSize: 14, color: "#666" }}>IBAN</div>
                        <div style={{ fontSize: 12, fontFamily: "monospace" }}>
                          {beneficiary.iban || "Not provided"}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 32 }}>
        <button
          onClick={() => router.back()}
          style={{
            padding: "12px 24px",
            border: "1px solid #ccc",
            backgroundColor: "red",
            borderRadius: 6,
            cursor: "pointer"
          }}
        >
          Cancel
        </button>
        <button
          onClick={handleContinue}
          disabled={selectedBeneficiaries.size === 0}
          style={{
            padding: "12px 24px",
            border: "none",
            backgroundColor: selectedBeneficiaries.size > 0 ? "#2e7d32" : "#ccc",
            color: "white",
            borderRadius: 6,
            cursor: selectedBeneficiaries.size > 0 ? "pointer" : "not-allowed"
          }}
        >
          Continue ({selectedBeneficiaries.size} selected)
        </button>
      </div>
    </main>
  );
}

export default function PayoutSelectPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PayoutSelectContent />
    </Suspense>
  );
}
