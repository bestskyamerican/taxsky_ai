"""
=============================================================
ALL STATES FORMS ROUTER - 41 Tax States + 9 No-Tax States
=============================================================
Location: backend/routers/additional_states_router.py

Tax States (41):
  AL, AR, AZ, CA, CO, CT, DC, DE, GA, HI, IA, ID, IL, IN, KS, KY,
  LA, MA, MD, ME, MI, MN, MO, MS, MT, NC, ND, NE, NJ, NM, NY, OH,
  OK, OR, PA, RI, SC, UT, VA, VT, WI, WV

No-Tax States (9):
  AK, FL, NV, NH, SD, TN, TX, WA, WY

Endpoints:
  POST /generate/{state}-{form}  → Generate state form
  GET  /generate/{state}/info    → State tax info
  GET  /generate/states/supported → List all supported states
  GET  /generate/states/calculate/{state_code} → Quick calculation
  GET  /generate/states/compare  → Compare all states
=============================================================
"""

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel, ConfigDict
from typing import Optional, List
import tempfile
import os

try:
    from pypdf import PdfReader, PdfWriter
    from pypdf.generic import NameObject, BooleanObject
    HAS_PYPDF = True
except ImportError:
    HAS_PYPDF = False

# Router
additional_states_router = APIRouter(prefix="/generate", tags=["State Tax Forms"])

# Template directory
TEMPLATES_DIR = os.path.join(os.path.dirname(__file__), "templates")


# =============================================================
# NO-TAX STATES (9 states)
# =============================================================
NO_TAX_STATES = {
    "AK": {"name": "Alaska", "notes": "No state income tax. Oil revenue funds state."},
    "FL": {"name": "Florida", "notes": "No state income tax (constitutional)."},
    "NV": {"name": "Nevada", "notes": "No state income tax. Gaming revenue funds state."},
    "NH": {"name": "New Hampshire", "notes": "No income tax. Interest/dividend tax ended 2025."},
    "SD": {"name": "South Dakota", "notes": "No state income tax."},
    "TN": {"name": "Tennessee", "notes": "No income tax. Hall tax ended 2021."},
    "TX": {"name": "Texas", "notes": "No state income tax (constitutional)."},
    "WA": {"name": "Washington", "notes": "No income tax. Capital gains tax 7% only."},
    "WY": {"name": "Wyoming", "notes": "No state income tax."}
}


