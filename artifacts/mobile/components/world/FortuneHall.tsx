import React,{useEffect,useRef,useState} from 'react';
import {Image,Pressable,StyleSheet,Text,View} from 'react-native';
import {useApp} from '@/contexts/AppContext';
import {useAuth} from '@/contexts/AuthContext';
import {BottomSheet} from '@/components/ui/BottomSheet';
import {WorldPill} from './WorldPill';
import {FORTUNE_CAT_ART} from '@/utils/worldArt';
import {BLOOD_TYPES,MBTI_TYPES,latestFortune,normalizeFortuneInput} from '@/utils/dailyFortune';
import {getTodayDate} from '@/utils/dateUtils';

export function FortuneCat({width,height,disabled,onPress}:{width:number;height:number;disabled:boolean;onPress:()=>void}){
 return <Pressable testID="merchant-fortune" accessibilityRole="button" accessibilityLabel="大きな猫の占い師。今日の運勢を占う" disabled={disabled} onPress={onPress}
  style={{position:'absolute',left:width*.21,top:height*.20,width:width*.58,height:width*.58,zIndex:535}}>
  <Image source={FORTUNE_CAT_ART} resizeMode="contain" style={{width:'100%',height:'100%'}}/>
  <Text style={s.catLabel}>猫の占い師・ルナ</Text>
 </Pressable>;
}
export function FortuneHall({onClose}:{onClose:()=>void}){
 const {profile,feedState,drawFortune}=useApp();
 const {user,isSignedIn,isLoading}=useAuth();
 const account=isLoading?'loading':isSignedIn?`user:${user?.id??'pending'}`:'guest';
 const owner=useRef({account});if(owner.current.account!==account)owner.current={account};
 const scope=owner.current,alive=useRef(true),pending=useRef(false);
 const [input,setInput]=useState(()=>normalizeFortuneInput(profile??{}));
 const [today,setToday]=useState(getTodayDate),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{alive.current=true;const timer=setInterval(()=>setToday(getTodayDate()),15000);return()=>{alive.current=false;clearInterval(timer);};},[]);
 useEffect(()=>{setInput(normalizeFortuneInput(profile??{}));setError('');setBusy(false);pending.current=false;},[scope,profile?.bloodType,profile?.mbti]);
 const reading=latestFortune(feedState.fortune,today);
 const draw=async()=>{
  if(pending.current||isLoading||reading)return;
  pending.current=true;setBusy(true);setError('');
  try{await drawFortune(input);if(alive.current&&owner.current===scope)setToday(getTodayDate());}
  catch{if(alive.current&&owner.current===scope)setError('占いを保存できませんでした。もう一度ためしてにゃ。');}
  finally{if(alive.current&&owner.current===scope){pending.current=false;setBusy(false);}}
 };
 const choices=(field:'bloodType'|'mbti',values:readonly string[])=><View style={s.choices}>{values.map(value=><Pressable key={value} testID={`fortune-${field}-${value}`} accessibilityRole="button" accessibilityState={{selected:input[field]===value}} disabled={busy||isLoading} onPress={()=>setInput({...input,[field]:value})} style={[s.choice,input[field]===value&&s.selected]}><Text style={s.choiceText}>{value}</Text></Pressable>)}</View>;
 return <BottomSheet visible title="月あかりの占い館" subtitle="猫の占い師・ルナ / 1日1回" onClose={onClose}>
  <View style={s.welcome}><Image source={FORTUNE_CAT_ART} style={{width:104,height:118}} resizeMode="contain"/><View style={{flex:1,gap:8}}><Text style={s.eyebrow}>LUNA'S DAILY FORTUNE</Text><Text style={s.copy}>{reading?'今日の星からの便りにゃ。何度でも読み返してね。':'いらっしゃい。血液型とMBTIに、今日の星を重ねてみるにゃ。'}</Text></View></View>
  {reading?<View testID="fortune-result" style={s.result}>
   <Text style={s.eyebrow}>{reading.date} · {reading.bloodType==='不明'?'血液型不明':`${reading.bloodType}型`} · {reading.mbti}</Text>
   <Text accessibilityLabel={`今日の運勢 星${reading.stars}つ`} style={s.stars}>{'★'.repeat(reading.stars)}{'☆'.repeat(5-reading.stars)}</Text>
   <Text style={s.title}>{reading.title}</Text><Text style={s.copy}>{reading.message}</Text>
   <View style={s.divider}/><Text style={s.eyebrow}>今日の小さなアクション</Text><Text style={s.copy}>{reading.advice}</Text>
   <View style={s.divider}/><Text style={s.copy}>ラッキーカラー　{reading.color}{'\n'}ラッキーアイテム　{reading.item}</Text>
   <Text style={s.note}>今日は占い済み。また明日、新しい便りを用意するにゃ。</Text>
  </View>:<View style={{gap:12}}>
   <Text style={s.label}>血液型</Text>{choices('bloodType',BLOOD_TYPES)}
   <Text style={s.label}>MBTI</Text>{choices('mbti',MBTI_TYPES)}
   <Text style={s.note}>登録済みの情報を使っています。ここで選び直すこともできます。わからなくても占えるよ。</Text>
   <WorldPill testID="fortune-draw" primary icon="moon" label={busy?'星の便りを準備中…':'今日の運勢を占う'} disabled={busy||isLoading} onPress={()=>void draw()}/>
  </View>}
  {!!error&&<Text accessibilityRole="alert" style={s.error}>{error}</Text>}
  <Text style={[s.note,{marginTop:16}]}>気分転換のための占いです。あなたの性格や未来を決めるものではありません。</Text>
 </BottomSheet>;
}
const s=StyleSheet.create({
 catLabel:{alignSelf:'center',paddingHorizontal:12,paddingVertical:6,color:'#F1E0BC',fontSize:11,backgroundColor:'#251C31E8',borderWidth:1,borderColor:'#B89C6377',borderRadius:5},
 welcome:{flexDirection:'row',gap:14,alignItems:'center',marginBottom:20},eyebrow:{fontSize:10,letterSpacing:1.2,color:'#BFA571'},copy:{fontSize:14,lineHeight:25,color:'#E4D7ED'},
 label:{fontSize:14,color:'#EFDFCA',fontWeight:'600'},choices:{flexDirection:'row',flexWrap:'wrap',gap:7},choice:{minHeight:44,minWidth:57,justifyContent:'center',alignItems:'center',paddingHorizontal:10,borderWidth:1,borderColor:'#635374',borderRadius:7,backgroundColor:'#2C233B'},selected:{borderColor:'#E3C484',backgroundColor:'#655038'},choiceText:{fontSize:12,color:'#F4EBDD'},
 result:{borderWidth:1,borderColor:'#B4976255',borderRadius:12,padding:20,gap:13,backgroundColor:'#2C213A'},stars:{fontSize:23,letterSpacing:5,color:'#EAC989'},title:{fontSize:22,lineHeight:33,color:'#F9EACB',fontWeight:'600'},divider:{height:1,backgroundColor:'#B4976233',marginVertical:4},note:{fontSize:11,lineHeight:20,color:'#B8A7C3'},error:{fontSize:13,lineHeight:22,color:'#F0BBA6',marginTop:12},
});
