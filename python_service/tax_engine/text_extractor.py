"""
================================================================================
TAXSKY 2025 - VALIDATOR v20.0 - READ FROM MONGODB (NO TEXT EXTRACTION)
================================================================================
File: python_tax_api/tax_engine/text_extractor.py

v20.0 CHANGES:
  ✅ REMOVED: TaxTextExtractor class (no more regex parsing!)
  ✅ NEW: validate_and_calculate() reads structured data from MongoDB
  ✅ NEW: build_from_structured_data() builds data from input_forms/answers
  ✅ NEW: compare_calculations() compares Node.js vs Python results
  ✅ KEPT: verify_with_rag() for IRS rule validation
  ✅ KEPT: map_extracted_to_calculator() for calculator input
  ✅ KEPT: build_form_1040() for Form 1040 JSON

WHY THIS CHANGE:
  - Node.js now saves structured data directly to MongoDB during chat
  - No need to parse chat text anymore!
  - Python now validates and double-checks the data

================================================================================
"""

import re
import json
import os
from datetime import datetime, timezone
from typing import Dict, Any, List, Tuple, Optional
from pathlib import Path

# ============================================================
# IMPORT CALCULATOR
# ============================================================
CALCULATOR_AVAILABLE = False
calculate_tax = None

try:
    from .calculator.federal.calculator import calculate as calculate_tax
    CALCULATOR_AVAILABLE = True
    print("✅ calculator loaded from .calculator.federal.calculator")
except ImportError:
    try:
        from calculator.federal.calculator import calculate as calculate_tax
        CALCULATOR_AVAILABLE = True
    except ImportError:
        try:
            from .calculator import calculate as calculate_tax
            CALCULATOR_AVAILABLE = True
        except ImportError:
            try:
                from calculator import calculate as calculate_tax
                CALCULATOR_AVAILABLE = True
            except ImportError as e:
                print(f"⚠️ calculator.py not found: {e}")

# ============================================================
# IMPORT MONGODB CLIENT FOR SAVING
# ============================================================
MONGODB_SAVE_AVAILABLE = False
update_session_in_db = None

try:
    from .mongodb_client import update_session
    update_session_in_db = update_session
    MONGODB_SAVE_AVAILABLE = True
except ImportError:
    try:
        from mongodb_client import update_session
        update_session_in_db = update_session
        MONGODB_SAVE_AVAILABLE = True
    except ImportError:
        print("⚠️ mongodb_client.update_session not available")

# ============================================================
# CONFIGURATION
# ============================================================
NODE_API_URL = os.getenv("NODE_API_URL", "https://taxskyai.com")
_current_dir = Path(__file__).parent.resolve()
DATA_DIR = Path(os.getenv("TAX_DATA_DIR", str(_current_dir / "tax_data" / "json")))
try:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
except:
    pass

EXTRACTOR_VERSION = "v20.0-VALIDATOR"

print(f"📌 Tax Validator Config:")
print(f"   NODE_API_URL: {NODE_API_URL}")
print(f"   DATA_DIR: {DATA_DIR}")
print(f"   Version: {EXTRACTOR_VERSION}")

# ============================================================
# 2025 TAX CONSTANTS
# ============================================================
STANDARD_DEDUCTIONS_2025 = {
    "single": 15000,
    "married_filing_jointly": 30000,
    "married_filing_separately": 15000,
    "head_of_household": 22500,
    "qualifying_surviving_spouse": 30000
}

IRA_LIMIT_UNDER_50 = 7000
IRA_LIMIT_50_PLUS = 8000
HSA_LIMIT_INDIVIDUAL = 4300
HSA_LIMIT_FAMILY = 8550
STUDENT_LOAN_MAX = 2500

# ============================================================
# ✅ NEW: BUILD DATA FROM MONGODB STRUCTURED FIELDS
# ============================================================

