/**
 * AarogyaNetra AI — Welcome & Onboarding Flow (Multilingual)
 * Steps:
 *  1. Splash / Welcome
 *  2. Language selection (22 Indian + 14 global, grouped by section)
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
  SectionList,
} from 'react-native';
import { Colors } from '../theme';
import { useAppStore } from '../store/useAppStore';
import { LANGUAGE_LIST, getTranslations, type LanguageCode } from '../i18n/translations';

const { width } = Dimensions.get('window');

// ─── Types ────────────────────────────────────────────
type Step = 'welcome' | 'language' | 'permissions' | 'assistive' | 'profile';

interface Props {
  onComplete: () => void;
}

// ─── Grouped Language Sections ────────────────────────
const LANGUAGE_SECTIONS = [
  {
    title: '🇮🇳 Indian Languages',
    data: LANGUAGE_LIST.filter(l => l.group === 'indian'),
  },
  {
    title: '🌐 World Languages',
    data: LANGUAGE_LIST.filter(l => l.group === 'global'),
  },
];

// ─── Animated Pill Button ─────────────────────────────
const PillBtn: React.FC<{
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
          pb.btn,
          variant === 'primary' && pb.primary,
          variant === 'outline' && pb.outline,
          variant === 'ghost'   && pb.ghost,
        ]}
        onPress={press}
        activeOpacity={1}
      >
        <Text style={[pb.lbl, variant === 'primary' && pb.lblPrimary, variant === 'outline' && pb.lblOutline, variant === 'ghost' && pb.lblGhost]}>
          {label}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
};
const pb = StyleSheet.create({
  btn:        { borderRadius: 999, paddingVertical: 18, paddingHorizontal: 32, alignItems: 'center' },
  primary:    { backgroundColor: Colors.primary, elevation: 4, shadowColor: '#006e2f', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.22, shadowRadius: 16 },
  outline:    { borderWidth: 2, borderColor: Colors.primary },
  ghost:      {},
  lbl:        { fontSize: 16, fontWeight: '700', letterSpacing: 0.2 },
  lblPrimary: { color: '#fff' },
  lblOutline: { color: Colors.primary },
  lblGhost:   { color: Colors.textSecondary },
});

// ─── Step Dots ───────────────────────────────────────
const StepDots: React.FC<{ current: number; total: number }> = ({ current, total }) => (
  <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'center', marginBottom: 28 }}>
    {Array.from({ length: total }).map((_, i) => (
      <View key={i} style={{
        width: i === current ? 22 : 8, height: 8, borderRadius: 4,
        backgroundColor: i === current ? Colors.primary : Colors.surfaceBorder,
      }} />
    ))}
  </View>
);

// ═══════════════════════════════════════════════════════
// STEP 1 – Welcome Splash
// ═══════════════════════════════════════════════════════
const WelcomeStep: React.FC<{ onNext: () => void }> = ({ onNext }) => {
  const fade   = useRef(new Animated.Value(0)).current;
  const slideY = useRef(new Animated.Value(30)).current;
  const pulse  = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade,   { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(slideY, { toValue: 0, duration: 700, useNativeDriver: true }),
    ]).start();
    Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1.06, duration: 1800, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1,    duration: 1800, useNativeDriver: true }),
    ])).start();
  }, []);

  return (
    <View style={ws.container}>
      <View style={ws.orb1} />
      <View style={ws.orb2} />
      <Animated.View style={[ws.content, { opacity: fade, transform: [{ translateY: slideY }] }]}>
        <Animated.View style={{ transform: [{ scale: pulse }], marginBottom: 28 }}>
          <View style={ws.logoOuter}>
            <View style={ws.logoInner}>
              <Text style={{ fontSize: 40 }}>🏥</Text>
            </View>
          </View>
        </Animated.View>

        <Text style={ws.brand}>AarogyaNetra AI</Text>
        <Text style={ws.tagline}>{'Contactless Health Screening\nPowered by AI'}</Text>
        <Text style={ws.subtitle}>{'Early risk detection for Diabetes,\nHypertension & Anemia — from your phone.'}</Text>

        <View style={ws.features}>
          {[
            { icon: '📷', text: 'Face Scan' },
            { icon: '🧠', text: 'AI Analysis' },
            { icon: '🔒', text: '100% Offline' },
            { icon: '🇮🇳', text: '22+ Languages' },
          ].map((f, i) => (
            <View key={i} style={ws.pill}>
              <Text style={{ fontSize: 14 }}>{f.icon}</Text>
              <Text style={ws.pillTxt}>{f.text}</Text>
            </View>
          ))}
        </View>

        <PillBtn label="Get Started →" onPress={onNext} style={{ width: width - 64, marginBottom: 20 }} />
        <Text style={ws.foot}>🇮🇳 Made in India · Free · No internet required</Text>
      </Animated.View>
    </View>
  );
};

const ws = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0faf3', alignItems: 'center', justifyContent: 'center' },
  orb1:      { position: 'absolute', top: -80,  right: -60, width: 280, height: 280, borderRadius: 140, backgroundColor: 'rgba(0,110,47,0.07)' },
  orb2:      { position: 'absolute', bottom: -60, left: -40, width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(34,197,94,0.07)' },
  content:   { alignItems: 'center', paddingHorizontal: 32 },
  logoOuter: { width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(0,110,47,0.1)', alignItems: 'center', justifyContent: 'center' },
  logoInner: { width: 88, height: 88, borderRadius: 44, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', elevation: 8, shadowColor: '#006e2f', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16 },
  brand:     { fontSize: 11, fontWeight: '700', color: Colors.primary, letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 12 },
  tagline:   { fontSize: 26, fontWeight: '800', color: Colors.textPrimary, textAlign: 'center', letterSpacing: -0.5, lineHeight: 32 },
  subtitle:  { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginTop: 10, lineHeight: 22, marginBottom: 28 },
  features:  { flexDirection: 'row', gap: 8, marginBottom: 32, flexWrap: 'wrap', justifyContent: 'center' },
  pill:      { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, gap: 5, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6 },
  pillTxt:   { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  foot:      { fontSize: 12, color: Colors.textTertiary, textAlign: 'center' },
});

// ═══════════════════════════════════════════════════════
// STEP 2 – Language Selection
// ═══════════════════════════════════════════════════════
const LanguageStep: React.FC<{ onNext: () => void }> = ({ onNext }) => {
  const { language, setLanguage } = useAppStore();
  const [selected, setSelected] = useState<LanguageCode>((language as LanguageCode) || 'en');
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  const handleSelect = (code: LanguageCode) => {
    setSelected(code);
    setLanguage(code); // persists + triggers re-render of other screens immediately
  };

  // Translate this screen in the CHOSEN language (live preview)
  const tr = getTranslations(selected);

  return (
    <Animated.View style={[ls.container, { opacity: fade }]}>
      <StepDots current={1} total={5} />
      <Text style={ls.title}>{tr.choose_language}</Text>
      <Text style={ls.subtitle}>{tr.language_subtitle}</Text>

      <SectionList
        sections={LANGUAGE_SECTIONS}
        keyExtractor={item => item.code}
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => (
          <View style={ls.sectionHdr}>
            <Text style={ls.sectionHdrTxt}>{section.title}</Text>
          </View>
        )}
        renderItem={({ item: lang }) => {
          const active = selected === lang.code;
          return (
            <TouchableOpacity
              style={[ls.card, active && ls.cardActive]}
              onPress={() => handleSelect(lang.code as LanguageCode)}
              activeOpacity={0.75}
            >
              <Text style={ls.flag}>{lang.flag}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[ls.native, active && ls.nativeActive]}>{lang.native}</Text>
                <Text style={ls.english}>{lang.label}</Text>
              </View>
              {active && (
                <View style={ls.check}>
                  <Text style={{ color: '#fff', fontSize: 14, fontWeight: '800' }}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        }}
      />

      <View style={{ paddingBottom: 12 }}>
        <PillBtn label={tr.continue} onPress={onNext} />
      </View>
    </Animated.View>
  );
};

const ls = StyleSheet.create({
  container:    { flex: 1, backgroundColor: Colors.background, paddingHorizontal: 22, paddingTop: 22 },
  title:        { fontSize: 26, fontWeight: '800', color: Colors.textPrimary, letterSpacing: -0.5, marginBottom: 4 },
  subtitle:     { fontSize: 14, color: Colors.textSecondary, marginBottom: 12, lineHeight: 20 },
  sectionHdr:   { backgroundColor: Colors.background, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder, marginTop: 6, marginBottom: 6 },
  sectionHdrTxt:{ fontSize: 12, fontWeight: '700', color: Colors.primary, letterSpacing: 0.8, textTransform: 'uppercase' },
  card:         { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1.5, borderColor: Colors.surfaceBorder, gap: 14 },
  cardActive:   { borderColor: Colors.primary, backgroundColor: 'rgba(0,110,47,0.04)' },
  flag:         { fontSize: 24 },
  native:       { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  nativeActive: { color: Colors.primary },
  english:      { fontSize: 11, color: Colors.textTertiary, marginTop: 2 },
  check:        { width: 26, height: 26, borderRadius: 13, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
});

// ═══════════════════════════════════════════════════════
// STEP 3 – Permissions
// ═══════════════════════════════════════════════════════
const PermissionsStep: React.FC<{ onNext: () => void }> = ({ onNext }) => {
  const { language } = useAppStore();
  const tr = getTranslations((language as LanguageCode) || 'en');
  const [cameraGranted,   setCameraGranted]   = useState(false);
  const [locationGranted, setLocationGranted] = useState(false);
  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(fade, { toValue: 1, duration: 400, useNativeDriver: true }).start(); }, []);

  const askCamera = () => Alert.alert(`📷 ${tr.camera_access}`, tr.camera_desc, [
    { text: tr.not_now, style: 'cancel' },
    { text: tr.allow, onPress: () => setCameraGranted(true) },
  ]);

  const askLocation = () => Alert.alert(`📍 ${tr.location_access}`, tr.location_desc, [
    { text: tr.not_now, style: 'cancel' },
    { text: tr.allow, onPress: () => setLocationGranted(true) },
  ]);

  const PermCard: React.FC<{
    icon: string; title: string; desc: string;
    granted: boolean; badge: string; statusColor: string;
    bgColor: string; onPress: () => void;
  }> = ({ icon, title, desc, granted, badge, statusColor, bgColor, onPress }) => (
    <TouchableOpacity
      style={[ps.card, granted && { borderColor: Colors.success, backgroundColor: Colors.successLight }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={[ps.icon, granted && { backgroundColor: Colors.successLight }]}>
        <Text style={{ fontSize: 28 }}>{icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={ps.cardTitle}>{title}</Text>
        <Text style={ps.cardDesc}>{desc}</Text>
      </View>
      <View style={[ps.badge, { backgroundColor: bgColor }]}>
        <Text style={[ps.badgeTxt, { color: statusColor }]}>{badge}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <Animated.View style={[ps.container, { opacity: fade }]}>
      <StepDots current={2} total={5} />
      <Text style={ps.title}>{tr.permissions_title}</Text>
      <Text style={ps.subtitle}>{tr.permissions_subtitle}</Text>

      <PermCard
        icon="📷" title={tr.camera_access} desc={tr.camera_desc}
        granted={cameraGranted}
        badge={cameraGranted ? tr.allowed : tr.tap_to_allow}
        statusColor={cameraGranted ? Colors.success : Colors.warning}
        bgColor={cameraGranted ? Colors.successLight : Colors.warningLight}
        onPress={askCamera}
      />
      <PermCard
        icon="📍" title={tr.location_access} desc={tr.location_desc}
        granted={locationGranted}
        badge={locationGranted ? tr.allowed : tr.optional}
        statusColor={locationGranted ? Colors.success : Colors.textTertiary}
        bgColor={locationGranted ? Colors.successLight : Colors.surfaceContainerLow}
        onPress={askLocation}
      />

      <View style={ps.privacy}>
        <Text style={{ fontSize: 18 }}>🔒</Text>
        <Text style={ps.privacyTxt}>{tr.privacy_note}</Text>
      </View>

      <PillBtn
        label={cameraGranted ? `${tr.continue} →` : tr.continue_without_camera}
        onPress={onNext}
        variant={cameraGranted ? 'primary' : 'outline'}
        style={{ marginTop: 20 }}
      />
    </Animated.View>
  );
};

const ps = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, paddingHorizontal: 22, paddingTop: 22 },
  title:     { fontSize: 26, fontWeight: '800', color: Colors.textPrimary, letterSpacing: -0.5, marginBottom: 4 },
  subtitle:  { fontSize: 14, color: Colors.textSecondary, lineHeight: 20, marginBottom: 22 },
  card:      { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 18, padding: 18, marginBottom: 14, borderWidth: 1.5, borderColor: Colors.surfaceBorder, gap: 14 },
  icon:      { width: 52, height: 52, borderRadius: 14, backgroundColor: Colors.surfaceContainerLow, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  cardDesc:  { fontSize: 12, color: Colors.textTertiary, marginTop: 2 },
  badge:     { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  badgeTxt:  { fontSize: 11, fontWeight: '700' },
  privacy:   { flexDirection: 'row', gap: 10, backgroundColor: 'rgba(0,110,47,0.06)', borderRadius: 14, padding: 14, marginTop: 8, alignItems: 'flex-start' },
  privacyTxt:{ flex: 1, fontSize: 13, color: Colors.textSecondary, lineHeight: 19 },
});

// ═══════════════════════════════════════════════════════
// STEP 4 – Assistive Mode
// ═══════════════════════════════════════════════════════
const AssistiveStep: React.FC<{ onNext: (a: boolean) => void }> = ({ onNext }) => {
  const { language } = useAppStore();
  const tr = getTranslations((language as LanguageCode) || 'en');
  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(fade, { toValue: 1, duration: 400, useNativeDriver: true }).start(); }, []);

  const FEATURES = [
    { icon: '🔊', title: tr.voice_guidance,   desc: tr.voice_guidance_desc   },
    { icon: '📖', title: tr.simplified_text,  desc: tr.simplified_text_desc  },
    { icon: '🐢', title: tr.slower_pace,      desc: tr.slower_pace_desc      },
    { icon: '❓', title: tr.help_bubbles,     desc: tr.help_bubbles_desc     },
  ];

  return (
    <Animated.View style={[as.container, { opacity: fade }]}>
      <StepDots current={3} total={5} />
      <Text style={as.title}>{tr.assistive_mode}</Text>
      <Text style={as.subtitle}>{tr.assistive_subtitle}</Text>

      <View style={as.illustration}>
        <Text style={{ fontSize: 64 }}>🦮</Text>
      </View>

      <View style={as.list}>
        {FEATURES.map((f, i) => (
          <View key={i} style={as.row}>
            <Text style={{ fontSize: 22 }}>{f.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={as.fTitle}>{f.title}</Text>
              <Text style={as.fDesc}>{f.desc}</Text>
            </View>
          </View>
        ))}
      </View>

      <PillBtn label={tr.enable_assistive} onPress={() => onNext(true)} />
      <PillBtn label={tr.skip_assistive} variant="ghost" onPress={() => onNext(false)} style={{ marginTop: 8 }} />
    </Animated.View>
  );
};

const as = StyleSheet.create({
  container:    { flex: 1, backgroundColor: Colors.background, paddingHorizontal: 22, paddingTop: 22 },
  title:        { fontSize: 26, fontWeight: '800', color: Colors.textPrimary, letterSpacing: -0.5, marginBottom: 4 },
  subtitle:     { fontSize: 14, color: Colors.textSecondary, lineHeight: 21, marginBottom: 16 },
  illustration: { alignItems: 'center', paddingVertical: 12 },
  list:         { backgroundColor: '#fff', borderRadius: 18, padding: 18, marginBottom: 28, borderWidth: 1, borderColor: Colors.surfaceBorder, gap: 14 },
  row:          { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  fTitle:       { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  fDesc:        { fontSize: 12, color: Colors.textTertiary, marginTop: 1 },
});

// ═══════════════════════════════════════════════════════
// STEP 5 – Profile Setup
// ═══════════════════════════════════════════════════════
const ProfileSetupStep: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const { setUser, language } = useAppStore();
  const tr = getTranslations((language as LanguageCode) || 'en');

  const [name,   setName]   = useState('');
  const [age,    setAge]    = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('male');
  const [abhaId, setAbhaId] = useState('');
  const [abhaError, setAbhaError] = useState<string | undefined>();
  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(fade, { toValue: 1, duration: 400, useNativeDriver: true }).start(); }, []);

  const GENDERS = [
    { value: 'male'   as const, label: tr.male,   emoji: '👨' },
    { value: 'female' as const, label: tr.female, emoji: '👩' },
    { value: 'other'  as const, label: tr.other,  emoji: '🧑' },
  ];

  // ABHA validation
  const handleAbhaChange = (text: string) => {
    setAbhaId(text);
    const cleaned = text.replace(/[\s-]/g, '');
    if (cleaned.length === 0) { setAbhaError(undefined); return; }
    if (!/^\d+$/.test(cleaned)) { setAbhaError('ABHA ID must contain only numbers'); return; }
    if (cleaned.length < 14) { setAbhaError(`Enter 14 digits (${cleaned.length}/14 entered)`); return; }
    if (cleaned.length > 14) { setAbhaError('ABHA ID must be exactly 14 digits'); return; }
    setAbhaError(undefined);
  };

  const handleDone = () => {
    if (!name.trim())                                   return Alert.alert('⚠️', tr.missing_name);
    const a = parseInt(age, 10);
    if (!age || isNaN(a) || a < 1 || a > 120)          return Alert.alert('⚠️', tr.invalid_age);
    if (!weight || parseFloat(weight) < 10)             return Alert.alert('⚠️', tr.invalid_weight);
    if (!height || parseFloat(height) < 50)             return Alert.alert('⚠️', tr.invalid_height);

    // Validate ABHA if entered
    const cleanedAbha = abhaId.replace(/[\s-]/g, '');
    if (cleanedAbha.length > 0 && cleanedAbha.length !== 14) {
      return Alert.alert('⚠️', 'ABHA ID must be exactly 14 digits or left empty.');
    }

    const h = parseFloat(height) / 100;
    const bmi = parseFloat((parseFloat(weight) / (h * h)).toFixed(1));
    setUser({
      name: name.trim(), age: a, gender,
      weight: parseFloat(weight), height: parseFloat(height), bmi,
      abhaId: cleanedAbha.length === 14 ? cleanedAbha : undefined,
    });
    onComplete();
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={{ flex: 1, backgroundColor: Colors.background }}
        contentContainerStyle={pss.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View style={{ opacity: fade }}>
          <StepDots current={4} total={5} />
          <Text style={pss.title}>{tr.about_you}</Text>
          <Text style={pss.subtitle}>{tr.profile_subtitle}</Text>

          {/* Name */}
          <Text style={pss.label}>{tr.full_name}</Text>
          <TextInput style={pss.input} value={name} onChangeText={setName}
            placeholder={tr.name_placeholder} placeholderTextColor={Colors.textTertiary}
            autoCapitalize="words"
          />

          {/* Age */}
          <Text style={pss.label}>{tr.age}</Text>
          <TextInput style={pss.input} value={age} onChangeText={setAge}
            placeholder={tr.age_placeholder} placeholderTextColor={Colors.textTertiary}
            keyboardType="numeric" maxLength={3}
          />

          {/* Gender */}
          <Text style={pss.label}>{tr.gender}</Text>
          <View style={pss.genderRow}>
            {GENDERS.map((g) => (
              <TouchableOpacity key={g.value}
                style={[pss.chip, gender === g.value && pss.chipActive]}
                onPress={() => setGender(g.value)} activeOpacity={0.7}
              >
                <Text style={{ fontSize: 20 }}>{g.emoji}</Text>
                <Text style={[pss.chipTxt, gender === g.value && { color: Colors.primary }]}>
                  {g.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Weight & Height */}
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={pss.label}>{tr.weight_kg}</Text>
              <TextInput style={pss.input} value={weight} onChangeText={setWeight}
                placeholder="65" placeholderTextColor={Colors.textTertiary} keyboardType="numeric"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={pss.label}>{tr.height_cm}</Text>
              <TextInput style={pss.input} value={height} onChangeText={setHeight}
                placeholder="170" placeholderTextColor={Colors.textTertiary} keyboardType="numeric"
              />
            </View>
          </View>

          {/* ABHA ID */}
          <View style={pss.abhaSection}>
            <Text style={pss.label}>🏥 {tr.abha_id_label || 'ABHA ID (14-digit)'}</Text>
            <Text style={pss.abhaHint}>{tr.abha_id_important || "Links you to India's digital health ecosystem"}</Text>
            <TextInput style={[pss.input, abhaError ? { borderColor: '#ef4444' } : {}]} value={abhaId} onChangeText={handleAbhaChange}
              placeholder="XX-XXXX-XXXX-XXXX" placeholderTextColor={Colors.textTertiary}
              keyboardType="numeric" maxLength={17}
            />
            {abhaError && <Text style={pss.abhaError}>⚠️ {abhaError}</Text>}
            {!abhaId && (
              <Text style={pss.abhaCreateHint}>💡 {tr.abha_id_hint || "Don't have an ABHA ID? Visit abdm.gov.in or your nearest CSC to create one for free."}</Text>
            )}
          </View>

          {/* Privacy */}
          <View style={pss.privacy}>
            <Text style={pss.privacyTxt}>{tr.privacy_badge}</Text>
          </View>

          <PillBtn label={tr.start_journey} onPress={handleDone} style={{ marginTop: 10 }} />
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const pss = StyleSheet.create({
  scroll:    { padding: 22, paddingBottom: 60 },
  title:     { fontSize: 26, fontWeight: '800', color: Colors.textPrimary, letterSpacing: -0.5, marginBottom: 4 },
  subtitle:  { fontSize: 14, color: Colors.textSecondary, lineHeight: 21, marginBottom: 18 },
  label:     { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: 7, marginTop: 4, letterSpacing: 0.3 },
  input:     { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1.5, borderColor: Colors.surfaceBorder, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: Colors.textPrimary, marginBottom: 12 },
  genderRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  chip:      { flex: 1, backgroundColor: Colors.surfaceContainerLow, borderRadius: 14, paddingVertical: 14, alignItems: 'center', gap: 4, borderWidth: 1.5, borderColor: Colors.surfaceBorder },
  chipActive:{ backgroundColor: 'rgba(0,110,47,0.06)', borderColor: Colors.primary },
  chipTxt:   { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  privacy:   { alignItems: 'center', marginVertical: 10 },
  privacyTxt:{ fontSize: 12, color: Colors.textTertiary, textAlign: 'center' },
  abhaSection: { marginTop: 12, backgroundColor: 'rgba(0,110,47,0.04)', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: 'rgba(0,110,47,0.12)' },
  abhaHint:    { fontSize: 12, color: Colors.textTertiary, marginBottom: 8, lineHeight: 17 },
  abhaError:   { fontSize: 12, color: '#ef4444', marginTop: 4 },
  abhaCreateHint: { fontSize: 12, color: Colors.primary, marginTop: 8, fontStyle: 'italic', lineHeight: 17 },
});

// ═══════════════════════════════════════════════════════
// ROOT EXPORT
// ═══════════════════════════════════════════════════════
export const WelcomeScreen: React.FC<Props> = ({ onComplete }) => {
  const [step, setStep] = useState<Step>('welcome');
  const next = (s: Step) => setStep(s);

  return (
    <View style={{ flex: 1 }}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      {step === 'welcome'     && <WelcomeStep    onNext={() => next('language')} />}
      {step === 'language'    && <LanguageStep   onNext={() => next('permissions')} />}
      {step === 'permissions' && <PermissionsStep onNext={() => next('assistive')} />}
      {step === 'assistive'   && <AssistiveStep  onNext={() => next('profile')} />}
      {step === 'profile'     && <ProfileSetupStep onComplete={onComplete} />}
    </View>
  );
};
