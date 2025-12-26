// ============================================================
// TAX DATA MODEL - Multiple Documents → Aggregate to 1040
// ============================================================
//
// Example: John has 2 W-2s, 3 1099-NECs, 1 1099-INT
//          Jane (spouse) has 1 W-2
//
// All documents saved separately → Aggregated to Form 1040:
//   Line 1a = W-2#1 + W-2#2 + Spouse W-2 = Total Wages
//   Line 2b = 1099-INT#1 = Total Interest
//   Schedule C = 1099-NEC#1 + #2 + #3 = Self-Employment
//
// ============================================================

import mongoose from 'mongoose';

// ============================================================
// RAW DOCUMENT - Each uploaded document
// ============================================================
const RawDocumentSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  
  // Document type and number
  documentType: { 
    type: String, 
    enum: ['W-2', '1099-NEC', '1099-INT', '1099-DIV', '1099-R', '1099-MISC', '1099-G'],
    required: true 
  },
  documentNumber: { type: Number, default: 1 },  // W-2 #1, W-2 #2, etc.
  
  // Owner
  owner: { type: String, enum: ['taxpayer', 'spouse'], default: 'taxpayer' },
  
  // Source (employer/payer name)
  sourceName: String,
  
  // RAW data from Python OCR (stored exactly as-is)
  rawData: mongoose.Schema.Types.Mixed,
  
  // PARSED data (cleaned values ready for 1040)
  parsedData: {
    // Personal
    name: String,
    ssn: String,
    address: String,
    
    // W-2 fields
    wages: Number,              // Box 1
    federalWithheld: Number,    // Box 2
    stateWages: Number,         // Box 16
    stateWithheld: Number,      // Box 17
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
  
  // Status
  status: { type: String, enum: ['uploaded', 'parsed', 'confirmed'], default: 'uploaded' },
  isConfirmed: { type: Boolean, default: false },
  
  uploadedAt: { type: Date, default: Date.now }
});

// ============================================================
// FORM 1040 - Aggregated from all documents
// ============================================================
const Form1040Schema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  taxYear: { type: Number, default: 2024 },
  
  // TAXPAYER
  taxpayer: {
    firstName: String,
    lastName: String,
    ssn: String,
    dateOfBirth: String
  },
  
  // SPOUSE
  spouse: {
    firstName: String,
    lastName: String,
    ssn: String,
    dateOfBirth: String
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
    childTaxCredit: Boolean
  }],
  
  // ============================================
  // INCOME - Aggregated with sources
  // ============================================
  income: {
    // Line 1a - WAGES (sum of all W-2s)
    wages: {
      total: { type: Number, default: 0 },
      sources: [{
        documentId: mongoose.Schema.Types.ObjectId,
        employer: String,
        amount: Number,
        owner: String
      }]
    },
    
    // Line 2b - INTEREST (sum of all 1099-INTs)
    interest: {
      total: { type: Number, default: 0 },
      sources: [{
        documentId: mongoose.Schema.Types.ObjectId,
        payer: String,
        amount: Number
      }]
    },
    
    // Line 3b - DIVIDENDS (sum of all 1099-DIVs)
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
    
    // Schedule C - SELF-EMPLOYMENT (sum of all 1099-NECs)
    selfEmployment: {
      total: { type: Number, default: 0 },
      sources: [{
        documentId: mongoose.Schema.Types.ObjectId,
        payer: String,
        amount: Number
      }]
    },
    
    // TOTAL INCOME (Line 9)
    totalIncome: { type: Number, default: 0 }
  },
  
  // ============================================
  // WITHHOLDING - Aggregated from all sources
  // ============================================
  withholding: {
    // Line 25a - Federal from W-2s
    federalW2: {
      total: { type: Number, default: 0 },
      sources: [{
        documentId: mongoose.Schema.Types.ObjectId,
        employer: String,
        amount: Number,
        owner: String
      }]
    },
    
    // Line 25b - Federal from 1099s
    federal1099: {
      total: { type: Number, default: 0 },
      sources: [{
        documentId: mongoose.Schema.Types.ObjectId,
        payer: String,
        amount: Number
      }]
    },
    
    // State
    state: {
      total: { type: Number, default: 0 },
      sources: [{
        documentId: mongoose.Schema.Types.ObjectId,
        employer: String,
        amount: Number
      }]
    },
    
    // TOTAL WITHHOLDING
    totalWithholding: { type: Number, default: 0 }
  },
  
  // ============================================
  // TAX CALCULATION
  // ============================================
  standardDeduction: { type: Number, default: 14600 },
  taxableIncome: { type: Number, default: 0 },
  taxFromTables: { type: Number, default: 0 },
  selfEmploymentTax: { type: Number, default: 0 },
  childTaxCredit: { type: Number, default: 0 },
  totalTax: { type: Number, default: 0 },
  
  // ============================================
  // RESULT
  // ============================================
  refund: { type: Number, default: 0 },
  amountOwed: { type: Number, default: 0 },
  
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
    enum: ['documents', 'personal', 'filing', 'dependents', 'review', 'done'],
    default: 'documents'
  },
  
  // Document being confirmed
  currentDocumentId: mongoose.Schema.Types.ObjectId,
  currentDocumentType: String,
  currentField: String,
  
  // Pending documents to confirm
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

