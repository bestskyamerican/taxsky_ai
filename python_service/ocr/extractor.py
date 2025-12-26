# tax_engine/extractor.py
# ============================================================
# FASTAPI SERVER - ALL TAX FORM ENDPOINTS
# ============================================================

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import base64
import asyncio
from ocr import (
    extract_form,
    detect_form_type,
    extract_w2_backend,
    extract_1099_backend
)

app = FastAPI(title="TaxSky OCR Service", version="2.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================
# HEALTH CHECK
# ============================================================
@app.get("/health")
async def health():
    return {"status": "ok", "service": "TaxSky OCR", "version": "2.0"}

# ============================================================
# AUTO-DETECT FORM TYPE
# ============================================================
@app.post("/ocr/auto")
async def ocr_auto(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        base64_img = base64.b64encode(contents).decode('utf-8')
        
        # Detect and extract
        result = await extract_form(base64_img, None)
        
        return {
            "status": "success",
            "form_type": result.get("form_type", "UNKNOWN"),
            "extracted": result.get("data", {})
        }
    except Exception as e:
        return {"status": "error", "error": str(e)}

# ============================================================
# W-2
# ============================================================
@app.post("/ocr/w2")
async def ocr_w2(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        base64_img = base64.b64encode(contents).decode('utf-8')
        extracted = await extract_w2_backend(base64_img)
        return {"status": "success", "extracted": extracted}
    except Exception as e:
        return {"status": "error", "error": str(e)}

# ============================================================
# 1099-NEC
# ============================================================
@app.post("/ocr/nec")
async def ocr_nec(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        base64_img = base64.b64encode(contents).decode('utf-8')
        extracted = await extract_1099_backend("1099-NEC", base64_img)
        return {"status": "success", "extracted": extracted}
    except Exception as e:
        return {"status": "error", "error": str(e)}

# ============================================================
# 1099-INT
# ============================================================
@app.post("/ocr/int")
async def ocr_int(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        base64_img = base64.b64encode(contents).decode('utf-8')
        extracted = await extract_1099_backend("1099-INT", base64_img)
        return {"status": "success", "extracted": extracted}
    except Exception as e:
        return {"status": "error", "error": str(e)}

# ============================================================
# 1099-DIV
# ============================================================
@app.post("/ocr/div")
async def ocr_div(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        base64_img = base64.b64encode(contents).decode('utf-8')
        extracted = await extract_1099_backend("1099-DIV", base64_img)
        return {"status": "success", "extracted": extracted}
    except Exception as e:
        return {"status": "error", "error": str(e)}

# ============================================================
# 1099-B (Stock Sales)
# ============================================================
@app.post("/ocr/b")
async def ocr_b(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        base64_img = base64.b64encode(contents).decode('utf-8')
        extracted = await extract_1099_backend("1099-B", base64_img)
        return {"status": "success", "extracted": extracted}
    except Exception as e:
        return {"status": "error", "error": str(e)}

# ============================================================
# 1099-R (Retirement)
# ============================================================
@app.post("/ocr/r")
async def ocr_r(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        base64_img = base64.b64encode(contents).decode('utf-8')
        extracted = await extract_1099_backend("1099-R", base64_img)
        return {"status": "success", "extracted": extracted}
    except Exception as e:
        return {"status": "error", "error": str(e)}

# ============================================================
# 1099-G (Government/Unemployment)
# ============================================================
@app.post("/ocr/g")
async def ocr_g(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        base64_img = base64.b64encode(contents).decode('utf-8')
        extracted = await extract_1099_backend("1099-G", base64_img)
        return {"status": "success", "extracted": extracted}
    except Exception as e:
        return {"status": "error", "error": str(e)}

# ============================================================
# 1099-MISC
# ============================================================
@app.post("/ocr/misc")
async def ocr_misc(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        base64_img = base64.b64encode(contents).decode('utf-8')
        extracted = await extract_1099_backend("1099-MISC", base64_img)
        return {"status": "success", "extracted": extracted}
    except Exception as e:
        return {"status": "error", "error": str(e)}

# ============================================================
# 1099-K (PayPal, Venmo)
# ============================================================
@app.post("/ocr/k")
async def ocr_k(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        base64_img = base64.b64encode(contents).decode('utf-8')
        extracted = await extract_1099_backend("1099-K", base64_img)
        return {"status": "success", "extracted": extracted}
    except Exception as e:
        return {"status": "error", "error": str(e)}

# ============================================================
# SSA-1099 (Social Security)
# ============================================================
@app.post("/ocr/ssa")
async def ocr_ssa(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        base64_img = base64.b64encode(contents).decode('utf-8')
        extracted = await extract_1099_backend("SSA-1099", base64_img)
        return {"status": "success", "extracted": extracted}
    except Exception as e:
        return {"status": "error", "error": str(e)}

# ============================================================
# 1098 (Mortgage)
# ============================================================
@app.post("/ocr/mortgage")
async def ocr_mortgage(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        base64_img = base64.b64encode(contents).decode('utf-8')
        extracted = await extract_1099_backend("1098", base64_img)
        return {"status": "success", "extracted": extracted}
    except Exception as e:
        return {"status": "error", "error": str(e)}

# ============================================================
# 1098-T (Tuition)
# ============================================================
@app.post("/ocr/tuition")
async def ocr_tuition(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        base64_img = base64.b64encode(contents).decode('utf-8')
        extracted = await extract_1099_backend("1098-T", base64_img)
        return {"status": "success", "extracted": extracted}
    except Exception as e:
        return {"status": "error", "error": str(e)}

# ============================================================
# 1098-E (Student Loan)
# ============================================================
@app.post("/ocr/studentloan")
async def ocr_studentloan(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        base64_img = base64.b64encode(contents).decode('utf-8')
        extracted = await extract_1099_backend("1098-E", base64_img)
        return {"status": "success", "extracted": extracted}
    except Exception as e:
        return {"status": "error", "error": str(e)}

# ============================================================
# GENERIC GPT ENDPOINT (Fallback)
# ============================================================
@app.post("/ocr/gpt")
async def ocr_gpt(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        base64_img = base64.b64encode(contents).decode('utf-8')
        result = await extract_form(base64_img, None)
        return {
            "success": True,
            "form_type": result.get("form_type", "UNKNOWN"),
            "extracted": result.get("data", {})
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

# ============================================================
# RUN SERVER
# ============================================================
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5001)