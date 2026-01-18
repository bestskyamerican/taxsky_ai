# ============================================================
# TAXSKY 2025 - TAX ENGINE (CLEAN & SAFE)
# ============================================================
# Single source of truth:
#   - Federal tax → calculator/federal
#   - State tax   → state_router → states/XX.py
# NO fallback state math here
# ============================================================

from typing import Dict, Any, List
import traceback

# ============================================================
# IMPORT FEDERAL CALCULATOR
# ============================================================
from .calculator.federal.calculator import calculate as calculate_federal

# ============================================================
# IMPORT STATE ROUTER (ONLY ENTRY POINT)
# ============================================================
from .state_router import calculate_state_tax as route_state_tax

# ============================================================
# PUBLIC API: GET ALL STATES (UI USE)
# ============================================================
def get_all_states() -> List[Dict[str, Any]]:
    from .state_router import get_all_states as _get_states
    return _get_states()

# ============================================================
# MAIN API: CALCULATE FULL TAX (FEDERAL + STATE)
# ============================================================
def calculate_tax(tax_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Calculate full tax return (Federal + optional State)

    REQUIRED INPUT:
    - filing_status
    - wages
    OPTIONAL:
    - state (e.g. "CA")
    """

    # =========================
    # 1️⃣ FEDERAL CALCULATION
    # =========================
    try:
        federal = calculate_federal(tax_data)
    except Exception as e:
        traceback.print_exc()
        raise RuntimeError("Federal tax calculation failed") from e

    # Inject AGI for state use (MANDATORY)
    tax_data["federal_agi"] = federal.get("agi", 0)
    tax_data["agi"] = federal.get("agi", 0)

    # =========================
    # 2️⃣ STATE CALCULATION
    # =========================
    state_result = None
    state_code = tax_data.get("state")

    if state_code:
        try:
            state_result = route_state_tax(state_code, tax_data)
        except Exception as e:
            traceback.print_exc()
            state_result = {
                "state": state_code.upper(),
                "error": "State calculation failed"
            }

    # =========================
    # 3️⃣ VALIDATION (BLOCK BAD DATA)
    # =========================
    _validate_results(federal, state_result)

    # =========================
    # 4️⃣ TOTALS
    # =========================
    total_owed = federal.get("amount_owed", 0)
    total_refund = federal.get("refund", 0)

    if state_result and "error" not in state_result:
        total_owed += state_result.get("amount_owed", 0)
        total_refund += state_result.get("refund", 0)

    return {
        "tax_year": federal.get("tax_year", 2025),
        "federal": federal,
        "state": state_result,
        "total_amount_owed": round(total_owed, 2),
        "total_refund": round(total_refund, 2),
        "ready_to_file": _ready_to_file(federal, state_result)
    }

# ============================================================
# VALIDATION RULES (CRITICAL)
# ============================================================
def _validate_results(federal: Dict[str, Any], state: Dict[str, Any]):
    if not federal:
        raise ValueError("Federal result missing")

    # Block impossible state conditions
    if state and "error" not in state:
        ca_agi = (
            state.get("ca_agi")
            or state.get("state_agi")
            or state.get("agi")
        )

        if ca_agi == 0 and state.get("amount_owed", 0) > 0:
            raise ValueError(
                "Invalid state tax: AGI = 0 but tax owed > 0"
            )

# ============================================================
# READY-TO-FILE CHECK
# ============================================================
def _ready_to_file(federal: Dict[str, Any], state: Dict[str, Any]) -> bool:
    if not federal:
        return False

    if state and "error" in state:
        return False

    return True

# ============================================================
# EXPORTS
# ============================================================
__all__ = [
    "calculate_tax",
    "calculate_federal",
    "get_all_states"
]
