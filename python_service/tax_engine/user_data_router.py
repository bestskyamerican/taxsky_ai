"""
================================================================================
TAXSKY 2025 - USER DATA ROUTER (Python)
================================================================================
File: python_service/tax_engine/user_data_router.py
Version: 2.1 - Added Dependent SSN/Name Validation

PURPOSE:
  Handle all user data CRUD operations directly in Python.
  React calls Python (port 5002) instead of Node.js (port 5001).

ENDPOINTS:
  GET  /api/user/{user_id}              - Get user tax data
  PUT  /api/user/{user_id}              - Update user tax data
  PUT  /api/user/{user_id}/dependents   - Update dependents
  GET  /api/user/{user_id}/session      - Get full session (for SubmitFlow)
  POST /api/user/{user_id}/session      - Save session data
  
  ✅ Form 1040 Missing Fields:
  GET  /api/user/{user_id}/form1040/missing  - Get missing required fields
  GET  /api/user/{user_id}/form1040/data     - Get all Form 1040 data
  POST /api/user/{user_id}/form1040/update   - Update personal info
  GET  /api/user/{user_id}/form1040/status   - Check if ready to file
  
  ✅ NEW v2.1 - Dependent Validation:
  POST /api/user/{user_id}/form1040/dependent/{index} - Update dependent SSN/Name

================================================================================
"""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Dict, Any, Optional, List
from datetime import datetime
import os

# ============================================================
# ROUTER
# ============================================================
router = APIRouter(prefix="/api/user", tags=["user-data"])

# ============================================================
# MONGODB CONNECTION
# ============================================================
MONGODB_AVAILABLE = False
_db = None
_collection = None

try:
    from pymongo import MongoClient
    from pymongo.errors import ConnectionFailure
    PYMONGO_AVAILABLE = True
except ImportError:
    PYMONGO_AVAILABLE = False
    print("⚠️ pymongo not installed")

# Try to load .env
try:
    from dotenv import load_dotenv
    env_paths = ['.env', '../.env', '../../backend/.env', 'C:/ai_tax/backend/.env']
    for p in env_paths:
        if os.path.exists(p):
            load_dotenv(p)
            break
except ImportError:
    pass

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017/ai_tax")
DATABASE_NAME = os.getenv("MONGODB_DATABASE", "ai_tax")
COLLECTION_NAME = "taxsessions"

def get_collection():
    """Get MongoDB collection with connection caching."""
    global _db, _collection
    
    if not PYMONGO_AVAILABLE:
        raise HTTPException(status_code=503, detail="MongoDB not available")
    
    if _collection is None:
        try:
            client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=5000)
            client.admin.command('ping')
            _db = client[DATABASE_NAME]
            _collection = _db[COLLECTION_NAME]
            print(f"✅ Connected to MongoDB: {DATABASE_NAME}/{COLLECTION_NAME}")
        except Exception as e:
            print(f"❌ MongoDB connection failed: {e}")
            raise HTTPException(status_code=503, detail=f"MongoDB error: {e}")
    
    return _collection


def get_or_create_session(user_id: str, tax_year: int = 2025) -> Dict[str, Any]:
    """Get existing session or create new one."""
    collection = get_collection()
    
    session = collection.find_one({"userId": user_id, "taxYear": tax_year})
    
    if not session:
        session = collection.find_one({"userId": user_id})
    
    if not session:
        session = {
            "userId": user_id,
            "taxYear": tax_year,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "filing_status": "single",
            "status": "in_progress",
            "answers": {},
            "normalizedData": {
                "personal": {},
                "dependents": [],
                "income": {}
            },
            "input_forms": {
                "w2": [],
                "1099": []
            }
        }
        collection.insert_one(session)
        print(f"✅ Created new session: {user_id}")
    
    if "_id" in session:
        session["_id"] = str(session["_id"])
    
    return session


# ============================================================
# ✅ v2.0: FORM 1040 REQUIRED FIELDS
# ============================================================

REQUIRED_FIELDS_ALL = [
    "first_name", "last_name", "ssn", "address", "city", "state", "zip", "filing_status"
]

REQUIRED_FIELDS_MFJ = [
    "spouse_first_name", "spouse_last_name", "spouse_ssn"
]

