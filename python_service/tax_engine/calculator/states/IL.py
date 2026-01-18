# states/IL.py
# ============================================================
# ILLINOIS TAX MODULE - 2025
# ============================================================
# Form IL-1040 - Illinois Individual Income Tax Return
# Flat tax state
# ============================================================

"""
ILLINOIS TAX RULES 2025 - RAG KNOWLEDGE BASE
============================================

## OVERVIEW
- Illinois has a FLAT income tax rate
- Rate: 4.95% (unchanged since 2017)
- No brackets - same rate for all income levels
- State constitution requires flat tax (attempted amendment failed in 2020)

## TAX RATE
- Flat Rate: 4.95%
- Applies to all taxable income
- No graduated brackets

## PERSONAL EXEMPTION 2025
- Per person: $2,775
- Additional for dependents: $2,775 each

## STARTING POINT
- Illinois starts with Federal AGI
- Has specific additions and subtractions

## CREDITS
- Property Tax Credit: 5% of property taxes paid (up to $500 single, $1,000 joint)
- Education Expense Credit: 25% of K-12 expenses (up to $750)
- Earned Income Credit: 20% of federal EITC

## LOCAL TAXES
- No local income taxes in Illinois (unlike some other states)

## COMMON QUESTIONS
Q: What is the Illinois income tax rate?
A: 4.95% flat rate on all income.

Q: Does Illinois have a progressive tax?
A: No, Illinois has a constitutionally-mandated flat tax. A 2020 ballot measure to change this failed.

Q: Does Illinois tax Social Security?
A: No, Social Security benefits are exempt from Illinois income tax.

Q: Does Illinois tax retirement income?
A: Most retirement income is exempt, including Social Security, pensions, 401(k), and IRA distributions.

Q: What is the Illinois personal exemption?
A: $2,775 per person for 2025.
"""

from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, Any

# ============================================================
# STATE INFO
# ============================================================
STATE_CODE = "IL"
STATE_NAME = "Illinois"
STATE_FULL_NAME = "State of Illinois"
HAS_INCOME_TAX = True
TAX_TYPE = "flat"

# ============================================================
# 2025 CONSTANTS
# ============================================================
FLAT_TAX_RATE = 0.0495  # 4.95%

PERSONAL_EXEMPTION = 2775  # Per person
DEPENDENT_EXEMPTION = 2775  # Per dependent

# Illinois EIC = 20% of federal EITC
IL_EIC_RATE = 0.20

# Property Tax Credit
PROPERTY_TAX_CREDIT_RATE = 0.05
PROPERTY_TAX_CREDIT_MAX_SINGLE = 500
PROPERTY_TAX_CREDIT_MAX_JOINT = 1000

# Education Expense Credit (K-12)
EDUCATION_CREDIT_RATE = 0.25
EDUCATION_CREDIT_MAX = 750

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
    return aliases.get(s, s)

# ============================================================
# MAIN CALCULATOR
# ============================================================
def calculate(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Calculate Illinois state tax (flat tax)
    
    Required fields:
    - filing_status: str
    - federal_agi: float (or agi)
    - state_withholding: float
    
    Optional:
    - num_dependents: int
    - federal_eitc: float (for IL EIC calculation)
    - property_taxes_paid: float
    - education_expenses: float
    """
    fs = normalize_filing_status(data.get("filing_status", "single"))
    
    # Illinois starts with Federal AGI
    federal_agi = data.get("federal_agi") or data.get("agi") or 0
    
    # Illinois subtractions (simplified - retirement income exempt)
    # Social Security is subtracted
    ss_benefits = data.get("social_security_benefits") or 0
    retirement_income = data.get("retirement_income") or 0
    
    il_income = max(0, federal_agi - ss_benefits - retirement_income)
    
    # Personal exemptions
    num_taxpayers = 2 if fs == "married_filing_jointly" else 1
    num_dependents = data.get("num_dependents") or data.get("other_dependents") or 0
    num_dependents += data.get("qualifying_children_under_17") or 0
    
    total_exemptions = (num_taxpayers + num_dependents) * PERSONAL_EXEMPTION
    
    # Taxable income
    taxable_income = max(0, il_income - total_exemptions)
    
    # Calculate tax (flat rate)
    base_tax = taxable_income * FLAT_TAX_RATE
    
    # ===== CREDITS =====
    
    # Illinois Earned Income Credit (20% of federal EITC)
    federal_eitc = data.get("federal_eitc") or 0
    il_eic = federal_eitc * IL_EIC_RATE
    
    # Property Tax Credit
    property_taxes = data.get("property_taxes_paid") or 0
    property_credit_max = PROPERTY_TAX_CREDIT_MAX_JOINT if fs == "married_filing_jointly" else PROPERTY_TAX_CREDIT_MAX_SINGLE
    property_credit = min(property_taxes * PROPERTY_TAX_CREDIT_RATE, property_credit_max)
    
    # Education Expense Credit (K-12)
    education_expenses = data.get("education_expenses") or 0
    education_credit = min(education_expenses * EDUCATION_CREDIT_RATE, EDUCATION_CREDIT_MAX)
    
    # Total credits
    total_credits = il_eic + property_credit + education_credit
    
    # Tax after credits (EIC is refundable, others limited to tax)
    nonrefundable_used = min(property_credit + education_credit, base_tax)
    tax_after_credits = max(0, base_tax - nonrefundable_used)
    refundable_credits = il_eic
    
    # Withholding
    withholding = data.get("state_withholding") or 0
    
    # Final calculation
    balance = withholding - tax_after_credits + refundable_credits
    
    return {
        "state": STATE_CODE,
        "state_name": STATE_NAME,
        "filing_status": fs,
        "tax_type": "flat",
        "tax_rate": FLAT_TAX_RATE,
        
        # Income
        "federal_agi": money(federal_agi),
        "il_income": money(il_income),
        "exemptions": money(total_exemptions),
        "taxable_income": money(taxable_income),
        
        # Tax
        "base_tax": money(base_tax),
        "state_tax": money(base_tax),
        
        # Credits
        "il_eic": money(il_eic),
        "property_credit": money(property_credit),
        "education_credit": money(education_credit),
        "total_credits": money(total_credits),
        
        # Final
        "tax_after_credits": money(tax_after_credits),
        "withholding": money(withholding),
        "refundable_credits": money(refundable_credits),
        
        # Result
        "refund": money(max(0, balance)),
        "amount_owed": money(max(0, -balance)),
        
        "effective_rate": round((tax_after_credits / federal_agi * 100) if federal_agi > 0 else 0, 2)
    }

# ============================================================
# RAG FUNCTIONS
# ============================================================
def get_rag_context() -> str:
    return __doc__

def answer_question(question: str) -> str:
    q = question.lower()
    
    if "rate" in q or "percent" in q:
        return "Illinois has a flat 4.95% income tax rate on all taxable income."
    
    if "progressive" in q or "bracket" in q:
        return "Illinois does NOT have progressive tax brackets. It has a flat 4.95% rate required by the state constitution."
    
    if "social security" in q:
        return "Illinois does NOT tax Social Security benefits."
    
    if "retirement" in q or "pension" in q:
        return "Illinois exempts most retirement income from taxation, including Social Security, pensions, 401(k), and IRA distributions."
    
    if "exemption" in q:
        return f"Illinois personal exemption for 2025: ${PERSONAL_EXEMPTION} per person."
    
    if "eic" in q or "earned income" in q:
        return "Illinois EIC is 20% of federal EITC - a refundable credit."
    
    return "Illinois has a flat 4.95% income tax rate. Most retirement income is exempt."
