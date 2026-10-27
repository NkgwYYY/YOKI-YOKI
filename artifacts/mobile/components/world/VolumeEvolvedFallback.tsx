import React,{useId} from 'react';
import Svg,{ClipPath,Defs,G,Image,Path,Pattern,RadialGradient,LinearGradient,Stop} from 'react-native-svg';
import Animated,{useAnimatedProps,useDerivedValue,type SharedValue} from 'react-native-reanimated';
import {projectOdango,projectEvolved} from '@/utils/evolvedVolume';
import {CigaretteFeatures} from './CigaretteFeatures';
import {mealSample} from '@/utils/residentMeal';
import type {MascotMood} from '@/utils/mascotUtils';
import {ODANGO_COAT_URI} from '@/utils/odangoCoat';
const APath=Animated.createAnimatedComponent(Path);
export type VolumeEvolvedProps={size:number;rx:SharedValue<number>;ry:SharedValue<number>;rz:SharedValue<number>;blink:SharedValue<number>;mood:MascotMood;night?:boolean;mealProgress?:SharedValue<number>;smoking?:boolean;active?:boolean;reduceMotion?:boolean;stage:'odango'|'stage3'|'stage4'};
type Projection=ReturnType<typeof projectOdango>;
function Feature({projection,part,fill,stroke,width,opacity=1}: {projection:SharedValue<Projection>;part:keyof Projection;fill:string;stroke?:string;width?:number;opacity?:number}) {
  const props=useAnimatedProps(()=>({d:projection.value[part]||'M 0 0',opacity:projection.value[part]?opacity:0}));
  return <APath animatedProps={props} fill={fill} stroke={stroke} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round"/>;
}
/** Broad, furry odango, with face attached to its surface rather than a billboard. */
export function VolumeEvolvedFallback({stage,size,rx,ry,rz,blink,mood,night=false,mealProgress,smoking=false,active=true,reduceMotion=false}: VolumeEvolvedProps) {
  const id=useId().replace(/[^a-zA-Z0-9]/g,'');
  const projection=useDerivedValue(()=>{const meal=mealSample(mealProgress?.value??0);return projectEvolved(stage,rx.value,ry.value,rz.value,blink.value,mood==='happy'||mood==='excited',mood==='sleepy',meal.open,meal.chew,smoking);});
  return <Svg testID={`resident-volume-${stage}-fallback`} width={size} height={size} viewBox="0 0 100 100" accessible={false}>
    <Defs>
      <LinearGradient id={`${id}rainbow`} x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#FFD4DD"/><Stop offset=".28" stopColor="#FFF0AC"/><Stop offset=".52" stopColor="#CAE9C4"/><Stop offset=".75" stopColor="#BDCFE8"/><Stop offset="1" stopColor="#D6B4DC"/></LinearGradient>
      <RadialGradient id={`${id}fur`} gradientUnits="userSpaceOnUse" cx="42" cy="38" rx="59" ry="57"><Stop offset="0" stopColor={night?'#F3F5F6':'#FFFFFC'}/><Stop offset=".58" stopColor={night?'#E3E8EB':'#F3F3EF'}/><Stop offset="1" stopColor={night?'#C1C6D4':'#E2D8E2'}/></RadialGradient>
      <RadialGradient id={`${id}cheek`}><Stop offset="0" stopColor="#E6BAB5" stopOpacity=".65"/><Stop offset="1" stopColor="#E6BAB5" stopOpacity="0"/></RadialGradient>
      <RadialGradient id={`${id}eye`}><Stop offset="0" stopColor="#282C27"/><Stop offset="1" stopColor="#0E120E"/></RadialGradient>
      <RadialGradient id={`${id}sclera`}><Stop offset="0" stopColor="#FFFFF7"/><Stop offset=".72" stopColor="#EEEFE6"/><Stop offset="1" stopColor="#B8C0B5"/></RadialGradient>
      <ClipPath id={`${id}coat`}><Feature projection={projection} part="furHalo" fill="#FFFFFF"/></ClipPath>
      <Pattern id={`${id}texture`} patternUnits="userSpaceOnUse" width="100" height="100">
        {/* Enlarge the opaque centre past the model's edge; the source's circular outline stays outside. */}
        <Image href={ODANGO_COAT_URI} x="-30" y="-30" width="160" height="160" preserveAspectRatio="none"/>
      </Pattern>
    </Defs>
    {/* One continuous coat. Its tiny embedded texture has no independent download or visible inner edge. */}
    <Feature projection={projection} part="furHalo" fill={`url(#${id}${stage==='stage4'?'rainbow':'fur'})`}/>
    <Feature projection={projection} part="furHalo" fill={`url(#${id}texture)`} opacity={stage==='stage4'?.22:.48}/>
    <G clipPath={`url(#${id}coat)`}>
      <Feature projection={projection} part="furShade" fill="none" stroke={night?'#B7C0C5':'#C0C1B8'} width={.18} opacity={.12}/>
      <Feature projection={projection} part="furMid" fill="none" stroke="#E0E1D8" width={.22} opacity={.18}/>
      <Feature projection={projection} part="furLight" fill="none" stroke="#FFFFFF" width={.26} opacity={.30}/>
    </G>
    <Feature projection={projection} part="leftCheek" fill={`url(#${id}cheek)`}/><Feature projection={projection} part="rightCheek" fill={`url(#${id}cheek)`}/>
    <Feature projection={projection} part="leftSocket" fill={`url(#${id}sclera)`}/><Feature projection={projection} part="rightSocket" fill={`url(#${id}sclera)`}/>
    <Feature projection={projection} part="leftEye" fill={`url(#${id}eye)`}/><Feature projection={projection} part="rightEye" fill={`url(#${id}eye)`}/>
    <Feature projection={projection} part="leftShine" fill="#FFFFFF"/><Feature projection={projection} part="rightShine" fill="#FFFFFF"/>
    <Feature projection={projection} part="mouth" fill="none" stroke="#6B535C" width={1.15}/>
    <Feature projection={projection} part="openMouth" fill="#61433D" stroke="#332A24" width={.6}/>
    {stage!=='odango'&&<><Feature projection={projection} part="stem" fill="none" stroke="#8AB449" width={1.5}/><Feature projection={projection} part="leftLeaf" fill="#ABC986" stroke="#91B273" width={.5}/><Feature projection={projection} part="rightLeaf" fill="#BED69A" stroke="#91B273" width={.5}/></>}
    {smoking&&<CigaretteFeatures projection={projection} active={active} reduceMotion={reduceMotion}/>}
  </Svg>;
}
