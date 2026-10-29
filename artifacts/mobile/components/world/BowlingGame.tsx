import {FeltDecoration} from '@/components/ui/Felt';
import React,{useCallback,useEffect,useRef,useState} from 'react';
import {Image,Platform,StyleSheet,Text,View} from 'react-native';
import {FeltPressable as Pressable} from '@/components/ui/FeltPressable';
import {BowlingLane} from './BowlingLane';
import {LinearGradient} from 'expo-linear-gradient';
import Animated,{cancelAnimation,Easing,runOnJS,useAnimatedReaction,useAnimatedStyle,useSharedValue,withRepeat,withTiming} from 'react-native-reanimated';
import {useApp} from '@/contexts/AppContext';
import {getTodayDate} from '@/utils/dateUtils';
import {BOWLING_MISSIONS,BOWLING_DAILY_LIMIT,bowlingDayStatus,dailyBowlingMission,lanePinPositions,projectLane,simulateBowling,bowlingResultPresentation,type BowlingReceipt,type BowlingFrame,type BowlingInput} from '@/utils/bowling';
import {WorldBowlingPins} from './WorldBowling';
import {StaticMascot} from '@/components/Mascot';
import {VolumeResident,hasResidentVolume} from './VolumeResident';
import {getCharacter,type MascotStage} from '@/utils/mascotUtils';
import {roomWearableFrame} from '@/utils/roomWearable';
import type {ResidentItem} from '@/components/room/RoomResident';

type Props={active:boolean;stage:MascotStage;wear?:ResidentItem;effect?:ResidentItem;mascotName:string;reduceMotion:boolean;onBusy:(busy:boolean)=>void;onClose:()=>void};
const clamp=(n:number,min=-1,max=1)=>Math.max(min,Math.min(max,n));
export function BowlingGame(p:Props){
 const {bowlingState,playBowling}=useApp();
 return <BowlingGameView {...p} bowlingState={bowlingState} playBowling={playBowling}/>;
}

