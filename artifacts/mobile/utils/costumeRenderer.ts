/** The costume is a thin 3D shell over the unchanged resident. All textile
 * fibres, binding, patches and ears live in the same model coordinate system. */
import {createCostumeMesh,costumeRadii,costumeColors,type CostumeForm,type CostumeId,type CostumeVector} from './costumeGeometry';
import {softContactHeight,softContactSpread} from './softContact';
type V=CostumeVector;
const unit=(v:V):V=>{const l=Math.hypot(...v)||1;return v.map(x=>x/l) as V;};
const rnd=(x:number)=>{const n=Math.sin(x*127.1+13.7)*43758.5453;return n-Math.floor(n);};
const cache=new Map<string,ReturnType<typeof build>>();
function build(form:CostumeForm,id:CostumeId){
 const mesh=createCostumeMesh(form,id);
 const fibres=mesh.flatMap((tri,i)=>{
  if(tri.material>2)return [];
  const p=tri.p,area=Math.hypot(...[0,1,2].map(k=>(p[1][(k+1)%3]-p[0][(k+1)%3])*(p[2][(k+2)%3]-p[0][(k+2)%3])-(p[1][(k+2)%3]-p[0][(k+2)%3])*(p[2][(k+1)%3]-p[0][(k+1)%3]))) /2;
  const count=Math.min(9,Math.max(1,Math.ceil(area*.6)));
  return Array.from({length:count},(_,j)=>{
   const seed=i*19+j,a=Math.sqrt(rnd(seed+1)),b=rnd(seed+2),root=p[0].map((v,k)=>v*(1-a)+p[1][k]*a*(1-b)+p[2][k]*a*b) as V;
   const n=tri.n,down:V=[root[0]*.014,1,root[2]*.008],dot=down[0]*n[0]+down[1]*n[1]+down[2]*n[2];
   const tangent=unit(down.map((v,k)=>v-dot*n[k]) as V),length=.38+rnd(seed+3)*.65;
   const tip=root.map((v,k)=>v+tangent[k]*length+n[k]*.15) as V;
   return {root,tip,n,material:tri.material,variation:rnd(seed+4),ear:tri.ear};
  });
 });return {mesh,fibres};
}
export function paintCostume(ctx:CanvasRenderingContext2D,form:CostumeForm,id:CostumeId,rx:number,ry:number,rz:number,night=false){
 const key=form+':'+id;let model=cache.get(key);if(!model){model=build(form,id);cache.set(key,model);}
 const r=costumeRadii[form],cx=Math.cos(rx),sx=Math.sin(rx),cy=Math.cos(ry),sy=Math.sin(ry),cz=Math.cos(rz),sz=Math.sin(rz);
 const m=[cy*cz,cy*sz,-sy,sx*sy*cz-cx*sz,sx*sy*sz+cx*cz,sx*cy,cx*sy*cz+sx*sz,cx*sy*sz-sx*cz,cx*cy];
 const rot=(p:V):V=>[m[0]*p[0]+m[3]*p[1]+m[6]*p[2],m[1]*p[0]+m[4]*p[1]+m[7]*p[2],m[2]*p[0]+m[5]*p[1]+m[8]*p[2]];
 const support=Math.hypot(m[1]*r[0],m[4]*r[1],m[7]*r[2]);let floor=softContactHeight(support,support);
 if(form==='stage3'||form==='stage4')for(const p of [[-14,-r[1]-13,-1.8],[14,-r[1]-13,1.8]] as V[])floor=Math.max(floor,rot(p)[1]);
 const scale=form==='egg'?1:.92,origin=form==='egg'?50:91-floor*.92-.7;
 const xy=(p:V):[number,number]=>[50+p[0]*(form==='egg'?1:softContactSpread(p[1],support))*scale,origin+(form==='egg'?p[1]:softContactHeight(p[1],support))*scale];
 const depth=(x:number,y:number)=>{let a=0,b=0,c=-1;for(let i=0;i<3;i++){const q=(m[i*3]*x+m[i*3+1]*y)/r[i],z=m[i*3+2]/r[i];a+=z*z;b+=2*q*z;c+=q*q;}const d=b*b-4*a*c;return d<0?-Infinity:(-b+Math.sqrt(d))/(2*a);};
 const palette=costumeColors[id].map(hex=>[1,3,5].map(at=>parseInt(hex.slice(at,at+2),16)));
 const shade=(n:V)=>Math.max(.63,Math.min(1.10,.83+n[2]*.13-n[0]*.10-n[1]*.14));
 const color=(material:number,f:number)=>`rgb(${palette[material].map((v,i)=>Math.max(0,Math.min(255,Math.round(v*f*(night?[.91,.94,1][i]:1))))).join(',')})`;
 // Painter order is depth-based, not material-based. An ear on the far side
 // cannot overwrite the near hood, particularly during a roll or back view.
 const triangles=model.mesh.flatMap(t=>{const n=rot(t.n);if(n[2]<.015)return [];const p=t.p.map(rot),mid=p[0].map((v,i)=>(v+p[1][i]+p[2][i])/3) as V;if(t.ear&&mid[2]<depth(mid[0],mid[1])-.25)return [];return [{p,n,z:mid[2],material:t.material}];}).sort((a,b)=>a.z-b.z);
 ctx.save();ctx.setTransform(ctx.canvas.width/100,0,0,ctx.canvas.height/100,0,0);ctx.lineJoin='round';ctx.lineWidth=.35;
 const drawTriangles=(items:typeof triangles)=>{
  // Small depth bands retain near/far order while batching the same shade.
  // Slight overlap closes antialias seams between adjacent cloth triangles.
  const bands=new Map<number,Map<string,Path2D>>();
  for(const t of items){const band=Math.floor((t.z+65)/4),c=color(t.material,Math.round(shade(t.n)*128)/128);let colors=bands.get(band);if(!colors){colors=new Map();bands.set(band,colors);}let path=colors.get(c);if(!path){path=new Path2D();colors.set(c,path);}const p=t.p.map(xy);path.moveTo(...p[0]);path.lineTo(...p[1]);path.lineTo(...p[2]);path.closePath();}
  for(const band of [...bands.keys()].sort((a,b)=>a-b))for(const [c,path]of bands.get(band)!){ctx.fillStyle=ctx.strokeStyle=c;ctx.fill(path);ctx.stroke(path);}
 };
 drawTriangles(triangles);
 // A small depth surface also occludes fibres. Otherwise white hood fibres
 // from behind an ear can incorrectly draw on top of the black ear during turns.
 const grid=128,depths=new Float32Array(grid*grid);depths.fill(-Infinity);
 for(const t of triangles){const p=t.p.map(q=>{const [x,y]=xy(q);return [x*grid/100,y*grid/100,q[2]];});const [a,b,c]=p;
  const denominator=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);if(Math.abs(denominator)<.0001)continue;
  const x0=Math.max(0,Math.floor(Math.min(a[0],b[0],c[0]))),x1=Math.min(grid-1,Math.ceil(Math.max(a[0],b[0],c[0]))),y0=Math.max(0,Math.floor(Math.min(a[1],b[1],c[1]))),y1=Math.min(grid-1,Math.ceil(Math.max(a[1],b[1],c[1])));
  for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const u=((b[1]-c[1])*(x+.5-c[0])+(c[0]-b[0])*(y+.5-c[1]))/denominator,v=((c[1]-a[1])*(x+.5-c[0])+(a[0]-c[0])*(y+.5-c[1]))/denominator;if(u>=0&&v>=0&&u+v<=1){const at=y*grid+x;depths[at]=Math.max(depths[at],u*a[2]+v*b[2]+(1-u-v)*c[2]);}}
 }
 const paths=new Map<string,Path2D>();
 for(const h of model.fibres){const n=rot(h.n);if(n[2]<.025)continue;const p=rot(h.root);if(h.ear&&p[2]<depth(p[0],p[1])-.1)continue;const screen=xy(p),gx=Math.floor(screen[0]*grid/100),gy=Math.floor(screen[1]*grid/100);if(gx>=0&&gx<grid&&gy>=0&&gy<grid&&p[2]<depths[gy*grid+gx]-.65)continue;const f=Math.round((shade(n)*(.93+h.variation*.14))*20)/20,c=color(h.material,f);let path=paths.get(c);if(!path){path=new Path2D();paths.set(c,path);}const a=xy(p),b=xy(rot(h.tip));path.moveTo(...a);path.lineTo(...b);}
 ctx.lineCap='round';ctx.lineWidth=.11;for(const [c,path]of paths){ctx.strokeStyle=c;ctx.stroke(path);}ctx.lineWidth=.18;drawTriangles(triangles.filter(t=>t.material>=3));ctx.restore();
}
