// ============================================================
// PYTHON TAX CALCULATOR - Node.js Wrapper (Windows Compatible)
// ============================================================
// Location: backend/services/tax/pythonCalculator.js
//
// ✅ FIXED: Now passes has_dependents and dependents array
// ✅ FIXED: Includes CTC validation fields in response
// ============================================================

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================
// CONFIGURATION
// ============================================================
const PYTHON_CMD = process.platform === 'win32' ? 'python' : 'python3';
const PYTHON_SCRIPT = path.resolve(__dirname, '../../../python_service/tax_engine/calculate_cli.py');

console.log(`[PythonTax] Python command: ${PYTHON_CMD}`);
console.log(`[PythonTax] Script path: ${PYTHON_SCRIPT}`);

// ============================================================
// CALL PYTHON TAX CALCULATOR
// ============================================================
export async function calculateTaxPython(taxData) {
  return new Promise((resolve, reject) => {
    console.log('[PythonTax] Starting Python process...');
    console.log('[PythonTax] Input data:', JSON.stringify(taxData, null, 2));
    
    const python = spawn(PYTHON_CMD, [PYTHON_SCRIPT], {
      cwd: path.dirname(path.dirname(PYTHON_SCRIPT))
    });
    
    let stdout = '';
    let stderr = '';
    
    python.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    python.stderr.on('data', (data) => {
      stderr += data.toString();
      console.log('[PythonTax] stderr:', data.toString());
    });
    
    python.on('close', (code) => {
      console.log(`[PythonTax] Process exited with code ${code}`);
      
      if (stderr) {
        console.log('[PythonTax] Python stderr:', stderr);
      }
      
      if (code !== 0 && !stdout) {
        reject(new Error(`Python exited with code ${code}: ${stderr}`));
        return;
      }
      
      try {
        const result = JSON.parse(stdout);
        
        if (result.error) {
          console.error('[PythonTax] Python error:', result.error);
          if (result.traceback) {
            console.error('[PythonTax] Traceback:', result.traceback);
          }
        }
        
        resolve(result);
      } catch (e) {
        console.error('[PythonTax] Failed to parse output:', stdout);
        reject(new Error(`Failed to parse Python output: ${e.message}`));
      }
    });
    
    python.on('error', (err) => {
      console.error('[PythonTax] Failed to start Python:', err);
      reject(new Error(`Failed to start Python: ${err.message}`));
    });
    
    const inputJson = JSON.stringify(taxData);
    python.stdin.write(inputJson);
    python.stdin.end();
  });
}

