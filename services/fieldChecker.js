// ============================================================
// FIELD CHECKER SERVICE
// ============================================================
// Comprehensive check for ALL required 1040 fields
// Shows exactly what's missing and what's been collected
// ============================================================

/**
 * Complete field mapping for Form 1040
 * Maps our database fields to IRS 1040 lines
 */
const FIELD_REQUIREMENTS = {
  // ============================================================
  // PERSONAL INFORMATION (Required)
  // ============================================================
  personal: {
    label: "Personal Information",
    required: true,
    fields: {
      first_name: { 
        label: "First Name", 
        line: "Name field",
        alternates: ["employee_name"],
        required: true 
      },
      last_name: { 
        label: "Last Name", 
        line: "Name field",
        required: true 
      },
      ssn: { 
        label: "Social Security Number", 
        line: "SSN field",
        alternates: ["employee_ssa_number", "employee_ssn"],
        required: true,
        validate: (val) => {
          if (!val) return false;
          const clean = val.replace(/\D/g, '');
          return clean.length === 9;
        }
      },
      date_of_birth: { 
        label: "Date of Birth", 
        line: "Not on 1040 but needed",
        required: true 
      },
      address: { 
        label: "Street Address", 
        line: "Address field",
        alternates: ["employee_address"],
        required: true 
      },
      city: { 
        label: "City", 
        line: "City field",
        alternates: ["employee_city"],
        required: true 
      },
      state: { 
        label: "State", 
        line: "State field",
        alternates: ["employee_state"],
        required: true,
        validate: (val) => val && val.length === 2
      },
      zip: { 
        label: "ZIP Code", 
        line: "ZIP field",
        alternates: ["employee_zip"],
        required: true,
        validate: (val) => val && /^\d{5}(-\d{4})?$/.test(val.toString())
      },
    }
  },

  // ============================================================
  // FILING STATUS (Required)
  // ============================================================
  filing: {
    label: "Filing Status",
    required: true,
    fields: {
      filing_status: { 
        label: "Filing Status", 
        line: "Filing Status checkbox",
        required: true,
        validate: (val) => ['single', 'married_filing_jointly', 'married_filing_separately', 'head_of_household', 'qualifying_surviving_spouse'].includes(val)
      },
    }
  },

  // ============================================================
  // SPOUSE INFO (Required if MFJ)
  // ============================================================
  spouse: {
    label: "Spouse Information",
    required: false, // Conditionally required
    condition: (data) => data.filing_status === 'married_filing_jointly',
    fields: {
      spouse_first_name: { 
        label: "Spouse First Name", 
        line: "Spouse name field",
        required: true 
      },
      spouse_last_name: { 
        label: "Spouse Last Name", 
        line: "Spouse name field",
        required: true 
      },
      spouse_ssn: { 
        label: "Spouse SSN", 
        line: "Spouse SSN field",
        required: true,
        validate: (val) => {
          if (!val) return false;
          const clean = val.replace(/\D/g, '');
          return clean.length === 9;
        }
      },
    }
  },

  // ============================================================
  // DEPENDENTS (Required if claimed)
  // ============================================================
  dependents: {
    label: "Dependents",
    required: false,
    condition: (data) => parseInt(data.dependent_count) > 0,
    fields: {
      dependent_count: { 
        label: "Number of Dependents", 
        line: "Dependents section",
        alternates: ["dependents"],
        required: false 
      },
    },
    // Dynamic fields based on count
    dynamicFields: (data) => {
      const count = parseInt(data.dependent_count || data.dependents) || 0;
      const fields = {};
      for (let i = 1; i <= Math.min(count, 4); i++) {
        fields[`dependent_${i}_name`] = {
          label: `Dependent ${i} Name`,
          line: `Dependents Row ${i}`,
          required: true
        };
        fields[`dependent_${i}_ssn`] = {
          label: `Dependent ${i} SSN`,
          line: `Dependents Row ${i}`,
          required: true,
          validate: (val) => {
            if (!val) return false;
            const clean = val.replace(/\D/g, '');
            return clean.length === 9;
          }
        };
        fields[`dependent_${i}_relationship`] = {
          label: `Dependent ${i} Relationship`,
          line: `Dependents Row ${i}`,
          required: false
        };
        fields[`dependent_${i}_dob`] = {
          label: `Dependent ${i} Date of Birth`,
          line: `For CTC qualification`,
          required: false
        };
      }
      return fields;
    }
  },

  // ============================================================
  // INCOME - W-2 (At least one income source required)
  // ============================================================
  w2_income: {
    label: "W-2 Wage Income",
    required: false,
    fields: {
      total_wages: { 
        label: "Total W-2 Wages", 
        line: "Line 1a",
        alternates: ["w2_income", "wages"],
        required: false 
      },
      total_withheld: { 
        label: "Federal Tax Withheld", 
        line: "Line 25a",
        alternates: ["federal_withholding", "withholding"],
        required: false 
      },
      total_state_withheld: { 
        label: "State Tax Withheld", 
        line: "State return",
        required: false 
      },
    }
  },

  // ============================================================
  // INCOME - 1099-INT (Interest)
  // ============================================================
  interest_income: {
    label: "Interest Income (1099-INT)",
    required: false,
    fields: {
      total_interest: { 
        label: "Taxable Interest", 
        line: "Line 2b",
        alternates: ["interest_income", "taxable_interest"],
        required: false 
      },
    }
  },

  // ============================================================
  // INCOME - 1099-DIV (Dividends)
  // ============================================================
  dividend_income: {
    label: "Dividend Income (1099-DIV)",
    required: false,
    fields: {
      total_dividends: { 
        label: "Ordinary Dividends", 
        line: "Line 3b",
        alternates: ["ordinary_dividends", "dividend_income"],
        required: false 
      },
      total_qualified_dividends: { 
        label: "Qualified Dividends", 
        line: "Line 3a",
        required: false 
      },
    }
  },

  // ============================================================
  // INCOME - 1099-NEC (Self-Employment)
  // ============================================================
  self_employment: {
    label: "Self-Employment Income (1099-NEC)",
    required: false,
    fields: {
      total_self_employment: { 
        label: "Self-Employment Income", 
        line: "Schedule C → Line 8",
        alternates: ["self_employed_income", "nec_income"],
        required: false 
      },
    }
  },

  // ============================================================
  // INCOME - 1099-R (Retirement)
  // ============================================================
  retirement_income: {
    label: "Retirement Income (1099-R)",
    required: false,
    fields: {
      total_retirement: { 
        label: "Retirement Distributions", 
        line: "Line 4b/5b",
        required: false 
      },
      total_retirement_withheld: { 
        label: "Tax Withheld (1099-R)", 
        line: "Line 25b",
        required: false 
      },
    }
  },

  // ============================================================
  // INCOME - SSA-1099 (Social Security)
  // ============================================================
  social_security: {
    label: "Social Security Benefits (SSA-1099)",
    required: false,
    fields: {
      total_social_security: { 
        label: "Social Security Benefits", 
        line: "Line 6a",
        required: false 
      },
    }
  },

  // ============================================================
  // INCOME - 1099-B (Capital Gains)
  // ============================================================
  capital_gains: {
    label: "Capital Gains (1099-B)",
    required: false,
    fields: {
      total_capital_gains: { 
        label: "Capital Gain/Loss", 
        line: "Line 7",
        alternates: ["capital_gain"],
        required: false 
      },
    }
  },

  // ============================================================
  // INCOME - 1099-G (Unemployment)
  // ============================================================
  unemployment: {
    label: "Unemployment Income (1099-G)",
    required: false,
    fields: {
      total_unemployment: { 
        label: "Unemployment Compensation", 
        line: "Schedule 1",
        required: false 
      },
    }
  },

  // ============================================================
  // DEDUCTIONS - 1098 (Mortgage Interest)
  // ============================================================
  mortgage: {
    label: "Mortgage Interest (1098)",
    required: false,
    fields: {
      total_mortgage_interest: { 
        label: "Mortgage Interest Paid", 
        line: "Schedule A",
        required: false 
      },
    }
  },

  // ============================================================
  // DEDUCTIONS - 1098-E (Student Loan Interest)
  // ============================================================
  student_loan: {
    label: "Student Loan Interest (1098-E)",
    required: false,
    fields: {
      total_student_loan_interest: { 
        label: "Student Loan Interest", 
        line: "Schedule 1 (max $2,500)",
        required: false 
      },
    }
  },

  // ============================================================
  // DEDUCTIONS - 1098-T (Tuition)
  // ============================================================
  tuition: {
    label: "Tuition (1098-T)",
    required: false,
    fields: {
      total_tuition: { 
        label: "Tuition Paid", 
        line: "Education Credit",
        required: false 
      },
    }
  },

  // ============================================================
  // BANK INFO (For Direct Deposit - Optional)
  // ============================================================
  bank: {
    label: "Bank Information (Direct Deposit)",
    required: false,
    fields: {
      routing_number: { 
        label: "Routing Number", 
        line: "Line 35b",
        required: false,
        validate: (val) => !val || /^\d{9}$/.test(val)
      },
      account_number: { 
        label: "Account Number", 
        line: "Line 35d",
        required: false 
      },
      account_type: { 
        label: "Account Type (Checking/Savings)", 
        line: "Line 35c",
        required: false 
      },
    }
  },
};

