/**
 * ArogyaNetra AI - History Screen
 * Timeline of past scans with trend overview
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { GlassCard, AnimatedButton } from '../components/common';
import { Colors, Typography, Spacing, BorderRadius } from '../theme';
import { getRiskColor } from '../theme/colors';
import { useAppStore } from '../store/useAppStore';
import type { HistoryStackParamList } from '../models/types';

type NavProp = NativeStackNavigationProp<HistoryStackParamList, 'History'>;

export const HistoryScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const { scanHistory } = useAppStore();

  const formatDate = (timestamp: string) => {
    const d = new Date(timestamp);
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return Colors.success;
    if (score >= 50) return Colors.warning;
    return Colors.danger;
  };

  if (scanHistory.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>📋</Text>
        <Text style={styles.emptyTitle}>No Scans Yet</Text>
        <Text style={styles.emptyDesc}>
          Complete your first health scan to see your history and track trends over time.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>📋 Scan History</Text>
      <Text style={styles.subtitle}>
        {scanHistory.length} scan{scanHistory.length !== 1 ? 's' : ''} recorded
      </Text>

      {/* Scan timeline */}
      {scanHistory.map((entry, idx) => (
        <TouchableOpacity
          key={entry.scanId}
          onPress={() => navigation.navigate('ResultDetail', { scanId: entry.scanId })}
          activeOpacity={0.7}
        >
          <GlassCard style={styles.historyCard}>
            <View style={styles.cardHeader}>
              <View
                style={[
                  styles.scoreBadge,
                  { backgroundColor: `${getScoreColor(entry.overallScore)}15` },
                ]}
              >
                <Text style={[styles.scoreText, { color: getScoreColor(entry.overallScore) }]}>
                  {entry.overallScore}
                </Text>
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardDate}>{formatDate(entry.timestamp)}</Text>
                <Text style={styles.cardId}>
                  {entry.scanId.substring(0, 16)}...
                </Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </View>

            {/* Mini risk bars */}
            <View style={styles.riskBars}>
              <View style={styles.riskBarRow}>
                <Text style={[styles.riskLabel, { color: Colors.hypertension }]}>
                  HYP
                </Text>
                <View style={styles.riskBarTrack}>
                  <View
                    style={[
                      styles.riskBarFill,
                      {
                        width: `${entry.hypertensionRisk * 100}%`,
                        backgroundColor: Colors.hypertension,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.riskPercent}>
                  {Math.round(entry.hypertensionRisk * 100)}%
                </Text>
              </View>
              <View style={styles.riskBarRow}>
                <Text style={[styles.riskLabel, { color: Colors.diabetes }]}>
                  DIA
                </Text>
                <View style={styles.riskBarTrack}>
                  <View
                    style={[
                      styles.riskBarFill,
                      {
                        width: `${entry.diabetesRisk * 100}%`,
                        backgroundColor: Colors.diabetes,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.riskPercent}>
                  {Math.round(entry.diabetesRisk * 100)}%
                </Text>
              </View>
              <View style={styles.riskBarRow}>
                <Text style={[styles.riskLabel, { color: Colors.anemia }]}>
                  ANE
                </Text>
                <View style={styles.riskBarTrack}>
                  <View
                    style={[
                      styles.riskBarFill,
                      {
                        width: `${entry.anemiaRisk * 100}%`,
                        backgroundColor: Colors.anemia,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.riskPercent}>
                  {Math.round(entry.anemiaRisk * 100)}%
                </Text>
              </View>
            </View>
          </GlassCard>
        </TouchableOpacity>
      ))}
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
  title: {
    ...Typography.h2,
    color: Colors.textPrimary,
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.xl,
  },
  subtitle: {
    ...Typography.bodySmall,
    color: Colors.textTertiary,
    paddingHorizontal: Spacing.lg,
    marginTop: 4,
    marginBottom: Spacing.lg,
  },
  // Empty state
  emptyContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xxxl,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    ...Typography.h2,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  emptyDesc: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  // History card
  historyCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  scoreBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  scoreText: {
    ...Typography.h4,
    fontWeight: '700',
  },
  cardInfo: {
    flex: 1,
  },
  cardDate: {
    ...Typography.label,
    color: Colors.textPrimary,
  },
  cardId: {
    ...Typography.caption,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  chevron: {
    ...Typography.h1,
    color: Colors.textTertiary,
    fontSize: 28,
  },
  // Risk bars
  riskBars: {
    gap: Spacing.xs,
  },
  riskBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  riskLabel: {
    ...Typography.caption,
    fontWeight: '600',
    width: 30,
    letterSpacing: 0.5,
  },
  riskBarTrack: {
    flex: 1,
    height: 6,
    backgroundColor: Colors.surfaceBorder,
    borderRadius: 3,
    marginHorizontal: Spacing.sm,
    overflow: 'hidden',
  },
  riskBarFill: {
    height: 6,
    borderRadius: 3,
  },
  riskPercent: {
    ...Typography.caption,
    color: Colors.textTertiary,
    width: 32,
    textAlign: 'right',
  },
});
