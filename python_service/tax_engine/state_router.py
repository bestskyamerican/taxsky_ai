# tax_engine/state_router.py
# ============================================================
# STATE TAX ROUTER - TaxSky 2025 v2.3 ALL 50 STATES
# ============================================================
# Routes tax calculations to the correct state module
# ✅ v2.3: Dynamic import of ALL state modules (AL, AR, AZ, CA, etc.)
# ✅ v2.2: Added generic calculator fallback
# ✅ v2.1: Fixed import path from 'states' to '.calculator.states'
# Supports ALL 50 states + DC
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
# IMPORT STATE CALCULATORS - ALL 41 TAX STATES
# ============================================================

# Initialize all modules as None
AL = AR = AZ = CA = CO = CT = DC = DE = FL = GA = None
HI = IA = ID = IL = IN = KS = KY = LA = MA = MD = None
ME = MI = MN = MO = MS = MT = NC = ND = NE = NH = None
NJ = NM = NY = OH = OK = OR = PA = RI = SC = SD = None
TN = TX = UT = VA = VT = WA = WI = WV = WY = None

STATES_PACKAGE_AVAILABLE = False
LOADED_STATES = []

# Import each state module
def try_import_state(state_code):
    """Try to import a state module"""
    try:
        module = __import__(f"tax_engine.calculator.states.{state_code}", fromlist=[state_code])
        if hasattr(module, 'calculate'):
            print(f"✅ {state_code}.py loaded")
            return module
    except ImportError:
        pass
    try:
        # Try relative import
        from importlib import import_module
        module = import_module(f".calculator.states.{state_code}", "tax_engine")
        if hasattr(module, 'calculate'):
            print(f"✅ {state_code}.py loaded (relative)")
            return module
    except ImportError:
        pass
    return None

# Load all states
AL = try_import_state("AL")
AR = try_import_state("AR")
AZ = try_import_state("AZ")
CA = try_import_state("CA")
CO = try_import_state("CO")
CT = try_import_state("CT")
DC = try_import_state("DC")
DE = try_import_state("DE")
FL = try_import_state("FL")
GA = try_import_state("GA")
HI = try_import_state("HI")
IA = try_import_state("IA")
ID = try_import_state("ID")
IL = try_import_state("IL")
IN = try_import_state("IN")
KS = try_import_state("KS")
KY = try_import_state("KY")
LA = try_import_state("LA")
MA = try_import_state("MA")
MD = try_import_state("MD")
ME = try_import_state("ME")
MI = try_import_state("MI")
MN = try_import_state("MN")
MO = try_import_state("MO")
MS = try_import_state("MS")
MT = try_import_state("MT")
NC = try_import_state("NC")
ND = try_import_state("ND")
NE = try_import_state("NE")
NJ = try_import_state("NJ")
NM = try_import_state("NM")
NY = try_import_state("NY")
OH = try_import_state("OH")
OK = try_import_state("OK")
OR = try_import_state("OR")
PA = try_import_state("PA")
RI = try_import_state("RI")
SC = try_import_state("SC")
UT = try_import_state("UT")
VA = try_import_state("VA")
VT = try_import_state("VT")
WI = try_import_state("WI")
WV = try_import_state("WV")

# Build loaded states list
STATE_MODULES = {
    "AL": AL, "AR": AR, "AZ": AZ, "CA": CA, "CO": CO, "CT": CT, "DC": DC, "DE": DE,
    "FL": FL, "GA": GA, "HI": HI, "IA": IA, "ID": ID, "IL": IL, "IN": IN, "KS": KS,
    "KY": KY, "LA": LA, "MA": MA, "MD": MD, "ME": ME, "MI": MI, "MN": MN, "MO": MO,
    "MS": MS, "MT": MT, "NC": NC, "ND": ND, "NE": NE, "NJ": NJ, "NM": NM, "NY": NY,
    "OH": OH, "OK": OK, "OR": OR, "PA": PA, "RI": RI, "SC": SC, "UT": UT, "VA": VA,
    "VT": VT, "WI": WI, "WV": WV
}

LOADED_STATES = [code for code, module in STATE_MODULES.items() if module is not None]
STATES_PACKAGE_AVAILABLE = len(LOADED_STATES) > 0
print(f"✅ Loaded {len(LOADED_STATES)} state calculators: {', '.join(LOADED_STATES)}")

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
            "standard_deduction": 0,
            "withholding": data.get("state_withholding", 0),
            "refund": data.get("state_withholding", 0),  # All withholding is refunded
            "amount_owed": 0,
            "effective_rate": 0,
            "notes": f"{info['name']} has no state income tax. No state return required."
        }
    
    # Try state-specific module from STATE_MODULES
    module = STATE_MODULES.get(state_code)
    if module and hasattr(module, 'calculate'):
        try:
            result = module.calculate(data)
            result["support_level"] = "full"
            return result
        except Exception as e:
            print(f"⚠️ {state_code} calculator error: {e}")
            # Fall through to generic calculator
    
    # ============================================================
    # GENERIC CALCULATOR FALLBACK - ALL 41 TAX STATES
    # ============================================================
    return calculate_generic_state(state_code, data)


