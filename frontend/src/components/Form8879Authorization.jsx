// ============================================================
// FORM 8879 - IRS E-FILE SIGNATURE AUTHORIZATION
// ============================================================
// Required when CPA partner e-files on behalf of taxpayer
// User must sign this before CPA can submit return
// ============================================================

import React, { useState } from 'react';

export default function Form8879Authorization({ 
  userData, 
  taxData, 
  onSign, 
  onCancel 
}) {
  const [signature, setSignature] = useState('');
  const [spouseSignature, setSpouseSignature] = useState('');
  const [signatureDate, setSignatureDate] = useState(new Date().toISOString().split('T')[0]);
  const [pin, setPin] = useState('');
  const [spousePin, setSpousePin] = useState('');
  const [agreed, setAgreed] = useState(false);
  
  const isMFJ = userData?.filing_status === 'married_filing_jointly';
  const taxYear = 2025;
  
  // Generate random 5-digit PIN
  const generatePIN = () => {
    return Math.floor(10000 + Math.random() * 90000).toString();
  };
  
  const handleGeneratePIN = () => {
    setPin(generatePIN());
    if (isMFJ) {
      setSpousePin(generatePIN());
    }
  };
  
  const canSubmit = () => {
    if (!signature || !pin || !agreed) return false;
    if (isMFJ && (!spouseSignature || !spousePin)) return false;
    return true;
  };
  
  const handleSubmit = () => {
    if (!canSubmit()) return;
    
    onSign({
      taxpayer_signature: signature,
      taxpayer_pin: pin,
      spouse_signature: spouseSignature || null,
      spouse_pin: spousePin || null,
      signature_date: signatureDate,
      agreed_to_terms: true,
      signed_at: new Date().toISOString(),
    });
  };
  
  const formatSSN = (ssn) => {
    if (!ssn) return '___-__-____';
    const clean = ssn.replace(/\D/g, '');
    return clean.length >= 4 ? `XXX-XX-${clean.slice(-4)}` : '___-__-____';
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h2 style={styles.headerTitle}>📝 IRS e-file Signature Authorization</h2>
            <p style={styles.headerSubtitle}>Form 8879 • Tax Year {taxYear}</p>
          </div>
          <button onClick={onCancel} style={styles.closeBtn}>×</button>
        </div>
        
        {/* Content */}
        <div style={styles.content}>
          {/* Official Notice */}
          <div style={styles.officialBox}>
            <h3 style={styles.officialTitle}>IRS Form 8879</h3>
            <p style={styles.officialText}>
              IRS e-file Signature Authorization for Individual Tax Return
            </p>
          </div>
          
          {/* Taxpayer Info */}
          <div style={styles.section}>
            <h4 style={styles.sectionTitle}>Part I - Taxpayer Information</h4>
            <div style={styles.infoGrid}>
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>Name</span>
                <span style={styles.infoValue}>
                  {userData?.first_name} {userData?.last_name}
                </span>
              </div>
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>SSN</span>
                <span style={styles.infoValue}>{formatSSN(userData?.ssn)}</span>
              </div>
              {isMFJ && (
                <>
                  <div style={styles.infoItem}>
                    <span style={styles.infoLabel}>Spouse Name</span>
                    <span style={styles.infoValue}>
                      {userData?.spouse_first_name} {userData?.spouse_last_name}
                    </span>
                  </div>
                  <div style={styles.infoItem}>
                    <span style={styles.infoLabel}>Spouse SSN</span>
                    <span style={styles.infoValue}>{formatSSN(userData?.spouse_ssn)}</span>
                  </div>
                </>
              )}
            </div>
          </div>
          
          {/* Tax Return Summary */}
          <div style={styles.section}>
            <h4 style={styles.sectionTitle}>Part II - Tax Return Information</h4>
            <div style={styles.summaryBox}>
              <div style={styles.summaryRow}>
                <span>Adjusted Gross Income (Line 11)</span>
                <span style={styles.summaryValue}>
                  ${Number(taxData?.agi || taxData?.totalIncome || 0).toLocaleString()}
                </span>
              </div>
              <div style={styles.summaryRow}>
                <span>Total Tax (Line 24)</span>
                <span style={styles.summaryValue}>
                  ${Number(taxData?.federalTax || 0).toLocaleString()}
                </span>
              </div>
              {(taxData?.federalRefund || 0) > 0 ? (
                <div style={styles.summaryRow}>
                  <span>Refund (Line 35a)</span>
                  <span style={{ ...styles.summaryValue, color: '#10b981' }}>
                    ${Number(taxData?.federalRefund || 0).toLocaleString()}
                  </span>
                </div>
              ) : (
                <div style={styles.summaryRow}>
                  <span>Amount You Owe (Line 37)</span>
                  <span style={{ ...styles.summaryValue, color: '#ef4444' }}>
                    ${Number(taxData?.federalOwed || 0).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </div>
          
          {/* PIN Section */}
          <div style={styles.section}>
            <h4 style={styles.sectionTitle}>Part III - Self-Select PIN</h4>
            <p style={styles.pinText}>
              Your PIN is a 5-digit number that serves as your electronic signature.
            </p>
            
            <div style={styles.pinGrid}>
              <div style={styles.pinItem}>
                <label style={styles.label}>Your PIN *</label>
                <div style={styles.pinInputRow}>
                  <input
                    type="text"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 5))}
                    placeholder="12345"
                    maxLength={5}
                    style={styles.pinInput}
                  />
                  <button onClick={handleGeneratePIN} style={styles.generateBtn}>
                    🎲 Generate
                  </button>
                </div>
              </div>
              
              {isMFJ && (
                <div style={styles.pinItem}>
                  <label style={styles.label}>Spouse PIN *</label>
                  <input
                    type="text"
                    value={spousePin}
                    onChange={(e) => setSpousePin(e.target.value.replace(/\D/g, '').slice(0, 5))}
                    placeholder="12345"
                    maxLength={5}
                    style={styles.pinInput}
                  />
                </div>
              )}
            </div>
          </div>
          
          {/* Signature Section */}
          <div style={styles.section}>
            <h4 style={styles.sectionTitle}>Part IV - Signature Authorization</h4>
            
            <div style={styles.declarationBox}>
              <p style={styles.declarationText}>
                <strong>Declaration:</strong> I authorize the Electronic Return Originator (ERO) 
                to enter my PIN as my signature on my tax year {taxYear} electronically filed 
                individual income tax return. I confirm that the amounts shown above match the 
                amounts on my tax return.
              </p>
              <p style={styles.declarationText}>
                Under penalties of perjury, I declare that I have examined a copy of my 
                individual income tax return and accompanying schedules and statements, and 
                to the best of my knowledge and belief, they are true, correct, and complete.
              </p>
            </div>
            
            <div style={styles.signatureGrid}>
              <div style={styles.signatureItem}>
                <label style={styles.label}>Your Signature (Type Full Legal Name) *</label>
                <input
                  type="text"
                  value={signature}
                  onChange={(e) => setSignature(e.target.value)}
                  placeholder={`${userData?.first_name || 'John'} ${userData?.last_name || 'Smith'}`}
                  style={styles.signatureInput}
                />
              </div>
              
              <div style={styles.signatureItem}>
                <label style={styles.label}>Date</label>
                <input
                  type="date"
                  value={signatureDate}
                  onChange={(e) => setSignatureDate(e.target.value)}
                  style={styles.dateInput}
                />
              </div>
            </div>
            
            {isMFJ && (
              <div style={styles.signatureGrid}>
                <div style={styles.signatureItem}>
                  <label style={styles.label}>Spouse Signature (Type Full Legal Name) *</label>
                  <input
                    type="text"
                    value={spouseSignature}
                    onChange={(e) => setSpouseSignature(e.target.value)}
                    placeholder={`${userData?.spouse_first_name || 'Jane'} ${userData?.spouse_last_name || 'Smith'}`}
                    style={styles.signatureInput}
                  />
                </div>
              </div>
            )}
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
              I understand that by signing this authorization, I am allowing the CPA 
              to electronically file my tax return with the IRS. I have reviewed my 
              return and confirm all information is accurate.
            </span>
          </label>
          
          {/* ERO Info */}
          <div style={styles.eroBox}>
            <h4 style={styles.eroTitle}>Electronic Return Originator (ERO)</h4>
            <p style={styles.eroText}>
              Your return will be reviewed and filed by our CPA partner network.
            </p>
            <p style={styles.eroText}>
              TaxSky AI • San Jose, CA
            </p>
          </div>
        </div>
        
        {/* Footer */}
        <div style={styles.footer}>
          <button onClick={onCancel} style={styles.cancelBtn}>
            Cancel
          </button>
          <button 
            onClick={handleSubmit} 
            disabled={!canSubmit()}
            style={{
              ...styles.submitBtn,
              opacity: canSubmit() ? 1 : 0.5,
              cursor: canSubmit() ? 'pointer' : 'not-allowed',
            }}
          >
            ✍️ Sign & Authorize E-File
          </button>
        </div>
      </div>
    </div>
  );
}

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
    maxWidth: 700,
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
    border: '1px solid rgba(255,255,255,0.1)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    background: 'linear-gradient(135deg, #1e40af 0%, #7c3aed 100%)',
    color: 'white',
  },
  headerTitle: {
    margin: 0,
    fontSize: 20,
    fontWeight: 700,
  },
  headerSubtitle: {
    margin: '4px 0 0',
    opacity: 0.9,
    fontSize: 14,
  },
  closeBtn: {
    background: 'rgba(255,255,255,0.2)',
    border: 'none',
    color: 'white',
    width: 36,
    height: 36,
    borderRadius: '50%',
    fontSize: 24,
    cursor: 'pointer',
  },
  content: {
    padding: 24,
    overflowY: 'auto',
    flex: 1,
  },
  officialBox: {
    backgroundColor: 'rgba(30, 64, 175, 0.2)',
    border: '2px solid rgba(30, 64, 175, 0.4)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  officialTitle: {
    margin: '0 0 8px',
    fontSize: 18,
    fontWeight: 700,
    color: '#60a5fa',
  },
  officialText: {
    margin: 0,
    fontSize: 14,
    color: '#94a3b8',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    margin: '0 0 12px',
    fontSize: 16,
    fontWeight: 600,
    color: '#e2e8f0',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    paddingBottom: 8,
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 12,
  },
  infoItem: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 12,
    borderRadius: 8,
  },
  infoLabel: {
    display: 'block',
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    color: '#e2e8f0',
    fontWeight: 500,
  },
  summaryBox: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    padding: 16,
    border: '1px solid rgba(255,255,255,0.06)',
  },
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    fontSize: 14,
    color: '#94a3b8',
  },
  summaryValue: {
    fontWeight: 600,
    color: '#e2e8f0',
  },
  pinText: {
    fontSize: 13,
    color: '#94a3b8',
    marginBottom: 12,
  },
  pinGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 16,
  },
  pinItem: {
    marginBottom: 8,
  },
  label: {
    display: 'block',
    fontSize: 13,
    fontWeight: 500,
    marginBottom: 6,
    color: '#94a3b8',
  },
  pinInputRow: {
    display: 'flex',
    gap: 8,
  },
  pinInput: {
    flex: 1,
    padding: 12,
    fontSize: 18,
    fontFamily: 'monospace',
    letterSpacing: 8,
    textAlign: 'center',
    border: '2px solid rgba(255,255,255,0.1)',
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    color: '#e2e8f0',
  },
  generateBtn: {
    padding: '12px 16px',
    backgroundColor: 'rgba(124, 58, 237, 0.2)',
    color: '#a78bfa',
    border: '1px solid rgba(124, 58, 237, 0.3)',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 14,
    whiteSpace: 'nowrap',
  },
  declarationBox: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    border: '1px solid rgba(245, 158, 11, 0.3)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  declarationText: {
    fontSize: 13,
    color: '#fbbf24',
    lineHeight: 1.6,
    margin: '0 0 12px',
  },
  signatureGrid: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr',
    gap: 16,
    marginBottom: 12,
  },
  signatureItem: {},
  signatureInput: {
    width: '100%',
    padding: 14,
    fontSize: 18,
    fontFamily: "'Brush Script MT', cursive",
    border: '2px solid rgba(255,255,255,0.1)',
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    color: '#e2e8f0',
    boxSizing: 'border-box',
  },
  dateInput: {
    width: '100%',
    padding: 14,
    fontSize: 14,
    border: '2px solid rgba(255,255,255,0.1)',
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    color: '#e2e8f0',
    boxSizing: 'border-box',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    border: '1px solid rgba(16, 185, 129, 0.3)',
    borderRadius: 12,
    marginBottom: 16,
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
  eroBox: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    padding: 16,
    border: '1px solid rgba(255,255,255,0.06)',
  },
  eroTitle: {
    margin: '0 0 8px',
    fontSize: 14,
    fontWeight: 600,
    color: '#e2e8f0',
  },
  eroText: {
    margin: '4px 0',
    fontSize: 13,
    color: '#64748b',
  },
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '16px 24px',
    borderTop: '1px solid rgba(255,255,255,0.06)',
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  cancelBtn: {
    padding: '12px 24px',
    fontSize: 14,
    fontWeight: 500,
    backgroundColor: 'rgba(255,255,255,0.05)',
    color: '#94a3b8',
    border: '2px solid rgba(255,255,255,0.1)',
    borderRadius: 10,
    cursor: 'pointer',
  },
  submitBtn: {
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
