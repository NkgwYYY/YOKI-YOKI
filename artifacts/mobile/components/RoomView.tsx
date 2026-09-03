/**
 * ホームに表示する小さなアトリエ。
 * 家具と花は購入・選択状態を持ち、日々の記録で増える飾りと一緒に部屋を育てる。
 */
import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withDelay, withSpring,
} from 'react-native-reanimated';
import { control, elevation, roomPalette, radius } from '@/constants/theme';
import { PressScale } from '@/components/ui/PressScale';
import { Icon, iconSize } from '@/components/ui/Icon';
import type { RoomCustomization, RoomFlower, RoomFurniture } from '@/contexts/AppContext';

interface Props {
  level: number;
  streak: number;
  totalDays: number;
  mascotName?: string;
  customization?: RoomCustomization;
  onOpenCustomize?: () => void;
  children?: React.ReactNode;
}

function getSky(hour: number, month: number): string {
  if (hour >= 22 || hour < 5) return month >= 12 || month <= 2 ? '🌨️' : '🌙';
  if (hour >= 5 && hour < 8) return '🌅';
  if (hour >= 18 && hour < 21) return '🌇';
  if (month >= 3 && month <= 5) return '🌸';
  if (month >= 6 && month <= 8) return '☀️';
  if (month >= 9 && month <= 11) return '🍂';
  return '❄️';
}

function getSeasonal(month: number): string {
  if (month >= 3 && month <= 5) return '🌸';
  if (month >= 6 && month <= 8) return '🌻';
  if (month >= 9 && month <= 11) return '🍁';
  return '⛄';
}

function RoomItem({ emoji, size = 28, delay = 0 }: { emoji: string; size?: number; delay?: number }) {
  const scale = useSharedValue(0);
  useEffect(() => {
    scale.value = withDelay(delay, withSpring(1, { damping: 10, stiffness: 180 }));
  }, []);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return <Animated.Text style={[{ fontSize: size }, style]}>{emoji}</Animated.Text>;
}

export function RoomView({
  level,
  streak,
  totalDays,
  mascotName,
  customization,
  onOpenCustomize,
  children,
}: Props) {
  const hour = new Date().getHours();
  const month = new Date().getMonth() + 1;
  const room = customization ?? {
    furniture: 'sofa' as RoomFurniture,
    flower: 'pink' as RoomFlower,
    ownedFurniture: ['sofa'] as RoomFurniture[],
    ownedFlowers: ['pink'] as RoomFlower[],
  };
  const hasPlant = totalDays >= 3;
  const hasBookshelf = totalDays >= 14 || room.furniture === 'bookshelf';
  const hasPicture = level >= 2;
  const isNight = hour >= 19 || hour < 5;
  const furnitureColor = room.furniture === 'vanity'
    ? roomPalette.vanity
    : room.furniture === 'bookshelf'
      ? roomPalette.shelf
      : roomPalette.sofa;
  const flowerColor = room.flower === 'violet'
    ? roomPalette.flowerViolet
    : room.flower === 'rainbow'
      ? roomPalette.flowerRainbow
      : roomPalette.flowerPink;

  return (
    <View style={r.card}>
      <View style={r.titleRow}>
        <View style={r.titleCopy}>
          <Text style={r.titleText}>{mascotName ? `${mascotName}のアトリエ` : 'ちいさなアトリエ'}</Text>
          <Text style={r.hintText}>
            {hasPlant || hasPicture ? '今日の気分で、部屋の表情も変えてみよう' : '家具や花を飾って、自分だけの場所にしよう'}
          </Text>
        </View>
        {onOpenCustomize ? (
          <PressScale
            onPress={onOpenCustomize}
            accessibilityLabel="アトリエをアレンジする"
            style={r.editButton}
          >
            <Icon name="edit-3" size={iconSize.sm} color={roomPalette.shelf} />
          </PressScale>
        ) : null}
      </View>

      <View style={r.room}>
        <View style={r.wallArea}>
          <View style={[r.window, { backgroundColor: isNight ? roomPalette.windowNight : roomPalette.window }]}>
            <Text style={r.windowSky}>{getSky(hour, month)}</Text>
            {streak >= 3 ? <Animated.Text style={[r.windowFlower, { color: flowerColor }]}>✦</Animated.Text> : null}
            <Text style={r.windowSeasonal}>{getSeasonal(month)}</Text>
          </View>
          <View style={r.wallDeco}>
            <View style={r.wallCard}>
              <Text style={r.wallCardSpark}>✦</Text>
              <Text style={r.wallCardText}>{hasPicture ? '今日のきらめき' : 'YOUR LITTLE SPACE'}</Text>
            </View>
            {hasBookshelf ? <RoomItem emoji="✿" size={24} delay={180} /> : null}
            {level >= 4 ? <RoomItem emoji="♫" size={23} delay={260} /> : null}
            {level >= 6 ? <RoomItem emoji="✧" size={27} delay={340} /> : null}
          </View>
        </View>
        <View style={r.floorLine} />
        <View style={r.floorArea}>
          <View style={r.floorItems}>
            <View style={r.rug} />
            <View style={r.plant}>
              <Text style={[r.flower, { color: flowerColor }]}>{room.flower === 'rainbow' ? '✿' : '✦'}</Text>
              <View style={[r.stem, { backgroundColor: roomPalette.leaf }]} />
              {hasPlant ? <View style={[r.leaf, { backgroundColor: roomPalette.leaf }]} /> : null}
            </View>
            <View style={[r.furniture, { backgroundColor: furnitureColor }]}>
              {room.furniture === 'bookshelf' ? (
                <><View style={r.shelfLine} /><View style={r.shelfLine} /><View style={r.shelfLine} /></>
              ) : room.furniture === 'vanity' ? (
                <><View style={r.mirror} /><View style={r.tableLine} /></>
              ) : (
                <><View style={r.sofaBack} /><View style={r.sofaSeat} /></>
              )}
            </View>
            <View style={r.floorSparkles}>
              <Text style={r.sparkle}>✦</Text><Text style={r.sparkle}>·</Text><Text style={r.sparkle}>✧</Text>
            </View>
          </View>
        </View>
        <View style={r.characterLayer} pointerEvents="box-none">{children}</View>
      </View>

      <View style={r.progressRow}>
        <Text style={r.hint}>✿ {room.flower === 'pink' ? 'ピンクの花' : room.flower === 'violet' ? 'すみれの花' : 'にじいろの花'}</Text>
        <Text style={r.hint}>✦ {room.furniture === 'sofa' ? 'ふわふわソファ' : room.furniture === 'vanity' ? 'きらめきドレッサー' : 'ミニ本棚'}</Text>
      </View>
    </View>
  );
}

