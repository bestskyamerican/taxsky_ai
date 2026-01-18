# states/CA.py
# ============================================================
# CALIFORNIA TAX MODULE - 2025 - v4.3 FIXED
# ============================================================
# FIXES:
# 1. Supports itemized deductions (not just standard)
# 2. CalEITC income limit check (high earners don't qualify)
# 3. Returns deduction_type in output
# 4. ✅ v4.3: Fixed dependents as array (was causing int() error)
# ============================================================

from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, Any

# ============================================================
# STATE INFO
# ============================================================
STATE_CODE = "CA"
STATE_NAME = "California"
STATE_FULL_NAME = "State of California"
HAS_INCOME_TAX = True
TAX_TYPE = "progressive"

# ============================================================
# 2025 CONSTANTS
# ============================================================
STANDARD_DEDUCTION = {
    "single": 5540,
    "married_filing_jointly": 11080,
    "married_filing_separately": 5540,
    "head_of_household": 11080
}

TAX_BRACKETS = {
    "single": [
        (10756, 0.01),
        (25499, 0.02),
        (40245, 0.04),
        (55866, 0.06),
        (70606, 0.08),
        (360659, 0.093),
        (432787, 0.103),
        (721314, 0.113),
        (float('inf'), 0.123)
    ],
    "married_filing_jointly": [
        (21512, 0.01),
        (50998, 0.02),
        (80490, 0.04),
        (111732, 0.06),
        (141212, 0.08),
        (721318, 0.093),
        (865574, 0.103),
        (1442628, 0.113),
        (float('inf'), 0.123)
    ],
    "married_filing_separately": [
        (10756, 0.01),
        (25499, 0.02),
        (40245, 0.04),
        (55866, 0.06),
        (70606, 0.08),
        (360659, 0.093),
        (432787, 0.103),
        (721314, 0.113),
        (float('inf'), 0.123)
    ],
    "head_of_household": [
        (21527, 0.01),
        (51000, 0.02),
        (65744, 0.04),
        (81364, 0.06),
        (96107, 0.08),
        (490493, 0.093),
        (588593, 0.103),
        (980987, 0.113),
        (float('inf'), 0.123)
    ]
}

MENTAL_HEALTH_TAX_THRESHOLD = 1000000
MENTAL_HEALTH_TAX_RATE = 0.01

# CalEITC Income Limits (EARNED INCOME)
CALEITC = {
    0: {"max_credit": 285, "income_limit": 18591},
    1: {"max_credit": 1900, "income_limit": 49084},
    2: {"max_credit": 3137, "income_limit": 55768},
    3: {"max_credit": 3529, "income_limit": 59899}
}

YCTC_AMOUNT = 1117
YCTC_AGE_LIMIT = 6

RENTER_CREDIT = {
    "single": {"amount": 60, "agi_limit": 53367},
    "married_filing_jointly": {"amount": 120, "agi_limit": 106734},
    "married_filing_separately": {"amount": 60, "agi_limit": 53367},
    "head_of_household": {"amount": 120, "agi_limit": 106734}
}

# ============================================================
# HELPER FUNCTIONS
# ============================================================
def money(amount: float) -> float:
    """Round to cents"""
    return float(Decimal(str(amount)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP))

def safe_float(value: Any, default: float = 0.0) -> float:
    """Safely convert to float"""
    if value is None:
        return default
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        try:
            return float(value.replace(',', '').replace('$', '').strip())
        except:
            return default
    return default

def normalize_filing_status(status: str) -> str:
    """Normalize filing status"""
    if not status:
        return "single"
    s = str(status).lower().strip().replace(" ", "_").replace("-", "_")
    aliases = {
        "s": "single", "mfj": "married_filing_jointly",
        "mfs": "married_filing_separately", "hoh": "head_of_household"
    }
    return aliases.get(s, s if s in STANDARD_DEDUCTION else "single")

def calculate_bracket_tax(income: float, filing_status: str) -> float:
    """Calculate tax using progressive brackets"""
    brackets = TAX_BRACKETS.get(filing_status, TAX_BRACKETS["single"])
    tax = 0
    prev_limit = 0
    
    for limit, rate in brackets:
        if income <= prev_limit:
            break
        taxable = min(income, limit) - prev_limit
        tax += taxable * rate
        prev_limit = limit
    
    return money(tax)

