import React from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {useRouter} from 'expo-router';
import {useApp} from '@/contexts/AppContext';
import {Icon,type IconName} from '@/components/ui/Icon';
import {CONDITION_TITLES,conditionLabel,conditionValue,type ConditionKey} from '@/utils/conditionTrends';

/** The person's answers are kept separate from the companion's care gauges. */
export function YourConditionCard({compact=false}:{compact?:boolean}){
 const {getTodayRecord}=useApp(),router=useRouter(),record=getTodayRecord();
 const mood=conditionValue(record,'mood');
 const headline=mood===null?'今日は、どんな調子？':`気分は「${conditionLabel(record,'mood')}」。`;
 return <View testID="home-your-condition" style={[s.card,compact&&s.compact]}>
  <View style={s.top}><Text style={s.eyebrow}>いまのあなた</Text><Pressable testID="home-your-trends" accessibilityRole="button" accessibilityLabel="自分の調子の推移を見る" onPress={()=>router.navigate('/(tabs)/condition')} style={s.trends}><Icon name="bar-chart-2" size={13} color="#826595"/><Text style={s.trendsText}>推移を見る</Text><Icon name="chevron-right" size={12} color="#826595"/></Pressable></View>
  {!compact&&<Text style={s.title}>{headline}{mood!==null&&conditionValue(record,'fatigue')===3?'からだは疲れぎみ。':''}</Text>}
  <View style={s.row}><View style={s.metrics}>{(['mood','fatigue','worry'] as ConditionKey[]).map(key=>{
   const value=conditionValue(record,key),concern=value!==null&&(key==='mood'?value<=2:value===3),good=value!==null&&(key==='mood'?value>=4:value===1);
   return <View key={key} style={s.metric}><Icon name={({mood:'heart',fatigue:'battery',worry:'cloud'} as Record<ConditionKey,IconName>)[key]} size={16} color="#9A7BA8"/><Text style={s.label}>{CONDITION_TITLES[key]}</Text><View style={[s.chip,good&&s.good,concern&&s.concern]}><Text testID={`home-your-${key}`} style={s.value}>{conditionLabel(record,key)}</Text></View></View>;
  })}</View><Pressable testID="home-condition-record" accessibilityRole="button" accessibilityLabel="いまの気分、からだの疲れ、心配ごとを記録する" onPress={()=>router.push('/check-in')} style={s.record}><Icon name="edit-3" size={17} color="#705285"/><Text style={s.recordText}>記録する</Text><Icon name="chevron-right" size={15} color="#705285"/></Pressable></View>
 </View>;
}
const s=StyleSheet.create({card:{backgroundColor:'#FFFCF7F5',borderWidth:1,borderColor:'#FFFFFF',borderRadius:25,paddingHorizontal:17,paddingTop:10,paddingBottom:15,gap:7,shadowColor:'#59466C',shadowOpacity:.10,shadowRadius:16,shadowOffset:{width:0,height:5}},compact:{paddingVertical:6,gap:2},top:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:8},eyebrow:{fontSize:10,letterSpacing:.7,color:'#8C7299'},trends:{minHeight:28,flexDirection:'row',alignItems:'center',gap:4},trendsText:{fontSize:11,color:'#826595'},title:{fontSize:15,lineHeight:23,fontWeight:'600',color:'#50385F',marginBottom:2},row:{flexDirection:'row',alignItems:'center',gap:12},metrics:{flex:1,gap:5},metric:{flexDirection:'row',alignItems:'center',gap:6},label:{fontSize:12,color:'#75677B',flex:1},chip:{paddingHorizontal:8,paddingVertical:3,minWidth:57,borderRadius:12,backgroundColor:'#EEE7F3',alignItems:'center'},good:{backgroundColor:'#E8EDDE'},concern:{backgroundColor:'#F8E5D1'},value:{fontSize:12,lineHeight:18,color:'#67536F'},record:{minHeight:46,paddingHorizontal:12,borderRadius:22,backgroundColor:'#E8DCF0',flexDirection:'row',alignItems:'center',gap:5},recordText:{fontSize:12,color:'#644577',fontWeight:'600'}});
