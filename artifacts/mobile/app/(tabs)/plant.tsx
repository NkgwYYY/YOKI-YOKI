import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, ImageBackground } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withSequence,
  withTiming, withSpring, withDelay, FadeInUp, FadeOut, Easing,
} from 'react-native-reanimated';
import { border, colors, control, radius, screenPadding, space, typography, elevation } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { Icon, iconSize, type IconName } from '@/components/ui/Icon';
import { PressScale } from '@/components/ui/PressScale';
import { CosmicBackground } from '@/components/CosmicBackground';
import { useApp } from '@/contexts/AppContext';
import { Mascot } from '@/components/Mascot';
import { getMascotStage } from '@/utils/mascotUtils';
import { FOOD_ITEMS } from '@/data/foodItems';

const easeInOutSine = Easing.inOut(Easing.sin);
const SCENE_BG = require('@/assets/images/plant/plant-scene-v2.png');

function sunshineTier(genki: number): { label: string; icon: IconName } {
  if (genki >= 85) return { label: 'まぶしいくらい!', icon: 'sun' };
  if (genki >= 60) return { label: 'つよい日差し', icon: 'sunrise' };
  if (genki >= 30) return { label: 'ふつうの日差し', icon: 'cloud' };
  return { label: 'よわい日差し', icon: 'cloud-rain' };
}

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
  const strength = 0.35 + (genki / 100) * 0.65;
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
      <Animated.View style={[s.sunRaysRing, rayStyle]}>
        {Array.from({ length: 8 }).map((_, i) => (
          <View key={i} style={[s.sunRaySpike, { transform: [{ rotate: `${i * 45}deg` }, { translateY: -37 }] }]} />
        ))}
      </Animated.View>
      <Animated.View style={[s.sunRaysRing, bodyStyle]}>
        {Array.from({ length: 8 }).map((_, i) => (
          <View key={i} style={[s.sunRaySpikeSmall, { transform: [{ rotate: `${i * 45}deg` }, { translateY: -34 }] }]} />
        ))}
      </Animated.View>
      <Animated.View style={bodyStyle}>
        <LinearGradient colors={['#FFFBE0', '#FFE066', '#FFAE2E']} style={s.sunBody} start={{ x: 0.3, y: 0.15 }} end={{ x: 0.7, y: 0.95 }} />
        <View style={s.sunHighlight} />
      </Animated.View>
    </View>
  );
}

function LightMotes({ genki }: { genki: number }) {
  const count = 2 + Math.round((genki / 100) * 4);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {Array.from({ length: count }).map((_, i) => <Mote key={i} index={i} />)}
    </View>
  );
}

function Mote({ index }: { index: number }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withDelay(index * 620, withRepeat(withTiming(1, { duration: 3400, easing: Easing.out(Easing.quad) }), -1, false));
  }, []);
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
  return <Animated.View style={[{ position: 'absolute', bottom: 118, left: `${52 + (index % 3) * 7}%`, width: dot, height: dot, borderRadius: dot / 2, backgroundColor: '#FFF0F5' }, st]} />;
}

function EnergyFlow({ genki }: { genki: number }) {
  const count = 2 + Math.round((genki / 100) * 3);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {Array.from({ length: count }).map((_, i) => <EnergyDot key={i} index={i} />)}
    </View>
  );
}

function EnergyDot({ index }: { index: number }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withDelay(index * 540, withRepeat(withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.quad) }), -1, false));
  }, []);
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
    <Animated.View style={[{ position: 'absolute', top: `${44 + (index % 3) * 5}%`, left: '28%' }, st]}>
      <Icon name="zap" size={iconSize.xs + (index % 2) * 2} color="#FFF" />
    </Animated.View>
  );
}

function CharacterAura({ genki }: { genki: number }) {
  const o = useSharedValue(0.5);
  useEffect(() => {
    o.value = withRepeat(withSequence(withTiming(1, { duration: 1500, easing: easeInOutSine }), withTiming(0.5, { duration: 1500, easing: easeInOutSine })), -1, false);
  }, []);
  const strength = 0.25 + (genki / 100) * 0.75;
  const st = useAnimatedStyle(() => ({
    opacity: strength * (0.35 + o.value * 0.4),
    transform: [{ scale: 0.9 + o.value * 0.15 * strength }],
  }));
  return <Animated.View style={[s.aura, st]} pointerEvents="none" />;
}

