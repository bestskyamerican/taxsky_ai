"""
=============================================================
FEDERAL FORM 1040 PDF ROUTER - v16.0 (FILLABLE FIELDS)
=============================================================
✅ FIXED: Uses actual PDF form fields instead of text overlay
✅ Works with 2025 editable PDF that has fillable form fields
✅ SSN masking for preview mode
✅ Full SSN for official submission
=============================================================
"""

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from pypdf import PdfReader, PdfWriter
import tempfile
import os

form_1040_router = APIRouter(prefix="/generate", tags=["Form 1040"])

//form_1040_router = APIRouter(prefix="/api/forms", tags=["Form 1040"])
TEMPLATES_DIR = os.path.join(os.path.dirname(__file__), "templates")


# ============================================================
# REQUEST MODELS
# ============================================================
class PersonalInfo(BaseModel):
    first_name: Optional[str] = ""
    last_name: Optional[str] = ""
    ssn: Optional[str] = ""
    address: Optional[str] = ""
    apt: Optional[str] = ""
    city: Optional[str] = ""
    state: Optional[str] = "CA"
    zip: Optional[str] = ""
    filing_status: Optional[str] = "single"
    spouse_first_name: Optional[str] = ""
    spouse_last_name: Optional[str] = ""
    spouse_ssn: Optional[str] = ""


class Dependent(BaseModel):
    first_name: Optional[str] = ""
    last_name: Optional[str] = ""
    ssn: Optional[str] = ""
    relationship: Optional[str] = ""
    age: Optional[int] = 0
    date_of_birth: Optional[str] = ""


class Request1040(BaseModel):
    personal: Optional[PersonalInfo] = None
    dependents: Optional[List[Dependent]] = []
    form1040: Optional[Dict[str, Any]] = None
    session_id: Optional[str] = ""
    mask_ssn: Optional[bool] = True
    is_official_submission: Optional[bool] = False
    
    class Config:
        extra = "allow"


