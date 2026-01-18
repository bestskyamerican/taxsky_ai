# ============================================================
# RAG SERVICE - Tax Knowledge Retrieval
# ============================================================
# File: python_tax_api/rag/rag_service.py
#
# FEATURES:
# 1. Load tax rules from markdown files
# 2. Keyword search (fast, no dependencies)
# 3. ChromaDB vector search (optional, better accuracy)
# 4. Q&A extraction from documents
# ============================================================

import os
import re
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
_state_rags: Dict[str, str] = {}
_qa_cache: Dict[str, List[Tuple[str, str]]] = {}

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
# CORRECT 2025 TAX VALUES (IRS Rev. Proc. 2024-40)
# ============================================================
TAX_VALUES_2025 = {
    "standard_deduction": {
        "single": 14800,
        "married_filing_jointly": 29600,
        "married_filing_separately": 14800,
        "head_of_household": 22200,
        "qualifying_surviving_spouse": 29600
    },
    "additional_standard_deduction": {
        "single_or_hoh": 1850,
        "married": 1500
    },
    "child_tax_credit": 2000,
    "actc_max": 1700,
    "other_dependents_credit": 500,
    "eitc_max": {0: 649, 1: 4328, 2: 7152, 3: 8046},
    "ira_limit": {"under_50": 7000, "over_50": 8000},
    "hsa_limit": {"self": 4300, "family": 8550},
    "student_loan_max": 2500
}

# ============================================================
# DOCUMENT LOADING
# ============================================================

def load_federal_rag() -> str:
    """Load federal tax rules document."""
    global _federal_rag
    if _federal_rag is None:
        rag_file = FEDERAL_RAG_PATH / "rules_2025.md"
        if rag_file.exists():
            _federal_rag = rag_file.read_text(encoding="utf-8")
            print(f"✅ [RAG] Loaded federal rules: {rag_file}")
        else:
            print(f"⚠️ [RAG] Federal rules not found: {rag_file}")
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

## IRA LIMITS
- Under 50: ${TAX_VALUES_2025['ira_limit']['under_50']:,}
- 50+: ${TAX_VALUES_2025['ira_limit']['over_50']:,}
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
# SEARCH FUNCTIONS
# ============================================================

def search_rag(query: str, state_code: Optional[str] = None, top_k: int = 3) -> Dict[str, str]:
    """
    Search RAG documents for relevant content.
    
    Args:
        query: Search query
        state_code: Optional state code (e.g., "CA", "TX")
        top_k: Number of sections to return
    
    Returns:
        Dict with 'federal' and 'state' content
    """
    results = {"federal": "", "state": "", "qa_answer": None}
    query_lower = query.lower()
    
    # Try Q&A first
    qa_answer = find_qa_answer(query, state_code)
    if qa_answer:
        results["qa_answer"] = qa_answer
    
    # Search federal content
    federal_content = load_federal_rag()
    results["federal"] = _extract_relevant_sections(federal_content, query_lower, top_k)
    
    # Search state content if provided
    if state_code:
        state_content = load_state_rag(state_code)
        results["state"] = _extract_relevant_sections(state_content, query_lower, top_k)
    
    return results


