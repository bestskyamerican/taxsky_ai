"""
Tax Generator Package
Exports PDF routers for Form 1040 and all State Forms
"""

from .form_1040_router import form_1040_router
from .form_ca540_router import form_ca540_router
from .form_ny_it201_router import form_ny_it201_router
from .additional_states_router import additional_states_router

__all__ = [
    "form_1040_router",
    "form_ca540_router", 
    "form_ny_it201_router",
    "additional_states_router"
]