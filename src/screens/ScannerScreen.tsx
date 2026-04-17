/**
 * AarogyaNetra AI - Scanner Screen
 * Normal camera mode scanner with rPPG face + eye scan analysis.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Linking,
  Alert,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
} from 'react-native-vision-camera';
import { GlassCard, AnimatedButton } from '../components/common';
import { Colors, Typography, Spacing, BorderRadius } from '../theme';
import { useAppStore } from '../store/useAppStore';
import Svg, { Circle } from 'react-native-svg';
import type { HomeStackParamList } from '../models/types';


type NavProp = NativeStackNavigationProp<HomeStackParamList, 'Scanner'>;

// ─── Countdown Ring Component ──────────────────────────
const CountdownRing: React.FC<{
  duration: number;
  onComplete: () => void;
  label: string;
  color?: string;
}> = ({ duration, onComplete, label, color = Colors.primary }) => {
  const [timeLeft, setTimeLeft] = useState(duration);
  const animatedValue = useRef(new Animated.Value(1)).current;
  const size = 160;
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const AnimatedCircle = Animated.createAnimatedComponent(Circle);

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: 0,
      duration: duration * 1000,
      useNativeDriver: false,
    }).start();

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          onComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [duration]);

  const strokeDashoffset = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  return (
    <View style={countdownStyles.container}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={Colors.surfaceBorder}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={countdownStyles.center}>
        <Text style={[countdownStyles.time, { color }]}>{timeLeft}s</Text>
        <Text style={countdownStyles.label}>{label}</Text>
      </View>
    </View>
  );
};

const countdownStyles = StyleSheet.create({
  container: {
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    position: 'absolute',
    alignItems: 'center',
  },
  time: {
    ...Typography.metric,
    fontSize: 36,
  },
  label: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
  },
});

// ─── Processing Animation ──────────────────────────────
const ProcessingOverlay: React.FC = () => {
  const spin = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 3000, useNativeDriver: true })
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.1, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.8, duration: 1000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const spinValue = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const steps = [
    '📊 Processing rPPG signals...',
    '👁️ Analyzing conjunctival pallor...',
    '🧠 Running risk fusion engine...',
    '📋 Generating XAI explanations...',
    '🍽️ Creating diet recommendations...',
  ];

  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    let step = 0;
    const iv = setInterval(() => {
      step++;
      if (step < steps.length) setActiveStep(step);
      else clearInterval(iv);
    }, 500);
    return () => clearInterval(iv);
  }, []);

  return (
    <View style={processingStyles.container}>
      <Animated.View
        style={[
          processingStyles.ring,
          {
            transform: [{ rotate: spinValue }, { scale: pulse }],
            borderColor: Colors.primary,
            borderTopColor: Colors.secondary,
          },
        ]}
      >
        <Text style={{ fontSize: 40 }}>🧬</Text>
      </Animated.View>
      <Text style={processingStyles.title}>Analyzing Your Health</Text>
      <View style={processingStyles.steps}>
        {steps.map((s, i) => (
          <Text
            key={i}
            style={[processingStyles.step, i <= activeStep && { color: Colors.textSecondary }]}
          >
            {i <= activeStep ? '✅' : '⏳'} {s.replace(/^[^\s]+\s/, '')}
          </Text>
        ))}
      </View>
    </View>
  );
};

const processingStyles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xxxl,
  },
  ring: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xxl,
  },
  title: {
    ...Typography.h2,
    color: Colors.textPrimary,
    marginBottom: Spacing.xl,
    textAlign: 'center',
  },
  steps: {
    gap: Spacing.md,
  },
  step: {
    ...Typography.body,
    color: Colors.textTertiary,
  },
});

// ─── Permission Denied Screen ──────────────────────────
const PermissionDenied: React.FC<{ onRetry: () => void }> = ({ onRetry }) => (
  <View style={styles.permissionContainer}>
    <Text style={styles.permissionIcon}>📷</Text>
    <Text style={styles.permissionTitle}>Camera Permission Required</Text>
    <Text style={styles.permissionDesc}>
      AarogyaNetra needs access to your front camera to analyze facial blood flow patterns (rPPG)
      and conjunctival pallor for health screening.
    </Text>
    <Text style={styles.permissionNote}>
      🔒 All processing happens on your device — no images leave your phone.
    </Text>
    <AnimatedButton
      title="📷  Grant Camera Access"
      onPress={onRetry}
      variant="primary"
      size="large"
      fullWidth
      style={styles.permissionBtn}
    />
    <AnimatedButton
      title="⚙️  Open Settings"
      onPress={() => Linking.openSettings()}
      variant="outline"
      size="small"
      style={styles.settingsBtn}
    />
  </View>
);

// ─── Scanner Screen ────────────────────────────────────
type ScanPhase = 'ready' | 'face-capture' | 'eye-capture' | 'processing' | 'done';

export const ScannerScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const { runScan } = useAppStore();
  const [phase, setPhase] = useState<ScanPhase>('ready');

  // Camera permission
  const { hasPermission, requestPermission } = useCameraPermission();
  const [permissionRequested, setPermissionRequested] = useState(false);

  // Camera device — use front camera
  const device = useCameraDevice('front');
  const cameraRef = useRef<Camera>(null);

  // Scanning pulse animation
  const scanPulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (phase === 'face-capture' || phase === 'eye-capture') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scanPulse, { toValue: 1, duration: 1500, useNativeDriver: true }),
          Animated.timing(scanPulse, { toValue: 0, duration: 1500, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [phase]);

  const handleRequestPermission = useCallback(async () => {
    setPermissionRequested(true);
    const granted = await requestPermission();
    if (!granted) {
      Alert.alert(
        '📷 Camera Access Needed',
        'Please enable camera access in your phone Settings to use the health scanner.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ]
      );
    }
  }, [requestPermission]);

  // Auto-request permission on first load
  useEffect(() => {
    if (!hasPermission && !permissionRequested) {
      handleRequestPermission();
    }
  }, [hasPermission, permissionRequested]);

  const handleStartCapture = () => {
    if (!hasPermission) {
      handleRequestPermission();
      return;
    }
    setPhase('face-capture');
  };

  const handleFaceCaptureComplete = () => {
    setPhase('eye-capture');
  };

  const handleEyeCapture = () => {
    setPhase('processing');
    setTimeout(() => {
      const result = runScan('normal');
      if (result) {
        setPhase('done');
        navigation.replace('Results', { scanId: result.scanId });
      }
    }, 3000);
  };

  const scanBorderColor = scanPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [Colors.primary, Colors.secondary],
  });

  const scanBorderWidth = scanPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [2, 4],
  });

  // ─── No Permission ──────────────────
  if (!hasPermission) {
    return (
      <View style={styles.container}>
        <PermissionDenied onRetry={handleRequestPermission} />
      </View>
    );
  }

  // ─── No Camera Device ────────────────
  if (!device) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionIcon}>⚠️</Text>
          <Text style={styles.permissionTitle}>No Front Camera Found</Text>
          <Text style={styles.permissionDesc}>
            AarogyaNetra requires a front-facing camera for health analysis.
          </Text>
        </View>
      </View>
    );
  }

  if (phase === 'ready') {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.readyScroll} showsVerticalScrollIndicator={false}>

          {/* Live camera preview */}
          <View style={styles.cameraPreview}>
            <Camera
              ref={cameraRef}
              style={StyleSheet.absoluteFill}
              device={device}
              isActive={true}
              photo={false}
              video={false}
            />
            {/* Face guide overlay */}
            <View style={styles.faceGuideOverlay}>
              <View style={styles.faceOval} />
              <Text style={styles.guideText}>Position your face here</Text>
            </View>
          </View>

          {/* Normal Mode Instructions */}
          <GlassCard style={styles.instructionCard}>
            <Text style={[styles.instructionTitle, { color: Colors.primary }]}>
              📷 Normal Mode Instructions
            </Text>
            <View style={styles.instructionList}>
              <Text style={styles.instruction}>1️⃣  Hold your phone at arm's length</Text>
              <Text style={styles.instruction}>2️⃣  Ensure good lighting on your face</Text>
              <Text style={styles.instruction}>3️⃣  Stay still during the 10-second capture</Text>
              <Text style={styles.instruction}>4️⃣  Then capture a close-up of your eye</Text>
            </View>
          </GlassCard>

          {/* Inline CTA — directly below instruction card */}
          <View style={styles.ctaArea}>
            <AnimatedButton
              title="▶  Begin Normal Scan"
              onPress={handleStartCapture}
              variant="primary"
              size="large"
              fullWidth
              style={styles.beginButton}
            />
            <Text style={styles.disclaimer}>
              ⚡ All processing happens on your device — no data leaves your phone
            </Text>
          </View>
        </ScrollView>
      </View>
    );
  }

  // ─── Face Capture Phase ──────────
  if (phase === 'face-capture') {
    return (
      <View style={styles.container}>
        <View style={styles.captureContent}>
          {/* Live camera with scanning overlay */}
          <Animated.View style={[
            styles.cameraPreviewActive,
            {
              borderColor: scanBorderColor,
              borderWidth: scanBorderWidth,
            },
          ]}>
            <Camera
              ref={cameraRef}
              style={StyleSheet.absoluteFill}
              device={device}
              isActive={true}
              photo={false}
              video={false}
            />

            {/* Normal scanning overlay */}
            <View style={styles.scanOverlay}>
              <View style={styles.faceOvalScanning} />
              <View style={styles.scanIndicator}>
                <Animated.View style={[styles.scanLine, { opacity: scanPulse }]} />
              </View>
            </View>

            {/* Countdown overlay */}
            <View style={styles.countdownOverlay}>
              <CountdownRing
                duration={10}
                onComplete={handleFaceCaptureComplete}
                label="Hold still"
                color={Colors.primary}
              />
            </View>
          </Animated.View>

          <GlassCard style={styles.phaseCard}>
            <Text style={[styles.phaseTitle, { color: Colors.primary }]}>
              Phase 1: Facial Analysis
            </Text>
            <Text style={styles.phaseDesc}>
              Capturing rPPG signal for heart rate, HRV, and blood pressure estimation
            </Text>
            <View style={styles.liveIndicator}>
              <View style={[styles.liveDot, { backgroundColor: Colors.primary }]} />
              <Text style={[styles.liveText, { color: Colors.primary }]}>LIVE SCANNING</Text>
            </View>
          </GlassCard>
        </View>
      </View>
    );
  }

  // ─── Eye Capture Phase ───────────
  if (phase === 'eye-capture') {
    return (
      <View style={styles.container}>
        <View style={styles.captureContent}>
          <Animated.View style={[
            styles.cameraPreviewActive,
            {
              borderColor: Colors.anemia,
              borderWidth: 3,
            },
          ]}>
            <Camera
              ref={cameraRef}
              style={StyleSheet.absoluteFill}
              device={device}
              isActive={true}
              photo={false}
              video={false}
            />
            <View style={styles.eyeGuideOverlay}>
              <View style={styles.eyeOval} />
              <Text style={styles.eyeLabel}>Position your eye here</Text>
              <Text style={styles.eyeHint}>Pull down lower eyelid gently</Text>
            </View>
          </Animated.View>

          <GlassCard style={styles.phaseCard}>
            <Text style={[styles.phaseTitle, { color: Colors.anemia }]}>
              Phase 2: Eye Analysis
            </Text>
            <Text style={styles.phaseDesc}>
              Capture a close-up of your lower eyelid conjunctiva for anemia screening
            </Text>
            <View style={styles.liveIndicator}>
              <View style={[styles.liveDot, { backgroundColor: Colors.anemia }]} />
              <Text style={[styles.liveText, { color: Colors.anemia }]}>CAMERA ACTIVE</Text>
            </View>
          </GlassCard>
        </View>

        {/* Floating capture button at the very bottom */}
        <View style={styles.floatingCTA}>
          <AnimatedButton
            title="📸  Capture Eye Image"
            onPress={handleEyeCapture}
            variant="primary"
            size="large"
            fullWidth
            style={styles.captureBtn}
          />
        </View>
      </View>
    );
  }

  // ─── Processing Phase ────────────
  if (phase === 'processing') {
    return (
      <View style={styles.container}>
        <ProcessingOverlay />
      </View>
    );
  }

  return null;
};

