# ============================================================
# TAXSKY 2025 - UNIFIED PYTHON TAX API v4.6
# ============================================================
# ✅ v4.6: Added user_data_router for direct React → Python data editing
# ✅ v4.5: Validator mode - reads structured data from MongoDB
# ✅ v4.4: Added POST /calculate/state for frontend dashboard
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
# PDF ROUTERS
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
# VALIDATOR ROUTER
# ============================================================
try:
    from tax_engine.extractor_router import router as extractor_router
    EXTRACTOR_AVAILABLE = True
    print("✅ Validator router loaded")
except ImportError as e:
    print(f"⚠️ Validator router not available: {e}")
    EXTRACTOR_AVAILABLE = False
    extractor_router = None

# ============================================================
# ✅ v4.6: USER DATA ROUTER (React calls Python directly!)
# ============================================================
try:
    from tax_engine.user_data_router import router as user_data_router
    USER_DATA_AVAILABLE = True
    print("✅ User data router loaded (React → Python direct!)")
except ImportError as e:
    print(f"⚠️ User data router not available: {e}")
    USER_DATA_AVAILABLE = False
    user_data_router = None

# ============================================================
# 2025 TAX VALUES
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
    if isinstance(obj, dict):
        return obj.get(key, default)
    return default

def calculate_age_from_dob(dob_string: str, tax_year: int = 2025) -> Optional[int]:
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
            return age
        return None
    except Exception as e:
        return None

def is_65_plus(dob_string: str, tax_year: int = 2025) -> bool:
    if not dob_string:
        return False
    age = calculate_age_from_dob(dob_string, tax_year)
    return age >= 65 if age else False

def get_standard_deduction(filing_status: str, taxpayer_65_plus: bool = False,
                          spouse_65_plus: bool = False, taxpayer_blind: bool = False,
                          spouse_blind: bool = False) -> int:
    status_key = filing_status.lower().replace(" ", "_")
    base = TAX_VALUES_2025["standard_deduction"].get(status_key, 14800)
    additional = 0
    is_married = "married" in status_key or status_key == "qualifying_surviving_spouse"
    add_per_condition = TAX_VALUES_2025["additional_standard_deduction"]["married" if is_married else "single_or_hoh"]
    if taxpayer_65_plus: additional += add_per_condition
    if taxpayer_blind: additional += add_per_condition
    if is_married and spouse_65_plus: additional += add_per_condition
    if is_married and spouse_blind: additional += add_per_condition
    return base + additional

