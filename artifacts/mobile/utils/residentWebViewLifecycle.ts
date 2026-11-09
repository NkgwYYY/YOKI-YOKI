export type ResidentWebViewPhase='document'|'painting'|'ready'|'failed';
export type ResidentWebViewSnapshot={token:string;generation:number;phase:ResidentWebViewPhase;trace:string};

// A cold WKWebView process can start after the React component has mounted.
// Give document startup its own budget; the short paint watchdog begins only
// once the local document has loaded. Never accept events from a replaced view.
export const residentWebViewTimeout=(phase:ResidentWebViewPhase)=>phase==='document'?20000:phase==='painting'?5000:null;
export function createResidentWebViewLifecycle(initialStage:string,now:()=>number=Date.now){
 let stage=initialStage,generation=0,attempts=0,phase:ResidentWebViewPhase='document',started=now();
 let events:string[]=['0ms:mount'];
 const token=()=>`${stage}:${generation}`;
 const snapshot=():ResidentWebViewSnapshot=>({token:token(),generation,phase,trace:events.join(' | ')});
 const record=(event:string)=>{events=[...events.slice(-11),`${now()-started}ms:g${generation}:${event}`];return snapshot();};
 const current=(id:string)=>id===token();
 const recover=(id:string,reason:string):ResidentWebViewSnapshot|null=>{
  if(!current(id)||phase==='failed')return null;
  if(attempts>=1){phase='failed';return record('failed:'+reason);}
  attempts++;generation++;phase='document';return record('recover:'+reason);
 };
 return {
  snapshot,
  reset(nextStage:string){if(nextStage===stage)return null;stage=nextStage;generation++;attempts=0;phase='document';started=now();events=[];return record('stage');},
  note(id:string,event:string){return current(id)&&phase!=='failed'?record(event):null;},
  loaded(id:string){if(!current(id)||phase!=='document')return null;phase='painting';return record('loaded');},
  ready(id:string){if(!current(id)||phase==='failed')return null;phase='ready';attempts=0;return record('ready');},
  error:recover,
  timeout(id:string,expectedPhase:ResidentWebViewPhase){return current(id)&&phase===expectedPhase&&residentWebViewTimeout(phase)!==null?recover(id,'timeout-'+phase):null;},
  resume(){if(phase!=='failed')return null;attempts=0;phase='document';return recover(token(),'foreground');},
 };
}
