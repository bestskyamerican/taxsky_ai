// ============================================================
// CHECKOUT PAGE - FIXED Stripe Payment Form
// ============================================================
// Location: frontend/src/pages/CheckoutPage.jsx
// FIXES:
// 1. Changed productType → planId (to match backend)
// 2. Updated plans to match backend PRICING exactly
// 3. Added support for state addon from URL params
// 4. Better error handling and loading states
// ============================================================

import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const STRIPE_PUBLIC_KEY = import.meta.env.VITE_STRIPE_PUBLIC_KEY;

// Initialize Stripe
const stripePromise = STRIPE_PUBLIC_KEY ? loadStripe(STRIPE_PUBLIC_KEY) : null;

// ============================================================
// PRICING - Must match backend paymentController.js EXACTLY
// Backend uses cents (2999 = $29.99)
// ============================================================
const PRICING = {
  free: {
    id: 'free',
    name: 'Free Estimate',
    price: 0,
    description: 'See your refund before you pay',
  },
  basic: {
    id: 'basic',
    name: 'Basic',
    price: 2999, // $29.99
    description: 'Simple W-2 income only',
  },
  standard: {
    id: 'standard',
    name: 'Standard',
    price: 4999, // $49.99
    description: 'Most popular for employees',
  },
  plus: {
    id: 'plus',
    name: 'Plus',
    price: 7999, // $79.99
    description: 'Multiple income sources',
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    price: 12999, // $129.99
    description: 'High income & complex returns',
  },
  selfEmployed: {
    id: 'selfEmployed',
    name: 'Self-Employed',
    price: 8999, // $89.99
    description: 'Freelancers & gig workers',
  },
};

const ADDONS = {
  state: { id: 'state', name: 'State Tax Return', price: 2499 }, // $24.99
  cpa_review: { id: 'cpa_review', name: 'CPA Review', price: 4999 },
  audit_protection: { id: 'audit_protection', name: 'Audit Protection', price: 3999 },
};

