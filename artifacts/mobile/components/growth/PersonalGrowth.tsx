import React,{useMemo,useState} from 'react';
import {StyleSheet,Text,View} from 'react-native';
import {FeltPressable as Pressable} from '@/components/ui/FeltPressable';
import Svg,{Path,Circle,Line,Ellipse} from 'react-native-svg';
import {useApp} from '@/contexts/AppContext';
import {getTodayDate} from '@/utils/dateUtils';
import {personalGrowth,MOOD_LABELS} from '@/utils/personalGrowth';
import {colors} from '@/constants/theme';
import {Card} from '@/components/ui/Card';
import {Icon} from '@/components/ui/Icon';
import {Button} from '@/components/ui/Button';

/** The first viewport shows real cumulative days and the last seven moods. */
export function GrowthGlimpse({data}:{data:ReturnType<typeof personalGrowth>}){
 return <View testID="growth-glimpse" style={{flexDirection:'row',gap:12,alignItems:'center',paddingTop:8}}>
  <View style={{width:84,alignItems:'center'}}>
   <Svg width="76" height="69" viewBox="0 0 100 90" accessible={false}>
    <Ellipse cx="50" cy="83" rx="33" ry="5" fill="#D6DFBD"/>
    <Path d="M50 81V32M50 62L28 44M50 51L74 30" stroke="#AE8B66" strokeWidth="7" strokeLinecap="round" fill="none"/>
    {data.leaves.slice(-24).map((r,i)=>{const a=i*2.4,x=50+Math.cos(a)*(16+i%3*7),y=36+Math.sin(a)*(12+i%4*5);return <Ellipse key={r.date} cx={x} cy={y} rx="7" ry="5" rotation="-25" origin={`${x},${y}`} fill={['#91AC76','#B4C58D','#78996E'][i%3]} stroke="#E5ECD1" strokeWidth="1"/>;})}
   </Svg><Text style={s.label}>{data.leaves.length} 枚の葉</Text>
  </View>
  <View style={{flex:1,gap:4}}><Text style={s.small}>最近7日の気分</Text>
   <View accessible accessibilityLabel={data.week.map(d=>`${d.date} ${d.record?MOOD_LABELS[d.record.mood]:'記録なし'}`).join('、')}>
    <Svg width="100%" height="52" viewBox="0 0 180 52" accessible={false}>
     {[8,26,44].map(y=><Line key={y} x1="6" x2="174" y1={y} y2={y} stroke="#C5D1B1" strokeDasharray="2 4"/>)}
     {data.week.map((d,i)=>{const x=9+i*27,y=44-((d.record?.mood??1)-1)*9,prev=data.week[i-1];return <React.Fragment key={d.date}>{d.record&&prev?.record&&<Line x1={x-27} x2={x} y1={44-(prev.record.mood-1)*9} y2={y} stroke="#77956A" strokeWidth="2"/>}{d.record?<Circle cx={x} cy={y} r="3.5" fill="#6C895B" stroke="#F8F9ED" strokeWidth="1.5"/>:<Path d={`M${x-2} 49h4`} stroke="#A6B696"/>}</React.Fragment>;})}
    </Svg>
   </View><Text style={s.small}>記録した日　{data.previousCount}日 → {data.currentCount}日</Text><Text style={{fontSize:10,color:colors.mutedForeground}}>前の7日間 → この7日間</Text>
  </View>
 </View>;
}

