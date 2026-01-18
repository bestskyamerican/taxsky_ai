// ============================================================
// STATE TAX ROUTES - INDEX
// Exports all state tax form routes
// ============================================================
import express from "express";
import ca540Routes from "./ca540Routes.js";
// Import other state routes as you add them:
// import ny201Routes from "./ny201Routes.js";
// import tx540Routes from "./tx540Routes.js";

const router = express.Router();

// ============================================================
// REGISTER STATE ROUTES
// Each state has its own sub-route
// ============================================================

// California - Form 540
router.use("/ca", ca540Routes);

// Add more states here:
// router.use("/ny", ny201Routes);  // New York - Form IT-201
// router.use("/tx", txRoutes);     // Texas - No state income tax
// router.use("/fl", flRoutes);     // Florida - No state income tax
// router.use("/wa", waRoutes);     // Washington - No state income tax
// router.use("/az", az140Routes);  // Arizona - Form 140
// router.use("/nv", nvRoutes);     // Nevada - No state income tax

// ============================================================
// GET LIST OF SUPPORTED STATES
// ============================================================
router.get("/supported", (req, res) => {
  res.json({
    supported_states: [
      { code: "CA", name: "California", form: "540", endpoint: "/api/tax/state/ca/generate/:sessionId" },
      // Add more as you implement them
    ],
    no_income_tax_states: ["TX", "FL", "WA", "NV", "WY", "SD", "AK", "TN", "NH"]
  });
});

export default router;