// ============================================================
// PAYMENT FORM COMPONENT
// ============================================================
function PaymentForm({ plan, addons, totalAmount, clientSecret, onSuccess }) {
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
        const token = localStorage.getItem('token');
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
      {/* User Info Display */}
      <div style={styles.userInfo}>
        <div style={styles.userAvatar}>
          {JSON.parse(localStorage.getItem('user') || '{}').name?.[0] || 'U'}
        </div>
        <div>
          <div style={styles.userName}>
            {JSON.parse(localStorage.getItem('user') || '{}').name || 'User'}
          </div>
          <div style={styles.userEmail}>
            {JSON.parse(localStorage.getItem('user') || '{}').email}
          </div>
        </div>
      </div>

      {/* Card Input */}
      <div style={styles.cardSection}>
        <label style={styles.cardLabel}>Card Information</label>
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
            🔒 Pay ${(totalAmount / 100).toFixed(2)}
          </>
        )}
      </button>

      <p style={styles.secureNote}>
        🔐 Your payment is secure and encrypted with 256-bit SSL
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
  const [selectedAddons, setSelectedAddons] = useState([]);
  const [clientSecret, setClientSecret] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  
  // Get user from localStorage
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const token = localStorage.getItem('token');

  // Calculate total
  const calculateTotal = () => {
    let total = plan?.price || 0;
    selectedAddons.forEach(addonId => {
      if (ADDONS[addonId]) {
        total += ADDONS[addonId].price;
      }
    });
    return total;
  };

  useEffect(() => {
    // Check authentication
    if (!user.id && !user.userId && !user._id) {
      console.error('No user found, redirecting to login');
      navigate('/login');
      return;
    }
    
    // Validate plan
    if (!PRICING[planId]) {
      console.error('Invalid plan:', planId);
      navigate('/pricing');
      return;
    }
    
    setPlan(PRICING[planId]);
    
    // Check for state addon in URL params
    const includeState = searchParams.get('state') === 'true';
    if (includeState) {
      setSelectedAddons(['state']);
    }
    
    // Create payment intent
    createPaymentIntent(includeState ? ['state'] : []);
  }, [planId]);

  async function createPaymentIntent(addons = []) {
    setLoading(true);
    setError(null);
    
    try {
      const userId = user.id || user.userId || user._id;
      
      console.log('[CHECKOUT] Creating payment intent:', {
        userId,
        email: user.email,
        planId,
        addons
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
          planId: planId,  // ✅ FIXED: was "productType"
          addons: addons,
          taxYear: 2024
        })
      });
      
      // Check if response is OK before parsing
      if (!res.ok) {
        const errorText = await res.text();
        console.error('[CHECKOUT] Server error:', res.status, errorText);
        try {
          const errorJson = JSON.parse(errorText);
          setError(errorJson.error || `Server error: ${res.status}`);
        } catch {
          setError(`Server error: ${res.status} - ${errorText.substring(0, 100)}`);
        }
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
      
      // Handle free plan
      if (data.free) {
        setSuccess(true);
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

  function toggleAddon(addonId) {
    const newAddons = selectedAddons.includes(addonId)
      ? selectedAddons.filter(id => id !== addonId)
      : [...selectedAddons, addonId];
    
    setSelectedAddons(newAddons);
    // Recreate payment intent with new addons
    createPaymentIntent(newAddons);
  }

  function handleSuccess(paymentIntent) {
    setSuccess(true);
  }

  // ============================================================
  // SUCCESS SCREEN
  // ============================================================
  if (success) {
    return (
      <div style={styles.successPage}>
        <div style={styles.successCard}>
          <div style={styles.successIcon}>🎉</div>
          <h1 style={styles.successTitle}>Payment Successful!</h1>
          <p style={styles.successText}>
            Thank you for purchasing <strong>{plan?.name}</strong>
          </p>
          
          <div style={styles.successDetails}>
            <div style={styles.successRow}>
              <span>Plan</span>
              <span>{plan?.name}</span>
            </div>
            <div style={styles.successRow}>
              <span>Amount</span>
              <span>${(calculateTotal() / 100).toFixed(2)}</span>
            </div>
            <div style={styles.successRow}>
              <span>Email</span>
              <span>{user.email}</span>
            </div>
          </div>
          
          <button
            onClick={() => navigate('/taxchat')}
            style={styles.successButton}
          >
            Start Filing Your Taxes →
          </button>
        </div>
      </div>
    );
  }

  // ============================================================
  // MAIN CHECKOUT UI
  // ============================================================
  return (
    <div style={styles.page}>
      <div style={styles.container}>
        
        {/* Left: Order Summary */}
        <div style={styles.leftPanel}>
          <div style={styles.logo}>
            <span style={styles.logoIcon}>🌤️</span>
            <span style={styles.logoText}>TaxSky</span>
          </div>
          
          <div style={styles.planInfo}>
            <p style={styles.planLabel}>You're purchasing</p>
            <div style={styles.planBadge}>
              <span style={styles.planIcon}>👑</span>
              <div>
                <h3 style={styles.planName}>{plan?.name || 'Loading...'}</h3>
                <p style={styles.planDesc}>Federal + State Filing</p>
              </div>
            </div>
          </div>
          
          {/* Price Breakdown */}
          <div style={styles.priceBreakdown}>
            <div style={styles.priceRow}>
              <span>Subtotal</span>
              <span>${plan ? (plan.price / 100).toFixed(2) : '0.00'}</span>
            </div>
            
            {selectedAddons.map(addonId => (
              <div key={addonId} style={styles.priceRow}>
                <span>{ADDONS[addonId]?.name}</span>
                <span>${(ADDONS[addonId]?.price / 100).toFixed(2)}</span>
              </div>
            ))}
            
            <div style={styles.priceRow}>
              <span>Tax</span>
              <span>$0.00</span>
            </div>
          </div>
          
          <div style={styles.totalRow}>
            <span>Total</span>
            <span style={styles.totalAmount}>
              ${(calculateTotal() / 100).toFixed(2)}
            </span>
          </div>
          
          {/* Guarantees */}
          <div style={styles.guarantees}>
            <p>✓ 30-day money-back guarantee</p>
            <p>✓ Secure payment via Stripe</p>
            <p>✓ Instant access after payment</p>
          </div>
        </div>

        {/* Right: Payment Form */}
        <div style={styles.rightPanel}>
          <h2 style={styles.formTitle}>Payment Details</h2>
          <p style={styles.formSubtitle}>Complete your purchase securely</p>
          
          {/* Add-ons Selection */}
          {!loading && plan && plan.price > 0 && (
            <div style={styles.addonsSection}>
              <p style={styles.addonsLabel}>Add to your order:</p>
              {Object.values(ADDONS).map(addon => (
                <label key={addon.id} style={styles.addonItem}>
                  <input
                    type="checkbox"
                    checked={selectedAddons.includes(addon.id)}
                    onChange={() => toggleAddon(addon.id)}
                    style={styles.addonCheckbox}
                  />
                  <span style={styles.addonName}>{addon.name}</span>
                  <span style={styles.addonPrice}>
                    +${(addon.price / 100).toFixed(2)}
                  </span>
                </label>
              ))}
            </div>
          )}
          
          {/* Loading State */}
          {loading && (
            <div style={styles.loadingBox}>
              <div style={styles.spinnerLarge}></div>
              <p>Preparing checkout...</p>
            </div>
          )}
          
          {/* Error State */}
          {error && !loading && (
            <div style={styles.errorState}>
              <p style={styles.errorText}>❌ {error}</p>
              <button
                onClick={() => createPaymentIntent(selectedAddons)}
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
          )}
          
          {/* Payment Form */}
          {!loading && !error && clientSecret && stripePromise && (
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <PaymentForm 
                plan={plan}
                addons={selectedAddons}
                totalAmount={calculateTotal()}
                clientSecret={clientSecret}
                onSuccess={handleSuccess}
              />
            </Elements>
          )}
          
          {/* Missing Stripe Key Warning */}
          {!STRIPE_PUBLIC_KEY && (
            <div style={styles.warningBox}>
              ⚠️ Stripe public key not configured. Add VITE_STRIPE_PUBLIC_KEY to your .env file.
            </div>
          )}
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
  page: {
    minHeight: '100vh',
    backgroundColor: '#f1f5f9',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
  },
  
  container: {
    backgroundColor: 'white',
    borderRadius: '24px',
    boxShadow: '0 25px 80px rgba(0,0,0,0.12)',
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
    width: '42%',
    display: 'flex',
    flexDirection: 'column',
  },
  
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '40px',
  },
  
  logoIcon: {
    fontSize: '28px',
  },
  
  logoText: {
    fontSize: '24px',
    fontWeight: '700',
  },
  
  planInfo: {
    marginBottom: '32px',
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
  },
  
  userName: {
    fontWeight: '600',
    color: '#1e293b',
  },
  
  userEmail: {
    fontSize: '14px',
    color: '#64748b',
  },
  
  // Add-ons
  addonsSection: {
    marginBottom: '24px',
    padding: '16px',
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
  },
  
  addonsLabel: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#475569',
    marginBottom: '12px',
  },
  
  addonItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '10px 0',
    borderBottom: '1px solid #e2e8f0',
    cursor: 'pointer',
  },
  
  addonCheckbox: {
    marginRight: '12px',
    width: '18px',
    height: '18px',
    cursor: 'pointer',
  },
  
  addonName: {
    flex: 1,
    fontSize: '14px',
    color: '#334155',
  },
  
  addonPrice: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#6366f1',
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
    padding: '56px',
    textAlign: 'center',
    maxWidth: '500px',
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
    marginBottom: '28px',
    fontSize: '17px',
  },
  
  successDetails: {
    backgroundColor: '#f0fdf4',
    borderRadius: '14px',
    padding: '20px',
    marginBottom: '28px',
  },
  
  successRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
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