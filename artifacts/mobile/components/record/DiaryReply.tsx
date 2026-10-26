import {colors} from '@/constants/theme';
import React, {useEffect, useRef, useState} from 'react';
import {ActivityIndicator, Linking, Pressable, StyleSheet, Text, View} from 'react-native';
import {useApp} from '@/contexts/AppContext';
import {useAuth, API_BASE} from '@/contexts/AuthContext';
import {useRoomActivity} from '@/components/room/useRoomActivity';
import {BottomSheet} from '@/components/ui/BottomSheet';
import {Button} from '@/components/ui/Button';
import {hasAiConsent, postAiJson, setAiConsent} from '@/utils/aiConsent';
import type {DiaryPage} from '@/utils/exchangeDiary';

/** Mounted per account + revision. Generation never owns the journal save. */
export function DiaryReply({page}: {page:DiaryPage}) {
  const owner=useAuth().user?.id??'guest', {runDiary}=useApp(), {active}=useRoomActivity();
  const [allowed,setAllowed]=useState<boolean|null>(null),[busy,setBusy]=useState(false);
  const [error,setError]=useState(''),[consent,setConsent]=useState(false),[saving,setSaving]=useState(false);
  const request=useRef<AbortController|null>(null),alive=useRef(true),attempted=useRef(false);
  const current=useRef({active,runDiary}); current.current={active,runDiary};
  useEffect(()=>{alive.current=true;return()=>{alive.current=false;request.current?.abort();};},[]);
  useEffect(()=>{
    let valid=true;
    if(!active){request.current?.abort();return;}
    void hasAiConsent(owner,'diary').then(value=>{if(valid&&alive.current)setAllowed(value);});
    return()=>{valid=false;};
  },[active,owner]);
  const receive=async()=>{
    if(request.current||!page.user?.text.trim()||!current.current.active)return;
    const controller=new AbortController();request.current=controller;setBusy(true);setError('');attempted.current=true;
    try{
      const result=await postAiJson(owner,`${API_BASE}/diary/reply`,{
        text:page.user.text,mood:page.user.mood,date:page.date,mascotName:page.name,
      },{signal:controller.signal,scope:'diary'});
      if(!result.ok||typeof result.data?.reply!=='string'||!result.data.reply.trim())throw Error('今は返事を受け取れませんでした。日記は保存されています。');
      if(!alive.current||controller.signal.aborted||!current.current.active)return;
      if(!await hasAiConsent(owner,'diary'))throw Error('AIへの送信は停止しています。');
      await current.current.runDiary({kind:'reply',date:page.date,id:page.user.submissionId,revision:page.revision,reply:result.data.reply});
    }catch{
      if(alive.current){setError('返事を受け取れませんでした。日記は保存されています。');setAllowed(await hasAiConsent(owner,'diary'));}
    }finally{if(request.current===controller)request.current=null;if(alive.current)setBusy(false);}
  };
  useEffect(()=>{
    if(active&&allowed&&page.replyKind==='pending'&&!attempted.current)void receive();
  },[active,allowed,page.replyKind]);
  const agree=async()=>{
    if(saving)return;setSaving(true);setError('');
    try{await setAiConsent(owner,true,'diary');if(!alive.current)return;setAllowed(true);setConsent(false);void receive();}
    catch{if(alive.current)setError('同意を保存できませんでした。もう一度試してね。');}
    finally{if(alive.current)setSaving(false);}
  };
  const revoke=async()=>{
    if(saving)return;setSaving(true);request.current?.abort();
    try{await setAiConsent(owner,false,'diary');if(alive.current){setAllowed(false);setError('');}}
    catch{if(alive.current)setError('設定を保存できませんでした。もう一度試してね。');}
    finally{if(alive.current)setSaving(false);}
  };
  const ready=page.replyKind==='ai'||page.replyKind==='local';
  const action=()=>{if(allowed)void receive();else setConsent(true);};
  return <View testID="diary-reply" style={s.card}>
    <Text style={s.label}>{ready?`${page.name}が、ページのすみに書いたこと`:`${page.name}からの返事`}</Text>
    {ready?<Text testID={page.replyKind==='ai'?'diary-ai-reply':'diary-local-reply'} selectable style={s.body}>{page.reply}</Text>:<>
      {busy?<View style={s.status}><ActivityIndicator color="#84638E"/><Text accessibilityLiveRegion="polite" style={s.body}>日記を読んで、返事を書いているよ…</Text></View>:<>
        <Text style={s.body}>{error||'日記は、このページに大切にしまったよ。'}</Text>
        <Pressable testID="diary-request-reply" accessibilityRole="button" disabled={allowed===null||saving} onPress={action} style={s.action}><Text style={s.actionText}>{error?'もう一度、返事を受け取る':'内容に合わせた返事をもらう'}</Text></Pressable>
      </>}
    </>}
    {allowed&&<Pressable accessibilityRole="button" disabled={saving} onPress={()=>void revoke()} style={s.settings}><Text style={s.small}>日記のAI返信をオフにする</Text></Pressable>}
    {consent&&<BottomSheet visible title="日記を読んでもらう" onClose={()=>{if(!saving)setConsent(false);}}>
      <Text style={s.disclosure}>この日記の本文・気分・日付・キャラクター名を、YOKI YOKIのサーバー（Replit）を経由してOpenAIへ送り、内容に合った返事を作ります。</Text>
      <Text style={s.disclosure}>同意すると、これから渡す日記にも自動で返事が届きます。過去の日記は、返事を求めたページだけを送ります。日記の保存だけなら、AIへの送信は不要です。</Text>
      <Text style={s.disclosure}>このページ、またはプロフィールの同意設定で、いつでも送信を止められます。送信済みの情報には各サービスの取り扱い方針が適用されます。返事はAIが作るもので、診断や治療は行いません。</Text>
      <Button label="プライバシーポリシー" variant="ghost" onPress={()=>{void Linking.openURL('https://yoki-yoki.replit.app/landing/privacy/').catch(()=>setError('ページを開けませんでした。'));}}/>
      <Button label="OpenAIのプライバシーポリシー" variant="ghost" onPress={()=>{void Linking.openURL('https://openai.com/policies/privacy-policy/').catch(()=>setError('ページを開けませんでした。'));}}/>
      {!!error&&<Text accessibilityRole="alert" style={s.disclosure}>{error}</Text>}
      <Button label="同意して、返事をもらう" disabled={saving} loading={saving} onPress={()=>void agree()}/>
      <Button label="今は日記の保存だけ" variant="outline" disabled={saving} onPress={()=>setConsent(false)}/>
    </BottomSheet>}
  </View>;
}
const s=StyleSheet.create({
 card:{backgroundColor:'#E9E0ED',padding:19,gap:12,borderRadius:10,borderLeftWidth:3,borderColor:'#AA8DB4'},
 label:{fontSize:11,color:'#92709F'},body:{fontSize:14,lineHeight:26,color:'#665070'},status:{flexDirection:'row',alignItems:'center',gap:10,flexWrap:'wrap'},
 action:{minHeight:46,borderWidth:1,borderColor:'#B7A1C0',borderRadius:9,padding:12,justifyContent:'center',alignItems:'center'},actionText:{fontSize:13,color:'#735580'},
 settings:{minHeight:44,justifyContent:'center'},small:{fontSize:11,color:'#816A8A'},disclosure:{fontSize:14,lineHeight:24,color:colors.foreground,marginBottom:14},
});
