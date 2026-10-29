import React, {useId} from 'react';
import {StyleSheet, View} from 'react-native';
import Svg, {Defs, Pattern, Path, Rect} from 'react-native-svg';
import {colors} from '@/constants/theme';

/** Static textile grain; no filters, canvas, animation loop or touch responders. */
export function FeltDecoration({radius=22,stitch=true,dark=false}:{radius?:number;stitch?:boolean;dark?:boolean}) {
 const id=`felt${useId().replace(/[^a-z0-9]/gi,'')}`;
 return <View pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants" style={[StyleSheet.absoluteFill,{borderRadius:radius,overflow:'hidden'}]}>
  <View style={[StyleSheet.absoluteFill,{borderRadius:radius,borderTopWidth:2,borderLeftWidth:1,borderColor:dark?'#DCE8C866':'#FFFFFFCC'}]}/>
  <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
   <Defs><Pattern id={id} width="16" height="16" patternUnits="userSpaceOnUse">
    <Path d="M1 3l2-1m7 2l2 1M5 10l1 2m6 1l2-1M0 15l2-1" stroke={dark?'#FFF7E8':'#9C8063'} strokeOpacity={dark?'.12':'.075'} strokeWidth=".7"/>
    <Path d="M5 1l2 1m2 7l2-1M2 8l1 1m4 6l2-1" stroke="#FFFFFF" strokeOpacity=".4" strokeWidth=".8"/>
   </Pattern></Defs><Rect width="100%" height="100%" fill={`url(#${id})`}/>
  </Svg>
  {stitch&&<View style={{position:'absolute',inset:5,borderRadius:Math.max(6,radius-5),borderWidth:1,borderStyle:'dashed',borderColor:dark?'#E7D7B894':'#BDA27E77'}}/>}
 </View>;
}

export function FeltBackground(){return <View pointerEvents="none" style={[StyleSheet.absoluteFill,{backgroundColor:colors.background}]}><FeltDecoration stitch={false} radius={0}/></View>;}
