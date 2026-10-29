import {useCallback,useEffect,useRef,useState} from 'react';
import {useApp} from '@/contexts/AppContext';
import {readHousekeeping,roomDirt,type CleaningTool} from '@/utils/housekeeping';

export function useHousekeeping(active:boolean){
  const {feedState,cleanRoom}=useApp();
  const [now,setNow]=useState(Date.now),[error,setError]=useState(''),[retry,setRetry]=useState(0);
  const pending=useRef(new Map<CleaningTool,Set<number>>());
  const timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
  const alive=useRef(true),save=useRef(cleanRoom);save.current=cleanRoom;
  useEffect(()=>{clearTimeout(timer.current);pending.current=new Map();},[cleanRoom]);
  useEffect(()=>{alive.current=true;return()=>{alive.current=false;clearTimeout(timer.current);};},[]);
  useEffect(()=>{
    if(!active)return;
    setNow(Date.now());const clock=setInterval(()=>setNow(Date.now()),60000);
    return()=>clearInterval(clock);
  },[active]);
  useEffect(()=>{
    if(!active||feedState.housekeeping)return;
    let current=true;
    void cleanRoom({kind:'init'}).catch(()=>{if(current)setError('部屋の状態を保存できませんでした。もう一度お試しください。');});
    return()=>{current=false;};
  },[active,!!feedState.housekeeping,cleanRoom,retry]);
  const house=readHousekeeping(feedState.housekeeping,now),dirt=roomDirt(house,now);
  const latest=useRef(dirt);latest.current=dirt;
  const flush=useCallback(async()=>{
    const batch=pending.current;pending.current=new Map();timer.current=undefined;
    try{
      for(const [tool,spots] of batch)await save.current({kind:'clean',tool,spots:[...spots]});
      if(alive.current){setNow(Date.now());setError('');}
    }catch{if(alive.current)setError('掃除を保存できませんでした。もう一度こすると再開できます。');}
  },[]);
  const clean=useCallback((spots:number[],tool:CleaningTool)=>{
    const dirty=spots.filter(i=>latest.current[i]>0);
    if(!dirty.length)return;
    const ids=pending.current.get(tool)??new Set<number>();dirty.forEach(i=>ids.add(i));pending.current.set(tool,ids);
    if(!timer.current)timer.current=setTimeout(()=>void flush(),350);
  },[flush]);
  // Finish a stroke before leaving a tab; do not leave pending writes behind.
  useEffect(()=>{if(!active&&pending.current.size){clearTimeout(timer.current);void flush();}},[active,flush]);
  return {house,dirt,clean,error,retry:()=>{setError('');setRetry(n=>n+1);},dirty:Math.round(dirt.reduce((a,b)=>a+b,0)/dirt.length*100)};
}
