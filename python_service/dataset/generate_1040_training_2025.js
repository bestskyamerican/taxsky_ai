// ============================================================
// TAXSKY FORM 1040 TRAINING DATA - 2025 TAX RULES
// ============================================================
// 
// PURPOSE: Train GPT to follow IRS Form 1040 structure exactly
// 
// FORM 1040 SECTIONS:
// 1. Filing Status (Lines 1-5)
// 2. Name, SSN, Address
// 3. Dependents
// 4. Income (Lines 1-9)
// 5. Adjustments (Schedule 1, Lines 10)
// 6. AGI (Line 11)
// 7. Deductions (Lines 12-14)
// 8. Taxable Income (Line 15)
// 9. Tax & Credits (Lines 16-24)
// 10. Payments (Lines 25-33)
// 11. Refund/Amount Owed (Lines 34-38)
// 
// Run: node generate_1040_training_2025.js
// ============================================================

import fs from "fs";

const TAX_YEAR = 2025;
const OUTPUT_FILE = `taxsky_1040_training_${TAX_YEAR}.jsonl`;

// ============================================================
// 2025 IRS TAX RULES - OFFICIAL NUMBERS
// ============================================================
const IRS_2025 = {
  // ==========================================================
  // FILING STATUS & STANDARD DEDUCTION (Form 1040, Line 12)
  // ==========================================================
  filing_status: {
    single: {
      code: 1,
      name: "Single",
      standard_deduction: 15000,
      additional_65_blind: 1950
    },
    married_filing_jointly: {
      code: 2,
      name: "Married Filing Jointly",
      standard_deduction: 30000,
      additional_65_blind: 1550  // per person
    },
    married_filing_separately: {
      code: 3,
      name: "Married Filing Separately",
      standard_deduction: 15000,
      additional_65_blind: 1550
    },
    head_of_household: {
      code: 4,
      name: "Head of Household",
      standard_deduction: 22500,
      additional_65_blind: 1950
    },
    qualifying_surviving_spouse: {
      code: 5,
      name: "Qualifying Surviving Spouse",
      standard_deduction: 30000,
      additional_65_blind: 1550
    }
  },

  // ==========================================================
  // TAX BRACKETS 2025 (for Line 16 Tax calculation)
  // ==========================================================
  tax_brackets: {
    single: [
      { min: 0, max: 11925, rate: 0.10, base: 0 },
      { min: 11925, max: 48475, rate: 0.12, base: 1192.50 },
      { min: 48475, max: 103350, rate: 0.22, base: 5578.50 },
      { min: 103350, max: 197300, rate: 0.24, base: 17651 },
      { min: 197300, max: 250525, rate: 0.32, base: 40199 },
      { min: 250525, max: 626350, rate: 0.35, base: 57231 },
      { min: 626350, max: Infinity, rate: 0.37, base: 188769.75 }
    ],
    married_filing_jointly: [
      { min: 0, max: 23850, rate: 0.10, base: 0 },
      { min: 23850, max: 96950, rate: 0.12, base: 2385 },
      { min: 96950, max: 206700, rate: 0.22, base: 11157 },
      { min: 206700, max: 394600, rate: 0.24, base: 35302 },
      { min: 394600, max: 501050, rate: 0.32, base: 80398 },
      { min: 501050, max: 751600, rate: 0.35, base: 114462 },
      { min: 751600, max: Infinity, rate: 0.37, base: 202154.50 }
    ],
    married_filing_separately: [
      { min: 0, max: 11925, rate: 0.10, base: 0 },
      { min: 11925, max: 48475, rate: 0.12, base: 1192.50 },
      { min: 48475, max: 103350, rate: 0.22, base: 5578.50 },
      { min: 103350, max: 197300, rate: 0.24, base: 17651 },
      { min: 197300, max: 250525, rate: 0.32, base: 40199 },
      { min: 250525, max: 375800, rate: 0.35, base: 57231 },
      { min: 375800, max: Infinity, rate: 0.37, base: 101077.25 }
    ],
    head_of_household: [
      { min: 0, max: 17000, rate: 0.10, base: 0 },
      { min: 17000, max: 64850, rate: 0.12, base: 1700 },
      { min: 64850, max: 103350, rate: 0.22, base: 7442 },
      { min: 103350, max: 197300, rate: 0.24, base: 15912 },
      { min: 197300, max: 250500, rate: 0.32, base: 38460 },
      { min: 250500, max: 626350, rate: 0.35, base: 55484 },
      { min: 626350, max: Infinity, rate: 0.37, base: 187031.50 }
    ]
  },

  // ==========================================================
  // INCOME (Form 1040, Lines 1-9)
  // ==========================================================
  income_lines: {
    line_1a: "Total amount from Form(s) W-2, box 1",
    line_1b: "Household employee wages",
    line_1c: "Tip income",
    line_1d: "Medicaid waiver payments",
    line_1e: "Taxable dependent care benefits",
    line_1f: "Employer-provided adoption benefits",
    line_1g: "Wages from Form 8919",
    line_1h: "Other earned income",
    line_1i: "Nontaxable combat pay election",
    line_1z: "Total of lines 1a through 1h (Total Wages)",
    line_2a: "Tax-exempt interest",
    line_2b: "Taxable interest",
    line_3a: "Qualified dividends",
    line_3b: "Ordinary dividends",
    line_4a: "IRA distributions (total)",
    line_4b: "IRA distributions (taxable)",
    line_5a: "Pensions and annuities (total)",
    line_5b: "Pensions and annuities (taxable)",
    line_6a: "Social Security benefits (total)",
    line_6b: "Social Security benefits (taxable)",
    line_7: "Capital gain or loss",
    line_8: "Other income from Schedule 1",
    line_9: "TOTAL INCOME (add lines 1z, 2b, 3b, 4b, 5b, 6b, 7, 8)"
  },

  // ==========================================================
  // ADJUSTMENTS TO INCOME (Schedule 1, Part II)
  // ==========================================================
  adjustments: {
    educator_expenses: { limit: 300, description: "Educator expenses (max $300)" },
    hsa_deduction: { 
      individual: 4150, 
      family: 8300, 
      catch_up_55: 1000,
      description: "Health Savings Account deduction"
    },
    self_employment_tax: { rate: 0.5, description: "Deductible part of SE tax (50%)" },
    sep_simple_qualified: { description: "SEP, SIMPLE, and qualified plans" },
    self_employed_health: { description: "Self-employed health insurance" },
    penalty_early_withdrawal: { description: "Penalty on early withdrawal of savings" },
    alimony_paid: { description: "Alimony paid (pre-2019 agreements)" },
    ira_deduction: { 
      under_50: 7000, 
      over_50: 8000,
      description: "IRA deduction"
    },
    student_loan_interest: { 
      limit: 2500,
      phase_out_single: { start: 80000, end: 95000 },
      phase_out_mfj: { start: 165000, end: 195000 },
      description: "Student loan interest (max $2,500)"
    }
  },

  // ==========================================================
  // CREDITS (Form 1040, Lines 19-21)
  // ==========================================================
  credits: {
    child_tax_credit: {
      amount: 2000,
      max_age: 16,  // Must be UNDER 17
      refundable_max: 1700,  // ACTC refundable portion
      phase_out_single: 200000,
      phase_out_mfj: 400000,
      phase_out_rate: 50,  // $50 per $1000 over threshold
      description: "Child Tax Credit (CTC)"
    },
    other_dependents_credit: {
      amount: 500,
      description: "Credit for Other Dependents (ODC)"
    },
    earned_income_credit: {
      max_credit: { 0: 632, 1: 4213, 2: 6960, 3: 7830 },
      income_limit_single: { 0: 18591, 1: 49084, 2: 55768, 3: 59899 },
      income_limit_mfj: { 0: 25511, 1: 56004, 2: 62688, 3: 66819 },
      investment_income_limit: 11600,
      description: "Earned Income Credit (EITC)"
    },
    education_credits: {
      american_opportunity: { max: 2500, refundable: 1000 },
      lifetime_learning: { max: 2000, refundable: 0 },
      description: "Education Credits"
    },
    child_dependent_care: {
      max_expenses_1: 3000,
      max_expenses_2plus: 6000,
      max_rate: 0.35,
      description: "Child and Dependent Care Credit"
    },
    saver_credit: {
      max_contribution: 2000,
      rates: [0.50, 0.20, 0.10],
      description: "Retirement Savings Contribution Credit"
    }
  },

  // ==========================================================
  // OTHER LIMITS & RULES
  // ==========================================================
  other_rules: {
    salt_cap: 10000,  // State and Local Tax deduction cap
    mortgage_interest_limit: 750000,  // Acquisition debt limit
    charitable_cash_limit: 0.60,  // 60% of AGI for cash
    charitable_property_limit: 0.30,  // 30% of AGI for property
    medical_threshold: 0.075,  // 7.5% of AGI
    se_tax_rate: 0.153,  // 15.3% (12.4% SS + 2.9% Medicare)
    ss_wage_base: 176100,  // Social Security wage base 2025
    additional_medicare: { threshold_single: 200000, threshold_mfj: 250000, rate: 0.009 }
  },

  // ==========================================================
  // CALIFORNIA STATE TAX (Example)
  // ==========================================================
  california: {
    standard_deduction: {
      single: 5540,
      married_filing_jointly: 11080,
      head_of_household: 11080
    },
    brackets_single: [
      { min: 0, max: 10412, rate: 0.01 },
      { min: 10412, max: 24684, rate: 0.02 },
      { min: 24684, max: 38959, rate: 0.04 },
      { min: 38959, max: 54081, rate: 0.06 },
      { min: 54081, max: 68350, rate: 0.08 },
      { min: 68350, max: 349137, rate: 0.093 },
      { min: 349137, max: 418961, rate: 0.103 },
      { min: 418961, max: 698271, rate: 0.113 },
      { min: 698271, max: Infinity, rate: 0.123 }
    ],
    mental_health_tax: { threshold: 1000000, rate: 0.01 }
  }
};

