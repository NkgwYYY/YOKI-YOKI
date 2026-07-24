/**
 * MascotRoomBg — マスコットカードの背景に描画される部屋シーン
 * absoluteFill で使う。記録日数・連続日数・レベルで家具が増える。
 */
import React from 'react';
import { View, Text, StyleSheet, useColorScheme } from 'react-native';

interface Props {
  level: number;
  streak: number;
  totalDays: number;
}

function getSky(hour: number, month: number): string {
  if (hour >= 22 || hour < 5)  return month >= 12 || month <= 2 ? '🌨️' : '🌙';
  if (hour >= 5  && hour < 8)  return '🌅';
  if (hour >= 18 && hour < 21) return '🌇';
  if (month >= 3  && month <= 5)  return '🌸';
  if (month >= 6  && month <= 8)  return '☀️';
  if (month >= 9  && month <= 11) return '🍁';
  return '❄️';
}

function getSeasonal(month: number): string {
  if (month >= 3  && month <= 5)  return '🌺';
  if (month >= 6  && month <= 8)  return '🌻';
  if (month >= 9  && month <= 11) return '🍂';
  return '⛄';
}

export function MascotRoomBg({ level, streak, totalDays }: Props) {
  const isDark = useColorScheme() === 'dark';
  const hour   = new Date().getHours();
  const month  = new Date().getMonth() + 1;

  const sky      = getSky(hour, month);
  const seasonal = getSeasonal(month);

  /* ── unlocks ── */
  const hasPlantSmall  = totalDays >= 3;
  const hasPlantBig    = totalDays >= 7;
  const hasBookshelf   = totalDays >= 14;
  const hasCat         = totalDays >= 21;
  const hasDesk        = totalDays >= 30;
  const hasTrophy      = totalDays >= 60;
  const hasWindowFlower= streak >= 3;
  const hasRug         = streak >= 7;
  const hasLamp        = streak >= 14;
  const hasPicture     = level >= 2;
  const hasMusic       = level >= 4;
  const hasStar        = level >= 6;

  /* ── wall items (右上コーナー) ── */
  const wallItems: string[] = [];
  if (hasStar)      wallItems.push('✨');
  if (hasMusic)     wallItems.push('🎵');
  if (hasPicture)   wallItems.push('🖼️');
  if (hasBookshelf) wallItems.push('📚');
  if (hasTrophy)    wallItems.push('🏆');

  /* ── floor items (左右) ── */
  const leftItems: string[] = [];
  if (hasPlantBig)        leftItems.push('🪴');
  else if (hasPlantSmall) leftItems.push('🌱');
  if (hasLamp)            leftItems.push('🪔');

  const rightItems: string[] = [];
  if (hasDesk) rightItems.push('💻');
  if (hasCat)  rightItems.push('🐱');

  /* ── palette ── */
  const wall  = isDark ? '#1A1232' : '#FDF4E7';
  const wallAccent = isDark ? '#231A3E' : '#F7E9D2';
  const floor = isDark ? '#100D1A' : '#E5C99E';
  const floorLine = isDark ? '#2A2040' : '#C9A87A';
  const winBg = (hour >= 22 || hour < 5)
    ? (isDark ? '#08051A' : '#1A0A3C')
    : (isDark ? '#1A3468' : '#87CEEB');
  const winBorder = isDark ? '#3A2E5A' : '#C4AA88';
  const rugColor  = isDark ? '#3A2040' : '#D4956A';

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* ── WALL ── */}
      <View style={[bg.wall, { backgroundColor: wall, flex: 6 }]}>

        {/* accent stripe at top */}
        <View style={[bg.wallStripe, { backgroundColor: wallAccent }]} />

        {/* Window — top-left */}
        <View style={[bg.window, { backgroundColor: winBg, borderColor: winBorder }]}>
          <Text style={bg.windowSky}>{sky}</Text>
          {hasWindowFlower && <Text style={bg.windowFlower}>🌸</Text>}
          <Text style={bg.windowSeasonal}>{seasonal}</Text>
        </View>

        {/* Wall items — top-right */}
        {wallItems.length > 0 && (
          <View style={bg.wallDeco}>
            {wallItems.map((e, i) => (
              <Text key={i} style={bg.wallItem}>{e}</Text>
            ))}
          </View>
        )}
      </View>

      {/* ── FLOOR LINE ── */}
      <View style={[bg.floorLine, { backgroundColor: floorLine }]} />

      {/* ── FLOOR ── */}
      <View style={[bg.floor, { backgroundColor: floor, flex: 3.5 }]}>
        {hasRug && (
          <View style={[bg.rug, { backgroundColor: rugColor }]} />
        )}

        {/* left items */}
        <View style={bg.floorLeft}>
          {leftItems.map((e, i) => (
            <Text key={i} style={bg.floorItem}>{e}</Text>
          ))}
        </View>

        {/* right items */}
        <View style={bg.floorRight}>
          {rightItems.map((e, i) => (
            <Text key={i} style={bg.floorItem}>{e}</Text>
          ))}
        </View>
      </View>
    </View>
  );
}

const bg = StyleSheet.create({
  wall: {
    width: '100%',
    overflow: 'hidden',
    position: 'relative',
  },
  wallStripe: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 6,
  },
  window: {
    position: 'absolute', top: 14, left: 14,
    width: 62, height: 62, borderRadius: 10, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  windowSky:      { fontSize: 24 },
  windowFlower:   { position: 'absolute', bottom: 2, left: 3,  fontSize: 12 },
  windowSeasonal: { position: 'absolute', bottom: 2, right: 3, fontSize: 11 },

  wallDeco: {
    position: 'absolute', top: 10, right: 12,
    flexDirection: 'row', gap: 8, flexWrap: 'wrap',
    maxWidth: 120, justifyContent: 'flex-end',
  },
  wallItem: { fontSize: 22 },

  floorLine: { height: 3, width: '100%' },

  floor: {
    width: '100%', position: 'relative',
    justifyContent: 'flex-end', paddingBottom: 6,
  },
  rug: {
    position: 'absolute',
    bottom: 0, alignSelf: 'center',
    width: 110, height: 14, borderRadius: 7, opacity: 0.65,
  },
  floorLeft: {
    position: 'absolute', left: 10, bottom: 4,
    flexDirection: 'row', alignItems: 'flex-end', gap: 6,
  },
  floorRight: {
    position: 'absolute', right: 10, bottom: 4,
    flexDirection: 'row', alignItems: 'flex-end', gap: 6,
  },
  floorItem: { fontSize: 26 },
});
