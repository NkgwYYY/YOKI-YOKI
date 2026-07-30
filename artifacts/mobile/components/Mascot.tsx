import React, { useEffect, useState, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, PanResponder } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  withDelay,
} from 'react-native-reanimated';
import Svg, {
  Circle, Ellipse, Path, G, Defs,
  RadialGradient, Stop, Line, Rect,
} from 'react-native-svg';
import { MascotStage, MascotMood, IdleBehavior, EvolutionType } from '@/utils/mascotUtils';

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

/* ── Floating heart / sparkle that rises and fades ── */
function FloatingPuff({ x, y, delay, emoji }: { x: number; y: number; delay: number; emoji: string }) {
  const ty  = useSharedValue(0);
  const op  = useSharedValue(0);
  const sc  = useSharedValue(0.4);

  useEffect(() => {
    ty.value = withDelay(delay, withTiming(-65, { duration: 950 }));
    sc.value = withDelay(delay, withSpring(1, { damping: 7, stiffness: 180 }));
    op.value = withDelay(delay, withSequence(
      withTiming(1, { duration: 140 }),
      withTiming(1, { duration: 420 }),
      withTiming(0, { duration: 390 }),
    ));
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: ty.value }, { scale: sc.value }],
    opacity: op.value,
    position: 'absolute',
    left: x,
    top: y,
  }));

  return <Animated.Text style={[style, { fontSize: 20 }]}>{emoji}</Animated.Text>;
}

function HeartsOverlay({ size, petKey }: { size: number; petKey: number }) {
  const puffs = [
    { x: size * 0.08, y: size * 0.06, delay: 0,   emoji: '💗' },
    { x: size * 0.38, y: size * 0.00, delay: 110,  emoji: '✨' },
    { x: size * 0.64, y: size * 0.05, delay: 55,   emoji: '💗' },
    { x: size * 0.22, y: size * 0.18, delay: 230,  emoji: '💕' },
    { x: size * 0.52, y: size * 0.16, delay: 290,  emoji: '⭐' },
  ];
  return (
    <View style={[StyleSheet.absoluteFill, { overflow: 'visible' }]} pointerEvents="none">
      {puffs.map((p, i) => <FloatingPuff key={`${petKey}-${i}`} {...p} />)}
    </View>
  );
}

