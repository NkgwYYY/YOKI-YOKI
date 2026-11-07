import type {DailyRecord} from '../contexts/AppContext';
import {getPattern} from './moyamoyaContent.ts';

/** Only today's self-reported concern can offer a home return point. */
export function homeBattleEntry(record:DailyRecord|undefined,date:string){
  const m=record?.moyamoya,e=m?.battle;
  if(record?.date!==date||!m?.has||!e||m.pattern!==e.pattern||!getPattern(e.pattern))return null;
  if(!['invited','active','declined'].includes(e.status))return null;
  return {id:e.id,label:e.status==='active'||e.turns.length>0?'モヤモヤバトル｜つづきから':'モヤモヤバトル'};
}
