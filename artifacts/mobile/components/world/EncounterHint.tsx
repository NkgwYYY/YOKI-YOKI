import React from 'react';
import {StyleSheet,Text} from 'react-native';
import Animated,{useAnimatedStyle,type SharedValue} from 'react-native-reanimated';
import {conversationHintLayout,type ConversationTarget} from '@/utils/encounterLayout';

export function EncounterHint({target,targets,width,height,viewportLeft,viewportWidth,clearTop,footX,footY}:{target:ConversationTarget;targets:ConversationTarget[];width:number;height:number;viewportLeft:number;viewportWidth:number;clearTop:number;footX:SharedValue<number>;footY:SharedValue<number>}){
 const placement=useAnimatedStyle(()=>{
  const at=conversationHintLayout(target,targets,{x:footX.value,y:footY.value},width,height,viewportLeft,viewportWidth,clearTop);
  return at?{...at,opacity:1}:{opacity:0};
 });
 return <Animated.View testID="nearby-encounter-hint" pointerEvents="none" style={[s.bubble,placement]}><Text numberOfLines={2} maxFontSizeMultiplier={1.3} style={s.text}>{target.hint}</Text></Animated.View>;
}
const s=StyleSheet.create({bubble:{position:'absolute',zIndex:900,borderRadius:16,backgroundColor:'#FFF7E9F5',borderWidth:1,borderColor:'#D3BD95',paddingHorizontal:10,paddingVertical:6,justifyContent:'center'},text:{fontSize:11,lineHeight:16,color:'#665146',textAlign:'center'}});
