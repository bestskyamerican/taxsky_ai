// ============================================================
// CHECKOUT PAGE - Stripe Payment Form
// ============================================================
// Location: frontend/src/pages/CheckoutPage.jsx
// ============================================================

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const STRIPE_PUBLIC_KEY = import.meta.env.VITE_STRIPE_PUBLIC_KEY;

// Initialize Stripe
const stripePromise = loadStripe(STRIPE_PUBLIC_KEY);

// ============================================================
// PAYMENT FORM COMPONENT
// ============================================================
function PaymentForm({ plan, clientSecret, onSuccess }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [cardComplete, setCardComplete] = useState(false);
  const [cardholderName, setCardholderName] = useState('');

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
            billing_details: {
              name: cardholderName,
            },
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
      {/* Cardholder Name */}
      <div style={{
        backgroundColor: '#f8fafc',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '20px'
      }}>
        <label style={{ 
          display: 'block', 
          marginBottom: '12px', 
          fontWeight: '600',
          color: '#475569'
        }}>
          Cardholder Name
        </label>
        <input
          type="text"
          placeholder="John Smith"
          value={cardholderName}
          onChange={(e) => setCardholderName(e.target.value)}
          style={{
            width: '100%',
            backgroundColor: 'white',
            border: '2px solid #e2e8f0',
            borderRadius: '8px',
            padding: '14px',
            fontSize: '16px',
            color: '#1e293b',
            outline: 'none',
            boxSizing: 'border-box',
            transition: 'border-color 0.2s',
          }}
          onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
          onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
        />
      </div>

      {/* Card Information */}
      <div style={{
        backgroundColor: '#f8fafc',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '20px'
      }}>
        <label style={{ 
          display: 'block', 
          marginBottom: '12px', 
          fontWeight: '600',
          color: '#475569'
        }}>
          Card Information
        </label>
        <div style={{
          backgroundColor: 'white',
          border: '2px solid #e2e8f0',
          borderRadius: '8px',
          padding: '14px'
        }}>
          <CardElement 
            options={cardStyle}
            onChange={(e) => setCardComplete(e.complete)}
          />
        </div>
      </div>

      {error && (
        <div style={{
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          color: '#dc2626',
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '20px',
          fontSize: '14px'
        }}>
          ❌ {error}
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || loading || !cardComplete || !cardholderName.trim()}
        style={{
          width: '100%',
          padding: '16px',
          fontSize: '18px',
          fontWeight: '700',
          borderRadius: '12px',
          border: 'none',
          backgroundColor: loading || !cardComplete || !cardholderName.trim() ? '#94a3b8' : '#22c55e',
          color: 'white',
          cursor: loading || !cardComplete || !cardholderName.trim() ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px'
        }}
      >
        {loading ? (
          <>
            <span className="spinner"></span>
            Processing...
          </>
        ) : (
          <>
            🔒 Pay ${(plan.price / 100).toFixed(2)}
          </>
        )}
      </button>

      <p style={{ 
        textAlign: 'center', 
        marginTop: '16px', 
        fontSize: '13px',
        color: '#64748b'
      }}>
        Your payment is secure and encrypted
      </p>
    </form>
  );
}

