// ============================================================
// SUPER ADMIN PANEL — Manage Users & CPA Accounts
// ============================================================
// Location: frontend/src/pages/admin/SuperAdmin.jsx
// Route: /admin
//
// Self-contained admin panel. No CPA login needed.
// Uses admin secret key for authentication.
// Tabs: Dashboard | Users | CPAs | Payments
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// ══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════
export default function SuperAdmin() {
  // ── Auth ──
  const [adminKey, setAdminKey] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState('');
  const [keyInput, setKeyInput] = useState('');

  // ── Data ──
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [cpas, setCPAs] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);

  // ── Filters ──
  const [userSearch, setUserSearch] = useState('');
  const [cpaSearch, setCpaSearch] = useState('');
  const [cpaStatusFilter, setCpaStatusFilter] = useState('all');

  // ── Messages ──
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // ── Confirm Modal ──
  const [confirmAction, setConfirmAction] = useState(null);

  // Restore saved key
  useEffect(() => {
    const saved = localStorage.getItem('taxsky_admin_key');
    if (saved) {
      setAdminKey(saved);
      setIsAuthenticated(true);
    }
  }, []);

  // Clear messages
  useEffect(() => {
    if (successMsg) { const t = setTimeout(() => setSuccessMsg(''), 4000); return () => clearTimeout(t); }
  }, [successMsg]);
  useEffect(() => {
    if (errorMsg) { const t = setTimeout(() => setErrorMsg(''), 5000); return () => clearTimeout(t); }
  }, [errorMsg]);

  // ══════════════════════════════════════════════════════════
  // API HELPER
  // ══════════════════════════════════════════════════════════
  const api = useCallback(async (path, options = {}) => {
    const res = await fetch(`${API_URL}/api/admin${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'x-admin-key': adminKey,
        ...(options.headers || {}),
      },
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || data.message || `Request failed (${res.status})`);
    }
    return data;
  }, [adminKey]);

  // ══════════════════════════════════════════════════════════
  // LOGIN
  // ══════════════════════════════════════════════════════════
  async function handleLogin(e) {
    e.preventDefault();
    setAuthError('');
    try {
      // Test the key by fetching stats
      const res = await fetch(`${API_URL}/api/admin/stats`, {
        headers: { 'x-admin-key': keyInput },
      });
      const data = await res.json();
      if (data.success) {
        setAdminKey(keyInput);
        setIsAuthenticated(true);
        localStorage.setItem('taxsky_admin_key', keyInput);
        setStats(data.stats);
      } else {
        setAuthError(data.error || 'Invalid admin key');
      }
    } catch (err) {
      setAuthError('Connection failed. Is the backend running?');
    }
  }

  function handleLogout() {
    setAdminKey('');
    setIsAuthenticated(false);
    localStorage.removeItem('taxsky_admin_key');
    setKeyInput('');
  }

  // ══════════════════════════════════════════════════════════
  // LOAD DATA
  // ══════════════════════════════════════════════════════════
  const loadStats = useCallback(async () => {
    try {
      const data = await api('/stats');
      setStats(data.stats);
    } catch {}
  }, [api]);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = userSearch ? `?search=${encodeURIComponent(userSearch)}` : '';
      const data = await api(`/users${params}`);
      setUsers(data.users || []);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  }, [api, userSearch]);

  const loadCPAs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (cpaStatusFilter !== 'all') params.append('status', cpaStatusFilter);
      if (cpaSearch) params.append('search', cpaSearch);
      const data = await api(`/cpas?${params}`);
      setCPAs(data.cpas || []);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  }, [api, cpaStatusFilter, cpaSearch]);

  const loadPayments = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api('/payments');
      setPayments(data.payments || []);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  }, [api]);

  // Load on tab change
  useEffect(() => {
    if (!isAuthenticated) return;
    if (activeTab === 'dashboard') loadStats();
    if (activeTab === 'users') loadUsers();
    if (activeTab === 'cpas') loadCPAs();
    if (activeTab === 'payments') loadPayments();
  }, [isAuthenticated, activeTab, loadStats, loadUsers, loadCPAs, loadPayments]);

  // ══════════════════════════════════════════════════════════
  // CPA ACTIONS
  // ══════════════════════════════════════════════════════════
  async function handleActivateCPA(cpaId) {
    try {
      const data = await api(`/cpas/${cpaId}/activate`, { method: 'PUT' });
      setSuccessMsg(data.message || 'CPA activated!');
      loadCPAs();
      loadStats();
    } catch (err) {
      setErrorMsg(err.message);
    }
  }

  async function handleUpdateCPAStatus(cpaId, status) {
    try {
      const data = await api(`/cpas/${cpaId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      });
      setSuccessMsg(data.message || `Status updated to ${status}`);
      loadCPAs();
      loadStats();
    } catch (err) {
      setErrorMsg(err.message);
    }
  }

  async function handleUpdateCPARole(cpaId, role) {
    try {
      const data = await api(`/cpas/${cpaId}/role`, {
        method: 'PUT',
        body: JSON.stringify({ role }),
      });
      setSuccessMsg(data.message || `Role updated to ${role}`);
      loadCPAs();
    } catch (err) {
      setErrorMsg(err.message);
    }
  }

  async function handleDeleteCPA(cpaId) {
    try {
      const data = await api(`/cpas/${cpaId}`, { method: 'DELETE' });
      setSuccessMsg(data.message || 'CPA deleted');
      setConfirmAction(null);
      loadCPAs();
      loadStats();
    } catch (err) {
      setErrorMsg(err.message);
    }
  }

  // ══════════════════════════════════════════════════════════
  // HELPERS
  // ══════════════════════════════════════════════════════════
  function timeAgo(d) {
    if (!d) return '—';
    const diff = Date.now() - new Date(d).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(d).toLocaleDateString();
  }

  function statusColor(status) {
    switch (status) {
      case 'active': return { bg: 'rgba(34,197,94,0.15)', color: '#22c55e' };
      case 'pending': return { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b' };
      case 'suspended': return { bg: 'rgba(239,68,68,0.15)', color: '#ef4444' };
      case 'rejected': return { bg: 'rgba(107,114,128,0.15)', color: '#6b7280' };
      default: return { bg: 'rgba(148,163,184,0.15)', color: '#94a3b8' };
    }
  }

  // ══════════════════════════════════════════════════════════
  // RENDER: LOGIN SCREEN
  // ══════════════════════════════════════════════════════════
  if (!isAuthenticated) {
    return (
      <div style={s.loginPage}>
        <div style={s.loginCard}>
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🔐</div>
            <h1 style={{ margin: '0 0 6px', fontSize: '24px', fontWeight: '800', color: '#fff' }}>TaxSky Admin</h1>
            <p style={{ margin: 0, color: '#94a3b8', fontSize: '14px' }}>Enter your admin key to continue</p>
          </div>

          <form onSubmit={handleLogin}>
            <label style={s.label}>Admin Secret Key</label>
            <input
              type="password"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder="Enter admin key..."
              style={s.input}
              autoFocus
            />
            {authError && <div style={s.authError}>{authError}</div>}
            <button
              type="submit"
              disabled={!keyInput}
              style={{ ...s.loginBtn, opacity: keyInput ? 1 : 0.5 }}
            >
              Sign In
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <a href="/" style={{ color: '#64748b', fontSize: '13px', textDecoration: 'none' }}>
              ← Back to TaxSky
            </a>
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════
  // RENDER: ADMIN DASHBOARD
  // ══════════════════════════════════════════════════════════
  return (
    <div style={s.page}>
      {/* ── NAV ── */}
      <nav style={s.nav}>
        <div style={s.navInner}>
          <div style={s.navLeft}>
            <span style={{ fontSize: '24px' }}>🌤️</span>
            <span style={{ fontSize: '18px', fontWeight: '800', color: '#fff' }}>TaxSky</span>
            <span style={s.navBadge}>Super Admin</span>
          </div>
          <button onClick={handleLogout} style={s.logoutBtn}>🔒 Sign Out</button>
        </div>
      </nav>

      {/* ── Messages ── */}
      {successMsg && <div style={s.successBar}>{successMsg}</div>}
      {errorMsg && <div style={s.errorBar}>{errorMsg}</div>}

      <main style={s.main}>
        {/* ── TABS ── */}
        <div style={s.tabRow}>
          {[
            { id: 'dashboard', label: '📊 Dashboard' },
            { id: 'users', label: '👥 Users' },
            { id: 'cpas', label: '👨‍💼 CPAs' },
            { id: 'payments', label: '💳 Payments' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                ...s.tabBtn,
                ...(activeTab === tab.id ? s.tabActive : {}),
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════════════════ */}
        {/* DASHBOARD TAB                                  */}
        {/* ══════════════════════════════════════════════ */}
        {activeTab === 'dashboard' && (
          <div>
            <h2 style={s.sectionTitle}>📊 Overview</h2>
            {stats ? (
              <div style={s.statsGrid}>
                {[
                  { label: 'Total Users', value: stats.totalUsers, icon: '👥', color: '#3b82f6' },
                  { label: 'Total CPAs', value: stats.totalCPAs, icon: '👨‍💼', color: '#8b5cf6' },
                  { label: 'Pending CPAs', value: stats.cpasByStatus?.pending || 0, icon: '⏳', color: '#f59e0b' },
                  { label: 'Active CPAs', value: stats.cpasByStatus?.active || 0, icon: '✅', color: '#22c55e' },
                  { label: 'Total Payments', value: stats.completedPayments, icon: '💳', color: '#06b6d4' },
                  { label: 'Revenue', value: `$${(stats.totalRevenue / 100).toFixed(2)}`, icon: '💰', color: '#10b981' },
                ].map(st => (
                  <div key={st.label} style={s.statCard}>
                    <div style={{ fontSize: '28px' }}>{st.icon}</div>
                    <div style={{ fontSize: '28px', fontWeight: '800', color: st.color }}>
                      {typeof st.value === 'number' ? st.value.toLocaleString() : st.value}
                    </div>
                    <div style={{ fontSize: '13px', color: '#94a3b8' }}>{st.label}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={s.loading}><div style={s.spinner} /><p>Loading stats...</p></div>
            )}

            {/* Quick Actions */}
            <h2 style={{ ...s.sectionTitle, marginTop: '32px' }}>⚡ Quick Actions</h2>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button onClick={() => { setActiveTab('cpas'); setCpaStatusFilter('pending'); }} style={s.quickBtn}>
                ⏳ View Pending CPAs ({stats?.cpasByStatus?.pending || 0})
              </button>
              <button onClick={() => setActiveTab('users')} style={s.quickBtn}>
                👥 Manage Users
              </button>
              <button onClick={() => setActiveTab('payments')} style={s.quickBtn}>
                💳 View Payments
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════ */}
        {/* USERS TAB                                      */}
        {/* ══════════════════════════════════════════════ */}
        {activeTab === 'users' && (
          <div>
            <div style={s.toolbar}>
              <h2 style={s.sectionTitle}>👥 Users ({users.length})</h2>
              <div style={s.filterRow}>
                <input
                  type="text"
                  placeholder="🔍 Search by name or email..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadUsers()}
                  style={s.searchInput}
                />
                <button onClick={loadUsers} style={s.refreshBtn}>🔄</button>
              </div>
            </div>

            {loading ? (
              <div style={s.loading}><div style={s.spinner} /><p>Loading users...</p></div>
            ) : users.length === 0 ? (
              <div style={s.empty}>No users found.</div>
            ) : (
              <div style={s.tableWrap}>
                <table style={s.table}>
                  <thead>
                    <tr>
                      <th style={s.th}>User</th>
                      <th style={s.th}>Email</th>
                      <th style={s.th}>Provider</th>
                      <th style={s.th}>Joined</th>
                      <th style={s.th}>Last Active</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u._id} style={s.tr}>
                        <td style={s.td}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {u.picture ? (
                              <img src={u.picture} alt="" style={s.avatar} />
                            ) : (
                              <div style={s.avatarPlaceholder}>👤</div>
                            )}
                            <span style={{ fontWeight: '600', color: '#e2e8f0' }}>{u.name || 'N/A'}</span>
                          </div>
                        </td>
                        <td style={{ ...s.td, color: '#94a3b8' }}>{u.email}</td>
                        <td style={s.td}>
                          <span style={s.providerBadge}>{u.provider === 'google' ? '🔵 Google' : u.provider}</span>
                        </td>
                        <td style={{ ...s.td, color: '#64748b', fontSize: '13px' }}>{timeAgo(u.createdAt)}</td>
                        <td style={{ ...s.td, color: '#64748b', fontSize: '13px' }}>{timeAgo(u.lastLogin)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════ */}
        {/* CPAs TAB                                       */}
        {/* ══════════════════════════════════════════════ */}
        {activeTab === 'cpas' && (
          <div>
            <div style={s.toolbar}>
              <h2 style={s.sectionTitle}>👨‍💼 CPA Accounts ({cpas.length})</h2>
              <div style={s.filterRow}>
                <select
                  value={cpaStatusFilter}
                  onChange={(e) => setCpaStatusFilter(e.target.value)}
                  style={s.select}
                >
                  <option value="all">All Status</option>
                  <option value="pending">⏳ Pending</option>
                  <option value="active">✅ Active</option>
                  <option value="suspended">🔴 Suspended</option>
                  <option value="rejected">❌ Rejected</option>
                </select>
                <input
                  type="text"
                  placeholder="🔍 Search CPA..."
                  value={cpaSearch}
                  onChange={(e) => setCpaSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadCPAs()}
                  style={s.searchInput}
                />
                <button onClick={loadCPAs} style={s.refreshBtn}>🔄</button>
              </div>
            </div>

            {loading ? (
              <div style={s.loading}><div style={s.spinner} /><p>Loading CPAs...</p></div>
            ) : cpas.length === 0 ? (
              <div style={s.empty}>No CPA accounts found.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {cpas.map(c => {
                  const sc = statusColor(c.status);
                  return (
                    <div key={c._id} style={s.cpaCard}>
                      <div style={s.cpaCardTop}>
                        {/* Left: Info */}
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                            <span style={{ fontSize: '20px' }}>👨‍💼</span>
                            <span style={{ fontWeight: '700', fontSize: '16px', color: '#fff' }}>
                              {c.firstName} {c.lastName}
                            </span>
                            <span style={{ ...s.statusBadge, backgroundColor: sc.bg, color: sc.color }}>
                              {c.status}
                            </span>
                            <span style={s.roleBadge}>{c.role}</span>
                          </div>
                          <div style={s.cpaInfoRow}>
                            <span>📧 {c.email}</span>
                            {c.firmName && <span>🏢 {c.firmName}</span>}
                            {c.licenseNumber && <span>📋 License: {c.licenseNumber}</span>}
                            {c.licenseState && <span>📍 {c.licenseState}</span>}
                            {c.phone && <span>📞 {c.phone}</span>}
                          </div>
                          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                            Registered {timeAgo(c.createdAt)}
                            {c.assignedZipcodes?.length > 0 &&
                              ` • ${c.assignedZipcodes.length} ZIP code(s)`}
                          </div>
                        </div>

                        {/* Right: Actions */}
                        <div style={s.cpaActions}>
                          {c.status === 'pending' && (
                            <button
                              onClick={() => handleActivateCPA(c._id)}
                              style={s.activateBtn}
                            >
                              ✅ Activate
                            </button>
                          )}
                          {c.status === 'active' && (
                            <button
                              onClick={() => handleUpdateCPAStatus(c._id, 'suspended')}
                              style={s.suspendBtn}
                            >
                              ⏸ Suspend
                            </button>
                          )}
                          {(c.status === 'suspended' || c.status === 'rejected') && (
                            <button
                              onClick={() => handleActivateCPA(c._id)}
                              style={s.reactivateBtn}
                            >
                              ▶ Reactivate
                            </button>
                          )}
                          {c.status === 'pending' && (
                            <button
                              onClick={() => handleUpdateCPAStatus(c._id, 'rejected')}
                              style={s.rejectBtn}
                            >
                              ❌ Reject
                            </button>
                          )}

                          {/* Role selector */}
                          <select
                            value={c.role}
                            onChange={(e) => handleUpdateCPARole(c._id, e.target.value)}
                            style={s.roleSelect}
                          >
                            <option value="cpa">CPA</option>
                            <option value="senior_cpa">Senior CPA</option>
                            <option value="admin">Admin</option>
                          </select>

                          <button
                            onClick={() => setConfirmAction({ type: 'delete', id: c._id, name: `${c.firstName} ${c.lastName}` })}
                            style={s.deleteBtn}
                          >
                            🗑
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════ */}
        {/* PAYMENTS TAB                                   */}
        {/* ══════════════════════════════════════════════ */}
        {activeTab === 'payments' && (
          <div>
            <div style={s.toolbar}>
              <h2 style={s.sectionTitle}>💳 Payments ({payments.length})</h2>
              <button onClick={loadPayments} style={s.refreshBtn}>🔄</button>
            </div>

            {loading ? (
              <div style={s.loading}><div style={s.spinner} /><p>Loading payments...</p></div>
            ) : payments.length === 0 ? (
              <div style={s.empty}>No payments yet.</div>
            ) : (
              <div style={s.tableWrap}>
                <table style={s.table}>
                  <thead>
                    <tr>
                      <th style={s.th}>Invoice</th>
                      <th style={s.th}>Email</th>
                      <th style={s.th}>Plan</th>
                      <th style={s.th}>Amount</th>
                      <th style={s.th}>Status</th>
                      <th style={s.th}>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map(p => (
                      <tr key={p._id} style={s.tr}>
                        <td style={{ ...s.td, fontFamily: 'monospace', fontSize: '12px', color: '#94a3b8' }}>
                          {p.invoiceNumber || p._id?.toString().slice(-8)}
                        </td>
                        <td style={{ ...s.td, color: '#cbd5e1' }}>{p.email || '—'}</td>
                        <td style={s.td}>
                          <span style={s.planBadge}>{p.planId || '—'}</span>
                        </td>
                        <td style={{ ...s.td, fontWeight: '700', color: '#10b981' }}>
                          ${((p.amount || 0) / 100).toFixed(2)}
                        </td>
                        <td style={s.td}>
                          <span style={{
                            ...s.statusBadge,
                            backgroundColor: p.status === 'completed' ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.15)',
                            color: p.status === 'completed' ? '#22c55e' : '#f59e0b',
                          }}>
                            {p.status}
                          </span>
                        </td>
                        <td style={{ ...s.td, color: '#64748b', fontSize: '13px' }}>{timeAgo(p.createdAt || p.paidAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ══════════════════════════════════════════════ */}
      {/* CONFIRM DELETE MODAL                           */}
      {/* ══════════════════════════════════════════════ */}
      {confirmAction && (
        <div style={s.overlay} onClick={() => setConfirmAction(null)}>
          <div style={s.modal} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '24px', textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
              <h3 style={{ color: '#fff', margin: '0 0 8px', fontSize: '18px' }}>
                Delete {confirmAction.name}?
              </h3>
              <p style={{ color: '#94a3b8', fontSize: '14px', margin: 0 }}>
                This action cannot be undone. The CPA account and all associated data will be permanently removed.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '12px', padding: '16px 24px', borderTop: '1px solid #334155' }}>
              <button
                onClick={() => setConfirmAction(null)}
                style={{ ...s.cancelBtn, flex: 1 }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteCPA(confirmAction.id)}
                style={{ ...s.confirmDeleteBtn, flex: 1 }}
              >
                🗑 Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-16px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}


// ════════════════════════════════════════════════════════════
// STYLES
// ════════════════════════════════════════════════════════════
const s = {
  // Login
  loginPage: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
    padding: '20px',
  },
  loginCard: {
    width: '100%',
    maxWidth: '400px',
    background: '#1e293b',
    borderRadius: '20px',
    border: '1px solid #334155',
    padding: '32px',
  },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: '8px',
  },
  input: {
    width: '100%',
    padding: '14px 16px',
    borderRadius: '12px',
    border: '1px solid #334155',
    backgroundColor: '#0f172a',
    color: '#fff',
    fontSize: '15px',
    outline: 'none',
    boxSizing: 'border-box',
  },
  authError: {
    marginTop: '12px',
    padding: '10px 14px',
    borderRadius: '8px',
    backgroundColor: 'rgba(239,68,68,0.1)',
    border: '1px solid rgba(239,68,68,0.3)',
    color: '#fca5a5',
    fontSize: '13px',
  },
  loginBtn: {
    width: '100%',
    marginTop: '16px',
    padding: '14px',
    borderRadius: '12px',
    border: 'none',
    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
    color: '#fff',
    fontWeight: '700',
    fontSize: '15px',
    cursor: 'pointer',
  },

  // Page
  page: {
    minHeight: '100vh',
    backgroundColor: '#0f172a',
    color: '#e2e8f0',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },

  // Nav
  nav: {
    backgroundColor: '#1e293b',
    borderBottom: '1px solid #334155',
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
    padding: '0 24px',
    height: '60px',
  },
  navLeft: { display: 'flex', alignItems: 'center', gap: '10px' },
  navBadge: {
    backgroundColor: 'rgba(239,68,68,0.15)',
    color: '#f87171',
    padding: '4px 12px',
    borderRadius: '16px',
    fontSize: '12px',
    fontWeight: '700',
  },
  logoutBtn: {
    padding: '8px 16px',
    borderRadius: '8px',
    border: '1px solid #7f1d1d',
    backgroundColor: 'rgba(239,68,68,0.1)',
    color: '#f87171',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600',
  },

  // Messages
  successBar: {
    backgroundColor: '#065f46',
    color: '#6ee7b7',
    padding: '10px 24px',
    textAlign: 'center',
    fontWeight: '600',
    fontSize: '14px',
    animation: 'slideDown 0.3s ease-out',
  },
  errorBar: {
    backgroundColor: '#7f1d1d',
    color: '#fca5a5',
    padding: '10px 24px',
    textAlign: 'center',
    fontWeight: '600',
    fontSize: '14px',
    animation: 'slideDown 0.3s ease-out',
  },

  // Main
  main: {
    maxWidth: '1280px',
    margin: '0 auto',
    padding: '24px',
  },

  // Tabs
  tabRow: {
    display: 'flex',
    gap: '4px',
    backgroundColor: '#1e293b',
    padding: '4px',
    borderRadius: '12px',
    border: '1px solid #334155',
    marginBottom: '24px',
  },
  tabBtn: {
    flex: 1,
    padding: '12px 16px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: 'transparent',
    color: '#94a3b8',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.15s',
  },
  tabActive: {
    backgroundColor: '#3b82f6',
    color: '#fff',
  },

  // Section
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#fff',
    margin: '0 0 16px',
  },

  // Stats
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
    gap: '12px',
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

  // Toolbar
  toolbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    flexWrap: 'wrap',
    gap: '12px',
  },
  filterRow: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },
  searchInput: {
    padding: '10px 14px',
    borderRadius: '8px',
    border: '1px solid #334155',
    backgroundColor: '#1e293b',
    color: '#e2e8f0',
    fontSize: '13px',
    width: '240px',
    outline: 'none',
    boxSizing: 'border-box',
  },
  select: {
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
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid #334155',
    backgroundColor: '#1e293b',
    color: '#94a3b8',
    cursor: 'pointer',
    fontSize: '16px',
  },

  // Quick btns
  quickBtn: {
    padding: '12px 20px',
    borderRadius: '10px',
    border: '1px solid #334155',
    backgroundColor: '#1e293b',
    color: '#cbd5e1',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
  },

  // Table
  tableWrap: {
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '16px',
    overflow: 'hidden',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    padding: '14px 16px',
    textAlign: 'left',
    fontSize: '12px',
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    borderBottom: '1px solid #334155',
    backgroundColor: '#0f172a',
  },
  tr: {
    borderBottom: '1px solid #1e293b',
  },
  td: {
    padding: '14px 16px',
    fontSize: '14px',
    color: '#e2e8f0',
  },
  avatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    objectFit: 'cover',
  },
  avatarPlaceholder: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: '#334155',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
  },
  providerBadge: {
    fontSize: '12px',
    color: '#94a3b8',
  },

  // CPA Card
  cpaCard: {
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '16px',
    padding: '20px',
    animation: 'fadeIn 0.3s ease-out',
  },
  cpaCardTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '16px',
    flexWrap: 'wrap',
  },
  cpaInfoRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '16px',
    fontSize: '13px',
    color: '#94a3b8',
    marginTop: '4px',
  },
  statusBadge: {
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  roleBadge: {
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: '600',
    backgroundColor: 'rgba(99,102,241,0.15)',
    color: '#818cf8',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  planBadge: {
    padding: '4px 10px',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: '600',
    backgroundColor: 'rgba(59,130,246,0.15)',
    color: '#60a5fa',
  },

  // CPA Actions
  cpaActions: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  activateBtn: {
    padding: '8px 16px',
    borderRadius: '8px',
    border: 'none',
    background: 'linear-gradient(135deg, #22c55e, #16a34a)',
    color: '#fff',
    fontWeight: '700',
    fontSize: '13px',
    cursor: 'pointer',
  },
  suspendBtn: {
    padding: '8px 16px',
    borderRadius: '8px',
    border: '1px solid rgba(245,158,11,0.3)',
    backgroundColor: 'rgba(245,158,11,0.1)',
    color: '#fbbf24',
    fontWeight: '600',
    fontSize: '13px',
    cursor: 'pointer',
  },
  reactivateBtn: {
    padding: '8px 16px',
    borderRadius: '8px',
    border: '1px solid rgba(59,130,246,0.3)',
    backgroundColor: 'rgba(59,130,246,0.1)',
    color: '#60a5fa',
    fontWeight: '600',
    fontSize: '13px',
    cursor: 'pointer',
  },
  rejectBtn: {
    padding: '8px 16px',
    borderRadius: '8px',
    border: '1px solid rgba(239,68,68,0.3)',
    backgroundColor: 'rgba(239,68,68,0.1)',
    color: '#f87171',
    fontWeight: '600',
    fontSize: '13px',
    cursor: 'pointer',
  },
  roleSelect: {
    padding: '8px 10px',
    borderRadius: '8px',
    border: '1px solid #334155',
    backgroundColor: '#0f172a',
    color: '#cbd5e1',
    fontSize: '12px',
    cursor: 'pointer',
    outline: 'none',
  },
  deleteBtn: {
    padding: '8px 10px',
    borderRadius: '8px',
    border: '1px solid rgba(239,68,68,0.2)',
    backgroundColor: 'transparent',
    color: '#f87171',
    cursor: 'pointer',
    fontSize: '14px',
  },

  // Empty / Loading
  loading: {
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
    margin: '0 auto 12px',
  },
  empty: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#64748b',
    fontSize: '15px',
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '16px',
  },

  // Modal
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
    maxWidth: '420px',
    animation: 'fadeIn 0.2s ease-out',
  },
  cancelBtn: {
    padding: '12px',
    borderRadius: '10px',
    border: '1px solid #334155',
    backgroundColor: 'transparent',
    color: '#94a3b8',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '14px',
  },
  confirmDeleteBtn: {
    padding: '12px',
    borderRadius: '10px',
    border: 'none',
    backgroundColor: '#dc2626',
    color: '#fff',
    cursor: 'pointer',
    fontWeight: '700',
    fontSize: '14px',
  },
};
