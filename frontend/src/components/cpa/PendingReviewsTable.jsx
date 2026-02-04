// ============================================================
// USER FILINGS TABLE - Groups documents by User - DARK THEME
// ============================================================
// Location: frontend/src/components/cpa/PendingReviewsTable.jsx
// ✅ Shows ONE ROW per USER with all their documents
// ✅ UPDATED: ZIP code column for territory filtering
// ✅ UPDATED: Dark theme matching TaxSky design
// ✅ v2.0: Shows Interview Status (Complete/Incomplete)
// ✅ v3.0: Shows Payment Status (Paid/Unpaid)
// ============================================================

import React, { useState, useMemo } from 'react';

// ============================================================
// HELPER: Get income from a single file based on form type
// ============================================================
function getFileIncome(file) {
  const data = file.extractedData || {};
  const formType = file.formType || 'W-2';
  
  switch (formType) {
    case 'W-2':
    case 'W2':
      return {
        income: parseFloat(data.wages_tips_other_comp || data.wages || 0),
        withheld: parseFloat(data.federal_income_tax_withheld || data.federal_withheld || 0),
        stateWithheld: parseFloat(data.state_income_tax || data.state_withheld || 0)
      };
    case '1099-INT':
      return {
        income: parseFloat(data.interest_income || data.box1_interest || data.amount || 0),
        withheld: parseFloat(data.federal_tax_withheld || data.box4_federal_withheld || 0),
        stateWithheld: 0
      };
    case '1099-DIV':
      return {
        income: parseFloat(data.total_dividends || data.box1a_dividends || data.ordinary_dividends || 0),
        withheld: parseFloat(data.federal_tax_withheld || data.box4_federal_withheld || 0),
        stateWithheld: 0
      };
    case '1099-NEC':
      return {
        income: parseFloat(data.nonemployee_compensation || data.box1_nec || data.compensation || 0),
        withheld: parseFloat(data.federal_tax_withheld || data.box4_federal_withheld || 0),
        stateWithheld: 0
      };
    case '1099-R':
      return {
        income: parseFloat(data.gross_distribution || data.box1_gross || 0),
        withheld: parseFloat(data.federal_tax_withheld || data.box4_federal_withheld || 0),
        stateWithheld: 0
      };
    case '1099-G':
      return {
        income: parseFloat(data.unemployment_compensation || data.box1_unemployment || 0),
        withheld: parseFloat(data.federal_tax_withheld || data.box4_federal_withheld || 0),
        stateWithheld: 0
      };
    case 'SSA-1099':
      return {
        income: parseFloat(data.social_security_benefits || data.box5_benefits || 0),
        withheld: parseFloat(data.federal_tax_withheld || data.box6_federal_withheld || 0),
        stateWithheld: 0
      };
    default:
      return {
        income: parseFloat(data.amount || data.income || 0),
        withheld: parseFloat(data.federal_tax_withheld || data.withheld || 0),
        stateWithheld: 0
      };
  }
}

// ============================================================
// HELPER: Get user name from file
// ============================================================
function getUserNameFromFile(file) {
  const data = file.extractedData || {};
  const formType = file.formType || 'W-2';
  
  if (formType === 'W-2' || formType === 'W2') {
    return data.employee_name || 
           `${data.employee_first_name || ''} ${data.employee_last_name || ''}`.trim() ||
           file.userName ||
           'Unknown';
  }
  
  return data.recipient_name ||
         `${data.recipient_first_name || ''} ${data.recipient_last_name || ''}`.trim() ||
         data.payee_name ||
         file.userName ||
         'Unknown';
}

// ============================================================
// HELPER: Get ZIP code from file or user data
// ============================================================
function getZipCodeFromFile(file) {
  const data = file.extractedData || {};
  // Check various possible field names for ZIP code
  return data.employee_zip || 
         data.zip || 
         data.zipcode || 
         data.postal_code ||
         file.userZip ||
         file.zip ||
         '';
}

