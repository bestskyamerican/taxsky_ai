// ============================================================
// TAX DATA MODEL - FIXED FOR 2025 OBBB
// ============================================================
// ✅ FIXED: 2025 Standard Deductions (OBBB - One Big Beautiful Bill)
// ✅ FIXED: Age 65+ Additional Deduction ($2,000 single / $1,600 MFJ)
// ✅ FIXED: OBBB Senior Bonus ($6,000 per person with phase-out)
// ✅ FIXED: 2025 Tax Brackets
// ✅ FIXED: Added adjustments (IRA, HSA, Student Loan)
// ============================================================

import mongoose from 'mongoose';

// ============================================================
// 2025 TAX CONSTANTS (OBBB - Signed July 4, 2025)
// ============================================================

// Standard Deductions - IRS Form 1040 (2025) Page 2
const STANDARD_DEDUCTIONS_2025 = {
  'single': 15750,
  'married_filing_jointly': 31500,
  'married_filing_separately': 15750,
  'head_of_household': 23625,
  'qualifying_surviving_spouse': 31500
};

// Additional Standard Deduction for Age 65+ (per person)
// Line 12d: "Were born before January 2, 1961"
const ADDITIONAL_DEDUCTION_65 = {
  'single': 2000,
  'married_filing_jointly': 1600,      // per spouse
  'married_filing_separately': 1600,
  'head_of_household': 2000,
  'qualifying_surviving_spouse': 1600
};

// OBBB Senior Bonus Deduction (2025-2028)
// Schedule 1-A, Line 13b - $6,000 per person age 65+
// Phases out at 6% for MAGI over threshold
const SENIOR_BONUS = {
  amount: 6000,
  phaseout: {
    'single': { start: 75000, end: 175000 },
    'married_filing_jointly': { start: 150000, end: 250000 },
    'married_filing_separately': { start: 75000, end: 175000 },
    'head_of_household': { start: 75000, end: 175000 },
    'qualifying_surviving_spouse': { start: 150000, end: 250000 }
  }
};

// ============================================================
// RAW DOCUMENT - Each uploaded document
// ============================================================
const RawDocumentSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  
  documentType: { 
    type: String, 
    enum: ['W-2', '1099-NEC', '1099-INT', '1099-DIV', '1099-R', '1099-MISC', '1099-G'],
    required: true 
  },
  documentNumber: { type: Number, default: 1 },
  
  owner: { type: String, enum: ['taxpayer', 'spouse'], default: 'taxpayer' },
  sourceName: String,
  
  rawData: mongoose.Schema.Types.Mixed,
  
  parsedData: {
    name: String,
    ssn: String,
    address: String,
    
    // W-2 fields
    wages: Number,
    federalWithheld: Number,
    stateWages: Number,
    stateWithheld: Number,
    employerName: String,
    employerEIN: String,
    
    // 1099-NEC
    nonemployeeCompensation: Number,
    
    // 1099-INT
    interestIncome: Number,
    
    // 1099-DIV
    ordinaryDividends: Number,
    qualifiedDividends: Number
  },
  
  status: { type: String, enum: ['uploaded', 'parsed', 'confirmed'], default: 'uploaded' },
  isConfirmed: { type: Boolean, default: false },
  
  uploadedAt: { type: Date, default: Date.now }
});

