# ================================================================
#  TaxSky AI Backend – OCR + GPT Vision + CPA Assistant
#  ENHANCED: /ocr/auto now detects form type AND extracts fields
# ================================================================

from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from tax_engine.ocr import extract_w2_backend, extract_1099_backend
from tax_engine.session_db import get_or_create_tax_session, save_session, session_to_dict
from tax_engine.refund import estimate_refund

from PIL import Image
import pytesseract
import io
import re
import base64
import json
import os

from dotenv import load_dotenv
from openai import OpenAI

# -------------------------------
# SETUP
# -------------------------------
load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

app = FastAPI(title="TaxSky AI Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------------
# HELPERS
# -------------------------------
def _search(pattern, text):
    match = re.search(pattern, text, re.IGNORECASE)
    return match.group(1) if match else None


def extract_w2_fields(text: str):
    """Fallback regex-based W-2 extraction."""
    return {
        "raw_text": text,
        "employer_ein": _search(r"\b(\d{2}-\d{7})\b", text),
        "wages": _search(r"Box\s*1[:\s]*\$?([\d,]+\.\d{2})", text)
                 or _search(r"Wages.*?\$?([\d,]+\.\d{2})", text),
        "federal_withheld": _search(r"Box\s*2.*?([\d,]+\.\d{2})", text)
                            or _search(r"Federal.*?([\d,]+\.\d{2})", text),
        "ss_wages": _search(r"Box\s*3.*?([\d,]+\.\d{2})", text),
        "employer_name": _search(r"Employer[:\s]*([A-Za-z0-9 .,&'-]+)", text),
        "employee_name": _search(r"Employee[:\s]*([A-Za-z0-9 .,&'-]+)", text),
    }


def clean_json(raw: str):
    """Remove ```json wrappers and clean formatting."""
    cleaned = raw.replace("```json", "").replace("```", "").strip()
    return json.loads(cleaned)


# ================================================================
# ROOT ENDPOINT
# ================================================================
@app.get("/")
async def root():
    """API info and available endpoints"""
    return {
        "service": "TaxSky AI Backend",
        "status": "online",
        "version": "2.1",
        "endpoints": {
            "ocr": {
                "w2": "/ocr/w2",
                "1099-nec": "/ocr/nec",
                "1099-int": "/ocr/int",
                "gpt_vision": "/ocr/gpt",
                "1099_general": "/ocr/1099",
                "tesseract": "/ocr/extract",
                "auto_detect": "/ocr/auto"
            },
            "cpa": {
                "chat": "/cpa/chat",
                "analyze_w2": "/cpa/analyze/w2",
                "process_document": "/cpa/document"
            }
        }
    }


@app.get("/health")
async def health():
    """Health check"""
    return {"status": "healthy", "service": "taxsky-python"}


# ================================================================
# NODE.JS INTEGRATION ENDPOINTS (for uploadRoutes.js)
# ================================================================

@app.post("/ocr/w2")
async def ocr_w2_nodejs(file: UploadFile = File(...)):
    """W-2 extraction endpoint for Node.js integration"""
    try:
        contents = await file.read()
        base64_img = base64.b64encode(contents).decode()
        
        extracted = await extract_w2_backend(base64_img)
        
        # ✅ Validate W-2 numbers
        extracted = validate_w2_numbers(extracted)
        
        return {
            "status": "success",
            "form_type": "W-2",
            "extracted": extracted
        }
    except Exception as e:
        print(f"W-2 OCR ERROR: {e}")
        return {
            "status": "error",
            "error": str(e)
        }


@app.post("/ocr/nec")
async def ocr_1099_nec_nodejs(file: UploadFile = File(...)):
    """1099-NEC extraction endpoint for Node.js integration"""
    try:
        contents = await file.read()
        base64_img = base64.b64encode(contents).decode()
        
        extracted = await extract_1099_backend("1099-NEC", base64_img)
        
        return {
            "status": "success",
            "form_type": "1099-NEC",
            "extracted": extracted
        }
    except Exception as e:
        print(f"1099-NEC OCR ERROR: {e}")
        return {
            "status": "error",
            "error": str(e)
        }


@app.post("/ocr/int")
async def ocr_1099_int_nodejs(file: UploadFile = File(...)):
    """1099-INT extraction endpoint for Node.js integration"""
    try:
        contents = await file.read()
        base64_img = base64.b64encode(contents).decode()
        
        extracted = await extract_1099_backend("1099-INT", base64_img)
        
        return {
            "status": "success",
            "form_type": "1099-INT",
            "extracted": extracted
        }
    except Exception as e:
        print(f"1099-INT OCR ERROR: {e}")
        return {
            "status": "error",
            "error": str(e)
        }


# ================================================================
# 1) TESSERACT OCR (EXISTING)
# ================================================================
@app.post("/ocr/extract")
async def extract_ocr(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        image = Image.open(io.BytesIO(contents))
        text = pytesseract.image_to_string(image)
        fields = extract_w2_fields(text)
        return {"success": True, "extracted_fields": fields}
    except Exception as e:
        print("OCR ERROR:", e)
        return {"error": "OCR failed"}


# ================================================================
# 2) GPT VISION – W-2 Extraction (EXISTING)
# ================================================================
@app.post("/ocr/gpt")
async def gpt_extract(file: UploadFile):
    try:
        contents = await file.read()
        b64 = base64.b64encode(contents).decode()

        completion = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": "Extract W-2 fields. JSON only."
                },
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": "Extract all W-2 fields."},
                        {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{b64}"}}
                    ],
                },
            ],
        )

        return {"success": True, "extracted": clean_json(completion.choices[0].message.content)}

    except Exception as e:
        print("GPT OCR ERROR:", e)
        return {"error": str(e)}


