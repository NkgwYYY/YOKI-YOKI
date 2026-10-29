import type {FeedState} from '../contexts/AppContext';
import type {StorageEntry} from './recoverableStorage';
export const EGG_RECIPES=[{id:'soft',name:'とろとろ半熟',targetMs:5400,description:'黄身がとろりと流れる、やわらかな半熟。'},{id:'jammy',name:'ねっとり半熟',targetMs:6500,description:'黄身がしっとり濃厚な、工房の定番。'},{id:'firm',name:'しっとり固ゆで',targetMs:7400,description:'火を通しすぎず、ほくほくに仕上げる。'}] as const;
export type EggRecipeId=typeof EGG_RECIPES[number]['id'];
export const recipeForTarget=(target:number)=>EGG_RECIPES[target<5900?0:target<7000?1:2];
/** Legacy pots retain their timing. New daily challenges start at master speed. */
export const EGG_JOB_LIMIT_MS=10000;
export const EGG_JOB_READY_MS=2000;
export const EGG_DIFFICULTIES=[
  {id:'brisk',name:'はやめ',stars:1,limitMs:6000,perfectMs:140,goodMs:360,perfectPay:30,goodPay:12,color:'#B7DBC1'},
  {id:'rush',name:'高速',stars:2,limitMs:4200,perfectMs:90,goodMs:240,perfectPay:50,goodPay:22,color:'#DEC0F3'},
  {id:'master',name:'職人級',stars:3,limitMs:2800,perfectMs:60,goodMs:150,perfectPay:80,goodPay:36,color:'#F4CF8B'},
  {id:'expert',name:'達人級',stars:4,limitMs:2000,perfectMs:42,goodMs:110,perfectPay:120,goodPay:56,color:'#FFC095'},
  {id:'legend',name:'神業級',stars:5,limitMs:1400,perfectMs:28,goodMs:75,perfectPay:180,goodPay:84,color:'#FFABCD'},
] as const;
export type EggDifficultyId=typeof EGG_DIFFICULTIES[number]['id'];
const LEGACY_RULES={name:'従来のご注文',stars:0,limitMs:EGG_JOB_LIMIT_MS,perfectMs:220,goodMs:650,perfectPay:30,goodPay:12,color:'#D6BB91'};
export const eggRules=(difficulty?:EggDifficultyId,round?:number)=>{
 if(round!==undefined){const speed=1+Math.max(0,round)*.22;return {name:`挑戦 ${round+1}`,stars:0,limitMs:2800/speed,perfectMs:60/speed,goodMs:150/speed,perfectPay:80+Math.floor(round/3)*10,goodPay:36+Math.floor(round/3)*4,color:'#8A5D25'};}
 return EGG_DIFFICULTIES.find(d=>d.id===difficulty)??LEGACY_RULES;
};
export type EggDay={date:string;successes:number;perfect:number;endedAt:number|null;updatedAt:number};
export type EggChallenge={days:EggDay[];best:number};
export function eggDate(now:number){const d=new Date(now);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
export const eggDay=(state:EggJobState,date:string)=>state.challenge?.days.find(d=>d.date===date);
const validDate=(v:unknown)=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
const count=(v:unknown)=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=0;

export type EggGrade='raw'|'good'|'perfect'|'hard';
export type EggShift={id:string;startedAt:number;targetMs:number;difficulty?:EggDifficultyId;recipe?:EggRecipeId;round?:number;date?:string};
export type EggReceipt={id:string;grade:EggGrade;earned:number;elapsed:number;targetMs?:number;difficulty?:EggDifficultyId;recipe?:EggRecipeId;round?:number;date?:string};
export type EggJobState={active:EggShift|null;receipts:EggReceipt[];challenge?:EggChallenge};
export type EggJobOperation={kind:'start';id:string;recipe?:EggRecipeId}|{kind:'finish';id:string;finishedAt?:number};
export type EggJobResult={state:EggJobState;receipt:EggReceipt|null;newlyGranted:boolean};
export function eggGrade(elapsed:number,target:number,difficulty?:EggDifficultyId,round?:number):{grade:EggGrade;earned:number}{
  const delta=elapsed-target,rules=eggRules(difficulty,round);
  if(Math.abs(delta)<=rules.perfectMs)return {grade:'perfect',earned:rules.perfectPay};
  if(Math.abs(delta)<=rules.goodMs)return {grade:'good',earned:rules.goodPay};
  return {grade:delta<0?'raw':'hard',earned:0};
}
export function readEggJob(raw:unknown):EggJobState{
  const input=raw as Partial<EggJobState>|undefined,active=input?.active;
  const rules=eggRules(active?.difficulty,active?.round);
  const validTier=(active?.difficulty===undefined||EGG_DIFFICULTIES.some(d=>d.id===active.difficulty))&&(active?.round===undefined||count(active.round)&&validDate(active.date));
  const validTarget=active&&Number.isFinite(active.targetMs)&&(active.difficulty===undefined
    ?active.targetMs>=5200&&active.targetMs<=7600
    :EGG_RECIPES.some(r=>r.id===active.recipe)&&active.targetMs>rules.goodMs&&active.targetMs+rules.goodMs<rules.limitMs);
  const rawDays=input?.challenge?.days;
  const days=Array.isArray(rawDays)?rawDays.filter(d=>validDate(d?.date)&&count(d.successes)&&count(d.perfect)&&d.perfect<=d.successes&&(d.endedAt===null||Number.isFinite(d.endedAt))&&Number.isFinite(d.updatedAt)):[];
  const challenge={days:Object.values(Object.fromEntries(days.map(d=>[d.date,d]))).sort((a,b)=>a.date.localeCompare(b.date)).slice(-366),best:Math.max(count(input?.challenge?.best)?input!.challenge!.best:0,...days.map(d=>d.successes))};
  return {challenge,active:active&&typeof active.id==='string'&&Number.isFinite(active.startedAt)&&validTier&&validTarget?active:null,receipts:Array.isArray(input?.receipts)?input.receipts.filter(r=>r&&typeof r.id==='string'&&['raw','good','perfect','hard'].includes(r.grade)&&Number.isFinite(r.earned)).slice(-40):[]};
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
  const state=readEggJob(feed.eggJob),today=eggDate(now),existing=state.receipts.find(r=>r.id===op.id);
  let receipt:EggReceipt|null=null,changed=false,newlyGranted=false;
  if(existing)receipt=existing;
  else if(op.kind==='start'){
    const challenge=state.challenge!;
    if(challenge.days.some(d=>d.date>today))throw Error('日付が戻っています。次の挑戦は明日です');
    if(state.active?.date&&state.active.date<today){
      const previous=eggDay(state,state.active.date);if(previous){previous.endedAt=now;previous.updatedAt=now;}state.active=null;changed=true;
    }
    const day=eggDay(state,today)??{date:today,successes:0,perfect:0,endedAt:null,updatedAt:now};
    if(day.endedAt!==null)throw Error('今日の挑戦は終了しました。また明日');
    if(!state.active){
      if(!eggDay(state,today))challenge.days=[...challenge.days,day].slice(-366);
      const round=day.successes,seed=orderSeed(op.id),rules=eggRules('master',round);
      const order=EGG_RECIPES.find(r=>r.id===op.recipe)??EGG_RECIPES[(seed>>>8)%EGG_RECIPES.length];
      const targetMs=(order.targetMs+(seed>>>16)%241-120)*rules.limitMs/EGG_JOB_LIMIT_MS;
      state.active={id:op.id,startedAt:now+EGG_JOB_READY_MS,targetMs,difficulty:'master',recipe:order.id,round,date:today};changed=true;
    }
  }else{
    if(state.active?.id!==op.id)throw new Error('この仕事は完了しています');
    const end=op.finishedAt??now;
    if(!Number.isFinite(end)||end>now)throw new Error('仕事の時刻を確認できません');
    const elapsed=end-state.active.startedAt;
    if(elapsed<0)throw new Error('まだ調理が始まっていません');
    const pot=state.active;
    const scored=pot.date&&pot.date<today?{grade:'hard' as const,earned:0}:eggGrade(elapsed,pot.targetMs,pot.difficulty,pot.round);
    receipt={id:op.id,elapsed,targetMs:pot.targetMs,difficulty:pot.difficulty,recipe:pot.recipe,round:pot.round,date:pot.date,...scored};
    if(pot.date){
      const day=eggDay(state,pot.date);if(!day||day.endedAt!==null||day.successes!==pot.round)throw Error('今日の仕事の状態を確認できません');
      if(scored.earned>0){day.successes++;if(scored.grade==='perfect')day.perfect++;state.challenge!.best=Math.max(state.challenge!.best,day.successes);}
      else day.endedAt=now;
      day.updatedAt=now;
    }
    state.receipts=[...state.receipts,receipt].slice(-40);state.active=null;changed=true;newlyGranted=true;
  }
  const next=changed?{...feed,eggJob:state,points:feed.points+(newlyGranted?receipt!.earned:0)}:feed;
  const entries:StorageEntry[]=changed?[[key,JSON.stringify(next)]]:[];
  return {entries,result:{feed:next,state,receipt,newlyGranted,changed}};
}

/** Merge a returning guest's progress without reopening a day already finished on either side. */
export function mergeEggJob(cloud:unknown,local:unknown):EggJobState{
 const a=readEggJob(cloud),b=readEggJob(local),days=new Map<string,EggDay>();
 for(const d of [...a.challenge!.days,...b.challenge!.days]){const old=days.get(d.date);days.set(d.date,old?{...d,successes:Math.max(old.successes,d.successes),perfect:Math.max(old.perfect,d.perfect),endedAt:old.endedAt??d.endedAt,updatedAt:Math.max(old.updatedAt,d.updatedAt)}:{...d});}
 const receipts=[...new Map([...b.receipts,...a.receipts].map(r=>[r.id,r])).values()].slice(-40);
 const active=[a.active,b.active].filter((p):p is EggShift=>!!p).find(p=>!receipts.some(r=>r.id===p.id)&&(!p.date||days.get(p.date)?.endedAt===null&&days.get(p.date)?.successes===p.round))??null;
 return {active,receipts,challenge:{days:[...days.values()].sort((a,b)=>a.date.localeCompare(b.date)).slice(-366),best:Math.max(a.challenge!.best,b.challenge!.best,...[...days.values()].map(d=>d.successes))}};
}