# =============================================================
# TAX CONSTANTS - ALL 41 TAX STATES
# =============================================================
STATE_TAX_INFO = {
    # =========================================================
    # FLAT TAX STATES (14 states)
    # =========================================================
    "AZ": {
        "name": "Arizona", "form": "140", "tax_type": "flat", "rate": 0.025,
        "std_ded_single": 14600, "std_ded_married": 29200,
        "personal_exemption": 0, "dependent_exemption": 100,
        "website": "https://azdor.gov",
        "notes": "Lowest flat tax rate in the nation (2.5%)"
    },
    "CO": {
        "name": "Colorado", "form": "104", "tax_type": "flat", "rate": 0.044,
        "std_ded_single": 0, "std_ded_married": 0,
        "uses_federal_taxable": True,
        "personal_exemption": 0, "dependent_exemption": 0,
        "website": "https://tax.colorado.gov",
        "notes": "Uses federal taxable income as starting point"
    },
    "GA": {
        "name": "Georgia", "form": "500", "tax_type": "flat", "rate": 0.0549,
        "std_ded_single": 12000, "std_ded_married": 24000,
        "personal_exemption": 2700, "dependent_exemption": 3000,
        "website": "https://dor.georgia.gov",
        "notes": "Switched to flat tax in 2024"
    },
    "ID": {
        "name": "Idaho", "form": "40", "tax_type": "flat", "rate": 0.058,
        "std_ded_single": 14600, "std_ded_married": 29200,
        "personal_exemption": 0, "dependent_exemption": 0,
        "grocery_credit": 120,
        "website": "https://tax.idaho.gov",
        "notes": "Grocery tax credit $120 per person"
    },
    "IL": {
        "name": "Illinois", "form": "IL-1040", "tax_type": "flat", "rate": 0.0495,
        "std_ded_single": 0, "std_ded_married": 0,
        "personal_exemption": 2775, "dependent_exemption": 2775,
        "website": "https://tax.illinois.gov",
        "notes": "Retirement income is fully exempt"
    },
    "IN": {
        "name": "Indiana", "form": "IT-40", "tax_type": "flat", "rate": 0.0305,
        "std_ded_single": 0, "std_ded_married": 0,
        "personal_exemption": 1000, "dependent_exemption": 1000,
        "has_local_tax": True,
        "website": "https://www.in.gov/dor",
        "notes": "County taxes add 0.5% to 3.38%"
    },
    "IA": {
        "name": "Iowa", "form": "IA-1040", "tax_type": "flat", "rate": 0.038,
        "std_ded_single": 0, "std_ded_married": 0,
        "personal_exemption": 40, "dependent_exemption": 40,
        "website": "https://tax.iowa.gov",
        "notes": "Retirement income is fully exempt"
    },
    "KY": {
        "name": "Kentucky", "form": "740", "tax_type": "flat", "rate": 0.04,
        "std_ded_single": 3160, "std_ded_married": 6320,
        "personal_exemption": 0, "dependent_exemption": 0,
        "website": "https://revenue.ky.gov",
        "notes": "Rate reduced to 4% in 2025"
    },
    "MA": {
        "name": "Massachusetts", "form": "1", "tax_type": "flat", "rate": 0.05,
        "surtax_rate": 0.04, "surtax_threshold": 1000000,
        "std_ded_single": 0, "std_ded_married": 0,
        "personal_exemption": 4400, "personal_exemption_married": 8800,
        "dependent_exemption": 1000,
        "website": "https://www.mass.gov/dor",
        "notes": "4% surtax on income over $1M (9% top rate)"
    },
    "MI": {
        "name": "Michigan", "form": "MI-1040", "tax_type": "flat", "rate": 0.0425,
        "std_ded_single": 0, "std_ded_married": 0,
        "personal_exemption": 5600, "dependent_exemption": 5600,
        "has_local_tax": True,
        "website": "https://www.michigan.gov/treasury",
        "notes": "Detroit adds 2.4% city tax"
    },
    "MS": {
        "name": "Mississippi", "form": "80-105", "tax_type": "flat", "rate": 0.047,
        "exempt_amount": 10000,
        "std_ded_single": 2300, "std_ded_married": 4600,
        "personal_exemption": 6000, "personal_exemption_married": 12000,
        "dependent_exemption": 1500,
        "website": "https://www.dor.ms.gov",
        "notes": "First $10,000 of income is exempt"
    },
    "NC": {
        "name": "North Carolina", "form": "D-400", "tax_type": "flat", "rate": 0.045,
        "std_ded_single": 13500, "std_ded_married": 27000,
        "personal_exemption": 0, "dependent_exemption": 0,
        "child_deduction": 2500,
        "website": "https://www.ncdor.gov",
        "notes": "Rate decreased to 4.5% in 2025"
    },
    "PA": {
        "name": "Pennsylvania", "form": "PA-40", "tax_type": "flat", "rate": 0.0307,
        "std_ded_single": 0, "std_ded_married": 0,
        "personal_exemption": 0, "dependent_exemption": 0,
        "has_local_tax": True,
        "website": "https://www.revenue.pa.gov",
        "notes": "Lowest flat rate (3.07%). Local EIT taxes apply."
    },
    "UT": {
        "name": "Utah", "form": "TC-40", "tax_type": "flat", "rate": 0.0465,
        "std_ded_single": 0, "std_ded_married": 0,
        "uses_federal_taxable": True,
        "personal_exemption": 0, "dependent_exemption": 0,
        "taxpayer_credit_rate": 0.06,
        "website": "https://tax.utah.gov",
        "notes": "Taxpayer credit = 6% of federal standard deduction"
    },
    
    # =========================================================
    # PROGRESSIVE TAX STATES (27 states)
    # =========================================================
    "AL": {
        "name": "Alabama", "form": "40", "tax_type": "progressive",
        "brackets": [(0, 500, 0.02), (500, 3000, 0.04), (3000, 999999999, 0.05)],
        "brackets_mfj": [(0, 1000, 0.02), (1000, 6000, 0.04), (6000, 999999999, 0.05)],
        "std_ded_single": 2500, "std_ded_married": 7500,
        "personal_exemption": 1500, "personal_exemption_married": 3000,
        "dependent_exemption": 1000,
        "allows_federal_deduction": True,
        "website": "https://revenue.alabama.gov",
        "notes": "UNIQUE: Allows federal income tax deduction"
    },
    "AR": {
        "name": "Arkansas", "form": "AR1000F", "tax_type": "progressive",
        "brackets": [(0, 5100, 0.02), (5100, 10200, 0.04), (10200, 999999999, 0.044)],
        "std_ded_single": 2340, "std_ded_married": 4680,
        "personal_exemption": 29, "dependent_exemption": 29,
        "website": "https://www.dfa.arkansas.gov",
        "notes": "Top rate 4.4%"
    },
    "CA": {
        "name": "California", "form": "540", "tax_type": "progressive",
        "brackets": [
            (0, 10412, 0.01), (10412, 24684, 0.02), (24684, 38959, 0.04),
            (38959, 54081, 0.06), (54081, 68350, 0.08), (68350, 349137, 0.093),
            (349137, 418961, 0.103), (418961, 698271, 0.113), (698271, 999999999, 0.123)
        ],
        "mental_health_threshold": 1000000, "mental_health_rate": 0.01,
        "std_ded_single": 5706, "std_ded_married": 11412,
        "personal_exemption": 153, "dependent_exemption": 475,
        "website": "https://www.ftb.ca.gov",
        "notes": "Top rate 12.3% (+1% mental health tax over $1M = 13.3%)"
    },
    "CT": {
        "name": "Connecticut", "form": "CT-1040", "tax_type": "progressive",
        "brackets": [
            (0, 10000, 0.02), (10000, 50000, 0.045), (50000, 100000, 0.055),
            (100000, 200000, 0.06), (200000, 250000, 0.065), (250000, 500000, 0.069),
            (500000, 999999999, 0.0699)
        ],
        "brackets_mfj": [
            (0, 20000, 0.02), (20000, 100000, 0.045), (100000, 200000, 0.055),
            (200000, 400000, 0.06), (400000, 500000, 0.065), (500000, 1000000, 0.069),
            (1000000, 999999999, 0.0699)
        ],
        "std_ded_single": 0, "std_ded_married": 0,
        "personal_exemption": 15000, "personal_exemption_married": 24000,
        "dependent_exemption": 0,
        "website": "https://portal.ct.gov/drs",
        "notes": "7 brackets, top rate 6.99%"
    },
    "DC": {
        "name": "Washington DC", "form": "D-40", "tax_type": "progressive",
        "brackets": [
            (0, 10000, 0.04), (10000, 40000, 0.06), (40000, 60000, 0.065),
            (60000, 250000, 0.085), (250000, 500000, 0.0925), (500000, 1000000, 0.0975),
            (1000000, 999999999, 0.1075)
        ],
        "std_ded_single": 14600, "std_ded_married": 29200,
        "personal_exemption": 4150, "dependent_exemption": 4150,
        "website": "https://otr.cfo.dc.gov",
        "notes": "7 brackets, top rate 10.75%"
    },
    "DE": {
        "name": "Delaware", "form": "200-01", "tax_type": "progressive",
        "brackets": [
            (0, 2000, 0.0), (2000, 5000, 0.022), (5000, 10000, 0.039),
            (10000, 20000, 0.048), (20000, 25000, 0.052), (25000, 60000, 0.0555),
            (60000, 999999999, 0.066)
        ],
        "std_ded_single": 3250, "std_ded_married": 6500,
        "personal_exemption": 110, "dependent_exemption": 110,
        "website": "https://revenue.delaware.gov",
        "notes": "First $2K tax-free. No sales tax state."
    },
    "HI": {
        "name": "Hawaii", "form": "N-11", "tax_type": "progressive",
        "brackets": [
            (0, 2400, 0.014), (2400, 4800, 0.032), (4800, 9600, 0.055),
            (9600, 14400, 0.064), (14400, 19200, 0.068), (19200, 24000, 0.072),
            (24000, 36000, 0.076), (36000, 48000, 0.079), (48000, 150000, 0.0825),
            (150000, 175000, 0.09), (175000, 200000, 0.10), (200000, 999999999, 0.11)
        ],
        "std_ded_single": 2200, "std_ded_married": 4400,
        "personal_exemption": 1144, "dependent_exemption": 1144,
        "website": "https://tax.hawaii.gov",
        "notes": "12 brackets, top rate 11% - among highest"
    },
    "KS": {
        "name": "Kansas", "form": "K-40", "tax_type": "progressive",
        "brackets": [(0, 15000, 0.031), (15000, 30000, 0.0525), (30000, 999999999, 0.057)],
        "brackets_mfj": [(0, 30000, 0.031), (30000, 60000, 0.0525), (60000, 999999999, 0.057)],
        "std_ded_single": 3500, "std_ded_married": 8000,
        "personal_exemption": 2250, "dependent_exemption": 2250,
        "website": "https://www.ksrevenue.gov",
        "notes": "3 brackets, top rate 5.7%"
    },
    "LA": {
        "name": "Louisiana", "form": "IT-540", "tax_type": "progressive",
        "brackets": [(0, 12500, 0.0185), (12500, 50000, 0.035), (50000, 999999999, 0.0425)],
        "brackets_mfj": [(0, 25000, 0.0185), (25000, 100000, 0.035), (100000, 999999999, 0.0425)],
        "std_ded_single": 0, "std_ded_married": 0,
        "personal_exemption": 4500, "personal_exemption_married": 9000,
        "dependent_exemption": 1000,
        "allows_federal_deduction": True,
        "website": "https://revenue.louisiana.gov",
        "notes": "Allows federal tax deduction (capped)"
    },
    "ME": {
        "name": "Maine", "form": "1040ME", "tax_type": "progressive",
        "brackets": [(0, 24500, 0.058), (24500, 58050, 0.0675), (58050, 999999999, 0.0715)],
        "brackets_mfj": [(0, 49050, 0.058), (49050, 116100, 0.0675), (116100, 999999999, 0.0715)],
        "std_ded_single": 14600, "std_ded_married": 29200,
        "personal_exemption": 5000, "dependent_exemption": 5000,
        "website": "https://www.maine.gov/revenue",
        "notes": "3 brackets, top rate 7.15%"
    },
    "MD": {
        "name": "Maryland", "form": "502", "tax_type": "progressive",
        "brackets": [
            (0, 1000, 0.02), (1000, 2000, 0.03), (2000, 3000, 0.04),
            (3000, 100000, 0.0475), (100000, 125000, 0.05), (125000, 150000, 0.0525),
            (150000, 250000, 0.055), (250000, 999999999, 0.0575)
        ],
        "std_ded_single": 2550, "std_ded_married": 5100,
        "personal_exemption": 3200, "dependent_exemption": 3200,
        "has_local_tax": True, "local_tax_rate": 0.032,
        "website": "https://www.marylandtaxes.gov",
        "notes": "8 brackets + mandatory county tax (~3.2%)"
    },
    "MN": {
        "name": "Minnesota", "form": "M1", "tax_type": "progressive",
        "brackets": [(0, 31690, 0.0535), (31690, 104090, 0.068), (104090, 193240, 0.0785), (193240, 999999999, 0.0985)],
        "brackets_mfj": [(0, 46330, 0.0535), (46330, 184040, 0.068), (184040, 321450, 0.0785), (321450, 999999999, 0.0985)],
        "std_ded_single": 14575, "std_ded_married": 29150,
        "personal_exemption": 0, "dependent_exemption": 0,
        "website": "https://www.revenue.state.mn.us",
        "notes": "4 brackets, top rate 9.85% (high)"
    },
    "MO": {
        "name": "Missouri", "form": "MO-1040", "tax_type": "progressive",
        "brackets": [
            (0, 1207, 0.02), (1207, 2414, 0.025), (2414, 3621, 0.03),
            (3621, 4828, 0.035), (4828, 6035, 0.04), (6035, 7242, 0.045),
            (7242, 999999999, 0.048)
        ],
        "std_ded_single": 14600, "std_ded_married": 29200,
        "personal_exemption": 0, "dependent_exemption": 0,
        "website": "https://dor.mo.gov",
        "notes": "7 brackets, top rate 4.8%"
    },
    "MT": {
        "name": "Montana", "form": "2", "tax_type": "progressive",
        "brackets": [(0, 20500, 0.047), (20500, 999999999, 0.059)],
        "brackets_mfj": [(0, 41000, 0.047), (41000, 999999999, 0.059)],
        "std_ded_single": 5540, "std_ded_married": 11080,
        "personal_exemption": 0, "dependent_exemption": 0,
        "website": "https://mtrevenue.gov",
        "notes": "2 brackets, top rate 5.9%"
    },
    "ND": {
        "name": "North Dakota", "form": "ND-1", "tax_type": "progressive",
        "brackets": [(0, 44725, 0.0195), (44725, 999999999, 0.025)],
        "brackets_mfj": [(0, 74750, 0.0195), (74750, 999999999, 0.025)],
        "std_ded_single": 0, "std_ded_married": 0,
        "uses_federal_taxable": True,
        "personal_exemption": 0, "dependent_exemption": 0,
        "website": "https://www.tax.nd.gov",
        "notes": "2 brackets, very low rates (1.95-2.5%)"
    },
    "NE": {
        "name": "Nebraska", "form": "1040N", "tax_type": "progressive",
        "brackets": [(0, 3700, 0.0246), (3700, 22170, 0.0351), (22170, 35730, 0.0501), (35730, 999999999, 0.0584)],
        "brackets_mfj": [(0, 7390, 0.0246), (7390, 44350, 0.0351), (44350, 71460, 0.0501), (71460, 999999999, 0.0584)],
        "std_ded_single": 7900, "std_ded_married": 15800,
        "personal_exemption": 0, "dependent_exemption": 0,
        "website": "https://revenue.nebraska.gov",
        "notes": "4 brackets, top rate 5.84%"
    },
    "NJ": {
        "name": "New Jersey", "form": "NJ-1040", "tax_type": "progressive",
        "brackets": [
            (0, 20000, 0.014), (20000, 35000, 0.0175), (35000, 40000, 0.035),
            (40000, 75000, 0.05525), (75000, 500000, 0.0637), (500000, 1000000, 0.0897),
            (1000000, 999999999, 0.1075)
        ],
        "std_ded_single": 0, "std_ded_married": 0,
        "personal_exemption": 1000, "dependent_exemption": 1500,
        "website": "https://www.state.nj.us/treasury/taxation",
        "notes": "7 brackets, top rate 10.75%"
    },
    "NM": {
        "name": "New Mexico", "form": "PIT-1", "tax_type": "progressive",
        "brackets": [(0, 5500, 0.017), (5500, 11000, 0.032), (11000, 16000, 0.047), (16000, 210000, 0.049), (210000, 999999999, 0.059)],
        "brackets_mfj": [(0, 8000, 0.017), (8000, 16000, 0.032), (16000, 24000, 0.047), (24000, 315000, 0.049), (315000, 999999999, 0.059)],
        "std_ded_single": 14600, "std_ded_married": 29200,
        "personal_exemption": 0, "dependent_exemption": 0,
        "website": "https://www.tax.newmexico.gov",
        "notes": "5 brackets, top rate 5.9%"
    },
    "NY": {
        "name": "New York", "form": "IT-201", "tax_type": "progressive",
        "brackets": [
            (0, 8500, 0.04), (8500, 11700, 0.045), (11700, 13900, 0.0525),
            (13900, 80650, 0.055), (80650, 215400, 0.06), (215400, 1077550, 0.0685),
            (1077550, 5000000, 0.0965), (5000000, 25000000, 0.103), (25000000, 999999999, 0.109)
        ],
        "brackets_mfj": [
            (0, 17150, 0.04), (17150, 23600, 0.045), (23600, 27900, 0.0525),
            (27900, 161550, 0.055), (161550, 323200, 0.06), (323200, 2155350, 0.0685),
            (2155350, 5000000, 0.0965), (5000000, 25000000, 0.103), (25000000, 999999999, 0.109)
        ],
        "std_ded_single": 8000, "std_ded_married": 16050,
        "personal_exemption": 0, "dependent_exemption": 1000,
        "has_local_tax": True, "nyc_rate_range": "3.078% - 3.876%",
        "website": "https://www.tax.ny.gov",
        "notes": "9 brackets, top rate 10.9%. NYC adds 3.078%-3.876%."
    },
    "OH": {
        "name": "Ohio", "form": "IT-1040", "tax_type": "progressive",
        "brackets": [(0, 26050, 0.0), (26050, 100000, 0.028), (100000, 999999999, 0.035)],
        "std_ded_single": 0, "std_ded_married": 0,
        "personal_exemption": 2400, "dependent_exemption": 2500,
        "website": "https://tax.ohio.gov",
        "notes": "First $26,050 is tax-free"
    },
    "OK": {
        "name": "Oklahoma", "form": "511", "tax_type": "progressive",
        "brackets": [(0, 1000, 0.0025), (1000, 2500, 0.0075), (2500, 3750, 0.0175), (3750, 4900, 0.0275), (4900, 7200, 0.0375), (7200, 999999999, 0.0475)],
        "brackets_mfj": [(0, 2000, 0.0025), (2000, 5000, 0.0075), (5000, 7500, 0.0175), (7500, 9800, 0.0275), (9800, 12200, 0.0375), (12200, 999999999, 0.0475)],
        "std_ded_single": 6350, "std_ded_married": 12700,
        "personal_exemption": 1000, "dependent_exemption": 1000,
        "website": "https://oklahoma.gov/tax",
        "notes": "6 brackets, top rate 4.75%"
    },
    "OR": {
        "name": "Oregon", "form": "40", "tax_type": "progressive",
        "brackets": [(0, 4300, 0.0475), (4300, 10750, 0.0675), (10750, 125000, 0.0875), (125000, 999999999, 0.099)],
        "brackets_mfj": [(0, 8600, 0.0475), (8600, 21500, 0.0675), (21500, 250000, 0.0875), (250000, 999999999, 0.099)],
        "std_ded_single": 2745, "std_ded_married": 5495,
        "personal_exemption": 0, "dependent_exemption": 0,
        "personal_credit": 236,
        "allows_federal_deduction": True,
        "website": "https://www.oregon.gov/dor",
        "notes": "4 brackets, top rate 9.9%. No sales tax!"
    },
    "RI": {
        "name": "Rhode Island", "form": "RI-1040", "tax_type": "progressive",
        "brackets": [(0, 73450, 0.0375), (73450, 166950, 0.0475), (166950, 999999999, 0.0599)],
        "std_ded_single": 10550, "std_ded_married": 21150,
        "personal_exemption": 4850, "dependent_exemption": 4850,
        "website": "https://tax.ri.gov",
        "notes": "3 brackets, top rate 5.99%"
    },
    "SC": {
        "name": "South Carolina", "form": "SC1040", "tax_type": "progressive",
        "brackets": [(0, 3460, 0.0), (3460, 17330, 0.03), (17330, 999999999, 0.064)],
        "std_ded_single": 14600, "std_ded_married": 29200,
        "personal_exemption": 4830, "dependent_exemption": 4830,
        "website": "https://dor.sc.gov",
        "notes": "First $3,460 tax-free, then 3%, then 6.4%"
    },
    "VA": {
        "name": "Virginia", "form": "760", "tax_type": "progressive",
        "brackets": [(0, 3000, 0.02), (3000, 5000, 0.03), (5000, 17000, 0.05), (17000, 999999999, 0.0575)],
        "std_ded_single": 8500, "std_ded_married": 17000,
        "personal_exemption": 930, "dependent_exemption": 930,
        "website": "https://www.tax.virginia.gov",
        "notes": "4 brackets, top rate 5.75%"
    },
    "VT": {
        "name": "Vermont", "form": "IN-111", "tax_type": "progressive",
        "brackets": [(0, 45400, 0.0335), (45400, 110450, 0.066), (110450, 229550, 0.076), (229550, 999999999, 0.0875)],
        "brackets_mfj": [(0, 75850, 0.0335), (75850, 183400, 0.066), (183400, 279450, 0.076), (279450, 999999999, 0.0875)],
        "std_ded_single": 7000, "std_ded_married": 14050,
        "personal_exemption": 4850, "dependent_exemption": 4850,
        "website": "https://tax.vermont.gov",
        "notes": "4 brackets, top rate 8.75%"
    },
    "WI": {
        "name": "Wisconsin", "form": "1", "tax_type": "progressive",
        "brackets": [(0, 14320, 0.035), (14320, 28640, 0.044), (28640, 315310, 0.053), (315310, 999999999, 0.0765)],
        "brackets_mfj": [(0, 19090, 0.035), (19090, 38190, 0.044), (38190, 420420, 0.053), (420420, 999999999, 0.0765)],
        "std_ded_single": 13230, "std_ded_married": 24470,
        "personal_exemption": 700, "dependent_exemption": 700,
        "website": "https://www.revenue.wi.gov",
        "notes": "4 brackets, top rate 7.65%"
    },
    "WV": {
        "name": "West Virginia", "form": "IT-140", "tax_type": "progressive",
        "brackets": [(0, 10000, 0.0236), (10000, 25000, 0.0315), (25000, 40000, 0.0354), (40000, 60000, 0.0472), (60000, 999999999, 0.0512)],
        "std_ded_single": 0, "std_ded_married": 0,
        "personal_exemption": 2000, "dependent_exemption": 2000,
        "website": "https://tax.wv.gov",
        "notes": "5 brackets, top rate 5.12%"
    }
}


