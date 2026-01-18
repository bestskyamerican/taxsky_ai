# tax_engine/calculator/federal/calculator.py
# ============================================================
# FEDERAL TAX CALCULATOR 2025 v4.0 - UPDATED FOR OBBBA
# ============================================================
# Supports:
#   - W-2 Wages (taxpayer + spouse)
#   - 1099-INT (Interest Income)
#   - 1099-DIV (Dividend Income) 
#   - Capital Gains (Stock Sales)
#   - 1099-R (Retirement/Pension)
#   - SSA-1099 (Social Security)
#   - 1099-NEC (Self-Employment)
# 
# Updated for One Big Beautiful Bill Act (OBBBA) changes:
#   - Standard Deduction: $15,750 (single), $31,500 (MFJ)
#   - Child Tax Credit: $2,200 per child
#   - ACTC Refundable: up to $1,700
#   - Enhanced Senior Deduction: up to $6,000
#
# v4.0 Changes:
#   - Added CLI entry point (replaces calculate_cli.py)
#   - Added EITC calculation
#   - Federal only (use states/*.py for state taxes)
# ============================================================

import sys
import json
from datetime import date

# ════════════════════════════════════════════════════════════
# 2025 TAX CONSTANTS (Updated for OBBBA)
# ════════════════════════════════════════════════════════════
STANDARD_DEDUCTIONS = {
    'single': 15750,
    'married_filing_jointly': 31500,
    'married_filing_separately': 15750,
    'head_of_household': 23625,
    'qualifying_surviving_spouse': 31500,
}

# Additional for 65+ or blind (per condition)
ADDITIONAL_STD_DED = {
    'single': 2000,
    'head_of_household': 2000,
    'married_filing_jointly': 1600,
    'married_filing_separately': 1600,
    'qualifying_surviving_spouse': 1600,
}

# Enhanced Senior Deduction (NEW in 2025 via OBBBA)
SENIOR_BONUS_AMOUNT = 6000
SENIOR_BONUS_MAGI_THRESHOLD = {
    'single': 75000,
    'head_of_household': 75000,
    'married_filing_jointly': 150000,
    'married_filing_separately': 0,  # MFS not eligible
    'qualifying_surviving_spouse': 150000,
}
SENIOR_BONUS_PHASE_OUT_RATE = 0.06  # $0.06 per $1 over threshold

TAX_BRACKETS = {
    'single': [
        (11925, 0.10), (48475, 0.12), (103350, 0.22),
        (197300, 0.24), (250525, 0.32), (626350, 0.35),
        (float('inf'), 0.37)
    ],
    'married_filing_jointly': [
        (23850, 0.10), (96950, 0.12), (206700, 0.22),
        (394600, 0.24), (501050, 0.32), (751600, 0.35),
        (float('inf'), 0.37)
    ],
    'married_filing_separately': [
        (11925, 0.10), (48475, 0.12), (103350, 0.22),
        (197300, 0.24), (250525, 0.32), (375800, 0.35),
        (float('inf'), 0.37)
    ],
    'head_of_household': [
        (17000, 0.10), (64850, 0.12), (103350, 0.22),
        (197300, 0.24), (250500, 0.32), (626350, 0.35),
        (float('inf'), 0.37)
    ],
    'qualifying_surviving_spouse': [
        (23850, 0.10), (96950, 0.12), (206700, 0.22),
        (394600, 0.24), (501050, 0.32), (751600, 0.35),
        (float('inf'), 0.37)
    ],
}

# Long-term capital gains rates (2025)
LTCG_BRACKETS = {
    'single': [(47025, 0.0), (518900, 0.15), (float('inf'), 0.20)],
    'married_filing_jointly': [(94050, 0.0), (583750, 0.15), (float('inf'), 0.20)],
    'married_filing_separately': [(47025, 0.0), (291850, 0.15), (float('inf'), 0.20)],
    'head_of_household': [(63000, 0.0), (551350, 0.15), (float('inf'), 0.20)],
    'qualifying_surviving_spouse': [(94050, 0.0), (583750, 0.15), (float('inf'), 0.20)],
}

