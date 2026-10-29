import React,{useState} from 'react';
import {StyleSheet,Text,View,Pressable} from 'react-native';
import Svg,{Line,Circle,Text as Ink} from 'react-native-svg';
import {useRouter} from 'expo-router';
import {useApp} from '@/contexts/AppContext';
import {dailyCheckin} from '@/utils/dailyCheckin';
import {getTodayDate} from '@/utils/dateUtils';
import {MOOD_LABELS} from '@/utils/personalGrowth';
import {readVisitGrowth,nextVisitStage} from '@/utils/visitGrowth';
import {getMascotStage,getCharacter,type CharacterKey} from '@/utils/mascotUtils';
import {charsMetThroughStage} from '@/utils/encounters';
import {StaticMascot} from '@/components/Mascot';
import {BottomSheet} from '@/components/ui/BottomSheet';
import {Icon,type IconName} from '@/components/ui/Icon';
import {QuickAffirmationRecord} from '@/components/record/QuickAffirmationRecord';
import {RecordRadar} from './RecordRadar';
import {PersonalGrowth} from './PersonalGrowth';
import {MemoryBook} from '@/components/world/MemoryBook';
import {BadgeCard} from '@/components/BadgeCard';
import {InsightCard} from '@/components/InsightCard';
import {BADGE_DEFINITIONS} from '@/data/badges';

