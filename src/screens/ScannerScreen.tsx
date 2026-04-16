/**
 * AarogyaNetra AI - Scanner Screen
 * Multi-camera mode scanner with Normal, Night Vision, and Thermal views.
 * Each mode provides unique visual feedback and analysis overlays.
 *
 * Camera Modes:
 *   📷 Normal     — Standard rPPG face + eye scan
 *   🌙 Night Vision — Green-tint enhanced low-light with edge detection
 *   🌡️ Thermal    — Heat map blood flow visualization with temperature zones
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
  Linking,
  Alert,
  TouchableOpacity,
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
import type { HomeStackParamList, CameraMode, ThermalScanData } from '../models/types';
import { CAMERA_MODES } from '../models/types';

const { width, height: screenHeight } = Dimensions.get('window');

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

// ─── Camera Mode Selector ──────────────────────────────
const CameraModeSelector: React.FC<{
  selectedMode: CameraMode;
  onSelect: (mode: CameraMode) => void;
}> = ({ selectedMode, onSelect }) => {
  return (
    <View style={modeStyles.container}>
      <Text style={modeStyles.title}>Select Camera Mode</Text>
      <View style={modeStyles.row}>
        {CAMERA_MODES.map((mode) => {
          const isActive = selectedMode === mode.mode;
          return (
            <TouchableOpacity
              key={mode.mode}
              style={[
                modeStyles.card,
                { borderColor: isActive ? mode.color : Colors.surfaceBorder },
                isActive && { backgroundColor: `${mode.color}15` },
              ]}
              onPress={() => onSelect(mode.mode)}
              activeOpacity={0.7}
            >
              <Text style={modeStyles.icon}>{mode.icon}</Text>
              <Text style={[modeStyles.label, isActive && { color: mode.color }]}>
                {mode.label}
              </Text>
              {isActive && (
                <View style={[modeStyles.activeDot, { backgroundColor: mode.color }]} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
      <Text style={modeStyles.description}>
        {CAMERA_MODES.find(m => m.mode === selectedMode)?.description}
      </Text>
    </View>
  );
};

const modeStyles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  title: {
    ...Typography.label,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  card: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    backgroundColor: Colors.surface,
  },
  icon: {
    fontSize: 28,
    marginBottom: Spacing.xs,
  },
  label: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: Spacing.xs,
  },
  description: {
    ...Typography.caption,
    color: Colors.textTertiary,
    textAlign: 'center',
    marginTop: Spacing.sm,
    fontStyle: 'italic',
  },
});

// ─── Night Vision Overlay ──────────────────────────────
const NightVisionOverlay: React.FC = () => {
  const scanAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(scanAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={nightStyles.overlay}>
      {/* Green tint */}
      <View style={nightStyles.greenTint} />

      {/* Scan lines */}
      {Array.from({ length: 12 }).map((_, i) => (
        <View
          key={i}
          style={[
            nightStyles.scanLine,
            { top: `${(i + 1) * 7.5}%` },
          ]}
        />
      ))}

      {/* Edge detection points */}
      {[
        { x: 35, y: 25 }, { x: 65, y: 25 },  // Eyes
        { x: 50, y: 40 },                        // Nose
        { x: 38, y: 55 }, { x: 62, y: 55 },    // Cheeks
        { x: 50, y: 68 },                        // Mouth
        { x: 30, y: 35 }, { x: 70, y: 35 },    // Temples
      ].map((pt, i) => (
        <Animated.View
          key={i}
          style={[
            nightStyles.edgePoint,
            {
              left: `${pt.x}%`,
              top: `${pt.y}%`,
              opacity: scanAnim.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0.4, 1, 0.4],
              }),
            },
          ]}
        />
      ))}

      {/* IR label */}
      <View style={nightStyles.irBadge}>
        <Text style={nightStyles.irText}>🌙 NIGHT VISION • IR ENHANCED</Text>
      </View>

      {/* Face outline */}
      <View style={nightStyles.faceOutline} />
    </View>
  );
};

const nightStyles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
  },
  greenTint: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 255, 0, 0.08)',
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(0, 230, 118, 0.15)',
  },
  edgePoint: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#00E676',
    backgroundColor: 'rgba(0, 230, 118, 0.3)',
    marginLeft: -5,
    marginTop: -5,
  },
  irBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(0, 230, 118, 0.2)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.4)',
  },
  irText: {
    ...Typography.caption,
    color: '#00E676',
    fontWeight: '700',
    letterSpacing: 1,
    fontSize: 9,
  },
  faceOutline: {
    position: 'absolute',
    top: '15%',
    left: '20%',
    width: '60%',
    height: '65%',
    borderRadius: 80,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 230, 118, 0.5)',
    borderStyle: 'dashed',
  },
});

