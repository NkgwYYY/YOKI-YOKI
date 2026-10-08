import React, {useEffect, useState} from 'react';
import {Image, StyleSheet, Text, View} from 'react-native';
import Svg, {Circle, ClipPath, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop, RadialGradient} from 'react-native-svg';
import {LinearGradient as Shade} from 'expo-linear-gradient';
import {StaticMascot} from '@/components/Mascot';
import type {MascotMood, MascotStage} from '@/utils/mascotUtils';
import {energyTankLevel} from '@/utils/worldEnergy';
import Animated,{cancelAnimation,Easing,useAnimatedStyle,useSharedValue,withDelay,withRepeat,withTiming} from 'react-native-reanimated';
import {VolumeEgg} from './VolumeEgg';
import {WorldAmbient} from './WorldAmbient';

const GARDEN_ART = require('@/assets/images/world/light-garden.jpg');
const CABLE = 'M 314 490 C 420 640 545 592 634 482';
function Flow({index, width, height, strength}: {index: number; width: number; height: number; strength: number}) {
  const p=useSharedValue(0);
  useEffect(()=>{
    p.value=0;p.value=withDelay(index*420,withRepeat(withTiming(1,{duration:3800-strength*1600,easing:Easing.linear}),-1));
    return()=>cancelAnimation(p);
  },[index,p,strength]);
  const style=useAnimatedStyle(()=>{
    const t=p.value,m=1-t;
    return {opacity:Math.min(1,t*10,(1-t)*10)*(.35+strength*.55),transform:[
      {translateX:(m*m*m*314+3*m*m*t*420+3*m*t*t*545+t*t*t*634)*width/1000-3},
      {translateY:(m*m*m*490+3*m*m*t*640+3*m*t*t*592+t*t*t*482)*height/650-3}]};
  });
  return <Animated.View testID="energy-flow" style={[s.light,style]}/>;
}

function GlassTank({energy}: {energy: number}) {
  const level=energyTankLevel(energy);
  const fill=166*level.fraction;
  return <Svg testID="energy-tank" width="100%" height="100%" viewBox="0 0 150 250" accessibilityLabel={`${level.amount}のひかり。${level.fraction===0?'タンクは空です':level.fraction===1?'光が満ちています':'光がたまっています'}`}>
    <Defs>
      <LinearGradient id="tankGlass" x1="0%" y1="0%" x2="100%" y2="0%"><Stop offset="0" stopColor="#DEF6E5" stopOpacity=".26"/><Stop offset=".4" stopColor="#122F29" stopOpacity=".08"/><Stop offset="1" stopColor="#CAF4E9" stopOpacity=".38"/></LinearGradient>
      <LinearGradient id="tankMetal" x1="0%" y1="0%" x2="100%" y2="0%"><Stop offset="0" stopColor="#615C43"/><Stop offset=".45" stopColor="#D0BE88"/><Stop offset="1" stopColor="#827654"/></LinearGradient>
      <LinearGradient id="tankWater" x1="0%" y1="0%" x2="0%" y2="100%"><Stop offset="0" stopColor="#E7FFC0" stopOpacity=".9"/><Stop offset=".22" stopColor="#ADDE9B" stopOpacity=".8"/><Stop offset="1" stopColor="#45998E" stopOpacity=".86"/></LinearGradient>
      <ClipPath id="tankInside"><Rect x="28" y="37" width="94" height="166" rx="21"/></ClipPath>
    </Defs>
    {level.fraction>0&&<Ellipse cx="75" cy="216" rx="73" ry="22" fill="#D0F4A6" opacity={level.fraction*.18}/>}
    <Ellipse cx="76" cy="234" rx="72" ry="13" fill="#101F23" opacity=".5"/>
    <Path d="M 20 213 L 130 213 L 141 228 Q 76 249 9 228 Z" fill="url(#tankMetal)" stroke="#CBC393" strokeWidth="1.4"/>
    <Ellipse cx="75" cy="216" rx="56" ry="12" fill="#304B3D" stroke="#BEB485" strokeWidth="2"/>
    <Rect x="24" y="28" width="102" height="184" rx="25" fill="url(#tankGlass)" stroke="#E0F0CC" strokeOpacity=".66" strokeWidth="2"/>
    {fill>0 && <G clipPath="url(#tankInside)" testID="energy-liquid">
      <Rect x="28" y={203-fill} width="94" height={fill} fill="url(#tankWater)"/>
      <Ellipse cx="75" cy={203-fill+2} rx="48" ry="7" fill="#E8FDC8" opacity=".8"/>
      {level.fraction>.12 && <><Circle cx="49" cy={203-fill*.35} r="2.4" fill="#F7FFD7" opacity=".8"/><Circle cx="97" cy={203-fill*.72} r="1.8" fill="#F7FFD7" opacity=".7"/></>}
    </G>}
    <Ellipse cx="75" cy="29" rx="51" ry="13" fill="url(#tankMetal)" stroke="#E0D7A7" strokeWidth="1.3"/>
    <Ellipse cx="75" cy="25" rx="35" ry="7" fill="#536B5C"/>
    <Path d="M 39 49 Q 32 92 38 148" fill="none" stroke="#F6FFF1" strokeOpacity=".66" strokeWidth="5" strokeLinecap="round"/>
    <Path d="M 46 191 Q 76 200 103 190" fill="none" stroke="#F1FFD0" strokeOpacity=".25" strokeWidth="2"/>
    <Path d="M 110 57 L 110 175" stroke="#EAFAE6" strokeOpacity=".22" strokeWidth="2"/>
    {[63,104,145,183].map(y=><Path key={y} d={`M 102 ${y} L 113 ${y}`} stroke="#EAF5D8" strokeOpacity=".6" strokeWidth="1.2"/>)}
    <Rect x="12" y="185" width="22" height="18" rx="5" fill="#6D7951" stroke="#D0D7A0"/>
    <Circle cx="17" cy="194" r="4" fill="#DDF6B1"/>
  </Svg>;
}

