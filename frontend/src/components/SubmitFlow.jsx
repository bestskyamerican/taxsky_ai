// ============================================================
// SUBMIT FLOW - v5.1 CPA PRICING MODEL
// ============================================================
// FREE: All plans discounted to $0 for self-file
// PAID: CPA Review = Plan Price + $59/form
// ============================================================
// Changes from v5.0:
// - All plans discounted to $0 for self-file
// - CPA = Plan Price + $59 per form (Federal + State)
// ============================================================

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import PaymentFlow from './PaymentFlow';

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";
const PYTHON_API = import.meta.env.VITE_PYTHON_API || "http://localhost:5002";

// CPA Fee per form
const CPA_FEE_PER_FORM = 59;

// Pricing Plans - Original prices (discounted to $0 without CPA)
const PLANS = {
  free: { id: 'free', name: 'Free Estimate', price: 0, icon: '🆓', description: 'View estimate only' },
  basic: { id: 'basic', name: 'Basic', price: 29.99, icon: '📄', description: 'Simple W-2' },
  standard: { id: 'standard', name: 'Standard', price: 49.99, icon: '⭐', description: 'Most popular', popular: true },
  plus: { id: 'plus', name: 'Plus', price: 79.99, icon: '💎', description: 'Multiple income' },
  selfEmployed: { id: 'selfEmployed', name: 'Self-Employed', price: 89.99, icon: '💼', description: '1099/Schedule C' },
  premium: { id: 'premium', name: 'Premium', price: 129.99, icon: '👑', description: 'Complex returns' },
};

// Translations
const translations = {
  en: {
    title: "File Your Tax Return",
    taxYear: "Tax Year 2025",
    steps: {
      reviewInfo: "Review Info",
      verifyIncome: "Income",
      checkRefund: "Summary",
      confirmSign: "Sign",
      choosePlan: "Plan",
      download: "Download"
    },
    buttons: { cancel: "Cancel", back: "Back", continue: "Continue", download: "Download PDF" }
  },
  vi: {
    title: "Nộp Tờ Khai Thuế",
    taxYear: "Năm Thuế 2025",
    steps: {
      reviewInfo: "Xem Lại",
      verifyIncome: "Thu Nhập",
      checkRefund: "Tóm Tắt",
      confirmSign: "Ký",
      choosePlan: "Gói",
      download: "Tải Về"
    },
    buttons: { cancel: "Hủy", back: "Quay Lại", continue: "Tiếp", download: "Tải PDF" }
  },
  es: {
    title: "Presentar Declaración",
    taxYear: "Año 2025",
    steps: {
      reviewInfo: "Revisar",
      verifyIncome: "Ingresos",
      checkRefund: "Resumen",
      confirmSign: "Firmar",
      choosePlan: "Plan",
      download: "Descargar"
    },
    buttons: { cancel: "Cancelar", back: "Atrás", continue: "Continuar", download: "Descargar PDF" }
  }
};