# =============================================================
# SHARED MODELS
# =============================================================
class PersonalInfo(BaseModel):
    first_name: str = ""
    middle_initial: str = ""
    last_name: str = ""
    ssn: str = ""
    spouse_first_name: str = ""
    spouse_last_name: str = ""
    spouse_ssn: str = ""
    address: str = ""
    city: str = ""
    state: str = ""
    zip: str = ""
    model_config = ConfigDict(extra="allow")


class FederalInfo(BaseModel):
    filing_status: str = "single"
    agi: float = 0
    taxable_income: float = 0
    federal_tax: float = 0
    model_config = ConfigDict(extra="allow")


class StateInfo(BaseModel):
    additions: float = 0
    subtractions: float = 0
    state_agi: float = 0
    standard_deduction: float = 0
    exemptions: float = 0
    taxable_income: float = 0
    state_tax: float = 0
    credits: float = 0
    withholding: float = 0
    estimated_payments: float = 0
    model_config = ConfigDict(extra="allow")


class DependentInfo(BaseModel):
    first_name: str = ""
    last_name: str = ""
    ssn: str = ""
    relationship: str = ""
    model_config = ConfigDict(extra="allow")


class StateFormRequest(BaseModel):
    session_id: str = ""
    tax_year: int = 2025
    personal: Optional[PersonalInfo] = None
    federal: Optional[FederalInfo] = None
    state: Optional[StateInfo] = None
    dependents: Optional[List[DependentInfo]] = []
    mask_ssn: bool = True
    is_official_submission: bool = False
    model_config = ConfigDict(extra="allow")