// The view consumes the same daily transaction contract in the app and render checks.
export function BowlingGameView(p:Props&Pick<ReturnType<typeof useApp>,'bowlingState'|'playBowling'>){
 const {bowlingState,playBowling}=p;
 const [today,setToday]=useState(getTodayDate);
 const status=bowlingDayStatus(bowlingState,today),receipt=status.latest,exhausted=status.remaining===0;
 const mission=dailyBowlingMission(today),info=BOWLING_MISSIONS[mission];
 const [aim,setAim]=useState(0),[curve,setCurve]=useState(0),[phase,setPhase]=useState<'aim'|'charge'|'saving'|'rolling'|'result'>('aim');
 const [completedShot,setCompletedShot]=useState<BowlingReceipt|null>(null);
 const result=completedShot?bowlingResultPresentation(completedShot):null;
 const close=useRef(p.onClose);close.current=p.onClose;
 const returned=useRef(false);
 const reveal=useSharedValue(0);
 const [message,setMessage]=useState(''),[resultCount,setResultCount]=useState<number|null>(null),[lastPower,setLastPower]=useState<number|null>(null);
 const [bounds,setBounds]=useState({width:0,height:0}),[trackWidth,setTrackWidth]=useState(1);
 const frames=useSharedValue<BowlingFrame[]>([{x:0,y:0,pins:lanePinPositions(mission)}]),index=useSharedValue(0),running=useSharedValue(false),age=useSharedValue(0);
 const power=useSharedValue(.15),rx=useSharedValue(0),ry=useSharedValue(0),rz=useSharedValue(0),blink=useSharedValue(0);
 const [manualPower,setManualPower]=useState(.7);
 useEffect(()=>{if(p.reduceMotion)power.value=manualPower;},[p.reduceMotion,manualPower,power]);
 const mounted=useRef(true),locked=useRef(false),pendingShot=useRef<{id:string;input:BowlingInput}|null>(null),resultText=useRef('');
 const finish=useCallback(()=>{locked.current=false;setPhase('result');setMessage(resultText.current);},[]);
 const busy=phase==='saving'||phase==='rolling';
 useEffect(()=>{
  if(phase!=='result'){reveal.value=0;return;}
  reveal.value=withTiming(1,{duration:p.reduceMotion?0:280,easing:Easing.out(Easing.cubic)});
  return()=>cancelAnimation(reveal);
 },[phase,p.reduceMotion,reveal]);
 const resultStyle=useAnimatedStyle(()=>({opacity:reveal.value,transform:[{scale:.92+.08*reveal.value}]}));
 // Start after the last pin finishes falling, never while saving or rolling.
 // Backgrounding cancels the timeout so the final result can be read on return.
 useEffect(()=>{
  if(!exhausted||!p.active||busy||pendingShot.current||returned.current)return;
  const timer=setTimeout(()=>{if(!returned.current){returned.current=true;close.current();}},phase==='result'?3600:1800);
  return()=>clearTimeout(timer);
 },[exhausted,p.active,busy,phase]);
 useEffect(()=>{p.onBusy(busy);return()=>p.onBusy(false);},[busy,p.onBusy]);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;running.value=false;cancelAnimation(power);};},[]);
 useEffect(()=>{if(!p.active||busy)return;setToday(getTodayDate());const t=setInterval(()=>setToday(getTodayDate()),15000);return()=>clearInterval(t);},[p.active,busy]);
 useEffect(()=>{if(!p.active&&phase==='charge'){cancelAnimation(power);setPhase('aim');}},[p.active,phase,power]);
 const reset=()=>{cancelAnimation(power);running.value=false;const saved=exhausted&&receipt?.rulesVersion===4?simulateBowling(receipt).frames.at(-1):undefined;frames.value=[saved??{x:0,y:0,pins:lanePinPositions(mission)}];index.value=0;age.value=0;rx.value=0;rz.value=0;setPhase('aim');setMessage('');setResultCount(null);setCompletedShot(null);returned.current=false;pendingShot.current=null;locked.current=false;};
 useEffect(()=>{reset();},[today]);
 useEffect(()=>{
  if(phase!=='rolling'||!p.active){cancelAnimation(age);return;}
  const end=(frames.value.length-1)/60*1000;
  age.value=withTiming(end,{duration:Math.max(0,end-age.value),easing:Easing.linear},done=>{
   if(done){running.value=false;runOnJS(finish)();}
  });
  return()=>cancelAnimation(age);
 },[phase,p.active,finish]);
 useAnimatedReaction(()=>age.value,elapsed=>{
  const next=Math.min(frames.value.length-1,Math.floor(elapsed/1000*60));index.value=next;
  if(!p.reduceMotion)rx.value=-frames.value[next].y*2.2;
 },[p.reduceMotion]);
 const avatarSize=Math.min(66,bounds.width*.18);
 const avatar=useAnimatedStyle(()=>{
  const f=frames.value[Math.min(index.value,frames.value.length-1)],at=projectLane(f.x,f.y);
  return {opacity:f.y>12.5?0:1,zIndex:Math.round(2000-f.y*50),transform:[{translateX:at.x*bounds.width-avatarSize/2},{translateY:at.y*bounds.height-avatarSize*.85},{scale:at.scale}]};
 });
 const fill=useAnimatedStyle(()=>({width:`${power.value*100}%`}));
 const throwShot=async()=>{
  if(locked.current||!p.active||(exhausted&&!pendingShot.current))return;
  cancelAnimation(power);locked.current=true;setPhase('saving');setMessage('');
  const input:BowlingInput={aim,power:p.reduceMotion?manualPower:clamp(power.value,.15,1),curve,rulesVersion:4,mission};
  if(!pendingShot.current)pendingShot.current={id:`lane-${Date.now()}-${Math.random().toString(36).slice(2,9)}`,input};
  const shot=pendingShot.current;setLastPower(shot.input.power);
  try{
   let actual=shot.input,earned=0;
   const saved=await playBowling(shot.id,shot.input);if(!mounted.current)return;if(!saved.accepted){pendingShot.current=null;locked.current=false;setPhase('result');setMessage('今日は5回遊んだね。また遊びたくなったら、会いにきてね。');return;}actual=saved.receipt;earned=saved.receipt.earned;setCompletedShot(saved.receipt);
   if(!mounted.current)return;
   const result=simulateBowling(actual);setResultCount(result.pins);
   const praise=result.pins===10?'STRIKE！':result.missionComplete?'CLEAR！':result.pins===0?'ガター / 届かず':`${result.pins}本ヒット！`;
   resultText.current=`${praise} ＋${earned} pt`;
   frames.value=result.frames;index.value=0;age.value=0;running.value=true;setPhase('rolling');pendingShot.current=null;
  }catch{if(mounted.current){locked.current=false;setPhase('aim');setMessage('保存できませんでした。「もう一度保存」で同じ投球を再試行できます。');}}
 };
 const startCharge=()=>{if(!p.active||busy||(exhausted&&!pendingShot.current))return;if(phase==='result'){reset();return;}if(p.reduceMotion){power.value=manualPower;void throwShot();return;}if(pendingShot.current){void throwShot();return;}setPhase('charge');power.value=.15;if(!p.reduceMotion)power.value=withRepeat(withTiming(1,{duration:850,easing:Easing.linear}),-1,true);};
 const controlsDisabled=!p.active||busy||exhausted||phase==='charge'||phase==='result'||!!pendingShot.current;
 const steer=(value:number)=>{if(!controlsDisabled)setAim(Math.round(clamp(value)*100)/100);};
 return <View testID="bowling-game" style={s.root}>
  <View style={s.heading}><FeltDecoration radius={16}/>
   <View style={{flex:1}}><Text style={s.kicker}>YOKI BOWL · {busy?'ただいま投球中':`本番・1日${BOWLING_DAILY_LIMIT}回まで`} · あと{status.remaining}回</Text><Text style={s.title}>{info.name} {phase==='result'&&resultCount!==null?`${resultCount} / ${info.pins}`:''}</Text></View>
   <Pressable testID="bowling-close" accessibilityRole="button" accessibilityLabel="おうちに戻る" disabled={busy} onPress={p.onClose} style={[s.chip,busy&&{opacity:.4}]}><Text style={s.copy}>‹ おうちに戻る</Text></Pressable>
  </View>
  <View testID="bowling-lane" style={s.lane} onLayout={e=>setBounds(e.nativeEvent.layout)}>
   <BowlingLane aim={aim} curve={curve} guide={!exhausted&&(phase==='aim'||phase==='charge')}/>
   {bounds.width>0&&<><WorldBowlingPins motion={{frames,index,running}} width={bounds.width} height={bounds.height}/>
    <Animated.View testID="bowling-player" accessibilityLabel={`${p.mascotName}がボウリングに挑戦`} pointerEvents="none" style={[{position:'absolute',width:avatarSize,height:avatarSize,transformOrigin:'50% 85%'},avatar]}>
     <View style={{position:'absolute',bottom:0,left:avatarSize*.18,width:avatarSize*.64,height:avatarSize*.1,borderRadius:99,backgroundColor:'#27312755'}}/>
     {p.effect&&<Image source={{uri:p.effect.uri}} style={{position:'absolute',width:avatarSize*p.effect.scale*1.3,height:avatarSize*p.effect.scale*1.3,left:-avatarSize*.15+p.effect.x,top:-avatarSize*.15+p.effect.y}} resizeMode="contain"/>}
     {hasResidentVolume(p.stage)?<VolumeResident stage={p.stage} size={avatarSize} rx={rx} ry={ry} rz={rz} blink={blink} mood="happy" night={false} active={p.active} reduceMotion={p.reduceMotion}/>:<StaticMascot stage={p.stage} size={avatarSize} mood="happy"/>}
     {p.wear&&<Image source={{uri:p.wear.uri}} resizeMode="contain" style={{position:'absolute',...roomWearableFrame(p.wear.id,getCharacter(p.stage).key,avatarSize,p.wear)}}/>}
    </Animated.View>
   </>}
   {phase==='result'&&result&&<View pointerEvents="none" testID="bowling-result" accessibilityLiveRegion="polite" style={s.resultOverlay}>
    <LinearGradient colors={['#11131D00','#11131DC9','#11131D00']} style={StyleSheet.absoluteFill}/>
    <Animated.View style={[s.resultBanner,resultStyle]}>
     <Text style={[s.resultEyebrow,{color:result.success?'#F7DC9B':'#D4CAE7'}]}>{result.detail}</Text>
     <Text testID="bowling-result-title" style={[s.resultTitle,{fontSize:Math.min(68,Math.max(40,bounds.width*.15)),color:result.success?'#FFE3A0':'#EEE2FF'}]}>{result.title}</Text>
     <Text style={s.resultPins}>{completedShot!.pins} / {BOWLING_MISSIONS[completedShot!.mission??mission].pins} 本</Text>
     <Text testID="bowling-result-reward" style={s.resultReward}>＋{completedShot!.earned} pt</Text>
     <Text style={s.resultCopy}>{exhausted?'今日の5回はおしまい。受付へ戻ります。':result.success?'やったね！ 次の一投も楽しもう。':completedShot!.pins>0?'倒したピンの分、ポイントを獲得！':'次は狙いと強さを変えてみよう。'}</Text>
    </Animated.View>
   </View>}
  </View>
  <View style={s.controls}><FeltDecoration radius={18}/>
   <View style={s.row}>
    <Text style={s.hint}>{info.goal} · 達成＋{info.bonus} pt</Text>
   </View>
   <View style={s.row}>
    <Pressable accessibilityRole="button" accessibilityLabel="左へ狙う" disabled={controlsDisabled} onPress={()=>steer(aim-.05)} style={s.arrow}><Text style={s.arrowText}>‹</Text></Pressable>
    <View testID="bowling-aim" accessibilityRole="adjustable" accessibilityLabel="投げる方向" accessibilityValue={{min:-100,max:100,now:Math.round(aim*100)}} accessibilityActions={[{name:'increment',label:'右へ'},{name:'decrement',label:'左へ'}]} onAccessibilityAction={e=>steer(aim+(e.nativeEvent.actionName==='increment'?.05:-.05))} tabIndex={0}
     onLayout={e=>setTrackWidth(e.nativeEvent.layout.width)} onStartShouldSetResponder={()=>!controlsDisabled} onMoveShouldSetResponder={()=>!controlsDisabled} onResponderGrant={e=>steer(e.nativeEvent.locationX/trackWidth*2-1)} onResponderMove={e=>steer(e.nativeEvent.locationX/trackWidth*2-1)}
     {...(Platform.OS==='web'?{onKeyDown:(e:React.KeyboardEvent)=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();steer(aim+(e.key==='ArrowRight'?.05:-.05));}}}:{})} style={s.aim}>
     <View pointerEvents="none" style={s.aimTrack}><View style={s.centerMark}/><View style={[s.aimDot,{left:`${(aim+1)*50}%`}]} /></View><Text pointerEvents="none" style={s.small}>狙い {aim===0?'中央':`${aim<0?'左':'右'} ${Math.abs(Math.round(aim*100))}`}</Text>
    </View>
    <Pressable accessibilityRole="button" accessibilityLabel="右へ狙う" disabled={controlsDisabled} onPress={()=>steer(aim+.05)} style={s.arrow}><Text style={s.arrowText}>›</Text></Pressable>
    {[-1,0,1].map(c=><Pressable key={c} accessibilityRole="button" accessibilityLabel={c===0?'まっすぐ投げる':c<0?'左カーブ':'右カーブ'} accessibilityState={{selected:curve===c}} disabled={controlsDisabled} onPress={()=>setCurve(c)} style={[s.curve,curve===c&&s.selected]}><Text style={s.copy}>{c<0?'↶':c>0?'↷':'↑'}</Text></Pressable>)}
   </View>
   <View style={s.row}>
    <View style={{flex:1,gap:5}}><View style={s.power}><View style={s.powerZone}/><Animated.View style={[s.powerFill,fill]}/></View><Text style={s.small}>{phase==='charge'?'好きな強さで止めて投球':lastPower!==null?`前のパワー ${Math.round(lastPower*100)}%`:'方向 → カーブ → パワー'}</Text></View>
    {p.reduceMotion&&<><Pressable accessibilityRole="button" accessibilityLabel="パワーを下げる" onPress={()=>{const n=clamp(manualPower-.1,.15,1);setManualPower(n);power.value=n;}} disabled={controlsDisabled} style={s.curve}><Text style={s.copy}>−</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel="パワーを上げる" onPress={()=>{const n=clamp(manualPower+.1,.15,1);setManualPower(n);power.value=n;}} disabled={controlsDisabled} style={s.curve}><Text style={s.copy}>＋</Text></Pressable></>}
    <Pressable testID="bowling-throw" accessibilityRole="button" disabled={!p.active||busy||(exhausted&&!pendingShot.current)} onPress={()=>{if(phase==='charge'){void throwShot();}else startCharge();}} style={[s.throw,(!p.active||busy||(exhausted&&!pendingShot.current))&&{opacity:.5}]}><Text style={s.throwText}>{phase==='saving'?'保存中…':phase==='rolling'?'ころころ…':pendingShot.current?'もう一度保存':exhausted?'今日は5回終了':phase==='result'?'もう1回遊ぶ':phase==='charge'?'ここで投げる！':p.reduceMotion?'この強さで投げる':'パワーを決める'}</Text></Pressable>
   </View>
   <Text testID="bowling-feedback" accessibilityLiveRegion="polite" numberOfLines={2} style={s.feedback}> {message||(phase==='rolling'?'ピンの行方を見守ろう…':exhausted?'今日の5回はおしまい。また明日！':receipt?`前の結果 ${receipt.pins}本・＋${receipt.earned} pt。あと${status.remaining}回遊べるよ。`:'いらっしゃい！ 1日5回まで。狙いと強さを決めよう。1本5 pt。')}</Text>
  </View>
 </View>;
}
const s=StyleSheet.create({
 resultOverlay:{...StyleSheet.absoluteFillObject,zIndex:5000,justifyContent:'center',alignItems:'center'},
 resultBanner:{width:'100%',alignItems:'center',paddingHorizontal:16,paddingVertical:28,gap:8},
 resultEyebrow:{fontSize:14,fontWeight:'700',letterSpacing:3},
 resultTitle:{fontWeight:'900',letterSpacing:4,textAlign:'center',textShadowColor:'#100B19',textShadowOffset:{width:0,height:3},textShadowRadius:12},
 resultPins:{fontSize:24,color:'#FFFFFF',fontWeight:'600'},resultReward:{fontSize:31,color:'#8F683A',fontWeight:'800',marginTop:4},
 resultCopy:{fontSize:12,lineHeight:21,color:'#67533F',textAlign:'center',marginTop:8},
 root:{flex:1,borderRadius:15,overflow:'hidden',backgroundColor:'#F6F1E5',borderWidth:1,borderColor:'#C1A47766'},
 heading:{minHeight:53,paddingHorizontal:12,paddingVertical:7,flexDirection:'row',alignItems:'center',gap:5,backgroundColor:'#FFF5E2'},
 kicker:{fontSize:8,letterSpacing:1,color:'#7E6C57'},title:{fontSize:16,color:'#5E4837',fontWeight:'700',marginTop:3},mode:{flexDirection:'row',gap:3},chip:{minHeight:44,paddingHorizontal:9,justifyContent:'center',borderRadius:6},selected:{backgroundColor:'#D4E2C0'},copy:{fontSize:11,color:'#665341'},small:{fontSize:9,color:'#7A6C57'},smallChip:{minHeight:30,minWidth:36,justifyContent:'center',alignItems:'center',borderRadius:5},
 lane:{flex:1,minHeight:110,overflow:'hidden'},laneSign:{position:'absolute',top:'3%',alignSelf:'center',fontSize:10,letterSpacing:3,color:'#DEC58D'},
 controls:{paddingHorizontal:10,paddingTop:4,paddingBottom:6,gap:3,backgroundColor:'#FFF5E2'},row:{flexDirection:'row',alignItems:'center',gap:6,justifyContent:'space-between'},hint:{fontSize:10,color:'#77634F'},arrow:{width:30,height:42,alignItems:'center',justifyContent:'center'},arrowText:{fontSize:28,color:'#6B8054'},aim:{flex:1,minWidth:40,height:44,justifyContent:'center',gap:7},aimTrack:{height:4,borderRadius:4,backgroundColor:'#61736B'},centerMark:{position:'absolute',left:'50%',top:-4,width:1,height:12,backgroundColor:'#BDC9B1'},aimDot:{position:'absolute',top:-5,marginLeft:-6,width:14,height:14,borderRadius:7,backgroundColor:'#F2D69C'},curve:{width:34,height:36,borderRadius:6,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:'#A4AE9644'},
 power:{height:9,borderRadius:5,overflow:'hidden',backgroundColor:'#3F4D50'},powerZone:{position:'absolute',left:'65%',width:'25%',height:'100%',backgroundColor:'#A5BF7466'},powerFill:{height:9,borderRadius:5,backgroundColor:'#E4C788'},throw:{minHeight:44,minWidth:132,paddingHorizontal:12,borderRadius:8,alignItems:'center',justifyContent:'center',backgroundColor:'#D5E2BE'},throwText:{fontSize:12,fontWeight:'700',color:'#29352E'},feedback:{minHeight:32,fontSize:11,lineHeight:16,color:'#6B5947'},
});
