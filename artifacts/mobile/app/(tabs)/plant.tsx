import React,{useEffect,useState} from 'react';
import {Image,Platform,StyleSheet,Text,View,useWindowDimensions} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import Animated,{cancelAnimation,runOnJS,useAnimatedStyle,useSharedValue,withTiming,withRepeat,withSequence} from 'react-native-reanimated';
import {Gesture,GestureDetector} from 'react-native-gesture-handler';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useApp} from '@/contexts/AppContext';
import {useRoomActivity} from '@/components/room/useRoomActivity';
import {VillageResident} from '@/components/village/VillageActors';
import {WorldPill} from '@/components/world/WorldPill';
import {useVillageBgm} from '@/components/world/useVillageBgm';
import {getMascotStage} from '@/utils/mascotUtils';
import {fitWorld} from '@/utils/worldGeometry';
import {BATH_REST,BATH_WATER,bathDrop} from '@/utils/bathInteraction';
import {getTabBarHeight} from '@/utils/tabLayout';

export default function HomeBathScreen(){
 const insets=useSafeAreaInsets(),window=useWindowDimensions(),{active,reduceMotion}=useRoomActivity();
 const {progress,awardHappiness}=useApp(),music=useVillageBgm(active);
 const [bathing,setBathing]=useState(false),[holding,setHolding]=useState(false),[message,setMessage]=useState(''),[failed,setFailed]=useState(false),[attempt,setAttempt]=useState(0);
 const frame=fitWorld(window.width,window.height),size=frame.width*.285;
 const x=useSharedValue(BATH_REST.x),y=useSharedValue(BATH_REST.y),start=useSharedValue(BATH_REST),lift=useSharedValue(0),wave=useSharedValue(0),soak=useSharedValue(0);
 const drop=(px:number,py:number)=>{const next=bathDrop({x:px,y:py});setHolding(false);setBathing(next.bathing);x.value=withTiming(next.point.x,{duration:reduceMotion?0:350});y.value=withTiming(next.point.y,{duration:reduceMotion?0:480});lift.value=withTiming(0,{duration:220});soak.value=withTiming(next.bathing?1:0,{duration:400});if(!next.bathing)setMessage('');};
 const pickup=()=>{setHolding(true);setBathing(false);};
 const gesture=Gesture.Pan().enabled(active).minDistance(1).onBegin(()=>{start.value={x:x.value,y:y.value};cancelAnimation(x);cancelAnimation(y);lift.value=withTiming(1,{duration:140});soak.value=0;runOnJS(pickup)();}).onUpdate(e=>{x.value=Math.max(.14,Math.min(.86,start.value.x+e.translationX/frame.width));y.value=Math.max(.19,Math.min(.78,start.value.y+e.translationY/frame.height));}).onEnd(()=>{runOnJS(drop)(x.value,y.value);}).onFinalize((_e,success)=>{if(!success)runOnJS(drop)(start.value.x,start.value.y);});
 const body=useAnimatedStyle(()=>({left:x.value*frame.width-size/2,top:y.value*frame.height-size*.70,transform:[{translateY:-lift.value*12},{scale:1+lift.value*.06}]}));
 const crop=useAnimatedStyle(()=>({height:size*(1-soak.value*.29)}));
 const ripple=useAnimatedStyle(()=>({opacity:soak.value*(.38-wave.value*.25),transform:[{scaleX:1+wave.value*.9},{scaleY:1+wave.value*.35}]}));
 useEffect(()=>{if(active&&!reduceMotion)wave.value=withRepeat(withSequence(withTiming(1,{duration:2400}),withTiming(0,{duration:0})),-1);return()=>cancelAnimation(wave);},[active,reduceMotion]);
 useEffect(()=>{
  if(!active){setHolding(false);lift.value=0;}if(!bathing||!active)return;
  let alive=true;setFailed(false);setMessage('湯気に包まれて、ひと休み。');
  const timer=setTimeout(()=>void awardHappiness('homeBath').then(r=>{if(alive)setMessage(r.gained?`ぽかぽか。幸福 ＋${r.gained} / からだもさっぱり`:'からだも気持ちも、さっぱり。');}).catch(()=>{if(alive){setFailed(true);setMessage('保存できませんでした');}}),8000);
  return()=>{alive=false;clearTimeout(timer);};
 },[active,bathing,attempt,awardHappiness]);
 return <View testID="home-bath-scene" style={s.root}>
  <View style={{position:'absolute',...frame}}>
   <Image source={require('@/assets/images/world/home-bath-v2.jpg')} style={[StyleSheet.absoluteFill,{width:'100%',height:'100%'}]}/>
   {holding&&<View testID="home-bath-drop-zone" pointerEvents="none" style={{position:'absolute',left:frame.width*.18,top:frame.height*.279,width:frame.width*.66,height:frame.height*.105,borderRadius:150,borderWidth:1,borderColor:'#D4EDF39A',backgroundColor:'#BDE8F31A'}}/>}
   <Animated.View testID="home-bath-resident" style={[{position:'absolute',width:size,height:size,zIndex:20},body]}>
    <Animated.View pointerEvents="none" style={[{position:'absolute',top:size*.62,left:-size*.2,width:size*1.4,height:size*.20,borderRadius:100,borderWidth:2,borderColor:'#CCF4F2'},ripple]}/>
    <GestureDetector gesture={gesture} touchAction="none"><Animated.View accessible accessibilityRole="adjustable" accessibilityLabel="持ち上げて湯船に入れる" accessibilityHint="たまごをつかんでお湯へ運び、離してください。湯船から外へ運ぶとあがれます。" accessibilityActions={[{name:'increment',label:'湯船へ運ぶ'},{name:'decrement',label:'床へ運ぶ'}]} onAccessibilityAction={e=>drop(e.nativeEvent.actionName==='increment'?BATH_WATER.x:BATH_REST.x,e.nativeEvent.actionName==='increment'?BATH_WATER.y:BATH_REST.y)} {...(Platform.OS==='web'?{tabIndex:0,onKeyDown:(e:React.KeyboardEvent)=>{if(e.key==='ArrowUp'){e.preventDefault();drop(BATH_WATER.x,BATH_WATER.y);}if(e.key==='ArrowDown'){e.preventDefault();drop(BATH_REST.x,BATH_REST.y);}}}:{})} style={[{width:size,overflow:'hidden'},crop]}>
     <VillageResident stage={getMascotStage(progress.level)} size={size} active={active} reduceMotion={reduceMotion} asleep={bathing}/>
    </Animated.View></GestureDetector>
    {bathing&&!holding&&<View pointerEvents="none" style={{position:'absolute',top:size*.68,left:size*.08,width:size*.84,height:5,borderRadius:10,backgroundColor:'#A5D8D29A'}}/>}
   </Animated.View>
  </View>
  <LinearGradient pointerEvents="none" colors={['#14101ED9','transparent']} style={s.shade}/>
  <View style={[s.header,{top:insets.top+22}]}><View><Text style={s.kicker}>HOME / BATH</Text><Text style={s.title}>おうちのおふろ</Text></View><WorldPill compact label="BGM" icon={music.enabled?'volume-2':'volume-x'} onPress={music.toggle}/></View>
  <View pointerEvents="box-none" style={[s.caption,{bottom:getTabBarHeight('',insets.bottom)+26}]}>
   <Text style={s.ornament}>◇</Text><Text testID="home-bath-message" accessibilityLiveRegion="polite" style={s.message}>{holding?'お湯の上で、そっと離す':bathing?message:'たまごを持ち上げて、お湯の中へ。'}</Text>
   <Text style={s.hint}>{bathing?'あがるときも、持ち上げて床へ。':'小さな湯船で、のんびり。'}</Text>
   {failed&&<WorldPill label="保存をもう一度試す" icon="refresh-cw" onPress={()=>setAttempt(n=>n+1)}/>}
  </View>
 </View>;
}
const s=StyleSheet.create({root:{flex:1,backgroundColor:'#261C1B',overflow:Platform.OS==='web'?'clip' as 'hidden':'hidden'},shade:{position:'absolute',top:0,left:0,right:0,height:230},header:{position:'absolute',left:24,right:24,flexDirection:'row',justifyContent:'space-between',alignItems:'center'},kicker:{fontSize:9,letterSpacing:3,color:'#C5AA7C',marginBottom:8},title:{fontSize:23,fontWeight:'500',letterSpacing:2,color:'#F6E9D7'},caption:{position:'absolute',left:28,right:28,alignItems:'center',gap:9},ornament:{color:'#E4CAA0',fontSize:20},message:{fontSize:14,lineHeight:23,letterSpacing:.5,textAlign:'center',color:'#FFF0DC',textShadowColor:'#271A14',textShadowRadius:8},hint:{fontSize:11,color:'#DBC7AC',textAlign:'center',textShadowColor:'#271A14',textShadowRadius:8}});