// ============================================================
// HELPER: Group files by userId
// ============================================================
function groupFilesByUser(files) {
  const grouped = {};
  
  files.forEach(file => {
    const userId = file.userId;
    if (!grouped[userId]) {
      grouped[userId] = {
        userId,
        userName: getUserNameFromFile(file),
        zipCode: getZipCodeFromFile(file),
        files: [],
        formTypes: [],
        totalIncome: 0,
        totalFedWithheld: 0,
        totalStateWithheld: 0,
        hasPending: false,
        hasRejected: false,
        allApproved: true,
        latestUpload: file.uploadedAt,
        // ✅ Interview/Session status from API
        hasCompletedInterview: file.hasCompletedInterview || file.hasForm1040 || false,
        sessionStatus: file.sessionStatus || 'unknown',
        readyForCPA: file.readyForCPA || false,
        warning: file.warning || null,
        // ✅ v3.0: Payment status from API
        hasPaid: file.hasPaid || false,
        paymentPlan: file.paymentPlan || null,
        paidAt: file.paidAt || null,
        isCPAPlan: file.isCPAPlan || false
      };
    }
    
    // Add file
    grouped[userId].files.push(file);
    
    // Track form types
    if (!grouped[userId].formTypes.includes(file.formType)) {
      grouped[userId].formTypes.push(file.formType);
    }
    
    // Calculate totals
    const incomeData = getFileIncome(file);
    grouped[userId].totalIncome += incomeData.income || 0;
    grouped[userId].totalFedWithheld += incomeData.withheld || 0;
    grouped[userId].totalStateWithheld += incomeData.stateWithheld || 0;
    
    // Track status
    if (file.status === 'pending') {
      grouped[userId].hasPending = true;
      grouped[userId].allApproved = false;
    }
    if (file.status === 'rejected') {
      grouped[userId].hasRejected = true;
      grouped[userId].allApproved = false;
    }
    
    // Track latest upload
    if (new Date(file.uploadedAt) > new Date(grouped[userId].latestUpload)) {
      grouped[userId].latestUpload = file.uploadedAt;
    }
    
    // Update name if we find a better one
    const name = getUserNameFromFile(file);
    if (name && name !== 'Unknown' && grouped[userId].userName === 'Unknown') {
      grouped[userId].userName = name;
    }
    
    // Update ZIP if we find one
    const zip = getZipCodeFromFile(file);
    if (zip && !grouped[userId].zipCode) {
      grouped[userId].zipCode = zip;
    }
    
    // ✅ Update interview status if any file has it
    if (file.hasCompletedInterview || file.hasForm1040) {
      grouped[userId].hasCompletedInterview = true;
      grouped[userId].readyForCPA = file.hasPaid; // Ready = interview + paid
      grouped[userId].warning = null;
    }
    
    // ✅ v3.0: Update payment status if any file has it
    if (file.hasPaid) {
      grouped[userId].hasPaid = true;
      grouped[userId].paymentPlan = file.paymentPlan;
      grouped[userId].paidAt = file.paidAt;
      grouped[userId].isCPAPlan = file.isCPAPlan;
    }
  });
  
  return Object.values(grouped);
}

