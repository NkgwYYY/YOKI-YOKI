import React,{useEffect,useState} from 'react';
import {ActivityIndicator,Image,StyleSheet,Text,View,useWindowDimensions} from 'react-native';
import {FeltPressable as Pressable} from '@/components/ui/FeltPressable';
import {useLocalSearchParams,useRouter} from 'expo-router';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Animated,{useAnimatedStyle,useSharedValue,withTiming,Easing} from 'react-native-reanimated';
import {LinearGradient} from 'expo-linear-gradient';
import {useCommunity} from '@/contexts/CommunityContext';
import {useApp} from '@/contexts/AppContext';
import {useVillageMusic} from '@/contexts/VillageMusicContext';
import {StaticMascot} from '@/components/Mascot';
import {RoomFlowerArt,RoomFurnitureArt} from '@/components/room/RoomFurnitureArt';
import {CleaningToolArt} from '@/components/world/CleaningToolArt';
import {WorldPill} from '@/components/world/WorldPill';
import {getMascotStage,getStageName} from '@/utils/mascotUtils';
import {HOME_ART} from '@/utils/worldArt';
import {GREETINGS,type HomeSnapshot} from '@/utils/community/api';
import {useReducedMotion} from '@/utils/useReducedMotion';

export default function FriendHome(){
 const {id}=useLocalSearchParams<{id:string}>(),router=useRouter(),insets=useSafeAreaInsets(),{width,height}=useWindowDimensions();
 const {client,metric}=useCommunity(),{progress}=useApp(),music=useVillageMusic(),reduce=useReducedMotion();
 const [home,setHome]=useState<HomeSnapshot|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[sent,setSent]=useState(false),[selected,setSelected]=useState(0);
 const compact=height<740;
 const x=useSharedValue(.46),y=useSharedValue(compact?.61:.69),walk=useAnimatedStyle(()=>({transform:[{translateX:x.value*width-width*.075},{translateY:y.value*height-width*.13}]}));
 useEffect(()=>{let alive=true;const started=Date.now();void client.call<{home:HomeSnapshot}>(`/homes/${encodeURIComponent(String(id))}`).then(result=>{if(alive)setHome(result.home);metric('visit_opened',Date.now()-started);}).catch(e=>{if(alive)setError(e.message);});return()=>{alive=false;};},[id,client]);
 const send=async()=>{if(busy)return;setBusy(true);setError('');try{await client.call(`/homes/${id}/visits`,'POST',{greeting:selected});setSent(true);metric('visit_sent');}catch(e){setError((e as Error).message);}finally{setBusy(false);}};
 return <View testID="friend-home-scene" style={s.root}>
  <Image source={HOME_ART.day} resizeMode="cover" style={[StyleSheet.absoluteFill,{width:'100%',height:'100%'}]}/>
  <LinearGradient pointerEvents="none" colors={['#21162BB0','#21162B00','#21162B00','#21162BE6']} locations={[0,.25,.65,1]} style={StyleSheet.absoluteFill}/>
  {home&&<>
   {home.flower!=='none'&&<View pointerEvents="none" style={{position:'absolute',left:width*.1,top:height*.46}}><RoomFlowerArt id={home.flower} size={width*.15}/></View>}
   {home.furniture!=='none'&&<View pointerEvents="none" style={{position:'absolute',left:width*.64,top:height*.51}}><RoomFurnitureArt id={home.furniture} size={width*.2}/></View>}
   {home.robot&&<View pointerEvents="none" style={{position:'absolute',left:width*.47,top:height*.53}}><CleaningToolArt tool="robot" size={width*.17}/></View>}
   <View pointerEvents="none" style={{position:'absolute',left:width*.28,top:height*(compact?.43:.53)}}><StaticMascot stage={home.stage} mood="happy" size={width*.16}/></View>
   <Pressable testID="friend-home-walk" accessibilityRole="button" accessibilityLabel="お部屋を歩く" style={{position:'absolute',left:0,right:0,top:height*(compact?.45:.55),height:height*.14}} onPress={event=>{const targetX=Math.max(.16,Math.min(.84,event.nativeEvent.locationX/width)),targetY=Math.max(compact?.48:.58,Math.min(compact?.63:.71,(compact?.45:.55)+event.nativeEvent.locationY/height));x.value=withTiming(targetX,{duration:reduce?0:700,easing:Easing.inOut(Easing.quad)});y.value=withTiming(targetY,{duration:reduce?0:700});}}/>
   <Animated.View pointerEvents="none" style={[{position:'absolute',width:width*.15,height:width*.15},walk]}><StaticMascot stage={getMascotStage(progress)} mood="happy" size={width*.15}/></Animated.View>
  </>}
  <View style={[s.top,{paddingTop:insets.top+16}]}><WorldPill label="小道へ戻る" icon="arrow-left" onPress={()=>router.back()}/><WorldPill compact label="BGM" icon={music.enabled?'music':'volume-x'} onPress={music.toggle}/></View>
  <View pointerEvents="none" style={[s.heading,{top:insets.top+84}]}><Text style={s.kicker}>FRIEND'S HOME</Text><Text style={s.title}>{home?`${getStageName(home.stage)}のおうち`:'おうちへ、向かっています'}</Text>{home&&<Text style={s.note}>留守のあいだも、ゆっくりしていってね。</Text>}</View>
  {!home&&!error&&<ActivityIndicator style={{position:'absolute',top:'45%',alignSelf:'center'}} color="#F3D9AB"/>}
  <View style={[s.bottom,{paddingBottom:insets.bottom+22}]}>
   {!!error&&<Text accessibilityRole="alert" style={s.note}>{error}</Text>}
   {home&&(sent?<View testID="friend-home-sent" style={s.sent}><Text style={s.title}>小さな足跡を、ひとつ。</Text><Text style={s.note}>「{GREETINGS[selected]}」{ '\n' }帰ってきたら、読んでくれるよ。</Text><WorldPill label="小道へ戻る" icon="arrow-left" onPress={()=>router.back()}/></View>:<><Text style={s.note}>ひとこと、置いていこう。</Text><View style={s.choices}>{GREETINGS.map((g,i)=><Pressable key={g} accessibilityRole="radio" accessibilityState={{checked:selected===i}} disabled={busy} onPress={()=>setSelected(i)} style={[s.choice,selected===i&&s.selected]}><Text style={s.choiceText}>{g}</Text></Pressable>)}</View><WorldPill primary label={busy?'足跡を残しています…':'この挨拶と足跡を残す'} icon="heart" disabled={busy} onPress={()=>void send()}/></>)}
  </View>
 </View>;
}
const s=StyleSheet.create({root:{flex:1,backgroundColor:'#293929'},top:{position:'absolute',left:20,right:20,flexDirection:'row',justifyContent:'space-between'},heading:{position:'absolute',left:24,right:24,gap:9},kicker:{fontSize:10,letterSpacing:3,color:'#F2D7B0'},title:{fontSize:23,color:'#FFF1D9'},note:{fontSize:12,lineHeight:22,color:'#F0E4F0'},bottom:{position:'absolute',left:20,right:20,bottom:0,gap:12},choices:{flexDirection:'row',flexWrap:'wrap',gap:8},choice:{paddingVertical:10,paddingHorizontal:12,backgroundColor:'#2D223BEA',borderRadius:10,borderWidth:1,borderColor:'#B39CC177'},selected:{backgroundColor:'#695079',borderColor:'#E0C59A'},choiceText:{color:'#F3E8F6',fontSize:11},sent:{gap:13,padding:18,borderRadius:16,backgroundColor:'#33253DE8'}});
