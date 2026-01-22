// ============================================================
// CHECKOUT PAGE - Stripe Payment Form
// ============================================================
// Location: frontend/src/pages/Payment/CheckoutPage.jsx
// ============================================================

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useLanguage } from '../../contexts/LanguageContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const STRIPE_PUBLIC_KEY = import.meta.env.VITE_STRIPE_PUBLIC_KEY;

const stripePromise = loadStripe(STRIPE_PUBLIC_KEY);

// ============================================================
// TRANSLATIONS
// ============================================================
const checkoutTranslations = {
  en: {
    youArePurchasing: "You're purchasing",
    taxYear: "Tax Year",
    subtotal: "Subtotal",
    stateReturn: "State Return",
    tax: "Tax",
    total: "Total",
    moneyBack: "30-day money-back guarantee",
    securePayment: "Secure payment via Stripe",
    instantAccess: "Instant access after payment",
    paymentDetails: "Payment Details",
    completeSecurely: "Complete your purchase securely",
    cardInfo: "Card Information",
    pay: "Pay",
    processing: "Processing...",
    secureEncrypted: "Your payment is secure and encrypted",
    paymentSuccessful: "Payment Successful!",
    thankYou: "Thank you for purchasing",
    plan: "Plan",
    amount: "Amount",
    email: "Email",
    startFiling: "Start Filing Your Taxes",
    backToPricing: "Back to Pricing",
    preparingCheckout: "Preparing checkout...",
    unableToInit: "Unable to initialize payment. Please try again.",
    alreadyPurchased: "You have already purchased this plan!",
    federalFiling: "Federal Filing",
    federalPlusState: "Federal + State Filing"
  },
  vi: {
    youArePurchasing: "Bạn đang mua",
    taxYear: "Năm Thuế",
    subtotal: "Tạm tính",
    stateReturn: "Khai Thuế Tiểu Bang",
    tax: "Thuế",
    total: "Tổng cộng",
    moneyBack: "Hoàn tiền trong 30 ngày",
    securePayment: "Thanh toán an toàn qua Stripe",
    instantAccess: "Truy cập ngay sau khi thanh toán",
    paymentDetails: "Chi Tiết Thanh Toán",
    completeSecurely: "Hoàn tất thanh toán an toàn",
    cardInfo: "Thông Tin Thẻ",
    pay: "Thanh Toán",
    processing: "Đang xử lý...",
    secureEncrypted: "Thanh toán của bạn được bảo mật và mã hóa",
    paymentSuccessful: "Thanh Toán Thành Công!",
    thankYou: "Cảm ơn bạn đã mua",
    plan: "Gói",
    amount: "Số tiền",
    email: "Email",
    startFiling: "Bắt Đầu Khai Thuế",
    backToPricing: "Quay Lại Bảng Giá",
    preparingCheckout: "Đang chuẩn bị thanh toán...",
    unableToInit: "Không thể khởi tạo thanh toán. Vui lòng thử lại.",
    alreadyPurchased: "Bạn đã mua gói này rồi!",
    federalFiling: "Khai Thuế Liên Bang",
    federalPlusState: "Liên Bang + Tiểu Bang"
  },
  es: {
    youArePurchasing: "Estás comprando",
    taxYear: "Año Fiscal",
    subtotal: "Subtotal",
    stateReturn: "Declaración Estatal",
    tax: "Impuesto",
    total: "Total",
    moneyBack: "Garantía de devolución de 30 días",
    securePayment: "Pago seguro vía Stripe",
    instantAccess: "Acceso instantáneo después del pago",
    paymentDetails: "Detalles del Pago",
    completeSecurely: "Completa tu compra de forma segura",
    cardInfo: "Información de Tarjeta",
    pay: "Pagar",
    processing: "Procesando...",
    secureEncrypted: "Tu pago es seguro y encriptado",
    paymentSuccessful: "¡Pago Exitoso!",
    thankYou: "Gracias por comprar",
    plan: "Plan",
    amount: "Monto",
    email: "Correo",
    startFiling: "Comenzar a Declarar",
    backToPricing: "Volver a Precios",
    preparingCheckout: "Preparando pago...",
    unableToInit: "No se pudo iniciar el pago. Por favor intenta de nuevo.",
    alreadyPurchased: "¡Ya has comprado este plan!",
    federalFiling: "Declaración Federal",
    federalPlusState: "Federal + Estatal"
  }
};

