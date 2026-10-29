import type {FeedState} from '../contexts/AppContext';
import type {StorageEntry} from './recoverableStorage';

export const CROPS={
 turnip:{name:'小かぶ',seedName:'小かぶの種',price:12,days:7,yield:3,sell:5,wholesale:7,color:'#F4EBDF'},
 carrot:{name:'にんじん',seedName:'にんじんの種',price:18,days:7,yield:3,sell:7,wholesale:10,color:'#F19A42'},
 tomato:{name:'トマト',seedName:'トマトの種',price:25,days:7,yield:3,sell:9,wholesale:13,color:'#D85C55'},
} as const;
export type CropId=keyof typeof CROPS;
export type GardenPlot={crop:CropId;planted:string;watered:string[]};
export type VegetableGarden={version:1;revision:number;harvests:number;lastDay?:string;seeds:Record<CropId,number>;produce:Record<CropId,number>;plots:(GardenPlot|null)[]};
export type GardenOperation={revision:number}&({kind:'buy';crop:CropId}|{kind:'sell';crop:CropId;venue:'homewares'|'ramen'}|{kind:'plant';crop:CropId;plot:number}|{kind:'water'|'harvest';plot:number});
const key='@mentore/feed_state_v1';
const cropIds=Object.keys(CROPS) as CropId[];
const dateOK=(d:unknown):d is string=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d))&&new Date(d).toISOString().slice(0,10)===d;
const count=(n:unknown):n is number=>typeof n==='number'&&Number.isSafeInteger(n)&&n>=0;
const cropOK=(c:unknown):c is CropId=>typeof c==='string'&&Object.hasOwn(CROPS,c);
export function gardenUnlocked(feed:Pick<FeedState,'villageStories'>){return feed.villageStories?.arcs.grandma?.episodes.length===6;}
export function wholesaleUnlocked(feed:Pick<FeedState,'villageStories'>){return feed.villageStories?.arcs.supply?.episodes.length===1;}
/** The invitation includes the first three seeds. An absent garden is initialized once on first write. */
export function readGarden(raw:unknown):VegetableGarden{
 if(raw==null)return {version:1,revision:0,harvests:0,seeds:{turnip:2,carrot:1,tomato:0},produce:{turnip:0,carrot:0,tomato:0},plots:[null,null,null,null]};
 const g=raw as VegetableGarden;
 if(g.version!==1||!count(g.revision)||!count(g.harvests)||!Array.isArray(g.plots)||g.plots.length!==4||(g.lastDay!==undefined&&!dateOK(g.lastDay)))throw Error('畑の記録を確認できません');
 for(const bag of [g.seeds,g.produce])if(!bag||typeof bag!=='object'||cropIds.some(c=>!count(bag[c])||bag[c]>999))throw Error('かごの中身を確認できません');
 for(const p of g.plots)if(p!==null){
  if(!p||!cropOK(p.crop)||!dateOK(p.planted)||!Array.isArray(p.watered)||!p.watered.length||p.watered.length>CROPS[p.crop].days||p.watered[0]!==p.planted||p.watered.some((d,i)=>!dateOK(d)||d<p.planted||(i>0&&d<=p.watered[i-1]))||!g.lastDay||p.watered.at(-1)!>g.lastDay)throw Error('畑の記録を確認できません');
 }
 return g;
}
/** One watered calendar day matures after midnight. Missing days never wither the crop. */
export function plotStatus(plot:GardenPlot|null,today:string){
 if(!plot)return {growth:0,mature:false,watered:false};
 const growth=plot.watered.filter(d=>d<today).length;
 return {growth,mature:growth>=CROPS[plot.crop].days,watered:plot.watered.includes(today)};
}
export function prepareGarden(values:Record<string,string|null>,op:GardenOperation,today:string,fallback:FeedState){
 if(!dateOK(today))throw Error('端末の日付を確認してください');
 const feed:FeedState=values[key]?JSON.parse(values[key]!):fallback;
 if(!feed||!count(feed.points)||!gardenUnlocked(feed))throw Error('おばあさんに招待されたら、畑を使えるようになるよ');
 const old=readGarden(feed.vegetableGarden);
 if(!count(op.revision)||!['buy','sell','plant','water','harvest'].includes(op.kind))throw Error('畑の操作を確認できません');
 if('crop' in op&&!cropOK(op.crop))throw Error('その種は見つかりません');
 if('plot' in op&&(!Number.isInteger(op.plot)||op.plot<0||op.plot>3))throw Error('その畑は見つかりません');
 if(old.lastDay&&old.lastDay>today)throw Error('端末の日付を確認してください');
 if(op.revision<old.revision)return {entries:[] as StorageEntry[],result:{feed,state:old,changed:false,message:'畑の最新の状態を読み込みました。'}};
 if(op.revision!==old.revision)throw Error('畑を開き直してください');
 const state:VegetableGarden={...old,revision:old.revision+1,lastDay:today,seeds:{...old.seeds},produce:{...old.produce},plots:old.plots.map(p=>p?{...p,watered:[...p.watered]}:null)};
 let points=feed.points,message='';
 if(op.kind==='buy'){
  const crop=CROPS[op.crop];if(points<crop.price)throw Error('ポイントが足りません');
  if(state.seeds[op.crop]>=999)throw Error('種のかごがいっぱいです');
  points-=crop.price;state.seeds[op.crop]++;message=`${crop.seedName}を1袋買いました。`;
 }else if(op.kind==='sell'){
  if(!state.produce[op.crop])throw Error('まだ収穫した野菜がありません');
  if(!['homewares','ramen'].includes(op.venue))throw Error('売り先を確認できません');
  if(op.venue==='ramen'&&!wholesaleUnlocked(feed))throw Error('店長から仕入れを頼まれたら、野菜を卸せるようになるよ');
  const crop=CROPS[op.crop],price=op.venue==='ramen'?crop.wholesale:crop.sell;state.produce[op.crop]--;points+=price;if(!Number.isSafeInteger(points))throw Error('ポイントを確認できません');message=`${crop.name}を1個売って、${price}pt受け取りました。`;
 }else if(op.kind==='plant'){
  if(state.plots[op.plot])throw Error('ここにはもう野菜が育っているよ');
  if(!state.seeds[op.crop])throw Error('種がありません。暮らしのお店で買えるよ');
  state.seeds[op.crop]--;state.plots[op.plot]={crop:op.crop,planted:today,watered:[today]};message='種をまいて、最初のお水をあげました。';
 }else{
  const plot=state.plots[op.plot];if(!plot)throw Error('先に種をまこう');
  const status=plotStatus(plot,today),crop=CROPS[plot.crop];
  if(op.kind==='water'){
   if(status.mature)throw Error('もう収穫できるよ');if(status.watered)throw Error('今日のお水はもうあげたよ');
   plot.watered.push(today);message='お水をあげました。明日の育ち具合が楽しみだね。';
  }else{
   if(!status.mature)throw Error('もう少し育つのを待とう');if(state.produce[plot.crop]+crop.yield>999)throw Error('収穫かごがいっぱいです。お店で売ってから戻ってね');
   state.produce[plot.crop]+=crop.yield;state.harvests++;state.plots[op.plot]=null;message=`${crop.name}を${crop.yield}個収穫しました！`;
  }
 }
 const next:FeedState={...feed,points,vegetableGarden:state};
 return {entries:[[key,JSON.stringify(next)]] as StorageEntry[],result:{feed:next,state,changed:true,message}};
}