# ============================================================
# FORM FIELD MAPPING (field_id from PDF)
# Based on extracted field info from Form1040_2025_EDITABLE.pdf
# ============================================================
FIELD_MAP = {
    # === PAGE 1: PERSONAL INFO ===
    # Name fields - "Your first name and middle initial" row
    "first_name": "topmostSubform[0].Page1[0].f1_14[0]",  # Your first name (Y ~684-698)
    "last_name": "topmostSubform[0].Page1[0].f1_15[0]",   # Last name
    "ssn": "topmostSubform[0].Page1[0].f1_16[0]",         # Your social security number
    
    # Spouse info - "If joint return, spouse's first name" row (Y ~660-674)
    "spouse_first_name": "topmostSubform[0].Page1[0].f1_17[0]",
    "spouse_last_name": "topmostSubform[0].Page1[0].f1_18[0]",
    "spouse_ssn": "topmostSubform[0].Page1[0].f1_19[0]",
    
    # Address
    "address": "topmostSubform[0].Page1[0].Address_ReadOrder[0].f1_20[0]",
    "apt": "topmostSubform[0].Page1[0].Address_ReadOrder[0].f1_21[0]",
    "city": "topmostSubform[0].Page1[0].Address_ReadOrder[0].f1_22[0]",
    "state": "topmostSubform[0].Page1[0].Address_ReadOrder[0].f1_23[0]",
    "zip": "topmostSubform[0].Page1[0].Address_ReadOrder[0].f1_24[0]",
    
    # Filing status checkboxes
    "single_check": "topmostSubform[0].Page1[0].Checkbox_ReadOrder[0].c1_8[0]",        # Single
    "mfj_check": "topmostSubform[0].Page1[0].Checkbox_ReadOrder[0].c1_8[1]",           # Married filing jointly
    "mfs_check": "topmostSubform[0].Page1[0].Checkbox_ReadOrder[0].c1_8[2]",           # Married filing separately
    "hoh_check": "topmostSubform[0].Page1[0].c1_8[0]",                                  # Head of household
    "qss_check": "topmostSubform[0].Page1[0].c1_8[1]",                                  # Qualifying surviving spouse
    
    # MFS spouse name
    "mfs_spouse_name": "topmostSubform[0].Page1[0].Checkbox_ReadOrder[0].f1_28[0]",
    
    # HOH/QSS child name
    "hoh_child_name": "topmostSubform[0].Page1[0].f1_29[0]",
    
    # Digital assets Yes/No
    "digital_yes": "topmostSubform[0].Page1[0].c1_6[0]",
    "digital_no": "topmostSubform[0].Page1[0].c1_7[0]",
    
    # === INCOME SECTION (Page 1) - CORRECTED based on Y positions ===
    # Fields go from bottom of page upward in PDF coordinates
    "line_1a": "topmostSubform[0].Page1[0].f1_47[0]",    # Y=330 W-2 wages
    "line_1b": "topmostSubform[0].Page1[0].f1_48[0]",    # Y=318 Household employee wages
    "line_1c": "topmostSubform[0].Page1[0].f1_49[0]",    # Y=306 Tip income
    "line_1d": "topmostSubform[0].Page1[0].f1_50[0]",    # Y=294 Medicaid waiver
    "line_1e": "topmostSubform[0].Page1[0].f1_51[0]",    # Y=282 Dependent care benefits
    "line_1f": "topmostSubform[0].Page1[0].f1_52[0]",    # Y=270 Adoption benefits
    "line_1g": "topmostSubform[0].Page1[0].f1_53[0]",    # Y=258 Form 8919 wages
    "line_1h": "topmostSubform[0].Page1[0].f1_55[0]",    # Y=246 Other earned income
    "line_1i": "topmostSubform[0].Page1[0].f1_56[0]",    # Y=234 Nontaxable combat pay (left column)
    "line_1z": "topmostSubform[0].Page1[0].f1_57[0]",    # Y=222 Total wages (add 1a-1h)
    
    "line_2a": "topmostSubform[0].Page1[0].f1_58[0]",    # Y=210 Tax-exempt interest (left)
    "line_2b": "topmostSubform[0].Page1[0].f1_59[0]",    # Y=210 Taxable interest (right)
    "line_3a": "topmostSubform[0].Page1[0].f1_60[0]",    # Y=198 Qualified dividends (left)
    "line_3b": "topmostSubform[0].Page1[0].f1_61[0]",    # Y=198 Ordinary dividends (right)
    "line_4a": "topmostSubform[0].Page1[0].f1_62[0]",    # Y=174 IRA distributions (left)
    "line_4b": "topmostSubform[0].Page1[0].f1_63[0]",    # Y=174 Taxable amount (right)
    "line_5a": "topmostSubform[0].Page1[0].f1_65[0]",    # Y=150 Pensions (left)
    "line_5b": "topmostSubform[0].Page1[0].f1_66[0]",    # Y=150 Taxable amount (right)
    "line_6a": "topmostSubform[0].Page1[0].f1_68[0]",    # Y=126 Social security (left)
    "line_6b": "topmostSubform[0].Page1[0].f1_69[0]",    # Y=126 Taxable amount (right)
    "line_7": "topmostSubform[0].Page1[0].f1_70[0]",     # Y=90 Capital gain/loss
    "line_8": "topmostSubform[0].Page1[0].f1_71[0]",     # Y=78 Schedule 1 income
    "line_9": "topmostSubform[0].Page1[0].f1_72[0]",     # Y=66 Total income
    "line_10": "topmostSubform[0].Page1[0].f1_73[0]",    # Y=54 Adjustments
    "line_11": "topmostSubform[0].Page1[0].f1_74[0]",    # Y=42 AGI
    
    # === PAGE 2 ===
    # PDF coordinates: LOWER Y = HIGHER on visible page
    # f2_01 at Y=36 is Line 11b at TOP of page
    "line_11b": "topmostSubform[0].Page2[0].f2_01[0]",   # Y=36  Line 11b (AGI)
    "line_12e": "topmostSubform[0].Page2[0].f2_02[0]",   # Y=96  Line 12e (Standard deduction)
    "line_13a": "topmostSubform[0].Page2[0].f2_03[0]",   # Y=108 Line 13a (QBI)
    "line_13b": "topmostSubform[0].Page2[0].f2_04[0]",   # Y=120 Line 13b
    "line_14": "topmostSubform[0].Page2[0].f2_05[0]",    # Y=132 Line 14 (Total deductions)
    "line_15": "topmostSubform[0].Page2[0].f2_06[0]",    # Y=144 Line 15 (Taxable income)
    "line_16": "topmostSubform[0].Page2[0].f2_08[0]",    # Y=156 Line 16 (Tax) - right column X=504
    "line_17": "topmostSubform[0].Page2[0].f2_09[0]",    # Y=168 Line 17 (Schedule 2)
    "line_18": "topmostSubform[0].Page2[0].f2_10[0]",    # Y=180 Line 18 (Add 16+17)
    "line_19": "topmostSubform[0].Page2[0].f2_11[0]",    # Y=192 Line 19 (Child tax credit)
    "line_20": "topmostSubform[0].Page2[0].f2_12[0]",    # Y=204 Line 20 (Schedule 3)
    "line_21": "topmostSubform[0].Page2[0].f2_13[0]",    # Y=216 Line 21 (Add 19+20)
    "line_22": "topmostSubform[0].Page2[0].f2_14[0]",    # Y=228 Line 22 (Subtract)
    "line_23": "topmostSubform[0].Page2[0].f2_15[0]",    # Y=240 Line 23 (Other taxes)
    "line_24": "topmostSubform[0].Page2[0].f2_16[0]",    # Y=252 Line 24 (Total tax)
    
    # Payments section
    "line_25a": "topmostSubform[0].Page2[0].f2_17[0]",   # Y=276 Line 25a (W-2 withholding)
    "line_25b": "topmostSubform[0].Page2[0].f2_18[0]",   # Y=288 Line 25b (1099 withholding)
    "line_25c": "topmostSubform[0].Page2[0].f2_19[0]",   # Y=300 Line 25c (Other withholding)
    "line_25d": "topmostSubform[0].Page2[0].f2_20[0]",   # Y=312 Line 25d (Total withholding)
    "line_26": "topmostSubform[0].Page2[0].f2_21[0]",    # Y=324 Line 26 (Estimated payments)
    "line_27": "topmostSubform[0].Page2[0].f2_23[0]",    # Y=360 Line 27a (EIC)
    "line_28": "topmostSubform[0].Page2[0].f2_24[0]",    # Y=408 Line 28 (ACTC)
    "line_29": "topmostSubform[0].Page2[0].f2_25[0]",    # Y=420 Line 29 (American opportunity)
    "line_30": "topmostSubform[0].Page2[0].f2_26[0]",    # Y=432 Line 30 (Refundable adoption)
    "line_31": "topmostSubform[0].Page2[0].f2_27[0]",    # Y=444 Line 31 (Schedule 3)
    "line_32": "topmostSubform[0].Page2[0].f2_28[0]",    # Y=456 Line 32 (Total other payments)
    "line_33": "topmostSubform[0].Page2[0].f2_29[0]",    # Y=468 Line 33 (Total payments)
    "line_34": "topmostSubform[0].Page2[0].f2_30[0]",    # Y=480 Line 34 (Overpayment)
    "line_35a": "topmostSubform[0].Page2[0].f2_31[0]",   # Y=492 Line 35a (Refund)
    "line_37": "topmostSubform[0].Page2[0].f2_35[0]",    # Y=552 Line 37 (Amount owed)
    
    # Bank info for direct deposit
    "routing": "topmostSubform[0].Page2[0].f2_32[0]",    # Y=504 Routing number
    "account": "topmostSubform[0].Page2[0].f2_33[0]",    # Y=516 Account number
}