def build_from_structured_data(session: Dict) -> Dict[str, Any]:
    """
    Build extracted data from MongoDB structured fields.
    NO text parsing needed - reads directly from:
    - session.input_forms.w2[]
    - session.answers{}
    - session.filing_status
    - session.address.state
    """
    answers = session.get("answers", {})
    input_forms = session.get("input_forms", {})
    w2s = input_forms.get("w2", [])
    totals = session.get("totals", {})
    
    # Sum W-2 data from input_forms.w2[]
    taxpayer_wages = sum(w.get("box_1_wages", 0) or 0 for w in w2s if w.get("owner") == "taxpayer")
    spouse_wages = sum(w.get("box_1_wages", 0) or 0 for w in w2s if w.get("owner") == "spouse")
    taxpayer_fed = sum(w.get("box_2_federal_withheld", 0) or 0 for w in w2s if w.get("owner") == "taxpayer")
    spouse_fed = sum(w.get("box_2_federal_withheld", 0) or 0 for w in w2s if w.get("owner") == "spouse")
    taxpayer_state = sum(w.get("box_17_state_withheld", 0) or 0 for w in w2s if w.get("owner") == "taxpayer")
    spouse_state = sum(w.get("box_17_state_withheld", 0) or 0 for w in w2s if w.get("owner") == "spouse")
    
    # Check for 401(k) from W-2 box 13
    has_retirement = any(w.get("box_13_retirement", False) for w in w2s)
    if not has_retirement:
        has_retirement = answers.get("taxpayer_has_401k", False) or answers.get("has_retirement_plan", False)
    
    # Get state from address or answers
    state = session.get("address", {}).get("state", "") or answers.get("state", "")
    
    # Get filing status
    filing_status = session.get("filing_status") or answers.get("filing_status", "single")
    
    # Count dependents
    dependents = session.get("dependents", [])
    children_under_17 = sum(1 for d in dependents if d.get("qualifies_ctc", False) or (d.get("age") and d.get("age") < 17))
    other_dependents = sum(1 for d in dependents if d.get("qualifies_odc", False) or (d.get("age") and d.get("age") >= 17))
    
    # If no dependents array, check answers
    if not dependents:
        children_under_17 = int(answers.get("qualifying_children_under_17", 0) or 0)
        other_dependents = int(answers.get("other_dependents", 0) or 0)
    
    extracted = {
        # Filing info
        "filing_status": filing_status,
        "state": state,
        
        # Personal info (from answers)
        "taxpayer_age": int(answers.get("taxpayer_age", 0) or 0),
        "spouse_age": int(answers.get("spouse_age", 0) or 0),
        "taxpayer_dob": answers.get("taxpayer_dob"),
        "spouse_dob": answers.get("spouse_dob"),
        
        # W-2 Income (from input_forms.w2[])
        "taxpayer_wages": taxpayer_wages,
        "spouse_wages": spouse_wages,
        "total_wages": taxpayer_wages + spouse_wages,
        "taxpayer_federal_withheld": taxpayer_fed,
        "spouse_federal_withheld": spouse_fed,
        "total_federal_withheld": taxpayer_fed + spouse_fed,
        "taxpayer_state_withheld": taxpayer_state,
        "spouse_state_withheld": spouse_state,
        "total_state_withheld": taxpayer_state + spouse_state,
        
        # 401(k) / Retirement Plan
        "has_retirement_plan": has_retirement,
        
        # Other income (from answers or input_forms)
        "interest_income": int(answers.get("interest_income", 0) or 0),
        "dividend_income": int(answers.get("dividend_income", 0) or 0),
        "qualified_dividends": int(answers.get("qualified_dividends", 0) or 0),
        "self_employment_income": int(answers.get("self_employment_income", 0) or 0),
        "pension_income": int(answers.get("pension_income", 0) or 0),
        "social_security": int(answers.get("social_security", 0) or 0),
        "unemployment_income": int(answers.get("unemployment_income", 0) or 0),
        "rental_income": int(answers.get("rental_income", 0) or 0),
        "long_term_gains": int(answers.get("long_term_gains", 0) or 0),
        "short_term_gains": int(answers.get("short_term_gains", 0) or 0),
        
        # Adjustments (from answers)
        "taxpayer_ira": int(answers.get("taxpayer_ira", 0) or 0),
        "spouse_ira": int(answers.get("spouse_ira", 0) or 0),
        "hsa": int(answers.get("hsa", 0) or answers.get("hsa_contribution", 0) or 0),
        "student_loan_interest": int(answers.get("student_loan_interest", 0) or 0),
        
        # Dependents
        "has_dependents": len(dependents) > 0 or children_under_17 > 0 or other_dependents > 0,
        "qualifying_children_under_17": children_under_17,
        "other_dependents": other_dependents,
        
        # Estimated payments
        "estimated_payments": int(answers.get("estimated_payments", 0) or 0),
        
        # Deduction type
        "deduction_type": answers.get("deduction_type", "standard"),
    }
    
    return extracted


