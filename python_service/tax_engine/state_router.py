# tax_engine/state_router.py
# ============================================================
# STATE ROUTER - Validation + Calculation
# ============================================================
# Single source of truth for all state tax logic
# Node.js just calls Python API - no duplicate validation
# ============================================================

import importlib
from typing import Dict, Any, Optional, List

# ============================================================
# ALL 50 STATES + DC
# ============================================================
ALL_STATES = {
    "AL": {"name": "Alabama", "has_tax": True, "type": "progressive"},
    "AK": {"name": "Alaska", "has_tax": False, "type": "none"},
    "AZ": {"name": "Arizona", "has_tax": True, "type": "flat", "rate": 0.025},
    "AR": {"name": "Arkansas", "has_tax": True, "type": "progressive"},
    "CA": {"name": "California", "has_tax": True, "type": "progressive"},
    "CO": {"name": "Colorado", "has_tax": True, "type": "flat", "rate": 0.044},
    "CT": {"name": "Connecticut", "has_tax": True, "type": "progressive"},
    "DE": {"name": "Delaware", "has_tax": True, "type": "progressive"},
    "DC": {"name": "District of Columbia", "has_tax": True, "type": "progressive"},
    "FL": {"name": "Florida", "has_tax": False, "type": "none"},
    "GA": {"name": "Georgia", "has_tax": True, "type": "flat", "rate": 0.0539},
    "HI": {"name": "Hawaii", "has_tax": True, "type": "progressive"},
    "ID": {"name": "Idaho", "has_tax": True, "type": "flat", "rate": 0.058},
    "IL": {"name": "Illinois", "has_tax": True, "type": "flat", "rate": 0.0495},
    "IN": {"name": "Indiana", "has_tax": True, "type": "flat", "rate": 0.0305},
    "IA": {"name": "Iowa", "has_tax": True, "type": "flat", "rate": 0.038},
    "KS": {"name": "Kansas", "has_tax": True, "type": "progressive"},
    "KY": {"name": "Kentucky", "has_tax": True, "type": "flat", "rate": 0.04},
    "LA": {"name": "Louisiana", "has_tax": True, "type": "progressive"},
    "ME": {"name": "Maine", "has_tax": True, "type": "progressive"},
    "MD": {"name": "Maryland", "has_tax": True, "type": "progressive"},
    "MA": {"name": "Massachusetts", "has_tax": True, "type": "flat", "rate": 0.05},
    "MI": {"name": "Michigan", "has_tax": True, "type": "flat", "rate": 0.0425},
    "MN": {"name": "Minnesota", "has_tax": True, "type": "progressive"},
    "MS": {"name": "Mississippi", "has_tax": True, "type": "flat", "rate": 0.045},
    "MO": {"name": "Missouri", "has_tax": True, "type": "progressive"},
    "MT": {"name": "Montana", "has_tax": True, "type": "progressive"},
    "NE": {"name": "Nebraska", "has_tax": True, "type": "progressive"},
    "NV": {"name": "Nevada", "has_tax": False, "type": "none"},
    "NH": {"name": "New Hampshire", "has_tax": True, "type": "special", "note": "Interest/dividends only"},
    "NJ": {"name": "New Jersey", "has_tax": True, "type": "progressive"},
    "NM": {"name": "New Mexico", "has_tax": True, "type": "progressive"},
    "NY": {"name": "New York", "has_tax": True, "type": "progressive"},
    "NC": {"name": "North Carolina", "has_tax": True, "type": "flat", "rate": 0.045},
    "ND": {"name": "North Dakota", "has_tax": True, "type": "progressive"},
    "OH": {"name": "Ohio", "has_tax": True, "type": "progressive"},
    "OK": {"name": "Oklahoma", "has_tax": True, "type": "progressive"},
    "OR": {"name": "Oregon", "has_tax": True, "type": "progressive"},
    "PA": {"name": "Pennsylvania", "has_tax": True, "type": "flat", "rate": 0.0307},
    "RI": {"name": "Rhode Island", "has_tax": True, "type": "progressive"},
    "SC": {"name": "South Carolina", "has_tax": True, "type": "progressive"},
    "SD": {"name": "South Dakota", "has_tax": False, "type": "none"},
    "TN": {"name": "Tennessee", "has_tax": False, "type": "none"},
    "TX": {"name": "Texas", "has_tax": False, "type": "none"},
    "UT": {"name": "Utah", "has_tax": True, "type": "flat", "rate": 0.0465},
    "VT": {"name": "Vermont", "has_tax": True, "type": "progressive"},
    "VA": {"name": "Virginia", "has_tax": True, "type": "progressive"},
    "WA": {"name": "Washington", "has_tax": True, "type": "special", "note": "Capital gains only"},
    "WV": {"name": "West Virginia", "has_tax": True, "type": "progressive"},
    "WI": {"name": "Wisconsin", "has_tax": True, "type": "progressive"},
    "WY": {"name": "Wyoming", "has_tax": False, "type": "none"}
}

