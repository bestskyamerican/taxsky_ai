# states/RI.py
# ============================================================
# RHODE ISLAND TAX MODULE - 2025
# ============================================================
# Form RI-1040 - Rhode Island Individual Income Tax Return
# Progressive tax
# ============================================================

from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, Any

STATE_CODE = "RI"
STATE_NAME = "Rhode Island"
STATE_FULL_NAME = "State of Rhode Island"
HAS_INCOME_TAX = True
TAX_TYPE = "progressive"
FORM = "RI-1040"

STANDARD_DEDUCTION = {
    "single": 10550,
    "married_filing_jointly": 21150,
    "married_filing_separately": 10550,
    "head_of_household": 15800
}

TAX_BRACKETS = {
    "single": [(73450, 0.0375), (166950, 0.0475), (999999999, 0.0599)],
    "married_filing_jointly": [(73450, 0.0375), (166950, 0.0475), (999999999, 0.0599)],
    "married_filing_separately": [(73450, 0.0375), (166950, 0.0475), (999999999, 0.0599)],
    "head_of_household": [(73450, 0.0375), (166950, 0.0475), (999999999, 0.0599)]
}

PERSONAL_EXEMPTION = 4850
DEPENDENT_EXEMPTION = 4850

def money(amount): return float(Decimal(str(amount)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP))

def normalize_filing_status(status):
    if not status: return "single"
    s = str(status).lower().replace(" ", "_").replace("-", "_")
    return {"s": "single", "mfj": "married_filing_jointly", "mfs": "married_filing_separately", "hoh": "head_of_household"}.get(s, s if s in STANDARD_DEDUCTION else "single")

def calculate_bracket_tax(income, brackets):
    tax, prev = 0, 0
    for limit, rate in brackets:
        if income <= prev: break
        tax += (min(income, limit) - prev) * rate
        prev = limit
    return tax

def calculate(data: Dict[str, Any]) -> Dict[str, Any]:
    fs = normalize_filing_status(data.get("filing_status", "single"))
    federal_agi = float(data.get("federal_agi") or data.get("agi") or 0)
    state_agi = federal_agi

    std_ded = STANDARD_DEDUCTION.get(fs, 0)
    pe = PERSONAL_EXEMPTION.get(fs, PERSONAL_EXEMPTION) if isinstance(PERSONAL_EXEMPTION, dict) else PERSONAL_EXEMPTION
    num_exemptions = 2 if fs == "married_filing_jointly" else 1
    num_deps = int(data.get("num_dependents") or 0) + int(data.get("qualifying_children_under_17") or 0)
    total_exemptions = (num_exemptions * pe) + (num_deps * DEPENDENT_EXEMPTION)
    
    taxable_income = max(0, state_agi - std_ded - total_exemptions)
    brackets = TAX_BRACKETS.get(fs, TAX_BRACKETS["single"])
    state_tax = calculate_bracket_tax(taxable_income, brackets)
    
    withholding = float(data.get("state_withholding") or 0)
    balance = withholding - state_tax
    
    return {
        "state": STATE_CODE, "state_name": STATE_NAME, "filing_status": fs,
        "form": FORM, "has_income_tax": True, "tax_type": "progressive",
        "federal_agi": money(federal_agi), "standard_deduction": money(std_ded),
        "exemptions": money(total_exemptions), "taxable_income": money(taxable_income),
        "base_tax": money(state_tax), "state_tax": money(state_tax), "total_tax": money(state_tax),
        "withholding": money(withholding), "refund": money(max(0, balance)), "amount_owed": money(max(0, -balance)),
        "effective_rate": round((state_tax / federal_agi * 100) if federal_agi > 0 else 0, 2),
        "notes": "3 brackets, top rate 5.99%"
    }

def get_rag_context():
    return """Rhode Island Tax 2025: Progressive tax. 3 brackets, top rate 5.99%"""

def answer_question(q):
    return "Rhode Island has progressive income tax."

if __name__ == "__main__":
    r = calculate({"filing_status": "single", "federal_agi": 100000, "state_withholding": 4000})
    print(f"RI Tax: ${r['state_tax']:,.2f} | Effective: {r['effective_rate']}%")
