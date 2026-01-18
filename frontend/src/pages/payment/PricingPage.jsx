// ============================================================
// PRICING PAGE - Multi-Language Support
// ============================================================
// Location: frontend/src/pages/Payment/PricingPage.jsx
// ============================================================

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage, LanguageSelector } from '../../contexts/LanguageContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// ============================================================
// TRANSLATIONS
// ============================================================
const pricingTranslations = {
  en: {
    title: "🌤️ TaxSky Pricing",
    subtitle: "Choose the plan that fits your tax situation",
    yourSituation: "📊 Your Tax Situation",
    filingStatus: "Filing Status",
    spouse: "Spouse",
    dependents: "Dependents",
    w2Forms: "W-2 Forms",
    income1099: "1099 Income",
    selfEmployed: "Self-Employed",
    yes: "Yes",
    no: "No",
    recommendedFor: "✓ Recommended for you",
    mostPopular: "MOST POPULAR",
    bestFor: "Best for",
    selectPlan: "Select Plan",
    selectThisPlan: "Select This Plan",
    securePayment: "💳 Secure payment powered by Stripe",
    dataProtected: "🔒 Your data is encrypted and protected",
    moneyBack: "💰 30-day money-back guarantee",
    analyzing: "⏳ Analyzing your tax situation...",
    
    // Plan names
    plans: {
      single_simple: { name: "Single Filing", desc: "Single filer, W-2 income", bestFor: "Single person with one job" },
      single_plus: { name: "Single Plus", desc: "Multiple income sources", bestFor: "Single person with multiple jobs or 1099" },
      married_simple: { name: "Married Filing", desc: "Married couple, no kids", bestFor: "Married couple without children" },
      family: { name: "Family Filing", desc: "Married with dependents", bestFor: "Family with children" },
      head_of_household: { name: "Head of Household", desc: "Single parent with kids", bestFor: "Single parent supporting children" },
      self_employed: { name: "Self-Employed", desc: "1099 / Business income", bestFor: "Freelancers, contractors, gig workers" },
      self_employed_family: { name: "Self-Employed Family", desc: "Business owner with family", bestFor: "Self-employed with dependents" },
      premium: { name: "Premium + CPA", desc: "CPA review included", bestFor: "Complex returns or peace of mind" }
    },
    
    // Features
    features: {
      federal: "Federal tax return",
      state: "State tax return",
      oneW2: "1 W-2 form",
      standardDeduction: "Standard deduction",
      aiChat: "AI chat assistance",
      everythingSingle: "Everything in Single",
      multipleW2: "Multiple W-2s",
      income1099: "1099 income",
      investment: "Investment income",
      prioritySupport: "Priority support",
      bothW2s: "Both spouses W-2s",
      jointOptimization: "Joint filing optimization",
      deductionMax: "Deduction maximization",
      everythingMarried: "Everything in Married",
      unlimitedDependents: "Unlimited dependents",
      childTaxCredit: "Child Tax Credit",
      eitcCalc: "EITC calculation",
      dependentCredits: "Dependent care credits",
      hohOptimization: "HOH status optimization",
      scheduleC: "Schedule C",
      businessExpenses: "Business expenses",
      selfEmploymentTax: "Self-employment tax",
      quarterlyEstimates: "Quarterly estimates",
      everythingSelfEmployed: "Everything in Self-Employed",
      familyCredits: "Family credits",
      homeOffice: "Home office deduction",
      anyFilingType: "Any filing type",
      cpaReview: "CPA reviews your return",
      auditProtection: "Audit protection",
      oneOnOne: "1-on-1 support",
      maxRefund: "Max refund guarantee"
    },
    
    // Filing statuses
    filingStatuses: {
      single: "Single",
      married_filing_jointly: "Married Filing Jointly",
      married_filing_separately: "Married Filing Separately",
      head_of_household: "Head of Household"
    }
  },
  
  vi: {
    title: "🌤️ Bảng Giá TaxSky",
    subtitle: "Chọn gói phù hợp với tình trạng thuế của bạn",
    yourSituation: "📊 Tình Trạng Thuế Của Bạn",
    filingStatus: "Tình Trạng Khai Thuế",
    spouse: "Vợ/Chồng",
    dependents: "Người Phụ Thuộc",
    w2Forms: "Mẫu W-2",
    income1099: "Thu Nhập 1099",
    selfEmployed: "Tự Kinh Doanh",
    yes: "Có",
    no: "Không",
    recommendedFor: "✓ Đề xuất cho bạn",
    mostPopular: "PHỔ BIẾN NHẤT",
    bestFor: "Phù hợp cho",
    selectPlan: "Chọn Gói",
    selectThisPlan: "Chọn Gói Này",
    securePayment: "💳 Thanh toán an toàn qua Stripe",
    dataProtected: "🔒 Dữ liệu được mã hóa và bảo vệ",
    moneyBack: "💰 Hoàn tiền trong 30 ngày",
    analyzing: "⏳ Đang phân tích tình trạng thuế...",
    
    plans: {
      single_simple: { name: "Khai Thuế Độc Thân", desc: "Độc thân, thu nhập W-2", bestFor: "Người độc thân với một công việc" },
      single_plus: { name: "Độc Thân Plus", desc: "Nhiều nguồn thu nhập", bestFor: "Độc thân với nhiều việc hoặc 1099" },
      married_simple: { name: "Khai Thuế Vợ Chồng", desc: "Vợ chồng, không có con", bestFor: "Vợ chồng không có con" },
      family: { name: "Khai Thuế Gia Đình", desc: "Vợ chồng có con", bestFor: "Gia đình có con" },
      head_of_household: { name: "Chủ Hộ", desc: "Cha/mẹ đơn thân có con", bestFor: "Cha mẹ đơn thân nuôi con" },
      self_employed: { name: "Tự Kinh Doanh", desc: "Thu nhập 1099 / Kinh doanh", bestFor: "Freelancer, nhà thầu, gig" },
      self_employed_family: { name: "Tự KD + Gia Đình", desc: "Chủ doanh nghiệp có gia đình", bestFor: "Tự kinh doanh có người phụ thuộc" },
      premium: { name: "Premium + CPA", desc: "CPA xem xét", bestFor: "Trường hợp phức tạp hoặc yên tâm" }
    },
    
    features: {
      federal: "Khai thuế Liên Bang",
      state: "Khai thuế Tiểu Bang",
      oneW2: "1 mẫu W-2",
      standardDeduction: "Khấu trừ tiêu chuẩn",
      aiChat: "Hỗ trợ chat AI",
      everythingSingle: "Tất cả trong gói Độc Thân",
      multipleW2: "Nhiều W-2",
      income1099: "Thu nhập 1099",
      investment: "Thu nhập đầu tư",
      prioritySupport: "Hỗ trợ ưu tiên",
      bothW2s: "W-2 cả hai vợ chồng",
      jointOptimization: "Tối ưu khai chung",
      deductionMax: "Tối đa hóa khấu trừ",
      everythingMarried: "Tất cả trong gói Vợ Chồng",
      unlimitedDependents: "Không giới hạn người phụ thuộc",
      childTaxCredit: "Tín Dụng Thuế Trẻ Em",
      eitcCalc: "Tính EITC",
      dependentCredits: "Tín dụng chăm sóc người phụ thuộc",
      hohOptimization: "Tối ưu tình trạng Chủ Hộ",
      scheduleC: "Schedule C",
      businessExpenses: "Chi phí kinh doanh",
      selfEmploymentTax: "Thuế tự kinh doanh",
      quarterlyEstimates: "Ước tính hàng quý",
      everythingSelfEmployed: "Tất cả trong gói Tự KD",
      familyCredits: "Tín dụng gia đình",
      homeOffice: "Khấu trừ văn phòng tại nhà",
      anyFilingType: "Mọi loại khai thuế",
      cpaReview: "CPA xem xét tờ khai",
      auditProtection: "Bảo vệ kiểm toán",
      oneOnOne: "Hỗ trợ 1-1",
      maxRefund: "Đảm bảo hoàn thuế tối đa"
    },
    
    filingStatuses: {
      single: "Độc Thân",
      married_filing_jointly: "Vợ Chồng Khai Chung",
      married_filing_separately: "Vợ Chồng Khai Riêng",
      head_of_household: "Chủ Hộ"
    }
  },
  
  es: {
    title: "🌤️ Precios de TaxSky",
    subtitle: "Elige el plan que se adapte a tu situación fiscal",
    yourSituation: "📊 Tu Situación Fiscal",
    filingStatus: "Estado Civil Tributario",
    spouse: "Cónyuge",
    dependents: "Dependientes",
    w2Forms: "Formularios W-2",
    income1099: "Ingresos 1099",
    selfEmployed: "Autónomo",
    yes: "Sí",
    no: "No",
    recommendedFor: "✓ Recomendado para ti",
    mostPopular: "MÁS POPULAR",
    bestFor: "Ideal para",
    selectPlan: "Seleccionar Plan",
    selectThisPlan: "Seleccionar Este Plan",
    securePayment: "💳 Pago seguro vía Stripe",
    dataProtected: "🔒 Tus datos están encriptados y protegidos",
    moneyBack: "💰 Garantía de devolución de 30 días",
    analyzing: "⏳ Analizando tu situación fiscal...",
    
    plans: {
      single_simple: { name: "Declaración Soltero", desc: "Soltero, ingresos W-2", bestFor: "Persona soltera con un trabajo" },
      single_plus: { name: "Soltero Plus", desc: "Múltiples fuentes de ingreso", bestFor: "Soltero con múltiples trabajos o 1099" },
      married_simple: { name: "Declaración Casados", desc: "Pareja casada, sin hijos", bestFor: "Pareja casada sin hijos" },
      family: { name: "Declaración Familiar", desc: "Casados con dependientes", bestFor: "Familia con hijos" },
      head_of_household: { name: "Jefe de Familia", desc: "Padre/madre soltero con hijos", bestFor: "Padre/madre soltero manteniendo hijos" },
      self_employed: { name: "Autónomo", desc: "Ingresos 1099 / Negocio", bestFor: "Freelancers, contratistas" },
      self_employed_family: { name: "Autónomo + Familia", desc: "Dueño de negocio con familia", bestFor: "Autónomo con dependientes" },
      premium: { name: "Premium + CPA", desc: "Revisión de CPA incluida", bestFor: "Casos complejos o tranquilidad" }
    },
    
    features: {
      federal: "Declaración federal",
      state: "Declaración estatal",
      oneW2: "1 formulario W-2",
      standardDeduction: "Deducción estándar",
      aiChat: "Asistencia de chat IA",
      everythingSingle: "Todo en Soltero",
      multipleW2: "Múltiples W-2",
      income1099: "Ingresos 1099",
      investment: "Ingresos de inversión",
      prioritySupport: "Soporte prioritario",
      bothW2s: "W-2 de ambos cónyuges",
      jointOptimization: "Optimización conjunta",
      deductionMax: "Maximización de deducciones",
      everythingMarried: "Todo en Casados",
      unlimitedDependents: "Dependientes ilimitados",
      childTaxCredit: "Crédito Tributario por Hijos",
      eitcCalc: "Cálculo de EITC",
      dependentCredits: "Créditos por dependientes",
      hohOptimization: "Optimización de Jefe de Familia",
      scheduleC: "Schedule C",
      businessExpenses: "Gastos de negocio",
      selfEmploymentTax: "Impuesto de autoempleo",
      quarterlyEstimates: "Estimaciones trimestrales",
      everythingSelfEmployed: "Todo en Autónomo",
      familyCredits: "Créditos familiares",
      homeOffice: "Deducción de oficina en casa",
      anyFilingType: "Cualquier tipo de declaración",
      cpaReview: "CPA revisa tu declaración",
      auditProtection: "Protección de auditoría",
      oneOnOne: "Soporte 1-a-1",
      maxRefund: "Garantía de máximo reembolso"
    },
    
    filingStatuses: {
      single: "Soltero/a",
      married_filing_jointly: "Casado/a Declarando Juntos",
      married_filing_separately: "Casado/a Declarando Separado",
      head_of_household: "Jefe/a de Familia"
    }
  }
};

