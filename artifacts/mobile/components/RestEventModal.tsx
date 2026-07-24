import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  Dimensions, Animated as RNAnimated, PanResponder,
} from 'react-native';
import Svg, {
  G, Path, Circle, Ellipse, Line, Defs,
  RadialGradient as SvgRadialGradient, LinearGradient as SvgLinearGradient, Stop,
} from 'react-native-svg';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors } from '@/hooks/useColors';
import { Mascot } from '@/components/Mascot';
import { getMascotStage } from '@/utils/mascotUtils';
import { Analytics } from '@/utils/analytics';

const { width: SW, height: SH } = Dimensions.get('window');
const SCENE_DURATION = 10_000;

type Scene = 'campfire' | 'rain' | 'stars' | 'cat';
type Phase = 'choose' | 'playing' | 'outro';
type CatState = 'sleeping' | 'alert' | 'purring';

const SCENES: { key: Scene; emoji: string; label: string; bg: readonly [string, string] }[] = [
  { key: 'campfire', emoji: '🔥', label: '焚き火を見る',  bg: ['#1A0A00', '#3D1A00'] },
  { key: 'rain',     emoji: '🌧️', label: '雨の音を聞く', bg: ['#0A1020', '#162040'] },
  { key: 'stars',    emoji: '🌌', label: '星空を見る',   bg: ['#050510', '#0A0A30'] },
  { key: 'cat',      emoji: '🐱', label: '猫を撫でる',   bg: ['#18100A', '#352010'] },
];

const SOUND_MAP: Record<Scene, any> = {
  campfire: require('@/assets/sounds/campfire.mp3'),
  rain:     require('@/assets/sounds/rain.mp3'),
  stars:    require('@/assets/sounds/stars.mp3'),
  cat:      require('@/assets/sounds/cat_purr.mp3'),
};

