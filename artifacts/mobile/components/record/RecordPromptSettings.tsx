import React, {useEffect,useState} from 'react';
import {Pressable,StyleSheet,Switch,Text,TextInput,View} from 'react-native';
import {useRecordPrompt} from '@/contexts/RecordPromptContext';
import {validPromptTime} from '@/utils/recordPrompt';

export function RecordPromptSettings() {
  const {settings,ready,busy,error,save,retry}=useRecordPrompt();
  const [time,setTime]=useState(settings.time),[enabled,setEnabled]=useState(settings.enabled),[message,setMessage]=useState('');
  useEffect(()=>{setTime(settings.time);setEnabled(settings.enabled);},[settings.time,settings.enabled]);
  const submit=async()=>{
    setMessage('');
    if(!validPromptTime(time.trim())) {setMessage('時刻は 20:00 のように、00:00〜23:59で入力してください。');return;}
    if(await save({...settings,time:time.trim(),enabled,skippedDate:null,snoozedUntil:0})) setMessage('記録する時間を保存しました。');
  };
  return <View testID="record-prompt-settings" style={s.card}>
    <Text style={s.title}>一日をふりかえる時間</Text>
    <Text style={s.copy}>この時刻を過ぎてホームを開くと、まだ記録していない日に大きくご案内します。短いひとことだけでも、休む日があっても大丈夫。</Text>
    <View style={s.row}><Text style={s.label}>ホームでお知らせ</Text><Switch accessibilityLabel="記録の時間のお知らせ" value={enabled} disabled={!ready||busy} onValueChange={value=>{setEnabled(value);setMessage('');}}/></View>
    <View style={s.row}><Text style={s.label}>毎日</Text><TextInput testID="record-prompt-time" accessibilityLabel="記録する時刻（24時間表示）" value={ready?time:''} onChangeText={value=>{setTime(value);setMessage('');}} editable={ready&&!busy} maxLength={5} placeholder={ready?'20:00':'…'} autoCapitalize="none" style={s.input}/><Text style={s.copy}>端末の時刻</Text></View>
    <Pressable testID="record-prompt-save" accessibilityRole="button" disabled={!ready||busy} onPress={submit} style={[s.button,(!ready||busy)&&{opacity:.5}]}><Text style={s.buttonText}>{busy?'保存中…':'時間を保存'}</Text></Pressable>
    {!!message&&<Text accessibilityLiveRegion="polite" style={s.copy}>{message}</Text>}
    {!!error&&<Text accessibilityRole="alert" style={s.error}>{error}</Text>}
    {!ready&&!!error&&<Pressable accessibilityRole="button" onPress={retry} style={s.button}><Text style={s.buttonText}>再読み込み</Text></Pressable>}
    <Text style={s.small}>この端末での設定です。アプリを閉じている間のプッシュ通知は送りません。</Text>
  </View>;
}
const s=StyleSheet.create({card:{padding:20,gap:12,backgroundColor:'#FBF7EB',borderRadius:22,marginBottom:24},title:{fontSize:18,fontWeight:'600',color:'#384A3B'},copy:{fontSize:13,lineHeight:22,color:'#566250'},row:{flexDirection:'row',alignItems:'center',gap:12,justifyContent:'space-between'},label:{fontSize:14,color:'#384A3B',flexShrink:0},input:{minHeight:48,minWidth:90,width:110,flexShrink:0,padding:12,borderWidth:1,borderColor:'#9DA791',borderRadius:12,color:'#384A3B',fontSize:18,textAlign:'center'},button:{minHeight:44,borderRadius:22,paddingHorizontal:18,alignItems:'center',justifyContent:'center',backgroundColor:'#385747'},buttonText:{color:'#FFF6DD',fontSize:14},error:{color:'#8F4350',fontSize:13,lineHeight:20},small:{fontSize:11,lineHeight:18,color:'#66715F'}});
