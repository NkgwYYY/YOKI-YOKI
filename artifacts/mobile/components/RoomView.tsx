/**
 * RoomView — ユーザーの成長で少しずつ家具・植物・飾りが増える部屋
 *
 * アンロック条件:
 *  記録日数  3d: 小さな植物　7d: 鉢植え　14d: 本棚　21d: 猫　30d: 机　60d: トロフィー
 *  連続日数  3d: 窓辺の花　 7d: ラグ    14d: ランプ
 *  レベル    2: 絵画　      4: 音楽飾り  6: 星飾り
 *  季節      春:桜　夏:ひまわり　秋:もみじ　冬:雪
 *  時間帯    窓の外の空が変わる
 */
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, useColorScheme } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withDelay, withSpring,
} from 'react-native-reanimated';

interface Props {
  level: number;
  streak: number;
  totalDays: number;
}

/* ── helpers ── */
function getSky(hour: number, month: number): string {
  // seasonal override at night/dusk
  if (hour >= 22 || hour < 5)  return month >= 12 || month <= 2 ? '🌨️' : '🌙';
  if (hour >= 5  && hour < 8)  return '🌅';
  if (hour >= 18 && hour < 21) return '🌇';
  // daytime sky by season
  if (month >= 3  && month <= 5)  return '🌸';
  if (month >= 6  && month <= 8)  return '☀️';
  if (month >= 9  && month <= 11) return '🍂';
  return '❄️'; // winter
}

function getSeasonal(month: number): string {
  if (month >= 3  && month <= 5)  return '🌸';
  if (month >= 6  && month <= 8)  return '🌻';
  if (month >= 9  && month <= 11) return '🍁';
  return '⛄';
}

/* ── animated item ── */
function RoomItem({ emoji, size = 28, delay = 0 }: { emoji: string; size?: number; delay?: number }) {
  const scale = useSharedValue(0);
  useEffect(() => {
    scale.value = withDelay(delay, withSpring(1, { damping: 10, stiffness: 180 }));
  }, []);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.Text style={[{ fontSize: size }, style]}>{emoji}</Animated.Text>
  );
}

