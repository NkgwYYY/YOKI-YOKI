import {colors} from '@/constants/theme';
import React,{useEffect,useRef,useState} from 'react';
import {StyleSheet,Text,View} from 'react-native';
import {FeltPressable as Pressable} from '@/components/ui/FeltPressable';
import {BottomSheet} from '@/components/ui/BottomSheet';
import {GiftArt} from './GiftArt';
import {GIFT_TITLES,type CharacterGift} from '@/utils/characterGifts';
import {formatDateJP} from '@/utils/dateUtils';

export function GiftInvitation({gift,onPress}: {gift:CharacterGift;onPress:()=>void}) {
  return <Pressable testID="home-character-gift" accessibilityRole="button" accessibilityLabel={`${gift.from}からの贈りものを受け取る`} onPress={onPress} style={s.invitation}>
    <GiftArt kind={gift.kind} size={64}/><View style={{flex:1,gap:5}}><Text style={s.eyebrow}>{gift.from}から、あなたへ</Text><Text style={s.invitationText}>ねえ、渡したいものがあるんだ。</Text><Text style={s.invitationLink}>なあに？　›</Text></View>
  </Pressable>;
}
export function GiftPresentation({gift,onClose,onReceive,onList}: {gift:CharacterGift;onClose:()=>void;onReceive?:(id:string)=>Promise<CharacterGift>;onList?:()=>void}) {
  const [shown,setShown]=useState(gift),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const pending=useRef(false),alive=useRef(true);
  useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
  const receive=async()=>{
    if(pending.current||!onReceive||shown.receivedDate)return;
    pending.current=true;setBusy(true);setError('');
    try{const saved=await onReceive(shown.id);if(alive.current)setShown(saved);}
    catch{if(alive.current)setError('しまっておく前に、保存をもう一度試してね。贈りものはここにあるよ。');}
    finally{pending.current=false;if(alive.current)setBusy(false);}
  };
  return <BottomSheet visible title={shown.receivedDate?'この子からの贈りもの':'あなたに、あげたくて。'} subtitle={`${shown.from}より`} onClose={()=>{if(!busy)onClose();}} maxHeightRatio={.82}>
    <View testID="character-gift-presentation" style={s.letter}>
      <View style={s.art}><GiftArt kind={shown.kind} size={144}/></View>
      <Text style={s.title}>{GIFT_TITLES[shown.kind]}</Text>
      <Text testID="character-gift-message" style={s.message}>{shown.message}</Text>
      {shown.receivedDate&&<Text testID="character-gift-received-date" style={s.date}>{shown.receivedDate.slice(0,4)}年 {formatDateJP(shown.receivedDate)}に受け取った贈りもの</Text>}
    </View>
    {!!error&&<Text accessibilityRole="alert" style={s.error}>{error}</Text>}
    {!shown.receivedDate&&onReceive?<Pressable testID="character-gift-receive" accessibilityRole="button" disabled={busy} onPress={()=>void receive()} style={[s.button,busy&&{opacity:.6}]}><Text style={s.buttonText}>{busy?'大切にしまっています…':'ありがとう、受け取る'}</Text></Pressable>:<Pressable accessibilityRole="button" onPress={onClose} style={s.button}><Text style={s.buttonText}>大切にしまう</Text></Pressable>}
    {shown.receivedDate&&onList&&<Pressable testID="character-gift-open-history" accessibilityRole="button" onPress={onList} style={s.link}><Text style={s.linkText}>これまでもらったものを見る　›</Text></Pressable>}
  </BottomSheet>;
}
const s=StyleSheet.create({
  invitation:{flexDirection:'row',alignItems:'center',gap:8,padding:12,borderRadius:19,backgroundColor:'#F8EEDD',borderWidth:1,borderColor:'#D7C1A4',marginBottom:12},eyebrow:{fontSize:11,color:'#856A80'},invitationText:{fontSize:14,lineHeight:21,color:'#554254'},invitationLink:{fontSize:12,color:'#806482'},
  letter:{borderRadius:18,backgroundColor:'#F8EFE1',padding:20,gap:13},art:{alignItems:'center'},title:{fontSize:18,lineHeight:26,color:'#574154',textAlign:'center',fontWeight:'600'},message:{fontSize:15,lineHeight:27,color:'#674F62'},date:{fontSize:11,lineHeight:18,color:'#967C85',textAlign:'center'},button:{minHeight:50,borderRadius:14,alignItems:'center',justifyContent:'center',backgroundColor:'#C5ACC9',marginTop:14},buttonText:{color:'#32263D',fontSize:15,fontWeight:'600'},link:{minHeight:44,alignItems:'center',justifyContent:'center'},linkText:{fontSize:13,color:colors.primary},error:{fontSize:13,lineHeight:20,color:colors.danger,paddingTop:12},
});
