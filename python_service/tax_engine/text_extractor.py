"""
================================================================================
TAXSKY 2025 - UNIFIED TEXT EXTRACTOR v18.4-COMPLETE
================================================================================
File: python_tax_api/tax_engine/text_extractor.py

COMPLETE VERSION - Handles ALL income types:
  ✅ W-2 (multiple, taxpayer + spouse)
  ✅ 1099-NEC (self-employment)
  ✅ 1099-INT (interest income)
  ✅ 1099-DIV (dividends, qualified dividends)
  ✅ 1099-R (retirement/pension)
  ✅ 1099-G (unemployment)
  ✅ 1099-B (capital gains/losses)
  ✅ SSA-1099 (Social Security)
  ✅ Rental income
  ✅ Crypto gains/losses
  ✅ IRA contributions (taxpayer + spouse)
  ✅ HSA contributions
  ✅ Student loan interest
  ✅ Dependents (children under 17, other dependents)

================================================================================
"""

import re
import json
import os
from datetime import datetime, timezone
from typing import Dict, Any, List, Tuple, Optional
from pathlib import Path

# ============================================================
# IMPORT CALCULATOR
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
    except ImportError:
        try:
            from .calculator import calculate as calculate_tax
            CALCULATOR_AVAILABLE = True
        except ImportError:
            try:
                from calculator import calculate as calculate_tax
                CALCULATOR_AVAILABLE = True
            except ImportError as e:
                print(f"⚠️ calculator.py not found: {e}")

# ============================================================
# IMPORT MONGODB CLIENT FOR SAVING
# ============================================================
MONGODB_SAVE_AVAILABLE = False
update_session_in_db = None

try:
    from .mongodb_client import update_session
    update_session_in_db = update_session
    MONGODB_SAVE_AVAILABLE = True
except ImportError:
    try:
        from mongodb_client import update_session
        update_session_in_db = update_session
        MONGODB_SAVE_AVAILABLE = True
    except ImportError:
        print("⚠️ mongodb_client.update_session not available")

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

EXTRACTOR_VERSION = "v18.4-COMPLETE"

print(f"📌 Text Extractor Config:")
print(f"   NODE_API_URL: {NODE_API_URL}")
print(f"   DATA_DIR: {DATA_DIR}")

