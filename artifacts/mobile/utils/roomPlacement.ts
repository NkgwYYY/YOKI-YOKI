export type RoomItemPosition={x:number;y:number;updatedAt?:number};
export type RoomItemPositions=Record<string,RoomItemPosition>;
const KEYS=['furniture:sofa','furniture:vanity','furniture:bookshelf','flower:pink','flower:violet','flower:rainbow'];
export const roomPositionKey=(kind:'furniture'|'flower',id:string)=>`${kind}:${id}`;
/** Positions use the shared room floor coordinates, independent of device pixels. */
export function roomItemPosition(value:unknown):RoomItemPosition|null{
 if(!value||typeof value!=='object')return null;
 const p=value as RoomItemPosition;
 if(!Number.isFinite(p.x)||!Number.isFinite(p.y))return null;
 return {x:Math.max(0,Math.min(1,p.x)),y:Math.max(.45,Math.min(.96,p.y)),updatedAt:Number.isFinite(p.updatedAt)?Math.max(0,p.updatedAt!):0};
}
export function readRoomPositions(value:unknown):RoomItemPositions{
 if(!value||typeof value!=='object')return {};
 const result:RoomItemPositions={};
 for(const key of KEYS){const p=roomItemPosition((value as RoomItemPositions)[key]);if(p)result[key]=p;}
 return result;
}
export function mergeRoomPositions(cloud:unknown,local:unknown):RoomItemPositions{
 const result=readRoomPositions(cloud);
 for(const [key,p] of Object.entries(readRoomPositions(local))){if(!result[key]||(p.updatedAt??0)>=(result[key].updatedAt??0))result[key]=p;}
 return result;
}
