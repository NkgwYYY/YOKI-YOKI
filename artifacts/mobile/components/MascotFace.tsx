/**
 * MascotFace — tiny inline SVG of the こころん face, sized for calendar cells.
 * Mood 1-5 maps to 5 expression levels without needing the full Mascot component.
 */
import React from 'react';
import Svg, {
  Circle, Ellipse, Path, G, Defs, RadialGradient, Stop, Line, Rect,
} from 'react-native-svg';

// 1=最悪, 2=辛い, 3=普通, 4=良い, 5=最高
export type MoodLevel = 1 | 2 | 3 | 4 | 5;

/* ── shared coords (100×100 viewBox) ── */
const CX   = 50;
const EYE_L = 36;
const EYE_R = 64;
const EYE_Y = 48;
const MOUTH_Y = 63;
const BLUSH_Y = 58;

/* ── per-mood eyes ── */
function Eyes({ mood }: { mood: MoodLevel }) {
  if (mood === 1) {
    // tired — heavy droopy lids, looking down
    return (
      <G>
        <Circle cx={EYE_L} cy={EYE_Y} r={7} fill="white" />
        <Circle cx={EYE_R} cy={EYE_Y} r={7} fill="white" />
        {/* droopy lids covering top half */}
        <Rect x={EYE_L - 7} y={EYE_Y - 7} width={14} height={8} fill="#00BFA5" rx={3} />
        <Rect x={EYE_R - 7} y={EYE_Y - 7} width={14} height={8} fill="#00BFA5" rx={3} />
        <Circle cx={EYE_L}   cy={EYE_Y + 2} r={4} fill="#2D1B69" />
        <Circle cx={EYE_R}   cy={EYE_Y + 2} r={4} fill="#2D1B69" />
      </G>
    );
  }
  if (mood === 2) {
    // sleepy / sad — half-closed, pupils low
    return (
      <G>
        <Ellipse cx={EYE_L} cy={EYE_Y} rx={7} ry={5} fill="white" />
        <Ellipse cx={EYE_R} cy={EYE_Y} rx={7} ry={5} fill="white" />
        <Rect x={EYE_L - 7} y={EYE_Y - 6} width={14} height={5} fill="#00BFA5" rx={2} />
        <Rect x={EYE_R - 7} y={EYE_Y - 6} width={14} height={5} fill="#00BFA5" rx={2} />
        <Circle cx={EYE_L + 1} cy={EYE_Y + 1} r={3} fill="#2D1B69" />
        <Circle cx={EYE_R + 1} cy={EYE_Y + 1} r={3} fill="#2D1B69" />
      </G>
    );
  }
  if (mood === 3) {
    // normal — relaxed, neutral
    return (
      <G>
        <Circle cx={EYE_L} cy={EYE_Y} r={7} fill="white" />
        <Circle cx={EYE_R} cy={EYE_Y} r={7} fill="white" />
        <Circle cx={EYE_L + 1} cy={EYE_Y + 1} r={4.5} fill="#2D1B69" />
        <Circle cx={EYE_R + 1} cy={EYE_Y + 1} r={4.5} fill="#2D1B69" />
        <Circle cx={EYE_L}     cy={EYE_Y - 1} r={1.5} fill="white" />
        <Circle cx={EYE_R}     cy={EYE_Y - 1} r={1.5} fill="white" />
      </G>
    );
  }
  if (mood === 4) {
    // happy — squinted, brow lifted
    return (
      <G>
        <Circle cx={EYE_L} cy={EYE_Y} r={7} fill="white" />
        <Circle cx={EYE_R} cy={EYE_Y} r={7} fill="white" />
        {/* happy squint lid */}
        <Rect x={EYE_L - 7} y={EYE_Y - 7} width={14} height={5} fill="#00BFA5" rx={2} />
        <Rect x={EYE_R - 7} y={EYE_Y - 7} width={14} height={5} fill="#00BFA5" rx={2} />
        <Circle cx={EYE_L}   cy={EYE_Y + 1} r={4} fill="#2D1B69" />
        <Circle cx={EYE_R}   cy={EYE_Y + 1} r={4} fill="#2D1B69" />
        <Circle cx={EYE_L - 1} cy={EYE_Y}   r={1.5} fill="white" />
        <Circle cx={EYE_R - 1} cy={EYE_Y}   r={1.5} fill="white" />
      </G>
    );
  }
  // mood 5 — excited, big shiny eyes
  return (
    <G>
      <Circle cx={EYE_L} cy={EYE_Y} r={8} fill="white" />
      <Circle cx={EYE_R} cy={EYE_Y} r={8} fill="white" />
      <Circle cx={EYE_L} cy={EYE_Y + 1} r={5} fill="#2D1B69" />
      <Circle cx={EYE_R} cy={EYE_Y + 1} r={5} fill="#2D1B69" />
      <Circle cx={EYE_L - 1} cy={EYE_Y - 1} r={2} fill="white" />
      <Circle cx={EYE_R - 1} cy={EYE_Y - 1} r={2} fill="white" />
      {/* sparkle above left eye */}
      <Line x1={EYE_L - 11} y1={EYE_Y - 8}  x2={EYE_L - 7} y2={EYE_Y - 4}  stroke="#FFD166" strokeWidth="1.5" strokeLinecap="round" />
      <Line x1={EYE_L - 13} y1={EYE_Y}       x2={EYE_L - 8} y2={EYE_Y}      stroke="#FFD166" strokeWidth="1.5" strokeLinecap="round" />
    </G>
  );
}

