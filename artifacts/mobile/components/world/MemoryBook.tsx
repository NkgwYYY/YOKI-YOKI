import React from 'react';
import {Image, Pressable, StyleSheet, Text, View} from 'react-native';
import {StaticMascot} from '@/components/Mascot';
import {Icon} from '@/components/ui/Icon';
import {DEX_IMAGES} from '@/components/dex/dexAssets';
import {DEX_PROFILES} from '@/data/characterDex';
import {stageForChar} from '@/utils/encounters';
import type {CharacterKey} from '@/utils/mascotUtils';
import type {DailyRecord} from '@/contexts/AppContext';
import {memoryDate,recentWorldMemories} from '@/utils/worldMemories';

type Props={
  current:CharacterKey; name:string; totalDays:number; hasGrown:boolean;
  encounters:{charKey:CharacterKey;metDate:string}[]; records:DailyRecord[];
  onCharacter:(key:CharacterKey)=>void; onRecords:()=>void;
};
export function MemoryBook({current,name,totalDays,hasGrown,encounters,records,onCharacter,onRecords}:Props) {
  const memories=recentWorldMemories(records);
  const first=encounters.map(e=>e.metDate).filter(Boolean).sort()[0];
  return <View testID="memory-book" style={s.book}>
    <View pointerEvents="none" style={s.binding}/>
    <View style={s.page}>
      <Text style={s.chapter}>ここから、ふたりの物語。</Text>
      <View style={s.photo}>
        <View style={s.scene}>
          <Image source={require('@/assets/images/world/home-day.jpg')} resizeMode="cover" style={s.art} accessible={false}/>
          <View style={s.photoShade}/>
          <View style={s.portrait}><StaticMascot stage={stageForChar(current)} mood="happy" size={136}/></View>
        </View>
        <Text style={s.photoNote}>{name}と、ここで。</Text>
      </View>
      <View style={s.caption}>
        <Text style={s.days}>{totalDays>0?`一緒に残した、${totalDays}日の記録。`:'ここから、ふたりの記録を。'}</Text>
        {first?<Text style={s.quiet}>{memoryDate(first)}に出会ってから、少しずつ。</Text>:null}
        <Text style={s.quiet}>{hasGrown?'この子も、少し大きくなったみたい。':'どんな日も、ここに残していこう。'}</Text>
      </View>
      <View style={s.sectionHead}><Icon name="book-open" size={16} color="#70816A"/><Text style={s.sectionTitle}>出会ったなかま</Text></View>
      {encounters.length===0?<Text style={s.empty}>出会いのページは、これから。</Text>:<View style={s.friends}>
        {encounters.map(e=><Pressable key={e.charKey} testID={`album-character-${e.charKey}`} accessibilityRole="button" accessibilityLabel={`${DEX_PROFILES[e.charKey].name}の思い出を開く`} onPress={()=>onCharacter(e.charKey)} style={({pressed})=>[s.friend,{opacity:pressed?.7:1}]}>
          <View style={s.stamp}><Image source={DEX_IMAGES[e.charKey]} resizeMode="contain" style={s.friendArt}/></View>
          <View style={s.friendCopy}><Text style={s.friendName}>{DEX_PROFILES[e.charKey].name}</Text><Text style={s.friendDate}>{memoryDate(e.metDate)}の出会い</Text>{e.charKey===current?<Text style={s.current}>いま、一緒に暮らすなかま</Text>:null}</View>
          <Icon name="chevron-right" size={17} color="#94A087"/>
        </Pressable>)}
      </View>}
      <View style={s.sectionHead}><Icon name="feather" size={16} color="#70816A"/><Text style={s.sectionTitle}>最近のひとこま</Text></View>
      {memories.length===0?<Text style={s.empty}>今日の気持ちを残すと、ここに小さな思い出が増えていくよ。</Text>:memories.map(memory=><View key={memory.date} testID="memory-entry" style={s.memory}>
        <Text style={s.memoryDate}>{memoryDate(memory.date)}</Text><Text style={s.memoryText} numberOfLines={3}>{memory.caption}</Text>
      </View>)}
      <Pressable testID="memory-records" accessibilityRole="button" onPress={onRecords} style={s.recordLink}><Text style={s.recordLinkText}>記録をふりかえる</Text><Icon name="arrow-right" size={16} color="#65755C"/></Pressable>
    </View>
  </View>;
}
const s=StyleSheet.create({
  book:{backgroundColor:'#FCF8EA',borderRadius:5,borderWidth:1,borderColor:'#D4CDB6',shadowColor:'#423F2E',shadowOpacity:.09,shadowRadius:9,shadowOffset:{width:2,height:5},overflow:'hidden'},
  binding:{position:'absolute',left:10,top:0,bottom:0,width:7,backgroundColor:'#E7DFC8',borderLeftWidth:1,borderLeftColor:'#CEC3A6',borderRightWidth:1,borderRightColor:'#FDFBF2'},
  page:{paddingLeft:30,paddingRight:18,paddingTop:24,paddingBottom:14},chapter:{fontSize:11,letterSpacing:1.5,color:'#8B806A',marginBottom:20},
  photo:{padding:7,backgroundColor:'#FFFFF7',transform:[{rotate:'-1deg'}],borderWidth:1,borderColor:'#DDD6C1'},scene:{height:190,overflow:'hidden',backgroundColor:'#7E926F'},
  art:{position:'absolute',width:'100%',height:'100%',left:0,top:0},photoShade:{position:'absolute',left:0,right:0,bottom:0,height:60,backgroundColor:'#334F3225'},
  portrait:{position:'absolute',bottom:8,alignSelf:'center'},photoNote:{fontSize:14,color:'#5B6150',textAlign:'center',paddingTop:10,paddingBottom:5},
  caption:{gap:6,paddingVertical:22},days:{fontSize:15,lineHeight:23,color:'#3F503F',fontWeight:'600'},quiet:{fontSize:11,lineHeight:18,color:'#7B7D67'},
  sectionHead:{flexDirection:'row',alignItems:'center',gap:8,marginBottom:12,marginTop:5},sectionTitle:{fontSize:14,color:'#4D6047',fontWeight:'600'},
  friends:{marginBottom:23},friend:{flexDirection:'row',alignItems:'center',gap:13,paddingVertical:10,borderBottomWidth:1,borderBottomColor:'#E5DFCD',minHeight:94},
  stamp:{width:64,height:75,borderWidth:1,borderStyle:'dashed',borderColor:'#D1C7AA',backgroundColor:'#EEEBD9',alignItems:'center',justifyContent:'center'},friendArt:{width:56,height:64},
  friendCopy:{flex:1,gap:5},friendName:{fontSize:15,fontWeight:'600',color:'#4D5842'},friendDate:{fontSize:11,color:'#86806B'},current:{fontSize:10,color:'#7F8B65',lineHeight:16},
  empty:{fontSize:12,lineHeight:21,color:'#83826D',marginBottom:21},memory:{paddingVertical:13,borderBottomWidth:1,borderBottomColor:'#E6DFC9',gap:6},memoryDate:{fontSize:10,color:'#93886D',letterSpacing:1},memoryText:{fontSize:13,color:'#515C45',lineHeight:22},
  recordLink:{minHeight:48,flexDirection:'row',alignItems:'center',justifyContent:'flex-end',gap:10,marginTop:8},recordLinkText:{fontSize:12,color:'#65755C'},
});
