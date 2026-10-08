import React from 'react';
import {Pressable,StyleSheet,Text} from 'react-native';
import Animated,{useAnimatedStyle,type SharedValue} from 'react-native-reanimated';
import type {WorldMapId} from '@/utils/worldMaps';
export function WorldGate({to,label,x,y,width,height,footX,footY,open,disabled,onPress}:{to:WorldMapId;label:string;x:number;y:number;width:number;height:number;footX:SharedValue<number>;footY:SharedValue<number>;open:boolean;disabled:boolean;onPress:()=>void}){
 const caption=useAnimatedStyle(()=>({opacity:Math.hypot(footX.value-x,(footY.value-y)*1.5)<.20?1:0}));
 return <Pressable testID={`world-gate-${to}`} accessibilityRole="button" accessibilityLabel={`${label}への道しるべ`} disabled={disabled} onPress={onPress} style={[s.gate,{left:x*width-48,top:y*height-20}]}><Text style={[s.marker,!open&&{opacity:.4}]}>{open?'◇':'·'}</Text><Animated.View pointerEvents="none" style={caption}><Text style={s.label}>{label}</Text></Animated.View></Pressable>;
}
const s=StyleSheet.create({gate:{position:'absolute',width:96,minHeight:52,alignItems:'center',justifyContent:'center',zIndex:860},marker:{fontSize:20,color:'#EBD5A8',textShadowColor:'#312035',textShadowRadius:5},label:{fontSize:10,color:'#F1E0C2',textAlign:'center',backgroundColor:'#211B30CD',paddingVertical:4,paddingHorizontal:7,borderBottomWidth:1,borderColor:'#BEA47A',letterSpacing:.4}});
