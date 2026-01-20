"""
================================================================================
TAXSKY 2025 - EXTRACTOR ROUTER v3.2 (FIXED)
================================================================================
File: python_tax_api/tax_engine/extractor_router.py

FIXES in v3.2:
  ✅ FIXED: Now properly fetches messages from MongoDB before extraction
  ✅ FIXED: Passes messages to handle_extract_request()

================================================================================
"""

from fastapi import APIRouter, HTTPException, Request
from typing import Dict, Any, Optional, List
import os
from pathlib import Path
from datetime import datetime

ROUTER_VERSION = "v3.2-FIXED"

# ============================================================
# CONFIGURATION
# ============================================================
NODE_API_URL = os.getenv("NODE_API_URL", "https://taxskyai.com")
_current_dir = Path(__file__).parent.resolve()
DATA_DIR = Path(os.getenv("TAX_DATA_DIR", str(_current_dir / "tax_data" / "json")))

print(f"📌 Extractor Router Config:")
print(f"   NODE_API_URL: {NODE_API_URL}")
print(f"   DATA_DIR: {DATA_DIR}")

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
# IMPORT TEXT EXTRACTOR
# ============================================================
EXTRACTOR_AVAILABLE = False
EXTRACTOR_VERSION = "unavailable"

try:
    from .text_extractor import (
        handle_extract_request,
        verify_with_rag,
        TaxTextExtractor,
        map_extracted_to_calculator,
        EXTRACTOR_VERSION
    )
    EXTRACTOR_AVAILABLE = True
    print(f"✅ Text extractor loaded: {EXTRACTOR_VERSION}")
except ImportError as e:
    print(f"⚠️ text_extractor import failed (relative): {e}")
    try:
        from text_extractor import (
            handle_extract_request,
            verify_with_rag,
            TaxTextExtractor,
            map_extracted_to_calculator,
            EXTRACTOR_VERSION
        )
        EXTRACTOR_AVAILABLE = True
        print(f"✅ Text extractor loaded (absolute): {EXTRACTOR_VERSION}")
    except ImportError as e2:
        print(f"⚠️ text_extractor import failed: {e2}")

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
# HELPER: Get messages from MongoDB
# ============================================================
def fetch_messages_from_mongodb(user_id: str, tax_year: int = 2025) -> tuple:
    """
    Fetch messages and answers from MongoDB.
    Returns: (messages, answers) or ([], {}) if not found
    """
    if not MONGODB_AVAILABLE or not get_session_from_db:
        print(f"   ⚠️ MongoDB not available")
        return [], {}
    
    try:
        session = get_session_from_db(user_id, tax_year)
        if not session:
            print(f"   ⚠️ Session not found in MongoDB")
            return [], {}
        
        messages = session.get("messages", [])
        answers = session.get("answers", {})
        
        print(f"   ✅ Fetched {len(messages)} messages from MongoDB")
        return messages, answers
        
    except Exception as e:
        print(f"   ❌ MongoDB fetch error: {e}")
        return [], {}


# ============================================================
# ENDPOINTS
# ============================================================

@router.post("/session")
async def extract_session(request: Request):
    """
    Extract tax data from a user's chat session.
    
    POST /api/extract/session
    {
        "user_id": "user_123",
        "tax_year": 2025
    }
    """
    if not EXTRACTOR_AVAILABLE:
        raise HTTPException(status_code=503, detail="Extractor not available")
    
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
        
        # ✅ FIXED: Fetch messages from MongoDB
        messages, answers = fetch_messages_from_mongodb(user_id, tax_year)
        
        if not messages:
            print(f"   ❌ No messages found!")
            return {"success": False, "error": "No messages found for user"}
        
        # ✅ FIXED: Pass messages to extractor
        result = handle_extract_request(user_id, tax_year, messages, answers)
        
        print(f"   📊 Result: success={result.get('success')}")
        print(f"{'='*50}\n")
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Extract error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/validate")
async def validate_data(request: Request):
    """Validate extracted data against IRS rules."""
    if not EXTRACTOR_AVAILABLE or not verify_with_rag:
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
    """Get extraction status for a user."""
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
            "rag_verified": form1040.get("_metadata", {}).get("rag_verified", False),
        }
    
    return {
        "success": True,
        "user_id": user_id,
        "status": "not_extracted",
    }


