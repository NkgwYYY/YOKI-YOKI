import React from 'react';
import {Image,View} from 'react-native';
import Svg,{Circle,Ellipse,Path} from 'react-native-svg';
export function ConditionFace({mood,size=64}:{mood?:number|null;size?:number}){
 const value=mood??0,closed=value===1||value===2||value===5;
 return <View style={{width:size,height:size,opacity:value===0?.62:1}}>
  <Image source={require('@/assets/images/characters/bone/odango/body.png')} resizeMode="contain" style={{position:'absolute',width:size,height:size}} accessible={false}/>
  <Svg width={size} height={size} viewBox="0 0 100 100" accessible={false}>
   <Ellipse cx="29" cy="57" rx="7" ry="4" fill="#E8B8BB" opacity=".45"/><Ellipse cx="70" cy="57" rx="7" ry="4" fill="#E8B8BB" opacity=".45"/>
   {closed?<><Path d={value===5?'M35 48 Q40 41 45 48':'M35 47 Q39 50 43 47'} fill="none" stroke="#382F36" strokeWidth="2.4" strokeLinecap="round"/><Path d={value===5?'M56 48 Q61 41 66 48':'M57 47 Q61 50 65 47'} fill="none" stroke="#382F36" strokeWidth="2.4" strokeLinecap="round"/></>:<><Ellipse cx="40" cy="47" rx="3.6" ry="4.3" fill="#28232C"/><Ellipse cx="61" cy="47" rx="3.6" ry="4.3" fill="#28232C"/><Circle cx="39" cy="45.5" r="1.1" fill="#FFF"/><Circle cx="60" cy="45.5" r="1.1" fill="#FFF"/></>}
   <Path d={value===5?'M44 58 Q50 64 57 58':value===4?'M45 59 Q50 62 55 59':value===3||value===0?'M46 60 H55':'M44 61 Q50 56 57 61'} fill="none" stroke="#382F36" strokeWidth="2.3" strokeLinecap="round"/>
   {value===1&&<Path d="M30 51 C29 56 26 58 28 61 C32 64 36 60 33 56 Z" fill="#A3C5E2" opacity=".9"/>}
   {value===2&&<><Path d="M35 39 L41 41 M59 41 L65 39" fill="none" stroke="#6B5B65" strokeWidth="1.7" strokeLinecap="round"/></>}
  </Svg>
 </View>;
}
