# states/PA.py
# ============================================================
# PENNSYLVANIA TAX MODULE - 2025
# ============================================================
# Form PA-40 - Pennsylvania Personal Income Tax Return
# Flat tax state - one of the lowest rates in the nation
# ============================================================

"""
PENNSYLVANIA TAX RULES 2025 - RAG KNOWLEDGE BASE
================================================

## OVERVIEW
- Pennsylvania has a FLAT income tax rate
- Rate: 3.07% (one of the lowest flat rates in the U.S.)
- No standard deduction or personal exemption
- Very simple calculation: income × 3.07%

## TAX RATE
- Flat Rate: 3.07%
- Applies to all taxable income
- No graduated brackets

## STANDARD DEDUCTION
- Pennsylvania has NO standard deduction
- Also NO personal exemption
- Tax applies to entire taxable income

## TAXABLE INCOME CLASSES
Pennsylvania taxes 8 classes of income:
1. Compensation (wages, salaries, tips)
2. Net profits (self-employment)
3. Interest
4. Dividends
5. Net gains from property sales
6. Rents, royalties, patents
7. Estate or trust income
8. Gambling/lottery winnings

## RETIREMENT INCOME
- Pennsylvania does NOT tax retirement income including:
  - Social Security
  - Pension income
  - 401(k) distributions
  - IRA distributions
- This makes PA attractive for retirees

## LOCAL TAXES
- Pennsylvania allows local income taxes
- Earned Income Tax (EIT): varies by municipality (0.5% - 3.1%)
- Philadelphia has 3.79% wage tax for residents
- Local Service Tax (LST): up to $52/year

## CREDITS
- Tax Forgiveness Credit: for low-income taxpayers
- Special Tax Forgiveness: can eliminate tax for those below income thresholds

## COMMON QUESTIONS
Q: What is the Pennsylvania income tax rate?
A: 3.07% flat rate on all taxable income.

Q: Does PA have a standard deduction?
A: No, Pennsylvania has no standard deduction or personal exemption.

Q: Does Pennsylvania tax retirement income?
A: No, PA exempts all retirement income including Social Security, pensions, 401(k), and IRA distributions.

Q: Does PA have local income tax?
A: Yes, most municipalities have an Earned Income Tax (EIT) ranging from 0.5% to 3.1%.

Q: What is Philadelphia's tax rate?
A: Philadelphia has a 3.79% wage tax for residents (3.44% for non-residents working in Philly).
"""

from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, Any

# ============================================================
# STATE INFO
# ============================================================
STATE_CODE = "PA"
STATE_NAME = "Pennsylvania"
STATE_FULL_NAME = "Commonwealth of Pennsylvania"
HAS_INCOME_TAX = True
TAX_TYPE = "flat"
SUPPORT_LEVEL = "full"

# ============================================================
# 2025 CONSTANTS
# ============================================================
FLAT_TAX_RATE = 0.0307  # 3.07%

# PA has NO standard deduction or personal exemption
STANDARD_DEDUCTION = {
    "single": 0,
    "married_filing_jointly": 0,
    "married_filing_separately": 0,
    "head_of_household": 0
}

PERSONAL_EXEMPTION = 0

# Local tax ranges (for reference)
LOCAL_EIT_MIN = 0.005  # 0.5%
LOCAL_EIT_MAX = 0.031  # 3.1%

# Philadelphia wage tax
PHILADELPHIA_RESIDENT_RATE = 0.0379  # 3.79%
PHILADELPHIA_NONRESIDENT_RATE = 0.0344  # 3.44%

# Tax Forgiveness thresholds (2025)
TAX_FORGIVENESS = {
    "single_0_dependents": 6500,
    "single_1_dependent": 13000,
    "single_2_dependents": 19500,
    "married_0_dependents": 13000,
    "married_per_dependent": 9500
}

