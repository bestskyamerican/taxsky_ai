// ============================================================
// CPA API SERVICE - API calls for CPA Dashboard
// ============================================================
// Location: frontend/src/services/cpaAPI.js
// ============================================================

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const CPA_API = `${API_BASE}/api/cpa`;

// Helper to get auth header
function getAuthHeader() {
  const token = localStorage.getItem('cpa_token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

// Generic fetch wrapper
async function fetchAPI(endpoint, options = {}) {
  const url = `${CPA_API}${endpoint}`;
  
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
      ...options.headers
    },
    ...options
  };
  
  try {
    const response = await fetch(url, config);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || `HTTP error ${response.status}`);
    }
    
    return data;
  } catch (error) {
    console.error(`API Error [${endpoint}]:`, error);
    throw error;
  }
}

// ============================================================
// AUTH APIs
// ============================================================

export const cpaAPI = {
  // Register new CPA
  register: (data) => fetchAPI('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  
  // Login
  login: (email, password) => fetchAPI('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  }),
  
  // Verify token
  verifyToken: () => fetchAPI('/auth/verify'),
  
  // Logout
  logout: () => fetchAPI('/auth/logout', { method: 'POST' }),
  
  // Get profile
  getProfile: () => fetchAPI('/auth/profile'),
  
  // Update profile
  updateProfile: (data) => fetchAPI('/auth/profile', {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  
  // Change password
  changePassword: (currentPassword, newPassword) => fetchAPI('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword })
  }),
  
  // Forgot password
  forgotPassword: (email) => fetchAPI('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email })
  }),
  
  // Reset password
  resetPassword: (token, newPassword) => fetchAPI('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, newPassword })
  }),

  // ============================================================
  // REVIEW APIs
  // ============================================================
  
  // Get stats
  getStats: (taxYear) => fetchAPI(`/stats?taxYear=${taxYear || ''}`),
  
  // Get pending reviews
  getPendingReviews: (taxYear, limit = 50) => 
    fetchAPI(`/pending?taxYear=${taxYear || ''}&limit=${limit}`),
  
  // Get all files (with filters)
  getAllFiles: ({ status, taxYear, userId, page = 1, limit = 50 }) => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (taxYear) params.append('taxYear', taxYear);
    if (userId) params.append('userId', userId);
    params.append('page', page);
    params.append('limit', limit);
    return fetchAPI(`/files?${params.toString()}`);
  },
  
  // Get file details
  getFileDetails: (fileId) => fetchAPI(`/files/${fileId}`),
  
  // Submit review
  submitReview: (fileId, data) => fetchAPI(`/files/${fileId}/review`, {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  
  // Bulk approve
  bulkApprove: (fileIds, reviewedBy) => fetchAPI('/bulk-approve', {
    method: 'POST',
    body: JSON.stringify({ fileIds, reviewedBy })
  }),
  
  // Get user filings
  getUserFilings: (userId) => fetchAPI(`/users/${userId}/filings`),

  // ============================================================
  // ADMIN APIs
  // ============================================================
  
  // Get all CPAs
  getAllCPAs: ({ status, role, search, page = 1, limit = 20 } = {}) => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (role) params.append('role', role);
    if (search) params.append('search', search);
    params.append('page', page);
    params.append('limit', limit);
    return fetchAPI(`/admin/cpas?${params.toString()}`);
  },
  
  // Get single CPA
  getCPAById: (cpaId) => fetchAPI(`/admin/cpas/${cpaId}`),
  
  // Approve CPA
  approveCPA: (cpaId) => fetchAPI(`/admin/cpas/${cpaId}/approve`, {
    method: 'POST'
  }),
  
  // Update CPA status
  updateCPAStatus: (cpaId, status, reason) => fetchAPI(`/admin/cpas/${cpaId}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status, reason })
  }),
  
  // Update CPA permissions
  updateCPAPermissions: (cpaId, permissions, role) => fetchAPI(`/admin/cpas/${cpaId}/permissions`, {
    method: 'PUT',
    body: JSON.stringify({ permissions, role })
  }),
  
  // Delete CPA
  deleteCPA: (cpaId) => fetchAPI(`/admin/cpas/${cpaId}`, {
    method: 'DELETE'
  }),
  
  // Get CPA stats
  getCPAStats: (period = 30) => fetchAPI(`/admin/cpa-stats?period=${period}`),
  
  // Get system stats
  getSystemStats: () => fetchAPI('/admin/system-stats')
};

export default cpaAPI;
