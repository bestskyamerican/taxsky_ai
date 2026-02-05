# tax_engine/calculator/federal/calculator.py
# ============================================================
# FEDERAL TAX CALCULATOR 2025 v8.3 - FULL OBBB SUPPORT
# ============================================================
# 
# v8.3 Fixes:
#   - ✅ FIXED: Read taxpayer_w2_1_wages/withheld/tips from answers 
#               when input_forms.w2 is empty (AI interview stores W-2 
#               data with _w2_1_ naming pattern, not in w2 array)
#   - ✅ FIXED: Read dependent_N_age/dob from answers when dependents 
#               array is empty (AI interview stores as dependent_1_age, 
#               dependent_1_dob, etc. instead of pushing to array)
#   - ✅ FIXED: Read state_withheld from answers when w2_list empty
#
# v8.2 Fixes:
#   - ✅ FIXED: Overtime uses FULL amount (what appears on paycheck)
#
# v8.1 Fixes:
#   - ✅ FIXED: OBBB deductions are now BELOW-THE-LINE (reduce taxable income, not AGI)
#   - ✅ FIXED: Added 'taxpayer_w2_tips' to field lookups
#
# v8.0 Changes (OBBB - One Big Beautiful Bill Act):
#   - ✅ UPDATED: Standard Deductions (Single $15,750, MFJ $31,500, HOH $23,625)
#   - ✅ NEW: No Tax on Tips (up to $25,000)
#   - ✅ NEW: No Tax on Overtime (up to $12,500/$25,000)
#   - ✅ NEW: Car Loan Interest Deduction (up to $10,000)
#   - ✅ NEW: Enhanced Senior Deduction ($6,000 per person 65+)
#   - ✅ NEW: Auto-calculate 65+ from DOB
#   - ✅ NEW: Track tips from W-2 Box 7
#
# v7.0 Changes (retained):
#   - MongoDB TaxSession format support
#   - IRA deduction income limits
#   - Spouse IRA separate 401(k) tracking
#
# ============================================================

import sys
import json
from datetime import date, datetime

# ════════════════════════════════════════════════════════════
# 2025 TAX CONSTANTS - OBBB UPDATED!
# ════════════════════════════════════════════════════════════

# ✅ v8.0: OBBB Standard Deductions (Updated July 2025)
STANDARD_DEDUCTIONS = {
    'single': 15750,                    # Was $14,600 (2024)
    'married_filing_jointly': 31500,    # Was $29,200 (2024)
    'married_filing_separately': 15750, # Was $14,600 (2024)
    'head_of_household': 23625,         # Was $21,900 (2024)
    'qualifying_surviving_spouse': 31500,
}

# Additional Standard Deduction (65+ or blind)
ADDITIONAL_STD_DED = {
    'single': 1950,
    'head_of_household': 1950,
    'married_filing_jointly': 1550,
    'married_filing_separately': 1550,
    'qualifying_surviving_spouse': 1550,
}

# ════════════════════════════════════════════════════════════
# ✅ v8.0: OBBB DEDUCTION LIMITS (NEW!)
# ════════════════════════════════════════════════════════════

# No Tax on Tips (OBBB)
NO_TAX_ON_TIPS = {
    'max_deduction': 25000,
    'phaseout_single': 150000,
    'phaseout_joint': 300000,
    'years': [2025, 2026, 2027, 2028],
}

# No Tax on Overtime (OBBB)
NO_TAX_ON_OVERTIME = {
    'max_single': 12500,
    'max_joint': 25000,
    'phaseout_single': 150000,
    'phaseout_joint': 300000,
    'years': [2025, 2026, 2027, 2028],
}

# Car Loan Interest Deduction (OBBB)
CAR_LOAN_INTEREST = {
    'max_deduction': 10000,
    'requirements': ['NEW vehicle', 'American-made', 'Loan after 12/31/2024'],
    'years': [2025, 2026, 2027, 2028],
}

# Senior Deduction (OBBB) - NEW!
SENIOR_BONUS = {
    'amount_per_person': 6000,
    'phaseout_single': 75000,
    'phaseout_joint': 150000,
    'phaseout_rate': 0.02,  # 2% reduction per $1,000 over threshold
    'years': [2025, 2026, 2027, 2028],
}

# ════════════════════════════════════════════════════════════
# TAX BRACKETS 2025
# ════════════════════════════════════════════════════════════
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

LTCG_BRACKETS = {
    'single': [(47025, 0.0), (518900, 0.15), (float('inf'), 0.20)],
    'married_filing_jointly': [(94050, 0.0), (583750, 0.15), (float('inf'), 0.20)],
    'married_filing_separately': [(47025, 0.0), (291850, 0.15), (float('inf'), 0.20)],
    'head_of_household': [(63000, 0.0), (551350, 0.15), (float('inf'), 0.20)],
    'qualifying_surviving_spouse': [(94050, 0.0), (583750, 0.15), (float('inf'), 0.20)],
}

# Child Tax Credit (2025)
CTC_AMOUNT = 2000
CTC_REFUNDABLE_MAX = 1700
CTC_OTHER_DEPENDENT = 500
CTC_PHASE_OUT_SINGLE = 200000
CTC_PHASE_OUT_MFJ = 400000
CTC_REFUNDABILITY_THRESHOLD = 2500
CTC_REFUNDABILITY_RATE = 0.15

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

SE_TAX_RATE = 0.153
SE_INCOME_MULTIPLIER = 0.9235
SS_WAGE_BASE_2025 = 176100

# IRA Limits (2025)
IRA_LIMIT = 7000
IRA_CATCH_UP = 1000

