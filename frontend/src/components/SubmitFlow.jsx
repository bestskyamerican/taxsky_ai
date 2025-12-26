// ============================================================
// TAX FILING SUBMIT FLOW
// ============================================================
// Step-by-step review and submission process
// With inline editing for missing information
// ============================================================

import React, { useState, useEffect } from "react";

const API_BASE = "http://localhost:3000";

export default function SubmitFlow({ onClose, onComplete }) {
  // ============================================================
  // STATE
  // ============================================================
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [taxData, setTaxData] = useState(null);
  const [userData, setUserData] = useState(null);
  const [errors, setErrors] = useState([]);
  const [agreed, setAgreed] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});

  const getToken = () => localStorage.getItem("taxsky_token");
  const getUser = () => {
    try {
      return JSON.parse(localStorage.getItem("taxsky_user") || "{}");
    } catch { return {}; }
  };
  const getUserId = () => getUser().id || localStorage.getItem("taxsky_userId");

  // ============================================================
  // FETCH DATA
  // ============================================================
  useEffect(() => {
    fetchTaxData();
  }, []);

  const fetchTaxData = async () => {
    try {
      setLoading(true);
      const token = getToken();
      const userId = getUserId();

      const res = await fetch(`${API_BASE}/api/ai/data`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ userId })
      });

      const result = await res.json();
      if (result.success) {
        setTaxData(result.tax);
        setUserData(result.data);
        validateData(result.data);
      }
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // VALIDATION
  // ============================================================
  const validateData = (data) => {
    const errs = [];
    
    // Personal Info
    if (!data?.first_name) errs.push({ field: "first_name", label: "First Name", section: "personal" });
    if (!data?.last_name) errs.push({ field: "last_name", label: "Last Name", section: "personal" });
    if (!data?.ssn) errs.push({ field: "ssn", label: "Social Security Number", section: "personal" });
    if (!data?.address) errs.push({ field: "address", label: "Address", section: "personal" });
    if (!data?.city) errs.push({ field: "city", label: "City", section: "personal" });
    if (!data?.state) errs.push({ field: "state", label: "State", section: "personal" });
    if (!data?.zip) errs.push({ field: "zip", label: "ZIP Code", section: "personal" });
    
    // Filing Status
    if (!data?.filing_status) errs.push({ field: "filing_status", label: "Filing Status", section: "filing" });
    
    // Spouse (if MFJ)
    if (data?.filing_status === 'married_filing_jointly') {
      if (!data?.spouse_first_name) errs.push({ field: "spouse_first_name", label: "Spouse First Name", section: "spouse" });
      if (!data?.spouse_last_name) errs.push({ field: "spouse_last_name", label: "Spouse Last Name", section: "spouse" });
      if (!data?.spouse_ssn) errs.push({ field: "spouse_ssn", label: "Spouse SSN", section: "spouse" });
    }
    
    // Income
    const hasIncome = (data?.total_wages > 0) || (data?.total_self_employment > 0);
    if (!hasIncome) errs.push({ field: "income", label: "Income (W-2 or 1099)", section: "income" });
    
    setErrors(errs);
    
    // Initialize edit form with missing fields
    const formInit = {};
    errs.forEach(err => {
      if (err.field !== 'income') {
        formInit[err.field] = data?.[err.field] || '';
      }
    });
    setEditForm(formInit);
  };

  const isReady = errors.length === 0;

  // ============================================================
  // SAVE EDITED DATA
  // ============================================================
  const handleSaveEdits = async () => {
    try {
      setSaving(true);
      const token = getToken();
      const userId = getUserId();

      // Send each field to the API
      const res = await fetch(`${API_BASE}/api/ai/update`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ 
          userId, 
          updates: editForm 
        })
      });

      const result = await res.json();
      if (result.success) {
        // Refresh data
        await fetchTaxData();
        setIsEditing(false);
      } else {
        alert("Error saving: " + (result.error || "Unknown error"));
      }
    } catch (err) {
      console.error("Save error:", err);
      alert("Error saving data: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Handle form input changes
  const handleEditChange = (field, value) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  // ============================================================
  // HELPERS
  // ============================================================
  const fmt = (num) => {
    if (!num && num !== 0) return "$0";
    return "$" + Math.abs(Math.round(num)).toLocaleString();
  };

  const maskSSN = (ssn) => {
    if (!ssn) return "Not provided";
    const clean = String(ssn).replace(/\D/g, '');
    if (clean.length !== 9) return "Invalid";
    return `***-**-${clean.slice(-4)}`;
  };

  const formatFilingStatus = (status) => {
    const map = {
      'single': 'Single',
      'married_filing_jointly': 'Married Filing Jointly',
      'married_filing_separately': 'Married Filing Separately',
      'head_of_household': 'Head of Household'
    };
    return map[status] || status || 'Not selected';
  };

  // ============================================================
  // DOWNLOAD 1040
  // ============================================================
  const handleDownload = async () => {
    try {
      setDownloading(true);
      const token = getToken();
      const userId = getUserId();

      const res = await fetch(`${API_BASE}/api/tax/1040`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ userId, taxYear: 2024 }),
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Form_1040_2024_${userData?.last_name || 'TaxReturn'}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
        return true;
      } else {
        const error = await res.json();
        alert(error.message || "Error downloading form");
        return false;
      }
    } catch (err) {
      alert("Error: " + err.message);
      return false;
    } finally {
      setDownloading(false);
    }
  };

  // ============================================================
  // SUBMIT
  // ============================================================
  const handleSubmit = async () => {
    // Download 1040 first
    const success = await handleDownload();
    if (success) {
      setSubmitted(true);
      setCurrentStep(5);
    }
  };

  // ============================================================
  // STEPS
  // ============================================================
  const steps = [
    { num: 1, label: "Review Info" },
    { num: 2, label: "Verify Income" },
    { num: 3, label: "Check Refund" },
    { num: 4, label: "Confirm & Sign" },
    { num: 5, label: "Complete" },
  ];

  // ============================================================
  // RENDER
  // ============================================================
  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-500 mt-4">Loading your tax return...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold">📋 File Your Tax Return</h2>
            <p className="text-blue-100 text-sm">Tax Year 2024</p>
          </div>
          <button 
            onClick={onClose}
            className="text-white/80 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 bg-gray-50 border-b">
          <div className="flex justify-between">
            {steps.map((step, idx) => (
              <div key={step.num} className="flex items-center">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                  currentStep > step.num 
                    ? 'bg-green-500 text-white' 
                    : currentStep === step.num 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-200 text-gray-500'
                }`}>
                  {currentStep > step.num ? '✓' : step.num}
                </div>
                <span className={`ml-2 text-sm hidden md:block ${
                  currentStep >= step.num ? 'text-gray-800 font-medium' : 'text-gray-400'
                }`}>
                  {step.label}
                </span>
                {idx < steps.length - 1 && (
                  <div className={`w-12 h-1 mx-2 ${
                    currentStep > step.num ? 'bg-green-500' : 'bg-gray-200'
                  }`}></div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          
          {/* Step 1: Review Personal Info */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">👤 Review Your Information</h3>
              
              {/* Errors with Edit Form */}
              {errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <div className="flex justify-between items-start mb-3">
                    <h4 className="font-semibold text-red-700">⚠️ Missing Information</h4>
                    {!isEditing && (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                      >
                        ✏️ Edit
                      </button>
                    )}
                  </div>
                  
                  {isEditing ? (
                    <div className="space-y-4">
                      {errors.filter(e => e.field !== 'income').map((err) => (
                        <div key={err.field}>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {err.label} *
                          </label>
                          {err.field === 'ssn' || err.field === 'spouse_ssn' ? (
                            <input
                              type="text"
                              placeholder="XXX-XX-XXXX"
                              value={editForm[err.field] || ''}
                              onChange={(e) => handleEditChange(err.field, e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              maxLength={11}
                            />
                          ) : err.field === 'state' ? (
                            <input
                              type="text"
                              placeholder="CA"
                              value={editForm[err.field] || ''}
                              onChange={(e) => handleEditChange(err.field, e.target.value.toUpperCase())}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              maxLength={2}
                            />
                          ) : err.field === 'zip' ? (
                            <input
                              type="text"
                              placeholder="12345"
                              value={editForm[err.field] || ''}
                              onChange={(e) => handleEditChange(err.field, e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              maxLength={5}
                            />
                          ) : err.field === 'filing_status' ? (
                            <select
                              value={editForm[err.field] || ''}
                              onChange={(e) => handleEditChange(err.field, e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                              <option value="">Select...</option>
                              <option value="single">Single</option>
                              <option value="married_filing_jointly">Married Filing Jointly</option>
                              <option value="married_filing_separately">Married Filing Separately</option>
                              <option value="head_of_household">Head of Household</option>
                            </select>
                          ) : (
                            <input
                              type="text"
                              placeholder={err.label}
                              value={editForm[err.field] || ''}
                              onChange={(e) => handleEditChange(err.field, e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          )}
                        </div>
                      ))}
                      
                      {errors.some(e => e.field === 'income') && (
                        <div className="bg-yellow-50 p-3 rounded-lg">
                          <p className="text-sm text-yellow-700">
                            ⚠️ <b>Income Required:</b> Please upload a W-2 or 1099 document in the Tax Chat.
                          </p>
                        </div>
                      )}
                      
                      <div className="flex gap-3 pt-2">
                        <button
                          onClick={handleSaveEdits}
                          disabled={saving}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                        >
                          {saving ? "Saving..." : "💾 Save Changes"}
                        </button>
                        <button
                          onClick={() => setIsEditing(false)}
                          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <ul className="text-sm text-red-600 space-y-1">
                        {errors.map((err, i) => (
                          <li key={i}>• {err.label}</li>
                        ))}
                      </ul>
                      <p className="text-sm text-blue-600 mt-3">
                        👆 Click <b>Edit</b> above to add the missing information.
                      </p>
                    </>
                  )}
                </div>
              )}

              {/* Personal Info */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h4 className="font-medium text-gray-700 mb-3">Personal Information</h4>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Name:</span>
                    <span className="ml-2 font-medium">{userData?.first_name} {userData?.last_name}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">SSN:</span>
                    <span className="ml-2 font-medium">{maskSSN(userData?.ssn)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Address:</span>
                    <span className="ml-2 font-medium">{userData?.address}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">City, State ZIP:</span>
                    <span className="ml-2 font-medium">{userData?.city}, {userData?.state} {userData?.zip}</span>
                  </div>
                </div>
              </div>

              {/* Filing Status */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h4 className="font-medium text-gray-700 mb-3">Filing Status</h4>
                <p className="text-lg font-semibold text-blue-600">
                  {formatFilingStatus(userData?.filing_status)}
                </p>
              </div>

              {/* Spouse */}
              {userData?.filing_status === 'married_filing_jointly' && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <h4 className="font-medium text-gray-700 mb-3">Spouse Information</h4>
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Name:</span>
                      <span className="ml-2 font-medium">{userData?.spouse_first_name} {userData?.spouse_last_name}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">SSN:</span>
                      <span className="ml-2 font-medium">{maskSSN(userData?.spouse_ssn)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Dependents */}
              {userData?.dependent_count > 0 && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <h4 className="font-medium text-gray-700 mb-3">Dependents ({userData?.dependent_count})</h4>
                  <div className="space-y-2 text-sm">
                    {[1, 2, 3, 4].map(i => {
                      const name = userData?.[`dependent_${i}_name`];
                      const ssn = userData?.[`dependent_${i}_ssn`];
                      if (!name) return null;
                      return (
                        <div key={i} className="flex justify-between">
                          <span>{name}</span>
                          <span className="text-gray-500">{maskSSN(ssn)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Verify Income */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">💰 Verify Your Income</h3>
              
              <div className="bg-blue-50 rounded-xl p-6">
                <h4 className="font-medium text-blue-800 mb-4">Income Summary</h4>
                <div className="space-y-3">
                  <div className="flex justify-between text-lg">
                    <span>W-2 Wages</span>
                    <span className="font-bold">{fmt(userData?.total_wages)}</span>
                  </div>
                  <div className="flex justify-between text-lg">
                    <span>1099-NEC (Self-Employment)</span>
                    <span className="font-bold">{fmt(userData?.total_self_employment)}</span>
                  </div>
                  <div className="flex justify-between text-lg">
                    <span>Interest Income</span>
                    <span className="font-bold">{fmt(userData?.total_interest)}</span>
                  </div>
                  <hr className="border-blue-200" />
                  <div className="flex justify-between text-xl font-bold text-blue-800">
                    <span>Total Income</span>
                    <span>{fmt(taxData?.federal?.totalIncome)}</span>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 rounded-xl p-6">
                <h4 className="font-medium text-green-800 mb-4">Withholdings</h4>
                <div className="space-y-3">
                  <div className="flex justify-between text-lg">
                    <span>Federal Tax Withheld</span>
                    <span className="font-bold">{fmt(userData?.total_withheld)}</span>
                  </div>
                  <div className="flex justify-between text-lg">
                    <span>State Tax Withheld (CA)</span>
                    <span className="font-bold">{fmt(userData?.total_state_withheld)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Check Refund */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">🎯 Your Tax Results</h3>
              
              {/* Total Refund - NET calculation: Federal refund minus State owed */}
              {(() => {
                const fedNet = (taxData?.federal?.refund || 0) - (taxData?.federal?.taxDue || 0);
                const stateNet = (taxData?.state?.refund || 0) - (taxData?.state?.taxDue || 0);
                const totalNet = fedNet + stateNet;
                return (
                  <div className={`rounded-2xl p-8 text-center ${
                    totalNet >= 0 
                      ? 'bg-gradient-to-r from-green-500 to-emerald-600' 
                      : 'bg-gradient-to-r from-red-500 to-rose-600'
                  }`}>
                    <p className="text-white text-lg opacity-90">
                      {totalNet >= 0 ? '💰 Your Estimated Refund' : '💸 Amount You Owe'}
                    </p>
                    <p className="text-white text-6xl font-bold mt-2">{fmt(totalNet)}</p>
                  </div>
                );
              })()}

              {/* Breakdown */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-blue-50 rounded-xl p-4">
                  <h4 className="font-medium text-blue-800 mb-2">🇺🇸 Federal</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Tax Owed</span>
                      <span>{fmt(taxData?.federal?.totalTaxOwed)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Withheld</span>
                      <span className="text-green-600">{fmt(taxData?.federal?.withholding)}</span>
                    </div>
                    {taxData?.federal?.childTaxCredit > 0 && (
                      <div className="flex justify-between">
                        <span>Child Tax Credit</span>
                        <span className="text-green-600">-{fmt(taxData?.federal?.childTaxCredit)}</span>
                      </div>
                    )}
                    <hr />
                    <div className="flex justify-between font-bold">
                      <span>{taxData?.federal?.refund >= 0 ? 'Refund' : 'Owed'}</span>
                      <span className={taxData?.federal?.refund >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {fmt(taxData?.federal?.refund)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-amber-50 rounded-xl p-4">
                  <h4 className="font-medium text-amber-800 mb-2">🌴 California</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>CA Tax</span>
                      <span>{fmt(taxData?.state?.caTax)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>CA Withheld</span>
                      <span className="text-green-600">{fmt(taxData?.state?.caWithholding)}</span>
                    </div>
                    <hr />
                    <div className="flex justify-between font-bold">
                      <span>{(taxData?.state?.taxDue || 0) > 0 ? 'Owed' : 'Refund'}</span>
                      <span className={(taxData?.state?.taxDue || 0) > 0 ? 'text-red-600' : 'text-green-600'}>
                        {(taxData?.state?.taxDue || 0) > 0 ? '-' + fmt(taxData?.state?.taxDue) : fmt(taxData?.state?.refund)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Confirm & Sign */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">✍️ Review & Confirm</h3>
              
              {/* Checklist */}
              <div className="bg-gray-50 rounded-xl p-6">
                <h4 className="font-medium mb-4">✅ Filing Checklist</h4>
                <div className="space-y-3">
                  {[
                    { label: "Personal information is correct", check: !!userData?.ssn },
                    { label: "Filing status selected", check: !!userData?.filing_status },
                    { label: "Income reported", check: (userData?.total_wages > 0 || userData?.total_self_employment > 0) },
                    { label: "Withholdings entered", check: userData?.total_withheld > 0 },
                    { label: "Dependents information complete", check: !userData?.dependent_count || userData?.dependent_1_name },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-sm ${
                        item.check ? 'bg-green-500' : 'bg-red-500'
                      }`}>
                        {item.check ? '✓' : '✗'}
                      </span>
                      <span className={item.check ? 'text-gray-700' : 'text-red-600'}>{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Agreement */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="w-5 h-5 mt-1"
                  />
                  <span className="text-sm text-yellow-800">
                    <strong>Declaration:</strong> Under penalties of perjury, I declare that I have examined this return 
                    and accompanying schedules and statements, and to the best of my knowledge and belief, 
                    they are true, correct, and complete.
                  </span>
                </label>
              </div>

              {/* E-file Notice */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">📬</span>
                  <div>
                    <h4 className="font-semibold text-blue-800">Filing Method: Print & Mail</h4>
                    <p className="text-sm text-blue-600 mt-1">
                      Your Form 1040 will be downloaded as a PDF. Print it, sign it, and mail it to the IRS.
                    </p>
                    <p className="text-xs text-blue-500 mt-2">
                      🔜 E-file integration coming soon!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Complete */}
          {currentStep === 5 && (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">🎉</div>
              <h3 className="text-2xl font-bold text-green-600 mb-2">Tax Return Ready!</h3>
              <p className="text-gray-600 mb-8">Your Form 1040 has been downloaded.</p>

              {/* What's Next */}
              <div className="bg-gray-50 rounded-xl p-6 text-left max-w-md mx-auto">
                <h4 className="font-semibold mb-4">📋 Next Steps:</h4>
                <ol className="space-y-3 text-sm">
                  <li className="flex gap-3">
                    <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
                    <span>Print your Form 1040 (all pages)</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
                    <span>Sign and date the form</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
                    <span>Attach W-2 forms</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">4</span>
                    <span>Mail to the IRS address below</span>
                  </li>
                </ol>
              </div>

              {/* Mailing Address */}
              <div className="bg-blue-50 rounded-xl p-6 text-left max-w-md mx-auto mt-6">
                <h4 className="font-semibold text-blue-800 mb-2">📮 IRS Mailing Address (California - Refund):</h4>
                <div className="bg-white rounded-lg p-4 font-mono text-sm">
                  Department of the Treasury<br />
                  Internal Revenue Service<br />
                  Fresno, CA 93888-0002
                </div>
                <p className="text-xs text-blue-600 mt-2">
                  * If you owe taxes, use: Fresno, CA 93888-0102
                </p>
              </div>

              {/* CA 540 Notice */}
              <div className="bg-amber-50 rounded-xl p-6 text-left max-w-md mx-auto mt-6">
                <h4 className="font-semibold text-amber-800 mb-2">🌴 California State Return:</h4>
                <p className="text-sm text-amber-700">
                  You also need to file CA Form 540 with the Franchise Tax Board.
                </p>
                <p className="text-xs text-amber-600 mt-2">
                  🔜 CA 540 PDF generation coming soon!
                </p>
              </div>

              {/* Refund Summary */}
              {(() => {
                const fedNet = (taxData?.federal?.refund || 0) - (taxData?.federal?.taxDue || 0);
                const stateNet = (taxData?.state?.refund || 0) - (taxData?.state?.taxDue || 0);
                const totalNet = fedNet + stateNet;
                return (
                  <div className={`${totalNet >= 0 ? 'bg-green-50' : 'bg-red-50'} rounded-xl p-6 max-w-md mx-auto mt-6`}>
                    <h4 className={`font-semibold ${totalNet >= 0 ? 'text-green-800' : 'text-red-800'} mb-2`}>
                      {totalNet >= 0 ? '💰 Expected Refund:' : '💸 Amount You Owe:'}
                    </h4>
                    <p className={`text-3xl font-bold ${totalNet >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmt(totalNet)}</p>
                    <p className="text-sm text-gray-600 mt-1">
                      Federal: {fmt(taxData?.federal?.refund)} | CA: {(taxData?.state?.taxDue || 0) > 0 ? '-' + fmt(taxData?.state?.taxDue) : fmt(taxData?.state?.refund)}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      Allow 6-8 weeks for processing (paper filing)
                    </p>
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {/* Footer Buttons */}
        <div className="px-6 py-4 bg-gray-50 border-t flex justify-between">
          {currentStep > 1 && currentStep < 5 ? (
            <button
              onClick={() => setCurrentStep(currentStep - 1)}
              className="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-100"
            >
              ← Back
            </button>
          ) : (
            <div></div>
          )}

          {currentStep < 4 && (
            <button
              onClick={() => setCurrentStep(currentStep + 1)}
              disabled={!isReady}
              className={`px-6 py-3 rounded-xl font-medium ${
                isReady 
                  ? 'bg-blue-600 text-white hover:bg-blue-700' 
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Continue →
            </button>
          )}

          {currentStep === 4 && (
            <button
              onClick={handleSubmit}
              disabled={!agreed || !isReady || downloading}
              className={`px-8 py-3 rounded-xl font-bold ${
                agreed && isReady && !downloading
                  ? 'bg-green-600 text-white hover:bg-green-700' 
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {downloading ? '⏳ Generating...' : '📥 Download & Complete'}
            </button>
          )}

          {currentStep === 5 && (
            <button
              onClick={onClose || (() => window.location.href = '/dashboard')}
              className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700"
            >
              ✓ Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}