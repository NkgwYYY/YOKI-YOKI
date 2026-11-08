import type {CostumeId} from './costumeGeometry';
export const COSTUMES=[{id:'dog',name:'いぬ'},{id:'cat',name:'ねこ'},{id:'rabbit',name:'うさぎ'},{id:'frog',name:'かえる'},{id:'panda',name:'パンダ'}].map(c=>({...c,id:c.id as CostumeId,cost:500}));
export type Wardrobe={version:1;owned:CostumeId[];equipped:CostumeId|null;changedAt:number;pointOwned?:CostumeId[];storeOwned?:CostumeId[];bundleOwned?:CostumeId[]};
export type CostumeAction={kind:'buy';id:CostumeId}|{kind:'equip';id:CostumeId|null};
export function isCostume(id:unknown):id is CostumeId{return COSTUMES.some(c=>c.id===id);}
/** Build 41 stores this object in feed_state_v1. Keep the same keys and IDs. */
export function readWardrobe(raw:unknown):Wardrobe{
 if(raw==null)return {version:1,owned:[],equipped:null,changedAt:0};
 const s=raw as Wardrobe;
 if(typeof raw!=='object'||Array.isArray(raw)||s.version!==1||!Array.isArray(s.owned)||s.owned.some(id=>!isCostume(id))||!Number.isSafeInteger(s.changedAt)||s.changedAt<0||s.equipped!==null&&(!isCostume(s.equipped)||!s.owned.includes(s.equipped)))throw Error('着ぐるみの保存データを確認できません。');
 for(const ids of [s.pointOwned,s.storeOwned,s.bundleOwned])if(ids!==undefined&&(!Array.isArray(ids)||ids.some(id=>!isCostume(id)||!s.owned.includes(id))))throw Error('着ぐるみの購入データを確認できません。');
 return {...s,owned:[...new Set(s.owned)],...(s.pointOwned?{pointOwned:[...new Set(s.pointOwned)]}:{}),...(s.storeOwned?{storeOwned:[...new Set(s.storeOwned)]}:{})};
}
export function changeCostume<T extends {points:number;wardrobe?:Wardrobe}>(feed:T,action:CostumeAction,now=Date.now()):T{
 if(!Number.isSafeInteger(feed.points)||feed.points<0)throw Error('ポイントの保存データを確認できません。');
 const wardrobe=readWardrobe(feed.wardrobe);
 if(action.kind==='buy'){
  const item=COSTUMES.find(c=>c.id===action.id);if(!item)throw Error('この着ぐるみは購入できません。');
  if(wardrobe.owned.includes(item.id))return feed;
  if(feed.points<item.cost)throw Error('YOKIポイントが足りません。');
  const pointOwned=wardrobe.pointOwned??wardrobe.owned.filter(id=>!wardrobe.storeOwned?.includes(id)&&!wardrobe.bundleOwned?.includes(id));
  return {...feed,points:feed.points-item.cost,wardrobe:{...wardrobe,owned:[...wardrobe.owned,item.id],pointOwned:[...pointOwned,item.id]}};
 }
 if(action.kind!=='equip'||action.id!==null&&(!isCostume(action.id)||!wardrobe.owned.includes(action.id)))throw Error('購入済みの着ぐるみを選んでください。');
 if(wardrobe.equipped===action.id)return feed;
 return {...feed,wardrobe:{...wardrobe,equipped:action.id,changedAt:Math.max(Math.floor(now),wardrobe.changedAt+1)}};
}
export function mergeWardrobes(a:unknown,b:unknown):Wardrobe{
 const x=readWardrobe(a),y=readWardrobe(b);
 const pointOwned=[...new Set([...(x.pointOwned??x.owned.filter(id=>!x.storeOwned?.includes(id)&&!x.bundleOwned?.includes(id))),...(y.pointOwned??y.owned.filter(id=>!y.storeOwned?.includes(id)&&!y.bundleOwned?.includes(id)))])];
 const storeOwned=[...new Set([...(x.storeOwned??[]),...(y.storeOwned??[])])];
 const bundleOwned=[...new Set([...(x.bundleOwned??[]),...(y.bundleOwned??[])])];
 return {...(x.changedAt>=y.changedAt?x:y),owned:[...new Set([...pointOwned,...storeOwned,...bundleOwned])],pointOwned,storeOwned,bundleOwned};
}
