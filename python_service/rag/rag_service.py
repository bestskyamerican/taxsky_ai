# ============================================================
# RAG SERVICE - Tax Knowledge Retrieval v2.0
# ============================================================
# File: python_tax_api/rag/rag_service.py
#
# FEATURES:
# 1. Load tax rules from markdown files
# 2. Keyword search (fast, no dependencies)
# 3. ChromaDB vector search (optional, better accuracy)
# 4. Q&A extraction from documents
# 5. 401k/IRA decision logic
# 6. W-2 box code explanations
# ============================================================

import os
import re
import json
from typing import Dict, List, Optional, Tuple
from pathlib import Path

# ============================================================
# CONFIGURATION
# ============================================================
RAG_BASE_PATH = Path(__file__).parent
FEDERAL_RAG_PATH = RAG_BASE_PATH / "federal"
STATES_RAG_PATH = RAG_BASE_PATH / "states"

# Cache for loaded documents
_federal_rag: Optional[str] = None
_federal_docs: Dict[str, str] = {}  # Multiple federal docs
_state_rags: Dict[str, str] = {}
_qa_cache: Dict[str, List[Tuple[str, str]]] = {}
_tax_rules_json: Optional[Dict] = None

# States with no income tax
NO_TAX_STATES = {
    "AK": "Alaska",
    "FL": "Florida", 
    "NV": "Nevada",
    "NH": "New Hampshire",  # No tax on wages, only dividends/interest
    "SD": "South Dakota",
    "TN": "Tennessee",
    "TX": "Texas",
    "WA": "Washington",
    "WY": "Wyoming"
}

# ============================================================
# CORRECT 2025 TAX VALUES (from IRS Form 1040 - 2025)
# ============================================================
TAX_VALUES_2025 = {
    "standard_deduction": {
        "single": 15750,
        "married_filing_jointly": 31500,
        "married_filing_separately": 15750,
        "head_of_household": 23625,
        "qualifying_surviving_spouse": 31500
    },
    "additional_standard_deduction": {
        "single_or_hoh": 2000,
        "married": 1600
    },
    "child_tax_credit": 2000,
    "actc_max": 1700,
    "other_dependents_credit": 500,
    "eitc_max": {0: 649, 1: 4328, 2: 7152, 3: 8046},
    
    # RETIREMENT LIMITS
    "401k_limit": {"under_50": 23500, "50_plus": 31000, "catch_up": 7500},
    "ira_limit": {"under_50": 7000, "50_plus": 8000},
    "roth_ira_limit": {"under_50": 7000, "50_plus": 8000},
    "hsa_limit": {"self": 4300, "family": 8550, "catch_up_55": 1000},
    
    # IRA DEDUCTION INCOME LIMITS (with workplace retirement plan)
    "ira_deduction_limits": {
        "single": {"full": 79000, "partial_max": 89000},
        "married_filing_jointly": {"full": 126000, "partial_max": 146000},
        "married_filing_separately": {"full": 0, "partial_max": 10000}
    },
    
    # ROTH IRA CONTRIBUTION INCOME LIMITS
    "roth_ira_limits": {
        "single": {"full": 150000, "partial_max": 165000},
        "married_filing_jointly": {"full": 236000, "partial_max": 246000}
    },
    
    "student_loan_max": 2500,
    "salt_cap": 10000,
    
    # SOCIAL SECURITY
    "ss_wage_base": 176100,
    "ss_rate": 0.062,
    "ss_max_tax": 10918.20,
    "medicare_rate": 0.0145,
    "medicare_additional_rate": 0.009,
    "medicare_additional_threshold_single": 200000,
    "medicare_additional_threshold_mfj": 250000
}

# W-2 Box 12 Codes
W2_BOX_12_CODES = {
    "A": "Uncollected social security tax on tips",
    "B": "Uncollected Medicare tax on tips",
    "C": "Taxable cost of group-term life insurance over $50,000",
    "D": "401(k) elective deferrals (pre-tax)",
    "E": "403(b) elective deferrals (pre-tax)",
    "F": "408(k)(6) SEP contributions",
    "G": "457(b) elective deferrals (government)",
    "H": "501(c)(18)(D) tax-exempt contributions",
    "J": "Nontaxable sick pay",
    "K": "20% excise tax on golden parachute",
    "L": "Substantiated employee business expense reimbursements",
    "M": "Uncollected social security tax on group-term life",
    "N": "Uncollected Medicare tax on group-term life",
    "P": "Moving expense reimbursements (military only)",
    "Q": "Nontaxable combat pay",
    "R": "Employer contributions to Archer MSA",
    "S": "SIMPLE 401(k) contributions",
    "T": "Adoption benefits",
    "V": "Income from exercise of nonstatutory stock options",
    "W": "Employer HSA contributions (pre-tax)",
    "Y": "Deferrals under 409A nonqualified plan",
    "Z": "Income under 409A on nonqualified plan",
    "AA": "Roth 401(k) contributions (after-tax)",
    "BB": "Roth 403(b) contributions (after-tax)",
    "DD": "Cost of employer-sponsored health coverage (info only)",
    "EE": "Designated Roth contributions under 457(b)",
    "FF": "Permitted benefits under qualified small employer HRA",
    "GG": "Income from qualified equity grants under 83(i)",
    "HH": "Aggregate deferrals under 83(i) elections"
}


