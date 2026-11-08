import {softContactHeight,softContactSpread} from './softContact';
export type CostumeId='dog'|'cat'|'rabbit'|'frog'|'panda';
export type CostumeForm='egg'|'odango'|'stage3'|'stage4';
export type CostumeVector=[number,number,number];
type V=CostumeVector;
export type CostumeTriangle={p:[V,V,V];n:V;material:number;ear:boolean};
type Triangle=CostumeTriangle;
export const costumeRadii:Record<CostumeForm,V>={egg:[33,41,27],odango:[41,40,38],stage3:[40,39,37.5],stage4:[40,39,37.5]};
// Garment, ears/lower panel, piping, embroidery, eye whites, button/lining.
export const costumeColors:Record<CostumeId,string[]>={dog:['#D49B64','#CD9057','#F0D4AE','#4F392E','#FFF9ED','#B77840'],cat:['#A2B2CA','#E5A7AC','#AFBFD4','#414852','#FFF9F2','#D9959F'],rabbit:['#F0D8CE','#E9ADB2','#F8E5D9','#9C665E','#FFF8F2','#DC969C'],frog:['#A4B18B','#96A37E','#F9F8EE','#303B2C','#F9F8EE','#7E8B61'],panda:['#F3EADD','#42434A','#F8EEDF','#33343A','#FFFAF1','#73736F']};
const SHADES=16;
export const COSTUME_LAYER_COUNT=6*SHADES;
const sub=(a:V,b:V):V=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
function triangle(p:[V,V,V],material:number,ear=false):Triangle{
 const a=sub(p[1],p[0]),b=sub(p[2],p[0]),n:V=[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],length=Math.hypot(...n)||1;
 return {p,n:n.map(x=>x/length) as V,material,ear};
}
/** A thin garment around the original surface, open from forehead to belly.
 * The opening is geometry, never a clipped or independently rotated portrait. */
