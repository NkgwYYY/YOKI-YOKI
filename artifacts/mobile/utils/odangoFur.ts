/** One shared GPU coat for every Mofumofu on the page. Geometry is uploaded once;
 * turns change uniforms, and blinking/chewing reuse each resident's cached coat.
 * Keeping the visible canvas in 2D also leaves the small facial paths unchanged. */
type CoatPose = {rotation:number[]; support:number; origin:number; night:boolean};
const RADIUS=[41,40,38], STRIDE=12, FIBRES=18000;
const random=(n:number)=>{const v=Math.sin(n*127.1+311.7)*43758.5453123;return v-Math.floor(v);};

function geometry(fur:boolean):Float32Array {
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

const VERTEX=`
precision highp float;
attribute vec3 aPosition, aRoot, aDirection;
attribute float aAlong, aEdge, aSeed;
uniform mat3 uRotation;
uniform float uSupport, uOrigin;
uniform mediump float uFur;
varying mediump vec3 vRoot, vNormal;
varying mediump float vAlong, vEdge, vSeed, vFloorFade;
vec3 contact(vec3 p) {
  float spread=clamp((p.y/uSupport-.35)/.59,0.,1.);
  p.xz*=1.+.04*spread*spread*(3.-2.*spread);
  float start=uSupport*.82, range=uSupport*.12;
  if(p.y>start){float t=min(1.,(p.y-start)/range);p.y=start+range*(t-.5*t*t);}
  return p;
}
void main(){
  vec3 n=normalize(aRoot/vec3(41.,40.,38.));
  vRoot=aRoot;vNormal=uRotation*n;vAlong=aAlong;vEdge=aEdge;vSeed=aSeed;
  vFloorFade=1.;
  if(uFur>.5&&vNormal.z<-.14){gl_Position=vec4(2.,2.,2.,1.);return;}
  vec3 rotated=uRotation*aPosition;
  vec3 q=contact(rotated);
  vFloorFade=1.-smoothstep(uSupport*.88-.85,uSupport*.88+.05,q.y);
  if(uFur>.5){
    vec3 direction=uRotation*aDirection;
    vec2 side=normalize(vec2(-direction.y,direction.x)+vec2(.0001));
    float width=(.11+.08*fract(aSeed*7.13))*(1.-aAlong*.88);
    q.xy+=side*aEdge*width;
    float ground=smoothstep(uSupport*.78,uSupport*.94,rotated.y);
    q.y-=ground*aAlong*fract(aSeed*23.1)*.65;
  }
  gl_Position=vec4(q.x*.0184,1.-(uOrigin+q.y*.92)*.02,-q.z/70.,1.);
}`;
const FRAGMENT=`
precision mediump float;
uniform sampler2D uTexture;
uniform float uFur, uNight, uTextured;
varying vec3 vRoot, vNormal;
varying float vAlong, vEdge, vSeed, vFloorFade;
void main(){
  vec3 n=normalize(vNormal);
  if(n.z<-.08)discard;
  vec3 white=vec3(.974,.978,.961),color;
  float alpha;
  float light=max(0.,dot(n,normalize(vec3(-.45,-.68,.8))));
  vec2 front=vec2(.5+vRoot.x*.41,.5+vRoot.y*.37);
  vec2 side=vec2(.5+vRoot.z*.41,.5+vRoot.y*.37);
  float blend=vRoot.x*vRoot.x/max(.001,dot(vRoot.xz,vRoot.xz));
  color=mix(white,mix(texture2D(uTexture,front).rgb,texture2D(uTexture,side).rgb,blend),uTextured*.75);
  color*=.985+.015*light;
  if(uFur>.5){
    color*=1.+.009*(vSeed-.5)+vAlong*.007;
    alpha=(1.-smoothstep(.35,1.,abs(vEdge)))*(1.-smoothstep(.72,1.,vAlong));
    alpha*=smoothstep(-.08,.08,n.z);
    alpha*=1.-smoothstep(.25,.75,n.z)*.52;
  }else{
    // No opaque ball edge: the dense roots cover this gradual undercoat fade.
    alpha=smoothstep(.01,.24,n.z)*vFloorFade;
  }
  color*=mix(vec3(1.),vec3(.91,.94,1.),uNight);
  gl_FragColor=vec4(color*alpha,alpha);
}`;

type GPU={canvas:HTMLCanvasElement;gl:WebGLRenderingContext;program:WebGLProgram;body:WebGLBuffer;fur:WebGLBuffer;texture:WebGLTexture;bodyCount:number;furCount:number;attributes:number[];uniforms:Record<string,WebGLUniformLocation|null>;textureSource:string;generation:number};
let shared:GPU|null|undefined;
let generation=0;
function initialise(canvas:HTMLCanvasElement,gl:WebGLRenderingContext):GPU {
  const shaders:WebGLShader[]=[],buffers:WebGLBuffer[]=[];
  let program:WebGLProgram|null=null,texture:WebGLTexture|null=null;
  try{
    const compile=(type:number,source:string)=>{const shader=gl.createShader(type);if(!shader)throw new Error('Coat shader unavailable');shaders.push(shader);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(shader)||'Coat shader failed');return shader;};
    program=gl.createProgram();if(!program)throw new Error('Coat program unavailable');
    gl.attachShader(program,compile(gl.VERTEX_SHADER,VERTEX));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,FRAGMENT));gl.linkProgram(program);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program)||'Coat link failed');
    const upload=(data:Float32Array)=>{const buffer=gl.createBuffer();if(!buffer)throw new Error('Coat buffer unavailable');buffers.push(buffer);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);return buffer;};
    const bodyData=geometry(false),furData=geometry(true),body=upload(bodyData),fur=upload(furData);
    texture=gl.createTexture();if(!texture)throw new Error('Coat texture unavailable');
    gl.bindTexture(gl.TEXTURE_2D,texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([249,250,245,255]));
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    const attributes=['aPosition','aRoot','aDirection','aAlong','aEdge','aSeed'].map(name=>gl.getAttribLocation(program!,name));
    const uniforms:GPU['uniforms']={};for(const name of ['uRotation','uSupport','uOrigin','uFur','uNight','uTexture','uTextured'])uniforms[name]=gl.getUniformLocation(program,name);
    return {canvas,gl,program,body,fur,texture,bodyCount:bodyData.length/STRIDE,furCount:furData.length/STRIDE,attributes,uniforms,textureSource:'',generation:++generation};
  }catch(error){for(const b of buffers)gl.deleteBuffer(b);if(texture)gl.deleteTexture(texture);if(program)gl.deleteProgram(program);throw error;}
  finally{for(const shader of shaders)gl.deleteShader(shader);}
}
function gpu():GPU|null {
  if(shared!==undefined)return shared&&!shared.gl.isContextLost()?shared:null;
  shared=null;
  if(typeof document==='undefined')return null;
  const canvas=document.createElement('canvas');
  const gl=canvas.getContext('webgl',{alpha:true,premultipliedAlpha:true,antialias:false,depth:true,stencil:false,preserveDrawingBuffer:false,powerPreference:'low-power'});
  if(!gl)return null;
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();});
  canvas.addEventListener('webglcontextrestored',()=>{try{shared=initialise(canvas,gl);}catch{shared=null;}});
  try{shared=initialise(canvas,gl);}catch(error){console.warn('Mofumofu coat fallback:',error);shared=null;}
  return shared;
}