// ============================================================
// FORM 1040 - Aggregated from all documents
// ============================================================
const Form1040Schema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  taxYear: { type: Number, default: 2025 },
  
  // TAXPAYER
  taxpayer: {
    firstName: String,
    lastName: String,
    ssn: String,
    dateOfBirth: String,
    age: Number,           // ✅ NEW: For age 65+ calculation
    is65OrOlder: Boolean   // ✅ NEW: Born before Jan 2, 1961
  },
  
  // SPOUSE
  spouse: {
    firstName: String,
    lastName: String,
    ssn: String,
    dateOfBirth: String,
    age: Number,           // ✅ NEW
    is65OrOlder: Boolean   // ✅ NEW
  },
  
  // ADDRESS
  address: {
    street: String,
    city: String,
    state: String,
    zip: String
  },
  
  // FILING STATUS
  filingStatus: String,
  
  // DEPENDENTS
  dependents: [{
    firstName: String,
    lastName: String,
    ssn: String,
    relationship: String,
    dateOfBirth: String,
    age: Number,
    childTaxCredit: Boolean,
    otherDependentCredit: Boolean
  }],
  
  // ============================================
  // INCOME - Aggregated with sources
  // ============================================
  income: {
    wages: {
      total: { type: Number, default: 0 },
      sources: [{
        documentId: mongoose.Schema.Types.ObjectId,
        employer: String,
        amount: Number,
        owner: String
      }]
    },
    
    interest: {
      total: { type: Number, default: 0 },
      sources: [{
        documentId: mongoose.Schema.Types.ObjectId,
        payer: String,
        amount: Number
      }]
    },
    
    dividends: {
      total: { type: Number, default: 0 },
      qualifiedTotal: { type: Number, default: 0 },
      sources: [{
        documentId: mongoose.Schema.Types.ObjectId,
        payer: String,
        ordinary: Number,
        qualified: Number
      }]
    },
    
    selfEmployment: {
      total: { type: Number, default: 0 },
      sources: [{
        documentId: mongoose.Schema.Types.ObjectId,
        payer: String,
        amount: Number
      }]
    },
    
    totalIncome: { type: Number, default: 0 }
  },
  
  // ============================================
  // ADJUSTMENTS (Schedule 1, Line 26)
  // ============================================
  adjustments: {
    iraContributions: { type: Number, default: 0 },
    hsaContributions: { type: Number, default: 0 },
    studentLoanInterest: { type: Number, default: 0 },
    seTaxDeduction: { type: Number, default: 0 },
    totalAdjustments: { type: Number, default: 0 }
  },
  
  // ============================================
  // WITHHOLDING
  // ============================================
  withholding: {
    federalW2: {
      total: { type: Number, default: 0 },
      sources: [{
        documentId: mongoose.Schema.Types.ObjectId,
        employer: String,
        amount: Number,
        owner: String
      }]
    },
    
    federal1099: {
      total: { type: Number, default: 0 },
      sources: [{
        documentId: mongoose.Schema.Types.ObjectId,
        payer: String,
        amount: Number
      }]
    },
    
    state: {
      total: { type: Number, default: 0 },
      sources: [{
        documentId: mongoose.Schema.Types.ObjectId,
        employer: String,
        amount: Number
      }]
    },
    
    totalWithholding: { type: Number, default: 0 }
  },
  
  // ============================================
  // TAX CALCULATION - Form 1040 Lines
  // ============================================
  agi: { type: Number, default: 0 },                    // Line 11
  
  // Line 12e - Standard Deduction breakdown
  deductionDetails: {
    baseDeduction: { type: Number, default: 15750 },    // Base standard deduction
    additional65Taxpayer: { type: Number, default: 0 }, // +$2,000 if 65+
    additional65Spouse: { type: Number, default: 0 },   // +$1,600 if spouse 65+
    seniorBonusTaxpayer: { type: Number, default: 0 },  // +$6,000 OBBB (with phaseout)
    seniorBonusSpouse: { type: Number, default: 0 },    // +$6,000 OBBB (with phaseout)
    totalDeduction: { type: Number, default: 15750 }    // Sum of all
  },
  
  standardDeduction: { type: Number, default: 15750 },  // Line 12e total
  taxableIncome: { type: Number, default: 0 },          // Line 15
  taxFromTables: { type: Number, default: 0 },          // Line 16
  selfEmploymentTax: { type: Number, default: 0 },      // Schedule SE
  childTaxCredit: { type: Number, default: 0 },         // Line 19
  additionalChildTaxCredit: { type: Number, default: 0 }, // Line 28
  totalTax: { type: Number, default: 0 },               // Line 24
  
  // ============================================
  // RESULT
  // ============================================
  refund: { type: Number, default: 0 },                 // Line 35a
  amountOwed: { type: Number, default: 0 },             // Line 37
  
  // ============================================
  // DOCUMENT TRACKING
  // ============================================
  documentCount: {
    w2: { type: Number, default: 0 },
    nec1099: { type: Number, default: 0 },
    int1099: { type: Number, default: 0 },
    div1099: { type: Number, default: 0 },
    total: { type: Number, default: 0 }
  },
  
  allDocumentIds: [mongoose.Schema.Types.ObjectId],
  
  // ============================================
  // STATUS
  // ============================================
  status: { 
    type: String, 
    enum: ['collecting', 'confirming', 'ready', 'filed'],
    default: 'collecting'
  },
  
  lastUpdated: { type: Date, default: Date.now }
});

