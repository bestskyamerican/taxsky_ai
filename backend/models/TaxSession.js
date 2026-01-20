// ============================================================
// TAX SESSION MODEL - COMPLETE FOR FORM 1040 (2025)
// ============================================================
// Location: backend/models/TaxSession.js
// 
// ✅ v3.0: ALL Form 1040 (2025) fields included
// ✅ v3.1: FIXED dependent age logic (age < 17 → age <= 16) per IRS CTC rules
// ✅ Added: owner field for taxpayer/spouse tracking
// ✅ Added: editHistory for CPA/Admin change tracking
// ✅ Added: taxResult for quick summary display
// ✅ Added: confirmed flag for CPA verification
// ============================================================

import mongoose from 'mongoose';

// ==============================================================
// LAYER 1: Raw Data Schema (OCR Extracted)
// ==============================================================
const RawUploadSchema = new mongoose.Schema({
  formType: {
    type: String,
    enum: ['W2', '1099-NEC', '1099-INT', '1099-DIV', '1099-B', '1099-G', '1099-R', 'SSA-1099', '1098'],
    required: true
  },
  fileName: String,
  uploadDate: { type: Date, default: Date.now },
  fileUrl: String,
  ocrExtracted: mongoose.Schema.Types.Mixed,
  ocrStatus: {
    type: String,
    enum: ['success', 'failed', 'pending'],
    default: 'pending'
  }
});

// ==============================================================
// LAYER 2: Normalized Data Schema (Standardized)
// ==============================================================
// ✅ UPDATED: Added 'owner' field for taxpayer/spouse tracking
// ✅ UPDATED: Added 'confirmed' flag for CPA verification
// ==============================================================
const W2Schema = new mongoose.Schema({
  owner: { type: String, enum: ['taxpayer', 'spouse'], default: 'taxpayer' },  // ✅ NEW
  employer: String,
  ein: String,
  wages: { type: Number, default: 0 },
  federal_withholding: { type: Number, default: 0 },
  social_security_wages: { type: Number, default: 0 },
  social_security_withheld: { type: Number, default: 0 },
  medicare_wages: { type: Number, default: 0 },
  medicare_withheld: { type: Number, default: 0 },
  state: String,                                                                // ✅ NEW
  state_wages: { type: Number, default: 0 },
  state_withholding: { type: Number, default: 0 },
  employee_name: String,
  employee_ssn: String,
  employee_address: String,
  confirmed: { type: Boolean, default: false }                                  // ✅ NEW
}, { _id: true });  // ✅ Changed to true for individual editing

const InterestSchema = new mongoose.Schema({
  owner: { type: String, enum: ['taxpayer', 'spouse'], default: 'taxpayer' },  // ✅ NEW
  payer: String,
  interest_income: { type: Number, default: 0 },
  tax_exempt_interest: { type: Number, default: 0 },
  federal_withholding: { type: Number, default: 0 },
  confirmed: { type: Boolean, default: false }                                  // ✅ NEW
}, { _id: true });

const DividendSchema = new mongoose.Schema({
  owner: { type: String, enum: ['taxpayer', 'spouse'], default: 'taxpayer' },  // ✅ NEW
  payer: String,
  ordinary_dividends: { type: Number, default: 0 },
  qualified_dividends: { type: Number, default: 0 },
  federal_withholding: { type: Number, default: 0 },
  confirmed: { type: Boolean, default: false }                                  // ✅ NEW
}, { _id: true });

const SelfEmploymentSchema = new mongoose.Schema({
  owner: { type: String, enum: ['taxpayer', 'spouse'], default: 'taxpayer' },  // ✅ NEW
  payer: String,
  nonemployee_compensation: { type: Number, default: 0 },
  federal_withholding: { type: Number, default: 0 },
  confirmed: { type: Boolean, default: false }                                  // ✅ NEW
}, { _id: true });

// ✅ NEW: 1099-R Schema (Retirement)
const RetirementSchema = new mongoose.Schema({
  owner: { type: String, enum: ['taxpayer', 'spouse'], default: 'taxpayer' },
  payer: String,
  gross_distribution: { type: Number, default: 0 },
  taxable_amount: { type: Number, default: 0 },
  federal_withholding: { type: Number, default: 0 },
  distribution_code: String,
  confirmed: { type: Boolean, default: false }
}, { _id: true });

// ✅ NEW: 1099-G Schema (Unemployment)
const UnemploymentSchema = new mongoose.Schema({
  owner: { type: String, enum: ['taxpayer', 'spouse'], default: 'taxpayer' },
  payer: String,
  compensation: { type: Number, default: 0 },
  federal_withholding: { type: Number, default: 0 },
  state_withholding: { type: Number, default: 0 },
  confirmed: { type: Boolean, default: false }
}, { _id: true });

// ✅ NEW: SSA-1099 Schema (Social Security)
const SocialSecuritySchema = new mongoose.Schema({
  owner: { type: String, enum: ['taxpayer', 'spouse'], default: 'taxpayer' },
  benefits: { type: Number, default: 0 },
  federal_withholding: { type: Number, default: 0 },
  confirmed: { type: Boolean, default: false }
}, { _id: true });

// ✅ NEW: Capital Gains Schema
const CapitalGainSchema = new mongoose.Schema({
  description: String,
  date_acquired: String,
  date_sold: String,
  proceeds: { type: Number, default: 0 },
  cost_basis: { type: Number, default: 0 },
  gain_or_loss: { type: Number, default: 0 },
  term: { type: String, enum: ['short', 'long'] },
  confirmed: { type: Boolean, default: false }
}, { _id: true });

// ✅ NEW: Rental Income Schema
const RentalSchema = new mongoose.Schema({
  owner: { type: String, enum: ['taxpayer', 'spouse'], default: 'taxpayer' },
  property_address: String,
  gross_rent: { type: Number, default: 0 },
  expenses: { type: Number, default: 0 },
  net_income: { type: Number, default: 0 },
  confirmed: { type: Boolean, default: false }
}, { _id: true });

