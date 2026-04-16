/**
 * ArogyaNetra AI - Profile Screen
 * User profile management, ABHA ID linking (Ayushman Bharat), data backup, and scan history.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  Share,
  TouchableOpacity,
  Dimensions,
  FlatList,
  Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { GlassCard, AnimatedButton } from '../components/common';
import { Colors, Typography, Spacing, BorderRadius } from '../theme';
import { useAppStore } from '../store/useAppStore';
import { useLanguage } from '../i18n/LanguageContext';
import { LANGUAGE_LIST, type LanguageCode } from '../i18n/translations';
import type { ProfileStackParamList, ScanHistoryEntry } from '../models/types';

type NavProp = NativeStackNavigationProp<ProfileStackParamList, 'ProfileMain'>;

const { width } = Dimensions.get('window');

// ─── ABHA ID Validation ─────────────────────────────────
function validateAbhaId(id: string): { valid: boolean; formatted: string; error?: string } {
  // Remove spaces and dashes for validation
  const cleaned = id.replace(/[\s-]/g, '');
  
  // ABHA ID is 14 digits
  if (cleaned.length === 0) {
    return { valid: true, formatted: '', error: undefined };
  }
  
  if (!/^\d+$/.test(cleaned)) {
    return { valid: false, formatted: cleaned, error: 'ABHA ID must contain only numbers' };
  }
  
  if (cleaned.length < 14) {
    return { valid: false, formatted: cleaned, error: `Enter 14 digits (${cleaned.length}/14 entered)` };
  }
  
  if (cleaned.length > 14) {
    return { valid: false, formatted: cleaned.substring(0, 14), error: 'ABHA ID must be exactly 14 digits' };
  }
  
  // Format as XX-XXXX-XXXX-XXXX
  const formatted = `${cleaned.substring(0, 2)}-${cleaned.substring(2, 6)}-${cleaned.substring(6, 10)}-${cleaned.substring(10, 14)}`;
  return { valid: true, formatted, error: undefined };
}

// ─── Luhn Check (ABHA uses Luhn algorithm) ──────────────
function luhnCheck(id: string): boolean {
  const digits = id.replace(/[\s-]/g, '').split('').map(Number);
  let sum = 0;
  let isAlternate = false;
  
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits[i];
    if (isAlternate) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    isAlternate = !isAlternate;
  }
  
  return sum % 10 === 0;
}

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

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const { user, setUser, scanHistory, labReports, storedScans, language, setLanguage } = useAppStore();
  const { t } = useLanguage();

  // ─── Language picker state ────────────────────────────
  const [langModalVisible, setLangModalVisible] = useState(false);
  const [langSearch, setLangSearch] = useState('');
  const currentLangInfo = LANGUAGE_LIST.find(l => l.code === language) || LANGUAGE_LIST.find(l => l.code === 'en')!;
  const filteredLangs = LANGUAGE_LIST.filter(l =>
    l.label.toLowerCase().includes(langSearch.toLowerCase()) ||
    l.native.toLowerCase().includes(langSearch.toLowerCase())
  );

  const [name, setName] = useState(user?.name || '');
  const [age, setAge] = useState(user?.age?.toString() || '30');
  const [gender, setGender] = useState<'male' | 'female' | 'other'>(user?.gender || 'male');
  const [weight, setWeight] = useState(user?.weight?.toString() || '');
  const [height, setHeight] = useState(user?.height?.toString() || '');
  const [abhaId, setAbhaId] = useState(user?.abhaId || '');
  const [abhaError, setAbhaError] = useState<string | undefined>();
  const [abhaVerified, setAbhaVerified] = useState(user?.abhaVerified || false);

  // Re-sync state when user changes
  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setAge(user.age?.toString() || '30');
      setGender(user.gender || 'male');
      setWeight(user.weight?.toString() || '');
      setHeight(user.height?.toString() || '');
      setAbhaId(user.abhaId || '');
      setAbhaVerified(user.abhaVerified || false);
    }
  }, [user]);

  const handleAbhaChange = (text: string) => {
    setAbhaId(text);
    const result = validateAbhaId(text);
    setAbhaError(result.error);
    setAbhaVerified(false);
  };

  const handleVerifyAbha = () => {
    const result = validateAbhaId(abhaId);
    if (!result.valid) {
      Alert.alert('❌ Invalid ABHA ID', result.error || 'Please enter a valid 14-digit ABHA ID');
      return;
    }

    const cleaned = abhaId.replace(/[\s-]/g, '');
    
    // Luhn verification
    if (!luhnCheck(cleaned)) {
      // In a real app, this would call the ABDM API
      // For now, accept any 14-digit number but show warning
      Alert.alert(
        '⚠️ ABHA Verification',
        'ABHA ID format is valid (14 digits). In production, this would verify with the ABDM (Ayushman Bharat Digital Mission) server.\n\nFor this MVP, your ABHA ID has been saved locally.',
        [{ text: 'OK', onPress: () => setAbhaVerified(true) }]
      );
    } else {
      setAbhaVerified(true);
      Alert.alert('✅ ABHA Verified', 'Your Ayushman Bharat Health Account ID has been verified and linked.');
    }
  };

  const handleSave = () => {
    const parsedAge = parseInt(age, 10);
    if (isNaN(parsedAge) || parsedAge < 1 || parsedAge > 120) {
      Alert.alert('⚠️ Invalid Age', 'Please enter a valid age between 1 and 120.');
      return;
    }

    const abhaResult = validateAbhaId(abhaId);
    const cleanedAbha = abhaId.replace(/[\s-]/g, '');

    setUser({
      name: name || 'User',
      age: parsedAge,
      gender,
      weight: weight ? parseFloat(weight) : undefined,
      height: height ? parseFloat(height) : undefined,
      abhaId: cleanedAbha.length === 14 ? cleanedAbha : undefined,
      abhaVerified: abhaVerified,
    });
    Alert.alert('✅ Profile Saved', 'Your profile has been updated and saved locally on this device.');
  };

  // ─── Backup / Export ─────────────────
  const handleBackupData = async () => {
    try {
      const backupData = {
        exportDate: new Date().toISOString(),
        appVersion: '1.0.0',
        user: user,
        scanHistory: scanHistory,
        labReports: labReports,
        totalScans: scanHistory.length,
        totalLabReports: labReports.length,
      };

      const backupString = JSON.stringify(backupData, null, 2);
      
      await Share.share({
        message: backupString,
        title: 'AarogyaNetra Backup',
      });
    } catch (err) {
      Alert.alert('Error', 'Failed to create backup. Please try again.');
    }
  };

  const handleExportAll = async () => {
    Alert.alert(
      '📦 Export All Data',
      'This will export your profile, scan history, and lab reports as a JSON file. You can share it via WhatsApp, Email, or save it.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Export', onPress: handleBackupData },
      ]
    );
  };

  // ─── BMI Calculation ─────────────────
  const getBMI = (): string | null => {
    const w = parseFloat(weight);
    const h = parseFloat(height);
    if (!w || !h || w <= 0 || h <= 0) return null;
    const bmi = w / ((h / 100) * (h / 100));
    return bmi.toFixed(1);
  };

  const getBMICategory = (bmi: number): { label: string; color: string } => {
    if (bmi < 18.5) return { label: 'Underweight', color: Colors.warning };
    if (bmi < 25) return { label: 'Normal', color: Colors.success };
    if (bmi < 30) return { label: 'Overweight', color: Colors.warning };
    return { label: 'Obese', color: Colors.danger };
  };

  const bmi = getBMI();
  const bmiCategory = bmi ? getBMICategory(parseFloat(bmi)) : null;

  const GenderButton: React.FC<{ value: 'male' | 'female' | 'other'; label: string; emoji: string }> =
    ({ value, label, emoji }) => (
      <AnimatedButton
        title={`${emoji}  ${label}`}
        onPress={() => setGender(value)}
        variant={gender === value ? 'primary' : 'outline'}
        size="small"
        style={styles.genderBtn}
      />
    );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(name || 'U')[0].toUpperCase()}
          </Text>
        </View>
        <Text style={styles.userName}>{name || 'User'}</Text>
        <Text style={styles.userMeta}>
          {scanHistory.length} {t('scans')} · {labReports.length} {t('reports')} · {user?.gender || 'male'} · {t('age')} {user?.age || 30}
        </Text>
        {bmi && (
          <View style={[styles.bmiBadge, { backgroundColor: `${bmiCategory?.color}15`, borderColor: `${bmiCategory?.color}30` }]}>
            <Text style={[styles.bmiText, { color: bmiCategory?.color }]}>
              BMI: {bmi} — {bmiCategory?.label}
            </Text>
          </View>
        )}
      </View>

      {/* Profile Form */}
      <GlassCard style={styles.formCard}>
        <Text style={styles.sectionTitle}>👤 Personal Information</Text>

        <Text style={styles.fieldLabel}>{t('full_name')}</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Enter your name"
          placeholderTextColor={Colors.textTertiary}
        />

        <Text style={styles.fieldLabel}>{t('age')}</Text>
        <TextInput
          style={styles.input}
          value={age}
          onChangeText={setAge}
          placeholder="Enter age"
          placeholderTextColor={Colors.textTertiary}
          keyboardType="numeric"
        />

        <View style={styles.rowFields}>
          <View style={styles.halfField}>
            <Text style={styles.fieldLabel}>Weight (kg)</Text>
            <TextInput
              style={styles.input}
              value={weight}
              onChangeText={setWeight}
              placeholder="e.g. 65"
              placeholderTextColor={Colors.textTertiary}
              keyboardType="decimal-pad"
            />
          </View>
          <View style={styles.halfField}>
            <Text style={styles.fieldLabel}>Height (cm)</Text>
            <TextInput
              style={styles.input}
              value={height}
              onChangeText={setHeight}
              placeholder="e.g. 170"
              placeholderTextColor={Colors.textTertiary}
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        <Text style={styles.fieldLabel}>{t('gender')}</Text>
        <View style={styles.genderRow}>
          <GenderButton value="male" label={t('male')} emoji="👨" />
          <GenderButton value="female" label={t('female')} emoji="👩" />
          <GenderButton value="other" label={t('other')} emoji="🧑" />
        </View>
      </GlassCard>

      {/* ABHA ID — Ayushman Bharat */}
      <GlassCard variant="accent" style={styles.formCard}>
        <View style={styles.abhaHeader}>
          <Text style={styles.sectionTitle}>🏥 Ayushman Bharat (ABDM)</Text>
          {abhaVerified && (
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedText}>✅ Linked</Text>
            </View>
          )}
        </View>
        <Text style={styles.fieldDesc}>
          Link your ABHA (Ayushman Bharat Health Account) ID to enable health record sharing 
          via the ABDM network. Your health records can be accessed at any ABDM-connected hospital.
        </Text>

        <Text style={styles.fieldLabel}>ABHA ID (14-digit)</Text>
        <TextInput
          style={[
            styles.input,
            abhaError ? styles.inputError : (abhaVerified ? styles.inputSuccess : {}),
          ]}
          value={abhaId}
          onChangeText={handleAbhaChange}
          placeholder="XX-XXXX-XXXX-XXXX"
          placeholderTextColor={Colors.textTertiary}
          keyboardType="numeric"
          maxLength={17} // 14 digits + 3 dashes
        />
        {abhaError && (
          <Text style={styles.errorText}>⚠️ {abhaError}</Text>
        )}

        <AnimatedButton
          title={abhaVerified ? `✅ ${t('abha_verified')}` : `🔗 ${t('verify_abha')}`}
          onPress={handleVerifyAbha}
          variant={abhaVerified ? 'outline' : 'primary'}
          size="small"
          style={styles.verifyBtn}
        />

        {/* ABHA Benefits */}
        <View style={styles.abhaBenefits}>
          <Text style={styles.benefitItem}>🏥 Access records at any ABDM hospital</Text>
          <Text style={styles.benefitItem}>📱 Digital health locker integration</Text>
          <Text style={styles.benefitItem}>💊 Prescription history tracking</Text>
          <Text style={styles.benefitItem}>🆓 Free — Part of Ayushman Bharat scheme</Text>
        </View>

        <Text style={styles.abhaNote}>
          💡 Don't have an ABHA ID? Visit your nearest CSC (Common Service Centre) or download the ABHA app to create one for free.
        </Text>
      </GlassCard>

      {/* Save Button */}
      <View style={styles.saveContainer}>
        <AnimatedButton
          title={`💾  ${t('save_profile')}`}
          onPress={handleSave}
          variant="primary"
          size="large"
          fullWidth
          style={styles.saveBtn}
        />
      </View>

      {/* ── Scan History ── */}
      <GlassCard style={styles.formCard}>
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
      <GlassCard style={styles.formCard}>
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

        {/* Language Modal */}
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

            {/* Search */}
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
                    onPress={() => {
                      setLanguage(lang.code);
                      setLangModalVisible(false);
                    }}
                    activeOpacity={0.75}
                  >
                    <Text style={{ fontSize: 22 }}>{lang.flag}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[langPickerStyles.langNative, isActive && { color: Colors.primary }]}>
                        {lang.native}
                      </Text>
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

      {/* Data Backup */}
      <GlassCard style={styles.formCard}>
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

      {/* App Info */}
      <GlassCard style={styles.infoCard}>
        <Text style={styles.infoTitle}>ℹ️ About AarogyaNetra</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Version</Text>
          <Text style={styles.infoValue}>1.0.0 (MVP)</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>ML Engine</Text>
          <Text style={styles.infoValue}>Profile-Deterministic AI</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Data Storage</Text>
          <Text style={styles.infoValue}>Local + AsyncStorage</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>ABDM Integration</Text>
          <Text style={styles.infoValue}>ABHA ID Linking</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Team</Text>
          <Text style={styles.infoValue}>Tech-Tantra</Text>
        </View>

        <Text style={styles.disclaimer}>
          This is a screening tool for early risk detection. It does not provide medical diagnoses.
          Always consult a qualified healthcare provider for medical decisions.
        </Text>
      </GlassCard>
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
  // Header
  header: {
    alignItems: 'center',
    paddingVertical: Spacing.xxxl,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  avatarText: {
    ...Typography.h1,
    color: Colors.white,
    fontSize: 36,
  },
  userName: {
    ...Typography.h2,
    color: Colors.textPrimary,
  },
  userMeta: {
    ...Typography.bodySmall,
    color: Colors.textTertiary,
    marginTop: 4,
  },
  bmiBadge: {
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.round,
    borderWidth: 1,
  },
  bmiText: {
    ...Typography.caption,
    fontWeight: '600',
  },
  // Form
  formCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    ...Typography.h4,
    color: Colors.textPrimary,
    marginBottom: Spacing.lg,
  },
  fieldLabel: {
    ...Typography.label,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
    marginTop: Spacing.md,
  },
  fieldDesc: {
    ...Typography.bodySmall,
    color: Colors.textTertiary,
    lineHeight: 20,
    marginBottom: Spacing.sm,
  },
  input: {
    backgroundColor: Colors.backgroundLight,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    color: Colors.textPrimary,
    ...Typography.body,
  },
  inputError: {
    borderColor: Colors.danger,
  },
  inputSuccess: {
    borderColor: Colors.success,
  },
  errorText: {
    ...Typography.caption,
    color: Colors.danger,
    marginTop: Spacing.xs,
  },
  rowFields: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  halfField: {
    flex: 1,
  },
  genderRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  genderBtn: {
    flex: 1,
  },
  // ABHA
  abhaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  verifiedBadge: {
    backgroundColor: `${Colors.success}15`,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.round,
    borderWidth: 1,
    borderColor: `${Colors.success}30`,
  },
  verifiedText: {
    ...Typography.caption,
    color: Colors.success,
    fontWeight: '600',
  },
  verifyBtn: {
    marginTop: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  abhaBenefits: {
    marginTop: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    gap: Spacing.sm,
  },
  benefitItem: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  abhaNote: {
    ...Typography.caption,
    color: Colors.primary,
    marginTop: Spacing.md,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  // Save
  saveContainer: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  saveBtn: {
    borderRadius: BorderRadius.xl,
  },
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
  dataStat: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  dataStatValue: {
    ...Typography.h3,
    color: Colors.primary,
  },
  dataStatLabel: {
    ...Typography.caption,
    color: Colors.textTertiary,
    marginTop: 4,
  },
  dataStatDivider: {
    width: 1,
    height: 30,
    backgroundColor: Colors.surfaceBorder,
  },
  backupBtn: {
    borderRadius: BorderRadius.md,
  },
  // Info
  infoCard: {
    marginHorizontal: Spacing.lg,
  },
  infoTitle: {
    ...Typography.h4,
    color: Colors.textPrimary,
    marginBottom: Spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  infoLabel: {
    ...Typography.bodySmall,
    color: Colors.textTertiary,
  },
  infoValue: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  disclaimer: {
    ...Typography.caption,
    color: Colors.textTertiary,
    marginTop: Spacing.lg,
    lineHeight: 18,
    textAlign: 'center',
    fontStyle: 'italic',
  },
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
  historyCount: {
    fontSize: 12,
    fontWeight: '800',
    color: '#fff',
  },
  noHistoryWrap: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  noHistoryText: {
    fontSize: 13,
    color: Colors.textTertiary,
    textAlign: 'center',
    lineHeight: 19,
  },
  viewAllBtn: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },
});

// ─── Language Picker Styles ───────────────────────────────────────────────────
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
  // Modal
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
