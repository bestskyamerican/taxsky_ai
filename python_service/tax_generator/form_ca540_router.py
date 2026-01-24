"""
=============================================================
CALIFORNIA FORM 540 PDF ROUTER - v4.0 (2024/2025 Compatible)
POST /generate/ca540  → Generate CA 540 PDF
GET  /generate/ca540/fields → Show field mapping
=============================================================
✅ v4.0: Supports BOTH 2024 and 2025 CA 540 templates
✅ Auto-detects field format (540-XXXX vs 540_form_XXXX)
✅ 2025 values: $153 personal exemption, $475 dependent, $5,706/$11,412 std ded
✅ SSN masking for preview/print
=============================================================
"""

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Dict, Any
from pypdf import PdfReader, PdfWriter
from pypdf.generic import NameObject, BooleanObject, IndirectObject
import tempfile
import os

form_ca540_router = APIRouter(prefix="/generate", tags=["CA Form 540"])
TEMPLATES_DIR = os.path.join(os.path.dirname(__file__), "templates")
STATE_TEMPLATES_DIR = os.path.join(TEMPLATES_DIR, "state")


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
    mask_ssn: bool = True
    is_official_submission: bool = False
    tax_year: int = 2025
    model_config = ConfigDict(extra="allow")


# =============================================================
# FIELD MAPPING - Base IDs (format varies by year)
# =============================================================
# The numeric part is the same, just the prefix differs:
# 2024: "540-1003" 
# 2025: "540_form_1003"

FIELD_IDS = {
    # Page 1 - Personal Info
    "firstName": "1003",
    "middleInitial": "1004",
    "lastName": "1005",
    "suffix": "1006",
    "ssn": "1007",
    "spouseFirstName": "1008",
    "spouseMiddleInitial": "1009",
    "spouseLastName": "1010",
    "spouseSuffix": "1011",
    "spouseSsn": "1012",
    "address": "1015",
    "apt": "1016",
    "city": "1018",
    "state": "1019",
    "zip": "1020",
    "county": "1028",
    "filingStatus": "1036 RB",
    "line7Count": "1041",
    "line7Amount": "1042",
    "line8Count": "1043",
    "line8Amount": "1044",
    "line9Count": "1045",
    "line9Amount": "1046",
    
    # Page 2 - Dependents & Income
    "page2Name": "2001",
    "page2Ssn": "2002",
    "dep1FirstName": "2003",
    "dep1LastName": "2004",
    "dep1Ssn": "2005",
    "dep1Relationship": "2006",
    "dep2FirstName": "2007",
    "dep2LastName": "2008",
    "dep2Ssn": "2009",
    "dep2Relationship": "2010",
    "dep3FirstName": "2011",
    "dep3LastName": "2012",
    "dep3Ssn": "2013",
    "dep3Relationship": "2014",
    "line10Count": "2015",
    "line10Amount": "2016",
    "line11": "2017",
    "line12": "2018",
    "line13": "2019",
    "line14": "2020",
    "line15": "2021",
    "line16": "2022",
    "line17": "2023",
    "line18": "2024",
    "line19": "2025",
    "line31": "2030",
    "line32": "2031",
    "line33": "2032",
    "line35": "2036",
    "line40": "2037",
    
    # Page 3 - Credits & Payments
    "page3Name": "3003",
    "page3Ssn": "3004",
    "line45": "3005",
    "line46": "3006",
    "line47": "3007",
    "line48": "3008",
    "line61": "3009",
    "line62": "3010",
    "line63": "3011",
    "line64": "3012",
    "line71": "3013",
    "line72": "3014",
    "line73": "3015",
    "line74": "3016",
    "line75": "3017",
    "line76": "3018",
    "line77": "3019",
    "line78": "3022",
    "line91": "3023",
    "line92": "3024",
    "line93": "3025",
    "line94": "3026",
    "line95": "3027",
    
    # Page 4-5 - Refund/Owed
    "line96": "4003",
    "line97": "4004",
    "line98": "4005",
    "line99": "4006",
    "line100": "4007",
    "line111": "5002",
    "line115": "5007",
}

# Tax year specific values
TAX_YEAR_VALUES = {
    2024: {
        "personal_exemption": 149,
        "dependent_exemption": 461,
        "std_ded_single": 5540,
        "std_ded_mfj": 11080,
    },
    2025: {
        "personal_exemption": 153,
        "dependent_exemption": 475,
        "std_ded_single": 5706,
        "std_ded_mfj": 11412,
    }
}


