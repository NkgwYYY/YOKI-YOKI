/** Starter furnishings cost no points and remain available after being put away. */
export const STARTER_FURNISHINGS = [
  {id:'bed',name:'ベッドまわり',detail:'ベッド・照明・小さなラグ'},
  {id:'lounge',name:'くつろぎセット',detail:'椅子・テーブル・照明・鉢植え'},
  {id:'bookcase',name:'本棚',detail:'本棚・横の鉢植え'},
  {id:'cabinet',name:'チェスト',detail:'チェスト・上と横の飾り'},
  {id:'rug',name:'まるいラグ',detail:'お部屋の真ん中のラグ'},
  {id:'windowDecor',name:'窓辺の飾り',detail:'窓辺の植物・壁の絵'},
] as const;
export type StarterFurnishingId=typeof STARTER_FURNISHINGS[number]['id'];
export type StarterFurnishings=Partial<Record<StarterFurnishingId,{placed:boolean;updatedAt:number}>>;
export const isStarterFurnishing=(id:string):id is StarterFurnishingId=>STARTER_FURNISHINGS.some(item=>item.id===id);
export function readStarterFurnishings(value:unknown):StarterFurnishings{
  if(!value||typeof value!=='object')return {};
  const result:StarterFurnishings={};
  for(const {id} of STARTER_FURNISHINGS){
    const saved=(value as Record<string,unknown>)[id];
    if(!saved||typeof saved!=='object')continue;
    const entry=saved as {placed?:unknown;updatedAt?:unknown};
    if(typeof entry.placed!=='boolean')continue;
    result[id]={placed:entry.placed,updatedAt:typeof entry.updatedAt==='number'&&Number.isFinite(entry.updatedAt)?Math.max(0,entry.updatedAt):0};
  }
  return result;
}
export function starterIsPlaced(value:StarterFurnishings|undefined,id:StarterFurnishingId){return value?.[id]?.placed!==false;}
export function mergeStarterFurnishings(cloud:unknown,local:unknown):StarterFurnishings{
  const result=readStarterFurnishings(cloud);
  for(const {id} of STARTER_FURNISHINGS){
    const entry=readStarterFurnishings(local)[id];
    if(entry&&(!result[id]||entry.updatedAt>=result[id]!.updatedAt))result[id]=entry;
  }
  return result;
}
