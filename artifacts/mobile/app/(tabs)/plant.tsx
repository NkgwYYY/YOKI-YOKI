import React,{useCallback,useEffect,useRef,useState} from 'react';
import {useRouter} from 'expo-router';
import {Image,Platform,StyleSheet,Text,View,useWindowDimensions} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import Animated,{cancelAnimation,runOnJS,useAnimatedStyle,useSharedValue,withTiming,withRepeat,withSequence,withDelay,Easing} from 'react-native-reanimated';
import {Gesture,GestureDetector} from 'react-native-gesture-handler';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useApp} from '@/contexts/AppContext';
import {useRoomActivity} from '@/components/room/useRoomActivity';
import {VillageResident} from '@/components/village/VillageActors';
import {WorldPill} from '@/components/world/WorldPill';
import {useVillageMusic} from '@/contexts/VillageMusicContext';
import {getMascotStage} from '@/utils/mascotUtils';
import {fitWorld} from '@/utils/worldGeometry';
import {BATH_REST,BATH_WATER,bathDrop} from '@/utils/bathInteraction';
import {BodyWashArt} from '@/components/world/BodyWashArt';
import {useBodyWash} from '@/components/world/useBodyWash';
import {useDailyBath} from '@/components/world/useDailyBath';
import {hygieneValue} from '@/utils/hygiene';
import {readHousekeeping,roomDirt} from '@/utils/housekeeping';
import {getTabBarHeight} from '@/utils/tabLayout';