const r = StyleSheet.create({
  card: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: roomPalette.floorLine,
    overflow: 'hidden',
    backgroundColor: roomPalette.wall,
    ...elevation.raised,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
  },
  titleCopy: { flex: 1 },
  titleText: { fontSize: 15, fontFamily: 'Inter_700Bold', color: '#FFFFFF' },
  hintText: { fontSize: 11, fontFamily: 'Inter_500Medium', color: '#FCE9FA', marginTop: 3 },
  editButton: {
    width: control.iconSm,
    height: control.iconSm,
    borderRadius: radius.pill,
    backgroundColor: roomPalette.panel,
    alignItems: 'center',
    justifyContent: 'center',
  },
  room: { width: '100%', height: 286, position: 'relative' },
  wallArea: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 12,
    height: 211,
    backgroundColor: roomPalette.wallLight,
  },
  window: {
    width: 80,
    height: 86,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: roomPalette.floorLine,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  windowSky: { fontSize: 28 },
  windowFlower: { position: 'absolute', bottom: 7, left: 9, fontSize: 15 },
  windowSeasonal: { position: 'absolute', bottom: 4, right: 6, fontSize: 12 },
  wallDeco: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    alignItems: 'center',
    paddingBottom: 4,
    paddingTop: 6,
  },
  wallCard: {
    width: 118,
    height: 52,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#F8C9EB',
    backgroundColor: '#EAA6D7',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  wallCardSpark: { color: '#FFFFFF', fontSize: 18 },
  wallCardText: { color: '#FFFFFF', fontSize: 8, fontFamily: 'Inter_700Bold', letterSpacing: 0.8 },
  floorLine: { position: 'absolute', left: 0, right: 0, bottom: 75, height: 3, backgroundColor: roomPalette.floorLine },
  floorArea: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    paddingHorizontal: 16,
    paddingVertical: 12,
    height: 75,
    justifyContent: 'center',
    backgroundColor: roomPalette.floor,
  },
  floorItems: { flexDirection: 'row', alignItems: 'flex-end', gap: 14, minHeight: 52 },
  rug: { width: 58, height: 14, borderRadius: 8, opacity: 0.9, backgroundColor: '#D965B2' },
  plant: { width: 34, height: 56, alignItems: 'center', justifyContent: 'flex-end', position: 'relative' },
  flower: { fontSize: 24, lineHeight: 26, zIndex: 2 },
  stem: { width: 4, height: 22, borderRadius: 3 },
  leaf: { position: 'absolute', bottom: 9, left: 3, width: 15, height: 8, borderRadius: 9, transform: [{ rotate: '-25deg' }] },
  furniture: { width: 72, height: 48, borderRadius: 13, position: 'relative', padding: 7, justifyContent: 'flex-end' },
  sofaBack: { height: 21, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.28)' },
  sofaSeat: { height: 10, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.5)', marginTop: 4 },
  mirror: { alignSelf: 'center', width: 27, height: 22, borderRadius: 14, backgroundColor: '#E7CFFF', borderWidth: 2, borderColor: '#FFFFFF' },
  tableLine: { width: 50, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.45)' },
  shelfLine: { height: 7, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.5)', marginBottom: 3 },
  floorSparkles: { flexDirection: 'row', gap: 4, alignItems: 'center', marginLeft: 'auto', alignSelf: 'center' },
  sparkle: { color: '#FCE9FA', fontSize: 15 },
  characterLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 2,
    zIndex: 4,
  },
  progressRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 16, paddingBottom: 12, paddingTop: 3 },
  hint: { fontSize: 11, fontFamily: 'Inter_500Medium', color: '#FCE9FA' },
});