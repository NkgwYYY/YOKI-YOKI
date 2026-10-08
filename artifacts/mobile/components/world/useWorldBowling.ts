import {useCallback,useEffect,useRef,useState} from 'react';
import {useSharedValue,type SharedValue} from 'react-native-reanimated';
import {useApp} from '@/contexts/AppContext';
import {getTodayDate} from '@/utils/dateUtils';
import {bowlingPlayedToday,canStartWorldBowling,simulateBowling,worldPinPositions,type BowlingFrame,type WorldBowlingInput} from '@/utils/bowling';
import type {WorldMapId} from '@/utils/worldMaps';

export type WorldBowlingMotion={frames:SharedValue<BowlingFrame[]>;index:SharedValue<number>;running:SharedValue<boolean>};
const readyFrame=():BowlingFrame=>({x:.455,y:.715,pins:worldPinPositions()});
export function useWorldBowling(map:WorldMapId,active:boolean){
  const {bowlingState,playBowling}=useApp();
  const frames=useSharedValue<BowlingFrame[]>([readyFrame()]);
  const index=useSharedValue(0),running=useSharedValue(false);
  const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
  const [today,setToday]=useState(getTodayDate);
  const lock=useRef(false),generation=useRef(0),resultText=useRef('');
  const latest=useRef({map,bowlingState,playBowling});latest.current={map,bowlingState,playBowling};
  useEffect(()=>{if(!active||busy)return;setToday(getTodayDate());const timer=setInterval(()=>setToday(getTodayDate()),30000);return()=>clearInterval(timer);},[active,busy]);
  useEffect(()=>{
    generation.current++;running.value=false;lock.current=false;setBusy(false);setMessage('');
    const receipt=Object.values(latest.current.bowlingState.plays).find(p=>p.date>=today);
    const frame=receipt?.world?.layout==='garden-long'?simulateBowling(receipt).frames.at(-1)!:readyFrame();
    // Earlier saved games used a different lane; keep their earned result and used day.
    if(receipt&&receipt.world?.layout!=='garden-long')frame.pins=frame.pins.map((pin,i)=>({...pin,down:i<receipt.pins,rotation:i<receipt.pins?84:0}));
    frames.value=[frame];index.value=0;
    return()=>{generation.current++;running.value=false;};
  },[map,today,frames,index,running]);
  const roll=useCallback(async(world:WorldBowlingInput)=>{
    if(latest.current.map!=='bowling'||lock.current)return;
    const date=getTodayDate();
    if(bowlingPlayedToday(latest.current.bowlingState,date)){setMessage('今日の一投はおしまい。また明日、ころころしよう。');return;}
    if(!canStartWorldBowling(world)){setMessage('手前のスタートラインの後ろから、ピンに向かって投げてね。');return;}
    lock.current=true;setBusy(true);setMessage('');
    const current=generation.current;
    try{
      const input={aim:0,power:.8,world};
      const result=await latest.current.playBowling(`world-${Date.now()}-${Math.random().toString(36).slice(2,10)}`,input);
      if(current!==generation.current)return;
      if(!result.accepted){setMessage('今日の一投はおしまい。また明日、遊ぼう。');lock.current=false;setBusy(false);return;}
      const simulation=simulateBowling(result.receipt);
      resultText.current=`${result.receipt.pins===10?'ストライク！':`${result.receipt.pins}本たおれた！`} ＋${result.receipt.earned} pt　また明日、遊ぼう。`;
      frames.value=simulation.frames;index.value=0;running.value=true;
    }catch{if(current===generation.current){lock.current=false;setBusy(false);setMessage('保存できませんでした。通信や空き容量を確認して、もう一度スワイプしてね。');}}
  },[frames,index,running]);
  const finish=useCallback(()=>{lock.current=false;setBusy(false);setMessage(resultText.current);},[]);
  const receipt=Object.values(bowlingState.plays).find(p=>p.date>=today);
  return {motion:{frames,index,running},roll,finish,busy,message:message||(busy?'ころころ…':receipt?`今日は${receipt.pins}本。＋${receipt.earned} pt　また明日、遊ぼう。`:'奥のピンへ、狙って強めにスワイプ。1日1投・1本5 pt')};
}
