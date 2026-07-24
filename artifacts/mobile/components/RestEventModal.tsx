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
    <Svg width={190} height={200} viewBox="0 0 100 106">
      <Defs>
        <SvgRadialGradient id="hGrad" cx="42%" cy="35%" r="65%">
          <Stop offset="0%"   stopColor="#FBBE6A" />
          <Stop offset="100%" stopColor="#D4751A" />
        </SvgRadialGradient>
        <SvgRadialGradient id="bGrad" cx="42%" cy="30%" r="65%">
          <Stop offset="0%"   stopColor="#F5AD4C" />
          <Stop offset="100%" stopColor="#C96515" />
        </SvgRadialGradient>
        <SvgRadialGradient id="bellyGrad" cx="50%" cy="30%" r="65%">
          <Stop offset="0%"   stopColor="#FFF0D8" />
          <Stop offset="100%" stopColor="#F8D49A" />
        </SvgRadialGradient>
        <SvgRadialGradient id="eyeL" cx="38%" cy="35%" r="62%">
          <Stop offset="0%"   stopColor="#ECC040" />
          <Stop offset="60%"  stopColor="#D49820" />
          <Stop offset="100%" stopColor="#A87010" />
        </SvgRadialGradient>
        <SvgRadialGradient id="eyeR" cx="38%" cy="35%" r="62%">
          <Stop offset="0%"   stopColor="#ECC040" />
          <Stop offset="60%"  stopColor="#D49820" />
          <Stop offset="100%" stopColor="#A87010" />
        </SvgRadialGradient>
      </Defs>

      {/* Ground shadow */}
      <Ellipse cx={50} cy={103} rx={26} ry={4} fill="#00000025" />

      {/* Tail — looping around right side */}
      <Path d="M72 88 Q96 82 94 98 Q90 110 70 104"
        stroke="#C06015" strokeWidth="10" fill="none" strokeLinecap="round" />
      <Path d="M72 88 Q96 82 94 98 Q90 110 70 104"
        stroke="#E5982A" strokeWidth="6"  fill="none" strokeLinecap="round" />
      {/* tail tip lighter */}
      <Path d="M84 101 Q89 108 72 104"
        stroke="#F5B84A" strokeWidth="4"  fill="none" strokeLinecap="round" />

      {/* Body */}
      <Ellipse cx={50} cy={88} rx={26} ry={20} fill="url(#bGrad)" />
      {/* Belly */}
      <Ellipse cx={50} cy={93} rx={16} ry={13} fill="url(#bellyGrad)" />

      {/* Front paws */}
      <Ellipse cx={37} cy={100} rx={11} ry={7} fill="#D4751A" />
      <Ellipse cx={63} cy={100} rx={11} ry={7} fill="#D4751A" />
      <Ellipse cx={37} cy={99}  rx={7.5} ry={4.5} fill="#F5AD4C" opacity="0.55" />
      <Ellipse cx={63} cy={99}  rx={7.5} ry={4.5} fill="#F5AD4C" opacity="0.55" />
      {/* Toe splits — subtle */}
      <Line x1={33} y1={98} x2={33} y2={104} stroke="#B05510" strokeWidth="1" strokeLinecap="round" opacity="0.4" />
      <Line x1={37} y1={98} x2={37} y2={105} stroke="#B05510" strokeWidth="1" strokeLinecap="round" opacity="0.4" />
      <Line x1={41} y1={98} x2={41} y2={104} stroke="#B05510" strokeWidth="1" strokeLinecap="round" opacity="0.4" />
      <Line x1={59} y1={98} x2={59} y2={104} stroke="#B05510" strokeWidth="1" strokeLinecap="round" opacity="0.4" />
      <Line x1={63} y1={98} x2={63} y2={105} stroke="#B05510" strokeWidth="1" strokeLinecap="round" opacity="0.4" />
      <Line x1={67} y1={98} x2={67} y2={104} stroke="#B05510" strokeWidth="1" strokeLinecap="round" opacity="0.4" />

      {/* Neck bridge */}
      <Ellipse cx={50} cy={72} rx={16} ry={8} fill="#D4751A" />

      {/* ── Head ── big & round */}
      <Circle cx={50} cy={44} r={30} fill="url(#hGrad)" />

      {/* Ears — left */}
      <Path d="M20 36 L26 12 L42 28 Z" fill="#C06015" />
      <Path d="M22 34 L27 15 L40 27 Z" fill="#F4A0A8" />
      {/* Ears — right */}
      <Path d="M80 36 L74 12 L58 28 Z" fill="#C06015" />
      <Path d="M78 34 L73 15 L60 27 Z" fill="#F4A0A8" />

      {/* Forehead tabby marks */}
      <Path d="M43 20 Q50 15 57 20" stroke="#B86010" strokeWidth="2.2" fill="none" strokeLinecap="round" opacity="0.40" />
      <Path d="M41 27 Q50 22 59 27" stroke="#B86010" strokeWidth="2.0" fill="none" strokeLinecap="round" opacity="0.33" />
      <Path d="M45 34 Q50 31 55 34" stroke="#B86010" strokeWidth="1.6" fill="none" strokeLinecap="round" opacity="0.28" />

      {/* ── Eyes ── */}
      {state === 'sleeping' && (
        <G>
          {/* Cute closed eyes — upward arc = ∩ shape */}
          <Path d="M30 46 Q38 39 46 46"
            stroke="#6B3A10" strokeWidth="2.8" fill="none" strokeLinecap="round" />
          <Path d="M54 46 Q62 39 70 46"
            stroke="#6B3A10" strokeWidth="2.8" fill="none" strokeLinecap="round" />
          {/* Tiny lashes */}
          <Line x1={30} y1={46} x2={28} y2={42} stroke="#6B3A10" strokeWidth="1.5" strokeLinecap="round" />
          <Line x1={38} y1={40} x2={38} y2={37} stroke="#6B3A10" strokeWidth="1.4" strokeLinecap="round" />
          <Line x1={46} y1={46} x2={48} y2={42} stroke="#6B3A10" strokeWidth="1.5" strokeLinecap="round" />
          <Line x1={54} y1={46} x2={52} y2={42} stroke="#6B3A10" strokeWidth="1.5" strokeLinecap="round" />
          <Line x1={62} y1={40} x2={62} y2={37} stroke="#6B3A10" strokeWidth="1.4" strokeLinecap="round" />
          <Line x1={70} y1={46} x2={72} y2={42} stroke="#6B3A10" strokeWidth="1.5" strokeLinecap="round" />
          {/* Tiny zzz above head */}
          <Path d="M68 24 L73 24 L68 19 L74 19" stroke="#FFFFFF" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.55" />
        </G>
      )}
      {state === 'alert' && (
        <G>
          {/* Wide open round eyes — cute, big pupils not slits */}
          {/* Left eye */}
          <Circle cx={38} cy={45} r={9.5} fill="white" />
          <Circle cx={38} cy={45} r={8.5} fill="url(#eyeL)" />
          <Circle cx={38} cy={45} r={5.8} fill="#1C0C00" />
          <Circle cx={35} cy={42} r={2.2} fill="white" opacity="0.85" />
          <Circle cx={40} cy={47} r={1.0} fill="white" opacity="0.45" />
          {/* Right eye */}
          <Circle cx={62} cy={45} r={9.5} fill="white" />
          <Circle cx={62} cy={45} r={8.5} fill="url(#eyeR)" />
          <Circle cx={62} cy={45} r={5.8} fill="#1C0C00" />
          <Circle cx={59} cy={42} r={2.2} fill="white" opacity="0.85" />
          <Circle cx={64} cy={47} r={1.0} fill="white" opacity="0.45" />
        </G>
      )}
      {state === 'purring' && (
        <G>
          {/* Happy squinting — curved arcs with a small amber gleam underneath */}
          <Path d="M29 47 Q38 41 47 47"
            stroke="#6B3A10" strokeWidth="2.8" fill="none" strokeLinecap="round" />
          <Path d="M53 47 Q62 41 71 47"
            stroke="#6B3A10" strokeWidth="2.8" fill="none" strokeLinecap="round" />
          {/* Small amber gleam showing a sliver of iris */}
          <Path d="M30 47 Q38 43 46 47"
            stroke="#D49820" strokeWidth="2.0" fill="none" strokeLinecap="round" opacity="0.45" />
          <Path d="M54 47 Q62 43 70 47"
            stroke="#D49820" strokeWidth="2.0" fill="none" strokeLinecap="round" opacity="0.45" />
          {/* Upper eyelid curve */}
          <Path d="M29 47 Q38 40 47 47"
            stroke="#C06015" strokeWidth="4.0" fill="none" strokeLinecap="round" opacity="0.75" />
          <Path d="M53 47 Q62 40 71 47"
            stroke="#C06015" strokeWidth="4.0" fill="none" strokeLinecap="round" opacity="0.75" />
        </G>
      )}

      {/* Nose — small heart-like pink triangle */}
      <Path d="M47 57 L53 57 L50 61.5 Z" fill="#FF8099" />
      <Ellipse cx={49} cy={58} rx={1.5} ry={1} fill="white" opacity="0.35" />

      {/* Mouth */}
      <Path d="M50 61.5 Q45 66.5 42 64" stroke="#7A4018" strokeWidth="1.7" fill="none" strokeLinecap="round" />
      <Path d="M50 61.5 Q55 66.5 58 64" stroke="#7A4018" strokeWidth="1.7" fill="none" strokeLinecap="round" />

      {/* Cheek blush */}
      <Ellipse cx={28} cy={58} rx={8}   ry={5} fill="#FFB0C0" opacity="0.28" />
      <Ellipse cx={72} cy={58} rx={8}   ry={5} fill="#FFB0C0" opacity="0.28" />

      {/* Whiskers — short, tasteful */}
      {/* Left */}
      <Line x1={28} y1={56} x2={46} y2={58} stroke="rgba(255,255,255,0.75)" strokeWidth="1.1" strokeLinecap="round" />
      <Line x1={26} y1={60} x2={46} y2={60} stroke="rgba(255,255,255,0.75)" strokeWidth="1.1" strokeLinecap="round" />
      <Line x1={28} y1={64} x2={46} y2={62} stroke="rgba(255,255,255,0.75)" strokeWidth="1.1" strokeLinecap="round" />
      {/* Right */}
      <Line x1={54} y1={58} x2={72} y2={56} stroke="rgba(255,255,255,0.75)" strokeWidth="1.1" strokeLinecap="round" />
      <Line x1={54} y1={60} x2={74} y2={60} stroke="rgba(255,255,255,0.75)" strokeWidth="1.1" strokeLinecap="round" />
      <Line x1={54} y1={62} x2={72} y2={64} stroke="rgba(255,255,255,0.75)" strokeWidth="1.1" strokeLinecap="round" />
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

