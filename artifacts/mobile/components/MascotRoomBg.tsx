/**
 * MascotRoomBg — マスコットカード背景の風景シーン
 * 時間帯・季節・記録日数/連続/レベルで空・自然・要素が変化する
 */
import React from 'react';
import { View, StyleSheet, useColorScheme } from 'react-native';
import Svg, {
  Defs, LinearGradient as SvgGrad, Stop, RadialGradient,
  Rect, Circle, Ellipse, Path, G, Text as SvgText,
} from 'react-native-svg';

interface Props {
  level: number;
  streak: number;
  totalDays: number;
}

/* ── helpers ──────────────────────────────────────────────── */
function getTimePhase(h: number): 'dawn' | 'day' | 'sunset' | 'night' {
  if (h >= 5  && h < 8)  return 'dawn';
  if (h >= 8  && h < 17) return 'day';
  if (h >= 17 && h < 21) return 'sunset';
  return 'night';
}
function getSeason(m: number): 'spring' | 'summer' | 'autumn' | 'winter' {
  if (m >= 3 && m <= 5)  return 'spring';
  if (m >= 6 && m <= 8)  return 'summer';
  if (m >= 9 && m <= 11) return 'autumn';
  return 'winter';
}

/* ── palette per phase ──────────────────────────────────────── */
const SKY: Record<string, [string, string, string]> = {
  dawn:   ['#FFB3BA', '#FFD6A0', '#C5E9FF'],
  day:    ['#56CCF2', '#2F80ED', '#1A5FAB'],
  sunset: ['#FF6B35', '#FF9F68', '#C27BA0'],
  night:  ['#0A051A', '#12083A', '#1E1060'],
};
const GROUND_NEAR: Record<string, string> = {
  spring: '#6DBF5A', summer: '#4CAF50', autumn: '#8B6914', winter: '#D8E8EE',
};
const GROUND_FAR: Record<string, string> = {
  spring: '#88D175', summer: '#66BB6A', autumn: '#A0783C', winter: '#BDD6DE',
};
const HILL_SHADOW: Record<string, string> = {
  spring: '#52A63E', summer: '#388E3C', autumn: '#6D4C0E', winter: '#9FBEC8',
};

/* ── star positions (stable) ────────────────────────────── */
const STARS = [
  [30,18],[80,10],[130,22],[180,8],[240,16],[290,12],[320,25],[50,40],
  [160,35],[210,30],[270,42],[340,20],[100,50],[310,48],[15,55],
];

/* ── cloud shapes ─────────────────────────────────────────── */
function Cloud({ x, y, s = 1, opacity = 0.9 }: { x: number; y: number; s?: number; opacity?: number }) {
  return (
    <G transform={`translate(${x},${y}) scale(${s})`} opacity={opacity}>
      <Ellipse cx="0"  cy="0" rx="28" ry="14" fill="white" />
      <Ellipse cx="20" cy="-6" rx="20" ry="12" fill="white" />
      <Ellipse cx="-18" cy="-4" rx="16" ry="10" fill="white" />
      <Ellipse cx="6"  cy="-14" rx="16" ry="10" fill="white" />
    </G>
  );
}

/* ── tree ─────────────────────────────────────────────────── */
function Tree({ x, y, h = 50, season }: { x: number; y: number; h?: number; season: string }) {
  const trunkH = h * 0.28;
  const canopyColor =
    season === 'spring'  ? '#F9A8C9' :
    season === 'summer'  ? '#2E7D32' :
    season === 'autumn'  ? '#D84315' : '#8B9A9D';
  const canopyColor2 =
    season === 'spring'  ? '#F48FB1' :
    season === 'summer'  ? '#388E3C' :
    season === 'autumn'  ? '#BF360C' : '#7A8B8E';
  return (
    <G transform={`translate(${x},${y})`}>
      {/* trunk */}
      <Rect x="-5" y={-trunkH} width="10" height={trunkH} rx="3" fill="#795548" />
      {/* canopy layers */}
      <Ellipse cx="0" cy={-(trunkH + h * 0.42)} rx={h * 0.38} ry={h * 0.32} fill={canopyColor2} />
      <Ellipse cx="0" cy={-(trunkH + h * 0.52)} rx={h * 0.30} ry={h * 0.26} fill={canopyColor} />
      <Ellipse cx="0" cy={-(trunkH + h * 0.62)} rx={h * 0.20} ry={h * 0.18} fill={canopyColor} />
      {/* snow cap */}
      {season === 'winter' && (
        <Ellipse cx="0" cy={-(trunkH + h * 0.62)} rx={h * 0.22} ry={h * 0.10} fill="white" opacity={0.85} />
      )}
    </G>
  );
}

