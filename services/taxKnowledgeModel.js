// ============================================================
// TAX KNOWLEDGE MODEL
// ============================================================
// This is the "brain" that understands Form 1040 completely.
// It knows:
//   - All fields and their relationships
//   - IRS rules and requirements
//   - Calculations and formulas
//   - Conditional logic (if X then Y)
//   - Validation rules
// ============================================================

// ============================================================
// FORM 1040 COMPLETE STRUCTURE
// ============================================================
export const FORM_1040_STRUCTURE = {
  // ========================
  // HEADER SECTION
  // ========================
  header: {
    tax_year: { type: 'number', default: 2024 },
    first_name: { 
      type: 'string', 
      required: true, 
      label: 'First Name',
      sources: ['W-2', 'user_input'],
      line: 'Header'
    },
    middle_initial: { type: 'string', required: false },
    last_name: { 
      type: 'string', 
      required: true,
      sources: ['W-2', 'user_input'],
      line: 'Header'
    },
    ssn: { 
      type: 'ssn', 
      required: true,
      sources: ['W-2', 'user_input'],
      line: 'Header',
      validation: /^\d{3}-?\d{2}-?\d{4}$/
    },
    filing_status: {
      type: 'enum',
      required: true,
      sources: ['user_input'],  // MUST ask user - not on any document
      line: 'Lines 1-5',
      options: {
        single: { label: 'Single', standard_deduction: 14600 },
        married_filing_jointly: { label: 'Married Filing Jointly', standard_deduction: 29200 },
        married_filing_separately: { label: 'Married Filing Separately', standard_deduction: 14600 },
        head_of_household: { label: 'Head of Household', standard_deduction: 21900 },
        qualifying_surviving_spouse: { label: 'Qualifying Surviving Spouse', standard_deduction: 29200 }
      },
      affects: ['standard_deduction', 'tax_brackets', 'credit_limits']
    },
    address: { type: 'address', required: true, sources: ['W-2', 'user_input'] },
    presidential_campaign: { type: 'boolean', required: false, default: false }
  },

  // ========================
  // DEPENDENTS SECTION
  // ========================
  dependents: {
    has_dependents: {
      type: 'boolean',
      required: true,
      sources: ['user_input'],
      affects: ['child_tax_credit', 'earned_income_credit', 'child_care_credit', 'head_of_household_eligibility']
    },
    dependent_list: {
      type: 'array',
      condition: { field: 'has_dependents', value: true },
      item_structure: {
        name: { type: 'string', required: true },
        ssn: { type: 'ssn', required: true },
        relationship: { 
          type: 'enum', 
          options: ['son', 'daughter', 'stepson', 'stepdaughter', 'foster_child', 'brother', 'sister', 'parent', 'grandparent', 'grandchild', 'niece', 'nephew', 'other']
        },
        dob: { type: 'date', required: true },
        months_lived: { type: 'number', min: 0, max: 12 },
        is_student: { type: 'boolean' },
        is_disabled: { type: 'boolean' },
        child_tax_credit_eligible: { type: 'boolean', calculated: true },
        other_dependent_credit_eligible: { type: 'boolean', calculated: true }
      }
    }
  },

  // ========================
  // INCOME SECTION (Lines 1-9)
  // ========================
  income: {
    // Line 1a - Wages
    line_1a_wages: {
      type: 'currency',
      label: 'Wages, salaries, tips',
      line: '1a',
      sources: ['W-2'],
      source_field: 'Box 1',
      aggregation: 'sum',  // Sum all W-2s
      required: false
    },
    // Line 1b - Household employee wages
    line_1b_household_wages: {
      type: 'currency',
      line: '1b',
      sources: ['user_input'],
      condition: { question: 'household_employee' }
    },
    // Line 1c - Tip income not reported
    line_1c_tip_income: {
      type: 'currency',
      line: '1c',
      sources: ['user_input']
    },
    // Line 1d - Medicaid waiver
    line_1d_medicaid_waiver: {
      type: 'currency',
      line: '1d',
      sources: ['user_input']
    },
    // Line 1e - Dependent care benefits
    line_1e_dependent_care: {
      type: 'currency',
      line: '1e',
      sources: ['W-2'],
      source_field: 'Box 10'
    },
    // Line 1f - Employer adoption benefits
    line_1f_adoption_benefits: {
      type: 'currency',
      line: '1f',
      sources: ['W-2'],
      source_field: 'Box 12, Code T'
    },
    // Line 1g - Form 8919 wages
    line_1g_form_8919: {
      type: 'currency',
      line: '1g',
      sources: ['Form 8919']
    },
    // Line 1h - Other earned income
    line_1h_other_earned: {
      type: 'currency',
      line: '1h',
      sources: ['user_input'],
      includes: ['scholarship_taxable', 'prisoner_income']
    },
    // Line 1i - Nontaxable combat pay
    line_1i_combat_pay: {
      type: 'currency',
      line: '1i',
      sources: ['W-2'],
      source_field: 'Box 12, Code Q'
    },
    // Line 1z - Total wages
    line_1z_total_wages: {
      type: 'currency',
      line: '1z',
      calculated: true,
      formula: 'SUM(line_1a, line_1b, line_1c, line_1d, line_1e, line_1f, line_1g, line_1h) - line_1i'
    },

    // Line 2a - Tax-exempt interest
    line_2a_tax_exempt_interest: {
      type: 'currency',
      line: '2a',
      sources: ['1099-INT'],
      source_field: 'Box 8',
      aggregation: 'sum'
    },
    // Line 2b - Taxable interest
    line_2b_taxable_interest: {
      type: 'currency',
      line: '2b',
      sources: ['1099-INT', '1099-OID'],
      source_field: 'Box 1',
      aggregation: 'sum',
      threshold_for_schedule_b: 1500
    },

    // Line 3a - Qualified dividends
    line_3a_qualified_dividends: {
      type: 'currency',
      line: '3a',
      sources: ['1099-DIV'],
      source_field: 'Box 1b',
      aggregation: 'sum',
      tax_rate: 'capital_gains_rate'  // Special lower rate
    },
    // Line 3b - Ordinary dividends
    line_3b_ordinary_dividends: {
      type: 'currency',
      line: '3b',
      sources: ['1099-DIV'],
      source_field: 'Box 1a',
      aggregation: 'sum',
      threshold_for_schedule_b: 1500
    },

    // Line 4a - IRA distributions
    line_4a_ira_distributions: {
      type: 'currency',
      line: '4a',
      sources: ['1099-R'],
      condition: { source_field: 'Box 7', values: ['1', '2', '3', '4', '7'] }
    },
    // Line 4b - Taxable IRA
    line_4b_taxable_ira: {
      type: 'currency',
      line: '4b',
      calculated: true,
      depends_on: ['line_4a_ira_distributions', 'ira_basis']
    },

    // Line 5a - Pensions and annuities
    line_5a_pensions: {
      type: 'currency',
      line: '5a',
      sources: ['1099-R']
    },
    // Line 5b - Taxable pensions
    line_5b_taxable_pensions: {
      type: 'currency',
      line: '5b',
      calculated: true
    },

    // Line 6a - Social Security benefits
    line_6a_social_security: {
      type: 'currency',
      line: '6a',
      sources: ['SSA-1099', 'RRB-1099'],
      source_field: 'Box 5'
    },
    // Line 6b - Taxable Social Security
    line_6b_taxable_ss: {
      type: 'currency',
      line: '6b',
      calculated: true,
      formula: 'calculate_taxable_social_security(line_6a, provisional_income)',
      max_taxable_percent: 0.85
    },

    // Line 7 - Capital gain or loss
    line_7_capital_gain: {
      type: 'currency',
      line: '7',
      sources: ['1099-B', 'Schedule D'],
      can_be_negative: true,
      loss_limit: -3000
    },

    // Line 8 - Additional income from Schedule 1
    line_8_schedule_1_income: {
      type: 'currency',
      line: '8',
      calculated: true,
      source: 'Schedule 1, Line 10'
    },

    // Line 9 - Total income
    line_9_total_income: {
      type: 'currency',
      line: '9',
      calculated: true,
      formula: 'SUM(line_1z, line_2b, line_3b, line_4b, line_5b, line_6b, line_7, line_8)'
    }
  },

  // ========================
  // SCHEDULE 1 - ADDITIONAL INCOME
  // ========================
  schedule_1_income: {
    // Line 1 - Taxable refunds
    line_1_taxable_refunds: {
      type: 'currency',
      sources: ['1099-G'],
      source_field: 'Box 2',
      condition: { itemized_previous_year: true }
    },
    // Line 2a - Alimony received
    line_2a_alimony_received: {
      type: 'currency',
      sources: ['user_input'],
      condition: { divorce_before_2019: true }
    },
    // Line 3 - Business income (Schedule C)
    line_3_business_income: {
      type: 'currency',
      sources: ['Schedule C', '1099-NEC', '1099-MISC'],
      requires_schedule: 'Schedule C',
      triggers: ['self_employment_tax']
    },
    // Line 4 - Other gains (Form 4797)
    line_4_other_gains: {
      type: 'currency',
      sources: ['Form 4797']
    },
    // Line 5 - Rental income (Schedule E)
    line_5_rental_income: {
      type: 'currency',
      sources: ['Schedule E'],
      requires_schedule: 'Schedule E'
    },
    // Line 6 - Farm income (Schedule F)
    line_6_farm_income: {
      type: 'currency',
      sources: ['Schedule F'],
      requires_schedule: 'Schedule F'
    },
    // Line 7 - Unemployment compensation
    line_7_unemployment: {
      type: 'currency',
      sources: ['1099-G'],
      source_field: 'Box 1'
    },
    // Line 8a-8z - Other income types
    line_8_other_income: {
      type: 'currency',
      sources: ['various'],
      includes: ['gambling_winnings', 'jury_duty', 'prizes', 'cancelled_debt']
    }
  },

  // ========================
  // SCHEDULE 1 - ADJUSTMENTS
  // ========================
  schedule_1_adjustments: {
    // Line 11 - Educator expenses
    line_11_educator_expenses: {
      type: 'currency',
      max: 300,
      condition: { occupation: 'educator', grades: 'K-12' },
      sources: ['user_input']
    },
    // Line 12 - Business expenses (reservists, etc.)
    line_12_business_expenses: {
      type: 'currency',
      sources: ['Form 2106']
    },
    // Line 13 - HSA deduction
    line_13_hsa_deduction: {
      type: 'currency',
      sources: ['Form 8889', '5498-SA'],
      limits: {
        self_only: 4150,
        family: 8300,
        catch_up_55_plus: 1000
      }
    },
    // Line 14 - Moving expenses (military)
    line_14_moving_expenses: {
      type: 'currency',
      condition: { military_move: true },
      sources: ['Form 3903']
    },
    // Line 15 - Self-employment tax deduction
    line_15_se_tax_deduction: {
      type: 'currency',
      calculated: true,
      formula: 'self_employment_tax * 0.5'
    },
    // Line 16 - SEP, SIMPLE, qualified plans
    line_16_retirement_plans: {
      type: 'currency',
      sources: ['user_input', '5498']
    },
    // Line 17 - Self-employed health insurance
    line_17_se_health_insurance: {
      type: 'currency',
      condition: { self_employed: true },
      max: 'net_self_employment_income'
    },
    // Line 18 - Penalty early withdrawal
    line_18_early_withdrawal_penalty: {
      type: 'currency',
      sources: ['1099-INT', '1099-OID'],
      source_field: 'Box 2'
    },
    // Line 19a - Alimony paid
    line_19a_alimony_paid: {
      type: 'currency',
      condition: { divorce_before_2019: true },
      requires: 'recipient_ssn'
    },
    // Line 20 - IRA deduction
    line_20_ira_deduction: {
      type: 'currency',
      sources: ['5498'],
      limits: { under_50: 7000, over_50: 8000 },
      phase_out: { depends_on: ['filing_status', 'magi', 'has_workplace_retirement'] }
    },
    // Line 21 - Student loan interest
    line_21_student_loan_interest: {
      type: 'currency',
      max: 2500,
      sources: ['1098-E'],
      phase_out: { single: [75000, 90000], mfj: [155000, 185000] }
    }
  },

  // ========================
  // DEDUCTIONS (Lines 12-15)
  // ========================
  deductions: {
    // Line 12 - Standard or Itemized
    line_12_deduction: {
      type: 'currency',
      calculated: true,
      formula: 'MAX(standard_deduction, itemized_deduction)'
    },
    standard_deduction: {
      type: 'currency',
      calculated: true,
      depends_on: ['filing_status', 'age', 'blind', 'dependent_of_another']
    },
    itemized_deduction: {
      type: 'currency',
      calculated: true,
      source: 'Schedule A, Line 17'
    },
    // Line 13 - QBI deduction
    line_13_qbi_deduction: {
      type: 'currency',
      calculated: true,
      source: 'Form 8995 or 8995-A',
      max_percent: 0.20,
      condition: { has_qualified_business_income: true }
    },
    // Line 14 - Total deductions
    line_14_total_deductions: {
      type: 'currency',
      calculated: true,
      formula: 'line_12_deduction + line_13_qbi_deduction'
    },
    // Line 15 - Taxable income
    line_15_taxable_income: {
      type: 'currency',
      calculated: true,
      formula: 'MAX(0, line_11_agi - line_14_total_deductions)'
    }
  },

  // ========================
  // SCHEDULE A - ITEMIZED DEDUCTIONS
  // ========================
  schedule_a: {
    // Medical expenses
    line_1_medical_expenses: {
      type: 'currency',
      sources: ['user_input'],
      threshold: 0.075,  // 7.5% of AGI
      formula: 'MAX(0, total_medical - (agi * 0.075))'
    },
    // State and local taxes
    line_5_salt: {
      type: 'currency',
      max: 10000,  // SALT cap
      includes: ['state_income_tax', 'property_tax', 'sales_tax'],
      sources: ['W-2 Box 17', '1099', 'user_input']
    },
    // Home mortgage interest
    line_8_mortgage_interest: {
      type: 'currency',
      sources: ['1098'],
      source_field: 'Box 1',
      loan_limit: 750000  // For loans after 12/15/2017
    },
    // Charitable contributions
    line_11_charity_cash: {
      type: 'currency',
      sources: ['user_input'],
      limit: '0.60 * agi',
      carryover: 5  // years
    },
    line_12_charity_noncash: {
      type: 'currency',
      sources: ['Form 8283'],
      limit: '0.30 * agi'
    },
    // Casualty losses
    line_15_casualty: {
      type: 'currency',
      sources: ['Form 4684'],
      condition: { federally_declared_disaster: true }
    }
  },

  // ========================
  // TAX AND CREDITS (Lines 16-24)
  // ========================
  tax_and_credits: {
    // Line 16 - Tax
    line_16_tax: {
      type: 'currency',
      calculated: true,
      formula: 'calculate_tax(line_15_taxable_income, filing_status, qualified_dividends, capital_gains)'
    },
    // Line 17 - Schedule 2 taxes
    line_17_schedule_2: {
      type: 'currency',
      calculated: true,
      source: 'Schedule 2, Line 3'
    },
    // Line 18 - Total tax before credits
    line_18_total_tax: {
      type: 'currency',
      calculated: true,
      formula: 'line_16_tax + line_17_schedule_2'
    },
    // Line 19 - Child tax credit
    line_19_child_credit: {
      type: 'currency',
      calculated: true,
      per_child: 2000,
      refundable_max: 1700,
      phase_out: { single: 200000, mfj: 400000 }
    },
    // Line 20 - Schedule 3 credits
    line_20_schedule_3: {
      type: 'currency',
      calculated: true,
      source: 'Schedule 3, Line 8'
    },
    // Line 21 - Total credits
    line_21_total_credits: {
      type: 'currency',
      calculated: true,
      formula: 'line_19_child_credit + line_20_schedule_3'
    },
    // Line 22 - Tax after credits
    line_22_tax_after_credits: {
      type: 'currency',
      calculated: true,
      formula: 'MAX(0, line_18_total_tax - line_21_total_credits)'
    },
    // Line 23 - Other taxes (Schedule 2)
    line_23_other_taxes: {
      type: 'currency',
      calculated: true,
      source: 'Schedule 2, Line 21'
    },
    // Line 24 - Total tax
    line_24_total_tax: {
      type: 'currency',
      calculated: true,
      formula: 'line_22_tax_after_credits + line_23_other_taxes'
    }
  },

  // ========================
  // SCHEDULE 2 - OTHER TAXES
  // ========================
  schedule_2: {
    // Self-employment tax
    line_4_se_tax: {
      type: 'currency',
      calculated: true,
      formula: 'calculate_se_tax(net_self_employment)',
      rate: 0.153,
      wage_base: 168600  // 2024
    },
    // Unreported Social Security tax
    line_5_unreported_ss: {
      type: 'currency',
      sources: ['Form 4137', 'Form 8919']
    },
    // Additional Medicare tax
    line_8_additional_medicare: {
      type: 'currency',
      calculated: true,
      rate: 0.009,
      threshold: { single: 200000, mfj: 250000 }
    },
    // Net investment income tax
    line_8_niit: {
      type: 'currency',
      calculated: true,
      rate: 0.038,
      threshold: { single: 200000, mfj: 250000 }
    },
    // Household employment taxes
    line_9_household_taxes: {
      type: 'currency',
      sources: ['Schedule H']
    },
    // Early retirement penalty
    line_8_retirement_penalty: {
      type: 'currency',
      sources: ['1099-R'],
      condition: { distribution_code: '1' },
      rate: 0.10
    }
  },

  // ========================
  // SCHEDULE 3 - CREDITS
  // ========================
  schedule_3: {
    // Foreign tax credit
    line_1_foreign_tax: {
      type: 'currency',
      sources: ['1099-DIV', '1099-INT', 'Form 1116'],
      source_field: 'Box 7'
    },
    // Child and dependent care credit
    line_2_child_care: {
      type: 'currency',
      calculated: true,
      sources: ['Form 2441'],
      expense_limit: { one_dependent: 3000, two_or_more: 6000 },
      credit_rate: '0.20 to 0.35 based on agi'
    },
    // Education credits
    line_3_education_credits: {
      type: 'currency',
      sources: ['Form 8863', '1098-T'],
      includes: {
        aotc: { max: 2500, refundable_percent: 0.40 },
        llc: { max: 2000, refundable: false }
      }
    },
    // Retirement savings credit
    line_4_retirement_credit: {
      type: 'currency',
      calculated: true,
      sources: ['Form 8880'],
      max: 1000,
      income_limit: { single: 38250, mfj: 76500 }
    },
    // Residential energy credits
    line_5_energy_credits: {
      type: 'currency',
      sources: ['Form 5695'],
      includes: {
        residential_clean_energy: { rate: 0.30 },
        energy_efficient_home: { max: 1200 }
      }
    },
    // EV credit
    line_6f_ev_credit: {
      type: 'currency',
      sources: ['Form 8936'],
      new_vehicle_max: 7500,
      used_vehicle_max: 4000,
      income_limit: { single: 150000, mfj: 300000 }
    }
  },

  // ========================
  // PAYMENTS (Lines 25-33)
  // ========================
  payments: {
    // Line 25a - W-2 withholding
    line_25a_withholding: {
      type: 'currency',
      sources: ['W-2'],
      source_field: 'Box 2',
      aggregation: 'sum'
    },
    // Line 25b - 1099 withholding
    line_25b_1099_withholding: {
      type: 'currency',
      sources: ['1099-R', '1099-G', '1099-INT', '1099-DIV', 'SSA-1099'],
      source_field: 'Box 4',
      aggregation: 'sum'
    },
    // Line 25c - Other withholding
    line_25c_other_withholding: {
      type: 'currency',
      sources: ['W-2G', 'Form 8805', 'Form 8288-A']
    },
    // Line 26 - Estimated payments
    line_26_estimated_payments: {
      type: 'currency',
      sources: ['user_input'],
      includes: ['quarterly_payments', 'amount_applied_from_prior_year']
    },
    // Line 27 - Earned Income Credit
    line_27_eic: {
      type: 'currency',
      calculated: true,
      sources: ['Schedule EIC'],
      depends_on: ['earned_income', 'agi', 'filing_status', 'qualifying_children', 'investment_income']
    },
    // Line 28 - Additional child tax credit
    line_28_additional_ctc: {
      type: 'currency',
      calculated: true,
      sources: ['Schedule 8812'],
      max_per_child: 1700
    },
    // Line 29 - American Opportunity Credit (refundable)
    line_29_aotc_refundable: {
      type: 'currency',
      calculated: true,
      formula: 'aotc_total * 0.40',
      max: 1000
    }
  },

  // ========================
  // REFUND OR AMOUNT OWED
  // ========================
  refund_or_owe: {
    // Line 33 - Total payments
    line_33_total_payments: {
      type: 'currency',
      calculated: true,
      formula: 'SUM(line_25a through line_32)'
    },
    // Line 34 - Overpayment
    line_34_overpayment: {
      type: 'currency',
      calculated: true,
      formula: 'MAX(0, line_33_total_payments - line_24_total_tax)'
    },
    // Line 35a - Refund
    line_35_refund: {
      type: 'currency',
      calculated: true,
      formula: 'line_34_overpayment - line_36_applied_to_next_year'
    },
    // Line 37 - Amount owed
    line_37_amount_owed: {
      type: 'currency',
      calculated: true,
      formula: 'MAX(0, line_24_total_tax - line_33_total_payments)'
    },
    // Line 38 - Estimated penalty
    line_38_estimated_penalty: {
      type: 'currency',
      calculated: true,
      sources: ['Form 2210']
    }
  }
};

