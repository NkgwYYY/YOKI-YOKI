import React,{useEffect,useRef,useState} from 'react';
import {StyleSheet,Text,View} from 'react-native';
import Svg,{Circle,Path} from 'react-native-svg';
import {useApp} from '@/contexts/AppContext';
import {useAuth} from '@/contexts/AuthContext';
import {colors} from '@/constants/theme';
import {PressScale} from '@/components/ui/PressScale';
import {FeltDecoration} from '@/components/ui/Felt';
import {MOOD_LABELS} from '@/utils/personalGrowth';
export const QUICK_ACTIONS=[{label:'ご飯を食べた',icon:'coffee'},{label:'外に出た',icon:'sun'},{label:'お風呂に入った',icon:'droplet'},{label:'仕事・学校に行った',icon:'briefcase'},{label:'ゆっくり休んだ',icon:'moon'},{label:'その他',icon:'heart'}] as const;
export function QuickAffirmationRecord({onComplete,onSaveStart,onSaveFailed}:{onComplete?:()=>void;onSaveStart?:()=>void;onSaveFailed?:()=>void}){
 const {getTodayRecord,saveRecord,isLoading,cloudSynced,holdLightFlow}=useApp(),auth=useAuth();
 const [saving,setSaving]=useState(false),[error,setError]=useState(''),[saved,setSaved]=useState(false);
 const lock=useRef(false),alive=useRef(true),owner=auth.user?.id??'guest',scope=useRef(owner);scope.current=owner;
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 const blocked=saving||isLoading||auth.isLoading||(auth.isSignedIn&&!cloudSynced);
 const save=async(value:number)=>{
  if(lock.current||blocked)return;
  const account=owner;lock.current=true;setSaving(true);setError('');setSaved(false);onSaveStart?.();holdLightFlow(true);
  try{
   // The transaction merges with the latest disk snapshot, including concurrent diary edits.
   await saveRecord(value,0,[],'',{sleepRecorded:false,moodOnly:true});
   if(alive.current&&scope.current===account){setSaved(true);onComplete?.();}
  }catch{if(alive.current&&scope.current===account){setError('保存できませんでした。気分をもう一度タップしてね。');onSaveFailed?.();}}
  finally{holdLightFlow(false);lock.current=false;if(alive.current&&scope.current===account)setSaving(false);}
 };
 const current=getTodayRecord()?.mood;
 return <View testID="one-tap-mood" style={{gap:10}}>
  <Text style={s.question}>いまの気分は？</Text><Text style={s.helper}>ひとつタップで記録。今日は見るだけでも大丈夫。</Text>
  <View style={{flexDirection:'row',gap:5}}>{[1,2,3,4,5].map(value=><PressScale key={value} testID={`quick-mood-${value}`} accessibilityRole="button" accessibilityLabel={`気分：${MOOD_LABELS[value]}。タップして記録`} accessibilityState={{selected:current===value,disabled:blocked}} disabled={blocked} onPress={()=>void save(value)} style={[s.mood,current===value&&s.selected]}>
   <FeltDecoration radius={18}/><Svg width="34" height="34" viewBox="0 0 40 40" accessible={false}><Circle cx="20" cy="20" r="17" fill={['','#D8E0EA','#E3DDEB','#EDE3BF','#E1EACB','#F1D8CF'][value]}/><Circle cx="14" cy="17" r="1.5" fill="#68503F"/><Circle cx="26" cy="17" r="1.5" fill="#68503F"/><Path d={value<=2?'M14 27Q20 21 26 27':value===3?'M15 25H25':'M13 23Q20 31 27 23'} stroke="#68503F" strokeWidth="1.8" strokeLinecap="round" fill="none"/></Svg>
   <Text style={s.label}>{MOOD_LABELS[value]}</Text>
  </PressScale>)}</View>
  <Text accessibilityLiveRegion="polite" style={s.helper}>{error|| (saving?'保存中…':saved?'今日の気分を保存しました。':'後から変えても、日記の文章はそのまま残ります。')}</Text>
 </View>;
}
const s=StyleSheet.create({question:{fontSize:16,fontWeight:'600',color:colors.foreground},helper:{fontSize:11,color:colors.mutedForeground,lineHeight:18},mood:{flex:1,minHeight:76,alignItems:'center',justifyContent:'center',gap:5,backgroundColor:'#FFF9EC',borderWidth:1,borderColor:colors.borderStrong,borderRadius:18},selected:{backgroundColor:'#BFE0D3',borderColor:'#176F63',borderWidth:2},label:{fontSize:11,fontWeight:'600',color:'#233E39'}});
