import React from 'react';
import Svg,{Defs,LinearGradient,Stop,Path,Ellipse,Circle,G} from 'react-native-svg';
import Animated,{useAnimatedProps,useAnimatedStyle} from 'react-native-reanimated';
import type {WorldBowlingMotion} from './useWorldBowling';
const AnimatedG=Animated.createAnimatedComponent(G);

function WorldPin({motion,id,width,height}:{motion:WorldBowlingMotion;id:number;width:number;height:number}){
  const size=width*.046;
  const style=useAnimatedStyle(()=>{
    const pin=motion.frames.value[Math.min(motion.index.value,motion.frames.value.length-1)]?.pins[id];
    if(!pin||pin.hidden)return {opacity:0};
    return {opacity:1,zIndex:Math.round(pin.y*1000),transform:[{translateX:pin.x*width-size/2},{translateY:pin.y*height-size*1.7},{rotate:`${pin.rotation*(id%2?-1:1)}deg`}]};
  });
  const calm=useAnimatedProps(()=>{
    const frame=motion.frames.value[Math.min(motion.index.value,motion.frames.value.length-1)],pin=frame?.pins[id];
    return {opacity:!pin||pin.down||(motion.running.value&&Math.hypot(frame.x-pin.x,(frame.y-pin.y)*height/width)<.16)?0:1};
  });
  const surprised=useAnimatedProps(()=>{
    const frame=motion.frames.value[Math.min(motion.index.value,motion.frames.value.length-1)],pin=frame?.pins[id];
    return {opacity:pin&&!pin.down&&motion.running.value&&Math.hypot(frame.x-pin.x,(frame.y-pin.y)*height/width)<.16?1:0};
  });
  const fallen=useAnimatedProps(()=>({opacity:motion.frames.value[Math.min(motion.index.value,motion.frames.value.length-1)]?.pins[id]?.down?1:0}));
  return <Animated.View testID={`world-bowling-pin-${id}`} pointerEvents="none" style={[{position:'absolute',width:size,height:size*1.9},style]}>
    <Svg width="100%" height="100%" viewBox="0 0 40 76">
      <Defs><LinearGradient id={`pinIvory${id}`} x2="1" y2="0"><Stop stopColor="#D7C5B3"/><Stop offset=".4" stopColor="#FFFAE9"/><Stop offset=".62" stopColor="#FFFFFF"/><Stop offset="1" stopColor="#DACFC0"/></LinearGradient></Defs>
      <Ellipse cx="22" cy="70" rx="17" ry="5" fill="#7E6A69" opacity=".25"/>
      <Path d="M15 8 Q10 15 15 27 C19 37 5 42 6 59 Q6 68 20 68 Q34 68 34 59 C35 42 21 37 25 27 Q31 15 25 8Z" fill={`url(#pinIvory${id})`} stroke="#C8B6A2" strokeWidth="1.5"/>
      <Path d="M15 26 H25 M15 31 H25" stroke={['#C97F96','#A795CA','#83A89C'][id%3]} strokeWidth="4"/>
      <Path d="M12 47 Q9 58 13 62" stroke="#FFF" strokeWidth="3" fill="none"/>
      <Ellipse cx="12" cy="54" rx="3" ry="2" fill="#E9AEB2"/><Ellipse cx="28" cy="54" rx="3" ry="2" fill="#E9AEB2"/>
      <AnimatedG animatedProps={calm}>
        <Circle cx="15" cy="49" r="2.1" fill="#493D4E"/><Circle cx="25" cy="49" r="2.1" fill="#493D4E"/>
        <Circle cx="15.6" cy="48.3" r=".6" fill="#FFF"/><Circle cx="25.6" cy="48.3" r=".6" fill="#FFF"/>
        <Path d={id%3===1?'M17 56 L20 58 L23 56':'M16 56 Q20 61 24 56'} stroke="#493D4E" strokeWidth="1.7" strokeLinecap="round" fill="none"/>
      </AnimatedG>
      <AnimatedG animatedProps={surprised}>
        <Ellipse cx="15" cy="49" rx="2" ry="3" fill="#493D4E"/><Ellipse cx="25" cy="49" rx="2" ry="3" fill="#493D4E"/>
        <Ellipse cx="20" cy="57" rx="2.5" ry="3.3" fill="#715260"/>
      </AnimatedG>
      <AnimatedG animatedProps={fallen}>
        <Path d="M13 47 L16 49 L13 51 M27 47 L24 49 L27 51 M16 56 Q20 61 24 56" stroke="#493D4E" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      </AnimatedG>
    </Svg>
  </Animated.View>;
}
export function WorldBowlingPins({motion,width,height}:{motion:WorldBowlingMotion;width:number;height:number}){
  return <>{Array.from({length:10},(_,id)=><WorldPin key={id} id={id} motion={motion} width={width} height={height}/>)}</>;
}
