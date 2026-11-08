import React,{useState} from 'react';
import {Image,StyleSheet,View} from 'react-native';
import {useSharedValue} from 'react-native-reanimated';
import {useApp} from '@/contexts/AppContext';
import {VolumeResident} from '@/components/world/VolumeResident';
import {HomeFurnishings} from '@/components/room/HomeFurnishings';
import {homeOverviewArt} from '@/utils/worldArt';
import {getMascotStage} from '@/utils/mascotUtils';
import {readWardrobe} from '@/utils/wardrobe';
import {readRoomCollection,type RoomProduct} from '@/utils/roomBoutique';

/** The actual room assets and resident renderer; selecting a preview never saves. */
export function RoomSetPreview({product,night=false}:{product:RoomProduct;night?:boolean}){
 const {progress,feedState}=useApp(),[width,setWidth]=useState(340),zero=useSharedValue(0);
 const state={...readRoomCollection(undefined),goods:product.good?[product.good]:[],theme:product.theme??null};
 const height=width*7/4,offset=width*.25,size=width*.30;
 return <View testID="room-set-preview" onLayout={e=>setWidth(e.nativeEvent.layout.width)} style={s.clip}>
  <View pointerEvents="none" style={{position:'absolute',width,height,top:-offset}}>
   <Image testID="room-set-preview-background" source={homeOverviewArt(night,false,product.theme)} resizeMode="stretch" style={{position:'absolute',left:0,top:0,width,height}}/>
   <HomeFurnishings width={width} height={height} customization={{furniture:'none',flower:'none',ownedFurniture:[],ownedFlowers:[],boutique:state}} night={night}/>
   <View style={{position:'absolute',left:width*.5-size/2,top:height*.70-size,width:size,height:size}}><VolumeResident stage={getMascotStage(progress)} size={size} rx={zero} ry={zero} rz={zero} blink={zero} mood="normal" costume={product.costume??readWardrobe(feedState.wardrobe).equipped}/></View>
  </View>
 </View>;
}
const s=StyleSheet.create({clip:{width:'100%',aspectRatio:4/5,borderRadius:26,overflow:'hidden',backgroundColor:'#E8DCCD'}});
