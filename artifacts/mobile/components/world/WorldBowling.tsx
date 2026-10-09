import React from 'react';
import Svg,{Defs,LinearGradient,Stop,Path,Ellipse} from 'react-native-svg';
import Animated,{useAnimatedStyle} from 'react-native-reanimated';
import type {WorldBowlingMotion} from './useWorldBowling';
import {projectLane} from '@/utils/bowling';

/** White lacquer, red neck bands and a grounded base; deliberately no faces. */
export function BowlingPinArt({id}:{id:number}){
 return <Svg width="100%" height="100%" viewBox="0 0 40 110">
  <Defs><LinearGradient id={`pin-${id}`} x1="0" y1="0" x2="1" y2="0"><Stop stopColor="#AEB5BF"/><Stop offset=".27" stopColor="#FAFDFF"/><Stop offset=".5" stopColor="#FFF"/><Stop offset=".78" stopColor="#E9ECED"/><Stop offset="1" stopColor="#87949E"/></LinearGradient></Defs>
  <Ellipse cx="21" cy="104" rx="18" ry="4" fill="#242C32" opacity=".28"/>
  <Path d="M20 5 C7 5 9 23 14 30 C18 37 14 44 10 52 C-1 74 2 96 9 101 Q20 106 31 101 C38 96 41 74 30 52 C26 44 22 37 26 30 C31 23 33 5 20 5Z" fill={`url(#pin-${id})`} stroke="#A3ADB4" strokeWidth=".7"/>
  <Path d="M14 31 Q20 33 26 31 L25 36 Q20 38 15 36Z M15 40 Q20 42 25 40 L27 46 Q20 48 13 46Z" fill="#BA2535"/>
  <Path d="M12 60 Q5 79 10 94" stroke="#FFF" strokeWidth="3" strokeLinecap="round" opacity=".7" fill="none"/>
 </Svg>;
}
function WorldPin({motion,id,width,height}:{motion:WorldBowlingMotion;id:number;width:number;height:number}){
 const size=Math.min(width*.087,height*.13);
 const style=useAnimatedStyle(()=>{
  const pin=motion.frames.value[Math.min(motion.index.value,motion.frames.value.length-1)]?.pins[id];
  if(!pin||pin.hidden)return {opacity:0};
  const p=projectLane(pin.x,pin.y);
  return {opacity:1,zIndex:Math.round(2000-pin.y*50),transform:[{translateX:p.x*width-size/2},{translateY:p.y*height-size*2.62},{scale:p.scale*1.7},{rotate:`${pin.rotation*(pin.x<0?-1:1)}deg`}]};
 });
 return <Animated.View testID={`world-bowling-pin-${id}`} pointerEvents="none" style={[{position:'absolute',width:size,height:size*2.75,transformOrigin:'50% 95%'},style]}><BowlingPinArt id={id}/></Animated.View>;
}
export function WorldBowlingPins({motion,width,height}:{motion:WorldBowlingMotion;width:number;height:number}){
 return <>{Array.from({length:10},(_,id)=><WorldPin key={id} id={id} motion={motion} width={width} height={height}/>)}</>;
}