// ============================================================
// INTERVIEW STATE
// ============================================================
const InterviewStateSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  
  currentPhase: {
    type: String,
    enum: ['documents', 'personal', 'filing', 'dependents', 'adjustments', 'review', 'done'],
    default: 'documents'
  },
  
  currentDocumentId: mongoose.Schema.Types.ObjectId,
  currentDocumentType: String,
  currentField: String,
  
  pendingDocuments: [{
    documentId: mongoose.Schema.Types.ObjectId,
    documentType: String,
    sourceName: String,
    status: { type: String, default: 'pending' }
  }],
  
  lastActivity: { type: Date, default: Date.now }
});

// ============================================================
// MODELS
// ============================================================
export const RawDocument = mongoose.model('RawDocument', RawDocumentSchema);
export const Form1040 = mongoose.model('Form1040', Form1040Schema);
export const InterviewState = mongoose.model('InterviewState', InterviewStateSchema);

// ============================================================
// HELPERS
// ============================================================

export async function getOrCreateForm1040(userId) {
  let form = await Form1040.findOne({ userId });
  if (!form) {
    form = new Form1040({ userId });
    await form.save();
  }
  return form;
}

export async function saveRawDocument(userId, documentType, rawData, owner = 'taxpayer') {
  const count = await RawDocument.countDocuments({ userId, documentType, owner });
  
  const doc = new RawDocument({
    userId,
    documentType,
    documentNumber: count + 1,
    owner,
    rawData,
    status: 'uploaded'
  });
  
  await doc.save();
  
  const form = await getOrCreateForm1040(userId);
  form.documentCount.total = (form.documentCount.total || 0) + 1;
  
  if (documentType === 'W-2') form.documentCount.w2++;
  else if (documentType === '1099-NEC') form.documentCount.nec1099++;
  else if (documentType === '1099-INT') form.documentCount.int1099++;
  else if (documentType === '1099-DIV') form.documentCount.div1099++;
  
  form.allDocumentIds.push(doc._id);
  await form.save();
  
  return doc;
}

export async function getRawDocuments(userId) {
  return await RawDocument.find({ userId }).sort({ documentType: 1, documentNumber: 1 });
}

export async function addDocumentToForm1040(userId, document) {
  const form = await getOrCreateForm1040(userId);
  const parsed = document.parsedData;
  const docId = document._id;
  const owner = document.owner;
  
  if (document.documentType === 'W-2') {
    form.income.wages.total += parsed.wages || 0;
    form.income.wages.sources.push({
      documentId: docId,
      employer: parsed.employerName || document.sourceName,
      amount: parsed.wages || 0,
      owner
    });
    
    form.withholding.federalW2.total += parsed.federalWithheld || 0;
    form.withholding.federalW2.sources.push({
      documentId: docId,
      employer: parsed.employerName,
      amount: parsed.federalWithheld || 0,
      owner
    });
    
    form.withholding.state.total += parsed.stateWithheld || 0;
    
  } else if (document.documentType === '1099-NEC') {
    form.income.selfEmployment.total += parsed.nonemployeeCompensation || 0;
    form.income.selfEmployment.sources.push({
      documentId: docId,
      payer: parsed.payerName || document.sourceName,
      amount: parsed.nonemployeeCompensation || 0
    });
    
  } else if (document.documentType === '1099-INT') {
    form.income.interest.total += parsed.interestIncome || 0;
    form.income.interest.sources.push({
      documentId: docId,
      payer: parsed.payerName || document.sourceName,
      amount: parsed.interestIncome || 0
    });
    
  } else if (document.documentType === '1099-DIV') {
    form.income.dividends.total += parsed.ordinaryDividends || 0;
    form.income.dividends.qualifiedTotal += parsed.qualifiedDividends || 0;
    form.income.dividends.sources.push({
      documentId: docId,
      payer: parsed.payerName || document.sourceName,
      ordinary: parsed.ordinaryDividends || 0,
      qualified: parsed.qualifiedDividends || 0
    });
  }
  
  recalculate(form);
  
  form.lastUpdated = new Date();
  await form.save();
  
  return form;
}

