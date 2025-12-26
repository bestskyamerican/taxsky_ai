# tax_engine/ocr.py
# ============================================================
# COMPLETE OCR - ALL TAX FORMS (FIXED BOX 2 READING)
# ============================================================
import os
import json
import base64
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

def get_client():
    return OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# ============================================================
# W-2: Wages (FIXED - Accurate Box 2 Reading)
# ============================================================
W2_PROMPT = """You are a HIGHLY ACCURATE W-2 OCR expert. Extract ALL fields from this W-2 form.

⚠️ W-2 BOX LAYOUT - READ EACH BOX INDIVIDUALLY:

TOP ROW (Boxes 1-6):
┌─────────────┬─────────────┬─────────────┬─────────────┐
│ Box 1       │ Box 2       │ Box 3       │ Box 4       │
│ Wages,tips  │ Fed income  │ Social Sec  │ Social Sec  │
│ other comp  │ tax WITH-   │ wages       │ tax WITH-   │
│             │ HELD        │             │ HELD        │
├─────────────┼─────────────┼─────────────┼─────────────┤
│ Box 5       │ Box 6       │ Box 7       │ Box 8       │
│ Medicare    │ Medicare    │ SS tips     │ Allocated   │
│ wages       │ tax WITH-   │             │ tips        │
│             │ HELD        │             │             │
└─────────────┴─────────────┴─────────────┴─────────────┘

BOTTOM ROW (Boxes 15-17):
┌─────────────┬─────────────┬─────────────┐
│ Box 15      │ Box 16      │ Box 17      │
│ State       │ State wages │ State tax   │
│ (CA, NY..)  │             │ WITHHELD    │
└─────────────┴─────────────┴─────────────┘

⚠️ CRITICAL - BOX 2 (federal_income_tax_withheld):
- This is ONLY the value in Box 2 - "Federal income tax withheld"
- DO NOT add Box 4 (SS tax) or Box 6 (Medicare tax) to this!
- DO NOT add Box 17 (State tax) to this!
- Box 2 is typically 10-25% of Box 1 wages
- Example: If wages=$58,612, Box 2 is typically $2,000-$15,000

⚠️ VALIDATION RULES:
- Box 1, Box 3, Box 5 are usually EQUAL or very similar
- Box 4 (SS tax) ≈ 6.2% of Box 3 (SS wages)
- Box 6 (Medicare tax) ≈ 1.45% of Box 5 (Medicare wages)
- Box 2 is SEPARATE from Box 4 and Box 6!

⚠️ COMMON OCR MISTAKES TO AVOID:
- Adding Box 2 + Box 4 + Box 6 together (WRONG!)
- Adding Box 2 + Box 17 together (WRONG!)
- Reading Box 4 value as Box 2 (WRONG!)
- "2768.00" misread as "276.80" (dropped digit)

Return ONLY valid JSON:
{
  "employer_name": "",
  "employer_address": "",
  "employer_city": "",
  "employer_state": "",
  "employer_zip": "",
  "employer_ein": "",
  "employee_name": "",
  "employee_first_name": "",
  "employee_last_name": "",
  "employee_address": "",
  "employee_city": "",
  "employee_state": "",
  "employee_zip": "",
  "employee_ssn": "",
  "control_number": "",
  "wages_tips_other_comp": 0,
  "federal_income_tax_withheld": 0,
  "social_security_wages": 0,
  "social_security_tax_withheld": 0,
  "medicare_wages": 0,
  "medicare_tax_withheld": 0,
  "state": "",
  "state_id": "",
  "state_wages": 0,
  "state_income_tax": 0,
  "local_wages": 0,
  "local_income_tax": 0,
  "locality_name": ""
}

IMPORTANT: 
- Use these EXACT field names
- Numbers only (no $ or commas)
- federal_income_tax_withheld = ONLY Box 2 value!
- Double-check Box 2 is NOT a sum of multiple boxes!"""

# ============================================================
# 1099-NEC: Non-Employee Compensation (Freelance)
# ============================================================
NEC_PROMPT = """Extract ALL fields from this 1099-NEC form.

⚠️ READ NUMBERS CAREFULLY - Don't drop any digits!

Return ONLY valid JSON:
{
  "payer_name": "",
  "payer_address": "",
  "payer_tin": "",
  "recipient_name": "",
  "recipient_address": "",
  "recipient_tin": "",
  "nonemployee_compensation": 0,
  "federal_income_tax_withheld": 0,
  "state": "",
  "state_tax_withheld": 0,
  "state_income": 0,
  "payer_state_number": ""
}
Use these EXACT field names. Numbers only (no $ or commas)."""

