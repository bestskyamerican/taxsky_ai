// ============================================================
// TAX FLOW SHARED - Utilities & CPA Bid Board API
// ============================================================
// Location: src/components/cpa/taxFlowShared.js
//
// Shared by: CPAReviewTax.jsx, CPABidBoard.jsx, FilingChoice.jsx
// NOT used by SubmitFlow.jsx (it stays self-contained)
// ============================================================

// ─── API CONFIG ────────────────────────────────────────────
export const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5001";
export const PYTHON_API = import.meta.env.VITE_PYTHON_API || "http://localhost:5002";

// ─── STATE FORM CONFIG ────────────────────────────────────
export const STATE_FORM_CONFIG = {
  "AL": { endpoint: "al-40", form: "40", name: "Alabama" },
  "AR": { endpoint: "ar-ar1000f", form: "AR1000F", name: "Arkansas" },
  "AZ": { endpoint: "az-140", form: "140", name: "Arizona" },
  "CA": { endpoint: "ca540", form: "540", name: "California" },
  "CO": { endpoint: "co-104", form: "104", name: "Colorado" },
  "CT": { endpoint: "ct-1040", form: "CT-1040", name: "Connecticut" },
  "DC": { endpoint: "dc-d40", form: "D-40", name: "Washington DC" },
  "DE": { endpoint: "de-200", form: "200-01", name: "Delaware" },
  "GA": { endpoint: "ga-500", form: "500", name: "Georgia" },
  "HI": { endpoint: "hi-n11", form: "N-11", name: "Hawaii" },
  "IA": { endpoint: "ia-1040", form: "IA 1040", name: "Iowa" },
  "ID": { endpoint: "id-40", form: "40", name: "Idaho" },
  "IL": { endpoint: "il-1040", form: "IL-1040", name: "Illinois" },
  "IN": { endpoint: "in-it40", form: "IT-40", name: "Indiana" },
  "KS": { endpoint: "ks-k40", form: "K-40", name: "Kansas" },
  "KY": { endpoint: "ky-740", form: "740", name: "Kentucky" },
  "LA": { endpoint: "la-it540", form: "IT-540", name: "Louisiana" },
  "MA": { endpoint: "ma-1", form: "1", name: "Massachusetts" },
  "MD": { endpoint: "md-502", form: "502", name: "Maryland" },
  "ME": { endpoint: "me-1040", form: "1040ME", name: "Maine" },
  "MI": { endpoint: "mi-1040", form: "MI-1040", name: "Michigan" },
  "MN": { endpoint: "mn-m1", form: "M1", name: "Minnesota" },
  "MO": { endpoint: "mo-1040", form: "MO-1040", name: "Missouri" },
  "MS": { endpoint: "ms-80105", form: "80-105", name: "Mississippi" },
  "MT": { endpoint: "mt-2", form: "2", name: "Montana" },
  "NC": { endpoint: "nc-d400", form: "D-400", name: "North Carolina" },
  "ND": { endpoint: "nd-1", form: "ND-1", name: "North Dakota" },
  "NE": { endpoint: "ne-1040n", form: "1040N", name: "Nebraska" },
  "NJ": { endpoint: "nj-1040", form: "NJ-1040", name: "New Jersey" },
  "NM": { endpoint: "nm-pit1", form: "PIT-1", name: "New Mexico" },
  "NY": { endpoint: "ny-it201", form: "IT-201", name: "New York" },
  "OH": { endpoint: "oh-it1040", form: "IT 1040", name: "Ohio" },
  "OK": { endpoint: "ok-511", form: "511", name: "Oklahoma" },
  "OR": { endpoint: "or-40", form: "40", name: "Oregon" },
  "PA": { endpoint: "pa-40", form: "PA-40", name: "Pennsylvania" },
  "RI": { endpoint: "ri-1040", form: "RI-1040", name: "Rhode Island" },
  "SC": { endpoint: "sc-1040", form: "SC1040", name: "South Carolina" },
  "UT": { endpoint: "ut-tc40", form: "TC-40", name: "Utah" },
  "VA": { endpoint: "va-760", form: "760", name: "Virginia" },
  "VT": { endpoint: "vt-in111", form: "IN-111", name: "Vermont" },
  "WI": { endpoint: "wi-1", form: "1", name: "Wisconsin" },
  "WV": { endpoint: "wv-it140", form: "IT-140", name: "West Virginia" },
};

export const NO_TAX_STATES = ["AK", "FL", "NV", "NH", "SD", "TN", "TX", "WA", "WY"];

export const FILING_STATUS_OPTIONS = [
  { value: 'single', label: 'Single' },
  { value: 'married_filing_jointly', label: 'Married Filing Jointly' },
  { value: 'married_filing_separately', label: 'Married Filing Separately' },
  { value: 'head_of_household', label: 'Head of Household' },
  { value: 'qualifying_surviving_spouse', label: 'Qualifying Surviving Spouse' },
];

export const getStateConfig = (code) => STATE_FORM_CONFIG[code] || null;
export const isNoTaxState = (code) => NO_TAX_STATES.includes(code);
export const getStateName = (code) => STATE_FORM_CONFIG[code]?.name || code;

// ─── HELPERS ───────────────────────────────────────────────
export function getIncomeRange(income) {
  const n = Number(income) || 0;
  if (n < 25000) return 'Under $25K';
  if (n < 50000) return '$25K – $50K';
  if (n < 75000) return '$50K – $75K';
  if (n < 100000) return '$75K – $100K';
  if (n < 150000) return '$100K – $150K';
  if (n < 250000) return '$150K – $250K';
  return '$250K+';
}

