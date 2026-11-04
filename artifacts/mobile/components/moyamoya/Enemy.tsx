import React from 'react';
import {Image,View} from 'react-native';
import {getPattern,type PatternId} from '@/utils/moyamoyaContent';
export function Enemy({pattern,size=140}:{pattern:PatternId;size?:number}){
 const index=getPattern(pattern)?.sprite??0;
 return <View accessible accessibilityLabel={getPattern(pattern)?.name} style={{width:size,height:size,overflow:'hidden'}}><Image accessible={false} source={require('@/assets/moyamoya/monsters.png')} style={{position:'absolute',width:size*3,height:size*2,left:-(index%3)*size,top:-Math.floor(index/3)*size}} resizeMode="stretch"/></View>;
}