function PowerCable() {
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 1800, easing: Easing.linear }), -1, false);
  }, []);
  const pulseStyle = useAnimatedStyle(() => ({
    opacity: 0.35 + Math.sin(pulse.value * Math.PI) * 0.65,
    transform: [{ translateX: pulse.value * 62 }, { scale: 0.8 + pulse.value * 0.35 }],
  }));
  return (
    <View style={s.cableWrap} pointerEvents="none">
      <View style={s.cableShadow} />
      <LinearGradient colors={['#FFE985', '#BFFF9A', '#84F2BD']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.cable} />
      <Animated.View style={[s.cablePulse, pulseStyle]} />
      <View style={s.plug}>
        <View style={s.plugPin} />
        <View style={[s.plugPin, { marginLeft: 3 }]} />
      </View>
    </View>
  );
}

function StorageBattery({ energy, genki }: { energy: number; genki: number }) {
  const float = useSharedValue(0);
  const liquid = useSharedValue(0);
  useEffect(() => {
    float.value = withRepeat(
      withSequence(
        withTiming(-3, { duration: 1700, easing: easeInOutSine }),
        withTiming(2, { duration: 1700, easing: easeInOutSine }),
      ), -1, true,
    );
    liquid.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2100, easing: easeInOutSine }),
        withTiming(0, { duration: 2100, easing: easeInOutSine }),
      ), -1, true,
    );
  }, []);
  const floatStyle = useAnimatedStyle(() => ({ transform: [{ translateY: float.value }] }));
  const liquidStyle = useAnimatedStyle(() => ({
    opacity: 0.82 + liquid.value * 0.16,
    transform: [{ translateY: liquid.value * -3 }, { scaleX: 1 + liquid.value * 0.025 }],
  }));
  return (
    <Animated.View style={[s.batteryWrap, floatStyle]} pointerEvents="none">
      <View style={s.batteryStatus}>
        <Text style={s.batteryStatusLabel}>蓄電中…</Text>
        <Text style={s.batteryValue}>{energy}</Text>
        <Text style={s.batteryUnit}>Energy</Text>
      </View>
      <View style={s.batteryCap} />
      <View style={s.batteryHandle} />
      <View style={s.batteryShell}>
        <View style={s.batteryGlass}>
          <Animated.View style={[s.batteryLiquid, liquidStyle, { height: `${32 + genki * 0.48}%` }]}>
            <LinearGradient colors={['rgba(231,255,174,0.72)', '#9CF4A6', '#61D8A0']} style={StyleSheet.absoluteFill} />
          </Animated.View>
          <View style={s.batteryBolt}>
            <Icon name="zap" size={32} color="#F7FFD0" />
          </View>
          <View style={s.batteryShine} />
        </View>
        <View style={s.batteryFeet}>
          <View style={s.batteryFoot} />
          <View style={s.batteryFoot} />
        </View>
      </View>
    </Animated.View>
  );
}

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

  // Soft pink/lavender veil over the illustration to integrate it into the bright theme
  const darkness = 0.15 * (1 - genki / 100);

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
    sellScale.value = withSequence(withSpring(0.94, { damping: 8, stiffness: 400 }), withSpring(1, { damping: 10, stiffness: 200 }));
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
        setExchangedMsg(`ごほうび ${exchanged} をきらめきポイント +${exchanged} にかえたよ`);
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
            <View style={s.titleMark}><Icon name="zap" size={iconSize.sm} color="#7150B8" /></View>
            <Text style={s.title}>ひかり発電所</Text>
          </View>
          <Text style={s.subtitle}>あなたの元気が、キャラクターの光になり、エネルギーになります</Text>
        </View>

        <View style={[s.card, s.statsCard]}>
          <View style={s.statsRow}>
            <View style={s.statCell}>
              <Text style={s.statHead}>今日の元気</Text>
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
              <Text style={s.statHead}>元気</Text>
              <Text style={s.statValue}>{genki}%</Text>
              <Text style={s.statUnit}>元気度</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.statCell}>
              <Text style={s.statHead}>ごほうび</Text>
              <Text style={s.statValue}>{powerPlant.ecoPoints}</Text>
              {sellable > 0 ? (
                <View style={s.sellReadyChip}><Text style={s.sellReadyChipText}>売電できるよ</Text></View>
              ) : <Text style={s.statUnit}>Point</Text>}
            </View>
          </View>
        </View>

        {/* ジオラマ風のフレームに収めた発電所シーン */}
        <View style={s.sceneFrame}>
          <View style={s.sceneInner}>
            <ImageBackground
              source={SCENE_BG}
              style={StyleSheet.absoluteFill as any}
              imageStyle={{ width: '100%', height: '100%' }}
              resizeMode="stretch"
            >
              {/* 明るい世界観に合わせるためのピンク/ラベンダーヴェール */}
              <View style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(230,216,248,${darkness + 0.1})`, mixBlendMode: 'overlay' as any }]} />
              <SunBurst seq={sunBurstSeq} />
            </ImageBackground>

            <SceneSun genki={genki} />
            <LightMotes genki={genki} />

            <View style={s.mascotWrap} pointerEvents="none">
              <View style={s.mascotBubble}>
                <Text style={s.mascotBubbleText}>{mascotMsg}</Text>
              </View>
              <View style={s.mascotStand}>
                <CharacterAura genki={genki} />
                <Mascot stage={mascotStage} mood={genki >= 60 ? 'excited' : 'happy'} size={108} idleBehavior="normal" />
              </View>
            </View>
            <PowerCable />
            <EnergyFlow genki={genki} />
            <StorageBattery energy={sellable} genki={genki} />

            <View style={s.sunshineChip}>
              <Icon name={tier.icon} size={iconSize.xs} color={colors.primary} />
              <Text style={s.sunshineChipText}>元気 {genki}%{'\n'}{tier.label}</Text>
            </View>
          </View>
        </View>

        <View style={[s.card, s.sellCard]}>
          <View style={s.cardHeader}>
            <Text style={s.cardTitle}>売電する</Text>
          </View>
          <Text style={s.hint}>蓄えたエネルギーを売電して、ごほうびに交換しよう</Text>
          <View style={s.conversionRow}>
            <View style={s.conversionValue}>
              <View style={s.conversionIcon}><Icon name="zap" size={iconSize.sm} color="#7656BA" /></View>
              <View><Text style={s.conversionNumber}>{sellable}</Text><Text style={s.conversionLabel}>Energy</Text></View>
            </View>
            <Icon name="chevrons-right" size={iconSize.md} color="#E8A2C4" />
            <View style={s.conversionValue}>
              <View style={[s.conversionIcon, s.giftIcon]}><Icon name="gift" size={iconSize.sm} color="#F05A91" /></View>
              <View><Text style={s.conversionNumber}>{sellable}</Text><Text style={s.conversionLabel}>ごほうびポイント</Text></View>
            </View>
          </View>
          {soldMsg && (
            <Animated.View entering={FadeInUp.springify().damping(10)} exiting={FadeOut} style={s.banner}>
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

        <View style={s.rewardSection}>
          <View style={s.cardHeader}>
            <Text style={s.cardTitle}>ごほうびと交換する</Text>
            <View style={s.ecoBadge}>
              <Icon name="gift" size={iconSize.xs} color={colors.success} />
              <Text style={s.ecoBadgeText}>{powerPlant.ecoPoints}</Text>
            </View>
          </View>
          <Text style={s.hint}>ごほうびポイントを、キャラクターのごはんに使えるよ</Text>
          <View style={s.foodRow}>
            {FOOD_ITEMS.slice(0, 4).map((f) => (
              <View key={f.id} style={s.foodCell}>
                <LinearGradient colors={['#FFF9FD', '#F4EBFF']} style={s.foodIcon}>
                  <Icon name={f.icon} size={iconSize.lg} color={colors.primary} />
                </LinearGradient>
                <Text style={s.foodName}>{f.name}</Text>
                <View style={s.foodCostRow}>
                  <Icon name="zap" size={iconSize.xs} color="#7656BA" />
                  <Text style={s.foodCost}>{f.cost}</Text>
                </View>
              </View>
            ))}
          </View>
          {exchangedMsg && (
            <Animated.View entering={FadeInUp.springify().damping(10)} exiting={FadeOut} style={s.banner}>
              <Text style={s.bannerText}>{exchangedMsg}</Text>
            </Animated.View>
          )}
          <Button
            label={powerPlant.ecoPoints > 0 ? `ごほうび ${powerPlant.ecoPoints} をきらめきポイントにかえる` : '売電するとごほうびポイントがもらえるよ'}
            icon="refresh-cw"
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

const s = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: screenPadding, gap: space.md },
  heading: { gap: space.xs, marginBottom: space.xs },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  titleMark: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.72)' },
  title: { ...typography.display, color: '#3D246F' },
  subtitle: { ...typography.caption, color: '#6F6385' },

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
  statUnit: { ...typography.micro, color: colors.subtleForeground },
  sellReadyChip: { paddingHorizontal: space.sm, paddingVertical: 2, borderRadius: radius.pill, backgroundColor: colors.primarySoft },
  sellReadyChipText: { ...typography.micro, color: colors.primaryOnSoft },

  sceneFrame: {
    width: '100%',
    aspectRatio: 0.94,
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: space.xs, // White border frame effect
    ...elevation.raised,
    ...border.hairline,
  },
  sceneInner: {
    flex: 1,
    borderRadius: radius.xl - space.xs,
    overflow: 'hidden',
  },
  sunBurst: { backgroundColor: '#FFF0F5' },
  sunWrap: { position: 'absolute', left: '5%', top: space.xl, width: 82, height: 82, alignItems: 'center', justifyContent: 'center' },
  sunGlow: { position: 'absolute', width: 96, height: 96, borderRadius: radius.pill, backgroundColor: '#FFD86B' },
  sunRaysRing: { position: 'absolute', width: 96, height: 96, alignItems: 'center', justifyContent: 'center' },
  sunRaySpike: { position: 'absolute', width: 7, height: 18, borderRadius: 4, backgroundColor: '#FFD24D' },
  sunRaySpikeSmall: { position: 'absolute', width: 5, height: 12, borderRadius: 3, backgroundColor: '#FFE58A' },
  sunBody: { width: 50, height: 50, borderRadius: 25 },
  sunHighlight: { position: 'absolute', top: space.sm, left: space.md, width: 16, height: 10, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.75)', transform: [{ rotate: '-20deg' }] },
  mascotWrap: { position: 'absolute', left: '7%', bottom: space.xl, width: '43%', alignItems: 'center', gap: space.xs },
  mascotStand: { alignItems: 'center', justifyContent: 'flex-end' },
  aura: { position: 'absolute', bottom: -6, width: 110, height: 46, borderRadius: radius.pill, backgroundColor: '#FFF0F5' },
  mascotBubble: { backgroundColor: colors.card, borderRadius: radius.md, paddingHorizontal: space.md, paddingVertical: space.sm, maxWidth: 176, ...elevation.raised },
  mascotBubbleText: { ...typography.micro, color: colors.foreground, lineHeight: 16, textAlign: 'center' },
  sunshineChip: { position: 'absolute', top: space.md, left: space.md, flexDirection: 'row', alignItems: 'center', gap: space.xs, backgroundColor: 'rgba(255,255,255,0.88)', borderRadius: radius.pill, paddingHorizontal: space.md, paddingVertical: space.sm, ...border.hairline, ...elevation.raised },
  sunshineChipText: { ...typography.micro, color: colors.primary },
  cableWrap: { position: 'absolute', left: '34%', bottom: '20%', width: '34%', height: 34, justifyContent: 'center', transform: [{ rotate: '9deg' }] },
  cableShadow: { position: 'absolute', left: 0, right: 0, height: 12, borderRadius: 8, backgroundColor: 'rgba(70,54,107,0.22)', transform: [{ translateY: 4 }] },
  cable: { height: 8, borderRadius: 6, borderWidth: 2, borderColor: 'rgba(255,255,255,0.72)' },
  cablePulse: { position: 'absolute', left: 3, width: 15, height: 15, borderRadius: 8, backgroundColor: '#F8FFB6', shadowColor: '#DAFF85', shadowOpacity: 1, shadowRadius: 10 },
  plug: { position: 'absolute', left: -9, width: 22, height: 18, borderRadius: 7, backgroundColor: '#8064BB', flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-start', paddingTop: 2 },
  plugPin: { width: 3, height: 6, borderRadius: 2, backgroundColor: '#FFF6D2' },
  batteryWrap: { position: 'absolute', right: '5%', bottom: '9%', width: '37%', height: '68%', alignItems: 'center', justifyContent: 'flex-end' },
  batteryStatus: { position: 'absolute', top: 0, right: 0, minWidth: 112, paddingVertical: space.sm, paddingHorizontal: space.md, borderRadius: radius.lg, backgroundColor: 'rgba(66,42,113,0.86)', alignItems: 'center', zIndex: 5 },
  batteryStatusLabel: { ...typography.micro, color: '#F1E9FF' },
  batteryValue: { ...typography.display, color: '#FFFFFF', lineHeight: 34 },
  batteryUnit: { ...typography.micro, color: '#DED2F2' },
  batteryCap: { width: 42, height: 11, borderRadius: 6, backgroundColor: '#725CA0', marginBottom: -2, zIndex: 3 },
  batteryHandle: { position: 'absolute', bottom: '62%', width: '86%', height: 42, borderWidth: 8, borderBottomWidth: 0, borderColor: '#695394', borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  batteryShell: { width: '92%', height: '59%', borderRadius: radius.lg, backgroundColor: '#615080', padding: 9, borderWidth: 3, borderColor: '#A696C7', shadowColor: '#5C3F84', shadowOpacity: 0.35, shadowRadius: 8, shadowOffset: { width: 0, height: 5 } },
  batteryGlass: { flex: 1, borderRadius: radius.md, overflow: 'hidden', backgroundColor: 'rgba(33,42,67,0.72)', borderWidth: 2, borderColor: 'rgba(255,255,255,0.55)', justifyContent: 'flex-end', alignItems: 'center' },
  batteryLiquid: { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopLeftRadius: 18, borderTopRightRadius: 13, overflow: 'hidden' },
  batteryBolt: { position: 'absolute', top: '39%', zIndex: 2 },
  batteryShine: { position: 'absolute', left: 9, top: 10, bottom: 12, width: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.34)' },
  batteryFeet: { position: 'absolute', bottom: -7, left: 8, right: 8, flexDirection: 'row', justifyContent: 'space-between' },
  batteryFoot: { width: 22, height: 8, borderRadius: 4, backgroundColor: '#514169' },

  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  cardTitle: { ...typography.subhead, color: colors.foreground, flex: 1 },
  ecoBadge: { flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingHorizontal: space.md, paddingVertical: space.xs, borderRadius: radius.pill, backgroundColor: colors.successSoft },
  ecoBadgeText: { ...typography.label, color: colors.success },
  hint: { ...typography.caption, color: colors.mutedForeground },
  banner: { padding: space.md, borderRadius: radius.md, backgroundColor: colors.primarySoft, ...border.hairline, borderColor: colors.primary, alignItems: 'center' },
  bannerText: { ...typography.calloutStrong, color: colors.primaryOnSoft, textAlign: 'center' },
  sellCard: { borderColor: 'rgba(224,204,242,0.9)' },
  conversionRow: { minHeight: 62, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.sm },
  conversionValue: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  conversionIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F0E9FB' },
  giftIcon: { backgroundColor: '#FFE8F1' },
  conversionNumber: { ...typography.title, color: '#331568' },
  conversionLabel: { ...typography.micro, color: colors.mutedForeground },
  rewardSection: { gap: space.md, marginTop: space.xs },

  foodRow: { flexDirection: 'row', gap: space.sm },
  foodCell: { flex: 1, alignItems: 'center', gap: space.xs, padding: space.xs, paddingBottom: space.sm, borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.86)', ...border.hairline },
  foodIcon: { width: '100%', aspectRatio: 1, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  foodName: { ...typography.micro, color: colors.mutedForeground },
  foodCostRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  foodCost: { ...typography.micro, color: colors.foreground },
  feedLinkBtn: { minHeight: control.minTouch, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm },
  feedLinkText: { ...typography.calloutStrong, color: colors.primary },
});