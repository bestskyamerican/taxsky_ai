// ============================================================
// CPA JOB MODEL - Anonymized Tax Return Job Posting
// ============================================================
// Location: backend/models/CPAJob.js
//
// SSN SECURITY: This model stores ZERO personal data.
// Only anonymized info is stored for the bid board.
// Personal data is fetched from user's existing records
// ONLY after a CPA is assigned.
// ============================================================

import mongoose from 'mongoose';

const CPAJobSchema = new mongoose.Schema({
  // ── Owner ──
  user_id: { type: String, required: true, index: true },

  // ── Status ──
  status: {
    type: String,
    enum: ['open', 'bidding', 'assigned', 'in_review', 'completed', 'cancelled'],
    default: 'open',
    index: true,
  },

  // ── Anonymized Data (what CPAs see before assignment) ──
  tax_year:         { type: Number, default: 2025 },
  state:            { type: String, required: true },       // e.g. "CA"
  filing_status:    { type: String, required: true },       // e.g. "single"
  income_range:     { type: String, required: true },       // e.g. "$50K – $75K"
  dependents_count: { type: Number, default: 0 },
  forms_needed:     { type: Number, default: 1 },           // 1 = federal only, 2 = federal + state
  include_state:    { type: Boolean, default: true },
  has_state_tax:    { type: Boolean, default: true },

  // ── Assignment ──
  assigned_cpa_id:  { type: String, default: null },
  assigned_bid_id:  { type: mongoose.Schema.Types.ObjectId, default: null },
  assigned_at:      { type: Date, default: null },

  // ── Tracking ──
  bid_count:        { type: Number, default: 0 },

}, { timestamps: true });

// Index for CPA browsing
CPAJobSchema.index({ status: 1, created_at: -1 });
CPAJobSchema.index({ state: 1, status: 1 });

export default mongoose.model('CPAJob', CPAJobSchema);
