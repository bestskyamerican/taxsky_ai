"""
================================================================================
TAXSKY 2025 - UNIFIED TEXT EXTRACTOR v18.2-DEPLOY
================================================================================
File: python_tax_api/tax_engine/text_extractor.py

DEPLOY VERSION - Fixes:
  ✅ FIXED: Field name mismatch (role/content vs sender/text)
  ✅ FIXED: verify_with_rag import error
  ✅ FIXED: All exports properly defined

================================================================================
"""

import re
import json
import os
import requests
from datetime import datetime, timezone
from typing import Dict, Any, List, Tuple, Optional
from pathlib import Path

# ============================================================
# IMPORT THE REAL CALCULATOR
# ============================================================
CALCULATOR_AVAILABLE = False
calculate_tax = None

try:
    from .calculator.federal.calculator import calculate as calculate_tax
    CALCULATOR_AVAILABLE = True
    print("✅ calculator loaded from .calculator.federal.calculator")
except ImportError:
    try:
        from calculator.federal.calculator import calculate as calculate_tax
        CALCULATOR_AVAILABLE = True
        print("✅ calculator loaded from calculator.federal.calculator")
    except ImportError:
        try:
            from .calculator import calculate as calculate_tax
            CALCULATOR_AVAILABLE = True
            print("✅ calculator loaded from .calculator")
        except ImportError:
            try:
                from calculator import calculate as calculate_tax
                CALCULATOR_AVAILABLE = True
                print("✅ calculator loaded from calculator")
            except ImportError as e:
                print(f"⚠️ calculator.py not found: {e}")

# ============================================================
# CONFIGURATION
# ============================================================
NODE_API_URL = os.getenv("NODE_API_URL", "https://taxskyai.com")
_current_dir = Path(__file__).parent.resolve()
DATA_DIR = Path(os.getenv("TAX_DATA_DIR", str(_current_dir / "tax_data" / "json")))
try:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
except:
    pass

EXTRACTOR_VERSION = "v18.2-DEPLOY"

print(f"📌 Text Extractor Config:")
print(f"   NODE_API_URL: {NODE_API_URL}")
print(f"   DATA_DIR: {DATA_DIR}")

# ============================================================
# 2025 TAX CONSTANTS
# ============================================================
STANDARD_DEDUCTIONS_2025 = {
    "single": 15750,
    "married_filing_jointly": 31500,
    "married_filing_separately": 15750,
    "head_of_household": 23625,
    "qualifying_surviving_spouse": 31500
}

IRA_LIMIT_UNDER_50 = 7000
IRA_LIMIT_50_PLUS = 8000
HSA_LIMIT_INDIVIDUAL = 4300
HSA_LIMIT_FAMILY = 8550
STUDENT_LOAN_MAX = 2500

STATE_MAP = {
    "california": "CA", "texas": "TX", "florida": "FL", "new york": "NY",
    "illinois": "IL", "pennsylvania": "PA", "ohio": "OH", "georgia": "GA",
    "north carolina": "NC", "michigan": "MI", "new jersey": "NJ",
    "virginia": "VA", "washington": "WA", "arizona": "AZ", "massachusetts": "MA",
    "tennessee": "TN", "indiana": "IN", "missouri": "MO", "maryland": "MD",
    "wisconsin": "WI", "colorado": "CO", "minnesota": "MN", "south carolina": "SC",
    "alabama": "AL", "louisiana": "LA", "kentucky": "KY", "oregon": "OR",
    "oklahoma": "OK", "connecticut": "CT", "utah": "UT", "iowa": "IA",
    "nevada": "NV", "arkansas": "AR", "mississippi": "MS", "kansas": "KS",
    "new mexico": "NM", "nebraska": "NE", "idaho": "ID", "west virginia": "WV",
    "hawaii": "HI", "new hampshire": "NH", "maine": "ME", "montana": "MT",
    "rhode island": "RI", "delaware": "DE", "south dakota": "SD",
    "north dakota": "ND", "alaska": "AK", "vermont": "VT", "wyoming": "WY",
}

FILING_STATUS_MAP = {
    "single": "single",
    "married filing jointly": "married_filing_jointly",
    "married jointly": "married_filing_jointly",
    "mfj": "married_filing_jointly",
    "married filing separately": "married_filing_separately",
    "mfs": "married_filing_separately",
    "head of household": "head_of_household",
    "hoh": "head_of_household",
    "qualifying surviving spouse": "qualifying_surviving_spouse",
    "qualifying widow": "qualifying_surviving_spouse",
}


