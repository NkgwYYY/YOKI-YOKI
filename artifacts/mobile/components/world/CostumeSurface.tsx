import React from 'react';
import {Path} from 'react-native-svg';
import Animated,{useAnimatedProps,useDerivedValue,type SharedValue} from 'react-native-reanimated';
import {projectCostume,COSTUME_LAYER_COUNT,type CostumeForm,type CostumeId} from '@/utils/costumeGeometry';
const APath=Animated.createAnimatedComponent(Path);
function Layer({projection,index}:{projection:SharedValue<ReturnType<typeof projectCostume>>;index:number}){
 const fur=useAnimatedProps(()=>({d:projection.value[index].fur||'M0 0'}));
 const props=useAnimatedProps(()=>({d:projection.value[index].d||'M0 0',fill:projection.value[index].fill,stroke:projection.value[index].fill}));
 return <><APath animatedProps={props} strokeWidth={.22} strokeLinejoin="round"/><APath animatedProps={fur} fill="none" stroke="#FFFAF0" strokeOpacity={.20} strokeWidth={.20} strokeLinecap="round"/></>;
}
export function CostumeSurface({stage,costume,rx,ry,rz,night=false}:{stage:CostumeForm;costume:CostumeId;rx:SharedValue<number>;ry:SharedValue<number>;rz:SharedValue<number>;night?:boolean}){
 const projection=useDerivedValue(()=>projectCostume(stage,costume,rx.value,ry.value,rz.value,night));
 return <>{Array.from({length:COSTUME_LAYER_COUNT},(_,i)=><Layer key={i} index={i} projection={projection}/>)}</>;
}
