import express from "express";
import { clearSession } from "../tax/sessionDB.js";

const router = express.Router();

/**
 * POST /admin/reset
 * Clears the user's tax session completely
 */
router.post("/", async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    await clearSession(userId);

    return res.json({
      status: "session cleared",
      userId
    });

  } catch (err) {
    console.error("❌ Reset Error:", err);
    return res.status(500).json({ error: err.message });
  }
});

export default router;
