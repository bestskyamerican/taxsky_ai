"""
================================================================================
TAXSKY 2025 - EXTRACTOR ROUTER v4.0 (VALIDATOR MODE)
================================================================================
File: python_tax_api/tax_engine/extractor_router.py

v4.0 CHANGES:
  ✅ CHANGED: webhook now passes session data (not messages) to validator
  ✅ CHANGED: Uses validate_and_calculate() instead of text extraction
  ✅ REMOVED: No more message parsing - Node.js saves structured data

================================================================================
"""

from fastapi import APIRouter, HTTPException, Request
from typing import Dict, Any, Optional, List
import os
from pathlib import Path
from datetime import datetime

ROUTER_VERSION = "v4.0-VALIDATOR"

# ============================================================
# CONFIGURATION
# ============================================================
NODE_API_URL = os.getenv("NODE_API_URL", "https://taxskyai.com")
_current_dir = Path(__file__).parent.resolve()
DATA_DIR = Path(os.getenv("TAX_DATA_DIR", str(_current_dir / "tax_data" / "json")))

print(f"📌 Extractor Router Config:")
print(f"   NODE_API_URL: {NODE_API_URL}")
print(f"   DATA_DIR: {DATA_DIR}")
print(f"   Version: {ROUTER_VERSION}")

# ============================================================
# IMPORT MONGODB CLIENT
# ============================================================
MONGODB_AVAILABLE = False
get_session_from_db = None

try:
    from .mongodb_client import get_session as get_session_from_db
    MONGODB_AVAILABLE = True
    print(f"✅ MongoDB client loaded")
except ImportError:
    try:
        from mongodb_client import get_session as get_session_from_db
        MONGODB_AVAILABLE = True
        print(f"✅ MongoDB client loaded (absolute)")
    except ImportError as e:
        print(f"⚠️ MongoDB client not available: {e}")

# ============================================================
# IMPORT VALIDATOR (was text_extractor)
# ============================================================
VALIDATOR_AVAILABLE = False
EXTRACTOR_VERSION = "unavailable"

try:
    from .text_extractor import (
        handle_extract_request,
        validate_and_calculate,
        verify_with_rag,
        map_extracted_to_calculator,
        build_form_1040,
        EXTRACTOR_VERSION
    )
    VALIDATOR_AVAILABLE = True
    print(f"✅ Validator loaded: {EXTRACTOR_VERSION}")
except ImportError as e:
    print(f"⚠️ text_extractor import failed (relative): {e}")
    try:
        from text_extractor import (
            handle_extract_request,
            validate_and_calculate,
            verify_with_rag,
            map_extracted_to_calculator,
            build_form_1040,
            EXTRACTOR_VERSION
        )
        VALIDATOR_AVAILABLE = True
        print(f"✅ Validator loaded (absolute): {EXTRACTOR_VERSION}")
    except ImportError as e2:
        print(f"⚠️ text_extractor import failed: {e2}")
        # Fallback - define dummy function
        def validate_and_calculate(user_id, tax_year, session):
            return {"success": False, "error": "Validator not available"}

# Try to import calculator
CALCULATOR_AVAILABLE = False
calculate_tax = None

try:
    from .calculator.federal.calculator import calculate as calculate_tax
    CALCULATOR_AVAILABLE = True
except ImportError:
    try:
        from calculator.federal.calculator import calculate as calculate_tax
        CALCULATOR_AVAILABLE = True
    except ImportError:
        pass

# ============================================================
# ROUTER
# ============================================================
router = APIRouter(prefix="/api/extract", tags=["extractor"])


# ============================================================
# ENDPOINTS
# ============================================================