/* ─── Campfire scene ──────────────────────────── */
function CampfireScene() {
  const flames = useRef(
    Array.from({ length: 5 }, () => ({
      scale:   new RNAnimated.Value(1),
      opacity: new RNAnimated.Value(0.8 + Math.random() * 0.2),
    }))
  ).current;

  useEffect(() => {
    flames.forEach(({ scale, opacity }, i) => {
      const flicker = (v: RNAnimated.Value, min: number, max: number, dur: number) =>
        RNAnimated.loop(RNAnimated.sequence([
          RNAnimated.timing(v, { toValue: max, duration: dur + i * 40, useNativeDriver: true }),
          RNAnimated.timing(v, { toValue: min, duration: dur + i * 60, useNativeDriver: true }),
        ])).start();
      flicker(scale,   0.85, 1.18, 300 + i * 80);
      flicker(opacity, 0.5,  1.0,  250 + i * 60);
    });
  }, []);

  return (
    <View style={sc.scene}>
      <View style={sc.logBase}>
        <View style={[sc.log, { transform: [{ rotate: '-25deg' }] }]} />
        <View style={[sc.log, { transform: [{ rotate: '25deg' }] }]} />
      </View>
      {flames.map((f, i) => (
        <RNAnimated.Text key={i} style={[sc.flameEmoji, {
          fontSize: 36 + i * 8, bottom: 48 + i * 18,
          left: SW / 2 - 30 + (i - 2) * 14,
          transform: [{ scale: f.scale }], opacity: f.opacity,
        }]}>🔥</RNAnimated.Text>
      ))}
      <EmberParticles />
      <Text style={sc.sceneLabel}>ぱちぱち… ゆっくり休もう</Text>
    </View>
  );
}

