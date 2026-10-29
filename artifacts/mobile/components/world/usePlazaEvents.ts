import {useEffect,useRef,useState} from 'react';
import {useApp} from '@/contexts/AppContext';
import {useAuth} from '@/contexts/AuthContext';
import type {PlazaOperation} from '@/utils/plazaEvents';

export function usePlazaEvents(visible:boolean){
 const {feedState,runPlazaEvent,isLoading,cloudSynced}=useApp();
 const {user,isSignedIn,isLoading:authLoading}=useAuth();
 const ready=!isLoading&&!authLoading&&(!isSignedIn||cloudSynced);
 const account=user?.id??'guest';
 const owner=useRef({account});if(owner.current.account!==account)owner.current={account};
 const scope=owner.current,alive=useRef(true),pending=useRef<PlazaOperation|null>(null);
 const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [animating,setAnimating]=useState(false);
 const timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
 const state=feedState.plazaEvents,current=ready?state?.current:undefined;
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;clearTimeout(timer.current);};},[]);
 useEffect(()=>{pending.current=null;setBusy(false);setError('');setOpen(false);setAnimating(false);clearTimeout(timer.current);},[scope]);
 useEffect(()=>{if(!visible){setOpen(false);setAnimating(false);clearTimeout(timer.current);}},[visible]);
 const execute=async(op:PlazaOperation)=>{
  if(!ready||pending.current)return false;
  pending.current=op;setBusy(true);setError('');
  try{await runPlazaEvent(op);return alive.current&&owner.current===scope;}
  catch(e){if(alive.current&&owner.current===scope)setError(e instanceof Error?e.message:'保存できませんでした。もう一度お試しください。');return false;}
  finally{if(alive.current&&owner.current===scope){pending.current=null;setBusy(false);}}
 };
 // One scheduled check, only while the plaza is on screen. No permanent polling.
 useEffect(()=>{
  if(!visible||!ready||current||error)return;
  let cancelled=false;
  let id:ReturnType<typeof setTimeout>;
  const check=async()=>{await execute({kind:'visit'});if(!cancelled)id=setTimeout(check,60000);};
  const delay=state?.seen.length===4?60000:Math.max(0,(state?.nextAt??Date.now())-Date.now());
  id=setTimeout(()=>{void check();},Math.min(delay,60000));
  return()=>{cancelled=true;clearTimeout(id);};
 },[visible,ready,current,state,scope,error]);
 const choose=async(choice:'accept'|'decline',reduceMotion:boolean)=>{
  if(!current||pending.current)return;
  const ok=await execute({kind:'resolve',id:current.id,choice});
  if(ok&&choice==='accept'&&!reduceMotion){setAnimating(true);timer.current=setTimeout(()=>setAnimating(false),1800);}
 };
 const close=async()=>{
  if(pending.current)return;
  if(current?.outcome){if(!await execute({kind:'leave',id:current.id}))return;}
  setOpen(false);setAnimating(false);clearTimeout(timer.current);
 };
 return {current,open,busy,error,animating,talk:()=>{setError('');setOpen(true);},choose,close,retry:()=>{setError('');void execute({kind:'visit'});}};
}