# ============================================================
# 1099-INT: Interest Income
# ============================================================
INT_PROMPT = """Extract ALL fields from this 1099-INT form.

⚠️ READ NUMBERS CAREFULLY - Don't drop any digits!

Return ONLY valid JSON:
{
  "payer_name": "",
  "payer_address": "",
  "payer_tin": "",
  "recipient_name": "",
  "recipient_address": "",
  "recipient_tin": "",
  "interest_income": 0,
  "early_withdrawal_penalty": 0,
  "interest_on_us_savings_bonds": 0,
  "federal_income_tax_withheld": 0,
  "investment_expenses": 0,
  "foreign_tax_paid": 0,
  "tax_exempt_interest": 0,
  "private_activity_bond_interest": 0,
  "market_discount": 0,
  "bond_premium": 0,
  "state": "",
  "state_tax_withheld": 0
}
Use these EXACT field names. Numbers only (no $ or commas)."""

# ============================================================
# 1099-DIV: Dividends
# ============================================================
DIV_PROMPT = """Extract ALL fields from this 1099-DIV form.

⚠️ READ NUMBERS CAREFULLY - Don't drop any digits!

Return ONLY valid JSON:
{
  "payer_name": "",
  "payer_address": "",
  "payer_tin": "",
  "recipient_name": "",
  "recipient_address": "",
  "recipient_tin": "",
  "ordinary_dividends": 0,
  "qualified_dividends": 0,
  "capital_gain_distributions": 0,
  "unrecaptured_1250_gain": 0,
  "section_1202_gain": 0,
  "collectibles_gain": 0,
  "nondividend_distributions": 0,
  "federal_income_tax_withheld": 0,
  "section_199a_dividends": 0,
  "investment_expenses": 0,
  "foreign_tax_paid": 0,
  "foreign_country": "",
  "cash_liquidation": 0,
  "noncash_liquidation": 0,
  "exempt_interest_dividends": 0,
  "private_activity_bond_interest": 0,
  "state": "",
  "state_tax_withheld": 0
}
Use these EXACT field names. Numbers only (no $ or commas)."""

# ============================================================
# 1099-B: Stock Sales / Capital Gains
# ============================================================
B_PROMPT = """Extract ALL fields from this 1099-B form.

⚠️ READ NUMBERS CAREFULLY - Don't drop any digits!

Return ONLY valid JSON:
{
  "payer_name": "",
  "payer_tin": "",
  "recipient_name": "",
  "recipient_tin": "",
  "description": "",
  "date_acquired": "",
  "date_sold": "",
  "proceeds": 0,
  "cost_basis": 0,
  "gain_or_loss": 0,
  "short_term_gain": 0,
  "long_term_gain": 0,
  "wash_sale_loss_disallowed": 0,
  "federal_income_tax_withheld": 0,
  "type": "covered",
  "box_checked": ""
}
Use these EXACT field names. Numbers only (no $ or commas)."""

# ============================================================
# 1099-R: Retirement Distributions
# ============================================================
R_PROMPT = """Extract ALL fields from this 1099-R form.

⚠️ READ NUMBERS CAREFULLY - Don't drop any digits!

Return ONLY valid JSON:
{
  "payer_name": "",
  "payer_address": "",
  "payer_tin": "",
  "recipient_name": "",
  "recipient_address": "",
  "recipient_tin": "",
  "gross_distribution": 0,
  "taxable_amount": 0,
  "taxable_amount_not_determined": false,
  "total_distribution": false,
  "capital_gain": 0,
  "federal_income_tax_withheld": 0,
  "employee_contributions": 0,
  "net_unrealized_appreciation": 0,
  "distribution_code": "",
  "ira_sep_simple": false,
  "first_year_roth": "",
  "state": "",
  "state_tax_withheld": 0,
  "state_distribution": 0,
  "local_tax_withheld": 0,
  "local_distribution": 0,
  "locality_name": ""
}
Use these EXACT field names. Numbers only (no $ or commas)."""

