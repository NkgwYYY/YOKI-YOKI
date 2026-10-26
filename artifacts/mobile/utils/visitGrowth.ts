import type {MascotStage} from './mascotUtils';

/** Visits are distinct from diary streaks and earned XP. Dates are device-local civil days. */
export const VISIT_STAGES: {stage:MascotStage;days:number;name:string}[] = [
  {stage:'egg',days:1,name:'たまご'}, {stage:'odango',days:3,name:'モフモフ'},
  {stage:'stage3',days:10,name:'はっぱ'}, {stage:'stage4',days:30,name:'カラフルはっぱ'},
];
export interface VisitGrowth {
  version:1|2; historicalVisits?:number; historicalThrough?:string; lastDate:string; streak:number; bestStreak:number; totalVisits:number;
  stage:MascotStage; highestStage:MascotStage; dates:string[];
  changedOn?:string; change?:'evolved'|'returned';
}
export function civilDay(date:string):number {
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return NaN;
  const n=Date.parse(date+'T12:00:00Z');
  return Number.isFinite(n)&&new Date(n).toISOString().slice(0,10)===date?Math.floor(n/86400000):NaN;
}
export function shiftDay(date:string,by:number):string {
  const n=civilDay(date);if(!Number.isFinite(n))throw Error('日付を確認できません');
  return new Date((n+by)*86400000).toISOString().slice(0,10);
}
export function readVisitGrowth(raw:unknown):VisitGrowth|null {
  if(!raw||typeof raw!=='object')return null;
  const v=raw as VisitGrowth,known=(s:unknown)=>VISIT_STAGES.some(x=>x.stage===s);
  if((v.version!==1&&v.version!==2)||!Number.isFinite(civilDay(v.lastDate))||!known(v.stage)||!known(v.highestStage)
    ||![v.streak,v.bestStreak,v.totalVisits].every(n=>Number.isSafeInteger(n)&&n>=1)
    ||v.bestStreak<v.streak||v.totalVisits<v.bestStreak
    ||VISIT_STAGES.findIndex(x=>x.stage===v.highestStage)<VISIT_STAGES.findIndex(x=>x.stage===v.stage)
    ||!Array.isArray(v.dates)||v.dates.some(d=>!Number.isFinite(civilDay(d))||d>v.lastDate))return null;
  const dates=[...new Set(v.dates)].sort();
  if(!dates.length||dates.at(-1)!==v.lastDate||dates.length>v.totalVisits)return null;
  const historicalVisits=v.version===2?v.historicalVisits:Math.max(0,v.totalVisits-dates.length);
  if(!Number.isSafeInteger(historicalVisits)||historicalVisits!<0)return null;
  if(v.version===2&&v.totalVisits!==historicalVisits!+dates.length)return null;
  const historicalThrough=historicalVisits!>0?(v.version===2?v.historicalThrough:undefined)??shiftDay(dates[0],-1):undefined;
  if(historicalThrough&&(!Number.isFinite(civilDay(historicalThrough))||historicalThrough>=dates[0]))return null;
  const earned=VISIT_STAGES.findLastIndex(x=>v.totalVisits>=x.days);
  const highest=Math.max(earned,VISIT_STAGES.findIndex(x=>x.stage===v.highestStage));
  const stage=VISIT_STAGES[highest].stage;
  if(v.version===2&&v.stage===stage&&v.highestStage===stage&&v.historicalThrough===historicalThrough&&dates.length===v.dates.length&&dates.every((d,i)=>v.dates[i]===d))return v;
  const {change,changedOn,...rest}=v;
  return {...rest,version:2,historicalVisits,historicalThrough,dates,stage,highestStage:stage};
}
export function legacyStage(level:number):MascotStage {
  return level>=15?'stage4':level>=6?'stage3':level>=3?'odango':'egg';
}
export function advanceVisit(raw:unknown,today:string,previousLevel=1):VisitGrowth {
  if(!Number.isFinite(civilDay(today)))throw Error('日付を確認できません');
  const current=readVisitGrowth(raw);
  if(raw!=null&&!current)throw Error('会えた日の記録を読み込めませんでした');
  if(!current){
    // Existing users keep their actual form. Do not invent earlier login dates.
    const stage=legacyStage(previousLevel);
    return {version:2,historicalVisits:0,lastDate:today,streak:1,bestStreak:1,totalVisits:1,stage,highestStage:stage,dates:[today]};
  }
  const gap=civilDay(today)-civilDay(current.lastDate);
  // Reloads, concurrent tabs and clock rollback never grant additional attendance.
  if(gap<=0)return current;
  const streak=gap===1?current.streak+1:1;
  const previous=VISIT_STAGES.findIndex(x=>x.stage===current.stage);
  const earned=VISIT_STAGES.findLastIndex(x=>current.totalVisits+1>=x.days);
  const next=Math.max(previous,earned,VISIT_STAGES.findIndex(x=>x.stage===current.highestStage));
  const highest=Math.max(next,VISIT_STAGES.findIndex(x=>x.stage===current.highestStage));
  return {...current,lastDate:today,streak,bestStreak:Math.max(streak,current.bestStreak),
    totalVisits:current.totalVisits+1,stage:VISIT_STAGES[next].stage,highestStage:VISIT_STAGES[highest].stage,
    dates:[...new Set([...current.dates,today])].sort(),
    ...(next!==previous?{changedOn:today,change:'evolved' as const}:{}),
  };
}
export function nextVisitStage(state:VisitGrowth|null){
  return VISIT_STAGES[VISIT_STAGES.findIndex(x=>x.stage===(state?.stage??'egg'))+1]??null;
}
/** Union dated visits across devices; unknown legacy history is counted once.
 * Growth is permanent, including forms earned before this version. */
