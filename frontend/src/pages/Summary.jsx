// ============================================================
// TAXSKY SUMMARY PAGE - PROFESSIONAL DARK THEME
// ============================================================
// Tax Return Summary with Refund/Owed Display
// Matches Onboarding.jsx and TaxChatPage.jsx design
// ============================================================

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../App";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";
const PYTHON_API = import.meta.env.VITE_PYTHON_API || "http://localhost:5002";

// Get language from localStorage
const getLanguage = () => localStorage.getItem("taxsky_language") || "en";

// ============================================================
// TRANSLATIONS
// ============================================================
const TRANSLATIONS = {
  en: {
    title: "Tax Summary",
    subtitle: "2025 Tax Return",
    loading: "Calculating your taxes...",
    personalInfo: "Personal Information",
    name: "Name",
    ssn: "SSN",
    address: "Address",
    filingStatus: "Filing Status",
    spouseInfo: "Spouse Information",
    dependents: "Dependents",
    noDependents: "No dependents claimed",
    federalTax: "Federal Tax",
    stateTax: "California Tax",
    totalIncome: "Total Income",
    adjustments: "Adjustments",
    agi: "Adjusted Gross Income",
    deductions: "Deductions",
    taxableIncome: "Taxable Income",
    taxBeforeCredits: "Tax Before Credits",
    credits: "Tax Credits",
    ctc: "Child Tax Credit",
    eitc: "Earned Income Credit",
    taxAfterCredits: "Tax After Credits",
    withheld: "Tax Withheld",
    refund: "Refund",
    owed: "Amount Owed",
    totalRefund: "Total Refund",
    totalOwed: "Total Owed",
    download1040: "Download Form 1040",
    downloadCA540: "Download CA 540",
    editReturn: "Edit Return",
    submitReturn: "Submit Return",
    backToChat: "Back to Chat",
    securityNote: "🔒 Your data is encrypted and secure",
    filingStatuses: {
      single: "Single",
      married_filing_jointly: "Married Filing Jointly",
      married_filing_separately: "Married Filing Separately",
      head_of_household: "Head of Household",
      qualifying_widow: "Qualifying Widow(er)"
    }
  },
  vi: {
    title: "Tóm Tắt Thuế",
    subtitle: "Tờ Khai Thuế 2025",
    loading: "Đang tính thuế...",
    personalInfo: "Thông Tin Cá Nhân",
    name: "Họ Tên",
    ssn: "Số An Sinh",
    address: "Địa Chỉ",
    filingStatus: "Tình Trạng",
    spouseInfo: "Thông Tin Vợ/Chồng",
    dependents: "Người Phụ Thuộc",
    noDependents: "Không có người phụ thuộc",
    federalTax: "Thuế Liên Bang",
    stateTax: "Thuế California",
    totalIncome: "Tổng Thu Nhập",
    adjustments: "Điều Chỉnh",
    agi: "AGI",
    deductions: "Khấu Trừ",
    taxableIncome: "Thu Nhập Chịu Thuế",
    taxBeforeCredits: "Thuế Trước Tín Dụng",
    credits: "Tín Dụng Thuế",
    ctc: "Tín Dụng Trẻ Em",
    eitc: "Tín Dụng EITC",
    taxAfterCredits: "Thuế Sau Tín Dụng",
    withheld: "Đã Khấu Trừ",
    refund: "Hoàn Thuế",
    owed: "Nợ Thuế",
    totalRefund: "Tổng Hoàn Thuế",
    totalOwed: "Tổng Nợ Thuế",
    download1040: "Tải Form 1040",
    downloadCA540: "Tải CA 540",
    editReturn: "Chỉnh Sửa",
    submitReturn: "Nộp Tờ Khai",
    backToChat: "Quay Lại Chat",
    securityNote: "🔒 Dữ liệu được mã hóa và bảo mật",
    filingStatuses: {
      single: "Độc Thân",
      married_filing_jointly: "Kết Hôn Khai Chung",
      married_filing_separately: "Kết Hôn Khai Riêng",
      head_of_household: "Chủ Hộ",
      qualifying_widow: "Góa Phụ"
    }
  },
  es: {
    title: "Resumen Fiscal",
    subtitle: "Declaración 2025",
    loading: "Calculando tus impuestos...",
    personalInfo: "Información Personal",
    name: "Nombre",
    ssn: "SSN",
    address: "Dirección",
    filingStatus: "Estado Civil",
    spouseInfo: "Información del Cónyuge",
    dependents: "Dependientes",
    noDependents: "Sin dependientes",
    federalTax: "Impuesto Federal",
    stateTax: "Impuesto California",
    totalIncome: "Ingreso Total",
    adjustments: "Ajustes",
    agi: "AGI",
    deductions: "Deducciones",
    taxableIncome: "Ingreso Gravable",
    taxBeforeCredits: "Impuesto Antes de Créditos",
    credits: "Créditos Fiscales",
    ctc: "Crédito por Hijos",
    eitc: "Crédito EITC",
    taxAfterCredits: "Impuesto Después de Créditos",
    withheld: "Retenido",
    refund: "Reembolso",
    owed: "Adeudado",
    totalRefund: "Reembolso Total",
    totalOwed: "Total Adeudado",
    download1040: "Descargar Form 1040",
    downloadCA540: "Descargar CA 540",
    editReturn: "Editar",
    submitReturn: "Presentar",
    backToChat: "Volver al Chat",
    securityNote: "🔒 Tus datos están cifrados y seguros",
    filingStatuses: {
      single: "Soltero",
      married_filing_jointly: "Casado Declarando Juntos",
      married_filing_separately: "Casado Declarando Separado",
      head_of_household: "Cabeza de Familia",
      qualifying_widow: "Viudo(a) Calificado"
    }
  }
};

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function Summary() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [language] = useState(getLanguage());
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [taxData, setTaxData] = useState(null);
  const [error, setError] = useState(null);

  const t = TRANSLATIONS[language] || TRANSLATIONS.en;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const userId = user?.id || localStorage.getItem("taxsky_userId");
    if (!userId) {
      navigate("/");
      return;
    }

    try {
      const token = localStorage.getItem("taxsky_token");
      
      // Fetch user data
      const userRes = await fetch(`${API_BASE}/api/ai/data/${userId}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const userResult = await userRes.json();
      
      if (userResult.success) {
        setUserData(userResult.answers || {});
        
        // Calculate taxes
        const calcRes = await fetch(`${PYTHON_API}/calculate/full`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filing_status: userResult.answers?.filing_status || "single",
            state: userResult.answers?.state || "CA",
            taxpayer_wages: userResult.answers?.taxpayer_wages || 0,
            spouse_wages: userResult.answers?.spouse_wages || 0,
            taxpayer_federal_withheld: userResult.answers?.taxpayer_federal_withheld || 0,
            spouse_federal_withheld: userResult.answers?.spouse_federal_withheld || 0,
            taxpayer_state_withheld: userResult.answers?.taxpayer_state_withheld || 0,
            spouse_state_withheld: userResult.answers?.spouse_state_withheld || 0,
            dependents: userResult.answers?.dependents || [],
          })
        });
        
        const calcResult = await calcRes.json();
        if (calcResult.success) {
          setTaxData(calcResult);
        }
      }
    } catch (err) {
      console.error("Error fetching data:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return "$0";
    return "$" + Math.abs(Math.round(amount)).toLocaleString();
  };

  const formatSSN = (ssn) => {
    if (!ssn) return "***-**-****";
    return `***-**-${String(ssn).slice(-4)}`;
  };

  const getFilingStatus = (status) => {
    return t.filingStatuses[status] || status || "Not Selected";
  };

  const federalNet = (taxData?.federal?.refund || 0) - (taxData?.federal?.amount_owed || 0);
  const stateNet = (taxData?.state?.refund || 0) - (taxData?.state?.amount_owed || 0);
  const totalNet = federalNet + stateNet;

  const handleDownload1040 = async () => {
    try {
      const token = localStorage.getItem("taxsky_token");
      const res = await fetch(`${PYTHON_API}/generate/1040`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          personal: userData,
          federal: taxData?.federal,
          dependents: userData?.dependents || []
        })
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "Form_1040_2025.pdf";
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error("Download error:", err);
    }
  };

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.bgGradient} />
        <div style={styles.loadingContainer}>
          <div style={styles.spinner} />
          <p style={styles.loadingText}>{t.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      {/* Background */}
      <div style={styles.bgGradient} />
      
      <div style={styles.container}>
        {/* Header */}
        <header style={styles.header}>
          <div style={styles.headerLeft}>
            <div style={styles.logoWrap} onClick={() => navigate("/")}>
              <div style={styles.logoIcon}>
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <rect width="32" height="32" rx="8" fill="url(#logoGrad)"/>
                  <path d="M8 12h16M8 16h12M8 20h8" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                  <circle cx="24" cy="20" r="4" fill="#10b981"/>
                  <path d="M22 20l1.5 1.5L26 19" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <defs>
                    <linearGradient id="logoGrad" x1="0" y1="0" x2="32" y2="32">
                      <stop stopColor="#3b82f6"/>
                      <stop offset="1" stopColor="#8b5cf6"/>
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <div>
                <span style={styles.logoText}>TaxSky</span>
                <span style={styles.headerSubtitle}>{t.subtitle}</span>
              </div>
            </div>
          </div>

          <div style={styles.headerRight}>
            <button onClick={() => navigate("/chat")} style={styles.headerBtn}>
              💬 {t.backToChat}
            </button>
          </div>
        </header>

        {/* Main Content */}
        <div style={styles.content}>
          {/* Hero - Total Refund/Owed */}
          <div style={styles.heroCard}>
            <div style={styles.heroContent}>
              <h1 style={styles.heroTitle}>{t.title}</h1>
              <div style={styles.heroAmount}>
                <span style={{
                  ...styles.heroNumber,
                  color: totalNet >= 0 ? '#10b981' : '#f87171'
                }}>
                  {totalNet >= 0 ? '+' : '-'}{formatCurrency(totalNet)}
                </span>
                <span style={styles.heroLabel}>
                  {totalNet >= 0 ? t.totalRefund : t.totalOwed}
                </span>
              </div>
              <div style={styles.heroBreakdown}>
                <div style={styles.heroBreakdownItem}>
                  <span>🇺🇸 Federal</span>
                  <span style={{ color: federalNet >= 0 ? '#10b981' : '#f87171' }}>
                    {federalNet >= 0 ? '+' : ''}{formatCurrency(federalNet)}
                  </span>
                </div>
                <div style={styles.heroBreakdownDivider} />
                <div style={styles.heroBreakdownItem}>
                  <span>🌴 California</span>
                  <span style={{ color: stateNet >= 0 ? '#10b981' : '#f87171' }}>
                    {stateNet >= 0 ? '+' : ''}{formatCurrency(stateNet)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Grid */}
          <div style={styles.grid}>
            {/* Personal Info Card */}
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>
                <span style={styles.cardIcon}>👤</span>
                {t.personalInfo}
              </h2>
              <div style={styles.infoGrid}>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>{t.name}</span>
                  <span style={styles.infoValue}>
                    {userData?.first_name} {userData?.last_name}
                  </span>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>{t.ssn}</span>
                  <span style={styles.infoValue}>{formatSSN(userData?.ssn)}</span>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>{t.filingStatus}</span>
                  <span style={styles.infoValue}>{getFilingStatus(userData?.filing_status)}</span>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>{t.address}</span>
                  <span style={styles.infoValue}>
                    {userData?.address}, {userData?.city}, {userData?.state} {userData?.zip}
                  </span>
                </div>
              </div>

              {/* Spouse Info */}
              {userData?.filing_status === 'married_filing_jointly' && userData?.spouse_first_name && (
                <div style={styles.spouseSection}>
                  <h3 style={styles.subTitle}>{t.spouseInfo}</h3>
                  <div style={styles.infoGrid}>
                    <div style={styles.infoItem}>
                      <span style={styles.infoLabel}>{t.name}</span>
                      <span style={styles.infoValue}>
                        {userData?.spouse_first_name} {userData?.spouse_last_name}
                      </span>
                    </div>
                    <div style={styles.infoItem}>
                      <span style={styles.infoLabel}>{t.ssn}</span>
                      <span style={styles.infoValue}>{formatSSN(userData?.spouse_ssn)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Dependents */}
              {userData?.dependents?.length > 0 && (
                <div style={styles.dependentsSection}>
                  <h3 style={styles.subTitle}>{t.dependents}</h3>
                  <div style={styles.dependentsList}>
                    {userData.dependents.map((dep, i) => (
                      <div key={i} style={styles.dependentItem}>
                        <span style={styles.dependentName}>
                          👶 {dep.first_name} {dep.last_name}
                        </span>
                        <span style={styles.dependentAge}>Age {dep.age}</span>
                        <span style={styles.dependentCredit}>
                          {dep.age < 17 ? '💰 $2,200 CTC' : '💵 $500 ODC'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Federal Tax Card */}
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>
                <span style={styles.cardIcon}>🇺🇸</span>
                {t.federalTax}
              </h2>
              <div style={styles.taxBreakdown}>
                <div style={styles.taxRow}>
                  <span>{t.totalIncome}</span>
                  <span style={styles.taxAmount}>{formatCurrency(taxData?.federal?.total_income)}</span>
                </div>
                <div style={styles.taxRow}>
                  <span>{t.adjustments}</span>
                  <span style={styles.taxAmountNeg}>-{formatCurrency(taxData?.federal?.adjustments)}</span>
                </div>
                <div style={{...styles.taxRow, ...styles.taxRowHighlight}}>
                  <span>{t.agi}</span>
                  <span style={styles.taxAmount}>{formatCurrency(taxData?.federal?.agi)}</span>
                </div>
                <div style={styles.taxRow}>
                  <span>{t.deductions}</span>
                  <span style={styles.taxAmountNeg}>-{formatCurrency(taxData?.federal?.standard_deduction)}</span>
                </div>
                <div style={{...styles.taxRow, ...styles.taxRowHighlight}}>
                  <span>{t.taxableIncome}</span>
                  <span style={styles.taxAmount}>{formatCurrency(taxData?.federal?.taxable_income)}</span>
                </div>
                <div style={styles.taxDivider} />
                <div style={styles.taxRow}>
                  <span>{t.taxBeforeCredits}</span>
                  <span style={styles.taxAmount}>{formatCurrency(taxData?.federal?.tax_before_credits)}</span>
                </div>
                {taxData?.federal?.ctc_nonrefundable > 0 && (
                  <div style={styles.taxRow}>
                    <span>{t.ctc}</span>
                    <span style={styles.taxAmountGreen}>-{formatCurrency(taxData?.federal?.ctc_nonrefundable)}</span>
                  </div>
                )}
                <div style={styles.taxRow}>
                  <span>{t.withheld}</span>
                  <span style={styles.taxAmountGreen}>-{formatCurrency(taxData?.federal?.withholding)}</span>
                </div>
                <div style={styles.taxDivider} />
                <div style={{...styles.taxRow, ...styles.taxRowFinal}}>
                  <span>{federalNet >= 0 ? t.refund : t.owed}</span>
                  <span style={{
                    ...styles.taxAmountFinal,
                    color: federalNet >= 0 ? '#10b981' : '#f87171'
                  }}>
                    {formatCurrency(federalNet)}
                  </span>
                </div>
              </div>
            </div>

            {/* State Tax Card */}
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>
                <span style={styles.cardIcon}>🌴</span>
                {t.stateTax}
              </h2>
              <div style={styles.taxBreakdown}>
                <div style={styles.taxRow}>
                  <span>CA AGI</span>
                  <span style={styles.taxAmount}>{formatCurrency(taxData?.state?.ca_agi)}</span>
                </div>
                <div style={styles.taxRow}>
                  <span>{t.deductions}</span>
                  <span style={styles.taxAmountNeg}>-{formatCurrency(taxData?.state?.standard_deduction)}</span>
                </div>
                <div style={{...styles.taxRow, ...styles.taxRowHighlight}}>
                  <span>{t.taxableIncome}</span>
                  <span style={styles.taxAmount}>{formatCurrency(taxData?.state?.taxable_income)}</span>
                </div>
                <div style={styles.taxDivider} />
                <div style={styles.taxRow}>
                  <span>CA Tax</span>
                  <span style={styles.taxAmount}>{formatCurrency(taxData?.state?.total_tax)}</span>
                </div>
                {taxData?.state?.caleitc > 0 && (
                  <div style={styles.taxRow}>
                    <span>CalEITC</span>
                    <span style={styles.taxAmountGreen}>-{formatCurrency(taxData?.state?.caleitc)}</span>
                  </div>
                )}
                {taxData?.state?.yctc > 0 && (
                  <div style={styles.taxRow}>
                    <span>Young Child Credit</span>
                    <span style={styles.taxAmountGreen}>-{formatCurrency(taxData?.state?.yctc)}</span>
                  </div>
                )}
                <div style={styles.taxRow}>
                  <span>{t.withheld}</span>
                  <span style={styles.taxAmountGreen}>-{formatCurrency(taxData?.state?.withholding)}</span>
                </div>
                <div style={styles.taxDivider} />
                <div style={{...styles.taxRow, ...styles.taxRowFinal}}>
                  <span>{stateNet >= 0 ? t.refund : t.owed}</span>
                  <span style={{
                    ...styles.taxAmountFinal,
                    color: stateNet >= 0 ? '#10b981' : '#f87171'
                  }}>
                    {formatCurrency(stateNet)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={styles.actions}>
            <button onClick={handleDownload1040} style={styles.downloadBtn}>
              📄 {t.download1040}
            </button>
            <button onClick={() => {}} style={styles.downloadBtnSecondary}>
              📄 {t.downloadCA540}
            </button>
            <button onClick={() => navigate("/chat")} style={styles.editBtn}>
              ✏️ {t.editReturn}
            </button>
            <button onClick={() => navigate("/submit")} style={styles.submitBtn}>
              🚀 {t.submitReturn}
            </button>
          </div>

          {/* Security Note */}
          <div style={styles.securityNote}>
            {t.securityNote}
          </div>
        </div>
      </div>

      {/* Global Styles */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
          font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
          -webkit-font-smoothing: antialiased;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// ============================================================
// STYLES
// ============================================================
const styles = {
  page: {
    minHeight: '100vh',
    background: '#0f172a',
    position: 'relative',
  },
  
  bgGradient: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'radial-gradient(ellipse at 50% 0%, rgba(59, 130, 246, 0.1) 0%, transparent 50%), radial-gradient(ellipse at 0% 100%, rgba(16, 185, 129, 0.08) 0%, transparent 50%)',
    pointerEvents: 'none',
  },
  
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    gap: 20,
  },
  
  spinner: {
    width: 48,
    height: 48,
    border: '3px solid rgba(59, 130, 246, 0.2)',
    borderTopColor: '#3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  
  loadingText: {
    color: '#94a3b8',
    fontSize: 16,
  },
  
  container: {
    position: 'relative',
    maxWidth: 1200,
    margin: '0 auto',
    padding: '20px',
  },
  
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 16,
    marginBottom: 24,
  },
  
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
  },
  
  logoWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    cursor: 'pointer',
  },
  
  logoIcon: {
    display: 'flex',
  },
  
  logoText: {
    fontSize: 20,
    fontWeight: 800,
    color: '#fff',
    display: 'block',
  },
  
  headerSubtitle: {
    fontSize: 12,
    color: '#64748b',
    display: 'block',
  },
  
  headerRight: {
    display: 'flex',
    gap: 12,
  },
  
  headerBtn: {
    padding: '10px 16px',
    fontSize: 13,
    fontWeight: 600,
    color: '#94a3b8',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 10,
    cursor: 'pointer',
  },
  
  content: {
    display: 'flex',
    flexDirection: 'column',
    gap: 24,
  },
  
  heroCard: {
    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(139, 92, 246, 0.15) 100%)',
    border: '1px solid rgba(59, 130, 246, 0.2)',
    borderRadius: 24,
    padding: 40,
    textAlign: 'center',
  },
  
  heroContent: {
    maxWidth: 500,
    margin: '0 auto',
  },
  
  heroTitle: {
    fontSize: 20,
    fontWeight: 600,
    color: '#94a3b8',
    marginBottom: 16,
  },
  
  heroAmount: {
    marginBottom: 24,
  },
  
  heroNumber: {
    fontSize: 56,
    fontWeight: 800,
    display: 'block',
    marginBottom: 8,
  },
  
  heroLabel: {
    fontSize: 16,
    color: '#94a3b8',
  },
  
  heroBreakdown: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 32,
  },
  
  heroBreakdownItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    color: '#e2e8f0',
    fontSize: 14,
  },
  
  heroBreakdownDivider: {
    width: 1,
    height: 40,
    background: 'rgba(255,255,255,0.1)',
  },
  
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
    gap: 20,
  },
  
  card: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 20,
    padding: 24,
  },
  
  cardTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    fontSize: 18,
    fontWeight: 700,
    color: '#fff',
    marginBottom: 20,
  },
  
  cardIcon: {
    fontSize: 20,
  },
  
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 16,
  },
  
  infoItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  
  infoLabel: {
    fontSize: 12,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  
  infoValue: {
    fontSize: 14,
    color: '#e2e8f0',
    fontWeight: 500,
  },
  
  spouseSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTop: '1px solid rgba(255,255,255,0.06)',
  },
  
  subTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: '#a78bfa',
    marginBottom: 12,
  },
  
  dependentsSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTop: '1px solid rgba(255,255,255,0.06)',
  },
  
  dependentsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  
  dependentItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 14px',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: 10,
  },
  
  dependentName: {
    flex: 1,
    fontSize: 14,
    color: '#e2e8f0',
  },
  
  dependentAge: {
    fontSize: 12,
    color: '#64748b',
  },
  
  dependentCredit: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: 600,
  },
  
  taxBreakdown: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  
  taxRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: 14,
    color: '#94a3b8',
  },
  
  taxRowHighlight: {
    color: '#e2e8f0',
    fontWeight: 600,
  },
  
  taxRowFinal: {
    fontSize: 18,
    fontWeight: 700,
    paddingTop: 8,
  },
  
  taxAmount: {
    color: '#e2e8f0',
    fontWeight: 500,
  },
  
  taxAmountNeg: {
    color: '#f87171',
  },
  
  taxAmountGreen: {
    color: '#10b981',
  },
  
  taxAmountFinal: {
    fontSize: 20,
    fontWeight: 800,
  },
  
  taxDivider: {
    height: 1,
    background: 'rgba(255,255,255,0.06)',
    margin: '8px 0',
  },
  
  actions: {
    display: 'flex',
    gap: 12,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  
  downloadBtn: {
    padding: '14px 24px',
    fontSize: 14,
    fontWeight: 600,
    color: '#fff',
    background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
    border: 'none',
    borderRadius: 12,
    cursor: 'pointer',
  },
  
  downloadBtnSecondary: {
    padding: '14px 24px',
    fontSize: 14,
    fontWeight: 600,
    color: '#f59e0b',
    background: 'rgba(245, 158, 11, 0.15)',
    border: '1px solid rgba(245, 158, 11, 0.3)',
    borderRadius: 12,
    cursor: 'pointer',
  },
  
  editBtn: {
    padding: '14px 24px',
    fontSize: 14,
    fontWeight: 600,
    color: '#94a3b8',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 12,
    cursor: 'pointer',
  },
  
  submitBtn: {
    padding: '14px 32px',
    fontSize: 14,
    fontWeight: 700,
    color: '#fff',
    background: 'linear-gradient(135deg, #10b981, #059669)',
    border: 'none',
    borderRadius: 12,
    cursor: 'pointer',
    boxShadow: '0 8px 24px rgba(16, 185, 129, 0.3)',
  },
  
  securityNote: {
    textAlign: 'center',
    fontSize: 13,
    color: '#475569',
    marginTop: 16,
  },
};