# ============================================================
# 1099-G: Government Payments (Unemployment)
# ============================================================
G_PROMPT = """Extract ALL fields from this 1099-G form.

⚠️ READ NUMBERS CAREFULLY - Don't drop any digits!

Return ONLY valid JSON:
{
  "payer_name": "",
  "payer_address": "",
  "payer_tin": "",
  "recipient_name": "",
  "recipient_address": "",
  "recipient_tin": "",
  "unemployment_compensation": 0,
  "state_local_tax_refunds": 0,
  "box_2_year": "",
  "federal_income_tax_withheld": 0,
  "rtaa_payments": 0,
  "taxable_grants": 0,
  "agriculture_payments": 0,
  "state": "",
  "state_id": "",
  "state_income_tax_withheld": 0
}
Use these EXACT field names. Numbers only (no $ or commas)."""

# ============================================================
# 1099-MISC: Miscellaneous Income
# ============================================================
MISC_PROMPT = """Extract ALL fields from this 1099-MISC form.

⚠️ READ NUMBERS CAREFULLY - Don't drop any digits!

Return ONLY valid JSON:
{
  "payer_name": "",
  "payer_address": "",
  "payer_tin": "",
  "recipient_name": "",
  "recipient_address": "",
  "recipient_tin": "",
  "rents": 0,
  "royalties": 0,
  "other_income": 0,
  "federal_income_tax_withheld": 0,
  "fishing_boat_proceeds": 0,
  "medical_payments": 0,
  "substitute_payments": 0,
  "crop_insurance": 0,
  "gross_attorney_proceeds": 0,
  "fish_purchased": 0,
  "section_409a_deferrals": 0,
  "excess_golden_parachute": 0,
  "nonqualified_deferred_comp": 0,
  "state": "",
  "state_tax_withheld": 0,
  "state_income": 0
}
Use these EXACT field names. Numbers only (no $ or commas)."""

# ============================================================
# 1099-K: Payment Card / Third Party Network
# ============================================================
K_PROMPT = """Extract ALL fields from this 1099-K form.

⚠️ READ NUMBERS CAREFULLY - Don't drop any digits!

Return ONLY valid JSON:
{
  "pse_name": "",
  "pse_address": "",
  "pse_tin": "",
  "payee_name": "",
  "payee_address": "",
  "payee_tin": "",
  "gross_amount": 0,
  "card_not_present": 0,
  "jan": 0, "feb": 0, "mar": 0, "apr": 0, "may": 0, "jun": 0,
  "jul": 0, "aug": 0, "sep": 0, "oct": 0, "nov": 0, "dec": 0,
  "federal_income_tax_withheld": 0,
  "state": "",
  "state_tax_withheld": 0
}
Use these EXACT field names. Numbers only (no $ or commas)."""

# ============================================================
# SSA-1099: Social Security Benefits
# ============================================================
SSA_PROMPT = """Extract ALL fields from this SSA-1099 form.

⚠️ READ NUMBERS CAREFULLY - Don't drop any digits!

Return ONLY valid JSON:
{
  "recipient_name": "",
  "recipient_address": "",
  "recipient_ssn": "",
  "total_benefits_paid": 0,
  "benefits_repaid": 0,
  "net_benefits": 0,
  "federal_income_tax_withheld": 0,
  "description": ""
}
Use these EXACT field names. Numbers only (no $ or commas)."""

# ============================================================
# W-2G: Gambling Winnings
# ============================================================
W2G_PROMPT = """Extract ALL fields from this W-2G form.

⚠️ READ NUMBERS CAREFULLY - Don't drop any digits!

Return ONLY valid JSON:
{
  "payer_name": "",
  "payer_address": "",
  "payer_tin": "",
  "winner_name": "",
  "winner_address": "",
  "winner_tin": "",
  "gross_winnings": 0,
  "federal_income_tax_withheld": 0,
  "type_of_wager": "",
  "date_won": "",
  "transaction": "",
  "race": "",
  "winnings_from_identical_wagers": 0,
  "state": "",
  "state_tax_withheld": 0,
  "state_winnings": 0,
  "local_tax_withheld": 0,
  "local_winnings": 0,
  "locality_name": ""
}
Use these EXACT field names. Numbers only (no $ or commas)."""

