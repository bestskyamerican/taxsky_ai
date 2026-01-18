# states/TX.py
# ============================================================
# TEXAS TAX MODULE - 2025
# ============================================================
# Texas has NO state income tax
# ============================================================

"""
TEXAS TAX RULES 2025 - RAG KNOWLEDGE BASE
=========================================

## OVERVIEW
- Texas has NO state income tax
- The Texas Constitution prohibits a state income tax
- Revenue comes from sales tax, property tax, and franchise tax on businesses

## INCOME TAX
- Rate: 0%
- No personal income tax
- No tax on wages, self-employment, investments, or retirement income

## WHY NO INCOME TAX?
- Texas Constitution Article VIII prohibits personal income tax without voter approval
- Revenue is generated through:
  - Sales tax: 6.25% state + up to 2% local (8.25% max)
  - Property tax: varies by county (among highest in nation)
  - Franchise tax: 0.375% - 0.75% on businesses

## BENEFITS FOR TAXPAYERS
- No state withholding from paychecks
- No state tax return required (for income tax)
- No tax on Social Security, pensions, or retirement distributions
- No tax on capital gains or dividends

## COMMON QUESTIONS
Q: Does Texas have a state income tax?
A: No, Texas has no personal income tax.

Q: Do I need to file a Texas state tax return?
A: No state income tax return is required for individuals.

Q: Does Texas tax retirement income?
A: No, Texas does not tax any retirement income including pensions, 401(k), IRA distributions, or Social Security.

Q: Does Texas tax capital gains?
A: No, there is no state tax on capital gains in Texas.

Q: What taxes does Texas have?
A: Texas has sales tax (up to 8.25%), property tax, and franchise tax on businesses. No personal income tax.
"""

from typing import Dict, Any

# ============================================================
# STATE INFO
# ============================================================
STATE_CODE = "TX"
STATE_NAME = "Texas"
STATE_FULL_NAME = "State of Texas"
HAS_INCOME_TAX = False
TAX_TYPE = "none"

# ============================================================
# MAIN CALCULATOR
# ============================================================
def calculate(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Texas has no state income tax
    Returns zero tax result
    """
    return {
        "state": STATE_CODE,
        "state_name": STATE_NAME,
        "has_income_tax": False,
        "filing_status": data.get("filing_status", "single"),
        
        # All zeros
        "taxable_income": 0,
        "state_tax": 0,
        "total_tax": 0,
        "withholding": 0,
        "credits": 0,
        
        # Result
        "refund": 0,
        "amount_owed": 0,
        "effective_rate": 0,
        
        # Message
        "notes": "Texas has no state income tax. No state return required."
    }

# ============================================================
# RAG QUERY FUNCTION
# ============================================================
def get_rag_context() -> str:
    """Return RAG knowledge for this state"""
    return __doc__

def answer_question(question: str) -> str:
    """Answer state-specific tax question"""
    q = question.lower()
    
    if "income tax" in q or "tax rate" in q:
        return "Texas has NO state income tax. The Texas Constitution prohibits personal income tax."
    
    if "file" in q or "return" in q:
        return "No state income tax return is required in Texas."
    
    if "retirement" in q or "social security" in q or "pension" in q:
        return "Texas does not tax any retirement income - no tax on Social Security, pensions, 401(k), or IRA distributions."
    
    if "capital gains" in q:
        return "Texas has no tax on capital gains."
    
    if "sales tax" in q:
        return "Texas sales tax: 6.25% state + up to 2% local = 8.25% maximum."
    
    if "property tax" in q:
        return "Texas has property tax that varies by county. Texas property taxes are among the highest in the nation."
    
    return "Texas has no personal income tax. Your question may relate to sales tax, property tax, or federal taxes."
