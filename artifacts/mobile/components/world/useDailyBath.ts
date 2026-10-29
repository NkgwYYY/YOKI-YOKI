import {useEffect,useState} from 'react';
import {useApp} from '@/contexts/AppContext';
import {useAppActivity} from '@/components/room/useRoomActivity';
import {hasBathedToday} from '@/utils/housekeeping';

/** Refresh at local midnight and whenever the app returns to the foreground. */
export function useDailyBath(){
  const {feedState}=useApp();
  const {active}=useAppActivity();
  const [now,setNow]=useState(Date.now);
  useEffect(()=>{if(active)setNow(Date.now());},[active]);
  useEffect(()=>{
    if(!active)return;
    const next=new Date(now);next.setHours(24,0,0,30);
    const timer=setTimeout(()=>setNow(Date.now()),Math.max(30,next.getTime()-Date.now()));
    return()=>clearTimeout(timer);
  },[active,now]);
  return hasBathedToday(feedState.hygiene,now);
}