/**
 * Check all fields and return comprehensive report
 */
export function checkAllFields(sessionData) {
  const data = sessionData || {};
  const report = {
    complete: [],
    missing: [],
    warnings: [],
    optional: [],
    sections: {},
    summary: {
      totalRequired: 0,
      totalComplete: 0,
      totalMissing: 0,
      totalWarnings: 0,
      percentComplete: 0,
      hasIncome: false,
      readyToFile: false
    }
  };

  // Helper to get value (checks alternates)
  const getValue = (fieldName, fieldDef) => {
    let value = data[fieldName];
    if (value === undefined && fieldDef.alternates) {
      for (const alt of fieldDef.alternates) {
        if (data[alt] !== undefined) {
          value = data[alt];
          break;
        }
      }
    }
    return value;
  };

  // Check if has value
  const hasValue = (val) => {
    if (val === undefined || val === null || val === '') return false;
    if (typeof val === 'number') return !isNaN(val);
    return true;
  };

  // Process each section
  for (const [sectionKey, section] of Object.entries(FIELD_REQUIREMENTS)) {
    const sectionReport = {
      label: section.label,
      required: section.required,
      complete: [],
      missing: [],
      warnings: [],
      isComplete: true
    };

    // Check if section applies (conditional sections)
    let sectionApplies = true;
    if (section.condition) {
      sectionApplies = section.condition(data);
    }

    if (!sectionApplies) {
      sectionReport.skipped = true;
      sectionReport.reason = "Not applicable based on your filing status";
      report.sections[sectionKey] = sectionReport;
      continue;
    }

    // Get all fields (static + dynamic)
    let allFields = { ...section.fields };
    if (section.dynamicFields) {
      allFields = { ...allFields, ...section.dynamicFields(data) };
    }

    // Check each field
    for (const [fieldName, fieldDef] of Object.entries(allFields)) {
      const value = getValue(fieldName, fieldDef);
      const hasVal = hasValue(value);
      
      // Validate if has value and validator
      let isValid = true;
      if (hasVal && fieldDef.validate) {
        isValid = fieldDef.validate(value);
      }

      const fieldInfo = {
        field: fieldName,
        label: fieldDef.label,
        line: fieldDef.line,
        value: hasVal ? (fieldDef.label.includes('SSN') ? '***' : value) : null,
        required: fieldDef.required && (section.required || sectionApplies)
      };

      if (hasVal && isValid) {
        sectionReport.complete.push(fieldInfo);
        report.complete.push(fieldInfo);
      } else if (fieldDef.required && (section.required || sectionApplies)) {
        sectionReport.missing.push(fieldInfo);
        sectionReport.isComplete = false;
        report.missing.push(fieldInfo);
        report.summary.totalMissing++;
      } else if (hasVal && !isValid) {
        fieldInfo.issue = "Invalid format";
        sectionReport.warnings.push(fieldInfo);
        report.warnings.push(fieldInfo);
        report.summary.totalWarnings++;
      } else {
        report.optional.push(fieldInfo);
      }

      if (fieldDef.required && section.required) {
        report.summary.totalRequired++;
        if (hasVal && isValid) {
          report.summary.totalComplete++;
        }
      }
    }

    report.sections[sectionKey] = sectionReport;
  }

  // Check if has any income
  const incomeFields = [
    'total_wages', 'total_interest', 'total_dividends', 
    'total_self_employment', 'total_retirement', 'total_social_security',
    'total_capital_gains', 'total_unemployment', 'total_other_income'
  ];
  report.summary.hasIncome = incomeFields.some(f => {
    const val = parseFloat(data[f]);
    return !isNaN(val) && val !== 0;
  });

  if (!report.summary.hasIncome) {
    report.missing.push({
      field: 'income',
      label: 'At least one income source required',
      line: 'Income Section',
      required: true
    });
    report.summary.totalMissing++;
  }

  // Calculate percentage
  report.summary.percentComplete = report.summary.totalRequired > 0
    ? Math.round((report.summary.totalComplete / report.summary.totalRequired) * 100)
    : 0;

  // Ready to file?
  report.summary.readyToFile = report.summary.totalMissing === 0 && report.summary.hasIncome;

  return report;
}

