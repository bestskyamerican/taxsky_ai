// ============================================================
// CPA REVIEW TAX - Submit Anonymized → CPA Bids → Pick → Pay
// ============================================================
// Location: src/components/CPAReviewTax.jsx
//
// Steps 1-4 identical to SubmitFlow (Info, Income, Review, Sign)
// Step 5: Post ANONYMIZED data to CPA Bid Board (FREE)
// Step 6: See bids → Pick CPA (pay their price) → CPA files to IRS
//
// SSN SECURITY:
//   - Bid Board: NO name, NO SSN, NO address (anonymized)
//   - After CPA assigned: name + address revealed (NO SSN)
//   - PDF generation: server injects SSN, CPA never sees it
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  API_BASE,
  PYTHON_API,
  STATE_FORM_CONFIG,
  NO_TAX_STATES,
  FILING_STATUS_OPTIONS,
  getStateConfig,
  isNoTaxState,
  getStateName,
  getIncomeRange,
  maskSSN,
  postAnonymizedJob,
  fetchJobBids,
  acceptCPABid,
  timeAgo,
} from './taxFlowShared';

// ─── STEPS ─────────────────────────────────────────────────
const STEPS = [
  { num: 1, title: 'Info',   icon: '📝' },
  { num: 2, title: 'Income', icon: '💵' },
  { num: 3, title: 'Review', icon: '🔍' },
  { num: 4, title: 'Sign',   icon: '✍️' },
  { num: 5, title: 'Submit', icon: '📤' },
  { num: 6, title: 'Bids',   icon: '🏷️' },
];

// ─── SECURE SSN INPUT (same as SubmitFlow) ─────────────────
const SecureSSNInput = ({ value = '', onChange, onBlur, placeholder = "•••-••-••••", disabled = false, error = null, label = "Social Security Number", required = true, inputStyle = {} }) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showFull, setShowFull] = useState(false);
  const formatSSN = (ssn) => { if (!ssn) return ''; const c = ssn.replace(/\D/g, '').slice(0, 9); if (c.length <= 3) return c; if (c.length <= 5) return `${c.slice(0,3)}-${c.slice(3)}`; return `${c.slice(0,3)}-${c.slice(3,5)}-${c.slice(5)}`; };
  const maskIt = (ssn) => { if (!ssn) return ''; const c = ssn.replace(/\D/g, ''); if (c.length < 4) return '•••-••-••••'; return `•••-••-${c.slice(-4)}`; };
  const handleChange = useCallback((e) => { onChange(e.target.value.replace(/\D/g, '').slice(0, 9)); }, [onChange]);
  const getDisplay = () => { if (!value) return ''; if (showFull || isFocused) return formatSSN(value); return maskIt(value); };
  const isComplete = value && value.replace(/\D/g, '').length === 9;
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={ssnS.label}><span>{label} {required && <span style={{ color: '#ef4444' }}>*</span>}</span><span style={ssnS.badge}>🔒 Secure</span></label>
      <div style={ssnS.wrap}>
        <input type={showFull ? "text" : "password"} inputMode="numeric" value={getDisplay()} onChange={handleChange} onFocus={() => setIsFocused(true)} onBlur={(e) => { setIsFocused(false); setShowFull(false); onBlur?.(e); }} placeholder={placeholder} disabled={disabled} autoComplete="off" style={{ ...ssnS.input, ...inputStyle, borderColor: error ? '#ef4444' : isComplete ? '#10b981' : isFocused ? '#7c3aed' : 'rgba(255,255,255,0.1)' }} />
        <button type="button" onClick={(e) => { e.preventDefault(); setShowFull(!showFull); }} style={ssnS.toggleBtn} tabIndex={-1}>{showFull ? '🙈' : '👁️'}</button>
        {isComplete && <span style={ssnS.valid}>✓</span>}
      </div>
      {error && <p style={ssnS.err}>{error}</p>}
    </div>
  );
};
const ssnS = {
  label: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, fontWeight: 500, marginBottom: 6, color: '#94a3b8' },
  badge: { fontSize: 11, color: '#10b981', background: 'rgba(16, 185, 129, 0.15)', padding: '3px 8px', borderRadius: 4, fontWeight: 600 },
  wrap: { position: 'relative', display: 'flex', alignItems: 'center' },
  input: { width: '100%', padding: '12px 70px 12px 14px', fontSize: 16, fontFamily: 'monospace', letterSpacing: 2, border: '2px solid rgba(255,255,255,0.1)', borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.05)', color: '#e2e8f0', boxSizing: 'border-box', outline: 'none' },
  toggleBtn: { position: 'absolute', right: 36, background: 'none', border: 'none', cursor: 'pointer', padding: 6, fontSize: 16 },
  valid: { position: 'absolute', right: 12, color: '#10b981', fontSize: 16, fontWeight: 'bold' },
  err: { marginTop: 4, fontSize: 12, color: '#ef4444' },
};

