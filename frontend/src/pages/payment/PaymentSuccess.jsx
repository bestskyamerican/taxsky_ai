// ============================================================
// PAYMENT SUCCESS PAGE - Multi-Language Support
// ============================================================
// Location: frontend/src/pages/Payment/PaymentSuccess.jsx
// ============================================================

import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// ============================================================
// TRANSLATIONS
// ============================================================
const successTranslations = {
  en: {
    confirming: "Confirming your payment...",
    title: "Payment Successful!",
    thankYou: "Thank you for your purchase. You're all set to file your taxes!",
    orderDetails: "📋 Order Details",
    plan: "Plan",
    amount: "Amount",
    taxYear: "Tax Year",
    date: "Date",
    invoice: "Invoice #",
    viewReceipt: "📄 View Receipt",
    startFiling: "Start Filing",
    viewHistory: "View History",
    support: "Questions? Contact support@taxsky.com"
  },
  vi: {
    confirming: "Đang xác nhận thanh toán...",
    title: "Thanh Toán Thành Công!",
    thankYou: "Cảm ơn bạn đã mua hàng. Bạn đã sẵn sàng khai thuế!",
    orderDetails: "📋 Chi Tiết Đơn Hàng",
    plan: "Gói",
    amount: "Số tiền",
    taxYear: "Năm Thuế",
    date: "Ngày",
    invoice: "Hóa đơn #",
    viewReceipt: "📄 Xem Biên Nhận",
    startFiling: "Bắt Đầu Khai Thuế",
    viewHistory: "Xem Lịch Sử",
    support: "Câu hỏi? Liên hệ support@taxsky.com"
  },
  es: {
    confirming: "Confirmando tu pago...",
    title: "¡Pago Exitoso!",
    thankYou: "Gracias por tu compra. ¡Ya puedes declarar tus impuestos!",
    orderDetails: "📋 Detalles del Pedido",
    plan: "Plan",
    amount: "Monto",
    taxYear: "Año Fiscal",
    date: "Fecha",
    invoice: "Factura #",
    viewReceipt: "📄 Ver Recibo",
    startFiling: "Comenzar a Declarar",
    viewHistory: "Ver Historial",
    support: "¿Preguntas? Contacta support@taxsky.com"
  }
};

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { lang } = useLanguage();
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const t = successTranslations[lang] || successTranslations.en;
  
  const user = JSON.parse(localStorage.getItem('taxsky_user') || localStorage.getItem('user') || '{}');
  const token = localStorage.getItem('taxsky_token') || localStorage.getItem('token');
  const userId = user.id || user.userId;
  
  const paymentIntentId = searchParams.get('payment_intent');

  useEffect(() => {
    if (paymentIntentId) {
      confirmPayment();
    } else {
      loadLatestPayment();
    }
  }, []);

  async function confirmPayment() {
    try {
      const res = await fetch(`${API_URL}/api/payments/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ paymentIntentId })
      });
      const data = await res.json();
      if (data.success) {
        setPayment(data.payment);
      }
    } catch (err) {
      console.error('Error confirming payment:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadLatestPayment() {
    try {
      const res = await fetch(`${API_URL}/api/payments/user/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.payments.length > 0) {
        setPayment(data.payments[0]);
      }
    } catch (err) {
      console.error('Error loading payment:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8fafc'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '60px',
            height: '60px',
            border: '4px solid #e2e8f0',
            borderTopColor: '#22c55e',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px'
          }}></div>
          <p style={{ color: '#64748b', fontSize: '18px' }}>{t.confirming}</p>
        </div>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

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
        borderRadius: '24px',
        padding: '48px',
        textAlign: 'center',
        maxWidth: '550px',
        width: '100%',
        boxShadow: '0 25px 50px rgba(34, 197, 94, 0.2)'
      }}>
        {/* Success Icon */}
        <div style={{
          width: '100px',
          height: '100px',
          backgroundColor: '#dcfce7',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px',
          fontSize: '50px'
        }}>
          ✅
        </div>
        
        <h1 style={{ 
          color: '#166534', 
          marginBottom: '12px',
          fontSize: '32px'
        }}>
          {t.title}
        </h1>
        
        <p style={{ 
          color: '#64748b', 
          marginBottom: '32px', 
          fontSize: '18px' 
        }}>
          {t.thankYou}
        </p>
        
        {/* Payment Details */}
        {payment && (
          <div style={{
            backgroundColor: '#f0fdf4',
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '32px',
            textAlign: 'left'
          }}>
            <h3 style={{ margin: '0 0 16px', color: '#166534', fontSize: '16px' }}>
              {t.orderDetails}
            </h3>
            <div style={{ display: 'grid', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>{t.plan}</span>
                <span style={{ fontWeight: '600' }}>{payment.planName}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>{t.amount}</span>
                <span style={{ fontWeight: '600' }}>${(payment.amount / 100).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>{t.taxYear}</span>
                <span style={{ fontWeight: '600' }}>{payment.taxYear}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>{t.date}</span>
                <span style={{ fontWeight: '600' }}>
                  {new Date(payment.paidAt || payment.createdAt).toLocaleDateString()}
                </span>
              </div>
              {payment.invoiceNumber && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>{t.invoice}</span>
                  <span style={{ fontWeight: '600', fontFamily: 'monospace' }}>
                    {payment.invoiceNumber}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Receipt Link */}
        {payment?.receiptUrl && (
          <a
            href={payment.receiptUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-block',
              marginBottom: '24px',
              color: '#2563eb',
              textDecoration: 'none',
              fontSize: '14px'
            }}
          >
            {t.viewReceipt} →
          </a>
        )}
        
        {/* Actions */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button
            onClick={() => navigate('/taxchat')}
            style={{
              padding: '16px 32px',
              fontSize: '16px',
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
          <button
            onClick={() => navigate('/payment/history')}
            style={{
              padding: '16px 24px',
              fontSize: '16px',
              fontWeight: '600',
              borderRadius: '12px',
              border: '2px solid #e2e8f0',
              backgroundColor: 'white',
              color: '#475569',
              cursor: 'pointer'
            }}
          >
            {t.viewHistory}
          </button>
        </div>
        
        {/* Support */}
        <p style={{ 
          marginTop: '32px', 
          color: '#94a3b8', 
          fontSize: '13px' 
        }}>
          {t.support}
        </p>
      </div>
    </div>
  );
}