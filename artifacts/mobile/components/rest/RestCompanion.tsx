import React, {useEffect, useId, useMemo, useRef, useState} from 'react';
import {Animated, Easing, Platform, StyleSheet, Text, View} from 'react-native';
import {FeltPressable as Pressable} from '@/components/ui/FeltPressable';
import Svg, {ClipPath, Defs, Ellipse, G, Image, LinearGradient, Path, Pattern, RadialGradient, Stop} from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import {projectEgg} from '@/utils/residentVolume';
import {projectEvolved} from '@/utils/evolvedVolume';
import {ODANGO_COAT_URI} from '@/utils/odangoCoat';
import type {MascotStage} from '@/utils/mascotUtils';
import type {RestScene} from './RestScenes';

const atmosphere = {
  campfire: {light:'#F7D9AD', middle:'#B7A38F', shade:'#5B5362', rim:'#EDAD68', words:'ぱちぱち、いい音だね。'},
  rain: {light:'#CFDEE5', middle:'#9BA9B7', shade:'#4F5369', rim:'#A4CADB', words:'雨の音、ここで一緒に聞こう。'},
  stars: {light:'#D9D8EE', middle:'#A8A4C0', shade:'#4B4865', rim:'#C0B6EC', words:'あの星、きれいだね。'},
  cat: {light:'#E9DDC9', middle:'#B5A694', shade:'#625765', rim:'#DBC39D', words:'気持ちよさそうにしてるね。'},
};

/** Reuse the resident's actual 3D geometry. Only two poses are projected, never
 * a geometry recalculation on every animation frame. Native breathing moves the
 * artwork inside a stable touch target, and reduced motion keeps it still. */