/**
 * Format the report as a readable message
 */
export function formatFieldReport(report) {
  let msg = '';

  // Header
  if (report.summary.readyToFile) {
    msg += '✅ <b>Ready to Generate 1040!</b>\n\n';
  } else {
    msg += '❌ <b>Missing Required Information</b>\n\n';
    msg += `Progress: ${report.summary.percentComplete}% complete\n`;
    msg += `Missing: ${report.summary.totalMissing} required field(s)\n\n`;
  }

  // Missing fields by section
  if (report.missing.length > 0) {
    msg += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
    msg += '<b>❌ MISSING (Required):</b>\n\n';
    
    const bySection = {};
    for (const [sectionKey, section] of Object.entries(report.sections)) {
      if (section.missing && section.missing.length > 0) {
        bySection[section.label] = section.missing;
      }
    }
    
    for (const [sectionLabel, fields] of Object.entries(bySection)) {
      msg += `<b>${sectionLabel}:</b>\n`;
      fields.forEach(f => {
        msg += `  • ${f.label} → ${f.line}\n`;
      });
      msg += '\n';
    }
  }

  // Warnings
  if (report.warnings.length > 0) {
    msg += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
    msg += '<b>⚠️ WARNINGS:</b>\n';
    report.warnings.forEach(w => {
      msg += `  • ${w.label}: ${w.issue}\n`;
    });
    msg += '\n';
  }

  // Completed fields
  msg += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
  msg += '<b>✅ COLLECTED:</b>\n\n';

  for (const [sectionKey, section] of Object.entries(report.sections)) {
    if (section.skipped) continue;
    if (section.complete && section.complete.length > 0) {
      msg += `<b>${section.label}:</b>\n`;
      section.complete.forEach(f => {
        const displayVal = f.value !== null ? f.value : '✓';
        msg += `  ✓ ${f.label}: ${displayVal}\n`;
      });
      msg += '\n';
    }
  }

  // Summary
  msg += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
  msg += '<b>📊 SUMMARY:</b>\n';
  msg += `  Total Required: ${report.summary.totalRequired}\n`;
  msg += `  Completed: ${report.summary.totalComplete}\n`;
  msg += `  Missing: ${report.summary.totalMissing}\n`;
  msg += `  Has Income: ${report.summary.hasIncome ? 'Yes' : 'No'}\n`;
  msg += `  Ready to File: ${report.summary.readyToFile ? '✅ Yes' : '❌ No'}\n`;

  return msg;
}