export function mergeVisitGrowth(cloud:unknown,local:unknown):VisitGrowth|undefined {
  const a=readVisitGrowth(cloud),b=readVisitGrowth(local);
  if(!a)return b??undefined;if(!b)return a;
  // Old clients truncated their dated ledger. Move both snapshots to the same
  // history boundary before unioning dates, so a stale client's old dates are
  // not added again to the newer client's already-counted historical visits.
  const historicalThrough=[a.historicalThrough,b.historicalThrough].filter((d):d is string=>!!d).sort().at(-1);
  const throughBoundary=(v:VisitGrowth)=>(v.historicalVisits??0)+v.dates.filter(d=>historicalThrough&&d<=historicalThrough).length;
  const historicalVisits=Math.max(throughBoundary(a),throughBoundary(b));
  const dates=[...new Set([...a.dates,...b.dates])].filter(d=>!historicalThrough||d>historicalThrough).sort();
  const totalVisits=historicalVisits+dates.length,lastDate=a.lastDate>b.lastDate?a.lastDate:b.lastDate;
  let streak=0;while(dates.includes(shiftDay(lastDate,-streak)))streak++;
  const highest=Math.max(VISIT_STAGES.findLastIndex(x=>totalVisits>=x.days),
    VISIT_STAGES.findIndex(x=>x.stage===a.highestStage),VISIT_STAGES.findIndex(x=>x.stage===b.highestStage));
  const latest=a.lastDate>=b.lastDate?a:b;
  return {...latest,version:2,historicalVisits,historicalThrough,totalVisits,dates,lastDate,streak:Math.max(1,streak),
    bestStreak:Math.max(streak,a.bestStreak,b.bestStreak),stage:VISIT_STAGES[highest].stage,highestStage:VISIT_STAGES[highest].stage};
}
export function moodDays(records:readonly {date:string;mood:number}[],today:string,count=7){
  const byDate=new Map(records.filter(r=>Number.isInteger(r.mood)&&r.mood>=1&&r.mood<=5).map(r=>[r.date,r.mood]));
  return Array.from({length:count},(_,i)=>{const date=shiftDay(today,i-count+1);return {date,mood:byDate.get(date)??null};});
}
