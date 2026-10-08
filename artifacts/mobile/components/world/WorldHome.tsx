import React, { useEffect, useRef, useState } from 'react';
import { Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { cancelAnimation, runOnJS, useAnimatedReaction, useSharedValue, withTiming } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RoomCustomization } from '@/contexts/AppContext';
import { StaticMascot } from '@/components/Mascot';
import type { MascotStage } from '@/utils/mascotUtils';
import { type ResidentItem, type ResidentInteraction } from '@/components/room/RoomResident';
import { RoomFurnitureArt, RoomFlowerArt } from '@/components/room/RoomFurnitureArt';
import { fitWorld, WORLD_PLACES, WORLD_TRAIL, worldCameraOffset, type WorldDestination } from '@/utils/worldGeometry';
import type { WorldPeriod } from '@/utils/worldTime';
import { WorldAmbient } from './WorldAmbient';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { WORLD_MAPS, canVisitMap, isMapGround, mapStart, type WorldMapId } from '@/utils/worldMaps';
import { useWorldCamera } from './useWorldCamera';
import { WorldResident } from './WorldResident';
import { WorldSteering } from '@/components/village/WorldSteering';
import { BathingEgg, VillageNeighbors, VillageResident } from '@/components/village/VillageActors';
import { VillageWheel } from '@/components/village/VillageWheel';
import { mapPortals,VILLAGERS,type VillagerId,type VillageExperience } from '@/utils/villageLife';
import {mapGroundPoint} from '@/utils/worldMaps';

import { HOME_ART, OUTDOOR_ART, prepareWorldArt, worldArt } from '@/utils/worldArt';
import { WorldPill, worldUI } from './WorldPill';
import { Icon } from '@/components/ui/Icon';
import { RamenArt } from '@/components/village/RamenArt';
import { useSceneTransition } from './useSceneTransition';
import {WorldBowlingPins} from './WorldBowling';
import {useWorldBowling} from './useWorldBowling';
export { HOME_ART } from '@/utils/worldArt';
type VillageAction={kind:'portal';map:WorldMapId}|{kind:'bath'|'wheel'|'shop'|'feed'|'ramen-meal'}|{kind:'neighbor';id:VillagerId};
type Props = {
  careInvitation:boolean;onSceneBusy:(busy:boolean)=>void;onShop:()=>void;onGarden:()=>void;initialMap?:WorldMapId;
  level: number; customization: RoomCustomization; stage: MascotStage; growthSize: number; mascotName: string;
  active: boolean; reduceMotion: boolean; resting: boolean; reaction: number; meal: number; rest: number;
  hints: boolean; companion: boolean; totalDays: number; period: WorldPeriod; daySeed: number; food: string | null;
  wear?: ResidentItem; effect?: ResidentItem; decor?: ResidentItem; background?: string;
  onRecord: () => void; onFeed: (venue?: 'ramen') => void; onChat: () => void; onAlbum: () => void; onRest: () => void;
  onInteract: (kind: ResidentInteraction) => void; onMealFinished: () => void;
};

