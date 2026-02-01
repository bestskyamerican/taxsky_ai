// ============================================================
// SUBMIT FLOW - v14.0 FULL SUMMARY + AI DATA LOADING
// ============================================================
// Location: src/components/SubmitFlow.jsx
//
// ✅ v14.0: 
//    - Fixed loadData to fetch from /api/ai/data (Node.js AI session)
//    - Full Tax Summary with Federal + State breakdown
//    - Shows AGI, deductions, taxable income details
//    - Total refund/owed calculation
//
// ✅ v13.0: Fixed pricing - Self-file is FREE for both Federal AND State
// ✅ v12.0: Support ALL 50 US States + DC
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import PaymentFlow from './PaymentFlow';

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5001";
const PYTHON_API = import.meta.env.VITE_PYTHON_API || "http://localhost:5002";

const CPA_FEE_PER_FORM = 59;
const STATE_FILING_PRICE = 19.99;

// ============================================================
// STATE FORM CONFIG - ALL 50 STATES + DC
// ============================================================
const STATE_FORM_CONFIG = {
  "AL": { endpoint: "al-40", form: "40", name: "Alabama" },
  "AR": { endpoint: "ar-ar1000f", form: "AR1000F", name: "Arkansas" },
  "AZ": { endpoint: "az-140", form: "140", name: "Arizona" },
  "CA": { endpoint: "ca540", form: "540", name: "California" },
  "CO": { endpoint: "co-104", form: "104", name: "Colorado" },
  "CT": { endpoint: "ct-1040", form: "CT-1040", name: "Connecticut" },
  "DC": { endpoint: "dc-d40", form: "D-40", name: "Washington DC" },
  "DE": { endpoint: "de-200", form: "200-01", name: "Delaware" },
  "GA": { endpoint: "ga-500", form: "500", name: "Georgia" },
  "HI": { endpoint: "hi-n11", form: "N-11", name: "Hawaii" },
  "IA": { endpoint: "ia-1040", form: "IA 1040", name: "Iowa" },
  "ID": { endpoint: "id-40", form: "40", name: "Idaho" },
  "IL": { endpoint: "il-1040", form: "IL-1040", name: "Illinois" },
  "IN": { endpoint: "in-it40", form: "IT-40", name: "Indiana" },
  "KS": { endpoint: "ks-k40", form: "K-40", name: "Kansas" },
  "KY": { endpoint: "ky-740", form: "740", name: "Kentucky" },
  "LA": { endpoint: "la-it540", form: "IT-540", name: "Louisiana" },
  "MA": { endpoint: "ma-1", form: "1", name: "Massachusetts" },
  "MD": { endpoint: "md-502", form: "502", name: "Maryland" },
  "ME": { endpoint: "me-1040", form: "1040ME", name: "Maine" },
  "MI": { endpoint: "mi-1040", form: "MI-1040", name: "Michigan" },
  "MN": { endpoint: "mn-m1", form: "M1", name: "Minnesota" },
  "MO": { endpoint: "mo-1040", form: "MO-1040", name: "Missouri" },
  "MS": { endpoint: "ms-80105", form: "80-105", name: "Mississippi" },
  "MT": { endpoint: "mt-2", form: "2", name: "Montana" },
  "NC": { endpoint: "nc-d400", form: "D-400", name: "North Carolina" },
  "ND": { endpoint: "nd-1", form: "ND-1", name: "North Dakota" },
  "NE": { endpoint: "ne-1040n", form: "1040N", name: "Nebraska" },
  "NJ": { endpoint: "nj-1040", form: "NJ-1040", name: "New Jersey" },
  "NM": { endpoint: "nm-pit1", form: "PIT-1", name: "New Mexico" },
  "NY": { endpoint: "ny-it201", form: "IT-201", name: "New York" },
  "OH": { endpoint: "oh-it1040", form: "IT 1040", name: "Ohio" },
  "OK": { endpoint: "ok-511", form: "511", name: "Oklahoma" },
  "OR": { endpoint: "or-40", form: "40", name: "Oregon" },
  "PA": { endpoint: "pa-40", form: "PA-40", name: "Pennsylvania" },
  "RI": { endpoint: "ri-1040", form: "RI-1040", name: "Rhode Island" },
  "SC": { endpoint: "sc-1040", form: "SC1040", name: "South Carolina" },
  "UT": { endpoint: "ut-tc40", form: "TC-40", name: "Utah" },
  "VA": { endpoint: "va-760", form: "760", name: "Virginia" },
  "VT": { endpoint: "vt-in111", form: "IN-111", name: "Vermont" },
  "WI": { endpoint: "wi-1", form: "1", name: "Wisconsin" },
  "WV": { endpoint: "wv-it140", form: "IT-140", name: "West Virginia" },
};

const NO_TAX_STATES = ["AK", "FL", "NV", "NH", "SD", "TN", "TX", "WA", "WY"];

const getStateConfig = (code) => STATE_FORM_CONFIG[code] || null;
const isNoTaxState = (code) => NO_TAX_STATES.includes(code);
const getStateName = (code) => STATE_FORM_CONFIG[code]?.name || code;

const PLANS = {
  free: { id: 'free', name: 'Free Estimate', price: 0, icon: '🆓', description: 'View estimate only' },
  basic: { id: 'basic', name: 'Basic', price: 29.99, icon: '📄', description: 'Simple W-2' },
  standard: { id: 'standard', name: 'Standard', price: 49.99, icon: '⭐', description: 'Most popular', popular: true },
  plus: { id: 'plus', name: 'Plus', price: 79.99, icon: '💎', description: 'Multiple income' },
};

const FILING_STATUS_OPTIONS = [
  { value: 'single', label: 'Single' },
  { value: 'married_filing_jointly', label: 'Married Filing Jointly' },
  { value: 'married_filing_separately', label: 'Married Filing Separately' },
  { value: 'head_of_household', label: 'Head of Household' },
  { value: 'qualifying_surviving_spouse', label: 'Qualifying Surviving Spouse' },
];

