import React, { useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  withSpring,
} from 'react-native-reanimated';

const easeOut = (t: number) => t * (2 - t);
import {
  activityPalette,
  border,
  colors,
  control,
  radius,
  screenPadding,
  space,
  typography,
} from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { CenterDialog } from '@/components/ui/BottomSheet';
import { Icon, IconBadge, iconSize, type IconName } from '@/components/ui/Icon';
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
import { charsMetByLevel } from '@/utils/encounters';
import { getTodayDate } from '@/utils/dateUtils';
import { Analytics } from '@/utils/analytics';
import { PressScale } from '@/components/ui/PressScale';

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
  const insets = useSafeAreaInsets();
  const { progress, records, unlockedBadges, growth, markGrowthSeen, encounters } = useApp();
  const [dexChar, setDexChar] = useState<CharacterKey | null>(null);
  // 成長表示を見た記録(控えめメッセージは次回以降消える)
  const grownSinceSeen = growth.growthSize - growth.lastSeenSize >= 0.005;
  useEffect(() => {
    const t = setTimeout(() => { markGrowthSeen(); }, 3000);
    return () => clearTimeout(t);
  }, [growth.growthSize]);
  const { user, isSignedIn, logout } = useAuth();
  const router = useRouter();
  const [showLogout, setShowLogout] = useState(false);

  const handleLogout = async () => {
    setShowLogout(false);
    await logout();
    router.replace('/login');
  };

  const topPad = Platform.OS === 'web' ? space.xl : insets.top;
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
  const monthReviewStats: { label: string; value: string; icon: IconName; color: string }[] = [
    ...categoryTotals.filter((c) => c.total > 0).slice(0, 3).map((c) => ({
      label: c.label, value: `${c.total}回`, icon: c.icon, color: c.color,
    })),
    { label: '続けた日', value: `${monthRecords.length}日`, icon: 'repeat' as IconName, color: activityPalette.selfCare },
    { label: 'ふりかえり', value: `${monthRecords.filter((r) => r.notes || r.win).length}日`, icon: 'edit-3' as IconName, color: colors.primary },
    { label: '大切にした日', value: `${monthRecords.filter((r) => (r.activities?.selfCare || 0) > 0).length}日`, icon: 'heart' as IconName, color: activityPalette.reading },
  ].slice(0, 6);

  // ─── キャラの成長(はじめ vs 今)。進化後は現在のキャラ画像で表示 ───
  const firstGrowth = growth.history[0]?.growthSize ?? 1.0;
  const growthPct = (v: number) => `${(v * 100).toFixed(1)}%`;
  const hasGrown = growth.growthSize - firstGrowth > 0.0005;
  const currentChar = getCharacter(getMascotStage(progress.level));
  const CHAR_IMG = STAGE_IMAGES[currentChar.key] ?? STAGE_IMAGES.egg;

  // 図鑑に出すのは「記録があり、かつ現在のレベルで実際に出会っているはずのキャラ」だけ。
  // ストレージやクラウドに未来のキャラの記録が紛れ込んでも描画されないようにする
  const metNow = new Set(charsMetByLevel(progress.level));
  const dexList = encounters.list.filter((e) => metNow.has(e.charKey));

  return (
    <View style={styles.flex}>
      <SkyBackground />

      <ScrollView
        style={styles.flex}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: topPad + space.lg,
            paddingBottom:
              (Platform.OS === 'web' ? space.xxl : insets.bottom) + control.height + space.xl,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <FadeIn delay={0}>
          <View style={styles.titleRow}>
            <View style={styles.titleCopy}>
              <Text style={styles.title}>メンタルの成長</Text>
              <Text style={styles.subtitle}>あなたの積み重ねを見える化</Text>
            </View>
            <PressScale
              style={styles.accountBtn}
              onPress={() => setShowLogout(true)}
              hitSlop={space.sm}
              accessibilityLabel="アカウント"
            >
              <Icon name="user" size={20} color={colors.foreground} />
            </PressScale>
          </View>
        </FadeIn>

        {/* アカウント */}
        <CenterDialog visible={showLogout} onClose={() => setShowLogout(false)}>
          <View style={styles.dialogHead}>
            <Icon name="user" size={32} color={colors.primary} />
            <Text style={styles.dialogTitle}>
              {isSignedIn ? 'アカウント' : 'ゲストモードで利用中'}
            </Text>
            {user?.email ? <Text style={styles.dialogSub}>{user.email}</Text> : null}
          </View>

          {!isSignedIn && (
            <>
              <Text style={styles.dialogBody}>
                記録はこの端末に保存されています。ログインすると記録と進捗をアカウントに追加して、バックアップできます。
              </Text>
              <Text style={styles.dialogNote}>
                すでにアカウントにあるプロフィールや設定は優先して保護されます。
              </Text>
              <Button
                label="ログインしてデータを保存"
                onPress={() => {
                  Analytics.guestBackupPromptOpened();
                  setShowLogout(false);
                  router.push('/login');
                }}
                icon="upload-cloud"
              />
            </>
          )}
          <Button
            label="プロフィールを編集"
            variant="outline"
            onPress={() => {
              setShowLogout(false);
              router.push('/profile');
            }}
            icon="edit-3"
          />
          <Button
            label="使い方ガイド"
            variant="outline"
            onPress={() => {
              setShowLogout(false);
              router.push('/guide');
            }}
            icon="book-open"
          />
          {isSignedIn && (
            <PressScale onPress={handleLogout} style={styles.logoutBtn}>
              <Icon name="log-out" size={16} color={colors.danger} />
              <Text style={styles.logoutBtnText}>ログアウト</Text>
            </PressScale>
          )}
          <Button label="キャンセル" variant="ghost" onPress={() => setShowLogout(false)} />
        </CenterDialog>

        {/* Level Card */}
        <FadeIn delay={100}>
          <View style={styles.card}>
            <View style={styles.levelHeader}>
              <View>
                <Text style={styles.levelLabel}>現在のレベル</Text>
                <Text style={styles.levelValue}>Lv.{progress.level}</Text>
              </View>
              <View style={styles.levelIcon}>
                <Icon name="trending-up" size={22} color={colors.primaryOnSoft} />
              </View>
            </View>

            <View style={styles.xpSection}>
              <View style={styles.xpRow}>
                <Text style={styles.xpLabel}>
                  {xpInLevel} / {XP_PER_LEVEL} XP
                </Text>
                <Text style={styles.xpNext}>次まで {xpToNextLevel(progress.experience)} XP</Text>
              </View>
              <View style={styles.xpTrack}>
                <AnimatedXPBar pct={progress.mentalMuscle} color={colors.primary} />
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.statsRow}>
              {([
                { icon: 'repeat', value: progress.streak, label: '連続' },
                { icon: 'calendar', value: progress.totalDays, label: '記録日数' },
                { icon: 'zap', value: progress.experience, label: '総XP' },
                {
                  icon: 'maximize-2',
                  value: `${(growth.growthSize * 100).toFixed(1)}%`,
                  label: '成長',
                },
              ] as { icon: IconName; value: string | number; label: string }[]).map((stat, i) => (
                <React.Fragment key={stat.label}>
                  {i > 0 && <View style={styles.statDivider} />}
                  <View style={styles.statItem}>
                    <Icon name={stat.icon} size={iconSize.sm} color={colors.subtleForeground} />
                    <Text style={styles.statValue}>{stat.value}</Text>
                    <Text style={styles.statLabel}>{stat.label}</Text>
                  </View>
                </React.Fragment>
              ))}
            </View>

            {grownSinceSeen && <Text style={styles.growthNote}>前回より少し大きくなったよ</Text>}
          </View>
        </FadeIn>

        {/* AI insight — hidden strengths */}
        <FadeIn delay={150}>
          <InsightCard />
        </FadeIn>

        {/* Mood Chart */}
        <FadeIn delay={200}>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>気分の推移（7日間）</Text>
              <View style={styles.avgBadge}>
                <Text style={styles.avgLabel}>平均</Text>
                <Text style={styles.avgValue}>{avgMood}</Text>
              </View>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <GrowthChart records={records} />
            </ScrollView>
          </View>
        </FadeIn>

        {/* Weekly Summary */}
        <FadeIn delay={300}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>週間サマリー</Text>
            <View style={styles.summaryRow}>
              {([
                { icon: 'moon', value: `${avgSleep}h`, label: '平均睡眠' },
                { icon: 'heart', value: avgMood, label: '平均気分' },
                { icon: 'file-text', value: String(last7.length), label: '記録数' },
              ] as { icon: IconName; value: string | number; label: string }[]).map((stat) => (
                <View key={stat.label} style={styles.summaryItem}>
                  <Icon name={stat.icon} size={iconSize.md} color={colors.primaryOnSoft} />
                  <Text style={styles.summaryValue}>{stat.value}</Text>
                  <Text style={styles.summaryLabel}>{stat.label}</Text>
                </View>
              ))}
            </View>
          </View>
        </FadeIn>

        {/* 今月の積み重ね(活動バーチャート) */}
        <FadeIn delay={320}>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>今月の積み重ね</Text>
              <Text style={styles.avgLabel}>{monthLabel}</Text>
            </View>
            <View style={styles.barChart}>
              {dailyCounts.map((c, i) => (
                <View key={i} style={styles.barSlot}>
                  <View
                    style={[
                      styles.bar,
                      {
                        height: c > 0 ? Math.max(space.xs, (c / maxDaily) * 72) : border.width,
                        backgroundColor: c > 0 ? colors.primary : colors.border,
                      },
                    ]}
                  />
                </View>
              ))}
            </View>
            <View style={styles.barAxis}>
              <Text style={styles.barAxisText}>1日</Text>
              <Text style={styles.barAxisText}>{daysInMonth}日</Text>
            </View>
          </View>
        </FadeIn>

        {/* 今月のふりかえり */}
        <FadeIn delay={340}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>今月のふりかえり</Text>
            <View style={styles.reviewGrid}>
              {monthReviewStats.map((stat) => (
                <View key={stat.label} style={styles.reviewItem}>
                  <Icon name={stat.icon} size={iconSize.sm} color={stat.color} />
                  <Text style={styles.reviewValue}>{stat.value}</Text>
                  <Text style={styles.reviewLabel}>{stat.label}</Text>
                </View>
              ))}
            </View>
          </View>
        </FadeIn>

        {/* キャラの成長(はじめ vs 今)。進化に合わせて画像・名前も変わる */}
        <FadeIn delay={360}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{currentChar.name}の成長</Text>
            <View style={styles.eggCompareRow}>
              <View style={styles.eggCompareItem}>
                <View style={styles.eggImgBox}>
                  <Image source={CHAR_IMG} style={{ width: 64 * firstGrowth, height: 64 * firstGrowth }} resizeMode="contain" />
                </View>
                <Text style={styles.eggCompareLabel}>はじめの頃</Text>
                <Text style={styles.eggComparePct}>{growthPct(firstGrowth)}</Text>
              </View>
              <Icon name="arrow-right" size={16} color={colors.subtleForeground} />
              <View style={styles.eggCompareItem}>
                <View style={styles.eggImgBox}>
                  <Image source={CHAR_IMG} style={{ width: 64 * growth.growthSize, height: 64 * growth.growthSize }} resizeMode="contain" />
                </View>
                <Text style={styles.eggCompareLabelNow}>いま</Text>
                <Text style={styles.eggComparePctNow}>{growthPct(growth.growthSize)}</Text>
              </View>
            </View>
            <Text style={styles.growthNote}>
              {hasGrown ? '一緒にすごした時間がぼくの成長になったよ' : 'これから少しずつ大きくなっていくよ'}
            </Text>
          </View>
        </FadeIn>

        {/* マイヒストリー */}
        {growth.history.length > 1 && (
          <FadeIn delay={380}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>マイヒストリー</Text>
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
                      <Text style={styles.historyDay}>
                        {i === 0 ? 'はじめの日' : `${snap.date.slice(5).replace('-', '/')}`}
                      </Text>
                      <Text style={styles.historyPct}>{growthPct(snap.growthSize)}</Text>
                    </View>
                  ))}
              </View>
            </View>
          </FadeIn>
        )}

        {/* キャラクター図鑑: 出会った仲間だけが並ぶ(未登場キャラは表示しない) */}
        <FadeIn delay={370}>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>キャラクター図鑑</Text>
              <Text style={styles.badgeCount}>出会った仲間 {dexList.length}</Text>
            </View>
            {dexList.length === 0 ? (
              <Text style={styles.growthNote}>仲間と出会うと、ここに記録されていくよ</Text>
            ) : (
              <View style={styles.dexGrid}>
                {dexList.map((e) => {
                  const p = DEX_PROFILES[e.charKey];
                  const isCurrent = e.charKey === currentChar.key;
                  return (
                    <PressScale
                      key={e.charKey}
                      style={[styles.dexCell, isCurrent && styles.dexCellCurrent]}
                      onPress={() => setDexChar(e.charKey)}
                    >
                      <Image source={DEX_IMAGES[e.charKey]} style={styles.dexImg} resizeMode="contain" />
                      <Text style={styles.dexName}>{p.name}</Text>
                      <Text style={styles.dexMet}>
                        {isCurrent ? 'いまのパートナー' : e.metDate.slice(5).replace('-', '/') + ' 出会い'}
                      </Text>
                    </PressScale>
                  );
                })}
              </View>
            )}
            {/* この子たちについて(世界観カード) */}
            <Text style={styles.dexAboutTitle}>この子たちについて</Text>
            <View style={styles.worldList}>
              {WORLD_CARDS.map((c, i) => (
                <View key={c.title} style={styles.worldCard}>
                  <Icon name={c.icon} size={iconSize.md} color={colors.primaryOnSoft} />
                  <View style={styles.worldCopy}>
                    <Text style={styles.worldTitle}>{c.title}</Text>
                    <Text style={styles.worldText}>{c.text}</Text>
                  </View>
                  {i < WORLD_CARDS.length - 1 && (
                    <Icon name="chevron-down" size={14} color={colors.subtleForeground} />
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
              <Text style={styles.cardTitle}>バッジ</Text>
              <Text style={styles.badgeCount}>
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
          metDate={dexList.find((e) => e.charKey === dexChar)?.metDate ?? ''}
          isCurrent={dexChar === currentChar.key}
          onClose={() => setDexChar(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: screenPadding, gap: space.lg },

  /* 見出し */
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  titleCopy: { flex: 1 },
  title: { ...typography.display, color: colors.foreground },
  subtitle: { ...typography.caption, color: colors.mutedForeground, marginTop: space.xs },
  accountBtn: {
    width: control.icon,
    height: control.icon,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    ...border.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* カード共通 */
  card: {
    backgroundColor: colors.card,
    ...border.hairline,
    borderRadius: radius.lg,
    padding: space.lg,
    gap: space.lg,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { ...typography.subhead, color: colors.foreground },
  divider: { height: border.width, backgroundColor: colors.border },

  /* レベル */
  levelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  levelLabel: { ...typography.caption, color: colors.mutedForeground },
  levelValue: { ...typography.display, color: colors.foreground, marginTop: space.xs },
  levelIcon: {
    width: control.icon,
    height: control.icon,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  xpSection: { gap: space.sm },
  xpRow: { flexDirection: 'row', justifyContent: 'space-between' },
  xpLabel: { ...typography.caption, color: colors.mutedForeground },
  xpNext: { ...typography.label, color: colors.primaryOnSoft },
  xpTrack: {
    height: space.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.muted,
    overflow: 'hidden',
    position: 'relative',
  },

  /* 統計 */
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  statItem: { alignItems: 'center', gap: space.xs, flex: 1 },
  statValue: { ...typography.title, color: colors.foreground },
  statLabel: { ...typography.micro, color: colors.mutedForeground },
  statDivider: { width: border.width, height: space.xxl, backgroundColor: colors.border },
  growthNote: { ...typography.caption, color: colors.mutedForeground, textAlign: 'center' },

  /* 平均バッジ */
  avgBadge: { flexDirection: 'row', alignItems: 'baseline', gap: space.xs },
  avgLabel: { ...typography.caption, color: colors.mutedForeground },
  avgValue: { ...typography.heading, color: colors.primaryOnSoft },

  /* 週間サマリー */
  summaryRow: { flexDirection: 'row', gap: space.sm },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    padding: space.lg,
    borderRadius: radius.md,
    backgroundColor: colors.muted,
    gap: space.xs,
  },
  summaryValue: { ...typography.heading, color: colors.foreground },
  summaryLabel: { ...typography.micro, color: colors.mutedForeground },

  /* 月次バーチャート */
  barChart: { flexDirection: 'row', alignItems: 'flex-end', height: 72, gap: 2 },
  barSlot: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  bar: { width: '100%', borderRadius: 2 },
  barAxis: { flexDirection: 'row', justifyContent: 'space-between' },
  barAxisText: { ...typography.micro, color: colors.mutedForeground },

  /* 月次ふりかえり */
  reviewGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  reviewItem: {
    width: '30%',
    flexGrow: 1,
    alignItems: 'center',
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.muted,
    gap: space.xs,
  },
  reviewValue: { ...typography.subhead, color: colors.foreground },
  reviewLabel: { ...typography.micro, color: colors.mutedForeground, textAlign: 'center' },

  /* 成長比較 */
  eggCompareRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-evenly' },
  eggCompareItem: { alignItems: 'center', gap: space.xs },
  eggImgBox: { height: 72, alignItems: 'center', justifyContent: 'flex-end' },
  eggCompareLabel: { ...typography.caption, color: colors.mutedForeground },
  eggCompareLabelNow: { ...typography.caption, color: colors.foreground },
  eggComparePct: { ...typography.calloutStrong, color: colors.mutedForeground },
  eggComparePctNow: { ...typography.calloutStrong, color: colors.primaryOnSoft },

  /* ヒストリー */
  historyRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end' },
  historyItem: { alignItems: 'center', gap: space.xs },
  historyDay: { ...typography.micro, color: colors.foreground },
  historyPct: { ...typography.micro, color: colors.mutedForeground },

  /* 図鑑 */
  dexGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  dexCell: {
    flexGrow: 1,
    flexBasis: '45%',
    alignItems: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.muted,
    ...border.hairline,
    padding: space.md,
    gap: space.xs,
  },
  // いまのパートナーだけ枠線を一段濃くする。塗りは変えない。
  dexCellCurrent: { borderColor: colors.primary },
  dexImg: { width: 64, height: 64 },
  dexName: { ...typography.label, color: colors.foreground },
  dexMet: { ...typography.micro, color: colors.mutedForeground },
  dexAboutTitle: { ...typography.label, color: colors.foreground },
  worldList: { gap: space.sm },
  worldCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.muted,
    padding: space.md,
  },
  worldCopy: { flex: 1 },
  worldTitle: { ...typography.label, color: colors.foreground },
  worldText: { ...typography.caption, color: colors.mutedForeground, marginTop: space.xs },

  /* バッジ */
  badgeSection: { gap: space.md },
  badgeCount: { ...typography.caption, color: colors.mutedForeground },
  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },

  /* アカウントダイアログ */
  dialogHead: { alignItems: 'center', gap: space.xs, marginBottom: space.sm },
  dialogTitle: { ...typography.heading, color: colors.foreground },
  dialogSub: { ...typography.caption, color: colors.mutedForeground },
  dialogBody: { ...typography.callout, color: colors.mutedForeground },
  dialogNote: { ...typography.caption, color: colors.subtleForeground },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    minHeight: control.height,
    borderRadius: radius.md,
    backgroundColor: colors.dangerSoft,
  },
  logoutBtnText: { ...typography.bodyStrong, color: colors.danger },
});
