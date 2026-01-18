// ============================================================
// PAYMENT HISTORY PAGE - Multi-Language Support
// ============================================================
// Location: frontend/src/pages/Payment/PaymentHistory.jsx
// ============================================================

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage, LanguageSelector } from '../../contexts/LanguageContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// ============================================================
// TRANSLATIONS
// ============================================================
const historyTranslations = {
  en: {
    title: "💳 Payment History",
    subtitle: "View all your TaxSky transactions",
    viewPlans: "View Plans",
    loading: "Loading payments...",
    noPayments: "No Payments Yet",
    noPaymentsDesc: "You haven't made any purchases yet",
    viewPricing: "View Pricing Plans",
    taxYear: "Tax Year",
    viewReceipt: "View Receipt",
    totalSpent: "Total Spent",
    transactions: "Transactions",
    backToDashboard: "← Back to Dashboard",
    status: {
      completed: "Paid",
      pending: "Pending",
      failed: "Failed",
      refunded: "Refunded"
    }
  },
  vi: {
    title: "💳 Lịch Sử Thanh Toán",
    subtitle: "Xem tất cả giao dịch TaxSky của bạn",
    viewPlans: "Xem Gói",
    loading: "Đang tải thanh toán...",
    noPayments: "Chưa Có Thanh Toán",
    noPaymentsDesc: "Bạn chưa mua gì",
    viewPricing: "Xem Bảng Giá",
    taxYear: "Năm Thuế",
    viewReceipt: "Xem Biên Nhận",
    totalSpent: "Tổng Chi Tiêu",
    transactions: "Giao Dịch",
    backToDashboard: "← Quay Lại Bảng Điều Khiển",
    status: {
      completed: "Đã Thanh Toán",
      pending: "Đang Chờ",
      failed: "Thất Bại",
      refunded: "Đã Hoàn Tiền"
    }
  },
  es: {
    title: "💳 Historial de Pagos",
    subtitle: "Ver todas tus transacciones de TaxSky",
    viewPlans: "Ver Planes",
    loading: "Cargando pagos...",
    noPayments: "Sin Pagos",
    noPaymentsDesc: "Aún no has hecho ninguna compra",
    viewPricing: "Ver Precios",
    taxYear: "Año Fiscal",
    viewReceipt: "Ver Recibo",
    totalSpent: "Total Gastado",
    transactions: "Transacciones",
    backToDashboard: "← Volver al Panel",
    status: {
      completed: "Pagado",
      pending: "Pendiente",
      failed: "Fallido",
      refunded: "Reembolsado"
    }
  }
};

// Plan icons
const planIcons = {
  single_simple: '👤',
  single_plus: '👤➕',
  married_simple: '👫',
  family: '👨‍👩‍👧‍👦',
  head_of_household: '👨‍👧',
  self_employed: '💼',
  self_employed_family: '💼👨‍👩‍👧',
  premium: '⭐'
};