/* ── per-mood mouth ── */
function Mouth({ mood }: { mood: MoodLevel }) {
  const y = MOUTH_Y;
  if (mood === 1) {
    // sad frown
    return <Path d={`M ${CX - 10} ${y} Q ${CX} ${y - 8} ${CX + 10} ${y}`}
      stroke="#2D1B69" strokeWidth="2.5" fill="none" strokeLinecap="round" />;
  }
  if (mood === 2) {
    // slight frown
    return <Path d={`M ${CX - 8} ${y} Q ${CX} ${y - 4} ${CX + 8} ${y}`}
      stroke="#2D1B69" strokeWidth="2" fill="none" strokeLinecap="round" />;
  }
  if (mood === 3) {
    // neutral flat line
    return <Path d={`M ${CX - 9} ${y} Q ${CX} ${y + 3} ${CX + 9} ${y}`}
      stroke="#2D1B69" strokeWidth="2" fill="none" strokeLinecap="round" />;
  }
  if (mood === 4) {
    // smile
    return <Path d={`M ${CX - 10} ${y} Q ${CX} ${y + 9} ${CX + 10} ${y}`}
      stroke="#2D1B69" strokeWidth="2.5" fill="none" strokeLinecap="round" />;
  }
  // mood 5 — big open smile
  return <Ellipse cx={CX} cy={y + 2} rx={9} ry={6} fill="#2D1B69" />;
}

interface Props {
  mood: MoodLevel;
  size?: number;
}

export function MascotFace({ mood, size = 34 }: Props) {
  // Gradient id must be unique per mood to avoid SVG id collisions
  const gradId = `mfGrad${mood}`;
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <RadialGradient id={gradId} cx="38%" cy="32%" r="65%">
          <Stop offset="0%" stopColor="#64FFDA" />
          <Stop offset="100%" stopColor="#00BFA5" />
        </RadialGradient>
      </Defs>

      {/* Soft glow ring */}
      <Circle cx={CX} cy={55} r={42} fill="#00D4AA18" />
      {/* Body */}
      <Circle cx={CX} cy={55} r={38} fill={`url(#${gradId})`} />

      {/* Heart antenna */}
      <Line x1={CX} y1={17} x2={CX - 5} y2={8} stroke="#00BFA5" strokeWidth="2.5" strokeLinecap="round" />
      <Path
        d={`M ${CX-5} 5 C ${CX-8} 1, ${CX-14} 1, ${CX-14} 6 C ${CX-14} 11, ${CX-5} 16, ${CX-5} 16 C ${CX-5} 16, ${CX+4} 11, ${CX+4} 6 C ${CX+4} 1, ${CX+1} 1, ${CX-5} 5 Z`}
        fill="#FF6FA3"
      />

      {/* Blush */}
      <Ellipse cx={22} cy={BLUSH_Y} rx={8} ry={5} fill="#FFB3D1" opacity={mood <= 2 ? 0.25 : 0.5} />
      <Ellipse cx={78} cy={BLUSH_Y} rx={8} ry={5} fill="#FFB3D1" opacity={mood <= 2 ? 0.25 : 0.5} />

      {/* Face */}
      <Eyes mood={mood} />
      <Mouth mood={mood} />
    </Svg>
  );
}