// ============================================================
// SYSTEM PROMPT - FORM 1040 BASED
// ============================================================
const SYSTEM_PROMPT = `You are TaxSky CPA Assistant. You help users file Form 1040 for tax year ${TAX_YEAR}.

## FORM 1040 STRUCTURE YOU FOLLOW:

### PART 1: FILING STATUS (Check one)
□ Single
□ Married Filing Jointly (MFJ)
□ Married Filing Separately (MFS)
□ Head of Household (HOH)
□ Qualifying Surviving Spouse (QSS)

### PART 2: INCOME (Lines 1-9)
Line 1z: Wages, salaries, tips (W-2 Box 1)
Line 2b: Taxable interest (1099-INT)
Line 3b: Ordinary dividends (1099-DIV)
Line 4b: IRA distributions (taxable)
Line 5b: Pensions/annuities (taxable)
Line 6b: Social Security (taxable portion)
Line 7: Capital gain/loss (Schedule D)
Line 8: Other income (Schedule 1)
**Line 9: TOTAL INCOME**

### PART 3: ADJUSTMENTS (Schedule 1 → Line 10)
- IRA deduction ($${IRS_2025.adjustments.ira_deduction.under_50} / $${IRS_2025.adjustments.ira_deduction.over_50} if 50+)
- Student loan interest (max $${IRS_2025.adjustments.student_loan_interest.limit})
- HSA deduction ($${IRS_2025.adjustments.hsa_deduction.individual} ind / $${IRS_2025.adjustments.hsa_deduction.family} family)
- Self-employed deductions

**Line 11: AGI = Line 9 - Line 10**

### PART 4: DEDUCTIONS (Lines 12-15)
Line 12: Standard OR Itemized deduction
- Single: $${IRS_2025.filing_status.single.standard_deduction.toLocaleString()}
- MFJ: $${IRS_2025.filing_status.married_filing_jointly.standard_deduction.toLocaleString()}
- HOH: $${IRS_2025.filing_status.head_of_household.standard_deduction.toLocaleString()}

Line 13: Qualified business income deduction
Line 14: Total deductions (Line 12 + 13)
**Line 15: Taxable Income = Line 11 - Line 14**

### PART 5: TAX & CREDITS (Lines 16-24)
Line 16: Tax (from Tax Table or calculation)
Line 17: Amount from Schedule 2
Line 18: Total (Line 16 + 17)
Line 19: Child Tax Credit ($${IRS_2025.credits.child_tax_credit.amount}/child under 17)
Line 20: Other credits
Line 21: Total credits
Line 22: Tax minus credits
Line 23: Other taxes (Schedule 2)
**Line 24: TOTAL TAX**

### PART 6: PAYMENTS (Lines 25-33)
Line 25a: Federal tax withheld (W-2 Box 2)
Line 25b: Tax withheld (1099s)
Line 25c: Tax withheld (other)
Line 25d: Total withholding
Line 26: Estimated tax payments
Line 27: Earned Income Credit
Line 28: Additional Child Tax Credit
Line 29: American Opportunity Credit
Line 30: Reserved
Line 31: Other payments
Line 32: Total other payments
**Line 33: TOTAL PAYMENTS**

### PART 7: REFUND OR AMOUNT OWED
**Line 34: REFUND = Line 33 - Line 24** (if positive)
**Line 37: AMOUNT OWED = Line 24 - Line 33** (if positive)

## ${TAX_YEAR} TAX RULES:

CHILD TAX CREDIT:
- $${IRS_2025.credits.child_tax_credit.amount} per qualifying child
- Child must be UNDER 17 (age 16 or younger)
- Phase-out: $${IRS_2025.credits.child_tax_credit.phase_out_single.toLocaleString()} (Single), $${IRS_2025.credits.child_tax_credit.phase_out_mfj.toLocaleString()} (MFJ)

OTHER DEPENDENTS CREDIT:
- $${IRS_2025.credits.other_dependents_credit.amount} per dependent 17+

IRA LIMITS:
- Under 50: $${IRS_2025.adjustments.ira_deduction.under_50.toLocaleString()}
- 50 or older: $${IRS_2025.adjustments.ira_deduction.over_50.toLocaleString()}

STUDENT LOAN INTEREST:
- Maximum: $${IRS_2025.adjustments.student_loan_interest.limit.toLocaleString()}

## INTERVIEW RULES:
1. Follow Form 1040 order
2. ALWAYS confirm before proceeding
3. Show line numbers when relevant
4. Validate against ${TAX_YEAR} limits
5. Calculate running totals
6. Check for missing required fields`;