export default function PaymentHistory() {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const t = historyTranslations[lang] || historyTranslations.en;
  
  const user = JSON.parse(localStorage.getItem('taxsky_user') || localStorage.getItem('user') || '{}');
  const token = localStorage.getItem('taxsky_token') || localStorage.getItem('token');
  const userId = user.id || user.userId;

  useEffect(() => {
    if (!userId) {
      navigate('/login');
      return;
    }
    loadPayments();
  }, [userId]);

  async function loadPayments() {
    try {
      const res = await fetch(`${API_URL}/api/payments/user/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setPayments(data.payments);
      }
    } catch (err) {
      console.error('Error loading payments:', err);
    } finally {
      setLoading(false);
    }
  }

  function getStatusBadge(status) {
    const styles = {
      completed: { bg: '#dcfce7', color: '#166534' },
      pending: { bg: '#fef9c3', color: '#854d0e' },
      failed: { bg: '#fee2e2', color: '#991b1b' },
      refunded: { bg: '#e0e7ff', color: '#3730a3' }
    };
    const style = styles[status] || styles.pending;
    
    return (
      <span style={{
        backgroundColor: style.bg,
        color: style.color,
        padding: '4px 12px',
        borderRadius: '20px',
        fontSize: '12px',
        fontWeight: '600'
      }}>
        {t.status[status] || status}
      </span>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', padding: '40px 20px' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '32px'
        }}>
          <div>
            <h1 style={{ margin: '0 0 8px', color: '#1e293b', fontSize: '28px' }}>
              {t.title}
            </h1>
            <p style={{ margin: 0, color: '#64748b' }}>
              {t.subtitle}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <LanguageSelector />
            <button
              onClick={() => navigate('/payment/pricing')}
              style={{
                padding: '12px 24px',
                fontSize: '14px',
                fontWeight: '600',
                borderRadius: '10px',
                border: 'none',
                backgroundColor: '#2563eb',
                color: 'white',
                cursor: 'pointer'
              }}
            >
              {t.viewPlans}
            </button>
          </div>
        </div>

        {/* Content */}
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
            <p style={{ color: '#64748b' }}>{t.loading}</p>
          </div>
        ) : payments.length === 0 ? (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '60px',
            textAlign: 'center',
            boxShadow: '0 4px 20px rgba(0,0,0,0.05)'
          }}>
            <div style={{ fontSize: '60px', marginBottom: '16px' }}>💳</div>
            <h3 style={{ margin: '0 0 8px', color: '#1e293b' }}>{t.noPayments}</h3>
            <p style={{ color: '#64748b', marginBottom: '24px' }}>
              {t.noPaymentsDesc}
            </p>
            <button
              onClick={() => navigate('/payment/pricing')}
              style={{
                padding: '14px 28px',
                fontSize: '16px',
                fontWeight: '600',
                borderRadius: '10px',
                border: 'none',
                backgroundColor: '#22c55e',
                color: 'white',
                cursor: 'pointer'
              }}
            >
              {t.viewPricing} →
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '16px' }}>
            {payments.map(payment => (
              <div
                key={payment._id}
                style={{
                  backgroundColor: 'white',
                  borderRadius: '16px',
                  padding: '24px',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                  border: '1px solid #e2e8f0'
                }}
              >
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '16px'
                }}>
                  {/* Left: Plan Info */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{
                      width: '56px',
                      height: '56px',
                      backgroundColor: '#f1f5f9',
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '28px'
                    }}>
                      {planIcons[payment.planId] || '📄'}
                    </div>
                    <div>
                      <h3 style={{ margin: '0 0 4px', fontSize: '18px', color: '#1e293b' }}>
                        {payment.planName}
                      </h3>
                      <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                        {t.taxYear} {payment.taxYear}
                      </p>
                    </div>
                  </div>
                  
                  {/* Right: Amount & Status */}
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ 
                      fontSize: '24px', 
                      fontWeight: '700', 
                      color: '#1e293b',
                      marginBottom: '8px'
                    }}>
                      ${(payment.amount / 100).toFixed(2)}
                    </div>
                    {getStatusBadge(payment.status)}
                  </div>
                </div>
                
                {/* Details Row */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingTop: '16px',
                  borderTop: '1px solid #f1f5f9',
                  fontSize: '13px',
                  color: '#64748b'
                }}>
                  <div style={{ display: 'flex', gap: '24px' }}>
                    <span>
                      📅 {new Date(payment.paidAt || payment.createdAt).toLocaleDateString()}
                    </span>
                    {payment.invoiceNumber && (
                      <span style={{ fontFamily: 'monospace' }}>
                        # {payment.invoiceNumber}
                      </span>
                    )}
                  </div>
                  
                  <div style={{ display: 'flex', gap: '12px' }}>
                    {payment.receiptUrl && (
                      <a
                        href={payment.receiptUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: '#2563eb',
                          textDecoration: 'none',
                          fontWeight: '500'
                        }}
                      >
                        {t.viewReceipt} →
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Summary */}
        {payments.length > 0 && (
          <div style={{
            marginTop: '32px',
            backgroundColor: '#eff6ff',
            borderRadius: '12px',
            padding: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <div style={{ fontSize: '14px', color: '#3b82f6' }}>{t.totalSpent}</div>
              <div style={{ fontSize: '28px', fontWeight: '700', color: '#1e40af' }}>
                ${(payments
                  .filter(p => p.status === 'completed')
                  .reduce((sum, p) => sum + p.amount, 0) / 100
                ).toFixed(2)}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '14px', color: '#3b82f6' }}>{t.transactions}</div>
              <div style={{ fontSize: '28px', fontWeight: '700', color: '#1e40af' }}>
                {payments.filter(p => p.status === 'completed').length}
              </div>
            </div>
          </div>
        )}

        {/* Back Button */}
        <div style={{ marginTop: '32px', textAlign: 'center' }}>
          <button
            onClick={() => navigate('/dashboard')}
            style={{
              padding: '12px 24px',
              fontSize: '14px',
              fontWeight: '500',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              backgroundColor: 'white',
              color: '#64748b',
              cursor: 'pointer'
            }}
          >
            {t.backToDashboard}
          </button>
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