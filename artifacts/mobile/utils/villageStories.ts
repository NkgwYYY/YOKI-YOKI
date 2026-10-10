import type {FeedState} from '../contexts/AppContext';
import type {StorageEntry} from './recoverableStorage';
import type {WorldMapId} from './worldMaps';
import {VILLAGE_STORIES,villageStory,type StoryId} from '../data/villageStories';

export type StoryReceipt={date:string;choice:0|1;bowlingPins?:number};
export type VillageStoryState={version:1;arcs:Partial<Record<StoryId,{episodes:StoryReceipt[]}>>};
export type StoryOperation={id:StoryId;episode:number;choice:0|1;place:WorldMapId};
const FEED_KEY='@mentore/feed_state_v1';
function validDate(s:unknown):s is string{return typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s;}
export function readVillageStories(raw:unknown):VillageStoryState{
 if(raw==null)return {version:1,arcs:{}};
 const s=raw as VillageStoryState;
 if(s.version!==1||!s.arcs||typeof s.arcs!=='object'||Array.isArray(s.arcs))throw Error('物語の記録を読み込めませんでした');
 for(const [id,arc] of Object.entries(s.arcs)){
  const definition=VILLAGE_STORIES.find(st=>st.id===id);
  if(!definition||!arc||!Array.isArray(arc.episodes)||arc.episodes.length>definition.episodes.length)throw Error('物語の記録を読み込めませんでした');
  for(const [i,r] of arc.episodes.entries())if(!r||!validDate(r.date)||(r.choice!==0&&r.choice!==1)||(i>0&&r.date<=arc.episodes[i-1].date)||(r.bowlingPins!==undefined&&(!Number.isInteger(r.bowlingPins)||r.bowlingPins<0||r.bowlingPins>10)))throw Error('物語の記録を読み込めませんでした');
 }
 return s;
}
export function storyFinished(state:VillageStoryState|undefined,id:StoryId){return state?.arcs[id]?.episodes.length===villageStory(id).episodes.length;}
export function storyUnlocked(state:VillageStoryState|undefined,id:StoryId){return villageStory(id).requires.every(required=>storyFinished(state,required));}
export function storyStatus(state:VillageStoryState,id:StoryId,today:string){
 const receipts=state.arcs[id]?.episodes??[],story=villageStory(id),index=receipts.length;
 const latest=Object.values(state.arcs).flatMap(a=>a?.episodes.map(e=>e.date)??[]).sort().at(-1);
 return {index,finished:index===story.episodes.length,unlocked:storyUnlocked(state,id),waiting:!!receipts.length&&receipts[index-1].date>=today,clockBlocked:!!latest&&latest>today,episode:story.episodes[index]};
}
/** Progress and permanent unlocks live in the existing, cloud-backed feed journal. */
export function prepareVillageStory(values:Record<string,string|null>,op:StoryOperation,today:string,fallback:FeedState){
 if(!validDate(today))throw Error('端末の日付を確認してください');
 const feed:FeedState=values[FEED_KEY]?JSON.parse(values[FEED_KEY]!):fallback;
 if(!feed||!Number.isFinite(feed.points))throw Error('保存データを確認できません');
 const state=readVillageStories(feed.villageStories),story=villageStory(op.id),status=storyStatus(state,op.id,today);
 if(!Number.isInteger(op.episode)||op.episode<0||op.episode>=story.episodes.length||(op.choice!==0&&op.choice!==1))throw Error('選択を確認できません');
 const previous=state.arcs[op.id]?.episodes[op.episode];
 // Replayed taps and recovered writes return the original choice, never a second reward.
 if(previous)return {entries:[] as StorageEntry[],result:{feed,state,receipt:previous,changed:false}};
 if(!status.unlocked)throw Error('先のお話を終えると始められます');
 if(status.clockBlocked)throw Error('端末の日付を確認して、もう一度開いてね');
 if(status.index!==op.episode)throw Error('物語の続きが変わりました。一度開き直してね');
 if(status.waiting)throw Error('今日のお話はここまで。続きは明日以降、いつでも読めます');
 const episode=story.episodes[op.episode];
 if(episode.place!==op.place)throw Error('お話の場所へ行ってみよう');
 const receipt:StoryReceipt={date:today,choice:op.choice};
 if(episode.bowl){
  const bowling=values['@yoki/bowling_v1']?JSON.parse(values['@yoki/bowling_v1']!):{plays:{}};
  const plays=Object.values(bowling.plays??{}) as {date:string;pins:number}[];
  const todayPlays=plays.filter(p=>p?.date===today&&Number.isInteger(p.pins)&&p.pins>=0&&p.pins<=10);
  if(!todayPlays.length)throw Error('受付で今日の本番を1回遊んでから、戻ってきてね。倒した本数は問いません');
  receipt.bowlingPins=Math.max(...todayPlays.map(p=>p.pins));
 }
 const nextState:VillageStoryState={version:1,arcs:{...state.arcs,[op.id]:{episodes:[...(state.arcs[op.id]?.episodes??[]),receipt]}}};
 const next={...feed,villageStories:nextState};
 return {entries:[[FEED_KEY,JSON.stringify(next)]] as StorageEntry[],result:{feed:next,state:nextState,receipt,changed:true}};
}