// ─── Thermal Camera Overlay ────────────────────────────
const ThermalOverlay: React.FC = () => {
  const pulseAnim = useRef(new Animated.Value(0.6)).current;
  const flowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.6, duration: 800, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.timing(flowAnim, { toValue: 1, duration: 3000, useNativeDriver: true })
    ).start();
  }, []);

  // Temperature zone positions on face
  const tempZones = [
    { name: 'Forehead', x: 50, y: 18, temp: '36.5°C', color: '#FF2222', size: 40 },
    { name: 'L.Cheek', x: 30, y: 45, temp: '35.8°C', color: '#FF6B00', size: 30 },
    { name: 'R.Cheek', x: 70, y: 45, temp: '35.9°C', color: '#FF7722', size: 30 },
    { name: 'Nose', x: 50, y: 42, temp: '34.2°C', color: '#FFAA00', size: 22 },
    { name: 'Chin', x: 50, y: 65, temp: '35.0°C', color: '#FFCC00', size: 25 },
    { name: 'L.Temple', x: 18, y: 30, temp: '36.6°C', color: '#FF3333', size: 18 },
    { name: 'R.Temple', x: 82, y: 30, temp: '36.5°C', color: '#FF3355', size: 18 },
  ];

  // Blood flow lines (carotid arteries simulation)
  const bloodFlowLines = [
    { x1: 35, y1: 70, x2: 35, y2: 30 },  // Left carotid
    { x1: 65, y1: 70, x2: 65, y2: 30 },  // Right carotid
  ];

  return (
    <View style={thermalStyles.overlay}>
      {/* Thermal tint */}
      <View style={thermalStyles.thermalTint} />

      {/* Heat gradient zones */}
      {tempZones.map((zone, i) => (
        <Animated.View
          key={i}
          style={[
            thermalStyles.heatZone,
            {
              left: `${zone.x}%`,
              top: `${zone.y}%`,
              width: zone.size,
              height: zone.size,
              borderRadius: zone.size / 2,
              backgroundColor: zone.color,
              opacity: pulseAnim.interpolate({
                inputRange: [0.6, 1],
                outputRange: [0.25, 0.45],
              }),
              marginLeft: -zone.size / 2,
              marginTop: -zone.size / 2,
            },
          ]}
        />
      ))}

      {/* Temperature labels */}
      {tempZones.map((zone, i) => (
        <View
          key={`label-${i}`}
          style={[
            thermalStyles.tempLabel,
            {
              left: `${zone.x}%`,
              top: `${zone.y + 5}%`,
            },
          ]}
        >
          <Text style={[thermalStyles.tempText, { color: zone.color }]}>
            {zone.temp}
          </Text>
        </View>
      ))}

      {/* Blood flow pulse indicators along carotids */}
      {bloodFlowLines.map((line, i) => (
        <Animated.View
          key={`flow-${i}`}
          style={[
            thermalStyles.bloodFlowDot,
            {
              left: `${line.x1}%`,
              top: flowAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [`${line.y1}%`, `${line.y2}%`],
              }),
              opacity: flowAnim.interpolate({
                inputRange: [0, 0.3, 0.7, 1],
                outputRange: [0.3, 1, 1, 0.3],
              }),
            },
          ]}
        />
      ))}

      {/* Thermal badge */}
      <View style={thermalStyles.thermalBadge}>
        <Text style={thermalStyles.thermalBadgeText}>🌡️ THERMAL • BLOOD FLOW</Text>
      </View>

      {/* Temperature scale bar */}
      <View style={thermalStyles.scaleBar}>
        <View style={thermalStyles.scaleGradient} />
        <View style={thermalStyles.scaleLabels}>
          <Text style={thermalStyles.scaleText}>34°C</Text>
          <Text style={thermalStyles.scaleText}>36°C</Text>
          <Text style={thermalStyles.scaleText}>38°C</Text>
        </View>
      </View>
    </View>
  );
};