# =============================================================
# HELPER FUNCTIONS
# =============================================================
def fmt_money(value) -> str:
    try:
        val = float(value) if value else 0
        return f"{val:,.0f}" if val else ""
    except:
        return ""


# =============================================================
# TAX CALCULATION FUNCTIONS
# =============================================================
def calculate_progressive_tax(taxable_income: float, brackets: list) -> float:
    """Calculate progressive tax using brackets"""
    if taxable_income <= 0:
        return 0
    tax = 0
    for low, high, rate in brackets:
        if taxable_income <= low:
            break
        bracket_income = min(taxable_income, high) - low
        if bracket_income > 0:
            tax += bracket_income * rate
    return round(tax, 2)


def calculate_state_tax(state_code: str, taxable_income: float, filing_status: str = "single") -> float:
    """Calculate tax for any supported state"""
    info = STATE_TAX_INFO.get(state_code.upper())
    if not info:
        return 0
    
    if info["tax_type"] == "flat":
        tax = taxable_income * info["rate"] if taxable_income > 0 else 0
        # MA surtax
        if info.get("surtax_rate") and taxable_income > info.get("surtax_threshold", 0):
            tax += (taxable_income - info["surtax_threshold"]) * info["surtax_rate"]
        return round(tax, 2)
    else:
        # Progressive
        if filing_status in ["married_filing_jointly", "married"] and info.get("brackets_mfj"):
            brackets = info["brackets_mfj"]
        else:
            brackets = info["brackets"]
        tax = calculate_progressive_tax(taxable_income, brackets)
        # CA mental health tax
        if info.get("mental_health_threshold") and taxable_income > info["mental_health_threshold"]:
            tax += (taxable_income - info["mental_health_threshold"]) * info.get("mental_health_rate", 0.01)
        return round(tax, 2)