// ============================================================
// TAX BRACKETS 2024
// ============================================================
export const TAX_BRACKETS_2024 = {
  single: [
    { min: 0, max: 11600, rate: 0.10 },
    { min: 11600, max: 47150, rate: 0.12 },
    { min: 47150, max: 100525, rate: 0.22 },
    { min: 100525, max: 191950, rate: 0.24 },
    { min: 191950, max: 243725, rate: 0.32 },
    { min: 243725, max: 609350, rate: 0.35 },
    { min: 609350, max: Infinity, rate: 0.37 }
  ],
  married_filing_jointly: [
    { min: 0, max: 23200, rate: 0.10 },
    { min: 23200, max: 94300, rate: 0.12 },
    { min: 94300, max: 201050, rate: 0.22 },
    { min: 201050, max: 383900, rate: 0.24 },
    { min: 383900, max: 487450, rate: 0.32 },
    { min: 487450, max: 731200, rate: 0.35 },
    { min: 731200, max: Infinity, rate: 0.37 }
  ],
  married_filing_separately: [
    { min: 0, max: 11600, rate: 0.10 },
    { min: 11600, max: 47150, rate: 0.12 },
    { min: 47150, max: 100525, rate: 0.22 },
    { min: 100525, max: 191950, rate: 0.24 },
    { min: 191950, max: 243725, rate: 0.32 },
    { min: 243725, max: 365600, rate: 0.35 },
    { min: 365600, max: Infinity, rate: 0.37 }
  ],
  head_of_household: [
    { min: 0, max: 16550, rate: 0.10 },
    { min: 16550, max: 63100, rate: 0.12 },
    { min: 63100, max: 100500, rate: 0.22 },
    { min: 100500, max: 191950, rate: 0.24 },
    { min: 191950, max: 243700, rate: 0.32 },
    { min: 243700, max: 609350, rate: 0.35 },
    { min: 609350, max: Infinity, rate: 0.37 }
  ]
};