# ============================================================
# ✅ RAG VALIDATION (IRS RULES)
# ============================================================

def verify_with_rag(extracted: Dict) -> Tuple[bool, List[str]]:
    """
    Validate extracted data against IRS 2025 rules.
    Returns: (is_valid, list_of_errors)
    """
    errors = []
    
    taxpayer_age = extracted.get("taxpayer_age", 0) or 0
    spouse_age = extracted.get("spouse_age", 0) or 0
    filing_status = extracted.get("filing_status", "single")
    
    # ═══════════════════════════════════════════════════════════
    # RULE 1: IRA Contribution Limits (2025)
    # ═══════════════════════════════════════════════════════════
    taxpayer_ira = extracted.get("taxpayer_ira", 0) or 0
    taxpayer_limit = IRA_LIMIT_50_PLUS if taxpayer_age >= 50 else IRA_LIMIT_UNDER_50
    
    if taxpayer_ira > taxpayer_limit:
        errors.append(f"Taxpayer IRA ${taxpayer_ira:,} exceeds {'50+' if taxpayer_age >= 50 else 'under-50'} limit ${taxpayer_limit:,}")
    
    spouse_ira = extracted.get("spouse_ira", 0) or 0
    if spouse_ira > 0 and spouse_age > 0:
        spouse_limit = IRA_LIMIT_50_PLUS if spouse_age >= 50 else IRA_LIMIT_UNDER_50
        if spouse_ira > spouse_limit:
            errors.append(f"Spouse IRA ${spouse_ira:,} exceeds {'50+' if spouse_age >= 50 else 'under-50'} limit ${spouse_limit:,}")
    
    # ═══════════════════════════════════════════════════════════
    # RULE 2: IRA Deductibility Warning (if has 401k)
    # ═══════════════════════════════════════════════════════════
    has_401k = extracted.get("has_retirement_plan", False)
    if has_401k and taxpayer_ira > 0:
        agi = extracted.get("total_wages", 0) + extracted.get("interest_income", 0)
        
        # 2025 phase-out limits (approximate)
        if filing_status == "married_filing_jointly":
            if agi > 143000:
                errors.append(f"IRA may not be fully deductible (MFJ AGI ${agi:,} > $143,000 with 401k)")
        elif filing_status == "single":
            if agi > 87000:
                errors.append(f"IRA may not be fully deductible (Single AGI ${agi:,} > $87,000 with 401k)")
    
    # ═══════════════════════════════════════════════════════════
    # RULE 3: HSA Limits (2025)
    # ═══════════════════════════════════════════════════════════
    hsa = extracted.get("hsa", 0) or 0
    if hsa > HSA_LIMIT_FAMILY:
        errors.append(f"HSA ${hsa:,} exceeds family limit ${HSA_LIMIT_FAMILY:,}")
    elif hsa > HSA_LIMIT_INDIVIDUAL:
        # Just a warning - might be family coverage
        pass
    
    # ═══════════════════════════════════════════════════════════
    # RULE 4: Student Loan Interest Max ($2,500)
    # ═══════════════════════════════════════════════════════════
    sli = extracted.get("student_loan_interest", 0) or 0
    if sli > STUDENT_LOAN_MAX:
        errors.append(f"Student loan interest ${sli:,} exceeds max ${STUDENT_LOAN_MAX:,}")
    
    # ═══════════════════════════════════════════════════════════
    # RULE 5: Filing Status Consistency
    # ═══════════════════════════════════════════════════════════
    has_spouse_data = spouse_age > 0 or extracted.get("spouse_wages", 0) > 0
    
    if filing_status == "single" and has_spouse_data:
        errors.append("Filing as Single but spouse data exists - verify filing status")
    
    if filing_status == "married_filing_jointly" and not has_spouse_data:
        # Not necessarily an error, spouse might not work
        pass
    
    # ═══════════════════════════════════════════════════════════
    # RULE 6: Child Tax Credit Age Check
    # ═══════════════════════════════════════════════════════════
    # Children must be under 17 at end of tax year for CTC
    # (This is validated when dependents are entered)
    
    return len(errors) == 0, errors


