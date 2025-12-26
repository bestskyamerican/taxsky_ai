// ============================================================
// TAX KNOWLEDGE MODEL - MongoDB Schema (FIXED + LOCKED)
// ============================================================

import mongoose from "mongoose";

const taxKnowledgeSchema = new mongoose.Schema({
  // Unique document identifier
  docId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  // Stable rule identifier (machine-use)
  ruleKey: {
    type: String,
    required: true,
    index: true
  },

  // Federal or State
  jurisdiction: {
    type: String,
    enum: ["federal", "ca"],
    required: true,
    index: true
  },

  // Tax year
  taxYear: {
    type: Number,
    required: true,
    index: true
  },

  // Rule category
  category: {
    type: String,
    required: true,
    enum: [
      "deductions",
      "credits",
      "income",
      "filing",
      "forms",
      "self_employment",
      "retirement",
      "state",
      "other"
    ],
    index: true
  },

  // Search topic (human-friendly)
  topic: {
    type: String,
    required: true
  },

  // Human-readable explanation (for display)
  content: {
    type: String,
    required: true
  },

  // ✅ Structured numeric data (FOR GPT & CALCULATION)
  data: {
    type: Object,
    default: {}
  },

  // Authority source
  source: {
    type: String,
    required: true
  },

  // IRS publication reference
  irsPublication: {
    type: String,
    default: null
  },

  // Primary rule selector (one per year per ruleKey)
  isPrimary: {
    type: Boolean,
    default: false,
    index: true
  },

  // Enable / disable rule
  isActive: {
    type: Boolean,
    default: true,
    index: true
  }

}, {
  timestamps: true
});

// Indexes for RAG
taxKnowledgeSchema.index({ topic: "text", content: "text" });
taxKnowledgeSchema.index({ ruleKey: 1, taxYear: 1, jurisdiction: 1 });

const TaxKnowledge = mongoose.model("TaxKnowledge", taxKnowledgeSchema);

export default TaxKnowledge;
