import React,{useState} from 'react';
import {Image,Pressable,StyleSheet,Text,View} from 'react-native';
import {useSharedValue} from 'react-native-reanimated';
import {VolumeResident} from '@/components/world/VolumeResident';
import {useApp} from '@/contexts/AppContext';
import {getMascotStage} from '@/utils/mascotUtils';
import {readWardrobe} from '@/utils/wardrobe';
import {homeEyeArt} from '@/utils/worldArt';
import {roomGoodArt} from '@/utils/roomBoutiqueArt';
import {roomFurnitureSource,roomFlowerSource} from '@/components/room/RoomFurnitureArt';
import type {ShopProduct} from '@/utils/unifiedShop';
const VIEWS=[['front','正面',0,0,0],['angle','斜め',0,.65,0],['side','横',0,Math.PI/2,0],['back','後ろ',0,Math.PI,0],['roll','ころん',0,0,Math.PI/2]] as const;
export function ShopFittingPreview({product,night}:{product:ShopProduct|null;night:boolean}){
 const {progress,feedState}=useApp(),[width,setWidth]=useState(340),[view,setView]=useState('front');
 const rx=useSharedValue(0),ry=useSharedValue(0),rz=useSharedValue(0),blink=useSharedValue(0);
 const costume=product===null?null:product.costume??product.room?.costume??readWardrobe(feedState.wardrobe).equipped;
 const art=product?.room?.good?roomGoodArt(product.room.good):product?.furniture?roomFurnitureSource(product.furniture):product?.flower?roomFlowerSource(product.flower):null;
 const size=Math.min(205,width*.54);
 return <View style={{gap:6}}><View testID="shop-fitting-preview" onLayout={e=>setWidth(e.nativeEvent.layout.width)} style={s.scene}>
  <Image source={homeEyeArt(night,true,product?.room?.theme)} resizeMode="cover" style={[StyleSheet.absoluteFill,{width:'100%',height:'100%'}]}/>
  <View style={[s.resident,{left:width*(art?.38:.5)-size/2,bottom:9}]} pointerEvents="none"><VolumeResident stage={getMascotStage(progress)} size={size} displaySize={size} rx={rx} ry={ry} rz={rz} blink={blink} mood="normal" costume={costume} night={night} reduceMotion/></View>
  {art&&<Image source={art} resizeMode="contain" style={{position:'absolute',right:'4%',bottom:14,width:'31%',height:'45%'}}/>}
 </View><View accessibilityRole="tablist" style={s.views}>{VIEWS.map(([key,label,x,y,z])=><Pressable testID={`shop-view-${key}`} key={key} accessibilityRole="tab" accessibilityState={{selected:view===key}} onPress={()=>{setView(key);rx.value=x;ry.value=y;rz.value=z;}} style={[s.view,view===key&&s.on]}><Text style={s.text}>{label}</Text></Pressable>)}</View></View>;
}
const s=StyleSheet.create({scene:{width:'100%',aspectRatio:1.55,borderRadius:22,overflow:'hidden',backgroundColor:'#E8DDEB'},resident:{position:'absolute'},views:{flexDirection:'row',gap:4},view:{flex:1,minHeight:38,alignItems:'center',justifyContent:'center',borderRadius:16,backgroundColor:'#F5EEE7'},on:{backgroundColor:'#E8DAEE'},text:{fontSize:11,color:'#775F80'}});
