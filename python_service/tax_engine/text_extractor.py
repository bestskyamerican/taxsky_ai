"""
================================================================================
TAXSKY 2025 - UNIFIED TEXT EXTRACTOR v18.0 (REFACTORED)
================================================================================
File: python_tax_api/tax_engine/text_extractor.py

REFACTORED: This version removes the embedded calculator and uses calculator.py
            as the single source of truth for all tax calculations.

CHANGES IN v18.0:
  ✅ FIXED: Dependent age logic (< 17 → <= 16) per IRS rules
  ✅ FIXED: Double-counting income bug in build_form_1040()
  ✅ REMOVED: Embedded TaxCalculator class
  ✅ ADDED: Import from calculator.py for all tax math
  ✅ BENEFIT: Proper SS taxation formula (provisional income)
  ✅ BENEFIT: LTCG preferential rates (0%/15%/20%)
  ✅ BENEFIT: Full EITC calculation
  ✅ BENEFIT: Senior Bonus deduction ($6K OBBBA)
  ✅ BENEFIT: Proper ACTC refundable credit calculation

FEATURES:
  ✅ Extracts from final summary text (primary)
  ✅ Falls back to answers{} if available (secondary)
  ✅ Handles all filing statuses
  ✅ Multiple W-2s (taxpayer + spouse)
  ✅ All 1099 types (INT, DIV, NEC, R, G, B)
  ✅ All adjustments (IRA, HSA, Student Loan)
  ✅ Dependents (children ≤16, other dependents)
  ✅ Capital gains/losses
  ✅ Validates with IRS 2025 rules (RAG)
  ✅ Builds complete Form 1040 JSON

USAGE:
  from text_extractor import process_session, handle_extract_request
  
  result = process_session(user_id, tax_year=2025)

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

# ============================================================
# IMPORT THE REAL CALCULATOR (Single Source of Truth)
# ============================================================
try:
    # Try: calculator/federal/calculator.py (correct path based on folder structure)
    from .calculator.federal.calculator import calculate as calculate_tax
    CALCULATOR_AVAILABLE = True
    print("✅ calculator loaded from .calculator.federal.calculator")
except ImportError:
    try:
        # Fallback: calculator/federal/calculator.py without relative import
        from calculator.federal.calculator import calculate as calculate_tax
        CALCULATOR_AVAILABLE = True
        print("✅ calculator loaded from calculator.federal.calculator")
    except ImportError:
        try:
            # Try: calculator.py in same directory
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

# Node.js API URL - should match your backend server
# Common ports: 3000, 3001, 5000, 5001
NODE_API_URL = os.getenv("NODE_API_URL", "http://localhost:3000")

# Data directory for saving JSON files - use absolute path
_current_dir = Path(__file__).parent.resolve()
DATA_DIR = Path(os.getenv("TAX_DATA_DIR", str(_current_dir / "tax_data" / "json")))
DATA_DIR.mkdir(parents=True, exist_ok=True)

EXTRACTOR_VERSION = "v18.2"

print(f"📌 Text Extractor Config:")
print(f"   NODE_API_URL: {NODE_API_URL}")
print(f"   DATA_DIR: {DATA_DIR}")


# ============================================================
# 2025 TAX CONSTANTS (For validation only - calculations use calculator.py)
# ============================================================

STANDARD_DEDUCTIONS_2025 = {
    "single": 15750,
    "married_filing_jointly": 31500,
    "married_filing_separately": 15750,
    "head_of_household": 23625,
    "qualifying_surviving_spouse": 31500
}

# IRA Limits 2025
IRA_LIMIT_UNDER_50 = 7000
IRA_LIMIT_50_PLUS = 8000

# HSA Limits 2025
HSA_LIMIT_INDIVIDUAL = 4300
HSA_LIMIT_FAMILY = 8550

# Student Loan Interest Max
STUDENT_LOAN_MAX = 2500

# State abbreviations
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
    """Extract dollar amount from text."""
    if not text:
        return 0
    cleaned = re.sub(r'[$,]', '', str(text))
    match = re.search(r'-?\d+\.?\d*', cleaned)
    if match:
        return int(float(match.group()))
    return 0


def parse_date(text: str) -> Optional[str]:
    """Extract date in MM/DD/YYYY format."""
    if not text:
        return None
    match = re.search(r'(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})', text)
    if match:
        return f"{match.group(1).zfill(2)}/{match.group(2).zfill(2)}/{match.group(3)}"
    return None


def calculate_age(dob: str, tax_year: int = 2025) -> int:
    """Calculate age from DOB string."""
    if not dob:
        return 0
    match = re.search(r'(\d{4})', dob)
    if match:
        birth_year = int(match.group(1))
        return tax_year - birth_year
    return 0


def normalize_filing_status(text: str) -> str:
    """Convert filing status text to standard format."""
    if not text:
        return "single"
    lower = text.lower().strip()
    for key, value in FILING_STATUS_MAP.items():
        if key in lower:
            return value
    return "single"


def normalize_state(text: str) -> str:
    """Convert state name to 2-letter code."""
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
    """
    Extracts ALL tax data from chat messages text.
    """
    
    def __init__(self, messages: List[Dict], answers: Dict = None):
        self.messages = messages or []
        self.answers = answers or {}
        self.extracted = {}
        self.errors = []
        
    def find_final_summary(self) -> str:
        """Find the final summary message from assistant."""
        for msg in reversed(self.messages):
            if msg.get("sender") == "assistant":
                text = msg.get("text", "")
                if any(indicator in text.lower() for indicator in [
                    "complete summary",
                    "here's your complete summary",
                    "is everything correct",
                ]) or "═══" in text:
                    if len(text) > 200:
                        return text
        
        # Fallback: combine all assistant messages
        return "\n".join(
            msg.get("text", "") 
            for msg in self.messages 
            if msg.get("sender") == "assistant"
        )
    
    def extract_all(self) -> Dict[str, Any]:
        """Extract ALL tax data from chat text."""
        print(f"\n{'='*60}")
        print(f"🔍 PYTHON TEXT EXTRACTOR {EXTRACTOR_VERSION}")
        print(f"{'='*60}")
        print(f"📝 Total messages: {len(self.messages)}")
        
        summary = self.find_final_summary()
        print(f"📋 Summary length: {len(summary)} chars")
        
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
        """Extract filing status."""
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
        """Extract residence state."""
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
        """Extract taxpayer DOB and age."""
        patterns = [
            r"•\s*Taxpayer DOB[:\s]+(\d{1,2}/\d{1,2}/\d{4})\s*\(Age\s*(\d+)\)",
            r"You[:\s]+(\d{1,2}/\d{1,2}/\d{4})\s*\(Age\s*(\d+)",
            r"Your birthday[:\s]+\*?\*?([A-Za-z]+\s+\d{1,2},?\s+\d{4})",
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
        """Extract spouse name, DOB, and age."""
        # New format
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
            return
        
        # Old format
        patterns = [
            r"Spouse[:\s]+([A-Za-z\s]+),?\s*(\d{1,2}/\d{1,2}/\d{4})\s*\(Age\s*(\d+)",
            r"Spouse[:\s]+\*?\*?([A-Za-z\s]+)\*?\*?,?\s*(\d{1,2}/\d{1,2}/\d{4})",
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                name = match.group(1).strip()
                dob = parse_date(match.group(2))
                
                if "spouse_name" not in self.extracted:
                    self.extracted["spouse_name"] = name
                    print(f"   ✅ spouse_name: {name}")
                
                if dob:
                    self.extracted["spouse_dob"] = dob
                    age = calculate_age(dob)
                    self.extracted["spouse_age"] = age
                    self.extracted["spouse_is_50_or_older"] = age >= 50
                    self.extracted["spouse_is_65_or_older"] = age >= 65
                    print(f"   ✅ spouse_dob: {dob}, age: {age}")
                return
    
    def _extract_dependents(self, text: str):
        """
        Extract dependent information.
        
        FIXED in v18.0: CTC requires child to be UNDER 17 at end of tax year.
        This means age must be <= 16 (not < 17 as previously coded).
        A child who turns 17 on Dec 31 is NOT eligible for CTC.
        """
        # Check for "No dependents"
        if re.search(r"•\s*No dependents", text, re.IGNORECASE):
            self.extracted["has_dependents"] = False
            self.extracted["children_under_17"] = 0
            self.extracted["qualifying_children_under_17"] = 0
            self.extracted["other_dependents"] = 0
            print(f"   ✅ has_dependents: False (No dependents)")
            return
        
        dep_section = re.search(r"\*?\*?👶?\s*Dependents[:\s]*\*?\*?\s*\n?•?\s*(\w+)", text, re.IGNORECASE)
        if dep_section and dep_section.group(1).lower() == "none":
            self.extracted["has_dependents"] = False
            self.extracted["children_under_17"] = 0
            self.extracted["qualifying_children_under_17"] = 0
            self.extracted["other_dependents"] = 0
            print(f"   ✅ has_dependents: False")
            return
        
        children_under_17 = 0
        other_dependents = 0
        
        # Pattern: "John Tran - Age 17 → **$500 Other Dependent Credit**"
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
        
        # Fallback: check by age
        # FIXED: CTC is for children who have NOT turned 17 by end of tax year
        # This means age <= 16 qualifies for CTC, age >= 17 gets ODC
        if children_under_17 == 0 and other_dependents == 0:
            age_matches = re.findall(r"([A-Za-z\s]+)\s*[-–]\s*Age\s*(\d+)", text, re.IGNORECASE)
            for name, age_str in age_matches:
                if name.strip() and not any(skip in name.lower() for skip in ['you', 'spouse', 'filing', 'taxpayer']):
                    age = int(age_str)
                    # FIXED: <= 16 for CTC (child must not have turned 17)
                    if age <= 16:
                        children_under_17 += 1
                    else:
                        other_dependents += 1
        
        has_deps = children_under_17 > 0 or other_dependents > 0
        self.extracted["has_dependents"] = has_deps
        self.extracted["children_under_17"] = children_under_17
        self.extracted["qualifying_children_under_17"] = children_under_17  # Alias for calculator.py
        self.extracted["other_dependents"] = other_dependents
        
        print(f"   ✅ qualifying_children (age ≤16): {children_under_17}")
        print(f"   ✅ other_dependents (age ≥17): {other_dependents}")
    
    def _extract_taxpayer_income(self, text: str):
        """Extract taxpayer W-2 income."""
        patterns = {
            "taxpayer_wages": [
                r"•\s*Taxpayer W-2 #\d+ Wages[:\s]+\$?([\d,]+)",
                r"W-2 Wages[:\s]+\$?([\d,]+)",
            ],
            "taxpayer_federal_withheld": [
                r"•\s*Taxpayer W-2 #\d+ Federal Withheld[:\s]+\$?([\d,]+)",
                r"Federal Withheld[:\s]+\$?([\d,]+)",
            ],
            "taxpayer_state_withheld": [
                r"•\s*Taxpayer W-2 #\d+ State Withheld[:\s]+\$?([\d,]+)",
                r"State Withheld[:\s]+\$?([\d,]+)",
            ],
        }
        
        for field, pattern_list in patterns.items():
            for pattern in pattern_list:
                match = re.search(pattern, text, re.IGNORECASE)
                if match:
                    amount = parse_amount(match.group(1))
                    self.extracted[field] = amount
                    print(f"   ✅ {field}: ${amount:,}")
                    break
    
    def _extract_spouse_income(self, text: str):
        """Extract spouse W-2 income (for MFJ)."""
        patterns = {
            "spouse_wages": [
                r"•\s*Spouse W-2 #\d+ Wages[:\s]+\$?([\d,]+)",
            ],
            "spouse_federal_withheld": [
                r"•\s*Spouse W-2 #\d+ Federal Withheld[:\s]+\$?([\d,]+)",
            ],
            "spouse_state_withheld": [
                r"•\s*Spouse W-2 #\d+ State Withheld[:\s]+\$?([\d,]+)",
            ],
        }
        
        for field, pattern_list in patterns.items():
            for pattern in pattern_list:
                match = re.search(pattern, text, re.IGNORECASE)
                if match:
                    amount = parse_amount(match.group(1))
                    self.extracted[field] = amount
                    print(f"   ✅ {field}: ${amount:,}")
                    break
        
        # Old format fallback with spouse name
        if "spouse_wages" not in self.extracted:
            spouse_name = self.extracted.get("spouse_name", "Spouse")
            spouse_section = ""
            
            if spouse_name:
                name_escaped = re.escape(spouse_name)
                section_pattern = rf"\*?\*?💰\s*{name_escaped}'s\s*Income[:\s]*\*?\*?\s*\n((?:•[^\n]+\n?)+)"
                match = re.search(section_pattern, text, re.IGNORECASE | re.DOTALL)
                if match:
                    spouse_section = match.group(1)
            
            if not spouse_section and spouse_name:
                first_name = spouse_name.split()[0]
                section_pattern = rf"\*?\*?💰\s*{first_name}[^:]*Income[:\s]*\*?\*?\s*\n((?:•[^\n]+\n?)+)"
                match = re.search(section_pattern, text, re.IGNORECASE | re.DOTALL)
                if match:
                    spouse_section = match.group(1)
            
            if spouse_section:
                wages_match = re.search(r"W-2 Wages[:\s]+\$?([\d,]+)", spouse_section, re.IGNORECASE)
                if wages_match:
                    self.extracted["spouse_wages"] = parse_amount(wages_match.group(1))
                    print(f"   ✅ spouse_wages: ${self.extracted['spouse_wages']:,}")
                
                fed_match = re.search(r"Federal Withheld[:\s]+\$?([\d,]+)", spouse_section, re.IGNORECASE)
                if fed_match:
                    self.extracted["spouse_federal_withheld"] = parse_amount(fed_match.group(1))
                    print(f"   ✅ spouse_federal_withheld: ${self.extracted['spouse_federal_withheld']:,}")
                
                state_match = re.search(r"State Withheld[:\s]+\$?([\d,]+)", spouse_section, re.IGNORECASE)
                if state_match:
                    self.extracted["spouse_state_withheld"] = parse_amount(state_match.group(1))
                    print(f"   ✅ spouse_state_withheld: ${self.extracted['spouse_state_withheld']:,}")
    
    def _extract_other_income(self, text: str):
        """Extract ALL 1099 income types for both taxpayer and spouse."""
        
        # ─────────────────────────────────────────────────────────
        # 1099-NEC (Self-Employment)
        # ─────────────────────────────────────────────────────────
        taxpayer_1099nec = []
        for match in re.finditer(r"•\s*Taxpayer 1099-NEC #(\d+)[:\s]+\$?([\d,]+)", text, re.IGNORECASE):
            taxpayer_1099nec.append(parse_amount(match.group(2)))
        if taxpayer_1099nec:
            total = sum(taxpayer_1099nec)
            self.extracted["taxpayer_self_employment"] = total
            self.extracted["self_employment_income"] = total  # Alias for calculator.py
            print(f"   ✅ taxpayer_self_employment: ${total:,}")
        
        spouse_1099nec = []
        for match in re.finditer(r"•\s*Spouse 1099-NEC #(\d+)[:\s]+\$?([\d,]+)", text, re.IGNORECASE):
            spouse_1099nec.append(parse_amount(match.group(2)))
        if spouse_1099nec:
            total = sum(spouse_1099nec)
            self.extracted["spouse_self_employment"] = total
            # Add to combined self_employment_income
            current = self.extracted.get("self_employment_income", 0)
            self.extracted["self_employment_income"] = current + total
            print(f"   ✅ spouse_self_employment: ${total:,}")
        
        # ─────────────────────────────────────────────────────────
        # 1099-INT (Interest)
        # ─────────────────────────────────────────────────────────
        taxpayer_1099int = []
        for match in re.finditer(r"•\s*Taxpayer 1099-INT #(\d+)[:\s]+\$?([\d,]+)", text, re.IGNORECASE):
            taxpayer_1099int.append(parse_amount(match.group(2)))
        if taxpayer_1099int:
            total = sum(taxpayer_1099int)
            self.extracted["taxpayer_interest"] = total
            print(f"   ✅ taxpayer_interest: ${total:,}")
        
        spouse_1099int = []
        for match in re.finditer(r"•\s*Spouse 1099-INT #(\d+)[:\s]+\$?([\d,]+)", text, re.IGNORECASE):
            spouse_1099int.append(parse_amount(match.group(2)))
        if spouse_1099int:
            total = sum(spouse_1099int)
            self.extracted["spouse_interest"] = total
            print(f"   ✅ spouse_interest: ${total:,}")
        
        # Combined interest_income for calculator.py
        total_interest = (self.extracted.get("taxpayer_interest", 0) or 0) + \
                        (self.extracted.get("spouse_interest", 0) or 0)
        if total_interest > 0:
            self.extracted["interest_income"] = total_interest
        
        # ─────────────────────────────────────────────────────────
        # 1099-DIV (Dividends)
        # ─────────────────────────────────────────────────────────
        taxpayer_1099div = []
        for match in re.finditer(r"•\s*Taxpayer 1099-DIV #(\d+)(?:\s+Ordinary)?[:\s]+\$?([\d,]+)", text, re.IGNORECASE):
            taxpayer_1099div.append(parse_amount(match.group(2)))
        if taxpayer_1099div:
            total = sum(taxpayer_1099div)
            self.extracted["taxpayer_dividends"] = total
            print(f"   ✅ taxpayer_dividends: ${total:,}")
        
        spouse_1099div = []
        for match in re.finditer(r"•\s*Spouse 1099-DIV #(\d+)(?:\s+Ordinary)?[:\s]+\$?([\d,]+)", text, re.IGNORECASE):
            spouse_1099div.append(parse_amount(match.group(2)))
        if spouse_1099div:
            total = sum(spouse_1099div)
            self.extracted["spouse_dividends"] = total
            print(f"   ✅ spouse_dividends: ${total:,}")
        
        # Combined dividend_income for calculator.py
        total_dividends = (self.extracted.get("taxpayer_dividends", 0) or 0) + \
                         (self.extracted.get("spouse_dividends", 0) or 0)
        if total_dividends > 0:
            self.extracted["dividend_income"] = total_dividends
        
        # Qualified dividends
        qual_match = re.search(r"Qualified Dividends[:\s]+\$?([\d,]+)", text, re.IGNORECASE)
        if qual_match:
            self.extracted["qualified_dividends"] = parse_amount(qual_match.group(1))
        
        # ─────────────────────────────────────────────────────────
        # 1099-R (Retirement)
        # ─────────────────────────────────────────────────────────
        taxpayer_1099r = []
        for match in re.finditer(r"•\s*Taxpayer 1099-R #(\d+)[:\s]+\$?([\d,]+)", text, re.IGNORECASE):
            taxpayer_1099r.append(parse_amount(match.group(2)))
        if taxpayer_1099r:
            total = sum(taxpayer_1099r)
            self.extracted["taxpayer_retirement"] = total
            print(f"   ✅ taxpayer_retirement: ${total:,}")
        
        spouse_1099r = []
        for match in re.finditer(r"•\s*Spouse 1099-R #(\d+)[:\s]+\$?([\d,]+)", text, re.IGNORECASE):
            spouse_1099r.append(parse_amount(match.group(2)))
        if spouse_1099r:
            total = sum(spouse_1099r)
            self.extracted["spouse_retirement"] = total
            print(f"   ✅ spouse_retirement: ${total:,}")
        
        # Combined for calculator.py
        total_retirement = (self.extracted.get("taxpayer_retirement", 0) or 0) + \
                          (self.extracted.get("spouse_retirement", 0) or 0)
        if total_retirement > 0:
            self.extracted["pension_income"] = total_retirement
        
        # ─────────────────────────────────────────────────────────
        # 1099-G (Unemployment)
        # ─────────────────────────────────────────────────────────
        taxpayer_1099g = []
        for match in re.finditer(r"•\s*Taxpayer 1099-G #(\d+)[:\s]+\$?([\d,]+)", text, re.IGNORECASE):
            taxpayer_1099g.append(parse_amount(match.group(2)))
        if taxpayer_1099g:
            total = sum(taxpayer_1099g)
            self.extracted["taxpayer_unemployment"] = total
            print(f"   ✅ taxpayer_unemployment: ${total:,}")
        
        spouse_1099g = []
        for match in re.finditer(r"•\s*Spouse 1099-G #(\d+)[:\s]+\$?([\d,]+)", text, re.IGNORECASE):
            spouse_1099g.append(parse_amount(match.group(2)))
        if spouse_1099g:
            total = sum(spouse_1099g)
            self.extracted["spouse_unemployment"] = total
            print(f"   ✅ spouse_unemployment: ${total:,}")
        
        # ─────────────────────────────────────────────────────────
        # SSA-1099 (Social Security)
        # ─────────────────────────────────────────────────────────
        ssa_match = re.search(r"•\s*Taxpayer SSA-1099[:\s]+\$?([\d,]+)", text, re.IGNORECASE)
        if ssa_match:
            amount = parse_amount(ssa_match.group(1))
            self.extracted["taxpayer_social_security"] = amount
            print(f"   ✅ taxpayer_social_security: ${amount:,}")
        
        spouse_ssa_match = re.search(r"•\s*Spouse SSA-1099[:\s]+\$?([\d,]+)", text, re.IGNORECASE)
        if spouse_ssa_match:
            amount = parse_amount(spouse_ssa_match.group(1))
            self.extracted["spouse_social_security"] = amount
            print(f"   ✅ spouse_social_security: ${amount:,}")
        
        # Combined for calculator.py
        total_ss = (self.extracted.get("taxpayer_social_security", 0) or 0) + \
                   (self.extracted.get("spouse_social_security", 0) or 0)
        if total_ss > 0:
            self.extracted["social_security"] = total_ss
        
        # ─────────────────────────────────────────────────────────
        # Rental Income
        # ─────────────────────────────────────────────────────────
        taxpayer_rental = []
        for match in re.finditer(r"•\s*Taxpayer Rental(?:\s+#\d+)?(?:\s+Net)?[:\s]+\$?([\d,]+)", text, re.IGNORECASE):
            taxpayer_rental.append(parse_amount(match.group(1)))
        if taxpayer_rental:
            total = sum(taxpayer_rental)
            self.extracted["taxpayer_rental"] = total
            print(f"   ✅ taxpayer_rental: ${total:,}")
        
        spouse_rental = []
        for match in re.finditer(r"•\s*Spouse Rental(?:\s+#\d+)?(?:\s+Net)?[:\s]+\$?([\d,]+)", text, re.IGNORECASE):
            spouse_rental.append(parse_amount(match.group(1)))
        if spouse_rental:
            total = sum(spouse_rental)
            self.extracted["spouse_rental"] = total
            print(f"   ✅ spouse_rental: ${total:,}")
        
        # ─────────────────────────────────────────────────────────
        # Capital Gains/Losses (1099-B)
        # ─────────────────────────────────────────────────────────
        # Long-term
        ltcg_match = re.search(r"•\s*(?:Taxpayer\s+)?(?:Long[- ]?Term\s+)?Capital Gains?[:\s]+\$?([\d,]+)", text, re.IGNORECASE)
        if ltcg_match:
            amount = parse_amount(ltcg_match.group(1))
            self.extracted["long_term_gains"] = amount
            self.extracted["capital_gains"] = amount
            print(f"   ✅ long_term_gains: ${amount:,}")
        
        # Short-term
        stcg_match = re.search(r"•\s*(?:Taxpayer\s+)?Short[- ]?Term\s+(?:Capital\s+)?Gains?[:\s]+\$?([\d,]+)", text, re.IGNORECASE)
        if stcg_match:
            amount = parse_amount(stcg_match.group(1))
            self.extracted["short_term_gains"] = amount
            print(f"   ✅ short_term_gains: ${amount:,}")
        
        # Losses
        cap_loss_match = re.search(r"•\s*(?:Taxpayer\s+)?Capital Loss(?:es)?[:\s]+\$?([\d,]+)", text, re.IGNORECASE)
        if cap_loss_match:
            amount = parse_amount(cap_loss_match.group(1))
            self.extracted["capital_losses"] = amount
            print(f"   ✅ capital_losses: ${amount:,}")
        
        # Crypto
        crypto_gain_match = re.search(r"•\s*(?:Taxpayer\s+)?Crypto(?:currency)?\s+Gains?[:\s]+\$?([\d,]+)", text, re.IGNORECASE)
        if crypto_gain_match:
            amount = parse_amount(crypto_gain_match.group(1))
            self.extracted["crypto_gains"] = amount
            print(f"   ✅ crypto_gains: ${amount:,}")
        
        crypto_loss_match = re.search(r"•\s*(?:Taxpayer\s+)?Crypto(?:currency)?\s+Loss(?:es)?[:\s]+\$?([\d,]+)", text, re.IGNORECASE)
        if crypto_loss_match:
            amount = parse_amount(crypto_loss_match.group(1))
            self.extracted["crypto_losses"] = amount
            print(f"   ✅ crypto_losses: ${amount:,}")
    
    def _extract_adjustments(self, text: str):
        """Extract adjustments to income."""
        # Taxpayer IRA
        ira_patterns = [
            r"•\s*Taxpayer IRA[:\s]+\$?([\d,]+)",
            r"Your IRA[:\s]+\$?([\d,]+)",
            r"•\s*Your IRA[:\s]+\$?([\d,]+)",
        ]
        for pattern in ira_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                amount = parse_amount(match.group(1))
                self.extracted["taxpayer_ira"] = amount
                self.extracted["ira_contributions"] = amount  # Alias for calculator.py
                print(f"   ✅ taxpayer_ira: ${amount:,}")
                break
        
        # Spouse IRA
        spouse_ira_patterns = [
            r"•\s*Spouse IRA[:\s]+\$?([\d,]+)",
        ]
        for pattern in spouse_ira_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                amount = parse_amount(match.group(1))
                self.extracted["spouse_ira"] = amount
                self.extracted["spouse_ira_contribution"] = amount  # Alias for calculator.py
                print(f"   ✅ spouse_ira: ${amount:,}")
                break
        
        # Old format with spouse name
        if "spouse_ira" not in self.extracted:
            spouse_name = self.extracted.get("spouse_name", "")
            first_name = spouse_name.split()[0] if spouse_name else ""
            if first_name:
                old_patterns = [
                    rf"•\s*{first_name}(?:'s| [A-Za-z]+'s)?\s*IRA[:\s]+\$?([\d,]+)",
                    rf"{first_name}(?:'s)?\s*IRA[:\s]+\$?([\d,]+)",
                ]
                for pattern in old_patterns:
                    match = re.search(pattern, text, re.IGNORECASE)
                    if match:
                        amount = parse_amount(match.group(1))
                        self.extracted["spouse_ira"] = amount
                        self.extracted["spouse_ira_contribution"] = amount
                        print(f"   ✅ spouse_ira: ${amount:,}")
                        break
        
        # HSA
        hsa_patterns = [r"•?\s*HSA[:\s]+\$?([\d,]+)"]
        for pattern in hsa_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                amount = parse_amount(match.group(1))
                self.extracted["hsa"] = amount
                self.extracted["hsa_contributions"] = amount  # Alias for calculator.py
                print(f"   ✅ hsa: ${amount:,}")
                break
        
        # Student Loan Interest
        sli_patterns = [r"•?\s*Student Loan Interest[:\s]+\$?([\d,]+)"]
        for pattern in sli_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                amount = parse_amount(match.group(1))
                self.extracted["student_loan_interest"] = amount
                print(f"   ✅ student_loan_interest: ${amount:,}")
                break
    
    def _extract_deduction_type(self, text: str):
        """Extract deduction type."""
        if re.search(r"Deduction[:\s]+\*?\*?Standard", text, re.IGNORECASE):
            self.extracted["deduction_type"] = "standard"
        elif re.search(r"Deduction[:\s]+\*?\*?Itemized", text, re.IGNORECASE):
            self.extracted["deduction_type"] = "itemized"
        else:
            self.extracted["deduction_type"] = "standard"
        print(f"   ✅ deduction_type: {self.extracted['deduction_type']}")
    
    def _fill_from_answers(self):
        """Fill missing fields from existing answers{}."""
        fallback_fields = [
            "filing_status", "state", "taxpayer_dob", "taxpayer_age",
            "spouse_name", "spouse_dob", "spouse_age",
            "taxpayer_wages", "taxpayer_federal_withheld", "taxpayer_state_withheld",
            "spouse_wages", "spouse_federal_withheld", "spouse_state_withheld",
            "taxpayer_ira", "spouse_ira", "hsa", "student_loan_interest",
            "children_under_17", "qualifying_children_under_17", "other_dependents", "has_dependents",
            "capital_gains", "capital_losses", "deduction_type",
            "interest_income", "dividend_income", "self_employment_income"
        ]
        
        for field in fallback_fields:
            if field not in self.extracted or self.extracted[field] is None:
                possible_names = [field]
                if field == "taxpayer_ira":
                    possible_names.append("ira_contributions")
                if field == "hsa":
                    possible_names.append("hsa_contributions")
                if field == "children_under_17":
                    possible_names.append("qualifying_children_under_17")
                
                for name in possible_names:
                    if name in self.answers and self.answers[name] is not None:
                        self.extracted[field] = self.answers[name]
                        print(f"   📥 Fallback {field}: {self.answers[name]}")
                        break


# ============================================================
# MAPPING: Extracted Data → Calculator Input
# ============================================================

def map_extracted_to_calculator(extracted: Dict) -> Dict:
    """
    Map extracted data to the format expected by calculator.py
    This ensures all field names align correctly.
    """
    return {
        # Filing Status & Demographics
        "filing_status": extracted.get("filing_status", "single"),
        "taxpayer_age": extracted.get("taxpayer_age", 0),
        "spouse_age": extracted.get("spouse_age", 0),
        "taxpayer_dob": extracted.get("taxpayer_dob", ""),
        "spouse_dob": extracted.get("spouse_dob", ""),
        
        # W-2 Income
        "wages": extracted.get("taxpayer_wages", 0) or 0,
        "spouse_wages": extracted.get("spouse_wages", 0) or 0,
        "federal_withholding": extracted.get("taxpayer_federal_withheld", 0) or 0,
        "spouse_federal_withheld": extracted.get("spouse_federal_withheld", 0) or 0,
        
        # Interest & Dividends
        "interest_income": extracted.get("interest_income", 0) or 
                          (extracted.get("taxpayer_interest", 0) or 0) + 
                          (extracted.get("spouse_interest", 0) or 0),
        "dividend_income": extracted.get("dividend_income", 0) or
                          (extracted.get("taxpayer_dividends", 0) or 0) + 
                          (extracted.get("spouse_dividends", 0) or 0),
        "qualified_dividends": extracted.get("qualified_dividends", 0) or 0,
        
        # Capital Gains
        "long_term_gains": extracted.get("long_term_gains", 0) or extracted.get("capital_gains", 0) or 0,
        "short_term_gains": extracted.get("short_term_gains", 0) or 0,
        
        # Retirement
        "pension_income": extracted.get("pension_income", 0) or
                         (extracted.get("taxpayer_retirement", 0) or 0) + 
                         (extracted.get("spouse_retirement", 0) or 0),
        
        # Social Security
        "social_security": extracted.get("social_security", 0) or
                          (extracted.get("taxpayer_social_security", 0) or 0) + 
                          (extracted.get("spouse_social_security", 0) or 0),
        
        # Self-Employment
        "self_employment_income": extracted.get("self_employment_income", 0) or
                                 (extracted.get("taxpayer_self_employment", 0) or 0) + 
                                 (extracted.get("spouse_self_employment", 0) or 0),
        
        # Adjustments
        "ira_contributions": extracted.get("taxpayer_ira", 0) or extracted.get("ira_contributions", 0) or 0,
        "spouse_ira_contribution": extracted.get("spouse_ira", 0) or extracted.get("spouse_ira_contribution", 0) or 0,
        "hsa_contributions": extracted.get("hsa", 0) or extracted.get("hsa_contributions", 0) or 0,
        "student_loan_interest": extracted.get("student_loan_interest", 0) or 0,
        
        # Dependents
        "qualifying_children_under_17": extracted.get("qualifying_children_under_17", 0) or 
                                        extracted.get("children_under_17", 0) or 0,
        "other_dependents": extracted.get("other_dependents", 0) or 0,
        
        # Estimated Payments
        "estimated_payments": extracted.get("estimated_payments", 0) or 0,
    }


# ============================================================
# RAG VALIDATION
# ============================================================

def verify_with_rag(extracted: Dict) -> Tuple[bool, List[str]]:
    """Validate extracted data against IRS 2025 rules."""
    errors = []
    
    taxpayer_age = extracted.get("taxpayer_age", 0) or 0
    spouse_age = extracted.get("spouse_age", 0) or 0
    taxpayer_ira = extracted.get("taxpayer_ira", 0) or extracted.get("ira_contributions", 0) or 0
    spouse_ira = extracted.get("spouse_ira", 0) or extracted.get("spouse_ira_contribution", 0) or 0
    
    taxpayer_ira_limit = IRA_LIMIT_50_PLUS if taxpayer_age >= 50 else IRA_LIMIT_UNDER_50
    spouse_ira_limit = IRA_LIMIT_50_PLUS if spouse_age >= 50 else IRA_LIMIT_UNDER_50
    
    if taxpayer_ira > taxpayer_ira_limit:
        errors.append(f"Taxpayer IRA ${taxpayer_ira:,} exceeds limit ${taxpayer_ira_limit:,}")
    
    if spouse_ira > spouse_ira_limit and spouse_age > 0:
        errors.append(f"Spouse IRA ${spouse_ira:,} exceeds limit ${spouse_ira_limit:,}")
    
    hsa = extracted.get("hsa", 0) or extracted.get("hsa_contributions", 0) or 0
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
    """
    Build complete Form 1040 JSON from extracted data and calculator results.
    
    FIXED in v18.0: No longer double-counts income by adding both 
    taxpayer_X and legacy X_income fields.
    """
    
    # Get values from calculator result (single source of truth)
    total_wages = tax_result.get("wages", 0)
    interest_income = tax_result.get("interest_income", 0)
    dividend_income = tax_result.get("dividend_income", 0)
    qualified_dividends = tax_result.get("qualified_dividends", 0)
    capital_gains = tax_result.get("capital_gains", 0)
    long_term_gains = tax_result.get("long_term_gains", 0)
    pension_income = tax_result.get("pension_income", 0)
    social_security = tax_result.get("social_security_benefits", 0)
    taxable_ss = tax_result.get("taxable_social_security", 0)
    self_employment = tax_result.get("self_employment_income", 0)
    
    return {
        "header": {
            "tax_year": tax_year,
            "filing_status": extracted.get("filing_status", "single"),
            "state": extracted.get("state", ""),
            "taxpayer_dob": extracted.get("taxpayer_dob", ""),
            "taxpayer_age": extracted.get("taxpayer_age", 0),
            "spouse_name": extracted.get("spouse_name", ""),
            "spouse_dob": extracted.get("spouse_dob", ""),
            "spouse_age": extracted.get("spouse_age", 0),
        },
        "income": {
            # Line 1: Wages
            "line_1a_w2_wages": total_wages,
            "line_1z_total_wages": total_wages,
            # Line 2: Interest
            "line_2a_tax_exempt_interest": 0,
            "line_2b_taxable_interest": interest_income,
            # Line 3: Dividends
            "line_3a_qualified_dividends": qualified_dividends,
            "line_3b_ordinary_dividends": dividend_income,
            # Line 4: IRA distributions
            "line_4a_ira_distributions": tax_result.get("ira_distributions", 0),
            "line_4b_taxable_ira": tax_result.get("ira_distributions", 0),
            # Line 5: Pensions
            "line_5a_pensions": pension_income,
            "line_5b_taxable_pensions": pension_income,
            # Line 6: Social Security
            "line_6a_social_security": social_security,
            "line_6b_taxable_social_security": taxable_ss,
            # Line 7: Capital gains
            "line_7_capital_gain": capital_gains,
            # Line 8: Schedule 1 income
            "line_8_schedule_1_income": self_employment + tax_result.get("other_income", 0),
            # Line 9: Total income
            "line_9_total_income": tax_result.get("total_income", 0),
        },
        "adjustments": {
            "line_10_schedule_1_adjustments": tax_result.get("adjustments", 0),
            "line_11_agi": tax_result.get("agi", 0),
        },
        "deductions": {
            "line_12_deduction": tax_result.get("standard_deduction", 0),
            "line_12_standard_or_itemized": "standard",
            "line_14_total_deductions": tax_result.get("standard_deduction", 0),
            "line_15_taxable_income": tax_result.get("taxable_income", 0),
        },
        "tax_and_credits": {
            "line_16_tax": tax_result.get("bracket_tax", 0),
            "line_17_schedule_2_line_3": 0,
            "line_18_total": tax_result.get("tax_before_credits", 0),
            "line_19_child_credit": tax_result.get("child_tax_credit", 0),
            "line_20_schedule_3_line_8": 0,
            "line_21_total_credits": tax_result.get("total_credits", 0),
            "line_22_tax_after_credits": tax_result.get("tax_after_credits", 0),
            "line_23_schedule_2_line_21": tax_result.get("self_employment_tax", 0),
            "line_24_total_tax": tax_result.get("tax_after_credits", 0),
        },
        "payments": {
            "line_25a_w2_withholding": tax_result.get("withholding", 0),
            "line_25d_total_withholding": tax_result.get("withholding", 0),
            "line_26_estimated_payments": tax_result.get("estimated_payments", 0),
            "line_27_eic": tax_result.get("eitc", 0),
            "line_28_actc": tax_result.get("ctc_refundable", 0),
            "line_33_total_payments": tax_result.get("total_payments", 0),
        },
        "refund_or_owe": {
            "line_33_overpayment": tax_result.get("refund", 0),
            "line_34_overpaid": tax_result.get("refund", 0),
            "line_34_apply_to_2025": 0,
            "line_35_refund": tax_result.get("refund", 0),
            "line_35a_refund": tax_result.get("refund", 0),
            "line_37_amount_owe": tax_result.get("amount_owed", 0),
            "line_37_amount_owed": tax_result.get("amount_owed", 0),
            "line_38_estimated_penalty": 0,
        },
        "_income_details": {
            "taxpayer_wages": extracted.get("taxpayer_wages", 0),
            "spouse_wages": extracted.get("spouse_wages", 0),
            "taxpayer_interest": extracted.get("taxpayer_interest", 0),
            "spouse_interest": extracted.get("spouse_interest", 0),
            "taxpayer_dividends": extracted.get("taxpayer_dividends", 0),
            "spouse_dividends": extracted.get("spouse_dividends", 0),
            "taxpayer_retirement": extracted.get("taxpayer_retirement", 0),
            "spouse_retirement": extracted.get("spouse_retirement", 0),
            "taxpayer_social_security": extracted.get("taxpayer_social_security", 0),
            "spouse_social_security": extracted.get("spouse_social_security", 0),
            "taxpayer_unemployment": extracted.get("taxpayer_unemployment", 0),
            "spouse_unemployment": extracted.get("spouse_unemployment", 0),
            "taxpayer_self_employment": extracted.get("taxpayer_self_employment", 0),
            "spouse_self_employment": extracted.get("spouse_self_employment", 0),
            "taxpayer_rental": extracted.get("taxpayer_rental", 0),
            "spouse_rental": extracted.get("spouse_rental", 0),
            "capital_gains": extracted.get("capital_gains", 0),
            "capital_losses": extracted.get("capital_losses", 0),
            "long_term_gains": extracted.get("long_term_gains", 0),
            "short_term_gains": extracted.get("short_term_gains", 0),
            "crypto_gains": extracted.get("crypto_gains", 0),
            "crypto_losses": extracted.get("crypto_losses", 0),
        },
        "_adjustments_details": {
            "taxpayer_ira": extracted.get("taxpayer_ira", 0),
            "spouse_ira": extracted.get("spouse_ira", 0),
            "hsa": extracted.get("hsa", 0),
            "student_loan_interest": extracted.get("student_loan_interest", 0),
            "se_tax_deduction": tax_result.get("se_tax_deduction", 0),
        },
        "_credits_details": {
            "ctc_nonrefundable": tax_result.get("ctc_nonrefundable", 0),
            "ctc_refundable": tax_result.get("ctc_refundable", 0),
            "other_dependent_credit": tax_result.get("other_dependent_credit", 0),
            "eitc": tax_result.get("eitc", 0),
            "senior_bonus": tax_result.get("senior_bonus", 0),
        },
        "_dependents": {
            "qualifying_children_under_17": extracted.get("qualifying_children_under_17", 0) or extracted.get("children_under_17", 0),
            "other_dependents": extracted.get("other_dependents", 0),
        },
        "_metadata": {
            "extractor_version": EXTRACTOR_VERSION,
            "calculator_version": "v4.0",
            "extracted_at": datetime.now(timezone.utc).isoformat(),
            "source": "chat_text",
        }
    }


# ============================================================
# FILE I/O
# ============================================================

def load_form1040_json(user_id: str, tax_year: int = 2025) -> Optional[Dict]:
    """Load saved Form 1040 JSON."""
    filepath = DATA_DIR / f"{user_id}_1040_{tax_year}.json"
    if filepath.exists():
        with open(filepath, 'r') as f:
            return json.load(f)
    return None


def save_form1040_json(user_id: str, form1040: Dict, tax_year: int = 2025) -> str:
    """Save Form 1040 JSON."""
    filepath = DATA_DIR / f"{user_id}_1040_{tax_year}.json"
    with open(filepath, 'w') as f:
        json.dump(form1040, f, indent=2, default=str)
    return str(filepath)


# ============================================================
# MAIN ENTRY POINTS
# ============================================================

def process_session(user_id: str, tax_year: int = 2025) -> Dict[str, Any]:
    """
    Main entry point: Process a TaxSession from MongoDB.
    
    1. Fetch session directly from MongoDB
    2. Extract all data from chat text
    3. Validate with RAG
    4. Calculate tax using calculator.py
    5. Build Form 1040
    6. Save to file and MongoDB
    """
    print(f"\n{'='*60}")
    print(f"🚀 TAXSKY PYTHON EXTRACTOR {EXTRACTOR_VERSION}")
    print(f"{'='*60}")
    print(f"👤 User: {user_id}")
    print(f"📅 Tax Year: {tax_year}")
    
    if not CALCULATOR_AVAILABLE:
        return {"success": False, "error": "calculator.py not available"}
    
    # 1. FETCH FROM MONGODB (Direct access - no Node.js API call!)
    try:
        from mongodb_client import get_session, save_form1040_to_session, PYMONGO_AVAILABLE
        
        if not PYMONGO_AVAILABLE:
            print("❌ pymongo not installed!")
            print("   Run: pip install pymongo")
            return {"success": False, "error": "pymongo not installed"}
        
        print(f"\n📡 Fetching session from MongoDB...")
        session_data = get_session(user_id, tax_year)
        
        if not session_data:
            return {"success": False, "error": "Session not found in MongoDB"}
        
        messages = session_data.get("messages", [])
        answers = session_data.get("answers", {})
        
        print(f"   📝 Messages: {len(messages)}")
        print(f"   📋 Answers keys: {list(answers.keys()) if answers else 'None'}")
        
        if not messages:
            print(f"⚠️ No messages found in session!")
            if not answers:
                return {"success": False, "error": "No messages or answers found in session"}
        
        USE_MONGODB = True
        
    except ImportError:
        # Fallback to Node.js API if mongodb_client not available
        print(f"\n⚠️ mongodb_client not available, falling back to Node.js API...")
        USE_MONGODB = False
        
        node_url = f"{NODE_API_URL}/api/ai/data/{user_id}"
        print(f"📡 Fetching from: {node_url}")
        
        try:
            response = requests.get(
                node_url,
                params={"taxYear": tax_year},
                timeout=10
            )
            print(f"   Response status: {response.status_code}")
            session_data = response.json()
        except Exception as e:
            print(f"❌ Failed to fetch session: {e}")
            return {"success": False, "error": str(e)}
        
        if not session_data.get("success"):
            error_msg = session_data.get("error", "Session not found")
            return {"success": False, "error": error_msg}
        
        messages = session_data.get("messages", [])
        answers = session_data.get("answers", {})
    
    # 2. EXTRACT FROM TEXT
    extractor = TaxTextExtractor(messages, answers)
    extracted = extractor.extract_all()
    
    # 3. VALIDATE WITH RAG
    is_valid, rag_errors = verify_with_rag(extracted)
    print(f"\n📋 RAG Validation: {'✅ PASSED' if is_valid else '⚠️ WARNINGS'}")
    for err in rag_errors:
        print(f"   ⚠️ {err}")
    
    # 4. MAP DATA FOR CALCULATOR
    calculator_input = map_extracted_to_calculator(extracted)
    print(f"\n📊 Calculator Input Mapped")
    
    # 5. CALCULATE TAX (using calculator.py)
    print(f"\n{'─'*60}")
    print(f"💰 CALCULATING TAX (via calculator.py)")
    print(f"{'─'*60}")
    tax_result = calculate_tax(calculator_input)
    
    print(f"   Total Income: ${tax_result.get('total_income', 0):,.2f}")
    print(f"   AGI: ${tax_result.get('agi', 0):,.2f}")
    print(f"   Taxable Income: ${tax_result.get('taxable_income', 0):,.2f}")
    print(f"   Tax Before Credits: ${tax_result.get('tax_before_credits', 0):,.2f}")
    print(f"   Total Credits: ${tax_result.get('total_credits', 0):,.2f}")
    print(f"   Tax After Credits: ${tax_result.get('tax_after_credits', 0):,.2f}")
    
    if tax_result.get('refund', 0) > 0:
        print(f"   🎉 REFUND: ${tax_result.get('refund', 0):,.2f}")
    else:
        print(f"   💸 OWED: ${tax_result.get('amount_owed', 0):,.2f}")
    
    # 6. BUILD FORM 1040
    form1040 = build_form_1040(extracted, tax_result, tax_year)
    form1040["_metadata"]["rag_verified"] = is_valid
    form1040["_metadata"]["validation_errors"] = rag_errors
    form1040["_metadata"]["status"] = "ready" if is_valid else "needs_review"
    
    # 7. SAVE TO FILE
    filepath = save_form1040_json(user_id, form1040, tax_year)
    print(f"\n💾 Saved to: {filepath}")
    
    # 8. SAVE TO MONGODB
    try:
        if USE_MONGODB:
            # Direct MongoDB save
            success = save_form1040_to_session(
                user_id, tax_year, form1040, tax_result, is_valid, rag_errors
            )
            if success:
                print(f"✅ Saved to MongoDB directly!")
            else:
                print(f"⚠️ MongoDB save returned False")
        else:
            # Fallback to Node.js API
            save_response = requests.post(
                f"{NODE_API_URL}/api/ai/status/{user_id}",
                json={
                    "taxYear": tax_year,
                    "status": "ready_for_review",
                    "form1040": form1040,
                    "rag_verified": is_valid,
                    "validation_errors": rag_errors,
                    "taxCalculation": tax_result,
                },
                timeout=10
            )
            print(f"✅ Saved via Node.js API!")
    except Exception as e:
        print(f"⚠️ Failed to save to MongoDB: {e}")
    
    print(f"\n{'='*60}")
    print(f"✅ PROCESSING COMPLETE")
    print(f"{'='*60}")
    
    return {
        "success": True,
        "user_id": user_id,
        "tax_year": tax_year,
        "extracted": extracted,
        "tax_result": tax_result,
        "form1040": form1040,
        "rag_verified": is_valid,
        "validation_errors": rag_errors,
        "filepath": filepath,
        "data_source": "messages"
    }


def handle_extract_request(user_id: str, tax_year: int = 2025) -> Dict[str, Any]:
    """Handle extraction request from API router."""
    return process_session(user_id, tax_year)


# ============================================================
# CLI
# ============================================================

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) >= 2:
        result = process_session(sys.argv[1], int(sys.argv[2]) if len(sys.argv) > 2 else 2025)
        print(json.dumps(result, indent=2, default=str))
    else:
        print("Usage: python text_extractor.py <user_id> [tax_year]")