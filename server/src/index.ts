// api server for awqaf tracker
import express from "express";
import cors from "cors";
import db from "./db";
import bcrypt from "bcryptjs";
import { DB_PATH } from "./db";
import fs from "node:fs";
import path from "node:path";

// ------- TYPES -------
// User type
interface User {
  id: number;
  email: string;
  password_hash: string;
}

// Waqf type
interface Waqf {
  waqf_gov_id: number;
  waqf_name: string;
  waqf_type: 'Charitable' | 'Family' | 'Joint';
  authorized_national_ids: string;
  asset_kind: 'Property' | 'Cash' | 'Corporate';
  asset_label: string | null;
  corpus_usd: number;
  last_year_profit_usd: number | null;
  created_at: string;
}

// ------- SERVER -------
const app = express();

// ------- MIDDLEWARE -------
app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());

// ------- DEBUG -------
//db debug (commented out for now)
app.get("/debug/db", (_req, res) => {
  const abs = path.resolve(DB_PATH);
  const exists = fs.existsSync(abs);
  const sizeBytes = exists ? fs.statSync(abs).size : 0;
  res.json({ dbPath: abs, exists, sizeBytes });
});

// ------- AUTH: SIGNUP + LOGIN -------
app.post("/auth/signup", (req, res) => {
    let { email, password, nationalId, name } = req.body || {};
    if (!email || !password || !nationalId) {
      return res.status(400).json({ error: "email, password, and nationalId are required" });
    }
    email = String(email).trim().toLowerCase();
    const passwordHash = bcrypt.hashSync(String(password), 10);

    try {
      // Create user account
      const info = db
        .prepare(
          `INSERT INTO users (email, password_hash, national_id, name)
           VALUES (?, ?, ?, ?)`
        )
        .run(email, passwordHash, String(nationalId), name || null);

      const userId = info.lastInsertRowid;

      // Check if user is authorized for any waqf
      const authorizedWaqfs = db.prepare(`
        SELECT w.*, wau.is_founder
        FROM waqf w
        JOIN waqf_authorized_users wau ON w.waqf_gov_id = wau.waqf_gov_id
        WHERE wau.national_id = ?
      `).all(nationalId);

      return res.status(201).json({ 
        userId,
        authorizedWaqfs,
        message: authorizedWaqfs.length > 0 
          ? `User created and authorized for ${authorizedWaqfs.length} waqf(s)`
          : "User created successfully"
      });
    } catch (e: any) {
      const msg = String(e?.message || "");
      if (msg.includes("users.email")) return res.status(409).json({ error: "Email already exists" });
      if (msg.includes("users.national_id")) return res.status(409).json({ error: "National ID already exists" });
      return res.status(500).json({ error: "Failed to create user" });
    }
  });
  
// ------- AUTH: LOGIN -------
app.post("/auth/login", (req, res) => {
    const { email, nationalId, password } = req.body || {};
    if (!password || (!email && !nationalId)) {
      return res.status(400).json({ error: "email or nationalId and password are required" });
    }

    const byEmail = typeof email === "string";
    const user = byEmail
      ? db.prepare(`SELECT id, email, password_hash FROM users WHERE email = ?`)
          .get(String(email).trim().toLowerCase()) as User | undefined
      : db.prepare(`SELECT id, email, password_hash FROM users WHERE national_id = ?`)
          .get(String(nationalId).trim()) as User | undefined;

    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const ok = bcrypt.compareSync(String(password), user.password_hash);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    return res.json({ userId: user.id, email: user.email });
  });

// ------- WAQF MANAGEMENT -------
// Get all waqf records for a user (by national ID)
app.get("/waqf", (req, res) => {
  const { nationalId } = req.query;
  if (!nationalId) {
    return res.status(400).json({ error: "nationalId query parameter is required" });
  }

  try {
    const waqfs = db.prepare(`
      SELECT w.*, wau.is_founder
      FROM waqf w
      JOIN waqf_authorized_users wau ON w.waqf_gov_id = wau.waqf_gov_id
      WHERE wau.national_id = ?
      ORDER BY w.created_at DESC
    `).all(nationalId);

    res.json(waqfs);
  } catch (e: any) {
    res.status(500).json({ error: "Failed to fetch waqf records" });
  }
});