OPTIONAL_FIELDS = [
    "middle_initial", "spouse_middle_initial", "taxpayer_dob", "spouse_dob",
    "phone", "email", "occupation", "spouse_occupation"
]

FIELD_LABELS = {
    "first_name": "First Name",
    "middle_initial": "Middle Initial",
    "last_name": "Last Name",
    "ssn": "Social Security Number",
    "taxpayer_dob": "Date of Birth",
    "occupation": "Occupation",
    "spouse_first_name": "Spouse First Name",
    "spouse_middle_initial": "Spouse Middle Initial",
    "spouse_last_name": "Spouse Last Name",
    "spouse_ssn": "Spouse SSN",
    "spouse_dob": "Spouse Date of Birth",
    "spouse_occupation": "Spouse Occupation",
    "address": "Street Address",
    "city": "City",
    "state": "State",
    "zip": "ZIP Code",
    "phone": "Phone Number",
    "email": "Email Address",
    "filing_status": "Filing Status"
}


# ============================================================
# ✅ v2.0: Pydantic Model for Updates
# ============================================================

class PersonalInfoUpdate(BaseModel):
    first_name: Optional[str] = None
    middle_initial: Optional[str] = None
    last_name: Optional[str] = None
    ssn: Optional[str] = None
    taxpayer_dob: Optional[str] = None
    occupation: Optional[str] = None
    spouse_first_name: Optional[str] = None
    spouse_middle_initial: Optional[str] = None
    spouse_last_name: Optional[str] = None
    spouse_ssn: Optional[str] = None
    spouse_dob: Optional[str] = None
    spouse_occupation: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    filing_status: Optional[str] = None


# ============================================================
# ✅ v2.0: Extract data from ALL session locations
# ============================================================

def extract_personal_data_v2(session: dict) -> dict:
    """Extract personal data from ALL possible session locations."""
    if not session:
        return {}
    
    normalized = session.get("normalizedData", {}).get("personal", {})
    taxpayer = session.get("taxpayer", {})
    spouse = session.get("spouse", {})
    answers = session.get("answers", {})
    address = session.get("address", {})
    
    if isinstance(answers, dict) and "$values" in answers:
        answers = dict(answers.get("$values", []))
    
    taxpayer_name = answers.get("taxpayer_name", "")
    taxpayer_name_parts = taxpayer_name.split() if taxpayer_name else []
    
    spouse_name = answers.get("spouse_name", "")
    spouse_name_parts = spouse_name.split() if spouse_name else []
    
    return {
        "first_name": (
            normalized.get("first_name") or taxpayer.get("first_name") or 
            answers.get("first_name") or answers.get("taxpayer_first_name") or
            (taxpayer_name_parts[0] if taxpayer_name_parts else "")
        ),
        "middle_initial": normalized.get("middle_initial") or taxpayer.get("middle_initial") or answers.get("middle_initial") or "",
        "last_name": (
            normalized.get("last_name") or taxpayer.get("last_name") or 
            answers.get("last_name") or answers.get("taxpayer_last_name") or
            (" ".join(taxpayer_name_parts[1:]) if len(taxpayer_name_parts) > 1 else "")
        ),
        "ssn": normalized.get("ssn") or taxpayer.get("ssn") or answers.get("ssn") or answers.get("taxpayer_ssn") or "",
        "taxpayer_dob": normalized.get("taxpayer_dob") or taxpayer.get("dob") or answers.get("taxpayer_dob") or answers.get("date_of_birth") or "",
        "occupation": normalized.get("occupation") or taxpayer.get("occupation") or answers.get("occupation") or "",
        
        "spouse_first_name": (
            normalized.get("spouse_first_name") or spouse.get("first_name") or 
            answers.get("spouse_first_name") or (spouse_name_parts[0] if spouse_name_parts else "")
        ),
        "spouse_middle_initial": normalized.get("spouse_middle_initial") or spouse.get("middle_initial") or answers.get("spouse_middle_initial") or "",
        "spouse_last_name": (
            normalized.get("spouse_last_name") or spouse.get("last_name") or 
            answers.get("spouse_last_name") or (" ".join(spouse_name_parts[1:]) if len(spouse_name_parts) > 1 else "")
        ),
        "spouse_ssn": normalized.get("spouse_ssn") or spouse.get("ssn") or answers.get("spouse_ssn") or "",
        "spouse_dob": normalized.get("spouse_dob") or spouse.get("dob") or answers.get("spouse_dob") or "",
        "spouse_occupation": normalized.get("spouse_occupation") or spouse.get("occupation") or answers.get("spouse_occupation") or "",
        
        "address": normalized.get("address") or address.get("street") or answers.get("address") or answers.get("street_address") or "",
        "city": normalized.get("city") or address.get("city") or answers.get("city") or "",
        "state": normalized.get("state") or address.get("state") or answers.get("state") or "",
        "zip": normalized.get("zip") or address.get("zip") or answers.get("zip") or answers.get("zip_code") or "",
        
        "phone": normalized.get("phone") or answers.get("phone") or "",
        "email": normalized.get("email") or answers.get("email") or "",
        
        "filing_status": normalized.get("filing_status") or session.get("filing_status") or answers.get("filing_status") or "",
    }


