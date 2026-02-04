// ============================================================
// CPA DASHBOARD - Main Control Panel for CPAs
// ============================================================
// Location: frontend/src/pages/cpa/CPADashboard.jsx
//
// After CPA logs in, this is their home page.
// Tabs: Open Jobs | My Bids | Assigned to Me | Profile
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// ─── Helper: time ago ──────────────────────────────────────
function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// ─── Helper: income display ────────────────────────────────
function incomeDisplay(range) {
  if (!range) return 'N/A';
  if (typeof range === 'string') return range;
  if (range.min !== undefined && range.max !== undefined) {
    return `$${(range.min / 1000).toFixed(0)}K – $${(range.max / 1000).toFixed(0)}K`;
  }
  return 'N/A';
}

// ─── Helper: filing status label ───────────────────────────
const FILING_LABELS = {
  single: 'Single',
  married_filing_jointly: 'Married Filing Jointly',
  married_filing_separately: 'Married Filing Separately',
  head_of_household: 'Head of Household',
  qualifying_widow: 'Qualifying Widow(er)',
};

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function CPADashboard() {
  const navigate = useNavigate();

  // ── Auth ──
  const [cpa, setCpa] = useState(null);
  const [token, setToken] = useState('');

  // ── Tab ──
  const [activeTab, setActiveTab] = useState('open');

  // ── Jobs data ──
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ open: 0, myBids: 0, assigned: 0, completed: 0 });

  // ── Bid Modal ──
  const [showBidModal, setShowBidModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [bidPrice, setBidPrice] = useState('');
  const [bidMessage, setBidMessage] = useState('');
  const [bidHours, setBidHours] = useState('24');
  const [submitting, setSubmitting] = useState(false);

  // ── Detail Modal (assigned jobs) ──
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [jobDetail, setJobDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // ── Filters ──
  const [searchState, setSearchState] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  // ── Messages ──
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // ══════════════════════════════════════════════════════════
  // AUTH CHECK
  // ══════════════════════════════════════════════════════════
  useEffect(() => {
    const t = localStorage.getItem('cpa_token');
    const u = localStorage.getItem('cpa_user');
    if (!t || !u) {
      navigate('/cpa/login');
      return;
    }
    try {
      setToken(t);
      setCpa(JSON.parse(u));
    } catch {
      navigate('/cpa/login');
    }
  }, [navigate]);

  // ══════════════════════════════════════════════════════════
  // LOAD JOBS
  // ══════════════════════════════════════════════════════════
  const loadJobs = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      // Build query params
      const params = new URLSearchParams();
      if (activeTab === 'open') params.append('status', 'open');
      if (activeTab === 'myBids') params.append('bidder_id', cpa?.id);
      if (activeTab === 'assigned') params.append('assigned_cpa_id', cpa?.id);
      if (activeTab === 'completed') params.append('status', 'completed');
      if (searchState) params.append('state', searchState.toUpperCase());

      const res = await fetch(`${API_URL}/api/cpa/jobs?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (data.success) {
        let sorted = [...(data.jobs || [])];
        if (sortBy === 'newest') sorted.sort((a, b) => new Date(b.createdAt || b.created_at) - new Date(a.createdAt || a.created_at));
        if (sortBy === 'oldest') sorted.sort((a, b) => new Date(a.createdAt || a.created_at) - new Date(b.createdAt || b.created_at));
        setJobs(sorted);
      }
    } catch (e) {
      console.error('[CPA_DASH] Load jobs error:', e);
    } finally {
      setLoading(false);
    }
  }, [token, activeTab, searchState, sortBy, cpa]);

  useEffect(() => { loadJobs(); }, [loadJobs]);

  // Auto-refresh every 30s
  useEffect(() => {
    if (!token) return;
    const interval = setInterval(loadJobs, 30000);
    return () => clearInterval(interval);
  }, [loadJobs, token]);

  // ══════════════════════════════════════════════════════════
  // LOAD STATS
  // ══════════════════════════════════════════════════════════
  useEffect(() => {
    if (!token || !cpa) return;
    async function fetchStats() {
      try {
        // Fetch all jobs to compute stats
        const res = await fetch(`${API_URL}/api/cpa/jobs?all=true`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success && data.jobs) {
          const all = data.jobs;
          setStats({
            open: all.filter(j => j.status === 'open').length,
            myBids: all.filter(j => j.bids?.some(b => b.cpa_id === cpa.id)).length,
            assigned: all.filter(j => j.assigned_cpa_id === cpa.id && j.status === 'assigned').length,
            completed: all.filter(j => j.assigned_cpa_id === cpa.id && j.status === 'completed').length,
          });
        }
      } catch {}
    }
    fetchStats();
  }, [token, cpa, jobs]);

  // ══════════════════════════════════════════════════════════
  // PLACE BID
  // ══════════════════════════════════════════════════════════
  async function handlePlaceBid() {
    if (!bidPrice || Number(bidPrice) <= 0) {
      setErrorMsg('Please enter a valid bid price.');
      return;
    }
    setSubmitting(true);
    setErrorMsg('');
    try {
      const jobId = selectedJob?._id || selectedJob?.id;
      const res = await fetch(`${API_URL}/api/cpa/jobs/${jobId}/bid`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          cpa_id: cpa.id,
          cpa_name: `${cpa.firstName || ''} ${cpa.lastName || ''}`.trim() || cpa.fullName || 'CPA',
          cpa_credentials: cpa.licenseNumber ? `License #${cpa.licenseNumber}` : 'Licensed CPA',
          bid_price: Number(bidPrice),
          message: bidMessage.trim(),
          estimated_hours: Number(bidHours) || 24,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg('Bid placed successfully!');
        setShowBidModal(false);
        setBidPrice('');
        setBidMessage('');
        setBidHours('24');
        loadJobs();
      } else {
        setErrorMsg(data.message || 'Failed to place bid.');
      }
    } catch (e) {
      setErrorMsg('Error placing bid. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  // ══════════════════════════════════════════════════════════
  // VIEW JOB DETAILS (assigned jobs)
  // ══════════════════════════════════════════════════════════
  async function handleViewDetails(job) {
    const jobId = job._id || job.id;
    setSelectedJob(job);
    setShowDetailModal(true);
    setLoadingDetail(true);
    try {
      const res = await fetch(`${API_URL}/api/cpa/jobs/${jobId}/details`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setJobDetail(data.details || data);
      } else {
        setJobDetail(null);
      }
    } catch {
      setJobDetail(null);
    } finally {
      setLoadingDetail(false);
    }
  }

  // ══════════════════════════════════════════════════════════
  // GENERATE PDF
  // ══════════════════════════════════════════════════════════
  async function handleGeneratePdf(jobId) {
    try {
      const res = await fetch(`${API_URL}/api/cpa/jobs/${jobId}/generate-pdf`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Form1040_${jobId}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        setSuccessMsg('PDF generated & downloaded!');
      } else {
        setErrorMsg('PDF generation failed.');
      }
    } catch {
      setErrorMsg('Error generating PDF.');
    }
  }

  // ── Mark completed ──
  async function handleMarkCompleted(jobId) {
    try {
      const res = await fetch(`${API_URL}/api/cpa/jobs/${jobId}/complete`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg('Job marked as completed!');
        setShowDetailModal(false);
        loadJobs();
      }
    } catch {
      setErrorMsg('Error completing job.');
    }
  }

  // ── Logout ──
  function handleLogout() {
    localStorage.removeItem('cpa_token');
    localStorage.removeItem('cpa_user');
    navigate('/cpa/login');
  }

  // Clear messages
  useEffect(() => {
    if (successMsg) { const t = setTimeout(() => setSuccessMsg(''), 4000); return () => clearTimeout(t); }
  }, [successMsg]);
  useEffect(() => {
    if (errorMsg) { const t = setTimeout(() => setErrorMsg(''), 5000); return () => clearTimeout(t); }
  }, [errorMsg]);

  // ══════════════════════════════════════════════════════════
  // OPEN BID MODAL
  // ══════════════════════════════════════════════════════════
  function openBidModal(job) {
    setSelectedJob(job);
    setBidPrice('');
    setBidMessage('');
    setBidHours('24');
    setErrorMsg('');
    setShowBidModal(true);
  }

  if (!cpa) return null;

  // ════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════
  return (
    <div style={s.page}>
      {/* ── Top Nav ── */}
      <nav style={s.nav}>
        <div style={s.navInner}>
          <div style={s.navLeft}>
            <span style={s.navLogo}>🌤️</span>
            <span style={s.navBrand}>TaxSky</span>
            <span style={s.navBadge}>CPA Portal</span>
          </div>
          <div style={s.navRight}>
            <span style={s.navUser}>👨‍💼 {cpa.firstName || cpa.fullName || cpa.email}</span>
            {cpa.role === 'admin' && (
              <button onClick={() => navigate('/cpa/admin')} style={s.navBtn}>⚙️ Admin</button>
            )}
            <button onClick={handleLogout} style={s.navBtnRed}>Sign Out</button>
          </div>
        </div>
      </nav>

      {/* ── Messages ── */}
      {successMsg && <div style={s.successBanner}>{successMsg}</div>}
      {errorMsg && <div style={s.errorBanner}>{errorMsg}</div>}

      <main style={s.main}>
        {/* ── Stats Cards ── */}
        <div style={s.statsRow}>
          {[
            { label: 'Open Jobs', value: stats.open, color: '#22c55e', icon: '📋' },
            { label: 'My Bids', value: stats.myBids, color: '#f59e0b', icon: '🏷️' },
            { label: 'Assigned', value: stats.assigned, color: '#3b82f6', icon: '📂' },
            { label: 'Completed', value: stats.completed, color: '#8b5cf6', icon: '✅' },
          ].map((st) => (
            <div key={st.label} style={s.statCard}>
              <div style={{ fontSize: '28px' }}>{st.icon}</div>
              <div style={{ fontSize: '32px', fontWeight: '800', color: st.color }}>{st.value}</div>
              <div style={{ fontSize: '13px', color: '#94a3b8' }}>{st.label}</div>
            </div>
          ))}
        </div>

        {/* ── Tabs + Filters ── */}
        <div style={s.toolbar}>
          <div style={s.tabs}>
            {[
              { id: 'open', label: '📋 Open Jobs', count: stats.open },
              { id: 'myBids', label: '🏷️ My Bids', count: stats.myBids },
              { id: 'assigned', label: '📂 Assigned', count: stats.assigned },
              { id: 'completed', label: '✅ Completed', count: stats.completed },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  ...s.tab,
                  ...(activeTab === tab.id ? s.tabActive : {}),
                }}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span style={{
                    ...s.tabBadge,
                    backgroundColor: activeTab === tab.id ? '#fff' : '#334155',
                    color: activeTab === tab.id ? '#1e293b' : '#94a3b8',
                  }}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
          <div style={s.filters}>
            <input
              type="text"
              placeholder="🔍 Filter by state (e.g. CA)"
              value={searchState}
              onChange={(e) => setSearchState(e.target.value)}
              style={s.filterInput}
              maxLength={2}
            />
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={s.filterSelect}>
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
            <button onClick={loadJobs} style={s.refreshBtn}>🔄</button>
          </div>
        </div>

        {/* ── Job Cards ── */}
        <div style={s.jobsGrid}>
          {loading ? (
            <div style={s.emptyState}>
              <div style={s.spinner} />
              <p>Loading jobs...</p>
            </div>
          ) : jobs.length === 0 ? (
            <div style={s.emptyState}>
              <span style={{ fontSize: '48px' }}>
                {activeTab === 'open' ? '📭' : activeTab === 'myBids' ? '🏷️' : activeTab === 'assigned' ? '📂' : '✅'}
              </span>
              <h3 style={{ color: '#cbd5e1', margin: '16px 0 8px' }}>
                {activeTab === 'open' && 'No open jobs right now'}
                {activeTab === 'myBids' && 'You haven\'t placed any bids yet'}
                {activeTab === 'assigned' && 'No jobs assigned to you'}
                {activeTab === 'completed' && 'No completed jobs yet'}
              </h3>
              <p style={{ color: '#64748b', fontSize: '14px' }}>
                {activeTab === 'open' && 'Check back soon — new returns are posted daily.'}
                {activeTab === 'myBids' && 'Browse Open Jobs to find returns to bid on.'}
                {activeTab === 'assigned' && 'Once a client accepts your bid, it appears here.'}
                {activeTab === 'completed' && 'Completed reviews will show here.'}
              </p>
            </div>
          ) : (
            jobs.map((job) => {
              const jobId = job._id || job.id;
              const hasMyBid = job.bids?.some(b => b.cpa_id === cpa.id);
              const myBid = job.bids?.find(b => b.cpa_id === cpa.id);
              const isAssigned = job.assigned_cpa_id === cpa.id;
              const bidCount = job.bids?.length || job.bid_count || 0;

              return (
                <div key={jobId} style={s.jobCard}>
                  {/* Card Header */}
                  <div style={s.jobHeader}>
                    <div style={s.jobHeaderLeft}>
                      <span style={s.jobState}>{job.state || '??'}</span>
                      <div>
                        <div style={s.jobFiling}>
                          {FILING_LABELS[job.filing_status] || job.filing_status || 'Unknown'}
                        </div>
                        <div style={s.jobTime}>{timeAgo(job.createdAt || job.created_at)}</div>
                      </div>
                    </div>
                    <div style={{
                      ...s.statusBadge,
                      backgroundColor:
                        job.status === 'open' ? 'rgba(34,197,94,0.15)' :
                        job.status === 'assigned' ? 'rgba(59,130,246,0.15)' :
                        job.status === 'completed' ? 'rgba(139,92,246,0.15)' : 'rgba(148,163,184,0.15)',
                      color:
                        job.status === 'open' ? '#22c55e' :
                        job.status === 'assigned' ? '#3b82f6' :
                        job.status === 'completed' ? '#8b5cf6' : '#94a3b8',
                    }}>
                      {job.status === 'open' ? '🟢' : job.status === 'assigned' ? '🔵' : '✅'} {job.status}
                    </div>
                  </div>

                  {/* Card Body */}
                  <div style={s.jobBody}>
                    <div style={s.jobInfoGrid}>
                      <div style={s.jobInfoItem}>
                        <span style={s.jobInfoLabel}>💰 Income</span>
                        <span style={s.jobInfoValue}>{incomeDisplay(job.income_range)}</span>
                      </div>
                      <div style={s.jobInfoItem}>
                        <span style={s.jobInfoLabel}>👥 Dependents</span>
                        <span style={s.jobInfoValue}>{job.dependents_count ?? 0}</span>
                      </div>
                      <div style={s.jobInfoItem}>
                        <span style={s.jobInfoLabel}>📄 Forms</span>
                        <span style={s.jobInfoValue}>{job.forms_count || 'Fed + State'}</span>
                      </div>
                      <div style={s.jobInfoItem}>
                        <span style={s.jobInfoLabel}>🏷️ Bids</span>
                        <span style={s.jobInfoValue}>{bidCount}</span>
                      </div>
                    </div>

                    {/* My bid status */}
                    {hasMyBid && myBid && (
                      <div style={s.myBidBar}>
                        <span>Your bid: <strong>${myBid.bid_price}</strong></span>
                        <span style={{
                          ...s.bidStatus,
                          color: myBid.status === 'accepted' ? '#22c55e' : myBid.status === 'rejected' ? '#ef4444' : '#f59e0b',
                        }}>
                          {myBid.status === 'accepted' ? '✅ Accepted' : myBid.status === 'rejected' ? '❌ Rejected' : '⏳ Pending'}
                        </span>
                      </div>
                    )}

                    {/* CPA Fee (what user is willing to pay) */}
                    {job.cpa_fee && (
                      <div style={s.feeBar}>
                        Client budget: <strong>${job.cpa_fee}</strong>
                      </div>
                    )}
                  </div>

                  {/* Card Actions */}
                  <div style={s.jobActions}>
                    {activeTab === 'open' && !hasMyBid && job.status === 'open' && (
                      <button onClick={() => openBidModal(job)} style={s.bidBtn}>
                        🏷️ Place Bid
                      </button>
                    )}
                    {activeTab === 'open' && hasMyBid && (
                      <button disabled style={s.bidBtnDisabled}>
                        ✓ Bid Placed (${myBid?.bid_price})
                      </button>
                    )}
                    {(activeTab === 'assigned' || isAssigned) && (
                      <>
                        <button onClick={() => handleViewDetails(job)} style={s.detailBtn}>
                          📋 View Details
                        </button>
                        <button onClick={() => handleGeneratePdf(jobId)} style={s.pdfBtn}>
                          📄 Generate PDF
                        </button>
                      </>
                    )}
                    {activeTab === 'myBids' && hasMyBid && (
                      <div style={{ fontSize: '13px', color: '#94a3b8' }}>
                        Waiting for client to accept...
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* ══════════════════════════════════════════════════════ */}
      {/* BID MODAL                                             */}
      {/* ══════════════════════════════════════════════════════ */}
      {showBidModal && selectedJob && (
        <div style={s.overlay} onClick={() => setShowBidModal(false)}>
          <div style={s.modal} onClick={(e) => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <h2 style={s.modalTitle}>🏷️ Place Your Bid</h2>
              <button onClick={() => setShowBidModal(false)} style={s.closeBtn}>✕</button>
            </div>

            {/* Job summary */}
            <div style={s.modalJobSummary}>
              <span style={s.jobState}>{selectedJob.state}</span>
              <div>
                <div style={{ fontWeight: '600', color: '#e2e8f0' }}>
                  {FILING_LABELS[selectedJob.filing_status] || selectedJob.filing_status}
                </div>
                <div style={{ fontSize: '13px', color: '#94a3b8' }}>
                  {incomeDisplay(selectedJob.income_range)} • {selectedJob.dependents_count ?? 0} dependents
                </div>
              </div>
            </div>

            {/* Bid form */}
            <div style={s.modalBody}>
              {/* Price */}
              <div style={s.formGroup}>
                <label style={s.formLabel}>Your Price ($)</label>
                <div style={s.priceInputWrap}>
                  <span style={s.pricePrefix}>$</span>
                  <input
                    type="number"
                    min="1"
                    placeholder="35"
                    value={bidPrice}
                    onChange={(e) => setBidPrice(e.target.value)}
                    style={s.priceInput}
                    autoFocus
                  />
                </div>
                {selectedJob.cpa_fee && (
                  <p style={s.formHint}>Client budget: ${selectedJob.cpa_fee}</p>
                )}
              </div>

              {/* Turnaround */}
              <div style={s.formGroup}>
                <label style={s.formLabel}>Turnaround Time</label>
                <div style={s.hoursRow}>
                  {['4', '8', '12', '24', '48'].map((h) => (
                    <button
                      key={h}
                      onClick={() => setBidHours(h)}
                      style={{
                        ...s.hourBtn,
                        ...(bidHours === h ? s.hourBtnActive : {}),
                      }}
                    >
                      {h}h
                    </button>
                  ))}
                </div>
              </div>

              {/* Message */}
              <div style={s.formGroup}>
                <label style={s.formLabel}>Message to Client (optional)</label>
                <textarea
                  placeholder="I have 8 years of experience with this filing type..."
                  value={bidMessage}
                  onChange={(e) => setBidMessage(e.target.value)}
                  style={s.textarea}
                  rows={3}
                />
              </div>

              {errorMsg && <div style={s.modalError}>{errorMsg}</div>}
            </div>

            <div style={s.modalFooter}>
              <button onClick={() => setShowBidModal(false)} style={s.cancelBtn}>Cancel</button>
              <button
                onClick={handlePlaceBid}
                disabled={submitting || !bidPrice || Number(bidPrice) <= 0}
                style={{
                  ...s.submitBidBtn,
                  opacity: submitting || !bidPrice ? 0.5 : 1,
                }}
              >
                {submitting ? 'Placing Bid...' : `Place Bid — $${bidPrice || '0'}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════ */}
      {/* DETAIL MODAL (assigned jobs)                          */}
      {/* ══════════════════════════════════════════════════════ */}
      {showDetailModal && selectedJob && (
        <div style={s.overlay} onClick={() => setShowDetailModal(false)}>
          <div style={{ ...s.modal, maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <h2 style={s.modalTitle}>📋 Job Details</h2>
              <button onClick={() => setShowDetailModal(false)} style={s.closeBtn}>✕</button>
            </div>

            <div style={s.modalBody}>
              {loadingDetail ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <div style={s.spinner} />
                  <p style={{ color: '#94a3b8', marginTop: '12px' }}>Loading client details...</p>
                </div>
              ) : jobDetail ? (
                <>
                  {/* Client Info */}
                  <div style={s.detailSection}>
                    <h3 style={s.detailSectionTitle}>👤 Client Information</h3>
                    <div style={s.detailGrid}>
                      <div style={s.detailItem}>
                        <span style={s.detailLabel}>Name</span>
                        <span style={s.detailValue}>{jobDetail.name || jobDetail.full_name || 'N/A'}</span>
                      </div>
                      <div style={s.detailItem}>
                        <span style={s.detailLabel}>Filing Status</span>
                        <span style={s.detailValue}>
                          {FILING_LABELS[jobDetail.filing_status] || jobDetail.filing_status}
                        </span>
                      </div>
                      <div style={s.detailItem}>
                        <span style={s.detailLabel}>State</span>
                        <span style={s.detailValue}>{jobDetail.state || selectedJob.state}</span>
                      </div>
                      <div style={s.detailItem}>
                        <span style={s.detailLabel}>Dependents</span>
                        <span style={s.detailValue}>{jobDetail.dependents_count ?? 0}</span>
                      </div>
                    </div>
                  </div>

                  {/* Income Info */}
                  {jobDetail.income && (
                    <div style={s.detailSection}>
                      <h3 style={s.detailSectionTitle}>💰 Income Summary</h3>
                      <div style={s.detailGrid}>
                        <div style={s.detailItem}>
                          <span style={s.detailLabel}>Total Income</span>
                          <span style={s.detailValue}>
                            ${Number(jobDetail.income.total || jobDetail.income.wages || 0).toLocaleString()}
                          </span>
                        </div>
                        {jobDetail.income.wages && (
                          <div style={s.detailItem}>
                            <span style={s.detailLabel}>W-2 Wages</span>
                            <span style={s.detailValue}>${Number(jobDetail.income.wages).toLocaleString()}</span>
                          </div>
                        )}
                        {jobDetail.income.interest && (
                          <div style={s.detailItem}>
                            <span style={s.detailLabel}>Interest</span>
                            <span style={s.detailValue}>${Number(jobDetail.income.interest).toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Tax Summary */}
                  {jobDetail.tax_summary && (
                    <div style={s.detailSection}>
                      <h3 style={s.detailSectionTitle}>📊 Tax Summary</h3>
                      <div style={s.detailGrid}>
                        <div style={s.detailItem}>
                          <span style={s.detailLabel}>Federal Tax</span>
                          <span style={s.detailValue}>${Number(jobDetail.tax_summary.federal || 0).toLocaleString()}</span>
                        </div>
                        <div style={s.detailItem}>
                          <span style={s.detailLabel}>Refund / Owed</span>
                          <span style={{
                            ...s.detailValue,
                            color: (jobDetail.tax_summary.refund || 0) >= 0 ? '#22c55e' : '#ef4444',
                          }}>
                            {(jobDetail.tax_summary.refund || 0) >= 0 ? '+' : '-'}
                            ${Math.abs(jobDetail.tax_summary.refund || 0).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Note: No SSN shown */}
                  <div style={s.ssnNote}>
                    🔒 SSN is never displayed. It is automatically injected into the PDF by the server.
                  </div>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                  <p>Unable to load details. The client may not have completed their return yet.</p>
                </div>
              )}
            </div>

            <div style={s.modalFooter}>
              <button onClick={() => setShowDetailModal(false)} style={s.cancelBtn}>Close</button>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => handleGeneratePdf(selectedJob._id || selectedJob.id)}
                  style={s.pdfBtn}
                >
                  📄 Generate PDF
                </button>
                {selectedJob.status !== 'completed' && (
                  <button
                    onClick={() => handleMarkCompleted(selectedJob._id || selectedJob.id)}
                    style={s.completeBtn}
                  >
                    ✅ Mark Completed
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}


// ════════════════════════════════════════════════════════════
// STYLES
// ════════════════════════════════════════════════════════════
const s = {
  page: {
    minHeight: '100vh',
    backgroundColor: '#0f172a',
    color: '#e2e8f0',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },

  // ── Nav ──
  nav: {
    backgroundColor: '#1e293b',
    borderBottom: '1px solid #334155',
    padding: '0 24px',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  navInner: {
    maxWidth: '1280px',
    margin: '0 auto',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: '64px',
  },
  navLeft: { display: 'flex', alignItems: 'center', gap: '12px' },
  navLogo: { fontSize: '28px' },
  navBrand: { fontSize: '20px', fontWeight: '800', color: '#fff' },
  navBadge: {
    backgroundColor: 'rgba(59,130,246,0.15)',
    color: '#60a5fa',
    padding: '4px 12px',
    borderRadius: '16px',
    fontSize: '12px',
    fontWeight: '600',
  },
  navRight: { display: 'flex', alignItems: 'center', gap: '12px' },
  navUser: { fontSize: '14px', color: '#94a3b8' },
  navBtn: {
    padding: '8px 16px',
    borderRadius: '8px',
    border: '1px solid #334155',
    backgroundColor: 'transparent',
    color: '#cbd5e1',
    cursor: 'pointer',
    fontSize: '13px',
  },
  navBtnRed: {
    padding: '8px 16px',
    borderRadius: '8px',
    border: '1px solid #7f1d1d',
    backgroundColor: 'rgba(239,68,68,0.1)',
    color: '#f87171',
    cursor: 'pointer',
    fontSize: '13px',
  },

  // ── Messages ──
  successBanner: {
    backgroundColor: '#065f46',
    color: '#6ee7b7',
    padding: '12px 24px',
    textAlign: 'center',
    fontWeight: '600',
    fontSize: '14px',
    animation: 'slideDown 0.3s ease-out',
  },
  errorBanner: {
    backgroundColor: '#7f1d1d',
    color: '#fca5a5',
    padding: '12px 24px',
    textAlign: 'center',
    fontWeight: '600',
    fontSize: '14px',
    animation: 'slideDown 0.3s ease-out',
  },

  // ── Main ──
  main: {
    maxWidth: '1280px',
    margin: '0 auto',
    padding: '24px',
  },

  // ── Stats ──
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '16px',
    marginBottom: '24px',
  },
  statCard: {
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '16px',
    padding: '20px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
  },

  // ── Toolbar ──
  toolbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    flexWrap: 'wrap',
    gap: '12px',
  },
  tabs: {
    display: 'flex',
    gap: '4px',
    backgroundColor: '#1e293b',
    padding: '4px',
    borderRadius: '12px',
    border: '1px solid #334155',
  },
  tab: {
    padding: '10px 16px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: 'transparent',
    color: '#94a3b8',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'all 0.15s',
  },
  tabActive: {
    backgroundColor: '#3b82f6',
    color: '#fff',
  },
  tabBadge: {
    padding: '2px 8px',
    borderRadius: '10px',
    fontSize: '11px',
    fontWeight: '700',
  },
  filters: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },
  filterInput: {
    padding: '10px 14px',
    borderRadius: '8px',
    border: '1px solid #334155',
    backgroundColor: '#1e293b',
    color: '#e2e8f0',
    fontSize: '13px',
    width: '160px',
    outline: 'none',
  },
  filterSelect: {
    padding: '10px 14px',
    borderRadius: '8px',
    border: '1px solid #334155',
    backgroundColor: '#1e293b',
    color: '#e2e8f0',
    fontSize: '13px',
    outline: 'none',
    cursor: 'pointer',
  },
  refreshBtn: {
    padding: '10px',
    borderRadius: '8px',
    border: '1px solid #334155',
    backgroundColor: '#1e293b',
    color: '#94a3b8',
    cursor: 'pointer',
    fontSize: '16px',
  },

  // ── Jobs Grid ──
  jobsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
    gap: '16px',
  },
  emptyState: {
    gridColumn: '1 / -1',
    textAlign: 'center',
    padding: '60px 20px',
    color: '#94a3b8',
  },
  spinner: {
    width: '32px',
    height: '32px',
    border: '3px solid #334155',
    borderTopColor: '#3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto',
  },

  // ── Job Card ──
  jobCard: {
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '16px',
    overflow: 'hidden',
    animation: 'fadeIn 0.3s ease-out',
    transition: 'border-color 0.2s',
  },
  jobHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: '1px solid #334155',
  },
  jobHeaderLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  jobState: {
    backgroundColor: 'rgba(59,130,246,0.15)',
    color: '#60a5fa',
    padding: '8px 12px',
    borderRadius: '10px',
    fontWeight: '800',
    fontSize: '14px',
    letterSpacing: '0.5px',
    fontFamily: 'monospace',
  },
  jobFiling: {
    fontWeight: '600',
    color: '#e2e8f0',
    fontSize: '14px',
  },
  jobTime: {
    fontSize: '12px',
    color: '#64748b',
    marginTop: '2px',
  },
  statusBadge: {
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '600',
    textTransform: 'capitalize',
  },

  // ── Job Body ──
  jobBody: {
    padding: '16px 20px',
  },
  jobInfoGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
  },
  jobInfoItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  jobInfoLabel: {
    fontSize: '12px',
    color: '#64748b',
  },
  jobInfoValue: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#cbd5e1',
  },
  myBidBar: {
    marginTop: '12px',
    padding: '10px 14px',
    backgroundColor: 'rgba(245,158,11,0.08)',
    border: '1px solid rgba(245,158,11,0.2)',
    borderRadius: '10px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '13px',
    color: '#fbbf24',
  },
  bidStatus: {
    fontWeight: '600',
    fontSize: '12px',
  },
  feeBar: {
    marginTop: '8px',
    padding: '8px 12px',
    backgroundColor: 'rgba(34,197,94,0.08)',
    borderRadius: '8px',
    fontSize: '13px',
    color: '#86efac',
  },

  // ── Job Actions ──
  jobActions: {
    padding: '12px 20px 16px',
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  bidBtn: {
    flex: 1,
    padding: '10px 16px',
    borderRadius: '10px',
    border: 'none',
    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
    color: '#fff',
    fontWeight: '700',
    fontSize: '14px',
    cursor: 'pointer',
  },
  bidBtnDisabled: {
    flex: 1,
    padding: '10px 16px',
    borderRadius: '10px',
    border: '1px solid #334155',
    backgroundColor: '#1e293b',
    color: '#64748b',
    fontWeight: '600',
    fontSize: '13px',
    cursor: 'default',
  },
  detailBtn: {
    padding: '10px 16px',
    borderRadius: '10px',
    border: '1px solid #334155',
    backgroundColor: 'rgba(59,130,246,0.1)',
    color: '#60a5fa',
    fontWeight: '600',
    fontSize: '13px',
    cursor: 'pointer',
  },
  pdfBtn: {
    padding: '10px 16px',
    borderRadius: '10px',
    border: 'none',
    background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
    color: '#fff',
    fontWeight: '600',
    fontSize: '13px',
    cursor: 'pointer',
  },
  completeBtn: {
    padding: '10px 16px',
    borderRadius: '10px',
    border: 'none',
    background: 'linear-gradient(135deg, #22c55e, #16a34a)',
    color: '#fff',
    fontWeight: '700',
    fontSize: '13px',
    cursor: 'pointer',
  },

  // ── Modal ──
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 200,
    padding: '20px',
  },
  modal: {
    backgroundColor: '#1e293b',
    borderRadius: '20px',
    border: '1px solid #334155',
    width: '100%',
    maxWidth: '520px',
    maxHeight: '90vh',
    overflowY: 'auto',
    animation: 'fadeIn 0.2s ease-out',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    borderBottom: '1px solid #334155',
  },
  modalTitle: {
    margin: 0,
    fontSize: '18px',
    fontWeight: '700',
    color: '#fff',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#94a3b8',
    fontSize: '20px',
    cursor: 'pointer',
    padding: '4px',
  },
  modalJobSummary: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px 24px',
    backgroundColor: 'rgba(59,130,246,0.05)',
    borderBottom: '1px solid #334155',
  },
  modalBody: {
    padding: '24px',
  },
  modalFooter: {
    padding: '16px 24px',
    borderTop: '1px solid #334155',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalError: {
    backgroundColor: 'rgba(239,68,68,0.1)',
    border: '1px solid rgba(239,68,68,0.3)',
    color: '#fca5a5',
    padding: '10px 14px',
    borderRadius: '8px',
    fontSize: '13px',
    marginTop: '12px',
  },

  // ── Form ──
  formGroup: {
    marginBottom: '20px',
  },
  formLabel: {
    display: 'block',
    fontSize: '13px',
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: '8px',
  },
  formHint: {
    fontSize: '12px',
    color: '#64748b',
    marginTop: '6px',
  },
  priceInputWrap: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    border: '2px solid #334155',
    borderRadius: '12px',
    overflow: 'hidden',
  },
  pricePrefix: {
    padding: '0 12px',
    fontSize: '20px',
    fontWeight: '700',
    color: '#64748b',
  },
  priceInput: {
    flex: 1,
    padding: '14px 14px 14px 0',
    border: 'none',
    outline: 'none',
    backgroundColor: 'transparent',
    color: '#fff',
    fontSize: '20px',
    fontWeight: '700',
  },
  hoursRow: {
    display: 'flex',
    gap: '8px',
  },
  hourBtn: {
    flex: 1,
    padding: '10px',
    borderRadius: '8px',
    border: '1px solid #334155',
    backgroundColor: '#0f172a',
    color: '#94a3b8',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '13px',
    textAlign: 'center',
  },
  hourBtnActive: {
    backgroundColor: 'rgba(59,130,246,0.15)',
    borderColor: '#3b82f6',
    color: '#60a5fa',
  },
  textarea: {
    width: '100%',
    padding: '12px',
    borderRadius: '10px',
    border: '1px solid #334155',
    backgroundColor: '#0f172a',
    color: '#e2e8f0',
    fontSize: '14px',
    resize: 'vertical',
    outline: 'none',
    boxSizing: 'border-box',
  },
  cancelBtn: {
    padding: '10px 20px',
    borderRadius: '10px',
    border: '1px solid #334155',
    backgroundColor: 'transparent',
    color: '#94a3b8',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '14px',
  },
  submitBidBtn: {
    padding: '12px 24px',
    borderRadius: '10px',
    border: 'none',
    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
    color: '#fff',
    fontWeight: '700',
    fontSize: '14px',
    cursor: 'pointer',
  },

  // ── Detail Modal ──
  detailSection: {
    marginBottom: '24px',
  },
  detailSectionTitle: {
    fontSize: '15px',
    fontWeight: '700',
    color: '#cbd5e1',
    marginBottom: '12px',
  },
  detailGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
  },
  detailItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    padding: '10px 14px',
    backgroundColor: '#0f172a',
    borderRadius: '10px',
  },
  detailLabel: {
    fontSize: '11px',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  detailValue: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#e2e8f0',
  },
  ssnNote: {
    marginTop: '16px',
    padding: '12px 16px',
    backgroundColor: 'rgba(34,197,94,0.08)',
    border: '1px solid rgba(34,197,94,0.2)',
    borderRadius: '10px',
    fontSize: '13px',
    color: '#86efac',
    textAlign: 'center',
  },
};