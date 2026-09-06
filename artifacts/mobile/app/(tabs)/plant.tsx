import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, ImageBackground } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  type SharedValue,
  useSharedValue, useAnimatedStyle, withRepeat, withSequence,
  withTiming, withSpring, withDelay, FadeInUp, FadeOut, Easing,
} from 'react-native-reanimated';
import Svg, { Path, Defs, G, LinearGradient as SvgLinearGradient, Stop, Circle, Rect } from 'react-native-svg';
import { border, colors, control, radius, screenPadding, space, typography, elevation } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { Icon, iconSize } from '@/components/ui/Icon';
import { PressScale } from '@/components/ui/PressScale';
import { CosmicBackground } from '@/components/CosmicBackground';
import { useApp } from '@/contexts/AppContext';
import { Mascot } from '@/components/Mascot';
import { getMascotStage } from '@/utils/mascotUtils';
import { getChargeGlowStrength } from '@/utils/lightEnergy';

const easeInOutSine = Easing.inOut(Easing.sin);
const SCENE_BG = require('@/assets/images/plant/energy-garden-night.png');
const ENERGY_NEON = '#39FF14';
const ENERGY_NEON_LIGHT = '#C8FF70';
const ENERGY_NEON_DEEP = '#00B84A';
const ENERGY_GLOW = 'rgba(57,255,20,0.34)';

function LightMotes({ chargeGlow, targetGlow }: { chargeGlow: SharedValue<number>; targetGlow: number }) {
  const count = 3 + Math.round(targetGlow * 5);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {Array.from({ length: count }).map((_, i) => <Mote key={i} index={i} chargeGlow={chargeGlow} />)}
    </View>
  );
}

function Mote({ index, chargeGlow }: { index: number; chargeGlow: SharedValue<number> }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withDelay(index * 620, withRepeat(withTiming(1, { duration: 3400 + (index * 200), easing: Easing.out(Easing.quad) }), -1, false));
  }, []);
  const st = useAnimatedStyle(() => {
    const t = p.value;
    return {
      opacity: (t < 0.08 ? t / 0.08 : 1 - t * 0.85) * (0.28 + chargeGlow.value * 0.62),
      shadowOpacity: 0.28 + chargeGlow.value * 0.62,
      shadowRadius: 3 + chargeGlow.value * 4,
      transform: [
        { translateX: -(t * 100) + Math.sin(t * Math.PI * 2 + index) * 20 },
        { translateY: -(t * 200) },
        { scale: 0.7 + (1 - t) * 0.5 },
      ],
    };
  });
  const dot = 5 + (index % 2) * 3;
  return (
    <Animated.View style={[{ position: 'absolute', bottom: '30%', left: `${20 + (index % 5) * 15}%`, width: dot, height: dot, borderRadius: dot / 2, backgroundColor: ENERGY_NEON_LIGHT, shadowColor: ENERGY_NEON }, st]} />
  );
}

function CharacterAura({ genki }: { genki: number }) {
  const o = useSharedValue(0.5);
  useEffect(() => {
    o.value = withRepeat(withSequence(withTiming(1, { duration: 1500, easing: easeInOutSine }), withTiming(0.5, { duration: 1500, easing: easeInOutSine })), -1, false);
  }, []);
  const strength = 0.25 + (genki / 100) * 0.75;
  const st = useAnimatedStyle(() => ({
    opacity: strength * (0.4 + o.value * 0.4),
    transform: [{ scale: 0.9 + o.value * 0.15 * strength }],
  }));
  return <Animated.View style={[s.aura, st]} pointerEvents="none" />;
}