// ============================================================
// CAPITAL GAINS RATES 2024
// ============================================================
export const CAPITAL_GAINS_RATES_2024 = {
  single: [
    { min: 0, max: 47025, rate: 0 },
    { min: 47025, max: 518900, rate: 0.15 },
    { min: 518900, max: Infinity, rate: 0.20 }
  ],
  married_filing_jointly: [
    { min: 0, max: 94050, rate: 0 },
    { min: 94050, max: 583750, rate: 0.15 },
    { min: 583750, max: Infinity, rate: 0.20 }
  ]
};

// ============================================================
// DOCUMENT TO FORM MAPPING
// ============================================================
export const DOCUMENT_MAPPING = {
  'W-2': {
    description: 'Wage and Tax Statement',
    fields: {
      'Box 1': { maps_to: 'income.line_1a_wages', aggregation: 'sum' },
      'Box 2': { maps_to: 'payments.line_25a_withholding', aggregation: 'sum' },
      'Box 3': { maps_to: 'ss_wages', info_only: true },
      'Box 4': { maps_to: 'ss_tax_withheld', info_only: true },
      'Box 5': { maps_to: 'medicare_wages', info_only: true },
      'Box 6': { maps_to: 'medicare_tax_withheld', info_only: true },
      'Box 10': { maps_to: 'income.line_1e_dependent_care' },
      'Box 12': { maps_to: 'various', requires_code_parsing: true },
      'Box 17': { maps_to: 'schedule_a.state_income_tax', aggregation: 'sum' }
    },
    required_for: ['wages', 'withholding']
  },
  '1099-INT': {
    description: 'Interest Income',
    fields: {
      'Box 1': { maps_to: 'income.line_2b_taxable_interest', aggregation: 'sum' },
      'Box 2': { maps_to: 'schedule_1_adjustments.line_18_early_withdrawal_penalty' },
      'Box 3': { maps_to: 'us_savings_bond_interest' },
      'Box 4': { maps_to: 'payments.line_25b_1099_withholding', aggregation: 'sum' },
      'Box 8': { maps_to: 'income.line_2a_tax_exempt_interest', aggregation: 'sum' }
    }
  },
  '1099-DIV': {
    description: 'Dividend Income',
    fields: {
      'Box 1a': { maps_to: 'income.line_3b_ordinary_dividends', aggregation: 'sum' },
      'Box 1b': { maps_to: 'income.line_3a_qualified_dividends', aggregation: 'sum' },
      'Box 4': { maps_to: 'payments.line_25b_1099_withholding', aggregation: 'sum' },
      'Box 7': { maps_to: 'schedule_3.line_1_foreign_tax', aggregation: 'sum' }
    }
  },
  '1099-NEC': {
    description: 'Nonemployee Compensation',
    fields: {
      'Box 1': { maps_to: 'schedule_1_income.line_3_business_income' },
      'Box 4': { maps_to: 'payments.line_25b_1099_withholding', aggregation: 'sum' }
    },
    triggers: ['Schedule C', 'self_employment_tax']
  },
  '1099-R': {
    description: 'Retirement Distributions',
    fields: {
      'Box 1': { maps_to: 'gross_distribution' },
      'Box 2a': { maps_to: 'taxable_amount' },
      'Box 4': { maps_to: 'payments.line_25b_1099_withholding', aggregation: 'sum' },
      'Box 7': { maps_to: 'distribution_code', determines_taxability: true }
    }
  },
  '1099-B': {
    description: 'Broker Transactions',
    fields: {
      'Box 1d': { maps_to: 'proceeds' },
      'Box 1e': { maps_to: 'cost_basis' },
      'Calculated': { maps_to: 'income.line_7_capital_gain', formula: 'proceeds - cost_basis' }
    },
    triggers: ['Schedule D', 'Form 8949']
  },
  '1099-G': {
    description: 'Government Payments',
    fields: {
      'Box 1': { maps_to: 'schedule_1_income.line_7_unemployment' },
      'Box 2': { maps_to: 'schedule_1_income.line_1_taxable_refunds' },
      'Box 4': { maps_to: 'payments.line_25b_1099_withholding', aggregation: 'sum' }
    }
  },
  'SSA-1099': {
    description: 'Social Security Benefits',
    fields: {
      'Box 3': { maps_to: 'benefits_paid' },
      'Box 4': { maps_to: 'payments.line_25b_1099_withholding', aggregation: 'sum' },
      'Box 5': { maps_to: 'income.line_6a_social_security' }
    }
  },
  '1098': {
    description: 'Mortgage Interest',
    fields: {
      'Box 1': { maps_to: 'schedule_a.line_8_mortgage_interest' },
      'Box 2': { maps_to: 'mortgage_principal_balance', info_only: true },
      'Box 5': { maps_to: 'mortgage_insurance_premiums' },
      'Box 6': { maps_to: 'schedule_a.points_paid' }
    },
    triggers: ['Schedule A consideration']
  },
  '1098-T': {
    description: 'Tuition Statement',
    fields: {
      'Box 1': { maps_to: 'tuition_paid' },
      'Box 5': { maps_to: 'scholarships_grants' }
    },
    triggers: ['Form 8863', 'education_credits']
  },
  '1098-E': {
    description: 'Student Loan Interest',
    fields: {
      'Box 1': { maps_to: 'schedule_1_adjustments.line_21_student_loan_interest', max: 2500 }
    }
  }
};

