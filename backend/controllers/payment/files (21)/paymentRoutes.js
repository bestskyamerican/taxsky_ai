// ============================================================
// PAYMENT ROUTES
// ============================================================
// Location: backend/routes/paymentRoutes.js
// ============================================================

import express from 'express';
import {
  getPricing,
  createPaymentIntent,
  confirmPayment,
  handleWebhook,
  getUserPayments,
  checkAccess,
  requestRefund,
  getAllPayments
} from '../controllers/paymentController.js';

const router = express.Router();

// ============================================================
// PUBLIC ROUTES
// ============================================================

// Get pricing plans
router.get('/pricing', getPricing);

// Stripe webhook (must use raw body)
router.post('/webhook', express.raw({ type: 'application/json' }), handleWebhook);

// ============================================================
// PROTECTED ROUTES (require auth)
// ============================================================

// Create payment intent
router.post('/create-intent', createPaymentIntent);

// Confirm payment
router.post('/confirm', confirmPayment);

// Get user's payments
router.get('/user/:userId', getUserPayments);

// Check user's access level
router.get('/access/:userId/:taxYear?', checkAccess);

// Request refund
router.post('/refund', requestRefund);

// ============================================================
// ADMIN ROUTES
// ============================================================

// Get all payments (admin)
router.get('/admin/all', getAllPayments);

export default router;
