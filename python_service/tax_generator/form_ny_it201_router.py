"""
=============================================================
NEW YORK FORM IT-201 PDF ROUTER - v2.0 with SSN Protection
POST /generate/ny-it201  → Generate NY IT-201 PDF
GET  /generate/ny-it201/fields → Show field mapping
=============================================================
FEATURES:
- SSN masking for preview/print (XXX-XX-1234)
- Full SSN for official e-file submission
- NYC and Yonkers tax support
- Empire State Child Credit
- Actual field IDs from it201_fill_in.pdf
=============================================================
"""

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from pypdf import PdfReader, PdfWriter
from pypdf.generic import NameObject, BooleanObject
import tempfile
import os

# Router
form_ny_it201_router = APIRouter(prefix="/generate", tags=["NY Form IT-201"])

# Template path
TEMPLATES_DIR = os.path.join(os.path.dirname(__file__), "templates")

# =============================================================
# MODELS
# =============================================================
class PersonalNY(BaseModel):
    first_name: str = ""
    middle_initial: str = ""
    last_name: str = ""
    ssn: str = ""
    dob: str = ""  # Date of birth mmddyyyy
    spouse_first_name: str = ""
    spouse_middle_initial: str = ""
    spouse_last_name: str = ""
    spouse_ssn: str = ""
    spouse_dob: str = ""
    # Mailing address
    mail_address: str = ""
    mail_apt: str = ""
    mail_city: str = ""
    mail_state: str = "NY"
    mail_zip: str = ""
    mail_country: str = ""
    # Home address
    home_address: str = ""
    home_apt: str = ""
    home_city: str = ""
    home_zip: str = ""
    # NY specific
    county: str = ""
    school_district_name: str = ""
    school_district_code: str = ""
    # NYC / Yonkers residency
    is_nyc_resident: bool = False
    is_yonkers_resident: bool = False
    nyc_months: int = 12
    nyc_spouse_months: int = 12
    yonkers_months: int = 0
    yonkers_spouse_months: int = 0
    model_config = ConfigDict(extra="allow")


class FederalNY(BaseModel):
    filing_status: str = "single"
    wages: float = 0
    interest: float = 0
    dividends: float = 0
    capital_gain: float = 0
    ira_distributions: float = 0
    pension_income: float = 0
    social_security: float = 0
    other_income: float = 0
    total_income: float = 0
    adjustments: float = 0
    agi: float = 0
    itemized_deductions: float = 0
    model_config = ConfigDict(extra="allow")


class StateNY(BaseModel):
    ny_additions: float = 0
    ny_subtractions: float = 0
    ny_agi: float = 0
    standard_deduction: float = 0
    itemized_deduction: float = 0
    taxable_income: float = 0
    state_tax: float = 0
    nyc_taxable_income: float = 0
    nyc_tax: float = 0
    yonkers_tax: float = 0
    household_credit: float = 0
    child_credit: float = 0
    earned_income_credit: float = 0
    other_credits: float = 0
    total_tax: float = 0
    tax_after_credits: float = 0
    withholding: float = 0
    nyc_withholding: float = 0
    yonkers_withholding: float = 0
    estimated_payments: float = 0
    refund: float = 0
    amount_owed: float = 0
    model_config = ConfigDict(extra="allow")


class DependentNY(BaseModel):
    first_name: str = ""
    middle_initial: str = ""
    last_name: str = ""
    ssn: str = ""
    relationship: str = ""
    dob: str = ""
    model_config = ConfigDict(extra="allow")


class RequestNY_IT201(BaseModel):
    session_id: str = ""
    personal: Optional[PersonalNY] = None
    federal: Optional[FederalNY] = None
    state: Optional[StateNY] = None
    dependents: Optional[List[DependentNY]] = []
    mask_ssn: bool = True
    is_official_submission: bool = False
    model_config = ConfigDict(extra="allow")


