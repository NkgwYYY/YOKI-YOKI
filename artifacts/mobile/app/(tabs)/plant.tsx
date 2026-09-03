import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, ImageBackground } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withSequence,
  withTiming, withSpring, withDelay, FadeInUp, FadeOut, Easing,
} from 'react-native-reanimated';
import { border, colors, control, radius, screenPadding, space, typography } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { Icon, iconSize, type IconName } from '@/components/ui/Icon';
import { PressScale } from '@/components/ui/PressScale';
import { CosmicBackground } from '@/components/CosmicBackground';
import { useApp } from '@/contexts/AppContext';
import { Mascot } from '@/components/Mascot';
import { getMascotStage } from '@/utils/mascotUtils';
import { FOOD_ITEMS } from '@/data/foodItems';

// Reanimated の UI スレッドで安全に動く easing(worklet 対応の組み込みを使用)
const easeInOutSine = Easing.inOut(Easing.sin);
const SCENE_BG = require('@/assets/images/plant/plant-scene-v2.png');

/* ── 元気 → 日差しの段階 ── */
function sunshineTier(genki: number): { label: string; icon: IconName } {
  if (genki >= 85) return { label: 'まぶしいくらい!', icon: 'sun' };
  if (genki >= 60) return { label: 'つよい日差し', icon: 'sunrise' };
  if (genki >= 30) return { label: 'ふつうの日差し', icon: 'cloud' };
  return { label: 'よわい日差し', icon: 'cloud-rain' };
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
    transform: [{ scale: 0.85 + strength * 0.35 }, { rotate: '22.5deg' }],
    opacity: 0.8 + strength * 0.2,
  }));
  const raySpin = useSharedValue(0);
  useEffect(() => {
    raySpin.value = withRepeat(withTiming(1, { duration: 24000, easing: Easing.linear }), -1, false);
  }, []);
  const rayStyle = useAnimatedStyle(() => ({
    opacity: 0.8 + strength * 0.2,
    transform: [{ scale: 0.85 + strength * 0.35 }, { rotate: `${raySpin.value * 360}deg` }],
  }));
  return (
    <View style={s.sunWrap} pointerEvents="none">
      <Animated.View style={[s.sunGlow, glowStyle]} />
      {/* ギザギザの光線(ゆっくり回転)— ひと目で太陽と分かるシルエット */}
      <Animated.View style={[s.sunRaysRing, rayStyle]}>
        {Array.from({ length: 8 }).map((_, i) => (
          <View
            key={i}
            style={[
              s.sunRaySpike,
              { transform: [{ rotate: `${i * 45}deg` }, { translateY: -37 }] },
            ]}
          />
        ))}
      </Animated.View>
      <Animated.View style={[s.sunRaysRing, bodyStyle]}>
        {Array.from({ length: 8 }).map((_, i) => (
          <View
            key={i}
            style={[
              s.sunRaySpikeSmall,
              { transform: [{ rotate: `${i * 45}deg` }, { translateY: -34 }] },
            ]}
          />
        ))}
      </Animated.View>
      {/* 本体。ここはイラスト内の光源なのでグラデーションを許容している。
          UI の面（カード・ボタン・チップ）には決して持ち込まないこと。 */}
      <Animated.View style={bodyStyle}>
        <LinearGradient
          colors={['#FFFBE0', '#FFE066', '#FFAE2E']}
          style={s.sunBody}
          start={{ x: 0.3, y: 0.15 }} end={{ x: 0.7, y: 0.95 }}
        />
        <View style={s.sunHighlight} />
      </Animated.View>
    </View>
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
  const dot = 5 + (index % 2) * 3;
  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          bottom: 118,
          left: `${52 + (index % 3) * 7}%`,
          width: dot,
          height: dot,
          borderRadius: dot / 2,
          backgroundColor: '#FFE9A0',
        },
        st,
      ]}
    />
  );
}

