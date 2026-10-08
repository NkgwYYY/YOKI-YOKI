import React,{useEffect} from 'react';
import {Image,View} from 'react-native';
import Animated,{cancelAnimation,useAnimatedStyle,useSharedValue,withRepeat,withSequence,withTiming} from 'react-native-reanimated';
export type MerchantKind='shop'|'food'|'ramen'|'tobacco'|'job';
const PORTRAITS={shop:require('@/assets/images/world/homewares-keeper.png'),food:require('@/assets/images/world/diner-chef.png'),ramen:require('@/assets/images/world/ramen-master.png'),tobacco:require('@/assets/images/world/tobacco-keeper.png'),job:require('@/assets/images/world/diner-chef.png')};
export function MerchantResident({kind,size,active,reduceMotion}:{kind:MerchantKind;size:number;active:boolean;reduceMotion:boolean}){
 const breath=useSharedValue(0);
 useEffect(()=>{if(active&&!reduceMotion)breath.value=withRepeat(withSequence(withTiming(1,{duration:2100}),withTiming(0,{duration:2600})),-1);return()=>cancelAnimation(breath);},[active,reduceMotion]);
 const style=useAnimatedStyle(()=>({transform:[{translateY:-breath.value*2},{scaleX:1+breath.value*.008}]}));
 return <View pointerEvents="none" style={{width:size,height:size}}><View style={{position:'absolute',bottom:size*.02,left:size*.23,width:size*.55,height:size*.08,borderRadius:100,backgroundColor:'#140D1875'}}/><Animated.View style={[{width:size,height:size},style]}><Image source={PORTRAITS[kind]} resizeMode="contain" style={{width:'100%',height:'100%'}}/></Animated.View></View>;
}