function PowerCable({ chargeGlow }: { chargeGlow: SharedValue<number> }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
        <Defs>
          <SvgLinearGradient id="cableGrad" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#28643A" stopOpacity="0.95" />
            <Stop offset="1" stopColor="#173B28" stopOpacity="0.95" />
          </SvgLinearGradient>
        </Defs>
        {/* Shadow */}
        <Path d="M 38 78 C 48 92, 55 92, 65 78" stroke="rgba(0,0,0,0.4)" strokeWidth="4" fill="none" transform="translate(0, 2)" />
        {/* Base Cable */}
        <Path d="M 38 78 C 48 92, 55 92, 65 78" stroke="url(#cableGrad)" strokeWidth="2.5" fill="none" />

        {/* Character-side plug and glowing socket */}
        <G>
          <Circle cx="38" cy="78" r="3.4" fill="rgba(57,255,20,0.16)" />
          <Rect x="35.8" y="75.7" width="4.8" height="4.6" rx="1.5" fill="#315E3E" stroke="#9DFF80" strokeWidth="0.55" />
          <Rect x="39.8" y="76.65" width="2.1" height="2.7" rx="0.65" fill="#D7FFC9" />
          <Circle cx="37.5" cy="78" r="0.8" fill={ENERGY_NEON} />
        </G>
        {/* Tank-side inlet and locking collar */}
        <G>
          <Circle cx="65" cy="78" r="4.2" fill="rgba(57,255,20,0.16)" />
          <Rect x="62.2" y="75.35" width="5.8" height="5.3" rx="1.7" fill="#244D32" stroke="#8DFF70" strokeWidth="0.65" />
          <Rect x="60.8" y="76.25" width="2.5" height="3.5" rx="0.8" fill="#3F8153" />
          <Circle cx="65.2" cy="78" r="1.15" fill={ENERGY_NEON} />
        </G>
      </Svg>
      <CableLights chargeGlow={chargeGlow} />
    </View>
  );
}

function CableLights({ chargeGlow }: { chargeGlow: SharedValue<number> }) {
  // Simple dots moving along an approximation of the curve
  // M 38 78 C 48 92, 55 92, 65 78
  return (
    <>
      {Array.from({ length: 4 }).map((_, i) => <CableLight key={i} index={i} chargeGlow={chargeGlow} />)}
    </>
  );
}

function CableLight({ index, chargeGlow }: { index: number; chargeGlow: SharedValue<number> }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withDelay(index * 400, withRepeat(withTiming(1, { duration: 1600, easing: Easing.linear }), -1, false));
  }, []);

  const st = useAnimatedStyle(() => {
    const t = p.value;
    // Bezier curve approximation
    // P0 = 38, 78
    // P1 = 48, 92
    // P2 = 55, 92
    // P3 = 65, 78
    const mt = 1 - t;
    const mt2 = mt * mt;
    const mt3 = mt2 * mt;
    const t2 = t * t;
    const t3 = t2 * t;

    const x = mt3 * 38 + 3 * mt2 * t * 48 + 3 * mt * t2 * 55 + t3 * 65;
    const y = mt3 * 78 + 3 * mt2 * t * 92 + 3 * mt * t2 * 92 + t3 * 78;

    return {
      left: `${x}%`,
      top: `${y}%`,
      opacity: (t < 0.1 ? t / 0.1 : t > 0.9 ? (1 - t) / 0.1 : 1) * (0.3 + chargeGlow.value * 0.65),
      shadowOpacity: 0.3 + chargeGlow.value * 0.65,
      shadowRadius: 3 + chargeGlow.value * 4,
      transform: [{ translateX: -3 }, { translateY: -3 }],
    };
  });

  return (
    <Animated.View style={[{ position: 'absolute', width: 6, height: 6, borderRadius: 3, backgroundColor: ENERGY_NEON_LIGHT, shadowColor: ENERGY_NEON }, st]} />
  );
}

function CrystalTank({ energy, chargeGlow }: { energy: number; chargeGlow: SharedValue<number> }) {
  const float = useSharedValue(0);
  const liquid = useSharedValue(0);
  useEffect(() => {
    float.value = withRepeat(
      withSequence(
        withTiming(-2, { duration: 1900, easing: easeInOutSine }),
        withTiming(2, { duration: 1900, easing: easeInOutSine }),
      ), -1, true,
    );
    liquid.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2300, easing: easeInOutSine }),
        withTiming(0, { duration: 2300, easing: easeInOutSine }),
      ), -1, true,
    );
  }, []);

  const floatStyle = useAnimatedStyle(() => ({ transform: [{ translateY: float.value }] }));
  const liquidStyle = useAnimatedStyle(() => ({
    opacity: 0.46 + chargeGlow.value * 0.34 + liquid.value * 0.1,
    transform: [{ translateY: liquid.value * -2 }, { scaleX: 1 + liquid.value * 0.015 }],
  }));
  const glassGlowStyle = useAnimatedStyle(() => ({
    shadowOpacity: 0.18 + chargeGlow.value * 0.42,
    shadowRadius: 7 + chargeGlow.value * 8,
  }));
  const baseGlowStyle = useAnimatedStyle(() => ({
    shadowOpacity: 0.16 + chargeGlow.value * 0.36,
    shadowRadius: 6 + chargeGlow.value * 7,
  }));
  const fillLevel = Math.min(92, 6 + Math.min(energy, 100) * 0.86);

  return (
    <Animated.View style={[s.tankWrap, floatStyle]} pointerEvents="none">
      <View style={s.tankStatus}>
        <Text style={s.tankStatusLabel}>チャージ</Text>
        <Text style={s.tankValue}>{energy} ENERGY</Text>
      </View>
      <Animated.View style={[s.tankGlass, glassGlowStyle]}>
        <Animated.View style={[s.tankLiquid, liquidStyle, { height: `${fillLevel}%` }]}>
          <LinearGradient colors={['rgba(200,255,112,0.95)', ENERGY_NEON, ENERGY_NEON_DEEP]} style={StyleSheet.absoluteFill} />
        </Animated.View>
        <View style={s.tankSparkle}>
          <Icon name="star" size={32} color="rgba(255,255,255,0.8)" />
        </View>
        <View style={s.tankShine} />
      </Animated.View>
      <Animated.View style={[s.tankBase, baseGlowStyle]} />
    </Animated.View>
  );
}

