// ============================================================
// REVIEW MODAL - Complete Tax Filing Review for CPA - DARK THEME
// ============================================================
// Shows: ALL W-2s, 1099s, User Info, Chat History, Tax Summary
// Location: frontend/src/components/cpa/ReviewModal.jsx
// ✅ v2.0: Dark theme matching TaxSky design
// ✅ v2.1: Form1040 data integration from Python API
// ✅ v2.1: Shows taxpayer/spouse DOB and Age
// ✅ v2.1: Correct federal owed from amount_owed section
// ✅ v3.0: Shows payment status
// ============================================================

import React, { useState, useEffect } from 'react';

export default function ReviewModal({ file, onClose, onSubmit }) {
  const [status, setStatus] = useState('approved');
  const [comments, setComments] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('summary');
  
  const [userFilings, setUserFilings] = useState(null);
  const [loadingUserData, setLoadingUserData] = useState(true);
  const [error, setError] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  // Load ALL user data on mount
  useEffect(() => {
    if (file?.userId) {
      loadUserData();
    }
  }, [file?.userId]);

  async function loadUserData() {
    try {
      setLoadingUserData(true);
      setError(null);
      const token = localStorage.getItem('cpa_token');
      const res = await fetch(`${API_URL}/api/cpa/users/${file.userId}/filings`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setUserFilings(data);
      } else {
        setError(data.error || 'Failed to load user data');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingUserData(false);
    }
  }

  // Extract data from userFilings
  const allFiles = userFilings?.uploadedFiles || [];
  const chatHistory = userFilings?.chatHistory || userFilings?.userData?.conversation_history || [];
  const userData = userFilings?.userData || {};
  const sessionForms = userFilings?.sessionForms || {};
  
  // ✅ v3.0: Extract payment info
  const paymentInfo = userFilings?.payment || {};
  const hasPaid = paymentInfo.hasPaid || false;
  const paymentPlan = paymentInfo.planName || 'Unknown';
  const paidAt = paymentInfo.paidAt || null;
  
  // Categorize documents
  const w2Files = allFiles.filter(f => f.formType === 'W-2' || f.formType === 'W2');
  const int1099Files = allFiles.filter(f => f.formType === '1099-INT');
  const div1099Files = allFiles.filter(f => f.formType === '1099-DIV');
  const nec1099Files = allFiles.filter(f => f.formType === '1099-NEC');
  const other1099Files = allFiles.filter(f => 
    f.formType?.startsWith('1099') && 
    !['1099-INT', '1099-DIV', '1099-NEC'].includes(f.formType)
  );

  // ✅ Extract form1040 data from Python API extraction
  const form1040 = sessionForms?.form1040 || userFilings?.form1040 || {};
  const form1040Header = form1040?.header || {};
  const form1040Income = form1040?.income || {};
  const form1040Adjustments = form1040?.adjustments || {};
  const form1040Deductions = form1040?.deductions || {};
  const form1040TaxCredits = form1040?.tax_and_credits || {};
  const form1040Payments = form1040?.payments || {};
  // ✅ FIXED: Read refund and owed from correct sections
  const form1040Refund = form1040?.refund || {};
  const form1040AmountOwed = form1040?.amount_owed || {};
  const incomeDetails = form1040?._income_details || {};
  const adjustmentsDetails = form1040?._adjustments_details || {};
  const dependentsInfo = form1040?._dependents || {};

  // Calculate totals from documents
  const totalW2Wages = w2Files.reduce((sum, f) => 
    sum + (parseFloat(f.extractedData?.wages_tips_other_comp || f.extractedData?.wages || 0)), 0);
  const totalW2FedWithheld = w2Files.reduce((sum, f) => 
    sum + (parseFloat(f.extractedData?.federal_income_tax_withheld || f.extractedData?.federal_withheld || 0)), 0);
  const totalW2StateWithheld = w2Files.reduce((sum, f) => 
    sum + (parseFloat(f.extractedData?.state_income_tax || f.extractedData?.state_withheld || 0)), 0);
  
  const totalInterest = int1099Files.reduce((sum, f) => 
    sum + (parseFloat(f.extractedData?.interest_income || f.extractedData?.amount || 0)), 0);
  const totalDividends = div1099Files.reduce((sum, f) => 
    sum + (parseFloat(f.extractedData?.total_dividends || f.extractedData?.ordinary_dividends || 0)), 0);
  const totalNEC = nec1099Files.reduce((sum, f) => 
    sum + (parseFloat(f.extractedData?.nonemployee_compensation || 0)), 0);

  const totalIncome = totalW2Wages + totalInterest + totalDividends + totalNEC;
  const totalFedWithheld = totalW2FedWithheld + 
    int1099Files.reduce((sum, f) => sum + (parseFloat(f.extractedData?.federal_tax_withheld || 0)), 0) +
    div1099Files.reduce((sum, f) => sum + (parseFloat(f.extractedData?.federal_tax_withheld || 0)), 0);

  // ✅ Get form1040 calculated values (from Python API extraction)
  const f1040AGI = form1040Adjustments?.line_11_agi || 0;
  const f1040TaxableIncome = form1040Deductions?.line_15_taxable_income || 0;
  const f1040StandardDeduction = form1040Deductions?.line_12_deduction || form1040Deductions?.line_12_standard_deduction || 0;
  const f1040Tax = form1040TaxCredits?.line_16_tax || 0;
  const f1040TotalPayments = form1040Payments?.line_33_total_payments || 0;
  // ✅ FIXED: Correct federal refund/owed from separate sections
  const f1040FederalRefund = form1040Refund?.line_35a_refund || form1040Refund?.line_34_overpaid || 0;
  const f1040FederalOwed = form1040AmountOwed?.line_37_amount_owed || 0;
  
  // Determine net federal result
  const federalNetResult = f1040FederalRefund > 0 ? f1040FederalRefund : -f1040FederalOwed;

  // Pending files count
  const pendingCount = allFiles.filter(f => f.status === 'pending').length;

  // Format helpers
  function formatCurrency(amount) {
    if (amount === null || amount === undefined) return 'N/A';
    return '$' + Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    try { return new Date(dateStr).toLocaleString(); } 
    catch (e) { return dateStr; }
  }

  function maskSSN(ssn) {
    if (!ssn) return 'N/A';
    const str = String(ssn).replace(/\D/g, '');
    if (str.length >= 4) return '***-**-' + str.slice(-4);
    return '***-**-****';
  }

  // Handle approve ALL pending documents
  async function handleApproveAll() {
    setLoading(true);
    const pendingFiles = allFiles.filter(f => f.status === 'pending');
    
    for (const pFile of pendingFiles) {
      await onSubmit(pFile._id, {
        status: 'approved',
        comments: comments || 'Approved by CPA'
      });
    }
    setLoading(false);
  }

  // Handle reject ALL pending documents
  async function handleRejectAll() {
    if (!comments.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }
    setLoading(true);
    const pendingFiles = allFiles.filter(f => f.status === 'pending');
    
    for (const pFile of pendingFiles) {
      await onSubmit(pFile._id, {
        status: 'rejected',
        comments: comments
      });
    }
    setLoading(false);
  }

  if (!file) return null;

  // Tab styles - Dark Theme
  const tabClass = (tab) => `px-4 py-2 font-medium text-sm cursor-pointer border-b-2 transition ${
    activeTab === tab 
      ? 'border-blue-500 text-blue-400 bg-blue-500/10' 
      : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
  }`;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col shadow-2xl border border-slate-700">
        
        {/* Header - Dark Gradient */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-4">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                📋 Tax Filing Review
              </h2>
              <p className="text-blue-100 text-sm mt-1">
                {userData.first_name || file.extractedData?.employee_name || 'Unknown'} {userData.last_name || ''} • 
                User ID: {file.userId}
              </p>
              {/* ZIP Code Badge */}
              {(userData.zip || file.extractedData?.employee_zip) && (
                <span className="inline-block mt-2 bg-white/20 px-2 py-0.5 rounded text-xs">
                  📍 ZIP: {userData.zip || file.extractedData?.employee_zip}
                </span>
              )}
            </div>
            <button 
              onClick={onClose}
              className="text-white/80 hover:text-white text-2xl leading-none w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition"
            >
              ×
            </button>
          </div>
          
          {/* Quick Stats */}
          <div className="flex gap-6 mt-4 text-sm">
            <div>
              <span className="text-blue-200">Documents:</span>
              <span className="ml-2 font-semibold">{allFiles.length}</span>
            </div>
            <div>
              <span className="text-blue-200">Total Income:</span>
              <span className="ml-2 font-semibold">{formatCurrency(totalIncome)}</span>
            </div>
            <div>
              <span className="text-blue-200">Fed Withheld:</span>
              <span className="ml-2 font-semibold">{formatCurrency(totalFedWithheld)}</span>
            </div>
            <div>
              <span className="text-blue-200">Pending:</span>
              <span className="ml-2 font-semibold">{pendingCount}</span>
            </div>
          </div>
        </div>

        {/* Tabs - Dark Theme */}
        <div className="flex border-b border-slate-700 bg-slate-800/50">
          <button className={tabClass('summary')} onClick={() => setActiveTab('summary')}>
            📊 Summary
          </button>
          <button className={tabClass('documents')} onClick={() => setActiveTab('documents')}>
            📄 Documents ({allFiles.length})
          </button>
          <button className={tabClass('taxpayer')} onClick={() => setActiveTab('taxpayer')}>
            👤 Taxpayer Info
          </button>
          <button className={tabClass('chat')} onClick={() => setActiveTab('chat')}>
            💬 Chat History ({chatHistory.length})
          </button>
          <button className={tabClass('review')} onClick={() => setActiveTab('review')}>
            ✅ Review & Decide
          </button>
        </div>

        {/* Content - Dark Theme */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-900">
          {loadingUserData ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
              <p className="text-slate-400">Loading taxpayer data...</p>
            </div>
          ) : error ? (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center">
              <p className="text-red-400">❌ {error}</p>
              <button 
                onClick={loadUserData}
                className="mt-4 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition"
              >
                Retry
              </button>
            </div>
          ) : (
            <>
              {/* SUMMARY TAB */}
              {activeTab === 'summary' && (
                <div className="space-y-6">
                  {/* Income Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-5">
                      <h3 className="text-blue-400 font-semibold mb-3">💼 W-2 Wages</h3>
                      <p className="text-3xl font-bold text-white">{formatCurrency(totalW2Wages)}</p>
                      <p className="text-sm text-slate-400 mt-1">{w2Files.length} W-2 form(s)</p>
                      {/* Show taxpayer vs spouse wages if available */}
                      {incomeDetails.taxpayer_wages > 0 && incomeDetails.spouse_wages > 0 && (
                        <div className="mt-2 pt-2 border-t border-blue-500/20 text-xs text-slate-400">
                          <p>Taxpayer: {formatCurrency(incomeDetails.taxpayer_wages)}</p>
                          <p>Spouse: {formatCurrency(incomeDetails.spouse_wages)}</p>
                        </div>
                      )}
                    </div>
                    <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-5">
                      <h3 className="text-green-400 font-semibold mb-3">🏦 Interest & Dividends</h3>
                      <p className="text-3xl font-bold text-white">{formatCurrency(totalInterest + totalDividends)}</p>
                      <p className="text-sm text-slate-400 mt-1">
                        {int1099Files.length} 1099-INT, {div1099Files.length} 1099-DIV
                      </p>
                    </div>
                    <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-5">
                      <h3 className="text-purple-400 font-semibold mb-3">📋 Self-Employment</h3>
                      <p className="text-3xl font-bold text-white">{formatCurrency(totalNEC)}</p>
                      <p className="text-sm text-slate-400 mt-1">{nec1099Files.length} 1099-NEC form(s)</p>
                    </div>
                  </div>

                  {/* ✅ Form 1040 Calculated Summary */}
                  {f1040AGI > 0 && (
                    <div className={`rounded-xl p-6 border-2 ${federalNetResult >= 0 ? 'bg-emerald-500/10 border-emerald-500/40' : 'bg-red-500/10 border-red-500/40'}`}>
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-white">📋 Form 1040 Summary (Calculated)</h3>
                        <span className={`text-2xl font-bold ${federalNetResult >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {federalNetResult >= 0 ? '+ ' : '- '}{formatCurrency(Math.abs(federalNetResult))}
                          <span className="text-sm ml-2">{federalNetResult >= 0 ? 'REFUND' : 'OWED'}</span>
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                        <div>
                          <p className="text-slate-400">AGI (Line 11)</p>
                          <p className="text-xl font-bold text-white">{formatCurrency(f1040AGI)}</p>
                        </div>
                        <div>
                          <p className="text-slate-400">Standard Deduction</p>
                          <p className="text-xl font-bold text-emerald-400">-{formatCurrency(f1040StandardDeduction)}</p>
                        </div>
                        <div>
                          <p className="text-slate-400">Taxable Income</p>
                          <p className="text-xl font-bold text-white">{formatCurrency(f1040TaxableIncome)}</p>
                        </div>
                        <div>
                          <p className="text-slate-400">Tax (Line 16)</p>
                          <p className="text-xl font-bold text-amber-400">{formatCurrency(f1040Tax)}</p>
                        </div>
                        <div>
                          <p className="text-slate-400">Total Payments</p>
                          <p className="text-xl font-bold text-blue-400">{formatCurrency(f1040TotalPayments)}</p>
                        </div>
                      </div>
                      {/* Show federal refund/owed breakdown */}
                      <div className="mt-4 pt-4 border-t border-slate-600 grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-slate-400 text-sm">Federal Refund (Line 35a)</p>
                          <p className="text-lg font-bold text-emerald-400">{formatCurrency(f1040FederalRefund)}</p>
                        </div>
                        <div>
                          <p className="text-slate-400 text-sm">Amount Owed (Line 37)</p>
                          <p className="text-lg font-bold text-red-400">{formatCurrency(f1040FederalOwed)}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Total Summary */}
                  <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                    <h3 className="text-lg font-bold text-white mb-4">📊 Tax Summary</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                      <div>
                        <p className="text-slate-400 text-sm">Total Income</p>
                        <p className="text-2xl font-bold text-white">{formatCurrency(totalIncome)}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-sm">Federal Withheld</p>
                        <p className="text-2xl font-bold text-emerald-400">{formatCurrency(totalFedWithheld)}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-sm">State Withheld</p>
                        <p className="text-2xl font-bold text-blue-400">{formatCurrency(totalW2StateWithheld)}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-sm">Filing Status</p>
                        <p className="text-lg font-semibold text-white capitalize">
                          {form1040Header?.filing_status?.replace(/_/g, ' ') || userData.filing_status?.replace(/_/g, ' ') || 'Not Set'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* DOCUMENTS TAB */}
              {activeTab === 'documents' && (
                <div className="space-y-4">
                  {allFiles.length === 0 ? (
                    <div className="text-center py-12 bg-slate-800 rounded-xl border border-slate-700">
                      <div className="text-4xl mb-2">📭</div>
                      <p className="text-slate-400">No documents uploaded</p>
                    </div>
                  ) : (
                    allFiles.map((doc, idx) => (
                      <div key={idx} className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-3">
                            <span className={`px-3 py-1 rounded-lg text-sm font-medium ${
                              doc.formType?.startsWith('W') 
                                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                : 'bg-green-500/20 text-green-400 border border-green-500/30'
                            }`}>
                              {doc.formType || 'Unknown'}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              doc.status === 'pending' 
                                ? 'bg-amber-500/20 text-amber-400'
                                : doc.status === 'approved'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-red-500/20 text-red-400'
                            }`}>
                              {doc.status?.toUpperCase()}
                            </span>
                          </div>
                          <span className="text-xs text-slate-500">{formatDate(doc.uploadedAt)}</span>
                        </div>
                        
                        {/* Document Details */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          {doc.formType === 'W-2' || doc.formType === 'W2' ? (
                            <>
                              <div>
                                <p className="text-slate-500">Employer</p>
                                <p className="font-medium text-white">{doc.extractedData?.employer_name || 'N/A'}</p>
                              </div>
                              <div>
                                <p className="text-slate-500">Wages</p>
                                <p className="font-mono font-semibold text-white">
                                  {formatCurrency(doc.extractedData?.wages_tips_other_comp || doc.extractedData?.wages)}
                                </p>
                              </div>
                              <div>
                                <p className="text-slate-500">Fed Withheld</p>
                                <p className="font-mono text-emerald-400">
                                  {formatCurrency(doc.extractedData?.federal_income_tax_withheld || doc.extractedData?.federal_withheld)}
                                </p>
                              </div>
                              <div>
                                <p className="text-slate-500">State Withheld</p>
                                <p className="font-mono text-blue-400">
                                  {formatCurrency(doc.extractedData?.state_income_tax || doc.extractedData?.state_withheld)}
                                </p>
                              </div>
                            </>
                          ) : (
                            <>
                              <div>
                                <p className="text-slate-500">Payer</p>
                                <p className="font-medium text-white">{doc.extractedData?.payer_name || 'N/A'}</p>
                              </div>
                              <div>
                                <p className="text-slate-500">Amount</p>
                                <p className="font-mono font-semibold text-white">
                                  {formatCurrency(
                                    doc.extractedData?.interest_income || 
                                    doc.extractedData?.total_dividends ||
                                    doc.extractedData?.nonemployee_compensation ||
                                    doc.extractedData?.amount
                                  )}
                                </p>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* TAXPAYER INFO TAB */}
              {activeTab === 'taxpayer' && (
                <div className="space-y-6">
                  {/* Primary Taxpayer */}
                  <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                    <h3 className="text-lg font-bold text-white mb-4">👤 Primary Taxpayer</h3>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                      <div>
                        <p className="text-slate-500">Full Name</p>
                        <p className="font-semibold text-white">{userData.first_name || ''} {userData.last_name || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">SSN</p>
                        <p className="font-mono font-semibold text-white">{maskSSN(userData.ssn)}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Date of Birth</p>
                        <p className="font-semibold text-white">{form1040Header?.taxpayer_dob || userData.taxpayer_dob || userData.dob || 'N/A'}</p>
                      </div>
                      {/* ✅ NEW: Age from form1040 */}
                      <div>
                        <p className="text-slate-500">Age</p>
                        <p className="font-semibold text-white">{form1040Header?.taxpayer_age || userData.taxpayer_age || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Filing Status</p>
                        <p className="font-semibold text-white capitalize">{form1040Header?.filing_status?.replace(/_/g, ' ') || userData.filing_status?.replace(/_/g, ' ') || 'Not Set'}</p>
                      </div>
                    </div>
                    
                    {/* Address */}
                    <div className="mt-4 pt-4 border-t border-slate-700">
                      <p className="text-slate-500 text-sm">Address</p>
                      <p className="font-semibold text-white">
                        {userData.address || 'N/A'}
                        {userData.city && `, ${userData.city}`}
                        {(form1040Header?.state || userData.state) && `, ${form1040Header?.state || userData.state}`}
                        {userData.zip && ` ${userData.zip}`}
                      </p>
                    </div>
                  </div>

                  {/* Spouse Info */}
                  {(form1040Header?.filing_status === 'married_filing_jointly' || userData.filing_status === 'married_filing_jointly') && (
                    <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-6">
                      <h3 className="text-lg font-bold text-purple-400 mb-4">👫 Spouse Information</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-slate-400">Full Name</p>
                          <p className="font-semibold text-white">
                            {form1040Header?.spouse_name || `${userData.spouse_first_name || ''} ${userData.spouse_last_name || ''}`.trim() || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-400">SSN</p>
                          <p className="font-mono font-semibold text-white">{maskSSN(userData.spouse_ssn)}</p>
                        </div>
                        <div>
                          <p className="text-slate-400">Date of Birth</p>
                          <p className="font-semibold text-white">{form1040Header?.spouse_dob || userData.spouse_dob || 'N/A'}</p>
                        </div>
                        {/* ✅ NEW: Spouse Age from form1040 */}
                        <div>
                          <p className="text-slate-400">Age</p>
                          <p className="font-semibold text-white">{form1040Header?.spouse_age || userData.spouse_age || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Dependents */}
                  <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-6">
                    <h3 className="text-lg font-bold text-emerald-400 mb-4">
                      👶 Dependents ({dependentsInfo?.count || userData.dependent_count || userData.dependents?.length || 0})
                    </h3>
                    {/* ✅ Show form1040 dependent summary if available */}
                    {dependentsInfo?.count > 0 && (
                      <div className="mb-4 p-3 bg-slate-800 rounded-lg border border-slate-700">
                        <p className="text-sm text-slate-400 mb-2">From Form 1040 Extraction:</p>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-slate-500">Under 17 (CTC)</p>
                            <p className="font-semibold text-emerald-400">{dependentsInfo.under_17 || 0}</p>
                          </div>
                          <div>
                            <p className="text-slate-500">Under 6 (YCTC)</p>
                            <p className="font-semibold text-blue-400">{dependentsInfo.under_6 || 0}</p>
                          </div>
                          <div>
                            <p className="text-slate-500">17+ (ODC)</p>
                            <p className="font-semibold text-purple-400">{dependentsInfo.over_17 || 0}</p>
                          </div>
                        </div>
                      </div>
                    )}
                    {(!userData.dependents || userData.dependents.length === 0) ? (
                      <p className="text-slate-400">No dependents claimed</p>
                    ) : (
                      <div className="space-y-3">
                        {userData.dependents.map((dep, idx) => (
                          <div key={idx} className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                            <div className="grid grid-cols-5 gap-4 text-sm">
                              <div>
                                <p className="text-slate-500">Name</p>
                                <p className="font-semibold text-white">{dep.first_name} {dep.last_name}</p>
                              </div>
                              <div>
                                <p className="text-slate-500">SSN</p>
                                <p className="font-mono text-white">{maskSSN(dep.ssn)}</p>
                              </div>
                              <div>
                                <p className="text-slate-500">Relationship</p>
                                <p className="font-semibold text-white">{dep.relationship || 'Child'}</p>
                              </div>
                              <div>
                                <p className="text-slate-500">Date of Birth</p>
                                <p className="font-semibold text-white">{dep.dob || dep.date_of_birth || 'N/A'}</p>
                              </div>
                              <div>
                                <p className="text-slate-500">Credit Type</p>
                                <p className={`font-semibold ${dep.age < 17 ? 'text-emerald-400' : 'text-blue-400'}`}>
                                  {dep.age < 17 ? 'CTC ($2,200)' : 'ODC ($500)'}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* CHAT HISTORY TAB */}
              {activeTab === 'chat' && (
                <div>
                  <h3 className="text-lg font-bold text-white mb-4">💬 Conversation History</h3>
                  {chatHistory.length === 0 ? (
                    <div className="text-center py-12 bg-slate-800 border border-slate-700 rounded-xl">
                      <div className="text-4xl mb-2">💬</div>
                      <p className="text-slate-400">No chat history available</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[500px] overflow-y-auto">
                      {chatHistory.map((msg, idx) => {
                        // ✅ Handle multiple message formats from TaxSession
                        // TaxSession uses: { sender, text, timestamp }
                        const messageContent = msg.text || msg.content || msg.message || '';
                        const messageRole = msg.role || (msg.sender === 'user' ? 'user' : 'assistant');
                        const isUser = messageRole === 'user' || msg.sender === 'user';
                        const messageTime = msg.timestamp || msg.createdAt || msg.created_at;
                        
                        return (
                          <div 
                            key={idx}
                            className={`p-4 rounded-xl ${
                              isUser 
                                ? 'bg-blue-500/10 border border-blue-500/30 ml-8'
                                : 'bg-slate-800 border border-slate-700 mr-8'
                            }`}
                          >
                            <div className="flex justify-between items-center mb-2">
                              <span className="font-medium text-sm text-slate-300">
                                {isUser ? '👤 User' : '🤖 TaxSky AI'}
                              </span>
                              {messageTime && (
                                <span className="text-xs text-slate-500">{formatDate(messageTime)}</span>
                              )}
                            </div>
                            <div className="text-sm text-slate-200 whitespace-pre-wrap">
                              {messageContent || <span className="text-slate-500 italic">Empty message</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* REVIEW TAB */}
              {activeTab === 'review' && (
                <div className="max-w-2xl mx-auto">
                  <h3 className="text-lg font-bold text-white mb-4">✅ Review & Decision</h3>
                  
                  {/* Quick Summary */}
                  <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-6">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-slate-400">Documents to Review:</span>
                        <span className="ml-2 font-semibold text-white">{pendingCount} pending</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Total Income:</span>
                        <span className="ml-2 font-semibold text-white">{formatCurrency(totalIncome)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Decision */}
                  <div className="mb-6">
                    <label className="block font-medium text-white mb-3">Decision</label>
                    <div className="flex gap-4">
                      <button
                        onClick={() => setStatus('approved')}
                        className={`flex-1 py-3 rounded-xl font-medium transition ${
                          status === 'approved'
                            ? 'bg-emerald-500 text-white'
                            : 'bg-slate-700 text-slate-300 hover:bg-emerald-500/20 hover:text-emerald-400'
                        }`}
                      >
                        ✅ Approve All
                      </button>
                      <button
                        onClick={() => setStatus('rejected')}
                        className={`flex-1 py-3 rounded-xl font-medium transition ${
                          status === 'rejected'
                            ? 'bg-red-500 text-white'
                            : 'bg-slate-700 text-slate-300 hover:bg-red-500/20 hover:text-red-400'
                        }`}
                      >
                        ❌ Reject
                      </button>
                    </div>
                  </div>

                  {/* Comments */}
                  <div className="mb-6">
                    <label className="block font-medium text-white mb-2">
                      Comments {status === 'rejected' && <span className="text-red-400">*</span>}
                    </label>
                    <textarea
                      value={comments}
                      onChange={(e) => setComments(e.target.value)}
                      placeholder={status === 'rejected' ? 'Please provide reason for rejection...' : 'Optional notes...'}
                      className="w-full bg-slate-700 border border-slate-600 rounded-xl p-4 h-32 resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white placeholder-slate-400"
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    onClick={status === 'approved' ? handleApproveAll : handleRejectAll}
                    disabled={loading || (status === 'rejected' && !comments.trim())}
                    className={`w-full py-4 rounded-xl font-bold text-white transition ${
                      status === 'approved'
                        ? 'bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600'
                        : 'bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600'
                    } ${(loading || (status === 'rejected' && !comments.trim())) ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {loading ? 'Processing...' : status === 'approved' 
                      ? `✅ Approve All ${pendingCount} Document(s)` 
                      : `❌ Reject Filing`}
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-700 bg-slate-800 px-6 py-3 flex justify-between items-center">
          <span className="text-xs text-slate-500">
            User ID: {file.userId} | {allFiles.length} documents
            {userData.zip && ` | ZIP: ${userData.zip}`}
          </span>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-slate-700 border border-slate-600 rounded-lg hover:bg-slate-600 text-white transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}