# ============================================================
# 1098: Mortgage Interest
# ============================================================
MORTGAGE_PROMPT = """Extract ALL fields from this 1098 form.

⚠️ READ NUMBERS CAREFULLY - Don't drop any digits!

Return ONLY valid JSON:
{
  "lender_name": "",
  "lender_address": "",
  "lender_tin": "",
  "borrower_name": "",
  "borrower_address": "",
  "borrower_ssn": "",
  "mortgage_interest_received": 0,
  "outstanding_principal": 0,
  "origination_date": "",
  "refund_of_overpaid_interest": 0,
  "mortgage_insurance_premiums": 0,
  "points_paid": 0,
  "property_address": ""
}
Use these EXACT field names. Numbers only (no $ or commas)."""

# ============================================================
# 1098-T: Tuition Statement
# ============================================================
T_PROMPT = """Extract ALL fields from this 1098-T form.

⚠️ READ NUMBERS CAREFULLY - Don't drop any digits!

Return ONLY valid JSON:
{
  "school_name": "",
  "school_address": "",
  "school_tin": "",
  "student_name": "",
  "student_address": "",
  "student_ssn": "",
  "payments_received": 0,
  "scholarships_grants": 0,
  "adjustments_prior_year": 0,
  "scholarships_adjustments_prior_year": 0,
  "half_time_student": false,
  "graduate_student": false
}
Use these EXACT field names. Numbers only (no $ or commas)."""

# ============================================================
# 1098-E: Student Loan Interest
# ============================================================
E_PROMPT = """Extract ALL fields from this 1098-E form.

⚠️ READ NUMBERS CAREFULLY - Don't drop any digits!

Return ONLY valid JSON:
{
  "lender_name": "",
  "lender_address": "",
  "lender_tin": "",
  "borrower_name": "",
  "borrower_address": "",
  "borrower_ssn": "",
  "student_loan_interest_received": 0
}
Use these EXACT field names. Numbers only (no $ or commas)."""

# ============================================================
# AUTO-DETECT FORM TYPE
# ============================================================
AUTO_DETECT_PROMPT = """Look at this tax form image and identify what type of form it is.

Respond with ONLY one of these form types:
- W-2
- W-2G
- 1099-NEC
- 1099-INT
- 1099-DIV
- 1099-B
- 1099-R
- 1099-G
- 1099-MISC
- 1099-K
- SSA-1099
- 1098
- 1098-T
- 1098-E
- UNKNOWN

Return ONLY the form type, nothing else."""

