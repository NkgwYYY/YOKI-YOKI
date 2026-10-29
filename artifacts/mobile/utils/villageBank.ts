import type {FeedState} from '../contexts/AppContext';
import type {StorageEntry} from './recoverableStorage';

export const BANK_CAPACITY=1_000_000;
export const BANK_HISTORY_LIMIT=80;
export type BankEntryKind='deposit'|'withdraw'|'interest'|'bonus'|'robbery'|'failure';
export type BankEntry={seq:number;date:string;kind:BankEntryKind;amount:number;balance:number;returned?:number;command?:{id:string;amount:number;revision:number}};
export type BankState={version:1;seed:number;balance:number;carry:number;lastDay:string;revision:number;serial:number;history:BankEntry[];interestEarned:number;lost:number;closedOn?:string};
export type BankOperation={kind:'sync'}|{kind:'deposit'|'withdraw';amount:number;id:string;revision:number};
export type BankReport={days:number;interest:number;lost:number;returned:number;robberies:number;failed:boolean};
export type BankResult={state:BankState;changed:boolean;ok:boolean;message:string;report:BankReport};
const FEED_KEY='@mentore/feed_state_v1',DAY=86400000;
const KINDS:BankEntryKind[]=['deposit','withdraw','interest','bonus','robbery','failure'];
const integer=(n:unknown):n is number=>Number.isSafeInteger(n)&&Number(n)>=0;
function dayNumber(date:string):number {
 if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date))throw Error('銀行の日付を確認できません');
 const time=Date.parse(date+'T00:00:00Z');
 if(!Number.isFinite(time)||new Date(time).toISOString().slice(0,10)!==date)throw Error('銀行の日付を確認できません');
 return time/DAY;
}
export function readBankState(value:unknown):BankState|undefined {
 if(value==null)return undefined;
 const s=value as BankState;
 if(s.version!==1||!integer(s.seed)||s.seed>0xffffffff||!integer(s.balance)||s.balance>BANK_CAPACITY||!integer(s.carry)||s.carry>=100||!integer(s.revision)||!integer(s.serial)||!integer(s.interestEarned)||!integer(s.lost)||!Array.isArray(s.history)||s.history.length>BANK_HISTORY_LIMIT)throw Error('通帳の記録を確認できません');
 dayNumber(s.lastDay);if(s.closedOn){dayNumber(s.closedOn);if(s.closedOn>s.lastDay)throw Error('通帳の日付を確認できません');}
 let previous=0;
 for(const e of s.history){
  if(!e||!integer(e.seq)||e.seq<=previous||e.seq>s.serial||!KINDS.includes(e.kind)||!Number.isSafeInteger(e.amount)||!integer(e.balance)||e.balance>BANK_CAPACITY||(e.returned!==undefined&&!integer(e.returned))||(e.command&&(!e.command.id||!integer(e.command.amount)||!integer(e.command.revision))))throw Error('通帳の記録を確認できません');
  dayNumber(e.date);if(e.date>s.lastDay)throw Error('通帳の日付を確認できません');previous=e.seq;
 }
 return s;
}
/** Persisted account seed + calendar day: reopening/retrying cannot reroll events. */
export function bankDayEvent(seed:number,date:string):'interest'|'bonus'|'robbery'|'failure' {
 let hash=2166136261;for(const c of `yoki-bank-v1:${seed}:${date}`)hash=Math.imul(hash^c.charCodeAt(0),16777619);
 hash^=hash>>>16;hash=Math.imul(hash,0x7feb352d);hash^=hash>>>15;hash=Math.imul(hash,0x846ca68b);hash^=hash>>>16;
 const roll=(hash>>>0)/4294967296;
 return roll<.01?'failure':roll<.05?'robbery':roll<.08?'bonus':'interest';
}
export const BANK_ENTRY_LABEL:Record<BankEntryKind,string>={deposit:'お預け入れ',withdraw:'お引き出し',interest:'今日の利息',bonus:'好景気の特別利息',robbery:'金庫に強盗',failure:'経営破綻・預金整理'};

/** Wallet, principal, fractions, day receipts and command identity are written
 * together in the existing recoverable journal. No second balance store. */