def get_exemptions(state_code: str, filing_status: str, num_dependents: int) -> float:
    """Calculate total exemptions for a state"""
    info = STATE_TAX_INFO.get(state_code.upper())
    if not info:
        return 0
    
    if filing_status in ["married_filing_jointly", "married"]:
        personal_ex = info.get("personal_exemption_married", info.get("personal_exemption", 0) * 2)
    else:
        personal_ex = info.get("personal_exemption", 0)
    
    dependent_ex = info.get("dependent_exemption", 0) * num_dependents
    return personal_ex + dependent_ex


def get_standard_deduction(state_code: str, filing_status: str) -> float:
    """Get standard deduction for a state"""
    info = STATE_TAX_INFO.get(state_code.upper())
    if not info:
        return 0
    if filing_status in ["married_filing_jointly", "married"]:
        return info.get("std_ded_married", info.get("std_ded_single", 0))
    return info.get("std_ded_single", 0)


# =============================================================
# ENDPOINTS
# =============================================================

# Individual state endpoints
@additional_states_router.post("/al-40")
async def generate_al_40(data: StateFormRequest):
    """Generate Alabama Form 40"""
    return await generate_state_form_handler("AL", data)

@additional_states_router.post("/ar-ar1000f")
async def generate_ar_form(data: StateFormRequest):
    """Generate Arkansas Form AR1000F"""
    return await generate_state_form_handler("AR", data)

