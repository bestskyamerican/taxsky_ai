// ============================================================
// GOOGLE OAUTH AUTHENTICATION ROUTES
// ============================================================
// Allows users to login with Gmail before filing taxes
// ============================================================

import express from "express";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";

const router = express.Router();

// ============================================================
// CONFIGURATION
// ============================================================


// ============================================================
// CONFIGURATION (ENV ONLY — NO FALLBACKS)
// ============================================================

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const JWT_SECRET = process.env.JWT_SECRET;

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !JWT_SECRET) {
  throw new Error(
    "Missing env vars: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, JWT_SECRET"
  );
}


// ============================================================
// IN-MEMORY USER STORE (Replace with MongoDB in production)
// ============================================================
const users = new Map();

// ============================================================
// MIDDLEWARE: Verify JWT Token
// ============================================================
export function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

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
    next();
  } catch (err) {
    return res.status(403).json({ 
      success: false, 
      error: "Invalid or expired token",
      message: "Please login again"
    });
  }
}

// ============================================================
// MIDDLEWARE: Optional Auth (doesn't block, just adds user info)
// ============================================================
export function optionalAuth(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
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
      // ID Token flow (from Google Sign-In button)
      const ticket = await oauth2Client.verifyIdToken({
        idToken: credential,
        audience: GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } else if (code) {
      // Authorization code flow (from popup)
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
      email: payload.email,
      name: payload.name,
      firstName: payload.given_name,
      lastName: payload.family_name,
      picture: payload.picture,
      emailVerified: payload.email_verified,
    };

    console.log(`[AUTH] Google login: ${googleUser.email}`);

    // Find or create user
    let user = users.get(googleUser.googleId);
    
    if (!user) {
      // New user - create account
      user = {
        id: `user_${Date.now()}`,
        ...googleUser,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
      };
      users.set(googleUser.googleId, user);
      console.log(`[AUTH] New user created: ${user.id}`);
    } else {
      // Existing user - update last login
      user.lastLogin = new Date().toISOString();
      user.picture = googleUser.picture; // Update profile pic
      users.set(googleUser.googleId, user);
      console.log(`[AUTH] Existing user logged in: ${user.id}`);
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        googleId: user.googleId,
        email: user.email,
        name: user.name,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return res.json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        firstName: user.firstName,
        lastName: user.lastName,
        picture: user.picture,
      },
    });

  } catch (error) {
    console.error("[AUTH] Google login error:", error);
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
router.get("/me", authenticateToken, (req, res) => {
  const user = users.get(req.user.googleId);
  
  if (!user) {
    return res.status(404).json({ 
      success: false, 
      error: "User not found" 
    });
  }

  return res.json({
    success: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      firstName: user.firstName,
      lastName: user.lastName,
      picture: user.picture,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
    },
  });
});

// ============================================================
// POST /auth/logout - Logout (client-side token removal)
// ============================================================
router.post("/logout", authenticateToken, (req, res) => {
  // JWT is stateless, so logout is handled client-side
  // This endpoint is for logging/audit purposes
  console.log(`[AUTH] User logged out: ${req.user.email}`);
  
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
      userId: req.user.userId,
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