# ============================================================
# DOCUMENT LOADING
# ============================================================

def load_federal_rag() -> str:
    """Load all federal tax rules documents."""
    global _federal_rag, _federal_docs
    
    if _federal_rag is None:
        all_content = []
        
        # Load all markdown files in federal folder
        if FEDERAL_RAG_PATH.exists():
            for md_file in FEDERAL_RAG_PATH.glob("*.md"):
                content = md_file.read_text(encoding="utf-8")
                _federal_docs[md_file.stem] = content
                all_content.append(f"# === {md_file.stem.upper()} ===\n{content}")
                print(f"✅ [RAG] Loaded: {md_file.name}")
        
        # Also try to load JSON rules
        json_file = FEDERAL_RAG_PATH / "tax_rules_2025.json"
        if json_file.exists():
            global _tax_rules_json
            _tax_rules_json = json.loads(json_file.read_text(encoding="utf-8"))
            print(f"✅ [RAG] Loaded: tax_rules_2025.json")
        
        if all_content:
            _federal_rag = "\n\n".join(all_content)
        else:
            print(f"⚠️ [RAG] No federal rules found, using defaults")
            _federal_rag = _generate_default_federal_rules()
    
    return _federal_rag


def load_state_rag(state_code: str) -> str:
    """Load state-specific tax rules document."""
    state_code = state_code.upper()
    
    if state_code not in _state_rags:
        rag_file = STATES_RAG_PATH / f"{state_code}.md"
        if rag_file.exists():
            _state_rags[state_code] = rag_file.read_text(encoding="utf-8")
            print(f"✅ [RAG] Loaded state rules: {rag_file}")
        elif state_code in NO_TAX_STATES:
            _state_rags[state_code] = _generate_no_tax_state_rules(state_code)
        else:
            _state_rags[state_code] = f"Tax rules for {state_code} not yet documented. Please check your state's tax authority website."
    
    return _state_rags[state_code]


def get_available_states() -> List[str]:
    """Get list of states with RAG documents."""
    states = list(NO_TAX_STATES.keys())
    if STATES_RAG_PATH.exists():
        states.extend([f.stem.upper() for f in STATES_RAG_PATH.glob("*.md")])
    return sorted(set(states))


def _generate_default_federal_rules() -> str:
    """Generate federal rules if file not found."""
    return f"""# FEDERAL TAX RULES 2025

## STANDARD DEDUCTION
- Single: ${TAX_VALUES_2025['standard_deduction']['single']:,}
- Married Filing Jointly: ${TAX_VALUES_2025['standard_deduction']['married_filing_jointly']:,}
- Head of Household: ${TAX_VALUES_2025['standard_deduction']['head_of_household']:,}

## ADDITIONAL STANDARD DEDUCTION (65+ or Blind)
- Single/HOH: +${TAX_VALUES_2025['additional_standard_deduction']['single_or_hoh']:,} per condition
- Married: +${TAX_VALUES_2025['additional_standard_deduction']['married']:,} per condition

## CHILD TAX CREDIT
- ${TAX_VALUES_2025['child_tax_credit']:,} per qualifying child under 17
- Up to ${TAX_VALUES_2025['actc_max']:,} refundable (ACTC)

## OTHER DEPENDENTS CREDIT
- ${TAX_VALUES_2025['other_dependents_credit']} per dependent 17+

## 401(k) LIMITS
- Under 50: ${TAX_VALUES_2025['401k_limit']['under_50']:,}
- 50+: ${TAX_VALUES_2025['401k_limit']['50_plus']:,}
- NO INCOME LIMIT for 401(k) deduction!

## IRA LIMITS
- Under 50: ${TAX_VALUES_2025['ira_limit']['under_50']:,}
- 50+: ${TAX_VALUES_2025['ira_limit']['50_plus']:,}

## IRA DEDUCTION LIMITS (if you have 401k at work)
- Single: Full deduction if AGI < $79,000, no deduction if AGI > $89,000
- MFJ: Full deduction if AGI < $126,000, no deduction if AGI > $146,000

## ROTH IRA LIMITS
- Single: Can contribute if AGI < $165,000
- MFJ: Can contribute if AGI < $246,000
"""


def _generate_no_tax_state_rules(state_code: str) -> str:
    """Generate rules for states with no income tax."""
    state_name = NO_TAX_STATES.get(state_code, state_code)
    return f"""# {state_name.upper()} TAX RULES 2025

## OVERVIEW
**{state_name.upper()} HAS NO STATE INCOME TAX**

## WHAT'S NOT TAXED
- All income - NOT TAXED
- Social Security - NOT TAXED  
- Retirement - NOT TAXED
- Capital Gains - NOT TAXED

## NO STATE RETURN NEEDED
You only file federal taxes.

## COMMON QUESTIONS

Q: Does {state_name} have income tax?
A: No, {state_name} has NO state income tax.

Q: Do I need to file a {state_name} tax return?
A: No, there is no state income tax return needed.
"""


# ============================================================
# 401(k) / IRA DECISION LOGIC
# ============================================================

