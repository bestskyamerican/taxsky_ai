"""
=============================================================
CALIFORNIA FORM 540 PDF ROUTER - v3.0 with SSN Protection
POST /generate/ca540  → Generate CA 540 PDF
GET  /generate/ca540/fields → Show field mapping
=============================================================
FEATURES:
- SSN masking for preview/print (XXX-XX-1234)
- Full SSN for official e-file submission
- Corrected field mappings for Page 1
- Pydantic v2 compatible
=============================================================
"""

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from pypdf import PdfReader, PdfWriter
from pypdf.generic import NameObject, BooleanObject, IndirectObject
import tempfile
import os

# Router
form_ca540_router = APIRouter(prefix="/generate", tags=["CA Form 540"])

# Template path
TEMPLATES_DIR = os.path.join(os.path.dirname(__file__), "templates")

# =============================================================
# MODELS
# =============================================================
class PersonalCA540(BaseModel):
    first_name: str = ""
    middle_initial: str = ""
    last_name: str = ""
    suffix: str = ""
    ssn: str = ""
    address: str = ""
    apt: str = ""
    city: str = ""
    state: str = "CA"
    zip: str = ""
    county: str = ""
    spouse_first_name: str = ""
    spouse_middle_initial: str = ""
    spouse_last_name: str = ""
    spouse_suffix: str = ""
    spouse_ssn: str = ""
    model_config = ConfigDict(extra="allow")

class FederalCA540(BaseModel):
    filing_status: str = "single"
    wages: float = 0
    agi: float = 0
    model_config = ConfigDict(extra="allow")

class StateCA540(BaseModel):
    ca_agi: float = 0
    standard_deduction: float = 0
    taxable_income: float = 0
    base_tax: float = 0
    total_tax: float = 0
    tax_after_credits: float = 0
    withholding: float = 0
    caleitc: float = 0
    yctc: float = 0
    fytc: float = 0
    refundable_credits: float = 0
    refund: float = 0
    amount_owed: float = 0
    model_config = ConfigDict(extra="allow")

class DependentCA540(BaseModel):
    first_name: str = ""
    last_name: str = ""
    name: str = ""
    ssn: str = ""
    relationship: str = ""
    model_config = ConfigDict(extra="allow")

class RequestCA540(BaseModel):
    session_id: str = ""
    personal: Optional[PersonalCA540] = None
    federal: Optional[FederalCA540] = None
    state: Optional[StateCA540] = None
    dependents: Optional[List[DependentCA540]] = []
    # ═══════════════════════════════════════════════════════
    # SSN PROTECTION OPTIONS
    # ═══════════════════════════════════════════════════════
    mask_ssn: bool = True           # True = XXX-XX-1234, False = full SSN
    is_official_submission: bool = False  # True = e-file (full SSN required)
    model_config = ConfigDict(extra="allow")