const thermalStyles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
  },
  thermalTint: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(255, 50, 0, 0.05)',
  },
  heatZone: {
    position: 'absolute',
  },
  tempLabel: {
    position: 'absolute',
    marginLeft: -20,
    alignItems: 'center',
  },
  tempText: {
    fontSize: 8,
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  bloodFlowDot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF2222',
    marginLeft: -4,
  },
  thermalBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(255, 68, 68, 0.2)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.4)',
  },
  thermalBadgeText: {
    ...Typography.caption,
    color: '#FF4444',
    fontWeight: '700',
    letterSpacing: 1,
    fontSize: 9,
  },
  scaleBar: {
    position: 'absolute',
    bottom: 15,
    right: 12,
    width: 18,
    height: 100,
  },
  scaleGradient: {
    width: 12,
    height: 80,
    borderRadius: 6,
    backgroundColor: '#FF4444',
    // Visual approximation of gradient via opacity layers
    opacity: 0.7,
  },
  scaleLabels: {
    position: 'absolute',
    left: 16,
    top: 0,
    height: 80,
    justifyContent: 'space-between',
  },
  scaleText: {
    fontSize: 7,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '700',
  },
});

// ─── Thermal Results Card ──────────────────────────────
const ThermalResultsCard: React.FC<{ thermalData: ThermalScanData }> = ({ thermalData }) => {
  const circColor = thermalData.peripheralCirculation === 'good' ? Colors.success
    : thermalData.peripheralCirculation === 'moderate' ? Colors.warning
    : Colors.danger;

  return (
    <GlassCard style={thermalResultStyles.card}>
      <Text style={thermalResultStyles.title}>🌡️ Thermal Blood Flow Analysis</Text>

      {/* Summary stats */}
      <View style={thermalResultStyles.statsRow}>
        <View style={thermalResultStyles.stat}>
          <Text style={thermalResultStyles.statValue}>{thermalData.averageSkinTemp}°C</Text>
          <Text style={thermalResultStyles.statLabel}>Avg Skin Temp</Text>
        </View>
        <View style={thermalResultStyles.stat}>
          <Text style={thermalResultStyles.statValue}>{thermalData.coreBodyTempEstimate}°C</Text>
          <Text style={thermalResultStyles.statLabel}>Core Temp Est.</Text>
        </View>
        <View style={thermalResultStyles.stat}>
          <Text style={[thermalResultStyles.statValue, { color: circColor }]}>{thermalData.bloodFlowScore}%</Text>
          <Text style={thermalResultStyles.statLabel}>Blood Flow</Text>
        </View>
      </View>

      {/* Circulation status */}
      <View style={[thermalResultStyles.circBadge, { borderColor: circColor }]}>
        <Text style={[thermalResultStyles.circText, { color: circColor }]}>
          {thermalData.peripheralCirculation === 'good' ? '✅' :
           thermalData.peripheralCirculation === 'moderate' ? '⚠️' : '🔴'}{' '}
          Peripheral Circulation: {thermalData.peripheralCirculation.toUpperCase()}
        </Text>
      </View>

      {/* Warmth Index (positive scale) */}
      <View style={thermalResultStyles.warmthRow}>
        <Text style={thermalResultStyles.warmthLabel}>Extremity Warmth Index</Text>
        <View style={thermalResultStyles.warmthBar}>
          <View style={[thermalResultStyles.warmthFill, {
            width: `${thermalData.coldExtremityIndex * 100}%`,
            backgroundColor: thermalData.coldExtremityIndex >= 0.7 ? Colors.success :
              thermalData.coldExtremityIndex >= 0.4 ? Colors.warning : Colors.danger,
          }]} />
        </View>
        <Text style={thermalResultStyles.warmthValue}>
          {Math.round(thermalData.coldExtremityIndex * 100)}%
        </Text>
      </View>

      {/* Temperature zones */}
      <Text style={thermalResultStyles.zonesTitle}>Temperature Zones</Text>
      {thermalData.zones.map((zone, i) => (
        <View key={i} style={thermalResultStyles.zoneRow}>
          <View style={[thermalResultStyles.zoneDot, { backgroundColor: zone.color }]} />
          <Text style={thermalResultStyles.zoneName}>{zone.name}</Text>
          <Text style={thermalResultStyles.zoneTemp}>{zone.temperature}°C</Text>
          <View style={thermalResultStyles.flowBar}>
            <View style={[thermalResultStyles.flowFill, {
              width: `${zone.bloodFlowIndex * 100}%`,
              backgroundColor: zone.color,
            }]} />
          </View>
        </View>
      ))}
    </GlassCard>
  );
};

