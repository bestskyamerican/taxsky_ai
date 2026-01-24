// ============================================================
// PAYMENT CONTROLLER - v2.0 CPA PRICING MODEL
// ============================================================
// Location: backend/controllers/paymentController.js
//
// PRICING LOGIC:
// - WITHOUT CPA = $0 (FREE self-file, download PDF, mail yourself)
// - WITH CPA = Plan Price + ($59 × number of forms)
// ============================================================

import dotenv from 'dotenv';
dotenv.config();

import Stripe from 'stripe';
import Payment from '../models/Payment.js';
import TaxSession from '../models/TaxSession.js';

// ============================================================
// STRIPE INITIALIZATION - WITH VALIDATION
// ============================================================
let stripe = null;
const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;

if (!STRIPE_KEY) {
  console.error('❌ STRIPE_SECRET_KEY is missing in .env file!');
  console.error('   Payments will NOT work until you add it.');
} else if (!STRIPE_KEY.startsWith('sk_')) {
  console.error('❌ STRIPE_SECRET_KEY appears invalid (should start with sk_)');
} else {
  stripe = new Stripe(STRIPE_KEY);
  console.log('✅ Stripe initialized successfully');
}

// ============================================================
// CPA FEE - $59 per form
// ============================================================
export const CPA_FEE_PER_FORM = 5900; // $59.00 in cents

// ============================================================
// PRICING PLANS - Base prices (only charged if CPA selected)
// ============================================================
export const PRICING = {
  free: {
    id: 'free',
    name: 'Free Estimate',
    price: 0,
    originalPrice: 0,
    description: 'View estimate only',
    formsIncluded: 0,
  },
  basic: {
    id: 'basic',
    name: 'Basic',
    price: 2999, // $29.99 - only charged if CPA
    originalPrice: 2999,
    description: 'Simple W-2 income only',
    formsIncluded: 1,
  },
  standard: {
    id: 'standard',
    name: 'Standard',
    price: 4999, // $49.99 - only charged if CPA
    originalPrice: 4999,
    description: 'Most popular for employees',
    formsIncluded: 3,
  },
  plus: {
    id: 'plus',
    name: 'Plus',
    price: 7999, // $79.99 - only charged if CPA
    originalPrice: 7999,
    description: 'Multiple income sources',
    formsIncluded: 5,
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    price: 12999, // $129.99 - only charged if CPA
    originalPrice: 12999,
    description: 'High income & complex returns',
    formsIncluded: 10,
  },
  selfEmployed: {
    id: 'selfEmployed',
    name: 'Self-Employed',
    price: 8999, // $89.99 - only charged if CPA
    originalPrice: 8999,
    description: 'Freelancers & gig workers',
    formsIncluded: 3,
  }
};

// ============================================================
// ADD-ON PRICING (State return counts as additional form for CPA)
// ============================================================
export const ADDONS = {
  state: { id: 'state', name: 'State Tax Return', price: 0, cpaPrice: 5900, description: 'File your state taxes', isForm: true },
  extra_w2: { id: 'extra_w2', name: 'Additional W-2', price: 0, cpaPrice: 0, description: 'Per extra W-2 form', isForm: false },
  '1099_nec': { id: '1099_nec', name: '1099-NEC', price: 0, cpaPrice: 0, description: 'Self-employment income', isForm: false },
  '1099_int': { id: '1099_int', name: '1099-INT', price: 0, cpaPrice: 0, description: 'Interest income', isForm: false },
  '1099_div': { id: '1099_div', name: '1099-DIV', price: 0, cpaPrice: 0, description: 'Dividend income', isForm: false },
  '1099_r': { id: '1099_r', name: '1099-R', price: 0, cpaPrice: 0, description: 'Retirement distribution', isForm: false },
  '1099_g': { id: '1099_g', name: '1099-G', price: 0, cpaPrice: 0, description: 'Unemployment income', isForm: false },
  '1099_b': { id: '1099_b', name: '1099-B', price: 0, cpaPrice: 0, description: 'Capital gains/stocks', isForm: false },
  ssa_1099: { id: 'ssa_1099', name: 'SSA-1099', price: 0, cpaPrice: 0, description: 'Social Security benefits', isForm: false },
  schedule_c: { id: 'schedule_c', name: 'Schedule C', price: 0, cpaPrice: 0, description: 'Business income/expenses', isForm: false },
  schedule_e: { id: 'schedule_e', name: 'Schedule E', price: 0, cpaPrice: 0, description: 'Rental income', isForm: false },
  cpa_review: { id: 'cpa_review', name: 'CPA Review', price: 0, cpaPrice: 0, description: 'CPA reviews and signs your return', isForm: false, isCPA: true },
  audit_protection: { id: 'audit_protection', name: 'Audit Protection', price: 0, cpaPrice: 3999, description: '3-year audit assistance', isForm: false },
  priority_support: { id: 'priority_support', name: 'Priority Support', price: 0, cpaPrice: 1999, description: 'Phone & chat priority', isForm: false }
};