IRA_DEDUCTION_LIMITS = {
    'single': {'full_deduction_under': 79000, 'phase_out_end': 89000},
    'head_of_household': {'full_deduction_under': 79000, 'phase_out_end': 89000},
    'married_filing_jointly': {'full_deduction_under': 126000, 'phase_out_end': 146000},
    'married_filing_separately': {'full_deduction_under': 0, 'phase_out_end': 10000},
    'qualifying_surviving_spouse': {'full_deduction_under': 126000, 'phase_out_end': 146000},
}

SPOUSE_IRA_LIMITS_MFJ = {
    'full_deduction_under': 236000,
    'phase_out_end': 246000,
}

# HSA Limits (2025)
HSA_LIMIT_SELF = 4300
HSA_LIMIT_FAMILY = 8550
HSA_CATCH_UP = 1000

STUDENT_LOAN_MAX = 2500


# ════════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ════════════════════════════════════════════════════════════

def get_val(data, *keys, default=0):
    """Get value from data dict, trying multiple keys."""
    for key in keys:
        v = data.get(key)
        if v is not None:
            try:
                return float(v) if v != '' else default
            except (ValueError, TypeError):
                return default
    return default

def get_bool(data, *keys, default=False):
    """Get boolean from data."""
    for key in keys:
        v = data.get(key)
        if v is not None:
            if isinstance(v, bool):
                return v
            if isinstance(v, str):
                return v.lower() in ('true', 'yes', '1', 'y')
            if isinstance(v, (int, float)):
                return bool(v)
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

def calculate_age(dob_string, tax_year=2025):
    """Calculate age from DOB string as of Dec 31 of tax year."""
    if not dob_string:
        return 0
    try:
        dob_str = str(dob_string)
        
        # Try ISO format (YYYY-MM-DD)
        if 'T' in dob_str:
            dob_str = dob_str.split('T')[0]
        
        if '-' in dob_str:
            parts = dob_str.split('-')
            if len(parts) == 3:
                year = int(parts[0]) if len(parts[0]) == 4 else int(parts[2])
                month = int(parts[1])
                day = int(parts[2]) if len(parts[0]) == 4 else int(parts[0])
                
                # Calculate age as of Dec 31 of tax year
                age = tax_year - year
                # Adjust if birthday hasn't occurred by Dec 31
                if month > 12 or (month == 12 and day > 31):
                    age -= 1
                return max(0, age)
                
        elif '/' in dob_str:
            parts = dob_str.split('/')
            if len(parts) == 3:
                year = int(parts[2])
                if year < 100:
                    year = 1900 + year if year > 25 else 2000 + year
                return max(0, tax_year - year)
    except:
        pass
    return 0

def is_65_plus(dob_string, tax_year=2025):
    """Check if person is 65+ as of Dec 31 of tax year."""
    age = calculate_age(dob_string, tax_year)
    return age >= 65


# ════════════════════════════════════════════════════════════
# ✅ v8.1: OBBB DEDUCTION CALCULATORS (FIXED!)
# ════════════════════════════════════════════════════════════

def calculate_tips_deduction(tips_received, agi, filing_status):
    """
    Calculate No Tax on Tips deduction (OBBB).
    Max $25,000, phases out above $150K single / $300K joint.
    """
    if tips_received <= 0:
        return {
            'tips_received': 0,
            'tips_deduction': 0,
            'reason': 'No tips received'
        }
    
    is_joint = filing_status in ['married_filing_jointly', 'qualifying_surviving_spouse']
    phaseout = NO_TAX_ON_TIPS['phaseout_joint'] if is_joint else NO_TAX_ON_TIPS['phaseout_single']
    max_deduction = NO_TAX_ON_TIPS['max_deduction']
    
    deduction = min(tips_received, max_deduction)
    
    # Apply phaseout
    if agi > phaseout:
        excess = agi - phaseout
        reduction = (excess / 1000) * 0.02 * deduction
        deduction = max(0, deduction - reduction)
    
    return {
        'tips_received': tips_received,
        'tips_deduction': round(deduction, 2),
        'reason': f'${deduction:,.0f} tips deduction (OBBB)' if deduction > 0 else 'Tips phased out due to high income'
    }


def calculate_overtime_deduction(overtime_pay, agi, filing_status):
    """
    Calculate No Tax on Overtime deduction (OBBB).
    
    User enters TOTAL overtime pay from paycheck (already includes time-and-a-half).
    Example: $20/hr regular × 1.5 × 3 hours = $90 overtime on paycheck
             → Full $90 is deductible
    
    Max $12,500 single / $25,000 joint, phases out above $150K/$300K.
    """
    if overtime_pay <= 0:
        return {
            'overtime_pay': 0,
            'overtime_deduction': 0,
            'reason': 'No overtime pay'
        }
    
    is_joint = filing_status in ['married_filing_jointly', 'qualifying_surviving_spouse']
    max_deduction = NO_TAX_ON_OVERTIME['max_joint'] if is_joint else NO_TAX_ON_OVERTIME['max_single']
    phaseout = NO_TAX_ON_OVERTIME['phaseout_joint'] if is_joint else NO_TAX_ON_OVERTIME['phaseout_single']
    
    # ✅ v8.2 FIX: Use FULL overtime pay (what appears on paycheck)
    deduction = min(overtime_pay, max_deduction)
    
    # Apply phaseout
    if agi > phaseout:
        excess = agi - phaseout
        reduction = (excess / 1000) * 0.02 * deduction
        deduction = max(0, deduction - reduction)
    
    return {
        'overtime_pay': overtime_pay,
        'overtime_deduction': round(deduction, 2),
        'reason': f'${deduction:,.0f} overtime deduction (OBBB)' if deduction > 0 else 'Overtime phased out due to high income'
    }