def can_deduct_traditional_ira(agi: float, filing_status: str, has_workplace_plan: bool) -> Dict:
    """
    Determine if user can deduct Traditional IRA contribution.
    
    Args:
        agi: Adjusted Gross Income
        filing_status: single, married_filing_jointly, etc.
        has_workplace_plan: True if has 401(k), 403(b), etc.
    
    Returns:
        Dict with can_deduct, amount, reason
    """
    max_contribution = TAX_VALUES_2025["ira_limit"]["under_50"]
    
    # No workplace plan = always deductible
    if not has_workplace_plan:
        return {
            "can_deduct": True,
            "deductible_amount": max_contribution,
            "reason": "No workplace retirement plan - fully deductible"
        }
    
    # Get limits based on filing status
    status_key = filing_status.lower().replace(" ", "_")
    if status_key not in TAX_VALUES_2025["ira_deduction_limits"]:
        status_key = "single"  # Default
    
    limits = TAX_VALUES_2025["ira_deduction_limits"][status_key]
    full_limit = limits["full"]
    partial_max = limits["partial_max"]
    
    if agi <= full_limit:
        return {
            "can_deduct": True,
            "deductible_amount": max_contribution,
            "reason": f"AGI (${agi:,.0f}) is below ${full_limit:,} - fully deductible"
        }
    elif agi < partial_max:
        # Partial deduction - calculate phase-out
        phase_out_range = partial_max - full_limit
        over_limit = agi - full_limit
        reduction_pct = over_limit / phase_out_range
        partial_amount = max_contribution * (1 - reduction_pct)
        partial_amount = max(0, round(partial_amount / 10) * 10)  # Round to $10
        return {
            "can_deduct": True,
            "deductible_amount": partial_amount,
            "reason": f"AGI (${agi:,.0f}) is in phase-out range - partial deduction of ${partial_amount:,}"
        }
    else:
        return {
            "can_deduct": False,
            "deductible_amount": 0,
            "reason": f"AGI (${agi:,.0f}) exceeds ${partial_max:,} - no deduction allowed. Consider Roth IRA instead!"
        }


def can_contribute_roth_ira(agi: float, filing_status: str) -> Dict:
    """
    Determine if user can contribute to Roth IRA.
    
    Args:
        agi: Adjusted Gross Income (MAGI for Roth)
        filing_status: single, married_filing_jointly, etc.
    
    Returns:
        Dict with can_contribute, amount, reason
    """
    max_contribution = TAX_VALUES_2025["roth_ira_limit"]["under_50"]
    
    status_key = filing_status.lower().replace(" ", "_")
    if status_key not in TAX_VALUES_2025["roth_ira_limits"]:
        status_key = "single"
    
    limits = TAX_VALUES_2025["roth_ira_limits"][status_key]
    full_limit = limits["full"]
    partial_max = limits["partial_max"]
    
    if agi <= full_limit:
        return {
            "can_contribute": True,
            "max_amount": max_contribution,
            "reason": f"AGI (${agi:,.0f}) is below ${full_limit:,} - full contribution allowed"
        }
    elif agi < partial_max:
        phase_out_range = partial_max - full_limit
        over_limit = agi - full_limit
        reduction_pct = over_limit / phase_out_range
        partial_amount = max_contribution * (1 - reduction_pct)
        partial_amount = max(0, round(partial_amount / 10) * 10)
        return {
            "can_contribute": True,
            "max_amount": partial_amount,
            "reason": f"AGI (${agi:,.0f}) is in phase-out range - max ${partial_amount:,} contribution"
        }
    else:
        return {
            "can_contribute": False,
            "max_amount": 0,
            "reason": f"AGI (${agi:,.0f}) exceeds ${partial_max:,} - cannot contribute directly. Consider Backdoor Roth IRA."
        }


def get_retirement_recommendation(agi: float, filing_status: str, has_401k: bool, age: int = 40) -> str:
    """
    Get personalized retirement savings recommendation.
    
    Args:
        agi: Adjusted Gross Income
        filing_status: Filing status
        has_401k: Whether user has 401(k) at work
        age: User's age (for catch-up limits)
    
    Returns:
        Recommendation string
    """
    is_50_plus = age >= 50
    
    # 401(k) limits
    k401_limit = TAX_VALUES_2025["401k_limit"]["50_plus" if is_50_plus else "under_50"]
    
    # IRA analysis
    ira_result = can_deduct_traditional_ira(agi, filing_status, has_401k)
    roth_result = can_contribute_roth_ira(agi, filing_status)
    
    recommendations = []
    
    # Priority 1: 401(k) match
    if has_401k:
        recommendations.append(f"1️⃣ **401(k)**: Contribute at least enough to get full employer match (FREE MONEY!)")
        recommendations.append(f"   - 2025 limit: ${k401_limit:,}")
        recommendations.append(f"   - 401(k) is ALWAYS tax-deductible (no income limit)")
    
    # Priority 2: HSA if eligible
    recommendations.append(f"2️⃣ **HSA** (if eligible): ${TAX_VALUES_2025['hsa_limit']['self']:,} individual / ${TAX_VALUES_2025['hsa_limit']['family']:,} family")
    recommendations.append(f"   - Triple tax benefit: deductible, grows tax-free, withdrawals tax-free for medical")
    
    # Priority 3: IRA
    if ira_result["can_deduct"] and ira_result["deductible_amount"] > 0:
        recommendations.append(f"3️⃣ **Traditional IRA**: {ira_result['reason']}")
        recommendations.append(f"   - Max deduction: ${ira_result['deductible_amount']:,}")
    elif roth_result["can_contribute"]:
        recommendations.append(f"3️⃣ **Roth IRA** (RECOMMENDED): {roth_result['reason']}")
        recommendations.append(f"   - Max contribution: ${roth_result['max_amount']:,}")
        recommendations.append(f"   - No tax deduction now, but TAX-FREE growth and withdrawals!")
    else:
        recommendations.append(f"3️⃣ **Backdoor Roth IRA**: Income too high for direct Roth. Consider Backdoor Roth strategy.")
    
    # Priority 4: Max 401(k)
    if has_401k:
        recommendations.append(f"4️⃣ **Max out 401(k)**: After IRA, return to 401(k) and max it out (${k401_limit:,})")
    
    return "\n".join(recommendations)


