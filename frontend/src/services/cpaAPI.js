// ============================================================
// CPA API SERVICE
// ============================================================
// Location: frontend/src/pages/services/cpaAPI.js
//
// All CPA-related API calls in one place.
// Used by: CPAAdmin, CPARegister, CPADashboard, CPABidBoard
// ============================================================

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// ── Helper: get CPA token ──
function getToken() {
  return localStorage.getItem('cpa_token') || '';
}

// ── Helper: auth headers ──
function authHeaders(extra = {}) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${getToken()}`,
    ...extra,
  };
}

// ── Helper: handle response ──
async function handleResponse(res) {
  const data = await res.json();
  if (!res.ok && !data.success) {
    throw new Error(data.message || data.error || `Request failed (${res.status})`);
  }
  return data;
}

// ══════════════════════════════════════════════════════════
// AUTH
// ══════════════════════════════════════════════════════════
async function loginCPA(email, password) {
  const res = await fetch(`${API_URL}/api/cpa/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return handleResponse(res);
}

async function registerCPA(formData) {
  const res = await fetch(`${API_URL}/api/cpa/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData),
  });
  return handleResponse(res);
}

async function verifyCPAToken() {
  const res = await fetch(`${API_URL}/api/cpa/auth/verify`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
}

// ══════════════════════════════════════════════════════════
// ADMIN: CPA MANAGEMENT
// ══════════════════════════════════════════════════════════
async function getAllCPAs(filters = {}) {
  const params = new URLSearchParams();
  if (filters.status && filters.status !== 'all') params.append('status', filters.status);
  if (filters.role && filters.role !== 'all') params.append('role', filters.role);
  if (filters.search) params.append('search', filters.search);

  const res = await fetch(`${API_URL}/api/cpa/admin/cpas?${params}`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
}

async function getCPAStats() {
  const res = await fetch(`${API_URL}/api/cpa/admin/stats`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
}

async function approveCPA(cpaId) {
  const res = await fetch(`${API_URL}/api/cpa/admin/cpas/${cpaId}/approve`, {
    method: 'PUT',
    headers: authHeaders(),
  });
  return handleResponse(res);
}

async function updateCPAStatus(cpaId, status) {
  const res = await fetch(`${API_URL}/api/cpa/admin/cpas/${cpaId}/status`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ status }),
  });
  return handleResponse(res);
}

async function updateCPAPermissions(cpaId, permissions, role) {
  const body = {};
  if (permissions) body.permissions = permissions;
  if (role) body.role = role;

  const res = await fetch(`${API_URL}/api/cpa/admin/cpas/${cpaId}/permissions`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  return handleResponse(res);
}

async function updateCPAZipcodes(cpaId, zipcodes, action = 'set') {
  const res = await fetch(`${API_URL}/api/cpa/admin/cpas/${cpaId}/zipcodes`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ zipcodes, action }),
  });
  return handleResponse(res);
}

async function getZipcodeCoverage() {
  const res = await fetch(`${API_URL}/api/cpa/admin/zipcodes/coverage`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
}

// ══════════════════════════════════════════════════════════
// JOBS: BID BOARD
// ══════════════════════════════════════════════════════════
async function getJobs(filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v) params.append(k, v);
  });

  const res = await fetch(`${API_URL}/api/cpa/jobs?${params}`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
}

async function getJobDetails(jobId) {
  const res = await fetch(`${API_URL}/api/cpa/jobs/${jobId}/details`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
}

async function placeBid(jobId, bidData) {
  const res = await fetch(`${API_URL}/api/cpa/jobs/${jobId}/bid`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(bidData),
  });
  return handleResponse(res);
}

async function getJobBids(jobId) {
  const res = await fetch(`${API_URL}/api/cpa/jobs/${jobId}/bids`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
}

async function acceptBid(jobId, bidId) {
  const res = await fetch(`${API_URL}/api/cpa/jobs/${jobId}/accept`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ bidId }),
  });
  return handleResponse(res);
}

async function completeJob(jobId) {
  const res = await fetch(`${API_URL}/api/cpa/jobs/${jobId}/complete`, {
    method: 'POST',
    headers: authHeaders(),
  });
  return handleResponse(res);
}

async function generatePdf(jobId, formType = 'federal') {
  const res = await fetch(`${API_URL}/api/cpa/jobs/${jobId}/generate-pdf`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ formType }),
  });
  if (res.ok) {
    return res.blob();
  }
  const data = await res.json();
  throw new Error(data.message || 'PDF generation failed');
}

// ══════════════════════════════════════════════════════════
// EXPORT
// ══════════════════════════════════════════════════════════
export const cpaAPI = {
  // Auth
  loginCPA,
  registerCPA,
  verifyCPAToken,

  // Admin
  getAllCPAs,
  getCPAStats,
  approveCPA,
  updateCPAStatus,
  updateCPAPermissions,
  updateCPAZipcodes,
  getZipcodeCoverage,

  // Jobs / Bid Board
  getJobs,
  getJobDetails,
  placeBid,
  getJobBids,
  acceptBid,
  completeJob,
  generatePdf,
};

export default cpaAPI;