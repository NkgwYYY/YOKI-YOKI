import React,{useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {Platform,Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {useFocusEffect,useRouter} from 'expo-router';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Svg,{Circle,Line,Path,Text as SvgText} from 'react-native-svg';
import {useApp} from '@/contexts/AppContext';
import {useAuth} from '@/contexts/AuthContext';
import {BottomSheet} from '@/components/ui/BottomSheet';
import {Icon} from '@/components/ui/Icon';
import {CONDITION_LABELS,CONDITION_TITLES,conditionDays,conditionValue,conditionLabel,conditionSummary,conditionChange,type ConditionKey} from '@/utils/conditionTrends';
import {formatDateJP,getTodayDate} from '@/utils/dateUtils';
import {getTabBarHeight} from '@/utils/tabLayout';

const KEYS:ConditionKey[]=['mood','fatigue','worry'];
const METRIC_STYLE={
 mood:{ink:'#71528D',tint:'#F5EFFB',border:'#DED0EC',icon:'heart'},
 fatigue:{ink:'#327B78',tint:'#ECF6F4',border:'#BEDDD7',icon:'battery'},
 worry:{ink:'#94632E',tint:'#FFF5E7',border:'#E8D2B0',icon:'cloud'},
} as const;
export default function ConditionScreen(){const auth=useAuth();return <ConditionNotebook key={auth.user?.id??'guest'}/>;}
function ConditionNotebook(){
 const {records,getTodayRecord,saveRecord,isLoading,storageError,cloudSynced}=useApp(),auth=useAuth();
 const router=useRouter(),insets=useSafeAreaInsets();
 const [today,setToday]=useState(getTodayDate),[period,setPeriod]=useState(7),[selected,setSelected]=useState(today);
 const [editing,setEditing]=useState(false),[history,setHistory]=useState(false);
 const [mood,setMood]=useState<number>(),[fatigue,setFatigue]=useState<number>(),[worry,setWorry]=useState<number>();
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const lock=useRef(false),alive=useRef(true),editDay=useRef(today);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 useFocusEffect(useCallback(()=>{const update=()=>setToday(getTodayDate());update();const timer=setInterval(update,30000);return()=>clearInterval(timer);},[]));
 useEffect(()=>setSelected(today),[today,period]);
 const days=useMemo(()=>conditionDays(records,today,period),[records,today,period]);
 const current=records.find(r=>r.date===today),summary=conditionSummary(current),chosen=days.find(d=>d.date===selected);
 const ready=!isLoading&&!storageError&&!auth.isLoading&&(!auth.isSignedIn||cloudSynced);
 const openEditor=()=>{const r=getTodayRecord();setMood(conditionValue(r,'mood')??undefined);setFatigue(conditionValue(r,'fatigue')??undefined);setWorry(conditionValue(r,'worry')??undefined);setError('');editDay.current=getTodayDate();setEditing(true);};
 const save=async()=>{
  if(lock.current||!ready||!mood)return;
  if(editDay.current!==getTodayDate()){setError('日付が変わりました。閉じてから、今日の記録を開き直してください。');return;}
  lock.current=true;setBusy(true);setError('');
  try{await saveRecord(mood,0,[],'',{conditionOnly:true,sleepRecorded:false,fatigue,worry});if(alive.current){setEditing(false);setSelected(today);}}
  catch{if(alive.current)setError('保存できませんでした。入力内容はこのまま、もう一度お試しください。');}
  finally{lock.current=false;if(alive.current)setBusy(false);}
 };
 const step=(delta:number)=>{const index=days.findIndex(d=>d.date===selected);setSelected(days[Math.max(0,Math.min(days.length-1,index+delta))].date);};
 return <View testID="condition-screen" style={s.root}>
  <ScrollView contentContainerStyle={[s.content,{paddingTop:(Platform.OS==='web'?18:insets.top)+14,paddingBottom:getTabBarHeight(Platform.OS,insets.bottom)+28}]} showsVerticalScrollIndicator={false}>
   <View style={s.heading}><View style={{flex:1,gap:8}}><Text style={s.brand}>• YOKI YOKI</Text><Text accessibilityRole="header" style={s.title}>いまのようす</Text></View><Pressable testID="condition-menu" accessibilityRole="button" accessibilityLabel="メニューを開く" onPress={()=>router.navigate({pathname:'/(tabs)',params:{menu:'1'}})} style={s.iconButton}><Icon name="grid" size={22} color="#514657"/></Pressable></View>
   <View testID="condition-summary" style={s.card}>
    <Text style={s.small}>{formatDateJP(today)}　あなたのきろく</Text>
    <View style={{gap:10}}>{KEYS.map(key=><View key={key} testID={`condition-card-${key}`} style={{backgroundColor:METRIC_STYLE[key].tint,borderRadius:18,padding:16,gap:8,borderLeftWidth:5,borderLeftColor:METRIC_STYLE[key].ink}}><Text style={s.small}>{CONDITION_TITLES[key]}</Text><Text testID={`condition-current-${key}`} style={[s.mood,{fontSize:21}]}>{conditionLabel(current,key)}</Text></View>)}</View>
    <View style={s.summary}><Text style={s.summaryLine}>よいところ　<Text style={s.good}>{summary.good.join('・')||'—'}</Text></Text><Text style={s.summaryLine}>気になるところ　<Text style={s.concern}>{summary.concern.join('・')||'—'}</Text></Text>{!current&&<Text style={s.small}>記録すると、今日の状態をここで確認できます。</Text>}</View>
   </View>
   <Pressable testID="condition-edit" disabled={!ready} accessibilityRole="button" onPress={openEditor} style={[s.primary,!ready&&s.disabled]}><Icon name="edit-3" size={20} color="#FFFDF8"/><Text style={s.primaryText}>いまのようすを記録</Text></Pressable>
   <View style={[s.heading,{marginTop:14}]}><Text accessibilityRole="header" style={s.sectionTitle}>ここまでの変化</Text><Text style={s.small}>自分で残した記録</Text></View>
   <View style={s.segment}>{[7,30].map(n=><Pressable key={n} testID={`condition-period-${n}`} accessibilityRole="button" accessibilityState={{selected:period===n}} onPress={()=>setPeriod(n)} style={[s.segmentButton,period===n&&s.segmentSelected]}><Text style={s.segmentLabel}>{n===7?'1週間':'1か月'}</Text></Pressable>)}</View>
   <View style={s.heading}><Text style={s.small}>{shortDate(days[0].date)} – {shortDate(today)}</Text><Text testID="condition-record-count" style={s.small}>{days.filter(d=>conditionValue(d.record,'mood')!==null).length}日分の記録</Text></View>
   <View testID="condition-week-strip" style={{flexDirection:'row',gap:4}}>{days.slice(-7).map(day=><Pressable key={day.date} accessibilityRole="button" accessibilityLabel={`${formatDateJP(day.date)} ${conditionLabel(day.record,'mood')}`} accessibilityState={{selected:selected===day.date}} onPress={()=>setSelected(day.date)} style={{flex:1,minHeight:54,alignItems:'center',justifyContent:'center',gap:4,borderRadius:12,backgroundColor:selected===day.date?'#76558C':'#FFFFFF',borderWidth:1,borderColor:selected===day.date?'#76558C':'#E1D9EA'}}><Text style={[s.small,selected===day.date&&{color:'#FFFFFF',fontWeight:'700'}]}>{Number(day.date.slice(-2))}</Text><View style={{width:6,height:6,borderRadius:3,backgroundColor:selected===day.date?'#E8D9F3':conditionValue(day.record,'mood')===null?'#DFD8E3':'#8B6B9A'}}/></Pressable>)}</View>
   {KEYS.map(key=>{const theme=METRIC_STYLE[key];return <View key={key} testID={`condition-trend-card-${key}`} style={[s.chartCard,{borderColor:theme.border}]}>
    <View style={[s.chartHeading,{backgroundColor:theme.tint}]}><View style={s.chartTitle}><View style={[s.metricIcon,{backgroundColor:'#FFFFFF'}]}><Icon name={theme.icon} size={19} color={theme.ink}/></View><Text style={[s.sectionTitle,{color:theme.ink}]}>{CONDITION_TITLES[key]}</Text></View><Text style={[s.change,{color:theme.ink}]}>{conditionChange(days,key)}</Text></View>
    <View style={s.plot}><ConditionChart days={days} metric={key} selected={selected} onSelect={setSelected}/></View>
    <View style={[s.chartFooter,{backgroundColor:theme.tint}]}><Text style={s.selectedDate}>{shortDate(selected)} の記録</Text><Text testID={`condition-selected-${key}`} accessibilityLiveRegion="polite" style={[s.selected,{color:theme.ink}]}>{conditionLabel(chosen?.record,key)}</Text></View>
   </View>;})}
   <View style={s.dayNav}><Pressable disabled={selected===days[0].date} accessibilityRole="button" accessibilityLabel="前の日の記録" onPress={()=>step(-1)} style={[s.dayButton,selected===days[0].date&&s.disabled]}><Icon name="chevron-left" size={16} color="#675670"/><Text style={s.linkText}>前の日</Text></Pressable><Text style={s.small}>{formatDateJP(selected)}</Text><Pressable disabled={selected===today} accessibilityRole="button" accessibilityLabel="次の日の記録" onPress={()=>step(1)} style={[s.dayButton,selected===today&&s.disabled]}><Text style={s.linkText}>次の日</Text><Icon name="chevron-right" size={16} color="#675670"/></Pressable></View>
   <Link label="日ごとの記録を見る" testID="condition-history" onPress={()=>setHistory(true)}/>
   <Link label="元気な日の傾向を見る" testID="condition-insights" onPress={()=>router.push('/insights')}/>
   <Link label="相棒の成長と思い出" testID="condition-growth" onPress={()=>router.navigate('/(tabs)/growth')}/>
   <Text style={s.footer}>空白の日・項目は未記録のまま表示します。{ '\n' }よいところ・気になるところは、選んだ回答をもとに表示しています。</Text>
  </ScrollView>
  {editing&&<BottomSheet visible onClose={()=>{if(!lock.current)setEditing(false);}} title="いまのようすを記録" subtitle={formatDateJP(editDay.current)} maxHeightRatio={.94}>
   <Text style={s.question}>いまの気分は？</Text><View style={s.options}>{[1,2,3,4,5].map(value=><Pressable key={value} testID={`condition-mood-${value}`} disabled={busy} accessibilityRole="button" accessibilityLabel={`気分：${CONDITION_LABELS.mood[value]}`} accessibilityState={{selected:mood===value}} onPress={()=>setMood(value)} style={[s.moodOption,mood===value&&s.optionSelected]}><Text style={s.optionText}>{CONDITION_LABELS.mood[value]}</Text></Pressable>)}</View>
   <Scale title="からだの疲れはどれくらい？" field="fatigue" value={fatigue} onChange={setFatigue} disabled={busy}/>
   <Scale title="心配ごとはどれくらいある？" field="worry" value={worry} onChange={setWorry} disabled={busy}/>
   <Text style={s.small}>気分だけでも記録できます。日記や過ごし方の記録はそのまま残ります。</Text>
   {!!error&&<Text accessibilityRole="alert" style={s.error}>{error}</Text>}
   <Pressable testID="condition-save" accessibilityRole="button" disabled={busy||!mood||!ready} onPress={()=>void save()} style={[s.primary,(busy||!mood||!ready)&&s.disabled]}><Text style={s.primaryText}>{busy?'保存しています…':'この内容で記録する'}</Text></Pressable>
  </BottomSheet>}
  {history&&<BottomSheet visible onClose={()=>setHistory(false)} title="日ごとの記録" subtitle={period===7?'最近1週間':'最近1か月'} maxHeightRatio={.94}>{[...days].reverse().map(day=><View key={day.date} style={s.historyRow}><Text style={s.sectionTitle}>{formatDateJP(day.date)}</Text>{KEYS.map(key=><Text key={key} style={s.historyValue}>{CONDITION_TITLES[key]}：{conditionLabel(day.record,key)}</Text>)}</View>)}</BottomSheet>}
 </View>;
}
function shortDate(date:string){const [,m,d]=date.split('-');return `${Number(m)}/${Number(d)}`;}
function Link({label,testID,onPress}:{label:string;testID:string;onPress:()=>void}){return <Pressable testID={testID} accessibilityRole="button" onPress={onPress} style={s.link}><Text style={s.linkText}>{label}</Text><Icon name="chevron-right" size={18} color="#82708D"/></Pressable>;}
function Scale({title,field,value,onChange,disabled}:{title:string;field:'fatigue'|'worry';value:number|undefined;onChange:(value:number|undefined)=>void;disabled:boolean}){
 return <View style={{gap:10}}><Text style={s.question}>{title}</Text><View style={s.options}>{[1,2,3].map(v=><Pressable key={v} testID={`condition-${field}-${v}`} disabled={disabled} accessibilityRole="button" accessibilityState={{selected:value===v}} onPress={()=>onChange(v)} style={[s.scaleOption,value===v&&s.optionSelected]}><Text style={s.optionText}>{CONDITION_LABELS[field][v]}</Text></Pressable>)}</View><Pressable testID={`condition-${field}-skip`} disabled={disabled} accessibilityRole="button" accessibilityState={{selected:value===undefined}} onPress={()=>onChange(undefined)} style={s.skip}><Text style={s.small}>{value===undefined?'未記録にする ✓':'未記録にする'}</Text></Pressable></View>;
}
function ConditionChart({days,metric,selected,onSelect}:{days:ReturnType<typeof conditionDays>;metric:ConditionKey;selected:string;onSelect:(date:string)=>void}){
 const theme=METRIC_STYLE[metric];
 const [width,setWidth]=useState(260),left=58,right=12,top=10,bottom=92,max=metric==='mood'?5:3;
 const x=(i:number)=>left+i*(width-left-right)/(days.length-1),y=(v:number)=>bottom-(v-1)/(max-1)*(bottom-top);
 let path='',joined=false;days.forEach((day,i)=>{const v=conditionValue(day.record,metric);if(v===null){joined=false;return;}path+=`${joined?'L':'M'}${x(i)} ${y(v)} `;joined=true;});
 const ticks=metric==='mood'?[5,3,1]:[3,2,1],indexes=[0,Math.floor((days.length-1)/2),days.length-1];
 return <Pressable testID={`condition-chart-${metric}`} accessibilityRole="button" accessibilityLabel={`${CONDITION_TITLES[metric]}の推移。${shortDate(selected)}は${conditionLabel(days.find(d=>d.date===selected)?.record,metric)}。日付は下の前の日・次の日ボタンでも選べます`} onLayout={e=>setWidth(Math.max(180,e.nativeEvent.layout.width))} onPress={e=>{const i=Math.max(0,Math.min(days.length-1,Math.round((e.nativeEvent.locationX-left)/(width-left-right)*(days.length-1))));onSelect(days[i].date);}} style={{height:124}}>
  <Svg width={width} height={124} accessible={false}>
   <Line x1={x(days.findIndex(d=>d.date===selected))} x2={x(days.findIndex(d=>d.date===selected))} y1={top} y2={bottom} stroke={theme.border} strokeDasharray="3 4"/>
   {ticks.map(v=><React.Fragment key={v}><Line x1={left} y1={y(v)} x2={width-right} y2={y(v)} stroke={theme.border} strokeWidth={1}/><SvgText x={left-9} y={y(v)+4} textAnchor="end" fontSize={11} fill="#7F7185">{CONDITION_LABELS[metric][v]}</SvgText></React.Fragment>)}
   <Path d={path} stroke={theme.ink} strokeWidth={2} fill="none"/>
   {days.map((day,i)=>{const v=conditionValue(day.record,metric);return v===null?null:<Circle key={day.date} cx={x(i)} cy={y(v)} r={day.date===selected?4.5:2.6} stroke={theme.ink} strokeWidth={day.date===selected?2:0} fill={day.date===selected?'#FFFFFF':theme.ink}/>;})}
   {indexes.map((i,n)=><SvgText key={i} x={x(i)} y={114} textAnchor={n===0?'start':n===2?'end':'middle'} fontSize={11} fill="#7F7185">{shortDate(days[i].date)}</SvgText>)}
  </Svg>
 </Pressable>;
}
const s=StyleSheet.create({
 root:{flex:1,backgroundColor:'#F1F1F8'},content:{width:'100%',maxWidth:620,alignSelf:'center',paddingHorizontal:20,gap:18},heading:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:10,flexWrap:'wrap'},brand:{fontSize:11,letterSpacing:2,color:'#8B728C',fontWeight:'700'},title:{fontSize:27,lineHeight:38,fontWeight:'700',color:'#43384D'},iconButton:{width:48,height:48,borderRadius:18,backgroundColor:'#FFFCF6',alignItems:'center',justifyContent:'center',borderWidth:1,borderBottomWidth:4,borderColor:'#DED6E1'},
 card:{backgroundColor:'#FFFFFF',borderWidth:1,borderBottomWidth:5,borderColor:'#E3DDE6',borderRadius:26,padding:20,gap:16},small:{fontSize:12,lineHeight:20,color:'#857188'},hero:{flexDirection:'row',alignItems:'center',gap:14,paddingVertical:7},mood:{fontSize:25,lineHeight:36,fontWeight:'700',color:'#493650'},metric:{flexDirection:'row',alignItems:'center',gap:10,borderTopWidth:1,borderTopColor:'#E3DCE6',paddingTop:14},metricName:{flex:1,fontSize:13,lineHeight:21,color:'#5B4964'},metricValue:{fontSize:14,color:'#765A7E'},summary:{gap:8,borderTopWidth:1,borderTopColor:'#E3DCE6',paddingTop:13},summaryLine:{fontSize:12,lineHeight:21,color:'#857188'},good:{color:'#487D75'},concern:{color:'#9A673E'},primary:{minHeight:54,borderRadius:19,backgroundColor:'#856395',borderBottomWidth:4,borderBottomColor:'#664772',paddingHorizontal:12,paddingVertical:13,flexDirection:'row',justifyContent:'center',alignItems:'center',gap:10},primaryText:{fontSize:16,fontWeight:'600',lineHeight:24,color:'#FFFDF8'},disabled:{opacity:.45},sectionTitle:{fontSize:16,lineHeight:25,fontWeight:'600',color:'#4B3B55'},segment:{flexDirection:'row',gap:4,backgroundColor:'#E9E1EE',padding:4,borderRadius:18},segmentButton:{flex:1,minHeight:44,alignItems:'center',justifyContent:'center',borderRadius:14},segmentSelected:{backgroundColor:'#FFFCF6',borderBottomWidth:2,borderBottomColor:'#D9CEE1'},segmentLabel:{fontSize:14,color:'#5B4668'},chartCard:{backgroundColor:'#FFFFFF',borderWidth:1,borderBottomWidth:3,borderRadius:22,overflow:'hidden',shadowColor:'#362348',shadowOffset:{width:0,height:3},shadowOpacity:.05,shadowRadius:10},chartHeading:{padding:14,gap:7},chartTitle:{flexDirection:'row',alignItems:'center',gap:9},metricIcon:{width:34,height:34,borderRadius:12,alignItems:'center',justifyContent:'center'},plot:{paddingHorizontal:12,paddingTop:18,paddingBottom:14},chartFooter:{paddingHorizontal:16,paddingVertical:10,flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:8},change:{fontSize:11,lineHeight:18,marginLeft:43},selectedDate:{fontSize:11,lineHeight:19,color:'#6C6376'},selected:{fontSize:13,lineHeight:21,fontWeight:'600'},dayNav:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:4,backgroundColor:'#FFFFFF',borderRadius:17,paddingHorizontal:10,borderWidth:1,borderColor:'#E1D9EA'},dayButton:{minHeight:44,flexDirection:'row',alignItems:'center',gap:1},link:{minHeight:54,borderBottomWidth:1,borderBottomColor:'#DFD7E3',flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:10},linkText:{fontSize:13,lineHeight:22,color:'#574262'},footer:{fontSize:11,lineHeight:20,color:'#8A778D',textAlign:'center',paddingVertical:12},question:{fontSize:16,lineHeight:24,fontWeight:'600',color:'#574262'},options:{flexDirection:'row',gap:6},moodOption:{flex:1,paddingVertical:10,paddingHorizontal:1,minHeight:83,alignItems:'center',justifyContent:'center',gap:8,borderRadius:15,borderWidth:1,borderBottomWidth:3,borderColor:'#E2D8E7',backgroundColor:'#FFFCF6'},optionSelected:{borderColor:'#8A699A',backgroundColor:'#E9DFEE'},optionText:{fontSize:11,lineHeight:18,fontWeight:'600',color:'#5C466A'},scaleOption:{flex:1,minHeight:48,alignItems:'center',justifyContent:'center',paddingHorizontal:6,borderWidth:1,borderBottomWidth:3,borderColor:'#E2D8E7',backgroundColor:'#FFFCF6',borderRadius:15},skip:{minHeight:44,justifyContent:'center',alignSelf:'flex-end'},error:{fontSize:13,lineHeight:22,color:'#A34D58'},historyRow:{borderBottomWidth:1,borderBottomColor:'#E4DCE8',paddingBottom:16,gap:7},historyValue:{fontSize:13,lineHeight:22,color:'#75617D'},
});
