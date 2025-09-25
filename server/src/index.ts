//api server for awqaf tracker

//imports
import express from "express";
import cors from "cors";

const app = express();
app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Minimal donation flow (placeholders)
app.post("/donations/checkout", (req, res) => {
  const { waqfId, causeId, amount, method } = req.body || {};
  // TODO: add validation later
  const paymentIntentId = "pi_" + Math.random().toString(36).slice(2);
  res.json({ paymentIntentId, clientSecret: "mock_secret", echo: { waqfId, causeId, amount, method } });
});

app.post("/donations/confirm", (req, res) => {
  const { paymentIntentId } = req.body || {};
  // TODO: compute fee/net and persist later
  res.json({ donationId: "don_" + (paymentIntentId || "unknown"), status: "settled", fee: 0, net: 0 });
});

// Dashboard summary (static for now)
app.get("/waqf/:id/summary", (req, res) => {
  res.json({
    waqfId: req.params.id,
    totals: { donations: 0, payouts: 0, corpus: 0 },
    month: { inflow: 0, outflow: 0 }
  });
});

app.get("/", (_req, res) => {
    res.type("text/plain").send("Awqaf Tracker API is running. Try GET /health");
  });

const PORT = Number(process.env.PORT || 4000);
app.listen(PORT, () => {
  console.log(`API running at http://localhost:${PORT}`);
});