// Get specific waqf record
app.get("/waqf/:govId/:assetKind/:assetLabel", (req, res) => {
  const { govId, assetKind, assetLabel } = req.params;
  
  try {
    const waqf = db.prepare(`
      SELECT * FROM waqf 
      WHERE waqf_gov_id = ? AND asset_kind = ? AND asset_label = ?
    `).get(govId, assetKind, assetLabel) as Waqf | undefined;

    if (!waqf) {
      return res.status(404).json({ error: "Waqf record not found" });
    }

    res.json(waqf);
  } catch (e: any) {
    res.status(500).json({ error: "Failed to fetch waqf record" });
  }
});

// Create new waqf record
app.post("/waqf", (req, res) => {
  const { 
    waqf_gov_id, 
    waqf_name, 
    waqf_type, 
    authorized_national_ids, 
    asset_kind, 
    asset_label, 
    corpus_usd, 
    last_year_profit_usd 
  } = req.body;

  // Validation
  if (!waqf_gov_id || !waqf_name || !waqf_type || !authorized_national_ids || !asset_kind) {
    return res.status(400).json({ 
      error: "waqf_gov_id, waqf_name, waqf_type, authorized_national_ids, and asset_kind are required" 
    });
  }

  if (!['Charitable', 'Family', 'Joint'].includes(waqf_type)) {
    return res.status(400).json({ error: "waqf_type must be 'Charitable', 'Family', or 'Joint'" });
  }

  if (!['Property', 'Cash', 'Corporate'].includes(asset_kind)) {
    return res.status(400).json({ error: "asset_kind must be 'Property', 'Cash', or 'Corporate'" });
  }

  try {
    const info = db.prepare(`
      INSERT INTO waqf (
        waqf_gov_id, waqf_name, waqf_type, authorized_national_ids, 
        asset_kind, asset_label, corpus_usd, last_year_profit_usd
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      waqf_gov_id, 
      waqf_name, 
      waqf_type, 
      authorized_national_ids, 
      asset_kind, 
      asset_label || null, 
      corpus_usd || 0, 
      last_year_profit_usd || null
    );

    res.status(201).json({ 
      message: "Waqf record created successfully",
      waqf_gov_id,
      asset_kind,
      asset_label: asset_label || null
    });
  } catch (e: any) {
    const msg = String(e?.message || "");
    if (msg.includes("UNIQUE constraint failed")) {
      return res.status(409).json({ error: "Waqf record with this combination already exists" });
    }
    res.status(500).json({ error: "Failed to create waqf record" });
  }
});

// Update waqf record
app.put("/waqf/:govId/:assetKind/:assetLabel", (req, res) => {
  const { govId, assetKind, assetLabel } = req.params;
  const { 
    waqf_name, 
    waqf_type, 
    authorized_national_ids, 
    corpus_usd, 
    last_year_profit_usd 
  } = req.body;

  try {
    const info = db.prepare(`
      UPDATE waqf 
      SET waqf_name = COALESCE(?, waqf_name),
          waqf_type = COALESCE(?, waqf_type),
          authorized_national_ids = COALESCE(?, authorized_national_ids),
          corpus_usd = COALESCE(?, corpus_usd),
          last_year_profit_usd = COALESCE(?, last_year_profit_usd)
      WHERE waqf_gov_id = ? AND asset_kind = ? AND asset_label = ?
    `).run(
      waqf_name, 
      waqf_type, 
      authorized_national_ids, 
      corpus_usd, 
      last_year_profit_usd,
      govId, 
      assetKind, 
      assetLabel
    );

    if (info.changes === 0) {
      return res.status(404).json({ error: "Waqf record not found" });
    }

    res.json({ message: "Waqf record updated successfully" });
  } catch (e: any) {
    res.status(500).json({ error: "Failed to update waqf record" });
  }
});

// Delete waqf record
app.delete("/waqf/:govId/:assetKind/:assetLabel", (req, res) => {
  const { govId, assetKind, assetLabel } = req.params;

  try {
    const info = db.prepare(`
      DELETE FROM waqf 
      WHERE waqf_gov_id = ? AND asset_kind = ? AND asset_label = ?
    `).run(govId, assetKind, assetLabel);

    if (info.changes === 0) {
      return res.status(404).json({ error: "Waqf record not found" });
    }

    res.json({ message: "Waqf record deleted successfully" });
  } catch (e: any) {
    res.status(500).json({ error: "Failed to delete waqf record" });
  }
});

// ------- BENEFICIARIES MANAGEMENT -------
// Get all beneficiaries for a waqf
app.get("/waqf/:govId/beneficiaries", (req, res) => {
  const { govId } = req.params;
  
  try {
    const beneficiaries = db.prepare(`
      SELECT b.*, w.waqf_name 
      FROM beneficiaries b
      JOIN waqf w ON b.waqf_gov_id = w.waqf_gov_id
      WHERE b.waqf_gov_id = ? AND b.is_active = 1
      ORDER BY b.created_at DESC
    `).all(govId);

    res.json(beneficiaries);
  } catch (e: any) {
    res.status(500).json({ error: "Failed to fetch beneficiaries" });
  }
});

// Get specific beneficiary
app.get("/beneficiaries/:id", (req, res) => {
  const { id } = req.params;
  
  try {
    const beneficiary = db.prepare(`
      SELECT b.*, w.waqf_name 
      FROM beneficiaries b
      JOIN waqf w ON b.wagf_gov_id = w.waqf_gov_id
      WHERE b.id = ?
    `).get(id);

    if (!beneficiary) {
      return res.status(404).json({ error: "Beneficiary not found" });
    }

    res.json(beneficiary);
  } catch (e: any) {
    res.status(500).json({ error: "Failed to fetch beneficiary" });
  }
});

// Create new beneficiary
app.post("/waqf/:govId/beneficiaries", (req, res) => {
  const { govId } = req.params;
  const { full_name, national_id, relation } = req.body;

  // Validation
  if (!full_name) {
    return res.status(400).json({ error: "full_name is required" });
  }

  // Check if waqf exists
  const waqf = db.prepare(`SELECT * FROM waqf WHERE waqf_gov_id = ?`).get(govId);
  if (!waqf) {
    return res.status(404).json({ error: "Waqf not found" });
  }

  try {
    const info = db.prepare(`
      INSERT INTO beneficiaries (waqf_gov_id, full_name, national_id, relation)
      VALUES (?, ?, ?, ?)
    `).run(govId, full_name, national_id || null, relation || null);

    res.status(201).json({ 
      message: "Beneficiary created successfully",
      beneficiaryId: info.lastInsertRowid
    });
  } catch (e: any) {
    res.status(500).json({ error: "Failed to create beneficiary" });
  }
});

// Update beneficiary
app.put("/beneficiaries/:id", (req, res) => {
  const { id } = req.params;
  const { full_name, national_id, relation, is_active } = req.body;

  try {
    const info = db.prepare(`
      UPDATE beneficiaries 
      SET full_name = COALESCE(?, full_name),
          national_id = COALESCE(?, national_id),
          relation = COALESCE(?, relation),
          is_active = COALESCE(?, is_active)
      WHERE id = ?
    `).run(full_name, national_id, relation, is_active, id);

    if (info.changes === 0) {
      return res.status(404).json({ error: "Beneficiary not found" });
    }

    res.json({ message: "Beneficiary updated successfully" });
  } catch (e: any) {
    res.status(500).json({ error: "Failed to update beneficiary" });
  }
});

// Delete beneficiary (soft delete by setting is_active = 0)
app.delete("/beneficiaries/:id", (req, res) => {
  const { id } = req.params;

  try {
    const info = db.prepare(`
      UPDATE beneficiaries 
      SET is_active = 0 
      WHERE id = ?
    `).run(id);

    if (info.changes === 0) {
      return res.status(404).json({ error: "Beneficiary not found" });
    }

    res.json({ message: "Beneficiary deactivated successfully" });
  } catch (e: any) {
    res.status(500).json({ error: "Failed to deactivate beneficiary" });
  }
});

// ------- DISTRIBUTION RULES MANAGEMENT -------
// Get all distribution rules for a waqf
app.get("/waqf/:govId/distribution-rules", (req, res) => {
  const { govId } = req.params;
  
  try {
    const rules = db.prepare(`
      SELECT dr.*, b.full_name as beneficiary_name, w.waqf_name
      FROM distribution_rules dr
      JOIN beneficiaries b ON dr.beneficiary_id = b.id
      JOIN waqf w ON dr.waqf_gov_id = w.waqf_gov_id
      WHERE dr.waqf_gov_id = ? 
        AND (dr.valid_to IS NULL OR dr.valid_to >= date('now'))
      ORDER BY dr.priority ASC, dr.created_at DESC
    `).all(govId);

    res.json(rules);
  } catch (e: any) {
    res.status(500).json({ error: "Failed to fetch distribution rules" });
  }
});

// Get specific distribution rule
app.get("/distribution-rules/:id", (req, res) => {
  const { id } = req.params;
  
  try {
    const rule = db.prepare(`
      SELECT dr.*, b.full_name as beneficiary_name, w.waqf_name
      FROM distribution_rules dr
      JOIN beneficiaries b ON dr.beneficiary_id = b.id
      JOIN waqf w ON dr.waqf_gov_id = w.waqf_gov_id
      WHERE dr.id = ?
    `).get(id);

    if (!rule) {
      return res.status(404).json({ error: "Distribution rule not found" });
    }

    res.json(rule);
  } catch (e: any) {
    res.status(500).json({ error: "Failed to fetch distribution rule" });
  }
});

// Create new distribution rule
app.post("/waqf/:govId/distribution-rules", (req, res) => {
  const { govId } = req.params;
  const { 
    beneficiary_id, 
    share_type, 
    share_value, 
    priority, 
    valid_from, 
    valid_to 
  } = req.body;

  // Validation
  if (!beneficiary_id || !share_type || share_value === undefined) {
    return res.status(400).json({ 
      error: "beneficiary_id, share_type, and share_value are required" 
    });
  }

  if (!['percent', 'fixed'].includes(share_type)) {
    return res.status(400).json({ error: "share_type must be 'percent' or 'fixed'" });
  }

  if (share_type === 'percent' && (share_value < 0 || share_value > 100)) {
    return res.status(400).json({ error: "Percent share_value must be between 0 and 100" });
  }

  if (share_type === 'fixed' && share_value < 0) {
    return res.status(400).json({ error: "Fixed share_value must be positive" });
  }

  // Check if waqf and beneficiary exist
  const waqf = db.prepare(`SELECT * FROM waqf WHERE waqf_gov_id = ?`).get(govId);
  if (!waqf) {
    return res.status(404).json({ error: "Waqf not found" });
  }

  const beneficiary = db.prepare(`
    SELECT * FROM beneficiaries 
    WHERE id = ? AND waqf_gov_id = ? AND is_active = 1
  `).get(beneficiary_id, govId);
  if (!beneficiary) {
    return res.status(404).json({ error: "Beneficiary not found or inactive" });
  }

  // Check for overlapping rules (optional validation)
  if (share_type === 'percent') {
    const existingPercentTotal = db.prepare(`
      SELECT COALESCE(SUM(share_value), 0) as total
      FROM distribution_rules 
      WHERE wagf_gov_id = ? 
        AND share_type = 'percent'
        AND (valid_to IS NULL OR valid_to >= date('now'))
        AND id != COALESCE(?, -1)
    `).get(govId, req.body.id || -1) as { total: number } | undefined;

    if (existingPercentTotal && existingPercentTotal.total + share_value > 100) {
      return res.status(400).json({ 
        error: `Total percent shares would exceed 100%. Current total: ${existingPercentTotal.total}%` 
      });
    }
  }

  try {
    const info = db.prepare(`
      INSERT INTO distribution_rules (
        waqf_gov_id, beneficiary_id, share_type, share_value, 
        priority, valid_from, valid_to
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      govId, 
      beneficiary_id, 
      share_type, 
      share_value, 
      priority || 100, 
      valid_from || new Date().toISOString().split('T')[0], 
      valid_to || null
    );

    res.status(201).json({ 
      message: "Distribution rule created successfully",
      ruleId: info.lastInsertRowid
    });
  } catch (e: any) {
    res.status(500).json({ error: "Failed to create distribution rule" });
  }
});

// Update distribution rule
app.put("/distribution-rules/:id", (req, res) => {
  const { id } = req.params;
  const { 
    share_type, 
    share_value, 
    priority, 
    valid_from, 
    valid_to 
  } = req.body;

  // Validation
  if (share_type && !['percent', 'fixed'].includes(share_type)) {
    return res.status(400).json({ error: "share_type must be 'percent' or 'fixed'" });
  }

  if (share_value !== undefined) {
    if (share_type === 'percent' && (share_value < 0 || share_value > 100)) {
      return res.status(400).json({ error: "Percent share_value must be between 0 and 100" });
    }
    if (share_type === 'fixed' && share_value < 0) {
      return res.status(400).json({ error: "Fixed share_value must be positive" });
    }
  }

  try {
    const info = db.prepare(`
      UPDATE distribution_rules 
      SET share_type = COALESCE(?, share_type),
          share_value = COALESCE(?, share_value),
          priority = COALESCE(?, priority),
          valid_from = COALESCE(?, valid_from),
          valid_to = COALESCE(?, valid_to)
      WHERE id = ?
    `).run(share_type, share_value, priority, valid_from, valid_to, id);

    if (info.changes === 0) {
      return res.status(404).json({ error: "Distribution rule not found" });
    }

    res.json({ message: "Distribution rule updated successfully" });
  } catch (e: any) {
    res.status(500).json({ error: "Failed to update distribution rule" });
  }
});

// Delete distribution rule
app.delete("/distribution-rules/:id", (req, res) => {
  const { id } = req.params;

  try {
    const info = db.prepare(`
      DELETE FROM distribution_rules 
      WHERE id = ?
    `).run(id);

    if (info.changes === 0) {
      return res.status(404).json({ error: "Distribution rule not found" });
    }

    res.json({ message: "Distribution rule deleted successfully" });
  } catch (e: any) {
    res.status(500).json({ error: "Failed to delete distribution rule" });
  }
});

// ------- PROFIT ALLOCATION PREVIEW -------
// Preview how profits would be distributed
app.post("/waqf/:govId/profit-preview", (req, res) => {
  const { govId } = req.params;
  const { profit_amount, currency = 'USD' } = req.body;

  // Validation
  if (!profit_amount || profit_amount <= 0) {
    return res.status(400).json({ error: "profit_amount must be a positive number" });
  }

  try {
    // Get waqf info
    const waqf = db.prepare(`
      SELECT waqf_gov_id, waqf_name, asset_kind, asset_label
      FROM waqf 
      WHERE waqf_gov_id = ?
    `).get(govId) as {
      waqf_gov_id: number;
      waqf_name: string;
      asset_kind: string;
      asset_label: string;
    } | undefined;

    if (!waqf) {
      return res.status(404).json({ error: "Waqf not found" });
    }

    // Get all active beneficiaries for this waqf
    const beneficiaries = db.prepare(`
      SELECT b.id, b.full_name, b.relation, b.national_id
      FROM beneficiaries b
      WHERE b.waqf_gov_id = ? AND b.is_active = 1
      ORDER BY b.id
    `).all(govId) as Array<{
      id: number;
      full_name: string;
      relation: string;
      national_id: string;
    }>;

    // Get distribution rules for this waqf
    const rules = db.prepare(`
      SELECT dr.beneficiary_id, dr.share_type, dr.share_value, dr.priority
      FROM distribution_rules dr
      WHERE dr.waqf_gov_id = ? 
        AND (dr.valid_to IS NULL OR dr.valid_to >= date('now'))
      ORDER BY dr.priority ASC
    `).all(govId) as Array<{
      beneficiary_id: number;
      share_type: string;
      share_value: number;
      priority: number;
    }>;

    if (rules.length === 0) {
      return res.status(400).json({ error: "No distribution rules found for this waqf" });
    }

    // Calculate allocations
    const allocations = [];
    let totalAllocated = 0;

    for (const rule of rules) {
      const beneficiary = beneficiaries.find(b => b.id === rule.beneficiary_id);
      if (!beneficiary) continue;

      let amount = 0;
      if (rule.share_type === 'percent') {
        amount = (profit_amount * rule.share_value) / 100;
      } else if (rule.share_type === 'fixed') {
        amount = Math.min(rule.share_value, profit_amount - totalAllocated);
      }

      allocations.push({
        beneficiary_id: beneficiary.id,
        beneficiary_name: beneficiary.full_name,
        relation: beneficiary.relation,
        national_id: beneficiary.national_id,
        share_type: rule.share_type,
        share_value: rule.share_value,
        allocated_amount: Math.round(amount * 100) / 100, // Round to 2 decimal places
        percentage_of_profit: Math.round((amount / profit_amount) * 10000) / 100 // Round to 2 decimal places
      });

      totalAllocated += amount;
    }

    // Calculate summary
    const summary = {
      waqf_gov_id: waqf.waqf_gov_id,
      waqf_name: waqf.waqf_name,
      profit_amount: profit_amount,
      currency: currency,
      total_allocated: Math.round(totalAllocated * 100) / 100,
      remaining_amount: Math.round((profit_amount - totalAllocated) * 100) / 100,
      allocation_count: allocations.length,
      total_percentage_allocated: Math.round((totalAllocated / profit_amount) * 10000) / 100
    };

    res.json({
      summary,
      allocations
    });

  } catch (e: any) {
    res.status(500).json({ error: "Failed to calculate profit allocation" });
  }
});

// Get profit history for a waqf
app.get("/waqf/:govId/profits", (req, res) => {
  const { govId } = req.params;
  
  try {
    const profits = db.prepare(`
      SELECT p.*, w.waqf_name
      FROM profits p
      JOIN waqf w ON p.waqf_gov_id = w.waqf_gov_id
      WHERE p.waqf_gov_id = ?
      ORDER BY p.profit_period_start DESC
    `).all(govId);

    res.json(profits);
  } catch (e: any) {
    res.status(500).json({ error: "Failed to fetch profit history" });
  }
});

// ------- HEALTH + ROOT -------
app.get("/", (_req, res) =>
  res.type("text/plain").send("Awqaf Tracker API is running. Try GET /health")
);
app.get("/health", (_req, res) => res.json({ status: "ok" }));


// ------- DASHBOARD -------
app.get("/waqf/:id/summary", (req, res) => {
  const { id } = req.params;
  
  try {
    // Get waqf basic info
    const waqf = db.prepare(`
      SELECT waqf_gov_id, waqf_name, corpus_usd, last_year_profit_usd, created_at
      FROM waqf 
      WHERE waqf_gov_id = ?
    `).get(id) as {
      waqf_gov_id: number;
      waqf_name: string;
      corpus_usd: number;
      last_year_profit_usd: number | null;
      created_at: string;
    } | undefined;

    if (!waqf) {
      return res.status(404).json({ error: "Waqf not found" });
    }

    // Get total beneficiaries count
    const beneficiaryCount = db.prepare(`
      SELECT COUNT(*) as count
      FROM beneficiaries 
      WHERE waqf_gov_id = ? AND is_active = 1
    `).get(id) as { count: number };

    // Get total distribution rules count
    const distributionRulesCount = db.prepare(`
      SELECT COUNT(*) as count
      FROM distribution_rules 
      WHERE waqf_gov_id = ? AND (valid_to IS NULL OR valid_to >= date('now'))
    `).get(id) as { count: number };

    // Get total payouts amount
    const totalPayouts = db.prepare(`
      SELECT COALESCE(SUM(amount_usd), 0) as total
      FROM payouts 
      WHERE waqf_gov_id = ? AND status = 'completed'
    `).get(id) as { total: number };

    // Get current year profit
    const currentYearProfit = db.prepare(`
      SELECT COALESCE(SUM(profit_amount), 0) as total
      FROM profits 
      WHERE waqf_gov_id = ? 
        AND profit_period_start >= date('now', 'start of year')
        AND status = 'pending'
    `).get(id) as { total: number };

    // Get this month's payouts
    const thisMonthPayouts = db.prepare(`
      SELECT COALESCE(SUM(amount_usd), 0) as total
      FROM payouts 
      WHERE waqf_gov_id = ? 
        AND payout_date >= date('now', 'start of month')
        AND status = 'completed'
    `).get(id) as { total: number };

    // Get this month's profits
    const thisMonthProfits = db.prepare(`
      SELECT COALESCE(SUM(profit_amount), 0) as total
      FROM profits 
      WHERE waqf_gov_id = ? 
        AND profit_period_start >= date('now', 'start of month')
        AND status IN ('allocated', 'distributed')
    `).get(id) as { total: number };

    res.json({
      waqfId: waqf.waqf_gov_id,
      waqfName: waqf.waqf_name,
      totals: {
        corpus: waqf.corpus_usd,
        lastYearProfit: waqf.last_year_profit_usd || 0,
        totalPayouts: totalPayouts.total,
        beneficiaries: beneficiaryCount.count,
        distributionRules: distributionRulesCount.count
      },
      month: {
        inflow: thisMonthProfits.total,
        outflow: thisMonthPayouts.total
      },
      pending: {
        currentYearProfit: currentYearProfit.total
      }
    });
  } catch (e: any) {
    res.status(500).json({ error: "Failed to fetch waqf summary" });
  }
});

// ------- PAYOUTS MANAGEMENT -------
// List payouts for a waqf (filters: status, from, to)
app.get("/waqf/:govId/payouts", (req, res) => {
  const { govId } = req.params;
  const { status, from, to } = req.query as Record<string, string | undefined>;

  try {
    const clauses: string[] = ["p.waqf_gov_id = ?"]; 
    const params: any[] = [govId];

    if (status) {
      clauses.push("p.status = ?");
      params.push(status);
    }
    if (from) {
      clauses.push("p.payout_date >= ?");
      params.push(from);
    }
    if (to) {
      clauses.push("p.payout_date <= ?");
      params.push(to);
    }

    const sql = `
      SELECT p.*, b.full_name AS beneficiary_name, w.waqf_name
      FROM payouts p
      LEFT JOIN beneficiaries b ON p.beneficiary_id = b.id
      LEFT JOIN waqf w ON p.waqf_gov_id = w.waqf_gov_id
      WHERE ${clauses.join(" AND ")}
      ORDER BY p.payout_date DESC, p.created_at DESC
    `;

    const rows = db.prepare(sql).all(...params);
    res.json(rows);
  } catch (e: any) {
    res.status(500).json({ error: "Failed to fetch payouts" });
  }
});

// Get payout by id
app.get("/payouts/:id", (req, res) => {
  const { id } = req.params;
  try {
    const row = db.prepare(`
      SELECT p.*, b.full_name AS beneficiary_name, w.waqf_name
      FROM payouts p
      LEFT JOIN beneficiaries b ON p.beneficiary_id = b.id
      LEFT JOIN waqf w ON p.waqf_gov_id = w.waqf_gov_id
      WHERE p.id = ?
    `).get(id);
    if (!row) return res.status(404).json({ error: "Payout not found" });
    res.json(row);
  } catch (e: any) {
    res.status(500).json({ error: "Failed to fetch payout" });
  }
});

// Create payout
app.post("/payouts", (req, res) => {
  const {
    waqf_gov_id,
    asset_kind,
    asset_label,
    beneficiary_id,
    distribution_rule_id,
    amount_usd,
    payout_method,
    status,
    reference_number,
    payout_date,
    iban,
    bank_name,
    account_holder_name,
    notes
  } = req.body || {};

  // Basic validation
  if (!waqf_gov_id || !asset_kind || beneficiary_id == null || !amount_usd) {
    return res.status(400).json({ error: "waqf_gov_id, asset_kind, beneficiary_id, amount_usd are required" });
  }
  if (Number(amount_usd) <= 0) {
    return res.status(400).json({ error: "amount_usd must be positive" });
  }
  if (payout_method && !["Bank Transfer","Cash","Check","Digital Wallet"].includes(String(payout_method))) {
    return res.status(400).json({ error: "Invalid payout_method" });
  }
  if (status && !["pending","completed","failed","cancelled"].includes(String(status))) {
    return res.status(400).json({ error: "Invalid status" });
  }

  try {
    // Validate waqf (composite key)
    const waqf = db.prepare(`
      SELECT 1 FROM waqf WHERE waqf_gov_id = ? AND asset_kind = ? AND asset_label IS ?
    `).get(waqf_gov_id, asset_kind, asset_label ?? null) as { 1: number } | undefined;
    if (!waqf) {
      return res.status(404).json({ error: "Waqf record not found (gov_id, asset_kind, asset_label)" });
    }

    // Validate beneficiary belongs to this waqf_gov_id and is active
    const beneficiary = db.prepare(`
      SELECT id, iban, bank_name, account_holder_name
      FROM beneficiaries
      WHERE id = ? AND waqf_gov_id = ? AND is_active = 1
    `).get(beneficiary_id, waqf_gov_id) as {
      id: number;
      iban: string | null;
      bank_name: string | null;
      account_holder_name: string | null;
    } | undefined;
    if (!beneficiary) {
      return res.status(404).json({ error: "Beneficiary not found or inactive for this waqf" });
    }

    // Autofill bank fields from beneficiary if missing
    const finalIban = iban ?? beneficiary.iban ?? null;
    const finalBankName = bank_name ?? beneficiary.bank_name ?? null;
    const finalHolder = account_holder_name ?? beneficiary.account_holder_name ?? null;

    const info = db.prepare(`
      INSERT INTO payouts (
        waqf_gov_id, asset_kind, asset_label, beneficiary_id, distribution_rule_id,
        amount_usd, payout_date, payout_method, status, reference_number,
        notes, iban, bank_name, account_holder_name
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      waqf_gov_id,
      asset_kind,
      asset_label ?? null,
      beneficiary_id,
      distribution_rule_id ?? null,
      Number(amount_usd),
      payout_date ?? new Date().toISOString().slice(0,10),
      payout_method ?? "Bank Transfer",
      status ?? "pending",
      reference_number ?? null,
      notes ?? null,
      finalIban,
      finalBankName,
      finalHolder
    );

    return res.status(201).json({ message: "Payout created", payoutId: info.lastInsertRowid });
  } catch (e: any) {
    res.status(500).json({ error: "Failed to create payout" });
  }
});

// Update payout
app.put("/payouts/:id", (req, res) => {
  const { id } = req.params;
  const {
    amount_usd,
    payout_date,
    payout_method,
    status,
    reference_number,
    notes,
    iban,
    bank_name,
    account_holder_name,
    completed_at
  } = req.body || {};

  if (payout_method && !["Bank Transfer","Cash","Check","Digital Wallet"].includes(String(payout_method))) {
    return res.status(400).json({ error: "Invalid payout_method" });
  }
  if (status && !["pending","completed","failed","cancelled"].includes(String(status))) {
    return res.status(400).json({ error: "Invalid status" });
  }
  if (amount_usd !== undefined && Number(amount_usd) < 0) {
    return res.status(400).json({ error: "amount_usd must be >= 0" });
  }

  try {
    const effectiveCompletedAt = (status === 'completed' && !completed_at)
      ? new Date().toISOString()
      : (completed_at ?? null);

    const info = db.prepare(`
      UPDATE payouts
      SET amount_usd = COALESCE(?, amount_usd),
          payout_date = COALESCE(?, payout_date),
          payout_method = COALESCE(?, payout_method),
          status = COALESCE(?, status),
          reference_number = COALESCE(?, reference_number),
          notes = COALESCE(?, notes),
          iban = COALESCE(?, iban),
          bank_name = COALESCE(?, bank_name),
          account_holder_name = COALESCE(?, account_holder_name),
          completed_at = COALESCE(?, completed_at)
      WHERE id = ?
    `).run(
      amount_usd,
      payout_date,
      payout_method,
      status,
      reference_number,
      notes,
      iban,
      bank_name,
      account_holder_name,
      effectiveCompletedAt,
      id
    );

    if (info.changes === 0) {
      return res.status(404).json({ error: "Payout not found" });
    }
    res.json({ message: "Payout updated" });
  } catch (e: any) {
    res.status(500).json({ error: "Failed to update payout" });
  }
});

// Cancel payout (soft delete)
app.delete("/payouts/:id", (req, res) => {
  const { id } = req.params;
  try {
    const info = db.prepare(`
      UPDATE payouts SET status = 'cancelled' WHERE id = ?
    `).run(id);
    if (info.changes === 0) {
      return res.status(404).json({ error: "Payout not found" });
    }
    res.json({ message: "Payout cancelled" });
  } catch (e: any) {
    res.status(500).json({ error: "Failed to cancel payout" });
  }
});

// ------- START SERVER -------
const PORT = Number(process.env.PORT || 4000);
app.listen(PORT, () => {
  console.log(`API running at http://localhost:${PORT}`);
});