/* ─── per-mood eye + mouth shapes ─── */
function Eyes({ mood, cx, leftX, rightX, eyeY }: {
  mood: MascotMood; cx: number; leftX: number; rightX: number; eyeY: number;
}) {
  if (mood === 'sleepy') {
    return (
      <G>
        {/* 半目: 下半分だけ見える */}
        <Ellipse cx={leftX}  cy={eyeY} rx={9} ry={5} fill="white" />
        <Ellipse cx={rightX} cy={eyeY} rx={9} ry={5} fill="white" />
        <Rect x={leftX - 9}  y={eyeY - 6} width={18} height={6} fill="#C9B8E8" rx={3} />
        <Rect x={rightX - 9} y={eyeY - 6} width={18} height={6} fill="#C9B8E8" rx={3} />
        <Circle cx={leftX + 1}  cy={eyeY + 1} r={3.5} fill="#1A0A3C" />
        <Circle cx={rightX + 1} cy={eyeY + 1} r={3.5} fill="#1A0A3C" />
      </G>
    );
  }
  if (mood === 'excited') {
    return (
      <G>
        <Circle cx={leftX}  cy={eyeY} r={10} fill="white" />
        <Circle cx={rightX} cy={eyeY} r={10} fill="white" />
        <Circle cx={leftX}  cy={eyeY + 1} r={6.5} fill="#1A0A3C" />
        <Circle cx={rightX} cy={eyeY + 1} r={6.5} fill="#1A0A3C" />
        <Circle cx={leftX - 2}  cy={eyeY - 2} r={2.5} fill="white" />
        <Circle cx={rightX - 2} cy={eyeY - 2} r={2.5} fill="white" />
        {/* キラキラ */}
        <Line x1={leftX - 12} y1={eyeY - 9} x2={leftX - 7} y2={eyeY - 4} stroke="#FFD166" strokeWidth="2" strokeLinecap="round" />
        <Line x1={leftX - 14} y1={eyeY}     x2={leftX - 8} y2={eyeY}     stroke="#FFD166" strokeWidth="2" strokeLinecap="round" />
      </G>
    );
  }
  if (mood === 'tired') {
    return (
      <G>
        <Circle cx={leftX}  cy={eyeY} r={9} fill="white" />
        <Circle cx={rightX} cy={eyeY} r={9} fill="white" />
        <Rect x={leftX - 9}  y={eyeY - 9} width={18} height={8} fill="#C9B8E8" rx={4} />
        <Rect x={rightX - 9} y={eyeY - 9} width={18} height={8} fill="#C9B8E8" rx={4} />
        <Circle cx={leftX}  cy={eyeY + 2} r={5} fill="#1A0A3C" />
        <Circle cx={rightX} cy={eyeY + 2} r={5} fill="#1A0A3C" />
      </G>
    );
  }
  if (mood === 'grumpy') {
    return (
      <G>
        <Circle cx={leftX}  cy={eyeY} r={9} fill="white" />
        <Circle cx={rightX} cy={eyeY} r={9} fill="white" />
        <Circle cx={leftX}  cy={eyeY + 2} r={5.5} fill="#1A0A3C" />
        <Circle cx={rightX} cy={eyeY + 2} r={5.5} fill="#1A0A3C" />
        <Circle cx={leftX - 2}  cy={eyeY} r={1.8} fill="white" />
        <Circle cx={rightX - 2} cy={eyeY} r={1.8} fill="white" />
        {/* へ字まゆ（内側が上がる怒り眉） */}
        <Line x1={leftX - 8} y1={eyeY - 10} x2={leftX + 6} y2={eyeY - 15}
          stroke="#1A0A3C" strokeWidth="3" strokeLinecap="round" />
        <Line x1={rightX - 6} y1={eyeY - 15} x2={rightX + 8} y2={eyeY - 10}
          stroke="#1A0A3C" strokeWidth="3" strokeLinecap="round" />
      </G>
    );
  }
  if (mood === 'happy') {
    return (
      <G>
        <Circle cx={leftX}  cy={eyeY} r={9} fill="white" />
        <Circle cx={rightX} cy={eyeY} r={9} fill="white" />
        <Rect x={leftX - 9}  y={eyeY - 9} width={18} height={6} fill="#C9B8E8" rx={3} />
        <Rect x={rightX - 9} y={eyeY - 9} width={18} height={6} fill="#C9B8E8" rx={3} />
        <Circle cx={leftX}  cy={eyeY + 1} r={5.5} fill="#1A0A3C" />
        <Circle cx={rightX} cy={eyeY + 1} r={5.5} fill="#1A0A3C" />
        <Circle cx={leftX - 2}  cy={eyeY - 1} r={2} fill="white" />
        <Circle cx={rightX - 2} cy={eyeY - 1} r={2} fill="white" />
      </G>
    );
  }
  // normal
  return (
    <G>
      <Circle cx={leftX}  cy={eyeY} r={9} fill="white" />
      <Circle cx={rightX} cy={eyeY} r={9} fill="white" />
      <Circle cx={leftX + 1}  cy={eyeY + 1} r={5.5} fill="#1A0A3C" />
      <Circle cx={rightX + 1} cy={eyeY + 1} r={5.5} fill="#1A0A3C" />
      <Circle cx={leftX - 2}  cy={eyeY - 2} r={2} fill="white" />
      <Circle cx={rightX - 2} cy={eyeY - 2} r={2} fill="white" />
    </G>
  );
}

function Mouth({ mood, cx, mouthY }: { mood: MascotMood; cx: number; mouthY: number }) {
  if (mood === 'excited') {
    return (
      <G>
        <Ellipse cx={cx} cy={mouthY} rx={11} ry={8} fill="#1A0A3C" />
        <Ellipse cx={cx} cy={mouthY - 1} rx={7} ry={4} fill="#FF6B8A" />
      </G>
    );
  }
  if (mood === 'tired') {
    // 逆弧（への字フラウン）
    return <Path d={`M ${cx - 13} ${mouthY} Q ${cx} ${mouthY - 8} ${cx + 13} ${mouthY}`}
      stroke="#1A0A3C" strokeWidth="2.8" fill="none" strokeLinecap="round" />;
  }
  if (mood === 'sleepy') {
    return <Path d={`M ${cx - 9} ${mouthY} Q ${cx} ${mouthY + 3} ${cx + 9} ${mouthY}`}
      stroke="#1A0A3C" strokeWidth="2.2" fill="none" strokeLinecap="round" />;
  }
  if (mood === 'grumpy') {
    // シンプルなフラウン（画像に近い）
    return <Path d={`M ${cx - 11} ${mouthY} Q ${cx} ${mouthY - 9} ${cx + 11} ${mouthY}`}
      stroke="#1A0A3C" strokeWidth="2.8" fill="none" strokeLinecap="round" />;
  }
  // happy / normal: 笑顔
  return <Path d={`M ${cx - 13} ${mouthY} Q ${cx} ${mouthY + 11} ${cx + 13} ${mouthY}`}
    stroke="#1A0A3C" strokeWidth="2.8" fill="none" strokeLinecap="round" />;
}