@router.get("/json/{user_id}")
async def get_json(user_id: str, tax_year: int = 2025):
    """Get the extracted JSON data."""
    print(f"\n📄 GET /api/extract/json/{user_id}")
    
    if MONGODB_AVAILABLE and get_session_from_db:
        session = get_session_from_db(user_id, tax_year)
        if session:
            print(f"✅ Found session: {user_id}")
            print(f"   Messages: {len(session.get('messages', []))}")
            print(f"   Status: {session.get('status', 'unknown')}")
            print(f"   ✅ Found in MongoDB")
            
            return {
                "success": True,
                "user_id": user_id,
                "tax_year": tax_year,
                "form1040": session.get("form1040", {}),
                "answers": session.get("answers", {}),
                "taxCalculation": session.get("taxCalculation", {}),
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
    
    POST /api/extract/webhook/interview-complete
    {
        "user_id": "user_123",
        "tax_year": 2025,
        "status": "complete"
    }
    """
    if not EXTRACTOR_AVAILABLE:
        raise HTTPException(status_code=503, detail="Extractor not available")
    
    try:
        data = await request.json()
        user_id = data.get("user_id")
        tax_year = data.get("tax_year", 2025)
        status = data.get("status", "complete")
        
        print(f"\n{'='*50}")
        print(f"🔔 WEBHOOK: Interview Complete")
        print(f"   User: {user_id}")
        print(f"   Year: {tax_year}")
        print(f"   Status: {status}")
        
        if not user_id:
            raise HTTPException(status_code=400, detail="user_id required")
        
        if status != "complete":
            return {
                "success": True,
                "message": f"Status is '{status}', skipping extraction",
                "user_id": user_id
            }
        
        # ✅ FIXED: Fetch messages from MongoDB
        print(f"   🔄 Fetching messages from MongoDB...")
        messages, answers = fetch_messages_from_mongodb(user_id, tax_year)
        
        if not messages:
            print(f"   ❌ No messages found!")
            return {
                "success": False,
                "error": "No messages found",
                "user_id": user_id
            }
        
        print(f"   ✅ Found {len(messages)} messages")
        print(f"   🔄 Starting extraction...")
        
        # ✅ FIXED: Pass messages to extractor
        result = handle_extract_request(user_id, tax_year, messages, answers)
        
        print(f"   📊 Result: success={result.get('success')}")
        if result.get('success'):
            extracted = result.get('extracted', {})
            print(f"   💰 Taxpayer wages: ${extracted.get('taxpayer_wages', 0):,}")
            print(f"   💰 Spouse wages: ${extracted.get('spouse_wages', 0):,}")
        else:
            print(f"   ❌ Error: {result.get('error', 'unknown')}")
        
        print(f"{'='*50}\n")
        
        return {
            "success": result.get("success", False),
            "message": "Extraction complete",
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
    """Health check for extractor service."""
    return {
        "status": "ok",
        "router_version": ROUTER_VERSION,
        "extractor_version": EXTRACTOR_VERSION if EXTRACTOR_AVAILABLE else "unavailable",
        "extractor_available": EXTRACTOR_AVAILABLE,
        "mongodb_available": MONGODB_AVAILABLE,
        "calculator_available": CALCULATOR_AVAILABLE,
        "node_api_url": NODE_API_URL,
        "data_dir": str(DATA_DIR),
        "data_dir_exists": DATA_DIR.exists() if DATA_DIR else False
    }