@additional_states_router.post("/az-140")
async def generate_az_140(data: StateFormRequest):
    """Generate Arizona Form 140"""
    return await generate_state_form_handler("AZ", data)

@additional_states_router.post("/ca-540")
async def generate_ca_540(data: StateFormRequest):
    """Generate California Form 540"""
    return await generate_state_form_handler("CA", data)

@additional_states_router.post("/co-104")
async def generate_co_104(data: StateFormRequest):
    """Generate Colorado Form 104"""
    return await generate_state_form_handler("CO", data)

@additional_states_router.post("/ct-1040")
async def generate_ct_1040(data: StateFormRequest):
    """Generate Connecticut Form CT-1040"""
    return await generate_state_form_handler("CT", data)

@additional_states_router.post("/dc-d40")
async def generate_dc_d40(data: StateFormRequest):
    """Generate DC Form D-40"""
    return await generate_state_form_handler("DC", data)

@additional_states_router.post("/de-200")
async def generate_de_200(data: StateFormRequest):
    """Generate Delaware Form 200-01"""
    return await generate_state_form_handler("DE", data)

@additional_states_router.post("/ga-500")
async def generate_ga_500(data: StateFormRequest):
    """Generate Georgia Form 500"""
    return await generate_state_form_handler("GA", data)

@additional_states_router.post("/hi-n11")
async def generate_hi_n11(data: StateFormRequest):
    """Generate Hawaii Form N-11"""
    return await generate_state_form_handler("HI", data)

@additional_states_router.post("/ia-1040")
async def generate_ia_1040(data: StateFormRequest):
    """Generate Iowa Form IA-1040"""
    return await generate_state_form_handler("IA", data)

@additional_states_router.post("/id-40")
async def generate_id_40(data: StateFormRequest):
    """Generate Idaho Form 40"""
    return await generate_state_form_handler("ID", data)

@additional_states_router.post("/il-1040")
async def generate_il_1040(data: StateFormRequest):
    """Generate Illinois Form IL-1040"""
    return await generate_state_form_handler("IL", data)

@additional_states_router.post("/in-it40")
async def generate_in_it40(data: StateFormRequest):
    """Generate Indiana Form IT-40"""
    return await generate_state_form_handler("IN", data)

@additional_states_router.post("/ks-k40")
async def generate_ks_k40(data: StateFormRequest):
    """Generate Kansas Form K-40"""
    return await generate_state_form_handler("KS", data)

@additional_states_router.post("/ky-740")
async def generate_ky_740(data: StateFormRequest):
    """Generate Kentucky Form 740"""
    return await generate_state_form_handler("KY", data)

@additional_states_router.post("/la-it540")
async def generate_la_it540(data: StateFormRequest):
    """Generate Louisiana Form IT-540"""
    return await generate_state_form_handler("LA", data)

@additional_states_router.post("/ma-1")
async def generate_ma_1(data: StateFormRequest):
    """Generate Massachusetts Form 1"""
    return await generate_state_form_handler("MA", data)

@additional_states_router.post("/md-502")
async def generate_md_502(data: StateFormRequest):
    """Generate Maryland Form 502"""
    return await generate_state_form_handler("MD", data)

@additional_states_router.post("/me-1040")
async def generate_me_1040(data: StateFormRequest):
    """Generate Maine Form 1040ME"""
    return await generate_state_form_handler("ME", data)

@additional_states_router.post("/mi-1040")
async def generate_mi_1040(data: StateFormRequest):
    """Generate Michigan Form MI-1040"""
    return await generate_state_form_handler("MI", data)

@additional_states_router.post("/mn-m1")
async def generate_mn_m1(data: StateFormRequest):
    """Generate Minnesota Form M1"""
    return await generate_state_form_handler("MN", data)