// ============================================================
// CALCULATE TOTAL PRICE
// ============================================================
export function calculateTotal(planId, addons = [], includeCPA = false, numberOfForms = 1) {
  const plan = PRICING[planId];
  if (!plan) return { total: 0, breakdown: {} };

  // If no CPA, everything is FREE
  if (!includeCPA) {
    return {
      total: 0,
      breakdown: {
        planPrice: 0,
        planOriginalPrice: plan.originalPrice,
        cpaFee: 0,
        addonsTotal: 0,
        discount: plan.originalPrice, // Show how much they save
      },
      isFree: true,
      message: 'Free self-file - Download PDF and mail to IRS'
    };
  }

  // WITH CPA: Plan Price + (CPA Fee × Number of Forms)
  let total = plan.price;
  let cpaFee = CPA_FEE_PER_FORM * numberOfForms;
  let addonsTotal = 0;

  // Add addon prices (if any have CPA pricing)
  addons.forEach(addonId => {
    const addon = ADDONS[addonId];
    if (addon) {
      // State return adds another form for CPA fee
      if (addon.isForm) {
        cpaFee += CPA_FEE_PER_FORM;
      }
      // Other addons might have their own CPA-only prices
      if (addon.cpaPrice) {
        addonsTotal += addon.cpaPrice;
      }
    }
  });

  total = plan.price + cpaFee + addonsTotal;

  return {
    total,
    breakdown: {
      planPrice: plan.price,
      planOriginalPrice: plan.originalPrice,
      cpaFee,
      cpaFeePerForm: CPA_FEE_PER_FORM,
      numberOfForms,
      addonsTotal,
      discount: 0,
    },
    isFree: false,
    message: `CPA Review: Plan ($${(plan.price/100).toFixed(2)}) + CPA Fee ($${(cpaFee/100).toFixed(2)})`
  };
}

