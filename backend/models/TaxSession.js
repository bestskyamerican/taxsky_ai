import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * ============================================================
 * TaxSky Complete Tax Session Model
 * Version: 27.0 — OBBB DEDUCTIONS SUPPORT
 * ============================================================
 * 
 * ✅ v27.0 ADDITIONS (OBBB - One Big Beautiful Bill):
 *  - Added OBBB deductions (below-the-line, reduce taxable income)
 *  - Tips deduction: up to $25,000
 *  - Overtime deduction: up to $12,500 single / $25,000 MFJ
 *  - Car loan interest: up to $10,000 (NEW American-made only)
 *  - Senior deduction: $6,000 per person 65+ (auto from DOB)
 *  - Fixed: taxable_income = AGI - Standard Deduction - OBBB
 * 
 * ✅ v26.1 ADDITIONS:
 *  - Added hsa_deduction and se_tax_deduction to Totals
 *  - Store individual adjustments in Schedule 1
 *  - Dashboard can now show HSA, IRA, SE deduction breakdown
 * 
 * ✅ v26.0 FIXES:
 *  - FIXED: Standard deduction values for 2025
 *    • Single: $15,750 (was $15,000)
 *    • MFJ: $31,500 (was $30,000)
 *    • HOH: $23,625 (was $22,500)
 *  - ADDED: Federal tax bracket calculation
 *  - ADDED: IRA deduction income limit checking
 *    • If has 401(k) and AGI > $146k (MFJ): IRA not deductible
 *  - FIXED: tax_before_credits now calculated
 * 
 * 📋 FORMS INCLUDED:
 * ├── Form 1040 (Main Return)
 * ├── Schedule 1 (Additional Income & Adjustments)
 * ├── Schedule 2 (Additional Taxes)
 * ├── Schedule 3 (Additional Credits & Payments)
 * ├── Schedule A (Itemized Deductions)
 * ├── Schedule B (Interest & Dividends)
 * ├── Schedule C (Business Income) - ARRAY
 * ├── Schedule D (Capital Gains)
 * ├── Schedule E (Rental Income) - ARRAY
 * ├── Schedule SE (Self-Employment Tax)
 * ├── Form 8812 (Child Tax Credit)
 * ├── Form 8863 (Education Credits)
 * ├── Form 2441 (Child Care Credit)
 * ├── Form 8889 (HSA)
 * └── Form 8949 (Capital Asset Sales) - ARRAY
 * 
 * 📄 INPUT FORMS (Arrays):
 * ├── W-2 []
 * ├── 1099-INT []
 * ├── 1099-DIV []
 * ├── 1099-NEC []
 * ├── 1099-MISC []
 * ├── 1099-B []
 * ├── 1099-R []
 * ├── 1099-G []
 * ├── 1099-SSA []
 * └── 1098 []
 * 
 * ============================================================
 */

