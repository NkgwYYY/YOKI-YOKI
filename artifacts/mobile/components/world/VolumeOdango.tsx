import React,{useId} from 'react';
import Svg,{ClipPath,Defs,G,Image,Path,Pattern,RadialGradient,Stop} from 'react-native-svg';
import Animated,{useAnimatedProps,useDerivedValue,type SharedValue} from 'react-native-reanimated';
import {projectOdango} from '@/utils/evolvedVolume';
import {mealSample} from '@/utils/residentMeal';
import type {MascotMood} from '@/utils/mascotUtils';
import {ODANGO_COAT_URI} from '@/utils/odangoCoat';
const APath=Animated.createAnimatedComponent(Path);
type Projection=ReturnType<typeof projectOdango>;
function Feature({projection,part,fill,stroke,width,opacity=1}: {projection:SharedValue<Projection>;part:keyof Projection;fill:string;stroke?:string;width?:number;opacity?:number}) {
  const props=useAnimatedProps(()=>({d:projection.value[part]||'M 0 0',opacity:projection.value[part]?opacity:0}));
  return <APath animatedProps={props} fill={fill} stroke={stroke} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round"/>;
}
/** Broad, furry odango, with face attached to its surface rather than a billboard. */
export function VolumeOdango({size,rx,ry,rz,blink,mood,night=false,mealProgress}: {size:number;rx:SharedValue<number>;ry:SharedValue<number>;rz:SharedValue<number>;blink:SharedValue<number>;mood:MascotMood;night?:boolean;mealProgress?:SharedValue<number>}) {
  const id=useId().replace(/[^a-zA-Z0-9]/g,'');
  const projection=useDerivedValue(()=>{const meal=mealSample(mealProgress?.value??0);return projectOdango(rx.value,ry.value,rz.value,blink.value,mood==='happy'||mood==='excited',mood==='sleepy',meal.open,meal.chew);});
  return <Svg testID="resident-volume-odango" width={size} height={size} viewBox="0 0 100 100" accessible={false}>
    <Defs>
      <RadialGradient id={`${id}fur`} gradientUnits="userSpaceOnUse" cx="42" cy="38" rx="59" ry="57"><Stop offset="0" stopColor={night?'#F3F5F6':'#FFFFFC'}/><Stop offset=".58" stopColor={night?'#E3E8EB':'#F3F3EF'}/><Stop offset="1" stopColor={night?'#AAB6C2':'#C7C9C3'}/></RadialGradient>
      <RadialGradient id={`${id}cheek`}><Stop offset="0" stopColor="#E6BAB5" stopOpacity=".65"/><Stop offset="1" stopColor="#E6BAB5" stopOpacity="0"/></RadialGradient>
      <RadialGradient id={`${id}eye`}><Stop offset="0" stopColor="#282C27"/><Stop offset="1" stopColor="#0E120E"/></RadialGradient>
      <ClipPath id={`${id}coat`}><Feature projection={projection} part="furHalo" fill="#FFFFFF"/></ClipPath>
      <Pattern id={`${id}texture`} patternUnits="userSpaceOnUse" width="100" height="100">
        {/* Enlarge the opaque centre past the model's edge; the source's circular outline stays outside. */}
        <Image href={ODANGO_COAT_URI} x="-30" y="-30" width="160" height="160" preserveAspectRatio="none"/>
      </Pattern>
    </Defs>
    {/* One continuous coat. Its tiny embedded texture has no independent download or visible inner edge. */}
    <Feature projection={projection} part="furHalo" fill={`url(#${id}fur)`}/>
    <Feature projection={projection} part="furHalo" fill={`url(#${id}texture)`}/>
    <G clipPath={`url(#${id}coat)`}>
      <Feature projection={projection} part="furShade" fill="none" stroke={night?'#B7C0C5':'#C0C1B8'} width={.18} opacity={.12}/>
      <Feature projection={projection} part="furMid" fill="none" stroke="#E0E1D8" width={.22} opacity={.18}/>
      <Feature projection={projection} part="furLight" fill="none" stroke="#FFFFFF" width={.26} opacity={.30}/>
    </G>
    <Feature projection={projection} part="leftCheek" fill={`url(#${id}cheek)`}/><Feature projection={projection} part="rightCheek" fill={`url(#${id}cheek)`}/>
    <Feature projection={projection} part="leftSocket" fill="#BABDB2" opacity={.55}/><Feature projection={projection} part="rightSocket" fill="#BABDB2" opacity={.55}/>
    <Feature projection={projection} part="leftEye" fill={`url(#${id}eye)`}/><Feature projection={projection} part="rightEye" fill={`url(#${id}eye)`}/>
    <Feature projection={projection} part="leftShine" fill="#FFFFFF"/><Feature projection={projection} part="rightShine" fill="#FFFFFF"/>
    <Feature projection={projection} part="mouth" fill="none" stroke="#22271F" width={1.8}/>
    <Feature projection={projection} part="openMouth" fill="#61433D" stroke="#332A24" width={.6}/>
  </Svg>;
}
