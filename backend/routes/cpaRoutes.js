// ============================================================
// CPA ROUTES - Tax Filing Review System
// ============================================================
// Location: backend/routes/cpaRoutes.js
// 
// Add to your server.js:
// import cpaRoutes from './routes/cpaRoutes.js';
// app.use('/api/cpa', cpaRoutes);
// ============================================================

import express from 'express';
import {
  getPendingReviews,
  getAllFiles,
  getReviewStats,
  submitReview,
  getFileDetails,
  getUserFilings,
  bulkApprove
} from '../controllers/cpaController.js';

const router = express.Router();

// ============================================================
// OPTIONAL: CPA Authentication Middleware
// ============================================================
// Uncomment and customize if you need CPA login protection
/*
const cpaAuth = (req, res, next) => {
  const cpaToken = req.headers['x-cpa-token'];
  const validTokens = process.env.CPA_TOKENS?.split(',') || ['cpa123'];
  
  if (!cpaToken || !validTokens.includes(cpaToken)) {
    return res.status(401).json({ 
      success: false, 
      error: 'Unauthorized. CPA token required.' 
    });
  }
  next();
};

router.use(cpaAuth);
*/

// ============================================================
// DASHBOARD ROUTES
// ============================================================

/**
 * GET /api/cpa/stats
 * Get review statistics
 * Query: ?taxYear=2024
 */
router.get('/stats', getReviewStats);

/**
 * GET /api/cpa/pending
 * Get all pending files for review
 * Query: ?taxYear=2024&limit=50
 */
router.get('/pending', getPendingReviews);

/**
 * GET /api/cpa/files
 * Get all files with filters
 * Query: ?status=approved&taxYear=2024&userId=user_123&page=1&limit=20
 */
router.get('/files', getAllFiles);

// ============================================================
// FILE REVIEW ROUTES
// ============================================================

/**
 * GET /api/cpa/file/:fileId
 * Get single file details with user data
 */
router.get('/file/:fileId', getFileDetails);

/**
 * POST /api/cpa/review/:fileId
 * Submit CPA review for a file
 * Body: { status, reviewedBy, comments, corrections }
 */
router.post('/review/:fileId', submitReview);

/**
 * POST /api/cpa/bulk-approve
 * Approve multiple files at once
 * Body: { fileIds: [...], reviewedBy: "CPA Name" }
 */
router.post('/bulk-approve', bulkApprove);

// ============================================================
// USER DATA ROUTES
// ============================================================

/**
 * GET /api/cpa/user/:userId
 * Get all filings for a specific user
 */
router.get('/user/:userId', getUserFilings);

// ============================================================
// EXPORT
// ============================================================
export default router;
