// Frozen production geometry from c43f51e218e8a056aea1af0d7240b0b4a0fbc71d (build 48).
// Compare on the same JS runtime: Math.sin/random last bits vary across CPU/libm.
const RADIUS=[41,40,38], STRIDE=12, FIBRES=18000;
const random=(n:number)=>{const v=Math.sin(n*127.1+311.7)*43758.5453123;return v-Math.floor(v);};

export function productionGeometry(fur:boolean):Float32Array {
  const count=fur?FIBRES*18:24*48*6,out=new Float32Array(count*STRIDE);let at=0;
  const vertex=(p:number[],root:number[],direction:number[],t=0,side=0,seed=0)=>{for(const v of [...p,...root,...direction,t,side,seed])out[at++]=v;};
  if(fur){
    // Curves, grooming and normals are built once, never in a frame or shader.
    // The GPU only rotates the static ribbons and applies floor compression.
    for(let i=0;i<FIBRES;i++){
      const y=1-2*(i+.5)/FIBRES,a=i*2.399963229728653+(random(i+108)-.5)*.18,s=Math.sqrt(1-y*y),seed=random(i+49);
      const root=[s*Math.cos(a),y,s*Math.sin(a)],p=root.map((v,j)=>v*RADIUS[j]);
      const raw=root.map((v,j)=>v/RADIUS[j]),len=Math.hypot(...raw),n=raw.map(v=>v/len);
      const down=[p[0]*.032,.24+p[1]*.033,-.25],dot=down.reduce((v,d,j)=>v+d*n[j],0),along=down.map((v,j)=>v-dot*n[j]),norm=Math.hypot(...along)||1,tangent=along.map(v=>v/norm);
      const wave=[n[1]*tangent[2]-n[2]*tangent[1],n[2]*tangent[0]-n[0]*tangent[2],n[0]*tangent[1]-n[1]*tangent[0]];
      const lift=.7+seed*1.5,bend=4.1+(seed*19.73%1)*4.4;
      const points=Array.from({length:4},(_,j)=>{const t=j/3;return {p:p.map((v,k)=>v+n[k]*Math.sin(t*Math.PI/2)*lift+tangent[k]*t*t*bend+wave[k]*Math.sin(t*Math.PI*2+seed*Math.PI*2)*.55*t),direction:n.map((v,k)=>v*Math.cos(t*Math.PI/2)*lift*Math.PI/2+tangent[k]*2*Math.max(t,.04)*bend)};});
      for(let j=0;j<3;j++)for(const [k,edge] of [[j,-1],[j+1,-1],[j,1],[j,1],[j+1,-1],[j+1,1]])vertex(points[k].p,root,points[k].direction,k/3,edge,seed);
    }
  }else{
    const point=(i:number,j:number)=>{const a=Math.PI*i/24,b=Math.PI*2*j/48;return [Math.sin(a)*Math.cos(b),-Math.cos(a),Math.sin(a)*Math.sin(b)];};
    for(let i=0;i<24;i++)for(let j=0;j<48;j++)for(const [row,col] of [[i,j],[i+1,j],[i,j+1],[i,j+1],[i+1,j],[i+1,j+1]]){const root=point(row,col);vertex(root.map((v,k)=>v*RADIUS[k]*1.006),root,[0,1,0]);}
  }
  return out;
}


