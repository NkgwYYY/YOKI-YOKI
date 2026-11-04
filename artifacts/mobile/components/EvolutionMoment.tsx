import React,{useEffect} from 'react';
import {AppState,Modal,Pressable,Text,View} from 'react-native';
import Animated,{useSharedValue,useAnimatedStyle,withTiming,withSequence,useReducedMotion} from 'react-native-reanimated';
import {StaticMascot} from './Mascot';
import type {MascotStage} from '@/utils/mascotUtils';
/** Runs after durable progress changes; skipping or backgrounding never spends a stone. */
export function EvolutionMoment({from,to,onDone}:{from:MascotStage;to:MascotStage;onDone:()=>void}){
 const reduce=useReducedMotion(),mix=useSharedValue(0),glow=useSharedValue(0);
 useEffect(()=>{mix.value=withTiming(1,{duration:reduce?700:2400});glow.value=withSequence(withTiming(1,{duration:reduce?350:1600}),withTiming(0,{duration:reduce?350:2200}));const timer=setTimeout(onDone,reduce?1100:to==='egg'?4300:5200);const sub=AppState.addEventListener('change',state=>{if(state!=='active')onDone();});return()=>{clearTimeout(timer);sub.remove();};},[from,to,onDone,reduce]);
 const old=useAnimatedStyle(()=>({opacity:1-mix.value,transform:[{scale:1-mix.value*.08}]})),next=useAnimatedStyle(()=>({opacity:mix.value,transform:[{scale:.92+mix.value*.08}]})),light=useAnimatedStyle(()=>({opacity:glow.value*.75}));
 return <Modal transparent animationType="fade" onRequestClose={onDone}><View style={{flex:1,backgroundColor:'#F6F0E8',alignItems:'center',justifyContent:'center',gap:32}}><Text style={{fontSize:22,color:'#705780'}}>これからも、よろしくね</Text><View style={{width:240,height:240}}><Animated.View style={[{position:'absolute'},old]}><StaticMascot stage={from} mood="normal" size={240}/></Animated.View><Animated.View style={[{position:'absolute'},next]}><StaticMascot stage={to} mood="happy" size={240}/></Animated.View><Animated.View pointerEvents="none" style={[{position:'absolute',inset:0,borderRadius:120,backgroundColor:'#FFFEED'},light]}/></View><Pressable testID="evolution-skip" accessibilityRole="button" onPress={onDone} style={{minHeight:48,padding:15}}><Text style={{color:'#705780'}}>続ける</Text></Pressable></View></Modal>;
}