def find_missing_fields(data: dict, filing_status: str, dependents: list = None) -> tuple:
    """Find missing required and optional fields, including dependents."""
    required_missing = []
    optional_missing = []
    dependent_missing = []
    
    # Check required fields for all filers
    for field in REQUIRED_FIELDS_ALL:
        value = data.get(field, "")
        if not value or str(value).strip() == "":
            required_missing.append({"field": field, "label": FIELD_LABELS.get(field, field)})
    
    # Check spouse fields if MFJ
    if filing_status and "joint" in filing_status.lower():
        for field in REQUIRED_FIELDS_MFJ:
            value = data.get(field, "")
            if not value or str(value).strip() == "":
                required_missing.append({"field": field, "label": FIELD_LABELS.get(field, field)})
    
    # Check optional fields
    for field in OPTIONAL_FIELDS:
        value = data.get(field, "")
        if not value or str(value).strip() == "":
            if "spouse" in field and filing_status and "joint" not in filing_status.lower():
                continue
            optional_missing.append({"field": field, "label": FIELD_LABELS.get(field, field)})
    
    # ✅ v2.1: Check dependent fields (Name & SSN required)
    if dependents:
        for i, dep in enumerate(dependents):
            dep_num = i + 1
            dep_name = dep.get("name") or f"{dep.get('first_name', '')} {dep.get('last_name', '')}".strip()
            
            # Check first_name or name
            if not dep.get("first_name") and not dep.get("name"):
                dependent_missing.append({
                    "field": f"dependent_{dep_num}_name",
                    "label": f"Dependent {dep_num} Name",
                    "dependent_index": i
                })
            
            # Check SSN
            if not dep.get("ssn"):
                dependent_missing.append({
                    "field": f"dependent_{dep_num}_ssn",
                    "label": f"Dependent {dep_num} SSN" + (f" ({dep_name})" if dep_name else ""),
                    "dependent_index": i
                })
            
            # Check relationship
            if not dep.get("relationship"):
                dependent_missing.append({
                    "field": f"dependent_{dep_num}_relationship",
                    "label": f"Dependent {dep_num} Relationship" + (f" ({dep_name})" if dep_name else ""),
                    "dependent_index": i
                })
            
            # Check date of birth (needed for child tax credit calculation)
            if not dep.get("date_of_birth") and not dep.get("dob") and dep.get("age") is None:
                optional_missing.append({
                    "field": f"dependent_{dep_num}_dob",
                    "label": f"Dependent {dep_num} Date of Birth" + (f" ({dep_name})" if dep_name else ""),
                    "dependent_index": i
                })
    
    # Add dependent missing to required (SSN and Name are required for Form 1040)
    required_missing.extend(dependent_missing)
    
    return required_missing, optional_missing