const DependentSchema = new mongoose.Schema({
  first_name: String,
  last_name: String,
  ssn: String,
  relationship: String,
  date_of_birth: Date,
  age: Number,                                                                  // ✅ NEW
  months_lived_with: { type: Number, default: 12 },
  qualifies_for_child_credit: Boolean,
  qualifies_for_other_dependent_credit: Boolean,
  credit_type: { type: String, enum: ['child_tax_credit', 'other_dependent_credit'] },  // ✅ NEW
  confirmed: { type: Boolean, default: false }                                  // ✅ NEW
}, { _id: true });

// ✅ UPDATED: Normalized Data Schema with all income types
const NormalizedDataSchema = new mongoose.Schema({
  income: {
    w2: [W2Schema],
    interest: [InterestSchema],
    dividends: [DividendSchema],
    self_employment: [SelfEmploymentSchema],
    retirement: [RetirementSchema],                    // ✅ NEW: 1099-R
    unemployment: [UnemploymentSchema],                // ✅ UPDATED with schema
    social_security: [SocialSecuritySchema],           // ✅ UPDATED with schema
    capital_gains: [CapitalGainSchema],                // ✅ UPDATED with schema
    rentals: [RentalSchema]                            // ✅ NEW
  },
  deductions: {
    // Adjustments (Above the line)
    ira_taxpayer: { type: Number, default: 0 },        // ✅ NEW: Split by person
    ira_spouse: { type: Number, default: 0 },          // ✅ NEW
    hsa_contributions: { type: Number, default: 0 },
    student_loan_interest: { type: Number, default: 0 },
    se_tax_deduction: { type: Number, default: 0 },    // ✅ NEW
    educator_expenses: { type: Number, default: 0 },
    
    // Itemized Deductions
    mortgage_interest: { type: Number, default: 0 },
    points: { type: Number, default: 0 },
    property_tax: { type: Number, default: 0 },
    state_income_tax: { type: Number, default: 0 },
    charitable_cash: { type: Number, default: 0 },
    charitable_noncash: { type: Number, default: 0 },
    medical_expenses: { type: Number, default: 0 },
    
    // Legacy fields (keep for compatibility)
    ira_contributions: { type: Number, default: 0 },
    spouse_ira: { type: Number, default: 0 }
  },
  personal: {
    first_name: String,
    middle_initial: String,
    last_name: String,
    ssn: String,
    date_of_birth: Date,
    age: Number,                                       // ✅ NEW
    is_65_or_older: { type: Boolean, default: false }, // ✅ NEW
    is_blind: { type: Boolean, default: false },       // ✅ NEW
    occupation: String,
    phone: String,
    email: String,
    address: String,
    apt: String,
    city: String,
    state: String,
    zip: String,
    filing_status: {
      type: String,
      enum: ['single', 'married_filing_jointly', 'married_filing_separately', 'head_of_household', 'qualifying_surviving_spouse']
    },
    spouse_first_name: String,
    spouse_middle_initial: String,
    spouse_last_name: String,
    spouse_ssn: String,
    spouse_date_of_birth: Date,
    spouse_age: Number,                                // ✅ NEW
    spouse_is_65_or_older: { type: Boolean, default: false },  // ✅ NEW
    spouse_is_blind: { type: Boolean, default: false },        // ✅ NEW
    spouse_occupation: String
  },
  dependents: [DependentSchema],
  
  // ✅ NEW: Calculated totals (auto-summed)
  totals: {
    wages: { type: Number, default: 0 },
    interest: { type: Number, default: 0 },
    dividends: { type: Number, default: 0 },
    self_employment: { type: Number, default: 0 },
    retirement: { type: Number, default: 0 },
    social_security: { type: Number, default: 0 },
    unemployment: { type: Number, default: 0 },
    capital_gains: { type: Number, default: 0 },
    rental: { type: Number, default: 0 },
    total_income: { type: Number, default: 0 },
    total_adjustments: { type: Number, default: 0 },
    federal_withheld: { type: Number, default: 0 },
    state_withheld: { type: Number, default: 0 }
  }
}, { _id: false });

