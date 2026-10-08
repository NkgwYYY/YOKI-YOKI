import type {FeedState} from '../contexts/AppContext';
import type {StorageEntry} from './recoverableStorage';

export const CLEANING_TOOLS={
  broom:{name:'ほうき',cost:20,description:'床をなぞって、ほこりをさっさっ。'},
  cloth:{name:'ぞうきん',cost:30,description:'広めにこすって、床をぴかぴかに。'},
  robot:{name:'ロボット掃除機',cost:180,description:'お部屋を自動でお掃除。乗って移動もできるよ。'},
} as const;
export type CleaningTool=keyof typeof CLEANING_TOOLS;
export type HousekeepingState={startedAt:number;updatedAt:number;owned:CleaningTool[];cleaned:Record<string,number>};
export const DUST_SPOTS=[{x:.42,y:.443},{x:.50,y:.445},{x:.59,y:.444},{x:.43,y:.474},{x:.51,y:.475},{x:.60,y:.478},{x:.42,y:.507},{x:.50,y:.508},{x:.62,y:.513},{x:.44,y:.54},{x:.53,y:.542},{x:.63,y:.54}];
const DAY=86400000;
export function readHousekeeping(raw:unknown,now:number):HousekeepingState {
  if(!Number.isFinite(now)||now<0)throw new Error('Invalid cleaning time');
  const data=raw as Partial<HousekeepingState>|undefined;
  const startedAt=Number.isFinite(data?.startedAt)&&data!.startedAt!>=0?data!.startedAt!:now;
  const updatedAt=Math.max(startedAt,Number.isFinite(data?.updatedAt)?data!.updatedAt!:startedAt);
  const cleaned:Record<string,number>={};
  for(let i=0;i<DUST_SPOTS.length;i++){const time=data?.cleaned?.[i];if(typeof time==='number'&&Number.isFinite(time)&&time>=startedAt)cleaned[i]=time;}
  const owned=Array.isArray(data?.owned)?[...new Set(data.owned.filter((id):id is CleaningTool=>Object.hasOwn(CLEANING_TOOLS,id)))]:[];
  return {startedAt,updatedAt,owned,cleaned};
}
export function roomDirt(state:HousekeepingState,now:number) {
  return DUST_SPOTS.map((_,i)=>{
    const age=Math.max(0,now-(state.cleaned[i]??state.startedAt));
    const delay=(6+i*3)*3600000;
    return Math.min(1,Math.max(0,(age-delay)/(3*DAY-delay)));
  });
}
export function sweptSpots(from:{x:number;y:number},to:{x:number;y:number},tool:CleaningTool) {
  const radius=tool==='cloth'?.062:tool==='robot'?.047:.037;
  const dx=to.x-from.x,dy=(to.y-from.y)*1.5,length=dx*dx+dy*dy;
  return DUST_SPOTS.flatMap((spot,i)=>{
    const px=spot.x-from.x,py=(spot.y-from.y)*1.5;
    const t=length?Math.max(0,Math.min(1,(px*dx+py*dy)/length)):0;
    return Math.hypot(px-t*dx,py-t*dy)<=radius?[i]:[];
  });
}
export type CleaningOperation={kind:'init'}|{kind:'bathSkip'}|{kind:'buy';tool:CleaningTool}|{kind:'clean';tool:CleaningTool;spots:number[]};
export function prepareCleaning(values:Record<string,string|null>,operation:CleaningOperation,now:number,defaultFeed:FeedState) {
  const key='@mentore/feed_state_v1';
  const feed:FeedState=values[key]?JSON.parse(values[key]!):defaultFeed;
  if(!feed||!Number.isFinite(feed.points)||feed.points<0)throw new Error('データを確認できません');
  const house=readHousekeeping(feed.housekeeping,now);
  let changed=!feed.housekeeping,spent=0,removed=0;
  let hygiene=feed.hygiene??{lastBathAt:now,protectedUntil:0};
  if(!feed.hygiene)changed=true;
  if(operation.kind==='bathSkip'){
    if(hygiene.protectedUntil<=now){
      spent=60;
      if(feed.points<spent)throw new Error('YOKIポイントが足りません');
      hygiene={...hygiene,lastBathAt:now,protectedUntil:now+7*DAY};changed=true;
    }
  }else if(operation.kind==='buy'){
    if(!Object.hasOwn(CLEANING_TOOLS,operation.tool))throw new Error('Unknown tool');
    if(!house.owned.includes(operation.tool)){
      spent=CLEANING_TOOLS[operation.tool].cost;
      if(feed.points<spent)throw new Error('YOKIポイントが足りません');
      house.owned.push(operation.tool);changed=true;
    }
  }else if(operation.kind==='clean'){
    if(!house.owned.includes(operation.tool))throw new Error('先にお店で道具を買ってね');
    const dirt=roomDirt(house,now);
    for(const spot of new Set(operation.spots))if(Number.isInteger(spot)&&spot>=0&&spot<DUST_SPOTS.length&&dirt[spot]>0){
      house.cleaned[spot]=Math.max(now,house.updatedAt);removed++;changed=true;
    }
  }
  if(changed)house.updatedAt=Math.max(now,house.updatedAt);
  const next=changed?{...feed,points:feed.points-spent,housekeeping:house,hygiene}:feed;
  const entries:StorageEntry[]=changed?[[key,JSON.stringify(next)]]:[];
  return {entries,result:{feed:next,changed,spent,removed}};
}