export default function PricingPage() {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [recommendation, setRecommendation] = useState(null);
  const [userSituation, setUserSituation] = useState(null);
  
  // Get translations
  const t = pricingTranslations[lang] || pricingTranslations.en;
  
  const user = JSON.parse(localStorage.getItem('taxsky_user') || localStorage.getItem('user') || '{}');
  const token = localStorage.getItem('taxsky_token') || localStorage.getItem('token');
  const userId = user.id || user.userId;

  // All pricing plans
  const plans = [
    {
      id: 'single_simple',
      price: 19.99,
      icon: '👤',
      color: '#64748b',
      features: ['federal', 'state', 'oneW2', 'standardDeduction', 'aiChat']
    },
    {
      id: 'single_plus',
      price: 29.99,
      icon: '👤➕',
      color: '#3b82f6',
      features: ['everythingSingle', 'multipleW2', 'income1099', 'investment', 'prioritySupport']
    },
    {
      id: 'married_simple',
      price: 29.99,
      icon: '👫',
      color: '#8b5cf6',
      features: ['federal', 'state', 'bothW2s', 'jointOptimization', 'deductionMax']
    },
    {
      id: 'family',
      price: 39.99,
      icon: '👨‍👩‍👧‍👦',
      color: '#22c55e',
      popular: true,
      features: ['everythingMarried', 'unlimitedDependents', 'childTaxCredit', 'eitcCalc', 'dependentCredits']
    },
    {
      id: 'head_of_household',
      price: 34.99,
      icon: '👨‍👧',
      color: '#f59e0b',
      features: ['federal', 'state', 'hohOptimization', 'childTaxCredit', 'eitcCalc', 'dependentCredits']
    },
    {
      id: 'self_employed',
      price: 49.99,
      icon: '💼',
      color: '#ef4444',
      features: ['federal', 'state', 'scheduleC', 'businessExpenses', 'selfEmploymentTax', 'quarterlyEstimates']
    },
    {
      id: 'self_employed_family',
      price: 59.99,
      icon: '💼👨‍👩‍👧',
      color: '#dc2626',
      features: ['everythingSelfEmployed', 'familyCredits', 'childTaxCredit', 'eitcCalc', 'homeOffice']
    },
    {
      id: 'premium',
      price: 79.99,
      icon: '⭐',
      color: '#7c3aed',
      features: ['anyFilingType', 'cpaReview', 'auditProtection', 'oneOnOne', 'maxRefund']
    }
  ];

  useEffect(() => {
    if (userId) {
      loadRecommendation();
    } else {
      setLoading(false);
    }
  }, [userId]);

  async function loadRecommendation() {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/payments/recommend/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (data.success) {
        setRecommendation(data.recommendedPlan);
        setUserSituation(data.userSituation);
      }
    } catch (err) {
      console.error('Error loading recommendation:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSelectPlan(planId) {
    if (!userId) {
      localStorage.setItem('pendingPlan', planId);
      navigate('/login');
      return;
    }
    navigate(`/payment/checkout/${planId}`);
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', padding: '40px 20px' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px', maxWidth: '1400px', margin: '0 auto' }}>
          <LanguageSelector />
        </div>
        <h1 style={{ fontSize: '36px', fontWeight: '700', color: '#1e293b', marginBottom: '8px' }}>
          {t.title}
        </h1>
        <p style={{ fontSize: '18px', color: '#64748b' }}>
          {t.subtitle}
        </p>
      </div>

      {/* User Situation Card */}
      {userSituation && (
        <div style={{
          maxWidth: '800px',
          margin: '0 auto 40px',
          backgroundColor: '#eff6ff',
          borderRadius: '16px',
          padding: '24px',
          border: '2px solid #bfdbfe'
        }}>
          <h3 style={{ margin: '0 0 16px', color: '#1e40af' }}>
            {t.yourSituation}
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
            <div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>{t.filingStatus}</div>
              <div style={{ fontWeight: '600' }}>{t.filingStatuses[userSituation.filingStatus] || userSituation.filingStatus}</div>
            </div>
            {userSituation.hasSpouse && (
              <div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>{t.spouse}</div>
                <div style={{ fontWeight: '600' }}>{userSituation.spouseName || t.yes}</div>
              </div>
            )}
            <div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>{t.dependents}</div>
              <div style={{ fontWeight: '600' }}>{userSituation.dependentCount || 0}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>{t.w2Forms}</div>
              <div style={{ fontWeight: '600' }}>{userSituation.w2Count || 0}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>{t.income1099}</div>
              <div style={{ fontWeight: '600' }}>{userSituation.has1099 ? t.yes : t.no}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>{t.selfEmployed}</div>
              <div style={{ fontWeight: '600' }}>{userSituation.isSelfEmployed ? t.yes : t.no}</div>
            </div>
          </div>
          
          {recommendation && (
            <div style={{ 
              marginTop: '16px', 
              padding: '12px 16px', 
              backgroundColor: '#22c55e', 
              borderRadius: '8px',
              color: 'white',
              fontWeight: '600'
            }}>
              {t.recommendedFor}: {t.plans[recommendation]?.name} - ${plans.find(p => p.id === recommendation)?.price}
            </div>
          )}
        </div>
      )}

      {/* Pricing Cards */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px' }}>
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>⏳</div>
          <p style={{ color: '#64748b' }}>{t.analyzing}</p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '20px',
          maxWidth: '1400px',
          margin: '0 auto'
        }}>
          {plans.map(plan => {
            const isRecommended = recommendation === plan.id;
            const planT = t.plans[plan.id];
            
            return (
              <div
                key={plan.id}
                style={{
                  backgroundColor: 'white',
                  borderRadius: '16px',
                  padding: '24px',
                  boxShadow: isRecommended 
                    ? `0 20px 40px ${plan.color}33` 
                    : '0 4px 20px rgba(0,0,0,0.06)',
                  border: isRecommended 
                    ? `3px solid ${plan.color}` 
                    : '1px solid #e2e8f0',
                  position: 'relative',
                  transform: isRecommended ? 'scale(1.02)' : 'scale(1)',
                  transition: 'transform 0.2s'
                }}
              >
                {/* Recommended Badge */}
                {isRecommended && (
                  <div style={{
                    position: 'absolute',
                    top: '-12px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: plan.color,
                    color: 'white',
                    padding: '4px 16px',
                    borderRadius: '20px',
                    fontSize: '11px',
                    fontWeight: '700',
                    whiteSpace: 'nowrap'
                  }}>
                    {t.recommendedFor.replace('✓ ', '')}
                  </div>
                )}

                {/* Popular Badge */}
                {plan.popular && !isRecommended && (
                  <div style={{
                    position: 'absolute',
                    top: '-12px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: '#f59e0b',
                    color: 'white',
                    padding: '4px 16px',
                    borderRadius: '20px',
                    fontSize: '11px',
                    fontWeight: '700'
                  }}>
                    {t.mostPopular}
                  </div>
                )}

                {/* Icon & Name */}
                <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                  <div style={{ fontSize: '40px', marginBottom: '8px' }}>{plan.icon}</div>
                  <h3 style={{ margin: '0 0 4px', color: plan.color, fontSize: '20px' }}>
                    {planT?.name}
                  </h3>
                  <p style={{ color: '#64748b', fontSize: '13px', margin: 0 }}>
                    {planT?.desc}
                  </p>
                </div>

                {/* Price */}
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                  <span style={{ fontSize: '42px', fontWeight: '800', color: '#1e293b' }}>
                    ${plan.price}
                  </span>
                </div>

                {/* Features */}
                <ul style={{ 
                  listStyle: 'none', 
                  padding: 0, 
                  margin: '0 0 20px',
                  fontSize: '13px'
                }}>
                  {plan.features.map((feature, idx) => (
                    <li key={idx} style={{
                      padding: '8px 0',
                      color: '#475569',
                      borderBottom: '1px solid #f1f5f9',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <span style={{ color: plan.color }}>✓</span>
                      {t.features[feature]}
                    </li>
                  ))}
                </ul>

                {/* Best For */}
                <p style={{ 
                  fontSize: '12px', 
                  color: '#94a3b8', 
                  textAlign: 'center',
                  marginBottom: '16px',
                  fontStyle: 'italic'
                }}>
                  {t.bestFor}: {planT?.bestFor}
                </p>

                {/* CTA Button */}
                <button
                  onClick={() => handleSelectPlan(plan.id)}
                  style={{
                    width: '100%',
                    padding: '14px',
                    fontSize: '16px',
                    fontWeight: '600',
                    borderRadius: '10px',
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: isRecommended ? plan.color : '#1e293b',
                    color: 'white',
                    transition: 'opacity 0.2s'
                  }}
                  onMouseOver={(e) => e.target.style.opacity = '0.9'}
                  onMouseOut={(e) => e.target.style.opacity = '1'}
                >
                  {isRecommended ? `${t.selectThisPlan} →` : t.selectPlan}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer */}
      <div style={{ 
        textAlign: 'center', 
        marginTop: '48px',
        color: '#64748b',
        fontSize: '14px'
      }}>
        <p>{t.securePayment}</p>
        <p>{t.dataProtected}</p>
        <p>{t.moneyBack}</p>
      </div>
    </div>
  );
}