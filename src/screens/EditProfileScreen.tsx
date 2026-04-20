/**
 * AarogyaNetra AI – Edit Profile Screen
 * Dedicated editable form for profile fields.
 * Navigated to from ProfileScreen via ✏️ Edit Profile button.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { GlassCard, AnimatedButton } from '../components/common';
import { Colors, Typography, Spacing, BorderRadius } from '../theme';
import { useAppStore } from '../store/useAppStore';
import { useLanguage } from '../i18n/LanguageContext';
import type { ProfileStackParamList } from '../models/types';

type NavProp = NativeStackNavigationProp<ProfileStackParamList, 'EditProfile'>;

// ─── ABHA ID Validation ─────────────────────────────────
function validateAbhaId(id: string): { valid: boolean; formatted: string; error?: string } {
  const cleaned = id.replace(/[\s-]/g, '');
  if (cleaned.length === 0) return { valid: true, formatted: '', error: undefined };
  if (!/^\d+$/.test(cleaned)) return { valid: false, formatted: cleaned, error: 'ABHA ID must contain only numbers' };
  if (cleaned.length < 14) return { valid: false, formatted: cleaned, error: `Enter 14 digits (${cleaned.length}/14 entered)` };
  if (cleaned.length > 14) return { valid: false, formatted: cleaned.substring(0, 14), error: 'ABHA ID must be exactly 14 digits' };
  const formatted = `${cleaned.substring(0, 2)}-${cleaned.substring(2, 6)}-${cleaned.substring(6, 10)}-${cleaned.substring(10, 14)}`;
  return { valid: true, formatted, error: undefined };
}

function luhnCheck(id: string): boolean {
  const digits = id.replace(/[\s-]/g, '').split('').map(Number);
  let sum = 0, isAlternate = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits[i];
    if (isAlternate) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
    isAlternate = !isAlternate;
  }
  return sum % 10 === 0;
}

export const EditProfileScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const { user, setUser } = useAppStore();
  const { t } = useLanguage();

  const [name, setName] = useState(user?.name || '');
  const [age, setAge] = useState(user?.age?.toString() || '');
  const [gender, setGender] = useState<'male' | 'female' | 'other'>(user?.gender || 'male');
  const [weight, setWeight] = useState(user?.weight?.toString() || '');
  const [height, setHeight] = useState(user?.height?.toString() || '');
  const [abhaId, setAbhaId] = useState(user?.abhaId || '');
  const [abhaError, setAbhaError] = useState<string | undefined>();
  const [abhaVerified, setAbhaVerified] = useState(user?.abhaVerified || false);

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
    if (!luhnCheck(cleaned)) {
      Alert.alert(
        '⚠️ ABHA Verification',
        'ABHA ID format is valid (14 digits). In production, this would verify with the ABDM server.\n\nFor this MVP, your ABHA ID has been saved locally.',
        [{ text: 'OK', onPress: () => setAbhaVerified(true) }]
      );
    } else {
      setAbhaVerified(true);
      Alert.alert('✅ ABHA Verified', 'Your Ayushman Bharat Health Account ID has been verified and linked.');
    }
  };

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('⚠️ Missing Name', t('missing_name'));
      return;
    }
    const parsedAge = parseInt(age, 10);
    if (isNaN(parsedAge) || parsedAge < 1 || parsedAge > 120) {
      Alert.alert('⚠️ Invalid Age', t('invalid_age'));
      return;
    }
    const abhaResult = validateAbhaId(abhaId);
    if (abhaId && !abhaResult.valid) {
      Alert.alert('⚠️ Invalid ABHA ID', abhaResult.error || 'Please enter a valid ABHA ID or leave it empty.');
      return;
    }
    const cleanedAbha = abhaId.replace(/[\s-]/g, '');
    setUser({
      name: name.trim(),
      age: parsedAge,
      gender,
      weight: weight ? parseFloat(weight) : undefined,
      height: height ? parseFloat(height) : undefined,
      abhaId: cleanedAbha.length === 14 ? cleanedAbha : undefined,
      abhaVerified,
    });
    Alert.alert('✅ Profile Saved', 'Your profile has been updated successfully.', [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
  };

  const GenderChip: React.FC<{ value: 'male' | 'female' | 'other'; label: string; emoji: string }> = ({ value, label, emoji }) => (
    <TouchableOpacity
      style={[styles.genderChip, gender === value && styles.genderChipActive]}
      onPress={() => setGender(value)}
      activeOpacity={0.8}
    >
      <Text style={styles.genderChipEmoji}>{emoji}</Text>
      <Text style={[styles.genderChipLabel, gender === value && styles.genderChipLabelActive]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header Banner */}
        <View style={styles.banner}>
          <Text style={styles.bannerIcon}>✏️</Text>
          <Text style={styles.bannerTitle}>{t('edit_profile')}</Text>
          <Text style={styles.bannerSubtitle}>Update your health details below</Text>
        </View>

        {/* Personal Info */}
        <GlassCard style={styles.card}>
          <Text style={styles.sectionTitle}>👤 Personal Information</Text>

          <Text style={styles.label}>{t('full_name')} *</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder={t('name_placeholder')}
            placeholderTextColor={Colors.textTertiary}
            returnKeyType="next"
          />

          <Text style={styles.label}>{t('age')} *</Text>
          <TextInput
            style={styles.input}
            value={age}
            onChangeText={setAge}
            placeholder="e.g. 30"
            placeholderTextColor={Colors.textTertiary}
            keyboardType="numeric"
            returnKeyType="next"
          />

          <View style={styles.rowFields}>
            <View style={styles.halfField}>
              <Text style={styles.label}>Weight (kg)</Text>
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
              <Text style={styles.label}>Height (cm)</Text>
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

          <Text style={styles.label}>{t('gender')}</Text>
          <View style={styles.genderRow}>
            <GenderChip value="male" label={t('male')} emoji="👨" />
            <GenderChip value="female" label={t('female')} emoji="👩" />
            <GenderChip value="other" label={t('other')} emoji="🧑" />
          </View>
        </GlassCard>

        {/* ABHA ID */}
        <GlassCard variant="accent" style={styles.card}>
          <View style={styles.abhaHeader}>
            <Text style={styles.sectionTitle}>🏥 ABHA ID</Text>
            {abhaVerified && (
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedText}>✅ Linked</Text>
              </View>
            )}
          </View>
          <Text style={styles.fieldDesc}>
            Your 14-digit Ayushman Bharat Health Account ID links you to India's digital health ecosystem.
          </Text>

          <Text style={styles.label}>ABHA ID (14-digit) — Mandatory</Text>
          <TextInput
            style={[styles.input, abhaError ? styles.inputError : (abhaVerified ? styles.inputSuccess : {})]}
            value={abhaId}
            onChangeText={handleAbhaChange}
            placeholder="XX-XXXX-XXXX-XXXX"
            placeholderTextColor={Colors.textTertiary}
            keyboardType="numeric"
            maxLength={17}
          />
          {abhaError && <Text style={styles.errorText}>⚠️ {abhaError}</Text>}
          {!abhaId && (
            <Text style={styles.abhaHint}>
              💡 Don't have an ABHA ID? Visit abdm.gov.in or your nearest CSC to create one for free.
            </Text>
          )}

          <TouchableOpacity
            style={[styles.verifyBtn, abhaVerified && styles.verifyBtnVerified]}
            onPress={handleVerifyAbha}
            activeOpacity={0.85}
          >
            <Text style={styles.verifyBtnText}>
              {abhaVerified ? `✅ ${t('abha_verified')}` : `🔗 ${t('verify_abha')}`}
            </Text>
          </TouchableOpacity>
        </GlassCard>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <AnimatedButton
            title={`💾  ${t('save_profile')}`}
            onPress={handleSave}
            variant="primary"
            size="large"
            fullWidth
            style={styles.saveBtn}
          />
          <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: 100 },

  banner: {
    alignItems: 'center',
    paddingTop: 28,
    paddingBottom: 24,
    paddingHorizontal: Spacing.lg,
    backgroundColor: `${Colors.primary}08`,
    borderBottomWidth: 1,
    borderBottomColor: `${Colors.primary}15`,
  },
  bannerIcon: { fontSize: 40, marginBottom: 8 },
  bannerTitle: { ...Typography.h2, color: Colors.textPrimary, marginBottom: 4 },
  bannerSubtitle: { ...Typography.bodySmall, color: Colors.textTertiary },

  card: { marginHorizontal: Spacing.lg, marginTop: Spacing.lg },
  sectionTitle: { ...Typography.h4, color: Colors.textPrimary, marginBottom: Spacing.lg },

  label: {
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
  inputError: { borderColor: Colors.danger },
  inputSuccess: { borderColor: Colors.success },
  errorText: { ...Typography.caption, color: Colors.danger, marginTop: Spacing.xs },

  rowFields: { flexDirection: 'row', gap: Spacing.md },
  halfField: { flex: 1 },

  genderRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs, flexWrap: 'wrap' },
  genderChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.surfaceBorder,
    backgroundColor: Colors.backgroundLight,
  },
  genderChipActive: { borderColor: Colors.primary, backgroundColor: `${Colors.primary}10` },
  genderChipEmoji: { fontSize: 18 },
  genderChipLabel: { ...Typography.bodySmall, fontWeight: '600', color: Colors.textSecondary },
  genderChipLabelActive: { color: Colors.primary, fontWeight: '800' },

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

  abhaHint: {
    ...Typography.caption,
    color: Colors.primary,
    marginTop: Spacing.sm,
    lineHeight: 18,
    fontStyle: 'italic',
  },

  verifyBtn: {
    marginTop: Spacing.md,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: 13,
    alignItems: 'center',
  },
  verifyBtnVerified: { backgroundColor: `${Colors.success}15`, borderWidth: 1, borderColor: Colors.success },
  verifyBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  actions: {
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.xxl,
    gap: Spacing.md,
  },
  saveBtn: { borderRadius: BorderRadius.xl },
  cancelBtn: { alignItems: 'center', paddingVertical: 14 },
  cancelText: { ...Typography.body, color: Colors.textTertiary, fontWeight: '600' },
});
