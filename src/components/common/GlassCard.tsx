/**
 * ArogyaNetra AI - GlassCard Component
 * Glassmorphic card with frosted glass effect
 */

import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Colors, BorderRadius, Spacing } from '../../theme';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'elevated' | 'accent';
  borderColor?: string;
  padding?: number;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  style,
  variant = 'default',
  borderColor,
  padding,
}) => {
  const variantStyles: Record<string, ViewStyle> = {
    default: {
      backgroundColor: Colors.surface,
      borderColor: borderColor || Colors.surfaceBorder,
    },
    elevated: {
      backgroundColor: Colors.surfaceLight,
      borderColor: borderColor || Colors.surfaceBorderLight,
    },
    accent: {
      backgroundColor: 'rgba(108, 99, 255, 0.08)',
      borderColor: borderColor || 'rgba(108, 99, 255, 0.2)',
    },
  };

  return (
    <View
      style={[
        styles.card,
        variantStyles[variant],
        padding !== undefined && { padding },
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    overflow: 'hidden',
  },
});
