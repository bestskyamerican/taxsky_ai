// ============================================================
// CPA AUTH MIDDLEWARE - Protect Routes
// ============================================================
// Location: backend/middleware/cpaAuth.js
// ============================================================

import jwt from 'jsonwebtoken';
import CPA from '../models/CPA.js';

const JWT_SECRET = process.env.JWT_SECRET || 'taxsky-cpa-secret-key-change-in-production';

// ============================================================
// PROTECT - Require authentication
// ============================================================
export async function protect(req, res, next) {
  try {
    let token;
    
    // Get token from header
    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    
    // Check if token exists
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized. Please log in.'
      });
    }
    
    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          error: 'Session expired. Please log in again.',
          code: 'TOKEN_EXPIRED'
        });
      }
      return res.status(401).json({
        success: false,
        error: 'Invalid token. Please log in again.'
      });
    }
    
    // Get CPA from database
    const cpa = await CPA.findById(decoded.id);
    
    if (!cpa) {
      return res.status(401).json({
        success: false,
        error: 'User no longer exists.'
      });
    }
    
    // Check if CPA is still active
    if (cpa.status !== 'active') {
      return res.status(403).json({
        success: false,
        error: 'Your account is not active. Please contact an administrator.'
      });
    }
    
    // Check if password was changed after token was issued
    if (cpa.passwordChangedAt) {
      const changedTimestamp = parseInt(cpa.passwordChangedAt.getTime() / 1000, 10);
      if (decoded.iat < changedTimestamp) {
        return res.status(401).json({
          success: false,
          error: 'Password was recently changed. Please log in again.'
        });
      }
    }
    
    // Add CPA to request
    req.cpa = cpa;
    next();
  } catch (error) {
    console.error('❌ Auth middleware error:', error);
    res.status(500).json({ success: false, error: 'Authentication error' });
  }
}

// ============================================================
// RESTRICT TO - Role-based access
// ============================================================
export function restrictTo(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.cpa.role)) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to perform this action.'
      });
    }
    next();
  };
}

// ============================================================
// REQUIRE PERMISSION - Permission-based access
// ============================================================
export function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.cpa.permissions?.[permission]) {
      return res.status(403).json({
        success: false,
        error: `You do not have the required permission: ${permission}`
      });
    }
    next();
  };
}

// ============================================================
// OPTIONAL AUTH - Get CPA if token exists, but don't require
// ============================================================
export async function optionalAuth(req, res, next) {
  try {
    let token;
    
    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const cpa = await CPA.findById(decoded.id);
        if (cpa && cpa.status === 'active') {
          req.cpa = cpa;
        }
      } catch (err) {
        // Token invalid, but that's okay for optional auth
      }
    }
    
    next();
  } catch (error) {
    next();
  }
}

// ============================================================
// EXPORT
// ============================================================
export default {
  protect,
  restrictTo,
  requirePermission,
  optionalAuth
};
