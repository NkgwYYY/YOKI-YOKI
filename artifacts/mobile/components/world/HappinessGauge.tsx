import {FeltDecoration} from '@/components/ui/Felt';
import React from 'react';
import {StyleSheet,Text,View} from 'react-native';
import {FeltPressable as Pressable} from '@/components/ui/FeltPressable';
import {Icon} from '@/components/ui/Icon';
export function HappinessGauge({value,onPress}:{value:number;onPress:()=>void}) {
  const amount=Math.max(0,Math.min(100,Math.round(value)));
  return <Pressable testID="home-happiness" accessibilityRole="button" accessibilityLabel={`幸福度${amount}パーセント。うれしい気持ちを見る`}
    onPress={onPress} style={s.root}>
    <FeltDecoration radius={18}/><Icon name="heart" size={14} color="#BD849F"/>
    <View style={s.body}><Text style={s.number}>幸福 {amount}%</Text><View style={s.track}><View style={[s.fill,{width:`${amount}%`}]}/></View></View>
  </Pressable>;
}
const s=StyleSheet.create({root:{flex:1,minHeight:44,paddingHorizontal:8,paddingVertical:8,borderRadius: 18,backgroundColor:'#FFF8EA',borderWidth:1,borderColor:'#D7C6AA',flexDirection:'row',alignItems:'center',gap:4},body:{flex:1,gap:5},number:{fontSize:10,fontWeight:'700',color:'#7E576E'},track:{height:5,borderRadius:4,backgroundColor:'#E8DDCA',overflow:'hidden'},fill:{height:5,borderRadius:4,backgroundColor:'#C493AC'}});