/* ── small bush ───────────────────────────────────────────── */
function Bush({ x, y, season }: { x: number; y: number; season: string }) {
  const c = season === 'spring' ? '#F48FB1' : season === 'autumn' ? '#E65100' : '#4CAF50';
  return (
    <G transform={`translate(${x},${y})`}>
      <Ellipse cx="0"  cy="0" rx="14" ry="10" fill={c} />
      <Ellipse cx="12" cy="2" rx="10" ry="8"  fill={c} />
      <Ellipse cx="-10" cy="2" rx="9" ry="7"  fill={c} />
    </G>
  );
}

/* ── moon ─────────────────────────────────────────────────── */
function Moon({ x, y }: { x: number; y: number }) {
  return (
    <G transform={`translate(${x},${y})`}>
      <Circle r="16" fill="#FFF8DC" />
      <Circle cx="7" cy="-6" r="13" fill="#12083A" />
      {/* halo */}
      <Circle r="20" fill="none" stroke="#FFF8DC" strokeWidth="2" opacity={0.25} />
    </G>
  );
}

/* ── sun ──────────────────────────────────────────────────── */
function Sun({ x, y, phase }: { x: number; y: number; phase: string }) {
  const color = phase === 'dawn' ? '#FFD54F' : phase === 'sunset' ? '#FF8F00' : '#FDD835';
  return (
    <G transform={`translate(${x},${y})`}>
      <Circle r="22" fill={color} opacity={0.25} />
      <Circle r="16" fill={color} opacity={0.55} />
      <Circle r="11" fill={color} />
    </G>
  );
}

/* ── falling petals / leaves / snow ─────────────────────── */
const PARTICLES = [
  [40,70],[90,100],[150,60],[220,90],[280,75],[330,110],[60,130],
  [200,120],[310,140],[120,155],
];
function Particles({ season, phase }: { season: string; phase: string }) {
  if (season === 'spring') {
    return (
      <G opacity={0.7}>
        {PARTICLES.map(([x, y], i) => (
          <Ellipse key={i} cx={x} cy={y} rx="3" ry="2"
            fill="#F8BBD9" transform={`rotate(${i * 36},${x},${y})`} />
        ))}
      </G>
    );
  }
  if (season === 'autumn') {
    return (
      <G opacity={0.65}>
        {PARTICLES.map(([x, y], i) => (
          <Path key={i}
            d={`M${x},${y} Q${x + 4},${y - 5} ${x + 8},${y} Q${x + 4},${y + 5} ${x},${y} Z`}
            fill={i % 2 === 0 ? '#FF7043' : '#FFA726'}
            transform={`rotate(${i * 42},${x},${y})`}
          />
        ))}
      </G>
    );
  }
  if (season === 'winter') {
    return (
      <G opacity={0.6}>
        {PARTICLES.map(([x, y], i) => (
          <Circle key={i} cx={x} cy={y} r="2.5" fill="white" />
        ))}
      </G>
    );
  }
  // summer: white wisps
  if (phase === 'day') {
    return (
      <G opacity={0.18}>
        {PARTICLES.slice(0, 5).map(([x, y], i) => (
          <Ellipse key={i} cx={x} cy={y * 0.5} rx="18" ry="4" fill="white" />
        ))}
      </G>
    );
  }
  return null;
}

/* ── birds ────────────────────────────────────────────────── */
function Birds({ x, y }: { x: number; y: number }) {
  const b = (dx: number, dy: number) => (
    `M${x + dx},${y + dy} Q${x + dx + 5},${y + dy - 5} ${x + dx + 10},${y + dy}
     M${x + dx + 10},${y + dy} Q${x + dx + 15},${y + dy - 5} ${x + dx + 20},${y + dy}`
  );
  return (
    <G stroke="#444" strokeWidth="1.8" fill="none" opacity={0.7}>
      <Path d={b(0, 0)} />
      <Path d={b(25, -8)} />
      <Path d={b(15, 10)} />
    </G>
  );
}

/* ── rainbow ─────────────────────────────────────────────── */
function Rainbow({ x, y }: { x: number; y: number }) {
  const arcs = ['#FF6B6B', '#FFA07A', '#FFD700', '#90EE90', '#87CEEB', '#9370DB'];
  return (
    <G transform={`translate(${x},${y})`} opacity={0.45}>
      {arcs.map((c, i) => {
        const r = 70 - i * 8;
        return (
          <Path key={i}
            d={`M ${-r},0 A ${r},${r} 0 0,1 ${r},0`}
            stroke={c} strokeWidth="5" fill="none"
          />
        );
      })}
    </G>
  );
}