// ============================================================
// PAYMENT FORM COMPONENT
// ============================================================
function PaymentForm({ plan, clientSecret, onSuccess, t }) {
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
        { payment_method: { card: elements.getElement(CardElement) } }
      );
      
      if (stripeError) {
        setError(stripeError.message);
        setLoading(false);
        return;
      }
      
      if (paymentIntent.status === 'succeeded') {
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

  const totalAmount = (plan.totalPrice / 100).toFixed(2);

  return (
    <form onSubmit={handleSubmit}>
      <div style={{
        backgroundColor: '#f8fafc',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '20px'
      }}>
        <label style={{ display: 'block', marginBottom: '12px', fontWeight: '600', color: '#475569' }}>
          💳 {t.cardInfo}
        </label>
        <div style={{
          backgroundColor: 'white',
          border: '2px solid #e2e8f0',
          borderRadius: '8px',
          padding: '14px'
        }}>
          <CardElement 
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#1e293b',
                  '::placeholder': { color: '#94a3b8' },
                },
                invalid: { color: '#ef4444' },
              },
            }}
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
            <span style={{
              width: '20px',
              height: '20px',
              border: '2px solid #fff',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              display: 'inline-block'
            }}></span>
            {t.processing}
          </>
        ) : (
          <>
            🔒 {t.pay} ${totalAmount}
          </>
        )}
      </button>

      <p style={{ 
        textAlign: 'center', 
        marginTop: '16px', 
        fontSize: '13px',
        color: '#64748b'
      }}>
        🔐 {t.secureEncrypted}
      </p>
    </form>
  );
}

