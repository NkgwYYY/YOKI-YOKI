import React, { useEffect } from 'react';
import { TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import Svg, {
  Circle, Ellipse, Path, G, Defs,
  RadialGradient, Stop, Line, Rect,
} from 'react-native-svg';
import { MascotStage, MascotMood } from '@/utils/mascotUtils';

interface MascotProps {
  stage: MascotStage;
  mood: MascotMood;
  size?: number;
  onPress?: () => void;
}

/* ─── per-mood eye + mouth shapes ─── */
function Eyes({ mood, cx, leftX, rightX, eyeY }: {
  mood: MascotMood; cx: number; leftX: number; rightX: number; eyeY: number;
}) {
  if (mood === 'sleepy') {
    return (
      <G>
        {/* half-closed */}
        <Ellipse cx={leftX}  cy={eyeY} rx={7} ry={4} fill="white" />
        <Ellipse cx={rightX} cy={eyeY} rx={7} ry={4} fill="white" />
        <Rect x={leftX - 7}  y={eyeY - 5} width={14} height={5} fill="#C9B8E8" rx={2} />
        <Rect x={rightX - 7} y={eyeY - 5} width={14} height={5} fill="#C9B8E8" rx={2} />
        <Circle cx={leftX + 1}  cy={eyeY + 1} r={3} fill="#2D1B69" />
        <Circle cx={rightX + 1} cy={eyeY + 1} r={3} fill="#2D1B69" />
      </G>
    );
  }
  if (mood === 'excited') {
    return (
      <G>
        <Circle cx={leftX}  cy={eyeY} r={8} fill="white" />
        <Circle cx={rightX} cy={eyeY} r={8} fill="white" />
        {/* star pupils */}
        <Circle cx={leftX}  cy={eyeY + 1} r={5} fill="#2D1B69" />
        <Circle cx={rightX} cy={eyeY + 1} r={5} fill="#2D1B69" />
        <Circle cx={leftX - 1}  cy={eyeY - 1} r={2} fill="white" />
        <Circle cx={rightX - 1} cy={eyeY - 1} r={2} fill="white" />
        {/* sparkle lines */}
        <Line x1={leftX - 10} y1={eyeY - 8} x2={leftX - 6} y2={eyeY - 4} stroke="#FFD166" strokeWidth="1.5" strokeLinecap="round" />
        <Line x1={leftX - 12} y1={eyeY}     x2={leftX - 7} y2={eyeY}     stroke="#FFD166" strokeWidth="1.5" strokeLinecap="round" />
      </G>
    );
  }
  if (mood === 'tired') {
    return (
      <G>
        <Circle cx={leftX}  cy={eyeY} r={7} fill="white" />
        <Circle cx={rightX} cy={eyeY} r={7} fill="white" />
        {/* droopy eyelid */}
        <Rect x={leftX - 7}  y={eyeY - 7} width={14} height={7} fill="#C9B8E8" rx={3} />
        <Rect x={rightX - 7} y={eyeY - 7} width={14} height={7} fill="#C9B8E8" rx={3} />
        <Circle cx={leftX}  cy={eyeY + 2} r={4} fill="#2D1B69" />
        <Circle cx={rightX} cy={eyeY + 2} r={4} fill="#2D1B69" />
      </G>
    );
  }
  if (mood === 'happy') {
    return (
      <G>
        {/* happy squint — arc instead of circle */}
        <Circle cx={leftX}  cy={eyeY} r={7} fill="white" />
        <Circle cx={rightX} cy={eyeY} r={7} fill="white" />
        <Rect x={leftX - 7}  y={eyeY - 7} width={14} height={5} fill="#C9B8E8" rx={2} />
        <Rect x={rightX - 7} y={eyeY - 7} width={14} height={5} fill="#C9B8E8" rx={2} />
        <Circle cx={leftX}  cy={eyeY + 1} r={4} fill="#2D1B69" />
        <Circle cx={rightX} cy={eyeY + 1} r={4} fill="#2D1B69" />
        <Circle cx={leftX - 1}  cy={eyeY} r={1.5} fill="white" />
        <Circle cx={rightX - 1} cy={eyeY} r={1.5} fill="white" />
      </G>
    );
  }
  // normal
  return (
    <G>
      <Circle cx={leftX}  cy={eyeY} r={7} fill="white" />
      <Circle cx={rightX} cy={eyeY} r={7} fill="white" />
      <Circle cx={leftX + 1}  cy={eyeY + 1} r={4.5} fill="#2D1B69" />
      <Circle cx={rightX + 1} cy={eyeY + 1} r={4.5} fill="#2D1B69" />
      <Circle cx={leftX - 1}  cy={eyeY - 1} r={1.5} fill="white" />
      <Circle cx={rightX - 1} cy={eyeY - 1} r={1.5} fill="white" />
    </G>
  );
}

function Mouth({ mood, cx, mouthY }: { mood: MascotMood; cx: number; mouthY: number }) {
  if (mood === 'excited') {
    return <Ellipse cx={cx} cy={mouthY} rx={10} ry={7} fill="#2D1B69" />;
  }
  if (mood === 'tired') {
    return <Path d={`M ${cx - 12} ${mouthY} Q ${cx} ${mouthY - 6} ${cx + 12} ${mouthY}`}
      stroke="#2D1B69" strokeWidth="2.5" fill="none" strokeLinecap="round" />;
  }
  if (mood === 'sleepy') {
    return <Path d={`M ${cx - 8} ${mouthY} Q ${cx} ${mouthY + 2} ${cx + 8} ${mouthY}`}
      stroke="#2D1B69" strokeWidth="2" fill="none" strokeLinecap="round" />;
  }
  // happy / normal / excited
  return <Path d={`M ${cx - 12} ${mouthY} Q ${cx} ${mouthY + 10} ${cx + 12} ${mouthY}`}
    stroke="#2D1B69" strokeWidth="2.5" fill="none" strokeLinecap="round" />;
}

/* ─── Stage SVGs ─── */
function EggSvg({ mood, size }: { mood: MascotMood; size: number }) {
  const cx = 60;
  return (
    <Svg width={size} height={size} viewBox="0 0 120 130">
      <Defs>
        <RadialGradient id="eggGrad" cx="40%" cy="35%" r="65%">
          <Stop offset="0%" stopColor="#F5EEFF" />
          <Stop offset="100%" stopColor="#DDD0F5" />
        </RadialGradient>
      </Defs>
      {/* Shadow */}
      <Ellipse cx={cx} cy={118} rx={28} ry={6} fill="#00000015" />
      {/* Egg body */}
      <Ellipse cx={cx} cy={70} rx={40} ry={50} fill="url(#eggGrad)" />
      {/* Crack */}
      <Path d="M 55 26 L 52 34 L 58 38 L 54 46" stroke="#C9B8E8" strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* Eyes */}
      <Eyes mood={mood} cx={cx} leftX={46} rightX={74} eyeY={68} />
      {/* Cheeks */}
      <Ellipse cx={36} cy={78} rx={8} ry={5} fill="#FFB3D1" opacity="0.45" />
      <Ellipse cx={84} cy={78} rx={8} ry={5} fill="#FFB3D1" opacity="0.45" />
      {/* Mouth */}
      <Mouth mood={mood} cx={cx} mouthY={84} />
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
      {/* Shadow */}
      <Ellipse cx={cx} cy={118} rx={30} ry={6} fill="#00000015" />
      {/* Body */}
      <Circle cx={cx} cy={76} r={42} fill="url(#chickGrad)" />
      {/* Tiny wings */}
      <Ellipse cx={19} cy={80} rx={14} ry={9} fill="#80E8D0" transform="rotate(-20, 19, 80)" />
      <Ellipse cx={101} cy={80} rx={14} ry={9} fill="#80E8D0" transform="rotate(20, 101, 80)" />
      {/* Antenna */}
      <Line x1={cx} y1={34} x2={cx} y2={18} stroke="#00C4A7" strokeWidth="2.5" strokeLinecap="round" />
      <Circle cx={cx} cy={15} r={5} fill="#00C4A7" />
      {/* Eyes */}
      <Eyes mood={mood} cx={cx} leftX={46} rightX={74} eyeY={72} />
      {/* Cheeks */}
      <Ellipse cx={32} cy={82} rx={9} ry={6} fill="#FFB3D1" opacity="0.45" />
      <Ellipse cx={88} cy={82} rx={9} ry={6} fill="#FFB3D1" opacity="0.45" />
      {/* Mouth */}
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
      {/* Glow */}
      <Circle cx={cx} cy={74} r={48} fill="#00D4AA20" />
      {/* Shadow */}
      <Ellipse cx={cx} cy={120} rx={34} ry={7} fill="#00000018" />
      {/* Body */}
      <Circle cx={cx} cy={74} r={44} fill="url(#kkGrad)" />
      {/* Arms */}
      <Path d="M 18 80 Q 8 70 14 58" stroke="#00BFA5" strokeWidth="8" fill="none" strokeLinecap="round" />
      <Path d="M 102 80 Q 112 70 106 58" stroke="#00BFA5" strokeWidth="8" fill="none" strokeLinecap="round" />
      {/* Antenna */}
      <Line x1={cx} y1={30} x2={cx - 6} y2={14} stroke="#00BFA5" strokeWidth="3" strokeLinecap="round" />
      {/* Heart */}
      <Path d={`M ${cx - 6} 10 C ${cx - 10} 4, ${cx - 18} 4, ${cx - 18} 11 C ${cx - 18} 17, ${cx - 6} 24, ${cx - 6} 24 C ${cx - 6} 24, ${cx + 6} 17, ${cx + 6} 11 C ${cx + 6} 4, ${cx + 2} 4, ${cx - 6} 10 Z`}
        fill="#FF6FA3" />
      {/* Eyes */}
      <Eyes mood={mood} cx={cx} leftX={44} rightX={76} eyeY={70} />
      {/* Cheeks */}
      <Ellipse cx={30} cy={82} rx={10} ry={6} fill="#FFB3D1" opacity="0.5" />
      <Ellipse cx={90} cy={82} rx={10} ry={6} fill="#FFB3D1" opacity="0.5" />
      {/* Mouth */}
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
      {/* Outer aura */}
      <Circle cx={cx} cy={78} r={56} fill="#FFD16618" />
      <Circle cx={cx} cy={78} r={50} fill="#FFD16610" />
      {/* Shadow */}
      <Ellipse cx={cx} cy={126} rx={36} ry={8} fill="#00000015" />
      {/* Body */}
      <Circle cx={cx} cy={78} r={44} fill="url(#masterGrad)" />
      {/* Arms */}
      <Path d="M 18 84 Q 6 72 14 58" stroke="#FFA040" strokeWidth="9" fill="none" strokeLinecap="round" />
      <Path d="M 102 84 Q 114 72 106 58" stroke="#FFA040" strokeWidth="9" fill="none" strokeLinecap="round" />
      {/* Stars around */}
      <Circle cx={22} cy={38} r={4} fill="#FFD166" />
      <Circle cx={98} cy={38} r={3} fill="#FF6FA3" />
      <Circle cx={110} cy={70} r={3} fill="#FFD166" />
      <Circle cx={10} cy={70} r={2.5} fill="#64FFDA" />
      {/* Crown */}
      <Path d="M 34 34 L 40 22 L 50 30 L 60 18 L 70 30 L 80 22 L 86 34 Z"
        fill="#FFD166" stroke="#FFA040" strokeWidth="1.5" strokeLinejoin="round" />
      <Circle cx={60} cy={20} r={4} fill="#FF6FA3" />
      <Circle cx={40} cy={24} r={3} fill="#00D4AA" />
      <Circle cx={80} cy={24} r={3} fill="#00D4AA" />
      {/* Eyes */}
      <Eyes mood={mood} cx={cx} leftX={44} rightX={76} eyeY={74} />
      {/* Cheeks */}
      <Ellipse cx={30} cy={86} rx={10} ry={6} fill="#FFB3D1" opacity="0.55" />
      <Ellipse cx={90} cy={86} rx={10} ry={6} fill="#FFB3D1" opacity="0.55" />
      {/* Mouth */}
      <Mouth mood={mood} cx={cx} mouthY={94} />
    </Svg>
  );
}

/* ─── Main component ─── */
export function Mascot({ stage, mood, size = 140, onPress }: MascotProps) {
  // Idle bounce
  const bounce = useSharedValue(0);
  const scaleX = useSharedValue(1);

  useEffect(() => {
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

    // Slight squish on excited
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
  }, [mood]);

  const handlePress = () => {
    bounce.value = withSequence(
      withSpring(-22, { damping: 6, stiffness: 300 }),
      withSpring(0, { damping: 8, stiffness: 200 })
    );
    onPress?.();
  };

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateY: bounce.value },
      { scaleX: scaleX.value },
    ],
  }));

  const SvgComponent =
    stage === 'egg' ? EggSvg :
    stage === 'chick' ? ChickSvg :
    stage === 'master' ? MasterSvg :
    KokoronSvg;

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.9}>
      <Animated.View style={style}>
        <SvgComponent mood={mood} size={size} />
      </Animated.View>
    </TouchableOpacity>
  );
}
