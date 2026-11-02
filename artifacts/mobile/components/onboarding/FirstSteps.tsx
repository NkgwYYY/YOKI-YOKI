import React,{useEffect,useRef,useState} from 'react';
import {StyleSheet,Text,View,useWindowDimensions} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg,{Circle,Line,Path,Rect} from 'react-native-svg';
import {BottomSheet} from '@/components/ui/BottomSheet';
import {Button} from '@/components/ui/Button';
import {Icon} from '@/components/ui/Icon';
import {FeltDecoration} from '@/components/ui/Felt';
import {ConditionFace} from '@/components/record/ConditionFace';
import {firstStepsKey} from '@/utils/firstSteps';

export function useFirstSteps(owner:string,active:boolean){
 const key=firstStepsKey(owner),[loaded,setLoaded]=useState<{key:string;pending:boolean}|null>(null);
 const current=useRef(key),generation=useRef(0);current.current=key;
 useEffect(()=>{if(!active)return;let alive=true;
  const request=++generation.current;
  AsyncStorage.getItem(key).then(value=>{if(alive&&request===generation.current)setLoaded({key,pending:value==='pending'});}).catch(()=>{if(alive&&request===generation.current)setLoaded({key,pending:false});});
  return()=>{alive=false;};
 },[key,active]);
 const finish=async()=>{++generation.current;await AsyncStorage.setItem(key,'done');if(current.current===key)setLoaded({key,pending:false});};
 return {ready:loaded?.key===key,due:loaded?.key===key&&loaded.pending,finish};
}

const STEPS=[
 {title:'まずは、今の調子から',copy:'おうちの「記録する」から、気分・からだの疲れ・心配ごとを選びます。気分だけでも保存できます。',label:'今の調子を残す'},
 {title:'書きたい日は、日記に',copy:'「日記」から「交換日記をひらく」を押すと、その日の出来事をひとこと残せます。この子のページも読めます。',label:'日記を書く'},
 {title:'変化は「きろく」で確認',copy:'気分・からだの疲れ・心配ごとの推移を振り返れます。空いた日は空白のまま。毎日埋めなくても大丈夫です。',label:'記録を振り返る'},
];

export function FirstSteps({onFinish}:{onFinish:(record:boolean)=>Promise<void>}){
 const compact=useWindowDimensions().height<650;
 const [step,setStep]=useState(0),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const lock=useRef(false),alive=useRef(true);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 const finish=async(record=false)=>{if(lock.current)return;lock.current=true;setBusy(true);setError('');try{await onFinish(record);}catch{if(alive.current)setError('保存できませんでした。もう一度お試しください。');}finally{lock.current=false;if(alive.current)setBusy(false);}};
 const item=STEPS[step];
 return <BottomSheet visible title="はじめての使い方" subtitle={`3つの操作 · ${step+1} / 3`} onClose={()=>void finish()} maxHeightRatio={.94}
  footer={<View style={{gap:8}}><Button testID="tutorial-next" label={step===2?'今日の気分を残す':'次へ'} disabled={busy} loading={busy} onPress={()=>step===2?void finish(true):setStep(n=>n+1)}/><View style={s.actions}>{step>0&&<Button size="sm" label="戻る" variant="ghost" disabled={busy} onPress={()=>setStep(n=>n-1)}/>}<Button testID="tutorial-skip" size="sm" label={step===2?'おうちを見る':'スキップ'} variant="ghost" disabled={busy} onPress={()=>void finish()}/></View></View>}>
  <View testID={`tutorial-step-${step}`} style={{gap:compact?12:18}}>
   <View style={[s.preview,compact&&{minHeight:112,padding:12,gap:8}]}><FeltDecoration radius={22}/><Text style={s.previewLabel}>{item.label}</Text>
    {step===0?<View style={s.faces}>{[1,2,3,4,5].map(n=><View key={n} style={[s.face,n===4&&s.chosen]}><ConditionFace mood={n} size={39}/>{n===4&&<Icon name="check" size={12} color="#82629F"/>}</View>)}</View>:step===1?<View style={[s.book,compact&&{height:92,gap:9}]}><View style={s.spine}/><Text style={s.bookBrand}>YOKIYOKI</Text><Text style={s.bookTitle}>交換日記</Text><Text style={s.bookHint}>タップして開く</Text></View>:<View style={s.chart}><Text style={s.chartLabel}>気分の推移</Text><Svg width="100%" height={compact?54:88} viewBox="0 0 240 88" accessible={false}>{[20,44,68].map(y=><Line key={y} x1="8" y1={y} x2="232" y2={y} stroke="#DCD2E3"/>)}<Path d="M12 60L48 42L84 55M156 36L192 48L228 24" stroke="#7B5A93" strokeWidth="3" fill="none"/>{[[12,60],[48,42],[84,55],[156,36],[192,48],[228,24]].map(([x,y])=><Circle key={x} cx={x} cy={y} r="4" fill="#7B5A93"/>)}<Rect x="113" y="65" width="13" height="2" fill="#B4A7BE"/></Svg><Text style={s.example}>画面の例 · あなたの記録ではありません</Text></View>}
   </View>
   <View style={{gap:9}}><Text accessibilityRole="header" style={[s.title,compact&&{fontSize:20,lineHeight:28}]}>{item.title}</Text><Text style={[s.copy,compact&&{fontSize:13,lineHeight:22}]}>{item.copy}</Text></View>
   <View style={s.dots} accessible accessibilityLabel={`${step+1} / 3`}>{STEPS.map((_,i)=><View key={i} style={[s.dot,i===step&&s.activeDot]}/>)}</View>
   {!!error&&<Text accessibilityRole="alert" style={s.error}>{error}</Text>}
  </View>
 </BottomSheet>;
}
const s=StyleSheet.create({preview:{minHeight:172,padding:20,borderRadius:22,backgroundColor:'#EBE5F3',alignItems:'center',justifyContent:'center',gap:18},previewLabel:{color:'#756480',fontSize:12,letterSpacing:2},faces:{flexDirection:'row',gap:5},face:{width:39,height:62,alignItems:'center',justifyContent:'center',gap:4,borderRadius:16},chosen:{backgroundColor:'#F9F6FB',borderWidth:1,borderColor:'#B7A0C8'},book:{width:156,height:128,backgroundColor:'#654B7A',borderWidth:1,borderColor:'#B193BE',borderRadius:6,alignItems:'center',justifyContent:'center',gap:13},spine:{position:'absolute',left:0,top:0,bottom:0,width:12,backgroundColor:'#493355'},bookBrand:{fontSize:9,letterSpacing:3,color:'#E7CBA6'},bookTitle:{fontSize:22,color:'#F2D8AE',letterSpacing:3},bookHint:{fontSize:9,color:'#E5D3EC'},chart:{width:'100%',maxWidth:290,backgroundColor:'#FFF9F0',borderRadius:10,padding:10},chartLabel:{fontSize:11,color:'#594968'},example:{fontSize:9,textAlign:'center',color:'#796C80'},title:{fontSize:22,lineHeight:32,fontWeight:'700',color:'#49364F'},copy:{fontSize:14,lineHeight:25,color:'#685B66'},dots:{flexDirection:'row',alignSelf:'center',gap:7},dot:{width:7,height:7,borderRadius:4,backgroundColor:'#D6CBD7'},activeDot:{width:23,backgroundColor:'#7B5A93'},actions:{flexDirection:'row',justifyContent:'center'},error:{fontSize:12,color:'#A34856'}});
