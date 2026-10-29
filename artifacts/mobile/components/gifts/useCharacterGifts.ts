import {useEffect,useRef,useState} from 'react';
import {useApp} from '@/contexts/AppContext';
import {useAuth} from '@/contexts/AuthContext';
import {getTodayDate} from '@/utils/dateUtils';
import {readCharacterGifts,waitingCharacterGift,type CharacterGiftState} from '@/utils/characterGifts';

export function useCharacterGifts(active:boolean) {
  const {feedState,records,runCharacterGifts,isLoading,cloudSynced}=useApp();
  const {user,isSignedIn,isLoading:authLoading}=useAuth();
  const owner=user?.id??'guest',ready=!isLoading&&!authLoading&&(!isSignedIn||cloudSynced);
  const [today,setToday]=useState(getTodayDate),[error,setError]=useState(''),[attempt,setAttempt]=useState(0);
  const runner=useRef(runCharacterGifts);runner.current=runCharacterGifts;
  useEffect(()=>{if(!active)return;setToday(getTodayDate());const timer=setInterval(()=>setToday(getTodayDate()),15000);return()=>clearInterval(timer);},[active]);
  useEffect(()=>{
    if(!active||!ready)return;
    let live=true;setError('');
    void runner.current({kind:'sync'}).catch(()=>{if(live)setError('贈りものの準備を確認できませんでした。');});
    return()=>{live=false;};
  },[active,ready,owner,today,records,attempt]);
  let state:CharacterGiftState|null=null;
  try{state=readCharacterGifts(feedState.characterGifts);}catch{ /* Show the retry control after the failed sync. */ }
  return {state,today,waiting:ready?waitingCharacterGift(state,today):undefined,error,retry:()=>setAttempt(n=>n+1)};
}
