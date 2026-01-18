// ============================================================
// CPA API SERVICE - Complete with ZIP Code Management
// ============================================================
// Location: frontend/src/services/cpaAPI.js
// ✅ COMPLETE FILE - Replace your existing cpaAPI.js
// ============================================================

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const cpaAPI = {
  baseURL: API_URL,

  // Get stored token
  getToken() {
    return localStorage.getItem('cpa_token');
  },

  // ============================================================
  // AUTH ENDPOINTS
  // ============================================================
  
  async login(email, password) {
    const res = await fetch(`${this.baseURL}/api/cpa/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    return res.json();
  },

  async register(data) {
    const res = await fetch(`${this.baseURL}/api/cpa/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async getProfile() {
    const res = await fetch(`${this.baseURL}/api/cpa/auth/profile`, {
      headers: { 'Authorization': `Bearer ${this.getToken()}` }
    });
    return res.json();
  },

  async updateProfile(data) {
    const res = await fetch(`${this.baseURL}/api/cpa/auth/profile`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${this.getToken()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async changePassword(currentPassword, newPassword) {
    const res = await fetch(`${this.baseURL}/api/cpa/auth/change-password`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.getToken()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ currentPassword, newPassword })
    });
    return res.json();
  },

  async verifyToken() {
    const res = await fetch(`${this.baseURL}/api/cpa/auth/verify`, {
      headers: { 'Authorization': `Bearer ${this.getToken()}` }
    });
    return res.json();
  },

  // ============================================================
  // CPA ADMIN ENDPOINTS
  // ============================================================

  async getAllCPAs(filters = {}) {
    const params = new URLSearchParams();
    if (filters.status && filters.status !== 'all') params.append('status', filters.status);
    if (filters.role && filters.role !== 'all') params.append('role', filters.role);
    if (filters.search) params.append('search', filters.search);
    if (filters.zipcode) params.append('zipcode', filters.zipcode);
    if (filters.page) params.append('page', filters.page);
    if (filters.limit) params.append('limit', filters.limit);

    const res = await fetch(`${this.baseURL}/api/cpa/admin/cpas?${params}`, {
      headers: { 'Authorization': `Bearer ${this.getToken()}` }
    });
    return res.json();
  },

  async getCPAById(cpaId) {
    const res = await fetch(`${this.baseURL}/api/cpa/admin/cpas/${cpaId}`, {
      headers: { 'Authorization': `Bearer ${this.getToken()}` }
    });
    return res.json();
  },

  async approveCPA(cpaId, assignedZipcodes = null) {
    const res = await fetch(`${this.baseURL}/api/cpa/admin/cpas/${cpaId}/approve`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.getToken()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ assignedZipcodes })
    });
    return res.json();
  },

  async updateCPAStatus(cpaId, status, reason = '') {
    const res = await fetch(`${this.baseURL}/api/cpa/admin/cpas/${cpaId}/status`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${this.getToken()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status, reason })
    });
    return res.json();
  },

  async updateCPAPermissions(cpaId, permissions = null, role = null) {
    const res = await fetch(`${this.baseURL}/api/cpa/admin/cpas/${cpaId}/permissions`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${this.getToken()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ permissions, role })
    });
    return res.json();
  },

  async deleteCPA(cpaId) {
    const res = await fetch(`${this.baseURL}/api/cpa/admin/cpas/${cpaId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${this.getToken()}` }
    });
    return res.json();
  },

  async getCPAStats(period = 30) {
    const res = await fetch(`${this.baseURL}/api/cpa/admin/stats?period=${period}`, {
      headers: { 'Authorization': `Bearer ${this.getToken()}` }
    });
    return res.json();
  },

  async getSystemStats() {
    const res = await fetch(`${this.baseURL}/api/cpa/admin/system-stats`, {
      headers: { 'Authorization': `Bearer ${this.getToken()}` }
    });
    return res.json();
  },

  // ============================================================
  // ✅ ZIP CODE MANAGEMENT ENDPOINTS
  // ============================================================

  /**
   * Update CPA's assigned ZIP codes
   * @param {string} cpaId - CPA ID
   * @param {string[]} zipcodes - Array of 5-digit ZIP codes
   * @param {string} action - 'set' (replace all), 'add', or 'remove'
   */
  async updateCPAZipcodes(cpaId, zipcodes, action = 'set') {
    const res = await fetch(`${this.baseURL}/api/cpa/admin/cpas/${cpaId}/zipcodes`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${this.getToken()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ zipcodes, action })
    });
    return res.json();
  },

  /**
   * Bulk assign ZIP codes to multiple CPAs
   * @param {string[]} cpaIds - Array of CPA IDs
   * @param {string[]} zipcodes - Array of ZIP codes
   * @param {string} action - 'add', 'remove', or 'set'
   */
  async bulkAssignZipcodes(cpaIds, zipcodes, action = 'add') {
    const res = await fetch(`${this.baseURL}/api/cpa/admin/zipcodes/bulk-assign`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.getToken()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ cpaIds, zipcodes, action })
    });
    return res.json();
  },

  /**
   * Get all ZIP codes in system (assigned + from files)
   */
  async getAllZipcodes() {
    const res = await fetch(`${this.baseURL}/api/cpa/admin/zipcodes`, {
      headers: { 'Authorization': `Bearer ${this.getToken()}` }
    });
    return res.json();
  },

  /**
   * Get ZIP code coverage report
   * Shows which ZIPs have files and which are covered by CPAs
   */
  async getZipcodeCoverage() {
    const res = await fetch(`${this.baseURL}/api/cpa/admin/zipcodes/coverage`, {
      headers: { 'Authorization': `Bearer ${this.getToken()}` }
    });
    return res.json();
  },

  // ============================================================
  // FILE REVIEW ENDPOINTS
  // ============================================================

  async getPendingReviews(taxYear = null) {
    const params = taxYear ? `?taxYear=${taxYear}` : '';
    const res = await fetch(`${this.baseURL}/api/cpa/pending${params}`, {
      headers: { 'Authorization': `Bearer ${this.getToken()}` }
    });
    return res.json();
  },

  async getAllFiles(filters = {}) {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.taxYear) params.append('taxYear', filters.taxYear);
    if (filters.userId) params.append('userId', filters.userId);
    if (filters.zipcode) params.append('zipcode', filters.zipcode);
    if (filters.page) params.append('page', filters.page);
    if (filters.limit) params.append('limit', filters.limit);

    const res = await fetch(`${this.baseURL}/api/cpa/files?${params}`, {
      headers: { 'Authorization': `Bearer ${this.getToken()}` }
    });
    return res.json();
  },

  async getReviewStats(taxYear = null) {
    const params = taxYear ? `?taxYear=${taxYear}` : '';
    const res = await fetch(`${this.baseURL}/api/cpa/stats${params}`, {
      headers: { 'Authorization': `Bearer ${this.getToken()}` }
    });
    return res.json();
  },

  async getFileDetails(fileId) {
    const res = await fetch(`${this.baseURL}/api/cpa/files/${fileId}`, {
      headers: { 'Authorization': `Bearer ${this.getToken()}` }
    });
    return res.json();
  },

  async getUserFilings(userId) {
    const res = await fetch(`${this.baseURL}/api/cpa/users/${userId}/filings`, {
      headers: { 'Authorization': `Bearer ${this.getToken()}` }
    });
    return res.json();
  },

  async submitReview(fileId, data) {
    const res = await fetch(`${this.baseURL}/api/cpa/files/${fileId}/review`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.getToken()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async bulkApprove(fileIds, reviewedBy) {
    const res = await fetch(`${this.baseURL}/api/cpa/bulk-approve`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.getToken()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ fileIds, reviewedBy })
    });
    return res.json();
  },

  // ============================================================
  // TEST ENDPOINTS
  // ============================================================

  async createTestFile(data) {
    const res = await fetch(`${this.baseURL}/api/cpa/test/create-file`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.getToken()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    return res.json();
  }
};

export default cpaAPI;