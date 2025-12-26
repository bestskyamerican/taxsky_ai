import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config({ path: "./.env" });

import TaxKnowledge from "./models/TaxKnowledge.js";

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("✅ MongoDB connected");

  // 1. Reset all to non-primary
  await TaxKnowledge.updateMany(
    {},
    { $set: { isPrimary: false } }
  );

  // 2. Mark authoritative rules
  const primaryRules = [
    "STD_DEDUCTION",
    "TAX_BRACKETS",
    "CHILD_TAX_CREDIT",
    "EITC",
    "SELF_EMPLOYMENT_TAX",
    "DEPENDENT_RULES",
    "FILING_STATUS_RULES",
    "RETIREMENT_LIMITS",
    "CA_STD_DEDUCTION",
    "CA_TAX_BRACKETS",
    "CA_CREDITS"
  ];

  const result = await TaxKnowledge.updateMany(
    {
      ruleKey: { $in: primaryRules },
      isActive: true
    },
    { $set: { isPrimary: true } }
  );

  console.log("✅ Primary rules set:", result.modifiedCount);

  await mongoose.disconnect();
  console.log("🔌 Done");
}

run().catch(err => {
  console.error("❌ ERROR:", err.message);
  process.exit(1);
});