@additional_states_router.post("/mo-1040")
async def generate_mo_1040(data: StateFormRequest):
    """Generate Missouri Form MO-1040"""
    return await generate_state_form_handler("MO", data)

@additional_states_router.post("/ms-80105")
async def generate_ms_80105(data: StateFormRequest):
    """Generate Mississippi Form 80-105"""
    return await generate_state_form_handler("MS", data)

@additional_states_router.post("/mt-2")
async def generate_mt_2(data: StateFormRequest):
    """Generate Montana Form 2"""
    return await generate_state_form_handler("MT", data)

@additional_states_router.post("/nc-d400")
async def generate_nc_d400(data: StateFormRequest):
    """Generate North Carolina Form D-400"""
    return await generate_state_form_handler("NC", data)

@additional_states_router.post("/nd-1")
async def generate_nd_1(data: StateFormRequest):
    """Generate North Dakota Form ND-1"""
    return await generate_state_form_handler("ND", data)

@additional_states_router.post("/ne-1040n")
async def generate_ne_1040n(data: StateFormRequest):
    """Generate Nebraska Form 1040N"""
    return await generate_state_form_handler("NE", data)

@additional_states_router.post("/nj-1040")
async def generate_nj_1040(data: StateFormRequest):
    """Generate New Jersey Form NJ-1040"""
    return await generate_state_form_handler("NJ", data)

@additional_states_router.post("/nm-pit1")
async def generate_nm_pit1(data: StateFormRequest):
    """Generate New Mexico Form PIT-1"""
    return await generate_state_form_handler("NM", data)

@additional_states_router.post("/ny-it201")
async def generate_ny_it201(data: StateFormRequest):
    """Generate New York Form IT-201"""
    return await generate_state_form_handler("NY", data)

@additional_states_router.post("/oh-it1040")
async def generate_oh_it1040(data: StateFormRequest):
    """Generate Ohio Form IT-1040"""
    return await generate_state_form_handler("OH", data)

@additional_states_router.post("/ok-511")
async def generate_ok_511(data: StateFormRequest):
    """Generate Oklahoma Form 511"""
    return await generate_state_form_handler("OK", data)

@additional_states_router.post("/or-40")
async def generate_or_40(data: StateFormRequest):
    """Generate Oregon Form 40"""
    return await generate_state_form_handler("OR", data)

@additional_states_router.post("/pa-40")
async def generate_pa_40(data: StateFormRequest):
    """Generate Pennsylvania Form PA-40"""
    return await generate_state_form_handler("PA", data)

@additional_states_router.post("/ri-1040")
async def generate_ri_1040(data: StateFormRequest):
    """Generate Rhode Island Form RI-1040"""
    return await generate_state_form_handler("RI", data)

@additional_states_router.post("/sc-1040")
async def generate_sc_1040(data: StateFormRequest):
    """Generate South Carolina Form SC1040"""
    return await generate_state_form_handler("SC", data)

@additional_states_router.post("/ut-tc40")
async def generate_ut_tc40(data: StateFormRequest):
    """Generate Utah Form TC-40"""
    return await generate_state_form_handler("UT", data)

@additional_states_router.post("/va-760")
async def generate_va_760(data: StateFormRequest):
    """Generate Virginia Form 760"""
    return await generate_state_form_handler("VA", data)

@additional_states_router.post("/vt-in111")
async def generate_vt_in111(data: StateFormRequest):
    """Generate Vermont Form IN-111"""
    return await generate_state_form_handler("VT", data)

@additional_states_router.post("/wi-1")
async def generate_wi_1(data: StateFormRequest):
    """Generate Wisconsin Form 1"""
    return await generate_state_form_handler("WI", data)

@additional_states_router.post("/wv-it140")
async def generate_wv_it140(data: StateFormRequest):
    """Generate West Virginia Form IT-140"""
    return await generate_state_form_handler("WV", data)


# Generic handler
async def generate_state_form_handler(state_code: str, data: StateFormRequest):
    """Generic state form handler"""
    state_code = state_code.upper()
    
    # Check no-tax state
    if state_code in NO_TAX_STATES:
        withholding = data.state.withholding if data.state else 0
        return {
            "state": state_code,
            "state_name": NO_TAX_STATES[state_code]["name"],
            "has_income_tax": False,
            "state_tax": 0,
            "withholding": withholding,
            "refund": withholding,
            "amount_owed": 0,
            "message": NO_TAX_STATES[state_code]["notes"]
        }
    
    info = STATE_TAX_INFO.get(state_code)
    if not info:
        raise HTTPException(404, f"State {state_code} not supported")
    
    # Get data
    federal = data.federal.model_dump() if data.federal else {}
    state = data.state.model_dump() if data.state else {}
    deps = data.dependents or []
    num_deps = len(deps)
    
    filing_status = federal.get("filing_status", "single")
    federal_agi = federal.get("agi", 0)
    federal_tax = federal.get("federal_tax", 0)
    
    # Calculate
    state_agi = state.get("state_agi") or federal_agi
    
    # Federal tax deduction
    if info.get("allows_federal_deduction") and federal_tax > 0:
        fed_ded = min(federal_tax, state_agi * 0.5)
        state_agi = max(0, state_agi - fed_ded)
    
    std_ded = state.get("standard_deduction") or get_standard_deduction(state_code, filing_status)
    exemptions = state.get("exemptions") or get_exemptions(state_code, filing_status, num_deps)
    exempt_amount = info.get("exempt_amount", 0)
    
    taxable_income = state.get("taxable_income") or max(0, state_agi - std_ded - exemptions - exempt_amount)
    state_tax = state.get("state_tax") or calculate_state_tax(state_code, taxable_income, filing_status)
    
    credits = state.get("credits", 0)
    net_tax = max(0, state_tax - credits)
    
    withholding = state.get("withholding", 0)
    estimated = state.get("estimated_payments", 0)
    total_payments = withholding + estimated
    
    if total_payments > net_tax:
        refund = total_payments - net_tax
        amount_owed = 0
    else:
        refund = 0
        amount_owed = net_tax - total_payments
    
    return {
        "state": state_code,
        "state_name": info["name"],
        "form": info["form"],
        "tax_type": info["tax_type"],
        "tax_rate": f"{info['rate']*100:.2f}%" if info["tax_type"] == "flat" else "Progressive",
        "filing_status": filing_status,
        
        "federal_agi": round(federal_agi, 2),
        "state_agi": round(state_agi, 2),
        "standard_deduction": round(std_ded, 2),
        "exemptions": round(exemptions, 2),
        "taxable_income": round(taxable_income, 2),
        
        "state_tax": round(state_tax, 2),
        "credits": round(credits, 2),
        "net_tax": round(net_tax, 2),
        
        "withholding": round(withholding, 2),
        "estimated_payments": round(estimated, 2),
        "total_payments": round(total_payments, 2),
        
        "refund": round(refund, 2),
        "amount_owed": round(amount_owed, 2),
        
        "effective_rate": round((state_tax / federal_agi * 100) if federal_agi > 0 else 0, 2),
        "website": info.get("website", ""),
        "notes": info.get("notes", "")
    }


