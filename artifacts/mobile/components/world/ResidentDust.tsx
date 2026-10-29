import React from 'react';
import Svg,{Ellipse,Path} from 'react-native-svg';
import {StyleSheet} from 'react-native';
export function ResidentDust({value,size}:{value:number;size:number}){
  if(value>=99)return null;
  const opacity=Math.min(.5,(100-value)/100*.65);
  return <Svg testID="resident-dust" pointerEvents="none" width={size} height={size} viewBox="0 0 100 100" style={[StyleSheet.absoluteFill,{opacity}]}>
    <Ellipse cx="26" cy="51" rx="9" ry="5" fill="#947C62"/><Ellipse cx="70" cy="73" rx="11" ry="5" fill="#947C62"/><Ellipse cx="61" cy="25" rx="6" ry="4" fill="#A08B71"/><Path d="M 29 77 Q 36 80 40 75 M 73 47 L 79 49" stroke="#7D715A" strokeWidth="3" strokeLinecap="round"/>
  </Svg>;
}