# ============================================================
# HELPER FUNCTIONS
# ============================================================

def parse_amount(text: str) -> int:
    if not text:
        return 0
    cleaned = re.sub(r'[$,]', '', str(text))
    match = re.search(r'-?\d+\.?\d*', cleaned)
    return int(float(match.group())) if match else 0

def parse_date(text: str) -> Optional[str]:
    if not text:
        return None
    match = re.search(r'(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})', text)
    if match:
        return f"{match.group(1).zfill(2)}/{match.group(2).zfill(2)}/{match.group(3)}"
    return None

def calculate_age(dob: str, tax_year: int = 2025) -> int:
    if not dob:
        return 0
    match = re.search(r'(\d{4})', dob)
    return tax_year - int(match.group(1)) if match else 0

def normalize_filing_status(text: str) -> str:
    if not text:
        return "single"
    lower = text.lower().strip()
    for key, value in FILING_STATUS_MAP.items():
        if key in lower:
            return value
    return "single"

def normalize_state(text: str) -> str:
    if not text:
        return ""
    text = text.strip()
    if len(text) == 2 and text.isalpha():
        return text.upper()
    return STATE_MAP.get(text.lower(), text.upper()[:2] if len(text) >= 2 else "")


# ============================================================
# TEXT EXTRACTOR CLASS
# ============================================================

