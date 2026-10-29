import type {DailyRecord, FeedState} from '../contexts/AppContext';
import type {MascotStage} from './mascotUtils';
import type {StorageEntry} from './recoverableStorage';

export type GiftReason = 'comfort' | 'rest' | 'effort';
export type GiftKind = 'flowers' | 'cake' | 'stone';
export type CharacterGift = {
  id: string; sourceDate: string; dueDate: string; kind: GiftKind; reason: GiftReason;
  from: string; stage: MascotStage; message: string; receivedDate?: string; receivedAt?: number;
};
export type CharacterGiftState = {since: string; lastDate: string; gifts: Record<string, CharacterGift>};
export type CharacterGiftOperation = {kind: 'sync'} | {kind: 'receive'; id: string};
export const GIFT_FEED_KEY = '@mentore/feed_state_v1';
const RECORD_KEY = '@mentore/records_v2';
export const GIFT_TITLES: Record<GiftKind, string> = {flowers:'野の花の小さな花束', cake:'いちごのごほうびケーキ', stone:'川で見つけた、光る小石'};
const reasons = ['comfort','rest','effort'] as const;
function validDate(date: unknown): date is string {
  if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date))return false;
  const d=new Date(`${date}T12:00:00Z`);return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===date;
}
export function giftDateOffset(date: string, days: number) {
  if(!validDate(date))throw Error('贈りものの日付を確認できません');
  const d=new Date(`${date}T12:00:00Z`);d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);
}
/** Explicit mood first; modest, local text cues, never a diagnosis or a points reward. */
export function giftReason(mood?: number, text = '', win = ''): GiftReason | null {
  if(mood===1||mood===2)return 'comfort';
  const clauses=text.normalize('NFKC').replace(/[「『][^」』]*[」』]/g,'').split(/[。！？!?\n]/).filter(c=>!/(?:友達|友人|同僚|上司|彼|彼女|母|父|子供|子ども|家族)(?:が|は)/.test(c));
  for(const c of clauses){
    if(/(?:落ち込ん|落ちこん|つら|辛|しんど|悲し|寂し|さみし|不安)/.test(c)&&!/(?:つらく|辛く|しんどく|悲しく|寂しく|さみしく|不安(?:で)?|落ち込んで|落ちこんで)(?:は)?(?:い?ない|い?なくな|い?なかった)/.test(c))return 'comfort';
  }
  for(const c of clauses){
    if(/(?:元気が?(?:出ない|でない|ない)|疲れた|疲れて|へとへと|ヘトヘト|くたくた|クタクタ|頑張れない|がんばれない|やる気が?(?:出ない|でない|ない)|何もしたくない)/.test(c)&&!/(?:疲れて(?:は)?いない|元気がないわけじゃない)/.test(c))return 'rest';
  }
  if(win.trim()&&!/^(?:特になし|特にない|なし|ない|何も(?:ない|できなかった))$/.test(win.trim())&&!/(?:できなかった|失敗しただけ)/.test(win))return 'effort';
  if(clauses.some(c=>/(?:頑張った|がんばった|頑張りました|がんばりました|頑張れた|がんばれた|やりきった|やり切った|やり遂げた|乗り切った|やっと.{0,20}(?:できた|終わった|終えた)|無事.{0,15}(?:終えた|終わった|合格)|合格した|達成した)/.test(c)&&!/(?:頑張った|がんばった)(?:わけではない|わけじゃない)|(?:頑張れ|がんばれ|やりきれ|やり切れ|達成でき)なかった/.test(c)))return 'effort';
  return null;
}
export function readCharacterGifts(raw: unknown): CharacterGiftState | null {
  if(raw==null)return null;
  const s=raw as CharacterGiftState;
  if(!validDate(s.since)||!validDate(s.lastDate)||s.lastDate<s.since||!s.gifts||typeof s.gifts!=='object'||Array.isArray(s.gifts))throw Error('贈りものの記録を確認できません');
  for(const [id,g] of Object.entries(s.gifts)){
    if(!g||g.id!==id||!validDate(g.sourceDate)||g.sourceDate<s.since||g.sourceDate>s.lastDate||id!==`gift-${g.sourceDate}`||g.dueDate!==giftDateOffset(g.sourceDate,1)||!Object.hasOwn(GIFT_TITLES,g.kind)||!reasons.includes(g.reason)||typeof g.from!=='string'||typeof g.message!=='string'||!g.message||!['egg','odango','stage3','stage4'].includes(g.stage)||
      (g.receivedDate!==undefined&&(!validDate(g.receivedDate)||g.receivedDate<g.dueDate||g.receivedDate>s.lastDate||!Number.isFinite(g.receivedAt))))throw Error('贈りものの記録を確認できません');
  }
  return s;
}
export function waitingCharacterGift(state: CharacterGiftState | null | undefined, today: string) {
  if(!state||today<state.lastDate)return undefined;
  return Object.values(state.gifts).filter(g=>!g.receivedDate&&g.dueDate<=today).sort((a,b)=>a.sourceDate.localeCompare(b.sourceDate))[0];
}
function makeGift(date: string, reason: GiftReason, character: {name:string;stage:MascotStage}): CharacterGift {
  const seed=Number(date.replaceAll('-',''));
  const kind:GiftKind=reason==='effort'?'cake':reason==='rest'?'stone':seed%2?'flowers':'stone';
  const message=kind==='cake'?'がんばったこと、聞かせてくれてうれしかったよ。お祝いしたくて、ケーキを用意したんだ。今日は、ゆっくり味わおう。':kind==='flowers'?'話してくれたこと、覚えているよ。散歩の途中でこの花を見つけて、あなたに渡したくなったんだ。元気になろうとしなくても、そばに置いてね。':reason==='rest'?'おつかれさま。川のそばで、きれいな石を見つけたよ。すべすべして、光にかざすと少しきらきらするんだ。ひと休みのおともに、どうぞ。':'話してくれたことを思い出しながら、川辺を歩いていたんだ。この石、光が当たるときれいでね。あなたにも見せたくて、持って帰ってきたよ。';
  return {id:`gift-${date}`,sourceDate:date,dueDate:giftDateOffset(date,1),kind,reason,from:character.name.trim()||'よっきー',stage:character.stage,message};
}
/** Scans only saved user reports. The gift ledger travels with the existing feed backup. */
export function prepareCharacterGifts(values:Record<string,string|null>, operation:CharacterGiftOperation, today:string, now:number, fallback:FeedState, character:{name:string;stage:MascotStage}, chat:unknown=[]){
  if(!validDate(today)||!Number.isFinite(now))throw Error('贈りものの日付を確認できません');
  const feed:FeedState=values[GIFT_FEED_KEY]?JSON.parse(values[GIFT_FEED_KEY]!):fallback;
  if(!feed||!Number.isFinite(feed.points))throw Error('保存した記録を確認できません');
  const saved=readCharacterGifts(feed.characterGifts);
  const state:CharacterGiftState=saved?{...saved,gifts:{...saved.gifts}}:{since:giftDateOffset(today,-1),lastDate:today,gifts:{}};
  if(today<state.lastDate)throw Error('端末の日付を確認して、もう一度試してね。');
  state.lastDate=today;
  let received:CharacterGift|undefined;
  if(operation.kind==='sync'){
    const signals=new Map<string,GiftReason>();
    const add=(date:string,mood?:number,text='',win='')=>{
      if(!validDate(date)||date<state.since||date>today)return;
      const reason=giftReason(mood,text,win),previous=signals.get(date);
      if(reason&&(!previous||reasons.indexOf(reason)<reasons.indexOf(previous)))signals.set(date,reason);
    };
    const records:DailyRecord[]=values[RECORD_KEY]?JSON.parse(values[RECORD_KEY]!):[];
    if(!Array.isArray(records))throw Error('今日の記録を確認できません');
    for(const r of records)if(r)add(r.date,r.mood,r.notes,r.win);
    for(const p of Object.values(feed.exchangeDiary?.pages??{}))if(p?.user)add(p.date,p.user.mood,p.user.text);
    if(Array.isArray(chat))for(const m of chat)if(m?.role==='user'&&typeof m.content==='string')add(m.dateKey,undefined,m.content);
    for(const [date,reason] of signals){
      const id=`gift-${date}`,previous=state.gifts[id];
      // Once the day has ended, keep the letter and chosen item as a memory.
      if(!previous||(date===today&&!previous.receivedDate&&reasons.indexOf(reason)<reasons.indexOf(previous.reason)))state.gifts[id]=makeGift(date,reason,character);
    }
  }else{
    const gift=state.gifts[operation.id];
    if(!gift||gift.dueDate>today)throw Error('この贈りものは、まだ準備中です。');
    received=gift.receivedDate?gift:{...gift,receivedDate:today,receivedAt:now};
    state.gifts[gift.id]=received;
  }
  const changed=JSON.stringify(saved)!==JSON.stringify(state);
  const next=changed?{...feed,characterGifts:state}:feed;
  return {entries:changed?[[GIFT_FEED_KEY,JSON.stringify(next)]] as StorageEntry[]:[],result:{feed:next,state,received,changed}};
}
