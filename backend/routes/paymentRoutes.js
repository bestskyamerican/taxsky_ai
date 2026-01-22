// ============================================================
// PAYMENT ROUTES - Updated to Match Frontend
// ============================================================
// Location: backend/routes/paymentRoutes.js
// ============================================================

import express from 'express';
import {
  getPricing,
  getRecommendedPlan,
  createPaymentIntent,
  confirmPayment,
  handleWebhook,
  getUserPayments,
  checkPaymentStatus,
  checkAccess,
  requestRefund,
  getAllPayments
} from '../controllers/paymentController.js';

const router = express.Router();

// ============================================================
// PUBLIC ROUTES
// ============================================================

// Get all pricing plans and addons
router.get('/pricing', getPricing);

// Stripe webhook (must use raw body - handled in server.js)
router.post('/webhook', handleWebhook);

// ============================================================
// PROTECTED ROUTES (require auth)
// ============================================================

// Get recommended plan based on user's tax situation
router.get('/recommend/:userId', getRecommendedPlan);

// Create payment intent (start checkout)
router.post('/create-intent', createPaymentIntent);

// Confirm payment after Stripe success
router.post('/confirm', confirmPayment);

// Get user's payment history
router.get('/user/:userId', getUserPayments);

// Check if user has paid for current tax year
router.get('/status/:userId/:taxYear?', checkPaymentStatus);

// Check user's feature access level
router.get('/access/:userId/:taxYear?', checkAccess);

// Request refund
router.post('/refund', requestRefund);

// ============================================================
// ADMIN ROUTES
// ============================================================

// Get all payments (admin dashboard)
router.get('/admin/all', getAllPayments);

export default router;