// ============================================================
// CREDIT RULES
// ============================================================
export const CREDIT_RULES = {
  child_tax_credit: {
    amount_per_child: 2000,
    refundable_amount: 1700,
    age_limit: 17,
    phase_out: {
      single: { start: 200000, rate: 50 },
      married_filing_jointly: { start: 400000, rate: 50 }
    },
    requirements: ['ssn_required', 'lived_with_taxpayer_6_months', 'us_citizen_or_resident']
  },
  earned_income_credit: {
    max_amounts_2024: {
      no_children: 632,
      one_child: 4213,
      two_children: 6960,
      three_plus: 7830
    },
    income_limits: {
      single: { no_children: 18591, one_child: 49084, two_children: 55768, three_plus: 59899 },
      married_filing_jointly: { no_children: 25511, one_child: 56004, two_children: 62688, three_plus: 66819 }
    },
    investment_income_limit: 11600
  },
  american_opportunity_credit: {
    max_credit: 2500,
    expenses_covered: ['tuition', 'fees', 'books', 'supplies'],
    refundable_percent: 0.40,
    years_available: 4,
    phase_out: {
      single: { start: 80000, end: 90000 },
      married_filing_jointly: { start: 160000, end: 180000 }
    }
  },
  lifetime_learning_credit: {
    max_credit: 2000,
    percent_of_expenses: 0.20,
    refundable: false,
    phase_out: {
      single: { start: 80000, end: 90000 },
      married_filing_jointly: { start: 160000, end: 180000 }
    }
  }
};

