/** Isolated browser fixture. Not imported by app routes or production bundles. */
import React, {useEffect, useMemo, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {View, Text} from 'react-native';
import {useSharedValue} from 'react-native-reanimated';
import {StableSceneViewport} from '../components/world/StableSceneViewport';
import {VolumeEgg} from '../components/world/VolumeEgg';
import {fitHomeOverview, homeResidentSize} from '../utils/homeView';
import type {DailyAdBinding} from '../components/ads/DailyAdPlacements';
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
let finishBannerLoad = () => {};
function SyntheticBanner({onLoaded}: {onLoaded: () => void}) {
  useEffect(()=>{mounts++;document.getElementById('mounts')!.textContent=String(mounts);finishBannerLoad=onLoaded;return()=>{finishBannerLoad=()=>{};};},[onLoaded]);
  return <View style={{width:320,height:50,backgroundColor:'#405269',justifyContent:'center'}}><Text style={{color:'white',textAlign:'center'}}>テスト用バナー・本物の広告ではありません</Text></View>;
}
function Scene() {
  const [size,setSize]=useState({width:390,height:760});
  const zero=useSharedValue(0);
  const frame=fitHomeOverview(size.width,size.height);
  const residentSize=homeResidentSize(frame,size.height,1);
  return <View style={{flex:1,backgroundColor:'#D8E7FF'}} onLayout={e=>setSize(e.nativeEvent.layout)}>
    <Text style={{padding:16}}>固定カメラの描画領域</Text>
    <View testID="fixture-resident" style={{position:'absolute',left:(size.width-residentSize)/2,top:size.height*.48,width:residentSize,height:residentSize}}>
      <VolumeEgg size={residentSize} rx={zero} ry={zero} rz={zero} blink={zero} mood="normal" reduceMotion/>
    </View>
  </View>;
}
function App() {
  const [placement,setPlacement]=useState<DailyAdPlacement>('home');
  const [interacting,setInteracting]=useState(false);
  const [obscured,setObscured]=useState(false);
  const [keyboardOpen,setKeyboardOpen]=useState(false);
  const [screenActive,setScreenActive]=useState(true);
  const [foreground,setForeground]=useState(true);
  const [railHeight,setRailHeight]=useState(0);
  const [width,setWidth]=useState(390);
  const height=760;
  const binding=useMemo<DailyAdBinding>(()=>({...service,renderBanner:({onLoaded})=> <SyntheticBanner onLoaded={onLoaded}/>,
    openPrivacy:async()=>{},onBannerError:service.bannerError}),[]);
  const env={width,height,screenActive,foreground,obscured,interacting,keyboardOpen};
  useEffect(()=>{void service.refresh();},[]);
  return <DailyAdProvider binding={binding}><View style={{backgroundColor:'#211b30',padding:16,gap:8}}>
    <Text style={{color:'#ffce8a'}}>隔離テスト専用・合成広告／合成報酬。本番データには接続しません。</Text>
    <div>バナー生成回数: <span id="mounts">0</span></div>
    <div>{(['home','street','meal'] as const).map(p=><button key={p} onClick={()=>setPlacement(p)}>{p}</button>)}</div>
    <div>{['verified','closed','error','pending'].map(m=><button key={m} onClick={()=>{mode=m;}}>{m}</button>)}</div>
    <button onClick={()=>finishBannerLoad()}>load banner</button>
    <button onClick={()=>service.bannerError()}>fail banner</button>
    <button onClick={()=>void service.refresh()}>refresh service</button>
    <button onClick={()=>setWidth(w=>w===390?320:390)}>toggle compact</button>
    <button onClick={()=>{pass=!pass;void service.refresh();}}>toggle pass</button>
    <button onClick={()=>setInteracting(v=>!v)}>toggle movement</button>
    <button onClick={()=>setObscured(v=>!v)}>toggle overlay</button>
    <button onClick={()=>setKeyboardOpen(v=>!v)}>toggle keyboard</button>
    <button onClick={()=>setScreenActive(v=>!v)}>toggle screen</button>
    <button onClick={()=>setForeground(v=>!v)}>toggle foreground</button>
    <button onClick={()=>{fail=!fail;void service.refresh();}}>toggle offline</button>
    <button onClick={()=>{for(const r of reservations.values())confirmed.add(r.id);void service.refresh();}}>deliver delayed SSV</button>
    <button onClick={()=>{current=false;void service.refresh();}}>switch account</button>
    <View testID="fixture-home" style={{width,height,backgroundColor:'#243A33'}}>
      <StableSceneViewport rail={<View onLayout={event=>setRailHeight(event.nativeEvent.layout.height)}><DailyAdRail placement={placement} environment={env} bottomInset={70}/></View>}><Scene/></StableSceneViewport>
      <View testID="fixture-care" style={{position:'absolute',bottom:Math.max(70,railHeight)+12,left:50,right:50,height:58,backgroundColor:'#FFF6E4'}}><Text>ごはん　おふろ</Text></View>
      <View testID="fixture-dock" style={{position:'absolute',bottom:12,left:10,right:10,height:48,backgroundColor:'#FFF6E4'}}><Text>おうち　日記　おはなし　歩み</Text></View>
    </View>
    <DailyAdRewardButton placement={placement} environment={env}/>
  </View></DailyAdProvider>;
}
createRoot(document.getElementById('root')!).render(<App/>);
