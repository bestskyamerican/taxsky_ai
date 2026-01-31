# states/NC.py
# ============================================================
# NORTH CAROLINA TAX MODULE - 2025
# ============================================================
# Form D-400 - North Carolina Individual Income Tax Return
# Flat tax state - rate decreasing yearly
# ============================================================

"""
NORTH CAROLINA TAX RULES 2025 - RAG KNOWLEDGE BASE
==================================================

## OVERVIEW
- North Carolina has a FLAT income tax
- 2025 Rate: 4.5% (down from 4.75% in 2024)
- Rate has been decreasing since 2014 (was 5.8%)
- Goal: Continue reducing toward 3.99%

## TAX RATE HISTORY
| Year | Rate | Notes |
|------|------|-------|
| 2014 | 5.8% | Started transition |
| 2020 | 5.25% | |
| 2022 | 4.99% | |
| 2024 | 4.75% | |
| 2025 | 4.5% | Current |
| 2026+ | May decrease further | |

## STANDARD DEDUCTION 2025
| Filing Status | Amount |
|---------------|--------|
| Single | $13,500 |
| Married Filing Jointly | $27,000 |
| Married Filing Separately | $13,500 |
| Head of Household | $20,250 |

## NO PERSONAL EXEMPTIONS
- North Carolina eliminated personal exemptions
- Only standard deduction applies

## CHILD DEDUCTION
- $2,500 per qualifying child (under 17)
- Phase-out at higher incomes

## RETIREMENT INCOME
- Social Security: NOT TAXED (fully exempt)
- Bailey Settlement: Government retirees vested before 8/12/1989 exempt
- Military retirement: Exempt up to $30,000

## CREDITS
- Child Tax Credit (state): Based on federal AGI
- Credit for Children with Disabilities

## COMMON QUESTIONS
Q: What is the North Carolina income tax rate for 2025?
A: 4.5% flat rate (reduced from 4.75% in 2024).

Q: Does North Carolina tax Social Security?
A: No, Social Security benefits are completely exempt from NC tax.

Q: What is the NC standard deduction?
A: Single $13,500, MFJ $27,000, HOH $20,250 for 2025.

Q: Does North Carolina have personal exemptions?
A: No, NC eliminated personal exemptions. Only standard deduction applies.

Q: Is military retirement taxed in NC?
A: Up to $30,000 of military retirement is exempt from NC tax.

Q: Why is NC tax rate decreasing?
A: NC legislature set goal to reduce rate to below 4%. Rate drops as revenue targets are met.
"""

from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, Any

# ============================================================
# STATE INFO
# ============================================================
STATE_CODE = "NC"
STATE_NAME = "North Carolina"
STATE_FULL_NAME = "State of North Carolina"
HAS_INCOME_TAX = True
TAX_TYPE = "flat"
SUPPORT_LEVEL = "full"

# ============================================================
# 2025 CONSTANTS
# ============================================================
FLAT_TAX_RATE = 0.045  # 4.5% (down from 4.75% in 2024)

STANDARD_DEDUCTION = {
    "single": 13500,
    "married_filing_jointly": 27000,
    "married_filing_separately": 13500,
    "head_of_household": 20250
}

# NC has NO personal exemptions (eliminated)
PERSONAL_EXEMPTION = 0

# Child deduction (not exemption)
CHILD_DEDUCTION = 2500  # Per qualifying child under 17

# Military retirement exemption
MILITARY_RETIREMENT_EXEMPTION = 30000

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
        "s": "single", "mfj": "married_filing_jointly",
        "mfs": "married_filing_separately", "hoh": "head_of_household"
    }
    return aliases.get(s, s if s in STANDARD_DEDUCTION else "single")

