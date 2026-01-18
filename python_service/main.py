# ============================================================
# TAXSKY 2025 - UNIFIED PYTHON TAX API v4.4
# ============================================================
# ✅ v4.4: Added POST /calculate/state for frontend dashboard
# ✅ v4.3: Added Chat Extractor Router for AI interview data
# ✅ v4.2: Fixed Pydantic v2 deprecation warnings
# ✅ v4.1: Separate PDF routers (form_1040_router, form_ca540_router)
# ✅ v4.0: FIXED - Correct 2025 IRS values, spouse IRA/HSA, DOB
# ============================================================

from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict
from typing import Optional, Dict, Any, List
import uvicorn
import os
import base64
import traceback
from datetime import datetime, date

# ============================================================
# IMPORTS - With graceful fallbacks
# ============================================================

# Tax Engine
try:
    from tax_engine import calculate_federal, calculate_state_tax
    TAX_ENGINE_AVAILABLE = True
    print("✅ Tax engine loaded")
except ImportError as e:
    print(f"⚠️ Tax engine not available: {e}")
    TAX_ENGINE_AVAILABLE = False
    def calculate_federal(data): return {"error": "Tax engine not available"}
    def calculate_state_tax(state, data): return {"error": "Tax engine not available"}

# RAG Knowledge Base
try:
    from rag import answer_tax_question, load_federal_rag, load_state_rag, get_available_state_rags
    RAG_AVAILABLE = True
    print("✅ RAG loaded")
except ImportError as e:
    print(f"⚠️ RAG not available: {e}")
    RAG_AVAILABLE = False
    def answer_tax_question(q, s=None, l="en"): return "RAG not available"
    def load_federal_rag(): return False
    def load_state_rag(s): return False
    def get_available_state_rags(): return []

# i18n - Internationalization
try:
    from i18n import translate, get_supported_languages
    I18N_AVAILABLE = True
    print("✅ i18n loaded")
except ImportError:
    print("⚠️ i18n not available, using defaults")
    I18N_AVAILABLE = False
    def translate(key, lang="en"): return key
    def get_supported_languages(): return ["en", "es", "vi", "zh", "ko", "tl"]

# OCR with GPT-4 Vision
try:
    from ocr import extract_form, detect_form_type, extract_w2_backend, extract_1099_backend
    OCR_AVAILABLE = True
    print("✅ OCR loaded")
except ImportError as e:
    print(f"⚠️ OCR not available: {e}")
    OCR_AVAILABLE = False

# State Validation
try:
    from tax_engine.state_router import (
        validate_state_selection, 
        get_all_states,
        get_state_info,
        is_supported_state
    )
    STATE_ROUTER_AVAILABLE = True
    print("✅ State router loaded")
    
    # Create get_supported_states_list if not exists
    def get_supported_states_list():
        states = get_all_states()
        if isinstance(states, list):
            return [s.get("code") for s in states if s.get("supported", True)]
        return ["CA", "TX", "FL", "NY", "IL"]
        
except ImportError as e:
    print(f"⚠️ State router not available: {e}")
    STATE_ROUTER_AVAILABLE = False
    def validate_state_selection(s): return {"valid": True, "state": s}
    def get_supported_states_list(): return ["CA", "TX", "FL", "NY", "IL"]
    def get_all_states(): return []
    def get_state_info(s): return {"state": s}
    def is_supported_state(s): return True

# ============================================================
# ✅ PDF ROUTERS - Separate files for each form
# ============================================================
try:
    from tax_generator.form_1040_router import form_1040_router
    FORM_1040_AVAILABLE = True
    print("✅ Form 1040 router loaded")
except ImportError as e:
    print(f"⚠️ Form 1040 router not available: {e}")
    FORM_1040_AVAILABLE = False
    form_1040_router = None

try:
    from tax_generator.form_ca540_router import form_ca540_router
    FORM_CA540_AVAILABLE = True
    print("✅ CA Form 540 router loaded")
except ImportError as e:
    print(f"⚠️ CA Form 540 router not available: {e}")
    FORM_CA540_AVAILABLE = False
    form_ca540_router = None

# ============================================================
# ✅ NEW: CHAT EXTRACTOR ROUTER
# ============================================================
try:
    from tax_engine.extractor_router import router as extractor_router
    EXTRACTOR_AVAILABLE = True
    print("✅ Chat Extractor router loaded")