/* ─── Egg専用パーツ（動画のリアル調たまごに合わせた点目スタイル） ─── */
function EggEyes({ mood, leftX, rightX, eyeY }: {
  mood: MascotMood; leftX: number; rightX: number; eyeY: number;
}) {
  const INK = '#1F1B24';
  if (mood === 'sleepy') {
    // ほぼ閉じた目（まぶた線）
    return (
      <G>
        <Path d={`M ${leftX - 5} ${eyeY} Q ${leftX} ${eyeY + 3} ${leftX + 5} ${eyeY}`}
          stroke={INK} strokeWidth="2.2" fill="none" strokeLinecap="round" />
        <Path d={`M ${rightX - 5} ${eyeY} Q ${rightX} ${eyeY + 3} ${rightX + 5} ${eyeY}`}
          stroke={INK} strokeWidth="2.2" fill="none" strokeLinecap="round" />
      </G>
    );
  }
  if (mood === 'tired') {
    // 半目（まぶたが半分かぶる）
    return (
      <G>
        <Circle cx={leftX}  cy={eyeY} r={4.5} fill={INK} />
        <Circle cx={rightX} cy={eyeY} r={4.5} fill={INK} />
        <Rect x={leftX - 5.5}  y={eyeY - 6} width={11} height={5.5} rx={2.5} fill="#F3EEF7" />
        <Rect x={rightX - 5.5} y={eyeY - 6} width={11} height={5.5} rx={2.5} fill="#F3EEF7" />
        <Path d={`M ${leftX - 5} ${eyeY - 1} L ${leftX + 5} ${eyeY - 1}`}
          stroke={INK} strokeWidth="1.6" strokeLinecap="round" />
        <Path d={`M ${rightX - 5} ${eyeY - 1} L ${rightX + 5} ${eyeY - 1}`}
          stroke={INK} strokeWidth="1.6" strokeLinecap="round" />
      </G>
    );
  }
  if (mood === 'excited') {
    // 大きめキラキラ目
    return (
      <G>
        <Circle cx={leftX}  cy={eyeY} r={5.5} fill={INK} />
        <Circle cx={rightX} cy={eyeY} r={5.5} fill={INK} />
        <Circle cx={leftX - 1.5}  cy={eyeY - 1.5} r={1.8} fill="white" />
        <Circle cx={rightX - 1.5} cy={eyeY - 1.5} r={1.8} fill="white" />
        <Circle cx={leftX + 1.8}  cy={eyeY + 1.8} r={0.9} fill="white" />
        <Circle cx={rightX + 1.8} cy={eyeY + 1.8} r={0.9} fill="white" />
      </G>
    );
  }
  if (mood === 'grumpy') {
    // 点目＋への字まゆ
    return (
      <G>
        <Circle cx={leftX}  cy={eyeY} r={4.5} fill={INK} />
        <Circle cx={rightX} cy={eyeY} r={4.5} fill={INK} />
        <Circle cx={leftX - 1.2}  cy={eyeY - 1.2} r={1.3} fill="white" />
        <Circle cx={rightX - 1.2} cy={eyeY - 1.2} r={1.3} fill="white" />
        <Line x1={leftX - 5} y1={eyeY - 8} x2={leftX + 4} y2={eyeY - 11}
          stroke={INK} strokeWidth="2.2" strokeLinecap="round" />
        <Line x1={rightX - 4} y1={eyeY - 11} x2={rightX + 5} y2={eyeY - 8}
          stroke={INK} strokeWidth="2.2" strokeLinecap="round" />
      </G>
    );
  }
  // normal / happy: 動画そのままの丸い点目
  return (
    <G>
      <Circle cx={leftX}  cy={eyeY} r={4.5} fill={INK} />
      <Circle cx={rightX} cy={eyeY} r={4.5} fill={INK} />
      <Circle cx={leftX - 1.2}  cy={eyeY - 1.2} r={1.3} fill="white" />
      <Circle cx={rightX - 1.2} cy={eyeY - 1.2} r={1.3} fill="white" />
    </G>
  );
}

