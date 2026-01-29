// ============================================================
// SUBMIT FLOW - v7.0 PYTHON API INTEGRATION
// ============================================================
// ✅ v7.0: Uses Python API for Form 1040 missing fields
//          - GET /api/user/{userId}/form1040/missing
//          - POST /api/user/{userId}/form1040/update
//          - POST /api/user/{userId}/form1040/dependent/{index}
//          - Dependent Name/SSN validation
// ============================================================

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import PaymentFlow from './PaymentFlow';

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5001";
const PYTHON_API = import.meta.env.VITE_PYTHON_API || "http://localhost:5002";

const CPA_FEE_PER_FORM = 59;

const PLANS = {
  free: { id: 'free', name: 'Free Estimate', price: 0, icon: '🆓', description: 'View estimate only' },
  basic: { id: 'basic', name: 'Basic', price: 29.99, icon: '📄', description: 'Simple W-2' },
  standard: { id: 'standard', name: 'Standard', price: 49.99, icon: '⭐', description: 'Most popular', popular: true },
  plus: { id: 'plus', name: 'Plus', price: 79.99, icon: '💎', description: 'Multiple income' },
  selfEmployed: { id: 'selfEmployed', name: 'Self-Employed', price: 89.99, icon: '💼', description: '1099/Schedule C' },
  premium: { id: 'premium', name: 'Premium', price: 129.99, icon: '👑', description: 'Complex returns' },
};

const FILING_STATUS_OPTIONS = [
  { value: 'single', label: 'Single' },
  { value: 'married_filing_jointly', label: 'Married Filing Jointly' },
  { value: 'married_filing_separately', label: 'Married Filing Separately' },
  { value: 'head_of_household', label: 'Head of Household' },
  { value: 'qualifying_surviving_spouse', label: 'Qualifying Surviving Spouse' },
];

