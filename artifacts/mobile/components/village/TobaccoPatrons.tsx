import React, {useEffect, useRef, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {FeltPressable as Pressable} from '@/components/ui/FeltPressable';
import {useApp} from '@/contexts/AppContext';
import {useAuth} from '@/contexts/AuthContext';
import {getTodayDate} from '@/utils/dateUtils';
import {canReceiveSmokingGift, readSmoking, type TobaccoPatron} from '@/utils/smokingState';
import {SmokingResident} from './SmokingResident';

const PATRONS = [
  {id:'egg',stage:'egg',label:'たまごの村人',x:.72,y:.555,size:.13,pace:5300},
  {id:'mofumofu',stage:'odango',label:'モフモフの村人',x:.69,y:.68,size:.16,pace:7100},
] as const;
const CHAT = {
  egg:['この路地、静かで落ち着くね。ちょっとひと休み。','あそこの灯り、あったかい色だよね。','さっきラーメン屋に寄ってきたんだ。おなかいっぱい。'],
  mofumofu:['今日は何もしないで、のんびりしてるんだ。','風が気持ちいいね。もう少しここにいようかな。','このあとは、おうちでゆっくりしようかな。'],
};
export function TobaccoPatrons({width,height,active,reduceMotion,clearTop,viewportLeft,viewportWidth,onTalk}: {
  width:number;height:number;active:boolean;reduceMotion:boolean;clearTop:number;viewportLeft:number;viewportWidth:number;onTalk:()=>void;
}) {
  const {feedState,runSmoking}=useApp();
  const {user}=useAuth(),ownerKey=user?.id??'guest';
  const today=getTodayDate(),state=readSmoking(feedState.happiness?.smoking);
  const [dialog,setDialog]=useState<{patron:TobaccoPatron;text:string;offered:boolean}|null>(null);
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  const turns=useRef({egg:0,mofumofu:0}),pending=useRef(false),alive=useRef(true),owner=useRef(ownerKey);
  owner.current=ownerKey;
  useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
  useEffect(()=>{setDialog(null);setError('');setBusy(false);pending.current=false;},[ownerKey,today]);
  useEffect(()=>{if(!active&&!pending.current)setDialog(null);},[active]);
  useEffect(()=>{
    if(!dialog||dialog.offered||busy)return;
    const timer=setTimeout(()=>setDialog(null),8000);return()=>clearTimeout(timer);
  },[dialog,busy]);
  const talk=(patron:TobaccoPatron)=>{
    if(pending.current)return;
    onTalk();setError('');
    const offered=canReceiveSmokingGift(state,today,patron);
    setDialog({patron,offered,text:offered?'よかったら、1本やろうか？ 今すぐ吸わなくてもいいよ。':CHAT[patron][turns.current[patron]++%CHAT[patron].length]});
  };
  const receive=async()=>{
    if(!dialog?.offered||pending.current)return;
    const scope=ownerKey,patron=dialog.patron;
    pending.current=true;setBusy(true);setError('');
    try{
      const saved=await runSmoking({kind:'gift',patron});
      if(!alive.current||owner.current!==scope)return;
      setDialog({patron,offered:false,text:saved.state.giftDays.includes(today)?'1本受け取ったよ。次の一服のときに使えるね。':'今日はもう手持ちがないみたい。またお話ししよう。'});
    }catch{if(alive.current&&owner.current===scope)setError('保存できませんでした。もう一度受け取るを押してね。');}
    finally{if(alive.current&&owner.current===scope){pending.current=false;setBusy(false);}}
  };
  const bubbleWidth=Math.min(272,viewportWidth-24);
  return <>
    {PATRONS.map(p=><React.Fragment key={p.id}>
      <SmokingResident stage={p.stage} width={width} height={height} active={active} reduceMotion={reduceMotion} x={p.x} y={p.y} relativeSize={p.size} pace={p.pace} testID={`tobacco-patron-${p.id}`}/>
      <Pressable testID={`talk-tobacco-${p.id}`} accessibilityRole="button" accessibilityLabel={`喫煙所の${p.label}と話す`} disabled={!active||busy} onPress={()=>talk(p.id)} style={{position:'absolute',left:width*(p.x-p.size/2),top:height*p.y-width*p.size*.91,width:width*p.size,height:width*p.size,minWidth:44,minHeight:44,zIndex:900}}/>
    </React.Fragment>)}
    {dialog&&active&&<View testID="tobacco-patron-dialogue" style={[s.bubble,{width:bubbleWidth,left:viewportLeft+viewportWidth-bubbleWidth-12,top:clearTop+8}]}>
      <View style={s.heading}><Text style={s.label}>{PATRONS.find(p=>p.id===dialog.patron)!.label}</Text><Pressable accessibilityRole="button" accessibilityLabel="村人の話を閉じる" disabled={busy} onPress={()=>setDialog(null)} hitSlop={10}><Text style={s.close}>×</Text></Pressable></View>
      <Text accessibilityLiveRegion="polite" style={s.copy}>{dialog.text}</Text>
      {!!error&&<Text accessibilityRole="alert" style={s.error}>{error}</Text>}
      {dialog.offered&&<View style={s.buttons}>
        <Pressable accessibilityRole="button" disabled={busy} onPress={()=>setDialog({patron:dialog.patron,offered:false,text:'そっか。じゃあ、ここでのんびりしていこう。'})} style={[s.button,s.decline]}><Text style={s.declineText}>遠慮しておく</Text></Pressable>
        <Pressable testID="tobacco-gift-accept" accessibilityRole="button" disabled={busy} onPress={()=>void receive()} style={s.button}><Text style={s.buttonText}>{busy?'受け取り中…':'1本受け取る'}</Text></Pressable>
      </View>}
    </View>}
  </>;
}
const s=StyleSheet.create({
  bubble:{position:'absolute',zIndex:980,borderRadius:17,backgroundColor:'#FFF8EA',borderWidth:1,borderColor:'#D8BF9B',padding:11,gap:5},
  heading:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},label:{fontSize:11,color:'#8D6B50'},close:{fontSize:18,lineHeight:19,color:'#8D6B50'},copy:{fontSize:13,lineHeight:20,color:'#48382E'},error:{fontSize:12,lineHeight:18,color:'#964C48'},
  buttons:{flexDirection:'row',gap:8},button:{flex:1,minHeight:44,alignItems:'center',justifyContent:'center',borderRadius:10,backgroundColor:'#645077'},decline:{backgroundColor:'#ECE2D4'},buttonText:{fontSize:12,color:'#FFF9EE'},declineText:{fontSize:12,color:'#6B594C'},
});