// ==============================================================
// LAYER 3: Form 1040 Schema (2025) - COMPLETE!
// ==============================================================
const Form1040Schema = new mongoose.Schema({
  // ═══════════════════════════════════════════════════════════
  // HEADER - Personal Info (ALL FIELDS)
  // ═══════════════════════════════════════════════════════════
  header: {
    tax_year: { type: Number, default: 2025 },
    
    // Taxpayer
    first_name: String,
    middle_initial: String,
    last_name: String,
    ssn: String,
    date_of_birth: String,
    occupation: String,
    phone: String,
    email: String,
    
    // Spouse
    spouse_first_name: String,
    spouse_middle_initial: String,
    spouse_last_name: String,
    spouse_ssn: String,
    spouse_date_of_birth: String,
    spouse_occupation: String,
    
    // Address
    address: String,
    apt: String,
    city: String,
    state: String,
    zip: String,
    
    // Foreign Address
    foreign_country: String,
    foreign_province: String,
    foreign_postal_code: String,
    
    // Filing Status
    filing_status: String,
    
    // Checkboxes
    presidential_campaign: { type: Boolean, default: false },
    presidential_campaign_spouse: { type: Boolean, default: false },
    digital_assets: { type: Boolean, default: false }
  },
  
  // ═══════════════════════════════════════════════════════════
  // INCOME - Lines 1-9 (2025 COMPLETE)
  // ═══════════════════════════════════════════════════════════
  income: {
    // Line 1: Wages breakdown
    line_1a_w2_wages: { type: Number, default: 0 },
    line_1b_household_employee: { type: Number, default: 0 },
    line_1c_tip_income: { type: Number, default: 0 },
    line_1d_medicaid_waiver: { type: Number, default: 0 },
    line_1e_dependent_care: { type: Number, default: 0 },
    line_1f_adoption_benefits: { type: Number, default: 0 },
    line_1g_form_8919: { type: Number, default: 0 },
    line_1h_other_earned: { type: Number, default: 0 },
    line_1i_nontaxable_combat: { type: Number, default: 0 },
    line_1z_total_wages: { type: Number, default: 0 },
    line_1_wages: { type: Number, default: 0 },  // Legacy
    
    // Lines 2-9
    line_2a_tax_exempt_interest: { type: Number, default: 0 },
    line_2b_taxable_interest: { type: Number, default: 0 },
    line_3a_qualified_dividends: { type: Number, default: 0 },
    line_3b_ordinary_dividends: { type: Number, default: 0 },
    line_4a_ira_distributions: { type: Number, default: 0 },
    line_4b_taxable_ira: { type: Number, default: 0 },
    line_5a_pensions: { type: Number, default: 0 },
    line_5b_taxable_pensions: { type: Number, default: 0 },
    line_6a_social_security: { type: Number, default: 0 },
    line_6b_taxable_social_security: { type: Number, default: 0 },
    line_7_capital_gain: { type: Number, default: 0 },
    line_8_schedule_1_income: { type: Number, default: 0 },
    line_9_total_income: { type: Number, default: 0 }
  },
  
  // ═══════════════════════════════════════════════════════════
  // ADJUSTMENTS - Lines 10-11
  // ═══════════════════════════════════════════════════════════
  adjustments: {
    line_10_schedule_1_adjustments: { type: Number, default: 0 },
    line_11_agi: { type: Number, default: 0 }
  },
  
  // ═══════════════════════════════════════════════════════════
  // DEDUCTIONS - Lines 12-15 (2025 with line_13b!)
  // ═══════════════════════════════════════════════════════════
  deductions: {
    line_12_deduction: { type: Number, default: 0 },
    line_12_standard_or_itemized: String,
    line_13a_qbi: { type: Number, default: 0 },
    line_13b_additional_deductions: { type: Number, default: 0 },  // NEW 2025!
    line_13_qbi: { type: Number, default: 0 },  // Legacy
    line_14_total_deductions: { type: Number, default: 0 },
    line_15_taxable_income: { type: Number, default: 0 }
  },
  
  // ═══════════════════════════════════════════════════════════
  // TAX AND CREDITS - Lines 16-24
  // ═══════════════════════════════════════════════════════════
  tax_and_credits: {
    line_16_tax: { type: Number, default: 0 },
    line_16_form_8814: { type: Boolean, default: false },
    line_16_form_4972: { type: Boolean, default: false },
    line_16_other_form: String,
    line_17_schedule_2_line_3: { type: Number, default: 0 },
    line_17_schedule_2_taxes: { type: Number, default: 0 },  // Legacy
    line_18_total: { type: Number, default: 0 },
    line_18_total_tax: { type: Number, default: 0 },  // Legacy
    line_19_child_credit: { type: Number, default: 0 },
    line_20_schedule_3_line_8: { type: Number, default: 0 },
    line_20_schedule_3_credits: { type: Number, default: 0 },  // Legacy
    line_21_total_credits: { type: Number, default: 0 },
    line_22_tax_after_credits: { type: Number, default: 0 },
    line_23_schedule_2_line_21: { type: Number, default: 0 },
    line_23_schedule_2_other_taxes: { type: Number, default: 0 },  // Legacy
    line_24_total_tax: { type: Number, default: 0 }
  },
  
  // ═══════════════════════════════════════════════════════════
  // PAYMENTS - Lines 25-33 (2025 COMPLETE!)
  // ═══════════════════════════════════════════════════════════
  payments: {
    line_25a_w2_withholding: { type: Number, default: 0 },
    line_25b_1099_withholding: { type: Number, default: 0 },
    line_25c_other_withholding: { type: Number, default: 0 },
    line_25d_total_withholding: { type: Number, default: 0 },
    line_26_estimated_payments: { type: Number, default: 0 },
    line_27_eic: { type: Number, default: 0 },
    line_28_actc: { type: Number, default: 0 },
    line_28_schedule_3_credits: { type: Number, default: 0 },  // Legacy
    line_29_american_opportunity: { type: Number, default: 0 },  // NEW 2025!
    line_30_adoption_credit: { type: Number, default: 0 },       // NEW 2025!
    line_31_schedule_3_line_15: { type: Number, default: 0 },    // NEW 2025!
    line_32_total_other_payments: { type: Number, default: 0 },  // NEW 2025!
    line_33_total_payments: { type: Number, default: 0 },        // 2025 (was line_29!)
    line_29_total_payments: { type: Number, default: 0 }         // Legacy
  },
  
  // ═══════════════════════════════════════════════════════════
  // REFUND - Lines 34-36 (2025 COMPLETE!)
  // ═══════════════════════════════════════════════════════════
  refund: {
    line_34_overpaid: { type: Number, default: 0 },              // 2025 (was line_33!)
    line_35a_refund: { type: Number, default: 0 },
    line_35b_routing_number: String,
    line_35c_account_type: String,
    line_35d_account_number: String,
    line_36_apply_to_next_year: { type: Number, default: 0 }     // 2025 (was line_34!)
  },
  
  // ═══════════════════════════════════════════════════════════
  // AMOUNT OWED - Lines 37-38
  // ═══════════════════════════════════════════════════════════
  amount_owed: {
    line_37_amount_owed: { type: Number, default: 0 },
    line_38_estimated_penalty: { type: Number, default: 0 }
  },
  
  // ═══════════════════════════════════════════════════════════
  // LEGACY: refund_or_owe (keep for backward compatibility)
  // ═══════════════════════════════════════════════════════════
  refund_or_owe: {
    line_33_overpayment: { type: Number, default: 0 },
    line_34_apply_to_2025: { type: Number, default: 0 },
    line_35_refund: { type: Number, default: 0 },
    line_36_routing_number: String,
    line_36_account_number: String,
    line_37_amount_owe: { type: Number, default: 0 },
    line_38_estimated_penalty: { type: Number, default: 0 }
  },
  
  // ═══════════════════════════════════════════════════════════
  // SCHEDULES
  // ═══════════════════════════════════════════════════════════
  schedules: {
    schedule_1: mongoose.Schema.Types.Mixed,
    schedule_2: mongoose.Schema.Types.Mixed,
    schedule_3: mongoose.Schema.Types.Mixed,
    schedule_a: mongoose.Schema.Types.Mixed,
    schedule_b: mongoose.Schema.Types.Mixed,
    schedule_c: mongoose.Schema.Types.Mixed,
    schedule_d: mongoose.Schema.Types.Mixed,
    schedule_e: mongoose.Schema.Types.Mixed,
    schedule_se: mongoose.Schema.Types.Mixed
  }
}, { _id: false });