/* ── cat silhouette ──────────────────────────────────────── */
function Cat({ x, y }: { x: number; y: number }) {
  return (
    <G transform={`translate(${x},${y})`}>
      {/* body */}
      <Ellipse cx="0" cy="0" rx="11" ry="9" fill="#6D4C41" />
      {/* head */}
      <Circle cx="0" cy="-14" r="9" fill="#6D4C41" />
      {/* ears */}
      <Path d="M-6,-20 L-10,-28 L-2,-22 Z" fill="#6D4C41" />
      <Path d="M6,-20 L10,-28 L2,-22 Z"  fill="#6D4C41" />
      {/* tail */}
      <Path d="M11,0 Q22,-10 18,-20" stroke="#6D4C41" strokeWidth="4" fill="none" strokeLinecap="round" />
      {/* eyes */}
      <Circle cx="-3" cy="-14" r="1.5" fill="#FFF8E1" />
      <Circle cx="3"  cy="-14" r="1.5" fill="#FFF8E1" />
    </G>
  );
}

/* ── flower ──────────────────────────────────────────────── */
function Flower({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <G transform={`translate(${x},${y})`}>
      <Rect x="-1" y="-12" width="2" height="12" fill="#66BB6A" />
      {[0, 60, 120, 180, 240, 300].map((deg, i) => {
        const rad = (deg * Math.PI) / 180;
        const px = Math.cos(rad) * 5;
        const py = Math.sin(rad) * 5;
        return <Circle key={i} cx={px} cy={py - 14} r="3.5" fill={color} />;
      })}
      <Circle cx="0" cy="-14" r="2.5" fill="#FDD835" />
    </G>
  );
}

