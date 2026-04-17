/**
 * AarogyaNetra AI — Doctor Screen
 * Displays: recommended doctors, nearby clinics, specialist info, and health tips.
 * Integrates with latest scan results to surface relevant recommendations.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Linking,
  Alert,
  Dimensions,
} from 'react-native';
import { Colors } from '../theme';
import { useAppStore } from '../store/useAppStore';
import { useLanguage } from '../i18n/LanguageContext';

const { width } = Dimensions.get('window');

// ─── Data ─────────────────────────────────────────────

interface Doctor {
  id: string;
  name: string;
  specialization: string;
  hospital: string;
  distance: string;
  rating: number;
  experience: string;
  languages: string[];
  available: boolean;
  emoji: string;
  phone: string;
  relevantFor: string[];
}

interface HealthTip {
  icon: string;
  title: string;
  body: string;
  tag: string;
  tagColor: string;
}

const DOCTORS: Doctor[] = [
  {
    id: '1',
    name: 'Dr. Priya Sharma',
    specialization: 'General Physician & Diabetologist',
    hospital: 'City Health Centre',
    distance: '1.2 km',
    rating: 4.8,
    experience: '14 yrs',
    languages: ['Hindi', 'English'],
    available: true,
    emoji: '👩‍⚕️',
    phone: '+91-9800000001',
    relevantFor: ['diabetes', 'hypertension'],
  },
  {
    id: '2',
    name: 'Dr. Rajesh Kumar',
    specialization: 'Cardiologist',
    hospital: 'Apollo Clinic',
    distance: '2.8 km',
    rating: 4.9,
    experience: '22 yrs',
    languages: ['Hindi', 'English', 'Telugu'],
    available: false,
    emoji: '👨‍⚕️',
    phone: '+91-9800000002',
    relevantFor: ['hypertension'],
  },
  {
    id: '3',
    name: 'Dr. Meena Iyer',
    specialization: 'Hematologist',
    hospital: 'Government Medical College',
    distance: '3.5 km',
    rating: 4.7,
    experience: '18 yrs',
    languages: ['Tamil', 'English'],
    available: true,
    emoji: '👩‍⚕️',
    phone: '+91-9800000003',
    relevantFor: ['anemia'],
  },
  {
    id: '4',
    name: 'Dr. Arjun Mehta',
    specialization: 'Internal Medicine',
    hospital: 'Primary Health Centre',
    distance: '0.8 km',
    rating: 4.6,
    experience: '10 yrs',
    languages: ['Gujarati', 'Hindi', 'English'],
    available: true,
    emoji: '👨‍⚕️',
    phone: '+91-9800000004',
    relevantFor: ['diabetes', 'anemia', 'hypertension'],
  },
];

const HEALTH_TIPS: HealthTip[] = [
  {
    icon: '🧘',
    title: 'Manage Stress Daily',
    body: 'Chronic stress raises blood pressure and blood sugar. Try 10 minutes of deep breathing or meditation every morning.',
    tag: 'Hypertension',
    tagColor: '#ef4444',
  },
  {
    icon: '🥗',
    title: 'Eat Iron-Rich Foods',
    body: 'Include spinach, lentils, chickpeas, and jaggery in your meals. Pair with Vitamin C (lemon, amla) for better absorption.',
    tag: 'Anemia',
    tagColor: '#f59e0b',
  },
  {
    icon: '🚶',
    title: '30-Minute Walk Daily',
    body: 'A brisk 30-minute daily walk reduces diabetes risk by up to 30% and helps regulate blood pressure naturally.',
    tag: 'Diabetes',
    tagColor: '#006e2f',
  },
  {
    icon: '💧',
    title: 'Stay Hydrated',
    body: 'Drink 8–10 glasses of water daily. Proper hydration helps blood circulation, kidney function, and glucose regulation.',
    tag: 'General',
    tagColor: '#0058be',
  },
  {
    icon: '😴',
    title: 'Prioritize 7–8 Hours of Sleep',
    body: 'Poor sleep increases insulin resistance and elevates cortisol, raising hypertension and diabetes risk significantly.',
    tag: 'All Conditions',
    tagColor: '#9e4036',
  },
  {
    icon: '🚭',
    title: 'Quit Smoking',
    body: 'Smoking damages blood vessels, accelerates anemia, and dramatically raises cardiovascular and diabetes complications.',
    tag: 'Prevention',
    tagColor: '#6d7b6c',
  },
];

const CLINICS = [
  { name: 'Primary Health Centre', dist: '0.8 km', type: 'Government · Free', emoji: '🏥' },
  { name: 'Jan Aushadhi Kendra', dist: '1.1 km', type: 'Medicines · Subsidised', emoji: '💊' },
  { name: 'Apollo Clinic', dist: '2.8 km', type: 'Private · Affordable', emoji: '🏨' },
  { name: 'District Hospital', dist: '4.2 km', type: 'Government · Free', emoji: '🏛️' },
];

// ─── Sub-components ───────────────────────────────────

const StarRating: React.FC<{ rating: number }> = ({ rating }) => {
  const full = Math.floor(rating);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Text key={i} style={{ fontSize: 11, color: i < full ? '#f59e0b' : '#ddd' }}>★</Text>
      ))}
      <Text style={{ fontSize: 11, color: Colors.textTertiary, marginLeft: 2 }}>{rating}</Text>
    </View>
  );
};

const DoctorCard: React.FC<{ doctor: Doctor; isRecommended: boolean }> = ({ doctor, isRecommended }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const { t } = useLanguage();

  const handleCall = () => {
    Alert.alert(
      `${t('call_doctor')}: ${doctor.name}`,
      `${doctor.phone}?`,
      [
        { text: t('cancel') || 'Cancel', style: 'cancel' },
        { text: t('call_doctor') || 'Call', onPress: () => Linking.openURL(`tel:${doctor.phone}`) },
      ]
    );
  };

  const pressIn = () => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true }).start();
  const pressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();

  return (
    <Animated.View style={[docStyles.card, { transform: [{ scale }] }]}>
      <TouchableOpacity
        activeOpacity={1}
        onPressIn={pressIn}
        onPressOut={pressOut}
        onPress={handleCall}
      >
        {isRecommended && (
          <View style={docStyles.recommendedBadge}>
            <Text style={docStyles.recommendedText}>⭐ {t('specialist')}</Text>
          </View>
        )}
        <View style={docStyles.header}>
          <View style={docStyles.avatar}>
            <Text style={{ fontSize: 30 }}>{doctor.emoji}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={docStyles.name}>{doctor.name}</Text>
            <Text style={docStyles.spec}>{doctor.specialization}</Text>
            <StarRating rating={doctor.rating} />
          </View>
          <View style={[docStyles.availBadge, { backgroundColor: doctor.available ? Colors.successLight : '#fee2e2' }]}>
            <View style={[docStyles.availDot, { backgroundColor: doctor.available ? Colors.success : Colors.danger }]} />
            <Text style={[docStyles.availText, { color: doctor.available ? Colors.success : Colors.danger }]}>
              {doctor.available ? t('available') : t('busy')}
            </Text>
          </View>
        </View>

        <View style={docStyles.meta}>
          <View style={docStyles.metaChip}>
            <Text style={docStyles.metaText}>🏥 {doctor.hospital}</Text>
          </View>
          <View style={docStyles.metaChip}>
            <Text style={docStyles.metaText}>📍 {doctor.distance}</Text>
          </View>
          <View style={docStyles.metaChip}>
            <Text style={docStyles.metaText}>🎓 {doctor.experience}</Text>
          </View>
        </View>

        <View style={docStyles.languages}>
          {doctor.languages.map((lang) => (
            <View key={lang} style={docStyles.langChip}>
              <Text style={docStyles.langText}>{lang}</Text>
            </View>
          ))}
        </View>

        <View style={docStyles.actions}>
          <TouchableOpacity style={docStyles.callBtn} onPress={handleCall} activeOpacity={0.8}>
            <Text style={docStyles.callBtnText}>📞 {t('book_appointment')}</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const docStyles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 18,
    marginHorizontal: 20,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
  },
  recommendedBadge: {
    backgroundColor: 'rgba(0,110,47,0.08)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  recommendedText: { fontSize: 11, fontWeight: '700', color: Colors.primary },
  header: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', marginBottom: 12 },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: Colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary, marginBottom: 2 },
  spec: { fontSize: 12, color: Colors.textSecondary, marginBottom: 4, lineHeight: 17 },
  availBadge: { flexDirection: 'row', alignItems: 'center', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4, gap: 4, alignSelf: 'flex-start' },
  availDot: { width: 6, height: 6, borderRadius: 3 },
  availText: { fontSize: 11, fontWeight: '700' },
  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  metaChip: { backgroundColor: Colors.surfaceContainerLow, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  metaText: { fontSize: 11, color: Colors.textSecondary, fontWeight: '500' },
  languages: { flexDirection: 'row', gap: 6, marginBottom: 14 },
  langChip: { borderWidth: 1, borderColor: Colors.surfaceBorder, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
  langText: { fontSize: 11, color: Colors.textTertiary },
  actions: {},
  callBtn: { backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  callBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});

const TipCard: React.FC<{ tip: HealthTip; index: number }> = ({ tip, index }) => {
  const [expanded, setExpanded] = useState(false);
  const heightAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const toggle = () => {
    const toExpand = !expanded;
    setExpanded(toExpand);
    Animated.parallel([
      Animated.timing(heightAnim, {
        toValue: toExpand ? 1 : 0,
        duration: 250,
        useNativeDriver: false,
      }),
      Animated.timing(opacityAnim, {
        toValue: toExpand ? 1 : 0,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start();
  };

  return (
    <TouchableOpacity
      style={tipStyles.card}
      onPress={toggle}
      activeOpacity={0.85}
    >
      <View style={tipStyles.header}>
        <View style={[tipStyles.iconWrap, { backgroundColor: `${tip.tagColor}15` }]}>
          <Text style={{ fontSize: 24 }}>{tip.icon}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={tipStyles.title}>{tip.title}</Text>
          <View style={[tipStyles.tagBadge, { backgroundColor: `${tip.tagColor}14` }]}>
            <Text style={[tipStyles.tagText, { color: tip.tagColor }]}>{tip.tag}</Text>
          </View>
        </View>
        <View style={[tipStyles.chevronBox, expanded && { backgroundColor: Colors.primary }]}>
          <Text style={[tipStyles.chevron, expanded && { color: '#fff' }]}>
            {expanded ? '▲' : '▼'}
          </Text>
        </View>
      </View>
      {expanded && (
        <Animated.View style={{ opacity: opacityAnim }}>
          <Text style={tipStyles.body}>{tip.body}</Text>
          <View style={tipStyles.tipFooter}>
            <Text style={[tipStyles.tipFooterText, { color: tip.tagColor }]}>
              💡 Tip #{index + 1} · Tap to collapse
            </Text>
          </View>
        </Animated.View>
      )}
    </TouchableOpacity>
  );
};

const tipStyles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  header: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  tagBadge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start' },
  tagText: { fontSize: 10, fontWeight: '700' },
  chevronBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: Colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevron: { fontSize: 11, color: Colors.textTertiary, fontWeight: '700' },
  body: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 21,
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBorder,
  },
  tipFooter: { marginTop: 10, alignItems: 'flex-end' },
  tipFooterText: { fontSize: 10, fontWeight: '600' },
});

// ─── Tab Button — defined OUTSIDE parent to avoid remount on state change ─────
const TabButton: React.FC<{
  label: string;
  icon: string;
  tabKey: 'doctors' | 'tips' | 'clinics';
  activeTab: 'doctors' | 'tips' | 'clinics';
  setActiveTab: (tab: 'doctors' | 'tips' | 'clinics') => void;
}> = ({ label, icon, tabKey, activeTab, setActiveTab }) => (
  <TouchableOpacity
    style={[tabBtnStyles.btn, activeTab === tabKey && tabBtnStyles.active]}
    onPress={() => setActiveTab(tabKey)}
    activeOpacity={0.7}
  >
    <Text style={{ fontSize: 16 }}>{icon}</Text>
    <Text style={[tabBtnStyles.label, activeTab === tabKey && tabBtnStyles.labelActive]}>{label}</Text>
  </TouchableOpacity>
);


// ─── Main Screen ──────────────────────────────────────
export const DoctorScreen: React.FC = () => {
  const { currentScan, scanHistory } = useAppStore();
  const { t } = useLanguage();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<ScrollView>(null);
  const [activeTab, setActiveTab] = useState<'doctors' | 'tips' | 'clinics'>('doctors');

  const switchTab = (tab: 'doctors' | 'tips' | 'clinics') => {
    setActiveTab(tab);
    // Scroll back to top so content is always visible after tab switch
    setTimeout(() => scrollRef.current?.scrollTo({ y: 0, animated: false }), 0);
  };

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  // Determine which specialists to recommend based on latest scan
  const getRecommendedDoctors = (): Doctor[] => {
    if (!currentScan) return DOCTORS.filter((d) => d.available);
    const risks: string[] = [];
    if (currentScan.diseases.hypertension.riskScore > 0.4) risks.push('hypertension');
    if (currentScan.diseases.diabetes.riskScore > 0.4) risks.push('diabetes');
    if (currentScan.diseases.anemia.riskScore > 0.4) risks.push('anemia');
    if (risks.length === 0) return DOCTORS.filter((_, i) => i < 2);
    // Sort: those relevant to detected risks first
    return [...DOCTORS].sort((a, b) => {
      const aScore = risks.filter((r) => a.relevantFor.includes(r)).length;
      const bScore = risks.filter((r) => b.relevantFor.includes(r)).length;
      return bScore - aScore;
    });
  };

  const recommended = getRecommendedDoctors();

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('doctor_title')}</Text>
          <Text style={styles.headerSub}>{t('doctor_subtitle')}</Text>
        </View>

        {/* Banner — if scan exists */}
        {currentScan && (
          <View style={styles.resultBanner}>
            <Text style={styles.bannerIcon}>🩺</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerTitle}>{t('last_scan_results')}</Text>
              <Text style={styles.bannerDesc}>
                {t('overall_score')}: {currentScan.overallHealthScore}/100
              </Text>
            </View>
          </View>
        )}

        {!currentScan && scanHistory.length === 0 && (
          <View style={styles.noScanBanner}>
            <Text style={styles.noScanIcon}>📋</Text>
            <Text style={styles.noScanTitle}>{t('no_scans_yet')}</Text>
            <Text style={styles.noScanDesc}>
              {t('no_scans_desc')}
            </Text>
          </View>
        )}

        {/* Tab pills */}
        <View style={styles.tabRow}>
          <TabButton label={t('tab_doctor')} icon="👨‍⚕️" tabKey="doctors" activeTab={activeTab} setActiveTab={switchTab} />
          <TabButton label="Tips" icon="💡" tabKey="tips" activeTab={activeTab} setActiveTab={switchTab} />
          <TabButton label="Clinics" icon="🏥" tabKey="clinics" activeTab={activeTab} setActiveTab={switchTab} />
        </View>

        {/* Doctors Tab */}
        {activeTab === 'doctors' && (
          <>
            <Text style={styles.sectionTitle}>{t('specialist')}</Text>
            {recommended.map((doc, idx) => (
              <DoctorCard
                key={doc.id}
                doctor={doc}
                isRecommended={idx === 0 && !!currentScan}
              />
            ))}
          </>
        )}

        {/* Tips Tab */}
        {activeTab === 'tips' && (
          <>
            <Text style={styles.sectionTitle}>Health Tips & Advice</Text>
            {HEALTH_TIPS.map((tip, i) => (
              <TipCard key={i} tip={tip} index={i} />
            ))}
          </>
        )}

        {/* Clinics Tab */}
        {activeTab === 'clinics' && (
          <>
            <Text style={styles.sectionTitle}>Nearby Facilities</Text>
            {CLINICS.map((clinic, i) => (
              <TouchableOpacity
                key={i}
                style={clinicStyles.card}
                onPress={() =>
                  Alert.alert(clinic.name, `Distance: ${clinic.dist}\nType: ${clinic.type}`, [
                    { text: 'Get Directions', onPress: () => Linking.openURL('https://maps.google.com') },
                    { text: 'OK' },
                  ])
                }
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 30 }}>{clinic.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={clinicStyles.name}>{clinic.name}</Text>
                  <Text style={clinicStyles.type}>{clinic.type}</Text>
                </View>
                <View style={clinicStyles.distBadge}>
                  <Text style={clinicStyles.distText}>📍 {clinic.dist}</Text>
                </View>
              </TouchableOpacity>
            ))}

            {/* Emergency */}
            <View style={styles.emergencyCard}>
              <Text style={styles.emergencyTitle}>🚨 Emergency Helplines</Text>
              {[
                { label: 'National Ambulance', number: '108' },
                { label: 'AIIMS Delhi', number: '011-26588500' },
                { label: 'Health Helpline', number: '104' },
              ].map((e, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.emergencyRow}
                  onPress={() => Linking.openURL(`tel:${e.number}`)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.emergencyLabel}>{e.label}</Text>
                  <Text style={styles.emergencyPhone}>📞 {e.number}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* Disclaimer */}
        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>
            ⚠️ {t('footer_disclaimer')}. {t('consult_now')}.
          </Text>
        </View>
      </ScrollView>
    </Animated.View>
  );
};

