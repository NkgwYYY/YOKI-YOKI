import {readWardrobe,type Wardrobe} from './wardrobe.ts';
import type {CostumeId} from './costumeGeometry';

export type RoomGoodId='bamboo-cushion'|'carrot-bed';
export type RoomThemeId='rain-cafe'|'star-room'|'washitsu';
export type RoomProductId='panda-furniture'|'rabbit-furniture'|'panda-set'|'rabbit-set'|RoomThemeId;
export type RoomProduct={id:RoomProductId;name:string;detail:string;points:number;yen:number;kind:'furniture'|'matching'|'room';good?:RoomGoodId;costume?:CostumeId;theme?:RoomThemeId;contents:string[]};
export const ROOM_PRODUCTS:readonly RoomProduct[]=[
 {id:'panda-set',name:'パンダのおそろいセット',detail:'もこもこパンダと、笹の葉クッション。',points:1800,yen:200,kind:'matching',good:'bamboo-cushion',costume:'panda',contents:['パンダの着ぐるみ','笹クッション']},
 {id:'rabbit-set',name:'うさぎのおそろいセット',detail:'うさぎに着替えて、にんじんベッドでひと休み。',points:1800,yen:200,kind:'matching',good:'carrot-bed',costume:'rabbit',contents:['うさぎの着ぐるみ','にんじんベッド']},
 {id:'rain-cafe',name:'雨の日の喫茶店',detail:'雨音が似合う、木のぬくもりとミルク色の灯り。',points:3500,yen:500,kind:'room',theme:'rain-cafe',contents:['雨空の背景とお部屋','カフェの家具一式','あたたかな照明']},
 {id:'star-room',name:'星空の部屋',detail:'淡いラベンダーと、小さな星の灯り。',points:3500,yen:500,kind:'room',theme:'star-room',contents:['星空の背景とお部屋','星モチーフの家具一式','月と星の照明']},
 {id:'washitsu',name:'やすらぎの和室',detail:'畳とひのき、ゆっくりお茶を飲みたくなるお部屋。',points:3500,yen:500,kind:'room',theme:'washitsu',contents:['和室の背景と畳','ちゃぶ台・座布団・おふとん','やさしい行灯']},
 {id:'panda-furniture',name:'笹クッション',detail:'パンダにぴったり。ふんわり笹の葉のかたち。',points:1500,yen:200,kind:'furniture',good:'bamboo-cushion',contents:['笹クッション']},
 {id:'rabbit-furniture',name:'にんじんベッド',detail:'やわらかなにんじんに、すっぽり。',points:1500,yen:200,kind:'furniture',good:'carrot-bed',contents:['にんじんベッド']},
];
export const ROOM_GOODS:readonly RoomGoodId[]=['bamboo-cushion','carrot-bed'];
export const ROOM_THEMES:readonly RoomThemeId[]=['rain-cafe','star-room','washitsu'];
export const roomProduct=(id:RoomProductId)=>{const p=ROOM_PRODUCTS.find(p=>p.id===id);if(!p)throw Error('このセットは購入できません。');return p;};
export const roomProductSku=(id:RoomProductId)=>`yokiyoki.room.${roomProduct(id).id.replaceAll('-','_')}`;
export function roomProductForSku(sku:string):RoomProductId{const p=ROOM_PRODUCTS.find(p=>roomProductSku(p.id)===sku);if(!p)throw Error('お部屋の購入情報を確認できません。');return p.id;}
export type RoomCollection={version:1;pointOwned:RoomProductId[];storeOwned:RoomProductId[];storeCheckedAt:number;theme:RoomThemeId|null;goods:RoomGoodId[];changedAt:number};
const unique=<T,>(values:T[])=>[...new Set(values)];
const productIds=(v:unknown):v is RoomProductId[]=>Array.isArray(v)&&v.every(id=>ROOM_PRODUCTS.some(p=>p.id===id));
export function readRoomCollection(raw:unknown):RoomCollection{
 if(raw==null)return {version:1,pointOwned:[],storeOwned:[],storeCheckedAt:0,theme:null,goods:[],changedAt:0};
 const s=raw as RoomCollection;
 if(!s||typeof s!=='object'||Array.isArray(s)||s.version!==1||!productIds(s.pointOwned)||!productIds(s.storeOwned)||!Number.isSafeInteger(s.storeCheckedAt)||s.storeCheckedAt<0||!Number.isSafeInteger(s.changedAt)||s.changedAt<0||s.theme!==null&&!ROOM_THEMES.includes(s.theme)||!Array.isArray(s.goods)||s.goods.some(g=>!ROOM_GOODS.includes(g)))throw Error('お部屋の保存データを確認できません。');
 const owned=unique([...s.pointOwned,...s.storeOwned]).map(roomProduct);
 return {...s,pointOwned:unique(s.pointOwned),storeOwned:unique(s.storeOwned),theme:s.theme&&owned.some(p=>p.theme===s.theme)?s.theme:null,goods:unique(s.goods).filter(g=>owned.some(p=>p.good===g))};
}
export function ownedRoomGoods(s:RoomCollection){return unique([...s.pointOwned,...s.storeOwned].map(roomProduct).flatMap(p=>p.good?[p.good]:[]));}
export function ownedRoomThemes(s:RoomCollection){return unique([...s.pointOwned,...s.storeOwned].map(roomProduct).flatMap(p=>p.theme?[p.theme]:[]));}
export function syncRoomWardrobe<T extends {wardrobe?:Wardrobe}>(feed:T,state:RoomCollection,now=Date.now()):T{
 const w=readWardrobe(feed.wardrobe),pointOwned=w.pointOwned??w.owned.filter(id=>!w.storeOwned?.includes(id)&&!w.bundleOwned?.includes(id));
 const bundleOwned=unique([...state.pointOwned,...state.storeOwned].map(roomProduct).flatMap(p=>p.costume?[p.costume]:[]));
 const owned=unique([...pointOwned,...(w.storeOwned??[]),...bundleOwned]);
 const equipped=w.equipped&&owned.includes(w.equipped)?w.equipped:null;
 return {...feed,wardrobe:{...w,pointOwned,bundleOwned,owned,equipped,changedAt:equipped===w.equipped?w.changedAt:Math.max(now,w.changedAt+1)}};
}
/** The bundle discount also applies when completing a previously owned set. */
export function roomPointQuote(id:RoomProductId,state:RoomCollection,wardrobe:Wardrobe):number{
 const p=roomProduct(id);
 if(p.kind==='room')return ownedRoomThemes(state).includes(p.theme!)?0:p.points;
 const goodOwned=ownedRoomGoods(state).includes(p.good!);
 if(p.kind==='furniture')return goodOwned?0:p.points;
 return Math.max(0,p.points-(goodOwned?1500:0)-(wardrobe.owned.includes(p.costume!)?500:0));
}
export type RoomBoutiqueAction={kind:'buy'|'apply';id:RoomProductId}|{kind:'default'}|{kind:'good';id:RoomGoodId;placed:boolean}|{kind:'restore';products:string[]};
export function changeRoomBoutique<T extends {points:number;wardrobe?:Wardrobe},R extends {boutique?:RoomCollection}>(feed:T,room:R,action:RoomBoutiqueAction,now=Date.now()):{feed:T;room:R;paid:number}{
 if(!Number.isSafeInteger(feed.points)||feed.points<0)throw Error('ポイントの保存データを確認できません。');
 let state=readRoomCollection(room.boutique),nextFeed=feed,paid=0;
 if(action.kind==='buy'){
  paid=roomPointQuote(action.id,state,readWardrobe(feed.wardrobe));
  if(feed.points<paid)throw Error('YOKIポイントが足りません。');
  if(paid){state={...state,pointOwned:unique([...state.pointOwned,action.id])};nextFeed={...feed,points:feed.points-paid};}
 }else if(action.kind==='restore'){
  state={...state,storeOwned:unique(action.products.map(roomProductForSku)),storeCheckedAt:Math.max(now,state.storeCheckedAt+1)};
  state=readRoomCollection(state);
 }else if(action.kind==='default')state={...state,theme:null,changedAt:Math.max(now,state.changedAt+1)};
 else if(action.kind==='good'){
  if(!ROOM_GOODS.includes(action.id)||!ownedRoomGoods(state).includes(action.id))throw Error('購入済みの家具を選んでください。');
  state={...state,goods:action.placed?unique([...state.goods,action.id]):state.goods.filter(g=>g!==action.id),changedAt:Math.max(now,state.changedAt+1)};
 }else if(action.kind==='apply'){
  const p=roomProduct(action.id);
  if(roomPointQuote(p.id,state,readWardrobe(feed.wardrobe))!==0)throw Error('購入済みのセットを選んでください。');
  state={...state,...(p.theme?{theme:p.theme}:{}),...(p.good?{goods:unique([...state.goods,p.good])}:{}),changedAt:Math.max(now,state.changedAt+1)};
  if(p.costume){const w=readWardrobe(feed.wardrobe);nextFeed={...feed,wardrobe:{...w,equipped:p.costume,changedAt:Math.max(now,w.changedAt+1)}};}
 }else throw Error('お部屋の操作を確認できません。');
 return {feed:syncRoomWardrobe(nextFeed,state,now),room:{...room,boutique:state},paid};
}
export function mergeRoomCollections(a:unknown,b:unknown):RoomCollection{
 const x=readRoomCollection(a),y=readRoomCollection(b),latest=x.changedAt>=y.changedAt?x:y;
 return readRoomCollection({...latest,pointOwned:unique([...x.pointOwned,...y.pointOwned]),storeOwned:(x.storeCheckedAt>=y.storeCheckedAt?x:y).storeOwned,storeCheckedAt:Math.max(x.storeCheckedAt,y.storeCheckedAt)});
}
export async function deliverRoomSnapshot(snapshot:{products:string[];finishable:string[]},current:()=>boolean,save:(products:string[])=>Promise<void>,finish:(id:string)=>Promise<void>){
 if(!current())throw Error('利用者が変わりました。');
 snapshot.products.forEach(roomProductForSku);
 if(snapshot.finishable.some(id=>!/^\d+$/.test(id)))throw Error('購入情報を確認できません。');
 await save(snapshot.products);
 for(const id of snapshot.finishable){if(!current())throw Error('利用者が変わりました。購入の受け取りは次回に再開します。');await finish(id);}
}
