// ============================================================
// PAYMENT FLOW - v6.0 ALL 50 STATES SUPPORT
// ============================================================
// Location: src/components/PaymentFlow.jsx
// ✅ v6.0: Support ALL 50 US States + DC
//          - Shows user's actual state name
//          - $0 for no-tax states (AK, FL, NV, NH, SD, TN, TX, WA, WY)
// ✅ v5.0: State price now shows correctly for all plans
// ============================================================

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// ============================================================
// PRICING PLANS - State price is ALWAYS $19.99 (except no-tax states)
// ============================================================
const STATE_PRICE = 19.99; // Fixed state price for all plans

// ============================================================
// STATE FORM CONFIG - ALL 50 STATES + DC
// ============================================================
const STATE_FORM_CONFIG = {
  "AL": { form: "40", name: "Alabama" },
  "AR": { form: "AR1000F", name: "Arkansas" },
  "AZ": { form: "140", name: "Arizona" },
  "CA": { form: "540", name: "California" },
  "CO": { form: "104", name: "Colorado" },
  "CT": { form: "CT-1040", name: "Connecticut" },
  "DC": { form: "D-40", name: "Washington DC" },
  "DE": { form: "200-01", name: "Delaware" },
  "GA": { form: "500", name: "Georgia" },
  "HI": { form: "N-11", name: "Hawaii" },
  "IA": { form: "IA 1040", name: "Iowa" },
  "ID": { form: "40", name: "Idaho" },
  "IL": { form: "IL-1040", name: "Illinois" },
  "IN": { form: "IT-40", name: "Indiana" },
  "KS": { form: "K-40", name: "Kansas" },
  "KY": { form: "740", name: "Kentucky" },
  "LA": { form: "IT-540", name: "Louisiana" },
  "MA": { form: "1", name: "Massachusetts" },
  "MD": { form: "502", name: "Maryland" },
  "ME": { form: "1040ME", name: "Maine" },
  "MI": { form: "MI-1040", name: "Michigan" },
  "MN": { form: "M1", name: "Minnesota" },
  "MO": { form: "MO-1040", name: "Missouri" },
  "MS": { form: "80-105", name: "Mississippi" },
  "MT": { form: "2", name: "Montana" },
  "NC": { form: "D-400", name: "North Carolina" },
  "ND": { form: "ND-1", name: "North Dakota" },
  "NE": { form: "1040N", name: "Nebraska" },
  "NJ": { form: "NJ-1040", name: "New Jersey" },
  "NM": { form: "PIT-1", name: "New Mexico" },
  "NY": { form: "IT-201", name: "New York" },
  "OH": { form: "IT 1040", name: "Ohio" },
  "OK": { form: "511", name: "Oklahoma" },
  "OR": { form: "40", name: "Oregon" },
  "PA": { form: "PA-40", name: "Pennsylvania" },
  "RI": { form: "RI-1040", name: "Rhode Island" },
  "SC": { form: "SC1040", name: "South Carolina" },
  "UT": { form: "TC-40", name: "Utah" },
  "VA": { form: "760", name: "Virginia" },
  "VT": { form: "IN-111", name: "Vermont" },
  "WI": { form: "1", name: "Wisconsin" },
  "WV": { form: "IT-140", name: "West Virginia" },
};

const NO_TAX_STATES = ["AK", "FL", "NV", "NH", "SD", "TN", "TX", "WA", "WY"];

const getStateName = (code) => STATE_FORM_CONFIG[code]?.name || code;
const isNoTaxState = (code) => NO_TAX_STATES.includes(code);

