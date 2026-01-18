// ============================================================
// CPA MODEL - Database Schema for CPA Users
// ============================================================
// Location: backend/models/CPA.js
// ✅ UPDATED: Added assignedZipcodes for territory management
// ============================================================

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const CPASchema = new mongoose.Schema({
  // Basic Info
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 8
  },
  
  // Profile
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  
  // CPA Credentials
  licenseNumber: {
    type: String,
    required: true,
    unique: true
  },
  licenseState: {
    type: String,
    required: true,
    uppercase: true,
    maxlength: 2
  },
  
  // ✅ ZIP Code Territory Assignment
  assignedZipcodes: {
    type: [String],
    default: [],
    //index: true
  },
  
  // ✅ Optional: City/Region assignment (for future use)
  assignedCities: {
    type: [String],
    default: []
  },
  
  // Role & Permissions
  role: {
    type: String,
    enum: ['cpa', 'senior_cpa', 'admin'],
    default: 'cpa'
  },
  permissions: {
    canApprove: { type: Boolean, default: true },
    canReject: { type: Boolean, default: true },
    canEdit: { type: Boolean, default: true },
    canDelete: { type: Boolean, default: false },
    canManageCPAs: { type: Boolean, default: false },
    canViewAllUsers: { type: Boolean, default: true },
    canExportData: { type: Boolean, default: false },
    canViewAllZipcodes: { type: Boolean, default: false }  // ✅ Admin can see all territories
  },
  
  // Status
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'pending'],
    default: 'pending'
  },
  
  // Stats
  stats: {
    totalReviewed: { type: Number, default: 0 },
    totalApproved: { type: Number, default: 0 },
    totalRejected: { type: Number, default: 0 },
    lastReviewAt: { type: Date }
  },
  
  // Activity Log
  lastLoginAt: Date,
  lastLoginIP: String,
  loginHistory: [{
    timestamp: Date,
    ip: String,
    userAgent: String
  }],
  
  // Security
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  failedLoginAttempts: { type: Number, default: 0 },
  lockUntil: Date,
  
  // Metadata
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CPA'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CPA'
  },
  approvedAt: Date,
  
  // Preferences
  preferences: {
    language: { type: String, default: 'en' },
    theme: { type: String, default: 'dark' },  // ✅ Default to dark theme
    emailNotifications: { type: Boolean, default: true },
    itemsPerPage: { type: Number, default: 20 }
  }
}, {
  timestamps: true
});

// ============================================================
// INDEXES
// ============================================================
CPASchema.index({ assignedZipcodes: 1 });
CPASchema.index({ status: 1, role: 1 });
CPASchema.index({ email: 1 });

// ============================================================
// PRE-SAVE: Hash password (FIXED - no next() needed with async)
// ============================================================
CPASchema.pre('save', async function() {
  // Only hash if password is modified
  if (!this.isModified('password')) return;
  
  // Hash the password
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  this.passwordChangedAt = new Date();
});

// ============================================================
// METHODS
// ============================================================

// Compare password
CPASchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Check if account is locked
CPASchema.methods.isLocked = function() {
  return this.lockUntil && this.lockUntil > Date.now();
};

// Increment failed login attempts
CPASchema.methods.incrementLoginAttempts = async function() {
  // Reset if lock has expired
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $set: { failedLoginAttempts: 1 },
      $unset: { lockUntil: 1 }
    });
  }
  
  const updates = { $inc: { failedLoginAttempts: 1 } };
  
  // Lock after 5 failed attempts for 30 minutes
  if (this.failedLoginAttempts + 1 >= 5) {
    updates.$set = { lockUntil: Date.now() + 30 * 60 * 1000 };
  }
  
  return this.updateOne(updates);
};

// Reset login attempts on successful login
CPASchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $set: { failedLoginAttempts: 0 },
    $unset: { lockUntil: 1 }
  });
};

// Update stats after review
CPASchema.methods.updateReviewStats = async function(action) {
  const updates = {
    $inc: { 'stats.totalReviewed': 1 },
    $set: { 'stats.lastReviewAt': new Date() }
  };
  
  if (action === 'approved') {
    updates.$inc['stats.totalApproved'] = 1;
  } else if (action === 'rejected') {
    updates.$inc['stats.totalRejected'] = 1;
  }
  
  return this.updateOne(updates);
};

// ✅ Check if CPA can access a specific ZIP code
CPASchema.methods.canAccessZipcode = function(zipcode) {
  // Admins with canViewAllZipcodes can see everything
  if (this.permissions?.canViewAllZipcodes) return true;
  if (this.role === 'admin') return true;
  
  // If no ZIPs assigned, they can see all (legacy behavior / new CPA)
  if (!this.assignedZipcodes || this.assignedZipcodes.length === 0) {
    return true;
  }
  
  // If no zipcode provided, allow access
  if (!zipcode) return true;
  
  // Check if ZIP is in assigned list
  return this.assignedZipcodes.includes(String(zipcode).trim());
};

// ✅ Get assigned ZIP codes as formatted string
CPASchema.methods.getZipcodesString = function() {
  if (!this.assignedZipcodes || this.assignedZipcodes.length === 0) {
    return 'All territories';
  }
  return this.assignedZipcodes.join(', ');
};

// Get full name
CPASchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// JSON transform - hide sensitive fields
CPASchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.passwordResetToken;
  delete obj.passwordResetExpires;
  delete obj.failedLoginAttempts;
  delete obj.lockUntil;
  delete obj.loginHistory;
  return obj;
};

// ============================================================
// STATICS
// ============================================================

// Find active CPAs
CPASchema.statics.findActive = function() {
  return this.find({ status: 'active' });
};

// Find by license
CPASchema.statics.findByLicense = function(licenseNumber) {
  return this.findOne({ licenseNumber });
};

// ✅ Find CPAs by assigned ZIP code
CPASchema.statics.findByZipcode = function(zipcode) {
  return this.find({
    status: 'active',
    $or: [
      { assignedZipcodes: zipcode },
      { assignedZipcodes: { $size: 0 } },  // CPAs with no assigned ZIPs see all
      { 'permissions.canViewAllZipcodes': true }
    ]
  });
};

// ✅ Get all unique assigned ZIP codes across all CPAs
CPASchema.statics.getAllAssignedZipcodes = async function() {
  const result = await this.aggregate([
    { $match: { status: 'active' } },
    { $unwind: '$assignedZipcodes' },
    { $group: { _id: '$assignedZipcodes' } },
    { $sort: { _id: 1 } }
  ]);
  return result.map(r => r._id);
};

// ✅ Get ZIP code assignments summary
CPASchema.statics.getZipcodeAssignments = async function() {
  return this.aggregate([
    { $match: { status: 'active' } },
    { $unwind: '$assignedZipcodes' },
    {
      $group: {
        _id: '$assignedZipcodes',
        cpas: {
          $push: {
            id: '$_id',
            name: { $concat: ['$firstName', ' ', '$lastName'] },
            email: '$email'
          }
        },
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);
};

// Get leaderboard
CPASchema.statics.getLeaderboard = function(limit = 10) {
  return this.find({ status: 'active' })
    .sort({ 'stats.totalReviewed': -1 })
    .limit(limit)
    .select('firstName lastName stats.totalReviewed stats.totalApproved assignedZipcodes');
};

// ============================================================
// Check if model already exists to avoid duplicate warning
// ============================================================
const CPA = mongoose.models.CPA || mongoose.model('CPA', CPASchema);

export default CPA;