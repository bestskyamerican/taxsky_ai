// ============================================================
// PRICING PAGE - Auto-Detect Filing Type
// ============================================================
// Location: frontend/src/pages/PricingPage.jsx
// ============================================================

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function PricingPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [recommendation, setRecommendation] = useState(null);
  const [userSituation, setUserSituation] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const token = localStorage.getItem('token');
  const userId = user.id || user.userId;

  // All pricing plans
  const plans = [
    {
      id: 'single_simple',
      name: 'Single Filing',
      price: 19.99,
      description: 'Single filer, W-2 income',
      icon: '👤',
      color: '#64748b',
      features: [
        'Federal tax return',
        'State tax return',
        '1 W-2 form',
        'Standard deduction',
        'AI chat assistance'
      ],
      bestFor: 'Single person with one job'
    },
    {
      id: 'single_plus',
      name: 'Single Plus',
      price: 29.99,
      description: 'Multiple income sources',
      icon: '👤+',
      color: '#3b82f6',
      features: [
        'Everything in Single',
        'Multiple W-2s',
        '1099 income',
        'Investment income',
        'Priority support'
      ],
      bestFor: 'Single person with multiple jobs or 1099'
    },
    {
      id: 'married_simple',
      name: 'Married Filing',
      price: 29.99,
      description: 'Married couple, no kids',
      icon: '👫',
      color: '#8b5cf6',
      features: [
        'Federal + State returns',
        'Both spouses W-2s',
        'Joint filing optimization',
        'Deduction maximization'
      ],
      bestFor: 'Married couple without children'
    },
    {
      id: 'family',
      name: 'Family Filing',
      price: 39.99,
      description: 'Married with dependents',
      icon: '👨‍👩‍👧‍👦',
      color: '#22c55e',
      popular: true,
      features: [
        'Everything in Married',
        'Unlimited dependents',
        'Child Tax Credit',
        'EITC calculation',
        'Dependent care credits'
      ],
      bestFor: 'Family with children'
    },
    {
      id: 'head_of_household',
      name: 'Head of Household',
      price: 34.99,
      description: 'Single parent with kids',
      icon: '👨‍👧',
      color: '#f59e0b',
      features: [
        'Federal + State returns',
        'HOH status optimization',
        'Child Tax Credit',
        'EITC calculation',
        'Dependent credits'
      ],
      bestFor: 'Single parent supporting children'
    },
    {
      id: 'self_employed',
      name: 'Self-Employed',
      price: 49.99,
      description: '1099 / Business income',
      icon: '💼',
      color: '#ef4444',
      features: [
        'Federal + State returns',
        'Schedule C',
        'Business expenses',
        'Self-employment tax',
        'Quarterly estimates'
      ],
      bestFor: 'Freelancers, contractors, gig workers'
    },
    {
      id: 'self_employed_family',
      name: 'Self-Employed Family',
      price: 59.99,
      description: 'Business owner with family',
      icon: '💼👨‍👩‍👧',
      color: '#dc2626',
      features: [
        'Everything in Self-Employed',
        'Family credits',
        'Child Tax Credit',
        'EITC',
        'Home office deduction'
      ],
      bestFor: 'Self-employed with dependents'
    },
    {
      id: 'premium',
      name: 'Premium + CPA',
      price: 79.99,
      description: 'CPA review included',
      icon: '⭐',
      color: '#7c3aed',
      features: [
        'Any filing type',
        'CPA reviews your return',
        'Audit protection',
        '1-on-1 support',
        'Max refund guarantee'
      ],
      bestFor: 'Complex returns or peace of mind'
    }
  ];

  // Load recommendation on mount
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
        setSelectedPlan(data.recommendedPlan);
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
    
    setSelectedPlan(planId);
    navigate(`/checkout/${planId}`);
  }

  // Get display name for filing status
  function getFilingStatusDisplay(status) {
    const map = {
      'single': 'Single',
      'married_filing_jointly': 'Married Filing Jointly',
      'married_filing_separately': 'Married Filing Separately',
      'head_of_household': 'Head of Household'
    };
    return map[status] || status;
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', padding: '40px 20px' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <h1 style={{ fontSize: '36px', fontWeight: '700', color: '#1e293b', marginBottom: '8px' }}>
          🌤️ TaxSky Pricing
        </h1>
        <p style={{ fontSize: '18px', color: '#64748b' }}>
          Choose the plan that fits your tax situation
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
            📊 Your Tax Situation
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
            <div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>Filing Status</div>
              <div style={{ fontWeight: '600' }}>{getFilingStatusDisplay(userSituation.filingStatus)}</div>
            </div>
            {userSituation.hasSpouse && (
              <div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>Spouse</div>
                <div style={{ fontWeight: '600' }}>{userSituation.spouseName || 'Yes'}</div>
              </div>
            )}
            <div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>Dependents</div>
              <div style={{ fontWeight: '600' }}>{userSituation.dependentCount || 0}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>W-2 Forms</div>
              <div style={{ fontWeight: '600' }}>{userSituation.w2Count || 0}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>1099 Income</div>
              <div style={{ fontWeight: '600' }}>{userSituation.has1099 ? 'Yes' : 'No'}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>Self-Employed</div>
              <div style={{ fontWeight: '600' }}>{userSituation.isSelfEmployed ? 'Yes' : 'No'}</div>
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
              ✓ Recommended for you: {plans.find(p => p.id === recommendation)?.name} - ${plans.find(p => p.id === recommendation)?.price}
            </div>
          )}
        </div>
      )}

      {/* Pricing Cards */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px' }}>
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>⏳</div>
          <p style={{ color: '#64748b' }}>Analyzing your tax situation...</p>
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
                    ✓ RECOMMENDED FOR YOU
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
                    MOST POPULAR
                  </div>
                )}

                {/* Icon & Name */}
                <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                  <div style={{ fontSize: '40px', marginBottom: '8px' }}>{plan.icon}</div>
                  <h3 style={{ margin: '0 0 4px', color: plan.color, fontSize: '20px' }}>
                    {plan.name}
                  </h3>
                  <p style={{ color: '#64748b', fontSize: '13px', margin: 0 }}>
                    {plan.description}
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
                      {feature}
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
                  Best for: {plan.bestFor}
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
                  {isRecommended ? 'Select This Plan →' : 'Select Plan'}
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
        <p>💳 Secure payment powered by Stripe</p>
        <p>🔒 Your data is encrypted and protected</p>
        <p>💰 30-day money-back guarantee</p>
      </div>
    </div>
  );
}
