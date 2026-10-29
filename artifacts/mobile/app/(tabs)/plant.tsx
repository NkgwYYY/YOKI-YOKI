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
import {BATH_REST,BATH_WATER,BATH_WIDE_WATER,bathDrop} from '@/utils/bathInteraction';
import {BodyWashArt} from '@/components/world/BodyWashArt';
import {BathCareHand} from '@/components/world/BathCareHand';
import {useBodyWash} from '@/components/world/useBodyWash';
import {useDailyBath} from '@/components/world/useDailyBath';
import {hygieneValue,cleanlinessValue} from '@/utils/hygiene';
import {readHousekeeping,roomDirt} from '@/utils/housekeeping';
import {FeltDecoration} from '@/components/ui/Felt';
import {getTabBarHeight} from '@/utils/tabLayout';

export default function HomeBathScreen(){
 const insets=useSafeAreaInsets(),window=useWindowDimensions(),{active,reduceMotion}=useRoomActivity();
 const {progress,awardHappiness,feedState,mascotName}=useApp(),music=useVillageMusic();
 const [bathing,setBathing]=useState(false),[holding,setHolding]=useState(false),[message,setMessage]=useState(''),[failed,setFailed]=useState(false),[attempt,setAttempt]=useState(0);
 const [tool,setTool]=useState<'lift'|'towel'>('towel');
 const [rinsed,setRinsed]=useState(false),[bathGain,setBathGain]=useState<number|null>(null);
 const bodyCleanliness=100;
 const completedToday=false,router=useRouter();
 const wash=useBodyWash(active,false);
 const [exiting,setExiting]=useState(false);
 const exitStarted=useRef(false),returned=useRef(false);
 const fade=useSharedValue(0),step=useSharedValue(0);
 const keyboardPoint=useRef({x:.5,y:.49}),accessibleRow=useRef(0);
 const wide=window.width>window.height,compact=window.height<700&&window.width<=window.height,water=wide?BATH_WIDE_WATER:BATH_WATER;
 const scale=Math.max(window.width/3,window.height/2);
 const frame=wide?{width:3*scale,height:2*scale,left:(window.width-3*scale)/2,top:(window.height-2*scale)*.38}:fitWorld(window.width,window.height);
 const size=wide?Math.min(frame.width*.285,window.height*.29):frame.width*.36;
 const restPoint={...BATH_REST,y:BATH_REST.y-(compact?36/frame.height:0)};
 const x=useSharedValue(restPoint.x),y=useSharedValue(restPoint.y),start=useSharedValue(restPoint),lift=useSharedValue(0),wave=useSharedValue(0),soak=useSharedValue(0);
 const drop=(px:number,py:number)=>{if(exiting||completedToday)return;const next=bathDrop({x:px,y:py},water);if(!next.bathing)next.point.y=restPoint.y;setHolding(false);setBathing(next.bathing);x.value=withTiming(next.point.x,{duration:reduceMotion?0:350});y.value=withTiming(next.point.y,{duration:reduceMotion?0:480});lift.value=withTiming(0,{duration:220});soak.value=withTiming(next.bathing?1:0,{duration:400});if(!next.bathing)setMessage('');};
 const pickup=()=>{setHolding(true);setBathing(false);};
 const washing=tool==='towel'&&!bathing&&!rinsed;
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
  }else if(e.key==='ArrowUp')drop(water.x,water.y);else if(e.key==='ArrowDown')drop(restPoint.x,restPoint.y);
 };

 const body=useAnimatedStyle(()=>({left:x.value*frame.width-size/2,top:y.value*frame.height-size*.70-(compact&&rinsed?32:0),transform:[{translateY:-lift.value*12-step.value*4},{scale:1+lift.value*.06}]}));
 const blackout=useAnimatedStyle(()=>({opacity:fade.value}));
 const goHome=useCallback(()=>{returned.current=true;router.replace({pathname:'/(tabs)',params:{place:'home',bathReturn:String(Date.now())}});},[router]);
 useEffect(()=>()=>{cancelAnimation(fade);cancelAnimation(step);},[fade,step]);
 useEffect(()=>{if(!holding){cancelAnimation(y);y.value=bathing?water.y:restPoint.y;}},[wide,compact,frame.height]);
 const crop=useAnimatedStyle(()=>({height:size*(1-soak.value*.29)}));
 const ripple=useAnimatedStyle(()=>({opacity:soak.value*(.38-wave.value*.25),transform:[{scaleX:1+wave.value*.9},{scaleY:1+wave.value*.35}]}));
 useEffect(()=>{if(active&&!reduceMotion)wave.value=withRepeat(withSequence(withTiming(1,{duration:2400}),withTiming(0,{duration:0})),-1);return()=>cancelAnimation(wave);},[active,reduceMotion]);
 useEffect(()=>{
  if(!active){setHolding(false);lift.value=0;}if(!bathing||!active||exiting||completedToday)return;
  let alive=true;setFailed(false);setMessage(wash.saved?'あわを流しています…':'お湯に浸かっています…');
  const timer=setTimeout(()=>void awardHappiness('homeBath').then(r=>{if(alive){setBathGain(r.gained);if(wash.saved){setRinsed(true);drop(restPoint.x,restPoint.y);if(!reduceMotion)step.value=withSequence(withTiming(3,{duration:180}),withTiming(0,{duration:220}),withTiming(2,{duration:160}),withTiming(0,{duration:200}));}else setMessage(r.gained?`あったまったね。幸福 ＋${r.gained}`:'あったまったね。');}}).catch(()=>{if(alive){setFailed(true);setMessage('保存できませんでした');}}),wash.saved?1800:8000);
  return()=>{alive=false;clearTimeout(timer);};
 },[active,bathing,attempt,awardHappiness,exiting,completedToday,wash.saved]);
 return <View testID="home-bath-scene" pointerEvents={exiting?'none':'auto'} style={s.root}>
  <View style={{position:'absolute',...frame}}>
   <Image testID="bath-background-art" source={wide?require('@/assets/images/world/plush-bath-wide.webp'):require('@/assets/images/world/plush-bath.webp')} style={[StyleSheet.absoluteFill,{width:'100%',height:'100%'}]}/>
   {holding&&<View testID="home-bath-drop-zone" pointerEvents="none" style={{position:'absolute',left:frame.width*(water.x-water.rx),top:frame.height*(water.y-water.ry),width:frame.width*water.rx*2,height:frame.height*water.ry*2,borderRadius:150,borderWidth:1,borderColor:'#D4EDF39A',backgroundColor:'#BDE8F31A'}}/>}
   <Animated.View testID="home-bath-resident" style={[{position:'absolute',width:size,height:size,zIndex:20},body]}>
    <Animated.View pointerEvents="none" style={[{position:'absolute',top:size*.62,left:-size*.2,width:size*1.4,height:size*.20,borderRadius:100,borderWidth:2,borderColor:'#CCF4F2'},ripple]}/>
    <GestureDetector gesture={gesture} touchAction="none"><Animated.View testID="home-bath-body" accessible accessibilityRole="adjustable" accessibilityLabel={washing?'タオルでからだをこする':'持ち上げて湯船に入れる'} accessibilityHint={washing?'体全体を指でなぞって洗ってください。矢印キーでもタオルを動かせます。':'たまごをつかんでお湯へ運び、離してください。湯船から外へ運ぶとあがれます。'} accessibilityActions={washing?[{name:'increment',label:'タオルでひとこすり'}]:[{name:'increment',label:'湯船へ運ぶ'},{name:'decrement',label:'床へ運ぶ'}]} onAccessibilityAction={e=>washing?accessibleScrub():drop(e.nativeEvent.actionName==='increment'?water.x:restPoint.x,e.nativeEvent.actionName==='increment'?water.y:restPoint.y)} {...(Platform.OS==='web'?{tabIndex:0,onKeyDown:keyAction}:{})} style={[{width:size,overflow:'hidden'},crop]}>
     <VillageResident stage={getMascotStage(progress)} size={size} active={active} reduceMotion={reduceMotion} asleep={bathing||!!wash.towel}/>
     <BodyWashArt size={size} coverage={wash.coverage} cleanliness={bodyCleanliness} saved={rinsed}/>
    </Animated.View></GestureDetector>
    <BathCareHand size={size} point={wash.towel} enabled={active&&washing&&!exiting&&!completedToday} reduceMotion={reduceMotion}/>
    {bathing&&!holding&&<View pointerEvents="none" style={{position:'absolute',top:size*.68,left:size*.08,width:size*.84,height:5,borderRadius:10,backgroundColor:'#A5D8D29A'}}/>}
   </Animated.View>
  </View>
  <LinearGradient pointerEvents="none" colors={['#14101ED9','transparent']} style={s.shade}/>
  <View style={[s.header,{top:insets.top+22}]}><View><Text style={s.kicker}>HOME / BATH</Text><Text style={s.title}>おうちのおふろ</Text><Text style={[s.hint,{textAlign:'left',marginTop:8}]}>洗って、すすいで、ふわふわに。</Text></View><WorldPill compact label="BGM" icon={music.enabled?'volume-2':'volume-x'} onPress={music.toggle}/></View>
  <View pointerEvents="box-none" style={[s.caption,{bottom:getTabBarHeight('',insets.bottom)+(compact?12:26)},wide&&window.height<600&&{left:window.width*.70,right:12,gap:5}]}>
   <View testID="bath-feedback" style={{width:wide?'100%':Math.min(window.width-40,390),padding:compact?10:14,borderRadius:22,backgroundColor:'#FFFDF2',borderWidth:1,borderColor:'#D8CCB2',gap:compact?5:9,alignItems:'center'}}>
    <FeltDecoration radius={22}/>
    {(!compact||wash.saved)&&<Text style={{fontSize:11,fontWeight:'700',color:'#526B59'}}>{rinsed?'3 / 3　できあがり':wash.saved?'2 / 3　お湯ですすぐ':'1 / 3　タオルで洗う'}</Text>}
    <Text testID="home-bath-message" accessibilityLiveRegion="polite" style={{fontSize:rinsed?21:compact?14:16,fontWeight:'700',color:'#293F36',textAlign:'center'}}>{rinsed?'ふわふわになった！':wash.saving?'洗った状態を保存中…':wash.saved?(bathing?'あわを流しています…':'全体を洗えたよ。次はすすごう。'):washing?'からだ全体を、左右になぞってね':holding?'お湯の上で離してね':bathing?message:'タオルを選ぶと洗えるよ'}</Text>
    {rinsed?<><Text style={{fontSize:12,color:'#526B59',textAlign:'center'}}>{bathGain?`${mascotName||'よっきー'}の幸福 ＋${bathGain}`:'今日の幸福ボーナスは受け取り済み'}</Text><View style={{flexDirection:'row',gap:8}}><WorldPill testID="bath-wash-again" label="もう一度洗う" icon="refresh-cw" onPress={()=>{wash.reset();setRinsed(false);setBathGain(null);setTool('towel');}}/><WorldPill testID="bath-go-home" label="おうちに帰る" icon="home" onPress={goHome}/></View></>:
     wash.saved?<WorldPill testID="bath-rinse" primary label={bathing?'すすいでいます…':'お湯ですすぐ'} icon="droplet" disabled={bathing||wash.saving} onPress={()=>{setTool('lift');drop(water.x,water.y);}}/>:
     <><View testID="body-wash-progress" accessibilityRole="progressbar" accessibilityLabel="からだの洗い具合" accessibilityValue={{min:0,max:100,now:wash.percent}} style={{width:'100%',gap:6,flexDirection:compact?'row':'column',alignItems:compact?'center':undefined}}><View style={{flex:compact?1:undefined,height:9,borderRadius:5,backgroundColor:'#DBE5DF',overflow:'hidden'}}><View style={{height:9,width:`${wash.percent}%`,backgroundColor:'#287B67'}}/></View><Text style={{fontSize:12,color:'#274C40',textAlign:'center',fontWeight:'700'}}>洗えたところ {wash.percent}%</Text></View><View style={{flexDirection:'row',gap:8}}><WorldPill testID="bath-tool-towel" primary={tool==='towel'} label="タオル" icon="square" onPress={()=>setTool('towel')} disabled={bathing||holding||wash.saving}/><WorldPill testID="bath-tool-lift" primary={tool==='lift'} label="持ち上げる" icon="move" onPress={()=>setTool('lift')} disabled={wash.saving}/></View></>}
   </View>
   {!!wash.error&&<><Text style={s.hint}>{wash.error}</Text><WorldPill testID="body-wash-retry" label="保存をもう一度試す" icon="refresh-cw" onPress={wash.retry}/></>}
   {failed&&<WorldPill label="保存をもう一度試す" icon="refresh-cw" onPress={()=>setAttempt(n=>n+1)}/>}
  </View>
  <Animated.View testID="bath-exit-shade" pointerEvents="none" style={[StyleSheet.absoluteFill,{backgroundColor:'#100D17',zIndex:1000},blackout]}/>
 </View>;
}
const s=StyleSheet.create({root:{flex:1,backgroundColor:'#261C1B',overflow:Platform.OS==='web'?'clip' as 'hidden':'hidden'},shade:{position:'absolute',top:0,left:0,right:0,height:230},header:{position:'absolute',left:24,right:24,flexDirection:'row',justifyContent:'space-between',alignItems:'center'},kicker:{fontSize:9,letterSpacing:3,color:'#C5AA7C',marginBottom:8},title:{fontSize:23,fontWeight:'500',letterSpacing:2,color:'#F6E9D7'},caption:{position:'absolute',left:28,right:28,alignItems:'center',gap:9},ornament:{color:'#E4CAA0',fontSize:20},message:{fontSize:14,lineHeight:23,letterSpacing:.5,textAlign:'center',color:'#FFF0DC',textShadowColor:'#271A14',textShadowRadius:8},hint:{fontSize:11,color:'#DBC7AC',textAlign:'center',textShadowColor:'#271A14',textShadowRadius:8}});
