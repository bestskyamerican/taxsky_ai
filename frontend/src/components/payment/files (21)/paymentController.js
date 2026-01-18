// ============================================================
// PAYMENT CONTROLLER - Stripe Integration
// ============================================================
// Location: backend/controllers/paymentController.js
// ============================================================

import Stripe from 'stripe';
import Payment from '../models/Payment.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// ============================================================
// PRICING PLANS
// ============================================================
export const PRICING = {
  basic: {
    id: 'basic',
    name: 'Basic Federal Filing',
    price: 0, // FREE
    description: 'Simple W-2 income only',
    features: [
      'Federal tax return',
      'W-2 income',
      'Standard deduction',
      'AI-powered chat assistance'
    ]
  },
  standard: {
    id: 'standard',
    name: 'Standard Filing',
    price: 2999, // $29.99
    description: 'Most popular for individuals',
    features: [
      'Everything in Basic',
      'State tax return',
      'Multiple W-2s',
      '1099 income',
      'Itemized deductions',
      'Priority support'
    ]
  },
  premium: {
    id: 'premium',
    name: 'Premium Filing',
    price: 4999, // $49.99
    description: 'Self-employed & complex returns',
    features: [
      'Everything in Standard',
      'Self-employment income',
      'Business expenses',
      'Investment income',
      'Rental income',
      'Audit protection',
      'CPA review included'
    ]
  },
  state_filing: {
    id: 'state_filing',
    name: 'State Filing Add-on',
    price: 1499, // $14.99
    description: 'Additional state return',
    features: ['One additional state return']
  },
  audit_protection: {
    id: 'audit_protection',
    name: 'Audit Protection',
    price: 1999, // $19.99
    description: '3-year audit assistance',
    features: [
      'Audit notification monitoring',
      'Response letter preparation',
      'CPA representation'
    ]
  }
};

// ============================================================
// GET PRICING
// ============================================================
export async function getPricing(req, res) {
  try {
    res.json({
      success: true,
      pricing: PRICING
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

// ============================================================
// CREATE PAYMENT INTENT (Stripe)
// ============================================================
export async function createPaymentIntent(req, res) {
  try {
    const { userId, email, name, productType, taxYear = 2024 } = req.body;
    
    if (!userId || !email || !productType) {
      return res.status(400).json({ 
        success: false, 
        error: 'userId, email, and productType are required' 
      });
    }
    
    const product = PRICING[productType];
    if (!product) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid product type' 
      });
    }
    
    // Free plan - no payment needed
    if (product.price === 0) {
      const payment = await Payment.create({
        userId,
        email,
        name,
        amount: 0,
        productType,
        productName: product.name,
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
    
    // Check if already paid
    const existingPayment = await Payment.findOne({
      userId,
      productType,
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
    const existingCustomer = await stripe.customers.list({ email, limit: 1 });
    
    if (existingCustomer.data.length > 0) {
      customer = existingCustomer.data[0];
    } else {
      customer = await stripe.customers.create({
        email,
        name,
        metadata: { userId }
      });
    }
    
    // Create Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: product.price,
      currency: 'usd',
      customer: customer.id,
      metadata: {
        userId,
        productType,
        taxYear: String(taxYear)
      },
      automatic_payment_methods: {
        enabled: true,
      },
      description: `TaxSky ${product.name} - Tax Year ${taxYear}`
    });
    
    // Save pending payment to database
    const payment = await Payment.create({
      userId,
      email,
      name,
      amount: product.price,
      productType,
      productName: product.name,
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
        amount: product.price,
        productName: product.name
      }
    });
    
  } catch (error) {
    console.error('Payment Intent Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// ============================================================
// CONFIRM PAYMENT (called after Stripe confirms)
// ============================================================
export async function confirmPayment(req, res) {
  try {
    const { paymentIntentId } = req.body;
    
    if (!paymentIntentId) {
      return res.status(400).json({ 
        success: false, 
        error: 'paymentIntentId is required' 
      });
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
      return res.status(404).json({ 
        success: false, 
        error: 'Payment record not found' 
      });
    }
    
    // Get receipt URL if available
    if (paymentIntent.latest_charge) {
      const charge = await stripe.charges.retrieve(paymentIntent.latest_charge);
      if (charge.receipt_url) {
        payment.receiptUrl = charge.receipt_url;
        await payment.save();
      }
    }
    
    console.log(`✅ Payment confirmed: ${payment.invoiceNumber} - ${payment.productName}`);
    
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
// STRIPE WEBHOOK (handles payment events)
// ============================================================
export async function handleWebhook(req, res) {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  let event;
  
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
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
      payments
    });
    
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

// ============================================================
// CHECK USER'S ACCESS
// ============================================================
export async function checkAccess(req, res) {
  try {
    const { userId, taxYear = 2024 } = req.params;
    
    const payments = await Payment.find({ 
      userId, 
      taxYear: parseInt(taxYear),
      status: 'completed' 
    });
    
    const access = {
      basic: true, // Always free
      standard: payments.some(p => p.productType === 'standard' || p.productType === 'premium'),
      premium: payments.some(p => p.productType === 'premium'),
      state_filing: payments.some(p => p.productType === 'state_filing' || p.productType === 'standard' || p.productType === 'premium'),
      audit_protection: payments.some(p => p.productType === 'audit_protection' || p.productType === 'premium'),
      cpa_review: payments.some(p => p.productType === 'premium')
    };
    
    res.json({
      success: true,
      userId,
      taxYear,
      access,
      payments
    });
    
  } catch (error) {
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
    payment.metadata.refundReason = reason;
    payment.metadata.stripeRefundId = refund.id;
    await payment.save();
    
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
      totalRevenue: totalRevenue / 100, // Convert cents to dollars
      payments
    });
    
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export default {
  getPricing,
  createPaymentIntent,
  confirmPayment,
  handleWebhook,
  getUserPayments,
  checkAccess,
  requestRefund,
  getAllPayments,
  PRICING
};