def mask_ssn(ssn: str, show_full: bool) -> str:
    """Mask SSN for preview mode"""
    if not ssn:
        return ""
    clean = ssn.replace("-", "").replace(" ", "")
    if show_full:
        return f"{clean[:3]}-{clean[3:5]}-{clean[5:]}" if len(clean) == 9 else ssn
    return f"XXX-XX-{clean[-4:]}" if len(clean) >= 4 else "XXX-XX-XXXX"


def fmt_money(val) -> str:
    """Format number as money without $ sign"""
    if val is None:
        return ""
    try:
        num = float(val)
        if num == int(num):
            return f"{int(num):,}"
        return f"{num:,.2f}"
    except:
        return str(val)


# ============================================================
# MAIN ENDPOINT - FILL PDF FORM FIELDS
# ============================================================
@form_1040_router.post("/1040")
async def generate_1040(data: Request1040):
    """Generate Form 1040 by filling actual PDF form fields"""
    try:
        # Find template
        template_path = os.path.join(TEMPLATES_DIR, "Form1040_2025_EDITABLE.pdf")
        if not os.path.exists(template_path):
            template_path = os.path.join(TEMPLATES_DIR, "f1040_2025.pdf")
        if not os.path.exists(template_path):
            raise HTTPException(404, "Form 1040 template not found")
        
        print(f"\n{'='*60}")
        print("FORM 1040 GENERATION - v16.0 (FILLABLE FIELDS)")
        print(f"{'='*60}")
        print(f"Template: {template_path}")
        
        # Read PDF and create writer with proper cloning for XFA forms
        reader = PdfReader(template_path)
        writer = PdfWriter(clone_from=reader)  # This preserves XFA/AcroForm properly
        
        # Prepare field values
        personal = data.personal or PersonalInfo()
        dependents = data.dependents or []
        form1040 = data.form1040 or {}
        
        show_ssn = data.is_official_submission or not data.mask_ssn
        
        field_values = {}
        
        # === PERSONAL INFO ===
        if personal.first_name:
            field_values[FIELD_MAP["first_name"]] = personal.first_name.upper()
            print(f"  ✅ First Name: {personal.first_name.upper()}")
        
        if personal.last_name:
            field_values[FIELD_MAP["last_name"]] = personal.last_name.upper()
            print(f"  ✅ Last Name: {personal.last_name.upper()}")
        
        if personal.ssn:
            field_values[FIELD_MAP["ssn"]] = mask_ssn(personal.ssn, show_ssn)
            print(f"  ✅ SSN: {mask_ssn(personal.ssn, show_ssn)}")
        
        # === SPOUSE (for MFJ) ===
        if personal.filing_status == "married_filing_jointly":
            if personal.spouse_first_name:
                field_values[FIELD_MAP["spouse_first_name"]] = personal.spouse_first_name.upper()
            if personal.spouse_last_name:
                field_values[FIELD_MAP["spouse_last_name"]] = personal.spouse_last_name.upper()
            if personal.spouse_ssn:
                field_values[FIELD_MAP["spouse_ssn"]] = mask_ssn(personal.spouse_ssn, show_ssn)
        
        # === ADDRESS ===
        if personal.address:
            field_values[FIELD_MAP["address"]] = personal.address.upper()
            print(f"  ✅ Address: {personal.address.upper()}")
        
        if personal.apt:
            field_values[FIELD_MAP["apt"]] = personal.apt
        
        if personal.city:
            field_values[FIELD_MAP["city"]] = personal.city.upper()
        
        if personal.state:
            field_values[FIELD_MAP["state"]] = personal.state.upper()
        
        if personal.zip:
            field_values[FIELD_MAP["zip"]] = personal.zip
            print(f"  ✅ City/State/ZIP: {personal.city}, {personal.state} {personal.zip}")
        
        # === FILING STATUS (checkboxes use /1 for checked) ===
        status_checkbox = {
            "single": "single_check",
            "married_filing_jointly": "mfj_check",
            "married_filing_separately": "mfs_check",
            "head_of_household": "hoh_check",
            "qualifying_surviving_spouse": "qss_check"
        }
        checkbox_key = status_checkbox.get(personal.filing_status, "single_check")
        if checkbox_key in FIELD_MAP:
            field_values[FIELD_MAP[checkbox_key]] = "/1"
            print(f"  ✅ Filing Status: {personal.filing_status}")
        
        # === DIGITAL ASSETS (default No) ===
        field_values[FIELD_MAP["digital_no"]] = "/1"
        
        # === INCOME DATA ===
        income = form1040.get("income", {})
        adj = form1040.get("adjustments", {})
        ded = form1040.get("deductions", {})
        tax = form1040.get("tax_and_credits", {})
        pay = form1040.get("payments", {})
        ref_owe = form1040.get("refund_or_owe", {})
        
        # Line 1a/1z - Wages
        wages = income.get("line_1_wages") or income.get("line_1z_total_wages", 0)
        if wages:
            field_values[FIELD_MAP["line_1a"]] = fmt_money(wages)
            field_values[FIELD_MAP["line_1z"]] = fmt_money(wages)
            print(f"  ✅ Line 1a/1z (Wages): {fmt_money(wages)}")
        
        # Line 9 - Total income
        if income.get("line_9_total_income"):
            field_values[FIELD_MAP["line_9"]] = fmt_money(income["line_9_total_income"])
            print(f"  ✅ Line 9 (Total Income): {fmt_money(income['line_9_total_income'])}")
        
        # Line 11 - AGI
        if adj.get("line_11_agi"):
            field_values[FIELD_MAP["line_11"]] = fmt_money(adj["line_11_agi"])
            print(f"  ✅ Line 11 (AGI): {fmt_money(adj['line_11_agi'])}")
        
        # === PAGE 2 ===
        # Line 11b - AGI repeated at top of page 2
        if adj.get("line_11_agi"):
            field_values[FIELD_MAP["line_11b"]] = fmt_money(adj["line_11_agi"])
            print(f"  ✅ Line 11b (AGI on Page 2): {fmt_money(adj['line_11_agi'])}")
        
        # Line 12e - Standard deduction
        if ded.get("line_12_deduction"):
            field_values[FIELD_MAP["line_12e"]] = fmt_money(ded["line_12_deduction"])
            print(f"  ✅ Line 12e (Deduction): {fmt_money(ded['line_12_deduction'])}")
        
        # Line 14 - Total deductions (usually same as 12e for standard deduction)
        total_deductions = ded.get("line_14_total_deductions") or ded.get("line_12_deduction", 0)
        if total_deductions:
            field_values[FIELD_MAP["line_14"]] = fmt_money(total_deductions)
            print(f"  ✅ Line 14 (Total Deductions): {fmt_money(total_deductions)}")
        
        # Line 15 - Taxable income
        taxable = ded.get("line_15_taxable_income", 0)
        field_values[FIELD_MAP["line_15"]] = fmt_money(taxable)
        print(f"  ✅ Line 15 (Taxable): {fmt_money(taxable)}")
        
        # Line 16 - Tax
        line_16 = tax.get("line_16_tax", 0)
        field_values[FIELD_MAP["line_16"]] = fmt_money(line_16)
        print(f"  ✅ Line 16 (Tax): {fmt_money(line_16)}")
        
        # Line 17 - Schedule 2, line 3 (usually 0)
        line_17 = tax.get("line_17_schedule_2", 0)
        field_values[FIELD_MAP["line_17"]] = fmt_money(line_17)
        
        # Line 18 - Add lines 16 and 17
        line_18 = tax.get("line_18_total") or (line_16 + line_17)
        field_values[FIELD_MAP["line_18"]] = fmt_money(line_18)
        print(f"  ✅ Line 18 (Total): {fmt_money(line_18)}")
        
        # Line 19 - Child tax credit
        line_19 = tax.get("line_19_child_credit", 0)
        field_values[FIELD_MAP["line_19"]] = fmt_money(line_19)
        
        # Line 20 - Schedule 3, line 8 (usually 0)
        line_20 = tax.get("line_20_schedule_3", 0)
        field_values[FIELD_MAP["line_20"]] = fmt_money(line_20)
        
        # Line 21 - Add lines 19 and 20
        line_21 = tax.get("line_21_total") or (line_19 + line_20)
        field_values[FIELD_MAP["line_21"]] = fmt_money(line_21)
        
        # Line 22 - Subtract line 21 from line 18
        line_22 = tax.get("line_22_tax_after_credits") or max(0, line_18 - line_21)
        field_values[FIELD_MAP["line_22"]] = fmt_money(line_22)
        print(f"  ✅ Line 22 (Tax After Credits): {fmt_money(line_22)}")
        
        # Line 23 - Other taxes from Schedule 2 (usually 0)
        line_23 = tax.get("line_23_other_taxes", 0)
        field_values[FIELD_MAP["line_23"]] = fmt_money(line_23)
        
        # Line 24 - Total tax
        line_24 = tax.get("line_24_total_tax") or (line_22 + line_23)
        field_values[FIELD_MAP["line_24"]] = fmt_money(line_24)
        print(f"  ✅ Line 24 (Total Tax): {fmt_money(line_24)}")
        
        # === PAYMENTS SECTION ===
        # Line 25a - W-2 withholding
        line_25a = pay.get("line_25a_w2_withholding") or pay.get("line_25d_total_withholding", 0)
        field_values[FIELD_MAP["line_25a"]] = fmt_money(line_25a)
        print(f"  ✅ Line 25a (W-2 Withholding): {fmt_money(line_25a)}")
        
        # Line 25b - 1099 withholding
        line_25b = pay.get("line_25b_1099_withholding", 0)
        field_values[FIELD_MAP["line_25b"]] = fmt_money(line_25b)
        
        # Line 25c - Other withholding
        line_25c = pay.get("line_25c_other_withholding", 0)
        field_values[FIELD_MAP["line_25c"]] = fmt_money(line_25c)
        
        # Line 25d - Total withholding
        line_25d = pay.get("line_25d_total_withholding") or (line_25a + line_25b + line_25c)
        field_values[FIELD_MAP["line_25d"]] = fmt_money(line_25d)
        print(f"  ✅ Line 25d (Total Withholding): {fmt_money(line_25d)}")
        
        # Line 26 - Estimated payments
        line_26 = pay.get("line_26_estimated_payments", 0)
        field_values[FIELD_MAP["line_26"]] = fmt_money(line_26)
        
        # Line 27 - EIC
        line_27 = pay.get("line_27_eic", 0)
        field_values[FIELD_MAP["line_27"]] = fmt_money(line_27)
        
        # Line 28 - Additional child tax credit
        line_28 = pay.get("line_28_actc", 0)
        field_values[FIELD_MAP["line_28"]] = fmt_money(line_28)
        
        # Line 29 - American opportunity credit
        line_29 = pay.get("line_29_aoc", 0)
        field_values[FIELD_MAP["line_29"]] = fmt_money(line_29)
        
        # Line 31 - Schedule 3 credits
        line_31 = pay.get("line_31_schedule_3", 0)
        field_values[FIELD_MAP["line_31"]] = fmt_money(line_31)
        
        # Line 32 - Total other payments
        line_32 = pay.get("line_32_total_other") or (line_27 + line_28 + line_29 + line_31)
        field_values[FIELD_MAP["line_32"]] = fmt_money(line_32)
        
        # Line 33 - Total payments
        line_33 = pay.get("line_33_total_payments") or (line_25d + line_26 + line_32)
        field_values[FIELD_MAP["line_33"]] = fmt_money(line_33)
        print(f"  ✅ Line 33 (Total Payments): {fmt_money(line_33)}")
        
        # === REFUND OR AMOUNT OWED ===
        refund = ref_owe.get("line_35_refund", 0)
        owed = ref_owe.get("line_37_amount_owe", 0)
        
        # Calculate if not provided
        if not refund and not owed:
            if line_33 > line_24:
                refund = line_33 - line_24
            else:
                owed = line_24 - line_33
        
        # Line 34 - Overpayment
        line_34 = refund if refund > 0 else 0
        field_values[FIELD_MAP["line_34"]] = fmt_money(line_34)
        
        # Line 35a - Refund amount
        field_values[FIELD_MAP["line_35a"]] = fmt_money(line_34)
        if line_34 > 0:
            print(f"  ✅ Line 34/35a (REFUND): ${line_34:,.0f}")
        
        # Line 37 - Amount owed
        field_values[FIELD_MAP["line_37"]] = fmt_money(owed)
        if owed > 0:
            print(f"  ✅ Line 37 (OWED): ${owed:,.0f}")
        
        # === FILL ALL FIELDS ===
        print(f"\n  Filling {len(field_values)} form fields...")
        writer.update_page_form_field_values(writer.pages[0], field_values, auto_regenerate=False)
        if len(reader.pages) > 1:
            writer.update_page_form_field_values(writer.pages[1], field_values, auto_regenerate=False)
        
        # Set NeedAppearances flag
        writer.set_need_appearances_writer(True)
        
        # Save intermediate PDF
        suffix = "_1040_OFFICIAL" if show_ssn else "_1040_PREVIEW"
        temp_pdf = tempfile.mktemp(suffix=f"_temp.pdf")
        with open(temp_pdf, "wb") as f:
            writer.write(f)
        
        # === POST-PROCESS WITH PYMUPDF TO REGENERATE APPEARANCES ===
        # This is required for XFA forms to display values properly
        import fitz
        doc = fitz.open(temp_pdf)
        for page in doc:
            for widget in page.widgets():
                if widget.field_value:
                    widget.update()  # Regenerate appearance stream
        
        out = tempfile.mktemp(suffix=f"{suffix}.pdf")
        doc.save(out, garbage=4, deflate=True)
        doc.close()
        
        # Clean up temp file
        try:
            os.remove(temp_pdf)
        except:
            pass
        
        print(f"\n  ✅ Generated: {out}")
        
        return FileResponse(
            out,
            media_type='application/pdf',
            filename=f"Form1040_2025_{data.session_id or 'return'}.pdf"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(500, str(e))


# ============================================================
# INFO ENDPOINTS
# ============================================================
@form_1040_router.get("/1040/fields")
async def get_fields():
    return {
        "form": "IRS Form 1040",
        "year": 2025,
        "version": "16.0",
        "engine": "pypdf (fillable form fields)",
        "note": "Uses actual PDF form fields instead of text overlay"
    }


@form_1040_router.get("/1040/test")
async def test():
    template = os.path.join(TEMPLATES_DIR, "Form1040_2025_EDITABLE.pdf")
    return {
        "status": "ok",
        "version": "16.0",
        "template": template,
        "template_exists": os.path.exists(template)
    }