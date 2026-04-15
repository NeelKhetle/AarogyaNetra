/**
 * ArogyaNetra AI - Home Screen
 * Premium landing page with health overview and scan CTA
 */

import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { GlassCard, AnimatedButton, RiskGauge } from '../components/common';
import { Colors, Typography, Spacing, BorderRadius } from '../theme';
import { useAppStore } from '../store/useAppStore';
import type { HomeStackParamList } from '../models/types';

const { width } = Dimensions.get('window');

type NavProp = NativeStackNavigationProp<HomeStackParamList, 'Home'>;

// ─── Animated Pulse Ring ──────────────────────────────
const PulseRing: React.FC = () => {
  const scale1 = React.useRef(new Animated.Value(1)).current;
  const opacity1 = React.useRef(new Animated.Value(0.6)).current;
  const scale2 = React.useRef(new Animated.Value(1)).current;
  const opacity2 = React.useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const pulse1 = Animated.loop(
      Animated.parallel([
        Animated.timing(scale1, {
          toValue: 2.2,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(opacity1, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );

    const pulse2 = Animated.loop(
      Animated.parallel([
        Animated.timing(scale2, {
          toValue: 2.5,
          duration: 2500,
          useNativeDriver: true,
        }),
        Animated.timing(opacity2, {
          toValue: 0,
          duration: 2500,
          useNativeDriver: true,
        }),
      ])
    );

    pulse1.start();
    setTimeout(() => pulse2.start(), 500);

    return () => {
      pulse1.stop();
      pulse2.stop();
    };
  }, []);

  return (
    <View style={styles.pulseContainer}>
      <Animated.View
        style={[
          styles.pulseRing,
          { transform: [{ scale: scale1 }], opacity: opacity1 },
        ]}
      />
      <Animated.View
        style={[
          styles.pulseRing,
          styles.pulseRing2,
          { transform: [{ scale: scale2 }], opacity: opacity2 },
        ]}
      />
    </View>
  );
};

// ─── Feature Card ──────────────────────────────────────
const FeatureCard: React.FC<{
  icon: string;
  title: string;
  description: string;
  color: string;
}> = ({ icon, title, description, color }) => (
  <GlassCard style={styles.featureCard}>
    <View style={[styles.featureIcon, { backgroundColor: `${color}15` }]}>
      <Text style={styles.featureEmoji}>{icon}</Text>
    </View>
    <Text style={styles.featureTitle}>{title}</Text>
    <Text style={styles.featureDesc}>{description}</Text>
  </GlassCard>
);

// ─── Home Screen ───────────────────────────────────────
export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const { user, currentScan, scanHistory, initializeDefaultUser } = useAppStore();

  useEffect(() => {
    initializeDefaultUser();
  }, []);

  const lastScan = scanHistory[0];
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View style={{ opacity: fadeAnim }}>
        {/* Hero Section */}
        <View style={styles.hero}>
          <View style={styles.heroGlow} />
          <PulseRing />

          <View style={styles.heroContent}>
            <Text style={styles.appName}>🏥 AarogyaNetra</Text>
            <Text style={styles.tagline}>AI Health Screening</Text>
            <Text style={styles.subtitle}>
              Zero Hardware. Zero Needles.{'\n'}Complete Health Screening.
            </Text>
          </View>
        </View>

        {/* Quick Health Overview (if previous scan exists) */}
        {lastScan && (
          <GlassCard variant="accent" style={styles.overviewCard}>
            <Text style={styles.sectionTitle}>Last Scan Overview</Text>
            <View style={styles.overviewRow}>
              <View style={styles.overviewGauge}>
                <RiskGauge
                  score={lastScan.overallScore}
                  size={100}
                  strokeWidth={10}
                  label="Health"
                  color={
                    lastScan.overallScore >= 70 ? Colors.success :
                    lastScan.overallScore >= 50 ? Colors.warning : Colors.danger
                  }
                />
              </View>
              <View style={styles.overviewMini}>
                <View style={styles.miniRow}>
                  <View style={[styles.miniDot, { backgroundColor: Colors.hypertension }]} />
                  <Text style={styles.miniLabel}>Hypertension</Text>
                  <Text style={styles.miniValue}>
                    {Math.round(lastScan.hypertensionRisk * 100)}%
                  </Text>
                </View>
                <View style={styles.miniRow}>
                  <View style={[styles.miniDot, { backgroundColor: Colors.diabetes }]} />
                  <Text style={styles.miniLabel}>Diabetes</Text>
                  <Text style={styles.miniValue}>
                    {Math.round(lastScan.diabetesRisk * 100)}%
                  </Text>
                </View>
                <View style={styles.miniRow}>
                  <View style={[styles.miniDot, { backgroundColor: Colors.anemia }]} />
                  <Text style={styles.miniLabel}>Anemia</Text>
                  <Text style={styles.miniValue}>
                    {Math.round(lastScan.anemiaRisk * 100)}%
                  </Text>
                </View>
              </View>
            </View>
          </GlassCard>
        )}

        {/* Start Scan CTA */}
        <View style={styles.ctaContainer}>
          <AnimatedButton
            title="🔬  Start Health Scan"
            onPress={() => navigation.navigate('Scanner')}
            variant="primary"
            size="large"
            fullWidth
            style={styles.ctaButton}
          />
          <Text style={styles.ctaHint}>
            Takes ~30 seconds • Works offline
          </Text>
        </View>

        {/* Disease Cards */}
        <Text style={styles.sectionTitle}>What We Screen</Text>
        <View style={styles.diseaseGrid}>
          <GlassCard style={styles.diseaseCard}>
            <Text style={styles.diseaseEmoji}>❤️</Text>
            <Text style={[styles.diseaseName, { color: Colors.hypertension }]}>
              Hypertension
            </Text>
            <Text style={styles.diseaseDesc}>
              Blood pressure & cardiovascular risk via rPPG pulse analysis
            </Text>
          </GlassCard>

          <GlassCard style={styles.diseaseCard}>
            <Text style={styles.diseaseEmoji}>🩸</Text>
            <Text style={[styles.diseaseName, { color: Colors.diabetes }]}>
              Diabetes
            </Text>
            <Text style={styles.diseaseDesc}>
              HbA1c & glucose proxy through HRV depression index
            </Text>
          </GlassCard>

          <GlassCard style={styles.diseaseCard}>
            <Text style={styles.diseaseEmoji}>👁️</Text>
            <Text style={[styles.diseaseName, { color: Colors.anemia }]}>
              Anemia
            </Text>
            <Text style={styles.diseaseDesc}>
              Hemoglobin estimation via conjunctival pallor analysis
            </Text>
          </GlassCard>
        </View>

        {/* Feature Highlights */}
        <Text style={styles.sectionTitle}>Powered By</Text>
        <View style={styles.featureGrid}>
          <FeatureCard
            icon="📊"
            title="DREM"
            description="6-12 month risk trajectory prediction"
            color={Colors.primary}
          />
          <FeatureCard
            icon="🧠"
            title="ARE"
            description="Explainable AI with clinical reasoning"
            color={Colors.secondary}
          />
          <FeatureCard
            icon="🔄"
            title="What-If"
            description="Lifestyle simulation engine"
            color={Colors.accent}
          />
          <FeatureCard
            icon="📱"
            title="Offline"
            description="Works with zero network"
            color={Colors.success}
          />
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            ⚠️ Screening tool only — not a medical diagnosis
          </Text>
          <Text style={styles.footerVersion}>v1.0.0 • AarogyaNetra AI</Text>
        </View>
      </Animated.View>
    </ScrollView>
  );
};

// ─── Styles ────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingBottom: 100,
  },
  // Hero
  hero: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 20,
    overflow: 'hidden',
  },
  heroGlow: {
    position: 'absolute',
    top: -60,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: Colors.primary,
    opacity: 0.06,
  },
  heroContent: {
    alignItems: 'center',
    zIndex: 2,
  },
  appName: {
    ...Typography.h1,
    color: Colors.textPrimary,
    fontSize: 34,
    marginBottom: 4,
  },
  tagline: {
    ...Typography.h3,
    color: Colors.primary,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  pulseContainer: {
    position: 'absolute',
    top: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  pulseRing2: {
    borderColor: Colors.secondary,
  },
  // Overview
  overviewCard: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
  },
  overviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  overviewGauge: {
    marginRight: Spacing.xl,
  },
  overviewMini: {
    flex: 1,
    gap: Spacing.sm,
  },
  miniRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  miniDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: Spacing.sm,
  },
  miniLabel: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    flex: 1,
  },
  miniValue: {
    ...Typography.label,
    color: Colors.textPrimary,
  },
  // CTA
  ctaContainer: {
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.xxl,
    alignItems: 'center',
  },
  ctaButton: {
    paddingVertical: 18,
    borderRadius: BorderRadius.xl,
  },
  ctaHint: {
    ...Typography.caption,
    color: Colors.textTertiary,
    marginTop: Spacing.sm,
  },
  // Section
  sectionTitle: {
    ...Typography.h3,
    color: Colors.textPrimary,
    marginTop: Spacing.xxxl,
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  // Disease grid
  diseaseGrid: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  diseaseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  diseaseEmoji: {
    fontSize: 28,
    marginRight: Spacing.lg,
  },
  diseaseName: {
    ...Typography.label,
    fontSize: 15,
    marginBottom: 2,
  },
  diseaseDesc: {
    ...Typography.bodySmall,
    color: Colors.textTertiary,
    flex: 1,
  },
  // Feature grid
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  featureCard: {
    width: (width - Spacing.md * 2 - Spacing.sm) / 2 - Spacing.sm,
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  featureEmoji: {
    fontSize: 20,
  },
  featureTitle: {
    ...Typography.label,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  featureDesc: {
    ...Typography.caption,
    color: Colors.textTertiary,
    textAlign: 'center',
  },
  // Footer
  footer: {
    alignItems: 'center',
    marginTop: Spacing.huge,
    paddingHorizontal: Spacing.lg,
  },
  footerText: {
    ...Typography.bodySmall,
    color: Colors.warning,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  footerVersion: {
    ...Typography.caption,
    color: Colors.textTertiary,
  },
});
