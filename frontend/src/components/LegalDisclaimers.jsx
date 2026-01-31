// ============================================================
// TAXSKY AI - LEGAL DISCLAIMER COMPONENTS
// ============================================================
// Add these to your app for legal compliance
// ============================================================

import React from 'react';

// ============================================================
// 1. TAX ESTIMATE DISCLAIMER - Show after calculations
// ============================================================
export const TaxEstimateDisclaimer = () => (
  <div style={{ 
    background: 'rgba(245,158,11,0.1)', 
    border: '1px solid rgba(245,158,11,0.3)',
    borderRadius: '10px',
    padding: '14px 16px',
    fontSize: '12px',
    color: '#94a3b8',
    marginTop: '16px',
    lineHeight: 1.5
  }}>
    <span style={{ color: '#f59e0b', marginRight: '6px' }}>⚠️</span>
    <strong style={{ color: '#e2e8f0' }}>Disclaimer:</strong> This is an <strong>estimate</strong> based on information you provided. 
    TaxSky AI is tax preparation software, not a licensed CPA, tax attorney, or financial advisor. 
    Actual results may vary. For professional tax advice, consult a licensed tax professional.
  </div>
);

// ============================================================
// 2. FOOTER DISCLAIMER - Add to page footer
// ============================================================
export const FooterDisclaimer = () => (
  <div style={{ 
    textAlign: 'center',
    padding: '20px',
    borderTop: '1px solid rgba(255,255,255,0.1)',
    marginTop: '40px',
    fontSize: '11px',
    color: '#64748b',
    lineHeight: 1.6
  }}>
    <p>
      TaxSky AI is tax preparation <strong>software</strong>, not a licensed CPA, tax attorney, or financial advisor.
    </p>
    <p style={{ marginTop: '8px' }}>
      By using TaxSky AI, you are preparing your own tax return and are responsible for its accuracy.
    </p>
    <p style={{ marginTop: '8px' }}>
      For professional tax advice, please consult a licensed tax professional.
    </p>
    <p style={{ marginTop: '12px' }}>
      <a href="/terms" style={{ color: '#60a5fa', textDecoration: 'none', marginRight: '16px' }}>Terms of Service</a>
      <a href="/privacy" style={{ color: '#60a5fa', textDecoration: 'none' }}>Privacy Policy</a>
    </p>
    <p style={{ marginTop: '12px', color: '#475569' }}>
      © {new Date().getFullYear()} TaxSky AI. All rights reserved.
    </p>
  </div>
);

// ============================================================
// 3. E-FILE CONSENT DISCLAIMER - Show before e-filing
// ============================================================
export const EFileConsentDisclaimer = ({ onAccept, onDecline }) => (
  <div style={{ 
    background: 'rgba(30, 41, 59, 0.95)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '16px',
    padding: '24px',
    maxWidth: '500px',
    margin: '0 auto'
  }}>
    <h3 style={{ color: '#fff', fontSize: '18px', marginBottom: '16px' }}>
      📋 E-File Authorization
    </h3>
    
    <div style={{ fontSize: '14px', color: '#94a3b8', lineHeight: 1.6, marginBottom: '20px' }}>
      <p style={{ marginBottom: '12px' }}>
        By clicking "I Agree", you authorize TaxSky AI to:
      </p>
      <ul style={{ paddingLeft: '20px', marginBottom: '12px' }}>
        <li>Electronically submit your tax return to the IRS and applicable state agencies</li>
        <li>Receive your tax refund information</li>
        <li>Act as your authorized e-file provider</li>
      </ul>
      <p style={{ marginBottom: '12px' }}>
        You confirm that:
      </p>
      <ul style={{ paddingLeft: '20px' }}>
        <li>All information provided is accurate and complete</li>
        <li>You are authorized to file this return</li>
        <li>You understand this is self-prepared software, not professional tax advice</li>
      </ul>
    </div>

    <div style={{ 
      background: 'rgba(245,158,11,0.1)', 
      border: '1px solid rgba(245,158,11,0.3)',
      borderRadius: '8px',
      padding: '12px',
      fontSize: '12px',
      color: '#f59e0b',
      marginBottom: '20px'
    }}>
      ⚠️ You are responsible for the accuracy of your tax return. TaxSky AI is not liable for errors, 
      penalties, or audit outcomes.
    </div>

    <div style={{ display: 'flex', gap: '12px' }}>
      <button 
        onClick={onDecline}
        style={{
          flex: 1,
          padding: '12px',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '10px',
          color: '#94a3b8',
          fontWeight: 500,
          cursor: 'pointer'
        }}
      >
        Cancel
      </button>
      <button 
        onClick={onAccept}
        style={{
          flex: 1,
          padding: '12px',
          background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
          border: 'none',
          borderRadius: '10px',
          color: '#fff',
          fontWeight: 600,
          cursor: 'pointer'
        }}
      >
        I Agree & Continue
      </button>
    </div>
  </div>
);

