# states/GA.py
# ============================================================
# GEORGIA TAX MODULE - 2025
# ============================================================
# Form 500 - Georgia Individual Income Tax Return
# Flat tax state (changed from progressive in 2024)
# ============================================================

"""
GEORGIA TAX RULES 2025 - RAG KNOWLEDGE BASE
============================================

## OVERVIEW
- Georgia switched to a FLAT income tax in 2024
- 2025 Rate: 5.49%
- Rate is scheduled to decrease in future years (goal: 4.99%)
- Previously had 6 progressive brackets (1% - 5.75%)

## TAX RATE SCHEDULE
| Year | Rate |
|------|------|
| 2024 | 5.49% |
| 2025 | 5.49% |
| 2026+ | Potentially lower (depends on revenue) |

## STANDARD DEDUCTION 2025
| Filing Status | Amount |
|---------------|--------|
| Single | $12,000 |
| Married Filing Jointly | $24,000 |
| Married Filing Separately | $12,000 |
| Head of Household | $18,000 |

## PERSONAL EXEMPTION 2025
- Taxpayer: $2,700
- Spouse: $2,700 (if MFJ)
- Each Dependent: $3,000

## RETIREMENT INCOME EXCLUSION
Georgia allows exclusion of retirement income:
- Age 62-64: Up to $35,000 per person
- Age 65+: Up to $65,000 per person
- Includes Social Security, pensions, 401(k), IRA distributions
- Military retirement: 100% exempt (any age)

## CREDITS
- Low Income Credit: For low-income taxpayers
- Child and Dependent Care Credit: 30% of federal credit

## COMMON QUESTIONS
Q: What is the Georgia income tax rate?
A: 5.49% flat rate for 2025 (changed from progressive brackets in 2024).

Q: Does Georgia tax Social Security?
A: Social Security is part of retirement income exclusion - up to $35,000 (age 62-64) or $65,000 (age 65+) exempt.

Q: What is the Georgia standard deduction?
A: Single: $12,000, MFJ: $24,000, HOH: $18,000 for 2025.

Q: Does Georgia have personal exemptions?
A: Yes - $2,700 per taxpayer/spouse, $3,000 per dependent.

Q: When did Georgia switch to flat tax?
A: 2024 was the first year with flat 5.49% rate.
"""

from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, Any

# ============================================================
# STATE INFO
# ============================================================
STATE_CODE = "GA"
STATE_NAME = "Georgia"
STATE_FULL_NAME = "State of Georgia"
HAS_INCOME_TAX = True
TAX_TYPE = "flat"
SUPPORT_LEVEL = "full"

# ============================================================
# 2025 CONSTANTS
# ============================================================
FLAT_TAX_RATE = 0.0549  # 5.49%

STANDARD_DEDUCTION = {
    "single": 12000,
    "married_filing_jointly": 24000,
    "married_filing_separately": 12000,
    "head_of_household": 18000
}

PERSONAL_EXEMPTION = 2700  # Per taxpayer/spouse
DEPENDENT_EXEMPTION = 3000  # Per dependent

# Retirement Income Exclusion
RETIREMENT_EXCLUSION_62_64 = 35000  # Per person age 62-64
RETIREMENT_EXCLUSION_65_PLUS = 65000  # Per person age 65+

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

def get_retirement_exclusion(age: int) -> float:
    """Get retirement income exclusion based on age"""
    if age >= 65:
        return RETIREMENT_EXCLUSION_65_PLUS
    elif age >= 62:
        return RETIREMENT_EXCLUSION_62_64
    else:
        return 0