def calculate_generic_state(state_code: str, data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Generic state tax calculator for states without dedicated modules.
    Supports flat tax and progressive tax states.
    """
    # State tax info (flat tax rates and standard deductions)
    GENERIC_STATE_INFO = {
        # Flat tax states
        "AZ": {"name": "Arizona", "type": "flat", "rate": 0.025, "std_single": 14600, "std_mfj": 29200},
        "CO": {"name": "Colorado", "type": "flat", "rate": 0.044, "std_single": 0, "std_mfj": 0, "uses_federal_taxable": True},
        "GA": {"name": "Georgia", "type": "flat", "rate": 0.0549, "std_single": 12000, "std_mfj": 24000},
        "ID": {"name": "Idaho", "type": "flat", "rate": 0.058, "std_single": 14600, "std_mfj": 29200},
        "IL": {"name": "Illinois", "type": "flat", "rate": 0.0495, "std_single": 0, "std_mfj": 0, "exemption": 2775},
        "IN": {"name": "Indiana", "type": "flat", "rate": 0.0305, "std_single": 0, "std_mfj": 0, "exemption": 1000},
        "IA": {"name": "Iowa", "type": "flat", "rate": 0.038, "std_single": 0, "std_mfj": 0},
        "KY": {"name": "Kentucky", "type": "flat", "rate": 0.04, "std_single": 3160, "std_mfj": 6320},
        "MA": {"name": "Massachusetts", "type": "flat", "rate": 0.05, "std_single": 0, "std_mfj": 0, "exemption": 4400},
        "MI": {"name": "Michigan", "type": "flat", "rate": 0.0425, "std_single": 0, "std_mfj": 0, "exemption": 5600},
        "MS": {"name": "Mississippi", "type": "flat", "rate": 0.047, "std_single": 2300, "std_mfj": 4600, "exempt_amount": 10000},
        "NC": {"name": "North Carolina", "type": "flat", "rate": 0.045, "std_single": 13500, "std_mfj": 27000},
        "PA": {"name": "Pennsylvania", "type": "flat", "rate": 0.0307, "std_single": 0, "std_mfj": 0},
        "UT": {"name": "Utah", "type": "flat", "rate": 0.0465, "std_single": 0, "std_mfj": 0, "uses_federal_taxable": True},
        
        # Progressive tax states (simplified - using top marginal rate as approximation)
        "AL": {"name": "Alabama", "type": "progressive", "top_rate": 0.05, "std_single": 2500, "std_mfj": 7500},
        "AR": {"name": "Arkansas", "type": "progressive", "top_rate": 0.044, "std_single": 2340, "std_mfj": 4680},
        "CA": {"name": "California", "type": "progressive", "top_rate": 0.123, "std_single": 5706, "std_mfj": 11412},
        "CT": {"name": "Connecticut", "type": "progressive", "top_rate": 0.0699, "std_single": 0, "std_mfj": 0},
        "DC": {"name": "Washington DC", "type": "progressive", "top_rate": 0.1075, "std_single": 14600, "std_mfj": 29200},
        "DE": {"name": "Delaware", "type": "progressive", "top_rate": 0.066, "std_single": 3250, "std_mfj": 6500},
        "HI": {"name": "Hawaii", "type": "progressive", "top_rate": 0.11, "std_single": 2200, "std_mfj": 4400},
        "KS": {"name": "Kansas", "type": "progressive", "top_rate": 0.057, "std_single": 3500, "std_mfj": 8000},
        "LA": {"name": "Louisiana", "type": "progressive", "top_rate": 0.0425, "std_single": 0, "std_mfj": 0},
        "ME": {"name": "Maine", "type": "progressive", "top_rate": 0.0715, "std_single": 14600, "std_mfj": 29200},
        "MD": {"name": "Maryland", "type": "progressive", "top_rate": 0.0575, "std_single": 2550, "std_mfj": 5100},
        "MN": {"name": "Minnesota", "type": "progressive", "top_rate": 0.0985, "std_single": 14575, "std_mfj": 29150},
        "MO": {"name": "Missouri", "type": "progressive", "top_rate": 0.048, "std_single": 14600, "std_mfj": 29200},
        "MT": {"name": "Montana", "type": "progressive", "top_rate": 0.059, "std_single": 5540, "std_mfj": 11080},
        "NE": {"name": "Nebraska", "type": "progressive", "top_rate": 0.0584, "std_single": 7900, "std_mfj": 15800},
        "NJ": {"name": "New Jersey", "type": "progressive", "top_rate": 0.1075, "std_single": 0, "std_mfj": 0},
        "NM": {"name": "New Mexico", "type": "progressive", "top_rate": 0.059, "std_single": 14600, "std_mfj": 29200},
        "NY": {"name": "New York", "type": "progressive", "top_rate": 0.109, "std_single": 8000, "std_mfj": 16050},
        "ND": {"name": "North Dakota", "type": "progressive", "top_rate": 0.025, "std_single": 14600, "std_mfj": 29200},
        "OH": {"name": "Ohio", "type": "progressive", "top_rate": 0.035, "std_single": 0, "std_mfj": 0, "exempt_amount": 26050},
        "OK": {"name": "Oklahoma", "type": "progressive", "top_rate": 0.0475, "std_single": 6350, "std_mfj": 12700},
        "OR": {"name": "Oregon", "type": "progressive", "top_rate": 0.099, "std_single": 2745, "std_mfj": 5495},
        "RI": {"name": "Rhode Island", "type": "progressive", "top_rate": 0.0599, "std_single": 10550, "std_mfj": 21150},
        "SC": {"name": "South Carolina", "type": "progressive", "top_rate": 0.064, "std_single": 14600, "std_mfj": 29200},
        "VT": {"name": "Vermont", "type": "progressive", "top_rate": 0.0875, "std_single": 7000, "std_mfj": 14000},
        "VA": {"name": "Virginia", "type": "progressive", "top_rate": 0.0575, "std_single": 8500, "std_mfj": 17000},
        "WV": {"name": "West Virginia", "type": "progressive", "top_rate": 0.05, "std_single": 0, "std_mfj": 0},
        "WI": {"name": "Wisconsin", "type": "progressive", "top_rate": 0.0765, "std_single": 13230, "std_mfj": 24470},
    }
    
    info = GENERIC_STATE_INFO.get(state_code)
    if not info:
        return {
            "state": state_code,
            "supported": False,
            "error": f"State {state_code} not in generic calculator",
            "message": "Please check back soon - we're adding more states!"
        }
    
    # Extract data
    filing_status = (data.get("filing_status") or "single").lower().replace(" ", "_").replace("-", "_")
    is_mfj = filing_status in ["married_filing_jointly", "mfj", "qualifying_surviving_spouse"]
    
    federal_agi = float(data.get("federal_agi") or data.get("agi") or 0)
    wages = float(data.get("wages") or federal_agi)
    withholding = float(data.get("state_withholding") or data.get("withholding") or 0)
    num_deps = int(data.get("num_dependents") or 0)
    
    # Standard deduction
    std_ded = info.get("std_mfj", 0) if is_mfj else info.get("std_single", 0)
    
    # Exemptions
    exemption = info.get("exemption", 0)
    if exemption > 0:
        num_exemptions = 2 if is_mfj else 1
        total_exemption = (num_exemptions + num_deps) * exemption
    else:
        total_exemption = 0
    
    # Exempt amount (like Ohio's first $26,050)
    exempt_amount = info.get("exempt_amount", 0)
    
    # State AGI (some states use federal taxable income)
    if info.get("uses_federal_taxable"):
        # For CO, UT - use federal taxable (AGI - std deduction)
        state_agi = max(0, federal_agi - 14600)  # Approximate federal std ded
    else:
        state_agi = federal_agi
    
    # Taxable income
    taxable_income = max(0, state_agi - std_ded - total_exemption - exempt_amount)
    
    # Calculate tax
    if info["type"] == "flat":
        rate = info["rate"]
        state_tax = round(taxable_income * rate, 2)
    else:
        # Progressive - use simplified effective rate (about 70% of top rate for most incomes)
        top_rate = info.get("top_rate", 0.05)
        effective_rate = top_rate * 0.7  # Approximation
        state_tax = round(taxable_income * effective_rate, 2)
    
    # Refund or owed
    if withholding > state_tax:
        refund = round(withholding - state_tax, 2)
        amount_owed = 0
    else:
        refund = 0
        amount_owed = round(state_tax - withholding, 2)
    
    effective_rate = round((state_tax / federal_agi * 100) if federal_agi > 0 else 0, 2)
    
    return {
        "state": state_code,
        "state_name": info["name"],
        "filing_status": filing_status,
        "has_income_tax": True,
        "support_level": "generic",
        "tax_type": info["type"],
        
        # Key fields for Dashboard
        "federal_agi": federal_agi,
        "ca_agi": state_agi,  # Using ca_agi for compatibility
        "state_agi": state_agi,
        "standard_deduction": std_ded,
        "exemptions": total_exemption,
        "taxable_income": taxable_income,
        "total_tax": state_tax,
        "state_tax": state_tax,
        "withholding": withholding,
        "refund": refund,
        "amount_owed": amount_owed,
        "effective_rate": effective_rate,
        
        "notes": f"{info['name']} - {'Flat' if info['type'] == 'flat' else 'Progressive'} tax state"
    }


# ============================================================
# RAG FUNCTIONS
# ============================================================

def get_state_rag_context(state_code: str) -> Optional[str]:
    """Get RAG knowledge context for a state"""
    state_code = state_code.upper()
    
    module = STATE_MODULES.get(state_code)
    if module and hasattr(module, 'get_rag_context'):
        return module.get_rag_context()
    
    return None


def answer_state_question(state_code: str, question: str) -> str:
    """Answer a state-specific tax question"""
    state_code = state_code.upper()
    
    module = STATE_MODULES.get(state_code)
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