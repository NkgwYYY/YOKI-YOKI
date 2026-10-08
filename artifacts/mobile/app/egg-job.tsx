import React,{useEffect,useRef,useState} from 'react';
import {Image,Platform,Pressable,ScrollView,StyleSheet,Text,View,useWindowDimensions} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useRouter} from 'expo-router';
import {LinearGradient} from 'expo-linear-gradient';
import Animated,{cancelAnimation,useAnimatedStyle,useSharedValue,withTiming,Easing} from 'react-native-reanimated';
import Svg,{Defs,Ellipse,RadialGradient,Stop} from 'react-native-svg';
import {useApp} from '@/contexts/AppContext';
import {useRoomActivity} from '@/components/room/useRoomActivity';
import {MerchantResident} from '@/components/village/MerchantResident';
import {CookingPot} from '@/components/village/CookingPot';
import {WorldPill} from '@/components/world/WorldPill';
import {useVillageBgm} from '@/components/world/useVillageBgm';
import {useKitchenAudio} from '@/components/world/useKitchenAudio';
import {backToRoom} from '@/utils/backToRoom';
import {readEggJob,EGG_JOB_LIMIT_MS,EGG_RECIPES,recipeForTarget,type EggReceipt,type EggJobOperation} from '@/utils/eggJob';
const LABELS={raw:'まだ、生に近いみたい。',good:'おいしく茹でられた！',perfect:'絶妙な、ゆで加減。',hard:'少し、茹ですぎちゃった。'};
const RANKS={raw:'TOO EARLY',good:'GOOD',perfect:'PERFECT',hard:'TOO LATE'};
export default function EggJobScreen(){
 const router=useRouter(),insets=useSafeAreaInsets(),window=useWindowDimensions();
 const {active,reduceMotion}=useRoomActivity(),music=useVillageBgm(active),{feedState,runEggJob}=useApp();
 const state=readEggJob(feedState.eggJob),shift=state.active,audio=useKitchenAudio(active,!!shift);
 const [receipt,setReceipt]=useState<EggReceipt|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[elapsed,setElapsed]=useState(0);
 const lock=useRef(false),pending=useRef<EggJobOperation|null>(null),mounted=useRef(true);
 const progress=useSharedValue(0),lift=useSharedValue(0);
 const order=shift?recipeForTarget(shift.targetMs):EGG_RECIPES[state.receipts.length%EGG_RECIPES.length];
 const marker=useAnimatedStyle(()=>({left:`${Math.min(99,progress.value*100)}%`}));
 const act=async(op:EggJobOperation)=>{
  if(lock.current)return;lock.current=true;setBusy(true);setError('');pending.current=op;
  try{const result=await runEggJob(op);if(mounted.current){setReceipt(result.receipt);pending.current=null;if(result.receipt){audio.finish();lift.value=withTiming(1,{duration:reduceMotion?0:500});}else lift.value=0;}}
  catch{if(mounted.current){audio.finish();setError('保存できませんでした。同じ結果で保存を再開できます。');}}
  finally{lock.current=false;if(mounted.current)setBusy(false);}
 };
 const finish=()=>{if(shift&&!busy){void act({kind:'finish',id:shift.id,finishedAt:Date.now()});}};
 const start=()=>{audio.start();void act({kind:'start',id:`egg-${Date.now()}-${Math.random().toString(36).slice(2,9)}`,recipe:order.id});};
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
 useEffect(()=>{
  cancelAnimation(progress);if(!shift){progress.value=0;setElapsed(0);return;}
  const passed=Math.max(0,Date.now()-shift.startedAt),remaining=Math.max(0,EGG_JOB_LIMIT_MS-passed);setElapsed(passed);progress.value=Math.min(1,passed/EGG_JOB_LIMIT_MS);
  if(!active||error)return;
  progress.value=withTiming(1,{duration:remaining,easing:Easing.linear});
  const tick=setInterval(()=>setElapsed(Math.max(0,Date.now()-shift.startedAt)),100);
  const timer=setTimeout(()=>void act({kind:'finish',id:shift.id,finishedAt:Date.now()}),remaining);
  return()=>{clearInterval(tick);clearTimeout(timer);cancelAnimation(progress);};
 },[shift?.id,active,error]);
 const potSize=Math.min(420,window.width*.93),perfect=shift&&Math.abs(elapsed-shift.targetMs)<220;
 const phase=shift?(elapsed<shift.targetMs-1600?'まだ、じっくり。':elapsed<shift.targetMs-650?'湯気がふわっと、いい香り。':elapsed<=shift.targetMs+650?'食べごろが近い。ザルを引き上げよう。':'火が入りすぎてきた…'):'';
 const previous=state.receipts.slice(-3),combo=(()=>{let n=0;for(let i=state.receipts.length-1;i>=0&&state.receipts[i].grade==='perfect';i--)n++;return n;})();
 return <View testID="egg-job-scene" style={s.root}>
  <Image source={require('@/assets/images/world/egg-workshop-v2.jpg')} resizeMode="cover" style={[StyleSheet.absoluteFill,{width:'100%',height:'100%'}]}/>
  <LinearGradient pointerEvents="none" colors={['#23192ACA','#23192A15','#211724E6']} style={StyleSheet.absoluteFill}/>
  <ScrollView contentContainerStyle={{paddingTop:insets.top+16,paddingBottom:Math.max(24,insets.bottom+16),minHeight:window.height,alignItems:'center'}} showsVerticalScrollIndicator={false}>
   <View style={s.top}><WorldPill testID="egg-job-back" compact label="工房へ戻る" icon="arrow-left" onPress={()=>backToRoom(router)}/><WorldPill compact label={audio.enabled?'調理音を止める':'調理音を鳴らす'} icon={audio.enabled?'volume-2':'volume-x'} onPress={audio.toggle}/></View>
   <View style={s.heading}><Text style={s.kicker}>EGG ATELIER / PART-TIME WORK</Text><Text style={s.title}>ゆでたまご工房</Text><Text style={s.wallet}>✦ {feedState.points} pt</Text></View>
   <View style={s.order}><MerchantResident kind="job" size={64} active={active} reduceMotion={reduceMotion}/><View style={{flex:1,gap:5}}><Text style={s.orderLabel}>{shift?'調理中のご注文':receipt?'次のご注文':'店長からのご注文'}</Text><Text testID="egg-job-order" style={s.orderName}>{order.name}</Text><Text style={s.orderCopy}>{order.description}</Text></View><Text style={s.orderNumber}>{String(state.receipts.length+1).padStart(2,'0')}</Text></View>
   <Pressable testID="egg-job-basket" accessibilityRole="button" accessibilityLabel="ザルを引き上げる" disabled={!shift||busy} onPress={finish} style={{alignItems:'center',width:potSize,height:potSize*.90,marginTop:8}}>
    <CookingPot size={potSize} boiling={!!shift} active={active} reduceMotion={reduceMotion} lift={lift}/>
   </Pressable>
   <View style={[s.panel,{width:Math.min(460,window.width-36)}]}>
    {shift?<><View style={s.row}><Text style={s.kicker}>COOKING</Text><Text style={s.time}>{(Math.min(elapsed,10000)/1000).toFixed(1)} s</Text></View><Text accessibilityLiveRegion="polite" style={[s.phase,perfect&&{color:'#FFE0A0'}]}>{phase}</Text>
     <View testID="egg-job-timing" accessibilityLabel="金色の目印が、注文の食べごろです" style={s.track}>
      <View style={[s.goodZone,{left:`${(shift.targetMs-650)/100}%`,width:'13%'}]}/><View style={[s.perfectZone,{left:`${(shift.targetMs-220)/100}%`,width:'4.4%'}]}/><Animated.View style={[s.marker,marker]}><Text style={s.needle}>◆</Text></Animated.View>
     </View><View style={s.row}><Text style={s.hint}>やわらかい</Text><Text style={s.hint}>火が通る</Text></View>
    </>:receipt?<View testID="egg-job-result" style={s.resultRow}><Svg width={83} height={96} viewBox="0 0 100 120"><Defs><RadialGradient id="yolk"><Stop offset="0" stopColor={receipt.grade==='hard'?'#E6D992':'#FFDE71'}/><Stop offset="1" stopColor={receipt.grade==='hard'?'#B9AA71':'#F3A134'}/></RadialGradient><RadialGradient id="white"><Stop offset="0" stopColor="#FFFFFF"/><Stop offset="1" stopColor="#E6D4BE"/></RadialGradient></Defs><Ellipse cx="50" cy="109" rx="40" ry="8" fill="#A58B6D33"/><Ellipse cx="50" cy="57" rx="40" ry="50" fill="url(#white)"/><Ellipse cx="50" cy="69" rx={receipt.grade==='raw'?29:25} ry={receipt.grade==='raw'?13:receipt.grade==='perfect'?29:24} fill="url(#yolk)"/><Ellipse cx="43" cy="56" rx="11" ry="6" fill="#FFF2BF66"/></Svg><View style={{flex:1,gap:7}}><Text style={s.rank}>{RANKS[receipt.grade]}</Text><Text style={s.result}>{LABELS[receipt.grade]}</Text><Text testID="egg-job-pay" style={s.reward}>{receipt.earned?`お給料 ＋${receipt.earned} pt`:'今回は報酬なし'}</Text>{receipt.targetMs!==undefined&&<Text style={s.hint}>食べごろとの差 {((receipt.elapsed-receipt.targetMs)/1000).toFixed(2)} 秒</Text>}</View></View>:<><Text style={s.phase}>注文に合わせて、ひと鍋ずつ。</Text><Text style={s.copy}>卵を茹ではじめたら、鍋と湯気に注目。{ '\n' }金色の目印で、ザルを引き上げよう。</Text></>}
    {!!error&&<Text accessibilityRole="alert" style={s.error}>{error}</Text>}
    <WorldPill testID="egg-job-action" primary label={busy?'保存中…':error?'同じ結果で保存し直す':shift?'ザルを引き上げる':receipt?'次の注文を受ける':'卵を茹ではじめる'} icon={shift?'arrow-up':'play'} disabled={busy} onPress={()=>{if(error&&pending.current)void act(pending.current);else if(shift)finish();else start();}} style={{minHeight:52}}/>
    <View style={s.row}><Text style={s.hint}>絶妙 30 pt / おいしい 12 pt</Text><Text style={s.hint}>{combo>=2?`${combo} 回連続 PERFECT`:'早すぎ・茹ですぎ 0 pt'}</Text></View>
    {!!audio.blocked&&<Text style={s.hint}>右上の音ボタンで、調理音を再開できます。</Text>}
   </View>
   <View style={s.history}><Text style={s.historyLabel}>最近の仕上がり</Text>{previous.map((r,i)=><View key={r.id} style={s.stamp}><Text style={{fontSize:9,color:r.grade==='perfect'?'#EDCD91':'#C6B5C8'}}>{i+1} / {RANKS[r.grade]}</Text></View>)}</View>
   <WorldPill compact label="BGM" icon={music.enabled?'music':'volume-x'} onPress={music.toggle}/>
  </ScrollView>
 </View>;
}
const s=StyleSheet.create({root:{flex:1,backgroundColor:'#362637',overflow:Platform.OS==='web'?'clip' as 'hidden':'hidden'},top:{width:'100%',paddingHorizontal:20,flexDirection:'row',justifyContent:'space-between',alignItems:'center'},wallet:{color:'#EAD6AA',fontSize:12,letterSpacing:1},heading:{alignItems:'center',gap:9,marginTop:21,marginBottom:21},kicker:{fontSize:8,letterSpacing:2.1,color:'#D6BB91'},title:{fontSize:26,letterSpacing:3,fontWeight:'500',color:'#FFF0D9'},order:{width:'89%',maxWidth:450,flexDirection:'row',alignItems:'center',gap:9,padding:9,borderTopWidth:1,borderBottomWidth:1,borderColor:'#CFB28D77',backgroundColor:'#362A38BD'},orderLabel:{fontSize:9,color:'#CBBBCE',letterSpacing:1},orderName:{fontSize:17,color:'#FBEAD3',fontWeight:'600'},orderCopy:{fontSize:10,lineHeight:17,color:'#D4C2CF'},orderNumber:{fontSize:24,fontWeight:'200',color:'#B49772',paddingRight:6},panel:{padding:18,gap:13,borderRadius:8,backgroundColor:'#261D30EE',borderWidth:1,borderColor:'#BFA57988'},row:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:10},time:{color:'#DECDB3',fontSize:15,fontVariant:['tabular-nums'],letterSpacing:1},phase:{fontSize:14,color:'#F1DECB',textAlign:'center',lineHeight:23},copy:{color:'#C5B2CA',fontSize:12,lineHeight:23,textAlign:'center'},track:{height:19,backgroundColor:'#584B58',borderRadius:3,borderWidth:1,borderColor:'#8F7A8580',marginTop:8},goodZone:{position:'absolute',height:'100%',backgroundColor:'#AD94655A'},perfectZone:{position:'absolute',height:'100%',backgroundColor:'#E7C57F'},marker:{position:'absolute',top:-8,height:33,width:2,backgroundColor:'#FFFAEE'},needle:{position:'absolute',top:-2,left:-4,color:'#FFEEBD',fontSize:10},hint:{fontSize:9,color:'#BEACC5',lineHeight:17},resultRow:{flexDirection:'row',gap:16,alignItems:'center'},rank:{fontSize:11,letterSpacing:2.6,color:'#E9CC92'},result:{fontSize:17,color:'#F6E9D9',lineHeight:25},reward:{fontSize:14,color:'#E4C28E',letterSpacing:.5},error:{fontSize:12,lineHeight:20,color:'#E9B4C5'},history:{flexDirection:'row',flexWrap:'wrap',gap:7,alignItems:'center',justifyContent:'center',marginVertical:18},historyLabel:{fontSize:9,color:'#CBB8CD',marginRight:4},stamp:{borderBottomWidth:1,borderColor:'#A68C6577',padding:5}});
