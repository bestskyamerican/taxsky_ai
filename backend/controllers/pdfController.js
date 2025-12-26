import { generateIRS1040 } from "../services/pdfServices.js";
import { getSession } from "../services/sessionServices.js";

/**
 * GET /pdf/1040
 * Generate IRS Form 1040 dynamically based on user session.
 */
export async function generateIRSForm1040(req, res) {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ success: false, message: "userId is required for generating Form 1040." });
    }

    const session = await getSession(userId);

    // Fetch user session to check required fields/data
    const missingFields = checkMissingData(session);
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot generate Form 1040. Missing fields: ${missingFields.join(", ")}`,
      });
    }

    // Generate and return the PDF
    const formPdf = await generateIRS1040(session);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=IRS_Form_1040_${userId}.pdf`);
    return res.send(formPdf);
  } catch (err) {
    console.error("❌ Generate IRS Form 1040 Error:", err.message || err);
    res.status(500).json({
      success: false,
      message: "Failed to generate IRS Form 1040.",
      error: err.message,
    });
  }
}

/**
 * HELPER: Check session for missing data needed for Form 1040.
 */
function checkMissingData(session) {
  const REQUIRED_FIELDS = [
    "filing_status",
    "dependents",
    "w2_income",
    "self_employed_income",
    "interest_income",
  ];

  return REQUIRED_FIELDS.filter((field) => !session.answers.get(field));
}