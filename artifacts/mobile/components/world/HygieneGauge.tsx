import React from 'react';
import {Text,View} from 'react-native';
import {FeltPressable as Pressable} from '@/components/ui/FeltPressable';
import {Icon} from '@/components/ui/Icon';
export function HygieneGauge({value,onPress}:{value:number;onPress:()=>void}){
  return <Pressable testID="home-hygiene" accessibilityRole="button" accessibilityLabel={`清潔度${value}パーセント。からだとお部屋を合わせた清潔度`} onPress={onPress} style={{flex:1,minHeight:44,padding:8,borderRadius: 18,backgroundColor:'#FFF8EA',borderWidth:1,borderColor:'#D7C6AA',flexDirection:'row',alignItems:'center',gap:4}}>
    <Icon name="droplet" size={14} color="#79A2AF"/><View style={{flex:1,gap:5}}><Text style={{fontSize:10,fontWeight:'700',color:'#557A83'}}>清潔 {value}%</Text><View style={{height:5,borderRadius:4,backgroundColor:'#E3EDEF',overflow:'hidden'}}><View style={{height:5,width:`${value}%`,borderRadius:4,backgroundColor:'#8DB8BC'}}/></View></View>
  </Pressable>;
}
