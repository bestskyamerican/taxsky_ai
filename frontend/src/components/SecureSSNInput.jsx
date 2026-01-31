// ============================================================
// SECURE SSN INPUT COMPONENT - TaxSky AI
// ============================================================
// Features:
// ✅ Password-style input (hidden by default)
// ✅ Show/hide toggle
// ✅ Visual masking (***-**-1234)
// ✅ Security badge indicator
// ✅ Validation
// ============================================================

import React, { useState, useCallback } from 'react';

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Format SSN for display: XXX-XX-1234 (shows only last 4)
 */
export const maskSSN = (ssn) => {
  if (!ssn) return '';
  const cleaned = ssn.replace(/\D/g, '');
  if (cleaned.length < 4) return '•••-••-••••';
  return `•••-••-${cleaned.slice(-4)}`;
};

/**
 * Format SSN for input field: 123-45-6789
 */
export const formatSSN = (ssn) => {
  if (!ssn) return '';
  const cleaned = ssn.replace(/\D/g, '').slice(0, 9);
  if (cleaned.length <= 3) return cleaned;
  if (cleaned.length <= 5) return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
  return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 5)}-${cleaned.slice(5)}`;
};

/**
 * Validate SSN format (9 digits)
 */
export const validateSSN = (ssn) => {
  if (!ssn) return { valid: false, error: 'SSN is required' };
  const cleaned = ssn.replace(/\D/g, '');
  if (cleaned.length !== 9) {
    return { valid: false, error: 'SSN must be 9 digits' };
  }
  // Basic IRS validation rules
  if (cleaned.startsWith('000') || cleaned.startsWith('666') || cleaned.startsWith('9')) {
    return { valid: false, error: 'Invalid SSN format' };
  }
  if (cleaned.substring(3, 5) === '00') {
    return { valid: false, error: 'Invalid SSN format' };
  }
  if (cleaned.substring(5) === '0000') {
    return { valid: false, error: 'Invalid SSN format' };
  }
  return { valid: true, error: null };
};

// ============================================================
// SECURE SSN INPUT COMPONENT
// ============================================================

export const SecureSSNInput = ({ 
  value = '', 
  onChange, 
  onBlur,
  placeholder = "•••-••-••••",
  disabled = false,
  error = null,
  label = "Social Security Number",
  required = true,
  showSecurityBadge = true,
  style = {},
  inputStyle = {},
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showFull, setShowFull] = useState(false);
  
  const handleChange = useCallback((e) => {
    const input = e.target.value;
    // Only allow digits
    const cleaned = input.replace(/\D/g, '').slice(0, 9);
    onChange(cleaned);
  }, [onChange]);
  
  const handleFocus = () => {
    setIsFocused(true);
  };
  
  const handleBlur = (e) => {
    setIsFocused(false);
    setShowFull(false);
    onBlur?.(e);
  };
  
  const toggleVisibility = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setShowFull(!showFull);
  };
  
  // Display value based on state
  const getDisplayValue = () => {
    if (!value) return '';
    if (showFull || isFocused) {
      return formatSSN(value);
    }
    return maskSSN(value);
  };
  
  const validation = validateSSN(value);
  const hasError = error || (value && value.length === 9 && !validation.valid);
  const isComplete = value && value.replace(/\D/g, '').length === 9;
  
  return (
    <div style={{ ...styles.container, ...style }}>
      {label && (
        <label style={styles.label}>
          <span>
            {label} {required && <span style={styles.required}>*</span>}
          </span>
          {showSecurityBadge && (
            <span style={styles.securityBadge}>
              🔒 Secure
            </span>
          )}
        </label>
      )}
      
      <div style={styles.inputWrapper}>
        <input
          type={showFull ? "text" : "password"}
          inputMode="numeric"
          value={getDisplayValue()}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          data-lpignore="true"
          data-form-type="other"
          style={{
            ...styles.input,
            ...inputStyle,
            borderColor: hasError 
              ? '#ef4444' 
              : isComplete && validation.valid 
                ? '#10b981' 
                : isFocused 
                  ? '#6366f1' 
                  : 'rgba(255,255,255,0.1)',
          }}
        />
        
        {/* Show/Hide Toggle */}
        <button
          type="button"
          onClick={toggleVisibility}
          style={styles.toggleBtn}
          tabIndex={-1}
          aria-label={showFull ? "Hide SSN" : "Show SSN"}
        >
          {showFull ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
              <line x1="1" y1="1" x2="23" y2="23"/>
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          )}
        </button>
        
        {/* Validation Checkmark */}
        {isComplete && validation.valid && (
          <span style={styles.validIcon}>✓</span>
        )}
      </div>
      
      {/* Error Message */}
      {hasError && (
        <p style={styles.errorText}>
          ⚠️ {error || validation.error}
        </p>
      )}
      
      {/* Security Note */}
      <p style={styles.helpText}>
        🔐 Your SSN is encrypted and protected
      </p>
    </div>
  );
};

// ============================================================
// STYLES
// ============================================================

const styles = {
  container: {
    marginBottom: 16,
  },
  label: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: 13,
    fontWeight: 500,
    marginBottom: 6,
    color: '#94a3b8',
  },
  required: {
    color: '#ef4444',
    marginLeft: 2,
  },
  securityBadge: {
    fontSize: 11,
    color: '#10b981',
    background: 'rgba(16, 185, 129, 0.15)',
    padding: '3px 8px',
    borderRadius: 4,
    fontWeight: 600,
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  input: {
    width: '100%',
    padding: '12px 80px 12px 14px',
    fontSize: 16,
    fontFamily: "'SF Mono', 'Monaco', 'Consolas', monospace",
    letterSpacing: 2,
    border: '2px solid rgba(255,255,255,0.1)',
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    color: '#e2e8f0',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    outline: 'none',
  },
  toggleBtn: {
    position: 'absolute',
    right: 36,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 6,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
  },
  validIcon: {
    position: 'absolute',
    right: 12,
    color: '#10b981',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorText: {
    margin: '6px 0 0',
    fontSize: 12,
    color: '#f87171',
  },
  helpText: {
    margin: '6px 0 0',
    fontSize: 11,
    color: '#64748b',
  },
};

// ============================================================
// SECURITY INFO BANNER COMPONENT
// ============================================================

export const SecurityBanner = () => (
  <div style={bannerStyles.container}>
    <div style={bannerStyles.icon}>🔒</div>
    <div style={bannerStyles.content}>
      <h4 style={bannerStyles.title}>Your Information is Protected</h4>
      <ul style={bannerStyles.list}>
        <li>✓ 256-bit SSL encryption in transit</li>
        <li>✓ AES-256 encryption at rest</li>
        <li>✓ IRS authorized e-file provider</li>
        <li>✓ SOC 2 Type II compliant</li>
      </ul>
    </div>
  </div>
);

const bannerStyles = {
  container: {
    display: 'flex',
    gap: 16,
    padding: 16,
    background: 'rgba(16, 185, 129, 0.1)',
    border: '1px solid rgba(16, 185, 129, 0.3)',
    borderRadius: 12,
    marginBottom: 20,
  },
  icon: {
    fontSize: 28,
    flexShrink: 0,
  },
  content: {
    flex: 1,
  },
  title: {
    margin: '0 0 8px',
    fontSize: 14,
    fontWeight: 600,
    color: '#10b981',
  },
  list: {
    margin: 0,
    padding: 0,
    listStyle: 'none',
    fontSize: 12,
    color: '#94a3b8',
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '4px 16px',
  },
};

export default SecureSSNInput;
