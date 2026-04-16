/**
 * AarogyaNetra AI — Onboarding Screen
 * Collects: Name, Age, Weight, Height, Gender, Aadhaar
 * Clean, calm design following "Empathetic Guardian" system
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Colors, Typography, Spacing, BorderRadius } from '../theme';
import { useAppStore } from '../store/useAppStore';

const GENDERS = ['Male', 'Female', 'Other'];

export const OnboardingScreen: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const { setUser } = useAppStore();
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [gender, setGender] = useState('');
  const [aadhaar, setAadhaar] = useState('');

  const formatAadhaar = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 12);
    // Format as XXXX XXXX XXXX
    return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
  };

  const maskAadhaar = (val: string) => {
    const digits = val.replace(/\D/g, '');
    if (digits.length <= 4) return digits;
    return 'XXXX XXXX ' + digits.slice(-4);
  };

  const validateAndSubmit = () => {
    if (!name.trim()) return Alert.alert('Missing', 'Please enter your name.');
    if (!age || parseInt(age) < 1 || parseInt(age) > 120) return Alert.alert('Invalid', 'Please enter a valid age.');
    if (!weight || parseFloat(weight) < 10) return Alert.alert('Invalid', 'Please enter a valid weight.');
    if (!height || parseFloat(height) < 50) return Alert.alert('Invalid', 'Please enter a valid height.');
    if (!gender) return Alert.alert('Missing', 'Please select your gender.');

    const aadhaarDigits = aadhaar.replace(/\D/g, '');
    if (aadhaarDigits.length > 0 && aadhaarDigits.length !== 12) {
      return Alert.alert('Invalid', 'Aadhaar must be 12 digits.');
    }

    // Calculate BMI
    const heightM = parseFloat(height) / 100;
    const bmi = parseFloat((parseFloat(weight) / (heightM * heightM)).toFixed(1));

    setUser({
      name: name.trim(),
      age: parseInt(age),
      gender: gender.toLowerCase() as 'male' | 'female' | 'other',
      weight: parseFloat(weight),
      height: parseFloat(height),
      bmi,
      abhaId: aadhaarDigits || undefined,
    });

    onComplete();
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.appBrand}>🏥 AarogyaNetra</Text>
          <Text style={styles.title}>Let's get to know you</Text>
          <Text style={styles.subtitle}>
            Your personal details help us provide accurate health screening. All data stays on your device.
          </Text>
        </View>

        {/* Name */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Full Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Enter your full name"
            placeholderTextColor={Colors.textTertiary}
            autoCapitalize="words"
          />
        </View>

        {/* Age & Gender Row */}
        <View style={styles.rowFields}>
          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <Text style={styles.fieldLabel}>Age</Text>
            <TextInput
              style={styles.input}
              value={age}
              onChangeText={setAge}
              placeholder="25"
              placeholderTextColor={Colors.textTertiary}
              keyboardType="numeric"
              maxLength={3}
            />
          </View>
          <View style={[styles.fieldGroup, { flex: 2 }]}>
            <Text style={styles.fieldLabel}>Gender</Text>
            <View style={styles.genderRow}>
              {GENDERS.map((g) => (
                <TouchableOpacity
                  key={g}
                  style={[
                    styles.genderChip,
                    gender === g && styles.genderChipActive,
                  ]}
                  onPress={() => setGender(g)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.genderChipText,
                      gender === g && styles.genderChipTextActive,
                    ]}
                  >
                    {g}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Weight & Height */}
        <View style={styles.rowFields}>
          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <Text style={styles.fieldLabel}>Weight (kg)</Text>
            <TextInput
              style={styles.input}
              value={weight}
              onChangeText={setWeight}
              placeholder="65"
              placeholderTextColor={Colors.textTertiary}
              keyboardType="numeric"
            />
          </View>
          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <Text style={styles.fieldLabel}>Height (cm)</Text>
            <TextInput
              style={styles.input}
              value={height}
              onChangeText={setHeight}
              placeholder="170"
              placeholderTextColor={Colors.textTertiary}
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* Aadhaar */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Aadhaar ID (optional)</Text>
          <TextInput
            style={styles.input}
            value={formatAadhaar(aadhaar)}
            onChangeText={(v) => setAadhaar(v.replace(/\D/g, ''))}
            placeholder="XXXX XXXX XXXX"
            placeholderTextColor={Colors.textTertiary}
            keyboardType="numeric"
            maxLength={14}
          />
          <Text style={styles.fieldHint}>
            🔒 Encrypted locally — never leaves your device
          </Text>
        </View>

        {/* Privacy badge */}
        <View style={styles.privacyBadge}>
          <Text style={styles.privacyText}>
            🔐  Your data is encrypted and private
          </Text>
        </View>

        {/* CTA Button */}
        <TouchableOpacity
          style={styles.ctaButton}
          onPress={validateAndSubmit}
          activeOpacity={0.85}
        >
          <Text style={styles.ctaText}>Continue to Health Check</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    padding: 24,
    paddingBottom: 60,
  },
  // Header
  header: {
    marginBottom: 32,
    marginTop: 20,
  },
  appBrand: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
    lineHeight: 34,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginTop: 8,
    lineHeight: 22,
  },
  // Fields
  fieldGroup: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  input: {
    backgroundColor: Colors.surfaceContainerHigh || '#e7e8e9',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.textPrimary,
    borderWidth: 0,
  },
  fieldHint: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 6,
    fontStyle: 'italic',
  },
  rowFields: {
    flexDirection: 'row',
    gap: 12,
  },
  // Gender chips
  genderRow: {
    flexDirection: 'row',
    gap: 8,
  },
  genderChip: {
    flex: 1,
    backgroundColor: Colors.surfaceContainerLow || '#f3f4f5',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  genderChipActive: {
    backgroundColor: Colors.primary,
  },
  genderChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  genderChipTextActive: {
    color: Colors.textInverse,
  },
  // Privacy
  privacyBadge: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  privacyText: {
    fontSize: 13,
    color: Colors.textTertiary,
  },
  // CTA
  ctaButton: {
    borderRadius: 9999,
    paddingVertical: 18,
    alignItems: 'center',
    backgroundColor: Colors.primary,
    shadowColor: '#006e2f',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 4,
  },
  ctaText: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textInverse,
  },
});
