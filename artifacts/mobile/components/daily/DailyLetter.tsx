import {ZodiacFortune} from './ZodiacFortune';
import React,{useEffect,useMemo,useRef,useState} from 'react';
import {AppState,StyleSheet,Text,View} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useApp} from '@/contexts/AppContext';
import {getTodayDate} from '@/utils/dateUtils';
import {dailyLetterKey} from '@/utils/personalGrowth';
import {BottomSheet} from '@/components/ui/BottomSheet';
import {Icon} from '@/components/ui/Icon';
import {Button} from '@/components/ui/Button';
import {colors} from '@/constants/theme';
import {CheckinDashboard,checkinStyles as cs} from './CheckinDashboard';
import {dailyCheckin} from '@/utils/dailyCheckin';
import {useRouter} from 'expo-router';
import {QuickAffirmationRecord} from '@/components/record/QuickAffirmationRecord';

export function useDailyLetter(owner:string,active:boolean){
 const [date,setDate]=useState(getTodayDate),[dueKey,setDueKey]=useState<string|null>(null);
 const key=dailyLetterKey(owner,date),seen=useRef(new Set<string>());
 useEffect(()=>{if(!active)return;const update=()=>setDate(getTodayDate());update();const timer=setInterval(update,30000),subscription=AppState.addEventListener('change',s=>{if(s==='active')update();});return()=>{clearInterval(timer);subscription.remove();};},[active]);
 useEffect(()=>{let alive=true;setDueKey(null);if(!seen.current.has(key))AsyncStorage.getItem(key).then(value=>{if(alive&&!value)setDueKey(key);}).catch(()=>{if(alive)setDueKey(key);});return()=>{alive=false;};},[key]);
 const markSeen=()=>{seen.current.add(key);setDueKey(null);void AsyncStorage.setItem(key,'seen').catch(()=>{});};
 return {date,due:dueKey===key&&!seen.current.has(key),markSeen};
}
export function DailyLetter({date,onClose,onGrowth}:{date:string;onClose:()=>void;onGrowth:()=>void}){
 const {records,mascotName}=useApp();
 const data=useMemo(()=>dailyCheckin(records,date),[records,date]);
 const router=useRouter();
 return <BottomSheet visible title="今日の便り" subtitle={`${Number(date.slice(5,7))}月${Number(date.slice(8,10))}日 · 気分と生活の振り返り`} onClose={onClose} maxHeightRatio={.94} footer={<Button label={`${mascotName||'よっきー'}に会いに行く`} onPress={onClose} fullWidth/>}>
  <CheckinDashboard data={data}/>
  <QuickAffirmationRecord/>
  <View style={[cs.card,{backgroundColor:'#EAF4EF',borderColor:'#A7C8BA'}]}><Text style={cs.helper}>今日できること</Text><Text style={cs.heading}>{data.action.title}</Text><Text style={cs.copy}>{data.action.detail}</Text>
   {data.action.kind==='rest'?<Button label="この子とひと休みする" onPress={onClose}/>:data.action.kind==='sleep'||data.action.kind==='diary'?<Button label={data.action.kind==='sleep'?'睡眠も記録する':'日記を開く'} variant="outline" onPress={()=>{onClose();router.push('/exchange-diary');}}/>:null}
  </View>
  <View style={cs.card}><View style={s.row}><Icon name="star" color="#74566F" size={20}/><Text style={cs.heading}>今日の占い</Text></View><ZodiacFortune/></View>
  <Button label={`これまでの記録を見る · ${data.leaves.length}日分`} variant="outline" onPress={onGrowth}/>
 </BottomSheet>;
}

const s=StyleSheet.create({row:{flexDirection:'row',alignItems:'center',gap:8},title:{fontSize:15,fontWeight:'600',color:colors.foreground},copy:{fontSize:13,lineHeight:23,color:colors.foreground},helper:{fontSize:11,lineHeight:18,color:colors.mutedForeground}});
