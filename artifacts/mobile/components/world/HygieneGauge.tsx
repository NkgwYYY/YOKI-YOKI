import React from 'react';
import {Pressable,Text,View} from 'react-native';
import {Icon} from '@/components/ui/Icon';
export function HygieneGauge({value,onPress}:{value:number;onPress:()=>void}){
  return <Pressable testID="home-hygiene" accessibilityRole="button" accessibilityLabel={`清潔度${value}パーセント。おふろとお掃除について`} onPress={onPress} style={{flex:1,minHeight:44,padding:8,borderRadius:18,backgroundColor:'#FFF9F0F2',borderWidth:1,borderColor:'#FFFFFFE8',flexDirection:'row',alignItems:'center',gap:4}}>
    <Icon name="droplet" size={14} color="#79A2AF"/><View style={{flex:1,gap:5}}><Text style={{fontSize:10,fontWeight:'700',color:'#71838D'}}>清潔 {value}%</Text><View style={{height:5,borderRadius:4,backgroundColor:'#DEE9E9',overflow:'hidden'}}><View style={{height:5,width:`${value}%`,borderRadius:4,backgroundColor:'#8DB8BC'}}/></View></View>
  </Pressable>;
}
