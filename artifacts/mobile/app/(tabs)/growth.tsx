import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
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
import { useCosmicColors as useColors, COSMIC_SHEET } from '@/constants/cosmicTheme';
import { SkyBackground } from '@/components/SkyBackground';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { GrowthChart } from '@/components/GrowthChart';
import { BadgeCard } from '@/components/BadgeCard';
import { MoodCalendar } from '@/components/MoodCalendar';
import { InsightCard } from '@/components/InsightCard';
import { BADGE_DEFINITIONS } from '@/data/badges';
import { xpToNextLevel, XP_PER_LEVEL } from '@/utils/gameLogic';
import { getMascotStage, getCharacter } from '@/utils/mascotUtils';
import { Image, ImageSourcePropType } from 'react-native';
import { ACTIVITY_DEFS, totalActivityCount } from '@/utils/activities';
import { DEX_PROFILES, WORLD_CARDS } from '@/data/characterDex';
import { DEX_IMAGES } from '@/components/dex/dexAssets';
import { CharacterDexModal } from '@/components/dex/CharacterDexModal';
import type { CharacterKey } from '@/utils/mascotUtils';
import { getTodayDate } from '@/utils/dateUtils';

// ステージごとのキャラ画像(進化に合わせて成長比較の見た目も切り替える)
const STAGE_IMAGES: Record<string, ImageSourcePropType> = {
  egg: require('../../assets/images/egg/normal.png'),
  odango: require('../../assets/images/characters/odango.png'),
  happa: require('../../assets/images/characters/happa.png'),
  colorful_happa: require('../../assets/images/characters/colorful_happa.png'),
};

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
  const { progress, records, unlockedBadges, growth, markGrowthSeen, encounters } = useApp();
  const [dexChar, setDexChar] = useState<CharacterKey | null>(null);
  // 成長表示を見た記録(控えめメッセージは次回以降消える)
  const grownSinceSeen = growth.growthSize - growth.lastSeenSize >= 0.005;
  useEffect(() => {
    const t = setTimeout(() => { markGrowthSeen(); }, 3000);
    return () => clearTimeout(t);
  }, [growth.growthSize]);
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

  // ─── 今月の積み重ね(日ごとの活動カウント)と月間ふりかえり ───
  const today = getTodayDate(); // YYYY-MM-DD
  const monthPrefix = today.slice(0, 7);
  const monthRecords = records.filter((r) => r.date.startsWith(monthPrefix));
  const daysInMonth = new Date(Number(monthPrefix.slice(0, 4)), Number(monthPrefix.slice(5, 7)), 0).getDate();
  const dailyCounts: number[] = Array.from({ length: daysInMonth }, (_, i) => {
    const d = `${monthPrefix}-${String(i + 1).padStart(2, '0')}`;
    const rec = monthRecords.find((r) => r.date === d);
    if (!rec) return 0;
    return totalActivityCount(rec.activities) + rec.behaviors.length;
  });
  const maxDaily = Math.max(1, ...dailyCounts);
  const monthLabel = `${Number(monthPrefix.slice(0, 4))}年${Number(monthPrefix.slice(5, 7))}月`;
  // カテゴリ別の月間合計
  const categoryTotals = ACTIVITY_DEFS.map((a) => ({
    ...a,
    total: monthRecords.reduce((s, r) => s + (r.activities?.[a.key] || 0), 0),
  }));
  const monthReviewStats = [
    ...categoryTotals.filter((c) => c.total > 0).slice(0, 3).map((c) => ({
      label: c.label, value: `${c.total}回`, icon: c.icon, color: c.color,
    })),
    { label: '続けた日', value: `${monthRecords.length}日`, icon: 'flame', color: '#FF6FA3' },
    { label: 'ふりかえり', value: `${monthRecords.filter((r) => r.notes || r.win).length}日`, icon: 'create-outline', color: colors.primary },
    { label: '大切にした日', value: `${monthRecords.filter((r) => (r.activities?.selfCare || 0) > 0).length}日`, icon: 'heart-outline', color: '#FF9ECD' },
  ].slice(0, 6);

  // ─── キャラの成長(はじめ vs 今)。進化後は現在のキャラ画像で表示 ───
  const firstGrowth = growth.history[0]?.growthSize ?? 1.0;
  const growthPct = (v: number) => `${(v * 100).toFixed(1)}%`;
  const hasGrown = growth.growthSize - firstGrowth > 0.0005;
  const currentChar = getCharacter(getMascotStage(progress.level));
  const CHAR_IMG = STAGE_IMAGES[currentChar.key] ?? STAGE_IMAGES.egg;

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <SkyBackground />

      {/* Decorative orb */}
      <View style={[styles.orb, { backgroundColor: colors.secondary + '12' }]} />

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
            <TouchableOpacity activeOpacity={1} style={[styles.logoutCard, { backgroundColor: COSMIC_SHEET, borderColor: colors.border }]}>
              <Ionicons name="person-circle" size={40} color={colors.primary} style={{ marginBottom: 8 }} />
              {user?.email && (
                <Text style={[styles.logoutEmail, { color: colors.mutedForeground }]}>{user.email}</Text>
              )}
              <TouchableOpacity
                style={[styles.profileBtn, { backgroundColor: colors.muted }]}
                onPress={() => { setShowLogout(false); router.push('/profile'); }}
                activeOpacity={0.85}
              >
                <Ionicons name="create-outline" size={18} color={colors.foreground} />
                <Text style={[styles.profileBtnText, { color: colors.foreground }]}>プロフィールを編集</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.profileBtn, { backgroundColor: colors.muted }]}
                onPress={() => { setShowLogout(false); router.push('/guide'); }}
                activeOpacity={0.85}
              >
                <Ionicons name="book-outline" size={18} color={colors.foreground} />
                <Text style={[styles.profileBtnText, { color: colors.foreground }]}>使い方ガイド</Text>
              </TouchableOpacity>
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
              colors={['rgba(28,18,61,0.62)', 'rgba(28,18,61,0.45)']}
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
                { icon: 'resize-outline', color: '#7FDCA4', value: `${(growth.growthSize * 100).toFixed(1)}%`, label: '成長' },
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

            {grownSinceSeen && (
              <Text style={[styles.growthNote, { color: colors.mutedForeground }]}>
                前回より少し大きくなったよ
              </Text>
            )}
          </View>
        </FadeIn>

        {/* AI insight — hidden strengths */}
        <FadeIn delay={150}>
          <InsightCard />
        </FadeIn>

        {/* Mood Chart */}
        <FadeIn delay={200}>
          <View style={[styles.card, { borderColor: colors.border, overflow: 'hidden' }]}>
            <LinearGradient
              colors={['rgba(28,18,61,0.62)', 'rgba(28,18,61,0.45)']}
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
              colors={['rgba(28,18,61,0.62)', 'rgba(28,18,61,0.45)']}
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

        {/* 今月の積み重ね(活動バーチャート) */}
        <FadeIn delay={320}>
          <View style={[styles.card, { borderColor: colors.border, overflow: 'hidden' }]}>
            <LinearGradient
              colors={['rgba(28,18,61,0.62)', 'rgba(28,18,61,0.45)']}
              style={[StyleSheet.absoluteFill, { borderRadius: 22 }]}
            />
            <View style={styles.cardHeader}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>今月の積み重ね</Text>
              <Text style={[styles.avgLabel, { color: colors.mutedForeground }]}>{monthLabel}</Text>
            </View>
            <View style={styles.barChart}>
              {dailyCounts.map((c, i) => (
                <View key={i} style={styles.barSlot}>
                  <View
                    style={[
                      styles.bar,
                      {
                        height: c > 0 ? Math.max(4, (c / maxDaily) * 72) : 2,
                        backgroundColor: c > 0 ? colors.accent : colors.muted,
                      },
                    ]}
                  />
                </View>
              ))}
            </View>
            <View style={styles.barAxis}>
              <Text style={[styles.barAxisText, { color: colors.mutedForeground }]}>1日</Text>
              <Text style={[styles.barAxisText, { color: colors.mutedForeground }]}>{daysInMonth}日</Text>
            </View>
          </View>
        </FadeIn>

        {/* 今月のふりかえり */}
        <FadeIn delay={340}>
          <View style={[styles.card, { borderColor: colors.border, overflow: 'hidden' }]}>
            <LinearGradient
              colors={['rgba(28,18,61,0.62)', 'rgba(28,18,61,0.45)']}
              style={[StyleSheet.absoluteFill, { borderRadius: 22 }]}
            />
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>今月のふりかえり</Text>
            <View style={styles.reviewGrid}>
              {monthReviewStats.map((s) => (
                <View key={s.label} style={[styles.reviewItem, { backgroundColor: colors.muted }]}>
                  <Ionicons name={s.icon as any} size={18} color={s.color} />
                  <Text style={[styles.reviewValue, { color: colors.foreground }]}>{s.value}</Text>
                  <Text style={[styles.reviewLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
                </View>
              ))}
            </View>
          </View>
        </FadeIn>

        {/* キャラの成長(はじめ vs 今)。進化に合わせて画像・名前も変わる */}
        <FadeIn delay={360}>
          <View style={[styles.card, { borderColor: colors.border, overflow: 'hidden' }]}>
            <LinearGradient
              colors={['rgba(28,18,61,0.62)', 'rgba(28,18,61,0.45)']}
              style={[StyleSheet.absoluteFill, { borderRadius: 22 }]}
            />
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>{currentChar.name}の成長</Text>
            <View style={styles.eggCompareRow}>
              <View style={styles.eggCompareItem}>
                <View style={styles.eggImgBox}>
                  <Image source={CHAR_IMG} style={{ width: 64 * firstGrowth, height: 64 * firstGrowth }} resizeMode="contain" />
                </View>
                <Text style={[styles.eggCompareLabel, { color: colors.mutedForeground }]}>はじめの頃</Text>
                <Text style={[styles.eggComparePct, { color: colors.mutedForeground }]}>{growthPct(firstGrowth)}</Text>
              </View>
              <Ionicons name="arrow-forward" size={20} color={colors.mutedForeground} />
              <View style={styles.eggCompareItem}>
                <View style={styles.eggImgBox}>
                  <Image source={CHAR_IMG} style={{ width: 64 * growth.growthSize, height: 64 * growth.growthSize }} resizeMode="contain" />
                </View>
                <Text style={[styles.eggCompareLabel, { color: colors.foreground }]}>いま</Text>
                <Text style={[styles.eggComparePct, { color: colors.primary }]}>{growthPct(growth.growthSize)}</Text>
              </View>
            </View>
            <Text style={[styles.growthNote, { color: colors.mutedForeground, marginTop: 0 }]}>
              {hasGrown ? '一緒にすごした時間がぼくの成長になったよ' : 'これから少しずつ大きくなっていくよ'}
            </Text>
          </View>
        </FadeIn>

        {/* マイヒストリー */}
        {growth.history.length > 1 && (
          <FadeIn delay={380}>
            <View style={[styles.card, { borderColor: colors.border, overflow: 'hidden' }]}>
              <LinearGradient
                colors={['rgba(28,18,61,0.62)', 'rgba(28,18,61,0.45)']}
                style={[StyleSheet.absoluteFill, { borderRadius: 22 }]}
              />
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>マイヒストリー</Text>
              <View style={styles.historyRow}>
                {[0, 14, 29, 59]
                  .map((offset) => growth.history[Math.min(offset, growth.history.length - 1)])
                  .filter((snap, i, arr) => snap && arr.findIndex((s) => s?.date === snap.date) === i)
                  .map((snap, i) => (
                    <View key={snap.date} style={styles.historyItem}>
                      <Image
                        source={CHAR_IMG}
                        style={{ width: 34 * snap.growthSize, height: 34 * snap.growthSize, opacity: 0.6 + i * 0.13 }}
                        resizeMode="contain"
                      />
                      <Text style={[styles.historyDay, { color: colors.foreground }]}>
                        {i === 0 ? 'はじめの日' : `${snap.date.slice(5).replace('-', '/')}`}
                      </Text>
                      <Text style={[styles.historyPct, { color: colors.mutedForeground }]}>
                        {growthPct(snap.growthSize)}
                      </Text>
                    </View>
                  ))}
              </View>
            </View>
          </FadeIn>
        )}

        {/* キャラクター図鑑: 出会った仲間だけが並ぶ(未登場キャラは表示しない) */}
        <FadeIn delay={370}>
          <View style={[styles.card, { borderColor: colors.border, overflow: 'hidden' }]}>
            <LinearGradient
              colors={['rgba(28,18,61,0.62)', 'rgba(28,18,61,0.45)']}
              style={[StyleSheet.absoluteFill, { borderRadius: 22 }]}
            />
            <View style={styles.cardHeader}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>キャラクター図鑑</Text>
              <Text style={[styles.badgeCount, { color: colors.mutedForeground }]}>
                出会った仲間 {encounters.list.length}
              </Text>
            </View>
            {encounters.list.length === 0 ? (
              <Text style={[styles.growthNote, { color: colors.mutedForeground, marginTop: 0 }]}>
                仲間と出会うと、ここに記録されていくよ
              </Text>
            ) : (
              <View style={styles.dexGrid}>
                {encounters.list.map((e) => {
                  const p = DEX_PROFILES[e.charKey];
                  const isCurrent = e.charKey === currentChar.key;
                  return (
                    <TouchableOpacity
                      key={e.charKey}
                      style={[styles.dexCell, { backgroundColor: colors.muted }, isCurrent && styles.dexCellCurrent]}
                      onPress={() => setDexChar(e.charKey)}
                      activeOpacity={0.85}
                    >
                      <Image source={DEX_IMAGES[e.charKey]} style={styles.dexImg} resizeMode="contain" />
                      <Text style={[styles.dexName, { color: colors.foreground }]}>{p.name}</Text>
                      <Text style={[styles.dexMet, { color: colors.mutedForeground }]}>
                        {isCurrent ? 'いまのパートナー' : e.metDate.slice(5).replace('-', '/') + ' 出会い'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
            {/* この子たちについて(世界観カード) */}
            <Text style={[styles.dexAboutTitle, { color: colors.foreground }]}>この子たちについて</Text>
            <View style={styles.worldList}>
              {WORLD_CARDS.map((c, i) => (
                <View key={c.title} style={[styles.worldCard, { backgroundColor: colors.muted }]}>
                  <Text style={styles.worldEmoji}>{c.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.worldTitle, { color: colors.foreground }]}>{c.title}</Text>
                    <Text style={[styles.worldText, { color: colors.mutedForeground }]}>{c.text}</Text>
                  </View>
                  {i < WORLD_CARDS.length - 1 && (
                    <Ionicons name="chevron-down" size={14} color={colors.mutedForeground} style={styles.worldArrow} />
                  )}
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

      {/* キャラ詳細(図鑑) */}
      {dexChar && (
        <CharacterDexModal
          charKey={dexChar}
          metDate={encounters.list.find((e) => e.charKey === dexChar)?.metDate ?? ''}
          isCurrent={dexChar === currentChar.key}
          onClose={() => setDexChar(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 16 },
  dexGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  dexCell: {
    width: '47.5%', alignItems: 'center', borderRadius: 16,
    paddingVertical: 14, paddingHorizontal: 8, gap: 4,
  },
  dexCellCurrent: { borderWidth: 1, borderColor: 'rgba(255,201,77,0.5)' },
  dexImg: { width: 64, height: 64 },
  dexName: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  dexMet: { fontSize: 10, fontFamily: 'Inter_400Regular' },
  dexAboutTitle: { fontSize: 13, fontFamily: 'Inter_600SemiBold', marginTop: 4 },
  worldList: { gap: 8 },
  worldCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 14, padding: 12,
  },
  worldEmoji: { fontSize: 20 },
  worldTitle: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  worldText: { fontSize: 11, fontFamily: 'Inter_400Regular', lineHeight: 16, marginTop: 2 },
  worldArrow: { alignSelf: 'center' },
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
  growthNote: { fontSize: 11, fontFamily: 'Inter_400Regular', textAlign: 'center', marginTop: 10 },
  statDivider: { width: 1, height: 40 },
  avgBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  avgLabel: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  avgValue: { fontSize: 18, fontFamily: 'Inter_700Bold' },
  summaryRow: { flexDirection: 'row', gap: 10 },
  summaryItem: { flex: 1, alignItems: 'center', padding: 14, borderRadius: 16, gap: 6 },
  summaryValue: { fontSize: 18, fontFamily: 'Inter_700Bold' },
  summaryLabel: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  barChart: { flexDirection: 'row', alignItems: 'flex-end', height: 76, gap: 2 },
  barSlot: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  bar: { width: '100%', borderRadius: 2 },
  barAxis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -6 },
  barAxisText: { fontSize: 10, fontFamily: 'Inter_400Regular' },
  reviewGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  reviewItem: { width: '30%', flexGrow: 1, alignItems: 'center', padding: 12, borderRadius: 14, gap: 4 },
  reviewValue: { fontSize: 16, fontFamily: 'Inter_700Bold' },
  reviewLabel: { fontSize: 10.5, fontFamily: 'Inter_400Regular', textAlign: 'center' },
  eggCompareRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-evenly' },
  eggCompareItem: { alignItems: 'center', gap: 4 },
  eggImgBox: { height: 76, alignItems: 'center', justifyContent: 'flex-end' },
  eggCompareLabel: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  eggComparePct: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  historyRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end' },
  historyItem: { alignItems: 'center', gap: 3 },
  historyDay: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  historyPct: { fontSize: 10, fontFamily: 'Inter_400Regular' },
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
  profileBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 14, paddingVertical: 14, paddingHorizontal: 28, marginBottom: 10,
  },
  profileBtnText: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#EF4444', borderRadius: 14,
    paddingVertical: 14, paddingHorizontal: 28,
  },
  logoutBtnText: { color: '#fff', fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  cancelText: { fontSize: 14, fontFamily: 'Inter_400Regular' },
});
