import React,{useEffect} from 'react';
import {useWindowDimensions} from 'react-native';
import Animated,{cancelAnimation,Easing,useAnimatedStyle,useSharedValue,withDelay,withTiming} from 'react-native-reanimated';
import {CareHandArt} from './CareHandArt';

export function BathCareHand({size,point,enabled,reduceMotion}:{size:number;point:{x:number;y:number}|null;enabled:boolean;reduceMotion:boolean}) {
 const {width}=useWindowDimensions(),x=useSharedValue(.5),y=useSharedValue(.5),presence=useSharedValue(0);
 useEffect(()=>{
  if(!enabled){cancelAnimation(presence);cancelAnimation(x);cancelAnimation(y);presence.value=0;return;}
  if(point){
   x.value=withTiming(Math.max(0,Math.min(1,point.x)),{duration:reduceMotion?0:65,easing:Easing.linear});
   y.value=withTiming(Math.max(0,Math.min(1,point.y)),{duration:reduceMotion?0:65,easing:Easing.linear});
   presence.value=withTiming(1,{duration:reduceMotion?0:240,easing:Easing.out(Easing.cubic)});
  }else presence.value=withDelay(120,withTiming(0,{duration:reduceMotion?0:350,easing:Easing.inOut(Easing.cubic)}));
 },[enabled,point,reduceMotion,x,y,presence]);
 useEffect(()=>()=>{cancelAnimation(x);cancelAnimation(y);cancelAnimation(presence);},[x,y,presence]);
 const style=useAnimatedStyle(()=>({opacity:enabled&&presence.value>0?1:0,transform:[{translateX:x.value*size+(reduceMotion?0:(1-presence.value)*width*1.3)},{translateY:y.value*size+(reduceMotion?0:(1-presence.value)*size*.12)}]}));
 return <Animated.View testID="bath-care-hand" pointerEvents="none" accessible={false} style={[{position:'absolute',left:0,top:0,width:1,height:1,zIndex:30},style]}>
  <CareHandArt unit={size*.70} reach={width*2+size*4} washing/>
 </Animated.View>;
}
