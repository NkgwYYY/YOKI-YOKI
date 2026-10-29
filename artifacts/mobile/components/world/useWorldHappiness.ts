import {useEffect,useState} from 'react';
import {Platform} from 'react-native';
import {useApp} from '@/contexts/AppContext';
import {getTodayDate} from '@/utils/dateUtils';
import {readHappiness} from '@/utils/happiness';
import {smokingStatus} from '@/utils/smokingState';

export function useWorldHappiness(active:boolean) {
  const {feedState,visitError,refreshVisits}=useApp();
  const [today,setToday]=useState(getTodayDate);
  const [now,setNow]=useState(Date.now);
  useEffect(()=>{
    if(!active)return;
    setToday(getTodayDate());
    setNow(Date.now());
    const timer=setInterval(()=>{setToday(getTodayDate());setNow(Date.now());},30000);
    return()=>clearInterval(timer);
  },[active]);
  const state=readHappiness(feedState.happiness,today,now);
  return {value:state.value,actions:state.days[today]??[],smoking:smokingStatus(Platform.OS==='ios'?undefined:state.smoking,now),error:visitError??'',retry:()=>void refreshVisits()};
}
