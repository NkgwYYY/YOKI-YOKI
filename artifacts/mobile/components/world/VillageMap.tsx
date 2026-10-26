import {worldAccessFor,mapUnlockHint} from '@/utils/worldProgress';
import {villageStory} from '@/data/villageStories';
import {useApp} from '@/contexts/AppContext';
import {getTodayDate} from '@/utils/dateUtils';
import {gardenUnlocked} from '@/utils/vegetableGarden';
import React,{useEffect,useState} from 'react';
import {ActivityIndicator,Image,Modal,Platform,Pressable,ScrollView,StyleSheet,Text,View,useWindowDimensions} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Svg,{Path} from 'react-native-svg';
import {Icon,type IconName} from '@/components/ui/Icon';
import {canVisitMap,isMapAvailable,WORLD_MAPS,type WorldMapId} from '@/utils/worldMaps';
import {MAP_COORDS,VILLAGE_LINKS} from '@/utils/villageLife';
import {worldArt,prepareWorldArt,VILLAGE_ATLAS,prepareVillageAtlas} from '@/utils/worldArt';
import {WorldPill} from './WorldPill';
const symbols:Record<WorldMapId,IconName>={grandma:'home',bank:'briefcase',fortune:'moon',home:'home',market:'map-pin',forest:'feather',onsen:'sun',village:'users',lake:'droplet',ramen:'coffee',bowling:'circle',tobacco:'wind',homewares:'shopping-bag',workshop:'briefcase'};
const names:Record<WorldMapId,string>={grandma:'おばあさんの家',bank:'こもれび銀行',fortune:'占いの館',home:'おうち',market:'こもれび広場',forest:'木もれびの森',onsen:'森の温泉',village:'となりの村',lake:'星あかりの湖',ramen:'ラーメン屋',bowling:'ボウリング',tobacco:'路地裏のタバコ屋',homewares:'暮らしのお店',workshop:'ゆでたまご工房'};
export function VillageMap({current,night,disabled,onSelect,onClose}:{current:WorldMapId;night:boolean;disabled:boolean;onSelect:(id:WorldMapId)=>void;onClose:()=>void}){
 const {feedState,progress}=useApp(),grandmaOpen=gardenUnlocked(feedState),access=worldAccessFor(progress,feedState.villageStories);
 const visibleMaps=WORLD_MAPS.filter(p=>isMapAvailable(p.id,Platform.OS)&&(p.id!=='grandma'||grandmaOpen));
 const window=useWindowDimensions(),insets=useSafeAreaInsets(),[selected,setSelected]=useState(current);
 const width=Math.min(window.width,640),height=Math.max(560,Math.min(750,window.height-insets.top-insets.bottom-225));
 const [atlasReady,setAtlasReady]=useState(false);
 useEffect(()=>{
  void prepareVillageAtlas().catch(()=>{});
 },[]);
 useEffect(()=>{if(canVisitMap(selected,access,grandmaOpen,Platform.OS))void prepareWorldArt(selected,night).catch(()=>{});},[selected,JSON.stringify(access),grandmaOpen,night]);
 const place=WORLD_MAPS.find(p=>p.id===selected)!,open=canVisitMap(selected,access,grandmaOpen,Platform.OS);
 const guideStory=selected==='lake'&&(feedState.villageStories?.arcs.newcomer?.episodes.length??0)>=6?'cat':'newcomer';
 const guideEpisode=villageStory(guideStory).episodes[feedState.villageStories?.arcs[guideStory]?.episodes.length??0];
 const guidePlace=guideEpisode?.place??'market';
 const guidePlaceName=WORLD_MAPS.find(p=>p.id===guidePlace)?.name??'こもれび広場';
 const storyWaiting=(feedState.villageStories?.arcs[guideStory]?.episodes.at(-1)?.date??'')>=getTodayDate();
 return <Modal transparent={false} animationType="fade" onRequestClose={onClose}><View style={s.root}>
  <View style={[s.header,{paddingTop:Math.max(20,insets.top+12)}]}><View><Text style={s.kicker}>YOKI YOKI / WORLD ATLAS</Text><Text style={s.title}>村をめぐる</Text></View><WorldPill compact label="地図を閉じる" icon="x" onPress={onClose}/></View>
  <ScrollView contentContainerStyle={{alignItems:'center',paddingBottom:12}} showsVerticalScrollIndicator={false}>
   <View testID="village-map" style={{width,height,overflow:'hidden'}}>
    <LinearGradient pointerEvents="none" colors={['#384B45','#72664F','#2A383C']} style={StyleSheet.absoluteFill}/>
    <Image testID="village-atlas-art" source={VILLAGE_ATLAS} resizeMode="stretch" onLoad={()=>setAtlasReady(true)} style={{position:'absolute',left:0,top:0,width,height,opacity:atlasReady?1:0}}/>
    {!atlasReady&&<View pointerEvents="none" style={{position:'absolute',top:12,right:12}}><ActivityIndicator size="small" color="#675072"/></View>}
    <View pointerEvents="none" style={[StyleSheet.absoluteFill,{backgroundColor:'#100C1929'}]}/>
    <Svg width={width} height={height} style={StyleSheet.absoluteFill} viewBox={`0 0 ${width} ${height}`} pointerEvents="none">
     {visibleMaps.flatMap(p=>VILLAGE_LINKS[p.id].filter(to=>p.id<to&&isMapAvailable(to,Platform.OS)&&(to!=='grandma'||grandmaOpen)).map(to=>{const a=MAP_COORDS[p.id],b=MAP_COORDS[to],highlight=selected===p.id||selected===to;return <Path key={`${p.id}-${to}`} d={`M ${a.x*width} ${a.y*height} Q ${(a.x+b.x)*width/2+12} ${(a.y+b.y)*height/2-15} ${b.x*width} ${b.y*height}`} fill="none" stroke={highlight?'#E6C888':'#D4C09A8C'} strokeWidth={highlight?1.8:1} strokeDasharray="3 5"/>;}))}
    </Svg>
    {visibleMaps.map(p=>{const at=MAP_COORDS[p.id],chosen=selected===p.id,here=current===p.id,unlocked=canVisitMap(p.id,access,grandmaOpen,Platform.OS);return <Pressable key={p.id} testID={`world-map-${p.id}`} accessibilityRole="button" accessibilityLabel={`${p.name}${here?'、いまここ':unlocked?'':`、${mapUnlockHint(p.id,feedState.villageStories)}`}`} accessibilityState={{selected:chosen}} onPress={()=>setSelected(p.id)} style={[s.location,{left:at.x*width-53,top:at.y*height-20}]}>
     {here&&<Text style={s.here}>現在地</Text>}<View style={[s.diamond,chosen&&s.selected,!unlocked&&{opacity:.65}]}><View style={{transform:[{rotate:'0deg'}]}}><Icon name={unlocked?symbols[p.id]:'lock'} size={16} color={chosen?'#FFF9FF':'#9575A6'}/></View></View><Text numberOfLines={1} style={[s.name,chosen&&{color:'#806293'}]}>{names[p.id]}</Text>
    </Pressable>;})}
    <LinearGradient pointerEvents="none" colors={['transparent','#F7F2FA']} style={s.fade}/>
   </View>
  </ScrollView>
  <View testID="village-map-selection" style={[s.detail,{paddingBottom:Math.max(18,insets.bottom+8)}]}><Image source={worldArt(selected,night)} style={s.thumbnail}/><View style={{flex:1,gap:5}}><Text style={s.place}>{place.name}</Text><Text style={s.copy}>{open?place.description:mapUnlockHint(selected,feedState.villageStories)}</Text>{!open&&<Text testID="world-map-story-guide" style={s.copy}>{storyWaiting?`続きは明日以降、${guidePlaceName}で。`:`お話の場所：${guidePlaceName}`}</Text>}</View></View>
  <View style={[s.actions,{paddingBottom:Math.max(18,insets.bottom)}]}><WorldPill testID="world-map-home-now" primary label="おうちに帰る" icon="home" disabled={disabled} onPress={()=>current==='home'?onClose():onSelect('home')} style={{flex:1}}/><WorldPill testID="world-map-travel" style={{flex:1}} label={!open?'お話の場所へ':selected===current?'ここに戻る':'ここへ向かう'} accessibilityLabel={!open?`${guidePlaceName}へ向かう`:undefined} icon="navigation" disabled={disabled} onPress={()=>!open?(guidePlace===current?onClose():onSelect(guidePlace)):selected===current?onClose():onSelect(selected)}/></View>
 </View></Modal>;
}
const s=StyleSheet.create({root:{flex:1,backgroundColor:'#F7F2FA'},header:{paddingHorizontal:22,paddingBottom:20,flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderBottomWidth:1,borderColor:'#E5D9EC'},kicker:{fontSize:9,letterSpacing:2.5,color:'#9880AB'},title:{fontSize:24,letterSpacing:.5,color:'#554063',marginTop:8,fontWeight:'500'},location:{position:'absolute',width:106,minHeight:58,alignItems:'center',gap:9,justifyContent:'center'},diamond:{width:29,height:29,borderWidth:1,borderColor:'#DED0E8',backgroundColor:'#FFF9FFF2',borderRadius:18,alignItems:'center',justifyContent:'center',shadowColor:'#000',shadowOpacity:.12,shadowRadius:8},selected:{backgroundColor:'#A488B8',borderColor:'#8E6DA3',shadowColor:'#BA9BCF',shadowOpacity:.2,shadowRadius:12},name:{fontSize:10,fontWeight:'600',color:'#675072',backgroundColor:'#FFFAFFE6',paddingVertical:4,paddingHorizontal:6,borderBottomWidth:1,borderColor:'#DFD1E7'},here:{position:'absolute',top:-19,fontSize:8,letterSpacing:2,color:'#8E6DA3',backgroundColor:'#F1E4F7',paddingHorizontal:6,paddingVertical:2},fade:{position:'absolute',bottom:0,left:0,right:0,height:30},detail:{paddingHorizontal:22,paddingTop:12,flexDirection:'row',gap:14,alignItems:'center',borderTopWidth:1,borderColor:'#E5D9EC'},thumbnail:{width:52,height:58,borderWidth:1,borderColor:'#D5C5E0',borderRadius:12},place:{fontSize:16,letterSpacing:1,color:'#554063'},copy:{fontSize:11,lineHeight:18,color:'#796B89'},actions:{flexDirection:'row',justifyContent:'space-between',gap:12,paddingHorizontal:22}});
