# tax_engine/state_router.py
# ============================================================
# STATE TAX ROUTER - TaxSky 2025 v2.0
# ============================================================
# Routes tax calculations to the correct state module
# Supports 7 tax states + 9 no-tax states
# ============================================================

from typing import Dict, Any, List, Optional

# ============================================================
# STATE CONFIGURATION
# ============================================================

# States with income tax (PDF generation available)
TAX_STATES = {
    "CA": {
        "name": "California",
        "full_name": "State of California",
        "tax_type": "progressive",
        "top_rate": 0.133,
        "top_rate_display": "13.3%",
        "form": "540",
        "form_name": "California Resident Income Tax Return",
        "supported": True,
        "has_local": False,
        "notes": "Highest state tax rate in the nation"
    },
    "NY": {
        "name": "New York",
        "full_name": "State of New York",
        "tax_type": "progressive",
        "top_rate": 0.109,
        "top_rate_display": "10.9%",
        "form": "IT-201",
        "form_name": "Resident Income Tax Return",
        "supported": True,
        "has_local": True,
        "notes": "NYC residents pay additional 3.078%-3.876%"
    },
    "IL": {
        "name": "Illinois",
        "full_name": "State of Illinois",
        "tax_type": "flat",
        "rate": 0.0495,
        "rate_display": "4.95%",
        "form": "IL-1040",
        "form_name": "Individual Income Tax Return",
        "supported": True,
        "has_local": False,
        "notes": "Flat tax, retirement income exempt"
    },
    "NJ": {
        "name": "New Jersey",
        "full_name": "State of New Jersey",
        "tax_type": "progressive",
        "top_rate": 0.1075,
        "top_rate_display": "10.75%",
        "form": "NJ-1040",
        "form_name": "Resident Income Tax Return",
        "supported": True,
        "has_local": False,
        "notes": "High tax state, millionaire's tax"
    },
    "PA": {
        "name": "Pennsylvania",
        "full_name": "Commonwealth of Pennsylvania",
        "tax_type": "flat",
        "rate": 0.0307,
        "rate_display": "3.07%",
        "form": "PA-40",
        "form_name": "Personal Income Tax Return",
        "supported": True,
        "has_local": True,
        "notes": "Lowest flat rate, local EIT applies"
    },
    "GA": {
        "name": "Georgia",
        "full_name": "State of Georgia",
        "tax_type": "flat",
        "rate": 0.0549,
        "rate_display": "5.49%",
        "form": "500",
        "form_name": "Individual Income Tax Return",
        "supported": True,
        "has_local": False,
        "notes": "Switched to flat tax in 2024"
    },
    "NC": {
        "name": "North Carolina",
        "full_name": "State of North Carolina",
        "tax_type": "flat",
        "rate": 0.045,
        "rate_display": "4.5%",
        "form": "D-400",
        "form_name": "Individual Income Tax Return",
        "supported": True,
        "has_local": False,
        "notes": "Rate decreased from 4.75% in 2024"
    },
}

# States without income tax
NO_TAX_STATES = {
    "AK": {"name": "Alaska", "notes": "No state income tax"},
    "FL": {"name": "Florida", "notes": "No state income tax, constitutionally prohibited"},
    "NV": {"name": "Nevada", "notes": "No state income tax"},
    "NH": {"name": "New Hampshire", "notes": "No state income tax (interest/dividend tax ended 2025)"},
    "SD": {"name": "South Dakota", "notes": "No state income tax"},
    "TN": {"name": "Tennessee", "notes": "No state income tax (Hall tax ended 2021)"},
    "TX": {"name": "Texas", "notes": "No state income tax, constitutionally prohibited"},
    "WA": {"name": "Washington", "notes": "No income tax, but has capital gains tax"},
    "WY": {"name": "Wyoming", "notes": "No state income tax"},
}

# All 50 states + DC for validation
ALL_STATE_CODES = [
    "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "DC", "FL",
    "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME",
    "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH",
    "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI",
    "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
]

# ============================================================
# IMPORT STATE CALCULATORS
# ============================================================

# Try to import from states package
try:
    from states import (
        CA, NY, IL, NJ, PA, GA, NC, FL, TX,
        calculate_state_tax as _calculate_state_tax
    )
    STATES_PACKAGE_AVAILABLE = True
except ImportError:
    STATES_PACKAGE_AVAILABLE = False
    # Define fallback calculators
    CA = NY = IL = NJ = PA = GA = NC = FL = TX = None

# ============================================================
# VALIDATION FUNCTIONS
# ============================================================

