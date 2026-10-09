import React from 'react';
import Svg,{Path,Ellipse} from 'react-native-svg';
import Animated,{useAnimatedProps,useAnimatedStyle,useDerivedValue,type SharedValue} from 'react-native-reanimated';
import type {WorldBowlingMotion} from './useWorldBowling';
import {projectLane} from '@/utils/bowling';
import {PIN_COLORS,pinMeshPaths} from '@/utils/bowlingVolume';
const AnimatedPath=Animated.createAnimatedComponent(Path);
const AnimatedEllipse=Animated.createAnimatedComponent(Ellipse);
function Shade({paths,tone}:{paths:SharedValue<string[]>;tone:number}){
 const props=useAnimatedProps(()=>({d:paths.value[tone]||''}));
 return <AnimatedPath animatedProps={props} fill={PIN_COLORS[tone]} stroke={PIN_COLORS[tone]} strokeWidth={.28} strokeLinejoin="round"/>;
}
function WorldPin({motion,id,width,height}:{motion:WorldBowlingMotion;id:number;width:number;height:number}){
 const pose=useDerivedValue(()=>motion.frames.value[Math.min(motion.index.value,motion.frames.value.length-1)]?.pins[id]);
 const paths=useDerivedValue(()=>{const p=pose.value;return !p||p.hidden?[]:pinMeshPaths(p.x,p.y,p.rotation,width,height);});
 const shadow=useAnimatedProps(()=>{
  const pin=pose.value,p=projectLane(pin?.x??0,pin?.y??10),fall=(pin?.rotation??0)/90;
  return {cx:p.x*width+width*.025*p.scale,cy:p.y*height+2,rx:width*(.052+fall*.1)*p.scale,ry:width*.014*p.scale,opacity:pin?.hidden?0:.32};
 });
 const style=useAnimatedStyle(()=>({opacity:pose.value?.hidden?0:1,zIndex:Math.round(2000-(pose.value?.y??12)*50)}));
 return <Animated.View testID={`world-bowling-pin-${id}`} pointerEvents="none" style={[{position:'absolute',width,height},style]}>
  <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
   <AnimatedEllipse animatedProps={shadow} fill="#1B1020"/>
   {PIN_COLORS.map((_,tone)=><Shade key={tone} paths={paths} tone={tone}/>)}
  </Svg>
 </Animated.View>;
}
export function WorldBowlingPins({motion,width,height}:{motion:WorldBowlingMotion;width:number;height:number}){
 return <>{Array.from({length:10},(_,id)=><WorldPin key={id} id={id} motion={motion} width={width} height={height}/>)}</>;
}
