/** Isolated browser fixture. Not imported by app routes or production bundles. */
import React, {useEffect, useMemo, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {View, Text, useWindowDimensions} from 'react-native';
import {DailyAdProvider, DailyAdRail, DailyAdRewardButton} from '../components/ads/DailyAdPlacements';
import {createDailyAds} from '../utils/community/dailyAds';
import type {DailyAdPlacement} from '../utils/dailyAdPlacements';

let mounts=0, used=0, pass=false, mode='verified', fail=false, current=true;
const reservations=new Map<string, {id:string;playerId:string;mode:'ad'|'pass';state:string}>();
const confirmed=new Set<string>();
const service=createDailyAds({
  sessionKey:'isolated-browser-test',
  current:()=>current,
  eligibility:()=>({ready:true,rewarded:true,banner:true,pass:false}),
  collect:async()=>{if(fail)throw Error('synthetic offline');return {gained:0,remaining:3-used,day:'2026-10-18',confirmedIds:[...confirmed]};},
  pass:async()=>pass,
  reserve:async(receipt,kind)=>{
    if(!reservations.has(receipt)){if(used>=3)throw Error('cap');used++;reservations.set(receipt,{id:crypto.randomUUID(),playerId:'synthetic-player',mode:kind,state:'reserved'});}
    return reservations.get(receipt)!;
  },
  present:async reservation=>{
    if(mode==='error')throw Error('synthetic ad error');
    if(mode==='closed')return false;
    if(mode==='verified')confirmed.add(reservation.id);
    return true;
  },
  credited:id=>confirmed.has(id),uuid:()=>crypto.randomUUID(),pause:async()=>{},
});
function SyntheticBanner() {
  useEffect(()=>{mounts++;document.getElementById('mounts')!.textContent=String(mounts);},[]);
  return <View style={{width:320,height:50,backgroundColor:'#405269',justifyContent:'center'}}><Text style={{color:'white',textAlign:'center'}}>テスト用バナー・本物の広告ではありません</Text></View>;
}
function App() {
  const [placement,setPlacement]=useState<DailyAdPlacement>('home');
  const [interacting,setInteracting]=useState(false);
  const [obscured,setObscured]=useState(false);
  const {width,height}=useWindowDimensions();
  const binding=useMemo(()=>({...service,renderBanner:()=> <SyntheticBanner/>,
    openPrivacy:async()=>{},onBannerError:service.bannerError}),[]);
  const env={width,height,screenActive:true,foreground:true,obscured,interacting,keyboardOpen:false};
  useEffect(()=>{void service.refresh();},[]);
  return <DailyAdProvider binding={binding}><View style={{minHeight:height,backgroundColor:'#211b30',padding:16,gap:8}}>
    <Text style={{color:'#ffce8a'}}>隔離テスト専用・合成広告／合成報酬。本番データには接続しません。</Text>
    <div>バナー生成回数: <span id="mounts">0</span></div>
    <div>{(['home','street','meal'] as const).map(p=><button key={p} onClick={()=>setPlacement(p)}>{p}</button>)}</div>
    <div>{['verified','closed','error','pending'].map(m=><button key={m} onClick={()=>{mode=m;}}>{m}</button>)}</div>
    <button onClick={()=>{pass=!pass;void service.refresh();}}>toggle pass</button>
    <button onClick={()=>setInteracting(v=>!v)}>toggle movement</button>
    <button onClick={()=>setObscured(v=>!v)}>toggle overlay</button>
    <button onClick={()=>{fail=!fail;void service.refresh();}}>toggle offline</button>
    <button onClick={()=>{for(const r of reservations.values())confirmed.add(r.id);void service.refresh();}}>deliver delayed SSV</button>
    <button onClick={()=>{current=false;void service.refresh();}}>switch account</button>
    <View style={{minHeight:100}}><Text style={{color:'white'}}>操作領域（広告とは別領域）</Text></View>
    <DailyAdRail placement={placement} environment={env}/>
    <DailyAdRewardButton placement={placement} environment={env}/>
  </View></DailyAdProvider>;
}
createRoot(document.getElementById('root')!).render(<App/>);
