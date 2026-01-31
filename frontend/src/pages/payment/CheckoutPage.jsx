// ============================================================
// CHECKOUT PAGE - v2.0 FIXED
// ============================================================
// Location: frontend/src/pages/CheckoutPage.jsx
// ✅ FIXED: Pricing matches PricingPage.jsx
// ✅ FIXED: Handles CPA fee calculation
// ✅ FIXED: Reads URL params (cpa, state)
// ✅ FIXED: Redirects to dashboard/download after payment
// ============================================================

import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const STRIPE_PUBLIC_KEY = import.meta.env.VITE_STRIPE_PUBLIC_KEY;

// Initialize Stripe
const stripePromise = STRIPE_PUBLIC_KEY ? loadStripe(STRIPE_PUBLIC_KEY) : null;

// ============================================================
// PRICING - MUST MATCH PricingPage.jsx EXACTLY
// Prices in DOLLARS (not cents)
// ============================================================
const CPA_FEE_PER_FORM = 59; // $59 per form

const PRICING_PLANS = {
  free: {
    id: 'free',
    name: 'Free Estimate',
    price: 0,
    icon: '🆓',
    description: 'View estimate only',
  },
  basic: {
    id: 'basic',
    name: 'Basic',
    price: 29.99,
    icon: '📄',
    description: 'Simple W-2 income only',
  },
  standard: {
    id: 'standard',
    name: 'Standard',
    price: 49.99,
    icon: '⭐',
    description: 'Most popular for employees',
    popular: true,
  },
  plus: {
    id: 'plus',
    name: 'Plus',
    price: 79.99,
    icon: '💎',
    description: 'Multiple income sources',
  },
  selfEmployed: {
    id: 'selfEmployed',
    name: 'Self-Employed',
    price: 89.99,
    icon: '💼',
    description: 'Freelancers & gig workers',
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    price: 129.99,
    icon: '👑',
    description: 'High income & complex returns',
  },
};

// ============================================================
// PAYMENT FORM COMPONENT
// ============================================================
function PaymentForm({ plan, totalAmount, clientSecret, onSuccess }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [cardComplete, setCardComplete] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!stripe || !elements) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(
        clientSecret,
        {
          payment_method: {
            card: elements.getElement(CardElement),
          }
        }
      );
      
      if (stripeError) {
        setError(stripeError.message);
        setLoading(false);
        return;
      }
      
      if (paymentIntent.status === 'succeeded') {
        // Confirm with backend
        const token = localStorage.getItem('taxsky_token') || localStorage.getItem('token');
        await fetch(`${API_URL}/api/payments/confirm`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ paymentIntentId: paymentIntent.id })
        });
        
        onSuccess(paymentIntent);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const cardStyle = {
    style: {
      base: {
        fontSize: '16px',
        color: '#1e293b',
        fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
        '::placeholder': {
          color: '#94a3b8',
        },
      },
      invalid: {
        color: '#ef4444',
      },
    },
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Card Input */}
      <div style={styles.cardSection}>
        <label style={styles.cardLabel}>💳 Card Information</label>
        <div style={styles.cardInputWrapper}>
          <CardElement 
            options={cardStyle}
            onChange={(e) => setCardComplete(e.complete)}
          />
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div style={styles.errorBox}>
          ❌ {error}
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={!stripe || loading || !cardComplete}
        style={{
          ...styles.payButton,
          opacity: loading || !cardComplete ? 0.6 : 1,
          cursor: loading || !cardComplete ? 'not-allowed' : 'pointer',
        }}
      >
        {loading ? (
          <>
            <span style={styles.spinner}></span>
            Processing...
          </>
        ) : (
          <>
            🔒 Pay ${totalAmount.toFixed(2)}
          </>
        )}
      </button>

      <p style={styles.secureNote}>
        🔐 Secure payment powered by Stripe
      </p>
    </form>
  );
}