// Checksum utility
async function generateChecksum(payload) {
  const encoder = new TextEncoder();
  const data = encoder.encode(JSON.stringify(payload));
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export default function SubmitFlow({ onClose, taxData, userData: initialUserData, userId, token }) {
  const navigate = useNavigate();
  const { language } = useLanguage?.() || { language: 'en' };
  const t = translations[language] || translations.en;

  // State
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(initialUserData || {});
  const [dependents, setDependents] = useState([]);
  const [incomeData, setIncomeData] = useState(taxData || {});
  const [form1040Data, setForm1040Data] = useState(null);
  
  // Step 1 state
  const [confirmedInfo, setConfirmedInfo] = useState(false);
  const [editingSection, setEditingSection] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [pythonMissing, setPythonMissing] = useState([]);
  const [validating, setValidating] = useState(false);
  
  // Dependent editing state
  const [editingDependent, setEditingDependent] = useState(null);
  const [dependentFormData, setDependentFormData] = useState({
    first_name: '',
    last_name: '',
    ssn: '',
    relationship: 'child',
    date_of_birth: '',
    months_lived: 12
  });
  
  // Step 4 state
  const [signature, setSignature] = useState('');
  const [spouseSignature, setSpouseSignature] = useState('');
  const [agreedTerms, setAgreedTerms] = useState(false);
  
  // Step 5 state - NEW CPA PRICING MODEL
  const [selectedPlan, setSelectedPlan] = useState('free');
  const [includeCPA, setIncludeCPA] = useState(false);
  const [includeState, setIncludeState] = useState(true);
  
  // Step 6 state
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [pdfGenerated, setPdfGenerated] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [downloadingCA540, setDownloadingCA540] = useState(false);

  // ✅ Download filled CA Form 540
  const handleDownloadCA540 = async () => {
    setDownloadingCA540(true);
    try {
      const res = await fetch(`${PYTHON_API}/generate/ca540`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: userId,
          tax_year: 2025,
          mask_ssn: false,
          personal: {
            first_name: userData?.first_name || userData?.answers?.first_name || '',
            last_name: userData?.last_name || userData?.answers?.last_name || '',
            ssn: userData?.ssn || userData?.answers?.ssn || '',
            spouse_first_name: userData?.spouse_first_name || userData?.answers?.spouse_first_name || '',
            spouse_last_name: userData?.spouse_last_name || userData?.answers?.spouse_last_name || '',
            spouse_ssn: userData?.spouse_ssn || userData?.answers?.spouse_ssn || '',
            address: userData?.address || userData?.answers?.address || '',
            city: userData?.city || userData?.answers?.city || '',
            state: 'CA',
            zip: userData?.zip || userData?.answers?.zip || '',
          },
          federal: {
            filing_status: userData?.filing_status || incomeData?.filing_status || 'single',
            wages: incomeData?.wages || incomeData?.totalIncome || 0,
            agi: incomeData?.agi || incomeData?.totalIncome || 0,
          },
          state: {
            ca_agi: incomeData?.caAgi || incomeData?.agi || 0,
            standard_deduction: incomeData?.caStdDeduction || 0,
            taxable_income: incomeData?.caTaxableIncome || 0,
            total_tax: incomeData?.caTax || incomeData?.stateTax || 0,
            withholding: incomeData?.caWithholding || incomeData?.stateWithholding || 0,
            refund: incomeData?.stateRefund || 0,
            amount_owed: incomeData?.stateOwed || 0,
          },
          dependents: dependents || [],
        }),
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `CA_Form_540_2025.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        alert('Error generating CA 540. Please try again.');
      }
    } catch (err) {
      console.error('CA540 download error:', err);
      alert('Error: ' + err.message);
    } finally {
      setDownloadingCA540(false);
    }
  };
  const [uploading, setUploading] = useState(false);
  
  // Payment state
  const [showPaymentFlow, setShowPaymentFlow] = useState(false);
  const [finalTaxData, setFinalTaxData] = useState(null);

  const STEPS = [
    { num: 1, title: t.steps.reviewInfo, icon: '📋' },
    { num: 2, title: t.steps.verifyIncome, icon: '💵' },
    { num: 3, title: t.steps.checkRefund, icon: '🔍' },
    { num: 4, title: t.steps.confirmSign, icon: '✍️' },
    { num: 5, title: t.steps.choosePlan, icon: '💳' },
    { num: 6, title: t.steps.download, icon: '📥' },
  ];

  // NEW: Calculate pricing based on CPA selection
  const plan = PLANS[selectedPlan] || PLANS.free;
  const formCount = includeState ? 2 : 1; // Federal + State
  const cpaFee = CPA_FEE_PER_FORM * formCount;
  const totalWithCPA = plan.price + cpaFee;
  const totalPrice = includeCPA ? totalWithCPA : 0; // $0 without CPA (discounted)

  // Load data on mount
  useEffect(() => { loadData(); }, []);

  async function loadData() {
    if (!userId) { setLoading(false); return; }
    try {
      let baseUserData = initialUserData || {};
      let baseDependents = [];
      
      // PRIORITY 1: Use taxData prop if passed from Dashboard
      // This contains the CALCULATED tax data that Dashboard shows
      if (taxData && Object.keys(taxData).length > 0) {
        console.log('[SUBMITFLOW] Using taxData from Dashboard:', taxData);
        
        // Build form1040 structure from Dashboard's calculated data
        const calculatedForm1040 = {
          header: {
            tax_year: 2025,
            filing_status: taxData.filing_status || baseUserData.filing_status || 'single'
          },
          income: {
            line_1_wages: taxData.wages || taxData.totalIncome || 0,
            line_1z_total_wages: taxData.wages || taxData.totalIncome || 0,
            line_9_total_income: taxData.totalIncome || taxData.wages || 0
          },
          adjustments: {
            line_10_adjustments: taxData.adjustments || 0,
            line_11_agi: taxData.agi || taxData.totalIncome || 0
          },
          deductions: {
            line_12_deduction: taxData.standardDeduction || 15750,
            line_14_total_deductions: taxData.standardDeduction || 15750
          },
          tax_and_credits: {
            line_15_taxable_income: taxData.taxableIncome || 0,
            line_16_tax: taxData.federalTax || 0,
            line_18_total_tax_before_credits: taxData.federalTax || 0,
            line_19_child_tax_credit: taxData.childTaxCredit || 0,
            line_21_total_credits: taxData.childTaxCredit || 0,
            line_22_tax_after_credits: Math.max(0, (taxData.federalTax || 0) - (taxData.childTaxCredit || 0)),
            line_24_total_tax: Math.max(0, (taxData.federalTax || 0) - (taxData.childTaxCredit || 0))
          },
          payments: {
            line_25a_w2_withholding: taxData.federalWithholding || 0,
            line_25d_total_withholding: taxData.federalWithholding || 0,
            line_33_total_payments: taxData.federalWithholding || 0
          },
          refund_or_owe: {
            line_34_overpayment: taxData.federalRefund || 0,
            line_35_refund: taxData.federalRefund || 0,
            line_37_amount_owe: taxData.federalOwed || 0
          }
        };
        
        setForm1040Data(calculatedForm1040);
        setIncomeData(taxData);
      }
      
      // Get user data from Node.js API
      try {
        const userRes = await fetch(`${API_BASE}/api/tax/user/${userId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (userRes.ok) {
          const data = await userRes.json();
          baseUserData = { ...baseUserData, ...(data.user || data || {}) };
          baseDependents = data.dependents || data.user?.dependents || [];
        }
      } catch (e) { console.log('[SUBMITFLOW] No user data from Node.js'); }

      // PRIORITY 2: If no taxData prop, try to get from Python API
      if (!taxData || Object.keys(taxData).length === 0) {
        try {
          const form1040Res = await fetch(`${PYTHON_API}/api/extract/json/${userId}?tax_year=2025`);
          if (form1040Res.ok) {
            const data = await form1040Res.json();
            if (data.form1040) {
              setForm1040Data(data.form1040);
              // Merge personal info
              if (data.form1040.header) {
                baseUserData = { ...baseUserData, ...data.form1040.header };
              }
            }
          }
        } catch (e) { console.log('[SUBMITFLOW] No form1040 from Python'); }
      }

      setUserData(baseUserData);
      setDependents(baseDependents);
      setLoading(false);
      
      // Validate after load
      setTimeout(() => validateWithPython(), 500);
    } catch (error) {
      console.error('[SUBMITFLOW] Load error:', error);
      setLoading(false);
    }
  }

  async function validateWithPython() {
    try {
      setValidating(true);
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
        dependents: dependents.map(d => ({
          first_name: d.first_name || d.name || '',
          last_name: d.last_name || '',
          ssn: d.ssn || '',
          relationship: d.relationship || '',
          date_of_birth: d.date_of_birth || '',
          months_lived: d.months_lived || 12
        })),
        form1040: form1040Data
      };
      
      const response = await fetch(`${PYTHON_API}/generate/1040/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (response.ok) {
        const result = await response.json();
        if (!result.valid && result.missing) {
          setPythonMissing(result.missing.map(m => ({ key: m.field, label: m.label, section: m.section })));
        } else {
          setPythonMissing([]);
        }
        return result.valid;
      }
    } catch (error) {
      console.log('[SUBMITFLOW] Validation endpoint not available');
      return true; // Allow to proceed
    } finally {
      setValidating(false);
    }
    return true;
  }

  // ============================================================
  // DEPENDENT MANAGEMENT FUNCTIONS
  // ============================================================
  function openDependentModal(index = 'new') {
    setEditingDependent(index);
    if (index === 'new') {
      setDependentFormData({
        first_name: '',
        last_name: '',
        ssn: '',
        relationship: 'child',
        date_of_birth: '',
        months_lived: 12
      });
    } else {
      const dep = dependents[index];
      setDependentFormData({
        first_name: dep.first_name || dep.name || '',
        last_name: dep.last_name || '',
        ssn: dep.ssn || '',
        relationship: dep.relationship || 'child',
        date_of_birth: dep.date_of_birth || '',
        months_lived: dep.months_lived || 12
      });
    }
  }

  async function saveDependent() {
    try {
      const newDependent = {
        ...dependentFormData,
        ssn: dependentFormData.ssn.replace(/\D/g, ''),
      };

      let updatedDependents;
      if (editingDependent === 'new') {
        updatedDependents = [...dependents, newDependent];
      } else {
        updatedDependents = [...dependents];
        updatedDependents[editingDependent] = newDependent;
      }

      // Try to save to backend
      try {
        await fetch(`${API_BASE}/api/tax/user/${userId}/dependents`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ dependents: updatedDependents })
        });
      } catch (e) { console.log('[SUBMITFLOW] API save failed, using local'); }

      setDependents(updatedDependents);
      setEditingDependent(null);
      setTimeout(() => validateWithPython(), 100);
    } catch (error) {
      console.error('[SUBMITFLOW] Error saving dependent:', error);
    }
  }

  async function deleteDependent(index) {
    if (!confirm('Remove this dependent?')) return;
    const updatedDependents = dependents.filter((_, i) => i !== index);
    
    try {
      await fetch(`${API_BASE}/api/tax/user/${userId}/dependents`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ dependents: updatedDependents })
      });
    } catch (e) { console.log('[SUBMITFLOW] API delete failed'); }
    
    setDependents(updatedDependents);
    setTimeout(() => validateWithPython(), 100);
  }

  // ============================================================
  // PDF DOWNLOAD FUNCTION
  // ============================================================
  async function downloadForm1040() {
    try {
      setDownloadingPdf(true);
      
      const payload = {
        session_id: userId,
        mask_ssn: false, // Show full SSN for official filing
        is_official_submission: true,
        personal: {
          first_name: userData?.first_name || '',
          last_name: userData?.last_name || '',
          ssn: userData?.ssn || '',
          address: userData?.address || '',
          apt: userData?.apt || '',
          city: userData?.city || '',
          state: userData?.state || 'CA',
          zip: userData?.zip || '',
          filing_status: userData?.filing_status || 'single',
          spouse_first_name: userData?.spouse_first_name || '',
          spouse_last_name: userData?.spouse_last_name || '',
          spouse_ssn: userData?.spouse_ssn || ''
        },
        dependents: dependents.map(d => ({
          first_name: d.first_name || '',
          last_name: d.last_name || '',
          ssn: d.ssn || '',
          relationship: d.relationship || 'child',
          date_of_birth: d.date_of_birth || '',
          months_lived: d.months_lived || 12
        })),
        form1040: form1040Data
      };
      
      // DEBUG: Log what we're sending
      console.log('[SUBMITFLOW] 📄 PDF Payload:', JSON.stringify(payload, null, 2));
      console.log('[SUBMITFLOW] 📊 form1040Data:', form1040Data);
      console.log('[SUBMITFLOW] 👤 userData:', userData);
      
      const response = await fetch(`${PYTHON_API}/generate/1040`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }
      
      // Download the PDF
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Form1040_2025_${userData?.last_name || 'TaxReturn'}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      setPdfGenerated(true);
      
    } catch (error) {
      console.error('[SUBMITFLOW] PDF download error:', error);
      alert('Error generating PDF. Please try again.');
    } finally {
      setDownloadingPdf(false);
    }
  }

  // Helper functions
  function maskSSN(ssn) {
    if (!ssn) return '___-__-____';
    const clean = ssn.replace(/\D/g, '');
    return clean.length >= 4 ? `***-**-${clean.slice(-4)}` : '___-__-____';
  }

  function getFilingStatusDisplay(status) {
    const displays = {
      single: 'Single',
      married_filing_jointly: 'Married Filing Jointly',
      married_filing_separately: 'Married Filing Separately',
      head_of_household: 'Head of Household',
      qualifying_surviving_spouse: 'Qualifying Surviving Spouse'
    };
    return displays[status] || status || '___';
  }

  function fmt(val) {
    if (!val) return '$0';
    return `$${Number(val).toLocaleString()}`;
  }

  // Edit modal handlers
  function openEditModal(section) {
    setEditingSection(section);
    if (section === 'taxpayer') {
      setEditFormData({
        first_name: userData?.first_name || '',
        last_name: userData?.last_name || '',
        ssn: userData?.ssn || '',
        address: userData?.address || '',
        city: userData?.city || '',
        state: userData?.state || '',
        zip: userData?.zip || '',
        filing_status: userData?.filing_status || ''
      });
    } else if (section === 'spouse') {
      setEditFormData({
        spouse_first_name: userData?.spouse_first_name || '',
        spouse_last_name: userData?.spouse_last_name || '',
        spouse_ssn: userData?.spouse_ssn || ''
      });
    }
  }

  async function saveEdit() {
    try {
      const res = await fetch(`${API_BASE}/api/tax/user/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(editFormData)
      });
      if (res.ok) {
        setUserData({ ...userData, ...editFormData });
        setEditingSection(null);
        setTimeout(() => validateWithPython(), 100);
      }
    } catch (error) {
      alert('Error saving. Please try again.');
    }
  }

  // Navigation - UPDATED FOR NEW PRICING
  function handleNext() {
    if (step === 5) {
      if (includeCPA && totalPrice > 0) {
        // CPA plan selected - go to step 6 for document upload then payment
        setStep(6);
      } else {
        // Free self-file - go to download
        setStep(6);
      }
    } else if (step === 6) {
      if (!includeCPA) {
        // Free plan - just close after download
        if (pdfGenerated) {
          onClose?.();
        }
      } else {
        // CPA plan - proceed to payment
        proceedToPayment();
      }
    } else {
      setStep(step + 1);
    }
  }

  function handleBack() {
    if (step > 1) setStep(step - 1);
  }

  async function proceedToPayment() {
    try {
      const checksum = await generateChecksum({ userId, timestamp: Date.now() });
      const frozenTaxSession = {
        userId,
        plan: selectedPlan,
        planPrice: plan.price,
        cpaFee: cpaFee,
        formCount: formCount,
        totalPrice: totalPrice,
        includeCPA: true,
        includeState: includeState,
        taxData: form1040Data,
        userData,
        dependents,
        checksum,
        status: 'READY_FOR_PAYMENT',
        lockedAt: new Date().toISOString(),
      };
      localStorage.setItem('taxsky_final_tax', JSON.stringify(frozenTaxSession));
      setFinalTaxData(frozenTaxSession);
      setShowPaymentFlow(true);
    } catch (error) {
      console.error('[SUBMITFLOW] Error proceeding to payment:', error);
      alert('Error preparing payment. Please try again.');
    }
  }

  // Calculate values
  const isMFJ = userData?.filing_status === 'married_filing_jointly';
  const wages = form1040Data?.income?.line_1_wages || form1040Data?.income?.line_1z_total_wages || incomeData?.wages || 0;
  const agi = form1040Data?.adjustments?.line_11_agi || incomeData?.agi || wages;
  const taxableIncome = form1040Data?.tax_and_credits?.line_15_taxable_income || incomeData?.taxableIncome || 0;
  const totalTax = form1040Data?.tax_and_credits?.line_24_total_tax || incomeData?.federalTax || 0;
  const withholding = form1040Data?.payments?.line_25d_total_withholding || form1040Data?.payments?.line_25a_w2_withholding || incomeData?.federalWithholding || 0;
  const federalNet = withholding - totalTax;
  const caWithholding = incomeData?.caWithholding || 0;
  const caTax = incomeData?.caTax || 0;
  const stateNet = caWithholding - caTax;
  const totalNet = federalNet + stateNet;
  
  const isStep1Complete = confirmedInfo && pythonMissing.length === 0;
  const isStep4Complete = signature && agreedTerms && (!isMFJ || spouseSignature);

  // Loading state
  if (loading) {
    return (
      <div style={styles.overlay}>
        <div style={styles.modal}>
          <div style={styles.loadingBox}>
            <div style={styles.spinner} />
            <p style={{ color: '#94a3b8' }}>Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h2 style={styles.headerTitle}>{t.title}</h2>
            <p style={styles.headerSubtitle}>{t.taxYear}</p>
          </div>
          <button onClick={onClose} style={styles.closeBtn}>×</button>
        </div>

        {/* Step Indicator */}
        <div style={styles.stepIndicator}>
          {STEPS.map((s, i) => (
            <React.Fragment key={s.num}>
              <div style={styles.stepItem}>
                <div style={{
                  ...styles.stepCircle,
                  backgroundColor: step >= s.num ? '#7c3aed' : 'rgba(255,255,255,0.1)',
                  color: step >= s.num ? 'white' : '#64748b'
                }}>
                  {step > s.num ? '✓' : s.icon}
                </div>
                <span style={{
                  ...styles.stepLabel,
                  color: step >= s.num ? '#e2e8f0' : '#64748b'
                }}>{s.title}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div style={{
                  ...styles.stepLine,
                  backgroundColor: step > s.num ? '#7c3aed' : 'rgba(255,255,255,0.1)'
                }} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Content */}
        <div style={styles.content}>
          {/* STEP 1: Review Info */}
          {step === 1 && (
            <div>
              <h3 style={styles.sectionTitle}>📋 Review Your Information</h3>
              <p style={{ color: '#94a3b8', marginBottom: '20px' }}>
                Please verify all information is correct before filing
              </p>

              {/* Validation warnings */}
              {pythonMissing.length > 0 && (
                <div style={styles.warningBox}>
                  <h4 style={{ color: '#f59e0b', margin: '0 0 10px' }}>⚠️ Missing Information</h4>
                  {pythonMissing.map((m, i) => (
                    <p key={i} style={{ margin: '4px 0', color: '#fbbf24', fontSize: '14px' }}>
                      • {m.label}
                    </p>
                  ))}
                </div>
              )}

              {/* Taxpayer Info */}
              <div style={{ ...styles.infoCard, borderLeft: '4px solid #3b82f6' }}>
                <div style={styles.cardHeader}>
                  <h4 style={styles.infoTitle}>Taxpayer Information</h4>
                  <button onClick={() => openEditModal('taxpayer')} style={styles.editBtn}>Edit</button>
                </div>
                <div style={styles.infoGrid}>
                  <div style={styles.infoRow}>
                    <span style={styles.infoLabel}>Name:</span>
                    <span style={styles.infoValue}>
                      {userData?.first_name || '___'} {userData?.last_name || '___'}
                    </span>
                  </div>
                  <div style={styles.infoRow}>
                    <span style={styles.infoLabel}>SSN:</span>
                    <span style={styles.infoValue}>{maskSSN(userData?.ssn)}</span>
                  </div>
                  <div style={styles.infoRow}>
                    <span style={styles.infoLabel}>Address:</span>
                    <span style={styles.infoValue}>
                      {userData?.address || '___'}, {userData?.city || '___'}, {userData?.state || '__'} {userData?.zip || '_____'}
                    </span>
                  </div>
                  <div style={styles.infoRow}>
                    <span style={styles.infoLabel}>Filing Status:</span>
                    <span style={styles.infoValue}>{getFilingStatusDisplay(userData?.filing_status)}</span>
                  </div>
                </div>
              </div>

              {/* Spouse Info (if MFJ) */}
              {isMFJ && (
                <div style={{ ...styles.infoCard, borderLeft: '4px solid #7c3aed' }}>
                  <div style={styles.cardHeader}>
                    <h4 style={styles.infoTitle}>Spouse Information</h4>
                    <button onClick={() => openEditModal('spouse')} style={styles.editBtn}>Edit</button>
                  </div>
                  <div style={styles.infoGrid}>
                    <div style={styles.infoRow}>
                      <span style={styles.infoLabel}>Name:</span>
                      <span style={styles.infoValue}>
                        {userData?.spouse_first_name || '___'} {userData?.spouse_last_name || '___'}
                      </span>
                    </div>
                    <div style={styles.infoRow}>
                      <span style={styles.infoLabel}>SSN:</span>
                      <span style={styles.infoValue}>{maskSSN(userData?.spouse_ssn)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Dependents Section */}
              <div style={styles.infoCard}>
                <div style={styles.cardHeader}>
                  <h4 style={styles.infoTitle}>👨‍👩‍👧‍👦 Dependents ({dependents.length})</h4>
                  <button 
                    onClick={() => openDependentModal('new')} 
                    style={{ ...styles.editBtn, backgroundColor: '#10b981' }}
                  >
                    + Add Child
                  </button>
                </div>
                
                {dependents.length === 0 ? (
                  <p style={{ color: '#64748b', fontSize: '14px', textAlign: 'center', padding: '16px 0' }}>
                    No dependents added. Click "Add Child" to add dependents for tax credits.
                  </p>
                ) : (
                  dependents.map((dep, idx) => (
                    <div key={idx} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '12px 0', borderBottom: idx < dependents.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none'
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ color: '#e2e8f0', fontWeight: '500' }}>
                          {dep.first_name} {dep.last_name}
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                          {dep.relationship || 'Child'} • SSN: {maskSSN(dep.ssn)}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => openDependentModal(idx)} style={styles.smallEditBtn}>Edit</button>
                        <button onClick={() => deleteDependent(idx)} style={styles.smallDeleteBtn}>Remove</button>
                      </div>
                    </div>
                  ))
                )}
                
                {dependents.length > 0 && (
                  <div style={styles.taxCreditBox}>
                    <p style={{ fontSize: '12px', color: '#10b981', margin: 0 }}>
                      💰 Tax Credit Estimate: Up to ${(dependents.length * 2000).toLocaleString()} in Child Tax Credits
                    </p>
                  </div>
                )}
              </div>

              {/* Confirm checkbox */}
              {pythonMissing.length === 0 && !validating && (
                <label style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={confirmedInfo}
                    onChange={(e) => setConfirmedInfo(e.target.checked)}
                    style={styles.checkbox}
                  />
                  <span>I confirm all information above is correct</span>
                </label>
              )}
            </div>
          )}

          {/* STEP 2: Income & Deductions */}
          {step === 2 && (
            <div>
              <h3 style={styles.sectionTitle}>💵 Income & Deductions</h3>
              
              <div style={styles.dataCard}>
                <h4 style={styles.dataTitle}>Income</h4>
                <div style={styles.dataRow}>
                  <span>W-2 Wages</span>
                  <span style={styles.dataValue}>{fmt(wages)}</span>
                </div>
                <div style={{ ...styles.dataRow, ...styles.totalRow }}>
                  <span>Adjusted Gross Income (AGI)</span>
                  <span style={{ color: '#10b981', fontWeight: '700' }}>{fmt(agi)}</span>
                </div>
              </div>

              <div style={styles.dataCard}>
                <h4 style={styles.dataTitle}>Deductions</h4>
                <div style={styles.dataRow}>
                  <span>Standard Deduction</span>
                  <span style={{ color: '#10b981' }}>-{fmt(form1040Data?.deductions?.line_12_deduction || incomeData?.standardDeduction)}</span>
                </div>
                <div style={{ ...styles.dataRow, ...styles.totalRow }}>
                  <span>Taxable Income</span>
                  <span style={{ fontWeight: '700' }}>{fmt(taxableIncome)}</span>
                </div>
              </div>

              <div style={{ ...styles.dataCard, backgroundColor: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                <h4 style={{ ...styles.dataTitle, color: '#60a5fa' }}>Tax Withholding</h4>
                <div style={styles.dataRow}>
                  <span>Federal Withheld</span>
                  <span style={styles.dataValue}>{fmt(withholding)}</span>
                </div>
                <div style={styles.dataRow}>
                  <span>State Withheld (CA)</span>
                  <span style={styles.dataValue}>{fmt(caWithholding)}</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Tax Summary */}
          {step === 3 && (
            <div>
              <h3 style={styles.sectionTitle}>🔍 Tax Summary</h3>
              
              {/* Total Refund/Owed Card */}
              <div style={{
                ...styles.refundCard,
                backgroundColor: totalNet >= 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                borderColor: totalNet >= 0 ? '#10b981' : '#ef4444'
              }}>
                <p style={{ color: '#94a3b8', marginBottom: '4px' }}>
                  {totalNet >= 0 ? 'Estimated Refund' : 'Estimated Amount Owed'}
                </p>
                <p style={{
                  fontSize: '40px', fontWeight: '800', margin: '8px 0',
                  color: totalNet >= 0 ? '#10b981' : '#f87171'
                }}>
                  {fmt(Math.abs(totalNet))}
                </p>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '40px', marginTop: '16px' }}>
                  <div>
                    <p style={{ fontSize: '12px', color: '#94a3b8' }}>Federal</p>
                    <p style={{ fontWeight: '700', color: federalNet >= 0 ? '#10b981' : '#f87171' }}>
                      {federalNet >= 0 ? '+' : '-'}{fmt(Math.abs(federalNet))}
                    </p>
                  </div>
                  <div>
                    <p style={{ fontSize: '12px', color: '#94a3b8' }}>State (CA)</p>
                    <p style={{ fontWeight: '700', color: stateNet >= 0 ? '#10b981' : '#f87171' }}>
                      {stateNet >= 0 ? '+' : '-'}{fmt(Math.abs(stateNet))}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Confirm & Sign */}
          {step === 4 && (
            <div>
              <h3 style={styles.sectionTitle}>✍️ Sign Your Return</h3>
              <p style={{ color: '#94a3b8', marginBottom: '20px' }}>
                By signing below, you declare this return is true and correct
              </p>

              <div style={styles.signatureBox}>
                <label style={styles.inputLabel}>Your Signature (Type your full name)</label>
                <input
                  type="text"
                  value={signature}
                  onChange={(e) => setSignature(e.target.value)}
                  placeholder="Type your full legal name"
                  style={styles.signatureInput}
                />

                {isMFJ && (
                  <>
                    <label style={{ ...styles.inputLabel, marginTop: '16px' }}>Spouse's Signature</label>
                    <input
                      type="text"
                      value={spouseSignature}
                      onChange={(e) => setSpouseSignature(e.target.value)}
                      placeholder="Type spouse's full legal name"
                      style={styles.signatureInput}
                    />
                  </>
                )}

                <label style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={agreedTerms}
                    onChange={(e) => setAgreedTerms(e.target.checked)}
                    style={styles.checkbox}
                  />
                  <span>I declare under penalties of perjury that this return is true, correct, and complete</span>
                </label>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* STEP 5: Choose Plan - NEW CPA PRICING MODEL */}
          {/* ============================================================ */}
          {step === 5 && (
            <div>
              {/* Current Selection Header */}
              <div style={{ 
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
                marginBottom: '20px', padding: '16px', 
                background: includeCPA 
                  ? 'linear-gradient(135deg, rgba(124, 58, 237, 0.2), rgba(124, 58, 237, 0.1))' 
                  : 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(16, 185, 129, 0.1))', 
                borderRadius: '12px', 
                border: includeCPA ? '2px solid rgba(124, 58, 237, 0.4)' : '2px solid rgba(16, 185, 129, 0.4)' 
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '24px' }}>{plan.icon}</span>
                    <h3 style={{ margin: 0, color: '#e2e8f0', fontSize: '18px' }}>{plan.name}</h3>
                  </div>
                  <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: '13px' }}>{plan.description}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '28px', fontWeight: '800', margin: 0, color: includeCPA ? '#a78bfa' : '#10b981' }}>
                    {includeCPA ? `$${totalWithCPA.toFixed(2)}` : '$0.00'}
                  </p>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0' }}>
                    {includeCPA ? 'with CPA' : 'self-file'}
                  </p>
                </div>
              </div>

              {/* Free Badge */}
              {!includeCPA && (
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                  <span style={{ padding: '4px 10px', backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#10b981', borderRadius: '20px', fontSize: '11px', fontWeight: '600' }}>✓ Free this year</span>
                </div>
              )}

              {/* Include State Toggle */}
              <div style={{ marginBottom: '16px', padding: '14px 16px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ color: '#e2e8f0', fontWeight: '500' }}>Include State Return?</span>
                    <span style={{ color: '#64748b', fontSize: '12px', marginLeft: '8px' }}>
                      {includeCPA ? `(+$${CPA_FEE_PER_FORM} CPA fee)` : '(+$0.00)'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => setIncludeState(false)} style={{ ...styles.toggleBtn, ...(includeState ? {} : styles.toggleBtnActive) }}>No</button>
                    <button onClick={() => setIncludeState(true)} style={{ ...styles.toggleBtn, ...(includeState ? styles.toggleBtnActive : {}) }}>Yes</button>
                  </div>
                </div>
              </div>

              {/* Plan Selection Grid - Shows original price with discount */}
              <p style={{ color: '#94a3b8', marginBottom: '12px', fontSize: '14px' }}>Select your plan (all plans FREE this year!):</p>
              <div style={styles.plansGrid6}>
                {Object.values(PLANS).map(p => (
                  <div
                    key={p.id}
                    onClick={() => setSelectedPlan(p.id)}
                    style={{
                      ...styles.planSelectCard,
                      border: selectedPlan === p.id ? '2px solid #7c3aed' : '2px solid rgba(255,255,255,0.1)',
                      backgroundColor: selectedPlan === p.id ? 'rgba(124, 58, 237, 0.1)' : 'rgba(255,255,255,0.02)'
                    }}
                  >
                    {selectedPlan === p.id && <span style={styles.checkMark}>✓</span>}
                    <span style={{ fontSize: '20px' }}>{p.icon}</span>
                    <span style={{ color: '#e2e8f0', fontWeight: '600', fontSize: '12px' }}>{p.name}</span>
                    {/* Show original price crossed out, then $0 */}
                    {p.price > 0 ? (
                      <div style={{ textAlign: 'center' }}>
                        <span style={{ color: '#64748b', fontSize: '11px', textDecoration: 'line-through' }}>${p.price.toFixed(2)}</span>
                        <span style={{ color: '#10b981', fontSize: '13px', fontWeight: '700', marginLeft: '4px' }}>$0.00</span>
                      </div>
                    ) : (
                      <span style={{ color: '#10b981', fontSize: '13px', fontWeight: '700' }}>$0.00</span>
                    )}
                  </div>
                ))}
              </div>
              
              {/* Discount Banner */}
              <div style={{ 
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(16, 185, 129, 0.05))',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: '8px', 
                padding: '10px 14px', 
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span style={{ fontSize: '18px' }}>🎉</span>
                <span style={{ color: '#10b981', fontSize: '13px', fontWeight: '500' }}>
                  <strong>Limited Time:</strong> All plans discounted to $0 for self-file this tax season!
                </span>
              </div>

              {/* CPA Toggle */}
              <div style={{ marginTop: '20px', marginBottom: '16px' }}>
                <p style={{ color: '#94a3b8', marginBottom: '12px', fontSize: '14px' }}>Want a CPA to review and file for you?</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  {/* Self-File Option */}
                  <div
                    onClick={() => setIncludeCPA(false)}
                    style={{
                      padding: '16px', borderRadius: '12px', cursor: 'pointer', textAlign: 'center',
                      border: !includeCPA ? '2px solid #10b981' : '2px solid rgba(255,255,255,0.1)',
                      backgroundColor: !includeCPA ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255,255,255,0.02)'
                    }}
                  >
                    <span style={{ fontSize: '28px', display: 'block', marginBottom: '8px' }}>📄</span>
                    <p style={{ margin: 0, fontWeight: '600', color: '#e2e8f0', fontSize: '14px' }}>Self-File</p>
                    <p style={{ margin: '4px 0', fontSize: '24px', fontWeight: '800', color: '#10b981' }}>FREE</p>
                    <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>Download PDF, print & mail</p>
                    {!includeCPA && <p style={{ margin: '8px 0 0', color: '#10b981', fontSize: '12px', fontWeight: '600' }}>✓ Selected</p>}
                  </div>

                  {/* CPA Option */}
                  <div
                    onClick={() => setIncludeCPA(true)}
                    style={{
                      padding: '16px', borderRadius: '12px', cursor: 'pointer', textAlign: 'center', position: 'relative',
                      border: includeCPA ? '2px solid #7c3aed' : '2px solid rgba(255,255,255,0.1)',
                      backgroundColor: includeCPA ? 'rgba(124, 58, 237, 0.1)' : 'rgba(255,255,255,0.02)'
                    }}
                  >
                    <div style={{ position: 'absolute', top: '-8px', right: '12px', backgroundColor: '#7c3aed', color: 'white', padding: '2px 8px', borderRadius: '10px', fontSize: '9px', fontWeight: '700' }}>RECOMMENDED</div>
                    <span style={{ fontSize: '28px', display: 'block', marginBottom: '8px' }}>👨‍💼</span>
                    <p style={{ margin: 0, fontWeight: '600', color: '#e2e8f0', fontSize: '14px' }}>CPA Review</p>
                    <p style={{ margin: '4px 0', fontSize: '24px', fontWeight: '800', color: '#a78bfa' }}>${totalWithCPA.toFixed(2)}</p>
                    <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>CPA reviews, signs & files</p>
                    {includeCPA && <p style={{ margin: '8px 0 0', color: '#a78bfa', fontSize: '12px', fontWeight: '600' }}>✓ Selected</p>}
                  </div>
                </div>
              </div>

              {/* Price Breakdown - Shows original price and discount clearly */}
              <div style={styles.totalBox}>
                {/* Plan Price Row */}
                <div style={styles.priceRow}>
                  <span>{plan.name} Plan</span>
                  <span>
                    {plan.price > 0 ? (
                      <span style={{ textDecoration: 'line-through', color: '#64748b' }}>${plan.price.toFixed(2)}</span>
                    ) : (
                      <span>$0.00</span>
                    )}
                  </span>
                </div>
                
                {/* Discount Row - Only show if plan has price and not CPA */}
                {!includeCPA && plan.price > 0 && (
                  <div style={{ ...styles.priceRow, color: '#10b981' }}>
                    <span>🎉 This Year's Discount</span>
                    <span>-${plan.price.toFixed(2)}</span>
                  </div>
                )}
                
                {/* CPA Fees - Only show if CPA selected */}
                {includeCPA && (
                  <>
                    <div style={styles.priceRow}>
                      <span>CPA Fee - Federal Form</span>
                      <span>${CPA_FEE_PER_FORM.toFixed(2)}</span>
                    </div>
                    {includeState && (
                      <div style={styles.priceRow}>
                        <span>CPA Fee - State Form</span>
                        <span>${CPA_FEE_PER_FORM.toFixed(2)}</span>
                      </div>
                    )}
                  </>
                )}
                
                {/* Total */}
                <div style={styles.totalFinal}>
                  <span>Total</span>
                  <span style={{ ...styles.totalAmount, color: includeCPA ? '#a78bfa' : '#10b981' }}>
                    {includeCPA ? `$${totalWithCPA.toFixed(2)}` : '$0.00'}
                  </span>
                </div>
                
                {/* Savings message */}
                {!includeCPA && plan.price > 0 && (
                  <div style={{ textAlign: 'center', marginTop: '8px' }}>
                    <span style={{ color: '#10b981', fontSize: '12px', fontWeight: '500' }}>
                      ✓ You save ${plan.price.toFixed(2)} with this year's promotion!
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 6: Download / Upload */}
          {step === 6 && (
            <div>
              {!includeCPA ? (
                // FREE PLAN - Download and Mail Instructions
                <>
                  <h3 style={styles.sectionTitle}>📥 Download Your Tax Return</h3>
                  
                  {/* Download Button */}
                  <div style={{
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    border: '2px solid rgba(16, 185, 129, 0.3)',
                    borderRadius: '16px',
                    padding: '24px',
                    textAlign: 'center',
                    marginBottom: '20px'
                  }}>
                    <p style={{ color: '#e2e8f0', marginBottom: '16px' }}>
                      Your Form 1040 is ready to download
                    </p>
                    <button
                      onClick={downloadForm1040}
                      disabled={downloadingPdf}
                      style={{
                        padding: '16px 40px',
                        fontSize: '18px',
                        fontWeight: '700',
                        backgroundColor: pdfGenerated ? '#059669' : '#10b981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        cursor: downloadingPdf ? 'wait' : 'pointer',
                        opacity: downloadingPdf ? 0.7 : 1
                      }}
                    >
                      {downloadingPdf ? '⏳ Generating...' : pdfGenerated ? '✓ Download Again' : '📥 Download Form 1040 PDF'}
                    </button>
                    {pdfGenerated && (
                      <p style={{ color: '#10b981', marginTop: '12px', fontSize: '14px' }}>
                        ✅ PDF downloaded successfully!
                      </p>
                    )}
                  </div>

                  {/* Mailing Instructions */}
                  <div style={styles.infoCard}>
                    <h4 style={{ ...styles.infoTitle, marginBottom: '16px' }}>📮 How to File by Mail</h4>
                    
                    <div style={{ marginBottom: '16px' }}>
                      <p style={{ color: '#e2e8f0', fontWeight: '600', marginBottom: '8px' }}>Step 1: Print Your Return</p>
                      <p style={{ color: '#94a3b8', fontSize: '14px', margin: 0 }}>
                        Print all pages of the downloaded Form 1040 PDF
                      </p>
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                      <p style={{ color: '#e2e8f0', fontWeight: '600', marginBottom: '8px' }}>Step 2: Sign & Date</p>
                      <p style={{ color: '#94a3b8', fontSize: '14px', margin: 0 }}>
                        Sign and date the return on Page 2 (both spouses if filing jointly)
                      </p>
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                      <p style={{ color: '#e2e8f0', fontWeight: '600', marginBottom: '8px' }}>Step 3: Attach Documents</p>
                      <p style={{ color: '#94a3b8', fontSize: '14px', margin: 0 }}>
                        Attach your W-2(s) and any 1099s showing tax withheld
                      </p>
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                      <p style={{ color: '#e2e8f0', fontWeight: '600', marginBottom: '8px' }}>Step 4: Mail to IRS</p>
                      <div style={{
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        borderRadius: '8px',
                        padding: '12px',
                        marginTop: '8px'
                      }}>
                        <p style={{ color: '#60a5fa', fontSize: '14px', margin: '0 0 8px', fontWeight: '600' }}>
                          {totalNet >= 0 ? '📬 If expecting a REFUND, mail to:' : '📬 If you OWE taxes, mail to:'}
                        </p>
                        <p style={{ color: '#e2e8f0', fontSize: '14px', margin: 0, fontFamily: 'monospace' }}>
                          {totalNet >= 0 ? (
                            <>
                              Department of the Treasury<br />
                              Internal Revenue Service<br />
                              Fresno, CA 93888-0002
                            </>
                          ) : (
                            <>
                              Internal Revenue Service<br />
                              P.O. Box 802501<br />
                              Cincinnati, OH 45280-2501
                            </>
                          )}
                        </p>
                      </div>
                    </div>

                    <div style={{
                      backgroundColor: 'rgba(245, 158, 11, 0.1)',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                      borderRadius: '8px',
                      padding: '12px',
                      marginTop: '16px'
                    }}>
                      <p style={{ color: '#fbbf24', fontSize: '13px', margin: 0 }}>
                        ⚠️ <strong>Deadline:</strong> Mail your return by April 15, 2026 to avoid penalties.
                        Keep a copy for your records!
                      </p>
                    </div>
                  </div>

                  {/* California State Return Info */}
                  <div style={styles.infoCard}>
                    <h4 style={{ ...styles.infoTitle, marginBottom: '12px' }}>🐻 California Form 540</h4>
                    <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '12px' }}>
                      You'll also need to file California Form 540. Download your filled form:
                    </p>
                    <button
                      onClick={handleDownloadCA540}
                      disabled={downloadingCA540}
                      style={{
                        padding: '10px 20px',
                        backgroundColor: downloadingCA540 ? 'rgba(100, 100, 100, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                        color: downloadingCA540 ? '#94a3b8' : '#fbbf24',
                        border: '1px solid rgba(245, 158, 11, 0.3)',
                        borderRadius: '8px',
                        cursor: downloadingCA540 ? 'not-allowed' : 'pointer',
                        fontSize: '14px'
                      }}
                    >
                      {downloadingCA540 ? '⏳ Generating...' : '📄 Get CA Form 540'}
                    </button>
                    <p style={{ color: '#64748b', fontSize: '12px', marginTop: '12px' }}>
                      Mail CA return to: Franchise Tax Board, PO Box 942840, Sacramento, CA 94240-0001
                    </p>
                  </div>
                </>
              ) : (
                // CPA PLAN - Upload Documents
                <>
                  <h3 style={styles.sectionTitle}>📤 Upload Documents for CPA Review</h3>
                  <p style={{ color: '#94a3b8', marginBottom: '20px' }}>
                    Upload your W-2s and 1099s for the CPA to review
                  </p>

                  <div style={{
                    backgroundColor: 'rgba(124, 58, 237, 0.1)',
                    border: '2px dashed rgba(124, 58, 237, 0.4)',
                    borderRadius: '16px',
                    padding: '40px',
                    textAlign: 'center',
                    marginBottom: '20px'
                  }}>
                    <p style={{ fontSize: '48px', margin: '0 0 16px' }}>📁</p>
                    <p style={{ color: '#e2e8f0', marginBottom: '16px' }}>
                      Drag & drop your W-2, 1099 files here
                    </p>
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => setUploadedFiles([...uploadedFiles, ...e.target.files])}
                      style={{ display: 'none' }}
                      id="file-upload"
                    />
                    <label
                      htmlFor="file-upload"
                      style={{
                        padding: '12px 24px',
                        backgroundColor: '#7c3aed',
                        color: 'white',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        display: 'inline-block'
                      }}
                    >
                      Browse Files
                    </label>
                  </div>

                  {uploadedFiles.length > 0 && (
                    <div style={styles.infoCard}>
                      <h4 style={styles.infoTitle}>Uploaded Files ({uploadedFiles.length})</h4>
                      {Array.from(uploadedFiles).map((file, idx) => (
                        <div key={idx} style={{ padding: '8px 0', color: '#e2e8f0', fontSize: '14px' }}>
                          📄 {file.name}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Price Breakdown for CPA */}
                  <div style={styles.totalBox}>
                    <div style={styles.priceRow}>
                      <span>{plan.name} Plan</span>
                      <span>${plan.price.toFixed(2)}</span>
                    </div>
                    <div style={styles.priceRow}>
                      <span>CPA Fee - Federal</span>
                      <span>${CPA_FEE_PER_FORM.toFixed(2)}</span>
                    </div>
                    {includeState && (
                      <div style={styles.priceRow}>
                        <span>CPA Fee - State</span>
                        <span>${CPA_FEE_PER_FORM.toFixed(2)}</span>
                      </div>
                    )}
                    <div style={styles.totalFinal}>
                      <span>Total Due</span>
                      <span style={{ ...styles.totalAmount, color: '#a78bfa' }}>${totalWithCPA.toFixed(2)}</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <button onClick={step === 1 ? onClose : handleBack} style={styles.backBtn}>
            {step === 1 ? t.buttons.cancel : t.buttons.back}
          </button>
          <button
            onClick={handleNext}
            disabled={
              (step === 1 && !isStep1Complete) ||
              (step === 4 && !isStep4Complete) ||
              validating
            }
            style={{
              ...styles.nextBtn,
              opacity: (
                (step === 1 && !isStep1Complete) ||
                (step === 4 && !isStep4Complete) ||
                validating
              ) ? 0.5 : 1,
              backgroundColor: step === 6 
                ? (includeCPA ? '#7c3aed' : '#10b981')
                : step === 5
                  ? (includeCPA ? '#7c3aed' : '#10b981')
                  : '#7c3aed'
            }}
          >
            {validating ? 'Validating...' : 
              step === 5 
                ? (includeCPA ? `Continue - $${totalWithCPA.toFixed(2)}` : 'Continue Free')
                : step === 6 
                  ? (includeCPA 
                      ? `Pay $${totalWithCPA.toFixed(2)}`
                      : (pdfGenerated ? 'Done' : 'Download First'))
                  : t.buttons.continue
            }
          </button>
        </div>

        {/* Edit Modal */}
        {editingSection && (
          <div style={styles.modalOverlay}>
            <div style={styles.editModal}>
              <h3 style={{ margin: '0 0 16px', color: '#e2e8f0' }}>Edit Information</h3>
              <div style={styles.editForm}>
                {editingSection === 'taxpayer' && (
                  <>
                    <div style={styles.formRow}>
                      <label style={styles.formLabel}>First Name</label>
                      <input type="text" value={editFormData.first_name || ''} onChange={(e) => setEditFormData({ ...editFormData, first_name: e.target.value })} style={styles.formInput} />
                    </div>
                    <div style={styles.formRow}>
                      <label style={styles.formLabel}>Last Name</label>
                      <input type="text" value={editFormData.last_name || ''} onChange={(e) => setEditFormData({ ...editFormData, last_name: e.target.value })} style={styles.formInput} />
                    </div>
                    <div style={styles.formRow}>
                      <label style={styles.formLabel}>SSN</label>
                      <input type="text" value={editFormData.ssn || ''} onChange={(e) => setEditFormData({ ...editFormData, ssn: e.target.value.replace(/\D/g, '').slice(0, 9) })} placeholder="XXX-XX-XXXX" style={styles.formInput} />
                    </div>
                    <div style={styles.formRow}>
                      <label style={styles.formLabel}>Address</label>
                      <input type="text" value={editFormData.address || ''} onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })} style={styles.formInput} />
                    </div>
                    <div style={styles.formRowGrid}>
                      <div>
                        <label style={styles.formLabel}>City</label>
                        <input type="text" value={editFormData.city || ''} onChange={(e) => setEditFormData({ ...editFormData, city: e.target.value })} style={styles.formInput} />
                      </div>
                      <div>
                        <label style={styles.formLabel}>State</label>
                        <input type="text" value={editFormData.state || ''} onChange={(e) => setEditFormData({ ...editFormData, state: e.target.value })} maxLength={2} style={styles.formInput} />
                      </div>
                      <div>
                        <label style={styles.formLabel}>ZIP</label>
                        <input type="text" value={editFormData.zip || ''} onChange={(e) => setEditFormData({ ...editFormData, zip: e.target.value })} style={styles.formInput} />
                      </div>
                    </div>
                    <div style={styles.formRow}>
                      <label style={styles.formLabel}>Filing Status</label>
                      <select value={editFormData.filing_status || ''} onChange={(e) => setEditFormData({ ...editFormData, filing_status: e.target.value })} style={styles.formInput}>
                        <option value="">Select...</option>
                        <option value="single">Single</option>
                        <option value="married_filing_jointly">Married Filing Jointly</option>
                        <option value="married_filing_separately">Married Filing Separately</option>
                        <option value="head_of_household">Head of Household</option>
                      </select>
                    </div>
                  </>
                )}
                {editingSection === 'spouse' && (
                  <>
                    <div style={styles.formRow}>
                      <label style={styles.formLabel}>Spouse First Name</label>
                      <input type="text" value={editFormData.spouse_first_name || ''} onChange={(e) => setEditFormData({ ...editFormData, spouse_first_name: e.target.value })} style={styles.formInput} />
                    </div>
                    <div style={styles.formRow}>
                      <label style={styles.formLabel}>Spouse Last Name</label>
                      <input type="text" value={editFormData.spouse_last_name || ''} onChange={(e) => setEditFormData({ ...editFormData, spouse_last_name: e.target.value })} style={styles.formInput} />
                    </div>
                    <div style={styles.formRow}>
                      <label style={styles.formLabel}>Spouse SSN</label>
                      <input type="text" value={editFormData.spouse_ssn || ''} onChange={(e) => setEditFormData({ ...editFormData, spouse_ssn: e.target.value.replace(/\D/g, '').slice(0, 9) })} placeholder="XXX-XX-XXXX" style={styles.formInput} />
                    </div>
                  </>
                )}
              </div>
              <div style={styles.editModalButtons}>
                <button onClick={() => setEditingSection(null)} style={styles.cancelBtn}>Cancel</button>
                <button onClick={saveEdit} style={styles.saveBtn}>Save</button>
              </div>
            </div>
          </div>
        )}

        {/* Dependent Edit Modal */}
        {editingDependent !== null && (
          <div style={styles.modalOverlay}>
            <div style={styles.editModal}>
              <h3 style={{ color: '#e2e8f0', marginBottom: '20px', marginTop: 0 }}>
                {editingDependent === 'new' ? '➕ Add Dependent' : '✏️ Edit Dependent'}
              </h3>
              <div style={styles.editForm}>
                <div style={styles.formRowGrid}>
                  <div>
                    <label style={styles.formLabel}>First Name *</label>
                    <input type="text" value={dependentFormData.first_name} onChange={(e) => setDependentFormData({ ...dependentFormData, first_name: e.target.value })} style={styles.formInput} placeholder="Child's first name" />
                  </div>
                  <div>
                    <label style={styles.formLabel}>Last Name *</label>
                    <input type="text" value={dependentFormData.last_name} onChange={(e) => setDependentFormData({ ...dependentFormData, last_name: e.target.value })} style={styles.formInput} placeholder="Child's last name" />
                  </div>
                  <div>
                    <label style={styles.formLabel}>SSN *</label>
                    <input type="text" value={dependentFormData.ssn} onChange={(e) => setDependentFormData({ ...dependentFormData, ssn: e.target.value.replace(/\D/g, '').slice(0, 9) })} placeholder="XXX-XX-XXXX" style={styles.formInput} maxLength={9} />
                  </div>
                </div>
                <div style={styles.formRowGrid}>
                  <div>
                    <label style={styles.formLabel}>Relationship</label>
                    <select value={dependentFormData.relationship} onChange={(e) => setDependentFormData({ ...dependentFormData, relationship: e.target.value })} style={styles.formInput}>
                      <option value="child">Child</option>
                      <option value="stepchild">Stepchild</option>
                      <option value="foster_child">Foster Child</option>
                      <option value="grandchild">Grandchild</option>
                      <option value="sibling">Sibling</option>
                      <option value="parent">Parent</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label style={styles.formLabel}>Date of Birth</label>
                    <input type="date" value={dependentFormData.date_of_birth} onChange={(e) => setDependentFormData({ ...dependentFormData, date_of_birth: e.target.value })} style={styles.formInput} />
                  </div>
                  <div>
                    <label style={styles.formLabel}>Months Lived</label>
                    <select value={dependentFormData.months_lived} onChange={(e) => setDependentFormData({ ...dependentFormData, months_lived: parseInt(e.target.value) })} style={styles.formInput}>
                      {[...Array(13)].map((_, i) => (<option key={i} value={i}>{i} months</option>))}
                    </select>
                  </div>
                </div>
                <div style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', borderRadius: '8px', padding: '12px', marginTop: '16px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                  <p style={{ fontSize: '12px', color: '#60a5fa', margin: 0 }}>
                    ℹ️ A qualifying child must have a valid SSN, live with you for more than half the year, and be under age 17 at year end to claim the Child Tax Credit.
                  </p>
                </div>
              </div>
              <div style={styles.editModalButtons}>
                <button onClick={() => setEditingDependent(null)} style={styles.cancelBtn}>Cancel</button>
                <button
                  onClick={saveDependent}
                  disabled={!dependentFormData.first_name || !dependentFormData.last_name || !dependentFormData.ssn}
                  style={{
                    ...styles.saveBtn,
                    opacity: (!dependentFormData.first_name || !dependentFormData.last_name || !dependentFormData.ssn) ? 0.5 : 1
                  }}
                >
                  {editingDependent === 'new' ? 'Add Dependent' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PaymentFlow Modal (for CPA plan) */}
        {showPaymentFlow && finalTaxData && (
          <PaymentFlow
            taxData={finalTaxData}
            userData={userData}
            onClose={() => setShowPaymentFlow(false)}
            onComplete={(result) => {
              console.log('[SUBMITFLOW] Payment completed:', result);
              setShowPaymentFlow(false);
              onClose?.();
            }}
          />
        )}
      </div>
    </div>
  );
}

// ============================================================
// STYLES
// ============================================================
const styles = {
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' },
  modal: { backgroundColor: '#0f172a', borderRadius: '20px', width: '100%', maxWidth: '600px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 50px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.06)' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)', color: 'white' },
  headerTitle: { margin: 0, fontSize: '20px', fontWeight: '700' },
  headerSubtitle: { margin: '4px 0 0', opacity: 0.9, fontSize: '14px' },
  closeBtn: { background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', width: '36px', height: '36px', borderRadius: '50%', fontSize: '24px', cursor: 'pointer' },
  stepIndicator: { display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', backgroundColor: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)', flexWrap: 'wrap', gap: '4px' },
  stepItem: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' },
  stepCircle: { width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '600', fontSize: '14px' },
  stepLabel: { fontSize: '10px', fontWeight: '500' },
  stepLine: { width: '20px', height: '3px', margin: '0 4px', borderRadius: '2px', marginBottom: '16px' },
  content: { padding: '24px', overflowY: 'auto', flex: 1, backgroundColor: '#0f172a' },
  loadingBox: { textAlign: 'center', padding: '60px' },
  spinner: { width: '40px', height: '40px', border: '4px solid rgba(255,255,255,0.1)', borderTopColor: '#7c3aed', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' },
  sectionTitle: { marginTop: 0, marginBottom: '16px', color: '#e2e8f0', fontSize: '18px', fontWeight: '700' },
  
  infoCard: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '16px', marginBottom: '16px', border: '1px solid rgba(255,255,255,0.06)' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' },
  infoTitle: { margin: 0, color: '#e2e8f0', fontSize: '14px', fontWeight: '600' },
  infoGrid: { display: 'grid', gap: '8px' },
  infoRow: { display: 'flex', justifyContent: 'space-between', fontSize: '14px' },
  infoLabel: { color: '#94a3b8' },
  infoValue: { fontWeight: '500', color: '#e2e8f0' },
  editBtn: { padding: '4px 12px', backgroundColor: '#7c3aed', color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' },
  smallEditBtn: { padding: '4px 10px', backgroundColor: 'rgba(124, 58, 237, 0.2)', color: '#a78bfa', border: '1px solid rgba(124, 58, 237, 0.3)', borderRadius: '6px', fontSize: '11px', cursor: 'pointer' },
  smallDeleteBtn: { padding: '4px 10px', backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '6px', fontSize: '11px', cursor: 'pointer' },
  taxCreditBox: { marginTop: '12px', padding: '10px 12px', backgroundColor: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)' },
  warningBox: { backgroundColor: 'rgba(245, 158, 11, 0.15)', border: '2px solid rgba(245, 158, 11, 0.4)', borderRadius: '12px', padding: '16px', marginBottom: '20px' },
  checkboxLabel: { display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13px', color: '#94a3b8', cursor: 'pointer', marginTop: '16px' },
  checkbox: { width: '18px', height: '18px', cursor: 'pointer', marginTop: '2px', accentColor: '#7c3aed' },
  
  dataCard: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '16px', marginBottom: '16px', border: '1px solid rgba(255,255,255,0.06)' },
  dataTitle: { margin: '0 0 12px', color: '#e2e8f0', fontSize: '14px', fontWeight: '700' },
  dataRow: { display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#94a3b8', padding: '6px 0' },
  dataValue: { fontWeight: '500', color: '#e2e8f0' },
  totalRow: { borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '10px', marginTop: '6px' },
  
  refundCard: { borderRadius: '16px', padding: '24px', textAlign: 'center', border: '3px solid', marginBottom: '16px' },
  
  signatureBox: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '20px', border: '1px solid rgba(255,255,255,0.06)' },
  inputLabel: { display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '6px', color: '#e2e8f0' },
  signatureInput: { width: '100%', padding: '10px 14px', fontSize: '15px', border: '2px solid rgba(255,255,255,0.1)', borderRadius: '8px', boxSizing: 'border-box', backgroundColor: 'rgba(255,255,255,0.05)', color: '#e2e8f0' },
  
  // NEW: Plan selection grid for 6 plans
  plansGrid6: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '16px' },
  planSelectCard: { padding: '12px 8px', borderRadius: '10px', cursor: 'pointer', textAlign: 'center', position: 'relative', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' },
  checkMark: { position: 'absolute', top: '4px', right: '4px', backgroundColor: '#7c3aed', color: 'white', width: '16px', height: '16px', borderRadius: '50%', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  
  // Toggle buttons
  toggleBtn: { padding: '8px 16px', backgroundColor: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '500', transition: 'all 0.2s' },
  toggleBtnActive: { backgroundColor: 'rgba(124, 58, 237, 0.2)', color: '#a78bfa', borderColor: 'rgba(124, 58, 237, 0.4)' },
  
  // Price rows
  priceRow: { display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#94a3b8', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' },
  
  totalBox: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '14px 16px', border: '1px solid rgba(255,255,255,0.1)', marginTop: '16px' },
  totalRow2: { display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px', color: '#94a3b8' },
  totalFinal: { display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: '600', color: '#e2e8f0', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.1)' },
  totalAmount: { color: '#10b981', fontSize: '20px', fontWeight: '800' },
  
  footer: { display: 'flex', justifyContent: 'space-between', padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.06)', backgroundColor: 'rgba(255,255,255,0.02)' },
  backBtn: { padding: '10px 20px', fontSize: '14px', fontWeight: '500', backgroundColor: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '2px solid rgba(255,255,255,0.1)', borderRadius: '10px', cursor: 'pointer' },
  nextBtn: { padding: '10px 24px', fontSize: '14px', fontWeight: '600', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer' },
  
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 },
  editModal: { backgroundColor: '#0f172a', borderRadius: '16px', padding: '24px', width: '90%', maxWidth: '450px', maxHeight: '80vh', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.1)' },
  editForm: { marginBottom: '20px' },
  formRow: { marginBottom: '14px' },
  formRowGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '14px' },
  formLabel: { color: '#e2e8f0', fontSize: '13px', fontWeight: '500', display: 'block', marginBottom: '4px' },
  formInput: { width: '100%', padding: '10px 12px', fontSize: '14px', border: '2px solid rgba(255,255,255,0.1)', borderRadius: '8px', boxSizing: 'border-box', marginTop: '4px', backgroundColor: 'rgba(255,255,255,0.05)', color: '#e2e8f0' },
  editModalButtons: { display: 'flex', gap: '10px', justifyContent: 'flex-end' },
  cancelBtn: { padding: '10px 20px', backgroundColor: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', cursor: 'pointer', fontWeight: '500' },
  saveBtn: { padding: '10px 20px', backgroundColor: '#7c3aed', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' },
};