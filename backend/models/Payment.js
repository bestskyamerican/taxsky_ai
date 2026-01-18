// ============================================================
// PAYMENT MODEL - Fixed
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
    required: true 
  },
  planName: { 
    type: String 
  },
  filingType: {
    type: String
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

// ✅ FIXED: Generate invoice number (no next() needed with async)
PaymentSchema.pre('save', async function() {
  if (!this.invoiceNumber && this.status === 'completed') {
    const count = await mongoose.model('Payment').countDocuments({ status: 'completed' });
    this.invoiceNumber = `TSK-${this.taxYear}-${String(count + 1).padStart(6, '0')}`;
  }
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