// ============================================================
// UPDATE ADJUSTMENTS
// ============================================================
export async function updateAdjustments(userId, adjustments) {
  const form = await getOrCreateForm1040(userId);
  
  if (adjustments.iraContributions !== undefined) {
    form.adjustments.iraContributions = parseFloat(adjustments.iraContributions) || 0;
  }
  if (adjustments.hsaContributions !== undefined) {
    form.adjustments.hsaContributions = parseFloat(adjustments.hsaContributions) || 0;
  }
  if (adjustments.studentLoanInterest !== undefined) {
    form.adjustments.studentLoanInterest = Math.min(parseFloat(adjustments.studentLoanInterest) || 0, 2500);
  }
  
  recalculate(form);
  
  form.lastUpdated = new Date();
  await form.save();
  
  return form;
}

// ============================================================
// ✅ UPDATE TAXPAYER/SPOUSE INFO (for age 65+ calculation)
// ============================================================
export async function updatePersonalInfo(userId, personalInfo) {
  const form = await getOrCreateForm1040(userId);
  
  // Update taxpayer info
  if (personalInfo.taxpayer) {
    Object.assign(form.taxpayer, personalInfo.taxpayer);
    
    // Calculate age if DOB provided
    if (personalInfo.taxpayer.dateOfBirth) {
      const age = calculateAge(personalInfo.taxpayer.dateOfBirth);
      form.taxpayer.age = age;
      form.taxpayer.is65OrOlder = age >= 65;
    }
  }
  
  // Update spouse info
  if (personalInfo.spouse) {
    Object.assign(form.spouse, personalInfo.spouse);
    
    if (personalInfo.spouse.dateOfBirth) {
      const age = calculateAge(personalInfo.spouse.dateOfBirth);
      form.spouse.age = age;
      form.spouse.is65OrOlder = age >= 65;
    }
  }
  
  // Update filing status
  if (personalInfo.filingStatus) {
    form.filingStatus = personalInfo.filingStatus;
  }
  
  // Update address
  if (personalInfo.address) {
    Object.assign(form.address, personalInfo.address);
  }
  
  recalculate(form);
  
  form.lastUpdated = new Date();
  await form.save();
  
  return form;
}

// ============================================================
// ✅ CALCULATE AGE FROM DOB
// ============================================================
function calculateAge(dateOfBirth) {
  if (!dateOfBirth) return null;
  
  let dob;
  if (typeof dateOfBirth === 'string') {
    // Handle MM/DD/YYYY or YYYY-MM-DD
    if (dateOfBirth.includes('/')) {
      const parts = dateOfBirth.split('/');
      dob = new Date(parts[2], parts[0] - 1, parts[1]);
    } else {
      dob = new Date(dateOfBirth);
    }
  } else {
    dob = new Date(dateOfBirth);
  }
  
  const today = new Date();
  const taxYear = 2025;
  const endOfTaxYear = new Date(taxYear, 11, 31); // Dec 31, 2025
  
  let age = endOfTaxYear.getFullYear() - dob.getFullYear();
  const m = endOfTaxYear.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && endOfTaxYear.getDate() < dob.getDate())) {
    age--;
  }
  
  return age;
}

// ============================================================
// ✅ CALCULATE SENIOR BONUS WITH PHASE-OUT
// ============================================================
function calculateSeniorBonus(filingStatus, magi) {
  const phaseout = SENIOR_BONUS.phaseout[filingStatus] || SENIOR_BONUS.phaseout['single'];
  
  if (magi <= phaseout.start) {
    return SENIOR_BONUS.amount; // Full $6,000
  }
  
  if (magi >= phaseout.end) {
    return 0; // Fully phased out
  }
  
  // Phase out at 6% rate: reduce by $60 for every $1,000 over threshold
  const overThreshold = magi - phaseout.start;
  const reduction = overThreshold * 0.06;
  
  return Math.max(0, Math.round((SENIOR_BONUS.amount - reduction) * 100) / 100);
}