// ============================================================
// TRAINING EXAMPLES
// ============================================================
const examples = [];

// ------------------------------------------------------------
// WELCOME - FORM 1040 INTRODUCTION
// ------------------------------------------------------------
examples.push({
  user: "I want to file my taxes",
  assistant: `👋 Welcome to TaxSky! I'll help you complete your ${TAX_YEAR} Form 1040.

📋 **Form 1040 Sections:**
1. Filing Status
2. Income (W-2, 1099s)
3. Adjustments (IRA, Student Loan)
4. Deductions (Standard/Itemized)
5. Tax Calculation
6. Credits (Child Tax Credit)
7. Payments (Withholding)
8. Refund or Amount Owed

📤 **Let's start!** Upload your W-2 or tell me your filing status.`
});

examples.push({
  user: "help me file form 1040",
  assistant: `📋 **Form 1040 - U.S. Individual Income Tax Return (${TAX_YEAR})**

I'll guide you through each section:

**Section 1: Filing Status**
□ Single / MFJ / MFS / HOH / QSS

**Section 2: Income (Lines 1-9)**
□ Wages (Line 1z)
□ Interest (Line 2b)
□ Dividends (Line 3b)

**Section 3: Adjustments → AGI (Line 11)**
**Section 4: Deductions (Line 12)**
**Section 5: Tax & Credits (Lines 16-24)**
**Section 6: Payments & Refund (Lines 25-37)**

Let's begin! What is your **filing status**?`
});

// ------------------------------------------------------------
// FILING STATUS (Form 1040 Top Section)
// ------------------------------------------------------------
for (const [key, fs] of Object.entries(IRS_2025.filing_status)) {
  const inputs = [];
  if (key === "single") inputs.push("single", "I'm single", "not married");
  if (key === "married_filing_jointly") inputs.push("married filing jointly", "MFJ", "married joint", "filing jointly");
  if (key === "married_filing_separately") inputs.push("married filing separately", "MFS", "filing separately");
  if (key === "head_of_household") inputs.push("head of household", "HOH");
  if (key === "qualifying_surviving_spouse") inputs.push("qualifying widow", "widower", "surviving spouse");
  
  for (const input of inputs) {
    examples.push({
      user: input,
      assistant: `📋 **Form 1040 - Filing Status**

☑️ **${fs.name}**

• Standard Deduction (Line 12): **$${fs.standard_deduction.toLocaleString()}**
• Additional (65+ or blind): +$${fs.additional_65_blind.toLocaleString()}

Is this correct? (Yes / No)`
    });
  }
}

// Filing status confirmed
examples.push({
  user: "yes",
  context: "Confirmed MFJ filing status",
  assistant: `✅ **Filing Status:** Married Filing Jointly

📋 **Form 1040 Progress:**
☑️ Filing Status: MFJ
□ Income (Lines 1-9)
□ Adjustments (Line 10)
□ Deductions (Line 12)

---

👫 Since you're filing **jointly**, does your spouse have income?
• W-2 (wages)
• 1099 (freelance, interest, dividends)`
});

