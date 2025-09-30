"use client";

import { Suspense, useState, useEffect } from "react";
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

type Waqf = {
  waqf_gov_id: number;
  waqf_name: string;
  waqf_type: string;
  asset_kind: string;
  asset_label: string;
};

function PayoutConfirmInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const govId = searchParams.get("govId");
  const selectedIdsParam = searchParams.get("selectedIds");
  const profitAmountParam = searchParams.get("profitAmount");
  
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [waqf, setWaqf] = useState<Waqf | null>(null);
  const [selectedBeneficiaries, setSelectedBeneficiaries] = useState<Beneficiary[]>([]);
  const [profitAmount, setProfitAmount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!govId || !selectedIdsParam || !profitAmountParam) {
      router.push("/dashboard");
      return;
    }

    const fetchData = async () => {
      try {
        // Fetch all beneficiaries
        const beneficiariesRes = await fetch(`${API_BASE}/waqf/${govId}/beneficiaries`);
        if (beneficiariesRes.ok) {
          const allBeneficiaries = await beneficiariesRes.json();
          setBeneficiaries(allBeneficiaries);
          
          // Filter to selected beneficiaries
          const selectedIds = selectedIdsParam.split(",").map(id => parseInt(id));
          const selected = allBeneficiaries.filter((b: Beneficiary) => selectedIds.includes(b.id));
          setSelectedBeneficiaries(selected);
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
            asset_label: "Asset" // Default, could be enhanced
          };
          setWaqf(waqfData);
        }

        setProfitAmount(parseFloat(profitAmountParam));
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [govId, selectedIdsParam, profitAmountParam, router]);

  const calculateAmount = (percentShare: number) => {
    return (profitAmount * percentShare) / 100;
  };

  const calculateTotalAmount = () => {
    return selectedBeneficiaries.reduce((total, beneficiary) => {
      return total + calculateAmount(beneficiary.percent_share);
    }, 0);
  };

  const handleSubmitPayout = async () => {
    if (selectedBeneficiaries.length === 0 || !waqf) return;
    
    setSubmitting(true);
    try {
      // Create payout records for each selected beneficiary
      const payoutPromises = selectedBeneficiaries.map(async (beneficiary) => {
        const amount = calculateAmount(beneficiary.percent_share);
        
        const payoutData = {
          waqf_gov_id: parseInt(govId!),
          asset_kind: beneficiary.asset_kind || 'Property',
          asset_label: beneficiary.asset_label || 'Asset',
          beneficiary_id: beneficiary.id,
          amount_usd: amount,
          payout_date: new Date().toISOString().split('T')[0],
          status: 'completed',
          iban: beneficiary.iban || '',
          bank_name: beneficiary.bank_name || '',
          account_holder_name: beneficiary.account_holder_name || beneficiary.full_name,
          notes: `Payout for ${beneficiary.percent_share}% share`
        };

        const response = await fetch(`${API_BASE}/payouts`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payoutData),
        });

        if (!response.ok) {
          throw new Error(`Failed to create payout for ${beneficiary.full_name}`);
        }

        return response.json();
      });

      await Promise.all(payoutPromises);
      
      // Redirect to payouts page to see the results
      router.push(`/payouts?govId=${govId}`);
    } catch (error) {
      console.error("Error creating payouts:", error);
      alert("Error creating payouts. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!waqf || selectedBeneficiaries.length === 0) {
    return <div>Invalid selection. Redirecting...</div>;
  }

  return (
    <main style={{ maxWidth: 1200, margin: "0 auto", padding: 20 }}>
      <h2>Confirm Payout</h2>
      <div style={{ marginBottom: 20, padding: 16, backgroundColor: "#f5f5f5", borderRadius: 8 }}>
        <h3>{waqf.waqf_name} (Gov ID: {waqf.waqf_gov_id})</h3>
        <div>
          <strong>Total Profit Amount:</strong> ${profitAmount.toLocaleString()}
        </div>
        <div>
          <strong>Total Payout Amount:</strong> ${calculateTotalAmount().toLocaleString()}
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <h3>Selected Beneficiaries ({selectedBeneficiaries.length})</h3>
        <div style={{ display: "grid", gap: 12 }}>
          {selectedBeneficiaries.map((beneficiary) => {
            const amount = calculateAmount(beneficiary.percent_share);
            
            return (
              <div
                key={beneficiary.id}
                style={{
                  border: "1px solid #ddd",
                  borderRadius: 8,
                  padding: 16,
                  backgroundColor: "white"
                }}
              >
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 16, alignItems: "center" }}>
                  <div>
                    <strong>{beneficiary.full_name}</strong>
                    <div style={{ color: "#666", fontSize: 14 }}>
                      {beneficiary.relation} • {beneficiary.national_id}
                    </div>
                    {beneficiary.account_holder_name && (
                      <div style={{ color: "#666", fontSize: 12 }}>
                        Account: {beneficiary.account_holder_name}
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
                    {beneficiary.bank_name && (
                      <div style={{ fontSize: 12, color: "#666" }}>
                        {beneficiary.bank_name}
                      </div>
                    )}
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
          disabled={submitting}
          style={{
            padding: "12px 24px",
            border: "1px solid #ccc",
            backgroundColor: "white",
            borderRadius: 6,
            cursor: submitting ? "not-allowed" : "pointer"
          }}
        >
          Back
        </button>
        <button
          onClick={handleSubmitPayout}
          disabled={submitting}
          style={{
            padding: "12px 24px",
            border: "none",
            backgroundColor: submitting ? "#ccc" : "#2e7d32",
            color: "white",
            borderRadius: 6,
            cursor: submitting ? "not-allowed" : "pointer"
          }}
        >
          {submitting ? "Processing..." : `Process Payout ($${calculateTotalAmount().toLocaleString()})`}
        </button>
      </div>
    </main>
  );
}

export default function PayoutConfirmPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PayoutConfirmInner />
    </Suspense>
  );
}
