"""
============================================================
TAXSKY 2025 - EXTRACTOR API ROUTER v3.1
============================================================
File: python_tax_api/tax_engine/extractor_router.py

CHANGES in v3.1:
  ✅ FIXED: Validation now pulls IRA values from correct path (_adjustments_details)
  ✅ FIXED: Proper field mappings for RAG validation
  ✅ UPDATED: Version to match text_extractor v18.0

ENDPOINTS:
  POST /api/extract/session          → Extract from chat session
  POST /api/extract/validate         → Validate extracted data
  GET  /api/extract/status/{user_id} → Get extraction status
  GET  /api/extract/json/{user_id}   → Get saved JSON file
  POST /api/extract/webhook/interview-complete → Webhook trigger
  GET  /api/extract/health           → Health check

============================================================
"""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import os
from pathlib import Path

# Import the text extractor
try:
    from .text_extractor import (
        process_session,
        handle_extract_request,
        verify_with_rag,
        load_form1040_json,
        save_form1040_json,
        DATA_DIR,
        EXTRACTOR_VERSION
    )
    EXTRACTOR_AVAILABLE = True
except ImportError:
    try:
        from text_extractor import (
            process_session,
            handle_extract_request,
            verify_with_rag,
            load_form1040_json,
            save_form1040_json,
            DATA_DIR,
            EXTRACTOR_VERSION
        )
        EXTRACTOR_AVAILABLE = True
    except ImportError as e:
        print(f"⚠️ Text extractor not available: {e}")
        EXTRACTOR_AVAILABLE = False
        DATA_DIR = Path("./tax_data/json")
        EXTRACTOR_VERSION = "unavailable"

# Create router
router = APIRouter(prefix="/api/extract", tags=["Extractor"])

ROUTER_VERSION = "v3.1"


# ============================================================
# MODELS
# ============================================================

class ExtractRequest(BaseModel):
    user_id: str
    tax_year: int = 2025


class ValidateRequest(BaseModel):
    user_id: str
    tax_year: int = 2025
    data: Optional[Dict[str, Any]] = None


class WebhookRequest(BaseModel):
    user_id: str
    tax_year: int = 2025
    status: str = "complete"


# ============================================================
# ENDPOINTS
# ============================================================

@router.post("/session")
async def extract_session(request: ExtractRequest):
    """
    Extract tax data from user's chat session.
    
    POST /api/extract/session
    {
        "user_id": "user_123",
        "tax_year": 2025
    }
    
    Returns:
    {
        "success": true,
        "user_id": "user_123",
        "data_source": "messages",
        "form1040": { ... },
        "tax_result": { ... },
        "rag_verified": true,
        "validation_errors": [],
        "filepath": "./tax_data/json/user_123_1040_2025.json"
    }
    """
    if not EXTRACTOR_AVAILABLE:
        raise HTTPException(status_code=503, detail="Extractor not available")
    
    try:
        print(f"\n{'='*50}")
        print(f"📨 POST /api/extract/session")
        print(f"   User: {request.user_id}")
        print(f"   Year: {request.tax_year}")
        
        result = handle_extract_request(request.user_id, request.tax_year)
        
        if result.get("success"):
            print(f"✅ Extraction successful")
            print(f"   RAG Verified: {result.get('rag_verified', False)}")
            print(f"   File: {result.get('filepath', 'N/A')}")
        else:
            print(f"❌ Extraction failed: {result.get('error', 'Unknown')}")
        
        return result
        
    except Exception as e:
        print(f"❌ Extract error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/validate")
async def validate_data(request: ValidateRequest):
    """
    Validate tax data against RAG rules.
    
    POST /api/extract/validate
    {
        "user_id": "user_123",
        "tax_year": 2025,
        "data": { ... }  // Optional - if not provided, loads from saved JSON
    }
    
    Returns:
    {
        "success": true,
        "rag_verified": true,
        "validation_errors": []
    }
    """
    if not EXTRACTOR_AVAILABLE:
        raise HTTPException(status_code=503, detail="Extractor not available")
    
    try:
        print(f"\n📋 POST /api/extract/validate - {request.user_id}")
        
        if request.data:
            data = request.data
        else:
            form1040 = load_form1040_json(request.user_id, request.tax_year)
            if not form1040:
                return {
                    "success": False,
                    "error": f"No saved data for {request.user_id}"
                }
            
            # FIXED: Extract data for validation from correct paths
            header = form1040.get("header", {})
            adjustments = form1040.get("_adjustments_details", {})
            
            data = {
                "taxpayer_age": header.get("taxpayer_age", 0),
                "spouse_age": header.get("spouse_age", 0),
                "taxpayer_ira": adjustments.get("taxpayer_ira", 0),
                "spouse_ira": adjustments.get("spouse_ira", 0),
                "hsa": adjustments.get("hsa", 0),
                "student_loan_interest": adjustments.get("student_loan_interest", 0),
            }
        
        is_valid, errors = verify_with_rag(data)
        
        print(f"   RAG Valid: {is_valid}")
        for error in errors:
            print(f"   ❌ {error}")
        
        return {
            "success": True,
            "user_id": request.user_id,
            "rag_verified": is_valid,
            "validation_errors": errors
        }
        
    except Exception as e:
        print(f"❌ Validate error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status/{user_id}")
