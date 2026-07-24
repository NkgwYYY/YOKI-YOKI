import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  Dimensions, Animated as RNAnimated, PanResponder,
} from 'react-native';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors } from '@/hooks/useColors';
import { Mascot } from '@/components/Mascot';
import { getMascotStage } from '@/utils/mascotUtils';
import { Analytics } from '@/utils/analytics';

const { width: SW, height: SH } = Dimensions.get('window');
const SCENE_DURATION = 10_000; // 10 seconds

type Scene = 'campfire' | 'rain' | 'stars' | 'cat';
type Phase = 'choose' | 'playing' | 'outro';

const SCENES: { key: Scene; emoji: string; label: string; bg: readonly [string, string] }[] = [
  { key: 'campfire', emoji: '🔥', label: '焚き火を見る',   bg: ['#1A0A00', '#3D1A00'] },
  { key: 'rain',     emoji: '🌧️', label: '雨の音を聞く',  bg: ['#0A1020', '#162040'] },
  { key: 'stars',    emoji: '🌌', label: '星空を見る',    bg: ['#050510', '#0A0A30'] },
  { key: 'cat',      emoji: '🐱', label: '猫を撫でる',    bg: ['#1A0E00', '#3A2000'] },
];

const SOUND_MAP: Record<Scene, any> = {
  campfire: require('@/assets/sounds/campfire.mp3'),
  rain:     require('@/assets/sounds/rain.mp3'),
  stars:    require('@/assets/sounds/stars.mp3'),
  cat:      require('@/assets/sounds/cat_purr.mp3'),
};

/* ─── Sound hook ─────────────────────────────── */
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
        { isLooping: true, volume: 0.75 },
      );
      soundRef.current = sound;
      await sound.playAsync();
    } catch (_) { /* web や権限なしでも無視 */ }
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

/* ─── Campfire scene ─────────────────────────── */
function CampfireScene() {
  const flames = useRef(
    Array.from({ length: 5 }, () => ({
      scale: new RNAnimated.Value(1),
      opacity: new RNAnimated.Value(0.8 + Math.random() * 0.2),
    }))
  ).current;

  useEffect(() => {
    flames.forEach(({ scale, opacity }, i) => {
      const flicker = (v: RNAnimated.Value, min: number, max: number, dur: number) =>
        RNAnimated.loop(
          RNAnimated.sequence([
            RNAnimated.timing(v, { toValue: max, duration: dur + i * 40, useNativeDriver: true }),
            RNAnimated.timing(v, { toValue: min, duration: dur + i * 60, useNativeDriver: true }),
          ])
        ).start();
      flicker(scale, 0.85, 1.18, 300 + i * 80);
      flicker(opacity, 0.5, 1.0, 250 + i * 60);
    });
  }, []);

  return (
    <View style={sc.scene}>
      <View style={sc.logBase}>
        <View style={[sc.log, { transform: [{ rotate: '-25deg' }] }]} />
        <View style={[sc.log, { transform: [{ rotate: '25deg' }] }]} />
      </View>
      {flames.map((f, i) => (
        <RNAnimated.Text
          key={i}
          style={[sc.flameEmoji, {
            fontSize: 36 + i * 8, bottom: 48 + i * 18,
            left: SW / 2 - 30 + (i - 2) * 14,
            transform: [{ scale: f.scale }], opacity: f.opacity,
          }]}
        >🔥</RNAnimated.Text>
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
            RNAnimated.timing(opacity, { toValue: 1,   duration: 200, useNativeDriver: true }),
            RNAnimated.timing(opacity, { toValue: 0,   duration: 1800, useNativeDriver: true }),
          ]),
        ]).start(() => setTimeout(rise, Math.random() * 1000));
      };
      setTimeout(rise, i * 300);
    });
  }, []);

  return (
    <>
      {embers.map((e, i) => (
        <RNAnimated.Text key={i} style={{ position: 'absolute', fontSize: 8, opacity: e.opacity, transform: [{ translateX: e.x }, { translateY: e.y }] }}>✦</RNAnimated.Text>
      ))}
    </>
  );
}

