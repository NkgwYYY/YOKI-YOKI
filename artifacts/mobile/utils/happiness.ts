import type {FeedState} from '../contexts/AppContext';
import type {StorageEntry} from './recoverableStorage';

export const HAPPY_REWARDS={visit:35,record:12,ramen:6,bath:18,homeBath:4,meal:3,smoke:2} as const;
export type HappyAction=keyof typeof HAPPY_REWARDS;
export type HappinessState={value:number;updatedOn:string;days:Record<string,HappyAction[]>};
const validDate=(value:unknown):value is string=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value));
export function readHappiness(raw:unknown,today:string):HappinessState {
  if(!validDate(today))throw new Error('Invalid happiness date');
  const input=raw as Partial<HappinessState>|null;
  const value=typeof input?.value==='number'&&Number.isFinite(input.value)?Math.max(40,Math.min(100,input.value)):40;
  const days:Record<string,HappyAction[]>={};
  if(input?.days&&typeof input.days==='object')for(const [date,actions] of Object.entries(input.days)) {
    if(validDate(date)&&Array.isArray(actions))days[date]=[...new Set(actions.filter((a):a is HappyAction=>Object.hasOwn(HAPPY_REWARDS,a)))];
  }
  // Do not punish missed visits or reset happiness at midnight. It settles gently toward 40.
  const updatedOn=validDate(input?.updatedOn)?input.updatedOn:today;
  const elapsed=Math.max(0,Math.floor((Date.parse(today)-Date.parse(updatedOn))/86400000));
  return {value:Math.max(40,Math.round(value-elapsed*4)),updatedOn:updatedOn>today?updatedOn:today,days};
}
export function grantHappiness(raw:unknown,action:HappyAction,today:string) {
  if(!Object.hasOwn(HAPPY_REWARDS,action))throw new Error('Invalid happiness action');
  const state=readHappiness(raw,today);
  if(state.updatedOn>today||state.days[today]?.includes(action))return {state,gained:0,newlyGranted:false};
  const value=Math.min(100,state.value+HAPPY_REWARDS[action]);
  const days={...state.days,[today]:[...(state.days[today]??[]),action]};
  const retained=Object.fromEntries(Object.entries(days).sort(([a],[b])=>b.localeCompare(a)).slice(0,32));
  return {state:{value,updatedOn:today,days:retained},gained:value-state.value,newlyGranted:true};
}
export function prepareHappiness(values:Record<string,string|null>,action:HappyAction,today:string,defaultFeed:FeedState,now=Date.now(),eventId?:string) {
  const key='@mentore/feed_state_v1';
  const feed:FeedState=values[key]?JSON.parse(values[key]!):defaultFeed;
  if(!feed||!Number.isFinite(feed.points)||feed.points<0)throw new Error('データを確認できません');
  const reward=grantHappiness(feed.happiness,action,today);
  const bathing=action==='bath'||action==='homeBath';
  const old=feed.hygiene??{lastBathAt:now,protectedUntil:0};
  const smokeKey=eventId||`daily-smoke-${today}`;
  const smoked=action==='smoke'&&!old.smokeReceipts?.includes(smokeKey);
  const hygiene=bathing?{...old,lastBathAt:Math.max(now,old.lastBathAt),smokeDirt:0}:smoked?{...old,smokeDirt:Math.min(30,(old.smokeDirt??0)+3),smokeReceipts:[...(old.smokeReceipts??[]),smokeKey].slice(-40)}:feed.hygiene;
  const changed=reward.newlyGranted||bathing||smoked;
  const next={...feed,happiness:reward.state,...(hygiene?{hygiene}:{})};
  const entries:StorageEntry[]=changed?[[key,JSON.stringify(next)]]:[];
  return {entries,result:{feed:changed?next:feed,...reward,changed}};
}
