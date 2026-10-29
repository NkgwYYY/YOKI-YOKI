/** Single-storey floor and furniture coordinates measured against nook-overview.
 * The bed joins the open floor at its foot. Walls, bookcase, chair and dresser
 * remain obstacles, including when carrying or rolling the resident. */
export type HomePoint={x:number;y:number};
export const HOME_IDLE={x:.52,y:.71};
export const HOME_WINDOW={x:.37,y:.47};
export const HOME_BED={x:.76,y:.37};
const BED_FOOT={x:.64,y:.445};
const FLOOR:HomePoint[]=[{x:.36,y:.46},{x:.56,y:.425},{x:.64,y:.445},{x:.78,y:.455},{x:.81,y:.58},{x:.86,y:.85},{x:.16,y:.85},{x:.13,y:.62},{x:.38,y:.59}];
function distance(a:HomePoint,b:HomePoint){'worklet';return Math.hypot(a.x-b.x,(a.y-b.y)*1.75);}
function segment(p:HomePoint,a:HomePoint,b:HomePoint):HomePoint{
 'worklet';const dx=b.x-a.x,dy=(b.y-a.y)*1.75,den=dx*dx+dy*dy;
 const t=den?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*1.75*dy)/den)):0;
 return {x:a.x+dx*t,y:a.y+(b.y-a.y)*t};
}
function floorPoint(p:HomePoint):HomePoint{
 'worklet';let inside=false,nearest=FLOOR[0],best=Infinity;
 for(let i=0,j=FLOOR.length-1;i<FLOOR.length;j=i++){
  const a=FLOOR[i],b=FLOOR[j];
  if((a.y>p.y)!==(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)inside=!inside;
  const q=segment(p,a,b),d=distance(p,q);if(d<best){best=d;nearest=q;}
 }
 return inside?p:nearest;
}
export function homeDropPoint(point:HomePoint):HomePoint{
 'worklet';const p={x:Number.isFinite(point.x)?point.x:HOME_IDLE.x,y:Number.isFinite(point.y)?point.y:HOME_IDLE.y};
 const floor=floorPoint(p),bed=segment(p,BED_FOOT,HOME_BED);
 return distance(p,floor)<=distance(p,bed)?floor:bed;
}
export function isHomeGround(p:HomePoint){'worklet';return distance(p,homeDropPoint(p))<.0001;}
/** Visibility through the floor polygon (split at every boundary intersection).
 * This checks whole segments, so even a fast gesture cannot tunnel through furniture. */
function clearPath(a:HomePoint,b:HomePoint){
 'worklet';const cuts=[0,1],dx=b.x-a.x,dy=b.y-a.y;
 for(let i=0,j=FLOOR.length-1;i<FLOOR.length;j=i++){
  const c=FLOOR[j],d=FLOOR[i],ex=d.x-c.x,ey=d.y-c.y,den=dx*ey-dy*ex;
  if(Math.abs(den)<1e-10)continue;
  const t=((c.x-a.x)*ey-(c.y-a.y)*ex)/den,u=((c.x-a.x)*dy-(c.y-a.y)*dx)/den;
  if(t>0&&t<1&&u>=0&&u<=1)cuts.push(t);
 }
 cuts.sort((x,y)=>x-y);
 for(let i=1;i<cuts.length;i++){const t=(cuts[i-1]+cuts[i])/2;if(!isHomeGround({x:a.x+dx*t,y:a.y+dy*t}))return false;}
 return true;
}
export function homeMovePoint(from:HomePoint,to:HomePoint):HomePoint{
 'worklet';const start=homeDropPoint(from),end=homeDropPoint(to);
 if(clearPath(start,end))return end;
 // Stop at the first boundary; lifting remains the explicit way to relocate.
 let low=0,high=1;
 for(let i=0;i<14;i++){const t=(low+high)/2,p={x:start.x+(end.x-start.x)*t,y:start.y+(end.y-start.y)*t};if(clearPath(start,p)&&isHomeGround(p))low=t;else high=t;}
 return {x:start.x+(end.x-start.x)*low,y:start.y+(end.y-start.y)*low};
}
/** Shortest visible route around furnishings on the single connected floor. */
export function homeRoute(from:HomePoint,target:HomePoint):HomePoint[]{
 const start=homeDropPoint(from),end=homeDropPoint(target);
 if(distance(start,end)<.0001)return [];
 const nodes=[start,end,...FLOOR,BED_FOOT,HOME_BED],cost=nodes.map(()=>Infinity),previous=nodes.map(()=>-1),visited=new Set<number>();cost[0]=0;
 for(let step=0;step<nodes.length;step++){
  let u=-1;for(let i=0;i<nodes.length;i++)if(!visited.has(i)&&(u<0||cost[i]<cost[u]))u=i;
  if(u<0||!Number.isFinite(cost[u]))break;if(u===1)break;visited.add(u);
  for(let v=0;v<nodes.length;v++)if(!visited.has(v)&&clearPath(nodes[u],nodes[v])){
   const next=cost[u]+distance(nodes[u],nodes[v]);if(next<cost[v]){cost[v]=next;previous[v]=u;}
  }
 }
 if(!Number.isFinite(cost[1]))return [];
 const route:HomePoint[]=[];for(let i=1;i>0;i=previous[i])route.unshift(nodes[i]);return route;
}
/** The wide illustration uses the same semantic anchors; inverse also serves dragging. */
export function homeArtPoint(p:HomePoint,wide:boolean):HomePoint{
 'worklet';if(!wide)return p;
 const depth=Math.max(0,Math.min(1,(.65-p.y)/.28)),bed=Math.max(0,Math.min(1,(.55-p.y)/.18));
 return {x:p.x-.06*bed*Math.max(0,Math.min(1,(p.x-.55)/.21)),y:p.y>.65?.65+(p.y-.65)*.5:p.y+.095*depth};
}
export function homeLogicalPoint(p:HomePoint,wide:boolean):HomePoint{
 'worklet';if(!wide)return p;
 let low=-1,high=2;
 for(let i=0;i<22;i++){const y=(low+high)/2;if(homeArtPoint({x:p.x,y},true).y<p.y)low=y;else high=y;}
 const y=(low+high)/2;low=-1;high=2;
 for(let i=0;i<22;i++){const x=(low+high)/2;if(homeArtPoint({x,y},true).x<p.x)low=x;else high=x;}
 return {x:(low+high)/2,y};
}
