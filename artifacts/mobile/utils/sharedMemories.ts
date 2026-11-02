import type {ExchangeDiaryState} from './exchangeDiary';
import {readVisitGrowth} from './visitGrowth.ts';
/** Only persisted events become memories. Merely opening a diary isn't writing one. */
export function sharedMemories(diary:ExchangeDiaryState|undefined,visits:unknown,lastFeedTime:string){
 const written=Object.values(diary?.pages??{}).filter(p=>p.user&&/^\d{4}-\d{2}-\d{2}$/.test(p.date)).sort((a,b)=>a.date.localeCompare(b.date));
 const fedAt=lastFeedTime?new Date(lastFeedTime):null;
 return {firstDiary:written[0]??null,latestDiary:written.at(-1)??null,diaryCount:written.length,visitDays:readVisitGrowth(visits)?.totalVisits??0,lastMeal:fedAt&&Number.isFinite(fedAt.getTime())?fedAt:null};
}