examples.push({
  user: "yes",
  context: "Confirmed Single filing status",
  assistant: `✅ **Filing Status:** Single

📋 **Form 1040 Progress:**
☑️ Filing Status: Single
□ Income (Lines 1-9)
□ Adjustments (Line 10)
□ Deductions (Line 12)

---

👶 **Dependents**

Do you have any dependents (children or qualifying relatives)?

_(Required for Child Tax Credit - Line 19)_`
});

// ------------------------------------------------------------
// SPOUSE INCOME (MFJ)
// ------------------------------------------------------------
examples.push({
  user: "yes my wife has income",
  assistant: `📤 **Spouse's W-2 Information**

Please provide for **Line 1z (Wages)**:
• Wages, tips, other compensation (Box 1)
• Federal income tax withheld (Box 2) → Line 25a

Upload W-2 or enter amounts.`
});

examples.push({
  user: "no spouse income",
  assistant: `✅ Spouse has no income.

📋 **Form 1040 - Line 1z (Wages):**
• Your wages: [pending]
• Spouse wages: $0

---

👶 **Dependents**

Do you have any dependents?
_(Needed for Line 19 - Child Tax Credit)_`
});

// ------------------------------------------------------------
// DEPENDENTS (For Schedule 8812 / Line 19)
// ------------------------------------------------------------
examples.push({
  user: "I have 2 kids",
  assistant: `📋 **Dependents for Form 1040**

• Number: **2 children**

To calculate **Line 19 (Child Tax Credit)**, I need each child's age.

**Child Tax Credit (${TAX_YEAR}):**
• $${IRS_2025.credits.child_tax_credit.amount.toLocaleString()} per child **under 17**
• $${IRS_2025.credits.other_dependents_credit.amount} per dependent **17 or older**

How old is **Child #1**?`
});

examples.push({
  user: "no dependents",
  assistant: `✅ **No dependents** - Line 19 will be $0.

📋 **Form 1040 Progress:**
☑️ Filing Status: [set]
☑️ Dependents: None
□ Income (Lines 1-9)

---

📊 **Income Section**

What income do you have?
• W-2 wages → Line 1z
• 1099-INT interest → Line 2b
• 1099-DIV dividends → Line 3b
• Other`
});

// ------------------------------------------------------------
// DEPENDENT AGES (Critical for Line 19 CTC)
// ------------------------------------------------------------
// Under 17 - Qualifies for CTC
for (let age = 0; age <= 16; age++) {
  examples.push({
    user: `${age}`,
    context: "Asking child age for CTC",
    assistant: `✅ **Child #1:** Age ${age}

✅ **Qualifies for Child Tax Credit** (Line 19)
• Credit: **$${IRS_2025.credits.child_tax_credit.amount.toLocaleString()}**
• Requirement: Under 17 ✓

Next child's age? Or type **"done"**.`
  });
}

// Exactly 17 - Does NOT qualify
examples.push({
  user: "17",
  context: "Asking child age",
  assistant: `✅ **Child:** Age 17

⚠️ **Does NOT qualify for Child Tax Credit** (Line 19)
• Reason: Must be **under 17** (age 16 or younger)

✅ **Qualifies for Other Dependents Credit**
• Credit: **$${IRS_2025.credits.other_dependents_credit.amount}** (Line 19)

Next dependent's age? Or type **"done"**.`
});

// 18+ - Does NOT qualify for CTC
examples.push({
  user: "19",
  context: "Asking dependent age",
  assistant: `✅ **Dependent:** Age 19

⚠️ **Does NOT qualify for Child Tax Credit**
• Reason: Age 17+ does not qualify

✅ **May qualify for Other Dependents Credit**
• Credit: $${IRS_2025.credits.other_dependents_credit.amount} (if still a qualifying dependent)

Any more dependents?`
});

// Natural language ages
examples.push({
  user: "my son is 10 years old",
  assistant: `✅ **Dependent #1:** Son, Age 10

✅ **Child Tax Credit** (Line 19): **$${IRS_2025.credits.child_tax_credit.amount.toLocaleString()}**

Next child's age?`
});

examples.push({
  user: "daughter is 16",
  assistant: `✅ **Dependent:** Daughter, Age 16

✅ **Child Tax Credit** (Line 19): **$${IRS_2025.credits.child_tax_credit.amount.toLocaleString()}**
_(Last year eligible - turns 17 next year)_

Any more dependents?`
});

// Dependent summary
examples.push({
  user: "done",
  context: "2 kids ages 10 and 14",
  assistant: `📋 **Form 1040 - Dependent Summary**

| Child | Age | Qualifies | Credit |
|-------|-----|-----------|--------|
| #1 | 10 | CTC ✅ | $${IRS_2025.credits.child_tax_credit.amount.toLocaleString()} |
| #2 | 14 | CTC ✅ | $${IRS_2025.credits.child_tax_credit.amount.toLocaleString()} |

**Line 19 - Child Tax Credit:** 2 × $${IRS_2025.credits.child_tax_credit.amount.toLocaleString()} = **$${(2 * IRS_2025.credits.child_tax_credit.amount).toLocaleString()}**

Is this correct? (Yes / No)`
});

examples.push({
  user: "done",
  context: "3 kids ages 8, 15, 18",
  assistant: `📋 **Form 1040 - Dependent Summary**

| Dependent | Age | Credit Type | Amount |
|-----------|-----|-------------|--------|
| Child #1 | 8 | CTC | $${IRS_2025.credits.child_tax_credit.amount.toLocaleString()} |
| Child #2 | 15 | CTC | $${IRS_2025.credits.child_tax_credit.amount.toLocaleString()} |
| Child #3 | 18 | ODC | $${IRS_2025.credits.other_dependents_credit.amount} |

**Line 19 Credits:**
• Child Tax Credit: 2 × $${IRS_2025.credits.child_tax_credit.amount.toLocaleString()} = **$${(2 * IRS_2025.credits.child_tax_credit.amount).toLocaleString()}**
• Other Dependents: 1 × $${IRS_2025.credits.other_dependents_credit.amount} = **$${IRS_2025.credits.other_dependents_credit.amount}**
• **Total: $${(2 * IRS_2025.credits.child_tax_credit.amount + IRS_2025.credits.other_dependents_credit.amount).toLocaleString()}**

Correct? (Yes / No)`
});

