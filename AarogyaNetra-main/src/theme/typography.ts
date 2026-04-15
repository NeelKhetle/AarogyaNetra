/**
 * ArogyaNetra AI - Typography
 * Premium medical typography using bundled fonts
 */

import { TextStyle, Platform } from 'react-native';

// Font families - Using system fonts that look great on Android
// In production, bundle Inter and Space Grotesk
const FontFamily = {
  heading: Platform.select({
    android: 'sans-serif-medium',
    default: 'System',
  }),
  body: Platform.select({
    android: 'sans-serif',
    default: 'System',
  }),
  mono: Platform.select({
    android: 'monospace',
    default: 'Courier',
  }),
};

export const Typography = {
  // Headings
  h1: {
    fontFamily: FontFamily.heading,
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 40,
    letterSpacing: -0.5,
  } as TextStyle,

  h2: {
    fontFamily: FontFamily.heading,
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 32,
    letterSpacing: -0.3,
  } as TextStyle,

  h3: {
    fontFamily: FontFamily.heading,
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 28,
    letterSpacing: -0.2,
  } as TextStyle,

  h4: {
    fontFamily: FontFamily.heading,
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 24,
  } as TextStyle,

  // Body text
  bodyLarge: {
    fontFamily: FontFamily.body,
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
  } as TextStyle,

  body: {
    fontFamily: FontFamily.body,
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 22,
  } as TextStyle,

  bodySmall: {
    fontFamily: FontFamily.body,
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 18,
  } as TextStyle,

  // Labels
  label: {
    fontFamily: FontFamily.body,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
    letterSpacing: 0.2,
  } as TextStyle,

  labelSmall: {
    fontFamily: FontFamily.body,
    fontSize: 11,
    fontWeight: '500',
    lineHeight: 16,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  } as TextStyle,

  // Special
  metric: {
    fontFamily: FontFamily.heading,
    fontSize: 48,
    fontWeight: '700',
    lineHeight: 56,
    letterSpacing: -1,
  } as TextStyle,

  metricSmall: {
    fontFamily: FontFamily.heading,
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 36,
    letterSpacing: -0.5,
  } as TextStyle,

  caption: {
    fontFamily: FontFamily.body,
    fontSize: 10,
    fontWeight: '400',
    lineHeight: 14,
    letterSpacing: 0.3,
  } as TextStyle,

  button: {
    fontFamily: FontFamily.heading,
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
    letterSpacing: 0.3,
  } as TextStyle,

  buttonSmall: {
    fontFamily: FontFamily.heading,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
    letterSpacing: 0.3,
  } as TextStyle,
};
