// ============================================================
// PAYMENT MODEL - Filing Type Based
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
    required: true 
  },
  currency: { 
    type: String, 
    default: 'usd' 
  },
  
  // Plan Info
  planId: { 
    type: String, 
    enum: [
      'single_simple',      // $19.99 - Single, 1 W-2
      'single_plus',        // $29.99 - Single, multiple income
      'married_simple',     // $29.99 - Married, no kids
      'family',             // $39.99 - Married with kids
      'head_of_household',  // $34.99 - Single parent
      'self_employed',      // $49.99 - 1099/business
      'self_employed_family', // $59.99 - Self-employed + family
      'premium'             // $79.99 - CPA review
    ],
    required: true 
  },
  planName: { 
    type: String 
  },
  filingType: {
    type: String,
    enum: ['single', 'married_filing_jointly', 'married_filing_separately', 'head_of_household', 'any']
  },
  
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
  
  // Receipt
  receiptUrl: { 
    type: String 
  },
  invoiceNumber: { 
    type: String 
  },
  
  // Additional
  metadata: { 
    type: mongoose.Schema.Types.Mixed, 
    default: {} 
  }
  
}, { timestamps: true });

// Generate invoice number
PaymentSchema.pre('save', async function(next) {
  if (!this.invoiceNumber && this.status === 'completed') {
    const count = await mongoose.model('Payment').countDocuments({ status: 'completed' });
    this.invoiceNumber = `TSK-${this.taxYear}-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

// Check if user has paid for tax year
PaymentSchema.statics.hasPaidForYear = async function(userId, taxYear) {
  const payment = await this.findOne({ 
    userId, 
    taxYear,
    status: 'completed' 
  });
  return payment;
};

const Payment = mongoose.models.Payment || mongoose.model('Payment', PaymentSchema);

export default Payment;
