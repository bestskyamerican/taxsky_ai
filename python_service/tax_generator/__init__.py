"""
Tax Generator Package
Exports PDF routers for Form 1040 and CA 540
"""

from .form_1040_router import form_1040_router
from .form_ca540_router import form_ca540_router

__all__ = ["form_1040_router", "form_ca540_router"]