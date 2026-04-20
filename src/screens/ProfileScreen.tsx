/**
 * AarogyaNetra AI - Profile Screen (Read-Only View)
 * Displays user data in read-only format.
 * Edit is done via the dedicated EditProfileScreen.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  Alert,
  Dimensions,
  FlatList,
  Modal,
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { GlassCard, AnimatedButton } from '../components/common';
import { Colors, Typography, Spacing, BorderRadius } from '../theme';
import { useAppStore } from '../store/useAppStore';
import { useLanguage } from '../i18n/LanguageContext';
import { LANGUAGE_LIST } from '../i18n/translations';
import type { ProfileStackParamList, ScanHistoryEntry } from '../models/types';

type NavProp = NativeStackNavigationProp<ProfileStackParamList, 'ProfileMain'>;

const { width } = Dimensions.get('window');

// ─── Read-Only Field Row ─────────────────────────────────
const InfoRow: React.FC<{ label: string; value: string; icon?: string; highlight?: boolean }> = ({
  label, value, icon, highlight = false,
}) => (
  <View style={infoRowStyles.row}>
    <View style={infoRowStyles.labelRow}>
      {icon && <Text style={infoRowStyles.icon}>{icon}</Text>}
      <Text style={infoRowStyles.label}>{label}</Text>
    </View>
    <Text style={[infoRowStyles.value, highlight && infoRowStyles.valueHighlight]}>{value}</Text>
  </View>
);

const infoRowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  icon: { fontSize: 16, width: 24 },
  label: { ...Typography.bodySmall, color: Colors.textTertiary, fontWeight: '500' },
  value: { ...Typography.body, color: Colors.textPrimary, fontWeight: '600', maxWidth: '55%', textAlign: 'right' },
  valueHighlight: { color: Colors.primary, fontWeight: '700' },
});

// ─── BMI Badge ───────────────────────────────────────────
const BMIBadge: React.FC<{ weight?: number; height?: number }> = ({ weight, height }) => {
  if (!weight || !height || weight <= 0 || height <= 0) return null;
  const bmi = weight / ((height / 100) * (height / 100));
  const bmiStr = bmi.toFixed(1);
  const cat = bmi < 18.5 ? { label: 'Underweight', color: Colors.warning }
    : bmi < 25 ? { label: 'Normal', color: Colors.success }
    : bmi < 30 ? { label: 'Overweight', color: Colors.warning }
    : { label: 'Obese', color: Colors.danger };

  return (
    <View style={[bmiStyles.badge, { backgroundColor: `${cat.color}15`, borderColor: `${cat.color}30` }]}>
      <Text style={[bmiStyles.text, { color: cat.color }]}>BMI: {bmiStr} — {cat.label}</Text>
    </View>
  );
};

const bmiStyles = StyleSheet.create({
  badge: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  text: { ...Typography.caption, fontWeight: '700' },
});

// ─── Mini Scan History Card ──────────────────────────────
const ScanHistoryCard: React.FC<{ entry: ScanHistoryEntry; onPress: () => void }> = ({ entry, onPress }) => {
  const score = entry.overallScore;
  const scoreColor = score >= 70 ? Colors.success : score >= 45 ? Colors.warning : Colors.danger;
  const dateStr = new Date(entry.timestamp).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
  const maxRisk = Math.max(entry.hypertensionRisk, entry.diabetesRisk, entry.anemiaRisk);
  const primaryRisk = entry.hypertensionRisk === maxRisk ? '❤️ Hypertension'
    : entry.diabetesRisk === maxRisk ? '🩸 Diabetes' : '👁️ Anemia';

  return (
    <TouchableOpacity style={historyCardStyles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={[historyCardStyles.scoreBadge, { backgroundColor: `${scoreColor}15`, borderColor: `${scoreColor}30` }]}>
        <Text style={[historyCardStyles.scoreText, { color: scoreColor }]}>{score}</Text>
        <Text style={historyCardStyles.scoreLabel}>/ 100</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={historyCardStyles.date}>{dateStr}</Text>
        <Text style={historyCardStyles.risk}>Highest: {primaryRisk} — {Math.round(maxRisk * 100)}%</Text>
        <View style={historyCardStyles.miniRisks}>
          {[
            { label: 'HTN', val: entry.hypertensionRisk, color: '#ef4444' },
            { label: 'DM', val: entry.diabetesRisk, color: Colors.primary },
            { label: 'ANE', val: entry.anemiaRisk, color: '#f59e0b' },
          ].map((r) => (
            <View key={r.label} style={historyCardStyles.miniBar}>
              <Text style={historyCardStyles.miniLabel}>{r.label}</Text>
              <View style={historyCardStyles.miniTrack}>
                <View style={[historyCardStyles.miniFill, { width: `${r.val * 100}%`, backgroundColor: r.color }]} />
              </View>
            </View>
          ))}
        </View>
      </View>
      <Text style={historyCardStyles.arrow}>→</Text>
    </TouchableOpacity>
  );
};

const historyCardStyles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: Colors.backgroundLight, borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: Colors.surfaceBorder },
  scoreBadge: { width: 58, height: 58, borderRadius: 14, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  scoreText: { fontSize: 20, fontWeight: '800' },
  scoreLabel: { fontSize: 9, color: Colors.textTertiary },
  date: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary, marginBottom: 2 },
  risk: { fontSize: 11, color: Colors.textTertiary, marginBottom: 5 },
  miniRisks: { flexDirection: 'row', gap: 8 },
  miniBar: { flex: 1, alignItems: 'center', gap: 2 },
  miniLabel: { fontSize: 9, fontWeight: '700', color: Colors.textTertiary },
  miniTrack: { width: '100%', height: 4, backgroundColor: Colors.surfaceBorder, borderRadius: 2, overflow: 'hidden' },
  miniFill: { height: '100%', borderRadius: 2 },
  arrow: { fontSize: 16, color: Colors.textTertiary, fontWeight: '700' },
});

// ─── Main Profile Screen (Read-Only) ─────────────────────
export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const { user, scanHistory, labReports, storedScans, language, setLanguage } = useAppStore();
  const { t } = useLanguage();

  // Language picker
  const [langModalVisible, setLangModalVisible] = useState(false);
  const [langSearch, setLangSearch] = useState('');
  const currentLangInfo = LANGUAGE_LIST.find(l => l.code === language) || LANGUAGE_LIST.find(l => l.code === 'en')!;
  const filteredLangs = LANGUAGE_LIST.filter(l =>
    l.label.toLowerCase().includes(langSearch.toLowerCase()) ||
    l.native.toLowerCase().includes(langSearch.toLowerCase())
  );

  const handleExportAll = async () => {
    Alert.alert(
      '📦 Export All Data',
      'This will export your profile, scan history, and lab reports as a JSON file.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Export', onPress: async () => {
            try {
              const backupData = {
                exportDate: new Date().toISOString(),
                appVersion: '1.0.0',
                user,
                scanHistory,
                labReports,
                totalScans: scanHistory.length,
                totalLabReports: labReports.length,
              };
              await Share.share({
                message: JSON.stringify(backupData, null, 2),
                title: 'AarogyaNetra Backup',
              });
            } catch (_) {
              Alert.alert('Error', 'Failed to create backup. Please try again.');
            }
          },
        },
      ]
    );
  };

  const genderLabel = user?.gender === 'male' ? `👨 ${t('male')}`
    : user?.gender === 'female' ? `👩 ${t('female')}` : `🧑 ${t('other')}`;

  const abhaDisplay = user?.abhaId
    ? `${user.abhaId.substring(0, 2)}-${user.abhaId.substring(2, 6)}-${user.abhaId.substring(6, 10)}-${user.abhaId.substring(10, 14)}`
    : 'Not linked';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Profile Header ── */}
      <View style={styles.header}>
        <View style={styles.avatarWrap}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(user?.name || 'U')[0].toUpperCase()}</Text>
          </View>
          {user?.abhaVerified && (
            <View style={styles.abhaCheck}>
              <Text style={{ fontSize: 12 }}>✅</Text>
            </View>
          )}
        </View>
        <Text style={styles.userName}>{user?.name || 'User'}</Text>
        <Text style={styles.userMeta}>
          {genderLabel} · {t('age')} {user?.age || '—'} · {scanHistory.length} {t('scans')}
        </Text>
        <BMIBadge weight={user?.weight} height={user?.height} />

        {/* ✏️ Edit Profile Button */}
        <TouchableOpacity
          style={styles.editBtn}
          onPress={() => navigation.navigate('EditProfile')}
          activeOpacity={0.85}
        >
          <Text style={styles.editBtnIcon}>✏️</Text>
          <Text style={styles.editBtnText}>{t('edit_profile')}</Text>
        </TouchableOpacity>
      </View>

      {/* ── Personal Details (Read-Only) ── */}
      <GlassCard style={styles.card}>
        <Text style={styles.sectionTitle}>👤 Personal Information</Text>
        <InfoRow icon="📛" label={t('full_name')} value={user?.name || '—'} />
        <InfoRow icon="🎂" label={t('age')} value={user?.age ? `${user.age} years` : '—'} />
        <InfoRow icon="⚥" label={t('gender')} value={genderLabel} />
        {user?.weight && <InfoRow icon="⚖️" label="Weight" value={`${user.weight} kg`} />}
        {user?.height && <InfoRow icon="📏" label="Height" value={`${user.height} cm`} />}
      </GlassCard>

      {/* ── ABHA ID Section (Read-Only) ── */}
      <GlassCard variant="accent" style={styles.card}>
        <View style={styles.abhaHeader}>
          <Text style={styles.sectionTitle}>🏥 Ayushman Bharat (ABDM)</Text>
          {user?.abhaVerified && (
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedText}>✅ Verified</Text>
            </View>
          )}
        </View>

        <InfoRow
          icon="🆔"
          label="ABHA ID"
          value={abhaDisplay}
          highlight={!!user?.abhaId}
        />

        {!user?.abhaId && (
          <View style={styles.abhaNotice}>
            <Text style={styles.abhaNoticeText}>
              ⚠️ No ABHA ID linked. Tap "Edit Profile" to add your Ayushman Bharat Health Account ID.
            </Text>
            <TouchableOpacity
              style={styles.linkAbhaBtn}
              onPress={() => navigation.navigate('EditProfile')}
              activeOpacity={0.85}
            >
              <Text style={styles.linkAbhaBtnText}>🔗 Link ABHA ID</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.abhaBenefits}>
          <Text style={styles.benefitItem}>🏥 Access records at any ABDM hospital</Text>
          <Text style={styles.benefitItem}>📱 Digital health locker integration</Text>
          <Text style={styles.benefitItem}>💊 Prescription history tracking</Text>
          <Text style={styles.benefitItem}>🆓 Free — Part of Ayushman Bharat scheme</Text>
        </View>
      </GlassCard>

      {/* ── Scan History ── */}
      <GlassCard style={styles.card}>
        <View style={styles.historyHeader}>
          <Text style={styles.sectionTitle}>📊 {t('scan_history')}</Text>
          <View style={styles.historyCountBadge}>
            <Text style={styles.historyCount}>{scanHistory.length}</Text>
          </View>
        </View>

        {scanHistory.length === 0 ? (
          <View style={styles.noHistoryWrap}>
            <Text style={{ fontSize: 32, marginBottom: 8 }}>📭</Text>
            <Text style={styles.noHistoryText}>{t('no_scans_yet')}</Text>
          </View>
        ) : (
          <>
            {scanHistory.slice(0, 5).map((entry) => (
              <ScanHistoryCard
                key={entry.scanId}
                entry={entry}
                onPress={() => navigation.navigate('ResultDetail', { scanId: entry.scanId })}
              />
            ))}
            {scanHistory.length > 5 && (
              <TouchableOpacity
                style={styles.viewAllBtn}
                onPress={() => navigation.navigate('ResultDetail', { scanId: scanHistory[0].scanId })}
                activeOpacity={0.7}
              >
                <Text style={styles.viewAllText}>View all {scanHistory.length} scans →</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </GlassCard>

      {/* ── Language Settings ── */}
      <GlassCard style={styles.card}>
        <Text style={styles.sectionTitle}>🌐 {t('language_settings')}</Text>
        <Text style={styles.fieldDesc}>{t('language_settings_desc')}</Text>

        <TouchableOpacity
          style={langPickerStyles.selector}
          onPress={() => { setLangSearch(''); setLangModalVisible(true); }}
          activeOpacity={0.8}
        >
          <Text style={langPickerStyles.flag}>{currentLangInfo.flag}</Text>
          <View style={{ flex: 1 }}>
            <Text style={langPickerStyles.native}>{currentLangInfo.native}</Text>
            <Text style={langPickerStyles.english}>{currentLangInfo.label}</Text>
          </View>
          <Text style={langPickerStyles.chevron}>▼</Text>
        </TouchableOpacity>

        <Modal
          visible={langModalVisible}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setLangModalVisible(false)}
        >
          <View style={langPickerStyles.modal}>
            <View style={langPickerStyles.modalHeader}>
              <Text style={langPickerStyles.modalTitle}>🌐 {t('choose_language')}</Text>
              <TouchableOpacity onPress={() => setLangModalVisible(false)}>
                <Text style={langPickerStyles.close}>✕</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={langPickerStyles.search}
              value={langSearch}
              onChangeText={setLangSearch}
              placeholder={t('search_language')}
              placeholderTextColor={Colors.textTertiary}
            />
            <FlatList
              data={filteredLangs}
              keyExtractor={item => item.code}
              showsVerticalScrollIndicator={false}
              renderItem={({ item: lang }) => {
                const isActive = language === lang.code;
                return (
                  <TouchableOpacity
                    style={[langPickerStyles.langRow, isActive && langPickerStyles.langRowActive]}
                    onPress={() => { setLanguage(lang.code); setLangModalVisible(false); }}
                    activeOpacity={0.75}
                  >
                    <Text style={{ fontSize: 22 }}>{lang.flag}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[langPickerStyles.langNative, isActive && { color: Colors.primary }]}>{lang.native}</Text>
                      <Text style={langPickerStyles.langEnglish}>{lang.label}</Text>
                    </View>
                    {isActive && (
                      <View style={langPickerStyles.check}>
                        <Text style={{ color: '#fff', fontWeight: '800' }}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </Modal>
      </GlassCard>

      {/* ── Data Backup ── */}
      <GlassCard style={styles.card}>
        <Text style={styles.sectionTitle}>💾 {t('data_backup')}</Text>
        <Text style={styles.fieldDesc}>{t('data_backup_desc')}</Text>

        <View style={styles.dataStats}>
          <View style={styles.dataStat}>
            <Text style={styles.dataStatValue}>{scanHistory.length}</Text>
            <Text style={styles.dataStatLabel}>{t('scans')}</Text>
          </View>
          <View style={styles.dataStatDivider} />
          <View style={styles.dataStat}>
            <Text style={styles.dataStatValue}>{labReports.length}</Text>
            <Text style={styles.dataStatLabel}>{t('reports')}</Text>
          </View>
          <View style={styles.dataStatDivider} />
          <View style={styles.dataStat}>
            <Text style={styles.dataStatValue}>{Object.keys(storedScans).length}</Text>
            <Text style={styles.dataStatLabel}>{t('full_records')}</Text>
          </View>
        </View>

        <AnimatedButton
          title={`📦  ${t('export_data')}`}
          onPress={handleExportAll}
          variant="outline"
          fullWidth
          style={styles.backupBtn}
        />
      </GlassCard>

      {/* ── About App ── */}
      <GlassCard style={styles.card}>
        <Text style={styles.infoTitle}>ℹ️ About AarogyaNetra</Text>
        {[
          { label: 'Version', value: '1.0.0 (MVP)' },
          { label: 'ML Engine', value: 'Profile-Deterministic AI' },
          { label: 'Data Storage', value: 'Local + AsyncStorage' },
          { label: 'ABDM Integration', value: 'ABHA ID Linking' },
          { label: 'Team', value: 'Tech-Tantra' },
        ].map((row, i) => (
          <View key={i} style={styles.infoRow}>
            <Text style={styles.infoLabel}>{row.label}</Text>
            <Text style={styles.infoValue}>{row.value}</Text>
          </View>
        ))}
        <Text style={styles.disclaimer}>
          This is a screening tool for early risk detection. It does not provide medical diagnoses.
          Always consult a qualified healthcare provider for medical decisions.
        </Text>
      </GlassCard>
    </ScrollView>
  );
};

// ─── Styles ───────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: 100 },

  // Header
  header: {
    alignItems: 'center',
    paddingTop: Spacing.xxxl,
    paddingBottom: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
  avatarWrap: { position: 'relative', marginBottom: Spacing.md },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  avatarText: { ...Typography.h1, color: Colors.white, fontSize: 36 },
  abhaCheck: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 2,
    borderWidth: 1.5,
    borderColor: Colors.success,
  },
  userName: { ...Typography.h2, color: Colors.textPrimary },
  userMeta: { ...Typography.bodySmall, color: Colors.textTertiary, marginTop: 4 },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    backgroundColor: Colors.primary,
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 10,
    elevation: 3,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  editBtnIcon: { fontSize: 16 },
  editBtnText: { fontSize: 14, fontWeight: '800', color: '#fff' },

  card: { marginHorizontal: Spacing.lg, marginBottom: Spacing.lg },
  sectionTitle: { ...Typography.h4, color: Colors.textPrimary, marginBottom: Spacing.md },
  fieldDesc: { ...Typography.bodySmall, color: Colors.textTertiary, lineHeight: 20, marginBottom: Spacing.sm },

  // ABHA
  abhaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  verifiedBadge: {
    backgroundColor: `${Colors.success}15`,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.round,
    borderWidth: 1,
    borderColor: `${Colors.success}30`,
  },
  verifiedText: { ...Typography.caption, color: Colors.success, fontWeight: '600' },
  abhaNotice: {
    backgroundColor: `${Colors.warning}10`,
    borderRadius: 12,
    padding: 14,
    marginTop: 10,
    borderWidth: 1,
    borderColor: `${Colors.warning}25`,
  },
  abhaNoticeText: { ...Typography.bodySmall, color: Colors.warning, lineHeight: 19, marginBottom: 10 },
  linkAbhaBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  linkAbhaBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  abhaBenefits: {
    marginTop: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    gap: 6,
  },
  benefitItem: { ...Typography.bodySmall, color: Colors.textSecondary, lineHeight: 20 },

  // Scan history
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  historyCountBadge: {
    backgroundColor: Colors.primary,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    minWidth: 26,
    alignItems: 'center',
  },
  historyCount: { fontSize: 12, fontWeight: '800', color: '#fff' },
  noHistoryWrap: { alignItems: 'center', paddingVertical: 20 },
  noHistoryText: { fontSize: 13, color: Colors.textTertiary, textAlign: 'center', lineHeight: 19 },
  viewAllBtn: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  viewAllText: { fontSize: 13, fontWeight: '700', color: Colors.primary },

  // Data backup
  dataStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    marginBottom: Spacing.lg,
  },
  dataStat: { alignItems: 'center', paddingHorizontal: Spacing.xl },
  dataStatValue: { ...Typography.h3, color: Colors.primary },
  dataStatLabel: { ...Typography.caption, color: Colors.textTertiary, marginTop: 4 },
  dataStatDivider: { width: 1, height: 30, backgroundColor: Colors.surfaceBorder },
  backupBtn: { borderRadius: BorderRadius.md },

  // Info
  infoTitle: { ...Typography.h4, color: Colors.textPrimary, marginBottom: Spacing.lg },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  infoLabel: { ...Typography.bodySmall, color: Colors.textTertiary },
  infoValue: { ...Typography.bodySmall, color: Colors.textSecondary, fontWeight: '500' },
  disclaimer: {
    ...Typography.caption,
    color: Colors.textTertiary,
    marginTop: Spacing.lg,
    lineHeight: 18,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

// ─── Language Picker Styles ───────────────────────────────
const langPickerStyles = StyleSheet.create({
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundLight,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    padding: 14,
    gap: 14,
    marginTop: 8,
  },
  flag: { fontSize: 24 },
  native: { fontSize: 15, fontWeight: '700', color: Colors.primary },
  english: { fontSize: 11, color: Colors.textTertiary, marginTop: 2 },
  chevron: { fontSize: 12, color: Colors.textTertiary, marginLeft: 4 },
  modal: { flex: 1, backgroundColor: Colors.background, paddingTop: 16 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary },
  close: { fontSize: 20, color: Colors.textTertiary, padding: 4 },
  search: {
    margin: 16,
    backgroundColor: Colors.backgroundLight,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
    gap: 14,
  },
  langRowActive: { backgroundColor: 'rgba(0,110,47,0.04)' },
  langNative: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  langEnglish: { fontSize: 11, color: Colors.textTertiary, marginTop: 2 },
  check: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
});
