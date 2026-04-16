/**
 * AarogyaNetra AI — Welcome & Onboarding Flow
 * Steps:
 *  1. Splash / Welcome
 *  2. Language selection
 *  3. Permission requests (camera + location)
 *  4. Assistive mode opt-in
 *  5. Profile setup (name, age, gender, weight, height)
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ScrollView,
  TextInput,
  Alert,
  Dimensions,
  StatusBar,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Colors } from '../theme';
import { useAppStore } from '../store/useAppStore';

const { width, height } = Dimensions.get('window');

// ─── Types ────────────────────────────────────────────
type Step = 'welcome' | 'language' | 'permissions' | 'assistive' | 'profile';

interface Props {
  onComplete: () => void;
}

// ─── Language Data ────────────────────────────────────
const LANGUAGES = [
  { code: 'en', label: 'English', native: 'English', flag: '🇬🇧' },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी', flag: '🇮🇳' },
  { code: 'bn', label: 'Bengali', native: 'বাংলা', flag: '🇮🇳' },
  { code: 'te', label: 'Telugu', native: 'తెలుగు', flag: '🇮🇳' },
  { code: 'mr', label: 'Marathi', native: 'मराठी', flag: '🇮🇳' },
  { code: 'ta', label: 'Tamil', native: 'தமிழ்', flag: '🇮🇳' },
  { code: 'gu', label: 'Gujarati', native: 'ગુજરાતી', flag: '🇮🇳' },
  { code: 'kn', label: 'Kannada', native: 'ಕನ್ನಡ', flag: '🇮🇳' },
];

// ─── Animated Pill Button ─────────────────────────────
const PillButton: React.FC<{
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'outline' | 'ghost';
  style?: object;
}> = ({ label, onPress, variant = 'primary', style }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const press = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.96, duration: 80, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start();
    onPress();
  };
  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <TouchableOpacity
        style={[
          pillBtnStyles.btn,
          variant === 'primary' && pillBtnStyles.primary,
          variant === 'outline' && pillBtnStyles.outline,
          variant === 'ghost' && pillBtnStyles.ghost,
        ]}
        onPress={press}
        activeOpacity={1}
      >
        <Text
          style={[
            pillBtnStyles.label,
            variant === 'primary' && pillBtnStyles.labelPrimary,
            variant === 'outline' && pillBtnStyles.labelOutline,
            variant === 'ghost' && pillBtnStyles.labelGhost,
          ]}
        >
          {label}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
};
const pillBtnStyles = StyleSheet.create({
  btn: { borderRadius: 999, paddingVertical: 18, paddingHorizontal: 32, alignItems: 'center' },
  primary: { backgroundColor: Colors.primary, elevation: 4, shadowColor: '#006e2f', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.22, shadowRadius: 16 },
  outline: { borderWidth: 2, borderColor: Colors.primary },
  ghost: {},
  label: { fontSize: 16, fontWeight: '700', letterSpacing: 0.2 },
  labelPrimary: { color: '#fff' },
  labelOutline: { color: Colors.primary },
  labelGhost: { color: Colors.textSecondary },
});

// ─── Step Indicator ───────────────────────────────────
const StepDots: React.FC<{ current: number; total: number }> = ({ current, total }) => (
  <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'center', marginBottom: 32 }}>
    {Array.from({ length: total }).map((_, i) => (
      <View
        key={i}
        style={{
          width: i === current ? 20 : 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: i === current ? Colors.primary : Colors.surfaceBorder,
        }}
      />
    ))}
  </View>
);

// ═══════════════════════════════════════════════════════
// STEP 1 – Welcome Splash
// ═══════════════════════════════════════════════════════
const WelcomeStep: React.FC<{ onNext: () => void }> = ({ onNext }) => {
  const fade = useRef(new Animated.Value(0)).current;
  const slideY = useRef(new Animated.Value(30)).current;
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(slideY, { toValue: 0, duration: 700, useNativeDriver: true }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.06, duration: 1800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 1800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={welcomeStyles.container}>
      {/* Background gradient orbs */}
      <View style={welcomeStyles.orb1} />
      <View style={welcomeStyles.orb2} />

      <Animated.View style={[welcomeStyles.content, { opacity: fade, transform: [{ translateY: slideY }] }]}>
        {/* Logo */}
        <Animated.View style={[welcomeStyles.logoWrap, { transform: [{ scale: pulse }] }]}>
          <View style={welcomeStyles.logoOuter}>
            <View style={welcomeStyles.logoInner}>
              <Text style={welcomeStyles.logoEmoji}>🏥</Text>
            </View>
          </View>
        </Animated.View>

        {/* Branding */}
        <Text style={welcomeStyles.brand}>AarogyaNetra AI</Text>
        <Text style={welcomeStyles.tagline}>Welcome to AarogyaNetra AI</Text>
        <Text style={welcomeStyles.subtitle}>
          Your AI-powered health assistant for{'\n'}early risk detection — right from your phone.
        </Text>

        {/* Feature pills */}
        <View style={welcomeStyles.features}>
          {[
            { icon: '📷', text: 'Face & Eye Scan' },
            { icon: '🧠', text: 'AI Risk Analysis' },
            { icon: '🔒', text: '100% Offline' },
          ].map((f, i) => (
            <View key={i} style={welcomeStyles.featurePill}>
              <Text style={welcomeStyles.featureIcon}>{f.icon}</Text>
              <Text style={welcomeStyles.featureText}>{f.text}</Text>
            </View>
          ))}
        </View>

        {/* CTA */}
        <PillButton label="Get Started →" onPress={onNext} style={welcomeStyles.cta} />

        <Text style={welcomeStyles.footNote}>🇮🇳 Made in India · Free · No internet required</Text>
      </Animated.View>
    </View>
  );
};

const welcomeStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0faf3', alignItems: 'center', justifyContent: 'center' },
  orb1: { position: 'absolute', top: -80, right: -60, width: 280, height: 280, borderRadius: 140, backgroundColor: 'rgba(0,110,47,0.07)' },
  orb2: { position: 'absolute', bottom: -60, left: -40, width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(34,197,94,0.07)' },
  content: { alignItems: 'center', paddingHorizontal: 32 },
  logoWrap: { marginBottom: 28 },
  logoOuter: { width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(0,110,47,0.1)', alignItems: 'center', justifyContent: 'center' },
  logoInner: { width: 88, height: 88, borderRadius: 44, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', elevation: 8, shadowColor: '#006e2f', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16 },
  logoEmoji: { fontSize: 40 },
  brand: { fontSize: 13, fontWeight: '700', color: Colors.primary, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 },
  tagline: { fontSize: 28, fontWeight: '800', color: Colors.textPrimary, textAlign: 'center', letterSpacing: -0.5, lineHeight: 34 },
  subtitle: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', marginTop: 10, lineHeight: 23, marginBottom: 32 },
  features: { flexDirection: 'row', gap: 8, marginBottom: 36, flexWrap: 'wrap', justifyContent: 'center' },
  featurePill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, gap: 6, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6 },
  featureIcon: { fontSize: 14 },
  featureText: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  cta: { width: width - 64, marginBottom: 20 },
  footNote: { fontSize: 12, color: Colors.textTertiary, textAlign: 'center' },
});

