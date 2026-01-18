export function normalizeSession(session) {
  // 🔥 Force Map
  if (!(session.answers instanceof Map)) {
    session.answers = new Map(Object.entries(session.answers || {}));
  }

  if (!(session.forms instanceof Map)) {
    session.forms = new Map(Object.entries(session.forms || {}));
  }

  const w2List = session.forms.get("W2");
  if (!Array.isArray(w2List) || w2List.length === 0) return;

  const w2 = w2List[w2List.length - 1];
  const answers = session.answers;

  /* -----------------------------
     NAME
  ----------------------------- */
  if (!answers.get("first_name") && w2["Employee's first name and initial"]) {
    answers.set("first_name", w2["Employee's first name and initial"]);
  }

  if (!answers.get("last_name") && w2["Employee's last name"]) {
    answers.set("last_name", w2["Employee's last name"]);
  }

  /* -----------------------------
     SSN
  ----------------------------- */
  if (!answers.get("ssn") && w2["Employee's social security number"]) {
    answers.set("ssn", w2["Employee's social security number"]);
  }

  /* -----------------------------
     W-2 INCOME
  ----------------------------- */
  if (
    !answers.get("w2_income") &&
    w2["Wages, tips, other compensation"]
  ) {
    answers.set(
      "w2_income",
      Number(
        w2["Wages, tips, other compensation"].replace(/,/g, "")
      )
    );
  }

  /* -----------------------------
     FEDERAL WITHHOLDING
  ----------------------------- */
  if (
    !answers.get("withholding") &&
    w2["Federal income tax withheld"]
  ) {
    answers.set(
      "withholding",
      Number(
        w2["Federal income tax withheld"].replace(/,/g, "")
      )
    );
  }

  console.log("✅ normalizeSession applied (REAL W-2 FORMAT)");
}
