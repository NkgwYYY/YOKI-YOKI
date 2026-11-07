import React from 'react';
import {Image,StyleSheet,Text,View,useWindowDimensions} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {useSharedValue} from 'react-native-reanimated';
import {useApp} from '@/contexts/AppContext';
import {getMascotStage} from '@/utils/mascotUtils';
import {VolumeResident} from '@/components/world/VolumeResident';
import {COSTUMES,readWardrobe} from '@/utils/wardrobe';
import type {CostumeId} from '@/utils/costumeGeometry';

export function WardrobePreview({selected}:{selected:CostumeId|null}){
 const {progress,feedState}=useApp(),zero=useSharedValue(0),window=useWindowDimensions();
 const wardrobe=readWardrobe(feedState.wardrobe),wearing=selected===wardrobe.equipped;
 const size=Math.min(220,window.width*.57),height=Math.min(310,Math.max(235,window.height*.33));
 return <View testID="wardrobe-preview" style={[s.scene,{height}]}>
  <Image source={require('@/assets/images/world/nook-eye-day.webp')} resizeMode="cover" style={[StyleSheet.absoluteFill,{width:'100%',height:'100%'}]} accessible={false}/>
  <View pointerEvents="none" style={[StyleSheet.absoluteFill,{backgroundColor:'#FBEBD92E'}]}/>
  <View pointerEvents="none" style={s.rug}/>
  <View pointerEvents="none" style={{marginTop:8}}><VolumeResident stage={getMascotStage(progress)} size={size} rx={zero} ry={zero} rz={zero} blink={zero} mood="normal" costume={selected}/></View>
  <LinearGradient pointerEvents="none" colors={['#FFF9F000','#FFF9F0']} style={s.fade}/>
  <View style={s.caption}><Text testID="wardrobe-selected-name" style={s.name}>{selected?`${COSTUMES.find(c=>c.id===selected)?.name}のきぐるみ`:'いつもの姿'}</Text><View style={s.badge}><Text testID="wardrobe-preview-status" style={s.badgeText}>{wearing?'着用中':selected&&wardrobe.owned.includes(selected)?'もっている':'試着中'}</Text></View></View>
 </View>;
}
const s=StyleSheet.create({scene:{borderRadius:28,overflow:'hidden',alignItems:'center',justifyContent:'center',backgroundColor:'#E5D7E9'},rug:{position:'absolute',width:'84%',height:'34%',bottom:44,borderRadius:100,borderWidth:3,borderColor:'#F6DEC9',backgroundColor:'#E7CDBE',transform:[{scaleY:.65}],shadowColor:'#5F4550',shadowOpacity:.2,shadowRadius:10,shadowOffset:{width:0,height:8}},fade:{position:'absolute',left:0,right:0,bottom:0,height:95},caption:{position:'absolute',left:10,right:10,bottom:16,flexDirection:'row',flexWrap:'wrap',alignItems:'center',justifyContent:'center',gap:8},name:{fontSize:17,lineHeight:25,fontWeight:'600',color:'#614D6D'},badge:{paddingHorizontal:10,paddingVertical:4,borderRadius:12,backgroundColor:'#8D719C'},badgeText:{fontSize:11,color:'#FFFDF8',fontWeight:'600'}});