# =============================================================
# ACTUAL FIELD MAPPING - Extracted from it201_fill_in.pdf
# =============================================================
FIELDS_NY_IT201 = {
    # ═══════════════════════════════════════════════════════
    # PAGE 1: Personal Information
    # ═══════════════════════════════════════════════════════
    "firstName": "TP_first_name",
    "middleInitial": "TP_MI",
    "lastName": "TP_last_name",
    "dob": "TP_DOB",
    # Note: TP_SSN field not found in PDF - may need text annotation
    
    "spouseFirstName": "Spouse_first_name",
    "spouseMiddleInitial": "Spouse_MI",
    "spouseLastName": "Spouse_last_name",
    "spouseDob": "Spouse_DOB",
    "spouseSsn": "Spouse_SSN",
    
    # Mailing address
    "mailAddress": "TP_mail_address",
    "mailApt": "TP_mail_apt",
    "mailCity": "TP_mail_city",
    "mailState": "TP_mail_state",
    "mailZip": "TP_mail_zip",
    "mailCountry": "TP_mail_country",
    
    # Home address
    "homeAddress": "TP_home_address",
    "homeApt": "TP_home_apt",
    "homeCity": "TP_home_city",
    "homeZip": "TP_home_zip",
    
    # NY Specific
    "county": "NYS_county_residence",
    "schoolDistrictName": "SD_name",
    "schoolDistrictCode": "SD_code",
    
    # Filing Status (radio group)
    "filingStatus": "Filing_status",
    
    # Itemized/Dependent checkboxes
    "itemizedYesNo": "Itemized",
    "dependentYesNo": "Dependent",
    
    # NYC/Yonkers
    "nycResident": "E1",
    "nycDays": "E2",
    "nycMonths": "F1_NYC",
    "nycSpouseMonths": "F2_NYC",
    "yonkersResident": "yonkers_freeze_credit",
    "yonkersMonths": "D1_Yonkers",
    "yonkersSpouseMonths": "D3_Yonkers",
    
    # Dependents (up to 7)
    "dep1First": "H_first1",
    "dep1MI": "H_middle1",
    "dep1Last": "H_last1",
    "dep1Relationship": "H_relationship1",
    "dep1Ssn": "H_dependent_ssn1",
    "dep1Dob": "H_dependent_dob1",
    
    "dep2First": "H_first2",
    "dep2MI": "H_middle2",
    "dep2Last": "H_last2",
    "dep2Relationship": "H_relationship2",
    "dep2Ssn": "H_dependent_ssn2",
    "dep2Dob": "H_dependent_dob2",
    
    "dep3First": "H_first3",
    "dep3MI": "H_middle3",
    "dep3Last": "H_last3",
    "dep3Relationship": "H_relationship3",
    "dep3Ssn": "H_dependent_ssn3",
    "dep3Dob": "H_dependent_dob3",
    
    # ═══════════════════════════════════════════════════════
    # PAGE 2: Federal Income & NY Adjustments (Lines 1-37)
    # ═══════════════════════════════════════════════════════
    "line1": "Line1",      # Wages
    "line2": "Line2",      # Taxable interest
    "line3": "Line3",      # Ordinary dividends
    "line4": "Line4",      # Taxable refunds
    "line5": "Line5",      # Alimony received
    "line6": "Line6",      # Business income
    "line7": "Line7",      # Capital gain/loss
    "line8": "Line8",      # Other gains
    "line9": "Line9",      # IRA distributions
    "line10": "Line10",    # Pensions/annuities
    "line11": "Line11",    # Rental, royalty, etc.
    "line12": "Line12",    # Rental real estate
    "line13": "Line13",    # Farm income
    "line14": "Line14",    # Unemployment
    "line15": "Line15",    # Social Security
    "line16": "Line16",    # Other income
    "line17": "Line17",    # Total federal income
    "line18": "Line18",    # Federal adjustments
    "line19": "Line19",    # Federal AGI
    
    # NY Additions (Lines 20-24)
    "line20": "Line20",    # Interest on non-NY bonds
    "line21": "Line21",    # 414(h) contributions
    "line22": "Line22",    # 529 distributions
    "line23": "Line23",    # Other additions
    "line24": "Line24",    # Total NY income
    
    # NY Subtractions (Lines 25-32)
    "line25": "Line25",    # State/local tax refunds
    "line26": "Line26",    # Government pensions
    "line27": "Line27",    # Social Security
    "line28": "Line28",    # US govt bond interest
    "line29": "Line29",    # Pension exclusion
    "line30": "Line30",    # 529 deduction
    "line31": "Line31",    # Other subtractions
    "line32": "Line32",    # Total subtractions
    
    # NY AGI & Deductions (Lines 33-37)
    "line33": "Line33",    # NY AGI
    "line34": "Line34",    # Standard or itemized
    "line34type": "34Deduction",  # Radio: Standard/Itemized
    "line35": "Line35",    # After deduction
    "line36": "Line36",    # Dependent exemption
    "line37": "Line37",    # NY taxable income
    
    # ═══════════════════════════════════════════════════════
    # PAGE 3: Tax Calculation (Lines 38-61)
    # ═══════════════════════════════════════════════════════
    "namePage3": "Name_as_page1",
    "line38": "Line38",    # Taxable income (from 37)
    "line39": "Line39",    # NYS tax
    "line40": "Line40",    # Household credit
    "line41": "Line41",    # Resident credit
    "line42": "Line42",    # Other NYS credits
    "line43": "Line43",    # Total credits (40+41+42)
    "line44": "Line44",    # After credits
    "line45": "Line45",    # Net other NYS taxes
    "line46": "Line46",    # Total NYS tax
    
    # NYC Tax (Lines 47-54)
    "line47": "Line47",    # NYC taxable income
    "line47a": "Line47a",  # NYC resident tax
    "line48": "Line48",    # NYC household credit
    "line49": "Line49",    # After credit
    "line50": "Line50",    # Part-year NYC tax
    "line51": "Line51",    # Other NYC taxes
    "line52": "Line52",    # Total NYC tax
    "line53": "Line53",    # NYC credits
    "line54": "Line54",    # Net NYC tax
    
    # MCTMT (Lines 54a-54e)
    "line54a": "Line54a",  # MCTMT Zone 1 base
    "line54b": "Line54b",  # MCTMT Zone 2 base
    "line54c": "Line54c",  # MCTMT Zone 1
    "line54d": "Line54d",  # MCTMT Zone 2
    "line54e": "Line54e",  # Total MCTMT
    
    # Yonkers Tax (Lines 55-57)
    "line55": "Line55",    # Yonkers resident surcharge
    "line56": "Line56",    # Yonkers nonresident
    "line57": "Line57",    # Part-year Yonkers
    
    # Totals (Lines 58-61)
    "line58": "Line58",    # Total NYC/Yonkers/MCTMT
    "line59": "Line59",    # Sales/use tax
    "line60": "Line60",    # Voluntary contributions
    "line61": "Line61",    # Grand total tax
    
    # ═══════════════════════════════════════════════════════
    # PAGE 4: Payments & Refund (Lines 62-84)
    # ═══════════════════════════════════════════════════════
    "line62": "Line62",    # Total tax (from 61)
    "line63": "Line63",    # Empire State child credit
    "line64": "Line64",    # Child/dependent care credit
    "line65": "Line65",    # NYS earned income credit
    "line66": "Line66",    # Noncustodial parent EIC
    "line67": "Line67",    # Real property tax credit
    "line68": "Line68",    # College tuition credit
    "line69": "Line69",    # NYC school tax credit (fixed)
    "line69a": "Line69a",  # NYC school tax credit (rate)
    "line70": "Line70",    # NYC earned income credit
    "line70a": "Line70a",  # NYC income elimination credit
    "line71": "Line71",    # Other refundable credits
    "line72": "Line72",    # NYS tax withheld
    "line73": "Line73",    # NYC tax withheld
    "line74": "Line74",    # Yonkers tax withheld
    "line75": "Line75",    # Estimated payments
    "line76": "Line76",    # Total payments
    
    # Refund/Owed (Lines 77-84)
    "line77": "Line77",    # Overpayment
    "line78": "Line78",    # Refund amount
    "line78a": "Line78a",  # 529 deposit
    "line78b": "Line78b",  # Refund after 529
    "line78type": "Line78_refund",  # Radio: direct deposit/check
    "line79": "Line79",    # Apply to next year
    "line80": "Line80",    # Amount owed
    "line81": "Line81",    # Estimated tax penalty
    "line82": "Line82",    # Other penalties
    
    # Bank info
    "accountType": "Line83a_account",
    "routingNumber": "Line83b_routing",
    "accountNumber": "Line83c_account_num",
}

