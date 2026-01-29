# tax_engine/api/rules_api.py
# ============================================================
# API ENDPOINT FOR TAX RULES
# AI can fetch rules from this endpoint
# ============================================================

from flask import Blueprint, jsonify, request
from tax_engine.federal.rules import (
    TAX_YEAR,
    STANDARD_DEDUCTIONS,
    ADDITIONAL_STANDARD_DEDUCTION,
    SENIOR_BONUS_DEDUCTION,
    TAX_BRACKETS,
    LTCG_BRACKETS,
    SOCIAL_SECURITY,
    MEDICARE,
    SELF_EMPLOYMENT,
    CHILD_TAX_CREDIT,
    EITC,
    IRA_LIMITS,
    HSA_LIMITS,
    STUDENT_LOAN_INTEREST,
    NO_TAX_ON_TIPS,
    NO_TAX_ON_OVERTIME,
    CAR_LOAN_INTEREST_DEDUCTION,
    AMT,
    OTHER_PARAMETERS
)

rules_bp = Blueprint('rules', __name__)

# ============================================================
# GET ALL RULES
# ============================================================
@rules_bp.route('/rules', methods=['GET'])
def get_all_rules():
    """Return all tax rules for 2025"""
    return jsonify({
        "success": True,
        "tax_year": TAX_YEAR,
        "rules": {
            "standard_deductions": STANDARD_DEDUCTIONS,
            "additional_standard_deduction": ADDITIONAL_STANDARD_DEDUCTION,
            "senior_bonus_deduction": SENIOR_BONUS_DEDUCTION,
            "child_tax_credit": CHILD_TAX_CREDIT,
            "ira_limits": IRA_LIMITS,
            "hsa_limits": HSA_LIMITS,
            "student_loan_interest": STUDENT_LOAN_INTEREST,
            "self_employment": SELF_EMPLOYMENT,
            "social_security": SOCIAL_SECURITY,
            "medicare": MEDICARE,
            "other": OTHER_PARAMETERS
        }
    })

# ============================================================
# GET SPECIFIC RULE BY CATEGORY
# ============================================================
@rules_bp.route('/rules/<category>', methods=['GET'])
def get_rule_category(category):
    """Return specific rule category"""
    
    rules_map = {
        "standard_deduction": STANDARD_DEDUCTIONS,
        "additional_deduction": ADDITIONAL_STANDARD_DEDUCTION,
        "senior_deduction": SENIOR_BONUS_DEDUCTION,
        "tax_brackets": TAX_BRACKETS,
        "capital_gains": LTCG_BRACKETS,
        "social_security": SOCIAL_SECURITY,
        "medicare": MEDICARE,
        "self_employment": SELF_EMPLOYMENT,
        "child_tax_credit": CHILD_TAX_CREDIT,
        "eitc": EITC,
        "ira": IRA_LIMITS,
        "hsa": HSA_LIMITS,
        "student_loan": STUDENT_LOAN_INTEREST,
        "tips": NO_TAX_ON_TIPS,
        "overtime": NO_TAX_ON_OVERTIME,
        "car_loan": CAR_LOAN_INTEREST_DEDUCTION,
        "amt": AMT,
        "other": OTHER_PARAMETERS
    }
    
    if category not in rules_map:
        return jsonify({
            "success": False,
            "error": f"Unknown category: {category}",
            "available": list(rules_map.keys())
        }), 404
    
    return jsonify({
        "success": True,
        "tax_year": TAX_YEAR,
        "category": category,
        "rules": rules_map[category]
    })