def calculate_car_loan_deduction(car_loan_interest, bought_new_car, car_is_american):
    """
    Calculate Car Loan Interest deduction (OBBB).
    Max $10,000 for NEW American-made vehicles only.
    """
    if car_loan_interest <= 0:
        return {
            'car_loan_interest': 0,
            'car_loan_deduction': 0,
            'reason': 'No car loan interest'
        }
    
    if not bought_new_car:
        return {
            'car_loan_interest': car_loan_interest,
            'car_loan_deduction': 0,
            'reason': 'Must be NEW vehicle (not used)'
        }
    
    if not car_is_american:
        return {
            'car_loan_interest': car_loan_interest,
            'car_loan_deduction': 0,
            'reason': 'Must be American-made vehicle'
        }
    
    deduction = min(car_loan_interest, CAR_LOAN_INTEREST['max_deduction'])
    
    return {
        'car_loan_interest': car_loan_interest,
        'car_loan_deduction': round(deduction, 2),
        'reason': f'${deduction:,.0f} car loan interest deduction (OBBB)'
    }


def calculate_senior_deduction(taxpayer_dob, spouse_dob, agi, filing_status, tax_year=2025):
    """
    Calculate Senior Deduction (OBBB) - AUTO FROM DOB!
    $6,000 per eligible person (65+), phases out above $75K/$150K.
    """
    # Auto-calculate 65+ from DOB
    taxpayer_65_plus = is_65_plus(taxpayer_dob, tax_year)
    
    is_joint = filing_status in ['married_filing_jointly', 'qualifying_surviving_spouse']
    spouse_65_plus = is_joint and is_65_plus(spouse_dob, tax_year)
    
    # Count eligible seniors
    eligible_count = (1 if taxpayer_65_plus else 0) + (1 if spouse_65_plus else 0)
    
    if eligible_count == 0:
        return {
            'taxpayer_65_plus': False,
            'spouse_65_plus': False,
            'senior_deduction': 0,
            'reason': 'No seniors (65+) in household'
        }
    
    # Calculate base deduction
    base_deduction = eligible_count * SENIOR_BONUS['amount_per_person']
    
    # Get phaseout threshold
    phaseout = SENIOR_BONUS['phaseout_joint'] if is_joint else SENIOR_BONUS['phaseout_single']
    
    # Apply phaseout
    deduction = base_deduction
    if agi > phaseout:
        excess = agi - phaseout
        reduction = (excess / 1000) * SENIOR_BONUS['phaseout_rate'] * base_deduction
        deduction = max(0, base_deduction - reduction)
    
    who = []
    if taxpayer_65_plus:
        who.append('taxpayer')
    if spouse_65_plus:
        who.append('spouse')
    
    return {
        'taxpayer_65_plus': taxpayer_65_plus,
        'spouse_65_plus': spouse_65_plus,
        'eligible_count': eligible_count,
        'senior_deduction': round(deduction, 2),
        'reason': f'${deduction:,.0f} senior deduction ({" & ".join(who)} 65+)' if deduction > 0 else 'Senior deduction phased out'
    }


def calculate_all_obbb_deductions(data, agi, filing_status):
    """
    Calculate all OBBB deductions at once.
    Returns dict with tips, overtime, car loan, and senior deductions.
    """
    # ✅ v8.1 FIX: Added 'taxpayer_w2_tips' to field lookup
    tips = get_val(data, 'tips_received', 'tips', 'tip_income', 'taxpayer_w2_tips')
    overtime = get_val(data, 'overtime_pay', 'overtime', 'overtime_income')
    car_interest = get_val(data, 'car_loan_interest')
    bought_car = get_bool(data, 'bought_new_car', 'new_car_purchase')
    american_car = get_bool(data, 'car_is_american', 'american_made_car')
    
    taxpayer_dob = data.get('taxpayer_dob', '')
    spouse_dob = data.get('spouse_dob', '')
    
    # Calculate each
    tips_result = calculate_tips_deduction(tips, agi, filing_status)
    overtime_result = calculate_overtime_deduction(overtime, agi, filing_status)
    car_result = calculate_car_loan_deduction(car_interest, bought_car, american_car)
    senior_result = calculate_senior_deduction(taxpayer_dob, spouse_dob, agi, filing_status)
    
    total_obbb = (
        tips_result['tips_deduction'] +
        overtime_result['overtime_deduction'] +
        car_result['car_loan_deduction'] +
        senior_result['senior_deduction']
    )
    
    return {
        'tips': tips_result,
        'overtime': overtime_result,
        'car_loan': car_result,
        'senior': senior_result,
        'total_obbb_deduction': round(total_obbb, 2)
    }


# ════════════════════════════════════════════════════════════
# IRA DEDUCTION CALCULATOR
# ════════════════════════════════════════════════════════════

def calculate_ira_deduction(contribution, magi, filing_status, has_retirement_plan, age):
    """Calculate how much of Traditional IRA contribution is deductible."""
    if contribution <= 0:
        return {
            'contributed': 0,
            'deductible': 0,
            'non_deductible': 0,
            'reason': 'No IRA contribution'
        }
    
    max_contribution = IRA_LIMIT + (IRA_CATCH_UP if age >= 50 else 0)
    contribution = min(contribution, max_contribution)
    
    if not has_retirement_plan:
        return {
            'contributed': contribution,
            'deductible': contribution,
            'non_deductible': 0,
            'reason': f'Fully deductible - no workplace retirement plan'
        }
    
    limits = IRA_DEDUCTION_LIMITS.get(filing_status, IRA_DEDUCTION_LIMITS['single'])
    full_limit = limits['full_deduction_under']
    phase_out_end = limits['phase_out_end']
    
    if magi <= full_limit:
        return {
            'contributed': contribution,
            'deductible': contribution,
            'non_deductible': 0,
            'reason': f'Fully deductible - AGI ${magi:,.0f} under ${full_limit:,} limit'
        }
    
    if magi >= phase_out_end:
        return {
            'contributed': contribution,
            'deductible': 0,
            'non_deductible': contribution,
            'reason': f'NOT deductible - AGI ${magi:,.0f} exceeds ${phase_out_end:,} limit (has 401k)'
        }
    
    phase_out_range = phase_out_end - full_limit
    over_limit = magi - full_limit
    reduction_ratio = over_limit / phase_out_range
    deductible = round(contribution * (1 - reduction_ratio))
    
    return {
        'contributed': contribution,
        'deductible': max(0, deductible),
        'non_deductible': contribution - max(0, deductible),
        'reason': f'Partial deduction - AGI ${magi:,.0f} in phase-out range'
    }


