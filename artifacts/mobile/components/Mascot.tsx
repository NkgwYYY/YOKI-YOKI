import React, { useEffect, useState, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, PanResponder } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import Svg, {
  Circle, Ellipse, Path, G, Defs,
  RadialGradient, Stop, Line, Rect,
} from 'react-native-svg';
import { Image } from 'react-native';
import { MascotStage, MascotMood, IdleBehavior, EvolutionType, CharacterKey, getCharacter } from '@/utils/mascotUtils';

/* ── たまごステージ: 動画から切り出した透過画像（気分ごとに表情切替） ── */
const EGG_IMAGES: Record<MascotMood, ReturnType<typeof require>> = {
  normal:  require('../assets/images/egg/normal.png'),
  happy:   require('../assets/images/egg/happy.png'),
  excited: require('../assets/images/egg/excited.png'),
  grumpy:  require('../assets/images/egg/grumpy.png'),
  tired:   require('../assets/images/egg/tired.png'),
  sleepy:  require('../assets/images/egg/sleepy.png'),
};
const EGG_BLINK = require('../assets/images/egg/blink.png');
/* 真顔→まばたき→にっこり の変身モーション（動画から切り出した実フレーム） */
const EGG_WAKE_FRAMES = [
  require('../assets/images/egg/wake_1.png'),
  require('../assets/images/egg/wake_2.png'),
  require('../assets/images/egg/wake_3.png'),
  require('../assets/images/egg/wake_4.png'),
  require('../assets/images/egg/wake_5.png'),
  require('../assets/images/egg/wake_6.png'),
];
/* ころころ転がるコマ送りフレーム（動画から切り出し） */
const EGG_ROLL_FRAMES = [
  require('../assets/images/egg/roll_1.png'),
  require('../assets/images/egg/roll_2.png'),
  require('../assets/images/egg/roll_3.png'),
  require('../assets/images/egg/roll_4.png'),
  require('../assets/images/egg/roll_5.png'),
  require('../assets/images/egg/roll_6.png'),
];

const ALL_MOODS: MascotMood[] = ['normal', 'happy', 'excited', 'grumpy', 'tired', 'sleepy'];

/* ── 進化後キャラクター画像（ストレージの素材から取り込み） ── */
const CHAR_IMAGES: Record<Exclude<CharacterKey, 'egg'>, ReturnType<typeof require>> = {
  odango:         require('../assets/images/characters/odango.png'),
  onigiri:        require('../assets/images/characters/onigiri.png'),
  tako:           require('../assets/images/characters/tako.png'),
  ebifurai:       require('../assets/images/characters/ebifurai.png'),
  happa:          require('../assets/images/characters/happa.png'),
  colorful_happa: require('../assets/images/characters/colorful_happa.png'),
  neko:           require('../assets/images/characters/neko.png'),
  usagi:          require('../assets/images/characters/usagi.png'),
  lion:           require('../assets/images/characters/lion.png'),
};

