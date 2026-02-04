// ============================================================
// FILING CHOICE - Choose Self-File or CPA Service
// ============================================================
// Location: src/components/FilingChoice.jsx
//
// Drop-in replacement for opening SubmitFlow directly.
// Shows 2 options:
//   1. Self-File → opens existing SubmitFlow.jsx (FREE)
//   2. CPA Service → opens CPAReviewTax.jsx (bid marketplace)
//
// Same props as SubmitFlow: onClose, taxData, userData, userId, token
// ============================================================

import React, { useState } from 'react';
import SubmitFlow from './SubmitFlow';
import CPAReviewTax from './cpa/CPAReviewTax';

export default function FilingChoice({ onClose, taxData, userData, userId, token }) {
  const [choice, setChoice] = useState(null); // null | 'self' | 'cpa'

  // If user already chose, render that flow
  if (choice === 'self') {
    return <SubmitFlow onClose={onClose} taxData={taxData} userData={userData} userId={userId} token={token} />;
  }
  if (choice === 'cpa') {
    return <CPAReviewTax onClose={onClose} taxData={taxData} userData={userData} userId={userId} token={token} />;
  }

  // Choice Screen
  return (
    <div style={s.overlay}>
      <div style={s.modal}>

        {/* Header */}
        <div style={s.header}>
          <div>
            <h2 style={s.title}>📋 File Your Tax Return</h2>
            <p style={s.subtitle}>Tax Year 2025 — Choose how you'd like to file</p>
          </div>
          <button onClick={onClose} style={s.closeBtn}>×</button>
        </div>

        {/* Cards */}
        <div style={s.body}>
          <div style={s.cardGrid}>

            {/* Option 1: Self-File */}
            <div
              style={s.card}
              onClick={() => setChoice('self')}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#10b981'; e.currentTarget.style.transform = 'translateY(-4px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <div style={{ fontSize: 40, marginBottom: 12 }}>📄</div>
              <div style={s.cardLabel}>Self-File</div>
              <div style={s.cardPrice}>
                <span style={{ fontSize: 28, fontWeight: 800, color: '#10b981' }}>FREE</span>
              </div>
              <p style={s.cardDesc}>Fill out your info, review, sign, and download your tax forms yourself.</p>
              <div style={s.featureList}>
                <span style={s.feature}>✓ Federal Form 1040</span>
                <span style={s.feature}>✓ State return included</span>
                <span style={s.feature}>✓ Instant PDF download</span>
                <span style={s.feature}>✓ No cost, no hidden fees</span>
              </div>
              <button style={{ ...s.chooseBtn, background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
                Start Self-File →
              </button>
            </div>

            {/* Option 2: CPA Service */}
            <div
              style={{ ...s.card, position: 'relative' }}
              onClick={() => setChoice('cpa')}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#7c3aed'; e.currentTarget.style.transform = 'translateY(-4px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <div style={s.recBadge}>⭐ Recommended</div>
              <div style={{ fontSize: 40, marginBottom: 12 }}>👨‍💼</div>
              <div style={s.cardLabel}>CPA Service</div>
              <div style={s.cardPrice}>
                <span style={{ fontSize: 18, fontWeight: 600, color: '#a78bfa' }}>CPAs bid their price</span>
              </div>
              <p style={s.cardDesc}>Post your return anonymously. Licensed CPAs compete to review it — you pick the best offer.</p>
              <div style={s.featureList}>
                <span style={s.feature}>✓ Everything in Self-File</span>
                <span style={s.feature}>✓ CPAs compete for your job</span>
                <span style={s.feature}>✓ You choose price & CPA</span>
                <span style={s.feature}>✓ Professional review</span>
                <span style={s.feature}>✓ SSN stays encrypted</span>
              </div>
              <button style={{ ...s.chooseBtn, background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)' }}>
                Get CPA Bids →
              </button>
            </div>

          </div>

          {/* Info Note */}
          <div style={s.infoNote}>
            💡 Self-File is always free. CPA Service posts your return anonymously — CPAs bid their own price, and you only pay after you pick one.
          </div>
        </div>
      </div>
      <style>{`@keyframes fadeIn { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }`}</style>
    </div>
  );
}

// ─── STYLES ────────────────────────────────────────────────
const s = {
  overlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex',
    alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16,
  },
  modal: {
    backgroundColor: '#0f172a', borderRadius: 20, width: '100%', maxWidth: 720,
    maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
    boxShadow: '0 25px 50px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.06)',
    animation: 'fadeIn 0.25s ease-out',
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '20px 24px', background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)', color: 'white',
  },
  title: { margin: 0, fontSize: 20, fontWeight: 700 },
  subtitle: { margin: '4px 0 0', opacity: 0.9, fontSize: 14 },
  closeBtn: {
    background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white',
    width: 36, height: 36, borderRadius: '50%', fontSize: 24, cursor: 'pointer',
  },
  body: { padding: 24, overflowY: 'auto', flex: 1 },
  cardGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 },
  card: {
    padding: 24, borderRadius: 16, textAlign: 'center', cursor: 'pointer',
    border: '2px solid rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.02)',
    transition: 'all 0.2s ease', display: 'flex', flexDirection: 'column', alignItems: 'center',
  },
  recBadge: {
    position: 'absolute', top: -1, right: -1, padding: '4px 12px',
    background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: 'white',
    fontSize: 11, fontWeight: 700, borderRadius: '0 14px 0 10px',
  },
  cardLabel: { fontSize: 20, fontWeight: 700, color: '#e2e8f0', marginBottom: 8 },
  cardPrice: { marginBottom: 12 },
  cardDesc: { fontSize: 13, color: '#94a3b8', lineHeight: 1.5, marginBottom: 16, minHeight: 40 },
  featureList: { display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20, width: '100%', textAlign: 'left' },
  feature: { fontSize: 13, color: '#94a3b8' },
  chooseBtn: {
    width: '100%', padding: '12px 20px', fontSize: 15, fontWeight: 600,
    color: 'white', border: 'none', borderRadius: 10, cursor: 'pointer', marginTop: 'auto',
  },
  infoNote: {
    marginTop: 20, padding: '12px 16px', borderRadius: 10, fontSize: 13, color: '#94a3b8',
    backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', textAlign: 'center',
  },
};