# ============================================================
# ✅ COMPARE NODE.JS VS PYTHON CALCULATIONS
# ============================================================

def compare_calculations(node_totals: Dict, python_result: Dict) -> List[str]:
    """
    Compare Node.js totals vs Python calculation.
    Returns list of discrepancy warnings.
    """
    warnings = []
    
    comparisons = [
        ("wages", "wages", "Total Wages"),
        ("agi", "agi", "AGI"),
        ("federal_tax", "tax_after_credits", "Federal Tax"),
        ("taxable_income", "taxable_income", "Taxable Income"),
        ("refund", "refund", "Refund"),
        ("amount_owed", "amount_owed", "Amount Owed"),
    ]
    
    for node_key, python_key, label in comparisons:
        node_val = float(node_totals.get(node_key, 0) or 0)
        python_val = float(python_result.get(python_key, 0) or 0)
        
        # Allow $1 rounding difference
        if abs(node_val - python_val) > 1:
            warnings.append(f"{label} mismatch: Node=${node_val:,.0f} vs Python=${python_val:,.0f}")
            print(f"   ⚠️ {label}: Node=${node_val:,.0f} vs Python=${python_val:,.0f}")
    
    if not warnings:
        print(f"   ✅ Node.js and Python calculations match!")
    
    return warnings


# ============================================================
# ✅ MAPPING TO CALCULATOR
# ============================================================

def map_extracted_to_calculator(extracted: Dict) -> Dict:
    """
    Map extracted/validated data to calculator input format.
    """
    return {
        # Filing info
        "filing_status": extracted.get("filing_status", "single"),
        "state": extracted.get("state", ""),
        
        # Ages
        "taxpayer_age": extracted.get("taxpayer_age", 0) or 0,
        "spouse_age": extracted.get("spouse_age", 0) or 0,
        "taxpayer_dob": extracted.get("taxpayer_dob", ""),
        "spouse_dob": extracted.get("spouse_dob", ""),
        
        # 401(k) status for IRA deductibility
        "has_retirement_plan": extracted.get("has_retirement_plan", False),
        
        # W-2 Wages
        "wages": extracted.get("total_wages", 0) or 0,
        "taxpayer_wages": extracted.get("taxpayer_wages", 0) or 0,
        "spouse_wages": extracted.get("spouse_wages", 0) or 0,
        
        # Federal Withholding
        "federal_withholding": extracted.get("total_federal_withheld", 0) or 0,
        "taxpayer_federal_withheld": extracted.get("taxpayer_federal_withheld", 0) or 0,
        "spouse_federal_withheld": extracted.get("spouse_federal_withheld", 0) or 0,
        
        # State Withholding
        "state_withholding": extracted.get("total_state_withheld", 0) or 0,
        "taxpayer_state_withheld": extracted.get("taxpayer_state_withheld", 0) or 0,
        "spouse_state_withheld": extracted.get("spouse_state_withheld", 0) or 0,
        
        # Other Income
        "interest_income": extracted.get("interest_income", 0) or 0,
        "dividend_income": extracted.get("dividend_income", 0) or 0,
        "qualified_dividends": extracted.get("qualified_dividends", 0) or 0,
        "long_term_gains": extracted.get("long_term_gains", 0) or 0,
        "short_term_gains": extracted.get("short_term_gains", 0) or 0,
        "pension_income": extracted.get("pension_income", 0) or 0,
        "social_security": extracted.get("social_security", 0) or 0,
        "self_employment_income": extracted.get("self_employment_income", 0) or 0,
        "unemployment_income": extracted.get("unemployment_income", 0) or 0,
        "rental_income": extracted.get("rental_income", 0) or 0,
        
        # Adjustments - IRA
        "ira_contributions": extracted.get("taxpayer_ira", 0) or 0,
        "taxpayer_ira": extracted.get("taxpayer_ira", 0) or 0,
        "spouse_ira": extracted.get("spouse_ira", 0) or 0,
        
        # Other Adjustments
        "hsa_contributions": extracted.get("hsa", 0) or 0,
        "hsa": extracted.get("hsa", 0) or 0,
        "student_loan_interest": extracted.get("student_loan_interest", 0) or 0,
        
        # Dependents
        "qualifying_children_under_17": extracted.get("qualifying_children_under_17", 0) or 0,
        "other_dependents": extracted.get("other_dependents", 0) or 0,
        
        # Estimated payments
        "estimated_payments": extracted.get("estimated_payments", 0) or 0,
    }