export function prepareBank(values:Record<string,string|null>,op:BankOperation,today:string,defaultFeed:FeedState,seed=Math.floor(Math.random()*4294967296)):{entries:StorageEntry[];result:BankResult&{feed:FeedState}} {
 const targetDay=dayNumber(today),feed:FeedState=values[FEED_KEY]?JSON.parse(values[FEED_KEY]!):defaultFeed;
 if(!feed||!integer(feed.points))throw Error('ポイントの記録を確認できません');
 if(op.kind!=='sync'&&(!['deposit','withdraw'].includes(op.kind)||!integer(op.amount)||op.amount<1||op.amount>BANK_CAPACITY||typeof op.id!=='string'||!op.id||op.id.length>100||!integer(op.revision)))throw Error('取引するポイント数を確認してください');
 const old=readBankState(feed.bank);
 if(old&&today<old.lastDay)throw Error('端末の日付が通帳より前になっています。日付を確認してください');
 if(!integer(seed)||seed>0xffffffff)throw Error('口座を準備できません');
 const state:BankState=old?{...old,history:[...old.history]}:{version:1,seed,balance:0,carry:0,lastDay:today,revision:0,serial:0,history:[],interestEarned:0,lost:0};
 let points=feed.points,changed=!old;
 const report:BankReport={days:0,interest:0,lost:0,returned:0,robberies:0,failed:false};
 const finish=(ok=true,message='通帳は最新です。')=>{
  if(changed)state.revision++;
  const next=changed?{...feed,points,bank:state}:feed;
  return {entries:changed?[[FEED_KEY,JSON.stringify(next)]] as StorageEntry[]:[],result:{feed:next,state:changed?state:old!,changed,ok,message,report}};
 };
 if(op.kind!=='sync'){
  const previous=state.history.find(e=>e.command?.id===op.id);
  if(previous){
   if(previous.kind!==op.kind||previous.command!.amount!==op.amount||previous.command!.revision!==op.revision)throw Error('取引番号が一致しません');
   return finish(true,'この取引は記帳済みです。');
  }
 }
 const append=(date:string,kind:BankEntryKind,amount:number,extra:Partial<BankEntry>={})=>{
  state.history.push({seq:++state.serial,date,kind,amount,balance:state.balance,...extra});
  state.history=state.history.slice(-BANK_HISTORY_LIMIT);changed=true;
 };
 const startingRevision=state.revision;
 for(let day=dayNumber(state.lastDay)+1;day<=targetDay&&state.balance>0;day++){
  const date=new Date(day*DAY).toISOString().slice(0,10),event=bankDayEvent(state.seed,date);
  report.days++;
  if(event==='failure'){
   const returned=Math.floor(state.balance*.75),lost=state.balance-returned;
   if(!Number.isSafeInteger(points+returned))throw Error('ポイントが上限に達しています');
   points+=returned;state.balance=0;state.carry=0;state.closedOn=date;state.lost+=lost;
   report.failed=true;report.lost+=lost;report.returned+=returned;append(date,'failure',-lost,{returned});break;
  }
  if(event==='robbery'){
   const lost=Math.ceil(state.balance*.10);state.balance-=lost;state.carry=Math.floor(state.carry*.9);state.lost+=lost;
   report.robberies++;report.lost+=lost;append(date,'robbery',-lost);
  }else{
   const accrued=state.balance*(event==='bonus'?2:1)+state.carry;
   const earned=Math.min(BANK_CAPACITY-state.balance,Math.floor(accrued/100));
   state.balance+=earned;state.carry=state.balance===BANK_CAPACITY?0:accrued%100;state.interestEarned+=earned;
   report.interest+=earned;append(date,event,earned);
  }
 }
 if(state.lastDay!==today){state.lastDay=today;changed=true;}
 if(op.kind==='sync')return finish(true,report.failed?'経営破綻が発生しました。預金の75％を手元に返還しました。':report.robberies?'金庫が強盗に遭いました。被害と利息を通帳に記帳しました。':report.days?`${report.days}日分を記帳しました。利息 ＋${report.interest}pt。`:'通帳は最新です。');
 // A stale button/retried command cannot apply twice, even after old history is pruned.
 if(op.revision!==startingRevision)return finish(false,'通帳が更新されました。残高を確認して、もう一度選んでください。');
 if(op.kind==='deposit'){
  if(state.closedOn===today)return finish(false,'今日は預金整理のため休業です。明日から営業を再開します。');
  if(op.amount>points)return finish(false,'手元のポイントが足りません。');
  if(state.balance+op.amount>BANK_CAPACITY)return finish(false,'預金の上限は100万ptです。');
  points-=op.amount;state.balance+=op.amount;
 }else{
  if(op.amount>state.balance)return finish(false,report.failed?'預金整理で残高が変わりました。返還分は手元に戻っています。':'預金残高が足りません。');
  if(!Number.isSafeInteger(points+op.amount))throw Error('ポイントが上限に達しています');
  points+=op.amount;state.balance-=op.amount;
 }
 append(today,op.kind,op.kind==='deposit'?op.amount:-op.amount,{command:{id:op.id,amount:op.amount,revision:op.revision}});
 return finish(true,`${op.amount.toLocaleString()}ptを${op.kind==='deposit'?'預けました。明日から日ごとに利息と出来事を判定します。':'引き出しました。'}`);
}
