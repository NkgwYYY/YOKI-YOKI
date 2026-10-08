import React, {useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import Svg, {Path} from 'react-native-svg';
import {Icon, type IconName} from '@/components/ui/Icon';
import {canVisitMap, WORLD_MAPS, type WorldMapId} from '@/utils/worldMaps';
import {MAP_COORDS, VILLAGE_LINKS} from '@/utils/villageLife';

const symbols:Record<WorldMapId,IconName>={home:'home',market:'shopping-bag',forest:'feather',onsen:'sun',village:'users',lake:'droplet',ramen:'coffee',bowling:'circle',tobacco:'wind'};
const names:Record<WorldMapId,string>={home:'おうち',market:'こもれび市場',forest:'木もれびの森',onsen:'森の温泉',village:'となりの村',lake:'星あかりの湖',ramen:'ラーメン屋',bowling:'ボウリング',tobacco:'タバコ屋'};
export function VillageMap({current,level,disabled,onSelect}:{current:WorldMapId;level:number;disabled:boolean;onSelect:(id:WorldMapId)=>void}) {
  const [width,setWidth]=useState(300);
  return <View>
    <Text style={s.intro}>道しるべまで歩くと、となりの場所へ。地図の場所を押しても移動できます。</Text>
    <View testID="village-map" onLayout={e=>setWidth(e.nativeEvent.layout.width)} style={s.paper}>
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill} viewBox={`0 0 ${width} 360`} accessible={false}>
        <Path d={`M ${width*.72} 0 Q ${width*.56} 85 ${width*.71} 165 T ${width*.76} 360`} fill="none" stroke="#CCE3E3" strokeWidth={20}/>
        {WORLD_MAPS.flatMap(place=>VILLAGE_LINKS[place.id].filter(to=>place.id<to).map(to=>{
          const a=MAP_COORDS[place.id],b=MAP_COORDS[to];
          return <Path key={`${place.id}-${to}`} d={`M ${a.x*width} ${a.y*360} L ${b.x*width} ${b.y*360}`} stroke="#C7AF86" strokeWidth={5} strokeLinecap="round" strokeDasharray="2 8"/>;
        }))}
      </Svg>
      {WORLD_MAPS.map(place=>{const p=MAP_COORDS[place.id],here=current===place.id,open=canVisitMap(place.id,level);return <Pressable
        key={place.id} testID={`world-map-${place.id}`} accessibilityRole="button" accessibilityLabel={`${place.name}${here?'、いまここ':open?'へ移動':`、レベル${place.level}でひらく`}`}
        accessibilityState={{selected:here,disabled:!open||disabled}} disabled={!open||disabled} onPress={()=>onSelect(place.id)}
        style={[s.place,{left:width*p.x-width*.15,top:360*p.y-27,width:width*.30},here&&s.here,!open&&s.locked]}>
        <Icon name={open?symbols[place.id]:'lock'} size={18} color={here?'#FFF8EB':'#806195'}/>
        <Text numberOfLines={1} style={[s.name,here&&{color:'#FFF8EB'}]}>{names[place.id]}</Text>
        <Text style={[s.detail,here&&{color:'#F4E7FA'}]}>{here?'いまここ':open?'':`Lv.${place.level}`}</Text>
      </Pressable>;})}
    </View>
    <Text style={s.legend}>点線は、歩いて行き来できる道です。</Text>
  </View>;
}
const s=StyleSheet.create({
  intro:{fontSize:12,lineHeight:20,color:'#806C86',marginBottom:12},
  paper:{height:360,backgroundColor:'#F2EEDC',borderRadius:22,overflow:'hidden',borderWidth:1,borderColor:'#E3D8C1'},
  place:{position:'absolute',minHeight:54,paddingVertical:5,alignItems:'center',gap:3,borderRadius:15,backgroundColor:'#FFFCF2',borderWidth:1,borderColor:'#DCCCAE'},
  here:{backgroundColor:'#816392',borderColor:'#6F4E83'},locked:{backgroundColor:'#E7E4D7',opacity:.72},
  name:{fontSize:10,fontWeight:'600',color:'#695377'},detail:{fontSize:9,lineHeight:10,color:'#8C7A8B'},
  legend:{fontSize:11,lineHeight:18,color:'#8C7A8B',marginTop:10},
});
