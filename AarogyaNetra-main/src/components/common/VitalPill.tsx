/**
 * ArogyaNetra AI - VitalPill Component
 * Compact vital sign display pill
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Typography, BorderRadius, Spacing } from '../../theme';

interface VitalPillProps {
  label: string;
  value: string | number;
  unit: string;
  icon?: string;
  color?: string;
}

export const VitalPill: React.FC<VitalPillProps> = ({
  label,
  value,
  unit,
  color = Colors.primary,
}) => {
  return (
    <View style={[styles.pill, { borderColor: `${color}33` }]}>
      <Text style={[styles.label, { color: `${color}99` }]}>{label}</Text>
      <View style={styles.valueRow}>
        <Text style={[styles.value, { color }]}>{value}</Text>
        <Text style={styles.unit}>{unit}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  pill: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    minWidth: 80,
  },
  label: {
    ...Typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  value: {
    ...Typography.h3,
    fontSize: 18,
  },
  unit: {
    ...Typography.caption,
    color: Colors.textTertiary,
    marginLeft: 2,
  },
});