// ============================================================
// INTERVIEW LOGIC - What to ask based on what we know
// ============================================================
export const INTERVIEW_LOGIC = {
  // Always ask these
  always_ask: [
    'filing_status',  // Never on any document
    'has_dependents', // Need to know for credits
  ],
  
  // Ask if condition is met
  conditional_questions: {
    // Spouse questions
    spouse_info: {
      condition: { field: 'filing_status', values: ['married_filing_jointly', 'married_filing_separately'] }
    },
    // Dependent details
    dependent_details: {
      condition: { field: 'has_dependents', value: true }
    },
    // Business questions
    business_income: {
      condition: { OR: [
        { document: '1099-NEC' },
        { field: 'has_business', value: true }
      ]}
    },
    business_expenses: {
      condition: { field: 'has_business', value: true }
    },
    // Interest details
    interest_details: {
      condition: { OR: [
        { document: '1099-INT' },
        { field: 'total_interest', gt: 1500 }
      ]}
    },
    // Itemized deduction questions
    itemized_questions: {
      condition: { field: 'deduction_type', value: 'itemized' }
    },
    // Education credits
    education_questions: {
      condition: { OR: [
        { document: '1098-T' },
        { field: 'has_education_expenses', value: true }
      ]}
    }
  },
  
  // Skip if we have from documents
  skip_if_have_document: {
    'income.line_1a_wages': ['W-2'],
    'income.line_2b_taxable_interest': ['1099-INT'],
    'income.line_3b_ordinary_dividends': ['1099-DIV'],
    'payments.line_25a_withholding': ['W-2']
  }
};

export default {
  FORM_1040_STRUCTURE,
  TAX_BRACKETS_2024,
  CAPITAL_GAINS_RATES_2024,
  DOCUMENT_MAPPING,
  CREDIT_RULES,
  INTERVIEW_LOGIC
};