export function RestCompanion({stage, name, scene, size, reduceMotion}: {
  stage:MascotStage; name:string; scene:RestScene; size:number; reduceMotion:boolean;
}) {
  const id=useId().replace(/[^a-zA-Z0-9]/g,'');
  const [looking,setLooking]=useState(false), [greeting,setGreeting]=useState(true);
  const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const breath=useRef(new Animated.Value(0)).current;
  const palette=atmosphere[scene];
  const shape=useMemo(()=>{
    // Beside the viewer, facing into the scene; a tap brings a quiet glance back.
    const yaw=looking?.32:1.48;
    return stage==='egg'
      ? projectEgg(-.05,yaw,-.025,0,looking,false)
      : projectEvolved(stage,-.05,yaw,-.025,0,looking,false);
  },[stage,looking]);
  const path=(key:string)=> (shape as unknown as Record<string,string>)[key] || '';
  const body=path(stage==='egg'?'body':'furHalo');
  useEffect(()=>{
    timer.current=setTimeout(()=>setGreeting(false),4600);
    return()=>{if(timer.current)clearTimeout(timer.current);};
  },[]);
  useEffect(()=>{
    breath.setValue(0);
    if(reduceMotion)return;
    const loop=Animated.loop(Animated.sequence([
      Animated.timing(breath,{toValue:1,duration:2700,easing:Easing.inOut(Easing.sin),useNativeDriver:true}),
      Animated.timing(breath,{toValue:0,duration:3100,easing:Easing.inOut(Easing.sin),useNativeDriver:true}),
    ]));
    loop.start();return()=>loop.stop();
  },[reduceMotion,breath]);
  const greet=()=>{
    if(timer.current)clearTimeout(timer.current);
    setLooking(true);setGreeting(true);
    timer.current=setTimeout(()=>{setLooking(false);setGreeting(false);},3600);
    if(Platform.OS!=='web')void Haptics.selectionAsync().catch(()=>{});
  };
  const feature=(key:string,fill:string,stroke?:string,width?:number,opacity=1)=>path(key)?
    <Path key={key} d={path(key)} fill={fill} stroke={stroke} strokeWidth={width} opacity={opacity} strokeLinecap="round"/>:null;
  return <View testID="rest-companion" style={{width:size,alignItems:'center'}}>
    {greeting&&<View pointerEvents="none" style={[s.words,{width:Math.max(180,size+28)}]}>
      <Text testID="rest-companion-reaction" accessibilityLiveRegion="polite" style={s.wordsText}>{palette.words}</Text>
    </View>}
    <Pressable testID="rest-companion-touch" accessibilityRole="button" accessibilityLabel={`${name}のとなりで休む`}
      accessibilityHint="タップすると、こちらを向いてひとこと話します" onPress={greet} style={{width:size,height:size}}>
      <Svg pointerEvents="none" width={size} height={size} style={StyleSheet.absoluteFill} viewBox="0 0 100 100">
        <Defs><RadialGradient id={`${id}shadow`}><Stop offset="0" stopColor="#080711" stopOpacity=".72"/><Stop offset="1" stopColor="#080711" stopOpacity="0"/></RadialGradient></Defs>
        <Ellipse cx="50" cy="91" rx="47" ry="8" fill={`url(#${id}shadow)`}/>
      </Svg>
      <Animated.View pointerEvents="none" style={{transform:[{translateY:breath.interpolate({inputRange:[0,1],outputRange:[0,-.6]})},{scaleY:breath.interpolate({inputRange:[0,1],outputRange:[1,.986]})},{scaleX:breath.interpolate({inputRange:[0,1],outputRange:[1,1.006]})}]}}>
        <Svg width={size} height={size} viewBox="0 0 100 100" accessible={false}>
          <Defs>
            <RadialGradient id={`${id}body`} gradientUnits="userSpaceOnUse" cx="62" cy="38" fx="69" fy="29" rx="58" ry="62"><Stop offset="0" stopColor={palette.light}/><Stop offset=".48" stopColor={palette.middle}/><Stop offset="1" stopColor={palette.shade}/></RadialGradient>
            <RadialGradient id={`${id}depth`} gradientUnits="userSpaceOnUse" cx="62" cy="38" rx="55" ry="60"><Stop offset=".25" stopColor={palette.shade} stopOpacity="0"/><Stop offset=".6" stopColor={palette.shade} stopOpacity=".05"/><Stop offset="1" stopColor={palette.shade} stopOpacity=".5"/></RadialGradient>
            <RadialGradient id={`${id}cheek`}><Stop offset="0" stopColor="#E6BAB5" stopOpacity=".65"/><Stop offset="1" stopColor="#E6BAB5" stopOpacity="0"/></RadialGradient>
            <RadialGradient id={`${id}eye`}><Stop offset="0" stopColor="#353237"/><Stop offset="1" stopColor="#16171D"/></RadialGradient>
            <LinearGradient id={`${id}rainbow`}><Stop offset="0" stopColor="#B498B2"/><Stop offset=".3" stopColor="#D9CBA2"/><Stop offset=".6" stopColor="#A5BCA5"/><Stop offset="1" stopColor="#A9AACD"/></LinearGradient>
            <ClipPath id={`${id}bodyclip`}><Path d={body}/></ClipPath>
            <Pattern id={`${id}coat`} patternUnits="userSpaceOnUse" width="100" height="100"><Image href={ODANGO_COAT_URI} x="-30" y="-30" width="160" height="160" preserveAspectRatio="none"/></Pattern>
            <LinearGradient id={`${id}rim`}><Stop offset="0" stopColor={palette.rim} stopOpacity="0"/><Stop offset="1" stopColor={palette.rim} stopOpacity=".25"/></LinearGradient>
          </Defs>
          <Path d={body} fill={`url(#${id}${stage==='stage4'?'rainbow':'body'})`}/>
          {stage!=='egg'&&<G clipPath={`url(#${id}bodyclip)`}>
            <Path d={body} fill={`url(#${id}coat)`} opacity=".46"/>
            {feature('furShade','none',palette.shade,.18,.12)}
            {feature('furMid','none',palette.middle,.22,.18)}
            {feature('furLight','none',palette.light,.26,.3)}
          </G>}
          <Path d={body} fill={`url(#${id}depth)`}/>
          <Path d={body} fill={`url(#${id}rim)`}/>
          {feature('crack','none','#9C8CAB',1.8)}
          {feature('leftCheek',`url(#${id}cheek)`)}{feature('rightCheek',`url(#${id}cheek)`)}
          {feature('leftSocket',palette.light)}{feature('rightSocket',palette.light)}
          {feature('leftEye',`url(#${id}eye)`)}{feature('rightEye',`url(#${id}eye)`)}
          {feature('leftShine','#F7F0E4')}{feature('rightShine','#F7F0E4')}
          {feature('mouth','none','#28222B',1.5)}
          {stage!=='egg'&&stage!=='odango'&&<>{feature('stem','none','#839360',1.5)}{feature('leftLeaf','#879E55')}{feature('rightLeaf','#A6B871')}</>}
        </Svg>
      </Animated.View>
    </Pressable>
  </View>;
}
const s=StyleSheet.create({
  words:{position:'absolute',bottom:'110%',left:0,paddingHorizontal:13,paddingVertical:10,borderRadius:14,backgroundColor:'#18141EDB',borderWidth:1,borderColor:'#F7E9D92B'},
  wordsText:{fontSize:12,lineHeight:19,color:'#F2E8E0'},
});
