import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Image, Platform, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { cancelAnimation, Easing, runOnJS, useAnimatedReaction, useAnimatedStyle, useFrameCallback, useSharedValue, withDelay, withRepeat, withSequence, withSpring, withTiming, type SharedValue } from 'react-native-reanimated';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';
import { StaticMascot } from '@/components/Mascot';
import type { ResidentInteraction, ResidentItem } from '@/components/room/RoomResident';
import { getCharacter, type MascotMood, type MascotStage } from '@/utils/mascotUtils';
import { roomWearableFrame } from '@/utils/roomWearable';
import { WORLD_PLACES, worldResidentScale, type WorldDestination } from '@/utils/worldGeometry';
import type { WorldPeriod } from '@/utils/worldTime';
import {isMapGround,mapGroundPoint,mapStart,type WorldMapId} from '@/utils/worldMaps';
import type {PinchGesture} from 'react-native-gesture-handler';
import {MEAL_DURATION,mealSample} from '@/utils/residentMeal';
import {steerStep,mapPortals,type VillageExperience} from '@/utils/villageLife';
import {ResidentMeal} from '@/components/village/ResidentMeal';
import {rollStep} from '@/utils/residentPhysics';
import {VolumeResident,hasResidentVolume} from './VolumeResident';
import {residentSoftScale,residentWalkYaw} from '@/utils/evolvedVolume';
import { useWorldResident } from './useWorldResident';
import type {WorldBowlingInput} from '@/utils/bowling';
import type {WorldBowlingMotion} from './useWorldBowling';

type Props = {
  bowling:WorldBowlingMotion; bowlingBusy:boolean; onBowlingRoll:(input:WorldBowlingInput)=>void; onBowlingFinished:()=>void;
  footX: SharedValue<number>; steering:SharedValue<{x:number;y:number}>; experience:VillageExperience|null; food:string|null; onPortal:(map:WorldMapId)=>void; onDestinationReached:(id:number)=>void;
  map: WorldMapId; zoom: SharedValue<number>; cameraTouch: SharedValue<number>; cameraGesture: PinchGesture;
  width: number; height: number; stage: MascotStage; growthSize: number; mascotName: string;
  active: boolean; reduceMotion: boolean; resting: boolean; reaction: number; meal: number; rest: number;
  period: WorldPeriod; daySeed: number; wear?: ResidentItem; effect?: ResidentItem;
  footY: SharedValue<number>; holding: SharedValue<number>; destination: WorldDestination | null;
  onInteract: (kind: ResidentInteraction) => void; onMealFinished: () => void; onChat: () => void;
};
const SOFT = {mass: 0.7, damping: 10, stiffness: 180};