/* ── 笑顔アニメ（アップロード動画から切り出した実フレーム: しかめ顔→まばたき→にっこり） ── */
const SMILE_FRAMES: Partial<Record<Exclude<CharacterKey, 'egg'>, ReturnType<typeof require>[]>> = {
  odango: [
    require('../assets/images/characters/smile/odango/s_01.webp'),
    require('../assets/images/characters/smile/odango/s_02.webp'),
    require('../assets/images/characters/smile/odango/s_03.webp'),
    require('../assets/images/characters/smile/odango/s_04.webp'),
    require('../assets/images/characters/smile/odango/s_05.webp'),
    require('../assets/images/characters/smile/odango/s_06.webp'),
    require('../assets/images/characters/smile/odango/s_07.webp'),
    require('../assets/images/characters/smile/odango/s_08.webp'),
    require('../assets/images/characters/smile/odango/s_09.webp'),
    require('../assets/images/characters/smile/odango/s_10.webp'),
    require('../assets/images/characters/smile/odango/s_11.webp'),
    require('../assets/images/characters/smile/odango/s_12.webp'),
  ],
  happa: [
    require('../assets/images/characters/smile/happa/s_01.webp'),
    require('../assets/images/characters/smile/happa/s_02.webp'),
    require('../assets/images/characters/smile/happa/s_03.webp'),
    require('../assets/images/characters/smile/happa/s_04.webp'),
    require('../assets/images/characters/smile/happa/s_05.webp'),
    require('../assets/images/characters/smile/happa/s_06.webp'),
    require('../assets/images/characters/smile/happa/s_07.webp'),
    require('../assets/images/characters/smile/happa/s_08.webp'),
    require('../assets/images/characters/smile/happa/s_09.webp'),
    require('../assets/images/characters/smile/happa/s_10.webp'),
    require('../assets/images/characters/smile/happa/s_11.webp'),
    require('../assets/images/characters/smile/happa/s_12.webp'),
  ],
  colorful_happa: [
    require('../assets/images/characters/smile/colorful_happa/s_01.webp'),
    require('../assets/images/characters/smile/colorful_happa/s_02.webp'),
    require('../assets/images/characters/smile/colorful_happa/s_03.webp'),
    require('../assets/images/characters/smile/colorful_happa/s_04.webp'),
    require('../assets/images/characters/smile/colorful_happa/s_05.webp'),
    require('../assets/images/characters/smile/colorful_happa/s_06.webp'),
    require('../assets/images/characters/smile/colorful_happa/s_07.webp'),
    require('../assets/images/characters/smile/colorful_happa/s_08.webp'),
    require('../assets/images/characters/smile/colorful_happa/s_09.webp'),
    require('../assets/images/characters/smile/colorful_happa/s_10.webp'),
    require('../assets/images/characters/smile/colorful_happa/s_11.webp'),
    require('../assets/images/characters/smile/colorful_happa/s_12.webp'),
  ],
};

const SMILE_FRAME_MS = 120;    // 1コマの表示時間
const SMILE_HOLD_MS = 1400;    // 最後の笑顔を保持する時間

/* 進化後キャラ: 1枚画像に、たまごと同じ呼吸・ゆらぎ・ぷるんモーションを適用 */
function CharacterImage({ charKey, mood, size }: { charKey: Exclude<CharacterKey, 'egg'>; mood: MascotMood; size: number }) {
  const SINE = Easing.inOut(Easing.sin);
  const breath = useSharedValue(0);
  const sway = useSharedValue(0);
  useEffect(() => {
    const d = mood === 'sleepy' || mood === 'tired' ? 1900 : 1500;
    breath.value = withRepeat(
      withSequence(
        withTiming(1, { duration: d, easing: SINE }),
        withTiming(0, { duration: d, easing: SINE }),
      ),
      -1,
      false
    );
    sway.value = withRepeat(
      withSequence(
        withTiming(1, { duration: d * 1.37, easing: SINE }),
        withTiming(-1, { duration: d * 1.37, easing: SINE }),
      ),
      -1,
      false
    );
  }, [mood]);

  const jelly = useSharedValue(0);
  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const loop = () => {
      timer = setTimeout(() => {
        if (!alive) return;
        jelly.value = withSequence(
          withTiming(1, { duration: 110, easing: Easing.out(Easing.quad) }),
          withSpring(0, { damping: 4, stiffness: 160 }),
        );
        loop();
      }, 4000 + Math.random() * 5000);
    };
    if (mood !== 'sleepy' && mood !== 'tired') loop();
    return () => { alive = false; clearTimeout(timer); };
  }, [mood]);

  const breathStyle = useAnimatedStyle(() => ({
    transform: [
      { scaleY: 1 - breath.value * 0.032 - jelly.value * 0.04 },
      { scaleX: 1 + breath.value * 0.028 + jelly.value * 0.045 },
      { rotate: `${sway.value * 1.1}deg` },
    ],
  }));

  /* ── 笑顔アニメ再生（該当キャラのみ）: 数秒おきに動画フレームを一巡 ── */
  const smileFrames = SMILE_FRAMES[charKey];
  const [smileIdx, setSmileIdx] = useState<number | null>(null);
  useEffect(() => {
    if (!smileFrames || mood === 'sleepy' || mood === 'tired') {
      setSmileIdx(null);
      return;
    }
    let alive = true;
    let timers: ReturnType<typeof setTimeout>[] = [];
    const schedule = (firstDelay: number) => {
      timers.push(setTimeout(() => {
        if (!alive) return;
        // 一巡再生
        smileFrames.forEach((_, i) => {
          timers.push(setTimeout(() => { if (alive) setSmileIdx(i); }, i * SMILE_FRAME_MS));
        });
        const total = smileFrames.length * SMILE_FRAME_MS + SMILE_HOLD_MS;
        timers.push(setTimeout(() => {
          if (!alive) return;
          setSmileIdx(null);
          schedule(7000 + Math.random() * 6000);
        }, total));
      }, firstDelay));
    };
    schedule(2500 + Math.random() * 2000);
    return () => { alive = false; timers.forEach(clearTimeout); };
  }, [charKey, mood]);

  return (
    <Animated.View style={[breathStyle, { width: size, height: size }]}>
      <Image
        source={CHAR_IMAGES[charKey] as any}
        style={{ width: size, height: size, opacity: smileIdx === null ? 1 : 0 }}
        resizeMode="contain"
        fadeDuration={0}
      />
      {/* 再生中の1コマだけをマウント（全コマ常時マウントはメモリ負荷が大きいため） */}
      {smileFrames && smileIdx !== null && (
        <Image
          source={smileFrames[smileIdx] as any}
          style={{
            position: 'absolute', top: 0, left: 0,
            width: size, height: size,
          }}
          resizeMode="contain"
          fadeDuration={0}
        />
      )}
    </Animated.View>
  );
}

