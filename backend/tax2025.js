// ============================================================
// SEED COMPLETE TAX KNOWLEDGE - ALL TOPICS
// Run: node seed-complete-tax.js
// ============================================================

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ai_tax';

// ============================================================
// COMPLETE TAX KNOWLEDGE DATABASE
// ============================================================
const completeKnowledge = [
  
  // ============================================================
  // CAPITAL GAINS (if not already added)
  // ============================================================
  {
    docId: "federal_capital_gains_2024",
    category: "income",
    topic: "capital gains tax rates long term short term stock crypto sale 2024",
    source: "IRS Publication 550",
    taxYear: 2024,
    jurisdiction: "federal",
    isActive: true,
    content: `2024 Capital Gains Tax Rates:

SHORT-TERM (held ≤ 1 year):
• Taxed as ordinary income (10% - 37%)

LONG-TERM (held > 1 year):
• 0%: Single up to $47,025 / MFJ up to $94,050
• 15%: Single $47,026-$518,900 / MFJ $94,051-$583,750
• 20%: Above those amounts

NET INVESTMENT INCOME TAX (NIIT):
• Additional 3.8% on investment income if AGI > $200,000 (single) or $250,000 (MFJ)

HOME SALE EXCLUSION:
• Up to $250,000 (single) or $500,000 (MFJ) tax-free
• Must live in home 2 of last 5 years

CRYPTOCURRENCY:
• Treated same as stocks - short-term or long-term rates apply`
  },

  // ============================================================
  // RETIREMENT CONTRIBUTIONS
  // ============================================================
  {
    docId: "federal_retirement_limits_2024",
    category: "retirement",
    topic: "401k ira roth contribution limits 2024 retirement savings",
    source: "IRS Notice 2023-75",
    taxYear: 2024,
    jurisdiction: "federal",
    isActive: true,
    content: `2024 Retirement Contribution Limits:

401(k), 403(b), TSP:
• Under 50: $23,000
• Age 50+: $30,500 (includes $7,500 catch-up)

TRADITIONAL/ROTH IRA:
• Under 50: $7,000
• Age 50+: $8,000 (includes $1,000 catch-up)

ROTH IRA Income Limits (to contribute):
• Single: $146,000-$161,000 phase-out
• MFJ: $230,000-$240,000 phase-out

TRADITIONAL IRA Deduction (if covered by workplace plan):
• Single: $77,000-$87,000 AGI phase-out
• MFJ: $123,000-$143,000 AGI phase-out

SEP IRA (Self-employed): Up to 25% of compensation, max $69,000
SIMPLE IRA: Under 50: $16,000 / Age 50+: $19,500`
  },

  {
    docId: "federal_retirement_limits_2025",
    category: "retirement",
    topic: "401k ira roth contribution limits 2025 retirement savings",
    source: "IRS Notice 2024-80",
    taxYear: 2025,
    jurisdiction: "federal",
    isActive: true,
    content: `2025 Retirement Contribution Limits:

401(k), 403(b), TSP:
• Under 50: $23,500 (+$500 from 2024)
• Age 50+: $31,000 (includes $7,500 catch-up)
• NEW! Ages 60-63: $34,750 (super catch-up of $11,250)

TRADITIONAL/ROTH IRA:
• Under 50: $7,000 (unchanged)
• Age 50+: $8,000 (unchanged)

ROTH IRA Income Limits:
• Single: $150,000-$165,000 phase-out
• MFJ: $236,000-$246,000 phase-out

SEP IRA: Up to 25% of compensation, max $70,000
SIMPLE IRA: Under 50: $16,500 / Age 50+: $20,000`
  },

  // ============================================================
  // FILING DEADLINES
  // ============================================================
  {
    docId: "federal_filing_deadlines_2024",
    category: "filing",
    topic: "tax deadline due date extension when file 2024 2025 april",
    source: "IRS",
    taxYear: 2024,
    jurisdiction: "federal",
    isActive: true,
    content: `2024 Tax Year Filing Deadlines:

INDIVIDUAL RETURNS (Form 1040):
• Due: April 15, 2025
• Extended: October 15, 2025

ESTIMATED TAXES (2025):
• Q1: April 15, 2025
• Q2: June 16, 2025
• Q3: September 15, 2025
• Q4: January 15, 2026

EXTENSION (Form 4868):
• Gives 6 extra months to FILE
• Does NOT extend time to PAY
• File by April 15 to avoid late filing penalty

LATE FILING PENALTY: 5% of unpaid tax per month, up to 25%
LATE PAYMENT PENALTY: 0.5% of unpaid tax per month, up to 25%

REFUND TIMELINE:
• E-file + direct deposit: Usually 21 days
• Paper return: 6-8 weeks`
  },

  // ============================================================
  // FILING STATUS GUIDE
  // ============================================================
  {
    docId: "filing_status_guide_2024",
    category: "filing",
    topic: "filing status single married jointly separately head household mfj mfs hoh which choose compare",
    source: "IRS Publication 501",
    taxYear: 2024,
    jurisdiction: "federal",
    isActive: true,
    content: `Filing Status Guide - Which to Choose:

SINGLE:
• Unmarried on Dec 31, 2024
• Standard deduction: $14,600

MARRIED FILING JOINTLY (MFJ):
• Married on Dec 31, 2024
• Combine all income
• Standard deduction: $29,200
• Usually BEST for married couples
• Both responsible for return

MARRIED FILING SEPARATELY (MFS):
• Married but file separate returns
• Standard deduction: $14,600 each
• Use when: spouse has debt, student loans (IBR), or separate liability needed
• LOSE many credits: EITC, education credits, adoption credit

HEAD OF HOUSEHOLD (HOH):
• Unmarried + paid >50% of home costs + qualifying person lived with you
• Standard deduction: $21,900
• Better tax rates than Single

Tip: If married, compare MFJ vs MFS. MFJ is usually better but not always!`
  },

  // ============================================================
  // SOCIAL SECURITY TAXATION
  // ============================================================
  {
    docId: "social_security_taxation_2024",
    category: "income",
    topic: "social security benefits taxable ss retirement income 2024",
    source: "IRS Publication 915",
    taxYear: 2024,
    jurisdiction: "federal",
    isActive: true,
    content: `When Social Security Benefits Are Taxable:

COMBINED INCOME = AGI + Nontaxable Interest + 50% of SS Benefits

SINGLE/HOH:
• Under $25,000: 0% taxable
• $25,000-$34,000: Up to 50% taxable
• Over $34,000: Up to 85% taxable

MARRIED FILING JOINTLY:
• Under $32,000: 0% taxable
• $32,000-$44,000: Up to 50% taxable
• Over $44,000: Up to 85% taxable

IMPORTANT:
• Maximum 85% of benefits can be taxed (never 100%)
• No state tax on SS in California
• Many retirees with only SS income owe $0 tax`
  },

  // ============================================================
  // HSA/FSA LIMITS
  // ============================================================
  {
    docId: "hsa_fsa_limits_2024",
    category: "deductions",
    topic: "hsa fsa health savings flexible spending account limits 2024",
    source: "IRS Rev. Proc. 2023-34",
    taxYear: 2024,
    jurisdiction: "federal",
    isActive: true,
    content: `2024 HSA & FSA Contribution Limits:

HEALTH SAVINGS ACCOUNT (HSA):
• Self-only coverage: $4,150
• Family coverage: $8,300
• Catch-up (55+): +$1,000
• Must have HDHP (High Deductible Health Plan)
• Triple tax advantage: deductible, grows tax-free, tax-free withdrawals

HSA-ELIGIBLE HDHP Requirements:
• Minimum deductible: $1,600 (self) / $3,200 (family)
• Maximum out-of-pocket: $8,050 (self) / $16,100 (family)

FLEXIBLE SPENDING ACCOUNT (FSA):
• Healthcare FSA: $3,200
• Dependent Care FSA: $5,000 ($2,500 if MFS)
• Use it or lose it (some plans allow $640 rollover)`
  },

  {
    docId: "hsa_fsa_limits_2025",
    category: "deductions",
    topic: "hsa fsa health savings flexible spending account limits 2025",
    source: "IRS Rev. Proc. 2024-40",
    taxYear: 2025,
    jurisdiction: "federal",
    isActive: true,
    content: `2025 HSA & FSA Contribution Limits:

HEALTH SAVINGS ACCOUNT (HSA):
• Self-only coverage: $4,300 (+$150 from 2024)
• Family coverage: $8,550 (+$250 from 2024)
• Catch-up (55+): +$1,000

FLEXIBLE SPENDING ACCOUNT (FSA):
• Healthcare FSA: $3,300 (+$100)
• Dependent Care FSA: $5,000 (unchanged)
• Rollover limit: $660`
  },

  // ============================================================
  // CRYPTOCURRENCY
  // ============================================================
  {
    docId: "cryptocurrency_taxes_2024",
    category: "income",
    topic: "cryptocurrency crypto bitcoin ethereum tax reporting 2024 nft",
    source: "IRS Notice 2014-21",
    taxYear: 2024,
    jurisdiction: "federal",
    isActive: true,
    content: `Cryptocurrency Tax Rules 2024:

CRYPTO IS PROPERTY (not currency):
• Every sale, trade, or spend is a taxable event

TAXABLE EVENTS:
• Selling crypto for USD
• Trading crypto for crypto (e.g., BTC → ETH)
• Spending crypto (buying goods)
• Receiving crypto as payment
• Mining/staking rewards (ordinary income)
• Airdrops (ordinary income at FMV)
• NFT sales

NOT TAXABLE:
• Buying crypto with USD
• Transferring between your own wallets
• Gifting (gift tax rules apply if large)

TAX RATES:
• Short-term (held ≤ 1 year): Ordinary income rates
• Long-term (held > 1 year): 0%, 15%, or 20%

REPORTING:
• Form 8949 + Schedule D for sales
• Schedule 1 for mining/staking income
• Form 1040 asks: "Did you receive, sell, exchange...virtual currency?"

Keep detailed records of every transaction!`
  },

  // ============================================================
  // STUDENT LOAN INTEREST
  // ============================================================
  {
    docId: "student_loan_interest_2024",
    category: "deductions",
    topic: "student loan interest deduction education 2024",
    source: "IRS Publication 970",
    taxYear: 2024,
    jurisdiction: "federal",
    isActive: true,
    content: `Student Loan Interest Deduction 2024:

MAXIMUM DEDUCTION: $2,500

INCOME LIMITS (MAGI):
• Single: $75,000-$90,000 phase-out
• MFJ: $155,000-$185,000 phase-out

REQUIREMENTS:
• Interest on qualified education loan
• You are legally obligated to pay
• Filing status is not MFS
• Not claimed as dependent

Above-the-line deduction (don't need to itemize)
Form 1098-E shows interest paid.`
  },

  // ============================================================
  // REFUND TIMELINE
  // ============================================================
  {
    docId: "refund_timeline_2024",
    category: "filing",
    topic: "refund when how long get receive check direct deposit where my 2024",
    source: "IRS",
    taxYear: 2024,
    jurisdiction: "federal",
    isActive: true,
    content: `When Will You Get Your Refund?

E-FILE + DIRECT DEPOSIT:
• IRS accepts in: 24-48 hours
• Refund issued: Usually within 21 days
• Fastest method!

E-FILE + CHECK:
• Refund issued: 21 days + mail time

PAPER RETURN:
• Processing: 6-8 weeks

DELAYS MAY OCCUR IF:
• Return has errors
• Claiming EITC or ACTC (held until mid-Feb by law)
• Identity verification needed
• Amended return (16+ weeks)

CHECK REFUND STATUS:
• IRS "Where's My Refund?" tool at irs.gov
• Available 24 hours after e-file accepted
• Or call IRS: 1-800-829-1954

DIRECT DEPOSIT TIP:
• Can split refund into up to 3 accounts using Form 8888`
  },

  // ============================================================
  // PAYMENT PLANS
  // ============================================================
  {
    docId: "irs_payment_plans_2024",
    category: "filing",
    topic: "payment plan installment agreement cant pay owe irs 2024",
    source: "IRS",
    taxYear: 2024,
    jurisdiction: "federal",
    isActive: true,
    content: `IRS Payment Options If You Can't Pay:

SHORT-TERM PAYMENT PLAN (≤180 days):
• No setup fee online
• Must owe under $100,000

LONG-TERM INSTALLMENT AGREEMENT:
• Owe $50,000 or less: Apply online
• Setup fee: $31 (online) or $107 (paper)
• Low-income: Fee may be waived

OFFER IN COMPROMISE (OIC):
• Settle for less than you owe
• Must prove can't pay full amount

PENALTY RELIEF:
• First-time penalty abatement available
• Must have clean 3-year history

IMPORTANT:
• FILE ON TIME even if you can't pay!
• Late filing penalty (5%/month) is much worse than late payment (0.5%/month)`
  },

  // ============================================================
  // AUDIT TRIGGERS
  // ============================================================
  {
    docId: "audit_red_flags_2024",
    category: "filing",
    topic: "audit risk red flags avoid trigger irs 2024 chances",
    source: "IRS",
    taxYear: 2024,
    jurisdiction: "federal",
    isActive: true,
    content: `Common Audit Red Flags (How to Avoid):

HIGH-RISK TRIGGERS:
• High income (>$500k audited more)
• Unreported income (IRS matches W-2, 1099)
• Large charitable deductions (>3% of income)
• Home office deduction
• Schedule C losses year after year
• Cash-heavy business
• Round numbers ($10,000 exactly looks suspicious)
• 100% business use of vehicle

TO REDUCE AUDIT RISK:
• Report ALL income
• Keep receipts for all deductions
• Don't exaggerate
• File electronically

Overall audit rate is only ~0.4% - most returns are never audited.`
  },

  // ============================================================
  // CALIFORNIA VS FEDERAL
  // ============================================================
  {
    docId: "california_vs_federal_2024",
    category: "filing",
    topic: "california federal differences state tax ca 2024 compare",
    source: "California FTB",
    taxYear: 2024,
    jurisdiction: "ca",
    isActive: true,
    content: `California vs Federal Tax Differences:

STANDARD DEDUCTION:
• Federal Single: $14,600 | CA Single: $5,363

TAX RATES:
• Federal max: 37% | CA max: 13.3%

SOCIAL SECURITY:
• Federal: May be taxable | CA: Not taxed

CAPITAL GAINS:
• Federal: 0/15/20% | CA: Taxed as ordinary income!

CALIFORNIA-ONLY CREDITS:
• CalEITC (earned income credit)
• YCTC (young child tax credit)
• Renter's Credit

Must file both returns if CA resident with income.`
  },

  // ============================================================
  // AMENDED RETURNS
  // ============================================================
  {
    docId: "amended_returns_2024",
    category: "filing",
    topic: "amended return fix mistake correct error 1040x 2024",
    source: "IRS",
    taxYear: 2024,
    jurisdiction: "federal",
    isActive: true,
    content: `Amended Tax Returns (Form 1040-X):

WHEN TO AMEND:
• Forgot income
• Claimed wrong filing status
• Incorrect deductions/credits
• Math errors (IRS usually fixes these automatically)

DON'T AMEND FOR:
• Math errors (IRS corrects)
• Missing forms (IRS will request)

HOW TO FILE:
• Use Form 1040-X
• Can now e-file (previously paper only)
• File within 3 years of original due date

PROCESSING TIME:
• Up to 16 weeks (can take longer)
• Check status: "Where's My Amended Return?" tool

REFUND FROM AMENDMENT:
• Wait until original return is processed
• Can claim refund for up to 3 years back

OWE MORE?
• Pay as soon as possible to minimize interest/penalties`
  },

  // ============================================================
  // ESTIMATED TAX PENALTIES
  // ============================================================
  {
    docId: "estimated_tax_penalty_2024",
    category: "filing",
    topic: "estimated tax penalty underpayment quarterly avoid 2024",
    source: "IRS Form 2210",
    taxYear: 2024,
    jurisdiction: "federal",
    isActive: true,
    content: `Estimated Tax & Underpayment Penalties:

WHO MUST PAY QUARTERLY:
• Self-employed
• Gig workers (1099)
• Investors with significant gains
• Anyone who will owe $1,000+ when filing

2024 QUARTERLY DUE DATES:
• Q1: April 15, 2024
• Q2: June 17, 2024
• Q3: September 16, 2024
• Q4: January 15, 2025

AVOID PENALTY BY PAYING (whichever is less):
• 90% of current year tax, OR
• 100% of prior year tax (110% if AGI > $150,000)

SAFE HARBOR:
• Pay at least 100% of last year's tax (110% if high income)
• No penalty even if you owe more

PENALTY RATE: ~8% annually (changes quarterly)

Form 2210 calculates penalty. W-2 employees can increase withholding instead.`
  },

  // ============================================================
  // GIFT TAX
  // ============================================================
  {
    docId: "gift_tax_2024",
    category: "other",
    topic: "gift tax exclusion annual lifetime limit 2024 give money",
    source: "IRS",
    taxYear: 2024,
    jurisdiction: "federal",
    isActive: true,
    content: `Gift Tax Rules 2024:

ANNUAL EXCLUSION:
• $18,000 per recipient per year (no tax, no reporting)
• Married couple: $36,000 per recipient (gift splitting)

LIFETIME EXEMPTION:
• $13.61 million (2024)
• Gifts over annual exclusion count against this
• Same exemption shared with estate tax

NO GIFT TAX ON:
• Gifts to spouse (unlimited)
• Tuition paid directly to school
• Medical bills paid directly to provider
• Gifts to charity
• Gifts to political organizations

WHO PAYS GIFT TAX?
• The GIVER, not the recipient
• Recipient never owes income tax on gifts received

REPORTING:
• File Form 709 if gift exceeds $18,000 to one person
• Even if no tax due (tracks lifetime exemption)`
  },

  {
    docId: "gift_tax_2025",
    category: "other",
    topic: "gift tax exclusion annual lifetime limit 2025",
    source: "IRS",
    taxYear: 2025,
    jurisdiction: "federal",
    isActive: true,
    content: `Gift Tax Rules 2025:

ANNUAL EXCLUSION:
• $19,000 per recipient per year (+$1,000 from 2024)
• Married couple: $38,000 per recipient

LIFETIME EXEMPTION:
• $13.99 million (2025)

Same rules apply - tuition/medical directly paid are unlimited.`
  },

  // ============================================================
  // ESTATE TAX
  // ============================================================
  {
    docId: "estate_tax_2024",
    category: "other",
    topic: "estate tax inheritance death exemption 2024",
    source: "IRS",
    taxYear: 2024,
    jurisdiction: "federal",
    isActive: true,
    content: `Estate Tax 2024:

EXEMPTION:
• $13.61 million per person
• Married couple: $27.22 million (with portability)

TAX RATE:
• 40% on amounts over exemption

WHO FILES:
• Only estates over exemption must file Form 706
• Less than 0.2% of estates owe federal estate tax

STEP-UP IN BASIS:
• Inherited assets get new cost basis at death
• Major tax benefit for heirs

PORTABILITY:
• Unused exemption can transfer to surviving spouse
• Must file Form 706 to elect (even if no tax due)

STATE ESTATE TAX:
• CA has NO state estate tax
• Some states do (WA, OR, MA, NY, etc.)

NOTE: Exemption may drop to ~$7 million after 2025 if law expires!`
  },

  // ============================================================
  // FOREIGN INCOME / FBAR
  // ============================================================
  {
    docId: "foreign_income_fbar_2024",
    category: "income",
    topic: "foreign income fbar fatca overseas bank account 2024",
    source: "IRS & FinCEN",
    taxYear: 2024,
    jurisdiction: "federal",
    isActive: true,
    content: `Foreign Income & Bank Account Reporting:

US CITIZENS/RESIDENTS:
• Must report WORLDWIDE income
• Even if you live abroad

FOREIGN EARNED INCOME EXCLUSION:
• Up to $126,500 (2024) can be excluded
• Must live abroad 330+ days or be bona fide resident

FBAR (FinCEN Form 114):
• Required if foreign accounts exceed $10,000 at any time
• Due April 15 (auto-extended to October 15)
• Penalties: Up to $12,500 per violation (non-willful)
• File online at BSA E-Filing

FATCA (Form 8938):
• Required if foreign assets exceed:
  - $50,000 end of year (single in US)
  - $200,000 end of year (single abroad)
• File with tax return

FOREIGN TAX CREDIT:
• Avoid double taxation
• Claim credit for taxes paid to other countries
• Form 1116`
  },

  // ============================================================
  // AMT (Alternative Minimum Tax)
  // ============================================================
  {
    docId: "amt_2024",
    category: "other",
    topic: "alternative minimum tax amt 2024 iso stock options",
    source: "IRS",
    taxYear: 2024,
    jurisdiction: "federal",
    isActive: true,
    content: `Alternative Minimum Tax (AMT) 2024:

WHAT IS AMT?
• Parallel tax system to ensure high earners pay minimum tax
• Must calculate both regular tax and AMT, pay higher amount

2024 AMT EXEMPTION:
• Single: $85,700 (phases out at $609,350)
• MFJ: $133,300 (phases out at $1,218,700)

AMT RATE:
• 26% on first $220,700
• 28% above that

WHO IS AFFECTED:
• High income earners
• People with large ISO stock option exercises
• High state/local taxes (not deductible under AMT)
• Large miscellaneous deductions

TRIGGER ITEMS:
• Incentive Stock Options (ISO) bargain element
• State/local taxes (not deductible for AMT)
• Home equity loan interest (if not used for home)
• Private activity bond interest

Most people don't owe AMT due to higher exemptions since 2018.`
  },

  // ============================================================
  // GAMBLING INCOME
  // ============================================================
  {
    docId: "gambling_income_2024",
    category: "income",
    topic: "gambling income winnings losses lottery casino 2024",
    source: "IRS Publication 525",
    taxYear: 2024,
    jurisdiction: "federal",
    isActive: true,
    content: `Gambling Income & Losses:

ALL WINNINGS ARE TAXABLE:
• Casinos, lotteries, raffles, horse racing
• Sports betting, online gambling
• Fair market value of prizes (cars, trips)

REPORTING THRESHOLDS (W-2G issued):
• Slot machines: $1,200+
• Bingo/Keno: $1,500+
• Poker tournaments: $5,000+
• Other gambling: $600+ and 300x wager

WITHHOLDING:
• 24% federal withholding if over threshold
• May need to pay more if in higher bracket

DEDUCTING LOSSES:
• Can deduct losses up to amount of winnings
• Must itemize (Schedule A)
• Keep detailed records: dates, locations, amounts

PROFESSIONAL GAMBLERS:
• Report on Schedule C
• Can deduct business expenses
• Subject to self-employment tax

STATE TAX:
• California taxes gambling income as ordinary income`
  },

  // ============================================================
  // RENTAL PROPERTY
  // ============================================================
  {
    docId: "rental_property_2024",
    category: "income",
    topic: "rental property income landlord depreciation expenses 2024",
    source: "IRS Publication 527",
    taxYear: 2024,
    jurisdiction: "federal",
    isActive: true,
    content: `Rental Property Income & Expenses:

RENTAL INCOME INCLUDES:
• Rent payments
• Advance rent
• Security deposits kept
• Tenant-paid expenses

DEDUCTIBLE EXPENSES:
• Mortgage interest
• Property taxes
• Insurance
• Repairs & maintenance
• Property management fees
• Advertising
• Travel to property
• Professional fees
• Utilities (if you pay)

DEPRECIATION:
• Residential property: 27.5 years
• Must depreciate (it's not optional!)
• Land is not depreciable

PASSIVE LOSS RULES:
• Generally can't deduct losses against W-2 income
• Exception: Up to $25,000 if AGI < $100,000 and actively participate
• Phases out $100,000-$150,000 AGI

FORM:
• Schedule E (Supplemental Income)

REAL ESTATE PROFESSIONAL:
• Can deduct losses without limit if you qualify
• Requires 750+ hours in real estate activities`
  },

  // ============================================================
  // DIVORCE & TAXES
  // ============================================================
  {
    docId: "divorce_taxes_2024",
    category: "filing",
    topic: "divorce alimony child support taxes 2024 separated",
    source: "IRS Publication 504",
    taxYear: 2024,
    jurisdiction: "federal",
    isActive: true,
    content: `Divorce & Separation Tax Rules:

FILING STATUS:
• Marital status on Dec 31 determines filing status
• Divorced by Dec 31 = file as Single or HOH
• Separated but not divorced = still Married

ALIMONY (for divorces AFTER 2018):
• Payer: NOT deductible
• Recipient: NOT taxable income
• Major change from pre-2019 divorces

ALIMONY (for divorces BEFORE 2019):
• Payer: IS deductible
• Recipient: IS taxable income

CHILD SUPPORT:
• Never deductible by payer
• Never taxable to recipient
• Not alimony

CLAIMING CHILDREN:
• Custodial parent claims child (general rule)
• Can transfer with Form 8332
• Only ONE parent can claim each child

PROPERTY TRANSFERS:
• Transfers between spouses = no tax (during marriage or incident to divorce)
• Receiving spouse takes original cost basis

QDROs (Retirement accounts):
• Can split 401k/IRA without penalty via court order`
  },

  // ============================================================
  // MILITARY TAX BENEFITS
  // ============================================================
  {
    docId: "military_taxes_2024",
    category: "other",
    topic: "military tax benefits combat pay veteran 2024",
    source: "IRS Publication 3",
    taxYear: 2024,
    jurisdiction: "federal",
    isActive: true,
    content: `Military Tax Benefits 2024:

COMBAT PAY:
• Excluded from income (tax-free)
• Can still count for EITC (your choice)

MOVING EXPENSES:
• Military can still deduct (civilians cannot since 2018)
• Includes household goods, travel, lodging

DEADLINE EXTENSIONS:
• Automatic extensions while in combat zone
• 180 days after leaving + time remaining when entered

RESIDENCY:
• Can keep home state residency while stationed elsewhere
• Spouse can use same state (MSRRA)

SPECIAL BENEFITS:
• Uniform deduction (if required to wear and can't wear off-duty)
• Travel between duty stations
• Reserve travel (>100 miles)

TSP (Thrift Savings Plan):
• Similar to 401k for military/federal employees
• 2024 limit: $23,000

FREE TAX PREP:
• MilTax (free software for military)
• VITA sites on bases`
  },

  // ============================================================
  // DEPENDENT RULES
  // ============================================================
  {
    docId: "dependent_rules_2024",
    category: "filing",
    topic: "dependent rules who claim child qualifying relative 2024",
    source: "IRS Publication 501",
    taxYear: 2024,
    jurisdiction: "federal",
    isActive: true,
    content: `Who Can You Claim as a Dependent?

QUALIFYING CHILD:
• Relationship: Your child, stepchild, sibling, or their descendant
• Age: Under 19, or under 24 if student, or any age if disabled
• Residency: Lived with you more than half the year
• Support: Didn't provide more than half their own support
• Joint Return: Didn't file joint return (exception if only for refund)

QUALIFYING RELATIVE:
• Relationship: Lives with you all year OR is related (parent, sibling, etc.)
• Income: Gross income under $5,050 (2024)
• Support: You provide more than half their support
• Not claimed by someone else

WHO CANNOT BE CLAIMED:
• Married person filing joint return
• Someone who claims their own dependent
• Someone who is a qualifying child of another taxpayer

TIE-BREAKER RULES (if multiple people could claim):
1. Parent wins over non-parent
2. Parent with custody wins
3. Higher AGI parent wins
4. If not parent, higher AGI wins`
  },

  // ============================================================
  // PREMIUM TAX CREDIT (ACA)
  // ============================================================
  {
    docId: "premium_tax_credit_2024",
    category: "credits",
    topic: "premium tax credit ptc aca obamacare health insurance marketplace 2024",
    source: "IRS",
    taxYear: 2024,
    jurisdiction: "federal",
    isActive: true,
    content: `Premium Tax Credit (ACA/Obamacare) 2024:

WHAT IS IT?
• Tax credit to help pay health insurance premiums
• For coverage through Healthcare.gov marketplace

WHO QUALIFIES:
• Household income 100%-400% of Federal Poverty Level
• No access to affordable employer coverage
• Not eligible for Medicare/Medicaid
• File tax return (even if no income)

2024 INCOME LIMITS (for premium assistance):
• No upper limit through 2025 (enhanced rules)
• Previously was 400% FPL (~$60,000 single)

HOW IT WORKS:
• Can receive in advance (reduces monthly premium)
• Or claim when filing return
• If advance was too much, must repay
• If advance was too little, get refund

FORM 8962:
• Required to reconcile credit
• Use Form 1095-A from marketplace

IMPORTANT:
• Must file return to get credit
• Report life changes (income, family size) to marketplace`
  },

  // ============================================================
  // ELECTRIC VEHICLE CREDIT
  // ============================================================
  {
    docId: "ev_credit_2024",
    category: "credits",
    topic: "electric vehicle ev credit car tesla 2024 clean vehicle",
    source: "IRS",
    taxYear: 2024,
    jurisdiction: "federal",
    isActive: true,
    content: `Electric Vehicle Tax Credits 2024:

NEW CLEAN VEHICLE CREDIT:
• Up to $7,500 for qualifying new EVs
• Vehicle must be assembled in North America
• Battery components/minerals requirements

INCOME LIMITS (MAGI):
• Single: $150,000
• HOH: $225,000
• MFJ: $300,000

PRICE LIMITS:
• SUVs, Vans, Trucks: $80,000 MSRP
• Other vehicles: $55,000 MSRP

USED EV CREDIT:
• Up to $4,000 or 30% of price (whichever is less)
• Vehicle must be at least 2 years old
• Price must be $25,000 or less
• Income limits lower: $75,000 single, $150,000 MFJ

NEW IN 2024:
• Can transfer credit to dealer (instant rebate at purchase)
• Previously had to wait until filing return

Check IRS list of qualifying vehicles at fueleconomy.gov`
  },

  // ============================================================
  // ENERGY CREDITS
  // ============================================================
  {
    docId: "energy_credits_2024",
    category: "credits",
    topic: "energy credit solar panel home improvement 2024 25c 25d",
    source: "IRS",
    taxYear: 2024,
    jurisdiction: "federal",
    isActive: true,
    content: `Home Energy Tax Credits 2024:

RESIDENTIAL CLEAN ENERGY CREDIT (25D):
• 30% of cost for:
  - Solar panels
  - Solar water heaters
  - Wind turbines
  - Geothermal heat pumps
  - Battery storage (3+ kWh)
• No annual limit
• Unused credit carries forward

ENERGY EFFICIENT HOME IMPROVEMENT CREDIT (25C):
• 30% of cost, up to $1,200/year for:
  - Insulation
  - Windows/doors ($250/door, $600 windows max)
  - Central AC ($600 max)
  - Water heaters ($600 max)
  - Electrical panel ($600 max)
• Heat pumps: Up to $2,000/year (separate limit)
• Must meet efficiency standards

REQUIREMENTS:
• Must be your primary residence (25C)
• Keep manufacturer certifications
• File Form 5695

These credits are NOT refundable (only reduce tax owed).`
  },

  // ============================================================
  // QBI DEDUCTION (199A)
  // ============================================================
  {
    docId: "qbi_deduction_2024",
    category: "deductions",
    topic: "qbi qualified business income deduction 199a self employed 2024",
    source: "IRS",
    taxYear: 2024,
    jurisdiction: "federal",
    isActive: true,
    content: `Qualified Business Income (QBI) Deduction 2024:

WHAT IS IT?
• Deduct up to 20% of qualified business income
• For pass-through businesses: sole proprietors, S-corps, partnerships

WHO QUALIFIES:
• Self-employed (Schedule C)
• S-corp shareholders
• Partners in partnerships
• Some rental income
• NOT for W-2 wages or C-corps

INCOME LIMITS (full deduction):
• Single: Under $191,950
• MFJ: Under $383,900

PHASE-OUT RANGE:
• Single: $191,950 - $241,950
• MFJ: $383,900 - $483,900

SPECIFIED SERVICE BUSINESSES (SSTB):
• Doctors, lawyers, accountants, consultants, athletes
• Limited deduction if income above threshold
• No deduction if income above phase-out

CALCULATION:
• Generally: 20% of QBI
• May be limited by W-2 wages or property basis
• Use Form 8995 or 8995-A`
  },

  // ============================================================
  // SECTION 179 DEPRECIATION
  // ============================================================
  {
    docId: "section_179_2024",
    category: "deductions",
    topic: "section 179 depreciation expense business equipment 2024",
    source: "IRS",
    taxYear: 2024,
    jurisdiction: "federal",
    isActive: true,
    content: `Section 179 Expensing 2024:

WHAT IS IT?
• Deduct full cost of business equipment in year 1
• Instead of depreciating over several years

2024 LIMITS:
• Maximum deduction: $1,220,000
• Phase-out begins: $3,050,000 in purchases
• Completely phased out at $4,270,000

QUALIFYING PROPERTY:
• Equipment and machinery
• Computers and software
• Office furniture
• Vehicles (with limits)
• Some building improvements

VEHICLE LIMITS:
• SUVs over 6,000 lbs: $30,500 max
• Regular vehicles: Much lower (~$12,000)

REQUIREMENTS:
• Must be used >50% for business
• Must be placed in service during tax year
• Can't create a loss (limited to business income)

BONUS DEPRECIATION (Alternative):
• 60% bonus depreciation in 2024 (was 100% through 2022)
• 40% in 2025, 20% in 2026, then 0%`
  },

  // ============================================================
  // NANNY TAX
  // ============================================================
  {
    docId: "nanny_tax_2024",
    category: "other",
    topic: "nanny tax household employee babysitter caregiver 2024",
    source: "IRS Publication 926",
    taxYear: 2024,
    jurisdiction: "federal",
    isActive: true,
    content: `Nanny Tax / Household Employee Taxes 2024:

WHEN IT APPLIES:
• Pay household worker $2,700+ in 2024
• Includes: nannies, housekeepers, caregivers, gardeners
• Does NOT include independent contractors

YOUR RESPONSIBILITIES:
• Withhold Social Security & Medicare (7.65%)
• Pay employer share (7.65%)
• Withhold federal income tax (if requested)
• File Schedule H with your return
• Provide W-2 to employee by Jan 31

TOTALS:
• Employee pays: 7.65%
• Employer pays: 7.65%
• Total: 15.3% (same as self-employment tax)

FUTA (Federal Unemployment):
• 6% on first $7,000 of wages
• Credit reduces to 0.6% if state paid

NOT REQUIRED IF:
• Worker is your spouse
• Worker is under 18 and student
• Worker is your parent (with exceptions)

COMMON MISTAKE:
• Paying cash "under the table" - this is tax evasion!`
  },

  // ============================================================
  // HOBBY VS BUSINESS
  // ============================================================
  {
    docId: "hobby_vs_business_2024",
    category: "self_employment",
    topic: "hobby vs business loss profit motive 2024",
    source: "IRS",
    taxYear: 2024,
    jurisdiction: "federal",
    isActive: true,
    content: `Hobby vs Business: What's the Difference?

WHY IT MATTERS:
• Business: Can deduct losses against other income
• Hobby: Cannot deduct losses at all (since 2018)

IRS FACTORS:
1. Do you carry on activity in businesslike manner?
2. Does time/effort indicate profit intent?
3. Do you depend on income from activity?
4. Are losses due to startup or circumstances?
5. Have you changed methods to improve profitability?
6. Do you have knowledge/advisors for success?
7. Have you made profit in similar activities before?
8. Does activity make profit some years?
9. Can you expect future profit from asset appreciation?

SAFE HARBOR:
• Profit in 3 of last 5 years = presumed business
• Horse activities: 2 of last 7 years

HOBBY INCOME:
• Still must report as income!
• But can't deduct expenses
• Report on Schedule 1, Line 8

TIP: Keep detailed records, create business plan, maintain separate bank account.`
  },

  // ============================================================
  // TAX FORMS GUIDE
  // ============================================================
  {
    docId: "tax_forms_guide_2024",
    category: "filing",
    topic: "tax forms w2 1099 guide what is which form 2024",
    source: "IRS",
    taxYear: 2024,
    jurisdiction: "federal",
    isActive: true,
    content: `Common Tax Forms Explained:

INCOME FORMS YOU RECEIVE:
• W-2: Wages from employer
• 1099-NEC: Self-employment/freelance income ($600+)
• 1099-INT: Interest from bank ($10+)
• 1099-DIV: Dividends ($10+)
• 1099-B: Stock/investment sales
• 1099-R: Retirement distributions
• 1099-G: Unemployment, state refunds
• 1099-MISC: Other income (rent, prizes)
• 1099-K: Payment apps (Venmo, PayPal) - $5,000+ in 2024
• 1099-SA: HSA distributions
• SSA-1099: Social Security benefits
• 1098: Mortgage interest paid
• 1098-T: Tuition paid
• 1098-E: Student loan interest

FORMS YOU FILE:
• 1040: Main individual return
• Schedule A: Itemized deductions
• Schedule B: Interest/dividends over $1,500
• Schedule C: Self-employment income
• Schedule D: Capital gains/losses
• Schedule E: Rental income
• Schedule SE: Self-employment tax
• Form 8949: Stock sale details
• Form 8889: HSA
• Form 8962: Premium Tax Credit`
  },

  // ============================================================
  // CALIFORNIA CALEITC DETAILS
  // ============================================================
  {
    docId: "caleitc_details_2024",
    category: "credits",
    topic: "caleitc california earned income tax credit yctc 2024",
    source: "California FTB",
    taxYear: 2024,
    jurisdiction: "ca",
    isActive: true,
    content: `California Earned Income Tax Credit (CalEITC) 2024:

MAXIMUM CREDITS:
• No children: ~$310
• 1 child: ~$935
• 2 children: ~$1,550
• 3+ children: ~$1,750

INCOME LIMIT:
• Earned income under ~$31,000

REQUIREMENTS:
• California resident
• Earned income (wages, self-employment)
• File CA return
• SSN or ITIN for taxpayer, spouse, and children
• Not claimed as dependent

YOUNG CHILD TAX CREDIT (YCTC):
• Additional ~$1,200 per child under 6
• Must qualify for CalEITC

COMBINED WITH FEDERAL:
• Can get BOTH CalEITC AND federal EITC
• Example: 2 kids, low income could get:
  - Federal EITC: ~$6,960
  - CalEITC: ~$1,550
  - YCTC: ~$2,400 (if under 6)
  - Total: ~$10,910!

ITIN filers can claim CalEITC (unlike federal EITC).`
  },

  // ============================================================
  // WASH SALE RULE
  // ============================================================
  {
    docId: "wash_sale_rule_2024",
    category: "income",
    topic: "wash sale rule stock loss 30 days 2024",
    source: "IRS Publication 550",
    taxYear: 2024,
    jurisdiction: "federal",
    isActive: true,
    content: `Wash Sale Rule:

WHAT IS IT?
• Can't deduct loss if you buy "substantially identical" security within 30 days

THE 30-DAY WINDOW:
• 30 days BEFORE the sale
• 30 days AFTER the sale
• Total: 61-day window

EXAMPLE:
• Sell Stock ABC on Jan 15 for $5,000 loss
• Buy Stock ABC on Jan 30 (within 30 days)
• Loss is DISALLOWED

WHAT HAPPENS TO DISALLOWED LOSS:
• Added to cost basis of new shares
• You'll get the benefit when you eventually sell

APPLIES TO:
• Stocks
• Bonds
• Mutual funds
• ETFs
• Options
• Cryptocurrency (currently unclear, IRS may apply)

DOES NOT APPLY:
• Gains (only losses)
• Selling in taxable account, buying in IRA
• Different taxpayers (you sell, spouse buys)

TIP: Wait 31+ days to rebuy, or buy different (but similar) security.`
  },

  // ============================================================
  // SOCIAL SECURITY WAGE BASE
  // ============================================================
  {
    docId: "social_security_wage_base_2024",
    category: "income",
    topic: "social security wage base limit fica 2024",
    source: "Social Security Administration",
    taxYear: 2024,
    jurisdiction: "federal",
    isActive: true,
    content: `Social Security & Medicare Tax 2024:

SOCIAL SECURITY TAX:
• Rate: 6.2% (employee) + 6.2% (employer) = 12.4%
• Wage Base: $168,600 (max earnings subject to SS tax)
• Maximum SS Tax: $10,453.20 (employee share)

MEDICARE TAX:
• Rate: 1.45% (employee) + 1.45% (employer) = 2.9%
• No wage limit (all earnings taxed)

ADDITIONAL MEDICARE TAX:
• Rate: 0.9% on earnings over:
  - $200,000 (single)
  - $250,000 (MFJ)
• Only employee pays (no employer match)

SELF-EMPLOYED:
• Pay both shares: 15.3% total
• Can deduct 50% of SE tax
• Use Schedule SE

2025 CHANGES:
• SS Wage Base increases to $176,100
• Max SS Tax: $10,918.20`
  },

  {
    docId: "social_security_wage_base_2025",
    category: "income",
    topic: "social security wage base limit fica 2025",
    source: "Social Security Administration",
    taxYear: 2025,
    jurisdiction: "federal",
    isActive: true,
    content: `Social Security & Medicare Tax 2025:

SOCIAL SECURITY TAX:
• Rate: 6.2% + 6.2% = 12.4%
• Wage Base: $176,100 (+$7,500 from 2024)
• Maximum SS Tax: $10,918.20 (employee share)

MEDICARE TAX:
• Rate: 1.45% + 1.45% = 2.9%
• No wage limit

ADDITIONAL MEDICARE TAX:
• 0.9% on earnings over $200,000 (single) / $250,000 (MFJ)

SELF-EMPLOYED: 15.3% total`
  },

  // ============================================================
  // 529 PLANS
  // ============================================================
  {
    docId: "529_plans_2024",
    category: "other",
    topic: "529 plan education savings college tax free 2024",
    source: "IRS",
    taxYear: 2024,
    jurisdiction: "federal",
    isActive: true,
    content: `529 Education Savings Plans 2024:

TAX BENEFITS:
• Contributions: Not federally deductible (some states allow)
• Growth: Tax-free
• Withdrawals: Tax-free if used for education

QUALIFIED EXPENSES:
• College tuition, fees, books, supplies
• Room and board (if at least half-time)
• K-12 tuition: Up to $10,000/year
• Student loan repayment: Up to $10,000 lifetime
• Apprenticeship programs

CONTRIBUTION LIMITS:
• No annual federal limit
• Lifetime limit varies by state (~$300,000-$500,000)
• Gift tax: Can contribute up to $18,000 without gift tax
• 5-year gift averaging: Up to $90,000 at once

NEW FOR 2024:
• Can roll unused 529 to Roth IRA
• Up to $35,000 lifetime
• 529 must be open 15+ years
• Subject to annual Roth IRA contribution limits

NON-QUALIFIED WITHDRAWALS:
• Earnings taxed as income
• 10% penalty on earnings`
  },

  // ============================================================
  // CALIFORNIA RENTER'S CREDIT
  // ============================================================
  {
    docId: "ca_renters_credit_2024",
    category: "credits",
    topic: "california renter credit rent 2024",
    source: "California FTB",
    taxYear: 2024,
    jurisdiction: "ca",
    isActive: true,
    content: `California Renter's Credit 2024:

CREDIT AMOUNT:
• Single: $60
• Married/HOH: $120

INCOME LIMITS:
• Single: $52,400 or less
• MFJ/HOH: $104,800 or less

REQUIREMENTS:
• California resident for full year
• Rented property as your principal residence
• Paid rent for at least half the year
• Not living rent-free or in property exempt from CA property tax
• Not claimed as dependent

NOT AVAILABLE IF:
• You own your home
• Live rent-free
• Income over limits
• Lived in tax-exempt housing

It's a small credit but easy to claim - don't miss it!`
  }
];