# ============================================================
# ✅ BUILD FORM 1040 JSON
# ============================================================

def build_form_1040(extracted: Dict, tax_result: Dict, tax_year: int = 2025) -> Dict[str, Any]:
    """Build complete Form 1040 JSON from validated data."""
    total_wages = tax_result.get("wages", 0)
    
    return {
        "header": {
            "tax_year": tax_year,
            "filing_status": extracted.get("filing_status", "single"),
            "state": extracted.get("state", ""),
            "has_retirement_plan": extracted.get("has_retirement_plan", False),
        },
        "income": {
            "line_1a_w2_wages": total_wages,
            "line_1z_total_wages": total_wages,
            "line_1_wages": total_wages,
            "line_2b_taxable_interest": tax_result.get("interest_income", 0),
            "line_3a_qualified_dividends": tax_result.get("qualified_dividends", 0),
            "line_3b_ordinary_dividends": tax_result.get("dividend_income", 0),
            "line_4b_taxable_ira": tax_result.get("pension_income", 0),
            "line_6b_taxable_social_security": tax_result.get("taxable_social_security", 0),
            "line_7_capital_gain": tax_result.get("capital_gains", 0),
            "line_8_schedule_1_income": tax_result.get("other_income", 0),
            "line_9_total_income": tax_result.get("total_income", 0),
        },
        "adjustments": {
            "line_10_schedule_1_adjustments": tax_result.get("adjustments", 0),
            "line_11_agi": tax_result.get("agi", 0),
            "ira_contributed": tax_result.get("taxpayer_ira_contributed", 0) + tax_result.get("spouse_ira_contributed", 0),
            "ira_deductible": tax_result.get("ira_deduction", 0),
            "taxpayer_ira_contributed": tax_result.get("taxpayer_ira_contributed", 0),
            "taxpayer_ira_deductible": tax_result.get("taxpayer_ira_deductible", 0),
            "taxpayer_ira_reason": tax_result.get("taxpayer_ira_reason", ""),
        },
        "deductions": {
            "line_12_deduction": tax_result.get("standard_deduction", 0),
            "line_14_total_deductions": tax_result.get("standard_deduction", 0),
            "line_15_taxable_income": tax_result.get("taxable_income", 0),
        },
        "tax_and_credits": {
            "line_16_tax": tax_result.get("bracket_tax", 0),
            "line_19_child_credit": tax_result.get("child_tax_credit", 0),
            "line_21_total_credits": tax_result.get("total_credits", 0),
            "line_22_tax_after_credits": tax_result.get("tax_after_credits", 0),
            "line_24_total_tax": tax_result.get("tax_after_credits", 0),
        },
        "payments": {
            "line_25a_w2_withholding": tax_result.get("withholding", 0),
            "line_25d_total_withholding": tax_result.get("withholding", 0),
            "line_26_estimated_payments": tax_result.get("estimated_payments", 0),
            "line_33_total_payments": tax_result.get("total_payments", 0),
        },
        "refund_owed": {
            "line_34_overpaid": tax_result.get("refund", 0),
            "line_35a_refund": tax_result.get("refund", 0),
            "line_37_amount_owed": tax_result.get("amount_owed", 0),
        },
        "w2_breakdown": {
            "taxpayer_wages": extracted.get("taxpayer_wages", 0),
            "spouse_wages": extracted.get("spouse_wages", 0),
            "taxpayer_withheld": extracted.get("taxpayer_federal_withheld", 0),
            "spouse_withheld": extracted.get("spouse_federal_withheld", 0),
        },
        "_metadata": {
            "extractor_version": EXTRACTOR_VERSION,
            "extracted_at": datetime.now(timezone.utc).isoformat(),
            "validated": True,
        }
    }


# ============================================================
# ✅ SAVE VALIDATION RESULTS TO MONGODB
# ============================================================

