import React from 'react';
import {StyleSheet,Text} from 'react-native';
import {FeltPressable as Pressable} from '@/components/ui/FeltPressable';
import type {WorldMapId} from '@/utils/worldMaps';

/** Quiet path markers keep the resident clear; destination names live in the atlas. */
export function WorldGate({to,label,x,y,width,height,open,disabled,onPress}:{to:WorldMapId;label:string;x:number;y:number;width:number;height:number;open:boolean;disabled:boolean;onPress:()=>void}){
 return <Pressable testID={`world-gate-${to}`} accessibilityRole="button" accessibilityLabel={`${label}への道しるべ${open?'':'、まだひらいていません'}`} disabled={disabled} onPress={onPress} style={[s.gate,{left:x*width-22,top:y*height-22}]}><Text pointerEvents="none" style={[s.marker,!open&&{opacity:.4}]}>{open?'◇':'·'}</Text></Pressable>;
}
const s=StyleSheet.create({gate:{position:'absolute',width:44,height:44,alignItems:'center',justifyContent:'center',zIndex:860},marker:{fontSize:20,color:'#EBD5A8',textShadowColor:'#312035',textShadowRadius:5}});
