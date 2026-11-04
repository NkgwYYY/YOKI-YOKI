import {CostumeSurface} from './CostumeSurface';
import type {CostumeId} from '@/utils/costumeGeometry';
import React,{useId} from 'react';
import Svg,{Defs,Path,RadialGradient,Stop} from 'react-native-svg';
import Animated,{useAnimatedProps,useDerivedValue,type SharedValue} from 'react-native-reanimated';
import {projectEgg} from '@/utils/residentVolume';
import {CigaretteFeatures} from './CigaretteFeatures';
import {mealSample} from '@/utils/residentMeal';
import type {MascotMood} from '@/utils/mascotUtils';
const APath=Animated.createAnimatedComponent(Path);
type Projection=ReturnType<typeof projectEgg>;
function Feature({projection,part,fill,stroke,width}: {projection:SharedValue<Projection>;part:Exclude<keyof Projection,'facing'>;fill:string;stroke?:string;width?:number}) {
  const props=useAnimatedProps(()=>({d:projection.value[part]||'M 0 0',opacity:projection.value[part]?1:0}));
  return <APath animatedProps={props} fill={fill} stroke={stroke} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round"/>;
}
/** The original egg's rounded silhouette, crack, eyes and blush, modeled in 3D.
 * Other evolved art keeps its original renderer until a matching model exists. */
export function VolumeEgg({costume,size,rx,ry,rz,blink,mood,night=false,mealProgress,smoking=false,active=true,reduceMotion=false}: {costume?:CostumeId|null;size:number;rx:SharedValue<number>;ry:SharedValue<number>;rz:SharedValue<number>;blink:SharedValue<number>;mood:MascotMood;night?:boolean;mealProgress?:SharedValue<number>;smoking?:boolean;active?:boolean;reduceMotion?:boolean}) {
  const id=useId().replace(/[^a-zA-Z0-9]/g,'');
  const projection=useDerivedValue(()=>{const meal=mealSample(mealProgress?.value??0);return projectEgg(rx.value,ry.value,rz.value,blink.value,mood==='happy'||mood==='excited',mood==='sleepy',meal.open,meal.chew,smoking);});
  return <Svg testID="resident-volume" width={size} height={size} viewBox="0 0 100 100" accessible={false}>
    <Defs>
      {/* Standard SVG radius and bounding-box coordinates have the same meaning
          in Web SVG and iOS. Use the standard radius on both renderers. */}
      <RadialGradient id={`${id}shell`} gradientUnits="objectBoundingBox" cx="32%" cy="24%" fx="32%" fy="24%" r="82%"><Stop offset="0" stopColor={night?'#F8F7EF':'#FFFFF8'}/><Stop offset={0.48} stopColor={night?'#ECEEEA':'#F8F7EF'}/><Stop offset={0.78} stopColor={night?'#DBE2E4':'#E9E9DE'}/><Stop offset="1" stopColor={night?'#C3CFD6':'#D2D4C7'}/></RadialGradient>
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
    <Feature projection={projection} part="openMouth" fill="#61433D" stroke="#332A24" width={.6}/>
    {smoking&&<CigaretteFeatures projection={projection} active={active} reduceMotion={reduceMotion}/>}
    {costume&&<CostumeSurface stage="egg" costume={costume} rx={rx} ry={ry} rz={rz} night={night}/>}
  </Svg>;
}