# ============================================================
# HELPER FUNCTIONS
# ============================================================
def money(amount: float) -> float:
    return float(Decimal(str(amount)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP))

def normalize_filing_status(status: str) -> str:
    if not status:
        return "single"
    s = str(status).lower().strip().replace(" ", "_").replace("-", "_")
    aliases = {
        "s": "single", 
        "mfj": "married_filing_jointly",
        "mfs": "married_filing_separately", 
        "hoh": "head_of_household"
    }
    return aliases.get(s, s if s in STANDARD_DEDUCTION else "single")

# ============================================================
# MAIN CALCULATOR
# ============================================================
def calculate(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Calculate Pennsylvania state tax (flat tax)
    
    Required fields:
    - filing_status: str
    - federal_agi: float (or agi)
    - wages: float
    - state_withholding: float
    
    Optional:
    - retirement_income: float (exempt)
    - social_security_benefits: float (exempt)
    - is_philadelphia: bool
    - local_eit_rate: float (0.005 to 0.031)
    - num_dependents: int (for tax forgiveness)
    """
    fs = normalize_filing_status(data.get("filing_status", "single"))
    
    # Get income components
    federal_agi = data.get("federal_agi") or data.get("agi") or 0
    wages = data.get("wages") or data.get("compensation") or 0
    interest = data.get("interest_income") or data.get("interest") or 0
    dividends = data.get("dividend_income") or data.get("dividends") or 0
    capital_gains = data.get("capital_gains") or data.get("net_gains") or 0
    self_employment = data.get("self_employment_income") or data.get("net_profits") or 0
    other_income = data.get("other_income") or 0
    
    # Exempt income (PA doesn't tax these)
    retirement_income = data.get("retirement_income") or 0
    social_security = data.get("social_security_benefits") or 0
    
    # Calculate PA taxable income (different from federal AGI)
    # PA taxes 8 classes - we're using simplified calculation
    pa_taxable_income = wages + interest + dividends + capital_gains + self_employment + other_income
    
    # If federal AGI provided but no components, use AGI minus retirement
    if pa_taxable_income == 0 and federal_agi > 0:
        pa_taxable_income = max(0, federal_agi - retirement_income - social_security)
    
    pa_taxable_income = max(0, pa_taxable_income)
    
    # ===== STATE TAX (Flat 3.07%) =====
    state_tax = pa_taxable_income * FLAT_TAX_RATE
    
    # ===== TAX FORGIVENESS CREDIT =====
    num_dependents = data.get("num_dependents") or 0
    num_dependents += data.get("qualifying_children_under_17") or 0
    num_dependents += data.get("other_dependents") or 0
    
    forgiveness_credit = 0
    # Simplified tax forgiveness check
    if fs == "single":
        threshold = TAX_FORGIVENESS["single_0_dependents"] + (num_dependents * 6500)
    else:
        threshold = TAX_FORGIVENESS["married_0_dependents"] + (num_dependents * TAX_FORGIVENESS["married_per_dependent"])
    
    if pa_taxable_income <= threshold:
        forgiveness_credit = state_tax  # 100% forgiveness
    elif pa_taxable_income <= threshold * 1.5:
        forgiveness_credit = state_tax * 0.5  # 50% forgiveness
    
    # ===== LOCAL TAX (Optional) =====
    is_philadelphia = data.get("is_philadelphia", False)
    local_eit_rate = data.get("local_eit_rate", 0)
    
    local_tax = 0
    if is_philadelphia:
        local_tax = wages * PHILADELPHIA_RESIDENT_RATE
    elif local_eit_rate > 0:
        local_tax = wages * local_eit_rate
    
    # ===== TOTAL TAX =====
    total_state_tax = max(0, state_tax - forgiveness_credit)
    total_tax = total_state_tax + local_tax
    
    # ===== WITHHOLDING & RESULT =====
    withholding = data.get("state_withholding") or 0
    
    balance = withholding - total_tax
    
    return {
        "state": STATE_CODE,
        "state_name": STATE_NAME,
        "filing_status": fs,
        "tax_type": "flat",
        "tax_rate": FLAT_TAX_RATE,
        "support_level": SUPPORT_LEVEL,
        "has_income_tax": HAS_INCOME_TAX,
        
        # Income
        "federal_agi": money(federal_agi),
        "pa_taxable_income": money(pa_taxable_income),
        "taxable_income": money(pa_taxable_income),
        
        # Exempt income
        "retirement_income_exempt": money(retirement_income),
        "social_security_exempt": money(social_security),
        
        # No deductions in PA
        "standard_deduction": 0,
        "exemptions": 0,
        
        # Tax
        "base_tax": money(state_tax),
        "state_tax": money(total_state_tax),
        "forgiveness_credit": money(forgiveness_credit),
        
        # Local tax
        "local_tax": money(local_tax),
        "is_philadelphia": is_philadelphia,
        "local_eit_rate": local_eit_rate,
        
        # Total
        "total_tax": money(total_tax),
        
        # Payments
        "withholding": money(withholding),
        
        # Result
        "refund": money(max(0, balance)),
        "amount_owed": money(max(0, -balance)),
        
        "effective_rate": round((total_tax / pa_taxable_income * 100) if pa_taxable_income > 0 else 0, 2)
    }

# ============================================================
# RAG FUNCTIONS
# ============================================================
def get_rag_context() -> str:
    return __doc__

def answer_question(question: str) -> str:
    q = question.lower()
    
    if "rate" in q or "percent" in q:
        return "Pennsylvania has a flat 3.07% income tax rate on all taxable income - one of the lowest in the nation."
    
    if "standard deduction" in q or "deduction" in q:
        return "Pennsylvania has NO standard deduction or personal exemption. Tax is calculated on full taxable income."
    
    if "retirement" in q or "pension" in q or "401k" in q or "ira" in q:
        return "Pennsylvania does NOT tax any retirement income - including Social Security, pensions, 401(k), and IRA distributions."
    
    if "social security" in q:
        return "Pennsylvania does NOT tax Social Security benefits."
    
    if "local" in q or "eit" in q:
        return "Pennsylvania has local Earned Income Tax (EIT) ranging from 0.5% to 3.1% depending on municipality."
    
    if "philadelphia" in q or "philly" in q:
        return "Philadelphia wage tax: 3.79% for residents, 3.44% for non-residents working in the city."
    
    if "forgiveness" in q:
        return "PA Tax Forgiveness Credit can reduce or eliminate tax for low-income taxpayers."
    
    return "Pennsylvania has a flat 3.07% income tax. Retirement income is exempt. Most municipalities have local EIT."


# ============================================================
# CLI Testing
# ============================================================
if __name__ == "__main__":
    test_data = {
        "filing_status": "married_filing_jointly",
        "federal_agi": 85000,
        "wages": 80000,
        "interest_income": 2000,
        "dividend_income": 3000,
        "retirement_income": 0,
        "state_withholding": 2500,
        "num_dependents": 2
    }
    
    result = calculate(test_data)
    
    print("=" * 60)
    print(f"PENNSYLVANIA TAX CALCULATION")
    print("=" * 60)
    print(f"Filing Status:    {result['filing_status']}")
    print(f"Federal AGI:      ${result['federal_agi']:,.0f}")
    print(f"PA Taxable:       ${result['pa_taxable_income']:,.0f}")
    print(f"Tax Rate:         3.07% (flat)")
    print(f"State Tax:        ${result['state_tax']:,.2f}")
    print(f"Withholding:      ${result['withholding']:,.2f}")
    print("-" * 60)
    if result['refund'] > 0:
        print(f"REFUND:           ${result['refund']:,.2f}")
    else:
        print(f"OWED:             ${result['amount_owed']:,.2f}")
    print("=" * 60)