function EggMouth({ mood, cx, mouthY }: { mood: MascotMood; cx: number; mouthY: number }) {
  const INK = '#1F1B24';
  if (mood === 'excited') {
    return <Ellipse cx={cx} cy={mouthY} rx={5} ry={4} fill={INK} />;
  }
  if (mood === 'happy') {
    return <Path d={`M ${cx - 7} ${mouthY - 2} Q ${cx} ${mouthY + 4} ${cx + 7} ${mouthY - 2}`}
      stroke={INK} strokeWidth="2.4" fill="none" strokeLinecap="round" />;
  }
  if (mood === 'sleepy') {
    return <Path d={`M ${cx - 4} ${mouthY} Q ${cx} ${mouthY + 2} ${cx + 4} ${mouthY}`}
      stroke={INK} strokeWidth="2" fill="none" strokeLinecap="round" />;
  }
  // normal / grumpy / tired: 動画のへの字口
  return <Path d={`M ${cx - 7} ${mouthY + 1} Q ${cx} ${mouthY - 5} ${cx + 7} ${mouthY + 1}`}
    stroke={INK} strokeWidth="2.4" fill="none" strokeLinecap="round" />;
}

/* ─── Stage SVGs ─── */
function EggSvg({ mood, size }: { mood: MascotMood; size: number }) {
  const cx = 60;
  return (
    <Svg width={size} height={size} viewBox="0 0 120 130">
      <Defs>
        <RadialGradient id="eggGrad" cx="40%" cy="32%" r="70%">
          <Stop offset="0%"   stopColor="#FFFFFF" />
          <Stop offset="55%"  stopColor="#FDFCFB" />
          <Stop offset="85%"  stopColor="#F1EDE9" />
          <Stop offset="100%" stopColor="#E2DBD5" />
        </RadialGradient>
        <RadialGradient id="eggShine" cx="35%" cy="22%" r="38%">
          <Stop offset="0%"   stopColor="#FFFFFF" stopOpacity="0.95" />
          <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      {/* 影 */}
      <Ellipse cx={cx} cy={119} rx={28} ry={6} fill="#00000014" />
      {/* ボディ（上がやや細いたまご型） */}
      <Path
        d={`M 60 19
            C 40 19, 22 42, 22 74
            C 22 100, 39 121, 60 121
            C 81 121, 98 100, 98 74
            C 98 42, 80 19, 60 19 Z`}
        fill="url(#eggGrad)"
      />
      {/* ハイライト */}
      <Ellipse cx={cx - 10} cy={44} rx={16} ry={13} fill="url(#eggShine)" />
      {/* 細い紫ボルト（頭のてっぺん寄り） */}
      <Path d="M 66 27 L 60 38 L 66 40 L 59 52"
        stroke="#A78BFA" strokeWidth="3" fill="none"
        strokeLinecap="round" strokeLinejoin="round" />
      {/* 目 */}
      <EggEyes mood={mood} leftX={48} rightX={72} eyeY={70} />
      {/* ほっぺ */}
      <Ellipse cx={38} cy={80} rx={7.5} ry={5} fill="#F9A8C0" opacity="0.7" />
      <Ellipse cx={82} cy={80} rx={7.5} ry={5} fill="#F9A8C0" opacity="0.7" />
      {/* 口 */}
      <EggMouth mood={mood} cx={cx} mouthY={82} />
    </Svg>
  );
}

function ChickSvg({ mood, size }: { mood: MascotMood; size: number }) {
  const cx = 60;
  return (
    <Svg width={size} height={size} viewBox="0 0 120 130">
      <Defs>
        <RadialGradient id="chickGrad" cx="38%" cy="32%" r="65%">
          <Stop offset="0%" stopColor="#C8F7EE" />
          <Stop offset="100%" stopColor="#80E8D0" />
        </RadialGradient>
      </Defs>
      <Ellipse cx={cx} cy={118} rx={30} ry={6} fill="#00000015" />
      <Circle cx={cx} cy={76} r={42} fill="url(#chickGrad)" />
      <Ellipse cx={19} cy={80} rx={14} ry={9} fill="#80E8D0" transform="rotate(-20, 19, 80)" />
      <Ellipse cx={101} cy={80} rx={14} ry={9} fill="#80E8D0" transform="rotate(20, 101, 80)" />
      <Line x1={cx} y1={34} x2={cx} y2={18} stroke="#00C4A7" strokeWidth="2.5" strokeLinecap="round" />
      <Circle cx={cx} cy={15} r={5} fill="#00C4A7" />
      <Eyes mood={mood} cx={cx} leftX={46} rightX={74} eyeY={72} />
      <Ellipse cx={32} cy={82} rx={9} ry={6} fill="#FFB3D1" opacity="0.45" />
      <Ellipse cx={88} cy={82} rx={9} ry={6} fill="#FFB3D1" opacity="0.45" />
      <Mouth mood={mood} cx={cx} mouthY={88} />
    </Svg>
  );
}