// ============================================================
// SECURE SSN INPUT COMPONENT
// ============================================================
const SecureSSNInput = ({ value = '', onChange, onBlur, placeholder = "•••-••-••••", disabled = false, error = null, label = "Social Security Number", required = true, inputStyle = {} }) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showFull, setShowFull] = useState(false);
  
  const formatSSN = (ssn) => {
    if (!ssn) return '';
    const cleaned = ssn.replace(/\D/g, '').slice(0, 9);
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 5) return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 5)}-${cleaned.slice(5)}`;
  };
  
  const maskSSN = (ssn) => {
    if (!ssn) return '';
    const cleaned = ssn.replace(/\D/g, '');
    if (cleaned.length < 4) return '•••-••-••••';
    return `•••-••-${cleaned.slice(-4)}`;
  };
  
  const handleChange = useCallback((e) => {
    const cleaned = e.target.value.replace(/\D/g, '').slice(0, 9);
    onChange(cleaned);
  }, [onChange]);
  
  const getDisplayValue = () => {
    if (!value) return '';
    if (showFull || isFocused) return formatSSN(value);
    return maskSSN(value);
  };
  
  const isComplete = value && value.replace(/\D/g, '').length === 9;
  
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={ssnStyles.label}>
        <span>{label} {required && <span style={{ color: '#ef4444' }}>*</span>}</span>
        <span style={ssnStyles.securityBadge}>🔒 Secure</span>
      </label>
      <div style={ssnStyles.inputWrapper}>
        <input type={showFull ? "text" : "password"} inputMode="numeric" value={getDisplayValue()} onChange={handleChange} onFocus={() => setIsFocused(true)} onBlur={(e) => { setIsFocused(false); setShowFull(false); onBlur?.(e); }} placeholder={placeholder} disabled={disabled} autoComplete="off" style={{ ...ssnStyles.input, ...inputStyle, borderColor: error ? '#ef4444' : isComplete ? '#10b981' : isFocused ? '#7c3aed' : 'rgba(255,255,255,0.1)' }} />
        <button type="button" onClick={(e) => { e.preventDefault(); setShowFull(!showFull); }} style={ssnStyles.toggleBtn} tabIndex={-1}>{showFull ? '🙈' : '👁️'}</button>
        {isComplete && <span style={ssnStyles.validIcon}>✓</span>}
      </div>
      {error && <p style={ssnStyles.errorText}>{error}</p>}
    </div>
  );
};

const ssnStyles = {
  label: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, fontWeight: 500, marginBottom: 6, color: '#94a3b8' },
  securityBadge: { fontSize: 11, color: '#10b981', background: 'rgba(16, 185, 129, 0.15)', padding: '3px 8px', borderRadius: 4, fontWeight: 600 },
  inputWrapper: { position: 'relative', display: 'flex', alignItems: 'center' },
  input: { width: '100%', padding: '12px 70px 12px 14px', fontSize: 16, fontFamily: 'monospace', letterSpacing: 2, border: '2px solid rgba(255,255,255,0.1)', borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.05)', color: '#e2e8f0', boxSizing: 'border-box', outline: 'none' },
  toggleBtn: { position: 'absolute', right: 36, background: 'none', border: 'none', cursor: 'pointer', padding: 6, fontSize: 16 },
  validIcon: { position: 'absolute', right: 12, color: '#10b981', fontSize: 16, fontWeight: 'bold' },
  errorText: { marginTop: 4, fontSize: 12, color: '#ef4444' },
};

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function SubmitFlow({ onClose, taxData, userData: initialUserData, userId, token }) {
  const navigate = useNavigate();
  const { language } = useLanguage?.() || { language: 'en' };

  const STEPS = [
    { num: 1, title: 'Info', icon: '📝' },
    { num: 2, title: 'Income', icon: '💵' },
    { num: 3, title: 'Review', icon: '🔍' },
    { num: 4, title: 'Sign', icon: '✍️' },
    { num: 5, title: 'Plan', icon: '📋' },
    { num: 6, title: 'Download', icon: '📥' },
  ];

  // State
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(initialUserData || {});
  const [dependents, setDependents] = useState([]);
  const [incomeData, setIncomeData] = useState(taxData || {});
  const [form1040Data, setForm1040Data] = useState(null);
  const [editTab, setEditTab] = useState('personal');
  const [missingFields, setMissingFields] = useState([]);
  const [dependentMissing, setDependentMissing] = useState([]);
  const [saveStatus, setSaveStatus] = useState('');
  const [isReadyToFile, setIsReadyToFile] = useState(false);
  
  // Dependent editing
  const [editingDependent, setEditingDependent] = useState(null);
  const [dependentFormData, setDependentFormData] = useState({ first_name: '', last_name: '', ssn: '', relationship: 'child', date_of_birth: '', months_lived: 12 });
  
  // Sign
  const [signature, setSignature] = useState('');
  const [spouseSignature, setSpouseSignature] = useState('');
  const [agreedTerms, setAgreedTerms] = useState(false);
  
  // Plan Selection
  const [selectedPlan, setSelectedPlan] = useState('free');
  const [includeCPA, setIncludeCPA] = useState(false);
  const [includeState, setIncludeState] = useState(true);
  
  // Download
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingState, setDownloadingState] = useState(false);
  const [pdfGenerated, setPdfGenerated] = useState(false);
  const [stateGenerated, setStateGenerated] = useState(false);
  const [showPaymentFlow, setShowPaymentFlow] = useState(false);

  // Get user's state
  const userState = userData?.state || 'CA';
  const userStateConfig = getStateConfig(userState);
  const userStateName = getStateName(userState);
  const userStateIsNoTax = isNoTaxState(userState);

  // ============================================================
  // ✅ PRICING CALCULATION - TWO SERVICE TYPES
  // ============================================================
  const plan = PLANS[selectedPlan] || PLANS.free;
  const statePrice = (includeState && !userStateIsNoTax) ? STATE_FILING_PRICE : 0;
  const formCount = (includeState && !userStateIsNoTax) ? 2 : 1;
  
  // CPA fees: $59 per form
  const cpaFederalFee = CPA_FEE_PER_FORM;
  const cpaStateFee = (includeState && !userStateIsNoTax) ? CPA_FEE_PER_FORM : 0;
  const cpaTotalFee = cpaFederalFee + cpaStateFee;
  
  // ✅ SELF-FILE = $0 FREE (100% discount)
  // ✅ CPA = Plan + State + CPA Fees
  const totalPrice = includeCPA ? (plan.price + statePrice + cpaTotalFee) : 0;
  
  // Original value (for showing savings)
  const originalValue = plan.price + statePrice;

  // ============================================================
  // LOAD DATA
  // ============================================================
  useEffect(() => { loadData(); }, []);

  async function loadData() {
    if (!userId) { setLoading(false); return; }
    try {
      let baseUserData = initialUserData || {};
      let baseDependents = [];
      
      // ✅ PRIORITY 1: Get user data from Node.js AI session (where answers are stored)
      try {
        const aiDataRes = await fetch(`${API_BASE}/api/ai/data/${userId}?taxYear=2025`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (aiDataRes.ok) {
          const aiData = await aiDataRes.json();
          console.log('[SUBMITFLOW] AI session data:', aiData);
          
          if (aiData.success && aiData.answers) {
            const answers = aiData.answers || {};
            baseUserData = {
              ...baseUserData,
              first_name: answers.first_name || answers.taxpayer_first_name || baseUserData.first_name || '',
              last_name: answers.last_name || answers.taxpayer_last_name || baseUserData.last_name || '',
              ssn: answers.ssn || answers.taxpayer_ssn || baseUserData.ssn || '',
              address: answers.address || answers.street_address || baseUserData.address || '',
              city: answers.city || baseUserData.city || '',
              state: answers.state || baseUserData.state || 'CA',
              zip: answers.zip || answers.zip_code || baseUserData.zip || '',
              filing_status: aiData.filing_status || answers.filing_status || baseUserData.filing_status || 'single',
              spouse_first_name: answers.spouse_first_name || baseUserData.spouse_first_name || '',
              spouse_last_name: answers.spouse_last_name || baseUserData.spouse_last_name || '',
              spouse_ssn: answers.spouse_ssn || baseUserData.spouse_ssn || '',
              occupation: answers.occupation || answers.taxpayer_occupation || '',
              spouse_occupation: answers.spouse_occupation || '',
              phone: answers.phone || '',
              email: answers.email || '',
            };
            
            if (aiData.dependents && aiData.dependents.length > 0) {
              baseDependents = aiData.dependents;
            }
          }
        }
      } catch (e) { console.log('[SUBMITFLOW] AI data fetch error:', e); }
      
      // ✅ PRIORITY 2: Get missing fields from Python API
      try {
        const response = await fetch(`${PYTHON_API}/api/user/${userId}/form1040/missing?tax_year=2025`);
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            // Merge Python data with AI session data
            baseUserData = { ...baseUserData, ...data.current_data };
            if (data.dependents && data.dependents.length > 0) {
              baseDependents = data.dependents;
            }
            const personalMissing = (data.required_missing || []).filter(m => !m.field?.includes('dependent_'));
            const depMissing = (data.required_missing || []).filter(m => m.field?.includes('dependent_'));
            setMissingFields(personalMissing);
            setDependentMissing(depMissing);
            setIsReadyToFile(data.is_ready_to_file || false);
          }
        }
      } catch (e) { console.log('[SUBMITFLOW] Python API error:', e); }
      
      // ✅ Set user data and dependents
      setUserData(baseUserData);
      setDependents(baseDependents);
      console.log('[SUBMITFLOW] Final userData:', baseUserData);
      
      // ✅ Use taxData prop if passed from Dashboard
      if (taxData && Object.keys(taxData).length > 0) {
        setForm1040Data(buildForm1040Data(taxData, baseUserData));
        setIncomeData(taxData);
      }
    } catch (error) { console.error('[SUBMITFLOW] Load error:', error); }
    finally { setLoading(false); }
  }

  function buildForm1040Data(taxData, userData) {
    return {
      header: { tax_year: 2025, filing_status: taxData?.filing_status || userData?.filing_status || 'single' },
      income: { line_1_wages: taxData?.wages || 0, line_2b_taxable_interest: taxData?.interest || 0, line_3b_ordinary_dividends: taxData?.dividends || 0, line_9_total_income: taxData?.totalIncome || taxData?.wages || 0 },
      deductions: { line_12_deduction: taxData?.standardDeduction || 15000, line_15_taxable_income: taxData?.taxableIncome || 0 },
      tax_and_credits: { line_16_tax: taxData?.federalTax || 0, line_19_child_tax_credit: taxData?.childTaxCredit || 0 },
      payments: { line_25a_w2_withholding: taxData?.federalWithholding || 0 },
      refund_or_owe: { line_35_refund: taxData?.federalRefund || 0, line_37_amount_owed: taxData?.federalOwed || 0 }
    };
  }

  function handleFieldChange(field, value) {
    const updated = { ...userData, [field]: value };
    setUserData(updated);
    clearTimeout(window.saveTimeout);
    window.saveTimeout = setTimeout(() => saveUserData({ [field]: value }), 1000);
  }

  async function saveUserData(updateData) {
    setSaveStatus('saving');
    try {
      const response = await fetch(`${PYTHON_API}/api/user/${userId}/form1040/update?tax_year=2025`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updateData) });
      const result = await response.json();
      if (result.success) { setSaveStatus('saved'); setTimeout(() => setSaveStatus(''), 2000); }
      else { setSaveStatus('error'); }
    } catch (e) { setSaveStatus('error'); }
  }

  function maskSSN(ssn) {
    if (!ssn) return '___-__-____';
    const clean = ssn.replace(/\D/g, '');
    return clean.length >= 4 ? `•••-••-${clean.slice(-4)}` : '___-__-____';
  }

  // Dependent Management
  function openDependentModal(index = 'new') {
    setEditingDependent(index);
    if (index === 'new') { setDependentFormData({ first_name: '', last_name: '', ssn: '', relationship: 'child', date_of_birth: '', months_lived: 12 }); }
    else {
      const dep = dependents[index];
      setDependentFormData({ first_name: dep.first_name || dep.name?.split(' ')[0] || '', last_name: dep.last_name || dep.name?.split(' ').slice(1).join(' ') || '', ssn: dep.ssn || '', relationship: dep.relationship || 'child', date_of_birth: dep.date_of_birth || '', months_lived: dep.months_lived || 12 });
    }
  }

  async function saveDependent() {
    const newDep = { ...dependentFormData, ssn: dependentFormData.ssn.replace(/\D/g, ''), name: `${dependentFormData.first_name} ${dependentFormData.last_name}`.trim() };
    const updated = editingDependent === 'new' ? [...dependents, newDep] : dependents.map((d, i) => i === editingDependent ? newDep : d);
    try { await fetch(`${PYTHON_API}/api/user/${userId}/dependents`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dependents: updated }) }); } catch (e) {}
    setDependents(updated);
    setEditingDependent(null);
    loadData();
  }

  async function deleteDependent(index) {
    if (!confirm('Remove this dependent?')) return;
    const updated = dependents.filter((_, i) => i !== index);
    try { await fetch(`${PYTHON_API}/api/user/${userId}/dependents`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dependents: updated }) }); } catch (e) {}
    setDependents(updated);
    loadData();
  }

  // Download Functions
  async function downloadForm1040() {
    setDownloadingPdf(true);
    try {
      const payload = {
        session_id: userId, mask_ssn: false, is_official_submission: true,
        personal: { first_name: userData?.first_name || '', last_name: userData?.last_name || '', ssn: userData?.ssn || '', address: userData?.address || '', city: userData?.city || '', state: userState, zip: userData?.zip || '', filing_status: userData?.filing_status || 'single', spouse_first_name: userData?.spouse_first_name || '', spouse_last_name: userData?.spouse_last_name || '', spouse_ssn: userData?.spouse_ssn || '' },
        dependents: dependents.map(d => ({ first_name: d.first_name || '', last_name: d.last_name || '', ssn: d.ssn || '', relationship: d.relationship || 'child' })),
        form1040: form1040Data
      };
      const response = await fetch(`${PYTHON_API}/generate/1040`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!response.ok) throw new Error('PDF generation failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `Form1040_2025_${userData?.last_name || 'TaxReturn'}.pdf`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      setPdfGenerated(true);
    } catch (error) { console.error('Federal form download error:', error); alert('Error generating Federal PDF. Please try again.'); }
    finally { setDownloadingPdf(false); }
  }

  async function downloadStateForm() {
    if (userStateIsNoTax) { alert(`🎉 ${userStateName} has no state income tax!\n\nYou only need to file your federal return.`); return; }
    if (!userStateConfig) { alert(`State form for ${userState} coming soon!`); return; }
    setDownloadingState(true);
    try {
      const payload = {
        session_id: userId, mask_ssn: false, is_official_submission: true, tax_year: 2025,
        personal: { first_name: userData?.first_name || '', last_name: userData?.last_name || '', ssn: userData?.ssn || '', address: userData?.address || '', city: userData?.city || '', state: userState, zip: userData?.zip || '', spouse_first_name: userData?.spouse_first_name || '', spouse_last_name: userData?.spouse_last_name || '', spouse_ssn: userData?.spouse_ssn || '' },
        federal: { filing_status: userData?.filing_status || 'single', wages: incomeData?.wages || 0, agi: incomeData?.agi || incomeData?.totalIncome || 0 },
        state: { state_agi: incomeData?.agi || incomeData?.totalIncome || 0, withholding: incomeData?.stateWithholding || 0, refund: incomeData?.stateRefund || 0, amount_owed: incomeData?.stateOwed || 0 },
        dependents: dependents.map(d => ({ first_name: d.first_name || '', last_name: d.last_name || '', ssn: d.ssn || '', relationship: d.relationship || 'child' }))
      };
      const response = await fetch(`${PYTHON_API}/generate/${userStateConfig.endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!response.ok) throw new Error('State PDF generation failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `${userState}_Form${userStateConfig.form}_2025_${userData?.last_name || 'TaxReturn'}.pdf`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      setStateGenerated(true);
    } catch (error) { console.error('State form download error:', error); alert(`Error generating ${userStateName} State PDF. Please try again.`); }
    finally { setDownloadingState(false); }
  }

  // Navigation
  const totalMissing = missingFields.length + dependentMissing.length;
  function handleNext() {
    if (step === 1 && totalMissing > 0) { alert(`Please fill in all required fields:\n\n${[...missingFields, ...dependentMissing].map(m => `• ${m.label || m.field}`).join('\n')}`); return; }
    if (step === 6) { onClose(); return; }
    setStep(Math.min(step + 1, 6));
  }
  function handleBack() { setStep(Math.max(step - 1, 1)); }
  function getFieldStyle(fieldName) {
    const isMissing = missingFields.some(m => m.field === fieldName);
    return { ...styles.input, borderColor: isMissing ? '#ef4444' : 'rgba(255,255,255,0.1)', backgroundColor: isMissing ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255,255,255,0.05)' };
  }

  const isMFJ = userData?.filing_status === 'married_filing_jointly';
  const wages = incomeData?.wages || 0;

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        {/* Header */}
        <div style={styles.header}>
          <div><h2 style={styles.headerTitle}>📋 File Your Tax Return</h2><p style={styles.headerSubtitle}>Tax Year 2025</p></div>
          <button onClick={onClose} style={styles.closeBtn}>×</button>
        </div>

        {/* Progress */}
        <div style={styles.stepIndicator}>
          {STEPS.map((s, idx) => (
            <React.Fragment key={s.num}>
              <div style={styles.stepItem}>
                <div style={{ ...styles.stepCircle, backgroundColor: step >= s.num ? '#7c3aed' : 'rgba(255,255,255,0.1)', color: step >= s.num ? 'white' : '#64748b' }}>{step > s.num ? '✓' : s.icon}</div>
                <span style={{ ...styles.stepLabel, color: step >= s.num ? '#e2e8f0' : '#64748b' }}>{s.title}</span>
              </div>
              {idx < STEPS.length - 1 && <div style={{ ...styles.stepLine, backgroundColor: step > s.num ? '#7c3aed' : 'rgba(255,255,255,0.1)' }} />}
            </React.Fragment>
          ))}
        </div>

        {/* Content */}
        <div style={styles.content}>
          {loading ? (
            <div style={styles.loadingBox}><div style={styles.spinner} /><p style={{ color: '#94a3b8' }}>Loading your tax data...</p></div>
          ) : (
            <>
              {/* STEP 1: INFO */}
              {step === 1 && (
                <>
                  {totalMissing > 0 && <div style={styles.alertBox}><strong>⚠️ Missing Fields ({totalMissing}):</strong> {[...missingFields, ...dependentMissing].map(m => m.label || m.field).join(', ')}</div>}
                  {saveStatus && <div style={{ padding: '8px 12px', borderRadius: 8, marginBottom: 12, fontSize: 13, backgroundColor: saveStatus === 'saved' ? 'rgba(16, 185, 129, 0.2)' : saveStatus === 'error' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(124, 58, 237, 0.2)', color: saveStatus === 'saved' ? '#10b981' : saveStatus === 'error' ? '#ef4444' : '#a78bfa' }}>{saveStatus === 'saving' ? '💾 Saving...' : saveStatus === 'saved' ? '✅ Saved!' : '❌ Save failed'}</div>}
                  <div style={styles.tabs}>
                    {['personal', 'spouse', 'dependents'].map(tab => { if (tab === 'spouse' && !isMFJ) return null; return (<button key={tab} onClick={() => setEditTab(tab)} style={{ ...styles.tab, ...(editTab === tab ? styles.tabActive : {}) }}>{tab === 'personal' && '👤 Personal'}{tab === 'spouse' && '👫 Spouse'}{tab === 'dependents' && `👶 Dependents (${dependents.length})`}</button>); })}
                  </div>
                  {editTab === 'personal' && (<div><h3 style={styles.sectionTitle}>👤 Personal Information</h3><div style={styles.formGrid}><div><label style={styles.label}>First Name *</label><input type="text" value={userData.first_name || ''} onChange={e => handleFieldChange('first_name', e.target.value)} style={getFieldStyle('first_name')} /></div><div><label style={styles.label}>Last Name *</label><input type="text" value={userData.last_name || ''} onChange={e => handleFieldChange('last_name', e.target.value)} style={getFieldStyle('last_name')} /></div></div><div style={styles.formGrid}><SecureSSNInput value={userData.ssn || ''} onChange={(val) => handleFieldChange('ssn', val)} label="SSN" inputStyle={getFieldStyle('ssn')} /><div><label style={styles.label}>Filing Status *</label><select value={userData.filing_status || 'single'} onChange={e => handleFieldChange('filing_status', e.target.value)} style={styles.select}>{FILING_STATUS_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}</select></div></div><h3 style={{ ...styles.sectionTitle, marginTop: 24 }}>🏠 Address</h3><div><label style={styles.label}>Street Address *</label><input type="text" value={userData.address || ''} onChange={e => handleFieldChange('address', e.target.value)} style={getFieldStyle('address')} /></div><div style={styles.formGrid}><div><label style={styles.label}>City *</label><input type="text" value={userData.city || ''} onChange={e => handleFieldChange('city', e.target.value)} style={getFieldStyle('city')} /></div><div><label style={styles.label}>State *</label><input type="text" maxLength={2} value={userData.state || ''} onChange={e => handleFieldChange('state', e.target.value.toUpperCase())} style={getFieldStyle('state')} /></div><div><label style={styles.label}>ZIP *</label><input type="text" maxLength={10} value={userData.zip || ''} onChange={e => handleFieldChange('zip', e.target.value)} style={getFieldStyle('zip')} /></div></div></div>)}
                  {editTab === 'spouse' && (<div><h3 style={styles.sectionTitle}>👫 Spouse Information</h3><div style={styles.formGrid}><div><label style={styles.label}>First Name *</label><input type="text" value={userData.spouse_first_name || ''} onChange={e => handleFieldChange('spouse_first_name', e.target.value)} style={getFieldStyle('spouse_first_name')} /></div><div><label style={styles.label}>Last Name *</label><input type="text" value={userData.spouse_last_name || ''} onChange={e => handleFieldChange('spouse_last_name', e.target.value)} style={getFieldStyle('spouse_last_name')} /></div></div><SecureSSNInput value={userData.spouse_ssn || ''} onChange={(val) => handleFieldChange('spouse_ssn', val)} label="Spouse SSN" inputStyle={getFieldStyle('spouse_ssn')} /></div>)}
                  {editTab === 'dependents' && (<div><h3 style={styles.sectionTitle}>👶 Dependents ({dependents.length})</h3>{dependents.length === 0 ? <div style={styles.infoBox}><p style={{ margin: 0 }}>No dependents added yet.</p></div> : dependents.map((dep, i) => (<div key={i} style={styles.dependentCard}><div><div style={{ fontWeight: 600, color: '#e2e8f0' }}>{dep.first_name || dep.name?.split(' ')[0]} {dep.last_name || dep.name?.split(' ').slice(1).join(' ')}</div><div style={{ fontSize: 13, color: '#64748b' }}>{dep.relationship} • SSN: {maskSSN(dep.ssn)}</div></div><div style={{ display: 'flex', gap: 8 }}><button onClick={() => openDependentModal(i)} style={styles.smallBtn}>✏️</button><button onClick={() => deleteDependent(i)} style={{ ...styles.smallBtn, backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#f87171' }}>🗑️</button></div></div>))}<button onClick={() => openDependentModal('new')} style={styles.addBtn}>➕ Add Dependent</button></div>)}
                </>
              )}

              {/* STEP 2: INCOME */}
              {step === 2 && (<div><h3 style={styles.sectionTitle}>💵 Income Summary</h3><div style={styles.dataCard}><div style={styles.dataRow}><span>Total Wages</span><span style={{ color: '#10b981' }}>${Number(wages).toLocaleString()}</span></div><div style={styles.dataRow}><span>Interest Income</span><span>${Number(incomeData?.interest || 0).toLocaleString()}</span></div><div style={styles.dataRow}><span>Dividend Income</span><span>${Number(incomeData?.dividends || 0).toLocaleString()}</span></div><div style={{ ...styles.dataRow, borderTop: '2px solid rgba(255,255,255,0.1)', paddingTop: 12, marginTop: 8, fontWeight: 600 }}><span style={{ color: '#e2e8f0' }}>Total Income</span><span style={{ color: '#10b981' }}>${Number(incomeData?.totalIncome || wages).toLocaleString()}</span></div></div><h3 style={{ ...styles.sectionTitle, marginTop: 24 }}>💳 Withholding</h3><div style={styles.dataCard}><div style={styles.dataRow}><span>Federal Withholding</span><span style={{ color: '#10b981' }}>${Number(incomeData?.federalWithholding || 0).toLocaleString()}</span></div><div style={styles.dataRow}><span>State Withholding ({userState})</span><span style={{ color: '#10b981' }}>${Number(incomeData?.stateWithholding || 0).toLocaleString()}</span></div></div></div>)}

              {/* STEP 3: REVIEW - FULL TAX SUMMARY */}
              {step === 3 && (
                <div>
                  <h3 style={styles.sectionTitle}>🔍 Tax Summary</h3>
                  
                  {/* Personal Info Summary */}
                  <div style={styles.summaryBox}>
                    <div style={styles.summaryRow}><span>Taxpayer</span><span style={{ color: '#e2e8f0' }}>{userData?.first_name || '—'} {userData?.last_name || '—'}</span></div>
                    <div style={styles.summaryRow}><span>Filing Status</span><span style={{ color: '#e2e8f0' }}>{FILING_STATUS_OPTIONS.find(o => o.value === userData?.filing_status)?.label || 'Single'}</span></div>
                    <div style={styles.summaryRow}><span>Dependents</span><span style={{ color: '#e2e8f0' }}>{dependents.length}</span></div>
                    <div style={styles.summaryRow}><span>State</span><span style={{ color: '#e2e8f0' }}>{userStateName} ({userState})</span></div>
                  </div>
                  
                  {/* Federal Tax Breakdown */}
                  <div style={{ ...styles.summaryBox, marginTop: 12 }}>
                    <h4 style={{ margin: '0 0 12px', color: '#3b82f6', fontSize: 14 }}>🇺🇸 Federal Tax Breakdown</h4>
                    <div style={styles.summaryRow}><span>Total Income</span><span style={{ color: '#10b981' }}>${Number(incomeData?.totalIncome || wages).toLocaleString()}</span></div>
                    <div style={styles.summaryRow}><span>Adjustments</span><span style={{ color: '#f59e0b' }}>-${Number(incomeData?.totalAdjustments || 0).toLocaleString()}</span></div>
                    <div style={{ ...styles.summaryRow, fontWeight: 600 }}><span>AGI</span><span style={{ color: '#e2e8f0' }}>${Number(incomeData?.agi || incomeData?.totalIncome || wages).toLocaleString()}</span></div>
                    <div style={styles.summaryRow}><span>Standard Deduction</span><span style={{ color: '#f59e0b' }}>-${Number(incomeData?.standardDeduction || 31500).toLocaleString()}</span></div>
                    <div style={{ ...styles.summaryRow, fontWeight: 600 }}><span>Taxable Income</span><span style={{ color: '#e2e8f0' }}>${Number(incomeData?.taxableIncome || 0).toLocaleString()}</span></div>
                    <div style={{ ...styles.summaryRow, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 8, marginTop: 8 }}><span>Federal Tax</span><span style={{ color: '#ef4444' }}>${Number(incomeData?.federalTax || 0).toLocaleString()}</span></div>
                    <div style={styles.summaryRow}><span>Federal Withheld</span><span style={{ color: '#10b981' }}>+${Number(incomeData?.federalWithholding || 0).toLocaleString()}</span></div>
                  </div>
                  
                  {/* Federal Result Card */}
                  <div style={{ backgroundColor: (incomeData?.federalRefund || 0) > 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)', border: `2px solid ${(incomeData?.federalRefund || 0) > 0 ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`, borderRadius: 12, padding: 16, marginTop: 12, textAlign: 'center' }}>
                    <p style={{ margin: 0, color: '#94a3b8', fontSize: 13 }}>🇺🇸 Federal {(incomeData?.federalRefund || 0) > 0 ? 'Refund' : 'Owed'}</p>
                    <p style={{ margin: '4px 0 0', color: (incomeData?.federalRefund || 0) > 0 ? '#10b981' : '#ef4444', fontSize: 28, fontWeight: 700 }}>${Number((incomeData?.federalRefund || 0) > 0 ? incomeData.federalRefund : incomeData?.federalOwed || 0).toLocaleString()}</p>
                  </div>
                  
                  {/* State Tax Breakdown */}
                  {!userStateIsNoTax && (
                    <>
                      <div style={{ ...styles.summaryBox, marginTop: 16 }}>
                        <h4 style={{ margin: '0 0 12px', color: '#a855f7', fontSize: 14 }}>🏛️ {userStateName} State Tax Breakdown</h4>
                        <div style={styles.summaryRow}><span>State AGI</span><span style={{ color: '#e2e8f0' }}>${Number(incomeData?.caAgi || incomeData?.agi || incomeData?.totalIncome || wages).toLocaleString()}</span></div>
                        <div style={styles.summaryRow}><span>State Deduction</span><span style={{ color: '#f59e0b' }}>-${Number(incomeData?.caStdDeduction || incomeData?.stateDeduction || 0).toLocaleString()}</span></div>
                        <div style={{ ...styles.summaryRow, fontWeight: 600 }}><span>Taxable Income</span><span style={{ color: '#e2e8f0' }}>${Number(incomeData?.caTaxableIncome || incomeData?.stateTaxableIncome || 0).toLocaleString()}</span></div>
                        <div style={{ ...styles.summaryRow, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 8, marginTop: 8 }}><span>State Tax</span><span style={{ color: '#ef4444' }}>${Number(incomeData?.caTax || incomeData?.stateTax || 0).toLocaleString()}</span></div>
                        <div style={styles.summaryRow}><span>State Withheld</span><span style={{ color: '#10b981' }}>+${Number(incomeData?.caWithholding || incomeData?.stateWithholding || 0).toLocaleString()}</span></div>
                        {(incomeData?.calEitc || 0) > 0 && <div style={styles.summaryRow}><span>CalEITC</span><span style={{ color: '#10b981' }}>+${Number(incomeData?.calEitc || 0).toLocaleString()}</span></div>}
                        {(incomeData?.yctc || 0) > 0 && <div style={styles.summaryRow}><span>YCTC</span><span style={{ color: '#10b981' }}>+${Number(incomeData?.yctc || 0).toLocaleString()}</span></div>}
                      </div>
                      
                      {/* State Result Card */}
                      <div style={{ backgroundColor: (incomeData?.stateRefund || 0) > 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)', border: `2px solid ${(incomeData?.stateRefund || 0) > 0 ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`, borderRadius: 12, padding: 16, marginTop: 12, textAlign: 'center' }}>
                        <p style={{ margin: 0, color: '#94a3b8', fontSize: 13 }}>🏛️ {userState} State {(incomeData?.stateRefund || 0) > 0 ? 'Refund' : 'Owed'}</p>
                        <p style={{ margin: '4px 0 0', color: (incomeData?.stateRefund || 0) > 0 ? '#10b981' : '#ef4444', fontSize: 28, fontWeight: 700 }}>${Number((incomeData?.stateRefund || 0) > 0 ? incomeData.stateRefund : incomeData?.stateOwed || 0).toLocaleString()}</p>
                      </div>
                    </>
                  )}
                  
                  {userStateIsNoTax && (
                    <div style={{ backgroundColor: 'rgba(251, 191, 36, 0.15)', border: '2px solid rgba(251, 191, 36, 0.4)', borderRadius: 12, padding: 16, marginTop: 16, textAlign: 'center' }}>
                      <p style={{ margin: 0, color: '#fbbf24', fontSize: 16 }}>🎉 {userStateName} has no state income tax!</p>
                    </div>
                  )}
                  
                  {/* Total Summary */}
                  <div style={{ background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.2), rgba(59, 130, 246, 0.2))', border: '2px solid rgba(124, 58, 237, 0.4)', borderRadius: 12, padding: 20, marginTop: 16, textAlign: 'center' }}>
                    <p style={{ margin: 0, color: '#a78bfa', fontSize: 14, fontWeight: 600 }}>💰 TOTAL {((incomeData?.federalRefund || 0) + (incomeData?.stateRefund || 0) - (incomeData?.federalOwed || 0) - (incomeData?.stateOwed || 0)) >= 0 ? 'REFUND' : 'OWED'}</p>
                    <p style={{ margin: '8px 0 0', color: ((incomeData?.federalRefund || 0) + (incomeData?.stateRefund || 0) - (incomeData?.federalOwed || 0) - (incomeData?.stateOwed || 0)) >= 0 ? '#10b981' : '#ef4444', fontSize: 36, fontWeight: 800 }}>${Math.abs((incomeData?.federalRefund || 0) + (incomeData?.stateRefund || 0) - (incomeData?.federalOwed || 0) - (incomeData?.stateOwed || 0)).toLocaleString()}</p>
                    <p style={{ margin: '8px 0 0', color: '#94a3b8', fontSize: 12 }}>Federal: ${((incomeData?.federalRefund || 0) - (incomeData?.federalOwed || 0)) >= 0 ? '+' : '-'}${Math.abs((incomeData?.federalRefund || 0) - (incomeData?.federalOwed || 0)).toLocaleString()} • State: ${((incomeData?.stateRefund || 0) - (incomeData?.stateOwed || 0)) >= 0 ? '+' : '-'}${Math.abs((incomeData?.stateRefund || 0) - (incomeData?.stateOwed || 0)).toLocaleString()}</p>
                  </div>
                </div>
              )}

              {/* STEP 4: SIGN */}
              {step === 4 && (<div><h3 style={styles.sectionTitle}>✍️ Sign Your Return</h3><div style={styles.formGroup}><label style={styles.label}>Your Signature (Type Full Name)</label><input type="text" value={signature} onChange={e => setSignature(e.target.value)} style={{ ...styles.input, fontFamily: "'Brush Script MT', cursive", fontSize: 22 }} placeholder={`${userData?.first_name || 'John'} ${userData?.last_name || 'Smith'}`} /></div>{isMFJ && <div style={styles.formGroup}><label style={styles.label}>Spouse Signature</label><input type="text" value={spouseSignature} onChange={e => setSpouseSignature(e.target.value)} style={{ ...styles.input, fontFamily: "'Brush Script MT', cursive", fontSize: 22 }} placeholder={`${userData?.spouse_first_name || ''} ${userData?.spouse_last_name || ''}`} /></div>}<label style={styles.checkboxLabel}><input type="checkbox" checked={agreedTerms} onChange={e => setAgreedTerms(e.target.checked)} style={styles.checkbox} /><span>I declare under penalty of perjury that this return is true, correct, and complete.</span></label></div>)}

              {/* ============================================================ */}
              {/* STEP 5: PLAN SELECTION - FIXED PRICING */}
              {/* ============================================================ */}
              {step === 5 && (
                <div>
                  <h3 style={styles.sectionTitle}>💳 Choose Your Plan</h3>
                  
                  {/* Plan Grid */}
                  <div style={styles.planGrid}>
                    {Object.values(PLANS).map(p => (
                      <div key={p.id} onClick={() => setSelectedPlan(p.id)} style={{ ...styles.planCard, borderColor: selectedPlan === p.id ? '#7c3aed' : 'rgba(255,255,255,0.1)', backgroundColor: selectedPlan === p.id ? 'rgba(124, 58, 237, 0.15)' : 'transparent' }}>
                        {selectedPlan === p.id && <span style={{ position: 'absolute', top: 4, right: 4, color: '#10b981' }}>✓</span>}
                        <span style={{ fontSize: 24 }}>{p.icon}</span>
                        <span style={{ fontWeight: 600, color: '#e2e8f0', fontSize: 13 }}>{p.name}</span>
                        <span style={{ fontSize: 12 }}>
                          {p.price > 0 ? (
                            <>
                              <span style={{ textDecoration: 'line-through', color: '#64748b', marginRight: 4 }}>${p.price}</span>
                              <span style={{ color: '#10b981', fontWeight: 700 }}>$0</span>
                            </>
                          ) : (
                            <span style={{ color: '#10b981', fontWeight: 700 }}>$0</span>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                  
                  {/* Include State Checkbox */}
                  <label style={styles.checkboxLabel}>
                    <input type="checkbox" checked={includeState} onChange={e => setIncludeState(e.target.checked)} style={styles.checkbox} />
                    <span>
                      📍 Include {userStateName} State Return 
                      {userStateIsNoTax ? (
                        <span style={{ color: '#fbbf24', marginLeft: 8 }}>🎉 No state tax!</span>
                      ) : (
                        <span style={{ marginLeft: 8 }}>
                          <span style={{ textDecoration: 'line-through', color: '#64748b' }}>+${STATE_FILING_PRICE}</span>
                          <span style={{ color: '#10b981', marginLeft: 4 }}>FREE</span>
                        </span>
                      )}
                    </span>
                  </label>
                  
                  {/* CPA Review Checkbox */}
                  <label style={styles.checkboxLabel}>
                    <input type="checkbox" checked={includeCPA} onChange={e => setIncludeCPA(e.target.checked)} style={styles.checkbox} />
                    <span>👨‍💼 Add CPA Review (+${cpaTotalFee})</span>
                  </label>
                  
                  {/* Price Breakdown Box */}
                  <div style={styles.totalBox}>
                    <div style={{ fontSize: 14, color: '#94a3b8', marginBottom: 8 }}>
                      {/* Federal */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span>Federal ({plan.name})</span>
                        {includeCPA ? (
                          <span>${(plan.price + cpaFederalFee).toFixed(2)}</span>
                        ) : (
                          <span>
                            {plan.price > 0 && <span style={{ textDecoration: 'line-through', marginRight: 6 }}>${plan.price}</span>}
                            <span style={{ color: '#10b981' }}>$0</span>
                          </span>
                        )}
                      </div>
                      
                      {/* State */}
                      {includeState && !userStateIsNoTax && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span>State ({userState})</span>
                          {includeCPA ? (
                            <span>${(STATE_FILING_PRICE + cpaStateFee).toFixed(2)}</span>
                          ) : (
                            <span>
                              <span style={{ textDecoration: 'line-through', marginRight: 6 }}>${STATE_FILING_PRICE}</span>
                              <span style={{ color: '#10b981' }}>$0</span>
                            </span>
                          )}
                        </div>
                      )}
                      
                      {/* No Tax State Message */}
                      {includeState && userStateIsNoTax && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, color: '#fbbf24' }}>
                          <span>🎉 {userStateName} - No State Tax!</span>
                          <span>$0</span>
                        </div>
                      )}
                      
                      {/* Discount Row - Only for self-file */}
                      {!includeCPA && originalValue > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, color: '#10b981', fontWeight: 600, background: 'rgba(16, 185, 129, 0.1)', padding: '6px 8px', margin: '8px -8px', borderRadius: 6 }}>
                          <span>🎉 File by Mail Discount</span>
                          <span>-${originalValue.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Total */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, fontWeight: 600, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 12 }}>
                      <span style={{ color: '#e2e8f0' }}>Total</span>
                      <span style={{ color: includeCPA ? '#a78bfa' : '#10b981', fontSize: 22 }}>
                        {includeCPA ? `$${totalPrice.toFixed(2)}` : '$0 FREE'}
                      </span>
                    </div>
                  </div>
                  
                  {/* Service Info */}
                  {!includeCPA ? (
                    <div style={{ marginTop: 16, padding: 16, background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 12 }}>
                      <p style={{ margin: 0, fontSize: 13, color: '#10b981' }}>
                        ✅ <strong>File by Mail (FREE):</strong> Download your tax forms, print, sign, and mail to IRS.
                      </p>
                      {originalValue > 0 && (
                        <p style={{ margin: '8px 0 0', fontSize: 12, color: '#10b981' }}>
                          💰 You save <strong>${originalValue.toFixed(2)}</strong> with 2025 tax season promotion!
                        </p>
                      )}
                    </div>
                  ) : (
                    <div style={{ marginTop: 16, padding: 16, background: 'rgba(124, 58, 237, 0.1)', border: '1px solid rgba(124, 58, 237, 0.3)', borderRadius: 12 }}>
                      <p style={{ margin: 0, fontSize: 13, color: '#a78bfa' }}>
                        👨‍💼 <strong>CPA E-File:</strong> A licensed CPA reviews, signs, and e-files your return within 24-48 hours.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 6: DOWNLOAD */}
              {step === 6 && (
                <>
                  {showPaymentFlow ? (
                    <PaymentFlow planId={selectedPlan} amount={totalPrice} onSuccess={() => { setShowPaymentFlow(false); setPdfGenerated(true); }} onCancel={() => setShowPaymentFlow(false)} />
                  ) : (
                    <div style={{ textAlign: 'center', padding: 24 }}>
                      <div style={{ fontSize: 60, marginBottom: 16 }}>🎉</div>
                      <h3 style={{ ...styles.sectionTitle, textAlign: 'center' }}>📥 Download Your Tax Forms</h3>
                      
                      {/* Payment required for CPA */}
                      {includeCPA && totalPrice > 0 && !pdfGenerated ? (
                        <button onClick={() => setShowPaymentFlow(true)} style={styles.downloadBtn}>💳 Pay ${totalPrice.toFixed(2)} & Download</button>
                      ) : (
                        <>
                          <button onClick={downloadForm1040} disabled={downloadingPdf} style={{ ...styles.downloadBtn, marginBottom: 12, opacity: downloadingPdf ? 0.7 : 1 }}>{downloadingPdf ? '⏳ Generating...' : pdfGenerated ? '✅ Download Again - Federal 1040' : '📄 Download Federal Form 1040'}</button>
                          {includeState && (userStateIsNoTax ? (
                            <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 12, padding: 20, marginBottom: 12 }}>
                              <div style={{ fontSize: 32, marginBottom: 8 }}>🎉</div>
                              <p style={{ color: '#10b981', fontWeight: 600, margin: 0 }}>{userStateName} has no state income tax!</p>
                            </div>
                          ) : (
                            <button onClick={downloadStateForm} disabled={downloadingState} style={{ ...styles.downloadBtn, background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)', opacity: downloadingState ? 0.7 : 1 }}>{downloadingState ? '⏳ Generating...' : stateGenerated ? `✅ Download Again - ${userState} ${userStateConfig?.form}` : `📄 Download State Form ${userState} ${userStateConfig?.form || ''}`}</button>
                          ))}
                        </>
                      )}
                      {(pdfGenerated || stateGenerated) && <p style={{ color: '#10b981', marginTop: 20 }}>✅ Forms downloaded successfully!</p>}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <button onClick={step === 1 ? onClose : handleBack} style={styles.backBtn}>{step === 1 ? 'Cancel' : '← Back'}</button>
          <button onClick={handleNext} disabled={step === 1 && totalMissing > 0} style={{ ...styles.nextBtn, backgroundColor: (step === 1 && totalMissing > 0) ? '#64748b' : includeCPA ? '#7c3aed' : '#10b981' }}>
            {step === 6 ? 'Done ✓' : includeCPA ? `Continue → $${totalPrice.toFixed(2)}` : 'Continue → FREE'}
          </button>
        </div>

        {/* Dependent Modal */}
        {editingDependent !== null && (
          <div style={styles.modalOverlay}>
            <div style={styles.editModal}>
              <h3 style={{ margin: '0 0 16px', color: '#e2e8f0' }}>{editingDependent === 'new' ? '➕ Add Dependent' : '✏️ Edit Dependent'}</h3>
              <div style={styles.formGrid}>
                <div><label style={styles.label}>First Name *</label><input type="text" value={dependentFormData.first_name} onChange={e => setDependentFormData({ ...dependentFormData, first_name: e.target.value })} style={styles.input} /></div>
                <div><label style={styles.label}>Last Name *</label><input type="text" value={dependentFormData.last_name} onChange={e => setDependentFormData({ ...dependentFormData, last_name: e.target.value })} style={styles.input} /></div>
              </div>
              <div style={styles.formGrid}>
                <SecureSSNInput value={dependentFormData.ssn || ''} onChange={(val) => setDependentFormData({ ...dependentFormData, ssn: val })} label="SSN" />
                <div><label style={styles.label}>Relationship</label><select value={dependentFormData.relationship} onChange={e => setDependentFormData({ ...dependentFormData, relationship: e.target.value })} style={styles.select}><option value="child">Child</option><option value="stepchild">Stepchild</option><option value="parent">Parent</option><option value="other">Other</option></select></div>
              </div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 20 }}>
                <button onClick={() => setEditingDependent(null)} style={styles.backBtn}>Cancel</button>
                <button onClick={saveDependent} disabled={!dependentFormData.first_name || !dependentFormData.ssn} style={{ ...styles.nextBtn, opacity: (!dependentFormData.first_name || !dependentFormData.ssn) ? 0.5 : 1 }}>Save</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// STYLES
// ============================================================
const styles = {
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 },
  modal: { backgroundColor: '#0f172a', borderRadius: 20, width: '100%', maxWidth: 650, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 50px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.06)' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)', color: 'white' },
  headerTitle: { margin: 0, fontSize: 20, fontWeight: 700 },
  headerSubtitle: { margin: '4px 0 0', opacity: 0.9, fontSize: 14 },
  closeBtn: { background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', width: 36, height: 36, borderRadius: '50%', fontSize: 24, cursor: 'pointer' },
  stepIndicator: { display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, backgroundColor: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)' },
  stepItem: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 },
  stepCircle: { width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 14 },
  stepLabel: { fontSize: 11, fontWeight: 500 },
  stepLine: { width: 24, height: 3, margin: '0 4px', borderRadius: 2, marginBottom: 16 },
  content: { padding: 24, overflowY: 'auto', flex: 1, backgroundColor: '#0f172a' },
  loadingBox: { textAlign: 'center', padding: 60 },
  spinner: { width: 40, height: 40, border: '4px solid rgba(255,255,255,0.1)', borderTopColor: '#7c3aed', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' },
  alertBox: { backgroundColor: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.4)', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 13, color: '#fbbf24' },
  tabs: { display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' },
  tab: { padding: '8px 16px', backgroundColor: 'transparent', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, cursor: 'pointer', fontSize: 13 },
  tabActive: { backgroundColor: 'rgba(124, 58, 237, 0.2)', color: '#a78bfa', borderColor: 'rgba(124, 58, 237, 0.4)' },
  sectionTitle: { margin: '0 0 16px', fontSize: 18, fontWeight: 700, color: '#e2e8f0' },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16, marginBottom: 16 },
  formGroup: { marginBottom: 16 },
  label: { display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: '#94a3b8' },
  input: { width: '100%', padding: 12, fontSize: 14, border: '2px solid rgba(255,255,255,0.1)', borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.05)', color: '#e2e8f0', boxSizing: 'border-box' },
  select: { width: '100%', padding: 12, fontSize: 14, border: '2px solid rgba(255,255,255,0.1)', borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.05)', color: '#e2e8f0', boxSizing: 'border-box' },
  infoBox: { backgroundColor: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: 12, padding: 16, color: '#94a3b8' },
  dataCard: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 16, marginBottom: 16, border: '1px solid rgba(255,255,255,0.06)' },
  dataRow: { display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#94a3b8', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' },
  summaryBox: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 16, marginBottom: 16, border: '1px solid rgba(255,255,255,0.06)' },
  summaryRow: { display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: 14, color: '#94a3b8' },
  dependentCard: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 16, marginBottom: 12, border: '1px solid rgba(255,255,255,0.06)' },
  smallBtn: { padding: '6px 12px', backgroundColor: 'rgba(124, 58, 237, 0.2)', color: '#a78bfa', border: '1px solid rgba(124, 58, 237, 0.3)', borderRadius: 6, cursor: 'pointer', fontSize: 12 },
  addBtn: { padding: '12px 20px', backgroundColor: 'rgba(124, 58, 237, 0.2)', color: '#a78bfa', border: '2px dashed rgba(124, 58, 237, 0.4)', borderRadius: 12, cursor: 'pointer', fontSize: 14, width: '100%' },
  planGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 16 },
  planCard: { padding: 16, borderRadius: 12, cursor: 'pointer', textAlign: 'center', border: '2px solid', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, position: 'relative' },
  totalBox: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 16, marginTop: 16 },
  checkboxLabel: { display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13, color: '#94a3b8', cursor: 'pointer', marginTop: 16 },
  checkbox: { width: 18, height: 18, cursor: 'pointer', marginTop: 2, accentColor: '#7c3aed' },
  downloadBtn: { width: '100%', padding: '16px 32px', background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)', color: 'white', border: 'none', borderRadius: 12, cursor: 'pointer', fontSize: 16, fontWeight: 600 },
  footer: { display: 'flex', justifyContent: 'space-between', padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.06)', backgroundColor: 'rgba(255,255,255,0.02)' },
  backBtn: { padding: '10px 20px', fontSize: 14, fontWeight: 500, backgroundColor: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '2px solid rgba(255,255,255,0.1)', borderRadius: 10, cursor: 'pointer' },
  nextBtn: { padding: '10px 24px', fontSize: 14, fontWeight: 600, color: 'white', border: 'none', borderRadius: 10, cursor: 'pointer' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 },
  editModal: { backgroundColor: '#1e293b', borderRadius: 16, padding: 24, width: '90%', maxWidth: 450, maxHeight: '80vh', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.1)' },
};