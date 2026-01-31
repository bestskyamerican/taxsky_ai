# ============================================================
# TAXSKY 2025 - UNIFIED PYTHON TAX API v4.7
# ============================================================
# ✅ v4.7: Added 5 more state PDF routers (IL, PA, NJ, GA, NC)
# ✅ v4.7: CLEANED - Removed redundant TAX_VALUES (tax_engine is source of truth)
# ✅ v4.6: Added user_data_router for direct React → Python data editing
# ✅ v4.5: Validator mode - reads structured data from MongoDB
# ============================================================
#
# NOTE: All tax values are in tax_engine/calculator.py (v8.2 OBBBA)
#       - Standard deductions, tax brackets, credits
#       - No Tax on Tips, Overtime, Car Loan Interest
#       - Senior Bonus Deduction
#       DO NOT duplicate tax values here!
#
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

# Tax Engine (contains ALL tax values and calculations)
try:
    from tax_engine import calculate_federal, calculate_state_tax
    TAX_ENGINE_AVAILABLE = True
    print("✅ Tax engine loaded (v8.2 OBBBA)")
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
# PDF ROUTERS - Federal
# ============================================================
try:
    from tax_generator.form_1040_router import form_1040_router
    FORM_1040_AVAILABLE = True
    print("✅ Form 1040 router loaded")
except ImportError as e:
    print(f"⚠️ Form 1040 router not available: {e}")
    FORM_1040_AVAILABLE = False
    form_1040_router = None

# ============================================================
# PDF ROUTERS - State Forms
# ============================================================
# California 540
try:
    from tax_generator.form_ca540_router import form_ca540_router
    FORM_CA540_AVAILABLE = True
    print("✅ CA Form 540 router loaded")
except ImportError as e:
    print(f"⚠️ CA Form 540 router not available: {e}")
    FORM_CA540_AVAILABLE = False
    form_ca540_router = None

# New York IT-201
try:
    from tax_generator.form_ny_it201_router import form_ny_it201_router
    FORM_NY_IT201_AVAILABLE = True
    print("✅ NY Form IT-201 router loaded")
except ImportError as e:
    print(f"⚠️ NY Form IT-201 router not available: {e}")
    FORM_NY_IT201_AVAILABLE = False
    form_ny_it201_router = None

# Additional States (IL, PA, NJ, GA, NC)
try:
    from tax_generator.additional_states_router import additional_states_router
    ADDITIONAL_STATES_AVAILABLE = True
    print("✅ Additional states router loaded (IL, PA, NJ, GA, NC)")
except ImportError as e:
    print(f"⚠️ Additional states router not available: {e}")
    ADDITIONAL_STATES_AVAILABLE = False
    additional_states_router = None

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
# USER DATA ROUTER (React calls Python directly!)
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
# HELPER FUNCTIONS (minimal - tax logic is in tax_engine)
# ============================================================
def safe_get(obj, key, default=0):
    """Safely get value from dict"""
    if isinstance(obj, dict):
        return obj.get(key, default)
    return default

# ============================================================
# APP SETUP
# ============================================================
app = FastAPI(
    title="TaxSky 2025 Tax API",
    description="Tax calculations, RAG knowledge, GPT-4 Vision OCR, 7 State PDF Forms",
    version="4.7.0"
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

# Federal PDF Router
if FORM_1040_AVAILABLE and form_1040_router:
    app.include_router(form_1040_router)
    print("📄 Registered: POST /generate/1040")

# California 540
if FORM_CA540_AVAILABLE and form_ca540_router:
    app.include_router(form_ca540_router)
    print("🌴 Registered: POST /generate/ca540")

# New York IT-201
if FORM_NY_IT201_AVAILABLE and form_ny_it201_router:
    app.include_router(form_ny_it201_router)
    print("🗽 Registered: POST /generate/ny-it201")

# Additional States (IL, PA, NJ, GA, NC)
if ADDITIONAL_STATES_AVAILABLE and additional_states_router:
    app.include_router(additional_states_router)
    print("🇺🇸 Registered: Additional state forms")
    print("   POST /generate/il-1040  → Illinois")
    print("   POST /generate/pa-40    → Pennsylvania")
    print("   POST /generate/nj-1040  → New Jersey")
    print("   POST /generate/ga-500   → Georgia")
    print("   POST /generate/nc-d400  → North Carolina")

# Validator Router
if EXTRACTOR_AVAILABLE and extractor_router:
    app.include_router(extractor_router)
    print("✅ Registered: /api/extract/* endpoints")

# User Data Router
if USER_DATA_AVAILABLE and user_data_router:
    app.include_router(user_data_router)
    print("👤 Registered: /api/user/* endpoints")

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
    # OBBBA fields
    tips_income: float = 0
    overtime_income: float = 0
    car_loan_interest: float = 0
    state: Optional[str] = None
    tax_year: int = 2025
    model_config = ConfigDict(extra="allow")

class QuestionInput(BaseModel):
    question: str
    state: Optional[str] = None

# ============================================================
# DEPENDENT VALIDATION
# ============================================================
def validate_dependents(data: dict):
    """Validate and count dependents from input data"""
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
                    if age < 17:
                        children_under_17 += 1
                    else:
                        other_deps += 1
                else:
                    if dep.get("qualifies_ctc"):
                        children_under_17 += 1
                    elif dep.get("qualifies_odc"):
                        other_deps += 1
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
        "version": "4.7.0",
        "tax_engine_version": "8.2 (OBBBA)",
        "features": {
            "tax_engine": TAX_ENGINE_AVAILABLE,
            "rag": RAG_AVAILABLE,
            "ocr": OCR_AVAILABLE,
            "form_1040": FORM_1040_AVAILABLE,
            "form_ca540": FORM_CA540_AVAILABLE,
            "form_ny_it201": FORM_NY_IT201_AVAILABLE,
            "additional_states": ADDITIONAL_STATES_AVAILABLE,
            "validator": EXTRACTOR_AVAILABLE,
            "user_data": USER_DATA_AVAILABLE,
        },
        "pdf_forms": {
            "federal": ["1040"],
            "states": ["CA-540", "NY-IT201", "IL-1040", "PA-40", "NJ-1040", "GA-500", "NC-D400"]
        }
    }