# States with no income tax
NO_TAX_STATES = ["AK", "FL", "NV", "SD", "TN", "TX", "WY"]

# ============================================================
# ✅ STATES WITH FULL CALCULATOR MODULE
# ============================================================
# Add state codes here as you build their calculators
FULLY_SUPPORTED_STATES = ["CA", "NY", "IL", "FL", "TX", "NJ"]  # ✅ UPDATED: Added NY, IL, FL, TX, NJ

# Cache for loaded modules
_state_modules: Dict[str, Any] = {}

# ============================================================
# DYNAMIC MODULE LOADER
# ============================================================
def load_state_module(state_code: str):
    """Dynamically load state module ONLY when needed"""
    state_code = state_code.upper()
    
    if state_code in _state_modules:
        return _state_modules[state_code]
    
    if state_code not in ALL_STATES:
        raise ValueError(f"Unknown state code: {state_code}")
    
    try:
        module = importlib.import_module(f"tax_engine.calculator.states.{state_code}")
        _state_modules[state_code] = module
        print(f"✅ Loaded state module: {state_code}")
        return module
    except ModuleNotFoundError:
        return None

# ============================================================
# ✅ STATE VALIDATION (Called by API before calculation)
# ============================================================
def validate_state_selection(state_code: str) -> Dict[str, Any]:
    """
    Validate if state is supported for tax calculation
    
    Returns:
        {
            "valid": True/False,
            "state": "CA",
            "state_name": "California",
            "support_level": "full" | "generic" | "no_tax" | "coming_soon",
            "message": "..."
        }
    """
    if not state_code:
        return {
            "valid": False,
            "error": "NO_STATE_CODE",
            "message": "Please select a state."
        }
    
    state_code = state_code.upper()
    
    # Check if valid state code
    if state_code not in ALL_STATES:
        return {
            "valid": False,
            "state": state_code,
            "support_level": "invalid",
            "error": "INVALID_STATE_CODE",
            "message": f"'{state_code}' is not a valid US state code."
        }
    
    state_info = ALL_STATES[state_code]
    
    # No income tax states - always valid
    if not state_info["has_tax"]:
        return {
            "valid": True,
            "state": state_code,
            "state_name": state_info["name"],
            "has_income_tax": False,
            "support_level": "no_tax",
            "message": f"✅ {state_info['name']} has no state income tax. You only need to file federal taxes!"
        }
    
    # Check if full calculator exists
    if state_code in FULLY_SUPPORTED_STATES:
        try:
            module = load_state_module(state_code)
            if module and hasattr(module, 'calculate'):
                return {
                    "valid": True,
                    "state": state_code,
                    "state_name": state_info["name"],
                    "has_income_tax": True,
                    "tax_type": state_info["type"],
                    "support_level": "full",
                    "message": f"✅ {state_info['name']} calculator ready!"
                }
        except Exception as e:
            print(f"⚠️ Error loading {state_code} module: {e}")
            # Fall through to generic or try anyway
    
    # Try to load module even if not in FULLY_SUPPORTED_STATES
    try:
        module = load_state_module(state_code)
        if module and hasattr(module, 'calculate'):
            return {
                "valid": True,
                "state": state_code,
                "state_name": state_info["name"],
                "has_income_tax": True,
                "tax_type": state_info["type"],
                "support_level": "full",
                "message": f"✅ {state_info['name']} calculator ready!"
            }
    except Exception:
        pass
    
    # Flat tax states - can use generic calculator
    if state_info["type"] == "flat" and "rate" in state_info:
        return {
            "valid": True,
            "state": state_code,
            "state_name": state_info["name"],
            "has_income_tax": True,
            "tax_type": "flat",
            "tax_rate": state_info["rate"],
            "support_level": "generic",
            "message": f"✅ {state_info['name']} uses {state_info['rate']*100:.2f}% flat tax."
        }
    
    # Progressive states without full module - NOT SUPPORTED YET
    return {
        "valid": False,
        "state": state_code,
        "state_name": state_info["name"],
        "has_income_tax": True,
        "tax_type": state_info["type"],
        "support_level": "coming_soon",
        "error": "STATE_NOT_SUPPORTED",
        "message": f"⚠️ {state_info['name']} calculator coming soon. Currently supported: CA, NY, IL."
    }