// ============================================================
// GET PRICING
// ============================================================
export async function getPricing(req, res) {
  try {
    const plans = Object.values(PRICING).map(plan => ({
      ...plan,
      priceDisplay: '$0.00', // All plans are FREE without CPA
      originalPriceDisplay: plan.originalPrice === 0 ? 'FREE' : `$${(plan.originalPrice / 100).toFixed(2)}`,
      withCPAPrice: plan.price + CPA_FEE_PER_FORM, // Price if CPA is selected (1 form)
      withCPAPriceDisplay: plan.price === 0 ? 'FREE' : `$${((plan.price + CPA_FEE_PER_FORM) / 100).toFixed(2)}`,
    }));

    const addons = Object.values(ADDONS).map(addon => ({
      ...addon,
      priceDisplay: '$0.00', // Free without CPA
      cpaPriceDisplay: addon.cpaPrice ? `$${(addon.cpaPrice / 100).toFixed(2)}` : '$0.00',
    }));

    res.json({ 
      success: true, 
      plans, 
      addons,
      cpaFeePerForm: CPA_FEE_PER_FORM,
      cpaFeePerFormDisplay: `$${(CPA_FEE_PER_FORM / 100).toFixed(2)}`,
      pricingModel: {
        withoutCPA: 'FREE - Download PDF, print & mail to IRS yourself',
        withCPA: 'Plan Price + $59 per form (Federal = 1 form, State = 1 form)'
      }
    });
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

    let session = null;
    try {
      session = await TaxSession.findOne({ userId });
    } catch (e) {
      // TaxSession model might not exist
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

    const isSelfEmployed = answers.is_self_employed === 'yes';
    const income = parseInt(answers.total_income) || 0;
    const w2Count = parseInt(answers.w2_count) || 1;
    const has1099 = answers.has_1099 === 'yes';

    let recommendedPlan = 'basic';

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
      planDetails: PRICING[recommendedPlan]
    });

  } catch (error) {
    console.error('getRecommendedPlan error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// ============================================================
// CREATE PAYMENT INTENT - WITH CPA PRICING LOGIC
// ============================================================
export async function createPaymentIntent(req, res) {
  try {
    const { 
      userId, 
      email, 
      name, 
      planId, 
      addons = [], 
      taxYear = 2025,
      includeCPA = false,
      includeState = false,
      numberOfForms = 1  // Federal = 1, Federal + State = 2
    } = req.body;

    console.log('[PAYMENT] Creating intent:', { userId, email, planId, addons, includeCPA, numberOfForms });

    // ✅ CHECK 1: Stripe initialized?
    if (!stripe) {
      console.error('[PAYMENT] Stripe not initialized!');
      return res.status(500).json({
        success: false,
        error: 'Payment system not configured. Please contact support.'
      });
    }

    // ✅ CHECK 2: Required fields
    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId is required' });
    }
    if (!email) {
      return res.status(400).json({ success: false, error: 'email is required' });
    }
    if (!planId) {
      return res.status(400).json({ success: false, error: 'planId is required' });
    }

    // ✅ CHECK 3: Valid plan
    const plan = PRICING[planId];
    if (!plan) {
      return res.status(400).json({
        success: false,
        error: `Invalid plan: ${planId}. Valid plans: ${Object.keys(PRICING).join(', ')}`
      });
    }

    // Calculate number of forms
    let formCount = numberOfForms || 1; // At least Federal
    if (includeState || addons.includes('state')) {
      formCount = 2; // Federal + State
    }

    // ✅ Calculate total based on CPA selection
    const priceCalc = calculateTotal(planId, addons, includeCPA, formCount);

    console.log('[PAYMENT] Price calculation:', priceCalc);

    // ✅ FREE PLAN (No CPA) - No payment needed
    if (priceCalc.isFree || priceCalc.total === 0) {
      console.log('[PAYMENT] Free self-file selected, no payment needed');
      try {
        const payment = await Payment.create({
          userId,
          email,
          name: name || 'User',
          amount: 0,
          planId,
          planName: plan.name,
          taxYear,
          status: 'completed',
          paidAt: new Date(),
          includeCPA: false,
          numberOfForms: formCount,
          priceBreakdown: priceCalc.breakdown
        });

        return res.json({
          success: true,
          free: true,
          payment,
          message: 'Free self-file activated! You can download your PDF and mail to IRS.'
        });
      } catch (dbError) {
        console.error('[PAYMENT] Database error (free plan):', dbError);
        return res.status(500).json({
          success: false,
          error: 'Database error: ' + dbError.message
        });
      }
    }

    // ✅ CHECK 4: Already paid?
    try {
      const existingPayment = await Payment.findOne({
        userId,
        planId,
        taxYear,
        includeCPA: true,
        status: 'completed'
      });

      if (existingPayment) {
        console.log('[PAYMENT] User already paid for CPA review');
        return res.json({
          success: true,
          alreadyPaid: true,
          payment: existingPayment
        });
      }
    } catch (dbError) {
      console.log('[PAYMENT] Could not check existing payment:', dbError.message);
    }

    // ✅ CREATE STRIPE PAYMENT INTENT
    console.log(`[PAYMENT] Creating Stripe intent for $${(priceCalc.total / 100).toFixed(2)}`);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: priceCalc.total,
      currency: 'usd',
      metadata: {
        userId,
        email,
        planId,
        planName: plan.name,
        taxYear: String(taxYear),
        includeCPA: 'true',
        numberOfForms: String(formCount),
        addons: addons.join(',')
      },
      receipt_email: email,
      description: `TaxSky ${plan.name} + CPA Review (${formCount} form${formCount > 1 ? 's' : ''})`
    });

    // Save pending payment to database
    try {
      await Payment.create({
        userId,
        email,
        name: name || 'User',
        amount: priceCalc.total,
        planId,
        planName: plan.name,
        taxYear,
        status: 'pending',
        stripePaymentIntentId: paymentIntent.id,
        includeCPA: true,
        numberOfForms: formCount,
        addons,
        priceBreakdown: priceCalc.breakdown
      });
    } catch (dbError) {
      console.error('[PAYMENT] Could not save payment record:', dbError.message);
    }

    console.log(`✅ Payment intent created: ${paymentIntent.id}`);

    res.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: priceCalc.total,
      amountDisplay: `$${(priceCalc.total / 100).toFixed(2)}`,
      breakdown: priceCalc.breakdown
    });

  } catch (error) {
    console.error('[PAYMENT] createPaymentIntent error:', error);

    if (error.type === 'StripeCardError') {
      return res.status(400).json({ success: false, error: error.message });
    }
    if (error.type === 'StripeInvalidRequestError') {
      return res.status(400).json({ success: false, error: 'Invalid payment request: ' + error.message });
    }

    res.status(500).json({ success: false, error: error.message });
  }
}

