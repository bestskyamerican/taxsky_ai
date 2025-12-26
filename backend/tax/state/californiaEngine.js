// ==============================================================
// California Tax Engine – Form 540 (2024)
// FIXED: YCTC eligibility bug, refundable vs non-refundable credits
// ==============================================================

/* ------------------------------------------------------
   2024 CA STANDARD DEDUCTIONS
------------------------------------------------------ */
const CA_STD = {
  single: 5540,
  married_filing_jointly: 11080,
  married_filing_separately: 5540,
  head_of_household: 11080
};

/* ------------------------------------------------------
   2024 CA TAX BRACKETS
------------------------------------------------------ */
const CA_BRACKETS = {
  single: [
    [10412, 0.01],
    [24684, 0.02],
    [38959, 0.04],
    [54081, 0.06],
    [68350, 0.08],
    [349137, 0.093],
    [418961, 0.103],
    [698271, 0.113],
    [Infinity, 0.123]
  ],
  married_filing_jointly: [
    [20824, 0.01],
    [49368, 0.02],
    [77918, 0.04],
    [108162, 0.06],
    [136700, 0.08],
    [698274, 0.093],
    [837922, 0.103],
    [1396542, 0.113],
    [Infinity, 0.123]
  ],
  married_filing_separately: [
    [10412, 0.01],
    [24684, 0.02],
    [38959, 0.04],
    [54081, 0.06],
    [68350, 0.08],
    [349137, 0.093],
    [418961, 0.103],
    [698271, 0.113],
    [Infinity, 0.123]
  ],
  head_of_household: [
    [20839, 0.01],
    [49371, 0.02],
    [63644, 0.04],
    [78765, 0.06],
    [93037, 0.08],
    [474824, 0.093],
    [569790, 0.103],
    [949649, 0.113],
    [Infinity, 0.123]
  ]
};

/* ------------------------------------------------------
   UTIL: SAFE GET
------------------------------------------------------ */
function safeGet(map, key) {
  if (!map) return null;
  if (map instanceof Map) return map.get(key);
  return map[key];
}

/* ------------------------------------------------------
   UTIL: NORMALIZE FILING STATUS
------------------------------------------------------ */
function normalizeStatus(raw) {
  if (typeof raw !== "string") return "single";
  const v = raw.toLowerCase().replace(/\s+/g, "_");
  if (CA_STD[v]) return v;
  if (v === "mfj" || v === "married") return "married_filing_jointly";
  if (v === "mfs") return "married_filing_separately";
  if (v === "hoh") return "head_of_household";
  return "single";
}

/* ------------------------------------------------------
   CA TAX FROM BRACKETS
------------------------------------------------------ */
function computeCATax(income, filingStatus) {
  const brackets = CA_BRACKETS[filingStatus] || CA_BRACKETS.single;
  let remaining = income;
  let tax = 0;
  let lastLimit = 0;

  for (const [limit, rate] of brackets) {
    if (remaining <= 0) break;
    const taxablePart = Math.min(remaining, limit - lastLimit);
    tax += taxablePart * rate;
    remaining -= taxablePart;
    lastLimit = limit;
  }
  return Math.round(tax * 100) / 100;
}

/* ------------------------------------------------------
   CalEITC (California Earned Income Tax Credit)
   ✅ REFUNDABLE CREDIT
------------------------------------------------------ */
function computeCalEITC(earnedIncome, dependentCount, filingStatus) {
  // 2024 CalEITC income limits
  const limits = {
    0: 18591,
    1: 49084,
    2: 55768,
    3: 59899
  };
  
  const depKey = Math.min(dependentCount, 3);
  const maxLimit = limits[depKey] || limits[0];
  
  if (earnedIncome > maxLimit) return 0;
  if (earnedIncome <= 0) return 0;
  
  // 2024 Maximum CalEITC amounts
  const maxCredits = {
    0: 285,
    1: 1900,
    2: 3137,
    3: 3529
  };
  
  const maxCredit = maxCredits[depKey] || maxCredits[0];
  
  // Simplified CalEITC calculation
  const phaseInLimit = maxLimit * 0.3;
  const plateauEnd = maxLimit * 0.5;
  
  if (earnedIncome <= phaseInLimit) {
    return Math.round(maxCredit * (earnedIncome / phaseInLimit));
  } else if (earnedIncome <= plateauEnd) {
    return maxCredit;
  } else {
    const phaseOutRate = (earnedIncome - plateauEnd) / (maxLimit - plateauEnd);
    return Math.max(0, Math.round(maxCredit * (1 - phaseOutRate)));
  }
}