# ============================================================
# MAIN CALCULATOR
# ============================================================
def calculate(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Calculate Georgia state tax (flat tax)
    
    Required fields:
    - filing_status: str
    - federal_agi: float (or agi)
    - state_withholding: float
    
    Optional:
    - taxpayer_age: int (for retirement exclusion)
    - spouse_age: int (for retirement exclusion, MFJ only)
    - retirement_income: float
    - social_security_benefits: float
    - num_dependents: int
    - is_military_retirement: bool (100% exempt)
    """
    fs = normalize_filing_status(data.get("filing_status", "single"))
    
    # Get income
    federal_agi = data.get("federal_agi") or data.get("agi") or 0
    
    # Georgia starts with Federal AGI
    ga_agi = federal_agi
    
    # ===== RETIREMENT INCOME EXCLUSION =====
    taxpayer_age = data.get("taxpayer_age") or 0
    spouse_age = data.get("spouse_age") or 0
    retirement_income = data.get("retirement_income") or 0
    social_security = data.get("social_security_benefits") or 0
    is_military = data.get("is_military_retirement", False)
    
    total_retirement = retirement_income + social_security
    
    retirement_exclusion = 0
    if is_military:
        # Military retirement is 100% exempt
        retirement_exclusion = total_retirement
    else:
        # Age-based exclusion
        taxpayer_exclusion = get_retirement_exclusion(taxpayer_age)
        spouse_exclusion = 0
        
        if fs == "married_filing_jointly" and spouse_age > 0:
            spouse_exclusion = get_retirement_exclusion(spouse_age)
        
        retirement_exclusion = min(total_retirement, taxpayer_exclusion + spouse_exclusion)
    
    # Subtract retirement exclusion
    ga_agi = max(0, ga_agi - retirement_exclusion)
    
    # ===== STANDARD DEDUCTION =====
    std_ded = STANDARD_DEDUCTION.get(fs, 12000)
    
    # ===== PERSONAL EXEMPTIONS =====
    num_taxpayers = 2 if fs == "married_filing_jointly" else 1
    num_dependents = data.get("num_dependents") or 0
    num_dependents += data.get("qualifying_children_under_17") or 0
    num_dependents += data.get("other_dependents") or 0
    
    personal_exemptions = (num_taxpayers * PERSONAL_EXEMPTION) + (num_dependents * DEPENDENT_EXEMPTION)
    
    # ===== TAXABLE INCOME =====
    total_deductions = std_ded + personal_exemptions
    taxable_income = max(0, ga_agi - total_deductions)
    
    # ===== CALCULATE TAX (Flat Rate) =====
    state_tax = taxable_income * FLAT_TAX_RATE
    
    # ===== WITHHOLDING & RESULT =====
    withholding = data.get("state_withholding") or 0
    
    balance = withholding - state_tax
    
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
        "ga_agi": money(ga_agi),
        "retirement_exclusion": money(retirement_exclusion),
        
        # Deductions
        "standard_deduction": money(std_ded),
        "personal_exemptions": money(personal_exemptions),
        "total_deductions": money(total_deductions),
        
        # Taxable income
        "taxable_income": money(taxable_income),
        
        # Tax
        "state_tax": money(state_tax),
        "total_tax": money(state_tax),
        "base_tax": money(state_tax),
        
        # Payments
        "withholding": money(withholding),
        
        # Result
        "refund": money(max(0, balance)),
        "amount_owed": money(max(0, -balance)),
        
        "effective_rate": round((state_tax / federal_agi * 100) if federal_agi > 0 else 0, 2)
    }

# ============================================================
# RAG FUNCTIONS
# ============================================================
def get_rag_context() -> str:
    return __doc__

def answer_question(question: str) -> str:
    q = question.lower()
    
    if "rate" in q or "percent" in q:
        return "Georgia has a flat 5.49% income tax rate for 2025. It switched from progressive brackets in 2024."
    
    if "standard deduction" in q:
        return "Georgia standard deduction 2025: Single $12,000, MFJ $24,000, HOH $18,000."
    
    if "exemption" in q:
        return "Georgia personal exemption: $2,700 per taxpayer/spouse, $3,000 per dependent."
    
    if "retirement" in q:
        return "Georgia retirement income exclusion: $35,000 (age 62-64) or $65,000 (age 65+) per person. Military retirement is 100% exempt."
    
    if "social security" in q:
        return "Social Security is part of Georgia's retirement exclusion - up to $35,000 (age 62-64) or $65,000 (age 65+) exempt."
    
    if "military" in q:
        return "Georgia exempts 100% of military retirement income from taxation, regardless of age."
    
    if "flat" in q or "progressive" in q or "bracket" in q:
        return "Georgia switched to a flat 5.49% tax in 2024. It previously had progressive brackets from 1% to 5.75%."
    
    return "Georgia has a flat 5.49% income tax with generous retirement exclusions."


# ============================================================
# CLI Testing
# ============================================================
if __name__ == "__main__":
    test_data = {
        "filing_status": "married_filing_jointly",
        "federal_agi": 100000,
        "taxpayer_age": 45,
        "spouse_age": 43,
        "retirement_income": 0,
        "state_withholding": 4500,
        "num_dependents": 2
    }
    
    result = calculate(test_data)
    
    print("=" * 60)
    print(f"GEORGIA TAX CALCULATION")
    print("=" * 60)
    print(f"Filing Status:      {result['filing_status']}")
    print(f"Federal AGI:        ${result['federal_agi']:,.0f}")
    print(f"GA AGI:             ${result['ga_agi']:,.0f}")
    print(f"Standard Deduction: ${result['standard_deduction']:,.0f}")
    print(f"Personal Exemptions:${result['personal_exemptions']:,.0f}")
    print(f"Taxable Income:     ${result['taxable_income']:,.0f}")
    print(f"Tax Rate:           5.49% (flat)")
    print(f"State Tax:          ${result['state_tax']:,.2f}")
    print(f"Withholding:        ${result['withholding']:,.2f}")
    print("-" * 60)
    if result['refund'] > 0:
        print(f"REFUND:             ${result['refund']:,.2f}")
    else:
        print(f"OWED:               ${result['amount_owed']:,.2f}")
    print("=" * 60)