# ============================================================
# W-2 VALIDATION FUNCTION (IMPROVED)
# ============================================================
def validate_w2_numbers(data: dict) -> dict:
    """
    Validate W-2 numbers and auto-correct obvious errors.
    FIXED: Better detection of Box 2 errors (combined values)
    """
    try:
        wages = float(data.get("wages_tips_other_comp", 0) or 0)
        ss_wages = float(data.get("social_security_wages", 0) or 0)
        medicare_wages = float(data.get("medicare_wages", 0) or 0)
        fed_withheld = float(data.get("federal_income_tax_withheld", 0) or 0)
        ss_tax = float(data.get("social_security_tax_withheld", 0) or 0)
        medicare_tax = float(data.get("medicare_tax_withheld", 0) or 0)
        state_tax = float(data.get("state_income_tax", 0) or 0)
        
        warnings = []
        corrections = []
        
        # ============================================================
        # CHECK 1: If SS wages >> wages, wages might be wrong
        # ============================================================
        if ss_wages > 0 and wages > 0 and ss_wages > wages * 5:
            print(f"⚠️ VALIDATION: wages ({wages}) << ss_wages ({ss_wages}). Correcting...")
            data["wages_tips_other_comp"] = ss_wages
            wages = ss_wages
            corrections.append(f"Corrected wages to {ss_wages}")
        
        # ============================================================
        # CHECK 2: If medicare wages >> wages, wages might be wrong
        # ============================================================
        if medicare_wages > 0 and wages > 0 and medicare_wages > wages * 5:
            print(f"⚠️ VALIDATION: wages ({wages}) << medicare_wages ({medicare_wages}). Correcting...")
            data["wages_tips_other_comp"] = medicare_wages
            wages = medicare_wages
            corrections.append(f"Corrected wages to {medicare_wages}")
        
        # ============================================================
        # CHECK 3: Validate SS tax is ~6.2% of SS wages
        # ============================================================
        expected_ss_tax = 0
        if ss_wages > 0:
            expected_ss_tax = ss_wages * 0.062
            if ss_tax > 0 and abs(ss_tax - expected_ss_tax) < 50:
                # SS tax is valid - use it to validate other numbers
                if abs(wages - ss_wages) > 1000 and wages < ss_wages:
                    print(f"⚠️ VALIDATION: SS tax validates ss_wages ({ss_wages}), correcting wages from {wages}")
                    data["wages_tips_other_comp"] = ss_wages
                    wages = ss_wages
                    corrections.append(f"Wages corrected based on SS tax validation")
        
        # ============================================================
        # CHECK 4: Validate Medicare tax is ~1.45% of Medicare wages
        # ============================================================
        expected_medicare_tax = 0
        if medicare_wages > 0:
            expected_medicare_tax = medicare_wages * 0.0145
        
        # ============================================================
        # CHECK 5: Federal withheld CANNOT equal SS tax + Medicare tax + anything
        # This catches the bug where GPT combines boxes!
        # ============================================================
        if fed_withheld > 0 and ss_tax > 0 and medicare_tax > 0:
            combined_taxes = ss_tax + medicare_tax
            combined_with_state = combined_taxes + state_tax
            
            # Check if fed_withheld looks like a combination
            if abs(fed_withheld - combined_taxes) < 100:
                print(f"⚠️ VALIDATION ERROR: fed_withheld ({fed_withheld}) ≈ SS tax + Medicare tax ({combined_taxes})")
                print(f"   This is WRONG! Box 2 should be ONLY federal income tax withheld.")
                warnings.append(f"Federal withheld ({fed_withheld}) appears to be SS+Medicare tax sum - needs manual verification!")
            
            if abs(fed_withheld - combined_with_state) < 100:
                print(f"⚠️ VALIDATION ERROR: fed_withheld ({fed_withheld}) ≈ SS + Medicare + State ({combined_with_state})")
                warnings.append(f"Federal withheld appears to be sum of multiple taxes - needs manual verification!")
            
            # Check if fed_withheld includes SS tax
            if fed_withheld > ss_tax and abs(fed_withheld - ss_tax - expected_fed) < 500:
                print(f"⚠️ VALIDATION: fed_withheld might include SS tax")
                
        # ============================================================
        # CHECK 6: Federal withheld sanity check (percentage of wages)
        # ============================================================
        if wages > 0 and fed_withheld > 0:
            ratio = fed_withheld / wages
            if ratio > 0.35:  # More than 35% withheld is unusual
                warnings.append(f"Federal withheld ({fed_withheld}) is {ratio*100:.1f}% of wages - verify Box 2!")
                print(f"⚠️ VALIDATION: fed_withheld ({fed_withheld}) is {ratio*100:.1f}% of wages - SUSPICIOUS!")
            elif ratio < 0.005 and wages > 30000:  # Less than 0.5% for decent wages
                warnings.append(f"Federal withheld ({fed_withheld}) seems very low - verify!")
        
        # ============================================================
        # CHECK 7: If fed_withheld > wages * 0.25, it's likely wrong
        # (Very few people have >25% federal withholding)
        # ============================================================
        if wages > 0 and fed_withheld > wages * 0.25:
            # Check if subtracting SS+Medicare gives a reasonable number
            possible_correct = fed_withheld - ss_tax - medicare_tax
            if possible_correct > 0 and possible_correct < wages * 0.25:
                print(f"⚠️ VALIDATION: Correcting fed_withheld from {fed_withheld} to {possible_correct}")
                print(f"   (Subtracting SS tax {ss_tax} and Medicare tax {medicare_tax})")
                data["federal_income_tax_withheld"] = round(possible_correct, 2)
                corrections.append(f"Federal withheld corrected from {fed_withheld} to {possible_correct} (removed SS+Medicare)")
        
        # Store validation results
        if warnings:
            data["_validation_warnings"] = warnings
            print(f"⚠️ W-2 Validation Warnings: {warnings}")
        if corrections:
            data["_validation_corrections"] = corrections
            print(f"✅ W-2 Validation Corrections: {corrections}")
        
        return data
        
    except Exception as e:
        print(f"Validation error: {e}")
        return data