function drawGPU(g:GPU,size:number,pose:CoatPose,image?:HTMLImageElement){
  const {gl,uniforms:u}=g;
  if(g.canvas.width!==size||g.canvas.height!==size){g.canvas.width=size;g.canvas.height=size;}
  gl.viewport(0,0,size,size);gl.useProgram(g.program);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,g.texture);
  if(image&&g.textureSource!==image.src){gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,0);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);g.textureSource=image.src;}
  gl.uniform1i(u.uTexture,0);gl.uniform1f(u.uTextured,image?1:0);gl.uniformMatrix3fv(u.uRotation,false,pose.rotation);gl.uniform1f(u.uSupport,pose.support);gl.uniform1f(u.uOrigin,pose.origin);gl.uniform1f(u.uNight,pose.night?1:0);
  gl.clearColor(0,0,0,0);gl.depthMask(true);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
  const draw=(buffer:WebGLBuffer,count:number,fur:boolean)=>{gl.bindBuffer(gl.ARRAY_BUFFER,buffer);for(let i=0;i<g.attributes.length;i++){gl.enableVertexAttribArray(g.attributes[i]);gl.vertexAttribPointer(g.attributes[i],i<3?3:1,gl.FLOAT,false,STRIDE*4,(i<3?i*3:i+6)*4);}gl.uniform1f(u.uFur,fur?1:0);gl.depthMask(!fur);gl.drawArrays(gl.TRIANGLES,0,count);};
  draw(g.body,g.bodyCount,false);draw(g.fur,g.furCount,true);
}

