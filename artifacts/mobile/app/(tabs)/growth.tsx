import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/contexts/AppContext';
import { GrowthChart } from '@/components/GrowthChart';
import { BadgeCard } from '@/components/BadgeCard';
import { BADGE_DEFINITIONS } from '@/data/badges';
import { xpToNextLevel, XP_PER_LEVEL } from '@/utils/gameLogic';

export default function GrowthScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { progress, records, unlockedBadges } = useApp();

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const xpInLevel = progress.experience % XP_PER_LEVEL;

  // Weekly stats
  const last7Records = records.slice(-7);
  const avgMood =
    last7Records.length > 0
      ? (last7Records.reduce((s, r) => s + r.mood, 0) / last7Records.length).toFixed(1)
      : '--';
  const avgSleep =
    last7Records.length > 0
      ? (last7Records.reduce((s, r) => s + r.sleep, 0) / last7Records.length).toFixed(1)
      : '--';

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: topPad + 16, paddingBottom: Platform.OS === 'web' ? 34 + 80 : insets.bottom + 80 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.title, { color: colors.foreground }]}>メンタルの成長</Text>
      <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
        あなたの積み重ねを見える化
      </Text>

      {/* Level Card */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.levelHeader}>
          <View>
            <Text style={[styles.levelLabel, { color: colors.mutedForeground }]}>現在のレベル</Text>
            <Text style={[styles.levelValue, { color: colors.foreground }]}>
              Lv.{progress.level}
            </Text>
          </View>
          <View style={[styles.levelBadge, { backgroundColor: colors.primary + '22' }]}>
            <Ionicons name="trending-up" size={24} color={colors.primary} />
          </View>
        </View>

        {/* XP Progress */}
        <View style={styles.xpSection}>
          <View style={styles.xpRow}>
            <Text style={[styles.xpLabel, { color: colors.mutedForeground }]}>
              {xpInLevel} / {XP_PER_LEVEL} XP
            </Text>
            <Text style={[styles.xpNext, { color: colors.primary }]}>
              次まで {xpToNextLevel(progress.experience)} XP
            </Text>
          </View>
          <View style={[styles.xpTrack, { backgroundColor: colors.muted }]}>
            <View
              style={[
                styles.xpFill,
                { backgroundColor: colors.primary, width: `${progress.mentalMuscle}%` },
              ]}
            />
          </View>
        </View>

        {/* Stats row */}
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Ionicons name="flame" size={18} color="#FF6B35" />
            <Text style={[styles.statValue, { color: colors.foreground }]}>{progress.streak}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>連続</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Ionicons name="calendar-outline" size={18} color={colors.primary} />
            <Text style={[styles.statValue, { color: colors.foreground }]}>{progress.totalDays}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>記録日数</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Ionicons name="flash" size={18} color="#FFB800" />
            <Text style={[styles.statValue, { color: colors.foreground }]}>{progress.experience}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>総XP</Text>
          </View>
        </View>
      </View>

      {/* Weekly Mood Chart */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>気分の推移（7日間）</Text>
          <View style={styles.avgRow}>
            <Text style={[styles.avgLabel, { color: colors.mutedForeground }]}>平均</Text>
            <Text style={[styles.avgValue, { color: colors.primary }]}>{avgMood}</Text>
          </View>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <GrowthChart records={records} />
        </ScrollView>
      </View>

      {/* Weekly Summary */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.cardTitle, { color: colors.foreground }]}>週間サマリー</Text>
        <View style={styles.summaryRow}>
          <View style={[styles.summaryItem, { backgroundColor: colors.muted }]}>
            <Ionicons name="moon-outline" size={22} color={colors.primary} />
            <Text style={[styles.summaryValue, { color: colors.foreground }]}>{avgSleep}h</Text>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>平均睡眠</Text>
          </View>
          <View style={[styles.summaryItem, { backgroundColor: colors.muted }]}>
            <Ionicons name="heart-outline" size={22} color="#FF6B35" />
            <Text style={[styles.summaryValue, { color: colors.foreground }]}>{avgMood}</Text>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>平均気分</Text>
          </View>
          <View style={[styles.summaryItem, { backgroundColor: colors.muted }]}>
            <Ionicons name="document-text-outline" size={22} color="#FFB800" />
            <Text style={[styles.summaryValue, { color: colors.foreground }]}>{last7Records.length}</Text>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>記録数</Text>
          </View>
        </View>
      </View>

      {/* Badges */}
      <View style={styles.badgeSection}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>バッジ</Text>
          <Text style={[styles.badgeCount, { color: colors.mutedForeground }]}>
            {unlockedBadges.length} / {BADGE_DEFINITIONS.length}
          </Text>
        </View>
        <View style={styles.badgeGrid}>
          {BADGE_DEFINITIONS.map((badge) => {
            const unlocked = unlockedBadges.find((b) => b.id === badge.id);
            return <BadgeCard key={badge.id} badge={badge} unlocked={unlocked} />;
          })}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 16 },
  title: {
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
    marginBottom: 4,
  },
  card: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    gap: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
  },
  levelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  levelLabel: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginBottom: 4,
  },
  levelValue: {
    fontSize: 34,
    fontFamily: 'Inter_700Bold',
    letterSpacing: -1,
  },
  levelBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  xpSection: { gap: 8 },
  xpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  xpLabel: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  xpNext: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
  xpTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  xpFill: {
    height: '100%',
    borderRadius: 4,
  },
  divider: { height: 1 },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
  },
  statLabel: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
  },
  statDivider: {
    width: 1,
    height: 40,
  },
  avgRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  avgLabel: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  avgValue: { fontSize: 16, fontFamily: 'Inter_700Bold' },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    gap: 6,
  },
  summaryValue: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
  },
  summaryLabel: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
  },
  badgeSection: { gap: 14 },
  badgeCount: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
});