# =============================================================
# UTILITY ENDPOINTS
# =============================================================
@additional_states_router.get("/states/supported")
async def get_supported_states():
    """Get list of all 50 supported states"""
    tax_states = []
    for code, info in STATE_TAX_INFO.items():
        state_info = {"code": code, "name": info["name"], "form": info["form"], "tax_type": info["tax_type"]}
        if info["tax_type"] == "flat":
            state_info["rate"] = f"{info['rate']*100:.2f}%"
        tax_states.append(state_info)
    
    no_tax_list = [{"code": k, "name": v["name"]} for k, v in NO_TAX_STATES.items()]
    
    return {
        "total_tax_states": len(tax_states),
        "total_no_tax_states": len(no_tax_list),
        "total_supported": len(tax_states) + len(no_tax_list),
        "tax_states": sorted(tax_states, key=lambda x: x["name"]),
        "no_tax_states": sorted(no_tax_list, key=lambda x: x["name"])
    }


@additional_states_router.get("/states/calculate/{state_code}")
async def quick_calculate(
    state_code: str,
    federal_agi: float,
    filing_status: str = "single",
    num_dependents: int = 0,
    withholding: float = 0,
    federal_tax: float = 0
):
    """Quick tax calculation for any state"""
    state_code = state_code.upper()
    
    if state_code in NO_TAX_STATES:
        return {
            "state": state_code,
            "state_name": NO_TAX_STATES[state_code]["name"],
            "has_income_tax": False,
            "state_tax": 0,
            "refund": withholding,
            "amount_owed": 0,
            "message": NO_TAX_STATES[state_code]["notes"]
        }
    
    info = STATE_TAX_INFO.get(state_code)
    if not info:
        raise HTTPException(404, f"State {state_code} not supported")
    
    state_agi = federal_agi
    if info.get("allows_federal_deduction") and federal_tax > 0:
        state_agi = max(0, state_agi - min(federal_tax, state_agi * 0.5))
    
    std_ded = get_standard_deduction(state_code, filing_status)
    exemptions = get_exemptions(state_code, filing_status, num_dependents)
    exempt_amount = info.get("exempt_amount", 0)
    
    taxable_income = max(0, state_agi - std_ded - exemptions - exempt_amount)
    state_tax = calculate_state_tax(state_code, taxable_income, filing_status)
    
    return {
        "state": state_code,
        "state_name": info["name"],
        "form": info["form"],
        "tax_type": info["tax_type"],
        "tax_rate": f"{info['rate']*100:.2f}%" if info["tax_type"] == "flat" else "Progressive",
        "has_income_tax": True,
        "federal_agi": federal_agi,
        "state_agi": state_agi,
        "standard_deduction": std_ded,
        "exemptions": exemptions,
        "taxable_income": taxable_income,
        "state_tax": state_tax,
        "withholding": withholding,
        "refund": max(0, withholding - state_tax),
        "amount_owed": max(0, state_tax - withholding),
        "effective_rate": round((state_tax / federal_agi * 100) if federal_agi > 0 else 0, 2)
    }


@additional_states_router.get("/states/compare")
async def compare_states(
    federal_agi: float,
    filing_status: str = "single",
    num_dependents: int = 0
):
    """Compare tax across all 50 states"""
    results = []
    
    for code, info in STATE_TAX_INFO.items():
        state_agi = federal_agi
        std_ded = get_standard_deduction(code, filing_status)
        exemptions = get_exemptions(code, filing_status, num_dependents)
        exempt_amount = info.get("exempt_amount", 0)
        
        taxable_income = max(0, state_agi - std_ded - exemptions - exempt_amount)
        state_tax = calculate_state_tax(code, taxable_income, filing_status)
        
        results.append({
            "state": code,
            "state_name": info["name"],
            "has_income_tax": True,
            "tax_type": info["tax_type"],
            "state_tax": round(state_tax, 2),
            "effective_rate": round((state_tax / federal_agi * 100) if federal_agi > 0 else 0, 2)
        })
    
    for code, info in NO_TAX_STATES.items():
        results.append({
            "state": code,
            "state_name": info["name"],
            "has_income_tax": False,
            "tax_type": "none",
            "state_tax": 0,
            "effective_rate": 0
        })
    
    results.sort(key=lambda x: x["state_tax"])
    
    return {
        "federal_agi": federal_agi,
        "filing_status": filing_status,
        "num_dependents": num_dependents,
        "total_states": len(results),
        "lowest_tax": results[0],
        "highest_tax": results[-1],
        "comparison": results
    }