# Child Tax Credit (2025 - Updated per OBBBA)
CTC_AMOUNT = 2200  # ✅ Increased from $2,000 to $2,200
CTC_REFUNDABLE_MAX = 1700  # ✅ ACTC max per qualifying child
CTC_OTHER_DEPENDENT = 500  # Other Dependent Credit
CTC_PHASE_OUT_SINGLE = 200000
CTC_PHASE_OUT_MFJ = 400000
CTC_REFUNDABILITY_THRESHOLD = 2500  # Earned income threshold
CTC_REFUNDABILITY_RATE = 0.15  # 15% of earned income over threshold

# EITC 2025
EITC_2025 = {
    'married_filing_jointly': {
        0: {'max': 649, 'phase_in_end': 8260, 'phase_out_start': 17730, 'phase_out_end': 26214},
        1: {'max': 4328, 'phase_in_end': 12730, 'phase_out_start': 30480, 'phase_out_end': 57554},
        2: {'max': 7152, 'phase_in_end': 17880, 'phase_out_start': 30480, 'phase_out_end': 64430},
        3: {'max': 8046, 'phase_in_end': 17880, 'phase_out_start': 30480, 'phase_out_end': 68675}
    },
    'single': {
        0: {'max': 649, 'phase_in_end': 8260, 'phase_out_start': 10330, 'phase_out_end': 19104},
        1: {'max': 4328, 'phase_in_end': 12730, 'phase_out_start': 23350, 'phase_out_end': 50434},
        2: {'max': 7152, 'phase_in_end': 17880, 'phase_out_start': 23350, 'phase_out_end': 57310},
        3: {'max': 8046, 'phase_in_end': 17880, 'phase_out_start': 23350, 'phase_out_end': 61555}
    },
    'investment_income_limit': 11600
}

# Self-employment tax rates
SE_TAX_RATE = 0.153  # 12.4% SS + 2.9% Medicare
SE_INCOME_MULTIPLIER = 0.9235  # Net SE income calculation
SS_WAGE_BASE_2025 = 176100  # Social Security wage base

# IRA Limits (2025)
IRA_LIMIT = 7000
IRA_CATCH_UP = 1000  # Additional for 50+

# HSA Limits (2025)
HSA_LIMIT_SELF = 4300
HSA_LIMIT_FAMILY = 8550
HSA_CATCH_UP = 1000  # Additional for 55+

# Student Loan Interest
STUDENT_LOAN_MAX = 2500


# ════════════════════════════════════════════════════════════
# UTILITIES
# ════════════════════════════════════════════════════════════
def get_val(data, *keys, default=0):
    """Get value from data dict, trying multiple keys."""
    for k in keys:
        v = data.get(k)
        if v is not None and v != '':
            try:
                if isinstance(v, str):
                    return float(v.replace(',', '').replace('$', ''))
                return float(v)
            except:
                pass
    return default

def normalize_status(status):
    """Normalize filing status string."""
    if not status:
        return 'single'
    s = str(status).lower().strip().replace(' ', '_').replace('-', '_')
    aliases = {
        'mfj': 'married_filing_jointly',
        'mfs': 'married_filing_separately',
        'hoh': 'head_of_household',
        'qss': 'qualifying_surviving_spouse',
    }
    return aliases.get(s, s if s in STANDARD_DEDUCTIONS else 'single')

def calculate_age(dob_string):
    """Calculate age from DOB string (MM/DD/YYYY or YYYY-MM-DD)."""
    if not dob_string:
        return 0
    try:
        dob_str = str(dob_string)
        if '/' in dob_str:
            parts = dob_str.split('/')
            if len(parts) == 3:
                year = int(parts[2])
                return 2025 - year
        elif '-' in dob_str:
            parts = dob_str.split('-')
            if len(parts) == 3:
                year = int(parts[0]) if len(parts[0]) == 4 else int(parts[2])
                return 2025 - year
    except:
        pass
    return 0


