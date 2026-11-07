import React from 'react';
import {Image,Pressable,StyleSheet,Text,View} from 'react-native';
import {useRouter} from 'expo-router';
import {Icon} from '@/components/ui/Icon';

/** Bundled, small furniture sprite; opening the wardrobe never waits for a network image. */
export function HomeCloset({width,height,wide,disabled=false,compact=false}:{width:number;height:number;wide:boolean;disabled?:boolean;compact?:boolean}){
 const router=useRouter(),size=width*(wide?.16:.23);
 return <Pressable testID="home-wardrobe" accessibilityRole="button" accessibilityLabel="きせかえ。クローゼットを開く" disabled={disabled} onPress={()=>router.push('/wardrobe')} style={compact?s.compact:[s.furniture,{left:width*(wide?.12:.15),top:height*(wide?.33:.28),width:size,height:size*1.43}]}>
  {!compact&&<Image source={require('@/assets/images/world/closet-v1.webp')} resizeMode="contain" style={[StyleSheet.absoluteFill,{width:size,height:size*1.43}]} accessible={false}/>}
  <View style={[s.label,!compact&&s.furnitureLabel]}><Icon name="shopping-bag" size={14} color="#89659E"/><Text style={s.text}>きせかえ</Text><Icon name="chevron-right" size={14} color="#A58DB1"/></View>
 </Pressable>;
}
const s=StyleSheet.create({furniture:{position:'absolute',zIndex:360,minWidth:44,minHeight:44},compact:{minHeight:44,justifyContent:'center'},label:{minHeight:44,paddingHorizontal:10,borderRadius:17,borderWidth:1,borderColor:'#E8D9C7',backgroundColor:'#FFF8ECEF',flexDirection:'row',justifyContent:'center',alignItems:'center',gap:5,shadowColor:'#6D4A6B',shadowOpacity:.13,shadowRadius:5,shadowOffset:{width:0,height:3}},furnitureLabel:{position:'absolute',bottom:'100%',alignSelf:'center',marginBottom:0,minWidth:112},text:{fontSize:12,fontWeight:'600',color:'#725683'}});
