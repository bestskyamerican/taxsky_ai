// ==========================================================
// sessionDB.js — TaxSky Session Storage
// ✅ FIXED v3: Use only userId (matches TaxSession schema)
// ==========================================================

import TaxSession from "../models/TaxSession.js";

/* -------------------------------------------------------
   GET OR CREATE USER SESSION
------------------------------------------------------- */
export async function getSession(userId) {
  let session = await TaxSession.findOne({ userId: userId });

  if (!session) {
    session = await TaxSession.create({
      userId: userId,
      answers: {},
      forms: {},
      messages: [],
      lastQuestionField: null,
      stepIndex: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    console.log(`✅ Created new session for: ${userId}`);
  }

  // 🔥 Convert Mongo objects → real JS Maps for easier access
  if (!(session.answers instanceof Map)) {
    session.answers = new Map(Object.entries(session.answers || {}));
  }

  if (!(session.forms instanceof Map)) {
    session.forms = new Map(Object.entries(session.forms || {}));
  }

  return session;
}

/* -------------------------------------------------------
   SAVE CHAT MESSAGE
------------------------------------------------------- */
export async function saveMessage(userId, sender, text) {
  await TaxSession.updateOne(
    { userId: userId },
    {
      $push: {
        messages: { sender, text, timestamp: new Date() }
      },
      $set: { updatedAt: new Date() }
    }
  );
}

/* -------------------------------------------------------
   SAVE USER ANSWER (Interview Engine)
   ✅ FIXED: Use updateOne with $set for reliable saves
------------------------------------------------------- */
export async function saveAnswer(userId, key, value) {
  // ✅ Use atomic $set operation - directly updates MongoDB!
  const result = await TaxSession.updateOne(
    { userId: userId },
    { 
      $set: { 
        [`answers.${key}`]: value,
        updatedAt: new Date()
      }
    }
  );

  console.log(`📝 Answer saved: ${userId} → ${key} = ${key.includes('ssn') ? '***' : value}`);
  
  return result;
}

/* -------------------------------------------------------
   SAVE OCR FORM DATA
   Supports MULTIPLE W-2 / 1099 uploads
------------------------------------------------------- */
export async function saveFormData(userId, formType, data) {
  const type = String(formType).toUpperCase();
  
  // ✅ Use atomic $push operation
  const result = await TaxSession.updateOne(
    { userId: userId },
    { 
      $push: { [`forms.${type}`]: data },
      $set: { updatedAt: new Date() }
    }
  );

  console.log(`📄 Form saved: ${userId} → ${type}`);
  
  return result;
}

/* -------------------------------------------------------
   SAVE ENTIRE SESSION (Utility)
   ✅ FIXED: Convert Maps back to Objects before save
------------------------------------------------------- */
export async function saveSession(session) {
  if (!session) {
    throw new Error("Invalid session object");
  }

  // ✅ CRITICAL: Convert Maps to Objects for Mongoose
  if (session.answers instanceof Map) {
    session.answers = Object.fromEntries(session.answers);
    session.markModified('answers');
  }
  
  if (session.forms instanceof Map) {
    session.forms = Object.fromEntries(session.forms);
    session.markModified('forms');
  }

  session.updatedAt = new Date();
  await session.save();

  console.log(`✅ Session saved: ${session.userId}`);
  return session;
}

/* -------------------------------------------------------
   GET FORM DATA (Array)
------------------------------------------------------- */
export async function getForm(userId, formType) {
  const session = await getSession(userId);
  return session.forms.get(String(formType).toUpperCase()) || [];
}

/* -------------------------------------------------------
   GET SINGLE ANSWER
------------------------------------------------------- */
export async function getAnswer(userId, key) {
  const session = await getSession(userId);
  return session.answers.get(key) ?? null;
}

/* -------------------------------------------------------
   CLEAR SESSION (TurboTax "Start Over")
------------------------------------------------------- */
export async function clearSession(userId) {
  await TaxSession.updateOne(
    { userId: userId },
    { 
      $set: { 
        answers: {},
        forms: {},
        messages: [],
        lastQuestionField: null,
        stepIndex: 0,
        updatedAt: new Date()
      }
    }
  );

  console.log(`🗑️ Session cleared for ${userId}`);
}

/* -------------------------------------------------------
   DEBUG SESSION (Developer Tool)
------------------------------------------------------- */
export async function debugSession(userId) {
  const session = await getSession(userId);

  console.log(`\n🔍 DEBUG SESSION → ${userId}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  console.log("📋 ANSWERS:");
  session.answers.forEach((v, k) => console.log(`  ${k}: ${v}`));

  console.log("\n📄 FORMS:");
  session.forms.forEach((v, k) =>
    console.log(`  ${k}: ${JSON.stringify(v, null, 2)}`)
  );

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  return session;
}