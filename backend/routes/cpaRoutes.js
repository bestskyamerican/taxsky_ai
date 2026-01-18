// ============================================================
// CPA ROUTES - Complete Auth + Review + ZIP Code System
// ============================================================
// Location: backend/routes/cpaRoutes.js
// ✅ UPDATED: Added ZIP code management routes
// ============================================================

import express from 'express';

// Auth Controller
import {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  verifyToken,
  logout
} from '../controllers/cpaAuthController.js';

// CPA Controller (Review)
import {
  getPendingReviews,
  getAllFiles,
  getReviewStats,
  submitReview,
  getFileDetails,
  getUserFilings,
  bulkApprove,
  createTestFile
} from '../controllers/cpaController.js';

// Admin Controller
import {
  getAllCPAs,
  getCPAById,
  approveCPA,
  updateCPAStatus,
  updateCPAPermissions,
  deleteCPA,
  getCPAStats,
  getSystemStats,
  // ✅ NEW: ZIP Code functions
  updateCPAZipcodes,
  bulkAssignZipcodes,
  getAllZipcodes,
  getZipcodeCoverage
} from '../controllers/cpaAdminController.js';

// Auth Middleware
import { protect, restrictTo } from '../middleware/cpaAuth.js';

const router = express.Router();

// ============================================================
// PUBLIC ROUTES (No auth required)
// ============================================================

// Auth
router.post('/auth/register', register);
router.post('/auth/login', login);
router.post('/auth/forgot-password', forgotPassword);
router.post('/auth/reset-password', resetPassword);

// Test endpoint (for development)
router.post('/test/create-file', createTestFile);

// ============================================================
// PROTECTED ROUTES (Auth required)
// ============================================================

// Auth (protected)
router.get('/auth/verify', protect, verifyToken);
router.post('/auth/logout', protect, logout);
router.get('/auth/profile', protect, getProfile);
router.put('/auth/profile', protect, updateProfile);
router.post('/auth/change-password', protect, changePassword);

// ============================================================
// REVIEW ROUTES
// ============================================================

// Dashboard stats
router.get('/stats', protect, getReviewStats);

// Pending reviews
router.get('/pending', protect, getPendingReviews);

// All files (with filters)
router.get('/files', protect, getAllFiles);

// Single file details
router.get('/files/:fileId', protect, getFileDetails);
router.get('/file/:fileId', protect, getFileDetails);

// Submit review
router.post('/files/:fileId/review', protect, submitReview);
router.post('/review/:fileId', protect, submitReview);

// Bulk approve
router.post('/bulk-approve', protect, bulkApprove);

// User filings
router.get('/users/:userId/filings', protect, getUserFilings);
router.get('/user/:userId', protect, getUserFilings);

// ============================================================
// ADMIN ROUTES
// ============================================================

// CPA Management
router.get('/admin/cpas', protect, restrictTo('admin', 'senior_cpa'), getAllCPAs);
router.get('/admin/cpas/:cpaId', protect, restrictTo('admin', 'senior_cpa'), getCPAById);
router.post('/admin/cpas/:cpaId/approve', protect, restrictTo('admin'), approveCPA);
router.put('/admin/cpas/:cpaId/status', protect, restrictTo('admin'), updateCPAStatus);
router.put('/admin/cpas/:cpaId/permissions', protect, restrictTo('admin'), updateCPAPermissions);
router.delete('/admin/cpas/:cpaId', protect, restrictTo('admin'), deleteCPA);

// ✅ NEW: ZIP Code Management Routes
router.put('/admin/cpas/:cpaId/zipcodes', protect, restrictTo('admin'), updateCPAZipcodes);
router.post('/admin/zipcodes/bulk-assign', protect, restrictTo('admin'), bulkAssignZipcodes);
router.get('/admin/zipcodes', protect, restrictTo('admin', 'senior_cpa'), getAllZipcodes);
router.get('/admin/zipcodes/coverage', protect, restrictTo('admin', 'senior_cpa'), getZipcodeCoverage);

// Stats
router.get('/admin/stats', protect, restrictTo('admin', 'senior_cpa'), getCPAStats);
router.get('/admin/cpa-stats', protect, restrictTo('admin', 'senior_cpa'), getCPAStats);
router.get('/admin/system-stats', protect, restrictTo('admin'), getSystemStats);

// ============================================================
// EXPORT
// ============================================================
export default router;