/* ── main component ──────────────────────────────────────── */
export function MascotRoomBg({ level, streak, totalDays }: Props) {
  const isDark = useColorScheme() === 'dark';
  const now   = new Date();
  const hour  = now.getHours();
  const month = now.getMonth() + 1;
  const phase  = getTimePhase(hour);
  const season = getSeason(month);

  /* unlocks */
  const showPlant   = totalDays >= 3;
  const showTree    = totalDays >= 7;
  const showTree2   = totalDays >= 14;
  const showCat     = totalDays >= 21;
  const showHouse   = totalDays >= 30;
  const showBirds   = streak   >= 3;
  const showRainbow = streak   >= 7;
  const showButterfly = level  >= 2;
  const showSparkles  = level  >= 4;

  const [skyTop, skyMid, skyBot] = SKY[phase];

  /* horizon heights in the 360×280 viewBox */
  const farHillY  = 168;
  const nearHillY = 200;
  const groundY   = 230;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg
        width="100%" height="100%"
        viewBox="0 0 360 280"
        preserveAspectRatio="xMidYMid slice"
      >
        <Defs>
          {/* Sky */}
          <SvgGrad id="sky" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0"   stopColor={skyBot} />
            <Stop offset="0.5" stopColor={skyMid} />
            <Stop offset="1"   stopColor={skyTop} />
          </SvgGrad>

          {/* Far hill */}
          <SvgGrad id="hfar" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={GROUND_FAR[season]} />
            <Stop offset="1" stopColor={HILL_SHADOW[season]} />
          </SvgGrad>

          {/* Near hill */}
          <SvgGrad id="hnear" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={GROUND_NEAR[season]} />
            <Stop offset="1" stopColor={HILL_SHADOW[season]} />
          </SvgGrad>

          {/* Ground */}
          <SvgGrad id="gnd" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={GROUND_NEAR[season]} />
            <Stop offset="1" stopColor={HILL_SHADOW[season]} />
          </SvgGrad>

          {/* Night vignette */}
          <RadialGradient id="vign" cx="50%" cy="50%" r="70%">
            <Stop offset="0"   stopColor="transparent" />
            <Stop offset="1"   stopColor="#000000" stopOpacity={phase === 'night' ? 0.35 : 0.1} />
          </RadialGradient>
        </Defs>

        {/* ── Sky ── */}
        <Rect x="0" y="0" width="360" height="280" fill="url(#sky)" />

        {/* ── Stars (night only) ── */}
        {phase === 'night' && STARS.map(([sx, sy], i) => (
          <Circle key={i} cx={sx} cy={sy} r={i % 3 === 0 ? 1.8 : 1.1}
            fill="white" opacity={0.6 + (i % 4) * 0.1} />
        ))}

        {/* ── Sun / Moon ── */}
        {phase === 'night'
          ? <Moon x={290} y={38} />
          : <Sun x={phase === 'dawn' ? 60 : phase === 'sunset' ? 300 : 310} y={phase === 'day' ? 32 : 55} phase={phase} />
        }

        {/* ── Rainbow (streak≥7, daytime) ── */}
        {showRainbow && phase === 'day' && <Rainbow x={180} y={130} />}

        {/* ── Clouds ── */}
        {phase !== 'night' && (
          <>
            <Cloud x={70}  y={45} s={0.9} opacity={0.88} />
            <Cloud x={230} y={32} s={1.1} opacity={0.82} />
            {season === 'summer' && <Cloud x={150} y={55} s={0.75} opacity={0.7} />}
          </>
        )}

        {/* ── Particles (petals / leaves / snow) ── */}
        <Particles season={season} phase={phase} />

        {/* ── Birds (streak≥3, daytime) ── */}
        {showBirds && phase !== 'night' && <Birds x={100} y={80} />}

        {/* ── Far hill ── */}
        <Path
          d={`M0,${farHillY + 20}
              Q90,${farHillY - 30} 180,${farHillY - 10}
              Q270,${farHillY + 10} 360,${farHillY - 5}
              L360,280 L0,280 Z`}
          fill="url(#hfar)"
        />

        {/* ── Near hill ── */}
        <Path
          d={`M0,${nearHillY + 10}
              Q60,${nearHillY - 20} 140,${nearHillY - 8}
              Q220,${nearHillY + 5} 360,${nearHillY - 15}
              L360,280 L0,280 Z`}
          fill="url(#hnear)"
        />

        {/* ── Ground strip ── */}
        <Rect x="0" y={groundY} width="360" height={280 - groundY} fill="url(#gnd)" />

        {/* ── House silhouette (day30) ── */}
        {showHouse && (
          <G transform={`translate(40,${farHillY - 10})`} opacity={0.7}>
            <Rect x="0" y="-28" width="38" height="28" rx="2"
              fill={isDark ? '#3E2723' : '#795548'} />
            {/* roof */}
            <Path d="M-4,-28 L19,-48 L42,-28 Z"
              fill={isDark ? '#4E342E' : '#5D4037'} />
            {/* window */}
            <Rect x="6" y="-22" width="10" height="10" rx="2" fill="#FFD54F" opacity={0.85} />
            <Rect x="22" y="-22" width="10" height="10" rx="2" fill="#FFD54F" opacity={0.85} />
            {/* door */}
            <Rect x="13" y="-14" width="12" height="14" rx="2"
              fill={isDark ? '#2E1B0E' : '#4E342E'} />
          </G>
        )}

        {/* ── Trees ── */}
        {showTree  && <Tree x={260} y={nearHillY - 4} h={54} season={season} />}
        {showTree2 && <Tree x={300} y={nearHillY}     h={42} season={season} />}
        {showTree2 && <Tree x={228} y={nearHillY - 2} h={38} season={season} />}

        {/* ── Bushes ── */}
        {showPlant && <Bush x={90}  y={groundY} season={season} />}
        {showTree  && <Bush x={140} y={groundY} season={season} />}

        {/* ── Flowers ── */}
        {showPlant && (
          <>
            <Flower x={185} y={groundY} color={season === 'spring' ? '#F48FB1' : season === 'autumn' ? '#FF7043' : '#FDD835'} />
            <Flower x={205} y={groundY} color={season === 'spring' ? '#CE93D8' : '#66BB6A'} />
          </>
        )}

        {/* ── Cat (day21) ── */}
        {showCat && <Cat x={160} y={groundY - 6} />}

        {/* ── Butterfly (level≥2) ── */}
        {showButterfly && phase !== 'night' && (
          <G transform={`translate(220,${nearHillY - 30})`} opacity={0.8}>
            <Path d="M0,0 Q-12,-14 -20,-6 Q-12,4 0,0 Z" fill="#CE93D8" />
            <Path d="M0,0 Q12,-14 20,-6 Q12,4 0,0 Z"  fill="#CE93D8" />
            <Path d="M0,0 Q-8,10 -14,6 Q-8,0 0,0 Z"   fill="#AB47BC" opacity={0.8} />
            <Path d="M0,0 Q8,10 14,6 Q8,0 0,0 Z"      fill="#AB47BC" opacity={0.8} />
            <Rect x="-1" y="-8" width="2" height="16" rx="1" fill="#4A148C" />
          </G>
        )}

        {/* ── Sparkles (level≥4) ── */}
        {showSparkles && phase !== 'night' && (
          <G opacity={0.7}>
            {[[60,110],[200,95],[320,130]].map(([sx, sy], i) => (
              <G key={i} transform={`translate(${sx},${sy})`}>
                <Path d="M0,-8 L1.5,-1.5 L8,0 L1.5,1.5 L0,8 L-1.5,1.5 L-8,0 L-1.5,-1.5 Z"
                  fill="#FDD835" />
              </G>
            ))}
          </G>
        )}

        {/* ── Vignette overlay ── */}
        <Rect x="0" y="0" width="360" height="280" fill="url(#vign)" />
      </Svg>
    </View>
  );
}
