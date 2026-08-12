import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withSequence,
  withTiming, withSpring, withDelay, FadeInUp, FadeOut,
} from 'react-native-reanimated';
import { useCosmicColors as useColors } from '@/constants/cosmicTheme';
import { CosmicBackground } from '@/components/CosmicBackground';
import { useApp } from '@/contexts/AppContext';
import {
  plantLevelFor, plantLevelProgress, MAX_PLANT_LEVEL,
  TOWN_ITEMS, nextTownItem,
} from '@/utils/powerPlant';

const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;

/* ── 太陽(光の力でほんのり脈動) ── */
function Sun({ lightPower }: { lightPower: number }) {
  const glow = useSharedValue(0.5);
  useEffect(() => {
    glow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1400, easing: easeInOutSine }),
        withTiming(0.5, { duration: 1400, easing: easeInOutSine }),
      ), -1, false,
    );
  }, []);
  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.25 + glow.value * (0.2 + lightPower / 250),
    transform: [{ scale: 1 + glow.value * 0.12 }],
  }));
  return (
    <View style={styles.sunWrap}>
      <Animated.View style={[styles.sunGlow, glowStyle]} />
      <LinearGradient
        colors={['#FFE9A0', '#FFC94D', '#FF9D2E']}
        style={styles.sunBody}
        start={{ x: 0.2, y: 0.1 }} end={{ x: 0.8, y: 0.95 }}
      />
    </View>
  );
}

/* ── ソーラーパネル(レベルぶん並ぶ) ── */
function Panels({ level }: { level: number }) {
  return (
    <View style={styles.panelRow}>
      {Array.from({ length: MAX_PLANT_LEVEL }).map((_, i) => {
        const built = i < level;
        return (
          <View key={i} style={[styles.panel, !built && styles.panelGhost]}>
            {built ? (
              <LinearGradient
                colors={['#3D68C4', '#22407F']}
                style={styles.panelFace}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              >
                <View style={styles.panelLine} />
                <View style={[styles.panelLine, { top: '62%' }]} />
              </LinearGradient>
            ) : (
              <View style={[styles.panelFace, styles.panelFaceGhost]} />
            )}
            <View style={[styles.panelLeg, !built && { backgroundColor: 'rgba(255,255,255,0.12)' }]} />
          </View>
        );
      })}
    </View>
  );
}

/* ── 街並み(建設済みアイテムが並ぶ) ── */
function Town({ built, justBuiltKey }: { built: number; justBuiltKey: string | null }) {
  return (
    <View style={styles.townRow}>
      {TOWN_ITEMS.map((item, i) => {
        const isBuilt = i < built;
        const isNew = item.key === justBuiltKey;
        return (
          <View key={item.key} style={styles.townCell}>
            {isNew ? (
              <Animated.Text entering={FadeInUp.springify().damping(9)} style={styles.townEmoji}>
                {item.emoji}
              </Animated.Text>
            ) : (
              <Text style={[styles.townEmoji, !isBuilt && styles.townGhost]}>
                {isBuilt ? item.emoji : '·'}
              </Text>
            )}
            <Text style={[styles.townName, { opacity: isBuilt ? 0.9 : 0.35 }]}>{item.name}</Text>
          </View>
        );
      })}
    </View>
  );
}

