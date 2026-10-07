import React,{useId} from 'react';
import Svg,{Defs,Path,RadialGradient,Stop} from 'react-native-svg';
import Animated,{useAnimatedProps,useDerivedValue,type SharedValue} from 'react-native-reanimated';
import {projectEgg} from '@/utils/residentVolume';
import type {MascotMood} from '@/utils/mascotUtils';
const APath=Animated.createAnimatedComponent(Path);
type Projection=ReturnType<typeof projectEgg>;
function Feature({projection,part,fill,stroke,width}: {projection:SharedValue<Projection>;part:Exclude<keyof Projection,'facing'>;fill:string;stroke?:string;width?:number}) {
  const props=useAnimatedProps(()=>({d:projection.value[part]||'M 0 0',opacity:projection.value[part]?1:0}));
  return <APath animatedProps={props} fill={fill} stroke={stroke} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round"/>;
}
/** The original egg's rounded silhouette, crack, eyes and blush, modeled in 3D.
 * Other evolved art keeps its original renderer until a matching model exists. */
export function VolumeEgg({size,rx,ry,rz,blink,mood,night=false}: {size:number;rx:SharedValue<number>;ry:SharedValue<number>;rz:SharedValue<number>;blink:SharedValue<number>;mood:MascotMood;night?:boolean}) {
  const id=useId().replace(/[^a-zA-Z0-9]/g,'');
  const projection=useDerivedValue(()=>projectEgg(rx.value,ry.value,rz.value,blink.value,mood==='happy'||mood==='excited',mood==='sleepy'));
  return <Svg testID="resident-volume" width={size} height={size} viewBox="0 0 100 100" accessible={false}>
    <Defs>
      <RadialGradient id={`${id}shell`} gradientUnits="userSpaceOnUse" cx="42" cy="40" fx="30" fy="24" rx="53" ry="61"><Stop offset="0" stopColor={night?'#F8F7EF':'#FFFFF8'}/><Stop offset=".42" stopColor={night?'#E9EBE6':'#F4F3E9'}/><Stop offset=".74" stopColor={night?'#CCD4D7':'#DFDFD2'}/><Stop offset="1" stopColor={night?'#A3B1BB':'#B7B9AB'}/></RadialGradient>
    </Defs>
    <Feature projection={projection} part="body" fill={`url(#${id}shell)`} stroke={night?'#DFE7EA':'#F5F5E8'} width={.35}/>
    <Feature projection={projection} part="crack" fill="none" stroke="#A696BF" width={1.8}/>
    <Feature projection={projection} part="leftCheek" fill="#EBC4C1"/>
    <Feature projection={projection} part="rightCheek" fill="#EBC4C1"/>
    <Feature projection={projection} part="leftSocket" fill={night?'#D5DAD5':'#DFE0D4'}/>
    <Feature projection={projection} part="rightSocket" fill={night?'#D5DAD5':'#DFE0D4'}/>
    <Feature projection={projection} part="leftEye" fill="#111811"/>
    <Feature projection={projection} part="rightEye" fill="#111811"/>
    <Feature projection={projection} part="leftShine" fill="#FCFDF1"/>
    <Feature projection={projection} part="rightShine" fill="#FCFDF1"/>
    <Feature projection={projection} part="mouth" fill="none" stroke="#141A13" width={1.7}/>
  </Svg>;
}
