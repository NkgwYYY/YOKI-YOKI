import {useEffect,useRef,useState} from 'react';
import {Platform} from 'react-native';
import {useApp} from '@/contexts/AppContext';
import {useAuth} from '@/contexts/AuthContext';
import {SMOKE_LIMIT_MS,SMOKE_STEP_MS,type SmokeReceipt} from '@/utils/smokingState';
import type {SmokingOperation} from '@/utils/smoking';

/** Count only the time the scene is visible; never keep smoking in a closed app. */
export function useSmoking(active:boolean){
 const {runSmoking,isLoading,cloudSynced}=useApp();
 const {user,isSignedIn,isLoading:authLoading}=useAuth();
 const owner=user?.id??'guest',ready=Platform.OS!=='ios'&&!isLoading&&!authLoading&&(!isSignedIn||cloudSynced);
 const [elapsedMs,setElapsed]=useState(0),[running,setRunning]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[receipt,setReceipt]=useState<SmokeReceipt|null>(null);
 const alive=useRef(true),visible=useRef(active);visible.current=active;
 const session=useRef<{id:string;clock:number;elapsed:number;queued:number;stoppedAt:number;save:typeof runSmoking}|null>(null);
 const pending=useRef<{op:SmokingOperation;save:typeof runSmoking}|null>(null),starting=useRef(false),generation=useRef(0);
 const elapsed=()=>{const s=session.current;return s?Math.min(SMOKE_LIMIT_MS,s.elapsed+(s.clock?Math.max(0,Date.now()-s.clock):0)):0;};
 const pause=()=>{const s=session.current;if(s?.clock){s.elapsed=elapsed();s.stoppedAt=Date.now();s.clock=0;}if(alive.current)setRunning(false);};
 const finish=async()=>{
  const s=session.current;if(!s)return true;
  const g=generation.current;
  pause();const op:SmokingOperation={kind:'finish',id:s.id,elapsedMs:s.elapsed,at:s.stoppedAt};pending.current={op,save:s.save};
  if(alive.current){setBusy(true);setElapsed(s.elapsed);}
  try{const result=await s.save(op);if(session.current===s){session.current=null;pending.current=null;if(alive.current){setReceipt(result.receipt);setError('');}}return true;}
  catch{if(alive.current&&session.current===s)setError('保存できませんでした。喫煙は止めています。もう一度保存してね。');return false;}
  finally{if(alive.current&&g===generation.current)setBusy(false);}
 };
 const finishRef=useRef(finish);finishRef.current=finish;
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;void finishRef.current();};},[]);
 useEffect(()=>{
  generation.current++;session.current=null;pending.current=null;starting.current=false;setRunning(false);setBusy(false);setElapsed(0);setReceipt(null);setError('');
 },[owner]);
 // On reopen, close any abandoned session at its last confirmed checkpoint.
 useEffect(()=>{
  if(!ready||session.current||starting.current)return;
  const g=generation.current;
  void runSmoking({kind:'recover'}).catch(()=>{if(alive.current&&generation.current===g)setError('前の一服を確認できませんでした。もう一度お試しください。');});
 },[owner,ready]);
 useEffect(()=>{
  if(!active){void finishRef.current();return;}
  const timer=setInterval(()=>{
   const s=session.current;if(!s?.clock)return;
   const ms=elapsed();setElapsed(ms);
   if(ms>=SMOKE_LIMIT_MS){void finishRef.current();return;}
   const step=Math.floor(ms/SMOKE_STEP_MS);
   if(step>s.queued){s.queued=step;const op:SmokingOperation={kind:'progress',id:s.id,elapsedMs:ms,at:Date.now()};
    void s.save(op).then(result=>{if(alive.current&&session.current===s)setReceipt(result.state.active??result.receipt);}).catch(()=>{if(session.current===s){pause();pending.current={op:{kind:'finish',id:s.id,elapsedMs:s.elapsed,at:s.stoppedAt},save:s.save};if(alive.current)setError('保存できませんでした。喫煙は止めています。もう一度保存してね。');}});
   }
  },250);
  return()=>clearInterval(timer);
 },[active]);
 const start=async()=>{
  if(starting.current||session.current||!visible.current||!ready)return false;
  starting.current=true;setBusy(true);setError('');setReceipt(null);setElapsed(0);
  const g=generation.current,id=`smoke-${Date.now()}-${Math.random().toString(36).slice(2,9)}`,save=runSmoking;
  try{
   await save({kind:'recover'});
   const result=await save({kind:'start',id});
   if(!result.state.active||result.state.active.id!==id)throw Error('Start failed');
   if(!alive.current||generation.current!==g||!visible.current){await save({kind:'finish',id,elapsedMs:0});return false;}
   session.current={id,clock:Date.now(),elapsed:0,queued:0,stoppedAt:0,save};setRunning(true);return true;
  }catch{if(alive.current&&generation.current===g)setError('一服を始められませんでした。もう一度お試しください。');return false;}
  finally{if(generation.current===g){starting.current=false;if(alive.current)setBusy(false);}}
 };
 const retry=async()=>{
  if(session.current)return finish();
  if(pending.current){const p=pending.current;try{await p.save(p.op);pending.current=null;setError('');return true;}catch{return false;}}
  return start();
 };
 return {start,finish,retry,elapsedMs,running,busy,error,receipt};
}