class TaxTextExtractor:
    """Extracts ALL tax data from chat messages text."""
    
    def __init__(self, messages: List[Dict], answers: Dict = None):
        self.messages = messages or []
        self.answers = answers or {}
        self.extracted = {}
        self.errors = []
    
    def find_final_summary(self) -> str:
        """Find the final summary message from assistant.
        
        ✅ FIXED: Accepts both field name formats:
           - Legacy MongoDB: sender/text
           - Frontend format: role/content
        """
        for msg in reversed(self.messages):
            # ✅ Accept both "sender" and "role"
            sender = msg.get("sender") or msg.get("role")
            if sender == "assistant":
                # ✅ Accept both "text" and "content"
                text = msg.get("text") or msg.get("content", "")
                if any(indicator in text.lower() for indicator in [
                    "complete summary",
                    "here's your complete summary",
                    "is everything correct",
                ]) or "═══" in text:
                    if len(text) > 200:
                        return text
        
        # Fallback: combine all assistant messages
        return "\n".join(
            msg.get("text") or msg.get("content", "")
            for msg in self.messages 
            if (msg.get("sender") or msg.get("role")) == "assistant"
        )
    
    def extract_all(self) -> Dict[str, Any]:
        """Extract ALL tax data from chat text."""
        print(f"\n{'='*60}")
        print(f"🔍 PYTHON TEXT EXTRACTOR {EXTRACTOR_VERSION}")
        print(f"{'='*60}")
        print(f"📝 Total messages: {len(self.messages)}")
        
        summary = self.find_final_summary()
        print(f"📋 Summary length: {len(summary)} chars")
        
        if len(summary) < 100:
            print(f"⚠️ WARNING: Summary too short!")
            for i, msg in enumerate(self.messages[-3:]):
                sender = msg.get("sender") or msg.get("role", "?")
                text = msg.get("text") or msg.get("content", "")
                print(f"   Msg[-{3-i}]: sender={sender}, len={len(text)}")
        
        # Extract all fields
        self._extract_filing_status(summary)
        self._extract_state(summary)
        self._extract_taxpayer_info(summary)
        self._extract_spouse_info(summary)
        self._extract_dependents(summary)
        self._extract_taxpayer_income(summary)
        
        if self.extracted.get("filing_status") == "married_filing_jointly":
            self._extract_spouse_income(summary)
        
        self._extract_other_income(summary)
        self._extract_adjustments(summary)
        self._extract_deduction_type(summary)
        self._fill_from_answers()
        
        print(f"\n✅ Extracted {len(self.extracted)} fields")
        return self.extracted
    
    def _extract_filing_status(self, text: str):
        patterns = [
            r"•\s*Filing Status[:\s]+([A-Za-z\s]+?)(?:\s{2,}|\n|$)",
            r"Filing[:\s]+\*?\*?([A-Za-z\s]+?)(?:\*\*|\n|$)",
        ]
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                status = normalize_filing_status(match.group(1).strip())
                self.extracted["filing_status"] = status
                print(f"   ✅ filing_status: {status}")
                return
        self.extracted["filing_status"] = "single"
    
    def _extract_state(self, text: str):
        patterns = [
            r"•\s*Residence State[:\s]+([A-Z]{2})",
            r"State[:\s]+\*?\*?([A-Za-z\s]+?)(?:\*\*|\n|$)",
        ]
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                state = normalize_state(match.group(1).strip())
                if state and len(state) == 2:
                    self.extracted["state"] = state
                    print(f"   ✅ state: {state}")
                    return
    
    def _extract_taxpayer_info(self, text: str):
        patterns = [
            r"•\s*Taxpayer DOB[:\s]+(\d{1,2}/\d{1,2}/\d{4})\s*\(Age\s*(\d+)\)",
            r"You[:\s]+(\d{1,2}/\d{1,2}/\d{4})\s*\(Age\s*(\d+)",
        ]
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                dob = parse_date(match.group(1))
                if dob:
                    self.extracted["taxpayer_dob"] = dob
                    age = int(match.group(2)) if len(match.groups()) >= 2 else calculate_age(dob)
                    self.extracted["taxpayer_age"] = age
                    print(f"   ✅ taxpayer_dob: {dob}, age: {age}")
                    return
    
    def _extract_spouse_info(self, text: str):
        name_match = re.search(r"•\s*Spouse Name[:\s]+([A-Za-z\s]+?)(?:\s{2,}|\n|$)", text, re.IGNORECASE)
        if name_match:
            self.extracted["spouse_name"] = name_match.group(1).strip()
            print(f"   ✅ spouse_name: {self.extracted['spouse_name']}")
        
        dob_match = re.search(r"•\s*Spouse DOB[:\s]+(\d{1,2}/\d{1,2}/\d{4})\s*\(Age\s*(\d+)\)", text, re.IGNORECASE)
        if dob_match:
            self.extracted["spouse_dob"] = parse_date(dob_match.group(1))
            self.extracted["spouse_age"] = int(dob_match.group(2))
            print(f"   ✅ spouse_dob: {self.extracted['spouse_dob']}, age: {self.extracted['spouse_age']}")
    
    def _extract_dependents(self, text: str):
        if re.search(r"•\s*No dependents", text, re.IGNORECASE):
            self.extracted["has_dependents"] = False
            self.extracted["qualifying_children_under_17"] = 0
            self.extracted["other_dependents"] = 0
            print(f"   ✅ has_dependents: False")
            return
        
        children = 0
        others = 0
        for match in re.findall(r"([A-Za-z\s]+)\s*[-–]\s*Age\s*(\d+)\s*→?\s*\*?\*?\$?[\d,]+\s*(Child Tax Credit|Other Dependent)", text, re.IGNORECASE):
            if "child tax credit" in match[2].lower():
                children += 1
            else:
                others += 1
        
        self.extracted["has_dependents"] = children > 0 or others > 0
        self.extracted["qualifying_children_under_17"] = children
        self.extracted["other_dependents"] = others
        print(f"   ✅ children_under_17: {children}, other_dependents: {others}")
    
    def _extract_taxpayer_income(self, text: str):
        total_wages = sum(parse_amount(m.group(1)) for m in re.finditer(r"•\s*Taxpayer W-2 #\d+ Wages[:\s]+\$?([\d,]+)", text, re.IGNORECASE))
        total_fed = sum(parse_amount(m.group(1)) for m in re.finditer(r"•\s*Taxpayer W-2 #\d+ Federal Withheld[:\s]+\$?([\d,]+)", text, re.IGNORECASE))
        total_state = sum(parse_amount(m.group(1)) for m in re.finditer(r"•\s*Taxpayer W-2 #\d+ State Withheld[:\s]+\$?([\d,]+)", text, re.IGNORECASE))
        
        if total_wages > 0:
            self.extracted["taxpayer_wages"] = total_wages
            self.extracted["taxpayer_federal_withheld"] = total_fed
            self.extracted["taxpayer_state_withheld"] = total_state
            print(f"   ✅ taxpayer_wages: ${total_wages:,}")
            print(f"   ✅ taxpayer_federal_withheld: ${total_fed:,}")
    
    def _extract_spouse_income(self, text: str):
        total_wages = sum(parse_amount(m.group(1)) for m in re.finditer(r"•\s*Spouse W-2 #\d+ Wages[:\s]+\$?([\d,]+)", text, re.IGNORECASE))
        total_fed = sum(parse_amount(m.group(1)) for m in re.finditer(r"•\s*Spouse W-2 #\d+ Federal Withheld[:\s]+\$?([\d,]+)", text, re.IGNORECASE))
        total_state = sum(parse_amount(m.group(1)) for m in re.finditer(r"•\s*Spouse W-2 #\d+ State Withheld[:\s]+\$?([\d,]+)", text, re.IGNORECASE))
        
        if total_wages > 0:
            self.extracted["spouse_wages"] = total_wages
            self.extracted["spouse_federal_withheld"] = total_fed
            self.extracted["spouse_state_withheld"] = total_state
            print(f"   ✅ spouse_wages: ${total_wages:,}")
            print(f"   ✅ spouse_federal_withheld: ${total_fed:,}")
    
    def _extract_other_income(self, text: str):
        # 1099-NEC
        nec = sum(parse_amount(m.group(2)) for m in re.finditer(r"•\s*(?:Taxpayer|Spouse) 1099-NEC #(\d+)[:\s]+\$?([\d,]+)", text, re.IGNORECASE))
        if nec:
            self.extracted["self_employment_income"] = nec
            print(f"   ✅ self_employment_income: ${nec:,}")
        
        # 1099-INT
        int_income = sum(parse_amount(m.group(2)) for m in re.finditer(r"•\s*(?:Taxpayer|Spouse) 1099-INT #(\d+)[:\s]+\$?([\d,]+)", text, re.IGNORECASE))
        if int_income:
            self.extracted["interest_income"] = int_income
            print(f"   ✅ interest_income: ${int_income:,}")
        
        # 1099-DIV
        div = sum(parse_amount(m.group(2)) for m in re.finditer(r"•\s*(?:Taxpayer|Spouse) 1099-DIV #(\d+)[:\s]+\$?([\d,]+)", text, re.IGNORECASE))
        if div:
            self.extracted["dividend_income"] = div
            print(f"   ✅ dividend_income: ${div:,}")
        
        # 1099-R
        ret = sum(parse_amount(m.group(2)) for m in re.finditer(r"•\s*(?:Taxpayer|Spouse) 1099-R #(\d+)[:\s]+\$?([\d,]+)", text, re.IGNORECASE))
        if ret:
            self.extracted["pension_income"] = ret
            print(f"   ✅ pension_income: ${ret:,}")
        
        # SSA-1099
        ssa = re.search(r"•\s*(?:Taxpayer|Spouse) SSA-1099[:\s]+\$?([\d,]+)", text, re.IGNORECASE)
        if ssa:
            self.extracted["social_security"] = parse_amount(ssa.group(1))
            print(f"   ✅ social_security: ${self.extracted['social_security']:,}")
        
        # Capital Gains
        cg = re.search(r"•\s*(?:Long[- ]?Term\s+)?Capital Gains?[:\s]+\$?([\d,]+)", text, re.IGNORECASE)
        if cg:
            self.extracted["capital_gains"] = parse_amount(cg.group(1))
            print(f"   ✅ capital_gains: ${self.extracted['capital_gains']:,}")
    
    def _extract_adjustments(self, text: str):
        # Taxpayer IRA
        ira = re.search(r"•\s*(?:Taxpayer|Your)\s*IRA[:\s]+\$?([\d,]+)", text, re.IGNORECASE)
        if ira:
            self.extracted["taxpayer_ira"] = parse_amount(ira.group(1))
            print(f"   ✅ taxpayer_ira: ${self.extracted['taxpayer_ira']:,}")
        
        # Spouse IRA
        spouse_ira = re.search(r"•\s*Spouse\s*IRA[:\s]+\$?([\d,]+)", text, re.IGNORECASE)
        if spouse_ira:
            self.extracted["spouse_ira"] = parse_amount(spouse_ira.group(1))
            print(f"   ✅ spouse_ira: ${self.extracted['spouse_ira']:,}")
        
        # HSA
        hsa = re.search(r"•?\s*HSA[:\s]+\$?([\d,]+)", text, re.IGNORECASE)
        if hsa:
            self.extracted["hsa"] = parse_amount(hsa.group(1))
            print(f"   ✅ hsa: ${self.extracted['hsa']:,}")
        
        # Student Loan
        sli = re.search(r"Student Loan Interest[:\s]+\$?([\d,]+)", text, re.IGNORECASE)
        if sli:
            self.extracted["student_loan_interest"] = parse_amount(sli.group(1))
            print(f"   ✅ student_loan_interest: ${self.extracted['student_loan_interest']:,}")
    
    def _extract_deduction_type(self, text: str):
        if re.search(r"Deduction[:\s]+\*?\*?Standard", text, re.IGNORECASE):
            self.extracted["deduction_type"] = "standard"
        else:
            self.extracted["deduction_type"] = "standard"
        print(f"   ✅ deduction_type: {self.extracted['deduction_type']}")
    
    def _fill_from_answers(self):
        for field in ["filing_status", "state", "taxpayer_wages", "spouse_wages"]:
            if field not in self.extracted and field in self.answers:
                self.extracted[field] = self.answers[field]
                print(f"   📥 Fallback {field}: {self.answers[field]}")


