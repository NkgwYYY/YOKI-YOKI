import React,{useState} from 'react';
import {Image,StyleSheet,View} from 'react-native';
import {StaticMascot} from '@/components/Mascot';
import {getCharacter,type MascotStage} from '@/utils/mascotUtils';
import {roomWearableFrame} from '@/utils/roomWearable';
import type {RoomCustomization} from '@/contexts/AppContext';
import type {ResidentItem} from './RoomResident';
import {HomeFurnishings} from './HomeFurnishings';

/** The actual HOME illustration and furnishing proportions, without side effects. */
export function RoomStylePreview({customization,stage,growthSize,wear,effect,decor}:{customization:RoomCustomization;stage:MascotStage;growthSize:number;wear?:ResidentItem;effect?:ResidentItem;decor?:ResidentItem}){
 const [width,setWidth]=useState(0),height=width*7/4,size=width*.23*Math.max(.9,Math.min(1.12,growthSize));
 return <View testID="shop-cozy-room-preview" style={s.root} onLayout={e=>setWidth(e.nativeEvent.layout.width)}>
  {!!width&&<View style={{position:'absolute',width,height,bottom:-height*.05}}>
   <Image source={require('@/assets/images/world/nook-overview-day.webp')} resizeMode="stretch" style={s.art}/>
   <HomeFurnishings width={width} height={height} customization={customization} decor={decor}/>
   <View testID="shop-preview-resident" style={{position:'absolute',left:width*.52-size/2,top:height*.71-size*.92,width:size,height:size,zIndex:710}}>
    {effect&&<Image source={{uri:effect.uri}} resizeMode="contain" style={[s.art,{opacity:.8}]}/>}
    <StaticMascot stage={stage} mood="happy" size={size}/>
    {wear&&<Image source={{uri:wear.uri}} resizeMode="contain" style={{position:'absolute',...roomWearableFrame(wear.id,getCharacter(stage).key,size,wear)}}/>}
   </View>
  </View>}
 </View>;
}
const s=StyleSheet.create({root:{flex:1,overflow:'hidden',backgroundColor:'#CADBE9'},art:{position:'absolute',width:'100%',height:'100%'}});