// ------------------------------------------------------------
// INCOME - LINE 1z (WAGES)
// ------------------------------------------------------------
examples.push({
  user: "my W-2 shows $75000 wages",
  assistant: `📋 **Form 1040 - Line 1z (Wages)**

• W-2 Box 1: **$75,000**

How much **federal tax was withheld**? (W-2 Box 2 → Line 25a)`
});

examples.push({
  user: "$85000 wages $12000 withheld",
  assistant: `📋 **Form 1040 - Please Confirm:**

**Line 1z (Wages):** $85,000
**Line 25a (Federal Withheld):** $12,000

Is this correct? (Yes / No)`
});

examples.push({
  user: "yes",
  context: "Confirmed W-2 wages and withholding",
  assistant: `✅ **Form 1040 Updated:**

**Income:**
• Line 1z (Wages): $85,000 ✓

**Payments:**
• Line 25a (Withheld): $12,000 ✓

---

Do you have additional W-2s or other income?
• Another W-2
• 1099-INT (interest) → Line 2b
• 1099-DIV (dividends) → Line 3b
• 1099-NEC (self-employment) → Schedule C
• None`
});

// Multiple W-2s
examples.push({
  user: "I have another W-2 with $45000",
  assistant: `📋 **Form 1040 - Second W-2**

• W-2 #2 Wages: **$45,000**

**Running Total (Line 1z):**
• W-2 #1: $85,000
• W-2 #2: $45,000
• **Total Wages: $130,000**

Federal withheld from W-2 #2? (Box 2)`
});

// ------------------------------------------------------------
// INCOME - LINE 2b (INTEREST)
// ------------------------------------------------------------
examples.push({
  user: "I have $500 interest income",
  assistant: `📋 **Form 1040 - Line 2b (Taxable Interest)**

• 1099-INT Interest: **$500**

Is this correct? (Yes / No)`
});

examples.push({
  user: "1099-INT shows $1200",
  assistant: `📋 **Form 1040 - Line 2b (Taxable Interest)**

• Interest Income: **$1,200**

_(From 1099-INT Box 1)_

Is this correct? (Yes / No)`
});

// ------------------------------------------------------------
// INCOME - LINE 3b (DIVIDENDS)
// ------------------------------------------------------------
examples.push({
  user: "I received $2000 in dividends",
  assistant: `📋 **Form 1040 - Dividend Income**

• **Line 3a (Qualified Dividends):** How much?
• **Line 3b (Ordinary Dividends):** $2,000

_(Qualified dividends are taxed at lower capital gains rates)_

How much of the $2,000 is **qualified dividends**? (1099-DIV Box 1b)`
});

// ------------------------------------------------------------
// INCOME - LINE 9 (TOTAL INCOME)
// ------------------------------------------------------------
examples.push({
  user: "no other income",
  assistant: `📋 **Form 1040 - Line 9 (Total Income)**

| Line | Description | Amount |
|------|-------------|--------|
| 1z | Wages | $85,000 |
| 2b | Interest | $500 |
| 3b | Dividends | $0 |
| **9** | **TOTAL INCOME** | **$85,500** |

---

📋 **Next: Adjustments (Line 10)**

Do you have any adjustments to income?
• IRA contribution (max $${IRS_2025.adjustments.ira_deduction.under_50.toLocaleString()})
• Student loan interest (max $${IRS_2025.adjustments.student_loan_interest.limit.toLocaleString()})
• HSA contribution (max $${IRS_2025.adjustments.hsa_deduction.individual.toLocaleString()})
• None`
});

// ------------------------------------------------------------
// ADJUSTMENTS - SCHEDULE 1 → LINE 10
// ------------------------------------------------------------
// IRA
examples.push({
  user: "IRA $7000",
  assistant: `📋 **Schedule 1 - IRA Deduction**

• IRA Contribution: **$${IRS_2025.adjustments.ira_deduction.under_50.toLocaleString()}**
• ${TAX_YEAR} Limit: $${IRS_2025.adjustments.ira_deduction.under_50.toLocaleString()} (under 50) / $${IRS_2025.adjustments.ira_deduction.over_50.toLocaleString()} (50+)

✅ Within limit

Is this correct? (Yes / No)`
});

examples.push({
  user: "IRA $8000",
  assistant: `📋 **Schedule 1 - IRA Deduction**

The ${TAX_YEAR} IRA limit is:
• **$${IRS_2025.adjustments.ira_deduction.under_50.toLocaleString()}** if under 50
• **$${IRS_2025.adjustments.ira_deduction.over_50.toLocaleString()}** if 50 or older

Are you **50 or older**? (Yes / No)`
});

examples.push({
  user: "yes over 50",
  context: "Asked about age for $8000 IRA",
  assistant: `✅ **50+ confirmed** - Catch-up contribution allowed!

📋 **Schedule 1 - IRA Deduction:**

• IRA Contribution: **$${IRS_2025.adjustments.ira_deduction.over_50.toLocaleString()}**
• Limit (50+): $${IRS_2025.adjustments.ira_deduction.over_50.toLocaleString()} ✓

Is this correct? (Yes / No)`
});

// MFJ Combined IRA
examples.push({
  user: "IRA $14000 for both of us",
  context: "MFJ filing",
  assistant: `📋 **Schedule 1 - Combined IRA Deduction (MFJ)**

• Your IRA: $${IRS_2025.adjustments.ira_deduction.under_50.toLocaleString()}
• Spouse IRA: $${IRS_2025.adjustments.ira_deduction.under_50.toLocaleString()}
• **Combined: $${(IRS_2025.adjustments.ira_deduction.under_50 * 2).toLocaleString()}**

${TAX_YEAR} MFJ Limit: $${(IRS_2025.adjustments.ira_deduction.under_50 * 2).toLocaleString()} ✓

Is this correct? (Yes / No)`
});

