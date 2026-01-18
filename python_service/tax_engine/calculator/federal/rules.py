# tax_engine/federal/rules.py
# ============================================================
# FEDERAL TAX RULES 2025 (IRS-COMPLIANT)
# Source: IRS Rev. Proc. 2024-40 + One Big Beautiful Bill Act (OBBBA)
# Last Updated: January 2026
# ============================================================

TAX_YEAR = 2025

# ============================================================
# STANDARD DEDUCTIONS (2025 - UPDATED per OBBBA)
# Source: https://www.irs.gov/forms-pubs/how-to-update-withholding-to-account-for-tax-law-changes-for-2025
# ============================================================
STANDARD_DEDUCTIONS = {
    "single": 15750,
    "married_filing_jointly": 31500,
    "married_filing_separately": 15750,
    "head_of_household": 23625,
    "qualifying_surviving_spouse": 31500
}

# Additional amount for age 65+ or blind (per condition)
# Source: IRS Publication 505
ADDITIONAL_STANDARD_DEDUCTION = {
    "single": 2000,
    "head_of_household": 2000,
    "married_filing_jointly": 1600,
    "married_filing_separately": 1600,
    "qualifying_surviving_spouse": 1600
}

# Enhanced Senior Deduction (NEW in 2025 via OBBBA)
# Up to $6,000 additional deduction for seniors 65+ with income below threshold
# Phase out: Reduced by $0.06 for every $1 MAGI exceeds threshold
SENIOR_BONUS_DEDUCTION = {
    "amount": 6000,
    "magi_threshold": {
        "single": 75000,
        "head_of_household": 75000,
        "married_filing_jointly": 150000,
        "qualifying_surviving_spouse": 150000
    },
    "phase_out_rate": 0.06  # $0.06 reduction per $1 over threshold
}

# ============================================================
# TAX BRACKETS (2025 - CORRECT per Rev. Proc. 2024-40)
# ============================================================
TAX_BRACKETS = {
    "single": [
        (11925, 0.10),
        (48475, 0.12),
        (103350, 0.22),
        (197300, 0.24),
        (250525, 0.32),
        (626350, 0.35),
        (float("inf"), 0.37)
    ],
    "married_filing_jointly": [
        (23850, 0.10),
        (96950, 0.12),
        (206700, 0.22),
        (394600, 0.24),
        (501050, 0.32),
        (751600, 0.35),
        (float("inf"), 0.37)
    ],
    "married_filing_separately": [
        (11925, 0.10),
        (48475, 0.12),
        (103350, 0.22),
        (197300, 0.24),
        (250525, 0.32),
        (375800, 0.35),
        (float("inf"), 0.37)
    ],
    "head_of_household": [
        (17000, 0.10),
        (64850, 0.12),
        (103350, 0.22),
        (197300, 0.24),
        (250500, 0.32),
        (626350, 0.35),
        (float("inf"), 0.37)
    ],
    "qualifying_surviving_spouse": [
        (23850, 0.10),
        (96950, 0.12),
        (206700, 0.22),
        (394600, 0.24),
        (501050, 0.32),
        (751600, 0.35),
        (float("inf"), 0.37)
    ]
}

# ============================================================
# LONG-TERM CAPITAL GAINS BRACKETS (2025)
# ============================================================
LTCG_BRACKETS = {
    "single": [
        (47025, 0.0),
        (518900, 0.15),
        (float("inf"), 0.20)
    ],
    "married_filing_jointly": [
        (94050, 0.0),
        (583750, 0.15),
        (float("inf"), 0.20)
    ],
    "married_filing_separately": [
        (47025, 0.0),
        (291850, 0.15),
        (float("inf"), 0.20)
    ],
    "head_of_household": [
        (63000, 0.0),
        (551350, 0.15),
        (float("inf"), 0.20)
    ],
    "qualifying_surviving_spouse": [
        (94050, 0.0),
        (583750, 0.15),
        (float("inf"), 0.20)
    ]
}

# ============================================================
# SOCIAL SECURITY (2025)
# ============================================================
SOCIAL_SECURITY = {
    "tax_rate": 0.062,
    "wage_base": 176100,
    "max_tax": 10918.20
}

# ============================================================
# MEDICARE (2025)
# ============================================================
MEDICARE = {
    "tax_rate": 0.0145,
    "additional_rate": 0.009,
    "additional_threshold": {
        "single": 200000,
        "married_filing_jointly": 250000,
        "married_filing_separately": 125000,
        "head_of_household": 200000,
        "qualifying_surviving_spouse": 250000
    }
}

# ============================================================
# SELF-EMPLOYMENT (2025)
# ============================================================
SELF_EMPLOYMENT = {
    "tax_rate": 0.153,
    "ss_rate": 0.124,
    "medicare_rate": 0.029,
    "income_multiplier": 0.9235,
    "deduction_rate": 0.5,
    "minimum_income": 400
}