function KokoronSvg({ mood, size }: { mood: MascotMood; size: number }) {
  const cx = 60;
  return (
    <Svg width={size} height={size} viewBox="0 0 120 130">
      <Defs>
        <RadialGradient id="kkGrad" cx="38%" cy="32%" r="65%">
          <Stop offset="0%" stopColor="#64FFDA" />
          <Stop offset="100%" stopColor="#00BFA5" />
        </RadialGradient>
      </Defs>
      <Circle cx={cx} cy={74} r={48} fill="#00D4AA20" />
      <Ellipse cx={cx} cy={120} rx={34} ry={7} fill="#00000018" />
      <Circle cx={cx} cy={74} r={44} fill="url(#kkGrad)" />
      <Path d="M 18 80 Q 8 70 14 58" stroke="#00BFA5" strokeWidth="8" fill="none" strokeLinecap="round" />
      <Path d="M 102 80 Q 112 70 106 58" stroke="#00BFA5" strokeWidth="8" fill="none" strokeLinecap="round" />
      <Line x1={cx} y1={30} x2={cx - 6} y2={14} stroke="#00BFA5" strokeWidth="3" strokeLinecap="round" />
      <Path d={`M ${cx - 6} 10 C ${cx - 10} 4, ${cx - 18} 4, ${cx - 18} 11 C ${cx - 18} 17, ${cx - 6} 24, ${cx - 6} 24 C ${cx - 6} 24, ${cx + 6} 17, ${cx + 6} 11 C ${cx + 6} 4, ${cx + 2} 4, ${cx - 6} 10 Z`}
        fill="#FF6FA3" />
      <Eyes mood={mood} cx={cx} leftX={44} rightX={76} eyeY={70} />
      <Ellipse cx={30} cy={82} rx={10} ry={6} fill="#FFB3D1" opacity="0.5" />
      <Ellipse cx={90} cy={82} rx={10} ry={6} fill="#FFB3D1" opacity="0.5" />
      <Mouth mood={mood} cx={cx} mouthY={90} />
    </Svg>
  );
}

function MasterSvg({ mood, size }: { mood: MascotMood; size: number }) {
  const cx = 60;
  return (
    <Svg width={size} height={size} viewBox="0 0 120 140">
      <Defs>
        <RadialGradient id="masterGrad" cx="38%" cy="32%" r="65%">
          <Stop offset="0%" stopColor="#FFE28A" />
          <Stop offset="100%" stopColor="#FFAD6F" />
        </RadialGradient>
      </Defs>
      <Circle cx={cx} cy={78} r={56} fill="#FFD16618" />
      <Circle cx={cx} cy={78} r={50} fill="#FFD16610" />
      <Ellipse cx={cx} cy={126} rx={36} ry={8} fill="#00000015" />
      <Circle cx={cx} cy={78} r={44} fill="url(#masterGrad)" />
      <Path d="M 18 84 Q 6 72 14 58" stroke="#FFA040" strokeWidth="9" fill="none" strokeLinecap="round" />
      <Path d="M 102 84 Q 114 72 106 58" stroke="#FFA040" strokeWidth="9" fill="none" strokeLinecap="round" />
      <Circle cx={22} cy={38} r={4} fill="#FFD166" />
      <Circle cx={98} cy={38} r={3} fill="#FF6FA3" />
      <Circle cx={110} cy={70} r={3} fill="#FFD166" />
      <Circle cx={10} cy={70} r={2.5} fill="#64FFDA" />
      <Path d="M 34 34 L 40 22 L 50 30 L 60 18 L 70 30 L 80 22 L 86 34 Z"
        fill="#FFD166" stroke="#FFA040" strokeWidth="1.5" strokeLinejoin="round" />
      <Circle cx={60} cy={20} r={4} fill="#FF6FA3" />
      <Circle cx={40} cy={24} r={3} fill="#00D4AA" />
      <Circle cx={80} cy={24} r={3} fill="#00D4AA" />
      <Eyes mood={mood} cx={cx} leftX={44} rightX={76} eyeY={74} />
      <Ellipse cx={30} cy={86} rx={10} ry={6} fill="#FFB3D1" opacity="0.55" />
      <Ellipse cx={90} cy={86} rx={10} ry={6} fill="#FFB3D1" opacity="0.55" />
      <Mouth mood={mood} cx={cx} mouthY={94} />
    </Svg>
  );
}

