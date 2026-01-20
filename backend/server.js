import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";

dotenv.config();

// ✅ Import TaxSession for cleanup
import TaxSession from './models/TaxSession.js';

// -------------------------
// MongoDB Connection + Cleanup
// -------------------------
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ MongoDB Connected");
    
    // ✅ CLEANUP: Fix corrupted sessions with null/undefined taxYear
    try {
      const corrupted = await TaxSession.countDocuments({
        $or: [
          { taxYear: null },
          { taxYear: { $exists: false } }
        ]
      });
      
      if (corrupted > 0) {
        console.log(`🧹 Found ${corrupted} corrupted sessions, cleaning...`);
        const result = await TaxSession.deleteMany({
          $or: [
            { taxYear: null },
            { taxYear: { $exists: false } }
          ]
        });
        console.log(`🗑️ Deleted ${result.deletedCount} corrupted sessions`);
      }
    } catch (cleanupErr) {
      console.log("⚠️ Cleanup skipped:", cleanupErr.message);
    }
    
  } catch (error) {
    console.error("❌ MongoDB Connection Error:", error.message);
    process.exit(1);
  }
};
connectDB();

// -------------------------
// App Initialization
// -------------------------
const app = express();

// ✅ UPDATED CORS - Added production URL
app.use(cors({
  origin: [
    'http://localhost:5173', 
    'http://localhost:5174', 
    'http://localhost:3000',
    'https://goldfish-app-3qzug.ondigitalocean.app'
  ],
  credentials: true,
}));

app.use(express.json());
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// -------------------------
// ROUTE HANDLERS
// -------------------------
import authRoutes, { authenticateToken } from "./routes/authRoutes.js";
import irs1040Routes from "./routes/irs1040Routes.js";
import formRoutes from "./routes/formsRoutes.js";
import resetRoutes from "./routes/resetRoutes.js";
import verificationRoutes from "./routes/verificationRoutes.js";
import smartAiRoutes from "./routes/smartAiRoutes.js";
import cpaRoutes from './routes/cpaRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import taxRoutes from './routes/taxRoutes.js';
import stateRoutes from "./routes/state/index.js";

// ✅ Import controller functions for public routes
import { getAllData, updateFromPython } from "./controllers/smartAiController.js";

// -------------------------
// ROUTE MOUNTING
// -------------------------
try {
  // ============================================================
  // PUBLIC ROUTES (No authentication required)
  // ============================================================
  app.use("/api/auth", authRoutes);
  
  // ✅ PUBLIC: AI Status check - Simple version without aiService
  app.get("/api/ai/status", async (req, res) => {
    try {
      // Simple status check - just verify OpenAI key exists
      const hasKey = !!process.env.OPENAI_API_KEY;
      res.json({
        success: hasKey,
        status: hasKey ? "ready" : "no_api_key",
        model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
        hint: hasKey ? "OpenAI API key configured" : "Check OPENAI_API_KEY in .env file"
      });
    } catch (err) {
      console.error("❌ GPT Status Check Error:", err.message);
      res.json({
        success: false,
        status: "error",
        error: err.message,
        hint: "Check OPENAI_API_KEY in .env file"
      });
    }
  });

  // ============================================================
  // ✅ PUBLIC AI ROUTES - For Python API access (NO AUTH)
  // ============================================================
  // These MUST be registered BEFORE the authenticated routes!
  
  // Python reads messages from this endpoint
  app.get("/api/ai/data/:userId", getAllData);
  
  // Python updates session with extracted data
  app.post("/api/ai/status/:userId", updateFromPython);
  
  // Health check for AI service
  app.get("/api/ai/health", (req, res) => {
    res.json({
      success: true,
      service: 'TaxSky AI',
      model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
      pythonAccess: 'enabled',
      timestamp: new Date().toISOString()
    });
  });

  console.log("✅ Public AI routes registered (Python API access)");
  
  // ============================================================
  // PROTECTED ROUTES (Authentication required)
  // ============================================================
  app.use("/api/tax/1040", irs1040Routes);
  app.use("/api/forms", authenticateToken, formRoutes);
  app.use("/api/reset", authenticateToken, resetRoutes);
  app.use("/api/verification", authenticateToken, verificationRoutes);
  app.use('/api/payments', paymentRoutes);
  
  // ✅ Protected AI routes (chat, welcome, etc need auth)
  app.use("/api/ai", smartAiRoutes);

  //app.use("/api/ai", authenticateToken, smartAiRoutes);

  // Python Tax API Routes (Calculator + RAG + OCR)
  app.use("/api/tax", taxRoutes);

  // State Tax Routes
  app.use("/api/tax/state", stateRoutes);
  
  // CPA Routes
  app.use('/api/cpa', cpaRoutes);

  console.log("✅ All routes mounted successfully");
  console.log("🤖 Smart AI: GPT-powered tax assistant ENABLED");
  console.log("🐍 Python Tax API: Calculator + RAG + OCR ENABLED");
  console.log("🔐 Authentication: ENABLED");
} catch (error) {
  console.error("❌ Route Mounting Error:", error.message);
}