export function RoomView({ level, streak, totalDays }: Props) {
  const isDark = useColorScheme() === 'dark';
  const hour  = new Date().getHours();
  const month = new Date().getMonth() + 1;

  const sky      = getSky(hour, month);
  const seasonal = getSeasonal(month);

  /* ── unlocks ── */
  const hasPlantSmall  = totalDays >= 3;
  const hasPlantBig    = totalDays >= 7;
  const hasBookshelf   = totalDays >= 14;
  const hasCat         = totalDays >= 21;
  const hasDesk        = totalDays >= 30;
  const hasTrophy      = totalDays >= 60;

  const hasWindowFlower = streak >= 3;
  const hasRug          = streak >= 7;
  const hasLamp         = streak >= 14;

  const hasPicture      = level >= 2;
  const hasMusic        = level >= 4;
  const hasStar         = level >= 6;

  /* ── wall slots (right of window) ── */
  const wallItems: Array<{ emoji: string; delay: number }> = [];
  if (hasPicture)    wallItems.push({ emoji: '🖼️',  delay: 100 });
  if (hasBookshelf)  wallItems.push({ emoji: '📚',  delay: 200 });
  if (hasMusic)      wallItems.push({ emoji: '🎵',  delay: 300 });
  if (hasTrophy)     wallItems.push({ emoji: '🏆',  delay: 400 });
  if (hasStar)       wallItems.push({ emoji: '✨',  delay: 500 });

  /* ── floor slots ── */
  const floorItems: Array<{ emoji: string; delay: number }> = [];
  if (hasRug)          floorItems.push({ emoji: '🟤',  delay: 0   });  // placeholder rug
  if (hasPlantBig)     floorItems.push({ emoji: '🪴',  delay: 80  });
  else if (hasPlantSmall) floorItems.push({ emoji: '🌱', delay: 80 });
  if (hasLamp)         floorItems.push({ emoji: '🪔',  delay: 160 });
  if (hasCat)          floorItems.push({ emoji: '🐱',  delay: 240 });
  if (hasDesk)         floorItems.push({ emoji: '💻',  delay: 320 });

  const colors = {
    wall:        isDark ? '#1B1530' : '#FDF6EE',
    wallAccent:  isDark ? '#251E3A' : '#F5E8D6',
    floor:       isDark ? '#120F1C' : '#E8D5B7',
    floorLine:   isDark ? '#2A2240' : '#CEB89E',
    windowBg:    hour >= 22 || hour < 5
                   ? (isDark ? '#0A0620' : '#1A0A3C')
                   : (isDark ? '#1A3A6A' : '#87CEEB'),
    windowBorder: isDark ? '#3A2E5A' : '#B8A88A',
    text:        isDark ? '#E2D9F3' : '#5C4A2A',
    subtext:     isDark ? '#8B7AAA' : '#9A7A5A',
  };

  const isRoomEmpty = !hasPlantSmall && !hasPicture;

  return (
    <View style={[r.card, { backgroundColor: colors.wall, borderColor: isDark ? '#2A2240' : '#E0CEBC' }]}>
      {/* Title row */}
      <View style={r.titleRow}>
        <Text style={[r.titleText, { color: colors.text }]}>🏡 こころんのへや</Text>
        {isRoomEmpty && (
          <Text style={[r.hintText, { color: colors.subtext }]}>続けると家具が増えるよ…</Text>
        )}
      </View>

      {/* Room body */}
      <View style={r.room}>
        {/* ── WALL AREA ── */}
        <View style={[r.wallArea, { backgroundColor: colors.wall }]}>
          {/* Window */}
          <View style={[r.window, { backgroundColor: colors.windowBg, borderColor: colors.windowBorder }]}>
            <Text style={r.windowSky}>{sky}</Text>
            {hasWindowFlower && (
              <Animated.Text style={[r.windowFlower]}>🌸</Animated.Text>
            )}
            <Text style={r.windowSeasonal}>{seasonal}</Text>
          </View>

          {/* Wall decorations */}
          <View style={r.wallDeco}>
            {wallItems.length === 0 ? (
              <Text style={[r.emptyWall, { color: colors.subtext }]}>···</Text>
            ) : (
              wallItems.map((item, i) => (
                <RoomItem key={i} emoji={item.emoji} size={24} delay={item.delay} />
              ))
            )}
          </View>
        </View>

        {/* Floor line */}
        <View style={[r.floorLine, { backgroundColor: colors.floorLine }]} />

        {/* ── FLOOR AREA ── */}
        <View style={[r.floorArea, { backgroundColor: colors.floor }]}>
          {floorItems.length === 0 ? (
            <Text style={[r.emptyFloor, { color: colors.subtext }]}>3日続けると植物が育つよ 🌱</Text>
          ) : (
            <View style={r.floorItems}>
              {floorItems.map((item, i) => (
                item.emoji === '🟤'
                  ? <View key={i} style={[r.rug, { backgroundColor: isDark ? '#3A2040' : '#D4956A' }]} />
                  : <RoomItem key={i} emoji={item.emoji} size={28} delay={item.delay} />
              ))}
            </View>
          )}
        </View>
      </View>

      {/* Unlock hints */}
      {!isRoomEmpty && (
        <View style={r.progressRow}>
          {!hasPlantBig   && totalDays >= 3 && <Text style={[r.hint, { color: colors.subtext }]}>📖 あと{14 - totalDays}日で本棚</Text>}
          {!hasCat        && totalDays >= 14 && <Text style={[r.hint, { color: colors.subtext }]}>🐱 あと{21 - totalDays}日で猫</Text>}
          {!hasBookshelf  && totalDays < 14  && totalDays >= 7 && <Text style={[r.hint, { color: colors.subtext }]}>📚 あと{14 - totalDays}日で本棚</Text>}
          {!hasRug        && streak >= 3     && <Text style={[r.hint, { color: colors.subtext }]}>🪵 あと{7 - streak}日連続でラグ</Text>}
          {!hasPicture    && level >= 1      && level < 2      && <Text style={[r.hint, { color: colors.subtext }]}>🖼️ Lv.2で絵画が飾られる</Text>}
        </View>
      )}
    </View>
  );
}

const r = StyleSheet.create({
  card: {
    borderRadius: 22, borderWidth: 1,
    overflow: 'hidden', gap: 0,
  },
  titleRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8,
  },
  titleText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  hintText:  { fontSize: 11, fontFamily: 'Inter_400Regular' },

  room: { width: '100%' },

  // Wall
  wallArea: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingHorizontal: 14, paddingTop: 8, paddingBottom: 10, gap: 12,
    minHeight: 90,
  },
  window: {
    width: 72, height: 72, borderRadius: 10, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden', position: 'relative',
  },
  windowSky: { fontSize: 28 },
  windowFlower: { position: 'absolute', bottom: 2, left: 4, fontSize: 14 },
  windowSeasonal: { position: 'absolute', bottom: 2, right: 4, fontSize: 12 },
  wallDeco: {
    flex: 1, flexDirection: 'row', flexWrap: 'wrap',
    gap: 10, alignItems: 'center', paddingBottom: 4,
  },
  emptyWall: { fontSize: 13, letterSpacing: 4 },

  // Floor line
  floorLine: { height: 3, width: '100%' },

  // Floor
  floorArea: {
    paddingHorizontal: 16, paddingVertical: 12,
    minHeight: 56, justifyContent: 'center',
  },
  floorItems: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 14,
  },
  rug: {
    width: 48, height: 12, borderRadius: 6, opacity: 0.7,
  },
  emptyFloor: { fontSize: 12, fontFamily: 'Inter_400Regular' },

  // Hints
  progressRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
    paddingHorizontal: 16, paddingBottom: 12,
  },
  hint: { fontSize: 11, fontFamily: 'Inter_400Regular' },
});