/* ─── Rain scene ─────────────────────────────── */
function RainScene() {
  const drops = useRef(
    Array.from({ length: 24 }, (_, i) => ({
      x: (i / 24) * SW + (Math.random() * SW) / 24,
      y: new RNAnimated.Value(-(Math.random() * SH * 0.5)),
      opacity: 0.3 + Math.random() * 0.5,
      speed: 900 + Math.random() * 700,
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
      scale: new RNAnimated.Value(0),
      opacity: new RNAnimated.Value(0),
      x: 40 + Math.random() * (SW - 80),
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
        <RNAnimated.View key={i} style={[sc.ripple, { left: r.x - 20, bottom: SH * 0.18 + i * 18, opacity: r.opacity, transform: [{ scale: r.scale }] }]} />
      ))}
    </>
  );
}

/* ─── Stars scene ────────────────────────────── */
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

/* ─── Cat scene ──────────────────────────────── */
type CatState = 'sleeping' | 'alert' | 'purring';

function CatScene() {
  const [catState, setCatState] = useState<CatState>('sleeping');
  const [petCount, setPetCount] = useState(0);

  const bodyScale  = useRef(new RNAnimated.Value(1)).current;
  const tailAngle  = useRef(new RNAnimated.Value(0)).current;
  const heartOpacity = useRef(new RNAnimated.Value(0)).current;
  const heartY       = useRef(new RNAnimated.Value(0)).current;
  const heartX       = useRef(new RNAnimated.Value(0)).current;

  // ゴロゴロ状態のアニメーション
  useEffect(() => {
    if (catState === 'purring') {
      RNAnimated.loop(RNAnimated.sequence([
        RNAnimated.timing(bodyScale, { toValue: 1.05, duration: 280, useNativeDriver: true }),
        RNAnimated.timing(bodyScale, { toValue: 0.96, duration: 280, useNativeDriver: true }),
      ])).start();
      RNAnimated.loop(RNAnimated.sequence([
        RNAnimated.timing(tailAngle, { toValue: 1,  duration: 380, useNativeDriver: true }),
        RNAnimated.timing(tailAngle, { toValue: -1, duration: 380, useNativeDriver: true }),
      ])).start();
    } else {
      bodyScale.stopAnimation(); bodyScale.setValue(1);
      tailAngle.stopAnimation(); tailAngle.setValue(0);
    }
  }, [catState]);

  const showHeart = () => {
    heartX.setValue((Math.random() - 0.5) * 40);
    heartY.setValue(0);
    heartOpacity.setValue(1);
    RNAnimated.parallel([
      RNAnimated.timing(heartY,       { toValue: -70, duration: 900, useNativeDriver: true }),
      RNAnimated.timing(heartOpacity, { toValue: 0,   duration: 900, useNativeDriver: true }),
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
        showHeart();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    },
  }), [catState]);

  const tailRotate = tailAngle.interpolate({ inputRange: [-1, 1], outputRange: ['-28deg', '28deg'] });

  const catEmoji =
    catState === 'sleeping' ? '😴' :
    catState === 'alert'    ? '🐱' : '😻';

  const labelText =
    catState === 'sleeping' ? 'すやすや眠ってる…\nそっとなでてみよう' :
    catState === 'alert'    ? 'むにゃ…？' :
    `ゴロゴロゴロ〜♪`;

  return (
    <View style={sc.scene}>
      {/* 窓・夜景 */}
      <Text style={sc.catWindow}>🌙</Text>
      <Text style={sc.catStar}>✨</Text>

      {/* ネコエリア */}
      <View style={sc.catArea} {...panResponder.panHandlers}>
        {/* しっぽ */}
        <RNAnimated.Text style={[sc.tail, { transform: [{ rotate: tailRotate }] }]}>
          🐾
        </RNAnimated.Text>

        {/* ネコ本体 */}
        <RNAnimated.Text style={[sc.catBody, { transform: [{ scale: bodyScale }] }]}>
          {catEmoji}
        </RNAnimated.Text>

        {/* ハート */}
        <RNAnimated.Text style={[sc.floatHeart, {
          opacity: heartOpacity,
          transform: [{ translateY: heartY }, { translateX: heartX }],
        }]}>
          💗
        </RNAnimated.Text>

        {/* なで回数 */}
        {petCount > 0 && (
          <View style={sc.petBadge}>
            <Text style={sc.petBadgeText}>×{petCount}</Text>
          </View>
        )}
      </View>

      {/* クッション */}
      <Text style={sc.cushion}>🛋️</Text>

      <Text style={[sc.sceneLabel, { color: '#FFBFA0', bottom: 28 }]}>{labelText}</Text>
    </View>
  );
}

