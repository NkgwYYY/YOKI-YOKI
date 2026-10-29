import type {DailyRecord} from '../contexts/AppContext';
import {personalGrowth,shiftDay} from './personalGrowth';
export const RADAR_AXES=[
 {key:'mood',label:'気分',min:1,max:5,outer:5,unit:'/5'},
 {key:'sleep',label:'睡眠',min:0,max:24,outer:12,unit:'時間'},
 {key:'meal',label:'食事',min:1,max:3,outer:3,unit:'/3'},
 {key:'exercise',label:'運動',min:1,max:3,outer:3,unit:'/3'},
 {key:'social',label:'人との関わり',min:1,max:3,outer:3,unit:'/3'},
] as const;
/** Geometry expresses recorded values, never an inferred health score. Missing values remain null. */
export function recordRadar(records:DailyRecord[],today:string){
 const unique=personalGrowth(records,today).leaves,currentStart=shiftDay(today,-6),previousStart=shiftDay(today,-13);
 const summarize=(rows:DailyRecord[])=>RADAR_AXES.map(axis=>{
  const values=rows.flatMap(row=>{const value=row[axis.key];if(typeof value!=='number'||!Number.isFinite(value)||value<axis.min||value>axis.max)return [];
   if(axis.key==='sleep'&&(row.sleepRecorded===false||(row.sleepRecorded!==true&&value===0)))return [];
   if(axis.key!=='sleep'&&!Number.isInteger(value))return [];return [value];});
  const value=values.length?values.reduce((sum,n)=>sum+n,0)/values.length:null;
  return {...axis,value,count:values.length,fraction:value===null?null:Math.min(1,value/axis.outer)};
 });
 return {current:summarize(unique.filter(r=>r.date>=currentStart)),previous:summarize(unique.filter(r=>r.date>=previousStart&&r.date<currentStart))};
}
