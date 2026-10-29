import React,{useEffect,useId} from 'react';
import {StyleSheet,View} from 'react-native';
import Animated,{cancelAnimation,useAnimatedStyle,useSharedValue,withRepeat,withTiming} from 'react-native-reanimated';
import Svg,{Circle,Defs,LinearGradient,Path,Rect,Stop} from 'react-native-svg';
import type {MascotStage} from '@/utils/mascotUtils';
import {VillageResident} from './VillageActors';
type Props={stage:MascotStage;width:number;height:number;active:boolean;reduceMotion:boolean;x?:number;y?:number;relativeSize?:number;pace?:number;testID?:string};
export function SmokingResident({stage,width,height,active,reduceMotion,x=.60,y=.59,relativeSize=.20,pace=3800,testID='tobacco-smoking-scene'}:Props) {
  const size=width*relativeSize,drift=useSharedValue(0),id=useId().replace(/[^a-zA-Z0-9]/g,'');
  useEffect(()=>{if(active&&!reduceMotion)drift.value=withRepeat(withTiming(1,{duration:pace}),-1,false);else drift.value=0;return()=>cancelAnimation(drift);},[active,reduceMotion,pace]);
  const smoke=useAnimatedStyle(()=>({opacity:reduceMotion?.45:Math.sin(Math.PI*drift.value)*.75,transform:[{translateY:-drift.value*size*.22},{translateX:drift.value*size*.09},{scale:1+drift.value*.22}]}));
  return <View testID={testID} pointerEvents="none" style={{position:'absolute',left:width*x-size/2,top:height*y-size*.91,width:size,height:size,zIndex:Math.round(y*1000)}}>
    <View style={{position:'absolute',left:'19%',right:'19%',top:'87%',height:'8%',borderRadius:100,backgroundColor:'#20182866'}}/>
    <VillageResident stage={stage} size={size} active={active} reduceMotion={reduceMotion}/>
    <Svg width={size} height={size} viewBox="0 0 100 100" style={StyleSheet.absoluteFill}>
      <Defs><LinearGradient id={`${id}paper`} x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#FFFEF6"/><Stop offset="1" stopColor="#D5C8B2"/></LinearGradient><LinearGradient id={`${id}filter`} x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#F0C381"/><Stop offset="1" stopColor="#B78658"/></LinearGradient></Defs>
      <Rect x="58" y="60" width="24" height="5" rx="2.5" fill={`url(#${id}paper)`} stroke="#C1A994" strokeWidth=".5"/>
      <Rect x="58" y="60" width="7" height="5" rx="2" fill={`url(#${id}filter)`}/>
      <Circle cx="81" cy="62.5" r="3.2" fill="#F4AF7640"/><Rect x="80" y="60.4" width="2.2" height="4.2" rx="1" fill="#D48A6E"/>
    </Svg>
    <Animated.View style={[StyleSheet.absoluteFill,smoke]}><Svg width={size} height={size} viewBox="0 0 100 100">
      <Path d="M81 57 C94 45 74 43 84 30 C92 20 82 14 87 5" fill="none" stroke="#F9EFE8" strokeWidth="5" strokeOpacity=".25" strokeLinecap="round"/>
      <Path d="M81 57 C90 46 73 41 82 29 C91 17 78 11 84 2" fill="none" stroke="#FFF8F0" strokeWidth="2.2" strokeLinecap="round"/>
      <Path d="M85 46 C96 35 86 28 93 21 M79 28 C68 20 77 12 72 6" fill="none" stroke="#FFF8F0" strokeWidth="1.4" strokeOpacity=".55" strokeLinecap="round"/>
    </Svg></Animated.View>
  </View>;
}
