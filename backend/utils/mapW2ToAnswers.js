export function mapWW2ToAnswers(w2) {
  if (!w2) return {};

  return {
    w2_income:
      Number(
        w2["Wages, tips, other comp."] ||
        w2["Wages, Tips, Other Compensation"] ||
        w2["Wages, tips, other compensation"]
      ) || null,

    withholding:
      Number(
        w2["Federal income tax withheld"] ||
        w2["Federal Income Tax Withheld"]
      ) || null
  };
}
