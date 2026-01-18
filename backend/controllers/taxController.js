// ============================================================
// TAX CONTROLLER — CALCULATION ONLY (NO CHAT, NO QUESTIONS)
// ============================================================

import { calculateFullTax } from "../tax/fullCalculator.js";
import { normalizeSession } from "../tax/normalizeSession.js";
import { getSession } from "../tax/sessionDB.js";

// ============================================================
// CALCULATE TAX (USED BY AI + CPA)
// ============================================================
export async function calculateTaxes(req, res) {
  try {
    const { userId, taxYear } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "Missing userId" });
    }

    const session = await getSession(userId);

    // Normalize data (W-2, 1099, dependents, filing status, etc.)
    const normalized = normalizeSession(session);

    // Run full tax engine
    const tax = calculateFullTax(normalized, taxYear || 2024);

    return res.json({
      success: true,
      tax
    });
  } catch (err) {
    console.error("❌ Tax calculation error:", err);
    return res.status(500).json({
      success: false,
      error: "Tax calculation failed"
    });
  }
}

// ============================================================
// GET REFUND / OWED SUMMARY
// ============================================================
export async function getTaxRefund(req, res) {
  try {
    const { userId, taxYear } = req.query;

    if (!userId) {
      return res.status(400).json({ error: "Missing userId" });
    }

    const session = await getSession(userId);
    const normalized = normalizeSession(session);
    const tax = calculateFullTax(normalized, taxYear || 2024);

    const refund =
      (tax.federalRefund || 0) -
      (tax.federalOwed || 0) +
      (tax.stateRefund || 0) -
      (tax.stateOwed || 0);

    return res.json({
      success: true,
      refund,
      tax
    });
  } catch (err) {
    console.error("❌ Refund error:", err);
    return res.status(500).json({
      success: false,
      error: "Refund calculation failed"
    });
  }
}
