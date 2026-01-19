"""
================================================================================
TAXSKY 2025 - UNIFIED TEXT EXTRACTOR v18.2-FIXED
================================================================================
File: python_tax_api/tax_engine/text_extractor.py

✅ FIXED in v18.2-FIXED: Field name mismatch bug
   - Now accepts both sender/text (legacy) AND role/content (frontend)
   - This was causing $0 extraction because Python couldn't find messages

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
# IMPORT THE REAL CALCULATOR (Single Source of Truth)
# ============================================================
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
                print(f"⚠️ calculator.py not found - tax calculations will fail: {e}")
                CALCULATOR_AVAILABLE = False
                calculate_tax = None

# ============================================================
# CONFIGURATION
# ============================================================
NODE_API_URL = os.getenv("NODE_API_URL", "http://localhost:3000")
_current_dir = Path(__file__).parent.resolve()
DATA_DIR = Path(os.getenv("TAX_DATA_DIR", str(_current_dir / "tax_data" / "json")))
DATA_DIR.mkdir(parents=True, exist_ok=True)

EXTRACTOR_VERSION = "v18.2-FIXED"

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
    if match:
        return int(float(match.group()))
    return 0

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
    if match:
        birth_year = int(match.group(1))
        return tax_year - birth_year
    return 0

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
    lower = text.lower()
    return STATE_MAP.get(lower, text.upper()[:2] if len(text) >= 2 else "")


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
    
    # ════════════════════════════════════════════════════════════
    # ✅ FIXED: This method now handles both field name formats
    # ════════════════════════════════════════════════════════════
    def find_final_summary(self) -> str:
        """Find the final summary message from assistant.
        
        ✅ FIXED in v18.2-FIXED: Accepts both field name formats:
           - Legacy MongoDB: sender/text
           - Frontend format: role/content
        """
        for msg in reversed(self.messages):
            # ✅ FIXED: Accept both "sender" (legacy) and "role" (frontend)
            sender = msg.get("sender") or msg.get("role")
            if sender == "assistant":
                # ✅ FIXED: Accept both "text" (legacy) and "content" (frontend)
                text = msg.get("text") or msg.get("content", "")
                if any(indicator in text.lower() for indicator in [
                    "complete summary",
                    "here's your complete summary",
                    "is everything correct",
                ]) or "═══" in text:
                    if len(text) > 200:
                        return text
        
        # Fallback: combine all assistant messages
        # ✅ FIXED: Handle both field name formats
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
        
        # Debug: if summary is too short, show message structure
        if len(summary) < 100:
            print(f"⚠️ WARNING: Summary too short! Checking message structure...")
            for i, msg in enumerate(self.messages[-3:]):
                sender = msg.get("sender") or msg.get("role", "unknown")
                text = msg.get("text") or msg.get("content", "")
                print(f"   Message[-{3-i}]: sender={sender}, len={len(text)}")
        
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
        
        # Fill from answers as fallback
        self._fill_from_answers()
        
        print(f"\n✅ Extracted {len(self.extracted)} fields")
        return self.extracted
    
    def _extract_filing_status(self, text: str):
        patterns = [
            r"•\s*Filing Status[:\s]+([A-Za-z\s]+?)(?:\s{2,}|\n|$)",
            r"Filing[:\s]+\*?\*?([A-Za-z\s]+?)(?:\*\*|\n|$)",
            r"Filing Status[:\s]+\*?\*?([A-Za-z\s]+?)(?:\*\*|\n|$)",
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
            r"Residence[:\s]+\*?\*?([A-Za-z\s]+?)(?:\*\*|\n|$)",
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
                    if len(match.groups()) >= 2 and match.group(2):
                        age = int(match.group(2))
                    else:
                        age = calculate_age(dob)
                    self.extracted["taxpayer_age"] = age
                    self.extracted["taxpayer_is_50_or_older"] = age >= 50
                    self.extracted["taxpayer_is_65_or_older"] = age >= 65
                    print(f"   ✅ taxpayer_dob: {dob}, age: {age}")
                    return
    
    def _extract_spouse_info(self, text: str):
        name_match = re.search(r"•\s*Spouse Name[:\s]+([A-Za-z\s]+?)(?:\s{2,}|\n|$)", text, re.IGNORECASE)
        if name_match:
            name = name_match.group(1).strip()
            self.extracted["spouse_name"] = name
            print(f"   ✅ spouse_name: {name}")
        
        dob_match = re.search(r"•\s*Spouse DOB[:\s]+(\d{1,2}/\d{1,2}/\d{4})\s*\(Age\s*(\d+)\)", text, re.IGNORECASE)
        if dob_match:
            dob = parse_date(dob_match.group(1))
            age = int(dob_match.group(2))
            if dob:
                self.extracted["spouse_dob"] = dob
                self.extracted["spouse_age"] = age
                self.extracted["spouse_is_50_or_older"] = age >= 50
                self.extracted["spouse_is_65_or_older"] = age >= 65
                print(f"   ✅ spouse_dob: {dob}, age: {age}")
    
    def _extract_dependents(self, text: str):
        if re.search(r"•\s*No dependents", text, re.IGNORECASE):
            self.extracted["has_dependents"] = False
            self.extracted["children_under_17"] = 0
            self.extracted["qualifying_children_under_17"] = 0
            self.extracted["other_dependents"] = 0
            print(f"   ✅ has_dependents: False (No dependents)")
            return
        
        children_under_17 = 0
        other_dependents = 0
        
        dep_matches = re.findall(
            r"([A-Za-z\s]+)\s*[-–]\s*Age\s*(\d+)\s*→?\s*\*?\*?\$?[\d,]+\s*(Child Tax Credit|Other Dependent)",
            text, re.IGNORECASE
        )
        
        for match in dep_matches:
            name, age_str, credit_type = match
            if "child tax credit" in credit_type.lower():
                children_under_17 += 1
            elif "other dependent" in credit_type.lower():
                other_dependents += 1
        
        if children_under_17 == 0 and other_dependents == 0:
            age_matches = re.findall(r"([A-Za-z\s]+)\s*[-–]\s*Age\s*(\d+)", text, re.IGNORECASE)
            for name, age_str in age_matches:
                if name.strip() and not any(skip in name.lower() for skip in ['you', 'spouse', 'filing', 'taxpayer']):
                    age = int(age_str)
                    if age <= 16:
                        children_under_17 += 1
                    else:
                        other_dependents += 1
        
        has_deps = children_under_17 > 0 or other_dependents > 0
        self.extracted["has_dependents"] = has_deps
        self.extracted["children_under_17"] = children_under_17
        self.extracted["qualifying_children_under_17"] = children_under_17
        self.extracted["other_dependents"] = other_dependents
        
        print(f"   ✅ qualifying_children (age ≤16): {children_under_17}")
        print(f"   ✅ other_dependents (age ≥17): {other_dependents}")
    
    def _extract_taxpayer_income(self, text: str):
        # Sum ALL taxpayer W-2s
        total_wages = 0
        total_fed = 0
        total_state = 0
        
        for match in re.finditer(r"•\s*Taxpayer W-2 #\d+ Wages[:\s]+\$?([\d,]+)", text, re.IGNORECASE):
            total_wages += parse_amount(match.group(1))
        
        for match in re.finditer(r"•\s*Taxpayer W-2 #\d+ Federal Withheld[:\s]+\$?([\d,]+)", text, re.IGNORECASE):
            total_fed += parse_amount(match.group(1))
        
        for match in re.finditer(r"•\s*Taxpayer W-2 #\d+ State Withheld[:\s]+\$?([\d,]+)", text, re.IGNORECASE):
            total_state += parse_amount(match.group(1))
        
        if total_wages > 0:
            self.extracted["taxpayer_wages"] = total_wages
            print(f"   ✅ taxpayer_wages: ${total_wages:,}")
        if total_fed > 0:
            self.extracted["taxpayer_federal_withheld"] = total_fed
            print(f"   ✅ taxpayer_federal_withheld: ${total_fed:,}")
        if total_state >= 0 and total_wages > 0:
            self.extracted["taxpayer_state_withheld"] = total_state
            print(f"   ✅ taxpayer_state_withheld: ${total_state:,}")
    
    def _extract_spouse_income(self, text: str):
        # Sum ALL spouse W-2s
        total_wages = 0
        total_fed = 0
        total_state = 0
        
        for match in re.finditer(r"•\s*Spouse W-2 #\d+ Wages[:\s]+\$?([\d,]+)", text, re.IGNORECASE):
            total_wages += parse_amount(match.group(1))
        
        for match in re.finditer(r"•\s*Spouse W-2 #\d+ Federal Withheld[:\s]+\$?([\d,]+)", text, re.IGNORECASE):
            total_fed += parse_amount(match.group(1))
        
        for match in re.finditer(r"•\s*Spouse W-2 #\d+ State Withheld[:\s]+\$?([\d,]+)", text, re.IGNORECASE):
            total_state += parse_amount(match.group(1))
        
        if total_wages > 0:
            self.extracted["spouse_wages"] = total_wages
            print(f"   ✅ spouse_wages: ${total_wages:,}")
        if total_fed > 0:
            self.extracted["spouse_federal_withheld"] = total_fed
            print(f"   ✅ spouse_federal_withheld: ${total_fed:,}")
        if total_state >= 0 and total_wages > 0:
            self.extracted["spouse_state_withheld"] = total_state
            print(f"   ✅ spouse_state_withheld: ${total_state:,}")
        
        # Fallback: try spouse name pattern
        if "spouse_wages" not in self.extracted:
            spouse_name = self.extracted.get("spouse_name", "")
            if spouse_name:
                name_escaped = re.escape(spouse_name)
                pattern = rf"•\s*{name_escaped}'s W-2 #\d+ Wages[:\s]+\$?([\d,]+)"
                match = re.search(pattern, text, re.IGNORECASE)
                if match:
                    wages = parse_amount(match.group(1))
                    self.extracted["spouse_wages"] = wages
                    print(f"   ✅ spouse_wages (by name): ${wages:,}")
    
    def _extract_other_income(self, text: str):
        # 1099-NEC
        taxpayer_nec = sum(parse_amount(m.group(2)) for m in re.finditer(r"•\s*Taxpayer 1099-NEC #(\d+)[:\s]+\$?([\d,]+)", text, re.IGNORECASE))
        if taxpayer_nec:
            self.extracted["taxpayer_self_employment"] = taxpayer_nec
            self.extracted["self_employment_income"] = taxpayer_nec
            print(f"   ✅ taxpayer_self_employment: ${taxpayer_nec:,}")
        
        spouse_nec = sum(parse_amount(m.group(2)) for m in re.finditer(r"•\s*Spouse 1099-NEC #(\d+)[:\s]+\$?([\d,]+)", text, re.IGNORECASE))
        if spouse_nec:
            self.extracted["spouse_self_employment"] = spouse_nec
            self.extracted["self_employment_income"] = self.extracted.get("self_employment_income", 0) + spouse_nec
            print(f"   ✅ spouse_self_employment: ${spouse_nec:,}")
        
        # 1099-INT
        taxpayer_int = sum(parse_amount(m.group(2)) for m in re.finditer(r"•\s*Taxpayer 1099-INT #(\d+)[:\s]+\$?([\d,]+)", text, re.IGNORECASE))
        spouse_int = sum(parse_amount(m.group(2)) for m in re.finditer(r"•\s*Spouse 1099-INT #(\d+)[:\s]+\$?([\d,]+)", text, re.IGNORECASE))
        if taxpayer_int or spouse_int:
            self.extracted["interest_income"] = taxpayer_int + spouse_int
            print(f"   ✅ interest_income: ${taxpayer_int + spouse_int:,}")
        
        # 1099-DIV
        taxpayer_div = sum(parse_amount(m.group(2)) for m in re.finditer(r"•\s*Taxpayer 1099-DIV #(\d+)[:\s]+\$?([\d,]+)", text, re.IGNORECASE))
        spouse_div = sum(parse_amount(m.group(2)) for m in re.finditer(r"•\s*Spouse 1099-DIV #(\d+)[:\s]+\$?([\d,]+)", text, re.IGNORECASE))
        if taxpayer_div or spouse_div:
            self.extracted["dividend_income"] = taxpayer_div + spouse_div
            print(f"   ✅ dividend_income: ${taxpayer_div + spouse_div:,}")
        
        # 1099-R
        taxpayer_ret = sum(parse_amount(m.group(2)) for m in re.finditer(r"•\s*Taxpayer 1099-R #(\d+)[:\s]+\$?([\d,]+)", text, re.IGNORECASE))
        spouse_ret = sum(parse_amount(m.group(2)) for m in re.finditer(r"•\s*Spouse 1099-R #(\d+)[:\s]+\$?([\d,]+)", text, re.IGNORECASE))
        if taxpayer_ret or spouse_ret:
            self.extracted["pension_income"] = taxpayer_ret + spouse_ret
            print(f"   ✅ pension_income: ${taxpayer_ret + spouse_ret:,}")
        
        # SSA-1099
        ssa_match = re.search(r"•\s*Taxpayer SSA-1099[:\s]+\$?([\d,]+)", text, re.IGNORECASE)
        spouse_ssa = re.search(r"•\s*Spouse SSA-1099[:\s]+\$?([\d,]+)", text, re.IGNORECASE)
        total_ss = (parse_amount(ssa_match.group(1)) if ssa_match else 0) + (parse_amount(spouse_ssa.group(1)) if spouse_ssa else 0)
        if total_ss:
            self.extracted["social_security"] = total_ss
            print(f"   ✅ social_security: ${total_ss:,}")
        
        # Capital Gains
        ltcg = re.search(r"•\s*(?:Long[- ]?Term\s+)?Capital Gains?[:\s]+\$?([\d,]+)", text, re.IGNORECASE)
        if ltcg:
            self.extracted["capital_gains"] = parse_amount(ltcg.group(1))
            print(f"   ✅ capital_gains: ${self.extracted['capital_gains']:,}")
    
    def _extract_adjustments(self, text: str):
        # Taxpayer IRA
        ira_match = re.search(r"•\s*(?:Taxpayer|Your)\s*IRA[:\s]+\$?([\d,]+)", text, re.IGNORECASE)
        if ira_match:
            amount = parse_amount(ira_match.group(1))
            self.extracted["taxpayer_ira"] = amount
            print(f"   ✅ taxpayer_ira: ${amount:,}")
        
        # Spouse IRA
        spouse_ira_match = re.search(r"•\s*Spouse\s*IRA[:\s]+\$?([\d,]+)", text, re.IGNORECASE)
        if spouse_ira_match:
            amount = parse_amount(spouse_ira_match.group(1))
            self.extracted["spouse_ira"] = amount
            print(f"   ✅ spouse_ira: ${amount:,}")
        
        # Fallback: spouse name IRA
        if "spouse_ira" not in self.extracted:
            spouse_name = self.extracted.get("spouse_name", "")
            if spouse_name:
                pattern = rf"•\s*{re.escape(spouse_name)}'s\s*(?:Traditional\s+)?IRA[:\s]+\$?([\d,]+)"
                match = re.search(pattern, text, re.IGNORECASE)
                if match:
                    amount = parse_amount(match.group(1))
                    self.extracted["spouse_ira"] = amount
                    print(f"   ✅ spouse_ira (by name): ${amount:,}")
        
        # HSA
        hsa_match = re.search(r"•?\s*HSA[:\s]+\$?([\d,]+)", text, re.IGNORECASE)
        if hsa_match:
            self.extracted["hsa"] = parse_amount(hsa_match.group(1))
            print(f"   ✅ hsa: ${self.extracted['hsa']:,}")
        
        # Student Loan
        sli_match = re.search(r"Student Loan Interest[:\s]+\$?([\d,]+)", text, re.IGNORECASE)
        if sli_match:
            self.extracted["student_loan_interest"] = parse_amount(sli_match.group(1))
            print(f"   ✅ student_loan_interest: ${self.extracted['student_loan_interest']:,}")
    
    def _extract_deduction_type(self, text: str):
        if re.search(r"Deduction[:\s]+\*?\*?Standard", text, re.IGNORECASE):
            self.extracted["deduction_type"] = "standard"
        elif re.search(r"Deduction[:\s]+\*?\*?Itemized", text, re.IGNORECASE):
            self.extracted["deduction_type"] = "itemized"
        else:
            self.extracted["deduction_type"] = "standard"
        print(f"   ✅ deduction_type: {self.extracted['deduction_type']}")
    
    def _fill_from_answers(self):
        fallback_fields = [
            "filing_status", "state", "taxpayer_wages", "spouse_wages",
            "taxpayer_federal_withheld", "spouse_federal_withheld",
            "taxpayer_ira", "spouse_ira", "hsa", "student_loan_interest",
            "qualifying_children_under_17", "other_dependents",
        ]
        for field in fallback_fields:
            if field not in self.extracted or self.extracted[field] is None:
                if field in self.answers and self.answers[field] is not None:
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
# PROCESS SESSION
# ============================================================

def process_session(user_id: str, tax_year: int = 2025, messages: List = None, answers: Dict = None) -> Dict:
    """Process a user's tax session."""
    print(f"\n{'='*60}")
    print(f"🚀 TAXSKY PYTHON EXTRACTOR {EXTRACTOR_VERSION}")
    print(f"{'='*60}")
    print(f"👤 User: {user_id}")
    
    if not messages:
        return {"success": False, "error": "No messages provided"}
    
    extractor = TaxTextExtractor(messages, answers or {})
    extracted = extractor.extract_all()
    
    calc_input = map_extracted_to_calculator(extracted)
    
    tax_result = {}
    if CALCULATOR_AVAILABLE and calculate_tax:
        tax_result = calculate_tax(calc_input)
        print(f"\n📊 Tax Calculation:")
        print(f"   Total Wages: ${tax_result.get('wages', 0):,.0f}")
        print(f"   AGI: ${tax_result.get('agi', 0):,.0f}")
        print(f"   Refund: ${tax_result.get('refund', 0):,.0f}")
        print(f"   Owed: ${tax_result.get('amount_owed', 0):,.0f}")
    
    return {
        "success": True,
        "user_id": user_id,
        "extracted": extracted,
        "calculator_input": calc_input,
        "tax_result": tax_result,
    }


def handle_extract_request(user_id: str, tax_year: int, messages: List, answers: Dict = None) -> Dict:
    return process_session(user_id, tax_year, messages, answers)


if __name__ == "__main__":
    print("Text Extractor v18.2-FIXED loaded")
    print("Usage: from text_extractor import process_session")