// ==============================================================
// ✅ NEW: Tax Result Schema (Quick Summary for Dashboard)
// ==============================================================
const TaxResultSchema = new mongoose.Schema({
  // Federal
  total_income: { type: Number, default: 0 },
  agi: { type: Number, default: 0 },
  standard_deduction: { type: Number, default: 0 },
  itemized_deduction: { type: Number, default: 0 },
  deduction_type: { type: String, enum: ['standard', 'itemized'], default: 'standard' },
  taxable_income: { type: Number, default: 0 },
  bracket_tax: { type: Number, default: 0 },
  se_tax: { type: Number, default: 0 },
  total_tax: { type: Number, default: 0 },
  child_tax_credit: { type: Number, default: 0 },
  other_dependent_credit: { type: Number, default: 0 },
  eitc: { type: Number, default: 0 },
  actc: { type: Number, default: 0 },
  total_credits: { type: Number, default: 0 },
  tax_after_credits: { type: Number, default: 0 },
  federal_withheld: { type: Number, default: 0 },
  refund: { type: Number, default: 0 },
  amount_owed: { type: Number, default: 0 },
  
  // State (California)
  state: { type: String, default: 'CA' },
  state_agi: { type: Number, default: 0 },
  state_deduction: { type: Number, default: 0 },
  state_taxable_income: { type: Number, default: 0 },
  state_tax: { type: Number, default: 0 },
  state_credits: { type: Number, default: 0 },
  caleitc: { type: Number, default: 0 },
  yctc: { type: Number, default: 0 },
  state_withheld: { type: Number, default: 0 },
  state_refund: { type: Number, default: 0 },
  state_owed: { type: Number, default: 0 },
  
  // Combined
  total_refund: { type: Number, default: 0 },
  total_owed: { type: Number, default: 0 }
}, { _id: false });

// ==============================================================
// ✅ NEW: Edit History Schema (Track CPA/Admin Changes)
// ==============================================================
const EditHistorySchema = new mongoose.Schema({
  edited_by: { type: String, enum: ['user', 'cpa', 'admin', 'system'], default: 'user' },
  edited_at: { type: Date, default: Date.now },
  field_path: String,           // e.g., 'normalizedData.income.w2.0.wages'
  field_label: String,          // e.g., 'W-2 #1 Wages'
  old_value: mongoose.Schema.Types.Mixed,
  new_value: mongoose.Schema.Types.Mixed,
  reason: String
}, { _id: true });

// ==============================================================
// LAYER 4: Validation Schema
// ==============================================================
const ValidationSchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ['incomplete', 'needs_review', 'ready_to_file', 'filed'],
    default: 'incomplete'
  },
  last_validated: Date,
  completeness: {
    required_fields: {
      complete: { type: Boolean, default: false },
      missing: [String]
    },
    high_value_items: {
      checked: { type: Boolean, default: false },
      opportunities: [{
        field: String,
        value: Number,
        message: String
      }]
    },
    optional_items: {
      checked: { type: Boolean, default: false },
      skipped: [String]
    }
  },
  accuracy_checks: {
    income_matches_forms: { type: Boolean, default: false },
    withholding_matches_forms: { type: Boolean, default: false },
    credits_calculated_correctly: { type: Boolean, default: false },
    deduction_choice_optimal: { type: Boolean, default: false },
    math_errors: [String]
  },
  warnings: [{
    severity: { type: String, enum: ['low', 'medium', 'high'] },
    message: String,
    field: String
  }],
  errors: [{
    message: String,
    field: String,
    required_action: String
  }],
  ai_review: {
    reviewed_at: Date,
    model: String,
    confidence: Number,
    recommendation: String,
    notes: [String]
  }
}, { 
  _id: false,
  suppressReservedKeysWarning: true
});

// ==============================================================
// MESSAGE SCHEMA
// ==============================================================
const MessageSchema = new mongoose.Schema({
  sender: { type: String, required: true },
  text: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
}, { _id: false });

