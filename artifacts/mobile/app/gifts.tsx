import React,{useState} from 'react';
import {Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {useRouter} from 'expo-router';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useAuth} from '@/contexts/AuthContext';
import {useApp} from '@/contexts/AppContext';
import {GiftArt} from '@/components/gifts/GiftArt';
import {GiftPresentation} from '@/components/gifts/GiftPresentation';
import {GIFT_TITLES,readCharacterGifts,type CharacterGift} from '@/utils/characterGifts';
import {formatDateJP} from '@/utils/dateUtils';
import {Icon} from '@/components/ui/Icon';

export default function GiftsScreen(){
  const {user}=useAuth();return <GiftShelf key={user?.id??'guest'}/>;
}
function GiftShelf(){
  const router=useRouter();
  const {feedState,isLoading,cloudSynced}=useApp(),{isSignedIn}=useAuth();
  let gifts:CharacterGift[]=[],error='';
  try{gifts=Object.values(readCharacterGifts(feedState.characterGifts)?.gifts??{}).filter(g=>g.receivedDate).sort((a,b)=>(b.receivedAt??0)-(a.receivedAt??0)||b.id.localeCompare(a.id));}
  catch{error='贈りものを読み込めませんでした。おうちに戻って、もう一度開いてね。';}
  const ready=!isLoading&&(!isSignedIn||cloudSynced);
  return <GiftCollection gifts={gifts} ready={ready} error={error} onHome={()=>router.navigate('/(tabs)')}/>;
}
export function GiftCollection({gifts,ready=true,error='',onHome}:{gifts:CharacterGift[];ready?:boolean;error?:string;onHome:()=>void}){
  const insets=useSafeAreaInsets();
  const [selected,setSelected]=useState<CharacterGift|null>(null);
  return <View style={s.root}>
    <View style={[s.top,{paddingTop:Math.max(insets.top,12)}]}><Pressable accessibilityRole="button" accessibilityLabel="おうちへ戻る" onPress={onHome} style={s.back}><Icon name="chevron-left" size={19} color="#DCCAE3"/><Text style={s.backText}>おうち</Text></Pressable><Text style={s.topText}>この子からの贈りもの</Text></View>
    <ScrollView contentContainerStyle={[s.content,{paddingBottom:insets.bottom+32}]}>
      <Text style={s.eyebrow}>LITTLE GIFTS, WARM MEMORIES</Text><Text style={s.title}>あなたを想って、{ '\n' }持ってきたもの。</Text><Text style={s.intro}>小さな贈りものと、添えられた言葉を{ '\n' }いつでも、ここで。</Text>
      {!ready?<Text style={s.empty}>思い出を開いています…</Text>:error?<Text accessibilityRole="alert" style={s.empty}>{error}</Text>:gifts.length===0?<View testID="character-gifts-empty" style={s.emptyCard}><Icon name="gift" size={32} color="#BAA1C3"/><Text style={s.emptyTitle}>まだ、贈りものはありません。</Text><Text style={s.empty}>これから一緒に過ごす日々の中で、{ '\n' }少しずつ、思い出が増えていくよ。</Text></View>:gifts.map(g=><Pressable key={g.id} testID={`gift-memory-${g.id}`} accessibilityRole="button" accessibilityLabel={`${formatDateJP(g.receivedDate!)}の${GIFT_TITLES[g.kind]}。メッセージを読む`} onPress={()=>setSelected(g)} style={s.card}><GiftArt kind={g.kind} size={96}/><View style={{flex:1,gap:7}}><Text style={s.date}>{g.receivedDate!.slice(0,4)}年 {formatDateJP(g.receivedDate!)}</Text><Text style={s.giftTitle}>{GIFT_TITLES[g.kind]}</Text><Text style={s.from}>{g.from}から</Text><Text style={s.read}>添えられた言葉を読む　›</Text></View></Pressable>)}
    </ScrollView>
    {selected&&<GiftPresentation key={selected.id} gift={selected} onClose={()=>setSelected(null)}/>}
  </View>;
}
const s=StyleSheet.create({root:{flex:1,backgroundColor:'#201A2B'},top:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:18,paddingBottom:12},back:{minHeight:44,flexDirection:'row',gap:3,alignItems:'center'},backText:{fontSize:14,color:'#DCCAE3'},topText:{fontSize:14,color:'#DCCAE3'},content:{width:'100%',maxWidth:660,alignSelf:'center',padding:22,gap:16},eyebrow:{fontSize:10,letterSpacing:2,color:'#BDA4C5',marginTop:18},title:{fontSize:28,lineHeight:42,color:'#F0E3EA',fontWeight:'500'},intro:{fontSize:13,lineHeight:23,color:'#BDA9C3',marginBottom:13},card:{flexDirection:'row',alignItems:'center',gap:12,padding:16,borderRadius:19,backgroundColor:'#F7EDDF'},date:{fontSize:10,color:'#947786'},giftTitle:{fontSize:15,lineHeight:23,color:'#5F455E',fontWeight:'600'},from:{fontSize:12,color:'#856B81'},read:{fontSize:11,color:'#997788'},emptyCard:{alignItems:'center',gap:15,padding:30,borderRadius:20,backgroundColor:'#30253C',marginTop:18},emptyTitle:{fontSize:15,color:'#E1CFE7'},empty:{fontSize:13,lineHeight:24,textAlign:'center',color:'#BFA8C8'}});
