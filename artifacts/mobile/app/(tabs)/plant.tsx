import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, ImageBackground,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withSequence,
  withTiming, withSpring, withDelay, FadeInUp, FadeOut, Easing,
} from 'react-native-reanimated';
import { useCosmicColors as useColors } from '@/constants/cosmicTheme';
import { CosmicBackground } from '@/components/CosmicBackground';
import { useApp } from '@/contexts/AppContext';
import { Mascot } from '@/components/Mascot';
import { getMascotStage } from '@/utils/mascotUtils';
import { FOOD_ITEMS } from '@/data/foodItems';

const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;
const SCENE_BG = require('@/assets/images/plant/plant-scene.png');

/* ── 元気 → 日差しの段階 ── */
function sunshineTier(genki: number): { label: string; emoji: string } {
  if (genki >= 85) return { label: 'まぶしいくらい!', emoji: '🌞' };
  if (genki >= 60) return { label: 'つよい日差し', emoji: '☀️' };
  if (genki >= 30) return { label: 'ふつうの日差し', emoji: '🌤️' };
  return { label: 'よわい日差し', emoji: '⛅' };
}

/* ════════════ シーン内オーバーレイ ════════════ */

/** 太陽(元気が強いほど大きく明るく輝く) */
function SceneSun({ genki }: { genki: number }) {
  const glow = useSharedValue(0.5);
  useEffect(() => {
    glow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1700, easing: easeInOutSine }),
        withTiming(0.5, { duration: 1700, easing: easeInOutSine }),
      ), -1, false,
    );
  }, []);
  const strength = 0.35 + (genki / 100) * 0.65; // 0.35-1.0
  const glowStyle = useAnimatedStyle(() => ({
    opacity: strength * (0.45 + glow.value * 0.4),
    transform: [{ scale: (0.8 + strength * 0.5) * (1 + glow.value * 0.12) }],
  }));
  const bodyStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 0.85 + strength * 0.35 }],
    opacity: 0.75 + strength * 0.25,
  }));
  return (
    <View style={s.sunWrap} pointerEvents="none">
      <Animated.View style={[s.sunGlow, glowStyle]} />
      <Animated.View style={bodyStyle}>
        <LinearGradient
          colors={['#FFF6CE', '#FFD86B', '#FFA43B']}
          style={s.sunBody}
          start={{ x: 0.25, y: 0.1 }} end={{ x: 0.75, y: 0.95 }}
        />
      </Animated.View>
    </View>
  );
}

/** 太陽からの光線(元気が強いほどはっきり見える) */
function SunRays({ genki }: { genki: number }) {
  const o = useSharedValue(0.4);
  useEffect(() => {
    o.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2200, easing: easeInOutSine }),
        withTiming(0.4, { duration: 2200, easing: easeInOutSine }),
      ), -1, false,
    );
  }, []);
  const base = Math.max(0, (genki - 20) / 100) * 0.5; // 元気20以下ではほぼ見えない
  const st1 = useAnimatedStyle(() => ({ opacity: base * o.value }));
  if (genki < 20) return null;
  return (
    <Animated.View style={[s.raysWrap, st1]} pointerEvents="none">
      {[38, 52, 68].map((deg, i) => (
        <LinearGradient
          key={i}
          colors={['rgba(255,224,130,0.85)', 'rgba(255,224,130,0)']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={[s.ray, { transform: [{ rotate: `${deg}deg` }], top: i * 6 }]}
        />
      ))}
    </Animated.View>
  );
}

/** キャラクター → 太陽へのぼっていく光の粒 */
function LightMotes({ genki }: { genki: number }) {
  // 元気が高いほど粒が増える(2〜6個)
  const count = 2 + Math.round((genki / 100) * 4);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {Array.from({ length: count }).map((_, i) => (
        <Mote key={i} index={i} />
      ))}
    </View>
  );
}

