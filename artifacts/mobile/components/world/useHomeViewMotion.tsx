import React, {useEffect, useRef, useState} from 'react';
import {Image, StyleSheet, View, type ImageSourcePropType} from 'react-native';
import Animated, {cancelAnimation, Easing, runOnJS, useAnimatedStyle, useSharedValue, withTiming, type SharedValue} from 'react-native-reanimated';

type Frame = {width:number;height:number;left:number;top:number};
type Anchor = {x:number;y:number;size:number};
export type HomeViewFlight = {progress:SharedValue<number>;from:Anchor;to:Anchor};
export type HomeViewShot = {
  source:ImageSourcePropType;frame:Frame;
  zoom:number;panX:number;panY:number;
};
type Move = {
  from:HomeViewShot;fromResident:Anchor;toResident:Anchor;
  residentOffset:{x:number;y:number};width:number;height:number;closer:boolean;
};
const DURATION = 760;

/** Move within HOME without the map-travel curtain or a second resident owner. */
export function useHomeViewMotion(enabled:boolean, reduceMotion:boolean, onError:()=>void, layoutKey:string) {
  const progress=useSharedValue(1);
  const [move,setMove]=useState<Move|null>(null);
  const [busy,setBusy]=useState(false);
  const locked=useRef(false),generation=useRef(0),mounted=useRef(true);
  const timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
  const finish=(id:number)=>{
    if(!mounted.current||id!==generation.current)return;
    clearTimeout(timer.current);cancelAnimation(progress);progress.value=1;
    locked.current=false;setMove(null);setBusy(false);
  };
  useEffect(()=>{
    generation.current++;finish(generation.current);
  },[enabled,layoutKey]);
  useEffect(()=>{mounted.current=true;return()=>{
    mounted.current=false;generation.current++;clearTimeout(timer.current);cancelAnimation(progress);
  };},[]);
  const run=async(prepare:()=>Promise<unknown>,commit:()=>Move)=>{
    if(!enabled||locked.current)return;
    locked.current=true;setBusy(true);
    const id=++generation.current;
    try {
      // Keep the existing room visible until the other illustration is decoded.
      await prepare();
      if(!mounted.current||id!==generation.current)return;
      progress.value=reduceMotion?1:0;
      const next=commit();
      if(reduceMotion){finish(id);return;}
      setMove(next);
      progress.value=withTiming(1,{duration:DURATION,easing:Easing.inOut(Easing.cubic)},done=>{
        if(done)runOnJS(finish)(id);
      });
      // A backgrounded tab must not leave the controls locked if a frame is lost.
      timer.current=setTimeout(()=>finish(id),DURATION+350);
    } catch {
      if(mounted.current&&id===generation.current){onError();finish(id);}
    }
  };
  return {busy,move,progress,run};
}

/** Both illustrations stay lit while the camera glides between their perspectives. */
export function HomeViewBackdrop({shot,cameraStyle,motion,onLoad,eyeLevel}: {
  shot:HomeViewShot;cameraStyle:object|false;
  motion:ReturnType<typeof useHomeViewMotion>;onLoad:()=>void;eyeLevel:boolean;
}) {
  const {move,progress}=motion;
  const outgoing=useAnimatedStyle(()=>{
    if(!move)return {transform:[{translateX:0},{translateY:0},{scale:1}]};
    const t=progress.value;
    const ratio=Math.max(.4,Math.min(2.8,move.toResident.size/move.fromResident.size));
    const scale=1+(ratio-1)*t;
    return {transform:[
      {translateX:(move.toResident.x-move.fromResident.x)*t+(move.fromResident.x-move.width/2)*(1-scale)},
      {translateY:(move.toResident.y-move.fromResident.y)*t+(move.fromResident.y-move.height/2)*(1-scale)},
      {scale},
    ]};
  });
  const still=(image:HomeViewShot)=> <>
    <Image source={image.source} resizeMode="cover" style={StyleSheet.absoluteFill} accessible={false}/>
    <Animated.View style={[{position:'absolute',...image.frame}, {transform:[{translateX:image.panX},{translateY:image.panY},{scale:image.zoom}]}]}>
      <Image source={image.source} resizeMode="stretch" style={StyleSheet.absoluteFill} accessible={false}/>
    </Animated.View>
  </>;
  return <>
    {/* Full-cover base prevents an exposed edge when the outgoing camera pulls back. */}
    <View pointerEvents="none" style={StyleSheet.absoluteFill}><Image source={move?.from.source??shot.source} resizeMode="cover" style={StyleSheet.absoluteFill} accessible={false}/></View>
    {move&&<Animated.View testID="home-camera-outgoing" pointerEvents="none" style={[StyleSheet.absoluteFill,outgoing]}>{still(move.from)}</Animated.View>}
    <HomeViewIncoming key={eyeLevel?'eye':'overview'} shot={shot} cameraStyle={cameraStyle} move={move} progress={progress} onLoad={onLoad}/>
  </>;
}

// A fresh background layer computes its initial opacity before the new artwork
// paints. Reusing the previous layer's animated style would flash the target
// illustration for one frame before the animation mapper catches up.
function HomeViewIncoming({shot,cameraStyle,move,progress,onLoad}: {
  shot:HomeViewShot;cameraStyle:object|false;move:Move|null;progress:SharedValue<number>;onLoad:()=>void;
}) {
  const incoming=useAnimatedStyle(()=>{
    if(!move)return {opacity:1,transform:[{translateY:0},{scale:1}]};
    const remaining=1-progress.value;
    return {opacity:progress.value,transform:[
      {translateY:remaining*move.height*(move.closer?.045:-.035)},
      {scale:1+remaining*(move.closer?-.09:.08)},
    ]};
  });
  return <Animated.View testID="home-camera-background" pointerEvents="none" style={[StyleSheet.absoluteFill,incoming]}>
      <Image source={shot.source} resizeMode="cover" style={StyleSheet.absoluteFill} accessible={false}/>
      <Animated.View style={[{position:'absolute',...shot.frame},cameraStyle]}>
        <Image source={shot.source} onLoad={onLoad} resizeMode="stretch" style={StyleSheet.absoluteFill} accessible={false}/>
      </Animated.View>
    </Animated.View>;
}