const tabBtnStyles = StyleSheet.create({
  btn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11, borderRadius: 14, backgroundColor: Colors.surfaceContainerLow },
  active: { backgroundColor: Colors.primary },
  label: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  labelActive: { color: '#fff' },
});

const clinicStyles = StyleSheet.create({
  card: { flexDirection: 'row', gap: 14, alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 16, marginHorizontal: 20, marginBottom: 10, borderWidth: 1, borderColor: Colors.surfaceBorder },
  name: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  type: { fontSize: 12, color: Colors.textTertiary, marginTop: 2 },
  distBadge: { backgroundColor: Colors.surfaceContainerLow, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  distText: { fontSize: 11, fontWeight: '600', color: Colors.primary },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 24, paddingTop: 52, paddingBottom: 16 },
  headerTitle: { fontSize: 26, fontWeight: '800', color: Colors.textPrimary, letterSpacing: -0.5 },
  headerSub: { fontSize: 14, color: Colors.textSecondary, marginTop: 4 },
  resultBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 20, marginBottom: 16, backgroundColor: 'rgba(0,110,47,0.07)', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(0,110,47,0.15)' },
  bannerIcon: { fontSize: 28 },
  bannerTitle: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  bannerDesc: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  noScanBanner: { alignItems: 'center', marginHorizontal: 20, marginBottom: 16, backgroundColor: Colors.surfaceContainerLow, borderRadius: 16, padding: 24, borderWidth: 1, borderColor: Colors.surfaceBorder },
  noScanIcon: { fontSize: 40, marginBottom: 8 },
  noScanTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  noScanDesc: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', lineHeight: 19 },
  tabRow: { flexDirection: 'row', gap: 8, marginHorizontal: 20, marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginHorizontal: 20, marginBottom: 12 },
  emergencyCard: { backgroundColor: '#fff5f5', borderRadius: 16, margin: 20, padding: 18, borderWidth: 1, borderColor: '#fecaca' },
  emergencyTitle: { fontSize: 15, fontWeight: '800', color: Colors.danger, marginBottom: 12 },
  emergencyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#fee2e2' },
  emergencyLabel: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
  emergencyPhone: { fontSize: 13, fontWeight: '700', color: Colors.danger },
  disclaimer: { alignItems: 'center', paddingHorizontal: 24, paddingTop: 8 },
  disclaimerText: { fontSize: 11, color: Colors.textTertiary, textAlign: 'center', lineHeight: 17 },
});
