// ============================================================
// PAYMENT CONTROLLER - Fixed Version
// ============================================================
// Location: backend/controllers/paymentController.js
// ============================================================

import dotenv from 'dotenv';
dotenv.config();

import Stripe from 'stripe';
import Payment from '../models/Payment.js';
import TaxSession from '../models/TaxSession.js';

// Initialize Stripe
if (!process.env.STRIPE_SECRET_KEY) {
  console.error('❌ STRIPE_SECRET_KEY is missing in .env file!');
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder');

// ============================================================
// PRICING PLANS
// ============================================================
export const PRICING = {
  single_simple: {
    id: 'single_simple',
    name: 'Single Filing',
    filingStatus: 'single',
    price: 1999
  },
  single_plus: {
    id: 'single_plus',
    name: 'Single Filing Plus',
    filingStatus: 'single',
    price: 2999
  },
  married_simple: {
    id: 'married_simple',
    name: 'Married Filing',
    filingStatus: 'married_filing_jointly',
    price: 2999
  },
  family: {
    id: 'family',
    name: 'Family Filing',
    filingStatus: 'married_filing_jointly',
    price: 3999
  },
  head_of_household: {
    id: 'head_of_household',
    name: 'Head of Household',
    filingStatus: 'head_of_household',
    price: 3499
  },
  self_employed: {
    id: 'self_employed',
    name: 'Self-Employed',
    filingStatus: 'any',
    price: 4999
  },
  self_employed_family: {
    id: 'self_employed_family',
    name: 'Self-Employed Family',
    filingStatus: 'any',
    price: 5999
  },
  premium: {
    id: 'premium',
    name: 'Premium + CPA Review',
    filingStatus: 'any',
    price: 7999
  }
};

// ============================================================
// GET PRICING
// ============================================================
export async function getPricing(req, res) {
  try {
    const plans = Object.values(PRICING).map(plan => ({
      ...plan,
      priceDisplay: `$${(plan.price / 100).toFixed(2)}`
    }));
    
    res.json({ success: true, plans });
  } catch (error) {
    console.error('getPricing error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// ============================================================
// GET RECOMMENDED PLAN
// ============================================================
export async function getRecommendedPlan(req, res) {
  try {
    const { userId } = req.params;
    
    const session = await TaxSession.findOne({ userId });
    if (!session) {
      return res.json({
        success: true,
        recommendedPlan: 'single_simple',
        planDetails: PRICING['single_simple'],
        userSituation: null
      });
    }
    
    const answers = session.answers instanceof Map 
      ? Object.fromEntries(session.answers) 
      : session.answers || {};
    
    const filingStatus = answers.filing_status || 'single';
    const hasDependents = answers.has_dependents === 'yes';
    const hasSpouse = filingStatus.includes('married');
    const isSelfEmployed = answers.is_self_employed === 'yes';
    
    let recommendedPlan = 'single_simple';
    
    if (isSelfEmployed && (hasDependents || hasSpouse)) {
      recommendedPlan = 'self_employed_family';
    } else if (isSelfEmployed) {
      recommendedPlan = 'self_employed';
    } else if (filingStatus === 'head_of_household') {
      recommendedPlan = 'head_of_household';
    } else if (hasSpouse && hasDependents) {
      recommendedPlan = 'family';
    } else if (hasSpouse) {
      recommendedPlan = 'married_simple';
    }
    
    res.json({
      success: true,
      recommendedPlan,
      planDetails: PRICING[recommendedPlan],
      userSituation: {
        filingStatus,
        hasDependents,
        hasSpouse,
        isSelfEmployed,
        dependentCount: parseInt(answers.dependent_count) || 0,
        w2Count: 0,
        has1099: false
      }
    });
    
  } catch (error) {
    console.error('getRecommendedPlan error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// ============================================================
// CREATE PAYMENT INTENT
// ============================================================
export async function createPaymentIntent(req, res) {
  try {
    const { userId, email, name, planId, taxYear = 2024 } = req.body;
    
    console.log('[PAYMENT] Creating intent:', { userId, email, planId });
    
    // Validate input
    if (!userId || !email || !planId) {
      return res.status(400).json({ 
        success: false, 
        error: 'userId, email, and planId are required' 
      });
    }
    
    // Get plan
    const plan = PRICING[planId];
    if (!plan) {
      return res.status(400).json({ 
        success: false, 
        error: `Invalid plan: ${planId}` 
      });
    }
    
    // Check if already paid
    const existingPayment = await Payment.findOne({
      userId,
      planId,
      taxYear,
      status: 'completed'
    });
    
    if (existingPayment) {
      return res.json({
        success: true,
        alreadyPaid: true,
        payment: existingPayment
      });
    }
    
    // Create or get Stripe customer
    let customer;
    const existingCustomers = await stripe.customers.list({ email, limit: 1 });
    
    if (existingCustomers.data.length > 0) {
      customer = existingCustomers.data[0];
    } else {
      customer = await stripe.customers.create({
        email,
        name,
        metadata: { 
          userId,
          source: 'taxsky'
        },
        description: `TaxSky Customer - ${name}`
      });
    }
    
    // Create Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: plan.price,
      currency: 'usd',
      customer: customer.id,
      metadata: {
        source: 'taxsky',
        website: 'TaxSky AI',
        userId,
        userEmail: email,
        planId,
        planName: plan.name,
        taxYear: String(taxYear)
      },
      automatic_payment_methods: {
        enabled: true,
      },
      description: `[TaxSky] ${plan.name} - Tax Year ${taxYear}`
    });
    
    console.log('[PAYMENT] Intent created:', paymentIntent.id);
    
    // Save pending payment
    const payment = await Payment.create({
      userId,
      email,
      name,
      amount: plan.price,
      planId,
      planName: plan.name,
      filingType: plan.filingStatus,
      taxYear,
      stripePaymentIntentId: paymentIntent.id,
      stripeCustomerId: customer.id,
      status: 'pending'
    });
    
    res.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      payment: {
        id: payment._id,
        amount: plan.price,
        planName: plan.name,
        priceDisplay: `$${(plan.price / 100).toFixed(2)}`
      }
    });
    
  } catch (error) {
    console.error('[PAYMENT] Error creating intent:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// ============================================================
// CONFIRM PAYMENT
// ============================================================
export async function confirmPayment(req, res) {
  try {
    const { paymentIntentId } = req.body;
    
    if (!paymentIntentId) {
      return res.status(400).json({ success: false, error: 'paymentIntentId required' });
    }
    
    // Verify with Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({
        success: false,
        error: `Payment not successful. Status: ${paymentIntent.status}`
      });
    }
    
    // Update payment in database
    const payment = await Payment.findOneAndUpdate(
      { stripePaymentIntentId: paymentIntentId },
      {
        status: 'completed',
        paidAt: new Date(),
        stripeChargeId: paymentIntent.latest_charge
      },
      { new: true }
    );
    
    if (!payment) {
      return res.status(404).json({ success: false, error: 'Payment record not found' });
    }
    
    console.log(`✅ Payment confirmed: ${payment.planName} for ${payment.userId}`);
    
    res.json({
      success: true,
      message: 'Payment confirmed!',
      payment
    });
    
  } catch (error) {
    console.error('confirmPayment error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// ============================================================
// STRIPE WEBHOOK
// ============================================================
export async function handleWebhook(req, res) {
  try {
    // For now, just acknowledge
    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).json({ error: error.message });
  }
}

// ============================================================
// GET USER'S PAYMENTS
// ============================================================
export async function getUserPayments(req, res) {
  try {
    const { userId } = req.params;
    const payments = await Payment.find({ userId }).sort({ createdAt: -1 });
    
    res.json({
      success: true,
      count: payments.length,
      payments
    });
    
  } catch (error) {
    console.error('getUserPayments error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// ============================================================
// CHECK PAYMENT STATUS
// ============================================================
export async function checkPaymentStatus(req, res) {
  try {
    const { userId, taxYear = 2024 } = req.params;
    
    const payment = await Payment.findOne({ 
      userId, 
      taxYear: parseInt(taxYear),
      status: 'completed' 
    });
    
    if (payment) {
      res.json({
        success: true,
        hasPaid: true,
        payment: {
          planId: payment.planId,
          planName: payment.planName,
          amount: payment.amount,
          paidAt: payment.paidAt
        }
      });
    } else {
      res.json({
        success: true,
        hasPaid: false
      });
    }
    
  } catch (error) {
    console.error('checkPaymentStatus error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// ============================================================
// ADMIN: GET ALL PAYMENTS
// ============================================================
export async function getAllPayments(req, res) {
  try {
    const payments = await Payment.find({})
      .sort({ createdAt: -1 })
      .limit(100);
    
    const completedPayments = payments.filter(p => p.status === 'completed');
    const totalRevenue = completedPayments.reduce((sum, p) => sum + p.amount, 0);
    
    res.json({
      success: true,
      count: payments.length,
      totalRevenue: totalRevenue / 100,
      payments
    });
    
  } catch (error) {
    console.error('getAllPayments error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

export default {
  getPricing,
  getRecommendedPlan,
  createPaymentIntent,
  confirmPayment,
  handleWebhook,
  getUserPayments,
  checkPaymentStatus,
  getAllPayments,
  PRICING
};