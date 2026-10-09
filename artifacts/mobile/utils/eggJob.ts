import type {FeedState} from '../contexts/AppContext';
import type {StorageEntry} from './recoverableStorage';
export const EGG_RECIPES=[{id:'soft',name:'とろとろ半熟',targetMs:5400,description:'黄身がとろりと流れる、やわらかな半熟。'},{id:'jammy',name:'ねっとり半熟',targetMs:6500,description:'黄身がしっとり濃厚な、工房の定番。'},{id:'firm',name:'しっとり固ゆで',targetMs:7400,description:'火を通しすぎず、ほくほくに仕上げる。'}] as const;
export type EggRecipeId=typeof EGG_RECIPES[number]['id'];
export const recipeForTarget=(target:number)=>EGG_RECIPES[target<5900?0:target<7000?1:2];
/** Old pots keep their original timing/pay. New pots use one saved random tier. */
export const EGG_JOB_LIMIT_MS=10000;
export const EGG_JOB_READY_MS=2000;
export const EGG_DIFFICULTIES=[
  {id:'brisk',name:'はやめ',stars:1,limitMs:6000,perfectMs:140,goodMs:360,perfectPay:30,goodPay:12,color:'#B7DBC1'},
  {id:'rush',name:'高速',stars:2,limitMs:4200,perfectMs:90,goodMs:240,perfectPay:50,goodPay:22,color:'#DEC0F3'},
  {id:'master',name:'職人級',stars:3,limitMs:2800,perfectMs:60,goodMs:150,perfectPay:80,goodPay:36,color:'#F4CF8B'},
] as const;
export type EggDifficultyId=typeof EGG_DIFFICULTIES[number]['id'];
const LEGACY_RULES={name:'従来のご注文',stars:0,limitMs:EGG_JOB_LIMIT_MS,perfectMs:220,goodMs:650,perfectPay:30,goodPay:12,color:'#D6BB91'};
export const eggRules=(difficulty?:EggDifficultyId)=>EGG_DIFFICULTIES.find(d=>d.id===difficulty)??LEGACY_RULES;
export type EggGrade='raw'|'good'|'perfect'|'hard';
export type EggShift={id:string;startedAt:number;targetMs:number;difficulty?:EggDifficultyId;recipe?:EggRecipeId};
export type EggReceipt={id:string;grade:EggGrade;earned:number;elapsed:number;targetMs?:number;difficulty?:EggDifficultyId;recipe?:EggRecipeId};
export type EggJobState={active:EggShift|null;receipts:EggReceipt[]};
export type EggJobOperation={kind:'start';id:string;recipe?:EggRecipeId}|{kind:'finish';id:string;finishedAt?:number};
export type EggJobResult={state:EggJobState;receipt:EggReceipt|null;newlyGranted:boolean};
export function eggGrade(elapsed:number,target:number,difficulty?:EggDifficultyId):{grade:EggGrade;earned:number}{
  const delta=elapsed-target,rules=eggRules(difficulty);
  if(Math.abs(delta)<=rules.perfectMs)return {grade:'perfect',earned:rules.perfectPay};
  if(Math.abs(delta)<=rules.goodMs)return {grade:'good',earned:rules.goodPay};
  return {grade:delta<0?'raw':'hard',earned:0};
}
export function readEggJob(raw:unknown):EggJobState{
  const input=raw as Partial<EggJobState>|undefined,active=input?.active;
  const rules=eggRules(active?.difficulty);
  const validTier=active?.difficulty===undefined||EGG_DIFFICULTIES.some(d=>d.id===active.difficulty);
  const validTarget=active&&Number.isFinite(active.targetMs)&&(active.difficulty===undefined
    ?active.targetMs>=5200&&active.targetMs<=7600
    :EGG_RECIPES.some(r=>r.id===active.recipe)&&active.targetMs>rules.goodMs&&active.targetMs+rules.goodMs<rules.limitMs);
  return {active:active&&typeof active.id==='string'&&Number.isFinite(active.startedAt)&&validTier&&validTarget?active:null,receipts:Array.isArray(input?.receipts)?input.receipts.filter(r=>r&&typeof r.id==='string'&&['raw','good','perfect','hard'].includes(r.grade)&&Number.isFinite(r.earned)).slice(-40):[]};
}
function orderSeed(id:string){
  // The ID already contains fresh random entropy. Hashing it keeps retries stable.
  let seed=2166136261;for(const c of id)seed=Math.imul(seed^c.charCodeAt(0),16777619);
  return seed>>>0;
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
      const seed=orderSeed(op.id),rules=EGG_DIFFICULTIES[seed%EGG_DIFFICULTIES.length];
      const order=EGG_RECIPES.find(r=>r.id===op.recipe)??EGG_RECIPES[(seed>>>8)%EGG_RECIPES.length];
      const targetMs=Math.round((order.targetMs+(seed>>>16)%241-120)*rules.limitMs/EGG_JOB_LIMIT_MS);
      state.active={id:op.id,startedAt:now+EGG_JOB_READY_MS,targetMs,difficulty:rules.id,recipe:order.id};changed=true;
    }
  }else{
    if(state.active?.id!==op.id)throw new Error('この仕事は完了しています');
    const end=op.finishedAt??now;
    if(!Number.isFinite(end)||end>now)throw new Error('仕事の時刻を確認できません');
    const elapsed=end-state.active.startedAt;
    if(elapsed<0)throw new Error('まだ調理が始まっていません');
    receipt={id:op.id,elapsed,targetMs:state.active.targetMs,difficulty:state.active.difficulty,recipe:state.active.recipe,...eggGrade(elapsed,state.active.targetMs,state.active.difficulty)};
    state.receipts=[...state.receipts,receipt].slice(-40);state.active=null;changed=true;newlyGranted=true;
  }
  const next=changed?{...feed,eggJob:state,points:feed.points+(newlyGranted?receipt!.earned:0)}:feed;
  const entries:StorageEntry[]=changed?[[key,JSON.stringify(next)]]:[];
  return {entries,result:{feed:next,state,receipt,newlyGranted,changed}};
}