/* ─── ⭐ Star-type Kokoron ─── */
function KokoronStarSvg({ mood, size }: { mood: MascotMood; size: number }) {
  const cx = 60;
  return (
    <Svg width={size} height={size} viewBox="0 0 120 130">
      <Defs>
        <RadialGradient id="kkStarGrad" cx="38%" cy="32%" r="65%">
          <Stop offset="0%" stopColor="#90CAF9" />
          <Stop offset="100%" stopColor="#1565C0" />
        </RadialGradient>
      </Defs>
      {/* glow ring */}
      <Circle cx={cx} cy={74} r={48} fill="#42A5F520" />
      <Ellipse cx={cx} cy={120} rx={34} ry={7} fill="#00000018" />
      <Circle cx={cx} cy={74} r={44} fill="url(#kkStarGrad)" />
      {/* wings — blue tint */}
      <Path d="M 18 80 Q 8 70 14 58" stroke="#1565C0" strokeWidth="8" fill="none" strokeLinecap="round" />
      <Path d="M 102 80 Q 112 70 106 58" stroke="#1565C0" strokeWidth="8" fill="none" strokeLinecap="round" />
      {/* antenna */}
      <Line x1={cx} y1={30} x2={cx - 6} y2={16} stroke="#1565C0" strokeWidth="3" strokeLinecap="round" />
      {/* 5-pointed star at antenna tip */}
      <Path d="M54,4 L56.6,11.8 L65,11.8 L58.4,16.5 L61,24 L54,19.5 L47,24 L49.6,16.5 L43,11.8 L51.4,11.8 Z"
        fill="#FFD54F" stroke="#FFA000" strokeWidth="0.8" />
      <Eyes mood={mood} cx={cx} leftX={44} rightX={76} eyeY={70} />
      <Ellipse cx={30} cy={82} rx={10} ry={6} fill="#90CAF9" opacity="0.6" />
      <Ellipse cx={90} cy={82} rx={10} ry={6} fill="#90CAF9" opacity="0.6" />
      <Mouth mood={mood} cx={cx} mouthY={90} />
    </Svg>
  );
}

/* ─── 👑 Crown-type Kokoron ─── */
function KokoronCrownSvg({ mood, size }: { mood: MascotMood; size: number }) {
  const cx = 60;
  return (
    <Svg width={size} height={size} viewBox="0 0 120 130">
      <Defs>
        <RadialGradient id="kkCrownGrad" cx="38%" cy="32%" r="65%">
          <Stop offset="0%" stopColor="#FFE082" />
          <Stop offset="100%" stopColor="#F57F17" />
        </RadialGradient>
      </Defs>
      <Circle cx={cx} cy={74} r={48} fill="#FFD54F20" />
      <Ellipse cx={cx} cy={120} rx={34} ry={7} fill="#00000018" />
      <Circle cx={cx} cy={74} r={44} fill="url(#kkCrownGrad)" />
      {/* wings — amber */}
      <Path d="M 18 80 Q 8 70 14 58" stroke="#F57F17" strokeWidth="8" fill="none" strokeLinecap="round" />
      <Path d="M 102 80 Q 112 70 106 58" stroke="#F57F17" strokeWidth="8" fill="none" strokeLinecap="round" />
      {/* small crown */}
      <Path d="M 44 26 L 44 15 L 50 21 L 54 12 L 58 21 L 64 15 L 64 26 Z"
        fill="#FFD54F" stroke="#F57F17" strokeWidth="1.2" strokeLinejoin="round" />
      {/* crown jewels */}
      <Circle cx={54} cy={13} r={2.5} fill="#FF4081" />
      <Circle cx={44} cy={16} r={1.8} fill="#64FFDA" />
      <Circle cx={64} cy={16} r={1.8} fill="#64FFDA" />
      <Eyes mood={mood} cx={cx} leftX={44} rightX={76} eyeY={70} />
      <Ellipse cx={30} cy={82} rx={10} ry={6} fill="#FFCC02" opacity="0.55" />
      <Ellipse cx={90} cy={82} rx={10} ry={6} fill="#FFCC02" opacity="0.55" />
      <Mouth mood={mood} cx={cx} mouthY={90} />
    </Svg>
  );
}

