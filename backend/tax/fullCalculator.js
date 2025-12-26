// ============================================================
// FULL TAX CALCULATOR
// ============================================================
// Location: C:\ai_tax\backend\tax\fullCalculator.js
// Exports: calculateFullTax, getQuickEstimate
// ✅ FIXED: Returns FLAT fields for Dashboard compatibility
// ============================================================

import { calculateFederalTax } from "./federal/federalCalculator.js";
import { calculateCalifornia } from "./state/californiaEngine.js";

// ============================================================
// CALCULATE FULL TAX (Federal + State)
// ✅ FIXED: Returns both nested AND flat fields
// ============================================================
export function calculateFullTax(session, state = 'CA') {
  // Federal Tax
  let federal;
  try {
    federal = calculateFederalTax(session);
  } catch (err) {
    console.error("[fullCalculator] Federal error:", err.message);
    federal = {
      filingStatus: 'single',
      totalIncome: 0,
      agi: 0,
      standardDeduction: 14600,
      taxableIncome: 0,
      federalTax: 0,
      seTax: 0,
      childTaxCredit: 0,
      totalTaxOwed: 0,
      withholding: 0,
      totalPayments: 0,
      estimatedRefund: 0,
      details: {}
    };
  }

  // State Tax
  let stateResult = { state, supported: false, refund: 0, taxDue: 0 };
  
  if (state === 'CA') {
    try {
      stateResult = calculateCalifornia(session);
    } catch (err) {
      console.error("[fullCalculator] CA error:", err.message);
    }
  }

  // Combine results
  const federalRefund = federal.estimatedRefund > 0 ? federal.estimatedRefund : 0;
  const federalOwed = federal.estimatedRefund < 0 ? Math.abs(federal.estimatedRefund) : 0;
  const stateRefund = stateResult.refund || 0;
  const stateOwed = stateResult.taxDue || 0;

  console.log("💰 Tax Results:", {
    federalRefund,
    federalOwed,
    stateRefund,
    stateOwed
  });

  // ============================================================
  // ✅ FIXED: Return BOTH nested (backward compat) AND flat fields
  // ============================================================
  return {
    // Nested structure (for backward compatibility)
    federal: {
      ...federal,
      refund: federalRefund,
      taxDue: federalOwed
    },
    state: stateResult,
    
    // ✅ FLAT FIELDS FOR DASHBOARD
    // Federal
    totalIncome: federal.totalIncome || 0,
    agi: federal.agi || 0,
    taxableIncome: federal.taxableIncome || 0,
    standardDeduction: federal.standardDeduction || 14600,
    federalTax: federal.federalTax || 0,
    seTax: federal.seTax || 0,
    childTaxCredit: federal.childTaxCredit || 0,
    totalTaxOwed: federal.totalTaxOwed || 0,
    withholding: federal.withholding || 0,
    totalPayments: federal.totalPayments || 0,
    estimatedRefund: federal.estimatedRefund || 0,
    filingStatus: federal.filingStatus || 'single',
    
    // Federal refund/owed (flat)
    federalRefund: federalRefund,
    federalOwed: federalOwed,
    
    // State (flat)
    stateRefund: stateRefund,
    stateOwed: stateOwed,
    stateWithholding: stateResult.caWithholding || 0,
    
    // CA specific (flat)
    caAgi: stateResult.caAgi || 0,
    caStdDeduction: stateResult.caStdDeduction || 5540,
    caTaxableIncome: stateResult.caTaxableIncome || 0,
    caTax: stateResult.caTax || 0,
    caTaxOwed: stateResult.caTaxOwed || 0,
    caWithholding: stateResult.caWithholding || 0,
    calEitc: stateResult.calEitc || 0,
    yctc: stateResult.yctc || 0,
    renterCredit: stateResult.renterCredit || 0,
    
    // Totals (flat)
    totalRefund: federalRefund + stateRefund,
    totalTaxDue: federalOwed + stateOwed,
    
    // Status
    readyToFile: true
  };
}

// ============================================================
// QUICK ESTIMATE
// ============================================================
export function getQuickEstimate(session) {
  const result = calculateFullTax(session);
  return {
    federalRefund: result.federalRefund,
    federalOwed: result.federalOwed,
    stateRefund: result.stateRefund,
    stateOwed: result.stateOwed,
    totalRefund: result.totalRefund,
    totalOwed: result.totalTaxDue
  };
}

// Re-export for convenience
export { calculateFederalTax, calculateCalifornia };

export default { 
  calculateFullTax, 
  getQuickEstimate, 
  calculateFederalTax, 
  calculateCalifornia 
};