// ==============================================================
// MAIN TAX SESSION SCHEMA
// ==============================================================
const TaxSessionSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true
  },
  taxYear: {
    type: Number,
    default: 2025,
    required: true,
    set: function(v) {
      return v || 2025;
    }
  },
  
  messages: {
    type: [MessageSchema],
    default: []
  },
  
  answers: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: () => new Map()
  },
  forms: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: () => new Map()
  },
  stepIndex: { type: Number, default: 0 },
  
  rawData: {
    uploads: [RawUploadSchema]
  },
  
  normalizedData: {
    type: NormalizedDataSchema,
    default: () => ({
      income: { w2: [], interest: [], dividends: [], self_employment: [], retirement: [], unemployment: [], social_security: [], capital_gains: [], rentals: [] },
      personal: {},
      dependents: [],
      deductions: {},
      totals: {}
    })
  },
  
  form1040: {
    type: Form1040Schema,
    default: () => ({
      header: { tax_year: 2025 },
      income: {},
      payments: {},
      refund: {},
      refund_or_owe: {}
    })
  },
  
  // ✅ NEW: Tax Result (Quick Summary)
  taxResult: {
    type: TaxResultSchema,
    default: () => ({})
  },
  
  // ✅ NEW: Edit History (Track CPA/Admin Changes)
  editHistory: {
    type: [EditHistorySchema],
    default: []
  },
  
  validation: ValidationSchema,
  
  interviewState: {
    currentStep: { type: String, default: 'welcome' },
    lastQuestionField: String,
    completedSteps: { type: [String], default: [] }
  },
  lastQuestionField: String,
  
  status: {
    type: String,
    enum: [
      'in_progress',
      'ready_for_extraction',
      'extracting',                // ✅ NEW
      'extracted',                 // ✅ NEW
      'ready_for_review',
      'cpa_review',                // ✅ NEW
      'cpa_approved',              // ✅ NEW
      'ready_to_file',
      'submitted_cpa',
      'filed',
      'accepted',
      'rejected'
    ],
    default: 'in_progress'
  },
  
  // ✅ NEW: RAG Verification
  ragVerified: { type: Boolean, default: false },
  validationErrors: [String],
  
  // ✅ NEW: CPA/Admin Info
  assignedCpa: String,
  cpaReviewedAt: Date,
  cpaComments: String,
  cpaApprovedAt: Date,
  
  // ✅ NEW: Filing Info
  filedAt: Date,
  confirmationNumber: String,
  irsStatus: String,
  
  // ✅ NEW: Extraction timestamps
  extractedAt: Date,
  lastCalculatedAt: Date,
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  completedAt: Date
}, {
  minimize: false,
  strict: false,
  timestamps: false
});

// ==============================================================
// INDEXES
// ==============================================================
TaxSessionSchema.index({ userId: 1, taxYear: 1 }, { unique: true });
TaxSessionSchema.index({ status: 1 });
TaxSessionSchema.index({ assignedCpa: 1 });

// ==============================================================
// HOOKS
// ==============================================================
TaxSessionSchema.pre('validate', function() {
  if (this.taxYear === null || this.taxYear === undefined) {
    this.taxYear = 2025;
  }
  if (!this.messages) {
    this.messages = [];
  }
});

TaxSessionSchema.pre('save', function() {
  this.updatedAt = new Date();
  if (this.taxYear === null || this.taxYear === undefined) {
    this.taxYear = 2025;
  }
  if (!this.messages) {
    this.messages = [];
  }
});

TaxSessionSchema.post('save', function(doc) {
  console.log(`✅ [POST-SAVE] Saved _id=${doc._id}, taxYear=${doc.taxYear}, status=${doc.status}`);
});

// ==============================================================
// STATICS
// ==============================================================
TaxSessionSchema.statics.findOrCreate = async function(userId, taxYear = 2025) {
  if (!userId || userId === 'undefined' || userId === 'null' || userId === '') {
    throw new Error(`Invalid userId: "${userId}"`);
  }
  
  const year = parseInt(taxYear) || 2025;
  let session = await this.findOne({ userId, taxYear: year });
  
  if (!session) {
    session = await this.findOne({ userId, taxYear: null });
    if (session) {
      session.taxYear = year;
      await session.save();
      return session;
    }
    
    session = new this({ 
      userId, 
      taxYear: year,
      messages: [],
      normalizedData: {
        income: { w2: [], interest: [], dividends: [], self_employment: [], retirement: [], unemployment: [], social_security: [], capital_gains: [], rentals: [] },
        personal: {},
        dependents: [],
        deductions: {},
        totals: {}
      },
      form1040: {
        header: { tax_year: year },
        income: {},
        payments: {},
        refund: {},
        refund_or_owe: {}
      },
      taxResult: {},
      editHistory: []
    });
    await session.save();
    console.log(`[TAX SESSION] ✅ Created new session for userId=${userId}, taxYear=${year}`);
  }
  
  return session;
};

TaxSessionSchema.statics.validateUserId = function(userId) {
  if (!userId || userId === 'undefined' || userId === 'null' || userId === '') {
    return { valid: false, error: `Invalid userId: "${userId}"` };
  }
  return { valid: true };
};

// ==============================================================
// METHODS
// ==============================================================
TaxSessionSchema.methods.addMessage = function(sender, text) {
  if (!this.messages) this.messages = [];
  this.messages.push({ sender, text, timestamp: new Date() });
  this.markModified('messages');
  return this;
};

// ✅ NEW: Add edit to history
TaxSessionSchema.methods.addEditHistory = function(editedBy, fieldPath, fieldLabel, oldValue, newValue, reason = '') {
  if (!this.editHistory) this.editHistory = [];
  this.editHistory.push({
    edited_by: editedBy,
    edited_at: new Date(),
    field_path: fieldPath,
    field_label: fieldLabel,
    old_value: oldValue,
    new_value: newValue,
    reason: reason
  });
  this.markModified('editHistory');
  return this;
};

// ✅ UPDATED: Save W-2 with owner tracking
TaxSessionSchema.methods.saveW2 = function(w2Data, owner = 'taxpayer') {
  if (!this.normalizedData) this.normalizedData = {};
  if (!this.normalizedData.income) this.normalizedData.income = {};
  if (!this.normalizedData.income.w2) this.normalizedData.income.w2 = [];
  
  const w2 = {
    owner: owner,
    employer: w2Data.employer || w2Data.employerName || '',
    ein: w2Data.ein || w2Data.employerEIN || '',
    wages: parseFloat(String(w2Data.wages || 0).replace(/[$,]/g, '')) || 0,
    federal_withholding: parseFloat(String(w2Data.federal_withholding || w2Data.federalWithheld || 0).replace(/[$,]/g, '')) || 0,
    state: w2Data.state || '',
    state_withholding: parseFloat(String(w2Data.state_withholding || w2Data.stateWithheld || 0).replace(/[$,]/g, '')) || 0,
    state_wages: parseFloat(String(w2Data.state_wages || w2Data.stateWages || 0).replace(/[$,]/g, '')) || 0,
    employee_name: w2Data.employee_name || w2Data.employeeName || '',
    employee_ssn: w2Data.employee_ssn || w2Data.ssn || '',
    confirmed: false
  };
  
  this.normalizedData.income.w2.push(w2);
  this.forms.set('W-2', w2Data);
  this.recalculateTotals();
  this.markModified('normalizedData.income.w2');
  this.markModified('forms');
  
  return w2;
};