// ============================================================
// MAIN FUNCTION
// ============================================================
async function seedCompleteKnowledge() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected!\n');
    
    const db = mongoose.connection.db;
    const collection = db.collection('taxknowledges');
    
    let added = 0;
    let skipped = 0;
    let updated = 0;
    
    for (const doc of completeKnowledge) {
      // Check if already exists
      const existing = await collection.findOne({ docId: doc.docId });
      
      if (existing) {
        console.log(`⏭️  Skip: ${doc.docId} (exists)`);
        skipped++;
      } else {
        // Add timestamps
        doc.createdAt = new Date();
        doc.updatedAt = new Date();
        
        await collection.insertOne(doc);
        console.log(`✅ Added: ${doc.docId}`);
        added++;
      }
    }
    
    console.log('\n' + '═'.repeat(50));
    console.log('📊 SEED COMPLETE');
    console.log('═'.repeat(50));
    console.log(`✅ Added: ${added} documents`);
    console.log(`⏭️  Skipped: ${skipped} documents`);
    console.log(`📚 Total in script: ${completeKnowledge.length}`);
    
    // Show current count
    const total = await collection.countDocuments();
    console.log(`\n📊 Total documents in taxknowledges: ${total}`);
    
    // Show by category
    const categories = await collection.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]).toArray();
    
    console.log('\n📁 Documents by Category:');
    categories.forEach(cat => {
      console.log(`   ${cat._id || 'uncategorized'}: ${cat.count}`);
    });
    
    // Show by year
    const years = await collection.aggregate([
      { $group: { _id: '$taxYear', count: { $sum: 1 } } },
      { $sort: { _id: -1 } }
    ]).toArray();
    
    console.log('\n📅 Documents by Tax Year:');
    years.forEach(yr => {
      console.log(`   ${yr._id}: ${yr.count}`);
    });
    
    console.log('\n' + '═'.repeat(50));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run
seedCompleteKnowledge();