function Mote({ index }: { index: number }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withDelay(
      index * 620,
      withRepeat(withTiming(1, { duration: 3400, easing: Easing.out(Easing.quad) }), -1, false),
    );
  }, []);
  // キャラ位置(下・中央やや右) → 太陽(左上)へ弧を描く
  const st = useAnimatedStyle(() => {
    const t = p.value;
    return {
      opacity: t < 0.08 ? t / 0.08 : 1 - t * 0.85,
      transform: [
        { translateX: -(t * 130) + Math.sin(t * Math.PI * 2 + index) * 12 },
        { translateY: -(t * 300) },
        { scale: 0.7 + (1 - t) * 0.5 },
      ],
    };
  });
  return (
    <Animated.Text
      style={[
        { position: 'absolute', bottom: 118, left: `${52 + (index % 3) * 7}%`, fontSize: 12 + (index % 2) * 4 },
        st,
      ]}
    >
      ✦
    </Animated.Text>
  );
}

/** キャラの足元の光のオーラ(元気に応じて強くなる) */
function CharacterAura({ genki }: { genki: number }) {
  const o = useSharedValue(0.5);
  useEffect(() => {
    o.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1500, easing: easeInOutSine }),
        withTiming(0.5, { duration: 1500, easing: easeInOutSine }),
      ), -1, false,
    );
  }, []);
  const strength = 0.25 + (genki / 100) * 0.75;
  const st = useAnimatedStyle(() => ({
    opacity: strength * (0.35 + o.value * 0.4),
    transform: [{ scale: 0.9 + o.value * 0.15 * strength }],
  }));
  return <Animated.View style={[s.aura, st]} pointerEvents="none" />;
}

/* ════════════ 画面本体 ════════════ */