// ═══════════════════════════════════════════════════════
// STEP 2 – Language Selection
// ═══════════════════════════════════════════════════════
const LanguageStep: React.FC<{ onNext: () => void }> = ({ onNext }) => {
  const [selected, setSelected] = useState('en');
  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(fade, { toValue: 1, duration: 400, useNativeDriver: true }).start(); }, []);

  return (
    <Animated.View style={[langStyles.container, { opacity: fade }]}>
      <StepDots current={1} total={5} />
      <Text style={langStyles.title}>Choose Your Language</Text>
      <Text style={langStyles.subtitle}>Select the language you're most comfortable with</Text>

      <ScrollView style={langStyles.list} showsVerticalScrollIndicator={false}>
        {LANGUAGES.map((lang) => (
          <TouchableOpacity
            key={lang.code}
            style={[langStyles.langCard, selected === lang.code && langStyles.langCardActive]}
            onPress={() => setSelected(lang.code)}
            activeOpacity={0.7}
          >
            <Text style={langStyles.flag}>{lang.flag}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[langStyles.nativeName, selected === lang.code && langStyles.nativeNameActive]}>
                {lang.native}
              </Text>
              <Text style={langStyles.englishName}>{lang.label}</Text>
            </View>
            {selected === lang.code && (
              <View style={langStyles.checkCircle}>
                <Text style={langStyles.checkMark}>✓</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      <PillButton label="Continue" onPress={onNext} style={langStyles.btn} />
    </Animated.View>
  );
};

const langStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, paddingHorizontal: 24, paddingTop: 24 },
  title: { fontSize: 26, fontWeight: '800', color: Colors.textPrimary, letterSpacing: -0.5, marginBottom: 6 },
  subtitle: { fontSize: 14, color: Colors.textSecondary, marginBottom: 20 },
  list: { flex: 1 },
  langCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1.5, borderColor: Colors.surfaceBorder, gap: 14 },
  langCardActive: { borderColor: Colors.primary, backgroundColor: 'rgba(0,110,47,0.04)' },
  flag: { fontSize: 28 },
  nativeName: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  nativeNameActive: { color: Colors.primary },
  englishName: { fontSize: 12, color: Colors.textTertiary, marginTop: 2 },
  checkCircle: { width: 26, height: 26, borderRadius: 13, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  checkMark: { color: '#fff', fontSize: 14, fontWeight: '800' },
  btn: { marginVertical: 20 },
});

// ═══════════════════════════════════════════════════════
// STEP 3 – Permissions
// ═══════════════════════════════════════════════════════
const PermissionsStep: React.FC<{ onNext: () => void }> = ({ onNext }) => {
  const [cameraGranted, setCameraGranted] = useState(false);
  const [locationGranted, setLocationGranted] = useState(false);
  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(fade, { toValue: 1, duration: 400, useNativeDriver: true }).start(); }, []);

  const requestCamera = () => {
    Alert.alert(
      '📷 Camera Access',
      'AarogyaNetra needs camera access to perform face and eye scanning for health analysis.',
      [
        { text: 'Not Now', style: 'cancel' },
        { text: 'Allow', onPress: () => setCameraGranted(true) },
      ]
    );
  };

  const requestLocation = () => {
    Alert.alert(
      '📍 Location Access',
      'Location helps us suggest nearby doctors and clinics based on your health results.',
      [
        { text: 'Not Now', style: 'cancel', onPress: () => setLocationGranted(false) },
        { text: 'Allow', onPress: () => setLocationGranted(true) },
      ]
    );
  };

  return (
    <Animated.View style={[permStyles.container, { opacity: fade }]}>
      <StepDots current={2} total={5} />

      <Text style={permStyles.title}>App Permissions</Text>
      <Text style={permStyles.subtitle}>
        We need a couple of permissions to give you the best experience
      </Text>

      {/* Camera */}
      <TouchableOpacity
        style={[permStyles.permCard, cameraGranted && permStyles.permCardGranted]}
        onPress={requestCamera}
        activeOpacity={0.85}
      >
        <View style={[permStyles.permIcon, cameraGranted && permStyles.permIconGranted]}>
          <Text style={{ fontSize: 28 }}>📷</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={permStyles.permTitle}>Camera Access</Text>
          <Text style={permStyles.permDesc}>Required for face scan & eye analysis</Text>
        </View>
        <View style={[permStyles.statusBadge, cameraGranted ? permStyles.statusGranted : permStyles.statusPending]}>
          <Text style={[permStyles.statusText, { color: cameraGranted ? Colors.success : Colors.warning }]}>
            {cameraGranted ? '✓ Allowed' : 'Tap to Allow'}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Location */}
      <TouchableOpacity
        style={[permStyles.permCard, locationGranted && permStyles.permCardGranted]}
        onPress={requestLocation}
        activeOpacity={0.85}
      >
        <View style={[permStyles.permIcon, locationGranted && permStyles.permIconGranted]}>
          <Text style={{ fontSize: 28 }}>📍</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={permStyles.permTitle}>Location Access</Text>
          <Text style={permStyles.permDesc}>Optional — for nearby doctor suggestions</Text>
        </View>
        <View style={[permStyles.statusBadge, locationGranted ? permStyles.statusGranted : permStyles.statusOptional]}>
          <Text style={[permStyles.statusText, { color: locationGranted ? Colors.success : Colors.textTertiary }]}>
            {locationGranted ? '✓ Allowed' : 'Optional'}
          </Text>
        </View>
      </TouchableOpacity>

      <View style={permStyles.privacyNote}>
        <Text style={permStyles.privacyIcon}>🔒</Text>
        <Text style={permStyles.privacyText}>
          All analysis happens on your device. No data is sent to any server. Your privacy is guaranteed.
        </Text>
      </View>

      <PillButton
        label={cameraGranted ? 'Continue →' : 'Continue without camera'}
        onPress={onNext}
        variant={cameraGranted ? 'primary' : 'outline'}
        style={permStyles.btn}
      />
    </Animated.View>
  );
};

const permStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, paddingHorizontal: 24, paddingTop: 24 },
  title: { fontSize: 26, fontWeight: '800', color: Colors.textPrimary, letterSpacing: -0.5, marginBottom: 6 },
  subtitle: { fontSize: 14, color: Colors.textSecondary, marginBottom: 24, lineHeight: 20 },
  permCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 18, padding: 18, marginBottom: 14, borderWidth: 1.5, borderColor: Colors.surfaceBorder, gap: 14, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6 },
  permCardGranted: { borderColor: Colors.success, backgroundColor: Colors.successLight },
  permIcon: { width: 56, height: 56, borderRadius: 16, backgroundColor: Colors.surfaceContainerLow, alignItems: 'center', justifyContent: 'center' },
  permIconGranted: { backgroundColor: Colors.successLight },
  permTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  permDesc: { fontSize: 12, color: Colors.textTertiary, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  statusGranted: { backgroundColor: Colors.successLight },
  statusPending: { backgroundColor: Colors.warningLight },
  statusOptional: { backgroundColor: Colors.surfaceContainerLow },
  statusText: { fontSize: 11, fontWeight: '700' },
  privacyNote: { flexDirection: 'row', gap: 10, backgroundColor: 'rgba(0,110,47,0.06)', borderRadius: 14, padding: 16, marginTop: 8, alignItems: 'flex-start' },
  privacyIcon: { fontSize: 18 },
  privacyText: { flex: 1, fontSize: 13, color: Colors.textSecondary, lineHeight: 19 },
  btn: { marginTop: 24 },
});

