import React,{useEffect,useRef,useState} from 'react';
import {Image,Modal,ScrollView,StyleSheet,Text,View} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {StaticMascot} from '@/components/Mascot';
import {getMascotStage} from '@/utils/mascotUtils';
import {Analytics} from '@/utils/analytics';
import {Icon} from '@/components/ui/Icon';
import {PressScale} from '@/components/ui/PressScale';
import {useAppActivity} from '@/components/room/useRoomActivity';
import {REST_SCENES,RestSceneView,type RestScene} from '@/components/rest/RestScenes';
import {useRestAudio} from '@/components/rest/useRestAudio';

type Props={visible:boolean;level:number;mascotName:string;onClose:()=>void};
export function RestEventModal({visible,level,mascotName,onClose}:Props){
 const insets=useSafeAreaInsets(),{active,reduceMotion}=useAppActivity();
 const [scene,setScene]=useState<RestScene|null>(null),[duration,setDuration]=useState(0);
 const [volume,setVolume]=useState(.55),[muted,setMuted]=useState(false);
 useEffect(()=>{if(visible){setScene(null);Analytics.restEventShown();}},[visible]);
 useEffect(()=>{if(!active)setScene(null);},[active]);
 const choose=(next:RestScene)=>{setScene(next);Analytics.restEventScene(next);};
 const close=()=>{setScene(null);onClose();};
 return <Modal visible={visible} transparent animationType={reduceMotion?'none':'fade'} onRequestClose={close}>
  <View accessibilityViewIsModal onAccessibilityEscape={close} style={s.overlay}>
   {scene&&visible&&active?<Playing key={scene} scene={scene} duration={duration} reduceMotion={reduceMotion} volume={volume} setVolume={setVolume} muted={muted} setMuted={setMuted} onBack={()=>setScene(null)} onClose={close}/>:<ScrollView style={s.sheet} contentContainerStyle={[s.content,{paddingTop:Math.max(18,insets.top),paddingBottom:Math.max(insets.bottom,20)}]}>
    <View style={s.handle}/>
    <View style={s.header}><StaticMascot stage={getMascotStage(level)} mood="sleepy" size={62}/><Text style={s.eyebrow}>A LITTLE QUIET TIME</Text><Text style={s.title}>今日は一緒に休もう。</Text><Text style={s.subtitle}>{mascotName||'こころん'}と、何もしなくていい時間。</Text></View>
    <View style={s.grid}>{REST_SCENES.map(cfg=><PressScale key={cfg.key} testID={`rest-choose-${cfg.key}`} accessibilityLabel={cfg.label} onPress={()=>choose(cfg.key)} style={s.card}>
     <Image source={cfg.image} resizeMode="cover" style={[StyleSheet.absoluteFill,{width:'100%',height:'100%'}]}/>
     <LinearGradient pointerEvents="none" colors={['#17101D00','#17101D4D','#17101DEB']} locations={[0,.35,1]} style={StyleSheet.absoluteFill}/>
     <View pointerEvents="none" style={s.cardText}><Text style={[s.cardEyebrow,{color:cfg.tint}]}>{cfg.eyebrow}</Text><Text style={s.cardTitle}>{cfg.label}</Text><Text style={s.cardSub}>{cfg.sub}</Text></View>
    </PressScale>)}</View>
    <View style={s.timeRow}><Text style={s.timeLabel}>休む時間</Text><View style={s.chips}>{[{value:0,label:'自由に'},{value:60,label:'1分'},{value:180,label:'3分'}].map(option=><PressScale key={option.value} accessibilityLabel={`休憩時間 ${option.label}`} accessibilityState={{selected:duration===option.value}} onPress={()=>setDuration(option.value)} style={[s.chip,duration===option.value&&s.chipSelected]}><Text style={[s.chipText,duration===option.value&&{color:'#F4E8FF'}]}>{option.label}</Text></PressScale>)}</View></View>
    <PressScale accessibilityLabel="今は大丈夫" onPress={close} style={s.skip}><Text style={s.skipText}>今は大丈夫</Text></PressScale>
   </ScrollView>}
  </View>
 </Modal>;
}
function Playing({scene,duration,reduceMotion,volume,setVolume,muted,setMuted,onBack,onClose}:{scene:RestScene;duration:number;reduceMotion:boolean;volume:number;setVolume:(n:number)=>void;muted:boolean;setMuted:(v:boolean)=>void;onBack:()=>void;onClose:()=>void}){
 const insets=useSafeAreaInsets(),cfg=REST_SCENES.find(c=>c.key===scene)!;
 const [remaining,setRemaining]=useState(duration),[complete,setComplete]=useState(false),[petting,setPetting]=useState(false);
 const petTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const audio=useRestAudio(scene,!muted,scene==='cat'?(petting?volume:volume*.28):volume);
 useEffect(()=>{
  if(!duration||complete)return;
  const deadline=Date.now()+remaining*1000;
  const timer=setInterval(()=>{const left=Math.max(0,Math.ceil((deadline-Date.now())/1000));setRemaining(left);if(left===0)setComplete(true);},500);
  return()=>clearInterval(timer);
 },[duration,complete]);
 useEffect(()=>()=>{if(petTimer.current)clearTimeout(petTimer.current);},[]);
 const pet=()=>{setPetting(true);if(petTimer.current)clearTimeout(petTimer.current);petTimer.current=setTimeout(()=>setPetting(false),2800);};
 return <View style={s.full}>
  <RestSceneView scene={scene} reduceMotion={reduceMotion} onPet={pet}/>
  <View pointerEvents="box-none" style={[s.top,{top:Math.max(insets.top,12)}]}>
   <PressScale accessibilityLabel="休憩を選び直す" onPress={onBack} style={s.round}><Icon name="chevron-left" color="#FFF5E8" size={22}/></PressScale>
   <Text style={s.topLabel}>{cfg.eyebrow}</Text>
   <PressScale accessibilityLabel="休憩を閉じる" onPress={onClose} style={s.round}><Icon name="x" color="#FFF5E8" size={22}/></PressScale>
  </View>
  <View pointerEvents="box-none" style={[s.bottom,{paddingBottom:Math.max(insets.bottom,20)}]}>
   <Text style={s.sceneTitle}>{complete?'もう少し、このままでも。':cfg.title}</Text>
   <Text style={s.sceneSub}>{complete?'急がなくていいよ。戻りたくなったら、戻ろう。':duration?`あと ${Math.floor(remaining/60)}:${String(remaining%60).padStart(2,'0')}`:'時間を気にせず、好きなだけ。'}</Text>
   {complete?<View style={s.controls}><PressScale accessibilityLabel="もう少し過ごす" onPress={()=>{setRemaining(duration);setComplete(false);}} style={s.finish}><Text style={s.controlText}>もう少し過ごす</Text></PressScale><PressScale accessibilityLabel="おはなしに戻る" onPress={()=>{Analytics.restEventCompleted(true);onClose();}} style={s.finish}><Text style={s.controlText}>おはなしに戻る</Text></PressScale></View>:<View style={s.controls}>
    <PressScale accessibilityLabel={muted?'音をオンにする':'音をオフにする'} onPress={()=>setMuted(!muted)} style={s.sound}><Icon name={muted?'volume-x':'volume-2'} size={18} color="#F5EAF3"/><Text style={s.controlText}>{muted?'音をオン':'環境音'}</Text></PressScale>
    <PressScale accessibilityLabel="音量を下げる" disabled={muted||volume<=.1} onPress={()=>setVolume(Math.max(.1,Math.round((volume-.15)*100)/100))} style={s.round}><Icon name="minus" color="#F5EAF3" size={18}/></PressScale>
    <View style={s.volume} accessibilityLabel={`音量 ${Math.round(volume*100)}パーセント`}>{[.1,.3,.5,.7,.9].map(v=><View key={v} style={[s.volumeDot,{backgroundColor:!muted&&volume>=v?'#E5D2EC':'#FFFFFF30'}]}/>)}</View>
    <PressScale accessibilityLabel="音量を上げる" disabled={muted||volume>=1} onPress={()=>setVolume(Math.min(1,Math.round((volume+.15)*100)/100))} style={s.round}><Icon name="plus" color="#F5EAF3" size={18}/></PressScale>
   </View>}
   {audio.error&&!muted&&<PressScale accessibilityLabel="環境音をもう一度再生" onPress={audio.retry} style={s.retry}><Text style={s.sceneSub}>音を再生できませんでした。タップして再生</Text></PressScale>}
  </View>
 </View>;
}
const s=StyleSheet.create({
 overlay:{flex:1,backgroundColor:'#090711CC',justifyContent:'flex-end'},sheet:{flexGrow:0,maxHeight:'96%',width:'100%',maxWidth:560,alignSelf:'center',backgroundColor:'#211B2B',borderTopLeftRadius:30,borderTopRightRadius:30,borderWidth:1,borderColor:'#C6AED12B'},content:{paddingHorizontal:20},handle:{width:34,height:3,borderRadius:2,backgroundColor:'#BDABCC55',alignSelf:'center',marginBottom:16},header:{alignItems:'center',gap:8,marginBottom:24},eyebrow:{fontSize:9,letterSpacing:3,color:'#B9A7C6',marginTop:8},title:{fontSize:25,lineHeight:36,fontWeight:'600',color:'#FAF0F4',letterSpacing:.5},subtitle:{fontSize:12,lineHeight:20,color:'#B5A7C0'},grid:{flexDirection:'row',flexWrap:'wrap',gap:12},card:{width:'48%',flexGrow:1,minWidth:120,height:174,borderRadius:17,overflow:'hidden',backgroundColor:'#17131E',borderWidth:1,borderColor:'#E9DDF222'},cardText:{position:'absolute',left:13,right:10,bottom:14,gap:7},cardEyebrow:{fontSize:8,letterSpacing:1.6},cardTitle:{fontSize:16,fontWeight:'600',color:'#FFF2E9'},cardSub:{fontSize:10,lineHeight:17,color:'#E4D8DD'},timeRow:{marginTop:21,flexDirection:'row',flexWrap:'wrap',alignItems:'center',justifyContent:'space-between',gap:8},timeLabel:{color:'#B7A7C4',fontSize:12},chips:{flexDirection:'row',gap:7},chip:{minWidth:56,minHeight:44,borderRadius:14,alignItems:'center',justifyContent:'center',paddingHorizontal:12,borderWidth:1,borderColor:'#CCB8DA22'},chipSelected:{backgroundColor:'#44334F',borderColor:'#BBA0D066'},chipText:{fontSize:12,color:'#A99BB5'},skip:{minHeight:52,alignItems:'center',justifyContent:'center',marginTop:6},skipText:{color:'#C2B3CD',fontSize:13},full:{flex:1,backgroundColor:'#15101D'},top:{position:'absolute',left:18,right:18,flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:10},topLabel:{fontSize:9,letterSpacing:2,color:'#F1E3E6'},round:{width:44,height:44,borderRadius:22,backgroundColor:'#1A142E55',alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:'#FFFFFF21'},bottom:{position:'absolute',left:20,right:20,bottom:0,alignItems:'center',gap:10},sceneTitle:{fontSize:22,lineHeight:32,fontWeight:'500',letterSpacing:1,color:'#FFF0E8',textAlign:'center'},sceneSub:{fontSize:11,lineHeight:20,color:'#D9CBDD',textAlign:'center'},controls:{flexDirection:'row',gap:8,alignItems:'center',justifyContent:'center',marginTop:8},sound:{minHeight:44,flexDirection:'row',gap:8,alignItems:'center',paddingHorizontal:14,borderRadius:23,backgroundColor:'#241B32A6',borderWidth:1,borderColor:'#FFFFFF29'},controlText:{fontSize:12,color:'#EEE0EB'},volume:{flexDirection:'row',gap:4,alignItems:'center'},volumeDot:{width:3,height:11,borderRadius:2},finish:{minHeight:46,paddingHorizontal:15,borderRadius:22,backgroundColor:'#3C2A47DD',alignItems:'center',justifyContent:'center'},retry:{minHeight:44,justifyContent:'center'},
});