/* 常時マウントされたレイヤーの不透明度をクロスさせる（表情切替のじわっとした変化） */
function MoodFadeLayer({ active, size, children }: { active: boolean; size: number; children: React.ReactNode }) {
  const op = useSharedValue(active ? 1 : 0);
  useEffect(() => {
    op.value = withTiming(active ? 1 : 0, { duration: 300 });
  }, [active]);
  const st = useAnimatedStyle(() => ({ opacity: op.value }));
  return (
    <Animated.View
      style={[st, { position: 'absolute', top: 0, left: 0, width: size, height: size }]}
      pointerEvents="none"
    >
      {children}
    </Animated.View>
  );
}

function EggImage({ mood, size, rolling = false }: { mood: MascotMood; size: number; rolling?: boolean }) {
  /* ぷにぷに呼吸（サイン波イージングでゆったり・シリコンのような柔らかさ） */
  const SINE = Easing.inOut(Easing.sin);
  const breath = useSharedValue(0);
  const sway = useSharedValue(0);
  useEffect(() => {
    const d = mood === 'sleepy' || mood === 'tired' ? 1900 : 1500;
    breath.value = withRepeat(
      withSequence(
        withTiming(1, { duration: d, easing: SINE }),
        withTiming(0, { duration: d, easing: SINE }),
      ),
      -1,
      false
    );
    /* 呼吸とは別周期のゆらぎ（重心の揺れ）— 周期をずらすと機械っぽさが消える */
    sway.value = withRepeat(
      withSequence(
        withTiming(1, { duration: d * 1.37, easing: SINE }),
        withTiming(-1, { duration: d * 1.37, easing: SINE }),
      ),
      -1,
      false
    );
  }, [mood]);

  /* たまにゼリーみたいにぷるんと揺れる（4〜9秒ごと） */
  const jelly = useSharedValue(0);
  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const loop = () => {
      timer = setTimeout(() => {
        if (!alive) return;
        jelly.value = withSequence(
          withTiming(1, { duration: 110, easing: Easing.out(Easing.quad) }),
          withSpring(0, { damping: 4, stiffness: 160 }),
        );
        loop();
      }, 4000 + Math.random() * 5000);
    };
    if (mood !== 'sleepy' && mood !== 'tired') loop();
    return () => { alive = false; clearTimeout(timer); };
  }, [mood]);

  const breathStyle = useAnimatedStyle(() => ({
    transform: [
      { scaleY: 1 - breath.value * 0.032 - jelly.value * 0.04 },
      { scaleX: 1 + breath.value * 0.028 + jelly.value * 0.045 },
      { rotate: `${sway.value * 1.1}deg` },
    ],
  }));

  /* まばたき（ふわっと閉じてふわっと開く。たまに2連続） */
  const blinkOp = useSharedValue(0);
  useEffect(() => {
    if (mood === 'sleepy') { blinkOp.value = 0; return; }
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const one = () =>
      withSequence(
        withTiming(1, { duration: 90, easing: Easing.in(Easing.quad) }),
        withTiming(1, { duration: 60 }),
        withTiming(0, { duration: 140, easing: Easing.out(Easing.quad) }),
      );
    const loop = () => {
      timer = setTimeout(() => {
        if (!alive) return;
        // 25%の確率で2連続まばたき
        blinkOp.value = Math.random() < 0.25
          ? withSequence(one(), withTiming(0, { duration: 120 }), one())
          : one();
        loop();
      }, 2200 + Math.random() * 3000);
    };
    loop();
    return () => { alive = false; clearTimeout(timer); };
  }, [mood]);
  const blinkStyle = useAnimatedStyle(() => ({ opacity: blinkOp.value }));

  /* 変身モーション: 真顔/寝顔 → happy になった瞬間、動画の実フレームを順送り再生 */
  const [seq, setSeq] = useState<number | null>(null);
  const seqOp = useSharedValue(0);
  const prevMoodRef = useRef(mood);
  useEffect(() => {
    const from = prevMoodRef.current;
    prevMoodRef.current = mood;
    if (mood !== 'happy' || !(from === 'normal' || from === 'sleepy' || from === 'tired')) return;
    let i = from === 'normal' ? 0 : 1; // 寝起きは目閉じフレームから
    setSeq(i);
    seqOp.value = 1;
    let fadeTimer: ReturnType<typeof setTimeout> | null = null;
    const iv = setInterval(() => {
      i += 1;
      if (i >= EGG_WAKE_FRAMES.length) {
        clearInterval(iv);
        // 最終フレームを残したままフェードアウトして通常レイヤーへ繋ぐ
        seqOp.value = withTiming(0, { duration: 220 });
        fadeTimer = setTimeout(() => setSeq(null), 240);
      } else {
        setSeq(i);
      }
    }, 130);
    return () => { clearInterval(iv); if (fadeTimer) clearTimeout(fadeTimer); };
  }, [mood]);
  const seqStyle = useAnimatedStyle(() => ({ opacity: seqOp.value }));

  /* ころころアニメ（rolling中はフレームを順送り） */
  const [rollFrame, setRollFrame] = useState(0);
  useEffect(() => {
    if (!rolling) { setRollFrame(0); return; }
    const iv = setInterval(() => {
      setRollFrame((f) => (f + 1) % EGG_ROLL_FRAMES.length);
    }, 220);
    return () => clearInterval(iv);
  }, [rolling]);

  if (rolling) {
    return (
      <Animated.View style={[breathStyle, { transformOrigin: 'bottom' } as any]}>
        <Image
          source={EGG_ROLL_FRAMES[rollFrame]}
          style={{ width: size, height: size }}
          resizeMode="contain"
          fadeDuration={0}
        />
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[breathStyle, { transformOrigin: 'bottom', width: size, height: size } as any]}>
      {/* 全表情レイヤーを常時重ねて、不透明度だけを0.3秒でクロスフェード */}
      {ALL_MOODS.map((m) => (
        <MoodFadeLayer key={m} active={(EGG_IMAGES[mood] ? mood : 'normal') === m} size={size}>
          <Image
            source={EGG_IMAGES[m] as any}
            style={{ width: size, height: size }}
            resizeMode="contain"
            fadeDuration={0}
          />
        </MoodFadeLayer>
      ))}
      <Animated.Image
        source={EGG_BLINK}
        style={[blinkStyle, { position: 'absolute', top: 0, left: 0, width: size, height: size, pointerEvents: 'none' } as any]}
        resizeMode="contain"
        fadeDuration={0}
      />
      {seq != null && (
        <Animated.Image
          source={EGG_WAKE_FRAMES[seq]}
          style={[seqStyle, { position: 'absolute', top: 0, left: 0, width: size, height: size, pointerEvents: 'none' } as any]}
          resizeMode="contain"
          fadeDuration={0}
        />
      )}
    
    </Animated.View>
  );
}