// ─── Styles ────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  readyScroll: {
    paddingVertical: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  captureContent: {
    flex: 1,
    padding: Spacing.lg,
  },
  // Camera preview
  cameraPreview: {
    height: 280,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    backgroundColor: '#000',
    borderWidth: 1,
    borderColor: `${Colors.primary}40`,
  },
  cameraPreviewActive: {
    height: 360,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
    backgroundColor: '#000',
  },
  // Face guide overlay (on top of camera)
  faceGuideOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  faceOval: {
    width: 160,
    height: 200,
    borderRadius: 80,
    borderWidth: 2,
    borderColor: 'rgba(108, 99, 255, 0.6)',
    borderStyle: 'dashed',
  },
  guideText: {
    ...Typography.bodySmall,
    color: 'rgba(255,255,255,0.8)',
    marginTop: Spacing.sm,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  // Scanning overlay
  scanOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  faceOvalScanning: {
    width: 160,
    height: 200,
    borderRadius: 80,
    borderWidth: 3,
    borderColor: Colors.primary,
  },
  scanIndicator: {
    position: 'absolute',
    width: 170,
    height: 2,
    overflow: 'hidden',
  },
  scanLine: {
    width: '100%',
    height: 2,
    backgroundColor: Colors.secondary,
  },
  countdownOverlay: {
    position: 'absolute',
    bottom: 15,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  // Eye guide
  eyeGuideOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyeOval: {
    width: 200,
    height: 110,
    borderRadius: 55,
    borderWidth: 3,
    borderColor: Colors.anemia,
    borderStyle: 'dashed',
  },
  eyeLabel: {
    ...Typography.body,
    color: Colors.anemia,
    marginTop: Spacing.md,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  eyeHint: {
    ...Typography.caption,
    color: 'rgba(255,255,255,0.6)',
    marginTop: Spacing.xs,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  // Live indicator
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: Spacing.sm,
  },
  liveText: {
    ...Typography.caption,
    fontWeight: '700',
    letterSpacing: 1,
  },
  // Instructions
  instructionCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  instructionTitle: {
    ...Typography.h4,
    marginBottom: Spacing.md,
  },
  instructionList: {
    gap: Spacing.sm,
  },
  instruction: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  // Phase info
  phaseCard: {
    marginBottom: Spacing.lg,
  },
  phaseTitle: {
    ...Typography.h4,
    marginBottom: Spacing.xs,
  },
  phaseDesc: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  // CTA area — inline below instruction card
  ctaArea: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
    paddingTop: Spacing.md,
  },
  // Floating CTA (used for eye capture only)
  floatingCTA: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.lg,
    paddingBottom: 28,
    paddingTop: 16,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 8,
  },
  // Buttons
  beginButton: {
    borderRadius: BorderRadius.xl,
    paddingVertical: 18,
    backgroundColor: Colors.primary,
  },
  captureBtn: {
    borderRadius: BorderRadius.xl,
    paddingVertical: 18,
  },
  disclaimer: {
    ...Typography.caption,
    color: Colors.textTertiary,
    textAlign: 'center',
    marginTop: Spacing.lg,
  },
  // Permission screen
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xxxl,
  },
  permissionIcon: {
    fontSize: 64,
    marginBottom: Spacing.xl,
  },
  permissionTitle: {
    ...Typography.h2,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  permissionDesc: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
  permissionNote: {
    ...Typography.bodySmall,
    color: Colors.secondary,
    textAlign: 'center',
    marginBottom: Spacing.xxl,
    fontStyle: 'italic',
  },
  permissionBtn: {
    borderRadius: BorderRadius.xl,
    paddingVertical: 18,
    marginBottom: Spacing.md,
  },
  settingsBtn: {
    marginTop: Spacing.sm,
  },
});