def validate_state_selection(state_code: str) -> Dict[str, Any]:
    """
    Validate a state selection and return info
    
    Returns:
        {
            "valid": bool,
            "state": str,
            "state_name": str,
            "has_income_tax": bool,
            "supported": bool,
            "tax_type": str,
            "rate": str,
            "form": str,
            "message": str
        }
    """
    state_code = state_code.upper().strip()
    
    # Check if valid state code
    if state_code not in ALL_STATE_CODES:
        return {
            "valid": False,
            "state": state_code,
            "error": f"'{state_code}' is not a valid US state code",
            "message": "Please enter a valid 2-letter state code (e.g., CA, NY, TX)"
        }
    
    # No-tax state
    if state_code in NO_TAX_STATES:
        info = NO_TAX_STATES[state_code]
        return {
            "valid": True,
            "state": state_code,
            "state_name": info["name"],
            "has_income_tax": False,
            "supported": True,
            "tax_type": "none",
            "rate": "0%",
            "form": None,
            "message": f"Great news! {info['name']} has no state income tax. You only need to file federal."
        }
    
    # Tax state - supported
    if state_code in TAX_STATES:
        info = TAX_STATES[state_code]
        rate = info.get("rate_display") or info.get("top_rate_display", "varies")
        return {
            "valid": True,
            "state": state_code,
            "state_name": info["name"],
            "has_income_tax": True,
            "supported": info["supported"],
            "tax_type": info["tax_type"],
            "rate": rate,
            "form": info["form"],
            "form_name": info.get("form_name"),
            "has_local_tax": info.get("has_local", False),
            "notes": info.get("notes"),
            "message": f"{info['name']} - {info['tax_type'].title()} tax, {rate}"
        }
    
    # Tax state - not yet supported
    return {
        "valid": True,
        "state": state_code,
        "state_name": state_code,  # We don't have full name
        "has_income_tax": True,
        "supported": False,
        "tax_type": "unknown",
        "rate": "varies",
        "form": None,
        "message": f"{state_code} is not yet fully supported. Tax calculation available, PDF generation coming soon."
    }


def is_supported_state(state_code: str) -> bool:
    """Check if state is fully supported (PDF generation)"""
    state_code = state_code.upper()
    return state_code in TAX_STATES or state_code in NO_TAX_STATES


def is_no_tax_state(state_code: str) -> bool:
    """Check if state has no income tax"""
    return state_code.upper() in NO_TAX_STATES


def get_state_info(state_code: str) -> Dict[str, Any]:
    """Get detailed info about a state"""
    state_code = state_code.upper()
    
    if state_code in NO_TAX_STATES:
        info = NO_TAX_STATES[state_code]
        return {
            "state": state_code,
            "name": info["name"],
            "has_income_tax": False,
            "tax_type": "none",
            "rate": "0%",
            "notes": info["notes"]
        }
    
    if state_code in TAX_STATES:
        info = TAX_STATES[state_code]
        return {
            "state": state_code,
            "name": info["name"],
            "full_name": info["full_name"],
            "has_income_tax": True,
            "tax_type": info["tax_type"],
            "rate": info.get("rate_display") or info.get("top_rate_display"),
            "form": info["form"],
            "form_name": info.get("form_name"),
            "has_local_tax": info.get("has_local", False),
            "supported": info["supported"],
            "notes": info.get("notes")
        }
    
    return {
        "state": state_code,
        "name": state_code,
        "has_income_tax": True,
        "supported": False,
        "notes": "State not yet fully supported"
    }


def get_all_states() -> List[Dict[str, Any]]:
    """Get list of all states with support status"""
    states = []
    
    # Add tax states
    for code, info in TAX_STATES.items():
        states.append({
            "code": code,
            "name": info["name"],
            "has_income_tax": True,
            "tax_type": info["tax_type"],
            "rate": info.get("rate_display") or info.get("top_rate_display"),
            "form": info["form"],
            "supported": info["supported"],
            "pdf_available": info["supported"]
        })
    
    # Add no-tax states
    for code, info in NO_TAX_STATES.items():
        states.append({
            "code": code,
            "name": info["name"],
            "has_income_tax": False,
            "tax_type": "none",
            "rate": "0%",
            "form": None,
            "supported": True,
            "pdf_available": False  # No PDF needed
        })
    
    # Sort by name
    states.sort(key=lambda x: x["name"])
    
    return states


def get_supported_states() -> List[str]:
    """Get list of supported state codes"""
    return list(TAX_STATES.keys()) + list(NO_TAX_STATES.keys())


