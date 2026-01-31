// ============================================================
// PRIVACY POLICY PAGE - TaxSky AI
// ============================================================
// Route: /privacy
// ============================================================

import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  const styles = {
    container: {
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #0a0a0f 0%, #0f172a 100%)',
      color: '#e2e8f0',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
    },
    header: {
      padding: '20px 24px',
      borderBottom: '1px solid rgba(255,255,255,0.1)',
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
    },
    backBtn: {
      padding: '10px 16px',
      background: 'rgba(255,255,255,0.05)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '10px',
      color: '#94a3b8',
      cursor: 'pointer',
      fontSize: '14px',
    },
    content: {
      maxWidth: '800px',
      margin: '0 auto',
      padding: '40px 24px 80px',
      lineHeight: 1.8,
    },
    title: {
      fontSize: '32px',
      fontWeight: 700,
      marginBottom: '8px',
      color: '#fff',
    },
    lastUpdated: {
      color: '#64748b',
      fontSize: '14px',
      marginBottom: '40px',
    },
    section: {
      marginBottom: '32px',
    },
    sectionTitle: {
      fontSize: '20px',
      fontWeight: 600,
      color: '#fff',
      marginBottom: '12px',
    },
    subTitle: {
      fontSize: '16px',
      fontWeight: 600,
      color: '#e2e8f0',
      marginTop: '16px',
      marginBottom: '8px',
    },
    text: {
      color: '#94a3b8',
      fontSize: '15px',
      marginBottom: '12px',
    },
    list: {
      paddingLeft: '24px',
      color: '#94a3b8',
      fontSize: '15px',
    },
    listItem: {
      marginBottom: '8px',
    },
    highlight: {
      background: 'rgba(16,185,129,0.1)',
      border: '1px solid rgba(16,185,129,0.3)',
      borderRadius: '12px',
      padding: '16px 20px',
      marginBottom: '24px',
    },
    highlightText: {
      color: '#10b981',
      fontSize: '14px',
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      marginTop: '16px',
      marginBottom: '16px',
    },
    th: {
      textAlign: 'left',
      padding: '12px',
      background: 'rgba(255,255,255,0.05)',
      borderBottom: '1px solid rgba(255,255,255,0.1)',
      color: '#fff',
      fontSize: '14px',
    },
    td: {
      padding: '12px',
      borderBottom: '1px solid rgba(255,255,255,0.05)',
      color: '#94a3b8',
      fontSize: '14px',
    },
    infoBox: {
      background: 'rgba(139,92,246,0.1)',
      border: '1px solid rgba(139,92,246,0.3)',
      borderRadius: '12px',
      padding: '16px 20px',
      marginTop: '40px',
    },
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button onClick={() => navigate(-1)} style={styles.backBtn}>
          ← Back
        </button>
        <span style={{ color: '#fff', fontWeight: 600 }}>TaxSky AI</span>
      </div>

      {/* Content */}
      <div style={styles.content}>
        <h1 style={styles.title}>Privacy Policy</h1>
        <p style={styles.lastUpdated}>Last Updated: January 30, 2025</p>

        {/* Security Notice */}
        <div style={styles.highlight}>
          <p style={styles.highlightText}>
            🔒 <strong>Your Privacy Matters:</strong> TaxSky AI is committed to protecting your personal 
            and financial information. We use industry-standard encryption and security measures to keep 
            your data safe.
          </p>
        </div>

        {/* Section 1 */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>1. Information We Collect</h2>
          
          <h3 style={styles.subTitle}>Personal Information</h3>
          <p style={styles.text}>To prepare your tax return, we collect:</p>
          <ul style={styles.list}>
            <li style={styles.listItem}>Full legal name</li>
            <li style={styles.listItem}>Social Security Number (SSN) or ITIN</li>
            <li style={styles.listItem}>Date of birth</li>
            <li style={styles.listItem}>Mailing address</li>
            <li style={styles.listItem}>Email address</li>
            <li style={styles.listItem}>Phone number</li>
          </ul>

          <h3 style={styles.subTitle}>Financial Information</h3>
          <ul style={styles.list}>
            <li style={styles.listItem}>W-2 forms and wage information</li>
            <li style={styles.listItem}>1099 forms (interest, dividends, self-employment)</li>
            <li style={styles.listItem}>Bank account information (for direct deposit refunds)</li>
            <li style={styles.listItem}>Investment income</li>
            <li style={styles.listItem}>Deductions and credits information</li>
          </ul>

          <h3 style={styles.subTitle}>Technical Information</h3>
          <ul style={styles.list}>
            <li style={styles.listItem}>IP address</li>
            <li style={styles.listItem}>Browser type and version</li>
            <li style={styles.listItem}>Device information</li>
            <li style={styles.listItem}>Usage data and analytics</li>
          </ul>
        </div>

        {/* Section 2 */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>2. How We Use Your Information</h2>
          
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Purpose</th>
                <th style={styles.th}>Data Used</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={styles.td}>Prepare your tax return</td>
                <td style={styles.td}>Personal & financial info</td>
              </tr>
              <tr>
                <td style={styles.td}>E-file to IRS/State</td>
                <td style={styles.td}>Tax return data</td>
              </tr>
              <tr>
                <td style={styles.td}>Process refund direct deposit</td>
                <td style={styles.td}>Bank account info</td>
              </tr>
              <tr>
                <td style={styles.td}>Customer support</td>
                <td style={styles.td}>Contact info, account data</td>
              </tr>
              <tr>
                <td style={styles.td}>Improve our Service</td>
                <td style={styles.td}>Usage analytics (anonymized)</td>
              </tr>
              <tr>
                <td style={styles.td}>Legal compliance</td>
                <td style={styles.td}>Required records</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Section 3 */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>3. Information Sharing</h2>
          <p style={styles.text}>We share your information only with:</p>
          
          <h3 style={styles.subTitle}>Government Agencies</h3>
          <ul style={styles.list}>
            <li style={styles.listItem}>Internal Revenue Service (IRS) - for federal tax filing</li>
            <li style={styles.listItem}>State tax agencies - for state tax filing</li>
          </ul>

          <h3 style={styles.subTitle}>Service Providers</h3>
          <ul style={styles.list}>
            <li style={styles.listItem}>Payment processors (for service fees)</li>
            <li style={styles.listItem}>Cloud hosting providers (encrypted storage)</li>
            <li style={styles.listItem}>E-file transmission partners (IRS-authorized)</li>
          </ul>

          <h3 style={styles.subTitle}>We Do NOT Sell Your Data</h3>
          <p style={styles.text}>
            We will NEVER sell, rent, or trade your personal or financial information to third parties 
            for marketing purposes.
          </p>
        </div>

        {/* Section 4 */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>4. Data Security</h2>
          <p style={styles.text}>We protect your information using:</p>
          <ul style={styles.list}>
            <li style={styles.listItem}>🔐 <strong>256-bit SSL/TLS encryption</strong> for all data transmission</li>
            <li style={styles.listItem}>🔒 <strong>AES-256 encryption</strong> for stored data</li>
            <li style={styles.listItem}>🛡️ <strong>Multi-factor authentication</strong> options</li>
            <li style={styles.listItem}>🔥 <strong>Firewalls and intrusion detection</strong> systems</li>
            <li style={styles.listItem}>👤 <strong>Employee access controls</strong> and background checks</li>
            <li style={styles.listItem}>📋 <strong>Regular security audits</strong> and penetration testing</li>
          </ul>
          <p style={styles.text}>
            We comply with IRS Publication 4557 security requirements for tax preparers.
          </p>
        </div>

        {/* Section 5 */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>5. Data Retention</h2>
          <p style={styles.text}>We retain your information as follows:</p>
          <ul style={styles.list}>
            <li style={styles.listItem}><strong>Tax returns:</strong> 7 years (IRS requirement)</li>
            <li style={styles.listItem}><strong>Account information:</strong> Until you delete your account</li>
            <li style={styles.listItem}><strong>Payment records:</strong> 7 years (legal requirement)</li>
            <li style={styles.listItem}><strong>Usage logs:</strong> 2 years</li>
          </ul>
          <p style={styles.text}>
            You may request deletion of your data at any time, subject to legal retention requirements.
          </p>
        </div>

        {/* Section 6 */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>6. Your Rights</h2>
          <p style={styles.text}>You have the right to:</p>
          <ul style={styles.list}>
            <li style={styles.listItem}><strong>Access</strong> - Request a copy of your personal data</li>
            <li style={styles.listItem}><strong>Correction</strong> - Request correction of inaccurate data</li>
            <li style={styles.listItem}><strong>Deletion</strong> - Request deletion of your data (subject to legal requirements)</li>
            <li style={styles.listItem}><strong>Portability</strong> - Request your data in a portable format</li>
            <li style={styles.listItem}><strong>Opt-out</strong> - Opt out of marketing communications</li>
          </ul>
          <p style={styles.text}>
            To exercise these rights, contact us at privacy@taxskyai.com
          </p>
        </div>

        {/* Section 7 */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>7. California Privacy Rights (CCPA)</h2>
          <p style={styles.text}>
            If you are a California resident, you have additional rights under the California Consumer 
            Privacy Act (CCPA):
          </p>
          <ul style={styles.list}>
            <li style={styles.listItem}>Right to know what personal information is collected</li>
            <li style={styles.listItem}>Right to know if personal information is sold or disclosed</li>
            <li style={styles.listItem}>Right to opt-out of the sale of personal information (we do not sell your data)</li>
            <li style={styles.listItem}>Right to non-discrimination for exercising privacy rights</li>
          </ul>
        </div>

        {/* Section 8 */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>8. Cookies and Tracking</h2>
          <p style={styles.text}>We use cookies for:</p>
          <ul style={styles.list}>
            <li style={styles.listItem}><strong>Essential cookies:</strong> Required for the Service to function</li>
            <li style={styles.listItem}><strong>Analytics cookies:</strong> To understand how you use our Service</li>
            <li style={styles.listItem}><strong>Preference cookies:</strong> To remember your settings</li>
          </ul>
          <p style={styles.text}>
            You can control cookies through your browser settings.
          </p>
        </div>

        {/* Section 9 */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>9. Children's Privacy</h2>
          <p style={styles.text}>
            TaxSky AI is not intended for use by anyone under 18 years of age. We do not knowingly 
            collect personal information from children under 18. If we learn we have collected such 
            information, we will delete it promptly.
          </p>
        </div>

        {/* Section 10 */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>10. Changes to This Policy</h2>
          <p style={styles.text}>
            We may update this Privacy Policy from time to time. We will notify you of significant 
            changes by email or through a notice on our website. Your continued use of the Service 
            after changes indicates acceptance of the updated policy.
          </p>
        </div>

        {/* Section 11 */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>11. Contact Us</h2>
          <p style={styles.text}>
            For privacy-related questions or to exercise your rights:
          </p>
          <p style={styles.text}>
            📧 Email: privacy@taxskyai.com<br />
            📞 Phone: +1-844-737-4799<br />
            📬 Mail: TaxSky AI Privacy Team<br />
            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[Your Business Address]<br />
            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[City, State ZIP]
          </p>
        </div>

        {/* Info Box */}
        <div style={styles.infoBox}>
          <p style={{ color: '#a78bfa', fontWeight: 500, marginBottom: '8px' }}>
            🔐 Security Tip
          </p>
          <p style={{ color: '#94a3b8', fontSize: '14px' }}>
            Never share your TaxSky AI password or tax documents via email. We will never ask for 
            your password or full SSN via email or phone. If you receive suspicious communications, 
            please report them to security@taxskyai.com
          </p>
        </div>
      </div>

      {/* Global Styles */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
        * { font-family: 'Plus Jakarta Sans', sans-serif; box-sizing: border-box; margin: 0; padding: 0; }
      `}</style>
    </div>
  );
}
