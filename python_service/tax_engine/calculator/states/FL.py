# states/FL.py
# ============================================================
# FLORIDA TAX MODULE - 2025
# ============================================================
# Florida has NO state income tax
# ============================================================

"""
FLORIDA TAX RULES 2025 - RAG KNOWLEDGE BASE
===========================================

## OVERVIEW
- Florida has NO state income tax
- Florida Constitution Article VII, Section 5 prohibits personal income tax
- Revenue comes from sales tax, property tax, and tourism

## INCOME TAX
- Rate: 0%
- No personal income tax
- No tax on wages, self-employment, investments, or retirement income
- No state tax withholding required

## WHY NO INCOME TAX?
- Florida Constitution prohibits state income tax on individuals
- Would require constitutional amendment approved by voters
- State relies on:
  - Sales tax: 6% state + up to 2% local (7.5% average)
  - Property tax: varies by county
  - Tourism taxes
  - Documentary stamp taxes

## BENEFITS FOR TAXPAYERS
- No state withholding from paychecks
- No state tax return required
- No tax on Social Security, pensions, or retirement distributions
- No tax on capital gains or dividends
- Popular destination for retirees

## COMMON QUESTIONS
Q: Does Florida have a state income tax?
A: No, Florida has no personal income tax.

Q: Do I need to file a Florida state tax return?
A: No state income tax return is required.

Q: Does Florida tax retirement income?
A: No, Florida does not tax any retirement income.

Q: Does Florida tax Social Security?
A: No, there is no state tax on Social Security in Florida.

Q: What is the Florida sales tax rate?
A: 6% state rate, plus local taxes (usually 0.5-2%) for typical total of 6.5-8%.
"""

from typing import Dict, Any

# ============================================================
# STATE INFO
# ============================================================
STATE_CODE = "FL"
STATE_NAME = "Florida"
STATE_FULL_NAME = "State of Florida"
HAS_INCOME_TAX = False
TAX_TYPE = "none"

# ============================================================
# MAIN CALCULATOR
# ============================================================
def calculate(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Florida has no state income tax
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
        "notes": "Florida has no state income tax. No state return required."
    }

# ============================================================
# RAG FUNCTIONS
# ============================================================
def get_rag_context() -> str:
    return __doc__

def answer_question(question: str) -> str:
    q = question.lower()
    
    if "income tax" in q or "tax rate" in q:
        return "Florida has NO state income tax. The Florida Constitution prohibits personal income tax."
    
    if "file" in q or "return" in q:
        return "No state income tax return is required in Florida."
    
    if "retirement" in q or "social security" in q:
        return "Florida does not tax any retirement income - including Social Security, pensions, 401(k), and IRA distributions."
    
    if "sales tax" in q:
        return "Florida sales tax: 6% state + up to 2% local (typically 6.5-8% total)."
    
    return "Florida has no personal income tax. No state return is required."