// ============================================================
// CALCULATE FULL TAX (Main Export)
// ============================================================
export async function calculateFullTax(session, userState = 'CA') {
  console.log('[PythonTax] calculateFullTax called for state:', userState);
  
  // Helper to get value from session (handles both Map and Object)
  const getVal = (key, ...altKeys) => {
    const keys = [key, ...altKeys];
    
    for (const k of keys) {
      let val;
      
      // Check answers
      if (session.answers instanceof Map) {
        val = session.answers.get(k);
      } else if (session.answers) {
        val = session.answers[k];
      }
      if (val !== undefined && val !== null && val !== '') return val;
      
      // Check normalizedData
      const nd = session.normalizedData || {};
      if (nd.personal?.[k]) return nd.personal[k];
      if (nd.income?.[k]) return nd.income[k];
      if (nd.dependents?.[k]) return nd.dependents[k];
    }
    
    return null;
  };
  
  // Helper to parse numbers
  const parseNum = (val) => {
    if (!val) return 0;
    if (typeof val === 'number') return val;
    return parseFloat(String(val).replace(/[$,]/g, '')) || 0;
  };
  
  // ============================================================
  // EXTRACT W-2 DATA
  // ============================================================
  let totalWages = 0;
  let federalWithholding = 0;
  let stateWithholding = 0;
  
  const w2Array = session.normalizedData?.income?.w2 || [];
  
  if (w2Array.length > 0) {
    console.log(`[PythonTax] Found ${w2Array.length} W-2(s)`);
    w2Array.forEach((w2, i) => {
      console.log(`[PythonTax] W-2 #${i + 1}: wages=${w2.wages}, fed_wh=${w2.federal_withholding}, state_wh=${w2.state_withholding}`);
      totalWages += parseNum(w2.wages);
      federalWithholding += parseNum(w2.federal_withholding);
      stateWithholding += parseNum(w2.state_withholding);
    });
  } else {
    totalWages = parseNum(getVal('wages', 'w2_wages', 'w2_income', 'w2Income', 'total_wages'));
    federalWithholding = parseNum(getVal('federal_withholding', 'federalWithholding', 'fed_withholding', 'federal_withheld', 'total_withheld'));
    stateWithholding = parseNum(getVal('state_withholding', 'stateWithholding', 'ca_withholding', 'state_withheld', 'total_state_withheld'));
  }
  
  // ════════════════════════════════════════════════════════════
  // ⚠️ CRITICAL FIX: EXTRACT DEPENDENT DATA PROPERLY
  // ════════════════════════════════════════════════════════════
  
  // Get has_dependents flag (explicit user answer)
  let hasDependents = getVal('has_dependents', 'hasDependents');
  
  // Normalize to boolean
  if (hasDependents === 'false' || hasDependents === 'no' || hasDependents === 'No' || hasDependents === false) {
    hasDependents = false;
  } else if (hasDependents === 'true' || hasDependents === 'yes' || hasDependents === 'Yes' || hasDependents === true) {
    hasDependents = true;
  } else {
    hasDependents = null; // Not explicitly set
  }
  
  // Get dependents array
  let dependentsArray = getVal('dependents') || 
                        session.normalizedData?.dependents?.list ||
                        session.normalizedData?.dependents ||
                        [];
  
  // Ensure it's an array
  if (!Array.isArray(dependentsArray)) {
    dependentsArray = [];
  }
  
  // Count children under 17 from array
  let childrenUnder17 = 0;
  let otherDependents = 0;
  
  if (dependentsArray.length > 0) {
    dependentsArray.forEach(dep => {
      if (typeof dep === 'object' && dep !== null) {
        const age = parseInt(dep.age) || 99;
        if (age < 17) {
          childrenUnder17++;
        } else {
          otherDependents++;
        }
      }
    });
    console.log(`[PythonTax] Dependents from array: ${childrenUnder17} under 17, ${otherDependents} other`);
  } else if (hasDependents !== false) {
    // Fallback to legacy numeric fields ONLY if user didn't explicitly say "no dependents"
    childrenUnder17 = parseInt(getVal('qualifying_children_under_17', 'children_under_17', 'num_children', 'dependent_count')) || 0;
    otherDependents = parseInt(getVal('other_dependents', 'otherDependents')) || 0;
    console.log(`[PythonTax] Dependents from legacy fields: ${childrenUnder17} under 17, ${otherDependents} other`);
  }
  
  // ⚠️ CRITICAL: If user explicitly said NO dependents, force to 0
  if (hasDependents === false) {
    console.log('[PythonTax] ⚠️ User explicitly said NO dependents - forcing CTC to 0');
    childrenUnder17 = 0;
    otherDependents = 0;
    dependentsArray = [];
  }
  
  // ============================================================
  // BUILD TAX DATA FOR PYTHON
  // ============================================================
  const taxData = {
    // Filing status
    filing_status: getVal('filing_status', 'filingStatus') || 'single',
    
    // Income
    wages: totalWages,
    self_employment_income: parseNum(getVal('self_employment_income', 'se_income', 'selfEmploymentIncome', '1099_income', 'total_self_employment')),
    interest_income: parseNum(getVal('interest_income', 'interestIncome', 'interest', 'total_interest')),
    dividend_income: parseNum(getVal('dividend_income', 'dividendIncome', 'dividends', 'total_dividends')),
    
    // Adjustments
    ira_contributions: parseNum(getVal('ira_contributions', 'iraContributions', 'ira', 'traditional_ira')),
    hsa_contributions: parseNum(getVal('hsa_contributions', 'hsaContributions', 'hsa')),
    student_loan_interest: parseNum(getVal('student_loan_interest', 'studentLoanInterest')),
    
    // Withholding
    federal_withholding: federalWithholding,
    state_withholding: stateWithholding,
    
    // State
    state: userState,
    
    // ════════════════════════════════════════════════════════════
    // ⚠️ CRITICAL: Pass ALL dependent info to Python
    // ════════════════════════════════════════════════════════════
    has_dependents: hasDependents,           // ← NEW: explicit flag
    dependents: dependentsArray,              // ← NEW: full array with ages
    qualifying_children_under_17: childrenUnder17,
    other_dependents: otherDependents
  };
  
  console.log('[PythonTax] Prepared tax data:', JSON.stringify(taxData, null, 2));
  console.log(`[PythonTax] Dependent summary: has_dependents=${hasDependents}, children_under_17=${childrenUnder17}, other=${otherDependents}`);
  
  // ============================================================
  // CALL PYTHON
  // ============================================================
  try {
    const result = await calculateTaxPython(taxData);
    
    console.log('[PythonTax] Python result:', JSON.stringify(result, null, 2));
    
    if (result.error) {
      throw new Error(result.error);
    }
    
    // ============================================================
    // BUILD RESPONSE WITH CTC VALIDATION INFO
    // ============================================================
    
    // Build warnings array
    const warnings = [];
    
    // ⚠️ Add CTC validation warning
    if (result.federal?.ctc_validation === 'USER_INDICATED_NO_DEPENDENTS' ||
        result.federal?.ctc_validation === 'DEPENDENTS_ARRAY_EMPTY' ||
        result.federal?.ctc_validation === 'NO_DEPENDENTS_FOUND') {
      warnings.push('NO_QUALIFYING_CHILDREN: Child Tax Credit is $0');
    }
    
    // Add EITC validation warning
    if (result.federal?.eitc_validation === 'MFS_NOT_ELIGIBLE') {
      warnings.push('MFS_NO_EITC: Married Filing Separately cannot claim EITC');
    }
    
    return {
      federal: {
        totalIncome: result.federal?.total_income || 0,
        taxableIncome: result.federal?.taxable_income || 0,
        federalTax: result.federal?.bracket_tax || 0,
        seTax: result.federal?.self_employment_tax || 0,
        totalTaxOwed: result.federal?.bracket_tax || 0,
        withholding: result.federal?.withholding || 0,
        refund: result.federal?.refund || 0,
        taxDue: result.federal?.amount_owed || 0,
        agi: result.federal?.agi || 0,
        iraDeduction: result.federal?.ira_deduction || 0,
        standardDeduction: result.federal?.standard_deduction || 0,
        
        // ⚠️ NEW: CTC fields
        childTaxCredit: result.federal?.child_tax_credit || 0,
        ctcNonrefundable: result.federal?.ctc_nonrefundable || 0,
        ctcRefundable: result.federal?.ctc_refundable || 0,
        ctcValidation: result.federal?.ctc_validation || 'N/A',
        qualifyingChildrenUnder17: result.federal?.qualifying_children_under_17 || 0,
        
        // ⚠️ NEW: EITC fields  
        eitc: result.federal?.eitc || 0,
        eitcValidation: result.federal?.eitc_validation || 'N/A',
        
        // ⚠️ NEW: Other dependents
        otherDependentsCredit: result.federal?.other_dependents_credit || 0,
        otherDependents: result.federal?.other_dependents || 0,
        
        errors: [],
        warnings: warnings
      },
      state: result.state ? {
        state: result.state.state,
        stateName: result.state.state_name,
        supported: true,
        refund: result.state.refund || 0,
        taxDue: result.state.amount_owed || 0,
        withholding: result.state.withholding || 0,
        message: null,
        details: {
          caAgi: result.state.ca_agi || result.state.federal_agi || 0,
          caTaxableIncome: result.state.taxable_income || 0,
          caTaxOwed: result.state.total_tax || 0,
          caWithholding: result.state.withholding || 0,
          caStandardDeduction: result.state.standard_deduction || 0,
          totalCredits: result.state.total_credits || 0,
          caleitc: result.state.caleitc || 0,
          yctc: result.state.yctc || 0
        }
      } : {
        state: userState,
        supported: false,
        refund: 0,
        taxDue: 0,
        message: 'State not calculated'
      },
      totalRefund: result.total_refund || 0,
      totalTaxDue: result.total_amount_owed || 0,
      readyToFile: result.ready_to_file || false,
      
      // ⚠️ NEW: Validation summary
      validation: {
        ctc: result.federal?.ctc_validation || 'N/A',
        eitc: result.federal?.eitc_validation || 'N/A',
        warnings: warnings
      }
    };
    
  } catch (err) {
    console.error('[PythonTax] Calculation error:', err);
    
    return {
      federal: {
        totalIncome: 0,
        taxableIncome: 0,
        federalTax: 0,
        withholding: 0,
        refund: 0,
        taxDue: 0,
        childTaxCredit: 0,
        eitc: 0,
        errors: [err.message],
        warnings: []
      },
      state: {
        state: userState,
        supported: false,
        message: err.message
      },
      totalRefund: 0,
      totalTaxDue: 0,
      readyToFile: false,
      error: err.message
    };
  }
}

// ============================================================
// EXPORTS
// ============================================================
export default { calculateFullTax, calculateTaxPython };