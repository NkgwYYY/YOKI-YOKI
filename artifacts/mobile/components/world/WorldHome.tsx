import {worldAccessFor,mapUnlockHint} from '@/utils/worldProgress';
import {KeepsakeArt} from '@/components/collection/KeepsakeArt';
import {RoomKeepsakes} from './RoomKeepsakes';
import {GardenBeds,GardenSheet,GrandmotherResident,GARDEN_PLOTS,useGarden} from './VegetableGarden';
import {gardenUnlocked,readGarden,wholesaleUnlocked,plotStatus} from '@/utils/vegetableGarden';
import {useVillageStories,VillageStoryDialogue,StoryEncounterActor,StoryWorldKeepsakes} from './VillageStories';
import {storyEncounters,canHearStory,type StoryEncounter,type StoryMerchant} from '@/utils/storyEncounters';
import {useAuth} from '@/contexts/AuthContext';
import {CarriedGift} from '@/components/gifts/GiftArt';
import type {GiftKind} from '@/utils/characterGifts';
import {usePlazaEvents} from './usePlazaEvents';
import {EncounterHint} from './EncounterHint';
import {layoutStoryResidents,storyApproach,nearbyConversation,STORY_RESIDENT_SIZE,PLAZA_RESIDENT_SIZE,PLAZA_VISITOR_POINT,PLAZA_APPROACH_POINT,type ConversationTarget} from '@/utils/encounterLayout';
import {PLAZA_HINTS} from '@/utils/plazaEvents';
import {PlazaActors,PlazaDialogue} from './PlazaEncounter';
import {FortuneCat,FortuneHall} from './FortuneHall';
import {MerchantResident} from '@/components/village/MerchantResident';
import {VillageVisitors} from '@/components/village/VillageVisitors';
import {WorldGate} from './WorldGate';
import {useHousekeeping} from './useHousekeeping';
import {HouseDust} from './HouseDust';
import {RobotCleaner} from './RobotCleaner';
import {CleaningToolArt} from './CleaningToolArt';
import {CLEANING_TOOLS,type CleaningTool} from '@/utils/housekeeping';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Image, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { cancelAnimation, runOnJS, useAnimatedReaction, useSharedValue, withTiming } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp, type RoomCustomization } from '@/contexts/AppContext';
import { StaticMascot } from '@/components/Mascot';
import {getStageName, type MascotStage} from '@/utils/mascotUtils';
import { type ResidentItem, type ResidentInteraction } from '@/components/room/RoomResident';
import { RoomFurnitureArt, RoomFlowerArt } from '@/components/room/RoomFurnitureArt';
import { fitWorld, fitEyeLevelHome, fitOutdoorWorld, outdoorCameraOffset, WORLD_PLACES, WORLD_TRAIL, WORLD_KEEPSAKE, worldCameraOffset, worldResidentScale, type WorldDestination } from '@/utils/worldGeometry';
import type { WorldPeriod } from '@/utils/worldTime';
import { WorldAmbient } from './WorldAmbient';
import {TobaccoHaze} from './TobaccoHaze';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { WORLD_MAPS, isMapAvailable, initialReleasedMap, canVisitMap, isMapGround, mapStart, type WorldMapId } from '@/utils/worldMaps';
import { useWorldCamera } from './useWorldCamera';
import { WorldResident } from './WorldResident';
import { WorldSteering } from '@/components/village/WorldSteering';
import { BathingEgg, VillageResident } from '@/components/village/VillageActors';
import { VillageWheel } from '@/components/village/VillageWheel';
import { mapPortals,nearbyPortalIndex,VILLAGERS,type VillagerId,type VillageExperience } from '@/utils/villageLife';
import {mapGroundPoint} from '@/utils/worldMaps';

import { HOME_ART, homeEyeArt, prepareHomeEyeArt, OUTDOOR_ART, prepareWorldArt, prepareVillageAtlas, worldArt } from '@/utils/worldArt';
import { WorldPill, worldUI } from './WorldPill';
import { Icon } from '@/components/ui/Icon';
import { RamenArt } from '@/components/village/RamenArt';
import { useSceneTransition } from './useSceneTransition';
import {HomeViewBackdrop,useHomeViewMotion} from './useHomeViewMotion';
import {DiaryNotebookGlow} from './DiaryNotebookGlow';
import {diaryAttention} from '@/utils/exchangeDiary';
import {BowlingGame} from './BowlingGame';
import {bowlingPlayedToday} from '@/utils/bowling';
import {getTodayDate} from '@/utils/dateUtils';
import {VillageMap} from './VillageMap';
import {TobaccoPatrons} from '@/components/village/TobaccoPatrons';
import {Icon as DoorIcon} from '@/components/ui/Icon';
import {useSmoking} from './useSmoking';
import {SmokingCare} from './SmokingCare';
import {smokingStatus} from '@/utils/smokingState';
export { HOME_ART } from '@/utils/worldArt';
type VillageAction={kind:'portal';map:WorldMapId}|{kind:'bath'|'wheel'|'smoke'|'shop'|'feed'|'ramen-meal'|'plaza'}|{kind:'neighbor';id:VillagerId}|{kind:'story';encounter:StoryEncounter}|{kind:'garden';plot:number};
type Props = {
  carriedGift?: GiftKind;
  welcomeRequest?:number; onWelcomeStarted?:(id:number)=>void;
  onMapChange:(map:WorldMapId)=>void;
  onInteractingChange?:(interacting:boolean)=>void;
  dockInset?:number;
  cleanliness:number;
  cleanRequest?:number;onCleaningOpened?:()=>void;
  happinessValue:number;
  music:{enabled:boolean;busy:boolean;toggle:()=>void;error:string};
  careInvitation:boolean;onSceneBusy:(busy:boolean)=>void;onShop:(tab?:'seeds')=>void;onJob:()=>void;onGarden:()=>void;initialMap?:WorldMapId;
  customization: RoomCustomization; stage: MascotStage; growthSize: number; mascotName: string;
  active: boolean; reduceMotion: boolean; resting: boolean; reaction: number; meal: number; rest: number;
  hints: boolean; companion: boolean; totalDays: number; period: WorldPeriod; daySeed: number; food: string | null;
  wear?: ResidentItem; effect?: ResidentItem; decor?: ResidentItem; background?: string;
  onRecord: () => void; onFeed: (venue?: 'ramen') => void; onChat: () => void; onAlbum: () => void; onRest: () => void;
  onInteract: (kind: ResidentInteraction) => void; onMealFinished: () => void;
};