def save_validation_results(user_id: str, tax_year: int, extracted: Dict, 
                           tax_result: Dict, form1040: Dict, 
                           is_valid: bool, all_warnings: List[str]) -> bool:
    """Save validation results back to MongoDB."""
    if not MONGODB_SAVE_AVAILABLE or not update_session_in_db:
        print("   ⚠️ Cannot save to MongoDB - mongodb_client not available")
        return False
    
    try:
        update_data = {
            # Validation status
            "ragVerified": is_valid and len(all_warnings) == 0,
            "validationErrors": all_warnings,
            "status": "validated" if is_valid else "needs_review",
            
            # Python calculation results
            "pythonCalculation": tax_result,
            "form1040": form1040,
            
            # Key tax values (for dashboard)
            "taxCalculation": {
                "filing_status": extracted.get("filing_status"),
                "state": extracted.get("state"),
                "wages": tax_result.get("wages", 0),
                "agi": tax_result.get("agi", 0),
                "taxable_income": tax_result.get("taxable_income", 0),
                "total_tax": tax_result.get("tax_after_credits", 0),
                "withholding": tax_result.get("withholding", 0),
                "refund": tax_result.get("refund", 0),
                "amount_owed": tax_result.get("amount_owed", 0),
                # W-2 breakdown
                "_taxpayer_wages": extracted.get("taxpayer_wages", 0),
                "_spouse_wages": extracted.get("spouse_wages", 0),
            },
            
            # Metadata
            "validatedAt": datetime.now(timezone.utc),
            "validatorVersion": EXTRACTOR_VERSION,
        }
        
        success = update_session_in_db(user_id, tax_year, update_data)
        
        if success:
            print(f"   ✅ Validation results saved to MongoDB!")
            print(f"      AGI: ${tax_result.get('agi', 0):,.0f}")
            print(f"      Tax: ${tax_result.get('tax_after_credits', 0):,.0f}")
            print(f"      Refund: ${tax_result.get('refund', 0):,.0f}")
            print(f"      Owed: ${tax_result.get('amount_owed', 0):,.0f}")
        
        return success
        
    except Exception as e:
        print(f"   ❌ Save to MongoDB failed: {e}")
        return False


# ============================================================
# ✅ MAIN ENTRY POINT: VALIDATE AND CALCULATE
# ============================================================

