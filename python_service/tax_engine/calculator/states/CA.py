# states/CA.py
# ============================================================
# CALIFORNIA TAX MODULE - 2025 - v5.0 FIXED
# ============================================================
# FIXES in v5.0:
# 1. Corrected tax brackets to match 2025 FTB Tax Table
# 2. Updated CalEITC limits for 2025 ($3,756 max, $32,900 limit)
# 3. All bracket boundaries verified against official tax table
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

# ============================================================
# 2025 TAX BRACKETS - CORRECTED to match FTB Tax Table
# ============================================================
# These brackets are derived from the official 2025 CA Tax Table
# to ensure calculated tax matches table lookup values

TAX_BRACKETS = {
    "single": [
        (11100, 0.01),      # 1% on first $11,100
        (26350, 0.02),      # 2% on $11,100 to $26,350
        (41450, 0.04),      # 4% on $26,350 to $41,450
        (57550, 0.06),      # 6% on $41,450 to $57,550
        (72750, 0.08),      # 8% on $57,550 to $72,750
        (360659, 0.093),    # 9.3% on $72,750 to $360,659
        (432787, 0.103),    # 10.3% on $360,659 to $432,787
        (721314, 0.113),    # 11.3% on $432,787 to $721,314
        (float('inf'), 0.123)  # 12.3% over $721,314
    ],
    "married_filing_jointly": [
        (22200, 0.01),      # 1%
        (52700, 0.02),      # 2%
        (82900, 0.04),      # 4%
        (115100, 0.06),     # 6%
        (145500, 0.08),     # 8%
        (721318, 0.093),    # 9.3%
        (865574, 0.103),    # 10.3%
        (1442628, 0.113),   # 11.3%
        (float('inf'), 0.123)  # 12.3%
    ],
    "married_filing_separately": [
        (11100, 0.01),
        (26350, 0.02),
        (41450, 0.04),
        (57550, 0.06),
        (72750, 0.08),
        (360659, 0.093),
        (432787, 0.103),
        (721314, 0.113),
        (float('inf'), 0.123)
    ],
    "head_of_household": [
        (22200, 0.01),      # Same as MFJ for first bracket
        (52700, 0.02),
        (67850, 0.04),      # Different from MFJ
        (83450, 0.06),
        (98150, 0.08),
        (490493, 0.093),
        (588593, 0.103),
        (980987, 0.113),
        (float('inf'), 0.123)
    ]
}

MENTAL_HEALTH_TAX_THRESHOLD = 1000000
MENTAL_HEALTH_TAX_RATE = 0.01

# ============================================================
# CalEITC 2025 - UPDATED per FTB website
# Max credit: $3,756 | Income limit: $32,900
# ============================================================
CALEITC = {
    0: {"max_credit": 285, "income_limit": 32900},
    1: {"max_credit": 1900, "income_limit": 32900},
    2: {"max_credit": 3137, "income_limit": 32900},
    3: {"max_credit": 3756, "income_limit": 32900}  # Updated to $3,756
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
    
    2025 Rules:
    - Max credit: $3,756 (3+ children)
    - Income limit: $32,900
    """
    if earned_income <= 0:
        return 0
    
    children = min(num_children, 3)
    params = CALEITC.get(children, CALEITC[0])
    income_limit = params["income_limit"]
    
    # CRITICAL: Check if EARNED INCOME exceeds limit
    if earned_income > income_limit:
        return 0
    
    # Also check AGI
    if agi > income_limit * 1.5:
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
    
    v5.0: Corrected brackets to match 2025 FTB Tax Table
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
    
    # CA AGI - California Adjustments
    student_loan_interest = safe_float(
        data.get("student_loan_interest") or
        data.get("studentLoanInterest") or
        data.get("student_loan") or
        0
    )
    
    ca_additions = student_loan_interest
    ca_agi = federal_agi + ca_additions
    
    if ca_additions > 0:
        print(f"  📋 CA Adjustment: Federal AGI ${federal_agi:,.0f} + Student Loan ${student_loan_interest:,.0f} = CA AGI ${ca_agi:,.0f}")
    
    # DEDUCTION
    ca_std_ded = STANDARD_DEDUCTION.get(fs, 5540)
    
    itemized = safe_float(
        data.get("itemized_deductions") or
        data.get("itemizedDeductions") or
        data.get("itemized") or
        data.get("ca_itemized") or
        data.get("total_itemized") or
        0
    )
    
    if isinstance(data.get("itemized_deductions"), dict):
        itemized = safe_float(data.get("itemized_deductions", {}).get("total", 0))
    
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
    
    # Get num_children
    _dependents = data.get("dependents")
    
    if isinstance(_dependents, list):
        num_children = int(
            data.get("qualifying_children_under_17") or 
            data.get("children_under_17") or
            data.get("num_children") or 
            data.get("children") or
            0
        )
    else:
        num_children = int(
            data.get("num_children") or 
            data.get("qualifying_children_under_17") or 
            data.get("children") or
            _dependents or
            0
        )
    
    # CalEITC
    caleitc = calculate_caleitc(earned_income, ca_agi, num_children)
    
    # YCTC
    has_child_under_6 = bool(
        data.get("has_child_under_6") or 
        data.get("child_under_6") or
        data.get("hasChildUnder6") or
        (int(data.get("children_under_6") or 0) > 0) or
        False
    )
    yctc = calculate_yctc(has_child_under_6, caleitc)
    
    # Renter's Credit
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
        
        # Deductions
        "standard_deduction": money(deduction),
        "ca_standard_deduction": money(ca_std_ded),
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
- CalEITC: Max $3,756 for 3+ children, income limit $32,900
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
        return "CalEITC 2025: Max credit $3,756, income limit $32,900"
    
    if "yctc" in q or "young child" in q:
        return "Young Child Tax Credit (YCTC): $1,117 per child under 6. Must qualify for CalEITC first."
    
    if "renter" in q:
        return "Renter's Credit: $60 (single, AGI≤$53,367) or $120 (MFJ/HOH, AGI≤$106,734)"
    
    return "Please ask a specific question about California state taxes."