# ============================================================
# CREDIT CALCULATORS
# ============================================================
def calculate_caleitc(earned_income: float, agi: float, num_children: int) -> float:
    """
    Calculate California Earned Income Tax Credit
    
    FIXED: Check income limits - high earners don't qualify!
    """
    if earned_income <= 0:
        return 0
    
    children = min(num_children, 3)
    params = CALEITC.get(children, CALEITC[0])
    income_limit = params["income_limit"]
    
    # CRITICAL: Check if EARNED INCOME exceeds limit
    if earned_income > income_limit:
        return 0
    
    # Also check AGI - CalEITC is for low-income earners
    if agi > income_limit * 2:
        return 0
    
    max_credit = params["max_credit"]
    phase_in_end = income_limit * 0.3
    phase_out_start = income_limit * 0.5
    
    if earned_income <= phase_in_end:
        credit = (earned_income / phase_in_end) * max_credit
    elif earned_income <= phase_out_start:
        credit = max_credit
    else:
        phase_out_rate = (earned_income - phase_out_start) / (income_limit - phase_out_start)
        credit = max_credit * (1 - phase_out_rate)
    
    return money(max(0, credit))

def calculate_yctc(has_child_under_6: bool, caleitc_amount: float) -> float:
    """Calculate Young Child Tax Credit"""
    if not has_child_under_6 or caleitc_amount <= 0:
        return 0
    return YCTC_AMOUNT

def calculate_renter_credit(filing_status: str, agi: float, is_renter: bool) -> float:
    """Calculate Renter's Credit (non-refundable)"""
    if not is_renter:
        return 0
    params = RENTER_CREDIT.get(filing_status, RENTER_CREDIT["single"])
    if agi > params["agi_limit"]:
        return 0
    return params["amount"]