def explain_w2_box(box: str, code: Optional[str] = None) -> str:
    """Explain W-2 box or Box 12 code."""
    box = str(box).upper().strip()
    
    # Box 12 codes
    if code:
        code = code.upper()
        if code in W2_BOX_12_CODES:
            return f"W-2 Box 12 Code {code}: {W2_BOX_12_CODES[code]}"
        return f"Unknown Box 12 code: {code}"
    
    # Main boxes
    box_explanations = {
        "1": "Wages, tips, other compensation - Your TAXABLE federal income (excludes pre-tax 401k, health insurance)",
        "2": "Federal income tax withheld - Tax already paid, goes to Form 1040 Line 25a",
        "3": "Social Security wages - Usually HIGHER than Box 1 (includes 401k). Max: $176,100",
        "4": "Social Security tax withheld - Should be ~6.2% of Box 3 (max $10,918.20)",
        "5": "Medicare wages - Usually equals Box 3 (no cap)",
        "6": "Medicare tax withheld - Should be ~1.45% of Box 5",
        "12": "Coded items - Retirement contributions (D=401k), health insurance (DD), HSA (W), etc.",
        "13": "Checkboxes - Retirement plan box is IMPORTANT for IRA deduction limits!",
        "16": "State wages - Usually equals Box 1",
        "17": "State tax withheld - For your state return"
    }
    
    if box in box_explanations:
        return f"W-2 Box {box}: {box_explanations[box]}"
    return f"W-2 Box {box}: Check IRS instructions for Form W-2"


# ============================================================
# Q&A EXTRACTION
# ============================================================

def extract_qa_pairs(content: str) -> List[Tuple[str, str]]:
    """Extract Q&A pairs from document content."""
    qa_pairs = []
    
    # Pattern: Q: ... A: ...
    pattern = r'Q:\s*(.+?)\nA:\s*(.+?)(?=\n\nQ:|\n##|\Z)'
    matches = re.findall(pattern, content, re.DOTALL)
    
    for q, a in matches:
        qa_pairs.append((q.strip(), a.strip()))
    
    return qa_pairs


def find_qa_answer(question: str, state_code: Optional[str] = None) -> Optional[str]:
    """Find answer from Q&A pairs in documents."""
    question_lower = question.lower()
    
    # Check federal Q&A
    federal_content = load_federal_rag()
    federal_qa = extract_qa_pairs(federal_content)
    
    for q, a in federal_qa:
        # Check if question matches
        q_lower = q.lower()
        # Count matching words
        q_words = set(re.findall(r'\w+', q_lower))
        question_words = set(re.findall(r'\w+', question_lower))
        overlap = len(q_words & question_words)
        
        if overlap >= 3 or any(kw in question_lower for kw in q_lower.split() if len(kw) > 4):
            return a
    
    # Check state Q&A if applicable
    if state_code:
        state_content = load_state_rag(state_code)
        state_qa = extract_qa_pairs(state_content)
        
        for q, a in state_qa:
            q_lower = q.lower()
            if any(kw in question_lower for kw in q_lower.split() if len(kw) > 4):
                return a
    
    return None


# ============================================================
# SEARCH
# ============================================================

def search_rag(query: str, state_code: Optional[str] = None, top_k: int = 3) -> Dict:
    """
    Search RAG documents for relevant content.
    
    Args:
        query: Search query
        state_code: Optional state code
        top_k: Number of results to return
    
    Returns:
        Dict with results
    """
    results = {
        "query": query,
        "federal": None,
        "state": None,
        "qa_answer": None
    }
    
    # First check for Q&A answer
    qa_answer = find_qa_answer(query, state_code)
    if qa_answer:
        results["qa_answer"] = qa_answer
    
    # Search federal documents
    federal_content = load_federal_rag()
    query_words = set(re.findall(r'\w+', query.lower()))
    
    # Find sections that match
    sections = re.split(r'\n##\s+', federal_content)
    scored_sections = []
    
    for section in sections:
        section_lower = section.lower()
        score = sum(1 for word in query_words if word in section_lower and len(word) > 2)
        if score > 0:
            scored_sections.append((score, section[:500]))  # Limit section length
    
    scored_sections.sort(reverse=True, key=lambda x: x[0])
    
    if scored_sections:
        results["federal"] = "\n\n".join([s[1] for s in scored_sections[:top_k]])
    
    # Search state documents
    if state_code:
        state_content = load_state_rag(state_code)
        results["state"] = state_content[:1000]  # First 1000 chars
    
    return results


