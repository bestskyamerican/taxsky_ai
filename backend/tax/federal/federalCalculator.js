// federalCalculator.js – IRS-Accurate 2024 Federal Tax Engine
// FIXED: SS taxability calculation, removed unused variable

/* ------------------------------------------------------
   2024 STANDARD DEDUCTIONS (IRS Rev. Proc. 2023-34)
------------------------------------------------------ */
const STD = {
  single: 14600,
  married_filing_jointly: 29200,
  married_filing_separately: 14600,
  head_of_household: 21900
};

/* ------------------------------------------------------
   2024 IRS TAX BRACKETS (IRS Rev. Proc. 2023-34)
------------------------------------------------------ */
const BRACKETS = {
  single: [
    [11600, 0.10],
    [47150, 0.12],
    [100525, 0.22],
    [191950, 0.24],
    [243725, 0.32],
    [609350, 0.35],
    [Infinity, 0.37]
  ],

  married_filing_jointly: [
    [23200, 0.10],
    [94300, 0.12],
    [201050, 0.22],
    [383900, 0.24],
    [487450, 0.32],
    [731200, 0.35],
    [Infinity, 0.37]
  ],

  married_filing_separately: [
    [11600, 0.10],
    [47150, 0.12],
    [100525, 0.22],
    [191950, 0.24],
    [243725, 0.32],
    [365600, 0.35],
    [Infinity, 0.37]
  ],

  head_of_household: [
    [16550, 0.10],
    [63100, 0.12],
    [100500, 0.22],
    [191950, 0.24],
    [243700, 0.32],
    [609350, 0.35],
    [Infinity, 0.37]
  ]
};

/* ------------------------------------------------------
   UTIL: SAFE GET FROM MAP OR OBJECT
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
  if (STD[v]) return v;
  return "single";
}

/* ------------------------------------------------------
   UTIL: EXTRACT AMOUNT (handles nested { amount: X })
------------------------------------------------------ */
function extractAmount(field) {
  if (!field) return 0;
  if (typeof field === 'number') return field;
  if (field.amount !== undefined) return Number(field.amount);
  return Number(field) || 0;
}