# ============================================================
# PDF FORM STATUS ENDPOINT
# ============================================================
@app.get("/forms/status")
def get_form_status():
    """Get status of all PDF form generators"""
    return {
        "federal": {
            "1040": {"available": FORM_1040_AVAILABLE, "endpoint": "POST /generate/1040"}
        },
        "states": {
            "CA": {"available": FORM_CA540_AVAILABLE, "form": "540", "endpoint": "POST /generate/ca540"},
            "NY": {"available": FORM_NY_IT201_AVAILABLE, "form": "IT-201", "endpoint": "POST /generate/ny-it201"},
            "IL": {"available": ADDITIONAL_STATES_AVAILABLE, "form": "IL-1040", "endpoint": "POST /generate/il-1040"},
            "PA": {"available": ADDITIONAL_STATES_AVAILABLE, "form": "PA-40", "endpoint": "POST /generate/pa-40"},
            "NJ": {"available": ADDITIONAL_STATES_AVAILABLE, "form": "NJ-1040", "endpoint": "POST /generate/nj-1040"},
            "GA": {"available": ADDITIONAL_STATES_AVAILABLE, "form": "500", "endpoint": "POST /generate/ga-500"},
            "NC": {"available": ADDITIONAL_STATES_AVAILABLE, "form": "D-400", "endpoint": "POST /generate/nc-d400"}
        },
        "no_tax_states": ["AK", "FL", "NV", "SD", "TN", "TX", "WA", "WY"],
        "total_supported": 7
    }

# ============================================================
# TAX CALCULATION ENDPOINTS
# ============================================================
@app.post("/calculate")
def calculate_tax_endpoint(data: TaxInput, language: str = "en"):
    """Calculate federal tax using tax_engine"""
    if not TAX_ENGINE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Tax engine not available")
    
    try:
        try:
            tax_data = data.model_dump()
        except AttributeError:
            tax_data = data.dict()
        
        # Validate dependents
        children, other, dep_status = validate_dependents(tax_data)
        tax_data["qualifying_children_under_17"] = children
        tax_data["other_dependents"] = other
        
        # Calculate federal tax (tax_engine has all correct 2025 values)
        result = calculate_federal(tax_data)
        
        # Calculate state tax if specified
        state = tax_data.get("state")
        if state:
            state_result = calculate_state_tax(state.upper(), tax_data)
            result["state"] = state_result
        
        # CTC validation
        ctc = result.get("child_tax_credit", 0)
        expected_ctc = children * 2000  # CTC is $2,000 per child in 2025
        ctc_validation = {
            "children_count": children,
            "expected_ctc": expected_ctc,
            "actual_ctc": ctc,
            "matches": abs(ctc - expected_ctc) < 1
        }
        
        return {
            "success": True, 
            "federal": result, 
            "ctc_validation": ctc_validation,
            "dependent_status": dep_status
        }
        
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/calculate/state/{state_code}")
def calculate_state_only(state_code: str, data: TaxInput, language: str = "en"):
    """Calculate state tax only"""
    if not TAX_ENGINE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Tax engine not available")
    
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
║        🐍 TaxSky Python Tax API v4.7 (CLEAN)                  ║
╠═══════════════════════════════════════════════════════════════╣
║  📊 Tax Engine: v8.2 OBBBA (Single Source of Truth!)          ║
║     • Standard Deductions: $15,750 / $31,500 / $23,625        ║
║     • No Tax on Tips (up to $25,000)                          ║
║     • No Tax on Overtime (up to $12,500/$25,000)              ║
║     • Car Loan Interest Deduction (up to $10,000)             ║
║     • Senior Bonus Deduction ($6,000 per 65+)                 ║
╠═══════════════════════════════════════════════════════════════╣
║  📄 PDF Forms: Federal 1040 + 7 States                        ║
║     CA-540, NY-IT201, IL-1040, PA-40, NJ-1040, GA-500, NC-D400║
╠═══════════════════════════════════════════════════════════════╣
║  🔍 RAG Knowledge | 👁️ OCR | 👤 User Data                     ║
╠═══════════════════════════════════════════════════════════════╣
║  📝 PDF Endpoints:                                            ║
║     POST /generate/1040      → Federal                        ║
║     POST /generate/ca540     → California                     ║
║     POST /generate/ny-it201  → New York                       ║
║     POST /generate/il-1040   → Illinois                       ║
║     POST /generate/pa-40     → Pennsylvania                   ║
║     POST /generate/nj-1040   → New Jersey                     ║
║     POST /generate/ga-500    → Georgia                        ║
║     POST /generate/nc-d400   → North Carolina                 ║
╚═══════════════════════════════════════════════════════════════╝
    """)
    
    uvicorn.run(app, host="0.0.0.0", port=5002)