# =============================================================
# HELPERS
# =============================================================
def mask_ssn(ssn: str, show_full: bool = False) -> str:
    if not ssn:
        return ""
    clean = ssn.replace("-", "").replace(" ", "")
    if len(clean) < 4:
        return ssn
    if show_full:
        if len(clean) == 9:
            return f"{clean[:3]}-{clean[3:5]}-{clean[5:]}"
        return ssn
    return f"XXX-XX-{clean[-4:]}"


def fmt_money(value) -> str:
    try:
        return str(int(round(float(value or 0))))
    except:
        return "0"


def set_need_appearances(writer):
    try:
        if "/AcroForm" not in writer._root_object:
            return
        acro_form = writer._root_object["/AcroForm"]
        if isinstance(acro_form, IndirectObject):
            acro_form = acro_form.get_object()
        acro_form[NameObject("/NeedAppearances")] = BooleanObject(True)
    except Exception as e:
        print(f"  ⚠️ NeedAppearances: {e}")


def detect_field_prefix(pdf_fields: dict) -> str:
    """Detect whether PDF uses 2024 or 2025 field naming"""
    for field_name in pdf_fields.keys():
        if field_name.startswith("540_form_"):
            return "540_form_"  # 2025 format
        if field_name.startswith("540-"):
            return "540-"  # 2024 format
    return "540_form_"  # Default to 2025


def get_field_name(key: str, prefix: str) -> str:
    """Convert logical field key to actual PDF field name"""
    base_id = FIELD_IDS.get(key, key)
    return f"{prefix}{base_id}"


