import express from "express";
import { calculateTaxes, getTaxRefund } from "../controllers/taxController.js";

const router = express.Router();

/**
 * POST /api/tax/calculate
 * Calculate federal and state taxes based on user session.
 */
router.post("/calculate", calculateTaxes);

/**
 * GET /api/tax/refund
 * Fetch user's current refund estimation.
 */
router.get("/refund", getTaxRefund);

export default router;