// Student Loan
examples.push({
  user: "student loan interest $2500",
  assistant: `📋 **Schedule 1 - Student Loan Interest**

• Interest Paid: **$${IRS_2025.adjustments.student_loan_interest.limit.toLocaleString()}**
• ${TAX_YEAR} Maximum: $${IRS_2025.adjustments.student_loan_interest.limit.toLocaleString()} ✓

Is this correct? (Yes / No)`
});

examples.push({
  user: "student loan $3500",
  assistant: `⚠️ **Exceeds ${TAX_YEAR} limit:**

• You entered: $3,500
• Maximum deductible: **$${IRS_2025.adjustments.student_loan_interest.limit.toLocaleString()}**

📋 I'll apply the maximum:
• **Student Loan Interest: $${IRS_2025.adjustments.student_loan_interest.limit.toLocaleString()}**

Is this correct? (Yes / No)`
});

// HSA
examples.push({
  user: "HSA $4000",
  assistant: `📋 **Schedule 1 - HSA Deduction**

• HSA Contribution: **$4,000**
• ${TAX_YEAR} Limit: $${IRS_2025.adjustments.hsa_deduction.individual.toLocaleString()} (individual) / $${IRS_2025.adjustments.hsa_deduction.family.toLocaleString()} (family)

✅ Within individual limit

Is this correct? (Yes / No)`
});

// No adjustments
examples.push({
  user: "no adjustments",
  assistant: `✅ **Line 10 (Total Adjustments): $0**

📋 **Form 1040 - Line 11 (AGI)**

• Line 9 (Total Income): $85,500
• Line 10 (Adjustments): $0
• **Line 11 (AGI): $85,500**

---

📋 **Next: Deductions (Line 12)**

The ${TAX_YEAR} **Standard Deduction** for MFJ is **$${IRS_2025.filing_status.married_filing_jointly.standard_deduction.toLocaleString()}**.

Do you want to:
• **Standard** ($${IRS_2025.filing_status.married_filing_jointly.standard_deduction.toLocaleString()})
• **Itemize** (mortgage, property tax, charity)`
});

// Adjustments summary
examples.push({
  user: "done",
  context: "After IRA $7000 and student loan $2000",
  assistant: `📋 **Schedule 1 - Adjustments Summary → Line 10**

| Adjustment | Amount |
|------------|--------|
| IRA Deduction | $7,000 |
| Student Loan Interest | $2,000 |
| **Total (Line 10)** | **$9,000** |

📋 **Form 1040 - Line 11 (AGI)**

• Line 9 (Total Income): $85,500
• Line 10 (Adjustments): -$9,000
• **Line 11 (AGI): $76,500**

Correct? (Yes / No)`
});

// ------------------------------------------------------------
// DEDUCTIONS - LINE 12
// ------------------------------------------------------------
examples.push({
  user: "standard deduction",
  assistant: `📋 **Form 1040 - Line 12 (Standard Deduction)**

• Filing Status: MFJ
• **Standard Deduction: $${IRS_2025.filing_status.married_filing_jointly.standard_deduction.toLocaleString()}**

✅ Confirmed

📋 **Line 15 (Taxable Income):**
• Line 11 (AGI): $76,500
• Line 12 (Deduction): -$30,000
• **Line 15: $46,500**

Proceed to tax calculation? (Yes / No)`
});

examples.push({
  user: "itemize",
  assistant: `📋 **Schedule A - Itemized Deductions**

Enter your deductions:

• **Medical** (if >7.5% of AGI): $_____
• **State/Local Taxes** (max $${IRS_2025.other_rules.salt_cap.toLocaleString()}): $_____
• **Mortgage Interest**: $_____
• **Charitable Donations**: $_____

What's your **total itemized amount**?`
});

examples.push({
  user: "itemized $22000",
  context: "MFJ, standard is $30000",
  assistant: `📊 **Deduction Comparison:**

| Type | Amount |
|------|--------|
| Your Itemized | $22,000 |
| Standard (MFJ) | $${IRS_2025.filing_status.married_filing_jointly.standard_deduction.toLocaleString()} |

⚠️ **Standard deduction is $${IRS_2025.filing_status.married_filing_jointly.standard_deduction - 22000} MORE!**

I recommend **Standard Deduction** for Line 12.

Which do you choose?
• **Standard** ($${IRS_2025.filing_status.married_filing_jointly.standard_deduction.toLocaleString()}) ✅ Recommended
• **Itemized** ($22,000)`
});

// ------------------------------------------------------------
// TAX CALCULATION - LINE 16
// ------------------------------------------------------------
examples.push({
  user: "yes",
  context: "Proceed to tax calculation",
  assistant: `📋 **Form 1040 - Tax Calculation**

**Line 15 (Taxable Income): $46,500**

**Line 16 (Tax):**
Using ${TAX_YEAR} MFJ Tax Brackets:
• 10% on first $23,850 = $2,385
• 12% on $22,650 ($23,850 to $46,500) = $2,718

**Line 16: $5,103**

---

📋 **Next: Credits (Line 19)**

You have 2 children (CTC eligible):
• Line 19 (Child Tax Credit): **$4,000**

Shall I continue?`
});

// ------------------------------------------------------------
// CREDITS - LINES 19-21
// ------------------------------------------------------------
examples.push({
  user: "yes continue",
  context: "Continue to credits",
  assistant: `📋 **Form 1040 - Credits**

**Line 19 (Child Tax Credit):**
• 2 children under 17 × $${IRS_2025.credits.child_tax_credit.amount.toLocaleString()} = **$4,000**

**Lines 16-22 Summary:**
| Line | Description | Amount |
|------|-------------|--------|
| 16 | Tax | $5,103 |
| 19 | Child Tax Credit | -$4,000 |
| **22** | **Tax minus credits** | **$1,103** |

---

📋 **Next: Payments (Line 25)**

You had **$12,000** withheld. Shall I calculate your refund?`
});

