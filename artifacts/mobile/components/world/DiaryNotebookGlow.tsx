import React,{useEffect} from 'react';
import {StyleSheet,View} from 'react-native';
import Animated,{cancelAnimation,Easing,useAnimatedStyle,useSharedValue,withRepeat,withTiming} from 'react-native-reanimated';
import Svg,{Defs,Ellipse,Path,RadialGradient,Stop} from 'react-native-svg';

/** One lightweight animation surrounds the actual notebook, without hiding its art. */
export function DiaryNotebookGlow({active,reduceMotion}:{active:boolean;reduceMotion:boolean}){
 const pulse=useSharedValue(.5);
 useEffect(()=>{
  cancelAnimation(pulse);pulse.value=.5;
  if(active&&!reduceMotion){pulse.value=0;pulse.value=withRepeat(withTiming(1,{duration:1300,easing:Easing.inOut(Easing.sin)}),-1,true);}
  return()=>cancelAnimation(pulse);
 },[active,reduceMotion,pulse]);
 const halo=useAnimatedStyle(()=>({opacity:.45+pulse.value*.45,transform:[{scale:.92+pulse.value*.16}]}));
 const stars=useAnimatedStyle(()=>({opacity:.55+pulse.value*.45,transform:[{translateY:2-pulse.value*5}]}));
 return <View testID="diary-notebook-glow" pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={s.root}>
  <Animated.View style={[StyleSheet.absoluteFill,halo]}>
   <Svg width="112" height="92" viewBox="0 0 112 92"><Defs><RadialGradient id="notebookLight"><Stop offset="0" stopColor="#FFF5C6" stopOpacity=".75"/><Stop offset=".5" stopColor="#FFE294" stopOpacity=".5"/><Stop offset="1" stopColor="#FFE294" stopOpacity="0"/></RadialGradient></Defs><Ellipse cx="56" cy="51" rx="55" ry="35" fill="url(#notebookLight)"/><Ellipse cx="56" cy="52" rx="37" ry="19" fill="none" stroke="#FFF6CF" strokeOpacity=".75" strokeWidth="1.4"/></Svg>
  </Animated.View>
  <Animated.View style={[StyleSheet.absoluteFill,stars]}>
   <Svg width="112" height="92" viewBox="0 0 112 92"><Path d="M25 23 L28 31 L36 34 L28 37 L25 45 L22 37 L14 34 L22 31 Z M81 10 L83 16 L89 18 L83 20 L81 26 L79 20 L73 18 L79 16 Z M93 51 L95 57 L101 59 L95 61 L93 67 L91 61 L85 59 L91 57 Z" fill="#FFF9DE" stroke="#9E78B8" strokeWidth="1.1"/><Ellipse cx="47" cy="12" rx="2.2" ry="2.2" fill="#FFF3BD"/><Ellipse cx="13" cy="60" rx="1.6" ry="1.6" fill="#FFF3BD"/></Svg>
  </Animated.View>
 </View>;
}
const s=StyleSheet.create({root:{position:'absolute',left:-32,top:-33,width:112,height:92}});
