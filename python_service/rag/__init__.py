# ============================================================
# RAG MODULE - Tax Knowledge Retrieval
# ============================================================

from .rag_service import (
    answer_tax_question,
    search_rag,
    load_federal_rag,
    load_state_rag,
    get_available_states,
    get_ai_context,
    get_standard_deduction,
    TAX_VALUES_2025
)

# ✅ ALIAS: For backward compatibility
get_available_state_rags = get_available_states

__all__ = [
    'answer_tax_question',
    'search_rag', 
    'load_federal_rag',
    'load_state_rag',
    'get_available_states',
    'get_available_state_rags',
    'get_ai_context',
    'get_standard_deduction',
    'TAX_VALUES_2025'
]