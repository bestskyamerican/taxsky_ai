import express from "express";
import aiRoutes from "./smartAiRoutes.js"; 
import taxRoutes from "./taxRoutes.js";
import fileRoutes from "./fileRoutes.js";
import verificationRoutes from "./verificationRoutes.js";
import debugRoutes from "./debugRoutes.js";

const router = express.Router();

// Combine all routes under /api
router.use("/ai", aiRoutes); // AI-powered routes
router.use("/tax", taxRoutes); // Tax calculation-related routes
router.use("/file", fileRoutes); // File upload and processing routes
router.use("/verification", verificationRoutes); // Verification and validation routes
router.use("/debug", debugRoutes); // Debugging endpoints

export default router;