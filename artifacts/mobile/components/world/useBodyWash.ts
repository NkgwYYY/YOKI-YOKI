import {useEffect,useRef,useState} from 'react';
import {useApp} from '@/contexts/AppContext';
import {useAuth} from '@/contexts/AuthContext';
import {BODY_WASH_SPOTS,bodyWashPercent,isBodyWashComplete,rubBody} from '@/utils/housekeeping';

type Point={x:number;y:number};
export function useBodyWash(active:boolean,completedToday:boolean){
 const {cleanRoom}=useApp();
 const {user,isSignedIn,isLoading}=useAuth();
 const account=isLoading?'loading':isSignedIn?`user:${user?.id??'pending'}`:'guest';
 const owner=useRef({account});
 if(owner.current.account!==account)owner.current={account};
 const scope=owner.current;
 const [coverage,setCoverage]=useState(()=>BODY_WASH_SPOTS.map(()=>0));
 const [towel,setTowel]=useState<Point|null>(null),[saving,setSaving]=useState(false),[saved,setSaved]=useState(false),[error,setError]=useState('');
 const current=useRef(coverage),previous=useRef<Point|null>(null),pending=useRef(false),done=useRef(false),alive=useRef(true);
 const id=useRef(''),towelRelease=useRef<ReturnType<typeof setTimeout>|null>(null);
 const clearTowelRelease=()=>{if(towelRelease.current){clearTimeout(towelRelease.current);towelRelease.current=null;}};
 const reset=()=>{
  clearTowelRelease();
  const empty=BODY_WASH_SPOTS.map(()=>0);current.current=empty;setCoverage(empty);
  id.current=`wash-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  previous.current=null;setTowel(null);pending.current=false;done.current=false;
  setSaving(false);setSaved(false);setError('');
 };
 useEffect(()=>{reset();},[scope]);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;clearTowelRelease();};},[]);
 useEffect(()=>{
  if(!active){clearTowelRelease();previous.current=null;setTowel(null);}
  else if(done.current&&!completedToday)reset();
 },[active,completedToday]);
 const start=(point:Point)=>{if(!active||completedToday||isLoading||pending.current||done.current)return;clearTowelRelease();previous.current=point;setTowel(point);};
 const move=(point:Point)=>{
  if(!active||completedToday||isLoading||pending.current||done.current||!previous.current)return;
  const next=rubBody(current.current,previous.current,point);
  previous.current=point;current.current=next;setCoverage(next);setTowel(point);
 };
 const save=async()=>{
  if(isLoading||owner.current!==scope||!isBodyWashComplete(current.current)||pending.current||done.current)return;
  pending.current=true;setSaving(true);setError('');
  try{
   await cleanRoom({kind:'bodyWash',id:id.current,coverage:[...current.current]});
   if(alive.current&&owner.current===scope){done.current=true;setSaved(true);}
  }catch{if(alive.current&&owner.current===scope)setError('洗った状態を保存できませんでした。もう一度試してね。');}
  finally{if(alive.current&&owner.current===scope){pending.current=false;setSaving(false);}}
 };
 // Keep even a synchronous accessibility/keyboard stroke visible briefly.
 // This is presentation only: coverage still changes exclusively in move().
 const finish=()=>{previous.current=null;clearTowelRelease();towelRelease.current=setTimeout(()=>{towelRelease.current=null;if(alive.current)setTowel(null);},150);void save();};
 return {coverage,towel,saving,saved,error,start,move,finish,retry:()=>void save(),percent:bodyWashPercent(coverage)};
}