/* ─── Sound hook ──────────────────────────────── */
function useSceneAudio() {
  const soundRef = useRef<Audio.Sound | null>(null);

  const play = async (scene: Scene) => {
    try {
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      if (soundRef.current) {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
      const { sound } = await Audio.Sound.createAsync(
        SOUND_MAP[scene],
        { isLooping: true, volume: 1.0 },
      );
      soundRef.current = sound;
      await sound.playAsync();
    } catch (_) {}
  };

  const stop = async () => {
    try {
      if (soundRef.current) {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
    } catch (_) {}
  };

  useEffect(() => () => { stop(); }, []);
  return { play, stop };
}

/* ─── SVG Cat ─────────────────────────────────── */
function CatSvg({ state }: { state: CatState }) {
  return (
    <Svg width={210} height={230} viewBox="0 0 130 145">
      <Defs>
        {/* Head — warm amber-ginger with golden highlight */}
        <SvgRadialGradient id="headFur" cx="42%" cy="33%" r="65%">
          <Stop offset="0%"   stopColor="#F8C468" />
          <Stop offset="40%"  stopColor="#EB9030" />
          <Stop offset="100%" stopColor="#C05C10" />
        </SvgRadialGradient>
        {/* Cheek puff (slightly lighter) */}
        <SvgRadialGradient id="cheekL" cx="62%" cy="38%" r="68%">
          <Stop offset="0%"   stopColor="#F9BE5A" />
          <Stop offset="100%" stopColor="#CC6618" />
        </SvgRadialGradient>
        <SvgRadialGradient id="cheekR" cx="38%" cy="38%" r="68%">
          <Stop offset="0%"   stopColor="#F9BE5A" />
          <Stop offset="100%" stopColor="#CC6618" />
        </SvgRadialGradient>
        {/* Muzzle — cream */}
        <SvgRadialGradient id="muzzle" cx="50%" cy="28%" r="64%">
          <Stop offset="0%"   stopColor="#FFF4DE" />
          <Stop offset="65%"  stopColor="#F9DDA8" />
          <Stop offset="100%" stopColor="#EDCA78" />
        </SvgRadialGradient>
        {/* Body */}
        <SvgRadialGradient id="bodyFur" cx="42%" cy="28%" r="68%">
          <Stop offset="0%"   stopColor="#F0A838" />
          <Stop offset="100%" stopColor="#B85C10" />
        </SvgRadialGradient>
        {/* Chest ruff */}
        <SvgRadialGradient id="chestRuff" cx="50%" cy="20%" r="65%">
          <Stop offset="0%"   stopColor="#FFF0D5" />
          <Stop offset="100%" stopColor="#F5CCA0" />
        </SvgRadialGradient>
        {/* Iris */}
        <SvgRadialGradient id="irisG" cx="36%" cy="33%" r="60%">
          <Stop offset="0%"   stopColor="#F2D460" />
          <Stop offset="55%"  stopColor="#D49820" />
          <Stop offset="100%" stopColor="#9A6808" />
        </SvgRadialGradient>
        {/* Ear inner */}
        <SvgLinearGradient id="earIn" x1="50%" y1="0%" x2="50%" y2="100%">
          <Stop offset="0%"   stopColor="#F8B8C8" />
          <Stop offset="100%" stopColor="#E48898" />
        </SvgLinearGradient>
      </Defs>

      {/* Ground shadow */}
      <Ellipse cx={65} cy={142} rx={38} ry={5} fill="#00000022" />

      {/* ── Body ── */}
      <Ellipse cx={65} cy={120} rx={42} ry={26} fill="url(#bodyFur)" />
      {/* Chest ruff layers */}
      <Ellipse cx={65} cy={127} rx={34} ry={19} fill="#ECA040" opacity="0.55" />
      <Ellipse cx={65} cy={133} rx={26} ry={13} fill="url(#chestRuff)" />
      {/* Subtle body stripes */}
      <Path d="M30 110 Q28 121 30 131" stroke="#9E4E0C" strokeWidth="2.8" fill="none" strokeLinecap="round" opacity="0.28" />
      <Path d="M38 107 Q36 119 38 129" stroke="#9E4E0C" strokeWidth="2.4" fill="none" strokeLinecap="round" opacity="0.22" />
      <Path d="M100 110 Q102 121 100 131" stroke="#9E4E0C" strokeWidth="2.8" fill="none" strokeLinecap="round" opacity="0.28" />
      <Path d="M92 107 Q94 119 92 129" stroke="#9E4E0C" strokeWidth="2.4" fill="none" strokeLinecap="round" opacity="0.22" />

      {/* Neck */}
      <Ellipse cx={65} cy={97} rx={26} ry={11} fill="#D07820" />

      {/* ── Ears ── */}
      {/* Left outer */}
      <Path d="M17 52 L25 18 L50 40 Z" fill="#C76210" />
      {/* Left inner */}
      <Path d="M20 50 L27 22 L48 39 Z" fill="url(#earIn)" opacity="0.88" />
      {/* Ear fur tips */}
      <Path d="M23 26 Q27 18 30 26" stroke="#DDA050" strokeWidth="1.8" fill="none" strokeLinecap="round" opacity="0.5" />
      {/* Right outer */}
      <Path d="M113 52 L105 18 L80 40 Z" fill="#C76210" />
      {/* Right inner */}
      <Path d="M110 50 L103 22 L82 39 Z" fill="url(#earIn)" opacity="0.88" />
      <Path d="M107 26 Q103 18 100 26" stroke="#DDA050" strokeWidth="1.8" fill="none" strokeLinecap="round" opacity="0.5" />

      {/* ── Head — large, round, wide ── */}
      {/* Cheek puffs (behind main head) */}
      <Ellipse cx={18} cy={70} rx={22} ry={20} fill="url(#cheekL)" opacity="0.8" />
      <Ellipse cx={112} cy={70} rx={22} ry={20} fill="url(#cheekR)" opacity="0.8" />
      {/* Main head */}
      <Ellipse cx={65} cy={62} rx={50} ry={46} fill="url(#headFur)" />

      {/* ── Forehead tabby stripes — dense, characteristic ── */}
      <Path d="M40 28 Q65 20 90 28" stroke="#A84E0C" strokeWidth="3.0" fill="none" strokeLinecap="round" opacity="0.52" />
      <Path d="M37 35 Q65 27 93 35" stroke="#A84E0C" strokeWidth="2.7" fill="none" strokeLinecap="round" opacity="0.46" />
      <Path d="M35 42 Q65 34 95 42" stroke="#A84E0C" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.40" />
      <Path d="M37 49 Q65 42 93 49" stroke="#A84E0C" strokeWidth="2.2" fill="none" strokeLinecap="round" opacity="0.33" />
      <Path d="M40 56 Q65 49 90 56" stroke="#A84E0C" strokeWidth="2.0" fill="none" strokeLinecap="round" opacity="0.26" />
      {/* M-mark center */}
      <Path d="M60 24 Q65 29 70 24" stroke="#9A4808" strokeWidth="1.8" fill="none" strokeLinecap="round" opacity="0.42" />

      {/* ── Muzzle (cream area) ── */}
      <Ellipse cx={65} cy={79} rx={29} ry={23} fill="url(#muzzle)" />
      {/* Muzzle bumps */}
      <Circle cx={57} cy={80} r={10} fill="#FFF6E4" opacity="0.32" />
      <Circle cx={73} cy={80} r={10} fill="#FFF6E4" opacity="0.32" />
      {/* Muzzle whisker dots */}
      <Circle cx={52} cy={79} r={1.4} fill="#D08040" opacity="0.55" />
      <Circle cx={56} cy={77} r={1.3} fill="#D08040" opacity="0.45" />
      <Circle cx={78} cy={79} r={1.4} fill="#D08040" opacity="0.55" />
      <Circle cx={74} cy={77} r={1.3} fill="#D08040" opacity="0.45" />

      {/* ── Eyes ── */}
      {state === 'sleeping' && (
        <G>
          {/* Realistic closed eyes — upper eyelid arc with thickness */}
          {/* Left */}
          <Path d="M36 65 Q50 56 64 65"
            stroke="#6A3808" strokeWidth="3.8" fill="none" strokeLinecap="round" />
          {/* Eyelid fill — slight warmth of the lid */}
          <Path d="M36 65 Q50 58 64 65 Q63 69 37 69 Z"
            fill="#CC6818" opacity="0.22" />
          {/* Lower lid line */}
          <Path d="M38 66 Q50 70 62 66"
            stroke="#8B4818" strokeWidth="1.1" fill="none" strokeLinecap="round" opacity="0.35" />
          {/* Lashes */}
          <Line x1={37} y1={65} x2={34} y2={59} stroke="#4A2808" strokeWidth="1.9" strokeLinecap="round" />
          <Line x1={44} y1={59} x2={43} y2={53} stroke="#4A2808" strokeWidth="1.7" strokeLinecap="round" />
          <Line x1={52} y1={57} x2={52} y2={51} stroke="#4A2808" strokeWidth="1.6" strokeLinecap="round" />
          <Line x1={60} y1={59} x2={62} y2={53} stroke="#4A2808" strokeWidth="1.7" strokeLinecap="round" />
          <Line x1={64} y1={65} x2={68} y2={59} stroke="#4A2808" strokeWidth="1.9" strokeLinecap="round" />

          {/* Right */}
          <Path d="M66 65 Q80 56 94 65"
            stroke="#6A3808" strokeWidth="3.8" fill="none" strokeLinecap="round" />
          <Path d="M66 65 Q80 58 94 65 Q93 69 67 69 Z"
            fill="#CC6818" opacity="0.22" />
          <Path d="M68 66 Q80 70 92 66"
            stroke="#8B4818" strokeWidth="1.1" fill="none" strokeLinecap="round" opacity="0.35" />
          <Line x1={67} y1={65} x2={64} y2={59} stroke="#4A2808" strokeWidth="1.9" strokeLinecap="round" />
          <Line x1={74} y1={59} x2={73} y2={53} stroke="#4A2808" strokeWidth="1.7" strokeLinecap="round" />
          <Line x1={82} y1={57} x2={82} y2={51} stroke="#4A2808" strokeWidth="1.6" strokeLinecap="round" />
          <Line x1={90} y1={59} x2={92} y2={53} stroke="#4A2808" strokeWidth="1.7" strokeLinecap="round" />
          <Line x1={94} y1={65} x2={98} y2={59} stroke="#4A2808" strokeWidth="1.9" strokeLinecap="round" />
        </G>
      )}
      {state === 'alert' && (
        <G>
          {/* Wide open — large round pupils, warm amber iris */}
          <Circle cx={50} cy={63} r={12}   fill="white" />
          <Circle cx={50} cy={63} r={10.5} fill="url(#irisG)" />
          <Circle cx={50} cy={63} r={7}    fill="#160A00" />
          <Circle cx={47} cy={59} r={2.8} fill="white" opacity="0.88" />
          <Circle cx={53} cy={66} r={1.2} fill="white" opacity="0.42" />

          <Circle cx={80} cy={63} r={12}   fill="white" />
          <Circle cx={80} cy={63} r={10.5} fill="url(#irisG)" />
          <Circle cx={80} cy={63} r={7}    fill="#160A00" />
          <Circle cx={77} cy={59} r={2.8} fill="white" opacity="0.88" />
          <Circle cx={83} cy={66} r={1.2} fill="white" opacity="0.42" />
        </G>
      )}
      {state === 'purring' && (
        <G>
          {/* Happy squinting — same arc as sleeping but with amber glow beneath */}
          <Path d="M36 66 Q50 58 64 66"
            stroke="#6A3808" strokeWidth="3.5" fill="none" strokeLinecap="round" />
          <Path d="M66 66 Q80 58 94 66"
            stroke="#6A3808" strokeWidth="3.5" fill="none" strokeLinecap="round" />
          {/* Amber glint peeking below lid */}
          <Path d="M38 66 Q50 62 62 66"
            stroke="#D09820" strokeWidth="2.2" fill="none" strokeLinecap="round" opacity="0.50" />
          <Path d="M68 66 Q80 62 92 66"
            stroke="#D09820" strokeWidth="2.2" fill="none" strokeLinecap="round" opacity="0.50" />
          {/* Eyelid overlay */}
          <Path d="M35 66 Q50 57 65 66"
            stroke="#C06015" strokeWidth="5.0" fill="none" strokeLinecap="round" opacity="0.65" />
          <Path d="M65 66 Q80 57 95 66"
            stroke="#C06015" strokeWidth="5.0" fill="none" strokeLinecap="round" opacity="0.65" />
        </G>
      )}

      {/* ── Nose ── */}
      {/* Heart shape: two bumps at top, point at bottom */}
      <Path d="M62 82 Q65 78 68 82 L67.5 87 Q65 89.5 62.5 87 Z" fill="#E87080" />
      <Path d="M63 83 Q65 80 67 83" fill="#F9A8B0" opacity="0.55" />
      {/* Philtrum */}
      <Line x1={65} y1={88} x2={65} y2={92} stroke="#C06850" strokeWidth="1.3" strokeLinecap="round" opacity="0.45" />

      {/* ── Mouth ── */}
      <Path d="M65 92 Q58 98 54 95" stroke="#8B4820" strokeWidth="1.9" fill="none" strokeLinecap="round" />
      <Path d="M65 92 Q72 98 76 95" stroke="#8B4820" strokeWidth="1.9" fill="none" strokeLinecap="round" />

      {/* ── Cheek blush ── */}
      <Ellipse cx={27} cy={78} rx={15} ry={10} fill="#FFB8C8" opacity="0.20" />
      <Ellipse cx={103} cy={78} rx={15} ry={10} fill="#FFB8C8" opacity="0.20" />

      {/* Chin lighter fur */}
      <Ellipse cx={65} cy={94} rx={20} ry={10} fill="#FFF0D8" opacity="0.30" />

      {/* ── Whiskers — long, natural, cat-like ── */}
      {/* 5 per side at varying angles, extending well past cheeks */}
      {/* Left */}
      <Line x1={7}  y1={73} x2={61} y2={79} stroke="rgba(255,255,255,0.88)" strokeWidth="1.05" strokeLinecap="round" />
      <Line x1={5}  y1={80} x2={61} y2={82} stroke="rgba(255,255,255,0.90)" strokeWidth="1.10" strokeLinecap="round" />
      <Line x1={7}  y1={87} x2={61} y2={84} stroke="rgba(255,255,255,0.85)" strokeWidth="1.00" strokeLinecap="round" />
      <Line x1={12} y1={94} x2={61} y2={87} stroke="rgba(255,255,255,0.72)" strokeWidth="0.95" strokeLinecap="round" />
      <Line x1={5}  y1={67} x2={57} y2={76} stroke="rgba(255,255,255,0.62)" strokeWidth="0.85" strokeLinecap="round" />
      {/* Right */}
      <Line x1={123} y1={73} x2={69} y2={79} stroke="rgba(255,255,255,0.88)" strokeWidth="1.05" strokeLinecap="round" />
      <Line x1={125} y1={80} x2={69} y2={82} stroke="rgba(255,255,255,0.90)" strokeWidth="1.10" strokeLinecap="round" />
      <Line x1={123} y1={87} x2={69} y2={84} stroke="rgba(255,255,255,0.85)" strokeWidth="1.00" strokeLinecap="round" />
      <Line x1={118} y1={94} x2={69} y2={87} stroke="rgba(255,255,255,0.72)" strokeWidth="0.95" strokeLinecap="round" />
      <Line x1={125} y1={67} x2={73} y2={76} stroke="rgba(255,255,255,0.62)" strokeWidth="0.85" strokeLinecap="round" />
    </Svg>
  );
}

/* ─── Cat scene ───────────────────────────────── */
function CatScene() {
  const [catState, setCatState]   = useState<CatState>('sleeping');
  const [petCount, setPetCount]   = useState(0);

  const bodyScale  = useRef(new RNAnimated.Value(1)).current;
  const tailAngle  = useRef(new RNAnimated.Value(0)).current;

  // 3 pooled floating hearts
  const hearts = useRef(
    Array.from({ length: 4 }, () => ({
      opacity: new RNAnimated.Value(0),
      y:       new RNAnimated.Value(0),
      x:       new RNAnimated.Value(0),
    }))
  ).current;
  const heartIdx = useRef(0);

  useEffect(() => {
    if (catState === 'purring') {
      RNAnimated.loop(RNAnimated.sequence([
        RNAnimated.timing(bodyScale, { toValue: 1.05, duration: 280, useNativeDriver: true }),
        RNAnimated.timing(bodyScale, { toValue: 0.96, duration: 280, useNativeDriver: true }),
      ])).start();
      RNAnimated.loop(RNAnimated.sequence([
        RNAnimated.timing(tailAngle, { toValue: 1,  duration: 400, useNativeDriver: true }),
        RNAnimated.timing(tailAngle, { toValue: -1, duration: 400, useNativeDriver: true }),
      ])).start();
    } else {
      bodyScale.stopAnimation();  bodyScale.setValue(1);
      tailAngle.stopAnimation();  tailAngle.setValue(0);
    }
    return () => { bodyScale.stopAnimation(); tailAngle.stopAnimation(); };
  }, [catState]);

  const floatHeart = () => {
    const h = hearts[heartIdx.current % hearts.length];
    heartIdx.current++;
    h.x.setValue((Math.random() - 0.5) * 70);
    h.y.setValue(0);
    h.opacity.setValue(1);
    RNAnimated.parallel([
      RNAnimated.timing(h.y,       { toValue: -90, duration: 1100, useNativeDriver: true }),
      RNAnimated.timing(h.opacity, { toValue: 0,   duration: 1100, useNativeDriver: true }),
    ]).start();
  };

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gs) =>
      Math.abs(gs.dx) > 8 && Math.abs(gs.dx) > Math.abs(gs.dy) * 1.2,
    onMoveShouldSetPanResponderCapture: (_, gs) =>
      Math.abs(gs.dx) > 12 && Math.abs(gs.dx) > Math.abs(gs.dy) * 1.5,
    onPanResponderGrant: () => {
      if (catState === 'sleeping') setCatState('alert');
    },
    onPanResponderMove: (_, gs) => {
      if (Math.abs(gs.dx) > 22 && Math.abs(gs.dy) < 55) {
        setCatState('purring');
        setPetCount(c => c + 1);
        floatHeart();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [catState]);

  const labelText =
    catState === 'sleeping' ? 'すやすや眠ってる…\nそっとなでてみよう' :
    catState === 'alert'    ? 'むにゃ…？' :
    'ゴロゴロゴロ〜♪';

  return (
    <View style={sc.scene}>
      {/* Cosy room backdrop */}
      <Text style={sc.catMoon}>🌙</Text>
      <Text style={sc.catStar1}>✨</Text>
      <Text style={sc.catStar2}>⭐</Text>

      {/* Cushion under cat */}
      <View style={sc.cushionWrap}>
        <Svg width={200} height={60} viewBox="0 0 200 60">
          <Defs>
            <SvgLinearGradient id="cushGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#8B4513" />
              <Stop offset="100%" stopColor="#5C2D0A" />
            </SvgLinearGradient>
          </Defs>
          <Ellipse cx={100} cy={30} rx={90} ry={26} fill="url(#cushGrad)" />
          <Ellipse cx={100} cy={26} rx={84} ry={18} fill="#A0522D" opacity="0.5" />
          <Ellipse cx={100} cy={22} rx={76} ry={12} fill="#CD853F" opacity="0.3" />
        </Svg>
      </View>

      {/* Cat — interactive area */}
      <View style={sc.catArea} {...panResponder.panHandlers}>
        <RNAnimated.View style={{ transform: [{ scale: bodyScale }] }}>
          <CatSvg state={catState} />
        </RNAnimated.View>

        {/* Floating hearts */}
        {hearts.map((h, i) => (
          <RNAnimated.Text
            key={i}
            style={[sc.floatHeart, {
              opacity: h.opacity,
              transform: [{ translateY: h.y }, { translateX: h.x }],
            }]}
          >💗</RNAnimated.Text>
        ))}

        {petCount > 0 && (
          <View style={sc.petBadge}>
            <Text style={sc.petBadgeText}>×{petCount}</Text>
          </View>
        )}
      </View>

      <Text style={[sc.sceneLabel, { color: '#FFBF90', bottom: 30, lineHeight: 22 }]}>
        {labelText}
      </Text>
    </View>
  );
}

/* ─── Campfire scene — 線香花火スタイル ────────── */
function CampfireScene() {
  const glowOpacity = useRef(new RNAnimated.Value(0.35)).current;
  const flames = useRef(
    Array.from({ length: 3 }, (_, i) => ({
      scaleY:  new RNAnimated.Value(0.9),
      sway:    new RNAnimated.Value(0),
      opacity: new RNAnimated.Value(0.55 + i * 0.08),
    }))
  ).current;

  useEffect(() => {
    // Gentle breathing glow
    RNAnimated.loop(RNAnimated.sequence([
      RNAnimated.timing(glowOpacity, { toValue: 0.55, duration: 2800, useNativeDriver: true }),
      RNAnimated.timing(glowOpacity, { toValue: 0.28, duration: 2600, useNativeDriver: true }),
    ])).start();

    // Very slow, gentle flame flicker
    flames.forEach(({ scaleY, sway, opacity }, i) => {
      RNAnimated.loop(RNAnimated.sequence([
        RNAnimated.timing(scaleY, { toValue: 0.72 + i * 0.08, duration: 1400 + i * 320, useNativeDriver: true }),
        RNAnimated.timing(scaleY, { toValue: 0.95 + i * 0.05, duration: 1200 + i * 260, useNativeDriver: true }),
      ])).start();
      RNAnimated.loop(RNAnimated.sequence([
        RNAnimated.timing(sway, { toValue: 1,  duration: 2000 + i * 500, useNativeDriver: true }),
        RNAnimated.timing(sway, { toValue: -1, duration: 1800 + i * 420, useNativeDriver: true }),
      ])).start();
      RNAnimated.loop(RNAnimated.sequence([
        RNAnimated.timing(opacity, { toValue: 0.40 + i * 0.06, duration: 1100 + i * 240, useNativeDriver: true }),
        RNAnimated.timing(opacity, { toValue: 0.75 + i * 0.08, duration: 900  + i * 180, useNativeDriver: true }),
      ])).start();
    });
  }, []);

  const flameColors = [
    { base: '#FF5C10', mid: '#FF9820', tip: '#FFE060' },
    { base: '#FF7020', mid: '#FFCC30', tip: '#FFF4A0' },
    { base: '#FF5010', mid: '#FF8418', tip: '#FFDA60' },
  ];
  const flameOffsets = [-11, 0, 11];

  return (
    <View style={sc.scene}>
      {/* Logs */}
      <View style={sc.logBase}>
        <View style={[sc.log, { transform: [{ rotate: '-22deg' }] }]} />
        <View style={[sc.log, { transform: [{ rotate: '22deg' }] }]} />
      </View>

      {/* Soft ember glow on logs */}
      <RNAnimated.View style={[sc.fireGlow, { opacity: glowOpacity }]} />

      {/* Small SVG flames */}
      {flames.map((f, i) => (
        <RNAnimated.View
          key={i}
          style={{
            position: 'absolute',
            bottom: SH * 0.115,
            left: SW / 2 - 14 + flameOffsets[i],
            opacity: f.opacity,
            transform: [
              { scaleY: f.scaleY },
              { translateX: f.sway.interpolate({ inputRange: [-1, 1], outputRange: [-2.5, 2.5] }) },
            ],
          }}
        >
          <Svg width={28} height={52} viewBox="0 0 28 52">
            <Defs>
              <SvgLinearGradient id={`fg${i}`} x1="50%" y1="100%" x2="50%" y2="0%">
                <Stop offset="0%"   stopColor={flameColors[i].base} />
                <Stop offset="45%"  stopColor={flameColors[i].mid} />
                <Stop offset="100%" stopColor={flameColors[i].tip} stopOpacity="0" />
              </SvgLinearGradient>
            </Defs>
            <Path
              d="M14 50 Q20 36 18 22 Q16 12 14 2 Q12 12 10 22 Q8 36 14 50 Z"
              fill={`url(#fg${i})`}
            />
            {/* Inner bright core */}
            <Path
              d="M14 48 Q17 38 16 28 Q15 20 14 12 Q13 20 12 28 Q11 38 14 48 Z"
              fill={flameColors[i].tip}
              opacity={0.5}
            />
          </Svg>
        </RNAnimated.View>
      ))}

      <GentleEmbers />
      <Text style={sc.sceneLabel}>しずかに燃えてる… ゆっくり休もう</Text>
    </View>
  );
}

/* 線香花火のような静かな火花 */
function GentleEmbers() {
  const embers = useRef(
    Array.from({ length: 6 }, () => ({
      x:       new RNAnimated.Value(SW / 2),
      y:       new RNAnimated.Value(SH * 0.52),
      opacity: new RNAnimated.Value(0),
    }))
  ).current;

  useEffect(() => {
    embers.forEach(({ x, y, opacity }, i) => {
      const rise = () => {
        const startX = SW / 2 + (Math.random() - 0.5) * 20;
        x.setValue(startX);
        y.setValue(SH * 0.525);
        opacity.setValue(0);
        const dur = 3500 + Math.random() * 2000;
        RNAnimated.parallel([
          RNAnimated.sequence([
            RNAnimated.timing(opacity, { toValue: 1.0, duration: 350,       useNativeDriver: true }),
            RNAnimated.timing(opacity, { toValue: 0,   duration: dur - 350, useNativeDriver: true }),
          ]),
          RNAnimated.timing(y, { toValue: SH * 0.35, duration: dur, useNativeDriver: true }),
          RNAnimated.timing(x, {
            toValue: startX + (Math.random() - 0.5) * 30,
            duration: dur,
            useNativeDriver: true,
          }),
        ]).start(() => setTimeout(rise, 1500 + Math.random() * 2500));
      };
      setTimeout(rise, i * 700 + Math.random() * 500);
    });
  }, []);

  return (
    <>
      {embers.map((e, i) => (
        <RNAnimated.View
          key={i}
          style={{
            position: 'absolute',
            width: 3, height: 3,
            borderRadius: 1.5,
            backgroundColor: i % 2 === 0 ? '#FFCC50' : '#FF9030',
            shadowColor: '#FFAA20',
            shadowRadius: 3,
            shadowOpacity: 0.9,
            opacity: e.opacity,
            transform: [{ translateX: e.x }, { translateY: e.y }],
          }}
        />
      ))}
    </>
  );
}

/* ─── Rain scene ──────────────────────────────── */
function RainScene() {
  const drops = useRef(
    Array.from({ length: 24 }, (_, i) => ({
      x:       (i / 24) * SW + (Math.random() * SW) / 24,
      y:       new RNAnimated.Value(-(Math.random() * SH * 0.5)),
      opacity: 0.3 + Math.random() * 0.5,
      speed:   900 + Math.random() * 700,
    }))
  ).current;

  useEffect(() => {
    drops.forEach(({ y, speed }) => {
      const fall = () => {
        y.setValue(-(30 + Math.random() * 100));
        RNAnimated.timing(y, { toValue: SH, duration: speed, useNativeDriver: true }).start(fall);
      };
      fall();
    });
  }, []);

  return (
    <View style={sc.scene}>
      {drops.map((d, i) => (
        <RNAnimated.View key={i} style={[sc.raindrop, { left: d.x, opacity: d.opacity, transform: [{ translateY: d.y }] }]} />
      ))}
      <Ripples />
      <Text style={[sc.sceneLabel, { color: '#8AB4CC' }]}>しとしと… 音に耳をすませて</Text>
    </View>
  );
}

function Ripples() {
  const ripples = useRef(
    Array.from({ length: 4 }, () => ({
      scale:   new RNAnimated.Value(0),
      opacity: new RNAnimated.Value(0),
      x:       40 + Math.random() * (SW - 80),
    }))
  ).current;

  useEffect(() => {
    ripples.forEach(({ scale, opacity }, i) => {
      const pulse = () => {
        scale.setValue(0); opacity.setValue(0.6);
        RNAnimated.parallel([
          RNAnimated.timing(scale,   { toValue: 1, duration: 1400, useNativeDriver: true }),
          RNAnimated.timing(opacity, { toValue: 0, duration: 1400, useNativeDriver: true }),
        ]).start(() => setTimeout(pulse, 400 + Math.random() * 1200));
      };
      setTimeout(pulse, i * 600);
    });
  }, []);

  return (
    <>
      {ripples.map((r, i) => (
        <RNAnimated.View key={i} style={[sc.ripple, {
          left: r.x - 20, bottom: SH * 0.18 + i * 18,
          opacity: r.opacity, transform: [{ scale: r.scale }],
        }]} />
      ))}
    </>
  );
}

/* ─── Stars scene ─────────────────────────────── */
function StarsScene() {
  const stars = useRef(
    Array.from({ length: 40 }, () => {
      const base = 0.1 + Math.random() * 0.5;
      return { x: Math.random() * SW, y: Math.random() * SH * 0.65, size: 2 + Math.random() * 4, base, opacity: new RNAnimated.Value(base) };
    })
  ).current;
  const shooters = useRef(
    Array.from({ length: 3 }, () => ({ x: new RNAnimated.Value(-60), y: Math.random() * SH * 0.4, opacity: new RNAnimated.Value(0) }))
  ).current;

  useEffect(() => {
    stars.forEach(({ opacity, base }) => {
      RNAnimated.loop(RNAnimated.sequence([
        RNAnimated.timing(opacity, { toValue: Math.min(1, base + 0.4), duration: 800 + Math.random() * 1200, useNativeDriver: true }),
        RNAnimated.timing(opacity, { toValue: Math.max(0.05, base - 0.2), duration: 800 + Math.random() * 1200, useNativeDriver: true }),
      ])).start();
    });
    shooters.forEach(({ x, opacity }, i) => {
      const shoot = () => {
        x.setValue(-80); opacity.setValue(0);
        RNAnimated.sequence([
          RNAnimated.delay(3000 + Math.random() * 4000),
          RNAnimated.parallel([
            RNAnimated.timing(x,       { toValue: SW + 80, duration: 800, useNativeDriver: true }),
            RNAnimated.sequence([
              RNAnimated.timing(opacity, { toValue: 1, duration: 100, useNativeDriver: true }),
              RNAnimated.timing(opacity, { toValue: 0, duration: 700, useNativeDriver: true }),
            ]),
          ]),
        ]).start(() => shoot());
      };
      setTimeout(shoot, i * 2000);
    });
  }, []);

  return (
    <View style={sc.scene}>
      {stars.map((s, i) => (
        <RNAnimated.View key={i} style={[sc.star, { left: s.x, top: s.y, width: s.size, height: s.size, borderRadius: s.size / 2, opacity: s.opacity }]} />
      ))}
      {shooters.map((s, i) => (
        <RNAnimated.View key={`sh${i}`} style={[sc.shootingStar, { top: s.y, opacity: s.opacity, transform: [{ translateX: s.x }] }]} />
      ))}
      <Text style={sc.moon}>🌙</Text>
      <Text style={[sc.sceneLabel, { color: '#A0B4FF' }]}>広い宇宙の中でひと休み</Text>
    </View>
  );
}

/* ─── Main Modal ──────────────────────────────── */
interface Props {
  visible: boolean;
  level: number;
  mascotName: string;
  onClose: () => void;
}

export function RestEventModal({ visible, level, mascotName, onClose }: Props) {
  const colors      = useColors();
  const mascotStage = getMascotStage(level);
  const { play, stop } = useSceneAudio();

  const [phase,    setPhase]    = useState<Phase>('choose');
  const [scene,    setScene]    = useState<Scene>('campfire');
  const [timeLeft, setTimeLeft] = useState(SCENE_DURATION / 1000);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (visible) {
      setPhase('choose');
      setTimeLeft(SCENE_DURATION / 1000);
      Analytics.restEventShown();
    } else {
      stop();
    }
    return () => { clearInterval(timerRef.current!); };
  }, [visible]);

  const startScene = (s: Scene) => {
    setScene(s);
    setPhase('playing');
    Analytics.restEventScene(s);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTimeLeft(SCENE_DURATION / 1000);
    play(s);
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timerRef.current!); setPhase('outro'); return 0; }
        return t - 1;
      });
    }, 1000);
  };

  const handleClose = () => { stop(); clearInterval(timerRef.current!); onClose(); };

  const cfg = SCENES.find(s => s.key === scene)!;

  const SceneView = () => {
    if (scene === 'campfire') return <CampfireScene />;
    if (scene === 'rain')     return <RainScene />;
    if (scene === 'stars')    return <StarsScene />;
    return <CatScene />;
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={m.overlay}>

        {/* Choose phase */}
        {phase === 'choose' && (
          <View style={[m.sheet, { backgroundColor: colors.card }]}>
            <LinearGradient colors={['#1A0A3C', '#0D0820']} style={m.chooseHeader}>
              <Mascot stage={mascotStage} mood="sleepy" size={72} />
              <Text style={m.chooseTitle}>今日は一緒に休もう。</Text>
              <Text style={m.chooseSub}>どれがいい？</Text>
            </LinearGradient>
            <View style={m.sceneList}>
              {SCENES.map(s => (
                <TouchableOpacity key={s.key} style={m.sceneBtn} onPress={() => startScene(s.key)} activeOpacity={0.82}>
                  <LinearGradient colors={s.bg} style={m.sceneBtnInner}>
                    <Text style={m.sceneBtnEmoji}>{s.emoji}</Text>
                    <Text style={m.sceneBtnLabel}>{s.label}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={m.skipBtn} onPress={handleClose}>
              <Text style={[m.skipText, { color: colors.mutedForeground }]}>今は大丈夫</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Playing phase */}
        {phase === 'playing' && (
          <LinearGradient colors={cfg.bg} style={m.fullScreen}>
            <SceneView />
            <View style={m.timerPill}>
              <Text style={m.timerText}>{timeLeft}s</Text>
            </View>
          </LinearGradient>
        )}

        {/* Outro phase */}
        {phase === 'outro' && (
          <LinearGradient colors={cfg.bg} style={m.fullScreen}>
            <SceneView />
            <View style={m.outroCard}>
              <Mascot stage={mascotStage} mood="happy" size={64} />
              <Text style={m.outroQuestion}>少し楽になった？</Text>
              <View style={m.outroRow}>
                <TouchableOpacity
                  style={[m.outroBtn, { backgroundColor: '#7C3AED' }]}
                  onPress={() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); Analytics.restEventCompleted(true); handleClose(); }}
                >
                  <Text style={m.outroBtnText}>うん 😊</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[m.outroBtn, { backgroundColor: '#374151' }]}
                  onPress={() => { Analytics.restEventCompleted(false); stop(); clearInterval(timerRef.current!); setPhase('choose'); }}
                >
                  <Text style={m.outroBtnText}>まだかな…</Text>
                </TouchableOpacity>
              </View>
            </View>
          </LinearGradient>
        )}

      </View>
    </Modal>
  );
}

