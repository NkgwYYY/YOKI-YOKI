import type {MascotStage} from './mascotUtils';
import {VISIT_STAGES,readVisitGrowth,legacyStage} from './visitGrowth.ts';

export const STONE_PRODUCTS={evolution:'yokiyoki.evolution_stone',regression:'yokiyoki.regression_stone'} as const;
export type StoneKind=keyof typeof STONE_PRODUCTS;
export type EvolutionWallet={evolution:number;regression:number;receipts:string[]};
export type EvolutionChoice={version:1;stage:MascotStage;declined:MascotStage[];usedFree:MascotStage[];revision:number;changedAt:number;wallet:EvolutionWallet};
type Source={evolution?:EvolutionChoice;visits?:unknown;level?:number};
const index=(stage:unknown)=>VISIT_STAGES.findIndex(x=>x.stage===stage);
const emptyWallet=():EvolutionWallet=>({evolution:0,regression:0,receipts:[]});
export function readEvolution(raw:unknown):EvolutionChoice|null{
 if(!raw||typeof raw!=='object')return null;
 const s=raw as EvolutionChoice,w=s.wallet;
 if(s.version!==1||index(s.stage)<0||!Number.isSafeInteger(s.revision)||s.revision<0||!Number.isFinite(s.changedAt)||s.changedAt<0
  ||!Array.isArray(s.declined)||!Array.isArray(s.usedFree)||[...s.declined,...s.usedFree].some(x=>index(x)<0)
  ||!w||![w.evolution,w.regression].every(x=>Number.isSafeInteger(x)&&x>=0)||!Array.isArray(w.receipts)||w.receipts.some(x=>typeof x!=='string'||!x))return null;
 return s;
}
/** Capture the existing appearance once. Later attendance never overrides a choice. */
export function evolutionFor(progress:Source):EvolutionChoice{
 const saved=readEvolution(progress.evolution);if(saved)return saved;
 if(progress.evolution!=null)throw Error('進化の記録を読み込めません。データは変更していません。');
 const stage=readVisitGrowth(progress.visits)?.stage??legacyStage(progress.level??1);
 return {version:1,stage,declined:[],usedFree:VISIT_STAGES.slice(0,index(stage)).map(s=>s.stage),revision:0,changedAt:0,wallet:emptyWallet()};
}
export function evolutionOffer(progress:Source){
 const choice=evolutionFor(progress),i=index(choice.stage),next=VISIT_STAGES[i+1]??null,previous=VISIT_STAGES[i-1]??null;
 const days=readVisitGrowth(progress.visits)?.totalVisits??0;
 const declined=choice.declined.includes(choice.stage),used=choice.usedFree.includes(choice.stage);
 return {choice,next,previous,days,remaining:next?Math.max(0,next.days-days):0,
  free:!!next&&days>=next.days&&!declined&&!used,
  stone:!!next&&(days>=next.days||declined||used),declined};
}
export type EvolutionAction={kind:'free'|'decline'|'evolution'|'regression';stage:MascotStage;revision:number};
export function chooseEvolution<T extends Source>(progress:T,action:EvolutionAction,now=Date.now()):T&{evolution:EvolutionChoice}{
 const {choice,next,previous,free,stone}=evolutionOffer(progress);
 if(action.stage!==choice.stage||action.revision!==choice.revision)throw Error('姿が変わりました。もう一度確認してください。');
 const add=(values:MascotStage[],value:MascotStage)=>[...new Set([...values,value])];
 let result:EvolutionChoice={...choice,revision:choice.revision+1,changedAt:Math.max(now,choice.changedAt+1),wallet:{...choice.wallet}};
 if(action.kind==='decline'){
  if(!free)throw Error('この段階の無料進化は選べません。');
  result.declined=add(choice.declined,choice.stage);
 }else if(action.kind==='free'){
  if(!free||!next)throw Error('この段階の無料進化は選べません。');
  result={...result,stage:next.stage,usedFree:add(choice.usedFree,choice.stage)};
 }else if(action.kind==='evolution'){
  if(!next||!stone||choice.wallet.evolution<1)throw Error('進化の石を使えません。');
  result={...result,stage:next.stage,usedFree:add(choice.usedFree,choice.stage),wallet:{...choice.wallet,evolution:choice.wallet.evolution-1}};
 }else if(action.kind==='regression'){
  if(!previous||choice.wallet.regression<1)throw Error('退化の石を使えません。');
  result={...result,stage:previous.stage,usedFree:add(choice.usedFree,previous.stage),wallet:{...choice.wallet,regression:choice.wallet.regression-1}};
 }else throw Error('操作を確認できません。');
 return {...progress,evolution:result};
}
/** Only called with a transaction verified by the native StoreKit module. Persist before finish(). */
export function creditStone<T extends Source>(progress:T,productId:string,transactionId:string):T&{evolution:EvolutionChoice}{
 const kind=(Object.keys(STONE_PRODUCTS) as StoneKind[]).find(k=>STONE_PRODUCTS[k]===productId);
 if(!kind||!/^\d{1,32}$/.test(transactionId))throw Error('購入情報を確認できません。');
 const choice=evolutionFor(progress),wallet=choice.wallet;
 if(wallet.receipts.includes(transactionId))return {...progress,evolution:choice};
 if(!Number.isSafeInteger(wallet[kind]+1))throw Error('所持数を保存できません。');
 return {...progress,evolution:{...choice,wallet:{...wallet,[kind]:wallet[kind]+1,receipts:[...wallet.receipts,transactionId]}}};
}
/** Consumable inventory stays on the purchasing device; only the chosen form syncs. */
export function evolutionForCloud(raw:unknown):EvolutionChoice|undefined{
 const state=readEvolution(raw);return state?{...state,wallet:emptyWallet()}:undefined;
}
export function mergeEvolution(cloud:Source,local:Source):EvolutionChoice{
 const a=evolutionFor(cloud),b=evolutionFor(local);
 const unmodified=a.revision===0&&b.revision===0&&a.changedAt===0&&b.changedAt===0;
 const latest=unmodified?(index(a.stage)>index(b.stage)?a:b):a.changedAt>b.changedAt||(a.changedAt===b.changedAt&&a.revision>b.revision)?a:b;
 return {...latest,declined:[...new Set([...a.declined,...b.declined])],usedFree:[...new Set([...a.usedFree,...b.usedFree])],wallet:b.wallet};
}