async def get_status(user_id: str, tax_year: int = 2025):
    """
    Get extraction status for a user.
    
    GET /api/extract/status/user_123?tax_year=2025
    
    Returns:
    {
        "success": true,
        "user_id": "user_123",
        "has_json": true,
        "filepath": "./tax_data/json/user_123_1040_2025.json",
        "status": "ready",
        "rag_verified": true
    }
    """
    try:
        print(f"\n📊 GET /api/extract/status/{user_id}")
        
        filename = f"{user_id}_1040_{tax_year}.json"
        filepath = DATA_DIR / filename
        
        if filepath.exists():
            form1040 = load_form1040_json(user_id, tax_year) if EXTRACTOR_AVAILABLE else None
            metadata = form1040.get("_metadata", {}) if form1040 else {}
            
            return {
                "success": True,
                "user_id": user_id,
                "tax_year": tax_year,
                "has_json": True,
                "filepath": str(filepath),
                "status": metadata.get("status", "unknown"),
                "rag_verified": metadata.get("rag_verified", False),
                "extractor_version": metadata.get("extractor_version", "unknown"),
                "calculator_version": metadata.get("calculator_version", "unknown"),
                "updated_at": metadata.get("extracted_at")
            }
        else:
            return {
                "success": True,
                "user_id": user_id,
                "tax_year": tax_year,
                "has_json": False,
                "status": "not_extracted"
            }
            
    except Exception as e:
        print(f"❌ Status error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/json/{user_id}")
async def get_json(user_id: str, tax_year: int = 2025):
    """
    Get saved Form 1040 JSON for a user.
    
    GET /api/extract/json/user_123?tax_year=2025
    
    Returns the full Form 1040 JSON structure.
    First tries MongoDB, then falls back to file.
    """
    try:
        print(f"\n📄 GET /api/extract/json/{user_id}")
        
        form1040 = None
        PYMONGO_AVAILABLE = False
        get_session = None
        
        # Try MongoDB first
        try:
            from .mongodb_client import get_session as mongo_get_session, PYMONGO_AVAILABLE as MONGO_AVAIL
            get_session = mongo_get_session
            PYMONGO_AVAILABLE = MONGO_AVAIL
        except ImportError:
            try:
                from mongodb_client import get_session as mongo_get_session, PYMONGO_AVAILABLE as MONGO_AVAIL
                get_session = mongo_get_session
                PYMONGO_AVAILABLE = MONGO_AVAIL
            except ImportError:
                pass
        
        if PYMONGO_AVAILABLE and get_session:
            try:
                session = get_session(user_id, tax_year)
                if session and session.get("form1040"):
                    form1040 = session.get("form1040")
                    print(f"   ✅ Found in MongoDB")
            except Exception as mongo_err:
                print(f"   ⚠️ MongoDB query error: {mongo_err}")
        else:
            print(f"   ⚠️ MongoDB client not available, using file fallback")
        
        # Fallback to file
        if not form1040 and EXTRACTOR_AVAILABLE:
            form1040 = load_form1040_json(user_id, tax_year)
            if form1040:
                print(f"   ✅ Found in file")
        
        if not form1040:
            raise HTTPException(status_code=404, detail=f"No data found for {user_id}")
        
        return {
            "success": True,
            "user_id": user_id,
            "tax_year": tax_year,
            "form1040": form1040
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Get JSON error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/webhook/interview-complete")
async def webhook_interview_complete(request: Request):
    """
    Webhook triggered when AI interview is complete.
    Called by Node.js when user finishes the chat.
    
    POST /api/extract/webhook/interview-complete
    {
        "user_id": "user_123",
        "tax_year": 2025,
        "status": "complete"
    }
    
    This triggers the extraction process automatically.
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
                "message": f"Status is '{status}', not triggering extraction",
                "user_id": user_id
            }
        
        # Trigger extraction synchronously (blocking)
        # This ensures we get the result before responding
        print(f"   🔄 Starting extraction...")
        
        try:
            result = handle_extract_request(user_id, tax_year)
        except Exception as extract_error:
            print(f"   ❌ Extraction exception: {extract_error}")
            import traceback
            traceback.print_exc()
            result = {"success": False, "error": str(extract_error)}
        
        print(f"   📊 Result: success={result.get('success')}")
        if not result.get('success'):
            print(f"   ❌ Error: {result.get('error', 'Unknown')}")
        else:
            print(f"   ✅ Extraction complete!")
            print(f"   📁 File: {result.get('filepath', 'N/A')}")
        
        print(f"{'='*50}\n")
        
        return {
            "success": result.get("success", False),
            "message": "Extraction complete",
            "user_id": user_id,
            "tax_year": tax_year,
            "rag_verified": result.get("rag_verified", False),
            "filepath": result.get("filepath"),
            "errors": result.get("validation_errors", []),
            "tax_result": result.get("tax_result", {})
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
        "data_dir": str(DATA_DIR),
        "data_dir_exists": DATA_DIR.exists() if DATA_DIR else False
    }


@router.get("/versions")
async def versions():
    """Get version information for all components."""
    return {
        "router": ROUTER_VERSION,
        "extractor": EXTRACTOR_VERSION if EXTRACTOR_AVAILABLE else "unavailable",
        "calculator": "v4.0",  # From calculator.py
        "tax_year": 2025,
        "features": [
            "Proper SS taxation (provisional income formula)",
            "LTCG preferential rates (0%/15%/20%)",
            "Full EITC calculation",
            "Senior Bonus deduction ($6K OBBBA)",
            "ACTC refundable credit",
            "Fixed dependent age logic (<=16 for CTC)"
        ]
    }