# ============================================================
# 2025 TAX CONSTANTS
# ============================================================
STANDARD_DEDUCTIONS_2025 = {
    "single": 15000,
    "married_filing_jointly": 30000,
    "married_filing_separately": 15000,
    "head_of_household": 22500,
    "qualifying_surviving_spouse": 30000
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
    """Parse dollar amount from text, returns integer."""
    if not text:
        return 0
    cleaned = re.sub(r'[$,]', '', str(text))
    match = re.search(r'-?\d+\.?\d*', cleaned)
    return int(float(match.group())) if match else 0

def parse_float(text: str) -> float:
    """Parse dollar amount from text, returns float."""
    if not text:
        return 0.0
    cleaned = re.sub(r'[$,]', '', str(text))
    match = re.search(r'-?\d+\.?\d*', cleaned)
    return float(match.group()) if match else 0.0

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
# TEXT EXTRACTOR CLASS - COMPLETE VERSION
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
        Handles both sender/text and role/content field formats.
        """
        for msg in reversed(self.messages):
            sender = msg.get("sender") or msg.get("role")
            if sender == "assistant":
                text = msg.get("text") or msg.get("content", "")
                if any(indicator in text.lower() for indicator in [
                    "complete summary",
                    "here's your complete summary",
                    "is everything correct",
                    "here is your summary",
                ]) or "═══" in text or "════" in text:
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
        
        # Extract all data
        self._extract_filing_status(summary)
        self._extract_state(summary)
        self._extract_taxpayer_info(summary)
        self._extract_spouse_info(summary)
        self._extract_dependents(summary)
        
        # Income
        self._extract_w2_income(summary)
        self._extract_1099_nec(summary)
        self._extract_1099_int(summary)
        self._extract_1099_div(summary)
        self._extract_1099_r(summary)
        self._extract_1099_g(summary)
        self._extract_1099_b(summary)
        self._extract_ssa_1099(summary)
        self._extract_rental_income(summary)
        self._extract_crypto(summary)
        
        # Adjustments
        self._extract_ira(summary)
        self._extract_hsa(summary)
        self._extract_student_loan(summary)
        self._extract_deduction_type(summary)
        
        # Fill from answers if missing
        self._fill_from_answers()
        
        print(f"\n✅ Extracted {len(self.extracted)} fields")
        return self.extracted
    
    # ────────────────────────────────────────────────────────
    # PERSONAL INFO
    # ────────────────────────────────────────────────────────
    
    def _extract_filing_status(self, text: str):
        patterns = [
            r"•\s*Filing Status[:\s]+([A-Za-z\s]+?)(?:\s{2,}|\n|$)",
            r"•\s*Filing[:\s]+([A-Za-z\s]+?)(?:\s{2,}|\n|$)",
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
            r"•\s*(?:Residence\s+)?State[:\s]+([A-Z]{2})",
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
            r"•\s*Taxpayer DOB[:\s]+(\d{1,2}/\d{1,2}/\d{4})\s*\(Age\s*(\d+)",
            r"•\s*You[:\s]+(\d{1,2}/\d{1,2}/\d{4})\s*\(Age\s*(\d+)",
            r"You[:\s]+[A-Za-z]+\s+\d{1,2},?\s+\d{4}\s*\(Age\s*(\d+)",
        ]
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                if len(match.groups()) >= 2:
                    dob = parse_date(match.group(1))
                    if dob:
                        self.extracted["taxpayer_dob"] = dob
                        self.extracted["taxpayer_age"] = int(match.group(2))
                        print(f"   ✅ taxpayer_dob: {dob}, age: {match.group(2)}")
                        return
                else:
                    self.extracted["taxpayer_age"] = int(match.group(1))
                    print(f"   ✅ taxpayer_age: {match.group(1)}")
                    return
    
    def _extract_spouse_info(self, text: str):
        # Spouse name
        name_patterns = [
            r"•\s*Spouse(?:\s+Name)?[:\s]+([A-Za-z\s]+?)(?:,|\s{2,}|\n|$)",
            r"Spouse[:\s]+([A-Za-z\s]+?),\s*\d{1,2}/\d{1,2}/\d{4}",
        ]
        for pattern in name_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                name = match.group(1).strip()
                if name and len(name) > 1 and not name.lower().startswith("dob"):
                    self.extracted["spouse_name"] = name
                    print(f"   ✅ spouse_name: {name}")
                    break
        
        # Spouse DOB/Age
        dob_patterns = [
            r"•\s*Spouse DOB[:\s]+(\d{1,2}/\d{1,2}/\d{4})\s*\(Age\s*(\d+)",
            r"Spouse[:\s]+[A-Za-z\s]+,\s*(\d{1,2}/\d{1,2}/\d{4})\s*\(Age\s*(\d+)",
        ]
        for pattern in dob_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                self.extracted["spouse_dob"] = parse_date(match.group(1))
                self.extracted["spouse_age"] = int(match.group(2))
                print(f"   ✅ spouse_dob: {match.group(1)}, age: {match.group(2)}")
                return
    
    def _extract_dependents(self, text: str):
        # Check for "No dependents"
        if re.search(r"•?\s*No dependents|None|0 dependents", text, re.IGNORECASE):
            self.extracted["has_dependents"] = False
            self.extracted["qualifying_children_under_17"] = 0
            self.extracted["other_dependents"] = 0
            print(f"   ✅ dependents: None")
            return
        
        # Count dependents by type
        children = 0
        others = 0
        
        # Pattern: "Name - Age X → $2,000 Child Tax Credit"
        for match in re.findall(
            r"([A-Za-z\s]+)\s*[-–]\s*Age\s*(\d+)\s*→?\s*\$?[\d,]+\s*(Child Tax Credit|Other Dependent)",
            text, re.IGNORECASE
        ):
            age = int(match[1])
            credit_type = match[2].lower()
            if "child tax credit" in credit_type and age <= 16:
                children += 1
            else:
                others += 1
        
        # Also check for explicit counts
        child_count = re.search(r"(\d+)\s*(?:qualifying\s+)?child(?:ren)?(?:\s+under\s+17)?", text, re.IGNORECASE)
        if child_count:
            children = max(children, int(child_count.group(1)))
        
        other_count = re.search(r"(\d+)\s*other\s+dependent", text, re.IGNORECASE)
        if other_count:
            others = max(others, int(other_count.group(1)))
        
        self.extracted["has_dependents"] = children > 0 or others > 0
        self.extracted["qualifying_children_under_17"] = children
        self.extracted["other_dependents"] = others
        
        if children > 0 or others > 0:
            print(f"   ✅ dependents: {children} children, {others} other")
    
    # ────────────────────────────────────────────────────────
    # W-2 INCOME
    # ────────────────────────────────────────────────────────
    
    def _extract_w2_income(self, text: str):
        # Taxpayer W-2s
        tp_wages = sum(parse_amount(m.group(1)) for m in re.finditer(
            r"•\s*Taxpayer W-2 #\d+\s+Wages[:\s]+\$?([\d,]+)", text, re.IGNORECASE))
        tp_fed = sum(parse_amount(m.group(1)) for m in re.finditer(
            r"•\s*Taxpayer W-2 #\d+\s+Federal Withheld[:\s]+\$?([\d,]+)", text, re.IGNORECASE))
        tp_state = sum(parse_amount(m.group(1)) for m in re.finditer(
            r"•\s*Taxpayer W-2 #\d+\s+State Withheld[:\s]+\$?([\d,]+)", text, re.IGNORECASE))
        
        # Alternative patterns
        if tp_wages == 0:
            alt = re.search(r"(?:Your|Taxpayer)\s+W-2.*?Wages[:\s]+\$?([\d,]+)", text, re.IGNORECASE | re.DOTALL)
            if alt:
                tp_wages = parse_amount(alt.group(1))
        
        if tp_wages > 0:
            self.extracted["taxpayer_wages"] = tp_wages
            self.extracted["taxpayer_federal_withheld"] = tp_fed
            self.extracted["taxpayer_state_withheld"] = tp_state
            print(f"   ✅ taxpayer_wages: ${tp_wages:,}")
            print(f"   ✅ taxpayer_federal_withheld: ${tp_fed:,}")
        
        # Spouse W-2s
        sp_wages = sum(parse_amount(m.group(1)) for m in re.finditer(
            r"•\s*Spouse W-2 #\d+\s+Wages[:\s]+\$?([\d,]+)", text, re.IGNORECASE))
        sp_fed = sum(parse_amount(m.group(1)) for m in re.finditer(
            r"•\s*Spouse W-2 #\d+\s+Federal Withheld[:\s]+\$?([\d,]+)", text, re.IGNORECASE))
        sp_state = sum(parse_amount(m.group(1)) for m in re.finditer(
            r"•\s*Spouse W-2 #\d+\s+State Withheld[:\s]+\$?([\d,]+)", text, re.IGNORECASE))
        
        if sp_wages > 0:
            self.extracted["spouse_wages"] = sp_wages
            self.extracted["spouse_federal_withheld"] = sp_fed
            self.extracted["spouse_state_withheld"] = sp_state
            print(f"   ✅ spouse_wages: ${sp_wages:,}")
            print(f"   ✅ spouse_federal_withheld: ${sp_fed:,}")
    
    # ────────────────────────────────────────────────────────
    # 1099-NEC (Self-Employment)
    # ────────────────────────────────────────────────────────
    
    def _extract_1099_nec(self, text: str):
        total = 0
        # Pattern: Taxpayer 1099-NEC #1: $12,000
        for m in re.finditer(r"•\s*(?:Taxpayer|Spouse)\s+1099-NEC\s*#?\d*[:\s]+\$?([\d,]+)", text, re.IGNORECASE):
            total += parse_amount(m.group(1))
        
        # Alternative: 1099-NEC Income: $12,000
        if total == 0:
            alt = re.search(r"1099-NEC\s+(?:Income)?[:\s]+\$?([\d,]+)", text, re.IGNORECASE)
            if alt:
                total = parse_amount(alt.group(1))
        
        if total > 0:
            self.extracted["self_employment_income"] = total
            print(f"   ✅ self_employment_income (1099-NEC): ${total:,}")
    
    # ────────────────────────────────────────────────────────
    # 1099-INT (Interest)
    # ────────────────────────────────────────────────────────
    
    def _extract_1099_int(self, text: str):
        total = 0
        for m in re.finditer(r"•\s*(?:Taxpayer|Spouse)\s+1099-INT\s*#?\d*[:\s]+\$?([\d,]+)", text, re.IGNORECASE):
            total += parse_amount(m.group(1))
        
        if total == 0:
            alt = re.search(r"(?:Interest\s+Income|1099-INT)[:\s]+\$?([\d,]+)", text, re.IGNORECASE)
            if alt:
                total = parse_amount(alt.group(1))
        
        if total > 0:
            self.extracted["interest_income"] = total
            print(f"   ✅ interest_income (1099-INT): ${total:,}")
    
    # ────────────────────────────────────────────────────────
    # 1099-DIV (Dividends)
    # ────────────────────────────────────────────────────────
    
    def _extract_1099_div(self, text: str):
        total_ordinary = 0
        total_qualified = 0
        
        for m in re.finditer(r"•\s*(?:Taxpayer|Spouse)\s+1099-DIV\s*#?\d*[:\s]+\$?([\d,]+)", text, re.IGNORECASE):
            total_ordinary += parse_amount(m.group(1))
        
        # Check for qualified dividends separately
        qual_match = re.search(r"Qualified\s+Dividends?[:\s]+\$?([\d,]+)", text, re.IGNORECASE)
        if qual_match:
            total_qualified = parse_amount(qual_match.group(1))
        
        if total_ordinary > 0:
            self.extracted["dividend_income"] = total_ordinary
            print(f"   ✅ dividend_income (1099-DIV): ${total_ordinary:,}")
        
        if total_qualified > 0:
            self.extracted["qualified_dividends"] = total_qualified
            print(f"   ✅ qualified_dividends: ${total_qualified:,}")
    
    # ────────────────────────────────────────────────────────
    # 1099-R (Retirement/Pension)
    # ────────────────────────────────────────────────────────
    
    def _extract_1099_r(self, text: str):
        total = 0
        taxable = 0
        
        for m in re.finditer(r"•\s*(?:Taxpayer|Spouse)\s+1099-R\s*#?\d*[:\s]+\$?([\d,]+)", text, re.IGNORECASE):
            total += parse_amount(m.group(1))
        
        # Check for taxable amount
        taxable_match = re.search(r"1099-R.*?Taxable[:\s]+\$?([\d,]+)", text, re.IGNORECASE | re.DOTALL)
        if taxable_match:
            taxable = parse_amount(taxable_match.group(1))
        
        if total == 0:
            alt = re.search(r"(?:Pension|Retirement|IRA\s+Distribution)[:\s]+\$?([\d,]+)", text, re.IGNORECASE)
            if alt:
                total = parse_amount(alt.group(1))
        
        if total > 0:
            self.extracted["pension_income"] = total
            self.extracted["taxable_pension"] = taxable if taxable > 0 else total
            print(f"   ✅ pension_income (1099-R): ${total:,}")
    
    # ────────────────────────────────────────────────────────
    # 1099-G (Unemployment)
    # ────────────────────────────────────────────────────────
    
    def _extract_1099_g(self, text: str):
        total = 0
        for m in re.finditer(r"•\s*(?:Taxpayer|Spouse)\s+1099-G\s*#?\d*[:\s]+\$?([\d,]+)", text, re.IGNORECASE):
            total += parse_amount(m.group(1))
        
        if total == 0:
            alt = re.search(r"(?:Unemployment|1099-G)[:\s]+\$?([\d,]+)", text, re.IGNORECASE)
            if alt:
                total = parse_amount(alt.group(1))
        
        if total > 0:
            self.extracted["unemployment_income"] = total
            print(f"   ✅ unemployment_income (1099-G): ${total:,}")
    
    # ────────────────────────────────────────────────────────
    # 1099-B (Capital Gains/Losses)
    # ────────────────────────────────────────────────────────
    
    def _extract_1099_b(self, text: str):
        long_term = 0
        short_term = 0
        
        # Long-term gains
        lt_match = re.search(r"Long[- ]?Term\s+(?:Capital\s+)?Gains?[:\s]+\$?([\d,]+)", text, re.IGNORECASE)
        if lt_match:
            long_term = parse_amount(lt_match.group(1))
        
        # Long-term losses (negative)
        lt_loss = re.search(r"Long[- ]?Term\s+(?:Capital\s+)?Loss(?:es)?[:\s]+\$?([\d,]+)", text, re.IGNORECASE)
        if lt_loss:
            long_term = -parse_amount(lt_loss.group(1))
        
        # Short-term gains
        st_match = re.search(r"Short[- ]?Term\s+(?:Capital\s+)?Gains?[:\s]+\$?([\d,]+)", text, re.IGNORECASE)
        if st_match:
            short_term = parse_amount(st_match.group(1))
        
        # Short-term losses
        st_loss = re.search(r"Short[- ]?Term\s+(?:Capital\s+)?Loss(?:es)?[:\s]+\$?([\d,]+)", text, re.IGNORECASE)
        if st_loss:
            short_term = -parse_amount(st_loss.group(1))
        
        # Generic capital gains
        if long_term == 0 and short_term == 0:
            cg = re.search(r"Capital\s+Gains?[:\s]+\$?([\d,]+)", text, re.IGNORECASE)
            if cg:
                long_term = parse_amount(cg.group(1))
        
        if long_term != 0:
            self.extracted["long_term_gains"] = long_term
            print(f"   ✅ long_term_gains: ${long_term:,}")
        
        if short_term != 0:
            self.extracted["short_term_gains"] = short_term
            print(f"   ✅ short_term_gains: ${short_term:,}")
    
    # ────────────────────────────────────────────────────────
    # SSA-1099 (Social Security)
    # ────────────────────────────────────────────────────────
    
    def _extract_ssa_1099(self, text: str):
        total = 0
        
        # Pattern: SSA-1099: $24,000
        ssa = re.search(r"(?:SSA-1099|Social\s+Security)[:\s]+\$?([\d,]+)", text, re.IGNORECASE)
        if ssa:
            total = parse_amount(ssa.group(1))
        
        # Also check for Taxpayer/Spouse SSA
        for m in re.finditer(r"•\s*(?:Taxpayer|Spouse)\s+SSA-1099[:\s]+\$?([\d,]+)", text, re.IGNORECASE):
            total += parse_amount(m.group(1))
        
        if total > 0:
            self.extracted["social_security"] = total
            print(f"   ✅ social_security (SSA-1099): ${total:,}")
    
    # ────────────────────────────────────────────────────────
    # RENTAL INCOME
    # ────────────────────────────────────────────────────────
    
    def _extract_rental_income(self, text: str):
        total_income = 0
        total_expenses = 0
        
        # Rental income
        for m in re.finditer(r"Rental\s+(?:Property\s+)?#?\d*\s*Income[:\s]+\$?([\d,]+)", text, re.IGNORECASE):
            total_income += parse_amount(m.group(1))
        
        # Rental expenses
        for m in re.finditer(r"Rental\s+(?:Property\s+)?#?\d*\s*Expenses?[:\s]+\$?([\d,]+)", text, re.IGNORECASE):
            total_expenses += parse_amount(m.group(1))
        
        # Alternative: Net Rental Income
        if total_income == 0:
            net = re.search(r"(?:Net\s+)?Rental\s+Income[:\s]+\$?([\d,]+)", text, re.IGNORECASE)
            if net:
                total_income = parse_amount(net.group(1))
        
        if total_income > 0:
            self.extracted["rental_income"] = total_income
            self.extracted["rental_expenses"] = total_expenses
            self.extracted["net_rental_income"] = total_income - total_expenses
            print(f"   ✅ rental_income: ${total_income:,}, expenses: ${total_expenses:,}")
    
    # ────────────────────────────────────────────────────────
    # CRYPTO
    # ────────────────────────────────────────────────────────
    
    def _extract_crypto(self, text: str):
        gains = 0
        
        crypto = re.search(r"Crypto(?:currency)?\s+(?:Gains?|Income)[:\s]+\$?([\d,]+)", text, re.IGNORECASE)
        if crypto:
            gains = parse_amount(crypto.group(1))
        
        # Check for losses
        crypto_loss = re.search(r"Crypto(?:currency)?\s+Loss(?:es)?[:\s]+\$?([\d,]+)", text, re.IGNORECASE)
        if crypto_loss:
            gains = -parse_amount(crypto_loss.group(1))
        
        if gains != 0:
            self.extracted["crypto_gains"] = gains
            print(f"   ✅ crypto_gains: ${gains:,}")
    
    # ────────────────────────────────────────────────────────
    # ADJUSTMENTS
    # ────────────────────────────────────────────────────────
    
    def _extract_ira(self, text: str):
        # Taxpayer IRA
        tp_ira = re.search(r"•\s*(?:Taxpayer|Your)\s*IRA[:\s]+\$?([\d,]+)", text, re.IGNORECASE)
        if tp_ira:
            self.extracted["taxpayer_ira"] = parse_amount(tp_ira.group(1))
            print(f"   ✅ taxpayer_ira: ${self.extracted['taxpayer_ira']:,}")
        
        # Spouse IRA
        sp_ira = re.search(r"•\s*Spouse(?:'s)?\s*IRA[:\s]+\$?([\d,]+)", text, re.IGNORECASE)
        if sp_ira:
            self.extracted["spouse_ira"] = parse_amount(sp_ira.group(1))
            print(f"   ✅ spouse_ira: ${self.extracted['spouse_ira']:,}")
    
    def _extract_hsa(self, text: str):
        hsa = re.search(r"•?\s*HSA(?:\s+Contribution)?[:\s]+\$?([\d,]+)", text, re.IGNORECASE)
        if hsa:
            amount = parse_amount(hsa.group(1))
            self.extracted["hsa"] = amount
            if amount > 0:
                print(f"   ✅ hsa: ${amount:,}")
    
    def _extract_student_loan(self, text: str):
        sli = re.search(r"Student\s+Loan\s+Interest[:\s]+\$?([\d,]+)", text, re.IGNORECASE)
        if sli:
            amount = parse_amount(sli.group(1))
            self.extracted["student_loan_interest"] = amount
            if amount > 0:
                print(f"   ✅ student_loan_interest: ${amount:,}")
    
    def _extract_deduction_type(self, text: str):
        if re.search(r"(?:Deduction|Deduct)[:\s]+\*?\*?(?:Standard|Std)", text, re.IGNORECASE):
            self.extracted["deduction_type"] = "standard"
        elif re.search(r"(?:Deduction|Deduct)[:\s]+\*?\*?Itemize", text, re.IGNORECASE):
            self.extracted["deduction_type"] = "itemized"
        else:
            self.extracted["deduction_type"] = "standard"
    
    def _fill_from_answers(self):
        """Fill missing fields from answers dict (fallback)."""
        field_mapping = {
            "filing_status": "filing_status",
            "state": "state",
            "taxpayer_wages": "taxpayer_wages",
            "spouse_wages": "spouse_wages",
            "taxpayer_federal_withheld": "taxpayer_federal_withheld",
            "spouse_federal_withheld": "spouse_federal_withheld",
            "taxpayer_ira": "taxpayer_ira",
            "spouse_ira": "spouse_ira",
        }
        
        for ext_field, ans_field in field_mapping.items():
            if ext_field not in self.extracted and ans_field in self.answers:
                val = self.answers[ans_field]
                if val:
                    self.extracted[ext_field] = val
                    print(f"   📥 Fallback {ext_field}: {val}")


# ============================================================
# MAPPING TO CALCULATOR
# ============================================================

def map_extracted_to_calculator(extracted: Dict) -> Dict:
    """Map extracted data to calculator input format."""
    return {
        "filing_status": extracted.get("filing_status", "single"),
        "taxpayer_age": extracted.get("taxpayer_age", 0) or 0,
        "spouse_age": extracted.get("spouse_age", 0) or 0,
        
        # W-2 Wages
        "wages": extracted.get("taxpayer_wages", 0) or 0,
        "spouse_wages": extracted.get("spouse_wages", 0) or 0,
        "federal_withholding": extracted.get("taxpayer_federal_withheld", 0) or 0,
        "spouse_federal_withheld": extracted.get("spouse_federal_withheld", 0) or 0,
        
        # Other Income
        "interest_income": extracted.get("interest_income", 0) or 0,
        "dividend_income": extracted.get("dividend_income", 0) or 0,
        "qualified_dividends": extracted.get("qualified_dividends", 0) or 0,
        "long_term_gains": extracted.get("long_term_gains", 0) or 0,
        "short_term_gains": extracted.get("short_term_gains", 0) or 0,
        "pension_income": extracted.get("pension_income", 0) or 0,
        "social_security": extracted.get("social_security", 0) or 0,
        "self_employment_income": extracted.get("self_employment_income", 0) or 0,
        "unemployment_income": extracted.get("unemployment_income", 0) or 0,
        "rental_income": extracted.get("net_rental_income", 0) or extracted.get("rental_income", 0) or 0,
        "crypto_gains": extracted.get("crypto_gains", 0) or 0,
        
        # Adjustments
        "ira_contributions": extracted.get("taxpayer_ira", 0) or 0,
        "spouse_ira_contribution": extracted.get("spouse_ira", 0) or 0,
        "hsa_contributions": extracted.get("hsa", 0) or 0,
        "student_loan_interest": extracted.get("student_loan_interest", 0) or 0,
        
        # Dependents
        "qualifying_children_under_17": extracted.get("qualifying_children_under_17", 0) or 0,
        "other_dependents": extracted.get("other_dependents", 0) or 0,
    }


# ============================================================
# RAG VALIDATION
# ============================================================

def verify_with_rag(extracted: Dict) -> Tuple[bool, List[str]]:
    """Validate extracted data against IRS 2025 rules."""
    errors = []
    
    taxpayer_age = extracted.get("taxpayer_age", 0) or 0
    spouse_age = extracted.get("spouse_age", 0) or 0
    taxpayer_ira = extracted.get("taxpayer_ira", 0) or 0
    spouse_ira = extracted.get("spouse_ira", 0) or 0
    
    # IRA limits
    taxpayer_ira_limit = IRA_LIMIT_50_PLUS if taxpayer_age >= 50 else IRA_LIMIT_UNDER_50
    spouse_ira_limit = IRA_LIMIT_50_PLUS if spouse_age >= 50 else IRA_LIMIT_UNDER_50
    
    if taxpayer_ira > taxpayer_ira_limit:
        errors.append(f"Taxpayer IRA ${taxpayer_ira:,} exceeds limit ${taxpayer_ira_limit:,}")
    
    if spouse_ira > spouse_ira_limit and spouse_age > 0:
        errors.append(f"Spouse IRA ${spouse_ira:,} exceeds limit ${spouse_ira_limit:,}")
    
    # HSA limit
    hsa = extracted.get("hsa", 0) or 0
    if hsa > HSA_LIMIT_FAMILY:
        errors.append(f"HSA ${hsa:,} exceeds family limit ${HSA_LIMIT_FAMILY:,}")
    
    # Student loan limit
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
            "line_1z_total_wages": total_wages,
            "line_1_wages": total_wages,
            "line_2b_taxable_interest": tax_result.get("interest_income", 0),
            "line_3a_qualified_dividends": tax_result.get("qualified_dividends", 0),
            "line_3b_ordinary_dividends": tax_result.get("dividend_income", 0),
            "line_4b_taxable_ira": tax_result.get("pension_income", 0),
            "line_6b_taxable_social_security": tax_result.get("taxable_social_security", 0),
            "line_7_capital_gain": tax_result.get("capital_gains", 0),
            "line_8_schedule_1_income": tax_result.get("other_income", 0),
            "line_9_total_income": tax_result.get("total_income", 0),
        },
        "adjustments": {
            "line_10_schedule_1_adjustments": tax_result.get("adjustments", 0),
            "line_11_agi": tax_result.get("agi", 0),
        },
        "deductions": {
            "line_12_deduction": tax_result.get("standard_deduction", 0),
            "line_14_total_deductions": tax_result.get("standard_deduction", 0),
            "line_15_taxable_income": tax_result.get("taxable_income", 0),
        },
        "tax_and_credits": {
            "line_16_tax": tax_result.get("bracket_tax", 0),
            "line_19_child_credit": tax_result.get("child_tax_credit", 0),
            "line_21_total_credits": tax_result.get("total_credits", 0),
            "line_22_tax_after_credits": tax_result.get("tax_after_credits", 0),
            "line_24_total_tax": tax_result.get("tax_after_credits", 0),
        },
        "payments": {
            "line_25a_w2_withholding": tax_result.get("withholding", 0),
            "line_25d_total_withholding": tax_result.get("withholding", 0),
            "line_27_eic": tax_result.get("eitc", 0),
            "line_28_actc": tax_result.get("ctc_refundable", 0),
            "line_33_total_payments": tax_result.get("total_payments", 0),
        },
        "refund_or_owe": {
            "line_34_overpaid": tax_result.get("refund", 0),
            "line_35_refund": tax_result.get("refund", 0),
            "line_37_amount_owed": tax_result.get("amount_owed", 0),
            "line_37_amount_owe": tax_result.get("amount_owed", 0),
        },
        "_income_details": {
            "taxpayer_wages": extracted.get("taxpayer_wages", 0),
            "spouse_wages": extracted.get("spouse_wages", 0),
            "taxpayer_federal_withheld": extracted.get("taxpayer_federal_withheld", 0),
            "spouse_federal_withheld": extracted.get("spouse_federal_withheld", 0),
            "taxpayer_ira": extracted.get("taxpayer_ira", 0),
            "spouse_ira": extracted.get("spouse_ira", 0),
            "interest_income": extracted.get("interest_income", 0),
            "dividend_income": extracted.get("dividend_income", 0),
            "capital_gains": extracted.get("long_term_gains", 0),
            "social_security": extracted.get("social_security", 0),
            "self_employment": extracted.get("self_employment_income", 0),
        },
        "_metadata": {
            "extractor_version": EXTRACTOR_VERSION,
            "extracted_at": datetime.now(timezone.utc).isoformat(),
        }
    }


# ============================================================
# SAVE TO MONGODB
# ============================================================

def save_results_to_mongodb(user_id: str, tax_year: int, extracted: Dict, tax_result: Dict, form1040: Dict) -> bool:
    """Save extracted results back to MongoDB."""
    if not MONGODB_SAVE_AVAILABLE or not update_session_in_db:
        print("   ⚠️ Cannot save to MongoDB - mongodb_client not available")
        return False
    
    try:
        update_data = {
            "extracted": extracted,
            "taxCalculation": tax_result,
            "form1040": form1040,
            
            # Key fields for Dashboard
            "taxpayer_wages": extracted.get("taxpayer_wages", 0),
            "spouse_wages": extracted.get("spouse_wages", 0),
            "total_wages": tax_result.get("wages", 0),
            "taxpayer_federal_withheld": extracted.get("taxpayer_federal_withheld", 0),
            "spouse_federal_withheld": extracted.get("spouse_federal_withheld", 0),
            "total_withheld": tax_result.get("withholding", 0),
            "taxpayer_state_withheld": extracted.get("taxpayer_state_withheld", 0),
            "spouse_state_withheld": extracted.get("spouse_state_withheld", 0),
            "taxpayer_ira": extracted.get("taxpayer_ira", 0),
            "spouse_ira": extracted.get("spouse_ira", 0),
            "ira_contributions": tax_result.get("ira_deduction", 0),
            "hsa": extracted.get("hsa", 0),
            "filing_status": extracted.get("filing_status", "single"),
            "state": extracted.get("state", ""),
            
            # All income types
            "interest_income": extracted.get("interest_income", 0),
            "dividend_income": extracted.get("dividend_income", 0),
            "capital_gains": extracted.get("long_term_gains", 0),
            "social_security": extracted.get("social_security", 0),
            "self_employment_income": extracted.get("self_employment_income", 0),
            "pension_income": extracted.get("pension_income", 0),
            "unemployment_income": extracted.get("unemployment_income", 0),
            "rental_income": extracted.get("rental_income", 0),
            
            # Tax calculation
            "agi": tax_result.get("agi", 0),
            "federal_agi": tax_result.get("agi", 0),
            "taxable_income": tax_result.get("taxable_income", 0),
            "total_tax": tax_result.get("tax_after_credits", 0),
            "refund": tax_result.get("refund", 0),
            "amount_owed": tax_result.get("amount_owed", 0),
            
            # Metadata
            "ragVerified": True,
            "extractedAt": datetime.now(timezone.utc),
            "extractorVersion": EXTRACTOR_VERSION,
            "status": "extracted",
        }
        
        success = update_session_in_db(user_id, tax_year, update_data)
        
        if success:
            print(f"   ✅ Saved to MongoDB!")
            print(f"      Total wages: ${tax_result.get('wages', 0):,.0f}")
            print(f"      AGI: ${tax_result.get('agi', 0):,.0f}")
            print(f"      Amount owed: ${tax_result.get('amount_owed', 0):,.0f}")
        
        return success
        
    except Exception as e:
        print(f"   ❌ Save to MongoDB failed: {e}")
        return False


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
    for err in rag_errors:
        print(f"   ⚠️ {err}")
    
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
    
    # Save to MongoDB
    print(f"\n💾 Saving to MongoDB...")
    save_results_to_mongodb(user_id, tax_year, extracted, tax_result, form1040)
    
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
# FILE I/O (Required by other modules)
# ============================================================

def load_form1040_json(user_id: str, tax_year: int = 2025) -> Optional[Dict]:
    """Load Form 1040 JSON from file."""
    filepath = DATA_DIR / f"{user_id}_1040_{tax_year}.json"
    if filepath.exists():
        with open(filepath, 'r') as f:
            return json.load(f)
    return None

def save_form1040_json(user_id: str, form1040: Dict, tax_year: int = 2025) -> str:
    """Save Form 1040 JSON to file."""
    filepath = DATA_DIR / f"{user_id}_1040_{tax_year}.json"
    with open(filepath, 'w') as f:
        json.dump(form1040, f, indent=2, default=str)
    return str(filepath)


# ============================================================
# CLI
# ============================================================

if __name__ == "__main__":
    print(f"Text Extractor {EXTRACTOR_VERSION} loaded")
    print(f"Supports: W-2, 1099-NEC, 1099-INT, 1099-DIV, 1099-R, 1099-G, 1099-B, SSA-1099, Rental, Crypto")