# ============================================================
# GET LIMITS FOR PERSON (based on age, filing status)
# ============================================================
@rules_bp.route('/rules/limits', methods=['POST'])
def get_personal_limits():
    """
    Get personalized limits based on age and filing status.
    
    Request body:
    {
        "age": 54,
        "filing_status": "married_filing_jointly",
        "hsa_coverage": "family"  // optional
    }
    """
    data = request.get_json() or {}
    age = data.get('age', 0)
    filing_status = data.get('filing_status', 'single')
    hsa_coverage = data.get('hsa_coverage', 'self_only')
    
    # Calculate IRA limit
    ira_limit = IRA_LIMITS['contribution_limit']
    if age >= 50:
        ira_limit += IRA_LIMITS['catch_up_50_plus']
    
    # Calculate 401(k) limit
    k401_base = OTHER_PARAMETERS['401k_contribution_limit']
    k401_catchup = OTHER_PARAMETERS['401k_catch_up_50_plus']
    
    if age >= 60 and age <= 63:
        # SUPER catch-up (150% of regular catch-up)
        k401_limit = k401_base + 11250  # $34,750
        k401_note = "Super catch-up (age 60-63)"
    elif age >= 50:
        k401_limit = k401_base + k401_catchup  # $31,000
        k401_note = "Regular catch-up (age 50+)"
    else:
        k401_limit = k401_base  # $23,500
        k401_note = "Standard limit (under 50)"
    
    # Calculate HSA limit
    hsa_base = HSA_LIMITS.get(hsa_coverage, HSA_LIMITS['self_only'])
    hsa_limit = hsa_base
    if age >= 55:
        hsa_limit += HSA_LIMITS['catch_up_55_plus']
    
    # Get standard deduction
    std_deduction = STANDARD_DEDUCTIONS.get(filing_status, 15750)
    additional_deduction = 0
    
    if age >= 65:
        additional_deduction = ADDITIONAL_STANDARD_DEDUCTION.get(filing_status, 1600)
        # Could also qualify for senior bonus deduction
    
    # Get CTC phase-out
    ctc_phase_out = CHILD_TAX_CREDIT['phase_out'].get(filing_status, 200000)
    
    return jsonify({
        "success": True,
        "tax_year": TAX_YEAR,
        "age": age,
        "filing_status": filing_status,
        "limits": {
            "ira": {
                "limit": ira_limit,
                "catch_up_eligible": age >= 50,
                "note": f"${ira_limit:,} ({'+$1,000 catch-up' if age >= 50 else 'standard'})"
            },
            "401k": {
                "limit": k401_limit,
                "note": k401_note
            },
            "hsa": {
                "limit": hsa_limit,
                "coverage": hsa_coverage,
                "catch_up_eligible": age >= 55,
                "note": f"${hsa_limit:,} ({hsa_coverage}{', +$1,000 catch-up' if age >= 55 else ''})"
            },
            "standard_deduction": {
                "base": std_deduction,
                "additional": additional_deduction,
                "total": std_deduction + additional_deduction,
                "note": f"${std_deduction:,}{f' + ${additional_deduction:,} (65+)' if additional_deduction else ''}"
            },
            "child_tax_credit": {
                "amount": CHILD_TAX_CREDIT['amount'],
                "phase_out_threshold": ctc_phase_out,
                "refundable_max": CHILD_TAX_CREDIT['refundable_max']
            }
        },
        "tips": {
            "ira": f"You can contribute up to ${ira_limit:,} to an IRA this year.",
            "401k": f"Your 401(k) limit is ${k401_limit:,} ({k401_note}).",
            "hsa": f"HSA limit: ${hsa_limit:,} for {hsa_coverage} coverage."
        }
    })

# ============================================================
# GET CHILD CREDIT INFO
# ============================================================
@rules_bp.route('/rules/child-credit', methods=['POST'])
def get_child_credit():
    """
    Calculate child tax credit based on dependent age.
    
    Request body:
    {
        "age": 15,
        "name": "Tommy"  // optional
    }
    """
    data = request.get_json() or {}
    age = data.get('age', 0)
    name = data.get('name', 'Child')
    
    if age < CHILD_TAX_CREDIT['age_limit']:
        return jsonify({
            "success": True,
            "name": name,
            "age": age,
            "qualifies_ctc": True,
            "credit_type": "Child Tax Credit",
            "credit_amount": CHILD_TAX_CREDIT['amount'],
            "refundable_max": CHILD_TAX_CREDIT['refundable_max'],
            "message": f"{name} (age {age}) qualifies for ${CHILD_TAX_CREDIT['amount']:,} Child Tax Credit! Up to ${CHILD_TAX_CREDIT['refundable_max']:,} is refundable."
        })
    else:
        return jsonify({
            "success": True,
            "name": name,
            "age": age,
            "qualifies_ctc": False,
            "credit_type": "Other Dependent Credit",
            "credit_amount": CHILD_TAX_CREDIT['other_dependent'],
            "refundable_max": 0,
            "message": f"{name} (age {age}) qualifies for ${CHILD_TAX_CREDIT['other_dependent']} Other Dependent Credit (not refundable)."
        })