/* ─── Styles ──────────────────────────────────── */
const sc = StyleSheet.create({
  scene:        { flex: 1, position: 'relative', overflow: 'hidden' },
  flameEmoji:   { position: 'absolute' },
  logBase:      { position: 'absolute', bottom: 38, left: SW / 2 - 36, width: 72, height: 20, flexDirection: 'row', justifyContent: 'center', gap: 4 },
  log:          { width: 56, height: 10, backgroundColor: '#4A2000', borderRadius: 5, position: 'absolute' },
  raindrop:     { position: 'absolute', width: 1.5, height: 18, backgroundColor: '#7FBFFF', borderRadius: 1 },
  ripple:       { position: 'absolute', width: 40, height: 14, borderRadius: 20, borderWidth: 1, borderColor: '#7FBFFF' },
  star:         { position: 'absolute', backgroundColor: '#FFFFFF' },
  shootingStar: { position: 'absolute', width: 60, height: 1.5, backgroundColor: '#FFFFFF', borderRadius: 1 },
  moon:         { position: 'absolute', top: SH * 0.07, right: 36, fontSize: 38 },
  sceneLabel:   { position: 'absolute', bottom: 36, alignSelf: 'center', color: '#FF9966', fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center', opacity: 0.85 },

  // Campfire glow
  fireGlow: {
    position: 'absolute',
    bottom: SH * 0.085,
    alignSelf: 'center',
    width: 110,
    height: 44,
    borderRadius: 55,
    backgroundColor: '#FF6010',
  },

  // Cat scene
  catMoon:     { position: 'absolute', top: SH * 0.06, left: 28,  fontSize: 36 },
  catStar1:    { position: 'absolute', top: SH * 0.08, right: 44, fontSize: 20 },
  catStar2:    { position: 'absolute', top: SH * 0.14, right: 76, fontSize: 14, opacity: 0.6 },
  cushionWrap: { position: 'absolute', bottom: SH * 0.15, alignSelf: 'center' },
  catArea:     {
    position: 'absolute',
    top: SH * 0.14,
    alignSelf: 'center',
    alignItems: 'center',
    width: 240, height: 260,
  },
  floatHeart:  { position: 'absolute', top: 20, fontSize: 26 },
  petBadge:    {
    position: 'absolute', top: -6, right: -6,
    backgroundColor: 'rgba(220,80,80,0.88)',
    borderRadius: 12, paddingHorizontal: 7, paddingVertical: 2,
  },
  petBadgeText: { color: '#FFF', fontSize: 12, fontFamily: 'Inter_700Bold' },
});

const m = StyleSheet.create({
  overlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.82)', justifyContent: 'flex-end' },
  fullScreen: { flex: 1, position: 'relative' },

  sheet:        { borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden' },
  chooseHeader: { alignItems: 'center', paddingVertical: 28, paddingHorizontal: 20, gap: 8 },
  chooseTitle:  { fontSize: 22, fontFamily: 'Inter_700Bold', color: '#FFF', textAlign: 'center' },
  chooseSub:    { fontSize: 14, color: 'rgba(255,255,255,0.6)', fontFamily: 'Inter_400Regular' },

  sceneList:     { padding: 16, gap: 10 },
  sceneBtn:      { borderRadius: 18, overflow: 'hidden' },
  sceneBtnInner: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  sceneBtnEmoji: { fontSize: 28 },
  sceneBtnLabel: { fontSize: 16, fontFamily: 'Inter_600SemiBold', color: '#FFF' },

  skipBtn:  { alignItems: 'center', paddingVertical: 18 },
  skipText: { fontSize: 13, fontFamily: 'Inter_400Regular' },

  timerPill: { position: 'absolute', top: 56, right: 20, backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  timerText: { color: '#FFF', fontSize: 14, fontFamily: 'Inter_600SemiBold' },

  outroCard:     { position: 'absolute', bottom: 48, left: 24, right: 24, backgroundColor: 'rgba(10,5,30,0.87)', borderRadius: 24, padding: 24, alignItems: 'center', gap: 14 },
  outroQuestion: { fontSize: 20, fontFamily: 'Inter_700Bold', color: '#FFF', textAlign: 'center' },
  outroRow:      { flexDirection: 'row', gap: 12, width: '100%' },
  outroBtn:      { flex: 1, paddingVertical: 14, borderRadius: 16, alignItems: 'center' },
  outroBtnText:  { fontSize: 15, fontFamily: 'Inter_700Bold', color: '#FFF' },
});
