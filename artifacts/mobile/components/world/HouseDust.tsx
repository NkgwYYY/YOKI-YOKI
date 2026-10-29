import React,{useRef} from 'react';
import {StyleSheet,View} from 'react-native';
import Svg,{Ellipse,Path} from 'react-native-svg';
import Animated,{runOnJS,useAnimatedStyle,useSharedValue} from 'react-native-reanimated';
import {Gesture,GestureDetector} from 'react-native-gesture-handler';
import {DUST_SPOTS,sweptSpots,type CleaningTool} from '@/utils/housekeeping';
import {CleaningToolArt} from './CleaningToolArt';

export function HouseDust({width,height,dirt,tool,active,onClean}:{width:number;height:number;dirt:number[];tool:CleaningTool|null;active:boolean;onClean:(ids:number[],tool:CleaningTool)=>void}){
  const last=useRef<{x:number;y:number}|null>(null);
  const x=useSharedValue(0),y=useSharedValue(0),show=useSharedValue(0);
  const brush=useAnimatedStyle(()=>({opacity:show.value,transform:[{translateX:x.value-28},{translateY:y.value-45}]}));
  const begin=(px:number,py:number)=>{last.current={x:px/width,y:py/height};};
  const wipe=(px:number,py:number)=>{
    if(!tool)return;const next={x:px/width,y:py/height},before=last.current;
    if(before&&Math.hypot((next.x-before.x)*width,(next.y-before.y)*height)>2){onClean(sweptSpots(before,next,tool),tool);last.current=next;}
  };
  const gesture=Gesture.Pan().enabled(active&&!!tool).minDistance(3).maxPointers(1)
    .onBegin(e=>{x.value=e.x;y.value=e.y;show.value=1;runOnJS(begin)(e.x,e.y);})
    .onUpdate(e=>{x.value=e.x;y.value=e.y;runOnJS(wipe)(e.x,e.y);})
    .onFinalize(()=>{show.value=0;});
  return <>
    <View pointerEvents="none" style={[StyleSheet.absoluteFill,{zIndex:530}]}>
      {DUST_SPOTS.map((p,i)=>dirt[i]>.005&&<Svg key={i} testID={`room-dust-${i}`} width={width*.072} height={width*.035} viewBox="0 0 100 50" style={{position:'absolute',left:p.x*width-width*.036,top:p.y*height-width*.018,opacity:Math.min(.65,.15+dirt[i]*.5)}}>
        <Ellipse cx="49" cy="29" rx="43" ry="14" fill="#796756"/><Ellipse cx="35" cy="18" rx="22" ry="9" fill="#A3907D"/><Ellipse cx="68" cy="27" rx="24" ry="12" fill="#A3907D"/><Path d="M 15 10 Q 21 1 29 9 M 63 6 Q 70 0 80 8" stroke="#796756" strokeWidth="3" fill="none"/>
      </Svg>)}
    </View>
    {!!tool&&<GestureDetector gesture={gesture} touchAction="none"><View testID="room-cleaning-surface" accessibilityLabel="道具で部屋の床をこすってお掃除" style={[StyleSheet.absoluteFill,{zIndex:950}]}><Animated.View pointerEvents="none" style={[{position:'absolute'},brush]}><CleaningToolArt tool={tool} size={56}/></Animated.View></View></GestureDetector>}
  </>;
}
