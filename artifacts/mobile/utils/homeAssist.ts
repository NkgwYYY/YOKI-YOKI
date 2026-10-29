import type {ExchangeDiaryState} from './exchangeDiary';
import {hasMoodForDay} from './firstSteps';

export type HomeAssist = {kind:'mood'|'diary'|'feed';text:string};

/** One relevant invitation, based on today's saved state. No backlog or completion quota. */
export function nextHomeAssist({date,record,diary,satiety,fedThisVisit=false}:{
  date:string;record?:{date:string;mood:number};diary?:ExchangeDiaryState;satiety:number;fedThisVisit?:boolean;
}):HomeAssist|null {
  if(!hasMoodForDay(record,date))return {kind:'mood',text:'今日の気分を記録しよう！'};
  const page=diary?.pages[date];
  const hungry=Number.isFinite(satiety)&&satiety<60&&!fedThisVisit;
  const meal:HomeAssist={kind:'feed',text:'お腹が空いてるみたい。\nごはんをあげよう！'};
  if(hungry&&satiety<25)return meal;
  if(!Number.isFinite(page?.letterReadAt))return {kind:'diary',text:page?.user
    ?'日記が届いてるよ。\n読んでみよう！'
    :'日記が届いてるよ。\n読んで、返事を書こう！'};
  if(hungry)return meal;
  if(!page?.user)return {kind:'diary',text:'今日のことをひとこと。\n日記の返事を書こう！'};
  return null;
}