// ============================================================
// ✅ CALCULATE TOTAL STANDARD DEDUCTION (with Age 65+ extras)
// ============================================================
function calculateStandardDeduction(form) {
  const filingStatus = form.filingStatus || 'single';
  const agi = form.agi || 0;
  
  // Initialize deduction details
  if (!form.deductionDetails) {
    form.deductionDetails = {};
  }
  
  // 1. Base standard deduction (Line 12e)
  const baseDeduction = STANDARD_DEDUCTIONS_2025[filingStatus] || 15750;
  form.deductionDetails.baseDeduction = baseDeduction;
  
  let totalDeduction = baseDeduction;
  
  // 2. Additional deduction for taxpayer age 65+ (Line 12d checkbox)
  let additional65Taxpayer = 0;
  if (form.taxpayer?.is65OrOlder) {
    additional65Taxpayer = ADDITIONAL_DEDUCTION_65[filingStatus] || 2000;
  }
  form.deductionDetails.additional65Taxpayer = additional65Taxpayer;
  totalDeduction += additional65Taxpayer;
  
  // 3. Additional deduction for spouse age 65+ (MFJ only)
  let additional65Spouse = 0;
  if (filingStatus === 'married_filing_jointly' && form.spouse?.is65OrOlder) {
    additional65Spouse = ADDITIONAL_DEDUCTION_65[filingStatus] || 1600;
  }
  form.deductionDetails.additional65Spouse = additional65Spouse;
  totalDeduction += additional65Spouse;
  
  // 4. OBBB Senior Bonus for taxpayer (Schedule 1-A, Line 13b)
  let seniorBonusTaxpayer = 0;
  if (form.taxpayer?.is65OrOlder) {
    seniorBonusTaxpayer = calculateSeniorBonus(filingStatus, agi);
  }
  form.deductionDetails.seniorBonusTaxpayer = seniorBonusTaxpayer;
  totalDeduction += seniorBonusTaxpayer;
  
  // 5. OBBB Senior Bonus for spouse (MFJ only)
  let seniorBonusSpouse = 0;
  if (filingStatus === 'married_filing_jointly' && form.spouse?.is65OrOlder) {
    seniorBonusSpouse = calculateSeniorBonus(filingStatus, agi);
  }
  form.deductionDetails.seniorBonusSpouse = seniorBonusSpouse;
  totalDeduction += seniorBonusSpouse;
  
  form.deductionDetails.totalDeduction = totalDeduction;
  form.standardDeduction = totalDeduction;
  
  console.log(`📋 Standard Deduction Breakdown:`);
  console.log(`   Base: $${baseDeduction.toLocaleString()}`);
  if (additional65Taxpayer > 0) console.log(`   + Age 65+ (You): $${additional65Taxpayer.toLocaleString()}`);
  if (additional65Spouse > 0) console.log(`   + Age 65+ (Spouse): $${additional65Spouse.toLocaleString()}`);
  if (seniorBonusTaxpayer > 0) console.log(`   + Senior Bonus (You): $${seniorBonusTaxpayer.toLocaleString()}`);
  if (seniorBonusSpouse > 0) console.log(`   + Senior Bonus (Spouse): $${seniorBonusSpouse.toLocaleString()}`);
  console.log(`   = Total: $${totalDeduction.toLocaleString()}`);
  
  return totalDeduction;
}