def calculate_spouse_ira_deduction(contribution, magi, filing_status, spouse_has_retirement_plan, taxpayer_has_retirement_plan, age):
    """Calculate spouse's IRA deduction with special MFJ rules."""
    if contribution <= 0:
        return {
            'contributed': 0,
            'deductible': 0,
            'non_deductible': 0,
            'reason': 'No spouse IRA contribution'
        }
    
    max_contribution = IRA_LIMIT + (IRA_CATCH_UP if age >= 50 else 0)
    contribution = min(contribution, max_contribution)
    
    if not spouse_has_retirement_plan:
        if filing_status != 'married_filing_jointly':
            return {
                'contributed': contribution,
                'deductible': contribution,
                'non_deductible': 0,
                'reason': f'Fully deductible - spouse has no workplace retirement plan'
            }
        
        if not taxpayer_has_retirement_plan:
            return {
                'contributed': contribution,
                'deductible': contribution,
                'non_deductible': 0,
                'reason': f'Fully deductible - neither spouse has workplace retirement plan'
            }
        
        full_limit = SPOUSE_IRA_LIMITS_MFJ['full_deduction_under']
        phase_out_end = SPOUSE_IRA_LIMITS_MFJ['phase_out_end']
        
        if magi <= full_limit:
            return {
                'contributed': contribution,
                'deductible': contribution,
                'non_deductible': 0,
                'reason': f'Fully deductible - spouse has no 401k, AGI ${magi:,.0f} under ${full_limit:,}'
            }
        
        if magi >= phase_out_end:
            return {
                'contributed': contribution,
                'deductible': 0,
                'non_deductible': contribution,
                'reason': f'NOT deductible - AGI ${magi:,.0f} exceeds ${phase_out_end:,} (spouse no 401k limit)'
            }
        
        phase_out_range = phase_out_end - full_limit
        over_limit = magi - full_limit
        reduction_ratio = over_limit / phase_out_range
        deductible = round(contribution * (1 - reduction_ratio))
        
        return {
            'contributed': contribution,
            'deductible': max(0, deductible),
            'non_deductible': contribution - max(0, deductible),
            'reason': f'Partial deduction - spouse no 401k, AGI ${magi:,.0f} in phase-out'
        }
    
    return calculate_ira_deduction(contribution, magi, filing_status, spouse_has_retirement_plan, age)


# ════════════════════════════════════════════════════════════
# CAPITAL GAINS TAX
# ════════════════════════════════════════════════════════════

def calculate_capital_gains_tax(preferential_income, ordinary_taxable, filing_status):
    """Calculate tax on qualified dividends and long-term capital gains."""
    if preferential_income <= 0:
        return 0
    
    brackets = LTCG_BRACKETS.get(filing_status, LTCG_BRACKETS['single'])
    
    tax = 0
    remaining = preferential_income
    current_income = ordinary_taxable
    
    for threshold, rate in brackets:
        if remaining <= 0:
            break
        
        room = max(0, threshold - current_income)
        taxable_at_rate = min(remaining, room)
        
        if taxable_at_rate > 0:
            tax += taxable_at_rate * rate
            remaining -= taxable_at_rate
            current_income += taxable_at_rate
    
    if remaining > 0:
        tax += remaining * 0.20
    
    return round(tax, 2)


# ════════════════════════════════════════════════════════════
# CHILD TAX CREDIT
# ════════════════════════════════════════════════════════════

