import React from 'react';
import {StyleSheet, View} from 'react-native';
import {colors} from '@/constants/theme';

/** Quiet surface highlights keep text and the character artwork in focus. */
export function FeltDecoration({radius=22,stitch=true,dark=false}:{radius?:number;stitch?:boolean;dark?:boolean}) {
 return <View pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants" style={[StyleSheet.absoluteFill,{borderRadius:radius,overflow:'hidden'}]}>
  <View style={[StyleSheet.absoluteFill,{borderRadius:radius,borderTopWidth:1,borderColor:dark?'#FFFFFF28':'#FFFFFFD9'}]}/>
  {stitch&&<View style={{position:'absolute',inset:1,borderRadius:Math.max(6,radius-1),borderWidth:.5,borderColor:dark?'#F4E9F32B':'#C6B6C229'}}/>}
 </View>;
}

export function FeltBackground(){return <View pointerEvents="none" style={[StyleSheet.absoluteFill,{backgroundColor:colors.background}]}><FeltDecoration stitch={false} radius={0}/></View>;}
