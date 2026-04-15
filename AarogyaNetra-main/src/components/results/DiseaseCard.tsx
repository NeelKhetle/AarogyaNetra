/**
 * ArogyaNetra AI - DiseaseCard Component
 * Individual disease risk display card with glassmorphic styling
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { GlassCard } from '../common/GlassCard';
import { RiskGauge } from '../common/RiskGauge';
import { Colors, Typography, Spacing } from '../../theme';
import { getRiskColor, getDiseaseColor } from '../../theme/colors';
import { RiskLevel } from '../../models/types';

interface DiseaseCardProps {
  name: string;
  riskLevel: RiskLevel;
  riskScore: number;
  confidence: number;
  keyMetric: { label: string; value: string | number; unit: string };
  category: string;
  icon: string;
}

export const DiseaseCard: React.FC<DiseaseCardProps> = ({
  name,
  riskLevel,
  riskScore,
  confidence,
  keyMetric,
  category,
  icon,
}) => {
  const diseaseColor = getDiseaseColor(name);
  const riskColor = getRiskColor(riskLevel);

  return (
    <GlassCard
      borderColor={`${diseaseColor}33`}
      style={styles.card}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.icon}>{icon}</Text>
        <Text style={[styles.name, { color: diseaseColor }]}>{name}</Text>
      </View>

      {/* Risk Gauge */}
      <View style={styles.gaugeContainer}>
        <RiskGauge
          score={riskScore}
          maxScore={1}
          size={80}
          strokeWidth={8}
          color={riskColor}
          label=""
        />
      </View>

      {/* Risk Badge */}
      <View style={[styles.badge, { backgroundColor: `${riskColor}20`, borderColor: `${riskColor}40` }]}>
        <Text style={[styles.badgeText, { color: riskColor }]}>
          {riskLevel.toUpperCase()}
        </Text>
      </View>

      {/* Key Metric */}
      <View style={styles.metric}>
        <Text style={styles.metricLabel}>{keyMetric.label}</Text>
        <Text style={[styles.metricValue, { color: diseaseColor }]}>
          {keyMetric.value}
          <Text style={styles.metricUnit}> {keyMetric.unit}</Text>
        </Text>
      </View>

      {/* Category */}
      <Text style={styles.category}>{category}</Text>

      {/* Confidence */}
      <View style={styles.confidenceRow}>
        <Text style={styles.confidenceLabel}>Confidence</Text>
        <Text style={styles.confidenceValue}>{Math.round(confidence * 100)}%</Text>
      </View>
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    marginHorizontal: Spacing.xs,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  icon: {
    fontSize: 24,
    marginBottom: 4,
  },
  name: {
    ...Typography.labelSmall,
    letterSpacing: 1,
  },
  gaugeContainer: {
    marginVertical: Spacing.sm,
  },
  badge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: Spacing.sm,
  },
  badgeText: {
    ...Typography.caption,
    fontWeight: '700',
    letterSpacing: 1,
  },
  metric: {
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  metricLabel: {
    ...Typography.caption,
    color: Colors.textTertiary,
  },
  metricValue: {
    ...Typography.h4,
    fontSize: 16,
  },
  metricUnit: {
    ...Typography.caption,
    color: Colors.textTertiary,
    fontSize: 10,
  },
  category: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  confidenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBorder,
  },
  confidenceLabel: {
    ...Typography.caption,
    color: Colors.textTertiary,
  },
  confidenceValue: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
});
