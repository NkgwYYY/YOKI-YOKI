import {COSTUMES,readWardrobe,type Wardrobe} from './wardrobe';
import type {CostumeId} from './costumeGeometry';

export const COSTUME_PRODUCTS:Record<CostumeId,string>={dog:'yokiyoki.costume.dog',cat:'yokiyoki.costume.cat',rabbit:'yokiyoki.costume.rabbit',frog:'yokiyoki.costume.frog',panda:'yokiyoki.costume.panda'};
export type CostumeSnapshot={products:string[];finishable:string[]};
export function costumeForProduct(product:string):CostumeId{
 const item=COSTUMES.find(c=>COSTUME_PRODUCTS[c.id]===product);
 if(!item)throw Error('着ぐるみの購入情報を確認できません。');
 return item.id;
}
/** Existing build43 ownership is a point purchase; never remove it on restore. */
export function reconcileCostumePurchases<T extends {wardrobe?:Wardrobe}>(feed:T,products:string[],now=Date.now()):T{
 const wardrobe=readWardrobe(feed.wardrobe),storeOwned=[...new Set(products.map(costumeForProduct))];
 const pointOwned=wardrobe.pointOwned??wardrobe.owned.filter(id=>!wardrobe.storeOwned?.includes(id));
 const owned=[...new Set([...pointOwned,...storeOwned])];
 const equipped=wardrobe.equipped&&owned.includes(wardrobe.equipped)?wardrobe.equipped:null;
 return {...feed,wardrobe:{...wardrobe,owned,pointOwned,storeOwned,equipped,changedAt:equipped===wardrobe.equipped?wardrobe.changedAt:Math.max(Math.floor(now),wardrobe.changedAt+1)}};
}
/** A storage/session failure leaves transactions unfinished for the next recovery. */
export async function deliverCostumeSnapshot(snapshot:CostumeSnapshot,current:()=>boolean,save:(products:string[])=>Promise<void>,finish:(id:string)=>Promise<void>){
 if(!current())throw Error('利用者が変わりました。');
 snapshot.products.forEach(costumeForProduct);
 if(snapshot.finishable.some(id=>!/^\d+$/.test(id)))throw Error('購入情報を確認できません。');
 await save(snapshot.products);
 for(const id of snapshot.finishable){if(!current())throw Error('利用者が変わりました。購入の受け取りは次回に再開します。');await finish(id);}
}
