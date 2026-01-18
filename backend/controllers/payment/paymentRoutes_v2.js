// ============================================================
// PAYMENT ROUTES - Filing Type Based
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
  getAllPayments
} from '../controllers/paymentController.js';

const router = express.Router();

// ============================================================
// PUBLIC ROUTES
// ============================================================

// Get all pricing plans (can include userId for recommendation)
router.get('/pricing', getPricing);

// Stripe webhook (raw body)
router.post('/webhook', express.raw({ type: 'application/json' }), handleWebhook);

// ============================================================
// PROTECTED ROUTES
// ============================================================

// Get recommended plan based on user's tax situation
router.get('/recommend/:userId', getRecommendedPlan);

// Create payment intent
router.post('/create-intent', createPaymentIntent);

// Confirm payment after Stripe success
router.post('/confirm', confirmPayment);

// Get user's payment history
router.get('/user/:userId', getUserPayments);

// Check if user has paid for tax year
router.get('/status/:userId/:taxYear?', checkPaymentStatus);

// ============================================================
// ADMIN ROUTES
// ============================================================

// Get all payments (admin dashboard)
router.get('/admin/all', getAllPayments);

export default router;