# ============================================================
# CHILD TAX CREDIT (2025 - UPDATED per OBBBA)
# Source: IRS.gov/credits-deductions/individuals/child-tax-credit
# ============================================================
CHILD_TAX_CREDIT = {
    "amount": 2200,  # ✅ UPDATED: Increased from $2,000 to $2,200 per OBBBA
    "refundable_max": 1700,  # ✅ ACTC max refundable per qualifying child
    "age_limit": 17,
    "other_dependent": 500,  # ODC - Other Dependent Credit
    "phase_out": {
        "single": 200000,
        "married_filing_jointly": 400000,
        "married_filing_separately": 200000,
        "head_of_household": 200000,
        "qualifying_surviving_spouse": 400000
    },
    "phase_out_rate": 50,  # $50 reduction per $1,000 over threshold
    "refundability_threshold": 2500,  # Earned income threshold for ACTC
    "refundability_rate": 0.15  # 15% of earned income over threshold
}

# ============================================================
# EARNED INCOME TAX CREDIT (2025)
# Source: IRS Rev. Proc. 2024-40
# ============================================================
EITC = {
    0: {
        "max_credit": 649,
        "earned_income_amount": 8260,
        "phase_out_begin_single": 10330,
        "phase_out_begin_mfj": 17730,
        "phase_out_end_single": 19104,
        "phase_out_end_mfj": 26214
    },
    1: {
        "max_credit": 4328,
        "earned_income_amount": 12730,
        "phase_out_begin_single": 23350,
        "phase_out_begin_mfj": 30480,
        "phase_out_end_single": 50434,
        "phase_out_end_mfj": 57554
    },
    2: {
        "max_credit": 7152,
        "earned_income_amount": 17880,
        "phase_out_begin_single": 23350,
        "phase_out_begin_mfj": 30480,
        "phase_out_end_single": 57310,
        "phase_out_end_mfj": 64430
    },
    3: {
        "max_credit": 8046,
        "earned_income_amount": 17880,
        "phase_out_begin_single": 23350,
        "phase_out_begin_mfj": 30480,
        "phase_out_end_single": 61555,
        "phase_out_end_mfj": 68675
    },
    "investment_income_limit": 11600
}

# ============================================================
# IRA CONTRIBUTION LIMITS (2025)
# ============================================================
IRA_LIMITS = {
    "contribution_limit": 7000,
    "catch_up_50_plus": 1000,  # Additional for age 50+
    "total_limit_50_plus": 8000
}

# ============================================================
# HSA CONTRIBUTION LIMITS (2025)
# ============================================================
HSA_LIMITS = {
    "self_only": 4300,
    "family": 8550,
    "catch_up_55_plus": 1000
}

# ============================================================
# STUDENT LOAN INTEREST DEDUCTION (2025)
# ============================================================
STUDENT_LOAN_INTEREST = {
    "max_deduction": 2500,
    "phase_out_begin": {
        "single": 80000,
        "married_filing_jointly": 165000
    },
    "phase_out_end": {
        "single": 95000,
        "married_filing_jointly": 195000
    }
}

# ============================================================
# NEW 2025 DEDUCTIONS (OBBBA)
# ============================================================

# No Tax on Tips (NEW in 2025)
NO_TAX_ON_TIPS = {
    "max_deduction": 25000,  # $25,000 MFJ, $12,500 other statuses
    "single_limit": 12500,
    "mfj_limit": 25000,
    "requires_ssn": True
}

# No Tax on Overtime (NEW in 2025)
NO_TAX_ON_OVERTIME = {
    "max_deduction": 25000,  # $25,000 MFJ, $12,500 other statuses
    "single_limit": 12500,
    "mfj_limit": 25000
}

# No Tax on Car Loan Interest (NEW in 2025)
CAR_LOAN_INTEREST_DEDUCTION = {
    "max_deduction": 10000,
    "vehicle_weight_limit": 14000,  # Gross vehicle weight < 14,000 lbs
    "requires_us_assembly": True,
    "new_vehicles_only": True
}

# ============================================================
# ALTERNATIVE MINIMUM TAX (2025)
# ============================================================
AMT = {
    "exemption": {
        "single": 88100,
        "married_filing_jointly": 137000,
        "married_filing_separately": 68500,
        "head_of_household": 88100
    },
    "phase_out_threshold": {
        "single": 626350,
        "married_filing_jointly": 1252700,
        "married_filing_separately": 626350,
        "head_of_household": 626350
    },
    "rates": [
        (232600, 0.26),  # 26% on first $232,600 (MFJ: $465,200)
        (float("inf"), 0.28)  # 28% on remainder
    ]
}

# ============================================================
# OTHER TAX PARAMETERS (2025)
# ============================================================
OTHER_PARAMETERS = {
    "qualified_business_income_deduction": 0.20,  # 20% QBI deduction
    "estate_tax_exclusion": 13990000,
    "gift_tax_exclusion": 19000,
    "401k_contribution_limit": 23500,
    "401k_catch_up_50_plus": 7500,
    "foreign_earned_income_exclusion": 130000,
    "health_fsa_limit": 3400,
    "health_fsa_carryover": 680,
    "transportation_fringe": 325  # per month
}