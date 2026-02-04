// ============================================================
// CPA PARTNER DISCLOSURE - TaxSky AI
// ============================================================
// Show this when user selects CPA Review option
// Required for legal compliance
// ============================================================

import React, { useState } from 'react';

export default function CPAPartnerDisclosure({ 
  onAccept, 
  onDecline,
  cpaFee = 59,
  formCount = 1 
}) {
  const [agreed, setAgreed] = useState(false);
  const totalFee = cpaFee * formCount;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerIcon}>👨‍💼</div>
          <div>
            <h2 style={styles.headerTitle}>CPA Review Service</h2>
            <p style={styles.headerSubtitle}>Professional Review & E-Filing</p>
          </div>
        </div>
        
        {/* Content */}
        <div style={styles.content}>
          {/* What You Get */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>✅ What's Included</h3>
            <ul style={styles.benefitList}>
              <li style={styles.benefitItem}>
                <span style={styles.checkIcon}>✓</span>
                <span>Licensed CPA reviews your tax return for accuracy</span>
              </li>
              <li style={styles.benefitItem}>
                <span style={styles.checkIcon}>✓</span>
                <span>CPA e-files your return directly to IRS</span>
              </li>
              <li style={styles.benefitItem}>
                <span style={styles.checkIcon}>✓</span>
                <span>Professional checks for missed deductions</span>
              </li>
              <li style={styles.benefitItem}>
                <span style={styles.checkIcon}>✓</span>
                <span>Audit support included for 3 years</span>
              </li>
              <li style={styles.benefitItem}>
                <span style={styles.checkIcon}>✓</span>
                <span>Direct communication with CPA if questions arise</span>
              </li>
            </ul>
          </div>
          
          {/* Important Disclosure */}
          <div style={styles.disclosureBox}>
            <h3 style={styles.disclosureTitle}>📋 Important Disclosure</h3>
            <div style={styles.disclosureContent}>
              <p style={styles.disclosureText}>
                <strong>Independent CPA Service:</strong> When you select CPA Review, your 
                tax return will be reviewed and filed by an independent, licensed Certified 
                Public Accountant (CPA). The CPA is not an employee of TaxSky AI.
              </p>
              <p style={styles.disclosureText}>
                <strong>CPA Responsibility:</strong> The reviewing CPA takes professional 
                responsibility for the accuracy of your filed return and maintains their 
                own Errors & Omissions (E&O) insurance.
              </p>
              <p style={styles.disclosureText}>
                <strong>TaxSky Role:</strong> TaxSky AI provides the tax preparation software 
                and facilitates the connection with our CPA partner network. TaxSky AI is 
                not a CPA firm and does not provide tax advice.
              </p>
              <p style={styles.disclosureText}>
                <strong>Data Sharing:</strong> By selecting CPA Review, you authorize TaxSky AI 
                to share your tax return information with the assigned CPA for review and filing 
                purposes.
              </p>
            </div>
          </div>
          
          {/* Pricing */}
          <div style={styles.pricingBox}>
            <div style={styles.pricingRow}>
              <span style={styles.pricingLabel}>CPA Review Fee</span>
              <span style={styles.pricingValue}>${cpaFee} × {formCount} form(s)</span>
            </div>
            <div style={styles.pricingTotal}>
              <span>Total CPA Fee</span>
              <span style={styles.totalValue}>${totalFee}</span>
            </div>
          </div>
          
          {/* How It Works */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>📝 How It Works</h3>
            <div style={styles.stepsList}>
              <div style={styles.step}>
                <div style={styles.stepNumber}>1</div>
                <div style={styles.stepContent}>
                  <strong>You Complete</strong>
                  <p>Finish entering your tax information in TaxSky AI</p>
                </div>
              </div>
              <div style={styles.step}>
                <div style={styles.stepNumber}>2</div>
                <div style={styles.stepContent}>
                  <strong>CPA Reviews</strong>
                  <p>Licensed CPA reviews your return within 24-48 hours</p>
                </div>
              </div>
              <div style={styles.step}>
                <div style={styles.stepNumber}>3</div>
                <div style={styles.stepContent}>
                  <strong>You Approve</strong>
                  <p>Sign Form 8879 to authorize e-filing</p>
                </div>
              </div>
              <div style={styles.step}>
                <div style={styles.stepNumber}>4</div>
                <div style={styles.stepContent}>
                  <strong>CPA E-Files</strong>
                  <p>CPA submits your return to IRS electronically</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Agreement Checkbox */}
          <label style={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              style={styles.checkbox}
            />
            <span style={styles.checkboxText}>
              I understand and agree to the CPA Review Service terms. I authorize 
              TaxSky AI to share my tax information with the assigned CPA for review 
              and e-filing purposes.
            </span>
          </label>
        </div>
        
        {/* Footer */}
        <div style={styles.footer}>
          <button onClick={onDecline} style={styles.declineBtn}>
            No Thanks
          </button>
          <button 
            onClick={onAccept} 
            disabled={!agreed}
            style={{
              ...styles.acceptBtn,
              opacity: agreed ? 1 : 0.5,
              cursor: agreed ? 'pointer' : 'not-allowed',
            }}
          >
            👨‍💼 Add CPA Review (+${totalFee})
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// COMPACT VERSION - For inline use in SubmitFlow
// ============================================================
export function CPAReviewBadge({ selected, onToggle, fee = 59 }) {
  return (
    <div 
      onClick={onToggle}
      style={{
        ...badgeStyles.container,
        borderColor: selected ? '#10b981' : 'rgba(255,255,255,0.1)',
        backgroundColor: selected ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255,255,255,0.03)',
      }}
    >
      <div style={badgeStyles.header}>
        <span style={badgeStyles.icon}>👨‍💼</span>
        <div style={badgeStyles.titleWrap}>
          <span style={badgeStyles.title}>CPA Review</span>
          <span style={badgeStyles.price}>+${fee}</span>
        </div>
        <div style={{
          ...badgeStyles.checkbox,
          backgroundColor: selected ? '#10b981' : 'transparent',
          borderColor: selected ? '#10b981' : 'rgba(255,255,255,0.3)',
        }}>
          {selected && <span style={badgeStyles.checkmark}>✓</span>}
        </div>
      </div>
      <p style={badgeStyles.description}>
        Licensed CPA reviews & e-files your return
      </p>
      {selected && (
        <div style={badgeStyles.disclosure}>
          ℹ️ CPA is an independent professional, not a TaxSky employee
        </div>
      )}
    </div>
  );
}

const badgeStyles = {
  container: {
    padding: 16,
    borderRadius: 12,
    border: '2px solid',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    marginBottom: 12,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  icon: {
    fontSize: 24,
  },
  titleWrap: {
    flex: 1,
  },
  title: {
    display: 'block',
    fontSize: 15,
    fontWeight: 600,
    color: '#e2e8f0',
  },
  price: {
    fontSize: 13,
    color: '#10b981',
    fontWeight: 600,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    border: '2px solid',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  description: {
    margin: 0,
    fontSize: 13,
    color: '#94a3b8',
  },
  disclosure: {
    marginTop: 12,
    padding: '8px 12px',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 8,
    fontSize: 12,
    color: '#60a5fa',
  },
};

// ============================================================
// STYLES
// ============================================================
const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.9)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1200,
    padding: 16,
  },
  modal: {
    backgroundColor: '#0f172a',
    borderRadius: 20,
    width: '100%',
    maxWidth: 550,
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
    border: '1px solid rgba(255,255,255,0.1)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    padding: '24px',
    background: 'linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)',
    color: 'white',
  },
  headerIcon: {
    fontSize: 40,
  },
  headerTitle: {
    margin: 0,
    fontSize: 22,
    fontWeight: 700,
  },
  headerSubtitle: {
    margin: '4px 0 0',
    opacity: 0.9,
    fontSize: 14,
  },
  content: {
    padding: 24,
    overflowY: 'auto',
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    margin: '0 0 12px',
    fontSize: 16,
    fontWeight: 600,
    color: '#e2e8f0',
  },
  benefitList: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
  },
  benefitItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
    padding: '8px 0',
    fontSize: 14,
    color: '#94a3b8',
  },
  checkIcon: {
    color: '#10b981',
    fontWeight: 'bold',
  },
  disclosureBox: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    border: '1px solid rgba(245, 158, 11, 0.3)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  disclosureTitle: {
    margin: '0 0 12px',
    fontSize: 15,
    fontWeight: 600,
    color: '#fbbf24',
  },
  disclosureContent: {},
  disclosureText: {
    margin: '0 0 12px',
    fontSize: 13,
    color: '#94a3b8',
    lineHeight: 1.6,
  },
  pricingBox: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    border: '1px solid rgba(255,255,255,0.06)',
  },
  pricingRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    fontSize: 14,
    color: '#94a3b8',
  },
  pricingLabel: {},
  pricingValue: {},
  pricingTotal: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '12px 0 0',
    marginTop: 8,
    borderTop: '1px solid rgba(255,255,255,0.1)',
    fontSize: 16,
    fontWeight: 600,
    color: '#e2e8f0',
  },
  totalValue: {
    color: '#10b981',
  },
  stepsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  step: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: '50%',
    backgroundColor: 'rgba(124, 58, 237, 0.2)',
    color: '#a78bfa',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 14,
    fontWeight: 600,
    flexShrink: 0,
  },
  stepContent: {
    flex: 1,
    fontSize: 14,
    color: '#94a3b8',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    border: '1px solid rgba(16, 185, 129, 0.3)',
    borderRadius: 12,
    cursor: 'pointer',
  },
  checkbox: {
    width: 20,
    height: 20,
    marginTop: 2,
    accentColor: '#10b981',
  },
  checkboxText: {
    fontSize: 13,
    color: '#94a3b8',
    lineHeight: 1.5,
  },
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '16px 24px',
    borderTop: '1px solid rgba(255,255,255,0.06)',
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  declineBtn: {
    padding: '12px 24px',
    fontSize: 14,
    fontWeight: 500,
    backgroundColor: 'rgba(255,255,255,0.05)',
    color: '#94a3b8',
    border: '2px solid rgba(255,255,255,0.1)',
    borderRadius: 10,
    cursor: 'pointer',
  },
  acceptBtn: {
    padding: '12px 24px',
    fontSize: 14,
    fontWeight: 600,
    color: 'white',
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    border: 'none',
    borderRadius: 10,
    cursor: 'pointer',
  },
};
