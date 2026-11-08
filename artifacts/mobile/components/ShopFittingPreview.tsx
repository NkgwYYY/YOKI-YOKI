import React,{useState} from 'react';
import {Image,StyleSheet,View} from 'react-native';
import {useSharedValue} from 'react-native-reanimated';
import {VolumeResident} from '@/components/world/VolumeResident';
import {useApp} from '@/contexts/AppContext';
import {getMascotStage} from '@/utils/mascotUtils';
import {readWardrobe} from '@/utils/wardrobe';
import {homeEyeArt} from '@/utils/worldArt';
import {roomGoodArt} from '@/utils/roomBoutiqueArt';
import {roomFurnitureSource,roomFlowerSource} from '@/components/room/RoomFurnitureArt';
import type {ShopProduct} from '@/utils/unifiedShop';

/** Shop fitting is front-facing. Home animations retain their full 3D geometry. */
export function ShopFittingPreview({product,night}:{product:ShopProduct|null;night:boolean}){
 const {progress,feedState}=useApp(),[width,setWidth]=useState(340);
 const rx=useSharedValue(0),ry=useSharedValue(0),rz=useSharedValue(0),blink=useSharedValue(0);
 const costume=product===null?null:product.costume??product.room?.costume??readWardrobe(feedState.wardrobe).equipped;
 const art=product?.room?.good?roomGoodArt(product.room.good):product?.furniture?roomFurnitureSource(product.furniture):product?.flower?roomFlowerSource(product.flower):null;
 const theme=!!product?.room?.theme;
 const size=Math.min(300,width*(art?.57:theme?.55:.82));
 return <View testID="shop-fitting-preview" onLayout={e=>setWidth(e.nativeEvent.layout.width)} style={[s.scene,theme&&s.room]}>
  <Image source={homeEyeArt(night,true,product?.room?.theme)} resizeMode="cover" style={[StyleSheet.absoluteFill,{width:'100%',height:'100%'}]}/>
  <View style={[s.resident,{left:width*(art?.28:.5)-size/2,bottom:16}]} pointerEvents="none"><VolumeResident stage={getMascotStage(progress)} size={size} displaySize={size} rx={rx} ry={ry} rz={rz} blink={blink} mood="normal" costume={costume} night={night} reduceMotion/></View>
  {art&&<Image source={art} resizeMode="contain" style={s.item}/>}
 </View>;
}
const s=StyleSheet.create({scene:{width:'100%',aspectRatio:1.18,borderRadius:22,overflow:'hidden',backgroundColor:'#E8DDEB'},room:{aspectRatio:1.35},resident:{position:'absolute'},item:{position:'absolute',right:'1%',bottom:18,width:'51%',height:'62%'}});
