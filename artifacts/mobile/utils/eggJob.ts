import type {FeedState} from '../contexts/AppContext';
import type {StorageEntry} from './recoverableStorage';
export const EGG_RECIPES=[{id:'soft',name:'とろとろ半熟',targetMs:5400,description:'黄身がとろりと流れる、やわらかな半熟。'},{id:'jammy',name:'ねっとり半熟',targetMs:6500,description:'黄身がしっとり濃厚な、工房の定番。'},{id:'firm',name:'しっとり固ゆで',targetMs:7400,description:'火を通しすぎず、ほくほくに仕上げる。'}] as const;
export type EggRecipeId=typeof EGG_RECIPES[number]['id'];
export const recipeForTarget=(target:number)=>EGG_RECIPES[target<5900?0:target<7000?1:2];
export type EggGrade='raw'|'good'|'perfect'|'hard';
export type EggShift={id:string;startedAt:number;targetMs:number};
export type EggReceipt={id:string;grade:EggGrade;earned:number;elapsed:number;targetMs?:number};
export type EggJobState={active:EggShift|null;receipts:EggReceipt[]};
export type EggJobOperation={kind:'start';id:string;recipe?:EggRecipeId}|{kind:'finish';id:string;finishedAt?:number};
export type EggJobResult={state:EggJobState;receipt:EggReceipt|null;newlyGranted:boolean};
export const EGG_JOB_LIMIT_MS=10000;
export function eggGrade(elapsed:number,target:number):{grade:EggGrade;earned:number}{
  const delta=elapsed-target;
  if(Math.abs(delta)<=220)return {grade:'perfect',earned:30};
  if(Math.abs(delta)<=650)return {grade:'good',earned:12};
  return {grade:delta<0?'raw':'hard',earned:0};
}
export function readEggJob(raw:unknown):EggJobState{
  const input=raw as Partial<EggJobState>|undefined;
  const active=input?.active;
  return {active:active&&typeof active.id==='string'&&Number.isFinite(active.startedAt)&&active.targetMs>=5200&&active.targetMs<=7600?active:null,receipts:Array.isArray(input?.receipts)?input.receipts.filter(r=>r&&typeof r.id==='string'&&['raw','good','perfect','hard'].includes(r.grade)&&Number.isFinite(r.earned)).slice(-40):[]};
}
export function prepareEggJob(values:Record<string,string|null>,op:EggJobOperation,now:number,defaultFeed:FeedState){
  if(!Number.isFinite(now)||!op.id||op.id.length>100)throw new Error('仕事の状態を確認できません');
  const key='@mentore/feed_state_v1',feed:FeedState=values[key]?JSON.parse(values[key]!):defaultFeed;
  if(!feed||!Number.isFinite(feed.points)||feed.points<0)throw new Error('ポイントを確認できません');
  const state=readEggJob(feed.eggJob),existing=state.receipts.find(r=>r.id===op.id);
  let receipt:EggReceipt|null=null,changed=false,newlyGranted=false;
  if(existing)receipt=existing;
  else if(op.kind==='start'){
    if(!state.active){
      let seed=0;for(const c of op.id)seed=(seed*31+c.charCodeAt(0))>>>0;
      const order=EGG_RECIPES.find(r=>r.id===op.recipe);
      state.active={id:op.id,startedAt:now,targetMs:order?order.targetMs+seed%241-120:5200+seed%2401};changed=true;
    }
  }else{
    if(state.active?.id!==op.id)throw new Error('この仕事は完了しています');
    const end=op.finishedAt??now;
    if(!Number.isFinite(end)||end>now)throw new Error('仕事の時刻を確認できません');
    const elapsed=end-state.active.startedAt;
    if(elapsed<0)throw new Error('端末の時刻を確認してください');
    receipt={id:op.id,elapsed,targetMs:state.active.targetMs,...eggGrade(elapsed,state.active.targetMs)};
    state.receipts=[...state.receipts,receipt].slice(-40);state.active=null;changed=true;newlyGranted=true;
  }
  const next=changed?{...feed,eggJob:state,points:feed.points+(newlyGranted?receipt!.earned:0)}:feed;
  const entries:StorageEntry[]=changed?[[key,JSON.stringify(next)]]:[];
  return {entries,result:{feed:next,state,receipt,newlyGranted,changed}};
}
