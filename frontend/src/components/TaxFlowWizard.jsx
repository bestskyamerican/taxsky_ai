import React, { useState, useEffect } from 'react';

// Step icons
const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M13.5 4.5L6.5 11.5L3 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const ArrowRight = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <path d="M4 10H16M16 10L11 5M16 10L11 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const ArrowLeft = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <path d="M16 10H4M4 10L9 5M4 10L9 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const DocumentIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const UploadIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M17 8L12 3L7 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 3V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const CreditCardIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <rect x="1" y="4" width="22" height="16" rx="2" stroke="currentColor" strokeWidth="2"/>
    <path d="M1 10H23" stroke="currentColor" strokeWidth="2"/>
  </svg>
);

const ShieldCheckIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path d="M12 22C12 22 20 18 20 12V5L12 2L4 5V12C4 18 12 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M9 12L11 14L15 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// Main App Component
export default function TaxWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    // Personal Info
    firstName: '',
    middleInitial: '',
    lastName: '',
    ssn: '',
    spouseFirstName: '',
    spouseLastName: '',
    spouseSsn: '',
    filingStatus: 'single',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    dateOfBirth: '',
    occupation: '',
    
    // Income
    w2Forms: [{ employer: '', wages: '', fedWithheld: '' }],
    form1099Int: [{ payer: '', amount: '' }],
    form1099Div: [{ payer: '', ordinary: '', qualified: '' }],
    form1099Misc: [],
    otherIncome: '',
    
    // Deductions
    deductionType: 'standard',
    mortgageInterest: '',
    propertyTaxes: '',
    charitableDonations: '',
    medicalExpenses: '',
    stateLocalTaxes: '',
    
    // Bank Info
    bankRouting: '',
    bankAccount: '',
    accountType: 'checking',
    
    // Uploaded docs
    uploadedDocs: [],
    
    // Signature
    signatureDate: '',
    pin: '',
  });

  const [calculated, setCalculated] = useState({
    totalIncome: 0,
    adjustedGrossIncome: 0,
    standardDeduction: 15000,
    taxableIncome: 0,
    totalTax: 0,
    totalWithheld: 0,
    refundOrOwed: 0,
  });

  // Calculate taxes whenever income/deductions change
  useEffect(() => {
    calculateTaxes();
  }, [formData.w2Forms, formData.form1099Int, formData.form1099Div, formData.deductionType, 
      formData.mortgageInterest, formData.propertyTaxes, formData.charitableDonations, 
      formData.filingStatus]);

  const calculateTaxes = () => {
    // Sum W-2 wages
    const w2Income = formData.w2Forms.reduce((sum, w2) => sum + (parseFloat(w2.wages) || 0), 0);
    const w2Withheld = formData.w2Forms.reduce((sum, w2) => sum + (parseFloat(w2.fedWithheld) || 0), 0);
    
    // Sum 1099-INT
    const interestIncome = formData.form1099Int.reduce((sum, f) => sum + (parseFloat(f.amount) || 0), 0);
    
    // Sum 1099-DIV
    const dividendIncome = formData.form1099Div.reduce((sum, f) => 
      sum + (parseFloat(f.ordinary) || 0) + (parseFloat(f.qualified) || 0), 0);
    
    const totalIncome = w2Income + interestIncome + dividendIncome + (parseFloat(formData.otherIncome) || 0);
    const adjustedGrossIncome = totalIncome;
    
    // Determine deduction
    let deduction = 0;
    if (formData.deductionType === 'standard') {
      deduction = formData.filingStatus === 'married-joint' ? 30000 : 15000;
    } else {
      deduction = (parseFloat(formData.mortgageInterest) || 0) +
                  (parseFloat(formData.propertyTaxes) || 0) +
                  (parseFloat(formData.charitableDonations) || 0) +
                  (parseFloat(formData.medicalExpenses) || 0) +
                  (parseFloat(formData.stateLocalTaxes) || 0);
    }
    
    const taxableIncome = Math.max(0, adjustedGrossIncome - deduction);
    
    // Simple tax calculation (2025 brackets approximation)
    let tax = 0;
    if (taxableIncome <= 11600) {
      tax = taxableIncome * 0.10;
    } else if (taxableIncome <= 47150) {
      tax = 1160 + (taxableIncome - 11600) * 0.12;
    } else if (taxableIncome <= 100525) {
      tax = 5426 + (taxableIncome - 47150) * 0.22;
    } else if (taxableIncome <= 191950) {
      tax = 17168.5 + (taxableIncome - 100525) * 0.24;
    } else if (taxableIncome <= 243725) {
      tax = 39110.5 + (taxableIncome - 191950) * 0.32;
    } else if (taxableIncome <= 609350) {
      tax = 55678.5 + (taxableIncome - 243725) * 0.35;
    } else {
      tax = 183647.25 + (taxableIncome - 609350) * 0.37;
    }
    
    const refundOrOwed = w2Withheld - tax;
    
    setCalculated({
      totalIncome,
      adjustedGrossIncome,
      standardDeduction: deduction,
      taxableIncome,
      totalTax: Math.round(tax),
      totalWithheld: w2Withheld,
      refundOrOwed: Math.round(refundOrOwed),
    });
  };

  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addW2 = () => {
    setFormData(prev => ({
      ...prev,
      w2Forms: [...prev.w2Forms, { employer: '', wages: '', fedWithheld: '' }]
    }));
  };

  const updateW2 = (index, field, value) => {
    setFormData(prev => {
      const newW2s = [...prev.w2Forms];
      newW2s[index] = { ...newW2s[index], [field]: value };
      return { ...prev, w2Forms: newW2s };
    });
  };

  const add1099Int = () => {
    setFormData(prev => ({
      ...prev,
      form1099Int: [...prev.form1099Int, { payer: '', amount: '' }]
    }));
  };

  const update1099Int = (index, field, value) => {
    setFormData(prev => {
      const newForms = [...prev.form1099Int];
      newForms[index] = { ...newForms[index], [field]: value };
      return { ...prev, form1099Int: newForms };
    });
  };

  // Pricing calculation
  const getPricing = () => {
    let basePrice = 0;
    let plan = 'Free';
    
    const hasW2 = formData.w2Forms.some(w => w.wages);
    const has1099Int = formData.form1099Int.some(f => f.amount);
    const has1099Div = formData.form1099Div.some(f => f.ordinary || f.qualified);
    const itemizes = formData.deductionType === 'itemized';
    
    if (!hasW2 && !has1099Int && !has1099Div) {
      plan = 'Free';
      basePrice = 0;
    } else if (hasW2 && !has1099Int && !has1099Div && !itemizes) {
      plan = 'Basic';
      basePrice = 29.99;
    } else if ((has1099Int || has1099Div) && !itemizes) {
      plan = 'Standard';
      basePrice = 49.99;
    } else {
      plan = 'Premium';
      basePrice = 79.99;
    }
    
    const stateReturn = 19.99;
    const total = basePrice + stateReturn;
    
    const formCount = {
      w2: formData.w2Forms.filter(w => w.wages).length,
      int: formData.form1099Int.filter(f => f.amount).length,
      div: formData.form1099Div.filter(f => f.ordinary || f.qualified).length,
    };
    
    return { plan, basePrice, stateReturn, total, formCount };
  };

  const steps = [
    { num: 1, title: 'Review Info', subtitle: 'Personal details' },
    { num: 2, title: 'Income', subtitle: 'W-2s & 1099s' },
    { num: 3, title: 'Deductions', subtitle: 'Standard or itemized' },
    { num: 4, title: 'Tax Summary', subtitle: 'Refund or owed' },
    { num: 5, title: 'Your Price', subtitle: 'Plan & pricing' },
    { num: 6, title: 'Upload Docs', subtitle: 'Supporting documents' },
    { num: 7, title: 'Sign & File', subtitle: 'Complete your return' },
  ];

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const formatSSN = (value) => {
    const cleaned = value.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{0,3})(\d{0,2})(\d{0,4})$/);
    if (match) {
      return [match[1], match[2], match[3]].filter(Boolean).join('-');
    }
    return value;
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <div style={styles.logo}>
            <div style={styles.logoIcon}>1040</div>
            <span style={styles.logoText}>TaxFlow</span>
          </div>
          <div style={styles.headerRight}>
            <span style={styles.yearBadge}>Tax Year 2025</span>
            <button style={styles.saveBtn}>Save & Exit</button>
          </div>
        </div>
      </header>

      {/* Progress Steps */}
      <div style={styles.progressContainer}>
        <div style={styles.progressInner}>
          {steps.map((step, idx) => (
            <div 
              key={step.num}
              style={{
                ...styles.stepItem,
                ...(currentStep === step.num ? styles.stepActive : {}),
                ...(currentStep > step.num ? styles.stepComplete : {}),
              }}
              onClick={() => currentStep > step.num && setCurrentStep(step.num)}
            >
              <div style={{
                ...styles.stepCircle,
                ...(currentStep === step.num ? styles.stepCircleActive : {}),
                ...(currentStep > step.num ? styles.stepCircleComplete : {}),
              }}>
                {currentStep > step.num ? <CheckIcon /> : step.num}
              </div>
              <div style={styles.stepText}>
                <div style={styles.stepTitle}>{step.title}</div>
                <div style={styles.stepSubtitle}>{step.subtitle}</div>
              </div>
              {idx < steps.length - 1 && (
                <div style={{
                  ...styles.stepConnector,
                  ...(currentStep > step.num ? styles.stepConnectorComplete : {}),
                }} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <main style={styles.main}>
        <div style={styles.content}>
          
          {/* Step 1: Personal Info */}
          {currentStep === 1 && (
            <div style={styles.stepContent}>
              <h1 style={styles.stepHeading}>Let's confirm your personal information</h1>
              <p style={styles.stepDescription}>We'll use this to prepare your federal tax return.</p>
              
              <div style={styles.card}>
                <h3 style={styles.cardTitle}>Your Information</h3>
                <div style={styles.formGrid}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>First Name</label>
                    <input 
                      style={styles.input}
                      value={formData.firstName}
                      onChange={(e) => updateFormData('firstName', e.target.value)}
                      placeholder="John"
                    />
                  </div>
                  <div style={{...styles.formGroup, maxWidth: '100px'}}>
                    <label style={styles.label}>M.I.</label>
                    <input 
                      style={styles.input}
                      value={formData.middleInitial}
                      onChange={(e) => updateFormData('middleInitial', e.target.value.slice(0, 1))}
                      placeholder="A"
                      maxLength={1}
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Last Name</label>
                    <input 
                      style={styles.input}
                      value={formData.lastName}
                      onChange={(e) => updateFormData('lastName', e.target.value)}
                      placeholder="Smith"
                    />
                  </div>
                </div>
                
                <div style={styles.formRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Social Security Number</label>
                    <input 
                      style={styles.input}
                      value={formData.ssn}
                      onChange={(e) => updateFormData('ssn', formatSSN(e.target.value))}
                      placeholder="XXX-XX-XXXX"
                      maxLength={11}
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Date of Birth</label>
                    <input 
                      type="date"
                      style={styles.input}
                      value={formData.dateOfBirth}
                      onChange={(e) => updateFormData('dateOfBirth', e.target.value)}
                    />
                  </div>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Filing Status</label>
                  <div style={styles.radioGroup}>
                    {[
                      { value: 'single', label: 'Single' },
                      { value: 'married-joint', label: 'Married Filing Jointly' },
                      { value: 'married-separate', label: 'Married Filing Separately' },
                      { value: 'head-household', label: 'Head of Household' },
                    ].map(option => (
                      <label key={option.value} style={styles.radioLabel}>
                        <input
                          type="radio"
                          name="filingStatus"
                          value={option.value}
                          checked={formData.filingStatus === option.value}
                          onChange={(e) => updateFormData('filingStatus', e.target.value)}
                          style={styles.radioInput}
                        />
                        <span style={{
                          ...styles.radioCustom,
                          ...(formData.filingStatus === option.value ? styles.radioCustomChecked : {})
                        }}>
                          {formData.filingStatus === option.value && <div style={styles.radioDot} />}
                        </span>
                        {option.label}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div style={styles.card}>
                <h3 style={styles.cardTitle}>Address</h3>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Street Address</label>
                  <input 
                    style={styles.input}
                    value={formData.address}
                    onChange={(e) => updateFormData('address', e.target.value)}
                    placeholder="123 Main Street"
                  />
                </div>
                <div style={styles.formGrid3}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>City</label>
                    <input 
                      style={styles.input}
                      value={formData.city}
                      onChange={(e) => updateFormData('city', e.target.value)}
                      placeholder="San Francisco"
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>State</label>
                    <select 
                      style={styles.select}
                      value={formData.state}
                      onChange={(e) => updateFormData('state', e.target.value)}
                    >
                      <option value="">Select...</option>
                      <option value="CA">California</option>
                      <option value="NY">New York</option>
                      <option value="TX">Texas</option>
                      <option value="FL">Florida</option>
                      <option value="WA">Washington</option>
                    </select>
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>ZIP Code</label>
                    <input 
                      style={styles.input}
                      value={formData.zipCode}
                      onChange={(e) => updateFormData('zipCode', e.target.value)}
                      placeholder="94102"
                      maxLength={10}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Income */}
          {currentStep === 2 && (
            <div style={styles.stepContent}>
              <h1 style={styles.stepHeading}>Tell us about your income</h1>
              <p style={styles.stepDescription}>Enter information from your W-2s and 1099 forms.</p>
              
              <div style={styles.card}>
                <div style={styles.cardHeader}>
                  <h3 style={styles.cardTitle}>W-2 Wage Income</h3>
                  <button style={styles.addBtn} onClick={addW2}>+ Add W-2</button>
                </div>
                
                {formData.w2Forms.map((w2, idx) => (
                  <div key={idx} style={styles.incomeItem}>
                    <div style={styles.incomeItemHeader}>
                      <span style={styles.incomeItemBadge}>W-2 #{idx + 1}</span>
                    </div>
                    <div style={styles.formGrid3}>
                      <div style={styles.formGroup}>
                        <label style={styles.label}>Employer Name</label>
                        <input 
                          style={styles.input}
                          value={w2.employer}
                          onChange={(e) => updateW2(idx, 'employer', e.target.value)}
                          placeholder="Acme Corp"
                        />
                      </div>
                      <div style={styles.formGroup}>
                        <label style={styles.label}>Wages (Box 1)</label>
                        <input 
                          type="number"
                          style={styles.input}
                          value={w2.wages}
                          onChange={(e) => updateW2(idx, 'wages', e.target.value)}
                          placeholder="75000"
                        />
                      </div>
                      <div style={styles.formGroup}>
                        <label style={styles.label}>Federal Tax Withheld (Box 2)</label>
                        <input 
                          type="number"
                          style={styles.input}
                          value={w2.fedWithheld}
                          onChange={(e) => updateW2(idx, 'fedWithheld', e.target.value)}
                          placeholder="12000"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={styles.card}>
                <div style={styles.cardHeader}>
                  <h3 style={styles.cardTitle}>1099-INT Interest Income</h3>
                  <button style={styles.addBtn} onClick={add1099Int}>+ Add 1099-INT</button>
                </div>
                
                {formData.form1099Int.map((form, idx) => (
                  <div key={idx} style={styles.incomeItem}>
                    <div style={styles.incomeItemHeader}>
                      <span style={{...styles.incomeItemBadge, background: '#10b981'}}>1099-INT #{idx + 1}</span>
                    </div>
                    <div style={styles.formRow}>
                      <div style={styles.formGroup}>
                        <label style={styles.label}>Payer Name</label>
                        <input 
                          style={styles.input}
                          value={form.payer}
                          onChange={(e) => update1099Int(idx, 'payer', e.target.value)}
                          placeholder="Chase Bank"
                        />
                      </div>
                      <div style={styles.formGroup}>
                        <label style={styles.label}>Interest Amount (Box 1)</label>
                        <input 
                          type="number"
                          style={styles.input}
                          value={form.amount}
                          onChange={(e) => update1099Int(idx, 'amount', e.target.value)}
                          placeholder="250"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Income Summary */}
              <div style={styles.summaryBox}>
                <div style={styles.summaryTitle}>Income Summary</div>
                <div style={styles.summaryRow}>
                  <span>W-2 Wages</span>
                  <span>{formatCurrency(formData.w2Forms.reduce((s, w) => s + (parseFloat(w.wages) || 0), 0))}</span>
                </div>
                <div style={styles.summaryRow}>
                  <span>Interest Income</span>
                  <span>{formatCurrency(formData.form1099Int.reduce((s, f) => s + (parseFloat(f.amount) || 0), 0))}</span>
                </div>
                <div style={{...styles.summaryRow, ...styles.summaryTotal}}>
                  <span>Total Income</span>
                  <span>{formatCurrency(calculated.totalIncome)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Deductions */}
          {currentStep === 3 && (
            <div style={styles.stepContent}>
              <h1 style={styles.stepHeading}>Choose your deductions</h1>
              <p style={styles.stepDescription}>Most people take the standard deduction. We'll help you decide.</p>
              
              <div style={styles.deductionCards}>
                <div 
                  style={{
                    ...styles.deductionCard,
                    ...(formData.deductionType === 'standard' ? styles.deductionCardSelected : {})
                  }}
                  onClick={() => updateFormData('deductionType', 'standard')}
                >
                  <div style={styles.deductionCardHeader}>
                    <div style={{
                      ...styles.deductionRadio,
                      ...(formData.deductionType === 'standard' ? styles.deductionRadioSelected : {})
                    }}>
                      {formData.deductionType === 'standard' && <div style={styles.radioDot} />}
                    </div>
                    <div>
                      <h3 style={styles.deductionTitle}>Standard Deduction</h3>
                      <p style={styles.deductionSubtitle}>Recommended for most filers</p>
                    </div>
                  </div>
                  <div style={styles.deductionAmount}>
                    {formatCurrency(formData.filingStatus === 'married-joint' ? 30000 : 15000)}
                  </div>
                  <p style={styles.deductionDesc}>
                    No receipts needed. This is the simpler option and works great for most people.
                  </p>
                </div>

                <div 
                  style={{
                    ...styles.deductionCard,
                    ...(formData.deductionType === 'itemized' ? styles.deductionCardSelected : {})
                  }}
                  onClick={() => updateFormData('deductionType', 'itemized')}
                >
                  <div style={styles.deductionCardHeader}>
                    <div style={{
                      ...styles.deductionRadio,
                      ...(formData.deductionType === 'itemized' ? styles.deductionRadioSelected : {})
                    }}>
                      {formData.deductionType === 'itemized' && <div style={styles.radioDot} />}
                    </div>
                    <div>
                      <h3 style={styles.deductionTitle}>Itemized Deductions</h3>
                      <p style={styles.deductionSubtitle}>For homeowners & high deductions</p>
                    </div>
                  </div>
                  <div style={styles.deductionAmount}>
                    {formatCurrency(
                      (parseFloat(formData.mortgageInterest) || 0) +
                      (parseFloat(formData.propertyTaxes) || 0) +
                      (parseFloat(formData.charitableDonations) || 0) +
                      (parseFloat(formData.medicalExpenses) || 0) +
                      (parseFloat(formData.stateLocalTaxes) || 0)
                    )}
                  </div>
                  <p style={styles.deductionDesc}>
                    May save you more if your itemized deductions exceed the standard deduction.
                  </p>
                </div>
              </div>

              {formData.deductionType === 'itemized' && (
                <div style={styles.card}>
                  <h3 style={styles.cardTitle}>Itemized Deduction Details</h3>
                  <div style={styles.formGrid}>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Mortgage Interest</label>
                      <input 
                        type="number"
                        style={styles.input}
                        value={formData.mortgageInterest}
                        onChange={(e) => updateFormData('mortgageInterest', e.target.value)}
                        placeholder="0"
                      />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Property Taxes</label>
                      <input 
                        type="number"
                        style={styles.input}
                        value={formData.propertyTaxes}
                        onChange={(e) => updateFormData('propertyTaxes', e.target.value)}
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div style={styles.formGrid}>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Charitable Donations</label>
                      <input 
                        type="number"
                        style={styles.input}
                        value={formData.charitableDonations}
                        onChange={(e) => updateFormData('charitableDonations', e.target.value)}
                        placeholder="0"
                      />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>State & Local Taxes (max $10,000)</label>
                      <input 
                        type="number"
                        style={styles.input}
                        value={formData.stateLocalTaxes}
                        onChange={(e) => updateFormData('stateLocalTaxes', Math.min(10000, e.target.value))}
                        placeholder="0"
                        max={10000}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Tax Summary */}
          {currentStep === 4 && (
            <div style={styles.stepContent}>
              <h1 style={styles.stepHeading}>Your Tax Summary</h1>
              <p style={styles.stepDescription}>Here's an overview of your federal tax return.</p>
              
              <div style={styles.refundCard}>
                <div style={styles.refundLabel}>
                  {calculated.refundOrOwed >= 0 ? 'Estimated Refund' : 'Estimated Amount Owed'}
                </div>
                <div style={{
                  ...styles.refundAmount,
                  color: calculated.refundOrOwed >= 0 ? '#10b981' : '#ef4444'
                }}>
                  {calculated.refundOrOwed >= 0 ? '+' : '-'}{formatCurrency(Math.abs(calculated.refundOrOwed))}
                </div>
                <div style={styles.refundSubtext}>
                  {calculated.refundOrOwed >= 0 
                    ? 'Great news! You overpaid your taxes this year.' 
                    : 'You owe additional taxes for this year.'}
                </div>
              </div>

              <div style={styles.summaryGrid}>
                <div style={styles.summaryCard}>
                  <h4 style={styles.summaryCardTitle}>Income</h4>
                  <div style={styles.summaryLine}>
                    <span>Total Income</span>
                    <span>{formatCurrency(calculated.totalIncome)}</span>
                  </div>
                  <div style={styles.summaryLine}>
                    <span>Adjusted Gross Income</span>
                    <span>{formatCurrency(calculated.adjustedGrossIncome)}</span>
                  </div>
                </div>

                <div style={styles.summaryCard}>
                  <h4 style={styles.summaryCardTitle}>Deductions</h4>
                  <div style={styles.summaryLine}>
                    <span>{formData.deductionType === 'standard' ? 'Standard' : 'Itemized'} Deduction</span>
                    <span>-{formatCurrency(calculated.standardDeduction)}</span>
                  </div>
                  <div style={{...styles.summaryLine, fontWeight: '600'}}>
                    <span>Taxable Income</span>
                    <span>{formatCurrency(calculated.taxableIncome)}</span>
                  </div>
                </div>

                <div style={styles.summaryCard}>
                  <h4 style={styles.summaryCardTitle}>Tax Calculation</h4>
                  <div style={styles.summaryLine}>
                    <span>Total Tax</span>
                    <span>{formatCurrency(calculated.totalTax)}</span>
                  </div>
                  <div style={styles.summaryLine}>
                    <span>Total Withheld</span>
                    <span>-{formatCurrency(calculated.totalWithheld)}</span>
                  </div>
                  <div style={{...styles.summaryLine, fontWeight: '600', color: calculated.refundOrOwed >= 0 ? '#10b981' : '#ef4444'}}>
                    <span>{calculated.refundOrOwed >= 0 ? 'Refund' : 'Amount Owed'}</span>
                    <span>{formatCurrency(Math.abs(calculated.refundOrOwed))}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Pricing */}
          {currentStep === 5 && (
            <div style={styles.stepContent}>
              <h1 style={styles.stepHeading}>Your Price</h1>
              <p style={styles.stepDescription}>Based on your tax situation, here's your recommended plan.</p>
              
              {(() => {
                const pricing = getPricing();
                return (
                  <>
                    <div style={styles.formsDetected}>
                      <div style={styles.formsDetectedTitle}>Forms Detected</div>
                      <div style={styles.formsDetectedList}>
                        {pricing.formCount.w2 > 0 && (
                          <span style={styles.formBadge}>{pricing.formCount.w2} W-2{pricing.formCount.w2 > 1 ? 's' : ''}</span>
                        )}
                        {pricing.formCount.int > 0 && (
                          <span style={{...styles.formBadge, background: '#10b981'}}>{pricing.formCount.int} 1099-INT</span>
                        )}
                        {pricing.formCount.div > 0 && (
                          <span style={{...styles.formBadge, background: '#8b5cf6'}}>{pricing.formCount.div} 1099-DIV</span>
                        )}
                        {pricing.formCount.w2 === 0 && pricing.formCount.int === 0 && pricing.formCount.div === 0 && (
                          <span style={styles.formBadge}>No income forms entered</span>
                        )}
                      </div>
                    </div>

                    <div style={styles.pricingCard}>
                      <div style={styles.pricingRecommended}>Recommended Plan</div>
                      <div style={styles.pricingPlan}>{pricing.plan}</div>
                      
                      <div style={styles.pricingBreakdown}>
                        <div style={styles.pricingLine}>
                          <span>Federal Return</span>
                          <span>{formatCurrency(pricing.basePrice)}</span>
                        </div>
                        <div style={styles.pricingLine}>
                          <span>State Return ({formData.state || 'CA'})</span>
                          <span>{formatCurrency(pricing.stateReturn)}</span>
                        </div>
                        <div style={styles.pricingDivider} />
                        <div style={styles.pricingTotal}>
                          <span>Total</span>
                          <span>{formatCurrency(pricing.total)}</span>
                        </div>
                      </div>

                      <div style={styles.pricingFeatures}>
                        <div style={styles.pricingFeature}><CheckIcon /> Maximum refund guarantee</div>
                        <div style={styles.pricingFeature}><CheckIcon /> Free audit support</div>
                        <div style={styles.pricingFeature}><CheckIcon /> IRS e-file included</div>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          {/* Step 6: Upload Docs */}
          {currentStep === 6 && (
            <div style={styles.stepContent}>
              <h1 style={styles.stepHeading}>Upload Your Documents</h1>
              <p style={styles.stepDescription}>Upload copies of your W-2s, 1099s, and other tax documents for our records.</p>
              
              <div style={styles.uploadArea}>
                <UploadIcon />
                <div style={styles.uploadTitle}>Drag and drop your documents here</div>
                <div style={styles.uploadSubtitle}>or click to browse</div>
                <button style={styles.uploadBtn}>Choose Files</button>
                <div style={styles.uploadFormats}>Supported: PDF, JPG, PNG (max 10MB each)</div>
              </div>

              <div style={styles.docChecklist}>
                <h3 style={styles.docChecklistTitle}>Recommended Documents</h3>
                <div style={styles.docItem}>
                  <DocumentIcon />
                  <div style={styles.docInfo}>
                    <div style={styles.docName}>W-2 from Employer</div>
                    <div style={styles.docDesc}>Wage and tax statement</div>
                  </div>
                  <span style={styles.docStatus}>Required</span>
                </div>
                <div style={styles.docItem}>
                  <DocumentIcon />
                  <div style={styles.docInfo}>
                    <div style={styles.docName}>1099-INT Forms</div>
                    <div style={styles.docDesc}>Interest income statements</div>
                  </div>
                  <span style={{...styles.docStatus, color: '#f59e0b'}}>If applicable</span>
                </div>
                <div style={styles.docItem}>
                  <DocumentIcon />
                  <div style={styles.docInfo}>
                    <div style={styles.docName}>Photo ID</div>
                    <div style={styles.docDesc}>Driver's license or passport</div>
                  </div>
                  <span style={styles.docStatus}>Required</span>
                </div>
              </div>
            </div>
          )}

          {/* Step 7: Sign & File */}
          {currentStep === 7 && (
            <div style={styles.stepContent}>
              <h1 style={styles.stepHeading}>Sign and File Your Return</h1>
              <p style={styles.stepDescription}>Review your information and sign electronically to submit.</p>
              
              <div style={styles.card}>
                <h3 style={styles.cardTitle}>Direct Deposit Information</h3>
                <p style={styles.cardDesc}>Enter your bank details to receive your refund faster.</p>
                
                <div style={styles.formRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Routing Number</label>
                    <input 
                      style={styles.input}
                      value={formData.bankRouting}
                      onChange={(e) => updateFormData('bankRouting', e.target.value)}
                      placeholder="9 digits"
                      maxLength={9}
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Account Number</label>
                    <input 
                      style={styles.input}
                      value={formData.bankAccount}
                      onChange={(e) => updateFormData('bankAccount', e.target.value)}
                      placeholder="Your account number"
                    />
                  </div>
                </div>
                
                <div style={styles.formGroup}>
                  <label style={styles.label}>Account Type</label>
                  <div style={styles.radioGroup}>
                    <label style={styles.radioLabel}>
                      <input
                        type="radio"
                        name="accountType"
                        value="checking"
                        checked={formData.accountType === 'checking'}
                        onChange={(e) => updateFormData('accountType', e.target.value)}
                        style={styles.radioInput}
                      />
                      <span style={{
                        ...styles.radioCustom,
                        ...(formData.accountType === 'checking' ? styles.radioCustomChecked : {})
                      }}>
                        {formData.accountType === 'checking' && <div style={styles.radioDot} />}
                      </span>
                      Checking
                    </label>
                    <label style={styles.radioLabel}>
                      <input
                        type="radio"
                        name="accountType"
                        value="savings"
                        checked={formData.accountType === 'savings'}
                        onChange={(e) => updateFormData('accountType', e.target.value)}
                        style={styles.radioInput}
                      />
                      <span style={{
                        ...styles.radioCustom,
                        ...(formData.accountType === 'savings' ? styles.radioCustomChecked : {})
                      }}>
                        {formData.accountType === 'savings' && <div style={styles.radioDot} />}
                      </span>
                      Savings
                    </label>
                  </div>
                </div>
              </div>

              <div style={styles.card}>
                <h3 style={styles.cardTitle}>Electronic Signature</h3>
                <p style={styles.cardDesc}>By signing, you agree that the information is true and correct.</p>
                
                <div style={styles.formRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>5-Digit Self-Select PIN</label>
                    <input 
                      type="password"
                      style={styles.input}
                      value={formData.pin}
                      onChange={(e) => updateFormData('pin', e.target.value.slice(0, 5))}
                      placeholder="•••••"
                      maxLength={5}
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Today's Date</label>
                    <input 
                      type="date"
                      style={styles.input}
                      value={formData.signatureDate}
                      onChange={(e) => updateFormData('signatureDate', e.target.value)}
                    />
                  </div>
                </div>
                
                <div style={styles.agreementBox}>
                  <ShieldCheckIcon />
                  <p>Under penalties of perjury, I declare that I have examined this return and accompanying schedules and statements, and to the best of my knowledge and belief, they are true, correct, and complete.</p>
                </div>
              </div>

              <div style={styles.paymentSummary}>
                <div style={styles.paymentLeft}>
                  <CreditCardIcon />
                  <div>
                    <div style={styles.paymentTitle}>Ready to file?</div>
                    <div style={styles.paymentSubtitle}>Total: {formatCurrency(getPricing().total)}</div>
                  </div>
                </div>
                <button style={styles.fileBtn}>
                  Pay & File Now
                </button>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div style={styles.navigation}>
            {currentStep > 1 && (
              <button 
                style={styles.backBtn}
                onClick={() => setCurrentStep(prev => prev - 1)}
              >
                <ArrowLeft /> Back
              </button>
            )}
            <div style={styles.navSpacer} />
            {currentStep < 7 && (
              <button 
                style={styles.nextBtn}
                onClick={() => setCurrentStep(prev => prev + 1)}
              >
                Continue <ArrowRight />
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

// Styles
const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  header: {
    background: '#ffffff',
    borderBottom: '1px solid #e2e8f0',
    padding: '16px 24px',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  headerInner: {
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  logoIcon: {
    background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
    color: '#ffffff',
    fontWeight: '800',
    fontSize: '14px',
    padding: '8px 12px',
    borderRadius: '8px',
  },
  logoText: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1e293b',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  yearBadge: {
    background: '#dbeafe',
    color: '#1d4ed8',
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: '600',
  },
  saveBtn: {
    background: 'transparent',
    border: '1px solid #e2e8f0',
    padding: '8px 16px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#64748b',
    cursor: 'pointer',
  },
  progressContainer: {
    background: '#ffffff',
    borderBottom: '1px solid #e2e8f0',
    padding: '16px 24px',
    overflowX: 'auto',
  },
  progressInner: {
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'flex',
    gap: '8px',
  },
  stepItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '8px 12px',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    position: 'relative',
    minWidth: 'fit-content',
  },
  stepActive: {
    background: '#eff6ff',
  },
  stepComplete: {
    opacity: 0.7,
  },
  stepCircle: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    background: '#f1f5f9',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: '600',
    color: '#64748b',
    flexShrink: 0,
  },
  stepCircleActive: {
    background: '#2563eb',
    color: '#ffffff',
  },
  stepCircleComplete: {
    background: '#10b981',
    color: '#ffffff',
  },
  stepText: {
    display: 'flex',
    flexDirection: 'column',
  },
  stepTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1e293b',
    whiteSpace: 'nowrap',
  },
  stepSubtitle: {
    fontSize: '12px',
    color: '#64748b',
    whiteSpace: 'nowrap',
  },
  stepConnector: {
    width: '24px',
    height: '2px',
    background: '#e2e8f0',
    marginLeft: '8px',
  },
  stepConnectorComplete: {
    background: '#10b981',
  },
  main: {
    padding: '32px 24px',
  },
  content: {
    maxWidth: '800px',
    margin: '0 auto',
  },
  stepContent: {
    animation: 'fadeIn 0.3s ease',
  },
  stepHeading: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: '8px',
  },
  stepDescription: {
    fontSize: '16px',
    color: '#64748b',
    marginBottom: '32px',
  },
  card: {
    background: '#ffffff',
    borderRadius: '16px',
    padding: '24px',
    marginBottom: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '20px',
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '4px',
  },
  cardDesc: {
    fontSize: '14px',
    color: '#64748b',
    marginBottom: '20px',
  },
  addBtn: {
    background: '#eff6ff',
    color: '#2563eb',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
  },
  formGrid3: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '16px',
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
    marginTop: '16px',
  },
  formGroup: {
    marginBottom: '16px',
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
    marginBottom: '6px',
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    fontSize: '15px',
    transition: 'all 0.2s',
    outline: 'none',
    boxSizing: 'border-box',
  },
  select: {
    width: '100%',
    padding: '12px 16px',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    fontSize: '15px',
    background: '#ffffff',
    cursor: 'pointer',
    boxSizing: 'border-box',
  },
  radioGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  radioLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    cursor: 'pointer',
    fontSize: '15px',
    color: '#374151',
  },
  radioInput: {
    display: 'none',
  },
  radioCustom: {
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    border: '2px solid #cbd5e1',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
  },
  radioCustomChecked: {
    borderColor: '#2563eb',
  },
  radioDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    background: '#2563eb',
  },
  incomeItem: {
    background: '#f8fafc',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '16px',
  },
  incomeItemHeader: {
    marginBottom: '16px',
  },
  incomeItemBadge: {
    background: '#2563eb',
    color: '#ffffff',
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '600',
  },
  summaryBox: {
    background: '#1e293b',
    borderRadius: '16px',
    padding: '24px',
    color: '#ffffff',
  },
  summaryTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: '16px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '12px 0',
    borderBottom: '1px solid #334155',
    fontSize: '15px',
  },
  summaryTotal: {
    borderBottom: 'none',
    fontSize: '18px',
    fontWeight: '700',
    paddingTop: '16px',
  },
  deductionCards: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px',
    marginBottom: '24px',
  },
  deductionCard: {
    background: '#ffffff',
    borderRadius: '16px',
    padding: '24px',
    border: '2px solid #e2e8f0',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  deductionCardSelected: {
    borderColor: '#2563eb',
    background: '#eff6ff',
  },
  deductionCardHeader: {
    display: 'flex',
    gap: '12px',
    marginBottom: '16px',
  },
  deductionRadio: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    border: '2px solid #cbd5e1',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  deductionRadioSelected: {
    borderColor: '#2563eb',
  },
  deductionTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '4px',
  },
  deductionSubtitle: {
    fontSize: '14px',
    color: '#64748b',
  },
  deductionAmount: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#2563eb',
    marginBottom: '12px',
  },
  deductionDesc: {
    fontSize: '14px',
    color: '#64748b',
    lineHeight: '1.5',
  },
  refundCard: {
    background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
    borderRadius: '20px',
    padding: '40px',
    textAlign: 'center',
    marginBottom: '32px',
  },
  refundLabel: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    marginBottom: '12px',
  },
  refundAmount: {
    fontSize: '56px',
    fontWeight: '800',
    marginBottom: '12px',
  },
  refundSubtext: {
    fontSize: '16px',
    color: '#cbd5e1',
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '20px',
  },
  summaryCard: {
    background: '#ffffff',
    borderRadius: '16px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  summaryCardTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#64748b',
    marginBottom: '16px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  summaryLine: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    fontSize: '14px',
    color: '#374151',
  },
  formsDetected: {
    background: '#ffffff',
    borderRadius: '16px',
    padding: '20px',
    marginBottom: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  formsDetectedTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#64748b',
    marginBottom: '12px',
  },
  formsDetectedList: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  formBadge: {
    background: '#2563eb',
    color: '#ffffff',
    padding: '6px 14px',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: '600',
  },
  pricingCard: {
    background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
    borderRadius: '20px',
    padding: '32px',
    color: '#ffffff',
    textAlign: 'center',
  },
  pricingRecommended: {
    background: 'rgba(255,255,255,0.2)',
    display: 'inline-block',
    padding: '6px 16px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    marginBottom: '16px',
  },
  pricingPlan: {
    fontSize: '36px',
    fontWeight: '800',
    marginBottom: '24px',
  },
  pricingBreakdown: {
    background: 'rgba(255,255,255,0.1)',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '24px',
  },
  pricingLine: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    fontSize: '15px',
  },
  pricingDivider: {
    height: '1px',
    background: 'rgba(255,255,255,0.2)',
    margin: '12px 0',
  },
  pricingTotal: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '20px',
    fontWeight: '700',
  },
  pricingFeatures: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    textAlign: 'left',
  },
  pricingFeature: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontSize: '14px',
  },
  uploadArea: {
    background: '#ffffff',
    borderRadius: '16px',
    border: '2px dashed #cbd5e1',
    padding: '48px',
    textAlign: 'center',
    marginBottom: '24px',
  },
  uploadTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1e293b',
    marginTop: '16px',
  },
  uploadSubtitle: {
    fontSize: '14px',
    color: '#64748b',
    marginBottom: '20px',
  },
  uploadBtn: {
    background: '#2563eb',
    color: '#ffffff',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '10px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  uploadFormats: {
    fontSize: '12px',
    color: '#94a3b8',
    marginTop: '16px',
  },
  docChecklist: {
    background: '#ffffff',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  docChecklistTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '20px',
  },
  docItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '16px 0',
    borderBottom: '1px solid #f1f5f9',
  },
  docInfo: {
    flex: 1,
  },
  docName: {
    fontSize: '15px',
    fontWeight: '500',
    color: '#1e293b',
  },
  docDesc: {
    fontSize: '13px',
    color: '#64748b',
  },
  docStatus: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#10b981',
  },
  agreementBox: {
    display: 'flex',
    gap: '16px',
    background: '#f8fafc',
    borderRadius: '12px',
    padding: '20px',
    marginTop: '20px',
  },
  paymentSummary: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: '#1e293b',
    borderRadius: '16px',
    padding: '24px',
    marginTop: '24px',
  },
  paymentLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    color: '#ffffff',
  },
  paymentTitle: {
    fontSize: '16px',
    fontWeight: '600',
  },
  paymentSubtitle: {
    fontSize: '14px',
    color: '#94a3b8',
  },
  fileBtn: {
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    color: '#ffffff',
    border: 'none',
    padding: '16px 32px',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: '700',
    cursor: 'pointer',
  },
  navigation: {
    display: 'flex',
    alignItems: 'center',
    marginTop: '32px',
    paddingTop: '24px',
    borderTop: '1px solid #e2e8f0',
  },
  backBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'transparent',
    border: '1px solid #e2e8f0',
    padding: '12px 24px',
    borderRadius: '10px',
    fontSize: '15px',
    fontWeight: '500',
    color: '#64748b',
    cursor: 'pointer',
  },
  navSpacer: {
    flex: 1,
  },
  nextBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
    border: 'none',
    padding: '12px 32px',
    borderRadius: '10px',
    fontSize: '15px',
    fontWeight: '600',
    color: '#ffffff',
    cursor: 'pointer',
  },
};
