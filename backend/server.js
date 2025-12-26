import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
// ❌ REMOVED: import fileUpload from "express-fileupload";
// Reason: Conflicts with multer in formsRoutes.js

dotenv.config();

// -------------------------
// MongoDB Connection
// -------------------------
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ MongoDB Connected");
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
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'],
  credentials: true,
}));
app.use(express.json());
// ❌ REMOVED: app.use(fileUpload());
// Reason: formsRoutes.js uses multer for file uploads instead

// -------------------------
// ROUTE HANDLERS
// -------------------------
import authRoutes, { authenticateToken } from "./routes/authRoutes.js";
import irs1040Routes from "./routes/irs1040Routes.js";
import chatRoutes from "./routes/sessionRoutes.js";
import pythonRoutes from "./routes/pythonRoutes.js";
import formRoutes from "./routes/formsRoutes.js";
//import fileRoutes from "./routes/fileRoutes.js";
//import debugRoutes from "./routes/debugRoutes.js";
import resetRoutes from "./routes/resetRoutes.js";
import verificationRoutes from "./routes/verificationRoutes.js";

// ✅ NEW: Smart AI Routes (replaces old aiRoutes)
import smartAiRoutes from "./routes/smartAiRoutes.js";

// -------------------------
// ROUTE MOUNTING
// -------------------------
try {
  // ============================================================
  // PUBLIC ROUTES (No authentication required)
  // ============================================================
  app.use("/api/auth", authRoutes);
  
  // ============================================================
  // PROTECTED ROUTES (Authentication required)
  // ============================================================
  app.use("/api/tax/1040", authenticateToken, irs1040Routes);
  app.use("/api/chat", authenticateToken, chatRoutes);
  app.use("/api/python", authenticateToken, pythonRoutes);
  app.use("/api/forms", authenticateToken, formRoutes);
  //app.use("/api/file", authenticateToken, fileRoutes);
 // app.use("/api/debug", authenticateToken, debugRoutes);
  app.use("/api/reset", authenticateToken, resetRoutes);
  app.use("/api/verification", authenticateToken, verificationRoutes);

  // ✅ NEW: Smart AI Routes (GPT-powered tax assistant)
  app.use("/api/ai", authenticateToken, smartAiRoutes);

  console.log("✅ All routes mounted successfully");
  console.log("🤖 Smart AI: GPT-powered tax assistant ENABLED");
  console.log("🔐 Authentication: ENABLED");
} catch (error) {
  console.error("❌ Route Mounting Error:", error.message);
}

// -------------------------
// Health Check (Public)
// -------------------------
app.get("/health", (req, res) => res.json({ 
  status: "Backend running OK",
  auth: "enabled",
  smartAI: "enabled",
  uptime: process.uptime() 
}));

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
try {
  app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║                    🌤️  TaxSky Server                       ║
╠═══════════════════════════════════════════════════════════╣
║  🚀 Server:     http://localhost:${PORT}                     ║
║  🤖 Smart AI:   GPT-powered ENABLED                       ║
║  🔐 Auth:       Google OAuth ENABLED                      ║
║  📊 Database:   MongoDB Connected                         ║
╚═══════════════════════════════════════════════════════════╝

📌 PUBLIC Endpoints (no login required):
   POST /api/auth/google     - Login with Google
   GET  /api/auth/verify     - Verify token
   GET  /health              - Health check

🤖 SMART AI Endpoints (GPT-powered):
   POST /api/ai/chat         - Smart tax conversation
   POST /api/ai/welcome      - Get welcome message
   POST /api/ai/data         - Get all user data
   POST /api/ai/update       - Update fields
   POST /api/ai/reset        - Reset session

📤 FORM UPLOAD Endpoints:
   POST /api/forms/upload    - Upload & auto-detect forms
   GET  /api/forms/files/:id - Get user's files
   GET  /api/forms/cpa/pending - CPA pending reviews

🔒 OTHER PROTECTED Endpoints:
   /api/tax/1040    - IRS 1040 generation
   /api/chat        - Session management
   /api/file        - File upload
    `);
  });
} catch (error) {
  console.error("❌ Server Initialization Error:", error.message);
  process.exit(1);
}