// ============================================================
// StateSelector.jsx - TaxSky State Tax Selection Component
// ============================================================
// Shows all 50 states + DC with tax info
// Highlights 7 supported states (CA, NY, IL, PA, NJ, GA, NC)
// Shows no-tax states (AK, FL, NV, SD, TN, TX, WA, WY)
// ============================================================

import React, { useState, useMemo } from 'react';

// ============================================================
// STATE DATA - All 50 States + DC
// ============================================================
const STATE_DATA = {
  // ✅ SUPPORTED STATES (PDF Generation Available)
  CA: { name: "California", supported: true, hasTax: true, form: "540", taxType: "progressive", topRate: "13.3%", note: "Highest state tax rate" },
  NY: { name: "New York", supported: true, hasTax: true, form: "IT-201", taxType: "progressive", topRate: "10.9%", note: "+NYC tax up to 3.88%" },
  IL: { name: "Illinois", supported: true, hasTax: true, form: "IL-1040", taxType: "flat", topRate: "4.95%", note: "Flat tax state" },
  PA: { name: "Pennsylvania", supported: true, hasTax: true, form: "PA-40", taxType: "flat", topRate: "3.07%", note: "Lowest flat tax" },
  NJ: { name: "New Jersey", supported: true, hasTax: true, form: "NJ-1040", taxType: "progressive", topRate: "10.75%", note: "High tax state" },
  GA: { name: "Georgia", supported: true, hasTax: true, form: "500", taxType: "flat", topRate: "5.49%", note: "Switched to flat tax 2024" },
  NC: { name: "North Carolina", supported: true, hasTax: true, form: "D-400", taxType: "flat", topRate: "4.5%", note: "Rate dropping yearly" },
  
  // 🎉 NO TAX STATES
  AK: { name: "Alaska", supported: true, hasTax: false, form: null, taxType: "none", topRate: "0%", note: "No state income tax!" },
  FL: { name: "Florida", supported: true, hasTax: false, form: null, taxType: "none", topRate: "0%", note: "No state income tax!" },
  NV: { name: "Nevada", supported: true, hasTax: false, form: null, taxType: "none", topRate: "0%", note: "No state income tax!" },
  SD: { name: "South Dakota", supported: true, hasTax: false, form: null, taxType: "none", topRate: "0%", note: "No state income tax!" },
  TN: { name: "Tennessee", supported: true, hasTax: false, form: null, taxType: "none", topRate: "0%", note: "No state income tax!" },
  TX: { name: "Texas", supported: true, hasTax: false, form: null, taxType: "none", topRate: "0%", note: "No state income tax!" },
  WA: { name: "Washington", supported: true, hasTax: false, form: null, taxType: "none", topRate: "0%", note: "Capital gains tax only" },
  WY: { name: "Wyoming", supported: true, hasTax: false, form: null, taxType: "none", topRate: "0%", note: "No state income tax!" },
  
  // 🔶 OTHER STATES (Calculation only, no PDF yet)
  AL: { name: "Alabama", supported: false, hasTax: true, form: "40", taxType: "progressive", topRate: "5%", note: "Coming soon" },
  AZ: { name: "Arizona", supported: false, hasTax: true, form: "140", taxType: "flat", topRate: "2.5%", note: "Coming soon" },
  AR: { name: "Arkansas", supported: false, hasTax: true, form: "AR1000F", taxType: "progressive", topRate: "4.4%", note: "Coming soon" },
  CO: { name: "Colorado", supported: false, hasTax: true, form: "104", taxType: "flat", topRate: "4.4%", note: "Coming soon" },
  CT: { name: "Connecticut", supported: false, hasTax: true, form: "CT-1040", taxType: "progressive", topRate: "6.99%", note: "Coming soon" },
  DE: { name: "Delaware", supported: false, hasTax: true, form: "200-01", taxType: "progressive", topRate: "6.6%", note: "Coming soon" },
  DC: { name: "Washington DC", supported: false, hasTax: true, form: "D-40", taxType: "progressive", topRate: "10.75%", note: "Coming soon" },
  HI: { name: "Hawaii", supported: false, hasTax: true, form: "N-11", taxType: "progressive", topRate: "11%", note: "Coming soon" },
  ID: { name: "Idaho", supported: false, hasTax: true, form: "40", taxType: "flat", topRate: "5.8%", note: "Coming soon" },
  IN: { name: "Indiana", supported: false, hasTax: true, form: "IT-40", taxType: "flat", topRate: "3.05%", note: "Coming soon" },
  IA: { name: "Iowa", supported: false, hasTax: true, form: "IA-1040", taxType: "flat", topRate: "3.8%", note: "Coming soon" },
  KS: { name: "Kansas", supported: false, hasTax: true, form: "K-40", taxType: "progressive", topRate: "5.7%", note: "Coming soon" },
  KY: { name: "Kentucky", supported: false, hasTax: true, form: "740", taxType: "flat", topRate: "4%", note: "Coming soon" },
  LA: { name: "Louisiana", supported: false, hasTax: true, form: "IT-540", taxType: "progressive", topRate: "4.25%", note: "Coming soon" },
  ME: { name: "Maine", supported: false, hasTax: true, form: "1040ME", taxType: "progressive", topRate: "7.15%", note: "Coming soon" },
  MD: { name: "Maryland", supported: false, hasTax: true, form: "502", taxType: "progressive", topRate: "5.75%", note: "Coming soon" },
  MA: { name: "Massachusetts", supported: false, hasTax: true, form: "1", taxType: "flat", topRate: "5%", note: "9% over $1M" },
  MI: { name: "Michigan", supported: false, hasTax: true, form: "MI-1040", taxType: "flat", topRate: "4.05%", note: "Coming soon" },
  MN: { name: "Minnesota", supported: false, hasTax: true, form: "M1", taxType: "progressive", topRate: "9.85%", note: "Coming soon" },
  MS: { name: "Mississippi", supported: false, hasTax: true, form: "80-105", taxType: "flat", topRate: "4.7%", note: "Coming soon" },
  MO: { name: "Missouri", supported: false, hasTax: true, form: "MO-1040", taxType: "progressive", topRate: "4.8%", note: "Coming soon" },
  MT: { name: "Montana", supported: false, hasTax: true, form: "2", taxType: "progressive", topRate: "5.9%", note: "Coming soon" },
  NE: { name: "Nebraska", supported: false, hasTax: true, form: "1040N", taxType: "progressive", topRate: "5.84%", note: "Coming soon" },
  NH: { name: "New Hampshire", supported: true, hasTax: false, form: null, taxType: "none", topRate: "0%", note: "Interest/dividends tax ended" },
  NM: { name: "New Mexico", supported: false, hasTax: true, form: "PIT-1", taxType: "progressive", topRate: "5.9%", note: "Coming soon" },
  ND: { name: "North Dakota", supported: false, hasTax: true, form: "ND-1", taxType: "progressive", topRate: "2.5%", note: "Coming soon" },
  OH: { name: "Ohio", supported: false, hasTax: true, form: "IT-1040", taxType: "progressive", topRate: "3.5%", note: "Coming soon" },
  OK: { name: "Oklahoma", supported: false, hasTax: true, form: "511", taxType: "progressive", topRate: "4.75%", note: "Coming soon" },
  OR: { name: "Oregon", supported: false, hasTax: true, form: "40", taxType: "progressive", topRate: "9.9%", note: "Coming soon" },
  RI: { name: "Rhode Island", supported: false, hasTax: true, form: "RI-1040", taxType: "progressive", topRate: "5.99%", note: "Coming soon" },
  SC: { name: "South Carolina", supported: false, hasTax: true, form: "SC1040", taxType: "progressive", topRate: "6.4%", note: "Coming soon" },
  UT: { name: "Utah", supported: false, hasTax: true, form: "TC-40", taxType: "flat", topRate: "4.65%", note: "Coming soon" },
  VT: { name: "Vermont", supported: false, hasTax: true, form: "IN-111", taxType: "progressive", topRate: "8.75%", note: "Coming soon" },
  VA: { name: "Virginia", supported: false, hasTax: true, form: "760", taxType: "progressive", topRate: "5.75%", note: "Coming soon" },
  WV: { name: "West Virginia", supported: false, hasTax: true, form: "IT-140", taxType: "progressive", topRate: "5.12%", note: "Coming soon" },
  WI: { name: "Wisconsin", supported: false, hasTax: true, form: "1", taxType: "progressive", topRate: "7.65%", note: "Coming soon" },
};