/** Scene-sized art, one motion owner, no React state or layout update on animation frames. */
export function WorldResident(p: Props) {
  const {width, height, active, reduceMotion, footY: y, holding, map, zoom, cameraTouch, stage, daySeed} = p;
  const x = p.footX;
  const {steering,experience,food}=p;
  const [manual,setManual]=useState(false);
  const mealProgress=useSharedValue(0);
  const lift = useSharedValue(0), jelly = useSharedValue(0), lean = useSharedValue(0);
  const breath = useSharedValue(0), gait = useSharedValue(0), walking = useSharedValue(0);
  const downX = useSharedValue(0), downY=useSharedValue(0), touchMode = useSharedValue(0), blink = useSharedValue(0);
  const startX = useSharedValue(0), startY = useSharedValue(0), petDistance = useSharedValue(0);
  const available = useSharedValue(active);
  const rolling=useSharedValue(0),vx=useSharedValue(0),vy=useSharedValue(0),rollAge=useSharedValue(0);
  const rx=useSharedValue(0),ry=useSharedValue(0),rz=useSharedValue(0),idleTime=useSharedValue(0);
  const [rollingLabel,setRollingLabel]=useState(false);
  const idleAllowed=useSharedValue(false);
  const strokeVX=useSharedValue(0),strokeVY=useSharedValue(0),strokeAt=useSharedValue(0);
  const finishRoll=useCallback(()=>{setRollingLabel(false);setInteracting(false);},[]);
  const [interacting, setInteracting] = useState(false);
  const [touchMood, setTouchMood] = useState<MascotMood | null>(null);
  const moodTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const latest = useRef(p); latest.current = p;
  const taps = useRef({at: 0, count: 0});
  const reaction = useRef(p.reaction);
  const volumetric=hasResidentVolume(stage);
  const size = width * 0.135 * Math.max(0.9, Math.min(1.12, p.growthSize));
  useEffect(()=>{const at=mapStart(map);cancelAnimation(x);cancelAnimation(y);rolling.value=0;rx.value=0;ry.value=0;rz.value=0;setRollingLabel(false);x.value=at.x;y.value=at.y;holding.value=0;setInteracting(false);},[map]);
  const pose = useWorldResident({...p, x, y, walking, interacting:interacting||manual||!!experience||p.bowlingBusy});
  useAnimatedReaction(()=>Math.hypot(steering.value.x,steering.value.y)>.05,value=>{if(value){cancelAnimation(x);cancelAnimation(y);rolling.value=0;walking.value=1;}else walking.value=0;runOnJS(setManual)(value);});
  const portals=mapPortals(map);
  const onPortal=p.onPortal;
  useAnimatedReaction(()=>{if(!available.value||!Math.hypot(steering.value.x,steering.value.y))return -1;return portals.findIndex(portal=>Math.hypot(x.value-portal.point.x,(y.value-portal.point.y)*1.5)<.035);},(index,previous)=>{if(index>=0&&index!==previous){steering.value={x:0,y:0};runOnJS(onPortal)(portals[index].to);}},[map,onPortal]);
  useEffect(()=>{if(pose==='eating'&&active){mealProgress.value=0;mealProgress.value=withTiming(1,{duration:MEAL_DURATION,easing:Easing.linear});}else mealProgress.value=0;return()=>cancelAnimation(mealProgress);},[pose,active,mealProgress]);
  useEffect(() => () => {
    available.value = false;
    [x, y, lift, jelly, lean, breath, gait, blink,rx,ry,rz].forEach(value => cancelAnimation(value));
    clearTimeout(moodTimer.current);
  }, [available, x, y, lift, jelly, lean, breath, gait, blink]);
  const notify = useCallback((kind: ResidentInteraction) => {
    if (!latest.current.active) return;
    if (kind === 'greet') {
      const now = Date.now();
      taps.current = {at: now, count: now - taps.current.at < 1800 ? taps.current.count + 1 : 1};
      if (taps.current.count >= 3) kind = 'space';
    }
    setTouchMood(kind === 'space' ? 'normal' : 'happy');
    clearTimeout(moodTimer.current);
    moodTimer.current = setTimeout(() => setTouchMood(null), 2300);
    latest.current.onInteract(kind);
  }, []);
  useEffect(() => {
    available.value = active;
    if (!active) {
      rolling.value=0;idleTime.value=0;rx.value=0;ry.value=0;rz.value=0;setRollingLabel(false);
      cancelAnimation(x); cancelAnimation(y); cancelAnimation(lift); cancelAnimation(jelly); cancelAnimation(lean);
      lift.value = 0; jelly.value = 0; lean.value = 0; holding.value = 0; touchMode.value = 0;
      setInteracting(false); setTouchMood(null); clearTimeout(moodTimer.current);
    }
    return () => {clearTimeout(moodTimer.current);};
  }, [active, available, x, y, lift, jelly, lean, holding, touchMode]);
  useEffect(() => {
    if (!active || reduceMotion) {breath.value = 0; gait.value = 0; return;}
    breath.value = withRepeat(withSequence(withTiming(1, {duration: 2200, easing: Easing.inOut(Easing.sin)}), withTiming(0, {duration: 2400, easing: Easing.inOut(Easing.sin)})), -1);
    if (pose === 'walking'||manual) gait.value = withRepeat(withTiming(Math.PI * 2, {duration: 740, easing: Easing.linear}), -1);
    else gait.value = withTiming(0, {duration: 180});
    return () => {cancelAnimation(breath); cancelAnimation(gait);};
  }, [active, reduceMotion, pose, manual, breath, gait]);
  useEffect(() => {
    if (p.reaction === reaction.current || !active || interacting) return;
    reaction.current = p.reaction;
    setTouchMood('happy'); clearTimeout(moodTimer.current);
    moodTimer.current = setTimeout(() => setTouchMood(null), 2400);
    if (!reduceMotion) jelly.value = withSequence(withTiming(0.7, {duration: 90}), withSpring(0, SOFT));
  }, [p.reaction, active, interacting, reduceMotion, jelly]);

  useAnimatedReaction(()=>({x:x.value,y:y.value,walking:walking.value}), (now,previous)=>{
    if(!previous||!now.walking||holding.value||rolling.value||reduceMotion)return;
    const dx=now.x-previous.x,dy=now.y-previous.y;
    if(Math.hypot(dx,dy)<.00001)return;
    const target=residentWalkYaw(dx,dy,height/width);
    // Choose the equivalent closest angle, so crossing +/-pi never spins around.
    const delta=Math.atan2(Math.sin(target-ry.value),Math.cos(target-ry.value));
    ry.value=withTiming(ry.value+delta,{duration:160});
  });
  const settleRotation=()=>{
    'worklet';
    rx.value=withSpring(Math.round(rx.value/(Math.PI*2))*Math.PI*2,{damping:16,stiffness:100});
    ry.value=withSpring(Math.round(ry.value/(Math.PI*2))*Math.PI*2,{damping:16,stiffness:100});
    rz.value=withSpring(Math.round(rz.value/(Math.PI*2))*Math.PI*2,{damping:16,stiffness:100});
  };
  useEffect(()=>{
    if(!active||pose!=='eating')return;
    // The bowl/morsel path is laid out for the front-facing mouth. Finish the
    // travel turn before the first bite instead of eating through the side.
    for(const angle of [rx,ry,rz])angle.value=reduceMotion?0:withTiming(Math.round(angle.value/(Math.PI*2))*Math.PI*2,{duration:220});
  },[active,pose,reduceMotion,rx,ry,rz]);
  const launchRoll=(speedX:number,speedY:number,automatic=false)=>{
    'worklet';
    if(!available.value||(reduceMotion&&map!=='bowling')||cameraTouch.value||experience||food||p.bowlingBusy)return;
    if(map==='bowling'){
      if(automatic)return;
      rollAge.value=0;
      cancelAnimation(x);cancelAnimation(y);walking.value=0;holding.value=0;touchMode.value=0;lift.value=0;
      runOnJS(setInteracting)(false);
      runOnJS(p.onBowlingRoll)({x:x.value,y:y.value,vx:Math.max(-1.25,Math.min(1.25,speedX)),vy:Math.max(-1.25,Math.min(1.25,speedY)),layout:'garden',aspect:height/width,radius:size*(stage==='odango'?.45:.33)/width});
      return;
    }
    cancelAnimation(x);cancelAnimation(y);cancelAnimation(rx);cancelAnimation(ry);cancelAnimation(rz);
    const point=mapGroundPoint(map,{x:x.value,y:y.value});x.value=point.x;y.value=point.y;
    rolling.value=1;rollAge.value=0;idleTime.value=0;vx.value=Math.max(-1.25,Math.min(1.25,speedX));vy.value=Math.max(-1.25,Math.min(1.25,speedY));
    walking.value=0;holding.value=0;touchMode.value=0;lift.value=0;
    runOnJS(setInteracting)(true);runOnJS(setRollingLabel)(true);
    if(!automatic)runOnJS(notify)('roll');
  };
  useEffect(()=>{idleAllowed.value=active&&!reduceMotion&&!interacting&&!manual&&!experience&&!food&&!p.resting&&(pose==='idle'||pose==='watching');},[active,reduceMotion,interacting,manual,experience,food,p.resting,pose]);
  const physics=useFrameCallback(frame=>{
    'worklet';
    if(!available.value||cameraTouch.value)return;
    const dt=Math.min(1/30,(frame.timeSincePreviousFrame??16.67)/1000);
    if(map==='bowling'&&p.bowling.running.value){
      const frames=p.bowling.frames.value;
      rollAge.value+=dt;
      const index=reduceMotion?frames.length-1:Math.min(frames.length-1,Math.floor(rollAge.value*60));
      const next=frames[index],radius=size*(stage==='odango'?.45:.33)/width;
      if(!reduceMotion){if(stage==='odango')ry.value+=(next.x-x.value)/radius;else rz.value+=(next.x-x.value)/radius;rx.value-=(next.y-y.value)*(height/width)/radius;}
      x.value=next.x;y.value=next.y;p.bowling.index.value=index;
      if(index===frames.length-1){p.bowling.running.value=false;rollAge.value=0;if(!reduceMotion)settleRotation();runOnJS(p.onBowlingFinished)();}
      return;
    }
    if(p.bowlingBusy)return;
    if(!experience&&!food&&Math.hypot(steering.value.x,steering.value.y)>.05){const next=steerStep(map,{x:x.value,y:y.value},steering.value,dt,height/width);x.value=next.x;y.value=next.y;walking.value=1;idleTime.value=0;return;}
    if(reduceMotion||experience||food)return;
    if(!rolling.value){
      if(map!=='bowling'&&idleAllowed.value&&!walking.value&&!holding.value){idleTime.value+=dt;if(idleTime.value>16&&isMapGround(map,{x:x.value,y:y.value}))launchRoll(.24*Math.cos(daySeed),.19,true);}
      return;
    }
    const next=rollStep({x:x.value,y:y.value,vx:vx.value,vy:vy.value,hit:false},dt,height/width,map);
    const radius=size*(stage==='odango'?.45:.33)/width;
    if(stage==='odango')ry.value+=(next.x-x.value)/radius;
    else rz.value+=(next.x-x.value)/radius;
    rx.value-=(next.y-y.value)*(height/width)/radius;
    x.value=next.x;y.value=next.y;vx.value=next.vx;vy.value=next.vy;rollAge.value+=dt;
    if(next.hit)jelly.value=withSequence(withTiming(.7,{duration:60}),withSpring(0,SOFT));
    if(Math.hypot(next.vx,next.vy)<.018||rollAge.value>5){rolling.value=0;settleRotation();runOnJS(finishRoll)();}
  },false);
  useEffect(()=>{physics.setActive(active);return()=>physics.setActive(false);},[active,reduceMotion,physics]);
  useEffect(()=>{if(reduceMotion){rolling.value=0;rx.value=0;ry.value=0;rz.value=0;setRollingLabel(false);setInteracting(false);}},[reduceMotion]);
  const begin = () => {
    'worklet';
    cancelAnimation(x); cancelAnimation(y); cancelAnimation(lift);
    rolling.value=0;idleTime.value=0;runOnJS(setRollingLabel)(false);
    walking.value = 0; holding.value = 0; touchMode.value = 1;
    lift.value = 0; lean.value = 0;
    jelly.value = reduceMotion ? 0 : withTiming(0.65, {duration: 100});
    runOnJS(setInteracting)(true);
  };
  const finishTouch = () => {
    'worklet';
    touchMode.value = 0;
    jelly.value = reduceMotion ? 0 : withSpring(0, SOFT);
    lean.value = reduceMotion ? 0 : withSpring(0, SOFT);
    if(!reduceMotion)settleRotation();
    runOnJS(setInteracting)(false);
  };
  const hold = Gesture.Pan().enabled(active&&!experience&&!food&&!p.bowlingBusy).maxPointers(1).activateAfterLongPress(240)
    .onBegin(begin)
    .onStart(() => {
      if (!available.value) return;
      touchMode.value = 2; holding.value = 1; startX.value = x.value; startY.value = y.value;
      jelly.value = reduceMotion ? 0 : withSpring(-0.65, SOFT);
      lift.value = reduceMotion ? -size * 0.22 : withSpring(-size * 0.55, {damping: 16, stiffness: 180});
      runOnJS(notify)('held');
    })
    .onUpdate(event => {
      if (!available.value || touchMode.value !== 2) return;
      const point = mapGroundPoint(map,{x: startX.value + event.translationX / (width*zoom.value), y: startY.value + event.translationY / (height*zoom.value)});
      x.value = point.x; y.value = point.y;
      if (!reduceMotion) {
        lean.value=withSpring(Math.max(-9,Math.min(9,event.velocityX/110)),SOFT);
        ry.value=event.translationX/(width*zoom.value)*Math.PI*4;
        rx.value=-event.translationY/(height*zoom.value)*Math.PI*3;
      }
    })
    .onFinalize((_event, success) => {
      if (touchMode.value !== 2) {if (touchMode.value === 1) finishTouch(); return;}
      if (!available.value) return;
      const point = mapGroundPoint(map,{x: x.value, y: y.value});
      x.value = point.x; y.value = point.y;
      touchMode.value = 0;
      lean.value = reduceMotion ? 0 : withSpring(0, SOFT);
      lift.value = withTiming(0, {duration: reduceMotion ? 0 : 240, easing: Easing.in(Easing.quad)}, finished => {
        if (!finished || !available.value) return;
        holding.value = 0;
        jelly.value = reduceMotion ? 0 : withSequence(withTiming(1, {duration: 65}), withSpring(0, SOFT));
        runOnJS(setInteracting)(false);
        if(!reduceMotion)settleRotation();
        if (success) runOnJS(notify)('land');
      });
    });
  const stroke = Gesture.Pan().enabled(active&&!experience&&!food&&!p.bowlingBusy).maxPointers(1).minDistance(10)
    .onStart(event => {
      cancelAnimation(x); cancelAnimation(y); walking.value = 0;
      touchMode.value = 3; downX.value=event.absoluteX;downY.value=event.absoluteY;petDistance.value=0;strokeVX.value=0;strokeVY.value=0;strokeAt.value=Date.now();
      runOnJS(setInteracting)(true);
    })
    .onUpdate(event => {
      // Short flicks can have too few samples for the platform velocity tracker.
      // Keep a bounded recent absolute-position sample; a paused stroke is not a flick.
      const now=Date.now(),elapsed=now-strokeAt.value;
      const dx=event.absoluteX-downX.value,dy=event.absoluteY-downY.value;
      if(elapsed>0){
        strokeVX.value=event.velocityX||(elapsed<120?dx*1000/elapsed:0);
        strokeVY.value=event.velocityY||(elapsed<120?dy*1000/elapsed:0);
      }
      strokeAt.value=now;downX.value=event.absoluteX;downY.value=event.absoluteY;
      petDistance.value+=Math.hypot(dx,dy);
      if (!reduceMotion) {
        jelly.value = withSpring(0.4 + Math.min(0.3, Math.abs(event.velocityX) / 2000), SOFT);
        lean.value = withSpring(Math.max(-6, Math.min(6, event.translationX / 9)), SOFT);
      }
    })
    .onTouchesUp(event=>{
      if(touchMode.value!==3)return;
      const point=event.changedTouches[0];if(!point)return;
      const now=Date.now(),elapsed=now-strokeAt.value;
      const dx=point.absoluteX-downX.value,dy=point.absoluteY-downY.value;
      // On Web, the first move leaving the hit box is a boundary event, not an
      // onUpdate. Use the real release point so that a short flick is not lost.
      if(elapsed>0&&elapsed<140&&Math.hypot(dx,dy)>1){
        strokeVX.value=dx*1000/elapsed;strokeVY.value=dy*1000/elapsed;strokeAt.value=now;
        petDistance.value+=Math.hypot(dx,dy);
      }
    })
    .onFinalize((_event, success) => {
      if (touchMode.value !== 3) return;
      const fresh=Date.now()-strokeAt.value<140;
      const speedX=fresh?strokeVX.value:0,speedY=fresh?strokeVY.value:0;
      if(success&&(!reduceMotion||map==='bowling')&&Math.hypot(speedX,speedY)>450){
        jelly.value=withSpring(0,SOFT);lean.value=withSpring(0,SOFT);
        launchRoll(speedX/(width*zoom.value)*.65,speedY/(width*zoom.value)*.65);return;
      }
      finishTouch();
      if (success && petDistance.value > 20) runOnJS(notify)('pet');
    });
  const tap = Gesture.Tap().enabled(active&&!experience&&!food&&!p.bowlingBusy).maxDuration(240).maxDistance(10).onEnd((_event, success) => {
    if (!success || !available.value) return;
    finishTouch(); runOnJS(notify)('greet');
  });
  hold.simultaneousWithExternalGesture(p.cameraGesture);stroke.simultaneousWithExternalGesture(p.cameraGesture);tap.simultaneousWithExternalGesture(p.cameraGesture);
  useAnimatedReaction(()=>cameraTouch.value,value=>{
    if(!value)return;
    rolling.value=0;idleTime.value=0;runOnJS(setRollingLabel)(false);
    cancelAnimation(lift);cancelAnimation(jelly);holding.value=0;touchMode.value=0;lift.value=0;jelly.value=0;lean.value=0;
    runOnJS(setInteracting)(false);
  });
  const gesture = Gesture.Race(hold, stroke, tap);
  const rootStyle = useAnimatedStyle(() => ({
    opacity:experience?0:1,
    zIndex: holding.value ? 999 : Math.round(y.value * 1000),
    transform: [{translateX: x.value * width - size / 2}, {translateY: y.value * height - size * 0.92}],
  }));
  const perspective = useAnimatedStyle(() => {
    const scale = worldResidentScale(y.value);
    return {transform: [{translateY: (1 - scale) * size * 0.42}, {scale}]};
  });
  const body = useAnimatedStyle(() => {
    const step = walking.value ? Math.sin(gait.value) : 0;
    const meal=mealSample(mealProgress.value);
    const mealMove=reduceMotion?0:meal.reach;
    const soft=residentSoftScale(jelly.value,breath.value);
    const mealY=-mealMove*.06+(reduceMotion?0:meal.swallow*.04);
    const sy=stage==='egg'?1-jelly.value*.17-breath.value*.014+mealY:Math.min(1,soft.y+mealY);
    return {transform: [
      {translateX:mealMove*size*.12},
      {translateY: lift.value + (1 - sy) * size * 0.42 - Math.abs(step) * size * 0.021},
      {rotate: `${lean.value + mealMove*8 + step * 2.2 + (volumetric?0:rz.value*180/Math.PI)}deg`},
      {scaleX: (stage==='egg'?1+jelly.value*.14+breath.value*.011:soft.x)+(reduceMotion?0:meal.chew*.025)}, {scaleY: sy},
    ]};
  });
  const shadow = useAnimatedStyle(() => {
    const air = Math.min(1, Math.abs(lift.value) / (size * 0.55));
    return {opacity: 1 - air * 0.65, transform: [{scaleX: worldResidentScale(y.value) * (1 + air * 0.45)}, {scaleY: 1 + air * 0.3}]};
  });
  const mood: MascotMood = touchMood ?? (interacting || pose === 'eating' ? 'happy' : p.resting || pose === 'sleeping' ? 'sleepy' : 'normal');
  useEffect(() => {
    blink.value = 0;
    if (!active || reduceMotion || mood !== 'normal') return;
    blink.value = withRepeat(withDelay(4100, withSequence(withTiming(1, {duration: 80}), withTiming(0, {duration: 130}))), -1);
    return () => cancelAnimation(blink);
  }, [active, reduceMotion, mood, blink]);
  const activity = manual?'おさんぽしています':rollingLabel ? 'ころころしています' : pose === 'walking' ? 'おさんぽしています' : pose === 'sleeping' ? 'ひと休みしています' : pose === 'eating' ? 'おやつの時間' : pose === 'watching' ? '景色を眺めています' : 'のんびりしています';
  const acknowledge = (kind: ResidentInteraction) => {
    if (!active || experience || food) return;
    notify(kind);
    if (!reduceMotion) jelly.value = withSequence(withTiming(0.8, {duration: 90}), withSpring(0, SOFT));
  };
  return <GestureDetector gesture={gesture} touchAction="none">
    <Animated.View testID="room-resident" style={[s.root, {width: size, height: size}, rootStyle]} accessible={!experience} accessibilityRole="button"
      accessibilityElementsHidden={!!experience} importantForAccessibility={experience ? 'no-hide-descendants' : 'auto'} aria-hidden={!!experience}
      accessibilityState={{disabled: !active || !!experience || !!food || p.bowlingBusy}}
      accessibilityLabel={`${p.mascotName}にふれる。${activity}`} accessibilityHint="タップでごあいさつ。なでると喜びます。すばやく払うと、ころころ。長押しで抱っこ。2本指で景色を拡大"
      accessibilityActions={[{name: 'activate', label: 'ごあいさつ'}, {name: 'pet', label: 'なでる'}, {name: 'talk', label: 'お話しする'}, {name:'roll',label:'ころがす'}]}
      onAccessibilityAction={e => {if(!active || experience || food||p.bowlingBusy)return; e.nativeEvent.actionName === 'roll' ? launchRoll(map==='bowling'?.12:.6,map==='bowling'?-.9:.3) : e.nativeEvent.actionName === 'talk' ? p.onChat() : acknowledge(e.nativeEvent.actionName === 'pet' ? 'pet' : 'greet');}}
      onAccessibilityTap={() => acknowledge('greet')} tabIndex={active && !experience && !food ? 0 : -1}
      {...(Platform.OS === 'web' ? {onKeyDown: (e: React.KeyboardEvent) => {if(map==='bowling'&&e.key==='ArrowUp'){e.preventDefault();launchRoll(.12,-.9);}else if(e.key==='ArrowRight'&&!reduceMotion){e.preventDefault();launchRoll(.6,.3);}else if (e.key === 'Enter' || e.key === ' ') {e.preventDefault(); acknowledge('greet');}}} : {})}>
      <Animated.View pointerEvents="none" testID="resident-contact-shadow" style={[s.shadow, {height: size * 0.3}, shadow]}>
        <Svg width="100%" height="100%" viewBox="0 0 100 30">
          <Defs><RadialGradient id="residentGround"><Stop offset="0" stopColor="#34251A" stopOpacity="0.52"/><Stop offset="0.45" stopColor="#493525" stopOpacity="0.22"/><Stop offset="1" stopColor="#493525" stopOpacity="0"/></RadialGradient></Defs>
          <Ellipse cx="57" cy="17" rx="42" ry="10" fill="url(#residentGround)"/>
          <Ellipse cx="50" cy="12" rx="26" ry="4" fill="url(#residentGround)"/>
        </Svg>
      </Animated.View>
      <Animated.View pointerEvents="none" style={perspective}>
        <Animated.View testID="resident-body" style={body}>
          {p.effect && <Image source={{uri: p.effect.uri}} resizeMode="contain" style={{position: 'absolute', width: size * p.effect.scale * 1.3, height: size * p.effect.scale * 1.3, left: -size * 0.15 + p.effect.x, top: -size * 0.15 + p.effect.y}}/>}
          {hasResidentVolume(p.stage)?<VolumeResident stage={p.stage} size={size} rx={rx} ry={ry} rz={rz} blink={blink} mood={mood} night={p.period==='night'} mealProgress={pose==='eating'?mealProgress:undefined}/>:<StaticMascot stage={p.stage} mood={mood} size={size}/>}
          {!volumetric&&<View style={[StyleSheet.absoluteFill, {opacity: p.period === 'night' ? 0.18 : 0.13}]} >
            <StaticMascot stage={p.stage} mood={mood} size={size} tintColor={p.period === 'night' ? '#717CAB' : '#DFB878'}/>
          </View>}
          {p.wear && <Image source={{uri: p.wear.uri}} resizeMode="contain" style={{position: 'absolute', ...roomWearableFrame(p.wear.id, getCharacter(p.stage).key, size, p.wear)}}/>}
        </Animated.View>
        {food&&pose==='eating'&&<ResidentMeal food={food} size={size} progress={mealProgress}/>}
      </Animated.View>
    </Animated.View>
  </GestureDetector>;
}
const s = StyleSheet.create({root: {position: 'absolute', left: 0, top: 0}, shadow: {position: 'absolute', width: '100%', left: 0, bottom: '-8%'}});
