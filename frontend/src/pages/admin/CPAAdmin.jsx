// ============================================================
// CPA ADMIN PAGE - Manage CPA Users & ZIP Code Territories
// ============================================================
// Location: frontend/src/pages/CPAAdmin.jsx
// ✅ UPDATED: Inline API call for ZIP codes (fixes missing function)
// ============================================================

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { cpaAPI } from '../../services/cpaAPI';
import { useCPAAuth } from '../../contexts/CPAAuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function CPAAdmin() {
  const navigate = useNavigate();
  const { cpa, logout } = useCPAAuth();
  
  const [cpas, setCPAs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('cpas');
  
  // ZIP Code Management
  const [selectedCPA, setSelectedCPA] = useState(null);
  const [showZipModal, setShowZipModal] = useState(false);
  const [zipInput, setZipInput] = useState('');
  const [zipCoverage, setZipCoverage] = useState(null);

  // Get token helper
  function getToken() {
    return localStorage.getItem('cpa_token');
  }

  // ✅ INLINE API FUNCTIONS (works even if cpaAPI doesn't have them)
  async function updateCPAZipcodesAPI(cpaId, zipcodes, action = 'set') {
    try {
      const res = await fetch(`${API_URL}/api/cpa/admin/cpas/${cpaId}/zipcodes`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${getToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ zipcodes, action })
      });
      return res.json();
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  async function getZipcodeCoverageAPI() {
    try {
      const res = await fetch(`${API_URL}/api/cpa/admin/zipcodes/coverage`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      return res.json();
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // Check admin access
  useEffect(() => {
    if (cpa && !['admin', 'senior_cpa'].includes(cpa.role)) {
      navigate('/cpa/dashboard');
    }
  }, [cpa, navigate]);

  // Load data
  useEffect(() => {
    loadData();
  }, [statusFilter, roleFilter, search]);

  // Load ZIP coverage
  useEffect(() => {
    loadZipCoverage();
  }, [activeTab]);

  async function loadData() {
    try {
      setLoading(true);
      const [cpasRes, statsRes] = await Promise.all([
        cpaAPI.getAllCPAs({ status: statusFilter, role: roleFilter, search }),
        cpaAPI.getCPAStats()
      ]);
      
      if (cpasRes.success) setCPAs(cpasRes.cpas);
      if (statsRes.success) setStats(statsRes);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadZipCoverage() {
    try {
      const res = await getZipcodeCoverageAPI();
      if (res.success) {
        setZipCoverage(res);
      }
    } catch (err) {
      console.error('Failed to load ZIP coverage:', err);
    }
  }

  // Approve CPA
  async function handleApprove(cpaId) {
    try {
      const res = await cpaAPI.approveCPA(cpaId);
      if (res.success) {
        setSuccessMsg('CPA approved successfully!');
        loadData();
      }
    } catch (err) {
      setError(err.message);
    }
  }

  // Update status
  async function handleUpdateStatus(cpaId, newStatus) {
    try {
      const res = await cpaAPI.updateCPAStatus(cpaId, newStatus);
      if (res.success) {
        setSuccessMsg(`CPA status updated to ${newStatus}`);
        loadData();
      }
    } catch (err) {
      setError(err.message);
    }
  }

  // Update role
  async function handleUpdateRole(cpaId, newRole) {
    try {
      const res = await cpaAPI.updateCPAPermissions(cpaId, null, newRole);
      if (res.success) {
        setSuccessMsg('CPA role updated');
        loadData();
      }
    } catch (err) {
      setError(err.message);
    }
  }

  // ✅ Update ZIP codes - uses inline function directly
  async function handleUpdateZipcodes(cpaId, zipcodes, action = 'set') {
    try {
      console.log('Updating ZIP codes:', { cpaId, zipcodes, action });
      const res = await updateCPAZipcodesAPI(cpaId, zipcodes, action);
      console.log('Response:', res);
      
      if (res.success) {
        setSuccessMsg(res.message || 'ZIP codes updated successfully');
        setShowZipModal(false);
        setSelectedCPA(null);
        setZipInput('');
        loadData();
        loadZipCoverage();
      } else {
        setError(res.error || 'Failed to update ZIP codes');
      }
    } catch (err) {
      console.error('Error updating ZIP codes:', err);
      setError(err.message);
    }
  }

  // Open ZIP modal
  function openZipModal(cpaItem) {
    setSelectedCPA(cpaItem);
    setZipInput(cpaItem.assignedZipcodes?.join(', ') || '');
    setShowZipModal(true);
  }

  // Parse ZIP input
  function parseZipInput(input) {
    return input
      .split(/[,\s\n]+/)
      .map(z => z.trim())
      .filter(z => /^\d{5}$/.test(z));
  }

  // Clear messages
  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Status badge styles
  function getStatusBadge(status) {
    const styles = {
      active: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      pending: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      suspended: 'bg-red-500/20 text-red-400 border-red-500/30',
      inactive: 'bg-slate-600/50 text-slate-400 border-slate-500/30'
    };
    return styles[status] || styles.inactive;
  }

  // Role badge styles
  function getRoleBadge(role) {
    const styles = {
      admin: 'bg-purple-500/20 text-purple-400',
      senior_cpa: 'bg-blue-500/20 text-blue-400',
      cpa: 'bg-slate-600 text-slate-300'
    };
    return styles[role] || styles.cpa;
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <svg width="40" height="40" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="8" fill="url(#adminGrad)"/>
              <path d="M8 12h16M8 16h12M8 20h8" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              <circle cx="24" cy="20" r="4" fill="#10b981"/>
              <path d="M22 20l1.5 1.5L26 19" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <defs>
                <linearGradient id="adminGrad" x1="0" y1="0" x2="32" y2="32">
                  <stop stopColor="#3b82f6"/>
                  <stop offset="1" stopColor="#8b5cf6"/>
                </linearGradient>
              </defs>
            </svg>
            <div>
              <h1 className="text-xl font-bold">CPA Admin Panel</h1>
              <p className="text-slate-400 text-sm">Manage CPAs & ZIP Code Territories</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/cpa/dashboard')}
              className="px-4 py-2 bg-slate-700 rounded-lg hover:bg-slate-600 transition text-sm"
            >
              ← Back to Dashboard
            </button>
            <div className="text-right">
              <p className="text-sm font-medium">{cpa?.firstName} {cpa?.lastName}</p>
              <p className="text-xs text-slate-400">{cpa?.role?.replace('_', ' ').toUpperCase()}</p>
            </div>
            <button
              onClick={() => { logout(); navigate('/cpa/login'); }}
              className="bg-red-500/20 text-red-400 border border-red-500/30 px-4 py-2 rounded-lg hover:bg-red-500/30 transition"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="p-6">
        {/* Notifications */}
        {successMsg && (
          <div className="mb-4 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 px-4 py-3 rounded-lg flex justify-between items-center">
            <span>✅ {successMsg}</span>
            <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-emerald-300">✕</button>
          </div>
        )}
        {error && (
          <div className="mb-4 bg-red-500/20 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg flex justify-between items-center">
            <span>❌ {error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">✕</button>
          </div>
        )}

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <p className="text-slate-400 text-sm">Total CPAs</p>
              <p className="text-3xl font-bold text-white">
                {(stats.statusCounts?.active || 0) + 
                 (stats.statusCounts?.pending || 0) + 
                 (stats.statusCounts?.suspended || 0) +
                 (stats.statusCounts?.inactive || 0)}
              </p>
            </div>
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
              <p className="text-emerald-400 text-sm">Active</p>
              <p className="text-3xl font-bold text-white">{stats.statusCounts?.active || 0}</p>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
              <p className="text-amber-400 text-sm">Pending Approval</p>
              <p className="text-3xl font-bold text-white">{stats.statusCounts?.pending || 0}</p>
            </div>
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
              <p className="text-red-400 text-sm">Suspended</p>
              <p className="text-3xl font-bold text-white">{stats.statusCounts?.suspended || 0}</p>
            </div>
            <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
              <p className="text-purple-400 text-sm">ZIP Territories</p>
              <p className="text-3xl font-bold text-white">{zipCoverage?.summary?.totalZipcodes || '—'}</p>
            </div>
          </div>
        )}

        {/* ZIP Coverage Alert */}
        {zipCoverage?.uncoveredZipcodes?.length > 0 && (
          <div className="mb-6 bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
            <h3 className="text-amber-400 font-semibold mb-2">⚠️ Uncovered ZIP Codes</h3>
            <p className="text-slate-300 text-sm mb-3">
              {zipCoverage.uncoveredZipcodes.length} ZIP code(s) with pending files have no assigned CPA:
            </p>
            <div className="flex flex-wrap gap-2">
              {zipCoverage.uncoveredZipcodes.slice(0, 15).map(z => (
                <span key={z.zipcode} className="bg-amber-500/20 text-amber-300 px-2 py-1 rounded text-sm font-mono">
                  {z.zipcode} ({z.pendingCount} pending)
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('cpas')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === 'cpas' ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            👥 CPA Management
          </button>
          <button
            onClick={() => setActiveTab('zipcode')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === 'zipcode' ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            📍 ZIP Coverage
          </button>
        </div>

        {/* CPA Management Tab */}
        {activeTab === 'cpas' && (
          <>
            {/* Filters */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-6">
              <div className="flex gap-4 items-center flex-wrap">
                <div className="flex-1 min-w-[200px]">
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by name, email, license, or ZIP..."
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="suspended">Suspended</option>
                  <option value="inactive">Inactive</option>
                </select>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
                >
                  <option value="all">All Roles</option>
                  <option value="admin">Admin</option>
                  <option value="senior_cpa">Senior CPA</option>
                  <option value="cpa">CPA</option>
                </select>
                <button onClick={loadData} className="bg-slate-700 px-4 py-2 rounded-lg hover:bg-slate-600 transition">
                  🔄 Refresh
                </button>
              </div>
            </div>

            {/* CPA Table */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
              {loading ? (
                <div className="p-12 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                  <p className="text-slate-400">Loading CPAs...</p>
                </div>
              ) : cpas.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="text-4xl mb-4">👥</div>
                  <p className="text-slate-400">No CPAs found</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-slate-900/50 border-b border-slate-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">CPA</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">License</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">Role</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">Status</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">ZIP Codes</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">Reviews</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {cpas.map((c) => (
                      <tr key={c._id} className="hover:bg-slate-700/30 transition">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-white">{c.firstName} {c.lastName}</p>
                            <p className="text-sm text-slate-400">{c.email}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-sm text-slate-300">{c.licenseNumber}</span>
                          <span className="text-slate-500 ml-1">({c.licenseState})</span>
                        </td>
                        <td className="px-4 py-3">
                          {cpa.role === 'admin' && c._id !== cpa.id ? (
                            <select
                              value={c.role}
                              onChange={(e) => handleUpdateRole(c._id, e.target.value)}
                              className={`px-2 py-1 rounded text-xs font-medium border-0 cursor-pointer ${getRoleBadge(c.role)}`}
                            >
                              <option value="cpa">CPA</option>
                              <option value="senior_cpa">Senior CPA</option>
                              <option value="admin">Admin</option>
                            </select>
                          ) : (
                            <span className={`px-2 py-1 rounded text-xs font-medium ${getRoleBadge(c.role)}`}>
                              {c.role?.replace('_', ' ').toUpperCase()}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded border text-xs font-medium ${getStatusBadge(c.status)}`}>
                            {c.status === 'pending' && '⏳ '}
                            {c.status === 'active' && '✅ '}
                            {c.status === 'suspended' && '🚫 '}
                            {c.status?.charAt(0).toUpperCase() + c.status?.slice(1)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {c.assignedZipcodes?.length > 0 ? (
                            <div className="flex flex-wrap gap-1 max-w-[180px]">
                              {c.assignedZipcodes.slice(0, 3).map(zip => (
                                <span key={zip} className="bg-slate-600 px-2 py-0.5 rounded text-xs font-mono">
                                  {zip}
                                </span>
                              ))}
                              {c.assignedZipcodes.length > 3 && (
                                <span className="text-slate-400 text-xs">+{c.assignedZipcodes.length - 3}</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-500 text-sm">All territories</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className="text-emerald-400 font-medium">{c.stats?.totalApproved || 0}</span>
                          <span className="text-slate-500 mx-1">/</span>
                          <span className="text-red-400 font-medium">{c.stats?.totalRejected || 0}</span>
                        </td>
                        <td className="px-4 py-3">
                          {c._id !== cpa.id && cpa.role === 'admin' ? (
                            <div className="flex gap-2 flex-wrap">
                              {c.status === 'pending' && (
                                <button
                                  onClick={() => handleApprove(c._id)}
                                  className="bg-emerald-500 text-white px-3 py-1 rounded text-sm hover:bg-emerald-600 transition"
                                >
                                  ✓ Activate
                                </button>
                              )}
                              {c.status === 'active' && (
                                <button
                                  onClick={() => handleUpdateStatus(c._id, 'suspended')}
                                  className="bg-amber-500 text-white px-3 py-1 rounded text-sm hover:bg-amber-600 transition"
                                >
                                  ⏸ Suspend
                                </button>
                              )}
                              {(c.status === 'suspended' || c.status === 'inactive') && (
                                <button
                                  onClick={() => handleUpdateStatus(c._id, 'active')}
                                  className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600 transition"
                                >
                                  ▶ Reactivate
                                </button>
                              )}
                              <button
                                onClick={() => openZipModal(c)}
                                className="bg-slate-600 text-white px-3 py-1 rounded text-sm hover:bg-slate-500 transition"
                              >
                                📍 ZIP
                              </button>
                            </div>
                          ) : c._id === cpa.id ? (
                            <span className="text-slate-400 text-sm italic">You</span>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {/* ZIP Coverage Tab */}
        {activeTab === 'zipcode' && (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold">📍 ZIP Code Coverage Report</h2>
              <button onClick={loadZipCoverage} className="bg-slate-700 px-4 py-2 rounded-lg hover:bg-slate-600 transition text-sm">
                🔄 Refresh
              </button>
            </div>
            
            {zipCoverage ? (
              <>
                <div className="grid grid-cols-4 gap-4 mb-6">
                  <div className="bg-slate-700/50 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-white">{zipCoverage.summary?.totalZipcodes || 0}</p>
                    <p className="text-sm text-slate-400">Total ZIP Codes</p>
                  </div>
                  <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-emerald-400">{zipCoverage.summary?.coveredZipcodes || 0}</p>
                    <p className="text-sm text-slate-400">Covered</p>
                  </div>
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-amber-400">{zipCoverage.summary?.uncoveredZipcodes || 0}</p>
                    <p className="text-sm text-slate-400">Uncovered</p>
                  </div>
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-blue-400">{zipCoverage.summary?.coveragePercent || 0}%</p>
                    <p className="text-sm text-slate-400">Coverage Rate</p>
                  </div>
                </div>
                
                <div className="max-h-[500px] overflow-y-auto rounded-lg border border-slate-700">
                  <table className="w-full">
                    <thead className="bg-slate-900/50 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm text-slate-400">ZIP Code</th>
                        <th className="px-4 py-3 text-left text-sm text-slate-400">Total Files</th>
                        <th className="px-4 py-3 text-left text-sm text-slate-400">Pending</th>
                        <th className="px-4 py-3 text-left text-sm text-slate-400">Assigned CPAs</th>
                        <th className="px-4 py-3 text-left text-sm text-slate-400">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                      {zipCoverage.allZipcodes?.map(z => (
                        <tr key={z.zipcode} className="hover:bg-slate-700/30">
                          <td className="px-4 py-3 font-mono text-white">{z.zipcode}</td>
                          <td className="px-4 py-3 text-slate-300">{z.fileCount}</td>
                          <td className="px-4 py-3">
                            {z.pendingCount > 0 ? (
                              <span className="bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded text-xs">
                                {z.pendingCount} pending
                              </span>
                            ) : (
                              <span className="text-slate-500">0</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {z.assignedCPAs?.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {z.assignedCPAs.map(cpaItem => (
                                  <span key={cpaItem.id} className="bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded text-xs">
                                    {cpaItem.name}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-500">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {z.covered ? (
                              <span className="text-emerald-400 text-sm">✓ Covered</span>
                            ) : (
                              <span className="text-amber-400 text-sm">⚠ Uncovered</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-slate-400">Loading ZIP coverage...</p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ZIP Code Modal */}
      {showZipModal && selectedCPA && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl w-full max-w-lg border border-slate-700">
            <div className="p-6 border-b border-slate-700">
              <h2 className="text-xl font-bold">📍 Assign ZIP Codes</h2>
              <p className="text-slate-400 text-sm mt-1">
                {selectedCPA.firstName} {selectedCPA.lastName} ({selectedCPA.email})
              </p>
            </div>
            
            <div className="p-6">
              <label className="block text-sm font-medium mb-2 text-white">
                ZIP Codes (comma or newline separated)
              </label>
              <textarea
                value={zipInput}
                onChange={(e) => setZipInput(e.target.value)}
                placeholder="95122, 95123, 95124"
                className="w-full bg-slate-700 border border-slate-600 rounded-lg p-3 h-32 font-mono text-sm text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-slate-400 mt-2">
                {parseZipInput(zipInput).length} valid ZIP code(s) detected
              </p>
              
              {parseZipInput(zipInput).length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {parseZipInput(zipInput).map(zip => (
                    <span key={zip} className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded text-sm font-mono">
                      {zip}
                    </span>
                  ))}
                </div>
              )}
              
              {zipCoverage?.uncoveredZipcodes?.length > 0 && (
                <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                  <p className="text-sm text-amber-400 mb-2">Quick add uncovered ZIPs:</p>
                  <div className="flex flex-wrap gap-1">
                    {zipCoverage.uncoveredZipcodes.slice(0, 8).map(z => (
                      <button
                        key={z.zipcode}
                        onClick={() => setZipInput(prev => prev ? `${prev}, ${z.zipcode}` : z.zipcode)}
                        className="bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded text-xs hover:bg-amber-500/30 transition"
                      >
                        + {z.zipcode}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-6 border-t border-slate-700 flex justify-between">
              <button
                onClick={() => { setShowZipModal(false); setSelectedCPA(null); setZipInput(''); }}
                className="px-4 py-2 bg-slate-700 rounded-lg hover:bg-slate-600 transition"
              >
                Cancel
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => handleUpdateZipcodes(selectedCPA._id, parseZipInput(zipInput), 'add')}
                  disabled={parseZipInput(zipInput).length === 0}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition disabled:opacity-50"
                >
                  ➕ Add to Existing
                </button>
                <button
                  onClick={() => handleUpdateZipcodes(selectedCPA._id, parseZipInput(zipInput), 'set')}
                  className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition"
                >
                  💾 Replace All
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}