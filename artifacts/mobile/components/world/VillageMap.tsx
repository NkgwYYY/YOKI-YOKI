import {worldAccessFor,mapUnlockHint} from '@/utils/worldProgress';
import {villageStory} from '@/data/villageStories';
import {useApp} from '@/contexts/AppContext';
import {getTodayDate} from '@/utils/dateUtils';
import {gardenUnlocked} from '@/utils/vegetableGarden';
import React,{useEffect,useState} from 'react';
import {ActivityIndicator,Image,Modal,Platform,ScrollView,StyleSheet,Text,View,useWindowDimensions} from 'react-native';
import {FeltPressable as Pressable} from '@/components/ui/FeltPressable';
import {LinearGradient} from 'expo-linear-gradient';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Svg,{Path} from 'react-native-svg';
import {Icon,type IconName} from '@/components/ui/Icon';
import {canVisitMap,isMapAvailable,WORLD_MAPS,type WorldMapId} from '@/utils/worldMaps';
import {VILLAGE_LINKS} from '@/utils/villageLife';
import {villageAtlasLayout} from '@/utils/villageAtlasLayout';
import {worldArt,prepareWorldArt,VILLAGE_ATLAS,prepareVillageAtlas} from '@/utils/worldArt';
import {WorldPill} from './WorldPill';
const symbols:Record<WorldMapId,IconName>={grandma:'home',bank:'briefcase',fortune:'moon',home:'home',market:'map-pin',forest:'feather',onsen:'sun',village:'users',lake:'droplet',ramen:'coffee',bowling:'circle',tobacco:'wind',homewares:'shopping-bag',workshop:'briefcase'};
const names:Record<WorldMapId,string>={grandma:'おばあさんの家',bank:'こもれび銀行',fortune:'占いの館',home:'おうち',market:'こもれび広場',forest:'木もれびの森',onsen:'森の温泉',village:'となりの村',lake:'星あかりの湖',ramen:'ラーメン屋',bowling:'ボウリング',tobacco:'タバコ屋',homewares:'暮らしのお店',workshop:'ゆでたまご工房'};
export function VillageMap({current,night,disabled,onSelect,onClose}:{current:WorldMapId;night:boolean;disabled:boolean;onSelect:(id:WorldMapId)=>void;onClose:()=>void}){
 const {feedState,progress}=useApp(),grandmaOpen=gardenUnlocked(feedState),access=worldAccessFor(progress,feedState.villageStories);
 const visibleMaps=WORLD_MAPS.filter(p=>isMapAvailable(p.id,Platform.OS)&&(p.id!=='grandma'||grandmaOpen));
 const window=useWindowDimensions(),insets=useSafeAreaInsets(),[selected,setSelected]=useState(current);
 const wide=window.width>=700&&window.width>window.height;
 const points=villageAtlasLayout(visibleMaps.map(p=>p.id),wide);
 const width=Math.min(window.width-(wide?280:24),640);
 const height=Math.max(wide?288:336,Math.min(620,window.height-insets.top-insets.bottom-(wide?90:244)));
 const nodeWidth=Math.min(94,width*.28);
 const [atlasReady,setAtlasReady]=useState(false);
 useEffect(()=>{void prepareVillageAtlas().catch(()=>{});},[]);
 useEffect(()=>{if(canVisitMap(selected,access,grandmaOpen,Platform.OS))void prepareWorldArt(selected,night).catch(()=>{});},[selected,JSON.stringify(access),grandmaOpen,night]);
 const place=WORLD_MAPS.find(p=>p.id===selected)!,open=canVisitMap(selected,access,grandmaOpen,Platform.OS);
 const guideStory=selected==='lake'&&(feedState.villageStories?.arcs.newcomer?.episodes.length??0)>=6?'cat':'newcomer';
 const guideEpisode=villageStory(guideStory).episodes[feedState.villageStories?.arcs[guideStory]?.episodes.length??0];
 const guidePlace=guideEpisode?.place??'market';
 const guidePlaceName=WORLD_MAPS.find(p=>p.id===guidePlace)?.name??'こもれび広場';
 const storyWaiting=(feedState.villageStories?.arcs[guideStory]?.episodes.at(-1)?.date??'')>=getTodayDate();
 const travel=()=>!open?(guidePlace===current?onClose():onSelect(guidePlace)):selected===current?onClose():onSelect(selected);
 return <Modal transparent={false} animationType="fade" onRequestClose={onClose}><View style={s.root}>
  <View style={[s.header,{paddingTop:Math.max(12,insets.top+8)}]}><View><Text style={s.title}>おでかけ</Text><Text style={s.copy}>行きたい場所を選んでね</Text></View><WorldPill compact label="地図を閉じる" icon="x" onPress={onClose}/></View>
  <View style={[s.content,wide&&{flexDirection:'row'}]}>
   <ScrollView style={{flex:1}} contentContainerStyle={{alignItems:'center',paddingBottom:8}} showsVerticalScrollIndicator={false}>
    <View testID="village-map" style={[s.atlas,{width,height}]}>
     <LinearGradient pointerEvents="none" colors={['#DFE7D3','#E8DDC9','#D0DDC8']} style={StyleSheet.absoluteFill}/>
     <Image testID="village-atlas-art" source={VILLAGE_ATLAS} resizeMode="cover" onLoad={()=>setAtlasReady(true)} style={{position:'absolute',left:0,top:0,width,height,opacity:atlasReady?.88:0}}/>
     {!atlasReady&&<ActivityIndicator style={{position:'absolute',top:12,right:12}} size="small" color="#675072"/>}
     <View pointerEvents="none" style={[StyleSheet.absoluteFill,{backgroundColor:'#F6F0E426'}]}/>
     <Svg width={width} height={height} style={StyleSheet.absoluteFill} pointerEvents="none">
      {VILLAGE_LINKS[selected].filter(to=>points[to]).map(to=>{const a=points[selected]!,b=points[to]!;return <Path key={to} d={`M ${a.x*width} ${a.y*height} Q ${(a.x+b.x)*width/2+12} ${(a.y+b.y)*height/2-12} ${b.x*width} ${b.y*height}`} fill="none" stroke="#FFF9F0CC" strokeWidth={2.5} strokeDasharray="3 6"/>;})}
     </Svg>
     {visibleMaps.map(p=>{const at=points[p.id]!,chosen=selected===p.id,here=current===p.id,unlocked=canVisitMap(p.id,access,grandmaOpen,Platform.OS);return <Pressable key={p.id} testID={`world-map-${p.id}`} accessibilityRole="button" accessibilityLabel={`${p.name}${here?'、いまここ':unlocked?'':`、${mapUnlockHint(p.id,feedState.villageStories)}`}`} accessibilityState={{selected:chosen}} onPress={()=>setSelected(p.id)} style={[s.location,{width:nodeWidth,left:at.x*width-nodeWidth/2,top:at.y*height-40}]}>
      <View style={[s.marker,chosen&&s.selected,!unlocked&&{backgroundColor:'#F5EFF5E6'}]}><Icon name={unlocked?symbols[p.id]:'lock'} size={19} color={chosen?'#FFF9FF':'#8A7196'}/>{here&&<View testID="world-map-current-dot" style={s.currentDot}/>}</View>
      <Text numberOfLines={1} style={[s.name,chosen&&{backgroundColor:'#EFE4F7',color:'#685078'}]}>{names[p.id]}</Text>
      {here&&<Text style={s.here}>いまここ</Text>}
     </Pressable>;})}
    </View>
   </ScrollView>
   <View style={[s.panel,wide&&{width:256,paddingRight:16,paddingLeft:4,justifyContent:'center'},!wide&&{paddingBottom:Math.max(12,insets.bottom)}]}>
    <View testID="village-map-selection" style={[s.detail,wide&&{flexDirection:'column',alignItems:'flex-start'}]}>
     <Image source={worldArt(selected,night)} style={[s.thumbnail,wide&&{width:'100%',height:88}]}/>
     <View style={{flexShrink:1,gap:4}}><Text style={s.place}>{place.name}</Text><Text style={s.copy}>{open?place.description:mapUnlockHint(selected,feedState.villageStories)}</Text>{!open&&<Text testID="world-map-story-guide" style={s.copy}>{storyWaiting?`続きは明日以降、${guidePlaceName}で。`:`お話の場所：${guidePlaceName}`}</Text>}</View>
    </View>
    <View style={[s.actions,wide&&{flexDirection:'column'}]}>
     {current!=='home'&&<WorldPill testID="world-map-home-now" label="おうちに帰る" icon="home" disabled={disabled} onPress={()=>onSelect('home')} style={!wide&&{flex:1}}/>}
     <WorldPill testID="world-map-travel" primary style={!wide&&{flex:1}} label={!open?'お話の場所へ':selected===current?'地図を閉じる':'ここへ向かう'} accessibilityLabel={!open?`${guidePlaceName}へ向かう`:undefined} icon={selected===current&&open?'check':'navigation'} disabled={disabled} onPress={travel}/>
    </View>
   </View>
  </View>
 </View></Modal>;
}
const s=StyleSheet.create({
 root:{flex:1,backgroundColor:'#F6F1E5'},content:{flex:1,minHeight:0},
 header:{paddingHorizontal:20,paddingBottom:14,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},title:{fontSize:23,color:'#554063',fontWeight:'600',marginBottom:4},
 atlas:{borderRadius:26,overflow:'hidden',borderWidth:1,borderColor:'#E3D9DD'},
 location:{position:'absolute',width:94,height:80,alignItems:'center',gap:4},
 marker:{width:40,height:40,borderWidth:1.5,borderColor:'#FDF9FF',backgroundColor:'#FFF9FFF2',borderRadius:20,alignItems:'center',justifyContent:'center',shadowColor:'#665075',shadowOpacity:.18,shadowRadius:8,shadowOffset:{width:0,height:3}},
 selected:{backgroundColor:'#A488B8',borderColor:'#EBDDF4'},currentDot:{position:'absolute',right:-2,bottom:0,width:10,height:10,borderRadius:5,backgroundColor:'#A3BC8B',borderWidth:2,borderColor:'#FFF'},
 name:{fontSize:10,fontWeight:'600',color:'#675072',backgroundColor:'#FFF8EA',borderRadius:9,paddingVertical:4,paddingHorizontal:5,maxWidth:'100%'},here:{fontSize:9,color:'#675072',backgroundColor:'#FFF8EA',borderRadius:6,paddingHorizontal:5},
 panel:{paddingHorizontal:20,paddingTop:8},detail:{flexDirection:'row',gap:12,alignItems:'center',paddingBottom:12},thumbnail:{width:52,height:60,borderRadius:14},place:{fontSize:16,color:'#554063',fontWeight:'600'},copy:{fontSize:11,lineHeight:17,color:'#7F6D5D'},actions:{flexDirection:'row',gap:10},
});
