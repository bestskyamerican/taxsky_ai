// ============================================================
// PAYMENT CONTROLLER - Updated to Match Frontend Pricing
// ============================================================
// Location: backend/controllers/paymentController.js
// Prices match PricingPage.jsx exactly
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
// PRICING PLANS - Matches Frontend PricingPage.jsx
// ============================================================
export const PRICING = {
  free: {
    id: 'free',
    name: 'Free Estimate',
    price: 0, // FREE
    description: 'See your refund before you pay',
    incomeLimit: 'Any',
    formsIncluded: 'Unlimited (estimate only)',
    features: [
      'Unlimited tax estimates',
      'AI-powered calculations',
      'See potential refund',
      'No credit card required'
    ]
  },
  basic: {
    id: 'basic',
    name: 'Basic',
    price: 2999, // $29.99
    description: 'Simple W-2 income only',
    incomeLimit: 'Under $50,000',
    formsIncluded: '1 W-2',
    features: [
      '1 W-2 form',
      'Federal e-file',
      'Download Form 1040',
      'Max refund guarantee',
      'Chat support'
    ]
  },
  standard: {
    id: 'standard',
    name: 'Standard',
    price: 4999, // $49.99
    description: 'Most popular for employees',
    incomeLimit: 'Under $100,000',
    formsIncluded: 'Up to 3 forms',
    features: [
      'Up to 3 forms (W-2, 1099)',
      'Federal e-file',
      'Download Form 1040',
      'Interest & dividends',
      'Max refund guarantee',
      'Priority chat support'
    ]
  },
  plus: {
    id: 'plus',
    name: 'Plus',
    price: 7999, // $79.99
    description: 'Multiple income sources',
    incomeLimit: 'Under $200,000',
    formsIncluded: 'Up to 5 forms',
    features: [
      'Up to 5 forms',
      'Federal e-file',
      'Retirement income (1099-R)',
      'Social Security (SSA-1099)',
      'Capital gains (1099-B)',
      'Rental income',
      'Max refund guarantee',
      'Priority support'
    ]
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    price: 12999, // $129.99
    description: 'High income & complex returns',
    incomeLimit: '$200,000+',
    formsIncluded: 'Unlimited forms',
    features: [
      'Unlimited forms',
      'Federal e-file',
      'All income types',
      'Itemized deductions',
      'Investment income',
      'Rental properties',
      'Max refund guarantee',
      'Priority phone support',
      'Audit protection (1 year)'
    ]
  },
  selfEmployed: {
    id: 'selfEmployed',
    name: 'Self-Employed',
    price: 8999, // $89.99
    description: 'Freelancers & gig workers',
    incomeLimit: 'Any',
    formsIncluded: '1099-NEC + Schedule C',
    features: [
      '1099-NEC processing',
      'Schedule C (business income)',
      'Business expense deductions',
      'Home office deduction',
      'Self-employment tax calc',
      'Quarterly estimate help',
      'Federal e-file',
      'Max refund guarantee'
    ]
  }
};

// ============================================================
// ADD-ON PRICING
// ============================================================
export const ADDONS = {
  state: { id: 'state', name: 'State Tax Return', price: 1999, description: 'File your state taxes' },
  extra_w2: { id: 'extra_w2', name: 'Additional W-2', price: 999, description: 'Per extra W-2 form' },
  '1099_nec': { id: '1099_nec', name: '1099-NEC', price: 1499, description: 'Self-employment income' },
  '1099_int': { id: '1099_int', name: '1099-INT', price: 499, description: 'Interest income' },
  '1099_div': { id: '1099_div', name: '1099-DIV', price: 499, description: 'Dividend income' },
  '1099_r': { id: '1099_r', name: '1099-R', price: 999, description: 'Retirement distribution' },
  '1099_g': { id: '1099_g', name: '1099-G', price: 499, description: 'Unemployment income' },
  '1099_b': { id: '1099_b', name: '1099-B', price: 1499, description: 'Capital gains/stocks' },
  ssa_1099: { id: 'ssa_1099', name: 'SSA-1099', price: 499, description: 'Social Security benefits' },
  schedule_c: { id: 'schedule_c', name: 'Schedule C', price: 2999, description: 'Business income/expenses' },
  schedule_e: { id: 'schedule_e', name: 'Schedule E', price: 2999, description: 'Rental income' },
  cpa_review: { id: 'cpa_review', name: 'CPA Review', price: 4999, description: 'Licensed CPA reviews your return' },
  audit_protection: { id: 'audit_protection', name: 'Audit Protection', price: 3999, description: '3-year audit assistance' },
  priority_support: { id: 'priority_support', name: 'Priority Support', price: 1999, description: 'Phone & chat priority' }
};