# ============================================================
# EXTRACTION FUNCTIONS
# ============================================================
def get_prompt_for_form(form_type):
    """Get the appropriate prompt for a form type."""
    prompts = {
        'W-2': W2_PROMPT,
        'W2': W2_PROMPT,
        'W-2G': W2G_PROMPT,
        'W2G': W2G_PROMPT,
        '1099-NEC': NEC_PROMPT,
        '1099NEC': NEC_PROMPT,
        '1099-INT': INT_PROMPT,
        '1099INT': INT_PROMPT,
        '1099-DIV': DIV_PROMPT,
        '1099DIV': DIV_PROMPT,
        '1099-B': B_PROMPT,
        '1099B': B_PROMPT,
        '1099-R': R_PROMPT,
        '1099R': R_PROMPT,
        '1099-G': G_PROMPT,
        '1099G': G_PROMPT,
        '1099-MISC': MISC_PROMPT,
        '1099MISC': MISC_PROMPT,
        '1099-K': K_PROMPT,
        '1099K': K_PROMPT,
        'SSA-1099': SSA_PROMPT,
        'SSA1099': SSA_PROMPT,
        '1098': MORTGAGE_PROMPT,
        '1098-T': T_PROMPT,
        '1098T': T_PROMPT,
        '1098-E': E_PROMPT,
        '1098E': E_PROMPT,
    }
    return prompts.get(form_type, W2_PROMPT)

async def detect_form_type(base64_img):
    """Auto-detect the form type from an image."""
    client = get_client()
    
    completion = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": AUTO_DETECT_PROMPT},
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/png;base64,{base64_img}",
                            "detail": "low"
                        }
                    }
                ]
            }
        ],
        temperature=0.1,
        max_tokens=50
    )
    
    form_type = completion.choices[0].message.content.strip()
    return form_type

async def extract_form(base64_img, form_type=None):
    """Extract data from a tax form image."""
    client = get_client()
    
    # Auto-detect if not specified
    if not form_type or form_type == 'AUTO':
        form_type = await detect_form_type(base64_img)
        print(f"[OCR] Auto-detected form type: {form_type}")
    
    # Get the appropriate prompt
    prompt = get_prompt_for_form(form_type)
    
    completion = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/png;base64,{base64_img}",
                            "detail": "high"
                        }
                    }
                ]
            }
        ],
        temperature=0.1,
        max_tokens=2000
    )
    
    raw = completion.choices[0].message.content
    raw = raw.replace("```json", "").replace("```", "").strip()
    
    try:
        data = json.loads(raw)
        
        # Validate W-2 numbers
        if form_type in ['W-2', 'W2']:
            print(f"[OCR] Raw W-2 data before validation:")
            print(f"      wages: {data.get('wages_tips_other_comp')}")
            print(f"      federal_withheld: {data.get('federal_income_tax_withheld')}")
            print(f"      ss_tax: {data.get('social_security_tax_withheld')}")
            print(f"      medicare_tax: {data.get('medicare_tax_withheld')}")
            print(f"      state_tax: {data.get('state_income_tax')}")
            
            data = validate_w2_numbers(data)
            
            print(f"[OCR] W-2 data after validation:")
            print(f"      federal_withheld: {data.get('federal_income_tax_withheld')}")
        
        return {"form_type": form_type, "data": data}
    except json.JSONDecodeError as e:
        return {"form_type": form_type, "error": str(e), "raw": raw}

# ============================================================
# SPECIFIC FORM EXTRACTORS (backward compatibility)
# ============================================================
async def extract_w2_backend(base64_img):
    result = await extract_form(base64_img, 'W-2')
    return result.get('data', {})

async def extract_1099_backend(formType, base64_img):
    result = await extract_form(base64_img, formType)
    return result.get('data', {})

async def extract_1098_backend(formType, base64_img):
    result = await extract_form(base64_img, formType)
    return result.get('data', {})

# ============================================================
# SYNC VERSIONS
# ============================================================
def extract_w2(base64_img):
    import asyncio
    return asyncio.run(extract_w2_backend(base64_img))

def extract_1099(formType, base64_img):
    import asyncio
    return asyncio.run(extract_1099_backend(formType, base64_img))

def extract_any(base64_img, form_type=None):
    import asyncio
    return asyncio.run(extract_form(base64_img, form_type))