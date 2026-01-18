// ============================================================
// SUBMIT FLOW - v4.0 WITH DOCUMENT UPLOAD
// ============================================================
// ✅ v3.1: Loads taxpayer/spouse data from form1040.header
// ✅ v3.1: Displays DOB and Age for taxpayer and spouse
// ✅ v3.1: Spouse name properly split from form1040.header
// ✅ v3.1: Federal owed reads from correct section
// ✅ v4.0: Added Document Upload step before filing
// ============================================================
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";
const PYTHON_API = import.meta.env.VITE_PYTHON_API || "http://localhost:5002";

const submitFlowTranslations = {
  en: {
    title: "File Your Tax Return", taxYear: "Tax Year 2025",
    steps: { reviewInfo: "Review Info", verifyIncome: "Income & Deductions", checkRefund: "Tax Summary", confirmSign: "Confirm & Sign", uploadDocs: "Upload Docs", complete: "Complete" },
    step1: {
      title: "Review Your Information", subtitle: "Please verify all information matches your tax documents",
      missingInfo: "Missing Required Information", clickEdit: "Please complete all required fields.",
      edit: "Edit", save: "Save", cancel: "Cancel", validating: "Validating...",
      fixMissing: "🔧 Auto-Fix Missing", fixing: "Fixing...",
      fixSuccess: "✅ Fields auto-filled! Please review placeholders.",
      taxpayerInfo: "Your Information (Form 1040)", name: "Name", ssn: "SSN", address: "Address",
      cityStateZip: "City, State ZIP", filingStatus: "Filing Status", notSelected: "Not selected",
      spouseInfo: "Spouse Information (Required for MFJ)", spouseSSN: "Spouse SSN",
      dependentsInfo: "Dependents", dependentRelationship: "Relationship", dependentAge: "Age",
      creditType: "Credit", ctc: "Child Tax Credit ($2,200)", odc: "Other Dependents ($500)",
      noDependents: "No dependents claimed", addDependent: "+ Add Dependent",
      confirmCorrect: "I confirm all information above is correct"
    },
    step2: {
      title: "Income, Adjustments & Deductions",
      incomeSection: "Income", w2Wages: "W-2 Wages", selfEmployment: "Self-Employment",
      interestIncome: "Interest", dividendIncome: "Dividends", capitalGains: "Capital Gains", totalIncome: "Total Income",
      adjustmentsSection: "Adjustments", iraDeduction: "IRA", hsaDeduction: "HSA",
      studentLoanInterest: "Student Loan", totalAdjustments: "Total Adjustments", agi: "AGI (Line 11)",
      deductionsSection: "Deductions", deductionType: "Type", standardDeduction: "Standard", itemizedDeduction: "Itemized",
      deductionAmount: "Amount", qbiDeduction: "QBI", taxableIncome: "Taxable Income",
      withholdingSection: "Tax Withheld", federalWithheld: "Federal Withheld", stateWithheld: "State Withheld"
    },
    step3: {
      title: "Tax Summary", estimatedRefund: "Estimated Refund", estimatedOwed: "Estimated Owed",
      federalSection: "Federal Tax", taxableIncome: "Taxable Income", bracketTax: "Tax", seTax: "SE Tax", federalCredits: "Credits",
      ctcNonrefundable: "CTC (non-refundable)", ctcRefundable: "ACTC (refundable)", eitc: "EITC",
      withholding: "Withholding", federalRefund: "Federal Refund", federalOwed: "Federal Owed",
      caSection: "California Tax", caAgi: "CA AGI", caDeduction: "CA Deduction", caTaxableIncome: "CA Taxable", caTax: "CA Tax",
      caCredits: "CA Credits", calEitc: "CalEITC", yctc: "YCTC", caWithholding: "CA Withholding", caRefund: "CA Refund", caOwed: "CA Owed",
      federal: "Federal", state: "California"
    },
    step4: { title: "Confirm & Sign", declaration: "Under penalties of perjury, I declare this return is true and complete.",
      signatureLabel: "Your Signature", spouseSignatureLabel: "Spouse Signature", dateLabel: "Date", agreeTerms: "I agree to the terms." },
    step5: { 
      title: "Upload Tax Documents",
      subtitle: "Upload your W-2s, 1099s, and other tax documents",
      uploadArea: "Click or drag files here to upload",
      supportedFormats: "Supported: PDF, JPG, PNG (max 10MB each)",
      uploadedFiles: "Uploaded Documents",
      noFiles: "No documents uploaded yet",
      uploading: "Uploading...",
      remove: "Remove",
      formTypes: {
        'W-2': 'W-2 (Wages)',
        '1099-INT': '1099-INT (Interest)',
        '1099-DIV': '1099-DIV (Dividends)',
        '1099-NEC': '1099-NEC (Self-Employment)',
        '1099-MISC': '1099-MISC (Miscellaneous)',
        '1099-G': '1099-G (Government)',
        '1099-R': '1099-R (Retirement)',
        'SSA-1099': 'SSA-1099 (Social Security)',
        'Other': 'Other Document'
      },
      skipUpload: "Skip - I'll upload later",
      continueWithUpload: "Continue"
    },
    step6: { fileToIRS: "File to IRS", filing: "Filing...", generatingPDF: "Generating PDF...", previewPDF: "Preview PDF",
      completeYourFiling: "Complete Your Filing", choosePlan: "Choose your plan", standardFiling: "Standard", premiumCPA: "Premium + CPA",
      cpaReview: "CPA REVIEW", features: { federalReturn: "Federal", stateReturn: "State", eFile: "E-File", downloadPDF: "PDF",
        everythingStandard: "All Standard", cpaReview: "CPA", auditProtection: "Audit Protection", prioritySupport: "Priority Support" },
      selectedPlan: "Plan", total: "Total" },
    step7: { cpaReviewTitle: "Submitted for CPA Review!", cpaReviewDesc: "CPA will review in 24-48 hours.",
      filedTitle: "Tax Return Filed!", filedDesc: "Successfully submitted to IRS.", confirmationNumber: "Confirmation", done: "Done" },
    buttons: { cancel: "Cancel", back: "Back", continue: "Continue", proceedToPayment: "Pay" },
    fields: { first_name: "First Name", last_name: "Last Name", ssn: "SSN", address: "Address", city: "City", state: "State", zip: "ZIP",
      filing_status: "Filing Status", spouse_first_name: "Spouse First Name", spouse_last_name: "Spouse Last Name", spouse_ssn: "Spouse SSN",
      dependent_relationship: "Relationship", dependent_dob: "Date of Birth" },
    filingStatusOptions: { select: "Select Filing Status...", single: "Single", married_filing_jointly: "Married Filing Jointly",
      married_filing_separately: "Married Filing Separately", head_of_household: "Head of Household", qualifying_surviving_spouse: "Qualifying Surviving Spouse" },
    relationships: { son: "Son", daughter: "Daughter", stepson: "Stepson", stepdaughter: "Stepdaughter", foster_child: "Foster Child",
      brother: "Brother", sister: "Sister", parent: "Parent", grandparent: "Grandparent", grandchild: "Grandchild", other: "Other" }
  },
  vi: {
    title: "Nop To Khai Thue", taxYear: "Nam Thue 2025",
    steps: { reviewInfo: "Xem Thong Tin", verifyIncome: "Thu Nhap", checkRefund: "Tom Tat", confirmSign: "Ky", uploadDocs: "Tai Len", complete: "Xong" },
    step1: { title: "Xem Lai Thong Tin", subtitle: "Xac nhan thong tin", missingInfo: "Thieu Thong Tin", clickEdit: "Hoan thanh cac truong.",
      edit: "Sua", save: "Luu", cancel: "Huy", validating: "Dang xac minh...",
      fixMissing: "🔧 Tu Dong Dien", fixing: "Dang sua...",
      fixSuccess: "✅ Da tu dong dien! Vui long xem lai.",
      taxpayerInfo: "Thong Tin Cua Ban", name: "Ho Ten", ssn: "SSN", address: "Dia Chi",
      cityStateZip: "Thanh Pho, Tieu Bang ZIP", filingStatus: "Tinh Trang", notSelected: "Chua chon",
      spouseInfo: "Thong Tin Vo/Chong", spouseSSN: "SSN Vo/Chong", dependentsInfo: "Nguoi Phu Thuoc", dependentRelationship: "Quan He", dependentAge: "Tuoi",
      creditType: "Tin Dung", ctc: "Child Tax Credit ($2,200)", odc: "Other Dependents ($500)",
      noDependents: "Khong co", addDependent: "+ Them", confirmCorrect: "Toi xac nhan thong tin chinh xac" },
    step5: {
      title: "Tai Len Tai Lieu Thue",
      subtitle: "Tai len W-2, 1099 va cac tai lieu thue khac",
      uploadArea: "Nhan hoac keo file vao day",
      supportedFormats: "Ho tro: PDF, JPG, PNG (toi da 10MB)",
      uploadedFiles: "Tai Lieu Da Tai Len",
      noFiles: "Chua co tai lieu nao",
      uploading: "Dang tai len...",
      remove: "Xoa",
      formTypes: {
        'W-2': 'W-2 (Luong)',
        '1099-INT': '1099-INT (Lai Suat)',
        '1099-DIV': '1099-DIV (Co Tuc)',
        '1099-NEC': '1099-NEC (Tu Doanh)',
        '1099-MISC': '1099-MISC (Khac)',
        '1099-G': '1099-G (Chinh Phu)',
        '1099-R': '1099-R (Huu Tri)',
        'SSA-1099': 'SSA-1099 (An Sinh)',
        'Other': 'Tai Lieu Khac'
      },
      skipUpload: "Bo qua - Tai len sau",
      continueWithUpload: "Tiep tuc"
    },
    step2: { title: "Thu Nhap & Khau Tru", incomeSection: "Thu Nhap", w2Wages: "Luong W-2", selfEmployment: "Tu Kinh Doanh",
      interestIncome: "Tien Lai", dividendIncome: "Co Tuc", capitalGains: "Lai Von", totalIncome: "Tong Thu Nhap",
      adjustmentsSection: "Dieu Chinh", iraDeduction: "IRA", hsaDeduction: "HSA", studentLoanInterest: "Vay Sinh Vien", totalAdjustments: "Tong Dieu Chinh", agi: "AGI",
      deductionsSection: "Khau Tru", deductionType: "Loai", standardDeduction: "Tieu Chuan", itemizedDeduction: "Chi Tiet",
      deductionAmount: "So Tien", qbiDeduction: "QBI", taxableIncome: "Thu Nhap Chiu Thue",
      withholdingSection: "Thue Da Khau Tru", federalWithheld: "LB", stateWithheld: "TB" },
    step3: { title: "Tom Tat Thue", estimatedRefund: "Hoan Thue", estimatedOwed: "No Thue",
      federalSection: "Thue Lien Bang", taxableIncome: "Thu Nhap Chiu Thue", bracketTax: "Thue", seTax: "Thue SE", federalCredits: "Tin Dung",
      ctcNonrefundable: "CTC", ctcRefundable: "ACTC", eitc: "EITC", withholding: "Khau Tru", federalRefund: "Hoan LB", federalOwed: "No LB",
      caSection: "Thue California", caAgi: "CA AGI", caDeduction: "Khau Tru CA", caTaxableIncome: "Chiu Thue CA", caTax: "Thue CA",
      caCredits: "Tin Dung CA", calEitc: "CalEITC", yctc: "YCTC", caWithholding: "Khau Tru CA", caRefund: "Hoan CA", caOwed: "No CA",
      federal: "Lien Bang", state: "California" },
    step4: { title: "Xac Nhan & Ky", declaration: "Toi tuyen bo to khai nay la dung.", signatureLabel: "Chu Ky", spouseSignatureLabel: "Chu Ky Vo/Chong", dateLabel: "Ngay", agreeTerms: "Toi dong y." },
    step5: { fileToIRS: "Nop IRS", filing: "Dang nop...", generatingPDF: "Dang tao PDF...", previewPDF: "Xem PDF",
      completeYourFiling: "Hoan Tat", choosePlan: "Chon goi", standardFiling: "Tieu Chuan", premiumCPA: "Premium + CPA", cpaReview: "CPA",
      features: { federalReturn: "Lien Bang", stateReturn: "Tieu Bang", eFile: "E-File", downloadPDF: "PDF", everythingStandard: "Tat ca", cpaReview: "CPA", auditProtection: "Bao Ve", prioritySupport: "Ho Tro" },
      selectedPlan: "Goi", total: "Tong" },
    step6: { cpaReviewTitle: "Da Gui CPA!", cpaReviewDesc: "CPA xem xet trong 24-48 gio.", filedTitle: "Da Nop!", filedDesc: "Nop thanh cong cho IRS.", confirmationNumber: "Xac Nhan", done: "Xong" },
    buttons: { cancel: "Huy", back: "Quay Lai", continue: "Tiep", proceedToPayment: "Thanh Toan" },
    fields: { first_name: "Ten", last_name: "Ho", ssn: "SSN", address: "Dia Chi", city: "Thanh Pho", state: "Tieu Bang", zip: "Ma Buu Dien",
      filing_status: "Tinh Trang Khai Thue", spouse_first_name: "Ten Vo/Chong", spouse_last_name: "Ho Vo/Chong", spouse_ssn: "SSN Vo/Chong",
      dependent_relationship: "Quan He", dependent_dob: "Ngay Sinh" },
    filingStatusOptions: { select: "Chon Tinh Trang...", single: "Doc Than", married_filing_jointly: "Vo Chong Khai Chung",
      married_filing_separately: "Vo Chong Khai Rieng", head_of_household: "Chu Ho", qualifying_surviving_spouse: "Goa Phu Du Dieu Kien" },
    relationships: { son: "Con Trai", daughter: "Con Gai", stepson: "Con Rieng Trai", stepdaughter: "Con Rieng Gai", foster_child: "Con Nuoi",
      brother: "Anh Em Trai", sister: "Chi Em Gai", parent: "Cha Me", grandparent: "Ong Ba", grandchild: "Chau", other: "Khac" }
  },
  es: {
    title: "Presentar Declaracion", taxYear: "Ano 2025",
    steps: { reviewInfo: "Revisar", verifyIncome: "Ingresos", checkRefund: "Resumen", confirmSign: "Firmar", complete: "Listo" },
    step1: { title: "Revisar Informacion", subtitle: "Verifique la informacion", missingInfo: "Falta Informacion", clickEdit: "Complete los campos.",
      edit: "Editar", save: "Guardar", cancel: "Cancelar", validating: "Validando...",
      fixMissing: "🔧 Auto-Completar", fixing: "Completando...",
      fixSuccess: "✅ Campos completados! Por favor revise.",
      taxpayerInfo: "Su Informacion", name: "Nombre", ssn: "SSN", address: "Direccion",
      cityStateZip: "Ciudad, Estado ZIP", filingStatus: "Estado Civil", notSelected: "No seleccionado",
      spouseInfo: "Conyuge", spouseSSN: "SSN Conyuge", dependentsInfo: "Dependientes", dependentRelationship: "Relacion", dependentAge: "Edad",
      creditType: "Credito", ctc: "Child Tax Credit ($2,200)", odc: "Other Dependents ($500)",
      noDependents: "Sin dependientes", addDependent: "+ Agregar", confirmCorrect: "Confirmo que es correcta" },
    step2: { title: "Ingresos y Deducciones", incomeSection: "Ingresos", w2Wages: "Salarios W-2", selfEmployment: "Independiente",
      interestIncome: "Intereses", dividendIncome: "Dividendos", capitalGains: "Ganancias", totalIncome: "Total Ingresos",
      adjustmentsSection: "Ajustes", iraDeduction: "IRA", hsaDeduction: "HSA", studentLoanInterest: "Prestamos", totalAdjustments: "Total Ajustes", agi: "AGI",
      deductionsSection: "Deducciones", deductionType: "Tipo", standardDeduction: "Estandar", itemizedDeduction: "Detallada",
      deductionAmount: "Monto", qbiDeduction: "QBI", taxableIncome: "Ingreso Gravable",
      withholdingSection: "Retenciones", federalWithheld: "Federal", stateWithheld: "Estatal" },
    step3: { title: "Resumen", estimatedRefund: "Reembolso", estimatedOwed: "Adeudo",
      federalSection: "Federal", taxableIncome: "Gravable", bracketTax: "Impuesto", seTax: "SE Tax", federalCredits: "Creditos",
      ctcNonrefundable: "CTC", ctcRefundable: "ACTC", eitc: "EITC", withholding: "Retencion", federalRefund: "Reembolso Fed", federalOwed: "Adeudo Fed",
      caSection: "California", caAgi: "CA AGI", caDeduction: "Deduccion CA", caTaxableIncome: "Gravable CA", caTax: "Impuesto CA",
      caCredits: "Creditos CA", calEitc: "CalEITC", yctc: "YCTC", caWithholding: "Retencion CA", caRefund: "Reembolso CA", caOwed: "Adeudo CA",
      federal: "Federal", state: "California" },
    step4: { title: "Firmar", declaration: "Declaro que es verdadera.", signatureLabel: "Firma", spouseSignatureLabel: "Firma Conyuge", dateLabel: "Fecha", agreeTerms: "Acepto." },
    step5: { fileToIRS: "Presentar", filing: "Presentando...", generatingPDF: "Generando PDF...", previewPDF: "Ver PDF",
      completeYourFiling: "Completar", choosePlan: "Elegir plan", standardFiling: "Estandar", premiumCPA: "Premium + CPA", cpaReview: "CPA",
      features: { federalReturn: "Federal", stateReturn: "Estatal", eFile: "E-File", downloadPDF: "PDF", everythingStandard: "Todo", cpaReview: "CPA", auditProtection: "Proteccion", prioritySupport: "Soporte" },
      selectedPlan: "Plan", total: "Total" },
    step6: { cpaReviewTitle: "Enviado!", cpaReviewDesc: "CPA revisara en 24-48 horas.", filedTitle: "Presentada!", filedDesc: "Enviada al IRS.", confirmationNumber: "Confirmacion", done: "Listo" },
    buttons: { cancel: "Cancelar", back: "Atras", continue: "Continuar", proceedToPayment: "Pagar" },
    fields: { first_name: "Nombre", last_name: "Apellido", ssn: "SSN", address: "Direccion", city: "Ciudad", state: "Estado", zip: "CP",
      filing_status: "Estado Civil", spouse_first_name: "Nombre Conyuge", spouse_last_name: "Apellido Conyuge", spouse_ssn: "SSN Conyuge",
      dependent_relationship: "Relacion", dependent_dob: "Nacimiento" },
    filingStatusOptions: { select: "Seleccionar...", single: "Soltero", married_filing_jointly: "Casado Conjunto",
      married_filing_separately: "Casado Separado", head_of_household: "Cabeza de Familia", qualifying_surviving_spouse: "Conyuge Sobreviviente" },
    relationships: { son: "Hijo", daughter: "Hija", stepson: "Hijastro", stepdaughter: "Hijastra", foster_child: "Crianza",
      brother: "Hermano", sister: "Hermana", parent: "Padre", grandparent: "Abuelo", grandchild: "Nieto", other: "Otro" }
  }
};

