import React from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {useRouter} from 'expo-router';
import {Icon} from '@/components/ui/Icon';

/** The hit area follows the existing cabinet; no separate furniture sprite. */
export function HomeCloset({width,height,wide,disabled=false,compact=false}:{width:number;height:number;wide:boolean;disabled?:boolean;compact?:boolean}){
 const router=useRouter(),targetWidth=Math.max(112,width*(wide?.088:.14));
 return <Pressable testID="home-wardrobe" accessibilityRole="button" accessibilityLabel="きせかえ。クローゼットを開く" disabled={disabled} onPress={()=>router.push('/wardrobe')} style={compact?s.compact:[s.furniture,{left:width*(wide?.468:.463)-targetWidth/2,top:height*(wide?.257:.266)-54,width:targetWidth,height:54+height*(wide?.115:.08)}]}>
  <View style={[s.label,!compact&&s.furnitureLabel]}><Icon name="shopping-bag" size={14} color="#89659E"/><Text style={s.text}>きせかえ</Text><Icon name="chevron-right" size={14} color="#A58DB1"/></View>
 </Pressable>;
}
const s=StyleSheet.create({furniture:{position:'absolute',zIndex:360,minWidth:44,minHeight:44},compact:{minHeight:44,justifyContent:'center'},label:{minHeight:44,paddingHorizontal:10,borderRadius:17,borderWidth:1,borderColor:'#E8D9C7',backgroundColor:'#FFF8ECEF',flexDirection:'row',justifyContent:'center',alignItems:'center',gap:5,shadowColor:'#6D4A6B',shadowOpacity:.13,shadowRadius:5,shadowOffset:{width:0,height:3}},furnitureLabel:{alignSelf:'center',minWidth:112},text:{fontSize:12,fontWeight:'600',color:'#725683'}});
