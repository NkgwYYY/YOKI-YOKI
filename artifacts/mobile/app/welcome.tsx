import React,{useState} from 'react';
import {Image,ImageBackground,ScrollView,StyleSheet,Text,View} from 'react-native';
import {Redirect,useRouter} from 'expo-router';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useAuth} from '@/contexts/AuthContext';
import {ACCOUNT_ENABLED} from '@/utils/runtimeConfig';
import {StaticMascot} from '@/components/Mascot';
import {Button} from '@/components/ui/Button';
import {FeltBackground,FeltDecoration} from '@/components/ui/Felt';

/** A quiet native entry. No character worklets start before the room is ready. */
export default function WelcomeScreen(){
 const router=useRouter(),insets=useSafeAreaInsets();
 const {isSignedIn,continueAsGuest}=useAuth();
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 if(isSignedIn||!ACCOUNT_ENABLED)return <Redirect href="/(tabs)"/>;
 const guest=async()=>{
  if(busy)return;setBusy(true);setError('');
  try{await continueAsGuest();router.replace('/(tabs)');}
  catch{setError('保存データを確認できませんでした。もう一度お試しください。');}
  finally{setBusy(false);}
 };
 return <View testID="welcome-screen" style={s.root}><FeltBackground/>
  <ScrollView contentContainerStyle={[s.content,{paddingTop:insets.top+24,paddingBottom:insets.bottom+24}]}>
   <Image source={require('@/assets/images/yoki_logo.png')} resizeMode="contain" style={s.logo}/>
   <Text style={s.eyebrow}>メンタルケア × 育成ゲーム</Text>
   <View style={s.scene}><ImageBackground source={require('@/assets/images/world/nook-overview-day.webp')} resizeMode="cover" style={s.room}>
    <View style={s.mascot}><StaticMascot stage="odango" mood="happy" size={114}/></View>
   </ImageBackground></View>
   <Text style={s.title}>今日のあなたに、{ '\n' }小さな居場所を。</Text>
   <Text style={s.description}>気持ちを記録して、そばにいる子と育つ。{ '\n' }あなたのペースで、はじめましょう。</Text>
   <View style={s.card}><FeltDecoration radius={24}/>
    <Button testID="welcome-register" label="新規登録してはじめる" onPress={()=>router.push('/login?mode=register')} disabled={busy}/>
    <Button testID="welcome-login" label="ログイン" variant="outline" onPress={()=>router.push('/login?mode=login')} disabled={busy}/>
    <Text style={s.note}>ブラウザ版のアカウントをお持ちの方は、{ '\n' }同じメールアドレスで続きを楽しめます。</Text>
   </View>
   <Button testID="welcome-guest" label="登録せずにはじめる" variant="ghost" onPress={guest} loading={busy}/>
   {!!error&&<Text accessibilityRole="alert" style={s.error}>{error}</Text>}
  </ScrollView>
 </View>;
}
const s=StyleSheet.create({
 root:{flex:1,backgroundColor:'#F5EDDE'},content:{alignItems:'center',paddingHorizontal:24,maxWidth:480,width:'100%',alignSelf:'center',gap:14},
 logo:{width:208,height:48,tintColor:'#5B416B'},eyebrow:{fontSize:12,letterSpacing:1.5,color:'#796184'},
 scene:{width:'100%',height:205,borderRadius:30,overflow:'hidden',borderWidth:2,borderColor:'#E1D4BE'},room:{flex:1,alignItems:'center',justifyContent:'flex-end'},mascot:{marginBottom:17},
 title:{fontSize:25,lineHeight:36,fontWeight:'700',color:'#4C3C57',textAlign:'center',marginTop:2},description:{fontSize:14,lineHeight:23,color:'#7B7080',textAlign:'center'},
 card:{width:'100%',padding:18,gap:12,borderRadius:24,backgroundColor:'#FFF8EA',marginTop:4},note:{fontSize:12,lineHeight:19,textAlign:'center',color:'#82748A'},error:{fontSize:13,color:'#A14155',textAlign:'center'},
});
