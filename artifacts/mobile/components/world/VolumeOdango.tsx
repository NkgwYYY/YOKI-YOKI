import React,{useId} from 'react';
import Svg,{Defs,Path,RadialGradient,Stop,Pattern,Image} from 'react-native-svg';
import Animated,{useAnimatedProps,useDerivedValue,type SharedValue} from 'react-native-reanimated';
import {projectOdango} from '@/utils/evolvedVolume';
import type {MascotMood} from '@/utils/mascotUtils';
const APath=Animated.createAnimatedComponent(Path);
type Projection=ReturnType<typeof projectOdango>;
function Feature({projection,part,fill,stroke,width,opacity=1}: {projection:SharedValue<Projection>;part:keyof Projection;fill:string;stroke?:string;width?:number;opacity?:number}) {
  const props=useAnimatedProps(()=>({d:projection.value[part]||'M 0 0',opacity:projection.value[part]?opacity:0}));
  return <APath animatedProps={props} fill={fill} stroke={stroke} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round"/>;
}
/** Broad, furry odango, with face attached to its surface rather than a billboard. */
export function VolumeOdango({size,rx,ry,rz,blink,mood,night=false}: {size:number;rx:SharedValue<number>;ry:SharedValue<number>;rz:SharedValue<number>;blink:SharedValue<number>;mood:MascotMood;night?:boolean}) {
  const id=useId().replace(/[^a-zA-Z0-9]/g,'');
  const projection=useDerivedValue(()=>projectOdango(rx.value,ry.value,rz.value,blink.value,mood==='happy'||mood==='excited',mood==='sleepy'));
  return <Svg testID="resident-volume-odango" width={size} height={size} viewBox="0 0 100 100" accessible={false}>
    <Defs>
      <RadialGradient id={`${id}fur`} gradientUnits="userSpaceOnUse" cx="42" cy="38" rx="59" ry="57"><Stop offset="0" stopColor={night?'#F3F5F6':'#FFFFFC'}/><Stop offset=".58" stopColor={night?'#E3E8EB':'#F3F3EF'}/><Stop offset="1" stopColor={night?'#AAB6C2':'#C7C9C3'}/></RadialGradient>
      <RadialGradient id={`${id}cheek`}><Stop offset="0" stopColor="#E6BAB5" stopOpacity=".65"/><Stop offset="1" stopColor="#E6BAB5" stopOpacity="0"/></RadialGradient>
      <RadialGradient id={`${id}eye`}><Stop offset="0" stopColor="#282C27"/><Stop offset="1" stopColor="#0E120E"/></RadialGradient>
      <Pattern id={`${id}texture`} patternUnits="userSpaceOnUse" width="100" height="100">
        {/* Reuse only the face-free forehead fur from the original. No new
            bitmap or face-painted rear texture is introduced. */}
        <Svg width="100" height="100" viewBox="170 75 170 125" preserveAspectRatio="none">
          <Image href={require('../../assets/images/characters/odango.png')} width="512" height="512"/>
        </Svg>
      </Pattern>
    </Defs>
    <Feature projection={projection} part="body" fill={`url(#${id}fur)`}/>
    <Feature projection={projection} part="body" fill={`url(#${id}texture)`} opacity={.5}/>
    <Feature projection={projection} part="furShade" fill="none" stroke={night?'#ADB8BD':'#C2C5BD'} width={.28} opacity={.4}/>
    <Feature projection={projection} part="furMid" fill="none" stroke="#E0E2DA" width={.42} opacity={.65}/>
    <Feature projection={projection} part="furLight" fill="none" stroke="#FFFFFF" width={.52} opacity={.9}/>
    <Feature projection={projection} part="leftCheek" fill={`url(#${id}cheek)`}/><Feature projection={projection} part="rightCheek" fill={`url(#${id}cheek)`}/>
    <Feature projection={projection} part="leftSocket" fill="#BABDB2" opacity={.55}/><Feature projection={projection} part="rightSocket" fill="#BABDB2" opacity={.55}/>
    <Feature projection={projection} part="leftEye" fill={`url(#${id}eye)`}/><Feature projection={projection} part="rightEye" fill={`url(#${id}eye)`}/>
    <Feature projection={projection} part="leftShine" fill="#FFFFFF"/><Feature projection={projection} part="rightShine" fill="#FFFFFF"/>
    <Feature projection={projection} part="mouth" fill="none" stroke="#22271F" width={1.8}/>
  </Svg>;
}
