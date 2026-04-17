/**
 * AarogyaNetra AI — Home Screen
 * Central action hub:
 *  - Start Face Scan (primary CTA)
 *  - Previous scan results summary
 *  - Health trend tracking
 *  - Quick access to features
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
  Modal,
  FlatList,
  TextInput,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors } from '../theme';
import { useAppStore } from '../store/useAppStore';
import { useLanguage } from '../i18n/LanguageContext';
import { LANGUAGE_LIST } from '../i18n/translations';
import type { HomeStackParamList, ScanHistoryEntry } from '../models/types';

type NavProp = NativeStackNavigationProp<HomeStackParamList, 'Home'>;

const { width } = Dimensions.get('window');

// ─── Animated scan button ─────────────────────────────
const PulseScanButton: React.FC<{ onPress: () => void; label: string; sublabel: string }> = ({ onPress, label, sublabel }) => {
  const pulse1 = useRef(new Animated.Value(1)).current;
  const pulse2 = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const anim1 = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse1, { toValue: 1.35, duration: 1800, useNativeDriver: true }),
        Animated.timing(pulse1, { toValue: 1, duration: 1800, useNativeDriver: true }),
      ])
    );
    const anim2 = Animated.loop(
      Animated.sequence([
        Animated.delay(600),
        Animated.timing(pulse2, { toValue: 1.55, duration: 1800, useNativeDriver: true }),
        Animated.timing(pulse2, { toValue: 1, duration: 1800, useNativeDriver: true }),
      ])
    );
    anim1.start();
    anim2.start();
    return () => { anim1.stop(); anim2.stop(); };
  }, []);

  const pressIn = () => Animated.spring(scale, { toValue: 0.94, useNativeDriver: true }).start();
  const pressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();

  return (
    <View style={scanBtnStyles.wrapper}>
      {/* Ripple rings */}
      <Animated.View style={[scanBtnStyles.ring, { transform: [{ scale: pulse2 }], opacity: pulse2.interpolate({ inputRange: [1, 1.55], outputRange: [0.2, 0] }) }]} />
      <Animated.View style={[scanBtnStyles.ring, { transform: [{ scale: pulse1 }], opacity: pulse1.interpolate({ inputRange: [1, 1.35], outputRange: [0.3, 0] }) }]} />

      {/* Main button */}
      <Animated.View style={{ transform: [{ scale }] }}>
        <TouchableOpacity
          style={scanBtnStyles.btn}
          onPress={onPress}
          onPressIn={pressIn}
          onPressOut={pressOut}
          activeOpacity={1}
        >
          <Text style={scanBtnStyles.cameraIcon}>📷</Text>
          <Text style={scanBtnStyles.label}>{label}</Text>
          <Text style={scanBtnStyles.sublabel}>{sublabel}</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const scanBtnStyles = StyleSheet.create({
  wrapper: { alignItems: 'center', justifyContent: 'center', height: 200, marginVertical: 8 },
  ring: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  btn: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 10,
    shadowColor: '#006e2f',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
  },
  cameraIcon: { fontSize: 40, marginBottom: 4 },
  label: { fontSize: 14, fontWeight: '800', color: '#fff', letterSpacing: 0.2 },
  sublabel: { fontSize: 10, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
});

// ─── Risk bar ─────────────────────────────────────────
const RiskBar: React.FC<{ label: string; value: number; color: string; icon: string }> = ({ label, value, color, icon }) => {
  const animWidth = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(animWidth, { toValue: value, duration: 900, useNativeDriver: false, delay: 300 }).start();
  }, [value]);

  const { t } = useLanguage();
  const pct = Math.round(value * 100);
  const level = pct < 30 ? t('low') : pct < 60 ? t('moderate') : t('high');
  const lvlColor = pct < 30 ? Colors.success : pct < 60 ? Colors.warning : Colors.danger;

  return (
    <View style={riskBarStyles.row}>
      <Text style={riskBarStyles.icon}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <View style={riskBarStyles.labelRow}>
          <Text style={riskBarStyles.label}>{label}</Text>
          <Text style={[riskBarStyles.level, { color: lvlColor }]}>{level} · {pct}%</Text>
        </View>
        <View style={riskBarStyles.track}>
          <Animated.View
            style={[
              riskBarStyles.fill,
              {
                backgroundColor: color,
                width: animWidth.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
              },
            ]}
          />
        </View>
      </View>
    </View>
  );
};

const riskBarStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  icon: { fontSize: 18, width: 24 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  label: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  level: { fontSize: 11, fontWeight: '700' },
  track: { height: 7, backgroundColor: Colors.surfaceContainerLow, borderRadius: 4, overflow: 'hidden' },
  fill: { height: 7, borderRadius: 4 },
});

// ─── Score Ring ───────────────────────────────────────
const ScoreRing: React.FC<{ score: number }> = ({ score }) => {
  const { t } = useLanguage();
  const color = score >= 70 ? Colors.success : score >= 45 ? Colors.warning : Colors.danger;
  const label = score >= 70 ? t('good') : score >= 45 ? t('fair') : t('at_risk');

  return (
    <View style={ringStyles.container}>
      <View style={[ringStyles.outer, { borderColor: `${color}30` }]}>
        <View style={[ringStyles.inner, { borderColor: color }]}>
          <Text style={[ringStyles.score, { color }]}>{score}</Text>
          <Text style={ringStyles.outOf}>/100</Text>
        </View>
      </View>
      <Text style={[ringStyles.label, { color }]}>{label}</Text>
    </View>
  );
};

const ringStyles = StyleSheet.create({
  container: { alignItems: 'center' },
  outer: { width: 88, height: 88, borderRadius: 44, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  inner: { width: 72, height: 72, borderRadius: 36, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center' },
  score: { fontSize: 22, fontWeight: '800' },
  outOf: { fontSize: 10, color: Colors.textTertiary, marginTop: -2 },
  label: { fontSize: 11, fontWeight: '700', marginTop: 5 },
});

// ─── Quick Action Card ────────────────────────────────
const QuickCard: React.FC<{ icon: string; label: string; desc: string; onPress: () => void; color?: string }> = ({ icon, label, desc, onPress, color = Colors.surfaceContainerLow }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const pressIn = () => Animated.spring(scale, { toValue: 0.95, useNativeDriver: true }).start();
  const pressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();

  return (
    <Animated.View style={[quickStyles.card, { transform: [{ scale }], backgroundColor: color }]}>
      <TouchableOpacity onPress={onPress} onPressIn={pressIn} onPressOut={pressOut} activeOpacity={1}>
        <Text style={quickStyles.icon}>{icon}</Text>
        <Text style={quickStyles.label}>{label}</Text>
        <Text style={quickStyles.desc}>{desc}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const quickStyles = StyleSheet.create({
  card: { width: (width - 56) / 2, borderRadius: 18, padding: 18, marginBottom: 12, borderWidth: 1, borderColor: Colors.surfaceBorder },
  icon: { fontSize: 28, marginBottom: 8 },
  label: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, marginBottom: 3 },
  desc: { fontSize: 11, color: Colors.textTertiary, lineHeight: 17 },
});

// ─── Mini trend chart ─────────────────────────────────
const TrendChart: React.FC<{ history: ScanHistoryEntry[] }> = ({ history }) => {
  if (history.length < 2) return null;
  const last5 = history.slice(0, 5).reverse();
  const maxScore = 100;

  return (
    <View style={trendStyles.container}>
      <View style={trendStyles.bars}>
        {last5.map((entry, i) => {
          const h = Math.max(8, (entry.overallScore / maxScore) * 60);
          const color = entry.overallScore >= 70 ? Colors.success : entry.overallScore >= 45 ? Colors.warning : Colors.danger;
          return (
            <View key={i} style={trendStyles.barWrap}>
              <Text style={trendStyles.barValue}>{entry.overallScore}</Text>
              <View style={[trendStyles.bar, { height: h, backgroundColor: color }]} />
              <Text style={trendStyles.barDate}>
                {new Date(entry.timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Trend direction */}
      {last5.length >= 2 && (() => {
        const latest = last5[last5.length - 1].overallScore;
        const prev = last5[last5.length - 2].overallScore;
        const diff = latest - prev;
        const up = diff > 0;
        return (
          <View style={trendStyles.trendNote}>
            <Text style={[trendStyles.trendArrow, { color: up ? Colors.success : Colors.danger }]}>
              {up ? '↗' : '↘'}
            </Text>
            <Text style={trendStyles.trendText}>
              {up ? `+${diff}` : diff} points since last scan
            </Text>
          </View>
        );
      })()}
    </View>
  );
};

const trendStyles = StyleSheet.create({
  container: { paddingTop: 8 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', height: 90 },
  barWrap: { alignItems: 'center', gap: 4 },
  barValue: { fontSize: 10, fontWeight: '700', color: Colors.textTertiary },
  bar: { width: 28, borderRadius: 6 },
  barDate: { fontSize: 9, color: Colors.textTertiary },
  trendNote: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, justifyContent: 'center' },
  trendArrow: { fontSize: 18, fontWeight: '800' },
  trendText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
});

// ─── Health Check Questions Modal ────────────────────
const QUICK_QUESTIONS = [
  { id: 'Q1', emoji: '💧', text: 'Do you feel very thirsty often or urinate frequently?' },
  { id: 'Q2', emoji: '❤️', text: 'Do you get frequent headaches or feel your heart racing at rest?' },
  { id: 'Q3', emoji: '😴', text: 'Do you feel tired or low on energy for most of the day?' },
  { id: 'Q4', emoji: '😮‍💨', text: 'Do you feel breathless climbing stairs or walking quickly?' },
  { id: 'Q5', emoji: '🌡️', text: 'Do people say you look pale, or do your hands/feet feel cold?' },
];

type QuickAnswer = 'yes' | 'sometimes' | 'no';

const HealthCheckModal: React.FC<{ visible: boolean; onClose: () => void; onProceed: () => void }> = ({ visible, onClose, onProceed }) => {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, QuickAnswer>>({});
  const slideAnim = useRef(new Animated.Value(0)).current;
  const { t } = useLanguage();

  const currentQ = QUICK_QUESTIONS[step];
  const isLast = step === QUICK_QUESTIONS.length - 1;

  const animateNext = () => {
    Animated.sequence([
      Animated.timing(slideAnim, { toValue: -30, duration: 180, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start();
  };

  const handleAnswer = (answer: QuickAnswer) => {
    setAnswers(prev => ({ ...prev, [currentQ.id]: answer }));
    if (isLast) {
      // Last question answered — proceed to scanner
      setTimeout(() => {
        setStep(0);
        setAnswers({});
        onProceed();
      }, 350);
    } else {
      animateNext();
      setStep(s => s + 1);
    }
  };

  const handleClose = () => {
    setStep(0);
    setAnswers({});
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <SafeAreaView style={healthModalStyles.container}>
        {/* Header */}
        <View style={healthModalStyles.header}>
          <View>
            <Text style={healthModalStyles.title}>🩺 Health Check</Text>
            <Text style={healthModalStyles.subtitle}>Answer to get personalized results</Text>
          </View>
          <TouchableOpacity onPress={handleClose} style={healthModalStyles.closeBtn}>
            <Text style={healthModalStyles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Progress bar */}
        <View style={healthModalStyles.progressTrack}>
          <View style={[healthModalStyles.progressFill, { width: `${((step + 1) / QUICK_QUESTIONS.length) * 100}%` }]} />
        </View>
        <Text style={healthModalStyles.progressLabel}>
          Question {step + 1} of {QUICK_QUESTIONS.length}
        </Text>

        {/* Question */}
        <Animated.View style={[healthModalStyles.questionArea, { transform: [{ translateX: slideAnim }] }]}>
          <Text style={healthModalStyles.qEmoji}>{currentQ.emoji}</Text>
          <Text style={healthModalStyles.qText}>{currentQ.text}</Text>
        </Animated.View>

        {/* Answer options */}
        <View style={healthModalStyles.answerArea}>
          {(['yes', 'sometimes', 'no'] as QuickAnswer[]).map(opt => (
            <TouchableOpacity
              key={opt}
              style={[
                healthModalStyles.answerBtn,
                answers[currentQ.id] === opt && healthModalStyles.answerBtnActive,
                opt === 'yes' && healthModalStyles.answerBtnYes,
                opt === 'sometimes' && healthModalStyles.answerBtnSometimes,
                opt === 'no' && healthModalStyles.answerBtnNo,
              ]}
              onPress={() => handleAnswer(opt)}
              activeOpacity={0.85}
            >
              <Text style={healthModalStyles.answerIcon}>
                {opt === 'yes' ? '✅' : opt === 'sometimes' ? '🔄' : '❌'}
              </Text>
              <Text style={[
                healthModalStyles.answerLabel,
                answers[currentQ.id] === opt && { color: '#fff', fontWeight: '800' },
              ]}>
                {opt === 'yes' ? 'Yes' : opt === 'sometimes' ? 'Sometimes' : 'No'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* What's next banner */}
        <View style={healthModalStyles.nextBanner}>
          <Text style={healthModalStyles.nextTitle}>📷 After questions:</Text>
          <View style={healthModalStyles.nextSteps}>
            <View style={healthModalStyles.nextStep}>
              <Text style={healthModalStyles.nextStepIcon}>1️⃣</Text>
              <Text style={healthModalStyles.nextStepText}>Face Scan (10 sec)</Text>
            </View>
            <Text style={healthModalStyles.nextArrow}>→</Text>
            <View style={healthModalStyles.nextStep}>
              <Text style={healthModalStyles.nextStepIcon}>2️⃣</Text>
              <Text style={healthModalStyles.nextStepText}>Eye Scan</Text>
            </View>
            <Text style={healthModalStyles.nextArrow}>→</Text>
            <View style={healthModalStyles.nextStep}>
              <Text style={healthModalStyles.nextStepIcon}>📊</Text>
              <Text style={healthModalStyles.nextStepText}>Results</Text>
            </View>
          </View>
        </View>

        {/* Skip option */}
        <TouchableOpacity onPress={onProceed} style={healthModalStyles.skipBtn}>
          <Text style={healthModalStyles.skipText}>Skip questions → Go to scan directly</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </Modal>
  );
};

const healthModalStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 24, paddingTop: 16 },
  title: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
  subtitle: { fontSize: 13, color: Colors.textTertiary, marginTop: 2 },
  closeBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: Colors.surfaceContainerLow, alignItems: 'center', justifyContent: 'center' },
  closeText: { fontSize: 14, fontWeight: '700', color: Colors.textSecondary },
  progressTrack: { height: 6, backgroundColor: Colors.surfaceContainerLow, marginHorizontal: 24, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, backgroundColor: Colors.primary, borderRadius: 3 },
  progressLabel: { fontSize: 11, color: Colors.textTertiary, textAlign: 'center', marginTop: 6, marginBottom: 8 },
  questionArea: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingBottom: 8 },
  qEmoji: { fontSize: 56, marginBottom: 20 },
  qText: { fontSize: 19, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center', lineHeight: 27 },
  answerArea: { paddingHorizontal: 24, gap: 10, marginBottom: 16 },
  answerBtn: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 16, paddingVertical: 16, paddingHorizontal: 20, borderWidth: 1.5, borderColor: Colors.surfaceBorder, backgroundColor: '#fff' },
  answerBtnActive: { borderColor: Colors.primary },
  answerBtnYes: { },
  answerBtnSometimes: { },
  answerBtnNo: { },
  answerIcon: { fontSize: 20 },
  answerLabel: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary },
  nextBanner: { marginHorizontal: 24, backgroundColor: `${Colors.primary}08`, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: `${Colors.primary}20`, marginBottom: 12 },
  nextTitle: { fontSize: 12, fontWeight: '700', color: Colors.textTertiary, marginBottom: 8 },
  nextSteps: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  nextStep: { alignItems: 'center', gap: 3 },
  nextStepIcon: { fontSize: 16 },
  nextStepText: { fontSize: 10, color: Colors.textSecondary, fontWeight: '600' },
  nextArrow: { fontSize: 14, color: Colors.textTertiary, fontWeight: '700' },
  skipBtn: { paddingVertical: 14, alignItems: 'center', marginBottom: 8 },
  skipText: { fontSize: 13, color: Colors.textTertiary, textDecorationLine: 'underline' },
});

// ─── Language Switcher Modal ──────────────────────────
const LanguageSwitcherModal: React.FC<{ visible: boolean; onClose: () => void }> = ({ visible, onClose }) => {
  const { language, setLanguage } = useAppStore();
  const { t } = useLanguage();
  const [search, setSearch] = useState('');
  const filtered = LANGUAGE_LIST.filter(l =>
    l.label.toLowerCase().includes(search.toLowerCase()) ||
    l.native.toLowerCase().includes(search.toLowerCase())
  );
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={langModalStyles.container}>
        <View style={langModalStyles.header}>
          <Text style={langModalStyles.title}>🌐 {t('choose_language')}</Text>
          <TouchableOpacity onPress={onClose} style={langModalStyles.closeBtn}>
            <Text style={langModalStyles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>
        <TextInput
          style={langModalStyles.search}
          value={search}
          onChangeText={setSearch}
          placeholder={t('search_language')}
          placeholderTextColor={Colors.textTertiary}
        />
        <FlatList
          data={filtered}
          keyExtractor={item => item.code}
          showsVerticalScrollIndicator={false}
          renderItem={({ item: lang }) => {
            const isActive = language === lang.code;
            return (
              <TouchableOpacity
                style={[langModalStyles.langRow, isActive && langModalStyles.langRowActive]}
                onPress={() => { setLanguage(lang.code); onClose(); }}
                activeOpacity={0.75}
              >
                <Text style={{ fontSize: 22 }}>{lang.flag}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[langModalStyles.langNative, isActive && { color: Colors.primary }]}>{lang.native}</Text>
                  <Text style={langModalStyles.langEnglish}>{lang.label}</Text>
                </View>
                {isActive && (
                  <View style={langModalStyles.check}>
                    <Text style={{ color: '#fff', fontWeight: '800' }}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
        />
      </View>
    </Modal>
  );
};

const langModalStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 48, borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder },
  title: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.surfaceContainerLow, alignItems: 'center', justifyContent: 'center' },
  closeText: { fontSize: 14, fontWeight: '700', color: Colors.textSecondary },
  search: { margin: 16, backgroundColor: Colors.surfaceContainerLow, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, color: Colors.textPrimary, borderWidth: 1, borderColor: Colors.surfaceBorder },
  langRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: `${Colors.surfaceBorder}60` },
  langRowActive: { backgroundColor: `${Colors.primary}08` },
  langNative: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  langEnglish: { fontSize: 12, color: Colors.textTertiary, marginTop: 1 },
  check: { width: 26, height: 26, borderRadius: 13, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
});

// ─── Main Screen ──────────────────────────────────────
export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const { user, scanHistory, currentScan, initializeDefaultUser, language } = useAppStore();
  const { t } = useLanguage();
  const currentLang = LANGUAGE_LIST.find(l => l.code === language) ?? LANGUAGE_LIST.find(l => l.code === 'en')!;

  const [langModalVisible, setLangModalVisible] = useState(false);
  const [healthCheckVisible, setHealthCheckVisible] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    initializeDefaultUser();
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideY, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  const lastScan = scanHistory[0];
  const greetingHour = new Date().getHours();
  const greeting = greetingHour < 12 ? t('good_morning') : greetingHour < 17 ? t('good_afternoon') : t('good_evening');

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <LanguageSwitcherModal visible={langModalVisible} onClose={() => setLangModalVisible(false)} />
      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideY }] }}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting} 👋</Text>
            <Text style={styles.userName}>{user?.name || t('welcome')}</Text>
          </View>
          <View style={styles.headerRight}>
            {/* Language switcher button */}
            <TouchableOpacity
              style={styles.langBtn}
              onPress={() => setLangModalVisible(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.langBtnFlag}>{currentLang.flag}</Text>
              <Text style={styles.langBtnText}>{currentLang.code.toUpperCase()}</Text>
            </TouchableOpacity>
            {scanHistory.length > 0 && (
              <View style={styles.scanCountBadge}>
                <Text style={styles.scanCountText}>{scanHistory.length} {t('scans')}</Text>
              </View>
            )}
          </View>
        </View>

        <HealthCheckModal
          visible={healthCheckVisible}
          onClose={() => setHealthCheckVisible(false)}
          onProceed={() => {
            setHealthCheckVisible(false);
            navigation.navigate('Scanner', { cameraMode: 'normal', skipReady: true });
          }}
        />

        {/* ── Primary CTA — Check Scan ── */}
        <View style={styles.scanSection}>
          <PulseScanButton
            onPress={() => setHealthCheckVisible(true)}
            label="Check Scan"
            sublabel="Questions → Face Scan → Eye Scan"
          />
          <Text style={styles.scanHint}>Answer 5 quick health questions, then scan</Text>

          {/* Scan flow chips */}
          <View style={styles.scanFlowRow}>
            <View style={styles.scanFlowChip}>
              <Text style={styles.scanFlowIcon}>💬</Text>
              <Text style={styles.scanFlowLabel}>Questions</Text>
            </View>
            <Text style={styles.scanFlowArrow}>→</Text>
            <View style={styles.scanFlowChip}>
              <Text style={styles.scanFlowIcon}>📷</Text>
              <Text style={styles.scanFlowLabel}>Face Scan</Text>
            </View>
            <Text style={styles.scanFlowArrow}>→</Text>
            <View style={[styles.scanFlowChip, { borderColor: Colors.anemia }]}>
              <Text style={styles.scanFlowIcon}>👁️</Text>
              <Text style={[styles.scanFlowLabel, { color: Colors.anemia }]}>Eye Scan</Text>
            </View>
          </View>
        </View>

        {/* ── What We Detect ── */}
        <View style={styles.detectRow}>
          {[
            { icon: '❤️', label: t('hypertension'), color: '#ef4444' },
            { icon: '🩸', label: t('diabetes'),     color: '#006e2f' },
            { icon: '👁️', label: t('anemia'),       color: '#f59e0b' },
          ].map((d, i) => (
            <View key={i} style={[styles.detectChip, { backgroundColor: `${d.color}10` }]}>
              <Text>{d.icon}</Text>
              <Text style={[styles.detectLabel, { color: d.color }]}>{d.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Last Scan Summary ── */}
        {lastScan ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('last_scan_results')}</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('Results', { scanId: lastScan.scanId })}
                activeOpacity={0.7}
              >
                <Text style={styles.seeAll}>{t('view_report')} →</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.lastScanCard}>
              {/* Score ring + risks */}
              <View style={styles.lastScanTop}>
                <ScoreRing score={lastScan.overallScore} />
                <View style={{ flex: 1, marginLeft: 20 }}>
                  <RiskBar label={t('hypertension')} value={lastScan.hypertensionRisk} color="#ef4444" icon="❤️" />
                  <RiskBar label={t('diabetes')}     value={lastScan.diabetesRisk}     color="#006e2f" icon="🩸" />
                  <RiskBar label={t('anemia')}       value={lastScan.anemiaRisk}       color="#f59e0b" icon="👁️" />
                </View>
              </View>

              <View style={styles.scanMeta}>
                <Text style={styles.scanMetaText}>
                  🕐 {new Date(lastScan.timestamp).toLocaleDateString('en-IN', {
                    weekday: 'short', day: 'numeric', month: 'short',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </Text>
                <TouchableOpacity
                  style={styles.rescanBtn}
                  onPress={() => setHealthCheckVisible(true)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.rescanText}>{t('rescan')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.noScanCard}>
            <Text style={{ fontSize: 36, marginBottom: 8 }}>🔍</Text>
            <Text style={styles.noScanTitle}>{t('no_scans_yet')}</Text>
            <Text style={styles.noScanDesc}>{t('no_scans_desc')}</Text>
          </View>
        )}

        {/* ── Health Progress / Trend ── */}
        {scanHistory.length >= 2 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('health_trend')}</Text>
            <View style={styles.trendCard}>
              <TrendChart history={scanHistory} />
            </View>
          </View>
        )}

        {/* ── Quick Actions ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('quick_access')}</Text>
          <View style={styles.quickGrid}>
            <QuickCard
              icon="📊"
              label={t('health_history')}
              desc={t('health_history_desc')}
              onPress={() => navigation.navigate('Results', { scanId: lastScan?.scanId || '' })}
              color="#f0faf3"
            />
            <QuickCard
              icon="🤖"
              label={t('ai_chat')}
              desc={t('ai_chat_desc')}
              onPress={() => navigation.navigate('Chatbot')}
              color="#f0f4ff"
            />
            <QuickCard
              icon="🍽️"
              label={t('diet_plan')}
              desc={t('diet_plan_desc')}
              onPress={() => lastScan
                ? navigation.navigate('Diet', { scanId: lastScan.scanId })
                : navigation.navigate('Scanner', { cameraMode: 'normal' })
              }
              color="#fffbf0"
            />
            <QuickCard
              icon="📈"
              label={t('risk_forecast')}
              desc={t('risk_forecast_desc')}
              onPress={() => lastScan
                ? navigation.navigate('DREM', { scanId: lastScan.scanId })
                : navigation.navigate('Scanner', { cameraMode: 'normal' })
              }
              color="#fff0f0"
            />
          </View>
        </View>

        {/* ── How It Works ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('how_it_works')}</Text>
          <View style={styles.stepsCard}>
            {[
              { step: '1', icon: '💬', title: t('step_questions'), desc: t('step_questions_desc') },
              { step: '2', icon: '📷', title: t('step_face_scan'), desc: t('step_face_scan_desc') },
              { step: '3', icon: '🧠', title: t('step_ai_analysis'), desc: t('step_ai_analysis_desc') },
              { step: '4', icon: '📋', title: t('step_report'), desc: t('step_report_desc') },
            ].map((s, i) => (
              <View key={i} style={[styles.step, i < 3 && styles.stepBorder]}>
                <View style={styles.stepNum}>
                  <Text style={styles.stepNumText}>{s.step}</Text>
                </View>
                <Text style={styles.stepIcon}>{s.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.stepTitle}>{s.title}</Text>
                  <Text style={styles.stepDesc}>{s.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* ── Footer ── */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>{t('footer_disclaimer')}</Text>
          <Text style={styles.footerVersion}>{t('footer_version')}</Text>
        </View>

      </Animated.View>
    </ScrollView>
  );
};

// ─── Styles ───────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: 100 },

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 24, paddingTop: 52, paddingBottom: 4 },
  greeting: { fontSize: 13, color: Colors.textTertiary, fontWeight: '500' },
  userName: { fontSize: 26, fontWeight: '800', color: Colors.textPrimary, letterSpacing: -0.5 },
  headerRight: { alignItems: 'flex-end', paddingTop: 16, gap: 6 },
  langBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: Colors.surfaceContainerLow, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: Colors.surfaceBorder },
  langBtnFlag: { fontSize: 16 },
  langBtnText: { fontSize: 11, fontWeight: '800', color: Colors.textSecondary },
  scanCountBadge: { backgroundColor: 'rgba(0,110,47,0.1)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 },
  scanCountText: { fontSize: 12, fontWeight: '700', color: Colors.primary },

  // Scan section
  scanSection: { alignItems: 'center', paddingHorizontal: 24, marginTop: 16 },
  scanHint: { fontSize: 12, color: Colors.textTertiary, textAlign: 'center', marginTop: 4, lineHeight: 17 },
  // Scan flow chips row
  scanFlowRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16 },
  scanFlowChip: { flexDirection: 'column', alignItems: 'center', gap: 4, backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1.5, borderColor: Colors.primary, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6 },
  scanFlowIcon: { fontSize: 18 },
  scanFlowLabel: { fontSize: 11, fontWeight: '700', color: Colors.primary },
  scanFlowArrow: { fontSize: 16, color: Colors.textTertiary, fontWeight: '700' },

  // Detect chips
  detectRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 24, marginTop: 20, justifyContent: 'center' },
  detectChip: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 8, justifyContent: 'center' },
  detectLabel: { fontSize: 11, fontWeight: '700' },

  // Section
  section: { paddingHorizontal: 24, marginTop: 28 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary },
  seeAll: { fontSize: 13, fontWeight: '600', color: Colors.primary },

  // Last scan card
  lastScanCard: { backgroundColor: '#fff', borderRadius: 22, padding: 20, borderWidth: 1, borderColor: Colors.surfaceBorder, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12 },
  lastScanTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  scanMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.surfaceBorder },
  scanMetaText: { fontSize: 11, color: Colors.textTertiary },
  rescanBtn: { backgroundColor: Colors.primary, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6 },
  rescanText: { fontSize: 12, fontWeight: '700', color: '#fff' },

  // No scan
  noScanCard: { marginHorizontal: 0, backgroundColor: Colors.surfaceContainerLow, borderRadius: 22, padding: 28, alignItems: 'center', borderWidth: 1, borderColor: Colors.surfaceBorder },
  noScanTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: 6 },
  noScanDesc: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', lineHeight: 19 },

  // Trend card
  trendCard: { backgroundColor: '#fff', borderRadius: 20, padding: 18, borderWidth: 1, borderColor: Colors.surfaceBorder },

  // Quick grid
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between' },

  // Steps card
  stepsCard: { backgroundColor: '#fff', borderRadius: 20, padding: 18, borderWidth: 1, borderColor: Colors.surfaceBorder },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 14 },
  stepBorder: { borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder },
  stepNum: { width: 26, height: 26, borderRadius: 13, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  stepNumText: { fontSize: 12, fontWeight: '800', color: '#fff' },
  stepIcon: { fontSize: 20, marginTop: 1 },
  stepTitle: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, marginBottom: 2 },
  stepDesc: { fontSize: 12, color: Colors.textTertiary, lineHeight: 17 },

  // Footer
  footer: { alignItems: 'center', paddingTop: 28, paddingHorizontal: 24, gap: 4 },
  footerText: { fontSize: 11, color: Colors.textTertiary, textAlign: 'center' },
  footerVersion: { fontSize: 10, color: Colors.textTertiary },
});
