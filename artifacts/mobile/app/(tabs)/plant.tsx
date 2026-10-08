import React,{useEffect,useState} from 'react';
import {Image,Platform,StyleSheet,Text,View,useWindowDimensions} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useApp} from '@/contexts/AppContext';
import {useRoomActivity} from '@/components/room/useRoomActivity';
import {BathingEgg,VillageResident} from '@/components/village/VillageActors';
import {WorldPill} from '@/components/world/WorldPill';
import {useVillageBgm} from '@/components/world/useVillageBgm';
import {getMascotStage} from '@/utils/mascotUtils';
import {fitWorld} from '@/utils/worldGeometry';
import {HAPPY_REWARDS,readHappiness} from '@/utils/happiness';
import {getTodayDate} from '@/utils/dateUtils';
import {getTabBarHeight} from '@/utils/tabLayout';

export default function HomeBathScreen(){
  const insets=useSafeAreaInsets(),window=useWindowDimensions();
  const {active,reduceMotion}=useRoomActivity();
  const {progress,feedState,awardHappiness}=useApp();
  const music=useVillageBgm(active);
  const [bathing,setBathing]=useState(false),[message,setMessage]=useState('');
  const [attempt,setAttempt]=useState(0),[failed,setFailed]=useState(false);
  const frame=fitWorld(window.width,window.height);
  const stage=getMascotStage(progress.level);
  const todayDone=readHappiness(feedState.happiness,getTodayDate()).days[getTodayDate()]?.includes('homeBath');
  useEffect(()=>{
    if(!bathing||!active)return;
    let alive=true;setFailed(false);setMessage('肩までつかって、ほっとひと息。');
    const timer=setTimeout(()=>void awardHappiness('homeBath').then(result=>{
      if(alive)setMessage(result.gained?`ぽかぽかになったね。幸福 ＋${result.gained}`:'今日も、おうちのお湯でのんびり。');
    }).catch(()=>{if(alive){setFailed(true);setMessage('保存できませんでした。もう一度試せます。');}}),8000);
    return()=>{alive=false;clearTimeout(timer);};
  },[bathing,active,attempt,awardHappiness]);
  return <View testID="home-bath-scene" style={s.root}>
    <Image source={require('@/assets/images/world/home-bath.jpg')} resizeMode="cover" blurRadius={18} style={[StyleSheet.absoluteFill,{width:'100%',height:'100%'}]}/>
    <View style={{position:'absolute',...frame}}>
      <Image source={require('@/assets/images/world/home-bath.jpg')} style={[StyleSheet.absoluteFill,{width:'100%',height:'100%'}]}/>
      {bathing?<BathingEgg stage={stage} width={frame.width} height={frame.height} active={active} reduceMotion={reduceMotion} x={.54} y={.414} label="自宅のおふろ"/>:
        <View style={{position:'absolute',left:frame.width*.53,top:frame.height*.60}}><VillageResident stage={stage} size={frame.width*.14} active={active} reduceMotion={reduceMotion}/></View>}
    </View>
    <View style={[s.header,{top:insets.top+24}]}><View><Text style={s.title}>おうちのおふろ</Text><Text style={s.copy}>いつものお湯で、ちょっとしあわせ。</Text></View><WorldPill compact label="BGM" icon={music.enabled?'volume-2':'volume-x'} onPress={music.toggle}/></View>
    <View style={[s.card,{bottom:getTabBarHeight('',insets.bottom)+16}]}>
      <Text testID="home-bath-message" accessibilityLiveRegion="polite" style={s.message}>{bathing?message:todayDone?'今日のおふろの幸福は受け取り済み。何度でも、のんびり入れるよ。':`おふろで幸福 ＋${HAPPY_REWARDS.homeBath}。毎日の小さなひと休み。`}</Text>
      {failed&&<WorldPill label="保存をもう一度試す" icon="refresh-cw" onPress={()=>setAttempt(n=>n+1)}/>}
      <WorldPill testID="home-bath-toggle" primary label={bathing?'お湯からあがる':'おふろに入る'} icon="droplet" onPress={()=>{setMessage('肩までつかって、ほっとひと息。');setBathing(!bathing);}}/>
      <Text style={s.hint}>森の温泉は、特別なひと休み。幸福 ＋{HAPPY_REWARDS.bath}</Text>
    </View>
  </View>;
}
const s=StyleSheet.create({root:{flex:1,backgroundColor:'#EBD5B8',overflow:Platform.OS==='web'?'clip' as 'hidden':'hidden'},header:{position:'absolute',left:22,right:22,flexDirection:'row',justifyContent:'space-between',alignItems:'center'},title:{fontSize:23,fontWeight:'700',color:'#694F50'},copy:{fontSize:11,color:'#755D55',marginTop:8},card:{position:'absolute',alignSelf:'center',width:'88%',maxWidth:420,padding:18,borderRadius:24,backgroundColor:'#FFF9F0F2',gap:14},message:{fontSize:13,lineHeight:22,textAlign:'center',color:'#765D6C'},hint:{fontSize:10,textAlign:'center',color:'#96848C'}});
