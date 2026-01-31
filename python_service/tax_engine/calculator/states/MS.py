# states/MS.py
# ============================================================
# MISSISSIPPI TAX MODULE - 2025
# ============================================================
# Form 80-105 - Mississippi Individual Income Tax Return
# Flat tax: 4.7%
# ============================================================

from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, Any

STATE_CODE = "MS"
STATE_NAME = "Mississippi"
STATE_FULL_NAME = "State of Mississippi"
HAS_INCOME_TAX = True
TAX_TYPE = "flat"
FORM = "80-105"

FLAT_TAX_RATE = 0.047

STANDARD_DEDUCTION = {
    "single": 2300,
    "married_filing_jointly": 4600,
    "married_filing_separately": 2300,
    "head_of_household": 3400
}

PERSONAL_EXEMPTION = {'single': 6000, 'mfj': 12000, 'mfs': 6000, 'hoh': 8000}
DEPENDENT_EXEMPTION = 0

def money(amount): return float(Decimal(str(amount)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP))

def normalize_filing_status(status):
    if not status: return "single"
    s = str(status).lower().replace(" ", "_").replace("-", "_")
    return {"s": "single", "mfj": "married_filing_jointly", "mfs": "married_filing_separately", "hoh": "head_of_household"}.get(s, s if s in STANDARD_DEDUCTION else "single")

def calculate(data: Dict[str, Any]) -> Dict[str, Any]:
    fs = normalize_filing_status(data.get("filing_status", "single"))
    federal_agi = float(data.get("federal_agi") or data.get("agi") or 0)
    
    std_ded = STANDARD_DEDUCTION.get(fs, 0)
    pe = PERSONAL_EXEMPTION.get(fs, PERSONAL_EXEMPTION) if isinstance(PERSONAL_EXEMPTION, dict) else PERSONAL_EXEMPTION
    num_exemptions = 2 if fs == "married_filing_jointly" else 1
    num_deps = int(data.get("num_dependents") or 0) + int(data.get("qualifying_children_under_17") or 0)
    total_exemptions = (num_exemptions * pe) + (num_deps * DEPENDENT_EXEMPTION)
    
    taxable_income = max(0, federal_agi - std_ded - total_exemptions)
    state_tax = taxable_income * FLAT_TAX_RATE

    withholding = float(data.get("state_withholding") or 0)
    balance = withholding - state_tax
    
    return {
        "state": STATE_CODE, "state_name": STATE_NAME, "filing_status": fs,
        "form": FORM, "has_income_tax": True, "tax_type": "flat", "tax_rate": FLAT_TAX_RATE,
        "federal_agi": money(federal_agi), "standard_deduction": money(std_ded),
        "exemptions": money(total_exemptions), "taxable_income": money(taxable_income),
        "base_tax": money(state_tax), "state_tax": money(state_tax), "total_tax": money(state_tax),
        "withholding": money(withholding), "refund": money(max(0, balance)), "amount_owed": money(max(0, -balance)),
        "effective_rate": round((state_tax / federal_agi * 100) if federal_agi > 0 else 0, 2),
        "notes": "First $10,000 of income is exempt"
    }

def get_rag_context():
    return """Mississippi Tax 2025: Flat 4.7% rate. Std ded: Single $2,300, MFJ $4,600. First $10,000 of income is exempt"""

def answer_question(q):
    return "Mississippi has a flat 4.7% income tax rate."

if __name__ == "__main__":
    r = calculate({"filing_status": "single", "federal_agi": 100000, "state_withholding": 3000})
    print(f"MS Tax: ${r['state_tax']:,.2f} | Effective: {r['effective_rate']}%")
