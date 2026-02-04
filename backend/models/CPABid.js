// ============================================================
// CPA BID MODEL - CPA's Bid on a Tax Return Job
// ============================================================
// Location: backend/models/CPABid.js
//
// CPAs set their OWN price. No fixed fee.
// Stores: price, message, turnaround, CPA info
// ============================================================

import mongoose from 'mongoose';

const CPABidSchema = new mongoose.Schema({
  // ── References ──
  job_id:  { type: mongoose.Schema.Types.ObjectId, ref: 'CPAJob', required: true, index: true },
  cpa_id:  { type: String, required: true, index: true },

  // ── CPA Info ──
  cpa_name:        { type: String, required: true },
  cpa_credentials: { type: String, default: 'Licensed CPA' },

  // ── Bid Details (CPA sets these) ──
  bid_price:       { type: Number, required: true, min: 1 },   // CPA's price in dollars
  message:         { type: String, default: '' },                // CPA's pitch to the client
  estimated_hours: { type: Number, default: 24 },                // turnaround in hours

  // ── Status ──
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending',
  },

}, { timestamps: true });

// One bid per CPA per job
CPABidSchema.index({ job_id: 1, cpa_id: 1 }, { unique: true });

export default mongoose.model('CPABid', CPABidSchema);