// ============================================================
// CONFIRM PAYMENT
// ============================================================
export async function confirmPayment(req, res) {
  try {
    const { paymentIntentId } = req.body;

    if (!stripe) {
      return res.status(500).json({ success: false, error: 'Payment system not configured' });
    }

    if (!paymentIntentId) {
      return res.status(400).json({ success: false, error: 'paymentIntentId is required' });
    }

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

    console.log(`✅ Payment confirmed: ${payment.planName} + CPA for ${payment.email}`);

    res.json({
      success: true,
      message: 'Payment confirmed! CPA will review your return.',
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
  if (!stripe) {
    return res.status(500).json({ error: 'Stripe not configured' });
  }

  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    if (webhookSecret && sig) {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } else {
      event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    }
  } catch (err) {
    console.error('Webhook error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      await Payment.findOneAndUpdate(
        { stripePaymentIntentId: paymentIntent.id },
        { status: 'completed', paidAt: new Date(), stripeChargeId: paymentIntent.latest_charge }
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
    const { userId, taxYear = 2025 } = req.params;

    const payment = await Payment.findOne({
      userId,
      taxYear: parseInt(taxYear),
      status: 'completed'
    });

    res.json({
      success: true,
      hasPaid: !!payment,
      hasCPA: payment?.includeCPA || false,
      payment: payment || null
    });

  } catch (error) {
    console.error('checkPaymentStatus error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// ============================================================
// CHECK USER ACCESS
// ============================================================
export async function checkAccess(req, res) {
  try {
    const { userId, taxYear = 2025 } = req.params;

    const payments = await Payment.find({
      userId,
      taxYear: parseInt(taxYear),
      status: 'completed'
    });

    const hasCPA = payments.some(p => p.includeCPA);
    const purchasedPlanIds = payments.map(p => p.planId);

    const access = {
      canDownloadPDF: true, // Always free
      canSelfFile: true, // Always free
      hasCPAReview: hasCPA,
      canEfile: hasCPA, // Only with CPA
      plans: purchasedPlanIds
    };

    res.json({
      success: true,
      access,
      purchasedPlans: purchasedPlanIds,
      hasCPA
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

    if (!stripe) {
      return res.status(500).json({ success: false, error: 'Payment system not configured' });
    }

    const payment = await Payment.findById(paymentId);

    if (!payment) {
      return res.status(404).json({ success: false, error: 'Payment not found' });
    }

    if (payment.status !== 'completed') {
      return res.status(400).json({ success: false, error: 'Payment cannot be refunded' });
    }

    const daysSincePurchase = (Date.now() - payment.paidAt) / (1000 * 60 * 60 * 24);
    if (daysSincePurchase > 30) {
      return res.status(400).json({ success: false, error: 'Refund window expired (30 days)' });
    }

    const refund = await stripe.refunds.create({
      payment_intent: payment.stripePaymentIntentId,
      reason: 'requested_by_customer'
    });

    payment.status = 'refunded';
    payment.refundedAt = new Date();
    await payment.save();

    res.json({ success: true, message: 'Refund processed', refundId: refund.id });

  } catch (error) {
    console.error('Refund error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// ============================================================
// ADMIN: GET ALL PAYMENTS
// ============================================================
export async function getAllPayments(req, res) {
  try {
    const { status, limit = 100 } = req.query;

    const query = {};
    if (status) query.status = status;

    const payments = await Payment.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

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
  checkAccess,
  requestRefund,
  getAllPayments,
  calculateTotal,
  PRICING,
  ADDONS,
  CPA_FEE_PER_FORM
};