/**
 * AarogyaNetra AI - Card Component
 * "Empathetic Guardian" design: No borders, tonal layering, soft ambient shadows
 */

import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Colors, Spacing } from '../../theme';

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
  padding,
}) => {
  const variantStyles: Record<string, ViewStyle> = {
    default: {
      backgroundColor: Colors.surfaceContainerLow || Colors.surfaceLight,
    },
    elevated: {
      backgroundColor: Colors.surface,
      elevation: 2,
      shadowColor: '#191c1d',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.06,
      shadowRadius: 32,
    },
    accent: {
      backgroundColor: `${Colors.primary}08`,
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
    borderRadius: 16,
    borderWidth: 0,  // No borders — Empathetic Guardian rule
    padding: Spacing.lg,
    overflow: 'hidden',
  },
});