/* =====================================================
   🔧 HELPERS
===================================================== */
function calculateAge(dob, taxYear = 2025) {
  if (!dob) return null;
  const birthDate = new Date(dob);
  const taxYearEnd = new Date(taxYear, 11, 31);
  let age = taxYearEnd.getFullYear() - birthDate.getFullYear();
  const monthDiff = taxYearEnd.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && taxYearEnd.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

/* =====================================================
   📋 PERSONAL INFO SCHEMAS
===================================================== */

const PersonSchema = new Schema({
  first_name: { type: String, default: '' },
  middle_initial: { type: String, default: '' },
  last_name: { type: String, default: '' },
  ssn: { type: String, default: '' },
  dob: { type: Date, default: null },
  occupation: { type: String, default: '' },
  phone: { type: String, default: '' },
  email: { type: String, default: '' }
}, { _id: false });

const AddressSchema = new Schema({
  street: { type: String, default: '' },
  apt: { type: String, default: '' },
  city: { type: String, default: '' },
  state: { type: String, default: '' },
  zip: { type: String, default: '' },
  country: { type: String, default: 'USA' }
}, { _id: false });

const DependentSchema = new Schema({
  first_name: { type: String, required: true },
  middle_initial: { type: String, default: '' },
  last_name: { type: String, default: '' },
  ssn: { type: String, default: '' },
  dob: { type: Date, default: null },
  relationship: {
    type: String,
    enum: ['son', 'daughter', 'stepson', 'stepdaughter', 'foster_child', 
           'brother', 'sister', 'parent', 'grandparent', 'grandchild', 
           'niece', 'nephew', 'other'],
    default: 'son'
  },
  months_lived: { type: Number, default: 12, min: 0, max: 12 },
  is_student: { type: Boolean, default: false },
  is_disabled: { type: Boolean, default: false },
  // Calculated
  age: { type: Number, default: null },
  qualifies_ctc: { type: Boolean, default: false },
  qualifies_odc: { type: Boolean, default: false },
  credit_amount: { type: Number, default: 0 }
}, { _id: false });

/* =====================================================
   📄 INPUT FORMS (ARRAYS - Raw Data)
===================================================== */

/**
 * W-2: Wage and Tax Statement
 */
const W2Schema = new Schema({
  owner: { type: String, enum: ['taxpayer', 'spouse'], required: true },
  // Employer Info
  employer_name: { type: String, default: '' },
  employer_ein: { type: String, default: '' },
  employer_address: { type: String, default: '' },
  // Boxes
  box_1_wages: { type: Number, default: 0 },
  box_2_federal_withheld: { type: Number, default: 0 },
  box_3_ss_wages: { type: Number, default: 0 },
  box_4_ss_withheld: { type: Number, default: 0 },
  box_5_medicare_wages: { type: Number, default: 0 },
  box_6_medicare_withheld: { type: Number, default: 0 },
  box_7_ss_tips: { type: Number, default: 0 },
  box_8_allocated_tips: { type: Number, default: 0 },
  box_10_dependent_care: { type: Number, default: 0 },
  box_11_nonqualified_plans: { type: Number, default: 0 },
  box_12_codes: [{ code: String, amount: Number }],
  box_13_statutory: { type: Boolean, default: false },
  box_13_retirement: { type: Boolean, default: false },
  box_13_sick_pay: { type: Boolean, default: false },
  // State
  box_15_state: { type: String, default: '' },
  box_15_state_ein: { type: String, default: '' },
  box_16_state_wages: { type: Number, default: 0 },
  box_17_state_withheld: { type: Number, default: 0 },
  // Local
  box_18_local_wages: { type: Number, default: 0 },
  box_19_local_withheld: { type: Number, default: 0 },
  box_20_locality: { type: String, default: '' }
}, { _id: true });

/**
 * 1099-INT: Interest Income
 */
const Form1099INTSchema = new Schema({
  owner: { type: String, enum: ['taxpayer', 'spouse', 'joint'], default: 'taxpayer' },
  payer_name: { type: String, default: '' },
  payer_tin: { type: String, default: '' },
  box_1_interest: { type: Number, default: 0 },
  box_2_early_withdrawal_penalty: { type: Number, default: 0 },
  box_3_us_savings_bonds: { type: Number, default: 0 },
  box_4_federal_withheld: { type: Number, default: 0 },
  box_5_investment_expenses: { type: Number, default: 0 },
  box_6_foreign_tax: { type: Number, default: 0 },
  box_8_tax_exempt_interest: { type: Number, default: 0 },
  box_9_private_activity_bond: { type: Number, default: 0 },
  box_10_market_discount: { type: Number, default: 0 },
  box_11_bond_premium: { type: Number, default: 0 },
  box_13_state: { type: String, default: '' },
  box_14_state_withheld: { type: Number, default: 0 }
}, { _id: true });

/**
 * 1099-DIV: Dividends and Distributions
 */
const Form1099DIVSchema = new Schema({
  owner: { type: String, enum: ['taxpayer', 'spouse', 'joint'], default: 'taxpayer' },
  payer_name: { type: String, default: '' },
  payer_tin: { type: String, default: '' },
  box_1a_ordinary_dividends: { type: Number, default: 0 },
  box_1b_qualified_dividends: { type: Number, default: 0 },
  box_2a_capital_gain_dist: { type: Number, default: 0 },
  box_2b_unrecap_1250_gain: { type: Number, default: 0 },
  box_2c_section_1202_gain: { type: Number, default: 0 },
  box_2d_collectibles_gain: { type: Number, default: 0 },
  box_2e_section_897_ordinary: { type: Number, default: 0 },
  box_2f_section_897_capital: { type: Number, default: 0 },
  box_3_nondividend_dist: { type: Number, default: 0 },
  box_4_federal_withheld: { type: Number, default: 0 },
  box_5_section_199a: { type: Number, default: 0 },
  box_6_investment_expenses: { type: Number, default: 0 },
  box_7_foreign_tax: { type: Number, default: 0 },
  box_8_foreign_country: { type: String, default: '' },
  box_9_cash_liquidation: { type: Number, default: 0 },
  box_10_noncash_liquidation: { type: Number, default: 0 },
  box_11_exempt_interest_div: { type: Number, default: 0 },
  box_12_private_activity_bond: { type: Number, default: 0 },
  box_13_state: { type: String, default: '' },
  box_14_state_withheld: { type: Number, default: 0 }
}, { _id: true });

/**
 * 1099-NEC: Nonemployee Compensation
 */
const Form1099NECSchema = new Schema({
  owner: { type: String, enum: ['taxpayer', 'spouse'], default: 'taxpayer' },
  payer_name: { type: String, default: '' },
  payer_tin: { type: String, default: '' },
  box_1_nonemployee_comp: { type: Number, default: 0 },
  box_4_federal_withheld: { type: Number, default: 0 },
  box_5_state: { type: String, default: '' },
  box_6_state_withheld: { type: Number, default: 0 }
}, { _id: true });

/**
 * 1099-MISC: Miscellaneous Income
 */
const Form1099MISCSchema = new Schema({
  owner: { type: String, enum: ['taxpayer', 'spouse', 'joint'], default: 'taxpayer' },
  payer_name: { type: String, default: '' },
  payer_tin: { type: String, default: '' },
  box_1_rents: { type: Number, default: 0 },
  box_2_royalties: { type: Number, default: 0 },
  box_3_other_income: { type: Number, default: 0 },
  box_4_federal_withheld: { type: Number, default: 0 },
  box_5_fishing_boat: { type: Number, default: 0 },
  box_6_medical_payments: { type: Number, default: 0 },
  box_8_substitute_payments: { type: Number, default: 0 },
  box_9_crop_insurance: { type: Number, default: 0 },
  box_10_gross_attorney: { type: Number, default: 0 },
  box_11_fish_resale: { type: Number, default: 0 },
  box_12_section_409a_deferrals: { type: Number, default: 0 },
  box_14_excess_golden_parachute: { type: Number, default: 0 },
  box_15_nonqualified_deferred: { type: Number, default: 0 }
}, { _id: true });

/**
 * 1099-B: Proceeds from Broker Transactions
 */
const Form1099BSchema = new Schema({
  owner: { type: String, enum: ['taxpayer', 'spouse', 'joint'], default: 'taxpayer' },
  broker_name: { type: String, default: '' },
  broker_tin: { type: String, default: '' },
  // Transaction details
  description: { type: String, default: '' },
  date_acquired: { type: Date, default: null },
  date_sold: { type: Date, default: null },
  box_1d_proceeds: { type: Number, default: 0 },
  box_1e_cost_basis: { type: Number, default: 0 },
  box_1f_accrued_market_discount: { type: Number, default: 0 },
  box_1g_wash_sale_loss: { type: Number, default: 0 },
  box_2_short_term_gain: { type: Number, default: 0 },
  box_3_long_term_gain: { type: Number, default: 0 },
  box_4_federal_withheld: { type: Number, default: 0 },
  box_5_noncovered_security: { type: Boolean, default: false },
  box_6_basis_reported_irs: { type: Boolean, default: true },
  // Type
  is_short_term: { type: Boolean, default: false },
  is_covered: { type: Boolean, default: true },
  gain_loss: { type: Number, default: 0 }
}, { _id: true });

/**
 * 1099-R: Retirement Distributions
 */
const Form1099RSchema = new Schema({
  owner: { type: String, enum: ['taxpayer', 'spouse'], default: 'taxpayer' },
  payer_name: { type: String, default: '' },
  payer_tin: { type: String, default: '' },
  box_1_gross_distribution: { type: Number, default: 0 },
  box_2a_taxable_amount: { type: Number, default: 0 },
  box_2b_taxable_not_determined: { type: Boolean, default: false },
  box_2b_total_distribution: { type: Boolean, default: false },
  box_3_capital_gain: { type: Number, default: 0 },
  box_4_federal_withheld: { type: Number, default: 0 },
  box_5_employee_contributions: { type: Number, default: 0 },
  box_6_net_unrealized_appreciation: { type: Number, default: 0 },
  box_7_distribution_code: { type: String, default: '' },
  box_7_ira_sep_simple: { type: Boolean, default: false },
  box_8_other: { type: Number, default: 0 },
  box_9a_your_percent: { type: Number, default: 0 },
  box_9b_total_employee_contributions: { type: Number, default: 0 },
  box_10_state_withheld: { type: Number, default: 0 },
  box_11_state: { type: String, default: '' }
}, { _id: true });

/**
 * 1099-G: Government Payments (Unemployment, State Refunds)
 */
const Form1099GSchema = new Schema({
  owner: { type: String, enum: ['taxpayer', 'spouse'], default: 'taxpayer' },
  payer_name: { type: String, default: '' },
  box_1_unemployment: { type: Number, default: 0 },
  box_2_state_refund: { type: Number, default: 0 },
  box_3_box_2_year: { type: Number, default: null },
  box_4_federal_withheld: { type: Number, default: 0 },
  box_5_reemployment_trade: { type: Number, default: 0 },
  box_6_taxable_grants: { type: Number, default: 0 },
  box_7_agriculture: { type: Number, default: 0 },
  box_9_market_gain: { type: Number, default: 0 },
  box_10a_state: { type: String, default: '' },
  box_11_state_withheld: { type: Number, default: 0 }
}, { _id: true });

/**
 * SSA-1099: Social Security Benefits
 */
const FormSSA1099Schema = new Schema({
  owner: { type: String, enum: ['taxpayer', 'spouse'], default: 'taxpayer' },
  box_3_benefits_paid: { type: Number, default: 0 },
  box_4_benefits_repaid: { type: Number, default: 0 },
  box_5_net_benefits: { type: Number, default: 0 },
  box_6_voluntary_withheld: { type: Number, default: 0 },
  // Calculated
  taxable_amount: { type: Number, default: 0 }
}, { _id: true });

/**
 * 1098: Mortgage Interest Statement
 */
const Form1098Schema = new Schema({
  owner: { type: String, enum: ['taxpayer', 'spouse', 'joint'], default: 'joint' },
  lender_name: { type: String, default: '' },
  lender_tin: { type: String, default: '' },
  property_address: { type: String, default: '' },
  box_1_mortgage_interest: { type: Number, default: 0 },
  box_2_outstanding_principal: { type: Number, default: 0 },
  box_3_origination_date: { type: Date, default: null },
  box_4_refund_overpaid_interest: { type: Number, default: 0 },
  box_5_mortgage_insurance: { type: Number, default: 0 },
  box_6_points_paid: { type: Number, default: 0 },
  box_7_property_securing_mortgage: { type: Boolean, default: true },
  box_8_property_address: { type: String, default: '' },
  box_9_properties_securing: { type: Number, default: 1 },
  box_10_property_tax: { type: Number, default: 0 }
}, { _id: true });

/**
 * 1098-T: Tuition Statement
 */
const Form1098TSchema = new Schema({
  owner: { type: String, enum: ['taxpayer', 'spouse', 'dependent'], default: 'dependent' },
  student_name: { type: String, default: '' },
  institution_name: { type: String, default: '' },
  institution_tin: { type: String, default: '' },
  box_1_payments_received: { type: Number, default: 0 },
  box_2_amounts_billed: { type: Number, default: 0 },
  box_4_adjustments_prior_year: { type: Number, default: 0 },
  box_5_scholarships: { type: Number, default: 0 },
  box_6_adjustments_scholarships: { type: Number, default: 0 },
  box_7_includes_next_year: { type: Boolean, default: false },
  box_8_half_time_student: { type: Boolean, default: false },
  box_9_graduate_student: { type: Boolean, default: false }
}, { _id: true });

/**
 * 1098-E: Student Loan Interest Statement
 */
const Form1098ESchema = new Schema({
  owner: { type: String, enum: ['taxpayer', 'spouse'], default: 'taxpayer' },
  lender_name: { type: String, default: '' },
  lender_tin: { type: String, default: '' },
  box_1_student_loan_interest: { type: Number, default: 0 },
  box_2_check_if_no_interest: { type: Boolean, default: false }
}, { _id: true });

/* =====================================================
   📊 SCHEDULE SCHEMAS (Generated/Calculated)
===================================================== */

/**
 * Schedule A: Itemized Deductions
 */
const ScheduleASchema = new Schema({
  // Medical and Dental
  line_1_medical_expenses: { type: Number, default: 0 },
  line_2_agi_percentage: { type: Number, default: 0 }, // Line 11 * 7.5%
  line_3_medical_net: { type: Number, default: 0 },
  // Taxes
  line_4_state_local_income_tax: { type: Number, default: 0 },
  line_5a_state_local_income_sales: { type: Number, default: 0 },
  line_5b_state_local_real_estate: { type: Number, default: 0 },
  line_5c_state_local_personal_property: { type: Number, default: 0 },
  line_5d_total_5a_5c: { type: Number, default: 0 },
  line_5e_salt_deduction: { type: Number, default: 0 }, // Max $10,000
  line_6_other_taxes: { type: Number, default: 0 },
  line_7_total_taxes: { type: Number, default: 0 },
  // Interest
  line_8a_home_mortgage_1098: { type: Number, default: 0 },
  line_8b_home_mortgage_not_reported: { type: Number, default: 0 },
  line_8c_points_not_reported: { type: Number, default: 0 },
  line_8d_mortgage_insurance: { type: Number, default: 0 },
  line_8e_investment_interest: { type: Number, default: 0 },
  line_9_total_interest: { type: Number, default: 0 },
  // Charitable
  line_10_gifts_check_cash: { type: Number, default: 0 },
  line_11_gifts_other_than_cash: { type: Number, default: 0 },
  line_12_gifts_carryover: { type: Number, default: 0 },
  line_13_total_gifts: { type: Number, default: 0 },
  // Casualty
  line_14_casualty_loss: { type: Number, default: 0 },
  // Other
  line_15_other_itemized: { type: Number, default: 0 },
  // Total
  line_16_total_itemized: { type: Number, default: 0 },
  line_17_standard_or_itemized: { type: Number, default: 0 }
}, { _id: false });

/**
 * Schedule B: Interest and Ordinary Dividends
 */
const ScheduleBSchema = new Schema({
  // Part I - Interest
  interest_items: [{
    payer: { type: String },
    amount: { type: Number }
  }],
  line_1_total_interest: { type: Number, default: 0 },
  line_2_excludable_savings_bond: { type: Number, default: 0 },
  line_3_subtract_line_2: { type: Number, default: 0 },
  line_4_taxable_interest: { type: Number, default: 0 },
  // Part II - Dividends
  dividend_items: [{
    payer: { type: String },
    amount: { type: Number }
  }],
  line_5_total_ordinary_dividends: { type: Number, default: 0 },
  line_6_ordinary_dividends: { type: Number, default: 0 },
  // Part III - Foreign Accounts
  line_7a_foreign_account: { type: Boolean, default: false },
  line_7b_foreign_country: { type: String, default: '' },
  line_8_foreign_trust: { type: Boolean, default: false }
}, { _id: false });

/**
 * Schedule C: Profit or Loss from Business (ARRAY - can have multiple)
 */
const ScheduleCSchema = new Schema({
  owner: { type: String, enum: ['taxpayer', 'spouse'], required: true },
  // Business Info
  business_name: { type: String, default: '' },
  business_ein: { type: String, default: '' },
  business_address: { type: String, default: '' },
  principal_business: { type: String, default: '' },
  business_code: { type: String, default: '' },
  accounting_method: { type: String, enum: ['cash', 'accrual', 'other'], default: 'cash' },
  did_materially_participate: { type: Boolean, default: true },
  started_in_tax_year: { type: Boolean, default: false },
  made_payments_requiring_1099: { type: Boolean, default: false },
  did_file_required_1099: { type: Boolean, default: false },
  
  // Income
  line_1_gross_receipts: { type: Number, default: 0 },
  line_2_returns_allowances: { type: Number, default: 0 },
  line_3_subtract: { type: Number, default: 0 },
  line_4_cost_of_goods_sold: { type: Number, default: 0 },
  line_5_gross_profit: { type: Number, default: 0 },
  line_6_other_income: { type: Number, default: 0 },
  line_7_gross_income: { type: Number, default: 0 },
  
  // Expenses
  line_8_advertising: { type: Number, default: 0 },
  line_9_car_truck: { type: Number, default: 0 },
  line_10_commissions: { type: Number, default: 0 },
  line_11_contract_labor: { type: Number, default: 0 },
  line_12_depletion: { type: Number, default: 0 },
  line_13_depreciation: { type: Number, default: 0 },
  line_14_employee_benefits: { type: Number, default: 0 },
  line_15_insurance: { type: Number, default: 0 },
  line_16a_mortgage_interest: { type: Number, default: 0 },
  line_16b_other_interest: { type: Number, default: 0 },
  line_17_legal_professional: { type: Number, default: 0 },
  line_18_office_expense: { type: Number, default: 0 },
  line_19_pension_profit_sharing: { type: Number, default: 0 },
  line_20a_rent_vehicles: { type: Number, default: 0 },
  line_20b_rent_property: { type: Number, default: 0 },
  line_21_repairs_maintenance: { type: Number, default: 0 },
  line_22_supplies: { type: Number, default: 0 },
  line_23_taxes_licenses: { type: Number, default: 0 },
  line_24a_travel: { type: Number, default: 0 },
  line_24b_meals: { type: Number, default: 0 },
  line_25_utilities: { type: Number, default: 0 },
  line_26_wages: { type: Number, default: 0 },
  line_27a_other_expenses: { type: Number, default: 0 },
  line_28_total_expenses: { type: Number, default: 0 },
  line_29_tentative_profit: { type: Number, default: 0 },
  line_30_home_office: { type: Number, default: 0 },
  line_31_net_profit_loss: { type: Number, default: 0 },
  
  // Risk rules
  line_32a_all_investment_at_risk: { type: Boolean, default: true },
  line_32b_some_not_at_risk: { type: Boolean, default: false }
}, { _id: true });

/**
 * Schedule D: Capital Gains and Losses
 */
const ScheduleDSchema = new Schema({
  // Part I - Short-Term (held 1 year or less)
  line_1a_st_totals_1099b_box_a: { type: Number, default: 0 },
  line_1b_st_totals_1099b_box_b: { type: Number, default: 0 },
  line_2_st_totals_1099b_box_c: { type: Number, default: 0 },
  line_3_st_totals_not_1099b: { type: Number, default: 0 },
  line_4_st_gain_installment_6252: { type: Number, default: 0 },
  line_5_st_gain_loss_other: { type: Number, default: 0 },
  line_6_st_carryover: { type: Number, default: 0 },
  line_7_net_st_gain_loss: { type: Number, default: 0 },
  
  // Part II - Long-Term (held more than 1 year)
  line_8a_lt_totals_1099b_box_d: { type: Number, default: 0 },
  line_8b_lt_totals_1099b_box_e: { type: Number, default: 0 },
  line_9_lt_totals_1099b_box_f: { type: Number, default: 0 },
  line_10_lt_totals_not_1099b: { type: Number, default: 0 },
  line_11_lt_gain_4797: { type: Number, default: 0 },
  line_12_lt_gain_installment: { type: Number, default: 0 },
  line_13_lt_gain_pass_through: { type: Number, default: 0 },
  line_14_lt_capital_gain_dist: { type: Number, default: 0 },
  line_15_net_lt_gain_loss: { type: Number, default: 0 },
  
  // Part III - Summary
  line_16_combine_7_15: { type: Number, default: 0 },
  line_17_gain_both_positive: { type: Boolean, default: false },
  line_18_28_percent_rate: { type: Number, default: 0 },
  line_19_unrecaptured_1250: { type: Number, default: 0 },
  line_20_is_loss: { type: Boolean, default: false },
  line_21_loss_smaller: { type: Number, default: 0 }
}, { _id: false });

/**
 * Schedule E: Supplemental Income and Loss (Rental, etc.) - ARRAY
 */
const ScheduleEPropertySchema = new Schema({
  owner: { type: String, enum: ['taxpayer', 'spouse', 'joint'], default: 'joint' },
  // Property Info
  property_address: { type: String, default: '' },
  property_type: { type: String, enum: ['single_family', 'multi_family', 'vacation', 'commercial', 'land', 'other'], default: 'single_family' },
  fair_rental_days: { type: Number, default: 365 },
  personal_use_days: { type: Number, default: 0 },
  qbi_eligible: { type: Boolean, default: true },
  
  // Income
  line_3_rents_received: { type: Number, default: 0 },
  line_4_royalties_received: { type: Number, default: 0 },
  
  // Expenses
  line_5_advertising: { type: Number, default: 0 },
  line_6_auto_travel: { type: Number, default: 0 },
  line_7_cleaning_maintenance: { type: Number, default: 0 },
  line_8_commissions: { type: Number, default: 0 },
  line_9_insurance: { type: Number, default: 0 },
  line_10_legal_professional: { type: Number, default: 0 },
  line_11_management_fees: { type: Number, default: 0 },
  line_12_mortgage_interest: { type: Number, default: 0 },
  line_13_other_interest: { type: Number, default: 0 },
  line_14_repairs: { type: Number, default: 0 },
  line_15_supplies: { type: Number, default: 0 },
  line_16_taxes: { type: Number, default: 0 },
  line_17_utilities: { type: Number, default: 0 },
  line_18_depreciation: { type: Number, default: 0 },
  line_19_other: { type: Number, default: 0 },
  line_20_total_expenses: { type: Number, default: 0 },
  line_21_net_income_loss: { type: Number, default: 0 }
}, { _id: true });

/**
 * Schedule SE: Self-Employment Tax
 */
const ScheduleSESchema = new Schema({
  // Part I - Self-Employment Tax
  line_1a_net_farm_profit: { type: Number, default: 0 },
  line_1b_partnership_income: { type: Number, default: 0 },
  line_2_net_nonfarm_profit: { type: Number, default: 0 }, // From Schedule C
  line_3_combine: { type: Number, default: 0 },
  line_4_multiply_92_35: { type: Number, default: 0 },
  line_5_self_employment_income: { type: Number, default: 0 },
  line_6_se_tax: { type: Number, default: 0 }, // 15.3%
  line_7_deduction_half_se_tax: { type: Number, default: 0 }
}, { _id: false });

/**
 * Schedule 1: Additional Income and Adjustments to Income
 */
const Schedule1Schema = new Schema({
  // Part I - Additional Income
  line_1_taxable_refunds: { type: Number, default: 0 },
  line_2a_alimony_received: { type: Number, default: 0 },
  line_3_business_income: { type: Number, default: 0 }, // From Schedule C
  line_4_other_gains: { type: Number, default: 0 },
  line_5_rental_income: { type: Number, default: 0 }, // From Schedule E
  line_6_farm_income: { type: Number, default: 0 },
  line_7_unemployment: { type: Number, default: 0 },
  line_8_other_income: { type: Number, default: 0 },
  line_9_total_additional_income: { type: Number, default: 0 },
  
  // Part II - Adjustments
  line_11_educator_expenses: { type: Number, default: 0 },
  line_12_business_expenses_reservist: { type: Number, default: 0 },
  line_13_hsa_deduction: { type: Number, default: 0 },
  line_14_moving_expenses: { type: Number, default: 0 },
  line_15_deductible_self_employment: { type: Number, default: 0 },
  line_16_sep_simple_qualified: { type: Number, default: 0 },
  line_17_self_employed_health: { type: Number, default: 0 },
  line_18_penalty_early_withdrawal: { type: Number, default: 0 },
  line_19a_alimony_paid: { type: Number, default: 0 },
  line_20_ira_deduction: { type: Number, default: 0 },
  line_21_student_loan_interest: { type: Number, default: 0 },
  line_24_other_adjustments: { type: Number, default: 0 },
  line_25_total_adjustments: { type: Number, default: 0 }
}, { _id: false });

/**
 * Schedule 2: Additional Taxes
 */
const Schedule2Schema = new Schema({
  // Part I - Tax
  line_1_amt: { type: Number, default: 0 },
  line_2_excess_advance_ptc: { type: Number, default: 0 },
  line_3_total_schedule_2_part1: { type: Number, default: 0 },
  
  // Part II - Other Taxes
  line_4_se_tax: { type: Number, default: 0 }, // From Schedule SE
  line_5_unreported_ss_medicare: { type: Number, default: 0 },
  line_6_additional_medicare: { type: Number, default: 0 },
  line_7_net_investment_income: { type: Number, default: 0 },
  line_8_household_employment: { type: Number, default: 0 },
  line_9_first_time_homebuyer: { type: Number, default: 0 },
  line_10_taxes_qualified_plans: { type: Number, default: 0 },
  line_17_total_schedule_2_part2: { type: Number, default: 0 },
  line_18_total_additional_tax: { type: Number, default: 0 }
}, { _id: false });

/**
 * Schedule 3: Additional Credits and Payments
 */
const Schedule3Schema = new Schema({
  // Part I - Nonrefundable Credits
  line_1_foreign_tax_credit: { type: Number, default: 0 },
  line_2_child_dependent_care: { type: Number, default: 0 },
  line_3_education_credits: { type: Number, default: 0 },
  line_4_retirement_savings: { type: Number, default: 0 },
  line_5_energy_credits: { type: Number, default: 0 },
  line_6_other_nonrefundable: { type: Number, default: 0 },
  line_7_total_nonrefundable: { type: Number, default: 0 },
  
  // Part II - Other Payments and Refundable Credits
  line_8_net_premium_tax_credit: { type: Number, default: 0 },
  line_9_amount_paid_extension: { type: Number, default: 0 },
  line_10_excess_ss_withheld: { type: Number, default: 0 },
  line_11_fuel_tax_credit: { type: Number, default: 0 },
  line_12_credits_form_2439: { type: Number, default: 0 },
  line_13_other_payments: { type: Number, default: 0 },
  line_14_total_other_payments: { type: Number, default: 0 }
}, { _id: false });

/**
 * Form 8812: Additional Child Tax Credit
 */
const Form8812Schema = new Schema({
  line_1_earned_income: { type: Number, default: 0 },
  line_2_nontaxable_combat: { type: Number, default: 0 },
  line_3_total_earned: { type: Number, default: 0 },
  line_4_number_qualifying_children: { type: Number, default: 0 },
  line_5_multiply_line_4: { type: Number, default: 0 },
  line_6_ctc_from_1040: { type: Number, default: 0 },
  line_7_subtract: { type: Number, default: 0 },
  line_8_smaller_5_or_7: { type: Number, default: 0 },
  line_9_threshold: { type: Number, default: 2500 },
  line_10_subtract_threshold: { type: Number, default: 0 },
  line_11_multiply_15_percent: { type: Number, default: 0 },
  line_12_three_or_more_children: { type: Number, default: 0 },
  line_13_larger_11_or_12: { type: Number, default: 0 },
  line_14_additional_ctc: { type: Number, default: 0 }
}, { _id: false });

/**
 * Form 8863: Education Credits
 */
const Form8863Schema = new Schema({
  // Part I - American Opportunity Credit
  students: [{
    name: { type: String },
    ssn: { type: String },
    institution: { type: String },
    qualified_expenses: { type: Number, default: 0 },
    adjusted_expenses: { type: Number, default: 0 },
    credit_amount: { type: Number, default: 0 }
  }],
  line_1_aoc_total: { type: Number, default: 0 },
  line_2_aoc_40_percent: { type: Number, default: 0 },
  line_3_aoc_60_percent: { type: Number, default: 0 },
  
  // Part II - Lifetime Learning Credit
  line_10_llc_expenses: { type: Number, default: 0 },
  line_11_llc_adjust: { type: Number, default: 0 },
  line_12_llc_credit: { type: Number, default: 0 },
  
  // Totals
  line_19_total_education_credit: { type: Number, default: 0 },
  line_20_refundable_part: { type: Number, default: 0 },
  line_21_nonrefundable_part: { type: Number, default: 0 }
}, { _id: false });

/**
 * Form 2441: Child and Dependent Care Expenses
 */
const Form2441Schema = new Schema({
  // Care providers
  providers: [{
    name: { type: String },
    address: { type: String },
    tin: { type: String },
    amount_paid: { type: Number, default: 0 }
  }],
  // Qualifying persons
  qualifying_persons: [{
    name: { type: String },
    ssn: { type: String },
    qualified_expenses: { type: Number, default: 0 }
  }],
  // Calculations
  line_3_total_expenses: { type: Number, default: 0 },
  line_4_earned_income_taxpayer: { type: Number, default: 0 },
  line_5_earned_income_spouse: { type: Number, default: 0 },
  line_6_smaller_amount: { type: Number, default: 0 },
  line_7_expense_limit: { type: Number, default: 0 }, // $3,000 or $6,000
  line_8_smaller_6_or_7: { type: Number, default: 0 },
  line_9_credit_percentage: { type: Number, default: 0 },
  line_10_credit_amount: { type: Number, default: 0 },
  line_11_employer_benefits: { type: Number, default: 0 }
}, { _id: false });

/**
 * Form 8889: Health Savings Accounts (HSA)
 */
const Form8889Schema = new Schema({
  owner: { type: String, enum: ['taxpayer', 'spouse'], default: 'taxpayer' },
  coverage_type: { type: String, enum: ['self', 'family'], default: 'self' },
  
  // Part I - HSA Contributions and Deduction
  line_1_hsa_contributions: { type: Number, default: 0 },
  line_2_limitation: { type: Number, default: 0 }, // $4,300 self, $8,550 family (2025)
  line_3_catch_up_contribution: { type: Number, default: 0 }, // $1,000 if 55+
  line_4_add_2_and_3: { type: Number, default: 0 },
  line_5_employer_contributions: { type: Number, default: 0 },
  line_6_subtract: { type: Number, default: 0 },
  line_7_additional_contribution: { type: Number, default: 0 },
  line_8_smaller_6_or_7: { type: Number, default: 0 },
  line_9_qualified_funding: { type: Number, default: 0 },
  line_10_subtract: { type: Number, default: 0 },
  line_11_employer_funded: { type: Number, default: 0 },
  line_12_prior_year_excess: { type: Number, default: 0 },
  line_13_hsa_deduction: { type: Number, default: 0 },
  
  // Part II - HSA Distributions
  line_14a_distributions: { type: Number, default: 0 },
  line_14b_distribution_rollover: { type: Number, default: 0 },
  line_14c_subtract: { type: Number, default: 0 },
  line_15_qualified_medical: { type: Number, default: 0 },
  line_16_taxable_distribution: { type: Number, default: 0 },
  line_17_20_percent_penalty: { type: Number, default: 0 }
}, { _id: false });

/* =====================================================
   📊 FORM 1040: Main Return
===================================================== */

const Form1040Schema = new Schema({
  // Header
  filing_status: { type: Number, default: 1 }, // 1=S, 2=MFJ, 3=MFS, 4=HOH, 5=QW
  presidential_campaign_you: { type: Boolean, default: false },
  presidential_campaign_spouse: { type: Boolean, default: false },
  digital_assets: { type: Boolean, default: false },
  
  // Dependents count
  dependent_children_ctc: { type: Number, default: 0 },
  dependent_other: { type: Number, default: 0 },
  
  // Income Section
  income: {
    line_1a_w2_wages: { type: Number, default: 0 },
    line_1b_household_employee: { type: Number, default: 0 },
    line_1c_tip_income: { type: Number, default: 0 },
    line_1d_medicaid_waiver: { type: Number, default: 0 },
    line_1e_dependent_care: { type: Number, default: 0 },
    line_1f_adoption_benefits: { type: Number, default: 0 },
    line_1g_form_8919: { type: Number, default: 0 },
    line_1h_other_w2: { type: Number, default: 0 },
    line_1i_nontaxable_combat: { type: Number, default: 0 },
    line_1z_total_wages: { type: Number, default: 0 },
    line_2a_tax_exempt_interest: { type: Number, default: 0 },
    line_2b_taxable_interest: { type: Number, default: 0 },
    line_3a_qualified_dividends: { type: Number, default: 0 },
    line_3b_ordinary_dividends: { type: Number, default: 0 },
    line_4a_ira_distributions: { type: Number, default: 0 },
    line_4b_taxable_ira: { type: Number, default: 0 },
    line_5a_pensions: { type: Number, default: 0 },
    line_5b_taxable_pensions: { type: Number, default: 0 },
    line_6a_social_security: { type: Number, default: 0 },
    line_6b_taxable_ss: { type: Number, default: 0 },
    line_6c_lump_sum_election: { type: Boolean, default: false },
    line_7_capital_gain: { type: Number, default: 0 },
    line_8_schedule_1_income: { type: Number, default: 0 },
    line_9_total_income: { type: Number, default: 0 }
  },
  
  // Adjustments
  adjustments: {
    line_10_schedule_1_adjustments: { type: Number, default: 0 },
    line_11_agi: { type: Number, default: 0 }
  },
  
  // Deductions
  deductions: {
    line_12a_standard_deduction: { type: Number, default: 0 },
    line_12b_charitable_if_standard: { type: Number, default: 0 },
    line_12c_total_12a_12b: { type: Number, default: 0 },
    line_13_qbi_deduction: { type: Number, default: 0 },
    line_14_total_deductions: { type: Number, default: 0 },
    line_15_taxable_income: { type: Number, default: 0 }
  },
  
  // Tax and Credits
  tax_credits: {
    line_16_tax: { type: Number, default: 0 },
    line_17_schedule_2_line_3: { type: Number, default: 0 },
    line_18_total_tax_before_credits: { type: Number, default: 0 },
    line_19_child_tax_credit: { type: Number, default: 0 },
    line_20_schedule_3_line_8: { type: Number, default: 0 },
    line_21_total_credits: { type: Number, default: 0 },
    line_22_tax_minus_credits: { type: Number, default: 0 },
    line_23_schedule_2_line_18: { type: Number, default: 0 },
    line_24_total_tax: { type: Number, default: 0 }
  },
  
  // Payments
  payments: {
    line_25a_w2_withholding: { type: Number, default: 0 },
    line_25b_1099_withholding: { type: Number, default: 0 },
    line_25c_other_withholding: { type: Number, default: 0 },
    line_25d_total_withholding: { type: Number, default: 0 },
    line_26_estimated_payments: { type: Number, default: 0 },
    line_27_eic: { type: Number, default: 0 },
    line_28_additional_ctc: { type: Number, default: 0 },
    line_29_american_opportunity: { type: Number, default: 0 },
    line_30_reserved: { type: Number, default: 0 },
    line_31_schedule_3_line_15: { type: Number, default: 0 },
    line_32_other_payments: { type: Number, default: 0 },
    line_33_total_payments: { type: Number, default: 0 }
  },
  
  // Refund
  refund: {
    line_34_overpaid: { type: Number, default: 0 },
    line_35a_refund_amount: { type: Number, default: 0 },
    line_35b_routing: { type: String, default: '' },
    line_35c_account_type: { type: String, enum: ['checking', 'savings', ''], default: '' },
    line_35d_account_number: { type: String, default: '' },
    line_36_applied_to_next_year: { type: Number, default: 0 },
    line_37_amount_owed: { type: Number, default: 0 },
    line_38_estimated_penalty: { type: Number, default: 0 }
  }
}, { _id: false });

/* =====================================================
   📊 TOTALS SCHEMA (Calculated Summary)
===================================================== */

const TotalsSchema = new Schema({
  // Income totals
  wages: { type: Number, default: 0 },
  interest: { type: Number, default: 0 },
  dividends: { type: Number, default: 0 },
  capital_gains: { type: Number, default: 0 },
  business_income: { type: Number, default: 0 },
  rental_income: { type: Number, default: 0 },
  retirement_income: { type: Number, default: 0 },
  social_security: { type: Number, default: 0 },
  unemployment: { type: Number, default: 0 },
  other_income: { type: Number, default: 0 },
  total_income: { type: Number, default: 0 },
  
  // AGI
  total_adjustments: { type: Number, default: 0 },
  agi: { type: Number, default: 0 },
  
  // ✅ Individual Adjustments (v26.1)
  hsa_deduction: { type: Number, default: 0 },
  se_tax_deduction: { type: Number, default: 0 },
  
  // ✅ IRA Deduction Details (v26.0)
  ira_deduction: { type: Number, default: 0 },
  taxpayer_ira_deductible: { type: Number, default: 0 },
  spouse_ira_deductible: { type: Number, default: 0 },
  ira_not_deductible_reason: { type: String, default: '' },
  
  // ✅ OBBB Deductions (v27.0) - Below-the-line deductions
  obbb_tips_deduction: { type: Number, default: 0 },
  obbb_overtime_deduction: { type: Number, default: 0 },
  obbb_car_loan_deduction: { type: Number, default: 0 },
  obbb_senior_deduction: { type: Number, default: 0 },
  obbb_total_deduction: { type: Number, default: 0 },
  
  // Deductions
  standard_deduction: { type: Number, default: 0 },
  itemized_deduction: { type: Number, default: 0 },
  deduction_used: { type: Number, default: 0 },
  qbi_deduction: { type: Number, default: 0 },
  taxable_income: { type: Number, default: 0 },
  
  // Tax
  federal_tax: { type: Number, default: 0 },  // ✅ Added v26.0
  tax_before_credits: { type: Number, default: 0 },
  self_employment_tax: { type: Number, default: 0 },
  total_tax: { type: Number, default: 0 },
  
  // Credits
  child_tax_credit: { type: Number, default: 0 },
  other_dependent_credit: { type: Number, default: 0 },
  education_credits: { type: Number, default: 0 },
  child_care_credit: { type: Number, default: 0 },
  earned_income_credit: { type: Number, default: 0 },
  additional_child_tax_credit: { type: Number, default: 0 },
  total_credits: { type: Number, default: 0 },
  
  // Payments
  federal_withheld: { type: Number, default: 0 },
  state_withheld: { type: Number, default: 0 },
  estimated_payments: { type: Number, default: 0 },
  total_payments: { type: Number, default: 0 },
  
  // Result
  refund: { type: Number, default: 0 },
  amount_owed: { type: Number, default: 0 }
}, { _id: false });

/* =====================================================
   🏠 MAIN TAX SESSION SCHEMA
===================================================== */

const TaxSessionSchema = new Schema({
  userId: { type: String, required: true },
  taxYear: { type: Number, required: true, default: 2025 },
  
  // Status
  status: {
    type: String,
    enum: ['in_progress', 'interview_complete', 'ready_for_review', 'submitted', 'accepted', 'rejected'],
    default: 'in_progress'
  },
  step: { type: String, default: 'welcome' },
  language: { type: String, default: 'en' },
  
  // Filing Info
  filing_status: {
    type: String,
    enum: ['single', 'married_filing_jointly', 'married_filing_separately', 'head_of_household', 'qualifying_widow'],
    default: 'single'
  },
  
  // Personal Info
  taxpayer: { type: PersonSchema, default: () => ({}) },
  spouse: { type: PersonSchema, default: () => ({}) },
  address: { type: AddressSchema, default: () => ({}) },
  dependents: { type: [DependentSchema], default: [] },
  
  // Bank Info (for refund)
  bank_info: {
    routing_number: { type: String, default: '' },
    account_number: { type: String, default: '' },
    account_type: { type: String, enum: ['checking', 'savings', ''], default: '' }
  },
  
  /* ===================================================
     📄 INPUT FORMS (Arrays - Raw Data from User)
  =================================================== */
  input_forms: {
    w2: { type: [W2Schema], default: [] },
    form_1099_int: { type: [Form1099INTSchema], default: [] },
    form_1099_div: { type: [Form1099DIVSchema], default: [] },
    form_1099_nec: { type: [Form1099NECSchema], default: [] },
    form_1099_misc: { type: [Form1099MISCSchema], default: [] },
    form_1099_b: { type: [Form1099BSchema], default: [] },
    form_1099_r: { type: [Form1099RSchema], default: [] },
    form_1099_g: { type: [Form1099GSchema], default: [] },
    form_ssa_1099: { type: [FormSSA1099Schema], default: [] },
    form_1098: { type: [Form1098Schema], default: [] },
    form_1098_t: { type: [Form1098TSchema], default: [] },
    form_1098_e: { type: [Form1098ESchema], default: [] }
  },
  
  /* ===================================================
     📊 SCHEDULES (Calculated from Input)
  =================================================== */
  schedules: {
    schedule_1: { type: Schedule1Schema, default: () => ({}) },
    schedule_2: { type: Schedule2Schema, default: () => ({}) },
    schedule_3: { type: Schedule3Schema, default: () => ({}) },
    schedule_a: { type: ScheduleASchema, default: () => ({}) },
    schedule_b: { type: ScheduleBSchema, default: () => ({}) },
    schedule_c: { type: [ScheduleCSchema], default: [] },  // ARRAY - multiple businesses
    schedule_d: { type: ScheduleDSchema, default: () => ({}) },
    schedule_e: { type: [ScheduleEPropertySchema], default: [] },  // ARRAY - multiple properties
    schedule_se: { type: ScheduleSESchema, default: () => ({}) }
  },
  
  /* ===================================================
     📝 ADDITIONAL FORMS (Calculated)
  =================================================== */
  additional_forms: {
    form_8812: { type: Form8812Schema, default: () => ({}) },
    form_8863: { type: Form8863Schema, default: () => ({}) },
    form_2441: { type: Form2441Schema, default: () => ({}) },
    form_8889_taxpayer: { type: Form8889Schema, default: () => ({}) },
    form_8889_spouse: { type: Form8889Schema, default: () => ({}) }
  },
  
  /* ===================================================
     📊 TOTALS (Summary of All Data)
  =================================================== */
  totals: { type: TotalsSchema, default: () => ({}) },
  
  /* ===================================================
     📄 FORM 1040 (Final Output)
  =================================================== */
  form1040: { type: Form1040Schema, default: () => ({}) },
  
  /* ===================================================
     💬 CHAT & LEGACY
  =================================================== */
  messages: { type: Array, default: [] },
  answers: { type: Object, default: {} }  // Legacy chat answers
  
}, { timestamps: true });

// Unique index
TaxSessionSchema.index({ userId: 1, taxYear: 1 }, { unique: true });

/* =====================================================
   📊 TAX CONSTANTS 2025
===================================================== */

const TAX_CONSTANTS_2025 = {
  // ✅ CORRECTED 2025 Standard Deductions
  STANDARD_DEDUCTION: {
    single: 15750,
    married_filing_jointly: 31500,
    married_filing_separately: 15750,
    head_of_household: 23625,
    qualifying_widow: 31500,
    qualifying_surviving_spouse: 31500
  },
  
  // ✅ 2025 Federal Tax Brackets
  TAX_BRACKETS: {
    single: [
      { max: 11925, rate: 0.10 },
      { max: 48475, rate: 0.12 },
      { max: 103350, rate: 0.22 },
      { max: 197300, rate: 0.24 },
      { max: 250525, rate: 0.32 },
      { max: 626350, rate: 0.35 },
      { max: Infinity, rate: 0.37 }
    ],
    married_filing_jointly: [
      { max: 23850, rate: 0.10 },
      { max: 96950, rate: 0.12 },
      { max: 206700, rate: 0.22 },
      { max: 394600, rate: 0.24 },
      { max: 501050, rate: 0.32 },
      { max: 751600, rate: 0.35 },
      { max: Infinity, rate: 0.37 }
    ],
    married_filing_separately: [
      { max: 11925, rate: 0.10 },
      { max: 48475, rate: 0.12 },
      { max: 103350, rate: 0.22 },
      { max: 197300, rate: 0.24 },
      { max: 250525, rate: 0.32 },
      { max: 375800, rate: 0.35 },
      { max: Infinity, rate: 0.37 }
    ],
    head_of_household: [
      { max: 17000, rate: 0.10 },
      { max: 64850, rate: 0.12 },
      { max: 103350, rate: 0.22 },
      { max: 197300, rate: 0.24 },
      { max: 250500, rate: 0.32 },
      { max: 626350, rate: 0.35 },
      { max: Infinity, rate: 0.37 }
    ],
    qualifying_widow: [
      { max: 23850, rate: 0.10 },
      { max: 96950, rate: 0.12 },
      { max: 206700, rate: 0.22 },
      { max: 394600, rate: 0.24 },
      { max: 501050, rate: 0.32 },
      { max: 751600, rate: 0.35 },
      { max: Infinity, rate: 0.37 }
    ],
    qualifying_surviving_spouse: [
      { max: 23850, rate: 0.10 },
      { max: 96950, rate: 0.12 },
      { max: 206700, rate: 0.22 },
      { max: 394600, rate: 0.24 },
      { max: 501050, rate: 0.32 },
      { max: 751600, rate: 0.35 },
      { max: Infinity, rate: 0.37 }
    ]
  },
  
  // ✅ IRA Deduction Income Limits (WITH workplace retirement plan)
  IRA_INCOME_LIMITS: {
    single: {
      full_deduction_under: 79000,
      phase_out_end: 89000
    },
    married_filing_jointly: {
      full_deduction_under: 126000,
      phase_out_end: 146000
    },
    married_filing_separately: {
      full_deduction_under: 0,
      phase_out_end: 10000
    },
    head_of_household: {
      full_deduction_under: 79000,
      phase_out_end: 89000
    }
  },
  
  CHILD_TAX_CREDIT: 2000,
  OTHER_DEPENDENT_CREDIT: 500,
  SALT_CAP: 10000,
  IRA_LIMIT_UNDER_50: 7000,
  IRA_LIMIT_50_PLUS: 8000,
  HSA_LIMIT_SELF: 4300,
  HSA_LIMIT_FAMILY: 8550,
  HSA_CATCH_UP_55: 1000,
  STUDENT_LOAN_MAX: 2500,
  EDUCATOR_MAX: 300
};

/* =====================================================
   🔧 METHODS
===================================================== */

// Add W-2
TaxSessionSchema.methods.addW2 = function(data) {
  this.input_forms.w2.push(data);
  this.markModified('input_forms.w2');
  this.rebuildAllData();
  return { success: true, count: this.input_forms.w2.length };
};

// Add 1099-INT
TaxSessionSchema.methods.add1099INT = function(data) {
  this.input_forms.form_1099_int.push(data);
  this.markModified('input_forms.form_1099_int');
  this.rebuildAllData();
  return { success: true, count: this.input_forms.form_1099_int.length };
};

// Add 1099-DIV
TaxSessionSchema.methods.add1099DIV = function(data) {
  this.input_forms.form_1099_div.push(data);
  this.markModified('input_forms.form_1099_div');
  this.rebuildAllData();
  return { success: true, count: this.input_forms.form_1099_div.length };
};

// Add 1099-B
TaxSessionSchema.methods.add1099B = function(data) {
  data.gain_loss = (data.box_1d_proceeds || 0) - (data.box_1e_cost_basis || 0);
  this.input_forms.form_1099_b.push(data);
  this.markModified('input_forms.form_1099_b');
  this.rebuildAllData();
  return { success: true, count: this.input_forms.form_1099_b.length };
};

// Add Schedule C (Business)
TaxSessionSchema.methods.addScheduleC = function(data) {
  // Calculate net profit
  const expenses = 
    (data.line_8_advertising || 0) +
    (data.line_9_car_truck || 0) +
    (data.line_10_commissions || 0) +
    (data.line_11_contract_labor || 0) +
    (data.line_15_insurance || 0) +
    (data.line_17_legal_professional || 0) +
    (data.line_18_office_expense || 0) +
    (data.line_21_repairs_maintenance || 0) +
    (data.line_22_supplies || 0) +
    (data.line_23_taxes_licenses || 0) +
    (data.line_24a_travel || 0) +
    (data.line_24b_meals || 0) +
    (data.line_25_utilities || 0) +
    (data.line_27a_other_expenses || 0);
  
  data.line_28_total_expenses = expenses;
  data.line_7_gross_income = (data.line_1_gross_receipts || 0) - (data.line_2_returns_allowances || 0);
  data.line_29_tentative_profit = data.line_7_gross_income - expenses;
  data.line_31_net_profit_loss = data.line_29_tentative_profit - (data.line_30_home_office || 0);
  
  this.schedules.schedule_c.push(data);
  this.markModified('schedules.schedule_c');
  this.rebuildAllData();
  return { success: true, count: this.schedules.schedule_c.length, net_profit: data.line_31_net_profit_loss };
};

// Add Schedule E Property (Rental)
TaxSessionSchema.methods.addScheduleEProperty = function(data) {
  // Calculate net income
  const expenses = 
    (data.line_5_advertising || 0) +
    (data.line_6_auto_travel || 0) +
    (data.line_7_cleaning_maintenance || 0) +
    (data.line_8_commissions || 0) +
    (data.line_9_insurance || 0) +
    (data.line_10_legal_professional || 0) +
    (data.line_11_management_fees || 0) +
    (data.line_12_mortgage_interest || 0) +
    (data.line_14_repairs || 0) +
    (data.line_15_supplies || 0) +
    (data.line_16_taxes || 0) +
    (data.line_17_utilities || 0) +
    (data.line_18_depreciation || 0) +
    (data.line_19_other || 0);
  
  data.line_20_total_expenses = expenses;
  data.line_21_net_income_loss = (data.line_3_rents_received || 0) - expenses;
  
  this.schedules.schedule_e.push(data);
  this.markModified('schedules.schedule_e');
  this.rebuildAllData();
  return { success: true, count: this.schedules.schedule_e.length, net_income: data.line_21_net_income_loss };
};

// Add Dependent
TaxSessionSchema.methods.addDependent = function(data) {
  const age = data.dob ? calculateAge(data.dob, this.taxYear) : data.age;
  const qualifies_ctc = age !== null && age < 17;
  const qualifies_odc = age !== null && age >= 17;
  
  this.dependents.push({
    ...data,
    age,
    qualifies_ctc,
    qualifies_odc,
    credit_amount: qualifies_ctc ? TAX_CONSTANTS_2025.CHILD_TAX_CREDIT : 
                   qualifies_odc ? TAX_CONSTANTS_2025.OTHER_DEPENDENT_CREDIT : 0
  });
  
  this.markModified('dependents');
  this.rebuildAllData();
  return { success: true, age, qualifies_ctc, qualifies_odc };
};

/**
 * 🔥 MASTER REBUILD - Recalculate Everything
 */
TaxSessionSchema.methods.rebuildAllData = function() {
  this.rebuildTotals();
  this.rebuildSchedules();
  this.rebuildForm1040();
};

/**
 * Rebuild Totals from Input Forms
 * ✅ v26.0: Added federal tax calculation + IRA income limit check
 */
TaxSessionSchema.methods.rebuildTotals = function() {
  const t = this.totals;
  const inp = this.input_forms;
  const answers = this.answers || {};
  
  // Wages
  t.wages = inp.w2.reduce((sum, w) => sum + (w.box_1_wages || 0), 0);
  t.federal_withheld = inp.w2.reduce((sum, w) => sum + (w.box_2_federal_withheld || 0), 0);
  t.state_withheld = inp.w2.reduce((sum, w) => sum + (w.box_17_state_withheld || 0), 0);
  
  // Interest
  t.interest = inp.form_1099_int.reduce((sum, i) => sum + (i.box_1_interest || 0), 0);
  
  // Dividends
  t.dividends = inp.form_1099_div.reduce((sum, d) => sum + (d.box_1a_ordinary_dividends || 0), 0);
  
  // Capital Gains
  t.capital_gains = inp.form_1099_b.reduce((sum, b) => sum + (b.gain_loss || 0), 0);
  
  // Business Income (Schedule C)
  t.business_income = this.schedules.schedule_c.reduce((sum, c) => sum + (c.line_31_net_profit_loss || 0), 0);
  
  // Rental Income (Schedule E)
  t.rental_income = this.schedules.schedule_e.reduce((sum, e) => sum + (e.line_21_net_income_loss || 0), 0);
  
  // Social Security
  t.social_security = inp.form_ssa_1099.reduce((sum, s) => sum + (s.box_5_net_benefits || 0), 0);
  
  // Unemployment
  t.unemployment = inp.form_1099_g.reduce((sum, g) => sum + (g.box_1_unemployment || 0), 0);
  
  // Total Income
  t.total_income = t.wages + t.interest + t.dividends + t.capital_gains + 
                   t.business_income + t.rental_income + t.social_security + t.unemployment;
  
  // ════════════════════════════════════════════════════════════
  // ✅ ADJUSTMENTS - Calculate with IRA income limit check
  // ════════════════════════════════════════════════════════════
  
  // Get HSA from answers
  const hsaContribution = Number(answers.hsa || answers.hsa_contribution || 0);
  
  // Get 401(k) status (determines IRA eligibility)
  const taxpayerHas401k = answers.taxpayer_has_401k || answers.has_401k || false;
  const spouseHas401k = answers.spouse_has_401k || false;
  
  // Get IRA contributions
  const taxpayerIRA = Number(answers.taxpayer_ira || answers.ira || answers.ira_contribution || 0);
  const spouseIRA = Number(answers.spouse_ira || 0);
  
  // Get SE deduction
  const seDeduction = this.schedules.schedule_se.line_7_deduction_half_se_tax || 0;
  
  // Calculate preliminary AGI (before IRA - to check IRA eligibility)
  const preliminaryAGI = t.total_income - hsaContribution - seDeduction;
  
  // ✅ Calculate IRA deduction with income limit check
  const iraResult = this.calculateIRADeduction(
    taxpayerIRA, 
    spouseIRA, 
    preliminaryAGI, 
    this.filing_status, 
    taxpayerHas401k, 
    spouseHas401k
  );
  
  // Store IRA details
  t.ira_deduction = iraResult.totalDeductible;
  t.taxpayer_ira_deductible = iraResult.taxpayerDeductible;
  t.spouse_ira_deductible = iraResult.spouseDeductible;
  t.ira_not_deductible_reason = iraResult.reason;
  
  // ✅ v26.1: Store individual adjustment amounts for Dashboard
  t.hsa_deduction = hsaContribution;
  t.se_tax_deduction = seDeduction;
  
  // Total adjustments = HSA + deductible IRA + SE deduction
  t.total_adjustments = hsaContribution + iraResult.totalDeductible + seDeduction;
  
  // ════════════════════════════════════════════════════════════
  // AGI and Taxable Income
  // ════════════════════════════════════════════════════════════
  
  // Standard Deduction (2025 corrected values)
  t.standard_deduction = TAX_CONSTANTS_2025.STANDARD_DEDUCTION[this.filing_status] || 15750;
  t.deduction_used = t.standard_deduction; // TODO: compare with itemized
  
  // AGI
  t.agi = t.total_income - t.total_adjustments;
  
  // ════════════════════════════════════════════════════════════
  // ✅ OBBB Deductions (v27.0) - Below-the-line!
  // These reduce TAXABLE INCOME, not AGI
  // ════════════════════════════════════════════════════════════
  
  // Tips deduction (max $25,000)
  const tips = Number(answers.tips_received || answers.taxpayer_w2_tips || answers.tips || 0);
  t.obbb_tips_deduction = Math.min(tips, 25000);
  
  // Overtime deduction (max $12,500 single / $25,000 MFJ)
  const overtime = Number(answers.overtime_pay || answers.overtime || 0);
  const overtimeMax = (this.filing_status === 'married_filing_jointly') ? 25000 : 12500;
  t.obbb_overtime_deduction = Math.min(overtime, overtimeMax);
  
  // Car loan interest deduction (max $10,000, NEW American-made only)
  const carLoanInterest = Number(answers.car_loan_interest || 0);
  const boughtNewCar = answers.bought_new_car || false;
  const carIsAmerican = answers.car_is_american || false;
  t.obbb_car_loan_deduction = (boughtNewCar && carIsAmerican) ? Math.min(carLoanInterest, 10000) : 0;
  
  // Senior deduction ($6,000 per person 65+) - auto from DOB
  let seniorCount = 0;
  if (this.taxpayer && this.taxpayer.dob) {
    const taxpayerAge = calculateAge(this.taxpayer.dob, this.taxYear);
    if (taxpayerAge >= 65) seniorCount++;
  }
  if (this.filing_status === 'married_filing_jointly' && this.spouse && this.spouse.dob) {
    const spouseAge = calculateAge(this.spouse.dob, this.taxYear);
    if (spouseAge >= 65) seniorCount++;
  }
  t.obbb_senior_deduction = seniorCount * 6000;
  
  // Total OBBB (below-the-line)
  t.obbb_total_deduction = t.obbb_tips_deduction + t.obbb_overtime_deduction + 
                           t.obbb_car_loan_deduction + t.obbb_senior_deduction;
  
  // ✅ Taxable Income = AGI - Standard Deduction - OBBB
  t.taxable_income = Math.max(0, t.agi - t.deduction_used - t.obbb_total_deduction);
  
  // ════════════════════════════════════════════════════════════
  // ✅ FEDERAL TAX (using 2025 brackets)
  // ════════════════════════════════════════════════════════════
  t.federal_tax = this.calculateFederalTax(t.taxable_income, this.filing_status);
  t.tax_before_credits = t.federal_tax;
  
  // Credits
  t.child_tax_credit = this.dependents.filter(d => d.qualifies_ctc).length * TAX_CONSTANTS_2025.CHILD_TAX_CREDIT;
  t.other_dependent_credit = this.dependents.filter(d => d.qualifies_odc).length * TAX_CONSTANTS_2025.OTHER_DEPENDENT_CREDIT;
  t.total_credits = t.child_tax_credit + t.other_dependent_credit + (t.education_credits || 0) + (t.child_care_credit || 0);
  
  // Payments
  t.total_payments = t.federal_withheld + (t.estimated_payments || 0);
  
  this.markModified('totals');
};

/**
 * ✅ Calculate Federal Tax using 2025 brackets
 */
TaxSessionSchema.methods.calculateFederalTax = function(taxableIncome, filingStatus) {
  if (taxableIncome <= 0) return 0;
  
  const brackets = TAX_CONSTANTS_2025.TAX_BRACKETS[filingStatus] || 
                   TAX_CONSTANTS_2025.TAX_BRACKETS.single;
  
  let tax = 0;
  let prevMax = 0;
  
  for (const bracket of brackets) {
    if (taxableIncome <= prevMax) break;
    
    const taxableInBracket = Math.min(taxableIncome, bracket.max) - prevMax;
    tax += taxableInBracket * bracket.rate;
    prevMax = bracket.max;
  }
  
  return Math.round(tax);
};

/**
 * ✅ Calculate IRA Deduction with Income Limits
 * 
 * Rules:
 * - If NO workplace retirement plan: IRA is always fully deductible
 * - If HAS workplace retirement plan: Check income limits
 *   - MFJ: Full deduction if AGI < $126,000, phase out $126k-$146k, none above $146k
 *   - Single/HOH: Full deduction if AGI < $79,000, phase out $79k-$89k, none above $89k
 */
TaxSessionSchema.methods.calculateIRADeduction = function(taxpayerIRA, spouseIRA, preliminaryAGI, filingStatus, taxpayerHas401k, spouseHas401k) {
  let taxpayerDeductible = 0;
  let spouseDeductible = 0;
  let reason = '';
  
  const limits = TAX_CONSTANTS_2025.IRA_INCOME_LIMITS[filingStatus] || 
                 TAX_CONSTANTS_2025.IRA_INCOME_LIMITS.single;
  
  // ═══════════════════════════════════════════════════════
  // TAXPAYER IRA
  // ═══════════════════════════════════════════════════════
  if (taxpayerIRA > 0) {
    if (!taxpayerHas401k) {
      // No 401(k) = always fully deductible
      taxpayerDeductible = taxpayerIRA;
    } else {
      // Has 401(k) = check income limits
      if (preliminaryAGI < limits.full_deduction_under) {
        taxpayerDeductible = taxpayerIRA;
      } else if (preliminaryAGI <= limits.phase_out_end) {
        // Partial deduction (phase-out)
        const phaseOutRange = limits.phase_out_end - limits.full_deduction_under;
        const overAmount = preliminaryAGI - limits.full_deduction_under;
        const reductionRatio = overAmount / phaseOutRange;
        taxpayerDeductible = Math.round(taxpayerIRA * (1 - reductionRatio));
        reason = `Taxpayer IRA partially deductible (phase-out)`;
      } else {
        // Over limit = not deductible
        taxpayerDeductible = 0;
        reason = `Taxpayer IRA NOT deductible: AGI $${preliminaryAGI.toLocaleString()} > $${limits.phase_out_end.toLocaleString()} limit (has 401k)`;
      }
    }
  }
  
  // ═══════════════════════════════════════════════════════
  // SPOUSE IRA (for MFJ)
  // ═══════════════════════════════════════════════════════
  if (spouseIRA > 0 && filingStatus === 'married_filing_jointly') {
    if (!spouseHas401k) {
      // Spouse has no 401(k) = always fully deductible
      spouseDeductible = spouseIRA;
    } else {
      // Spouse has 401(k) = check income limits
      if (preliminaryAGI < limits.full_deduction_under) {
        spouseDeductible = spouseIRA;
      } else if (preliminaryAGI <= limits.phase_out_end) {
        // Partial deduction
        const phaseOutRange = limits.phase_out_end - limits.full_deduction_under;
        const overAmount = preliminaryAGI - limits.full_deduction_under;
        const reductionRatio = overAmount / phaseOutRange;
        spouseDeductible = Math.round(spouseIRA * (1 - reductionRatio));
        reason += (reason ? '; ' : '') + `Spouse IRA partially deductible (phase-out)`;
      } else {
        // Over limit
        spouseDeductible = 0;
        reason += (reason ? '; ' : '') + `Spouse IRA NOT deductible: AGI $${preliminaryAGI.toLocaleString()} > $${limits.phase_out_end.toLocaleString()} limit (has 401k)`;
      }
    }
  }
  
  return {
    taxpayerDeductible,
    spouseDeductible,
    totalDeductible: taxpayerDeductible + spouseDeductible,
    reason: reason || 'IRA fully deductible'
  };
};

/**
 * Rebuild Schedules from Input
 */
TaxSessionSchema.methods.rebuildSchedules = function() {
  // Schedule B
  this.schedules.schedule_b.line_4_taxable_interest = this.totals.interest;
  this.schedules.schedule_b.line_6_ordinary_dividends = this.totals.dividends;
  
  // Schedule D
  const stGains = this.input_forms.form_1099_b.filter(b => b.is_short_term).reduce((s, b) => s + (b.gain_loss || 0), 0);
  const ltGains = this.input_forms.form_1099_b.filter(b => !b.is_short_term).reduce((s, b) => s + (b.gain_loss || 0), 0);
  this.schedules.schedule_d.line_7_net_st_gain_loss = stGains;
  this.schedules.schedule_d.line_15_net_lt_gain_loss = ltGains;
  this.schedules.schedule_d.line_16_combine_7_15 = stGains + ltGains;
  
  // Schedule SE (if self-employment)
  if (this.totals.business_income > 0) {
    const seIncome = this.totals.business_income * 0.9235;
    this.schedules.schedule_se.line_2_net_nonfarm_profit = this.totals.business_income;
    this.schedules.schedule_se.line_4_multiply_92_35 = seIncome;
    this.schedules.schedule_se.line_6_se_tax = seIncome * 0.153;
    this.schedules.schedule_se.line_7_deduction_half_se_tax = this.schedules.schedule_se.line_6_se_tax / 2;
    this.totals.self_employment_tax = this.schedules.schedule_se.line_6_se_tax;
  }
  
  // Schedule 1
  this.schedules.schedule_1.line_3_business_income = this.totals.business_income;
  this.schedules.schedule_1.line_5_rental_income = this.totals.rental_income;
  this.schedules.schedule_1.line_7_unemployment = this.totals.unemployment;
  // ✅ v26.1: Store individual adjustment items in Schedule 1
  this.schedules.schedule_1.line_13_hsa_deduction = this.totals.hsa_deduction || 0;
  this.schedules.schedule_1.line_15_deductible_self_employment = this.schedules.schedule_se.line_7_deduction_half_se_tax || 0;
  this.schedules.schedule_1.line_20_ira_deduction = this.totals.ira_deduction || 0;
  this.schedules.schedule_1.line_25_total_adjustments = this.totals.total_adjustments || 0;
  
  this.markModified('schedules');
};

/**
 * Rebuild Form 1040 from Totals
 * ✅ v26.0: Added federal tax calculation
 */
TaxSessionSchema.methods.rebuildForm1040 = function() {
  const t = this.totals;
  const f = this.form1040;
  
  // Income
  f.income.line_1z_total_wages = t.wages;
  f.income.line_2b_taxable_interest = t.interest;
  f.income.line_3b_ordinary_dividends = t.dividends;
  f.income.line_7_capital_gain = t.capital_gains;
  f.income.line_8_schedule_1_income = t.business_income + t.rental_income + t.unemployment;
  f.income.line_9_total_income = t.total_income;
  
  // Adjustments
  f.adjustments.line_10_schedule_1_adjustments = t.total_adjustments;
  f.adjustments.line_11_agi = t.agi;
  
  // Deductions
  f.deductions.line_12a_standard_deduction = t.standard_deduction;
  f.deductions.line_14_total_deductions = t.deduction_used;
  f.deductions.line_15_taxable_income = t.taxable_income;
  
  // ✅ Tax (v26.0)
  f.tax_credits.line_16_tax = t.federal_tax || 0;
  f.tax_credits.line_18_total_tax_before_credits = t.tax_before_credits || 0;
  
  // Credits
  f.tax_credits.line_19_child_tax_credit = t.child_tax_credit + t.other_dependent_credit;
  f.tax_credits.line_21_total_credits = t.total_credits;
  f.tax_credits.line_22_tax_minus_credits = Math.max(0, (t.tax_before_credits || 0) - t.total_credits);
  f.tax_credits.line_23_schedule_2_line_18 = t.self_employment_tax || 0;
  f.tax_credits.line_24_total_tax = f.tax_credits.line_22_tax_minus_credits + (t.self_employment_tax || 0);
  
  // Payments
  f.payments.line_25d_total_withholding = t.federal_withheld;
  f.payments.line_33_total_payments = t.total_payments;
  
  // ✅ Refund/Owed (fixed calculation)
  const totalTax = f.tax_credits.line_24_total_tax;
  
  if (t.total_payments > totalTax) {
    // REFUND
    f.refund.line_34_overpaid = t.total_payments - totalTax;
    f.refund.line_35a_refund_amount = f.refund.line_34_overpaid;
    f.refund.line_37_amount_owed = 0;
    t.refund = f.refund.line_34_overpaid;
    t.amount_owed = 0;
  } else {
    // AMOUNT OWED
    f.refund.line_34_overpaid = 0;
    f.refund.line_35a_refund_amount = 0;
    f.refund.line_37_amount_owed = totalTax - t.total_payments;
    t.amount_owed = f.refund.line_37_amount_owed;
    t.refund = 0;
  }
  
  // Store total tax
  t.total_tax = totalTax;
  
  this.markModified('form1040');
  this.markModified('totals');
};

/**
 * Get Summary
 */
TaxSessionSchema.methods.getSummary = function() {
  return {
    filing_status: this.filing_status,
    taxpayer_name: `${this.taxpayer.first_name} ${this.taxpayer.last_name}`.trim(),
    dependents_count: this.dependents.length,
    w2_count: this.input_forms.w2.length,
    business_count: this.schedules.schedule_c.length,
    rental_count: this.schedules.schedule_e.length,
    ...this.totals.toObject()
  };
};

/* =====================================================
   EXPORT
===================================================== */

export default mongoose.model('TaxSession', TaxSessionSchema);