export default function EnergyChargeScreen() {
  const insets = useSafeAreaInsets();
  const { lightEnergy, powerPlant, convertStoredEnergy, exchangeEcoPoints, progress } = useApp();

  const [converting, setConverting] = useState(false);
  const [exchanging, setExchanging] = useState(false);
  const [convertedMsg, setConvertedMsg] = useState<string | null>(null);
  const [exchangedMsg, setExchangedMsg] = useState<string | null>(null);

  const convertedTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const exTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (convertedTimerRef.current) clearTimeout(convertedTimerRef.current);
    if (exTimerRef.current) clearTimeout(exTimerRef.current);
  }, []);

  const genki = lightEnergy.genki;
  const exchangeableEnergy = Math.floor(lightEnergy.storedEnergy);
  const chargeGlowTarget = getChargeGlowStrength(exchangeableEnergy);
  const chargeGlow = useSharedValue(chargeGlowTarget);
  useEffect(() => {
    chargeGlow.value = withTiming(chargeGlowTarget, { duration: 900, easing: easeInOutSine });
  }, [chargeGlowTarget]);
  const mascotStage = getMascotStage(progress.level);

  const topPad = Platform.OS === 'web' ? space.xl : insets.top;
  const convertScale = useSharedValue(1);
  const convertStyle = useAnimatedStyle(() => ({ transform: [{ scale: convertScale.value }] }));

  const handleConvert = async () => {
    if (converting || exchangeableEnergy <= 0) return;
    setConverting(true);
    convertScale.value = withSequence(withSpring(0.94, { damping: 8, stiffness: 400 }), withSpring(1, { damping: 10, stiffness: 200 }));
    try {
      const { converted } = await convertStoredEnergy();
      if (converted > 0) {
        setConvertedMsg(`${converted} エネルギーを交換しました`);
        if (convertedTimerRef.current) clearTimeout(convertedTimerRef.current);
        convertedTimerRef.current = setTimeout(() => setConvertedMsg(null), 3000);
      }
    } finally {
      setConverting(false);
    }
  };

  const handleExchange = async () => {
    if (exchanging || powerPlant.ecoPoints <= 0) return;
    setExchanging(true);
    try {
      const { exchanged } = await exchangeEcoPoints(powerPlant.ecoPoints);
      if (exchanged > 0) {
        setExchangedMsg(`YOKIポイントを受け取りました`);
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
        contentContainerStyle={[s.content, { paddingTop: topPad + space.lg, paddingBottom: (Platform.OS === 'web' ? space.xxl : insets.bottom) + control.height + space.xl }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.heading}>
          <View style={s.titleRow}>
            <View style={s.titleMark}><Icon name="star" size={iconSize.sm} color={ENERGY_NEON_DEEP} /></View>
            <Text style={s.title}>エネルギーチャージ</Text>
          </View>
          <Text style={s.subtitle}>たまったエネルギーをYOKIポイントに交換できます</Text>
        </View>

        {/* 魔法の庭園シーン */}
        <View style={s.sceneFrame}>
          <View style={s.sceneInner}>
            <ImageBackground
              source={SCENE_BG}
              style={StyleSheet.absoluteFill as any}
              imageStyle={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />

            <LightMotes chargeGlow={chargeGlow} targetGlow={chargeGlowTarget} />

            <View style={s.mascotWrap} pointerEvents="none">
              <View style={s.mascotStand}>
                <CharacterAura genki={genki} />
                <Mascot stage={mascotStage} mood={genki >= 60 ? 'excited' : 'happy'} size={120} idleBehavior="normal" />
              </View>
            </View>
            <PowerCable chargeGlow={chargeGlow} />
            <CrystalTank energy={exchangeableEnergy} chargeGlow={chargeGlow} />
          </View>
        </View>

        <View style={[s.card, s.statsCard]}>
          <View style={s.statsRow}>
            <View style={s.statCell}>
              <Text style={s.statHead}>本日のエネルギー</Text>
              <Text style={s.statValue}>+{lightEnergy.todayEnergy}</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.statCell}>
              <Text style={s.statHead}>チャージ量</Text>
              <Text style={s.statValue}>{exchangeableEnergy}</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.statCell}>
              <Text style={s.statHead}>元気度</Text>
              <Text style={s.statValue}>{genki}%</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.statCell}>
              <Text style={s.statHead}>受け取り可能</Text>
              <Text style={s.statValue}>{powerPlant.ecoPoints}</Text>
            </View>
          </View>
        </View>

        <View style={[s.card, s.actionCard]}>
          <View style={s.cardHeader}>
            <Text style={s.cardTitle}>YOKIポイント交換</Text>
          </View>
          <Text style={s.hint}>蓄えたエネルギーを交換して、YOKIポイントとして受け取ろう</Text>

          <View style={s.conversionRow}>
            <View style={s.conversionValue}>
              <View style={s.conversionIcon}><Icon name="zap" size={iconSize.sm} color={ENERGY_NEON_DEEP} /></View>
              <View><Text style={s.conversionNumber}>{exchangeableEnergy}</Text><Text style={s.conversionLabel}>ENERGY</Text></View>
            </View>
            <Icon name="chevrons-right" size={iconSize.md} color="#E8A2C4" />
            <View style={s.conversionValue}>
              <View style={[s.conversionIcon, s.giftIcon]}><Icon name="gift" size={iconSize.sm} color="#F05A91" /></View>
              <View><Text style={s.conversionNumber}>{exchangeableEnergy}</Text><Text style={s.conversionLabel}>交換待ち</Text></View>
            </View>
          </View>

          {convertedMsg && (
            <Animated.View entering={FadeInUp.springify().damping(10)} exiting={FadeOut} style={s.banner}>
              <Text style={s.bannerText}>{convertedMsg}</Text>
            </Animated.View>
          )}

          <Animated.View style={convertStyle}>
            <Button
              label={exchangeableEnergy > 0 ? `${exchangeableEnergy} エネルギーを交換する` : 'チャージがたまったら交換できるよ'}
              icon="refresh-cw"
              onPress={handleConvert}
              disabled={converting || exchangeableEnergy <= 0}
              loading={converting}
              fullWidth
            />
          </Animated.View>
        </View>

        <View style={s.rewardSection}>
          <View style={s.cardHeader}>
            <Text style={s.cardTitle}>YOKIポイントに受け取る</Text>
            <View style={s.ecoBadge}>
              <Icon name="gift" size={iconSize.xs} color={colors.success} />
              <Text style={s.ecoBadgeText}>{powerPlant.ecoPoints} pt</Text>
            </View>
          </View>
          <Text style={s.hint}>受け取ったYOKIポイントは、ごはんやショップのアイテムに使えます</Text>

          {exchangedMsg && (
            <Animated.View entering={FadeInUp.springify().damping(10)} exiting={FadeOut} style={s.banner}>
              <Text style={s.bannerText}>{exchangedMsg}</Text>
            </Animated.View>
          )}

          <Button
            label={powerPlant.ecoPoints > 0 ? `${powerPlant.ecoPoints} YOKIポイントを受け取る` : 'エネルギーを交換すると受け取れるよ'}
            icon="coffee"
            variant="secondary"
            onPress={handleExchange}
            disabled={exchanging || powerPlant.ecoPoints <= 0}
            loading={exchanging}
            fullWidth
          />
          <PressScale onPress={() => router.push('/(tabs)')} style={s.feedLinkBtn}>
            <Text style={s.feedLinkText}>ホームでごはんをあげにいく</Text>
            <Icon name="arrow-right" size={iconSize.sm} color={colors.primary} />
          </PressScale>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: screenPadding, gap: space.md },
  heading: { gap: space.xs, marginBottom: space.xs },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  titleMark: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.7)' },
  title: { ...typography.display, color: '#331568' },
  subtitle: { ...typography.caption, color: '#746986' },

  card: {
    backgroundColor: colors.card,
    ...border.hairline,
    borderRadius: radius.lg,
    padding: space.lg,
    gap: space.md,
    ...elevation.raised,
  },

  statsCard: { paddingVertical: space.md, paddingHorizontal: space.sm, backgroundColor: 'rgba(255,255,255,0.84)' },
  statsRow: { flexDirection: 'row', alignItems: 'stretch' },
  statCell: { flex: 1, alignItems: 'center', gap: space.xs },
  statDivider: { width: border.width, backgroundColor: colors.border },
  statHead: { ...typography.micro, color: '#746986', textAlign: 'center' },
  statValue: { ...typography.title, color: '#331568' },

  sceneFrame: {
    width: '100%',
    aspectRatio: 0.85,
    backgroundColor: '#1E1536',
    borderRadius: radius.xl,
    padding: space.xs,
    ...elevation.raised,
    ...border.hairline,
  },
  sceneInner: {
    flex: 1,
    borderRadius: radius.xl - space.xs,
    overflow: 'hidden',
    backgroundColor: '#0F0920',
  },

  mascotWrap: { position: 'absolute', left: '5%', bottom: '18%', width: '45%', alignItems: 'center' },
  mascotStand: { alignItems: 'center', justifyContent: 'flex-end' },
  aura: { position: 'absolute', bottom: -10, width: 140, height: 40, borderRadius: radius.pill, backgroundColor: ENERGY_GLOW, shadowColor: ENERGY_NEON, shadowOpacity: 0.75, shadowRadius: 18 },

  tankWrap: { position: 'absolute', right: '8%', bottom: '15%', width: '28%', height: '50%', alignItems: 'center', justifyContent: 'flex-end' },
  tankStatus: { position: 'absolute', top: -24, right: -16, paddingVertical: 5, paddingHorizontal: 10, borderRadius: radius.lg, backgroundColor: 'rgba(16,44,29,0.9)', alignItems: 'center', zIndex: 5, ...border.hairline, borderColor: 'rgba(141,255,112,0.5)' },
  tankStatusLabel: { ...typography.micro, color: '#F1E9FF' },
  tankValue: { ...typography.label, color: '#FFF', lineHeight: 22 },
  tankGlass: { width: '80%', flex: 1, borderRadius: 16, backgroundColor: 'rgba(8,28,18,0.68)', borderWidth: 2, borderColor: 'rgba(141,255,112,0.62)', justifyContent: 'flex-end', alignItems: 'center', overflow: 'hidden', shadowColor: ENERGY_NEON, shadowOpacity: 0.5, shadowRadius: 12 },
  tankLiquid: { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopLeftRadius: 10, borderTopRightRadius: 10, overflow: 'hidden' },
  tankSparkle: { position: 'absolute', top: '40%', zIndex: 2 },
  tankShine: { position: 'absolute', left: 6, top: 10, bottom: 12, width: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.25)' },
  tankBase: { width: '90%', height: 16, borderRadius: 6, backgroundColor: '#183C29', marginTop: -4, borderWidth: 1, borderColor: '#3A7B50', shadowColor: ENERGY_NEON, shadowOpacity: 0.55, shadowRadius: 12 },

  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  cardTitle: { ...typography.subhead, color: colors.foreground, flex: 1 },
  ecoBadge: { flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingHorizontal: space.md, paddingVertical: space.xs, borderRadius: radius.pill, backgroundColor: colors.successSoft },
  ecoBadgeText: { ...typography.label, color: colors.success },
  hint: { ...typography.caption, color: colors.mutedForeground },

  actionCard: { borderColor: 'rgba(224,204,242,0.9)' },
  conversionRow: { minHeight: 62, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.sm },
  conversionValue: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  conversionIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(57,255,20,0.13)' },
  giftIcon: { backgroundColor: '#FFE8F1' },
  conversionNumber: { ...typography.title, color: '#331568' },
  conversionLabel: { ...typography.micro, color: colors.mutedForeground },

  banner: { padding: space.md, borderRadius: radius.md, backgroundColor: colors.primarySoft, ...border.hairline, borderColor: colors.primary, alignItems: 'center' },
  bannerText: { ...typography.calloutStrong, color: colors.primaryOnSoft, textAlign: 'center' },

  rewardSection: { gap: space.md, marginTop: space.xs },
  feedLinkBtn: { minHeight: control.minTouch, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm },
  feedLinkText: { ...typography.calloutStrong, color: colors.primary },
});
