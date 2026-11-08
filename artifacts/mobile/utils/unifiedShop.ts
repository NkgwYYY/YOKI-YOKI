import {COSTUMES,type Wardrobe} from './wardrobe';
import {ROOM_PRODUCTS,ownedRoomGoods,type RoomProduct,type RoomCollection} from './roomBoutique';
import {ROOM_FURNITURE,ROOM_FLOWERS} from './homewares';
import type {CostumeId} from './costumeGeometry';
import type {RoomFurniture,RoomFlower} from '@/contexts/AppContext';
export type ShopProduct={key:string;name:string;points:number;kind:'costume'|'room'|'furniture'|'flower';costume?:CostumeId;room?:RoomProduct;furniture?:Exclude<RoomFurniture,'none'>;flower?:Exclude<RoomFlower,'none'>};
export const SHOP_PRODUCTS:ShopProduct[]=[
 ...COSTUMES.slice().sort((a,b)=>Number(b.id==='panda')-Number(a.id==='panda')).map(c=>({key:'costume-'+c.id,name:c.name+'のきぐるみ',points:c.cost,kind:'costume' as const,costume:c.id})),
 ...ROOM_PRODUCTS.map(r=>({key:r.id,name:r.name,points:r.points,kind:'room' as const,room:r})),
 ...ROOM_FURNITURE.map(f=>({key:'furniture-'+f.id,name:f.name,points:f.cost,kind:'furniture' as const,furniture:f.id})),
 ...ROOM_FLOWERS.map(f=>({key:'flower-'+f.id,name:f.name,points:f.cost,kind:'flower' as const,flower:f.id})),
];
export type ShopCategory='costumes'|'furniture'|'sets'|'owned'|'other';
export function inShopCategory(p:ShopProduct,c:ShopCategory){return c==='owned'||c==='costumes'&&p.kind==='costume'||c==='furniture'&&(p.kind==='furniture'||p.kind==='flower'||p.room?.kind==='furniture')||c==='sets'&&p.room?.kind!=='furniture'&&p.kind==='room';}
export function findShopProduct(key?:string){return SHOP_PRODUCTS.find(p=>p.key===key)??SHOP_PRODUCTS[0];}

/** A partially owned matching set buys only its missing entitlement. */
export function cashShopProduct(product:ShopProduct|null,room:RoomCollection,wardrobe:Wardrobe){
 if(product?.room?.kind!=='matching')return product;
 if(wardrobe.owned.includes(product.room.costume!))return findShopProduct(product.room.costume+'-furniture');
 if(ownedRoomGoods(room).includes(product.room.good!))return findShopProduct('costume-'+product.room.costume);
 return product;
}

/** Existing links without a category (including old `all` links) open costumes. */
export function shopEntryCategory(tab?:string,product?:string):ShopCategory {
 const p=SHOP_PRODUCTS.find(p=>p.key===product);
 if(p)return p.costume?'costumes':p.kind==='room'&&p.room?.kind!=='furniture'?'sets':'furniture';
 if(tab==='owned'||tab==='costumes'||tab==='furniture'||tab==='sets')return tab;
 return tab&&tab!=='all'?'other':'costumes';
}
