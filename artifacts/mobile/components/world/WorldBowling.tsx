import React from 'react';
import {StyleSheet,View} from 'react-native';
import Svg,{Defs,LinearGradient,Stop,Path,Ellipse} from 'react-native-svg';
import Animated,{useAnimatedStyle} from 'react-native-reanimated';
import type {WorldBowlingMotion} from './useWorldBowling';

function WorldPin({motion,id,width,height}:{motion:WorldBowlingMotion;id:number;width:number;height:number}){
  const size=width*.027;
  const style=useAnimatedStyle(()=>{
    const pin=motion.frames.value[Math.min(motion.index.value,motion.frames.value.length-1)]?.pins[id];
    if(!pin)return {opacity:0};
    return {zIndex:Math.round(pin.y*1000),transform:[{translateX:pin.x*width-size/2},{translateY:pin.y*height-size*1.7},{rotate:`${pin.rotation*(id%2?-1:1)}deg`}]};
  });
  return <Animated.View testID={`world-bowling-pin-${id}`} pointerEvents="none" style={[{position:'absolute',width:size,height:size*1.9},style]}>
    <Svg width="100%" height="100%" viewBox="0 0 40 76"><Defs><LinearGradient id={`pinIvory${id}`} x2="1" y2="0"><Stop stopColor="#D7C5B3"/><Stop offset=".4" stopColor="#FFFAE9"/><Stop offset=".62" stopColor="#FFFFFF"/><Stop offset="1" stopColor="#DACFC0"/></LinearGradient></Defs><Ellipse cx="22" cy="70" rx="17" ry="5" fill="#7E6A69" opacity=".25"/><Path d="M15 8 Q10 15 15 27 C19 37 5 42 6 59 Q6 68 20 68 Q34 68 34 59 C35 42 21 37 25 27 Q31 15 25 8Z" fill={`url(#pinIvory${id})`} stroke="#C8B6A2" strokeWidth="1.5"/><Path d="M15 26 H25 M15 31 H25" stroke="#C97F96" strokeWidth="4"/><Path d="M12 47 Q9 58 13 62" stroke="#FFF" strokeWidth="3" fill="none"/></Svg>
  </Animated.View>;
}
export function WorldBowlingPins({motion,width,height}:{motion:WorldBowlingMotion;width:number;height:number}){
  return <>{Array.from({length:10},(_,id)=><WorldPin key={id} id={id} motion={motion} width={width} height={height}/>)}</>;
}
