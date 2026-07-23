import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/contexts/AppContext';
import { MentalMeter } from '@/components/MentalMeter';
import { getGreeting, formatDateJP, getTodayDate, getYesterdayDate } from '@/utils/dateUtils';
import { getMotivationalMessage, xpToNextLevel, XP_PER_LEVEL } from '@/utils/gameLogic';

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { progress, getTodayRecord, getCompletedCount, getTotalCheckCount } = useApp();
  const todayRecord = getTodayRecord();
  const completedCount = getCompletedCount();
  const totalCount = getTotalCheckCount();

  const today = getTodayDate();
  const checkProgress = totalCount > 0 ? completedCount / totalCount : 0;

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const moodLabels = ['', '最悪', '辛い', '普通', '良い', '最高'];
  const moodColors = ['', '#EF4444', '#FF6B35', '#FFB800', '#00B894', '#00D4AA'];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: topPad + 16, paddingBottom: Platform.OS === 'web' ? 34 : insets.bottom + 20 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.greeting, { color: colors.mutedForeground }]}>
            {getGreeting()}
          </Text>
          <Text style={[styles.appName, { color: colors.foreground }]}>
            メントレ
          </Text>
        </View>
        <View style={[styles.streakBadge, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="flame" size={18} color="#FF6B35" />
          <Text style={[styles.streakCount, { color: colors.foreground }]}>
            {progress.streak}
          </Text>
          <Text style={[styles.streakLabel, { color: colors.mutedForeground }]}>日</Text>
        </View>
      </View>

      {/* Date */}
      <Text style={[styles.dateText, { color: colors.mutedForeground }]}>
        {formatDateJP(today)}
      </Text>

      {/* Mental Meter */}
      <View style={[styles.meterCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <MentalMeter
          percentage={progress.mentalMuscle}
          level={progress.level}
          experience={progress.experience}
        />
        <Text style={[styles.motivationText, { color: colors.mutedForeground }]}>
          {getMotivationalMessage(progress.level, progress.streak)}
        </Text>
        <View style={styles.xpBarContainer}>
          <View style={[styles.xpBarTrack, { backgroundColor: colors.muted }]}>
            <View
              style={[
                styles.xpBarFill,
                {
                  backgroundColor: colors.primary,
                  width: `${progress.mentalMuscle}%`,
                },
              ]}
            />
          </View>
          <Text style={[styles.xpBarLabel, { color: colors.mutedForeground }]}>
            次のレベルまで {xpToNextLevel(progress.experience)} XP
          </Text>
        </View>
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.statValue, { color: colors.primary }]}>{progress.streak}</Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>連続記録</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.statValue, { color: colors.foreground }]}>{progress.level}</Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>レベル</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.statValue, { color: colors.foreground }]}>{progress.totalDays}</Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>記録日数</Text>
        </View>
      </View>

      {/* Today's Progress */}
      <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            今日のチェック
          </Text>
          <Text style={[styles.sectionCount, { color: colors.primary }]}>
            {completedCount} / {totalCount}
          </Text>
        </View>
        <View style={[styles.progressTrack, { backgroundColor: colors.muted }]}>
          <View
            style={[
              styles.progressFill,
              { backgroundColor: colors.primary, width: `${checkProgress * 100}%` },
            ]}
          />
        </View>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.muted }]}
          onPress={() => router.push('/(tabs)/check')}
          activeOpacity={0.7}
        >
          <Ionicons name="checkmark-circle-outline" size={18} color={colors.primary} />
          <Text style={[styles.actionBtnText, { color: colors.foreground }]}>
            チェックを確認する
          </Text>
          <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      {/* Today's Record */}
      <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            今日の気分
          </Text>
          {todayRecord && (
            <View style={[styles.moodTag, { backgroundColor: moodColors[todayRecord.mood] + '22' }]}>
              <Text style={[styles.moodTagText, { color: moodColors[todayRecord.mood] }]}>
                {moodLabels[todayRecord.mood]}
              </Text>
            </View>
          )}
        </View>

        {todayRecord ? (
          <View style={styles.recordedRow}>
            <View style={[styles.recordedDot, { backgroundColor: colors.primary }]} />
            <Text style={[styles.recordedText, { color: colors.mutedForeground }]}>
              今日の記録は完了しています
            </Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/(tabs)/record')}
            activeOpacity={0.8}
          >
            <Ionicons name="create-outline" size={18} color={colors.primaryForeground} />
            <Text style={[styles.actionBtnText, { color: colors.primaryForeground }]}>
              今日の気分を記録する
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  greeting: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },
  appName: {
    fontSize: 26,
    fontFamily: 'Inter_700Bold',
    letterSpacing: -0.5,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  streakCount: {
    fontSize: 17,
    fontFamily: 'Inter_700Bold',
  },
  streakLabel: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  dateText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    marginBottom: 20,
  },
  meterCard: {
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    marginBottom: 16,
  },
  motivationText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    marginTop: 12,
    textAlign: 'center',
  },
  xpBarContainer: {
    width: '100%',
    marginTop: 16,
    gap: 6,
  },
  xpBarTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  xpBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  xpBarLabel: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 26,
    fontFamily: 'Inter_700Bold',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },
  sectionCard: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    marginBottom: 16,
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
  },
  sectionCount: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 13,
    borderRadius: 12,
  },
  actionBtnText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
  moodTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  moodTagText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
  recordedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  recordedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  recordedText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },
});