# ============================================================
# AI EDUCATION PROMPT - Get tax tips for conversation
# ============================================================
@rules_bp.route('/rules/ai-tips', methods=['POST'])
def get_ai_tips():
    """
    Get tax education tips for AI to use in conversation.
    
    Request body:
    {
        "topic": "ira",  // or "401k", "hsa", "ctc", "deductions"
        "age": 54,
        "filing_status": "married_filing_jointly"
    }
    """
    data = request.get_json() or {}
    topic = data.get('topic', '').lower()
    age = data.get('age', 0)
    filing_status = data.get('filing_status', 'single')
    
    tips = []
    
    if topic in ['ira', 'retirement', 'all']:
        ira_limit = IRA_LIMITS['contribution_limit'] + (IRA_LIMITS['catch_up_50_plus'] if age >= 50 else 0)
        tips.append({
            "topic": "IRA",
            "tip": f"Your 2025 IRA contribution limit is ${ira_limit:,}.",
            "detail": "Traditional IRA contributions may be tax-deductible. Roth IRA contributions aren't deductible but grow tax-free." if age < 50 else f"Since you're {age}, you get an extra $1,000 catch-up contribution!"
        })
    
    if topic in ['401k', 'retirement', 'all']:
        if age >= 60 and age <= 63:
            k401_limit = 34750
            note = "You qualify for the SUPER catch-up contribution!"
        elif age >= 50:
            k401_limit = 31000
            note = "You qualify for catch-up contributions."
        else:
            k401_limit = 23500
            note = "Standard contribution limit."
        
        tips.append({
            "topic": "401(k)",
            "tip": f"Your 2025 401(k) limit is ${k401_limit:,}.",
            "detail": note
        })
    
    if topic in ['hsa', 'health', 'all']:
        hsa_self = HSA_LIMITS['self_only'] + (HSA_LIMITS['catch_up_55_plus'] if age >= 55 else 0)
        hsa_family = HSA_LIMITS['family'] + (HSA_LIMITS['catch_up_55_plus'] if age >= 55 else 0)
        tips.append({
            "topic": "HSA",
            "tip": f"2025 HSA limits: ${hsa_self:,} (self) or ${hsa_family:,} (family).",
            "detail": "HSA contributions are triple tax-advantaged: tax-deductible, grow tax-free, and withdrawals for medical expenses are tax-free!" + (" You get an extra $1,000 catch-up since you're 55+!" if age >= 55 else "")
        })
    
    if topic in ['ctc', 'children', 'dependents', 'all']:
        tips.append({
            "topic": "Child Tax Credit",
            "tip": f"2025 CTC: ${CHILD_TAX_CREDIT['amount']:,} per child under 17.",
            "detail": f"Up to ${CHILD_TAX_CREDIT['refundable_max']:,} is refundable. Children 17+ qualify for ${CHILD_TAX_CREDIT['other_dependent']} Other Dependent Credit."
        })
    
    if topic in ['deductions', 'standard', 'all']:
        std_ded = STANDARD_DEDUCTIONS.get(filing_status, 15750)
        tips.append({
            "topic": "Standard Deduction",
            "tip": f"2025 standard deduction for {filing_status.replace('_', ' ')}: ${std_ded:,}.",
            "detail": "If you're 65+, you get an additional $1,600-$2,000 deduction, plus up to $6,000 senior bonus deduction!" if age >= 65 else "Consider itemizing if your deductions exceed this amount."
        })
    
    if topic in ['tips', 'new', 'obbba', 'all']:
        tips.append({
            "topic": "No Tax on Tips (NEW!)",
            "tip": f"NEW in 2025: Up to ${NO_TAX_ON_TIPS['mfj_limit']:,} in tips may be tax-free!",
            "detail": "Service industry workers can deduct tips from taxable income."
        })
        tips.append({
            "topic": "No Tax on Overtime (NEW!)",
            "tip": f"NEW in 2025: Up to ${NO_TAX_ON_OVERTIME['mfj_limit']:,} in overtime may be tax-free!",
            "detail": "Overtime pay can be deducted from taxable income."
        })
    
    return jsonify({
        "success": True,
        "tax_year": TAX_YEAR,
        "topic": topic,
        "age": age,
        "filing_status": filing_status,
        "tips": tips
    })