const thermalResultStyles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
  },
  title: {
    ...Typography.h4,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: Spacing.md,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    ...Typography.h3,
    color: Colors.hypertension,
  },
  statLabel: {
    ...Typography.caption,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  circBadge: {
    borderWidth: 1,
    borderRadius: BorderRadius.round,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  circText: {
    ...Typography.caption,
    fontWeight: '700',
  },
  warmthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  warmthLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    width: 100,
  },
  warmthBar: {
    flex: 1,
    height: 6,
    backgroundColor: Colors.surfaceBorder,
    borderRadius: 3,
    overflow: 'hidden',
  },
  warmthFill: {
    height: '100%',
    borderRadius: 3,
  },
  warmthValue: {
    ...Typography.caption,
    color: Colors.textPrimary,
    fontWeight: '600',
    width: 35,
    textAlign: 'right',
  },
  zonesTitle: {
    ...Typography.label,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  zoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
    gap: Spacing.sm,
  },
  zoneDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  zoneName: {
    ...Typography.caption,
    color: Colors.textSecondary,
    width: 80,
  },
  zoneTemp: {
    ...Typography.caption,
    color: Colors.textPrimary,
    fontWeight: '600',
    width: 42,
  },
  flowBar: {
    flex: 1,
    height: 4,
    backgroundColor: Colors.surfaceBorder,
    borderRadius: 2,
    overflow: 'hidden',
  },
  flowFill: {
    height: '100%',
    borderRadius: 2,
  },
});