def get_tax_states() -> List[str]:
    """Get list of states with income tax"""
    return list(TAX_STATES.keys())


def get_no_tax_states() -> List[str]:
    """Get list of states with no income tax"""
    return list(NO_TAX_STATES.keys())


# ============================================================
# TAX CALCULATION ROUTER
# ============================================================

def calculate_state_tax(state_code: str, data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Route to correct state calculator
    
    Args:
        state_code: Two-letter state code
        data: Tax data dictionary with:
            - filing_status
            - federal_agi (or agi)
            - wages
            - state_withholding
            - etc.
    
    Returns:
        State tax calculation result
    """
    state_code = state_code.upper()
    
    # No-tax states
    if state_code in NO_TAX_STATES:
        info = NO_TAX_STATES[state_code]
        return {
            "state": state_code,
            "state_name": info["name"],
            "has_income_tax": False,
            "tax_type": "none",
            "taxable_income": 0,
            "state_tax": 0,
            "total_tax": 0,
            "withholding": data.get("state_withholding", 0),
            "refund": data.get("state_withholding", 0),  # All withholding is refunded
            "amount_owed": 0,
            "effective_rate": 0,
            "notes": f"{info['name']} has no state income tax. No state return required."
        }
    
    # Use states package if available
    if STATES_PACKAGE_AVAILABLE:
        try:
            return _calculate_state_tax(state_code, data)
        except Exception as e:
            return {
                "state": state_code,
                "error": str(e),
                "success": False
            }
    
    # Fallback: Try direct import
    try:
        if state_code == "CA" and CA:
            return CA.calculate(data)
        elif state_code == "NY" and NY:
            return NY.calculate(data)
        elif state_code == "IL" and IL:
            return IL.calculate(data)
        elif state_code == "NJ" and NJ:
            return NJ.calculate(data)
        elif state_code == "PA" and PA:
            return PA.calculate(data)
        elif state_code == "GA" and GA:
            return GA.calculate(data)
        elif state_code == "NC" and NC:
            return NC.calculate(data)
        elif state_code == "FL" and FL:
            return FL.calculate(data)
        elif state_code == "TX" and TX:
            return TX.calculate(data)
    except Exception as e:
        return {
            "state": state_code,
            "error": str(e),
            "success": False
        }
    
    # State not supported
    return {
        "state": state_code,
        "supported": False,
        "error": f"State {state_code} calculator not yet implemented",
        "message": "Please check back soon - we're adding more states!",
        "supported_states": get_supported_states()
    }


# ============================================================
# RAG FUNCTIONS
# ============================================================

def get_state_rag_context(state_code: str) -> Optional[str]:
    """Get RAG knowledge context for a state"""
    state_code = state_code.upper()
    
    if STATES_PACKAGE_AVAILABLE:
        try:
            from states import get_rag_context
            return get_rag_context(state_code)
        except:
            pass
    
    # Fallback: Try direct access
    modules = {"CA": CA, "NY": NY, "IL": IL, "NJ": NJ, "PA": PA, "GA": GA, "NC": NC, "FL": FL, "TX": TX}
    module = modules.get(state_code)
    
    if module and hasattr(module, 'get_rag_context'):
        return module.get_rag_context()
    
    return None


def answer_state_question(state_code: str, question: str) -> str:
    """Answer a state-specific tax question"""
    state_code = state_code.upper()
    
    if STATES_PACKAGE_AVAILABLE:
        try:
            from states import answer_state_question as _answer
            return _answer(state_code, question)
        except:
            pass
    
    # Fallback: Try direct access
    modules = {"CA": CA, "NY": NY, "IL": IL, "NJ": NJ, "PA": PA, "GA": GA, "NC": NC, "FL": FL, "TX": TX}
    module = modules.get(state_code)
    
    if module and hasattr(module, 'answer_question'):
        return module.answer_question(question)
    
    if state_code in NO_TAX_STATES:
        return f"{NO_TAX_STATES[state_code]['name']} has no state income tax."
    
    return f"State {state_code} Q&A not yet available."


# ============================================================
# EXPORTS
# ============================================================
__all__ = [
    # Validation
    'validate_state_selection',
    'is_supported_state',
    'is_no_tax_state',
    'get_state_info',
    'get_all_states',
    'get_supported_states',
    'get_tax_states',
    'get_no_tax_states',
    
    # Calculation
    'calculate_state_tax',
    
    # RAG
    'get_state_rag_context',
    'answer_state_question',
    
    # Constants
    'TAX_STATES',
    'NO_TAX_STATES',
    'ALL_STATE_CODES',
]