import type {MascotStage} from './mascotUtils';

/** Visits are distinct from diary streaks and earned XP. Dates are device-local civil days. */
export const VISIT_STAGES: {stage:MascotStage;days:number;name:string}[] = [
  {stage:'egg',days:1,name:'たまご'}, {stage:'odango',days:3,name:'モフモフ'},
  {stage:'stage3',days:10,name:'はっぱ'}, {stage:'stage4',days:30,name:'カラフルはっぱ'},
];
export interface VisitGrowth {
  version:1; lastDate:string; streak:number; bestStreak:number; totalVisits:number;
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
  if(v.version!==1||!Number.isFinite(civilDay(v.lastDate))||!known(v.stage)||!known(v.highestStage)
    ||![v.streak,v.bestStreak,v.totalVisits].every(n=>Number.isSafeInteger(n)&&n>=1)
    ||v.bestStreak<v.streak||v.totalVisits<v.bestStreak
    ||VISIT_STAGES.findIndex(x=>x.stage===v.highestStage)<VISIT_STAGES.findIndex(x=>x.stage===v.stage)
    ||!Array.isArray(v.dates)||v.dates.some(d=>!Number.isFinite(civilDay(d))||d>v.lastDate))return null;
  return v;
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
    return {version:1,lastDate:today,streak:1,bestStreak:1,totalVisits:1,stage,highestStage:stage,dates:[today]};
  }
  const gap=civilDay(today)-civilDay(current.lastDate);
  // Reloads, concurrent tabs and clock rollback never grant additional attendance.
  if(gap<=0)return current;
  const streak=gap===1?current.streak+1:1;
  const previous=VISIT_STAGES.findIndex(x=>x.stage===current.stage);
  const earned=VISIT_STAGES.findLastIndex(x=>streak>=x.days);
  const next=gap>1?Math.max(0,previous-1):Math.max(previous,earned);
  const highest=Math.max(next,VISIT_STAGES.findIndex(x=>x.stage===current.highestStage));
  return {...current,lastDate:today,streak,bestStreak:Math.max(streak,current.bestStreak),
    totalVisits:current.totalVisits+1,stage:VISIT_STAGES[next].stage,highestStage:VISIT_STAGES[highest].stage,
    dates:[...new Set([...current.dates,today])].filter(d=>civilDay(today)-civilDay(d)<366).sort(),
    ...(next!==previous?{changedOn:today,change:next>previous?'evolved' as const:'returned' as const}:{}),
  };
}
export function nextVisitStage(state:VisitGrowth|null){
  return VISIT_STAGES[VISIT_STAGES.findIndex(x=>x.stage===(state?.stage??'egg'))+1]??null;
}
/** Cloud merge must not resurrect a previous form after a break. Latest observed day wins. */
export function mergeVisitGrowth(cloud:unknown,local:unknown):VisitGrowth|undefined {
  const a=readVisitGrowth(cloud),b=readVisitGrowth(local);
  if(!a)return b??undefined;if(!b)return a;
  if(a.lastDate!==b.lastDate)return a.lastDate>b.lastDate?a:b;
  return a.totalVisits>=b.totalVisits?a:b;
}
export function moodDays(records:readonly {date:string;mood:number}[],today:string,count=7){
  const byDate=new Map(records.filter(r=>Number.isInteger(r.mood)&&r.mood>=1&&r.mood<=5).map(r=>[r.date,r.mood]));
  return Array.from({length:count},(_,i)=>{const date=shiftDay(today,i-count+1);return {date,mood:byDate.get(date)??null};});
}