// ============================================================
// ✅ RECALCULATE WITH ALL ADJUSTMENTS + AGE 65+ DEDUCTIONS
// ============================================================
function recalculate(form) {
  // Total income (Line 9)
  form.income.totalIncome = 
    form.income.wages.total +
    form.income.interest.total +
    form.income.dividends.total +
    form.income.selfEmployment.total;
  
  // Self-employment tax deduction (half of SE tax)
  const seIncome = form.income.selfEmployment.total;
  form.selfEmploymentTax = seIncome > 400 ? Math.round(seIncome * 0.9235 * 0.153 * 100) / 100 : 0;
  form.adjustments.seTaxDeduction = Math.round(form.selfEmploymentTax * 0.5 * 100) / 100;
  
  // Total adjustments (Schedule 1, Line 26)
  form.adjustments.totalAdjustments = 
    (form.adjustments.iraContributions || 0) +
    (form.adjustments.hsaContributions || 0) +
    (form.adjustments.studentLoanInterest || 0) +
    (form.adjustments.seTaxDeduction || 0);
  
  // AGI (Line 11) = Total Income - Adjustments
  form.agi = form.income.totalIncome - form.adjustments.totalAdjustments;
  
  // ✅ Calculate standard deduction with age 65+ extras
  calculateStandardDeduction(form);
  
  // Taxable income (Line 15) = AGI - Standard Deduction
  form.taxableIncome = Math.max(0, form.agi - form.standardDeduction);
  
  // Tax from tables (Line 16) - 2025 brackets
  form.taxFromTables = calculateTax(form.taxableIncome, form.filingStatus);
  
  // Child tax credit (Line 19)
  const numChildren = form.dependents.filter(d => d.childTaxCredit).length;
  const potentialCTC = numChildren * 2000;
  form.childTaxCredit = Math.min(potentialCTC, form.taxFromTables);
  
  // Additional child tax credit - refundable (Line 28)
  const earnedIncome = form.income.wages.total + form.income.selfEmployment.total;
  if (earnedIncome > 2500 && numChildren > 0) {
    const unusedCTC = potentialCTC - form.childTaxCredit;
    const maxRefundable = numChildren * 1700; // 2025 max refundable per child
    const earnedIncomeLimit = Math.round((earnedIncome - 2500) * 0.15);
    form.additionalChildTaxCredit = Math.min(unusedCTC, maxRefundable, earnedIncomeLimit);
  } else {
    form.additionalChildTaxCredit = 0;
  }
  
  // Total tax (Line 24)
  const taxAfterCredits = Math.max(0, form.taxFromTables - form.childTaxCredit);
  form.totalTax = taxAfterCredits + form.selfEmploymentTax;
  
  // Total withholding (Line 25d)
  form.withholding.totalWithholding = 
    form.withholding.federalW2.total +
    form.withholding.federal1099.total;
  
  // Total payments (Line 33) = withholding + refundable credits
  const totalPayments = form.withholding.totalWithholding + form.additionalChildTaxCredit;
  
  // Refund or owed
  const diff = totalPayments - form.totalTax;
  if (diff >= 0) {
    form.refund = Math.round(diff * 100) / 100;
    form.amountOwed = 0;
  } else {
    form.refund = 0;
    form.amountOwed = Math.round(Math.abs(diff) * 100) / 100;
  }
  
  console.log(`📊 Tax Calculation:`);
  console.log(`   Total Income: $${form.income.totalIncome.toLocaleString()}`);
  console.log(`   Adjustments: $${form.adjustments.totalAdjustments.toLocaleString()}`);
  console.log(`   AGI: $${form.agi.toLocaleString()}`);
  console.log(`   Standard Deduction: $${form.standardDeduction.toLocaleString()}`);
  console.log(`   Taxable Income: $${form.taxableIncome.toLocaleString()}`);
  console.log(`   Tax: $${form.taxFromTables.toLocaleString()}`);
  console.log(`   ${form.refund > 0 ? `Refund: $${form.refund.toLocaleString()}` : `Owed: $${form.amountOwed.toLocaleString()}`}`);
}

// ============================================================
// ✅ 2025 TAX BRACKETS (IRS Revenue Procedure 2024-40)
// ============================================================
function calculateTax(taxableIncome, filingStatus) {
  let tax = 0;
  
  if (filingStatus === 'married_filing_jointly' || filingStatus === 'qualifying_surviving_spouse') {
    // 2025 MFJ / QSS brackets
    if (taxableIncome <= 23850) {
      tax = taxableIncome * 0.10;
    } else if (taxableIncome <= 96950) {
      tax = 2385 + (taxableIncome - 23850) * 0.12;
    } else if (taxableIncome <= 206700) {
      tax = 11157 + (taxableIncome - 96950) * 0.22;
    } else if (taxableIncome <= 394600) {
      tax = 35302 + (taxableIncome - 206700) * 0.24;
    } else if (taxableIncome <= 501050) {
      tax = 80398 + (taxableIncome - 394600) * 0.32;
    } else if (taxableIncome <= 751600) {
      tax = 114462 + (taxableIncome - 501050) * 0.35;
    } else {
      tax = 202154.50 + (taxableIncome - 751600) * 0.37;
    }
    
  } else if (filingStatus === 'head_of_household') {
    // 2025 HOH brackets
    if (taxableIncome <= 17000) {
      tax = taxableIncome * 0.10;
    } else if (taxableIncome <= 64850) {
      tax = 1700 + (taxableIncome - 17000) * 0.12;
    } else if (taxableIncome <= 103350) {
      tax = 7442 + (taxableIncome - 64850) * 0.22;
    } else if (taxableIncome <= 197300) {
      tax = 15912 + (taxableIncome - 103350) * 0.24;
    } else if (taxableIncome <= 250500) {
      tax = 38460 + (taxableIncome - 197300) * 0.32;
    } else if (taxableIncome <= 626350) {
      tax = 55484 + (taxableIncome - 250500) * 0.35;
    } else {
      tax = 187031.50 + (taxableIncome - 626350) * 0.37;
    }
    
  } else {
    // 2025 Single / MFS brackets
    if (taxableIncome <= 11925) {
      tax = taxableIncome * 0.10;
    } else if (taxableIncome <= 48475) {
      tax = 1192.50 + (taxableIncome - 11925) * 0.12;
    } else if (taxableIncome <= 103350) {
      tax = 5578.50 + (taxableIncome - 48475) * 0.22;
    } else if (taxableIncome <= 197300) {
      tax = 17651 + (taxableIncome - 103350) * 0.24;
    } else if (taxableIncome <= 250525) {
      tax = 40199 + (taxableIncome - 197300) * 0.32;
    } else if (taxableIncome <= 626350) {
      tax = 57231 + (taxableIncome - 250525) * 0.35;
    } else {
      tax = 188769.75 + (taxableIncome - 626350) * 0.37;
    }
  }
  
  return Math.round(tax * 100) / 100;
}