# =============================================================
# ✅ CORRECTED FIELD MAPPING - Based on actual PDF positions
# =============================================================
FIELDS_CA540 = {
    # ═══════════════════════════════════════════════════════
    # PAGE 1: Personal Info - CORRECTED!
    # Taxpayer row: First, Initial, Last, Suffix, SSN
    # ═══════════════════════════════════════════════════════
    "firstName": "540-1003",         # CORRECTED (was 540-1002)
    "middleInitial": "540-1004",
    "lastName": "540-1005",          # CORRECTED (was 540-1004)
    "suffix": "540-1006",
    "ssn": "540-1007",               # CORRECTED (was 540-1006)
    
    # Spouse row
    "spouseFirstName": "540-1008",   # CORRECTED (was 540-1007)
    "spouseMiddleInitial": "540-1009",
    "spouseLastName": "540-1010",    # CORRECTED (was 540-1009)
    "spouseSuffix": "540-1011",
    "spouseSsn": "540-1012",         # CORRECTED (was 540-1011)
    
    # Address section
    "address": "540-1014",
    "apt": "540-1015",
    "city": "540-1017",
    "state": "540-1018",
    "zip": "540-1019",
    "county": "540-1027",
    
    # Filing Status (radio button)
    "filingStatus": "540-1036 RB",
    
    # Line 7-9: Exemptions
    "line7Count": "540-1041",
    "line7Amount": "540-1042",
    "line8Count": "540-1043",
    "line8Amount": "540-1044",
    "line9Count": "540-1045",
    "line9Amount": "540-1046",
    
    # ═══════════════════════════════════════════════════════
    # PAGE 2: Dependents & Income
    # ═══════════════════════════════════════════════════════
    "dep1FirstName": "540-2003",
    "dep1LastName": "540-2004",
    "dep1Ssn": "540-2005",
    "dep1Relationship": "540-2006",
    "dep2FirstName": "540-2007",
    "dep2LastName": "540-2008",
    "dep2Ssn": "540-2009",
    "dep2Relationship": "540-2010",
    "dep3FirstName": "540-2011",
    "dep3LastName": "540-2012",
    "dep3Ssn": "540-2013",
    "dep3Relationship": "540-2014",
    
    "line10Count": "540-2015",
    "line10Amount": "540-2016",
    "line11": "540-2017",
    "line12": "540-2018",
    "line13": "540-2019",
    "line14": "540-2020",
    "line15": "540-2021",
    "line16": "540-2022",
    "line17": "540-2023",
    "line18": "540-2024",
    "line19": "540-2025",
    "line31": "540-2030",
    "line32": "540-2031",
    "line33": "540-2032",
    "line35": "540-2036",
    
    # ═══════════════════════════════════════════════════════
    # PAGE 3: Credits & Payments
    # ═══════════════════════════════════════════════════════
    "line47": "540-3005",
    "line48": "540-3006",
    "line62": "540-3008",
    "line64": "540-3010",
    "line71": "540-3011",
    "line75": "540-3015",  # CalEITC
    "line76": "540-3016",  # YCTC
    "line77": "540-3017",  # FYTC
    "line78": "540-3018",
    "line91": "540-3022",
    "line93": "540-3024",
    "line95": "540-3026",
    
    # ═══════════════════════════════════════════════════════
    # PAGE 4: Overpaid/Due
    # ═══════════════════════════════════════════════════════
    "line97": "540-4003",
    "line98": "540-4004",
    "line99": "540-4005",
    "line100": "540-4006",
    
    # ═══════════════════════════════════════════════════════
    # PAGE 5: Refund
    # ═══════════════════════════════════════════════════════
    "line111": "540-5002",
    "line115": "540-5007",  # REFUND
}

# =============================================================
# SSN PROTECTION HELPERS
# =============================================================
def mask_ssn(ssn: str, show_full: bool = False) -> str:
    """
    Mask SSN for privacy protection
    
    Args:
        ssn: Raw SSN (with or without dashes)
        show_full: If True, return full SSN (for e-file)
                   If False, return masked (XXX-XX-1234)
    
    Returns:
        Formatted SSN string
    """
    if not ssn:
        return ""
    
    # Clean SSN - remove non-digits
    clean = str(ssn).replace("-", "").replace(" ", "")
    clean = ''.join(c for c in clean if c.isdigit())
    
    if len(clean) < 4:
        return "XXX-XX-XXXX" if not show_full else clean
    
    if show_full:
        # Full SSN for official e-file submission
        return clean
    else:
        # Masked for preview/print - show only last 4
        return f"XXX-XX-{clean[-4:]}"

def fmt_money(amount) -> str:
    if not amount or amount == 0:
        return "0"
    try:
        return str(int(round(float(amount))))
    except:
        return "0"

