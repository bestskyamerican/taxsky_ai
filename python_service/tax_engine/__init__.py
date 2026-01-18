# ============================================================
# TAX ENGINE - Package Exports
# ============================================================
# Location: C:\ai_tax\python_service\tax_engine\__init__.py
# ============================================================

from .tax_engine import calculate_tax
from .state_router import calculate_state_tax, get_all_states

# Import federal calculator
try:
    from .calculator.federal.calculator import calculate as calculate_federal
except ImportError:
    # Fallback if structure is different
    calculate_federal = None

# Alias for compatibility
route_state_tax = calculate_state_tax

__all__ = [
    "calculate_tax",
    "calculate_federal", 
    "calculate_state_tax",
    "route_state_tax",
    "get_all_states"
]