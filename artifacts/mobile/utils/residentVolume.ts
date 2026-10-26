/** Small, genuine 3D egg surface, projected into SVG on the UI thread. Features
 * are attached to the surface and culled on the back, not a rotating billboard.
 * Coordinates are millimetre-like model units; the SVG camera is orthographic. */
export type Point3 = {x:number;y:number;z:number};
export function rotatePoint(p: Point3, rx:number, ry:number, rz:number): Point3 {
  'worklet';
  const cx=Math.cos(rx),sx=Math.sin(rx),cy=Math.cos(ry),sy=Math.sin(ry),cz=Math.cos(rz),sz=Math.sin(rz);
  const y=p.y*cx-p.z*sx,z=p.y*sx+p.z*cx;
  const x=p.x*cy+z*sy,z2=-p.x*sy+z*cy;
  return {x:x*cz-y*sz,y:x*sz+y*cz,z:z2};
}
function radius(y:number) {'worklet';return 33*Math.sqrt(Math.max(0,1-(y/41)**2))*(1+y/300);}
function surface(x:number,y:number): Point3 {'worklet';const r=radius(y);return {x,y,z:27*Math.sqrt(Math.max(0,1-(y/41)**2))*Math.sqrt(Math.max(0,1-(x/Math.max(1,r))**2))};}
const MODEL: Point3[]=[];
for(let ring=0;ring<=24;ring++){
  const y=-Math.cos(Math.PI*ring/24)*41,r=radius(y);
  for(let slice=0;slice<32;slice++){const a=slice*Math.PI/16;MODEL.push({x:Math.cos(a)*r,y,z:Math.sin(a)*r*27/33});}
}
function hull(points:Point3[]) {
  'worklet';
  const p=points.slice().sort((a,b)=>a.x-b.x||a.y-b.y);
  const cross=(o:Point3,a:Point3,b:Point3)=>{ 'worklet';return (a.x-o.x)*(b.y-o.y)-(a.y-o.y)*(b.x-o.x);};
  const lower:Point3[]=[],upper:Point3[]=[];
  for(let i=0;i<p.length;i++){while(lower.length>=2&&cross(lower[lower.length-2],lower[lower.length-1],p[i])<=0)lower.pop();lower.push(p[i]);}
  for(let i=p.length-1;i>=0;i--){while(upper.length>=2&&cross(upper[upper.length-2],upper[upper.length-1],p[i])<=0)upper.pop();upper.push(p[i]);}
  lower.pop();upper.pop();return lower.concat(upper);
}
function path(points:Point3[],closed=true) {'worklet';return points.map((p,i)=>`${i?'L':'M'}${(50+p.x).toFixed(2)} ${(50+p.y).toFixed(2)}`).join(' ')+(closed?' Z':'');}
const FRONT_BODY=path(hull(MODEL));
export function cigaretteProjection(anchor:Point3,rx:number,ry:number,rz:number,originY=50,visible=true){
  'worklet';
  if(!visible)return {cigarettePaper:'',cigaretteFilter:'',cigaretteEmber:'',cigaretteSmoke:''};
  const at=(length:number)=>{'worklet';const p=rotatePoint({x:anchor.x+length,y:anchor.y-length*.04,z:anchor.z+1+length*.22},rx,ry,rz);return {x:50+p.x,y:originY+p.y};};
  const a=at(0),b=at(5),c=at(18),tip=at(19.5);
  const line=(a:{x:number;y:number},b:{x:number;y:number})=>{'worklet';return `M${a.x.toFixed(2)} ${a.y.toFixed(2)} L${b.x.toFixed(2)} ${b.y.toFixed(2)}`;};
  return {cigaretteFilter:line(a,b),cigarettePaper:line(b,c),cigaretteEmber:line(c,tip),cigaretteSmoke:`M${tip.x.toFixed(2)} ${(tip.y-3).toFixed(2)} C${(tip.x+8).toFixed(2)} ${(tip.y-14).toFixed(2)} ${(tip.x-5).toFixed(2)} ${(tip.y-17).toFixed(2)} ${(tip.x+2).toFixed(2)} ${(tip.y-28).toFixed(2)} S${(tip.x-3).toFixed(2)} ${(tip.y-40).toFixed(2)} ${(tip.x+2).toFixed(2)} ${(tip.y-46).toFixed(2)}`};
}
export function projectEgg(rx:number,ry:number,rz:number,blink=0,happy=false,sleepy=false,mouthOpen=0,chew=0,smoking=false) {
  'worklet';
  const bx=rotatePoint({x:1,y:0,z:0},rx,ry,rz),by=rotatePoint({x:0,y:1,z:0},rx,ry,rz),bz=rotatePoint({x:0,y:0,z:1},rx,ry,rz);
  const rot=(p:Point3)=>{'worklet';return {x:bx.x*p.x+by.x*p.y+bz.x*p.z,y:bx.y*p.x+by.y*p.y+bz.y*p.z,z:bx.z*p.x+by.z*p.y+bz.z*p.z};};
  const patch=(x:number,y:number,wx:number,hy:number)=>{
    'worklet';
    const front=rot({x:x/33,y:y/50,z:1});
    if(front.z<.05)return '';
    const points:Point3[]=[];
    for(let i=0;i<16;i++){const a=i*Math.PI/8;const p=surface(x+wx*Math.cos(a),y+hy*Math.sin(a));p.z+=.8;points.push(rot(p));}
    return path(points);
  };
  const line=(xy:number[][])=>{'worklet';const mid=xy[Math.floor(xy.length/2)];if(rot({x:mid[0]/33,y:mid[1]/50,z:1}).z<.05)return '';return path(xy.map(([x,y])=>{const p=surface(x,y);p.z+=1;return rot(p);}),false);};
  const shut=sleepy?1:blink;
  const mouth:number[][]=[];
  for(let i=0;i<=12;i++){const x=-7+i*14/12;mouth.push([x,17+(happy?1:-1)*(1-(x/7)**2)*2.7]);}
  return {
    body:rx===0&&ry===0&&rz===0?FRONT_BODY:path(hull(MODEL.map(rot))),
    leftSocket:patch(-10,6,5.5,6),rightSocket:patch(10,6,5.5,6),
    leftEye:patch(-10,6,4,Math.max(.55,4.5*(1-shut))),rightEye:patch(10,6,4,Math.max(.55,4.5*(1-shut))),
    leftShine:shut>.5?'':patch(-8.7,4.3,1,1.1),rightShine:shut>.5?'':patch(11.3,4.3,1,1.1),
    leftCheek:patch(-17,13,6.3+chew*1.7,3.6+chew),rightCheek:patch(17,13,6.3+chew*1.7,3.6+chew),
    mouth:line(mouth),openMouth:mouthOpen>.02?patch(0,17,3.5+mouthOpen*2,1+mouthOpen*4):'',crack:line([[-4,-32],[-6,-26],[-2,-23],[-5,-17]]),
    facing:rot({x:0,y:0,z:1}).z,
    ...cigaretteProjection(surface(7,17),rx,ry,rz,50,smoking&&rot({x:7/33,y:17/50,z:1}).z>.05),
  };
}
