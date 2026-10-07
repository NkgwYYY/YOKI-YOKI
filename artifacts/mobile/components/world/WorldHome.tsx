import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { cancelAnimation, runOnJS, useAnimatedReaction, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RoomCustomization } from '@/contexts/AppContext';
import { StaticMascot } from '@/components/Mascot';
import type { MascotStage } from '@/utils/mascotUtils';
import { type ResidentItem, type ResidentInteraction } from '@/components/room/RoomResident';
import { RoomFurnitureArt, RoomFlowerArt } from '@/components/room/RoomFurnitureArt';
import { BerryIcon, AppleIcon, CandyIcon, CakeFoodIcon, RamenIcon, SpecialFoodIcon } from '@/components/ui/Illustrations';
import { fitWorld, isWorldGround, WORLD_PLACES, WORLD_TRAIL, worldCameraOffset, type WorldDestination } from '@/utils/worldGeometry';
import type { WorldPeriod } from '@/utils/worldTime';
import { WorldAmbient } from './WorldAmbient';
import { WorldResident } from './WorldResident';

export const HOME_ART = {day: require('@/assets/images/world/home-day.jpg'), night: require('@/assets/images/world/home-night.jpg')};
export function FoodOffering({id, size}: {id: string; size: number}) {
  const Art = {berry: BerryIcon, apple: AppleIcon, candy: CandyIcon, cake: CakeFoodIcon, ramen: RamenIcon, special: SpecialFoodIcon}[id] ?? BerryIcon;
  return <Art size={size} />;
}
type Props = {
  customization: RoomCustomization; stage: MascotStage; growthSize: number; mascotName: string;
  active: boolean; reduceMotion: boolean; resting: boolean; reaction: number; meal: number; rest: number;
  hints: boolean; companion: boolean; totalDays: number; period: WorldPeriod; daySeed: number; food: string | null;
  wear?: ResidentItem; effect?: ResidentItem; decor?: ResidentItem; background?: string;
  onRecord: () => void; onFeed: () => void; onChat: () => void; onAlbum: () => void; onRest: () => void;
  onInteract: (kind: ResidentInteraction) => void; onMealFinished: () => void;
};