export default function SubmitFlow({ onClose, taxData, userData: initialUserData, userId, token }) {
  const navigate = useNavigate();
  const { language } = useLanguage?.() || { language: 'en' };

  // State
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(initialUserData || {});
  const [dependents, setDependents] = useState([]);
  const [incomeData, setIncomeData] = useState(taxData || {});
  const [form1040Data, setForm1040Data] = useState(null);
  
  // ✅ v7.0: Missing fields from Python API
  const [editTab, setEditTab] = useState('personal');
  const [missingFields, setMissingFields] = useState([]);      // Personal/Spouse missing
  const [dependentMissing, setDependentMissing] = useState([]); // Dependent missing
  const [saveStatus, setSaveStatus] = useState('');
  const [isReadyToFile, setIsReadyToFile] = useState(false);
  
  // Dependent editing
  const [editingDependent, setEditingDependent] = useState(null);
  const [dependentFormData, setDependentFormData] = useState({
    first_name: '', last_name: '', ssn: '', relationship: 'child', date_of_birth: '', months_lived: 12
  });
  
  // Step 4 state
  const [signature, setSignature] = useState('');
  const [spouseSignature, setSpouseSignature] = useState('');
  const [agreedTerms, setAgreedTerms] = useState(false);
  
  // Step 5 state
  const [selectedPlan, setSelectedPlan] = useState('free');
  const [includeCPA, setIncludeCPA] = useState(false);
  const [includeState, setIncludeState] = useState(true);
  
  // Step 6 state
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [pdfGenerated, setPdfGenerated] = useState(false);
  const [showPaymentFlow, setShowPaymentFlow] = useState(false);

  const STEPS = [
    { num: 1, title: 'Edit Info', icon: '📝' },
    { num: 2, title: 'Income', icon: '💵' },
    { num: 3, title: 'Summary', icon: '🔍' },
    { num: 4, title: 'Sign', icon: '✍️' },
    { num: 5, title: 'Plan', icon: '💳' },
    { num: 6, title: 'Download', icon: '📥' },
  ];

  const plan = PLANS[selectedPlan] || PLANS.free;
  const formCount = includeState ? 2 : 1;
  const cpaFee = CPA_FEE_PER_FORM * formCount;
  const totalPrice = includeCPA ? plan.price + cpaFee : 0;

  // Load data on mount
  useEffect(() => { loadData(); }, []);

  // ============================================================
  // ✅ v7.0: LOAD DATA FROM PYTHON API
  // ============================================================
  async function loadData() {
    if (!userId) { setLoading(false); return; }
    try {
      // ✅ v7.0: Call Python API to get form1040 data with missing fields
      const response = await fetch(`${PYTHON_API}/api/user/${userId}/form1040/missing?tax_year=2025`);
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.success) {
          // Set user data from current_data
          setUserData(data.current_data || {});
          
          // Set dependents
          setDependents(data.dependents || []);
          
          // ✅ v7.0: Separate personal and dependent missing fields
          const personalMissing = (data.required_missing || []).filter(m => !m.field?.includes('dependent_'));
          const depMissing = (data.required_missing || []).filter(m => m.field?.includes('dependent_'));
          
          setMissingFields(personalMissing);
          setDependentMissing(depMissing);
          setIsReadyToFile(data.is_ready_to_file || false);
          
          console.log('[SUBMITFLOW] ✅ Loaded from Python API:', {
            personal: Object.keys(data.current_data || {}).length,
            dependents: data.dependents?.length || 0,
            missingPersonal: personalMissing.length,
            missingDependent: depMissing.length,
            isReady: data.is_ready_to_file
          });
        }
      } else {
        console.log('[SUBMITFLOW] Python API failed, using fallback...');
        await loadDataFallback();
      }
      
      // Load tax calculation data if provided
      if (taxData && Object.keys(taxData).length > 0) {
        setForm1040Data(buildForm1040Data(taxData, userData));
        setIncomeData(taxData);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('[SUBMITFLOW] Load error:', error);
      await loadDataFallback();
      setLoading(false);
    }
  }

  // Fallback to Node.js API
  async function loadDataFallback() {
    let baseUserData = initialUserData || {};
    let baseDependents = [];
    
    try {
      const aiDataRes = await fetch(`${API_BASE}/api/ai/data/${userId}?taxYear=2025`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (aiDataRes.ok) {
        const aiData = await aiDataRes.json();
        if (aiData.success && aiData.answers) {
          const answers = aiData.answers || {};
          baseUserData = {
            ...baseUserData,
            first_name: answers.first_name || answers.taxpayer_first_name || '',
            last_name: answers.last_name || answers.taxpayer_last_name || '',
            ssn: answers.ssn || answers.taxpayer_ssn || '',
            address: answers.address || answers.street_address || '',
            city: answers.city || '',
            state: answers.state || 'CA',
            zip: answers.zip || answers.zip_code || '',
            filing_status: aiData.filing_status || answers.filing_status || 'single',
            spouse_first_name: answers.spouse_first_name || '',
            spouse_last_name: answers.spouse_last_name || '',
            spouse_ssn: answers.spouse_ssn || '',
            phone: answers.phone || '',
            email: answers.email || '',
          };
          if (aiData.dependents?.length > 0) baseDependents = aiData.dependents;
        }
      }
    } catch (e) { console.log('[SUBMITFLOW] Fallback fetch error:', e); }

    setUserData(baseUserData);
    setDependents(baseDependents);
    validateFieldsLocal(baseUserData, baseDependents);
  }

  function buildForm1040Data(taxData, userData) {
    return {
      header: { tax_year: 2025, filing_status: taxData.filing_status || userData.filing_status || 'single' },
      income: {
        line_1_wages: taxData.wages || 0,
        line_2b_taxable_interest: taxData.interest || 0,
        line_3b_ordinary_dividends: taxData.dividends || 0,
        line_7_capital_gain: taxData.capitalGains || 0,
        line_9_total_income: taxData.totalIncome || taxData.wages || 0
      },
      adjustments: { line_10_adjustments: taxData.totalAdjustments || 0, line_11_agi: taxData.agi || taxData.totalIncome || 0 },
      deductions: { line_12_deduction: taxData.standardDeduction || 15750, line_15_taxable_income: taxData.taxableIncome || 0 },
      tax_and_credits: { line_16_tax: taxData.federalTax || 0, line_19_child_tax_credit: taxData.childTaxCredit || 0 },
      payments: { line_25a_w2_withholding: taxData.federalWithholding || 0 },
      refund_or_owe: { line_35_refund: taxData.federalRefund || 0, line_37_amount_owed: taxData.federalOwed || 0 }
    };
  }

  // ============================================================
  // ✅ v7.0: FIELD CHANGE -> SAVE TO PYTHON API
  // ============================================================
  function handleFieldChange(field, value) {
    const updated = { ...userData, [field]: value };
    setUserData(updated);
    
    // Auto-save after short delay
    clearTimeout(window.saveTimeout);
    window.saveTimeout = setTimeout(() => saveUserData({ [field]: value }), 1000);
  }

  // ✅ v7.0: Save to Python API
  async function saveUserData(updateData) {
    setSaveStatus('saving');
    try {
      const response = await fetch(`${PYTHON_API}/api/user/${userId}/form1040/update?tax_year=2025`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Update missing fields from response
        if (result.missing_fields) {
          const personalMissing = result.missing_fields.filter(f => !f.includes('dependent_'));
          const depMissing = result.missing_fields.filter(f => f.includes('dependent_'));
          
          setMissingFields(personalMissing.map(f => ({ field: f, label: f.replace(/_/g, ' ') })));
          setDependentMissing(depMissing.map(f => ({ field: f, label: f.replace(/_/g, ' ') })));
        }
        setIsReadyToFile(result.is_ready_to_file || false);
        
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus(''), 2000);
      } else {
        setSaveStatus('error');
      }
    } catch (e) {
      console.log('[SUBMITFLOW] Save error:', e);
      setSaveStatus('error');
    }
  }

  // Local validation fallback
  function validateFieldsLocal(data, deps = []) {
    const missing = [];
    const required = [
      { field: 'first_name', label: 'First Name' },
      { field: 'last_name', label: 'Last Name' },
      { field: 'ssn', label: 'SSN' },
      { field: 'address', label: 'Address' },
      { field: 'city', label: 'City' },
      { field: 'state', label: 'State' },
      { field: 'zip', label: 'ZIP' },
    ];
    
    required.forEach(r => {
      if (!data[r.field] || data[r.field].toString().trim() === '') {
        missing.push(r);
      }
    });
    
    if (data.filing_status === 'married_filing_jointly') {
      if (!data.spouse_first_name) missing.push({ field: 'spouse_first_name', label: 'Spouse First Name' });
      if (!data.spouse_last_name) missing.push({ field: 'spouse_last_name', label: 'Spouse Last Name' });
      if (!data.spouse_ssn) missing.push({ field: 'spouse_ssn', label: 'Spouse SSN' });
    }
    
    // Dependent validation
    const depMissing = [];
    deps.forEach((dep, i) => {
      if (!dep.first_name && !dep.name) depMissing.push({ field: `dependent_${i+1}_name`, label: `Dependent ${i+1} Name` });
      if (!dep.ssn) depMissing.push({ field: `dependent_${i+1}_ssn`, label: `Dependent ${i+1} SSN` });
    });
    
    setMissingFields(missing);
    setDependentMissing(depMissing);
    setIsReadyToFile(missing.length === 0 && depMissing.length === 0);
  }

  // ============================================================
  // SSN FORMATTING
  // ============================================================
  function formatSSN(value) {
    const digits = (value || '').replace(/\D/g, '').slice(0, 9);
    if (digits.length <= 3) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
  }

  function maskSSN(ssn) {
    if (!ssn) return '___-__-____';
    const clean = ssn.replace(/\D/g, '');
    return clean.length >= 4 ? `***-**-${clean.slice(-4)}` : '___-__-____';
  }

  // ============================================================
  // ✅ v7.0: DEPENDENT MANAGEMENT
  // ============================================================
  function openDependentModal(index = 'new') {
    setEditingDependent(index);
    if (index === 'new') {
      setDependentFormData({ first_name: '', last_name: '', ssn: '', relationship: 'child', date_of_birth: '', months_lived: 12 });
    } else {
      const dep = dependents[index];
      setDependentFormData({
        first_name: dep.first_name || dep.name?.split(' ')[0] || '',
        last_name: dep.last_name || dep.name?.split(' ').slice(1).join(' ') || '',
        ssn: dep.ssn || '',
        relationship: dep.relationship || 'child',
        date_of_birth: dep.date_of_birth || '',
        months_lived: dep.months_lived || 12
      });
    }
  }

  // ✅ v7.0: Save dependent to Python API
  async function saveDependent() {
    const newDep = { 
      ...dependentFormData, 
      ssn: dependentFormData.ssn.replace(/\D/g, ''),
      name: `${dependentFormData.first_name} ${dependentFormData.last_name}`.trim()
    };
    
    setSaveStatus('saving');
    
    try {
      if (editingDependent === 'new') {
        // Add new dependent
        const updated = [...dependents, newDep];
        await fetch(`${PYTHON_API}/api/user/${userId}/dependents`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dependents: updated })
        });
        setDependents(updated);
      } else {
        // Update existing dependent via Python API
        const response = await fetch(`${PYTHON_API}/api/user/${userId}/form1040/dependent/${editingDependent}?tax_year=2025`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newDep)
        });
        
        const result = await response.json();
        
        if (result.success) {
          const updated = dependents.map((d, i) => i === editingDependent ? newDep : d);
          setDependents(updated);
          
          if (result.missing_fields) {
            const depMissing = result.missing_fields.filter(f => f.includes('dependent_'));
            setDependentMissing(depMissing.map(f => ({ field: f, label: f.replace(/_/g, ' ') })));
            setIsReadyToFile(result.is_ready_to_file || false);
          }
        }
      }
      
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus(''), 2000);
    } catch (e) {
      console.log('[SUBMITFLOW] Dependent save error:', e);
      // Fallback - update local state
      const updated = editingDependent === 'new' 
        ? [...dependents, newDep] 
        : dependents.map((d, i) => i === editingDependent ? newDep : d);
      setDependents(updated);
      setSaveStatus('');
    }
    
    setEditingDependent(null);
    loadData(); // Refresh missing fields
  }

  async function deleteDependent(index) {
    if (!confirm('Remove this dependent?')) return;
    const updated = dependents.filter((_, i) => i !== index);
    try {
      await fetch(`${PYTHON_API}/api/user/${userId}/dependents`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dependents: updated })
      });
    } catch (e) {}
    setDependents(updated);
    loadData(); // Refresh missing fields
  }

  // ============================================================
  // PDF DOWNLOAD
  // ============================================================
  async function downloadForm1040() {
    setDownloadingPdf(true);
    try {
      const payload = {
        session_id: userId, mask_ssn: false, is_official_submission: true,
        personal: {
          first_name: userData?.first_name || '', last_name: userData?.last_name || '', ssn: userData?.ssn || '',
          address: userData?.address || '', city: userData?.city || '', state: userData?.state || 'CA', zip: userData?.zip || '',
          filing_status: userData?.filing_status || 'single',
          spouse_first_name: userData?.spouse_first_name || '', spouse_last_name: userData?.spouse_last_name || '', spouse_ssn: userData?.spouse_ssn || ''
        },
        dependents: dependents.map(d => ({ first_name: d.first_name || '', last_name: d.last_name || '', ssn: d.ssn || '', relationship: d.relationship || 'child' })),
        form1040: form1040Data
      };
      
      const response = await fetch(`${PYTHON_API}/generate/1040`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!response.ok) throw new Error('PDF generation failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Form1040_2025_${userData?.last_name || 'TaxReturn'}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
      setPdfGenerated(true);
    } catch (error) {
      alert('Error generating PDF');
    } finally {
      setDownloadingPdf(false);
    }
  }

  // Navigation
  const totalMissing = missingFields.length + dependentMissing.length;
  
  function handleNext() {
    if (step === 1 && totalMissing > 0) {
      const allMissing = [...missingFields, ...dependentMissing];
      alert(`Please fill in all required fields:\n\n${allMissing.map(m => `• ${m.label || m.field}`).join('\n')}`);
      return;
    }
    if (step === 6) { onClose(); return; }
    setStep(Math.min(step + 1, 6));
  }
  
  function handleBack() { setStep(Math.max(step - 1, 1)); }

  // Helper: get field style (red border if missing)
  function getFieldStyle(fieldName) {
    const isMissing = missingFields.some(m => m.field === fieldName);
    return {
      ...styles.input,
      borderColor: isMissing ? '#ef4444' : 'rgba(255,255,255,0.1)',
      backgroundColor: isMissing ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255,255,255,0.05)'
    };
  }

  // Values
  const isMFJ = userData?.filing_status === 'married_filing_jointly';
  const wages = incomeData?.wages || 0;
  const interest = incomeData?.interest || 0;
  const dividends = incomeData?.dividends || 0;

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h2 style={styles.headerTitle}>📋 File Your Tax Return</h2>
            <p style={styles.headerSubtitle}>Tax Year 2025</p>
          </div>
          <button onClick={onClose} style={styles.closeBtn}>×</button>
        </div>

        {/* Step Indicator */}
        <div style={styles.stepIndicator}>
          {STEPS.map((s, idx) => (
            <React.Fragment key={s.num}>
              <div style={styles.stepItem}>
                <div style={{ ...styles.stepCircle, backgroundColor: step >= s.num ? '#7c3aed' : 'rgba(255,255,255,0.1)', color: step >= s.num ? 'white' : '#64748b' }}>
                  {step > s.num ? '✓' : s.icon}
                </div>
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
              {/* ============================================================ */}
              {/* STEP 1: EDIT INFO */}
              {/* ============================================================ */}
              {step === 1 && (
                <>
                  {/* Missing Fields Alert */}
                  {totalMissing > 0 && (
                    <div style={styles.alertBox}>
                      <strong>⚠️ Missing Required Fields ({totalMissing}):</strong>{' '}
                      {[...missingFields, ...dependentMissing].map(m => m.label || m.field).join(', ')}
                    </div>
                  )}
                  
                  {/* Save Status */}
                  {saveStatus && (
                    <div style={{ 
                      padding: '8px 12px', borderRadius: 8, marginBottom: 12, fontSize: 13,
                      backgroundColor: saveStatus === 'saved' ? 'rgba(16, 185, 129, 0.2)' : saveStatus === 'error' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(124, 58, 237, 0.2)',
                      color: saveStatus === 'saved' ? '#10b981' : saveStatus === 'error' ? '#ef4444' : '#a78bfa'
                    }}>
                      {saveStatus === 'saving' ? '💾 Saving...' : saveStatus === 'saved' ? '✅ Saved!' : '❌ Save failed'}
                    </div>
                  )}

                  {/* Tabs */}
                  <div style={styles.tabs}>
                    {['personal', 'spouse', 'dependents'].map(tab => {
                      let badge = 0;
                      if (tab === 'personal') badge = missingFields.filter(m => !m.field?.includes('spouse')).length;
                      if (tab === 'spouse') badge = missingFields.filter(m => m.field?.includes('spouse')).length;
                      if (tab === 'dependents') badge = dependentMissing.length;
                      
                      if (tab === 'spouse' && !isMFJ) return null;
                      
                      return (
                        <button key={tab} onClick={() => setEditTab(tab)} style={{ ...styles.tab, ...(editTab === tab ? styles.tabActive : {}) }}>
                          {tab === 'personal' && '👤 Personal'}
                          {tab === 'spouse' && '👫 Spouse'}
                          {tab === 'dependents' && `👶 Dependents (${dependents.length})`}
                          {badge > 0 && <span style={{ marginLeft: 6, backgroundColor: '#ef4444', color: 'white', borderRadius: '50%', padding: '2px 6px', fontSize: 11 }}>{badge}</span>}
                        </button>
                      );
                    })}
                  </div>

                  {/* PERSONAL TAB */}
                  {editTab === 'personal' && (
                    <div>
                      <h3 style={styles.sectionTitle}>👤 Personal Information</h3>
                      <div style={styles.formGrid}>
                        <div style={styles.formGroup}>
                          <label style={styles.label}>First Name *</label>
                          <input type="text" value={userData.first_name || ''} onChange={e => handleFieldChange('first_name', e.target.value)} style={getFieldStyle('first_name')} />
                        </div>
                        <div style={styles.formGroup}>
                          <label style={styles.label}>Last Name *</label>
                          <input type="text" value={userData.last_name || ''} onChange={e => handleFieldChange('last_name', e.target.value)} style={getFieldStyle('last_name')} />
                        </div>
                      </div>
                      <div style={styles.formGrid}>
                        <div style={styles.formGroup}>
                          <label style={styles.label}>SSN *</label>
                          <input type="text" value={formatSSN(userData.ssn)} onChange={e => handleFieldChange('ssn', e.target.value.replace(/\D/g, ''))} style={getFieldStyle('ssn')} placeholder="XXX-XX-XXXX" />
                        </div>
                        <div style={styles.formGroup}>
                          <label style={styles.label}>Date of Birth</label>
                          <input type="date" value={userData.taxpayer_dob || ''} onChange={e => handleFieldChange('taxpayer_dob', e.target.value)} style={styles.input} />
                        </div>
                      </div>
                      <div style={styles.formGroup}>
                        <label style={styles.label}>Filing Status *</label>
                        <select value={userData.filing_status || 'single'} onChange={e => handleFieldChange('filing_status', e.target.value)} style={styles.select}>
                          {FILING_STATUS_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                      </div>
                      
                      <h3 style={{ ...styles.sectionTitle, marginTop: 24 }}>🏠 Address</h3>
                      <div style={styles.formGroup}>
                        <label style={styles.label}>Street Address *</label>
                        <input type="text" value={userData.address || ''} onChange={e => handleFieldChange('address', e.target.value)} style={getFieldStyle('address')} />
                      </div>
                      <div style={styles.formGrid}>
                        <div style={styles.formGroup}>
                          <label style={styles.label}>City *</label>
                          <input type="text" value={userData.city || ''} onChange={e => handleFieldChange('city', e.target.value)} style={getFieldStyle('city')} />
                        </div>
                        <div style={styles.formGroup}>
                          <label style={styles.label}>State *</label>
                          <input type="text" maxLength={2} value={userData.state || ''} onChange={e => handleFieldChange('state', e.target.value.toUpperCase())} style={getFieldStyle('state')} />
                        </div>
                        <div style={styles.formGroup}>
                          <label style={styles.label}>ZIP *</label>
                          <input type="text" maxLength={10} value={userData.zip || ''} onChange={e => handleFieldChange('zip', e.target.value)} style={getFieldStyle('zip')} />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SPOUSE TAB */}
                  {editTab === 'spouse' && (
                    <div>
                      <h3 style={styles.sectionTitle}>👫 Spouse Information</h3>
                      <div style={styles.formGrid}>
                        <div style={styles.formGroup}>
                          <label style={styles.label}>Spouse First Name *</label>
                          <input type="text" value={userData.spouse_first_name || ''} onChange={e => handleFieldChange('spouse_first_name', e.target.value)} style={getFieldStyle('spouse_first_name')} />
                        </div>
                        <div style={styles.formGroup}>
                          <label style={styles.label}>Spouse Last Name *</label>
                          <input type="text" value={userData.spouse_last_name || ''} onChange={e => handleFieldChange('spouse_last_name', e.target.value)} style={getFieldStyle('spouse_last_name')} />
                        </div>
                      </div>
                      <div style={styles.formGrid}>
                        <div style={styles.formGroup}>
                          <label style={styles.label}>Spouse SSN *</label>
                          <input type="text" value={formatSSN(userData.spouse_ssn)} onChange={e => handleFieldChange('spouse_ssn', e.target.value.replace(/\D/g, ''))} style={getFieldStyle('spouse_ssn')} placeholder="XXX-XX-XXXX" />
                        </div>
                        <div style={styles.formGroup}>
                          <label style={styles.label}>Spouse Date of Birth</label>
                          <input type="date" value={userData.spouse_dob || ''} onChange={e => handleFieldChange('spouse_dob', e.target.value)} style={styles.input} />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* DEPENDENTS TAB */}
                  {editTab === 'dependents' && (
                    <div>
                      <h3 style={styles.sectionTitle}>👶 Dependents ({dependents.length})</h3>
                      
                      {dependentMissing.length > 0 && (
                        <div style={{ ...styles.alertBox, marginBottom: 16 }}>
                          <strong>⚠️ Missing Dependent Info:</strong> {dependentMissing.map(m => m.label).join(', ')}
                        </div>
                      )}
                      
                      {dependents.length === 0 ? (
                        <div style={styles.infoBox}><p style={{ margin: 0 }}>No dependents added. Click below to add.</p></div>
                      ) : (
                        dependents.map((dep, i) => {
                          const hasMissing = dependentMissing.some(m => m.field?.includes(`dependent_${i+1}`));
                          return (
                            <div key={i} style={{ ...styles.dependentCard, borderColor: hasMissing ? '#ef4444' : 'rgba(255,255,255,0.06)' }}>
                              <div>
                                <div style={{ fontWeight: 600, color: '#e2e8f0' }}>
                                  {dep.name || `${dep.first_name || ''} ${dep.last_name || ''}`.trim() || `Dependent ${i + 1}`}
                                  {hasMissing && <span style={{ marginLeft: 8, color: '#ef4444', fontSize: 12 }}>⚠️ Missing Info</span>}
                                </div>
                                <div style={{ fontSize: 13, color: '#64748b' }}>
                                  {dep.relationship || 'Dependent'} • SSN: {maskSSN(dep.ssn)}
                                </div>
                              </div>
                              <div style={{ display: 'flex', gap: 8 }}>
                                <button onClick={() => openDependentModal(i)} style={styles.smallBtn}>✏️ Edit</button>
                                <button onClick={() => deleteDependent(i)} style={{ ...styles.smallBtn, backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#f87171' }}>🗑️</button>
                              </div>
                            </div>
                          );
                        })
                      )}
                      
                      <button onClick={() => openDependentModal('new')} style={styles.addBtn}>➕ Add Dependent</button>
                    </div>
                  )}
                </>
              )}

              {/* STEP 2: INCOME */}
              {step === 2 && (
                <div>
                  <h3 style={styles.sectionTitle}>💵 Income Summary</h3>
                  <div style={styles.dataCard}>
                    <div style={styles.dataRow}><span>Total Wages</span><span style={{ color: '#10b981' }}>${Number(wages).toLocaleString()}</span></div>
                    <div style={styles.dataRow}><span>Interest Income</span><span>${Number(interest).toLocaleString()}</span></div>
                    <div style={styles.dataRow}><span>Dividend Income</span><span>${Number(dividends).toLocaleString()}</span></div>
                    <div style={{ ...styles.dataRow, ...styles.totalRow, fontWeight: 600 }}>
                      <span style={{ color: '#e2e8f0' }}>Total Income</span>
                      <span style={{ color: '#10b981' }}>${Number(incomeData?.totalIncome || wages).toLocaleString()}</span>
                    </div>
                  </div>
                  
                  <h3 style={{ ...styles.sectionTitle, marginTop: 24 }}>💳 Tax Withholding</h3>
                  <div style={styles.dataCard}>
                    <div style={styles.dataRow}><span>Federal Withholding</span><span style={{ color: '#10b981' }}>${Number(incomeData?.federalWithholding || 0).toLocaleString()}</span></div>
                    <div style={styles.dataRow}><span>State Withholding</span><span style={{ color: '#10b981' }}>${Number(incomeData?.stateWithholding || 0).toLocaleString()}</span></div>
                  </div>
                </div>
              )}

              {/* STEP 3: SUMMARY */}
              {step === 3 && (
                <div>
                  <h3 style={styles.sectionTitle}>🔍 Tax Summary</h3>
                  <div style={styles.summaryBox}>
                    <div style={styles.summaryRow}><span style={{ color: '#94a3b8' }}>Filing Status</span><span style={{ color: '#e2e8f0' }}>{FILING_STATUS_OPTIONS.find(o => o.value === userData?.filing_status)?.label || 'Single'}</span></div>
                    <div style={styles.summaryRow}><span style={{ color: '#94a3b8' }}>Dependents</span><span style={{ color: '#e2e8f0' }}>{dependents.length}</span></div>
                    <div style={styles.summaryRow}><span style={{ color: '#94a3b8' }}>Total Income</span><span style={{ color: '#10b981' }}>${Number(incomeData?.totalIncome || wages).toLocaleString()}</span></div>
                    <div style={styles.summaryRow}><span style={{ color: '#94a3b8' }}>Standard Deduction</span><span style={{ color: '#f59e0b' }}>-${Number(incomeData?.standardDeduction || 15750).toLocaleString()}</span></div>
                    <div style={styles.summaryRow}><span style={{ color: '#94a3b8' }}>Federal Tax</span><span style={{ color: '#ef4444' }}>${Number(incomeData?.federalTax || 0).toLocaleString()}</span></div>
                    <div style={styles.summaryRow}><span style={{ color: '#94a3b8' }}>Total Withholding</span><span style={{ color: '#10b981' }}>${Number(incomeData?.federalWithholding || 0).toLocaleString()}</span></div>
                  </div>
                  
                  {(incomeData?.federalRefund || 0) > 0 ? (
                    <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', border: '2px solid rgba(16, 185, 129, 0.4)', borderRadius: 12, padding: 20, textAlign: 'center' }}>
                      <p style={{ margin: 0, color: '#94a3b8', fontSize: 14 }}>Estimated Federal Refund</p>
                      <p style={{ margin: '8px 0 0', color: '#10b981', fontSize: 32, fontWeight: 700 }}>${Number(incomeData.federalRefund).toLocaleString()}</p>
                    </div>
                  ) : (incomeData?.federalOwed || 0) > 0 && (
                    <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '2px solid rgba(239, 68, 68, 0.4)', borderRadius: 12, padding: 20, textAlign: 'center' }}>
                      <p style={{ margin: 0, color: '#94a3b8', fontSize: 14 }}>Estimated Amount Owed</p>
                      <p style={{ margin: '8px 0 0', color: '#ef4444', fontSize: 32, fontWeight: 700 }}>${Number(incomeData.federalOwed).toLocaleString()}</p>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 4: SIGN */}
              {step === 4 && (
                <div>
                  <h3 style={styles.sectionTitle}>✍️ Sign Your Return</h3>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Your Signature (Type Full Name)</label>
                    <input type="text" value={signature} onChange={e => setSignature(e.target.value)} style={styles.input} placeholder="John M Smith" />
                  </div>
                  {isMFJ && (
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Spouse Signature</label>
                      <input type="text" value={spouseSignature} onChange={e => setSpouseSignature(e.target.value)} style={styles.input} placeholder="Jane A Smith" />
                    </div>
                  )}
                  <label style={styles.checkboxLabel}>
                    <input type="checkbox" checked={agreedTerms} onChange={e => setAgreedTerms(e.target.checked)} style={styles.checkbox} />
                    <span>I declare under penalty of perjury that this return is true, correct, and complete.</span>
                  </label>
                </div>
              )}

              {/* STEP 5: PLAN */}
              {step === 5 && (
                <div>
                  <h3 style={styles.sectionTitle}>💳 Choose Your Plan</h3>
                  <div style={styles.planGrid}>
                    {Object.values(PLANS).slice(0, 3).map(p => (
                      <div key={p.id} onClick={() => setSelectedPlan(p.id)} style={{ ...styles.planCard, borderColor: selectedPlan === p.id ? '#7c3aed' : 'rgba(255,255,255,0.1)' }}>
                        <span style={{ fontSize: 24 }}>{p.icon}</span>
                        <span style={{ fontWeight: 600, color: '#e2e8f0', fontSize: 13 }}>{p.name}</span>
                        <span style={{ color: '#10b981', fontWeight: 700 }}>${p.price}</span>
                      </div>
                    ))}
                  </div>
                  
                  <label style={styles.checkboxLabel}>
                    <input type="checkbox" checked={includeCPA} onChange={e => setIncludeCPA(e.target.checked)} style={styles.checkbox} />
                    <span>👨‍💼 Add CPA Review (+${cpaFee})</span>
                  </label>
                  
                  <label style={styles.checkboxLabel}>
                    <input type="checkbox" checked={includeState} onChange={e => setIncludeState(e.target.checked)} style={styles.checkbox} />
                    <span>📍 Include State Return (California)</span>
                  </label>
                  
                  <div style={styles.totalBox}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, fontWeight: 600 }}>
                      <span style={{ color: '#e2e8f0' }}>Total</span>
                      <span style={{ color: '#10b981' }}>${totalPrice.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 6: DOWNLOAD */}
              {step === 6 && (
                <>
                  {showPaymentFlow ? (
                    <PaymentFlow planId={selectedPlan} amount={totalPrice} onSuccess={() => { setShowPaymentFlow(false); setPdfGenerated(true); }} onCancel={() => setShowPaymentFlow(false)} />
                  ) : (
                    <div style={{ textAlign: 'center', padding: 24 }}>
                      <h3 style={{ ...styles.sectionTitle, textAlign: 'center' }}>📥 Download Your Return</h3>
                      {totalPrice > 0 && !pdfGenerated ? (
                        <button onClick={() => setShowPaymentFlow(true)} style={styles.downloadBtn}>💳 Pay ${totalPrice.toFixed(2)} & Download</button>
                      ) : (
                        <button onClick={downloadForm1040} disabled={downloadingPdf} style={{ ...styles.downloadBtn, opacity: downloadingPdf ? 0.7 : 1 }}>
                          {downloadingPdf ? '⏳ Generating...' : '📄 Download Form 1040'}
                        </button>
                      )}
                      {pdfGenerated && <p style={{ color: '#10b981', marginTop: 16 }}>✅ PDF downloaded successfully!</p>}
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
          <button onClick={handleNext} disabled={step === 1 && totalMissing > 0} style={{ ...styles.nextBtn, backgroundColor: (step === 1 && totalMissing > 0) ? '#64748b' : '#7c3aed' }}>
            {step === 6 ? 'Done' : 'Continue →'}
          </button>
        </div>

        {/* Dependent Modal */}
        {editingDependent !== null && (
          <div style={styles.modalOverlay}>
            <div style={styles.editModal}>
              <h3 style={{ margin: '0 0 16px', color: '#e2e8f0' }}>{editingDependent === 'new' ? '➕ Add Dependent' : '✏️ Edit Dependent'}</h3>
              <div style={styles.formGrid}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>First Name *</label>
                  <input type="text" value={dependentFormData.first_name} onChange={e => setDependentFormData({ ...dependentFormData, first_name: e.target.value })} style={styles.input} />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Last Name *</label>
                  <input type="text" value={dependentFormData.last_name} onChange={e => setDependentFormData({ ...dependentFormData, last_name: e.target.value })} style={styles.input} />
                </div>
              </div>
              <div style={styles.formGrid}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>SSN *</label>
                  <input type="text" value={formatSSN(dependentFormData.ssn)} onChange={e => setDependentFormData({ ...dependentFormData, ssn: e.target.value.replace(/\D/g, '') })} style={styles.input} placeholder="XXX-XX-XXXX" />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Relationship</label>
                  <select value={dependentFormData.relationship} onChange={e => setDependentFormData({ ...dependentFormData, relationship: e.target.value })} style={styles.select}>
                    <option value="child">Child</option>
                    <option value="stepchild">Stepchild</option>
                    <option value="foster_child">Foster Child</option>
                    <option value="sibling">Sibling</option>
                    <option value="grandchild">Grandchild</option>
                    <option value="parent">Parent</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Date of Birth</label>
                <input type="date" value={dependentFormData.date_of_birth} onChange={e => setDependentFormData({ ...dependentFormData, date_of_birth: e.target.value })} style={styles.input} />
              </div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 20 }}>
                <button onClick={() => setEditingDependent(null)} style={styles.backBtn}>Cancel</button>
                <button onClick={saveDependent} disabled={!dependentFormData.first_name || !dependentFormData.last_name || !dependentFormData.ssn} style={{ ...styles.nextBtn, opacity: (!dependentFormData.first_name || !dependentFormData.ssn) ? 0.5 : 1 }}>Save</button>
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
  stepIndicator: { display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, backgroundColor: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)', flexWrap: 'wrap', gap: 4 },
  stepItem: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 },
  stepCircle: { width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 14 },
  stepLabel: { fontSize: 10, fontWeight: 500 },
  stepLine: { width: 20, height: 3, margin: '0 4px', borderRadius: 2, marginBottom: 16 },
  content: { padding: 24, overflowY: 'auto', flex: 1, backgroundColor: '#0f172a' },
  loadingBox: { textAlign: 'center', padding: 60 },
  spinner: { width: 40, height: 40, border: '4px solid rgba(255,255,255,0.1)', borderTopColor: '#7c3aed', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' },
  
  alertBox: { backgroundColor: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.4)', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 13, color: '#fbbf24' },
  
  tabs: { display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' },
  tab: { padding: '8px 16px', backgroundColor: 'transparent', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center' },
  tabActive: { backgroundColor: 'rgba(124, 58, 237, 0.2)', color: '#a78bfa', borderColor: 'rgba(124, 58, 237, 0.4)' },
  
  sectionTitle: { margin: '0 0 16px', fontSize: 18, fontWeight: 700, color: '#e2e8f0' },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 16 },
  formGroup: { marginBottom: 12 },
  label: { display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: '#94a3b8' },
  input: { width: '100%', padding: 12, fontSize: 14, border: '2px solid rgba(255,255,255,0.1)', borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.05)', color: '#e2e8f0', boxSizing: 'border-box' },
  select: { width: '100%', padding: 12, fontSize: 14, border: '2px solid rgba(255,255,255,0.1)', borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.05)', color: '#e2e8f0', boxSizing: 'border-box' },
  infoBox: { backgroundColor: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: 12, padding: 16, color: '#94a3b8' },
  
  dataCard: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 16, marginBottom: 16, border: '1px solid rgba(255,255,255,0.06)' },
  dataRow: { display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#94a3b8', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' },
  totalRow: { borderBottom: 'none', paddingTop: 12, marginTop: 8, borderTop: '2px solid rgba(255,255,255,0.1)' },
  summaryBox: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 16, marginBottom: 16, border: '1px solid rgba(255,255,255,0.06)' },
  summaryRow: { display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' },
  
  dependentCard: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 16, marginBottom: 12, border: '1px solid rgba(255,255,255,0.06)' },
  smallBtn: { padding: '6px 12px', backgroundColor: 'rgba(124, 58, 237, 0.2)', color: '#a78bfa', border: '1px solid rgba(124, 58, 237, 0.3)', borderRadius: 6, cursor: 'pointer', fontSize: 12 },
  addBtn: { padding: '12px 20px', backgroundColor: 'rgba(124, 58, 237, 0.2)', color: '#a78bfa', border: '2px dashed rgba(124, 58, 237, 0.4)', borderRadius: 12, cursor: 'pointer', fontSize: 14, width: '100%' },
  
  planGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 },
  planCard: { padding: 12, borderRadius: 10, cursor: 'pointer', textAlign: 'center', border: '2px solid', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.03)' },
  totalBox: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 16, marginTop: 16 },
  
  checkboxLabel: { display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13, color: '#94a3b8', cursor: 'pointer', marginTop: 16 },
  checkbox: { width: 18, height: 18, cursor: 'pointer', marginTop: 2, accentColor: '#7c3aed' },
  
  downloadBtn: { padding: '16px 32px', background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)', color: 'white', border: 'none', borderRadius: 12, cursor: 'pointer', fontSize: 18, fontWeight: 600 },
  
  footer: { display: 'flex', justifyContent: 'space-between', padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.06)', backgroundColor: 'rgba(255,255,255,0.02)' },
  backBtn: { padding: '10px 20px', fontSize: 14, fontWeight: 500, backgroundColor: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '2px solid rgba(255,255,255,0.1)', borderRadius: 10, cursor: 'pointer' },
  nextBtn: { padding: '10px 24px', fontSize: 14, fontWeight: 600, color: 'white', border: 'none', borderRadius: 10, cursor: 'pointer', backgroundColor: '#7c3aed' },
  
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 },
  editModal: { backgroundColor: '#1e293b', borderRadius: 16, padding: 24, width: '90%', maxWidth: 450, maxHeight: '80vh', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.1)' },
};