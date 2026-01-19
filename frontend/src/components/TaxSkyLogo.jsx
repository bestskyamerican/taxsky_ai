// ============================================================
// TAXSKY AI LOGO COMPONENTS
// ============================================================
// Shared logo components for consistent branding across all pages
// Import and use: import { TaxSkyLogo, TaxSkyIcon } from './TaxSkyLogo';
// ============================================================

import React from 'react';

// ============================================================
// FULL LOGO WITH TEXT - For headers and large displays
// ============================================================
export const TaxSkyLogo = ({ size = "default", className = "" }) => {
  const sizes = {
    small: { width: 170, height: 48, fontSize: 20, aiSize: 12 },
    default: { width: 200, height: 56, fontSize: 24, aiSize: 14 },
    large: { width: 260, height: 72, fontSize: 30, aiSize: 18 },
  };
  const s = sizes[size] || sizes.default;
  
  return (
    <svg 
      width={s.width} 
      height={s.height} 
      viewBox="0 0 180 50" 
      fill="none" 
      className={className}
      style={{ display: 'block' }}
    >
      <defs>
        <linearGradient id="hexGradLogo" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6366f1"/>
          <stop offset="100%" stopColor="#8b5cf6"/>
        </linearGradient>
        <linearGradient id="textGradLogo" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3b82f6"/>
          <stop offset="100%" stopColor="#06b6d4"/>
        </linearGradient>
        <filter id="glowLogo">
          <feGaussianBlur stdDeviation="1" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      {/* Hexagon layers */}
      <polygon points="22,7 34,1 46,7 46,20 34,26 22,20" fill="url(#hexGradLogo)" opacity="0.25"/>
      <polygon points="18,12 30,6 42,12 42,25 30,31 18,25" fill="url(#hexGradLogo)" opacity="0.5"/>
      <polygon points="20,17 32,11 44,17 44,29 32,35 20,29" fill="url(#hexGradLogo)" filter="url(#glowLogo)"/>
      {/* Dollar sign */}
      <path d="M32 20 L32 29 M28 22.5 Q32 20 36 22.5 Q32 25 28 27.5 Q32 30 36 27.5" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none"/>
      {/* Text */}
      <text x="54" y="29" fontFamily="'Space Grotesk', system-ui, -apple-system, sans-serif" fontSize={s.fontSize} fontWeight="700" fill="white">Tax</text>
      <text x="92" y="29" fontFamily="'Space Grotesk', system-ui, -apple-system, sans-serif" fontSize={s.fontSize} fontWeight="700" fill="url(#textGradLogo)">Sky</text>
      <text x="136" y="29" fontFamily="'Space Grotesk', system-ui, -apple-system, sans-serif" fontSize={s.aiSize} fontWeight="600" fill="#a78bfa">AI</text>
    </svg>
  );
};

// ============================================================
// ICON ONLY - For favicons, app icons, and small displays
// ============================================================
export const TaxSkyIcon = ({ size = 40, className = "" }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 40 40" 
    fill="none" 
    className={className}
    style={{ display: 'block' }}
  >
    <defs>
      <linearGradient id="iconGradTax" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#6366f1"/>
        <stop offset="100%" stopColor="#8b5cf6"/>
      </linearGradient>
      <linearGradient id="iconBgTax" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#0f0f1a"/>
        <stop offset="100%" stopColor="#1a1a2e"/>
      </linearGradient>
    </defs>
    <rect width="40" height="40" rx="10" fill="url(#iconBgTax)"/>
    <polygon points="16,8 24,4 32,8 32,18 24,22 16,18" fill="url(#iconGradTax)" opacity="0.35"/>
    <polygon points="13,12 21,8 29,12 29,22 21,26 13,22" fill="url(#iconGradTax)" opacity="0.6"/>
    <polygon points="15,16 22,12 29,16 29,25 22,29 15,25" fill="url(#iconGradTax)"/>
    <path d="M22 18 L22 25 M19 20 Q22 18 25 20 Q22 22 19 24 Q22 26 25 24" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
  </svg>
);

// ============================================================
// INLINE SVG STRINGS - For use in style objects or dangerouslySetInnerHTML
// ============================================================
export const TaxSkyLogoSVG = `
<svg width="180" height="50" viewBox="0 0 180 50" fill="none">
  <defs>
    <linearGradient id="hexGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#6366f1"/>
      <stop offset="100%" stop-color="#8b5cf6"/>
    </linearGradient>
    <linearGradient id="textGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#3b82f6"/>
      <stop offset="100%" stop-color="#06b6d4"/>
    </linearGradient>
  </defs>
  <polygon points="22,7 34,1 46,7 46,20 34,26 22,20" fill="url(#hexGrad)" opacity="0.25"/>
  <polygon points="18,12 30,6 42,12 42,25 30,31 18,25" fill="url(#hexGrad)" opacity="0.5"/>
  <polygon points="20,17 32,11 44,17 44,29 32,35 20,29" fill="url(#hexGrad)"/>
  <path d="M32 20 L32 29 M28 22.5 Q32 20 36 22.5 Q32 25 28 27.5 Q32 30 36 27.5" stroke="white" stroke-width="2" stroke-linecap="round" fill="none"/>
  <text x="54" y="29" font-family="Space Grotesk, system-ui, sans-serif" font-size="22" font-weight="700" fill="white">Tax</text>
  <text x="92" y="29" font-family="Space Grotesk, system-ui, sans-serif" font-size="22" font-weight="700" fill="url(#textGrad)">Sky</text>
  <text x="136" y="29" font-family="Space Grotesk, system-ui, sans-serif" font-size="13" font-weight="600" fill="#a78bfa">AI</text>
</svg>
`;

export const TaxSkyIconSVG = `
<svg width="40" height="40" viewBox="0 0 40 40" fill="none">
  <defs>
    <linearGradient id="iconGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#6366f1"/>
      <stop offset="100%" stop-color="#8b5cf6"/>
    </linearGradient>
    <linearGradient id="iconBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f0f1a"/>
      <stop offset="100%" stop-color="#1a1a2e"/>
    </linearGradient>
  </defs>
  <rect width="40" height="40" rx="10" fill="url(#iconBg)"/>
  <polygon points="16,8 24,4 32,8 32,18 24,22 16,18" fill="url(#iconGrad)" opacity="0.35"/>
  <polygon points="13,12 21,8 29,12 29,22 21,26 13,22" fill="url(#iconGrad)" opacity="0.6"/>
  <polygon points="15,16 22,12 29,16 29,25 22,29 15,25" fill="url(#iconGrad)"/>
  <path d="M22 18 L22 25 M19 20 Q22 18 25 20 Q22 22 19 24 Q22 26 25 24" stroke="white" stroke-width="1.5" stroke-linecap="round" fill="none"/>
</svg>
`;

export default TaxSkyLogo;
