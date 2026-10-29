import type {UserProgress} from '../contexts/AppContext';
import type {VillageStoryState} from './villageStories';

export const STORY_DESTINATIONS = [
  {id:'forest',story:'newcomer',episodes:1,name:'木もれびの森'},
  {id:'onsen',story:'newcomer',episodes:1,name:'森の温泉'},
  {id:'village',story:'newcomer',episodes:6,name:'となりの村'},
  {id:'lake',story:'cat',episodes:6,name:'星あかりの湖'},
] as const;
export type StoryDestination = typeof STORY_DESTINATIONS[number]['id'];
export type WorldAccess = {version:1;unlocked:StoryDestination[]};
type Progress = Pick<Partial<UserProgress>,'level'|'worldAccess'>;
const known=(id:unknown):id is StoryDestination=>STORY_DESTINATIONS.some(p=>p.id===id);
export function readWorldAccess(raw:unknown):WorldAccess|null {
  const value=raw as WorldAccess|undefined;
  if(!value||value.version!==1||!Array.isArray(value.unlocked)||!value.unlocked.every(known))return null;
  return {version:1,unlocked:STORY_DESTINATIONS.filter(p=>value.unlocked.includes(p.id)).map(p=>p.id)};
}
/** Old levels are read once, solely to retain places an existing player could enter. */
export function worldAccessFor(progress:Progress,stories?:VillageStoryState):WorldAccess {
  const saved=readWorldAccess(progress.worldAccess);
  const legacy=progress.worldAccess==null?STORY_DESTINATIONS.filter(p=>(progress.level??1)>=({forest:3,onsen:3,village:4,lake:6}[p.id])).map(p=>p.id):[];
  const earned=STORY_DESTINATIONS.filter(p=>(stories?.arcs[p.story]?.episodes.length??0)>=p.episodes).map(p=>p.id);
  return {version:1,unlocked:STORY_DESTINATIONS.filter(p=>[...(saved?.unlocked??legacy),...earned].includes(p.id)).map(p=>p.id)};
}
export function retainWorldAccess(progress:UserProgress,stories?:VillageStoryState):UserProgress {
  if(progress.worldAccess!=null&&!readWorldAccess(progress.worldAccess))throw Error('おでかけの記録を読み込めませんでした');
  const worldAccess=worldAccessFor(progress,stories);
  return JSON.stringify(worldAccess)===JSON.stringify(progress.worldAccess)?progress:{...progress,worldAccess};
}
export function mergeWorldAccess(cloud:Progress,local:Progress,cloudStories?:VillageStoryState,localStories?:VillageStoryState):WorldAccess {
  for(const saved of [cloud.worldAccess,local.worldAccess])if(saved!=null&&!readWorldAccess(saved))throw Error('おでかけの記録を読み込めませんでした');
  const ids=[...worldAccessFor(cloud,cloudStories).unlocked,...worldAccessFor(local,localStories).unlocked];
  return {version:1,unlocked:STORY_DESTINATIONS.filter(p=>ids.includes(p.id)).map(p=>p.id)};
}
export function mapUnlockHint(id:string,stories?:VillageStoryState):string {
  if(id==='forest'||id==='onsen')return 'こもれび広場で、荷物を抱えたもふもふに話しかけよう';
  if(id==='village')return '「となりに、きみが来た」を最後まで読むと、道がひらきます';
  if(id==='lake')return (stories?.arcs.newcomer?.episodes.length??0)<6
    ? 'まず「となりに、きみが来た」を読み終え、占い館の猫に会いに行こう'
    : '「占い猫にも、わからない」を最後まで読むと、道がひらきます';
  if(id==='grandma')return '広場のおばあさんとお話しして、お茶に招かれよう';
  return '村での出会いを、少しずつ重ねよう';
}