except ImportError as e:
    print(f"⚠️ Chat Extractor not available: {e}")
    EXTRACTOR_AVAILABLE = False
    extractor_router = None

# ============================================================
# ✅ CORRECT 2025 TAX VALUES (IRS Rev. Proc. 2024-40)
# ============================================================
TAX_VALUES_2025 = {
    "standard_deduction": {
        "single": 14800,
        "married_filing_jointly": 29600,
        "married_filing_separately": 14800,
        "head_of_household": 22200,
        "qualifying_surviving_spouse": 29600
    },
    "additional_standard_deduction": {
        "single_or_hoh": 1850,
        "married": 1500
    },
    "child_tax_credit": 2000,
    "actc_max": 1700,
    "other_dependents_credit": 500,
    "eitc_max": {0: 649, 1: 4328, 2: 7152, 3: 8046},
    "ira_limit": {"under_50": 7000, "over_50": 8000},
    "hsa_limit": {"self": 4300, "family": 8550},
    "student_loan_max": 2500
}

# ============================================================
# HELPER FUNCTIONS
# ============================================================
def safe_get(obj, key, default=0):
    """Safely get a value from dict, handling float/int returns"""
    if isinstance(obj, dict):
        return obj.get(key, default)
    return default


def calculate_age_from_dob(dob_string: str, tax_year: int = 2025) -> Optional[int]:
    """Calculate age from date of birth string."""
    if not dob_string:
        return None
    
    try:
        birth_year = None
        
        if '-' in dob_string and len(dob_string) >= 10:
            parts = dob_string.split('-')
            if len(parts[0]) == 4:
                birth_year = int(parts[0])
        
        if not birth_year and '/' in dob_string:
            parts = dob_string.split('/')
            if len(parts) == 3 and len(parts[2]) == 4:
                birth_year = int(parts[2])
        
        if not birth_year:
            import re
            year_match = re.search(r'\b(19\d{2}|20\d{2})\b', dob_string)
            if year_match:
                birth_year = int(year_match.group(1))
        
        if birth_year:
            age = tax_year - birth_year
            print(f"📅 Calculated age from DOB {dob_string}: {age} years")
            return age
        
        return None
        
    except Exception as e:
        print(f"⚠️ Error parsing DOB {dob_string}: {e}")
        return None


def is_65_plus(dob_string: str, tax_year: int = 2025) -> bool:
    """Check if person is 65+ for tax year."""
    if not dob_string:
        return False
    
    age = calculate_age_from_dob(dob_string, tax_year)
    if age is None:
        return False
    
    return age >= 65


def get_standard_deduction(filing_status: str, taxpayer_65_plus: bool = False,
                          spouse_65_plus: bool = False, taxpayer_blind: bool = False,
                          spouse_blind: bool = False) -> int:
    """Get correct 2025 standard deduction with additional amounts."""
    status_key = filing_status.lower().replace(" ", "_")
    
    base = TAX_VALUES_2025["standard_deduction"].get(status_key, 14800)
    
    additional = 0
    is_married = "married" in status_key or status_key == "qualifying_surviving_spouse"
    add_per_condition = TAX_VALUES_2025["additional_standard_deduction"]["married" if is_married else "single_or_hoh"]
    
    if taxpayer_65_plus:
        additional += add_per_condition
    if taxpayer_blind:
        additional += add_per_condition
    if is_married and spouse_65_plus:
        additional += add_per_condition
    if is_married and spouse_blind:
        additional += add_per_condition
    
    total = base + additional
    print(f"📋 Standard Deduction: base=${base:,} + additional=${additional:,} = ${total:,}")
    return total


