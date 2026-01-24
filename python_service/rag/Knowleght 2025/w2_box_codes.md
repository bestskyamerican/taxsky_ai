# W-2 Form Box-by-Box Explanation

## Overview
Form W-2 reports your annual wages and taxes withheld. Understanding each box helps with accurate tax filing.

---

## Main Boxes

### Box 1: Wages, Tips, Other Compensation
- **What it is**: Your TAXABLE income for federal income tax
- **Includes**: Salary, bonuses, commissions, tips
- **Excludes**: Pre-tax 401(k), health insurance premiums, HSA, FSA
- **Goes to**: Form 1040, Line 1a

### Box 2: Federal Income Tax Withheld
- **What it is**: Federal tax already paid through paycheck
- **Goes to**: Form 1040, Line 25a
- **Determines**: Refund or amount owed

### Box 3: Social Security Wages
- **What it is**: Wages subject to Social Security tax
- **Usually HIGHER than Box 1** because it includes 401(k)
- **2025 Cap**: $176,100 (no SS tax on wages above this)

### Box 4: Social Security Tax Withheld
- **Rate**: 6.2% of Box 3 (up to cap)
- **Max 2025**: $10,918.20 ($176,100 × 6.2%)

### Box 5: Medicare Wages and Tips
- **What it is**: Wages subject to Medicare tax
- **Usually equals Box 3** (no cap for Medicare)

### Box 6: Medicare Tax Withheld
- **Rate**: 1.45% of Box 5
- **Additional**: 0.9% on wages over $200k (single)

---

## Address & Identification Boxes

### Box a: Employee's SSN
- Your Social Security Number

### Box b: Employer's EIN
- Employer's tax ID (XX-XXXXXXX format)

### Box c: Employer's Name and Address
- Company name and address

### Box d: Control Number
- Internal tracking (not needed for filing)

### Box e & f: Employee's Name and Address
- Your name and address

---

## Box 12: Coded Items (VERY IMPORTANT!)

Box 12 uses letter codes for special items:

### Retirement Related
| Code | Description | Tax Treatment |
|------|-------------|---------------|
| **D** | 401(k) contributions | Pre-tax (not in Box 1) |
| **E** | 403(b) contributions | Pre-tax |
| **F** | 408(k)(6) SEP | Pre-tax |
| **G** | 457(b) contributions | Pre-tax |
| **H** | 501(c)(18)(D) | Pre-tax |
| **S** | SIMPLE 401(k) | Pre-tax |
| **AA** | Roth 401(k) | After-tax (in Box 1) |
| **BB** | Roth 403(b) | After-tax (in Box 1) |

### Insurance & Benefits
| Code | Description | Tax Treatment |
|------|-------------|---------------|
| **C** | Group-term life insurance > $50k | Taxable (in Box 1) |
| **DD** | Employer health insurance cost | Info only (not taxable) |
| **W** | HSA contributions (employer) | Pre-tax |

### Other Common Codes
| Code | Description |
|------|-------------|
| **P** | Moving expense reimbursement |
| **Q** | Nontaxable combat pay |
| **T** | Adoption benefits |
| **V** | Stock option income |
| **Y** | Deferrals under 409A |
| **Z** | Income under 409A (taxable) |

---

## Box 13: Checkboxes

| Checkbox | Meaning | Impact |
|----------|---------|--------|
| **Statutory employee** | Special worker category | File Schedule C |
| **Retirement plan** | Has 401k/403b/pension | Affects IRA deduction! |
| **Third-party sick pay** | Sick pay from insurance | Info only |

### ⚠️ IMPORTANT: Retirement Plan Checkbox
If this box is checked:
- You HAVE workplace retirement plan
- Traditional IRA deduction may be LIMITED
- Check income limits for IRA deduction

---

## State Boxes (15-20)

### Box 15: State/Employer's State ID
- State code (CA, TX, NY, etc.)
- Employer's state tax ID

### Box 16: State Wages
- Wages subject to state tax
- Usually equals Box 1

### Box 17: State Income Tax Withheld
- State tax already paid
- Goes to state tax return

### Box 18: Local Wages
- Wages subject to local/city tax

### Box 19: Local Income Tax
- Local tax withheld

### Box 20: Locality Name
- Name of local tax jurisdiction

---

## Box 14: Other

Employer can report various items here:
- State disability insurance (SDI)
- Union dues
- Uniform payments
- Health insurance (after-tax)
- Educational assistance

**Common California entries:**
- SDI (State Disability Insurance)
- CASDI / CA SDI
- CA PFL (Paid Family Leave)

---

## Common W-2 Math Relationships

### Box 1 vs Box 3
```
Box 3 (SS Wages) = Box 1 + Pre-tax deductions
                 = Box 1 + 401(k) + Health Insurance + HSA + FSA
```

### Example:
```
Gross Salary:           $121,000
401(k) (Box 12 Code D):  -$12,000
Health Insurance:         -$6,000
---------------------------------
Box 1 (Taxable):         $103,000
Box 3 (SS Wages):        $121,000
```

### Verify Tax Withholding
```
Box 4 ≈ Box 3 × 6.2% (up to $176,100)
Box 6 ≈ Box 5 × 1.45%
```

---

## Red Flags to Check

1. **Box 1 > Box 3**: Unusual - investigate
2. **Box 4 > $10,918.20**: Overpaid SS (claim refund if multiple jobs)
3. **No Box 2 amount**: No federal withholding - may owe taxes
4. **Box 12 Code D > $23,500**: Over 401(k) limit!
5. **Wrong SSN in Box a**: Contact employer immediately

---

## Multiple W-2s

If you have multiple jobs:
- Add all Box 1 amounts → Total wages
- Add all Box 2 amounts → Total federal withheld
- Check if Box 4 total > $10,918.20 (Social Security max)
  - If yes, claim excess on Form 1040!
