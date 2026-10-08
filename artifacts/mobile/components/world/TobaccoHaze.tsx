import React,{useEffect,useRef} from 'react';
import {Animated,Easing,StyleSheet,View} from 'react-native';
import Svg,{Defs,Ellipse,RadialGradient,Stop} from 'react-native-svg';

function SmokeVeil({index,active,reduceMotion}:{index:number;active:boolean;reduceMotion:boolean}){
 const drift=useRef(new Animated.Value(0)).current;
 useEffect(()=>{
  if(!active||reduceMotion)return;
  const loop=Animated.loop(Animated.sequence([
   Animated.timing(drift,{toValue:1,duration:15000+index*4300,easing:Easing.inOut(Easing.sin),useNativeDriver:true}),
   Animated.timing(drift,{toValue:0,duration:18000+index*3100,easing:Easing.inOut(Easing.sin),useNativeDriver:true}),
  ]));
  loop.start();return()=>loop.stop();
 },[active,reduceMotion,index,drift]);
 const gradient=`alley-smoke-${index}`;
 return <Animated.View style={{position:'absolute',left:'-18%',width:'136%',height:'34%',top:`${24+index*16}%`,opacity:.64,
  transform:[{translateX:drift.interpolate({inputRange:[0,1],outputRange:index%2?[22,-26]:[-22,26]})},{translateY:drift.interpolate({inputRange:[0,1],outputRange:[8,-20]})}]}}>
  <Svg width="100%" height="100%" viewBox="0 0 500 250" preserveAspectRatio="none">
   <Defs><RadialGradient id={gradient} cx="50%" cy="50%" rx="50%" ry="50%"><Stop offset="0" stopColor="#C4BED2" stopOpacity=".35"/><Stop offset=".4" stopColor="#AFAABE" stopOpacity=".21"/><Stop offset="1" stopColor="#87839D" stopOpacity="0"/></RadialGradient></Defs>
   <Ellipse cx="145" cy="108" rx="205" ry="52" fill={`url(#${gradient})`}/>
   <Ellipse cx="345" cy="148" rx="210" ry="47" fill={`url(#${gradient})`}/>
   <Ellipse cx="260" cy="125" rx="190" ry="27" fill={`url(#${gradient})`}/>
  </Svg>
 </Animated.View>;
}

/** Always hazy in this alley; independent of the one-puff activity. */
export function TobaccoHaze({active,reduceMotion}:{active:boolean;reduceMotion:boolean}){
 return <View testID="tobacco-haze" pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[StyleSheet.absoluteFill,{zIndex:1100,overflow:'hidden'}]}>
  {[0,1,2].map(index=><SmokeVeil key={index} index={index} active={active} reduceMotion={reduceMotion}/>)}
 </View>;
}