// ------------------------------------------------------------
// PAYMENTS & REFUND - LINES 25-37
// ------------------------------------------------------------
examples.push({
  user: "yes",
  context: "Calculate refund",
  assistant: `📋 **Form 1040 - FINAL CALCULATION**

═══════════════════════════════════════════
**INCOME**
═══════════════════════════════════════════
Line 1z: Wages .................. $85,000
Line 9:  TOTAL INCOME ........... $85,000

═══════════════════════════════════════════
**ADJUSTED GROSS INCOME**
═══════════════════════════════════════════
Line 10: Adjustments ............ -$7,000
Line 11: AGI .................... $78,000

═══════════════════════════════════════════
**TAXABLE INCOME**
═══════════════════════════════════════════
Line 12: Standard Deduction ..... -$30,000
Line 15: TAXABLE INCOME ......... $48,000

═══════════════════════════════════════════
**TAX & CREDITS**
═══════════════════════════════════════════
Line 16: Tax .................... $5,244
Line 19: Child Tax Credit ....... -$4,000
Line 24: TOTAL TAX .............. $1,244

═══════════════════════════════════════════
**PAYMENTS**
═══════════════════════════════════════════
Line 25d: Withholding ........... $12,000
Line 33: TOTAL PAYMENTS ......... $12,000

═══════════════════════════════════════════
**REFUND**
═══════════════════════════════════════════
Line 34: REFUND ................. **$10,756** ✅

---

🎉 You're getting a **$10,756 federal refund!**

Would you like to:
• 📄 Generate Form 1040 PDF
• 🏛️ Calculate state taxes
• ❓ Ask questions`
});

// ------------------------------------------------------------
// TAX QUESTIONS - IRS RULES
// ------------------------------------------------------------
examples.push({
  user: "what is the child tax credit?",
  assistant: `📋 **Child Tax Credit (CTC) - Form 1040 Line 19**

**${TAX_YEAR} Rules:**

| Requirement | Rule |
|-------------|------|
| Amount | **$${IRS_2025.credits.child_tax_credit.amount.toLocaleString()}** per child |
| Age | Must be **under 17** (0-16) |
| SSN | Child must have valid SSN |
| Residence | Live with you 6+ months |
| Relationship | Son, daughter, stepchild, etc. |

**Refundable Portion (ACTC):**
• Up to $${IRS_2025.credits.child_tax_credit.refundable_max.toLocaleString()} per child (Line 28)

**Phase-out:**
• Single: $${IRS_2025.credits.child_tax_credit.phase_out_single.toLocaleString()}
• MFJ: $${IRS_2025.credits.child_tax_credit.phase_out_mfj.toLocaleString()}

**Age 17+:** Other Dependents Credit ($${IRS_2025.credits.other_dependents_credit.amount})`
});

examples.push({
  user: "what are the tax brackets?",
  assistant: `📋 **${TAX_YEAR} Federal Tax Brackets**

**Single:**
| Income | Rate |
|--------|------|
| $0 - $11,925 | 10% |
| $11,925 - $48,475 | 12% |
| $48,475 - $103,350 | 22% |
| $103,350 - $197,300 | 24% |
| $197,300 - $250,525 | 32% |
| $250,525 - $626,350 | 35% |
| $626,350+ | 37% |

**Married Filing Jointly:**
| Income | Rate |
|--------|------|
| $0 - $23,850 | 10% |
| $23,850 - $96,950 | 12% |
| $96,950 - $206,700 | 22% |
| $206,700 - $394,600 | 24% |
| $394,600 - $501,050 | 32% |
| $501,050 - $751,600 | 35% |
| $751,600+ | 37% |`
});

examples.push({
  user: "what is AGI?",
  assistant: `📋 **AGI - Adjusted Gross Income (Line 11)**

**Formula:**
Line 9 (Total Income) - Line 10 (Adjustments) = **Line 11 (AGI)**

**Why it matters:**
AGI determines eligibility for many credits and deductions:
• Child Tax Credit phase-out
• EITC eligibility
• Student loan interest deduction
• IRA deduction limits
• Medical expense threshold (7.5% of AGI)

**Common Adjustments (Line 10):**
• IRA contributions
• Student loan interest
• HSA contributions
• Self-employment tax (50%)
• Alimony paid (pre-2019)`
});

examples.push({
  user: "what is EITC?",
  assistant: `📋 **Earned Income Tax Credit (EITC) - Line 27**

**${TAX_YEAR} Maximum Credit:**
| Children | Max Credit | Income Limit (Single) |
|----------|------------|----------------------|
| 0 | $${IRS_2025.credits.earned_income_credit.max_credit[0]} | $${IRS_2025.credits.earned_income_credit.income_limit_single[0].toLocaleString()} |
| 1 | $${IRS_2025.credits.earned_income_credit.max_credit[1].toLocaleString()} | $${IRS_2025.credits.earned_income_credit.income_limit_single[1].toLocaleString()} |
| 2 | $${IRS_2025.credits.earned_income_credit.max_credit[2].toLocaleString()} | $${IRS_2025.credits.earned_income_credit.income_limit_single[2].toLocaleString()} |
| 3+ | $${IRS_2025.credits.earned_income_credit.max_credit[3].toLocaleString()} | $${IRS_2025.credits.earned_income_credit.income_limit_single[3].toLocaleString()} |

**Requirements:**
• Must have earned income (wages, self-employment)
• Investment income < $${IRS_2025.credits.earned_income_credit.investment_income_limit.toLocaleString()}
• Valid SSN
• Cannot file MFS

**100% Refundable** - You get it even if you owe $0 tax!`
});

// ------------------------------------------------------------
// VALIDATION & ERROR CHECKING
// ------------------------------------------------------------
examples.push({
  user: "calculate",
  context: "Missing filing status",
  assistant: `⚠️ **Cannot complete Form 1040 - Missing required fields:**

❌ **Filing Status:** Not selected
☑️ Income: $85,000

**Form 1040 requires filing status at the top.**

What is your filing status?
• Single
• Married Filing Jointly
• Head of Household
• Other`
});

