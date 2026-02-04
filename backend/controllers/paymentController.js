// ============================================================
// PAYMENT CONTROLLER - Filing Type Based Pricing
// ============================================================
// Location: backend/controllers/paymentController.js
// ============================================================

import Stripe from 'stripe';
import Payment from '../models/Payment.js';
import TaxSession from '../models/TaxSession.js';

// Lazy-init Stripe (don't crash if key missing)
let stripe = null;
function getStripe() {
  if (!stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY not set in .env — add it to enable payments');
    }
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return stripe;
}

// ============================================================
// FILING TYPE PRICING
// ============================================================
export const PRICING = {
  // Single filer, no dependents
  single_simple: {
    id: 'single_simple',
    name: 'Single Filing',
    filingStatus: 'single',
    price: 1999, // $19.99
    description: 'Single filer, W-2 income only',
    includes: ['Federal return', 'State return', '1 W-2'],
    requirements: {
      filing_status: 'single',
      has_dependents: 'no',
      max_w2: 1,
      has_1099: false
    }
  },
  
  // Single with multiple income sources
  single_plus: {
    id: 'single_plus',
    name: 'Single Filing Plus',
    filingStatus: 'single',
    price: 2999, // $29.99
    description: 'Single filer with multiple income',
    includes: ['Federal return', 'State return', 'Multiple W-2s', '1099 income'],
    requirements: {
      filing_status: 'single',
      has_dependents: 'no',
      max_w2: 999,
      has_1099: true
    }
  },
  
  // Married Filing Jointly - no kids
  married_simple: {
    id: 'married_simple',
    name: 'Married Filing',
    filingStatus: 'married_filing_jointly',
    price: 2999, // $29.99
    description: 'Married couple, no dependents',
    includes: ['Federal return', 'State return', 'Both spouses W-2s'],
    requirements: {
      filing_status: ['married_filing_jointly', 'married_filing_separately'],
      has_dependents: 'no'
    }
  },
  
  // Family - Married with kids
  family: {
    id: 'family',
    name: 'Family Filing',
    filingStatus: 'married_filing_jointly',
    price: 3999, // $39.99
    description: 'Married with dependents',
    includes: ['Federal return', 'State return', 'All W-2s', 'Child Tax Credit', 'EITC'],
    requirements: {
      filing_status: ['married_filing_jointly', 'married_filing_separately'],
      has_dependents: 'yes'
    }
  },
  
  // Head of Household
  head_of_household: {
    id: 'head_of_household',
    name: 'Head of Household',
    filingStatus: 'head_of_household',
    price: 3499, // $34.99
    description: 'Single parent with dependents',
    includes: ['Federal return', 'State return', 'Child Tax Credit', 'EITC'],
    requirements: {
      filing_status: 'head_of_household',
      has_dependents: 'yes'
    }
  },
  
  // Self-employed
  self_employed: {
    id: 'self_employed',
    name: 'Self-Employed',
    filingStatus: 'any',
    price: 4999, // $49.99
    description: '1099 contractor or business owner',
    includes: ['Federal return', 'State return', 'Schedule C', 'Self-employment tax', 'Business expenses'],
    requirements: {
      has_1099_nec: true,
      is_self_employed: true
    }
  },
  
  // Self-employed Family
  self_employed_family: {
    id: 'self_employed_family',
    name: 'Self-Employed Family',
    filingStatus: 'any',
    price: 5999, // $59.99
    description: 'Self-employed with family',
    includes: ['Everything in Self-Employed', 'Spouse income', 'Child Tax Credit', 'EITC'],
    requirements: {
      has_1099_nec: true,
      is_self_employed: true,
      has_dependents: 'yes'
    }
  },
  
  // Premium - CPA Review
  premium: {
    id: 'premium',
    name: 'Premium + CPA Review',
    filingStatus: 'any',
    price: 7999, // $79.99
    description: 'Any filing + professional CPA review',
    includes: ['Any filing type', 'CPA reviews your return', 'Audit protection', 'Priority support'],
    requirements: {}
  }
};