// ============================================================
// CHECKOUT PAGE COMPONENT
// ============================================================
export default function CheckoutPage() {
  const { planId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { lang } = useLanguage ? useLanguage() : { lang: 'en' };
  
  const [plan, setPlan] = useState(null);
  const [clientSecret, setClientSecret] = useState(null);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  
  const t = checkoutTranslations[lang] || checkoutTranslations.en;
  
  const user = JSON.parse(localStorage.getItem('taxsky_user') || localStorage.getItem('user') || '{}');
  const token = localStorage.getItem('taxsky_token') || localStorage.getItem('token');
  const userId = user.id || user.userId;

  useEffect(() => {
    if (!userId) {
      navigate('/login');
      return;
    }
    
    loadPlanAndCreateIntent();
  }, [planId]);

  async function loadPlanAndCreateIntent() {
    try {
      // Try to get plan data from localStorage (set by PaymentFlow)
      const savedPayment = localStorage.getItem('taxsky_payment');
      let planData = null;
      
      if (savedPayment) {
        const parsed = JSON.parse(savedPayment);
        if (parsed.planId === planId) {
          planData = {
            id: parsed.planId,
            name: parsed.planName,
            icon: parsed.planIcon,
            price: parsed.price,
            statePrice: parsed.statePrice || 0,
            totalPrice: parsed.totalPrice,
            hasState: parsed.hasState,
            taxYear: parsed.taxYear || 2024
          };
        }
      }
      
      // Fallback: get amount from URL query params
      if (!planData) {
        const amountFromUrl = searchParams.get('amount');
        const hasState = searchParams.get('state') === 'true';
        
        planData = {
          id: planId,
          name: formatPlanName(planId),
          icon: getPlanIcon(planId),
          totalPrice: amountFromUrl ? parseInt(amountFromUrl) : 2999,
          hasState: hasState,
          taxYear: 2024
        };
      }
      
      setPlan(planData);
      
      // Create payment intent with Stripe
      const res = await fetch(`${API_URL}/api/payments/create-intent`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: userId,
          email: user.email,
          name: user.name || user.firstName,
          productType: planId,
          planName: planData.name,
          amount: planData.totalPrice,
          hasState: planData.hasState,
          taxYear: planData.taxYear
        })
      });
      
      const data = await res.json();
      
      if (data.alreadyPaid) {
        alert(t.alreadyPurchased);
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

  function formatPlanName(id) {
    const names = {
      free: 'Free Estimate',
      basic: 'Basic',
      standard: 'Standard',
      plus: 'Plus',
      selfEmployed: 'Self-Employed',
      premium: 'Premium'
    };
    return names[id] || id.charAt(0).toUpperCase() + id.slice(1).replace(/_/g, ' ');
  }

  function getPlanIcon(id) {
    const icons = {
      free: '🆓',
      basic: '📄',
      standard: '⭐',
      plus: '💎',
      selfEmployed: '💼',
      premium: '👑'
    };
    return icons[id] || '📄';
  }

  function handleSuccess() {
    // Clear saved payment data
    localStorage.removeItem('taxsky_payment');
    setSuccess(true);
  }

  // Success Screen
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
          <h1 style={{ color: '#166534', marginBottom: '16px' }}>{t.paymentSuccessful}</h1>
          <p style={{ color: '#64748b', marginBottom: '32px', fontSize: '18px' }}>
            {t.thankYou} <strong>{plan?.name}</strong>
          </p>
          
          <div style={{
            backgroundColor: '#f0fdf4',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '32px',
            textAlign: 'left'
          }}>
            <p style={{ margin: '8px 0', color: '#475569' }}>
              <strong>{t.plan}:</strong> {plan?.name}
            </p>
            <p style={{ margin: '8px 0', color: '#475569' }}>
              <strong>{t.amount}:</strong> ${(plan?.totalPrice / 100).toFixed(2)}
            </p>
            <p style={{ margin: '8px 0', color: '#475569' }}>
              <strong>{t.email}:</strong> {user.email}
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
            {t.startFiling} →
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
        width: '100%',
        flexWrap: 'wrap'
      }}>
        {/* Left: Order Summary */}
        <div style={{
          backgroundColor: '#1e293b',
          color: 'white',
          padding: '40px',
          width: '40%',
          minWidth: '280px',
          flex: '1 1 280px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
            <span style={{ fontSize: '32px' }}>🌤️</span>
            <span style={{ fontSize: '24px', fontWeight: '700' }}>TaxSky</span>
          </div>
          
          <div style={{ marginBottom: '32px' }}>
            <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '8px' }}>
              {t.youArePurchasing}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '32px' }}>{plan?.icon}</span>
              <div>
                <h3 style={{ margin: '0 0 4px', fontSize: '22px' }}>{plan?.name}</h3>
                <p style={{ color: '#94a3b8', fontSize: '14px', margin: 0 }}>
                  {plan?.hasState ? t.federalPlusState : t.federalFiling}
                </p>
              </div>
            </div>
          </div>
          
          <div style={{ borderTop: '1px solid #334155', paddingTop: '24px', marginBottom: '24px' }}>
            {plan?.price && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ color: '#94a3b8' }}>{t.subtotal}</span>
                <span>${(plan.price / 100).toFixed(2)}</span>
              </div>
            )}
            {plan?.hasState && plan?.statePrice > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ color: '#94a3b8' }}>{t.stateReturn}</span>
                <span>${(plan.statePrice / 100).toFixed(2)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#94a3b8' }}>{t.tax}</span>
              <span>$0.00</span>
            </div>
          </div>
          
          <div style={{ borderTop: '1px solid #334155', paddingTop: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '24px', fontWeight: '700' }}>
              <span>{t.total}</span>
              <span style={{ color: '#22c55e' }}>
                ${plan ? (plan.totalPrice / 100).toFixed(2) : '0.00'}
              </span>
            </div>
          </div>
          
          <div style={{ marginTop: '48px', fontSize: '13px', color: '#64748b' }}>
            <p style={{ margin: '8px 0' }}>✓ {t.moneyBack}</p>
            <p style={{ margin: '8px 0' }}>✓ {t.securePayment}</p>
            <p style={{ margin: '8px 0' }}>✓ {t.instantAccess}</p>
          </div>
        </div>

        {/* Right: Payment Form */}
        <div style={{ padding: '40px', flex: '1 1 320px', minWidth: '320px' }}>
          <h2 style={{ marginTop: 0, marginBottom: '8px', color: '#1e293b' }}>
            {t.paymentDetails}
          </h2>
          <p style={{ color: '#64748b', marginBottom: '32px' }}>
            {t.completeSecurely}
          </p>
          
          {/* User Info */}
          <div style={{
            backgroundColor: '#f8fafc',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '20px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                backgroundColor: '#2563eb',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: '600'
              }}>
                {user.name?.charAt(0) || user.firstName?.charAt(0) || 'U'}
              </div>
              <div>
                <div style={{ fontWeight: '600' }}>{user.name || user.firstName || 'User'}</div>
                <div style={{ fontSize: '13px', color: '#64748b' }}>{user.email}</div>
              </div>
            </div>
          </div>
          
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                border: '4px solid #e2e8f0',
                borderTopColor: '#2563eb',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 16px'
              }}></div>
              <p style={{ color: '#64748b' }}>{t.preparingCheckout}</p>
            </div>
          ) : clientSecret ? (
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <PaymentForm 
                plan={plan}
                clientSecret={clientSecret}
                onSuccess={handleSuccess}
                t={t}
              />
            </Elements>
          ) : (
            <div style={{ textAlign: 'center', padding: '60px', color: '#ef4444' }}>
              <p>{t.unableToInit}</p>
              <button
                onClick={() => navigate('/payment/pricing')}
                style={{
                  marginTop: '16px',
                  padding: '12px 24px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  backgroundColor: 'white',
                  cursor: 'pointer'
                }}
              >
                {t.backToPricing}
              </button>
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