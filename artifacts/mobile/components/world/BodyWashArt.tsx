import React from 'react';
import {StyleSheet} from 'react-native';
import Svg,{Circle,Ellipse,G,Path} from 'react-native-svg';
import {BODY_WASH_SPOTS} from '@/utils/housekeeping';

/** Marks and lather follow the same body-space patches used by the towel. */
export function BodyWashArt({size,coverage,cleanliness,towel,saved}:{size:number;coverage:number[];cleanliness:number;towel:{x:number;y:number}|null;saved:boolean}){
 return <Svg testID="body-wash-art" pointerEvents="none" width={size} height={size} viewBox="0 0 100 100" style={StyleSheet.absoluteFill}>
  {BODY_WASH_SPOTS.map((p,i)=>{
   const rubbed=coverage[i]||0,dirt=cleanliness<100?Math.min(.65,.17+(100-cleanliness)/120)*(1-rubbed):0;
   return <G key={i} x={p.x*100} y={p.y*100}>
    {!saved&&<G opacity={dirt}><Ellipse rx="7" ry="4.5" fill="#8E7558"/><Circle cx="5" cy="-3" r="2" fill="#A89476"/><Path d="M -5 3 Q -1 5 2 3" fill="none" stroke="#6E5F48" strokeWidth="1.2"/></G>}
    {!saved&&rubbed>0&&<G opacity={rubbed*.87}><Circle r="6" fill="#F7FFFF"/><Circle cx="-5" cy="2" r="4" fill="#DBEFF5"/><Circle cx="5" cy="3" r="4.5" fill="#FFFFFF"/><Circle cx="1" cy="-4" r="4" fill="#F4E8FA"/><Circle cx="-2" cy="-2" r="1.6" fill="#FFF"/></G>}
    {saved&&<Path d="M 0 -4 L 1 -1 L 4 0 L 1 1 L 0 4 L -1 1 L -4 0 L -1 -1 Z" fill="#FFF6C7" opacity=".7"/>}
   </G>;
  })}
  {towel&&<G x={towel.x*100} y={towel.y*100} rotation={-14}>
   <Ellipse cy="9" rx="14" ry="4" fill="#312A4140"/>
   <Path d="M -16 -9 Q -3 -14 16 -8 L 14 11 Q 0 15 -15 9 Z" fill="#E9DEC8" stroke="#B6A18A" strokeWidth=".8"/>
   <Path d="M -14 -8 Q -1 -12 14 -7 L 12 7 Q 0 10 -13 6 Z" fill="#FFF7E6"/>
   <Path d="M -10 -5 L -9 7 M 9 -6 L 8 8" stroke="#AF8CBC" strokeWidth="2"/>
   <Path d="M -5 -7 Q -7 -1 -3 7 M 2 -7 Q 4 0 1 8" stroke="#DDD0B7" strokeWidth=".6" fill="none"/>
   <Circle cx="-13" cy="-10" r="3" fill="#FBFFFF"/><Circle cx="14" cy="5" r="3.5" fill="#EFFAFE"/>
  </G>}
 </Svg>;
}