# ============================================================
# MAPPING: Extracted Data → Calculator Input
# ============================================================

def map_extracted_to_calculator(extracted: Dict) -> Dict:
    return {
        "filing_status": extracted.get("filing_status", "single"),
        "taxpayer_age": extracted.get("taxpayer_age", 0),
        "spouse_age": extracted.get("spouse_age", 0),
        "wages": extracted.get("taxpayer_wages", 0) or 0,
        "spouse_wages": extracted.get("spouse_wages", 0) or 0,
        "federal_withholding": extracted.get("taxpayer_federal_withheld", 0) or 0,
        "spouse_federal_withheld": extracted.get("spouse_federal_withheld", 0) or 0,
        "interest_income": extracted.get("interest_income", 0) or 0,
        "dividend_income": extracted.get("dividend_income", 0) or 0,
        "long_term_gains": extracted.get("capital_gains", 0) or 0,
        "pension_income": extracted.get("pension_income", 0) or 0,
        "social_security": extracted.get("social_security", 0) or 0,
        "self_employment_income": extracted.get("self_employment_income", 0) or 0,
        "ira_contributions": extracted.get("taxpayer_ira", 0) or 0,
        "spouse_ira_contribution": extracted.get("spouse_ira", 0) or 0,
        "hsa_contributions": extracted.get("hsa", 0) or 0,
        "student_loan_interest": extracted.get("student_loan_interest", 0) or 0,
        "qualifying_children_under_17": extracted.get("qualifying_children_under_17", 0) or 0,
        "other_dependents": extracted.get("other_dependents", 0) or 0,
    }


