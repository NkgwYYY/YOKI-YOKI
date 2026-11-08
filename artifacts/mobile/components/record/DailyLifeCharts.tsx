import React,{useEffect,useRef,useState} from 'react';
import {Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import Svg,{Circle,Line,Path,Rect,Text as SvgText} from 'react-native-svg';
import {DAY_TYPES,CORE_BEHAVIORS,LIFE_METRICS,lifeValue,lifeLabel,activityValue,dayTypeValue,type LifeMetric,type LifeRecord} from '@/utils/lifeTrends';
import {PATTERNS} from '@/utils/moyamoyaContent';
type Day={date:string;record?:LifeRecord};
type Props={days:Day[];selected:string;onSelect:(date:string)=>void};
const short=(date:string)=>Number(date.slice(5,7))+'/'+Number(date.slice(8));
export function DailyLifeCharts(props:Props){
 const {days,selected}=props,chosen=days.find(d=>d.date===selected)?.record;
 const activities=[...new Set<string>([...CORE_BEHAVIORS,...days.flatMap(d=>d.record?.behaviors??[])])];
 return <View testID="daily-life-charts" style={s.stack}>
  <Text style={s.heading}>暮らしとモヤモヤの変化</Text>
  <Text style={s.note}>同じ日付を選ぶと、気分と暮らしの回答を一緒に確認できます。その日の最新の回答を表示します。</Text>
  {(Object.keys(LIFE_METRICS) as LifeMetric[]).map(metric=><MetricChart key={metric} {...props} metric={metric}/>)}
  <CategoryGrid {...props} title="今日はどんな日？" id="day-type" rows={DAY_TYPES.map(d=>({id:d.id,label:d.label,value:(r:LifeRecord|undefined)=>dayTypeValue(r,d.id)}))}/>
  <CategoryGrid {...props} title="過ごし方" id="activities" rows={activities.map(label=>({id:label,label,value:(r:LifeRecord|undefined)=>activityValue(r,label)}))}/>
  <CategoryGrid {...props} title="モヤモヤの内容" id="moyamoya-patterns" rows={PATTERNS.map(p=>({id:p.id,label:p.short,value:(r:LifeRecord|undefined)=>typeof r?.moyamoya?.has!=='boolean'?null:!r.moyamoya.has?false:r.moyamoya.pattern?r.moyamoya.pattern===p.id:null}))}/>
  <View style={s.detail}><Text style={s.label}>{short(selected)} のメモ</Text><Text style={s.note}>{chosen?.win?'できたこと：'+chosen.win:'できたこと：未記録'}</Text><Text style={s.note}>{chosen?.notes||'暮らしのメモ：未記録'}</Text>{!!chosen?.moyamoya?.memo&&<Text style={s.note}>モヤモヤ：{chosen.moyamoya.memo}</Text>}</View>
 </View>;
}
function MetricChart({days,selected,onSelect,metric}:Props&{metric:LifeMetric}){
 const [width,setWidth]=useState(260),theme=LIFE_METRICS[metric],left=67,right=15,top=12,bottom=110;
 const x=(i:number)=>left+i*Math.max(1,width-left-right)/Math.max(1,days.length-1);
 const y=(value:number)=>bottom-(value-theme.min)/(theme.max-theme.min)*(bottom-top);
 const selectedIndex=days.findIndex(d=>d.date===selected),chosen=days[selectedIndex]?.record;
 const ticks=metric==='sleep'?[12,6,0]:metric==='moyamoya'?[1,0]:[3,2,1];
 let path='',join=false;days.forEach((day,i)=>{const v=lifeValue(day.record,metric);if(v===null){join=false;return;}path+=(join?'L':'M')+x(i)+' '+y(v)+' ';join=true;});
 return <View testID={'life-trend-'+metric} style={s.card}>
  <View style={[s.header,{backgroundColor:theme.tint}]}><Text style={[s.label,{color:theme.ink}]}>{theme.title}</Text><Text style={s.note}>{days.filter(d=>lifeValue(d.record,metric)!==null).length}日分の回答</Text></View>
  <Pressable testID={'life-chart-'+metric} accessibilityRole="button" accessibilityLabel={theme.title+'の推移。'+short(selected)+'は'+lifeLabel(chosen,metric)+'。下の前の日・次の日ボタンでも選べます。'} onLayout={e=>setWidth(Math.max(180,e.nativeEvent.layout.width))} onPress={e=>{const i=Math.max(0,Math.min(days.length-1,Math.round((e.nativeEvent.locationX-left)/Math.max(1,width-left-right)*(days.length-1))));onSelect(days[i].date);}} style={s.plot}>
   <Svg width={width} height={150} accessible={false}>
    {ticks.map(v=><React.Fragment key={v}><Line x1={left} x2={width-right} y1={y(v)} y2={y(v)} stroke="#E4DCE7"/><SvgText x={left-8} y={y(v)+4} textAnchor="end" fontSize={11} fill="#78687E">{metric==='sleep'?v+'時間':theme.labels[v]}</SvgText></React.Fragment>)}
    {selectedIndex>=0&&<Line x1={x(selectedIndex)} x2={x(selectedIndex)} y1={top} y2={bottom} stroke="#B9A4C6" strokeDasharray="3 4"/>}
    {metric!=='sleep'&&<Path d={path} fill="none" stroke={theme.ink} strokeWidth={2}/>}
    {days.map((day,i)=>{const value=lifeValue(day.record,metric);if(value===null)return null;const w=Math.min(16,Math.max(3,(width-left-right)/days.length*.6));return metric==='sleep'&&value>0?<Rect key={day.date} x={x(i)-w/2} y={y(value)} width={w} height={bottom-y(value)} rx={Math.min(3,w/2)} fill={theme.ink} opacity={day.date===selected?1:.65}/>:<Circle key={day.date} cx={x(i)} cy={y(value)} r={day.date===selected?4:2.5} fill={theme.ink}/>;})}
    {[0,Math.floor((days.length-1)/2),days.length-1].map((i,n)=><SvgText key={i} x={x(i)} y={134} textAnchor={n===0?'start':n===2?'end':'middle'} fontSize={11} fill="#78687E">{short(days[i].date)}</SvgText>)}
   </Svg>
  </Pressable>
  <View style={[s.footer,{backgroundColor:theme.tint}]}><Text style={s.note}>{short(selected)} の回答</Text><Text testID={'life-selected-'+metric} accessibilityLiveRegion="polite" style={[s.label,{color:theme.ink}]}>{lifeLabel(chosen,metric)}</Text></View>
 </View>;
}
type Row={id:string;label:string;value:(r:LifeRecord|undefined)=>boolean|null};
function CategoryGrid({days,selected,onSelect,title,id,rows}:Props&{title:string;id:string;rows:Row[]}){
 const scroll=useRef<ScrollView>(null);
 useEffect(()=>{const index=days.findIndex(d=>d.date===selected);scroll.current?.scrollTo({x:Math.max(0,index*44-88),animated:false});},[selected,days.length]);
 return <View testID={'life-grid-'+id} style={s.card}>
  <View style={s.header}><Text style={s.label}>{title}</Text><Text style={s.note}>● 選択　○ 選択なし　— 未記録</Text></View>
  <View style={{flexDirection:'row',padding:8}}>
   <View style={{width:108}}><View style={{height:40}}/>{rows.map(row=><View key={row.id} style={{height:48,justifyContent:'center',paddingRight:6}}><Text numberOfLines={2} style={s.rowLabel}>{row.label}</Text></View>)}</View>
   <ScrollView ref={scroll} horizontal showsHorizontalScrollIndicator style={{flex:1}} contentContainerStyle={{paddingBottom:10}}>
    {days.map(day=><View key={day.date} style={{width:44,backgroundColor:day.date===selected?'#F0E6F6':'transparent'}}>
     <Pressable accessibilityRole="button" accessibilityLabel={day.date+'の回答を見る'} onPress={()=>onSelect(day.date)} style={{height:40,justifyContent:'center',alignItems:'center'}}><Text style={s.rowLabel}>{short(day.date)}</Text></Pressable>
     {rows.map(row=>{const v=row.value(day.record);return <Pressable key={row.id} testID={'life-cell-'+id+'-'+row.id+'-'+day.date} accessibilityRole="button" accessibilityLabel={day.date+'、'+row.label+'、'+(v===null?'未記録':v?'選択':'選択なし')} accessibilityState={{selected:day.date===selected}} onPress={()=>onSelect(day.date)} style={{height:48,alignItems:'center',justifyContent:'center'}}><Text style={{fontSize:v===null?17:22,color:v===null?'#9A8F9E':v?'#88679B':'#B9ABBF'}}>{v===null?'—':v?'●':'○'}</Text></Pressable>;})}
    </View>)}
   </ScrollView>
  </View><Text style={[s.note,{padding:12}]}>日付を左右に動かして確認できます。</Text>
 </View>;
}
const s=StyleSheet.create({
 stack:{gap:18},heading:{fontSize:18,fontWeight:'600',color:'#5B4568',lineHeight:27},
 card:{backgroundColor:'#FFFEFB',borderRadius:22,overflow:'hidden',borderWidth:1,borderColor:'#E4DBE8'},
 header:{padding:15,gap:5,backgroundColor:'#F7F1F7'},label:{fontSize:14,fontWeight:'600',lineHeight:22,color:'#644E70'},
 note:{fontSize:12,lineHeight:20,color:'#88748D'},plot:{height:150,margin:8},
 footer:{paddingHorizontal:15,paddingVertical:12,flexDirection:'row',justifyContent:'space-between',gap:8,flexWrap:'wrap'},
 rowLabel:{fontSize:11,lineHeight:17,color:'#7B6684'},detail:{padding:16,gap:8,backgroundColor:'#FFF9EE',borderRadius:18},
});