# ============================================================
# GET STANDARD DEDUCTION
# ============================================================

def get_standard_deduction(
    filing_status: str,
    age_65_plus: bool = False,
    blind: bool = False,
    spouse_65_plus: bool = False,
    spouse_blind: bool = False
) -> int:
    """Get standard deduction with additional amounts for 65+ and blind."""
    
    status_key = filing_status.lower().replace(" ", "_")
    if status_key not in TAX_VALUES_2025["standard_deduction"]:
        status_key = "single"
    
    base = TAX_VALUES_2025["standard_deduction"][status_key]
    additional = 0
    
    is_married = "married" in status_key or status_key == "qualifying_surviving_spouse"
    add_per_condition = TAX_VALUES_2025["additional_standard_deduction"]["married" if is_married else "single_or_hoh"]
    
    if age_65_plus:
        additional += add_per_condition
    if blind:
        additional += add_per_condition
    if is_married and spouse_65_plus:
        additional += add_per_condition
    if is_married and spouse_blind:
        additional += add_per_condition
    
    return base + additional


# ============================================================
# MAIN ANSWER FUNCTION
# ============================================================

def answer_tax_question(question: str, state_code: Optional[str] = None, language: str = "en") -> str:
    """
    Answer a tax question using RAG.
    
    Args:
        question: User's question
        state_code: Optional state code
        language: Language code (en, vi, es)
    
    Returns:
        Answer string
    """
    q = question.lower()
    
    # ════════════════════════════════════════════════════════
    # DIRECT ANSWERS (most common questions)
    # ════════════════════════════════════════════════════════
    
    # No-tax states
    if state_code and state_code.upper() in NO_TAX_STATES:
        state_name = NO_TAX_STATES[state_code.upper()]
        if any(kw in q for kw in ["income tax", "tax rate", "state tax"]):
            return f"{state_name} has NO state income tax."
        if "file" in q and "return" in q:
            return f"No state tax return needed for {state_name}. You only file federal taxes."
    
    # ════════════════════════════════════════════════════════
    # 401(k) QUESTIONS
    # ════════════════════════════════════════════════════════
    if "401k" in q or "401(k)" in q:
        if "limit" in q or "max" in q or "how much" in q:
            return f"""2025 401(k) Contribution Limits:
• Under 50: ${TAX_VALUES_2025['401k_limit']['under_50']:,}
• 50 or older: ${TAX_VALUES_2025['401k_limit']['50_plus']:,}
• Catch-up (50+): ${TAX_VALUES_2025['401k_limit']['catch_up']:,}

Important: 401(k) has NO INCOME LIMIT for deduction - always tax-deductible regardless of how much you earn!"""
        
        if "deduct" in q or "tax" in q:
            return f"""401(k) Tax Treatment:
• Contributions are ALWAYS tax-deductible (pre-tax)
• NO income limit for 401(k) deduction (unlike IRA)
• Your W-2 Box 1 is already reduced by your 401(k) amount
• Box 12 Code D shows your 401(k) contribution
• 2025 limit: ${TAX_VALUES_2025['401k_limit']['under_50']:,} (${TAX_VALUES_2025['401k_limit']['50_plus']:,} if 50+)"""
        
        if "box" in q or "w2" in q or "w-2" in q:
            return """401(k) on W-2:
• Box 12, Code D: Your 401(k) contribution amount
• Box 1: Already EXCLUDES your 401(k) (lower than gross)
• Box 3 & 5: INCLUDES your 401(k) (Social Security/Medicare still taxed)
• Box 13: "Retirement plan" checkbox should be checked"""
        
        # General 401k
        return f"""401(k) Overview:
• 2025 Limit: ${TAX_VALUES_2025['401k_limit']['under_50']:,} (${TAX_VALUES_2025['401k_limit']['50_plus']:,} if 50+)
• ALWAYS tax-deductible (no income limit!)
• Employer match = FREE MONEY - always contribute enough to get full match
• Shows on W-2 Box 12, Code D
• Can have BOTH 401(k) AND IRA"""
    
    # ════════════════════════════════════════════════════════
    # IRA QUESTIONS
    # ════════════════════════════════════════════════════════
    if "ira" in q:
        if "roth" in q and "traditional" in q:
            # Comparison question
            return f"""Traditional IRA vs Roth IRA:

TRADITIONAL IRA:
• Contribution: ${TAX_VALUES_2025['ira_limit']['under_50']:,} (${TAX_VALUES_2025['ira_limit']['50_plus']:,} if 50+)
• Tax deduction: Maybe (depends on income & 401k status)
• If you have 401(k) at work: Deduction limited if AGI > $79k (single) or $126k (MFJ)
• Withdrawals: Taxed as ordinary income

ROTH IRA:
• Contribution: ${TAX_VALUES_2025['roth_ira_limit']['under_50']:,} (${TAX_VALUES_2025['roth_ira_limit']['50_plus']:,} if 50+)
• Tax deduction: NEVER (you pay tax now)
• Income limit: Cannot contribute if AGI > $165k (single) or $246k (MFJ)
• Withdrawals: TAX-FREE! 🎉

WHICH IS BETTER?
• Low income now → Traditional (get deduction)
• High income now → Roth (tax-free growth)
• Have 401(k) + income > $89k → Roth (can't deduct Traditional anyway)"""
        
        if "roth" in q:
            if "limit" in q or "income" in q or "can i" in q:
                return f"""Roth IRA Income Limits (2025):

Single/HOH:
• Full contribution if AGI ≤ $150,000
• Partial if AGI $150,001 - $165,000
• Cannot contribute if AGI > $165,000

Married Filing Jointly:
• Full contribution if AGI ≤ $236,000
• Partial if AGI $236,001 - $246,000
• Cannot contribute if AGI > $246,000

Contribution Limit: ${TAX_VALUES_2025['roth_ira_limit']['under_50']:,} (${TAX_VALUES_2025['roth_ira_limit']['50_plus']:,} if 50+)

If income too high: Consider Backdoor Roth IRA strategy."""
            
            return f"""Roth IRA (2025):
• Contribution: ${TAX_VALUES_2025['roth_ira_limit']['under_50']:,} (${TAX_VALUES_2025['roth_ira_limit']['50_plus']:,} if 50+)
• Tax deduction: NONE (contributions are after-tax)
• Tax on growth: NONE! (tax-free growth)
• Tax on withdrawals: NONE! (tax-free in retirement)
• Income limit: $165k single / $246k MFJ
• Best for: Higher income earners, those expecting higher tax rates in retirement"""
        
        if "deduct" in q or "can i" in q:
            return f"""Can You Deduct Traditional IRA? (2025)

IF YOU DON'T HAVE 401(K) AT WORK:
✅ Always fully deductible - no income limit!

IF YOU HAVE 401(K) AT WORK:
Single/HOH:
• Full deduction if AGI ≤ $79,000
• Partial if AGI $79,001 - $89,000
• NO deduction if AGI > $89,000

Married Filing Jointly:
• Full deduction if AGI ≤ $126,000
• Partial if AGI $126,001 - $146,000
• NO deduction if AGI > $146,000

If you can't deduct: Consider Roth IRA instead!"""
        
        # General IRA
        if "limit" in q or "max" in q:
            return f"2025 IRA Contribution Limit: ${TAX_VALUES_2025['ira_limit']['under_50']:,} (under 50) or ${TAX_VALUES_2025['ira_limit']['50_plus']:,} (50+). This is the COMBINED limit for Traditional + Roth IRA."
        
        return f"""IRA Overview (2025):
• Contribution Limit: ${TAX_VALUES_2025['ira_limit']['under_50']:,} (${TAX_VALUES_2025['ira_limit']['50_plus']:,} if 50+)
• This limit is COMBINED for Traditional + Roth
• Can have BOTH 401(k) AND IRA (separate limits)

Traditional IRA: May be tax-deductible (depends on income & 401k)
Roth IRA: No deduction, but TAX-FREE growth & withdrawals"""
    
    # ════════════════════════════════════════════════════════
    # W-2 QUESTIONS
    # ════════════════════════════════════════════════════════
    if "w2" in q or "w-2" in q:
        if "box 12" in q or "code d" in q or "code " in q:
            # Extract code if mentioned
            code_match = re.search(r'code\s*([a-z]{1,2})', q, re.IGNORECASE)
            if code_match:
                code = code_match.group(1).upper()
                if code in W2_BOX_12_CODES:
                    return f"W-2 Box 12 Code {code}: {W2_BOX_12_CODES[code]}"
            
            # List common codes
            return """W-2 Box 12 Common Codes:
• D: 401(k) contributions (pre-tax)
• E: 403(b) contributions (pre-tax)
• W: HSA contributions (employer)
• DD: Health insurance cost (info only, not taxable)
• AA: Roth 401(k) (after-tax)
• C: Group term life insurance over $50k (taxable)

Your 401(k) is Code D - this amount is ALREADY excluded from Box 1."""
        
        if "box 1" in q or "box1" in q:
            return """W-2 Box 1 - Wages, Tips, Other Compensation:
• This is your TAXABLE income for federal tax
• EXCLUDES pre-tax deductions: 401(k), health insurance, HSA, FSA
• Goes to Form 1040, Line 1a
• Usually LOWER than your gross salary"""
        
        if "box 3" in q or "box3" in q:
            return """W-2 Box 3 - Social Security Wages:
• Usually HIGHER than Box 1
• INCLUDES your 401(k) contribution
• Social Security tax is calculated on this amount
• 2025 max wage base: $176,100"""
        
        return """W-2 Key Boxes:
• Box 1: Taxable wages (excludes 401k, health insurance)
• Box 2: Federal tax withheld (goes to Form 1040 Line 25a)
• Box 3: Social Security wages (includes 401k)
• Box 4: Social Security tax (should be ~6.2% of Box 3)
• Box 5: Medicare wages (usually = Box 3)
• Box 6: Medicare tax (should be ~1.45% of Box 5)
• Box 12: Special items (D=401k, W=HSA, DD=health)
• Box 13: Checkboxes (retirement plan = affects IRA deduction!)"""
    
    # ════════════════════════════════════════════════════════
    # STANDARD DEDUCTION
    # ════════════════════════════════════════════════════════
    if "standard deduction" in q:
        if "single" in q:
            return f"2025 Standard Deduction for Single: ${TAX_VALUES_2025['standard_deduction']['single']:,}"
        if "married" in q and ("joint" in q or "mfj" in q):
            return f"2025 Standard Deduction for Married Filing Jointly: ${TAX_VALUES_2025['standard_deduction']['married_filing_jointly']:,}"
        if "head" in q or "hoh" in q:
            return f"2025 Standard Deduction for Head of Household: ${TAX_VALUES_2025['standard_deduction']['head_of_household']:,}"
        if "65" in q or "older" in q or "senior" in q:
            return f"Additional Standard Deduction for 65+: Single/HOH +${TAX_VALUES_2025['additional_standard_deduction']['single_or_hoh']:,}, Married +${TAX_VALUES_2025['additional_standard_deduction']['married']:,} per person."
        # General
        return f"""2025 Standard Deductions:
• Single: ${TAX_VALUES_2025['standard_deduction']['single']:,}
• Married Filing Jointly: ${TAX_VALUES_2025['standard_deduction']['married_filing_jointly']:,}
• Head of Household: ${TAX_VALUES_2025['standard_deduction']['head_of_household']:,}
• Additional for 65+/Blind: Single/HOH +${TAX_VALUES_2025['additional_standard_deduction']['single_or_hoh']:,}, Married +${TAX_VALUES_2025['additional_standard_deduction']['married']:,}"""
    
    # ════════════════════════════════════════════════════════
    # CHILD TAX CREDIT
    # ════════════════════════════════════════════════════════
    if "child tax credit" in q or "ctc" in q:
        return f"""2025 Child Tax Credit:
• ${TAX_VALUES_2025['child_tax_credit']:,} per qualifying child under 17
• Up to ${TAX_VALUES_2025['actc_max']:,} is refundable (ACTC)
• Phase-out: Single $200k, MFJ $400k

Requirements:
• Child must be under 17 at end of year
• Must have valid SSN
• Must live with you 6+ months
• You must provide over half of support"""
    
    # Other Dependents Credit
    if "other dependent" in q or "odc" in q or ("dependent" in q and "17" in q):
        return f"2025 Credit for Other Dependents: ${TAX_VALUES_2025['other_dependents_credit']} per dependent age 17 or older. Non-refundable."
    
    # EITC
    if "eitc" in q or "earned income" in q:
        return f"""2025 Earned Income Tax Credit (EITC):
• 0 children: max ${TAX_VALUES_2025['eitc_max'][0]:,}
• 1 child: max ${TAX_VALUES_2025['eitc_max'][1]:,}
• 2 children: max ${TAX_VALUES_2025['eitc_max'][2]:,}
• 3+ children: max ${TAX_VALUES_2025['eitc_max'][3]:,}

Fully refundable credit for low-to-moderate income workers."""
    
    # HSA
    if "hsa" in q:
        return f"""2025 HSA Contribution Limits:
• Self-only coverage: ${TAX_VALUES_2025['hsa_limit']['self']:,}
• Family coverage: ${TAX_VALUES_2025['hsa_limit']['family']:,}
• Catch-up (55+): +${TAX_VALUES_2025['hsa_limit']['catch_up_55']:,}

Triple tax benefit: Tax-deductible, tax-free growth, tax-free withdrawals for medical.

⚠️ California: HSA is NOT deductible for CA state tax!"""
    
    # Student loan
    if "student loan" in q:
        return f"2025 Student Loan Interest Deduction: Maximum ${TAX_VALUES_2025['student_loan_max']:,}. Phase-out: $80k-$95k single, $165k-$195k MFJ."
    
    # SALT
    if "salt" in q or ("state" in q and "local" in q and "tax" in q):
        return f"2025 SALT Deduction: Capped at ${TAX_VALUES_2025['salt_cap']:,} (${TAX_VALUES_2025['salt_cap']//2:,} if MFS). Includes state income tax + property tax."
    
    # Social Security
    if "social security" in q and ("max" in q or "limit" in q or "wage" in q):
        return f"""2025 Social Security:
• Wage base (max taxed): ${TAX_VALUES_2025['ss_wage_base']:,}
• Tax rate: {TAX_VALUES_2025['ss_rate']*100}%
• Max tax: ${TAX_VALUES_2025['ss_max_tax']:,.2f}"""
    
    # ════════════════════════════════════════════════════════
    # SEARCH RAG DOCUMENTS
    # ════════════════════════════════════════════════════════
    results = search_rag(question, state_code)
    
    # Return Q&A answer if found
    if results.get("qa_answer"):
        return results["qa_answer"]
    
    # Return state results if state-specific question
    if state_code and results.get("state"):
        return results["state"]
    
    # Return federal results
    if results.get("federal"):
        return results["federal"]
    
    return "Please ask about 401(k), IRA, standard deductions, tax brackets, credits (CTC, EITC), W-2 boxes, or specific state rules."


