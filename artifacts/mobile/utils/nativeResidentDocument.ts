import {NATIVE_RESIDENT_SCRIPT,NATIVE_ODANGO_COAT} from './nativeResidentBundle.ts';
import type {EvolvedForm,EvolvedPose} from './evolved3d';
export type ResidentInitialState={pose:EvolvedPose;active:boolean;reduceMotion:boolean;size:number};
const json=(value:unknown)=>JSON.stringify(value).replace(/</g,'\\u003c');
/** Only local character art runs here. Readiness means the original coat and
 * the current pose have both been painted, including inactive previews. The
 * initial pose is local so first paint does not wait for a native bridge round trip. */
export function nativeResidentDocument(form:EvolvedForm,initial?:ResidentInitialState){
 return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:"><style>html,body{margin:0;width:100%;height:100%;overflow:hidden;background:transparent}canvas{display:block;width:100%;height:100%}</style></head><body><canvas id="resident" width="384" height="384"></canvas><script>
 ${NATIVE_RESIDENT_SCRIPT}
 const notify=type=>window.ReactNativeWebView?.postMessage(JSON.stringify({type}));
 const canvas=document.getElementById('resident'),form=${json(form)};
 let renderer,frame=0,lastTime=0,lastPaint=0,previous='',active=true,detail='room',ready=false,failed=false,hasPose=false;
 let target={rx:0,ry:0,rz:0,blink:0,smile:0,happy:false,sleepy:false,night:false,mouthOpen:0,chew:0,smoking:false},shown={...target},texture;
 let materialReady=form!=='odango';
 const stop=()=>{if(frame)cancelAnimationFrame(frame);frame=0;};
 const fail=()=>{if(failed)return;failed=true;stop();notify('failed');};
 const draw=()=>{
  if(!renderer){renderer=evolved.createEvolvedRenderer(canvas,form,detail);if(texture)renderer.setCoatTexture(texture);}
  renderer.render(shown);previous=JSON.stringify(shown);
 };
 const firstFrame=()=>{
  if(ready||failed||!hasPose||!materialReady)return;
  try{shown={...target};draw();ready=true;notify('ready');}catch{fail();}
 };
 const paint=now=>{
  frame=0;if(!ready||failed||!active||document.hidden)return;
  // Limit expensive canvas work to 30 fps; native movement stays on the UI thread.
  if(now-lastPaint<1000/30){frame=requestAnimationFrame(paint);return;}
  lastPaint=now;
  const dt=Math.min(64,Math.max(1,now-lastTime||16));lastTime=now;
  let moving=false;const blend=1-Math.exp(-dt/24);
  for(const k of ['rx','ry','rz','mouthOpen','chew','smile']){const next=shown[k]+(target[k]-shown[k])*blend;shown[k]=Math.abs(target[k]-next)<.001?target[k]:next;if(shown[k]!==target[k])moving=true;}
  for(const k of ['blink','happy','sleepy','night','smoking','costume'])shown[k]=target[k];
  if(JSON.stringify(shown)!==previous){try{draw();}catch{fail();return;}}
  if(moving)frame=requestAnimationFrame(paint);
 };
 const resume=()=>{if(!frame&&ready&&!failed&&active&&!document.hidden)frame=requestAnimationFrame(paint);};
 const receive=event=>{
  let data;try{data=JSON.parse(event.data);}catch{return;}
  if(failed||data.type!=='pose'||!data.pose)return;
  const p=data.pose;
  for(const k of ['rx','ry','rz','blink','mouthOpen','chew'])if(!Number.isFinite(p[k]))return;
  try{
   target={costume:['dog','cat','rabbit','frog','panda'].includes(p.costume)?p.costume:null,rx:p.rx,ry:p.ry,rz:p.rz,blink:p.blink,smile:Number.isFinite(p.smile)?Math.max(0,Math.min(1,p.smile)):Number(!!p.happy),mouthOpen:p.mouthOpen,chew:p.chew,happy:!!p.happy,sleepy:!!p.sleepy,night:!!p.night,smoking:!!p.smoking};
   hasPose=true;active=!!data.active;
   const resolution=Math.min(640,Math.max(192,Math.ceil((Number(data.size)||192)*2)));
   const nextDetail=data.size<200?'room':'portrait';
   if(detail!==nextDetail){renderer?.dispose();renderer=undefined;detail=nextDetail;previous='';}
   if(canvas.width!==resolution){canvas.width=canvas.height=resolution;previous='';}
   if(!ready){firstFrame();return;}
   if(data.reduceMotion||!active){shown={...target};draw();stop();}
   else resume();
   // onLoadEnd can recover a readiness event lost during WebView startup.
   if(data.confirmReady)notify('ready');
  }catch{fail();}
 };
 window.addEventListener('message',receive);document.addEventListener('message',receive);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();else resume();});
 try{
  if(form==='odango'){
   texture=new Image();texture.onload=()=>{materialReady=true;firstFrame();};texture.onerror=fail;texture.src=${json(NATIVE_ODANGO_COAT)};
  }
  // Native can send a fresher pose while texture decoding is in progress.
  notify('loaded');
  const initial=${json(initial??null)};
  if(initial)receive({data:JSON.stringify({type:'pose',...initial})});
 }catch{fail();}
 </script></body></html>`;
}