def validate_and_calculate(user_id: str, tax_year: int, session: Dict) -> Dict[str, Any]:
    """
    Main entry point: Validate structured data from MongoDB and recalculate.
    
    This replaces the old text extraction flow!
    
    Args:
        user_id: User ID
        tax_year: Tax year (default 2025)
        session: MongoDB session document with input_forms, answers, totals
    
    Returns:
        Result dict with validation status, extracted data, tax calculation
    """
    print(f"\n{'='*60}")
    print(f"🔍 TAXSKY PYTHON VALIDATOR {EXTRACTOR_VERSION}")
    print(f"{'='*60}")
    print(f"👤 User: {user_id}")
    print(f"📅 Tax Year: {tax_year}")
    
    # 1. Read STRUCTURED data from MongoDB (NOT messages!)
    answers = session.get("answers", {})
    input_forms = session.get("input_forms", {})
    totals = session.get("totals", {})
    
    print(f"\n📋 Data from MongoDB:")
    print(f"   Answers: {len(answers)} fields")
    print(f"   W-2s: {len(input_forms.get('w2', []))}")
    print(f"   Filing Status: {session.get('filing_status', 'unknown')}")
    
    # 2. Build extracted data from structured fields
    extracted = build_from_structured_data(session)
    
    print(f"\n📊 Extracted Data:")
    print(f"   Filing Status: {extracted.get('filing_status')}")
    print(f"   State: {extracted.get('state')}")
    print(f"   Taxpayer Wages: ${extracted.get('taxpayer_wages', 0):,}")
    print(f"   Spouse Wages: ${extracted.get('spouse_wages', 0):,}")
    print(f"   Total Wages: ${extracted.get('total_wages', 0):,}")
    print(f"   Federal Withheld: ${extracted.get('total_federal_withheld', 0):,}")
    print(f"   Has 401(k): {extracted.get('has_retirement_plan')}")
    print(f"   Taxpayer IRA: ${extracted.get('taxpayer_ira', 0):,}")
    print(f"   Children under 17: {extracted.get('qualifying_children_under_17', 0)}")
    
    # 3. RAG Validation (IRS rules)
    is_valid, rag_errors = verify_with_rag(extracted)
    print(f"\n📋 RAG Validation: {'✅ PASSED' if is_valid else '⚠️ WARNINGS'}")
    for err in rag_errors:
        print(f"   ⚠️ {err}")
    
    # 4. Map to calculator input
    calc_input = map_extracted_to_calculator(extracted)
    
    # 5. Calculate with Python
    tax_result = {}
    if CALCULATOR_AVAILABLE and calculate_tax:
        print(f"\n📤 Sending to Calculator...")
        tax_result = calculate_tax(calc_input)
        print(f"\n📊 Python Tax Calculation:")
        print(f"   Total Wages: ${tax_result.get('wages', 0):,.0f}")
        print(f"   AGI: ${tax_result.get('agi', 0):,.0f}")
        print(f"   Taxable Income: ${tax_result.get('taxable_income', 0):,.0f}")
        print(f"   Tax: ${tax_result.get('tax_after_credits', 0):,.0f}")
        print(f"   Withholding: ${tax_result.get('withholding', 0):,.0f}")
        print(f"   Refund: ${tax_result.get('refund', 0):,.0f}")
        print(f"   Owed: ${tax_result.get('amount_owed', 0):,.0f}")
    else:
        print(f"\n⚠️ Calculator not available!")
    
    # 6. Compare Node.js vs Python
    print(f"\n🔄 Comparing Node.js vs Python:")
    comparison_warnings = compare_calculations(totals, tax_result)
    all_warnings = rag_errors + comparison_warnings
    
    # 7. Build Form 1040 JSON
    form1040 = build_form_1040(extracted, tax_result, tax_year)
    
    # 8. Save to MongoDB
    print(f"\n💾 Saving validation results to MongoDB...")
    save_validation_results(user_id, tax_year, extracted, tax_result, form1040, is_valid, all_warnings)
    
    print(f"\n{'='*60}")
    print(f"✅ VALIDATION COMPLETE")
    print(f"{'='*60}\n")
    
    return {
        "success": True,
        "user_id": user_id,
        "tax_year": tax_year,
        "rag_verified": is_valid and len(comparison_warnings) == 0,
        "validation_errors": all_warnings,
        "extracted": extracted,
        "calculator_input": calc_input,
        "tax_result": tax_result,
        "form1040": form1040,
    }


# ============================================================
# ✅ BACKWARD COMPATIBLE: handle_extract_request
# ============================================================

def handle_extract_request(user_id: str, tax_year: int = 2025, 
                          messages: List = None, answers: Dict = None,
                          session: Dict = None) -> Dict[str, Any]:
    """
    Handle extraction/validation request from API router.
    
    NEW (v20.0): If session provided → use structured validation
    OLD (legacy): If only messages provided → error (no longer supported)
    """
    # NEW: If session provided, use structured validation
    if session:
        return validate_and_calculate(user_id, tax_year, session)
    
    # OLD: Text extraction no longer supported
    return {
        "success": False,
        "error": "Text extraction removed in v20.0. Please provide session data.",
        "user_id": user_id,
        "tax_year": tax_year,
    }


# ============================================================
# FILE I/O (Required by other modules)
# ============================================================

def load_form1040_json(user_id: str, tax_year: int = 2025) -> Optional[Dict]:
    """Load Form 1040 JSON from file."""
    filepath = DATA_DIR / f"{user_id}_1040_{tax_year}.json"
    if filepath.exists():
        with open(filepath, 'r') as f:
            return json.load(f)
    return None


def save_form1040_json(user_id: str, form1040: Dict, tax_year: int = 2025) -> str:
    """Save Form 1040 JSON to file."""
    filepath = DATA_DIR / f"{user_id}_1040_{tax_year}.json"
    with open(filepath, 'w') as f:
        json.dump(form1040, f, indent=2, default=str)
    return str(filepath)


# ============================================================
# CLI
# ============================================================

if __name__ == "__main__":
    print(f"\n{'='*60}")
    print(f"TaxSky Validator {EXTRACTOR_VERSION}")
    print(f"{'='*60}")
    print(f"✅ NO TEXT EXTRACTION - Reads structured data from MongoDB")
    print(f"✅ RAG Validation: IRS 2025 rules")
    print(f"✅ Calculator: Federal tax calculation")
    print(f"✅ Comparison: Node.js vs Python results")
    print(f"{'='*60}\n")