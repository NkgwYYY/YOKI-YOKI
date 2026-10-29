import React,{useEffect,useRef} from 'react';
import {Animated,Easing,StyleSheet,Text,View} from 'react-native';
import Svg,{Path} from 'react-native-svg';
import {useReducedMotion} from '@/utils/useReducedMotion';
import wordmark from '@/assets/brand/wordmark.json';

/** Vector lettering is available before fonts or character assets finish loading. */
export function PlushLoading({message='読み込み中…'}:{message?:string}){
 const motion=useRef(new Animated.Value(0)).current,reduceMotion=useReducedMotion();
 useEffect(()=>{motion.setValue(0);if(reduceMotion)return;const loop=Animated.loop(Animated.timing(motion,{toValue:1,duration:1800,easing:Easing.linear,useNativeDriver:true}));loop.start();return()=>loop.stop();},[reduceMotion,motion]);
 return <View testID="plush-loading" style={s.wrap} accessibilityLiveRegion="polite">
  <View style={s.brand} accessible accessibilityLabel="YOKIYOKI">
   <Svg testID="brand-wordmark" width="100%" height="64" viewBox={wordmark.viewBox} accessible={false}>{wordmark.paths.map((d,i)=><Path key={i} d={d} fill="none" stroke="#F4EAFF" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round"/>)}</Svg>
  </View>
  <View style={s.track}><Animated.View style={[s.line,reduceMotion?{width:90,transform:[{translateX:30}]}:{transform:[{translateX:motion.interpolate({inputRange:[0,1],outputRange:[-52,152]})}]}]}/></View>
  <Text style={s.message}>{message}</Text>
 </View>;
}
const s=StyleSheet.create({wrap:{width:'100%',alignItems:'center',padding:32,gap:24},brand:{width:'100%',maxWidth:310,marginBottom:20},track:{width:152,height:2,backgroundColor:'#70538F66',overflow:'hidden',borderRadius:2},line:{width:52,height:2,backgroundColor:'#D7BAF7'},message:{fontSize:12,lineHeight:20,letterSpacing:1,color:'#C2ACD6',textAlign:'center'}});
