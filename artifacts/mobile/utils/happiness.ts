import type {FeedState} from '../contexts/AppContext';
import type {StorageEntry} from './recoverableStorage';
import {settleSmoking,type SmokingState} from './smokingState';

export const HAPPY_REWARDS={visit:24,record:12,ramen:6,bath:18,homeBath:4,meal:3} as const;
export type HappyAction=keyof typeof HAPPY_REWARDS;
export type HappinessState={value:number;updatedOn:string;updatedAt?:number;lastSeenAt?:number;days:Record<string,HappyAction[]>;smoking?:SmokingState;smokingRetired?:true};
const HOUR=3600000,DAY=24*HOUR;
const validTime=(value:unknown):value is number=>typeof value==='number'&&Number.isFinite(value)&&value>=0;
const validDate=(value:unknown):value is string=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value));
export function readHappiness(raw:unknown,today:string,now=Date.now()):HappinessState {
  if(!validDate(today))throw new Error('Invalid happiness date');
  const input=raw as Partial<HappinessState>|null;
  if(!validTime(now))throw new Error('Invalid happiness time');
  const value=typeof input?.value==='number'&&Number.isFinite(input.value)?Math.max(0,Math.min(100,input.value)):40;
  const days:Record<string,HappyAction[]>={};
  if(input?.days&&typeof input.days==='object')for(const [date,actions] of Object.entries(input.days)) {
    if(validDate(date)&&Array.isArray(actions))days[date]=[...new Set(actions.filter((a):a is HappyAction=>Object.hasOwn(HAPPY_REWARDS,a)))];
  }
  // Migrate older saves at their current value; never invent an old visit time.
  // Keep partial hours so frequent reads/writes cannot cancel elapsed decay.
  const updatedOn=validDate(input?.updatedOn)?input.updatedOn:today;
  const previousAt=validTime(input?.updatedAt)?input.updatedAt:now;
  const lastSeenAt=validTime(input?.lastSeenAt)?input.lastSeenAt:previousAt;
  const hours=Math.max(0,Math.floor((now-previousAt)/HOUR));
  const updatedAt=previousAt+hours*HOUR;
  const unattended=(at:number)=>Math.max(0,Math.floor((at-lastSeenAt-DAY)/HOUR));
  const loss=hours+unattended(updatedAt)-unattended(previousAt);
  const retired=input?.smokingRetired===true;
  const settled=input?.smoking&&!retired?settleSmoking(input.smoking,now):null;
  return {value:Math.max(0,Math.round(value-loss-(settled?.loss??0))),updatedAt,lastSeenAt,updatedOn:updatedOn>today?updatedOn:today,days,...(retired?{smoking:input?.smoking,smokingRetired:true as const}:settled?{smoking:settled.state}:{})};
}
export function grantHappiness(raw:unknown,action:HappyAction,today:string,now=Date.now()) {
  if(!Object.hasOwn(HAPPY_REWARDS,action))throw new Error('Invalid happiness action');
  const state=readHappiness(raw,today,now);
  if(state.updatedOn>today||state.updatedAt! > now||state.lastSeenAt! > now)return {state,gained:0,newlyGranted:false};
  state.lastSeenAt=now;
  if(state.days[today]?.includes(action))return {state,gained:0,newlyGranted:false};
  const value=Math.min(100,state.value+HAPPY_REWARDS[action]);
  const days={...state.days,[today]:[...(state.days[today]??[]),action]};
  const retained=Object.fromEntries(Object.entries(days).sort(([a],[b])=>b.localeCompare(a)).slice(0,32));
  return {state:{...state,value,updatedOn:today,days:retained},gained:value-state.value,newlyGranted:true};
}
export function prepareHappiness(values:Record<string,string|null>,action:HappyAction,today:string,defaultFeed:FeedState,now=Date.now(),eventId?:string) {
  const key='@mentore/feed_state_v1';
  const feed:FeedState=values[key]?JSON.parse(values[key]!):defaultFeed;
  if(!feed||!Number.isFinite(feed.points)||feed.points<0)throw new Error('データを確認できません');
  const reward=grantHappiness(feed.happiness,action,today,now);
  const changed=reward.newlyGranted||JSON.stringify(reward.state)!==JSON.stringify(feed.happiness);
  const next={...feed,happiness:reward.state};
  const entries:StorageEntry[]=changed?[[key,JSON.stringify(next)]]:[];
  return {entries,result:{feed:changed?next:feed,...reward,changed}};
}

/** Checkpoint presence in the foreground, regardless of the current screen. */
export function prepareHappinessVisit(values:Record<string,string|null>,today:string,defaultFeed:FeedState,now:number){
  const feed:FeedState=values['@mentore/feed_state_v1']?JSON.parse(values['@mentore/feed_state_v1']!):defaultFeed;
  const last=feed?.happiness?.lastSeenAt;
  if(validTime(last)&&validTime(feed.happiness?.updatedAt)&&now-last<15*60000&&feed.happiness?.days?.[today]?.includes('visit'))return null;
  return prepareHappiness(values,'visit',today,defaultFeed,now);
}