// ═══════════════════════════════════════════════════════
// STEP 4 – Assistive Mode
// ═══════════════════════════════════════════════════════
const AssistiveStep: React.FC<{ onNext: (assistive: boolean) => void }> = ({ onNext }) => {
  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(fade, { toValue: 1, duration: 400, useNativeDriver: true }).start(); }, []);

  return (
    <Animated.View style={[assistStyles.container, { opacity: fade }]}>
      <StepDots current={3} total={5} />

      <Text style={assistStyles.title}>Assistive Mode</Text>
      <Text style={assistStyles.subtitle}>
        Are you new to health apps? We can guide you step-by-step with voice prompts and extra instructions.
      </Text>

      <View style={assistStyles.illustration}>
        <Text style={{ fontSize: 64 }}>🦮</Text>
      </View>

      <View style={assistStyles.featureList}>
        {[
          { icon: '🔊', title: 'Voice Guidance', desc: 'Audio instructions at each step' },
          { icon: '📖', title: 'Simplified Text', desc: 'Easy-to-understand language' },
          { icon: '🐢', title: 'Slower Pace', desc: 'More time at each screen' },
          { icon: '❓', title: 'Help Bubbles', desc: 'Tap any element for explanation' },
        ].map((f, i) => (
          <View key={i} style={assistStyles.featureRow}>
            <Text style={assistStyles.featureIcon}>{f.icon}</Text>
            <View>
              <Text style={assistStyles.featureTitle}>{f.title}</Text>
              <Text style={assistStyles.featureDesc}>{f.desc}</Text>
            </View>
          </View>
        ))}
      </View>

      <PillButton label="Enable Assistive Mode" onPress={() => onNext(true)} style={assistStyles.primaryBtn} />
      <PillButton label="Skip — I'm comfortable" onPress={() => onNext(false)} variant="ghost" style={{ marginTop: 8 }} />
    </Animated.View>
  );
};

const assistStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, paddingHorizontal: 24, paddingTop: 24 },
  title: { fontSize: 26, fontWeight: '800', color: Colors.textPrimary, letterSpacing: -0.5, marginBottom: 6 },
  subtitle: { fontSize: 14, color: Colors.textSecondary, lineHeight: 21, marginBottom: 20 },
  illustration: { alignItems: 'center', paddingVertical: 16 },
  featureList: { backgroundColor: '#fff', borderRadius: 18, padding: 18, marginBottom: 28, borderWidth: 1, borderColor: Colors.surfaceBorder, gap: 14 },
  featureRow: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  featureIcon: { fontSize: 22, marginTop: 1 },
  featureTitle: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  featureDesc: { fontSize: 12, color: Colors.textTertiary, marginTop: 1 },
  primaryBtn: { marginTop: 4 },
});

// ═══════════════════════════════════════════════════════
// STEP 5 – Profile Setup
// ═══════════════════════════════════════════════════════
const GENDERS = [
  { value: 'male', label: 'Male', emoji: '👨' },
  { value: 'female', label: 'Female', emoji: '👩' },
  { value: 'other', label: 'Other', emoji: '🧑' },
] as const;