/**
 * Get list of questions to ask for missing fields
 */
export function getMissingFieldQuestions(report) {
  const questions = [];

  for (const missing of report.missing) {
    const question = {
      field: missing.field,
      label: missing.label,
      question: getQuestionForField(missing.field),
      type: getInputTypeForField(missing.field),
      validation: getValidationForField(missing.field)
    };
    questions.push(question);
  }

  return questions;
}

function getQuestionForField(field) {
  const questions = {
    first_name: "What is your first name?",
    last_name: "What is your last name?",
    ssn: "What is your Social Security Number? (XXX-XX-XXXX)",
    date_of_birth: "What is your date of birth? (MM/DD/YYYY)",
    address: "What is your street address?",
    city: "What city do you live in?",
    state: "What state do you live in? (2-letter code, e.g., CA)",
    zip: "What is your ZIP code?",
    filing_status: "What is your filing status?\n1. Single\n2. Married Filing Jointly\n3. Married Filing Separately\n4. Head of Household",
    spouse_first_name: "What is your spouse's first name?",
    spouse_last_name: "What is your spouse's last name?",
    spouse_ssn: "What is your spouse's Social Security Number?",
    dependent_count: "How many dependents do you have?",
    income: "Please upload a W-2, 1099, or other income document",
  };

  // Handle dependent fields
  if (field.startsWith('dependent_')) {
    const match = field.match(/dependent_(\d+)_(\w+)/);
    if (match) {
      const num = match[1];
      const type = match[2];
      if (type === 'name') return `What is dependent ${num}'s full name?`;
      if (type === 'ssn') return `What is dependent ${num}'s Social Security Number?`;
      if (type === 'relationship') return `What is dependent ${num}'s relationship to you?`;
      if (type === 'dob') return `What is dependent ${num}'s date of birth?`;
    }
  }

  return questions[field] || `Please provide your ${field.replace(/_/g, ' ')}`;
}

function getInputTypeForField(field) {
  if (field.includes('ssn')) return 'ssn';
  if (field.includes('date') || field.includes('dob')) return 'date';
  if (field === 'state') return 'state';
  if (field === 'zip') return 'zip';
  if (field === 'filing_status') return 'select';
  if (field.includes('count') || field.includes('number')) return 'number';
  return 'text';
}

function getValidationForField(field) {
  if (field.includes('ssn')) return { pattern: '^\\d{3}-?\\d{2}-?\\d{4}$', message: 'Enter 9 digits' };
  if (field === 'state') return { pattern: '^[A-Z]{2}$', message: 'Enter 2-letter state code' };
  if (field === 'zip') return { pattern: '^\\d{5}(-\\d{4})?$', message: 'Enter 5-digit ZIP' };
  return null;
}

export default { checkAllFields, formatFieldReport, getMissingFieldQuestions };
