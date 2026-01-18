// ============================================================
// TAXSKY TAX SUMMARY CARD - PROFESSIONAL DARK THEME
// ============================================================
// Reusable tax summary display component
// ============================================================

import React from "react";

const getLanguage = () => localStorage.getItem("taxsky_language") || "en";

const TRANSLATIONS = {
  en: {
    title: "Tax Summary",
    federal: "Federal",
    state: "California",
    totalRefund: "Total Refund",
    totalOwed: "Total Owed",
    refund: "Refund",
    owed: "Owed",
    income: "Total Income",
    deductions: "Deductions",
    taxable: "Taxable Income",
    tax: "Tax",
    credits: "Credits",
    withheld: "Withheld",
  },
  vi: {
    title: "Tóm Tắt Thuế",
    federal: "Liên Bang",
    state: "California",
    totalRefund: "Tổng Hoàn Thuế",
    totalOwed: "Tổng Nợ Thuế",
    refund: "Hoàn Thuế",
    owed: "Nợ Thuế",
    income: "Tổng Thu Nhập",
    deductions: "Khấu Trừ",
    taxable: "Thu Nhập Chịu Thuế",
    tax: "Thuế",
    credits: "Tín Dụng",
    withheld: "Đã Khấu Trừ",
  },
  es: {
    title: "Resumen Fiscal",
    federal: "Federal",
    state: "California",
    totalRefund: "Reembolso Total",
    totalOwed: "Total Adeudado",
    refund: "Reembolso",
    owed: "Adeudado",
    income: "Ingreso Total",
    deductions: "Deducciones",
    taxable: "Ingreso Gravable",
    tax: "Impuesto",
    credits: "Créditos",
    withheld: "Retenido",
  }
};

