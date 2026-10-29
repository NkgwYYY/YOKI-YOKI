import React,{useState} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import Svg,{Circle,Line,Polygon,Text as Ink} from 'react-native-svg';
import type {DailyRecord} from '@/contexts/AppContext';
import {recordRadar} from '@/utils/recordRadar';
import {BottomSheet} from '@/components/ui/BottomSheet';
const PURPLE='#75519A',MUTED='#75677F';
export function RecordRadar({records,date}:{records:DailyRecord[];date:string}){
 const data=recordRadar(records,date),[help,setHelp]=useState(false);
 const point=(i:number,f=1)=>{const a=-Math.PI/2+i*Math.PI*2/5;return {x:160+Math.cos(a)*60*f,y:90+Math.sin(a)*60*f};};
 const polygon=(values:number[])=>values.map((v,i)=>{const p=point(i,v);return `${p.x},${p.y}`;}).join(' ');
 const hasPrevious=data.previous.some(a=>a.value!==null),count=data.current.filter(a=>a.value!==null).length;
 const series=(axes:typeof data.current,previous:boolean)=>{
  const color=previous?'#B6A6C4':PURPLE,complete=axes.every(a=>a.fraction!==null);
  return <React.Fragment key={String(previous)}>
   {complete?<Polygon testID={previous?'radar-previous-polygon':'radar-current-polygon'} points={polygon(axes.map(a=>a.fraction!))} fill={previous?'none':'#A681C233'} stroke={color} strokeWidth={previous?1.5:2.5} strokeDasharray={previous?'4 3':undefined}/>:axes.map((a,i)=>{const next=axes[(i+1)%5];if(a.fraction===null||next.fraction===null)return null;const p=point(i,a.fraction),q=point((i+1)%5,next.fraction);return <Line key={a.key} x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke={color} strokeWidth={2} strokeDasharray={previous?'4 3':undefined}/>;})}
   {axes.map((a,i)=>{if(a.fraction===null)return null;const p=point(i,a.fraction);return <Circle testID={`radar-${previous?'previous':'current'}-${a.key}`} key={a.key} cx={p.x} cy={p.y} r={previous?2.5:4} fill={previous?'#FFF':color} stroke={previous?color:'#FFF'} strokeWidth={1.5}/>;})}
  </React.Fragment>;
 };
 return <View testID="record-radar" style={s.root}>
  <View accessible accessibilityLabel={data.current.map(a=>`${a.label}：${a.value===null?'未記録':a.value.toFixed(1)+a.unit+'、'+a.count+'日分'}`).join('。')}>
   <Svg width="100%" height={156} viewBox="0 0 320 174" accessible={false}>
    <Polygon points={polygon(Array(5).fill(1))} fill="#FBF9FD"/>
    {[.25,.5,.75,1].map(n=><Polygon key={n} points={polygon(Array(5).fill(n))} fill="none" stroke="#E1D8E9" strokeWidth={1}/>)}
    {data.current.map((a,i)=>{const p=point(i);return <Line key={a.key} x1={160} y1={90} x2={p.x} y2={p.y} stroke="#E9E1EE"/>;})}
    {series(data.previous,true)}{series(data.current,false)}
    {data.current.map((a,i)=>{const labels=[{x:160,y:9},{x:259,y:63},{x:231,y:153},{x:89,y:153},{x:60,y:63}],p=labels[i];return <React.Fragment key={a.key}><Ink x={p.x} y={p.y} textAnchor="middle" fontSize={10} fontWeight="600" fill="#4D3D5E">{a.label}</Ink><Ink x={p.x} y={p.y+15} textAnchor="middle" fontSize={11} fontWeight="600" fill={a.value===null?MUTED:PURPLE}>{a.value===null?'未記録':`${a.value.toFixed(1)}${a.unit}`}</Ink></React.Fragment>;})}
   </Svg>
  </View>
  <View style={s.legend}><Text style={s.key}>● 最近7日間</Text>{hasPrevious&&<Text style={s.previous}>┄ 前の7日間</Text>}<Pressable accessibilityRole="button" accessibilityLabel="五角形グラフの見方" onPress={()=>setHelp(true)} hitSlop={8} style={s.help}><Text style={s.helpText}>見方</Text></Pressable></View>
  <Text style={s.note}>{count===5?'記録した日の平均を表示':`${count}/5項目を記録 · 未記録の項目は点を表示しません`}</Text>
  {help&&<BottomSheet visible title="五角形グラフの見方" onClose={()=>setHelp(false)}><Text style={s.explain}>最近7日間と、その前の7日間を重ねています。項目ごとに、記録がある日の平均を表示します。</Text><Text style={s.explain}>気分は5段階、食事・運動・人との関わりは3段階の自己評価です。睡眠は時間で、外周が12時間以上を表します。</Text><Text style={s.explain}>外側ほど記録値が大きくなります。睡眠が長いほど良い、運動を多くするほど良い、という評価ではありません。</Text>{data.current.map(a=><View key={a.key} style={s.helpRow}><Text style={s.explain}>{a.label}</Text><Text style={s.explain}>{a.value===null?'未記録':`${a.value.toFixed(1)}${a.unit} · ${a.count}日分`}</Text></View>)}</BottomSheet>}
 </View>;
}
const s=StyleSheet.create({root:{gap:3},legend:{flexDirection:'row',alignItems:'center',gap:12,justifyContent:'center'},key:{fontSize:10,color:PURPLE,fontWeight:'600'},previous:{fontSize:10,color:'#8D789E'},help:{minHeight:28,paddingHorizontal:9,justifyContent:'center'},helpText:{fontSize:10,color:MUTED,textDecorationLine:'underline'},note:{fontSize:9,lineHeight:15,textAlign:'center',color:MUTED},explain:{fontSize:13,lineHeight:23,color:'#53415D',marginBottom:9},helpRow:{flexDirection:'row',justifyContent:'space-between',borderTopWidth:1,borderTopColor:'#E1D8E9',paddingTop:10}});
