import {rotatePoint,cigaretteProjection, type Point3} from './residentVolume';
import {softContactHeight,softContactSpread} from './softContact';

/** Shape/face coordinates traced against assets/images/characters/odango.png
 * (512px square). Back fur is inferred: no turnaround art is supplied. Keep
 * each future form's geometry and surface details in its own model definition. */
export type ResidentVolumeModel = {
  radius: Point3; floor: number; face: {eyeX:number;eyeY:number;eyeWidth:number;eyeHeight:number;cheekX:number;cheekY:number;mouthY:number};
};
export const ODANGO_MODEL: ResidentVolumeModel = {
  radius:{x:41,y:40,z:38},floor:38.8,
  face:{eyeX:10.3,eyeY:-7,eyeWidth:3.6,eyeHeight:3.9,cheekX:20.5,cheekY:.2,mouthY:4.5},
};
export const HAPPA_MODEL: ResidentVolumeModel = {
  radius:{x:40,y:39,z:37.5},floor:38,
  face:{eyeX:10.3,eyeY:-6.5,eyeWidth:3.6,eyeHeight:3.9,cheekX:20.5,cheekY:.7,mouthY:5},
};
export const EVOLVED_VOLUME_MODELS = {odango:ODANGO_MODEL,stage3:HAPPA_MODEL,stage4:HAPPA_MODEL} as const;
function surface(model:ResidentVolumeModel,x:number,y:number):Point3 {
  'worklet';
  const r=model.radius;
  return {x,y,z:r.z*Math.sqrt(Math.max(0,1-(x/r.x)**2-(y/r.y)**2))};
}
function outline(model:ResidentVolumeModel) {
  const points:Point3[]=[];
  for(let ring=0;ring<=16;ring++)for(let slice=0;slice<24;slice++){
    const a=ring*Math.PI/16,b=slice*Math.PI/12,r=model.radius;
    points.push({x:r.x*Math.sin(a)*Math.cos(b),y:-r.y*Math.cos(a),z:r.z*Math.sin(a)*Math.sin(b)});
  }
  return points;
}
// Stable surface fibres: no random calls, allocations of geometry or JS timers
// on animation frames. The three paths batch fur rather than mount hundreds of nodes.
function fibres(model:ResidentVolumeModel) {
  const points:Point3[]=[];
  for(let i=0;i<600;i++){
    const y=1-2*(i+.5)/600,a=i*2.399963229728653,r=model.radius;
    points.push({x:r.x*Math.sqrt(1-y*y)*Math.cos(a),y:r.y*y,z:r.z*Math.sqrt(1-y*y)*Math.sin(a)});
  }
  return points;
}
export function createVolumeGeometry(model:ResidentVolumeModel) {
  return {model,outline:outline(model),fibres:fibres(model)};
}
const ODANGO_GEOMETRY=createVolumeGeometry(ODANGO_MODEL);
const HAPPA_GEOMETRY=createVolumeGeometry(HAPPA_MODEL);
const GEOMETRIES={odango:ODANGO_GEOMETRY,stage3:HAPPA_GEOMETRY,stage4:HAPPA_GEOMETRY};
function d(points:Point3[],closed=true,originY=50) {
  'worklet';
  return points.map((p,i)=>`${i?'L':'M'}${(50+p.x).toFixed(2)} ${(originY+p.y).toFixed(2)}`).join(' ')+(closed?' Z':'');
}
function hull(points:Point3[]) {
  'worklet';
  const sorted=points.slice().sort((a,b)=>a.x-b.x||a.y-b.y),lo:Point3[]=[],hi:Point3[]=[];
  const cross=(a:Point3,b:Point3,c:Point3)=>{'worklet';return (b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);};
  for(const p of sorted){while(lo.length>1&&cross(lo[lo.length-2],lo[lo.length-1],p)<=0)lo.pop();lo.push(p);}
  for(let i=sorted.length-1;i>=0;i--){const p=sorted[i];while(hi.length>1&&cross(hi[hi.length-2],hi[hi.length-1],p)<=0)hi.pop();hi.push(p);}
  lo.pop();hi.pop();return lo.concat(hi);
}
export function projectEvolvedVolume(geometry:ReturnType<typeof createVolumeGeometry>,rx:number,ry:number,rz:number,blink=0,happy=false,sleepy=false,mouthOpen=0,chew=0,smoking=false) {
  'worklet';
  const model=geometry.model,r=model.radius,f=model.face;
  // Compute the basis once, rather than trigonometry per fibre/feature.
  const bx=rotatePoint({x:1,y:0,z:0},rx,ry,rz),by=rotatePoint({x:0,y:1,z:0},rx,ry,rz),bz=rotatePoint({x:0,y:0,z:1},rx,ry,rz);
  const rotate=(p:Point3)=>{'worklet';return {x:bx.x*p.x+by.x*p.y+bz.x*p.z,y:bx.y*p.x+by.y*p.y+bz.y*p.z,z:bx.z*p.x+by.z*p.y+bz.z*p.z};};
  const axes=[rotate({x:r.x,y:0,z:0}),rotate({x:0,y:r.y,z:0}),rotate({x:0,y:0,z:r.z})];
  const support=Math.sqrt(axes[0].y**2+axes[1].y**2+axes[2].y**2);
  const rot=(p:Point3)=>{'worklet';const q=rotate(p),spread=softContactSpread(q.y,support);return {x:q.x*spread,y:softContactHeight(q.y,support),z:q.z*spread};};
  // Analytic projected ellipsoid: stable contour, no sorting hundreds of
  // vertices each frame. Contact compression follows the same surface model.
  const xx=axes.reduce((n,a)=>n+a.x*a.x,0),yy=axes.reduce((n,a)=>n+a.y*a.y,0),xy=axes.reduce((n,a)=>n+a.x*a.y,0);
  const delta=Math.sqrt((xx-yy)**2+4*xy*xy),a=Math.sqrt((xx+yy+delta)/2),b=Math.sqrt(Math.max(.01,(xx+yy-delta)/2)),angle=.5*Math.atan2(2*xy,xx-yy);
  const ca=Math.cos(angle),sa=Math.sin(angle),silhouette:Point3[]=[];
  for(let i=0;i<96;i++){const t=i*Math.PI/48,u=a*Math.cos(t),v=b*Math.sin(t),y=u*sa+v*ca;silhouette.push({x:(u*ca-v*sa)*softContactSpread(y,support),y:softContactHeight(y,support),z:0});}
  const originY=91-Math.max(...silhouette.map(p=>p.y));
  // Small soft tufts extend the silhouette without stretching the underlying body.
  let furHalo='';
  for(let i=0;i<silhouette.length;i++){
    const a=silhouette[i],b=silhouette[(i+1)%silhouette.length];
    const dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy),steps=Math.max(1,Math.ceil(length/1.3));
    for(let j=0;j<steps;j++){
      const t=j/steps,x=50+a.x+dx*t,y=originY+a.y+dy*t;
      const fluff=.5+((i*7+j*3)%11)*.09;
      furHalo+=(furHalo?' L':'M')+x.toFixed(2)+' '+Math.min(91,y).toFixed(2);
      furHalo+=' Q'+(x+dx/steps*.5+dy/Math.max(1,length)*fluff).toFixed(2)+' '+Math.min(91,y+dy/steps*.5-dx/Math.max(1,length)*fluff).toFixed(2);
      furHalo+=' '+(x+dx/steps).toFixed(2)+' '+Math.min(91,y+dy/steps).toFixed(2);
    }
  }
  furHalo+=' Z';
  const normal=(p:Point3)=>{'worklet';return rotate({x:p.x/(r.x*r.x),y:p.y/(r.y*r.y),z:p.z/(r.z*r.z)}).z;};
  // Clip each feature at the horizon, including its near edge. This avoids the
  // whole far eye popping in/out at a single centre-normal threshold.
  const patch=(x:number,y:number,wx:number,hy:number)=>{
    'worklet';
    const vertices:Point3[]=[];
    for(let i=0;i<24;i++){const a=i*Math.PI/12;vertices.push(surface(model,x+wx*Math.cos(a),y+hy*Math.sin(a)));}
    const visible:Point3[]=[];
    for(let i=0;i<vertices.length;i++){
      const a=vertices[i],b=vertices[(i+1)%vertices.length],na=normal(a),nb=normal(b);
      if(na>0)visible.push(rot(a));
      if((na>0)!==(nb>0)){const t=na/(na-nb);visible.push(rot({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t}));}
    }
    return visible.length>2?d(visible,true,originY):'';
  };
  const shut=sleepy?1:Math.max(0,Math.min(1,blink));
  const eyeHeight=Math.max(.5,f.eyeHeight*(1-shut));
  let mouth='';let connected=false;
  for(let i=0;i<=20;i++){
    const x=-7.1+i*.71,y=f.mouthY+(happy?1:-1)*2.1*(1-(x/7.1)**2),p=surface(model,x,y);
    if(normal(p)>0){const q=rot(p);mouth+=`${connected?' L':' M'}${(50+q.x).toFixed(2)} ${(originY+q.y).toFixed(2)}`;connected=true;}else connected=false;
  }
  const fur=['','',''];
  for(let i=0;i<geometry.fibres.length;i++){
    const p=geometry.fibres[i];if(normal(p)<=0)continue;
    const q=rot(p),length=3.4+(i%7)*.53,bend=((i%5)-2)*.013;
    // Curved, overlapping wisps form the entire coat, including the rear.
    // A shared silhouette clips their tips, so there is no separate ring of fur.
    const mid=rot({x:p.x*(1+length*.48/r.x)-p.y*bend,y:p.y*(1+length*.48/r.y)+p.x*bend,z:p.z*(1+length*.48/r.z)});
    const tip=rot({x:p.x*(1+length/r.x)-p.y*bend*.5,y:p.y*(1+length/r.y)+p.x*bend*.5,z:p.z*(1+length/r.z)});
    fur[i%3]+=`M${(50+q.x).toFixed(2)} ${(originY+q.y).toFixed(2)} Q${(50+mid.x).toFixed(2)} ${(originY+mid.y).toFixed(2)} ${(50+tip.x).toFixed(2)} ${(originY+tip.y).toFixed(2)} `;
  }
  return {
    body:d(silhouette,true,originY),furHalo,
    leftLeaf:d([[-.2,-r.y-5,0],[-9,-r.y-13,-3],[-14,-r.y-13,0],[-12,-r.y-6,4]].map(([x,y,z])=>rot({x,y,z})),true,originY),
    rightLeaf:d([[.2,-r.y-5,0],[9,-r.y-12,4],[14,-r.y-12,1],[11,-r.y-5,-2]].map(([x,y,z])=>rot({x,y,z})),true,originY),
    stem:d([{x:0,y:-r.y+1,z:0},{x:.5,y:-r.y-8,z:0}].map(rot),false,originY),
    furLight:fur[0],furMid:fur[1],furShade:fur[2],
    leftCheek:patch(-f.cheekX,f.cheekY,6.7+chew*.8,4+chew*.4),rightCheek:patch(f.cheekX,f.cheekY,6.7+chew*.8,4+chew*.4),
    leftSocket:patch(-f.eyeX,f.eyeY,f.eyeWidth+.65,eyeHeight+.55*(1-shut)),rightSocket:patch(f.eyeX,f.eyeY,f.eyeWidth+.65,eyeHeight+.55*(1-shut)),
    leftEye:patch(-f.eyeX+.28,f.eyeY-.22*(1-shut),f.eyeWidth,eyeHeight),rightEye:patch(f.eyeX-.28,f.eyeY-.22*(1-shut),f.eyeWidth,eyeHeight),
    leftShine:shut>.5?'':patch(-f.eyeX+1.1,f.eyeY-1.4,.73,.85),rightShine:shut>.5?'':patch(f.eyeX+1.1,f.eyeY-1.4,.73,.85),mouth,
    openMouth:mouthOpen>.02?patch(0,f.mouthY,2.8+mouthOpen*.5,1+mouthOpen*2.8):'',
    ...cigaretteProjection(surface(model,7.1,f.mouthY),rx,ry,rz,originY,smoking&&normal(surface(model,7.1,f.mouthY))>0),
  };
}
export function projectOdango(rx:number,ry:number,rz:number,blink=0,happy=false,sleepy=false,mouthOpen=0,chew=0,smoking=false) {
  'worklet';
  return projectEvolvedVolume(ODANGO_GEOMETRY,rx,ry,rz,blink,happy,sleepy,mouthOpen,chew,smoking);
}
export function projectEvolved(stage:keyof typeof GEOMETRIES,rx:number,ry:number,rz:number,blink=0,happy=false,sleepy=false,mouthOpen=0,chew=0,smoking=false) {
  'worklet';
  return projectEvolvedVolume(GEOMETRIES[stage],rx,ry,rz,blink,happy,sleepy,mouthOpen,chew,smoking);
}
/** Only compression is allowed; spring undershoot and held poses cannot stretch
 * an evolved mascot vertically. Compensation uses its original foot anchor. */
export function residentSoftScale(jelly:number,breath:number) {
  'worklet';
  const compression=Math.max(0,Math.min(1,jelly)),b=Math.max(0,Math.min(1,breath));
  return {x:1+compression*.14+b*.011,y:1-compression*.17-b*.014};
}
export function residentWalkYaw(dx:number,dy:number,aspect:number) {
  'worklet';
  return Math.atan2(dx,dy*aspect);
}