const INK='#30233F',PURPLE='#75519A',MUTED='#73677E';
export function CompactGrowth({onCharacter}:{onCharacter:(key:CharacterKey)=>void}){
 const {records,progress,mascotName,feedState,encounters,growth,unlockedBadges}=useApp();
 const router=useRouter(),data=dailyCheckin(records,getTodayDate());
 const [chart,setChart]=useState<'radar'|'trend'>('radar');
 const [section,setSection]=useState<'records'|'memories'>('records');
 const [sheet,setSheet]=useState<'tree'|'memory'|'badges'|'review'|'mood'|null>(null);
 const visits=readVisitGrowth(progress.visits),next=nextVisitStage(visits),days=visits?.totalVisits??0;
 const stage=getMascotStage(progress),character=getCharacter(stage),name=mascotName||'よっきー';
 const met=new Set(charsMetThroughStage(stage)),dex=encounters.list.filter(e=>met.has(e.charKey));
 const badges=BADGE_DEFINITIONS.filter(b=>!b.retired||unlockedBadges.some(u=>u.id===b.id));
 const tile=(label:string,detail:string,icon:IconName,onPress:()=>void,testID?:string)=><Pressable testID={testID} accessibilityRole="button" onPress={onPress} style={({pressed})=>[s.tile,pressed&&{opacity:.7}]}><Icon name={icon} size={19} color={PURPLE}/><View style={{flex:1,gap:3}}><Text style={s.tileTitle}>{label}</Text><Text style={s.small}>{detail}</Text></View><Icon name="chevron-right" size={14} color={MUTED}/></Pressable>;
 return <View style={s.root} testID="compact-growth">
  <View style={s.tabs}>{([{id:'records',label:'記録'},{id:'memories',label:'思い出'}] as const).map(tab=><Pressable key={tab.id} testID={`growth-tab-${tab.id}`} accessibilityRole="tab" accessibilityState={{selected:section===tab.id}} onPress={()=>setSection(tab.id)} style={[s.tab,section===tab.id&&s.tabSelected]}><Text style={[s.tabText,section===tab.id&&s.tabSelectedText]}>{tab.label}</Text></Pressable>)}</View>
  {section==='records'?<View testID="growth-records-panel" style={s.panel}>
   <View style={s.summary}><View style={s.summaryHead}><Text style={s.summaryTitle}>最近7日間</Text><Text style={s.summaryRange}>{data.week[0].date.slice(5).replace('-','/')} — {getTodayDate().slice(5).replace('-','/')}</Text></View>
    <View style={s.metrics}>{[
     {label:'気分の平均',value:data.average?.toFixed(1)??'—',unit:'/ 5',note:'記録した日の平均',id:'weekly-heart'},
     {label:'睡眠の平均',value:data.sleepAverage?.toFixed(1)??'—',unit:'h',note:`${data.sleepCount}日分の記録`,id:'weekly-moon'},
     {label:'記録した日',value:String(data.currentCount),unit:'/ 7',note:'日数',id:'weekly-file-text'},
    ].map((metric,i)=><View key={metric.id} style={[s.metric,i>0&&s.metricBorder]}><Text style={s.metricLabel}>{metric.label}</Text><Text style={s.metricValue} testID={metric.id}>{metric.value}<Text style={s.metricUnit}> {metric.unit}</Text></Text><Text style={s.metricNote}>{metric.note}</Text></View>)}</View>
   </View>
   <View style={s.chartCard}>
    <View style={s.chartTabs}>{([{key:'radar',label:'生活のバランス'},{key:'trend',label:'気分の推移'}] as const).map(tab=><Pressable key={tab.key} testID={`growth-chart-${tab.key}`} accessibilityRole="tab" accessibilityState={{selected:chart===tab.key}} onPress={()=>setChart(tab.key)} style={[s.chartTab,chart===tab.key&&s.chartTabActive]}><Text style={[s.chartTabText,chart===tab.key&&{color:PURPLE,fontWeight:'700'}]}>{tab.label}</Text></Pressable>)}</View>
    {chart==='radar'?<RecordRadar records={records} date={getTodayDate()}/>:<>
    <View style={s.row}><Text style={s.heading}>気分の推移</Text><Text style={s.small}>5段階の自己評価</Text></View>
    <View accessible accessibilityLabel={data.week.map(d=>`${d.date} ${d.record?MOOD_LABELS[d.record.mood]:'未記録'}`).join('、')}>
     <Svg testID="growth-week-chart" width="100%" height={139} viewBox="0 0 320 139" accessible={false}>
      {[1,2,3,4,5].map(v=><React.Fragment key={v}><Line x1={53} x2={309} y1={110-(v-1)*23} y2={110-(v-1)*23} stroke={v===3?'#C7BCD3':'#ECE7EF'}/>{[1,3,5].includes(v)&&<Ink x={0} y={114-(v-1)*23} fill={MUTED} fontSize={10}>{v===5?'うれしい':v===3?'ふつう':'つらい'}</Ink>}</React.Fragment>)}
      {data.week.map((d,i)=>{const x=61+i*40,y=110-((d.record?.mood??1)-1)*23,prev=data.week[i-1];return <React.Fragment key={d.date}>{d.record&&prev?.record&&<Line x1={x-40} x2={x} y1={110-(prev.record.mood-1)*23} y2={y} stroke={PURPLE} strokeWidth={3}/>}{d.record?<Circle cx={x} cy={y} r={i===6?5.5:4} fill={PURPLE} stroke="#FFF" strokeWidth={2}/>:<Ink x={x} y={113} textAnchor="middle" fontSize={13} fill="#A79BAF">—</Ink>}<Ink x={x} y={134} textAnchor="middle" fontSize={10} fill={MUTED}>{Number(d.date.slice(-2))}日</Ink></React.Fragment>;})}
     </Svg>
    </View>
    <View style={s.row}><Text style={s.delta}>{data.delta===null?'比較には各週2日以上の記録が必要':`前の7日間との平均差 ${data.delta>0?'+':''}${data.delta.toFixed(1)}`}</Text><Text style={s.small}>未記録は空欄</Text></View>
    </>}
   </View>
   <Pressable accessibilityRole="button" onPress={()=>{if(data.action.kind==='mood')setSheet('mood');else router.push(data.action.kind==='rest'?'/(tabs)':'/exchange-diary');}} style={s.action}><View style={{flex:1,gap:4}}><Text style={s.small}>今日できること</Text><Text style={s.actionTitle}>{data.action.title}</Text></View><Icon name="arrow-right" size={18} color={PURPLE}/></Pressable>
   <View style={s.grid}>{tile('月間レポート','カレンダー・睡眠','calendar',()=>router.push('/monthly-report'))}{tile('きもちの木',`${data.leaves.length}日分の葉っぱ`,'feather',()=>setSheet('tree'),'growth-open-tree')}</View>
  </View>:<View testID="growth-memories-panel" style={s.panel}>
   <View style={s.companion}><StaticMascot stage={stage} mood="happy" size={80}/><View style={{flex:1,gap:7}}><Text style={s.heading}>{name}と過ごした日</Text><Text testID="album-shared-days" style={s.days}>{days}<Text style={s.dayUnit}> 日</Text></Text><Text style={s.small}>{next?`${next.name}まで、あと${Math.max(0,next.days-days)}日`:`いまの姿：${character.name}`}</Text></View></View>
   <View style={s.grid}>{tile('交換日記','日記を読み返す','book-open',()=>router.push('/exchange-diary'))}{tile('アルバム',`${dex.length}人のなかま`,'image',()=>setSheet('memory'))}{tile('贈りもの','この子から届いたもの','gift',()=>router.push('/gifts'))}{tile('バッジ',`${unlockedBadges.length}個獲得`,'award',()=>setSheet('badges'))}</View>
   {feedState.villageStories&&tile('思い出のお話','これまでのお話を読む','book',()=>router.push('/stories'))}
   {tile('ふりかえり','記録から気づいたこと','sun',()=>setSheet('review'))}
  </View>}
  {sheet&&<BottomSheet visible title={{tree:'きもちの木',memory:'アルバム',badges:'バッジ',review:'ふりかえり',mood:'今の気分'}[sheet]} onClose={()=>setSheet(null)}>
   {sheet==='mood'&&<QuickAffirmationRecord/>}
   {sheet==='tree'&&<PersonalGrowth/>}
   {sheet==='memory'&&<MemoryBook current={character.key} name={name} visitDays={days} hasGrown={growth.growthSize-(growth.history[0]?.growthSize??1)>.0005} records={records} diaryPages={feedState.exchangeDiary?.pages} encounters={dex} onCharacter={key=>{setSheet(null);onCharacter(key);}} onRecords={()=>{setSheet(null);router.push('/monthly-report');}}/>}
   {sheet==='badges'&&<View style={s.grid}>{badges.map(b=><BadgeCard key={b.id} badge={b} unlocked={unlockedBadges.find(u=>u.id===b.id)}/>)}</View>}
   {sheet==='review'&&<InsightCard/>}
  </BottomSheet>}
 </View>;
}
const s=StyleSheet.create({root:{gap:12},tabs:{flexDirection:'row',padding:4,backgroundColor:'#EAE4EE',borderRadius:14},tab:{flex:1,minHeight:44,alignItems:'center',justifyContent:'center',borderRadius:10},tabSelected:{backgroundColor:'#FFF'},tabText:{fontSize:14,color:MUTED,fontWeight:'600'},tabSelectedText:{color:INK},panel:{gap:10},summary:{padding:14,borderRadius:20,backgroundColor:'#38244E',gap:10},summaryHead:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},summaryTitle:{fontSize:13,color:'#F1E5FA',fontWeight:'700'},summaryRange:{fontSize:10,color:'#C9B3DB'},metrics:{flexDirection:'row'},metric:{flex:1,gap:6},metricBorder:{borderLeftWidth:1,borderLeftColor:'#705887',paddingLeft:12},metricLabel:{fontSize:10,color:'#E3D3EC'},metricValue:{fontSize:26,color:'#FFF7FF',fontWeight:'600',fontVariant:['tabular-nums']},metricUnit:{fontSize:10,fontWeight:'500',color:'#CEB8E1'},metricNote:{fontSize:9,color:'#C9B3DB'},chartTabs:{flexDirection:'row',gap:8,borderBottomWidth:1,borderBottomColor:'#EAE3EF'},chartTab:{flex:1,minHeight:40,alignItems:'center',justifyContent:'center',borderBottomWidth:2,borderBottomColor:'transparent'},chartTabActive:{borderBottomColor:PURPLE},chartTabText:{fontSize:12,color:MUTED},chartCard:{backgroundColor:'#FFF',borderWidth:1,borderColor:'#E5DDEB',borderRadius:18,padding:12,gap:5},row:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:6,flexWrap:'wrap'},heading:{fontSize:14,fontWeight:'700',color:INK},small:{fontSize:10,lineHeight:16,color:MUTED},delta:{fontSize:10,lineHeight:16,color:PURPLE,fontWeight:'600'},action:{backgroundColor:'#EDE6F4',borderRadius:13,padding:13,minHeight:67,flexDirection:'row',alignItems:'center',gap:12},actionTitle:{fontSize:13,fontWeight:'600',color:INK},grid:{flexDirection:'row',flexWrap:'wrap',gap:10},tile:{flexGrow:1,flexBasis:'45%',minHeight:64,padding:10,borderRadius:15,backgroundColor:'#FFF',borderWidth:1,borderColor:'#E4DCE9',flexDirection:'row',alignItems:'center',gap:9},tileTitle:{fontSize:12,fontWeight:'600',color:INK},companion:{flexDirection:'row',alignItems:'center',padding:18,gap:18,borderRadius:20,backgroundColor:'#E8DFEF'},days:{fontSize:36,fontWeight:'600',color:INK,fontVariant:['tabular-nums']},dayUnit:{fontSize:13,color:MUTED}});