// ============================================================
// GET SUMMARY WITH ALL ADJUSTMENTS
// ============================================================
export async function getForm1040Summary(userId) {
  const form = await getOrCreateForm1040(userId);
  const docs = await getRawDocuments(userId);
  
  return {
    documents: {
      total: form.documentCount.total,
      w2: form.documentCount.w2,
      nec1099: form.documentCount.nec1099,
      int1099: form.documentCount.int1099,
      list: docs.map(d => ({
        id: d._id,
        type: d.documentType,
        number: d.documentNumber,
        source: d.sourceName,
        owner: d.owner,
        confirmed: d.isConfirmed
      }))
    },
    taxpayer: {
      name: `${form.taxpayer?.firstName || ''} ${form.taxpayer?.lastName || ''}`.trim(),
      age: form.taxpayer?.age,
      is65OrOlder: form.taxpayer?.is65OrOlder
    },
    spouse: form.filingStatus === 'married_filing_jointly' ? {
      name: `${form.spouse?.firstName || ''} ${form.spouse?.lastName || ''}`.trim(),
      age: form.spouse?.age,
      is65OrOlder: form.spouse?.is65OrOlder
    } : null,
    income: {
      wages: { total: form.income.wages.total, count: form.income.wages.sources.length },
      interest: { total: form.income.interest.total, count: form.income.interest.sources.length },
      dividends: { total: form.income.dividends.total, count: form.income.dividends.sources.length },
      selfEmployment: { total: form.income.selfEmployment.total, count: form.income.selfEmployment.sources.length },
      totalIncome: form.income.totalIncome
    },
    adjustments: {
      iraContributions: form.adjustments.iraContributions || 0,
      hsaContributions: form.adjustments.hsaContributions || 0,
      studentLoanInterest: form.adjustments.studentLoanInterest || 0,
      seTaxDeduction: form.adjustments.seTaxDeduction || 0,
      totalAdjustments: form.adjustments.totalAdjustments || 0
    },
    withholding: {
      federalW2: form.withholding.federalW2.total,
      federal1099: form.withholding.federal1099.total,
      state: form.withholding.state.total,
      total: form.withholding.totalWithholding
    },
    tax: {
      agi: form.agi,
      deductionDetails: form.deductionDetails,
      standardDeduction: form.standardDeduction,
      taxableIncome: form.taxableIncome,
      taxFromTables: form.taxFromTables,
      selfEmploymentTax: form.selfEmploymentTax,
      childTaxCredit: form.childTaxCredit,
      additionalChildTaxCredit: form.additionalChildTaxCredit,
      totalTax: form.totalTax
    },
    result: {
      refund: form.refund,
      owed: form.amountOwed
    }
  };
}

export default {
  RawDocument,
  Form1040,
  InterviewState,
  getOrCreateForm1040,
  saveRawDocument,
  getRawDocuments,
  addDocumentToForm1040,
  updateAdjustments,
  updatePersonalInfo,
  getForm1040Summary
};