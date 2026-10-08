import React,{useEffect} from 'react';
import {Image,StyleSheet,View} from 'react-native';
import Animated,{cancelAnimation,useAnimatedStyle,useSharedValue,withRepeat,withTiming,type SharedValue} from 'react-native-reanimated';
import Svg,{Ellipse,Path} from 'react-native-svg';
function Steam({clock,index,size}:{clock:SharedValue<number>;index:number;size:number}){
 const drift=useAnimatedStyle(()=>{const t=(clock.value+index*.21)%1;return{opacity:Math.sin(t*Math.PI)*.44,transform:[{translateY:-t*size*.35},{translateX:Math.sin(t*Math.PI*2+index)*size*.035},{scale:1+t*.65}]};});
 return <Animated.View pointerEvents="none" style={[{position:'absolute',left:size*(.28+index*.09),top:size*.29,width:size*.17,height:size*.40},drift]}><Svg width="100%" height="100%" viewBox="0 0 40 100"><Path d="M20 95 C-2 75 37 66 19 44 C1 20 28 22 21 0" fill="none" stroke="#FFF5E2" strokeWidth={9-index} strokeLinecap="round"/></Svg></Animated.View>;
}
function Bubble({clock,index,size}:{clock:SharedValue<number>;index:number;size:number}){
 const pulse=useAnimatedStyle(()=>{const t=(clock.value*3+index*.13)%1;return{opacity:Math.sin(t*Math.PI)*.8,transform:[{scale:.4+t},{translateY:-t*4}]};});
 return <Animated.View style={[{position:'absolute',left:size*(.29+(index%4)*.12),top:size*(.44+Math.floor(index/4)*.065),width:size*.038,height:size*.021,borderRadius:20,borderWidth:1.5,borderColor:'#FFF4D9',backgroundColor:'#E3F9F430'},pulse]}/>;
}
export function CookingPot({size,boiling,active,reduceMotion,lift}:{size:number;boiling:boolean;active:boolean;reduceMotion:boolean;lift:SharedValue<number>}){
 const clock=useSharedValue(0);
 useEffect(()=>{if(boiling&&active&&!reduceMotion)clock.value=withRepeat(withTiming(1,{duration:2400}),-1,false);return()=>cancelAnimation(clock);},[boiling,active,reduceMotion]);
 const body=useAnimatedStyle(()=>({transform:[{translateY:-lift.value*15+(boiling&&!reduceMotion?Math.sin(clock.value*Math.PI*24)*.8:0)},{rotate:`${boiling&&!reduceMotion?Math.sin(clock.value*Math.PI*18)*.18:0}deg`}]}));
 return <View testID="egg-job-pot" pointerEvents="none" style={{width:size,height:size}}>
  {boiling&&<Svg width={size} height={size} style={StyleSheet.absoluteFill} viewBox="0 0 100 100"><Ellipse cx="51" cy="85" rx="26" ry="7" fill="#FEC48280"/><Ellipse cx="51" cy="85" rx="19" ry="3" fill="#FEDEA7"/></Svg>}
  <Animated.View style={[{width:size,height:size},body]}><Image source={require('@/assets/images/world/copper-pot.png')} resizeMode="contain" style={{width:size,height:size}}/>
   {boiling&&Array.from({length:8},(_,i)=><Bubble key={i} clock={clock} index={i} size={size}/>)}
  </Animated.View>
  {boiling&&Array.from({length:4},(_,i)=><Steam key={i} clock={clock} index={i} size={size}/>)}
 </View>;
}
