import React,{useEffect,useRef,useState} from 'react';
import {Image,Platform,Pressable,StyleSheet,Text,View,useWindowDimensions} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useRouter} from 'expo-router';
import Animated,{cancelAnimation,useAnimatedStyle,useSharedValue,withTiming,Easing} from 'react-native-reanimated';
import Svg,{Defs,Ellipse,LinearGradient,Path,Rect,Stop} from 'react-native-svg';
import {useApp} from '@/contexts/AppContext';
import {useRoomActivity} from '@/components/room/useRoomActivity';
import {VillageResident} from '@/components/village/VillageActors';
import {WorldPill} from '@/components/world/WorldPill';
import {useVillageBgm} from '@/components/world/useVillageBgm';
import {getMascotStage} from '@/utils/mascotUtils';
import {backToRoom} from '@/utils/backToRoom';
import {readEggJob,EGG_JOB_LIMIT_MS,type EggReceipt,type EggJobOperation} from '@/utils/eggJob';

const LABELS={raw:'まだ、ほとんど生だった…',good:'おいしく茹でられた！',perfect:'絶妙！とろり、いい茹で加減。',hard:'あらら、茹ですぎちゃった。'};
export default function EggJobScreen(){
  const router=useRouter(),insets=useSafeAreaInsets(),{height}=useWindowDimensions();
  const {active,reduceMotion}=useRoomActivity(),music=useVillageBgm(active);
  const {feedState,runEggJob,progress}=useApp();
  const state=readEggJob(feedState.eggJob),shift=state.active;
  const [receipt,setReceipt]=useState<EggReceipt|null>(state.receipts.at(-1)??null),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const lock=useRef(false),pending=useRef<EggJobOperation|null>(null),mounted=useRef(true);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
  const progressValue=useSharedValue(0);
  const marker=useAnimatedStyle(()=>({left:`${Math.min(98,progressValue.value*100)}%`}));
  const act=async(op:EggJobOperation)=>{
    if(lock.current)return;lock.current=true;setBusy(true);setError('');pending.current=op;
    try{const result=await runEggJob(op);if(mounted.current){setReceipt(result.receipt);pending.current=null;}}
    catch{if(mounted.current)setError('保存できませんでした。もう一度押すと、同じ結果で保存を再開します。');}
    finally{lock.current=false;if(mounted.current)setBusy(false);}
  };
  const finish=()=>{if(shift)void act({kind:'finish',id:shift.id,finishedAt:Date.now()});};
  useEffect(()=>{
    cancelAnimation(progressValue);
    if(!shift){progressValue.value=0;return;}
    const elapsed=Math.max(0,Date.now()-shift.startedAt),remaining=Math.max(0,EGG_JOB_LIMIT_MS-elapsed);
    progressValue.value=Math.min(1,elapsed/EGG_JOB_LIMIT_MS);
    if(!active||error)return;
    progressValue.value=withTiming(1,{duration:remaining,easing:Easing.linear});
    const timer=setTimeout(()=>void act({kind:'finish',id:shift.id,finishedAt:Date.now()}),remaining);
    return()=>{clearTimeout(timer);cancelAnimation(progressValue);};
  },[shift?.id,active,error]);
  const small=height<650;
  return <View testID="egg-job-scene" style={s.root}>
    <Image source={require('@/assets/images/world/egg-kitchen.jpg')} resizeMode="cover" style={[StyleSheet.absoluteFill,{width:'100%',height:'100%'}]}/>
    <View style={[s.top,{top:insets.top+14}]}><WorldPill testID="egg-job-back" compact label="村へ戻る" icon="arrow-left" onPress={()=>backToRoom(router)}/><View style={s.points}><Text style={s.pointText}>{feedState.points} pt</Text></View><WorldPill compact label="BGM" icon={music.enabled?'volume-2':'volume-x'} onPress={music.toggle}/></View>
    <View style={[s.heading,{top:insets.top+78}]}><Text style={s.title}>ゆでたまご屋のバイト</Text><Text style={s.subtitle}>ゆで加減を見て、いい頃合いで引き上げよう。</Text></View>
    <View style={[s.worktop,{top:small?'31%':'35%',height:small?180:270}]}>
      <View style={{position:'absolute',left:'2%',bottom:15}}><VillageResident stage={getMascotStage(progress.level)} size={small?65:88} active={active} reduceMotion={reduceMotion} scarf="#B8A0C9"/></View>
      <Svg testID="egg-job-pot" width="100%" height="100%" viewBox="0 0 320 230">
        <Defs><LinearGradient id="copper" x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#F5CF9C"/><Stop offset=".45" stopColor="#C99571"/><Stop offset="1" stopColor="#90694F"/></LinearGradient></Defs>
        <Ellipse cx="185" cy="201" rx="103" ry="13" fill="#6C453927"/>
        <Path d="M 104 108 L 100 135 Q 56 143 75 108 M 268 107 L 276 133 Q 313 129 298 105" stroke="#AF7958" strokeWidth="11" fill="none"/>
        <Path d="M 96 100 L 108 171 Q 180 218 269 172 L 283 100 Z" fill="url(#copper)" stroke="#976C52" strokeWidth="3"/>
        <Ellipse cx="190" cy="100" rx="94" ry="32" fill="#F0D4AF" stroke="#B08361" strokeWidth="5"/>
        <Ellipse cx="190" cy="101" rx="85" ry="26" fill="#ACCBCD"/>
        {(shift||!receipt)&&<><Ellipse cx="155" cy="95" rx="17" ry="23" fill="#FFF5DF"/><Ellipse cx="190" cy="92" rx="17" ry="23" fill="#FFF9E9"/><Ellipse cx="226" cy="99" rx="17" ry="23" fill="#F1E8D4"/></>}
        {shift&&<><Path d="M 132 72 Q 119 54 135 40 Q 143 31 137 23 M 182 63 Q 173 50 184 36 Q 194 19 185 10 M 232 70 Q 222 52 235 37" stroke="#FFFAE3" strokeWidth="5" fill="none" opacity=".75"/><Ellipse cx="168" cy="111" rx="6" ry="3" fill="none" stroke="#EDFCF5" strokeWidth="2"/><Ellipse cx="213" cy="108" rx="5" ry="3" fill="none" stroke="#EDFCF5" strokeWidth="2"/></>}
        {!shift&&receipt&&<><Ellipse cx="190" cy="65" rx="40" ry="51" fill="#FFFCED" stroke="#E4D9C2" strokeWidth="3"/><Ellipse cx="190" cy="77" rx={receipt.grade==='raw'?29:23} ry={receipt.grade==='raw'?12:receipt.grade==='perfect'?27:23} fill={receipt.grade==='hard'?'#D1BD7D':receipt.grade==='perfect'?'#F5B948':'#E9C568'}/></>}
      </Svg>
    </View>
    <View style={[s.card,{bottom:Math.max(18,insets.bottom+12),padding:small?15:20}]}>
      {shift?<>
        <Text style={s.order}>紫の帯で引き上げると、絶妙な茹で加減。</Text>
        <View testID="egg-job-timing" style={s.track} accessibilityLabel="左から右へ、ゆで加減が進みます。紫の帯が食べごろです。">
          <View style={[s.goodZone,{left:`${(shift.targetMs-650)/100}%`,width:'13%'}]}/><View style={[s.perfectZone,{left:`${(shift.targetMs-220)/100}%`,width:'4.4%'}]}/><Animated.View style={[s.marker,marker]}/>
        </View><View style={s.ends}><Text style={s.hint}>まだ生</Text><Text style={s.hint}>茹ですぎ</Text></View>
      </>:<><Text testID="egg-job-result" accessibilityLiveRegion="polite" style={s.result}>{receipt?LABELS[receipt.grade]:'店長から、ひと鍋まかされたよ。'}</Text><Text style={s.reward}>{receipt?receipt.earned?`お給料 ＋${receipt.earned} pt`:'今回はお給料なし。次のひと鍋で、もう一度。':'絶妙なら30 pt。おいしく茹でられたら12 pt。'}</Text></>}
      {!!error&&<Text accessibilityRole="alert" style={s.error}>{error}</Text>}
      <Pressable testID="egg-job-action" accessibilityRole="button" disabled={busy} onPress={()=>{if(error&&pending.current)void act(pending.current);else if(shift)finish();else void act({kind:'start',id:`egg-${Date.now()}-${Math.random().toString(36).slice(2,9)}`});}} style={[s.action,busy&&{opacity:.5}]}><Text style={s.actionText}>{busy?'保存中…':error?'同じ結果で保存し直す':shift?'いま、引き上げる！':receipt?'もうひと鍋、働く':'卵を茹ではじめる'}</Text></Pressable>
      <Text style={s.hint}>早すぎても、遅すぎてもだめ。食べごろを見つけよう。</Text>
    </View>
  </View>;
}
const s=StyleSheet.create({root:{flex:1,backgroundColor:'#E2C296',overflow:Platform.OS==='web'?'clip' as 'hidden':'hidden'},top:{position:'absolute',left:20,right:20,flexDirection:'row',justifyContent:'space-between',alignItems:'center'},points:{backgroundColor:'#FFF8EDED',borderRadius:20,paddingHorizontal:16,paddingVertical:12},pointText:{fontSize:12,color:'#866294',fontWeight:'700'},heading:{position:'absolute',left:20,right:20,alignItems:'center'},title:{fontSize:23,fontWeight:'700',color:'#654E43',textShadowColor:'#FFF8E8',textShadowRadius:8},subtitle:{fontSize:11,color:'#795F52',marginTop:8,backgroundColor:'#FFF9E5CC',padding:6,borderRadius:10},worktop:{position:'absolute',width:'90%',maxWidth:450,alignSelf:'center'},card:{position:'absolute',width:'90%',maxWidth:440,alignSelf:'center',borderRadius:25,backgroundColor:'#FFF9EFF5',gap:10},order:{fontSize:12,color:'#7E657F',textAlign:'center'},track:{height:25,borderRadius:12,backgroundColor:'#DFDCD1',overflow:'hidden',marginTop:7},goodZone:{position:'absolute',height:'100%',backgroundColor:'#BCABC9'},perfectZone:{position:'absolute',height:'100%',backgroundColor:'#7E5793'},marker:{position:'absolute',width:5,height:'100%',backgroundColor:'#FFFDF8',borderWidth:1,borderColor:'#715978'},ends:{flexDirection:'row',justifyContent:'space-between'},hint:{fontSize:10,color:'#9A8794',textAlign:'center'},result:{fontSize:18,fontWeight:'600',color:'#755581',textAlign:'center'},reward:{fontSize:13,color:'#947057',textAlign:'center',lineHeight:21},action:{minHeight:52,borderRadius:26,backgroundColor:'#826097',justifyContent:'center',alignItems:'center'},actionText:{fontSize:16,fontWeight:'700',color:'#FFFAF3'},error:{color:'#AF5860',fontSize:12,lineHeight:20}});