export function maskSSN(ssn) {
  if (!ssn) return '___-__-____';
  const clean = String(ssn).replace(/\D/g, '');
  return clean.length >= 4 ? `•••-••-${clean.slice(-4)}` : '___-__-____';
}

export function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// ═══════════════════════════════════════════════════════════
// CPA BID BOARD API HELPERS
// ═══════════════════════════════════════════════════════════

// ─── POST ANONYMIZED JOB (User side) ──────────────────────
// Only sends anonymized data — NO name, NO SSN, NO address
export async function postAnonymizedJob({
  userId, token, state, filingStatus, incomeRange,
  dependentsCount, formsNeeded, includeState, hasStateTax,
}) {
  try {
    const res = await fetch(`${API_BASE}/api/cpa/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        user_id: userId,
        status: 'open',
        tax_year: 2025,
        // ANONYMIZED — CPAs see only this:
        state,
        filing_status: filingStatus,
        income_range: incomeRange,
        dependents_count: dependentsCount,
        forms_needed: formsNeeded,
        include_state: includeState,
        has_state_tax: hasStateTax,
        created_at: new Date().toISOString(),
      }),
    });
    return await res.json();
  } catch (e) {
    console.error('[CPA_API] postAnonymizedJob error:', e);
    return { success: false, message: 'Network error' };
  }
}

// ─── FETCH CPA JOBS (CPA side) ───────────────────────────
// Returns anonymized job listings for CPAs to browse
export async function fetchCPAJobs(token, filters = {}) {
  try {
    const params = new URLSearchParams();
    if (filters.status) params.set('status', filters.status);
    if (filters.state) params.set('state', filters.state);
    if (filters.filing_status) params.set('filing_status', filters.filing_status);
    const url = `${API_BASE}/api/cpa/jobs?${params.toString()}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    return await res.json();
  } catch (e) {
    console.error('[CPA_API] fetchCPAJobs error:', e);
    return { success: false, jobs: [] };
  }
}

// ─── PLACE CPA BID (CPA side) ────────────────────────────
// CPA sets their OWN price + message + turnaround
export async function placeCPABid({
  jobId, token, cpaId, cpaName, cpaCredentials,
  bidPrice, message, estimatedHours,
}) {
  try {
    const res = await fetch(`${API_BASE}/api/cpa/jobs/${jobId}/bid`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        cpa_id: cpaId,
        cpa_name: cpaName,
        cpa_credentials: cpaCredentials,
        bid_price: Number(bidPrice),
        message,
        estimated_hours: Number(estimatedHours),
        created_at: new Date().toISOString(),
      }),
    });
    return await res.json();
  } catch (e) {
    console.error('[CPA_API] placeCPABid error:', e);
    return { success: false, message: 'Network error' };
  }
}

// ─── FETCH BIDS ON MY JOB (User side) ────────────────────
// User sees all CPA bids with their prices
export async function fetchJobBids(jobId, token) {
  try {
    const res = await fetch(`${API_BASE}/api/cpa/jobs/${jobId}/bids`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return await res.json();
  } catch (e) {
    console.error('[CPA_API] fetchJobBids error:', e);
    return { success: false, bids: [] };
  }
}

// ─── ACCEPT CPA BID (User side) ─────────────────────────
// User picks a CPA → unlocks personal data for that CPA
// Payment happens here (bid_price is what user pays)
export async function acceptCPABid({ jobId, bidId, token }) {
  try {
    const res = await fetch(`${API_BASE}/api/cpa/jobs/${jobId}/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ bid_id: bidId }),
    });
    return await res.json();
  } catch (e) {
    console.error('[CPA_API] acceptCPABid error:', e);
    return { success: false, message: 'Network error' };
  }
}

// ─── FETCH ASSIGNED JOB DETAILS (CPA side) ───────────────
// After CPA is assigned, they see full client info (NO raw SSN)
export async function fetchAssignedJobDetails(jobId, token) {
  try {
    const res = await fetch(`${API_BASE}/api/cpa/jobs/${jobId}/details`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return await res.json();
  } catch (e) {
    console.error('[CPA_API] fetchAssignedJobDetails error:', e);
    return { success: false };
  }
}

// ─── GENERATE PDF (CPA side) ─────────────────────────────
// Server injects SSN into PDF — CPA never sees raw SSN
export async function generateCPAPdf(jobId, token, formType = 'federal') {
  try {
    const res = await fetch(`${API_BASE}/api/cpa/jobs/${jobId}/generate-pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ form_type: formType }),
    });
    if (!res.ok) throw new Error('PDF generation failed');
    return await res.blob();
  } catch (e) {
    console.error('[CPA_API] generateCPAPdf error:', e);
    return null;
  }
}

// ─── JOB STATUS CONFIG ───────────────────────────────────
export const JOB_STATUS = {
  open:       { label: 'Open',       color: '#10b981', icon: '🟢' },
  bidding:    { label: 'Bidding',    color: '#f59e0b', icon: '🟡' },
  assigned:   { label: 'Assigned',   color: '#3b82f6', icon: '🔵' },
  in_review:  { label: 'In Review',  color: '#a78bfa', icon: '🟣' },
  completed:  { label: 'Completed',  color: '#64748b', icon: '⚪' },
};
