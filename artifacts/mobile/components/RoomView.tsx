import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import type { RoomCustomization } from '@/contexts/AppContext';
import type { MascotStage } from '@/utils/mascotUtils';
import { fitRoom } from '@/utils/roomGeometry';
import { StaticMascot } from '@/components/Mascot';
import { RoomResident, type ResidentItem } from './room/RoomResident';
import { RoomItemPreview } from './room/LegacyFurniture';
export { RoomItemPreview, GrassTexture } from './room/LegacyFurniture';

const ART = {
  background: require('@/assets/images/room/room-night.jpg'),
  desk: require('@/assets/images/room/writing-desk.png'),
  music: require('@/assets/images/room/record-player.png'),
  meal: require('@/assets/images/room/milk.png'),
  plant: require('@/assets/images/room/plant.png'),
};
type Props = {
  customization: RoomCustomization; stage: MascotStage; growthSize: number;
  mascotName: string; active: boolean; reduceMotion: boolean; resting: boolean;
  reaction: number; hints: boolean; companion: boolean; totalDays: number;
  onRecord: () => void; onFeed: () => void; onPlay: () => void; onChat: () => void; onAlbum: () => void;
  wear?: ResidentItem; effect?: ResidentItem; decor?: ResidentItem; background?: string;
};
/** All sprites share one fitted coordinate system, so letterboxing never moves hotspots. */
export function RoomView(props: Props) {
  const [bounds, setBounds] = useState({ width: 0, height: 0 });
  const { width, height } = fitRoom(bounds.width, bounds.height);
  const object = (id: string, label: string, source: ImageSourcePropType, x: number, y: number, scale: number, onPress: () => void) => {
    const size = width * scale;
    return <Pressable testID={`room-${id}`} accessibilityRole="button" accessibilityLabel={label}
      onPress={onPress} style={({ pressed }) => [s.object, { left: x * width - size / 2, top: y * height - size, width: size, height: size, zIndex: Math.round(y * 1000), opacity: pressed ? 0.82 : 1 }]}>
      <Image source={source} resizeMode="contain" style={s.image} />
      {props.hints && <Text style={s.label}>{label}</Text>}
    </Pressable>;
  };
  return <View style={s.frame} onLayout={e => setBounds(e.nativeEvent.layout)} testID="room-scene">
    {width > 0 && <View style={{ width, height }}>
      <Image source={ART.background} style={s.image} resizeMode="stretch" accessible={false} />
      {props.background && <Image source={{ uri: props.background }} resizeMode="cover" style={{ position: 'absolute', left: width * 0.08, top: height * 0.10, width: width * 0.24, height: height * 0.16, borderRadius: width * 0.1, opacity: 0.65 }} />}
      <Pressable testID="room-album" accessibilityRole="button" accessibilityLabel="本棚のアルバム・成長と図鑑" onPress={props.onAlbum}
        style={{ position: 'absolute', left: width * 0.51, top: height * 0.09, width: width * 0.24, height: height * 0.12, zIndex: 20, minHeight: 44 }}>
        {props.hints && <Text style={[s.label, { bottom: 0 }]}>アルバム</Text>}
      </Pressable>
      {object('record', '今日の記録', ART.desk, 0.24, 0.85, 0.39, props.onRecord)}
      {object('music', '音楽であそぶ', ART.music, 0.81, 0.75, 0.25, props.onPlay)}
      {object('meal', 'ごはん', ART.meal, 0.79, 0.90, 0.19, props.onFeed)}
      {props.totalDays > 2 || props.customization.flower !== 'none'
        ? <Image source={ART.plant} resizeMode="contain" style={{ position: 'absolute', left: width * 0.05, top: height * 0.43, width: width * 0.15, height: width * 0.2, zIndex: 520 }} /> : null}
      {props.customization.furniture !== 'none' && <View style={{ position: 'absolute', left: width * 0.07, top: height * 0.53, zIndex: 590 }}><RoomItemPreview kind="furniture" id={props.customization.furniture} /></View>}
      {props.decor && <Image source={{ uri: props.decor.uri }} resizeMode="contain" style={{ position: 'absolute', left: width * 0.76 + props.decor.x, top: height * 0.51 + props.decor.y, width: width * 0.16 * props.decor.scale, height: width * 0.16 * props.decor.scale, zIndex: 620 }} />}
      {props.companion && <View style={{ position: 'absolute', left: width * 0.63, top: height * 0.56, zIndex: 630 }}><StaticMascot stage="egg" mood="happy" size={width * 0.13} /></View>}
      <RoomResident {...props} width={width} height={height} name={props.mascotName} onPress={props.onChat} />
    </View>}
  </View>;
}
const s = StyleSheet.create({
  frame: { flex: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: '#382B37' },
  image: { width: '100%', height: '100%' },
  object: { position: 'absolute', minWidth: 44, minHeight: 44 },
  label: { position: 'absolute', bottom: -12, alignSelf: 'center', color: '#FFF3DF', backgroundColor: '#3B293DCF', fontSize: 11, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, overflow: 'hidden' },
});
