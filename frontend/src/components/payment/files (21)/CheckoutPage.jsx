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
        disabled={!stripe || loading || !cardComplete}
        style={{
          width: '100%',
          padding: '16px',
          fontSize: '18px',
          fontWeight: '700',
          borderRadius: '12px',
          border: 'none',
          backgroundColor: loading || !cardComplete ? '#94a3b8' : '#22c55e',
          color: 'white',
          cursor: loading || !cardComplete ? 'not-allowed' : 'pointer',
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
    
    if (plans[planId]) {
      setPlan(plans[planId]);
      createPaymentIntent();
    } else {
      navigate('/pricing');
    }
  }, [planId]);

  async function createPaymentIntent() {
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
          productType: planId
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

  function handleSuccess(paymentIntent) {
    setSuccess(true);
    setPaymentDetails(paymentIntent);
  }

  if (success) {
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
          <div style={{ fontSize: '80px', marginBottom: '24px' }}>🎉</div>
          <h1 style={{ color: '#166534', marginBottom: '16px' }}>Payment Successful!</h1>
          <p style={{ color: '#64748b', marginBottom: '32px', fontSize: '18px' }}>
            Thank you for purchasing <strong>{plan?.name}</strong>
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
          </div>
          
          <button
            onClick={() => navigate('/taxchat')}
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
            Start Filing Your Taxes →
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
              Tax Year 2024
            </p>
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
