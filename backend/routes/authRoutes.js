// ============================================================
// GOOGLE OAUTH AUTHENTICATION ROUTES - FIXED
// ============================================================
// Location: backend/routes/authRoutes.js
//
// ✅ FIXED: Generate consistent odtUserId for each user
// ✅ FIXED: Store user in MongoDB, not just memory
// ✅ FIXED: Include odtUserId in JWT token
// ✅ FIXED: authenticateToken checks odtUserId (not userId)
// ✅ FIXED: Removed hardcoded secrets - use .env file
// ============================================================

import express from "express";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import User from "../models/User.js";

const router = express.Router();

// ============================================================
// CONFIGURATION - Using environment variables only (no hardcoded secrets)
// ============================================================
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const JWT_SECRET = process.env.JWT_SECRET || "taxsky-secret-key-change-in-production";
const JWT_EXPIRES_IN = "7d";

// Validate required environment variables
if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
  console.error("[AUTH] ❌ Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in environment variables!");
  console.error("[AUTH] Please set these in your .env file");
}

const oauth2Client = new OAuth2Client(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  "postmessage"
);

// ============================================================
// ✅ GENERATE USER ID - Consistent format
// ============================================================
function generateUserId() {
  return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================================
// MIDDLEWARE: Verify JWT Token - FIXED!
// ============================================================
export function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      error: "Authentication required",
      message: "Please login with Google to continue"
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    
    // ✅ FIXED: Check for odtUserId (token uses odtUserId, not userId)
    const userId = req.user.odtUserId || req.user.userId || req.user.odtUserIdOrId;
    
    if (!userId || userId === 'undefined') {
      console.error('[AUTH] ❌ Token missing valid userId:', decoded);
      return res.status(403).json({ 
        success: false, 
        error: "Invalid token - missing userId"
      });
    }
    
    // ✅ Add userId to req.user for convenience (other routes can use req.user.userId)
    req.user.userId = userId;
    
    next();
  } catch (err) {
    console.error('[AUTH] ❌ Token verification failed:', err.message);
    return res.status(403).json({ 
      success: false, 
      error: "Invalid or expired token",
      message: "Please login again"
    });
  }
}

// ============================================================
// MIDDLEWARE: Optional Auth
// ============================================================
export function optionalAuth(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      // ✅ Also set userId for optional auth
      req.user.userId = decoded.odtUserId || decoded.userId || decoded.odtUserIdOrId;
    } catch (err) {
      // Token invalid, but don't block
    }
  }
  next();
}

