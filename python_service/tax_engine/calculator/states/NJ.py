# states/NJ.py
# ============================================================
# NEW JERSEY TAX MODULE - 2025 - v1.0
# ============================================================
# Tax Rates: 1.4% - 10.75% (progressive, 7-8 brackets)
# Standard Deduction: None (NJ uses exemptions instead)
# Personal Exemption: $1,000 per person
# Dependent Exemption: $1,500 per child dependent
# ============================================================

from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, Any

# ============================================================
# STATE INFO
# ============================================================
STATE_CODE = "NJ"
STATE_NAME = "New Jersey"
STATE_FULL_NAME = "State of New Jersey"
HAS_INCOME_TAX = True
TAX_TYPE = "progressive"
SUPPORT_LEVEL = "full"

# ============================================================
# 2025 CONSTANTS
# ============================================================
# NJ doesn't have standard deduction - uses exemptions instead
STANDARD_DEDUCTION = {
    "single": 0,
    "married_filing_jointly": 0,
    "married_filing_separately": 0,
    "head_of_household": 0
}

# Personal exemptions
PERSONAL_EXEMPTION = 1000       # Per taxpayer
DEPENDENT_EXEMPTION = 1500     # Per qualifying child dependent
SENIOR_EXEMPTION = 1000        # Additional for 65+
BLIND_EXEMPTION = 1000         # Additional if blind

# ============================================================
# 2025 TAX BRACKETS
# ============================================================
TAX_BRACKETS = {
    "single": [
        (20000, 0.014),      # 1.4% on first $20,000
        (35000, 0.0175),     # 1.75% on $20,001 - $35,000
        (40000, 0.035),      # 3.5% on $35,001 - $40,000
        (75000, 0.05525),    # 5.525% on $40,001 - $75,000
        (500000, 0.0637),    # 6.37% on $75,001 - $500,000
        (1000000, 0.0897),   # 8.97% on $500,001 - $1,000,000
        (float('inf'), 0.1075)  # 10.75% on $1,000,001+
    ],
    "married_filing_jointly": [
        (20000, 0.014),      # 1.4% on first $20,000
        (50000, 0.0175),     # 1.75% on $20,001 - $50,000
        (70000, 0.0245),     # 2.45% on $50,001 - $70,000
        (80000, 0.035),      # 3.5% on $70,001 - $80,000
        (150000, 0.05525),   # 5.525% on $80,001 - $150,000
        (500000, 0.0637),    # 6.37% on $150,001 - $500,000
        (1000000, 0.0897),   # 8.97% on $500,001 - $1,000,000
        (float('inf'), 0.1075)  # 10.75% on $1,000,001+
    ],
    "married_filing_separately": [
        (20000, 0.014),
        (35000, 0.0175),
        (40000, 0.035),
        (75000, 0.05525),
        (500000, 0.0637),
        (1000000, 0.0897),
        (float('inf'), 0.1075)
    ],
    "head_of_household": [
        (20000, 0.014),
        (50000, 0.0175),
        (70000, 0.0245),
        (80000, 0.035),
        (150000, 0.05525),
        (500000, 0.0637),
        (1000000, 0.0897),
        (float('inf'), 0.1075)
    ]
}

# ============================================================
# TAX CALCULATION FUNCTIONS
# ============================================================

def get_standard_deduction(filing_status: str) -> float:
    """NJ doesn't use standard deduction - returns exemptions placeholder"""
    return STANDARD_DEDUCTION.get(filing_status, 0)


def get_exemptions(filing_status: str, num_dependents: int = 0,
                   is_senior: bool = False, spouse_is_senior: bool = False,
                   is_blind: bool = False, spouse_is_blind: bool = False) -> float:
    """Calculate total NJ exemptions"""
    exemptions = 0
    
    # Personal exemption
    if filing_status == "married_filing_jointly":
        exemptions += PERSONAL_EXEMPTION * 2  # Both spouses
    else:
        exemptions += PERSONAL_EXEMPTION
    
    # Dependent exemptions
    exemptions += num_dependents * DEPENDENT_EXEMPTION
    
    # Senior exemptions (65+)
    if is_senior:
        exemptions += SENIOR_EXEMPTION
    if spouse_is_senior and filing_status == "married_filing_jointly":
        exemptions += SENIOR_EXEMPTION
    
    # Blind exemptions
    if is_blind:
        exemptions += BLIND_EXEMPTION
    if spouse_is_blind and filing_status == "married_filing_jointly":
        exemptions += BLIND_EXEMPTION
    
    return exemptions


def calculate_base_tax(taxable_income: float, filing_status: str) -> float:
    """Calculate NJ state income tax using progressive brackets"""
    if taxable_income <= 0:
        return 0.0
    
    brackets = TAX_BRACKETS.get(filing_status, TAX_BRACKETS["single"])
    tax = 0.0
    prev_limit = 0
    
    for limit, rate in brackets:
        if taxable_income <= prev_limit:
            break
        bracket_income = min(taxable_income, limit) - prev_limit
        tax += bracket_income * rate
        prev_limit = limit
    
    return round(tax, 2)


# ============================================================
# MAIN CALCULATE FUNCTION (matches CA.py pattern)
# ============================================================

