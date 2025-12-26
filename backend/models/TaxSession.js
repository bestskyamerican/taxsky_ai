// models/TaxSession.js - Complete Data Architecture (FIXED)

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
  ocrExtracted: mongoose.Schema.Types.Mixed,  // Raw OCR response
  ocrStatus: {
    type: String,
    enum: ['success', 'failed', 'pending'],
    default: 'pending'
  }
});

// ==============================================================
// LAYER 2: Normalized Data Schema (Standardized)
// ==============================================================
const W2Schema = new mongoose.Schema({
  employer: String,
  ein: String,
  wages: Number,
  federal_withholding: Number,
  social_security_wages: Number,
  social_security_withheld: Number,
  medicare_wages: Number,
  medicare_withheld: Number,
  state_wages: Number,
  state_withholding: Number,
  employee_name: String,
  employee_ssn: String,
  employee_address: String
}, { _id: false });

const InterestSchema = new mongoose.Schema({
  payer: String,
  interest_income: Number,
  tax_exempt_interest: Number,
  federal_withholding: Number
}, { _id: false });

const DividendSchema = new mongoose.Schema({
  payer: String,
  ordinary_dividends: Number,
  qualified_dividends: Number,
  federal_withholding: Number
}, { _id: false });

const SelfEmploymentSchema = new mongoose.Schema({
  payer: String,
  nonemployee_compensation: Number,
  federal_withholding: Number
}, { _id: false });

const DependentSchema = new mongoose.Schema({
  first_name: String,
  last_name: String,
  ssn: String,
  relationship: String,
  date_of_birth: Date,
  months_lived_with: { type: Number, default: 12 },
  qualifies_for_child_credit: Boolean,
  qualifies_for_other_dependent_credit: Boolean
}, { _id: false });

const NormalizedDataSchema = new mongoose.Schema({
  income: {
    w2: [W2Schema],
    interest: [InterestSchema],
    dividends: [DividendSchema],
    self_employment: [SelfEmploymentSchema],
    capital_gains: [{
      description: String,
      proceeds: Number,
      cost_basis: Number,
      gain_or_loss: Number
    }],
    unemployment: [{
      payer: String,
      compensation: Number,
      federal_withholding: Number
    }],
    social_security: [{
      benefits: Number,
      federal_withholding: Number
    }]
  },
  deductions: {
    mortgage_interest: Number,
    points: Number,
    property_tax: Number,
    state_income_tax: Number,
    charitable_cash: Number,
    charitable_noncash: Number,
    medical_expenses: Number,
    educator_expenses: Number,
    hsa_contributions: Number,
    ira_contributions: Number,
    student_loan_interest: Number
  },
  personal: {
    first_name: String,
    middle_initial: String,
    last_name: String,
    ssn: String,
    date_of_birth: Date,
    address: String,
    city: String,
    state: String,
    zip: String,
    filing_status: {
      type: String,
      enum: ['single', 'married_filing_jointly', 'married_filing_separately', 'head_of_household', 'qualifying_surviving_spouse']
    },
    spouse_first_name: String,
    spouse_last_name: String,
    spouse_ssn: String
  },
  dependents: [DependentSchema]
}, { _id: false });

// ==============================================================
// LAYER 3: Form 1040 Schema (IRS Format)
// ==============================================================
const Form1040Schema = new mongoose.Schema({
  header: {
    tax_year: { type: Number, default: 2024 },
    first_name: String,
    middle_initial: String,
    last_name: String,
    ssn: String,
    spouse_first_name: String,
    spouse_last_name: String,
    spouse_ssn: String,
    address: String,
    city: String,
    state: String,
    zip: String,
    filing_status: String,
    presidential_campaign: { type: Boolean, default: false }
  },
  income: {
    line_1_wages: { type: Number, default: 0 },
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
  adjustments: {
    line_10_schedule_1_adjustments: { type: Number, default: 0 },
    line_11_agi: { type: Number, default: 0 }
  },
  deductions: {
    line_12_deduction: { type: Number, default: 0 },
    line_12_standard_or_itemized: String,
    line_13_qbi: { type: Number, default: 0 },
    line_14_total_deductions: { type: Number, default: 0 },
    line_15_taxable_income: { type: Number, default: 0 }
  },
  tax_and_credits: {
    line_16_tax: { type: Number, default: 0 },
    line_17_schedule_2_taxes: { type: Number, default: 0 },
    line_18_total_tax: { type: Number, default: 0 },
    line_19_child_credit: { type: Number, default: 0 },
    line_20_schedule_3_credits: { type: Number, default: 0 },
    line_21_total_credits: { type: Number, default: 0 },
    line_22_tax_after_credits: { type: Number, default: 0 },
    line_23_schedule_2_other_taxes: { type: Number, default: 0 },
    line_24_total_tax: { type: Number, default: 0 }
  },
  payments: {
    line_25a_w2_withholding: { type: Number, default: 0 },
    line_25b_1099_withholding: { type: Number, default: 0 },
    line_25c_other_withholding: { type: Number, default: 0 },
    line_25d_total_withholding: { type: Number, default: 0 },
    line_26_estimated_payments: { type: Number, default: 0 },
    line_27_eic: { type: Number, default: 0 },
    line_28_schedule_3_credits: { type: Number, default: 0 },
    line_29_total_payments: { type: Number, default: 0 }
  },
  refund_or_owe: {
    line_33_overpayment: { type: Number, default: 0 },
    line_34_apply_to_2025: { type: Number, default: 0 },
    line_35_refund: { type: Number, default: 0 },
    line_36_routing_number: String,
    line_36_account_number: String,
    line_37_amount_owe: { type: Number, default: 0 },
    line_38_estimated_penalty: { type: Number, default: 0 }
  },
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
// LAYER 4: Validation Schema (FIXED - No more warning!)
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
},  // ← ADD COMMA HERE!

  accuracy_checks: {
    income_matches_forms: { type: Boolean, default: false },
    withholding_matches_forms: { type: Boolean, default: false },
    credits_calculated_correctly: { type: Boolean, default: false },
    deduction_choice_optimal: { type: Boolean, default: false },
    math_errors: [String]
  },
  warnings: [{
    severity: {
      type: String,
      enum: ['low', 'medium', 'high']
    },
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
  suppressReservedKeysWarning: true  // ← THIS FIXES THE WARNING!
});

// ==============================================================
// MAIN TAX SESSION SCHEMA
// ==============================================================
const TaxSessionSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  
  // OLD FIELDS (for compatibility with sessionDB.js)
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
  messages: [{
    sender: String,
    text: String,
    timestamp: Date
  }],
  stepIndex: { type: Number, default: 0 },
  
  // LAYER 1: Raw Data
  rawData: {
    uploads: [RawUploadSchema]
  },
  
  // LAYER 2: Normalized Data
  normalizedData: NormalizedDataSchema,
  
  // LAYER 3: Form 1040 Data
  form1040: Form1040Schema,
  
  // LAYER 4: Validation
  validation: ValidationSchema,
  
  // Interview State
  interviewState: {
    currentStep: String,
    lastQuestionField: String,
    completedSteps: [String]
  },
  
  // Legacy field for backward compatibility
  lastQuestionField: String,
  
  // Metadata
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  completedAt: Date,
  filedAt: Date
});

// Update timestamp on save
// Update timestamp on save
TaxSessionSchema.pre('save', function() {
  this.updatedAt = new Date();
});

export default mongoose.model('TaxSession', TaxSessionSchema);