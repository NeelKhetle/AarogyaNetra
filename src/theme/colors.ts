/**
 * AarogyaNetra AI - Design System Colors
 * "Empathetic Guardian" — Clean, calm health-tech palette
 * Green primary, white surfaces, soft tonal layering
 */

export const Colors = {
  // Primary palette (green health)
  primary: '#006e2f',
  primaryLight: '#22c55e',
  primaryDark: '#004b1e',
  primaryContainer: '#22c55e',

  // Secondary (blue actions)
  secondary: '#0058be',
  secondaryLight: '#2170e4',
  secondaryDark: '#004395',
  secondaryFixed: '#d8e2ff',

  // Accent / Tertiary
  accent: '#9e4036',
  accentLight: '#ff8b7c',
  accentDark: '#7f2a21',

  // Background & Surface (tonal layering)
  background: '#f8f9fa',
  backgroundLight: '#ffffff',
  backgroundLighter: '#f3f4f5',

  // Surface hierarchy (no borders — use tonal shifts)
  surface: '#ffffff',
  surfaceLight: '#f3f4f5',
  surfaceDim: '#d9dadb',
  surfaceBorder: '#e1e3e4',       // ghost border only (15% opacity usage)
  surfaceBorderLight: '#bccbb9',
  surfaceContainer: '#edeeef',
  surfaceContainerLow: '#f3f4f5',
  surfaceContainerHigh: '#e7e8e9',

  // Text (never pure black)
  textPrimary: '#191c1d',
  textSecondary: '#3d4a3d',
  textTertiary: '#6d7b6c',
  textInverse: '#ffffff',

  // Status colors
  success: '#22c55e',
  successLight: '#dcfce7',
  warning: '#f59e0b',
  warningLight: '#fef3c7',
  danger: '#ba1a1a',
  dangerLight: '#ffdad6',

  // Risk level colors
  riskLow: '#22c55e',
  riskModerate: '#f59e0b',
  riskHigh: '#ef4444',
  riskCritical: '#ba1a1a',

  // Disease-specific colors
  hypertension: '#ef4444',
  hypertensionLight: 'rgba(239,68,68,0.08)',
  diabetes: '#006e2f',
  diabetesLight: 'rgba(0,110,47,0.08)',
  anemia: '#f59e0b',
  anemiaLight: 'rgba(245,158,11,0.08)',

  // Chart
  chartLine: '#006e2f',
  chartFill: 'rgba(0,110,47,0.1)',
  chartGrid: 'rgba(0,0,0,0.04)',

  // Misc
  white: '#FFFFFF',
  black: '#191c1d',
  transparent: 'transparent',
  overlay: 'rgba(25,28,29,0.4)',
  shimmer: 'rgba(0,0,0,0.02)',
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