# Filing status values for radio button
FILING_STATUS_VALUES = {
    "single": "/1 Single",
    "married_filing_jointly": "/2 Married Filing Joint Return (enter spouse\u6060 social security number above)",
    "married_filing_separately": "/3 Married Filing Seperate Return (enter spouse\u6060 social security number above)",
    "head_of_household": "/4 Head of Household (with qualifying person)",
    "qualifying_surviving_spouse": "/5 Qualifying surviving spouse"
}


# =============================================================
# SSN PROTECTION HELPERS
# =============================================================
def mask_ssn(ssn: str, show_full: bool = False) -> str:
    """Mask SSN for privacy protection"""
    if not ssn:
        return ""
    digits = ''.join(c for c in ssn if c.isdigit())
    if len(digits) != 9:
        return ssn
    if show_full:
        return f"{digits[:3]}-{digits[3:5]}-{digits[5:]}"
    else:
        return f"XXX-XX-{digits[5:]}"


def fmt_money(value) -> str:
    """Format money value for form field (whole dollars)"""
    if value is None or value == 0:
        return ""
    if isinstance(value, str):
        return value
    return str(int(round(value)))


def set_need_appearances(writer: PdfWriter):
    """Set NeedAppearances flag for PDF form"""
    try:
        if "/AcroForm" in writer._root_object:
            writer._root_object["/AcroForm"][NameObject("/NeedAppearances")] = BooleanObject(True)
        else:
            writer._root_object[NameObject("/AcroForm")] = {
                NameObject("/NeedAppearances"): BooleanObject(True)
            }
    except Exception as e:
        print(f"  ⚠️ Could not set NeedAppearances: {e}")