# ============================================================
# MAIN CALCULATOR
# ============================================================
def calculate(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Calculate California state tax
    
    FIXED: Now supports itemized deductions!
    FIXED: CalEITC checks income limits properly
    """
    
    # Get filing status
    fs = normalize_filing_status(
        data.get("filing_status") or 
        data.get("filingStatus") or 
        "single"
    )
    
    # Get Federal AGI
    federal_agi = safe_float(
        data.get("federal_agi") or
        data.get("agi") or
        data.get("AGI") or
        data.get("federalAgi") or
        data.get("adjusted_gross_income") or
        data.get("total_income") or
        data.get("wages") or
        0
    )
    
    # =========================================================
    # CA AGI - California Adjustments (Schedule CA additions)
    # California does NOT allow certain federal deductions:
    # - Student loan interest deduction (must add back)
    # - Tuition and fees deduction (must add back)
    # =========================================================
    student_loan_interest = safe_float(
        data.get("student_loan_interest") or
        data.get("studentLoanInterest") or
        data.get("student_loan") or
        0
    )
    
    # CA AGI = Federal AGI + California additions
    ca_additions = student_loan_interest  # Add more items here if needed
    ca_agi = federal_agi + ca_additions
    
    # Log for debugging
    if ca_additions > 0:
        print(f"  📋 CA Adjustment: Federal AGI ${federal_agi:,.0f} + Student Loan ${student_loan_interest:,.0f} = CA AGI ${ca_agi:,.0f}")
    
    # =========================================================
    # FIXED: DEDUCTION - Check for itemized first!
    # =========================================================
    ca_std_ded = STANDARD_DEDUCTION.get(fs, 5540)
    
    # Check for itemized deductions - try ALL possible field names
    itemized = safe_float(
        data.get("itemized_deductions") or
        data.get("itemizedDeductions") or
        data.get("itemized") or
        data.get("ca_itemized") or
        data.get("total_itemized") or
        0
    )
    
    # Also check if it's a dict with total
    if isinstance(data.get("itemized_deductions"), dict):
        itemized = safe_float(data.get("itemized_deductions", {}).get("total", 0))
    
    # FIXED: Use itemized if provided and > 0, otherwise use standard
    if itemized > 0:
        deduction = itemized
        deduction_type = "itemized"
    else:
        deduction = ca_std_ded
        deduction_type = "standard"
    
    # Taxable income
    taxable_income = max(0, ca_agi - deduction)
    
    # Calculate base tax from brackets
    base_tax = calculate_bracket_tax(taxable_income, fs)
    
    # Mental Health Services Tax (1% over $1M)
    mental_health_tax = 0
    if taxable_income > MENTAL_HEALTH_TAX_THRESHOLD:
        mental_health_tax = (taxable_income - MENTAL_HEALTH_TAX_THRESHOLD) * MENTAL_HEALTH_TAX_RATE
    
    total_tax = base_tax + mental_health_tax
    
    # ===== CREDITS =====
    earned_income = safe_float(
        data.get("wages") or 
        data.get("w2_wages") or 
        data.get("w2_income") or
        data.get("earned_income") or
        0
    ) + safe_float(
        data.get("self_employment_income") or 
        data.get("se_income") or
        data.get("1099_income") or
        0
    )
    
    # =========================================================
    # ✅ FIXED: Get num_children - handle dependents as array
    # =========================================================
    _dependents = data.get("dependents")
    
    # If dependents is a list (new format), use the count fields
    if isinstance(_dependents, list):
        num_children = int(
            data.get("qualifying_children_under_17") or 
            data.get("children_under_17") or
            data.get("num_children") or 
            data.get("children") or
            0
        )
    else:
        # Legacy format: dependents was a number
        num_children = int(
            data.get("num_children") or 
            data.get("qualifying_children_under_17") or 
            data.get("children") or
            _dependents or
            0
        )
    
    # FIXED: CalEITC - pass AGI for income limit check
    caleitc = calculate_caleitc(earned_income, ca_agi, num_children)
    
    # YCTC (refundable) - check if any child under 6
    has_child_under_6 = bool(
        data.get("has_child_under_6") or 
        data.get("child_under_6") or
        data.get("hasChildUnder6") or
        (int(data.get("children_under_6") or 0) > 0) or  # ✅ v4.3: Check count field
        False
    )
    yctc = calculate_yctc(has_child_under_6, caleitc)
    
    # Renter's Credit (non-refundable)
    is_renter = bool(
        data.get("is_renter") or 
        data.get("renter") or
        data.get("isRenter") or
        False
    )
    renter_credit = calculate_renter_credit(fs, ca_agi, is_renter)
    
    # Apply credits
    refundable_credits = caleitc + yctc
    nonrefundable_credits = min(renter_credit, total_tax)
    
    tax_after_credits = max(0, total_tax - nonrefundable_credits)
    
    # Withholding
    withholding = safe_float(
        data.get("state_withholding") or 
        data.get("stateWithholding") or
        data.get("ca_withholding") or
        data.get("caWithholding") or
        data.get("california_withholding") or
        data.get("state_tax_withheld") or
        data.get("w2_state_withholding") or
        0
    )
    
    # Final calculation
    balance = withholding - tax_after_credits + refundable_credits
    
    return {
        "state": STATE_CODE,
        "state_name": STATE_NAME,
        "filing_status": fs,
        
        # Income
        "federal_agi": money(federal_agi),
        "ca_agi": money(ca_agi),
        
        # FIXED: Return both standard and actual deduction used
        "standard_deduction": money(deduction),  # What was actually used
        "ca_standard_deduction": money(ca_std_ded),  # CA standard for reference
        "deduction_used": money(deduction),
        "deduction_type": deduction_type,
        "taxable_income": money(taxable_income),
        
        # Tax
        "base_tax": money(base_tax),
        "mental_health_tax": money(mental_health_tax),
        "total_tax": money(total_tax),
        
        # Credits
        "caleitc": money(caleitc),
        "yctc": money(yctc),
        "renter_credit": money(renter_credit),
        "total_credits": money(refundable_credits + nonrefundable_credits),
        
        # Final
        "tax_after_credits": money(tax_after_credits),
        "withholding": money(withholding),
        "refundable_credits": money(refundable_credits),
        
        # Result
        "refund": money(max(0, balance)),
        "amount_owed": money(max(0, -balance)),
        
        # Effective rate
        "effective_rate": round((tax_after_credits / ca_agi * 100) if ca_agi > 0 else 0, 2)
    }

# ============================================================
# RAG QUERY FUNCTION
# ============================================================
def get_rag_context() -> str:
    """Return RAG knowledge for this state"""
    return """
California Tax Rules 2025:
- Progressive rates: 1% to 12.3% (+1% Mental Health Tax over $1M = 13.3% top rate)
- Standard deduction: Single $5,540, MFJ $11,080
- Itemized deductions allowed if greater than standard
- Does NOT tax Social Security benefits
- CalEITC: For LOW-INCOME earners only (income limits apply)
- YCTC: $1,117 per child under 6 (must qualify for CalEITC)
- Renter's Credit: $60 (single) or $120 (MFJ/HOH) if AGI below limits
"""

def answer_question(question: str) -> str:
    """Answer state-specific tax question"""
    q = question.lower()
    
    if "standard deduction" in q:
        return "California standard deduction for 2025: Single $5,540, MFJ $11,080, HOH $11,080"
    
    if "tax rate" in q or "bracket" in q:
        return "California has progressive tax rates from 1% to 12.3%, plus 1% Mental Health Tax on income over $1M (total 13.3% top rate)"
    
    if "social security" in q:
        return "California does NOT tax Social Security benefits"
    
    if "caleitc" in q or "earned income" in q:
        return "CalEITC is for LOW-INCOME earners only. Income limits: 0 kids=$18,591, 1 kid=$49,084, 2 kids=$55,768, 3+ kids=$59,899"
    
    if "yctc" in q or "young child" in q:
        return "Young Child Tax Credit (YCTC): $1,117 per child under 6. Must qualify for CalEITC first."
    
    if "renter" in q:
        return "Renter's Credit: $60 (single, AGI≤$53,367) or $120 (MFJ/HOH, AGI≤$106,734)"
    
    return "Please ask a specific question about California state taxes."