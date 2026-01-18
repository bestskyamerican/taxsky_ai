# states/NY.py
# ============================================================
# NEW YORK TAX MODULE - 2025
# ============================================================
# Form IT-201 - New York State Resident Income Tax Return
# NYC residents also pay city tax
# ============================================================

"""
NEW YORK TAX RULES 2025 - RAG KNOWLEDGE BASE
============================================

## OVERVIEW
- Progressive state income tax with 9 brackets (4% to 10.9%)
- NYC residents pay additional city tax (3.078% to 3.876%)
- Yonkers residents pay 16.75% surcharge on state tax

## STANDARD DEDUCTIONS 2025
| Filing Status | Amount |
|---------------|--------|
| Single | $8,000 |
| Married Filing Jointly | $16,050 |
| Married Filing Separately | $8,000 |
| Head of Household | $11,200 |

## STATE TAX BRACKETS 2025 (Single)
| Income | Rate |
|--------|------|
| $0 - $8,500 | 4% |
| $8,500 - $11,700 | 4.5% |
| $11,700 - $13,900 | 5.25% |
| $13,900 - $80,650 | 5.5% |
| $80,650 - $215,400 | 6% |
| $215,400 - $1,077,550 | 6.85% |
| $1,077,550 - $5,000,000 | 9.65% |
| $5,000,000 - $25,000,000 | 10.3% |
| Over $25,000,000 | 10.9% |

## NYC TAX BRACKETS (All Filers)
| Income | Rate |
|--------|------|
| $0 - $12,000 | 3.078% |
| $12,000 - $25,000 | 3.762% |
| $25,000 - $50,000 | 3.819% |
| Over $50,000 | 3.876% |

## NYC TAX TOTAL
- Combined NY State + NYC can reach 14.776% (10.9% + 3.876%)
- This is among the highest in the nation

## CREDITS
- Empire State Child Credit: up to $330 per child
- NYC School Tax Credit: $63-$125
- Household Credit: varies by income

## COMMON QUESTIONS
Q: Does NY tax Social Security?
A: No, New York does not tax Social Security benefits.

Q: What is the NYC tax rate?
A: NYC has rates from 3.078% to 3.876% on top of state tax.

Q: Do I pay NYC tax if I work in NYC but live elsewhere?
A: NYC tax applies only to NYC residents. Non-residents working in NYC pay only state tax.

Q: What is the top tax rate in New York?
A: 10.9% state rate (over $25M income), plus 3.876% for NYC residents = 14.776% combined.
"""

from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, Any

# ============================================================
# STATE INFO
# ============================================================
STATE_CODE = "NY"
STATE_NAME = "New York"
STATE_FULL_NAME = "State of New York"
HAS_INCOME_TAX = True
TAX_TYPE = "progressive"
HAS_LOCAL_TAX = True  # NYC, Yonkers

# ============================================================
# 2025 CONSTANTS
# ============================================================
STANDARD_DEDUCTION = {
    "single": 8000,
    "married_filing_jointly": 16050,
    "married_filing_separately": 8000,
    "head_of_household": 11200
}

TAX_BRACKETS = {
    "single": [
        (8500, 0.04),
        (11700, 0.045),
        (13900, 0.0525),
        (80650, 0.055),
        (215400, 0.06),
        (1077550, 0.0685),
        (5000000, 0.0965),
        (25000000, 0.103),
        (float('inf'), 0.109)
    ],
    "married_filing_jointly": [
        (17150, 0.04),
        (23600, 0.045),
        (27900, 0.0525),
        (161550, 0.055),
        (323200, 0.06),
        (2155350, 0.0685),
        (5000000, 0.0965),
        (25000000, 0.103),
        (float('inf'), 0.109)
    ],
    "married_filing_separately": [
        (8500, 0.04),
        (11700, 0.045),
        (13900, 0.0525),
        (80650, 0.055),
        (215400, 0.06),
        (1077550, 0.0685),
        (5000000, 0.0965),
        (25000000, 0.103),
        (float('inf'), 0.109)
    ],
    "head_of_household": [
        (12800, 0.04),
        (17650, 0.045),
        (20900, 0.0525),
        (107650, 0.055),
        (269300, 0.06),
        (1616450, 0.0685),
        (5000000, 0.0965),
        (25000000, 0.103),
        (float('inf'), 0.109)
    ]
}

