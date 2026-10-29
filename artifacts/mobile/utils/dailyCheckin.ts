import type {DailyRecord} from '../contexts/AppContext';
import {personalGrowth,MOOD_LABELS,shiftDay} from './personalGrowth';
export function dailyCheckin(records:DailyRecord[],today:string){
 const growth=personalGrowth(records,today),current=growth.leaves.find(r=>r.date===today);
 const recent=growth.week.flatMap(d=>d.record?[d.record]:[]),previous=growth.leaves.filter(r=>r.date>=shiftDay(today,-13)&&r.date<shiftDay(today,-6));
 const mean=(rows:DailyRecord[])=>rows.length?rows.reduce((n,r)=>n+r.mood,0)/rows.length:null;
 const average=mean(recent),priorAverage=mean(previous);
 const sleep=recent.filter(r=>r.sleepRecorded!==false&&Number.isFinite(r.sleep)&&(r.sleepRecorded===true?r.sleep>=0:r.sleep>0)&&r.sleep<=24);
 const sleepAverage=sleep.length?sleep.reduce((n,r)=>n+r.sleep,0)/sleep.length:null;
 const delta=recent.length>=2&&previous.length>=2?Number((average!-priorAverage!).toFixed(1)):null;
 const action=!current?{title:'まず、今の気分を選ぶ',detail:'下の顔をひとつ押すと、今日の記録になります。',kind:'mood' as const}:
 current.mood<=2?{title:'いったん手を止めて休む',detail:'飲み物を用意して、5分だけ予定を入れない時間を。',kind:'rest' as const}:
 sleepAverage!==null&&sleepAverage<6?{title:'今夜、寝る時間を決めておく',detail:`記録した${sleep.length}日間の睡眠は平均${sleepAverage.toFixed(1)}時間。今日は少し早めに休む準備を。`,kind:'sleep' as const}:
 {title:'今日できたことを一つ残す',detail:'「ごはんを食べた」くらい短くて大丈夫。日記に一言だけ。',kind:'diary' as const};
 return {...growth,current,average,delta,sleepAverage,sleepCount:sleep.length,action,moodLabel:current?MOOD_LABELS[current.mood]:'未記録'};
}
