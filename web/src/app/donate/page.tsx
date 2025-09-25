"use client";
import { useState } from "react";
import { API_BASE } from "@/lib/config";

export default function DonatePage() {
  const [amount, setAmount] = useState(25);
  const [status, setStatus] = useState("");

  async function donate() {
    setStatus("Creating payment intent…");
    const r1 = await fetch(`${API_BASE}/donations/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ waqfId: "wqf_1", causeId: "cause_1", amount, method: "card" })
    });
    const j1 = await r1.json();

    setStatus(`Intent ${j1.paymentIntentId}. Confirming…`);
    const r2 = await fetch(`${API_BASE}/donations/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentIntentId: j1.paymentIntentId })
    });
    const j2 = await r2.json();

    setStatus(`Donation ${j2.donationId} ${j2.status}. Net: ${j2.net}`);
  }

  return (
    <main>
      <h2>Donate</h2>
      <label>
        Amount:{" "}
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(parseInt(e.target.value || "0", 10))}
          style={{ width: 120 }}
        />
      </label>
      <button onClick={donate} style={{ marginLeft: 12 }}>Donate (mock)</button>
      <p style={{ marginTop: 12 }}>{status}</p>
    </main>
  );
}