function EmberParticles() {
  const embers = useRef(
    Array.from({ length: 8 }, () => ({
      x: new RNAnimated.Value(SW / 2 + (Math.random() - 0.5) * 60),
      y: new RNAnimated.Value(SH * 0.52),
      opacity: new RNAnimated.Value(0),
    }))
  ).current;

  useEffect(() => {
    embers.forEach(({ x, y, opacity }, i) => {
      const rise = () => {
        x.setValue(SW / 2 + (Math.random() - 0.5) * 60);
        y.setValue(SH * 0.52);
        opacity.setValue(0.9);
        RNAnimated.parallel([
          RNAnimated.timing(y,       { toValue: SH * 0.28, duration: 2000 + Math.random() * 1500, useNativeDriver: true }),
          RNAnimated.timing(x,       { toValue: SW / 2 + (Math.random() - 0.5) * 100, duration: 2500, useNativeDriver: true }),
          RNAnimated.sequence([
            RNAnimated.timing(opacity, { toValue: 1, duration: 200,  useNativeDriver: true }),
            RNAnimated.timing(opacity, { toValue: 0, duration: 1800, useNativeDriver: true }),
          ]),
        ]).start(() => setTimeout(rise, Math.random() * 1000));
      };
      setTimeout(rise, i * 300);
    });
  }, []);

  return (
    <>
      {embers.map((e, i) => (
        <RNAnimated.Text key={i} style={{
          position: 'absolute', fontSize: 8, opacity: e.opacity,
          transform: [{ translateX: e.x }, { translateY: e.y }],
        }}>✦</RNAnimated.Text>
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

  // Cat scene
  catMoon:     { position: 'absolute', top: SH * 0.06, left: 28,  fontSize: 36 },
  catStar1:    { position: 'absolute', top: SH * 0.08, right: 44, fontSize: 20 },
  catStar2:    { position: 'absolute', top: SH * 0.14, right: 76, fontSize: 14, opacity: 0.6 },
  cushionWrap: { position: 'absolute', bottom: SH * 0.16, alignSelf: 'center' },
  catArea:     {
    position: 'absolute',
    top: SH * 0.18,
    alignSelf: 'center',
    alignItems: 'center',
    width: 220, height: 220,
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