// ============================================================
// DETECT USER'S REQUIRED PLAN
// ============================================================
export async function detectRequiredPlan(userId) {
  try {
    const session = await TaxSession.findOne({ userId });
    if (!session) return null;
    
    const answers = session.answers instanceof Map 
      ? Object.fromEntries(session.answers) 
      : session.answers || {};
    
    const forms = session.forms || {};
    
    // Get user data
    const filingStatus = answers.filing_status || 'single';
    const hasDependents = answers.has_dependents === 'yes' || (parseInt(answers.dependent_count) || 0) > 0;
    const w2Count = (forms['W-2']?.length || 0) + (parseInt(answers.w2_count) || 0);
    const has1099NEC = (forms['1099-NEC']?.length || 0) > 0 || answers.has_1099_income === 'yes';
    const isSelfEmployed = answers.is_self_employed === 'yes' || has1099NEC;
    const hasSpouse = filingStatus.includes('married') || answers.spouse_first_name;
    
    console.log('[PAYMENT] User data:', {
      filingStatus, hasDependents, w2Count, has1099NEC, isSelfEmployed, hasSpouse
    });
    
    // Determine plan based on user's situation
    let recommendedPlan = 'single_simple';
    
    // Self-employed with family
    if (isSelfEmployed && (hasDependents || hasSpouse)) {
      recommendedPlan = 'self_employed_family';
    }
    // Self-employed single
    else if (isSelfEmployed) {
      recommendedPlan = 'self_employed';
    }
    // Head of Household
    else if (filingStatus === 'head_of_household') {
      recommendedPlan = 'head_of_household';
    }
    // Married with dependents (Family)
    else if (hasSpouse && hasDependents) {
      recommendedPlan = 'family';
    }
    // Married without dependents
    else if (hasSpouse) {
      recommendedPlan = 'married_simple';
    }
    // Single with multiple income
    else if (w2Count > 1 || has1099NEC) {
      recommendedPlan = 'single_plus';
    }
    // Simple single
    else {
      recommendedPlan = 'single_simple';
    }
    
    return {
      recommendedPlan,
      planDetails: PRICING[recommendedPlan],
      userSituation: {
        filingStatus,
        hasDependents,
        dependentCount: parseInt(answers.dependent_count) || 0,
        w2Count,
        has1099: has1099NEC,
        isSelfEmployed,
        hasSpouse,
        spouseName: answers.spouse_first_name
      }
    };
    
  } catch (error) {
    console.error('Error detecting plan:', error);
    return null;
  }
}