def set_need_appearances(writer: PdfWriter):
    """Set NeedAppearances flag for proper field display"""
    try:
        if "/AcroForm" not in writer._root_object:
            return
        acro_form = writer._root_object["/AcroForm"]
        if isinstance(acro_form, IndirectObject):
            acro_form = acro_form.get_object()
        acro_form[NameObject("/NeedAppearances")] = BooleanObject(True)
        print("  ✅ NeedAppearances set to True")
    except Exception as e:
        print(f"  ⚠️ NeedAppearances error: {e}")

# =============================================================
# POST /generate/ca540
# =============================================================
@form_ca540_router.post("/ca540")
async def generate_form_ca540(data: RequestCA540):
    """Generate California Form 540 PDF with SSN protection"""
    try:
        print(f"\n🌴 === GENERATING CA FORM 540 v3.0 (SSN Protected) ===")
        
        # ═══════════════════════════════════════════════════════
        # DETERMINE SSN DISPLAY MODE
        # ═══════════════════════════════════════════════════════
        show_full_ssn = data.is_official_submission or (not data.mask_ssn)
        ssn_mode = "FULL (Official)" if show_full_ssn else "MASKED (Preview)"
        print(f"  🔒 SSN Mode: {ssn_mode}")
        
        # Find template
        template_path = os.path.join(TEMPLATES_DIR, "state", "ca540_2024.pdf")
        if not os.path.exists(template_path):
            alt_paths = [
                os.path.join(TEMPLATES_DIR, "ca540_2024.pdf"),
                "templates/state/ca540_2024.pdf",
            ]
            for alt in alt_paths:
                if os.path.exists(alt):
                    template_path = alt
                    break
            else:
                raise HTTPException(status_code=500, detail=f"Template not found")
        
        print(f"  📄 Template: {template_path}")
        
        # Load PDF
        reader = PdfReader(template_path)
        writer = PdfWriter()
        writer.clone_reader_document_root(reader)
        
        pdf_fields = reader.get_fields() or {}
        print(f"  📋 Found {len(pdf_fields)} form fields")
        
        # Extract data
        personal = data.personal.model_dump() if data.personal else {}
        federal = data.federal.model_dump() if data.federal else {}
        state = data.state.model_dump() if data.state else {}
        dependents = [d.model_dump() for d in data.dependents] if data.dependents else []
        
        # ═══════════════════════════════════════════════════════
        # SET FIELD HELPER
        # ═══════════════════════════════════════════════════════
        def set_field(key, value):
            """Set field value on ALL pages"""
            field_name = FIELDS_CA540.get(key, key)
            if field_name in pdf_fields and value:
                try:
                    for page in writer.pages:
                        writer.update_page_form_field_values(
                            page,
                            {field_name: str(value)}
                        )
                except Exception as e:
                    print(f"  ⚠️ Error setting {key}: {e}")
        
        # ═══════════════════════════════════════════════════════
        # PERSONAL INFO WITH SSN PROTECTION
        # ═══════════════════════════════════════════════════════
        first_name = personal.get("first_name", "").upper()
        last_name = personal.get("last_name", "").upper()
        
        # PROTECTED SSN
        ssn_raw = personal.get("ssn", "")
        ssn_display = mask_ssn(ssn_raw, show_full=show_full_ssn)
        
        print(f"\n  👤 Setting taxpayer info:")
        set_field("firstName", first_name)
        set_field("middleInitial", personal.get("middle_initial", "").upper())
        set_field("lastName", last_name)
        set_field("suffix", personal.get("suffix", "").upper())
        set_field("ssn", ssn_display)
        
        print(f"    Name: {first_name} {last_name}, SSN: {ssn_display}")
        
        print(f"\n  🏠 Setting address:")
        set_field("address", personal.get("address", "").upper())
        set_field("apt", personal.get("apt", ""))
        set_field("city", personal.get("city", "").upper())
        set_field("state", "CA")
        set_field("zip", personal.get("zip", ""))
        set_field("county", personal.get("county", "").upper())
        
        # ═══════════════════════════════════════════════════════
        # FILING STATUS
        # ═══════════════════════════════════════════════════════
        filing_status = federal.get("filing_status", "single")
        status_map = {
            "single": "1",
            "married_filing_jointly": "2",
            "married_filing_separately": "3",
            "head_of_household": "4",
            "qualifying_surviving_spouse": "5"
        }
        print(f"\n  📋 Filing Status: {filing_status}")
        set_field("filingStatus", status_map.get(filing_status, "1"))
        
        # ═══════════════════════════════════════════════════════
        # SPOUSE WITH SSN PROTECTION (MFJ)
        # ═══════════════════════════════════════════════════════
        if filing_status == "married_filing_jointly":
            spouse_first = personal.get("spouse_first_name", "").upper()
            spouse_last = personal.get("spouse_last_name", "").upper()
            
            # PROTECTED SPOUSE SSN
            spouse_ssn_raw = personal.get("spouse_ssn", "")
            spouse_ssn_display = mask_ssn(spouse_ssn_raw, show_full=show_full_ssn)
            
            print(f"\n  👫 Setting spouse info:")
            set_field("spouseFirstName", spouse_first)
            set_field("spouseMiddleInitial", personal.get("spouse_middle_initial", "").upper())
            set_field("spouseLastName", spouse_last)
            set_field("spouseSuffix", personal.get("spouse_suffix", "").upper())
            set_field("spouseSsn", spouse_ssn_display)
            print(f"    Name: {spouse_first} {spouse_last}, SSN: {spouse_ssn_display}")
        
        # ═══════════════════════════════════════════════════════
        # EXEMPTIONS
        # ═══════════════════════════════════════════════════════
        ex_count = 2 if filing_status == "married_filing_jointly" else 1
        ex_amount = ex_count * 149
        print(f"\n  📝 Exemptions: {ex_count} × $149 = ${ex_amount}")
        set_field("line7Count", str(ex_count))
        set_field("line7Amount", str(ex_amount))
        
        # ═══════════════════════════════════════════════════════
        # DEPENDENTS WITH SSN PROTECTION
        # ═══════════════════════════════════════════════════════
        num_deps = len(dependents)
        print(f"\n  👶 Dependents: {num_deps}")
        
        for i, dep in enumerate(dependents[:3]):
            dep_first = dep.get("first_name", dep.get("name", "")).upper()
            dep_last = dep.get("last_name", "").upper()
            
            # PROTECTED DEPENDENT SSN
            dep_ssn_raw = dep.get("ssn", "")
            dep_ssn_display = mask_ssn(dep_ssn_raw, show_full=show_full_ssn)
            
            dep_rel = dep.get("relationship", "").upper()
            
            set_field(f"dep{i+1}FirstName", dep_first)
            set_field(f"dep{i+1}LastName", dep_last)
            set_field(f"dep{i+1}Ssn", dep_ssn_display)
            set_field(f"dep{i+1}Relationship", dep_rel)
            print(f"    Dep{i+1}: {dep_first} {dep_last}, SSN: {dep_ssn_display}")
        
        # Dependent exemption ($461 each for 2024)
        dep_exemption = num_deps * 461
        total_exemption = ex_amount + dep_exemption
        set_field("line10Count", str(num_deps))
        set_field("line10Amount", str(dep_exemption))
        set_field("line11", str(total_exemption))
        print(f"  📝 Total Exemptions: ${total_exemption}")
        
        # ═══════════════════════════════════════════════════════
        # INCOME
        # ═══════════════════════════════════════════════════════
        wages = federal.get("wages", 0) or 0
        federal_agi = federal.get("agi", 0) or 0
        ca_agi = state.get("ca_agi", federal_agi) or federal_agi
        ca_std_ded = state.get("standard_deduction", 0) or 0
        ca_taxable = state.get("taxable_income", 0) or 0
        
        print(f"\n  💵 Income: Wages=${wages:,.0f}, CA AGI=${ca_agi:,.0f}")
        set_field("line12", fmt_money(wages))
        set_field("line13", fmt_money(federal_agi))
        set_field("line14", "0")
        set_field("line15", fmt_money(federal_agi))
        set_field("line16", "0")
        set_field("line17", fmt_money(ca_agi))
        set_field("line18", fmt_money(ca_std_ded))
        set_field("line19", fmt_money(ca_taxable))
        
        # ═══════════════════════════════════════════════════════
        # TAX
        # ═══════════════════════════════════════════════════════
        base_tax = state.get("base_tax", 0) or 0
        total_tax = state.get("total_tax", base_tax) or base_tax
        tax_after_credits = state.get("tax_after_credits", total_tax) or total_tax
        
        print(f"\n  📊 Tax: Base=${base_tax:,.0f}")
        set_field("line31", fmt_money(base_tax))
        set_field("line32", str(total_exemption))
        
        tax_after_ex = max(0, base_tax - total_exemption)
        set_field("line33", fmt_money(tax_after_ex))
        set_field("line35", fmt_money(tax_after_ex))
        set_field("line47", "0")
        set_field("line48", fmt_money(tax_after_credits))
        set_field("line64", fmt_money(total_tax))
        
        # ═══════════════════════════════════════════════════════
        # PAYMENTS
        # ═══════════════════════════════════════════════════════
        withholding = state.get("withholding", 0) or 0
        caleitc = state.get("caleitc", 0) or 0
        yctc = state.get("yctc", 0) or 0
        fytc = state.get("fytc", 0) or 0
        refundable_credits = state.get("refundable_credits", caleitc + yctc + fytc)
        
        print(f"\n  💳 Payments: Withholding=${withholding:,.0f}, CalEITC=${caleitc:,.0f}")
        set_field("line71", fmt_money(withholding))
        set_field("line75", fmt_money(caleitc))
        set_field("line76", fmt_money(yctc))
        set_field("line77", fmt_money(fytc))
        
        total_payments = withholding + refundable_credits
        set_field("line78", fmt_money(total_payments))
        set_field("line91", "0")
        set_field("line93", fmt_money(total_payments))
        set_field("line95", fmt_money(total_payments))
        
        # ═══════════════════════════════════════════════════════
        # REFUND OR OWE
        # ═══════════════════════════════════════════════════════
        refund = state.get("refund", 0) or 0
        amount_owed = state.get("amount_owed", 0) or 0
        
        if refund > 0:
            print(f"\n  💰 REFUND: ${refund:,.0f}")
            set_field("line97", fmt_money(refund))
            set_field("line99", fmt_money(refund))
            set_field("line115", fmt_money(refund))
        elif amount_owed > 0:
            print(f"\n  💸 OWED: ${amount_owed:,.0f}")
            set_field("line100", fmt_money(amount_owed))
            set_field("line111", fmt_money(amount_owed))
        
        # ═══════════════════════════════════════════════════════
        # SET NEED APPEARANCES & SAVE
        # ═══════════════════════════════════════════════════════
        set_need_appearances(writer)
        
        # Filename indicates if masked or official
        suffix = "_CA540_OFFICIAL" if show_full_ssn else "_CA540_PREVIEW"
        output_path = tempfile.mktemp(suffix=f"{suffix}.pdf")
        with open(output_path, "wb") as f:
            writer.write(f)
        
        print(f"\n  ✅ CA Form 540 saved: {output_path}")
        
        return FileResponse(
            path=output_path,
            media_type='application/pdf',
            filename=f"CA540_{data.session_id or 'return'}{'_OFFICIAL' if show_full_ssn else '_PREVIEW'}.pdf"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@form_ca540_router.get("/ca540/fields")
async def get_ca540_fields():
    """Return CA Form 540 field mappings"""
    return {"form": "California Form 540", "year": 2024, "fields": FIELDS_CA540}