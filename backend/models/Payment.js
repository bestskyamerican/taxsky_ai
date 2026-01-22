// ============================================================
// PAYMENT MODEL - Updated to Match Frontend
// ============================================================
// Location: backend/models/Payment.js
// ============================================================

import mongoose from 'mongoose';

const PaymentSchema = new mongoose.Schema({
  // User Info
  userId: { 
    type: String, 
    required: true, 
    index: true 
  },
  email: { 
    type: String, 
    required: true 
  },
  name: { 
    type: String 
  },
  
  // Payment Details
  amount: { 
    type: Number, 
    required: true  // Amount in cents
  },
  currency: { 
    type: String, 
    default: 'usd' 
  },
  
  // Plan Info (matches frontend PRICING_PLANS)
  planId: { 
    type: String, 
    enum: ['free', 'basic', 'standard', 'plus', 'premium', 'selfEmployed'],
    required: true 
  },
  planName: { 
    type: String 
  },
  
  // Add-ons purchased
  addons: [{
    id: String,
    name: String,
    price: Number
  }],
  
  // Tax Year
  taxYear: { 
    type: Number, 
    default: 2024 
  },
  
  // Stripe Info
  stripePaymentIntentId: { 
    type: String, 
    index: true 
  },
  stripeCustomerId: { 
    type: String 
  },
  stripeChargeId: { 
    type: String 
  },
  
  // Status
  status: { 
    type: String, 
    enum: ['pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled'],
    default: 'pending',
    index: true 
  },
  
  // Dates
  paidAt: { 
    type: Date 
  },
  refundedAt: { 
    type: Date 
  },
  
  // Additional Info
  metadata: { 
    type: mongoose.Schema.Types.Mixed, 
    default: {} 
  },
  
  // Receipt
  receiptUrl: { 
    type: String 
  },
  invoiceNumber: { 
    type: String 
  }
  
}, { timestamps: true });

// ============================================================
// INDEXES
// ============================================================
PaymentSchema.index({ userId: 1, taxYear: 1, status: 1 });
PaymentSchema.index({ stripePaymentIntentId: 1 });
PaymentSchema.index({ email: 1 });

// ============================================================
// PRE-SAVE: Generate invoice number
// ============================================================
PaymentSchema.pre('save', async function(next) {
  if (!this.invoiceNumber && this.status === 'completed') {
    const count = await mongoose.model('Payment').countDocuments({ status: 'completed' });
    this.invoiceNumber = `TSK-${this.taxYear}-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

// ============================================================
// STATIC METHODS
// ============================================================

// Get user's all payments
PaymentSchema.statics.getUserPayments = function(userId) {
  return this.find({ userId }).sort({ createdAt: -1 });
};

// Check if user has paid for a specific plan
PaymentSchema.statics.hasPaidForPlan = async function(userId, planId, taxYear = 2024) {
  const payment = await this.findOne({ 
    userId, 
    planId, 
    taxYear,
    status: 'completed' 
  });
  return !!payment;
};

// Check if user has any completed payment for tax year
PaymentSchema.statics.hasActivePlan = async function(userId, taxYear = 2024) {
  const payment = await this.findOne({ 
    userId, 
    taxYear,
    status: 'completed',
    planId: { $ne: 'free' } // Exclude free plan
  });
  return payment;
};

// Get user's current active plan
PaymentSchema.statics.getActivePlan = async function(userId, taxYear = 2024) {
  const payment = await this.findOne({ 
    userId, 
    taxYear,
    status: 'completed'
  }).sort({ amount: -1 }); // Get highest tier plan
  
  return payment;
};

// Calculate total revenue
PaymentSchema.statics.getTotalRevenue = async function(startDate, endDate) {
  const query = { status: 'completed' };
  if (startDate) query.paidAt = { $gte: startDate };
  if (endDate) query.paidAt = { ...query.paidAt, $lte: endDate };
  
  const result = await this.aggregate([
    { $match: query },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);
  
  return result.length > 0 ? result[0].total : 0;
};

// ============================================================
// INSTANCE METHODS
// ============================================================

// Get price display string
PaymentSchema.methods.getPriceDisplay = function() {
  if (this.amount === 0) return 'FREE';
  return `$${(this.amount / 100).toFixed(2)}`;
};

// Check if refund is available (within 30 days)
PaymentSchema.methods.canRefund = function() {
  if (this.status !== 'completed') return false;
  if (!this.paidAt) return false;
  
  const daysSincePurchase = (Date.now() - this.paidAt) / (1000 * 60 * 60 * 24);
  return daysSincePurchase <= 30;
};

// ============================================================
// VIRTUAL FIELDS
// ============================================================

PaymentSchema.virtual('priceDisplay').get(function() {
  if (this.amount === 0) return 'FREE';
  return `$${(this.amount / 100).toFixed(2)}`;
});

// Ensure virtuals are included in JSON
PaymentSchema.set('toJSON', { virtuals: true });
PaymentSchema.set('toObject', { virtuals: true });

const Payment = mongoose.models.Payment || mongoose.model('Payment', PaymentSchema);

export default Payment;