def _extract_relevant_sections(content: str, query: str, top_k: int = 3) -> str:
    """Extract most relevant sections from document."""
    # Extract keywords from query (ignore common words)
    stop_words = {'the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'for', 'to', 'in', 'of', 'what', 'how', 'much', 'are', 'do', 'does', 'can', 'my', 'i'}
    keywords = [w for w in re.findall(r'\w+', query.lower()) if len(w) > 2 and w not in stop_words]
    
    # Split content into sections (by ## headers)
    sections = re.split(r'\n(?=##)', content)
    
    # Score each section
    scored_sections = []
    for section in sections:
        section_lower = section.lower()
        score = 0
        
        for kw in keywords:
            # Exact word match
            if re.search(r'\b' + re.escape(kw) + r'\b', section_lower):
                score += 2
            # Partial match
            elif kw in section_lower:
                score += 1
        
        # Boost for header matches
        header_match = re.match(r'##\s*(.+)', section)
        if header_match:
            header = header_match.group(1).lower()
            for kw in keywords:
                if kw in header:
                    score += 3
        
        if score > 0:
            scored_sections.append((score, section.strip()))
    
    # Sort by score and return top_k
    scored_sections.sort(key=lambda x: x[0], reverse=True)
    relevant = [s[1] for s in scored_sections[:top_k]]
    
    return "\n\n---\n\n".join(relevant) if relevant else ""


# ============================================================
# DIRECT ANSWER FUNCTIONS
# ============================================================

def get_standard_deduction(filing_status: str, age_65_plus: bool = False, 
                           blind: bool = False, spouse_65_plus: bool = False,
                           spouse_blind: bool = False) -> int:
    """Get standard deduction for filing status and conditions."""
    status_key = filing_status.lower().replace(" ", "_")
    
    base = TAX_VALUES_2025["standard_deduction"].get(status_key, 14800)
    
    # Additional deductions
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


# def answer_tax_question(question: str, state_code: Optional[str] = None) -> str:
def answer_tax_question(question: str, state_code: Optional[str] = None, language: str = "en") -> str:
    """
    Answer a tax question using RAG.
    
    Args:
        question: User's question
        state_code: Optional state code
    
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
    
    # Standard deduction questions
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
    
    # Child Tax Credit
    if "child tax credit" in q or "ctc" in q:
        return f"2025 Child Tax Credit: ${TAX_VALUES_2025['child_tax_credit']:,} per qualifying child under 17. Up to ${TAX_VALUES_2025['actc_max']:,} is refundable as Additional Child Tax Credit (ACTC)."
    
    # Other Dependents Credit
    if "other dependent" in q or "odc" in q or ("dependent" in q and "17" in q):
        return f"2025 Credit for Other Dependents: ${TAX_VALUES_2025['other_dependents_credit']} per dependent age 17 or older. Non-refundable."
    
    # EITC
    if "eitc" in q or "earned income" in q:
        return f"""2025 Earned Income Tax Credit (EITC):
• 0 children: max ${TAX_VALUES_2025['eitc_max'][0]:,}
• 1 child: max ${TAX_VALUES_2025['eitc_max'][1]:,}
• 2 children: max ${TAX_VALUES_2025['eitc_max'][2]:,}
• 3+ children: max ${TAX_VALUES_2025['eitc_max'][3]:,}"""
    
    # IRA
    if "ira" in q:
        return f"2025 IRA Contribution Limits: ${TAX_VALUES_2025['ira_limit']['under_50']:,} (under 50) or ${TAX_VALUES_2025['ira_limit']['over_50']:,} (50+) per person."
    
    # HSA
    if "hsa" in q:
        return f"2025 HSA Contribution Limits: ${TAX_VALUES_2025['hsa_limit']['self']:,} (self-only) or ${TAX_VALUES_2025['hsa_limit']['family']:,} (family)."
    
    # Student loan
    if "student loan" in q:
        return f"2025 Student Loan Interest Deduction: Maximum ${TAX_VALUES_2025['student_loan_max']:,}."
    
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
    
    return "Please ask about standard deductions, tax brackets, credits (CTC, EITC), or specific state rules."


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

CREDITS:
• Child Tax Credit: ${TAX_VALUES_2025['child_tax_credit']:,} per child under 17
• ACTC (refundable): Up to ${TAX_VALUES_2025['actc_max']:,}
• Other Dependents: ${TAX_VALUES_2025['other_dependents_credit']} per dependent 17+

ADJUSTMENTS:
• IRA: ${TAX_VALUES_2025['ira_limit']['under_50']:,} (under 50) / ${TAX_VALUES_2025['ira_limit']['over_50']:,} (50+)
• HSA: ${TAX_VALUES_2025['hsa_limit']['self']:,} (self) / ${TAX_VALUES_2025['hsa_limit']['family']:,} (family)
• Student Loan Interest: ${TAX_VALUES_2025['student_loan_max']:,} max
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
    print("🔧 [RAG] Initializing Tax RAG Service...")
    
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
    print("TAX RAG SERVICE - Test")
    print("=" * 60)
    
    initialize()
    
    # Test questions
    test_questions = [
        ("What is the standard deduction for MFJ?", None),
        ("What is the child tax credit?", None),
        ("Does Texas have income tax?", "TX"),
        ("What is California's top tax rate?", "CA"),
        ("What are the IRA limits for 2025?", None),
        ("How much is the EITC with 2 children?", None),
    ]
    
    print("\n" + "=" * 60)
    print("TEST QUESTIONS")
    print("=" * 60)
    
    for question, state in test_questions:
        print(f"\n📝 Q: {question}")
        if state:
            print(f"   State: {state}")
        answer = answer_tax_question(question, state)
        print(f"   A: {answer[:200]}..." if len(answer) > 200 else f"   A: {answer}")