# ============================================================
# AI CONTEXT GENERATION
# ============================================================

def get_ai_context(state_code: Optional[str] = None, 
                   include_full: bool = False) -> str:
    """
    Get context string for AI prompts.
    
    Args:
        state_code: Optional state code
        include_full: If True, include full documents; otherwise just key facts
    
    Returns:
        Context string for AI prompt
    """
    parts = []
    
    if include_full:
        parts.append("=== FEDERAL TAX RULES 2025 ===\n" + load_federal_rag())
        if state_code:
            parts.append(f"\n=== {state_code.upper()} STATE RULES ===\n" + load_state_rag(state_code))
    else:
        # Key facts only (for shorter prompts)
        parts.append(f"""=== 2025 TAX KEY FACTS ===

STANDARD DEDUCTION:
• Single: ${TAX_VALUES_2025['standard_deduction']['single']:,}
• MFJ: ${TAX_VALUES_2025['standard_deduction']['married_filing_jointly']:,}
• HOH: ${TAX_VALUES_2025['standard_deduction']['head_of_household']:,}
• 65+ Additional: Single/HOH +${TAX_VALUES_2025['additional_standard_deduction']['single_or_hoh']:,}, Married +${TAX_VALUES_2025['additional_standard_deduction']['married']:,}

RETIREMENT:
• 401(k): ${TAX_VALUES_2025['401k_limit']['under_50']:,} (${TAX_VALUES_2025['401k_limit']['50_plus']:,} if 50+) - ALWAYS deductible, no income limit
• IRA: ${TAX_VALUES_2025['ira_limit']['under_50']:,} (${TAX_VALUES_2025['ira_limit']['50_plus']:,} if 50+)
• IRA deduction limit (with 401k): $79k-$89k single, $126k-$146k MFJ
• Roth IRA income limit: $150k-$165k single, $236k-$246k MFJ
• HSA: ${TAX_VALUES_2025['hsa_limit']['self']:,} (self) / ${TAX_VALUES_2025['hsa_limit']['family']:,} (family)

CREDITS:
• Child Tax Credit: ${TAX_VALUES_2025['child_tax_credit']:,} per child under 17
• ACTC (refundable): Up to ${TAX_VALUES_2025['actc_max']:,}
• Other Dependents: ${TAX_VALUES_2025['other_dependents_credit']} per dependent 17+
• Student Loan Interest: ${TAX_VALUES_2025['student_loan_max']:,} max

SOCIAL SECURITY:
• Wage base: ${TAX_VALUES_2025['ss_wage_base']:,}
• Tax rate: {TAX_VALUES_2025['ss_rate']*100}%
• Max tax: ${TAX_VALUES_2025['ss_max_tax']:,.2f}
""")
        
        if state_code:
            if state_code.upper() in NO_TAX_STATES:
                state_name = NO_TAX_STATES[state_code.upper()]
                parts.append(f"\n{state_name.upper()}: NO STATE INCOME TAX")
            else:
                state_content = load_state_rag(state_code)
                # Extract just the overview section
                overview_match = re.search(r'## OVERVIEW.*?(?=\n##|\Z)', state_content, re.DOTALL)
                if overview_match:
                    parts.append(f"\n=== {state_code.upper()} ===\n" + overview_match.group(0))
    
    return "\n".join(parts)