export default function HomeBathScreen(){
 const insets=useSafeAreaInsets(),window=useWindowDimensions(),{active,reduceMotion}=useRoomActivity();
 const {progress,awardHappiness,feedState}=useApp(),music=useVillageMusic();
 const [bathing,setBathing]=useState(false),[holding,setHolding]=useState(false),[message,setMessage]=useState(''),[failed,setFailed]=useState(false),[attempt,setAttempt]=useState(0);
 const [tool,setTool]=useState<'lift'|'towel'>('lift');
 const dirt=roomDirt(readHousekeeping(feedState.housekeeping,Date.now()),Date.now());
 const cleanliness=hygieneValue(feedState.hygiene,dirt.reduce((a,b)=>a+b,0)/dirt.length*100,Date.now());
 const completedToday=useDailyBath(),router=useRouter();
 const wash=useBodyWash(active,completedToday);
 const [exiting,setExiting]=useState(false);
 const exitStarted=useRef(false),returned=useRef(false);
 const fade=useSharedValue(0),step=useSharedValue(0);
 const keyboardPoint=useRef({x:.5,y:.49}),accessibleRow=useRef(0);
 const frame=fitWorld(window.width,window.height),size=frame.width*.285;
 const x=useSharedValue(BATH_REST.x),y=useSharedValue(BATH_REST.y),start=useSharedValue(BATH_REST),lift=useSharedValue(0),wave=useSharedValue(0),soak=useSharedValue(0);
 const drop=(px:number,py:number)=>{if(exiting||completedToday)return;const next=bathDrop({x:px,y:py});setHolding(false);setBathing(next.bathing);x.value=withTiming(next.point.x,{duration:reduceMotion?0:350});y.value=withTiming(next.point.y,{duration:reduceMotion?0:480});lift.value=withTiming(0,{duration:220});soak.value=withTiming(next.bathing?1:0,{duration:400});if(!next.bathing)setMessage('');};
 const pickup=()=>{setHolding(true);setBathing(false);};
 const washing=tool==='towel'&&!bathing;
 const washStart=(px:number,py:number)=>wash.start({x:px/size,y:py/size});
 const washMove=(px:number,py:number)=>wash.move({x:px/size,y:py/size});
 const gesture=Gesture.Pan().enabled(active&&!wash.saving&&!exiting&&!completedToday).minDistance(1).onBegin(e=>{
  if(washing){runOnJS(washStart)(e.x,e.y);return;}
  start.value={x:x.value,y:y.value};cancelAnimation(x);cancelAnimation(y);lift.value=withTiming(1,{duration:140});soak.value=0;runOnJS(pickup)();
 }).onUpdate(e=>{
  if(washing){runOnJS(washMove)(e.x,e.y);return;}
  x.value=Math.max(.14,Math.min(.86,start.value.x+e.translationX/frame.width));y.value=Math.max(.19,Math.min(.78,start.value.y+e.translationY/frame.height));
 }).onEnd(()=>{if(!washing)runOnJS(drop)(x.value,y.value);}).onFinalize((_e,success)=>{if(washing)runOnJS(wash.finish)();else if(!success)runOnJS(drop)(start.value.x,start.value.y);});
 const accessibleScrub=()=>{
  const row=[.28,.49,.72][accessibleRow.current++%3];
  wash.start({x:.26,y:row});wash.move({x:.74,y:row});wash.finish();
 };
 const keyAction=(e:React.KeyboardEvent)=>{
  if(exiting||completedToday||wash.saving)return;
  if(!e.key.startsWith('Arrow'))return;
  e.preventDefault();
  if(washing){
   const from=keyboardPoint.current,to={x:Math.max(.24,Math.min(.76,from.x+(e.key==='ArrowLeft'?-.24:e.key==='ArrowRight'?.24:0))),y:Math.max(.28,Math.min(.72,from.y+(e.key==='ArrowUp'?-.22:e.key==='ArrowDown'?.22:0)))};
   wash.start(from);wash.move(to);wash.finish();keyboardPoint.current=to;
  }else if(e.key==='ArrowUp')drop(BATH_WATER.x,BATH_WATER.y);else if(e.key==='ArrowDown')drop(BATH_REST.x,BATH_REST.y);
 };

 const body=useAnimatedStyle(()=>({left:x.value*frame.width-size/2,top:y.value*frame.height-size*.70,transform:[{translateY:-lift.value*12-step.value*4},{scale:1+lift.value*.06}]}));
 const blackout=useAnimatedStyle(()=>({opacity:fade.value}));
 const goHome=useCallback(()=>{returned.current=true;router.replace({pathname:'/(tabs)',params:{place:'home',bathReturn:String(Date.now())}});},[router]);
 useEffect(()=>{
  if(!active)return;
  if(!completedToday){
   if(exitStarted.current||returned.current){cancelAnimation(fade);cancelAnimation(step);cancelAnimation(x);fade.value=0;step.value=0;x.value=BATH_REST.x;y.value=BATH_REST.y;exitStarted.current=false;returned.current=false;setExiting(false);setTool('lift');}
   return;
  }
  // Wait for the durable wash result before leaving. A completed deep link returns home too.
  if(wash.saving)return;
  if(returned.current||!wash.saved){goHome();return;}
  if(exitStarted.current)return;
  exitStarted.current=true;setExiting(true);setHolding(false);setBathing(false);lift.value=0;soak.value=0;
  const walkMs=reduceMotion?0:1250;
  if(!reduceMotion)step.value=withRepeat(withSequence(withTiming(1,{duration:100}),withTiming(0,{duration:100})),7);
  x.value=withTiming(-.24,{duration:walkMs,easing:Easing.inOut(Easing.quad)});
  fade.value=withDelay(walkMs,withTiming(1,{duration:reduceMotion?180:420},finished=>{if(finished)runOnJS(goHome)();}));
 },[active,completedToday,wash.saving,wash.saved,reduceMotion,goHome]);
 useEffect(()=>()=>{cancelAnimation(fade);cancelAnimation(step);},[fade,step]);
 const crop=useAnimatedStyle(()=>({height:size*(1-soak.value*.29)}));
 const ripple=useAnimatedStyle(()=>({opacity:soak.value*(.38-wave.value*.25),transform:[{scaleX:1+wave.value*.9},{scaleY:1+wave.value*.35}]}));
 useEffect(()=>{if(active&&!reduceMotion)wave.value=withRepeat(withSequence(withTiming(1,{duration:2400}),withTiming(0,{duration:0})),-1);return()=>cancelAnimation(wave);},[active,reduceMotion]);
 useEffect(()=>{
  if(!active){setHolding(false);lift.value=0;}if(!bathing||!active||exiting||completedToday)return;
  let alive=true;setFailed(false);setMessage('湯気に包まれて、ひと休み。');
  const timer=setTimeout(()=>void awardHappiness('homeBath').then(r=>{if(alive)setMessage(r.gained?`ぽかぽか。幸福 ＋${r.gained}`:'ぽかぽか。お湯でのんびり。');}).catch(()=>{if(alive){setFailed(true);setMessage('保存できませんでした');}}),8000);
  return()=>{alive=false;clearTimeout(timer);};
 },[active,bathing,attempt,awardHappiness,exiting,completedToday]);
 return <View testID="home-bath-scene" pointerEvents={exiting?'none':'auto'} style={s.root}>
  <View style={{position:'absolute',...frame}}>
   <Image source={require('@/assets/images/world/home-bath-v2.jpg')} style={[StyleSheet.absoluteFill,{width:'100%',height:'100%'}]}/>
   {holding&&<View testID="home-bath-drop-zone" pointerEvents="none" style={{position:'absolute',left:frame.width*.18,top:frame.height*.279,width:frame.width*.66,height:frame.height*.105,borderRadius:150,borderWidth:1,borderColor:'#D4EDF39A',backgroundColor:'#BDE8F31A'}}/>}
   <Animated.View testID="home-bath-resident" style={[{position:'absolute',width:size,height:size,zIndex:20},body]}>
    <Animated.View pointerEvents="none" style={[{position:'absolute',top:size*.62,left:-size*.2,width:size*1.4,height:size*.20,borderRadius:100,borderWidth:2,borderColor:'#CCF4F2'},ripple]}/>
    <GestureDetector gesture={gesture} touchAction="none"><Animated.View testID="home-bath-body" accessible accessibilityRole="adjustable" accessibilityLabel={washing?'タオルでからだをこする':'持ち上げて湯船に入れる'} accessibilityHint={washing?'体全体を指でなぞって洗ってください。矢印キーでもタオルを動かせます。':'たまごをつかんでお湯へ運び、離してください。湯船から外へ運ぶとあがれます。'} accessibilityActions={washing?[{name:'increment',label:'タオルでひとこすり'}]:[{name:'increment',label:'湯船へ運ぶ'},{name:'decrement',label:'床へ運ぶ'}]} onAccessibilityAction={e=>washing?accessibleScrub():drop(e.nativeEvent.actionName==='increment'?BATH_WATER.x:BATH_REST.x,e.nativeEvent.actionName==='increment'?BATH_WATER.y:BATH_REST.y)} {...(Platform.OS==='web'?{tabIndex:0,onKeyDown:keyAction}:{})} style={[{width:size,overflow:'hidden'},crop]}>
     <VillageResident stage={getMascotStage(progress.level)} size={size} active={active} reduceMotion={reduceMotion} asleep={bathing}/>
     <BodyWashArt size={size} coverage={wash.coverage} cleanliness={cleanliness} towel={wash.towel} saved={wash.saved}/>
    </Animated.View></GestureDetector>
    {bathing&&!holding&&<View pointerEvents="none" style={{position:'absolute',top:size*.68,left:size*.08,width:size*.84,height:5,borderRadius:10,backgroundColor:'#A5D8D29A'}}/>}
   </Animated.View>
  </View>
  <LinearGradient pointerEvents="none" colors={['#14101ED9','transparent']} style={s.shade}/>
  <View style={[s.header,{top:insets.top+22}]}><View><Text style={s.kicker}>HOME / BATH</Text><Text style={s.title}>おうちのおふろ</Text><Text testID="bath-cleanliness" style={[s.hint,{textAlign:'left',marginTop:8}]}>清潔 {cleanliness}%</Text></View><WorldPill compact label="BGM" icon={music.enabled?'volume-2':'volume-x'} onPress={music.toggle}/></View>
  <View pointerEvents="box-none" style={[s.caption,{bottom:getTabBarHeight('',insets.bottom)+26}]}>
   <Text style={s.ornament}>◇</Text><Text testID="home-bath-message" accessibilityLiveRegion="polite" style={s.message}>{exiting?'さっぱり。おうちに帰ろう。':wash.saving?'さっぱりしたからだを記録中…':wash.saved?'ぴかぴか。すっきりしたね。':washing?'タオルで、からだ全体をごしごし。':holding?'お湯の上で、そっと離す':bathing?message:'持ち上げてお湯へ。洗うときはタオル。'}</Text>
   <Text style={s.hint}>{exiting?'今日のおふろは、おしまい。また明日。':bathing?'洗うときは、持ち上げてマットへ。':washing?'指を置くだけではなく、左右・上下になぞってね。':'浸かるとぽかぽか。こするときれいに。'}</Text>
   {washing&&<View testID="body-wash-progress" accessibilityRole="progressbar" accessibilityLabel="からだの洗い具合" accessibilityValue={{min:0,max:100,now:wash.percent}} style={{width:180,gap:6}}><View style={{height:4,borderRadius:4,backgroundColor:'#4D3D5B'}}><View style={{height:4,borderRadius:4,width:`${wash.percent}%`,backgroundColor:'#DCC9EC'}}/></View><Text style={s.hint}>{wash.percent===100?'全体を洗えたよ':`洗い具合 ${wash.percent}%`}</Text></View>}
   <View style={{flexDirection:'row',gap:10}}><WorldPill testID="bath-tool-lift" primary={tool==='lift'} label="持ち上げる" icon="move" onPress={()=>setTool('lift')} disabled={wash.saving||exiting||completedToday}/><WorldPill testID="bath-tool-towel" primary={tool==='towel'} label="タオル" icon="square" onPress={()=>setTool('towel')} disabled={bathing||holding||wash.saving||exiting||completedToday}/></View>
   {!!wash.error&&<><Text style={s.hint}>{wash.error}</Text><WorldPill testID="body-wash-retry" label="保存をもう一度試す" icon="refresh-cw" onPress={wash.retry}/></>}
   {failed&&<WorldPill label="保存をもう一度試す" icon="refresh-cw" onPress={()=>setAttempt(n=>n+1)}/>}
  </View>
  <Animated.View testID="bath-exit-shade" pointerEvents="none" style={[StyleSheet.absoluteFill,{backgroundColor:'#100D17',zIndex:1000},blackout]}/>
 </View>;
}
const s=StyleSheet.create({root:{flex:1,backgroundColor:'#261C1B',overflow:Platform.OS==='web'?'clip' as 'hidden':'hidden'},shade:{position:'absolute',top:0,left:0,right:0,height:230},header:{position:'absolute',left:24,right:24,flexDirection:'row',justifyContent:'space-between',alignItems:'center'},kicker:{fontSize:9,letterSpacing:3,color:'#C5AA7C',marginBottom:8},title:{fontSize:23,fontWeight:'500',letterSpacing:2,color:'#F6E9D7'},caption:{position:'absolute',left:28,right:28,alignItems:'center',gap:9},ornament:{color:'#E4CAA0',fontSize:20},message:{fontSize:14,lineHeight:23,letterSpacing:.5,textAlign:'center',color:'#FFF0DC',textShadowColor:'#271A14',textShadowRadius:8},hint:{fontSize:11,color:'#DBC7AC',textAlign:'center',textShadowColor:'#271A14',textShadowRadius:8}});
