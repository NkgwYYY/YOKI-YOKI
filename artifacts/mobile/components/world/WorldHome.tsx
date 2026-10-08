import {MerchantResident} from '@/components/village/MerchantResident';
import {WorldGate} from './WorldGate';
import {useHousekeeping} from './useHousekeeping';
import {HouseDust} from './HouseDust';
import {RobotCleaner} from './RobotCleaner';
import {CleaningToolArt} from './CleaningToolArt';
import {CLEANING_TOOLS,type CleaningTool} from '@/utils/housekeeping';
import React, { useEffect, useRef, useState } from 'react';
import { Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { cancelAnimation, runOnJS, useAnimatedReaction, useSharedValue, withTiming } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp, type RoomCustomization } from '@/contexts/AppContext';
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
import { mapPortals,nearbyPortalIndex,VILLAGERS,type VillagerId,type VillageExperience } from '@/utils/villageLife';
import {mapGroundPoint} from '@/utils/worldMaps';

import { HOME_ART, OUTDOOR_ART, prepareWorldArt, worldArt } from '@/utils/worldArt';
import { WorldPill, worldUI } from './WorldPill';
import { Icon } from '@/components/ui/Icon';
import { RamenArt } from '@/components/village/RamenArt';
import { useSceneTransition } from './useSceneTransition';
import {WorldBowlingPins} from './WorldBowling';
import {useWorldBowling} from './useWorldBowling';
import {VillageMap} from './VillageMap';
import {SmokingResident} from '@/components/village/SmokingResident';
import {Icon as DoorIcon} from '@/components/ui/Icon';
export { HOME_ART } from '@/utils/worldArt';
type VillageAction={kind:'portal';map:WorldMapId}|{kind:'bath'|'wheel'|'smoke'|'shop'|'feed'|'ramen-meal'}|{kind:'neighbor';id:VillagerId};
type Props = {
  cleanliness:number;
  happinessValue:number;
  music:{enabled:boolean;busy:boolean;toggle:()=>void;error:string};
  careInvitation:boolean;onSceneBusy:(busy:boolean)=>void;onShop:()=>void;onJob:()=>void;onGarden:()=>void;initialMap?:WorldMapId;
  level: number; customization: RoomCustomization; stage: MascotStage; growthSize: number; mascotName: string;
  active: boolean; reduceMotion: boolean; resting: boolean; reaction: number; meal: number; rest: number;
  hints: boolean; companion: boolean; totalDays: number; period: WorldPeriod; daySeed: number; food: string | null;
  wear?: ResidentItem; effect?: ResidentItem; decor?: ResidentItem; background?: string;
  onRecord: () => void; onFeed: (venue?: 'ramen') => void; onChat: () => void; onAlbum: () => void; onRest: () => void;
  onInteract: (kind: ResidentInteraction) => void; onMealFinished: () => void;
};

