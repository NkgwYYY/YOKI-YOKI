import {VILLAGE_STORIES,type StoryId} from '../data/villageStories';
import {storyStatus,type VillageStoryState} from './villageStories';
import type {WorldMapId} from './worldMaps';

export type StoryMerchant='ramen'|'shop'|'job'|'bowling'|'fortune';
export type StoryEncounter={id:StoryId;index:number;key:string;place:WorldMapId;merchant?:StoryMerchant;stage:'egg'|'odango'|'stage3';point:{x:number;y:number};hint:string};
const merchants:Record<StoryId,(StoryMerchant|undefined)[]>={
 grandma:[],supply:['ramen'],newcomer:[],ramen:['ramen','ramen','job','ramen','ramen','ramen'],
 bowling:['bowling',undefined,undefined,undefined,'bowling'],
 cat:['fortune',undefined,'job','ramen','fortune','fortune'],
 festival:[undefined,'ramen','shop'],
};
const hints:Record<StoryId,string[]>={
 grandma:['あら、ころがっちゃった','この前は、ありがとうね','ふたつ、選ぼうかね','昔はね、畑をやってたの','道具、まだ使えそうだよ','うちへお茶においで'],
 supply:['畑の野菜、採れたんだって？'],
 newcomer:['この村、初めてで…','どっちがいいかな','ひとりだと、ちょっと…','少し、話してもいい？','お茶会に来ない？','来てくれたんだ！'],
 ramen:['うーん、新しい味…','味見、してくれる？','店長から聞いてるよ','ちょっと、聞いてくれよ','名前、決まったぞ','最初の注文だ！'],
 bowling:['小さな大会、開くんだ','ちょっと、どきどきする','今日は行けないかも…','旗、作ってるんだ','みんな待ってるよ','一緒に写ってるね'],
 cat:['鈴はどこへ…','紫のひもなら見たよ','鈴を探してるんだって？','落とし物なら、ここに','見つけてくれたんだね','君に、渡したいものが'],
 festival:['みんなでお祭りしよう','屋台の準備、するぞ','灯り、どの色がいい？','雨、やまないかな…','おかえり！','写真、できたよ'],
};
/** Discovery belongs to a place/person. In-progress encounters take priority over a new arc. */
export function storyEncounters(state:VillageStoryState,today:string,place:WorldMapId,harvested=false):StoryEncounter[]{
 return VILLAGE_STORIES.flatMap(st=>{
  const info=storyStatus(state,st.id,today);
  if((st.id==='supply'&&!harvested&&info.index===0)||!info.unlocked||info.finished||info.waiting||info.clockBlocked||info.episode.place!==place)return [];
  const merchant=merchants[st.id][info.index];
  return [{id:st.id,index:info.index,key:`${st.id}:${info.index}:${today}`,place,merchant,
   stage:st.id==='bowling'?'egg':st.id==='cat'?'stage3':'odango',
   point:st.id==='grandma'?(place==='market'?{x:.60,y:.715}:place==='ramen'?{x:.68,y:.68}:{x:.30,y:.63}):place==='market'?{x:.38,y:.66}:place==='ramen'?{x:.62,y:.58}:place==='bowling'?{x:.40,y:.61}:{x:.68,y:.61},
   hint:hints[st.id][info.index]} as StoryEncounter];
 }).sort((a,b)=>Number(b.index>0)-Number(a.index>0));
}
export function canHearStory(encounter:StoryEncounter,point:{x:number;y:number},busy:boolean,seen:ReadonlySet<string>){
 return !busy&&!encounter.merchant&&!seen.has(encounter.key)&&Math.hypot(point.x-encounter.point.x,(point.y-encounter.point.y)*1.35)<.17;
}
export function rememberedStories(state:VillageStoryState){return VILLAGE_STORIES.filter(st=>(state.arcs[st.id]?.episodes.length??0)>0);}