// Sort states alphabetically
const SORTED_STATES = Object.entries(STATE_DATA)
  .sort((a, b) => a[1].name.localeCompare(b[1].name));

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function StateSelector({ 
  value, 
  onChange, 
  showDetails = true,
  compact = false,
  className = ""
}) {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  
  // Filter states by search
  const filteredStates = useMemo(() => {
    if (!search) return SORTED_STATES;
    const term = search.toLowerCase();
    return SORTED_STATES.filter(([code, state]) => 
      code.toLowerCase().includes(term) || 
      state.name.toLowerCase().includes(term)
    );
  }, [search]);
  
  // Get selected state info
  const selectedState = value ? STATE_DATA[value.toUpperCase()] : null;
  
  // Handle selection
  const handleSelect = (code) => {
    onChange?.(code);
    setIsOpen(false);
    setSearch('');
  };
  
  // Compact dropdown version
  if (compact) {
    return (
      <div className={`state-selector-compact ${className}`}>
        <select 
          value={value || ''} 
          onChange={(e) => onChange?.(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Select your state...</option>
          
          <optgroup label="✅ Fully Supported (PDF Ready)">
            {SORTED_STATES.filter(([_, s]) => s.supported && s.hasTax).map(([code, state]) => (
              <option key={code} value={code}>
                {state.name} ({code}) - {state.topRate} {state.taxType}
              </option>
            ))}
          </optgroup>
          
          <optgroup label="🎉 No State Income Tax">
            {SORTED_STATES.filter(([_, s]) => !s.hasTax).map(([code, state]) => (
              <option key={code} value={code}>
                {state.name} ({code}) - No tax!
              </option>
            ))}
          </optgroup>
          
          <optgroup label="🔶 Other States (Coming Soon)">
            {SORTED_STATES.filter(([_, s]) => !s.supported && s.hasTax).map(([code, state]) => (
              <option key={code} value={code}>
                {state.name} ({code}) - {state.topRate}
              </option>
            ))}
          </optgroup>
        </select>
        
        {/* Selected State Info */}
        {showDetails && selectedState && (
          <div className={`mt-3 p-3 rounded-lg ${
            !selectedState.hasTax 
              ? 'bg-green-50 border border-green-200' 
              : selectedState.supported 
                ? 'bg-blue-50 border border-blue-200'
                : 'bg-yellow-50 border border-yellow-200'
          }`}>
            <div className="flex items-center justify-between">
              <span className="font-medium">{selectedState.name}</span>
              <span className={`px-2 py-1 rounded text-sm font-medium ${
                !selectedState.hasTax 
                  ? 'bg-green-100 text-green-800' 
                  : selectedState.supported 
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-yellow-100 text-yellow-800'
              }`}>
                {!selectedState.hasTax ? '🎉 No Tax' : selectedState.topRate}
              </span>
            </div>
            <p className="text-sm text-gray-600 mt-1">{selectedState.note}</p>
            {selectedState.hasTax && selectedState.form && (
              <p className="text-xs text-gray-500 mt-1">
                Form: {selectedState.form} • {selectedState.taxType === 'flat' ? 'Flat Tax' : 'Progressive'}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }
  
  // Full card-based selector
  return (
    <div className={`state-selector ${className}`}>
      {/* Search Input */}
      <div className="mb-4">
        <div className="relative">
          <input
            type="text"
            placeholder="🔍 Search states..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full p-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            🔍
          </span>
        </div>
      </div>
      
      {/* Stats */}
      <div className="flex gap-4 mb-4 text-sm">
        <span className="text-blue-600">✅ 7 supported</span>
        <span className="text-green-600">🎉 9 no-tax</span>
        <span className="text-gray-500">🔶 35 coming soon</span>
      </div>
      
      {/* State Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 max-h-96 overflow-y-auto p-1">
        {filteredStates.map(([code, state]) => (
          <button
            key={code}
            onClick={() => handleSelect(code)}
            className={`p-3 rounded-lg border-2 text-left transition-all hover:shadow-md ${
              value?.toUpperCase() === code 
                ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' 
                : !state.hasTax
                  ? 'border-green-200 bg-green-50 hover:border-green-400'
                  : state.supported
                    ? 'border-blue-200 bg-white hover:border-blue-400'
                    : 'border-gray-200 bg-gray-50 hover:border-gray-400'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-lg">{code}</span>
              {!state.hasTax && <span className="text-green-600">🎉</span>}
              {state.hasTax && state.supported && <span className="text-blue-600">✅</span>}
              {state.hasTax && !state.supported && <span className="text-gray-400">🔶</span>}
            </div>
            <div className="text-xs text-gray-600 truncate">{state.name}</div>
            <div className={`text-xs font-medium mt-1 ${
              !state.hasTax ? 'text-green-600' : 'text-gray-700'
            }`}>
              {!state.hasTax ? 'No Tax' : state.topRate}
            </div>
          </button>
        ))}
      </div>
      
      {/* Selected State Details */}
      {showDetails && selectedState && (
        <div className={`mt-4 p-4 rounded-lg ${
          !selectedState.hasTax 
            ? 'bg-green-50 border border-green-300' 
            : selectedState.supported 
              ? 'bg-blue-50 border border-blue-300'
              : 'bg-yellow-50 border border-yellow-300'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-bold">{selectedState.name} ({value?.toUpperCase()})</h3>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              !selectedState.hasTax 
                ? 'bg-green-200 text-green-800' 
                : selectedState.supported 
                  ? 'bg-blue-200 text-blue-800'
                  : 'bg-yellow-200 text-yellow-800'
            }`}>
              {!selectedState.hasTax 
                ? '🎉 No State Income Tax!' 
                : selectedState.supported 
                  ? '✅ PDF Ready'
                  : '🔶 Coming Soon'}
            </span>
          </div>
          
          {selectedState.hasTax ? (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Tax Type:</span>
                <span className="ml-2 font-medium capitalize">{selectedState.taxType}</span>
              </div>
              <div>
                <span className="text-gray-500">Top Rate:</span>
                <span className="ml-2 font-medium">{selectedState.topRate}</span>
              </div>
              {selectedState.form && (
                <div>
                  <span className="text-gray-500">Form:</span>
                  <span className="ml-2 font-medium">{selectedState.form}</span>
                </div>
              )}
              <div className="col-span-2">
                <span className="text-gray-500">Note:</span>
                <span className="ml-2">{selectedState.note}</span>
              </div>
            </div>
          ) : (
            <p className="text-green-700">
              Great news! {selectedState.name} has no state income tax. 
              You only need to file your federal return.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// HELPER COMPONENTS
// ============================================================

// Small badge showing selected state
export function StateBadge({ stateCode, onClick }) {
  const state = STATE_DATA[stateCode?.toUpperCase()];
  if (!state) return null;
  
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium transition-colors ${
        !state.hasTax 
          ? 'bg-green-100 text-green-800 hover:bg-green-200' 
          : state.supported 
            ? 'bg-blue-100 text-blue-800 hover:bg-blue-200'
            : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
      }`}
    >
      <span className="font-bold">{stateCode?.toUpperCase()}</span>
      <span>{state.name}</span>
      {!state.hasTax && <span>🎉</span>}
    </button>
  );
}

// Quick tax estimate display
export function StateTaxEstimate({ stateCode, income, filingStatus = 'single' }) {
  const state = STATE_DATA[stateCode?.toUpperCase()];
  if (!state || !state.hasTax) {
    return (
      <div className="text-green-600 font-medium">
        $0 state tax {state ? `(${state.name} has no income tax)` : ''}
      </div>
    );
  }
  
  // Simple estimate (actual calculation done by backend)
  const rate = parseFloat(state.topRate) / 100;
  const estimate = Math.round(income * rate * 0.7); // Rough estimate
  
  return (
    <div className="text-sm">
      <span className="text-gray-600">Estimated {state.name} tax: </span>
      <span className="font-medium">${estimate.toLocaleString()}</span>
      <span className="text-gray-400 text-xs ml-1">({state.topRate} {state.taxType})</span>
    </div>
  );
}

// Get state info programmatically
export function getStateInfo(stateCode) {
  return STATE_DATA[stateCode?.toUpperCase()] || null;
}

// Check if state is supported
export function isStateSupported(stateCode) {
  const state = STATE_DATA[stateCode?.toUpperCase()];
  return state?.supported || false;
}

// Check if state has income tax
export function stateHasIncomeTax(stateCode) {
  const state = STATE_DATA[stateCode?.toUpperCase()];
  return state?.hasTax || false;
}

// Get all supported states
export function getSupportedStates() {
  return Object.entries(STATE_DATA)
    .filter(([_, state]) => state.supported && state.hasTax)
    .map(([code, state]) => ({ code, ...state }));
}

// Get no-tax states
export function getNoTaxStates() {
  return Object.entries(STATE_DATA)
    .filter(([_, state]) => !state.hasTax)
    .map(([code, state]) => ({ code, ...state }));
}