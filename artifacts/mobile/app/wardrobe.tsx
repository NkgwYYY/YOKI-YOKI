import React from 'react';
import {ScrollView,View,Text,Pressable,StyleSheet} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useRouter} from 'expo-router';
import {useApp} from '@/contexts/AppContext';
import {useAuth} from '@/contexts/AuthContext';
import {CostumeShop} from '@/components/CostumeShop';
import {Icon} from '@/components/ui/Icon';
export default function WardrobeScreen(){
 const app=useApp(),auth=useAuth(),router=useRouter(),safe=useSafeAreaInsets();
 const ready=!app.isLoading&&!app.storageError&&!auth.isLoading&&(!auth.isSignedIn||app.cloudSynced);
 return <View testID="wardrobe-screen" style={[s.root,{paddingTop:safe.top}]}>
  <View style={s.header}><Pressable accessibilityRole="button" accessibilityLabel="おうちに戻る" testID="wardrobe-back" onPress={()=>router.canGoBack()?router.back():router.replace('/(tabs)')} style={s.back}><Icon name="arrow-left" color="#735685" size={22}/></Pressable><Text style={s.title}>クローゼット</Text><View testID="wardrobe-points" accessible accessibilityLabel={`${app.feedState.points}ポイント`} style={s.balance}><Icon name="star" color="#829267" size={16}/><Text style={s.points}>{app.feedState.points} pt</Text></View></View>
  <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[s.content,{paddingBottom:safe.bottom+28}]}>{ready?<CostumeShop key={auth.user?.id??'guest'} closet/>:<Text style={s.loading}>{app.storageError?'保存した着ぐるみを確認できません。おうちに戻って再読み込みしてください。':'クローゼットを準備しています…'}</Text>}</ScrollView>
 </View>;
}
const s=StyleSheet.create({root:{flex:1,backgroundColor:'#FFF9F0'},header:{width:'100%',maxWidth:620,alignSelf:'center',flexDirection:'row',alignItems:'center',gap:8,paddingHorizontal:14,paddingVertical:12},back:{width:44,height:44,borderRadius:22,backgroundColor:'#F0E6F2',alignItems:'center',justifyContent:'center'},title:{flex:1,textAlign:'center',fontSize:20,fontWeight:'600',color:'#5B4667'},balance:{minHeight:44,paddingHorizontal:10,borderRadius:22,borderWidth:1,borderColor:'#E6D9C9',backgroundColor:'#FFFCF5',flexDirection:'row',alignItems:'center',gap:5},points:{fontSize:12,fontWeight:'600',color:'#6E6277'},content:{paddingHorizontal:16,maxWidth:620,width:'100%',alignSelf:'center'},loading:{paddingVertical:32,color:'#786282',lineHeight:24,textAlign:'center'}});
