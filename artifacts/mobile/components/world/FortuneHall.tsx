import Svg,{Path,Circle,Defs,LinearGradient,Stop} from 'react-native-svg';
import React,{useEffect,useRef,useState} from 'react';
import {Image,Pressable,StyleSheet,Text,View} from 'react-native';
import {useApp} from '@/contexts/AppContext';
import {useAuth} from '@/contexts/AuthContext';
import {BottomSheet} from '@/components/ui/BottomSheet';
import {WorldPill} from './WorldPill';
import {FORTUNE_CAT_ART} from '@/utils/worldArt';
import {latestFortune,normalizeFortuneInput} from '@/utils/dailyFortune';
import {formatMbti} from '@/utils/mbti';
import {getTodayDate} from '@/utils/dateUtils';
import Animated from 'react-native-reanimated';
import {useResidentIdle} from '@/components/village/useResidentIdle';

export function FortuneCat({width,height,clearTop,clearBottom,disabled,active,reduceMotion,greeting,onPress}:{width:number;height:number;clearTop:number;clearBottom:number;disabled:boolean;active:boolean;reduceMotion:boolean;greeting:number;onPress:()=>void}){
 const {feedState}=useApp();
 const bell=(feedState.villageStories?.arcs.cat?.episodes.length??0)>=5;
 const top=Math.max(height*.25,clearTop+8);
 const size=Math.min(width*.52,Math.max(110,clearBottom-top-30));
 const motion=useResidentIdle({active,reduceMotion,size,tempo:3200,greeting,strength:.35});
 return <Pressable testID="merchant-fortune" accessibilityRole="button" accessibilityLabel="大きな猫の占い師。今日の運勢を占う" disabled={disabled} onPress={onPress}
  style={{position:'absolute',left:width*.17,top,width:size,height:size,zIndex:535}}>
  <Animated.View testID="merchant-motion-fortune" pointerEvents="none" style={[{width:size,height:size},motion]}><Image source={FORTUNE_CAT_ART} resizeMode="contain" style={{width:'100%',height:'100%'}}/>{bell&&<View style={{position:'absolute',left:'49%',top:'49%',width:size*.11,height:size*.14}}><Svg width="100%" height="100%" viewBox="0 0 30 40"><Defs><LinearGradient id="catMoonBell"><Stop stopColor="#A16E34"/><Stop offset=".5" stopColor="#FFE5A0"/><Stop offset="1" stopColor="#C39046"/></LinearGradient></Defs><Path d="M15 0V7" stroke="#866CA3" strokeWidth="3"/><Path d="M20 8C5 5 0 26 15 31C23 34 29 28 29 23C16 28 9 15 20 8Z" fill="url(#catMoonBell)"/><Circle cx="17" cy="34" r="2" fill="#EAC16F"/></Svg></View>}</Animated.View>
  <Text style={s.catLabel}>猫の占い師・ルナ</Text>
 </Pressable>;
}
export function FortuneHall({onClose}:{onClose:()=>void}){
 const {profile,feedState,drawFortune,isLoading:profileLoading}=useApp();
 const {user,isSignedIn,isLoading}=useAuth();
 const account=isLoading?'loading':isSignedIn?`user:${user?.id??'pending'}`:'guest';
 const owner=useRef({account});if(owner.current.account!==account)owner.current={account};
 const scope=owner.current,alive=useRef(true),pending=useRef(false);
 const input=normalizeFortuneInput(profile??{});
 const [today,setToday]=useState(getTodayDate),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{alive.current=true;const timer=setInterval(()=>setToday(getTodayDate()),15000);return()=>{alive.current=false;clearInterval(timer);};},[]);
 useEffect(()=>{setError('');setBusy(false);pending.current=false;},[scope]);
 const reading=latestFortune(feedState.fortune,today);
 const draw=async()=>{
  if(pending.current||isLoading||profileLoading||reading)return;
  pending.current=true;setBusy(true);setError('');
  try{await drawFortune(input);if(alive.current&&owner.current===scope)setToday(getTodayDate());}
  catch{if(alive.current&&owner.current===scope)setError('占いを保存できませんでした。もう一度ためしてにゃ。');}
  finally{if(alive.current&&owner.current===scope){pending.current=false;setBusy(false);}}
 };
 return <BottomSheet visible title="月あかりの占い館" subtitle="猫の占い師・ルナ / 1日1回" onClose={onClose}>
  <View style={s.welcome}><Image source={FORTUNE_CAT_ART} style={{width:104,height:118}} resizeMode="contain"/><View style={{flex:1,gap:8}}><Text style={s.eyebrow}>LUNA'S DAILY FORTUNE</Text><Text style={s.copy}>{reading?'今日の星からの便りにゃ。何度でも読み返してね。':'いらっしゃい。血液型とMBTIに、今日の星を重ねてみるにゃ。'}</Text></View></View>
  {reading?<View testID="fortune-result" style={s.result}>
   <Text style={s.eyebrow}>{reading.date} · {reading.bloodType==='不明'?'血液型不明':`${reading.bloodType}型`}{'\n'}{formatMbti(reading.mbti)}</Text>
   <Text accessibilityLabel={`今日の運勢 星${reading.stars}つ`} style={s.stars}>{'★'.repeat(reading.stars)}{'☆'.repeat(5-reading.stars)}</Text>
   <Text style={s.title}>{reading.title}</Text><Text style={s.copy}>{reading.message}</Text>
   <View style={s.divider}/><Text style={s.eyebrow}>今日の小さなアクション</Text><Text style={s.copy}>{reading.advice}</Text>
   <View style={s.divider}/><Text style={s.copy}>ラッキーカラー　{reading.color}{'\n'}ラッキーアイテム　{reading.item}</Text>
   <Text style={s.note}>今日は占い済み。また明日、新しい便りを用意するにゃ。</Text>
  </View>:<View style={{gap:12}}>
   <View testID="fortune-profile" style={s.result}>
    <Text style={s.eyebrow}>あなたのプロフィール</Text>
    <Text style={s.copy}>{profileLoading?'読み込み中…':`血液型　${input.bloodType==='不明'?'未設定・不明':`${input.bloodType}型`}\nMBTI　${formatMbti(input.mbti)}`}</Text>
   </View>
   <Text style={s.note}>{input.bloodType==='不明'||input.mbti==='未設定'?'登録済みの情報で占うにゃ。未設定でもそのまま占えます。変更はプロフィールから。':'登録済みの血液型とMBTIで占うにゃ。'}</Text>
   <WorldPill testID="fortune-draw" primary icon="moon" label={busy?'星の便りを準備中…':'今日の運勢を占う'} disabled={busy||isLoading||profileLoading} onPress={()=>void draw()}/>
  </View>}
  {!!error&&<Text accessibilityRole="alert" style={s.error}>{error}</Text>}
  <Text style={[s.note,{marginTop:16}]}>気分転換のための占いです。あなたの性格や未来を決めるものではありません。</Text>
 </BottomSheet>;
}
const s=StyleSheet.create({
 catLabel:{alignSelf:'center',paddingHorizontal:12,paddingVertical:6,color:'#F1E0BC',fontSize:11,backgroundColor:'#251C31E8',borderWidth:1,borderColor:'#B89C6377',borderRadius:5},
 welcome:{flexDirection:'row',gap:14,alignItems:'center',marginBottom:20},eyebrow:{fontSize:10,letterSpacing:1.2,color:'#BFA571'},copy:{fontSize:14,lineHeight:25,color:'#E4D7ED'},
 result:{borderWidth:1,borderColor:'#B4976255',borderRadius:12,padding:20,gap:13,backgroundColor:'#2C213A'},stars:{fontSize:23,letterSpacing:5,color:'#EAC989'},title:{fontSize:22,lineHeight:33,color:'#F9EACB',fontWeight:'600'},divider:{height:1,backgroundColor:'#B4976233',marginVertical:4},note:{fontSize:11,lineHeight:20,color:'#B8A7C3'},error:{fontSize:13,lineHeight:22,color:'#F0BBA6',marginTop:12},
});