def calculate_child_tax_credit(qualifying_children, other_dependents, agi, earned_income, tax_liability, filing_status):
    """Calculate Child Tax Credit with refundable portion."""
    phase_out = CTC_PHASE_OUT_MFJ if filing_status == 'married_filing_jointly' else CTC_PHASE_OUT_SINGLE
    
    gross_ctc = qualifying_children * CTC_AMOUNT
    gross_odc = other_dependents * CTC_OTHER_DEPENDENT
    
    total_credit = gross_ctc + gross_odc
    
    if agi > phase_out:
        reduction = ((agi - phase_out) // 1000) * 50
        total_credit = max(0, total_credit - reduction)
        gross_ctc = max(0, gross_ctc - reduction)
        gross_odc = max(0, total_credit - gross_ctc)
    
    ctc_nonrefundable = min(gross_ctc, tax_liability)
    
    remaining_ctc = gross_ctc - ctc_nonrefundable
    
    refundable_limit = qualifying_children * CTC_REFUNDABLE_MAX
    
    if earned_income > CTC_REFUNDABILITY_THRESHOLD:
        earnings_based = (earned_income - CTC_REFUNDABILITY_THRESHOLD) * CTC_REFUNDABILITY_RATE
        ctc_refundable = min(remaining_ctc, earnings_based, refundable_limit)
    else:
        ctc_refundable = 0
    
    return {
        'qualifying_children': qualifying_children,
        'other_dependents': other_dependents,
        'gross_ctc': gross_ctc,
        'gross_odc': gross_odc,
        'ctc_nonrefundable': round(ctc_nonrefundable, 2),
        'ctc_refundable': round(ctc_refundable, 2),
        'other_dependent_credit': round(gross_odc, 2),
        'total_ctc': round(ctc_nonrefundable + ctc_refundable + gross_odc, 2)
    }


# ════════════════════════════════════════════════════════════
# EITC
# ════════════════════════════════════════════════════════════

def calculate_eitc(earned_income, agi, filing_status, qualifying_children):
    """Calculate Earned Income Tax Credit."""
    is_married = filing_status in ['married_filing_jointly', 'qualifying_surviving_spouse']
    table = EITC_2025['married_filing_jointly'] if is_married else EITC_2025['single']
    
    children = min(3, max(0, qualifying_children))
    params = table.get(children, table[0])
    
    if earned_income <= 0:
        return 0, {'eligible': False, 'reason': 'No earned income'}
    
    if agi > params['phase_out_end']:
        return 0, {'eligible': False, 'reason': 'Income too high'}
    
    if earned_income <= params['phase_in_end']:
        credit = earned_income * (params['max'] / params['phase_in_end'])
    elif earned_income <= params['phase_out_start']:
        credit = params['max']
    else:
        income_for_phaseout = max(earned_income, agi)
        reduction = (income_for_phaseout - params['phase_out_start']) * (params['max'] / (params['phase_out_end'] - params['phase_out_start']))
        credit = max(0, params['max'] - reduction)
    
    return round(credit, 2), {'eligible': True, 'children_counted': children, 'max_possible': params['max']}


# ════════════════════════════════════════════════════════════
# SOCIAL SECURITY TAXABILITY
# ════════════════════════════════════════════════════════════

def calculate_ss_taxable(benefits, agi_without_ss, filing_status):
    """Calculate taxable portion of Social Security benefits."""
    if benefits <= 0:
        return 0
    
    if filing_status == 'married_filing_jointly':
        base1, base2 = 32000, 44000
    elif filing_status == 'married_filing_separately':
        base1, base2 = 0, 0
    else:
        base1, base2 = 25000, 34000
    
    provisional = agi_without_ss + (benefits / 2)
    
    if provisional <= base1:
        return 0
    elif provisional <= base2:
        return min(benefits * 0.5, (provisional - base1) * 0.5)
    else:
        tier1 = (base2 - base1) * 0.5
        tier2 = (provisional - base2) * 0.85
        return min(benefits * 0.85, tier1 + tier2)


# ════════════════════════════════════════════════════════════
# EXTRACT FROM MONGODB SESSION
# ════════════════════════════════════════════════════════════

def extract_from_session(session_data):
    """Convert MongoDB TaxSession format to flat calculator format."""
    answers = session_data.get('answers', {})
    totals = session_data.get('totals', {})
    input_forms = session_data.get('input_forms', {})
    obbb = session_data.get('obbb', {})
    
    if not answers and not totals and not input_forms:
        return session_data
    
    print("📊 Converting MongoDB session to calculator format...")
    
    data = {}
    
    # Filing status
    data['filing_status'] = (
        answers.get('filing_status') or 
        session_data.get('filing_status') or 
        'single'
    )
    
    # Personal info
    taxpayer = session_data.get('taxpayer', {})
    spouse = session_data.get('spouse', {})
    
    data['taxpayer_dob'] = taxpayer.get('dob') or answers.get('taxpayer_dob', '')
    data['spouse_dob'] = spouse.get('dob') or answers.get('spouse_dob', '')
    data['taxpayer_age'] = calculate_age(data['taxpayer_dob'])
    data['spouse_age'] = calculate_age(data['spouse_dob'])
    
    # W-2 Income
    w2_list = input_forms.get('w2', [])
    
    if w2_list:
        taxpayer_wages = 0
        taxpayer_fed_withheld = 0
        taxpayer_state_withheld = 0
        taxpayer_tips = 0
        spouse_wages = 0
        spouse_fed_withheld = 0
        spouse_state_withheld = 0
        spouse_tips = 0
        
        for w2 in w2_list:
            owner = w2.get('owner', 'taxpayer')
            if owner == 'taxpayer':
                taxpayer_wages += w2.get('box_1_wages', 0)
                taxpayer_fed_withheld += w2.get('box_2_federal_withheld', 0)
                taxpayer_state_withheld += w2.get('box_17_state_withheld', 0)
                taxpayer_tips += w2.get('box_7_ss_tips', 0) + w2.get('box_8_allocated_tips', 0)
            else:
                spouse_wages += w2.get('box_1_wages', 0)
                spouse_fed_withheld += w2.get('box_2_federal_withheld', 0)
                spouse_state_withheld += w2.get('box_17_state_withheld', 0)
                spouse_tips += w2.get('box_7_ss_tips', 0) + w2.get('box_8_allocated_tips', 0)
        
        data['taxpayer_wages'] = taxpayer_wages
        data['taxpayer_federal_withheld'] = taxpayer_fed_withheld
        data['taxpayer_state_withheld'] = taxpayer_state_withheld
        data['spouse_wages'] = spouse_wages
        data['spouse_federal_withheld'] = spouse_fed_withheld
        data['spouse_state_withheld'] = spouse_state_withheld
        
        # ✅ v8.0: Auto-capture tips from W-2
        data['tips_received'] = taxpayer_tips + spouse_tips
    else:
        # ✅ v8.3 FIX: AI interview stores W-2 data as taxpayer_w2_1_wages, etc.
        # Must check these keys too when w2_list is empty
        data['taxpayer_wages'] = (
            answers.get('taxpayer_wages') or 
            answers.get('taxpayer_w2_1_wages') or 
            totals.get('wages', 0)
        )
        data['taxpayer_federal_withheld'] = (
            answers.get('taxpayer_federal_withheld') or
            answers.get('taxpayer_w2_1_federal_withheld') or
            totals.get('federal_withheld', 0)
        )
        data['taxpayer_state_withheld'] = (
            answers.get('taxpayer_state_withheld') or
            answers.get('taxpayer_w2_1_state_withheld') or
            totals.get('state_withheld', 0)
        )
        # ✅ v8.3 FIX: Also read tips from W-2 answer keys
        data['tips_received'] = (
            answers.get('taxpayer_w2_1_tips') or 0
        )
    
    # ✅ v8.1 FIX: Also check taxpayer_w2_tips
    data['tips_received'] = (
        obbb.get('tips_received') or 
        data.get('tips_received', 0) or 
        answers.get('tips', 0) or
        answers.get('tips_received', 0) or
        answers.get('taxpayer_w2_tips', 0)
    )
    data['overtime_pay'] = obbb.get('overtime_pay') or answers.get('overtime_pay', 0)
    data['bought_new_car'] = obbb.get('bought_new_car') or answers.get('bought_new_car', False)
    data['car_is_american'] = obbb.get('car_is_american') or answers.get('car_is_american', False)
    data['car_loan_interest'] = obbb.get('car_loan_interest') or answers.get('car_loan_interest', 0)
    
    # Other income
    data['interest_income'] = totals.get('interest', 0) or answers.get('interest_income', 0)
    data['dividend_income'] = totals.get('dividends', 0) or answers.get('dividend_income', 0)
    data['qualified_dividends'] = answers.get('qualified_dividends', 0)
    data['capital_gains'] = totals.get('capital_gains', 0) or answers.get('capital_gains', 0)
    data['self_employment_income'] = totals.get('business_income', 0) or answers.get('self_employment_income', 0)
    data['social_security_benefits'] = totals.get('social_security', 0) or answers.get('social_security_benefits', 0)
    
    # Adjustments
    data['ira_contribution'] = answers.get('ira_contribution', 0) or answers.get('taxpayer_ira', 0)
    data['spouse_ira_contribution'] = answers.get('spouse_ira_contribution', 0) or answers.get('spouse_ira', 0)
    data['hsa_contribution'] = answers.get('hsa_contribution', 0) or answers.get('hsa', 0)
    data['student_loan_interest'] = answers.get('student_loan_interest', 0)
    
    # Retirement plan status
    data['has_retirement_plan'] = answers.get('taxpayer_has_401k') or answers.get('has_retirement_plan', False)
    data['spouse_has_retirement_plan'] = answers.get('spouse_has_401k') or answers.get('spouse_has_retirement_plan', False)
    
    # Dependents
    dependents = session_data.get('dependents', [])
    children_under_17 = 0
    other_deps = 0
    
    if dependents:
        # Read from dependents array (structured data)
        for dep in dependents:
            age = dep.get('age')
            if age is None and dep.get('dob'):
                age = calculate_age(dep.get('dob'))
            if age is not None:
                if age < 17:
                    children_under_17 += 1
                else:
                    other_deps += 1
    else:
        # ✅ v8.3 FIX: AI interview stores dependents as answers.dependent_1_age, 
        # answers.dependent_2_age, etc. - must read these when dependents array is empty!
        dep_count = int(answers.get('dependent_count', 0))
        if dep_count == 0 and answers.get('has_dependents'):
            dep_count = 1  # At least 1 if has_dependents is true
        
        for i in range(1, dep_count + 1):
            dep_age = answers.get(f'dependent_{i}_age')
            if dep_age is None:
                dep_dob = answers.get(f'dependent_{i}_dob', '')
                if dep_dob:
                    dep_age = calculate_age(dep_dob)
            
            if dep_age is not None:
                dep_age = int(dep_age)
                credit_type = answers.get(f'dependent_{i}_credit_type', '')
                
                # Under 17 OR explicitly marked as CTC = qualifying child
                if dep_age < 17 or credit_type == 'ctc':
                    children_under_17 += 1
                else:
                    other_deps += 1
    
    data['qualifying_children_under_17'] = children_under_17
    data['other_dependents'] = other_deps
    
    return data


# ════════════════════════════════════════════════════════════
# MAIN CALCULATE FUNCTION
# ════════════════════════════════════════════════════════════

def calculate(raw_data):
    """
    Main federal tax calculation function.
    Returns complete tax calculation results.
    """
    # Convert session format if needed
    data = extract_from_session(raw_data)
    
    fs = normalize_status(data.get('filing_status', 'single'))
    
    # ═══════════════════════════════════════════════════════
    # AGES - Auto from DOB
    # ═══════════════════════════════════════════════════════
    taxpayer_age = int(get_val(data, 'taxpayer_age'))
    if taxpayer_age == 0:
        taxpayer_age = calculate_age(data.get('taxpayer_dob', ''))
    
    spouse_age = int(get_val(data, 'spouse_age'))
    if spouse_age == 0:
        spouse_age = calculate_age(data.get('spouse_dob', ''))
    
    # ═══════════════════════════════════════════════════════
    # INCOME
    # ═══════════════════════════════════════════════════════
    taxpayer_wages = get_val(data, 'taxpayer_wages', 'wages')
    spouse_wages = get_val(data, 'spouse_wages')
    total_wages = taxpayer_wages + spouse_wages
    
    # ✅ v8.1 FIX: Tips - added 'taxpayer_w2_tips' to field lookup
    tips_received = get_val(data, 'tips_received', 'tips', 'tip_income', 'taxpayer_w2_tips')
    overtime_pay = get_val(data, 'overtime_pay', 'overtime')
    
    interest_income = get_val(data, 'interest_income', 'interest')
    ordinary_dividends = get_val(data, 'dividend_income', 'dividends', 'ordinary_dividends')
    qualified_dividends = get_val(data, 'qualified_dividends')
    
    short_term_gains = get_val(data, 'short_term_gains', 'short_term_capital_gains')
    long_term_gains = get_val(data, 'long_term_gains', 'long_term_capital_gains', 'capital_gains')
    net_capital_gain = short_term_gains + long_term_gains
    capital_loss_deduction = min(3000, abs(min(0, net_capital_gain)))
    
    gross_ira = get_val(data, 'ira_distributions', 'ira_distribution')
    taxable_ira = get_val(data, 'taxable_ira', default=gross_ira)
    
    gross_pension = get_val(data, 'pension_income', 'pension', 'pensions')
    taxable_pension = get_val(data, 'taxable_pension', default=gross_pension)
    
    social_security_benefits = get_val(data, 'social_security_benefits', 'social_security')
    
    gross_self_employment = get_val(data, 'self_employment_income', 'business_income', 'self_employment')
    se_expenses = get_val(data, 'self_employment_expenses', 'business_expenses')
    net_self_employment = max(0, gross_self_employment - se_expenses)
    
    other_income = get_val(data, 'other_income')
    
    # Earned income
    earned_income = total_wages + net_self_employment
    
    # Self-employment tax
    if net_self_employment > 0:
        se_taxable = net_self_employment * SE_INCOME_MULTIPLIER
        se_tax = se_taxable * SE_TAX_RATE
        se_deduction = se_tax / 2
    else:
        se_tax = 0
        se_deduction = 0
    
    # Social Security taxability
    provisional_income = (total_wages + interest_income + ordinary_dividends + 
                          net_capital_gain + taxable_ira + taxable_pension + 
                          net_self_employment + other_income)
    taxable_social_security = calculate_ss_taxable(social_security_benefits, provisional_income, fs)
    
    # Total income
    total_income = (total_wages + interest_income + ordinary_dividends + 
                    max(0, net_capital_gain) + taxable_ira + taxable_pension + 
                    taxable_social_security + net_self_employment + other_income)
    
    # ═══════════════════════════════════════════════════════
    # ADJUSTMENTS TO INCOME (Above-the-line)
    # ═══════════════════════════════════════════════════════
    
    # IRA Deduction
    has_retirement_plan = get_bool(data, 'has_retirement_plan', 'taxpayer_has_401k')
    spouse_has_retirement_plan = get_bool(data, 'spouse_has_retirement_plan', 'spouse_has_401k')
    
    magi_for_ira = total_income - se_deduction
    
    taxpayer_ira = get_val(data, 'ira_contribution', 'taxpayer_ira', 'ira_contributions')
    taxpayer_ira_result = calculate_ira_deduction(taxpayer_ira, magi_for_ira, fs, has_retirement_plan, taxpayer_age)
    
    spouse_ira = get_val(data, 'spouse_ira_contribution', 'spouse_ira')
    spouse_ira_result = calculate_spouse_ira_deduction(spouse_ira, magi_for_ira, fs, spouse_has_retirement_plan, has_retirement_plan, spouse_age)
    
    total_ira_deductible = taxpayer_ira_result['deductible'] + spouse_ira_result['deductible']
    
    # HSA
    hsa = min(get_val(data, 'hsa_contribution', 'hsa', 'hsa_contributions'),
              HSA_LIMIT_FAMILY if fs == 'married_filing_jointly' else HSA_LIMIT_SELF)
    if taxpayer_age >= 55:
        hsa = min(hsa + HSA_CATCH_UP, HSA_LIMIT_FAMILY + HSA_CATCH_UP if fs == 'married_filing_jointly' else HSA_LIMIT_SELF + HSA_CATCH_UP)
    
    # Student loan interest
    student_loan = min(get_val(data, 'student_loan_interest', 'student_loan'), STUDENT_LOAN_MAX)
    
    # Total traditional adjustments (IRA, HSA, etc. - these reduce AGI)
    traditional_adjustments = total_ira_deductible + hsa + student_loan + se_deduction + capital_loss_deduction
    
    # ═══════════════════════════════════════════════════════
    # AGI (Line 11) - Traditional adjustments ONLY
    # ✅ v8.1 FIX: OBBB is NOT included here! OBBB is below-the-line.
    # ═══════════════════════════════════════════════════════
    total_adjustments = traditional_adjustments  # OBBB is NOT an adjustment to AGI!
    agi = total_income - total_adjustments
    
    # ═══════════════════════════════════════════════════════
    # ✅ v8.1 FIX: OBBB DEDUCTIONS - BELOW-THE-LINE!
    # These reduce TAXABLE INCOME, not AGI (per IRS Schedule 1-A)
    # ═══════════════════════════════════════════════════════
    obbb_result = calculate_all_obbb_deductions(data, agi, fs)
    total_obbb_deduction = obbb_result['total_obbb_deduction']
    
    # ═══════════════════════════════════════════════════════
    # STANDARD DEDUCTION (Line 12)
    # ═══════════════════════════════════════════════════════
    std_ded = STANDARD_DEDUCTIONS.get(fs, 15750)
    additional_amount = ADDITIONAL_STD_DED.get(fs, 1550)
    additional_count = 0
    
    # 65+ additional deduction (from existing law - separate from OBBB senior deduction!)
    if taxpayer_age >= 65:
        additional_count += 1
    if spouse_age >= 65 and fs in ['married_filing_jointly', 'married_filing_separately', 'qualifying_surviving_spouse']:
        additional_count += 1
    
    std_ded += (additional_amount * additional_count)
    
    # ═══════════════════════════════════════════════════════
    # TAXABLE INCOME (Line 15)
    # ✅ v8.1 FIX: OBBB deductions subtracted HERE (below-the-line)
    # ═══════════════════════════════════════════════════════
    taxable_income = max(0, agi - std_ded - total_obbb_deduction)
    
    # ═══════════════════════════════════════════════════════
    # TAX CALCULATION (Line 16)
    # ═══════════════════════════════════════════════════════
    preferential_income = qualified_dividends + max(0, long_term_gains)
    ordinary_taxable = max(0, taxable_income - preferential_income)
    
    brackets = TAX_BRACKETS.get(fs, TAX_BRACKETS['single'])
    ordinary_tax = 0
    prev = 0
    for limit, rate in brackets:
        if ordinary_taxable <= prev:
            break
        ordinary_tax += (min(ordinary_taxable, limit) - prev) * rate
        prev = limit
    
    preferential_tax = calculate_capital_gains_tax(preferential_income, ordinary_taxable, fs)
    
    bracket_tax = round(ordinary_tax + preferential_tax, 2)
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
    
    eitc_amount, eitc_validation = calculate_eitc(earned_income, agi, fs, qualifying_children)
    
    total_nonrefundable_credits = ctc_result['ctc_nonrefundable'] + ctc_result['other_dependent_credit']
    total_refundable_credits = ctc_result['ctc_refundable'] + eitc_amount
    
    tax_after_credits = max(0, total_tax_before_credits - total_nonrefundable_credits)
    
    # ═══════════════════════════════════════════════════════
    # PAYMENTS & RESULT
    # ═══════════════════════════════════════════════════════
    taxpayer_fed_withheld = get_val(data, 'taxpayer_federal_withheld', 'federal_withheld')
    spouse_fed_withheld = get_val(data, 'spouse_federal_withheld')
    total_withholding = taxpayer_fed_withheld + spouse_fed_withheld
    
    taxpayer_state_withheld = get_val(data, 'taxpayer_state_withheld', 'state_withheld')
    spouse_state_withheld = get_val(data, 'spouse_state_withheld')
    total_state_withholding = taxpayer_state_withheld + spouse_state_withheld
    
    estimated_payments = get_val(data, 'estimated_payments', 'estimated_tax_payments')
    
    total_payments = total_withholding + estimated_payments + total_refundable_credits
    
    balance = total_payments - tax_after_credits
    
    # ═══════════════════════════════════════════════════════
    # RETURN RESULT
    # ═══════════════════════════════════════════════════════
    return {
        'success': True,
        'tax_year': 2025,
        'filing_status': fs,
        
        # INCOME
        'wages': round(total_wages, 2),
        'taxpayer_wages': round(taxpayer_wages, 2),
        'spouse_wages': round(spouse_wages, 2),
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
        
        # ✅ v8.1: OBBB DEDUCTIONS (FIXED - below-the-line)
        'tips_received': round(tips_received, 2),
        'tips_deduction': round(obbb_result['tips']['tips_deduction'], 2),
        'tips_reason': obbb_result['tips']['reason'],
        
        'overtime_pay': round(overtime_pay, 2),
        'overtime_deduction': round(obbb_result['overtime']['overtime_deduction'], 2),
        'overtime_reason': obbb_result['overtime']['reason'],
        
        'car_loan_interest': round(obbb_result['car_loan']['car_loan_interest'], 2),
        'car_loan_deduction': round(obbb_result['car_loan']['car_loan_deduction'], 2),
        'car_loan_reason': obbb_result['car_loan']['reason'],
        
        'taxpayer_65_plus': obbb_result['senior']['taxpayer_65_plus'],
        'spouse_65_plus': obbb_result['senior']['spouse_65_plus'],
        'senior_deduction': round(obbb_result['senior']['senior_deduction'], 2),
        'senior_reason': obbb_result['senior']['reason'],
        
        'total_obbb_deduction': round(total_obbb_deduction, 2),
        
        # ADJUSTMENTS (traditional only - OBBB is separate)
        'adjustments': round(total_adjustments, 2),
        'traditional_adjustments': round(traditional_adjustments, 2),
        'taxpayer_ira_contributed': round(taxpayer_ira_result['contributed'], 2),
        'taxpayer_ira_deductible': round(taxpayer_ira_result['deductible'], 2),
        'taxpayer_ira_non_deductible': round(taxpayer_ira_result['non_deductible'], 2),
        'taxpayer_ira_reason': taxpayer_ira_result['reason'],
        'spouse_ira_contributed': round(spouse_ira_result['contributed'], 2),
        'spouse_ira_deductible': round(spouse_ira_result['deductible'], 2),
        'spouse_ira_non_deductible': round(spouse_ira_result['non_deductible'], 2),
        'spouse_ira_reason': spouse_ira_result['reason'],
        'ira_deduction': round(total_ira_deductible, 2),
        'hsa_deduction': round(hsa, 2),
        'student_loan_deduction': round(student_loan, 2),
        'se_tax_deduction': round(se_deduction, 2),
        'capital_loss_deduction': round(capital_loss_deduction, 2),
        
        # AGI & DEDUCTIONS
        'agi': round(agi, 2),
        'federal_agi': round(agi, 2),
        'magi_for_ira': round(magi_for_ira, 2),
        'standard_deduction': round(std_ded, 2),
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
        'taxpayer_federal_withheld': round(taxpayer_fed_withheld, 2),
        'spouse_federal_withheld': round(spouse_fed_withheld, 2),
        'state_withholding': round(total_state_withholding, 2),
        'taxpayer_state_withheld': round(taxpayer_state_withheld, 2),
        'spouse_state_withheld': round(spouse_state_withheld, 2),
        'estimated_payments': round(estimated_payments, 2),
        'refundable_credits': round(total_refundable_credits, 2),
        'total_payments': round(total_payments, 2),
        
        # RESULT
        'refund': round(max(0, balance), 2),
        'amount_owed': round(max(0, -balance), 2),
        
        # DEBUG
        '_taxpayer_age': taxpayer_age,
        '_spouse_age': spouse_age,
        '_has_retirement_plan': has_retirement_plan,
        '_spouse_has_retirement_plan': spouse_has_retirement_plan,
    }


# ════════════════════════════════════════════════════════════
# CLI ENTRY POINT
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


__all__ = [
    'calculate', 
    'main', 
    'calculate_ira_deduction', 
    'calculate_spouse_ira_deduction', 
    'extract_from_session',
    'calculate_tips_deduction',
    'calculate_overtime_deduction',
    'calculate_car_loan_deduction',
    'calculate_senior_deduction',
    'calculate_all_obbb_deductions',
]

if __name__ == '__main__':
    main()