// ─── MAIN COMPONENT ────────────────────────────────────────
export default function CPAReviewTax({ onClose, taxData, userData: initialUserData, userId, token }) {
  const navigate = useNavigate();
  const { language } = useLanguage?.() || { language: 'en' };

  // ── State (same as SubmitFlow steps 1-4) ──
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
  const [editingDependent, setEditingDependent] = useState(null);
  const [dependentFormData, setDependentFormData] = useState({ first_name: '', last_name: '', ssn: '', relationship: 'child', date_of_birth: '', months_lived: 12 });
  const [signature, setSignature] = useState('');
  const [spouseSignature, setSpouseSignature] = useState('');
  const [agreedTerms, setAgreedTerms] = useState(false);

  // ── Step 5: Submit to Bid Board ──
  const [includeState, setIncludeState] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [jobPosted, setJobPosted] = useState(false);
  const [jobId, setJobId] = useState(null);

  // ── Step 6: Track Bids → Pick CPA → Pay ──
  const [bids, setBids] = useState([]);
  const [loadingBids, setLoadingBids] = useState(false);
  const [selectedBid, setSelectedBid] = useState(null);
  const [paymentComplete, setPaymentComplete] = useState(false);

  // ── Derived ──
  const userState = userData?.state || 'CA';
  const userStateConfig = getStateConfig(userState);
  const userStateName = getStateName(userState);
  const userStateIsNoTax = isNoTaxState(userState);
  const isMFJ = userData?.filing_status === 'married_filing_jointly';
  const wages = incomeData?.wages || 0;
  const totalMissing = missingFields.length + dependentMissing.length;
  const federalNet = (incomeData?.federalRefund || 0) - (incomeData?.federalOwed || 0);
  const stateNet = (incomeData?.stateRefund || 0) - (incomeData?.stateOwed || 0);
  const totalNet = federalNet + stateNet;

  // ══════════════════════════════════════════════════════════
  // DATA LOADING (same as SubmitFlow)
  // ══════════════════════════════════════════════════════════
  useEffect(() => {
    const isMFJ = userData?.filing_status === 'married_filing_jointly';
    const required = [
      { field: 'first_name', label: 'First Name', minLength: 1 },
      { field: 'last_name', label: 'Last Name', minLength: 1 },
      { field: 'ssn', label: 'SSN', minLength: 9, isSSN: true },
      { field: 'address', label: 'Street Address', minLength: 1 },
      { field: 'city', label: 'City', minLength: 1 },
      { field: 'state', label: 'State', minLength: 2 },
      { field: 'zip', label: 'ZIP', minLength: 5 },
    ];
    if (isMFJ) {
      required.push({ field: 'spouse_first_name', label: 'Spouse First Name', minLength: 1 }, { field: 'spouse_last_name', label: 'Spouse Last Name', minLength: 1 }, { field: 'spouse_ssn', label: 'Spouse SSN', minLength: 9, isSSN: true });
    }
    const missing = required.filter(r => { const v = userData?.[r.field]; if (!v) return true; if (r.isSSN) return String(v).replace(/\D/g, '').length < r.minLength; return String(v).trim().length < r.minLength; });
    setMissingFields(missing);
    const depM = dependents.map((d, i) => (!d.ssn || String(d.ssn).replace(/\D/g, '').length < 9) ? { field: `dep_${i}_ssn`, label: `${d.first_name || d.name || `Dependent ${i+1}`} SSN` } : null).filter(Boolean);
    setDependentMissing(depM);
  }, [userData, dependents]);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    if (!userId) { setLoading(false); return; }
    try {
      let baseUD = initialUserData || {};
      let baseDeps = [];
      try {
        const res = await fetch(`${API_BASE}/api/ai/data/${userId}?taxYear=2025`, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          const d = await res.json();
          if (d.success && d.answers) {
            const a = d.answers || {};
            baseUD = { ...baseUD, first_name: a.first_name || a.taxpayer_first_name || baseUD.first_name || '', last_name: a.last_name || a.taxpayer_last_name || baseUD.last_name || '', ssn: a.ssn || a.taxpayer_ssn || baseUD.ssn || '', address: a.address || a.street_address || baseUD.address || '', city: a.city || baseUD.city || '', state: a.state || baseUD.state || 'CA', zip: a.zip || a.zip_code || baseUD.zip || '', filing_status: d.filing_status || a.filing_status || baseUD.filing_status || 'single', spouse_first_name: a.spouse_first_name || baseUD.spouse_first_name || '', spouse_last_name: a.spouse_last_name || baseUD.spouse_last_name || '', spouse_ssn: a.spouse_ssn || baseUD.spouse_ssn || '' };
            if (d.dependents?.length > 0) baseDeps = d.dependents;
          }
        }
      } catch (e) { console.log('[CPA_REVIEW] AI data error:', e); }
      try {
        const res = await fetch(`${PYTHON_API}/api/user/${userId}/form1040/missing?tax_year=2025`);
        if (res.ok) {
          const d = await res.json();
          if (d.success) { baseUD = { ...d.current_data, ...baseUD }; if (d.dependents?.length > 0 && baseDeps.length === 0) baseDeps = d.dependents; }
        }
      } catch (e) { console.log('[CPA_REVIEW] Python API error:', e); }
      setUserData(baseUD);
      setDependents(baseDeps);
      if (taxData && Object.keys(taxData).length > 0) {
        setForm1040Data({ header: { tax_year: 2025, filing_status: taxData?.filing_status || baseUD?.filing_status || 'single' }, income: { line_1_wages: taxData?.wages || 0, line_2b_taxable_interest: taxData?.interest || 0, line_3b_ordinary_dividends: taxData?.dividends || 0, line_9_total_income: taxData?.totalIncome || taxData?.wages || 0 }, deductions: { line_12_deduction: taxData?.standardDeduction || 15000, line_15_taxable_income: taxData?.taxableIncome || 0 }, tax_and_credits: { line_16_tax: taxData?.federalTax || 0, line_19_child_tax_credit: taxData?.childTaxCredit || 0 }, payments: { line_25a_w2_withholding: taxData?.federalWithholding || 0 }, refund_or_owe: { line_35_refund: taxData?.federalRefund || 0, line_37_amount_owed: taxData?.federalOwed || 0 } });
        setIncomeData(taxData);
      }
    } catch (e) { console.error('[CPA_REVIEW] Load error:', e); }
    finally { setLoading(false); }
  }

  function handleFieldChange(field, value) {
    setUserData(prev => ({ ...prev, [field]: value }));
    clearTimeout(window._cpaSaveTimeout);
    window._cpaSaveTimeout = setTimeout(async () => {
      setSaveStatus('saving');
      try {
        const res = await fetch(`${PYTHON_API}/api/user/${userId}/form1040/update?tax_year=2025`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ [field]: value }) });
        const d = await res.json();
        setSaveStatus(d.success ? 'saved' : 'error');
        setTimeout(() => setSaveStatus(''), 2000);
      } catch { setSaveStatus('error'); }
    }, 1000);
  }

  function openDependentModal(index = 'new') {
    setEditingDependent(index);
    if (index === 'new') { setDependentFormData({ first_name: '', last_name: '', ssn: '', relationship: 'child', date_of_birth: '', months_lived: 12 }); }
    else { const d = dependents[index]; setDependentFormData({ first_name: d.first_name || d.name?.split(' ')[0] || '', last_name: d.last_name || d.name?.split(' ').slice(1).join(' ') || '', ssn: d.ssn || '', relationship: d.relationship || 'child', date_of_birth: d.date_of_birth || '', months_lived: d.months_lived || 12 }); }
  }
  async function saveDependent() {
    const dep = { ...dependentFormData, ssn: dependentFormData.ssn.replace(/\D/g, ''), name: `${dependentFormData.first_name} ${dependentFormData.last_name}`.trim() };
    const updated = editingDependent === 'new' ? [...dependents, dep] : dependents.map((d, i) => i === editingDependent ? dep : d);
    try { await fetch(`${PYTHON_API}/api/user/${userId}/dependents`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dependents: updated }) }); } catch {}
    setDependents(updated);
    setEditingDependent(null);
  }
  async function deleteDependent(index) {
    if (!confirm('Remove this dependent?')) return;
    const updated = dependents.filter((_, i) => i !== index);
    try { await fetch(`${PYTHON_API}/api/user/${userId}/dependents`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dependents: updated }) }); } catch {}
    setDependents(updated);
  }

  // ══════════════════════════════════════════════════════════
  // STEP 5: Post Anonymized Job to Bid Board (FREE)
  // ══════════════════════════════════════════════════════════
  async function handleSubmitToBidBoard() {
    setSubmitting(true);
    try {
      const hasStateTax = !isNoTaxState(userState);
      const formsNeeded = (includeState && hasStateTax) ? 2 : 1;
      const result = await postAnonymizedJob({
        userId,
        token,
        state: userState,
        filingStatus: userData?.filing_status || 'single',
        incomeRange: getIncomeRange(incomeData?.totalIncome || wages),
        dependentsCount: dependents.length,
        formsNeeded,
        includeState,
        hasStateTax,
      });
      if (result.success) {
        setJobPosted(true);
        setJobId(result.job_id || result.job?.id || result.id || null);
        setStep(6);
        loadBids(result.job_id || result.job?.id || result.id);
      } else {
        alert(result.message || 'Failed to submit. Please try again.');
      }
    } catch (e) {
      console.error('[CPA_REVIEW] Submit error:', e);
      alert('Error submitting to bid board. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  // ══════════════════════════════════════════════════════════
  // STEP 6: Bids → Pick → Pay → CPA Files
  // ══════════════════════════════════════════════════════════
  const loadBids = useCallback(async (jId) => {
    const id = jId || jobId;
    if (!id) return;
    setLoadingBids(true);
    try {
      const data = await fetchJobBids(id, token);
      if (data.success) setBids(data.bids || []);
    } catch (e) { console.error('[CPA_REVIEW] Load bids error:', e); }
    finally { setLoadingBids(false); }
  }, [jobId, token]);

  // Auto-refresh bids every 15s
  useEffect(() => {
    if (step !== 6 || !jobId || paymentComplete) return;
    const interval = setInterval(() => loadBids(), 15000);
    return () => clearInterval(interval);
  }, [step, jobId, paymentComplete, loadBids]);

  // User picks a CPA → navigate to Stripe checkout with bid price
  function handlePickCPA(bid) {
    setSelectedBid(bid);

    // Save CPA bid payment info for checkout page
    const paymentData = {
      planId: 'cpa-review',
      planName: `CPA Review by ${bid.cpa_name}`,
      planIcon: '👨‍💼',
      price: Math.round(Number(bid.bid_price) * 100),
      statePrice: 0,
      totalPrice: Math.round(Number(bid.bid_price) * 100),
      hasState: includeState,
      userState,
      userStateName,
      userStateIsNoTax,
      taxYear: 2025,
      paymentMethod: 'stripe',
      // CPA bid details (for post-payment assignment)
      cpaBid: {
        bid_id: bid._id || bid.id || bid.bid_id,
        job_id: jobId,
        cpa_name: bid.cpa_name,
        cpa_credentials: bid.cpa_credentials,
        bid_price: bid.bid_price,
        estimated_hours: bid.estimated_hours,
      },
    };

    localStorage.setItem('taxsky_payment', JSON.stringify(paymentData));

    // Navigate to Stripe checkout (page change unmounts this component)
    navigate(`/payment/checkout/cpa-review?amount=${Math.round(Number(bid.bid_price) * 100)}`);
  }

  // ── Navigation ──
  function handleNext() {
    if (step === 1 && totalMissing > 0) { alert(`Please fill in all required fields:\n\n${[...missingFields, ...dependentMissing].map(m => `• ${m.label || m.field}`).join('\n')}`); return; }
    if (step === 5) { handleSubmitToBidBoard(); return; }
    if (step === 6) { onClose(); return; }
    setStep(Math.min(step + 1, 6));
  }
  function handleBack() { if (step === 6 && jobPosted) return; setStep(Math.max(step - 1, 1)); }
  function handleStepClick(t) { if (t === 6 && !jobPosted) return; if (t < step) { setStep(t); return; } if (step > 1 || totalMissing === 0) setStep(t); }
  function getFieldStyle(f) { const miss = missingFields.some(m => m.field === f); return { ...st.input, borderColor: miss ? '#ef4444' : 'rgba(255,255,255,0.1)', backgroundColor: miss ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255,255,255,0.05)' }; }

  // ════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════
  return (
    <div style={st.overlay}>
      <div style={st.modal}>

        {/* Header */}
        <div style={{ ...st.header, background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)' }}>
          <div><h2 style={st.headerTitle}>👨‍💼 CPA Service</h2><p style={st.headerSubtitle}>Tax Year 2025 — CPAs compete for your return</p></div>
          <button onClick={onClose} style={st.closeBtn}>×</button>
        </div>

        {/* Step Indicator */}
        <div style={st.stepIndicator}>
          {STEPS.map((s, idx) => (
            <React.Fragment key={s.num}>
              <div style={{ ...st.stepItem, cursor: (s.num <= step || step > 1 || totalMissing === 0) && !(s.num === 6 && !jobPosted) ? 'pointer' : 'not-allowed', opacity: (s.num <= step || step > 1 || totalMissing === 0) ? 1 : 0.5 }} onClick={() => handleStepClick(s.num)}>
                <div style={{ ...st.stepCircle, backgroundColor: step >= s.num ? '#7c3aed' : 'rgba(255,255,255,0.1)', color: step >= s.num ? 'white' : '#64748b', transform: step === s.num ? 'scale(1.15)' : 'scale(1)', transition: 'all 0.2s ease', boxShadow: step === s.num ? '0 0 12px rgba(124,58,237,0.5)' : 'none' }}>
                  {step > s.num ? '✓' : s.icon}
                </div>
                <span style={{ ...st.stepLabel, color: step >= s.num ? '#e2e8f0' : '#64748b', fontWeight: step === s.num ? 600 : 500 }}>{s.title}</span>
              </div>
              {idx < STEPS.length - 1 && <div style={{ ...st.stepLine, backgroundColor: step > s.num ? '#7c3aed' : 'rgba(255,255,255,0.1)' }} />}
            </React.Fragment>
          ))}
        </div>

        {/* Content */}
        <div style={st.content}>
          {loading ? (
            <div style={st.loadingBox}><div style={st.spinner} /><p style={{ color: '#94a3b8' }}>Loading your tax data...</p></div>
          ) : (
            <>
              {/* ═══════ STEP 1: INFO (same as SubmitFlow) ═══════ */}
              {step === 1 && (
                <>
                  {totalMissing > 0 && <div style={st.alertBox}><strong>⚠️ Missing Fields ({totalMissing}):</strong> {[...missingFields, ...dependentMissing].map(m => m.label || m.field).join(', ')}</div>}
                  {saveStatus && <div style={{ padding: '8px 12px', borderRadius: 8, marginBottom: 12, fontSize: 13, backgroundColor: saveStatus === 'saved' ? 'rgba(16,185,129,0.2)' : saveStatus === 'error' ? 'rgba(239,68,68,0.2)' : 'rgba(124,58,237,0.2)', color: saveStatus === 'saved' ? '#10b981' : saveStatus === 'error' ? '#ef4444' : '#a78bfa' }}>{saveStatus === 'saving' ? '💾 Saving...' : saveStatus === 'saved' ? '✅ Saved!' : '❌ Save failed'}</div>}
                  <div style={st.tabs}>
                    {['personal', 'spouse', 'dependents'].map(tab => {
                      if (tab === 'spouse' && !isMFJ) return null;
                      return <button key={tab} onClick={() => setEditTab(tab)} style={{ ...st.tab, ...(editTab === tab ? st.tabActive : {}) }}>{tab === 'personal' && '👤 Personal'}{tab === 'spouse' && '👫 Spouse'}{tab === 'dependents' && `👶 Dependents (${dependents.length})`}</button>;
                    })}
                  </div>
                  {editTab === 'personal' && (
                    <div>
                      <h3 style={st.sectionTitle}>👤 Personal Information</h3>
                      <div style={st.formGrid}><div><label style={st.label}>First Name *</label><input type="text" value={userData.first_name || ''} onChange={e => handleFieldChange('first_name', e.target.value)} style={getFieldStyle('first_name')} /></div><div><label style={st.label}>Last Name *</label><input type="text" value={userData.last_name || ''} onChange={e => handleFieldChange('last_name', e.target.value)} style={getFieldStyle('last_name')} /></div></div>
                      <div style={st.formGrid}><SecureSSNInput value={userData.ssn || ''} onChange={val => handleFieldChange('ssn', val)} label="SSN" inputStyle={getFieldStyle('ssn')} /><div><label style={st.label}>Filing Status *</label><select value={userData.filing_status || 'single'} onChange={e => handleFieldChange('filing_status', e.target.value)} style={st.select}>{FILING_STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div></div>
                      <h3 style={{ ...st.sectionTitle, marginTop: 24 }}>🏠 Address</h3>
                      <div><label style={st.label}>Street Address *</label><input type="text" value={userData.address || ''} onChange={e => handleFieldChange('address', e.target.value)} style={getFieldStyle('address')} /></div>
                      <div style={st.formGrid}><div><label style={st.label}>City *</label><input type="text" value={userData.city || ''} onChange={e => handleFieldChange('city', e.target.value)} style={getFieldStyle('city')} /></div><div><label style={st.label}>State *</label><input type="text" maxLength={2} value={userData.state || ''} onChange={e => handleFieldChange('state', e.target.value.toUpperCase())} style={getFieldStyle('state')} /></div><div><label style={st.label}>ZIP *</label><input type="text" inputMode="numeric" maxLength={10} value={userData.zip || ''} onChange={e => { handleFieldChange('zip', e.target.value.replace(/[^0-9-]/g, '').slice(0, 10)); }} style={getFieldStyle('zip')} placeholder="12345" /></div></div>
                    </div>
                  )}
                  {editTab === 'spouse' && (
                    <div>
                      <h3 style={st.sectionTitle}>👫 Spouse Information</h3>
                      <div style={st.formGrid}><div><label style={st.label}>First Name *</label><input type="text" value={userData.spouse_first_name || ''} onChange={e => handleFieldChange('spouse_first_name', e.target.value)} style={getFieldStyle('spouse_first_name')} /></div><div><label style={st.label}>Last Name *</label><input type="text" value={userData.spouse_last_name || ''} onChange={e => handleFieldChange('spouse_last_name', e.target.value)} style={getFieldStyle('spouse_last_name')} /></div></div>
                      <SecureSSNInput value={userData.spouse_ssn || ''} onChange={val => handleFieldChange('spouse_ssn', val)} label="Spouse SSN" inputStyle={getFieldStyle('spouse_ssn')} />
                    </div>
                  )}
                  {editTab === 'dependents' && (
                    <div>
                      <h3 style={st.sectionTitle}>👶 Dependents ({dependents.length})</h3>
                      {dependents.length === 0 ? <div style={st.infoBox}><p style={{ margin: 0 }}>No dependents added yet.</p></div> : dependents.map((dep, i) => (
                        <div key={i} style={st.dependentCard}><div><div style={{ fontWeight: 600, color: '#e2e8f0' }}>{dep.first_name || dep.name?.split(' ')[0]} {dep.last_name || dep.name?.split(' ').slice(1).join(' ')}</div><div style={{ fontSize: 13, color: '#64748b' }}>{dep.relationship} • SSN: {maskSSN(dep.ssn)}</div></div><div style={{ display: 'flex', gap: 8 }}><button onClick={() => openDependentModal(i)} style={st.smallBtn}>✏️</button><button onClick={() => deleteDependent(i)} style={{ ...st.smallBtn, backgroundColor: 'rgba(239,68,68,0.2)', color: '#f87171' }}>🗑️</button></div></div>
                      ))}
                      <button onClick={() => openDependentModal('new')} style={st.addBtn}>➕ Add Dependent</button>
                    </div>
                  )}
                </>
              )}

              {/* ═══════ STEP 2: INCOME (same as SubmitFlow) ═══════ */}
              {step === 2 && (
                <div>
                  <h3 style={st.sectionTitle}>💵 Income Summary</h3>
                  <div style={st.dataCard}><div style={st.dataRow}><span>Total Wages</span><span style={{ color: '#10b981' }}>${Number(wages).toLocaleString()}</span></div><div style={st.dataRow}><span>Interest Income</span><span>${Number(incomeData?.interest || 0).toLocaleString()}</span></div><div style={st.dataRow}><span>Dividend Income</span><span>${Number(incomeData?.dividends || 0).toLocaleString()}</span></div><div style={{ ...st.dataRow, borderTop: '2px solid rgba(255,255,255,0.1)', paddingTop: 12, marginTop: 8, fontWeight: 600 }}><span style={{ color: '#e2e8f0' }}>Total Income</span><span style={{ color: '#10b981' }}>${Number(incomeData?.totalIncome || wages).toLocaleString()}</span></div></div>
                  <h3 style={{ ...st.sectionTitle, marginTop: 24 }}>💳 Withholding</h3>
                  <div style={st.dataCard}><div style={st.dataRow}><span>Federal Withholding</span><span style={{ color: '#10b981' }}>${Number(incomeData?.federalWithholding || 0).toLocaleString()}</span></div><div style={st.dataRow}><span>State Withholding ({userState})</span><span style={{ color: '#10b981' }}>${Number(incomeData?.stateWithholding || 0).toLocaleString()}</span></div></div>
                </div>
              )}

              {/* ═══════ STEP 3: REVIEW (same as SubmitFlow) ═══════ */}
              {step === 3 && (
                <div>
                  <h3 style={st.sectionTitle}>🔍 Tax Summary</h3>
                  <div style={st.summaryBox}><div style={st.summaryRow}><span>Taxpayer</span><span style={{ color: '#e2e8f0' }}>{userData?.first_name || '—'} {userData?.last_name || '—'}</span></div><div style={st.summaryRow}><span>Filing Status</span><span style={{ color: '#e2e8f0' }}>{FILING_STATUS_OPTIONS.find(o => o.value === userData?.filing_status)?.label || 'Single'}</span></div><div style={st.summaryRow}><span>Dependents</span><span style={{ color: '#e2e8f0' }}>{dependents.length}</span></div><div style={st.summaryRow}><span>State</span><span style={{ color: '#e2e8f0' }}>{userStateName} ({userState})</span></div></div>
                  <div style={{ ...st.summaryBox, marginTop: 12 }}>
                    <h4 style={{ margin: '0 0 12px', color: '#3b82f6', fontSize: 14 }}>🇺🇸 Federal Tax Breakdown</h4>
                    <div style={st.summaryRow}><span>Total Income</span><span style={{ color: '#10b981' }}>${Number(incomeData?.totalIncome || wages).toLocaleString()}</span></div>
                    <div style={st.summaryRow}><span>Adjustments</span><span style={{ color: '#f59e0b' }}>-${Number(incomeData?.totalAdjustments || 0).toLocaleString()}</span></div>
                    <div style={{ ...st.summaryRow, fontWeight: 600 }}><span>AGI</span><span style={{ color: '#e2e8f0' }}>${Number(incomeData?.agi || incomeData?.totalIncome || wages).toLocaleString()}</span></div>
                    <div style={st.summaryRow}><span>Standard Deduction</span><span style={{ color: '#f59e0b' }}>-${Number(incomeData?.standardDeduction || 31500).toLocaleString()}</span></div>
                    <div style={{ ...st.summaryRow, fontWeight: 600 }}><span>Taxable Income</span><span style={{ color: '#e2e8f0' }}>${Number(incomeData?.taxableIncome || 0).toLocaleString()}</span></div>
                    <div style={{ ...st.summaryRow, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 8, marginTop: 8 }}><span>Federal Tax</span><span style={{ color: '#ef4444' }}>${Number(incomeData?.federalTax || 0).toLocaleString()}</span></div>
                    <div style={st.summaryRow}><span>Federal Withheld</span><span style={{ color: '#10b981' }}>+${Number(incomeData?.federalWithholding || 0).toLocaleString()}</span></div>
                  </div>
                  <div style={{ backgroundColor: federalNet >= 0 ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', border: `2px solid ${federalNet >= 0 ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)'}`, borderRadius: 12, padding: 16, marginTop: 12, textAlign: 'center' }}><p style={{ margin: 0, color: '#94a3b8', fontSize: 13 }}>🇺🇸 Federal {federalNet >= 0 ? 'Refund' : 'Owed'}</p><p style={{ margin: '4px 0 0', fontSize: 28, fontWeight: 700, color: federalNet >= 0 ? '#10b981' : '#ef4444' }}>${Math.abs(federalNet).toLocaleString()}</p></div>
                  {userStateIsNoTax ? (
                    <div style={{ backgroundColor: 'rgba(251,191,36,0.15)', border: '2px solid rgba(251,191,36,0.4)', borderRadius: 12, padding: 16, marginTop: 12, textAlign: 'center' }}><p style={{ margin: 0, color: '#fbbf24', fontSize: 16 }}>🎉 {userStateName} has no state income tax!</p></div>
                  ) : (
                    <div style={{ backgroundColor: stateNet >= 0 ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', border: `2px solid ${stateNet >= 0 ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)'}`, borderRadius: 12, padding: 16, marginTop: 12, textAlign: 'center' }}><p style={{ margin: 0, color: '#94a3b8', fontSize: 13 }}>🏛️ {userStateName} State {stateNet >= 0 ? 'Refund' : 'Owed'}</p><p style={{ margin: '4px 0 0', fontSize: 28, fontWeight: 700, color: stateNet >= 0 ? '#10b981' : '#ef4444' }}>${Math.abs(stateNet).toLocaleString()}</p></div>
                  )}
                  <div style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.2), rgba(59,130,246,0.2))', border: '2px solid rgba(124,58,237,0.4)', borderRadius: 12, padding: 20, marginTop: 16, textAlign: 'center' }}><p style={{ margin: 0, color: '#a78bfa', fontSize: 14, fontWeight: 600 }}>💰 TOTAL {totalNet >= 0 ? 'REFUND' : 'OWED'}</p><p style={{ margin: '8px 0 0', color: totalNet >= 0 ? '#10b981' : '#ef4444', fontSize: 36, fontWeight: 800 }}>${Math.abs(totalNet).toLocaleString()}</p></div>
                </div>
              )}

              {/* ═══════ STEP 4: SIGN (same as SubmitFlow) ═══════ */}
              {step === 4 && (
                <div>
                  <h3 style={st.sectionTitle}>✍️ Sign Your Return</h3>
                  <div style={st.formGroup}><label style={st.label}>Your Signature (Type Full Name)</label><input type="text" value={signature} onChange={e => setSignature(e.target.value)} style={{ ...st.input, fontFamily: "'Brush Script MT', cursive", fontSize: 22 }} placeholder={`${userData?.first_name || 'John'} ${userData?.last_name || 'Smith'}`} /></div>
                  {isMFJ && <div style={st.formGroup}><label style={st.label}>Spouse Signature</label><input type="text" value={spouseSignature} onChange={e => setSpouseSignature(e.target.value)} style={{ ...st.input, fontFamily: "'Brush Script MT', cursive", fontSize: 22 }} placeholder={`${userData?.spouse_first_name || ''} ${userData?.spouse_last_name || ''}`} /></div>}
                  <label style={st.checkboxLabel}><input type="checkbox" checked={agreedTerms} onChange={e => setAgreedTerms(e.target.checked)} style={st.checkbox} /><span>I declare under penalty of perjury that this return is true, correct, and complete.</span></label>
                </div>
              )}

              {/* ═══════ STEP 5: SUBMIT TO BID BOARD (FREE!) ═══════ */}
              {step === 5 && (
                <div>
                  <h3 style={st.sectionTitle}>📤 Submit for CPA Bids</h3>

                  {/* FREE banner */}
                  <div style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(5,150,105,0.1))', border: '2px solid rgba(16,185,129,0.3)', borderRadius: 14, padding: 20, marginBottom: 20, textAlign: 'center' }}>
                    <div style={{ fontSize: 36, marginBottom: 8 }}>🆓</div>
                    <p style={{ margin: 0, color: '#10b981', fontWeight: 700, fontSize: 18 }}>Posting is FREE</p>
                    <p style={{ margin: '6px 0 0', color: '#94a3b8', fontSize: 13 }}>CPAs bid their own price. You only pay after you pick one.</p>
                  </div>

                  {/* What CPAs will see (ANONYMIZED) */}
                  <div style={{ ...st.summaryBox, marginBottom: 16 }}>
                    <h4 style={{ margin: '0 0 4px', color: '#a78bfa', fontSize: 14 }}>🔒 What CPAs Will See (Anonymized)</h4>
                    <p style={{ margin: '0 0 12px', color: '#64748b', fontSize: 12 }}>No name, no SSN, no address — your privacy is protected</p>
                    <div style={st.summaryRow}><span>State</span><span style={{ color: '#e2e8f0' }}>{userStateName} ({userState})</span></div>
                    <div style={st.summaryRow}><span>Filing Status</span><span style={{ color: '#e2e8f0' }}>{FILING_STATUS_OPTIONS.find(o => o.value === userData?.filing_status)?.label || 'Single'}</span></div>
                    <div style={st.summaryRow}><span>Income Range</span><span style={{ color: '#e2e8f0' }}>{getIncomeRange(incomeData?.totalIncome || wages)}</span></div>
                    <div style={st.summaryRow}><span>Dependents</span><span style={{ color: '#e2e8f0' }}>{dependents.length}</span></div>
                    <div style={{ ...st.summaryRow, borderBottom: 'none' }}><span>Forms Needed</span><span style={{ color: '#e2e8f0' }}>Federal 1040{includeState && !userStateIsNoTax ? ` + ${userState} State` : ''}</span></div>
                  </div>

                  {/* What CPAs will NOT see */}
                  <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: 12, marginBottom: 16 }}>
                    <p style={{ margin: 0, fontSize: 12, color: '#f87171' }}>🔒 <strong>CPAs will NOT see:</strong> Your name, SSN, address, or exact income. These are only revealed after you pick a CPA and pay.</p>
                  </div>

                  {/* State toggle */}
                  <label style={st.checkboxLabel}><input type="checkbox" checked={includeState} onChange={e => setIncludeState(e.target.checked)} style={st.checkbox} /><span>📍 Include {userStateName} State Return{userStateIsNoTax && <span style={{ color: '#fbbf24', marginLeft: 8 }}>🎉 No state tax!</span>}</span></label>

                  {/* How it works */}
                  <div style={{ marginTop: 24, padding: 16, background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)' }}>
                    <h4 style={{ margin: '0 0 12px', color: '#e2e8f0', fontSize: 14 }}>🔄 How It Works</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {[
                        { n: '1', t: 'Your return is posted anonymously', c: '#10b981' },
                        { n: '2', t: 'Licensed CPAs bid their own price', c: '#f59e0b' },
                        { n: '3', t: 'You pick the CPA & price you like', c: '#3b82f6' },
                        { n: '4', t: 'Pay the CPA\'s price', c: '#a78bfa' },
                        { n: '5', t: 'CPA reviews & files with the IRS', c: '#10b981' },
                      ].map(i => (
                        <div key={i.n} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ width: 28, height: 28, borderRadius: '50%', backgroundColor: `${i.c}22`, color: i.c, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>{i.n}</div>
                          <span style={{ fontSize: 13, color: '#94a3b8' }}>{i.t}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ═══════ STEP 6: BIDS → PICK CPA → PAY → CPA FILES ═══════ */}
              {step === 6 && (
                <div>
                  {paymentComplete ? (
                    /* ── CPA Assigned — They handle everything ── */
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 12, padding: 20, marginBottom: 24 }}>
                        <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
                        <p style={{ color: '#10b981', fontWeight: 700, fontSize: 18, margin: '0 0 6px' }}>CPA Assigned!</p>
                        <p style={{ color: '#94a3b8', margin: 0, fontSize: 14 }}>
                          {selectedBid?.cpa_name} will review and file your return with the IRS.
                        </p>
                        <p style={{ color: '#64748b', margin: '6px 0 0', fontSize: 13 }}>
                          Paid ${Number(selectedBid?.bid_price || 0).toFixed(2)}
                        </p>
                      </div>

                      {/* Status Tracker */}
                      <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 14, border: '1px solid rgba(255,255,255,0.06)', padding: 24, textAlign: 'left' }}>
                        <h4 style={{ color: '#e2e8f0', margin: '0 0 16px', fontSize: 15, fontWeight: 600 }}>📋 What Happens Next</h4>
                        {[
                          { icon: '✅', label: 'Job posted to bid board', done: true },
                          { icon: '✅', label: `${selectedBid?.cpa_name} selected & paid`, done: true },
                          { icon: '🔄', label: 'CPA reviewing your return', done: false, active: true },
                          { icon: '⬜', label: 'CPA prepares & files with IRS', done: false },
                          { icon: '⬜', label: 'You receive confirmation', done: false },
                        ].map((s, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < 4 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                            <span style={{ fontSize: 18, width: 28, textAlign: 'center' }}>{s.icon}</span>
                            <span style={{ color: s.done ? '#10b981' : s.active ? '#a78bfa' : '#475569', fontWeight: s.active ? 600 : 400, fontSize: 14 }}>
                              {s.label}
                              {s.active && <span style={{ marginLeft: 8, fontSize: 11, color: '#f59e0b' }}>In Progress</span>}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* CPA Info Card */}
                      <div style={{ background: 'rgba(124,58,237,0.08)', borderRadius: 12, padding: 16, marginTop: 16, border: '1px solid rgba(124,58,237,0.2)', display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg, #7c3aed, #3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 18, flexShrink: 0 }}>{(selectedBid?.cpa_name || 'C')[0].toUpperCase()}</div>
                        <div>
                          <div style={{ fontWeight: 600, color: '#e2e8f0', fontSize: 14 }}>{selectedBid?.cpa_name}</div>
                          <div style={{ fontSize: 12, color: '#10b981' }}>✓ {selectedBid?.cpa_credentials || 'Licensed CPA'}</div>
                          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Estimated turnaround: {selectedBid?.estimated_hours || 24}h</div>
                        </div>
                      </div>

                      <p style={{ color: '#475569', fontSize: 12, marginTop: 16, lineHeight: 1.6 }}>
                        Your CPA has access to your return details (excluding your raw SSN). 
                        They will review, prepare, and file directly with the IRS on your behalf. 
                        You'll be notified when filing is complete.
                      </p>
                    </div>
                  ) : (
                    /* ── Bid Board: Browse & Pick CPA ── */
                    <div>
                      <h3 style={st.sectionTitle}>🏷️ CPA Bids</h3>

                      {/* Live status */}
                      <div style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 12, padding: 16, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#10b981', animation: 'pulse 2s infinite', flexShrink: 0 }} />
                        <div style={{ flex: 1 }}><p style={{ margin: 0, color: '#a78bfa', fontWeight: 600, fontSize: 14 }}>Your return is live on the Bid Board!</p><p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 12 }}>CPAs are being notified. Bids auto-refresh every 15 seconds.</p></div>
                        <button onClick={() => loadBids()} disabled={loadingBids} style={{ padding: '6px 14px', fontSize: 12, fontWeight: 600, color: '#94a3b8', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, cursor: 'pointer', flexShrink: 0 }}>{loadingBids ? '⟳' : '🔄'} Refresh</button>
                      </div>

                      {bids.length === 0 ? (
                        /* Waiting */
                        <div style={{ textAlign: 'center', padding: 40, background: 'rgba(255,255,255,0.02)', borderRadius: 14, border: '1px dashed rgba(255,255,255,0.08)' }}>
                          {loadingBids ? <><div style={{ ...st.spinner, margin: '0 auto 16px' }} /><p style={{ color: '#94a3b8' }}>Checking for bids...</p></> : <>
                            <p style={{ fontSize: 40, margin: '0 0 12px' }}>⏳</p>
                            <p style={{ color: '#e2e8f0', fontWeight: 600, fontSize: 16, margin: '0 0 6px' }}>Waiting for CPA Bids</p>
                            <p style={{ color: '#64748b', margin: 0, fontSize: 13 }}>Licensed CPAs are reviewing your return. Bids will appear here.</p>
                          </>}
                        </div>
                      ) : (
                        /* Bid cards */
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                          <p style={{ color: '#94a3b8', fontSize: 13, margin: '0 0 4px' }}><strong style={{ color: '#e2e8f0' }}>{bids.length}</strong> {bids.length === 1 ? 'CPA has bid' : 'CPAs have bid'} — pick the one you like!</p>
                          {bids.map((bid, i) => (
                            <div key={bid.id || i} style={{ padding: 16, borderRadius: 14, cursor: 'pointer', transition: 'all 0.2s', border: `2px solid ${selectedBid?.id === bid.id ? '#7c3aed' : 'rgba(255,255,255,0.06)'}`, backgroundColor: selectedBid?.id === bid.id ? 'rgba(124,58,237,0.08)' : 'rgba(255,255,255,0.02)' }} onClick={() => setSelectedBid(bid)}>
                              {/* CPA info + Price */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                                <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg, #7c3aed, #3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 18, flexShrink: 0 }}>{(bid.cpa_name || 'C')[0].toUpperCase()}</div>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontWeight: 600, color: '#e2e8f0', fontSize: 15 }}>{bid.cpa_name}</div>
                                  <div style={{ fontSize: 12, color: '#10b981' }}>✓ {bid.cpa_credentials || 'Licensed CPA'}</div>
                                </div>
                                {/* CPA's bid price */}
                                <div style={{ textAlign: 'right' }}>
                                  <div style={{ fontSize: 24, fontWeight: 800, color: '#10b981' }}>${Number(bid.bid_price || 0).toFixed(0)}</div>
                                  <div style={{ fontSize: 11, color: '#64748b' }}>{bid.estimated_hours || 24}h turnaround</div>
                                </div>
                              </div>
                              {/* Message */}
                              {bid.message && <div style={{ padding: 12, background: 'rgba(255,255,255,0.03)', borderRadius: 8, marginBottom: 10, border: '1px solid rgba(255,255,255,0.04)' }}><p style={{ margin: 0, fontSize: 13, color: '#94a3b8', lineHeight: 1.5, fontStyle: 'italic' }}>"{bid.message}"</p></div>}
                              {/* Time */}
                              {bid.created_at && <p style={{ margin: '0 0 10px', fontSize: 11, color: '#475569' }}>{timeAgo(bid.created_at)}</p>}
                              {/* Pick & Pay button */}
                              <button onClick={(e) => { e.stopPropagation(); handlePickCPA(bid); }} style={{ width: '100%', padding: 12, fontSize: 14, fontWeight: 600, color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', background: selectedBid?.id === bid.id ? 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)' : 'rgba(124,58,237,0.3)' }}>
                                💳 Select & Pay ${Number(bid.bid_price || 0).toFixed(0)}
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div style={st.footer}>
          <button onClick={step === 1 ? onClose : handleBack} disabled={step === 6 && jobPosted} style={{ ...st.backBtn, opacity: (step === 6 && jobPosted) ? 0.4 : 1, cursor: (step === 6 && jobPosted) ? 'not-allowed' : 'pointer' }}>{step === 1 ? 'Cancel' : '← Back'}</button>
          <button onClick={handleNext} disabled={(step === 1 && totalMissing > 0) || submitting || (step === 6 && !paymentComplete)} style={{ ...st.nextBtn, backgroundColor: (step === 1 && totalMissing > 0) ? '#64748b' : step === 5 ? '#10b981' : step === 6 ? (paymentComplete ? '#10b981' : '#64748b') : '#7c3aed', cursor: (step === 1 && totalMissing > 0) || submitting || (step === 6 && !paymentComplete) ? 'not-allowed' : 'pointer' }}>
            {step === 5 ? (submitting ? '⏳ Posting...' : '📤 Post to Bid Board — FREE') : step === 6 ? (paymentComplete ? 'Done ✓' : '🏷️ Waiting for Bids...') : 'Continue →'}
          </button>
        </div>

        {/* Dependent Modal */}
        {editingDependent !== null && (
          <div style={st.modalOverlay}><div style={st.editModal}>
            <h3 style={{ margin: '0 0 16px', color: '#e2e8f0' }}>{editingDependent === 'new' ? '➕ Add Dependent' : '✏️ Edit Dependent'}</h3>
            <div style={st.formGrid}><div><label style={st.label}>First Name *</label><input type="text" value={dependentFormData.first_name} onChange={e => setDependentFormData({ ...dependentFormData, first_name: e.target.value })} style={st.input} /></div><div><label style={st.label}>Last Name *</label><input type="text" value={dependentFormData.last_name} onChange={e => setDependentFormData({ ...dependentFormData, last_name: e.target.value })} style={st.input} /></div></div>
            <div style={st.formGrid}><SecureSSNInput value={dependentFormData.ssn || ''} onChange={val => setDependentFormData({ ...dependentFormData, ssn: val })} label="SSN" /><div><label style={st.label}>Relationship</label><select value={dependentFormData.relationship} onChange={e => setDependentFormData({ ...dependentFormData, relationship: e.target.value })} style={st.select}><option value="child">Child</option><option value="stepchild">Stepchild</option><option value="parent">Parent</option><option value="other">Other</option></select></div></div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 20 }}><button onClick={() => setEditingDependent(null)} style={st.backBtn}>Cancel</button><button onClick={saveDependent} disabled={!dependentFormData.first_name || !dependentFormData.ssn} style={{ ...st.nextBtn, backgroundColor: '#7c3aed', opacity: (!dependentFormData.first_name || !dependentFormData.ssn) ? 0.5 : 1 }}>Save</button></div>
          </div></div>
        )}
      </div>
      <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } } @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
    </div>
  );
}

// ─── STYLES (same as SubmitFlow) ───────────────────────────
const st = {
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 },
  modal: { backgroundColor: '#0f172a', borderRadius: 20, width: '100%', maxWidth: 650, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 50px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.06)' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', color: 'white' },
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
  alertBox: { backgroundColor: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.4)', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 13, color: '#fbbf24' },
  tabs: { display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' },
  tab: { padding: '8px 16px', backgroundColor: 'transparent', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, cursor: 'pointer', fontSize: 13 },
  tabActive: { backgroundColor: 'rgba(124,58,237,0.2)', color: '#a78bfa', borderColor: 'rgba(124,58,237,0.4)' },
  sectionTitle: { margin: '0 0 16px', fontSize: 18, fontWeight: 700, color: '#e2e8f0' },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16, marginBottom: 16 },
  formGroup: { marginBottom: 16 },
  label: { display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: '#94a3b8' },
  input: { width: '100%', padding: 12, fontSize: 14, border: '2px solid rgba(255,255,255,0.1)', borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.05)', color: '#e2e8f0', boxSizing: 'border-box', outline: 'none' },
  select: { width: '100%', padding: 12, fontSize: 14, border: '2px solid rgba(255,255,255,0.1)', borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.05)', color: '#e2e8f0', boxSizing: 'border-box' },
  infoBox: { backgroundColor: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 12, padding: 16, color: '#94a3b8' },
  dataCard: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 16, marginBottom: 16, border: '1px solid rgba(255,255,255,0.06)' },
  dataRow: { display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#94a3b8', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' },
  summaryBox: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 16, marginBottom: 16, border: '1px solid rgba(255,255,255,0.06)' },
  summaryRow: { display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: 14, color: '#94a3b8' },
  dependentCard: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 16, marginBottom: 12, border: '1px solid rgba(255,255,255,0.06)' },
  smallBtn: { padding: '6px 12px', backgroundColor: 'rgba(124,58,237,0.2)', color: '#a78bfa', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 6, cursor: 'pointer', fontSize: 12 },
  addBtn: { padding: '12px 20px', backgroundColor: 'rgba(124,58,237,0.2)', color: '#a78bfa', border: '2px dashed rgba(124,58,237,0.4)', borderRadius: 12, cursor: 'pointer', fontSize: 14, width: '100%' },
  checkboxLabel: { display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13, color: '#94a3b8', cursor: 'pointer', marginTop: 16 },
  checkbox: { width: 18, height: 18, cursor: 'pointer', marginTop: 2, accentColor: '#7c3aed' },
  footer: { display: 'flex', justifyContent: 'space-between', padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.06)', backgroundColor: 'rgba(255,255,255,0.02)' },
  backBtn: { padding: '10px 20px', fontSize: 14, fontWeight: 500, backgroundColor: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '2px solid rgba(255,255,255,0.1)', borderRadius: 10, cursor: 'pointer' },
  nextBtn: { padding: '10px 24px', fontSize: 14, fontWeight: 600, color: 'white', border: 'none', borderRadius: 10, cursor: 'pointer' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 },
  editModal: { backgroundColor: '#1e293b', borderRadius: 16, padding: 24, width: '90%', maxWidth: 450, maxHeight: '80vh', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.1)' },
};