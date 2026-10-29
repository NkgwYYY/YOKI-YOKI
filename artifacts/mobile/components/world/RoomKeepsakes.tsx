import {homeWallObjects} from '@/utils/homeView';
import {CompanionCollection} from '@/components/collection/CompanionCollection';
import React,{useEffect,useState} from 'react';
import {StyleSheet,Text,View} from 'react-native';
import {FeltPressable as Pressable} from '@/components/ui/FeltPressable';
import Svg,{Circle,Defs,Ellipse,Line,LinearGradient,Path,Rect,Stop,Text as Ink} from 'react-native-svg';
import {useApp} from '@/contexts/AppContext';
import {colors} from '@/constants/theme';
import {BottomSheet} from '@/components/ui/BottomSheet';
import {StaticMascot} from '@/components/Mascot';
import {getMascotStage} from '@/utils/mascotUtils';
import {getTodayDate} from '@/utils/dateUtils';
import {moodDays,nextVisitStage,readVisitGrowth,shiftDay,VISIT_STAGES} from '@/utils/visitGrowth';

const MOODS=['','つらい','少ししんどい','ふつう','穏やか','うれしい'];
const TINTS=['','#A296BA','#B3A6C7','#C8B6D4','#A4B9A0','#D9BB79'];
type Kind='calendar'|'moods'|'collection';
/** Furniture anchored in the room's coordinate space, rather than another HUD/menu. */
export function RoomKeepsakes({width,height,frameLeft,frameTop,viewportWidth,viewportHeight,safeTop,night,disabled,onBusy}:{width:number;height:number;frameLeft:number;frameTop:number;viewportWidth:number;viewportHeight:number;safeTop:number;night:boolean;disabled:boolean;onBusy:(busy:boolean)=>void}){
 const {progress,records,visitError,refreshVisits}=useApp();
 const [open,setOpen]=useState<Kind|null>(null);
 const today=getTodayDate(),visits=readVisitGrowth(progress.visits),days=moodDays(records,today);
 const next=nextVisitStage(visits),stage=getMascotStage(progress);
 const streak=visits?.totalVisits??0,month=Number(today.slice(5,7));
 useEffect(()=>{onBusy(open!==null);return()=>onBusy(false);},[open,onBusy]);
 // Anchor to the back wall in artwork coordinates, independent of the HUD.
 const objects=homeWallObjects(width,height,viewportWidth>viewportHeight);
 const {calendar}=objects;
 const calendarLabel=`カレンダー。${streak?`累計ログイン${streak}日`:'ログイン日の記録'}。進化までの日数を見る`;
 return <>
  <Pressable testID="room-visit-calendar" accessibilityRole="button" accessibilityLabel={calendarLabel} disabled={disabled} onPress={()=>setOpen('calendar')}
   style={({pressed})=>[s.object,{...calendar,transform:[{scale:pressed ? .97 : 1}],opacity:night?.88:1,shadowColor:'#253A4F',shadowOpacity:.20,shadowRadius:2,shadowOffset:{width:1,height:2}}]}>
   <Svg width="100%" height="100%" viewBox="0 0 110 140" pointerEvents="none" accessible={false}>
    <Defs><LinearGradient id="calendarWood" x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#F6E6C9"/><Stop offset=".5" stopColor="#E9CFAB"/><Stop offset="1" stopColor="#CCA983"/></LinearGradient><LinearGradient id="calendarPaper" x1="0" y1="0" x2=".7" y2="1"><Stop offset="0" stopColor="#FFFBEF"/><Stop offset="1" stopColor="#F5E8D3"/></LinearGradient></Defs>
    <Path d="M32 16 L53 3 L75 16" fill="none" stroke="#CBB890" strokeWidth="2"/><Circle cx="53" cy="3" r="2.5" fill="#B6A482"/>
    <Rect x="7" y="14" width="91" height="116" rx="5" fill="url(#calendarWood)"/>
    <Path d="M12 21 H93 M12 124 H91" stroke="#F9FCFF" strokeWidth="1" opacity=".6"/>
    <Rect x="14" y="19" width="77" height="104" rx="2" fill="#718DA4"/>
    <Rect x="13" y="17" width="77" height="103" rx="2" fill="url(#calendarPaper)"/>
    <Rect x="13" y="17" width="77" height="24" fill="#86A4BA"/>
    {[31,73].map(x=><Path key={x} d={`M${x} 23 V11 C${x} 5 ${x+5} 5 ${x+5} 11 V22`} fill="none" stroke="#D5C59B" strokeWidth="3"/>)}
    <Ink x="52" y="34" textAnchor="middle" fontSize="12" fill="#FFF9ED">{month}月 · ログイン</Ink>
    <Ink x="52" y="77" textAnchor="middle" fontSize="38" fontWeight="600" fill="#5F506B">{streak||'—'}</Ink>
    <Ink x="52" y="92" textAnchor="middle" fontSize="12" fill="#806B72">{streak?'日ログイン':'今日から'}</Ink>
    {Array.from({length:7},(_,i)=>{const date=shiftDay(today,i-6),met=visits?.dates.includes(date);return <Circle key={date} cx={24+i*9.1} cy="106" r="2.4" fill={met?'#9A809D':'#CFC2A9'}/>;})}
    <Path d="M77 120 L90 106 V120 Z" fill="#CAB89A"/>
   </Svg>
  </Pressable>
  <BottomSheet visible={open!==null} title={open==='moods'?'気分の推移':open==='collection'?'思い出':'カレンダー'} subtitle={open==='moods'?'記録した気分を、そのまま。':'アプリを開いた日を記録しています。'} onClose={()=>setOpen(null)}>
   {open==='collection'?<CompanionCollection/>:open==='calendar'?<>
    <View style={s.summary} testID="visit-current-form" accessibilityLabel={`いまの姿は${VISIT_STAGES.find(v=>v.stage===stage)?.name}`}><StaticMascot stage={stage} mood="happy" size={80}/><View style={{flex:1}}><Text testID="visit-streak-value" style={s.big}>累計 {streak}日</Text><Text style={s.note}>累計ログイン日数</Text></View></View>
    {visitError&&<View><Text accessibilityRole="alert" style={s.note}>{visitError}</Text><Pressable accessibilityRole="button" onPress={()=>void refreshVisits()} style={s.retry}><Text style={s.body}>もう一度保存する</Text></Pressable></View>}
    <Pressable testID="calendar-open-collection" accessibilityRole="button" onPress={()=>setOpen('collection')} style={{padding:16,borderRadius:18,backgroundColor:colors.primarySoft}}><Text style={{color:colors.primary,fontSize:14,fontWeight:'600'}}>思い出・飾りもの　›</Text></Pressable>
    <Pressable testID="room-mood-frame" accessibilityRole="button" accessibilityLabel="気分の推移。最近7日間の気分を見る" onPress={()=>setOpen('moods')} style={{padding:16,borderRadius:18,marginTop:8,marginBottom:12,backgroundColor:colors.muted}}><Text style={{color:colors.primary,fontSize:14,fontWeight:'600'}}>最近7日間の気分　›</Text></Pressable>
    <MonthCalendar today={today} dates={visits?.dates??[]}/>
    <View style={s.growth}><Text style={s.eyebrow}>次の姿へ</Text><Text testID="visit-next-evolution" style={s.heading}>{next?`${next.name}まで、あと${Math.max(0,next.days-streak)}日`:'カラフルはっぱと、今日も一緒。'}</Text><Text style={s.note}>{next?`累計${next.days}日で進化します。日記を書かない日も、アプリを開けば数えます。`:(visits?.totalVisits??0)>=30?'30日、一緒に過ごした、特別な姿です。':'これまで一緒に育ってきた、特別な姿です。'}</Text></View>
    <View style={s.steps}>{VISIT_STAGES.map((v,i)=><View key={v.stage} style={s.step}><View style={[s.seed,{backgroundColor:v.stage===stage?'#94779C':'#DAD0D7'}]}><Text style={[s.stepNumber,{color:v.stage===stage?'#FFF9ED':'#77687E'}]}>{i+1}</Text></View><Text style={s.stepLabel}>{v.name}</Text><Text style={s.note}>{i?`${v.days}日`:'はじまり'}</Text></View>)}</View>
    <Text style={s.fine}>ログインしない日があっても、累計日数と進化した姿は変わりません。</Text>
   </>:<>
    <View style={s.moodChart}>{days.map(d=><View key={d.date} style={s.moodColumn}><View style={s.barTrack}>{d.mood!==null&&<View testID={`mood-bar-${d.date}`} style={[s.bar,{height:`${d.mood*20}%`,backgroundColor:TINTS[d.mood]}]}/>}</View><Text style={s.dayLabel}>{Number(d.date.slice(5,7))}/{Number(d.date.slice(8))}</Text><Text style={s.moodName}>{d.mood===null?'未記録':MOODS[d.mood]}</Text></View>)}</View>
    <Text style={s.note}>{days.some(d=>d.mood!==null)?'気分の上下に、良い・悪いはありません。記録のない日は空けています。':'まだ記録がありません。交換日記で気分を選ぶと、この額にも色がついていきます。'}</Text>
   </>}
  </BottomSheet>
 </>;
}
function MonthCalendar({today,dates}:{today:string;dates:string[]}){
 const monthStart=today.slice(0,7)+'-01',offset=new Date(monthStart+'T12:00:00').getDay();
 const cells=Array.from({length:42},(_,i)=>shiftDay(monthStart,i-offset));
 const last=Number(cells[35].slice(5,7))!==Number(today.slice(5,7))?35:42;
 return <View style={s.calendar}><Text style={s.month}>{Number(today.slice(0,4))}年 {Number(today.slice(5,7))}月</Text><View style={s.week}>{'日月火水木金土'.split('').map(d=><Text key={d} style={s.weekday}>{d}</Text>)}</View><View style={s.monthGrid}>{cells.slice(0,last).map(d=>{const thisMonth=d.slice(0,7)===today.slice(0,7),visited=dates.includes(d);return <View key={d} style={s.dateCell}><View accessibilityLabel={thisMonth?`${Number(d.slice(8))}日${visited?'、ログインした日':''}`:undefined} style={[s.dateInk,visited&&s.visited,d===today&&s.today]}><Text style={[s.dateNumber,{opacity:thisMonth?1:0},visited&&{color:'#FFF9ED'}]}>{Number(d.slice(8))}</Text></View></View>;})}</View></View>;
}
const s=StyleSheet.create({
 object:{position:'absolute',zIndex:90,minWidth:44,minHeight:44},summary:{flexDirection:'row',alignItems:'center',gap:18,marginBottom:16},big:{fontSize:29,fontWeight:'600',color:colors.foreground},body:{fontSize:15,color:colors.foreground},note:{fontSize:12,lineHeight:20,color:colors.mutedForeground},heading:{fontSize:18,lineHeight:27,color:colors.foreground,fontWeight:'600'},eyebrow:{fontSize:11,letterSpacing:2,color:colors.subtleForeground,marginBottom:5},growth:{marginTop:20,padding:18,backgroundColor:colors.muted,borderRadius:16,gap:5},steps:{flexDirection:'row',marginVertical:20,gap:4},step:{flex:1,alignItems:'center',gap:6},seed:{width:26,height:26,borderRadius:13,alignItems:'center',justifyContent:'center'},stepNumber:{fontSize:12},stepLabel:{fontSize:10,color:colors.mutedForeground,textAlign:'center'},fine:{fontSize:11,lineHeight:19,color:colors.mutedForeground},welcome:{fontSize:15,color:colors.primaryOnSoft,marginBottom:12,lineHeight:23},retry:{minHeight:44,justifyContent:'center'},calendar:{padding:14,borderRadius:4,backgroundColor:'#FCF7EC',borderWidth:1,borderColor:'#E6D9C5'},month:{fontSize:16,color:'#807069',textAlign:'center',marginBottom:14,letterSpacing:1},week:{flexDirection:'row'},weekday:{width:'14.2857%',fontSize:11,textAlign:'center',color:'#AD9A8C'},monthGrid:{flexDirection:'row',flexWrap:'wrap',marginTop:4},dateCell:{width:'14.2857%',height:36,alignItems:'center',justifyContent:'center'},dateInk:{width:29,height:29,alignItems:'center',justifyContent:'center',borderRadius:15,borderWidth:1,borderColor:'transparent'},visited:{backgroundColor:'#A28AA7'},today:{borderColor:'#886B91'},dateNumber:{fontSize:13,color:'#8E7E72'},moodChart:{flexDirection:'row',paddingVertical:20,gap:5},moodColumn:{flex:1,alignItems:'center',gap:9},barTrack:{height:110,width:'65%',justifyContent:'flex-end',borderBottomWidth:1,borderBottomColor:'#DCCDDC'},bar:{width:'100%',borderTopLeftRadius:9,borderTopRightRadius:9},dayLabel:{fontSize:11,color:colors.mutedForeground},moodName:{fontSize:10,lineHeight:15,minHeight:30,textAlign:'center',color:colors.mutedForeground},
});