interface MascotProps {
  stage: MascotStage;
  mood: MascotMood;
  evolutionType?: EvolutionType | null;
  size?: number;
  onPress?: () => void;
  onPet?: () => void;
  idleBehavior?: IdleBehavior;
  isEating?: boolean;
}

/* ── なでなで時の控えめな光（絵文字なし・淡いピンクの輪がふわっと広がって消える） ── */
function PetGlow({ size, petKey }: { size: number; petKey: number }) {
  const sc = useSharedValue(0.85);
  const op = useSharedValue(0);

  useEffect(() => {
    sc.value = 0.85;
    op.value = 0;
    sc.value = withTiming(1.22, { duration: 750 });
    op.value = withSequence(
      withTiming(0.55, { duration: 160 }),
      withTiming(0, { duration: 590 }),
    );
  }, [petKey]);

  const style = useAnimatedStyle(() => ({
    opacity: op.value,
    transform: [{ scale: sc.value }],
  }));

  return (
    <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]} pointerEvents="none">
      <Animated.View style={style}>
        <Svg width={size * 1.3} height={size * 1.3} viewBox="0 0 100 100">
          <Defs>
            <RadialGradient id="petGlowGrad" cx="50%" cy="50%" r="50%">
              <Stop offset="0%"  stopColor="#FFD3E4" stopOpacity="0.9" />
              <Stop offset="60%" stopColor="#FFD3E4" stopOpacity="0.35" />
              <Stop offset="100%" stopColor="#FFD3E4" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Circle cx={50} cy={50} r={50} fill="url(#petGlowGrad)" />
        </Svg>
      </Animated.View>
    </View>
  );
}

