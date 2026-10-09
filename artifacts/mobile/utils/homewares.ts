import {ROOM_PRICES} from './roomPurchase';

export const ROOM_FURNITURE = [
  {id:'sofa',name:'ソファ',cost:ROOM_PRICES.furniture.sofa},
  {id:'vanity',name:'ドレッサー',cost:ROOM_PRICES.furniture.vanity},
  {id:'bookshelf',name:'本棚',cost:ROOM_PRICES.furniture.bookshelf},
] as const;
export const ROOM_FLOWERS = [
  {id:'pink',name:'ローズ',cost:ROOM_PRICES.flower.pink},
  {id:'violet',name:'バイオレット',cost:ROOM_PRICES.flower.violet},
  {id:'rainbow',name:'レインボー',cost:ROOM_PRICES.flower.rainbow},
] as const;
/** Old purchases remain in inventory; only these catalog goods are for sale. */
export function homewaresGenre(item:{id:string;category:string}):'wear'|'decor'|null {
  if(item.category!=='accessory'||item.id.startsWith('catalog-effect-'))return null;
  return item.id.startsWith('catalog-decor-')?'decor':'wear';
}