/* ------------------------------------------------------
   IRS TAX CALCULATION USING BRACKETS
------------------------------------------------------ */
function computeBracketTax(income, brackets) {
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
   SELF-EMPLOYMENT TAX (Schedule SE)
------------------------------------------------------ */
function computeSETax(necIncome) {
  if (necIncome <= 400) return 0;
  const seTaxable = necIncome * 0.9235;
  const socialSecurity = Math.min(seTaxable, 168600) * 0.124;
  const medicare = seTaxable * 0.029;
  return Math.round((socialSecurity + medicare) * 100) / 100;
}

/* ------------------------------------------------------
   CHILD TAX CREDIT (2024)
------------------------------------------------------ */
function computeChildTaxCredit(dependentCount, agi, filingStatus) {
  if (!dependentCount || dependentCount <= 0) return 0;
  
  // $2,000 per qualifying child under 17
  let credit = dependentCount * 2000;
  
  // Phase-out thresholds
  const threshold = filingStatus === 'married_filing_jointly' ? 400000 : 200000;
  
  if (agi > threshold) {
    const excess = Math.ceil((agi - threshold) / 1000) * 50;
    credit = Math.max(0, credit - excess);
  }
  
  return credit;
}

/* ------------------------------------------------------
   ✅ FIXED: SOCIAL SECURITY TAXABILITY (IRS Worksheet)
   Based on "provisional income" - can be 0%, 50%, or 85%
------------------------------------------------------ */
function computeTaxableSS(ssBenefits, otherIncome, filingStatus) {
  if (ssBenefits <= 0) return 0;
  
  // Provisional income = other income + 50% of SS benefits
  const provisionalIncome = otherIncome + (ssBenefits * 0.5);
  
  // Thresholds vary by filing status
  let threshold1, threshold2;
  if (filingStatus === 'married_filing_jointly') {
    threshold1 = 32000;
    threshold2 = 44000;
  } else if (filingStatus === 'married_filing_separately') {
    // MFS who lived with spouse: 0 thresholds (85% always taxable)
    threshold1 = 0;
    threshold2 = 0;
  } else {
    // Single, HOH, Qualifying Widow(er)
    threshold1 = 25000;
    threshold2 = 34000;
  }
  
  // Calculate taxable amount
  if (provisionalIncome <= threshold1) {
    return 0;  // 0% taxable
  } else if (provisionalIncome <= threshold2) {
    // Up to 50% taxable
    const taxable = Math.min(ssBenefits * 0.5, (provisionalIncome - threshold1) * 0.5);
    return Math.round(taxable);
  } else {
    // Up to 85% taxable
    const baseAmount = (threshold2 - threshold1) * 0.5;
    const additionalAmount = (provisionalIncome - threshold2) * 0.85;
    const taxable = Math.min(ssBenefits * 0.85, baseAmount + additionalAmount);
    return Math.round(taxable);
  }
}

/* ------------------------------------------------------
   MAIN ENTRY
------------------------------------------------------ */
export function calculateFederalTax(session) {
  const answers = session?.answers || new Map();
  const forms = session?.forms || new Map();

  // Helper to get from answers (Map or Object)
  const getAnswer = (key) => {
    if (answers instanceof Map) return answers.get(key);
    return answers[key];
  };

  // ✅ Filing status
  const filingStatus = normalizeStatus(getAnswer("filing_status"));
  const stdDeduction = STD[filingStatus];

  // -------------------------------
  // W-2 INCOME - CHECK ANSWERS FIRST, THEN FORMS
  // -------------------------------
  let w2Income = 0;
  let w2Withheld = 0;

  // PRIORITY 1: Check session.answers (where upload saves data)
  const answersWages = Number(getAnswer("total_wages")) || 0;
  const answersWithheld = Number(getAnswer("total_withheld")) || 0;
  
  if (answersWages > 0) {
    w2Income = answersWages;
    w2Withheld = answersWithheld;
    console.log("📊 Using answers data: wages=$" + w2Income + ", withheld=$" + w2Withheld);
  } else {
    // PRIORITY 2: Check session.forms.W2 (legacy format)
    const w2Data = safeGet(forms, "W2");
    
    if (Array.isArray(w2Data) && w2Data.length > 0) {
      // Sum all W-2s
      w2Data.forEach(form => {
        w2Income += extractAmount(form.wages_tips_other_comp) ||
                    extractAmount(form.wages) ||
                    extractAmount(form["Wages, Tips, Other Compensation"]) || 0;
        w2Withheld += extractAmount(form.federal_income_tax_withheld) ||
                      extractAmount(form["Federal Income Tax Withheld"]) || 0;
      });
    } else if (w2Data && typeof w2Data === 'object') {
      w2Income = extractAmount(w2Data.wages_tips_other_comp) ||
                 extractAmount(w2Data.wages) || 0;
      w2Withheld = extractAmount(w2Data.federal_income_tax_withheld) || 0;
    }
    
    // PRIORITY 3: Check individual answer fields
    if (w2Income === 0) {
      w2Income = Number(getAnswer("w2_income")) || 0;
    }
    if (w2Withheld === 0) {
      w2Withheld = Number(getAnswer("withholding")) || 0;
    }
    
    console.log("📊 Using forms data: wages=$" + w2Income + ", withheld=$" + w2Withheld);
  }

  // Also check spouse W-2 if MFJ
  if (filingStatus === 'married_filing_jointly') {
    const spouseWages = Number(getAnswer("spouse_total_wages")) || 0;
    const spouseWithheld = Number(getAnswer("spouse_total_withheld")) || 0;
    w2Income += spouseWages;
    w2Withheld += spouseWithheld;
    if (spouseWages > 0) {
      console.log("👫 Added spouse: wages=$" + spouseWages + ", withheld=$" + spouseWithheld);
    }
  }

  // -------------------------------
  // 1099-NEC (Self-Employment)
  // -------------------------------
  let necIncome = Number(getAnswer("total_self_employment")) || 0;
  
  if (necIncome === 0) {
    const necData = safeGet(forms, "1099-NEC");
    if (Array.isArray(necData)) {
      necData.forEach(form => {
        necIncome += extractAmount(form.nonemployee_compensation) || 0;
      });
    } else if (necData) {
      necIncome = extractAmount(necData.nonemployee_compensation) || 0;
    }
  }

  // -------------------------------
  // 1099-INT (Interest)
  // -------------------------------
  let interestIncome = Number(getAnswer("total_interest")) || 0;
  
  if (interestIncome === 0) {
    const intData = safeGet(forms, "1099-INT");
    if (Array.isArray(intData)) {
      intData.forEach(form => {
        interestIncome += extractAmount(form.interest_income) || 0;
      });
    } else if (intData) {
      interestIncome = extractAmount(intData.interest_income) || 0;
    }
  }

  // -------------------------------
  // 1099-DIV (Dividends)
  // -------------------------------
  let dividendIncome = Number(getAnswer("total_dividends")) || 0;

  // -------------------------------
  // Other Income
  // -------------------------------
  const retirementIncome = Number(getAnswer("total_retirement")) || 0;
  const unemploymentIncome = Number(getAnswer("total_unemployment")) || 0;
  const socialSecurityBenefits = Number(getAnswer("total_social_security")) || 0;
  
  // ✅ FIXED: Calculate other income BEFORE SS taxability
  const otherIncomeBeforeSS = w2Income + necIncome + interestIncome + dividendIncome + 
                              retirementIncome + unemploymentIncome;
  
  // ✅ FIXED: Use proper SS taxability calculation
  const taxableSS = computeTaxableSS(socialSecurityBenefits, otherIncomeBeforeSS, filingStatus);

  // -------------------------------
  // TOTAL INCOME
  // -------------------------------
  const totalIncome = otherIncomeBeforeSS + taxableSS;

  // -------------------------------
  // ADJUSTMENTS (Above-the-line deductions)
  // -------------------------------
  const studentLoanInterest = Math.min(Number(getAnswer("student_loan_interest")) || 0, 2500);
  const hsaContribution = Number(getAnswer("hsa_contribution")) || 0;
  const iraContribution = Number(getAnswer("ira_contribution")) || 0;
  const seHealthInsurance = Number(getAnswer("se_health_insurance")) || 0;
  const seTaxDeduction = necIncome > 0 ? computeSETax(necIncome) / 2 : 0;
  
  const totalAdjustments = studentLoanInterest + hsaContribution + iraContribution + 
                           seHealthInsurance + seTaxDeduction;
  
  const agi = totalIncome - totalAdjustments;

  // -------------------------------
  // DEDUCTIONS (Standard vs Itemized)
  // -------------------------------
  const deductionType = getAnswer("deduction_type") || "standard";
  let deduction = stdDeduction;
  
  if (deductionType === "itemized") {
    const mortgageInterest = Number(getAnswer("mortgage_interest")) || 0;
    const saltDeduction = Math.min(Number(getAnswer("state_local_taxes")) || 0, 10000);
    const charitableDonations = Number(getAnswer("charitable_donations")) || 0;
    const medicalExpenses = Number(getAnswer("medical_expenses")) || 0;
    const medicalDeduction = Math.max(0, medicalExpenses - (agi * 0.075));
    
    const itemizedTotal = mortgageInterest + saltDeduction + charitableDonations + medicalDeduction;
    
    if (itemizedTotal > stdDeduction) {
      deduction = itemizedTotal;
    }
  }

  // -------------------------------
  // TAXABLE INCOME
  // -------------------------------
  const taxableIncome = Math.max(0, agi - deduction);

  // -------------------------------
  // FEDERAL TAX FROM BRACKETS
  // -------------------------------
  const taxFromBrackets = computeBracketTax(taxableIncome, BRACKETS[filingStatus]);

  // -------------------------------
  // SELF-EMPLOYMENT TAX
  // -------------------------------
  const seTax = computeSETax(necIncome);

  // -------------------------------
  // CREDITS - COUNT ONLY CHILDREN UNDER 17 FOR CTC
  // -------------------------------
  const dependentCount = parseInt(getAnswer("dependent_count")) || 0;
  
  // Count only dependents under 17 for Child Tax Credit
  let ctcEligibleCount = 0;
  for (let i = 1; i <= 4; i++) {
    const under17 = getAnswer(`dependent_${i}_under_17`);
    const age = getAnswer(`dependent_${i}_age`);
    const name = getAnswer(`dependent_${i}_name`);
    
    // Skip if no dependent in this slot
    if (!name && !under17 && !age) continue;
    
    // Check if under 17
    if (under17 === 'yes' || under17 === true) {
      ctcEligibleCount++;
    } else if (age && parseInt(age) < 17) {
      ctcEligibleCount++;
    } else if (under17 === 'no' || (age && parseInt(age) >= 17)) {
      // Explicitly NOT eligible
      continue;
    } else if (name && !under17 && !age) {
      // Has name but no age info - assume eligible for backward compatibility
      ctcEligibleCount++;
    }
  }
  
  // If no specific age info but has dependents, use dependent_count (backward compatibility)
  if (ctcEligibleCount === 0 && dependentCount > 0) {
    let hasAgeInfo = false;
    for (let i = 1; i <= 4; i++) {
      if (getAnswer(`dependent_${i}_under_17`) || getAnswer(`dependent_${i}_age`)) {
        hasAgeInfo = true;
        break;
      }
    }
    if (!hasAgeInfo) {
      ctcEligibleCount = dependentCount;
    }
  }
  
  console.log(`👶 CTC Eligible: ${ctcEligibleCount} out of ${dependentCount} dependents`);
  
  const childTaxCredit = computeChildTaxCredit(ctcEligibleCount, agi, filingStatus);
  
  // Total tax before credits
  const totalTaxBeforeCredits = taxFromBrackets + seTax;
  
  // Apply non-refundable credits (limited to tax owed)
  const nonRefundableCredits = Math.min(childTaxCredit, taxFromBrackets);
  
  // Calculate refundable portion of CTC (up to $1,700 per CTC-eligible child in 2024)
  const refundableCTC = Math.min(ctcEligibleCount * 1700, Math.max(0, childTaxCredit - nonRefundableCredits));

  // -------------------------------
  // TOTAL TAX OWED
  // -------------------------------
  const totalTaxOwed = Math.max(0, totalTaxBeforeCredits - nonRefundableCredits);

  // -------------------------------
  // TOTAL PAYMENTS
  // -------------------------------
  const estimatedPayments = Number(getAnswer("estimated_payments")) || 0;
  const totalPayments = w2Withheld + estimatedPayments + refundableCTC;

  // -------------------------------
  // ESTIMATED REFUND
  // -------------------------------
  const estimatedRefund = Math.round((totalPayments - totalTaxOwed) * 100) / 100;

  // -------------------------------
  // LOGGING
  // -------------------------------
  console.log("📊 Tax Calculation:", {
    filingStatus,
    w2Income,
    necIncome,
    interestIncome,
    socialSecurityBenefits,
    taxableSS,
    totalIncome,
    agi,
    standardDeduction: deduction,
    taxableIncome,
    federalTax: taxFromBrackets,
    seTax,
    childTaxCredit,
    totalTaxOwed,
    withholding: w2Withheld,
    estimatedRefund
  });

  // -------------------------------
  // RETURN RESULT
  // -------------------------------
  return {
    filingStatus,
    totalIncome,
    agi,
    standardDeduction: deduction,
    taxableIncome,
    federalTax: taxFromBrackets,
    seTax,
    childTaxCredit,
    totalTaxOwed,
    withholding: w2Withheld,
    totalPayments,
    estimatedRefund,
    // Additional details
    details: {
      w2Income,
      necIncome,
      interestIncome,
      dividendIncome,
      socialSecurityBenefits,
      taxableSS,
      adjustments: totalAdjustments,
      dependentCount,
      ctcEligibleCount
    }
  };
}