/* ─── per-mood eye + mouth shapes ─── */
/* ─── Main component ─── */
export function Mascot({ stage, mood, evolutionType, size = 140, onPress, onPet, idleBehavior = 'normal', isEating = false }: MascotProps) {
  const bounce = useSharedValue(0);
  const scaleX = useSharedValue(1);
  const scaleY = useSharedValue(1);
  const rotate = useSharedValue(0);

  /* petting state */
  const [showHearts, setShowHearts] = useState(false);
  const [petKey,     setPetKey]     = useState(0);
  const glowTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (glowTimer.current) clearTimeout(glowTimer.current); }, []);
  const onPressRef = useRef(onPress);
  const onPetRef   = useRef(onPet);
  useEffect(() => { onPressRef.current = onPress; }, [onPress]);
  useEffect(() => { onPetRef.current   = onPet;   }, [onPet]);

  /* ── 夜でもタップ/なでなでで起きる（90秒間） ── */
  const [awake, setAwake] = useState(false);
  const wakeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wakeUp = () => {
    setAwake(true);
    if (wakeTimer.current) clearTimeout(wakeTimer.current);
    wakeTimer.current = setTimeout(() => setAwake(false), 90000);
  };
  useEffect(() => () => {
    if (wakeTimer.current) clearTimeout(wakeTimer.current);
  }, []);
  const wakeUpRef = useRef(wakeUp);
  useEffect(() => { wakeUpRef.current = wakeUp; });

  /* 起床/にっこりへの変身は EggImage 側が動画の実フレーム(EGG_WAKE_FRAMES)で再生する */
  const effMood: MascotMood =
    awake && (mood === 'sleepy' || mood === 'tired') ? 'happy' : mood;
  const effIdle: IdleBehavior =
    awake && idleBehavior === 'sleeping' ? 'normal' : idleBehavior;

  // Eating flash
  useEffect(() => {
    if (!isEating) return;
    bounce.value = withSequence(
      withSpring(-28, { damping: 4, stiffness: 450 }),
      withSpring(0, { damping: 8, stiffness: 220 }),
    );
    scaleX.value = withSequence(
      withTiming(1.18, { duration: 80 }),
      withTiming(0.88, { duration: 80 }),
      withTiming(1.05, { duration: 100 }),
      withTiming(1, { duration: 200 }),
    );
    scaleY.value = withSequence(
      withTiming(0.88, { duration: 80 }),
      withTiming(1.12, { duration: 80 }),
      withTiming(1, { duration: 200 }),
    );
  }, [isEating]);

  // Idle behavior animation
  useEffect(() => {
    rotate.value = withTiming(0, { duration: 300 });

    if (effIdle === 'rolling') {
      // Egg stage: frame animation already contains the tilt — skip the rocking rotate
      if (stage !== 'egg') {
        rotate.value = withRepeat(
          withSequence(
            withTiming(-14, { duration: 500 }),
            withTiming(14, { duration: 500 }),
          ),
          -1,
          true
        );
      }
      // Slow bounce while rolling
      bounce.value = withRepeat(
        withSequence(
          withTiming(-4, { duration: 500 }),
          withTiming(0, { duration: 500 }),
        ),
        -1,
        false
      );
      return;
    }

    if (effIdle === 'sleeping') {
      // Very slow, tiny movement
      bounce.value = withRepeat(
        withSequence(
          withTiming(-3, { duration: 2000 }),
          withTiming(0, { duration: 2000 }),
        ),
        -1,
        false
      );
      return;
    }

    if (effIdle === 'playing') {
      // Fast playful bounce
      bounce.value = withRepeat(
        withSequence(
          withTiming(-16, { duration: 350 }),
          withTiming(0, { duration: 350 }),
        ),
        -1,
        false
      );
      scaleX.value = withRepeat(
        withSequence(
          withTiming(1.1, { duration: 200 }),
          withTiming(0.93, { duration: 200 }),
          withTiming(1, { duration: 200 }),
        ),
        -1,
        false
      );
      return;
    }

    // normal — based on mood
    const speed = effMood === 'excited' ? 500 : effMood === 'tired' || effMood === 'sleepy' ? 1800 : 1100;
    const height = effMood === 'excited' ? 14 : effMood === 'tired' ? 3 : 8;

    bounce.value = withRepeat(
      withSequence(
        withTiming(-height, { duration: speed }),
        withTiming(0, { duration: speed })
      ),
      -1,
      false
    );

    if (effMood === 'excited') {
      scaleX.value = withRepeat(
        withSequence(
          withTiming(1.08, { duration: 250 }),
          withTiming(0.94, { duration: 250 }),
          withTiming(1, { duration: 250 })
        ),
        -1,
        false
      );
    } else {
      scaleX.value = withTiming(1, { duration: 300 });
    }
  }, [effMood, effIdle]);

  /* ── petting animation ── */
  const doPetAnimation = () => {
    // head wobble left↔right
    rotate.value = withSequence(
      withTiming( 18, { duration: 75 }),
      withTiming(-18, { duration: 75 }),
      withTiming( 14, { duration: 75 }),
      withTiming(-14, { duration: 75 }),
      withTiming(  8, { duration: 75 }),
      withTiming(  0, { duration: 120 }),
    );
    // happy bounce
    bounce.value = withSequence(
      withSpring(-14, { damping: 4, stiffness: 380 }),
      withSpring(0,   { damping: 8, stiffness: 220 }),
    );
    // little squish
    scaleX.value = withSequence(
      withTiming(0.90, { duration: 90 }),
      withTiming(1.10, { duration: 90 }),
      withTiming(1,    { duration: 180 }),
    );
    scaleY.value = withSequence(
      withTiming(1.08, { duration: 90 }),
      withTiming(0.94, { duration: 90 }),
      withTiming(1,    { duration: 180 }),
    );
  };

  /* ── pan responder: swipe = pet, tap = bounce ── */
  const panResponder = useMemo(() => {
    let wasPet = false;

    return PanResponder.create({
      // タッチ開始時点でResponderを取得（ScrollViewより先に）
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => false,
      // 横スワイプと判断できた時点でScrollViewから横取り
      onMoveShouldSetPanResponder: (_, gs) =>
        Math.abs(gs.dx) > 8 && Math.abs(gs.dx) > Math.abs(gs.dy) * 1.2,
      onMoveShouldSetPanResponderCapture: (_, gs) =>
        Math.abs(gs.dx) > 12 && Math.abs(gs.dx) > Math.abs(gs.dy) * 1.5,

      onPanResponderGrant: () => { wasPet = false; },

      onPanResponderMove: (_, gs) => {
        // y0チェック不要 — マスコット全体への横スワイプをペットと認識
        if (
          !wasPet &&
          Math.abs(gs.dx) > 25 &&
          Math.abs(gs.dy) < 60
        ) {
          wasPet = true;
          wakeUpRef.current();
          doPetAnimation();
          setShowHearts(true);
          setPetKey(k => k + 1);
          if (glowTimer.current) clearTimeout(glowTimer.current);
          glowTimer.current = setTimeout(() => setShowHearts(false), 1400);
          onPetRef.current?.();
        }
      },

      onPanResponderRelease: (_, gs) => {
        if (!wasPet && Math.abs(gs.dx) < 12 && Math.abs(gs.dy) < 12) {
          // plain tap
          wakeUpRef.current();
          bounce.value = withSequence(
            withSpring(-22, { damping: 6, stiffness: 300 }),
            withSpring(0,   { damping: 8, stiffness: 200 }),
          );
          onPressRef.current?.();
        }
      },
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateY: bounce.value },
      { scaleX: scaleX.value },
      { scaleY: scaleY.value },
      { rotate: `${rotate.value}deg` },
    ],
  }));

  const character = getCharacter(stage, evolutionType);

  return (
    <View {...panResponder.panHandlers}>
      <View>
        <Animated.View style={style}>
          {character.key === 'egg'
            ? <EggImage mood={effMood} size={size} rolling={effIdle === 'rolling'} />
            : <CharacterImage charKey={character.key} mood={effMood} size={size} />}
        </Animated.View>
        {effIdle === 'sleeping' && <ZzzOverlay size={size} />}
        {showHearts && <PetGlow size={size} petKey={petKey} />}
      </View>
    </View>
  );
}

