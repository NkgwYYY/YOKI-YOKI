import React from 'react';
import {Pressable,StyleSheet,View} from 'react-native';
import {useRouter} from 'expo-router';
import {useReducedMotion} from '@/utils/useReducedMotion';
import {DiaryNotebookGlow} from './DiaryNotebookGlow';
import {Icon} from '@/components/ui/Icon';
/** The shelf itself is the entry. Its hit area never covers the calendar. */
export function HomeCloset({width,height,wide,disabled=false,compact=false}:{width:number;height:number;wide:boolean;disabled?:boolean;compact?:boolean}){
 const router=useRouter(),reduceMotion=useReducedMotion();
 const w=Math.max(44,width*(wide?.088:.14)),h=Math.max(44,height*(wide?.115:.08));
 return <Pressable testID="home-wardrobe" accessibilityRole="button" accessibilityLabel="きせかえ。おみせと持っているものを開く" disabled={disabled} onPress={()=>router.push('/shop')} style={compact?s.compact:[s.shelf,{left:width*(wide?.468:.463)-w/2,top:height*(wide?.257:.266),width:w,height:h}]}>
  <View pointerEvents="none" style={s.glow}><DiaryNotebookGlow active={!disabled} reduceMotion={reduceMotion}/></View>
  {compact&&<Icon name="shopping-bag" size={23} color="#80678B"/>}
 </Pressable>;
}
const s=StyleSheet.create({shelf:{position:'absolute',zIndex:360,minWidth:44,minHeight:44},compact:{width:48,height:48,alignItems:'center',justifyContent:'center'},glow:{position:'absolute',left:'50%',top:'50%',width:0,height:0,opacity:.55,transform:[{translateX:-24},{translateY:-12},{scale:.65}]}});
