/**
 * Safely parse JSON with error handling.
 */
export function safeJSONParse(str) {
  try {
    return JSON.parse(str);
  } catch (e) {
    console.error("Invalid JSON string:", str);
    return null;
  }
}

/**
 * Format refund or tax owed results for frontend display.
 */
export function formatTaxResults(results) {
  return {
    refund: `$${results.refund.toFixed(2)}`,
    taxDue: `$${results.taxDue.toFixed(2)}`,
    status: results.readyToFile ? "Ready to File" : "Incomplete",
  };
}