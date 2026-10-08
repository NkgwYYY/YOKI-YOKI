import React from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {useRecordPrompt} from '@/contexts/RecordPromptContext';
import {localPromptDate} from '@/utils/recordPrompt';

export function DailyRecordInvitation({onRecord,onSettings,compact=false}: {onRecord:()=>void;onSettings:()=>void;compact?:boolean}) {
  const {settings,busy,error,save}=useRecordPrompt();
  return <View testID="daily-record-invitation" style={[s.card,compact&&{padding:14,gap:6}]}>
    <Text style={s.eyebrow}>今日の記録</Text>
    <Text style={[s.title,compact&&{fontSize:18,lineHeight:24}]}>今日できた、小さなこと。</Text>
    {!compact&&<Text style={s.copy}>起きた。ごはんを食べた。それだけの日も。{ '\n' }いまの自分を、ひとこと残してみませんか。</Text>}
    <Pressable testID="daily-record-invitation-open" accessibilityRole="button" onPress={onRecord} style={s.primary}><Text style={s.primaryText}>今日を記録する</Text></Pressable>
    <View style={s.row}>
      <Pressable testID="record-prompt-snooze" accessibilityRole="button" disabled={busy} onPress={()=>void save({...settings,snoozedUntil:Date.now()+30*60000})} style={s.link}><Text style={s.linkText}>30分あとで</Text></Pressable>
      <Pressable testID="record-prompt-skip" accessibilityRole="button" disabled={busy} onPress={()=>void save({...settings,skippedDate:localPromptDate(new Date())})} style={s.link}><Text style={s.linkText}>今日は休む</Text></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="記録する時間を設定" onPress={onSettings} style={s.link}><Text style={s.linkText}>時間設定</Text></Pressable>
    </View>
    {!!error&&<Text accessibilityRole="alert" style={s.copy}>{error}</Text>}
  </View>;
}
const s=StyleSheet.create({card:{width:'100%',maxWidth:420,padding:22,gap:10,borderRadius:8,backgroundColor:'#251D31F5',borderWidth:1,borderColor:'#C5AA7C88',shadowColor:'#172F27',shadowOpacity:.25,shadowRadius:24},eyebrow:{fontSize:11,letterSpacing:2,color:'#C5AA7C'},title:{fontSize:23,lineHeight:30,color:'#F3E6D3',fontWeight:'600'},copy:{fontSize:13,lineHeight:22,color:'#CDBAD3'},primary:{minHeight:48,borderRadius:6,backgroundColor:'#655074',alignItems:'center',justifyContent:'center'},primaryText:{fontSize:15,fontWeight:'600',color:'#FFF5DD'},row:{flexDirection:'row',justifyContent:'space-between',gap:4},link:{minHeight:44,justifyContent:'center',paddingHorizontal:3},linkText:{fontSize:11,color:'#CCB9D7'}});
