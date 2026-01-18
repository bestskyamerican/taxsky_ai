// ============================================================
// SESSION SERVICES - Re-exports from sessionDB.js
// ============================================================
// This file exists for backward compatibility.
// All session functions now come from sessionDB.js
// ============================================================

import { getSession, saveAnswer, saveSession } from "../tax/sessionDB.js";

/**
 * Get session data for a user.
 */
export async function getUserSession(userId) {
  if (!userId) throw new Error("User ID is required");
  return await getSession(userId);
}

/**
 * Save/update session data.
 */
export async function updateUserSession(userId, key, value) {
  if (!userId || !key) throw new Error("User ID and key required");
  await saveAnswer(userId, key, value);
}

/**
 * Clear session data for a user.
 */
export async function clearUserSession(userId) {
  if (!userId) throw new Error("User ID is required");
  const session = await getSession(userId);
  session.answers = new Map();
  session.forms = new Map();
  await session.save();
}

// Re-export everything from sessionDB
export { getSession, saveAnswer, saveSession };

export default {
  getUserSession,
  updateUserSession,
  clearUserSession,
  getSession,
  saveAnswer,
  saveSession
};
