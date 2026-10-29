import {ZodiacFortune} from '@/components/daily/ZodiacFortune';
import {colors} from '@/constants/theme';
import Svg,{Path,Circle,Defs,LinearGradient,Stop} from 'react-native-svg';
import React from 'react';
import {Image,StyleSheet,Text,View} from 'react-native';
import {FeltPressable as Pressable} from '@/components/ui/FeltPressable';
import {useApp} from '@/contexts/AppContext';
import {BottomSheet} from '@/components/ui/BottomSheet';
import {FORTUNE_CAT_ART} from '@/utils/worldArt';
import Animated from 'react-native-reanimated';
import {useResidentIdle} from '@/components/village/useResidentIdle';

export function FortuneCat({width,height,clearTop,clearBottom,disabled,active,reduceMotion,greeting,onPress}:{width:number;height:number;clearTop:number;clearBottom:number;disabled:boolean;active:boolean;reduceMotion:boolean;greeting:number;onPress:()=>void}){
 const {feedState}=useApp();
 const bell=(feedState.villageStories?.arcs.cat?.episodes.length??0)>=5;
 const top=Math.max(height*.25,clearTop+8);
 const size=Math.min(width*.52,Math.max(110,clearBottom-top-30));
 const motion=useResidentIdle({active,reduceMotion,size,tempo:3200,greeting,strength:.35});
 return <Pressable testID="merchant-fortune" accessibilityRole="button" accessibilityLabel="大きな猫の占い師。今日の運勢を占う" disabled={disabled} onPress={onPress}
  style={{position:'absolute',left:width*.17,top,width:size,height:size,zIndex:535}}>
  <Animated.View testID="merchant-motion-fortune" pointerEvents="none" style={[{width:size,height:size},motion]}><Image source={FORTUNE_CAT_ART} resizeMode="contain" style={{width:'100%',height:'100%'}}/>{bell&&<View style={{position:'absolute',left:'49%',top:'49%',width:size*.11,height:size*.14}}><Svg width="100%" height="100%" viewBox="0 0 30 40"><Defs><LinearGradient id="catMoonBell"><Stop stopColor="#A16E34"/><Stop offset=".5" stopColor="#FFE5A0"/><Stop offset="1" stopColor="#C39046"/></LinearGradient></Defs><Path d="M15 0V7" stroke="#866CA3" strokeWidth="3"/><Path d="M20 8C5 5 0 26 15 31C23 34 29 28 29 23C16 28 9 15 20 8Z" fill="url(#catMoonBell)"/><Circle cx="17" cy="34" r="2" fill="#EAC16F"/></Svg></View>}</Animated.View>
  <Text style={s.catLabel}>猫の占い師・ルナ</Text>
 </Pressable>;
}
export function FortuneHall({onClose}:{onClose:()=>void}){
 return <BottomSheet visible title="星座占い" subtitle="12星座の今日の運勢" onClose={onClose}>
  <ZodiacFortune/>
 </BottomSheet>;
}
const s=StyleSheet.create({
 catLabel:{alignSelf:'center',paddingHorizontal:12,paddingVertical:6,color:colors.primary,fontSize:11,backgroundColor:colors.card,borderWidth:1,borderColor:colors.border,borderRadius:5},
 welcome:{flexDirection:'row',gap:14,alignItems:'center',marginBottom:20},eyebrow:{fontSize:10,letterSpacing:1.2,color:colors.primary},copy:{fontSize:14,lineHeight:25,color:colors.foreground},
 result:{borderWidth:1,borderColor:colors.border,borderRadius:12,padding:20,gap:13,backgroundColor:colors.muted},stars:{fontSize:23,letterSpacing:5,color:colors.warning},title:{fontSize:22,lineHeight:33,color:colors.foreground,fontWeight:'600'},divider:{height:1,backgroundColor:colors.border,marginVertical:4},note:{fontSize:11,lineHeight:20,color:colors.mutedForeground},error:{fontSize:13,lineHeight:22,color:colors.danger,marginTop:12},
});