export default function TaxSummary({ 
  federal = {}, 
  state = {}, 
  compact = false,
  showDetails = true 
}) {
  const language = getLanguage();
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;

  const fmt = (num) => {
    if (!num && num !== 0) return "$0";
    return "$" + Math.abs(Math.round(num)).toLocaleString();
  };

  const federalNet = (federal.refund || 0) - (federal.amount_owed || 0);
  const stateNet = (state.refund || 0) - (state.amount_owed || 0);
  const totalNet = federalNet + stateNet;

  if (compact) {
    return (
      <div style={styles.compactCard}>
        <div style={styles.compactContent}>
          <span style={styles.compactLabel}>
            {totalNet >= 0 ? t.totalRefund : t.totalOwed}
          </span>
          <span style={{
            ...styles.compactAmount,
            color: totalNet >= 0 ? '#10b981' : '#f87171'
          }}>
            {totalNet >= 0 ? '+' : '-'}{fmt(totalNet)}
          </span>
        </div>
        <div style={styles.compactBreakdown}>
          <span>🇺🇸 {fmt(federalNet)}</span>
          <span>🌴 {fmt(stateNet)}</span>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.card}>
      {/* Hero Amount */}
      <div style={{
        ...styles.heroSection,
        background: totalNet >= 0 
          ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(16, 185, 129, 0.05))'
          : 'linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(239, 68, 68, 0.05))',
        borderColor: totalNet >= 0 ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'
      }}>
        <p style={styles.heroLabel}>
          {totalNet >= 0 ? t.totalRefund : t.totalOwed}
        </p>
        <p style={{
          ...styles.heroAmount,
          color: totalNet >= 0 ? '#10b981' : '#f87171'
        }}>
          {totalNet >= 0 ? '+' : '-'}{fmt(totalNet)}
        </p>
        <div style={styles.heroBreakdown}>
          <div style={styles.breakdownItem}>
            <span style={styles.breakdownIcon}>🇺🇸</span>
            <span style={styles.breakdownLabel}>{t.federal}</span>
            <span style={{
              ...styles.breakdownAmount,
              color: federalNet >= 0 ? '#10b981' : '#f87171'
            }}>
              {federalNet >= 0 ? '+' : ''}{fmt(federalNet)}
            </span>
          </div>
          <div style={styles.breakdownDivider} />
          <div style={styles.breakdownItem}>
            <span style={styles.breakdownIcon}>🌴</span>
            <span style={styles.breakdownLabel}>{t.state}</span>
            <span style={{
              ...styles.breakdownAmount,
              color: stateNet >= 0 ? '#10b981' : '#f87171'
            }}>
              {stateNet >= 0 ? '+' : ''}{fmt(stateNet)}
            </span>
          </div>
        </div>
      </div>

      {/* Details */}
      {showDetails && (
        <div style={styles.detailsGrid}>
          {/* Federal Details */}
          <div style={styles.detailsCard}>
            <h4 style={styles.detailsTitle}>🇺🇸 {t.federal}</h4>
            <div style={styles.detailRow}>
              <span>{t.income}</span>
              <span>{fmt(federal.total_income)}</span>
            </div>
            <div style={styles.detailRow}>
              <span>{t.deductions}</span>
              <span style={{ color: '#10b981' }}>-{fmt(federal.standard_deduction)}</span>
            </div>
            <div style={styles.detailRow}>
              <span>{t.taxable}</span>
              <span>{fmt(federal.taxable_income)}</span>
            </div>
            <div style={styles.detailRow}>
              <span>{t.tax}</span>
              <span>{fmt(federal.bracket_tax)}</span>
            </div>
            {(federal.ctc_nonrefundable > 0 || federal.eitc > 0) && (
              <div style={styles.detailRow}>
                <span>{t.credits}</span>
                <span style={{ color: '#10b981' }}>-{fmt((federal.ctc_nonrefundable || 0) + (federal.eitc || 0))}</span>
              </div>
            )}
            <div style={styles.detailRow}>
              <span>{t.withheld}</span>
              <span style={{ color: '#3b82f6' }}>+{fmt(federal.withholding)}</span>
            </div>
            <div style={styles.detailDivider} />
            <div style={styles.detailRowFinal}>
              <span>{federalNet >= 0 ? t.refund : t.owed}</span>
              <span style={{ color: federalNet >= 0 ? '#10b981' : '#f87171' }}>
                {fmt(Math.abs(federalNet))}
              </span>
            </div>
          </div>

          {/* State Details */}
          <div style={styles.detailsCard}>
            <h4 style={styles.detailsTitle}>🌴 {t.state}</h4>
            <div style={styles.detailRow}>
              <span>CA AGI</span>
              <span>{fmt(state.ca_agi)}</span>
            </div>
            <div style={styles.detailRow}>
              <span>{t.deductions}</span>
              <span style={{ color: '#10b981' }}>-{fmt(state.standard_deduction)}</span>
            </div>
            <div style={styles.detailRow}>
              <span>{t.taxable}</span>
              <span>{fmt(state.taxable_income)}</span>
            </div>
            <div style={styles.detailRow}>
              <span>{t.tax}</span>
              <span>{fmt(state.base_tax || state.total_tax)}</span>
            </div>
            {(state.caleitc > 0 || state.yctc > 0) && (
              <div style={styles.detailRow}>
                <span>{t.credits}</span>
                <span style={{ color: '#10b981' }}>-{fmt((state.caleitc || 0) + (state.yctc || 0))}</span>
              </div>
            )}
            <div style={styles.detailRow}>
              <span>{t.withheld}</span>
              <span style={{ color: '#3b82f6' }}>+{fmt(state.withholding)}</span>
            </div>
            <div style={styles.detailDivider} />
            <div style={styles.detailRowFinal}>
              <span>{stateNet >= 0 ? t.refund : t.owed}</span>
              <span style={{ color: stateNet >= 0 ? '#10b981' : '#f87171' }}>
                {fmt(Math.abs(stateNet))}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  card: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 20,
    overflow: 'hidden',
  },
  heroSection: {
    padding: 32,
    textAlign: 'center',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
  },
  heroLabel: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 8,
  },
  heroAmount: {
    fontSize: 48,
    fontWeight: 800,
    marginBottom: 24,
  },
  heroBreakdown: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 32,
  },
  breakdownItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
  },
  breakdownIcon: {
    fontSize: 20,
  },
  breakdownLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  breakdownAmount: {
    fontSize: 18,
    fontWeight: 700,
  },
  breakdownDivider: {
    width: 1,
    height: 50,
    background: 'rgba(255,255,255,0.1)',
  },
  detailsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 1,
    background: 'rgba(255,255,255,0.03)',
  },
  detailsCard: {
    padding: 20,
    background: 'rgba(15, 23, 42, 0.5)',
  },
  detailsTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: '#e2e8f0',
    marginBottom: 16,
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 13,
    color: '#94a3b8',
    marginBottom: 8,
  },
  detailDivider: {
    height: 1,
    background: 'rgba(255,255,255,0.06)',
    margin: '12px 0',
  },
  detailRowFinal: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 15,
    fontWeight: 700,
    color: '#e2e8f0',
  },
  // Compact styles
  compactCard: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 12,
    padding: 16,
  },
  compactContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  compactLabel: {
    fontSize: 13,
    color: '#94a3b8',
  },
  compactAmount: {
    fontSize: 20,
    fontWeight: 700,
  },
  compactBreakdown: {
    display: 'flex',
    gap: 16,
    fontSize: 12,
    color: '#64748b',
  },
};