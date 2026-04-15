/**
 * ArogyaNetra AI - Diet Recommendation Screen
 * Personalized Indian diet plan based on scan results
 * With downloadable report functionality
 */

import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Share,
  Alert,
} from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { GlassCard, AnimatedButton } from '../components/common';
import { Colors, Typography, Spacing, BorderRadius } from '../theme';
import { useAppStore } from '../store/useAppStore';
import type { HomeStackParamList, DietRecommendation, DietPlan } from '../models/types';

type RoutePropType = RouteProp<HomeStackParamList, 'Diet'>;

// ─── Diet Card Component ────────────────────────────────
const DietCard: React.FC<{
  recommendation: DietRecommendation;
}> = ({ recommendation }) => (
  <GlassCard style={cardStyles.container}>
    <View style={cardStyles.header}>
      <Text style={cardStyles.icon}>{recommendation.icon}</Text>
      <View style={cardStyles.headerText}>
        <Text style={cardStyles.title}>{recommendation.title}</Text>
        <Text style={cardStyles.category}>{recommendation.category}</Text>
      </View>
    </View>

    <Text style={cardStyles.description}>{recommendation.description}</Text>

    {/* Recommended Foods */}
    <View style={cardStyles.section}>
      <Text style={cardStyles.sectionTitle}>✅ Recommended Foods</Text>
      {recommendation.foods.map((food, idx) => (
        <Text key={idx} style={cardStyles.foodItem}>• {food}</Text>
      ))}
    </View>

    {/* Foods to Avoid */}
    <View style={cardStyles.section}>
      <Text style={[cardStyles.sectionTitle, { color: Colors.danger }]}>❌ Foods to Avoid</Text>
      {recommendation.avoid.map((food, idx) => (
        <Text key={idx} style={[cardStyles.foodItem, { color: Colors.textTertiary }]}>• {food}</Text>
      ))}
    </View>

    {/* Meal Plan */}
    {recommendation.mealPlan && (
      <View style={cardStyles.mealPlanContainer}>
        <Text style={cardStyles.mealPlanTitle}>🍽️ Sample Daily Meal Plan</Text>
        
        <View style={cardStyles.mealRow}>
          <View style={[cardStyles.mealBadge, { backgroundColor: '#FF9E4315' }]}>
            <Text style={cardStyles.mealBadgeText}>🌅</Text>
          </View>
          <View style={cardStyles.mealContent}>
            <Text style={cardStyles.mealTime}>Breakfast</Text>
            <Text style={cardStyles.mealDesc}>{recommendation.mealPlan.breakfast}</Text>
          </View>
        </View>

        <View style={cardStyles.mealRow}>
          <View style={[cardStyles.mealBadge, { backgroundColor: '#FFD74015' }]}>
            <Text style={cardStyles.mealBadgeText}>☀️</Text>
          </View>
          <View style={cardStyles.mealContent}>
            <Text style={cardStyles.mealTime}>Lunch</Text>
            <Text style={cardStyles.mealDesc}>{recommendation.mealPlan.lunch}</Text>
          </View>
        </View>

        <View style={cardStyles.mealRow}>
          <View style={[cardStyles.mealBadge, { backgroundColor: '#6C63FF15' }]}>
            <Text style={cardStyles.mealBadgeText}>🌙</Text>
          </View>
          <View style={cardStyles.mealContent}>
            <Text style={cardStyles.mealTime}>Dinner</Text>
            <Text style={cardStyles.mealDesc}>{recommendation.mealPlan.dinner}</Text>
          </View>
        </View>

        <View style={cardStyles.mealRow}>
          <View style={[cardStyles.mealBadge, { backgroundColor: '#00D4AA15' }]}>
            <Text style={cardStyles.mealBadgeText}>🥜</Text>
          </View>
          <View style={cardStyles.mealContent}>
            <Text style={cardStyles.mealTime}>Snacks</Text>
            <Text style={cardStyles.mealDesc}>{recommendation.mealPlan.snacks}</Text>
          </View>
        </View>
      </View>
    )}
  </GlassCard>
);

const cardStyles = StyleSheet.create({
  container: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  icon: {
    fontSize: 28,
    marginRight: Spacing.md,
  },
  headerText: {
    flex: 1,
  },
  title: {
    ...Typography.h4,
    color: Colors.textPrimary,
  },
  category: {
    ...Typography.caption,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  description: {
    ...Typography.body,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    ...Typography.label,
    color: Colors.success,
    marginBottom: Spacing.sm,
  },
  foodItem: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginBottom: 4,
    paddingLeft: Spacing.sm,
    lineHeight: 22,
  },
  mealPlanContainer: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  mealPlanTitle: {
    ...Typography.label,
    color: Colors.primary,
    marginBottom: Spacing.md,
  },
  mealRow: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
  },
  mealBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  mealBadgeText: {
    fontSize: 16,
  },
  mealContent: {
    flex: 1,
  },
  mealTime: {
    ...Typography.label,
    color: Colors.textPrimary,
    marginBottom: 2,
    fontSize: 12,
  },
  mealDesc: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
});