examples.push({
  user: "calculate my taxes",
  context: "MFJ but spouse income not verified",
  assistant: `⚠️ **Form 1040 Incomplete:**

☑️ Filing Status: MFJ
❌ **Spouse Income:** Not verified

For accurate Line 1z (Wages), I need to confirm:

**Does your spouse have income (W-2, 1099)?**

This affects your total income and tax calculation.`
});

examples.push({
  user: "my withholding is $40000",
  context: "Wages are $35000",
  assistant: `⚠️ **Validation Warning - Line 25a**

• Line 1z (Wages): $35,000
• Line 25a (Withholding): $40,000

**Withholding exceeds wages** - this is unusual.

Please verify your W-2:
• Box 1 (Wages): $35,000?
• Box 2 (Federal Withheld): $40,000?

Did you enter these correctly?`
});

examples.push({
  user: "IRA $20000",
  assistant: `⚠️ **Exceeds ${TAX_YEAR} IRA Limit**

• Your amount: $20,000
• Maximum (under 50): $${IRS_2025.adjustments.ira_deduction.under_50.toLocaleString()}
• Maximum (50+): $${IRS_2025.adjustments.ira_deduction.over_50.toLocaleString()}
• Maximum (MFJ combined): $${(IRS_2025.adjustments.ira_deduction.under_50 * 2).toLocaleString()}

How much did you actually contribute?`
});

// ------------------------------------------------------------
// CORRECTIONS
// ------------------------------------------------------------
examples.push({
  user: "I made a mistake",
  assistant: `No problem! What needs to be corrected?

**Form 1040 Sections:**
• Filing Status (top)
• Income (Lines 1-9)
• Adjustments (Line 10)
• Deductions (Line 12)
• Dependents (for Line 19)

Tell me what to fix.`
});

examples.push({
  user: "my child is 15 not 17",
  context: "Previously entered 17",
  assistant: `✅ **Corrected!**

• Age: **15** (was 17)
• Now qualifies for **Child Tax Credit** (Line 19)

**Credit Change:**
• Before: ODC $${IRS_2025.credits.other_dependents_credit.amount}
• After: CTC **$${IRS_2025.credits.child_tax_credit.amount.toLocaleString()}**

🎉 This increases your credit by **$${IRS_2025.credits.child_tax_credit.amount - IRS_2025.credits.other_dependents_credit.amount}**!`
});

// ============================================================
// GENERATE JSONL
// ============================================================
function generateJSONL() {
  const lines = [];
  
  for (const ex of examples) {
    const messages = [
      { role: "system", content: SYSTEM_PROMPT }
    ];
    
    if (ex.context) {
      messages.push({ role: "system", content: `[Context: ${ex.context}]` });
    }
    
    messages.push(
      { role: "user", content: ex.user },
      { role: "assistant", content: ex.assistant }
    );
    
    lines.push(JSON.stringify({ messages }));
  }
  
  fs.writeFileSync(OUTPUT_FILE, lines.join("\n"));
  return lines.length;
}

// ============================================================
// MAIN
// ============================================================
function main() {
  console.log("═".repeat(60));
  console.log(`📋 TAXSKY FORM 1040 TRAINING - ${TAX_YEAR} IRS RULES`);
  console.log("═".repeat(60));
  
  const count = generateJSONL();
  const stats = fs.statSync(OUTPUT_FILE);
  
  console.log(`\n✅ Generated ${count} training examples`);
  console.log(`📁 Output: ${OUTPUT_FILE}`);
  console.log(`📊 Size: ${(stats.size / 1024).toFixed(1)} KB`);
  
  console.log("\n📋 Form 1040 Sections Covered:");
  console.log("   • Filing Status (Lines 1-5)");
  console.log("   • Income (Lines 1z, 2b, 3b, 4b-8, Line 9)");
  console.log("   • Adjustments (Schedule 1 → Line 10)");
  console.log("   • AGI (Line 11)");
  console.log("   • Deductions (Line 12 Standard/Itemized)");
  console.log("   • Taxable Income (Line 15)");
  console.log("   • Tax Calculation (Line 16)");
  console.log("   • Credits (Lines 19-21: CTC, ODC)");
  console.log("   • Payments (Lines 25-33)");
  console.log("   • Refund/Owed (Lines 34-37)");
  
  console.log("\n📊 2025 Tax Rules Embedded:");
  console.log(`   • Standard Deduction: Single $${IRS_2025.filing_status.single.standard_deduction.toLocaleString()} / MFJ $${IRS_2025.filing_status.married_filing_jointly.standard_deduction.toLocaleString()}`);
  console.log(`   • Child Tax Credit: $${IRS_2025.credits.child_tax_credit.amount.toLocaleString()} (under 17)`);
  console.log(`   • Other Dependents: $${IRS_2025.credits.other_dependents_credit.amount} (17+)`);
  console.log(`   • IRA Limit: $${IRS_2025.adjustments.ira_deduction.under_50.toLocaleString()} / $${IRS_2025.adjustments.ira_deduction.over_50.toLocaleString()} (50+)`);
  console.log(`   • Student Loan: $${IRS_2025.adjustments.student_loan_interest.limit.toLocaleString()} max`);
  console.log(`   • Tax Brackets: 10% - 37%`);
  
  console.log("\n🚀 TO FINE-TUNE:");
  console.log(`   cd /c/ai_tax/python_service/dataset`);
  console.log(`   node generate_1040_training_2025.js`);
  console.log(`   openai api files.create -f ${OUTPUT_FILE} -p fine-tune`);
  console.log(`   openai api fine_tuning.jobs.create -F FILE_ID -m gpt-3.5-turbo-0125 -s taxsky-1040-${TAX_YEAR}`);
}

main();
