import React from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {Icon} from '@/components/ui/Icon';
export function HappinessGauge({value,onPress}:{value:number;onPress:()=>void}) {
  const amount=Math.max(0,Math.min(100,Math.round(value)));
  return <Pressable testID="home-happiness" accessibilityRole="button" accessibilityLabel={`幸福度${amount}パーセント。うれしい気持ちを見る`}
    onPress={onPress} style={s.root}>
    <Icon name="heart" size={14} color="#BD849F"/>
    <View style={s.body}><Text style={s.number}>幸福 {amount}%</Text><View style={s.track}><View style={[s.fill,{width:`${amount}%`}]}/></View></View>
  </Pressable>;
}
const s=StyleSheet.create({root:{flex:1,minHeight:44,paddingHorizontal:8,paddingVertical:8,borderRadius:18,backgroundColor:'#FFF9F0F2',borderWidth:1,borderColor:'#FFFFFFE8',flexDirection:'row',alignItems:'center',gap:4},body:{flex:1,gap:5},number:{fontSize:10,fontWeight:'700',color:'#80617B'},track:{height:5,borderRadius:4,backgroundColor:'#ECDDE5',overflow:'hidden'},fill:{height:5,borderRadius:4,backgroundColor:'#C493AC'}});