# NYC Tax Brackets (same for all filing statuses)
NYC_TAX_BRACKETS = [
    (12000, 0.03078),
    (25000, 0.03762),
    (50000, 0.03819),
    (float('inf'), 0.03876)
]

# Yonkers surcharge
YONKERS_SURCHARGE_RATE = 0.1675  # 16.75% of NY state tax

# Empire State Child Credit
CHILD_CREDIT_MAX = 330

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

def calculate_bracket_tax(income: float, brackets: list) -> float:
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
# MAIN CALCULATOR
# ============================================================
def calculate(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Calculate New York state tax
    
    Required fields:
    - filing_status: str
    - federal_agi: float (or agi)
    - state_withholding: float
    
    Optional:
    - is_nyc: bool (NYC resident)
    - is_yonkers: bool (Yonkers resident)
    - num_children: int
    """
    fs = normalize_filing_status(data.get("filing_status", "single"))
    
    # NY starts with Federal AGI
    federal_agi = data.get("federal_agi") or data.get("agi") or 0
    
    # NY adjustments (simplified)
    ny_agi = federal_agi
    
    # Standard deduction
    std_ded = STANDARD_DEDUCTION.get(fs, 8000)
    
    # Taxable income
    taxable_income = max(0, ny_agi - std_ded)
    
    # State tax from brackets
    state_tax = calculate_bracket_tax(taxable_income, TAX_BRACKETS.get(fs, TAX_BRACKETS["single"]))
    
    # NYC tax (if NYC resident)
    is_nyc = data.get("is_nyc", False)
    nyc_tax = 0
    if is_nyc:
        nyc_tax = calculate_bracket_tax(taxable_income, NYC_TAX_BRACKETS)
    
    # Yonkers tax (if Yonkers resident)
    is_yonkers = data.get("is_yonkers", False)
    yonkers_tax = 0
    if is_yonkers:
        yonkers_tax = state_tax * YONKERS_SURCHARGE_RATE
    
    # Total tax
    total_tax = state_tax + nyc_tax + yonkers_tax
    
    # Credits
    num_children = data.get("num_children") or data.get("qualifying_children_under_17") or 0
    child_credit = min(num_children * CHILD_CREDIT_MAX, state_tax)
    
    tax_after_credits = max(0, total_tax - child_credit)
    
    # Withholding
    withholding = data.get("state_withholding") or 0
    
    # Final
    balance = withholding - tax_after_credits
    
    return {
        "state": STATE_CODE,
        "state_name": STATE_NAME,
        "filing_status": fs,
        
        # Income
        "ny_agi": money(ny_agi),
        "standard_deduction": money(std_ded),
        "taxable_income": money(taxable_income),
        
        # Tax breakdown
        "state_tax": money(state_tax),
        "nyc_tax": money(nyc_tax),
        "yonkers_tax": money(yonkers_tax),
        "total_tax": money(total_tax),
        
        # Credits
        "child_credit": money(child_credit),
        
        # Final
        "tax_after_credits": money(tax_after_credits),
        "withholding": money(withholding),
        
        # Result
        "refund": money(max(0, balance)),
        "amount_owed": money(max(0, -balance)),
        
        # Info
        "is_nyc_resident": is_nyc,
        "is_yonkers_resident": is_yonkers,
        "effective_rate": round((tax_after_credits / ny_agi * 100) if ny_agi > 0 else 0, 2)
    }

# ============================================================
# RAG FUNCTIONS
# ============================================================
def get_rag_context() -> str:
    return __doc__

def answer_question(question: str) -> str:
    q = question.lower()
    
    if "standard deduction" in q:
        return "NY standard deduction 2025: Single $8,000, MFJ $16,050, HOH $11,200"
    
    if "nyc" in q and ("rate" in q or "tax" in q):
        return "NYC tax rates: 3.078% to 3.876% on top of state tax. Combined can reach 14.776%."
    
    if "rate" in q or "bracket" in q:
        return "NY state rates range from 4% to 10.9%. Top rate applies to income over $25 million."
    
    if "social security" in q:
        return "New York does NOT tax Social Security benefits."
    
    if "yonkers" in q:
        return "Yonkers residents pay 16.75% surcharge on NY state tax."
    
    return "Please ask a specific question about New York state taxes."