/* ─── Main Modal ─────────────────────────────── */
interface Props {
  visible: boolean;
  level: number;
  mascotName: string;
  onClose: () => void;
}

export function RestEventModal({ visible, level, mascotName, onClose }: Props) {
  const colors = useColors();
  const mascotStage = getMascotStage(level);
  const displayName = mascotName || 'こころん';
  const { play, stop } = useSceneAudio();

  const [phase, setPhase]     = useState<Phase>('choose');
  const [scene, setScene]     = useState<Scene>('campfire');
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
        if (t <= 1) {
          clearInterval(timerRef.current!);
          setPhase('outro');
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  };

  const handleClose = () => {
    stop();
    clearInterval(timerRef.current!);
    onClose();
  };

  const cfg = SCENES.find(s => s.key === scene)!;

  const SceneComponent = () => {
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
            <SceneComponent />
            <View style={m.timerPill}>
              <Text style={m.timerText}>{timeLeft}s</Text>
            </View>
          </LinearGradient>
        )}

        {/* Outro phase */}
        {phase === 'outro' && (
          <LinearGradient colors={cfg.bg} style={m.fullScreen}>
            <SceneComponent />
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

/* ─── Styles ─────────────────────────────────── */
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
  catWindow:  { position: 'absolute', top: SH * 0.06, left: 36,  fontSize: 34 },
  catStar:    { position: 'absolute', top: SH * 0.09, right: 48, fontSize: 22 },
  catArea:    { position: 'absolute', top: SH * 0.22, alignSelf: 'center', alignItems: 'center', width: 180, height: 180 },
  catBody:    { fontSize: 100, textAlign: 'center' },
  tail:       { position: 'absolute', bottom: -18, right: 10, fontSize: 32, transformOrigin: 'top center' },
  floatHeart: { position: 'absolute', top: 10, fontSize: 28 },
  cushion:    { position: 'absolute', bottom: SH * 0.13, alignSelf: 'center', fontSize: 64, opacity: 0.6 },
  petBadge:   {
    position: 'absolute', top: -8, right: -8,
    backgroundColor: 'rgba(255,100,100,0.85)',
    borderRadius: 12, paddingHorizontal: 7, paddingVertical: 2,
  },
  petBadgeText: { color: '#FFF', fontSize: 12, fontFamily: 'Inter_700Bold' },
});

const m = StyleSheet.create({
  overlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  fullScreen: { flex: 1, position: 'relative' },

  sheet:        { borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden' },
  chooseHeader: { alignItems: 'center', paddingVertical: 28, paddingHorizontal: 20, gap: 8 },
  chooseTitle:  { fontSize: 22, fontFamily: 'Inter_700Bold', color: '#FFF', textAlign: 'center' },
  chooseSub:    { fontSize: 14, color: 'rgba(255,255,255,0.6)', fontFamily: 'Inter_400Regular' },

  sceneList:      { padding: 16, gap: 10 },
  sceneBtn:       { borderRadius: 18, overflow: 'hidden' },
  sceneBtnInner:  { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  sceneBtnEmoji:  { fontSize: 28 },
  sceneBtnLabel:  { fontSize: 16, fontFamily: 'Inter_600SemiBold', color: '#FFF' },

  skipBtn:  { alignItems: 'center', paddingVertical: 18 },
  skipText: { fontSize: 13, fontFamily: 'Inter_400Regular' },

  timerPill: { position: 'absolute', top: 56, right: 20, backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  timerText: { color: '#FFF', fontSize: 14, fontFamily: 'Inter_600SemiBold' },

  outroCard:     { position: 'absolute', bottom: 48, left: 24, right: 24, backgroundColor: 'rgba(10,5,30,0.85)', borderRadius: 24, padding: 24, alignItems: 'center', gap: 14 },
  outroQuestion: { fontSize: 20, fontFamily: 'Inter_700Bold', color: '#FFF', textAlign: 'center' },
  outroRow:      { flexDirection: 'row', gap: 12, width: '100%' },
  outroBtn:      { flex: 1, paddingVertical: 14, borderRadius: 16, alignItems: 'center' },
  outroBtnText:  { fontSize: 15, fontFamily: 'Inter_700Bold', color: '#FFF' },
});
