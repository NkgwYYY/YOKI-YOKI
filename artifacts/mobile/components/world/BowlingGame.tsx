import React,{useCallback,useEffect,useRef,useState} from 'react';
import {Image,Platform,Pressable,StyleSheet,Text,View} from 'react-native';
import Svg,{Defs,LinearGradient,Stop,Polygon,Line,Path,Circle,Rect} from 'react-native-svg';
import Animated,{cancelAnimation,Easing,runOnJS,useAnimatedReaction,useAnimatedStyle,useSharedValue,withRepeat,withTiming} from 'react-native-reanimated';
import {useApp} from '@/contexts/AppContext';
import {getTodayDate} from '@/utils/dateUtils';
import {BOWLING_MISSIONS,dailyBowlingMission,lanePinPositions,projectLane,simulateBowling,type BowlingFrame,type BowlingInput,type BowlingMissionId} from '@/utils/bowling';
import {WorldBowlingPins} from './WorldBowling';
import {StaticMascot} from '@/components/Mascot';
import {VolumeResident,hasResidentVolume} from './VolumeResident';
import {getCharacter,type MascotStage} from '@/utils/mascotUtils';
import {roomWearableFrame} from '@/utils/roomWearable';
import type {ResidentItem} from '@/components/room/RoomResident';

