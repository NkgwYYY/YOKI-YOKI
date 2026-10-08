import React,{useEffect,useRef} from 'react';
import {Pressable} from 'react-native';
import Animated,{cancelAnimation,Easing,runOnJS,useAnimatedReaction,useAnimatedStyle,useSharedValue,withTiming,type SharedValue} from 'react-native-reanimated';
import {DUST_SPOTS,sweptSpots,type CleaningTool} from '@/utils/housekeeping';
import {CleaningToolArt} from './CleaningToolArt';

export function RobotCleaner({width,height,active,reduceMotion,riding,footX,footY,onRide,onClean}:{width:number;height:number;active:boolean;reduceMotion:boolean;riding:boolean;footX:SharedValue<number>;footY:SharedValue<number>;onRide:(x:number,y:number)=>void;onClean:(ids:number[],tool:CleaningTool)=>void}){
  const x=useSharedValue(.43),y=useSharedValue(.54),tick=useSharedValue(0),turn=useRef(0);
  const last=useRef({x:.43,y:.54});
  const sweep=(px:number,py:number)=>{const point={x:px,y:py};onClean(sweptSpots(last.current,point,'robot'),'robot');last.current=point;};
  useEffect(()=>{
    if(!active||riding)return;
    const step=()=>{const p=DUST_SPOTS[turn.current++%DUST_SPOTS.length];x.value=withTiming(p.x,{duration:reduceMotion?0:2200,easing:Easing.linear});y.value=withTiming(p.y,{duration:reduceMotion?0:2200,easing:Easing.linear});};
    step();const clock=setInterval(step,2400);
    return()=>{clearInterval(clock);cancelAnimation(x);cancelAnimation(y);};
  },[active,riding,reduceMotion]);
  useAnimatedReaction(()=>({x:riding?footX.value:x.value,y:riding?footY.value:y.value}),point=>{
    if(riding){x.value=point.x;y.value=point.y;}
    if(active&&Date.now()-tick.value>300){tick.value=Date.now();runOnJS(sweep)(point.x,point.y);}
  },[active,riding,sweep]);
  const style=useAnimatedStyle(()=>({zIndex:Math.round((riding?footY.value:y.value)*1000)-1,transform:[{translateX:(riding?footX.value:x.value)*width-width*.08},{translateY:(riding?footY.value:y.value)*height-width*.09}]}));
  return <Animated.View testID="room-robot" style={[{position:'absolute',width:width*.16,height:width*.16},style]}>
    <Pressable testID="room-robot-board" accessibilityRole="button" accessibilityLabel={riding?'ロボット掃除機に乗っています':'ロボット掃除機に乗る'} disabled={!active||riding} onPress={()=>onRide(x.value,y.value)}><CleaningToolArt tool="robot" size={width*.16}/></Pressable>
  </Animated.View>;
}