# ============================================================
# INITIALIZATION
# ============================================================

def initialize():
    """Pre-load documents on startup."""
    print("🔧 [RAG] Initializing Tax RAG Service v2.0...")
    
    # Load federal rules
    load_federal_rag()
    
    # Load available state rules
    available_states = get_available_states()
    print(f"📚 [RAG] Available states: {', '.join(available_states)}")
    
    print("✅ [RAG] Initialization complete")


# ============================================================
# MAIN (for testing)
# ============================================================

if __name__ == "__main__":
    print("=" * 60)
    print("TAX RAG SERVICE v2.0 - Test")
    print("=" * 60)
    
    initialize()
    
    # Test questions
    test_questions = [
        ("What is the 401k limit for 2025?", None),
        ("Can I deduct my IRA if I have a 401k?", None),
        ("What is the standard deduction for MFJ?", None),
        ("What is the child tax credit?", None),
        ("What is W-2 box 12 code D?", None),
        ("Does Texas have income tax?", "TX"),
        ("What is California's top tax rate?", "CA"),
        ("What are the Roth IRA income limits?", None),
        ("Traditional vs Roth IRA?", None),
    ]
    
    print("\n" + "=" * 60)
    print("TEST QUESTIONS")
    print("=" * 60)
    
    for question, state in test_questions:
        print(f"\n📝 Q: {question}")
        if state:
            print(f"   State: {state}")
        answer = answer_tax_question(question, state)
        print(f"   A: {answer[:300]}..." if len(answer) > 300 else f"   A: {answer}")
    
    # Test IRA decision logic
    print("\n" + "=" * 60)
    print("IRA DECISION TEST")
    print("=" * 60)
    
    # Test case: $109k income, single, has 401k
    print("\n📊 Test: $109,000 income, Single, has 401(k)")
    ira_result = can_deduct_traditional_ira(109000, "single", True)
    roth_result = can_contribute_roth_ira(109000, "single")
    print(f"   Traditional IRA: {ira_result}")
    print(f"   Roth IRA: {roth_result}")
    
    print("\n📊 Retirement Recommendation:")
    print(get_retirement_recommendation(109000, "single", True, 35))