export function EnergyWorld({energy, genki, stage, mood, active, reduceMotion}: {energy: number; genki: number; stage: MascotStage; mood: MascotMood; active: boolean; reduceMotion: boolean}) {
  const [bounds,setBounds]=useState({width:0,height:0});
  const wide=bounds.width>bounds.height;
  const width=Math.min(wide?bounds.width*.60:bounds.width,640,bounds.height*.88);
  const height=width*.65;
  const left=((wide?bounds.width*.60:bounds.width)-width)/2;
  const top=bounds.height*(wide?.68:bounds.height<650?.55:.64)-height*.83;
  const motion=active&&!reduceMotion;
  const zero=useSharedValue(0),turn=useSharedValue(0),breath=useSharedValue(0);
  useEffect(()=>{
    if(!motion){turn.value=0;breath.value=0;return;}
    turn.value=withRepeat(withTiming(.20,{duration:4200,easing:Easing.inOut(Easing.sin)}),-1,true);
    breath.value=withRepeat(withTiming(1,{duration:2400,easing:Easing.inOut(Easing.sin)}),-1,true);
    return()=>{cancelAnimation(turn);cancelAnimation(breath);};
  },[motion]);
  const residentStyle=useAnimatedStyle(()=>({transform:[{translateY:breath.value*1.2},{scaleX:1+breath.value*.013},{scaleY:1-breath.value*.013}]}));
  return <View testID="energy-garden" accessibilityLabel={`蓄電池に${energy}のひかり`} style={s.root} onLayout={e=>setBounds(e.nativeEvent.layout)}>
    <View pointerEvents="none" style={StyleSheet.absoluteFill}><Image source={GARDEN_ART} resizeMode="cover" style={s.art}/></View>
    <Shade pointerEvents="none" colors={['#101D3266','transparent','#1C2C30BB']} locations={[0,.5,1]} style={StyleSheet.absoluteFill}/>
    <WorldAmbient active={active} reduceMotion={reduceMotion} night />
    {width>0 && <View pointerEvents="none" testID="energy-stage" style={{position:'absolute',left,top,width,height}}>
      <Svg width={width} height={height} viewBox="0 0 1000 650" style={StyleSheet.absoluteFill}>
        <Defs><RadialGradient id="residentLight"><Stop offset="0" stopColor="#DDF5B0" stopOpacity={.22+Math.max(0,Math.min(1,genki/100))*.35}/><Stop offset="1" stopColor="#DDF5B0" stopOpacity="0"/></RadialGradient></Defs>
        <Ellipse cx="256" cy="514" rx="170" ry="70" fill="url(#residentLight)"/>
        <Ellipse cx="256" cy="514" rx="115" ry="24" fill="#152B28" opacity=".45"/>
        <Path d={CABLE} transform="translate(0,9)" stroke="#122326" opacity=".45" strokeWidth="18" fill="none"/>
        <Path d={CABLE} stroke="#42553D" strokeWidth="13" fill="none"/>
        <Path d={CABLE} stroke="#AEBD80" strokeWidth="4" strokeOpacity=".6" fill="none"/>
        <Rect x="300" y="477" width="33" height="26" rx="8" fill="#5E714D" stroke="#C7D49B" strokeWidth="3"/>
        <Circle cx="319" cy="490" r="5" fill="#EBF9B5"/>
      </Svg>
      <Animated.View style={[{position:'absolute',left:width*.11,top:height*.79-width*.29,width:width*.29,height:width*.29},residentStyle]}>
        {stage==='egg'?<VolumeEgg size={width*.29} rx={zero} ry={turn} rz={zero} blink={zero} mood={mood} night/>:<StaticMascot stage={stage} mood={mood} size={width*.29}/>}
      </Animated.View>
      <View style={{position:'absolute',left:width*.595,top:height*.19,width:width*.27,height:height*.70}}><GlassTank energy={energy}/></View>
      {motion && [0,1,2].map(index=><Flow key={index} index={index} width={width} height={height} strength={Math.max(0,Math.min(1,genki/100))}/>)}
      <View style={{position:'absolute',left:width*.56,top:height*.95,width:width*.35,alignItems:'center'}}><Text testID="energy-amount" style={s.amount}>{energy} <Text style={s.unit}>ひかり</Text></Text></View>
    </View>}
  </View>;
}
const s=StyleSheet.create({
  root:{flex:1,backgroundColor:'#1D3031',overflow:'hidden'},art:{position:'absolute',left:0,top:0,width:'100%',height:'100%'},
  light:{position:'absolute',width:6,height:6,borderRadius:3,backgroundColor:'#F1FFD0',shadowColor:'#D2FFAF',shadowOpacity:.8,shadowRadius:6},
  amount:{color:'#F4F4CF',fontSize:20,fontWeight:'600',textShadowColor:'#102B27',textShadowRadius:8},unit:{fontSize:11,fontWeight:'400'},
});
