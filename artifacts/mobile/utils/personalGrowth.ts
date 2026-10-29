import type {DailyRecord} from '../contexts/AppContext';

export const MOOD_LABELS=['','つらい','しんどい','ふつう','いい感じ','うれしい'];
/** Calendar arithmetic at local noon avoids DST and UTC day shifts. */
export function shiftDay(date:string,offset:number){
 const [y,m,d]=date.split('-').map(Number), value=new Date(y,m-1,d+offset,12);
 return `${value.getFullYear()}-${String(value.getMonth()+1).padStart(2,'0')}-${String(value.getDate()).padStart(2,'0')}`;
}
export function personalGrowth(records:DailyRecord[],today:string){
 // A leaf is a recorded day, not a mood score or a login. Missing days are gaps.
 const unique=new Map<string,DailyRecord>();
 for(const record of records){
  if(/^\d{4}-\d{2}-\d{2}$/.test(record.date)&&record.date<=today&&shiftDay(record.date,0)===record.date&&Number.isInteger(record.mood)&&record.mood>=1&&record.mood<=5)unique.set(record.date,record);
 }
 const leaves=[...unique.values()].sort((a,b)=>a.date.localeCompare(b.date));
 const week=Array.from({length:7},(_,i)=>{const date=shiftDay(today,i-6);return {date,record:unique.get(date)};});
 const start=shiftDay(today,-6),previousStart=shiftDay(today,-13);
 const currentCount=leaves.filter(r=>r.date>=start).length;
 const previousCount=leaves.filter(r=>r.date>=previousStart&&r.date<start).length;
 const recent=leaves.at(-1);
 const review=!recent?'まだ記録はありません。気が向いたら、今の気分をひとつ。':
  currentCount===0?`これまでに${leaves.length}日分の気持ちが残っています。前の葉っぱも、ここにあるよ。`:
  `この7日間に、${currentCount}日分の気持ちを残せました。${recent.win?.trim()?'「'+recent.win.trim().slice(0,70)+'」も、大切なひとこま。':'気分がどんな日も、自分に目を向けた時間が残っています。'}`;
 return {leaves,week,currentCount,previousCount,review,recent};
}
export function dailyLetterKey(owner:string,date:string){return `@yoki/daily-letter/v1/${encodeURIComponent(owner)}/${date}`;}