// ─── Report Generator (Shareable Text) ──────────────────
function generateShareableReport(
  scan: any,
  dietPlan: DietPlan,
  user: any,
): string {
  const date = new Date(scan.timestamp).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  let report = `
═══════════════════════════════════
   🏥 AAROGYANETRA AI
   Health Screening Report
═══════════════════════════════════

📅 Date: ${date}
👤 Name: ${user?.name || 'User'}
🔢 Age: ${user?.age || 'N/A'} | Gender: ${user?.gender || 'N/A'}
📊 Scan ID: ${scan.scanId}
${scan.usedLabData ? '✅ Lab Report Data Used' : '⚠️ Simulated Analysis'}

───────────────────────────────────
   OVERALL HEALTH SCORE: ${scan.overallHealthScore}/100
───────────────────────────────────

━━━ VITAL SIGNS ━━━
❤️ Heart Rate: ${scan.vitals.heartRate} BPM
🫁 Respiratory Rate: ${scan.vitals.respiratoryRate} /min
💉 SpO2: ${scan.vitals.spo2Proxy}%
🩺 Blood Pressure: ${scan.vitals.bloodPressureSystolic}/${scan.vitals.bloodPressureDiastolic} mmHg

━━━ DISEASE RISK ANALYSIS ━━━

❤️ HYPERTENSION
   Risk: ${scan.diseases.hypertension.riskLevel.toUpperCase()} (${Math.round(scan.diseases.hypertension.riskScore * 100)}%)
   BP: ${scan.diseases.hypertension.systolicEstimate}/${scan.diseases.hypertension.diastolicEstimate} mmHg
   Category: ${scan.diseases.hypertension.category}
   Confidence: ${Math.round(scan.diseases.hypertension.confidence * 100)}%

🩸 DIABETES
   Risk: ${scan.diseases.diabetes.riskLevel.toUpperCase()} (${Math.round(scan.diseases.diabetes.riskScore * 100)}%)
   HbA1c Proxy: ${scan.diseases.diabetes.hba1cProxy}%
   Fasting Glucose: ${scan.diseases.diabetes.fastingGlucoseProxy} mg/dL
   Category: ${scan.diseases.diabetes.category}
   Confidence: ${Math.round(scan.diseases.diabetes.confidence * 100)}%

👁️ ANEMIA
   Risk: ${scan.diseases.anemia.riskLevel.toUpperCase()} (${Math.round(scan.diseases.anemia.riskScore * 100)}%)
   Hemoglobin: ${scan.diseases.anemia.hemoglobinEstimate} g/dL
   Category: ${scan.diseases.anemia.category}
   Confidence: ${Math.round(scan.diseases.anemia.confidence * 100)}%

━━━ AI EXPLANATION ━━━
${scan.areExplanation.summary}

${scan.areExplanation.details.map((d: string) => `• ${d}`).join('\n')}

💡 Recommendation: ${scan.areExplanation.counterfactual}

━━━ DIET RECOMMENDATIONS ━━━
${dietPlan.overallAdvice}

📊 Daily Calories: ~${dietPlan.dailyCalories} kcal
💧 Water Intake: ${dietPlan.waterIntake}
🏃 Exercise: ${dietPlan.exerciseAdvice}

${dietPlan.recommendations.map(r => `
${r.icon} ${r.title}
${r.description}
Eat: ${r.foods.slice(0, 4).join(', ')}
Avoid: ${r.avoid.slice(0, 3).join(', ')}
${r.mealPlan ? `
  Breakfast: ${r.mealPlan.breakfast}
  Lunch: ${r.mealPlan.lunch}
  Dinner: ${r.mealPlan.dinner}` : ''}
`).join('\n')}

───────────────────────────────────
⚠️ DISCLAIMER: This is a screening
tool only. Not a medical diagnosis.
Always consult a qualified doctor.
───────────────────────────────────
Generated by AarogyaNetra AI v1.0
🇮🇳 Made in India
`;

  return report.trim();
}