# ================================================================
# 3) GPT VISION – 1099 OCR (EXISTING)
# ================================================================
@app.post("/ocr/1099")
async def ocr_1099(file: UploadFile):
    try:
        contents = await file.read()
        b64 = base64.b64encode(contents).decode()

        prompt = "Extract key fields from 1099 NEC / INT / MISC. Return JSON only."

        completion = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": prompt},
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": "Extract fields."},
                        {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{b64}"}}
                    ],
                },
            ],
        )

        return {"success": True, "extracted": clean_json(completion.choices[0].message.content)}

    except Exception as e:
        print("GPT 1099 OCR ERROR:", e)
        return {"error": str(e)}


# ================================================================
# W-2 VALIDATION - Check if numbers make sense
# ================================================================
def validate_w2_numbers(extracted: dict) -> dict:
    """
    Validate W-2 numbers for sanity. Flag suspicious values.
    """
    try:
        wages = float(extracted.get("wages_tips_other_comp", 0) or 0)
        ss_wages = float(extracted.get("social_security_wages", 0) or 0)
        medicare_wages = float(extracted.get("medicare_wages", 0) or 0)
        fed_withheld = float(extracted.get("federal_income_tax_withheld", 0) or 0)
        ss_tax = float(extracted.get("social_security_tax_withheld", 0) or 0)
        medicare_tax = float(extracted.get("medicare_tax_withheld", 0) or 0)
        
        warnings = []
        
        # Check 1: Wages should roughly match SS wages and Medicare wages
        if wages > 0 and ss_wages > 0:
            if abs(wages - ss_wages) / wages > 0.1:  # More than 10% difference
                # ss_wages might be more accurate if they match medicare_wages
                if ss_wages == medicare_wages and ss_wages > wages:
                    print(f"⚠️ VALIDATION: wages ({wages}) seems too low. SS wages is {ss_wages}")
                    extracted["wages_tips_other_comp"] = ss_wages
                    wages = ss_wages
                    warnings.append(f"Corrected wages from {wages} to {ss_wages}")
        
        # Check 2: Federal withheld should be reasonable (0-30% of wages)
        if wages > 0 and fed_withheld > 0:
            ratio = fed_withheld / wages
            if ratio > 0.35:  # More than 35% withheld is very unusual
                print(f"⚠️ VALIDATION: Federal withheld ({fed_withheld}) seems too high for wages ({wages})")
                warnings.append(f"Federal withheld {fed_withheld} is {ratio*100:.1f}% of wages - verify manually")
            elif ratio < 0.01 and wages > 10000:  # Less than 1% for decent wages
                print(f"⚠️ VALIDATION: Federal withheld ({fed_withheld}) seems too low for wages ({wages})")
                warnings.append(f"Federal withheld {fed_withheld} is only {ratio*100:.1f}% of wages - verify manually")
        
        # Check 3: SS tax should be ~6.2% of SS wages
        if ss_wages > 0 and ss_tax > 0:
            expected_ss = ss_wages * 0.062
            if abs(ss_tax - expected_ss) / expected_ss > 0.05:  # More than 5% off
                print(f"⚠️ VALIDATION: SS tax ({ss_tax}) doesn't match expected ({expected_ss:.2f})")
                warnings.append(f"SS tax should be ~${expected_ss:.2f}")
        
        # Check 4: Medicare tax should be ~1.45% of Medicare wages
        if medicare_wages > 0 and medicare_tax > 0:
            expected_medicare = medicare_wages * 0.0145
            if abs(medicare_tax - expected_medicare) / expected_medicare > 0.05:
                print(f"⚠️ VALIDATION: Medicare tax ({medicare_tax}) doesn't match expected ({expected_medicare:.2f})")
                warnings.append(f"Medicare tax should be ~${expected_medicare:.2f}")
        
        # Add warnings to extracted data
        if warnings:
            extracted["_validation_warnings"] = warnings
            print(f"⚠️ W-2 VALIDATION WARNINGS: {warnings}")
        
        return extracted
        
    except Exception as e:
        print(f"Validation error: {e}")
        return extracted


