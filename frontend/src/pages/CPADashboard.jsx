// ============================================================
// CPA DASHBOARD - Review Tax Filings
// ============================================================
// Location: frontend/src/components/CPADashboard.jsx
// ============================================================

import React, { useState, useEffect } from 'react';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export default function CPADashboard() {
  const [pendingFiles, setPendingFiles] = useState([]);
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0, total: 0 });
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [cpaName, setCpaName] = useState(localStorage.getItem('cpaName') || '');

  // ============================================================
  // FETCH DATA
  // ============================================================
  useEffect(() => {
    fetchStats();
    fetchFiles();
  }, [filter]);

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_BASE}/forms/cpa/stats`);
      const data = await res.json();
      if (data.success) setStats(data.stats);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const endpoint = filter === 'pending' 
        ? `${API_BASE}/forms/cpa/pending`
        : `${API_BASE}/forms/cpa/all?status=${filter}`;
      const res = await fetch(endpoint);
      const data = await res.json();
      if (data.success) setPendingFiles(data.files || []);
    } catch (err) {
      console.error('Failed to fetch files:', err);
    }
    setLoading(false);
  };

  // ============================================================
  // CPA ACTIONS
  // ============================================================
  const handleReview = async (fileId, status, corrections = null) => {
    if (!cpaName) {
      alert('Please enter your name first!');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/forms/cpa/review/${fileId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          reviewedBy: cpaName,
          comments: document.getElementById(`comment-${fileId}`)?.value || '',
          corrections
        })
      });
      
      const data = await res.json();
      if (data.success) {
        alert(`File ${status}!`);
        fetchStats();
        fetchFiles();
        setSelectedFile(null);
      }
    } catch (err) {
      console.error('Review failed:', err);
      alert('Failed to submit review');
    }
  };

  const downloadFile = (fileId) => {
    window.open(`${API_BASE}/forms/download/${fileId}`, '_blank');
  };

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>📋 CPA Review Dashboard</h1>
        <div style={styles.cpaNameBox}>
          <label>CPA Name: </label>
          <input
            type="text"
            value={cpaName}
            onChange={(e) => {
              setCpaName(e.target.value);
              localStorage.setItem('cpaName', e.target.value);
            }}
            placeholder="Enter your name"
            style={styles.input}
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div style={styles.statsRow}>
        <div style={{ ...styles.statCard, borderColor: '#f59e0b' }}>
          <div style={styles.statNumber}>{stats.pending}</div>
          <div style={styles.statLabel}>⏳ Pending</div>
        </div>
        <div style={{ ...styles.statCard, borderColor: '#10b981' }}>
          <div style={styles.statNumber}>{stats.approved}</div>
          <div style={styles.statLabel}>✅ Approved</div>
        </div>
        <div style={{ ...styles.statCard, borderColor: '#ef4444' }}>
          <div style={styles.statNumber}>{stats.rejected}</div>
          <div style={styles.statLabel}>❌ Rejected</div>
        </div>
        <div style={{ ...styles.statCard, borderColor: '#6366f1' }}>
          <div style={styles.statNumber}>{stats.total}</div>
          <div style={styles.statLabel}>📊 Total</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={styles.tabs}>
        {['pending', 'approved', 'rejected'].map(tab => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            style={{
              ...styles.tab,
              ...(filter === tab ? styles.activeTab : {})
            }}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Files List */}
      <div style={styles.filesList}>
        {loading ? (
          <div style={styles.loading}>Loading...</div>
        ) : pendingFiles.length === 0 ? (
          <div style={styles.empty}>No {filter} files</div>
        ) : (
          pendingFiles.map(file => (
            <div key={file._id || file.id} style={styles.fileCard}>
              {/* File Header */}
              <div style={styles.fileHeader}>
                <div>
                  <span style={styles.formType}>{file.formType}</span>
                  <span style={styles.userId}>User: {file.userId}</span>
                </div>
                <div style={styles.fileDate}>
                  {new Date(file.uploadedAt).toLocaleDateString()}
                </div>
              </div>

              {/* Extracted Data Preview */}
              <div style={styles.dataPreview}>
                {file.formType === 'W-2' && file.extractedData && (
                  <>
                    <div style={styles.dataRow}>
                      <span>Employee:</span>
                      <strong>{file.extractedData.employee_name || 'N/A'}</strong>
                    </div>
                    <div style={styles.dataRow}>
                      <span>Employer:</span>
                      <strong>{file.extractedData.employer_name || 'N/A'}</strong>
                    </div>
                    <div style={styles.dataRow}>
                      <span>Wages (Box 1):</span>
                      <strong style={styles.money}>
                        ${Number(file.extractedData.wages_tips_other_comp || 0).toLocaleString()}
                      </strong>
                    </div>
                    <div style={styles.dataRow}>
                      <span>Fed Withheld (Box 2):</span>
                      <strong style={styles.money}>
                        ${Number(file.extractedData.federal_income_tax_withheld || 0).toLocaleString()}
                      </strong>
                    </div>
                    <div style={styles.dataRow}>
                      <span>State Withheld (Box 17):</span>
                      <strong style={styles.money}>
                        ${Number(file.extractedData.state_income_tax || 0).toLocaleString()}
                      </strong>
                    </div>
                  </>
                )}
                {file.formType?.includes('1099') && file.extractedData && (
                  <>
                    <div style={styles.dataRow}>
                      <span>Payer:</span>
                      <strong>{file.extractedData.payer_name || 'N/A'}</strong>
                    </div>
                    <div style={styles.dataRow}>
                      <span>Income:</span>
                      <strong style={styles.money}>
                        ${Number(
                          file.extractedData.nonemployee_compensation ||
                          file.extractedData.interest_income ||
                          file.extractedData.ordinary_dividends || 0
                        ).toLocaleString()}
                      </strong>
                    </div>
                  </>
                )}
              </div>

              {/* Actions */}
              <div style={styles.actions}>
                <button
                  onClick={() => downloadFile(file._id || file.id)}
                  style={styles.viewBtn}
                >
                  📄 View Original
                </button>
                
                {file.status === 'pending' && (
                  <>
                    <button
                      onClick={() => setSelectedFile(file)}
                      style={styles.reviewBtn}
                    >
                      🔍 Review
                    </button>
                    <button
                      onClick={() => handleReview(file._id || file.id, 'approved')}
                      style={styles.approveBtn}
                    >
                      ✅ Quick Approve
                    </button>
                  </>
                )}
                
                {file.status !== 'pending' && (
                  <div style={styles.reviewInfo}>
                    <span>Reviewed by: {file.cpaReviewedBy}</span>
                    <span>{new Date(file.cpaReviewedAt).toLocaleString()}</span>
                  </div>
                )}
              </div>

              {/* Comment Box (for pending) */}
              {file.status === 'pending' && (
                <div style={styles.commentBox}>
                  <input
                    id={`comment-${file._id || file.id}`}
                    type="text"
                    placeholder="Add comment (optional)"
                    style={styles.commentInput}
                  />
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Review Modal */}
      {selectedFile && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <h2>🔍 Detailed Review</h2>
            <p><strong>Form:</strong> {selectedFile.formType}</p>
            <p><strong>User:</strong> {selectedFile.userId}</p>
            
            <h3>Extracted Data:</h3>
            <pre style={styles.jsonPreview}>
              {JSON.stringify(selectedFile.extractedData, null, 2)}
            </pre>

            <h3>Make Corrections (if needed):</h3>
            {selectedFile.formType === 'W-2' && (
              <div style={styles.corrections}>
                <label>
                  Wages (Box 1):
                  <input
                    id="correct-wages"
                    type="number"
                    defaultValue={selectedFile.extractedData?.wages_tips_other_comp}
                    style={styles.input}
                  />
                </label>
                <label>
                  Fed Withheld (Box 2):
                  <input
                    id="correct-fed"
                    type="number"
                    defaultValue={selectedFile.extractedData?.federal_income_tax_withheld}
                    style={styles.input}
                  />
                </label>
                <label>
                  State Withheld (Box 17):
                  <input
                    id="correct-state"
                    type="number"
                    defaultValue={selectedFile.extractedData?.state_income_tax}
                    style={styles.input}
                  />
                </label>
              </div>
            )}

            <div style={styles.modalActions}>
              <button
                onClick={() => setSelectedFile(null)}
                style={styles.cancelBtn}
              >
                Cancel
              </button>
              <button
                onClick={() => handleReview(selectedFile._id || selectedFile.id, 'rejected')}
                style={styles.rejectBtn}
              >
                ❌ Reject
              </button>
              <button
                onClick={() => {
                  const corrections = selectedFile.formType === 'W-2' ? {
                    wages_tips_other_comp: Number(document.getElementById('correct-wages')?.value),
                    federal_income_tax_withheld: Number(document.getElementById('correct-fed')?.value),
                    state_income_tax: Number(document.getElementById('correct-state')?.value)
                  } : null;
                  handleReview(selectedFile._id || selectedFile.id, 'approved', corrections);
                }}
                style={styles.approveBtn}
              >
                ✅ Approve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// STYLES
// ============================================================
const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '20px',
    fontFamily: 'system-ui, -apple-system, sans-serif'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    flexWrap: 'wrap',
    gap: '10px'
  },
  title: {
    margin: 0,
    fontSize: '24px'
  },
  cpaNameBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  input: {
    padding: '8px 12px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '14px'
  },
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '15px',
    marginBottom: '20px'
  },
  statCard: {
    background: '#fff',
    borderRadius: '12px',
    padding: '20px',
    textAlign: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    borderLeft: '4px solid'
  },
  statNumber: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#1f2937'
  },
  statLabel: {
    fontSize: '14px',
    color: '#6b7280',
    marginTop: '5px'
  },
  tabs: {
    display: 'flex',
    gap: '10px',
    marginBottom: '20px'
  },
  tab: {
    padding: '10px 20px',
    border: 'none',
    background: '#f3f4f6',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500'
  },
  activeTab: {
    background: '#3b82f6',
    color: '#fff'
  },
  filesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px'
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    color: '#6b7280'
  },
  empty: {
    textAlign: 'center',
    padding: '40px',
    color: '#6b7280',
    background: '#f9fafb',
    borderRadius: '12px'
  },
  fileCard: {
    background: '#fff',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  fileHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px'
  },
  formType: {
    background: '#dbeafe',
    color: '#1d4ed8',
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '14px',
    fontWeight: '600',
    marginRight: '10px'
  },
  userId: {
    color: '#6b7280',
    fontSize: '14px'
  },
  fileDate: {
    color: '#9ca3af',
    fontSize: '13px'
  },
  dataPreview: {
    background: '#f9fafb',
    borderRadius: '8px',
    padding: '15px',
    marginBottom: '15px'
  },
  dataRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '5px 0',
    borderBottom: '1px solid #e5e7eb'
  },
  money: {
    color: '#059669',
    fontFamily: 'monospace'
  },
  actions: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
    alignItems: 'center'
  },
  viewBtn: {
    padding: '8px 16px',
    background: '#f3f4f6',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px'
  },
  reviewBtn: {
    padding: '8px 16px',
    background: '#fef3c7',
    color: '#92400e',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500'
  },
  approveBtn: {
    padding: '8px 16px',
    background: '#d1fae5',
    color: '#065f46',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500'
  },
  rejectBtn: {
    padding: '8px 16px',
    background: '#fee2e2',
    color: '#991b1b',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500'
  },
  cancelBtn: {
    padding: '8px 16px',
    background: '#f3f4f6',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px'
  },
  reviewInfo: {
    display: 'flex',
    flexDirection: 'column',
    fontSize: '12px',
    color: '#6b7280'
  },
  commentBox: {
    marginTop: '10px'
  },
  commentInput: {
    width: '100%',
    padding: '10px',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    fontSize: '14px'
  },
  modal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  },
  modalContent: {
    background: '#fff',
    borderRadius: '16px',
    padding: '30px',
    maxWidth: '600px',
    width: '90%',
    maxHeight: '80vh',
    overflow: 'auto'
  },
  jsonPreview: {
    background: '#1f2937',
    color: '#10b981',
    padding: '15px',
    borderRadius: '8px',
    fontSize: '12px',
    overflow: 'auto',
    maxHeight: '200px'
  },
  corrections: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginBottom: '20px'
  },
  modalActions: {
    display: 'flex',
    gap: '10px',
    justifyContent: 'flex-end',
    marginTop: '20px'
  }
};