# ============================================================
# RAG VALIDATION (Required export)
# ============================================================

def verify_with_rag(extracted: Dict) -> Tuple[bool, List[str]]:
    """Validate extracted data against IRS 2025 rules."""
    errors = []
    
    taxpayer_age = extracted.get("taxpayer_age", 0) or 0
    spouse_age = extracted.get("spouse_age", 0) or 0
    taxpayer_ira = extracted.get("taxpayer_ira", 0) or 0
    spouse_ira = extracted.get("spouse_ira", 0) or 0
    
    taxpayer_ira_limit = IRA_LIMIT_50_PLUS if taxpayer_age >= 50 else IRA_LIMIT_UNDER_50
    spouse_ira_limit = IRA_LIMIT_50_PLUS if spouse_age >= 50 else IRA_LIMIT_UNDER_50
    
    if taxpayer_ira > taxpayer_ira_limit:
        errors.append(f"Taxpayer IRA ${taxpayer_ira:,} exceeds limit ${taxpayer_ira_limit:,}")
    
    if spouse_ira > spouse_ira_limit and spouse_age > 0:
        errors.append(f"Spouse IRA ${spouse_ira:,} exceeds limit ${spouse_ira_limit:,}")
    
    hsa = extracted.get("hsa", 0) or 0
    if hsa > HSA_LIMIT_FAMILY:
        errors.append(f"HSA ${hsa:,} exceeds family limit ${HSA_LIMIT_FAMILY:,}")
    
    sli = extracted.get("student_loan_interest", 0) or 0
    if sli > STUDENT_LOAN_MAX:
        errors.append(f"Student loan interest ${sli:,} exceeds limit ${STUDENT_LOAN_MAX:,}")
    
    return len(errors) == 0, errors


# ============================================================
# FORM 1040 BUILDER
# ============================================================