@router.post("/session")
async def extract_session(request: Request):
    """
    Validate tax data from a user's session.
    
    POST /api/extract/session
    {
        "user_id": "user_123",
        "tax_year": 2025
    }
    """
    if not VALIDATOR_AVAILABLE:
        raise HTTPException(status_code=503, detail="Validator not available")
    
    if not MONGODB_AVAILABLE:
        raise HTTPException(status_code=503, detail="MongoDB not available")
    
    try:
        data = await request.json()
        user_id = data.get("user_id")
        tax_year = data.get("tax_year", 2025)
        
        if not user_id:
            raise HTTPException(status_code=400, detail="user_id required")
        
        print(f"\n{'='*50}")
        print(f"📨 POST /api/extract/session")
        print(f"   User: {user_id}")
        print(f"   Year: {tax_year}")
        
        # Get session from MongoDB
        session = get_session_from_db(user_id, tax_year)
        
        if not session:
            print(f"   ❌ Session not found!")
            return {"success": False, "error": "Session not found for user"}
        
        print(f"   ✅ Session found")
        print(f"   📋 W-2s: {len(session.get('input_forms', {}).get('w2', []))}")
        print(f"   📋 Answers: {len(session.get('answers', {}))}")
        
        # Validate with structured data
        result = validate_and_calculate(user_id, tax_year, session)
        
        print(f"   📊 Result: success={result.get('success')}")
        print(f"{'='*50}\n")
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Validate error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/validate")
async def validate_data(request: Request):
    """Validate extracted data against IRS rules."""
    if not VALIDATOR_AVAILABLE:
        raise HTTPException(status_code=503, detail="Validator not available")
    
    try:
        data = await request.json()
        extracted = data.get("extracted", {})
        
        is_valid, errors = verify_with_rag(extracted)
        
        return {
            "success": True,
            "is_valid": is_valid,
            "errors": errors
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status/{user_id}")
async def get_status(user_id: str, tax_year: int = 2025):
    """Get validation status for a user."""
    
    # Check MongoDB first
    if MONGODB_AVAILABLE and get_session_from_db:
        session = get_session_from_db(user_id, tax_year)
        if session:
            return {
                "success": True,
                "user_id": user_id,
                "tax_year": tax_year,
                "status": session.get("status", "unknown"),
                "rag_verified": session.get("ragVerified", False),
                "has_form1040": bool(session.get("form1040")),
                "validation_errors": session.get("validationErrors", []),
            }
    
    # Fallback to file
    filepath = DATA_DIR / f"{user_id}_1040_{tax_year}.json"
    if filepath.exists():
        import json
        with open(filepath, 'r') as f:
            form1040 = json.load(f)
        
        return {
            "success": True,
            "user_id": user_id,
            "status": "ready",
            "filepath": str(filepath),
            "rag_verified": form1040.get("_metadata", {}).get("validated", False),
        }
    
    return {
        "success": True,
        "user_id": user_id,
        "status": "not_found",
    }


@router.get("/json/{user_id}")
async def get_json(user_id: str, tax_year: int = 2025):
    """Get the validated JSON data."""
    print(f"\n📄 GET /api/extract/json/{user_id}")
    
    if MONGODB_AVAILABLE and get_session_from_db:
        session = get_session_from_db(user_id, tax_year)
        if session:
            print(f"   ✅ Found in MongoDB")
            
            return {
                "success": True,
                "user_id": user_id,
                "tax_year": tax_year,
                "form1040": session.get("form1040", {}),
                "answers": session.get("answers", {}),
                "taxCalculation": session.get("taxCalculation", {}),
                "ragVerified": session.get("ragVerified", False),
            }
    
    # Fallback to file
    filepath = DATA_DIR / f"{user_id}_1040_{tax_year}.json"
    if filepath.exists():
        import json
        with open(filepath, 'r') as f:
            return {"success": True, "form1040": json.load(f)}
    
    raise HTTPException(status_code=404, detail=f"No data for {user_id}")


@router.post("/webhook/interview-complete")
async def webhook_interview_complete(request: Request):
    """
    Webhook called by Node.js when user finishes the chat.
    
    v4.0: Now validates structured data instead of parsing messages!
    
    POST /api/extract/webhook/interview-complete
    {
        "user_id": "user_123",
        "tax_year": 2025,
        "status": "complete"
    }
    """
    if not VALIDATOR_AVAILABLE:
        raise HTTPException(status_code=503, detail="Validator not available")
    
    try:
        data = await request.json()
        user_id = data.get("user_id")
        tax_year = data.get("tax_year", 2025)
        status = data.get("status", "complete")
        
        print(f"\n{'='*60}")
        print(f"🔔 WEBHOOK: Interview Complete")
        print(f"   User: {user_id}")
        print(f"   Year: {tax_year}")
        print(f"   Status: {status}")
        print(f"   Router: {ROUTER_VERSION}")
        
        if not user_id:
            raise HTTPException(status_code=400, detail="user_id required")
        
        if status != "complete":
            return {
                "success": True,
                "message": f"Status is '{status}', skipping validation",
                "user_id": user_id
            }
        
        # ✅ v4.0: Get FULL SESSION from MongoDB (not just messages!)
        if not MONGODB_AVAILABLE or not get_session_from_db:
            return {
                "success": False,
                "error": "MongoDB not available",
                "user_id": user_id
            }
        
        print(f"   📄 Fetching session from MongoDB...")
        session = get_session_from_db(user_id, tax_year)
        
        if not session:
            print(f"   ❌ Session not found!")
            return {
                "success": False,
                "error": "Session not found",
                "user_id": user_id
            }
        
        # Log what we found
        input_forms = session.get("input_forms", {})
        w2s = input_forms.get("w2", [])
        answers = session.get("answers", {})
        
        print(f"   ✅ Session found:")
        print(f"      W-2s: {len(w2s)}")
        print(f"      Answers: {len(answers)} fields")
        print(f"      Filing Status: {session.get('filing_status', 'unknown')}")
        
        if w2s:
            total_wages = sum(w.get("box_1_wages", 0) or 0 for w in w2s)
            total_withheld = sum(w.get("box_2_federal_withheld", 0) or 0 for w in w2s)
            print(f"      Total Wages: ${total_wages:,}")
            print(f"      Total Withheld: ${total_withheld:,}")
        
        # ✅ v4.0: Call validate_and_calculate with session data
        print(f"\n   🔍 Starting validation...")
        result = validate_and_calculate(user_id, tax_year, session)
        
        print(f"\n   📊 Validation Result:")
        print(f"      Success: {result.get('success')}")
        print(f"      RAG Verified: {result.get('rag_verified')}")
        if result.get('tax_result'):
            tr = result['tax_result']
            print(f"      AGI: ${tr.get('agi', 0):,.0f}")
            print(f"      Refund: ${tr.get('refund', 0):,.0f}")
            print(f"      Owed: ${tr.get('amount_owed', 0):,.0f}")
        
        if result.get('validation_errors'):
            print(f"      Warnings: {len(result['validation_errors'])}")
            for err in result['validation_errors']:
                print(f"         ⚠️ {err}")
        
        print(f"{'='*60}\n")
        
        return {
            "success": result.get("success", False),
            "message": "Validation complete",
            "user_id": user_id,
            "tax_year": tax_year,
            "rag_verified": result.get("rag_verified", False),
            "extracted": result.get("extracted", {}),
            "tax_result": result.get("tax_result", {}),
            "errors": result.get("validation_errors", []),
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Webhook error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def health():
    """Health check for validator service."""
    return {
        "status": "ok",
        "router_version": ROUTER_VERSION,
        "validator_version": EXTRACTOR_VERSION if VALIDATOR_AVAILABLE else "unavailable",
        "validator_available": VALIDATOR_AVAILABLE,
        "mongodb_available": MONGODB_AVAILABLE,
        "calculator_available": CALCULATOR_AVAILABLE,
        "node_api_url": NODE_API_URL,
        "data_dir": str(DATA_DIR),
        "data_dir_exists": DATA_DIR.exists() if DATA_DIR else False,
        "mode": "VALIDATOR (v4.0) - No text extraction"
    }