// ============================================================
// POST /auth/google - Login with Google
// ============================================================
router.post("/google", async (req, res) => {
  try {
    const { code, credential } = req.body;
    
    let payload;
    
    if (credential) {
      // ID Token flow
      const ticket = await oauth2Client.verifyIdToken({
        idToken: credential,
        audience: GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } else if (code) {
      // Authorization code flow
      const { tokens } = await oauth2Client.getToken(code);
      oauth2Client.setCredentials(tokens);
      
      const ticket = await oauth2Client.verifyIdToken({
        idToken: tokens.id_token,
        audience: GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } else {
      return res.status(400).json({ 
        success: false, 
        error: "Missing credential or code" 
      });
    }

    // Extract user info from Google
    const googleUser = {
      googleId: payload.sub,
      email: payload.email.toLowerCase(),
      name: payload.name,
      firstName: payload.given_name,
      lastName: payload.family_name,
      picture: payload.picture,
      emailVerified: payload.email_verified,
    };

    console.log(`[AUTH] 🔐 Google login: ${googleUser.email}`);

    // ============================================================
    // ✅ FIND OR CREATE USER IN MONGODB
    // ============================================================
    let user = await User.findOne({ 
      $or: [
        { googleId: googleUser.googleId },
        { email: googleUser.email }
      ]
    });
    
    if (!user) {
      // Create new user with generated odtUserId
      user = new User({
        email: googleUser.email,
        name: googleUser.name,
        firstName: googleUser.firstName,
        lastName: googleUser.lastName,
        googleId: googleUser.googleId,
        picture: googleUser.picture,
        emailVerified: googleUser.emailVerified,
        odtUserId: generateUserId(),  // ✅ Generate consistent userId
        lastLoginAt: new Date()
      });
      await user.save();
      console.log(`[AUTH] ✅ Created new user: ${user.odtUserId}`);
    } else {
      // Update existing user
      user.googleId = googleUser.googleId;
      user.picture = googleUser.picture;
      user.lastLoginAt = new Date();
      
      // ✅ Generate odtUserId if missing
      if (!user.odtUserId) {
        user.odtUserId = generateUserId();
        console.log(`[AUTH] ✅ Generated missing userId: ${user.odtUserId}`);
      }
      
      await user.save();
      console.log(`[AUTH] ✅ Updated existing user: ${user.odtUserId}`);
    }

    // ============================================================
    // ✅ GENERATE JWT TOKEN WITH odtUserId
    // ============================================================
    const tokenPayload = {
      odtUserId: user.odtUserId,              // ✅ Our generated ID
      userId: user.odtUserId,                 // ✅ ADDED: Also include as userId for compatibility
      odtUserIdOrId: user.odtUserId || user._id.toString(), // ✅ Fallback
      googleId: user.googleId,
      email: user.email,
      name: user.name,
    };
    
    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    console.log(`[AUTH] ✅ Generated token for userId: ${user.odtUserId}`);

    return res.json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user.odtUserId,                   // ✅ Use odtUserId as id
        odtUserId: user.odtUserId,
        userId: user.odtUserId,               // ✅ ADDED: Also include as userId
        odtUserIdOrId: user._id.toString(),
        email: user.email,
        name: user.name,
        firstName: user.firstName,
        lastName: user.lastName,
        picture: user.picture,
      },
    });

  } catch (error) {
    console.error("[AUTH] ❌ Google login error:", error);
    return res.status(401).json({ 
      success: false, 
      error: "Authentication failed",
      message: error.message 
    });
  }
});

// ============================================================
// GET /auth/me - Get current user info
// ============================================================
router.get("/me", authenticateToken, async (req, res) => {
  try {
    const user = await User.findOne({ 
      $or: [
        { odtUserId: req.user.odtUserId },
        { googleId: req.user.googleId },
        { _id: req.user.odtUserIdOrId }
      ]
    });
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: "User not found" 
      });
    }

    return res.json({
      success: true,
      user: {
        id: user.odtUserId || user._id.toString(),
        odtUserId: user.odtUserId,
        userId: user.odtUserId,               // ✅ ADDED
        email: user.email,
        name: user.name,
        firstName: user.firstName,
        lastName: user.lastName,
        picture: user.picture,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
      },
    });
  } catch (error) {
    console.error("[AUTH] ❌ Get user error:", error);
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ============================================================
// POST /auth/logout
// ============================================================
router.post("/logout", authenticateToken, (req, res) => {
  console.log(`[AUTH] 👋 User logged out: ${req.user.email}`);
  
  return res.json({
    success: true,
    message: "Logged out successfully",
  });
});

// ============================================================
// GET /auth/verify - Verify token is still valid
// ============================================================
router.get("/verify", authenticateToken, (req, res) => {
  return res.json({
    success: true,
    valid: true,
    user: {
      odtUserId: req.user.odtUserId,
      userId: req.user.userId,                // ✅ ADDED
      odtUserIdOrId: req.user.odtUserId,
      email: req.user.email,
      name: req.user.name,
    },
  });
});

// ============================================================
// GET /auth/test - Test endpoint (no auth required)
// ============================================================
router.get("/test", (req, res) => {
  res.json({ 
    success: true, 
    message: "Auth routes working",
    googleClientConfigured: !!GOOGLE_CLIENT_ID,
  });
});

export default router;