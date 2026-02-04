// ============================================================
// CPA BID BOARD - CPA-Facing Job Marketplace
// ============================================================
// Location: src/pages/cpa/CPABidBoard.jsx
//
// CPAs see ANONYMIZED tax returns and bid their own price.
//
// What CPAs see:  State, Filing Status, Income Range,
//                 Dependents Count, Forms Needed
// What CPAs DON'T see: Name, SSN, Address, Exact Income
//
// After user accepts a bid → CPA gets access to full info
// (still NO raw SSN — server injects into PDF)
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  API_BASE,
  FILING_STATUS_OPTIONS,
  getStateName,
  isNoTaxState,
  fetchCPAJobs,
  placeCPABid,
  fetchAssignedJobDetails,
  generateCPAPdf,
  JOB_STATUS,
  timeAgo,
} from '../../components/cpa/taxFlowShared';

// ─── SORT OPTIONS ──────────────────────────────────────────
const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
];

// ─── FILTER OPTIONS ────────────────────────────────────────
const STATUS_FILTERS = [
  { value: 'all', label: 'All Jobs' },
  { value: 'open', label: '🟢 Open' },
  { value: 'my_bids', label: '🟡 My Bids' },
  { value: 'assigned', label: '🔵 Assigned to Me' },
];

// ─── MAIN COMPONENT ────────────────────────────────────────
export default function CPABidBoard() {
  // Auth (from localStorage or context)
  const [cpaUser, setCpaUser] = useState(null);
  const [token, setToken] = useState('');

  // Jobs
  const [jobs, setJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [statusFilter, setStatusFilter] = useState('open');
  const [sortBy, setSortBy] = useState('newest');
  const [searchState, setSearchState] = useState('');

  // Selected job + bid modal
  const [selectedJob, setSelectedJob] = useState(null);
  const [showBidModal, setShowBidModal] = useState(false);
  const [bidPrice, setBidPrice] = useState('');
  const [bidMessage, setBidMessage] = useState('');
  const [bidHours, setBidHours] = useState('24');
  const [submittingBid, setSubmittingBid] = useState(false);
  const [bidSuccess, setBidSuccess] = useState(false);

  // Assigned job detail
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [jobDetail, setJobDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // ── Load CPA auth ──
  useEffect(() => {
    try {
      const t = localStorage.getItem('cpa_token') || localStorage.getItem('token') || '';
      const u = JSON.parse(localStorage.getItem('cpa_user') || localStorage.getItem('user') || '{}');
      setToken(t);
      setCpaUser(u);
    } catch {}
  }, []);

  // ── Load Jobs ──
  const loadJobs = useCallback(async () => {
    if (!token) return;
    setLoadingJobs(true);
    try {
      const filters = {};
      if (statusFilter === 'open') filters.status = 'open';
      if (statusFilter === 'my_bids') filters.cpa_id = cpaUser?.id;
      if (statusFilter === 'assigned') filters.assigned_cpa_id = cpaUser?.id;
      if (searchState) filters.state = searchState.toUpperCase();

      const data = await fetchCPAJobs(token, filters);
      if (data.success) {
        let sorted = [...(data.jobs || [])];
        if (sortBy === 'newest') sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        if (sortBy === 'oldest') sorted.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        setJobs(sorted);
      }
    } catch (e) {
      console.error('[BID_BOARD] Load jobs error:', e);
    } finally {
      setLoadingJobs(false);
    }
  }, [token, statusFilter, sortBy, searchState, cpaUser]);

  useEffect(() => { loadJobs(); }, [loadJobs]);

  // Auto-refresh every 30s
  useEffect(() => {
    const interval = setInterval(loadJobs, 30000);
    return () => clearInterval(interval);
  }, [loadJobs]);

  // ── Place Bid ──
  async function handleSubmitBid() {
    if (!bidPrice || Number(bidPrice) <= 0) { alert('Please enter a valid bid price.'); return; }
    if (!selectedJob) return;
    setSubmittingBid(true);
    try {
      const result = await placeCPABid({
        jobId: selectedJob.id,
        token,
        cpaId: cpaUser?.id,
        cpaName: cpaUser?.name || cpaUser?.firm_name || 'CPA',
        cpaCredentials: cpaUser?.credentials || 'Licensed CPA',
        bidPrice: Number(bidPrice),
        message: bidMessage.trim(),
        estimatedHours: Number(bidHours) || 24,
      });
      if (result.success) {
        setBidSuccess(true);
        setTimeout(() => {
          setShowBidModal(false);
          setBidSuccess(false);
          setBidPrice('');
          setBidMessage('');
          setBidHours('24');
          loadJobs();
        }, 2000);
      } else {
        alert(result.message || 'Failed to place bid.');
      }
    } catch (e) {
      console.error('[BID_BOARD] Submit bid error:', e);
      alert('Error placing bid. Please try again.');
    } finally {
      setSubmittingBid(false);
    }
  }

  // ── View Assigned Job Detail ──
  async function handleViewDetail(job) {
    setSelectedJob(job);
    setShowDetailModal(true);
    setLoadingDetail(true);
    try {
      const data = await fetchAssignedJobDetails(job.id, token);
      if (data.success) setJobDetail(data.details || data);
      else setJobDetail(null);
    } catch { setJobDetail(null); }
    finally { setLoadingDetail(false); }
  }

  // ── Generate PDF ──
  async function handleGeneratePdf(jobId, formType = 'federal') {
    try {
      const blob = await generateCPAPdf(jobId, token, formType);
      if (blob) {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${formType === 'federal' ? 'Form1040' : 'StateForm'}_${jobId}.pdf`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        alert('PDF generation failed.');
      }
    } catch { alert('Error generating PDF.'); }
  }

  // ── Open Bid Modal ──
  function openBidModal(job) {
    setSelectedJob(job);
    setBidPrice('');
    setBidMessage('');
    setBidHours('24');
    setBidSuccess(false);
    setShowBidModal(true);
  }

  // ════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════
  return (
    <div style={s.page}>
      <div style={s.container}>

        {/* ── Header ── */}
        <div style={s.header}>
          <div>
            <h1 style={s.title}>🏷️ CPA Bid Board</h1>
            <p style={s.subtitle}>Browse anonymized tax returns and bid your price</p>
          </div>
          <button onClick={loadJobs} disabled={loadingJobs} style={s.refreshBtn}>
            {loadingJobs ? '⟳' : '🔄'} Refresh
          </button>
        </div>

        {/* ── Filters ── */}
        <div style={s.filterBar}>
          {/* Status tabs */}
          <div style={s.filterTabs}>
            {STATUS_FILTERS.map(f => (
              <button key={f.value} onClick={() => setStatusFilter(f.value)} style={{ ...s.filterTab, ...(statusFilter === f.value ? s.filterTabActive : {}) }}>
                {f.label}
              </button>
            ))}
          </div>
          {/* Search + Sort */}
          <div style={s.filterRight}>
            <input type="text" placeholder="Filter by state (CA, NY...)" maxLength={2} value={searchState} onChange={e => setSearchState(e.target.value.toUpperCase())} style={s.searchInput} />
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={s.sortSelect}>
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        {/* ── Stats ── */}
        <div style={s.statsRow}>
          <div style={s.statCard}>
            <span style={{ fontSize: 24 }}>📋</span>
            <span style={s.statNum}>{jobs.length}</span>
            <span style={s.statLabel}>Jobs Found</span>
          </div>
          <div style={s.statCard}>
            <span style={{ fontSize: 24 }}>🟢</span>
            <span style={s.statNum}>{jobs.filter(j => j.status === 'open').length}</span>
            <span style={s.statLabel}>Open</span>
          </div>
        </div>

        {/* ── Job List ── */}
        {loadingJobs ? (
          <div style={s.loadingBox}>
            <div style={s.spinner} />
            <p style={{ color: '#94a3b8', marginTop: 16 }}>Loading jobs...</p>
          </div>
        ) : jobs.length === 0 ? (
          <div style={s.emptyBox}>
            <p style={{ fontSize: 40, margin: '0 0 12px' }}>📭</p>
            <p style={{ color: '#e2e8f0', fontWeight: 600, fontSize: 18, margin: '0 0 6px' }}>No Jobs Found</p>
            <p style={{ color: '#64748b', margin: 0, fontSize: 13 }}>
              {statusFilter === 'open' ? 'No open jobs right now. Check back soon!' : 'No jobs match your filter.'}
            </p>
          </div>
        ) : (
          <div style={s.jobGrid}>
            {jobs.map(job => (
              <div key={job.id} style={s.jobCard}>
                {/* Status badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ ...s.statusBadge, backgroundColor: `${(JOB_STATUS[job.status] || JOB_STATUS.open).color}22`, color: (JOB_STATUS[job.status] || JOB_STATUS.open).color }}>
                    {(JOB_STATUS[job.status] || JOB_STATUS.open).icon} {(JOB_STATUS[job.status] || JOB_STATUS.open).label}
                  </span>
                  <span style={{ fontSize: 11, color: '#475569' }}>{timeAgo(job.created_at)}</span>
                </div>

                {/* Anonymized Info */}
                <div style={s.jobInfoGrid}>
                  <div style={s.jobInfoItem}>
                    <span style={s.jobInfoLabel}>State</span>
                    <span style={s.jobInfoValue}>{getStateName(job.state)} ({job.state})</span>
                  </div>
                  <div style={s.jobInfoItem}>
                    <span style={s.jobInfoLabel}>Filing Status</span>
                    <span style={s.jobInfoValue}>{FILING_STATUS_OPTIONS.find(o => o.value === job.filing_status)?.label || job.filing_status}</span>
                  </div>
                  <div style={s.jobInfoItem}>
                    <span style={s.jobInfoLabel}>Income Range</span>
                    <span style={{ ...s.jobInfoValue, color: '#10b981', fontWeight: 600 }}>{job.income_range || 'N/A'}</span>
                  </div>
                  <div style={s.jobInfoItem}>
                    <span style={s.jobInfoLabel}>Dependents</span>
                    <span style={s.jobInfoValue}>{job.dependents_count || 0}</span>
                  </div>
                </div>

                {/* Forms */}
                <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
                  <span style={s.formTag}>📄 Federal 1040</span>
                  {job.include_state && job.has_state_tax && <span style={{ ...s.formTag, borderColor: 'rgba(59,130,246,0.3)', color: '#60a5fa' }}>📄 {job.state} State</span>}
                </div>

                {/* Privacy notice */}
                <div style={s.privacyNotice}>
                  🔒 Personal info hidden until assigned
                </div>

                {/* Action buttons */}
                <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                  {job.status === 'open' && (
                    <button onClick={() => openBidModal(job)} style={s.bidBtn}>
                      💰 Place Bid
                    </button>
                  )}
                  {(job.status === 'assigned' || job.status === 'in_review') && job.assigned_cpa_id === cpaUser?.id && (
                    <button onClick={() => handleViewDetail(job)} style={{ ...s.bidBtn, background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}>
                      📋 View Client Details
                    </button>
                  )}
                  {job.my_bid && (
                    <div style={s.myBidTag}>
                      Your bid: <strong>${Number(job.my_bid.bid_price || 0).toFixed(0)}</strong>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════ */}
      {/* BID MODAL                                             */}
      {/* ══════════════════════════════════════════════════════ */}
      {showBidModal && selectedJob && (
        <div style={s.overlay} onClick={() => { if (!submittingBid) setShowBidModal(false); }}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            {bidSuccess ? (
              /* Success */
              <div style={{ textAlign: 'center', padding: 40 }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
                <h3 style={{ color: '#10b981', margin: '0 0 8px' }}>Bid Placed!</h3>
                <p style={{ color: '#94a3b8', margin: 0 }}>Your bid of <strong>${Number(bidPrice).toFixed(0)}</strong> has been submitted. You'll be notified if the client accepts.</p>
              </div>
            ) : (
              <>
                {/* Modal Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <h3 style={{ margin: 0, color: '#e2e8f0', fontSize: 18 }}>💰 Place Your Bid</h3>
                  <button onClick={() => setShowBidModal(false)} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 20, cursor: 'pointer' }}>×</button>
                </div>

                {/* Job Summary */}
                <div style={s.bidSummary}>
                  <div style={s.bidSummaryRow}><span>State</span><span style={{ color: '#e2e8f0' }}>{getStateName(selectedJob.state)}</span></div>
                  <div style={s.bidSummaryRow}><span>Filing Status</span><span style={{ color: '#e2e8f0' }}>{FILING_STATUS_OPTIONS.find(o => o.value === selectedJob.filing_status)?.label || selectedJob.filing_status}</span></div>
                  <div style={s.bidSummaryRow}><span>Income Range</span><span style={{ color: '#10b981', fontWeight: 600 }}>{selectedJob.income_range}</span></div>
                  <div style={s.bidSummaryRow}><span>Dependents</span><span style={{ color: '#e2e8f0' }}>{selectedJob.dependents_count || 0}</span></div>
                  <div style={{ ...s.bidSummaryRow, borderBottom: 'none' }}><span>Forms</span><span style={{ color: '#e2e8f0' }}>{selectedJob.include_state && selectedJob.has_state_tax ? 'Federal + State' : 'Federal Only'}</span></div>
                </div>

                {/* Bid Form */}
                <div style={{ marginTop: 20 }}>
                  {/* Price */}
                  <label style={s.inputLabel}>Your Bid Price ($) *</label>
                  <div style={{ position: 'relative', marginBottom: 16 }}>
                    <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: 18, fontWeight: 700 }}>$</span>
                    <input type="number" min="1" step="1" value={bidPrice} onChange={e => setBidPrice(e.target.value)} placeholder="0" style={{ ...s.bidInput, paddingLeft: 32, fontSize: 24, fontWeight: 700 }} autoFocus />
                  </div>

                  {/* Turnaround */}
                  <label style={s.inputLabel}>Estimated Turnaround (hours)</label>
                  <select value={bidHours} onChange={e => setBidHours(e.target.value)} style={{ ...s.bidInput, marginBottom: 16 }}>
                    <option value="4">4 hours (Express)</option>
                    <option value="12">12 hours</option>
                    <option value="24">24 hours (Standard)</option>
                    <option value="48">48 hours</option>
                    <option value="72">72 hours</option>
                  </select>

                  {/* Message */}
                  <label style={s.inputLabel}>Message to Client (optional)</label>
                  <textarea value={bidMessage} onChange={e => setBidMessage(e.target.value)} placeholder="e.g. 15+ years experience with CA returns. I'll maximize your deductions." rows={3} style={{ ...s.bidInput, resize: 'vertical', marginBottom: 20 }} />

                  {/* Submit */}
                  <button onClick={handleSubmitBid} disabled={submittingBid || !bidPrice || Number(bidPrice) <= 0} style={{ ...s.submitBidBtn, opacity: (submittingBid || !bidPrice || Number(bidPrice) <= 0) ? 0.5 : 1, cursor: (submittingBid || !bidPrice) ? 'not-allowed' : 'pointer' }}>
                    {submittingBid ? '⏳ Submitting...' : `💰 Place Bid — $${Number(bidPrice || 0).toFixed(0)}`}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════ */}
      {/* CLIENT DETAIL MODAL (Assigned jobs only)              */}
      {/* ══════════════════════════════════════════════════════ */}
      {showDetailModal && selectedJob && (
        <div style={s.overlay} onClick={() => setShowDetailModal(false)}>
          <div style={{ ...s.modal, maxWidth: 600 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, color: '#e2e8f0', fontSize: 18 }}>📋 Client Details</h3>
              <button onClick={() => setShowDetailModal(false)} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 20, cursor: 'pointer' }}>×</button>
            </div>

            {loadingDetail ? (
              <div style={{ textAlign: 'center', padding: 40 }}><div style={s.spinner} /><p style={{ color: '#94a3b8', marginTop: 16 }}>Loading client details...</p></div>
            ) : jobDetail ? (
              <>
                {/* Client info (revealed after assignment) */}
                <div style={s.bidSummary}>
                  <h4 style={{ margin: '0 0 12px', color: '#a78bfa', fontSize: 14 }}>👤 Client Information</h4>
                  <div style={s.bidSummaryRow}><span>Name</span><span style={{ color: '#e2e8f0', fontWeight: 600 }}>{jobDetail.first_name} {jobDetail.last_name}</span></div>
                  <div style={s.bidSummaryRow}><span>Address</span><span style={{ color: '#e2e8f0' }}>{jobDetail.address}, {jobDetail.city}, {jobDetail.state} {jobDetail.zip}</span></div>
                  <div style={s.bidSummaryRow}><span>Filing Status</span><span style={{ color: '#e2e8f0' }}>{FILING_STATUS_OPTIONS.find(o => o.value === jobDetail.filing_status)?.label || jobDetail.filing_status}</span></div>
                  <div style={s.bidSummaryRow}><span>Dependents</span><span style={{ color: '#e2e8f0' }}>{jobDetail.dependents_count || 0}</span></div>
                  <div style={{ ...s.bidSummaryRow, borderBottom: 'none' }}><span>SSN</span><span style={{ color: '#f59e0b' }}>🔒 Encrypted — auto-filled into PDF</span></div>
                </div>

                {/* Spouse info */}
                {jobDetail.spouse_first_name && (
                  <div style={{ ...s.bidSummary, marginTop: 12 }}>
                    <h4 style={{ margin: '0 0 12px', color: '#a78bfa', fontSize: 14 }}>👫 Spouse</h4>
                    <div style={s.bidSummaryRow}><span>Name</span><span style={{ color: '#e2e8f0' }}>{jobDetail.spouse_first_name} {jobDetail.spouse_last_name}</span></div>
                    <div style={{ ...s.bidSummaryRow, borderBottom: 'none' }}><span>SSN</span><span style={{ color: '#f59e0b' }}>🔒 Encrypted</span></div>
                  </div>
                )}

                {/* Income summary */}
                <div style={{ ...s.bidSummary, marginTop: 12 }}>
                  <h4 style={{ margin: '0 0 12px', color: '#10b981', fontSize: 14 }}>💰 Income Details</h4>
                  <div style={s.bidSummaryRow}><span>Total Income</span><span style={{ color: '#10b981', fontWeight: 600 }}>${Number(jobDetail.total_income || 0).toLocaleString()}</span></div>
                  <div style={s.bidSummaryRow}><span>Federal Withholding</span><span style={{ color: '#e2e8f0' }}>${Number(jobDetail.federal_withholding || 0).toLocaleString()}</span></div>
                  <div style={{ ...s.bidSummaryRow, borderBottom: 'none' }}><span>State Withholding</span><span style={{ color: '#e2e8f0' }}>${Number(jobDetail.state_withholding || 0).toLocaleString()}</span></div>
                </div>

                {/* Dependents list */}
                {jobDetail.dependents && jobDetail.dependents.length > 0 && (
                  <div style={{ ...s.bidSummary, marginTop: 12 }}>
                    <h4 style={{ margin: '0 0 12px', color: '#a78bfa', fontSize: 14 }}>👶 Dependents</h4>
                    {jobDetail.dependents.map((dep, i) => (
                      <div key={i} style={s.bidSummaryRow}>
                        <span>{dep.first_name} {dep.last_name} ({dep.relationship})</span>
                        <span style={{ color: '#f59e0b' }}>SSN: 🔒</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Generate PDF buttons */}
                <div style={{ marginTop: 20 }}>
                  <p style={{ color: '#94a3b8', fontSize: 12, marginBottom: 12 }}>🔒 SSN is automatically inserted into PDFs by the server. You never see the raw SSN.</p>
                  <button onClick={() => handleGeneratePdf(selectedJob.id, 'federal')} style={s.submitBidBtn}>
                    📄 Generate Federal 1040 PDF
                  </button>
                  {selectedJob.include_state && selectedJob.has_state_tax && (
                    <button onClick={() => handleGeneratePdf(selectedJob.id, 'state')} style={{ ...s.submitBidBtn, background: 'linear-gradient(135deg, #0ea5e9, #0284c7)', marginTop: 10 }}>
                      📄 Generate {selectedJob.state} State PDF
                    </button>
                  )}
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <p style={{ fontSize: 40, marginBottom: 12 }}>🔒</p>
                <p style={{ color: '#e2e8f0', fontWeight: 600, margin: '0 0 6px' }}>Access Denied</p>
                <p style={{ color: '#64748b', margin: 0, fontSize: 13 }}>Client details are only available for jobs assigned to you.</p>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─── STYLES ────────────────────────────────────────────────
const s = {
  page: {
    minHeight: '100vh', backgroundColor: '#0f172a', color: '#e2e8f0',
    padding: '24px 16px',
  },
  container: { maxWidth: 1000, margin: '0 auto' },

  // Header
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 24,
  },
  title: { margin: 0, fontSize: 28, fontWeight: 800, color: '#e2e8f0' },
  subtitle: { margin: '4px 0 0', fontSize: 14, color: '#64748b' },
  refreshBtn: {
    padding: '8px 16px', fontSize: 13, fontWeight: 600, color: '#94a3b8',
    backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8, cursor: 'pointer',
  },

  // Filters
  filterBar: {
    display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 20,
    alignItems: 'center', justifyContent: 'space-between',
  },
  filterTabs: { display: 'flex', gap: 6, flexWrap: 'wrap' },
  filterTab: {
    padding: '6px 14px', fontSize: 13, fontWeight: 500, color: '#94a3b8',
    backgroundColor: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s',
  },
  filterTabActive: {
    backgroundColor: 'rgba(124,58,237,0.2)', color: '#a78bfa',
    borderColor: 'rgba(124,58,237,0.4)',
  },
  filterRight: { display: 'flex', gap: 8 },
  searchInput: {
    padding: '6px 12px', fontSize: 13, width: 140,
    border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.05)', color: '#e2e8f0', outline: 'none',
  },
  sortSelect: {
    padding: '6px 12px', fontSize: 13,
    border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.05)', color: '#e2e8f0',
  },

  // Stats
  statsRow: { display: 'flex', gap: 12, marginBottom: 20 },
  statCard: {
    display: 'flex', alignItems: 'center', gap: 10, padding: '12px 20px',
    backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.06)',
  },
  statNum: { fontSize: 22, fontWeight: 700, color: '#e2e8f0' },
  statLabel: { fontSize: 13, color: '#64748b' },

  // Loading / Empty
  loadingBox: { textAlign: 'center', padding: 60 },
  spinner: {
    width: 40, height: 40, border: '4px solid rgba(255,255,255,0.1)',
    borderTopColor: '#7c3aed', borderRadius: '50%', animation: 'spin 1s linear infinite',
    margin: '0 auto',
  },
  emptyBox: {
    textAlign: 'center', padding: 60, backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 16, border: '1px dashed rgba(255,255,255,0.08)',
  },

  // Job Grid
  jobGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 },
  jobCard: {
    padding: 20, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.06)', transition: 'border-color 0.2s',
  },
  statusBadge: {
    padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
  },
  jobInfoGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 },
  jobInfoItem: { display: 'flex', flexDirection: 'column', gap: 2 },
  jobInfoLabel: { fontSize: 11, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5 },
  jobInfoValue: { fontSize: 14, color: '#e2e8f0', fontWeight: 500 },
  formTag: {
    padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 500,
    border: '1px solid rgba(16,185,129,0.3)', color: '#6ee7b7',
    backgroundColor: 'rgba(16,185,129,0.08)',
  },
  privacyNotice: {
    marginTop: 10, padding: '6px 10px', borderRadius: 6, fontSize: 11,
    color: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.08)',
    border: '1px solid rgba(245,158,11,0.15)',
  },
  bidBtn: {
    flex: 1, padding: '10px 16px', fontSize: 14, fontWeight: 600, color: 'white',
    background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', border: 'none',
    borderRadius: 8, cursor: 'pointer',
  },
  myBidTag: {
    padding: '8px 12px', fontSize: 12, color: '#a78bfa', fontWeight: 500,
    backgroundColor: 'rgba(124,58,237,0.1)', borderRadius: 8,
    border: '1px solid rgba(124,58,237,0.2)', display: 'flex',
    alignItems: 'center', gap: 4,
  },

  // Modals
  overlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex',
    alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16,
  },
  modal: {
    backgroundColor: '#1e293b', borderRadius: 20, padding: 28, width: '100%',
    maxWidth: 500, maxHeight: '85vh', overflowY: 'auto',
    border: '1px solid rgba(255,255,255,0.1)',
    boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
  },
  bidSummary: {
    backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12,
    padding: 16, border: '1px solid rgba(255,255,255,0.06)',
  },
  bidSummaryRow: {
    display: 'flex', justifyContent: 'space-between', padding: '8px 0',
    borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: 13, color: '#94a3b8',
  },
  inputLabel: {
    display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: '#94a3b8',
  },
  bidInput: {
    width: '100%', padding: 12, fontSize: 14,
    border: '2px solid rgba(255,255,255,0.1)', borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.05)', color: '#e2e8f0',
    boxSizing: 'border-box', outline: 'none',
  },
  submitBidBtn: {
    width: '100%', padding: '14px 24px', fontSize: 15, fontWeight: 600,
    color: 'white', background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
    border: 'none', borderRadius: 10, cursor: 'pointer',
  },
};