export default function PlantScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { lightEnergy, powerPlant, sellEnergy, exchangeEcoPoints, progress } = useApp();

  const [selling, setSelling] = useState(false);
  const [exchanging, setExchanging] = useState(false);
  const [soldMsg, setSoldMsg] = useState<string | null>(null);
  const [exchangedMsg, setExchangedMsg] = useState<string | null>(null);
  const [sunBurstSeq, setSunBurstSeq] = useState(0);

  const soldTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const exTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (soldTimerRef.current) clearTimeout(soldTimerRef.current);
    if (exTimerRef.current) clearTimeout(exTimerRef.current);
  }, []);

  const genki = lightEnergy.genki;
  const sellable = Math.floor(lightEnergy.storedEnergy);
  const tier = sunshineTier(genki);
  const mascotStage = getMascotStage(progress.level);
  // 元気が低いほど世界が暗い(メンタルケアなので真っ暗にはしない)
  const darkness = 0.38 * (1 - genki / 100);

  const mascotMsg =
    genki >= 85 ? 'ボクの光、太陽まで\nとどいてるよ🌞'
      : genki >= 60 ? '今日もいっぱい\n光をつくれたよ✨'
        : genki >= 30 ? 'すこしずつ光を\nあつめてるよ🌱'
          : 'キミが元気になると\nボクも光れるんだ…🌙';

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
        setSunBurstSeq((n) => n + 1);
        setSoldMsg(`⚡${sold} 売電! 🌱ごほうびポイント +${gained}`);
        if (soldTimerRef.current) clearTimeout(soldTimerRef.current);
        soldTimerRef.current = setTimeout(() => setSoldMsg(null), 3000);
      }
    } finally {
      setSelling(false);
    }
  };

  const handleExchange = async () => {
    if (exchanging || powerPlant.ecoPoints <= 0) return;
    setExchanging(true);
    try {
      const { exchanged } = await exchangeEcoPoints(powerPlant.ecoPoints);
      if (exchanged > 0) {
        setExchangedMsg(`🌱${exchanged} → 🍚 ごはんポイント +${exchanged}! ホームでごはんをあげよう`);
        if (exTimerRef.current) clearTimeout(exTimerRef.current);
        exTimerRef.current = setTimeout(() => setExchangedMsg(null), 3600);
      }
    } finally {
      setExchanging(false);
    }
  };

  return (
    <View style={[s.flex, { backgroundColor: colors.background }]}>
      <CosmicBackground />
      <ScrollView
        contentContainerStyle={[
          s.content,
          { paddingTop: topPad + 14, paddingBottom: Platform.OS === 'web' ? 34 + 90 : insets.bottom + 90 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── ヘッダー ── */}
        <View>
          <Text style={[s.title, { color: colors.foreground }]}>☀️ ひかり発電所</Text>
          <Text style={[s.subtitle, { color: colors.mutedForeground }]}>
            あなたの元気が、キャラクターの光になり、太陽を照らしています
          </Text>
        </View>

        {/* ── ステータス(スクロールなしで見える) ── */}
        <View style={[s.card, s.statsCard, { borderColor: colors.border }]}>
          <LinearGradient
            colors={['rgba(52,32,102,0.92)', 'rgba(30,19,64,0.95)']}
            style={StyleSheet.absoluteFill}
          />
          <View style={s.statsRow}>
            <View style={s.statCell}>
              <Text style={s.statHead}>☀️ 今日の光</Text>
              <Text style={[s.statValue, { color: '#FFD86B' }]}>+{lightEnergy.todayEnergy}</Text>
              <Text style={s.statUnit}>Energy</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.statCell}>
              <Text style={s.statHead}>⚡ 蓄電量</Text>
              <Text style={[s.statValue, { color: '#8AF0B8' }]}>{sellable}</Text>
              <Text style={s.statUnit}>Energy</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.statCell}>
              <Text style={s.statHead}>💰 売電できる</Text>
              <Text style={[s.statValue, { color: '#C9B2FF' }]}>{sellable}</Text>
              {sellable > 0 ? (
                <View style={s.sellReadyChip}>
                  <Text style={s.sellReadyChipText}>売電できるよ!</Text>
                </View>
              ) : (
                <Text style={s.statUnit}>Energy</Text>
              )}
            </View>
          </View>
        </View>

        {/* ── 発電所の世界 ── */}
        <View style={[s.card, s.sceneCard, { borderColor: colors.border }]}>
          <ImageBackground source={SCENE_BG} style={StyleSheet.absoluteFill as any} resizeMode="cover">
            {/* 元気が低いほど世界が暗くなる */}
            <View style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(10,6,32,${darkness})` }]} />
            {/* 売電の瞬間、世界がぱっと明るくなる */}
            <SunBurst seq={sunBurstSeq} />
          </ImageBackground>

          <SceneSun genki={genki} />
          <SunRays genki={genki} />
          <LightMotes genki={genki} />

          {/* キャラクター(発電所の住人) */}
          <View style={s.mascotWrap} pointerEvents="none">
            <View style={s.mascotBubble}>
              <Text style={s.mascotBubbleText}>{mascotMsg}</Text>
            </View>
            <View style={s.mascotStand}>
              <CharacterAura genki={genki} />
              <Mascot stage={mascotStage} mood={genki >= 60 ? 'excited' : 'happy'} size={86} idleBehavior="normal" />
            </View>
          </View>

          {/* 日差しの状態 */}
          <View style={s.sunshineChip}>
            <Text style={s.sunshineChipText}>
              {tier.emoji} 元気 {genki}% ・ {tier.label}
            </Text>
          </View>
        </View>

        {/* ── 光の循環 ── */}
        <View style={[s.card, s.loopCard, { borderColor: colors.border }]}>
          <Text style={s.loopText}>💗 あなたが元気になる → 😊 キャラが元気になる → ✨ 光が生まれる</Text>
          <Text style={s.loopText}>→ ☀️ 太陽が明るくなる → ⚡ エネルギーが貯まる → 🍚 ごほうびに!</Text>
        </View>

        {/* ── 売電 ── */}
        <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={s.cardHeader}>
            <Text style={s.cardIcon}>💰</Text>
            <Text style={[s.cardTitle, { color: colors.foreground }]}>売電する</Text>
            <View style={s.ecoBadge}>
              <Text style={s.ecoBadgeText}>🌱 {powerPlant.ecoPoints}</Text>
            </View>
          </View>
          <Text style={[s.hint, { color: colors.mutedForeground }]}>
            貯まった光エネルギーを売って、ごほうびポイントに変えられるよ
          </Text>
          {soldMsg && (
            <Animated.View
              entering={FadeInUp.springify().damping(10)}
              exiting={FadeOut}
              style={[s.banner, { backgroundColor: '#7FDCA426', borderColor: '#7FDCA466' }]}
            >
              <Text style={[s.bannerText, { color: '#7FDCA4' }]}>{soldMsg}</Text>
            </Animated.View>
          )}
          <Animated.View style={sellStyle}>
            <TouchableOpacity
              onPress={handleSell}
              disabled={selling || sellable <= 0}
              activeOpacity={0.9}
              accessibilityRole="button"
              accessibilityLabel={sellable > 0 ? `${sellable} エネルギーを売電する` : 'まだ売電できません。蓄電中です'}
              accessibilityState={{ disabled: selling || sellable <= 0 }}
              style={s.sellBtnWrap}
            >
              <LinearGradient
                colors={sellable > 0 ? ['#FFC94D', '#FF9D2E'] : ['#3A3357', '#3A3357']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={s.sellBtn}
              >
                <Text style={[s.sellBtnText, { color: sellable > 0 ? '#3A2400' : 'rgba(255,255,255,0.4)' }]}>
                  {sellable > 0 ? `⚡${sellable} を売電する` : '蓄電がたまったら売電できるよ'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* ── キャラクターへのご褒美 ── */}
        <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={s.cardHeader}>
            <Text style={s.cardIcon}>🍚</Text>
            <Text style={[s.cardTitle, { color: colors.foreground }]}>キャラクターへのご褒美</Text>
          </View>
          <Text style={[s.hint, { color: colors.mutedForeground }]}>
            ごほうびポイントをごはんポイントにかえて、キャラにごはんをあげよう
          </Text>
          {/* ごはんのプレビュー */}
          <View style={s.foodRow}>
            {FOOD_ITEMS.slice(0, 4).map((f) => (
              <View key={f.id} style={s.foodCell}>
                <Text style={s.foodEmoji}>{f.emoji}</Text>
                <Text style={s.foodName}>{f.name}</Text>
                <Text style={s.foodCost}>🍚{f.cost}</Text>
              </View>
            ))}
          </View>
          {exchangedMsg && (
            <Animated.View
              entering={FadeInUp.springify().damping(10)}
              exiting={FadeOut}
              style={[s.banner, { backgroundColor: '#FFC94D22', borderColor: '#FFC94D55' }]}
            >
              <Text style={[s.bannerText, { color: '#FFD86B' }]}>{exchangedMsg}</Text>
            </Animated.View>
          )}
          <TouchableOpacity
            onPress={handleExchange}
            disabled={exchanging || powerPlant.ecoPoints <= 0}
            activeOpacity={0.9}
            accessibilityRole="button"
            accessibilityLabel={
              powerPlant.ecoPoints > 0
                ? `ごほうびポイント${powerPlant.ecoPoints}をごはんポイントにかえる`
                : 'ごほうびポイントがまだありません'
            }
            accessibilityState={{ disabled: exchanging || powerPlant.ecoPoints <= 0 }}
            style={[s.exchangeBtn, { backgroundColor: powerPlant.ecoPoints > 0 ? '#7FDCA4' : colors.muted }]}
          >
            <Text style={[s.exchangeBtnText, { color: powerPlant.ecoPoints > 0 ? '#0D3321' : colors.mutedForeground }]}>
              {powerPlant.ecoPoints > 0
                ? `🌱${powerPlant.ecoPoints} を 🍚ごはんポイントにかえる`
                : '売電するとごほうびポイントがもらえるよ'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)')}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="ホームへ移動してごはんをあげる"
            style={s.feedLinkBtn}
          >
            <Text style={s.feedLinkText}>🏠 ホームでごはんをあげにいく →</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

/** 売電時に世界がぱっと明るくなるフラッシュ */
function SunBurst({ seq }: { seq: number }) {
  const o = useSharedValue(0);
  useEffect(() => {
    if (seq === 0) return;
    o.value = withSequence(
      withTiming(0.5, { duration: 300, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: 1500, easing: easeInOutSine }),
    );
  }, [seq]);
  const st = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#FFE9A0' }, st]} pointerEvents="none" />;
}

/* ════════════ styles ════════════ */

const s = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 13 },
  title: { fontSize: 24, fontFamily: 'Inter_700Bold', letterSpacing: -0.5 },
  subtitle: { fontSize: 11.5, fontFamily: 'Inter_400Regular', marginTop: 4, lineHeight: 17 },

  card: { borderRadius: 22, padding: 18, borderWidth: 1, gap: 12, overflow: 'hidden' },

  /* stats */
  statsCard: { padding: 14 },
  statsRow: { flexDirection: 'row', alignItems: 'stretch' },
  statCell: { flex: 1, alignItems: 'center', gap: 3 },
  statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 4 },
  statHead: { fontSize: 10, fontFamily: 'Inter_600SemiBold', color: 'rgba(255,255,255,0.6)' },
  statValue: { fontSize: 22, fontFamily: 'Inter_700Bold', letterSpacing: -0.5 },
  statUnit: { fontSize: 9, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.4)' },
  sellReadyChip: {
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8,
    backgroundColor: 'rgba(201,178,255,0.18)',
  },
  sellReadyChipText: { fontSize: 9, fontFamily: 'Inter_700Bold', color: '#C9B2FF' },

  /* scene */
  sceneCard: { height: 430, padding: 0, gap: 0 },
  sunWrap: {
    position: 'absolute', left: '7%', top: 40,
    width: 96, height: 96, alignItems: 'center', justifyContent: 'center',
  },
  sunGlow: { position: 'absolute', width: 96, height: 96, borderRadius: 48, backgroundColor: '#FFD86B' },
  sunBody: { width: 46, height: 46, borderRadius: 23 },
  raysWrap: { position: 'absolute', left: '14%', top: 92, width: 180, height: 120 },
  ray: { position: 'absolute', left: 0, width: 150, height: 7, borderRadius: 4 },

  mascotWrap: { position: 'absolute', bottom: 14, alignSelf: 'center', alignItems: 'center', gap: 4 },
  mascotStand: { alignItems: 'center', justifyContent: 'flex-end' },
  aura: {
    position: 'absolute', bottom: -6, width: 110, height: 46, borderRadius: 55,
    backgroundColor: '#FFE9A0',
  },
  mascotBubble: {
    backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 14,
    paddingHorizontal: 11, paddingVertical: 7, maxWidth: 170,
  },
  mascotBubbleText: { fontSize: 10.5, fontFamily: 'Inter_600SemiBold', color: '#3A2A6A', lineHeight: 15, textAlign: 'center' },

  sunshineChip: {
    position: 'absolute', top: 12, right: 12,
    backgroundColor: 'rgba(20,12,44,0.78)', borderRadius: 12,
    paddingHorizontal: 11, paddingVertical: 7,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)',
  },
  sunshineChipText: { fontSize: 11, fontFamily: 'Inter_700Bold', color: 'rgba(255,255,255,0.92)' },

  /* loop */
  loopCard: { backgroundColor: 'rgba(35,22,70,0.75)', gap: 4, padding: 14 },
  loopText: { fontSize: 10.5, fontFamily: 'Inter_600SemiBold', color: 'rgba(255,255,255,0.72)', lineHeight: 16, textAlign: 'center' },

  /* cards */
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardIcon: { fontSize: 16 },
  cardTitle: { fontSize: 15, fontFamily: 'Inter_600SemiBold', flex: 1 },
  ecoBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, backgroundColor: '#7FDCA422' },
  ecoBadgeText: { fontSize: 13, fontFamily: 'Inter_700Bold', color: '#7FDCA4' },
  hint: { fontSize: 12, fontFamily: 'Inter_400Regular', lineHeight: 18 },
  banner: { padding: 11, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  bannerText: { fontSize: 12.5, fontFamily: 'Inter_700Bold', textAlign: 'center' },

  sellBtnWrap: { borderRadius: 14, overflow: 'hidden' },
  sellBtn: { alignItems: 'center', justifyContent: 'center', minHeight: 48, paddingVertical: 12, paddingHorizontal: 10, borderRadius: 14 },
  sellBtnText: { fontSize: 14.5, fontFamily: 'Inter_700Bold' },

  foodRow: { flexDirection: 'row', justifyContent: 'space-between' },
  foodCell: {
    width: '23%', alignItems: 'center', gap: 2, paddingVertical: 9,
    borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.06)',
  },
  foodEmoji: { fontSize: 22 },
  foodName: { fontSize: 10, fontFamily: 'Inter_500Medium', color: 'rgba(255,255,255,0.8)' },
  foodCost: { fontSize: 9.5, fontFamily: 'Inter_700Bold', color: '#FFD86B' },

  exchangeBtn: { minHeight: 48, padding: 13, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  exchangeBtnText: { fontSize: 13.5, fontFamily: 'Inter_700Bold', textAlign: 'center' },
  feedLinkBtn: { minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingVertical: 10 },
  feedLinkText: { fontSize: 12.5, fontFamily: 'Inter_600SemiBold', color: '#C9B2FF' },
});
