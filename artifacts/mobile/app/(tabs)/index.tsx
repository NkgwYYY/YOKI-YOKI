import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  useColorScheme,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
} from 'react-native-reanimated';

const easeOut = (t: number) => t * (2 - t);
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/contexts/AppContext';
import { MentalMeter } from '@/components/MentalMeter';
import { getGreeting, formatDateJP, getTodayDate } from '@/utils/dateUtils';
import { getMotivationalMessage, xpToNextLevel, XP_PER_LEVEL } from '@/utils/gameLogic';

/* ---------- Reusable stagger-in wrapper ---------- */
function FadeIn({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(22);
  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 480 }));
    translateY.value = withDelay(delay, withSpring(0, { damping: 22, stiffness: 160 }));
  }, []);
  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

/* ---------- Animated XP bar ---------- */
function AnimatedBar({ pct, color }: { pct: number; color: string }) {
  const w = useSharedValue(0);
  useEffect(() => {
    w.value = withDelay(700, withTiming(pct, { duration: 1100, easing: easeOut }));
  }, [pct]);
  const style = useAnimatedStyle(() => ({ width: `${w.value}%` as any }));
  return <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: color, borderRadius: 4 }, style]} />;
}

/* ---------- Main Screen ---------- */
export default function HomeScreen() {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { progress, getTodayRecord, getCompletedCount, getTotalCheckCount } = useApp();
  const todayRecord = getTodayRecord();
  const completedCount = getCompletedCount();
  const totalCount = getTotalCheckCount();
  const checkPct = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const today = getTodayDate();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const moodColors = ['', '#EF4444', '#FF6B35', '#FFB800', '#00C4A7', '#00D4AA'];
  const moodLabels = ['', '最悪', '辛い', '普通', '良い', '最高'];

  const bgColors = isDark
    ? (['#0E0A1C', '#130D28'] as const)
    : (['#FAF7FF', '#F0F5FF'] as const);

  return (
    <View style={styles.flex}>
      {/* Gradient background */}
      <LinearGradient colors={bgColors} style={StyleSheet.absoluteFill} />

      {/* Decorative orbs */}
      <View style={[styles.orb1, { backgroundColor: colors.primary + (isDark ? '18' : '14') }]} />
      <View style={[styles.orb2, { backgroundColor: colors.secondary + (isDark ? '14' : '10') }]} />

      <ScrollView
        style={styles.flex}
        contentContainerStyle={[
          styles.content,
          { paddingTop: topPad + 16, paddingBottom: Platform.OS === 'web' ? 34 + 90 : insets.bottom + 90 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <FadeIn delay={0}>
          <View style={styles.header}>
            <View>
              <Text style={[styles.greeting, { color: colors.mutedForeground }]}>{getGreeting()}</Text>
              <Text style={[styles.appName, { color: colors.foreground }]}>メントレ</Text>
              <Text style={[styles.dateText, { color: colors.mutedForeground }]}>{formatDateJP(today)}</Text>
            </View>
            <TouchableOpacity
              style={[styles.streakBadge, { backgroundColor: colors.card, borderColor: colors.border }]}
              activeOpacity={0.8}
            >
              <Ionicons name="flame" size={18} color="#FF6FA3" />
              <Text style={[styles.streakNum, { color: colors.foreground }]}>{progress.streak}</Text>
              <Text style={[styles.streakUnit, { color: colors.mutedForeground }]}>日</Text>
            </TouchableOpacity>
          </View>
        </FadeIn>

        {/* Mental Meter Card */}
        <FadeIn delay={120}>
          <View
            style={[
              styles.meterCard,
              { borderColor: colors.border },
            ]}
          >
            <LinearGradient
              colors={isDark ? ['#1A1430', '#0F1030'] : ['#FFFFFF', '#F7F0FF']}
              style={[StyleSheet.absoluteFill, { borderRadius: 24 }]}
            />
            <MentalMeter
              percentage={progress.mentalMuscle}
              level={progress.level}
              experience={progress.experience}
            />
            <Text style={[styles.motivText, { color: colors.mutedForeground }]}>
              {getMotivationalMessage(progress.level, progress.streak)}
            </Text>

            {/* XP Bar */}
            <View style={styles.xpWrap}>
              <View style={styles.xpRow}>
                <Text style={[styles.xpLabel, { color: colors.mutedForeground }]}>
                  {progress.experience % XP_PER_LEVEL} / {XP_PER_LEVEL} XP
                </Text>
                <Text style={[styles.xpNext, { color: colors.primary }]}>
                  次まで {xpToNextLevel(progress.experience)} XP
                </Text>
              </View>
              <View style={[styles.xpTrack, { backgroundColor: colors.muted }]}>
                <AnimatedBar pct={progress.mentalMuscle} color={colors.primary} />
              </View>
            </View>
          </View>
        </FadeIn>

        {/* Stats Row */}
        <FadeIn delay={220}>
          <View style={styles.statsRow}>
            {[
              { value: progress.streak, label: '連続記録', icon: 'flame', color: '#FF6FA3' },
              { value: progress.level, label: 'レベル', icon: 'star', color: colors.primary },
              { value: progress.totalDays, label: '記録日数', icon: 'calendar', color: colors.accent },
            ].map((s) => (
              <View
                key={s.label}
                style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <Ionicons name={s.icon as any} size={16} color={s.color} />
                <Text style={[styles.statValue, { color: colors.foreground }]}>{s.value}</Text>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
              </View>
            ))}
          </View>
        </FadeIn>

        {/* Today Checklist */}
        <FadeIn delay={320}>
          <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.sectionRow}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>今日のチェック</Text>
              <Text style={[styles.sectionCount, { color: colors.primary }]}>
                {completedCount} / {totalCount}
              </Text>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: colors.muted }]}>
              <AnimatedBar pct={checkPct} color={colors.primary} />
            </View>
            <TouchableOpacity
              style={[styles.linkBtn, { backgroundColor: colors.muted }]}
              onPress={() => router.push('/(tabs)/check')}
              activeOpacity={0.75}
            >
              <Ionicons name="checkmark-circle-outline" size={17} color={colors.primary} />
              <Text style={[styles.linkBtnText, { color: colors.foreground }]}>チェックを確認する</Text>
              <Ionicons name="chevron-forward" size={15} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
        </FadeIn>

        {/* Mood */}
        <FadeIn delay={420}>
          <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.sectionRow}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>今日の気分</Text>
              {todayRecord && (
                <View style={[styles.moodTag, { backgroundColor: moodColors[todayRecord.mood] + '22' }]}>
                  <Text style={[styles.moodTagText, { color: moodColors[todayRecord.mood] }]}>
                    {moodLabels[todayRecord.mood]}
                  </Text>
                </View>
              )}
            </View>

            {todayRecord ? (
              <View style={styles.doneRow}>
                <View style={[styles.doneDot, { backgroundColor: colors.primary }]} />
                <Text style={[styles.doneText, { color: colors.mutedForeground }]}>
                  今日の記録は完了しています
                </Text>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                onPress={() => router.push('/(tabs)/record')}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={[colors.primary, colors.secondary + 'CC']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[StyleSheet.absoluteFill, { borderRadius: 14 }]}
                />
                <Ionicons name="create-outline" size={18} color="#FFF" />
                <Text style={styles.primaryBtnText}>今日の気分を記録する</Text>
              </TouchableOpacity>
            )}
          </View>
        </FadeIn>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: 20 },

  orb1: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    top: -60,
    right: -80,
  },
  orb2: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    bottom: 200,
    left: -60,
  },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22 },
  greeting: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  appName: { fontSize: 28, fontFamily: 'Inter_700Bold', letterSpacing: -0.8, marginTop: 1 },
  dateText: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  streakBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 9,
    borderRadius: 22, borderWidth: 1,
  },
  streakNum: { fontSize: 18, fontFamily: 'Inter_700Bold' },
  streakUnit: { fontSize: 12, fontFamily: 'Inter_400Regular' },

  meterCard: {
    borderRadius: 24, padding: 26, alignItems: 'center',
    borderWidth: 1, marginBottom: 16, overflow: 'hidden',
    gap: 10,
  },
  motivText: { fontSize: 13, fontFamily: 'Inter_400Regular', textAlign: 'center' },
  xpWrap: { width: '100%', gap: 7 },
  xpRow: { flexDirection: 'row', justifyContent: 'space-between' },
  xpLabel: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  xpNext: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  xpTrack: { height: 8, borderRadius: 4, overflow: 'hidden', position: 'relative' },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: {
    flex: 1, padding: 14, borderRadius: 18, borderWidth: 1,
    alignItems: 'center', gap: 4,
  },
  statValue: { fontSize: 24, fontFamily: 'Inter_700Bold', letterSpacing: -0.5 },
  statLabel: { fontSize: 11, fontFamily: 'Inter_400Regular' },

  sectionCard: {
    borderRadius: 22, padding: 18, borderWidth: 1, marginBottom: 14, gap: 13,
  },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  sectionCount: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  progressTrack: { height: 8, borderRadius: 4, overflow: 'hidden', position: 'relative' },

  linkBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 13, borderRadius: 13,
  },
  linkBtnText: { flex: 1, fontSize: 14, fontFamily: 'Inter_500Medium' },

  moodTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  moodTagText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },

  doneRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  doneDot: { width: 8, height: 8, borderRadius: 4 },
  doneText: { fontSize: 13, fontFamily: 'Inter_400Regular' },

  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 9, padding: 16, borderRadius: 14, overflow: 'hidden',
  },
  primaryBtnText: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: '#FFF' },
});
