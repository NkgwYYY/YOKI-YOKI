/** A one-use, preloaded transition ad. It never knows about points or battle mutations. */
export type TransitionAd = {
  on(event: 'loaded'|'closed'|'error', listener: () => void): () => void;
  load(): void;
  show(): Promise<void>;
};
export type AdPause = {ready: Promise<void>; release(): void};
export type TransitionDeps = {
  prepare(): Promise<TransitionAd>;
  current(): boolean;
  acquire(): (() => void) | null;
  reserve(): Promise<boolean>;
  pause(): AdPause;
  timeoutMs?: number;
};
export function createInterstitialSession(deps: TransitionDeps) {
  let dead=false, used=false, loaded=false, started=false, ad:TransitionAd|undefined;
  let loadedAt=0, release:(()=>void)|undefined, pause:AdPause|undefined;
  let resolveShow:(()=>void)|undefined;
  let timer:ReturnType<typeof setTimeout>|undefined;
  const off:(()=>void)[]=[];
  const dispose=()=>{
    if(dead)return;dead=true;loaded=false;
    if(timer)clearTimeout(timer);
    off.splice(0).forEach(fn=>{try{fn();}catch{}});
    try{pause?.release();}catch{};release?.();release=undefined;
    resolveShow?.();resolveShow=undefined;
  };
  const current=()=>!dead&&deps.current();
  const preload=async()=>{
    if(started||!current())return;started=true;
    try{
      const prepared=await deps.prepare();
      if(!current())return;
      ad=prepared;
      off.push(ad.on('loaded',()=>{if(!dead&&!used){loaded=true;loadedAt=Date.now();if(timer)clearTimeout(timer);}}));
      off.push(ad.on('closed',dispose),ad.on('error',dispose));
      timer=setTimeout(dispose,20_000);
      ad.load();
    }catch{dispose();}
  };
  const showIfReady=async()=>{
    // Consume before any await: double taps, slow loading and re-entry cannot show later.
    if(used)return;used=true;
    if(!current()||!loaded||Date.now()-loadedAt>55*60_000){dispose();return;}
    release=deps.acquire()??undefined;
    if(!release){dispose();return;}
    await new Promise<void>(resolve=>{
      resolveShow=resolve;
      // Storage or audio failures must not strand the exit button.
      timer=setTimeout(dispose,deps.timeoutMs??2000);
      void(async()=>{
        try{
          if(!await deps.reserve()||!current()){dispose();return;}
          pause=deps.pause();await pause.ready;
          if(!current()){dispose();return;}
          if(timer)clearTimeout(timer);
          timer=setTimeout(dispose,180_000);
          await ad!.show();
        }catch{dispose();}
      })();
    });
  };
  return {preload,showIfReady,dispose};
}

export type AdHistory={id:string;at:number}[];
/** Rolling 24-hour cap, 3-minute spacing, and once per saved encounter. */
export function reserveBattleAd(history:AdHistory,id:string,now:number):AdHistory|null {
  if(!id||!Array.isArray(history))return null;
  const recent=history.filter(x=>x&&typeof x.id==='string'&&Number.isFinite(x.at)&&x.at>now-86_400_000);
  if(recent.some(x=>x.id===id)||recent.length>=3||recent.some(x=>now-x.at<180_000))return null;
  return [...recent,{id,at:now}];
}
