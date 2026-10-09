import type {FeedState} from '../contexts/AppContext';
import type {StorageEntry} from './recoverableStorage';
import {readHappiness} from './happiness';
import {readHygiene} from './hygiene';
import {readSmoking,canReceiveSmokingGift,SMOKE_STEP_MS,SMOKE_LIMIT_MS,type TobaccoPatron,type SmokingState,type SmokeReceipt} from './smokingState';
export type SmokingOperation={kind:'start';id:string}|{kind:'progress'|'finish';id:string;elapsedMs:number;at?:number}|{kind:'recover'}|{kind:'gift';patron:TobaccoPatron};
export type SmokingResult={state:SmokingState;receipt:SmokeReceipt|null;changed:boolean};
export function prepareSmoking(values:Record<string,string|null>,op:SmokingOperation,today:string,now:number,defaultFeed:FeedState){
 if(!Number.isFinite(now)||now<0||('id' in op&&(!op.id||op.id.length>100)))throw Error('喫煙の記録を確認できません');
 const key='@mentore/feed_state_v1',feed:FeedState=values[key]?JSON.parse(values[key]!):defaultFeed;
 if(!feed||!Number.isFinite(feed.points)||feed.points<0)throw Error('データを確認できません');
 const happiness=readHappiness(feed.happiness,today,now),state=readSmoking(happiness.smoking),hygiene=readHygiene(feed.hygiene,now);
 let receipt:SmokeReceipt|null=null;
 const close=()=>{if(!state.active)return;const {startedAt,...r}=state.active;receipt=r;state.receipts=[...state.receipts,r].slice(-40);state.active=null;};
 if(op.kind==='gift'){
  if(canReceiveSmokingGift(state,today,op.patron)){
   state.giftCigarettes++;
   state.giftDays=[...state.giftDays,today].sort().slice(-32);
  }
 }else if(op.kind==='recover'){
  // An abandoned screen only keeps time already confirmed while it was visible.
  close();
 }else if(op.kind==='start'){
  if(now<state.lastSmokedAt)throw Error('喫煙の時刻を確認できません');
  receipt=state.receipts.find(r=>r.id===op.id)??null;
  if(!receipt){
   if(state.active&&state.active.id!==op.id)throw Error('前の一服を終えてから始めてください');
   if(!state.active){
    const gifted=state.giftCigarettes>0;
    if(gifted)state.giftCigarettes--;
    state.active={id:op.id,startedAt:now,elapsedMs:0,gained:0,dirt:0,counted:false,...(gifted?{gifted:true}:{})};
   }
  }
 }else{
  receipt=state.receipts.find(r=>r.id===op.id)??null;
  if(!receipt){
   const current=state.active;
   if(!current||current.id!==op.id)throw Error('この一服は終了しています');
   const at=op.at??now;
   if(!Number.isFinite(at)||at>now||at<current.startedAt||!Number.isFinite(op.elapsedMs)||op.elapsedMs<0||op.elapsedMs>Math.max(0,at-current.startedAt))throw Error('喫煙の時間を確認できません');
   const elapsed=Math.max(current.elapsedMs,Math.min(SMOKE_LIMIT_MS,Math.floor(op.elapsedMs)));
   const steps=Math.floor(elapsed/SMOKE_STEP_MS)-Math.floor(current.elapsedMs/SMOKE_STEP_MS);
   if(steps>0){
    const gain=Math.min(100-happiness.value,steps),dirt=Math.min(85-(hygiene.smokeDirt??0),steps);
    happiness.value+=gain;hygiene.smokeDirt=(hygiene.smokeDirt??0)+dirt;
    current.gained+=gain;current.dirt+=dirt;
    if(!current.counted){state.sessions++;current.counted=true;}
   }
   if(current.counted&&elapsed>current.elapsedMs){state.lastSmokedAt=Math.max(state.lastSmokedAt,at-Math.max(0,op.elapsedMs-SMOKE_LIMIT_MS));state.withdrawalSteps=0;state.recoveredAt=0;}
   current.elapsedMs=elapsed;
   if(op.kind==='finish'||elapsed>=SMOKE_LIMIT_MS)close();
  }
 }
 happiness.smoking=state;
 const next={...feed,happiness,hygiene};
 const changed=JSON.stringify(next)!==JSON.stringify(feed);
 const entries:StorageEntry[]=changed?[[key,JSON.stringify(next)]]:[];
 return {entries,result:{feed:changed?next:feed,state,receipt,changed}};
}