export function createCostumeMesh(form:CostumeForm,id:CostumeId):Triangle[]{
 const r=costumeRadii[form],mesh:Triangle[]=[];
 const boundary=(a:number)=>{
  // Leave the original cheeks and most of the torso exposed. The brow has
  // enough cloth for the reference costume's embroidery, above the real eyes.
  const c=Math.cos(a),d=Math.sin(a),A=(c/.90)**2+(d/.70)**2,B=-2*d*.07/.70**2,C=(.07/.70)**2-1;
  return Math.asin(Math.min(.975,(-B+Math.sqrt(B*B-4*A*C))/(2*A)));
 };
 const surface=(t:number,a:number):V=>{
  const start=boundary(a),phi=start+(Math.PI-start)*t,y=Math.sin(phi)*Math.sin(a)*r[1],taper=form==='egg'?1+y/300:1;
  return [(r[0]+1.3)*Math.sin(phi)*Math.cos(a)*taper,(r[1]+1.3)*Math.sin(phi)*Math.sin(a),(r[2]+1.3)*Math.cos(phi)*taper];
 };
 for(let lat=0;lat<24;lat++)for(let lon=0;lon<80;lon++){
  const a=lon*Math.PI/40,b=(lon+1)*Math.PI/40,u=lat/24,v=(lat+1)/24;
  const p=surface(u,a),q=surface(v,a),s=surface(u,b),t=surface(v,b);
  const addCloth=(points:[V,V,V])=>{
   if(id!=='panda'){mesh.push(triangle(points,0));return;}
   // Split triangles on the waist seam, so its edge stays smooth on the back.
   for(const material of [0,1]){
    const clipped:V[]=[],height=r[1]*.47,inside=(p:V)=>material===1?p[1]>=height:p[1]<=height;
    for(let i=0;i<3;i++){const a=points[i],b=points[(i+1)%3],aIn=inside(a),bIn=inside(b);if(aIn)clipped.push(a);if(aIn!==bIn){const t=(height-a[1])/(b[1]-a[1]);clipped.push(a.map((v,k)=>v+(b[k]-v)*t) as V);}}
    for(let i=1;i<clipped.length-1;i++)mesh.push(triangle([clipped[0],clipped[i],clipped[i+1]],material));
   }
  };
  addCloth([p,q,s]);addCloth([s,q,t]);
 }
 // A rounded fabric binding follows the actual opening in model space.
 // It has no independent face plane and never resizes the underlying resident.
 const rim=(a:number,t:number):V=>{
  const center=surface(0,a),length=Math.hypot(...center),out=center.map(v=>v/length) as V;
  const tangent:V=[-Math.sin(a),Math.cos(a),0];
  const across:V=[out[1]*tangent[2]-out[2]*tangent[1],out[2]*tangent[0]-out[0]*tangent[2],out[0]*tangent[1]-out[1]*tangent[0]];
  return center.map((v,k)=>v+.68*(Math.cos(t)*out[k]+Math.sin(t)*across[k])) as V;
 };
 for(let i=0;i<128;i++)for(let j=0;j<8;j++){
  const a=i*Math.PI/64,b=(i+1)*Math.PI/64,u=j*Math.PI/4,v=(j+1)*Math.PI/4;
  mesh.push(triangle([rim(a,u),rim(b,u),rim(a,v)],2,true),triangle([rim(a,v),rim(b,u),rim(b,v)],2,true));
 }
 const ellipsoid=(center:V,size:V,material:number,tilt=0)=>{
  const point=(phi:number,a:number):V=>{const x=size[0]*Math.sin(phi)*Math.sin(a),y=-size[1]*Math.cos(phi);return [center[0]+x*Math.cos(tilt)-y*Math.sin(tilt),center[1]+x*Math.sin(tilt)+y*Math.cos(tilt),center[2]+size[2]*Math.sin(phi)*Math.cos(a)];};
  for(let i=0;i<16;i++)for(let j=0;j<32;j++){
   const a=j*Math.PI/16,b=(j+1)*Math.PI/16,u=i*Math.PI/16,v=(i+1)*Math.PI/16;
   mesh.push(triangle([point(u,a),point(u,b),point(v,a)],material,true),triangle([point(u,b),point(v,b),point(v,a)],material,true));
  }
 };
 for(const side of [-1,1]){
  if(id==='dog')ellipsoid([side*r[0]*.93,-r[1]*.34,5],[7,18,5],1,side*-.30);
  // The approved rabbit is lop-eared, not the short upright-ear substitute.
  if(id==='rabbit'){ellipsoid([side*r[0]*.94,-r[1]*.32,5],[7,21,5],0,side*-.36);ellipsoid([side*r[0]*.97,-r[1]*.29,9.3],[3.5,16,1.2],1,side*-.36);}
  if(id==='panda')ellipsoid([side*r[0]*.64,-r[1]*.80,0],[8,8,5],1);
  if(id==='frog'){ellipsoid([side*r[0]*.55,-r[1]*.82,10],[8,8,6],0);ellipsoid([side*r[0]*.55,-r[1]*.85,15.5],[4.6,4.8,1.6],2);ellipsoid([side*r[0]*.55,-r[1]*.85,17],[2.8,3,1],3);ellipsoid([side*r[0]*.55-1,-r[1]*.85-1.1,18],[.9,1,.5],4);}
  if(id==='cat'){
   const a:V=[side*r[0]*.40,-r[1]*.86,4],b:V=[side*r[0]*.79,-r[1]*.62,4],tip:V=[side*r[0]*.70,-r[1]-4,0],back:V=[side*r[0]*.60,-r[1]*.78,-5];
   for(const points of [[a,b,tip],[b,a,back],[tip,b,back],[a,tip,back]] as [V,V,V][]){let t=triangle(points,0,true);if(side<0)t={...t,n:t.n.map(x=>-x) as V};mesh.push(t);}
   const c:V=[side*r[0]*.60,-r[1]*.82,4.2];ellipsoid(c,[3,5,1],1,side*.3);
  }
 }
 // Sewn features follow the curved hood in model coordinates, including
 // during turns and rolls. They never replace the resident's own face.
 const onCloth=(x:number,y:number,lift=.3):V=>[(r[0]+1.3)*x,(r[1]+1.3)*y,(r[2]+1.3)*Math.sqrt(Math.max(.001,1-x*x-y*y))+lift];
 // Tessellate sewn features along the same curved shell. A large flat
 // triangle can cut inside the body and vanish at some viewing angles.
 const sewn=(a:[number,number],b:[number,number],c:[number,number],material:number,lift=.5,steps=4)=>{
  const at=(i:number,j:number):V=>onCloth(a[0]+(b[0]-a[0])*i/steps+(c[0]-a[0])*j/steps,a[1]+(b[1]-a[1])*i/steps+(c[1]-a[1])*j/steps,lift);
  for(let i=0;i<steps;i++)for(let j=0;j<steps-i;j++){
   mesh.push(triangle([at(i,j),at(i+1,j),at(i,j+1)],material,true));
   if(i+j<steps-1)mesh.push(triangle([at(i+1,j),at(i+1,j+1),at(i,j+1)],material,true));
  }
 };
 const patch=(x:number,y:number,w:number,h:number,material:number,tilt=0)=>{
  const point=(a:number):[number,number]=>{const dx=Math.cos(a)*w,dy=Math.sin(a)*h;return [x+dx*Math.cos(tilt)-dy*Math.sin(tilt),y+dx*Math.sin(tilt)+dy*Math.cos(tilt)];};
  for(let i=0;i<40;i++)sewn([x,y],point(i*Math.PI/20),point((i+1)*Math.PI/20),material,.55,3);
 };
 const stitch=(points:[number,number][],width:number,material=3)=>{
  for(let i=1;i<points.length;i++){const [x,y]=points[i-1],[u,v]=points[i],len=Math.hypot(u-x,v-y)||1,dx=-(v-y)/len*width,dy=(u-x)/len*width;
   const a:[number,number]=[x+dx,y+dy],b:[number,number]=[x-dx,y-dy],c:[number,number]=[u+dx,v+dy],d:[number,number]=[u-dx,v-dy];
   sewn(a,b,c,material,.7,3);sewn(c,b,d,material,.7,3);
  }
 };
 if(id==='panda')for(const side of [-1,1])patch(side*.31,-.79,.145,.085,3,side*.62);
 if(id==='dog')patch(0,-.79,.20,.105,2);
 if(id==='panda'||id==='dog'||id==='cat'||id==='rabbit'){
  const material=id==='rabbit'?5:3;
  const nose=[[-.065,-.82],[.065,-.82],[0,-.755]] as [number,number][];
  sewn(nose[0],nose[1],nose[2],material,.85,4);
  stitch([[0,-.77],[0,-.715]],.010,material);
  if(id==='dog')for(const side of [-1,1])stitch([[0,-.74],[side*.045,-.705],[side*.10,-.70]],.012);
 }
 if(id==='cat')for(const side of [-1,1])for(const offset of [0,.075])stitch([[side*.18,-.80+offset],[side*.29,-.81+offset],[side*.39,-.79+offset]],.013);
 if(id==='frog'){
  for(const side of [-1,1])patch(side*.085,-.80,.028,.023,3);
  stitch(Array.from({length:25},(_,i)=>{const x=(i/24-.5)*.69;return [x,-.70-.06*(Math.abs(x)/.345)**6] as [number,number];}),.013);
 }
 // A small fastening below the open belly keeps the hood reading as clothing.
 stitch([[0,.79],[0,.98]],.018,id==='panda'?1:2);
 patch(0,.82,.052,.038,5);
 for(const side of [-1,1])patch(side*.017,.82,.007,.007,3);
 return mesh;
}
const meshes={} as Record<string,Triangle[]>;
for(const form of Object.keys(costumeRadii) as CostumeForm[])for(const id of Object.keys(costumeColors) as CostumeId[])meshes[`${form}:${id}`]=createCostumeMesh(form,id);
export function projectCostume(form:CostumeForm,id:CostumeId,rx:number,ry:number,rz:number,night=false){
 'worklet';
 const r=costumeRadii[form],cx=Math.cos(rx),sx=Math.sin(rx),cy=Math.cos(ry),sy=Math.sin(ry),cz=Math.cos(rz),sz=Math.sin(rz);
 const m=[cy*cz,cy*sz,-sy,sx*sy*cz-cx*sz,sx*sy*sz+cx*cz,sx*cy,cx*sy*cz+sx*sz,cx*sy*sz-sx*cz,cx*cy];
 const rot=(p:V):V=>{'worklet';return [m[0]*p[0]+m[3]*p[1]+m[6]*p[2],m[1]*p[0]+m[4]*p[1]+m[7]*p[2],m[2]*p[0]+m[5]*p[1]+m[8]*p[2]];};
 const support=Math.hypot(m[1]*r[0],m[4]*r[1],m[7]*r[2]);
 let floor=softContactHeight(support,support);
 if(form==='stage3'||form==='stage4')for(const p of [[-14,-r[1]-13,-1.8],[14,-r[1]-13,1.8]] as V[])floor=Math.max(floor,rot(p)[1]);
 const scale=form==='egg'?1:.92,origin=form==='egg'?50:91-floor*.92-.7;
 const groups=Array.from({length:COSTUME_LAYER_COUNT},()=> ''),fur=Array.from({length:COSTUME_LAYER_COUNT},()=> '');
 const depth=(x:number,y:number)=>{
  'worklet';let a=0,b=0,c=-1;
  for(let i=0;i<3;i++){const offset=(m[i*3]*x+m[i*3+1]*y)/r[i],z=m[i*3+2]/r[i];a+=z*z;b+=2*offset*z;c+=offset*offset;}
  const d=b*b-4*a*c;return d<0?-Infinity:(-b+Math.sqrt(d))/(2*a);
 };
 for(const t of meshes[`${form}:${id}`]){
  const n=rot(t.n);if(n[2]<.015)continue;
  const points=t.p.map(rot),mid:V=[0,0,0];for(const p of points)for(let k=0;k<3;k++)mid[k]+=p[k]/3;
  if(t.ear&&mid[2]<depth(mid[0],mid[1])-.2)continue;
  const shade=Math.max(0,Math.min(SHADES-1,Math.round((n[2]*.50-n[0]*.20-n[1]*.30+.25)*(SHADES-1))));
  const path=points.map((p,i)=>{const spread=form==='egg'?1:softContactSpread(p[1],support),y=form==='egg'?p[1]:softContactHeight(p[1],support);return `${i?'L':'M'}${(50+p[0]*spread*scale).toFixed(2)} ${(origin+y*scale).toFixed(2)}`;}).join('')+'Z';
  const group=t.material*SHADES+shade;
  groups[group]+=path;
  // Small fibres attached to the garment surface: rotate with the cloth.
  const tip=rot([t.p[0][0]*.25+t.p[1][0]*.5+t.p[2][0]*.25,t.p[0][1]*.25+t.p[1][1]*.5+t.p[2][1]*.25,t.p[0][2]*.25+t.p[1][2]*.5+t.p[2][2]*.25]);
  const xy=(p:V)=>{'worklet';return `${(50+p[0]*(form==='egg'?1:softContactSpread(p[1],support))*scale).toFixed(2)} ${(origin+(form==='egg'?p[1]:softContactHeight(p[1],support))*scale).toFixed(2)}`;};
  if(t.material<3)fur[group]+=`M${xy(mid)}L${xy(tip)}`;
 }
 return groups.map((d,i)=>{
  const hex=costumeColors[id][Math.floor(i/SHADES)],shade=.78+(i%SHADES)/(SHADES-1)*.245;
  const rgb=[1,3,5].map((at,k)=>Math.round(parseInt(hex.slice(at,at+2),16)*shade*(night?[.91,.94,1][k]:1)));
  return {d,fur:fur[i],fill:`rgb(${rgb.join(',')})`};
 });
}
