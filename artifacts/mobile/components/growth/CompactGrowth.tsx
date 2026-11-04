import React,{useState} from 'react';
import {StyleSheet,Text,View,Pressable} from 'react-native';
import {useRouter} from 'expo-router';
import {useApp} from '@/contexts/AppContext';
import {readVisitGrowth} from '@/utils/visitGrowth';
import {evolutionOffer} from '@/utils/evolutionChoice';
import {getMascotStage,getCharacter,type CharacterKey} from '@/utils/mascotUtils';
import {charsMetThroughStage} from '@/utils/encounters';
import {StaticMascot} from '@/components/Mascot';
import {BottomSheet} from '@/components/ui/BottomSheet';
import {Icon,type IconName} from '@/components/ui/Icon';
import {MemoryBook} from '@/components/world/MemoryBook';
import {BadgeCard} from '@/components/BadgeCard';
import {InsightCard} from '@/components/InsightCard';
import {BADGE_DEFINITIONS} from '@/data/badges';

const INK='#30233F',PURPLE='#75519A',MUTED='#73677E';
export function CompactGrowth({onCharacter}:{onCharacter:(key:CharacterKey)=>void}){
 const {records,progress,mascotName,feedState,encounters,growth,unlockedBadges}=useApp();
 const router=useRouter();
 const [sheet,setSheet]=useState<'memory'|'badges'|'review'|null>(null);
 const visits=readVisitGrowth(progress.visits),offer=evolutionOffer(progress),next=offer.next,days=visits?.totalVisits??0;
 const stage=getMascotStage(progress),character=getCharacter(stage),name=mascotName||'よっきー';
 const met=new Set(charsMetThroughStage(stage)),dex=encounters.list.filter(e=>met.has(e.charKey));
 const badges=BADGE_DEFINITIONS.filter(b=>!b.retired||unlockedBadges.some(u=>u.id===b.id));
 const tile=(label:string,detail:string,icon:IconName,onPress:()=>void,testID?:string)=><Pressable testID={testID} accessibilityRole="button" onPress={onPress} style={({pressed})=>[s.tile,pressed&&{opacity:.7}]}><Icon name={icon} size={19} color={PURPLE}/><View style={{flex:1,gap:3}}><Text style={s.tileTitle}>{label}</Text><Text style={s.small}>{detail}</Text></View><Icon name="chevron-right" size={14} color={MUTED}/></Pressable>;
 return <View style={s.root} testID="compact-growth">
  <View testID="growth-memories-panel" style={s.panel}>
   <View style={s.companion}><StaticMascot stage={stage} mood="happy" size={80}/><View style={{flex:1,gap:7}}><Text style={s.heading}>{name}と過ごした日</Text><Text testID="album-shared-days" style={s.days}>{days}<Text style={s.dayUnit}> 日</Text></Text><Text style={s.small}>{next?offer.declined?'今の姿を選んでいます':offer.free?'次の姿を選べます':`${next.name}を選べるまで、あと${Math.max(0,next.days-days)}日`:`いまの姿：${character.name}`}</Text></View></View>
   {tile('この子の進化','好きな姿を、自分で選ぶ','star',()=>router.push('/evolution'),'growth-evolution')}
   {tile('ふたりの思い出','一緒に過ごした日をひらく','image',()=>router.push('/memories'),'growth-memories')}
   <View style={s.grid}>{tile('交換日記','日記を読み返す','book-open',()=>router.push('/exchange-diary'))}{tile('アルバム',`${dex.length}人のなかま`,'image',()=>setSheet('memory'))}{tile('贈りもの','この子から届いたもの','gift',()=>router.push('/gifts'))}{tile('バッジ',`${unlockedBadges.length}個獲得`,'award',()=>setSheet('badges'))}</View>
   {feedState.villageStories&&tile('思い出のお話','これまでのお話を読む','book',()=>router.push('/stories'))}
   {tile('ふりかえり','記録から気づいたこと','sun',()=>setSheet('review'))}
  </View>
  {sheet&&<BottomSheet visible title={{memory:'アルバム',badges:'バッジ',review:'ふりかえり'}[sheet]} onClose={()=>setSheet(null)}>
   {sheet==='memory'&&<MemoryBook current={character.key} name={name} visitDays={days} hasGrown={growth.growthSize-(growth.history[0]?.growthSize??1)>.0005} records={records} diaryPages={feedState.exchangeDiary?.pages} encounters={dex} onCharacter={key=>{setSheet(null);onCharacter(key);}} onRecords={()=>{setSheet(null);router.push('/monthly-report');}}/>}
   {sheet==='badges'&&<View style={s.grid}>{badges.map(b=><BadgeCard key={b.id} badge={b} unlocked={unlockedBadges.find(u=>u.id===b.id)}/>)}</View>}
   {sheet==='review'&&<InsightCard/>}
  </BottomSheet>}
 </View>;
}
const s=StyleSheet.create({root:{gap:12},tabs:{flexDirection:'row',padding:4,backgroundColor:'#EAE4EE',borderRadius:14},tab:{flex:1,minHeight:44,alignItems:'center',justifyContent:'center',borderRadius:10},tabSelected:{backgroundColor:'#FFF'},tabText:{fontSize:14,color:MUTED,fontWeight:'600'},tabSelectedText:{color:INK},panel:{gap:10},summary:{padding:14,borderRadius:20,backgroundColor:'#38244E',gap:10},summaryHead:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},summaryTitle:{fontSize:13,color:'#F1E5FA',fontWeight:'700'},summaryRange:{fontSize:10,color:'#C9B3DB'},metrics:{flexDirection:'row'},metric:{flex:1,gap:6},metricBorder:{borderLeftWidth:1,borderLeftColor:'#705887',paddingLeft:12},metricLabel:{fontSize:10,color:'#E3D3EC'},metricValue:{fontSize:26,color:'#FFF7FF',fontWeight:'600',fontVariant:['tabular-nums']},metricUnit:{fontSize:10,fontWeight:'500',color:'#CEB8E1'},metricNote:{fontSize:9,color:'#C9B3DB'},chartTabs:{flexDirection:'row',gap:8,borderBottomWidth:1,borderBottomColor:'#EAE3EF'},chartTab:{flex:1,minHeight:40,alignItems:'center',justifyContent:'center',borderBottomWidth:2,borderBottomColor:'transparent'},chartTabActive:{borderBottomColor:PURPLE},chartTabText:{fontSize:12,color:MUTED},chartCard:{backgroundColor:'#FFF',borderWidth:1,borderColor:'#E5DDEB',borderRadius:18,padding:12,gap:5},row:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:6,flexWrap:'wrap'},heading:{fontSize:14,fontWeight:'700',color:INK},small:{fontSize:10,lineHeight:16,color:MUTED},delta:{fontSize:10,lineHeight:16,color:PURPLE,fontWeight:'600'},action:{backgroundColor:'#EDE6F4',borderRadius:13,padding:13,minHeight:67,flexDirection:'row',alignItems:'center',gap:12},actionTitle:{fontSize:13,fontWeight:'600',color:INK},grid:{flexDirection:'row',flexWrap:'wrap',gap:10},tile:{flexGrow:1,flexBasis:'45%',minHeight:64,padding:10,borderRadius:15,backgroundColor:'#FFF',borderWidth:1,borderColor:'#E4DCE9',flexDirection:'row',alignItems:'center',gap:9},tileTitle:{fontSize:12,fontWeight:'600',color:INK},companion:{flexDirection:'row',alignItems:'center',padding:18,gap:18,borderRadius:20,backgroundColor:'#E8DFEF'},days:{fontSize:36,fontWeight:'600',color:INK,fontVariant:['tabular-nums']},dayUnit:{fontSize:13,color:MUTED}});
