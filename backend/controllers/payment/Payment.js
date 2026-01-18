// ============================================================
// PAYMENT MODEL - TaxSky Payments
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
  
  // Product/Service
  productType: { 
    type: String, 
    enum: ['basic', 'standard', 'premium', 'state_filing', 'audit_protection'],
    required: true 
  },
  productName: { 
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

// Generate invoice number
PaymentSchema.pre('save', async function(next) {
  if (!this.invoiceNumber && this.status === 'completed') {
    const count = await mongoose.model('Payment').countDocuments({ status: 'completed' });
    this.invoiceNumber = `TSK-${this.taxYear}-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

// Static: Get user's payments
PaymentSchema.statics.getUserPayments = function(userId) {
  return this.find({ userId }).sort({ createdAt: -1 });
};

// Static: Check if user has paid for service
PaymentSchema.statics.hasPaidFor = async function(userId, productType, taxYear) {
  const payment = await this.findOne({ 
    userId, 
    productType, 
    taxYear,
    status: 'completed' 
  });
  return !!payment;
};

const Payment = mongoose.models.Payment || mongoose.model('Payment', PaymentSchema);

export default Payment;
