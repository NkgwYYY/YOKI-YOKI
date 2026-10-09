import React,{useEffect,useRef} from 'react';
import {Pressable} from 'react-native';
import Animated,{runOnJS,useAnimatedReaction,useAnimatedStyle,useFrameCallback,useSharedValue,type SharedValue} from 'react-native-reanimated';
import {sweptSpots,type CleaningTool} from '@/utils/housekeeping';
import {robotStep} from '@/utils/robotMotion';
import {CleaningToolArt} from './CleaningToolArt';

export function RobotCleaner({width,height,active,reduceMotion,riding,footX,footY,onRide,onClean}:{width:number;height:number;active:boolean;reduceMotion:boolean;riding:boolean;footX:SharedValue<number>;footY:SharedValue<number>;onRide:(x:number,y:number)=>void;onClean:(ids:number[],tool:CleaningTool)=>void}){
 const x=useSharedValue(.43),y=useSharedValue(.54),tick=useSharedValue(0),target=useSharedValue(0);
 const last=useRef({x:.43,y:.54});
 const sweep=(px:number,py:number)=>{const point={x:px,y:py};onClean(sweptSpots(last.current,point,'robot'),'robot');last.current=point;};
 const motion=useFrameCallback(frame=>{
   'worklet';
   if(!active)return;
   const next=robotStep(x.value,y.value,target.value,(frame.timeSincePreviousFrame??16.67)/1000,height/width,reduceMotion);
   x.value=next.x;y.value=next.y;target.value=next.target;
   // The cleaner owns the trip. Boarding never pauses or reverses that ownership.
   if(riding){footX.value=next.x;footY.value=next.y;}
 },false);
 useEffect(()=>{motion.setActive(active);return()=>motion.setActive(false);},[active,motion]);
 useAnimatedReaction(()=>({x:x.value,y:y.value}),point=>{
   if(active&&Date.now()-tick.value>300){tick.value=Date.now();runOnJS(sweep)(point.x,point.y);}
 },[active,sweep]);
 const style=useAnimatedStyle(()=>({zIndex:Math.round(y.value*1000)-1,transform:[{translateX:x.value*width-width*.08},{translateY:y.value*height-width*.09}]}));
 return <Animated.View testID="room-robot" style={[{position:'absolute',width:width*.16,height:width*.16},style]}>
   <Pressable testID="room-robot-board" accessibilityRole="button" accessibilityLabel={riding?'ロボット掃除機に乗って移動中':'ロボット掃除機に乗る'} disabled={!active||riding} onPress={()=>onRide(x.value,y.value)}><CleaningToolArt tool="robot" size={width*.16}/></Pressable>
 </Animated.View>;
}