// ============================================================
// Form Type Badge - Dark Theme
// ============================================================
function FormBadge({ formType }) {
  const colors = {
    'W-2': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    'W2': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    '1099-INT': 'bg-green-500/20 text-green-400 border-green-500/30',
    '1099-DIV': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    '1099-NEC': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    '1099-R': 'bg-pink-500/20 text-pink-400 border-pink-500/30',
    '1099-G': 'bg-teal-500/20 text-teal-400 border-teal-500/30',
    'SSA-1099': 'bg-red-500/20 text-red-400 border-red-500/30',
  };
  
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium mr-1 mb-1 border ${colors[formType] || 'bg-slate-700 text-slate-300 border-slate-600'}`}>
      {formType}
    </span>
  );
}

// ============================================================
// Status Badge - Dark Theme
// ============================================================
function StatusBadge({ userGroup }) {
  if (userGroup.hasPending) {
    return (
      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-amber-500/20 text-amber-400 border border-amber-500/30">
        ⏳ Pending ({userGroup.files.filter(f => f.status === 'pending').length})
      </span>
    );
  }
  if (userGroup.hasRejected) {
    return (
      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30">
        ❌ Rejected
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
      ✅ Approved
    </span>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function PendingReviewsTable({ 
  files = [], 
  loading = false, 
  onSelectFile,
  onBulkApprove,
  showBulkActions = true,
  zipCodeFilter = '',
  onZipCodeFilterChange
}) {
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  
  // Group files by user (compute once, filter separately)
  const allUserGroups = useMemo(() => {
    return groupFilesByUser(files).sort((a, b) => 
      new Date(b.latestUpload) - new Date(a.latestUpload)
    );
  }, [files]);
  
  // Apply ZIP filter
  const userGroups = useMemo(() => {
    if (!zipCodeFilter) return allUserGroups;
    return allUserGroups.filter(g => 
      g.zipCode && g.zipCode.startsWith(zipCodeFilter)
    );
  }, [allUserGroups, zipCodeFilter]);
  
  // Get unique ZIP codes from unfiltered groups (✅ no recomputation)
  const uniqueZipCodes = useMemo(() => {
    const zips = new Set();
    allUserGroups.forEach(g => {
      if (g.zipCode) zips.add(g.zipCode);
    });
    return Array.from(zips).sort();
  }, [allUserGroups]);
  
  // Format currency
  function formatCurrency(amount) {
    if (amount === null || amount === undefined || isNaN(amount)) return '$0';
    return '$' + Number(amount).toLocaleString();
  }
  
  // Format date
  function formatDate(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  // Toggle select user
  function toggleSelectUser(userId) {
    setSelectedUserIds(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  }
  
  // Select all (✅ only selects users ready for CPA review)
  function toggleSelectAll() {
    const readyGroups = userGroups.filter(g => g.hasCompletedInterview && g.hasPaid);
    if (selectedUserIds.length === readyGroups.length && readyGroups.length > 0) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(readyGroups.map(g => g.userId));
    }
  }
  
  // Bulk approve - get all pending file IDs for selected users
  function handleBulkApprove() {
    const pendingFileIds = [];
    userGroups
      .filter(g => selectedUserIds.includes(g.userId))
      .forEach(g => {
        g.files
          .filter(f => f.status === 'pending')
          .forEach(f => pendingFileIds.push(f._id));
      });
    
    if (pendingFileIds.length > 0 && onBulkApprove) {
      if (confirm(`Approve ${pendingFileIds.length} documents for ${selectedUserIds.length} user(s)?`)) {
        onBulkApprove(pendingFileIds);
        setSelectedUserIds([]);
      }
    }
  }
  
  // Handle review - pass first file ID but modal will load all user data
  function handleReview(userGroup) {
    // Pass the first pending file, or first file if none pending
    const fileToReview = userGroup.files.find(f => f.status === 'pending') || userGroup.files[0];
    if (fileToReview && onSelectFile) {
      onSelectFile(fileToReview._id);
    }
  }
  
  if (loading) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-xl">
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-2 text-slate-400">Loading filings...</p>
        </div>
      </div>
    );
  }
  
  if (userGroups.length === 0 && !zipCodeFilter) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-xl">
        <div className="p-8 text-center">
          <div className="text-4xl mb-2">📭</div>
          <p className="text-slate-400">No tax filings found</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
      {/* ZIP Code Filter Bar */}
      <div className="bg-slate-800/50 px-4 py-3 border-b border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-slate-400 text-sm">📍 Filter by ZIP:</span>
          <select
            value={zipCodeFilter}
            onChange={(e) => onZipCodeFilterChange && onZipCodeFilterChange(e.target.value)}
            className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-white focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All ZIP Codes</option>
            {uniqueZipCodes.map(zip => (
              <option key={zip} value={zip}>{zip}</option>
            ))}
          </select>
          {zipCodeFilter && (
            <button
              onClick={() => onZipCodeFilterChange && onZipCodeFilterChange('')}
              className="text-slate-400 hover:text-white text-sm"
            >
              ✕ Clear
            </button>
          )}
        </div>
        <span className="text-slate-500 text-sm">
          {userGroups.length} filer{userGroups.length !== 1 ? 's' : ''} 
          {zipCodeFilter && ` in ${zipCodeFilter}`}
        </span>
      </div>

      {/* Bulk Actions Bar */}
      {showBulkActions && selectedUserIds.length > 0 && (
        <div className="bg-blue-500/10 border-b border-blue-500/30 px-4 py-3 flex justify-between items-center">
          <span className="text-blue-400">
            {selectedUserIds.length} user(s) selected
          </span>
          <div className="flex gap-2">
            <button
              onClick={handleBulkApprove}
              className="bg-emerald-500 text-white px-4 py-1.5 rounded-lg hover:bg-emerald-600 transition text-sm font-medium"
            >
              ✅ Approve All Documents
            </button>
            <button
              onClick={() => setSelectedUserIds([])}
              className="bg-slate-600 text-white px-4 py-1.5 rounded-lg hover:bg-slate-500 transition text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      
      {/* No results after filter */}
      {userGroups.length === 0 && zipCodeFilter && (
        <div className="p-8 text-center">
          <div className="text-4xl mb-2">🔍</div>
          <p className="text-slate-400">No filings found for ZIP code: {zipCodeFilter}</p>
        </div>
      )}
      
      {/* Table */}
      {userGroups.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-900/50 border-b border-slate-700">
              <tr>
                {showBulkActions && (
                  <th className="px-4 py-3 text-left w-10">
                    <input
                      type="checkbox"
                      checked={selectedUserIds.length > 0 && selectedUserIds.length === userGroups.filter(g => g.hasCompletedInterview && g.hasPaid).length}
                      onChange={toggleSelectAll}
                      className="rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-blue-500"
                    />
                  </th>
                )}
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">Taxpayer</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">ZIP Code</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">Documents</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">Total Income</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">Fed Withheld</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">Interview</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">Payment</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">Last Upload</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {userGroups.map((userGroup) => {
                // ✅ v3.0: Ready for CPA = interview complete + paid
                const isReadyForCPA = userGroup.hasCompletedInterview && userGroup.hasPaid;
                
                return (
                <tr 
                  key={userGroup.userId} 
                  className={`hover:bg-slate-700/50 transition ${!isReadyForCPA ? 'opacity-70' : ''}`}
                >
                  {showBulkActions && (
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedUserIds.includes(userGroup.userId)}
                        onChange={() => toggleSelectUser(userGroup.userId)}
                        className="rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-blue-500"
                        disabled={!isReadyForCPA}
                      />
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-white">{userGroup.userName}</p>
                      <p className="text-xs text-slate-500 truncate max-w-[180px]">{userGroup.userId}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {userGroup.zipCode ? (
                      <span className="font-mono text-sm text-slate-300 bg-slate-700 px-2 py-1 rounded">
                        📍 {userGroup.zipCode}
                      </span>
                    ) : (
                      <span className="text-slate-500 text-sm">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap max-w-[200px]">
                      {userGroup.formTypes.map((ft, i) => (
                        <FormBadge key={i} formType={ft} />
                      ))}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {userGroup.files.length} document{userGroup.files.length > 1 ? 's' : ''}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-mono font-semibold text-white">
                      {formatCurrency(userGroup.totalIncome)}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-mono text-slate-300">
                      {formatCurrency(userGroup.totalFedWithheld)}
                    </p>
                    {userGroup.totalStateWithheld > 0 && (
                      <p className="text-xs text-slate-500">
                        State: {formatCurrency(userGroup.totalStateWithheld)}
                      </p>
                    )}
                  </td>
                  {/* ✅ Interview Status Column */}
                  <td className="px-4 py-3">
                    {userGroup.hasCompletedInterview ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        ✅ Complete
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        ⚠️ Incomplete
                      </span>
                    )}
                  </td>
                  {/* ✅ v3.0: Payment Status Column */}
                  <td className="px-4 py-3">
                    {userGroup.hasPaid ? (
                      <div>
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          💳 Paid
                        </span>
                        {userGroup.paymentPlan && (
                          <p className="text-xs text-slate-500 mt-1">{userGroup.paymentPlan}</p>
                        )}
                      </div>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30">
                        ❌ Unpaid
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge userGroup={userGroup} />
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-400">
                    {formatDate(userGroup.latestUpload)}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleReview(userGroup)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                        isReadyForCPA
                          ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600'
                          : 'bg-slate-600 text-slate-300 cursor-not-allowed'
                      }`}
                      disabled={!isReadyForCPA}
                      title={!isReadyForCPA 
                        ? (!userGroup.hasCompletedInterview ? 'User has not completed interview' : 'User has not paid for CPA service')
                        : 'Review this filing'}
                    >
                      {isReadyForCPA ? 'Review →' : 'Waiting...'}
                    </button>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      
      {/* Summary Footer */}
      <div className="bg-slate-900/50 px-4 py-3 border-t border-slate-700 text-sm text-slate-400">
        <span className="font-medium text-white">{userGroups.length}</span> tax filers • 
        <span className="font-medium text-white ml-1">{files.length}</span> total documents • 
        <span className="font-medium text-white ml-1">{userGroups.filter(g => g.hasPending).length}</span> pending review
      </div>
    </div>
  );
}