export default function SubmitFlow({ onClose, taxData, userData: initialUserData, userId, token }) {
  const navigate = useNavigate();
  const { language } = useLanguage?.() || { language: 'en' };
  const t = submitFlowTranslations[language] || submitFlowTranslations.en;

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(initialUserData || {});
  const [dependents, setDependents] = useState([]);
  const [incomeData, setIncomeData] = useState(taxData || {});
  const [form1040Data, setForm1040Data] = useState(null);
  const [confirmedInfo, setConfirmedInfo] = useState(false);
  const [signature, setSignature] = useState('');
  const [spouseSignature, setSpouseSignature] = useState('');
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('standard');
  const [filing, setFiling] = useState(false);
  const [filed, setFiled] = useState(false);
  const [confirmationNumber, setConfirmationNumber] = useState('');
  const [editingSection, setEditingSection] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [pythonMissing, setPythonMissing] = useState([]);
  const [validating, setValidating] = useState(false);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [fixing, setFixing] = useState(false);
  const [fixMessage, setFixMessage] = useState('');
  
  // ✅ v4.0: Document Upload States
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  const steps = [
    { num: 1, title: t.steps.reviewInfo },
    { num: 2, title: t.steps.verifyIncome },
    { num: 3, title: t.steps.checkRefund },
    { num: 4, title: t.steps.confirmSign },
    { num: 5, title: t.steps.complete || 'Choose Plan' },   // Plan selection
    { num: 6, title: t.steps.uploadDocs || 'Upload' },      // Upload AFTER plan
  ];

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    if (!userId) { setLoading(false); return; }
    try {
      // 1. Get user data from Node.js
      let baseUserData = {};
      let baseDependents = [];
      try {
        const userRes = await fetch(API_BASE + '/api/tax/user/' + userId, { headers: { 'Authorization': 'Bearer ' + token } });
        if (userRes.ok) {
          const data = await userRes.json();
          baseUserData = data.user || data || {};
          baseDependents = data.dependents || data.user?.dependents || [];
        }
      } catch (e) { console.log('[SUBMITFLOW] No user data from Node.js'); }

      // 2. ✅ Get form1040 from Python API (primary source for extracted data)
      let form1040 = null;
      try {
        const pythonRes = await fetch(`${PYTHON_API}/api/extract/json/${userId}?tax_year=2025`);
        const pythonData = await pythonRes.json();
        if (pythonData.success && pythonData.form1040) {
          form1040 = pythonData.form1040;
          setForm1040Data(form1040);
          console.log('[SUBMITFLOW] ✅ Got form1040 from Python:', form1040);
        }
      } catch (e) { 
        console.log('[SUBMITFLOW] Python API not available, trying taxData prop'); 
      }

      // 3. Fallback to taxData prop
      if (!form1040 && taxData?.form1040) {
        form1040 = taxData.form1040;
        setForm1040Data(form1040);
      }

      // 4. Try Node.js session endpoint
      if (!form1040) {
        try {
          const sessionRes = await fetch(API_BASE + '/api/tax/session/' + userId, { headers: { 'Authorization': 'Bearer ' + token } });
          if (sessionRes.ok) {
            const sessionData = await sessionRes.json();
            if (sessionData.form1040) {
              form1040 = sessionData.form1040;
              setForm1040Data(form1040);
            }
          }
        } catch (e) { console.log('[SUBMITFLOW] No form1040 in session'); }
      }

      // 5. ✅ MERGE DATA: form1040.header → userData (KEY FIX!)
      const header = form1040?.header || {};
      const incomeDetails = form1040?._income_details || {};
      const adjustDetails = form1040?._adjustments_details || {};
      
      // Split spouse_name into first/last if available
      let spouseFirstName = baseUserData.spouse_first_name || '';
      let spouseLastName = baseUserData.spouse_last_name || '';
      if (!spouseFirstName && header.spouse_name) {
        const parts = header.spouse_name.trim().split(/\s+/);
        spouseFirstName = parts[0] || '';
        spouseLastName = parts.slice(1).join(' ') || '';
      }
      
      const mergedUserData = {
        // ✅ From form1040.header (extracted from chat interview)
        filing_status: header.filing_status || baseUserData.filing_status || 'single',
        state: header.state || baseUserData.state || 'CA',
        taxpayer_dob: header.taxpayer_dob || baseUserData.taxpayer_dob || '',
        taxpayer_age: header.taxpayer_age || baseUserData.taxpayer_age || 0,
        spouse_name: header.spouse_name || baseUserData.spouse_name || '',
        spouse_dob: header.spouse_dob || baseUserData.spouse_dob || '',
        spouse_age: header.spouse_age || baseUserData.spouse_age || 0,
        
        // From baseUserData (user entered via secure form)
        first_name: baseUserData.first_name || header.first_name || '',
        last_name: baseUserData.last_name || header.last_name || '',
        ssn: baseUserData.ssn || '',
        address: baseUserData.address || '',
        city: baseUserData.city || '',
        zip: baseUserData.zip || '',
        
        // ✅ Spouse info - properly split
        spouse_first_name: spouseFirstName,
        spouse_last_name: spouseLastName,
        spouse_ssn: baseUserData.spouse_ssn || '',
      };

      setUserData(mergedUserData);
      setDependents(baseDependents);
      console.log('[SUBMITFLOW] ✅ Merged userData:', mergedUserData);

      // 6. ✅ Set income data from form1040
      if (form1040) {
        const income = form1040.income || {};
        const adjustments = form1040.adjustments || {};
        const deductions = form1040.deductions || {};
        const taxCredits = form1040.tax_and_credits || {};
        const payments = form1040.payments || {};
        // ✅ FIXED: Read from correct sections
        const refundSection = form1040.refund || {};
        const amountOwedSection = form1040.amount_owed || {};
        
        setIncomeData({
          wages: income.line_1a_w2_wages || income.line_1_wages || taxData?.wages || 0,
          totalIncome: income.line_9_total_income || taxData?.totalIncome || 0,
          totalAdjustments: adjustments.line_10_schedule_1_adjustments || taxData?.totalAdjustments || 0,
          agi: adjustments.line_11_agi || taxData?.agi || 0,
          standardDeduction: deductions.line_12_deduction || deductions.line_12_standard_deduction || taxData?.standardDeduction || 0,
          taxableIncome: deductions.line_15_taxable_income || taxData?.taxableIncome || 0,
          federalTax: taxCredits.line_16_tax || taxData?.federalTax || 0,
          withholding: payments.line_25d_total_withholding || taxData?.withholding || 0,
          // ✅ FIXED: Read from correct sections
          federalRefund: refundSection.line_35a_refund || refundSection.line_34_overpaid || taxData?.federalRefund || 0,
          federalOwed: amountOwedSection.line_37_amount_owed || taxData?.federalOwed || 0,
          // State data
          caAgi: taxData?.caAgi || adjustments.line_11_agi || 0,
          caStdDeduction: taxData?.caStdDeduction || 0,
          caTaxableIncome: taxData?.caTaxableIncome || 0,
          caTax: taxData?.caTax || 0,
          calEitc: taxData?.calEitc || 0,
          yctc: taxData?.yctc || 0,
          caWithholding: taxData?.caWithholding || form1040?.state_tax?.state_withholding || 0,
          stateRefund: taxData?.stateRefund || 0,
          stateOwed: taxData?.stateOwed || 0,
          // ✅ Details for display
          taxpayer_wages: incomeDetails.taxpayer_wages || 0,
          spouse_wages: incomeDetails.spouse_wages || 0,
          taxpayer_ira: adjustDetails.taxpayer_ira || 0,
          spouse_ira: adjustDetails.spouse_ira || 0,
        });
      } else if (taxData && Object.keys(taxData).length > 0) {
        setIncomeData(taxData);
        if (taxData.form1040) setForm1040Data(taxData.form1040);
      }

    } catch (error) { console.error('[SUBMITFLOW] Error:', error); }
    finally { setLoading(false); }
  }

  async function validateWithPython(currentUserData, currentDependents) {
    const ud = currentUserData || userData;
    const deps = currentDependents || dependents;
    try {
      setValidating(true);
      const payload = {
        session_id: userId, mask_ssn: true, is_official_submission: false,
        personal: {
          first_name: ud?.first_name || '', last_name: ud?.last_name || '', ssn: ud?.ssn || '',
          address: ud?.address || '', city: ud?.city || '', state: ud?.state || 'CA', zip: ud?.zip || '',
          filing_status: ud?.filing_status || 'single',
          spouse_first_name: ud?.spouse_first_name || '', spouse_last_name: ud?.spouse_last_name || '', spouse_ssn: ud?.spouse_ssn || ''
        },
        dependents: (deps || []).map(d => ({
          first_name: d.first_name || d.name || '', last_name: d.last_name || '', ssn: d.ssn || '',
          relationship: d.relationship || '', age: d.age || 0, date_of_birth: d.date_of_birth || ''
        })),
        form1040: form1040Data || buildForm1040FromIncomeData()
      };
      const response = await fetch(PYTHON_API + '/generate/1040/validate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      if (response.ok) {
        const result = await response.json();
        console.log('[SUBMITFLOW] Python validation:', result);
        if (!result.valid && result.missing) {
          const mappedMissing = result.missing.map(m => ({ key: m.field, label: t.fields[m.field] || m.label, section: m.section }));
          setPythonMissing(mappedMissing);
        } else { setPythonMissing([]); }
        return result.valid;
      }
    } catch (error) {
      console.error('[SUBMITFLOW] Python validation error:', error);
      return fallbackLocalValidation(ud, deps);
    } finally { setValidating(false); }
    return false;
  }

  // ============================================================
  // PYTHON API: FIX MISSING FIELDS
  // ============================================================
  async function fixMissingWithPython() {
    try {
      setFixing(true);
      setFixMessage('');
      console.log('[SUBMITFLOW] Calling Python API to fix missing fields...');
      
      const payload = {
        session_id: userId,
        personal: {
          first_name: userData?.first_name || '',
          last_name: userData?.last_name || '',
          ssn: userData?.ssn || '',
          address: userData?.address || '',
          city: userData?.city || '',
          state: userData?.state || 'CA',
          zip: userData?.zip || '',
          filing_status: userData?.filing_status || 'single',
          spouse_first_name: userData?.spouse_first_name || '',
          spouse_last_name: userData?.spouse_last_name || '',
          spouse_ssn: userData?.spouse_ssn || ''
        },
        dependents: (dependents || []).map(d => ({
          first_name: d.first_name || d.name || '',
          last_name: d.last_name || '',
          ssn: d.ssn || '',
          relationship: d.relationship || '',
          age: d.age || 0,
          date_of_birth: d.date_of_birth || ''
        })),
        missing_fields: pythonMissing.map(m => m.key)
      };

      const response = await fetch(PYTHON_API + '/generate/1040/fix-missing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const result = await response.json();
        console.log('[SUBMITFLOW] Python fix-missing result:', result);

        if (result.success && result.fixes) {
          // Apply fixes to userData
          const updatedUserData = { ...userData, ...result.fixes };
          setUserData(updatedUserData);

          // Apply fixes to dependents if any
          if (result.fixed_dependents && result.fixed_dependents.length > 0) {
            setDependents(result.fixed_dependents);
          }

          // Save to backend (Node.js API)
          try {
            await fetch(API_BASE + '/api/tax/user/' + userId, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
              body: JSON.stringify(result.fixes)
            });
          } catch (saveError) {
            console.error('[SUBMITFLOW] Error saving fixes to backend:', saveError);
          }

          // Show success message
          setFixMessage(t.step1.fixSuccess);
          
          // Re-validate after fix
          setTimeout(() => {
            validateWithPython(updatedUserData, result.fixed_dependents || dependents);
          }, 500);

          return true;
        }
      } else {
        console.error('[SUBMITFLOW] Fix-missing API error:', response.status);
      }
    } catch (error) {
      console.error('[SUBMITFLOW] Fix-missing error:', error);
    } finally {
      setFixing(false);
    }
    return false;
  }

  function fallbackLocalValidation(ud, deps) {
    const missing = [];
    const fs = ud?.filing_status;
    const isMFJLocal = fs === 'married_filing_jointly';
    if (!ud?.first_name) missing.push({ key: 'first_name', label: t.fields.first_name, section: 'personal' });
    if (!ud?.last_name) missing.push({ key: 'last_name', label: t.fields.last_name, section: 'personal' });
    if (!ud?.ssn) missing.push({ key: 'ssn', label: t.fields.ssn, section: 'personal' });
    if (!ud?.address) missing.push({ key: 'address', label: t.fields.address, section: 'personal' });
    if (!ud?.city) missing.push({ key: 'city', label: t.fields.city, section: 'personal' });
    if (!ud?.state) missing.push({ key: 'state', label: t.fields.state, section: 'personal' });
    if (!ud?.zip) missing.push({ key: 'zip', label: t.fields.zip, section: 'personal' });
    if (!fs) missing.push({ key: 'filing_status', label: t.fields.filing_status, section: 'personal' });
    if (isMFJLocal) {
      if (!ud?.spouse_first_name) missing.push({ key: 'spouse_first_name', label: t.fields.spouse_first_name, section: 'spouse' });
      if (!ud?.spouse_last_name) missing.push({ key: 'spouse_last_name', label: t.fields.spouse_last_name, section: 'spouse' });
      if (!ud?.spouse_ssn) missing.push({ key: 'spouse_ssn', label: t.fields.spouse_ssn, section: 'spouse' });
    }
    (deps || []).forEach((dep, idx) => {
      if (!dep.first_name && !dep.name) missing.push({ key: 'dep_' + idx + '_fn', label: 'Dependent ' + (idx+1) + ' First Name', section: 'dependents' });
      if (!dep.ssn) missing.push({ key: 'dep_' + idx + '_ssn', label: 'Dependent ' + (idx+1) + ' SSN', section: 'dependents' });
      if (!dep.relationship) missing.push({ key: 'dep_' + idx + '_rel', label: 'Dependent ' + (idx+1) + ' Relationship', section: 'dependents' });
    });
    setPythonMissing(missing);
    return missing.length === 0;
  }

  function buildForm1040FromIncomeData() {
    const w = incomeData?.wages || 0;
    const wh = incomeData?.withholding || incomeData?.federalWithheld || 0;
    const a = incomeData?.agi || w;
    const sd = incomeData?.standardDeduction || 0;
    const ti = incomeData?.taxableIncome || Math.max(0, a - sd);
    const tax = incomeData?.federalTax || incomeData?.bracketTax || 0;
    const ref = incomeData?.federalRefund || incomeData?.refund || 0;
    const owe = incomeData?.federalOwed || incomeData?.amountOwed || 0;
    return {
      header: { tax_year: 2025, state: userData?.state || 'CA', filing_status: userData?.filing_status || 'single' },
      income: { line_1_wages: w, line_9_total_income: w },
      adjustments: { line_10_schedule_1_adjustments: 0, line_11_agi: a },
      deductions: { line_12_deduction: sd, line_15_taxable_income: ti },
      tax_and_credits: { line_16_tax: tax, line_22_tax_after_credits: tax, line_24_total_tax: tax },
      payments: { line_25d_total_withholding: wh, line_27_eic: incomeData?.eitc || 0, line_28_actc: incomeData?.actc || 0, line_33_total_payments: wh + (incomeData?.eitc || 0) + (incomeData?.actc || 0) },
      refund_or_owe: { line_35_refund: ref, line_37_amount_owe: owe }
    };
  }

  async function generatePDF(isOfficial = false) {
    try {
      setPdfGenerating(true);
      const payload = {
        session_id: userId, mask_ssn: !isOfficial, is_official_submission: isOfficial,
        personal: {
          first_name: userData?.first_name || '', last_name: userData?.last_name || '', ssn: userData?.ssn || '',
          address: userData?.address || '', city: userData?.city || '', state: userData?.state || 'CA', zip: userData?.zip || '',
          filing_status: userData?.filing_status || 'single',
          spouse_first_name: userData?.spouse_first_name || '', spouse_last_name: userData?.spouse_last_name || '', spouse_ssn: userData?.spouse_ssn || ''
        },
        dependents: (dependents || []).map(d => ({ first_name: d.first_name || d.name || '', last_name: d.last_name || '', ssn: d.ssn || '', relationship: d.relationship || '', age: d.age || 0 })),
        form1040: form1040Data || buildForm1040FromIncomeData()
      };
      const response = await fetch(PYTHON_API + '/generate/1040', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!response.ok) throw new Error('PDF generation failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'Form1040_2025_' + userId + '.pdf';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      return true;
    } catch (error) { console.error('[SUBMITFLOW] PDF error:', error); alert('Failed to generate PDF.'); return false; }
    finally { setPdfGenerating(false); }
  }

  const isMFJ = userData?.filing_status === 'married_filing_jointly';
  const allMissing = pythonMissing;
  const isStep1Complete = allMissing.length === 0 && confirmedInfo;

  const fmt = (num) => !num && num !== 0 ? '$0' : '$' + Math.abs(Math.round(num)).toLocaleString();
  const fmtSigned = (num) => !num && num !== 0 ? '$0' : (num >= 0 ? '+' : '-') + '$' + Math.abs(Math.round(num)).toLocaleString();
  const maskSSN = (ssn) => !ssn ? '___-__-____' : '***-**-' + String(ssn).replace(/\D/g, '').slice(-4);
  const formatSSN = (v) => { const c = v.replace(/\D/g, ''); return c.length <= 3 ? c : c.length <= 5 ? c.slice(0,3) + '-' + c.slice(3) : c.slice(0,3) + '-' + c.slice(3,5) + '-' + c.slice(5,9); };
  const getAge = (dob) => { if (!dob) return null; const b = new Date(dob), today = new Date(); let a = today.getFullYear() - b.getFullYear(); if (today.getMonth() < b.getMonth() || (today.getMonth() === b.getMonth() && today.getDate() < b.getDate())) a--; return a; };
  const getCreditType = (dep) => { const age = dep.age || getAge(dep.date_of_birth); return age !== null && age < 17 ? 'ctc' : 'odc'; };
  const getFilingStatusDisplay = (status) => !status ? t.step1.notSelected : (t.filingStatusOptions?.[status] || status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()));

  const getValue = function() { for (let i = 0; i < arguments.length; i++) { const k = arguments[i]; const v = incomeData?.[k]; if (v !== undefined && v !== null && v !== 0) return v; const fv = incomeData?.federal?.[k]; if (fv !== undefined && fv !== null && fv !== 0) return fv; } return 0; };
  const getStateValue = function() { const so = incomeData?.state || incomeData?.california || {}; for (let i = 0; i < arguments.length; i++) { const v = so[arguments[i]]; if (v !== undefined && v !== null && v !== 0) return v; } return 0; };

  const wages = incomeData?.wages || getValue('wages', 'w2_wages');
  const seIncome = getValue('self_employment_income', 'selfEmploymentIncome');
  const interest = getValue('interest_income', 'interestIncome');
  const dividends = getValue('dividend_income', 'dividendIncome');
  const capitalGains = getValue('capital_gains', 'capitalGains');
  const totalIncome = getValue('total_income', 'totalIncome') || (wages + seIncome + interest + dividends + capitalGains);
  const iraDeduction = getValue('ira_deduction', 'iraDeduction');
  const hsaDeduction = getValue('hsa_deduction', 'hsaDeduction');
  const studentLoan = getValue('student_loan_deduction', 'studentLoanDeduction');
  const seDeduction = getValue('se_tax_deduction', 'seTaxDeduction');
  const totalAdjustments = getValue('adjustments', 'totalAdjustments') || (iraDeduction + hsaDeduction + studentLoan + seDeduction);
  const agi = incomeData?.agi || getValue('agi', 'federal_agi') || (totalIncome - totalAdjustments);
  const standardDeduction = incomeData?.standardDeduction || getValue('standard_deduction');
  const itemizedDeduction = getValue('itemized_deductions');
  const deductionType = itemizedDeduction > standardDeduction ? 'itemized' : 'standard';
  const deductionAmount = Math.max(standardDeduction, itemizedDeduction || 0);
  const qbiDeduction = getValue('qbi_deduction');
  const taxableIncome = incomeData?.taxableIncome || getValue('taxable_income') || Math.max(0, agi - deductionAmount - qbiDeduction);
  const bracketTax = incomeData?.federalTax || getValue('bracket_tax', 'federal_tax');
  const seTax = getValue('self_employment_tax', 'se_tax');
  const ctcNonrefundable = getValue('ctc_nonrefundable');
  const ctcRefundable = getValue('ctc_refundable', 'actc');
  const eitc = incomeData?.eitc || getValue('eitc');
  const fedWithheld = incomeData?.withholding || getValue('federal_withheld', 'withholding');
  const federalRefund = incomeData?.federalRefund || getValue('refund', 'federalRefund');
  const federalOwed = incomeData?.federalOwed || getValue('amount_owed', 'federalOwed');
  const federalNet = federalRefund > 0 ? federalRefund : -federalOwed;
  const stateWithheld = getValue('state_withheld', 'stateWithheld', 'ca_withholding');
  const caAgi = incomeData?.caAgi || getStateValue('ca_agi') || agi;
  const caDeduction = incomeData?.caStdDeduction || getStateValue('standard_deduction');
  const caTaxableIncome = incomeData?.caTaxableIncome || getStateValue('taxable_income');
  const caTax = incomeData?.caTax || getStateValue('base_tax', 'total_tax');
  const calEitc = incomeData?.calEitc || getStateValue('caleitc', 'cal_eitc');
  const yctc = incomeData?.yctc || getStateValue('yctc');
  const caTotalCredits = (calEitc || 0) + (yctc || 0);
  const caWithholding = incomeData?.caWithholding || getStateValue('withholding') || stateWithheld || 0;
  const caRefund = incomeData?.stateRefund || incomeData?.caRefund || getStateValue('refund');
  const caOwed = incomeData?.stateOwed || incomeData?.caOwed || getStateValue('amount_owed');
  const stateNet = caRefund > 0 ? caRefund : -caOwed;
  const totalNet = federalNet + stateNet;

  function openEditModal(section) {
    setEditingSection(section);
    if (section === 'taxpayer') {
      setEditFormData({ first_name: userData?.first_name || '', last_name: userData?.last_name || '', ssn: userData?.ssn || '', address: userData?.address || '', city: userData?.city || '', state: userData?.state || '', zip: userData?.zip || '', filing_status: userData?.filing_status || '' });
    } else if (section === 'spouse') {
      setEditFormData({ spouse_first_name: userData?.spouse_first_name || '', spouse_last_name: userData?.spouse_last_name || '', spouse_ssn: userData?.spouse_ssn || '' });
    }
  }

  function openDependentEdit(index) {
    setEditingSection('dependent_' + index);
    const dep = dependents[index] || {};
    setEditFormData({ index: index, first_name: dep.first_name || '', last_name: dep.last_name || '', ssn: dep.ssn || '', relationship: dep.relationship || '', date_of_birth: dep.date_of_birth || '' });
  }

  async function saveEdit() {
    try {
      let saveSuccess = false;
      let updatedUserData = Object.assign({}, userData);
      let updatedDependents = dependents.slice();
      if (editingSection === 'taxpayer' || editingSection === 'spouse') {
        const res = await fetch(API_BASE + '/api/tax/user/' + userId, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token }, body: JSON.stringify(editFormData) });
        if (res.ok) { updatedUserData = Object.assign({}, userData, editFormData); setUserData(updatedUserData); saveSuccess = true; }
      } else if (editingSection === 'dependent_new') {
        const res = await fetch(API_BASE + '/api/tax/dependent/' + userId, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token }, body: JSON.stringify(editFormData) });
        if (res.ok) { const data = await res.json(); updatedDependents = dependents.concat([data.dependent || editFormData]); setDependents(updatedDependents); saveSuccess = true; }
      } else if (editingSection && editingSection.indexOf('dependent_') === 0) {
        const idx = editFormData.index;
        const res = await fetch(API_BASE + '/api/tax/dependent/' + userId, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token }, body: JSON.stringify(Object.assign({ index: idx }, editFormData)) });
        if (res.ok) { updatedDependents[idx] = Object.assign({}, updatedDependents[idx], editFormData); setDependents(updatedDependents); saveSuccess = true; }
      }
      setEditingSection(null);
      if (saveSuccess) {
        setTimeout(() => { validateWithPython(updatedUserData, updatedDependents); }, 100);
        try {
          const getAgeFromDOB = function(dob) { if (!dob) return null; const b = new Date(dob), tt = new Date(); let a = tt.getFullYear() - b.getFullYear(); if (tt.getMonth() < b.getMonth() || (tt.getMonth() === b.getMonth() && tt.getDate() < b.getDate())) a--; return a; };
          const processedDependents = updatedDependents.map(function(dep) { return Object.assign({}, dep, { age: dep.age || getAgeFromDOB(dep.date_of_birth) || 0 }); });
          const childrenUnder17 = processedDependents.filter(function(d) { return d.age < 17; }).length;
          const childrenUnder6 = processedDependents.filter(function(d) { return d.age < 6; }).length;
          const calcPayload = { filing_status: updatedUserData?.filing_status || 'single', wages: incomeData?.wages || 0, federal_withholding: incomeData?.withholding || 0, state_withholding: incomeData?.caWithholding || 0, dependents: processedDependents, has_dependents: processedDependents.length > 0, qualifying_children_under_17: childrenUnder17, has_child_under_6: childrenUnder6 > 0, state: 'CA' };
          const calcRes = await fetch(PYTHON_API + '/calculate/full', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(calcPayload) });
          if (calcRes.ok) {
            const calcResult = await calcRes.json();
            if (calcResult.success) {
              setIncomeData(Object.assign({}, incomeData, { wages: calcResult.federal.wages, agi: calcResult.federal.agi, standardDeduction: calcResult.federal.standard_deduction, taxableIncome: calcResult.federal.taxable_income, federalTax: calcResult.federal.bracket_tax, eitc: calcResult.federal.eitc, withholding: calcResult.federal.withholding, federalRefund: calcResult.federal.refund, federalOwed: calcResult.federal.amount_owed, caAgi: calcResult.state.ca_agi, caStdDeduction: calcResult.state.standard_deduction, caTaxableIncome: calcResult.state.taxable_income, caTax: calcResult.state.base_tax, calEitc: calcResult.state.caleitc, yctc: calcResult.state.yctc, caWithholding: calcResult.state.withholding, stateRefund: calcResult.state.refund, stateOwed: calcResult.state.amount_owed }));
            }
          }
        } catch (calcError) { console.error('[SUBMITFLOW] Recalc error:', calcError); }
      }
    } catch (error) { console.error('Error saving:', error); alert('Error saving. Please try again.'); }
  }

  // ✅ v4.0: File Upload Functions
  async function handleFileUpload(files) {
    if (!files || files.length === 0) return;
    
    setUploading(true);
    setUploadError(null);
    
    for (const file of files) {
      try {
        // Validate file
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
          setUploadError(`${file.name} is too large. Max size is 10MB.`);
          continue;
        }
        
        const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
        if (!validTypes.includes(file.type)) {
          setUploadError(`${file.name} is not a supported format.`);
          continue;
        }
        
        // Detect form type from filename
        let formType = 'Other';
        const fileName = file.name.toLowerCase();
        if (fileName.includes('w-2') || fileName.includes('w2')) formType = 'W-2';
        else if (fileName.includes('1099-int') || fileName.includes('1099int')) formType = '1099-INT';
        else if (fileName.includes('1099-div') || fileName.includes('1099div')) formType = '1099-DIV';
        else if (fileName.includes('1099-nec') || fileName.includes('1099nec')) formType = '1099-NEC';
        else if (fileName.includes('1099-misc') || fileName.includes('1099misc')) formType = '1099-MISC';
        else if (fileName.includes('1099-g') || fileName.includes('1099g')) formType = '1099-G';
        else if (fileName.includes('1099-r') || fileName.includes('1099r')) formType = '1099-R';
        else if (fileName.includes('ssa-1099') || fileName.includes('ssa1099')) formType = 'SSA-1099';
        else if (fileName.includes('1099')) formType = '1099-MISC';
        
        // Upload to server
        const formData = new FormData();
        formData.append('file', file);
        formData.append('userId', userId);
        formData.append('formType', formType);
        formData.append('taxYear', '2025');
        formData.append('userZip', userData?.zip || '');
        
        const res = await fetch(`${API_BASE}/api/forms/upload`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData
        });
        
        if (res.ok) {
          const data = await res.json();
          setUploadedFiles(prev => [...prev, {
            id: data.file?._id || Date.now(),
            name: file.name,
            formType: formType,
            size: file.size,
            uploadedAt: new Date().toISOString(),
            status: 'uploaded',
            extractedData: data.extractedData || {}
          }]);
        } else {
          setUploadError(`Failed to upload ${file.name}`);
        }
      } catch (err) {
        console.error('Upload error:', err);
        setUploadError(`Error uploading ${file.name}`);
      }
    }
    
    setUploading(false);
  }
  
  function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }
  
  function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }
  
  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = e.dataTransfer?.files;
    if (files) handleFileUpload(Array.from(files));
  }
  
  function handleFileInputChange(e) {
    const files = e.target.files;
    if (files) handleFileUpload(Array.from(files));
  }
  
  function removeUploadedFile(fileId) {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  }
  
  function updateFileFormType(fileId, newType) {
    setUploadedFiles(prev => prev.map(f => 
      f.id === fileId ? { ...f, formType: newType } : f
    ));
  }
  
  function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function handleNext() {
    if (step === 1 && !isStep1Complete) { alert('Please complete all required fields and confirm.'); return; }
    if (step === 4 && !signature) { alert('Please sign your name.'); return; }
    if (step === 4 && isMFJ && !spouseSignature) { alert('Please have your spouse sign.'); return; }
    if (step === 4 && !agreedTerms) { alert('Please agree to the terms.'); return; }
    // Step 5 (upload) - no validation required, can skip
    setStep(step + 1);
  }

  function handleBack() { if (step > 1) setStep(step - 1); }

  async function handleFileToIRS() {
    setFiling(true);
    try {
      const pdfSuccess = await generatePDF(true);
      if (!pdfSuccess) { setFiling(false); return; }
      const res = await fetch(API_BASE + '/api/tax/file/' + userId, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token }, body: JSON.stringify({ signature: signature, spouseSignature: isMFJ ? spouseSignature : null, plan: selectedPlan, personal: { first_name: userData?.first_name, last_name: userData?.last_name, ssn: userData?.ssn, filing_status: userData?.filing_status }, uploadedDocuments: uploadedFiles.length }) });
      if (res.ok) { const data = await res.json(); setConfirmationNumber(data.confirmationNumber || 'TXS-' + Date.now()); setFiled(true); setStep(7); }
      else { alert('Filing failed. Please try again.'); }
    } catch (error) { console.error('Filing error:', error); alert('Filing error. Please try again.'); }
    finally { setFiling(false); }
  }

  async function handlePreviewPDF() { await generatePDF(false); }

  useEffect(() => { if (!loading && userData && Object.keys(userData).length > 0) { validateWithPython(userData, dependents); } }, [loading]);

  if (loading) {
    return React.createElement('div', { style: styles.overlay },
      React.createElement('div', { style: styles.modal },
        React.createElement('div', { style: styles.loadingBox },
          React.createElement('div', { style: styles.spinner }),
          React.createElement('p', null, 'Loading...')
        )
      )
    );
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <div><h2 style={styles.headerTitle}>{t.title}</h2><p style={styles.headerSubtitle}>{t.taxYear}</p></div>
          <button onClick={onClose} style={styles.closeBtn}>×</button>
        </div>
        {step <= 6 && (
          <div style={styles.stepIndicator}>
            {steps.map((s, i) => (
              <React.Fragment key={s.num}>
                <div style={styles.stepItem}>
                  <div style={Object.assign({}, styles.stepCircle, { backgroundColor: step >= s.num ? '#7c3aed' : 'rgba(255,255,255,0.1)', color: step >= s.num ? 'white' : '#94a3b8' })}>{step > s.num ? '✓' : s.num}</div>
                  <span style={Object.assign({}, styles.stepLabel, { color: step >= s.num ? '#e2e8f0' : '#64748b' })}>{s.title}</span>
                </div>
                {i < steps.length - 1 && <div style={Object.assign({}, styles.stepLine, { backgroundColor: step > s.num ? '#7c3aed' : 'rgba(255,255,255,0.1)' })}></div>}
              </React.Fragment>
            ))}
          </div>
        )}
        <div style={styles.content}>
          {step === 1 && (
            <div>
              <h3 style={styles.sectionTitle}>{t.step1.title}</h3>
              <p style={{ color: '#94a3b8', marginBottom: '20px' }}>{t.step1.subtitle}</p>
              {validating && (<div style={{ ...styles.warningBox, backgroundColor: 'rgba(59, 130, 246, 0.15)', borderColor: 'rgba(59, 130, 246, 0.4)' }}><p style={{ margin: 0, color: '#60a5fa' }}>🔄 {t.step1.validating}</p></div>)}
              {allMissing.length > 0 && !validating && (
                <div style={styles.warningBox}>
                  <h4 style={styles.warningTitle}>⚠️ {t.step1.missingInfo}</h4>
                  <ul style={styles.missingList}>{allMissing.slice(0, 5).map((f, i) => (<li key={i} style={styles.missingItem}>• {f.label}</li>))}{allMissing.length > 5 && <li style={styles.missingItem}>... and {allMissing.length - 5} more</li>}</ul>
                  <p style={styles.warningNote}>{t.step1.clickEdit}</p>
                  <button 
                    onClick={fixMissingWithPython} 
                    disabled={fixing}
                    style={{
                      marginTop: '12px',
                      padding: '10px 20px',
                      backgroundColor: fixing ? '#6b7280' : '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: fixing ? 'not-allowed' : 'pointer',
                      width: '100%'
                    }}
                  >
                    {fixing ? t.step1.fixing : t.step1.fixMissing}
                  </button>
                </div>
              )}
              {fixMessage && (
                <div style={{
                  backgroundColor: 'rgba(16, 185, 129, 0.15)',
                  border: '2px solid rgba(16, 185, 129, 0.4)',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  marginBottom: '16px'
                }}>
                  <p style={{ margin: 0, color: '#34d399', fontSize: '14px', fontWeight: '500' }}>{fixMessage}</p>
                </div>
              )}
              <div style={styles.infoCard}>
                <div style={styles.cardHeader}><h4 style={styles.infoTitle}>{t.step1.taxpayerInfo}</h4><button onClick={function() { openEditModal('taxpayer'); }} style={styles.editBtnSmall}>{t.step1.edit}</button></div>
                <div style={styles.infoGrid}>
                  <div style={styles.infoRow}><span style={styles.infoLabel}>{t.step1.name}:</span><span style={Object.assign({}, styles.infoValue, { color: (!userData?.first_name || !userData?.last_name) ? '#ef4444' : '#e2e8f0' })}>{userData?.first_name || '___'} {userData?.last_name || '___'}</span></div>
                  <div style={styles.infoRow}><span style={styles.infoLabel}>{t.step1.ssn}:</span><span style={Object.assign({}, styles.infoValue, { color: !userData?.ssn ? '#ef4444' : '#e2e8f0' })}>{maskSSN(userData?.ssn)}</span></div>
                  <div style={styles.infoRow}><span style={styles.infoLabel}>DOB:</span><span style={styles.infoValue}>{userData?.taxpayer_dob || '___'}{(userData?.taxpayer_age || getAge(userData?.taxpayer_dob)) ? ' (Age: ' + (userData?.taxpayer_age || getAge(userData?.taxpayer_dob)) + ')' : ''}</span></div>
                  <div style={styles.infoRow}><span style={styles.infoLabel}>{t.step1.address}:</span><span style={styles.infoValue}>{userData?.address || '___'}</span></div>
                  <div style={styles.infoRow}><span style={styles.infoLabel}>{t.step1.cityStateZip}:</span><span style={styles.infoValue}>{userData?.city || '___'}, {userData?.state || '__'} {userData?.zip || '_____'}</span></div>
                  <div style={styles.infoRow}><span style={styles.infoLabel}>{t.step1.filingStatus}:</span><span style={Object.assign({}, styles.infoValue, { color: !userData?.filing_status ? '#ef4444' : '#e2e8f0' })}>{getFilingStatusDisplay(userData?.filing_status)}</span></div>
                </div>
              </div>
              {isMFJ && (
                <div style={Object.assign({}, styles.infoCard, { marginTop: '16px', borderLeft: '4px solid #7c3aed' })}>
                  <div style={styles.cardHeader}><h4 style={styles.infoTitle}>{t.step1.spouseInfo}</h4><button onClick={function() { openEditModal('spouse'); }} style={styles.editBtnSmall}>{t.step1.edit}</button></div>
                  <div style={styles.infoGrid}>
                    <div style={styles.infoRow}><span style={styles.infoLabel}>{t.step1.name}:</span><span style={Object.assign({}, styles.infoValue, { color: (!userData?.spouse_first_name || !userData?.spouse_last_name) ? '#ef4444' : '#e2e8f0' })}>{userData?.spouse_first_name || '___'} {userData?.spouse_last_name || '___'}</span></div>
                    <div style={styles.infoRow}><span style={styles.infoLabel}>{t.step1.spouseSSN}:</span><span style={Object.assign({}, styles.infoValue, { color: !userData?.spouse_ssn ? '#ef4444' : '#e2e8f0' })}>{maskSSN(userData?.spouse_ssn)}</span></div>
                    <div style={styles.infoRow}><span style={styles.infoLabel}>Spouse DOB:</span><span style={styles.infoValue}>{userData?.spouse_dob || '___'}{(userData?.spouse_age || getAge(userData?.spouse_dob)) ? ' (Age: ' + (userData?.spouse_age || getAge(userData?.spouse_dob)) + ')' : ''}</span></div>
                  </div>
                </div>
              )}
              <div style={Object.assign({}, styles.infoCard, { marginTop: '16px' })}>
                <div style={styles.cardHeader}><h4 style={styles.infoTitle}>{t.step1.dependentsInfo}</h4></div>
                {dependents.length === 0 ? (
                  <div><p style={{ color: '#94a3b8', fontStyle: 'italic', marginBottom: '12px' }}>{t.step1.noDependents}</p><button onClick={function() { setEditingSection('dependent_new'); setEditFormData({ index: 0, first_name: '', last_name: '', ssn: '', relationship: '', date_of_birth: '' }); }} style={Object.assign({}, styles.editBtnSmall, { backgroundColor: '#10b981' })}>{t.step1.addDependent}</button></div>
                ) : (
                  <div>
                    {dependents.map((dep, idx) => {
                      const credit = getCreditType(dep); const age = dep.age || getAge(dep.date_of_birth);
                      return (
                        <div key={idx} style={styles.dependentRow}>
                          <div style={styles.dependentHeader}><span style={styles.dependentNum}>#{idx + 1}</span><button onClick={function() { openDependentEdit(idx); }} style={styles.editBtnSmall}>{t.step1.edit}</button></div>
                          <div style={styles.dependentGrid}>
                            <div style={styles.depField}><span style={styles.depLabel}>{t.step1.name}:</span><span style={styles.depValue}>{dep.first_name} {dep.last_name}</span></div>
                            <div style={styles.depField}><span style={styles.depLabel}>{t.step1.ssn}:</span><span style={styles.depValue}>{maskSSN(dep.ssn)}</span></div>
                            <div style={styles.depField}><span style={styles.depLabel}>{t.step1.dependentRelationship}:</span><span style={styles.depValue}>{t.relationships[dep.relationship] || dep.relationship}</span></div>
                            <div style={styles.depField}><span style={styles.depLabel}>{t.step1.dependentAge}:</span><span style={styles.depValue}>{age !== null ? age : 'N/A'}</span></div>
                            <div style={styles.depField}><span style={styles.depLabel}>{t.step1.creditType}:</span><span style={Object.assign({}, styles.depValue, { color: credit === 'ctc' ? '#22c55e' : '#3b82f6' })}>{credit === 'ctc' ? t.step1.ctc : t.step1.odc}</span></div>
                          </div>
                        </div>
                      );
                    })}
                    <button onClick={function() { setEditingSection('dependent_new'); setEditFormData({ index: dependents.length, first_name: '', last_name: '', ssn: '', relationship: '', date_of_birth: '' }); }} style={Object.assign({}, styles.editBtnSmall, { backgroundColor: '#22c55e', marginTop: '12px' })}>+ Add Another</button>
                  </div>
                )}
              </div>
              {allMissing.length === 0 && !validating && (<div style={{ marginTop: '24px' }}><label style={styles.checkboxLabel}><input type="checkbox" checked={confirmedInfo} onChange={function(e) { setConfirmedInfo(e.target.checked); }} style={styles.checkbox} /><span>{t.step1.confirmCorrect}</span></label></div>)}
            </div>
          )}
          {step === 2 && (
            <div>
              <h3 style={styles.sectionTitle}>{t.step2.title}</h3>
              <div style={styles.sectionCard}>
                <h4 style={styles.sectionSubtitle}>{t.step2.incomeSection}</h4>
                <div style={styles.dataGrid}>
                  <div style={styles.dataRow}><span>{t.step2.w2Wages}</span><span style={styles.dataValue}>{fmt(wages)}</span></div>
                  {seIncome > 0 && <div style={styles.dataRow}><span>{t.step2.selfEmployment}</span><span style={styles.dataValue}>{fmt(seIncome)}</span></div>}
                  {interest > 0 && <div style={styles.dataRow}><span>{t.step2.interestIncome}</span><span style={styles.dataValue}>{fmt(interest)}</span></div>}
                  <hr style={styles.divider} /><div style={styles.totalRow}><span>{t.step2.totalIncome}</span><span>{fmt(totalIncome)}</span></div>
                </div>
              </div>
              {totalAdjustments > 0 && (<div style={styles.sectionCard}><h4 style={styles.sectionSubtitle}>{t.step2.adjustmentsSection}</h4><div style={styles.dataGrid}>{iraDeduction > 0 && <div style={styles.dataRow}><span>{t.step2.iraDeduction}</span><span style={Object.assign({}, styles.dataValue, { color: '#10b981' })}>-{fmt(iraDeduction)}</span></div>}<hr style={styles.divider} /><div style={styles.totalRow}><span>{t.step2.totalAdjustments}</span><span style={{ color: '#10b981' }}>-{fmt(totalAdjustments)}</span></div></div></div>)}
              <div style={Object.assign({}, styles.sectionCard, { backgroundColor: 'rgba(16, 185, 129, 0.1)', border: '2px solid #10b981' })}><div style={styles.totalRow}><span style={{ fontWeight: '700', color: '#10b981' }}>{t.step2.agi}</span><span style={{ fontWeight: '700', fontSize: '18px', color: '#10b981' }}>{fmt(agi)}</span></div></div>
              <div style={styles.sectionCard}><h4 style={styles.sectionSubtitle}>{t.step2.deductionsSection}</h4><div style={styles.dataGrid}><div style={styles.dataRow}><span>{t.step2.deductionType}</span><span style={Object.assign({}, styles.dataValue, { color: '#a78bfa', fontWeight: '600' })}>{deductionType === 'itemized' ? t.step2.itemizedDeduction : t.step2.standardDeduction}</span></div><div style={styles.dataRow}><span>{t.step2.deductionAmount}</span><span style={Object.assign({}, styles.dataValue, { color: '#10b981' })}>-{fmt(deductionAmount)}</span></div><hr style={styles.divider} /><div style={styles.totalRow}><span>{t.step2.taxableIncome}</span><span style={{ fontWeight: '700' }}>{fmt(taxableIncome)}</span></div></div></div>
              <div style={Object.assign({}, styles.sectionCard, { backgroundColor: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)' })}><h4 style={Object.assign({}, styles.sectionSubtitle, { color: '#60a5fa' })}>{t.step2.withholdingSection}</h4><div style={styles.dataGrid}><div style={styles.dataRow}><span>{t.step2.federalWithheld}</span><span style={styles.dataValue}>{fmt(fedWithheld)}</span></div><div style={styles.dataRow}><span>{t.step2.stateWithheld}</span><span style={styles.dataValue}>{fmt(stateWithheld)}</span></div></div></div>
            </div>
          )}
          {step === 3 && (
            <div>
              <h3 style={styles.sectionTitle}>{t.step3.title}</h3>
              <div style={Object.assign({}, styles.refundCard, { backgroundColor: totalNet >= 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', borderColor: totalNet >= 0 ? '#10b981' : '#ef4444' })}>
                <p style={styles.refundLabel}>{totalNet >= 0 ? t.step3.estimatedRefund : t.step3.estimatedOwed}</p>
                <p style={Object.assign({}, styles.refundAmount, { color: totalNet >= 0 ? '#10b981' : '#f87171' })}>{fmt(Math.abs(totalNet))}</p>
                <div style={styles.refundBreakdown}>
                  <div><p style={{ fontSize: '12px', color: '#94a3b8' }}>{t.step3.federal}</p><p style={{ fontWeight: '700', color: federalNet >= 0 ? '#10b981' : '#f87171' }}>{fmtSigned(federalNet)}</p></div>
                  <div><p style={{ fontSize: '12px', color: '#94a3b8' }}>{t.step3.state}</p><p style={{ fontWeight: '700', color: stateNet >= 0 ? '#10b981' : '#f87171' }}>{fmtSigned(stateNet)}</p></div>
                </div>
              </div>
              <div style={Object.assign({}, styles.sectionCard, { borderLeft: '4px solid #3b82f6' })}>
                <h4 style={Object.assign({}, styles.sectionSubtitle, { color: '#60a5fa' })}>{t.step3.federalSection}</h4>
                <div style={styles.dataGrid}>
                  <div style={styles.dataRow}><span>{t.step3.taxableIncome}</span><span style={styles.dataValue}>{fmt(taxableIncome)}</span></div>
                  <div style={styles.dataRow}><span>{t.step3.bracketTax}</span><span style={styles.dataValue}>{fmt(bracketTax)}</span></div>
                  <hr style={styles.divider} />
                  {(ctcNonrefundable > 0 || ctcRefundable > 0 || eitc > 0) && <p style={{ fontSize: '13px', fontWeight: '600', color: '#10b981', margin: '8px 0' }}>{t.step3.federalCredits}</p>}
                  {ctcNonrefundable > 0 && <div style={styles.dataRow}><span>{t.step3.ctcNonrefundable}</span><span style={Object.assign({}, styles.dataValue, { color: '#10b981' })}>-{fmt(ctcNonrefundable)}</span></div>}
                  {ctcRefundable > 0 && <div style={styles.dataRow}><span>{t.step3.ctcRefundable}</span><span style={Object.assign({}, styles.dataValue, { color: '#10b981' })}>+{fmt(ctcRefundable)}</span></div>}
                  {eitc > 0 && <div style={styles.dataRow}><span>{t.step3.eitc}</span><span style={Object.assign({}, styles.dataValue, { color: '#10b981' })}>+{fmt(eitc)}</span></div>}
                  <hr style={styles.divider} />
                  <div style={styles.dataRow}><span>{t.step3.withholding}</span><span style={Object.assign({}, styles.dataValue, { color: '#3b82f6' })}>+{fmt(fedWithheld)}</span></div>
                  <hr style={styles.divider} />
                  <div style={styles.totalRow}><span>{federalNet >= 0 ? t.step3.federalRefund : t.step3.federalOwed}</span><span style={{ color: federalNet >= 0 ? '#10b981' : '#f87171', fontSize: '18px' }}>{fmt(Math.abs(federalNet))}</span></div>
                </div>
              </div>
              <div style={Object.assign({}, styles.sectionCard, { borderLeft: '4px solid #f59e0b' })}>
                <h4 style={Object.assign({}, styles.sectionSubtitle, { color: '#fbbf24' })}>{t.step3.caSection}</h4>
                <div style={styles.dataGrid}>
                  <div style={styles.dataRow}><span>{t.step3.caAgi}</span><span style={styles.dataValue}>{fmt(caAgi)}</span></div>
                  <div style={styles.dataRow}><span>{t.step3.caDeduction}</span><span style={Object.assign({}, styles.dataValue, { color: '#10b981' })}>-{fmt(caDeduction)}</span></div>
                  <div style={styles.dataRow}><span>{t.step3.caTax}</span><span style={styles.dataValue}>{fmt(caTax)}</span></div>
                  {caTotalCredits > 0 && (<React.Fragment><hr style={styles.divider} /><p style={{ fontSize: '13px', fontWeight: '600', color: '#10b981', margin: '8px 0' }}>{t.step3.caCredits}</p>{calEitc > 0 && <div style={styles.dataRow}><span>{t.step3.calEitc}</span><span style={Object.assign({}, styles.dataValue, { color: '#10b981' })}>+{fmt(calEitc)}</span></div>}{yctc > 0 && <div style={styles.dataRow}><span>{t.step3.yctc}</span><span style={Object.assign({}, styles.dataValue, { color: '#10b981' })}>+{fmt(yctc)}</span></div>}</React.Fragment>)}
                  <hr style={styles.divider} />
                  <div style={styles.dataRow}><span>{t.step3.caWithholding}</span><span style={Object.assign({}, styles.dataValue, { color: '#3b82f6' })}>+{fmt(caWithholding)}</span></div>
                  <hr style={styles.divider} />
                  <div style={styles.totalRow}><span>{stateNet >= 0 ? t.step3.caRefund : t.step3.caOwed}</span><span style={{ color: stateNet >= 0 ? '#10b981' : '#f87171', fontSize: '18px' }}>{fmt(Math.abs(stateNet))}</span></div>
                </div>
              </div>
            </div>
          )}
          {step === 4 && (
            <div>
              <h3 style={styles.sectionTitle}>{t.step4.title}</h3>
              <div style={styles.signatureBox}>
                <p style={styles.signatureText}>{t.step4.declaration}</p>
                <div style={styles.signatureInputGroup}><label style={styles.signatureLabel}>{t.step4.signatureLabel}</label><input type="text" value={signature} onChange={function(e) { setSignature(e.target.value); }} placeholder={(userData?.first_name || '') + ' ' + (userData?.last_name || '')} style={styles.signatureInput} /></div>
                {isMFJ && (<div style={styles.signatureInputGroup}><label style={styles.signatureLabel}>{t.step4.spouseSignatureLabel}</label><input type="text" value={spouseSignature} onChange={function(e) { setSpouseSignature(e.target.value); }} placeholder={(userData?.spouse_first_name || '') + ' ' + (userData?.spouse_last_name || '')} style={styles.signatureInput} /></div>)}
                <div style={styles.signatureInputGroup}><label style={styles.signatureLabel}>{t.step4.dateLabel}</label><input type="text" value={new Date().toLocaleDateString()} readOnly style={Object.assign({}, styles.signatureInput, { backgroundColor: 'rgba(255,255,255,0.03)' })} /></div>
                <label style={styles.checkboxLabel}><input type="checkbox" checked={agreedTerms} onChange={function(e) { setAgreedTerms(e.target.checked); }} style={styles.checkbox} /><span>{t.step4.agreeTerms}</span></label>
              </div>
            </div>
          )}
          
          {/* ✅ STEP 5: Plan Selection (E-File or CPA) */}
          {step === 5 && !filed && (
            <div>
              <h3 style={styles.sectionTitle}>{'Choose Your Plan'}</h3>
              <p style={styles.paymentSubtitle}>{'Select how you want to file'}</p>
              <div style={styles.plansGrid}>
                <div style={Object.assign({}, styles.planCard, { border: selectedPlan === 'standard' ? '3px solid #3b82f6' : '2px solid rgba(255,255,255,0.1)', backgroundColor: selectedPlan === 'standard' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255,255,255,0.03)' })} onClick={function() { setSelectedPlan('standard'); }}>
                  <div style={styles.planHeader}><span style={styles.planIcon}>📋</span><div><h4 style={styles.planName}>Standard E-File</h4></div></div>
                  <p style={styles.planPrice}>$49</p>
                  <ul style={styles.planFeatures}>
                    <li>✓ Federal Return</li>
                    <li>✓ State Return</li>
                    <li>✓ E-File to IRS</li>
                    <li>✓ Download PDF</li>
                  </ul>
                </div>
                <div style={Object.assign({}, styles.planCard, { border: selectedPlan === 'premium' ? '3px solid #7c3aed' : '2px solid rgba(255,255,255,0.1)', backgroundColor: selectedPlan === 'premium' ? 'rgba(124, 58, 237, 0.1)' : 'rgba(255,255,255,0.03)' })} onClick={function() { setSelectedPlan('premium'); }}>
                  <div style={styles.recommendedBadge}>RECOMMENDED</div>
                  <div style={styles.planHeader}><span style={styles.planIcon}>⭐</span><div><h4 style={styles.planName}>Premium + CPA Review</h4></div></div>
                  <p style={styles.planPrice}>$99</p>
                  <ul style={styles.planFeatures}>
                    <li>✓ All Standard Features</li>
                    <li>✓ <strong style={{color:'#a78bfa'}}>CPA Review</strong></li>
                    <li>✓ Audit Protection</li>
                    <li>✓ Priority Support</li>
                  </ul>
                </div>
              </div>
              
              {/* Info about what happens next */}
              <div style={{
                backgroundColor: selectedPlan === 'premium' ? 'rgba(124, 58, 237, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                borderRadius: '12px',
                padding: '16px',
                marginTop: '16px',
                border: selectedPlan === 'premium' ? '1px solid rgba(124, 58, 237, 0.3)' : '1px solid rgba(59, 130, 246, 0.3)'
              }}>
                <p style={{ margin: 0, color: '#e2e8f0', fontSize: '14px' }}>
                  {selectedPlan === 'premium' 
                    ? '📄 Next: Upload your W-2s and 1099s for CPA review'
                    : '📄 Next: Upload your tax documents (optional)'}
                </p>
              </div>
              
              <div style={Object.assign({}, styles.totalBox, { marginTop: '20px' })}>
                <div style={styles.paymentRow}><span>Selected Plan</span><span>{selectedPlan === 'premium' ? 'Premium + CPA' : 'Standard E-File'}</span></div>
                <div style={styles.totalFinal}><span>Total</span><span style={styles.totalAmount}>{selectedPlan === 'premium' ? '$99' : '$49'}</span></div>
              </div>
            </div>
          )}
          
          {/* ✅ STEP 6: Document Upload (Required for CPA, Optional for Standard) */}
          {step === 6 && !filed && (
            <div>
              <h3 style={styles.sectionTitle}>
                {selectedPlan === 'premium' ? '📤 Upload Documents for CPA Review' : '📤 Upload Tax Documents (Optional)'}
              </h3>
              <p style={{ color: '#94a3b8', marginBottom: '20px' }}>
                {selectedPlan === 'premium' 
                  ? 'Upload your W-2s, 1099s, and other tax documents. Our CPA will review them within 24-48 hours.'
                  : 'Upload your tax documents for your records (optional).'}
              </p>
              
              {/* CPA Notice */}
              {selectedPlan === 'premium' && (
                <div style={{
                  backgroundColor: 'rgba(124, 58, 237, 0.15)',
                  border: '2px solid rgba(124, 58, 237, 0.4)',
                  borderRadius: '12px',
                  padding: '16px',
                  marginBottom: '20px'
                }}>
                  <p style={{ margin: 0, color: '#a78bfa', fontSize: '14px', fontWeight: '600' }}>
                    ⭐ CPA Review Selected - Please upload all your tax documents
                  </p>
                  <p style={{ margin: '8px 0 0', color: '#94a3b8', fontSize: '13px' }}>
                    A licensed CPA will review your documents and tax return within 24-48 hours.
                  </p>
                </div>
              )}
              
              {/* Upload Area */}
              <div 
                style={{
                  border: dragActive ? '3px dashed #7c3aed' : '3px dashed rgba(255,255,255,0.2)',
                  borderRadius: '16px',
                  padding: '40px 20px',
                  textAlign: 'center',
                  backgroundColor: dragActive ? 'rgba(124, 58, 237, 0.1)' : 'rgba(255,255,255,0.02)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  marginBottom: '20px'
                }}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => document.getElementById('file-upload-input')?.click()}
              >
                <input 
                  id="file-upload-input"
                  type="file" 
                  multiple 
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileInputChange}
                  style={{ display: 'none' }}
                />
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>📤</div>
                <p style={{ color: '#e2e8f0', fontWeight: '600', marginBottom: '8px' }}>
                  {uploading ? 'Uploading...' : 'Click or drag files here to upload'}
                </p>
                <p style={{ color: '#64748b', fontSize: '13px' }}>
                  Supported: PDF, JPG, PNG (max 10MB each)
                </p>
              </div>
              
              {/* Upload Error */}
              {uploadError && (
                <div style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  borderRadius: '8px',
                  padding: '12px',
                  marginBottom: '16px'
                }}>
                  <p style={{ margin: 0, color: '#f87171', fontSize: '14px' }}>❌ {uploadError}</p>
                </div>
              )}
              
              {/* Uploaded Files List */}
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ color: '#e2e8f0', marginBottom: '12px', fontSize: '14px', fontWeight: '600' }}>
                  Uploaded Documents ({uploadedFiles.length})
                </h4>
                
                {uploadedFiles.length === 0 ? (
                  <div style={{
                    backgroundColor: 'rgba(255,255,255,0.03)',
                    borderRadius: '12px',
                    padding: '20px',
                    textAlign: 'center',
                    border: '1px solid rgba(255,255,255,0.06)'
                  }}>
                    <p style={{ color: '#64748b', margin: 0, fontSize: '14px' }}>
                      No documents uploaded yet
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {uploadedFiles.map((file, idx) => (
                      <div key={file.id || idx} style={{
                        backgroundColor: 'rgba(255,255,255,0.03)',
                        borderRadius: '12px',
                        padding: '14px 16px',
                        border: '1px solid rgba(255,255,255,0.06)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                      }}>
                        <span style={{ fontSize: '24px' }}>
                          {file.formType?.startsWith('W') ? '📄' : file.formType?.startsWith('1099') ? '📋' : '📎'}
                        </span>
                        <div style={{ flex: 1 }}>
                          <p style={{ margin: 0, color: '#e2e8f0', fontWeight: '500', fontSize: '14px' }}>{file.name}</p>
                          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '12px' }}>
                            {formatFileSize(file.size)} • {file.formType}
                          </p>
                        </div>
                        <select 
                          value={file.formType}
                          onChange={(e) => updateFileFormType(file.id, e.target.value)}
                          style={{
                            backgroundColor: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '6px',
                            padding: '6px 10px',
                            color: '#e2e8f0',
                            fontSize: '12px'
                          }}
                        >
                          <option value="W-2">W-2</option>
                          <option value="1099-INT">1099-INT</option>
                          <option value="1099-DIV">1099-DIV</option>
                          <option value="1099-NEC">1099-NEC</option>
                          <option value="1099-MISC">1099-MISC</option>
                          <option value="1099-G">1099-G</option>
                          <option value="1099-R">1099-R</option>
                          <option value="SSA-1099">SSA-1099</option>
                          <option value="Other">Other</option>
                        </select>
                        <button 
                          onClick={() => removeUploadedFile(file.id)}
                          style={{
                            backgroundColor: 'rgba(239, 68, 68, 0.2)',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '6px 10px',
                            color: '#f87171',
                            fontSize: '12px',
                            cursor: 'pointer'
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {/* CPA warning if no files */}
              {selectedPlan === 'premium' && uploadedFiles.length === 0 && (
                <div style={{
                  backgroundColor: 'rgba(245, 158, 11, 0.15)',
                  border: '1px solid rgba(245, 158, 11, 0.4)',
                  borderRadius: '8px',
                  padding: '12px',
                  marginBottom: '16px'
                }}>
                  <p style={{ margin: 0, color: '#fbbf24', fontSize: '13px' }}>
                    ⚠️ Please upload your tax documents for CPA review
                  </p>
                </div>
              )}
              
              {/* Preview PDF Button */}
              <button onClick={handlePreviewPDF} disabled={pdfGenerating} style={Object.assign({}, styles.backBtn, { width: '100%', marginBottom: '12px', opacity: pdfGenerating ? 0.7 : 1 })}>
                {pdfGenerating ? 'Generating PDF...' : '📄 Preview Tax Return PDF'}
              </button>
              
              {/* Total & Submit */}
              <div style={styles.totalBox}>
                <div style={styles.paymentRow}><span>Plan</span><span>{selectedPlan === 'premium' ? 'Premium + CPA' : 'Standard E-File'}</span></div>
                <div style={styles.paymentRow}><span>Documents</span><span>{uploadedFiles.length} uploaded</span></div>
                <div style={styles.totalFinal}><span>Total</span><span style={styles.totalAmount}>{selectedPlan === 'premium' ? '$99' : '$49'}</span></div>
              </div>
              
              <button 
                onClick={handleFileToIRS} 
                disabled={filing || pdfGenerating || (selectedPlan === 'premium' && uploadedFiles.length === 0)} 
                style={Object.assign({}, styles.fileIrsBtn, { 
                  opacity: (filing || pdfGenerating || (selectedPlan === 'premium' && uploadedFiles.length === 0)) ? 0.5 : 1, 
                  marginTop: '20px' 
                })}
              >
                {filing ? 'Filing...' : (selectedPlan === 'premium' ? '⭐ Submit for CPA Review' : '📤 File to IRS')}
              </button>
              
              {selectedPlan !== 'premium' && (
                <p style={{ textAlign: 'center', color: '#64748b', fontSize: '12px', marginTop: '12px' }}>
                  You can also upload documents later from your dashboard.
                </p>
              )}
            </div>
          )}
          
          {/* ✅ STEP 7: Completion */}
          {(step === 7 || filed) && (
            <div style={styles.completeBox}>
              <div style={styles.completeIcon}>🎉</div>
              <h2 style={styles.completeTitle}>{selectedPlan === 'premium' ? 'Submitted for CPA Review!' : 'Tax Return Filed!'}</h2>
              <p style={styles.completeText}>{selectedPlan === 'premium' ? 'A licensed CPA will review your documents and tax return within 24-48 hours.' : 'Successfully submitted to IRS.'}</p>
              <div style={styles.confirmationBox}>
                <p style={{ margin: 0, fontSize: '14px', color: '#94a3b8' }}>Confirmation Number</p>
                <p style={{ margin: '4px 0 0', fontSize: '20px', fontWeight: '700', color: '#e2e8f0' }}>{confirmationNumber}</p>
              </div>
              {uploadedFiles.length > 0 && (
                <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '16px' }}>
                  📎 {uploadedFiles.length} document{uploadedFiles.length > 1 ? 's' : ''} uploaded for review
                </p>
              )}
              <button onClick={onClose} style={styles.doneBtn}>Done</button>
            </div>
          )}
        </div>
        {step < 7 && step > 0 && !filed && (
          <div style={styles.footer}>
            <button onClick={step === 1 ? onClose : handleBack} style={styles.backBtn}>{step === 1 ? t.buttons.cancel : t.buttons.back}</button>
            <button onClick={handleNext} disabled={(step === 1 && !isStep1Complete) || validating} style={Object.assign({}, styles.nextBtn, { opacity: ((step === 1 && !isStep1Complete) || validating) ? 0.5 : 1 })}>{validating ? t.step1.validating : t.buttons.continue}</button>
          </div>
        )}
        {editingSection && (
          <div style={styles.modalOverlay}>
            <div style={styles.editModal}>
              <h3 style={{ margin: '0 0 16px', color: '#e2e8f0' }}>{t.step1.edit}</h3>
              <div style={styles.editForm}>
                {editingSection === 'taxpayer' && (
                  <React.Fragment>
                    <div style={styles.formRow}><label style={styles.formLabel}>{t.fields.first_name}</label><input type="text" value={editFormData.first_name || ''} onChange={function(e) { setEditFormData(Object.assign({}, editFormData, { first_name: e.target.value })); }} style={styles.formInput} /></div>
                    <div style={styles.formRow}><label style={styles.formLabel}>{t.fields.last_name}</label><input type="text" value={editFormData.last_name || ''} onChange={function(e) { setEditFormData(Object.assign({}, editFormData, { last_name: e.target.value })); }} style={styles.formInput} /></div>
                    <div style={styles.formRow}><label style={styles.formLabel}>{t.fields.ssn}</label><input type="text" value={formatSSN(editFormData.ssn || '')} onChange={function(e) { setEditFormData(Object.assign({}, editFormData, { ssn: e.target.value.replace(/\D/g, '').slice(0, 9) })); }} placeholder="XXX-XX-XXXX" style={styles.formInput} /></div>
                    <div style={styles.formRow}><label style={styles.formLabel}>{t.fields.address}</label><input type="text" value={editFormData.address || ''} onChange={function(e) { setEditFormData(Object.assign({}, editFormData, { address: e.target.value })); }} style={styles.formInput} /></div>
                    <div style={styles.formRowGrid}>
                      <div><label style={styles.formLabel}>{t.fields.city}</label><input type="text" value={editFormData.city || ''} onChange={function(e) { setEditFormData(Object.assign({}, editFormData, { city: e.target.value })); }} style={styles.formInput} /></div>
                      <div><label style={styles.formLabel}>{t.fields.state}</label><input type="text" value={editFormData.state || ''} onChange={function(e) { setEditFormData(Object.assign({}, editFormData, { state: e.target.value })); }} style={styles.formInput} /></div>
                      <div><label style={styles.formLabel}>{t.fields.zip}</label><input type="text" value={editFormData.zip || ''} onChange={function(e) { setEditFormData(Object.assign({}, editFormData, { zip: e.target.value })); }} style={styles.formInput} /></div>
                    </div>
                    <div style={styles.formRow}>
                      <label style={styles.formLabel}>{t.fields.filing_status}</label>
                      <select value={editFormData.filing_status || ''} onChange={function(e) { setEditFormData(Object.assign({}, editFormData, { filing_status: e.target.value })); }} style={styles.formInput}>
                        <option value="">{t.filingStatusOptions.select}</option>
                        <option value="single">{t.filingStatusOptions.single}</option>
                        <option value="married_filing_jointly">{t.filingStatusOptions.married_filing_jointly}</option>
                        <option value="married_filing_separately">{t.filingStatusOptions.married_filing_separately}</option>
                        <option value="head_of_household">{t.filingStatusOptions.head_of_household}</option>
                        <option value="qualifying_surviving_spouse">{t.filingStatusOptions.qualifying_surviving_spouse}</option>
                      </select>
                    </div>
                  </React.Fragment>
                )}
                {editingSection === 'spouse' && (
                  <React.Fragment>
                    <div style={styles.formRow}><label style={styles.formLabel}>{t.fields.spouse_first_name}</label><input type="text" value={editFormData.spouse_first_name || ''} onChange={function(e) { setEditFormData(Object.assign({}, editFormData, { spouse_first_name: e.target.value })); }} style={styles.formInput} /></div>
                    <div style={styles.formRow}><label style={styles.formLabel}>{t.fields.spouse_last_name}</label><input type="text" value={editFormData.spouse_last_name || ''} onChange={function(e) { setEditFormData(Object.assign({}, editFormData, { spouse_last_name: e.target.value })); }} style={styles.formInput} /></div>
                    <div style={styles.formRow}><label style={styles.formLabel}>{t.fields.spouse_ssn}</label><input type="text" value={formatSSN(editFormData.spouse_ssn || '')} onChange={function(e) { setEditFormData(Object.assign({}, editFormData, { spouse_ssn: e.target.value.replace(/\D/g, '').slice(0, 9) })); }} placeholder="XXX-XX-XXXX" style={styles.formInput} /></div>
                  </React.Fragment>
                )}
                {editingSection && (editingSection.indexOf('dependent') === 0) && (
                  <React.Fragment>
                    <div style={styles.formRow}><label style={styles.formLabel}>{t.fields.first_name}</label><input type="text" value={editFormData.first_name || ''} onChange={function(e) { setEditFormData(Object.assign({}, editFormData, { first_name: e.target.value })); }} style={styles.formInput} /></div>
                    <div style={styles.formRow}><label style={styles.formLabel}>{t.fields.last_name}</label><input type="text" value={editFormData.last_name || ''} onChange={function(e) { setEditFormData(Object.assign({}, editFormData, { last_name: e.target.value })); }} style={styles.formInput} /></div>
                    <div style={styles.formRow}><label style={styles.formLabel}>{t.fields.ssn}</label><input type="text" value={formatSSN(editFormData.ssn || '')} onChange={function(e) { setEditFormData(Object.assign({}, editFormData, { ssn: e.target.value.replace(/\D/g, '').slice(0, 9) })); }} placeholder="XXX-XX-XXXX" style={styles.formInput} /></div>
                    <div style={styles.formRow}>
                      <label style={styles.formLabel}>{t.fields.dependent_relationship}</label>
                      <select value={editFormData.relationship || ''} onChange={function(e) { setEditFormData(Object.assign({}, editFormData, { relationship: e.target.value })); }} style={styles.formInput}>
                        <option value="">Select...</option>
                        {Object.keys(t.relationships).map(function(key) { return <option key={key} value={key}>{t.relationships[key]}</option>; })}
                      </select>
                    </div>
                    <div style={styles.formRow}><label style={styles.formLabel}>{t.fields.dependent_dob}</label><input type="date" value={editFormData.date_of_birth || ''} onChange={function(e) { setEditFormData(Object.assign({}, editFormData, { date_of_birth: e.target.value })); }} style={styles.formInput} /></div>
                  </React.Fragment>
                )}
              </div>
              <div style={styles.editModalButtons}>
                <button onClick={function() { setEditingSection(null); }} style={styles.cancelBtn}>{t.step1.cancel}</button>
                <button onClick={saveEdit} style={styles.saveBtn}>{t.step1.save}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' },
  modal: { backgroundColor: '#0f172a', borderRadius: '20px', width: '100%', maxWidth: '600px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 50px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.06)' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)', color: 'white' },
  headerTitle: { margin: 0, fontSize: '20px', fontWeight: '700' },
  headerSubtitle: { margin: '4px 0 0', opacity: 0.9, fontSize: '14px' },
  closeBtn: { background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', width: '36px', height: '36px', borderRadius: '50%', fontSize: '24px', cursor: 'pointer' },
  stepIndicator: { display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', backgroundColor: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)', flexWrap: 'wrap', gap: '4px' },
  stepItem: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' },
  stepCircle: { width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '600', fontSize: '12px' },
  stepLabel: { fontSize: '10px', fontWeight: '500', color: '#94a3b8' },
  stepLine: { width: '24px', height: '3px', margin: '0 4px', borderRadius: '2px' },
  content: { padding: '24px', overflowY: 'auto', flex: 1, backgroundColor: '#0f172a' },
  sectionTitle: { marginTop: 0, marginBottom: '16px', color: '#e2e8f0', fontSize: '18px' },
  warningBox: { backgroundColor: 'rgba(245, 158, 11, 0.15)', border: '2px solid rgba(245, 158, 11, 0.4)', borderRadius: '12px', padding: '16px', marginBottom: '20px' },
  warningTitle: { margin: '0 0 8px', color: '#fbbf24', fontSize: '14px' },
  missingList: { margin: '0 0 8px', paddingLeft: '0', listStyle: 'none' },
  missingItem: { color: '#fcd34d', marginBottom: '4px', fontSize: '13px' },
  warningNote: { color: '#fbbf24', fontSize: '12px', marginBottom: 0 },
  infoCard: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '16px', marginBottom: '12px', border: '1px solid rgba(255,255,255,0.06)' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' },
  infoTitle: { margin: 0, color: '#e2e8f0', fontSize: '14px', fontWeight: '600' },
  infoGrid: { display: 'grid', gap: '8px' },
  infoRow: { display: 'flex', justifyContent: 'space-between', fontSize: '14px' },
  infoLabel: { color: '#94a3b8' },
  infoValue: { fontWeight: '500', color: '#e2e8f0' },
  editBtnSmall: { padding: '4px 12px', backgroundColor: '#7c3aed', color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' },
  sectionCard: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '16px', marginBottom: '16px', border: '1px solid rgba(255,255,255,0.06)' },
  sectionSubtitle: { margin: '0 0 12px', color: '#e2e8f0', fontSize: '14px', fontWeight: '700' },
  dataGrid: { display: 'grid', gap: '8px' },
  dataRow: { display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#94a3b8' },
  dataValue: { fontWeight: '500', color: '#e2e8f0' },
  totalRow: { display: 'flex', justifyContent: 'space-between', fontWeight: '700', fontSize: '15px', color: '#e2e8f0' },
  divider: { border: 'none', borderTop: '1px solid rgba(255,255,255,0.06)', margin: '8px 0' },
  dependentRow: { backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '8px', padding: '12px', marginBottom: '12px', border: '1px solid rgba(255,255,255,0.06)' },
  dependentHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' },
  dependentNum: { fontWeight: '700', color: '#a78bfa' },
  dependentGrid: { display: 'grid', gap: '6px' },
  depField: { display: 'flex', justifyContent: 'space-between', fontSize: '13px' },
  depLabel: { color: '#94a3b8' },
  depValue: { fontWeight: '500', color: '#e2e8f0' },
  refundCard: { borderRadius: '16px', padding: '24px', textAlign: 'center', border: '3px solid', marginBottom: '16px', backgroundColor: 'rgba(255,255,255,0.03)' },
  refundLabel: { fontSize: '14px', marginBottom: '4px', color: '#94a3b8' },
  refundAmount: { fontSize: '40px', fontWeight: '800', margin: '8px 0 16px' },
  refundBreakdown: { display: 'flex', justifyContent: 'center', gap: '40px' },
  checkboxLabel: { display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13px', color: '#94a3b8', cursor: 'pointer', marginTop: '16px' },
  checkbox: { width: '18px', height: '18px', cursor: 'pointer', marginTop: '2px' },
  signatureBox: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '20px', border: '1px solid rgba(255,255,255,0.06)' },
  signatureText: { fontSize: '13px', color: '#94a3b8', lineHeight: '1.6', marginBottom: '20px' },
  signatureInputGroup: { marginBottom: '16px' },
  signatureLabel: { display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '6px', color: '#e2e8f0' },
  signatureInput: { width: '100%', padding: '10px 14px', fontSize: '15px', border: '2px solid rgba(255,255,255,0.1)', borderRadius: '8px', boxSizing: 'border-box', backgroundColor: 'rgba(255,255,255,0.05)', color: '#e2e8f0' },
  loadingBox: { textAlign: 'center', padding: '60px' },
  spinner: { width: '40px', height: '40px', border: '4px solid rgba(255,255,255,0.1)', borderTopColor: '#7c3aed', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' },
  paymentSubtitle: { color: '#94a3b8', marginBottom: '20px', fontSize: '14px' },
  plansGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' },
  planCard: { borderRadius: '12px', padding: '16px', cursor: 'pointer', transition: 'all 0.2s', position: 'relative', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' },
  planHeader: { display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '10px' },
  planIcon: { fontSize: '24px' },
  planName: { margin: 0, fontSize: '14px', fontWeight: '600', color: '#e2e8f0' },
  planPrice: { fontSize: '24px', fontWeight: '800', marginBottom: '10px', color: '#e2e8f0' },
  planFeatures: { listStyle: 'none', padding: 0, margin: 0, fontSize: '12px', color: '#94a3b8' },
  recommendedBadge: { position: 'absolute', top: '-8px', right: '12px', backgroundColor: '#7c3aed', color: 'white', padding: '3px 10px', borderRadius: '10px', fontSize: '9px', fontWeight: '700' },
  totalBox: { backgroundColor: 'rgba(255,255,255,0.05)', color: 'white', borderRadius: '12px', padding: '14px 16px', border: '1px solid rgba(255,255,255,0.1)' },
  paymentRow: { display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px', color: '#94a3b8' },
  totalFinal: { display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: '600', color: '#e2e8f0' },
  totalAmount: { color: '#10b981', fontSize: '20px', fontWeight: '800' },
  fileIrsBtn: { width: '100%', padding: '14px', fontSize: '16px', fontWeight: '700', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer' },
  completeBox: { textAlign: 'center', padding: '32px 16px' },
  completeIcon: { fontSize: '64px' },
  completeTitle: { fontSize: '24px', margin: '12px 0', color: '#10b981' },
  completeText: { color: '#94a3b8', fontSize: '14px', lineHeight: '1.6', marginBottom: '20px' },
  confirmationBox: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '16px', marginBottom: '20px', border: '1px solid rgba(255,255,255,0.06)' },
  doneBtn: { padding: '12px 40px', fontSize: '15px', fontWeight: '600', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer' },
  footer: { display: 'flex', justifyContent: 'space-between', padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.06)', backgroundColor: 'rgba(255,255,255,0.02)' },
  backBtn: { padding: '10px 20px', fontSize: '14px', fontWeight: '500', backgroundColor: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '2px solid rgba(255,255,255,0.1)', borderRadius: '10px', cursor: 'pointer' },
  nextBtn: { padding: '10px 24px', fontSize: '14px', fontWeight: '600', backgroundColor: '#7c3aed', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 },
  editModal: { backgroundColor: '#0f172a', borderRadius: '16px', padding: '24px', width: '90%', maxWidth: '450px', maxHeight: '80vh', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.1)' },
  editForm: { marginBottom: '20px' },
  formRow: { marginBottom: '14px' },
  formRowGrid: { display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '10px', marginBottom: '14px' },
  formInput: { width: '100%', padding: '10px 12px', fontSize: '14px', border: '2px solid rgba(255,255,255,0.1)', borderRadius: '8px', boxSizing: 'border-box', marginTop: '4px', backgroundColor: 'rgba(255,255,255,0.05)', color: '#e2e8f0' },
  editModalButtons: { display: 'flex', gap: '10px', justifyContent: 'flex-end' },
  cancelBtn: { padding: '10px 20px', backgroundColor: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', cursor: 'pointer', fontWeight: '500' },
  saveBtn: { padding: '10px 20px', backgroundColor: '#7c3aed', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' },
  formLabel: { color: '#e2e8f0', fontSize: '13px', fontWeight: '500', display: 'block', marginBottom: '4px' }
};