// ✅ UPDATED: Recalculate totals with all income types
TaxSessionSchema.methods.recalculateTotals = function() {
  const income = this.normalizedData?.income || {};
  const deductions = this.normalizedData?.deductions || {};
  const answers = this.answers instanceof Map ? Object.fromEntries(this.answers) : (this.answers || {});
  
  const parseNum = (val) => {
    if (!val) return 0;
    if (typeof val === 'number') return val;
    return parseFloat(String(val).replace(/[$,]/g, '')) || 0;
  };
  
  // Sum W-2s
  let totalWages = 0, totalFedWithheld = 0, totalStateWithheld = 0;
  (income.w2 || []).forEach(w2 => {
    totalWages += parseNum(w2.wages);
    totalFedWithheld += parseNum(w2.federal_withholding);
    totalStateWithheld += parseNum(w2.state_withholding);
  });
  
  // Fallback to answers
  if (totalWages === 0) {
    totalWages = parseNum(answers.wages) || parseNum(answers.taxpayer_wages);
    if (answers.spouse_wages) totalWages += parseNum(answers.spouse_wages);
  }
  if (totalFedWithheld === 0) {
    totalFedWithheld = parseNum(answers.federal_withheld) || parseNum(answers.taxpayer_federal_withheld);
    if (answers.spouse_federal_withheld) totalFedWithheld += parseNum(answers.spouse_federal_withheld);
  }
  
  // Sum 1099-NEC
  let totalSelfEmployment = 0;
  (income.self_employment || []).forEach(se => {
    totalSelfEmployment += parseNum(se.nonemployee_compensation);
  });
  if (totalSelfEmployment === 0) {
    totalSelfEmployment = parseNum(answers.self_employment_income) || parseNum(answers.taxpayer_1099nec);
  }
  
  // Sum Interest & Dividends
  let totalInterest = 0, totalDividends = 0, totalQualifiedDividends = 0;
  (income.interest || []).forEach(i => totalInterest += parseNum(i.interest_income));
  (income.dividends || []).forEach(d => {
    totalDividends += parseNum(d.ordinary_dividends);
    totalQualifiedDividends += parseNum(d.qualified_dividends);
  });
  if (totalInterest === 0) totalInterest = parseNum(answers.interest_income);
  if (totalDividends === 0) totalDividends = parseNum(answers.dividend_income);
  
  // ✅ NEW: Sum Retirement (1099-R)
  let totalRetirement = 0, totalRetirementWithheld = 0;
  (income.retirement || []).forEach(r => {
    totalRetirement += parseNum(r.taxable_amount);
    totalRetirementWithheld += parseNum(r.federal_withholding);
  });
  totalFedWithheld += totalRetirementWithheld;
  
  // ✅ NEW: Sum Social Security (SSA-1099)
  let totalSocialSecurity = 0;
  (income.social_security || []).forEach(ss => {
    totalSocialSecurity += parseNum(ss.benefits);
  });
  const taxableSS = Math.round(totalSocialSecurity * 0.85);  // Simplified
  
  // ✅ NEW: Sum Unemployment (1099-G)
  let totalUnemployment = 0;
  (income.unemployment || []).forEach(u => {
    totalUnemployment += parseNum(u.compensation);
  });
  
  // ✅ NEW: Sum Capital Gains
  let totalCapitalGains = 0;
  (income.capital_gains || []).forEach(cg => {
    totalCapitalGains += parseNum(cg.gain_or_loss);
  });
  const netCapitalGains = Math.max(-3000, totalCapitalGains);  // Loss limit
  
  // ✅ NEW: Sum Rentals
  let totalRental = 0;
  (income.rentals || []).forEach(r => {
    totalRental += parseNum(r.net_income);
  });
  
  // Total Income
  const totalIncome = totalWages + totalInterest + totalDividends + totalSelfEmployment + 
                      totalRetirement + taxableSS + totalUnemployment + netCapitalGains + totalRental;
  
  // ✅ NEW: Sum Adjustments
  const totalAdjustments = parseNum(deductions.ira_taxpayer) + parseNum(deductions.ira_spouse) +
                           parseNum(deductions.hsa_contributions) + parseNum(deductions.student_loan_interest) +
                           parseNum(deductions.se_tax_deduction) + parseNum(deductions.educator_expenses);
  
  // Update totals
  if (!this.normalizedData.totals) this.normalizedData.totals = {};
  this.normalizedData.totals.wages = totalWages;
  this.normalizedData.totals.interest = totalInterest;
  this.normalizedData.totals.dividends = totalDividends;
  this.normalizedData.totals.self_employment = totalSelfEmployment;
  this.normalizedData.totals.retirement = totalRetirement;
  this.normalizedData.totals.social_security = totalSocialSecurity;
  this.normalizedData.totals.unemployment = totalUnemployment;
  this.normalizedData.totals.capital_gains = netCapitalGains;
  this.normalizedData.totals.rental = totalRental;
  this.normalizedData.totals.total_income = totalIncome;
  this.normalizedData.totals.total_adjustments = totalAdjustments;
  this.normalizedData.totals.federal_withheld = totalFedWithheld;
  this.normalizedData.totals.state_withheld = totalStateWithheld;
  
  // Update form1040
  if (!this.form1040) this.form1040 = {};
  if (!this.form1040.income) this.form1040.income = {};
  if (!this.form1040.payments) this.form1040.payments = {};
  
  // 2025 fields
  this.form1040.income.line_1a_w2_wages = totalWages;
  this.form1040.income.line_1z_total_wages = totalWages;
  this.form1040.income.line_1_wages = totalWages;
  this.form1040.income.line_2b_taxable_interest = totalInterest;
  this.form1040.income.line_3a_qualified_dividends = totalQualifiedDividends;
  this.form1040.income.line_3b_ordinary_dividends = totalDividends;
  this.form1040.income.line_4b_taxable_ira = totalRetirement;
  this.form1040.income.line_6a_social_security = totalSocialSecurity;
  this.form1040.income.line_6b_taxable_social_security = taxableSS;
  this.form1040.income.line_7_capital_gain = netCapitalGains;
  this.form1040.income.line_8_schedule_1_income = totalSelfEmployment + totalRental + totalUnemployment;
  this.form1040.income.line_9_total_income = totalIncome;
  
  this.form1040.payments.line_25a_w2_withholding = totalFedWithheld;
  this.form1040.payments.line_25d_total_withholding = totalFedWithheld;
  this.form1040.payments.line_33_total_payments = totalFedWithheld;
  this.form1040.payments.line_29_total_payments = totalFedWithheld;
  
  this.markModified('normalizedData.totals');
  this.markModified('form1040');
  
  return { 
    totalWages, totalInterest, totalDividends, totalSelfEmployment, 
    totalRetirement, totalSocialSecurity, totalUnemployment, 
    totalCapitalGains: netCapitalGains, totalRental,
    totalIncome, totalAdjustments, totalFedWithheld, totalStateWithheld 
  };
};

