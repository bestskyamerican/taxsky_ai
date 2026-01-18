# ============================================================
# TAX ENGINE - Package Exports
# ============================================================

from .tax_engine import calculate_tax
from .state_router import calculate_state_tax, get_all_states

# Import federal calculator
try:
    from .calculator.federal.calculator import calculate as calculate_federal
except ImportError:
    calculate_federal = None

# Import text extractor
try:
    from .text_extractor import (
        process_session,
        handle_extract_request,
        verify_with_rag,
        load_form1040_json,
        save_form1040_json,
        EXTRACTOR_VERSION
    )
    TEXT_EXTRACTOR_AVAILABLE = True
except ImportError as e:
    print(f"⚠️ text_extractor import failed: {e}")
    TEXT_EXTRACTOR_AVAILABLE = False

# Import mongodb client
try:
    from .mongodb_client import get_session, update_session, PYMONGO_AVAILABLE
except ImportError as e:
    print(f"⚠️ mongodb_client import failed: {e}")
    PYMONGO_AVAILABLE = False

route_state_tax = calculate_state_tax

__all__ = [
    "calculate_tax",
    "calculate_federal", 
    "calculate_state_tax",
    "route_state_tax",
    "get_all_states",
    "process_session",
    "handle_extract_request",
    "TEXT_EXTRACTOR_AVAILABLE",
    "PYMONGO_AVAILABLE",
]