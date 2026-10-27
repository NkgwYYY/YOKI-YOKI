import React from 'react';
import {StyleSheet} from 'react-native';
import Svg,{Circle,Ellipse,G,Path} from 'react-native-svg';
import {BODY_WASH_SPOTS} from '@/utils/housekeeping';

/** Marks and lather follow the same body-space patches used by the towel. */
export function BodyWashArt({size,coverage,cleanliness,saved}:{size:number;coverage:number[];cleanliness:number;saved:boolean}){
 return <Svg testID="body-wash-art" pointerEvents="none" width={size} height={size} viewBox="0 0 100 100" style={StyleSheet.absoluteFill}>
  {BODY_WASH_SPOTS.map((p,i)=>{
   const rubbed=coverage[i]||0,dirt=cleanliness<100?Math.min(.65,.17+(100-cleanliness)/120)*(1-rubbed):0;
   return <G key={i} x={p.x*100} y={p.y*100}>
    {!saved&&<G opacity={dirt}><Ellipse rx="7" ry="4.5" fill="#8E7558"/><Circle cx="5" cy="-3" r="2" fill="#A89476"/><Path d="M -5 3 Q -1 5 2 3" fill="none" stroke="#6E5F48" strokeWidth="1.2"/></G>}
    {!saved&&rubbed>0&&<G opacity={rubbed*.87}><Circle r="6" fill="#F7FFFF"/><Circle cx="-5" cy="2" r="4" fill="#DBEFF5"/><Circle cx="5" cy="3" r="4.5" fill="#FFFFFF"/><Circle cx="1" cy="-4" r="4" fill="#F4E8FA"/><Circle cx="-2" cy="-2" r="1.6" fill="#FFF"/></G>}
    {saved&&<Path d="M 0 -4 L 1 -1 L 4 0 L 1 1 L 0 4 L -1 1 L -4 0 L -1 -1 Z" fill="#FFF6C7" opacity=".7"/>}
   </G>;
  })}

 </Svg>;
}
