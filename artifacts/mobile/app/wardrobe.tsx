import React from 'react';
import {ScrollView,View,Text,Pressable} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useSharedValue} from 'react-native-reanimated';
import {useRouter} from 'expo-router';
import {useApp} from '@/contexts/AppContext';
import {getMascotStage} from '@/utils/mascotUtils';
import {readWardrobe,COSTUMES} from '@/utils/wardrobe';
import {VolumeResident} from '@/components/world/VolumeResident';
import {CostumeShop} from '@/components/CostumeShop';
export default function WardrobeScreen(){
 const {progress,feedState}=useApp(),router=useRouter(),safe=useSafeAreaInsets(),zero=useSharedValue(0);
 const costume=readWardrobe(feedState.wardrobe).equipped;
 return <ScrollView testID="wardrobe-screen" style={{flex:1,backgroundColor:'#F7F4EF'}} contentContainerStyle={{paddingTop:safe.top+12,paddingBottom:safe.bottom+32,paddingHorizontal:20,gap:20,maxWidth:620,width:'100%',alignSelf:'center'}}>
  <View style={{flexDirection:'row',alignItems:'center',gap:20}}><Pressable accessibilityRole="button" testID="wardrobe-back" onPress={()=>router.back()} style={{minHeight:48,justifyContent:'center'}}><Text style={{fontSize:16,color:'#76637D'}}>戻る</Text></Pressable><Text style={{fontSize:23,fontWeight:'600',color:'#55425F'}}>着ぐるみ</Text></View>
  <View testID="wardrobe-preview" style={{alignItems:'center',gap:10,paddingVertical:12}}><VolumeResident stage={getMascotStage(progress)} size={180} rx={zero} ry={zero} rz={zero} blink={zero} mood="normal" costume={costume}/><Text testID="wardrobe-selected-name" style={{color:'#786780'}}>{costume?`${COSTUMES.find(c=>c.id===costume)?.name}を着用中`:'いつもの姿'}</Text></View>
  <CostumeShop/>
 </ScrollView>;
}