type Props={active:boolean;stage:MascotStage;wear?:ResidentItem;effect?:ResidentItem;mascotName:string;reduceMotion:boolean;onBusy:(busy:boolean)=>void};
const clamp=(n:number,min=-1,max=1)=>Math.max(min,Math.min(max,n));
const point=(x:number,y:number)=>{const p=projectLane(x,y);return `${p.x*1000},${p.y*1000}`;};
const quad=(left:number,right:number)=>[point(left,0),point(right,0),point(right,12),point(left,12)].join(' ');
function Lane({aim,curve,guide}:{aim:number;curve:number;guide:boolean}){
 const start=projectLane(0,.2),end=projectLane(aim*.55,5);
 return <Svg width="100%" height="100%" viewBox="0 0 1000 1000" preserveAspectRatio="none">
  <Defs>
   <LinearGradient id="laneWood" x1="0" y1="0" x2="0" y2="1"><Stop stopColor="#A97943"/><Stop offset=".55" stopColor="#E2B875"/><Stop offset="1" stopColor="#F2D198"/></LinearGradient>
   <LinearGradient id="gutter" x1="0" y1="0" x2="1" y2="0"><Stop stopColor="#273A36"/><Stop offset=".5" stopColor="#64736A"/><Stop offset="1" stopColor="#26342F"/></LinearGradient>
   <LinearGradient id="surround" x1="0" y1="0" x2="0" y2="1"><Stop stopColor="#152C30"/><Stop offset="1" stopColor="#425E4C"/></LinearGradient>
  </Defs>
  <Rect width="1000" height="1000" fill="url(#surround)"/>
  <Path d="M0 145 Q140 65 290 146 M710 146 Q860 65 1000 145" stroke="#BDA875" strokeWidth="2" opacity=".45" fill="none"/>
  <Rect x="319" y="95" width="362" height="108" rx="12" fill="#152320" stroke="#BBA06D" strokeWidth="3"/>
  <Polygon points={quad(-1.26,1.26)} fill="#76532F" stroke="#D9B778" strokeWidth="5"/>
  <Polygon points={quad(-1.2,-1)} fill="url(#gutter)"/><Polygon points={quad(1,1.2)} fill="url(#gutter)"/>
  <Polygon points={quad(-1,1)} fill="url(#laneWood)"/>
  {Array.from({length:20},(_,i)=>{const x=-1+i*.1,a=projectLane(x,0),b=projectLane(x,12);return <Line key={i} x1={a.x*1000} y1={a.y*1000} x2={b.x*1000} y2={b.y*1000} stroke={i%2?'#FFF1C2':'#876443'} strokeWidth={i%2?2:1} opacity=".32"/>;})}
  {Array.from({length:14},(_,i)=>{const y=.3+i*.8,a=projectLane(-1,y),b=projectLane(1,y);return <Line key={i} x1={a.x*1000} y1={a.y*1000} x2={b.x*1000} y2={b.y*1000} stroke="#A37A49" strokeWidth="1" opacity=".22"/>;})}
  <Polygon points={[point(-1,.65),point(1,.65),point(1,.72),point(-1,.72)].join(' ')} fill="#664E40"/>
  {[-.6,-.4,-.2,0,.2,.4,.6].map(x=>{const p=projectLane(x,2.3-Math.abs(x));return <Path key={x} d={`M${p.x*1000-7} ${p.y*1000+10} L${p.x*1000} ${p.y*1000-9} L${p.x*1000+7} ${p.y*1000+10}Z`} fill="#876A40"/>;})}
  {guide&&<><Path d={`M${start.x*1000} ${start.y*1000} Q${start.x*1000+aim*190} ${start.y*1000-160} ${end.x*1000+curve*18} ${end.y*1000}`} stroke="#FFF5C4" strokeWidth="4" strokeDasharray="12 12" fill="none" opacity=".8"/><Circle cx={end.x*1000+curve*18} cy={end.y*1000} r="8" fill="#FFF1BB"/></>}
 </Svg>;
}
export function BowlingGame(p:Props){
 const {bowlingState,playBowling}=useApp();
 const [today,setToday]=useState(getTodayDate),[practice,setPractice]=useState(true),[practiceMission,setPracticeMission]=useState<BowlingMissionId>('strike');
 const receipt=Object.values(bowlingState.plays).find(r=>r.date>=today);
 const mission=practice?practiceMission:dailyBowlingMission(today),info=BOWLING_MISSIONS[mission];
 const [aim,setAim]=useState(0),[curve,setCurve]=useState(0),[phase,setPhase]=useState<'aim'|'charge'|'saving'|'rolling'|'result'>('aim');
 const [message,setMessage]=useState(''),[resultCount,setResultCount]=useState<number|null>(null),[lastPower,setLastPower]=useState<number|null>(null);
 const [bounds,setBounds]=useState({width:0,height:0}),[trackWidth,setTrackWidth]=useState(1);
 const frames=useSharedValue<BowlingFrame[]>([{x:0,y:0,pins:lanePinPositions(mission)}]),index=useSharedValue(0),running=useSharedValue(false),age=useSharedValue(0);
 const power=useSharedValue(.15),rx=useSharedValue(0),ry=useSharedValue(0),rz=useSharedValue(0),blink=useSharedValue(0);
 const [manualPower,setManualPower]=useState(.7);
 useEffect(()=>{if(p.reduceMotion)power.value=manualPower;},[p.reduceMotion,manualPower,power]);
 const mounted=useRef(true),locked=useRef(false),pendingShot=useRef<{id:string;input:BowlingInput}|null>(null),resultText=useRef('');
 const finish=useCallback(()=>{locked.current=false;setPhase('result');setMessage(resultText.current);},[]);
 const busy=phase==='saving'||phase==='rolling';
 useEffect(()=>{p.onBusy(busy);return()=>p.onBusy(false);},[busy,p.onBusy]);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;running.value=false;cancelAnimation(power);};},[]);
 useEffect(()=>{if(!p.active||busy)return;setToday(getTodayDate());const t=setInterval(()=>setToday(getTodayDate()),15000);return()=>clearInterval(t);},[p.active,busy]);
 useEffect(()=>{if(!p.active&&phase==='charge'){cancelAnimation(power);setPhase('aim');}},[p.active,phase,power]);
 const reset=()=>{frames.value=[{x:0,y:0,pins:lanePinPositions(mission)}];index.value=0;age.value=0;rx.value=0;rz.value=0;setPhase('aim');setMessage('');setResultCount(null);pendingShot.current=null;locked.current=false;};
 useEffect(()=>{reset();},[mission,practice,today]);
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
  if(locked.current||!p.active||(!practice&&receipt))return;
  cancelAnimation(power);locked.current=true;setPhase('saving');setMessage('');
  const input:BowlingInput={aim,power:p.reduceMotion?manualPower:clamp(power.value,.15,1),curve,rulesVersion:4,mission};
  if(!pendingShot.current)pendingShot.current={id:`lane-${Date.now()}-${Math.random().toString(36).slice(2,9)}`,input};
  const shot=pendingShot.current;setLastPower(shot.input.power);
  try{
   let actual=shot.input,earned=0;
   if(!practice){const saved=await playBowling(shot.id,shot.input);if(!mounted.current)return;if(!saved.accepted){locked.current=false;setPhase('result');setMessage('今日の挑戦は終了。練習は何度でも遊べるよ。');return;}actual=saved.receipt;earned=saved.receipt.earned;}
   if(!mounted.current)return;
   const result=simulateBowling(actual);setResultCount(result.pins);
   const praise=result.pins===10?'STRIKE！':result.missionComplete?'CLEAR！':result.pins===0?'ガター / 届かず':`${result.pins}本ヒット！`;
   resultText.current=`${praise} ${practice?'練習・報酬なし':`＋${earned} pt`}`;
   frames.value=result.frames;index.value=0;age.value=0;running.value=true;setPhase('rolling');pendingShot.current=null;
  }catch{if(mounted.current){locked.current=false;setPhase('aim');setMessage('保存できませんでした。「もう一度保存」で同じ投球を再試行できます。');}}
 };
 const startCharge=()=>{if(p.reduceMotion){power.value=manualPower;void throwShot();return;}if(pendingShot.current){void throwShot();return;}setPhase('charge');power.value=.15;if(!p.reduceMotion)power.value=withRepeat(withTiming(1,{duration:850,easing:Easing.linear}),-1,true);};
 const controlsDisabled=!p.active||busy||phase==='charge'||!!pendingShot.current;
 const steer=(value:number)=>{if(!controlsDisabled)setAim(Math.round(clamp(value)*100)/100);};
 return <View testID="bowling-game" style={s.root}>
  <View style={s.heading}>
   <View style={{flex:1}}><Text style={s.kicker}>{practice?'PRACTICE':'DAILY CHALLENGE'} · {practice?'何度でも':receipt?'今日は挑戦済み':'1日1回'}</Text><Text style={s.title}>{info.name.replace('の日','')} {phase==='result'&&resultCount!==null?`${resultCount} / ${info.pins}`:''}</Text></View>
   <View style={s.mode}>{[true,false].map(value=><Pressable key={String(value)} testID={value?'bowling-practice':'bowling-daily'} accessibilityRole="button" accessibilityState={{selected:practice===value,disabled:busy}} disabled={busy} onPress={()=>{cancelAnimation(power);setPractice(value);}} style={[s.chip,practice===value&&s.selected]}><Text style={s.copy}>{value?'練習':'今日の挑戦'}</Text></Pressable>)}</View>
  </View>
  <View testID="bowling-lane" style={s.lane} onLayout={e=>setBounds(e.nativeEvent.layout)}>
   <Lane aim={aim} curve={curve} guide={phase==='aim'||phase==='charge'}/>
   {bounds.width>0&&<><WorldBowlingPins motion={{frames,index,running}} width={bounds.width} height={bounds.height}/>
    <Animated.View testID="bowling-player" accessibilityLabel={`${p.mascotName}がボウリングに挑戦`} pointerEvents="none" style={[{position:'absolute',width:avatarSize,height:avatarSize,transformOrigin:'50% 85%'},avatar]}>
     <View style={{position:'absolute',bottom:0,left:avatarSize*.18,width:avatarSize*.64,height:avatarSize*.1,borderRadius:99,backgroundColor:'#27312755'}}/>
     {p.effect&&<Image source={{uri:p.effect.uri}} style={{position:'absolute',width:avatarSize*p.effect.scale*1.3,height:avatarSize*p.effect.scale*1.3,left:-avatarSize*.15+p.effect.x,top:-avatarSize*.15+p.effect.y}} resizeMode="contain"/>}
     {hasResidentVolume(p.stage)?<VolumeResident stage={p.stage} size={avatarSize} rx={rx} ry={ry} rz={rz} blink={blink} mood="happy" night={false} active={p.active} reduceMotion={p.reduceMotion}/>:<StaticMascot stage={p.stage} size={avatarSize} mood="happy"/>}
     {p.wear&&<Image source={{uri:p.wear.uri}} resizeMode="contain" style={{position:'absolute',...roomWearableFrame(p.wear.id,getCharacter(p.stage).key,avatarSize,p.wear)}}/>}
    </Animated.View>
   </>}
   <Text pointerEvents="none" style={s.laneSign}>YOKI BOWL</Text>
  </View>
  <View style={s.controls}>
   <View style={s.row}>
    <Text style={s.hint}>{practice?'練習する配置':`${info.goal} · 達成＋${info.bonus} pt`}</Text>
    {practice&&<View style={s.mode}>{(['strike','spare','split'] as const).map(m=><Pressable key={m} testID={`bowling-rack-${m}`} accessibilityRole="button" accessibilityState={{selected:mission===m}} disabled={busy||phase==='charge'} onPress={()=>setPracticeMission(m)} style={[s.smallChip,mission===m&&s.selected]}><Text style={s.small}>{m==='strike'?'10本':m==='spare'?'3本':'2本'}</Text></Pressable>)}</View>}
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
    {p.reduceMotion&&<><Pressable accessibilityRole="button" accessibilityLabel="パワーを下げる" onPress={()=>{const n=clamp(manualPower-.1,.15,1);setManualPower(n);power.value=n;}} disabled={busy} style={s.curve}><Text style={s.copy}>−</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel="パワーを上げる" onPress={()=>{const n=clamp(manualPower+.1,.15,1);setManualPower(n);power.value=n;}} disabled={busy} style={s.curve}><Text style={s.copy}>＋</Text></Pressable></>}
    <Pressable testID="bowling-throw" accessibilityRole="button" disabled={!p.active||busy||(!practice&&!!receipt)} onPress={()=>{if(phase==='result'){reset();}else if(phase==='charge'){void throwShot();}else startCharge();}} style={[s.throw,(!p.active||busy||(!practice&&!!receipt))&&{opacity:.5}]}><Text style={s.throwText}>{phase==='saving'?'保存中…':phase==='rolling'?'ころころ…':!practice&&receipt?'挑戦済み':phase==='result'?'もう一投':pendingShot.current?'もう一度保存':phase==='charge'?'ここで投げる！':p.reduceMotion?'この強さで投げる':'パワーを決める'}</Text></Pressable>
   </View>
   <Text testID="bowling-feedback" accessibilityLiveRegion="polite" numberOfLines={2} style={s.feedback}>{message||(!practice&&receipt?`今日の結果 ${receipt.pins}本・＋${receipt.earned} pt。練習は何度でも。`:phase==='rolling'?'ピンの行方を見守ろう…':practice?'まずは練習。弱すぎると届かず、外れるとガター。':'本番は1日1投・1本5 pt。練習で狙いを確かめよう。')}</Text>
  </View>
 </View>;
}
const s=StyleSheet.create({
 root:{flex:1,borderRadius:15,overflow:'hidden',backgroundColor:'#192F30',borderWidth:1,borderColor:'#C1A47766'},
 heading:{minHeight:53,paddingHorizontal:12,paddingVertical:7,flexDirection:'row',alignItems:'center',gap:5,backgroundColor:'#1E2731'},
 kicker:{fontSize:8,letterSpacing:1,color:'#B8C9C3'},title:{fontSize:16,color:'#F2DFB4',fontWeight:'700',marginTop:3},mode:{flexDirection:'row',gap:3},chip:{minHeight:36,paddingHorizontal:9,justifyContent:'center',borderRadius:6},selected:{backgroundColor:'#5C746566'},copy:{fontSize:11,color:'#F2E5CD'},small:{fontSize:9,color:'#C6D0C7'},smallChip:{minHeight:30,minWidth:36,justifyContent:'center',alignItems:'center',borderRadius:5},
 lane:{flex:1,minHeight:110,overflow:'hidden'},laneSign:{position:'absolute',top:'3%',alignSelf:'center',fontSize:10,letterSpacing:3,color:'#DEC58D'},
 controls:{paddingHorizontal:10,paddingTop:4,paddingBottom:6,gap:3,backgroundColor:'#1E2731'},row:{flexDirection:'row',alignItems:'center',gap:6,justifyContent:'space-between'},hint:{fontSize:10,color:'#D2D9CC'},arrow:{width:30,height:42,alignItems:'center',justifyContent:'center'},arrowText:{fontSize:28,color:'#E6D09C'},aim:{flex:1,minWidth:40,height:44,justifyContent:'center',gap:7},aimTrack:{height:4,borderRadius:4,backgroundColor:'#61736B'},centerMark:{position:'absolute',left:'50%',top:-4,width:1,height:12,backgroundColor:'#BDC9B1'},aimDot:{position:'absolute',top:-5,marginLeft:-6,width:14,height:14,borderRadius:7,backgroundColor:'#F2D69C'},curve:{width:34,height:36,borderRadius:6,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:'#A4AE9644'},
 power:{height:9,borderRadius:5,overflow:'hidden',backgroundColor:'#3F4D50'},powerZone:{position:'absolute',left:'65%',width:'25%',height:'100%',backgroundColor:'#A5BF7466'},powerFill:{height:9,borderRadius:5,backgroundColor:'#E4C788'},throw:{minHeight:44,minWidth:132,paddingHorizontal:12,borderRadius:8,alignItems:'center',justifyContent:'center',backgroundColor:'#DEC18B'},throwText:{fontSize:12,fontWeight:'700',color:'#29352E'},feedback:{minHeight:28,fontSize:10,lineHeight:14,color:'#DED7BD'},
});
