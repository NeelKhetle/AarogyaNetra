/**
 * ArogyaNetra AI - DREM Screen
 * Dynamic Risk Evolution Modeling with trajectory charts
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { LineChart } from 'react-native-chart-kit';
import { GlassCard } from '../components/common';
import { Colors, Typography, Spacing, BorderRadius } from '../theme';
import { getDiseaseColor } from '../theme/colors';
import { useAppStore } from '../store/useAppStore';
import type { HomeStackParamList, TrajectoryData } from '../models/types';

const { width } = Dimensions.get('window');
type RoutePropType = RouteProp<HomeStackParamList, 'DREM'>;

// ─── Trajectory Chart ──────────────────────────────────
const TrajectoryChart: React.FC<{
  data: TrajectoryData;
  color: string;
  title: string;
  icon: string;
}> = ({ data, color, title, icon }) => {
  const chartConfig = {
    backgroundColor: 'transparent',
    backgroundGradientFrom: Colors.background,
    backgroundGradientTo: Colors.background,
    decimalCount: 2,
    color: () => color,
    labelColor: () => Colors.textSecondary,
    propsForDots: {
      r: '3',
      strokeWidth: '1',
      stroke: color,
    },
    propsForBackgroundLines: {
      stroke: Colors.surfaceBorder,
      strokeWidth: 0.5,
    },
  };

  return (
    <GlassCard style={styles.chartCard}>
      <View style={styles.chartHeader}>
        <Text style={styles.chartIcon}>{icon}</Text>
        <Text style={[styles.chartTitle, { color }]}>{title}</Text>
      </View>

      <LineChart
        data={{
          labels: data.months.map(m => `M${m}`),
          datasets: [
            {
              data: data.median,
              color: () => color,
              strokeWidth: 3,
            },
            {
              data: data.p25,
              color: () => `${color}40`,
              strokeWidth: 1,
            },
            {
              data: data.p75,
              color: () => `${color}40`,
              strokeWidth: 1,
            },
          ],
        }}
        width={width - 80}
        height={180}
        chartConfig={chartConfig}
        bezier
        withHorizontalLabels
        withVerticalLabels
        withDots
        style={styles.chart}
        fromZero
      />

      {/* Risk threshold line description */}
      <View style={styles.legendRow}>
        <View style={[styles.legendLine, { backgroundColor: color }]} />
        <Text style={styles.legendLabel}>Median trajectory</Text>
        <View style={[styles.legendLine, { backgroundColor: `${color}40` }]} />
        <Text style={styles.legendLabel}>25th-75th band</Text>
      </View>

      {/* Current vs projected */}
      <View style={styles.projectionRow}>
        <View style={styles.projectionItem}>
          <Text style={styles.projectionLabel}>Current</Text>
          <Text style={[styles.projectionValue, { color }]}>
            {Math.round(data.median[0] * 100)}%
          </Text>
        </View>
        <View style={styles.projectionArrow}>
          <Text style={styles.arrowText}>→</Text>
        </View>
        <View style={styles.projectionItem}>
          <Text style={styles.projectionLabel}>Projected</Text>
          <Text style={[styles.projectionValue, { color }]}>
            {Math.round(data.median[data.median.length - 1] * 100)}%
          </Text>
        </View>
      </View>
    </GlassCard>
  );
};

// ─── DREM Screen ───────────────────────────────────────
export const DREMScreen: React.FC = () => {
  const route = useRoute<RoutePropType>();
  const { generateDREM, currentDREM, getStoredScan, currentScan } = useAppStore();
  const [horizon, setHorizon] = useState<6 | 12>(6);

  const scan = getStoredScan(route.params.scanId) || currentScan;

  useEffect(() => {
    generateDREM(horizon);
  }, [horizon]);

  if (!scan || !currentDREM) {
    return (
      <View style={styles.container}>
        <Text style={styles.loading}>Generating trajectories...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <Text style={styles.title}>📊 Risk Trajectory</Text>
      <Text style={styles.subtitle}>
        Monte Carlo simulation with Ornstein-Uhlenbeck process
      </Text>

      {/* Horizon Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, horizon === 6 && styles.tabActive]}
          onPress={() => setHorizon(6)}
        >
          <Text style={[styles.tabText, horizon === 6 && styles.tabTextActive]}>
            6 Months
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, horizon === 12 && styles.tabActive]}
          onPress={() => setHorizon(12)}
        >
          <Text style={[styles.tabText, horizon === 12 && styles.tabTextActive]}>
            12 Months
          </Text>
        </TouchableOpacity>
      </View>

      {/* Charts */}
      <TrajectoryChart
        data={currentDREM.trajectories.hypertension}
        color={Colors.hypertension}
        title="Hypertension Risk"
        icon="❤️"
      />

      <TrajectoryChart
        data={currentDREM.trajectories.diabetes}
        color={Colors.diabetes}
        title="Diabetes Risk"
        icon="🩸"
      />

      <TrajectoryChart
        data={currentDREM.trajectories.anemia}
        color={Colors.anemia}
        title="Anemia Risk"
        icon="👁️"
      />

      {/* Summary */}
      <GlassCard variant="accent" style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>📋 Trajectory Summary</Text>
        <Text style={styles.summaryText}>
          Based on {NUM_SIMS} Monte Carlo simulations, your {horizon}-month risk trajectories
          show the median projected path along with 25th-75th percentile confidence bands.
          The model accounts for age-related disease progression and population-level variance.
        </Text>
        <Text style={styles.summaryNote}>
          💡 Use the What-If simulator to see how lifestyle changes could alter these trajectories.
        </Text>
      </GlassCard>
    </ScrollView>
  );
};

const NUM_SIMS = 100;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingBottom: 100,
  },
  loading: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 100,
  },
  title: {
    ...Typography.h2,
    color: Colors.textPrimary,
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.xl,
  },
  subtitle: {
    ...Typography.bodySmall,
    color: Colors.textTertiary,
    paddingHorizontal: Spacing.lg,
    marginTop: 4,
    marginBottom: Spacing.lg,
  },
  // Tabs
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: `${Colors.primary}20`,
    borderColor: Colors.primary,
  },
  tabText: {
    ...Typography.label,
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: Colors.primary,
  },
  // Chart card
  chartCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    padding: Spacing.md,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  chartIcon: {
    fontSize: 20,
    marginRight: Spacing.sm,
  },
  chartTitle: {
    ...Typography.h4,
  },
  chart: {
    borderRadius: BorderRadius.md,
    marginLeft: -20,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  legendLine: {
    width: 20,
    height: 3,
    borderRadius: 1.5,
  },
  legendLabel: {
    ...Typography.caption,
    color: Colors.textTertiary,
  },
  projectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBorder,
  },
  projectionItem: {
    alignItems: 'center',
  },
  projectionLabel: {
    ...Typography.caption,
    color: Colors.textTertiary,
  },
  projectionValue: {
    ...Typography.h3,
  },
  projectionArrow: {
    marginHorizontal: Spacing.xl,
  },
  arrowText: {
    ...Typography.h2,
    color: Colors.textTertiary,
  },
  // Summary
  summaryCard: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
  },
  summaryTitle: {
    ...Typography.h4,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  summaryText: {
    ...Typography.body,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: Spacing.sm,
  },
  summaryNote: {
    ...Typography.bodySmall,
    color: Colors.secondary,
    fontStyle: 'italic',
  },
});