// ─── Diet Screen ────────────────────────────────────────
export const DietScreen: React.FC = () => {
  const route = useRoute<RoutePropType>();
  const { getStoredScan, currentScan, user } = useAppStore();

  const scan = getStoredScan(route.params.scanId) || currentScan;

  if (!scan || !scan.dietPlan) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.emptyIcon}>🍽️</Text>
          <Text style={styles.emptyTitle}>No Diet Plan Available</Text>
          <Text style={styles.emptyDesc}>
            Complete a health scan first to get personalized diet recommendations.
          </Text>
        </View>
      </View>
    );
  }

  const dietPlan = scan.dietPlan;

  const handleShareReport = async () => {
    try {
      const report = generateShareableReport(scan, dietPlan, user);
      await Share.share({
        message: report,
        title: 'AarogyaNetra Health Report',
      });
    } catch (err) {
      Alert.alert('Error', 'Failed to share report. Please try again.');
    }
  };

  const handleDownloadReport = () => {
    const report = generateShareableReport(scan, dietPlan, user);
    // On React Native, Share is the primary way to "download"
    // The user can save to Notes, WhatsApp, Email, etc.
    Alert.alert(
      '📥 Download Report',
      'Use the Share button to send this report to WhatsApp, Email, save as PDF, or print it.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Share Now', onPress: handleShareReport },
      ]
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <Text style={styles.title}>🍽️ Your Diet Plan</Text>
      <Text style={styles.subtitle}>
        Personalized recommendations based on your health scan
      </Text>

      {/* Overall Advice */}
      <GlassCard variant="accent" style={styles.overviewCard}>
        <Text style={styles.overviewTitle}>📋 Overview</Text>
        <Text style={styles.overviewText}>{dietPlan.overallAdvice}</Text>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>~{dietPlan.dailyCalories}</Text>
            <Text style={styles.statLabel}>kcal/day</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{dietPlan.waterIntake.split('(')[0].trim()}</Text>
            <Text style={styles.statLabel}>Water</Text>
          </View>
        </View>
      </GlassCard>

      {/* Exercise Advice */}
      <GlassCard style={styles.exerciseCard}>
        <Text style={styles.exerciseTitle}>🏃 Exercise Advice</Text>
        <Text style={styles.exerciseText}>{dietPlan.exerciseAdvice}</Text>
      </GlassCard>

      {/* Diet Categories */}
      <Text style={styles.sectionHeader}>🥗 Dietary Recommendations</Text>
      {dietPlan.recommendations.map((rec, idx) => (
        <DietCard key={idx} recommendation={rec} />
      ))}

      {/* Download / Share Report */}
      <GlassCard style={styles.downloadCard}>
        <Text style={styles.downloadTitle}>📥 Get Your Report</Text>
        <Text style={styles.downloadDesc}>
          Download your complete health + diet report to share with your doctor
        </Text>

        <View style={styles.downloadButtons}>
          <AnimatedButton
            title="📤  Share Report"
            onPress={handleShareReport}
            variant="primary"
            size="large"
            fullWidth
            style={styles.downloadBtn}
          />
          <AnimatedButton
            title="📥  Download Report"
            onPress={handleDownloadReport}
            variant="outline"
            size="large"
            fullWidth
            style={styles.downloadBtn}
          />
        </View>
      </GlassCard>

      {/* Disclaimer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          ⚠️ These are general dietary guidelines based on ICMR recommendations. 
          Consult a registered dietician or your doctor for personalized medical nutrition therapy.
        </Text>
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
  // Overview
  overviewCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  overviewTitle: {
    ...Typography.h4,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  overviewText: {
    ...Typography.body,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  statValue: {
    ...Typography.h3,
    color: Colors.primary,
  },
  statLabel: {
    ...Typography.caption,
    color: Colors.textTertiary,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.surfaceBorder,
  },
  // Exercise
  exerciseCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  exerciseTitle: {
    ...Typography.label,
    color: Colors.success,
    marginBottom: Spacing.sm,
  },
  exerciseText: {
    ...Typography.body,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  // Section
  sectionHeader: {
    ...Typography.h3,
    color: Colors.textPrimary,
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
  },
  // Download
  downloadCard: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
  },
  downloadTitle: {
    ...Typography.h4,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  downloadDesc: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
    lineHeight: 22,
  },
  downloadButtons: {
    gap: Spacing.sm,
  },
  downloadBtn: {
    borderRadius: BorderRadius.xl,
  },
  // Footer
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xxxl,
  },
  footerText: {
    ...Typography.caption,
    color: Colors.textTertiary,
    textAlign: 'center',
    lineHeight: 18,
    fontStyle: 'italic',
  },
  // Empty
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xxxl,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    ...Typography.h3,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  emptyDesc: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