def get_supported_states_list() -> Dict[str, List[Dict]]:
    """Get categorized list of states"""
    full_support = []
    generic_support = []
    no_tax = []
    coming_soon = []
    
    for code, info in ALL_STATES.items():
        state_data = {
            "code": code,
            "name": info["name"],
            "type": info["type"],
            "rate": info.get("rate")
        }
        
        if not info["has_tax"]:
            no_tax.append(state_data)
        elif code in FULLY_SUPPORTED_STATES:
            full_support.append(state_data)
        elif info["type"] == "flat" and "rate" in info:
            generic_support.append(state_data)
        else:
            coming_soon.append(state_data)
    
    return {
        "full_support": sorted(full_support, key=lambda x: x["name"]),
        "generic_support": sorted(generic_support, key=lambda x: x["name"]),
        "no_tax": sorted(no_tax, key=lambda x: x["name"]),
        "coming_soon": sorted(coming_soon, key=lambda x: x["name"])
    }

# ============================================================
# GENERIC STATE CALCULATOR (for flat tax states)
# ============================================================
def calculate_generic_state(state_code: str, data: Dict[str, Any]) -> Dict[str, Any]:
    """Generic calculator for states without custom module"""
    state_info = ALL_STATES.get(state_code.upper())
    
    if not state_info:
        return {"error": f"Unknown state: {state_code}", "valid": False}
    
    # No tax states
    if not state_info["has_tax"]:
        return {
            "state": state_code,
            "state_name": state_info["name"],
            "has_income_tax": False,
            "total_tax": 0,
            "refund": 0,
            "amount_owed": 0,
            "message": f"{state_info['name']} has no state income tax."
        }
    
    # Flat tax states
    if state_info["type"] == "flat" and "rate" in state_info:
        federal_agi = data.get("federal_agi") or data.get("agi") or 0
        rate = state_info["rate"]
        
        state_tax = federal_agi * rate
        withholding = data.get("state_withholding") or 0
        balance = withholding - state_tax
        
        return {
            "state": state_code,
            "state_name": state_info["name"],
            "has_income_tax": True,
            "tax_type": "flat",
            "tax_rate": rate,
            "federal_agi": round(federal_agi, 2),
            "taxable_income": round(federal_agi, 2),
            "total_tax": round(state_tax, 2),
            "withholding": round(withholding, 2),
            "refund": round(max(0, balance), 2),
            "amount_owed": round(max(0, -balance), 2)
        }
    
    # Progressive states without module
    return {
        "state": state_code,
        "state_name": state_info["name"],
        "has_income_tax": True,
        "tax_type": state_info["type"],
        "error": "STATE_NOT_SUPPORTED",
        "message": f"{state_info['name']} calculator coming soon."
    }