/* ─── 💗 Heart-type Master ─── */
function MasterHeartSvg({ mood, size }: { mood: MascotMood; size: number }) {
  const cx = 60;
  return (
    <Svg width={size} height={size} viewBox="0 0 120 140">
      <Defs>
        <RadialGradient id="masterHeartGrad" cx="38%" cy="32%" r="65%">
          <Stop offset="0%" stopColor="#FF80AB" />
          <Stop offset="100%" stopColor="#C2185B" />
        </RadialGradient>
      </Defs>
      {/* halo rings */}
      <Circle cx={cx} cy={78} r={56} fill="#FF4F8118" />
      <Circle cx={cx} cy={78} r={50} fill="#FF4F8110" />
      <Ellipse cx={cx} cy={126} rx={36} ry={8} fill="#00000015" />
      <Circle cx={cx} cy={78} r={44} fill="url(#masterHeartGrad)" />
      {/* wings */}
      <Path d="M 18 84 Q 6 72 14 58"  stroke="#C2185B" strokeWidth="9" fill="none" strokeLinecap="round" />
      <Path d="M 102 84 Q 114 72 106 58" stroke="#C2185B" strokeWidth="9" fill="none" strokeLinecap="round" />
      {/* floating hearts around body */}
      <Path d="M22,38 C20,34 14,34 14,38 C14,42 22,46 22,46 C22,46 30,42 30,38 C30,34 24,34 22,38 Z"
        fill="#FF4081" opacity="0.7" />
      <Path d="M98,38 C96,34 90,34 90,38 C90,42 98,46 98,46 C98,46 106,42 106,38 C106,34 100,34 98,38 Z"
        fill="#FF4081" opacity="0.7" />
      <Circle cx={110} cy={70} r={2.5} fill="#FF80AB" />
      <Circle cx={10}  cy={70} r={2}   fill="#FF80AB" />
      {/* large heart crown */}
      <Path d={`M${cx},34 C${cx-5},27 ${cx-14},27 ${cx-14},34 C${cx-14},41 ${cx},48 ${cx},48 C${cx},48 ${cx+14},41 ${cx+14},34 C${cx+14},27 ${cx+5},27 ${cx},34 Z`}
        fill="#FF4081" stroke="#C2185B" strokeWidth="1.2" />
      {/* jewel */}
      <Circle cx={cx} cy={29} r={3} fill="#FFD54F" />
      <Eyes mood={mood} cx={cx} leftX={44} rightX={76} eyeY={74} />
      <Ellipse cx={30} cy={86} rx={10} ry={6} fill="#FF80AB" opacity="0.6" />
      <Ellipse cx={90} cy={86} rx={10} ry={6} fill="#FF80AB" opacity="0.6" />
      <Mouth mood={mood} cx={cx} mouthY={94} />
    </Svg>
  );
}

