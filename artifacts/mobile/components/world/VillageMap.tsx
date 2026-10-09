import React,{useEffect,useState} from 'react';
import {ActivityIndicator,Image,Modal,Pressable,ScrollView,StyleSheet,Text,View,useWindowDimensions} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Svg,{Path} from 'react-native-svg';
import {Icon,type IconName} from '@/components/ui/Icon';
import {canVisitMap,WORLD_MAPS,type WorldMapId} from '@/utils/worldMaps';
import {MAP_COORDS,VILLAGE_LINKS} from '@/utils/villageLife';
import {worldArt,prepareWorldArt,VILLAGE_ATLAS,prepareVillageAtlas} from '@/utils/worldArt';
import {WorldPill} from './WorldPill';
const symbols:Record<WorldMapId,IconName>={home:'home',market:'map-pin',forest:'feather',onsen:'sun',village:'users',lake:'droplet',ramen:'coffee',bowling:'circle',tobacco:'wind',homewares:'shopping-bag',diner:'coffee',workshop:'briefcase'};
const names:Record<WorldMapId,string>={home:'おうち',market:'こもれび広場',forest:'木もれびの森',onsen:'森の温泉',village:'となりの村',lake:'星あかりの湖',ramen:'ラーメン屋',bowling:'ボウリング',tobacco:'路地裏のタバコ屋',homewares:'暮らしのお店',diner:'ごはんのお店',workshop:'ゆでたまご工房'};
export function VillageMap({current,night,level,disabled,onSelect,onClose}:{current:WorldMapId;night:boolean;level:number;disabled:boolean;onSelect:(id:WorldMapId)=>void;onClose:()=>void}){
 const window=useWindowDimensions(),insets=useSafeAreaInsets(),[selected,setSelected]=useState(current);
 const width=Math.min(window.width,640),height=Math.max(560,Math.min(750,window.height-insets.top-insets.bottom-225));
 const [atlasReady,setAtlasReady]=useState(false);
 useEffect(()=>{
  let cancelled=false;
  void prepareVillageAtlas().then(()=>{
   if(!cancelled&&canVisitMap('tobacco',level))return prepareWorldArt('tobacco',night);
  }).catch(()=>{});
  return()=>{cancelled=true;};
 },[level,night]);
 useEffect(()=>{if(canVisitMap(selected,level))void prepareWorldArt(selected,night).catch(()=>{});},[selected,level,night]);
 const place=WORLD_MAPS.find(p=>p.id===selected)!,open=canVisitMap(selected,level);
 return <Modal transparent={false} animationType="fade" onRequestClose={onClose}><View style={s.root}>
  <View style={[s.header,{paddingTop:Math.max(20,insets.top+12)}]}><View><Text style={s.kicker}>YOKI YOKI / WORLD ATLAS</Text><Text style={s.title}>村をめぐる</Text></View><WorldPill compact label="地図を閉じる" icon="x" onPress={onClose}/></View>
  <ScrollView contentContainerStyle={{alignItems:'center',paddingBottom:12}} showsVerticalScrollIndicator={false}>
   <View testID="village-map" style={{width,height,overflow:'hidden'}}>
    <LinearGradient pointerEvents="none" colors={['#384B45','#72664F','#2A383C']} style={StyleSheet.absoluteFill}/>
    <Image testID="village-atlas-art" source={VILLAGE_ATLAS} resizeMode="stretch" onLoad={()=>setAtlasReady(true)} style={{position:'absolute',left:0,top:0,width,height,opacity:atlasReady?1:0}}/>
    {!atlasReady&&<View pointerEvents="none" style={{position:'absolute',top:12,right:12}}><ActivityIndicator size="small" color="#F1E7D3"/></View>}
    <View pointerEvents="none" style={[StyleSheet.absoluteFill,{backgroundColor:'#100C1929'}]}/>
    <Svg width={width} height={height} style={StyleSheet.absoluteFill} viewBox={`0 0 ${width} ${height}`} pointerEvents="none">
     {WORLD_MAPS.flatMap(p=>VILLAGE_LINKS[p.id].filter(to=>p.id<to).map(to=>{const a=MAP_COORDS[p.id],b=MAP_COORDS[to],highlight=selected===p.id||selected===to;return <Path key={`${p.id}-${to}`} d={`M ${a.x*width} ${a.y*height} Q ${(a.x+b.x)*width/2+12} ${(a.y+b.y)*height/2-15} ${b.x*width} ${b.y*height}`} fill="none" stroke={highlight?'#E6C888':'#D4C09A8C'} strokeWidth={highlight?1.8:1} strokeDasharray="3 5"/>;}))}
    </Svg>
    {WORLD_MAPS.map(p=>{const at=MAP_COORDS[p.id],chosen=selected===p.id,here=current===p.id,unlocked=canVisitMap(p.id,level);return <Pressable key={p.id} testID={`world-map-${p.id}`} accessibilityRole="button" accessibilityLabel={`${p.name}${here?'、いまここ':unlocked?'':`、レベル${p.level}でひらく`}`} accessibilityState={{selected:chosen}} onPress={()=>setSelected(p.id)} style={[s.location,{left:at.x*width-53,top:at.y*height-20}]}>
     {here&&<Text style={s.here}>現在地</Text>}<View style={[s.diamond,chosen&&s.selected,!unlocked&&{opacity:.65}]}><View style={{transform:[{rotate:'-45deg'}]}}><Icon name={unlocked?symbols[p.id]:'lock'} size={16} color={chosen?'#FFF0BD':'#DECEAC'}/></View></View><Text numberOfLines={1} style={[s.name,chosen&&{color:'#FFE5A8'}]}>{names[p.id]}</Text>
    </Pressable>;})}
    <LinearGradient pointerEvents="none" colors={['transparent','#14101F']} style={s.fade}/>
   </View>
  </ScrollView>
  <View testID="village-map-selection" style={[s.detail,{paddingBottom:Math.max(18,insets.bottom+8)}]}><Image source={worldArt(selected,night)} style={s.thumbnail}/><View style={{flex:1,gap:5}}><Text style={s.place}>{place.name}</Text><Text style={s.copy}>{open?place.description:`レベル ${place.level} でひらきます`}</Text></View></View>
  <View style={[s.actions,{paddingBottom:Math.max(18,insets.bottom)}]}><WorldPill testID="world-map-home-now" primary label="おうちに帰る" icon="home" disabled={disabled} onPress={()=>current==='home'?onClose():onSelect('home')} style={{flex:1}}/><WorldPill testID="world-map-travel" style={{flex:1}} label={selected===current?'ここに戻る':'ここへ向かう'} icon="navigation" disabled={disabled||!open} onPress={()=>selected===current?onClose():onSelect(selected)}/></View>
 </View></Modal>;
}
const s=StyleSheet.create({root:{flex:1,backgroundColor:'#14101F'},header:{paddingHorizontal:22,paddingBottom:20,flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderBottomWidth:1,borderColor:'#AD96713F'},kicker:{fontSize:9,letterSpacing:2.5,color:'#BFA77A'},title:{fontSize:24,letterSpacing:3,color:'#F2E7D8',marginTop:8,fontWeight:'500'},location:{position:'absolute',width:106,minHeight:58,alignItems:'center',gap:9,justifyContent:'center'},diamond:{width:29,height:29,borderWidth:1,borderColor:'#CEB78E',backgroundColor:'#282035E8',transform:[{rotate:'45deg'}],alignItems:'center',justifyContent:'center',shadowColor:'#000',shadowOpacity:.6,shadowRadius:8},selected:{backgroundColor:'#8B7044',borderColor:'#FFE6AA',shadowColor:'#F0C777',shadowOpacity:.7,shadowRadius:12},name:{fontSize:10,fontWeight:'600',color:'#F1E7D3',textShadowColor:'#100D18',textShadowRadius:6,backgroundColor:'#1C1524C7',paddingVertical:4,paddingHorizontal:6,borderBottomWidth:1,borderColor:'#AD967177'},here:{position:'absolute',top:-19,fontSize:8,letterSpacing:2,color:'#FFE6AA',backgroundColor:'#2B2332E5',paddingHorizontal:6,paddingVertical:2},fade:{position:'absolute',bottom:0,left:0,right:0,height:30},detail:{paddingHorizontal:22,paddingTop:12,flexDirection:'row',gap:14,alignItems:'center',borderTopWidth:1,borderColor:'#AD967144'},thumbnail:{width:52,height:58,borderWidth:1,borderColor:'#9B825A',borderRadius:3},place:{fontSize:16,letterSpacing:1,color:'#EEE0CA'},copy:{fontSize:11,lineHeight:18,color:'#B8A9C2'},actions:{flexDirection:'row',justifyContent:'space-between',gap:12,paddingHorizontal:22}});