const ProfileSetupStep: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const { setUser } = useAppStore();
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('male');
  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(fade, { toValue: 1, duration: 400, useNativeDriver: true }).start(); }, []);

  const handleDone = () => {
    if (!name.trim()) return Alert.alert('Missing', 'Please enter your full name.');
    const parsedAge = parseInt(age, 10);
    if (!age || isNaN(parsedAge) || parsedAge < 1 || parsedAge > 120)
      return Alert.alert('Invalid', 'Please enter a valid age (1–120).');
    if (!weight || parseFloat(weight) < 10)
      return Alert.alert('Invalid', 'Please enter a valid weight in kg.');
    if (!height || parseFloat(height) < 50)
      return Alert.alert('Invalid', 'Please enter a valid height in cm.');

    const heightM = parseFloat(height) / 100;
    const bmi = parseFloat((parseFloat(weight) / (heightM * heightM)).toFixed(1));

    setUser({
      name: name.trim(),
      age: parsedAge,
      gender,
      weight: parseFloat(weight),
      height: parseFloat(height),
      bmi,
    });
    onComplete();
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={{ flex: 1, backgroundColor: Colors.background }}
        contentContainerStyle={profileSetupStyles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View style={{ opacity: fade }}>
          <StepDots current={4} total={5} />

          <Text style={profileSetupStyles.title}>About You</Text>
          <Text style={profileSetupStyles.subtitle}>
            A few quick details help us give you accurate health insights
          </Text>

          {/* Name */}
          <Text style={profileSetupStyles.label}>Full Name</Text>
          <TextInput
            style={profileSetupStyles.input}
            value={name}
            onChangeText={setName}
            placeholder="Enter your full name"
            placeholderTextColor={Colors.textTertiary}
            autoCapitalize="words"
          />

          {/* Age + Gender */}
          <View style={profileSetupStyles.row}>
            <View style={{ flex: 1 }}>
              <Text style={profileSetupStyles.label}>Age</Text>
              <TextInput
                style={profileSetupStyles.input}
                value={age}
                onChangeText={setAge}
                placeholder="e.g. 30"
                placeholderTextColor={Colors.textTertiary}
                keyboardType="numeric"
                maxLength={3}
              />
            </View>
          </View>

          {/* Gender */}
          <Text style={profileSetupStyles.label}>Gender</Text>
          <View style={profileSetupStyles.genderRow}>
            {GENDERS.map((g) => (
              <TouchableOpacity
                key={g.value}
                style={[profileSetupStyles.genderChip, gender === g.value && profileSetupStyles.genderChipActive]}
                onPress={() => setGender(g.value)}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 20 }}>{g.emoji}</Text>
                <Text style={[profileSetupStyles.genderText, gender === g.value && profileSetupStyles.genderTextActive]}>
                  {g.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Weight & Height */}
          <View style={profileSetupStyles.row}>
            <View style={{ flex: 1 }}>
              <Text style={profileSetupStyles.label}>Weight (kg)</Text>
              <TextInput
                style={profileSetupStyles.input}
                value={weight}
                onChangeText={setWeight}
                placeholder="65"
                placeholderTextColor={Colors.textTertiary}
                keyboardType="numeric"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={profileSetupStyles.label}>Height (cm)</Text>
              <TextInput
                style={profileSetupStyles.input}
                value={height}
                onChangeText={setHeight}
                placeholder="170"
                placeholderTextColor={Colors.textTertiary}
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* Privacy */}
          <View style={profileSetupStyles.privacyBadge}>
            <Text style={profileSetupStyles.privacyText}>
              🔐 Encrypted locally — data never leaves your device
            </Text>
          </View>

          <PillButton label="Start Health Journey →" onPress={handleDone} style={{ marginTop: 8 }} />
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const profileSetupStyles = StyleSheet.create({
  scroll: { padding: 24, paddingBottom: 60 },
  title: { fontSize: 26, fontWeight: '800', color: Colors.textPrimary, letterSpacing: -0.5, marginBottom: 6 },
  subtitle: { fontSize: 14, color: Colors.textSecondary, lineHeight: 21, marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: 8, marginTop: 4, letterSpacing: 0.3 },
  input: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1.5, borderColor: Colors.surfaceBorder, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: Colors.textPrimary, marginBottom: 14 },
  row: { flexDirection: 'row', gap: 12 },
  genderRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  genderChip: { flex: 1, backgroundColor: Colors.surfaceContainerLow, borderRadius: 14, paddingVertical: 14, alignItems: 'center', gap: 4, borderWidth: 1.5, borderColor: Colors.surfaceBorder },
  genderChipActive: { backgroundColor: 'rgba(0,110,47,0.06)', borderColor: Colors.primary },
  genderText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  genderTextActive: { color: Colors.primary },
  privacyBadge: { alignItems: 'center', marginVertical: 12 },
  privacyText: { fontSize: 12, color: Colors.textTertiary },
});

// ═══════════════════════════════════════════════════════
// MAIN EXPORT — Orchestrates all steps
// ═══════════════════════════════════════════════════════
export const WelcomeScreen: React.FC<Props> = ({ onComplete }) => {
  const [step, setStep] = useState<Step>('welcome');

  const next = (s: Step) => setStep(s);

  return (
    <View style={{ flex: 1 }}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {step === 'welcome' && <WelcomeStep onNext={() => next('language')} />}
      {step === 'language' && <LanguageStep onNext={() => next('permissions')} />}
      {step === 'permissions' && <PermissionsStep onNext={() => next('assistive')} />}
      {step === 'assistive' && <AssistiveStep onNext={() => next('profile')} />}
      {step === 'profile' && <ProfileSetupStep onComplete={onComplete} />}
    </View>
  );
};