// ============================================================
// CHECKOUT PAGE - MAIN COMPONENT
// ============================================================
export default function CheckoutPage() {
  const { planId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [plan, setPlan] = useState(null);
  const [includeCPA, setIncludeCPA] = useState(false);
  const [includeState, setIncludeState] = useState(true);
  const [clientSecret, setClientSecret] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  
  // Get user from localStorage
  const user = JSON.parse(localStorage.getItem('taxsky_user') || localStorage.getItem('user') || '{}');
  const token = localStorage.getItem('taxsky_token') || localStorage.getItem('token');
  const userId = user.id || user.userId || user._id;

  // Calculate pricing
  const formCount = includeState ? 2 : 1; // Federal + State
  const cpaFee = includeCPA ? CPA_FEE_PER_FORM * formCount : 0;
  const planPrice = plan?.price || 0;
  const totalPrice = includeCPA ? planPrice + cpaFee : 0; // Self-file is FREE

  useEffect(() => {
    // Check authentication
    if (!userId) {
      console.error('[CHECKOUT] No user found, redirecting to login');
      localStorage.setItem('taxsky_redirect_after_login', `/checkout/${planId}${window.location.search}`);
      navigate('/login');
      return;
    }
    
    // Validate plan
    if (!PRICING_PLANS[planId]) {
      console.error('[CHECKOUT] Invalid plan:', planId);
      navigate('/pricing');
      return;
    }
    
    // Set plan
    setPlan(PRICING_PLANS[planId]);
    
    // Read URL params
    const cpaParam = searchParams.get('cpa') === 'true';
    const stateParam = searchParams.get('state') !== 'false'; // Default true
    
    setIncludeCPA(cpaParam);
    setIncludeState(stateParam);
    
    // If no CPA (self-file is FREE), redirect to dashboard
    if (!cpaParam) {
      console.log('[CHECKOUT] Self-file is free, redirecting to dashboard');
      navigate('/dashboard');
      return;
    }
    
    // Create payment intent for CPA
    createPaymentIntent(cpaParam, stateParam);
  }, [planId]);

  async function createPaymentIntent(withCPA, withState) {
    setLoading(true);
    setError(null);
    
    try {
      const formCount = withState ? 2 : 1;
      const cpaFee = withCPA ? CPA_FEE_PER_FORM * formCount : 0;
      const planPrice = PRICING_PLANS[planId]?.price || 0;
      const total = withCPA ? planPrice + cpaFee : 0;
      
      // If total is 0 (self-file), no payment needed
      if (total === 0) {
        setLoading(false);
        navigate('/dashboard');
        return;
      }
      
      // Convert to cents for Stripe
      const amountInCents = Math.round(total * 100);
      
      console.log('[CHECKOUT] Creating payment intent:', {
        userId,
        planId,
        withCPA,
        withState,
        total,
        amountInCents
      });
      
      const res = await fetch(`${API_URL}/api/payments/create-intent`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: userId,
          email: user.email,
          name: user.name || user.displayName || 'User',
          planId: planId,
          amount: amountInCents, // Send calculated amount
          includeCPA: withCPA,
          includeState: withState,
          taxYear: 2025
        })
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error('[CHECKOUT] Server error:', res.status, errorText);
        setError(`Server error: ${res.status}`);
        return;
      }
      
      const data = await res.json();
      
      console.log('[CHECKOUT] Response:', data);
      
      // Handle already paid
      if (data.alreadyPaid) {
        alert('You have already purchased this plan!');
        navigate('/dashboard');
        return;
      }
      
      // Handle errors
      if (!data.success) {
        setError(data.error || 'Failed to create payment');
        return;
      }
      
      // Set client secret for Stripe
      if (data.clientSecret) {
        setClientSecret(data.clientSecret);
      } else {
        setError('No client secret received from server');
      }
      
    } catch (err) {
      console.error('[CHECKOUT] Error:', err);
      setError(err.message || 'Failed to connect to payment server');
    } finally {
      setLoading(false);
    }
  }

  function handleSuccess(paymentIntent) {
    setSuccess(true);
    
    // Store payment info
    localStorage.setItem('taxsky_payment_complete', JSON.stringify({
      planId,
      includeCPA,
      includeState,
      paymentIntentId: paymentIntent.id,
      paidAt: new Date().toISOString()
    }));
  }

  // Success Page
  if (success) {
    return (
      <div style={styles.successPage}>
        <div style={styles.successCard}>
          <div style={styles.successIcon}>🎉</div>
          <h1 style={styles.successTitle}>Payment Successful!</h1>
          <p style={styles.successText}>
            Thank you for purchasing <strong>{plan?.name}</strong> with CPA Review
          </p>
          
          <div style={styles.successDetails}>
            <div style={styles.successRow}>
              <span>Plan</span>
              <span>{plan?.icon} {plan?.name}</span>
            </div>
            <div style={styles.successRow}>
              <span>CPA Review</span>
              <span>✅ Included</span>
            </div>
            {includeState && (
              <div style={styles.successRow}>
                <span>State Return</span>
                <span>✅ California</span>
              </div>
            )}
            <div style={{...styles.successRow, borderTop: '1px solid #e2e8f0', paddingTop: '12px', fontWeight: '600'}}>
              <span>Total Paid</span>
              <span style={{color: '#22c55e'}}>${totalPrice.toFixed(2)}</span>
            </div>
          </div>
          
          <p style={{color: '#64748b', fontSize: '14px', marginBottom: '24px'}}>
            👨‍💼 A CPA will review your return within 24-48 hours
          </p>
          
          <button
            onClick={() => navigate('/dashboard')}
            style={styles.successButton}
          >
            Continue to Dashboard →
          </button>
        </div>
      </div>
    );
  }

  // Main Checkout Page
  return (
    <div style={styles.checkoutPage}>
      <div style={styles.checkoutContainer}>
        {/* Left Panel: Order Summary */}
        <div style={styles.leftPanel}>
          <div style={styles.brandHeader}>
            <span style={styles.brandLogo}>🌤️</span>
            <span style={styles.brandName}>TaxSky</span>
          </div>
          
          {/* Selected Plan */}
          <div style={styles.planSection}>
            <p style={styles.planLabel}>You're purchasing</p>
            <div style={styles.planBadge}>
              <span style={styles.planIcon}>{plan?.icon}</span>
              <div>
                <h3 style={styles.planName}>{plan?.name}</h3>
                <p style={styles.planDesc}>{plan?.description}</p>
              </div>
            </div>
          </div>
          
          {/* Price Breakdown */}
          <div style={styles.priceBreakdown}>
            <div style={styles.priceRow}>
              <span>{plan?.name} Plan</span>
              <span>${planPrice.toFixed(2)}</span>
            </div>
            {includeCPA && (
              <>
                <div style={styles.priceRow}>
                  <span>CPA Fee (Federal)</span>
                  <span>${CPA_FEE_PER_FORM.toFixed(2)}</span>
                </div>
                {includeState && (
                  <div style={styles.priceRow}>
                    <span>CPA Fee (State CA)</span>
                    <span>${CPA_FEE_PER_FORM.toFixed(2)}</span>
                  </div>
                )}
              </>
            )}
          </div>
          
          {/* Total */}
          <div style={styles.totalRow}>
            <span>Total</span>
            <span style={styles.totalAmount}>${totalPrice.toFixed(2)}</span>
          </div>
          
          {/* Guarantees */}
          <div style={styles.guarantees}>
            <p>✓ 30-day money-back guarantee</p>
            <p>✓ CPA review within 24-48 hours</p>
            <p>✓ Secure payment via Stripe</p>
            <p>✓ IRS-authorized e-file</p>
          </div>
        </div>

        {/* Right Panel: Payment Form */}
        <div style={styles.rightPanel}>
          <h2 style={styles.formTitle}>Complete Payment</h2>
          <p style={styles.formSubtitle}>Enter your card details below</p>
          
          {/* User Info */}
          <div style={styles.userInfo}>
            <div style={styles.userAvatar}>
              {user.name?.[0] || user.email?.[0] || 'U'}
            </div>
            <div>
              <div style={styles.userName}>{user.name || 'User'}</div>
              <div style={styles.userEmail}>{user.email}</div>
            </div>
          </div>
          
          {/* Loading State */}
          {loading ? (
            <div style={styles.loadingBox}>
              <div style={styles.spinnerLarge}></div>
              <p>Preparing checkout...</p>
            </div>
          ) : error ? (
            <div style={styles.errorState}>
              <p style={styles.errorText}>❌ {error}</p>
              <button
                onClick={() => createPaymentIntent(includeCPA, includeState)}
                style={styles.retryButton}
              >
                Try Again
              </button>
              <button
                onClick={() => navigate('/pricing')}
                style={styles.backButton}
              >
                Back to Pricing
              </button>
            </div>
          ) : clientSecret && stripePromise ? (
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <PaymentForm 
                plan={plan}
                totalAmount={totalPrice}
                clientSecret={clientSecret}
                onSuccess={handleSuccess}
              />
            </Elements>
          ) : !stripePromise ? (
            <div style={styles.warningBox}>
              ⚠️ Stripe is not configured. Please set VITE_STRIPE_PUBLIC_KEY in your .env file.
            </div>
          ) : null}
        </div>
      </div>
      
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// ============================================================
// STYLES
// ============================================================
const styles = {
  checkoutPage: {
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
  },
  
  checkoutContainer: {
    backgroundColor: 'white',
    borderRadius: '24px',
    boxShadow: '0 25px 60px rgba(0,0,0,0.12)',
    overflow: 'hidden',
    display: 'flex',
    maxWidth: '950px',
    width: '100%',
  },
  
  // Left Panel
  leftPanel: {
    backgroundColor: '#1e293b',
    color: 'white',
    padding: '40px',
    width: '45%',
    display: 'flex',
    flexDirection: 'column',
  },
  
  brandHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '32px',
  },
  
  brandLogo: {
    fontSize: '28px',
  },
  
  brandName: {
    fontSize: '24px',
    fontWeight: '700',
  },
  
  planSection: {
    marginBottom: '24px',
  },
  
  planLabel: {
    color: '#94a3b8',
    fontSize: '14px',
    marginBottom: '12px',
  },
  
  planBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: '14px',
    padding: '16px',
  },
  
  planIcon: {
    fontSize: '32px',
  },
  
  planName: {
    margin: 0,
    fontSize: '20px',
    fontWeight: '700',
  },
  
  planDesc: {
    margin: '4px 0 0',
    color: '#94a3b8',
    fontSize: '14px',
  },
  
  priceBreakdown: {
    borderTop: '1px solid #334155',
    paddingTop: '24px',
    marginBottom: '16px',
  },
  
  priceRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '12px',
    fontSize: '15px',
    color: '#cbd5e1',
  },
  
  totalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    borderTop: '1px solid #334155',
    paddingTop: '20px',
    fontSize: '22px',
    fontWeight: '700',
  },
  
  totalAmount: {
    color: '#22c55e',
  },
  
  guarantees: {
    marginTop: 'auto',
    paddingTop: '32px',
    fontSize: '13px',
    color: '#64748b',
    lineHeight: 1.8,
  },
  
  // Right Panel
  rightPanel: {
    padding: '40px',
    flex: 1,
  },
  
  formTitle: {
    margin: '0 0 8px',
    fontSize: '24px',
    fontWeight: '700',
    color: '#1e293b',
  },
  
  formSubtitle: {
    color: '#64748b',
    marginBottom: '28px',
  },
  
  // User Info
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '24px',
  },
  
  userAvatar: {
    width: '44px',
    height: '44px',
    borderRadius: '50%',
    backgroundColor: '#6366f1',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '700',
    fontSize: '18px',
    textTransform: 'uppercase',
  },
  
  userName: {
    fontWeight: '600',
    color: '#1e293b',
  },
  
  userEmail: {
    fontSize: '14px',
    color: '#64748b',
  },
  
  // Card Section
  cardSection: {
    marginBottom: '24px',
  },
  
  cardLabel: {
    display: 'block',
    marginBottom: '10px',
    fontWeight: '600',
    color: '#475569',
    fontSize: '14px',
  },
  
  cardInputWrapper: {
    backgroundColor: 'white',
    border: '2px solid #e2e8f0',
    borderRadius: '10px',
    padding: '16px',
    transition: 'border-color 0.2s',
  },
  
  // Buttons
  payButton: {
    width: '100%',
    padding: '16px',
    fontSize: '17px',
    fontWeight: '700',
    borderRadius: '12px',
    border: 'none',
    backgroundColor: '#22c55e',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'all 0.2s',
  },
  
  secureNote: {
    textAlign: 'center',
    marginTop: '16px',
    fontSize: '13px',
    color: '#64748b',
  },
  
  // States
  loadingBox: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#64748b',
  },
  
  spinnerLarge: {
    width: '40px',
    height: '40px',
    border: '4px solid #e2e8f0',
    borderTopColor: '#6366f1',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 16px',
  },
  
  spinner: {
    width: '20px',
    height: '20px',
    border: '3px solid rgba(255,255,255,0.3)',
    borderTopColor: 'white',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  
  errorState: {
    textAlign: 'center',
    padding: '40px 20px',
  },
  
  errorText: {
    color: '#dc2626',
    marginBottom: '20px',
    fontSize: '16px',
  },
  
  errorBox: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#dc2626',
    padding: '14px 18px',
    borderRadius: '10px',
    marginBottom: '20px',
    fontSize: '14px',
  },
  
  warningBox: {
    backgroundColor: '#fefce8',
    border: '1px solid #fef08a',
    color: '#a16207',
    padding: '14px 18px',
    borderRadius: '10px',
    fontSize: '14px',
  },
  
  retryButton: {
    padding: '12px 28px',
    backgroundColor: '#6366f1',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontWeight: '600',
    cursor: 'pointer',
    marginRight: '12px',
  },
  
  backButton: {
    padding: '12px 28px',
    backgroundColor: 'white',
    color: '#475569',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  
  // Success Page
  successPage: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0fdf4',
    padding: '20px',
  },
  
  successCard: {
    backgroundColor: 'white',
    borderRadius: '24px',
    padding: '48px',
    textAlign: 'center',
    maxWidth: '500px',
    width: '100%',
    boxShadow: '0 25px 60px rgba(34, 197, 94, 0.15)',
  },
  
  successIcon: {
    fontSize: '72px',
    marginBottom: '24px',
  },
  
  successTitle: {
    color: '#166534',
    marginBottom: '12px',
    fontSize: '28px',
  },
  
  successText: {
    color: '#64748b',
    marginBottom: '24px',
    fontSize: '17px',
  },
  
  successDetails: {
    backgroundColor: '#f0fdf4',
    borderRadius: '14px',
    padding: '20px',
    marginBottom: '24px',
    textAlign: 'left',
  },
  
  successRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '10px 0',
    color: '#475569',
    fontSize: '15px',
  },
  
  successButton: {
    padding: '16px 36px',
    fontSize: '17px',
    fontWeight: '600',
    borderRadius: '12px',
    border: 'none',
    backgroundColor: '#22c55e',
    color: 'white',
    cursor: 'pointer',
  },
};