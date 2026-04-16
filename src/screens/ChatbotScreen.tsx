/**
 * AarogyaNetra AI — Chatbot Screen
 *
 * 5-Phase doctor-style flow:
 *   Phase 1 → Intro:       Welcome screen with doctor avatar
 *   Phase 2 → Chat:        AI doctor asks 14 symptom questions (Yes/Sometimes/No)
 *   Phase 3 → Camera Scan: Real front camera with face guide overlay
 *   Phase 4 → Processing:  "Fusing data…" spinner
 *   Phase 5 → Done:        Navigate to Results
 *
 * Key design: Questions come BEFORE scan. Scan result is seeded/calibrated
 * by the symptom score, so both signals reinforce each other.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Platform,
  Alert,
  Linking,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
} from 'react-native-vision-camera';
import { Colors, Typography, Spacing, BorderRadius } from '../theme';
import { useAppStore } from '../store/useAppStore';
import {
  QUESTION_BANK,
  getPoints,
  type AnswerValue,
  type QuestionAnswer,
} from '../services/questionnaire/QuestionnaireEngine';
import type { HomeStackParamList } from '../models/types';
import Svg, { Circle } from 'react-native-svg';

const { width } = Dimensions.get('window');
type NavProp = NativeStackNavigationProp<HomeStackParamList, 'Chatbot'>;

// ─── Types ───────────────────────────────────────────────
type Phase = 'intro' | 'chat' | 'camera_scan' | 'processing' | 'done';

// ─── Doctor Avatar ───────────────────────────────────────
const DoctorAvatar: React.FC<{ pulse?: boolean }> = ({ pulse = false }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!pulse) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 1.08, duration: 800, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1.0,  duration: 800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Animated.View style={[avatarStyles.container, { transform: [{ scale: scaleAnim }] }]}>
      <Text style={avatarStyles.emoji}>🩺</Text>
    </Animated.View>
  );
};

const avatarStyles = StyleSheet.create({
  container: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: `${Colors.primary}20`,
    borderWidth: 2,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  emoji: { fontSize: 32 },
});

// ─── Chat Bubble ─────────────────────────────────────────
const ChatBubble: React.FC<{ text: string; hint?: string; slideIn?: boolean }> = ({
  text,
  hint,
  slideIn = false,
}) => {
  const slideAnim = useRef(new Animated.Value(slideIn ? 60 : 0)).current;
  const fadeAnim  = useRef(new Animated.Value(slideIn ? 0  : 1)).current;

  useEffect(() => {
    if (!slideIn) return;
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 80, friction: 8 }),
      Animated.timing(fadeAnim,  { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        bubbleStyles.container,
        { transform: [{ translateX: slideAnim }], opacity: fadeAnim },
      ]}
    >
      <Text style={bubbleStyles.text}>{text}</Text>
      {hint ? <Text style={bubbleStyles.hint}>{hint}</Text> : null}
    </Animated.View>
  );
};

const bubbleStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: `${Colors.primary}18`,
    borderRadius: BorderRadius.lg,
    borderTopLeftRadius: 4,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: `${Colors.primary}30`,
  },
  text: {
    ...Typography.body,
    color: Colors.textPrimary,
    lineHeight: 24,
    fontWeight: '500',
  },
  hint: {
    ...Typography.caption,
    color: Colors.textTertiary,
    marginTop: Spacing.sm,
    fontStyle: 'italic',
  },
});

// ─── Answer Button ───────────────────────────────────────
const AnswerButton: React.FC<{
  label: string;
  emoji: string;
  value: AnswerValue;
  color: string;
  onPress: (v: AnswerValue) => void;
  disabled?: boolean;
}> = ({ label, emoji, value, color, onPress, disabled }) => {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.93, duration: 80, useNativeDriver: true }),
      Animated.spring(scale,  { toValue: 1,    useNativeDriver: true }),
    ]).start(() => onPress(value));
  };

  return (
    <Animated.View style={{ transform: [{ scale }], flex: 1 }}>
      <TouchableOpacity
        style={[answerStyles.btn, { borderColor: color, backgroundColor: `${color}15` }]}
        onPress={handlePress}
        disabled={disabled}
        activeOpacity={0.8}
      >
        <Text style={answerStyles.emoji}>{emoji}</Text>
        <Text style={[answerStyles.label, { color }]}>{label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const answerStyles = StyleSheet.create({
  btn: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    padding: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 72,
    marginHorizontal: Spacing.xs,
  },
  emoji: { fontSize: 26, marginBottom: 4 },
  label: { ...Typography.caption, fontWeight: '700', letterSpacing: 0.5 },
});

// ─── Progress Bar ─────────────────────────────────────────
const ProgressBar: React.FC<{ current: number; total: number }> = ({ current, total }) => {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: current / total,
      duration: 400,
      useNativeDriver: false,
    }).start();
  }, [current]);

  const width_interp = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={progressStyles.track}>
      <Animated.View style={[progressStyles.fill, { width: width_interp }]} />
    </View>
  );
};

const progressStyles = StyleSheet.create({
  track: {
    height: 4,
    backgroundColor: `${Colors.primary}25`,
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
});

// ─── Face Scan Animation ──────────────────────────────────
const FaceScanAnimation: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [countdown, setCountdown] = useState(10);
  const [activeLayer, setActiveLayer] = useState(0); // 0,1,2 → which layer is highlighting
  const [layerDone, setLayerDone] = useState([false, false, false]);
  const [statusText, setStatusText] = useState('Detecting face...');

  // Layer 1 — face mesh
  const meshOpacity  = useRef(new Animated.Value(0)).current;
  // Layer 2 — eye tracker
  const eyeScale    = useRef(new Animated.Value(0.5)).current;
  const eyeOpacity  = useRef(new Animated.Value(0)).current;
  // Layer 3 — rPPG wave
  const waveX       = useRef(new Animated.Value(-120)).current;
  const waveOpacity = useRef(new Animated.Value(0)).current;
  // Outer ring spin
  const spin        = useRef(new Animated.Value(0)).current;
  // Breathing oval
  const ovalScale   = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Outer ring always spinning
    Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 2500, useNativeDriver: true })
    ).start();

    // Oval breathe
    Animated.loop(
      Animated.sequence([
        Animated.timing(ovalScale, { toValue: 1.03, duration: 1800, useNativeDriver: true }),
        Animated.timing(ovalScale, { toValue: 0.97, duration: 1800, useNativeDriver: true }),
      ])
    ).start();

    // Phase 1 (0-3s): Layer 1 — Face mesh appears
    Animated.timing(meshOpacity, { toValue: 1, duration: 700, useNativeDriver: true }).start();
    setTimeout(() => {
      setActiveLayer(1);
      setStatusText('Mapping eye positions...');
      setLayerDone(p => [true, p[1], p[2]]);

      // Phase 2 (3-6s): Layer 2 — Eye tracking pulses
      Animated.parallel([
        Animated.timing(eyeOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.loop(
          Animated.sequence([
            Animated.timing(eyeScale, { toValue: 1.5, duration: 600, useNativeDriver: true }),
            Animated.timing(eyeScale, { toValue: 0.8, duration: 600, useNativeDriver: true }),
          ])
        ),
      ]).start();
    }, 3000);

    setTimeout(() => {
      setActiveLayer(2);
      setStatusText('Reading blood flow (rPPG)...');
      setLayerDone(p => [p[0], true, p[2]]);

      // Phase 3 (6-10s): Layer 3 — rPPG pulse wave sweeps
      Animated.timing(waveOpacity, { toValue: 1, duration: 400, useNativeDriver: true }).start();
      Animated.loop(
        Animated.timing(waveX, { toValue: 120, duration: 1200, useNativeDriver: true })
      ).start();
      setTimeout(() => setLayerDone(p => [p[0], p[1], true]), 3500);
    }, 6000);

    // Countdown
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(interval); onComplete(); return 0; }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const spinDeg = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  const LAYER_DOTS = [
    { x: -50, y: -70 }, { x: 0, y: -80 }, { x: 50, y: -70 },
    { x: -70, y: -20 }, { x: 70, y: -20 }, { x: -60, y: 30 },
    { x: 60, y: 30 },   { x: -35, y: 75 }, { x: 0, y: 85 }, { x: 35, y: 75 },
  ];

  return (
    <View style={scanStyles.container}>
      {/* Spinning dashed outer ring */}
      <Animated.View
        style={[scanStyles.outerRing, { transform: [{ rotate: spinDeg }] }]}
      />

      {/* Face oval + layers inside */}
      <Animated.View style={[scanStyles.faceOval, { transform: [{ scale: ovalScale }] }]}>

        {/* Layer 1: Face mesh dots */}
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: meshOpacity }]}>
          {LAYER_DOTS.map((dot, i) => (
            <View
              key={i}
              style={[
                scanStyles.meshDot,
                { left: '50%', top: '50%', marginLeft: dot.x, marginTop: dot.y },
              ]}
            />
          ))}
          {/* Mesh connecting lines (simplified — horizontal + vertical guides) */}
          <View style={scanStyles.meshLineH} />
          <View style={scanStyles.meshLineV} />
        </Animated.View>

        {/* Layer 2: Eye tracking rings */}
        <Animated.View style={[scanStyles.eyeLayer, { opacity: eyeOpacity }]}>
          <Animated.View style={[scanStyles.eyeRing, scanStyles.eyeLeft,  { transform: [{ scale: eyeScale }] }]} />
          <Animated.View style={[scanStyles.eyeRing, scanStyles.eyeRight, { transform: [{ scale: eyeScale }] }]} />
          <View style={scanStyles.eyeDotLeft} />
          <View style={scanStyles.eyeDotRight} />
        </Animated.View>

        {/* Layer 3: rPPG sweep wave */}
        <Animated.View
          style={[scanStyles.waveContainer, { opacity: waveOpacity }]}
        >
          <Animated.View style={[scanStyles.wave, { transform: [{ translateX: waveX }] }]} />
        </Animated.View>

        {/* Face silhouette */}
        <Text style={scanStyles.faceIcon}>👤</Text>
      </Animated.View>

      {/* Countdown */}
      <View style={scanStyles.countdownBox}>
        <Text style={scanStyles.countdownNum}>{countdown}</Text>
        <Text style={scanStyles.countdownLabel}>sec</Text>
      </View>

      {/* Dynamic status */}
      <Text style={scanStyles.label}>{statusText}</Text>

      {/* Layer progress indicators */}
      <View style={scanStyles.layerRow}>
        {[
          { icon: '🟩', label: 'Face Mesh', done: layerDone[0] },
          { icon: '👁️', label: 'Eye Track', done: layerDone[1] },
          { icon: '❤️', label: 'rPPG', done: layerDone[2] },
        ].map((l, i) => (
          <View key={i} style={[scanStyles.layerPill, i === activeLayer && scanStyles.layerActive]}>
            <Text style={scanStyles.layerText}>
              {l.done ? '✅' : i === activeLayer ? '⏳' : '○'} {l.label}
            </Text>
          </View>
        ))}
      </View>

      {/* Signal readouts */}
      <View style={scanStyles.signalRow}>
        {['❤️ HR', '🫀 HRV', '💧 SpO2', '🩸 HbEst'].map(s => (
          <View key={s} style={scanStyles.signalPill}>
            <Text style={scanStyles.signalText}>{s}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const scanStyles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  outerRing: {
    position: 'absolute',
    width: 250,
    height: 310,
    borderRadius: 125,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderTopColor: Colors.secondary,
    borderStyle: 'dashed',
  },
  faceOval: {
    width: 190,
    height: 240,
    borderRadius: 95,
    borderWidth: 2.5,
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}08`,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  // Layer 1: mesh
  meshDot: {
    position: 'absolute',
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.secondary,
    opacity: 0.8,
  },
  meshLineH: {
    position: 'absolute',
    left: 10,
    right: 10,
    height: 1,
    backgroundColor: `${Colors.secondary}40`,
    top: '45%',
  },
  meshLineV: {
    position: 'absolute',
    top: 10,
    bottom: 10,
    width: 1,
    backgroundColor: `${Colors.secondary}40`,
    left: '50%',
  },
  // Layer 2: eyes
  eyeLayer: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
  },
  eyeRing: {
    position: 'absolute',
    width: 34,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.accent || '#a78bfa',
    top: '32%',
  },
  eyeLeft:  { left: '18%' },
  eyeRight: { right: '18%' },
  eyeDotLeft: {
    position: 'absolute',
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: Colors.accent || '#a78bfa',
    top: '34%', left: '29%',
  },
  eyeDotRight: {
    position: 'absolute',
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: Colors.accent || '#a78bfa',
    top: '34%', right: '29%',
  },
  // Layer 3: rPPG wave
  waveContainer: {
    position: 'absolute',
    bottom: 55,
    left: 0,
    right: 0,
    height: 28,
    overflow: 'hidden',
  },
  wave: {
    position: 'absolute',
    width: 80,
    height: 28,
    borderRadius: 14,
    backgroundColor: `${Colors.danger || '#ef4444'}60`,
    left: '-40%',
  },
  // Countdown
  countdownBox: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: Spacing.xl,
  },
  countdownNum: { ...Typography.metric, color: Colors.primary, fontSize: 48 },
  countdownLabel: { ...Typography.h4, color: Colors.textSecondary, marginLeft: 4 },
  label: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  // Layer pills
  layerRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  layerPill: {
    backgroundColor: `${Colors.primary}10`,
    borderRadius: BorderRadius.round,
    borderWidth: 1,
    borderColor: `${Colors.primary}25`,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
  },
  layerActive: {
    backgroundColor: `${Colors.primary}25`,
    borderColor: Colors.primary,
  },
  layerText: { ...Typography.caption, color: Colors.textSecondary, fontWeight: '600', fontSize: 11 },
  // Signal pills
  signalRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
    justifyContent: 'center',
  },
  signalPill: {
    backgroundColor: `${Colors.secondary}20`,
    borderRadius: BorderRadius.round,
    borderWidth: 1,
    borderColor: `${Colors.secondary}50`,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  signalText: { ...Typography.caption, color: Colors.secondary, fontWeight: '600' },
  faceIcon: {
    fontSize: 48,
    opacity: 0.5,
    position: 'absolute',
    bottom: '20%',
  },
});


// ─── Processing Screen ────────────────────────────────────
const ProcessingView: React.FC = () => {
  const spin = useRef(new Animated.Value(0)).current;
  const steps = [
    '🧮 Calculating symptom risk scores...',
    '👤 Applying profile booster (age, BMI)...',
    '📊 Running multi-disease fusion engine...',
    '🔮 Projecting 6-month DREM trajectory...',
    '🍽️ Generating personalised recommendations...',
  ];
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 2000, useNativeDriver: true })
    ).start();

    let step = 0;
    const iv = setInterval(() => {
      step++;
      if (step < steps.length) setActiveStep(step);
      else clearInterval(iv);
    }, 600);
    return () => clearInterval(iv);
  }, []);

  const spinDeg = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View style={procStyles.container}>
      <Animated.View style={[procStyles.ring, { transform: [{ rotate: spinDeg }] }]}>
        <Text style={{ fontSize: 40 }}>🧬</Text>
      </Animated.View>
      <Text style={procStyles.title}>AI Fusion Engine Running</Text>
      <View style={procStyles.steps}>
        {steps.map((s, i) => (
          <Text
            key={i}
            style={[procStyles.step, i <= activeStep && procStyles.stepActive]}
          >
            {i <= activeStep ? '✅' : '⏳'} {s.replace(/^[^\s]+\s/, '')}
          </Text>
        ))}
      </View>
    </View>
  );
};

const procStyles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xxxl,
  },
  ring: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 3,
    borderColor: Colors.primary,
    borderTopColor: Colors.secondary,
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
  steps: { gap: Spacing.md, width: '100%' },
  step: { ...Typography.body, color: Colors.textTertiary },
  stepActive: { color: Colors.textSecondary },
});

// ─── Intro Screen ─────────────────────────────────────────
const IntroView: React.FC<{ onStart: () => void; userName: string }> = ({ onStart, userName }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[introStyles.container, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <Text style={introStyles.avatar}>🩺</Text>
      <Text style={introStyles.title}>Dr. AI — Health Check</Text>
      <View style={introStyles.bubbleWrap}>
        <Text style={introStyles.bubble}>
          Hi {userName.split(' ')[0]}! I'm going to ask you a few quick questions — just like a
          doctor would. It'll take about 2 minutes.{'\n\n'}
          Please answer honestly for the most accurate results. Ready?
        </Text>
      </View>

      <View style={introStyles.infoRow}>
        {[
          { icon: '❓', label: '14 Questions' },
          { icon: '⏱️', label: '~2 Minutes' },
          { icon: '🔒', label: '100% Private' },
        ].map(({ icon, label }) => (
          <View key={label} style={introStyles.infoPill}>
            <Text style={introStyles.infoIcon}>{icon}</Text>
            <Text style={introStyles.infoLabel}>{label}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity style={introStyles.btn} onPress={onStart} activeOpacity={0.85}>
        <Text style={introStyles.btnText}>✅  Yes, I'm Ready!</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const introStyles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xxl,
  },
  avatar: { fontSize: 72, marginBottom: Spacing.lg },
  title: {
    ...Typography.h2,
    color: Colors.textPrimary,
    marginBottom: Spacing.xl,
    textAlign: 'center',
  },
  bubbleWrap: {
    backgroundColor: `${Colors.primary}18`,
    borderRadius: BorderRadius.xl,
    borderTopLeftRadius: 4,
    borderWidth: 1,
    borderColor: `${Colors.primary}30`,
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
    width: '100%',
  },
  bubble: {
    ...Typography.body,
    color: Colors.textPrimary,
    lineHeight: 26,
  },
  infoRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.xxl,
  },
  infoPill: {
    flex: 1,
    backgroundColor: `${Colors.secondary}15`,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: `${Colors.secondary}30`,
  },
  infoIcon: { fontSize: 22, marginBottom: 4 },
  infoLabel: { ...Typography.caption, color: Colors.secondary, fontWeight: '700' },
  btn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.xl,
    paddingVertical: 18,
    paddingHorizontal: Spacing.xxxl,
    width: '100%',
    alignItems: 'center',
  },
  btnText: { ...Typography.button, color: '#fff' },
});

// ─── Main ChatbotScreen ───────────────────────────────────
export const ChatbotScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const { user, runSymptomScan } = useAppStore();

  const [phase, setPhase]         = useState<Phase>('intro');
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers]     = useState<QuestionAnswer[]>([]);
  const [answerDisabled, setAnswerDisabled] = useState(false);

  const scrollRef = useRef<ScrollView>(null);

  const questions = QUESTION_BANK;
  const currentQ  = questions[currentIdx];
  const profile   = user!;

  // Auto-scroll to bottom when new question appears
  useEffect(() => {
    if (phase === 'chat') {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [currentIdx, phase]);

  // ── Handle user answer ──────────────────────────────────
  const handleAnswer = useCallback(
    (answer: AnswerValue) => {
      if (answerDisabled) return;
      setAnswerDisabled(true);

      const pts = getPoints(currentQ, answer);
      const qa: QuestionAnswer = { questionId: currentQ.id, answer, points: pts };
      const newAnswers = [...answers, qa];
      setAnswers(newAnswers);

      const isLast = currentIdx >= questions.length - 1;

      setTimeout(() => {
        if (isLast) {
          handleStartCameraScan();
        } else {
          setCurrentIdx(prev => prev + 1);
          setAnswerDisabled(false);
        }
      }, 350);
    },
    [currentIdx, answers, currentQ, answerDisabled]
  );

  // Camera state — always Normal mode
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('front');
  const cameraRef = useRef<Camera>(null);
  const [scanCountdown, setScanCountdown] = useState(10);
  const scanPulse = useRef(new Animated.Value(0)).current;

  // ── Scan complete → processing ──────────────────────────
  const handleScanComplete = useCallback(() => {
    setPhase('processing');
    setTimeout(() => {
      const result = runSymptomScan(answers, 'normal');
      if (result) {
        setPhase('done');
        navigation.replace('Results', { scanId: result.scanId });
      }
    }, 3500);
  }, [answers, runSymptomScan]);

  // Q&A done → request permission → open camera
  const handleStartCameraScan = useCallback(async () => {
    if (!hasPermission) {
      const granted = await requestPermission();
      if (!granted) {
        Alert.alert(
          '📷 Camera Access Needed',
          'Please enable camera in Settings for face scanning.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]
        );
        return;
      }
    }
    setPhase('camera_scan');
    setScanCountdown(10);
  }, [hasPermission, requestPermission]);

  // Camera scan countdown
  useEffect(() => {
    if (phase !== 'camera_scan') return;
    if (scanCountdown <= 0) {
      handleScanComplete();
      return;
    }
    const timer = setTimeout(() => setScanCountdown(prev => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [phase, scanCountdown]);

  // Scan pulse animation
  useEffect(() => {
    if (phase === 'camera_scan') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scanPulse, { toValue: 1, duration: 1200, useNativeDriver: true }),
          Animated.timing(scanPulse, { toValue: 0, duration: 1200, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [phase]);

  const bgColor = Colors.background;

  // ── Intro Phase ─────────────────────────────────────────
  if (phase === 'intro') {
    return (
      <View style={[styles.root, { backgroundColor: bgColor }]}>
        <IntroView
          onStart={() => setPhase('chat')}
          userName={profile?.name || 'there'}
        />
      </View>
    );
  }

  // ── Chat Phase ──────────────────────────────────────────
  if (phase === 'chat') {
    const tagEmoji: Record<string, string> = {
      diabetes: '🩸',
      hypertension: '💓',
      anemia: '👁️',
      both: '🔗',
    };

    return (
      <View style={[styles.root, { backgroundColor: bgColor }]}>
        {/* Progress header */}
        <View style={styles.header}>
          <View style={styles.progressInfo}>
            <Text style={styles.progressText}>
              Question {currentIdx + 1} of {questions.length}
            </Text>
            <Text style={styles.tagBadge}>
              {tagEmoji[currentQ.tag]} {currentQ.tag.toUpperCase()}
            </Text>
          </View>
          <ProgressBar current={currentIdx + 1} total={questions.length} />
        </View>

        <ScrollView
          ref={scrollRef}
          style={styles.chatArea}
          contentContainerStyle={styles.chatContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Previous answered questions (compact) */}
          {answers.map((a, i) => (
            <View key={questions[i].id} style={styles.pastItem}>
              <Text style={styles.pastQ} numberOfLines={1}>
                {questions[i].text}
              </Text>
              <View style={[
                styles.pastAns,
                a.answer === 'yes' ? styles.pastYes
                  : a.answer === 'sometimes' ? styles.pastSometimes
                  : styles.pastNo,
              ]}>
                <Text style={styles.pastAnsText}>
                  {a.answer === 'yes' ? '✅ Yes'
                    : a.answer === 'sometimes' ? '🔶 Sometimes'
                    : '❌ No'}
                </Text>
              </View>
            </View>
          ))}

          {/* Current question */}
          <View style={styles.questionRow}>
            <DoctorAvatar pulse />
            <ChatBubble text={currentQ.text} hint={currentQ.hint} slideIn />
          </View>
        </ScrollView>

        {/* Answer buttons */}
        <View style={styles.answerRow}>
          <AnswerButton
            label="Yes"
            emoji="✅"
            value="yes"
            color={Colors.danger || '#ef4444'}
            onPress={handleAnswer}
            disabled={answerDisabled}
          />
          <AnswerButton
            label="Sometimes"
            emoji="🔶"
            value="sometimes"
            color={Colors.warning || '#f59e0b'}
            onPress={handleAnswer}
            disabled={answerDisabled}
          />
          <AnswerButton
            label="No"
            emoji="❌"
            value="no"
            color={Colors.success || '#22c55e'}
            onPress={handleAnswer}
            disabled={answerDisabled}
          />
        </View>

        <Text style={styles.disclaimer}>
          🔒 All data stays on your device — nothing is shared
        </Text>
      </View>
    );
  }



  // ── Camera Scan Phase (Real Camera + Normal Overlay) ────
  if (phase === 'camera_scan') {
    return (
      <View style={[styles.root, { backgroundColor: '#000' }]}>
        {/* Live camera feed */}
        {device ? (
          <View style={camScanStyles.cameraContainer}>
            <Camera
              ref={cameraRef}
              style={StyleSheet.absoluteFill}
              device={device}
              isActive={true}
              photo={false}
              video={false}
            />

            {/* === NORMAL MODE — face guide === */}
            <View style={camScanStyles.normalOverlay}>
              <View style={camScanStyles.normalFaceOval} />
            </View>

            {/* Countdown overlay */}
            <View style={camScanStyles.countdownOverlay}>
              <View style={camScanStyles.countdownCircle}>
                <Text style={[camScanStyles.countdownText, { color: Colors.primary }]}>
                  {scanCountdown}s
                </Text>
              </View>
              <Text style={camScanStyles.countdownLabel}>Hold still…</Text>
            </View>
          </View>
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#fff', fontSize: 18 }}>No front camera found</Text>
          </View>
        )}

        {/* Info bar at bottom */}
        <View style={camScanStyles.infoBar}>
          <View style={camScanStyles.liveIndicator}>
            <View style={[camScanStyles.liveDot, { backgroundColor: Colors.primary }]} />
            <Text style={[camScanStyles.liveText, { color: Colors.primary }]}>LIVE SCANNING</Text>
          </View>
          <Text style={camScanStyles.infoText}>
            Capturing rPPG signal from facial micro-changes
          </Text>
        </View>
      </View>
    );
  }



  // ── Processing Phase ────────────────────────────────────
  if (phase === 'processing') {
    return (
      <View style={[styles.root, { backgroundColor: bgColor }]}>
        <ProcessingView />
      </View>
    );
  }

  return null;
};

// ─── Styles ───────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    padding: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  progressText: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  tagBadge: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: '700',
    backgroundColor: `${Colors.primary}15`,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  chatArea: { flex: 1 },
  chatContent: {
    padding: Spacing.lg,
    gap: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  pastItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: `${Colors.surface}80`,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    gap: Spacing.sm,
    opacity: 0.7,
  },
  pastQ: {
    ...Typography.caption,
    color: Colors.textTertiary,
    flex: 1,
  },
  pastAns: {
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  pastYes:      { backgroundColor: '#ef444420' },
  pastSometimes:{ backgroundColor: '#f59e0b20' },
  pastNo:       { backgroundColor: '#22c55e20' },
  pastAnsText: { ...Typography.caption, fontWeight: '700', fontSize: 11 },
  questionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: Spacing.lg,
  },
  answerRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.lg,
    gap: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBorder,
  },
  scanTitle: {
    ...Typography.h4,
    color: Colors.textPrimary,
    textAlign: 'center',
    padding: Spacing.xl,
    paddingBottom: 0,
  },
  disclaimer: {
    ...Typography.caption,
    color: Colors.textTertiary,
    textAlign: 'center',
    paddingBottom: Platform.OS === 'ios' ? Spacing.xl : Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
});


// ─── Camera Scan Overlay Styles ───────────────────────
const camScanStyles = StyleSheet.create({
  cameraContainer: {
    flex: 1,
    overflow: 'hidden',
  },

  normalOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  normalFaceOval: {
    width: 180,
    height: 230,
    borderRadius: 90,
    borderWidth: 2,
    borderColor: 'rgba(108, 99, 255, 0.6)',
    borderStyle: 'dashed',
  },
  // Countdown
  countdownOverlay: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  countdownCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdownText: {
    fontSize: 24,
    fontWeight: '700',
  },
  countdownLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginTop: 4,
  },
  // Info bar
  infoBar: {
    padding: Spacing.lg,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBorder,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: Spacing.sm,
  },
  liveText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  infoText: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
  },
});
