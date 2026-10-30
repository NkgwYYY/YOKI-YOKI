import {NATIVE_RESIDENT_SCRIPT,NATIVE_ODANGO_COAT} from './nativeResidentBundle.ts';
import type {EvolvedForm} from './evolved3d';
const json=(value:unknown)=>JSON.stringify(value).replace(/</g,'\\u003c');
/** Only local character art runs here. There are no network requests, accounts,
 * room state, timers while hidden, or React renders on animation frames. */
export function nativeResidentDocument(form:EvolvedForm){
 return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:"><style>html,body{margin:0;width:100%;height:100%;overflow:hidden;background:transparent}canvas{display:block;width:100%;height:100%}</style></head><body><canvas id="resident" width="384" height="384"></canvas><script>
 ${NATIVE_RESIDENT_SCRIPT}
 const notify=type=>window.ReactNativeWebView?.postMessage(JSON.stringify({type}));
 let renderer,frame=0,lastTime=0,previous='',active=true,detail='room';
 const canvas=document.getElementById('resident'),form=${json(form)};
 let target={rx:0,ry:0,rz:0,blink:0,happy:false,sleepy:false,night:false,mouthOpen:0,chew:0,smoking:false},shown={...target},texture;
 const stop=()=>{if(frame)cancelAnimationFrame(frame);frame=0;};
 const paint=now=>{
  frame=0;if(!active||document.hidden)return;
  const dt=Math.min(64,Math.max(1,now-lastTime||16));lastTime=now;
  let moving=false;const blend=1-Math.exp(-dt/24);
  for(const k of ['rx','ry','rz','mouthOpen','chew']){const d=target[k]-shown[k];shown[k]=Math.abs(d)<.001?target[k]:shown[k]+d*blend;if(Math.abs(target[k]-shown[k])>=.001)moving=true;}
  for(const k of ['blink','happy','sleepy','night','smoking'])shown[k]=target[k];
  const key=JSON.stringify(shown);
  if(key!==previous){try{renderer.render(shown);previous=key;}catch{stop();notify('failed');return;}}
  if(moving)frame=requestAnimationFrame(paint);
 };
 const resume=()=>{if(!frame&&active&&!document.hidden)frame=requestAnimationFrame(paint);};
 const receive=event=>{
  try{
   const data=JSON.parse(event.data);if(data.type!=='pose'||!data.pose)return;
   const p=data.pose;
   for(const k of ['rx','ry','rz','blink','mouthOpen','chew'])if(!Number.isFinite(p[k]))return;
   target={rx:p.rx,ry:p.ry,rz:p.rz,blink:p.blink,mouthOpen:p.mouthOpen,chew:p.chew,happy:!!p.happy,sleepy:!!p.sleepy,night:!!p.night,smoking:!!p.smoking};
   active=!!data.active;
   const resolution=Math.min(640,Math.max(192,Math.ceil((Number(data.size)||192)*2)));
   const nextDetail=data.size<200?'room':'portrait';
   if(detail!==nextDetail){renderer.dispose();detail=nextDetail;renderer=evolved.createEvolvedRenderer(canvas,form,detail);if(texture)renderer.setCoatTexture(texture);previous='';}
   if(canvas.width!==resolution){canvas.width=canvas.height=resolution;previous='';}
   if(data.reduceMotion)shown={...target};
   if(active)resume();else stop();
  }catch{}
 };
 try{
  renderer=evolved.createEvolvedRenderer(canvas,form,detail);
  renderer.render(shown);
  window.addEventListener('message',receive);document.addEventListener('message',receive);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();else resume();});
  if(form==='odango'){
   texture=new Image();texture.onload=()=>{renderer.setCoatTexture(texture);previous='';resume();notify('ready');};texture.onerror=()=>notify('failed');texture.src=${json(NATIVE_ODANGO_COAT)};
  }else notify('ready');
 }catch{notify('failed');}
 </script></body></html>`;
}