const PLANS = {
  free: {
    id: 'free',
    name: 'Free Estimate',
    price: 0,
    icon: '🆓',
    color: '#64748b',
    description: 'View estimate only',
    features: ['See your refund estimate', 'No download included'],
  },
  basic: {
    id: 'basic',
    name: 'Basic',
    price: 29.99,
    icon: '📄',
    color: '#06b6d4',
    description: 'Simple W-2 return',
    features: ['1 W-2 form', 'Federal e-file', 'Download Form 1040'],
  },
  standard: {
    id: 'standard',
    name: 'Standard',
    price: 49.99,
    icon: '⭐',
    color: '#8b5cf6',
    popular: true,
    description: 'W-2 + Investment income',
    features: ['Up to 3 W-2s', '1099-INT, 1099-DIV', 'Federal e-file'],
  },
  plus: {
    id: 'plus',
    name: 'Plus',
    price: 79.99,
    icon: '💎',
    color: '#6366f1',
    description: 'Multiple income sources',
    features: ['Up to 5 W-2s', 'All 1099 types', 'Retirement income'],
  },
  selfEmployed: {
    id: 'selfEmployed',
    name: 'Self-Employed',
    price: 89.99,
    icon: '💼',
    color: '#10b981',
    description: 'Freelancers & contractors',
    features: ['1099-NEC, 1099-K', 'Schedule C', 'Business deductions'],
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    price: 129.99,
    icon: '👑',
    color: '#f59e0b',
    description: 'Complex + CPA review',
    features: ['Unlimited forms', 'CPA review', 'Audit protection'],
    includesCPA: true,
  },
};