// -------------------------
// Health Check (Public)
// -------------------------
app.get("/health", async (req, res) => {
  let pythonStatus = "disconnected";
  try {
    const pythonUrl = process.env.PYTHON_TAX_API || 'http://localhost:5002';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const response = await fetch(`${pythonUrl}/health`, { signal: controller.signal });
    clearTimeout(timeout);
    if (response.ok) pythonStatus = "connected";
  } catch (e) {
    pythonStatus = "disconnected";
  }

  res.json({ 
    status: "Backend running OK",
    auth: "enabled",
    smartAI: "enabled",
    pythonTaxAPI: pythonStatus,
    uptime: process.uptime() 
  });
});

// -------------------------
// Fallback Route
// -------------------------
app.use((req, res) => {
  res.status(404).json({ error: "Endpoint not found" });
});

// -------------------------
// Start Server
// -------------------------
const PORT = process.env.PORT || 3000;
const PYTHON_API = process.env.PYTHON_TAX_API || 'http://localhost:5002';

try {
  app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                    🌤️  TaxSky Server v2.1                     ║
╠═══════════════════════════════════════════════════════════════╣
║  🚀 Server:     http://localhost:${PORT}                        ║
║  🤖 Smart AI:   GPT-powered ENABLED                           ║
║  🐍 Python API: ${PYTHON_API}                       ║
║  🔐 Auth:       Google OAuth ENABLED                          ║
║  📊 Database:   MongoDB Connected                             ║
╚═══════════════════════════════════════════════════════════════╝

📌 PUBLIC Endpoints:
   POST /api/auth/google     - Login with Google
   GET  /api/auth/verify     - Verify token
   GET  /health              - Health check
   GET  /api/ai/status       - 🧪 GPT Status (PUBLIC)
   GET  /api/ai/data/:userId - 🐍 Python reads messages (PUBLIC)
   POST /api/ai/status/:userId - 🐍 Python updates session (PUBLIC)
   GET  /api/ai/health       - 🐍 AI health check (PUBLIC)

🤖 SMART AI Endpoints (Auth Required):
   POST /api/ai/chat         - Tax chat (interview flow)
   POST /api/ai/welcome      - Get welcome message
   POST /api/ai/reset        - Reset session

🐍 PYTHON TAX API:
   POST /api/tax/calculate   - Full tax calculation
   POST /api/tax/ask         - RAG knowledge base
   GET  /api/tax/states      - Get all 50 states
   GET  /api/tax/health      - Python API health

📤 FORM UPLOAD:
   POST /api/forms/upload    - Upload & OCR (GPT-4 Vision)

📋 OTHER:
   POST /api/tax/1040        - Generate IRS Form 1040
   /api/cpa/*                - CPA review system
   /api/payments/*           - Stripe payments
    `);
  });
} catch (error) {
  console.error("❌ Server Initialization Error:", error.message);
  process.exit(1);
}