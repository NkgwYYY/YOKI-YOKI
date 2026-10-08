import React,{useEffect} from 'react';
import {StyleSheet,View} from 'react-native';
import Animated,{cancelAnimation,useAnimatedStyle,useSharedValue,withRepeat,withTiming} from 'react-native-reanimated';
import Svg,{Path,Rect} from 'react-native-svg';
import type {MascotStage} from '@/utils/mascotUtils';
import {VillageResident} from './VillageActors';
export function SmokingResident({stage,width,height,active,reduceMotion}:{stage:MascotStage;width:number;height:number;active:boolean;reduceMotion:boolean}) {
  const size=width*.15,drift=useSharedValue(0);
  useEffect(()=>{if(active&&!reduceMotion)drift.value=withRepeat(withTiming(1,{duration:3000}),-1,false);else drift.value=0;return()=>cancelAnimation(drift);},[active,reduceMotion]);
  const smoke=useAnimatedStyle(()=>({opacity:reduceMotion?.4:Math.sin(Math.PI*drift.value)*.6,transform:[{translateY:-drift.value*size*.45},{translateX:drift.value*size*.12}]}));
  return <View testID="tobacco-smoking-scene" pointerEvents="none" style={{position:'absolute',left:width*.68-size/2,top:height*.525-size*.84,width:size,height:size,zIndex:800}}>
    <VillageResident stage={stage} size={size} active={active} reduceMotion={reduceMotion}/>
    <Svg width={size} height={size} viewBox="0 0 100 100" style={StyleSheet.absoluteFill}>
      <Rect x="57" y="58" width="20" height="4" rx="2" fill="#FFF8DE"/><Rect x="74" y="58" width="4" height="4" rx="1" fill="#B58268"/>
    </Svg>
    <Animated.View style={[StyleSheet.absoluteFill,smoke]}><Svg width={size} height={size} viewBox="0 0 100 100"><Path d="M 77 54 C 89 40 68 39 79 26 C 90 13 74 9 81 0" fill="none" stroke="#FFF9EF" strokeWidth="3" strokeLinecap="round"/></Svg></Animated.View>
  </View>;
}
