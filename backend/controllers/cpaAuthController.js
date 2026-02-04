// ============================================================
// CPA AUTH CONTROLLER - Authentication for CPA Users
// ============================================================
// Location: backend/controllers/cpaAuthController.js
// ============================================================

import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import CPA from '../models/CPA.js';

// JWT Secret - MUST be set via environment variable in production
const JWT_SECRET = process.env.JWT_SECRET || (() => {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('❌ JWT_SECRET environment variable is required in production');
  }
  console.warn('⚠️  Using default JWT_SECRET - set JWT_SECRET env var for production!');
  return 'taxsky-cpa-dev-secret-DO-NOT-USE-IN-PROD';
})();
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// ============================================================
// GENERATE JWT TOKEN
// ============================================================
function generateToken(cpaId) {
  return jwt.sign({ id: cpaId }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN
  });
}

// ============================================================
// REGISTER NEW CPA
// ============================================================
export async function register(req, res) {
  try {
    const { 
      email, 
      password, 
      firstName, 
      lastName, 
      licenseNumber, 
      licenseState 
    } = req.body;
    
    // Validate required fields
    if (!email || !password || !firstName || !lastName || !licenseNumber || !licenseState) {
      return res.status(400).json({
        success: false,
        error: 'All fields are required: email, password, firstName, lastName, licenseNumber, licenseState'
      });
    }
    
    // Check password strength
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters'
      });
    }
    
    // Check if email already exists
    const existingEmail = await CPA.findOne({ email: email.toLowerCase() });
    if (existingEmail) {
      return res.status(400).json({
        success: false,
        error: 'Email already registered'
      });
    }
    
    // Check if license already exists
    const existingLicense = await CPA.findOne({ licenseNumber });
    if (existingLicense) {
      return res.status(400).json({
        success: false,
        error: 'License number already registered'
      });
    }
    
    // Create new CPA (status: pending - needs admin approval)
    const cpa = await CPA.create({
      email: email.toLowerCase(),
      password,
      firstName,
      lastName,
      licenseNumber,
      licenseState: licenseState.toUpperCase(),
      status: 'pending', // Requires admin approval
      role: 'cpa'
    });
    
    console.log(`✅ New CPA registered: ${email} (pending approval)`);
    
    res.status(201).json({
      success: true,
      message: 'Registration successful. Your account is pending approval by an administrator.',
      cpa: {
        id: cpa._id,
        email: cpa.email,
        firstName: cpa.firstName,
        lastName: cpa.lastName,
        status: cpa.status
      }
    });
  } catch (error) {
    console.error('❌ Register error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// ============================================================
// LOGIN
// ============================================================
export async function login(req, res) {
  try {
    const { email, password } = req.body;
    
    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }
    
    // Find CPA
    const cpa = await CPA.findOne({ email: email.toLowerCase() });
    if (!cpa) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }
    
    // Check if account is locked
    if (cpa.isLocked()) {
      const waitMinutes = Math.ceil((cpa.lockUntil - Date.now()) / 60000);
      return res.status(423).json({
        success: false,
        error: `Account is locked. Try again in ${waitMinutes} minutes.`
      });
    }
    
    // Check if account is active
    if (cpa.status !== 'active') {
      const statusMessages = {
        pending: 'Your account is pending approval. Please wait for an administrator to approve your registration.',
        suspended: 'Your account has been suspended. Please contact an administrator.',
        inactive: 'Your account is inactive. Please contact an administrator.'
      };
      return res.status(403).json({
        success: false,
        error: statusMessages[cpa.status] || 'Account is not active'
      });
    }
    
    // Verify password
    const isMatch = await cpa.comparePassword(password);
    if (!isMatch) {
      await cpa.incrementLoginAttempts();
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }
    
    // Reset failed attempts on successful login
    await cpa.resetLoginAttempts();
    
    // Update login info
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');
    
    await CPA.updateOne(
      { _id: cpa._id },
      {
        $set: { lastLoginAt: new Date(), lastLoginIP: ip },
        $push: {
          loginHistory: {
            $each: [{ timestamp: new Date(), ip, userAgent }],
            $slice: -10 // Keep last 10 logins
          }
        }
      }
    );
    
    // Generate token
    const token = generateToken(cpa._id);
    
    console.log(`✅ CPA logged in: ${email}`);
    
    res.json({
      success: true,
      message: 'Login successful',
      token,
      cpa: {
        id: cpa._id,
        email: cpa.email,
        firstName: cpa.firstName,
        lastName: cpa.lastName,
        fullName: `${cpa.firstName} ${cpa.lastName}`,
        role: cpa.role,
        permissions: cpa.permissions,
        preferences: cpa.preferences,
        stats: cpa.stats
      }
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// ============================================================
// GET CURRENT CPA PROFILE
// ============================================================
export async function getProfile(req, res) {
  try {
    const cpa = await CPA.findById(req.cpa.id);
    if (!cpa) {
      return res.status(404).json({
        success: false,
        error: 'CPA not found'
      });
    }
    
    res.json({
      success: true,
      cpa: {
        id: cpa._id,
        email: cpa.email,
        firstName: cpa.firstName,
        lastName: cpa.lastName,
        fullName: `${cpa.firstName} ${cpa.lastName}`,
        licenseNumber: cpa.licenseNumber,
        licenseState: cpa.licenseState,
        role: cpa.role,
        permissions: cpa.permissions,
        status: cpa.status,
        stats: cpa.stats,
        preferences: cpa.preferences,
        lastLoginAt: cpa.lastLoginAt,
        createdAt: cpa.createdAt
      }
    });
  } catch (error) {
    console.error('❌ getProfile error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// ============================================================
// UPDATE PROFILE
// ============================================================
export async function updateProfile(req, res) {
  try {
    const { firstName, lastName, preferences } = req.body;
    
    const updates = {};
    if (firstName) updates.firstName = firstName;
    if (lastName) updates.lastName = lastName;
    if (preferences) {
      updates.preferences = {
        ...req.cpa.preferences,
        ...preferences
      };
    }
    
    const cpa = await CPA.findByIdAndUpdate(
      req.cpa.id,
      { $set: updates },
      { new: true }
    );
    
    res.json({
      success: true,
      message: 'Profile updated successfully',
      cpa: cpa.toJSON()
    });
  } catch (error) {
    console.error('❌ updateProfile error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// ============================================================
// CHANGE PASSWORD
// ============================================================
export async function changePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Current password and new password are required'
      });
    }
    
    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'New password must be at least 8 characters'
      });
    }
    
    const cpa = await CPA.findById(req.cpa.id);
    
    // Verify current password
    const isMatch = await cpa.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Current password is incorrect'
      });
    }
    
    // Update password
    cpa.password = newPassword;
    await cpa.save();
    
    // Generate new token
    const token = generateToken(cpa._id);
    
    res.json({
      success: true,
      message: 'Password changed successfully',
      token
    });
  } catch (error) {
    console.error('❌ changePassword error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// ============================================================
// FORGOT PASSWORD (Request reset)
// ============================================================
export async function forgotPassword(req, res) {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }
    
    const cpa = await CPA.findOne({ email: email.toLowerCase() });
    
    // Always return success (don't reveal if email exists)
    if (!cpa) {
      return res.json({
        success: true,
        message: 'If this email is registered, you will receive a password reset link.'
      });
    }
    
    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    
    // Save to database (expires in 1 hour)
    cpa.passwordResetToken = hashedToken;
    cpa.passwordResetExpires = Date.now() + 60 * 60 * 1000;
    await cpa.save({ validateBeforeSave: false });
    
    // In production, send email with reset link
    // For now, just log it
    console.log(`🔑 Password reset token for ${email}: ${resetToken}`);
    
    res.json({
      success: true,
      message: 'If this email is registered, you will receive a password reset link.',
      // Remove this in production! Only for testing
      devToken: process.env.NODE_ENV !== 'production' ? resetToken : undefined
    });
  } catch (error) {
    console.error('❌ forgotPassword error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// ============================================================
// RESET PASSWORD (With token)
// ============================================================
export async function resetPassword(req, res) {
  try {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Token and new password are required'
      });
    }
    
    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters'
      });
    }
    
    // Hash the token and find CPA
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    
    const cpa = await CPA.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    });
    
    if (!cpa) {
      return res.status(400).json({
        success: false,
        error: 'Token is invalid or has expired'
      });
    }
    
    // Update password
    cpa.password = newPassword;
    cpa.passwordResetToken = undefined;
    cpa.passwordResetExpires = undefined;
    await cpa.save();
    
    // Generate new auth token
    const authToken = generateToken(cpa._id);
    
    res.json({
      success: true,
      message: 'Password reset successful',
      token: authToken
    });
  } catch (error) {
    console.error('❌ resetPassword error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// ============================================================
// VERIFY TOKEN (Check if still valid)
// ============================================================
export async function verifyToken(req, res) {
  try {
    // If middleware passed, token is valid
    res.json({
      success: true,
      valid: true,
      cpa: {
        id: req.cpa.id,
        email: req.cpa.email,
        firstName: req.cpa.firstName,
        lastName: req.cpa.lastName,
        role: req.cpa.role
      }
    });
  } catch (error) {
    res.status(401).json({ success: false, valid: false });
  }
}

// ============================================================
// LOGOUT (Optional - mainly for tracking)
// ============================================================
export async function logout(req, res) {
  try {
    // In a stateless JWT system, logout is handled client-side
    // But we can log the event
    console.log(`👋 CPA logged out: ${req.cpa.email}`);
    
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

// ============================================================
// EXPORT
// ============================================================
export default {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  verifyToken,
  logout
};