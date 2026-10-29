import React,{useState} from 'react';
import {Image,StyleSheet,Text,View,useWindowDimensions} from 'react-native';
import {FeltPressable as Pressable} from '@/components/ui/FeltPressable';
import {router} from 'expo-router';
import {useSharedValue,withTiming} from 'react-native-reanimated';
import {VolumeResident} from '@/components/world/VolumeResident';
import {HOME_ART} from '@/utils/worldArt';
import Svg,{Defs,RadialGradient,Stop,Ellipse} from 'react-native-svg';
import type {EvolvedForm} from '@/utils/evolved3d';
import {useAppActivity} from '@/components/room/useRoomActivity';

/** Read-only fitting room: previewing a form never changes the user's stage. */
export default function CharacterPreview(){
  const {width,height}=useWindowDimensions(),{active,reduceMotion}=useAppActivity();
  const [stage,setStage]=useState<EvolvedForm>('odango'),[happy,setHappy]=useState(false),[night,setNight]=useState(false);
  const rx=useSharedValue(0),ry=useSharedValue(0),rz=useSharedValue(0),blink=useSharedValue(0);
  const turn=(x:number,y:number)=>{rx.value=withTiming(x,{duration:reduceMotion?0:420});ry.value=withTiming(y,{duration:reduceMotion?0:420});};
  const size=Math.min(240,width*.51);
  const forms=[['odango','モフモフ'],['stage3','はっぱ'],['stage4','カラフルはっぱ']] as const;
  return <View style={s.root}>
    <Image source={HOME_ART[night?'night':'day']} style={[StyleSheet.absoluteFill,{width:'100%',height:'100%'}]} resizeMode="cover"/>
    <View style={s.top}><Pressable accessibilityRole="button" onPress={()=>router.replace('/')}><Text style={s.back}>‹ ホームへ</Text></Pressable><Text style={s.title}>仲間たちのすがた</Text><Text style={s.note}>進化や記録を変えずに見られます</Text></View>
    <View style={{position:'absolute',top:Math.max(180,height*.47),left:(width-size)/2,width:size,height:size}}>
      <View pointerEvents="none" style={{position:'absolute',width:size,height:size*.22,left:0,bottom:0}}><Svg width="100%" height="100%" viewBox="0 0 100 22"><Defs><RadialGradient id="preview-shadow"><Stop offset="0" stopColor="#34251a" stopOpacity={.36}/><Stop offset="1" stopColor="#34251a" stopOpacity={0}/></RadialGradient></Defs><Ellipse cx={50} cy={12} rx={35} ry={5} fill="url(#preview-shadow)"/></Svg></View>
      <VolumeResident stage={stage} size={size} rx={rx} ry={ry} rz={rz} blink={blink} mood={happy?'happy':'normal'} night={night} active={active} reduceMotion={reduceMotion}/>
    </View>
    <View style={s.bottom}>
      <View style={s.row}>{forms.map(([key,label])=><Pressable key={key} accessibilityRole="button" accessibilityState={{selected:key===stage}} onPress={()=>{setStage(key);turn(0,0);}} style={[s.button,key===stage&&s.selected]}><Text style={s.label}>{label}</Text></Pressable>)}</View>
      <View style={s.row}>{[['正面',0,0],['ななめ',0,.65],['横',0,Math.PI/2],['後ろ',0,Math.PI],['上から',.6,0]].map(([label,x,y])=><Pressable key={label} accessibilityRole="button" onPress={()=>turn(Number(x),Number(y))} style={s.small}><Text style={s.label}>{label}</Text></Pressable>)}</View>
      <View style={s.row}><Pressable accessibilityRole="button" onPress={()=>setHappy(!happy)} style={s.small}><Text style={s.label}>{happy?'いつもの顔に':'にっこり'}</Text></Pressable><Pressable accessibilityRole="button" onPress={()=>setNight(!night)} style={s.small}><Text style={s.label}>{night?'昼の明かり':'夜の明かり'}</Text></Pressable></View>
    </View>
  </View>;
}
const s=StyleSheet.create({root:{flex:1,minHeight:580,backgroundColor:'#efe8d8'},top:{paddingTop:30,paddingHorizontal:24},back:{color:'#fff4d8',fontSize:15,textShadowColor:'#322819',textShadowRadius:5},title:{color:'#fff8df',fontSize:26,marginTop:14,textShadowColor:'#322819',textShadowRadius:6},note:{color:'#fff8df',fontSize:12,marginTop:7,textShadowColor:'#322819',textShadowRadius:5},bottom:{position:'absolute',bottom:24,left:16,right:16,gap:9},row:{flexDirection:'row',justifyContent:'center',flexWrap:'wrap',gap:7},button:{paddingVertical:12,paddingHorizontal:13,borderRadius:18,backgroundColor:'#292236ed',borderWidth:1,borderColor:'#9b8d70'},selected:{backgroundColor:'#65536ded',borderColor:'#f2d59a'},small:{paddingVertical:10,paddingHorizontal:12,borderRadius:16,backgroundColor:'#292236e8'},label:{fontSize:12,color:'#fff4d8'}});
