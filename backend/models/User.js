// ============================================================
// USER MODEL - Enhanced for TaxSky
// ============================================================
// Location: backend/models/User.js
// 
// ✅ Added: odtUserId field for consistent user identification
// ✅ Added: Google OAuth fields
// ✅ Added: Spouse info fields
// ============================================================

import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  // ============================================================
  // ✅ GENERATED USER ID - Use this everywhere!
  // ============================================================
  odtUserId: {
    type: String,
    unique: true,
    sparse: true,
    index: true
  },
  
  // ============================================================
  // BASIC INFO
  // ============================================================
  email: { 
    type: String, 
    required: true, 
    unique: true,
    lowercase: true,
    trim: true
  },
  name: String,
  firstName: String,
  lastName: String,
  
  // ============================================================
  // GOOGLE OAUTH
  // ============================================================
  googleId: {
    type: String,
    unique: true,
    sparse: true,
    index: true
  },
  picture: String,
  emailVerified: { type: Boolean, default: false },
  
  // ============================================================
  // PROFILE (for Form 1040)
  // ============================================================
  ssn: String,
  dateOfBirth: Date,
  phone: String,
  address: {
    street: String,
    city: String,
    state: String,
    zip: String
  },
  
  // ============================================================
  // SPOUSE INFO (for MFJ)
  // ============================================================
  spouse: {
    firstName: String,
    lastName: String,
    ssn: String,
    dateOfBirth: Date
  },
  
  // ============================================================
  // PREFERENCES
  // ============================================================
  preferences: {
    language: { type: String, default: 'en' },
    state: { type: String, default: 'CA' }
  },
  
  // ============================================================
  // METADATA
  // ============================================================
  lastLoginAt: Date,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// ============================================================
// PRE-SAVE: Generate odtUserId if not exists
// ============================================================
UserSchema.pre('save', function() {
  if (!this.odtUserId) {
    this.odtUserId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  this.updatedAt = new Date();
});

// ============================================================
// VIRTUAL: Get the best userId to use
// ============================================================
UserSchema.virtual('id').get(function() {
  return this.odtUserId || this._id.toString();
});

// ============================================================
// JSON transform - include odtUserId as id
// ============================================================
UserSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    ret.id = ret.odtUserId || ret._id;
    delete ret.__v;
    return ret;
  }
});

UserSchema.set('toObject', {
  virtuals: true
});

// ============================================================
// STATIC: Find or create by Google
// ============================================================
UserSchema.statics.findOrCreateByGoogle = async function(googleProfile) {
  let user = await this.findOne({ 
    $or: [
      { googleId: googleProfile.googleId },
      { email: googleProfile.email.toLowerCase() }
    ]
  });
  
  if (!user) {
    user = new this({
      email: googleProfile.email.toLowerCase(),
      googleId: googleProfile.googleId,
      name: googleProfile.name,
      firstName: googleProfile.firstName,
      lastName: googleProfile.lastName,
      picture: googleProfile.picture,
      emailVerified: googleProfile.emailVerified,
      lastLoginAt: new Date()
    });
    await user.save();
    console.log(`[USER] ✅ Created new user: ${user.odtUserId}`);
  } else {
    user.googleId = googleProfile.googleId;
    user.picture = googleProfile.picture;
    user.lastLoginAt = new Date();
    if (!user.odtUserId) {
      // Generate if missing
      user.odtUserId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    await user.save();
    console.log(`[USER] ✅ Updated user: ${user.odtUserId}`);
  }
  
  return user;
};

// ============================================================
// Export
// ============================================================
const User = mongoose.models.User || mongoose.model("User", UserSchema);

export default User;