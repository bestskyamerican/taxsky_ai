import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";

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

// ✅ Stripe webhook needs raw body - must be BEFORE express.json()
import paymentRoutes from './routes/paymentRoutes.js';
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));

app.use(express.json());

// Serve uploaded files
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// -------------------------
// ROUTE HANDLERS
// -------------------------
import authRoutes, { authenticateToken } from "./routes/authRoutes.js";
import irs1040Routes from "./routes/irs1040Routes.js";
import chatRoutes from "./routes/sessionRoutes.js";
import pythonRoutes from "./routes/pythonRoutes.js";
import formRoutes from "./routes/formsRoutes.js";
import resetRoutes from "./routes/resetRoutes.js";
import verificationRoutes from "./routes/verificationRoutes.js";
import smartAiRoutes from "./routes/smartAiRoutes.js";
import cpaRoutes from './routes/cpaRoutes.js';

// -------------------------
// ROUTE MOUNTING
// -------------------------
try {
  // ============================================================
  // PUBLIC ROUTES
  // ============================================================
  app.use("/api/auth", authRoutes);
  app.use('/api/cpa', cpaRoutes);
  
  // ✅ Payment routes (some public, some protected)
  app.use('/api/payments', paymentRoutes);
  
  // ============================================================
  // PROTECTED ROUTES
  // ============================================================
  app.use("/api/tax/1040", authenticateToken, irs1040Routes);
  app.use("/api/chat", authenticateToken, chatRoutes);
  app.use("/api/python", authenticateToken, pythonRoutes);
  app.use("/api/forms", authenticateToken, formRoutes);
  app.use("/api/reset", authenticateToken, resetRoutes);
  app.use("/api/verification", authenticateToken, verificationRoutes);
  app.use("/api/ai", authenticateToken, smartAiRoutes);

  console.log("✅ All routes mounted successfully");
  console.log("🤖 Smart AI: ENABLED");
  console.log("💳 Payments: ENABLED");
  console.log("👔 CPA Dashboard: ENABLED");
} catch (error) {
  console.error("❌ Route Mounting Error:", error.message);
}

// -------------------------
// Health Check
// -------------------------
app.get("/health", (req, res) => res.json({ 
  status: "Backend running OK",
  payments: "enabled",
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
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                    🌤️  TaxSky Server                       ║
╠═══════════════════════════════════════════════════════════╣
║  🚀 Server:     http://localhost:${PORT}                     ║
║  🤖 Smart AI:   GPT-powered ENABLED                       ║
║  💳 Payments:   Stripe ENABLED                            ║
║  👔 CPA:        Dashboard ENABLED                         ║
║  📊 Database:   MongoDB Connected                         ║
╚═══════════════════════════════════════════════════════════╝

💳 PAYMENT Endpoints:
   GET  /api/payments/pricing        - Get pricing plans
   POST /api/payments/create-intent  - Create payment
   POST /api/payments/confirm        - Confirm payment
   GET  /api/payments/user/:id       - User's payments
   GET  /api/payments/access/:id     - Check access level

📌 PRICING:
   Basic:    FREE    - Federal only
   Standard: $29.99  - Federal + State
   Premium:  $49.99  - Full service + CPA
  `);
});
