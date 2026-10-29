/** A lathed pin mesh; world coordinates match the collision simulation. */
const profile = [
  [0,.072],[.018,.09],[.065,.108],[.15,.115],[.24,.11],[.32,.089],
  [.40,.061],[.47,.046],[.50,.044],[.53,.046],[.56,.05],[.59,.061],
  [.63,.078],[.68,.084],[.73,.073],[.765,.048],[.78,0],
];
export const PIN_COLORS = Array.from({length:32},(_,i)=>{
  const red=i>=16,t=(i%16)/15;
  const low=red?[72,12,23]:[85,96,115],high=red?[248,88,90]:[255,255,249];
  return `rgb(${low.map((v,k)=>Math.round(v+(high[k]-v)*t)).join(',')})`;
});
type Vec={x:number;y:number;z:number};
const segments=28;
const mesh=profile.slice(0,-1).flatMap(([z,r],ring)=>Array.from({length:segments},(_,i)=>{
  const [z2,r2]=profile[ring+1],a=i/segments*Math.PI*2,b=(i+1)/segments*Math.PI*2,m=(a+b)/2;
  const nz=(r-r2)/(z2-z),norm=Math.hypot(1,nz);
  return {vertices:[{x:r*Math.cos(a),y:r*Math.sin(a),z},{x:r*Math.cos(b),y:r*Math.sin(b),z},{x:r2*Math.cos(b),y:r2*Math.sin(b),z:z2},{x:r2*Math.cos(a),y:r2*Math.sin(a),z:z2}],normal:{x:Math.cos(m)/norm,y:Math.sin(m)/norm,z:nz/norm},red:z>=.47&&z<.50||z>=.53&&z<.56};
}));
export function lanePoint3D(x:number,y:number,z:number,width:number,height:number){
  'worklet';
  const scale=1/(1+1.55*Math.max(0,Math.min(1,y/12)));
  return {x:(.5+x*.385*scale)*width,y:(.95-(1-scale)/.608*.63)*height-z*width*.385*scale,scale};
}
function rotate(v:Vec,angle:number,side:number):Vec{
  'worklet';
  const ax=-.35,ay=side*.93675,c=Math.cos(angle),s=Math.sin(angle),d=ax*v.x+ay*v.y;
  return {x:v.x*c+ay*v.z*s+ax*d*(1-c),y:v.y*c-ax*v.z*s+ay*d*(1-c),z:v.z*c+(ax*v.y-ay*v.x)*s};
}
export function pinMeshPaths(x:number,y:number,degrees:number,width:number,height:number){
  'worklet';
  const angle=degrees*Math.PI/180,side=x<0?-1:1;
  let bottom=0;
  for(const [z,r] of profile)bottom=Math.min(bottom,z*Math.cos(angle)-r*Math.sin(angle));
  const paths=Array<string>(32).fill('');
  for(const face of mesh){
    const n=rotate(face.normal,angle,side);
    if(-n.y*.66+n.z*.75<-.03)continue;
    const diffuse=Math.max(0,-n.x*.45-n.y*.4+n.z*.79);
    const spec=Math.pow(Math.max(0,-n.x*.24-n.y*.55+n.z*.8),28)*.45;
    const rim=Math.pow(Math.max(0,n.x*.7-n.y*.6+n.z*.25),8)*.14;
    const light=Math.max(0,Math.min(1,.18+diffuse*.75+spec+rim));
    let d='';
    for(let i=0;i<face.vertices.length;i++){
      const v=rotate(face.vertices[i],angle,side),p=lanePoint3D(x+v.x,y+v.y,v.z-bottom,width,height);
      d+=`${i?'L':'M'}${p.x.toFixed(2)} ${p.y.toFixed(2)}`;
    }
    paths[(face.red?16:0)+Math.round(light*15)]+=d+'Z';
  }
  return paths;
}
