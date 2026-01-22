// ============================================================
// SUBMIT FLOW - v4.1 FIXED - INTEGRATES WITH PAYMENT FLOW
// ============================================================
// Step 1: Review Info - Verify personal data from form1040
// Step 2: Income & Deductions - Review calculated amounts  
// Step 3: Tax Summary - See refund/owed
// Step 4: Confirm & Sign - E-signature
// Step 5: Choose Plan - Standard ($49) or Premium+CPA ($99)
// Step 6: Upload Docs - W-2s, 1099s (required for CPA)
// → Then navigate to PaymentFlow for checkout
// ============================================================

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import PaymentFlow from './PaymentFlow';

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";
const PYTHON_API = import.meta.env.VITE_PYTHON_API || "http://localhost:5002";

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
      uploadDocs: "Upload"
    },
    buttons: { cancel: "Cancel", back: "Back", continue: "Continue", proceedToPayment: "Proceed to Payment" }
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
      uploadDocs: "Tải Lên"
    },
    buttons: { cancel: "Hủy", back: "Quay Lại", continue: "Tiếp", proceedToPayment: "Thanh Toán" }
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
      uploadDocs: "Subir"
    },
    buttons: { cancel: "Cancelar", back: "Atrás", continue: "Continuar", proceedToPayment: "Pagar" }
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
  
  // Step 4 state
  const [signature, setSignature] = useState('');
  const [spouseSignature, setSpouseSignature] = useState('');
  const [agreedTerms, setAgreedTerms] = useState(false);
  
  // Step 5 state
  const [selectedPlan, setSelectedPlan] = useState('standard');
  
  // Step 6 state
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  const STEPS = [
    { num: 1, title: t.steps.reviewInfo, icon: '📋' },
    { num: 2, title: t.steps.verifyIncome, icon: '💵' },
    { num: 3, title: t.steps.checkRefund, icon: '🔍' },
    { num: 4, title: t.steps.confirmSign, icon: '✍️' },
    { num: 5, title: t.steps.choosePlan, icon: '💳' },
    { num: 6, title: t.steps.uploadDocs, icon: '📤' },
  ];

  // Load data on mount
  useEffect(() => { loadData(); }, []);

  async function loadData() {
    if (!userId) { setLoading(false); return; }
    try {
      // 1. Get user data from Node.js API
      let baseUserData = {};
      let baseDependents = [];
      try {
        const userRes = await fetch(`${API_BASE}/api/tax/user/${userId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (userRes.ok) {
          const data = await userRes.json();
          baseUserData = data.user || data || {};
          baseDependents = data.dependents || data.user?.dependents || [];
        }
      } catch (e) { console.log('[SUBMITFLOW] No user data from Node.js'); }

      // 2. Get form1040 from Python API
      let form1040 = null;
      try {
        const pythonRes = await fetch(`${PYTHON_API}/api/extract/json/${userId}?tax_year=2025`);
        const pythonData = await pythonRes.json();
        if (pythonData.success && pythonData.form1040) {
          form1040 = pythonData.form1040;
          setForm1040Data(form1040);
        }
      } catch (e) { console.log('[SUBMITFLOW] Python API not available'); }

      // 3. Fallback to taxData prop
      if (!form1040 && taxData?.form1040) {
        form1040 = taxData.form1040;
        setForm1040Data(form1040);
      }

      // 4. Merge data from form1040.header
      const header = form1040?.header || {};
      let spouseFirstName = baseUserData.spouse_first_name || '';
      let spouseLastName = baseUserData.spouse_last_name || '';
      if (!spouseFirstName && header.spouse_name) {
        const parts = header.spouse_name.trim().split(/\s+/);
        spouseFirstName = parts[0] || '';
        spouseLastName = parts.slice(1).join(' ') || '';
      }
      
      const mergedUserData = {
        filing_status: header.filing_status || baseUserData.filing_status || 'single',
        state: header.state || baseUserData.state || 'CA',
        taxpayer_dob: header.taxpayer_dob || baseUserData.taxpayer_dob || '',
        taxpayer_age: header.taxpayer_age || baseUserData.taxpayer_age || 0,
        spouse_name: header.spouse_name || baseUserData.spouse_name || '',
        spouse_dob: header.spouse_dob || baseUserData.spouse_dob || '',
        spouse_age: header.spouse_age || baseUserData.spouse_age || 0,
        first_name: baseUserData.first_name || header.first_name || '',
        last_name: baseUserData.last_name || header.last_name || '',
        ssn: baseUserData.ssn || '',
        address: baseUserData.address || '',
        city: baseUserData.city || '',
        zip: baseUserData.zip || '',
        spouse_first_name: spouseFirstName,
        spouse_last_name: spouseLastName,
        spouse_ssn: baseUserData.spouse_ssn || '',
      };

      setUserData(mergedUserData);
      setDependents(baseDependents);

      // 5. Set income data from form1040
      if (form1040) {
        const income = form1040.income || {};
        const adjustments = form1040.adjustments || {};
        const deductions = form1040.deductions || {};
        const taxCredits = form1040.tax_and_credits || {};
        const payments = form1040.payments || {};
        const refundSection = form1040.refund || {};
        const amountOwedSection = form1040.amount_owed || {};
        
        setIncomeData({
          wages: income.line_1a_w2_wages || income.line_1_wages || taxData?.wages || 0,
          totalIncome: income.line_9_total_income || taxData?.totalIncome || 0,
          agi: adjustments.line_11_agi || taxData?.agi || 0,
          standardDeduction: deductions.line_12_deduction || taxData?.standardDeduction || 0,
          taxableIncome: deductions.line_15_taxable_income || taxData?.taxableIncome || 0,
          federalTax: taxCredits.line_16_tax || taxData?.federalTax || 0,
          withholding: payments.line_25d_total_withholding || taxData?.withholding || 0,
          federalRefund: refundSection.line_35a_refund || taxData?.federalRefund || 0,
          federalOwed: amountOwedSection.line_37_amount_owed || taxData?.federalOwed || 0,
          caAgi: taxData?.caAgi || adjustments.line_11_agi || 0,
          caWithholding: taxData?.caWithholding || 0,
          stateRefund: taxData?.stateRefund || 0,
          stateOwed: taxData?.stateOwed || 0,
          eitc: taxData?.eitc || payments?.line_27_eic || 0,
          actc: taxData?.actc || payments?.line_28_actc || 0,
        });
      } else if (taxData) {
        setIncomeData(taxData);
      }

    } catch (error) { console.error('[SUBMITFLOW] Error:', error); }
    finally { setLoading(false); }
  }

  // Validation
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
          age: d.age || 0
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
      console.error('[SUBMITFLOW] Validation error:', error);
      return localValidation();
    } finally {
      setValidating(false);
    }
    return false;
  }

  function localValidation() {
    const missing = [];
    const isMFJ = userData?.filing_status === 'married_filing_jointly';
    if (!userData?.first_name) missing.push({ key: 'first_name', label: 'First Name' });
    if (!userData?.last_name) missing.push({ key: 'last_name', label: 'Last Name' });
    if (!userData?.ssn) missing.push({ key: 'ssn', label: 'SSN' });
    if (!userData?.address) missing.push({ key: 'address', label: 'Address' });
    if (!userData?.city) missing.push({ key: 'city', label: 'City' });
    if (!userData?.state) missing.push({ key: 'state', label: 'State' });
    if (!userData?.zip) missing.push({ key: 'zip', label: 'ZIP' });
    if (isMFJ) {
      if (!userData?.spouse_first_name) missing.push({ key: 'spouse_first_name', label: 'Spouse First Name' });
      if (!userData?.spouse_ssn) missing.push({ key: 'spouse_ssn', label: 'Spouse SSN' });
    }
    setPythonMissing(missing);
    return missing.length === 0;
  }

  useEffect(() => {
    if (!loading && userData && Object.keys(userData).length > 0) {
      validateWithPython();
    }
  }, [loading]);

  // Helper functions
  const fmt = (num) => '$' + Math.abs(Math.round(num || 0)).toLocaleString();
  const maskSSN = (ssn) => !ssn ? '___-__-____' : '***-**-' + String(ssn).replace(/\D/g, '').slice(-4);
  const getFilingStatusDisplay = (status) => {
    const map = {
      single: 'Single',
      married_filing_jointly: 'Married Filing Jointly',
      married_filing_separately: 'Married Filing Separately',
      head_of_household: 'Head of Household',
      qualifying_surviving_spouse: 'Qualifying Surviving Spouse'
    };
    return map[status] || status || 'Not Selected';
  };

  const isMFJ = userData?.filing_status === 'married_filing_jointly';
  const isStep1Complete = pythonMissing.length === 0 && confirmedInfo;

  // Calculate totals
  const wages = incomeData?.wages || 0;
  const agi = incomeData?.agi || wages;
  const taxableIncome = incomeData?.taxableIncome || 0;
  const federalTax = incomeData?.federalTax || 0;
  const withholding = incomeData?.withholding || 0;
  const federalRefund = incomeData?.federalRefund || 0;
  const federalOwed = incomeData?.federalOwed || 0;
  const federalNet = federalRefund > 0 ? federalRefund : -federalOwed;
  const caWithholding = incomeData?.caWithholding || 0;
  const stateRefund = incomeData?.stateRefund || 0;
  const stateOwed = incomeData?.stateOwed || 0;
  const stateNet = stateRefund > 0 ? stateRefund : -stateOwed;
  const totalNet = federalNet + stateNet;

  // File upload handlers
  async function handleFileUpload(files) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setUploadError(null);
    
    for (const file of files) {
      try {
        if (file.size > 10 * 1024 * 1024) {
          setUploadError(`${file.name} is too large (max 10MB)`);
          continue;
        }
        
        let formType = 'Other';
        const fileName = file.name.toLowerCase();
        if (fileName.includes('w-2') || fileName.includes('w2')) formType = 'W-2';
        else if (fileName.includes('1099')) formType = '1099';
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('userId', userId);
        formData.append('formType', formType);
        
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
            formType,
            size: file.size,
            status: 'uploaded'
          }]);
        }
      } catch (err) {
        setUploadError(`Error uploading ${file.name}`);
      }
    }
    setUploading(false);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragActive(false);
    handleFileUpload(Array.from(e.dataTransfer?.files || []));
  }

  // Navigation
  function handleNext() {
    if (step === 1 && !isStep1Complete) {
      alert('Please complete all required fields and confirm.');
      return;
    }
    if (step === 4 && !signature) {
      alert('Please sign your name.');
      return;
    }
    if (step === 4 && isMFJ && !spouseSignature) {
      alert('Please have your spouse sign.');
      return;
    }
    if (step === 4 && !agreedTerms) {
      alert('Please agree to the terms.');
      return;
    }
    
    if (step === 6) {
      // Final step - proceed to payment
      handleProceedToPayment();
    } else {
      setStep(step + 1);
    }
  }

  function handleBack() {
    if (step > 1) setStep(step - 1);
  }

  // State for showing PaymentFlow modal
  const [showPaymentFlow, setShowPaymentFlow] = useState(false);
  const [finalTaxData, setFinalTaxData] = useState(null);

  // Proceed to PaymentFlow
  async function handleProceedToPayment() {
    try {
      // Build final tax data
      const taxDataForPayment = {
        // Personal info
        firstName: userData?.first_name,
        lastName: userData?.last_name,
        fullName: `${userData?.first_name || ''} ${userData?.last_name || ''}`.trim(),
        address: `${userData?.address || ''}, ${userData?.city || ''}, ${userData?.state || ''} ${userData?.zip || ''}`,
        filingStatus: userData?.filing_status,
        dependents: dependents.length,
        
        // Income
        wages,
        totalIncome: incomeData?.totalIncome || wages,
        agi,
        taxableIncome,
        
        // Tax
        federalTax,
        withholding,
        federalRefund,
        federalOwed,
        stateRefund,
        stateOwed,
        totalRefund: totalNet > 0 ? totalNet : 0,
        totalOwed: totalNet < 0 ? Math.abs(totalNet) : 0,
        
        // Form counts for pricing
        w2Count: uploadedFiles.filter(f => f.formType === 'W-2').length || 1,
        form1099Count: uploadedFiles.filter(f => f.formType.includes('1099')).length,
        
        // Metadata
        taxYear: 2025,
        signature,
        spouseSignature: isMFJ ? spouseSignature : null,
        uploadedDocuments: uploadedFiles,
        selectedPlan,
        
        // Completed steps
        completedSteps: {
          interview: true,
          income: true,
          deductions: true,
          review: true,
        },
      };

      // Generate checksum
      const checksumPayload = {
        taxYear: taxDataForPayment.taxYear,
        filingStatus: taxDataForPayment.filingStatus,
        agi: taxDataForPayment.agi,
        taxableIncome: taxDataForPayment.taxableIncome,
        federalRefund: taxDataForPayment.federalRefund,
        federalOwed: taxDataForPayment.federalOwed,
      };
      const checksum = await generateChecksum(checksumPayload);

      // Freeze session
      const frozenTaxSession = {
        ...taxDataForPayment,
        checksum,
        status: 'READY_FOR_PAYMENT',
        lockedAt: new Date().toISOString(),
      };

      // Save to localStorage
      localStorage.setItem('taxsky_final_tax', JSON.stringify(frozenTaxSession));

      // Set final data and show PaymentFlow
      setFinalTaxData(frozenTaxSession);
      setShowPaymentFlow(true);

    } catch (error) {
      console.error('[SUBMITFLOW] Error proceeding to payment:', error);
      alert('Error preparing payment. Please try again.');
    }
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
                Please verify all information matches your tax documents
              </p>

              {validating && (
                <div style={{ ...styles.infoBox, backgroundColor: 'rgba(59, 130, 246, 0.15)', borderColor: 'rgba(59, 130, 246, 0.4)' }}>
                  <p style={{ margin: 0, color: '#60a5fa' }}>🔄 Validating...</p>
                </div>
              )}

              {pythonMissing.length > 0 && !validating && (
                <div style={styles.warningBox}>
                  <h4 style={{ margin: '0 0 8px', color: '#fbbf24' }}>⚠️ Missing Information</h4>
                  <ul style={{ margin: 0, paddingLeft: '20px' }}>
                    {pythonMissing.slice(0, 5).map((f, i) => (
                      <li key={i} style={{ color: '#fcd34d', fontSize: '13px' }}>• {f.label}</li>
                    ))}
                  </ul>
                  <p style={{ color: '#fbbf24', fontSize: '12px', marginTop: '8px' }}>
                    Click Edit to complete required fields
                  </p>
                </div>
              )}

              {/* Taxpayer Info Card */}
              <div style={styles.infoCard}>
                <div style={styles.cardHeader}>
                  <h4 style={styles.infoTitle}>Your Information</h4>
                  <button onClick={() => openEditModal('taxpayer')} style={styles.editBtn}>Edit</button>
                </div>
                <div style={styles.infoGrid}>
                  <div style={styles.infoRow}>
                    <span style={styles.infoLabel}>Name:</span>
                    <span style={{ ...styles.infoValue, color: (!userData?.first_name || !userData?.last_name) ? '#ef4444' : '#e2e8f0' }}>
                      {userData?.first_name || '___'} {userData?.last_name || '___'}
                    </span>
                  </div>
                  <div style={styles.infoRow}>
                    <span style={styles.infoLabel}>SSN:</span>
                    <span style={{ ...styles.infoValue, color: !userData?.ssn ? '#ef4444' : '#e2e8f0' }}>
                      {maskSSN(userData?.ssn)}
                    </span>
                  </div>
                  <div style={styles.infoRow}>
                    <span style={styles.infoLabel}>Address:</span>
                    <span style={styles.infoValue}>{userData?.address || '___'}</span>
                  </div>
                  <div style={styles.infoRow}>
                    <span style={styles.infoLabel}>City, State ZIP:</span>
                    <span style={styles.infoValue}>
                      {userData?.city || '___'}, {userData?.state || '__'} {userData?.zip || '_____'}
                    </span>
                  </div>
                  <div style={styles.infoRow}>
                    <span style={styles.infoLabel}>Filing Status:</span>
                    <span style={{ ...styles.infoValue, color: !userData?.filing_status ? '#ef4444' : '#e2e8f0' }}>
                      {getFilingStatusDisplay(userData?.filing_status)}
                    </span>
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
                      <span style={{ ...styles.infoValue, color: !userData?.spouse_first_name ? '#ef4444' : '#e2e8f0' }}>
                        {userData?.spouse_first_name || '___'} {userData?.spouse_last_name || '___'}
                      </span>
                    </div>
                    <div style={styles.infoRow}>
                      <span style={styles.infoLabel}>SSN:</span>
                      <span style={{ ...styles.infoValue, color: !userData?.spouse_ssn ? '#ef4444' : '#e2e8f0' }}>
                        {maskSSN(userData?.spouse_ssn)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Dependents */}
              {dependents.length > 0 && (
                <div style={styles.infoCard}>
                  <h4 style={styles.infoTitle}>Dependents ({dependents.length})</h4>
                  {dependents.map((dep, idx) => (
                    <div key={idx} style={styles.dependentRow}>
                      <span>#{idx + 1} {dep.first_name} {dep.last_name}</span>
                      <span style={{ color: '#94a3b8' }}>{dep.relationship}</span>
                    </div>
                  ))}
                </div>
              )}

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
                <div style={styles.dataRow}>
                  <span>Total Income</span>
                  <span style={styles.dataValue}>{fmt(incomeData?.totalIncome || wages)}</span>
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
                  <span style={{ color: '#10b981' }}>-{fmt(incomeData?.standardDeduction)}</span>
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
                  <span>State Withheld</span>
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
                  fontSize: '40px',
                  fontWeight: '800',
                  margin: '8px 0',
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
                    <p style={{ fontSize: '12px', color: '#94a3b8' }}>State</p>
                    <p style={{ fontWeight: '700', color: stateNet >= 0 ? '#10b981' : '#f87171' }}>
                      {stateNet >= 0 ? '+' : '-'}{fmt(Math.abs(stateNet))}
                    </p>
                  </div>
                </div>
              </div>

              {/* Federal Details */}
              <div style={{ ...styles.dataCard, borderLeft: '4px solid #3b82f6' }}>
                <h4 style={{ ...styles.dataTitle, color: '#60a5fa' }}>Federal Tax</h4>
                <div style={styles.dataRow}>
                  <span>Taxable Income</span>
                  <span>{fmt(taxableIncome)}</span>
                </div>
                <div style={styles.dataRow}>
                  <span>Tax</span>
                  <span>{fmt(federalTax)}</span>
                </div>
                <div style={styles.dataRow}>
                  <span>Withholding</span>
                  <span style={{ color: '#3b82f6' }}>+{fmt(withholding)}</span>
                </div>
                <div style={{ ...styles.dataRow, ...styles.totalRow }}>
                  <span>{federalNet >= 0 ? 'Federal Refund' : 'Federal Owed'}</span>
                  <span style={{ color: federalNet >= 0 ? '#10b981' : '#f87171', fontSize: '18px' }}>
                    {fmt(Math.abs(federalNet))}
                  </span>
                </div>
              </div>

              {/* State Details */}
              <div style={{ ...styles.dataCard, borderLeft: '4px solid #f59e0b' }}>
                <h4 style={{ ...styles.dataTitle, color: '#fbbf24' }}>California Tax</h4>
                <div style={styles.dataRow}>
                  <span>CA Withholding</span>
                  <span style={{ color: '#3b82f6' }}>+{fmt(caWithholding)}</span>
                </div>
                <div style={{ ...styles.dataRow, ...styles.totalRow }}>
                  <span>{stateNet >= 0 ? 'State Refund' : 'State Owed'}</span>
                  <span style={{ color: stateNet >= 0 ? '#10b981' : '#f87171', fontSize: '18px' }}>
                    {fmt(Math.abs(stateNet))}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Confirm & Sign */}
          {step === 4 && (
            <div>
              <h3 style={styles.sectionTitle}>✍️ Confirm & Sign</h3>
              
              <div style={styles.signatureBox}>
                <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: '1.6', marginBottom: '20px' }}>
                  Under penalties of perjury, I declare that I have examined this return and accompanying 
                  schedules and statements, and to the best of my knowledge and belief, they are true, 
                  correct, and complete.
                </p>

                <div style={{ marginBottom: '16px' }}>
                  <label style={styles.inputLabel}>Your Signature</label>
                  <input
                    type="text"
                    value={signature}
                    onChange={(e) => setSignature(e.target.value)}
                    placeholder={`${userData?.first_name || ''} ${userData?.last_name || ''}`}
                    style={styles.signatureInput}
                  />
                </div>

                {isMFJ && (
                  <div style={{ marginBottom: '16px' }}>
                    <label style={styles.inputLabel}>Spouse Signature</label>
                    <input
                      type="text"
                      value={spouseSignature}
                      onChange={(e) => setSpouseSignature(e.target.value)}
                      placeholder={`${userData?.spouse_first_name || ''} ${userData?.spouse_last_name || ''}`}
                      style={styles.signatureInput}
                    />
                  </div>
                )}

                <div style={{ marginBottom: '16px' }}>
                  <label style={styles.inputLabel}>Date</label>
                  <input
                    type="text"
                    value={new Date().toLocaleDateString()}
                    readOnly
                    style={{ ...styles.signatureInput, backgroundColor: 'rgba(255,255,255,0.02)' }}
                  />
                </div>

                <label style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={agreedTerms}
                    onChange={(e) => setAgreedTerms(e.target.checked)}
                    style={styles.checkbox}
                  />
                  <span>I agree to the terms and authorize electronic filing</span>
                </label>
              </div>
            </div>
          )}

          {/* STEP 5: Choose Plan */}
          {step === 5 && (
            <div>
              <h3 style={styles.sectionTitle}>💳 Choose Your Plan</h3>
              <p style={{ color: '#94a3b8', marginBottom: '20px' }}>Select how you want to file your return</p>

              <div style={styles.plansGrid}>
                {/* Standard Plan */}
                <div
                  style={{
                    ...styles.planCard,
                    border: selectedPlan === 'standard' ? '3px solid #3b82f6' : '2px solid rgba(255,255,255,0.1)',
                    backgroundColor: selectedPlan === 'standard' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255,255,255,0.03)'
                  }}
                  onClick={() => setSelectedPlan('standard')}
                >
                  <div style={styles.planHeader}>
                    <span style={{ fontSize: '32px' }}>📋</span>
                    <h4 style={styles.planName}>Standard E-File</h4>
                  </div>
                  <p style={styles.planPrice}>$49</p>
                  <ul style={styles.planFeatures}>
                    <li>✓ Federal Return</li>
                    <li>✓ California State Return</li>
                    <li>✓ E-File to IRS & FTB</li>
                    <li>✓ Download PDF</li>
                  </ul>
                  {selectedPlan === 'standard' && <div style={styles.selectedBadge}>✓ Selected</div>}
                </div>

                {/* Premium Plan */}
                <div
                  style={{
                    ...styles.planCard,
                    border: selectedPlan === 'premium' ? '3px solid #7c3aed' : '2px solid rgba(255,255,255,0.1)',
                    backgroundColor: selectedPlan === 'premium' ? 'rgba(124, 58, 237, 0.1)' : 'rgba(255,255,255,0.03)'
                  }}
                  onClick={() => setSelectedPlan('premium')}
                >
                  <div style={styles.recommendedBadge}>RECOMMENDED</div>
                  <div style={styles.planHeader}>
                    <span style={{ fontSize: '32px' }}>⭐</span>
                    <h4 style={styles.planName}>Premium + CPA</h4>
                  </div>
                  <p style={styles.planPrice}>$99</p>
                  <ul style={styles.planFeatures}>
                    <li>✓ All Standard Features</li>
                    <li>✓ <strong style={{ color: '#a78bfa' }}>CPA Review</strong></li>
                    <li>✓ Audit Protection</li>
                    <li>✓ Priority Support</li>
                  </ul>
                  {selectedPlan === 'premium' && <div style={styles.selectedBadge}>✓ Selected</div>}
                </div>
              </div>

              {/* Plan info */}
              <div style={{
                backgroundColor: selectedPlan === 'premium' ? 'rgba(124, 58, 237, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                borderRadius: '12px',
                padding: '16px',
                border: selectedPlan === 'premium' ? '1px solid rgba(124, 58, 237, 0.3)' : '1px solid rgba(59, 130, 246, 0.3)'
              }}>
                <p style={{ margin: 0, color: '#e2e8f0', fontSize: '14px' }}>
                  {selectedPlan === 'premium'
                    ? '📄 Next: Upload your W-2s and 1099s for CPA review'
                    : '📄 Next: Upload your tax documents (optional)'}
                </p>
              </div>

              {/* Total */}
              <div style={styles.totalBox}>
                <div style={styles.totalRow2}>
                  <span>Selected Plan</span>
                  <span>{selectedPlan === 'premium' ? 'Premium + CPA' : 'Standard E-File'}</span>
                </div>
                <div style={styles.totalFinal}>
                  <span>Total</span>
                  <span style={styles.totalAmount}>{selectedPlan === 'premium' ? '$99' : '$49'}</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 6: Upload Documents */}
          {step === 6 && (
            <div>
              <h3 style={styles.sectionTitle}>
                {selectedPlan === 'premium' ? '📤 Upload Documents for CPA Review' : '📤 Upload Tax Documents'}
              </h3>
              <p style={{ color: '#94a3b8', marginBottom: '20px' }}>
                {selectedPlan === 'premium'
                  ? 'Upload your W-2s, 1099s for CPA review (required)'
                  : 'Upload your tax documents (optional)'}
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
                    ⭐ CPA Review Selected
                  </p>
                  <p style={{ margin: '8px 0 0', color: '#94a3b8', fontSize: '13px' }}>
                    A licensed CPA will review your documents within 24-48 hours.
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
                  marginBottom: '20px'
                }}
                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
                onDrop={handleDrop}
                onClick={() => document.getElementById('file-upload')?.click()}
              >
                <input
                  id="file-upload"
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => handleFileUpload(Array.from(e.target.files || []))}
                  style={{ display: 'none' }}
                />
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>📤</div>
                <p style={{ color: '#e2e8f0', fontWeight: '600', marginBottom: '8px' }}>
                  {uploading ? 'Uploading...' : 'Click or drag files to upload'}
                </p>
                <p style={{ color: '#64748b', fontSize: '13px' }}>
                  PDF, JPG, PNG (max 10MB)
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

              {/* Uploaded Files */}
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ color: '#e2e8f0', marginBottom: '12px', fontSize: '14px' }}>
                  Uploaded Documents ({uploadedFiles.length})
                </h4>
                {uploadedFiles.length === 0 ? (
                  <div style={{
                    backgroundColor: 'rgba(255,255,255,0.03)',
                    borderRadius: '12px',
                    padding: '20px',
                    textAlign: 'center'
                  }}>
                    <p style={{ color: '#64748b', margin: 0 }}>No documents uploaded yet</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {uploadedFiles.map((file, idx) => (
                      <div key={file.id || idx} style={{
                        backgroundColor: 'rgba(255,255,255,0.03)',
                        borderRadius: '12px',
                        padding: '14px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                      }}>
                        <span style={{ fontSize: '24px' }}>
                          {file.formType === 'W-2' ? '📄' : '📋'}
                        </span>
                        <div style={{ flex: 1 }}>
                          <p style={{ margin: 0, color: '#e2e8f0', fontWeight: '500' }}>{file.name}</p>
                          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '12px' }}>
                            {file.formType}
                          </p>
                        </div>
                        <button
                          onClick={() => setUploadedFiles(prev => prev.filter(f => f.id !== file.id))}
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

              {/* Warning if CPA selected but no files */}
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

              {/* Summary */}
              <div style={styles.totalBox}>
                <div style={styles.totalRow2}>
                  <span>Plan</span>
                  <span>{selectedPlan === 'premium' ? 'Premium + CPA' : 'Standard'}</span>
                </div>
                <div style={styles.totalRow2}>
                  <span>Documents</span>
                  <span>{uploadedFiles.length} uploaded</span>
                </div>
                <div style={styles.totalFinal}>
                  <span>Total</span>
                  <span style={styles.totalAmount}>{selectedPlan === 'premium' ? '$99' : '$49'}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <button
            onClick={step === 1 ? onClose : handleBack}
            style={styles.backBtn}
          >
            {step === 1 ? t.buttons.cancel : t.buttons.back}
          </button>
          <button
            onClick={handleNext}
            disabled={(step === 1 && !isStep1Complete) || validating || (step === 6 && selectedPlan === 'premium' && uploadedFiles.length === 0)}
            style={{
              ...styles.nextBtn,
              opacity: ((step === 1 && !isStep1Complete) || validating || (step === 6 && selectedPlan === 'premium' && uploadedFiles.length === 0)) ? 0.5 : 1,
              backgroundColor: step === 6 ? '#10b981' : '#7c3aed'
            }}
          >
            {validating ? 'Validating...' : (step === 6 ? t.buttons.proceedToPayment : t.buttons.continue)}
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
                      <input
                        type="text"
                        value={editFormData.first_name || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, first_name: e.target.value })}
                        style={styles.formInput}
                      />
                    </div>
                    <div style={styles.formRow}>
                      <label style={styles.formLabel}>Last Name</label>
                      <input
                        type="text"
                        value={editFormData.last_name || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, last_name: e.target.value })}
                        style={styles.formInput}
                      />
                    </div>
                    <div style={styles.formRow}>
                      <label style={styles.formLabel}>SSN</label>
                      <input
                        type="text"
                        value={editFormData.ssn || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, ssn: e.target.value.replace(/\D/g, '').slice(0, 9) })}
                        placeholder="XXX-XX-XXXX"
                        style={styles.formInput}
                      />
                    </div>
                    <div style={styles.formRow}>
                      <label style={styles.formLabel}>Address</label>
                      <input
                        type="text"
                        value={editFormData.address || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                        style={styles.formInput}
                      />
                    </div>
                    <div style={styles.formRowGrid}>
                      <div>
                        <label style={styles.formLabel}>City</label>
                        <input type="text" value={editFormData.city || ''} onChange={(e) => setEditFormData({ ...editFormData, city: e.target.value })} style={styles.formInput} />
                      </div>
                      <div>
                        <label style={styles.formLabel}>State</label>
                        <input type="text" value={editFormData.state || ''} onChange={(e) => setEditFormData({ ...editFormData, state: e.target.value })} style={styles.formInput} />
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

        {/* PaymentFlow Modal */}
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
  
  // Info cards
  infoCard: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '16px', marginBottom: '16px', border: '1px solid rgba(255,255,255,0.06)' },
  infoBox: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '16px', marginBottom: '16px', border: '2px solid rgba(255,255,255,0.1)' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' },
  infoTitle: { margin: 0, color: '#e2e8f0', fontSize: '14px', fontWeight: '600' },
  infoGrid: { display: 'grid', gap: '8px' },
  infoRow: { display: 'flex', justifyContent: 'space-between', fontSize: '14px' },
  infoLabel: { color: '#94a3b8' },
  infoValue: { fontWeight: '500', color: '#e2e8f0' },
  editBtn: { padding: '4px 12px', backgroundColor: '#7c3aed', color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' },
  warningBox: { backgroundColor: 'rgba(245, 158, 11, 0.15)', border: '2px solid rgba(245, 158, 11, 0.4)', borderRadius: '12px', padding: '16px', marginBottom: '20px' },
  dependentRow: { display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '14px', color: '#e2e8f0' },
  checkboxLabel: { display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13px', color: '#94a3b8', cursor: 'pointer', marginTop: '16px' },
  checkbox: { width: '18px', height: '18px', cursor: 'pointer', marginTop: '2px', accentColor: '#7c3aed' },
  
  // Data cards
  dataCard: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '16px', marginBottom: '16px', border: '1px solid rgba(255,255,255,0.06)' },
  dataTitle: { margin: '0 0 12px', color: '#e2e8f0', fontSize: '14px', fontWeight: '700' },
  dataRow: { display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#94a3b8', padding: '6px 0' },
  dataValue: { fontWeight: '500', color: '#e2e8f0' },
  totalRow: { borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '10px', marginTop: '6px' },
  
  // Refund card
  refundCard: { borderRadius: '16px', padding: '24px', textAlign: 'center', border: '3px solid', marginBottom: '16px' },
  
  // Signature
  signatureBox: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '20px', border: '1px solid rgba(255,255,255,0.06)' },
  inputLabel: { display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '6px', color: '#e2e8f0' },
  signatureInput: { width: '100%', padding: '10px 14px', fontSize: '15px', border: '2px solid rgba(255,255,255,0.1)', borderRadius: '8px', boxSizing: 'border-box', backgroundColor: 'rgba(255,255,255,0.05)', color: '#e2e8f0' },
  
  // Plans
  plansGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' },
  planCard: { borderRadius: '12px', padding: '16px', cursor: 'pointer', transition: 'all 0.2s', position: 'relative' },
  planHeader: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' },
  planName: { margin: 0, fontSize: '14px', fontWeight: '600', color: '#e2e8f0' },
  planPrice: { fontSize: '28px', fontWeight: '800', marginBottom: '10px', color: '#e2e8f0' },
  planFeatures: { listStyle: 'none', padding: 0, margin: 0, fontSize: '12px', color: '#94a3b8' },
  recommendedBadge: { position: 'absolute', top: '-8px', right: '12px', backgroundColor: '#7c3aed', color: 'white', padding: '3px 10px', borderRadius: '10px', fontSize: '9px', fontWeight: '700' },
  selectedBadge: { marginTop: '12px', textAlign: 'center', color: '#10b981', fontWeight: '600', fontSize: '13px' },
  
  // Total box
  totalBox: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '14px 16px', border: '1px solid rgba(255,255,255,0.1)', marginTop: '16px' },
  totalRow2: { display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px', color: '#94a3b8' },
  totalFinal: { display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: '600', color: '#e2e8f0', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.1)' },
  totalAmount: { color: '#10b981', fontSize: '20px', fontWeight: '800' },
  
  // Footer
  footer: { display: 'flex', justifyContent: 'space-between', padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.06)', backgroundColor: 'rgba(255,255,255,0.02)' },
  backBtn: { padding: '10px 20px', fontSize: '14px', fontWeight: '500', backgroundColor: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '2px solid rgba(255,255,255,0.1)', borderRadius: '10px', cursor: 'pointer' },
  nextBtn: { padding: '10px 24px', fontSize: '14px', fontWeight: '600', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer' },
  
  // Edit modal
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 },
  editModal: { backgroundColor: '#0f172a', borderRadius: '16px', padding: '24px', width: '90%', maxWidth: '450px', maxHeight: '80vh', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.1)' },
  editForm: { marginBottom: '20px' },
  formRow: { marginBottom: '14px' },
  formRowGrid: { display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '10px', marginBottom: '14px' },
  formLabel: { color: '#e2e8f0', fontSize: '13px', fontWeight: '500', display: 'block', marginBottom: '4px' },
  formInput: { width: '100%', padding: '10px 12px', fontSize: '14px', border: '2px solid rgba(255,255,255,0.1)', borderRadius: '8px', boxSizing: 'border-box', marginTop: '4px', backgroundColor: 'rgba(255,255,255,0.05)', color: '#e2e8f0' },
  editModalButtons: { display: 'flex', gap: '10px', justifyContent: 'flex-end' },
  cancelBtn: { padding: '10px 20px', backgroundColor: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', cursor: 'pointer', fontWeight: '500' },
  saveBtn: { padding: '10px 20px', backgroundColor: '#7c3aed', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' },
};