// ============================================================
// GET PRICING
// ============================================================
export async function getPricing(req, res) {
  try {
    const plans = Object.values(PRICING).map(plan => ({
      ...plan,
      priceDisplay: plan.price === 0 ? 'FREE' : `$${(plan.price / 100).toFixed(2)}`
    }));
    
    const addons = Object.values(ADDONS).map(addon => ({
      ...addon,
      priceDisplay: `$${(addon.price / 100).toFixed(2)}`
    }));
    
    res.json({ success: true, plans, addons });
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
    
    // Try to get user's tax session to recommend based on their situation
    let session = null;
    try {
      session = await TaxSession.findOne({ userId });
    } catch (e) {
      // TaxSession model might not exist, continue without it
    }
    
    if (!session) {
      return res.json({
        success: true,
        recommendedPlan: 'standard',
        planDetails: PRICING['standard'],
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
    const income = parseInt(answers.total_income) || 0;
    const w2Count = parseInt(answers.w2_count) || 1;
    const has1099 = answers.has_1099 === 'yes';
    
    let recommendedPlan = 'basic';
    
    // Recommendation logic
    if (isSelfEmployed) {
      recommendedPlan = 'selfEmployed';
    } else if (income >= 200000) {
      recommendedPlan = 'premium';
    } else if (income >= 100000 || w2Count > 3 || has1099) {
      recommendedPlan = 'plus';
    } else if (w2Count > 1 || income >= 50000) {
      recommendedPlan = 'standard';
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
        income,
        w2Count,
        has1099
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
    const { userId, email, name, planId, addons = [], taxYear = 2024 } = req.body;
    
    console.log('[PAYMENT] Creating intent:', { userId, email, planId, addons });
    
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
    
    // Free plan - no payment needed
    if (plan.price === 0) {
      const payment = await Payment.create({
        userId,
        email,
        name,
        amount: 0,
        planId,
        planName: plan.name,
        taxYear,
        status: 'completed',
        paidAt: new Date()
      });
      
      return res.json({
        success: true,
        free: true,
        payment
      });
    }
    
    // Check if already paid for this plan
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
    
    // Calculate total amount (plan + addons)
    let totalAmount = plan.price;
    const selectedAddons = [];
    
    if (addons && addons.length > 0) {
      for (const addonId of addons) {
        const addon = ADDONS[addonId];
        if (addon) {
          totalAmount += addon.price;
          selectedAddons.push({ id: addon.id, name: addon.name, price: addon.price });
        }
      }
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
      amount: totalAmount,
      currency: 'usd',
      customer: customer.id,
      metadata: {
        source: 'taxsky',
        website: 'TaxSky AI',
        userId,
        userEmail: email,
        planId,
        planName: plan.name,
        addons: JSON.stringify(selectedAddons.map(a => a.id)),
        taxYear: String(taxYear)
      },
      automatic_payment_methods: {
        enabled: true,
      },
      description: `[TaxSky] ${plan.name} - Tax Year ${taxYear}`
    });
    
    console.log('[PAYMENT] Intent created:', paymentIntent.id, 'Amount:', totalAmount);
    
    // Save pending payment
    const payment = await Payment.create({
      userId,
      email,
      name,
      amount: totalAmount,
      planId,
      planName: plan.name,
      addons: selectedAddons,
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
        amount: totalAmount,
        planName: plan.name,
        addons: selectedAddons,
        priceDisplay: `$${(totalAmount / 100).toFixed(2)}`
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
    
    // Get receipt URL if available
    if (paymentIntent.latest_charge) {
      try {
        const charge = await stripe.charges.retrieve(paymentIntent.latest_charge);
        if (charge.receipt_url) {
          payment.receiptUrl = charge.receipt_url;
          await payment.save();
        }
      } catch (e) {
        console.log('Could not get receipt URL:', e.message);
      }
    }
    
    console.log(`✅ Payment confirmed: ${payment.planName} for ${payment.email} - $${(payment.amount / 100).toFixed(2)}`);
    
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
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  let event;
  
  try {
    if (webhookSecret) {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } else {
      // No webhook secret configured, just parse the body
      event = JSON.parse(req.body);
    }
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  
  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      await Payment.findOneAndUpdate(
        { stripePaymentIntentId: paymentIntent.id },
        { 
          status: 'completed', 
          paidAt: new Date(),
          stripeChargeId: paymentIntent.latest_charge
        }
      );
      console.log(`✅ Webhook: Payment succeeded - ${paymentIntent.id}`);
      break;
      
    case 'payment_intent.payment_failed':
      const failedIntent = event.data.object;
      await Payment.findOneAndUpdate(
        { stripePaymentIntentId: failedIntent.id },
        { status: 'failed' }
      );
      console.log(`❌ Webhook: Payment failed - ${failedIntent.id}`);
      break;
      
    case 'charge.refunded':
      const refund = event.data.object;
      await Payment.findOneAndUpdate(
        { stripeChargeId: refund.id },
        { status: 'refunded', refundedAt: new Date() }
      );
      console.log(`💰 Webhook: Refund processed - ${refund.id}`);
      break;
      
    default:
      console.log(`Webhook: Unhandled event type ${event.type}`);
  }
  
  res.json({ received: true });
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
      payments: payments.map(p => ({
        ...p.toObject(),
        priceDisplay: `$${(p.amount / 100).toFixed(2)}`
      }))
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
          priceDisplay: `$${(payment.amount / 100).toFixed(2)}`,
          paidAt: payment.paidAt,
          addons: payment.addons || []
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
// CHECK USER ACCESS (what features they have access to)
// ============================================================
export async function checkAccess(req, res) {
  try {
    const { userId, taxYear = 2024 } = req.params;
    
    const payments = await Payment.find({ 
      userId, 
      taxYear: parseInt(taxYear),
      status: 'completed' 
    });
    
    // Determine access based on purchased plans
    const purchasedPlanIds = payments.map(p => p.planId);
    const purchasedAddons = payments.flatMap(p => p.addons || []).map(a => a.id);
    
    const access = {
      free: true, // Always have access to free features
      basic: purchasedPlanIds.some(id => ['basic', 'standard', 'plus', 'premium', 'selfEmployed'].includes(id)),
      standard: purchasedPlanIds.some(id => ['standard', 'plus', 'premium'].includes(id)),
      plus: purchasedPlanIds.some(id => ['plus', 'premium'].includes(id)),
      premium: purchasedPlanIds.includes('premium'),
      selfEmployed: purchasedPlanIds.includes('selfEmployed'),
      // Add-on access
      state_filing: purchasedAddons.includes('state') || purchasedPlanIds.some(id => ['standard', 'plus', 'premium'].includes(id)),
      cpa_review: purchasedAddons.includes('cpa_review') || purchasedPlanIds.includes('premium'),
      audit_protection: purchasedAddons.includes('audit_protection') || purchasedPlanIds.includes('premium'),
      canEfile: purchasedPlanIds.some(id => ['basic', 'standard', 'plus', 'premium', 'selfEmployed'].includes(id))
    };
    
    res.json({
      success: true,
      userId,
      taxYear: parseInt(taxYear),
      access,
      purchasedPlans: purchasedPlanIds,
      purchasedAddons,
      payments
    });
    
  } catch (error) {
    console.error('checkAccess error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// ============================================================
// REQUEST REFUND
// ============================================================
export async function requestRefund(req, res) {
  try {
    const { paymentId, reason } = req.body;
    
    const payment = await Payment.findById(paymentId);
    
    if (!payment) {
      return res.status(404).json({ success: false, error: 'Payment not found' });
    }
    
    if (payment.status !== 'completed') {
      return res.status(400).json({ success: false, error: 'Payment cannot be refunded' });
    }
    
    // Check if within refund window (30 days)
    const daysSincePurchase = (Date.now() - payment.paidAt) / (1000 * 60 * 60 * 24);
    if (daysSincePurchase > 30) {
      return res.status(400).json({ 
        success: false, 
        error: 'Refund window has expired (30 days)' 
      });
    }
    
    // Process refund with Stripe
    const refund = await stripe.refunds.create({
      payment_intent: payment.stripePaymentIntentId,
      reason: 'requested_by_customer'
    });
    
    // Update payment record
    payment.status = 'refunded';
    payment.refundedAt = new Date();
    payment.metadata = payment.metadata || {};
    payment.metadata.refundReason = reason;
    payment.metadata.stripeRefundId = refund.id;
    await payment.save();
    
    console.log(`💰 Refund processed: ${payment.planName} for ${payment.email}`);
    
    res.json({
      success: true,
      message: 'Refund processed successfully',
      refundId: refund.id
    });
    
  } catch (error) {
    console.error('Refund Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// ============================================================
// ADMIN: GET ALL PAYMENTS
// ============================================================
export async function getAllPayments(req, res) {
  try {
    const { status, startDate, endDate, limit = 100 } = req.query;
    
    const query = {};
    if (status) query.status = status;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    
    const payments = await Payment.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));
    
    // Calculate totals
    const completedPayments = payments.filter(p => p.status === 'completed');
    const totalRevenue = completedPayments.reduce((sum, p) => sum + p.amount, 0);
    
    res.json({
      success: true,
      count: payments.length,
      completedCount: completedPayments.length,
      totalRevenue: totalRevenue / 100, // Convert cents to dollars
      totalRevenueDisplay: `$${(totalRevenue / 100).toFixed(2)}`,
      payments: payments.map(p => ({
        ...p.toObject(),
        priceDisplay: `$${(p.amount / 100).toFixed(2)}`
      }))
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
  checkAccess,
  requestRefund,
  getAllPayments,
  PRICING,
  ADDONS
};