TaxSessionSchema.methods.getIncomeSummary = function() {
  const totals = this.recalculateTotals();
  return {
    wages: totals.totalWages,
    w2_wages: totals.totalWages,
    interest_income: totals.totalInterest,
    dividend_income: totals.totalDividends,
    self_employment: totals.totalSelfEmployment,
    retirement: totals.totalRetirement,
    social_security: totals.totalSocialSecurity,
    unemployment: totals.totalUnemployment,
    capital_gains: totals.totalCapitalGains,
    rental: totals.totalRental,
    total_income: totals.totalIncome,
    adjustments: totals.totalAdjustments,
    federal_withheld: totals.totalFedWithheld,
    state_withheld: totals.totalStateWithheld
  };
};

TaxSessionSchema.methods.getPersonalInfo = function() {
  const personal = this.normalizedData?.personal || {};
  const header = this.form1040?.header || {};
  const getAnswer = (key) => {
    if (this.answers instanceof Map) return this.answers.get(key);
    return this.answers?.[key];
  };
  
  return {
    first_name: personal.first_name || header.first_name || '',
    last_name: personal.last_name || header.last_name || '',
    ssn: personal.ssn || header.ssn || '',
    date_of_birth: personal.date_of_birth || header.date_of_birth || '',
    age: personal.age || 0,
    is_65_or_older: personal.is_65_or_older || false,
    address: personal.address || header.address || '',
    apt: personal.apt || header.apt || '',
    city: personal.city || header.city || '',
    state: personal.state || header.state || '',
    zip: personal.zip || header.zip || '',
    phone: personal.phone || header.phone || '',
    email: personal.email || header.email || '',
    occupation: personal.occupation || header.occupation || '',
    filing_status: personal.filing_status || header.filing_status || getAnswer('filing_status') || '',
    spouse_first_name: personal.spouse_first_name || header.spouse_first_name || '',
    spouse_last_name: personal.spouse_last_name || header.spouse_last_name || '',
    spouse_ssn: personal.spouse_ssn || header.spouse_ssn || '',
    spouse_age: personal.spouse_age || 0,
    spouse_is_65_or_older: personal.spouse_is_65_or_older || false
  };
};

// ✅ v3.1 FIXED: getDependents() - Changed age < 17 to age <= 16 for CTC eligibility
// IRS Rule: Child must be UNDER 17 at end of tax year (i.e., age 16 or younger)
TaxSessionSchema.methods.getDependents = function() {
  return (this.normalizedData?.dependents || []).map((dep, index) => {
    let age = dep.age;
    if (!age && dep.date_of_birth) {
      const birth = new Date(dep.date_of_birth);
      const today = new Date();
      age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    }
    
    return {
      _id: dep._id,
      index,
      first_name: dep.first_name || '',
      last_name: dep.last_name || '',
      ssn: dep.ssn || '',
      relationship: dep.relationship || '',
      date_of_birth: dep.date_of_birth ? new Date(dep.date_of_birth).toISOString().split('T')[0] : '',
      age,
      // ✅ FIXED: CTC requires child to be UNDER 17 at end of tax year (age <= 16)
      credit_type: age !== null && age <= 16 ? 'child_tax_credit' : 'other_dependent_credit',
      qualifies_for_child_credit: age !== null && age <= 16,
      qualifies_for_other_dependent_credit: age !== null && age >= 17,
      confirmed: dep.confirmed || false
    };
  });
};

TaxSessionSchema.methods.updatePersonalInfo = function(data, editedBy = 'user') {
  if (!this.normalizedData) this.normalizedData = {};
  if (!this.normalizedData.personal) this.normalizedData.personal = {};
  if (!this.form1040) this.form1040 = {};
  if (!this.form1040.header) this.form1040.header = {};
  
  const fields = [
    'first_name', 'middle_initial', 'last_name', 'ssn', 'date_of_birth', 'age', 'is_65_or_older',
    'address', 'apt', 'city', 'state', 'zip',
    'phone', 'email', 'occupation', 'filing_status', 
    'spouse_first_name', 'spouse_middle_initial', 'spouse_last_name', 'spouse_ssn', 
    'spouse_date_of_birth', 'spouse_age', 'spouse_is_65_or_older', 'spouse_occupation'
  ];
  
  fields.forEach(field => {
    if (data[field] !== undefined) {
      const oldValue = this.normalizedData.personal[field];
      this.normalizedData.personal[field] = data[field];
      this.form1040.header[field] = data[field];
      
      // Track edit
      if (oldValue !== data[field] && editedBy !== 'system') {
        this.addEditHistory(editedBy, `personal.${field}`, field, oldValue, data[field]);
      }
    }
  });
  
  this.markModified('normalizedData.personal');
  this.markModified('form1040.header');
};