export default function PlantScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { lightEnergy, powerPlant, sellEnergy, buildTownItem } = useApp();

  const [selling, setSelling] = useState(false);
  const [soldMsg, setSoldMsg] = useState<string | null>(null);
  const [builtMsg, setBuiltMsg] = useState<string | null>(null);
  const [justBuiltKey, setJustBuiltKey] = useState<string | null>(null);

  const level = plantLevelFor(lightEnergy.totalEnergy);
  const levelProgress = plantLevelProgress(lightEnergy.totalEnergy);
  const next = nextTownItem(powerPlant);
  const sellable = Math.floor(lightEnergy.storedEnergy);

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const sellScale = useSharedValue(1);
  const sellStyle = useAnimatedStyle(() => ({ transform: [{ scale: sellScale.value }] }));

  const handleSell = async () => {
    if (selling || sellable <= 0) return;
    setSelling(true);
    sellScale.value = withSequence(
      withSpring(0.94, { damping: 8, stiffness: 400 }),
      withSpring(1, { damping: 10, stiffness: 200 }),
    );
    try {
      const { sold, gained } = await sellEnergy();
      if (sold > 0) {
        setSoldMsg(`⚡${sold} → 🌱 エコポイント +${gained}!`);
        setTimeout(() => setSoldMsg(null), 2600);
      }
    } finally {
      setSelling(false);
    }
  };

  const handleBuild = async () => {
    const { built } = await buildTownItem();
    if (built) {
      setJustBuiltKey(built.key);
      setBuiltMsg(`${built.emoji} ${built.name}が建ったよ! ${built.flavor}`);
      setTimeout(() => { setBuiltMsg(null); setJustBuiltKey(null); }, 3200);
    }
  };

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <CosmicBackground />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: topPad + 16, paddingBottom: Platform.OS === 'web' ? 34 + 90 : insets.bottom + 90 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.title, { color: colors.foreground }]}>ひかり発電所</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              キミの光が、街を明るくする
            </Text>
          </View>
          <View style={[styles.levelBadge, { backgroundColor: '#FFC94D22', borderColor: '#FFC94D66' }]}>
            <Text style={styles.levelBadgeText}>Lv.{level}</Text>
          </View>
        </View>

        {/* 発電所シーン */}
        <View style={[styles.card, styles.sceneCard, { borderColor: colors.border }]}>
          <LinearGradient
            colors={['rgba(35,22,70,0.9)', 'rgba(18,12,40,0.95)']}
            style={StyleSheet.absoluteFill}
          />
          <Sun lightPower={lightEnergy.lightPower} />
          <Panels level={level} />
          <View style={styles.ground} />
          {/* レベル進捗 */}
          <View style={styles.levelRow}>
            <Text style={styles.levelLabel}>
              {level >= MAX_PLANT_LEVEL
                ? '発電所は最大サイズ! すごい!'
                : `つぎのパネルまで`}
            </Text>
            <View style={styles.levelTrack}>
              <View style={[styles.levelFill, { width: `${levelProgress * 100}%` }]} />
            </View>
          </View>
        </View>

        {/* 発電ステータス */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.statsRow}>
            <View style={styles.statCell}>
              <Text style={[styles.statValue, { color: '#FFD86B' }]}>{lightEnergy.todayEnergy}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>今日の発電</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statCell}>
              <Text style={[styles.statValue, { color: '#8AB4FF' }]}>{sellable}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>蓄電中</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statCell}>
              <Text style={[styles.statValue, { color: colors.foreground }]}>{lightEnergy.totalEnergy}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>累計</Text>
            </View>
          </View>
        </View>

        {/* 売電 */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardIcon}>🔋</Text>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>売電する</Text>
            <View style={[styles.ecoBadge, { backgroundColor: '#7FDCA422' }]}>
              <Text style={styles.ecoBadgeText}>🌱 {powerPlant.ecoPoints}</Text>
            </View>
          </View>
          <Text style={[styles.hint, { color: colors.mutedForeground }]}>
            蓄電したエネルギーをエコポイントに変えられるよ。少しずつでもOK!
          </Text>
          {soldMsg && (
            <Animated.View
              entering={FadeInUp.springify().damping(10)}
              exiting={FadeOut}
              style={[styles.soldBanner, { backgroundColor: '#7FDCA426', borderColor: '#7FDCA466' }]}
            >
              <Text style={styles.soldBannerText}>{soldMsg}</Text>
            </Animated.View>
          )}
          <Animated.View style={sellStyle}>
            <TouchableOpacity
              onPress={handleSell}
              disabled={selling || sellable <= 0}
              activeOpacity={0.9}
              style={styles.sellBtnWrap}
            >
              <LinearGradient
                colors={sellable > 0 ? ['#FFC94D', '#FF9D2E'] : ['#3A3357', '#3A3357']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.sellBtn}
              >
                <Ionicons name="flash" size={18} color={sellable > 0 ? '#3A2400' : 'rgba(255,255,255,0.4)'} />
                <Text style={[styles.sellBtnText, { color: sellable > 0 ? '#3A2400' : 'rgba(255,255,255,0.4)' }]}>
                  {sellable > 0 ? `⚡${sellable} を売電する` : '蓄電がたまったら売電できるよ'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* 街の発展 */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardIcon}>🏘️</Text>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>街の発展</Text>
            <Text style={[styles.builtCount, { color: colors.mutedForeground }]}>
              {powerPlant.townBuilt}/{TOWN_ITEMS.length}
            </Text>
          </View>
          <Town built={powerPlant.townBuilt} justBuiltKey={justBuiltKey} />
          {builtMsg && (
            <Animated.View
              entering={FadeInUp.springify().damping(10)}
              exiting={FadeOut}
              style={[styles.soldBanner, { backgroundColor: '#FFC94D22', borderColor: '#FFC94D55' }]}
            >
              <Text style={[styles.soldBannerText, { color: '#FFD86B' }]}>{builtMsg}</Text>
            </Animated.View>
          )}
          {next ? (
            <TouchableOpacity
              onPress={handleBuild}
              disabled={powerPlant.ecoPoints < next.cost}
              activeOpacity={0.9}
              style={[
                styles.buildBtn,
                {
                  backgroundColor: powerPlant.ecoPoints >= next.cost ? '#7FDCA4' : colors.muted,
                },
              ]}
            >
              <Text
                style={[
                  styles.buildBtnText,
                  { color: powerPlant.ecoPoints >= next.cost ? '#0D3321' : colors.mutedForeground },
                ]}
              >
                {next.emoji} {next.name}を建てる(🌱{next.cost})
              </Text>
              {powerPlant.ecoPoints < next.cost && (
                <Text style={[styles.buildNeed, { color: colors.mutedForeground }]}>
                  あと 🌱{next.cost - powerPlant.ecoPoints}
                </Text>
              )}
            </TouchableOpacity>
          ) : (
            <Text style={[styles.hint, { color: '#FFD86B' }]}>
              🎉 街は最高に発展したよ! ここまで育ててくれてありがとう!
            </Text>
          )}
        </View>

        {/* ショップ(将来拡張の枠) */}
        <View style={[styles.card, styles.shopCard, { borderColor: colors.border }]}>
          <Text style={styles.cardIcon}>🛍️</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>アイテムショップ</Text>
            <Text style={[styles.hint, { color: colors.mutedForeground }]}>
              エコポイントでキャラのアイテムが買えるようになるよ(準備中)
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 14 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 24, fontFamily: 'Inter_700Bold', letterSpacing: -0.5 },
  subtitle: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  levelBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1 },
  levelBadgeText: { fontSize: 14, fontFamily: 'Inter_700Bold', color: '#FFD86B' },
  card: { borderRadius: 22, padding: 18, borderWidth: 1, gap: 12, overflow: 'hidden' },
  sceneCard: { paddingBottom: 14, gap: 0 },
  sunWrap: { alignSelf: 'center', width: 84, height: 84, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  sunGlow: {
    position: 'absolute', width: 84, height: 84, borderRadius: 42,
    backgroundColor: '#FFC94D',
  },
  sunBody: { width: 54, height: 54, borderRadius: 27 },
  panelRow: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end',
    gap: 10, marginTop: 4,
  },
  panel: { alignItems: 'center' },
  panelGhost: { opacity: 0.7 },
  panelFace: {
    width: 40, height: 26, borderRadius: 4, overflow: 'hidden',
    transform: [{ skewX: '-8deg' }],
  },
  panelFaceGhost: {
    borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.22)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  panelLine: { position: 'absolute', top: '30%', left: 0, right: 0, height: 1, backgroundColor: 'rgba(255,255,255,0.25)' },
  panelLeg: { width: 3, height: 10, backgroundColor: 'rgba(255,255,255,0.35)' },
  ground: {
    height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.14)',
    marginTop: 0, marginBottom: 12, marginHorizontal: 8,
  },
  levelRow: { gap: 6 },
  levelLabel: { fontSize: 11, fontFamily: 'Inter_500Medium', color: 'rgba(255,255,255,0.65)' },
  levelTrack: { height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.12)', overflow: 'hidden' },
  levelFill: { height: '100%', borderRadius: 3, backgroundColor: '#FFC94D' },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  statCell: { flex: 1, alignItems: 'center', gap: 4 },
  statDivider: { width: 1, height: 32 },
  statValue: { fontSize: 20, fontFamily: 'Inter_700Bold' },
  statLabel: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardIcon: { fontSize: 16 },
  cardTitle: { fontSize: 15, fontFamily: 'Inter_600SemiBold', flex: 1 },
  ecoBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  ecoBadgeText: { fontSize: 13, fontFamily: 'Inter_700Bold', color: '#7FDCA4' },
  hint: { fontSize: 12, fontFamily: 'Inter_400Regular', lineHeight: 18 },
  soldBanner: { padding: 10, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  soldBannerText: { fontSize: 13, fontFamily: 'Inter_700Bold', color: '#7FDCA4' },
  sellBtnWrap: { borderRadius: 14, overflow: 'hidden' },
  sellBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, padding: 15, borderRadius: 14,
  },
  sellBtnText: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  builtCount: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  townRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 },
  townCell: { width: '23%', alignItems: 'center', gap: 2 },
  townEmoji: { fontSize: 26, color: 'rgba(255,255,255,0.3)' },
  townGhost: { opacity: 0.35 },
  townName: { fontSize: 10, fontFamily: 'Inter_500Medium', color: 'rgba(255,255,255,0.75)' },
  buildBtn: { padding: 14, borderRadius: 14, alignItems: 'center', gap: 2 },
  buildBtnText: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  buildNeed: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  shopCard: { flexDirection: 'row', alignItems: 'center', gap: 12, opacity: 0.85 },
});
