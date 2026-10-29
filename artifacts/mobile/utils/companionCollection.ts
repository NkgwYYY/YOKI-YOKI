import type {FeedState,RoomCustomization,UserProgress} from '../contexts/AppContext';
import type {BowlingState} from './bowling';
import type {StorageEntry} from './recoverableStorage';
export const KEEPSAKES = [
 {id:'cushion',name:'おひるねクッション',hint:'累計7日、一緒に過ごす',story:'きみのとなりが、いちばん落ち着く場所になった。',kind:'cushion',days:7},
 {id:'flower',name:'小さな花の贈りもの',hint:'累計14日、一緒に過ごす',story:'きみに見せたくて、大切に持って帰ってきたお花。',kind:'flower',days:14},
 {id:'lamp',name:'おかえりの星あかり',hint:'累計30日、一緒に過ごす',story:'帰ってくる場所に、小さな星をひとつ。',kind:'lamp',days:30},
 {id:'quilt',name:'パッチワーク',hint:'累計60日、一緒に過ごす',story:'いろんな日の色を、ひと針ずつつないだ毛布。',kind:'quilt',days:60},
 {id:'musicbox',name:'オルゴール',hint:'累計100日、一緒に過ごす',story:'なんでもない日も、ふたりの大切な思い出。',kind:'musicbox',days:100},
 {id:'trophy',name:'ころころトロフィー',hint:'ボウリングでストライク、または今日のお題に成功',story:'ころころ転がった先で、一緒に喜んだ日の記念。',kind:'trophy',days:0},
 {id:'planter',name:'おばあさんの鉢植え',hint:'畑で初めての収穫',story:'「よく育てたねえ」おばあさんが分けてくれた苗。',kind:'planter',days:0},
 {id:'bowl',name:'店長の記念どんぶり',hint:'「まぼろしの一杯」を最後まで読む',story:'店長と考えた、あの一杯。おそろいの器をもらった。',kind:'bowl',days:0},
 {id:'photo',name:'はじまりのお茶会',hint:'「となりに、きみが来た」を最後まで読む',story:'少し照れた笑顔が並ぶ、はじめての記念写真。',kind:'photo',days:0},
] as const;
export type KeepsakeId=typeof KEEPSAKES[number]['id'];
export function knownKeepsake(id:unknown):id is KeepsakeId{return KEEPSAKES.some(k=>k.id===id);}
export function collectionIds(raw:unknown):KeepsakeId[]{return Array.isArray(raw)?[...new Set(raw.filter(knownKeepsake))]:[];}
export function earnedKeepsakes(progress:UserProgress,feed:FeedState,bowling:BowlingState):KeepsakeId[]{
 const days=progress.visits?.totalVisits??0;
 return KEEPSAKES.filter(k=>k.days?days>=k.days:
   k.id==='trophy'?Object.values(bowling.plays??{}).some(p=>p.pins===10||p.missionComplete===true):
   k.id==='planter'?(feed.vegetableGarden?.harvests??0)>0:
   k.id==='bowl'?feed.villageStories?.arcs?.ramen?.episodes?.length===6:
   k.id==='photo'?feed.villageStories?.arcs?.newcomer?.episodes?.length===6:false).map(k=>k.id);
}
const ROOM='@mentore/room_customization_v1';
/** Reward ownership and display selection share the existing recoverable room journal. */
export function prepareCollection(values:Record<string,string|null>,selection?:KeepsakeId|'none'){
 const room:RoomCustomization=values[ROOM]?JSON.parse(values[ROOM]!):{furniture:'none',flower:'none',ownedFurniture:[],ownedFlowers:[]};
 if(!room||!Array.isArray(room.ownedFurniture)||!Array.isArray(room.ownedFlowers))throw Error('お部屋の記録を確認できません');
 const progress=JSON.parse(values['@mentore/progress_v2']??'{}'),feed=JSON.parse(values['@mentore/feed_state_v1']??'{}'),bowling=JSON.parse(values['@yoki/bowling_v1']??'{"plays":{}}');
 const keepsakes=[...new Set([...collectionIds(room.keepsakes),...earnedKeepsakes(progress,feed,bowling)])];
 if(selection&&selection!=='none'&&!keepsakes.includes(selection))throw Error('この思い出は、これから。');
 const displayedKeepsake=selection??(room.displayedKeepsake==='none'?'none':keepsakes.includes(room.displayedKeepsake as KeepsakeId)?room.displayedKeepsake:keepsakes[0]??'none');
 const next={...room,keepsakes,displayedKeepsake};
 const changed=JSON.stringify(room)!==JSON.stringify(next);
 return {entries:changed?[[ROOM,JSON.stringify(next)]] as StorageEntry[]:[],result:{room:next,changed}};
}
export function bondDescription(days:number){
 return days>=60?'何気ない時間も、ふたりの宝物。':days>=30?'きみの帰りを、楽しみにしている。':days>=14?'となりで過ごすのが、好きになった。':days>=7?'きみのいる暮らしに、慣れてきた。':'少しずつ、きみのことを覚えている。';
}
