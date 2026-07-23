import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  useColorScheme,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  withSpring,
} from 'react-native-reanimated';

const easeOut = (t: number) => t * (2 - t);
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { GrowthChart } from '@/components/GrowthChart';
import { BadgeCard } from '@/components/BadgeCard';
import { MoodCalendar } from '@/components/MoodCalendar';
import { BADGE_DEFINITIONS } from '@/data/badges';
import { xpToNextLevel, XP_PER_LEVEL } from '@/utils/gameLogic';

function FadeIn({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(18);
  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 440 }));
    translateY.value = withDelay(delay, withSpring(0, { damping: 22, stiffness: 160 }));
  }, []);
  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

function AnimatedXPBar({ pct, color }: { pct: number; color: string }) {
  const w = useSharedValue(0);
  useEffect(() => {
    w.value = withDelay(400, withTiming(pct, { duration: 1100, easing: easeOut }));
  }, [pct]);
  const style = useAnimatedStyle(() => ({ width: `${w.value}%` as any }));
  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, { backgroundColor: color, borderRadius: 5 }, style]}
    />
  );
}

export default function GrowthScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { progress, records, unlockedBadges } = useApp();
  const { user, logout } = useAuth();
  const router = useRouter();
  const [showLogout, setShowLogout] = useState(false);

  const handleLogout = async () => {
    setShowLogout(false);
    await logout();
    router.replace('/login');
  };

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const xpInLevel = progress.experience % XP_PER_LEVEL;
  const last7 = records.slice(-7);
  const avgMood = last7.length > 0
    ? (last7.reduce((s, r) => s + r.mood, 0) / last7.length).toFixed(1)
    : '--';
  const avgSleep = last7.length > 0
    ? (last7.reduce((s, r) => s + r.sleep, 0) / last7.length).toFixed(1)
    : '--';

  const bgColors = isDark
    ? (['#0E0A1C', '#130D28'] as const)
    : (['#FAF7FF', '#F0F5FF'] as const);

  return (
    <View style={styles.flex}>
      <LinearGradient colors={bgColors} style={StyleSheet.absoluteFill} />

      {/* Decorative orb */}
      <View style={[styles.orb, { backgroundColor: colors.secondary + (isDark ? '12' : '0E') }]} />

      <ScrollView
        style={styles.flex}
        contentContainerStyle={[
          styles.content,
          { paddingTop: topPad + 16, paddingBottom: Platform.OS === 'web' ? 34 + 90 : insets.bottom + 90 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <FadeIn delay={0}>
          <View style={styles.titleRow}>
            <View>
              <Text style={[styles.title, { color: colors.foreground }]}>メンタルの成長</Text>
              <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
                あなたの積み重ねを見える化
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.accountBtn, { backgroundColor: colors.muted }]}
              onPress={() => setShowLogout(true)}
              hitSlop={8}
            >
              <Ionicons name="person-circle-outline" size={22} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
        </FadeIn>

        {/* Logout modal */}
        <Modal visible={showLogout} transparent animationType="fade" onRequestClose={() => setShowLogout(false)}>
          <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowLogout(false)}>
            <TouchableOpacity activeOpacity={1} style={[styles.logoutCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Ionicons name="person-circle" size={40} color={colors.primary} style={{ marginBottom: 8 }} />
              {user?.email && (
                <Text style={[styles.logoutEmail, { color: colors.mutedForeground }]}>{user.email}</Text>
              )}
              <TouchableOpacity
                style={styles.logoutBtn}
                onPress={handleLogout}
                activeOpacity={0.85}
              >
                <Ionicons name="log-out-outline" size={18} color="#fff" />
                <Text style={styles.logoutBtnText}>ログアウト</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowLogout(false)} style={{ marginTop: 12 }}>
                <Text style={[styles.cancelText, { color: colors.mutedForeground }]}>キャンセル</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

        {/* Level Card */}
        <FadeIn delay={100}>
          <View style={[styles.card, { borderColor: colors.border, overflow: 'hidden' }]}>
            <LinearGradient
              colors={isDark ? ['#1A1430', '#0F1030'] : ['#FFF', '#F7F0FF']}
              style={[StyleSheet.absoluteFill, { borderRadius: 22 }]}
            />
            <View style={styles.levelHeader}>
              <View>
                <Text style={[styles.levelLabel, { color: colors.mutedForeground }]}>現在のレベル</Text>
                <Text style={[styles.levelValue, { color: colors.foreground }]}>Lv.{progress.level}</Text>
              </View>
              <View style={[styles.levelIcon, { backgroundColor: colors.primary + '22' }]}>
                <Ionicons name="trending-up" size={26} color={colors.primary} />
              </View>
            </View>

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
                <AnimatedXPBar pct={progress.mentalMuscle} color={colors.primary} />
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <View style={styles.statsRow}>
              {[
                { icon: 'flame', color: '#FF6FA3', value: progress.streak, label: '連続' },
                { icon: 'calendar-outline', color: colors.primary, value: progress.totalDays, label: '記録日数' },
                { icon: 'flash', color: colors.accent, value: progress.experience, label: '総XP' },
              ].map((s, i) => (
                <React.Fragment key={s.label}>
                  {i > 0 && <View style={[styles.statDivider, { backgroundColor: colors.border }]} />}
                  <View style={styles.statItem}>
                    <Ionicons name={s.icon as any} size={18} color={s.color} />
                    <Text style={[styles.statValue, { color: colors.foreground }]}>{s.value}</Text>
                    <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
                  </View>
                </React.Fragment>
              ))}
            </View>
          </View>
        </FadeIn>

        {/* Mood Chart */}
        <FadeIn delay={200}>
          <View style={[styles.card, { borderColor: colors.border, overflow: 'hidden' }]}>
            <LinearGradient
              colors={isDark ? ['#1A1430', '#0F1030'] : ['#FFF', '#F7F0FF']}
              style={[StyleSheet.absoluteFill, { borderRadius: 22 }]}
            />
            <View style={styles.cardHeader}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>
                気分の推移（7日間）
              </Text>
              <View style={styles.avgBadge}>
                <Text style={[styles.avgLabel, { color: colors.mutedForeground }]}>平均</Text>
                <Text style={[styles.avgValue, { color: colors.primary }]}>{avgMood}</Text>
              </View>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <GrowthChart records={records} />
            </ScrollView>
          </View>
        </FadeIn>

        {/* Weekly Summary */}
        <FadeIn delay={300}>
          <View style={[styles.card, { borderColor: colors.border, overflow: 'hidden' }]}>
            <LinearGradient
              colors={isDark ? ['#1A1430', '#0F1030'] : ['#FFF', '#F7F0FF']}
              style={[StyleSheet.absoluteFill, { borderRadius: 22 }]}
            />
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>週間サマリー</Text>
            <View style={styles.summaryRow}>
              {[
                { icon: 'moon-outline', color: colors.primary, value: `${avgSleep}h`, label: '平均睡眠' },
                { icon: 'heart-outline', color: '#FF6FA3', value: avgMood, label: '平均気分' },
                { icon: 'document-text-outline', color: colors.accent, value: String(last7.length), label: '記録数' },
              ].map((s) => (
                <View key={s.label} style={[styles.summaryItem, { backgroundColor: colors.muted }]}>
                  <Ionicons name={s.icon as any} size={22} color={s.color} />
                  <Text style={[styles.summaryValue, { color: colors.foreground }]}>{s.value}</Text>
                  <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
                </View>
              ))}
            </View>
          </View>
        </FadeIn>

        {/* Monthly Mood Calendar */}
        <FadeIn delay={350}>
          <MoodCalendar records={records} />
        </FadeIn>

        {/* Badges */}
        <FadeIn delay={400}>
          <View style={styles.badgeSection}>
            <View style={styles.cardHeader}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>バッジ</Text>
              <Text style={[styles.badgeCount, { color: colors.mutedForeground }]}>
                {unlockedBadges.length} / {BADGE_DEFINITIONS.length}
              </Text>
            </View>
            <View style={styles.badgeGrid}>
              {BADGE_DEFINITIONS.map((badge) => (
                <BadgeCard
                  key={badge.id}
                  badge={badge}
                  unlocked={unlockedBadges.find((b) => b.id === badge.id)}
                />
              ))}
            </View>
          </View>
        </FadeIn>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 16 },
  orb: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    bottom: 300, right: -70,
  },
  title: { fontSize: 24, fontFamily: 'Inter_700Bold', letterSpacing: -0.5 },
  subtitle: { fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 2, marginBottom: 4 },
  card: { borderRadius: 22, padding: 20, borderWidth: 1, gap: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  levelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  levelLabel: { fontSize: 12, fontFamily: 'Inter_400Regular', marginBottom: 4 },
  levelValue: { fontSize: 36, fontFamily: 'Inter_700Bold', letterSpacing: -1 },
  levelIcon: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  xpSection: { gap: 8 },
  xpRow: { flexDirection: 'row', justifyContent: 'space-between' },
  xpLabel: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  xpNext: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  xpTrack: { height: 10, borderRadius: 5, overflow: 'hidden', position: 'relative' },
  divider: { height: 1 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  statItem: { alignItems: 'center', gap: 4, flex: 1 },
  statValue: { fontSize: 20, fontFamily: 'Inter_700Bold' },
  statLabel: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  statDivider: { width: 1, height: 40 },
  avgBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  avgLabel: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  avgValue: { fontSize: 18, fontFamily: 'Inter_700Bold' },
  summaryRow: { flexDirection: 'row', gap: 10 },
  summaryItem: { flex: 1, alignItems: 'center', padding: 14, borderRadius: 16, gap: 6 },
  summaryValue: { fontSize: 18, fontFamily: 'Inter_700Bold' },
  summaryLabel: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  badgeSection: { gap: 14 },
  badgeCount: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  // account / logout
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  accountBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  overlay: { flex: 1, backgroundColor: '#00000050', justifyContent: 'center', alignItems: 'center', padding: 32 },
  logoutCard: {
    width: '100%', borderRadius: 24, borderWidth: 1,
    padding: 24, alignItems: 'center',
  },
  logoutEmail: { fontSize: 13, fontFamily: 'Inter_400Regular', marginBottom: 20 },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#EF4444', borderRadius: 14,
    paddingVertical: 14, paddingHorizontal: 28,
  },
  logoutBtnText: { color: '#fff', fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  cancelText: { fontSize: 14, fontFamily: 'Inter_400Regular' },
});