export function WorldHome(props: Props) {
  const {reduceMotion} = props;
  const {awardHappiness,feedState,bowlingState,progress}=useApp();
  const access=useMemo(()=>worldAccessFor(progress,feedState.villageStories),[progress.worldAccess,progress.level,feedState.villageStories]);
  const keepsake=props.customization.displayedKeepsake;
  const grandmaUnlocked=gardenUnlocked(feedState);
  const garden=useGarden();
  const [gardenNotice,setGardenNotice]=useState('');
  useEffect(()=>{if(!gardenNotice)return;const timer=setTimeout(()=>setGardenNotice(''),4500);return()=>clearTimeout(timer);},[gardenNotice]);
  useEffect(()=>{if(garden.error)setGardenNotice(garden.error);},[garden.error]);
  let harvested=false;try{harvested=readGarden(feedState.vegetableGarden).harvests>0;}catch{}
  const [gardenPlot,setGardenPlot]=useState<number|null>(null),[grandmaOpen,setGrandmaOpen]=useState(false);
  const [zooming,setZooming]=useState(false);
  const [merchantGreeting,setMerchantGreeting]=useState({kind:'',count:0});
  const [keepsakeOpen,setKeepsakeOpen]=useState(false);
  const [cleanOpen,setCleanOpen]=useState(false),[cleanTool,setCleanTool]=useState<CleaningTool|null>(null),[riding,setRiding]=useState(false);
  const [experienceMessage,setExperienceMessage]=useState('');
  const shopTimer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
  const returning=useRef(false);
  const latestActive=useRef(props.active);latestActive.current=props.active;
  const portalTravel=useSharedValue(false);
  const [map,setMap]=useState<WorldMapId>(()=>initialReleasedMap(props.initialMap,Platform.OS));
  const [homeEyeLevel,setHomeEyeLevel]=useState(false);
  const [bounds, setBounds] = useState({width: 0, height: 0});
  const eyeLevel=map==='home'&&homeEyeLevel;
  const [diaryDay,setDiaryDay]=useState(getTodayDate);
  useEffect(()=>{
    if(!props.active||map!=='home')return;
    setDiaryDay(getTodayDate());
    const timer=setInterval(()=>setDiaryDay(getTodayDate()),30000);
    return()=>clearInterval(timer);
  },[props.active,map]);
  const diaryNotice=diaryAttention(feedState.exchangeDiary,diaryDay);
  const diaryHint=[diaryNotice.unwritten?'今日の日記はまだ書いていません':'',diaryNotice.unread?'キャラクターの日記が届いています':''].filter(Boolean).join('。');
  useEffect(()=>props.onMapChange(map),[map,props.onMapChange]);
  const smoking=useSmoking(props.active&&map==='tobacco');
  const plaza=usePlazaEvents(props.active&&map==='market');
  const {user}=useAuth();
  const [storyOpen,setStoryOpen]=useState<StoryEncounter|null>(null);
  const pendingBowlStory=useRef<StoryEncounter|null>(null);
  const heardStories=useRef(new Set<string>()),merchantStories=useRef(new Set<string>()),autoStoryThisVisit=useRef(false);
  const stories=useVillageStories(props.active);
  const localEncounters=stories.ready?storyEncounters(stories.state,stories.today,map,harvested):[];
  const localResidents=layoutStoryResidents(localEncounters);
  const sceneResidents=storyOpen&&!storyOpen.merchant&&!localResidents.some(st=>st.key===storyOpen.key)?[...localResidents,storyOpen]:localResidents;
  const [mapOpen,setMapOpen]=useState(false);
  const [fortuneOpen,setFortuneOpen]=useState(false);
  const [bowlingOpen,setBowlingOpen]=useState(false);
  const [placesOpen,setPlacesOpen]=useState(false),[viewOpen,setViewOpen]=useState(false);
  const [experience,setExperience]=useState<VillageExperience|null>(null);
  const [neighbor,setNeighbor]=useState<VillagerId|null>(null);
  const [neighborsOpen,setNeighborsOpen]=useState(false);
  const [reply,setReply]=useState('');
  const pending=useRef<{id:number;action:VillageAction}|null>(null);
  const [mapMessage,setMapMessage]=useState('');
  const transition=useSceneTransition(reduceMotion,()=>setMapMessage('景色を読み込めませんでした。もう一度、行き先を選んでね。'));
  const homeMotion=useHomeViewMotion(props.active&&map==='home',reduceMotion,()=>setMapMessage('視点を切り替えられませんでした。もう一度お試しください。'),`${bounds.width}:${bounds.height}`);
  const active=props.active&&!homeMotion.busy&&!keepsakeOpen&&!garden.busy&&gardenPlot===null&&!grandmaOpen&&!storyOpen&&!plaza.open&&!bowlingOpen&&!cleanOpen&&!fortuneOpen&&!mapOpen&&!placesOpen&&!viewOpen&&!neighbor&&!neighborsOpen&&!transition.busy&&!zooming;
  const housekeeping=useHousekeeping(props.active);
  useEffect(()=>{if(!housekeeping.house.robotPlaced)setRiding(false);},[housekeeping.house.robotPlaced]);
  const [bowlingBusy,setBowlingBusy]=useState(false);
  const footX=useSharedValue(.5);
  const steering=useSharedValue({x:0,y:0});
  useEffect(()=>{props.onSceneBusy(keepsakeOpen||gardenPlot!==null||grandmaOpen||!!storyOpen||plaza.open||!!experience||bowlingOpen||fortuneOpen||mapOpen||placesOpen||viewOpen||!!neighbor||neighborsOpen||transition.busy||homeMotion.busy||zooming||cleanOpen||!!cleanTool||riding);return()=>props.onSceneBusy(false);},[keepsakeOpen,gardenPlot,grandmaOpen,storyOpen,plaza.open,experience,bowlingOpen,fortuneOpen,mapOpen,placesOpen,viewOpen,neighbor,neighborsOpen,transition.busy,homeMotion.busy,zooming,cleanOpen,cleanTool,riding,props.onSceneBusy]);
  const [loadedArt,setLoadedArt]=useState<ReturnType<typeof worldArt>|null>(null);
  const destinationId=useRef(0);
  const [destination, setDestination] = useState<WorldDestination | null>(null);
  const insets = useSafeAreaInsets();
  const footY = useSharedValue(WORLD_PLACES.idle.y);
  const holding = useSharedValue(0);
  const away=map!=='home';
  const tight=away&&bounds.height<660;
  const dockBottom=props.dockInset ?? 72+Math.max(12,insets.bottom);
  const homeControlOffset=props.dockInset===12?60+Math.max(12,insets.bottom):0;
  // In landscape the HOME footer is on the right; its portrait offset covered the travel button.
  const steeringBottom=away||bounds.width>bounds.height?dockBottom:(bounds.height<600?170:230)-homeControlOffset;
  const stageTop=insets.top+(tight?136:186);
  const clearBottom=bounds.height-dockBottom-116;
  const sceneHeight=bounds.height;
  // Keep the resident's layout box stable while its camera transform changes.
  const frame = away?fitOutdoorWorld(bounds.width,bounds.height):fitWorld(bounds.width,bounds.height);
  const artFrame=eyeLevel?fitEyeLevelHome(bounds.width,bounds.height):frame;
  const {width, height} = frame;
  const viewportHeight = sceneHeight, frameTop = frame.top;
  const view = useWorldCamera({...frame,active:active&&!eyeLevel,reduceMotion});
  const {follow:camera,zoom,touching}=view;
  const reportInteraction = props.onInteractingChange;
  useAnimatedReaction(() => !!destination || !!holding.value || !!touching.value || steering.value.x!==0 || steering.value.y!==0,
    (moving, previous) => { if (moving!==previous && reportInteraction) runOnJS(reportInteraction)(moving); }, [destination, reportInteraction]);
  useEffect(() => () => reportInteraction?.(false), [reportInteraction]);
  const conversationTargets:ConversationTarget[]=[...sceneResidents.map(e=>({key:e.key,point:e.point,hint:e.hint,size:map==='market'?STORY_RESIDENT_SIZE:.17})),...(map==='market'&&plaza.current?[{key:'plaza',point:PLAZA_VISITOR_POINT,hint:plaza.current.outcome?'':PLAZA_HINTS[plaza.current.kind],size:PLAZA_RESIDENT_SIZE}]:[])];
  const aimedConversation=destination&&pending.current?.id===destination.id?(pending.current.action.kind==='story'?pending.current.action.encounter.key:pending.current.action.kind==='plaza'?'plaza':null):null;
  const [nearbyKey,setNearbyKey]=useState<string|null>(null);
  useAnimatedReaction(()=>active&&!props.food&&!experience&&!bowlingBusy&&!holding.value&&!touching.value?(aimedConversation??nearbyConversation(conversationTargets,{x:footX.value,y:footY.value},nearbyKey)):null,(key,previous)=>{if(key!==previous)runOnJS(setNearbyKey)(key);},[active,props.food,experience,bowlingBusy,map,aimedConversation,conversationTargets.map(t=>t.key).join(','),nearbyKey]);
  const nearbyTarget=active?conversationTargets.find(t=>t.key===nearbyKey):undefined;
  const openStory=(encounter:StoryEncounter)=>{
    if(!active||props.food||experience||bowlingBusy||cleanTool||riding)return;
    heardStories.current.add(encounter.key);if(encounter.merchant)merchantStories.current.add(encounter.key);autoStoryThisVisit.current=true;
    portalTravel.value=false;steering.value={x:0,y:0};pending.current=null;setDestination(null);view.reset();setStoryOpen(encounter);
  };
  useEffect(()=>{heardStories.current.clear();merchantStories.current.clear();pendingBowlStory.current=null;setStoryOpen(null);autoStoryThisVisit.current=false;},[user?.id]);
  useEffect(()=>{autoStoryThisVisit.current=false;merchantStories.current.clear();pendingBowlStory.current=null;setStoryOpen(null);},[map]);
  useEffect(()=>{if(!bowlingOpen&&props.active&&pendingBowlStory.current){const encounter=pendingBowlStory.current;pendingBowlStory.current=null;setStoryOpen(encounter);}},[bowlingOpen,props.active]);
  // A passerby speaks when we get close. Never interrupt a service, gesture, or journey through a gate.
  useEffect(()=>{
    if(!localResidents.length||!active||props.food||experience||bowlingBusy||cleanTool||riding||!width||loadedArt!==worldArt(map,props.period==='night'||map==='tobacco'))return;
    const readyAt=Date.now()+1600;
    const timer=setInterval(()=>{
      if(Date.now()<readyAt||autoStoryThisVisit.current)return;
      const busy=!!pending.current||portalTravel.value||!!holding.value||!!touching.value||zoom.value>1.02;
      const encounter=localResidents.find(st=>canHearStory(st,{x:footX.value,y:footY.value},busy,heardStories.current));if(encounter)openStory(encounter);
    },350);
    return()=>clearInterval(timer);
  },[map,localResidents.map(st=>st.key).join(','),active,props.food,experience,bowlingBusy,cleanTool,riding,width,loadedArt,props.period]);
  useEffect(()=>()=>clearTimeout(shopTimer.current),[]);
  useEffect(()=>{
    if(!props.active){clearTimeout(shopTimer.current);returning.current=true;setZooming(false);}
    else if(returning.current){returning.current=false;view.reset();}
  },[props.active]);
  useEffect(()=>{
    if(experience!=='bath'||!active)return;
    setExperienceMessage('のんびり、ひと休み。');
    let alive=true;
    const timer=setTimeout(()=>{
      void awardHappiness('bath').then(result=>{
        if(alive)setExperienceMessage(result.gained>0?`幸福 ＋${result.gained}`:'お湯でのんびり。からだを洗うのは、おうちのおふろで。');
      }).catch(()=>{if(alive)setExperienceMessage('保存できませんでした。一度戻って、もう一度お試しください。');});
    },8000);
    return()=>{alive=false;clearTimeout(timer);};
  },[experience,active,awardHappiness]);
  const openMerchant=(kind:'shop'|'ramen'|'tobacco'|'job'|'bowling'|'fortune'|'bank',point:{x:number;y:number})=>{
    if(!active||props.food||experience||bowlingBusy)return;
    const encounter=localEncounters.find(st=>st.merchant===kind&&!merchantStories.current.has(st.key));
    if(encounter){openStory(encounter);return;}
    serveMerchant(kind,point);
  };
  const serveMerchant=(kind:'shop'|'ramen'|'tobacco'|'job'|'bowling'|'fortune'|'bank',point:{x:number;y:number})=>{
    if(kind==='bowling'&&bowlingPlayedToday(bowlingState,getTodayDate())){setMapMessage('今日の5回はおしまい。また明日、受付で待っているよ。');return;}
    setMerchantGreeting(current=>({kind,count:current.count+1}));
    portalTravel.value=false;steering.value={x:0,y:0};pending.current=null;setDestination(null);
    setZooming(true);view.focusAt(point,{width:bounds.width,height:sceneHeight});
    clearTimeout(shopTimer.current);
    shopTimer.current=setTimeout(()=>{
      if(!latestActive.current)return;
      setZooming(false);
      if(kind==='shop')props.onShop();
      else if(kind==='fortune')setFortuneOpen(true);

      else if(kind==='bowling')setBowlingOpen(true);
      else if(kind==='job')props.onJob();
      else if(kind==='ramen')props.onFeed('ramen');
      else setPlacesOpen(true);
    },reduceMotion?0:460);
  };
  useEffect(()=>{if(stories.ready&&!canVisitMap(map,access,grandmaUnlocked,Platform.OS))setMap('home');},[map,access,grandmaUnlocked,stories.ready]);
  useEffect(()=>{if(props.meal){setExperience(null);setNeighbor(null);if(map!=='ramen')setMap('home');}},[props.meal]);
  useEffect(()=>{if(props.rest){setExperience(null);setNeighbor(null);setMap('home');}},[props.rest]);
  useEffect(()=>{if(props.cleanRequest){setHomeEyeLevel(false);setMap('home');setDestination(null);steering.value={x:0,y:0};setCleanOpen(true);props.onCleaningOpened?.();}},[props.cleanRequest]);
  // Let the visible scene finish first; warm only the atlas and likely exit.
  useEffect(()=>{
    if(!props.active||mapOpen||transition.busy)return;
    let cancelled=false;
    const timer=setTimeout(()=>{
      void (async()=>{
        try { await prepareWorldArt(map,props.period==='night'); } catch { return; }
        if(cancelled)return;
        try { await prepareVillageAtlas(); } catch {}
        if(cancelled)return;
        const target=map==='home'?'market':map==='market'?'home':'market';
        for(const next of [target] as WorldMapId[]){
          if(cancelled)return;
          if(next!==map&&canVisitMap(next,access,grandmaUnlocked,Platform.OS))try { await prepareWorldArt(next,props.period==='night'); } catch {}
        }
      })();
    },2000);
    return()=>{cancelled=true;clearTimeout(timer);};
  },[map,mapOpen,props.active,props.period,access,transition.busy]);
  useEffect(()=>{setGardenPlot(null);setGrandmaOpen(false);setBowlingOpen(false);setFortuneOpen(false);setRiding(false);setCleanTool(null);view.reset();portalTravel.value=false;clearTimeout(shopTimer.current);setZooming(false);setDestination(null);pending.current=null;setExperience(null);steering.value={x:0,y:0};footY.value=mapStart(map).y;footX.value=mapStart(map).x;},[map]);
  useAnimatedReaction(() => ({y: footY.value, held: holding.value, cameraTouch: touching.value, zoom:zoom.value, active, height, viewportHeight, frameTop}), state => {
    // Before onLayout, a zero-sized room used to produce a -136px offset.
    // Never start that animation, and recalculate when the measured frame arrives.
    if (state.height<=0||state.viewportHeight<=0) {cancelAnimation(camera);camera.value=0;return;}
    if (!state.active||eyeLevel) {cancelAnimation(camera);if(eyeLevel)camera.value=0;return;}
    const offset=away?outdoorCameraOffset(state.y,state.height,state.viewportHeight,state.frameTop,clearBottom):worldCameraOffset(state.y,state.height,state.viewportHeight,state.frameTop);
    if (!state.held && !state.cameraTouch && state.zoom < 1.02) camera.value = withTiming(offset, {duration: reduceMotion ? 0 : 350});
  }, [height, viewportHeight, frameTop, clearBottom, reduceMotion, active,map,away,eyeLevel]);

  const walkTo = (point: {x: number; y: number},throughGate=false) => {
    if (active&&!cleanTool&&!riding&&!props.food&&(!experience||experience==='smoke')&&!bowlingBusy) {portalTravel.value=throughGate;pending.current=null;setDestination({id:++destinationId.current,point:mapGroundPoint(map,point)});}
  };
  const enterMap=(target:WorldMapId,fromMap=false)=>{
    if(!isMapAvailable(target,Platform.OS))return;
    if(!props.active||bowlingOpen||cleanTool||riding||neighbor||transition.busy||homeMotion.busy||(!fromMap&&(mapOpen||placesOpen||viewOpen||fortuneOpen))||props.food||experience)return;
    portalTravel.value=false;steering.value={x:0,y:0};setDestination(null);
    if(!canVisitMap(target,access,grandmaUnlocked,Platform.OS)){setMapMessage(mapUnlockHint(target,feedState.villageStories));return;}
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
    if(portalTravel.value&&destination?.id===id){const gates=mapPortals(map,grandmaUnlocked,Platform.OS),gate=nearbyPortalIndex(destination.point,gates);if(gate>=0){enterMap(gates[gate].to);return;}}
    setDestination(current=>current?.id===id?null:current);
    const next=pending.current;portalTravel.value=false;if(!next||next.id!==id)return;pending.current=null;
    const a=next.action;
    if(a.kind==='portal')enterMap(a.map);
    else if(a.kind==='bath'||a.kind==='wheel'||a.kind==='smoke')setExperience(a.kind);
    else if(a.kind==='shop')props.onShop();
    else if(a.kind==='feed')props.onFeed();
    else if(a.kind==='story')openStory(a.encounter);
    else if(a.kind==='garden'){
      const plot=garden.garden.plots[a.plot],status=plotStatus(plot,garden.today);
      if(!garden.ready||garden.busy)return;
      if(!plot||(!status.mature&&status.watered)){setGardenPlot(a.plot);return;}
      void garden.act({kind:status.mature?'harvest':'water',plot:a.plot}).then(saved=>{
        if(saved?.changed)setGardenNotice(status.mature?`${plot.crop==='turnip'?'小かぶ':plot.crop==='carrot'?'にんじん':'トマト'} ＋3`:'水をあげたよ');
      });
    }
    else if(a.kind==='plaza'){view.reset();plaza.talk();}
    else if(a.kind==='neighbor'){setNeighbor(a.id);setReply('');}
  };
  const finishExperience=()=>{if(experience==='smoke'){void smoking.finish().then(ok=>{if(ok){setExperience(null);setDestination(null);}});}else{setExperience(null);setDestination(null);}};
  const groundTap = (x: number, y: number) => {
    const point = {x: x / width, y: y / height};
    if (isMapGround(map,point)) walkTo(point);
  };
  const groundGesture = Gesture.Tap().enabled(active&&!eyeLevel&&!cleanTool&&!riding&&!props.food&&(!experience||experience==='smoke')&&!bowlingBusy).simultaneousWithExternalGesture(view.pinch).maxDuration(250).maxDistance(10).onEnd((event, success) => {
    if (success) runOnJS(groundTap)(event.x, event.y);
  });
  const night = props.period === 'night'||map==='tobacco';
  const source = eyeLevel?homeEyeArt(night,bounds.width>bounds.height):worldArt(map,night);
  const toggleHomeView=()=>{
    if(map!=='home'||!props.active||props.food||cleanTool||riding||transition.busy||homeMotion.busy||holding.value||touching.value)return;
    setViewOpen(false);pending.current=null;setDestination(null);portalTravel.value=false;steering.value={x:0,y:0};
    void homeMotion.run(
      ()=>eyeLevel?prepareWorldArt('home',night):prepareHomeEyeArt(night,bounds.width>bounds.height),
      ()=>{
        const closer=!eyeLevel;
        const next=fitWorld(bounds.width,bounds.height);
        const growth=Math.max(.9,Math.min(1.12,props.growthSize));
        const fromZoom=eyeLevel?1:zoom.value;
        const fromPanX=eyeLevel?0:view.panX.value,fromPanY=eyeLevel?0:camera.value+view.panY.value;
        const fromResident={
          x:eyeLevel?frame.left+closeUp!.centerX:frame.left+width/2+fromPanX+(footX.value*width-width/2)*fromZoom,
          y:eyeLevel?frame.top+closeUp!.footY:frame.top+height/2+fromPanY+(footY.value*height-height/2)*fromZoom,
          size:eyeLevel?closeUp!.size:width*.135*growth*worldResidentScale(footY.value)*fromZoom,
        };
        const nextFollow=closer?0:worldCameraOffset(footY.value,next.height,bounds.height,next.top);
        const toResident=closer?{
          x:bounds.width*(bounds.width>bounds.height?.30:.5),
          y:bounds.width>bounds.height?bounds.height*.72:Math.min(bounds.height*.68,bounds.height-dockBottom-135),
          size:Math.min(bounds.width*.52,bounds.height*.34,260),
        }:{x:next.left+footX.value*next.width,y:next.top+nextFollow+footY.value*next.height,size:next.width*.135*growth*worldResidentScale(footY.value)};
        [zoom,view.panX,view.panY,camera].forEach(cancelAnimation);
        zoom.value=1;view.panX.value=0;view.panY.value=0;camera.value=nextFollow;
        setHomeEyeLevel(closer);
        return {from:{source,frame:artFrame,zoom:fromZoom,panX:fromPanX,panY:fromPanY},fromResident,toResident,
          residentOffset:{x:next.left,y:next.top+nextFollow},width:bounds.width,height:bounds.height,closer};
      },
    );
  };
  const closeUp=eyeLevel?{size:Math.min(bounds.width*.52,bounds.height*.34,260),centerX:(bounds.width>bounds.height?bounds.width*.30:bounds.width*.5)-frame.left,footY:(bounds.width>bounds.height?bounds.height*.72:Math.min(bounds.height*.68,bounds.height-dockBottom-135))-frame.top}:undefined;
  const flight=homeMotion.move?{progress:homeMotion.progress,from:{...homeMotion.move.fromResident,x:homeMotion.move.fromResident.x-homeMotion.move.residentOffset.x,y:homeMotion.move.fromResident.y-homeMotion.move.residentOffset.y},to:{...homeMotion.move.toResident,x:homeMotion.move.toResident.x-homeMotion.move.residentOffset.x,y:homeMotion.move.toResident.y-homeMotion.move.residentOffset.y}}:undefined;
  const hotspot = (id: string, label: string, x: number, y: number, onPress: () => void) => (
    <Pressable key={id} testID={`room-${id}`} accessibilityRole="button" accessibilityLabel={label} accessibilityHint={id==='record'?diaryHint:undefined} onPress={onPress}
      style={({pressed}) => [s.hotspot, {left: x * width - 24, top: y * height - 24, opacity: pressed ? 0.6 : 1}]}>
      {id==='record'&&diaryNotice.pending&&<DiaryNotebookGlow active={active} reduceMotion={reduceMotion}/>}
      <View pointerEvents="none" style={s.glint} />
    {props.hints && <Text pointerEvents="none" style={s.hint}>{label}</Text>}
    </Pressable>
  );
  const facility=(id:string,label:string,point:{x:number;y:number},action:VillageAction)=><Pressable key={id} testID={`village-${id}`} accessibilityRole="button" accessibilityLabel={label} disabled={!active||!!props.food||!!experience} onPress={()=>request(point,action)} style={[s.facility,{left:point.x*width-60,top:point.y*height-30}]}><Text style={s.facilityText}>{label}</Text></Pressable>;
  const merchant=(id:string,label:string,point:{x:number;y:number},stage:MascotStage,kind:'shop'|'ramen'|'tobacco'|'job'|'bowling'|'bank')=><Pressable
    key={id} testID={`merchant-${id}`} accessibilityRole="button" accessibilityLabel={`${kind==='job'||kind==='bowling'||kind==='bank'?label:label+'の店員'}。タップして話しかける`} disabled={!active||!!props.food||!!experience}
    onPress={()=>openMerchant(kind,point)} style={{position:'absolute',left:width*point.x-width*.12,top:height*point.y-width*.23,width:width*.24,minWidth:44,minHeight:44,alignItems:'center',zIndex:850}}>
    {localEncounters.find(st=>st.merchant===kind)&&<View pointerEvents="none" style={{position:'absolute',bottom:'100%',padding:7,borderRadius:10,backgroundColor:'#FFF4DDEE',minWidth:130}}><Text style={{color:'#665146',fontSize:11,textAlign:'center'}}>{localEncounters.find(st=>st.merchant===kind)!.hint}</Text></View>}
    <MerchantResident kind={kind} size={width*.24} active={props.active&&(active||zooming)} reduceMotion={reduceMotion} greeting={merchantGreeting.kind===kind?merchantGreeting.count:0}/>
    <Text style={s.merchantLabel}>{label}</Text>
  </Pressable>;
  const speaker=VILLAGERS.find(n=>n.id===neighbor);
  return <View style={s.root} testID="room-scene" onLayout={e => setBounds(e.nativeEvent.layout)}>
    {map==='home'&&<HomeViewBackdrop eyeLevel={eyeLevel} shot={{source,frame:artFrame,zoom:1,panX:0,panY:0}} cameraStyle={!eyeLevel&&view.style} motion={homeMotion} onLoad={()=>setLoadedArt(source)}/>}
    {width > 0 && <GestureDetector gesture={view.gesture}><View testID="world-viewport" style={StyleSheet.absoluteFill} collapsable={false}><Animated.View testID="world-stage" style={[{position: 'absolute', ...frame}, view.style]}>
      {map!=='home'&&<View pointerEvents="none" style={StyleSheet.absoluteFill}><Image source={source} onLoad={()=>setLoadedArt(source)} resizeMode="stretch" style={s.art} accessible={false} /></View>}
      {!['home','homewares'].includes(map)&&night&&<View pointerEvents="none" style={[StyleSheet.absoluteFill,{backgroundColor:'#35234922'}]}/>}
      {props.period === 'dusk' && map!=='tobacco' && <View pointerEvents="none" style={[StyleSheet.absoluteFill, {backgroundColor: '#B5646028'}]} />}
      <GestureDetector gesture={groundGesture}><View testID="world-ground" accessible={false} style={StyleSheet.absoluteFill}/></GestureDetector>
      <WorldAmbient active={active} reduceMotion={props.reduceMotion} night={night} />
      {map==='home'&&!eyeLevel&&<>{props.background && <View pointerEvents="none" style={{position: 'absolute', left: width * 0.276, top: height * 0.244, width: width * 0.072, height: height * 0.065, borderRadius: 14, opacity: 0.55, overflow: 'hidden'}}><Image source={{uri: props.background}} resizeMode="cover" style={s.art} /></View>}
      {hotspot('album', '思い出の本棚', 0.53, 0.275, props.onAlbum)}
      {hotspot('bed', 'ベッドでひと休み', 0.73, 0.376, props.onRest)}
      {hotspot('record', '交換日記', 0.268, 0.454, props.onRecord)}
      {hotspot('meal', 'ごはん', 0.765, 0.602, () => props.onFeed())}
      {props.customization.flower !== 'none' && <View pointerEvents="none" style={{position: 'absolute', left: width * 0.15, top: height * 0.495, zIndex: 550}}>
        <RoomFlowerArt id={props.customization.flower} size={width * 0.15} accessible />
      </View>}
      {keepsake&&keepsake!=='none'&&<View testID="room-displayed-keepsake" pointerEvents="none" style={{position:'absolute',left:width*WORLD_KEEPSAKE.left,top:height*WORLD_KEEPSAKE.top,width:width*WORLD_KEEPSAKE.scale,height:width*WORLD_KEEPSAKE.scale,zIndex:WORLD_KEEPSAKE.depth}}><KeepsakeArt id={keepsake} size={width*WORLD_KEEPSAKE.scale}/></View>}
      {props.customization.furniture !== 'none' && <View pointerEvents="none" style={{position: 'absolute', left: width * 0.22, top: height * 0.51, zIndex: 560}}>
        <RoomFurnitureArt id={props.customization.furniture} size={width * 0.19} />
      </View>}
      {props.decor && <View pointerEvents="none" style={{position: 'absolute', left: width * 0.72 + props.decor.x, top: height * 0.46 + props.decor.y, width: width * 0.12 * props.decor.scale, height: width * 0.12 * props.decor.scale, zIndex: 540}}><Image source={{uri: props.decor.uri}} resizeMode="contain" style={s.art} /></View>}
      {props.companion && <View pointerEvents="none" style={{position: 'absolute', left: width * 0.57, top: height * 0.54, zIndex: 615}}><StaticMascot stage="egg" mood="happy" size={width * 0.085} /></View>}
      </>}
      {map==='home'&&!eyeLevel&&<>
        <RoomKeepsakes width={width} height={height} frameLeft={frame.left} frameTop={frame.top} viewportWidth={bounds.width} viewportHeight={bounds.height} safeTop={insets.top+162} night={night} disabled={!active||!!props.food||riding||!!cleanTool} onBusy={setKeepsakeOpen}/>
        <HouseDust width={width} height={height} dirt={housekeeping.dirt} tool={cleanTool} active={active} onClean={housekeeping.clean}/>
        {housekeeping.house.robotPlaced&&<RobotCleaner width={width} height={height} active={active&&!cleanTool&&!props.food&&!experience} reduceMotion={reduceMotion} riding={riding} footX={footX} footY={footY} onClean={housekeeping.clean} onRide={(x,y)=>{setDestination(null);pending.current=null;portalTravel.value=false;steering.value={x:0,y:0};cancelAnimation(footX);cancelAnimation(footY);footX.value=x;footY.value=y;setRiding(true);props.onInteract('greet');}}/>}
      </>}
      {map==='market'&&plaza.current&&<PlazaActors encounter={plaza.current} width={width} height={height} active={active} reduceMotion={reduceMotion} animating={plaza.animating} onTalk={()=>request(PLAZA_APPROACH_POINT,{kind:'plaza'})}/>}
      {sceneResidents.map(encounter=><StoryEncounterActor key={encounter.key} encounter={encounter} width={width} height={height} active={active&&!props.food&&!experience} reduceMotion={reduceMotion} onTalk={()=>request(storyApproach(encounter),{kind:'story',encounter})}/>)}
      {stories.ready&&<StoryWorldKeepsakes hideNewcomer={sceneResidents.length>0} state={stories.state} map={map} width={width} height={height} active={active} reduceMotion={reduceMotion} onTalk={()=>setMapMessage(stories.state.arcs.festival?.episodes.length===6?'あのお祭り、楽しかったね。今日もここで、のんびりしていって。':'おかえり！ あのお茶会から、ここで誰かに会うのが楽しみになったんだ。')}/>}
      {map==='grandma'&&grandmaUnlocked&&<>
       <GardenBeds width={width} height={height} active={active&&!props.food} onPlot={i=>request({x:.23,y:GARDEN_PLOTS[i].y+.08},{kind:'garden',plot:i})}/>
       <Pressable testID="garden-grandmother" accessibilityRole="button" accessibilityLabel="おばあさんと話す" disabled={!active||!!props.food} onPress={()=>{steering.value={x:0,y:0};setDestination(null);pending.current=null;setGrandmaOpen(true);}} style={{position:'absolute',left:width*.15,top:height*.45-width*.17,zIndex:700}}><GrandmotherResident size={width*.17} active={active} reduceMotion={reduceMotion}/></Pressable>
      </>}
      {map==='lake'&&<VillageWheel width={width} height={height} active={active} reduceMotion={reduceMotion} riding={experience==='wheel'} onFinish={finishExperience}/>}

      {map==='fortune'&&<FortuneCat width={width} height={height} clearTop={stageTop-frame.top} clearBottom={clearBottom-frame.top} disabled={!active||!!props.food} active={props.active&&(active||zooming)} reduceMotion={reduceMotion} greeting={merchantGreeting.kind==='fortune'?merchantGreeting.count:0} onPress={()=>openMerchant('fortune',{x:.4,y:.51})}/>}
      {map==='homewares'&&merchant('shop','暮らしのお店',{x:.50,y:.49},'stage3','shop')}
      {map==='workshop'&&merchant('egg-job','工房の店長',{x:.50,y:.48},'egg','job')}
      {map==='ramen'&&merchant('ramen','ラーメン屋',{x:.38,y:.57},'odango','ramen')}
      {map==='bowling'&&merchant('bowling','受付スタッフ',{x:.72,y:.57},'egg','bowling')}
      {map==='tobacco'&&merchant('tobacco','タバコ屋',{x:.33,y:.55},'stage3','tobacco')}
      {map==='tobacco'&&<TobaccoPatrons width={width} height={height} clearTop={stageTop-frame.top} viewportLeft={-frame.left} viewportWidth={bounds.width} active={active&&!props.food} reduceMotion={reduceMotion} onTalk={()=>{steering.value={x:0,y:0};pending.current=null;setDestination(null);portalTravel.value=false;}}/>}
      <VillageVisitors occupiedPoints={conversationTargets.map(t=>t.point)} map={map} daySeed={props.daySeed} width={width} height={height} clearTop={stageTop-frame.top} viewportLeft={-frame.left} viewportWidth={bounds.width} active={active&&!props.food&&!experience&&!bowlingBusy} reduceMotion={reduceMotion} onTalk={()=>{steering.value={x:0,y:0};pending.current=null;setDestination(null);portalTravel.value=false;}}/>
      {nearbyTarget?.hint&&<EncounterHint key={nearbyTarget.key} target={nearbyTarget} targets={conversationTargets} width={width} height={height} viewportLeft={-frame.left} viewportWidth={bounds.width} clearTop={stageTop-frame.top} footX={footX} footY={footY}/>}
      {!eyeLevel&&mapPortals(map,grandmaUnlocked,Platform.OS).filter(gate=>gate.to!=='home').map(gate=>{const place=WORLD_MAPS.find(p=>p.id===gate.to)!;return <WorldGate key={gate.to} to={gate.to} label={place.name} x={gate.point.x} y={gate.point.y} width={width} height={height} open={canVisitMap(gate.to,access,grandmaUnlocked,Platform.OS)} disabled={!active||!!props.food||!!experience||bowlingBusy} onPress={()=>walkTo(gate.point,true)}/>;})}
      <WorldResident {...props} closeUp={closeUp} viewFlight={flight} keepsake={keepsake==='none'?undefined:keepsake} bondDays={progress.visits?.totalVisits??0} grandmaUnlocked={grandmaUnlocked} welcomeRequest={loadedArt===source?props.welcomeRequest:0} riding={riding} portalTravel={portalTravel} bowlingBusy={bowlingBusy} footX={footX} steering={steering} smoking={smoking.running} experience={experience==='smoke'?null:experience} onPortal={enterMap} onDestinationReached={arrive} active={active&&!cleanTool} map={map} zoom={zoom} cameraTouch={touching} cameraGesture={view.pinch} width={width} height={height} footY={footY} holding={holding} destination={destination} />
      {map==='home'&&!eyeLevel&&props.carriedGift&&<CarriedGift kind={props.carriedGift} width={width} height={height} footX={footX} footY={footY}/>}
      {experience==='bath'&&<BathingEgg stage={props.stage} width={width} height={height} active={active} reduceMotion={reduceMotion}/>}
      {map==='tobacco'&&<TobaccoHaze active={active} reduceMotion={reduceMotion}/>}
    </Animated.View></View></GestureDetector>}
    <LinearGradient pointerEvents="none" colors={['#15262A75', 'transparent']} style={s.topShade} />
    <LinearGradient pointerEvents="none" colors={['transparent', '#192D2CB8']} style={s.bottomShade} />
    <View style={[s.toolbar,{top:insets.top+(tight?64:114)}]} pointerEvents="box-none">
      <View style={{flexDirection:'row',gap:8}}>
      <Pressable testID="world-map-open" accessibilityRole="button" accessibilityLabel="おでかけ。村の地図を開く" accessibilityState={{disabled:!active||bowlingBusy}} disabled={!active||!!cleanTool||riding||bowlingBusy} onPress={()=>{steering.value={x:0,y:0};setMapOpen(true);}} style={({pressed})=>[s.travelButton,{opacity:(!active||bowlingBusy)?0.5:pressed?0.85:1}]}>
        <DoorIcon name="log-out" size={18} color="#846597"/>
        <Text style={s.travelTitle}>おでかけ</Text>
      </Pressable>
      {away&&<WorldPill compact testID="world-gate-home" label="おうち" icon="home" accessibilityLabel="おうちへの道しるべ" disabled={!active||!!props.food||!!experience||bowlingBusy||riding||!!cleanTool} onPress={()=>enterMap('home')}/>}
      </View>
      <View style={{flexDirection:'row',gap:8}}>{map==='home'&&<WorldPill compact testID="room-clean-open" label="部屋のお掃除" icon="wind" disabled={!active||!!props.food||!!experience||riding} onPress={()=>{setHomeEyeLevel(false);setCleanOpen(true);}}/>}<WorldPill testID="world-bgm-toggle" label="BGM" icon={props.music.enabled?'volume-2':'volume-x'} accessibilityLabel={props.music.enabled?'BGMを止める':'BGMを流す'} disabled={props.music.busy} onPress={props.music.toggle} style={{paddingHorizontal:11}}/>
      <WorldPill compact icon="sliders" label="景色の見かた" disabled={!active||bowlingBusy} onPress={()=>setViewOpen(true)} /></View>
    </View>
    {map==='home'&&!cleanTool&&!riding&&<View pointerEvents="box-none" style={{position:'absolute',top:insets.top+169,left:20,right:20,alignItems:bounds.width>bounds.height?'flex-start':'center'}}><WorldPill testID="home-view-toggle" label="視点を変える" icon={eyeLevel?'grid':'eye'} disabled={!active||!!props.food} onPress={toggleHomeView}/></View>}
    {eyeLevel&&closeUp&&<View testID="home-eye-level" pointerEvents="box-none" style={{position:'absolute',top:closeUp.footY+frame.top-(bounds.width>bounds.height?42:20),left:20,right:20,flexDirection:'row',gap:12,justifyContent:bounds.width>bounds.height?'flex-start':'space-between'}}><WorldPill compact testID="eye-feed" label="ごはんを選ぶ" icon="coffee" disabled={!active||!!props.food} onPress={()=>props.onFeed()}/><WorldPill compact testID="eye-rest" label="ひと休み" icon="moon" disabled={!active||!!props.food} onPress={props.onRest}/></View>}
    {map!=='home'&&<View pointerEvents="none" style={[s.sceneTitle,{top:insets.top+(tight?115:165)}]}><Text style={[s.sceneName,{fontSize:13}]}>{WORLD_MAPS.find(p=>p.id===map)?.name}</Text></View>}
    {!eyeLevel&&!experience&&(map==='home'||(map==='market'&&!plaza.current&&!plaza.error)||map==='workshop')&&<View style={{position:'absolute',right:20,bottom:away?dockBottom+30:(bounds.height<600?177:244)-homeControlOffset}}><WorldPill testID="world-go-work" label={map==='workshop'?'仕事を始める':'バイトする'} icon="briefcase" onPress={()=>map==='workshop'?openMerchant('job',{x:.5,y:.48}):enterMap('workshop')} disabled={!active||!!props.food||riding||!!cleanTool}/></View>}
    {storyOpen&&<VillageStoryDialogue encounter={storyOpen} onGo={target=>{setStoryOpen(null);enterMap(target);}} onClose={()=>setStoryOpen(null)} onBowl={()=>{pendingBowlStory.current=storyOpen;setStoryOpen(null);serveMerchant('bowling',{x:.72,y:.57});}} service={storyOpen.merchant?{label:storyOpen.id==='supply'&&wholesaleUnlocked(feedState)?'野菜を卸す':({ramen:'ラーメンを注文する',shop:'買い物をする',job:'バイトを始める',bowling:'ボウリングをする',fortune:'占ってもらう'} satisfies Record<StoryMerchant,string>)[storyOpen.merchant],run:()=>{const kind=storyOpen.merchant!;if(kind==='bowling'&&!bowlingPlayedToday(bowlingState,getTodayDate())&&storyOpen.id==='bowling'&&storyOpen.index===4)pendingBowlStory.current=storyOpen;setStoryOpen(null);serveMerchant(kind,{x:.5,y:.55});}}:undefined}/>}
    {map==='grandma'&&grandmaUnlocked&&gardenPlot!==null&&<GardenSheet plotIndex={gardenPlot} onClose={()=>setGardenPlot(null)} onShop={()=>{setGardenPlot(null);props.onShop('seeds');}}/>}
    {grandmaOpen&&<BottomSheet visible title="もふもふのおばあさん" onClose={()=>setGrandmaOpen(false)}><View style={{alignItems:'center'}}><GrandmotherResident size={95} active={props.active} reduceMotion={reduceMotion}/></View><Text style={s.dialogue}>{harvested?'「あら、畑の土がいい匂い。育ったところを一緒に見られるの、うれしいよ。お茶もいれてあるからね」':'「よく来たねえ。畑、好きに使っておくれ。お茶もいれてあるよ」'}</Text><WorldPill label="畑を見てくるね" onPress={()=>setGrandmaOpen(false)}/></BottomSheet>}
    {!!props.music.error&&<Text style={[s.musicNotice,{top:insets.top+(tight?112:162)}]}>{props.music.error}</Text>}
    <Modal visible={bowlingOpen} animationType={reduceMotion?'none':'fade'} onRequestClose={()=>{if(!bowlingBusy){setBowlingOpen(false);view.reset();}}} statusBarTranslucent>
      <View style={{flex:1,backgroundColor:'#14131D',paddingTop:Math.max(insets.top,12),paddingBottom:Math.max(insets.bottom,12),paddingHorizontal:10}}>
        {bowlingOpen&&<BowlingGame active={props.active} stage={props.stage} wear={props.wear} effect={props.effect} mascotName={props.mascotName} reduceMotion={reduceMotion} onBusy={setBowlingBusy} onClose={()=>{if(!bowlingBusy){setBowlingOpen(false);view.reset();}}}/>}
      </View>
    </Modal>
    {!experience&&map==='bowling'&&<View style={[s.placeAction,{bottom:dockBottom+26,left:132}]}><WorldPill testID="bowling-reception" label="店員に話しかける" icon="message-circle" onPress={()=>openMerchant('bowling',{x:.72,y:.57})} disabled={!active||!!props.food}/></View>}
    {!experience&&map==='fortune'&&<View style={[s.placeAction,{bottom:dockBottom+26,left:132}]}><WorldPill testID="fortune-open" label="占ってもらう" icon="moon" onPress={()=>openMerchant('fortune',{x:.4,y:.51})} disabled={!active||!!props.food}/></View>}
    {!experience&&['onsen','lake'].includes(map)&&<View style={[s.placeAction,{bottom:dockBottom+26}]}>
      <WorldPill testID={map==='onsen'?'village-bath':'village-ride'} primary label={map==='onsen'?'温泉に入る':'観覧車に乗る'} icon={map==='onsen'?'sun':'disc'} disabled={!active||!!props.food}
        onPress={()=>request({x:map==='lake'?.61:.51,y:.5},{kind:map==='onsen'?'bath':'wheel'})}/>
      {map==='onsen'&&<WorldPill testID="onsen-neighbors" label="湯あがりのおしゃべり" icon="users" disabled={!active||!!props.food} onPress={()=>setNeighborsOpen(true)} style={{marginTop:8}}/>}
    </View>}
    {map==='home'&&!cleanOpen&&<View pointerEvents="box-none" style={{position:'absolute',top:insets.top+166,left:20,right:20,alignItems:'flex-start',gap:6}}>
      {cleanTool&&<Text testID="room-clean-instruction" style={{fontSize:11,color:'#CBBADC',padding:8,backgroundColor:'#211B30C9'}}>{CLEANING_TOOLS[cleanTool].name}で床をこすってね</Text>}
      {cleanTool&&<WorldPill testID="room-clean-finish" label="お掃除をおわる" icon="check" onPress={()=>setCleanTool(null)}/>}
      {!!housekeeping.error&&<Pressable accessibilityRole="button" onPress={housekeeping.retry}><Text style={{fontSize:11,color:'#8D4343',backgroundColor:'#FFF5ED',padding:8}}>{housekeeping.error}</Text></Pressable>}
    </View>}
    {cleanOpen&&<BottomSheet visible title="お部屋のお掃除" onClose={()=>setCleanOpen(false)}>
      <Text style={s.mapCopy}>清潔度 {props.cleanliness}%。からだとお部屋を合わせた数値です。床をこすると清潔度が上がります。3日に1回を目安に、お掃除しよう。</Text>
      {(['broom','cloth'] as const).map(tool=><Pressable key={tool} testID={`room-use-${tool}`} accessibilityRole="button" disabled={!housekeeping.house.owned.includes(tool)} onPress={()=>{setCleanOpen(false);setCleanTool(tool);setDestination(null);steering.value={x:0,y:0};portalTravel.value=false;view.reset();}} style={[s.mapRow,{opacity:housekeeping.house.owned.includes(tool)?1:.5}]}><CleaningToolArt tool={tool} size={48}/><View><Text style={s.mapName}>{CLEANING_TOOLS[tool].name}</Text><Text style={s.mapCopy}>{housekeeping.house.owned.includes(tool)?'これを使って床をこする':'暮らしのお店で買えるよ'}</Text></View></Pressable>)}
      {housekeeping.house.owned.includes('robot')&&<Text style={s.mapCopy}>{housekeeping.house.robotPlaced?'掃除機は自動でお掃除中。タップすると乗ったまま移動できるよ。':'ロボット掃除機はしまっています。「部屋の模様替え」の掃除から置けるよ。'}</Text>}
      <WorldPill label="暮らしのお店へ" icon="shopping-bag" onPress={()=>{setCleanOpen(false);setCleanTool(null);props.onShop();}}/>
    </BottomSheet>}
    {riding&&<View style={{position:'absolute',right:20,bottom:(bounds.height<600?170:230)-homeControlOffset}}><WorldPill testID="room-robot-exit" label="掃除機からおりる" icon="log-out" onPress={()=>{steering.value={x:0,y:0};setRiding(false);}}/></View>}
    {viewOpen&&<BottomSheet visible title="景色の見かた" onClose={()=>setViewOpen(false)}>
      {map==='home'&&<WorldPill testID="home-eye-level-switch" primary label="視点を変える" icon={eyeLevel?'grid':'eye'} disabled={!!props.food||!!cleanTool||riding} onPress={toggleHomeView} style={{marginBottom:16}}/>}
      {!eyeLevel&&<View style={{flexDirection:'row',gap:10}}><WorldPill testID="world-zoom-in" label="拡大する" icon="zoom-in" accessibilityLabel="景色を拡大" onPress={view.closer}/><WorldPill testID="world-zoom-reset" label="元の広さへ" icon="maximize" accessibilityLabel="景色の拡大を戻す" onPress={view.reset}/></View>}
      {!eyeLevel&&<Text style={s.mapCopy}>地面をタップ、または左の丸を動かしておさんぽ。2本指でも景色を拡大できます。</Text>}
      {eyeLevel&&<Text style={s.mapCopy}>なでたり、抱っこしたりできます。お掃除するときは、部屋全体の表示に戻ります。</Text>}
      {map==='home'&&!eyeLevel&&Object.entries(WORLD_TRAIL).map(([id,place])=><WorldPill key={id} testID={'world-travel-'+id} label={place.label+'へ歩く'} icon="navigation" onPress={()=>{setViewOpen(false);setDestination({id:++destinationId.current,point:mapGroundPoint(map,place.point)});}}/>)}
    </BottomSheet>}
    {placesOpen&&<BottomSheet visible title="琥珀通りのタバコ屋" subtitle="店主・スモーク / 路地裏の小さな休憩所" onClose={()=>{setPlacesOpen(false);view.reset();}}>
      <View style={{alignItems:'center'}}><MerchantResident kind="tobacco" size={112} active={props.active} reduceMotion={reduceMotion}/></View><Text style={s.mapCopy}>5秒ごとに幸福 ＋1 / 清潔 −1。1回60秒まで。汚れはおふろのタオルで洗い流せるよ。</Text>
      <Text testID="tobacco-gift-stock" style={s.mapCopy}>もらったたばこ：{smokingStatus(feedState.happiness?.smoking,Date.now()).state.giftCigarettes}本</Text>
      <SmokingCare status={smokingStatus(feedState.happiness?.smoking,Date.now())}/>
      {!!smoking.error&&<Text accessibilityRole="alert" style={s.mapCopy}>{smoking.error}</Text>}
      <WorldPill testID="tobacco-smoke" label={smoking.busy?'準備中…':'喫煙所で一服する'} disabled={smoking.busy} icon="wind" onPress={()=>{void smoking.start().then(ok=>{if(ok){setPlacesOpen(false);view.reset();setExperience('smoke');}});}}/>
    </BottomSheet>}
    {nearbyTarget&&<View style={[s.placeAction,{bottom:dockBottom+26,left:132}]}><WorldPill testID="nearby-talk" label="話しかける" icon="message-circle" onPress={()=>{if(nearbyTarget.key==='plaza')request(PLAZA_APPROACH_POINT,{kind:'plaza'});else{const encounter=localResidents.find(e=>e.key===nearbyTarget.key);if(encounter)request(storyApproach(encounter),{kind:'story',encounter});}}} disabled={!active||!!props.food}/></View>}
    {map==='market'&&!!plaza.error&&!plaza.open&&<Pressable accessibilityRole="button" accessibilityLabel="広場の出会いを再読み込み" onPress={plaza.retry} style={[s.experience,{bottom:dockBottom+4,left:132}]}><Text style={s.experienceText}>{plaza.error}　再試行</Text></Pressable>}
    {map==='market'&&plaza.open&&plaza.current&&<PlazaDialogue encounter={plaza.current} busy={plaza.busy} error={plaza.error} animating={plaza.animating} points={feedState.points} onChoose={choice=>{void plaza.choose(choice,reduceMotion);}} onClose={()=>{void plaza.close();}}/>}
    {fortuneOpen&&<FortuneHall onClose={()=>{setFortuneOpen(false);view.reset();}}/>}
    {mapOpen&&<VillageMap current={map} night={night} disabled={!!experience||!!props.food||transition.busy} onSelect={id=>enterMap(id,true)} onClose={()=>setMapOpen(false)}/>}
    {map==='grandma'&&!!gardenNotice&&<Pressable accessibilityRole="button" accessibilityLabel="畑のお知らせを閉じる" onPress={()=>setGardenNotice('')} style={{position:'absolute',bottom:112,alignSelf:'center',paddingHorizontal:20,paddingVertical:12,borderRadius:24,backgroundColor:'#302B35EC'}}><Text accessibilityLiveRegion="polite" style={s.trailText}>{gardenNotice}</Text></Pressable>}
    {!!mapMessage&&!mapOpen&&<Pressable accessibilityRole="button" accessibilityLabel="道の案内を閉じる" onPress={()=>setMapMessage('')} style={[s.notice,{top:insets.top+166}]}><Text accessibilityLiveRegion="polite" style={s.trailText}>{mapMessage}　×</Text></Pressable>}
    {experience&&<View testID="village-experience" style={[s.experience,{bottom:dockBottom+4,left:132,right:16,padding:10,gap:5}]}>
      <Text testID="village-experience-status" style={s.experienceText}>{experience==='smoke'?`${smoking.running?'喫煙中':'一服おわり'} ${Math.floor(smoking.elapsedMs/1000)}/60秒 · 幸福＋${smoking.receipt?.gained??0} 清潔−${smoking.receipt?.dirt??0}`:experience==='wheel'?'空から、いつもの世界を眺めよう。':experienceMessage}</Text>
      {!!smoking.error&&experience==='smoke'&&<><Text accessibilityRole="alert" style={s.experienceText}>{smoking.error}</Text><WorldPill label="同じ時間で保存し直す" onPress={()=>{void smoking.retry();}} disabled={smoking.busy}/></>}
      <Pressable testID="village-experience-exit" accessibilityRole="button" disabled={experience==='smoke'&&smoking.busy} onPress={finishExperience} style={s.exit}><Text style={s.exitText}>{experience==='bath'?'お湯からあがる':experience==='smoke'?smoking.busy?'保存中…':smoking.running?'一服を終える':'戻る':'観覧車から降りる'}</Text></Pressable>
    </View>}
    {!eyeLevel&&!riding&&!props.careInvitation&&(!experience||experience==='smoke')&&!cleanTool&&<View testID="world-steering-frame" style={{position:'absolute',left:16,bottom:steeringBottom}}><WorldSteering value={steering} enabled={active&&!props.food&&!bowlingBusy} onStart={()=>{portalTravel.value=!riding&&experience!=='smoke';pending.current=null;setDestination(null);}} onStep={(dx,dy)=>{walkTo({x:footX.value+dx*.055,y:footY.value+dy*.04},experience!=='smoke');}}/></View>}
    {neighborsOpen&&<BottomSheet visible title="湯あがりのおしゃべり" subtitle="温泉の休憩室で、ひと息。" onClose={()=>setNeighborsOpen(false)}>{VILLAGERS.map(n=><Pressable key={n.id} testID={`onsen-neighbor-${n.id}`} accessibilityRole="button" accessibilityLabel={`${getStageName(n.stage)}の村人に話しかける`} onPress={()=>{setNeighborsOpen(false);setNeighbor(n.id);setReply('');}} style={[s.mapRow,{flexDirection:'row',alignItems:'center',gap:16}]}><VillageResident stage={n.stage} size={64} active={props.active} reduceMotion={reduceMotion}/><Text style={s.mapCopy}>{getStageName(n.stage)}の村人</Text></Pressable>)}</BottomSheet>}
    {speaker&&<BottomSheet visible title={`${getStageName(speaker.stage)}の村人`} subtitle="湯あがりの休憩室" onClose={()=>setNeighbor(null)}><View style={{alignItems:'center'}}><VillageResident stage={speaker.stage} size={112} active={props.active} reduceMotion={reduceMotion}/></View><Text testID="village-dialogue" accessibilityLiveRegion="polite" style={s.dialogue}>{reply||speaker.intro}</Text>{speaker.choices.map(choice=><Pressable key={choice.label} accessibilityRole="button" onPress={()=>setReply(choice.reply)} style={s.mapRow}><Text style={s.mapCopy}>{choice.label}</Text></Pressable>)}<Pressable accessibilityRole="button" onPress={()=>setNeighbor(null)} style={s.exit}><Text style={s.exitText}>またね</Text></Pressable></BottomSheet>}
    {transition.overlay}

  </View>;
}
const s = StyleSheet.create({
  travelButton:{minHeight:44,paddingHorizontal:13,borderRadius:16,borderWidth:1,borderColor:'#DFD0E8',backgroundColor:'#FFFAFFF2',flexDirection:'row',alignItems:'center',gap:7},
  travelTitle:{letterSpacing:.7,fontSize:12,fontWeight:'600',color:'#846597'},travelSubtitle:{fontSize:11,lineHeight:16,color:'#665474'},
  bowlingStatus:{position:'absolute',left:20,right:20,maxWidth:400,padding:12,borderRadius:18,backgroundColor:'#FFFAFFF2'},
  toolbar:{position:'absolute',left:20,right:20,flexDirection:'row',justifyContent:'space-between',gap:8,alignItems:'center'},
  placeAction:{position:'absolute',left:116,right:20,maxWidth:240},
  ramenWelcome:{position:'absolute',padding:10,borderRadius:20,backgroundColor:'#FFF7E8EE'},ramenWelcomeText:{fontSize:13,textAlign:'center',color:'#795F77',lineHeight:21},
  facility:{position:'absolute',minHeight:44,width:120,borderRadius:20,alignItems:'center',justifyContent:'center',backgroundColor:'#FFF1DCEB',borderWidth:1,borderColor:'#AE9068',zIndex:880,shadowColor:'#2D3326',shadowOpacity:.22,shadowRadius:6},facilityText:{fontSize:12,fontWeight:'600',color:'#584D37'},portal:{position:'absolute',minHeight:32,width:76,borderRadius:16,alignItems:'center',justifyContent:'center',backgroundColor:'#344A3BB8',borderWidth:1,borderColor:'#D9C29190',zIndex:860},portalText:{fontSize:10,color:'#FFF1D3',textAlign:'center'},mapThumb:{width:64,height:72,borderRadius:12},notice:{position:'absolute',left:20,right:70,padding:12,borderRadius:16,backgroundColor:'#3C5243ED'},experience:{position:'absolute',left:20,right:72,gap:10,padding:14,borderRadius:18,borderWidth:1,borderColor:'#DFD0E8',backgroundColor:'#FFFAFFF2'},experienceText:{fontSize:13,lineHeight:20,color:'#796B89'},exit:{minHeight:44,paddingHorizontal:16,borderRadius:22,alignItems:'center',justifyContent:'center',backgroundColor:'#584367'},exitText:{color:'#FFF3DF',fontSize:13},dialogue:{fontSize:17,lineHeight:30,color:'#51405F',marginVertical:18},
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
  mapIntro:{fontSize:13,lineHeight:23,color:'#796B89',marginBottom:14},mapRow:{flexDirection:'row',alignItems:'center',padding:14,marginBottom:10,borderRadius:18,backgroundColor:'#F2EAF6',gap:8,minHeight:76},mapName:{fontSize:17,fontWeight:'600',color:'#51405F'},mapCopy:{fontSize:13,lineHeight:21,color:'#796B89'},
  musicNotice:{position:'absolute',right:20,fontSize:10,color:'#FFF6E7',backgroundColor:'#584265DD',borderRadius:10,padding:8},
  sceneTitle:{position:'absolute',left:22,gap:5},sceneKicker:{fontSize:8,letterSpacing:2.3,color:'#D9C293',textShadowColor:'#120F18',textShadowRadius:5},sceneName:{fontSize:18,letterSpacing:2,color:'#F4E4D0',textShadowColor:'#120F18',textShadowRadius:6},
  merchantLabel:{letterSpacing:.6,borderBottomWidth:1,borderColor:'#DFD0E8',fontSize:10,color:'#655072',backgroundColor:'#FFF9F2ED',paddingHorizontal:7,paddingVertical:4,borderRadius:10,textAlign:'center',minWidth:76},
  travelHint: {position: 'absolute', left: 20, color: '#FFF4DA', fontSize: 11},
});