export function PersonalGrowth({compact=false,date=getTodayDate()}:{compact?:boolean;date?:string}){
 const {records}=useApp(),data=useMemo(()=>personalGrowth(records,date),[records,date]);
 const [page,setPage]=useState(0),[selected,setSelected]=useState<string|null>(null);
 const pages=Math.max(1,Math.ceil(data.leaves.length/24)),safePage=Math.min(page,pages-1);
 const leaves=data.leaves.slice(Math.max(0,data.leaves.length-(safePage+1)*24),data.leaves.length-safePage*24);
 const leaf=data.leaves.find(r=>r.date===selected);
 return <Card style={{gap:16}} padding={18}>
  <View style={s.heading}><View><Text style={s.eyebrow}>わたしの歩み</Text><Text style={s.title}>きもちの木</Text></View><Text testID="growth-leaf-count" style={s.count}>{data.leaves.length}<Text style={s.small}> 枚の葉</Text></Text></View>
  <View style={{alignItems:'center'}}><View testID="personal-growth-tree" style={{width:compact?230:280,aspectRatio:280/224,maxWidth:'100%'}}>
   <Svg width="100%" height="100%" viewBox="0 0 280 224" accessible={false}>
    <Ellipse cx="140" cy="211" rx="82" ry="9" fill="#E6DFC8"/>
    <Path d="M136 207Q148 155 135 78M140 171Q104 150 83 115M140 145Q170 126 190 86M139 116Q120 89 110 58M143 173Q177 163 207 138" stroke="#AD8965" strokeWidth="12" strokeLinecap="round" fill="none"/>
    <Path d="M136 207Q148 155 135 78M140 171Q104 150 83 115M140 145Q170 126 190 86" stroke="#EAD7B7" strokeWidth="2" strokeDasharray="3 5" fill="none"/>
    {leaves.map((r,i)=>{const a=i*2.4,x=140+Math.cos(a)*(44+(i%3)*18),y=104+Math.sin(a)*(37+(i%4)*11);return <Path key={r.date} d={`M${x-12} ${y+5}Q${x-17} ${y-20} ${x+14} ${y-15}Q${x+20} ${y+10} ${x-12} ${y+5}Z`} fill={['#92AC78','#B8C58E','#779B73'][i%3]} stroke="#DCE4BC" strokeWidth="2"/>;})}
    {!leaves.length&&<Path d="M137 100Q113 100 116 83Q137 79 137 100M141 91Q145 69 162 77Q162 94 141 91" fill="#A7BD8B"/>}
   </Svg>
   {/* Real buttons overlay the leaves: keyboard/screen readers can inspect every day. */}
   {leaves.map((r,i)=>{const a=i*2.4,x=140+Math.cos(a)*(44+(i%3)*18),y=104+Math.sin(a)*(37+(i%4)*11),scale=compact?184/224:1;return <Pressable key={r.date} testID={`growth-leaf-${r.date}`} accessibilityRole="button" accessibilityLabel={`${r.date}の記録、${MOOD_LABELS[r.mood]}`} onPress={()=>setSelected(r.date)} style={{position:'absolute',left:`${x/280*100}%`,top:`${(y-5)/224*100}%`,transform:[{translateX:-22},{translateY:-22}],width:44,height:44,borderRadius:18,borderWidth:selected===r.date?2:0,borderColor:colors.primary}}/>;})}
  </View></View>
  <Text style={s.helper}>{data.leaves.length?'葉っぱをタップすると、その日の記録が開きます。':'最初の記録が、小さな葉っぱになります。'}{!compact?'\n葉は記録した日ごとに1枚。気分やお休みした日で減りません。':''}</Text>
  {leaf&&<View testID="growth-leaf-detail" style={s.detail}><Text style={s.label}>{leaf.date} · {MOOD_LABELS[leaf.mood]}</Text>{!!leaf.win&&<Text style={s.copy}>{leaf.win}</Text>}{!!leaf.notes&&<Text style={s.copy}>{leaf.notes}</Text>}{leaf.behaviors?.length>0&&<Text style={s.copy}>{leaf.behaviors.join('・')}</Text>}<Text style={s.helper}>この日の気持ちを残しました。</Text></View>}
  {!compact&&pages>1&&<View style={s.heading}><Button size="sm" variant="outline" label="前の葉を見る" disabled={safePage>=pages-1} onPress={()=>{setPage(safePage+1);setSelected(null);}}/><Button size="sm" variant="outline" label="新しい葉を見る" disabled={safePage===0} onPress={()=>{setPage(safePage-1);setSelected(null);}}/></View>}
  <View style={s.weeks}><View style={s.week}><Text style={s.helper}>前の7日間</Text><Text style={s.label}>{data.previousCount} 日</Text></View><Icon name="arrow-right" size={18} color={colors.subtleForeground}/><View style={s.week}><Text style={s.helper}>この7日間</Text><Text style={s.label}>{data.currentCount} 日</Text></View></View>
  <Text style={s.helper}>気持ちを残した日数の比較です。気分の良し悪しの評価ではありません。</Text>
  <MoodWeek data={data}/>
 </Card>;
}
function MoodWeek({data}:{data:ReturnType<typeof personalGrowth>}){
 return <View testID="mood-week" style={{gap:8}}><Text style={s.label}>最近の気分</Text>
  <View accessible accessibilityLabel={data.week.map(d=>`${d.date} ${d.record?MOOD_LABELS[d.record.mood]:'記録なし'}`).join('、')}>
   <Svg width="100%" height="95" viewBox="0 0 280 95" accessible={false}>
    {[1,3,5].map(v=><Line key={v} x1="15" x2="265" y1={82-(v-1)*16} y2={82-(v-1)*16} stroke="#D9CDB8" strokeDasharray="2 5"/>)}
    {data.week.map((d,i)=>{const x=20+i*40,y=82-((d.record?.mood??1)-1)*16,prev=data.week[i-1];return <React.Fragment key={d.date}>{d.record&&prev?.record&&<Line x1={x-40} x2={x} y1={82-(prev.record.mood-1)*16} y2={y} stroke="#93AA80" strokeWidth="3"/>}{d.record?<Circle cx={x} cy={y} r="5" fill="#6C895B" stroke="#FFF9EC" strokeWidth="2"/>:<Path d={`M${x-3} 89h6`} stroke="#B7A68B" strokeWidth="2"/>}</React.Fragment>;})}
   </Svg>
   <View style={{flexDirection:'row',justifyContent:'space-between'}}>{data.week.map(d=><Text key={d.date} style={s.small}>{Number(d.date.slice(-2))}日</Text>)}</View>
  </View><Text style={s.helper}>上ほど「うれしい」、下ほど「つらい」。記録のない日は線をつなぎません。</Text>
 </View>;
}
const s=StyleSheet.create({heading:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},eyebrow:{fontSize:11,color:colors.mutedForeground,letterSpacing:1},title:{fontSize:22,fontWeight:'700',color:colors.foreground,marginTop:4},count:{fontSize:29,color:colors.primary,fontWeight:'600'},small:{fontSize:11,color:colors.mutedForeground},helper:{fontSize:11,color:colors.mutedForeground,lineHeight:18},copy:{fontSize:13,color:colors.foreground,lineHeight:22},label:{fontSize:14,color:colors.foreground,fontWeight:'600'},detail:{backgroundColor:'#EAF0E0',borderRadius:16,padding:14,gap:6},weeks:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:24},week:{alignItems:'center',gap:4}});
