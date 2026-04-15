/**
 * ArogyaNetra AI - What-If Simulation Screen
 * Lifestyle parameter sliders with live risk projection updates
 */

import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { useRoute, RouteProp } from '@react-navigation/native';
import { GlassCard, AnimatedButton } from '../components/common';
import { Colors, Typography, Spacing, BorderRadius } from '../theme';
import { useAppStore } from '../store/useAppStore';
import type { HomeStackParamList, LifestyleParams } from '../models/types';

const { width } = Dimensions.get('window');
type RoutePropType = RouteProp<HomeStackParamList, 'WhatIf'>;

// ─── Lifestyle Slider ──────────────────────────────────
const LifestyleSlider: React.FC<{
  label: string;
  icon: string;
  paramKey: keyof LifestyleParams;
  min: number;
  max: number;
  step: number;
  unit: string;
  value: number;
  onChange: (key: keyof LifestyleParams, val: number) => void;
  color?: string;
}> = ({ label, icon, paramKey, min, max, step, unit, value, onChange, color = Colors.primary }) => (
  <View style={sliderStyles.container}>
    <View style={sliderStyles.headerRow}>
      <Text style={sliderStyles.icon}>{icon}</Text>
      <Text style={sliderStyles.label}>{label}</Text>
      <Text style={[sliderStyles.value, { color }]}>
        {Number.isInteger(value) ? value : value.toFixed(1)} {unit}
      </Text>
    </View>
    <Slider
      style={sliderStyles.slider}
      minimumValue={min}
      maximumValue={max}
      step={step}
      value={value}
      onValueChange={(v) => onChange(paramKey, v)}
      minimumTrackTintColor={color}
      maximumTrackTintColor={Colors.surfaceBorder}
      thumbTintColor={color}
    />
    <View style={sliderStyles.rangeRow}>
      <Text style={sliderStyles.range}>{min}{unit}</Text>
      <Text style={sliderStyles.range}>{max}{unit}</Text>
    </View>
  </View>
);

const sliderStyles = StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  icon: {
    fontSize: 16,
    marginRight: Spacing.sm,
  },
  label: {
    ...Typography.label,
    color: Colors.textPrimary,
    flex: 1,
  },
  value: {
    ...Typography.label,
    fontWeight: '700',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  rangeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  range: {
    ...Typography.caption,
    color: Colors.textTertiary,
  },
});

// ─── Delta Badge ────────────────────────────────────────
const DeltaBadge: React.FC<{
  disease: string;
  originalRisk: number;
  modifiedRisk: number;
  delta: number;
  color: string;
  icon: string;
}> = ({ disease, originalRisk, modifiedRisk, delta, color, icon }) => {
  const isImproved = delta < 0;
  const deltaColor = isImproved ? Colors.success : delta > 0 ? Colors.danger : Colors.textTertiary;

  return (
    <GlassCard style={deltaStyles.card}>
      <View style={deltaStyles.header}>
        <Text style={deltaStyles.icon}>{icon}</Text>
        <Text style={[deltaStyles.name, { color }]}>{disease}</Text>
      </View>
      <View style={deltaStyles.row}>
        <View style={deltaStyles.col}>
          <Text style={deltaStyles.label}>Current</Text>
          <Text style={deltaStyles.score}>{Math.round(originalRisk * 100)}%</Text>
        </View>
        <Text style={[deltaStyles.arrow, { color: deltaColor }]}>
          {isImproved ? '↓' : delta > 0 ? '↑' : '→'}
        </Text>
        <View style={deltaStyles.col}>
          <Text style={deltaStyles.label}>Modified</Text>
          <Text style={[deltaStyles.score, { color: deltaColor }]}>
            {Math.round(modifiedRisk * 100)}%
          </Text>
        </View>
        <View style={[deltaStyles.deltaBox, { backgroundColor: `${deltaColor}15`, borderColor: `${deltaColor}30` }]}>
          <Text style={[deltaStyles.deltaText, { color: deltaColor }]}>
            {delta >= 0 ? '+' : ''}{Math.round(delta * 100)}%
          </Text>
        </View>
      </View>
    </GlassCard>
  );
};

