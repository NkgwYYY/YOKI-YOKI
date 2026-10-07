import React, { useEffect, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { cancelAnimation, runOnJS, useAnimatedReaction, useSharedValue, withTiming } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RoomCustomization } from '@/contexts/AppContext';
import { StaticMascot } from '@/components/Mascot';
import type { MascotStage } from '@/utils/mascotUtils';
import { type ResidentItem, type ResidentInteraction } from '@/components/room/RoomResident';
import { RoomFurnitureArt, RoomFlowerArt } from '@/components/room/RoomFurnitureArt';
import { BerryIcon, AppleIcon, CandyIcon, CakeFoodIcon, RamenIcon, SpecialFoodIcon } from '@/components/ui/Illustrations';
import { fitWorld, WORLD_PLACES, WORLD_TRAIL, worldCameraOffset, type WorldDestination } from '@/utils/worldGeometry';
import type { WorldPeriod } from '@/utils/worldTime';
import { WorldAmbient } from './WorldAmbient';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { WORLD_MAPS, canVisitMap, isMapGround, mapStart, type WorldMapId } from '@/utils/worldMaps';
import { useWorldCamera } from './useWorldCamera';
import { WorldResident } from './WorldResident';

export const HOME_ART = {day: require('@/assets/images/world/home-day.jpg'), night: require('@/assets/images/world/home-night.jpg')};
export function FoodOffering({id, size}: {id: string; size: number}) {
  const Art = {berry: BerryIcon, apple: AppleIcon, candy: CandyIcon, cake: CakeFoodIcon, ramen: RamenIcon, special: SpecialFoodIcon}[id] ?? BerryIcon;
  return <Art size={size} />;
}
type Props = {
  level: number; customization: RoomCustomization; stage: MascotStage; growthSize: number; mascotName: string;
  active: boolean; reduceMotion: boolean; resting: boolean; reaction: number; meal: number; rest: number;
  hints: boolean; companion: boolean; totalDays: number; period: WorldPeriod; daySeed: number; food: string | null;
  wear?: ResidentItem; effect?: ResidentItem; decor?: ResidentItem; background?: string;
  onRecord: () => void; onFeed: () => void; onChat: () => void; onAlbum: () => void; onRest: () => void;
  onInteract: (kind: ResidentInteraction) => void; onMealFinished: () => void;
};

