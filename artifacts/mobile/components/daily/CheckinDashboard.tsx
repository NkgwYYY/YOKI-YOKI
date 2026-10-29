import React,{useState} from 'react';
import {StyleSheet,Text,View,Pressable} from 'react-native';
import Svg,{Line,Circle,Text as Ink} from 'react-native-svg';
import {dailyCheckin} from '@/utils/dailyCheckin';
import {MOOD_LABELS} from '@/utils/personalGrowth';
import {RecordRadar} from '@/components/growth/RecordRadar';
const INK='#233E39',TEAL='#176F63',MUTED='#52665F';
export function CheckinDashboard({data}:{data:ReturnType<typeof dailyCheckin>}){
 const [chart,setChart]=useState<'radar'|'trend'>('radar');
 return <View style={s.card} testID="checkin-dashboard">
  <Text style={s.heading}>あなたの記録</Text>
  <View style={s.metrics}>
   <View style={s.metric}><Text style={s.label}>今日の気分</Text><Text testID="checkin-current-mood" style={s.value}>{data.moodLabel}</Text><Text style={s.unit}>{data.current?`${data.current.mood} / 5`:'顔を押して記録'}</Text></View>
   <View style={[s.metric,s.divider]}><Text style={s.label}>睡眠の平均</Text><Text style={s.value}>{data.sleepAverage===null?'—':data.sleepAverage.toFixed(1)}<Text style={s.unit}>{data.sleepAverage===null?'':' 時間'}</Text></Text><Text style={s.unit}>7日間のうち{data.sleepCount}日分</Text></View>
  </View>
  <View style={{padding:12,borderRadius:12,backgroundColor:'#EAF4EF',gap:4}}><Text style={s.label}>今日できること</Text><Text style={{fontSize:14,fontWeight:'700',color:INK}}>{data.action.title}</Text></View>
  <View style={{flexDirection:'row',gap:8,borderBottomWidth:1,borderBottomColor:'#D8E1DB'}}>{([{key:'radar',label:'生活のバランス'},{key:'trend',label:'気分の推移'}] as const).map(tab=><Pressable key={tab.key} testID={`checkin-chart-${tab.key}`} accessibilityRole="tab" accessibilityState={{selected:chart===tab.key}} onPress={()=>setChart(tab.key)} style={{flex:1,minHeight:40,alignItems:'center',justifyContent:'center',borderBottomWidth:2,borderBottomColor:chart===tab.key?'#75519A':'transparent'}}><Text style={{fontSize:13,fontWeight:chart===tab.key?'700':'500',color:chart===tab.key?'#75519A':MUTED}}>{tab.label}</Text></Pressable>)}</View>
  {chart==='radar'?<RecordRadar records={data.leaves} date={data.week[6].date}/>:<>
  <View style={s.chartHeader}><Text style={s.heading}>気分の推移</Text><Text style={s.label}>最近7日間 · 5段階</Text></View>
  <View accessible accessibilityLabel={data.week.map(d=>`${d.date} ${d.record?MOOD_LABELS[d.record.mood]:'未記録'}`).join('、')}>
   <Svg testID="checkin-chart" width="100%" height="156" viewBox="0 0 320 156" accessible={false}>
    {[1,2,3,4,5].map(v=><React.Fragment key={v}><Line x1="64" x2="307" y1={128-(v-1)*27} y2={128-(v-1)*27} stroke={v===3?'#AFC2BB':'#DEE6E2'} strokeWidth={v===3?1.5:1}/>{[1,3,5].includes(v)&&<Ink x="2" y={132-(v-1)*27} fontSize="11" fill={MUTED}>{v===5?'5 うれしい':v===3?'3 ふつう':'1 つらい'}</Ink>}</React.Fragment>)}
    {data.week.map((d,i)=>{const x=72+i*37,y=128-((d.record?.mood??1)-1)*27,prev=data.week[i-1];return <React.Fragment key={d.date}>{d.record&&prev?.record&&<Line x1={x-37} x2={x} y1={128-(prev.record.mood-1)*27} y2={y} stroke={TEAL} strokeWidth="3.5"/>}{d.record?<Circle cx={x} cy={y} r={i===6?6.5:4.5} fill={TEAL} stroke="#FFFFFF" strokeWidth="2"/>:<Ink x={x} y="132" textAnchor="middle" fontSize="14" fill="#899A93">—</Ink>}<Ink x={x} y="152" textAnchor="middle" fontSize="11" fill={INK}>{Number(d.date.slice(-2))}日</Ink></React.Fragment>;})}
   </Svg>
  </View>
  <Text style={s.label}>{data.delta===null?'前の7日間との比較は、双方に2日以上の記録があると表示します。':`前の7日間と比べた平均：${data.delta>0?'+':''}${data.delta.toFixed(1)} / 5`}</Text>
  </>}
  <View style={s.progressRow}><Text style={s.label}>気分を記録した日</Text><Text style={s.total}>{data.currentCount}<Text style={s.unit}> / 7日</Text></Text></View>
  <View style={s.track}><View style={[s.fill,{width:`${data.currentCount/7*100}%`}]}/></View>
  <Text style={s.note}>気分は自己評価です。記録のない日は空欄で表示。</Text>
 </View>;
}
export const checkinStyles=StyleSheet.create({card:{padding:18,borderRadius:22,backgroundColor:'#FFFFFF',borderWidth:1,borderColor:'#CAD8D0',gap:12},heading:{fontSize:16,fontWeight:'700',color:INK},copy:{fontSize:13,lineHeight:21,color:INK},helper:{fontSize:11,lineHeight:17,color:MUTED}});
const s=StyleSheet.create({...checkinStyles,metrics:{flexDirection:'row',gap:16,paddingVertical:5},metric:{flex:1,gap:6},divider:{paddingLeft:16,borderLeftWidth:1,borderLeftColor:'#D8E1DB'},label:{fontSize:11,lineHeight:17,color:MUTED},value:{fontSize:25,fontWeight:'700',color:INK},unit:{fontSize:11,fontWeight:'500',color:MUTED},chartHeader:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginTop:4},detail:{fontSize:13,fontWeight:'700',color:TEAL},progressRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},total:{fontSize:23,fontWeight:'700',color:TEAL},track:{height:7,backgroundColor:'#E5ECE8',borderRadius:4,overflow:'hidden'},fill:{height:7,backgroundColor:TEAL},note:{fontSize:10,lineHeight:16,color:MUTED}});
