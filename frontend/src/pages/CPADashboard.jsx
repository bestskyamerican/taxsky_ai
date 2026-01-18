// ============================================================
// CPA DASHBOARD - Main Dashboard Page
// ============================================================
// Location: frontend/src/pages/CPADashboard.jsx
// ✅ UPDATED: 2025 tax year, groups by user
// ============================================================

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { cpaAPI } from '../services/cpaAPI';
import { useCPAAuth } from '../contexts/CPAAuthContext';

// Components
import StatsCards from '../components/cpa/StatsCards';
import PendingReviewsTable from '../components/cpa/PendingReviewsTable';
import ReviewModal from '../components/cpa/ReviewModal';

export default function CPADashboard() {
  const navigate = useNavigate();
  const { cpa, logout } = useCPAAuth();
  
  const [stats, setStats] = useState(null);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filter states - ✅ Default to 2025
  const [taxYear, setTaxYear] = useState(2025);
  const [statusFilter, setStatusFilter] = useState('pending');

  // Load dashboard data
  useEffect(() => {
    loadDashboardData();
  }, [taxYear, statusFilter]);

  async function loadDashboardData() {
    try {
      setLoading(true);
      setError(null);
      
      const [statsRes, filesRes] = await Promise.all([
        cpaAPI.getStats(taxYear),
        statusFilter === 'pending' 
          ? cpaAPI.getPendingReviews(taxYear)
          : cpaAPI.getAllFiles({ status: statusFilter, taxYear })
      ]);
      
      if (statsRes.success) setStats(statsRes.stats);
      if (filesRes.success) setPendingFiles(filesRes.files);
      
    } catch (err) {
      setError(err.message);
      if (err.message.includes('401') || err.message.includes('unauthorized')) {
        logout();
        navigate('/cpa/login');
      }
    } finally {
      setLoading(false);
    }
  }

  // Handle file selection for review
  async function handleSelectFile(fileId) {
    try {
      const res = await cpaAPI.getFileDetails(fileId);
      if (res.success) {
        setSelectedFile({ ...res.file, userData: res.userData, chatHistory: res.chatHistory });
      }
    } catch (err) {
      setError(err.message);
    }
  }

  // Handle review submission
  async function handleSubmitReview(fileId, reviewData) {
    try {
      const res = await cpaAPI.submitReview(fileId, {
        ...reviewData,
        reviewedBy: `${cpa.firstName} ${cpa.lastName}`
      });
      
      if (res.success) {
        setSelectedFile(null);
        loadDashboardData(); // Refresh
      }
    } catch (err) {
      setError(err.message);
    }
  }

  // Handle bulk approve
  async function handleBulkApprove(fileIds) {
    try {
      const res = await cpaAPI.bulkApprove(fileIds, `${cpa.firstName} ${cpa.lastName}`);
      if (res.success) {
        loadDashboardData();
      }
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              🏢 TaxSky CPA Dashboard
            </h1>
            <p className="text-sm text-gray-500">
              Welcome, {cpa?.firstName} {cpa?.lastName}
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Year Filter - ✅ Added 2025 */}
            <select
              value={taxYear}
              onChange={(e) => setTaxYear(parseInt(e.target.value))}
              className="border rounded px-3 py-2"
            >
              <option value={2025}>Tax Year 2025</option>
              <option value={2024}>Tax Year 2024</option>
              <option value={2023}>Tax Year 2023</option>
            </select>
            
            {/* Profile/Settings */}
            <button
              onClick={() => navigate('/cpa/profile')}
              className="text-gray-600 hover:text-gray-900"
            >
              ⚙️ Settings
            </button>
            
            {/* Logout */}
            <button
              onClick={() => { logout(); navigate('/cpa/login'); }}
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Error Display */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            ❌ {error}
            <button onClick={() => setError(null)} className="float-right">×</button>
          </div>
        )}

        {/* Stats Cards */}
        <StatsCards stats={stats} loading={loading} />

        {/* Status Filter Tabs */}
        <div className="flex gap-2 mt-6 mb-4">
          {['pending', 'approved', 'rejected', 'all'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-t font-medium ${
                statusFilter === status
                  ? 'bg-white text-blue-600 border-t border-l border-r'
                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
              {status === 'pending' && stats?.pending > 0 && (
                <span className="ml-2 bg-red-500 text-white px-2 py-0.5 rounded-full text-xs">
                  {stats.pending}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Files Table - ✅ Now groups by user */}
        <PendingReviewsTable
          files={pendingFiles}
          loading={loading}
          onSelectFile={handleSelectFile}
          onBulkApprove={handleBulkApprove}
          showBulkActions={statusFilter === 'pending'}
        />

        {/* Review Modal */}
        {selectedFile && (
          <ReviewModal
            file={selectedFile}
            onClose={() => setSelectedFile(null)}
            onSubmit={handleSubmitReview}
          />
        )}
      </main>
    </div>
  );
}