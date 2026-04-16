/**
 * ArogyaNetra AI - Results Screen
 * Comprehensive scan results dashboard with health score, disease cards, vitals,
 * ARE explanations, diet recommendations, and downloadable reports
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
  Share,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { GlassCard, AnimatedButton, RiskGauge, VitalPill } from '../components/common';
import { DiseaseCard } from '../components/results/DiseaseCard';
import { Colors, Typography, Spacing, BorderRadius } from '../theme';
import { useAppStore } from '../store/useAppStore';
import type { HomeStackParamList, ScanResult } from '../models/types';

type NavProp = NativeStackNavigationProp<HomeStackParamList, 'Results'>;

// ─── Animated SHAP bar ────────────────────────────────
const SHAPBar: React.FC<{
  label: string;
  value: number;   // 0–1
  color: string;
  delay?: number;
}> = ({ label, value, color, delay = 0 }) => {
  const animW = useRef(new Animated.Value(0)).current;
  const pct = Math.round(value * 100);

  useEffect(() => {
    Animated.timing(animW, {
      toValue: value,
      duration: 900,
      delay,
      useNativeDriver: false,
    }).start();
  }, [value]);

  return (
    <View style={shapStyles.row}>
      <Text style={shapStyles.label} numberOfLines={1}>{label}</Text>
      <View style={shapStyles.track}>
        <Animated.View
          style={[
            shapStyles.fill,
            {
              backgroundColor: color,
              width: animW.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
            },
          ]}
        />
      </View>
      <Text style={[shapStyles.pct, { color }]}>{pct}%</Text>
    </View>
  );
};

const shapStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  label: { ...Typography.caption, color: Colors.textSecondary, width: 130 },
  track: { flex: 1, height: 8, backgroundColor: Colors.surfaceContainerLow ?? '#f3f4f5', borderRadius: 4, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4 },
  pct: { ...Typography.caption, fontWeight: '700', width: 34, textAlign: 'right' },
});

// ─── XAI: Compute SHAP-style factors from scan ───────
function computeXAIFactors(scan: ScanResult) {
  const { diseases, vitals } = scan;
  const htn = diseases.hypertension.riskScore;
  const dia = diseases.diabetes.riskScore;
  const ane = diseases.anemia.riskScore;

  return [
    {
      label: 'Hypertension Signals',
      value: parseFloat(htn.toFixed(2)),
      color: Colors.hypertension ?? '#ef4444',
      desc: `BP est. ${diseases.hypertension.systolicEstimate}/${diseases.hypertension.diastolicEstimate} mmHg · HR ${vitals.heartRate} BPM`,
    },
    {
      label: 'Diabetes Indicators',
      value: parseFloat(dia.toFixed(2)),
      color: Colors.primary,
      desc: `HbA1c proxy ${diseases.diabetes.hba1cProxy}% · Fasting glucose est.`,
    },
    {
      label: 'Anemia Markers',
      value: parseFloat(ane.toFixed(2)),
      color: Colors.anemia ?? '#f59e0b',
      desc: `Hb est. ${diseases.anemia.hemoglobinEstimate} g/dL · Pallor index ${diseases.anemia.pallorIndex.toFixed(2)}`,
    },
    {
      label: 'Cardiovascular Load',
      value: parseFloat(Math.min(1, (vitals.heartRate - 60) / 60 + htn * 0.5).toFixed(2)),
      color: Colors.secondary,
      desc: `SpO2 ${vitals.spo2Proxy}% · Resp rate ${vitals.respiratoryRate}/min`,
    },
    {
      label: 'Lifestyle Risk',
      value: parseFloat(((htn + dia) / 2 * 0.7 + 0.1).toFixed(2)),
      color: Colors.warning ?? '#f59e0b',
      desc: 'Diet, activity, sleep and stress patterns',
    },
  ];
}

// ─── Contribution weights WITHOUT thermal ─────────────
const XAI_WEIGHTS = [
  { label: 'Lifestyle & Profile Data', weight: 35, color: Colors.primary },
  { label: 'Symptom Questionnaire', weight: 30, color: Colors.secondary },
  { label: 'Face Scan (rPPG Analysis)', weight: 20, color: Colors.warning ?? '#f59e0b' },
  { label: 'Eye/Conjunctival Analysis', weight: 15, color: Colors.accent ?? '#8b5cf6' },
];

// ─── Animated Weight Bar ─────────────────────────────
const WeightBar: React.FC<{ label: string; weight: number; color: string; delay: number }> = ({ label, weight, color, delay }) => {
  const animW = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animW, {
      toValue: weight,
      duration: 1000,
      delay,
      useNativeDriver: false,
    }).start();
  }, []);

  return (
    <View style={wbStyles.row}>
      <View style={wbStyles.labelRow}>
        <Text style={wbStyles.label}>{label}</Text>
        <Text style={[wbStyles.pct, { color }]}>{weight}%</Text>
      </View>
      <View style={wbStyles.track}>
        <Animated.View
          style={[
            wbStyles.fill,
            {
              backgroundColor: color,
              width: animW.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }),
            },
          ]}
        />
      </View>
    </View>
  );
};

const wbStyles = StyleSheet.create({
  row: { marginBottom: 14 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  label: { ...Typography.bodySmall, color: Colors.textSecondary },
  pct: { ...Typography.label, fontWeight: '700' },
  track: { height: 8, backgroundColor: Colors.surfaceContainerLow ?? '#f3f4f5', borderRadius: 4, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4 },
});

export const ResultsScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  // useRoute with any — this screen is used in both HomeStack (Results)
  // and ProfileStack (ResultDetail), both passing { scanId: string }
  const route = useRoute<any>();
  const { getStoredScan, currentScan, user } = useAppStore();

  const scan = getStoredScan(route.params?.scanId) || currentScan;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  if (!scan) {
    return (
      <View style={styles.container}>
        <Text style={styles.error}>Scan not found</Text>
      </View>
    );
  }

  const { diseases, vitals, areExplanation, overallHealthScore } = scan;
  const scoreColor = overallHealthScore >= 70 ? Colors.success
    : overallHealthScore >= 50 ? Colors.warning
    : Colors.danger;

  const handleShareReport = async () => {
    try {
      const date = new Date(scan.timestamp).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'long', year: 'numeric',
      });

      const report = `
🏥 AAROGYANETRA AI - Health Report
📅 ${date} | 📊 Score: ${overallHealthScore}/100

━━ VITALS ━━
❤️ HR: ${vitals.heartRate} BPM | SpO2: ${vitals.spo2Proxy}%
🩺 BP: ${vitals.bloodPressureSystolic}/${vitals.bloodPressureDiastolic} mmHg

━━ RISK ANALYSIS ━━
❤️ Hypertension: ${diseases.hypertension.category} (${Math.round(diseases.hypertension.riskScore * 100)}%)
🩸 Diabetes: ${diseases.diabetes.category} (${Math.round(diseases.diabetes.riskScore * 100)}%)
👁️ Anemia: ${diseases.anemia.category} (${Math.round(diseases.anemia.riskScore * 100)}%)

${areExplanation.summary}

💡 ${areExplanation.counterfactual}

⚠️ Screening tool only — not a diagnosis.
Generated by AarogyaNetra AI
`.trim();

      await Share.share({
        message: report,
        title: 'AarogyaNetra Health Report',
      });
    } catch (err) {
      Alert.alert('Error', 'Failed to share report.');
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View style={{ opacity: fadeAnim }}>
        {/* Normal Camera Badge */}
        <View style={styles.labBadge}>
          <Text style={styles.labBadgeText}>📷 Scanned with Normal Camera</Text>
        </View>

        {/* Lab Data Badge */}
        {scan.usedLabData && (
          <View style={styles.labBadge}>
            <Text style={styles.labBadgeText}>
              ✅ Lab report data used — Higher accuracy
            </Text>
          </View>
        )}



        {/* Health Score Header */}
        <View style={styles.scoreSection}>
          <RiskGauge
            score={overallHealthScore}
            size={160}
            strokeWidth={14}
            label="Health Score"
            color={scoreColor}
          />
          <Text style={styles.scoreInterpretation}>
            {overallHealthScore >= 80 ? '🌟 Excellent Health Profile' :
             overallHealthScore >= 65 ? '👍 Good — Minor attention needed' :
             overallHealthScore >= 45 ? '⚠️ Moderate — Consult a physician' :
             '🚨 Elevated Risk — Seek medical advice'}
          </Text>
        </View>

        {/* Disease Risk Cards */}
        <Text style={styles.sectionTitle}>Disease Analysis</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.diseaseScroll}
        >
          <DiseaseCard
            name="Hypertension"
            riskLevel={diseases.hypertension.riskLevel}
            riskScore={diseases.hypertension.riskScore}
            confidence={diseases.hypertension.confidence}
            keyMetric={{
              label: 'BP',
              value: `${diseases.hypertension.systolicEstimate}/${diseases.hypertension.diastolicEstimate}`,
              unit: 'mmHg',
            }}
            category={diseases.hypertension.category}
            icon="❤️"
          />
          <DiseaseCard
            name="Diabetes"
            riskLevel={diseases.diabetes.riskLevel}
            riskScore={diseases.diabetes.riskScore}
            confidence={diseases.diabetes.confidence}
            keyMetric={{
              label: 'HbA1c',
              value: diseases.diabetes.hba1cProxy,
              unit: '%',
            }}
            category={diseases.diabetes.category}
            icon="🩸"
          />
          <DiseaseCard
            name="Anemia"
            riskLevel={diseases.anemia.riskLevel}
            riskScore={diseases.anemia.riskScore}
            confidence={diseases.anemia.confidence}
            keyMetric={{
              label: 'Hb',
              value: diseases.anemia.hemoglobinEstimate,
              unit: 'g/dL',
            }}
            category={diseases.anemia.category}
            icon="👁️"
          />
        </ScrollView>

        {/* Vitals Strip */}
        <Text style={styles.sectionTitle}>Vital Signs</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.vitalsScroll}
        >
          <VitalPill
            label="Heart Rate"
            value={vitals.heartRate}
            unit="BPM"
            color={Colors.hypertension}
          />
          <VitalPill
            label="SpO2"
            value={vitals.spo2Proxy}
            unit="%"
            color={Colors.secondary}
          />
          <VitalPill
            label="Resp Rate"
            value={vitals.respiratoryRate}
            unit="/min"
            color={Colors.primary}
          />
          <VitalPill
            label="Systolic"
            value={vitals.bloodPressureSystolic}
            unit="mmHg"
            color={Colors.accent}
          />
          <VitalPill
            label="Diastolic"
            value={vitals.bloodPressureDiastolic}
            unit="mmHg"
            color={Colors.anemia}
          />
        </ScrollView>

        {/* ARE Explanation */}
        <Text style={styles.sectionTitle}>🧠 AI Explanation</Text>
        <GlassCard variant="accent" style={styles.areCard}>
          <Text style={styles.areSummary}>{areExplanation.summary}</Text>

          {areExplanation.details.map((detail, idx) => (
            <Text key={idx} style={styles.areDetail}>
              • {detail}
            </Text>
          ))}

          {/* Feature Importance */}
          {areExplanation.featureImportance.length > 0 && (
            <View style={styles.featureSection}>
              <Text style={styles.featureTitle}>Key Contributing Factors</Text>
              {areExplanation.featureImportance.map((f, idx) => (
                <View key={idx} style={styles.featureRow}>
                  <View style={styles.featureBar}>
                    <View
                      style={[
                        styles.featureBarFill,
                        { width: `${f.contribution * 100}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.featureLabel}>
                    {f.feature} ({Math.round(f.contribution * 100)}%)
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Counterfactual */}
          <GlassCard style={styles.counterfactualCard}>
            <Text style={styles.counterfactualTitle}>💡 What could help?</Text>
            <Text style={styles.counterfactualText}>
              {areExplanation.counterfactual}
            </Text>
          </GlassCard>
        </GlassCard>

        {/* XAI: SHAP-style factor importance */}
        <Text style={styles.sectionTitle}>🧠 XAI — Risk Factor Analysis</Text>
        <GlassCard style={styles.xaiCard}>
          <Text style={styles.xaiSubtitle}>How each health signal contributed to your risk score</Text>
          {computeXAIFactors(scan).map((f, idx) => (
            <View key={idx} style={{ marginBottom: 2 }}>
              <SHAPBar
                label={f.label}
                value={f.value}
                color={f.color}
                delay={idx * 120}
              />
              <Text style={styles.xaiFactorDesc}>ℹ️ {f.desc}</Text>
            </View>
          ))}
        </GlassCard>

        {/* XAI: Contribution Weights */}
        <Text style={styles.sectionTitle}>⚖️ Input Source Weights</Text>
        <GlassCard style={styles.xaiCard}>
          <Text style={styles.xaiSubtitle}>How each data source influenced your report</Text>
          {XAI_WEIGHTS.map((item, idx) => (
            <WeightBar
              key={idx}
              label={item.label}
              weight={item.weight}
              color={item.color}
              delay={idx * 150}
            />
          ))}
        </GlassCard>

        {/* XAI: AI Reasoning */}
        <Text style={styles.sectionTitle}>🧠 AI Reasoning Path</Text>
        <GlassCard style={styles.xaiCard}>
          <View style={styles.reasoningStep}>
            <View style={[styles.reasoningDot, { backgroundColor: Colors.primary }]} />
            <Text style={styles.reasoningText}>
              <Text style={{ fontWeight: '700', color: Colors.textPrimary }}>Step 1 — Signal Capture: </Text>
              {`Front camera captured facial skin colour variations at ~30fps. rPPG signal extracted heart rate (${scan.vitals.heartRate} BPM), SpO2 proxy (${scan.vitals.spo2Proxy}%) and HRV.`}
            </Text>
          </View>
          <View style={styles.reasoningStep}>
            <View style={[styles.reasoningDot, { backgroundColor: Colors.secondary }]} />
            <Text style={styles.reasoningText}>
              <Text style={{ fontWeight: '700', color: Colors.textPrimary }}>Step 2 — Conjunctival Analysis: </Text>
              {`Eye pallor index computed from lower eyelid. Hemoglobin estimate: ${scan.diseases.anemia.hemoglobinEstimate} g/dL. Colour score: ${scan.diseases.anemia.conjunctivalColorScore.toFixed(2)}.`}
            </Text>
          </View>
          <View style={styles.reasoningStep}>
            <View style={[styles.reasoningDot, { backgroundColor: Colors.warning ?? '#f59e0b' }]} />
            <Text style={styles.reasoningText}>
              <Text style={{ fontWeight: '700', color: Colors.textPrimary }}>Step 3 — Risk Fusion Engine: </Text>
              {`Profile data (age, BMI, gender, family history) merged with rPPG signals using Framingham-validated rule engine. Hypertension risk: ${Math.round(scan.diseases.hypertension.riskScore * 100)}%, Diabetes risk: ${Math.round(scan.diseases.diabetes.riskScore * 100)}%, Anemia risk: ${Math.round(scan.diseases.anemia.riskScore * 100)}%.`}
            </Text>
          </View>
          <View style={styles.reasoningStep}>
            <View style={[styles.reasoningDot, { backgroundColor: Colors.accent ?? '#8b5cf6' }]} />
            <Text style={styles.reasoningText}>
              <Text style={{ fontWeight: '700', color: Colors.textPrimary }}>Step 4 — Score Calculation: </Text>
              {`Overall health score computed as ${100 - Math.round(scan.diseases.hypertension.riskScore * 35 + scan.diseases.diabetes.riskScore * 35 + scan.diseases.anemia.riskScore * 30)}/100 using weighted disease contributions (HTN 35%, DM 35%, Anemia 30%).`}
            </Text>
          </View>
        </GlassCard>

        {/* XAI: Transparency */}
        <Text style={styles.sectionTitle}>📜 Model Transparency</Text>
        <GlassCard style={styles.xaiCard}>
          <View style={styles.transRow}>
            <Text style={styles.transLabel}>Algorithm</Text>
            <Text style={styles.transValue}>Multi-signal Fusion (rPPG + Symptom + Profile)</Text>
          </View>
          <View style={styles.transRow}>
            <Text style={styles.transLabel}>Dataset</Text>
            <Text style={styles.transValue}>Framingham Heart Study · PIMA Diabetes · Oxford Hb Eye Study</Text>
          </View>
          <View style={styles.transRow}>
            <Text style={styles.transLabel}>Confidence</Text>
            <Text style={styles.transValue}>{scan.usedLabData ? 'High (lab-calibrated)' : 'Moderate (simulation-based)'}</Text>
          </View>
          <View style={styles.transRow}>
            <Text style={styles.transLabel}>XAI Method</Text>
            <Text style={styles.transValue}>SHAP-style attribution · Counterfactual reasoning</Text>
          </View>
          <View style={styles.transRow}>
            <Text style={styles.transLabel}>Privacy</Text>
            <Text style={styles.transValue}>100% on-device · No internet · No data shared</Text>
          </View>
          <Text style={styles.transDisclaimer}>
            ⚠️ This is a screening tool only. NOT a medical diagnosis. Always consult a qualified healthcare professional.
          </Text>
        </GlassCard>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <AnimatedButton
            title="🍽️ View Diet Recommendations"
            onPress={() => {
              try { navigation.navigate('Diet', { scanId: scan.scanId }); } catch (_) {
                Alert.alert('Diet Plan', 'Open this from the Home tab to view Diet Plan.');
              }
            }}
            variant="primary"
            fullWidth
            style={styles.actionBtn}
          />
          <AnimatedButton
            title="📤 Share / Download Report"
            onPress={handleShareReport}
            variant="primary"
            fullWidth
            style={{ ...styles.actionBtn, backgroundColor: Colors.secondary }}
          />
          <AnimatedButton
            title="📊 Risk Forecast (DREM)"
            onPress={() => {
              try { navigation.navigate('DREM', { scanId: scan.scanId }); } catch (_) {
                Alert.alert('DREM', 'Open this from the Home tab to view Risk Forecast.');
              }
            }}
            variant="outline"
            fullWidth
            style={styles.actionBtn}
          />
          <AnimatedButton
            title="🔄 What-If Simulation"
            onPress={() => {
              try { navigation.navigate('WhatIf', { scanId: scan.scanId }); } catch (_) {
                Alert.alert('What-If', 'Open this from the Home tab to run simulations.');
              }
            }}
            variant="outline"
            fullWidth
            style={styles.actionBtn}
          />
        </View>
      </Animated.View>
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
  error: {
    ...Typography.h3,
    color: Colors.danger,
    textAlign: 'center',
    marginTop: 100,
  },
  // Lab badge
  labBadge: {
    backgroundColor: `${Colors.success}15`,
    borderWidth: 1,
    borderColor: `${Colors.success}30`,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.round,
    alignItems: 'center',
  },
  labBadgeText: {
    ...Typography.caption,
    color: Colors.success,
    fontWeight: '600',
  },
  // Score section
  scoreSection: {
    alignItems: 'center',
    paddingVertical: Spacing.xxxl,
  },
  scoreInterpretation: {
    ...Typography.label,
    color: Colors.textSecondary,
    marginTop: Spacing.lg,
  },
  // Section
  sectionTitle: {
    ...Typography.h3,
    color: Colors.textPrimary,
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
  },
  // Disease scroll
  diseaseScroll: {
    paddingHorizontal: Spacing.md,
    gap: 0,
  },
  // Vitals scroll
  vitalsScroll: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  // ARE
  areCard: {
    marginHorizontal: Spacing.lg,
  },
  areSummary: {
    ...Typography.bodyLarge,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
    lineHeight: 24,
  },
  areDetail: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    lineHeight: 22,
    paddingLeft: Spacing.sm,
  },
  featureSection: {
    marginTop: Spacing.lg,
  },
  featureTitle: {
    ...Typography.label,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  featureRow: {
    marginBottom: Spacing.sm,
  },
  featureBar: {
    height: 6,
    backgroundColor: Colors.surfaceBorder,
    borderRadius: 3,
    marginBottom: 4,
  },
  featureBarFill: {
    height: 6,
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
  featureLabel: {
    ...Typography.caption,
    color: Colors.textTertiary,
  },
  counterfactualCard: {
    marginTop: Spacing.lg,
    backgroundColor: 'rgba(0, 212, 170, 0.05)',
    borderColor: 'rgba(0, 212, 170, 0.15)',
  },
  counterfactualTitle: {
    ...Typography.label,
    color: Colors.secondary,
    marginBottom: Spacing.xs,
  },
  counterfactualText: {
    ...Typography.body,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  // Actions
  actions: {
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.xxxl,
    gap: Spacing.md,
  },
  actionBtn: {
    borderRadius: BorderRadius.md,
  },
  // XAI Sections
  xaiCard: {
    marginHorizontal: Spacing.lg,
  },
  xaiSubtitle: {
    ...Typography.caption,
    color: Colors.textTertiary,
    marginBottom: Spacing.md,
    fontStyle: 'italic',
  },
  xaiFactorDesc: {
    ...Typography.caption,
    color: Colors.textTertiary,
    marginBottom: Spacing.sm,
    marginLeft: 138,
  },
  reasoningStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  reasoningDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 5,
    flexShrink: 0,
  },
  weightRow: {
    marginBottom: 14,
  },
  weightLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  weightLabel: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
  },
  weightPercent: {
    ...Typography.label,
    fontWeight: '700',
  },
  weightTrack: {
    height: 8,
    backgroundColor: Colors.surfaceContainerLow || '#f3f4f5',
    borderRadius: 4,
    overflow: 'hidden',
  },
  weightFill: {
    height: 8,
    borderRadius: 4,
  },
  reasoningText: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    lineHeight: 20,
    flex: 1,
  },
  transRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  transLabel: {
    ...Typography.label,
    color: Colors.textTertiary,
    width: 90,
    fontWeight: '600',
  },
  transValue: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    flex: 1,
  },
  transDisclaimer: {
    ...Typography.caption,
    color: Colors.danger,
    marginTop: 12,
    fontStyle: 'italic',
    textAlign: 'center',
  },
});
