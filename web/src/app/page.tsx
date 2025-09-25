"use client";
import { useState } from "react";

export default function DonatePage() {
  const [amount, setAmount] = useState(25);
  const [log, setLog] = useState<string>("");

  const donate = async () => {
    setLog("Creating intent…");
    const r = await fetch("http://localhost:4000/donations/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ waqfId: "wqf_1", causeId: "cause_1", amount, method: "card" })
    });
    const intent = await r.json();
    setLog(`Intent ${intent.paymentIntentId}. Confirming…`);
    const c = await fetch("http://localhost:4000/donations/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentIntentId: intent.paymentIntentId })
    });
    const done = await c.json();
    setLog(`Donation ${done.donationId} → ${done.status}`);
  };

  return (
    <main style={{ maxWidth: 420 }}>
      <h1>Donate</h1>
      <label>Amount ($):{" "}
        <input type="number" value={amount} onChange={e => setAmount(Number(e.target.value))} />
      </label>
      <button onClick={donate} style={{ display: "block", marginTop: 12 }}>Donate</button>
      <pre style={{ marginTop: 12 }}>{log}</pre>
    </main>
  );
}