export function WorldHome(props: Props) {
  const {reduceMotion} = props;
  const [map,setMap]=useState<WorldMapId>('home');
  const [mapOpen,setMapOpen]=useState(false);
  const active=props.active&&!mapOpen;
  const [mapMessage,setMapMessage]=useState('');
  const [bounds, setBounds] = useState({width: 0, height: 0});
  const destinationId=useRef(0);
  const [destination, setDestination] = useState<WorldDestination | null>(null);
  const insets = useSafeAreaInsets();
  const footY = useSharedValue(WORLD_PLACES.idle.y);
  const holding = useSharedValue(0);
  const frame = fitWorld(bounds.width, bounds.height);
  const {width, height} = frame;
  const viewportHeight = bounds.height, frameTop = frame.top;
  const view = useWorldCamera({...frame,active,reduceMotion});
  const {follow:camera,zoom,touching}=view;
  useEffect(()=>{if(!canVisitMap(map,props.level))setMap('home');},[map,props.level]);
  useEffect(()=>{if(props.meal || props.rest)setMap('home');},[props.meal,props.rest]);
  useEffect(()=>{view.reset();setDestination(null);footY.value=mapStart(map).y;},[map]);
  useAnimatedReaction(() => ({y: footY.value, held: holding.value, cameraTouch: touching.value, zoom:zoom.value, active}), state => {
    if (!state.active) {cancelAnimation(camera); return;}
    if (!state.held && !state.cameraTouch && state.zoom < 1.02) camera.value = withTiming(worldCameraOffset(state.y, height, viewportHeight, frameTop), {duration: reduceMotion ? 0 : 350});
  }, [height, viewportHeight, frameTop, reduceMotion, active]);

  const walkTo = (point: {x: number; y: number}) => {
    if (props.active) setDestination({id:++destinationId.current,point});
  };
  const groundTap = (x: number, y: number) => {
    const point = {x: x / width, y: y / height};
    if (isMapGround(map,point)) walkTo(point);
  };
  const groundGesture = Gesture.Tap().enabled(active).simultaneousWithExternalGesture(view.pinch).maxDuration(250).maxDistance(10).onEnd((event, success) => {
    if (success) runOnJS(groundTap)(event.x, event.y);
  });
  const night = props.period === 'night';
  const source = map==='forest' ? require('@/assets/images/world/forest-clearing.jpg') : map==='lake' ? require('@/assets/images/world/lake-shore.jpg') : night ? HOME_ART.night : HOME_ART.day;
  const hotspot = (id: string, label: string, x: number, y: number, onPress: () => void) => (
    <Pressable key={id} testID={`room-${id}`} accessibilityRole="button" accessibilityLabel={label} onPress={onPress}
      style={({pressed}) => [s.hotspot, {left: x * width - 24, top: y * height - 24, opacity: pressed ? 0.6 : 1}]}>
      <View pointerEvents="none" style={s.glint} />
      {props.hints && <Text pointerEvents="none" style={s.hint}>{label}</Text>}
    </Pressable>
  );
  return <View style={s.root} testID="room-scene" onLayout={e => setBounds(e.nativeEvent.layout)}>
    <View pointerEvents="none" style={StyleSheet.absoluteFill}><Image source={source} resizeMode="cover" blurRadius={18} style={[s.art, {opacity: 0.8}]} /></View>
    {width > 0 && <GestureDetector gesture={view.gesture}><View style={StyleSheet.absoluteFill} collapsable={false}><Animated.View testID="world-stage" style={[{position: 'absolute', ...frame}, view.style]}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}><Image source={source} resizeMode="stretch" style={s.art} accessible={false} /></View>
      {map!=='home'&&night&&<View pointerEvents="none" style={[StyleSheet.absoluteFill,{backgroundColor:'#182C4B66'}]}/>}
      {props.period === 'dusk' && <View pointerEvents="none" style={[StyleSheet.absoluteFill, {backgroundColor: '#B5646028'}]} />}
      <GestureDetector gesture={groundGesture}><View testID="world-ground" accessible={false} style={StyleSheet.absoluteFill}/></GestureDetector>
      <WorldAmbient active={active} reduceMotion={props.reduceMotion} night={night} />
      {map==='home'&&<>{props.background && <View pointerEvents="none" style={{position: 'absolute', left: width * 0.276, top: height * 0.244, width: width * 0.072, height: height * 0.065, borderRadius: 14, opacity: 0.55, overflow: 'hidden'}}><Image source={{uri: props.background}} resizeMode="cover" style={s.art} /></View>}
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
      </>}
      <WorldResident {...props} active={active} map={map} zoom={zoom} cameraTouch={touching} cameraGesture={view.pinch} width={width} height={height} footY={footY} holding={holding} destination={destination} />
    </Animated.View></View></GestureDetector>}
    <LinearGradient pointerEvents="none" colors={['#15262A75', 'transparent']} style={s.topShade} />
    <LinearGradient pointerEvents="none" colors={['transparent', '#192D2CB8']} style={s.bottomShade} />
    <View style={[s.trail, {top: insets.top + 78}]} pointerEvents="box-none">
      {map==='home'&&Object.entries(WORLD_TRAIL).map(([id, place]) => <Pressable key={id} testID={`world-travel-${id}`} disabled={!props.active}
        accessibilityRole="button" accessibilityLabel={`${place.label}へ歩く`} onPress={() => walkTo(place.point)}
        style={({pressed}) => [s.trailStop, {opacity: pressed ? 0.65 : 1}]}><Text style={s.trailText}>{place.label}</Text></Pressable>)}
      <Pressable testID="world-map-open" accessibilityRole="button" accessibilityLabel="世界の地図を開く" onPress={()=>setMapOpen(true)} style={s.trailStop}><Text style={s.trailText}>地図</Text></Pressable>
    </View>
    <View style={[s.zoomTools,{top:insets.top+134}]}>
      <Pressable testID="world-zoom-in" accessibilityRole="button" accessibilityLabel="景色を拡大" onPress={view.closer} style={s.zoomButton}><Text style={s.zoomText}>＋</Text></Pressable>
      <Pressable testID="world-zoom-reset" accessibilityRole="button" accessibilityLabel="景色の拡大を戻す" onPress={view.reset} style={s.zoomButton}><Text style={s.trailText}>戻す</Text></Pressable>
    </View>
    {map!=='home'&&<View style={[s.placeLabel,{top:insets.top+84}]} pointerEvents="none"><Text style={s.trailText}>{WORLD_MAPS.find(p=>p.id===map)?.name}</Text></View>}
    {mapOpen&&<BottomSheet visible onClose={()=>setMapOpen(false)} title="ふたりの世界">
      <Text style={s.mapIntro}>小さな記録と一緒に、行ける場所が増えていきます。{ '\n' }お休みしても、開いた場所はそのままです。</Text>
      {WORLD_MAPS.map(place=>{const unlocked=canVisitMap(place.id,props.level);const busy=place.id!=='home'&&!!props.food;return <Pressable key={place.id} testID={`world-map-${place.id}`} accessibilityRole="button" disabled={!unlocked||busy} accessibilityState={{disabled:!unlocked||busy,selected:map===place.id}} onPress={()=>{if(!unlocked){setMapMessage(`レベル${place.level}で、この場所へおさんぽできます。`);return;}setMap(place.id);setMapOpen(false);setMapMessage('');}} style={s.mapRow}>
        <Text style={s.mapName}>{place.name}{map===place.id?'　・いまここ':''}</Text><Text style={s.mapCopy}>{busy?'おやつが終わったら、でかけよう。':unlocked?place.description:`レベル${place.level}でひらきます　（いま ${props.level}）`}</Text>
      </Pressable>;})}
      {!!mapMessage&&<Text accessibilityLiveRegion="polite" style={s.mapCopy}>{mapMessage}</Text>}
    </BottomSheet>}
    {props.hints && <Text pointerEvents="none" style={[s.travelHint, {top: insets.top + 128}]}>地面でおさんぽ。長押しで抱っこ。2本指で拡大。</Text>}
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
  zoomTools: {position:'absolute',right:16,gap:6}, zoomButton:{width:44,height:44,borderRadius:22,backgroundColor:'#253B35C9',alignItems:'center',justifyContent:'center'}, zoomText:{fontSize:24,color:'#FFF4DC'},
  placeLabel:{position:'absolute',left:86,padding:8},
  mapIntro:{fontSize:13,lineHeight:23,color:'#59624F',marginBottom:14},mapRow:{padding:18,marginBottom:10,borderRadius:18,backgroundColor:'#F0EDDF',gap:8,minHeight:76},mapName:{fontSize:17,fontWeight:'600',color:'#344C3C'},mapCopy:{fontSize:13,lineHeight:21,color:'#59624F'},
  travelHint: {position: 'absolute', left: 20, color: '#FFF4DA', fontSize: 11},
});
