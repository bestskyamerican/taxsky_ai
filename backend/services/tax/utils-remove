// backend/tax/utils.js
export function getMissing(session) {
  const REQUIRED_FIELDS = [
    "first_name",
    "last_name",
    "ssn",
    "filing_status",
    "dependents",
    "w2_income",
    "self_employed_income",
    "interest_income",
    "withholding"
  ];

  const ans = session.answers || new Map();

  return REQUIRED_FIELDS.filter(f => {
    return (!ans.has(f) || ans.get(f) === "" || ans.get(f) === null);
  });
}