/** A single textured silhouette is the low-cost fallback if WebGL is blocked or
 * lost. It never returns to hundreds of clipped image draws on each frame. */
function fallback(ctx:CanvasRenderingContext2D,pose:CoatPose,image?:HTMLImageElement){
  const m=pose.rotation;
  const rx=Math.hypot(m[0]*RADIUS[0],m[3]*RADIUS[1],m[6]*RADIUS[2]);
  ctx.save();ctx.translate(50,pose.origin);ctx.scale(.92,.92);
  if(image){
    // The bundled image already contains a dense, feathered alpha edge. Its
    // tight bounds map to the same crown and floor as the volume.
    ctx.drawImage(image,26,45,460,421,-rx-1,-pose.support-1,(rx+1)*2,pose.support*1.88+1);
    if(pose.night){ctx.globalCompositeOperation='source-atop';ctx.fillStyle='rgba(77,99,143,.11)';ctx.fillRect(-50,-50,100,100);}
    ctx.restore();return;
  }
  ctx.beginPath();
  for(let i=0;i<=256;i++){
    const a=i*Math.PI/128,fluff=1+random(i%256)*2,x=(rx+fluff)*Math.cos(a),rawY=(pose.support+fluff)*Math.sin(a),start=pose.support*.82,range=pose.support*.12,t=Math.min(1,Math.max(0,(rawY-start)/range));
    const y=rawY>start?start+range*(t-.5*t*t)-random(i%256)*.35:rawY;
    if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);
  }
  ctx.closePath();ctx.clip();ctx.fillStyle=pose.night?'#e4eaf3':'#f5f7f1';ctx.fill();
  ctx.restore();
}

export function createOdangoCoat(target:HTMLCanvasElement){
  const cached=typeof document==='undefined'?null:document.createElement('canvas');
  const cacheContext=cached?.getContext('2d',{alpha:true});
  let texture:HTMLImageElement|undefined,key='',disposed=false;
  return {
    setTexture(image:HTMLImageElement){texture=image;key='';},
    paint(ctx:CanvasRenderingContext2D,pose:CoatPose){
      if(disposed)return;
      const g=gpu(),size=target.width;
      const next=[...pose.rotation,pose.support,pose.origin,pose.night,size,g?.generation??0].join(',');
      ctx.save();ctx.setTransform(size/100,0,0,target.height/100,0,0);
      if(cached&&cacheContext){
        if(next!==key){
          if(cached.width!==size||cached.height!==size)cached.width=cached.height=size;
          cacheContext.setTransform(1,0,0,1,0,0);cacheContext.clearRect(0,0,size,size);
          if(g){drawGPU(g,size,pose,texture);cacheContext.drawImage(g.canvas,0,0);}
          else{cacheContext.setTransform(size/100,0,0,size/100,0,0);fallback(cacheContext,pose,texture);}
          key=next;
        }
        ctx.drawImage(cached,0,0,100,100);
      }else fallback(ctx,pose,texture);
      ctx.restore();target.dataset.coatBackend=g?'gpu-dense-fur':'cached-coat';
    },
    dispose(){disposed=true;texture=undefined;if(cached)cached.width=cached.height=0;},
  };
}