# ============================================================
# ✅ MAIN ROUTER FUNCTION (with validation)
# ============================================================
def calculate_state_tax(state_code: str, data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Main entry point - validates and calculates state tax
    
    1. Validates state is supported
    2. Loads state module if available
    3. Falls back to generic calculator
    """
    state_code = state_code.upper()
    
    print(f"\n{'='*50}")
    print(f"🗺️  STATE ROUTER: {state_code}")
    print(f"   AGI: ${data.get('federal_agi', 0):,}")
    
    # First validate
    validation = validate_state_selection(state_code)
    print(f"   Validation: {validation.get('support_level')}")
    
    # No tax states - return early
    if validation.get("has_income_tax") == False:
        print(f"✅ {state_code} has no income tax!")
        return {
            "state": state_code,
            "state_name": validation.get("state_name"),
            "has_income_tax": False,
            "support_level": "no_tax",
            "total_tax": 0,
            "refund": 0,
            "amount_owed": 0,
            "message": f"{validation.get('state_name')} has no state income tax!"
        }
    
    # If not valid and not generic, return error
    if not validation.get("valid") and validation.get("support_level") not in ["generic"]:
        print(f"❌ {state_code} not supported")
        return {
            "state": state_code,
            "state_name": validation.get("state_name"),
            "error": validation.get("error"),
            "message": validation.get("message"),
            "support_level": validation.get("support_level"),
            "valid": False
        }
    
    # Try to load state-specific module
    module = load_state_module(state_code)
    
    if module and hasattr(module, 'calculate'):
        print(f"✅ Using {state_code}.py calculator")
        result = module.calculate(data)
        result["support_level"] = "full"
        result["has_income_tax"] = True
        print(f"   Total Tax: ${result.get('total_tax', 0):,.2f}")
        print(f"   Refund: ${result.get('refund', 0):,.2f}")
        return result
    else:
        print(f"⚠️ Using generic calculator for {state_code}")
        result = calculate_generic_state(state_code, data)
        result["support_level"] = validation.get("support_level", "generic")
        return result

# ============================================================
# RAG FUNCTIONS
# ============================================================
def get_state_rag_context(state_code: str) -> str:
    """Get RAG knowledge base for a specific state"""
    module = load_state_module(state_code.upper())
    
    if module and hasattr(module, 'get_rag_context'):
        return module.get_rag_context()
    
    state_info = ALL_STATES.get(state_code.upper(), {})
    if not state_info.get("has_tax"):
        return f"{state_info.get('name', state_code)} has no state income tax."
    
    if state_info.get("type") == "flat":
        return f"{state_info.get('name', state_code)} has a flat {state_info.get('rate', 0)*100}% income tax."
    
    return f"{state_info.get('name', state_code)} has {state_info.get('type', 'unknown')} income tax."

def answer_state_question(state_code: str, question: str) -> str:
    """Answer a state-specific tax question"""
    module = load_state_module(state_code.upper())
    
    if module and hasattr(module, 'answer_question'):
        return module.answer_question(question)
    
    return f"Detailed tax rules for {state_code} coming soon."

# ============================================================
# UTILITY FUNCTIONS
# ============================================================
def get_all_states() -> List[Dict[str, Any]]:
    """Get list of all states with basic info"""
    return [
        {
            "code": code,
            "name": info["name"],
            "has_tax": info["has_tax"],
            "type": info["type"],
            "rate": info.get("rate"),
            "supported": code in FULLY_SUPPORTED_STATES or not info["has_tax"] or (info["type"] == "flat" and "rate" in info)
        }
        for code, info in sorted(ALL_STATES.items(), key=lambda x: x[1]["name"])
    ]

def get_states_without_tax() -> List[str]:
    """Get list of states with no income tax"""
    return NO_TAX_STATES

def get_state_info(state_code: str) -> Optional[Dict[str, Any]]:
    """Get info for a specific state"""
    state_code = state_code.upper()
    if state_code not in ALL_STATES:
        return None
    
    info = ALL_STATES[state_code].copy()
    info["code"] = state_code
    info["fully_supported"] = state_code in FULLY_SUPPORTED_STATES
    
    return info

def is_valid_state(state_code: str) -> bool:
    """Check if state code is valid"""
    return state_code.upper() in ALL_STATES

def is_supported_state(state_code: str) -> bool:
    """Check if state has calculator support"""
    state_code = state_code.upper()
    if state_code not in ALL_STATES:
        return False
    
    info = ALL_STATES[state_code]
    
    # No tax = supported
    if not info["has_tax"]:
        return True
    
    # Full support
    if state_code in FULLY_SUPPORTED_STATES:
        return True
    
    # Generic flat tax
    if info["type"] == "flat" and "rate" in info:
        return True
    
    return False