# =============================================================
# MAIN ENDPOINT
# =============================================================
@form_ny_it201_router.post("/ny-it201")
async def generate_ny_it201(data: RequestNY_IT201):
    """Generate NY Form IT-201 PDF"""
    try:
        # Check template
        template_path = os.path.join(TEMPLATES_DIR, "it201_fill_in.pdf")
        if not os.path.exists(template_path):
            alt_names = ["NY_IT201_2025.pdf", "IT-201_2025.pdf", "it201.pdf"]
            for alt in alt_names:
                alt_path = os.path.join(TEMPLATES_DIR, alt)
                if os.path.exists(alt_path):
                    template_path = alt_path
                    break
            else:
                raise HTTPException(404, f"NY IT-201 template not found in {TEMPLATES_DIR}")
        
        print(f"\n{'='*60}")
        print(f"NY IT-201 GENERATOR v2.0")
        print(f"{'='*60}")
        
        show_full_ssn = data.is_official_submission or not data.mask_ssn
        mode = "OFFICIAL (Full SSN)" if show_full_ssn else "PREVIEW (Masked SSN)"
        print(f"  Mode: {mode}")
        
        # Get data sections
        personal = data.personal.model_dump() if data.personal else {}
        federal = data.federal.model_dump() if data.federal else {}
        state = data.state.model_dump() if data.state else {}
        dependents = [d.model_dump() for d in data.dependents] if data.dependents else []
        
        # Open template
        reader = PdfReader(template_path)
        writer = PdfWriter()
        for page in reader.pages:
            writer.add_page(page)
        
        fields = reader.get_fields() or {}
        field_names = set(fields.keys())
        print(f"  Template has {len(field_names)} fillable fields")
        
        # Track filled fields
        filled_values = {}
        
        def set_field(key: str, value: str, page: int = 0):
            if not value:
                return
            field_id = FIELDS_NY_IT201.get(key)
            if field_id and field_id in field_names:
                filled_values[field_id] = value
        
        # ═══════════════════════════════════════════════════════
        # PAGE 1: PERSONAL INFO
        # ═══════════════════════════════════════════════════════
        first_name = personal.get("first_name", "").upper()
        last_name = personal.get("last_name", "").upper()
        
        print(f"\n  👤 Taxpayer: {first_name} {last_name}")
        set_field("firstName", first_name)
        set_field("middleInitial", personal.get("middle_initial", "").upper())
        set_field("lastName", last_name)
        set_field("dob", personal.get("dob", ""))
        
        # Mailing address
        print(f"\n  🏠 Address:")
        set_field("mailAddress", personal.get("mail_address", "").upper())
        set_field("mailApt", personal.get("mail_apt", ""))
        set_field("mailCity", personal.get("mail_city", "").upper())
        set_field("mailState", personal.get("mail_state", "NY"))
        set_field("mailZip", personal.get("mail_zip", ""))
        set_field("county", personal.get("county", "").upper())
        set_field("schoolDistrictName", personal.get("school_district_name", ""))
        set_field("schoolDistrictCode", personal.get("school_district_code", ""))
        
        # Home address if different
        if personal.get("home_address"):
            set_field("homeAddress", personal.get("home_address", "").upper())
            set_field("homeApt", personal.get("home_apt", ""))
            set_field("homeCity", personal.get("home_city", "").upper())
            set_field("homeZip", personal.get("home_zip", ""))
        
        # ═══════════════════════════════════════════════════════
        # FILING STATUS
        # ═══════════════════════════════════════════════════════
        filing_status = federal.get("filing_status", "single")
        status_value = FILING_STATUS_VALUES.get(filing_status, "/1 Single")
        print(f"\n  📋 Filing Status: {filing_status}")
        filled_values["Filing_status"] = status_value
        
        # ═══════════════════════════════════════════════════════
        # SPOUSE (MFJ)
        # ═══════════════════════════════════════════════════════
        if filing_status == "married_filing_jointly":
            spouse_first = personal.get("spouse_first_name", "").upper()
            spouse_last = personal.get("spouse_last_name", "").upper()
            spouse_ssn_raw = personal.get("spouse_ssn", "")
            spouse_ssn_display = mask_ssn(spouse_ssn_raw, show_full=show_full_ssn)
            
            print(f"\n  👫 Spouse: {spouse_first} {spouse_last}, SSN: {spouse_ssn_display}")
            set_field("spouseFirstName", spouse_first)
            set_field("spouseMiddleInitial", personal.get("spouse_middle_initial", "").upper())
            set_field("spouseLastName", spouse_last)
            set_field("spouseDob", personal.get("spouse_dob", ""))
            set_field("spouseSsn", spouse_ssn_display)
        
        # ═══════════════════════════════════════════════════════
        # NYC / YONKERS RESIDENCY
        # ═══════════════════════════════════════════════════════
        is_nyc = personal.get("is_nyc_resident", False)
        is_yonkers = personal.get("is_yonkers_resident", False)
        
        if is_nyc:
            nyc_months = personal.get("nyc_months", 12)
            print(f"\n  🗽 NYC Resident: {nyc_months} months")
            filled_values["E1"] = "/yes"
            set_field("nycMonths", str(nyc_months))
            if filing_status == "married_filing_jointly":
                set_field("nycSpouseMonths", str(personal.get("nyc_spouse_months", 12)))
        else:
            filled_values["E1"] = "/no"
        
        if is_yonkers:
            print(f"\n  🏙️ Yonkers Resident")
            filled_values["yonkers_freeze_credit"] = "/yes"
            set_field("yonkersMonths", str(personal.get("yonkers_months", 12)))
        
        # ═══════════════════════════════════════════════════════
        # DEPENDENTS
        # ═══════════════════════════════════════════════════════
        num_deps = len(dependents)
        if num_deps > 0:
            print(f"\n  👶 Dependents: {num_deps}")
        
        for i, dep in enumerate(dependents[:7]):
            idx = i + 1
            dep_first = dep.get("first_name", "").upper()
            dep_last = dep.get("last_name", "").upper()
            dep_ssn_raw = dep.get("ssn", "")
            dep_ssn_display = mask_ssn(dep_ssn_raw, show_full=show_full_ssn)
            
            set_field(f"dep{idx}First", dep_first)
            set_field(f"dep{idx}MI", dep.get("middle_initial", "").upper())
            set_field(f"dep{idx}Last", dep_last)
            set_field(f"dep{idx}Relationship", dep.get("relationship", "").upper())
            set_field(f"dep{idx}Ssn", dep_ssn_display)
            set_field(f"dep{idx}Dob", dep.get("dob", ""))
            print(f"    Dep{idx}: {dep_first} {dep_last}, SSN: {dep_ssn_display}")
        
        # ═══════════════════════════════════════════════════════
        # PAGE 2: INCOME (Lines 1-19)
        # ═══════════════════════════════════════════════════════
        wages = federal.get("wages", 0)
        interest = federal.get("interest", 0)
        dividends = federal.get("dividends", 0)
        capital_gain = federal.get("capital_gain", 0)
        ira = federal.get("ira_distributions", 0)
        pension = federal.get("pension_income", 0)
        ss = federal.get("social_security", 0)
        other = federal.get("other_income", 0)
        federal_agi = federal.get("agi", 0)
        
        print(f"\n  💵 Income:")
        print(f"     Wages: ${wages:,.0f}")
        print(f"     Federal AGI: ${federal_agi:,.0f}")
        
        set_field("line1", fmt_money(wages))
        set_field("line2", fmt_money(interest))
        set_field("line3", fmt_money(dividends))
        set_field("line7", fmt_money(capital_gain))
        set_field("line9", fmt_money(ira))
        set_field("line10", fmt_money(pension))
        set_field("line15", fmt_money(ss))
        set_field("line16", fmt_money(other))
        set_field("line17", fmt_money(federal.get("total_income", federal_agi)))
        set_field("line18", fmt_money(federal.get("adjustments", 0)))
        set_field("line19", fmt_money(federal_agi))
        
        # ═══════════════════════════════════════════════════════
        # NY ADJUSTMENTS (Lines 20-37)
        # ═══════════════════════════════════════════════════════
        ny_additions = state.get("ny_additions", 0)
        ny_subtractions = state.get("ny_subtractions", 0)
        ny_agi = state.get("ny_agi", federal_agi)
        std_ded = state.get("standard_deduction", 0)
        itemized = state.get("itemized_deduction", 0)
        taxable_income = state.get("taxable_income", 0)
        
        print(f"\n  📝 NY Adjustments:")
        print(f"     NY AGI: ${ny_agi:,.0f}")
        print(f"     Standard Deduction: ${std_ded:,.0f}")
        print(f"     Taxable Income: ${taxable_income:,.0f}")
        
        set_field("line24", fmt_money(federal_agi + ny_additions))
        set_field("line27", fmt_money(ss))  # SS subtraction
        set_field("line32", fmt_money(ny_subtractions))
        set_field("line33", fmt_money(ny_agi))
        
        # Deduction type
        if itemized > std_ded:
            set_field("line34", fmt_money(itemized))
            filled_values["34Deduction"] = "/Itemized"
        else:
            set_field("line34", fmt_money(std_ded))
            filled_values["34Deduction"] = "/Standard"
        
        set_field("line35", fmt_money(max(0, ny_agi - max(std_ded, itemized))))
        set_field("line36", fmt_money(num_deps * 1000))  # $1,000 per dependent
        set_field("line37", fmt_money(taxable_income))
        
        # ═══════════════════════════════════════════════════════
        # PAGE 3: TAX CALCULATION (Lines 38-61)
        # ═══════════════════════════════════════════════════════
        state_tax = state.get("state_tax", 0)
        nyc_tax = state.get("nyc_tax", 0)
        yonkers_tax = state.get("yonkers_tax", 0)
        household_credit = state.get("household_credit", 0)
        total_tax = state.get("total_tax", state_tax + nyc_tax + yonkers_tax)
        
        print(f"\n  📊 Tax Calculation:")
        print(f"     NY State Tax: ${state_tax:,.2f}")
        if nyc_tax > 0:
            print(f"     NYC Tax: ${nyc_tax:,.2f}")
        if yonkers_tax > 0:
            print(f"     Yonkers Tax: ${yonkers_tax:,.2f}")
        
        set_field("line38", fmt_money(taxable_income))
        set_field("line39", fmt_money(state_tax))
        set_field("line40", fmt_money(household_credit))
        set_field("line43", fmt_money(household_credit))
        set_field("line44", fmt_money(max(0, state_tax - household_credit)))
        set_field("line46", fmt_money(state_tax))
        
        # NYC Tax
        if is_nyc and nyc_tax > 0:
            set_field("line47", fmt_money(taxable_income))
            set_field("line47a", fmt_money(nyc_tax))
            set_field("line49", fmt_money(nyc_tax))
            set_field("line52", fmt_money(nyc_tax))
            set_field("line54", fmt_money(nyc_tax))
        
        # Yonkers Tax
        if is_yonkers and yonkers_tax > 0:
            set_field("line55", fmt_money(yonkers_tax))
        
        # Totals
        set_field("line58", fmt_money(nyc_tax + yonkers_tax))
        set_field("line61", fmt_money(total_tax))
        
        # ═══════════════════════════════════════════════════════
        # PAGE 4: PAYMENTS & REFUND (Lines 62-80)
        # ═══════════════════════════════════════════════════════
        withholding = state.get("withholding", 0)
        nyc_withholding = state.get("nyc_withholding", 0)
        yonkers_withholding = state.get("yonkers_withholding", 0)
        estimated = state.get("estimated_payments", 0)
        child_credit = state.get("child_credit", 0)
        eic = state.get("earned_income_credit", 0)
        
        total_payments = withholding + nyc_withholding + yonkers_withholding + estimated + child_credit + eic
        
        print(f"\n  💳 Payments:")
        print(f"     Withholding: ${withholding:,.0f}")
        if child_credit > 0:
            print(f"     Child Credit: ${child_credit:,.0f}")
        if eic > 0:
            print(f"     EIC: ${eic:,.0f}")
        print(f"     Total: ${total_payments:,.0f}")
        
        set_field("line62", fmt_money(total_tax))
        set_field("line63", fmt_money(child_credit))
        set_field("line65", fmt_money(eic))
        set_field("line72", fmt_money(withholding))
        set_field("line73", fmt_money(nyc_withholding))
        set_field("line74", fmt_money(yonkers_withholding))
        set_field("line75", fmt_money(estimated))
        set_field("line76", fmt_money(total_payments))
        
        # ═══════════════════════════════════════════════════════
        # REFUND OR OWE
        # ═══════════════════════════════════════════════════════
        refund = state.get("refund", 0)
        amount_owed = state.get("amount_owed", 0)
        
        if refund == 0 and amount_owed == 0:
            tax_after_credits = state.get("tax_after_credits", total_tax)
            if total_payments > tax_after_credits:
                refund = total_payments - tax_after_credits
            else:
                amount_owed = tax_after_credits - total_payments
        
        if refund > 0:
            print(f"\n  💰 REFUND: ${refund:,.2f}")
            set_field("line77", fmt_money(refund))
            set_field("line78", fmt_money(refund))
            set_field("line78b", fmt_money(refund))
        elif amount_owed > 0:
            print(f"\n  💸 AMOUNT OWED: ${amount_owed:,.2f}")
            set_field("line80", fmt_money(amount_owed))
        
        # ═══════════════════════════════════════════════════════
        # FILL ALL FIELDS
        # ═══════════════════════════════════════════════════════
        print(f"\n  Filling {len(filled_values)} form fields...")
        
        for page_num in range(len(writer.pages)):
            try:
                writer.update_page_form_field_values(
                    writer.pages[page_num], 
                    filled_values, 
                    auto_regenerate=False
                )
            except Exception as e:
                print(f"  ⚠️ Error on page {page_num+1}: {e}")
        
        set_need_appearances(writer)
        
        # Save
        suffix = "_IT201_OFFICIAL" if show_full_ssn else "_IT201_PREVIEW"
        output_path = tempfile.mktemp(suffix=f"{suffix}.pdf")
        with open(output_path, "wb") as f:
            writer.write(f)
        
        print(f"\n  ✅ NY IT-201 saved: {output_path}")
        
        return FileResponse(
            path=output_path,
            media_type='application/pdf',
            filename=f"NY_IT201_{data.session_id or 'return'}{'_OFFICIAL' if show_full_ssn else '_PREVIEW'}.pdf"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(500, str(e))


# =============================================================
# INFO ENDPOINTS
# =============================================================
@form_ny_it201_router.get("/ny-it201/fields")
async def get_ny_it201_fields():
    """Return NY IT-201 field mappings"""
    return {
        "form": "New York Form IT-201",
        "year": 2025,
        "version": "2.0",
        "total_fields": len(FIELDS_NY_IT201),
        "fields": FIELDS_NY_IT201
    }


@form_ny_it201_router.get("/ny-it201/test")
async def test_ny_it201():
    """Test endpoint"""
    template_path = os.path.join(TEMPLATES_DIR, "it201_fill_in.pdf")
    return {
        "status": "ok" if os.path.exists(template_path) else "template_missing",
        "version": "2.0",
        "template": template_path,
        "exists": os.path.exists(template_path)
    }