export function WorldHome(props: Props) {
  const {active, reduceMotion} = props;
  const [bounds, setBounds] = useState({width: 0, height: 0});
  const [destination, setDestination] = useState<WorldDestination | null>(null);
  const insets = useSafeAreaInsets();
  const footY = useSharedValue(WORLD_PLACES.idle.y);
  const holding = useSharedValue(0);
  const frame = fitWorld(bounds.width, bounds.height);
  const {width, height} = frame;
  const viewportHeight = bounds.height, frameTop = frame.top;
  const camera = useSharedValue(0);
  useAnimatedReaction(() => ({y: footY.value, held: holding.value, active}), state => {
    if (!state.active) {cancelAnimation(camera); return;}
    if (!state.held) camera.value = withTiming(worldCameraOffset(state.y, height, viewportHeight, frameTop), {duration: reduceMotion ? 0 : 350});
  }, [height, viewportHeight, frameTop, reduceMotion, active]);
  const cameraStyle = useAnimatedStyle(() => ({transform: [{translateY: camera.value}]}));
  const walkTo = (point: {x: number; y: number}) => {
    if (props.active) setDestination(previous => ({id: (previous?.id ?? 0) + 1, point}));
  };
  const groundTap = (x: number, y: number) => {
    const point = {x: x / width, y: y / height};
    if (isWorldGround(point)) walkTo(point);
  };
  const groundGesture = Gesture.Tap().enabled(active).onEnd((event, success) => {
    if (success) runOnJS(groundTap)(event.x, event.y);
  });
  const night = props.period === 'night';
  const source = night ? HOME_ART.night : HOME_ART.day;
  const hotspot = (id: string, label: string, x: number, y: number, onPress: () => void) => (
    <Pressable key={id} testID={`room-${id}`} accessibilityRole="button" accessibilityLabel={label} onPress={onPress}
      style={({pressed}) => [s.hotspot, {left: x * width - 24, top: y * height - 24, opacity: pressed ? 0.6 : 1}]}>
      <View pointerEvents="none" style={s.glint} />
      {props.hints && <Text pointerEvents="none" style={s.hint}>{label}</Text>}
    </Pressable>
  );
  return <View style={s.root} testID="room-scene" onLayout={e => setBounds(e.nativeEvent.layout)}>
    <View pointerEvents="none" style={StyleSheet.absoluteFill}><Image source={source} resizeMode="cover" blurRadius={18} style={[s.art, {opacity: 0.8}]} /></View>
    {width > 0 && <Animated.View testID="world-stage" style={[{position: 'absolute', ...frame}, cameraStyle]}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}><Image source={source} resizeMode="stretch" style={s.art} accessible={false} /></View>
      {props.period === 'dusk' && <View pointerEvents="none" style={[StyleSheet.absoluteFill, {backgroundColor: '#B5646028'}]} />}
      <GestureDetector gesture={groundGesture}><View testID="world-ground" accessible={false} style={StyleSheet.absoluteFill}/></GestureDetector>
      {props.background && <View pointerEvents="none" style={{position: 'absolute', left: width * 0.276, top: height * 0.244, width: width * 0.072, height: height * 0.065, borderRadius: 14, opacity: 0.55, overflow: 'hidden'}}><Image source={{uri: props.background}} resizeMode="cover" style={s.art} /></View>}
      <WorldAmbient active={props.active} reduceMotion={props.reduceMotion} night={night} />
      {hotspot('album', '思い出の本棚', 0.53, 0.275, props.onAlbum)}
      {hotspot('bed', 'ベッドでひと休み', 0.73, 0.376, props.onRest)}
      {hotspot('record', '今日の記録', 0.268, 0.454, props.onRecord)}
      {hotspot('meal', 'ごはん', 0.765, 0.602, props.onFeed)}
      {props.food && <View pointerEvents="none" testID="world-food-offering" style={{position: 'absolute', left: width * 0.765 - width * 0.036, top: height * 0.582 - width * 0.036, zIndex: 610}}>
        <FoodOffering id={props.food} size={width * 0.072} />
      </View>}
      {props.customization.flower !== 'none' && <View pointerEvents="none" style={{position: 'absolute', left: width * 0.15, top: height * 0.495, zIndex: 550}}>
        <RoomFlowerArt id={props.customization.flower} size={width * 0.15} accessible />
      </View>}
      {props.customization.furniture !== 'none' && <View pointerEvents="none" style={{position: 'absolute', left: width * 0.22, top: height * 0.51, zIndex: 560}}>
        <RoomFurnitureArt id={props.customization.furniture} size={width * 0.19} />
      </View>}
      {props.decor && <View pointerEvents="none" style={{position: 'absolute', left: width * 0.72 + props.decor.x, top: height * 0.46 + props.decor.y, width: width * 0.12 * props.decor.scale, height: width * 0.12 * props.decor.scale, zIndex: 540}}><Image source={{uri: props.decor.uri}} resizeMode="contain" style={s.art} /></View>}
      {props.companion && <View pointerEvents="none" style={{position: 'absolute', left: width * 0.57, top: height * 0.54, zIndex: 615}}><StaticMascot stage="egg" mood="happy" size={width * 0.085} /></View>}
      <WorldResident {...props} width={width} height={height} footY={footY} holding={holding} destination={destination} />
    </Animated.View>}
    <LinearGradient pointerEvents="none" colors={['#15262A75', 'transparent']} style={s.topShade} />
    <LinearGradient pointerEvents="none" colors={['transparent', '#192D2CB8']} style={s.bottomShade} />
    <View style={[s.trail, {top: insets.top + 78}]} pointerEvents="box-none">
      {Object.entries(WORLD_TRAIL).map(([id, place]) => <Pressable key={id} testID={`world-travel-${id}`} disabled={!props.active}
        accessibilityRole="button" accessibilityLabel={`${place.label}へ歩く`} onPress={() => walkTo(place.point)}
        style={({pressed}) => [s.trailStop, {opacity: pressed ? 0.65 : 1}]}><Text style={s.trailText}>{place.label}</Text></Pressable>)}
    </View>
    {props.hints && <Text pointerEvents="none" style={[s.travelHint, {top: insets.top + 124}]}>地面をタップして、おさんぽ。長押しで抱っこ。</Text>}
  </View>;
}
const s = StyleSheet.create({
  art: {position: 'absolute', left: 0, top: 0, width: '100%', height: '100%'},
  root: {flex: 1, backgroundColor: '#253C35', overflow: 'hidden'},
  hotspot: {position: 'absolute', width: 48, height: 48, alignItems: 'center', justifyContent: 'center', zIndex: 900},
  glint: {width: 7, height: 7, borderRadius: 4, backgroundColor: '#FFF4CD', borderWidth: 1, borderColor: '#AC986E', shadowColor: '#FFF1BE', shadowRadius: 5, shadowOpacity: 0.8},
  hint: {position: 'absolute', top: 40, minWidth: 90, fontSize: 11, textAlign: 'center', color: '#FFF3DF', backgroundColor: '#233630DB', paddingVertical: 5, paddingHorizontal: 8, borderRadius: 12},
  topShade: {position: 'absolute', left: 0, right: 0, top: 0, height: 130},
  bottomShade: {position: 'absolute', left: 0, right: 0, bottom: 0, height: 225},
  trail: {position: 'absolute', left: 20, flexDirection: 'row', gap: 6},
  trailStop: {minHeight: 44, minWidth: 52, paddingHorizontal: 13, justifyContent: 'center', borderRadius: 22, backgroundColor: '#253B35B8', borderWidth: 1, borderColor: '#FFF5DA35'},
  trailText: {color: '#F5EDDA', fontSize: 12},
  travelHint: {position: 'absolute', left: 20, color: '#FFF4DA', fontSize: 11},
});