# ============================================================
# APP SETUP
# ============================================================
app = FastAPI(
    title="TaxSky 2025 Tax API",
    description="Tax calculations, RAG knowledge, GPT-4 Vision OCR, and AI Chat Extractor",
    version="4.4.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================
# ✅ REGISTER ROUTERS
# ============================================================

# PDF Routers
if FORM_1040_AVAILABLE and form_1040_router:
    app.include_router(form_1040_router)
    print("📄 Registered: POST /generate/1040")

if FORM_CA540_AVAILABLE and form_ca540_router:
    app.include_router(form_ca540_router)
    print("🌴 Registered: POST /generate/ca540")

# ✅ NEW: Chat Extractor Router
if EXTRACTOR_AVAILABLE and extractor_router:
    app.include_router(extractor_router)
    print("🤖 Registered: POST /api/extract/session")
    print("🤖 Registered: POST /api/extract/validate")
    print("🤖 Registered: GET  /api/extract/status/{user_id}")
    print("🤖 Registered: POST /api/extract/webhook/interview-complete")

# ============================================================
# MODELS - ✅ FIXED: Using ConfigDict instead of class Config
# ============================================================
class TaxInput(BaseModel):
    filing_status: str = "single"
    wages: float = 0
    federal_withholding: float = 0
    state_withholding: float = 0
    self_employment_income: float = 0
    interest_income: float = 0
    dividend_income: float = 0
    qualified_dividends: float = 0
    capital_gains: float = 0
    retirement_income: float = 0
    social_security_benefits: float = 0
    unemployment_income: float = 0
    other_income: float = 0
    
    ira_contributions: float = 0
    spouse_ira: float = 0
    hsa_contributions: float = 0
    spouse_hsa: float = 0
    student_loan_interest: float = 0
    adjustments: float = 0
    
    itemized_deductions: Optional[Any] = None
    
    has_dependents: Optional[bool] = None
    dependents: Optional[List[Dict]] = None
    qualifying_children_under_17: int = 0
    other_dependents: int = 0
    children_under_6: int = 0
    
    taxpayer_dob: Optional[str] = None
    spouse_dob: Optional[str] = None
    taxpayer_65_plus: bool = False
    spouse_65_plus: bool = False
    taxpayer_blind: bool = False
    spouse_blind: bool = False
    taxpayer_50_plus: bool = False
    spouse_50_plus: bool = False
    
    state: Optional[str] = None
    tax_year: int = 2025
    
    model_config = ConfigDict(extra="allow")


class QuestionInput(BaseModel):
    question: str
    state: Optional[str] = None


class RefundInput(BaseModel):
    filing_status: str = "single"
    wages: float = 0
    federal_withholding: float = 0
    children_under_17: int = 0


# ============================================================
# DEPENDENT VALIDATION - ✅ FIXED
# ============================================================
def validate_dependents(data: dict):
    """
    Validate dependents and return (children_under_17, other_deps, validation_status)
    """
    # Check has_dependents flag
    has_dependents = data.get("has_dependents")
    
    if has_dependents is False:
        print("⚠️ User explicitly said NO dependents - CTC = $0")
        return (0, 0, "USER_INDICATED_NO_DEPENDENTS")
    
    # Check dependents array
    dependents = data.get("dependents") or []
    
    if not dependents:
        if has_dependents is True:
            print("⚠️ has_dependents=True but no dependents array!")
        return (0, 0, "DEPENDENTS_ARRAY_EMPTY" if has_dependents else "NO_DEPENDENTS_FOUND")
    
    children_under_17 = 0
    other_deps = 0
    
    for dep in dependents:
        age = dep.get("age", 0)
        if isinstance(age, str):
            try:
                age = int(age)
            except:
                age = 0
        
        if age < 17:
            children_under_17 += 1
        else:
            other_deps += 1
    
    print(f"✅ Dependents: {children_under_17} under 17, {other_deps} other")
    return (children_under_17, other_deps, "VALIDATED")


# ============================================================
# HEALTH CHECK
# ============================================================
@app.get("/")
def health_check():
    return {
        "status": "healthy",
        "api": "TaxSky Python Tax API",
        "version": "4.4.0",
        "features": {
            "tax_engine": TAX_ENGINE_AVAILABLE,
            "rag": RAG_AVAILABLE,
            "i18n": I18N_AVAILABLE,
            "ocr": OCR_AVAILABLE,
            "form_1040": FORM_1040_AVAILABLE,
            "form_ca540": FORM_CA540_AVAILABLE,
            "extractor": EXTRACTOR_AVAILABLE,
        }
    }


@app.get("/health")
def health():
    return {"status": "ok", "timestamp": datetime.now().isoformat()}


# ============================================================
# ✅ NEW: STATE TAX CALCULATION FOR FRONTEND DASHBOARD
# ============================================================
@app.post("/calculate/state")
async def calculate_state_for_dashboard(request: Request):
    """
    Calculate state tax for frontend dashboard
    
    POST /calculate/state
    {
        "state": "CA",
        "filing_status": "single",
        "federal_agi": 112000,
        "wages": 120000,
        "state_withholding": 0,
        "is_renter": false,
        "num_children": 0
    }
    """
    try:
        data = await request.json()
        state_code = (data.get("state") or "CA").upper()
        
        print(f"\n{'='*50}")
        print(f"📊 POST /calculate/state - {state_code}")
        print(f"   Filing Status: {data.get('filing_status', 'single')}")
        print(f"   Federal AGI: ${data.get('federal_agi', 0):,}")
        print(f"   Wages: ${data.get('wages', 0):,}")
        print(f"   State Withholding: ${data.get('state_withholding', 0):,}")
        
        # Call the state tax calculator
        result = calculate_state_tax(state_code, data)
        
        # Log result
        if isinstance(result, dict):
            print(f"✅ {state_code} Result:")
            print(f"   State: {result.get('state_name', state_code)}")
            print(f"   Has Tax: {result.get('has_income_tax', True)}")
            print(f"   Total Tax: ${result.get('total_tax', 0):,.2f}")
            print(f"   Refund: ${result.get('refund', 0):,.2f}")
            print(f"   Owed: ${result.get('amount_owed', 0):,.2f}")
        
        return result
        
    except Exception as e:
        print(f"❌ State calculation error: {e}")
        traceback.print_exc()
        return {
            "error": str(e),
            "state": data.get("state", "CA") if 'data' in dir() else "CA",
            "has_income_tax": True,
            "support_level": "error"
        }


@app.get("/states")
def list_states():
    """List all states with their tax info"""
    try:
        states = get_all_states()
        return {"states": states, "count": len(states) if isinstance(states, list) else 0}
    except Exception as e:
        return {"error": str(e)}


# ============================================================
# TAX CALCULATION ENDPOINTS
# ============================================================
@app.post("/calculate")
def calculate_tax(data: TaxInput, language: str = "en"):
    """Full tax calculation with federal + state"""
    try:
        try:
            tax_data = data.model_dump()
        except AttributeError:
            tax_data = data.dict()
        
        # Process DOB for age
        if tax_data.get("taxpayer_dob"):
            age = calculate_age_from_dob(tax_data["taxpayer_dob"])
            if age:
                tax_data["taxpayer_65_plus"] = age >= 65
                tax_data["taxpayer_50_plus"] = age >= 50
        
        if tax_data.get("spouse_dob"):
            spouse_age = calculate_age_from_dob(tax_data["spouse_dob"])
            if spouse_age:
                tax_data["spouse_65_plus"] = spouse_age >= 65
                tax_data["spouse_50_plus"] = spouse_age >= 50
        
        # Validate dependents
        children_under_17, other_deps, ctc_validation = validate_dependents(tax_data)
        tax_data['qualifying_children_under_17'] = children_under_17
        tax_data['other_dependents'] = other_deps
        
        # Process adjustments
        ira = min(tax_data.get("ira_contributions", 0), 
                  8000 if tax_data.get("taxpayer_50_plus") else 7000)
        spouse_ira = min(tax_data.get("spouse_ira", 0), 
                        8000 if tax_data.get("spouse_50_plus") else 7000)
        hsa = tax_data.get("hsa_contributions", 0)
        spouse_hsa = tax_data.get("spouse_hsa", 0)
        student_loan = min(tax_data.get("student_loan_interest", 0), 2500)
        
        total_adjustments = ira + spouse_ira + hsa + spouse_hsa + student_loan
        tax_data['adjustments'] = total_adjustments
        
        # Federal calculation
        federal_result = calculate_federal(tax_data)
        
        if isinstance(federal_result, dict) and ctc_validation in ["USER_INDICATED_NO_DEPENDENTS", "DEPENDENTS_ARRAY_EMPTY", "NO_DEPENDENTS_FOUND"]:
            federal_result['child_tax_credit'] = 0
            federal_result['ctc_validation'] = ctc_validation
        
        # State calculation
        state_result = None
        state_code = tax_data.get("state")
        if state_code:
            tax_data['federal_agi'] = safe_get(federal_result, "agi", 0)
            state_result = calculate_state_tax(state_code.upper(), tax_data)
        
        # Calculate totals
        fed_refund = safe_get(federal_result, "refund", 0)
        fed_owed = safe_get(federal_result, "amount_owed", 0)
        state_refund = safe_get(state_result, "refund", 0) if state_result else 0
        state_owed = safe_get(state_result, "amount_owed", 0) if state_result else 0
        total_net = (fed_refund + state_refund) - (fed_owed + state_owed)
        
        return {
            "success": True,
            "tax_year": 2025,
            "federal": federal_result,
            "state": state_result,
            "summary": {
                "federal_refund": fed_refund,
                "federal_owed": fed_owed,
                "state_refund": state_refund,
                "state_owed": state_owed,
                "net_result": total_net,
                "child_tax_credit": safe_get(federal_result, "child_tax_credit", 0),
                "eitc": safe_get(federal_result, "eitc", 0)
            },
            "adjustments": {
                "ira": ira,
                "spouse_ira": spouse_ira,
                "hsa": hsa,
                "spouse_hsa": spouse_hsa,
                "student_loan": min(student_loan, 2500),
                "total": total_adjustments
            }
        }
        
    except Exception as e:
        print(f"❌ Tax calculation error: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/calculate/federal")
def calculate_federal_only(data: TaxInput, language: str = "en"):
    """Calculate federal tax only"""
    try:
        try:
            tax_data = data.model_dump()
        except AttributeError:
            tax_data = data.dict()
        
        children_under_17, other_deps, ctc_validation = validate_dependents(tax_data)
        tax_data['qualifying_children_under_17'] = children_under_17
        tax_data['other_dependents'] = other_deps
        
        result = calculate_federal(tax_data)
        
        if isinstance(result, dict) and ctc_validation in ["USER_INDICATED_NO_DEPENDENTS", "DEPENDENTS_ARRAY_EMPTY", "NO_DEPENDENTS_FOUND"]:
            result['child_tax_credit'] = 0
            result['ctc_validation'] = ctc_validation
        
        return {"success": True, "federal": result, "ctc_validation": ctc_validation}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/calculate/state/{state_code}")
def calculate_state_only(state_code: str, data: TaxInput, language: str = "en"):
    """Calculate state tax only"""
    try:
        try:
            tax_data = data.model_dump()
        except AttributeError:
            tax_data = data.dict()
        
        result = calculate_state_tax(state_code.upper(), tax_data)
        return {"success": True, "state": result}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# STATE VALIDATION ENDPOINTS
# ============================================================
@app.get("/states/validate/{state_code}")
def validate_state(state_code: str):
    return validate_state_selection(state_code.upper())


@app.get("/states/supported")
def get_supported_states():
    return get_supported_states_list()


@app.get("/states/all")
def list_all_states():
    return get_all_states()


@app.get("/states/info/{state_code}")
def state_info(state_code: str):
    return get_state_info(state_code.upper())


@app.get("/states/check/{state_code}")
def check_state_support(state_code: str):
    return {"state": state_code.upper(), "supported": is_supported_state(state_code.upper())}


# ============================================================
# RAG KNOWLEDGE ENDPOINTS
# ============================================================
@app.post("/rag/question")
def ask_question(data: QuestionInput, language: str = "en"):
    try:
        answer = answer_tax_question(data.question, data.state, language)
        return {"success": True, "question": data.question, "answer": answer}
    except Exception as e:
        return {"success": False, "error": str(e)}


@app.get("/rag/load/federal")
def load_federal():
    try:
        result = load_federal_rag()
        return {"success": True, "loaded": result}
    except Exception as e:
        return {"success": False, "error": str(e)}


@app.get("/rag/load/state/{state_code}")
def load_state(state_code: str):
    try:
        result = load_state_rag(state_code.upper())
        return {"success": True, "state": state_code.upper(), "loaded": result}
    except Exception as e:
        return {"success": False, "error": str(e)}


@app.get("/rag/status")
def rag_status():
    return {"success": True, "federal_rag": True, "available_states": get_available_state_rags()}


@app.get("/languages")
def list_languages():
    return {"success": True, "languages": get_supported_languages()}


# ============================================================
# OCR ENDPOINTS - GPT-4 VISION (Graceful handling when not available)
# ============================================================
@app.post("/ocr/auto")
async def ocr_auto(file: UploadFile = File(...)):
    if not OCR_AVAILABLE:
        return {"status": "error", "error": "OCR not available"}
    try:
        contents = await file.read()
        base64_img = base64.b64encode(contents).decode('utf-8')
        result = await extract_form(base64_img, None)
        return {"status": "success", "form_type": result.get("form_type", "UNKNOWN"), "extracted": result.get("data", {})}
    except Exception as e:
        return {"status": "error", "error": str(e)}


@app.post("/ocr/w2")
async def ocr_w2(file: UploadFile = File(...)):
    if not OCR_AVAILABLE:
        return {"status": "error", "error": "OCR not available"}
    try:
        contents = await file.read()
        base64_img = base64.b64encode(contents).decode('utf-8')
        extracted = await extract_w2_backend(base64_img)
        return {"status": "success", "form_type": "W-2", "extracted": extracted}
    except Exception as e:
        return {"status": "error", "error": str(e)}


@app.post("/ocr/nec")
async def ocr_nec(file: UploadFile = File(...)):
    if not OCR_AVAILABLE:
        return {"status": "error", "error": "OCR not available"}
    try:
        contents = await file.read()
        base64_img = base64.b64encode(contents).decode('utf-8')
        extracted = await extract_1099_backend("1099-NEC", base64_img)
        return {"status": "success", "form_type": "1099-NEC", "extracted": extracted}
    except Exception as e:
        return {"status": "error", "error": str(e)}


@app.post("/ocr/int")
async def ocr_int(file: UploadFile = File(...)):
    if not OCR_AVAILABLE:
        return {"status": "error", "error": "OCR not available"}
    try:
        contents = await file.read()
        base64_img = base64.b64encode(contents).decode('utf-8')
        extracted = await extract_1099_backend("1099-INT", base64_img)
        return {"status": "success", "form_type": "1099-INT", "extracted": extracted}
    except Exception as e:
        return {"status": "error", "error": str(e)}


@app.post("/ocr/div")
async def ocr_div(file: UploadFile = File(...)):
    if not OCR_AVAILABLE:
        return {"status": "error", "error": "OCR not available"}
    try:
        contents = await file.read()
        base64_img = base64.b64encode(contents).decode('utf-8')
        extracted = await extract_1099_backend("1099-DIV", base64_img)
        return {"status": "success", "form_type": "1099-DIV", "extracted": extracted}
    except Exception as e:
        return {"status": "error", "error": str(e)}


@app.post("/ocr/r")
async def ocr_r(file: UploadFile = File(...)):
    if not OCR_AVAILABLE:
        return {"status": "error", "error": "OCR not available"}
    try:
        contents = await file.read()
        base64_img = base64.b64encode(contents).decode('utf-8')
        extracted = await extract_1099_backend("1099-R", base64_img)
        return {"status": "success", "form_type": "1099-R", "extracted": extracted}
    except Exception as e:
        return {"status": "error", "error": str(e)}


@app.post("/ocr/ssa")
async def ocr_ssa(file: UploadFile = File(...)):
    if not OCR_AVAILABLE:
        return {"status": "error", "error": "OCR not available"}
    try:
        contents = await file.read()
        base64_img = base64.b64encode(contents).decode('utf-8')
        extracted = await extract_1099_backend("SSA-1099", base64_img)
        return {"status": "success", "form_type": "SSA-1099", "extracted": extracted}
    except Exception as e:
        return {"status": "error", "error": str(e)}


# ============================================================
# RUN SERVER
# ============================================================
if __name__ == "__main__":
    print("""
╔═══════════════════════════════════════════════════════════════╗
║        🐍 TaxSky Python Tax API v4.4                          ║
╠═══════════════════════════════════════════════════════════════╣
║  📊 Tax Calculator: Federal + 50 States                       ║
║  📄 PDF Generator: Form 1040, CA 540                          ║
║  🔍 RAG Knowledge: Tax rules & questions                      ║
║  👁️  OCR: GPT-4 Vision (ALL tax forms!)                       ║
║  🤖 Chat Extractor (AI interview → Form 1040)                 ║
╠═══════════════════════════════════════════════════════════════╣
║  State Tax Endpoint (for Dashboard):                          ║
║  • POST /calculate/state  → Calculate any state tax           ║
║  • GET  /states           → List all states                   ║
╠═══════════════════════════════════════════════════════════════╣
║  PDF Endpoints:                                               ║
║  • POST /generate/1040   → Federal Form 1040                  ║
║  • POST /generate/ca540  → California Form 540                ║
╠═══════════════════════════════════════════════════════════════╣
║  🤖 Extractor Endpoints:                                      ║
║  • POST /api/extract/session   → Extract from chat            ║
║  • POST /api/extract/validate  → Validate data                ║
║  • GET  /api/extract/status/{user_id} → Check status          ║
║  • POST /api/extract/webhook/interview-complete               ║
╚═══════════════════════════════════════════════════════════════╝
    """)
    
    uvicorn.run(app, host="0.0.0.0", port=5002)