export function WorldHome(props: Props) {
  const {reduceMotion} = props;
  const {awardHappiness}=useApp();
  const [zooming,setZooming]=useState(false);
  const [cleanOpen,setCleanOpen]=useState(false),[cleanTool,setCleanTool]=useState<CleaningTool|null>(null),[riding,setRiding]=useState(false);
  const [experienceMessage,setExperienceMessage]=useState('');
  const smokeSession=useRef('');
  const shopTimer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
  const returning=useRef(false);
  const latestActive=useRef(props.active);latestActive.current=props.active;
  const portalTravel=useSharedValue(false);
  const [map,setMap]=useState<WorldMapId>(props.initialMap??'home');
  const [mapOpen,setMapOpen]=useState(false);
  const [placesOpen,setPlacesOpen]=useState(false),[viewOpen,setViewOpen]=useState(false);
  const [experience,setExperience]=useState<VillageExperience|null>(null);
  const [neighbor,setNeighbor]=useState<VillagerId|null>(null);
  const [reply,setReply]=useState('');
  const pending=useRef<{id:number;action:VillageAction}|null>(null);
  const [mapMessage,setMapMessage]=useState('');
  const transition=useSceneTransition(reduceMotion,()=>setMapMessage('景色を読み込めませんでした。もう一度、行き先を選んでね。'));
  const active=props.active&&!cleanOpen&&!mapOpen&&!placesOpen&&!viewOpen&&!neighbor&&!transition.busy&&!zooming;
  const housekeeping=useHousekeeping(props.active);
  const bowling=useWorldBowling(map,active);
  const footX=useSharedValue(.5);
  const steering=useSharedValue({x:0,y:0});
  useEffect(()=>{props.onSceneBusy(!!experience||mapOpen||placesOpen||viewOpen||!!neighbor||transition.busy||zooming||cleanOpen||!!cleanTool||riding);return()=>props.onSceneBusy(false);},[experience,mapOpen,placesOpen,viewOpen,neighbor,transition.busy,zooming,cleanOpen,cleanTool,riding,props.onSceneBusy]);
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
  useEffect(()=>()=>clearTimeout(shopTimer.current),[]);
  useEffect(()=>{
    if(!props.active){clearTimeout(shopTimer.current);returning.current=true;setZooming(false);}
    else if(returning.current){returning.current=false;view.reset();}
  },[props.active]);
  useEffect(()=>{
    if(!experience||experience==='wheel'||!active)return;
    setExperienceMessage('のんびり、ひと休み。');
    let alive=true;
    const timer=setTimeout(()=>{
      void awardHappiness(experience==='bath'?'bath':'smoke',experience==='smoke'?smokeSession.current:undefined).then(result=>{
        if(alive)setExperienceMessage(result.gained>0?`幸福 ＋${result.gained}${experience==='smoke'?' / 清潔 −3':''}`:experience==='smoke'?'ゆっくり一服。清潔 −3':'今日のひと休みも、うれしい時間。');
      }).catch(()=>{if(alive)setExperienceMessage('保存できませんでした。一度戻って、もう一度お試しください。');});
    },8000);
    return()=>{alive=false;clearTimeout(timer);};
  },[experience,active,awardHappiness]);
  const openMerchant=(kind:'shop'|'food'|'ramen'|'tobacco'|'job',point:{x:number;y:number})=>{
    if(!active||props.food||experience||bowling.busy)return;
    portalTravel.value=false;steering.value={x:0,y:0};pending.current=null;setDestination(null);
    setZooming(true);view.focusAt(point,bounds);
    clearTimeout(shopTimer.current);
    shopTimer.current=setTimeout(()=>{
      if(!latestActive.current)return;
      setZooming(false);
      if(kind==='shop')props.onShop();
      else if(kind==='job')props.onJob();
      else if(kind==='food'||kind==='ramen')props.onFeed(kind==='ramen'?'ramen':undefined);
      else setPlacesOpen(true);
    },reduceMotion?0:460);
  };
  useEffect(()=>{if(!canVisitMap(map,props.level))setMap('home');},[map,props.level]);
  useEffect(()=>{if(props.meal){setExperience(null);setNeighbor(null);if(map!=='ramen'&&map!=='diner')setMap('home');}},[props.meal]);
  useEffect(()=>{if(props.rest){setExperience(null);setNeighbor(null);setMap('home');}},[props.rest]);
  // Decode on demand: visiting a hub must not prefetch every high-resolution shop.
  useEffect(()=>{void prepareWorldArt('home',props.period==='night').catch(()=>{});},[props.period]);
  useEffect(()=>{setRiding(false);setCleanTool(null);view.reset();portalTravel.value=false;clearTimeout(shopTimer.current);setZooming(false);setDestination(null);pending.current=null;setExperience(null);steering.value={x:0,y:0};footY.value=mapStart(map).y;footX.value=mapStart(map).x;},[map]);
  useAnimatedReaction(() => ({y: footY.value, held: holding.value, cameraTouch: touching.value, zoom:zoom.value, active}), state => {
    if (!state.active) {cancelAnimation(camera); return;}
    // Keep both ends of the longer lane in the usual overview on a tall screen.
    // Compact landscape retains the normal character-follow camera.
    let offset=worldCameraOffset(state.y,height,viewportHeight,frameTop);
    if(map==='bowling'&&viewportHeight>=600){
      const minOffset=insets.top+206-frameTop-height*.29;
      const maxOffset=viewportHeight-136-frameTop-height*.715;
      offset=Math.min(maxOffset,Math.max(0,minOffset));
    }
    if (!state.held && !state.cameraTouch && state.zoom < 1.02) camera.value = withTiming(offset, {duration: reduceMotion ? 0 : 350});
  }, [height, viewportHeight, frameTop, reduceMotion, active,map,insets.top]);

  const walkTo = (point: {x: number; y: number},throughGate=false) => {
    if (active&&!cleanTool&&!riding&&!props.food&&!experience&&!bowling.busy) {portalTravel.value=throughGate;pending.current=null;setDestination({id:++destinationId.current,point:mapGroundPoint(map,point)});}
  };
  const enterMap=(target:WorldMapId,fromMap=false)=>{
    if(!props.active||cleanTool||riding||neighbor||transition.busy||(!fromMap&&(mapOpen||placesOpen||viewOpen))||props.food||experience)return;
    portalTravel.value=false;steering.value={x:0,y:0};setDestination(null);
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
    portalTravel.value=false;
    const id=++destinationId.current;pending.current={id,action};setDestination({id,point:mapGroundPoint(map,point)});
  };
  const arrive=(id:number)=>{
    if(portalTravel.value&&destination?.id===id){const gates=mapPortals(map),gate=nearbyPortalIndex(destination.point,gates);if(gate>=0){enterMap(gates[gate].to);return;}}
    const next=pending.current;portalTravel.value=false;if(!next||next.id!==id)return;pending.current=null;
    const a=next.action;
    if(a.kind==='portal')enterMap(a.map);
    else if(a.kind==='bath'||a.kind==='wheel'||a.kind==='smoke')setExperience(a.kind);
    else if(a.kind==='shop')props.onShop();
    else if(a.kind==='feed')props.onFeed();
    else if(a.kind==='neighbor'){setNeighbor(a.id);setReply('');}
  };
  const finishExperience=()=>{setExperience(null);setDestination(null);};
  const groundTap = (x: number, y: number) => {
    const point = {x: x / width, y: y / height};
    if (isMapGround(map,point)) walkTo(point);
  };
  const groundGesture = Gesture.Tap().enabled(active&&!cleanTool&&!riding&&!props.food&&!experience&&!bowling.busy).simultaneousWithExternalGesture(view.pinch).maxDuration(250).maxDistance(10).onEnd((event, success) => {
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
  const merchant=(id:string,label:string,point:{x:number;y:number},stage:MascotStage,kind:'shop'|'food'|'ramen'|'tobacco'|'job')=><Pressable
    key={id} testID={`merchant-${id}`} accessibilityRole="button" accessibilityLabel={`${kind==='job'?label:label+'の店員'}。タップして入る`} disabled={!active||!!props.food||!!experience}
    onPress={()=>openMerchant(kind,point)} style={{position:'absolute',left:width*point.x-width*.12,top:height*point.y-width*.23,width:width*.24,minWidth:44,minHeight:44,alignItems:'center',zIndex:850}}>
    <MerchantResident kind={kind} size={width*.24} active={active} reduceMotion={reduceMotion}/>
    <Text style={s.merchantLabel}>{label}</Text>
  </Pressable>;
  const speaker=VILLAGERS.find(n=>n.id===neighbor);
  return <View style={s.root} testID="room-scene" onLayout={e => setBounds(e.nativeEvent.layout)}>
    <View pointerEvents="none" style={StyleSheet.absoluteFill}><Image source={source} resizeMode="cover" blurRadius={18} style={[s.art, {opacity: 0.8}]} /></View>
    {width > 0 && <GestureDetector gesture={view.gesture}><View style={StyleSheet.absoluteFill} collapsable={false}><Animated.View testID="world-stage" style={[{position: 'absolute', ...frame}, view.style]}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}><Image source={source} resizeMode="stretch" style={s.art} accessible={false} /></View>
      {!['home','homewares','diner'].includes(map)&&night&&<View pointerEvents="none" style={[StyleSheet.absoluteFill,{backgroundColor:'#35234922'}]}/>}
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
      {map==='home'&&<>
        <HouseDust width={width} height={height} dirt={housekeeping.dirt} tool={cleanTool} active={active} onClean={housekeeping.clean}/>
        {housekeeping.house.owned.includes('robot')&&<RobotCleaner width={width} height={height} active={active&&!cleanTool&&!props.food&&!experience} reduceMotion={reduceMotion} riding={riding} footX={footX} footY={footY} onClean={housekeeping.clean} onRide={(x,y)=>{setDestination(null);pending.current=null;portalTravel.value=false;steering.value={x:0,y:0};cancelAnimation(footX);cancelAnimation(footY);footX.value=x;footY.value=y;setRiding(true);}}/>}
      </>}
      {map==='lake'&&<VillageWheel width={width} height={height} active={active} reduceMotion={reduceMotion} riding={experience==='wheel'} onFinish={finishExperience}/>}
      {map==='village'&&<VillageNeighbors width={width} height={height} active={active&&!experience} reduceMotion={reduceMotion} onTalk={id=>{const n=VILLAGERS.find(p=>p.id===id)!;request({x:n.x+.06,y:n.y+.035},{kind:'neighbor',id});}}/>}
      {map==='homewares'&&merchant('shop','暮らしのお店',{x:.50,y:.49},'stage3','shop')}
      {map==='diner'&&merchant('food','ごはんのお店',{x:.52,y:.49},'egg','food')}
      {map==='workshop'&&merchant('egg-job','工房の店長',{x:.50,y:.48},'egg','job')}
      {map==='ramen'&&merchant('ramen','ラーメン屋',{x:.49,y:.34},'odango','ramen')}
      {map==='tobacco'&&merchant('tobacco','タバコ屋',{x:.33,y:.55},'stage3','tobacco')}
      {mapPortals(map).map(gate=>{const place=WORLD_MAPS.find(p=>p.id===gate.to)!;return <WorldGate key={gate.to} to={gate.to} label={place.name} x={gate.point.x} y={gate.point.y} width={width} height={height} footX={footX} footY={footY} open={canVisitMap(gate.to,props.level)} disabled={!active||!!props.food||!!experience||bowling.busy} onPress={()=>walkTo(gate.point,true)}/>;})}
      {map==='bowling'&&<WorldBowlingPins motion={bowling.motion} width={width} height={height}/>}
      <WorldResident {...props} riding={riding} portalTravel={portalTravel} bowling={bowling.motion} bowlingBusy={bowling.busy} onBowlingRoll={input=>{pending.current=null;setDestination(null);steering.value={x:0,y:0};void bowling.roll(input);}} onBowlingFinished={bowling.finish} footX={footX} steering={steering} experience={experience} onPortal={enterMap} onDestinationReached={arrive} active={active&&!cleanTool} map={map} zoom={zoom} cameraTouch={touching} cameraGesture={view.pinch} width={width} height={height} footY={footY} holding={holding} destination={destination} />
      {experience==='smoke'&&<SmokingResident stage={props.stage} width={width} height={height} active={active} reduceMotion={reduceMotion}/>}
      {experience==='bath'&&<BathingEgg stage={props.stage} width={width} height={height} active={active} reduceMotion={reduceMotion}/>}
    </Animated.View></View></GestureDetector>}
    <LinearGradient pointerEvents="none" colors={['#15262A75', 'transparent']} style={s.topShade} />
    <LinearGradient pointerEvents="none" colors={['transparent', '#192D2CB8']} style={s.bottomShade} />
    <View style={[s.toolbar,{top:insets.top+114}]} pointerEvents="box-none">
      <Pressable testID="world-map-open" accessibilityRole="button" accessibilityLabel="おでかけ。村の地図を開く" accessibilityState={{disabled:!active||bowling.busy}} disabled={!active||!!cleanTool||riding||bowling.busy} onPress={()=>{steering.value={x:0,y:0};setMapOpen(true);}} style={({pressed})=>[s.travelButton,{opacity:(!active||bowling.busy)?0.5:pressed?0.85:1}]}>
        <DoorIcon name="log-out" size={18} color="#DDCBA6"/>
        <Text style={s.travelTitle}>おでかけ</Text>
      </Pressable>
      <View style={{flexDirection:'row',gap:8}}>{map==='home'&&<WorldPill compact testID="room-clean-open" label="部屋のお掃除" icon="wind" disabled={!active||!!props.food||!!experience||riding} onPress={()=>setCleanOpen(true)}/>}<WorldPill testID="world-bgm-toggle" label="BGM" icon={props.music.enabled?'volume-2':'volume-x'} accessibilityLabel={props.music.enabled?'BGMを止める':'BGMを流す'} disabled={props.music.busy} onPress={props.music.toggle} style={{paddingHorizontal:11}}/>
      <WorldPill compact icon="sliders" label="景色の見かた" disabled={!active||bowling.busy} onPress={()=>setViewOpen(true)} /></View>
    </View>
    {map!=='home'&&map!=='bowling'&&<View pointerEvents="none" style={[s.sceneTitle,{top:insets.top+171}]}><Text style={s.sceneKicker}>{map==='market'?'VILLAGE SQUARE':map==='workshop'?'EGG ATELIER':'YOKI YOKI / TOWN'}</Text><Text style={s.sceneName}>{WORLD_MAPS.find(p=>p.id===map)?.name}</Text></View>}
    {!experience&&(map==='home'||map==='market'||map==='workshop')&&<View style={{position:'absolute',right:20,bottom:bounds.height<600?177:244}}><WorldPill testID="world-go-work" label={map==='workshop'?'仕事を始める':'バイトする'} icon="briefcase" onPress={()=>map==='workshop'?openMerchant('job',{x:.5,y:.48}):enterMap('workshop')} disabled={!active||!!props.food||riding||!!cleanTool}/></View>}
    {!!props.music.error&&<Text style={[s.musicNotice,{top:insets.top+162}]}>{props.music.error}</Text>}
    {map==='bowling'&&<View pointerEvents="none" testID="world-bowling-status" style={[s.bowlingStatus,{top:insets.top+166,maxWidth:Math.min(240,Math.max(132,bounds.width*.35))}]}><Text accessibilityLiveRegion="polite" style={s.mapCopy}>{bowling.message}</Text></View>}
    {!experience&&['onsen','lake'].includes(map)&&<View style={[s.placeAction,{bottom:bounds.height<600?172:236}]}>
      <WorldPill testID={map==='onsen'?'village-bath':'village-ride'} primary label={map==='onsen'?'温泉に入る':'観覧車に乗る'} icon={map==='onsen'?'sun':'disc'} disabled={!active||!!props.food}
        onPress={()=>request({x:map==='lake'?.61:.51,y:.5},{kind:map==='onsen'?'bath':'wheel'})}/>
    </View>}
    {map==='home'&&!cleanOpen&&<View pointerEvents="box-none" style={{position:'absolute',top:insets.top+166,left:20,right:20,alignItems:'flex-start',gap:6}}>
      <Pressable testID="room-clean-status" accessibilityRole="button" accessibilityLabel={`部屋のきれいさ ${100-housekeeping.dirty}%。掃除道具を選ぶ`} onPress={()=>setCleanOpen(true)} disabled={!active||riding||!!props.food} style={{paddingHorizontal:12,paddingVertical:7,borderRadius:6,backgroundColor:'#211B30C9'}}><Text style={{fontSize:11,color:'#CBBADC'}}>{cleanTool?`${CLEANING_TOOLS[cleanTool].name}で床をこすってね`:`きれいさ ${100-housekeeping.dirty}%`}</Text></Pressable>
      {cleanTool&&<WorldPill testID="room-clean-finish" label="お掃除をおわる" icon="check" onPress={()=>setCleanTool(null)}/>}
      {!!housekeeping.error&&<Pressable accessibilityRole="button" onPress={housekeeping.retry}><Text style={{fontSize:11,color:'#8D4343',backgroundColor:'#FFF5ED',padding:8}}>{housekeeping.error}</Text></Pressable>}
    </View>}
    {cleanOpen&&<BottomSheet visible title="お部屋のお掃除" onClose={()=>setCleanOpen(false)}>
      <Text style={s.mapCopy}>きれいさ {100-housekeeping.dirty}%。3日に1回を目安に、床をきれいにしよう。</Text>
      {(['broom','cloth'] as const).map(tool=><Pressable key={tool} testID={`room-use-${tool}`} accessibilityRole="button" disabled={!housekeeping.house.owned.includes(tool)} onPress={()=>{setCleanOpen(false);setCleanTool(tool);setDestination(null);steering.value={x:0,y:0};portalTravel.value=false;view.reset();}} style={[s.mapRow,{opacity:housekeeping.house.owned.includes(tool)?1:.5}]}><CleaningToolArt tool={tool} size={48}/><View><Text style={s.mapName}>{CLEANING_TOOLS[tool].name}</Text><Text style={s.mapCopy}>{housekeeping.house.owned.includes(tool)?'これを使って床をこする':'暮らしのお店で買えるよ'}</Text></View></Pressable>)}
      {housekeeping.house.owned.includes('robot')&&<Text style={s.mapCopy}>掃除機は自動でお掃除中。お部屋の掃除機をタップすると乗れるよ。</Text>}
      <WorldPill label="暮らしのお店へ" icon="shopping-bag" onPress={()=>{setCleanOpen(false);setCleanTool(null);props.onShop();}}/>
    </BottomSheet>}
    {riding&&<View style={{position:'absolute',right:20,bottom:bounds.height<600?170:230}}><WorldPill testID="room-robot-exit" label="掃除機からおりる" icon="log-out" onPress={()=>{steering.value={x:0,y:0};setRiding(false);}}/></View>}
    {viewOpen&&<BottomSheet visible title="景色の見かた" onClose={()=>setViewOpen(false)}>
      <View style={{flexDirection:'row',gap:10}}><WorldPill testID="world-zoom-in" label="拡大する" icon="zoom-in" accessibilityLabel="景色を拡大" onPress={view.closer}/><WorldPill testID="world-zoom-reset" label="元の広さへ" icon="maximize" accessibilityLabel="景色の拡大を戻す" onPress={view.reset}/></View>
      <Text style={s.mapCopy}>地面をタップ、または左の丸を動かしておさんぽ。2本指でも景色を拡大できます。</Text>
      {map==='home'&&Object.entries(WORLD_TRAIL).map(([id,place])=><WorldPill key={id} testID={'world-travel-'+id} label={place.label+'へ歩く'} icon="navigation" onPress={()=>{setViewOpen(false);setDestination({id:++destinationId.current,point:mapGroundPoint(map,place.point)});}}/>)}
    </BottomSheet>}
    {placesOpen&&<BottomSheet visible title="琥珀通りのタバコ屋" subtitle="店主・スモーク / 路地裏の小さな休憩所" onClose={()=>{setPlacesOpen(false);view.reset();}}>
      <View style={{alignItems:'center'}}><MerchantResident kind="tobacco" size={148} active={props.active} reduceMotion={reduceMotion}/></View><Text style={s.mapCopy}>「いらっしゃい。今夜も、ゆっくりしていきな。」</Text><Text style={s.mapCopy}>一服で幸福 ＋2（1日1回） / 清潔 −3。おふろでさっぱり。</Text>
      <WorldPill testID="tobacco-smoke" label="喫煙所で一服する" icon="wind" onPress={()=>{smokeSession.current=`smoke-${Date.now()}-${Math.random().toString(36).slice(2,9)}`;setPlacesOpen(false);view.reset();setExperience('smoke');}}/>
    </BottomSheet>}
    {mapOpen&&<VillageMap current={map} level={props.level} disabled={!!experience||!!props.food||transition.busy} onSelect={id=>enterMap(id,true)} onClose={()=>setMapOpen(false)} onBath={()=>{setMapOpen(false);void transition.run('自宅のおふろ',props.onGarden);}}/>}
    {!!mapMessage&&!mapOpen&&<Pressable accessibilityRole="button" accessibilityLabel="道の案内を閉じる" onPress={()=>setMapMessage('')} style={[s.notice,{top:insets.top+166}]}><Text accessibilityLiveRegion="polite" style={s.trailText}>{mapMessage}　×</Text></Pressable>}
    {experience&&<View testID="village-experience" style={[s.experience,{bottom:bounds.height<600?160:210}]}><Text style={s.experienceText}>{experience==='wheel'?'空から、いつもの世界を眺めよう。':experienceMessage}</Text><Pressable testID="village-experience-exit" accessibilityRole="button" onPress={finishExperience} style={s.exit}><Text style={s.exitText}>{experience==='bath'?'お湯からあがる':experience==='smoke'?'一服を終える':'観覧車から降りる'}</Text></Pressable></View>}
    {!props.careInvitation&&!experience&&!cleanTool&&<View style={{position:'absolute',left:20,bottom:bounds.height<600?170:230}}><WorldSteering value={steering} enabled={active&&!props.food&&!bowling.busy} onStart={()=>{portalTravel.value=!riding;pending.current=null;setDestination(null);}} onStep={(dx,dy)=>{if(riding){footX.value=Math.max(.40,Math.min(.65,footX.value+dx*.045));footY.value=Math.max(.44,Math.min(.55,footY.value+dy*.03));}else walkTo({x:footX.value+dx*.055,y:footY.value+dy*.04},true);}}/></View>}
    {speaker&&<BottomSheet visible title={speaker.name} subtitle="となりの村の住人" onClose={()=>setNeighbor(null)}><View style={{alignItems:'center'}}><VillageResident stage={speaker.stage} size={112} active={props.active} reduceMotion={reduceMotion} scarf={speaker.color}/></View><Text testID="village-dialogue" accessibilityLiveRegion="polite" style={s.dialogue}>{reply||speaker.intro}</Text>{speaker.choices.map(choice=><Pressable key={choice.label} accessibilityRole="button" onPress={()=>setReply(choice.reply)} style={s.mapRow}><Text style={s.mapCopy}>{choice.label}</Text></Pressable>)}<Pressable accessibilityRole="button" onPress={()=>setNeighbor(null)} style={s.exit}><Text style={s.exitText}>またね</Text></Pressable></BottomSheet>}
    {transition.overlay}

  </View>;
}
const s = StyleSheet.create({
  travelButton:{minHeight:44,paddingHorizontal:13,borderRadius:6,borderWidth:1,borderColor:'#B7A48290',backgroundColor:'#211B30EC',flexDirection:'row',alignItems:'center',gap:7},
  travelTitle:{letterSpacing:.7,fontSize:12,fontWeight:'600',color:'#DDCBA6'},travelSubtitle:{fontSize:11,lineHeight:16,color:'#F0E5F7'},
  bowlingStatus:{position:'absolute',left:20,right:20,maxWidth:400,padding:12,borderRadius:18,backgroundColor:'#211B30ED'},
  toolbar:{position:'absolute',left:20,right:20,flexDirection:'row',justifyContent:'space-between',gap:8,alignItems:'center'},
  placeAction:{position:'absolute',left:116,right:20,maxWidth:240},
  ramenWelcome:{position:'absolute',padding:10,borderRadius:20,backgroundColor:'#FFF7E8EE'},ramenWelcomeText:{fontSize:13,textAlign:'center',color:'#795F77',lineHeight:21},
  facility:{position:'absolute',minHeight:44,width:120,borderRadius:20,alignItems:'center',justifyContent:'center',backgroundColor:'#FFF1DCEB',borderWidth:1,borderColor:'#AE9068',zIndex:880,shadowColor:'#2D3326',shadowOpacity:.22,shadowRadius:6},facilityText:{fontSize:12,fontWeight:'600',color:'#584D37'},portal:{position:'absolute',minHeight:32,width:76,borderRadius:16,alignItems:'center',justifyContent:'center',backgroundColor:'#344A3BB8',borderWidth:1,borderColor:'#D9C29190',zIndex:860},portalText:{fontSize:10,color:'#FFF1D3',textAlign:'center'},mapThumb:{width:64,height:72,borderRadius:12},notice:{position:'absolute',left:20,right:70,padding:12,borderRadius:16,backgroundColor:'#3C5243ED'},experience:{position:'absolute',left:20,right:72,gap:10,padding:14,borderRadius:7,borderWidth:1,borderColor:'#B7A48277',backgroundColor:'#211B30F0'},experienceText:{fontSize:13,lineHeight:20,color:'#D9C8B0'},exit:{minHeight:44,paddingHorizontal:16,borderRadius:22,alignItems:'center',justifyContent:'center',backgroundColor:'#584367'},exitText:{color:'#FFF3DF',fontSize:13},dialogue:{fontSize:17,lineHeight:30,color:'#E3D6EC',marginVertical:18},
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
  mapIntro:{fontSize:13,lineHeight:23,color:'#BFAECB',marginBottom:14},mapRow:{flexDirection:'row',alignItems:'center',padding:14,marginBottom:10,borderRadius:7,backgroundColor:'#2B233A',gap:8,minHeight:76},mapName:{fontSize:17,fontWeight:'600',color:'#E2D2ED'},mapCopy:{fontSize:13,lineHeight:21,color:'#BFAECB'},
  musicNotice:{position:'absolute',right:20,fontSize:10,color:'#FFF6E7',backgroundColor:'#584265DD',borderRadius:10,padding:8},
  sceneTitle:{position:'absolute',left:22,gap:5},sceneKicker:{fontSize:8,letterSpacing:2.3,color:'#D9C293',textShadowColor:'#120F18',textShadowRadius:5},sceneName:{fontSize:18,letterSpacing:2,color:'#F4E4D0',textShadowColor:'#120F18',textShadowRadius:6},
  merchantLabel:{letterSpacing:.6,borderBottomWidth:1,borderColor:'#B7A48288',fontSize:10,color:'#FFF6E7',backgroundColor:'#211B30DA',paddingHorizontal:7,paddingVertical:4,borderRadius:3,textAlign:'center',minWidth:76},
  travelHint: {position: 'absolute', left: 20, color: '#FFF4DA', fontSize: 11},
});