# ============================================================
# GET USER DATA
# ============================================================
@router.get("/{user_id}")
async def get_user_data(user_id: str, tax_year: int = 2025):
    """Get user tax data."""
    try:
        print(f"\n📥 GET /api/user/{user_id}")
        
        session = get_or_create_session(user_id, tax_year)
        answers = session.get("answers", {})
        dependents = session.get("normalizedData", {}).get("dependents", [])
        income = session.get("normalizedData", {}).get("income", {})
        
        merged_personal = extract_personal_data_v2(session)
        
        w2s = session.get("input_forms", {}).get("w2", [])
        total_wages = sum(float(w.get("box_1_wages") or w.get("wages") or 0) for w in w2s)
        total_withheld = sum(float(w.get("box_2_federal_withheld") or w.get("federal_withholding") or 0) for w in w2s)
        total_state_withheld = sum(float(w.get("box_17_state_withheld") or w.get("state_withholding") or 0) for w in w2s)
        
        totals = session.get("totals", {})
        
        merged_income = {
            "wages": total_wages or totals.get("wages", 0) or float(answers.get("total_wages") or income.get("wages") or 0),
            "federal_withholding": total_withheld or totals.get("federal_withheld", 0) or float(answers.get("total_withheld") or income.get("federal_withholding") or 0),
            "state_withholding": total_state_withheld or totals.get("state_withheld", 0) or float(answers.get("total_state_withheld") or income.get("state_withholding") or 0),
            "interest": float(answers.get("interest_income") or income.get("interest") or 0),
            "dividends": float(answers.get("dividend_income") or income.get("dividends") or 0),
        }
        
        return {
            "success": True,
            "user_id": user_id,
            "tax_year": tax_year,
            "filing_status": merged_personal.get("filing_status") or "single",
            "personal": merged_personal,
            "dependents": dependents,
            "income": merged_income,
            "answers": answers,
            "status": session.get("status", "in_progress"),
            "updated_at": session.get("updated_at")
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# UPDATE USER DATA
# ============================================================
@router.put("/{user_id}")
async def update_user_data(user_id: str, request: Request):
    """Update user tax data."""
    try:
        data = await request.json()
        print(f"\n📤 PUT /api/user/{user_id}")
        
        collection = get_collection()
        update_obj = {"updated_at": datetime.utcnow()}
        
        if "personal" in data:
            personal = data["personal"]
            for key, value in personal.items():
                if value is not None:
                    update_obj[f"normalizedData.personal.{key}"] = value
                    update_obj[f"answers.{key}"] = value
                    
                    if key in ["first_name", "middle_initial", "last_name", "ssn", "occupation"]:
                        update_obj[f"taxpayer.{key}"] = value
                    elif key == "taxpayer_dob":
                        update_obj["taxpayer.dob"] = value
                    elif key.startswith("spouse_"):
                        spouse_field = key.replace("spouse_", "")
                        if spouse_field == "dob":
                            update_obj["spouse.dob"] = value
                        else:
                            update_obj[f"spouse.{spouse_field}"] = value
                    elif key in ["address", "city", "state", "zip"]:
                        if key == "address":
                            update_obj["address.street"] = value
                        else:
                            update_obj[f"address.{key}"] = value
        
        if "filing_status" in data:
            update_obj["filing_status"] = data["filing_status"]
            update_obj["normalizedData.personal.filing_status"] = data["filing_status"]
            update_obj["answers.filing_status"] = data["filing_status"]
        
        result = collection.update_one({"userId": user_id}, {"$set": update_obj}, upsert=True)
        
        print(f"   ✅ Updated user data")
        
        return {"success": True, "message": "User data updated", "modified": result.modified_count}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# UPDATE DEPENDENTS
# ============================================================
@router.put("/{user_id}/dependents")
async def update_dependents(user_id: str, request: Request):
    """Update dependents."""
    try:
        data = await request.json()
        dependents = data.get("dependents", [])
        
        print(f"\n👶 PUT /api/user/{user_id}/dependents - Count: {len(dependents)}")
        
        collection = get_collection()
        
        result = collection.update_one(
            {"userId": user_id},
            {"$set": {
                "dependents": dependents,
                "normalizedData.dependents": dependents,
                "answers.dependents": dependents,
                "updated_at": datetime.utcnow()
            }},
            upsert=True
        )
        
        print(f"   ✅ Updated dependents")
        
        return {"success": True, "message": "Dependents updated", "dependents": dependents, "count": len(dependents)}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# GET SESSION
# ============================================================
@router.get("/{user_id}/session")
async def get_session_data(user_id: str, tax_year: int = 2025):
    """Get full session data for SubmitFlow."""
    try:
        print(f"\n📋 GET /api/user/{user_id}/session")
        
        session = get_or_create_session(user_id, tax_year)
        answers = session.get("answers", {})
        dependents = session.get("normalizedData", {}).get("dependents", []) or session.get("dependents", [])
        personal = extract_personal_data_v2(session)
        totals = session.get("totals", {})
        
        return {
            "success": True,
            "session_id": user_id,
            "tax_year": tax_year,
            "filing_status": personal.get("filing_status") or "single",
            "answers": {
                **personal,
                "total_wages": float(totals.get("wages") or answers.get("total_wages") or 0),
                "total_withheld": float(totals.get("federal_withheld") or answers.get("total_withheld") or 0),
                "total_state_withheld": float(totals.get("state_withheld") or answers.get("total_state_withheld") or 0),
                **answers
            },
            "dependents": dependents,
            "income": session.get("normalizedData", {}).get("income", {}),
            "status": session.get("status", "in_progress")
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# SAVE SESSION
# ============================================================
@router.post("/{user_id}/session")
async def save_session_data(user_id: str, request: Request):
    """Save session data from SubmitFlow."""
    try:
        data = await request.json()
        print(f"\n💾 POST /api/user/{user_id}/session")
        
        collection = get_collection()
        update_obj = {"updated_at": datetime.utcnow()}
        
        if "answers" in data:
            answers = data["answers"]
            for key, value in answers.items():
                update_obj[f"answers.{key}"] = value
            
            update_obj["normalizedData.personal"] = {
                "first_name": answers.get("first_name") or answers.get("taxpayer_first_name") or "",
                "last_name": answers.get("last_name") or answers.get("taxpayer_last_name") or "",
                "middle_initial": answers.get("middle_initial") or "",
                "ssn": answers.get("ssn") or answers.get("taxpayer_ssn") or "",
                "taxpayer_dob": answers.get("taxpayer_dob") or answers.get("date_of_birth") or "",
                "occupation": answers.get("occupation") or "",
                "address": answers.get("address") or answers.get("street_address") or "",
                "city": answers.get("city") or "",
                "state": answers.get("state") or "CA",
                "zip": answers.get("zip") or answers.get("zip_code") or "",
                "spouse_first_name": answers.get("spouse_first_name") or "",
                "spouse_last_name": answers.get("spouse_last_name") or "",
                "spouse_ssn": answers.get("spouse_ssn") or "",
                "spouse_dob": answers.get("spouse_dob") or "",
                "phone": answers.get("phone") or "",
                "email": answers.get("email") or "",
                "filing_status": answers.get("filing_status") or data.get("filing_status") or "",
            }
            
            update_obj["taxpayer.first_name"] = answers.get("first_name") or answers.get("taxpayer_first_name") or ""
            update_obj["taxpayer.last_name"] = answers.get("last_name") or answers.get("taxpayer_last_name") or ""
            update_obj["taxpayer.ssn"] = answers.get("ssn") or answers.get("taxpayer_ssn") or ""
            
            if answers.get("spouse_first_name"):
                update_obj["spouse.first_name"] = answers.get("spouse_first_name") or ""
                update_obj["spouse.last_name"] = answers.get("spouse_last_name") or ""
                update_obj["spouse.ssn"] = answers.get("spouse_ssn") or ""
            
            update_obj["address.street"] = answers.get("address") or answers.get("street_address") or ""
            update_obj["address.city"] = answers.get("city") or ""
            update_obj["address.state"] = answers.get("state") or "CA"
            update_obj["address.zip"] = answers.get("zip") or answers.get("zip_code") or ""
        
        if "filing_status" in data:
            update_obj["filing_status"] = data["filing_status"]
        
        if "dependents" in data:
            update_obj["dependents"] = data["dependents"]
            update_obj["normalizedData.dependents"] = data["dependents"]
            update_obj["answers.dependents"] = data["dependents"]
        
        result = collection.update_one({"userId": user_id}, {"$set": update_obj}, upsert=True)
        
        print(f"   ✅ Session saved")
        
        return {"success": True, "message": "Session saved", "session_id": user_id}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# ✅ v2.0: GET MISSING FIELDS FOR FORM 1040
# ============================================================
@router.get("/{user_id}/form1040/missing")
async def get_form1040_missing(user_id: str, tax_year: int = 2025):
    """
    Get missing required fields for Form 1040.
    
    GET /api/user/{user_id}/form1040/missing
    """
    try:
        print(f"\n🔍 GET /api/user/{user_id}/form1040/missing")
        
        session = get_or_create_session(user_id, tax_year)
        current_data = extract_personal_data_v2(session)
        filing_status = current_data.get("filing_status", "")
        
        # ✅ v2.1: Get dependents for validation
        dependents = session.get("dependents", []) or session.get("normalizedData", {}).get("dependents", [])
        
        required_missing, optional_missing = find_missing_fields(current_data, filing_status, dependents)
        
        # Mask SSN for display
        display_data = current_data.copy()
        if display_data.get("ssn"):
            ssn = display_data["ssn"]
            display_data["ssn"] = f"***-**-{ssn[-4:]}" if len(ssn) >= 4 else "***"
        if display_data.get("spouse_ssn"):
            ssn = display_data["spouse_ssn"]
            display_data["spouse_ssn"] = f"***-**-{ssn[-4:]}" if len(ssn) >= 4 else "***"
        
        is_ready = len(required_missing) == 0
        
        # Count dependent issues
        dependent_issues = [m for m in required_missing if "dependent_" in m.get("field", "")]
        personal_issues = [m for m in required_missing if "dependent_" not in m.get("field", "")]
        
        print(f"   Missing: {len(personal_issues)} personal, {len(dependent_issues)} dependent, Ready: {is_ready}")
        
        return {
            "success": True,
            "user_id": user_id,
            "tax_year": tax_year,
            "filing_status": filing_status or "single",
            "total_required": len(REQUIRED_FIELDS_ALL) + (len(REQUIRED_FIELDS_MFJ) if "joint" in (filing_status or "").lower() else 0),
            "total_missing": len(required_missing),
            "required_missing": required_missing,
            "optional_missing": optional_missing,
            "is_ready_to_file": is_ready,
            "current_data": display_data,
            "dependents": dependents,
            "dependent_count": len(dependents),
            "dependent_issues": len(dependent_issues)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# ✅ v2.0: GET ALL FORM 1040 DATA
# ============================================================
@router.get("/{user_id}/form1040/data")
async def get_form1040_data(user_id: str, tax_year: int = 2025):
    """Get all Form 1040 data including income, dependents, OBBB."""
    try:
        print(f"\n📄 GET /api/user/{user_id}/form1040/data")
        
        session = get_or_create_session(user_id, tax_year)
        personal = extract_personal_data_v2(session)
        
        answers = session.get("answers", {})
        totals = session.get("totals", {})
        obbb = session.get("obbb", {})
        input_forms = session.get("input_forms", {})
        
        if isinstance(answers, dict) and "$values" in answers:
            answers = dict(answers.get("$values", []))
        
        income = {
            "wages": totals.get("wages", 0) or float(answers.get("taxpayer_wages", 0) or 0) + float(answers.get("spouse_wages", 0) or 0),
            "taxpayer_wages": float(answers.get("taxpayer_wages", 0) or 0),
            "spouse_wages": float(answers.get("spouse_wages", 0) or 0),
            "federal_withheld": totals.get("federal_withheld", 0),
            "state_withheld": totals.get("state_withheld", 0),
            "tips_received": obbb.get("tips_received", 0),
            "overtime_pay": obbb.get("overtime_pay", 0),
            "w2_count": len(input_forms.get("w2", [])),
        }
        
        adjustments = {
            "taxpayer_ira": float(answers.get("taxpayer_ira", 0) or 0),
            "spouse_ira": float(answers.get("spouse_ira", 0) or 0),
        }
        
        dependents = session.get("dependents", []) or session.get("normalizedData", {}).get("dependents", [])
        
        filing_status = personal.get("filing_status", "")
        required_missing, _ = find_missing_fields(personal, filing_status, dependents)
        
        return {
            "success": True,
            "user_id": user_id,
            "tax_year": tax_year,
            "status": session.get("status"),
            "personal": personal,
            "income": income,
            "adjustments": adjustments,
            "dependents": dependents,
            "obbb": obbb,
            "totals": totals,
            "w2s": input_forms.get("w2", []),
            "missing_fields": [m["field"] for m in required_missing],
            "is_complete": len(required_missing) == 0
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# ✅ v2.0: UPDATE FORM 1040 DATA
# ============================================================
@router.post("/{user_id}/form1040/update")
async def update_form1040_data(user_id: str, data: PersonalInfoUpdate, tax_year: int = 2025):
    """
    Update personal information for Form 1040.
    Saves to ALL locations for compatibility.
    """
    try:
        print(f"\n✏️ POST /api/user/{user_id}/form1040/update")
        
        collection = get_collection()
        update_data = data.dict(exclude_none=True)
        
        if not update_data:
            return {"success": False, "error": "No data to update"}
        
        print(f"   Updating: {list(update_data.keys())}")
        
        updates = {"updated_at": datetime.utcnow()}
        
        for field, value in update_data.items():
            if value is None or value == "":
                continue
            
            updates[f"normalizedData.personal.{field}"] = value
            updates[f"answers.{field}"] = value
            
            if field in ["first_name", "middle_initial", "last_name", "ssn", "occupation"]:
                updates[f"taxpayer.{field}"] = value
            elif field == "taxpayer_dob":
                updates["taxpayer.dob"] = value
            elif field.startswith("spouse_"):
                spouse_field = field.replace("spouse_", "")
                if spouse_field == "dob":
                    updates["spouse.dob"] = value
                else:
                    updates[f"spouse.{spouse_field}"] = value
            elif field in ["address", "city", "state", "zip"]:
                if field == "address":
                    updates["address.street"] = value
                else:
                    updates[f"address.{field}"] = value
            elif field == "filing_status":
                updates["filing_status"] = value
        
        result = collection.update_one(
            {"userId": user_id, "taxYear": tax_year},
            {"$set": updates},
            upsert=True
        )
        
        if result.modified_count > 0 or result.upserted_id:
            print(f"   ✅ Updated {len(update_data)} fields")
            
            session = get_or_create_session(user_id, tax_year)
            current_data = extract_personal_data_v2(session)
            filing_status = current_data.get("filing_status", "")
            dependents = session.get("dependents", []) or session.get("normalizedData", {}).get("dependents", [])
            required_missing, _ = find_missing_fields(current_data, filing_status, dependents)
            
            return {
                "success": True,
                "message": f"Updated {len(update_data)} fields",
                "fields_updated": list(update_data.keys()),
                "missing_fields": [m["field"] for m in required_missing],
                "is_ready_to_file": len(required_missing) == 0
            }
        else:
            return {"success": False, "error": "No changes made"}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# ✅ v2.0: CHECK FORM 1040 FILING STATUS
# ============================================================
@router.get("/{user_id}/form1040/status")
async def get_form1040_status(user_id: str, tax_year: int = 2025):
    """Check if Form 1040 is ready to file."""
    try:
        print(f"\n✅ GET /api/user/{user_id}/form1040/status")
        
        session = get_or_create_session(user_id, tax_year)
        personal = extract_personal_data_v2(session)
        filing_status = personal.get("filing_status", "")
        dependents = session.get("dependents", []) or session.get("normalizedData", {}).get("dependents", [])
        required_missing, _ = find_missing_fields(personal, filing_status, dependents)
        
        answers = session.get("answers", {})
        if isinstance(answers, dict) and "$values" in answers:
            answers = dict(answers.get("$values", []))
        
        totals = session.get("totals", {})
        has_income = totals.get("wages", 0) > 0 or float(answers.get("taxpayer_wages", 0) or 0) > 0
        interview_complete = answers.get("interview_complete", False)
        
        is_ready = len(required_missing) == 0 and has_income
        
        # Count issues by type
        dependent_issues = [m for m in required_missing if "dependent_" in m.get("field", "")]
        personal_issues = [m for m in required_missing if "dependent_" not in m.get("field", "")]
        
        return {
            "success": True,
            "user_id": user_id,
            "tax_year": tax_year,
            "is_ready_to_file": is_ready,
            "session_status": session.get("status"),
            "checklist": {
                "interview_complete": interview_complete,
                "has_income": has_income,
                "personal_info_complete": len(personal_issues) == 0,
                "dependents_complete": len(dependent_issues) == 0,
                "missing_count": len(required_missing),
                "personal_missing": len(personal_issues),
                "dependent_missing": len(dependent_issues)
            },
            "missing_fields": [m["field"] for m in required_missing],
            "filing_status": filing_status or "single",
            "dependent_count": len(dependents)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# ✅ v2.1: UPDATE DEPENDENT INFO (SSN, Name, etc.)
# ============================================================
@router.post("/{user_id}/form1040/dependent/{dep_index}")
async def update_dependent_info(user_id: str, dep_index: int, request: Request, tax_year: int = 2025):
    """
    Update a specific dependent's information.
    
    POST /api/user/{user_id}/form1040/dependent/0
    {
        "first_name": "Johnny",
        "last_name": "Smith",
        "ssn": "123-45-6789",
        "relationship": "son",
        "date_of_birth": "05/15/2015"
    }
    """
    try:
        print(f"\n👶 POST /api/user/{user_id}/form1040/dependent/{dep_index}")
        
        data = await request.json()
        collection = get_collection()
        
        session = get_or_create_session(user_id, tax_year)
        dependents = session.get("dependents", []) or session.get("normalizedData", {}).get("dependents", [])
        
        if dep_index < 0 or dep_index >= len(dependents):
            return {"success": False, "error": f"Invalid dependent index: {dep_index}. Have {len(dependents)} dependents."}
        
        # Get current dependent
        dep = dependents[dep_index]
        
        # Update fields
        if "first_name" in data:
            dep["first_name"] = data["first_name"]
        if "last_name" in data:
            dep["last_name"] = data["last_name"]
        if "name" in data:
            dep["name"] = data["name"]
        if "ssn" in data:
            dep["ssn"] = data["ssn"]
        if "relationship" in data:
            dep["relationship"] = data["relationship"]
        if "date_of_birth" in data:
            dep["date_of_birth"] = data["date_of_birth"]
            # Calculate age
            try:
                from datetime import datetime
                dob = datetime.strptime(data["date_of_birth"], "%m/%d/%Y")
                today = datetime.now()
                age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
                dep["age"] = age
                dep["qualifies_for_child_credit"] = age < 17
                dep["qualifies_for_other_dependent_credit"] = age >= 17
            except:
                pass
        
        # Update name if first/last provided
        if dep.get("first_name") or dep.get("last_name"):
            dep["name"] = f"{dep.get('first_name', '')} {dep.get('last_name', '')}".strip()
        
        # Update both locations
        dependents[dep_index] = dep
        
        result = collection.update_one(
            {"userId": user_id, "taxYear": tax_year},
            {"$set": {
                "dependents": dependents,
                "normalizedData.dependents": dependents,
                "updated_at": datetime.utcnow()
            }}
        )
        
        print(f"   ✅ Updated dependent {dep_index}: {dep.get('name', 'Unknown')}")
        
        # Check remaining missing fields
        personal = extract_personal_data_v2(session)
        filing_status = personal.get("filing_status", "")
        required_missing, _ = find_missing_fields(personal, filing_status, dependents)
        
        return {
            "success": True,
            "message": f"Updated dependent {dep_index + 1}",
            "dependent": dep,
            "missing_fields": [m["field"] for m in required_missing],
            "is_ready_to_file": len(required_missing) == 0
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# ✅ v2.1: GET FIELD LABELS
# ============================================================
@router.get("/form1040/labels")
async def get_field_labels():
    """Get human-readable labels for form fields."""
    return {
        "success": True,
        "labels": FIELD_LABELS,
        "required_all": REQUIRED_FIELDS_ALL,
        "required_mfj": REQUIRED_FIELDS_MFJ,
        "optional": OPTIONAL_FIELDS
    }


# ============================================================
# HEALTH CHECK
# ============================================================
@router.get("/health/status")
async def health():
    """Health check for user data router."""
    try:
        collection = get_collection()
        count = collection.count_documents({})
        
        return {
            "status": "ok",
            "service": "user-data-router",
            "version": "2.1",
            "mongodb": "connected",
            "sessions_count": count,
            "features": ["Form 1040 missing fields API", "Dependent SSN validation", "Multi-location data sync", "OBBB support"]
        }
    except Exception as e:
        return {
            "status": "error",
            "service": "user-data-router",
            "version": "2.1",
            "mongodb": "disconnected",
            "error": str(e)
        }