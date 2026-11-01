import React from 'react';
import {View} from 'react-native';
import Svg,{Circle,Path} from 'react-native-svg';
export function ConditionFace({mood,size=64}:{mood?:number|null;size?:number}){
 const value=mood??0,fill=['#E9E3DA','#DDE4EE','#E5DFEE','#EEE6CD','#DCE9D8','#F2DFD6'][value]??'#E9E3DA';
 return <View style={{width:size,height:size,borderRadius:size/2,backgroundColor:fill,alignItems:'center',justifyContent:'center',borderWidth:2,borderColor:'#FFFDF8',shadowColor:'#61775D',shadowOpacity:.16,shadowRadius:7,shadowOffset:{width:0,height:4}}}>
  <Svg width={size*.76} height={size*.76} viewBox="0 0 40 40" accessible={false}><Circle cx="20" cy="20" r="17" fill="none" stroke="#65765F" strokeWidth="1.8"/><Circle cx="14" cy="17" r="1.4" fill="#65765F"/><Circle cx="26" cy="17" r="1.4" fill="#65765F"/><Path d={value>0&&value<=2?'M13 27 Q20 20 27 27':value<=3?'M14 25 H26':'M12 23 Q20 34 28 23'} stroke="#65765F" strokeWidth="1.8" strokeLinecap="round" fill="none"/></Svg>
 </View>;
}