// Get or create Form 1040
export async function getOrCreateForm1040(userId) {
  let form = await Form1040.findOne({ userId });
  if (!form) {
    form = new Form1040({ userId });
    await form.save();
  }
  return form;
}

// Save raw document
export async function saveRawDocument(userId, documentType, rawData, owner = 'taxpayer') {
  // Get next document number
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
  
  // Update form counts
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

// Get all documents
export async function getRawDocuments(userId) {
  return await RawDocument.find({ userId }).sort({ documentType: 1, documentNumber: 1 });
}

// Add confirmed document to Form 1040
export async function addDocumentToForm1040(userId, document) {
  const form = await getOrCreateForm1040(userId);
  const parsed = document.parsedData;
  const docId = document._id;
  const owner = document.owner;
  
  if (document.documentType === 'W-2') {
    // Add to wages
    form.income.wages.total += parsed.wages || 0;
    form.income.wages.sources.push({
      documentId: docId,
      employer: parsed.employerName || document.sourceName,
      amount: parsed.wages || 0,
      owner
    });
    
    // Add to withholding
    form.withholding.federalW2.total += parsed.federalWithheld || 0;
    form.withholding.federalW2.sources.push({
      documentId: docId,
      employer: parsed.employerName,
      amount: parsed.federalWithheld || 0,
      owner
    });
    
    // State withholding
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
  
  // Recalculate
  recalculate(form);
  
  form.lastUpdated = new Date();
  await form.save();
  
  return form;
}

// Recalculate totals
function recalculate(form) {
  // Total income
  form.income.totalIncome = 
    form.income.wages.total +
    form.income.interest.total +
    form.income.dividends.total +
    form.income.selfEmployment.total;
  
  // Self-employment tax
  const seIncome = form.income.selfEmployment.total;
  form.selfEmploymentTax = seIncome > 0 ? Math.round(seIncome * 0.9235 * 0.153) : 0;
  
  // Standard deduction based on filing status
  const deductions = {
    'single': 14600,
    'married_filing_jointly': 29200,
    'married_filing_separately': 14600,
    'head_of_household': 21900
  };
  form.standardDeduction = deductions[form.filingStatus] || 14600;
  
  // Taxable income
  form.taxableIncome = Math.max(0, form.income.totalIncome - form.standardDeduction);
  
  // Tax from tables
  form.taxFromTables = calculateTax(form.taxableIncome, form.filingStatus);
  
  // Child tax credit
  const numChildren = form.dependents.filter(d => d.childTaxCredit).length;
  form.childTaxCredit = Math.min(numChildren * 2000, form.taxFromTables);
  
  // Total tax
  form.totalTax = Math.max(0, form.taxFromTables + form.selfEmploymentTax - form.childTaxCredit);
  
  // Total withholding
  form.withholding.totalWithholding = 
    form.withholding.federalW2.total +
    form.withholding.federal1099.total;
  
  // Refund or owed
  const diff = form.withholding.totalWithholding - form.totalTax;
  if (diff >= 0) {
    form.refund = diff;
    form.amountOwed = 0;
  } else {
    form.refund = 0;
    form.amountOwed = Math.abs(diff);
  }
}

function calculateTax(taxableIncome, filingStatus) {
  if (filingStatus === 'married_filing_jointly') {
    if (taxableIncome <= 23200) return Math.round(taxableIncome * 0.10);
    if (taxableIncome <= 94300) return Math.round(2320 + (taxableIncome - 23200) * 0.12);
    return Math.round(10852 + (taxableIncome - 94300) * 0.22);
  } else {
    if (taxableIncome <= 11600) return Math.round(taxableIncome * 0.10);
    if (taxableIncome <= 47150) return Math.round(1160 + (taxableIncome - 11600) * 0.12);
    return Math.round(5426 + (taxableIncome - 47150) * 0.22);
  }
}

// Get summary
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
    income: {
      wages: { total: form.income.wages.total, count: form.income.wages.sources.length },
      interest: { total: form.income.interest.total, count: form.income.interest.sources.length },
      dividends: { total: form.income.dividends.total, count: form.income.dividends.sources.length },
      selfEmployment: { total: form.income.selfEmployment.total, count: form.income.selfEmployment.sources.length },
      totalIncome: form.income.totalIncome
    },
    withholding: {
      federalW2: form.withholding.federalW2.total,
      federal1099: form.withholding.federal1099.total,
      total: form.withholding.totalWithholding
    },
    tax: {
      standardDeduction: form.standardDeduction,
      taxableIncome: form.taxableIncome,
      taxFromTables: form.taxFromTables,
      selfEmploymentTax: form.selfEmploymentTax,
      childTaxCredit: form.childTaxCredit,
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
  getForm1040Summary
};