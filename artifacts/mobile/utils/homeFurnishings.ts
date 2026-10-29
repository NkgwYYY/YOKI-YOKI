import {homeArtPoint} from './homeGeometry.ts';
import type {RoomItemPosition} from './roomPlacement';

const FURNITURE={
 sofa:{x:.24,y:.89,width:.40,aspect:1.3142},
 vanity:{x:.19,y:.88,width:.27,aspect:0.7678},
 bookshelf:{x:.20,y:.88,width:.28,aspect:0.8333},
};
const DECOR:Record<string,{x:number;y:number;width:number;aspect:number}>={
 'catalog-decor-cushion':{x:.73,y:.80,width:.15,aspect:0.9877},
 'catalog-decor-picture-book':{x:.72,y:.81,width:.17,aspect:1.4325},
 'catalog-decor-plant':{x:.82,y:.83,width:.18,aspect:0.9003},
 'catalog-decor-plush':{x:.73,y:.80,width:.15,aspect:1.1279},
 'catalog-decor-small-pet':{x:.74,y:.81,width:.17,aspect:1.1008},
};
type Placement={x:number;y:number;scale:number};
/** Feet share the resident's floor projection; stored offsets are preserved. */
export function homeFurnishingFrame(kind:'furniture'|'flower'|'decor',id:string,width:number,height:number,placement:Placement={x:0,y:0,scale:1},safe={left:8,right:width-8,bottom:height*(width>height?.83:.89)},position?:RoomItemPosition){
 const wide=width>height;
 const spec=kind==='furniture'?FURNITURE[id as keyof typeof FURNITURE]:kind==='flower'?{x:.80,y:.71,width:.13,aspect:.94}:DECOR[id]??{x:.73,y:.80,width:.15,aspect:1};
 const scale=Math.max(.55,Math.min(1.45,placement.scale)),w=width*spec.width*(wide?.62:1)*scale,h=w/spec.aspect;
 const foot=homeArtPoint(position??{x:spec.x,y:spec.y},wide);
 const left=Math.max(safe.left,Math.min(safe.right-w,foot.x*width-w/2+placement.x));
 const bottom=Math.max(height*.55+h/2,Math.min(safe.bottom,foot.y*height+placement.y));
 return {left,top:bottom-h,width:w,height:h,zIndex:Math.round((position?.y??spec.y)*1000)};
}

/** Convert a finger's screen delta into the room, keeping its feet above the dock. */
export function dragHomeFurnishing(item:{left:number;top:number;width:number;height:number},delta:{x:number;y:number},room:{width:number;height:number;left:number;top:number},camera:{zoom:number;panX:number;panY:number},viewport:{width:number;height:number},safe:{left:number;right:number;bottom:number},safeTop:number,safeBottom:number){
 'worklet';
 const z=Math.max(.1,camera.zoom);
 const sx=(x:number)=>room.width/2+(x-room.left-room.width/2-camera.panX)/z;
 const sy=(y:number)=>room.height/2+(y-room.top-room.height/2-camera.panY)/z;
 const minX=Math.max(safe.left,sx(12)),maxX=Math.min(safe.right,sx(viewport.width-12))-item.width;
 const minY=Math.max(room.height*.55-item.height/2,sy(safeTop)),maxY=Math.min(safe.bottom,sy(safeBottom))-item.height;
 return {left:Math.max(Math.min(minX,maxX),Math.min(maxX,item.left+delta.x/z)),top:Math.max(Math.min(minY,maxY),Math.min(maxY,item.top+delta.y/z))};
}
