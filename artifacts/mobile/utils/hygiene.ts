export type HygieneState={lastBathAt:number;protectedUntil:number;smokeDirt?:number;smokeReceipts?:string[];washReceipts?:string[]};
export const BATH_SKIP={name:'風呂キャン',cost:60,days:7} as const;
export const DAY_MS=86400000;
export function readHygiene(raw:unknown,now:number):HygieneState {
  const input=raw as Partial<HygieneState>|undefined;
  const valid=(x:unknown):x is number=>typeof x==='number'&&Number.isFinite(x)&&x>=0;
  return {lastBathAt:valid(input?.lastBathAt)?input.lastBathAt:now,protectedUntil:valid(input?.protectedUntil)?input.protectedUntil:0,smokeDirt:valid(input?.smokeDirt)?Math.min(30,input.smokeDirt):0,washReceipts:Array.isArray(input?.washReceipts)?input.washReceipts.filter(x=>typeof x==='string').slice(-32):[],smokeReceipts:Array.isArray(input?.smokeReceipts)?input.smokeReceipts.filter(x=>typeof x==='string').slice(-40):[]};
}
export function hygieneValue(raw:unknown,roomDirty:number,now:number){
  const state=readHygiene(raw,now);
  const age=Math.max(0,now-Math.max(state.lastBathAt,state.protectedUntil))/DAY_MS;
  // First three days stay fresh; later the shell gradually acquires a light patina.
  const bathDirt=Math.max(0,Math.min(65,(age-3)*13));
  // Freshly washed bodies acquire room dust gradually over the next day.
  const dust=Math.max(0,Math.min(100,roomDirty))*.2*Math.min(1,Math.max(0,now-state.lastBathAt)/DAY_MS);
  return Math.max(15,Math.round(100-bathDirt-dust-(state.smokeDirt??0)));
}
