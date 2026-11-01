import React from 'react';
import {ScrollView,StyleSheet,Text,View} from 'react-native';
import {useRouter} from 'expo-router';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {WorldPill} from '@/components/world/WorldPill';
import {Icon} from '@/components/ui/Icon';
import {FRIEND_VISITS_STATUS} from '@/utils/community/release';

export function FriendsComingSoon() {
  const router=useRouter(),insets=useSafeAreaInsets();
  const back=()=>router.canGoBack()?router.back():router.replace('/(tabs)');
  return <ScrollView testID="friends-coming-soon" style={s.root} contentContainerStyle={[s.content,{paddingTop:insets.top+20,paddingBottom:insets.bottom+32}]}>
    <View style={{alignItems:'flex-start'}}><WorldPill compact label="おうちへ戻る" icon="arrow-left" onPress={back}/></View>
    <View style={s.intro}>
      <View style={s.icon}><Icon name="users" size={42} color="#D7C2E2"/></View>
      <Text style={s.status}>{FRIEND_VISITS_STATUS}</Text>
      <Text style={s.title}>友だちのおうち</Text>
      <Text style={s.lead}>この子と一緒に、友だちに会いに。</Text>
      <Text style={s.copy}>友だちのおうちへ遊びに行ける機能を、{ '\n' }有料オプションとして準備しています。</Text>
      <Text style={s.note}>公開時期や料金は、決まり次第お知らせします。</Text>
    </View>
  </ScrollView>;
}
const s=StyleSheet.create({root:{flex:1,backgroundColor:'#211D2A'},content:{paddingHorizontal:24,flexGrow:1},intro:{alignItems:'center',paddingTop:68,paddingBottom:44,gap:18},icon:{width:94,height:94,borderRadius:30,backgroundColor:'#352C40',alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:'#594665'},status:{fontSize:12,color:'#D8C5B1',letterSpacing:1},title:{fontSize:28,fontWeight:'600',color:'#FBF4E9'},lead:{fontSize:16,lineHeight:26,color:'#EBDFEE',textAlign:'center'},copy:{fontSize:14,lineHeight:26,color:'#D1C5DA',textAlign:'center'},note:{fontSize:12,lineHeight:22,color:'#BAAFC5',textAlign:'center',marginTop:10}});