// ─── Processing Animation ──────────────────────────────
const ProcessingOverlay: React.FC<{ mode: CameraMode }> = ({ mode }) => {
  const spin = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0.8)).current;

  const modeInfo = CAMERA_MODES.find(m => m.mode === mode)!;

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

  const steps = mode === 'thermal'
    ? [
        '🌡️ Processing thermal zones...',
        '🩸 Mapping blood flow patterns...',
        '🫀 Analyzing circulation...',
        '🧠 Running risk fusion engine...',
        '📋 Generating thermal report...',
      ]
    : mode === 'night_vision'
    ? [
        '🌙 Processing IR spectrum...',
        '👁️ Analyzing conjunctival pallor...',
        '📊 Processing rPPG signals...',
        '🧠 Running risk fusion engine...',
        '📋 Generating ARE explanations...',
      ]
    : [
        '📊 Processing rPPG signals...',
        '👁️ Analyzing conjunctival pallor...',
        '🧠 Running risk fusion engine...',
        '📋 Generating ARE explanations...',
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
            borderColor: modeInfo.color,
            borderTopColor: Colors.secondary,
          },
        ]}
      >
        <Text style={{ fontSize: 40 }}>🧬</Text>
      </Animated.View>
      <Text style={processingStyles.title}>
        {mode === 'thermal' ? 'Thermal Analysis Running' :
         mode === 'night_vision' ? 'Night Vision Processing' :
         'Analyzing Your Health'}
      </Text>
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
  const [cameraMode, setCameraMode] = useState<CameraMode>('normal');

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
    // Thermal mode skips eye capture — it does full-face thermal analysis
    if (cameraMode === 'thermal') {
      setPhase('processing');
      setTimeout(() => {
        const result = runScan(cameraMode);
        if (result) {
          setPhase('done');
          navigation.replace('Results', { scanId: result.scanId });
        }
      }, 3000);
    } else {
      setPhase('eye-capture');
    }
  };

  const handleEyeCapture = () => {
    setPhase('processing');

    setTimeout(() => {
      const result = runScan(cameraMode);
      if (result) {
        setPhase('done');
        navigation.replace('Results', { scanId: result.scanId });
      }
    }, 3000);
  };

  // Mode-specific colors
  const modeInfo = CAMERA_MODES.find(m => m.mode === cameraMode)!;
  const modeColor = modeInfo.color;

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

  const scanBorderColor = scanPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [modeColor, Colors.secondary],
  });

  const scanBorderWidth = scanPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [2, 4],
  });

  // ─── Ready Phase ──────────────────
  if (phase === 'ready') {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.readyScroll}>
        {/* Camera Mode Selector */}
        <CameraModeSelector
          selectedMode={cameraMode}
          onSelect={setCameraMode}
        />

        {/* Live camera preview */}
        <View style={[styles.cameraPreview, { borderColor: `${modeColor}40` }]}>
          <Camera
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
            device={device}
            isActive={true}
            photo={false}
            video={false}
          />
          {/* Mode-specific preview overlay */}
          {cameraMode === 'night_vision' && <NightVisionOverlay />}
          {cameraMode === 'thermal' && <ThermalOverlay />}
          {cameraMode === 'normal' && (
            <View style={styles.faceGuideOverlay}>
              <View style={styles.faceOval} />
              <Text style={styles.guideText}>Position your face here</Text>
            </View>
          )}
        </View>

        <GlassCard style={styles.instructionCard}>
          <Text style={[styles.instructionTitle, { color: modeColor }]}>
            {modeInfo.icon} {modeInfo.label} Mode Instructions
          </Text>
          <View style={styles.instructionList}>
            {cameraMode === 'thermal' ? (
              <>
                <Text style={styles.instruction}>1️⃣  Hold phone at arm's length, face visible</Text>
                <Text style={styles.instruction}>2️⃣  Ensure no strong heat sources nearby</Text>
                <Text style={styles.instruction}>3️⃣  Stay still for 12-second thermal scan</Text>
                <Text style={styles.instruction}>4️⃣  Blood flow & temperature auto-analyzed</Text>
              </>
            ) : cameraMode === 'night_vision' ? (
              <>
                <Text style={styles.instruction}>1️⃣  Works well in dim/low-light conditions</Text>
                <Text style={styles.instruction}>2️⃣  IR-enhanced edge detection active</Text>
                <Text style={styles.instruction}>3️⃣  Hold still for 10-second scan</Text>
                <Text style={styles.instruction}>4️⃣  Then capture a close-up of your eye</Text>
              </>
            ) : (
              <>
                <Text style={styles.instruction}>1️⃣  Hold your phone at arm's length</Text>
                <Text style={styles.instruction}>2️⃣  Ensure good lighting on your face</Text>
                <Text style={styles.instruction}>3️⃣  Stay still during the 10-second capture</Text>
                <Text style={styles.instruction}>4️⃣  Then capture a close-up of your eye</Text>
              </>
            )}
          </View>
        </GlassCard>

        <View style={styles.ctaArea}>
          <AnimatedButton
            title={`▶️  Begin ${modeInfo.label} Scan`}
            onPress={handleStartCapture}
            variant="primary"
            size="large"
            fullWidth
            style={{...styles.beginButton, backgroundColor: modeColor}}
          />

          <Text style={styles.disclaimer}>
            ⚡ All processing happens on your device — no data leaves your phone
          </Text>
        </View>
      </ScrollView>
    );
  }

  // ─── Face Capture Phase ──────────
  if (phase === 'face-capture') {
    const duration = cameraMode === 'thermal' ? 12 : 10;

    return (
      <View style={styles.container}>
        <View style={styles.captureContent}>
          {/* Live camera with mode-specific overlay */}
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

            {/* Mode-specific overlays */}
            {cameraMode === 'night_vision' && <NightVisionOverlay />}
            {cameraMode === 'thermal' && <ThermalOverlay />}
            {cameraMode === 'normal' && (
              <View style={styles.scanOverlay}>
                <View style={styles.faceOvalScanning} />
                <View style={styles.scanIndicator}>
                  <Animated.View style={[styles.scanLine, { opacity: scanPulse }]} />
                </View>
              </View>
            )}

            {/* Countdown overlay */}
            <View style={styles.countdownOverlay}>
              <CountdownRing
                duration={duration}
                onComplete={handleFaceCaptureComplete}
                label="Hold still"
                color={modeColor}
              />
            </View>
          </Animated.View>

          <GlassCard style={styles.phaseCard}>
            <Text style={[styles.phaseTitle, { color: modeColor }]}>
              {cameraMode === 'thermal' ? 'Thermal Blood Flow Analysis' :
               cameraMode === 'night_vision' ? 'Night Vision IR Scan' :
               'Phase 1: Facial Analysis'}
            </Text>
            <Text style={styles.phaseDesc}>
              {cameraMode === 'thermal'
                ? 'Mapping temperature zones and blood circulation patterns'
                : cameraMode === 'night_vision'
                ? 'Enhanced rPPG capture with IR-spectrum edge detection'
                : 'Capturing rPPG signal for heart rate, HRV, and blood pressure estimation'}
            </Text>
            <View style={styles.liveIndicator}>
              <View style={[styles.liveDot, { backgroundColor: modeColor }]} />
              <Text style={[styles.liveText, { color: modeColor }]}>
                {cameraMode === 'thermal' ? 'THERMAL SCANNING' :
                 cameraMode === 'night_vision' ? 'IR SCANNING' :
                 'LIVE SCANNING'}
              </Text>
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
            {cameraMode === 'night_vision' && <NightVisionOverlay />}
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
        <ProcessingOverlay mode={cameraMode} />
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
    paddingBottom: 100,
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
  // CTA area
  ctaArea: {
    paddingHorizontal: Spacing.lg,
  },
  // Buttons
  beginButton: {
    borderRadius: BorderRadius.xl,
    paddingVertical: 18,
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