# ============================================================
# APP SETUP
# ============================================================
app = FastAPI(
    title="TaxSky 2025 Tax API",
    description="Tax calculations, RAG knowledge, GPT-4 Vision OCR, User Data Management",
    version="4.6.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================
# REGISTER ALL ROUTERS
# ============================================================

# PDF Routers
if FORM_1040_AVAILABLE and form_1040_router:
    app.include_router(form_1040_router)
    print("📄 Registered: POST /generate/1040")

if FORM_CA540_AVAILABLE and form_ca540_router:
    app.include_router(form_ca540_router)
    print("🌴 Registered: POST /generate/ca540")

# Validator Router
if EXTRACTOR_AVAILABLE and extractor_router:
    app.include_router(extractor_router)
    print("✅ Registered: /api/extract/* endpoints")

# ✅ v4.6: User Data Router (React calls Python directly!)
if USER_DATA_AVAILABLE and user_data_router:
    app.include_router(user_data_router)
    print("👤 Registered: /api/user/* endpoints (React → Python direct!)")
    print("   GET  /api/user/{user_id}           - Get user data")
    print("   PUT  /api/user/{user_id}           - Update user data")
    print("   PUT  /api/user/{user_id}/dependents - Update dependents")
    print("   GET  /api/user/{user_id}/session   - Get session for SubmitFlow")
    print("   POST /api/user/{user_id}/session   - Save session")

# ============================================================
# MODELS
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
# DEPENDENT VALIDATION
# ============================================================
def validate_dependents(data: dict):
    has_dependents = data.get("has_dependents")
    if has_dependents is False:
        return (0, 0, "USER_INDICATED_NO_DEPENDENTS")
    dependents = data.get("dependents") or []
    if isinstance(dependents, list) and len(dependents) > 0:
        children_under_17 = 0
        other_deps = 0
        for dep in dependents:
            if isinstance(dep, dict):
                age = dep.get("age")
                if age is not None:
                    if age < 17: children_under_17 += 1
                    else: other_deps += 1
                else:
                    if dep.get("qualifies_ctc"): children_under_17 += 1
                    elif dep.get("qualifies_odc"): other_deps += 1
        return (children_under_17, other_deps, "FROM_DEPENDENTS_ARRAY")
    children = data.get("qualifying_children_under_17", 0) or 0
    other = data.get("other_dependents", 0) or 0
    return (int(children), int(other), "FROM_COUNTS")

# ============================================================
# HEALTH CHECK
# ============================================================
@app.get("/")
@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "TaxSky Python Tax API",
        "version": "4.6.0",
        "features": {
            "tax_engine": TAX_ENGINE_AVAILABLE,
            "rag": RAG_AVAILABLE,
            "ocr": OCR_AVAILABLE,
            "form_1040": FORM_1040_AVAILABLE,
            "form_ca540": FORM_CA540_AVAILABLE,
            "validator": EXTRACTOR_AVAILABLE,
            "user_data": USER_DATA_AVAILABLE,
        }
    }

# ============================================================
# TAX CALCULATION ENDPOINTS
# ============================================================
@app.post("/calculate")
def calculate_tax_endpoint(data: TaxInput, language: str = "en"):
    try:
        try:
            tax_data = data.model_dump()
        except AttributeError:
            tax_data = data.dict()
        children, other, status = validate_dependents(tax_data)
        tax_data["qualifying_children_under_17"] = children
        tax_data["other_dependents"] = other
        result = calculate_federal(tax_data)
        state = tax_data.get("state")
        if state:
            state_result = calculate_state_tax(state.upper(), tax_data)
            result["state"] = state_result
        ctc = result.get("child_tax_credit", 0)
        expected_ctc = children * 2000
        ctc_validation = {
            "children_count": children,
            "expected_ctc": expected_ctc,
            "actual_ctc": ctc,
            "matches": abs(ctc - expected_ctc) < 1
        }
        return {"success": True, "federal": result, "ctc_validation": ctc_validation}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/calculate/state/{state_code}")
def calculate_state_only(state_code: str, data: TaxInput, language: str = "en"):
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
# OCR ENDPOINTS
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
║        🐍 TaxSky Python Tax API v4.6                          ║
╠═══════════════════════════════════════════════════════════════╣
║  📊 Tax Calculator: Federal + 50 States                       ║
║  📄 PDF Generator: Form 1040, CA 540                          ║
║  🔍 RAG Knowledge: Tax rules & questions                      ║
║  👁️  OCR: GPT-4 Vision (ALL tax forms!)                       ║
║  👤 User Data: React calls Python directly!                   ║
╠═══════════════════════════════════════════════════════════════╣
║  ✅ NEW in v4.6: User Data Router                             ║
║  • GET  /api/user/{id}           - Get user data              ║
║  • PUT  /api/user/{id}           - Update user data           ║
║  • PUT  /api/user/{id}/dependents - Update dependents         ║
║  • GET  /api/user/{id}/session   - Get session                ║
║  • POST /api/user/{id}/session   - Save session               ║
╠═══════════════════════════════════════════════════════════════╣
║  ⚡ React (SubmitFlow.jsx) now calls Python directly!         ║
║     No more Node.js sessionDB.js errors!                      ║
╚═══════════════════════════════════════════════════════════════╝
    """)
    
    uvicorn.run(app, host="0.0.0.0", port=5002)