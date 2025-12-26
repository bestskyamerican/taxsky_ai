export const interviewSteps = [
  {
    key: "filing_status",
    question: "What is your filing status? (Single, Married Filing Jointly, Married Filing Separately, Head of Household)",
    required: true
  },
  {
    key: "dependents",
    question: "How many dependents do you claim?",
    required: true
  },
  {
    key: "w2_income",
    question: "Please upload your W-2, or enter your W-2 income.",
    required: false,
    autoSkipIf: "forms.W2"
  },
  {
    key: "self_employed_income",
    question: "Do you have any self-employment (1099-NEC) income?",
    required: false,
    autoSkipIf: "forms['1099-NEC']"
  },
  {
    key: "interest_income",
    question: "Did you earn any interest income (e.g., 1099-INT)?",
    required: false,
    autoSkipIf: "forms['1099-INT']"
  },
  {
    key: "education_expense",
    question: "Did you pay for any education expenses?",
    required: false
  },
  {
    key: "final_review",
    question: "Do you want me to review your tax return before generating the 1040?",
    type: "confirm"
  }
];