/** パネル → 蓄電タンクへ流れるエネルギーの粒 */
function EnergyFlow({ genki }: { genki: number }) {
  const count = 2 + Math.round((genki / 100) * 3);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {Array.from({ length: count }).map((_, i) => (
        <EnergyDot key={i} index={i} />
      ))}
    </View>
  );
}

function EnergyDot({ index }: { index: number }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withDelay(
      index * 540,
      withRepeat(withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.quad) }), -1, false),
    );
  }, []);
  // パネル(中央左)→ 蓄電タンク(右)へ流れる
  const st = useAnimatedStyle(() => {
    const t = p.value;
    return {
      opacity: t < 0.1 ? t / 0.1 : 1 - t * 0.7,
      transform: [
        { translateX: t * 150 },
        { translateY: t * 26 + Math.sin(t * Math.PI * 3 + index) * 5 },
      ],
    };
  });
  return (
    <Animated.View
      style={[{ position: 'absolute', top: `${44 + (index % 3) * 5}%`, left: '28%' }, st]}
    >
      <Icon name="zap" size={iconSize.xs + (index % 2) * 2} color="#FFE082" />
    </Animated.View>
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
    genki >= 85 ? 'ボクの光、太陽まで\nとどいてるよ'
      : genki >= 60 ? '今日もいっぱい\n光をつくれたよ'
        : genki >= 30 ? 'すこしずつ光を\nあつめてるよ'
          : 'キミが元気になると\nボクも光れるんだ…';

  const topPad = Platform.OS === 'web' ? space.xl : insets.top;

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
        setSoldMsg(`${sold} エネルギーを売電。ごほうびポイント +${gained}`);
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
        setExchangedMsg(`ごほうび ${exchanged} をごはんポイント +${exchanged} にかえたよ`);
        if (exTimerRef.current) clearTimeout(exTimerRef.current);
        exTimerRef.current = setTimeout(() => setExchangedMsg(null), 3600);
      }
    } finally {
      setExchanging(false);
    }
  };

  return (
    <View style={s.flex}>
      <CosmicBackground />
      <ScrollView
        contentContainerStyle={[
          s.content,
          {
            paddingTop: topPad + space.lg,
            paddingBottom:
              (Platform.OS === 'web' ? space.xxl : insets.bottom) + control.height + space.xl,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── ヘッダー ── */}
        <View>
          <Text style={s.title}>ひかり発電所</Text>
          <Text style={s.subtitle}>
            あなたの元気が、キャラクターの光になり、太陽を照らしています
          </Text>
        </View>

        {/* ── ステータス(スクロールなしで見える) ── */}
        <View style={[s.card, s.statsCard]}>
          <View style={s.statsRow}>
            <View style={s.statCell}>
              <Text style={s.statHead}>今日の光</Text>
              <Text style={s.statValue}>+{lightEnergy.todayEnergy}</Text>
              <Text style={s.statUnit}>Energy</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.statCell}>
              <Text style={s.statHead}>蓄電量</Text>
              <Text style={s.statValue}>{sellable}</Text>
              <Text style={s.statUnit}>Energy</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.statCell}>
              <Text style={s.statHead}>売電できる</Text>
              <Text style={s.statValue}>{sellable}</Text>
              {sellable > 0 ? (
                <View style={s.sellReadyChip}>
                  <Text style={s.sellReadyChipText}>売電できるよ</Text>
                </View>
              ) : (
                <Text style={s.statUnit}>Energy</Text>
              )}
            </View>
          </View>
        </View>

        {/* ── 発電所の世界 ── */}
        <View style={[s.card, s.sceneCard]}>
          {/* カードは画像と同じ縦横比なので stretch で必ず全体が表示される(coverのクロップ事故を防ぐ) */}
          <ImageBackground
            source={SCENE_BG}
            style={StyleSheet.absoluteFill as any}
            imageStyle={{ width: '100%', height: '100%' }}
            resizeMode="stretch"
          >
            {/* 元気が低いほど世界が暗くなる */}
            <View style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(30,21,51,${darkness})` }]} />
            {/* 売電の瞬間、世界がぱっと明るくなる */}
            <SunBurst seq={sunBurstSeq} />
          </ImageBackground>

          <SceneSun genki={genki} />
          <EnergyFlow genki={genki} />
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
            <Icon name={tier.icon} size={iconSize.xs} color={colors.foreground} />
            <Text style={s.sunshineChipText}>
              元気 {genki}% ・ {tier.label}
            </Text>
          </View>
        </View>

        {/* ── 売電 ── */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <Text style={s.cardTitle}>売電する</Text>
            <View style={s.ecoBadge}>
              <Icon name="gift" size={iconSize.xs} color={colors.success} />
              <Text style={s.ecoBadgeText}>{powerPlant.ecoPoints}</Text>
            </View>
          </View>
          <Text style={s.hint}>貯まった光エネルギーを売って、ごほうびポイントに変えられるよ</Text>
          {soldMsg && (
            <Animated.View
              entering={FadeInUp.springify().damping(10)}
              exiting={FadeOut}
              style={s.banner}
            >
              <Text style={s.bannerText}>{soldMsg}</Text>
            </Animated.View>
          )}
          <Animated.View style={sellStyle}>
            <Button
              label={sellable > 0 ? `${sellable} エネルギーを売電する` : '蓄電がたまったら売電できるよ'}
              icon="zap"
              onPress={handleSell}
              disabled={selling || sellable <= 0}
              loading={selling}
              fullWidth
            />
          </Animated.View>
        </View>

        {/* ── キャラクターへのご褒美 ── */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <Text style={s.cardTitle}>キャラクターへのご褒美</Text>
          </View>
          <Text style={s.hint}>
            ごほうびポイントをごはんポイントにかえて、キャラにごはんをあげよう
          </Text>
          {/* ごはんのプレビュー */}
          <View style={s.foodRow}>
            {FOOD_ITEMS.slice(0, 4).map((f) => (
              <View key={f.id} style={s.foodCell}>
                <Icon name={f.icon} size={iconSize.md} color={colors.primaryOnSoft} />
                <Text style={s.foodName}>{f.name}</Text>
                <View style={s.foodCostRow}>
                  <Icon name="coffee" size={iconSize.xs} color={colors.mutedForeground} />
                  <Text style={s.foodCost}>{f.cost}</Text>
                </View>
              </View>
            ))}
          </View>
          {exchangedMsg && (
            <Animated.View
              entering={FadeInUp.springify().damping(10)}
              exiting={FadeOut}
              style={s.banner}
            >
              <Text style={s.bannerText}>{exchangedMsg}</Text>
            </Animated.View>
          )}
          <Button
            label={
              powerPlant.ecoPoints > 0
                ? `ごほうび ${powerPlant.ecoPoints} をごはんポイントにかえる`
                : '売電するとごほうびポイントがもらえるよ'
            }
            icon="refresh-cw"
            variant="secondary"
            onPress={handleExchange}
            disabled={exchanging || powerPlant.ecoPoints <= 0}
            loading={exchanging}
            fullWidth
          />
          <PressScale
            onPress={() => router.push('/(tabs)')}
            accessibilityLabel="ホームへ移動してごはんをあげる"
            style={s.feedLinkBtn}
          >
            <Text style={s.feedLinkText}>ホームでごはんをあげにいく</Text>
            <Icon name="arrow-right" size={iconSize.sm} color={colors.primaryOnSoft} />
          </PressScale>
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
  return <Animated.View style={[StyleSheet.absoluteFill, s.sunBurst, st]} pointerEvents="none" />;
}

/* ════════════ styles ════════════ */

const s = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: screenPadding, gap: space.lg },
  title: { ...typography.display, color: colors.foreground },
  subtitle: { ...typography.caption, color: colors.mutedForeground, marginTop: space.xs },

  card: {
    backgroundColor: colors.card,
    ...border.hairline,
    borderRadius: radius.lg,
    padding: space.lg,
    gap: space.md,
    overflow: 'hidden',
  },

  /* ステータス */
  statsCard: { paddingVertical: space.lg },
  statsRow: { flexDirection: 'row', alignItems: 'stretch' },
  statCell: { flex: 1, alignItems: 'center', gap: space.xs },
  statDivider: { width: border.width, backgroundColor: colors.border },
  statHead: { ...typography.micro, color: colors.mutedForeground },
  statValue: { ...typography.title, color: colors.foreground },
  statUnit: { ...typography.micro, color: colors.subtleForeground },
  sellReadyChip: {
    paddingHorizontal: space.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  sellReadyChipText: { ...typography.micro, color: colors.primaryOnSoft },

  /* ── シーン ──
     ここから下はイラストの一部。アプリの面ではなく絵の上に載るので、
     デザイントークンではなく絵に合わせた色を使う。 */
  // 画像(800x1024)と同じ縦横比にして、パネル群が必ず全部見えるようにする
  sceneCard: { width: '100%', aspectRatio: 800 / 1024, padding: 0, gap: 0 },
  sunBurst: { backgroundColor: '#FFF3D0' },
  sunWrap: {
    position: 'absolute',
    left: '7%',
    top: space.xxl,
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sunGlow: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: radius.pill,
    backgroundColor: '#FFD86B',
  },
  sunRaysRing: {
    position: 'absolute',
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sunRaySpike: {
    position: 'absolute',
    width: 7,
    height: 18,
    borderRadius: 4,
    backgroundColor: '#FFD24D',
  },
  sunRaySpikeSmall: {
    position: 'absolute',
    width: 5,
    height: 12,
    borderRadius: 3,
    backgroundColor: '#FFE58A',
  },
  sunBody: { width: 50, height: 50, borderRadius: 25 },
  sunHighlight: {
    position: 'absolute',
    top: space.sm,
    left: space.md,
    width: 16,
    height: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.75)',
    transform: [{ rotate: '-20deg' }],
  },
  mascotWrap: {
    position: 'absolute',
    bottom: space.lg,
    alignSelf: 'center',
    alignItems: 'center',
    gap: space.xs,
  },
  mascotStand: { alignItems: 'center', justifyContent: 'flex-end' },
  aura: {
    position: 'absolute',
    bottom: -6,
    width: 110,
    height: 46,
    borderRadius: radius.pill,
    backgroundColor: '#FFE9A0',
  },
  // 絵の上の吹き出し／チップは、白い面 + 濃い文字で可読性を確保する。
  mascotBubble: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    maxWidth: 176,
  },
  mascotBubbleText: {
    ...typography.micro,
    color: colors.foreground,
    lineHeight: 16,
    textAlign: 'center',
  },
  sunshineChip: {
    position: 'absolute',
    top: space.md,
    right: space.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    backgroundColor: colors.card,
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    ...border.hairline,
  },
  sunshineChipText: { ...typography.micro, color: colors.foreground },

  /* カード内 */
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  cardTitle: { ...typography.subhead, color: colors.foreground, flex: 1 },
  ecoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.successSoft,
  },
  ecoBadgeText: { ...typography.label, color: colors.success },
  hint: { ...typography.caption, color: colors.mutedForeground },
  banner: {
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    ...border.hairline,
    alignItems: 'center',
  },
  bannerText: { ...typography.calloutStrong, color: colors.primaryOnSoft, textAlign: 'center' },

  /* ごはんプレビュー */
  foodRow: { flexDirection: 'row', gap: space.sm },
  foodCell: {
    flex: 1,
    alignItems: 'center',
    gap: space.xs,
    paddingVertical: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.muted,
  },
  foodName: { ...typography.micro, color: colors.mutedForeground },
  foodCostRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  foodCost: { ...typography.micro, color: colors.foreground },

  feedLinkBtn: {
    minHeight: control.minTouch,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
  },
  feedLinkText: { ...typography.calloutStrong, color: colors.primaryOnSoft },
});