const deltaStyles = StyleSheet.create({
  card: {
    marginBottom: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  icon: {
    fontSize: 16,
    marginRight: Spacing.sm,
  },
  name: {
    ...Typography.label,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  col: {
    alignItems: 'center',
  },
  label: {
    ...Typography.caption,
    color: Colors.textTertiary,
  },
  score: {
    ...Typography.h4,
    color: Colors.textPrimary,
  },
  arrow: {
    ...Typography.h2,
    marginHorizontal: Spacing.lg,
  },
  deltaBox: {
    marginLeft: 'auto',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  deltaText: {
    ...Typography.label,
    fontWeight: '700',
  },
});

// ─── What-If Screen ────────────────────────────────────
export const WhatIfScreen: React.FC = () => {
  const route = useRoute<RoutePropType>();
  const {
    getStoredScan, currentScan,
    whatIfParams, setWhatIfParam, resetWhatIfParams,
    whatIfResult, computeWhatIf,
  } = useAppStore();

  const scan = getStoredScan(route.params.scanId) || currentScan;

  useEffect(() => {
    computeWhatIf();
  }, []);

  if (!scan) {
    return (
      <View style={styles.container}>
        <Text style={styles.loading}>Loading...</Text>
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
      <Text style={styles.title}>🔄 What-If Simulator</Text>
      <Text style={styles.subtitle}>
        Adjust lifestyle parameters to see projected risk changes
      </Text>

      {/* Delta Summary */}
      {whatIfResult && (
        <View style={styles.deltaSection}>
          <DeltaBadge
            disease="Hypertension"
            originalRisk={scan.diseases.hypertension.riskScore}
            modifiedRisk={whatIfResult.modifiedRisks.hypertension}
            delta={whatIfResult.deltas.hypertension}
            color={Colors.hypertension}
            icon="❤️"
          />
          <DeltaBadge
            disease="Diabetes"
            originalRisk={scan.diseases.diabetes.riskScore}
            modifiedRisk={whatIfResult.modifiedRisks.diabetes}
            delta={whatIfResult.deltas.diabetes}
            color={Colors.diabetes}
            icon="🩸"
          />
          <DeltaBadge
            disease="Anemia"
            originalRisk={scan.diseases.anemia.riskScore}
            modifiedRisk={whatIfResult.modifiedRisks.anemia}
            delta={whatIfResult.deltas.anemia}
            color={Colors.anemia}
            icon="👁️"
          />
        </View>
      )}

      {/* Lifestyle Sliders */}
      <GlassCard style={styles.slidersCard}>
        <Text style={styles.slidersTitle}>Lifestyle Parameters</Text>

        <LifestyleSlider
          label="Daily Exercise"
          icon="🏃"
          paramKey="exerciseMins"
          min={0} max={120} step={5}
          unit="min"
          value={whatIfParams.exerciseMins}
          onChange={setWhatIfParam}
          color={Colors.success}
        />

        <LifestyleSlider
          label="Sugar Intake"
          icon="🍭"
          paramKey="sugarGrams"
          min={0} max={150} step={5}
          unit="g"
          value={whatIfParams.sugarGrams}
          onChange={setWhatIfParam}
          color={Colors.diabetes}
        />

        <LifestyleSlider
          label="Sodium Intake"
          icon="🧂"
          paramKey="sodiumGrams"
          min={0} max={10} step={0.5}
          unit="g"
          value={whatIfParams.sodiumGrams}
          onChange={setWhatIfParam}
          color={Colors.hypertension}
        />

        <LifestyleSlider
          label="Iron-rich Foods"
          icon="🥩"
          paramKey="ironServings"
          min={0} max={14} step={1}
          unit="/wk"
          value={whatIfParams.ironServings}
          onChange={setWhatIfParam}
          color={Colors.anemia}
        />

        <LifestyleSlider
          label="Medication Adherence"
          icon="💊"
          paramKey="medicationAdherence"
          min={0} max={100} step={5}
          unit="%"
          value={whatIfParams.medicationAdherence}
          onChange={setWhatIfParam}
          color={Colors.primary}
        />

        <LifestyleSlider
          label="Sleep"
          icon="😴"
          paramKey="sleepHours"
          min={4} max={12} step={0.5}
          unit="hrs"
          value={whatIfParams.sleepHours}
          onChange={setWhatIfParam}
          color={Colors.secondary}
        />

        <LifestyleSlider
          label="Stress Level"
          icon="😰"
          paramKey="stressLevel"
          min={1} max={10} step={1}
          unit=""
          value={whatIfParams.stressLevel}
          onChange={setWhatIfParam}
          color={Colors.accent}
        />
      </GlassCard>

      {/* Reset Button */}
      <View style={styles.resetContainer}>
        <AnimatedButton
          title="↩️  Reset to Defaults"
          onPress={resetWhatIfParams}
          variant="outline"
          size="small"
        />
      </View>
    </ScrollView>
  );
};

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
  deltaSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  slidersCard: {
    marginHorizontal: Spacing.lg,
  },
  slidersTitle: {
    ...Typography.h4,
    color: Colors.textPrimary,
    marginBottom: Spacing.lg,
  },
  resetContainer: {
    alignItems: 'center',
    marginTop: Spacing.xl,
  },
});
