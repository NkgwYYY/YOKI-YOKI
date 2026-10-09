export const SMOKE_STEP_MS=5000;
export const SMOKE_LIMIT_MS=60000;
export const SMOKER_THRESHOLD=3;
export const CRAVING_INTERVAL_MS=4*60*60*1000;
export const CRAVING_LOSS=3;
export const QUIT_DURATION_MS=5*24*60*60*1000;
export type SmokeReceipt={id:string;elapsedMs:number;gained:number;dirt:number;counted:boolean;gifted?:boolean};
export type SmokeSession=SmokeReceipt&{startedAt:number};
export type SmokingState={sessions:number;lastSmokedAt:number;withdrawalSteps:number;recoveredAt:number;active:SmokeSession|null;receipts:SmokeReceipt[];giftCigarettes:number;giftDays:string[]};
const finite=(n:unknown):n is number=>typeof n==='number'&&Number.isFinite(n)&&n>=0;
const validReceipt=(r:SmokeReceipt)=>r&&typeof r.id==='string'&&finite(r.elapsedMs)&&r.elapsedMs<=SMOKE_LIMIT_MS&&finite(r.gained)&&finite(r.dirt)&&typeof r.counted==='boolean';
export function readSmoking(raw:unknown):SmokingState{
 const s=raw as Partial<SmokingState>|undefined;
 return {sessions:finite(s?.sessions)?Math.floor(s.sessions):0,lastSmokedAt:finite(s?.lastSmokedAt)?s.lastSmokedAt:0,withdrawalSteps:finite(s?.withdrawalSteps)?Math.floor(s.withdrawalSteps):0,recoveredAt:finite(s?.recoveredAt)?s.recoveredAt:0,active:s?.active&&validReceipt(s.active)&&finite(s.active.startedAt)?s.active:null,receipts:Array.isArray(s?.receipts)?s.receipts.filter(validReceipt).slice(-40):[],giftCigarettes:finite(s?.giftCigarettes)?Math.min(99,Math.floor(s.giftCigarettes)):0,giftDays:Array.isArray(s?.giftDays)?[...new Set(s.giftDays.filter(d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)))].sort().slice(-32):[]};
}
export type TobaccoPatron = 'egg' | 'mofumofu';
/** Occasional date-stable offers; repeated conversations never reroll the gift. */
export function smokingGiftPatron(date:string):TobaccoPatron|null {
 let seed=0;for(const c of date)seed=(Math.imul(seed,31)+c.charCodeAt(0))>>>0;
 const choice=((seed^(seed>>>8))>>>0)%4;
 return choice===0?'egg':choice===1?'mofumofu':null;
}
export function canReceiveSmokingGift(raw:unknown,date:string,patron:TobaccoPatron) {
 const state=readSmoking(raw);
 return /^\d{4}-\d{2}-\d{2}$/.test(date)&&smokingGiftPatron(date)===patron&&!state.giftDays.some(day=>day>=date)&&state.giftCigarettes<99;
}
/** Pure elapsed-time settlement. Reading repeatedly never charges the same interval twice. */
export function settleSmoking(raw:unknown,now:number){
 const state=readSmoking(raw),age=state.lastSmokedAt?Math.max(0,now-state.lastSmokedAt):0;
 const dependent=state.sessions>=SMOKER_THRESHOLD;
 const steps=dependent?Math.floor(Math.min(age,QUIT_DURATION_MS-1)/CRAVING_INTERVAL_MS):0;
 const loss=Math.max(0,steps-state.withdrawalSteps)*CRAVING_LOSS;
 state.withdrawalSteps=Math.max(state.withdrawalSteps,steps);
 if(state.sessions>0&&age>=QUIT_DURATION_MS){state.sessions=0;state.withdrawalSteps=0;state.recoveredAt=state.lastSmokedAt+QUIT_DURATION_MS;}
 return {state,loss};
}
export function smokingStatus(raw:unknown,now:number){
 const {state}=settleSmoking(raw,now),dependent=state.sessions>=SMOKER_THRESHOLD;
 const elapsed=state.lastSmokedAt?Math.max(0,now-state.lastSmokedAt):0;
 return {state,dependent,craving:dependent&&elapsed>=CRAVING_INTERVAL_MS,quitDays:dependent?Math.min(5,Math.floor(elapsed/86400000)):0,remainingMs:dependent?Math.max(0,QUIT_DURATION_MS-elapsed):0,recovered:!!state.recoveredAt&&!state.sessions};
}