// ✅ v3.1 FIXED: updateDependent() - Changed age < 17 to age <= 16 for CTC eligibility
// IRS Rule: Child must be UNDER 17 at end of tax year (i.e., age 16 or younger)
TaxSessionSchema.methods.updateDependent = function(index, data, editedBy = 'user') {
  if (!this.normalizedData) this.normalizedData = {};
  if (!this.normalizedData.dependents) this.normalizedData.dependents = [];
  
  let age = data.age;
  if (!age && data.date_of_birth) {
    const birth = new Date(data.date_of_birth);
    const today = new Date();
    age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  }
  
  const dependent = {
    first_name: data.first_name || '',
    last_name: data.last_name || '',
    ssn: data.ssn || '',
    relationship: data.relationship || '',
    date_of_birth: data.date_of_birth ? new Date(data.date_of_birth) : null,
    age: age,
    months_lived_with: 12,
    // ✅ FIXED: CTC requires child to be UNDER 17 at end of tax year (age <= 16)
    credit_type: age !== null && age <= 16 ? 'child_tax_credit' : 'other_dependent_credit',
    qualifies_for_child_credit: age !== null && age <= 16,
    qualifies_for_other_dependent_credit: age !== null && age >= 17,
    confirmed: data.confirmed || false
  };
  
  if (index !== undefined && index < this.normalizedData.dependents.length) {
    // Track edit
    if (editedBy !== 'system') {
      this.addEditHistory(editedBy, `dependents.${index}`, `Dependent #${index + 1}`, 
        this.normalizedData.dependents[index], dependent);
    }
    this.normalizedData.dependents[index] = dependent;
  } else {
    this.normalizedData.dependents.push(dependent);
  }
  
  this.markModified('normalizedData.dependents');
  return dependent;
};

// ✅ NEW: Update W-2 by index
TaxSessionSchema.methods.updateW2 = function(index, data, editedBy = 'user') {
  if (!this.normalizedData?.income?.w2) return null;
  if (index < 0 || index >= this.normalizedData.income.w2.length) return null;
  
  const oldW2 = { ...this.normalizedData.income.w2[index] };
  
  Object.keys(data).forEach(key => {
    if (data[key] !== undefined) {
      this.normalizedData.income.w2[index][key] = data[key];
    }
  });
  
  // Track edit
  if (editedBy !== 'system') {
    this.addEditHistory(editedBy, `income.w2.${index}`, 
      `W-2 #${index + 1} (${oldW2.employer || 'Unknown'})`, oldW2, data);
  }
  
  this.markModified('normalizedData.income.w2');
  this.recalculateTotals();
  
  return this.normalizedData.income.w2[index];
};

// ✅ NEW: Delete W-2 by index
TaxSessionSchema.methods.deleteW2 = function(index, editedBy = 'user') {
  if (!this.normalizedData?.income?.w2) return false;
  if (index < 0 || index >= this.normalizedData.income.w2.length) return false;
  
  const deleted = this.normalizedData.income.w2.splice(index, 1)[0];
  
  // Track edit
  if (editedBy !== 'system') {
    this.addEditHistory(editedBy, `income.w2.${index}`, 
      `Deleted W-2 (${deleted.employer || 'Unknown'})`, deleted, null, 'Deleted');
  }
  
  this.markModified('normalizedData.income.w2');
  this.recalculateTotals();
  
  return true;
};

// ✅ NEW: Get tax summary for dashboard
TaxSessionSchema.methods.getTaxSummary = function() {
  const tr = this.taxResult || {};
  const f = this.form1040 || {};
  
  return {
    // Federal
    total_income: tr.total_income || f.income?.line_9_total_income || 0,
    agi: tr.agi || f.adjustments?.line_11_agi || 0,
    taxable_income: tr.taxable_income || f.deductions?.line_15_taxable_income || 0,
    federal_tax: tr.tax_after_credits || f.tax_and_credits?.line_24_total_tax || 0,
    withholding: tr.federal_withheld || f.payments?.line_25d_total_withholding || 0,
    federal_refund: tr.refund || f.refund?.line_35a_refund || 0,
    federal_owed: tr.amount_owed || f.amount_owed?.line_37_amount_owed || 0,
    
    // State
    state_refund: tr.state_refund || 0,
    state_owed: tr.state_owed || 0,
    
    // Combined
    total_refund: tr.total_refund || (tr.refund || 0) + (tr.state_refund || 0),
    total_owed: tr.total_owed || (tr.amount_owed || 0) + (tr.state_owed || 0),
    
    // Status
    status: this.status,
    ragVerified: this.ragVerified
  };
};

TaxSessionSchema.methods.getAllRawData = function() {
  const answersObj = {};
  if (this.answers instanceof Map) {
    this.answers.forEach((v, k) => { answersObj[k] = v; });
  } else if (this.answers) {
    Object.assign(answersObj, this.answers);
  }
  
  const formsObj = {};
  if (this.forms instanceof Map) {
    this.forms.forEach((v, k) => { formsObj[k] = v; });
  } else if (this.forms) {
    Object.assign(formsObj, this.forms);
  }
  
  return {
    answers: answersObj,
    forms: formsObj,
    rawUploads: this.rawUploads || [],
    normalizedData: this.normalizedData || {},
    form1040: this.form1040 || {},
    taxResult: this.taxResult || {},
    editHistory: this.editHistory || [],
    chatPhase: this.chat?.phase || 'welcome',
    status: this.status,
    ragVerified: this.ragVerified
  };
};

// ==============================================================
// Export
// ==============================================================
const TaxSession = mongoose.models.TaxSession || mongoose.model('TaxSession', TaxSessionSchema);

export default TaxSession;