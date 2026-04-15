/**
 * ArogyaNetra AI - Design System Colors
 * Premium glassmorphic dark theme for medical application
 */

export const Colors = {
  // Primary palette
  primary: '#6C63FF',
  primaryLight: '#8B85FF',
  primaryDark: '#4A42E0',

  // Secondary
  secondary: '#00D4AA',
  secondaryLight: '#33DFC0',
  secondaryDark: '#00B894',

  // Accent
  accent: '#FF6B6B',
  accentLight: '#FF8E8E',
  accentDark: '#E55050',

  // Background
  background: '#0A0E27',
  backgroundLight: '#111638',
  backgroundLighter: '#1A1F4A',

  // Surface (glassmorphic)
  surface: 'rgba(255,255,255,0.05)',
  surfaceLight: 'rgba(255,255,255,0.08)',
  surfaceBorder: 'rgba(255,255,255,0.1)',
  surfaceBorderLight: 'rgba(255,255,255,0.15)',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.6)',
  textTertiary: 'rgba(255,255,255,0.4)',
  textInverse: '#0A0E27',

  // Status colors
  success: '#00E676',
  successLight: '#69F0AE',
  warning: '#FFD740',
  warningLight: '#FFE57F',
  danger: '#FF5252',
  dangerLight: '#FF8A80',

  // Risk level colors
  riskLow: '#00E676',
  riskModerate: '#FFD740',
  riskHigh: '#FF6B6B',
  riskCritical: '#FF1744',

  // Disease-specific colors
  hypertension: '#FF6B6B',
  hypertensionLight: 'rgba(255,107,107,0.15)',
  diabetes: '#6C63FF',
  diabetesLight: 'rgba(108,99,255,0.15)',
  anemia: '#FFD740',
  anemiaLight: 'rgba(255,215,64,0.15)',

  // Chart colors
  chartLine: '#6C63FF',
  chartFill: 'rgba(108,99,255,0.2)',
  chartGrid: 'rgba(255,255,255,0.1)',

  // Misc
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
  overlay: 'rgba(0,0,0,0.6)',
  shimmer: 'rgba(255,255,255,0.05)',
};

/**
 * Get color for a given risk level string
 */
export function getRiskColor(level: string): string {
  switch (level.toLowerCase()) {
    case 'low':
      return Colors.riskLow;
    case 'moderate':
      return Colors.riskModerate;
    case 'high':
      return Colors.riskHigh;
    case 'critical':
      return Colors.riskCritical;
    default:
      return Colors.textSecondary;
  }
}

/**
 * Get color for a specific disease
 */
export function getDiseaseColor(disease: string): string {
  switch (disease.toLowerCase()) {
    case 'hypertension':
      return Colors.hypertension;
    case 'diabetes':
      return Colors.diabetes;
    case 'anemia':
      return Colors.anemia;
    default:
      return Colors.primary;
  }
}