// ============================================================
// SMART PLAN CALCULATOR
// ============================================================
function calculateRecommendedPlan(taxData) {
  const {
    w2Count = 0,
    form1099IntCount = 0,
    form1099DivCount = 0,
    form1099NecCount = 0,
    form1099MiscCount = 0,
    form1099KCount = 0,
    form1099BCount = 0,
    form1099RCount = 0,
    totalIncome = 0,
    hasSelfEmployment = false,
    hasRentalIncome = false,
    needsCPA = false,
  } = taxData;

  const total1099 = form1099IntCount + form1099DivCount + form1099NecCount + 
                    form1099MiscCount + form1099KCount + form1099BCount + form1099RCount;
  const hasSelfEmployed1099 = form1099NecCount > 0 || form1099MiscCount > 0 || form1099KCount > 0;
  
  const reasons = [];
  let plan = 'basic';

  if (needsCPA || hasRentalIncome || totalIncome >= 200000) {
    plan = 'premium';
    if (needsCPA) reasons.push('CPA review');
    if (hasRentalIncome) reasons.push('Rental income');
    if (totalIncome >= 200000) reasons.push('High income');
  } else if (hasSelfEmployment || hasSelfEmployed1099) {
    plan = 'selfEmployed';
    if (form1099NecCount) reasons.push(`${form1099NecCount} 1099-NEC`);
    if (form1099KCount) reasons.push(`${form1099KCount} 1099-K`);
    if (hasSelfEmployment) reasons.push('Self-employment');
  } else if (w2Count > 3 || form1099BCount > 0 || form1099RCount > 0 || total1099 > 3) {
    plan = 'plus';
    if (w2Count > 3) reasons.push(`${w2Count} W-2s`);
    if (form1099BCount) reasons.push(`${form1099BCount} 1099-B`);
    if (form1099RCount) reasons.push(`${form1099RCount} 1099-R`);
  } else if (w2Count > 1 || form1099IntCount > 0 || form1099DivCount > 0) {
    plan = 'standard';
    if (w2Count > 1) reasons.push(`${w2Count} W-2s`);
    if (form1099IntCount) reasons.push(`${form1099IntCount} 1099-INT`);
    if (form1099DivCount) reasons.push(`${form1099DivCount} 1099-DIV`);
  } else if (w2Count === 1) {
    plan = 'basic';
    reasons.push('Simple W-2 return');
  } else {
    plan = 'free';
    reasons.push('Estimate only');
  }

  return { plan, reasons };
}

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function PaymentFlow({ taxData, userData, onClose, onComplete }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: Pricing, 2: Payment
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [hasState, setHasState] = useState(true);
  const [recommendation, setRecommendation] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);

  // ✅ Get user's state from userData
  const userState = userData?.state || taxData?.state || 'CA';
  const userStateName = getStateName(userState);
  const userStateIsNoTax = isNoTaxState(userState);

  // Memoize form counts
  const formCounts = useMemo(() => ({
    w2Count: taxData?.w2Forms?.length || taxData?.w2Count || 0,
    form1099IntCount: taxData?.form1099Int?.length || 0,
    form1099DivCount: taxData?.form1099Div?.length || 0,
    form1099NecCount: taxData?.form1099Nec?.length || 0,
    form1099MiscCount: taxData?.form1099Misc?.length || 0,
    form1099KCount: taxData?.form1099K?.length || 0,
    form1099BCount: taxData?.form1099B?.length || 0,
    form1099RCount: taxData?.form1099R?.length || 0,
    totalIncome: taxData?.agi || taxData?.totalIncome || 0,
    hasSelfEmployment: taxData?.hasSelfEmployment || false,
    hasRentalIncome: taxData?.hasRentalIncome || false,
  }), [taxData]);

  // Calculate recommendation on mount
  useEffect(() => {
    const result = calculateRecommendedPlan(formCounts);
    setRecommendation(result);
    setSelectedPlan(result.plan);
  }, [formCounts]);

  // Get current plan
  const plan = selectedPlan ? PLANS[selectedPlan] : null;

  // ✅ FIX: Calculate total price - State price is $19.99, or $0 for no-tax states
  const getTotal = () => {
    if (!plan) return 0;
    const statePrice = (hasState && !userStateIsNoTax) ? STATE_PRICE : 0;
    return plan.price + statePrice;
  };

  // Get state price for display
  const getStatePrice = () => {
    if (userStateIsNoTax) return 0;
    return STATE_PRICE;
  };

  // Format price helper
  const formatPrice = (price) => {
    return (price ?? 0).toFixed(2);
  };

  // Handle payment
  const handlePayment = async (paymentMethod = 'stripe') => {
    setError(null);
    
    if (selectedPlan === 'free') {
      onComplete?.({ plan: 'free', amount: 0 });
      return;
    }

    if (!plan) {
      setError('Please select a plan');
      return;
    }

    setIsProcessing(true);
    
    try {
      const totalCents = Math.round(getTotal() * 100);
      
      // Save selection to localStorage for CheckoutPage
      const paymentData = {
        planId: selectedPlan,
        planName: plan.name,
        planIcon: plan.icon,
        price: Math.round(plan.price * 100),
        statePrice: (hasState && !userStateIsNoTax) ? Math.round(STATE_PRICE * 100) : 0,
        totalPrice: totalCents,
        hasState,
        userState,
        userStateName,
        userStateIsNoTax,
        taxYear: 2025,
        taxData,
        userData,
        paymentMethod,
      };
      
      localStorage.setItem('taxsky_payment', JSON.stringify(paymentData));
      
      // Close modal and navigate to checkout
      onClose?.();
      
      // Navigate to Stripe checkout
      navigate(`/checkout/${selectedPlan}?state=${hasState}&amount=${totalCents}`);
    } catch (err) {
      console.error('Payment error:', err);
      setError('Failed to process payment. Please try again.');
      setIsProcessing(false);
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>
              {step === 1 ? '💳 Choose Your Plan' : '💳 Complete Payment'}
            </h2>
            <p style={styles.subtitle}>
              {step === 1 ? 'Based on your tax forms' : 'Secure checkout'}
            </p>
          </div>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>

        {/* Error Display */}
        {error && (
          <div style={styles.errorBanner}>
            <span>⚠️ {error}</span>
            <button onClick={() => setError(null)} style={styles.errorClose}>✕</button>
          </div>
        )}

        {/* Step 1: Smart Pricing */}
        {step === 1 && (
          <>
            {/* Detected Forms Summary */}
            <div style={styles.formsSummary}>
              <h3 style={styles.sectionTitle}>📋 Your Tax Forms</h3>
              <div style={styles.formsBadges}>
                {formCounts.w2Count > 0 && (
                  <span style={styles.formBadge}>
                    <strong>{formCounts.w2Count}</strong> W-2
                  </span>
                )}
                {formCounts.form1099IntCount > 0 && (
                  <span style={{...styles.formBadge, background: 'rgba(16,185,129,0.15)', borderColor: 'rgba(16,185,129,0.3)'}}>
                    <strong>{formCounts.form1099IntCount}</strong> 1099-INT
                  </span>
                )}
                {formCounts.form1099DivCount > 0 && (
                  <span style={{...styles.formBadge, background: 'rgba(139,92,246,0.15)', borderColor: 'rgba(139,92,246,0.3)'}}>
                    <strong>{formCounts.form1099DivCount}</strong> 1099-DIV
                  </span>
                )}
                {formCounts.form1099NecCount > 0 && (
                  <span style={{...styles.formBadge, background: 'rgba(245,158,11,0.15)', borderColor: 'rgba(245,158,11,0.3)'}}>
                    <strong>{formCounts.form1099NecCount}</strong> 1099-NEC
                  </span>
                )}
                {formCounts.w2Count === 0 && Object.values(formCounts).every(v => !v || v === 0) && (
                  <span style={styles.formBadge}>No forms detected</span>
                )}
              </div>
            </div>

            {/* Recommended Plan */}
            {plan && (
              <div style={{...styles.recommendedCard, borderColor: plan.color}}>
                <div style={{...styles.recommendedBadge, background: plan.color}}>
                  ✨ Recommended
                </div>
                <div style={styles.recommendedContent}>
                  <div style={styles.recommendedLeft}>
                    <span style={styles.planIcon}>{plan.icon}</span>
                    <div>
                      <h3 style={styles.planName}>{plan.name}</h3>
                      <p style={styles.planDesc}>{plan.description}</p>
                    </div>
                  </div>
                  <div style={styles.priceBox}>
                    <span style={styles.priceAmount}>${formatPrice(plan.price)}</span>
                    <span style={styles.pricePer}>federal</span>
                  </div>
                </div>
                
                {/* Why this plan */}
                {recommendation?.reasons?.length > 0 && (
                  <div style={styles.reasonsRow}>
                    {recommendation.reasons.map((r, i) => (
                      <span key={i} style={styles.reasonChip}>✓ {r}</span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ✅ State Return Toggle - Shows user's state, $0 for no-tax states */}
            <div style={styles.stateRow}>
              <div>
                <span style={styles.stateLabel}>Include {userStateName} State Return?</span>
                {userStateIsNoTax ? (
                  <span style={{...styles.statePrice, color: '#fbbf24'}}>(No tax! 🎉)</span>
                ) : (
                  <span style={styles.statePrice}>(+${formatPrice(STATE_PRICE)})</span>
                )}
              </div>
              <div style={styles.toggleGroup}>
                <button 
                  style={{...styles.toggleBtn, ...(!hasState ? styles.toggleActive : {})}}
                  onClick={() => setHasState(false)}
                >No</button>
                <button 
                  style={{...styles.toggleBtn, ...(hasState ? styles.toggleActive : {})}}
                  onClick={() => setHasState(true)}
                >Yes</button>
              </div>
            </div>

            {/* All Plans */}
            <div style={styles.allPlans}>
              <p style={styles.allPlansLabel}>Or choose a different plan:</p>
              <div style={styles.plansRow}>
                {Object.values(PLANS).map((p) => (
                  <button
                    key={p.id}
                    style={{
                      ...styles.planBtn,
                      ...(selectedPlan === p.id ? {borderColor: p.color, background: `${p.color}22`} : {}),
                    }}
                    onClick={() => setSelectedPlan(p.id)}
                  >
                    <span style={styles.planBtnIcon}>{p.icon}</span>
                    <span style={styles.planBtnName}>{p.name}</span>
                    <span style={styles.planBtnPrice}>${formatPrice(p.price)}</span>
                    {selectedPlan === p.id && <span style={styles.checkMark}>✓</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* Price Summary */}
            {plan && (
              <div style={styles.priceSummary}>
                <div style={styles.summaryRow}>
                  <span>Federal ({plan.name})</span>
                  <span>${formatPrice(plan.price)}</span>
                </div>
                {hasState && (
                  <div style={styles.summaryRow}>
                    <span>State Return ({userState})</span>
                    <span>{userStateIsNoTax ? '$0 (No tax!)' : `$${formatPrice(STATE_PRICE)}`}</span>
                  </div>
                )}
                <div style={styles.summaryDivider} />
                <div style={styles.summaryTotal}>
                  <span>Total</span>
                  <span style={styles.totalPrice}>${formatPrice(getTotal())}</span>
                </div>
              </div>
            )}

            {/* Continue Button */}
            <button 
              style={{...styles.continueBtn, background: plan?.color || '#6366f1'}}
              onClick={() => selectedPlan === 'free' ? handlePayment() : setStep(2)}
              disabled={!plan}
            >
              {selectedPlan === 'free' ? 'Continue with Free Estimate' : `Continue to Payment → $${formatPrice(getTotal())}`}
            </button>
          </>
        )}

        {/* Step 2: Payment */}
        {step === 2 && plan && (
          <>
            <div style={styles.paymentSummary}>
              <div style={styles.paymentPlan}>
                <span style={styles.planIcon}>{plan.icon}</span>
                <div>
                  <h3 style={styles.planName}>{plan.name}</h3>
                  <p style={styles.planDesc}>{hasState ? `Federal + ${userStateName}` : 'Federal only'}</p>
                </div>
                <span style={styles.paymentTotal}>${formatPrice(getTotal())}</span>
              </div>
            </div>

            {/* Payment Methods */}
            <div style={styles.paymentMethods}>
              <h3 style={styles.sectionTitle}>💳 Payment Method</h3>
              
              <button 
                style={styles.stripeBtn} 
                onClick={() => handlePayment('stripe')} 
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <span>Processing...</span>
                ) : (
                  <>
                    <span>Pay with Card</span>
                    <span style={styles.stripeLogos}>💳 Visa, Mastercard, Amex</span>
                  </>
                )}
              </button>

              <div style={styles.orDivider}>
                <div style={styles.orLine} />
                <span>or</span>
                <div style={styles.orLine} />
              </div>

              <button 
                style={styles.paypalBtn} 
                onClick={() => handlePayment('paypal')}
                disabled={isProcessing}
              >
                PayPal
              </button>

              <div style={styles.securityBadge}>
                🔒 Secure payment powered by Stripe
              </div>

              <button style={styles.backBtn} onClick={() => setStep(1)}>
                ← Back to plans
              </button>
            </div>
          </>
        )}

        {/* Footer */}
        <div style={styles.footer}>
          <span>💰 30-day refund</span>
          <span>🔐 256-bit SSL</span>
          <span>✅ IRS Authorized</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// STYLES
// ============================================================
const styles = {
  overlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.85)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: 16,
  },
  modal: {
    backgroundColor: '#0f172a',
    borderRadius: 20,
    width: '100%',
    maxWidth: 480,
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
    border: '1px solid rgba(255,255,255,0.1)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  },
  title: {
    margin: 0,
    fontSize: 20,
    fontWeight: 700,
    color: '#fff',
  },
  subtitle: {
    margin: '4px 0 0',
    fontSize: 14,
    color: '#64748b',
  },
  closeBtn: {
    background: 'rgba(255,255,255,0.1)',
    border: 'none',
    color: '#94a3b8',
    width: 32,
    height: 32,
    borderRadius: '50%',
    fontSize: 16,
    cursor: 'pointer',
  },
  errorBanner: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 24px',
    background: 'rgba(239, 68, 68, 0.15)',
    color: '#f87171',
    fontSize: 14,
  },
  errorClose: {
    background: 'none',
    border: 'none',
    color: '#f87171',
    cursor: 'pointer',
  },
  formsSummary: {
    padding: '16px 24px',
  },
  sectionTitle: {
    margin: '0 0 12px',
    fontSize: 14,
    fontWeight: 600,
    color: '#94a3b8',
  },
  formsBadges: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
  },
  formBadge: {
    padding: '6px 12px',
    background: 'rgba(99, 102, 241, 0.15)',
    border: '1px solid rgba(99, 102, 241, 0.3)',
    borderRadius: 8,
    fontSize: 13,
    color: '#e2e8f0',
  },
  recommendedCard: {
    margin: '0 24px 16px',
    background: 'rgba(255,255,255,0.02)',
    borderRadius: 16,
    border: '2px solid',
    overflow: 'hidden',
  },
  recommendedBadge: {
    padding: 8,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: 600,
    color: '#fff',
  },
  recommendedContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  recommendedLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  planIcon: {
    fontSize: 32,
  },
  planName: {
    fontSize: 18,
    fontWeight: 700,
    color: '#fff',
    margin: 0,
  },
  planDesc: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  priceBox: {
    textAlign: 'right',
  },
  priceAmount: {
    fontSize: 28,
    fontWeight: 800,
    color: '#10b981',
  },
  pricePer: {
    display: 'block',
    fontSize: 12,
    color: '#64748b',
  },
  reasonsRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
    padding: '12px 16px',
    background: 'rgba(255,255,255,0.02)',
    borderTop: '1px solid rgba(255,255,255,0.05)',
  },
  reasonChip: {
    fontSize: 11,
    padding: '4px 10px',
    background: 'rgba(99,102,241,0.2)',
    borderRadius: 6,
    color: '#c7d2fe',
  },
  stateRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 24px',
    background: 'rgba(255,255,255,0.02)',
  },
  stateLabel: {
    fontSize: 14,
    color: '#e2e8f0',
    fontWeight: 500,
  },
  statePrice: {
    fontSize: 13,
    color: '#10b981',
    marginLeft: 8,
    fontWeight: 600,
  },
  toggleGroup: {
    display: 'flex',
    gap: 4,
  },
  toggleBtn: {
    padding: '8px 16px',
    borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.1)',
    background: 'transparent',
    color: '#64748b',
    fontSize: 13,
    cursor: 'pointer',
  },
  toggleActive: {
    background: 'rgba(99,102,241,0.2)',
    borderColor: '#6366f1',
    color: '#fff',
  },
  allPlans: {
    padding: '16px 24px',
    overflowX: 'auto',
  },
  allPlansLabel: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 12,
  },
  plansRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 8,
  },
  planBtn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    padding: '12px 8px',
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 12,
    cursor: 'pointer',
    position: 'relative',
  },
  planBtnIcon: {
    fontSize: 20,
  },
  planBtnName: {
    fontSize: 11,
    color: '#e2e8f0',
    fontWeight: 600,
  },
  planBtnPrice: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: 700,
  },
  checkMark: {
    position: 'absolute',
    top: 4,
    right: 4,
    fontSize: 10,
    color: '#10b981',
  },
  priceSummary: {
    margin: '0 24px',
    padding: 16,
    background: 'rgba(0,0,0,0.2)',
    borderRadius: 12,
  },
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 8,
  },
  summaryDivider: {
    height: 1,
    background: 'rgba(255,255,255,0.1)',
    margin: '12px 0',
  },
  summaryTotal: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 16,
    fontWeight: 600,
    color: '#fff',
  },
  totalPrice: {
    color: '#10b981',
    fontSize: 20,
    fontWeight: 700,
  },
  continueBtn: {
    display: 'block',
    width: 'calc(100% - 48px)',
    margin: '20px 24px',
    padding: 16,
    border: 'none',
    borderRadius: 12,
    color: '#fff',
    fontSize: 16,
    fontWeight: 700,
    cursor: 'pointer',
  },
  paymentSummary: {
    padding: '20px 24px',
  },
  paymentPlan: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    background: 'rgba(255,255,255,0.02)',
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.1)',
  },
  paymentTotal: {
    marginLeft: 'auto',
    fontSize: 24,
    fontWeight: 800,
    color: '#10b981',
  },
  paymentMethods: {
    padding: '0 24px 20px',
  },
  stripeBtn: {
    width: '100%',
    padding: 16,
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    border: 'none',
    borderRadius: 12,
    color: '#fff',
    fontSize: 16,
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
  },
  stripeLogos: {
    fontSize: 12,
    opacity: 0.8,
  },
  orDivider: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    margin: '16px 0',
    color: '#64748b',
    fontSize: 13,
  },
  orLine: {
    flex: 1,
    height: 1,
    background: 'rgba(255,255,255,0.1)',
  },
  paypalBtn: {
    width: '100%',
    padding: 14,
    background: '#ffc439',
    border: 'none',
    borderRadius: 12,
    color: '#003087',
    fontSize: 16,
    fontWeight: 700,
    cursor: 'pointer',
  },
  securityBadge: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    fontSize: 12,
    color: '#64748b',
  },
  backBtn: {
    display: 'block',
    width: '100%',
    padding: 12,
    background: 'transparent',
    border: 'none',
    color: '#60a5fa',
    fontSize: 14,
    cursor: 'pointer',
  },
  footer: {
    display: 'flex',
    justifyContent: 'center',
    gap: 12,
    padding: '16px 24px',
    borderTop: '1px solid rgba(255,255,255,0.05)',
    fontSize: 11,
    color: '#64748b',
  },
};