// ============================================================
// 4. INLINE DISCLAIMER - Short version for chat
// ============================================================
export const InlineDisclaimer = () => (
  <span style={{ 
    fontSize: '11px', 
    color: '#64748b',
    fontStyle: 'italic'
  }}>
    *Estimate only. Not professional tax advice.
  </span>
);

// ============================================================
// 5. FULL PAGE DISCLAIMER - Terms of Service style
// ============================================================
export const FullDisclaimer = () => (
  <div style={{ 
    padding: '40px 20px',
    maxWidth: '800px',
    margin: '0 auto',
    color: '#e2e8f0',
    lineHeight: 1.8
  }}>
    <h1 style={{ fontSize: '28px', marginBottom: '24px' }}>Terms of Service & Disclaimer</h1>
    
    <h2 style={{ fontSize: '20px', marginTop: '24px', marginBottom: '12px', color: '#fff' }}>
      1. Nature of Service
    </h2>
    <p style={{ color: '#94a3b8' }}>
      TaxSky AI is tax preparation SOFTWARE designed to help you prepare your own tax return. 
      TaxSky AI is NOT a Certified Public Accountant (CPA), tax attorney, enrolled agent, or 
      licensed tax professional. We do not provide personalized tax, legal, or financial advice.
    </p>

    <h2 style={{ fontSize: '20px', marginTop: '24px', marginBottom: '12px', color: '#fff' }}>
      2. Your Responsibilities
    </h2>
    <p style={{ color: '#94a3b8' }}>
      By using TaxSky AI, you acknowledge that:
    </p>
    <ul style={{ color: '#94a3b8', paddingLeft: '24px', marginTop: '12px' }}>
      <li>You are preparing your OWN tax return</li>
      <li>You are responsible for the accuracy of all information entered</li>
      <li>You are responsible for reviewing your return before filing</li>
      <li>You should consult a licensed tax professional for complex tax situations</li>
    </ul>

    <h2 style={{ fontSize: '20px', marginTop: '24px', marginBottom: '12px', color: '#fff' }}>
      3. No Guarantee
    </h2>
    <p style={{ color: '#94a3b8' }}>
      TaxSky AI does not guarantee:
    </p>
    <ul style={{ color: '#94a3b8', paddingLeft: '24px', marginTop: '12px' }}>
      <li>Specific refund amounts (estimates may vary from actual results)</li>
      <li>IRS acceptance of your return</li>
      <li>Freedom from IRS audit or penalties</li>
      <li>Accuracy of calculations if incorrect information is provided</li>
    </ul>

    <h2 style={{ fontSize: '20px', marginTop: '24px', marginBottom: '12px', color: '#fff' }}>
      4. Limitation of Liability
    </h2>
    <p style={{ color: '#94a3b8' }}>
      TaxSky AI shall not be liable for any errors, omissions, IRS penalties, audit outcomes, 
      or other damages arising from your use of our software. Our maximum liability is limited 
      to the fees you paid for our service.
    </p>

    <h2 style={{ fontSize: '20px', marginTop: '24px', marginBottom: '12px', color: '#fff' }}>
      5. Data Privacy
    </h2>
    <p style={{ color: '#94a3b8' }}>
      We take your privacy seriously. Your tax information is encrypted and stored securely. 
      We only share your data with the IRS and state tax agencies as necessary to file your return.
      See our Privacy Policy for details.
    </p>

    <h2 style={{ fontSize: '20px', marginTop: '24px', marginBottom: '12px', color: '#fff' }}>
      6. Professional Advice
    </h2>
    <p style={{ color: '#94a3b8' }}>
      If you have a complex tax situation, including but not limited to: business income, 
      rental properties, stock options, foreign income, or significant life changes, 
      we recommend consulting with a licensed tax professional.
    </p>

    <div style={{ 
      background: 'rgba(59,130,246,0.1)', 
      border: '1px solid rgba(59,130,246,0.3)',
      borderRadius: '12px',
      padding: '20px',
      marginTop: '32px'
    }}>
      <p style={{ color: '#60a5fa', fontWeight: 500 }}>
        By using TaxSky AI, you agree to these terms and acknowledge that you have read 
        and understood this disclaimer.
      </p>
    </div>
  </div>
);

export default {
  TaxEstimateDisclaimer,
  FooterDisclaimer,
  EFileConsentDisclaimer,
  InlineDisclaimer,
  FullDisclaimer
};