def calculate(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Main calculation function for NJ state tax
    
    Expected input:
    {
        "filing_status": "single" | "married_filing_jointly" | etc.,
        "federal_agi": 165000,
        "wages": 180000,
        "state_withholding": 0,
        "num_children": 0,
        "is_senior": false,
    }
    """
    # Extract inputs
    filing_status = data.get("filing_status", "single")
    federal_agi = float(data.get("federal_agi", 0) or data.get("agi", 0) or 0)
    wages = float(data.get("wages", 0) or data.get("earned_income", federal_agi) or 0)
    withholding = float(data.get("state_withholding", 0) or data.get("nj_withholding", 0) or 0)
    num_dependents = int(data.get("num_dependents", 0) or data.get("num_children", 0) or 0)
    
    # Senior/Blind flags
    is_senior = data.get("is_senior", False)
    spouse_is_senior = data.get("spouse_is_senior", False)
    is_blind = data.get("is_blind", False)
    spouse_is_blind = data.get("spouse_is_blind", False)
    
    # NJ adjustments (additions/subtractions to federal AGI)
    nj_additions = float(data.get("nj_additions", 0) or 0)
    nj_subtractions = float(data.get("nj_subtractions", 0) or 0)
    
    # ============================================================
    # STEP 1: Calculate NJ Gross Income
    # ============================================================
    nj_gross_income = federal_agi + nj_additions - nj_subtractions
    
    # ============================================================
    # STEP 2: Calculate Exemptions (NJ doesn't use standard deduction)
    # ============================================================
    exemptions = get_exemptions(
        filing_status=filing_status,
        num_dependents=num_dependents,
        is_senior=is_senior,
        spouse_is_senior=spouse_is_senior,
        is_blind=is_blind,
        spouse_is_blind=spouse_is_blind
    )
    
    # ============================================================
    # STEP 3: Calculate Taxable Income
    # ============================================================
    taxable_income = max(0, nj_gross_income - exemptions)
    
    # ============================================================
    # STEP 4: Calculate Base Tax
    # ============================================================
    base_tax = calculate_base_tax(taxable_income, filing_status)
    
    # ============================================================
    # STEP 5: Total Tax (NJ doesn't have additional taxes like CA's mental health tax)
    # ============================================================
    total_tax = base_tax
    
    # ============================================================
    # STEP 6: Calculate Effective Rate
    # ============================================================
    effective_rate = (total_tax / nj_gross_income * 100) if nj_gross_income > 0 else 0
    
    # ============================================================
    # STEP 7: Calculate Refund or Amount Owed
    # ============================================================
    if withholding >= total_tax:
        refund = withholding - total_tax
        amount_owed = 0
    else:
        refund = 0
        amount_owed = total_tax - withholding
    
    # ============================================================
    # RETURN RESULT (matching CA.py output format)
    # ============================================================
    return {
        # State info
        "state": STATE_CODE,
        "state_name": STATE_NAME,
        "support_level": SUPPORT_LEVEL,
        "has_income_tax": HAS_INCOME_TAX,
        
        # Income
        "federal_agi": federal_agi,
        "nj_agi": nj_gross_income,  # State-specific AGI field
        "ca_agi": nj_gross_income,  # For UI compatibility
        "wages": wages,
        
        # Deductions/Exemptions
        "standard_deduction": exemptions,  # NJ uses exemptions instead
        "exemptions": exemptions,
        
        # Taxable income
        "taxable_income": taxable_income,
        
        # Tax
        "base_tax": base_tax,
        "total_tax": total_tax,
        "state_tax": total_tax,
        
        # Credits (NJ credits could be added here)
        "nj_eitc": 0,  # Placeholder for NJ EITC
        
        # Payments
        "withholding": withholding,
        
        # Refund or Owed
        "refund": round(refund, 2),
        "amount_owed": round(amount_owed, 2),
        
        # Rates
        "effective_rate": round(effective_rate, 2),
        "tax_rate": round(effective_rate / 100, 4) if effective_rate > 0 else 0,
    }


# ============================================================
# CLI Testing
# ============================================================
if __name__ == "__main__":
    # Test Case: MFJ, $165,000 AGI
    test_data = {
        "filing_status": "married_filing_jointly",
        "federal_agi": 165000,
        "wages": 180000,
        "state_withholding": 0,
        "num_children": 0
    }
    
    result = calculate(test_data)
    
    print("=" * 60)
    print(f"NEW JERSEY TAX CALCULATION - {result['state_name']}")
    print("=" * 60)
    print(f"Filing Status:    {test_data['filing_status']}")
    print(f"Federal AGI:      ${result['federal_agi']:,.0f}")
    print(f"NJ Gross Income:  ${result['nj_agi']:,.0f}")
    print(f"Exemptions:       ${result['exemptions']:,.0f}")
    print(f"Taxable Income:   ${result['taxable_income']:,.0f}")
    print(f"NJ Tax:           ${result['total_tax']:,.2f}")
    print(f"Effective Rate:   {result['effective_rate']:.2f}%")
    print("-" * 60)
    if result['refund'] > 0:
        print(f"REFUND:           ${result['refund']:,.2f}")
    else:
        print(f"OWED:             ${result['amount_owed']:,.2f}")
    print("=" * 60)
