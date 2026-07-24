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
        { isLooping: true, volume: 0.78 },
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
    <Svg width={180} height={200} viewBox="0 0 120 134">
      <Defs>
        <SvgRadialGradient id="cBodyGrad" cx="38%" cy="32%" r="68%">
          <Stop offset="0%" stopColor="#F5A84A" />
          <Stop offset="100%" stopColor="#C86818" />
        </SvgRadialGradient>
        <SvgRadialGradient id="cHeadGrad" cx="36%" cy="28%" r="68%">
          <Stop offset="0%" stopColor="#F7AE55" />
          <Stop offset="100%" stopColor="#C86818" />
        </SvgRadialGradient>
        <SvgRadialGradient id="cBellyGrad" cx="50%" cy="25%" r="70%">
          <Stop offset="0%" stopColor="#FEE8C0" />
          <Stop offset="100%" stopColor="#F6CB82" />
        </SvgRadialGradient>
      </Defs>

      {/* Shadow */}
      <Ellipse cx={60} cy={130} rx={34} ry={5} fill="#00000030" />

      {/* Tail — curling around to the right */}
      <Path d="M 88 98 Q 116 88 114 110 Q 110 128 82 120"
        stroke="#C06018" strokeWidth="13" fill="none" strokeLinecap="round" />
      <Path d="M 88 98 Q 116 88 114 110 Q 110 128 82 120"
        stroke="#E58830" strokeWidth="8" fill="none" strokeLinecap="round" />
      <Path d="M 88 98 Q 116 88 114 110 Q 110 128 82 120"
        stroke="#F5A84A55" strokeWidth="3" fill="none" strokeLinecap="round" />

      {/* Body */}
      <Ellipse cx={60} cy={100} rx={40} ry={32} fill="url(#cBodyGrad)" />

      {/* Belly patch */}
      <Ellipse cx={60} cy={108} rx={22} ry={18} fill="url(#cBellyGrad)" />

      {/* Body tabby stripes */}
      <Path d="M 27 88 Q 25 100 27 113" stroke="#B05810" strokeWidth="3.5" fill="none" strokeLinecap="round" opacity="0.45" />
      <Path d="M 34 84 Q 32 96 34 109" stroke="#B05810" strokeWidth="3"   fill="none" strokeLinecap="round" opacity="0.38" />
      <Path d="M 93 88 Q 95 100 93 113" stroke="#B05810" strokeWidth="3.5" fill="none" strokeLinecap="round" opacity="0.45" />
      <Path d="M 86 84 Q 88 96 86 109" stroke="#B05810" strokeWidth="3"   fill="none" strokeLinecap="round" opacity="0.38" />

      {/* Front paws */}
      <Ellipse cx={42} cy={126} rx={13} ry={7}  fill="#C86818" />
      <Ellipse cx={78} cy={126} rx={13} ry={7}  fill="#C86818" />
      <Ellipse cx={42} cy={125} rx={9}  ry={4.5} fill="#F5A84A" opacity="0.55" />
      <Ellipse cx={78} cy={125} rx={9}  ry={4.5} fill="#F5A84A" opacity="0.55" />
      {/* Toe lines */}
      <Line x1={38} y1={124} x2={38} y2={130} stroke="#B05818" strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />
      <Line x1={42} y1={124} x2={42} y2={131} stroke="#B05818" strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />
      <Line x1={46} y1={124} x2={46} y2={130} stroke="#B05818" strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />
      <Line x1={74} y1={124} x2={74} y2={130} stroke="#B05818" strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />
      <Line x1={78} y1={124} x2={78} y2={131} stroke="#B05818" strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />
      <Line x1={82} y1={124} x2={82} y2={130} stroke="#B05818" strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />

      {/* Neck / shoulder fill */}
      <Ellipse cx={60} cy={74} rx={21} ry={10} fill="#D97A22" />

      {/* ── Head ── */}
      <Circle cx={60} cy={50} r={33} fill="url(#cHeadGrad)" />

      {/* Ear left outer */}
      <Path d="M 27 40 L 22 10 L 48 30 Z" fill="#C06018" />
      {/* Ear left inner */}
      <Path d="M 29 38 L 25 14 L 46 30 Z" fill="#F4A0A8" />

      {/* Ear right outer */}
      <Path d="M 93 40 L 98 10 L 72 30 Z" fill="#C06018" />
      {/* Ear right inner */}
      <Path d="M 91 38 L 95 14 L 74 30 Z" fill="#F4A0A8" />

      {/* Forehead tabby stripes */}
      <Path d="M 51 23 Q 60 18 69 23" stroke="#B05810" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.45" />
      <Path d="M 49 30 Q 60 25 71 30" stroke="#B05810" strokeWidth="2.2" fill="none" strokeLinecap="round" opacity="0.38" />
      <Path d="M 55 38 Q 60 35 65 38" stroke="#B05810" strokeWidth="2"   fill="none" strokeLinecap="round" opacity="0.30" />

      {/* ── Eyes ── */}
      {state === 'sleeping' && (
        <G>
          {/* Closed crescent lines */}
          <Path d="M 38 52 Q 46 45 54 52"
            stroke="#5A3010" strokeWidth="3" fill="none" strokeLinecap="round" />
          <Path d="M 66 52 Q 74 45 82 52"
            stroke="#5A3010" strokeWidth="3" fill="none" strokeLinecap="round" />
          {/* Tiny eyelashes */}
          <Line x1={39} y1={52} x2={36} y2={48} stroke="#5A3010" strokeWidth="1.6" strokeLinecap="round" />
          <Line x1={46} y1={47} x2={46} y2={43} stroke="#5A3010" strokeWidth="1.4" strokeLinecap="round" />
          <Line x1={53} y1={52} x2={56} y2={48} stroke="#5A3010" strokeWidth="1.6" strokeLinecap="round" />
          <Line x1={67} y1={52} x2={64} y2={48} stroke="#5A3010" strokeWidth="1.6" strokeLinecap="round" />
          <Line x1={74} y1={47} x2={74} y2={43} stroke="#5A3010" strokeWidth="1.4" strokeLinecap="round" />
          <Line x1={81} y1={52} x2={84} y2={48} stroke="#5A3010" strokeWidth="1.6" strokeLinecap="round" />
        </G>
      )}
      {state === 'alert' && (
        <G>
          {/* Wide open — amber iris + vertical slit pupil */}
          <Circle cx={46} cy={51} r={11} fill="#E8B830" />
          <Circle cx={74} cy={51} r={11} fill="#E8B830" />
          {/* Iris detail ring */}
          <Circle cx={46} cy={51} r={11} fill="none" stroke="#C89020" strokeWidth="1.5" opacity="0.6" />
          <Circle cx={74} cy={51} r={11} fill="none" stroke="#C89020" strokeWidth="1.5" opacity="0.6" />
          {/* Slit pupils */}
          <Ellipse cx={46} cy={51} rx={3.5} ry={9}   fill="#1A0800" />
          <Ellipse cx={74} cy={51} rx={3.5} ry={9}   fill="#1A0800" />
          {/* Catchlight */}
          <Circle cx={43} cy={47} r={2.2} fill="white" opacity="0.75" />
          <Circle cx={71} cy={47} r={2.2} fill="white" opacity="0.75" />
        </G>
      )}
      {state === 'purring' && (
        <G>
          {/* Half-closed happy squint — amber iris, narrow oval pupil */}
          <Circle cx={46} cy={53} r={10} fill="#E8B830" />
          <Circle cx={74} cy={53} r={10} fill="#E8B830" />
          <Circle cx={46} cy={53} r={10} fill="none" stroke="#C89020" strokeWidth="1.5" opacity="0.6" />
          <Circle cx={74} cy={53} r={10} fill="none" stroke="#C89020" strokeWidth="1.5" opacity="0.6" />
          <Ellipse cx={46} cy={53} rx={2.8} ry={7} fill="#1A0800" />
          <Ellipse cx={74} cy={53} rx={2.8} ry={7} fill="#1A0800" />
          <Circle cx={43} cy={49} r={2}   fill="white" opacity="0.7" />
          <Circle cx={71} cy={49} r={2}   fill="white" opacity="0.7" />
          {/* Upper eyelid drooping */}
          <Path d="M 34 47 Q 46 42 58 47"
            stroke="#C06018" strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.9" />
          <Path d="M 62 47 Q 74 42 86 47"
            stroke="#C06018" strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.9" />
        </G>
      )}

      {/* Nose */}
      <Path d="M 57 62 L 63 62 L 60 67 Z" fill="#FF7A90" />
      {/* Nose highlight */}
      <Ellipse cx={58.5} cy={63.5} rx={1.8} ry={1.2} fill="white" opacity="0.4" />

      {/* Mouth */}
      <Path d="M 60 67 Q 55 73 51 70" stroke="#5A3010" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <Path d="M 60 67 Q 65 73 69 70" stroke="#5A3010" strokeWidth="1.8" fill="none" strokeLinecap="round" />

      {/* Cheek blush */}
      <Ellipse cx={32} cy={62} rx={9} ry={5.5} fill="#FFB0B8" opacity="0.30" />
      <Ellipse cx={88} cy={62} rx={9} ry={5.5} fill="#FFB0B8" opacity="0.30" />

      {/* Whiskers — left */}
      <Line x1={14} y1={59} x2={53} y2={63} stroke="#FFFFFFBB" strokeWidth="1.2" />
      <Line x1={14} y1={65} x2={53} y2={65} stroke="#FFFFFFBB" strokeWidth="1.2" />
      <Line x1={14} y1={71} x2={53} y2={67} stroke="#FFFFFFBB" strokeWidth="1.2" />
      {/* Whiskers — right */}
      <Line x1={67} y1={63} x2={106} y2={59} stroke="#FFFFFFBB" strokeWidth="1.2" />
      <Line x1={67} y1={65} x2={106} y2={65} stroke="#FFFFFFBB" strokeWidth="1.2" />
      <Line x1={67} y1={67} x2={106} y2={71} stroke="#FFFFFFBB" strokeWidth="1.2" />
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
