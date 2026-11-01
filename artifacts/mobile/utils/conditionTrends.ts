import type {DailyRecord} from '../contexts/AppContext';
export type ConditionKey='mood'|'fatigue'|'worry';
export const CONDITION_LABELS={
 mood:['未記録','つらい','しんどい','ふつう','いい感じ','うれしい'],
 fatigue:['未記録','ない','少しある','強い'],
 worry:['未記録','ない','少しある','多い'],
} as const;
export const CONDITION_TITLES={mood:'気分',fatigue:'からだの疲れ',worry:'心配ごと'} as const;
export function conditionValue(record:Partial<DailyRecord>|undefined,key:ConditionKey):number|null{
 const v=record?.[key],max=key==='mood'?5:3;
 return typeof v==='number'&&Number.isInteger(v)&&v>=1&&v<=max?v:null;
}
export function conditionLabel(record:Partial<DailyRecord>|undefined,key:ConditionKey){return CONDITION_LABELS[key][conditionValue(record,key)??0];}
/** Calendar-day spacing, including missing days; no interpolation or filled-in scores. */
export function conditionDays(records:DailyRecord[],end:string,count:number){
 const map=new Map(records.map(r=>[r.date,r]));
 const anchor=new Date(`${end}T12:00:00Z`);
 return Array.from({length:count},(_,i)=>{
  const d=new Date(anchor);d.setUTCDate(d.getUTCDate()-count+1+i);
  const date=d.toISOString().slice(0,10);return {date,record:map.get(date)};
 });
}
export function conditionSummary(record:Partial<DailyRecord>|undefined){
 const good:string[]=[],concern:string[]=[];
 for(const key of ['mood','fatigue','worry'] as const){
  const v=conditionValue(record,key);if(v===null)continue;
  if(key==='mood'?v>=4:v===1)good.push(CONDITION_TITLES[key]);
  if(key==='mood'?v<=2:v===3)concern.push(CONDITION_TITLES[key]);
 }
 return {good,concern};
}
export function conditionChange(days:ReturnType<typeof conditionDays>,key:ConditionKey){
 const values=days.map(d=>conditionValue(d.record,key)).filter((v):v is number=>v!==null);
 if(values.length<2)return '記録が増えると比べられます';
 const delta=values[values.length-1]-values[values.length-2];
 if(delta===0)return '前回と同じ';
 return '前回より'+(key==='mood'?(delta>0?'上向き':'下向き'):key==='fatigue'?(delta>0?'強い':'軽い'):(delta>0?'多い':'少ない'));
}