# ════════════════════════════════════════════════════════════
# ENHANCED SENIOR DEDUCTION (NEW in 2025)
# ════════════════════════════════════════════════════════════
def calculate_senior_bonus(age, spouse_age, filing_status, magi):
    """
    Calculate enhanced senior deduction (OBBBA provision).
    Up to $6,000 per qualifying senior (65+).
    Phase out: Reduced by $0.06 for every $1 MAGI exceeds threshold.
    """
    if filing_status == 'married_filing_separately':
        return 0  # MFS not eligible
    
    threshold = SENIOR_BONUS_MAGI_THRESHOLD.get(filing_status, 75000)
    bonus = 0
    
    # Count qualifying seniors
    seniors = 0
    if age >= 65:
        seniors += 1
    if spouse_age >= 65 and filing_status in ['married_filing_jointly', 'qualifying_surviving_spouse']:
        seniors += 1
    
    if seniors == 0:
        return 0
    
    # Calculate base bonus
    base_bonus = seniors * SENIOR_BONUS_AMOUNT
    
    # Apply phase-out if MAGI exceeds threshold
    if magi > threshold:
        reduction = (magi - threshold) * SENIOR_BONUS_PHASE_OUT_RATE
        bonus = max(0, base_bonus - reduction)
    else:
        bonus = base_bonus
    
    return round(bonus, 2)


# ════════════════════════════════════════════════════════════
# SOCIAL SECURITY TAXABLE AMOUNT CALCULATION
# ════════════════════════════════════════════════════════════
def calculate_taxable_social_security(ss_benefits, other_income, filing_status):
    """
    Calculate taxable portion of Social Security benefits.
    Based on IRS Publication 915 worksheet.
    """
    if ss_benefits <= 0:
        return 0
    
    # Provisional income = Other income + 50% of SS benefits
    provisional = other_income + (ss_benefits * 0.5)
    
    # Thresholds based on filing status
    if filing_status == 'married_filing_jointly':
        threshold1 = 32000
        threshold2 = 44000
    elif filing_status == 'married_filing_separately':
        # If lived with spouse, 85% is taxable from $0
        threshold1 = 0
        threshold2 = 0
    else:  # single, HOH, QSS
        threshold1 = 25000
        threshold2 = 34000
    
    if filing_status == 'married_filing_separately':
        # Special rule: 85% taxable if lived with spouse
        return min(ss_benefits * 0.85, ss_benefits)
    
    if provisional <= threshold1:
        return 0
    elif provisional <= threshold2:
        # 50% of amount over threshold1
        return min(ss_benefits * 0.5, (provisional - threshold1) * 0.5)
    else:
        # Up to 85% taxable
        base = min(ss_benefits * 0.5, (threshold2 - threshold1) * 0.5)
        additional = (provisional - threshold2) * 0.85
        return min(ss_benefits * 0.85, base + additional)


# ════════════════════════════════════════════════════════════
# SELF-EMPLOYMENT TAX CALCULATION
# ════════════════════════════════════════════════════════════
def calculate_se_tax(net_se_income, wages=0):
    """
    Calculate self-employment tax.
    Returns: (se_tax, se_deduction)
    """
    if net_se_income < 400:
        return 0, 0
    
    # SE income for tax purposes
    se_earnings = net_se_income * SE_INCOME_MULTIPLIER
    
    # Social Security portion (up to wage base minus W-2 wages)
    ss_base_remaining = max(0, SS_WAGE_BASE_2025 - wages)
    ss_earnings = min(se_earnings, ss_base_remaining)
    ss_tax = ss_earnings * 0.124  # 12.4%
    
    # Medicare portion (no limit)
    medicare_tax = se_earnings * 0.029  # 2.9%
    
    se_tax = ss_tax + medicare_tax
    
    # Deductible portion (50% of SE tax)
    se_deduction = se_tax * 0.5
    
    return round(se_tax, 2), round(se_deduction, 2)