# ============================================================
# MAIN CALCULATOR
# ============================================================
def calculate(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Calculate North Carolina state tax (flat tax)
    
    Required fields:
    - filing_status: str
    - federal_agi: float (or agi)
    - state_withholding: float
    
    Optional:
    - social_security_benefits: float (always exempt)
    - military_retirement: float (up to $30K exempt)
    - num_children: int (for child deduction)
    """
    fs = normalize_filing_status(data.get("filing_status", "single"))
    
    # Get income
    federal_agi = data.get("federal_agi") or data.get("agi") or 0
    
    # ===== NC INCOME ADJUSTMENTS =====
    # Start with Federal AGI
    nc_agi = federal_agi
    
    # Social Security is fully exempt (add back if included in AGI)
    social_security = data.get("social_security_benefits") or data.get("taxable_social_security") or 0
    # Note: Social Security is already partially excluded at federal level
    # NC excludes ALL social security
    
    # Military retirement exemption (up to $30,000)
    military_retirement = data.get("military_retirement") or 0
    military_exemption = min(military_retirement, MILITARY_RETIREMENT_EXEMPTION)
    
    # NC additions/subtractions (simplified)
    nc_additions = data.get("nc_additions") or 0
    nc_subtractions = data.get("nc_subtractions") or 0
    
    nc_agi = nc_agi + nc_additions - nc_subtractions - military_exemption
    nc_agi = max(0, nc_agi)
    
    # ===== STANDARD DEDUCTION =====
    std_ded = STANDARD_DEDUCTION.get(fs, 13500)
    
    # ===== CHILD DEDUCTION =====
    num_children = data.get("num_children") or data.get("qualifying_children_under_17") or 0
    child_deduction = num_children * CHILD_DEDUCTION
    
    # ===== TAXABLE INCOME =====
    total_deductions = std_ded + child_deduction
    taxable_income = max(0, nc_agi - total_deductions)
    
    # ===== CALCULATE TAX (Flat 4.5%) =====
    state_tax = taxable_income * FLAT_TAX_RATE
    
    # ===== NC CHILD TAX CREDIT =====
    # Simplified - NC has a child tax credit but varies by income
    nc_child_credit = 0
    if num_children > 0 and nc_agi < 100000:  # Simplified threshold
        nc_child_credit = min(num_children * 125, state_tax * 0.5)  # Up to 50% of tax
    
    tax_after_credits = max(0, state_tax - nc_child_credit)
    
    # ===== WITHHOLDING & RESULT =====
    withholding = data.get("state_withholding") or 0
    
    balance = withholding - tax_after_credits
    
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
        "nc_agi": money(nc_agi),
        "ca_agi": money(nc_agi),  # For UI compatibility
        
        # Exemptions
        "military_exemption": money(military_exemption),
        "social_security_exempt": True,  # Always exempt in NC
        
        # Deductions
        "standard_deduction": money(std_ded),
        "child_deduction": money(child_deduction),
        "exemptions": 0,  # NC has no personal exemptions
        "total_deductions": money(total_deductions),
        
        # Taxable income
        "taxable_income": money(taxable_income),
        
        # Tax
        "base_tax": money(state_tax),
        "state_tax": money(state_tax),
        
        # Credits
        "nc_child_credit": money(nc_child_credit),
        "total_credits": money(nc_child_credit),
        
        # Final tax
        "tax_after_credits": money(tax_after_credits),
        "total_tax": money(tax_after_credits),
        
        # Payments
        "withholding": money(withholding),
        
        # Result
        "refund": money(max(0, balance)),
        "amount_owed": money(max(0, -balance)),
        
        # Rates
        "effective_rate": round((tax_after_credits / federal_agi * 100) if federal_agi > 0 else 0, 2),
        
        # Notes
        "notes": "NC flat 4.5% tax (reduced from 4.75% in 2024). No personal exemptions. SS fully exempt."
    }

# ============================================================
# RAG FUNCTIONS
# ============================================================
def get_rag_context() -> str:
    return __doc__

def answer_question(question: str) -> str:
    q = question.lower()
    
    if "rate" in q or "percent" in q:
        return "North Carolina has a flat 4.5% income tax rate for 2025 (down from 4.75% in 2024). The rate has been decreasing since 2014."
    
    if "standard deduction" in q:
        return "NC standard deduction 2025: Single $13,500, MFJ $27,000, HOH $20,250."
    
    if "exemption" in q or "personal" in q:
        return "North Carolina has NO personal exemptions. Only standard deduction applies."
    
    if "social security" in q:
        return "North Carolina does NOT tax Social Security benefits - they are fully exempt."
    
    if "military" in q:
        return "NC exempts up to $30,000 of military retirement income from state tax."
    
    if "child" in q:
        return "NC allows $2,500 deduction per qualifying child under 17, plus a state child tax credit."
    
    if "decreasing" in q or "dropping" in q or "history" in q:
        return "NC tax rate has dropped from 5.8% (2014) to 4.5% (2025). The legislature aims to reduce it further."
    
    return f"North Carolina has a flat 4.5% tax rate. Social Security is fully exempt. Standard deduction only (no personal exemptions)."


# ============================================================
# CLI Testing
# ============================================================
if __name__ == "__main__":
    test_data = {
        "filing_status": "married_filing_jointly",
        "federal_agi": 100000,
        "state_withholding": 4000,
        "num_children": 2
    }
    
    result = calculate(test_data)
    
    print("=" * 60)
    print(f"NORTH CAROLINA TAX CALCULATION")
    print("=" * 60)
    print(f"Federal AGI:        ${result['federal_agi']:,.0f}")
    print(f"NC AGI:             ${result['nc_agi']:,.0f}")
    print(f"Standard Deduction: ${result['standard_deduction']:,.0f}")
    print(f"Child Deduction:    ${result['child_deduction']:,.0f}")
    print(f"Taxable Income:     ${result['taxable_income']:,.0f}")
    print(f"Tax Rate:           4.5% (flat)")
    print(f"Base Tax:           ${result['base_tax']:,.2f}")
    print(f"NC Child Credit:    -${result['nc_child_credit']:,.2f}")
    print(f"Tax After Credits:  ${result['tax_after_credits']:,.2f}")
    print(f"Withholding:        ${result['withholding']:,.2f}")
    print("-" * 60)
    if result['refund'] > 0:
        print(f"REFUND:             ${result['refund']:,.2f}")
    else:
        print(f"OWED:               ${result['amount_owed']:,.2f}")
    print("=" * 60)