# =============================================================
# POST /generate/ca540
# =============================================================
@form_ca540_router.post("/ca540")
async def generate_form_ca540(data: RequestCA540):
    try:
        print(f"\n🌴 === GENERATING CA FORM 540 v4.0 ===")
        
        tax_year = data.tax_year or 2025
        show_full_ssn = data.is_official_submission or (not data.mask_ssn)
        print(f"  📅 Tax Year: {tax_year}")
        print(f"  🔒 SSN Mode: {'FULL' if show_full_ssn else 'MASKED'}")
        
        # Find template - try year-specific first
        template_candidates = [
            os.path.join(STATE_TEMPLATES_DIR, f"ca540_{tax_year}.pdf"),
            os.path.join(STATE_TEMPLATES_DIR, f"{tax_year}-540.pdf"),
            os.path.join(STATE_TEMPLATES_DIR, "2025-540.pdf"),
            os.path.join(STATE_TEMPLATES_DIR, "ca540_2025.pdf"),
            os.path.join(STATE_TEMPLATES_DIR, "ca540_2024.pdf"),
            os.path.join(TEMPLATES_DIR, "state", "2025-540.pdf"),
        ]
        
        template_path = None
        for path in template_candidates:
            if os.path.exists(path):
                template_path = path
                break
        
        if not template_path:
            raise HTTPException(500, f"CA 540 template not found. Tried: {template_candidates[:3]}")
        
        print(f"  📄 Template: {template_path}")
        
        # Load PDF
        reader = PdfReader(template_path)
        writer = PdfWriter()
        writer.clone_reader_document_root(reader)
        
        pdf_fields = reader.get_fields() or {}
        print(f"  📋 PDF has {len(pdf_fields)} form fields")
        
        # Detect field naming convention
        field_prefix = detect_field_prefix(pdf_fields)
        print(f"  🔧 Field prefix: '{field_prefix}' ({'2025' if 'form' in field_prefix else '2024'} format)")
        
        # Get tax year values
        year_vals = TAX_YEAR_VALUES.get(tax_year, TAX_YEAR_VALUES[2025])
        
        # Extract request data
        personal = data.personal.model_dump() if data.personal else {}
        federal = data.federal.model_dump() if data.federal else {}
        state = data.state.model_dump() if data.state else {}
        dependents = [d.model_dump() for d in data.dependents] if data.dependents else []
        
        print(f"\n  📥 DATA RECEIVED:")
        print(f"     Name: {personal.get('first_name')} {personal.get('last_name')}")
        print(f"     Federal AGI: ${federal.get('agi', 0):,.0f}")
        print(f"     CA AGI: ${state.get('ca_agi', 0):,.0f}")
        print(f"     Withholding: ${state.get('withholding', 0):,.0f}")
        
        # Build values dict
        values = {}
        
        def set_field(key, value):
            if value is None or str(value).strip() == "":
                return
            field_name = get_field_name(key, field_prefix)
            values[field_name] = str(value)
        
        # ═══════════════════════════════════════════════════════
        # PERSONAL INFO
        # ═══════════════════════════════════════════════════════
        first_name = personal.get("first_name", "").upper()
        last_name = personal.get("last_name", "").upper()
        ssn_display = mask_ssn(personal.get("ssn", ""), show_full_ssn)
        full_name = f"{first_name} {last_name}".strip()
        
        set_field("firstName", first_name)
        set_field("middleInitial", personal.get("middle_initial", "").upper())
        set_field("lastName", last_name)
        set_field("suffix", personal.get("suffix", "").upper())
        set_field("ssn", ssn_display)
        set_field("address", personal.get("address", "").upper())
        set_field("apt", personal.get("apt", ""))
        set_field("city", personal.get("city", "").upper())
        set_field("state", "CA")
        set_field("zip", personal.get("zip", ""))
        set_field("county", personal.get("county", "").upper())
        
        # Page headers
        set_field("page2Name", full_name)
        set_field("page2Ssn", ssn_display)
        set_field("page3Name", full_name)
        set_field("page3Ssn", ssn_display)
        
        print(f"  👤 {full_name}, SSN: {ssn_display}")
        
        # ═══════════════════════════════════════════════════════
        # FILING STATUS
        # ═══════════════════════════════════════════════════════
        filing_status = federal.get("filing_status", "single")
        status_map = {"single": "1", "married_filing_jointly": "2", "married_filing_separately": "3", "head_of_household": "4", "qualifying_surviving_spouse": "5"}
        values[get_field_name("filingStatus", field_prefix)] = status_map.get(filing_status, "1")
        
        # Spouse info (if MFJ)
        if filing_status == "married_filing_jointly":
            spouse_ssn_display = mask_ssn(personal.get("spouse_ssn", ""), show_full_ssn)
            set_field("spouseFirstName", personal.get("spouse_first_name", "").upper())
            set_field("spouseMiddleInitial", personal.get("spouse_middle_initial", "").upper())
            set_field("spouseLastName", personal.get("spouse_last_name", "").upper())
            set_field("spouseSsn", spouse_ssn_display)
        
        # ═══════════════════════════════════════════════════════
        # EXEMPTIONS
        # ═══════════════════════════════════════════════════════
        ex_count = 2 if filing_status == "married_filing_jointly" else 1
        ex_amount = ex_count * year_vals["personal_exemption"]
        
        set_field("line7Count", str(ex_count))
        set_field("line7Amount", str(ex_amount))
        
        # Dependents
        num_deps = len(dependents)
        for i, dep in enumerate(dependents[:3]):
            dep_first = dep.get("first_name", "").upper() or dep.get("name", "").split()[0].upper() if dep.get("name") else ""
            dep_last = dep.get("last_name", "").upper()
            dep_ssn = mask_ssn(dep.get("ssn", ""), show_full_ssn)
            set_field(f"dep{i+1}FirstName", dep_first)
            set_field(f"dep{i+1}LastName", dep_last)
            set_field(f"dep{i+1}Ssn", dep_ssn)
            set_field(f"dep{i+1}Relationship", dep.get("relationship", "").upper())
        
        dep_exemption = num_deps * year_vals["dependent_exemption"]
        total_exemption = ex_amount + dep_exemption
        
        if num_deps > 0:
            set_field("line10Count", str(num_deps))
            set_field("line10Amount", str(dep_exemption))
        set_field("line11", str(total_exemption))
        
        print(f"  📝 Exemptions: {ex_count}×${year_vals['personal_exemption']} + {num_deps}×${year_vals['dependent_exemption']} = ${total_exemption}")
        
        # ═══════════════════════════════════════════════════════
        # INCOME
        # ═══════════════════════════════════════════════════════
        wages = federal.get("wages", 0) or 0
        federal_agi = federal.get("agi", 0) or 0
        ca_agi = state.get("ca_agi", 0) or federal_agi
        
        # Standard deduction
        default_std = year_vals["std_ded_mfj"] if filing_status == "married_filing_jointly" else year_vals["std_ded_single"]
        ca_std_ded = state.get("standard_deduction", 0) or default_std
        
        # Taxable income
        ca_taxable = state.get("taxable_income", 0) or max(0, ca_agi - ca_std_ded)
        
        set_field("line12", fmt_money(wages))
        set_field("line13", fmt_money(federal_agi))
        set_field("line14", "0")
        set_field("line15", fmt_money(federal_agi))
        set_field("line16", "0")
        set_field("line17", fmt_money(ca_agi))
        set_field("line18", fmt_money(ca_std_ded))
        set_field("line19", fmt_money(ca_taxable))
        
        print(f"  💵 CA AGI: ${ca_agi:,.0f}, Deduction: ${ca_std_ded:,.0f}, Taxable: ${ca_taxable:,.0f}")
        
        # ═══════════════════════════════════════════════════════
        # TAX
        # ═══════════════════════════════════════════════════════
        base_tax = state.get("base_tax", 0) or state.get("total_tax", 0) or 0
        total_tax = state.get("total_tax", base_tax) or base_tax
        tax_after_credits = state.get("tax_after_credits", total_tax) or total_tax
        tax_after_ex = max(0, base_tax - total_exemption)
        
        set_field("line31", fmt_money(base_tax))
        set_field("line32", fmt_money(total_exemption))
        set_field("line33", fmt_money(tax_after_ex))
        set_field("line35", fmt_money(tax_after_ex))
        set_field("line47", "0")
        set_field("line48", fmt_money(tax_after_credits))
        set_field("line64", fmt_money(total_tax))
        
        print(f"  📊 Tax: ${base_tax:,.0f}, After Exemptions: ${tax_after_ex:,.0f}")
        
        # ═══════════════════════════════════════════════════════
        # PAYMENTS
        # ═══════════════════════════════════════════════════════
        withholding = state.get("withholding", 0) or 0
        caleitc = state.get("caleitc", 0) or 0
        yctc = state.get("yctc", 0) or 0
        fytc = state.get("fytc", 0) or 0
        total_payments = withholding + caleitc + yctc + fytc
        
        set_field("line71", fmt_money(withholding))
        set_field("line75", fmt_money(caleitc))
        set_field("line76", fmt_money(yctc))
        set_field("line77", fmt_money(fytc))
        set_field("line78", fmt_money(total_payments))
        set_field("line91", "0")
        set_field("line93", fmt_money(total_payments))
        set_field("line95", fmt_money(total_payments))
        
        print(f"  💳 Withholding: ${withholding:,.0f}, Total Payments: ${total_payments:,.0f}")
        
        # ═══════════════════════════════════════════════════════
        # REFUND / OWED
        # ═══════════════════════════════════════════════════════
        refund = state.get("refund", 0) or 0
        amount_owed = state.get("amount_owed", 0) or 0
        
        if refund == 0 and amount_owed == 0:
            if total_payments > tax_after_credits:
                refund = total_payments - tax_after_credits
            else:
                amount_owed = tax_after_credits - total_payments
        
        if refund > 0:
            set_field("line97", fmt_money(refund))
            set_field("line99", fmt_money(refund))
            set_field("line115", fmt_money(refund))
            print(f"  💰 REFUND: ${refund:,.0f}")
        elif amount_owed > 0:
            set_field("line100", fmt_money(amount_owed))
            set_field("line111", fmt_money(amount_owed))
            print(f"  💸 OWED: ${amount_owed:,.0f}")
        
        # ═══════════════════════════════════════════════════════
        # FILL PDF
        # ═══════════════════════════════════════════════════════
        print(f"\n  📝 Filling {len(values)} fields...")
        
        for page in writer.pages:
            try:
                writer.update_page_form_field_values(page, values, auto_regenerate=False)
            except Exception as e:
                print(f"  ⚠️ Fill error: {e}")
        
        set_need_appearances(writer)
        
        # Save
        suffix = "_CA540_OFFICIAL" if show_full_ssn else "_CA540_PREVIEW"
        output_path = tempfile.mktemp(suffix=f"{suffix}.pdf")
        with open(output_path, "wb") as f:
            writer.write(f)
        
        print(f"  ✅ Saved: {output_path}")
        
        return FileResponse(
            path=output_path,
            media_type='application/pdf',
            filename=f"CA540_{tax_year}_{data.session_id or 'return'}.pdf"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(500, str(e))


@form_ca540_router.get("/ca540/fields")
async def get_ca540_fields():
    return {"form": "CA 540", "version": "4.0", "supports": ["2024", "2025"], "fields": FIELD_IDS}


@form_ca540_router.get("/ca540/test")
async def test_ca540():
    paths = [
        os.path.join(STATE_TEMPLATES_DIR, "2025-540.pdf"),
        os.path.join(STATE_TEMPLATES_DIR, "ca540_2025.pdf"),
        os.path.join(STATE_TEMPLATES_DIR, "ca540_2024.pdf"),
    ]
    found = [p for p in paths if os.path.exists(p)]
    return {"status": "ok" if found else "no_template", "version": "4.0", "found": found}