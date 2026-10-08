import {useEffect,useState} from 'react';
import {useApp} from '@/contexts/AppContext';
import {useAuth} from '@/contexts/AuthContext';
import {getTodayDate} from '@/utils/dateUtils';
import {readHappiness} from '@/utils/happiness';

export function useWorldHappiness(active:boolean) {
  const {feedState,awardHappiness,isLoading,cloudSynced}=useApp();
  const {isSignedIn,isLoading:authLoading}=useAuth();
  const [today,setToday]=useState(getTodayDate);
  const [error,setError]=useState('');
  const [retry,setRetry]=useState(0);
  const ready=!isLoading&&!authLoading&&(!isSignedIn||cloudSynced);
  useEffect(()=>{
    if(!active)return;
    setToday(getTodayDate());
    const timer=setInterval(()=>setToday(getTodayDate()),30000);
    return()=>clearInterval(timer);
  },[active]);
  const state=readHappiness(feedState.happiness,today);
  const visited=state.days[today]?.includes('visit')??false;
  useEffect(()=>{
    if(!active||!ready||visited)return;
    let current=true;
    void awardHappiness('visit').then(()=>{if(current)setError('');},()=>{if(current)setError('うれしい気持ちを保存できませんでした。もう一度お試しください。');});
    return()=>{current=false;};
  },[active,ready,visited,today,awardHappiness,retry]);
  return {value:state.value,actions:state.days[today]??[],error,retry:()=>setRetry(n=>n+1)};
}