// ============================================================
// GET PRICING (with user's recommended plan)
// ============================================================
export async function getPricing(req, res) {
  try {
    const { userId } = req.query;
    
    let recommendation = null;
    if (userId) {
      recommendation = await detectRequiredPlan(userId);
    }
    
    // Format pricing for frontend
    const plans = Object.values(PRICING).map(plan => ({
      ...plan,
      priceDisplay: `$${(plan.price / 100).toFixed(2)}`,
      isRecommended: recommendation?.recommendedPlan === plan.id
    }));
    
    res.json({
      success: true,
      plans,
      recommendation,
      userSituation: recommendation?.userSituation
    });
    
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

// ============================================================
// GET USER'S RECOMMENDED PLAN
// ============================================================
export async function getRecommendedPlan(req, res) {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId required' });
    }
    
    const recommendation = await detectRequiredPlan(userId);
    
    if (!recommendation) {
      return res.json({
        success: true,
        message: 'No data yet - complete your tax info first',
        recommendedPlan: 'single_simple',
        planDetails: PRICING['single_simple']
      });
    }
    
    res.json({
      success: true,
      ...recommendation
    });
    
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

// ============================================================
// CREATE PAYMENT INTENT
// ============================================================
export async function createPaymentIntent(req, res) {
  try {
    const { userId, email, name, planId: rawPlanId, productType, amount: customAmount, taxYear = 2025 } = req.body;
    
    // Support both planId and productType (CheckoutPage sends productType)
    const planId = rawPlanId || productType;

    if (!userId || !email || !planId) {
      return res.status(400).json({ 
        success: false, 
        error: 'userId, email, and planId are required' 
      });
    }
    
    // ── CPA Bid (dynamic price from bid) ──
    let plan;
    let finalAmount;

    if (planId === 'cpa-review' && customAmount) {
      plan = {
        id: 'cpa-review',
        name: 'CPA Review & Filing',
        filingStatus: 'cpa',
        price: customAmount, // cents, from CPA's bid
      };
      finalAmount = customAmount;
    } else {
      plan = PRICING[planId];
      if (!plan) {
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid plan type' 
        });
      }
      finalAmount = plan.price;
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
    const existingCustomer = await getStripe().customers.list({ email, limit: 1 });
    
    if (existingCustomer.data.length > 0) {
      customer = existingCustomer.data[0];
    } else {
      customer = await getStripe().customers.create({
        email,
        name,
        metadata: { userId }
      });
    }
    
    // Create Payment Intent
    const paymentIntent = await getStripe().paymentIntents.create({
      amount: finalAmount,
      currency: 'usd',
      customer: customer.id,
      metadata: {
        userId,
        planId,
        taxYear: String(taxYear),
        filingType: plan.filingStatus
      },
      automatic_payment_methods: {
        enabled: true,
      },
      description: `TaxSky ${plan.name} - Tax Year ${taxYear}`
    });
    
    // Save pending payment
    const payment = await Payment.create({
      userId,
      email,
      name,
      amount: finalAmount,
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
        amount: finalAmount,
        planName: plan.name,
        priceDisplay: `$${(finalAmount / 100).toFixed(2)}`
      }
    });
    
  } catch (error) {
    console.error('Payment Intent Error:', error);
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
    const paymentIntent = await getStripe().paymentIntents.retrieve(paymentIntentId);
    
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
    
    // Get receipt URL
    if (paymentIntent.latest_charge) {
      const charge = await getStripe().charges.retrieve(paymentIntent.latest_charge);
      if (charge.receipt_url) {
        payment.receiptUrl = charge.receipt_url;
        await payment.save();
      }
    }
    
    // Update TaxSession with payment status
    await TaxSession.findOneAndUpdate(
      { userId: payment.userId },
      { 
        $set: { 
          'answers.payment_status': 'paid',
          'answers.payment_plan': payment.planId,
          'answers.payment_date': new Date().toISOString()
        }
      }
    );
    
    console.log(`✅ Payment confirmed: ${payment.planName} for ${payment.userId}`);
    
    res.json({
      success: true,
      message: 'Payment confirmed!',
      payment
    });
    
  } catch (error) {
    console.error('Confirm Payment Error:', error);
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
    event = getStripe().webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook Error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      await Payment.findOneAndUpdate(
        { stripePaymentIntentId: paymentIntent.id },
        { status: 'completed', paidAt: new Date() }
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
    res.status(500).json({ success: false, error: error.message });
  }
}

// ============================================================
// CHECK IF USER HAS PAID
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
      // Get recommended plan
      const recommendation = await detectRequiredPlan(userId);
      
      res.json({
        success: true,
        hasPaid: false,
        recommendedPlan: recommendation?.recommendedPlan,
        planDetails: recommendation?.planDetails,
        userSituation: recommendation?.userSituation
      });
    }
    
  } catch (error) {
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
    
    // Stats
    const completedPayments = payments.filter(p => p.status === 'completed');
    const totalRevenue = completedPayments.reduce((sum, p) => sum + p.amount, 0);
    
    // Group by plan
    const byPlan = {};
    completedPayments.forEach(p => {
      if (!byPlan[p.planId]) byPlan[p.planId] = { count: 0, revenue: 0 };
      byPlan[p.planId].count++;
      byPlan[p.planId].revenue += p.amount;
    });
    
    res.json({
      success: true,
      count: payments.length,
      totalRevenue: totalRevenue / 100,
      byPlan,
      payments
    });
    
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

// Check if user has access (paid for a plan)
export async function checkAccess(req, res) {
  try {
    const userId = req.params.userId || req.body.userId;
    const taxYear = req.params.taxYear || req.body.taxYear || 2025;

    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId required' });
    }

    const payment = await Payment.findOne({
      userId,
      taxYear,
      status: 'completed'
    });

    res.json({
      success: true,
      hasAccess: !!payment,
      plan: payment ? { planId: payment.planId, planName: payment.planName } : null
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

// Request a refund
export async function requestRefund(req, res) {
  try {
    const { userId, paymentId, reason } = req.body;

    if (!userId || !paymentId) {
      return res.status(400).json({ success: false, error: 'userId and paymentId required' });
    }

    const payment = await Payment.findOne({ _id: paymentId, userId, status: 'completed' });
    if (!payment) {
      return res.status(404).json({ success: false, error: 'Payment not found' });
    }

    // Create Stripe refund
    const refund = await getStripe().refunds.create({
      payment_intent: payment.stripePaymentIntentId,
      reason: 'requested_by_customer',
    });

    // Update payment record
    payment.status = 'refunded';
    payment.refundReason = reason || 'Customer requested';
    payment.refundedAt = new Date();
    payment.stripeRefundId = refund.id;
    await payment.save();

    res.json({ success: true, refund: { id: refund.id, status: refund.status, amount: refund.amount } });
  } catch (error) {
    console.error('Refund error:', error);
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
  detectRequiredPlan,
  PRICING
};