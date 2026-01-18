// ============================================================
// PRICING PAGE - TaxSky Payment Plans
// ============================================================
// Location: frontend/src/pages/PricingPage.jsx
// ============================================================

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function PricingPage() {
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [userAccess, setUserAccess] = useState(null);
  
  // Get user from localStorage
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const token = localStorage.getItem('token');
  
  const plans = [
    {
      id: 'basic',
      name: 'Basic',
      price: 0,
      priceLabel: 'FREE',
      description: 'Simple W-2 filing',
      features: [
        '✓ Federal tax return',
        '✓ Single W-2 income',
        '✓ Standard deduction',
        '✓ AI chat assistance',
        '✗ State filing',
        '✗ 1099 income',
      ],
      color: '#64748b',
      popular: false
    },
    {
      id: 'standard',
      name: 'Standard',
      price: 29.99,
      priceLabel: '$29.99',
      description: 'Most popular choice',
      features: [
        '✓ Everything in Basic',
        '✓ State tax return included',
        '✓ Multiple W-2s',
        '✓ 1099 income support',
        '✓ Itemized deductions',
        '✓ Priority support',
      ],
      color: '#2563eb',
      popular: true
    },
    {
      id: 'premium',
      name: 'Premium',
      price: 49.99,
      priceLabel: '$49.99',
      description: 'Self-employed & complex',
      features: [
        '✓ Everything in Standard',
        '✓ Self-employment income',
        '✓ Business expenses',
        '✓ Investment income',
        '✓ Audit protection',
        '✓ CPA review included',
      ],
      color: '#7c3aed',
      popular: false
    }
  ];

  const addons = [
    {
      id: 'state_filing',
      name: 'Additional State',
      price: 14.99,
      description: 'File in another state'
    },
    {
      id: 'audit_protection',
      name: 'Audit Protection',
      price: 19.99,
      description: '3-year audit assistance'
    }
  ];

  // Check user's current access
  useEffect(() => {
    if (user.id || user.userId) {
      checkUserAccess();
    }
  }, []);

  async function checkUserAccess() {
    try {
      const userId = user.id || user.userId;
      const res = await fetch(`${API_URL}/api/payments/access/${userId}/2024`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setUserAccess(data.access);
      }
    } catch (err) {
      console.error('Error checking access:', err);
    }
  }

  async function handleSelectPlan(planId) {
    if (!user.id && !user.userId) {
      // Redirect to login
      localStorage.setItem('pendingPlan', planId);
      navigate('/login');
      return;
    }
    
    setSelectedPlan(planId);
    
    if (planId === 'basic') {
      // Free plan - activate immediately
      setLoading(true);
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
            productType: 'basic'
          })
        });
        const data = await res.json();
        if (data.success) {
          alert('Basic plan activated! You can now file your federal taxes.');
          navigate('/taxchat');
        }
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    } else {
      // Paid plan - go to checkout
      navigate(`/checkout/${planId}`);
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      padding: '40px 20px'
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '48px' }}>
        <h1 style={{ 
          fontSize: '36px', 
          fontWeight: '700', 
          color: '#1e293b',
          marginBottom: '12px'
        }}>
          🌤️ TaxSky Pricing
        </h1>
        <p style={{ fontSize: '18px', color: '#64748b' }}>
          Simple, transparent pricing for your tax filing needs
        </p>
      </div>

      {/* Plans */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '24px',
        flexWrap: 'wrap',
        maxWidth: '1200px',
        margin: '0 auto 48px'
      }}>
        {plans.map(plan => (
          <div
            key={plan.id}
            style={{
              backgroundColor: 'white',
              borderRadius: '16px',
              padding: '32px',
              width: '320px',
              boxShadow: plan.popular 
                ? '0 20px 40px rgba(37, 99, 235, 0.2)' 
                : '0 4px 20px rgba(0,0,0,0.08)',
              border: plan.popular ? `3px solid ${plan.color}` : '1px solid #e2e8f0',
              position: 'relative',
              transform: plan.popular ? 'scale(1.05)' : 'scale(1)'
            }}
          >
            {/* Popular Badge */}
            {plan.popular && (
              <div style={{
                position: 'absolute',
                top: '-12px',
                left: '50%',
                transform: 'translateX(-50%)',
                backgroundColor: plan.color,
                color: 'white',
                padding: '4px 16px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: '600'
              }}>
                MOST POPULAR
              </div>
            )}

            {/* Plan Name */}
            <h2 style={{ 
              fontSize: '24px', 
              fontWeight: '700', 
              color: plan.color,
              marginBottom: '8px'
            }}>
              {plan.name}
            </h2>
            
            <p style={{ color: '#64748b', marginBottom: '16px', fontSize: '14px' }}>
              {plan.description}
            </p>

            {/* Price */}
            <div style={{ marginBottom: '24px' }}>
              <span style={{ 
                fontSize: '48px', 
                fontWeight: '800', 
                color: '#1e293b' 
              }}>
                {plan.priceLabel}
              </span>
              {plan.price > 0 && (
                <span style={{ color: '#64748b', fontSize: '14px' }}> / filing</span>
              )}
            </div>

            {/* Features */}
            <ul style={{ 
              listStyle: 'none', 
              padding: 0, 
              margin: '0 0 24px',
              fontSize: '14px'
            }}>
              {plan.features.map((feature, idx) => (
                <li 
                  key={idx}
                  style={{
                    padding: '8px 0',
                    color: feature.startsWith('✗') ? '#94a3b8' : '#475569',
                    borderBottom: '1px solid #f1f5f9'
                  }}
                >
                  {feature}
                </li>
              ))}
            </ul>

            {/* CTA Button */}
            <button
              onClick={() => handleSelectPlan(plan.id)}
              disabled={loading || (userAccess && userAccess[plan.id])}
              style={{
                width: '100%',
                padding: '14px',
                fontSize: '16px',
                fontWeight: '600',
                borderRadius: '10px',
                border: 'none',
                cursor: (userAccess && userAccess[plan.id]) ? 'not-allowed' : 'pointer',
                backgroundColor: (userAccess && userAccess[plan.id]) 
                  ? '#94a3b8' 
                  : plan.popular ? plan.color : '#1e293b',
                color: 'white',
                transition: 'transform 0.2s, box-shadow 0.2s'
              }}
            >
              {loading && selectedPlan === plan.id 
                ? 'Processing...' 
                : (userAccess && userAccess[plan.id])
                  ? '✓ Already Purchased'
                  : plan.price === 0 
                    ? 'Get Started Free' 
                    : 'Select Plan'}
            </button>
          </div>
        ))}
      </div>

      {/* Add-ons */}
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h3 style={{ 
          textAlign: 'center', 
          marginBottom: '24px',
          color: '#475569'
        }}>
          Optional Add-ons
        </h3>
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
          {addons.map(addon => (
            <div
              key={addon.id}
              style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '20px 24px',
                border: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                minWidth: '280px'
              }}
            >
              <div>
                <div style={{ fontWeight: '600', color: '#1e293b' }}>{addon.name}</div>
                <div style={{ fontSize: '13px', color: '#64748b' }}>{addon.description}</div>
              </div>
              <div style={{ 
                fontSize: '20px', 
                fontWeight: '700', 
                color: '#2563eb',
                whiteSpace: 'nowrap'
              }}>
                ${addon.price}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ / Trust */}
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