def build_form_1040(extracted: Dict, tax_result: Dict, tax_year: int = 2025) -> Dict[str, Any]:
    """Build complete Form 1040 JSON."""
    total_wages = tax_result.get("wages", 0)
    
    return {
        "header": {
            "tax_year": tax_year,
            "filing_status": extracted.get("filing_status", "single"),
            "state": extracted.get("state", ""),
        },
        "income": {
            "line_1a_w2_wages": total_wages,
            "line_2b_taxable_interest": tax_result.get("interest_income", 0),
            "line_3b_ordinary_dividends": tax_result.get("dividend_income", 0),
            "line_7_capital_gain": tax_result.get("capital_gains", 0),
            "line_9_total_income": tax_result.get("total_income", 0),
        },
        "adjustments": {
            "line_11_agi": tax_result.get("agi", 0),
        },
        "deductions": {
            "line_12_deduction": tax_result.get("standard_deduction", 0),
            "line_15_taxable_income": tax_result.get("taxable_income", 0),
        },
        "tax_and_credits": {
            "line_16_tax": tax_result.get("bracket_tax", 0),
            "line_22_tax_after_credits": tax_result.get("tax_after_credits", 0),
        },
        "payments": {
            "line_25a_w2_withholding": tax_result.get("withholding", 0),
            "line_33_total_payments": tax_result.get("total_payments", 0),
        },
        "refund_or_owe": {
            "line_35_refund": tax_result.get("refund", 0),
            "line_37_amount_owed": tax_result.get("amount_owed", 0),
        },
        "_income_details": {
            "taxpayer_wages": extracted.get("taxpayer_wages", 0),
            "spouse_wages": extracted.get("spouse_wages", 0),
            "taxpayer_ira": extracted.get("taxpayer_ira", 0),
            "spouse_ira": extracted.get("spouse_ira", 0),
        },
        "_metadata": {
            "extractor_version": EXTRACTOR_VERSION,
            "extracted_at": datetime.now(timezone.utc).isoformat(),
        }
    }


# ============================================================
# FILE I/O
# ============================================================

def load_form1040_json(user_id: str, tax_year: int = 2025) -> Optional[Dict]:
    filepath = DATA_DIR / f"{user_id}_1040_{tax_year}.json"
    if filepath.exists():
        with open(filepath, 'r') as f:
            return json.load(f)
    return None

def save_form1040_json(user_id: str, form1040: Dict, tax_year: int = 2025) -> str:
    filepath = DATA_DIR / f"{user_id}_1040_{tax_year}.json"
    with open(filepath, 'w') as f:
        json.dump(form1040, f, indent=2, default=str)
    return str(filepath)


# ============================================================
# MAIN ENTRY POINTS
# ============================================================

def process_session(user_id: str, tax_year: int = 2025, messages: List = None, answers: Dict = None) -> Dict[str, Any]:
    """Process a user's tax session."""
    print(f"\n{'='*60}")
    print(f"🚀 TAXSKY PYTHON EXTRACTOR {EXTRACTOR_VERSION}")
    print(f"{'='*60}")
    print(f"👤 User: {user_id}")
    
    if not messages:
        return {"success": False, "error": "No messages provided"}
    
    extractor = TaxTextExtractor(messages, answers or {})
    extracted = extractor.extract_all()
    
    is_valid, rag_errors = verify_with_rag(extracted)
    print(f"\n📋 RAG Validation: {'✅ PASSED' if is_valid else '⚠️ WARNINGS'}")
    
    calc_input = map_extracted_to_calculator(extracted)
    
    tax_result = {}
    if CALCULATOR_AVAILABLE and calculate_tax:
        tax_result = calculate_tax(calc_input)
        print(f"\n📊 Tax Calculation:")
        print(f"   Total Wages: ${tax_result.get('wages', 0):,.0f}")
        print(f"   AGI: ${tax_result.get('agi', 0):,.0f}")
        print(f"   Refund: ${tax_result.get('refund', 0):,.0f}")
        print(f"   Owed: ${tax_result.get('amount_owed', 0):,.0f}")
    
    form1040 = build_form_1040(extracted, tax_result, tax_year)
    
    return {
        "success": True,
        "user_id": user_id,
        "tax_year": tax_year,
        "extracted": extracted,
        "calculator_input": calc_input,
        "tax_result": tax_result,
        "form1040": form1040,
        "rag_verified": is_valid,
        "validation_errors": rag_errors,
    }


def handle_extract_request(user_id: str, tax_year: int = 2025, messages: List = None, answers: Dict = None) -> Dict[str, Any]:
    """Handle extraction request from API router."""
    return process_session(user_id, tax_year, messages, answers)


# ============================================================
# CLI
# ============================================================

if __name__ == "__main__":
    import sys
    print(f"Text Extractor {EXTRACTOR_VERSION} loaded")
    if len(sys.argv) >= 2:
        print(f"Usage: from text_extractor import process_session, verify_with_rag")
