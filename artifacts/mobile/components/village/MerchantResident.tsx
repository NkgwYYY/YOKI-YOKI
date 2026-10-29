import React from 'react';
import {Image,View} from 'react-native';
import Animated from 'react-native-reanimated';
import {MERCHANT_ART} from '@/utils/worldArt';
import {useResidentIdle} from './useResidentIdle';
export type MerchantKind=keyof typeof MERCHANT_ART;
const TEMPO:Record<MerchantKind,number>={bank:2900,shop:2700,ramen:2400,tobacco:3100,job:1850,bowling:1600};
export const MerchantResident=React.memo(function MerchantResident({kind,size,active,reduceMotion,greeting=0}:{kind:MerchantKind;size:number;active:boolean;reduceMotion:boolean;greeting?:number}){
 const style=useResidentIdle({active,reduceMotion,size,tempo:TEMPO[kind],greeting});
 return <View pointerEvents="none" style={{width:size,height:size}}><View style={{position:'absolute',bottom:size*.02,left:size*.23,width:size*.55,height:size*.08,borderRadius:100,backgroundColor:'#140D1875'}}/><Animated.View testID={`merchant-motion-${kind}`} style={[{width:size,height:size},style]}><Image source={MERCHANT_ART[kind]} resizeMode="contain" style={{width:'100%',height:'100%'}}/></Animated.View></View>;
});