function ZzzOverlay({ size }: { size: number }) {
  const z1 = useSharedValue(0);
  const z2 = useSharedValue(0);
  const z3 = useSharedValue(0);

  useEffect(() => {
    const loop = (v: typeof z1, delay: number) => {
      v.value = withRepeat(
        withSequence(
          withTiming(0, { duration: delay }),
          withTiming(1, { duration: 700 }),
          withTiming(0, { duration: 500 }),
        ),
        -1,
        false
      );
    };
    loop(z1, 0);
    loop(z2, 900);
    loop(z3, 1800);
  }, []);

  const s1 = useAnimatedStyle(() => ({ opacity: z1.value, transform: [{ translateY: -z1.value * 14 }] }));
  const s2 = useAnimatedStyle(() => ({ opacity: z2.value, transform: [{ translateY: -z2.value * 10 }] }));
  const s3 = useAnimatedStyle(() => ({ opacity: z3.value, transform: [{ translateY: -z3.value * 7 }] }));

  const right = size * 0.72;
  const top = size * 0.05;

  return (
    <View style={[StyleSheet.absoluteFill, { overflow: 'visible' }]} pointerEvents="none">
      <Animated.Text style={[zStyles.z, { right: -right + size * 0.85, top: top + 14, fontSize: 11 }, s3]}>z</Animated.Text>
      <Animated.Text style={[zStyles.z, { right: -right + size * 0.82, top: top + 4, fontSize: 15 }, s2]}>z</Animated.Text>
      <Animated.Text style={[zStyles.z, { right: -right + size * 0.78, top: top - 8, fontSize: 20 }, s1]}>Z</Animated.Text>
    </View>
  );
}

const zStyles = StyleSheet.create({
  z: { position: 'absolute', color: '#A78BFA', fontWeight: '700' },
});