// ============================================================
// CHECKOUT PAGE
// ============================================================
export default function CheckoutPage() {
  const { planId } = useParams();
  const navigate = useNavigate();
  
  const [plan, setPlan] = useState(null);
  const [clientSecret, setClientSecret] = useState(null);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState(null);
  const [cpaBidData, setCpaBidData] = useState(null); // CPA bid info from localStorage
  
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const token = localStorage.getItem('token');

  const plans = {
    standard: { id: 'standard', name: 'Standard Filing', price: 2999 },
    premium: { id: 'premium', name: 'Premium Filing', price: 4999 },
    state_filing: { id: 'state_filing', name: 'Additional State', price: 1499 },
    audit_protection: { id: 'audit_protection', name: 'Audit Protection', price: 1999 }
  };

  useEffect(() => {
    if (!user.id && !user.userId) {
      navigate('/login');
      return;
    }
    
    // ── CPA Bid Checkout (dynamic price from localStorage) ──
    if (planId === 'cpa-review') {
      try {
        const saved = JSON.parse(localStorage.getItem('taxsky_payment') || '{}');
        if (saved.cpaBid && saved.totalPrice) {
          const cpaPlan = {
            id: 'cpa-review',
            name: saved.planName || `CPA Review by ${saved.cpaBid.cpa_name}`,
            price: saved.totalPrice, // already in cents
          };
          setPlan(cpaPlan);
          setCpaBidData(saved.cpaBid);
          createPaymentIntent(saved.totalPrice);
        } else {
          alert('CPA bid info missing. Please try again.');
          navigate('/dashboard');
        }
      } catch {
        navigate('/dashboard');
      }
      return;
    }

    // ── Standard plan checkout ──
    if (plans[planId]) {
      setPlan(plans[planId]);
      createPaymentIntent(plans[planId].price);
    } else {
      navigate('/pricing');
    }
  }, [planId]);

  async function createPaymentIntent(amountCents) {
    try {
      const res = await fetch(`${API_URL}/api/payments/create-intent`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: user.id || user.userId,
          email: user.email,
          name: user.name,
          planId: planId,
          amount: amountCents,
          taxYear: 2025,
        })
      });
      
      const data = await res.json();
      
      if (data.alreadyPaid) {
        alert('You have already purchased this plan!');
        navigate('/dashboard');
        return;
      }
      
      if (data.success && data.clientSecret) {
        setClientSecret(data.clientSecret);
      }
    } catch (err) {
      console.error('Error creating payment intent:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSuccess(paymentIntent) {
    setSuccess(true);
    setPaymentDetails(paymentIntent);

    // ── If CPA bid, accept the bid (assign CPA) ──
    if (cpaBidData && cpaBidData.job_id && cpaBidData.bid_id) {
      try {
        await fetch(`${API_URL}/api/cpa/jobs/${cpaBidData.job_id}/accept`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ bid_id: cpaBidData.bid_id }),
        });
        console.log('✅ CPA bid accepted:', cpaBidData.cpa_name);
        // Clean up localStorage
        localStorage.removeItem('taxsky_payment');
      } catch (err) {
        console.error('❌ Accept CPA bid error:', err);
      }
    }
  }

  if (success) {
    const isCPA = planId === 'cpa-review' && cpaBidData;

    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f0fdf4',
        padding: '20px'
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '20px',
          padding: '48px',
          textAlign: 'center',
          maxWidth: '500px',
          boxShadow: '0 20px 40px rgba(34, 197, 94, 0.2)'
        }}>
          <div style={{ fontSize: '80px', marginBottom: '24px' }}>{isCPA ? '👨‍💼' : '🎉'}</div>
          <h1 style={{ color: '#166534', marginBottom: '16px' }}>
            {isCPA ? 'CPA Assigned!' : 'Payment Successful!'}
          </h1>
          <p style={{ color: '#64748b', marginBottom: '32px', fontSize: '18px' }}>
            {isCPA ? (
              <><strong>{cpaBidData.cpa_name}</strong> will review and file your return with the IRS.</>
            ) : (
              <>Thank you for purchasing <strong>{plan?.name}</strong></>
            )}
          </p>
          
          <div style={{
            backgroundColor: '#f0fdf4',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '32px'
          }}>
            <p style={{ margin: '8px 0', color: '#475569' }}>
              <strong>Amount:</strong> ${(plan?.price / 100).toFixed(2)}
            </p>
            <p style={{ margin: '8px 0', color: '#475569' }}>
              <strong>Email:</strong> {user.email}
            </p>
            {isCPA && (
              <>
                <p style={{ margin: '8px 0', color: '#475569' }}>
                  <strong>CPA:</strong> {cpaBidData.cpa_name}
                </p>
                <p style={{ margin: '8px 0', color: '#475569' }}>
                  <strong>Turnaround:</strong> {cpaBidData.estimated_hours || 24}h
                </p>
              </>
            )}
          </div>

          {isCPA && (
            <div style={{
              backgroundColor: '#eff6ff',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '24px',
              textAlign: 'left'
            }}>
              <h4 style={{ margin: '0 0 12px', color: '#1e40af', fontSize: '15px' }}>📋 What Happens Next</h4>
              {[
                { icon: '✅', text: 'Payment received' },
                { icon: '✅', text: `${cpaBidData.cpa_name} assigned to your return` },
                { icon: '🔄', text: 'CPA reviewing your return', active: true },
                { icon: '⬜', text: 'CPA prepares & files with IRS' },
                { icon: '⬜', text: 'You receive confirmation' },
              ].map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' }}>
                  <span style={{ fontSize: 16 }}>{s.icon}</span>
                  <span style={{ color: s.active ? '#2563eb' : '#475569', fontWeight: s.active ? 600 : 400, fontSize: 14 }}>
                    {s.text}
                    {s.active && <span style={{ marginLeft: 6, fontSize: 11, color: '#f59e0b', fontWeight: 600 }}>In Progress</span>}
                  </span>
                </div>
              ))}
            </div>
          )}
          
          <button
            onClick={() => navigate(isCPA ? '/dashboard' : '/taxchat')}
            style={{
              padding: '16px 32px',
              fontSize: '18px',
              fontWeight: '600',
              borderRadius: '12px',
              border: 'none',
              backgroundColor: '#22c55e',
              color: 'white',
              cursor: 'pointer'
            }}
          >
            {isCPA ? 'Go to Dashboard' : 'Start Filing Your Taxes →'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '20px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.1)',
        overflow: 'hidden',
        display: 'flex',
        maxWidth: '900px',
        width: '100%'
      }}>
        {/* Left: Order Summary */}
        <div style={{
          backgroundColor: '#1e293b',
          color: 'white',
          padding: '40px',
          width: '40%'
        }}>
          <h2 style={{ marginTop: 0, marginBottom: '32px' }}>
            🌤️ TaxSky
          </h2>
          
          <div style={{ marginBottom: '32px' }}>
            <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '8px' }}>
              You're purchasing
            </p>
            <h3 style={{ margin: '0 0 8px', fontSize: '24px' }}>
              {plan?.name}
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '14px' }}>
              Tax Year 2025
            </p>
            {cpaBidData && (
              <div style={{ marginTop: '16px', padding: '12px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                <p style={{ margin: '4px 0', fontSize: '13px', color: '#cbd5e1' }}>
                  👨‍💼 {cpaBidData.cpa_name}
                </p>
                <p style={{ margin: '4px 0', fontSize: '13px', color: '#cbd5e1' }}>
                  ✓ {cpaBidData.cpa_credentials || 'Licensed CPA'}
                </p>
                <p style={{ margin: '4px 0', fontSize: '13px', color: '#cbd5e1' }}>
                  ⏱️ {cpaBidData.estimated_hours || 24}h turnaround
                </p>
              </div>
            )}
          </div>
          
          <div style={{
            borderTop: '1px solid #334155',
            paddingTop: '24px',
            marginBottom: '24px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ color: '#94a3b8' }}>Subtotal</span>
              <span>${plan ? (plan.price / 100).toFixed(2) : '0.00'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#94a3b8' }}>Tax</span>
              <span>$0.00</span>
            </div>
          </div>
          
          <div style={{
            borderTop: '1px solid #334155',
            paddingTop: '24px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '24px', fontWeight: '700' }}>
              <span>Total</span>
              <span>${plan ? (plan.price / 100).toFixed(2) : '0.00'}</span>
            </div>
          </div>
          
          <div style={{ marginTop: '48px', fontSize: '13px', color: '#64748b' }}>
            <p>✓ 30-day money-back guarantee</p>
            <p>✓ Secure payment via Stripe</p>
            <p>✓ Instant access after payment</p>
          </div>
        </div>

        {/* Right: Payment Form */}
        <div style={{ padding: '40px', flex: 1 }}>
          <h2 style={{ marginTop: 0, marginBottom: '8px', color: '#1e293b' }}>
            Payment Details
          </h2>
          <p style={{ color: '#64748b', marginBottom: '32px' }}>
            Complete your purchase securely
          </p>
          
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px' }}>
              <div className="spinner" style={{ margin: '0 auto 16px' }}></div>
              <p style={{ color: '#64748b' }}>Preparing checkout...</p>
            </div>
          ) : clientSecret ? (
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <PaymentForm 
                plan={plan} 
                clientSecret={clientSecret}
                onSuccess={handleSuccess}
              />
            </Elements>
          ) : (
            <div style={{ textAlign: 'center', padding: '60px', color: '#ef4444' }}>
              <p>Unable to initialize payment. Please try again.</p>
              <button
                onClick={() => navigate('/pricing')}
                style={{
                  marginTop: '16px',
                  padding: '12px 24px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  backgroundColor: 'white',
                  cursor: 'pointer'
                }}
              >
                Back to Pricing
              </button>
            </div>
          )}
        </div>
      </div>
      
      <style>{`
        .spinner {
          width: 24px;
          height: 24px;
          border: 3px solid #e2e8f0;
          border-top-color: #2563eb;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}