# ════════════════════════════════════════════════════════════
# CAPITAL GAINS TAX CALCULATION
# ════════════════════════════════════════════════════════════
def calculate_capital_gains_tax(ltcg, taxable_income, filing_status):
    """
    Calculate long-term capital gains tax at preferential rates.
    taxable_income = ordinary income after deductions (before adding LTCG)
    """
    if ltcg <= 0:
        return 0
    
    brackets = LTCG_BRACKETS.get(filing_status, LTCG_BRACKETS['single'])
    
    tax = 0
    remaining_gains = ltcg
    current_income = taxable_income
    
    for threshold, rate in brackets:
        if remaining_gains <= 0:
            break
        
        # How much room in this bracket?
        room_in_bracket = max(0, threshold - current_income)
        
        # How much gains go in this bracket?
        gains_in_bracket = min(remaining_gains, room_in_bracket)
        
        if gains_in_bracket > 0:
            tax += gains_in_bracket * rate
            remaining_gains -= gains_in_bracket
            current_income += gains_in_bracket
    
    # Any remaining gains at top rate
    if remaining_gains > 0:
        tax += remaining_gains * brackets[-1][1]
    
    return round(tax, 2)


# ════════════════════════════════════════════════════════════
# CHILD TAX CREDIT CALCULATION (Updated for 2025 OBBBA)
# ════════════════════════════════════════════════════════════
def calculate_child_tax_credit(qualifying_children, other_dependents, agi, earned_income, 
                                tax_liability, filing_status):
    """
    Calculate Child Tax Credit and Additional Child Tax Credit.
    
    2025 Changes (OBBBA):
    - CTC increased to $2,200 per qualifying child (from $2,000)
    - ACTC max remains $1,700 per child
    - Both taxpayer and child must have SSN
    """
    # Calculate base credits
    base_ctc = qualifying_children * CTC_AMOUNT
    base_odc = other_dependents * CTC_OTHER_DEPENDENT
    
    # Phase-out threshold
    threshold = CTC_PHASE_OUT_MFJ if filing_status == 'married_filing_jointly' else CTC_PHASE_OUT_SINGLE
    
    # Apply phase-out
    total_credit = base_ctc + base_odc
    if agi > threshold:
        reduction = ((agi - threshold) // 1000) * 50
        total_credit = max(0, total_credit - reduction)
        base_ctc = max(0, base_ctc - reduction)
    
    # Non-refundable portion (limited to tax liability)
    ctc_nonrefundable = min(base_ctc, tax_liability)
    odc = min(base_odc, max(0, tax_liability - ctc_nonrefundable))
    
    # Refundable ACTC calculation
    # ACTC = lesser of:
    # 1. Remaining CTC after reducing tax to $0
    # 2. 15% of earned income over $2,500
    # 3. $1,700 per qualifying child
    remaining_ctc = max(0, base_ctc - ctc_nonrefundable)
    actc_from_earned = max(0, (earned_income - CTC_REFUNDABILITY_THRESHOLD) * CTC_REFUNDABILITY_RATE)
    actc_max = qualifying_children * CTC_REFUNDABLE_MAX
    
    ctc_refundable = min(remaining_ctc, actc_from_earned, actc_max)
    
    return {
        'ctc_nonrefundable': round(ctc_nonrefundable, 2),
        'ctc_refundable': round(ctc_refundable, 2),
        'other_dependent_credit': round(odc, 2),
        'total_ctc': round(ctc_nonrefundable + ctc_refundable, 2),
        'total_credits': round(ctc_nonrefundable + ctc_refundable + odc, 2)
    }


# ════════════════════════════════════════════════════════════
# EITC CALCULATION
# ════════════════════════════════════════════════════════════
def calculate_eitc(earned_income, agi, filing_status, num_children):
    """Calculate EITC using 2025 IRS tables"""
    
    if filing_status == 'married_filing_separately':
        return (0, "MFS_NOT_ELIGIBLE")
    
    if earned_income <= 0:
        return (0, "NO_EARNED_INCOME")
    
    children = min(num_children, 3)
    
    status_key = 'married_filing_jointly' if filing_status == 'married_filing_jointly' else 'single'
    params = EITC_2025[status_key].get(children, EITC_2025[status_key][0])
    
    max_credit = params['max']
    phase_in_end = params['phase_in_end']
    phase_out_start = params['phase_out_start']
    phase_out_end = params['phase_out_end']
    
    test_income = max(earned_income, agi)
    
    if test_income > phase_out_end:
        return (0, "INCOME_OVER_LIMIT")
    
    if earned_income <= phase_in_end:
        # Phase-in
        rate = max_credit / phase_in_end
        eitc = earned_income * rate
    elif test_income <= phase_out_start:
        # Plateau - full credit
        eitc = max_credit
    else:
        # Phase-out
        phase_out_range = phase_out_end - phase_out_start
        excess = test_income - phase_out_start
        rate = max_credit / phase_out_range
        eitc = max(0, max_credit - (excess * rate))
    
    eitc = min(round(eitc, 2), max_credit)
    return (eitc, "VALID")


# ════════════════════════════════════════════════════════════
# MAIN CALCULATOR
# ════════════════════════════════════════════════════════════
def calculate(data):
    """
    Main federal tax calculation.
    
    Expected data fields:
    - filing_status: single, married_filing_jointly, etc.
    - taxpayer_dob or taxpayer_age: for senior deductions
    - spouse_dob or spouse_age: for MFJ
    - wages, spouse_wages: W-2 income
    - federal_withheld, spouse_federal_withheld: W-2 Box 2
    - interest_income, dividend_income, etc.
    - qualifying_children_under_17, other_dependents
    """
    # ═══════════════════════════════════════════════════════
    # FILING STATUS & AGES
    # ═══════════════════════════════════════════════════════
    fs = normalize_status(data.get('filing_status'))
    
    taxpayer_age = int(get_val(data, 'taxpayer_age', 'age') or 0)
    if not taxpayer_age:
        taxpayer_age = calculate_age(data.get('taxpayer_dob', data.get('date_of_birth')))
    
    spouse_age = int(get_val(data, 'spouse_age') or 0)
    if not spouse_age:
        spouse_age = calculate_age(data.get('spouse_dob', data.get('spouse_date_of_birth')))
    
    # ═══════════════════════════════════════════════════════
    # INCOME - W-2 Wages
    # ═══════════════════════════════════════════════════════
    taxpayer_wages = get_val(data, 'wages', 'w2_wages', 'wage_income', 'box1_wages')
    spouse_wages = get_val(data, 'spouse_wages', 'spouse_w2_wages', 'spouse_box1')
    total_wages = taxpayer_wages + spouse_wages
    
    # Withholding
    taxpayer_fed_withheld = get_val(data, 'federal_withholding', 'federal_withheld', 'fed_withheld', 'box2_withheld', 'federal_tax_withheld')
    spouse_fed_withheld = get_val(data, 'spouse_federal_withheld', 'spouse_fed_withheld', 'spouse_box2')
    total_withholding = taxpayer_fed_withheld + spouse_fed_withheld
    
    # ═══════════════════════════════════════════════════════
    # INCOME - Interest & Dividends
    # ═══════════════════════════════════════════════════════
    interest_income = get_val(data, 'interest_income', 'interest', '1099_int')
    ordinary_dividends = get_val(data, 'dividend_income', 'ordinary_dividends', '1099_div')
    qualified_dividends = get_val(data, 'qualified_dividends', 'qualified_div')
    
    # ═══════════════════════════════════════════════════════
    # INCOME - Capital Gains
    # ═══════════════════════════════════════════════════════
    long_term_gains = get_val(data, 'long_term_gains', 'ltcg', 'long_term_capital_gains')
    short_term_gains = get_val(data, 'short_term_gains', 'stcg', 'short_term_capital_gains')
    net_capital_gain = long_term_gains + short_term_gains
    
    # Capital loss deduction (max $3,000)
    capital_loss_deduction = 0
    if net_capital_gain < 0:
        capital_loss_deduction = min(abs(net_capital_gain), 3000)
        net_capital_gain = 0
    
    # ═══════════════════════════════════════════════════════
    # INCOME - Retirement
    # ═══════════════════════════════════════════════════════
    ira_distributions = get_val(data, 'ira_distributions', '1099_r_ira', 'ira_income')
    taxable_ira = get_val(data, 'taxable_ira', 'ira_taxable') or ira_distributions
    
    pension_income = get_val(data, 'pension_income', '1099_r_pension', 'pension')
    taxable_pension = get_val(data, 'taxable_pension', 'pension_taxable') or pension_income
    
    # ═══════════════════════════════════════════════════════
    # INCOME - Social Security
    # ═══════════════════════════════════════════════════════
    social_security_benefits = get_val(data, 'social_security', 'ssa_1099', 'ss_benefits')
    other_income_for_ss = total_wages + interest_income + ordinary_dividends + net_capital_gain + taxable_ira + taxable_pension
    taxable_social_security = calculate_taxable_social_security(social_security_benefits, other_income_for_ss, fs)
    
    # ═══════════════════════════════════════════════════════
    # INCOME - Self-Employment
    # ═══════════════════════════════════════════════════════
    gross_self_employment = get_val(data, 'self_employment_income', '1099_nec', 'se_income', 'business_income')
    se_expenses = get_val(data, 'self_employment_expenses', 'se_expenses', 'business_expenses')
    net_self_employment = gross_self_employment - se_expenses
    
    se_tax, se_deduction = calculate_se_tax(net_self_employment, total_wages)
    
    # ═══════════════════════════════════════════════════════
    # INCOME - Other
    # ═══════════════════════════════════════════════════════
    other_income = get_val(data, 'other_income', 'miscellaneous_income')
    
    # ═══════════════════════════════════════════════════════
    # TOTAL INCOME (Line 9)
    # ═══════════════════════════════════════════════════════
    total_income = (
        total_wages + 
        interest_income + 
        ordinary_dividends + 
        max(0, net_capital_gain) +
        taxable_ira + 
        taxable_pension + 
        taxable_social_security + 
        max(0, net_self_employment) + 
        other_income -
        capital_loss_deduction
    )
    
    earned_income = total_wages + max(0, net_self_employment)
    
    # ═══════════════════════════════════════════════════════
    # ADJUSTMENTS TO INCOME (Line 10)
    # ═══════════════════════════════════════════════════════
    # IRA contributions
    ira_limit = IRA_LIMIT + (IRA_CATCH_UP if taxpayer_age >= 50 else 0)
    taxpayer_ira = min(get_val(data, 'ira_contributions', 'ira_contribution', 'ira_deduction', 'traditional_ira', 'taxpayer_ira'), ira_limit)
    spouse_ira_limit = IRA_LIMIT + (IRA_CATCH_UP if spouse_age >= 50 else 0)
    spouse_ira = min(get_val(data, 'spouse_ira_contribution', 'spouse_ira'), spouse_ira_limit)
    total_ira = taxpayer_ira + spouse_ira
    
    # HSA contributions
    hsa_limit = HSA_LIMIT_FAMILY if fs == 'married_filing_jointly' else HSA_LIMIT_SELF
    if taxpayer_age >= 55:
        hsa_limit += HSA_CATCH_UP
    hsa = min(get_val(data, 'hsa_contributions', 'hsa'), hsa_limit)
    
    # Student loan interest (max $2,500)
    student_loan = min(get_val(data, 'student_loan_interest', 'student_loan'), STUDENT_LOAN_MAX)
    
    total_adjustments = total_ira + hsa + student_loan + se_deduction + capital_loss_deduction
    
    # ═══════════════════════════════════════════════════════
    # AGI (Line 11)
    # ═══════════════════════════════════════════════════════
    agi = total_income - total_adjustments
    
    # ═══════════════════════════════════════════════════════
    # STANDARD DEDUCTION (Line 12) - With Senior Bonus
    # ═══════════════════════════════════════════════════════
    std_ded = STANDARD_DEDUCTIONS.get(fs, 15750)
    additional_amount = ADDITIONAL_STD_DED.get(fs, 1600)
    additional_count = 0
    
    # Age 65+ additional deduction
    if taxpayer_age >= 65:
        additional_count += 1
    
    if spouse_age >= 65 and fs in ['married_filing_jointly', 'married_filing_separately', 'qualifying_surviving_spouse']:
        additional_count += 1
    
    std_ded += (additional_amount * additional_count)
    
    # Enhanced Senior Bonus (NEW in 2025)
    senior_bonus = calculate_senior_bonus(taxpayer_age, spouse_age, fs, agi)
    std_ded += senior_bonus
    
    # ═══════════════════════════════════════════════════════
    # TAXABLE INCOME (Line 15)
    # ═══════════════════════════════════════════════════════
    taxable_income = max(0, agi - std_ded)
    
    # ═══════════════════════════════════════════════════════
    # TAX CALCULATION (Line 16)
    # ═══════════════════════════════════════════════════════
    # Separate ordinary income from preferential income
    preferential_income = qualified_dividends + max(0, long_term_gains)
    ordinary_taxable = max(0, taxable_income - preferential_income)
    
    # Tax on ordinary income (regular brackets)
    brackets = TAX_BRACKETS.get(fs, TAX_BRACKETS['single'])
    ordinary_tax = 0
    prev = 0
    for limit, rate in brackets:
        if ordinary_taxable <= prev:
            break
        ordinary_tax += (min(ordinary_taxable, limit) - prev) * rate
        prev = limit
    
    # Tax on preferential income (LTCG rates)
    preferential_tax = calculate_capital_gains_tax(preferential_income, ordinary_taxable, fs)
    
    # Total tax before credits
    bracket_tax = round(ordinary_tax + preferential_tax, 2)
    
    # Add self-employment tax
    total_tax_before_credits = bracket_tax + se_tax
    
    # ═══════════════════════════════════════════════════════
    # CREDITS
    # ═══════════════════════════════════════════════════════
    qualifying_children = int(get_val(data, 'qualifying_children_under_17', 'children_under_17', 'qualifying_children'))
    other_dependents = int(get_val(data, 'other_dependents', 'dependents_over_17'))
    ctc_result = calculate_child_tax_credit(
        qualifying_children=qualifying_children,
        other_dependents=other_dependents,
        agi=agi,
        earned_income=earned_income,
        tax_liability=total_tax_before_credits,
        filing_status=fs
    )
    
    # EITC
    eitc_amount, eitc_validation = calculate_eitc(earned_income, agi, fs, qualifying_children)
    
    total_nonrefundable_credits = ctc_result['ctc_nonrefundable'] + ctc_result['other_dependent_credit']
    total_refundable_credits = ctc_result['ctc_refundable'] + eitc_amount
    
    # Tax after credits
    tax_after_credits = max(0, total_tax_before_credits - total_nonrefundable_credits)
    
    # ═══════════════════════════════════════════════════════
    # PAYMENTS & RESULT
    # ═══════════════════════════════════════════════════════
    total_payments = total_withholding
    
    # Estimated payments (if any)
    estimated_payments = get_val(data, 'estimated_payments', 'estimated_tax_payments')
    total_payments += estimated_payments
    
    # Add refundable credits to payments
    total_payments += total_refundable_credits
    
    balance = total_payments - tax_after_credits
    
    # ═══════════════════════════════════════════════════════
    # RETURN RESULT
    # ═══════════════════════════════════════════════════════
    return {
        'tax_year': 2025,
        'filing_status': fs,
        
        # INCOME BREAKDOWN
        'wages': round(total_wages, 2),
        'interest_income': round(interest_income, 2),
        'dividend_income': round(ordinary_dividends, 2),
        'qualified_dividends': round(qualified_dividends, 2),
        'capital_gains': round(net_capital_gain, 2),
        'long_term_gains': round(long_term_gains, 2),
        'short_term_gains': round(short_term_gains, 2),
        'ira_distributions': round(taxable_ira, 2),
        'pension_income': round(taxable_pension, 2),
        'social_security_benefits': round(social_security_benefits, 2),
        'taxable_social_security': round(taxable_social_security, 2),
        'self_employment_income': round(net_self_employment, 2),
        'other_income': round(other_income, 2),
        
        'total_income': round(total_income, 2),
        'earned_income': round(earned_income, 2),
        
        # ADJUSTMENTS
        'adjustments': round(total_adjustments, 2),
        'taxpayer_ira_deduction': round(taxpayer_ira, 2),
        'spouse_ira_deduction': round(spouse_ira, 2),
        'ira_deduction': round(total_ira, 2),
        'hsa_deduction': round(hsa, 2),
        'student_loan_deduction': round(student_loan, 2),
        'se_tax_deduction': round(se_deduction, 2),
        'capital_loss_deduction': round(capital_loss_deduction, 2),
        
        # AGI & DEDUCTIONS
        'agi': round(agi, 2),
        'federal_agi': round(agi, 2),
        'standard_deduction': round(std_ded, 2),
        'senior_bonus': round(senior_bonus, 2),
        'taxable_income': round(taxable_income, 2),
        
        # TAX
        'ordinary_tax': round(ordinary_tax, 2),
        'preferential_tax': round(preferential_tax, 2),
        'bracket_tax': bracket_tax,
        'self_employment_tax': round(se_tax, 2),
        'tax_before_credits': round(total_tax_before_credits, 2),
        
        # CREDITS
        'child_tax_credit': round(ctc_result['total_ctc'], 2),
        'ctc_nonrefundable': round(ctc_result['ctc_nonrefundable'], 2),
        'ctc_refundable': round(ctc_result['ctc_refundable'], 2),
        'other_dependent_credit': round(ctc_result['other_dependent_credit'], 2),
        'eitc': round(eitc_amount, 2),
        'eitc_validation': eitc_validation,
        'total_credits': round(total_nonrefundable_credits + total_refundable_credits, 2),
        'tax_after_credits': round(tax_after_credits, 2),
        
        # DEPENDENTS
        'qualifying_children_under_17': qualifying_children,
        'other_dependents': other_dependents,
        
        # PAYMENTS
        'withholding': round(total_withholding, 2),
        'estimated_payments': round(estimated_payments, 2),
        'refundable_credits': round(total_refundable_credits, 2),
        'total_payments': round(total_payments, 2),
        
        # RESULT
        'refund': round(max(0, balance), 2),
        'amount_owed': round(max(0, -balance), 2),
        
        # DEBUG: Original breakdown (for compatibility)
        '_taxpayer_wages': round(taxpayer_wages, 2),
        '_spouse_wages': round(spouse_wages, 2),
        '_taxpayer_federal': round(taxpayer_fed_withheld, 2),
        '_spouse_federal': round(spouse_fed_withheld, 2),
        '_taxpayer_age': taxpayer_age,
        '_spouse_age': spouse_age,
    }


# ════════════════════════════════════════════════════════════
# CLI ENTRY POINT (replaces calculate_cli.py)
# ════════════════════════════════════════════════════════════
def main():
    """CLI entry point - reads JSON from stdin, outputs result to stdout"""
    try:
        input_data = sys.stdin.read()
        
        if not input_data.strip():
            print(json.dumps({'error': 'No input provided', 'success': False}))
            sys.exit(1)
        
        try:
            tax_data = json.loads(input_data)
        except json.JSONDecodeError as e:
            print(json.dumps({'error': f'Invalid JSON: {str(e)}', 'success': False}))
            sys.exit(1)
        
        result = calculate(tax_data)
        print(json.dumps(result, indent=2))
        sys.exit(0)
        
    except Exception as e:
        import traceback
        print(json.dumps({
            'error': str(e),
            'traceback': traceback.format_exc(),
            'success': False
        }))
        sys.exit(1)


# Export
__all__ = ['calculate', 'main']

if __name__ == '__main__':
    main()