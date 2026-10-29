import React from 'react';
import {Image, Platform, View} from 'react-native';
import Animated, {useAnimatedStyle, type SharedValue} from 'react-native-reanimated';
import {GIFT_TITLES, type GiftKind} from '@/utils/characterGifts';

const images = Platform.OS==='web' ? {
  flowers:require('@/assets/images/gifts/flowers.webp'), cake:require('@/assets/images/gifts/cake.webp'), stone:require('@/assets/images/gifts/stone.webp'),
} : {
  flowers:require('@/assets/images/gifts/flowers.png'), cake:require('@/assets/images/gifts/cake.png'), stone:require('@/assets/images/gifts/stone.png'),
};
export function GiftArt({kind,size=112}: {kind:GiftKind;size?:number}) {
  return <Image accessibilityLabel={GIFT_TITLES[kind]} source={images[kind]} resizeMode="contain" style={{width:size,height:size}}/>;
}
/** The same world character carries the item; no substitute mascot or extra scene. */
export function CarriedGift({kind,width,height,footX,footY}: {kind:GiftKind;width:number;height:number;footX:SharedValue<number>;footY:SharedValue<number>}) {
  const size=width*.105;
  const position=useAnimatedStyle(()=>({left:footX.value*width+size*.1,top:footY.value*height-size*.92}));
  return <Animated.View testID="character-carried-gift" pointerEvents="none" style={[{position:'absolute',zIndex:1100},position]}><View style={{transform:[{rotate:'-12deg'}]}}><GiftArt kind={kind} size={size}/></View></Animated.View>;
}