export function WorldHome(props: Props) {
  const {reduceMotion} = props;
  const [map,setMap]=useState<WorldMapId>(props.initialMap??'home');
  const [mapOpen,setMapOpen]=useState(false);
  const [placesOpen,setPlacesOpen]=useState(false),[viewOpen,setViewOpen]=useState(false);
  const [experience,setExperience]=useState<VillageExperience|null>(null);
  const [neighbor,setNeighbor]=useState<VillagerId|null>(null);
  const [reply,setReply]=useState('');
  const pending=useRef<{id:number;action:VillageAction}|null>(null);
  const [mapMessage,setMapMessage]=useState('');
  const transition=useSceneTransition(reduceMotion,()=>setMapMessage('景色を読み込めませんでした。もう一度、行き先を選んでね。'));
  const active=props.active&&!mapOpen&&!placesOpen&&!viewOpen&&!neighbor&&!transition.busy;
  const bowling=useWorldBowling(map,active);
  const footX=useSharedValue(.5);
  const steering=useSharedValue({x:0,y:0});
  useEffect(()=>{props.onSceneBusy(!!experience||mapOpen||placesOpen||viewOpen||!!neighbor||transition.busy);return()=>props.onSceneBusy(false);},[experience,mapOpen,placesOpen,viewOpen,neighbor,transition.busy,props.onSceneBusy]);
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
  useEffect(()=>{if(props.meal){setExperience(null);setNeighbor(null);if(map!=='ramen')setMap('home');}},[props.meal]);
  useEffect(()=>{if(props.rest){setExperience(null);setNeighbor(null);setMap('home');}},[props.rest]);
  useEffect(()=>{for(const place of mapPortals(map))if(canVisitMap(place.to,props.level))void prepareWorldArt(place.to,props.period==='night').catch(()=>{});},[map,props.level,props.period]);
  useEffect(()=>{view.reset();setDestination(null);pending.current=null;setExperience(null);steering.value={x:0,y:0};footY.value=mapStart(map).y;footX.value=mapStart(map).x;},[map]);
  useAnimatedReaction(() => ({y: footY.value, held: holding.value, cameraTouch: touching.value, zoom:zoom.value, active}), state => {
    if (!state.active) {cancelAnimation(camera); return;}
    if (!state.held && !state.cameraTouch && state.zoom < 1.02) camera.value = withTiming(worldCameraOffset(state.y, height, viewportHeight, frameTop), {duration: reduceMotion ? 0 : 350});
  }, [height, viewportHeight, frameTop, reduceMotion, active]);

  const walkTo = (point: {x: number; y: number}) => {
    if (active&&!props.food&&!experience&&!bowling.busy) {pending.current=null;setDestination({id:++destinationId.current,point:mapGroundPoint(map,point)});}
  };
  const enterMap=(target:WorldMapId,fromMap=false)=>{
    if(!props.active||neighbor||transition.busy||(!fromMap&&(mapOpen||placesOpen||viewOpen))||props.food||experience)return;
    if(!canVisitMap(target,props.level)){const place=WORLD_MAPS.find(p=>p.id===target)!;setMapMessage(`${place.name}はレベル${place.level}でひらきます。`);return;}
    setMapOpen(false);setPlacesOpen(false);setViewOpen(false);
    if(target===map)return;
    pending.current=null;setDestination(null);steering.value={x:0,y:0};setMapMessage('');
    const place=WORLD_MAPS.find(p=>p.id===target)!;
    void transition.run(place.name,()=>setMap(target),()=>prepareWorldArt(target,props.period==='night'));
  };
  const request=(point:{x:number;y:number},action:VillageAction)=>{
    if(!active||props.food||experience)return;
    if(action.kind==='portal'){enterMap(action.map);return;}
    if(action.kind==='shop'||action.kind==='feed'||action.kind==='ramen-meal'){
      pending.current=null;setDestination(null);steering.value={x:0,y:0};
      void transition.run(action.kind==='shop'?'暮らしのお店':action.kind==='ramen-meal'?'もふもふラーメン':'ごはんのお店',()=>{if(action.kind==='shop')props.onShop();else props.onFeed(action.kind==='ramen-meal'?'ramen':undefined);});
      return;
    }
    const id=++destinationId.current;pending.current={id,action};setDestination({id,point:mapGroundPoint(map,point)});
  };
  const arrive=(id:number)=>{
    const next=pending.current;if(!next||next.id!==id)return;pending.current=null;
    const a=next.action;
    if(a.kind==='portal')enterMap(a.map);
    else if(a.kind==='bath'||a.kind==='wheel')setExperience(a.kind);
    else if(a.kind==='shop')props.onShop();
    else if(a.kind==='feed')props.onFeed();
    else if(a.kind==='neighbor'){setNeighbor(a.id);setReply('');}
  };
  const finishExperience=()=>{setExperience(null);setDestination(null);};
  const groundTap = (x: number, y: number) => {
    const point = {x: x / width, y: y / height};
    if (isMapGround(map,point)) walkTo(point);
  };
  const groundGesture = Gesture.Tap().enabled(active&&!props.food&&!experience&&!bowling.busy).simultaneousWithExternalGesture(view.pinch).maxDuration(250).maxDistance(10).onEnd((event, success) => {
    if (success) runOnJS(groundTap)(event.x, event.y);
  });
  const night = props.period === 'night';
  const source = worldArt(map,night);
  const hotspot = (id: string, label: string, x: number, y: number, onPress: () => void) => (
    <Pressable key={id} testID={`room-${id}`} accessibilityRole="button" accessibilityLabel={label} onPress={onPress}
      style={({pressed}) => [s.hotspot, {left: x * width - 24, top: y * height - 24, opacity: pressed ? 0.6 : 1}]}>
      <View pointerEvents="none" style={s.glint} />
    {props.hints && <Text pointerEvents="none" style={s.hint}>{label}</Text>}
    </Pressable>
  );
  const facility=(id:string,label:string,point:{x:number;y:number},action:VillageAction)=><Pressable key={id} testID={`village-${id}`} accessibilityRole="button" accessibilityLabel={label} disabled={!active||!!props.food||!!experience} onPress={()=>request(point,action)} style={[s.facility,{left:point.x*width-60,top:point.y*height-30}]}><Text style={s.facilityText}>{label}</Text></Pressable>;
  const speaker=VILLAGERS.find(n=>n.id===neighbor);
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
      {hotspot('meal', 'ごはん', 0.765, 0.602, () => props.onFeed())}
      {props.customization.flower !== 'none' && <View pointerEvents="none" style={{position: 'absolute', left: width * 0.15, top: height * 0.495, zIndex: 550}}>
        <RoomFlowerArt id={props.customization.flower} size={width * 0.15} accessible />
      </View>}
      {props.customization.furniture !== 'none' && <View pointerEvents="none" style={{position: 'absolute', left: width * 0.22, top: height * 0.51, zIndex: 560}}>
        <RoomFurnitureArt id={props.customization.furniture} size={width * 0.19} />
      </View>}
      {props.decor && <View pointerEvents="none" style={{position: 'absolute', left: width * 0.72 + props.decor.x, top: height * 0.46 + props.decor.y, width: width * 0.12 * props.decor.scale, height: width * 0.12 * props.decor.scale, zIndex: 540}}><Image source={{uri: props.decor.uri}} resizeMode="contain" style={s.art} /></View>}
      {props.companion && <View pointerEvents="none" style={{position: 'absolute', left: width * 0.57, top: height * 0.54, zIndex: 615}}><StaticMascot stage="egg" mood="happy" size={width * 0.085} /></View>}
      </>}
      {map==='lake'&&<VillageWheel width={width} height={height} active={active} reduceMotion={reduceMotion} riding={experience==='wheel'} onFinish={finishExperience}/>}
      {map==='village'&&<VillageNeighbors width={width} height={height} active={active&&!experience} reduceMotion={reduceMotion} onTalk={id=>{const n=VILLAGERS.find(p=>p.id===id)!;request({x:n.x+.06,y:n.y+.035},{kind:'neighbor',id});}}/>}
      {map==='market'&&<View pointerEvents="none" style={{position:'absolute',left:width*.20,top:height*.36,width:width*.105,zIndex:455}}><VillageResident stage="stage3" size={width*.105} active={active} reduceMotion={reduceMotion} scarf="#BEA2C6"/></View>}
      {map==='ramen'&&<View pointerEvents="none" style={{position:'absolute',left:width*.42,top:height*.285,width:width*.18,zIndex:440}}><VillageResident stage="odango" size={width*.18} active={active} reduceMotion={reduceMotion} scarf="#DCA5B4"/></View>}
      {map==='bowling'&&<WorldBowlingPins motion={bowling.motion} width={width} height={height}/>}
      <WorldResident {...props} bowling={bowling.motion} bowlingBusy={bowling.busy} onBowlingRoll={input=>{pending.current=null;setDestination(null);steering.value={x:0,y:0};void bowling.roll(input);}} onBowlingFinished={bowling.finish} footX={footX} steering={steering} experience={experience} onPortal={enterMap} onDestinationReached={arrive} active={active} map={map} zoom={zoom} cameraTouch={touching} cameraGesture={view.pinch} width={width} height={height} footY={footY} holding={holding} destination={destination} />
      {experience==='bath'&&<BathingEgg stage={props.stage} width={width} height={height} active={active} reduceMotion={reduceMotion}/>}
    </Animated.View></View></GestureDetector>}
    <LinearGradient pointerEvents="none" colors={['#15262A75', 'transparent']} style={s.topShade} />
    <LinearGradient pointerEvents="none" colors={['transparent', '#192D2CB8']} style={s.bottomShade} />
    <View style={[s.toolbar,{top:insets.top+126}]} pointerEvents="box-none">
      <WorldPill testID="world-map-open" icon="map" label={WORLD_MAPS.find(p=>p.id===map)!.name} accessibilityLabel="世界の地図を開く" disabled={!active||bowling.busy} onPress={()=>{steering.value={x:0,y:0};setMapOpen(true);}} style={{maxWidth:260}} />
      <WorldPill compact icon="sliders" label="景色の見かた" disabled={!active||bowling.busy} onPress={()=>setViewOpen(true)} />
    </View>
    {map==='bowling'&&<View pointerEvents="none" testID="world-bowling-status" style={[s.bowlingStatus,{top:insets.top+182}]}><Text accessibilityLiveRegion="polite" style={s.mapCopy}>{bowling.message}</Text></View>}
    {!experience&&['market','ramen','onsen','lake'].includes(map)&&<View style={[s.placeAction,{bottom:bounds.height<600?172:236}]}>
      <WorldPill testID={map==='ramen'?'village-ramen-menu':map==='market'?'village-market-menu':map==='onsen'?'village-bath':'village-ride'} primary
        label={map==='market'?'お店をのぞく':map==='ramen'?'ラーメンを注文':map==='onsen'?'温泉に入る':'観覧車に乗る'}
        icon={map==='market'?'shopping-bag':map==='ramen'?'coffee':map==='onsen'?'sun':'disc'} disabled={!active||!!props.food}
        onPress={()=>{if(map==='market'){steering.value={x:0,y:0};setPlacesOpen(true);}else request({x:map==='lake'?.61:.51,y:.5},{kind:map==='ramen'?'ramen-meal':map==='onsen'?'bath':'wheel'});}} />
    </View>}
    {viewOpen&&<BottomSheet visible title="景色の見かた" onClose={()=>setViewOpen(false)}>
      <View style={{flexDirection:'row',gap:10}}><WorldPill testID="world-zoom-in" label="拡大する" icon="zoom-in" accessibilityLabel="景色を拡大" onPress={view.closer}/><WorldPill testID="world-zoom-reset" label="元の広さへ" icon="maximize" accessibilityLabel="景色の拡大を戻す" onPress={view.reset}/></View>
      <Text style={s.mapCopy}>地面をタップ、または左の丸を動かしておさんぽ。2本指でも景色を拡大できます。</Text>
      {map==='home'&&Object.entries(WORLD_TRAIL).map(([id,place])=><WorldPill key={id} testID={'world-travel-'+id} label={place.label+'へ歩く'} icon="navigation" onPress={()=>{setViewOpen(false);setDestination({id:++destinationId.current,point:mapGroundPoint(map,place.point)});}}/>)}
    </BottomSheet>}
    {placesOpen&&<BottomSheet visible title="こもれび市場" subtitle="今日は、どこに寄っていく？" onClose={()=>setPlacesOpen(false)}>
      <WorldPill testID="village-shop" label="暮らしのお店" icon="shopping-bag" onPress={()=>{setPlacesOpen(false);void transition.run('暮らしのお店',props.onShop);}}/>
      <WorldPill testID="village-food-stall" label="ごはんのお店" icon="heart" onPress={()=>{setPlacesOpen(false);void transition.run('ごはんのお店',()=>props.onFeed());}}/>
      <Pressable testID="village-portal-ramen" accessibilityRole="button" accessibilityLabel="もふもふラーメンへの道" onPress={()=>enterMap('ramen',true)} style={s.mapRow}><RamenArt size={68}/><View style={{flex:1,gap:5}}><Text style={s.mapName}>もふもふラーメン</Text><Text style={s.mapCopy}>お店で食べる、とっておきの一杯。</Text></View><Icon name="chevron-right" color={worldUI.violet}/></Pressable>
      <WorldPill testID="village-bowling" label="ころころボウリング" icon="circle" onPress={()=>enterMap('bowling',true)}/>
    </BottomSheet>}
    {mapOpen&&<BottomSheet visible onClose={()=>setMapOpen(false)} title="ふたりの世界">
      <Text style={s.mapIntro}>行きたい場所を選んで、おでかけ。{ '\n' }お休みしても、開いた場所はそのままです。</Text>
      {WORLD_MAPS.map(place=>{const unlocked=canVisitMap(place.id,props.level);const busy=!!experience||!!props.food||transition.busy;return <Pressable key={place.id} testID={`world-map-${place.id}`} accessibilityRole="button" disabled={!unlocked||busy} accessibilityState={{disabled:!unlocked||busy,selected:map===place.id}} onPress={()=>{if(!unlocked){setMapMessage(`レベル${place.level}で、この場所へおさんぽできます。`);return;}enterMap(place.id,true);}} style={s.mapRow}>
        <Image source={place.id==='home'?HOME_ART.day:OUTDOOR_ART[place.id]} style={s.mapThumb}/><View style={{flex:1,gap:6}}><Text style={s.mapName}>{place.name}{map===place.id?'　・いまここ':''}</Text><Text style={s.mapCopy}>{busy?experience?'ひと休みが終わったら、でかけよう。':'おやつが終わったら、でかけよう。':unlocked?place.description:`レベル${place.level}でひらきます　（いま ${props.level}）`}</Text></View>
      </Pressable>;})}
      <Pressable accessibilityRole="button" disabled={!!props.food||!!experience||transition.busy} onPress={()=>{setMapOpen(false);void transition.run('ひかりの庭',props.onGarden);}} style={s.mapRow}><Text style={s.mapName}>ひかりの庭へ</Text></Pressable>
      {!!mapMessage&&<Text accessibilityLiveRegion="polite" style={s.mapCopy}>{mapMessage}</Text>}
    </BottomSheet>}
    {!!mapMessage&&!mapOpen&&<Pressable accessibilityRole="button" accessibilityLabel="道の案内を閉じる" onPress={()=>setMapMessage('')} style={[s.notice,{top:insets.top+174}]}><Text accessibilityLiveRegion="polite" style={s.trailText}>{mapMessage}　×</Text></Pressable>}
    {experience&&<View testID="village-experience" style={[s.experience,{bottom:bounds.height<600?160:210}]}><Text style={s.experienceText}>{experience==='bath'?'ぽかぽか。ここで、ひと休み。':'空から、いつもの世界を眺めよう。'}</Text><Pressable testID="village-experience-exit" accessibilityRole="button" onPress={finishExperience} style={s.exit}><Text style={s.exitText}>{experience==='bath'?'お湯からあがる':'観覧車から降りる'}</Text></Pressable></View>}
    {!props.careInvitation&&!experience&&<View style={{position:'absolute',left:20,bottom:bounds.height<600?170:230}}><WorldSteering value={steering} enabled={active&&!props.food&&!bowling.busy} onStart={()=>{pending.current=null;setDestination(null);}} onStep={(dx,dy)=>walkTo({x:footX.value+dx*.055,y:footY.value+dy*.04})}/></View>}
    {speaker&&<BottomSheet visible title={speaker.name} subtitle="となりの村の住人" onClose={()=>setNeighbor(null)}><View style={{alignItems:'center'}}><VillageResident stage={speaker.stage} size={112} active={props.active} reduceMotion={reduceMotion} scarf={speaker.color}/></View><Text testID="village-dialogue" accessibilityLiveRegion="polite" style={s.dialogue}>{reply||speaker.intro}</Text>{speaker.choices.map(choice=><Pressable key={choice.label} accessibilityRole="button" onPress={()=>setReply(choice.reply)} style={s.mapRow}><Text style={s.mapCopy}>{choice.label}</Text></Pressable>)}<Pressable accessibilityRole="button" onPress={()=>setNeighbor(null)} style={s.exit}><Text style={s.exitText}>またね</Text></Pressable></BottomSheet>}
    {transition.overlay}
    {props.hints && map!=='bowling' && <Text pointerEvents="none" style={[s.travelHint, {top: insets.top + 182}]}>左の丸で自由に移動。地面でも移動。2本指で拡大。</Text>}
  </View>;
}
const s = StyleSheet.create({
  bowlingStatus:{position:'absolute',left:20,right:20,maxWidth:400,padding:12,borderRadius:18,backgroundColor:'#FFF8EDed'},
  toolbar:{position:'absolute',left:20,right:20,flexDirection:'row',gap:8,alignItems:'center'},
  placeAction:{position:'absolute',left:116,right:20,maxWidth:240},
  ramenWelcome:{position:'absolute',padding:10,borderRadius:20,backgroundColor:'#FFF7E8EE'},ramenWelcomeText:{fontSize:13,textAlign:'center',color:'#795F77',lineHeight:21},
  facility:{position:'absolute',minHeight:44,width:120,borderRadius:20,alignItems:'center',justifyContent:'center',backgroundColor:'#FFF1DCEB',borderWidth:1,borderColor:'#AE9068',zIndex:880,shadowColor:'#2D3326',shadowOpacity:.22,shadowRadius:6},facilityText:{fontSize:12,fontWeight:'600',color:'#584D37'},portal:{position:'absolute',minHeight:44,width:84,borderRadius:16,alignItems:'center',justifyContent:'center',backgroundColor:'#344A3BB8',borderWidth:1,borderColor:'#D9C29190',zIndex:860},portalText:{fontSize:10,color:'#FFF1D3',textAlign:'center'},mapThumb:{width:64,height:72,borderRadius:12},notice:{position:'absolute',left:20,right:70,padding:12,borderRadius:16,backgroundColor:'#3C5243ED'},experience:{position:'absolute',left:20,right:72,gap:10,padding:14,borderRadius:20,backgroundColor:'#FFF4E4F0'},experienceText:{fontSize:13,lineHeight:20,color:'#615342'},exit:{minHeight:44,paddingHorizontal:16,borderRadius:22,alignItems:'center',justifyContent:'center',backgroundColor:'#5B4867'},exitText:{color:'#FFF3DF',fontSize:13},dialogue:{fontSize:17,lineHeight:30,color:'#52465B',marginVertical:18},
  art: {position: 'absolute', left: 0, top: 0, width: '100%', height: '100%'},
  // Web focus restoration must not scroll the clipped scenery and its fixed HUD.
  root: {flex: 1, backgroundColor: '#253C35', overflow: Platform.OS === 'web' ? 'clip' as 'hidden' : 'hidden'},
  hotspot: {position: 'absolute', width: 48, height: 48, alignItems: 'center', justifyContent: 'center', zIndex: 900},
  glint: {width: 7, height: 7, borderRadius: 4, backgroundColor: '#FFF4CD', borderWidth: 1, borderColor: '#AC986E', shadowColor: '#FFF1BE', shadowRadius: 5, shadowOpacity: 0.8},
  hint: {position: 'absolute', top: 40, minWidth: 90, fontSize: 11, textAlign: 'center', color: '#FFF3DF', backgroundColor: '#233630DB', paddingVertical: 5, paddingHorizontal: 8, borderRadius: 12},
  topShade: {position: 'absolute', left: 0, right: 0, top: 0, height: 130},
  bottomShade: {position: 'absolute', left: 0, right: 0, bottom: 0, height: 225},
  trail: {position: 'absolute', left: 20, flexDirection: 'row', gap: 6},
  trailStop: {minHeight: 44, minWidth: 52, paddingHorizontal: 13, justifyContent: 'center', borderRadius: 22, backgroundColor: '#253B35B8', borderWidth: 1, borderColor: '#FFF5DA35'},
  trailText: {color: '#F5EDDA', fontSize: 12},
  zoomTools: {position:'absolute',right:16,gap:6}, zoomButton:{width:44,height:44,borderRadius:22,backgroundColor:'#253B35C9',alignItems:'center',justifyContent:'center'}, zoomText:{fontSize:24,color:'#FFF4DC'},
  placeLabel:{position:'absolute',left:20,padding:8},
  mapIntro:{fontSize:13,lineHeight:23,color:'#8B798E',marginBottom:14},mapRow:{flexDirection:'row',alignItems:'center',padding:14,marginBottom:10,borderRadius:18,backgroundColor:'#F8F2FB',gap:8,minHeight:76},mapName:{fontSize:17,fontWeight:'600',color:'#60466E'},mapCopy:{fontSize:13,lineHeight:21,color:'#8B798E'},
  travelHint: {position: 'absolute', left: 20, color: '#FFF4DA', fontSize: 11},
});
