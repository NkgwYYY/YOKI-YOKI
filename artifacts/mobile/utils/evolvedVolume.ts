import {rotatePoint, type Point3} from './residentVolume';

/** Shape/face coordinates traced against assets/images/characters/odango.png
 * (512px square). Back fur is inferred: no turnaround art is supplied. Keep
 * each future form's geometry and surface details in its own model definition. */
export type ResidentVolumeModel = {
  radius: Point3; floor: number; face: {eyeX:number;eyeY:number;eyeWidth:number;eyeHeight:number;cheekX:number;cheekY:number;mouthY:number};
};
export const ODANGO_MODEL: ResidentVolumeModel = {
  radius:{x:45,y:43,z:37},floor:39,
  face:{eyeX:10.5,eyeY:-3,eyeWidth:4.3,eyeHeight:5,cheekX:18,cheekY:7,mouthY:10},
};
export const EVOLVED_VOLUME_MODELS = {odango:ODANGO_MODEL} as const;
function surface(model:ResidentVolumeModel,x:number,y:number):Point3 {
  'worklet';
  const r=model.radius;
  return {x,y,z:r.z*Math.sqrt(Math.max(0,1-(x/r.x)**2-(y/r.y)**2))};
}
function outline(model:ResidentVolumeModel) {
  const points:Point3[]=[];
  for(let ring=0;ring<=16;ring++)for(let slice=0;slice<24;slice++){
    const a=ring*Math.PI/16,b=slice*Math.PI/12,r=model.radius;
    points.push({x:r.x*Math.sin(a)*Math.cos(b),y:Math.min(model.floor,-r.y*Math.cos(a)),z:r.z*Math.sin(a)*Math.sin(b)});
  }
  return points;
}
// Stable surface fibres: no random calls, allocations of geometry or JS timers
// on animation frames. The three paths batch fur rather than mount hundreds of nodes.
function fibres(model:ResidentVolumeModel) {
  const points:Point3[]=[];
  for(let i=0;i<600;i++){
    const y=1-2*(i+.5)/600,a=i*2.399963229728653,r=model.radius;
    points.push({x:r.x*Math.sqrt(1-y*y)*Math.cos(a),y:Math.min(model.floor,r.y*y),z:r.z*Math.sqrt(1-y*y)*Math.sin(a)});
  }
  return points;
}
export function createVolumeGeometry(model:ResidentVolumeModel) {
  return {model,outline:outline(model),fibres:fibres(model)};
}
const ODANGO_GEOMETRY=createVolumeGeometry(ODANGO_MODEL);
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
export function projectEvolvedVolume(geometry:ReturnType<typeof createVolumeGeometry>,rx:number,ry:number,rz:number,blink=0,happy=false,sleepy=false) {
  'worklet';
  const model=geometry.model,r=model.radius,f=model.face;
  const rot=(p:Point3)=>{'worklet';return rotatePoint(p,rx,ry,rz);};
  const silhouette=hull(geometry.outline.map(rot));
  const originY=91-Math.max(...silhouette.map(p=>p.y));
  const normal=(p:Point3)=>{'worklet';return rot({x:p.x/(r.x*r.x),y:p.y/(r.y*r.y),z:p.z/(r.z*r.z)}).z;};
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
    const x=-7.5+i*.75,y=f.mouthY+(happy?1:-1)*2.2*(1-(x/7.5)**2),p=surface(model,x,y);
    if(normal(p)>0){const q=rot(p);mouth+=`${connected?' L':' M'}${(50+q.x).toFixed(2)} ${(originY+q.y).toFixed(2)}`;connected=true;}else connected=false;
  }
  const fur=['','',''];
  for(let i=0;i<geometry.fibres.length;i++){
    const p=geometry.fibres[i];if(normal(p)<=0)continue;
    const q=rot(p),length=1.2+(i%7)*.14;
    // Fibres radiate with the volume and remain present on sides and rear.
    const tip=rot({x:p.x*(1+length/r.x),y:p.y*(1+length/r.y),z:p.z*(1+length/r.z)});
    fur[i%3]+=d([q,tip],false,originY)+' ';
  }
  return {
    body:d(silhouette,true,originY),furLight:fur[0],furMid:fur[1],furShade:fur[2],
    leftCheek:patch(-f.cheekX,f.cheekY,6.7,4),rightCheek:patch(f.cheekX,f.cheekY,6.7,4),
    leftSocket:patch(-f.eyeX,f.eyeY,5.6,6.3),rightSocket:patch(f.eyeX,f.eyeY,5.6,6.3),
    leftEye:patch(-f.eyeX,f.eyeY,f.eyeWidth,eyeHeight),rightEye:patch(f.eyeX,f.eyeY,f.eyeWidth,eyeHeight),
    leftShine:shut>.5?'':patch(-f.eyeX+1.1,f.eyeY-1.8,1,1.1),rightShine:shut>.5?'':patch(f.eyeX+1.1,f.eyeY-1.8,1,1.1),mouth,
  };
}
export function projectOdango(rx:number,ry:number,rz:number,blink=0,happy=false,sleepy=false) {
  'worklet';
  return projectEvolvedVolume(ODANGO_GEOMETRY,rx,ry,rz,blink,happy,sleepy);
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