/* ─── ⭐ Star-type Master ─── */
function MasterStarSvg({ mood, size }: { mood: MascotMood; size: number }) {
  const cx = 60;
  return (
    <Svg width={size} height={size} viewBox="0 0 120 140">
      <Defs>
        <RadialGradient id="masterStarGrad" cx="38%" cy="32%" r="65%">
          <Stop offset="0%" stopColor="#82B1FF" />
          <Stop offset="100%" stopColor="#283593" />
        </RadialGradient>
      </Defs>
      {/* star-burst halo */}
      <Circle cx={cx} cy={78} r={56} fill="#3F51B518" />
      <Circle cx={cx} cy={78} r={50} fill="#3F51B510" />
      <Ellipse cx={cx} cy={126} rx={36} ry={8} fill="#00000015" />
      <Circle cx={cx} cy={78} r={44} fill="url(#masterStarGrad)" />
      {/* wings */}
      <Path d="M 18 84 Q 6 72 14 58"  stroke="#283593" strokeWidth="9" fill="none" strokeLinecap="round" />
      <Path d="M 102 84 Q 114 72 106 58" stroke="#283593" strokeWidth="9" fill="none" strokeLinecap="round" />
      {/* floating star accents */}
      <Path d="M22,42 L23.5,46.8 L28.5,46.8 L24.5,49.7 L26,54.5 L22,51.5 L18,54.5 L19.5,49.7 L15.5,46.8 L20.5,46.8 Z"
        fill="#FFD54F" opacity="0.75" />
      <Path d="M98,42 L99.5,46.8 L104.5,46.8 L100.5,49.7 L102,54.5 L98,51.5 L94,54.5 L95.5,49.7 L91.5,46.8 L96.5,46.8 Z"
        fill="#FFD54F" opacity="0.75" />
      <Circle cx={110} cy={72} r={2.5} fill="#FFD54F" />
      <Circle cx={10}  cy={72} r={2}   fill="#64B5F6" />
      {/* large star crown */}
      <Path d={`M${cx},16 L${cx+3.5},25 L${cx+13},25 L${cx+5},31 L${cx+8},40 L${cx},34 L${cx-8},40 L${cx-5},31 L${cx-13},25 L${cx-3.5},25 Z`}
        fill="#FFD54F" stroke="#FFA000" strokeWidth="1.2" strokeLinejoin="round" />
      {/* center gem */}
      <Circle cx={cx} cy={21} r={3.5} fill="#40C4FF" />
      <Eyes mood={mood} cx={cx} leftX={44} rightX={76} eyeY={74} />
      <Ellipse cx={30} cy={86} rx={10} ry={6} fill="#90CAF9" opacity="0.6" />
      <Ellipse cx={90} cy={86} rx={10} ry={6} fill="#90CAF9" opacity="0.6" />
      <Mouth mood={mood} cx={cx} mouthY={94} />
    </Svg>
  );
}

/* ─── Main component ─── */
export function Mascot({ stage, mood, evolutionType, size = 140, onPress, onPet, idleBehavior = 'normal', isEating = false }: MascotProps) {
  const bounce = useSharedValue(0);
  const scaleX = useSharedValue(1);
  const scaleY = useSharedValue(1);
  const rotate = useSharedValue(0);

  /* petting state */
  const [showHearts, setShowHearts] = useState(false);
  const [petKey,     setPetKey]     = useState(0);
  const onPressRef = useRef(onPress);
  const onPetRef   = useRef(onPet);
  useEffect(() => { onPressRef.current = onPress; }, [onPress]);
  useEffect(() => { onPetRef.current   = onPet;   }, [onPet]);

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

    if (idleBehavior === 'rolling') {
      // Rock side to side
      rotate.value = withRepeat(
        withSequence(
          withTiming(-14, { duration: 500 }),
          withTiming(14, { duration: 500 }),
        ),
        -1,
        true
      );
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

    if (idleBehavior === 'sleeping') {
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

    if (idleBehavior === 'playing') {
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
    const speed = mood === 'excited' ? 500 : mood === 'tired' || mood === 'sleepy' ? 1800 : 1100;
    const height = mood === 'excited' ? 14 : mood === 'tired' ? 3 : 8;

    bounce.value = withRepeat(
      withSequence(
        withTiming(-height, { duration: speed }),
        withTiming(0, { duration: speed })
      ),
      -1,
      false
    );

    if (mood === 'excited') {
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
  }, [mood, idleBehavior]);

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
          doPetAnimation();
          setShowHearts(true);
          setPetKey(k => k + 1);
          setTimeout(() => setShowHearts(false), 1400);
          onPetRef.current?.();
        }
      },

      onPanResponderRelease: (_, gs) => {
        if (!wasPet && Math.abs(gs.dx) < 12 && Math.abs(gs.dy) < 12) {
          // plain tap
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

  const SvgComponent =
    stage === 'egg'   ? EggSvg :
    stage === 'chick' ? ChickSvg :
    stage === 'master'
      ? (evolutionType === 'heart' ? MasterHeartSvg
       : evolutionType === 'star'  ? MasterStarSvg
       : MasterSvg)
      : /* kokoron */
        (evolutionType === 'star'  ? KokoronStarSvg
       : evolutionType === 'crown' ? KokoronCrownSvg
       : KokoronSvg);

  return (
    <View {...panResponder.panHandlers}>
      <View>
        <Animated.View style={style}>
          <SvgComponent mood={mood} size={size} />
        </Animated.View>
        {idleBehavior === 'sleeping' && <ZzzOverlay size={size} />}
        {showHearts && <HeartsOverlay size={size} petKey={petKey} />}
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