/* ------------------------------------------------------
   YCTC (Young Child Tax Credit)
   ✅ REFUNDABLE CREDIT
   ✅ FIXED: Only for children UNDER 6
------------------------------------------------------ */
function computeYCTC(hasChildUnder6, calEitcAmount) {
  // Must qualify for CalEITC AND have child under 6
  if (calEitcAmount <= 0) return 0;
  if (!hasChildUnder6) return 0;
  return 1117; // 2024 YCTC amount
}

/* ------------------------------------------------------
   Renter's Credit
   ⚠️ NON-REFUNDABLE CREDIT (can only reduce tax to $0)
------------------------------------------------------ */
function computeRenterCredit(filingStatus, agi, isRenter) {
  if (!isRenter) return 0;
  
  // 2024 AGI limits
  const limit = filingStatus === 'married_filing_jointly' ? 106734 : 53367;
  
  if (agi > limit) return 0;
  
  // Credit amount
  return filingStatus === 'married_filing_jointly' ? 120 : 60;
}

/* ------------------------------------------------------
   MAIN ENTRY - FIXED VERSION
------------------------------------------------------ */
export function calculateCalifornia(session) {
  if (!session) return emptyCA();

  const answers = session.answers || new Map();
  const forms = session.forms || new Map();

  // Helper to get from answers
  const getAnswer = (key) => {
    if (answers instanceof Map) return answers.get(key);
    return answers[key];
  };

  // ✅ Filing status
  const filingStatus = normalizeStatus(getAnswer("filing_status"));
  const caStdDeduction = CA_STD[filingStatus];

  // -------------------------------
  // INCOME - READ FROM session.answers FIRST
  // -------------------------------
  let wages = Number(getAnswer("total_wages")) || 0;
  let stateWithholding = Number(getAnswer("total_state_withheld")) || 0;
  
  // Add spouse wages if MFJ
  if (filingStatus === 'married_filing_jointly') {
    wages += Number(getAnswer("spouse_total_wages")) || 0;
    stateWithholding += Number(getAnswer("spouse_total_state_withheld")) || 0;
  }

  // Fallback to forms if no answers data
  if (wages === 0) {
    const w2Data = safeGet(forms, "W2");
    if (Array.isArray(w2Data)) {
      w2Data.forEach(w2 => {
        wages += Number(w2.state_wages || w2.wages_tips_other_comp || 0);
        stateWithholding += Number(w2.state_income_tax || 0);
      });
    }
  }

  const necIncome = Number(getAnswer("total_self_employment")) || 0;
  const interestIncome = Number(getAnswer("total_interest")) || 0;
  const dividendIncome = Number(getAnswer("total_dividends")) || 0;
  
  // Earned income for CalEITC (W-2 wages + self-employment)
  const earnedIncome = wages + necIncome;
  
  // Total income
  const totalIncome = wages + necIncome + interestIncome + dividendIncome;

  // -------------------------------
  // CA AGI
  // -------------------------------
  const caAgi = totalIncome;

  // -------------------------------
  // CA TAXABLE INCOME
  // -------------------------------
  const caTaxableIncome = Math.max(0, caAgi - caStdDeduction);

  // -------------------------------
  // CA TAX FROM BRACKETS
  // -------------------------------
  const caTax = computeCATax(caTaxableIncome, filingStatus);

  // -------------------------------
  // CREDITS - ✅ FIXED: Properly handle refundable vs non-refundable
  // -------------------------------
  const dependentCount = parseInt(getAnswer("dependent_count")) || 0;
  
  // ✅ FIXED: YCTC requires EXPLICIT child under 6
  // DO NOT assume dependentCount > 0 means child under 6!
  const hasChildUnder6 = getAnswer("has_child_under_6") === 'yes' || 
                         getAnswer("has_child_under_6") === true;
  
  const isRenter = getAnswer("is_renter") === 'yes' || 
                   getAnswer("is_renter") === true;

  // Calculate individual credits
  const calEitc = computeCalEITC(earnedIncome, dependentCount, filingStatus);
  const yctc = computeYCTC(hasChildUnder6, calEitc);
  const renterCredit = computeRenterCredit(filingStatus, caAgi, isRenter);

  // ✅ FIXED: Separate refundable from non-refundable
  const refundableCredits = calEitc + yctc;  // CAN create refund
  const nonRefundableCredits = renterCredit;  // Can only reduce tax to $0

  // Apply non-refundable credits first (limited to tax owed)
  const nonRefundableUsed = Math.min(nonRefundableCredits, caTax);
  const taxAfterNonRefundable = caTax - nonRefundableUsed;
  
  // Refundable credits can exceed tax and create refund
  const taxAfterAllCredits = Math.max(0, taxAfterNonRefundable - refundableCredits);
  const refundableCreditExcess = Math.max(0, refundableCredits - taxAfterNonRefundable);

  // Total credits actually applied
  const totalCredits = nonRefundableUsed + Math.min(refundableCredits, taxAfterNonRefundable) + refundableCreditExcess;

  // -------------------------------
  // CA TAX OWED
  // -------------------------------
  const caTaxOwed = taxAfterAllCredits;

  // -------------------------------
  // CA REFUND = Withholding - Tax Owed + Refundable Credit Excess
  // -------------------------------
  const caRefund = Math.round((stateWithholding - caTaxOwed + refundableCreditExcess) * 100) / 100;

  // -------------------------------
  // LOGGING
  // -------------------------------
  console.log("🌴 CA Tax Calculation:", {
    filingStatus,
    wages,
    totalIncome,
    caAgi,
    caStdDeduction,
    caTaxableIncome,
    caTax,
    calEitc,
    yctc,
    renterCredit,
    refundableCredits,
    nonRefundableCredits,
    stateWithholding,
    caTaxOwed,
    caRefund
  });

  // -------------------------------
  // RETURN RESULT
  // -------------------------------
  return {
    state: "CA",
    supported: true,
    caAgi,
    caTaxableIncome,
    caStdDeduction,
    caTax,
    caTaxOwed,
    caWithholding: stateWithholding,
    calEitc,
    yctc,
    renterCredit,
    totalCredits,
    refundableCredits,
    nonRefundableCredits,
    refund: caRefund > 0 ? caRefund : 0,
    taxDue: caRefund < 0 ? Math.abs(caRefund) : 0,
    details: {
      earnedIncome,
      dependentCount,
      hasChildUnder6
    },
    errors: []
  };
}

/* ------------------------------------------------------
   EMPTY RESULT
------------------------------------------------------ */
function emptyCA() {
  return {
    state: "CA",
    supported: true,
    caAgi: 0,
    caTaxableIncome: 0,
    caStdDeduction: 5540,
    caTax: 0,
    caTaxOwed: 0,
    caWithholding: 0,
    calEitc: 0,
    yctc: 0,
    renterCredit: 0,
    totalCredits: 0,
    refundableCredits: 0,
    nonRefundableCredits: 0,
    refund: 0,
    taxDue: 0,
    details: {},
    errors: []
  };
}