# ================================================================
# 4) AUTO DOCUMENT DETECTION + EXTRACTION (Uses ocr.py)
# ================================================================
@app.post("/ocr/auto")
async def auto_detect(file: UploadFile):
    """
    Auto-detect tax form type AND extract all fields using improved OCR.
    """
    try:
        contents = await file.read()
        b64 = base64.b64encode(contents).decode()
        
        # Use the improved extract_form from ocr.py
        from tax_engine.ocr import extract_form, detect_form_type
        
        # Detect form type first
        form_type = await detect_form_type(b64)
        print(f"[OCR/AUTO] Detected form type: {form_type}")
        
        # Extract using improved prompts from ocr.py
        result = await extract_form(b64, form_type)
        
        extracted = result.get("data", {})
        
        print(f"✅ AUTO DETECT: {form_type}")
        print(f"   Wages: {extracted.get('wages_tips_other_comp')}")
        print(f"   Federal Withheld: {extracted.get('federal_income_tax_withheld')}")

        return {
            "status": "success",
            "form_type": form_type,
            "extracted": extracted
        }

    except Exception as e:
        print(f"AUTO DETECT ERROR: {e}")
        return {
            "status": "error",
            "error": str(e),
            "form_type": "UNKNOWN",
            "extracted": {}
        }


# ================================================================
# 5) TAXSKY CPA CHAT ENGINE (EXISTING)
# ================================================================
from tax_engine.cpa_assistant import ask_cpa

class CPAChat(BaseModel):
    question: str
    context: dict | None = None


@app.post("/cpa/chat")
async def cpa_chat(req: CPAChat):
    answer = ask_cpa(req.question, req.context or {})
    return {"status": "ok", "answer": answer}


# ================================================================
# 6) W-2 ANALYSIS (GPT OCR → CPA Assistant) (EXISTING)
# ================================================================
@app.post("/cpa/analyze/w2")
async def analyze_w2(file: UploadFile):
    contents = await file.read()
    b64 = base64.b64encode(contents).decode()

    # Extract W-2 using GPT Vision
    gpt = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "Extract W-2 fields. JSON only."},
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": "Extract fields"},
                    {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{b64}"}}
                ],
            },
        ],
    )

    fields = clean_json(gpt.choices[0].message.content)

    # Send fields into CPA assistant for explanation
    analysis = ask_cpa("Explain this W-2 and estimate refund.", fields)

    return {"w2_data": fields, "analysis": analysis}


# ================================================================
# 7) COMPLETE DOCUMENT PROCESSING (EXISTING)
# ================================================================
@app.post("/cpa/document")
async def process_tax_document(userId: str, file: UploadFile):

    # 1️⃣ Load or create tax session from MongoDB
    session = get_or_create_tax_session(userId, 2024)

    # 2️⃣ Get file as base64
    contents = await file.read()
    base64_img = base64.b64encode(contents).decode()

    # 3️⃣ Auto detect form type
    detect = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "Detect tax form type: W2, 1099-NEC, 1099-MISC, 1099-INT."},
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": "Identify form"},
                    {"type": "image_url",
                     "image_url": {"url": f"data:image/png;base64,{base64_img}"}}
                ]
            }
        ]
    )

    formType = json.loads(
        detect.choices[0].message.content.replace("```json", "").replace("```", "")
    )["form_type"]

    # 4️⃣ Extract fields
    if formType == "W2":
        extracted = await extract_w2_backend(base64_img)
    else:
        extracted = await extract_1099_backend(formType, base64_img)

    # 5️⃣ Append to session and save
    session["documents"].append({
        "type": formType,
        "data": extracted
    })
    save_session(session)

    # 6️⃣ Ask CPA for analysis
    cpaReply = ask_cpa(
        question=f"A new {formType} was uploaded. Analyze and ask for missing data.",
        tax_context=session_to_dict(session)
    )

    # 7️⃣ Refund estimate
    refund = estimate_refund(session)

    return {
        "success": True,
        "form_type": formType,
        "extracted": extracted,
        "cpa_reply": cpaReply,
        "refund": refund
    }


# ================================================================
# RUN SERVER
# ================================================================
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=5001)