import React,{useEffect,useRef,useState} from 'react';
import {Animated,Easing,Image,Pressable,ScrollView,StyleSheet,Text,View,useWindowDimensions} from 'react-native';
import {useLocalSearchParams,useRouter} from 'expo-router';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {useApp} from '@/contexts/AppContext';
import {useAuth} from '@/contexts/AuthContext';
import {useBattleTrack} from '@/contexts/BattleMusicContext';
import {useRoomActivity} from '@/components/room/useRoomActivity';
import {Enemy} from '@/components/moyamoya/Enemy';
import {BattleCompanion} from '@/components/moyamoya/BattleCompanion';
import {BattleSoundControl} from '@/components/moyamoya/BattleSoundControl';
import {battleChoices,type BattleTurn,type Encounter} from '@/utils/moyamoya';
import {BATTLES,getPattern} from '@/utils/moyamoyaContent';
import {Icon} from '@/components/ui/Icon';

export default function BattleScreen(){const auth=useAuth();return <Battle key={auth.user?.id??'guest'}/>;}
function Battle(){
 const app=useApp(),auth=useAuth(),router=useRouter(),insets=useSafeAreaInsets(),window=useWindowDimensions();
 const {id}=useLocalSearchParams<{id:string}>(),{active,reduceMotion}=useRoomActivity();
 const record=app.getTodayRecord(),saved=record?.moyamoya?.battle;
 const valid=saved?.id===id?saved:undefined;
 const [shown,setShown]=useState<Encounter|undefined>(valid),[feedback,setFeedback]=useState<BattleTurn>(),[result,setResult]=useState(valid?.status==='won'||valid?.status==='lost');
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[target,setTarget]=useState<'hero'|'enemy'|null>(null);
 const lock=useRef(false),alive=useRef(true),beam=useRef(new Animated.Value(0)).current,hit=useRef(new Animated.Value(0)).current;
 const animation=useRef<Animated.CompositeAnimation|null>(null),resolveAnimation=useRef<(()=>void)|null>(null);
 const ready=!app.isLoading&&!app.storageError&&!auth.isLoading&&(!auth.isSignedIn||app.cloudSynced);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;animation.current?.stop();resolveAnimation.current?.();};},[]);
 useEffect(()=>{if(!lock.current){setShown(valid);if(valid?.status==='won'||valid?.status==='lost')setResult(true);}},[valid]);
 useEffect(()=>{if(!active){animation.current?.stop();resolveAnimation.current?.();}},[active]);
 useBattleTrack(result?(shown?.status==='won'?'victory':null):'battle',active&&ready&&!!valid);
 const home=()=>router.replace('/(tabs)?place=home');
 const animate=async(good:boolean)=>{
  setTarget(good?'enemy':'hero');beam.setValue(0);hit.setValue(0);
  if(reduceMotion||!active)return;
  await new Promise<void>(resolve=>{
   resolveAnimation.current=resolve;
   animation.current=Animated.sequence([
    Animated.timing(beam,{toValue:1,duration:430,easing:Easing.out(Easing.quad),useNativeDriver:true}),
    Animated.sequence([1,-1,.7,-.5,0].map(value=>Animated.timing(hit,{toValue:value,duration:85,useNativeDriver:true}))),
    Animated.timing(beam,{toValue:0,duration:160,useNativeDriver:true}),
   ]);animation.current.start(()=>{resolveAnimation.current=null;resolve();});
  });
 };
 const choose=async(actionId:string)=>{
  if(!ready||!shown||lock.current||shown.status!=='active')return;
  lock.current=true;setBusy(true);setError('');
  try{
   const next=await app.runMoyamoya({kind:'turn',id:shown.id,expectedTurn:shown.turns.length,actionId});
   if(!alive.current)return;
   if(next.turn){void Haptics.impactAsync(next.turn.good?Haptics.ImpactFeedbackStyle.Light:Haptics.ImpactFeedbackStyle.Medium).catch(()=>{});await animate(next.turn.good);}
   if(alive.current){setShown(next.encounter);setFeedback(next.turn);setTarget(null);}
  }catch(e){if(alive.current)setError(e instanceof Error?e.message:'保存できませんでした。もう一度お試しください。');}
  finally{lock.current=false;if(alive.current)setBusy(false);}
 };
 const retry=async()=>{
  if(!shown||lock.current)return;lock.current=true;setBusy(true);setError('');
  try{const next=await app.runMoyamoya({kind:'retry',id:shown.id});if(alive.current){setShown(next.encounter);setFeedback(undefined);setResult(false);router.setParams({id:next.encounter.id});}}
  catch(e){if(alive.current)setError(e instanceof Error?e.message:'再開できませんでした。');}
  finally{lock.current=false;if(alive.current)setBusy(false);}
 };
 const button=(label:string,onPress:()=>void,testID:string,secondary=false)=><Pressable testID={testID} accessibilityRole="button" disabled={busy||!ready} onPress={onPress} style={[s.button,secondary&&s.secondary,(busy||!ready)&&{opacity:.5}]}><Text style={[s.buttonText,secondary&&{color:'#795989'}]}>{label}</Text></Pressable>;
 if(!ready||!valid||!shown||valid.id!==shown.id)return <View style={[s.root,{padding:30,paddingTop:insets.top+30,justifyContent:'center',gap:20}]}><Text style={s.title}>{!ready?'記録を準備しています…':'今日のバトルは終了しました。'}</Text><Pressable accessibilityRole="button" onPress={home} style={s.button}><Text style={s.buttonText}>おうちに戻る</Text></Pressable></View>;
 const p=getPattern(shown.pattern)!,won=shown.status==='won',finished=won||shown.status==='lost';
 const stageHeight=Math.max(285,Math.min(360,window.height*.40));
 const shake=hit.interpolate({inputRange:[-1,0,1],outputRange:[-9,0,9]});
 const flash=hit.interpolate({inputRange:[-1,0,1],outputRange:[.38,1,.38]});
 const days=new Set(app.records.filter(r=>r.moyamoya?.participated).map(r=>r.date)).size;
 return <View testID="moyamoya-battle-screen" style={s.root}><ScrollView contentContainerStyle={{paddingTop:insets.top+8,paddingBottom:insets.bottom+24}} showsVerticalScrollIndicator={false}>
  <View style={s.header}><Pressable testID="battle-home" accessibilityRole="button" accessibilityLabel="おうちに戻る。バトルの続きは保存されます" disabled={busy} onPress={home} style={s.back}><Icon name="chevron-left" size={23} color="#715184"/></Pressable><View style={{flex:1}}><Text style={s.eyebrow}>YOKI YOKI</Text><Text style={s.heading}>モヤモヤバトル</Text></View><BattleSoundControl/></View>
  <View style={s.link}><Text style={s.linkTitle}>今日の記録：{p.short}</Text>{!!record?.moyamoya?.memo&&<Text numberOfLines={2} style={s.memo}>{record.moyamoya.memo}</Text>}</View>
  <View style={[s.arena,{height:stageHeight}]}>
   <Image source={require('@/assets/moyamoya/garden.png')} style={StyleSheet.absoluteFill} resizeMode="cover"/>
   <View style={s.arenaWash}/>
   <View style={s.enemyHealth}><Health name={p.name} hp={shown.enemyHp} color={p.color}/></View>
   <Animated.View style={[s.enemy,{transform:[{translateX:target==='enemy'?shake:0}],opacity:target==='enemy'?flash:1},won&&result&&{opacity:.25}]}><Enemy pattern={p.id} size={135}/>{target==='enemy'&&<Text style={s.damage}>−1</Text>}</Animated.View>
   <Animated.View style={[s.hero,{transform:[{translateX:target==='hero'?shake:0}],opacity:target==='hero'?flash:1}]}><BattleCompanion size={155} active={active} reduceMotion={reduceMotion} happy={won}/>{target==='hero'&&<Text style={s.damage}>−1</Text>}</Animated.View>
   <View style={s.heroHealth}><Health name={app.mascotName||'よっきー'} hp={shown.heroHp} color="#96B98E"/></View>
   {target&&!reduceMotion&&<Animated.View pointerEvents="none" style={[s.beam,{backgroundColor:target==='enemy'?'#FFF2AD':'#CBA7EA',opacity:beam,transform:[{rotate:'-28deg'},{scaleX:beam}]}]}/>}
  </View>
  <View style={s.panel}>
   {result?<><Text style={s.eyebrow}>{won?'VICTORY!':'ひと休みしよう'}</Text><Text accessibilityRole="header" style={s.title}>{won?`${p.name}をたおした！`:'今回は負けちゃった。'}</Text><Text style={s.description}>{won?'対処法を2つ見つけたね。気持ちが変わらない日も、ここまでで大丈夫。':'考え方を選び直せるよ。休んでも、よっきーやポイントは減らないよ。'}</Text>
    {won&&<View style={s.reward}><Icon name="star" size={26} color="#B28D43"/><Text style={s.rewardText}>{shown.awarded?`＋${shown.awarded} YOKIポイント`:'今日の10ポイントは受け取り済み'}</Text></View>}
    <View style={s.stamps}><Text style={s.linkTitle}>向き合った日　{Math.min(days,5)} / 5</Text><Text style={s.stampText}>{[0,1,2,3,4].map(i=>i<days?'★':'☆').join('  ')}</Text><Text style={s.memo}>{days>=5?'モヤモヤ雲のクッションを「思い出」に追加したよ。':'5日参加すると、お部屋に飾れるクッションがもらえるよ。'}</Text></View>
    {won&&shown.turns.filter(t=>t.good).map(t=><View key={t.actionId} style={s.tip}><Text style={s.linkTitle}>{t.title}</Text><Text style={s.description}>{t.feedback}</Text></View>)}
    {!won&&button('もう一度、戦う（HP 2で再開）',()=>void retry(),'battle-retry')}
    {button('おうちに戻る',home,'battle-result-home',!won)}
   </>:feedback?<View testID="battle-feedback" style={{gap:14}}><Text accessibilityLiveRegion="polite" style={s.eyebrow}>{feedback.good?`${p.name}に1ダメージ！`:`${app.mascotName||'よっきー'}に1ダメージ`}</Text><Text style={s.title}>{feedback.good?'その一手、いい感じ！':'別の方法も考えてみよう。'}</Text><Text style={s.description}>{feedback.feedback}</Text>{button(finished?'結果を見る':'次の一手へ',()=>{setFeedback(undefined);if(finished)setResult(true);},'battle-next')}</View>:<>
    <Text style={s.eyebrow}>{busy?'こうげき！':`どうする？　${shown.turns.length+1}ターン目`}</Text><Text style={s.question}>{BATTLES[p.id].scenes[shown.enemyHp<2?1:0]}</Text>
    <View style={s.choices}>{battleChoices(shown).map((choice,i)=><Pressable key={choice.id} testID={`battle-choice-${choice.id}`} accessibilityRole="button" disabled={busy} onPress={()=>void choose(choice.id)} style={({pressed})=>[s.choice,pressed&&{backgroundColor:'#E8D9F2'},busy&&{opacity:.5}]}><Text style={s.number}>{i+1}</Text><Text style={s.choiceText}>{choice.title}</Text></Pressable>)}</View>
    <Text style={s.footnote}>対処法を選んで、2回ダメージを与えたら勝ち。自分が2回受けるとひと休みです。</Text>
   </>}
   {!!error&&<Text testID="battle-error" accessibilityRole="alert" style={s.error}>{error}</Text>}
  </View>
 </ScrollView></View>;
}
function Health({name,hp,color}:{name:string;hp:number;color:string}){
 const width=useRef(new Animated.Value(hp/2)).current;
 useEffect(()=>{Animated.timing(width,{toValue:hp/2,duration:280,useNativeDriver:false}).start();},[hp,width]);
 return <View accessible accessibilityLabel={`${name}、HP ${hp} / 2`} style={s.health}><Text numberOfLines={1} style={s.healthName}>{name}</Text><View style={s.healthRow}><Text style={s.hpLabel}>HP</Text><View style={s.track}><Animated.View style={{height:8,borderRadius:5,backgroundColor:color,width:width.interpolate({inputRange:[0,1],outputRange:['0%','100%']})}}/></View><Text style={s.hpLabel}>{hp}/2</Text></View></View>;
}
const s=StyleSheet.create({root:{flex:1,backgroundColor:'#F7F2EC'},header:{paddingHorizontal:14,flexDirection:'row',alignItems:'center',gap:8},back:{width:36,height:44,justifyContent:'center'},eyebrow:{fontSize:12,letterSpacing:1.5,fontWeight:'700',color:'#9370AB'},heading:{fontSize:17,fontWeight:'700',color:'#594064'},link:{margin:16,marginBottom:8,paddingHorizontal:15,paddingVertical:10,borderRadius:15,backgroundColor:'#EEE5F4',gap:4},linkTitle:{fontSize:13,fontWeight:'600',color:'#775488',lineHeight:22},memo:{fontSize:12,lineHeight:20,color:'#8C7A94'},arena:{marginHorizontal:10,borderRadius:25,overflow:'hidden',backgroundColor:'#E5EBDC'},arenaWash:{...StyleSheet.absoluteFillObject,backgroundColor:'#FFF6E818'},enemyHealth:{position:'absolute',top:17,left:15,width:'48%'},heroHealth:{position:'absolute',bottom:25,right:13,width:'46%'},health:{padding:11,borderRadius:16,backgroundColor:'#FFFCF2F2',borderWidth:1.5,borderColor:'#E9DFCD',gap:7},healthName:{fontSize:13,fontWeight:'700',color:'#5C4866'},healthRow:{flexDirection:'row',gap:6,alignItems:'center'},hpLabel:{fontSize:10,fontWeight:'700',color:'#80726D'},track:{flex:1,height:8,borderRadius:5,overflow:'hidden',backgroundColor:'#E4DED8'},enemy:{position:'absolute',top:55,right:4},hero:{position:'absolute',bottom:3,left:9},damage:{position:'absolute',top:10,left:'40%',fontSize:38,fontWeight:'900',color:'#F7EDFF',textShadowColor:'#84549F',textShadowRadius:3,textShadowOffset:{width:1,height:2}},beam:{position:'absolute',left:'22%',top:'57%',width:'59%',height:14,borderRadius:10,borderWidth:3,borderColor:'#FFF9E7',shadowColor:'#E9D0FF',shadowOpacity:1,shadowRadius:16,elevation:8},panel:{padding:19,gap:14,margin:10,marginTop:-2,borderRadius:24,backgroundColor:'#FFFDF8',borderWidth:2,borderColor:'#E9DFEC'},title:{fontSize:22,lineHeight:32,fontWeight:'700',color:'#5A3E6B'},question:{fontSize:16,lineHeight:27,color:'#65516F'},description:{fontSize:14,lineHeight:25,color:'#806C89'},choices:{gap:9},choice:{minHeight:60,borderRadius:17,borderWidth:1.5,borderColor:'#DFD0E8',backgroundColor:'#F6EFF9',padding:13,flexDirection:'row',alignItems:'center',gap:10},number:{fontSize:11,color:'#AA91B7',width:16},choiceText:{fontSize:14,fontWeight:'600',lineHeight:22,color:'#725180',flex:1},footnote:{fontSize:10,lineHeight:18,color:'#9A8BA1'},button:{minHeight:54,borderRadius:27,padding:15,backgroundColor:'#8F6AA5',alignItems:'center',justifyContent:'center'},buttonText:{fontSize:15,fontWeight:'700',lineHeight:23,color:'#FFFCF7'},secondary:{backgroundColor:'#F3EAF7',borderWidth:1,borderColor:'#DBCBE6'},error:{fontSize:13,lineHeight:23,color:'#A35263'},reward:{flexDirection:'row',gap:10,alignItems:'center',padding:16,borderRadius:18,backgroundColor:'#FFF2CD'},rewardText:{fontSize:16,fontWeight:'700',color:'#91713B',flex:1},stamps:{padding:15,borderRadius:18,backgroundColor:'#F4EDF6',gap:6,alignItems:'center'},stampText:{fontSize:27,color:'#BF9E61'},tip:{borderTopWidth:1,borderColor:'#EEE4F2',paddingTop:12,gap:5}});
