import type {FeedState} from '../contexts/AppContext';
import type {StorageEntry} from './recoverableStorage';

export const PLAZA_KINDS = ['balloon', 'scammer', 'lost', 'traveler'] as const;
export type PlazaKind = typeof PLAZA_KINDS[number];
export type PlazaOutcome = {choice:'accept'|'decline';points:number;at:number};
export type PlazaEncounter = {id:string;kind:PlazaKind;outcome?:PlazaOutcome};
export type PlazaState = {day:string;seen:PlazaKind[];serial:number;nextAt:number;current?:PlazaEncounter;lastEncounter?:{date:string;encounter:PlazaEncounter}};
export type PlazaOperation = {kind:'visit'} | {kind:'resolve';id:string;choice:'accept'|'decline'} | {kind:'leave';id:string};
export type PlazaResult = {state:PlazaState;changed:boolean};
export const PLAZA_STORIES = {
 balloon:{name:'風船を見上げる子',title:'木の上の赤い風船',intro:'「あの風船、大切なの……」\n木の枝に、赤い風船のひもが絡まっている。',accept:'風船を取ってあげる',action:'枝に絡まったひもを、そっとほどいた。',result:'「ありがとう！」子どもが風船を抱きしめた。駆け寄ってきた親は、お屋敷に住む資産家だった。\n「娘を助けてくれたお礼です」',decline:'「うん……また来てね」子どもは木を見上げた。',points:60},
 scammer:{name:'気前のよさそうなおじさん',title:'おいしい儲け話',intro:'「30pt預けてくれたら、倍の60ptにして返してあげるよ。すぐ戻るからさ」\nおじさんは、やけに気前よく笑っている。',accept:'30ptを預ける',action:'おじさんは封筒を受け取ると、路地へ走っていった。',result:'待っても、おじさんは戻ってこない。\n……あの人は詐欺師だった！ 預けた30ptは、全部持ち逃げされてしまった。',decline:'「そうかい、残念だねえ」おじさんは人混みに消えた。ポイントは渡さずに済んだ。',points:-30},
 lost:{name:'探しもの中のおばあさん',title:'思い出のブローチ',intro:'「このあたりで、花のブローチを見なかったかい？」\nベンチの下に、きらりと光るものが見える。',accept:'ベンチの下を探す',action:'落ち葉の間から、小さな花のブローチを見つけた。',result:'「亡くなった夫がくれた、大切なものなの」\nおばあさんはほっと笑い、お礼のお小遣いをそっと手渡してくれた。',decline:'「ありがとう、自分でもう少し探してみるね」',points:25},
 traveler:{name:'地図を広げる旅人',title:'はじめての町歩き',intro:'「赤い提灯のラーメン屋さんへ行きたいんだけど、道に迷ってしまって……」\n旅人は地図を逆さまに持っている。',accept:'ラーメン屋への道を教える',action:'地図の向きを直して、お店までの道を一緒にたどった。',result:'「これなら行けそう！ 助かったよ」\n旅人はにっこり。お礼に、旅のお小遣いを少し分けてくれた。',decline:'「そっか。また誰かに聞いてみるよ」',points:20},
} as const;

/** Encounter identity, wallet delta and outcome share the recoverable balance journal. */
export function preparePlazaEvent(values:Record<string,string|null>,op:PlazaOperation,today:string,now:number,defaultFeed:FeedState,random=Math.random()) {
 const key='@mentore/feed_state_v1';
 const feed:FeedState=values[key]?JSON.parse(values[key]!):defaultFeed;
 if(!feed||!Number.isFinite(feed.points)||feed.points<0||!Number.isFinite(now)||!/^\d{4}-\d{2}-\d{2}$/.test(today))throw Error('広場の記録を確認できません');
 const old=feed.plazaEvents;
 if(old&&(!Array.isArray(old.seen)||old.seen.some(k=>!PLAZA_KINDS.includes(k))||!Number.isSafeInteger(old.serial)||old.serial<0||!Number.isFinite(old.nextAt)||typeof old.day!=='string'||(old.current&&(!old.current.id||!PLAZA_KINDS.includes(old.current.kind)))))throw Error('広場の記録を確認できません');
 let state:PlazaState=old??{day:today,seen:[],serial:0,nextAt:now+6500};
 let points=feed.points;
 const roll=Math.max(0,Math.min(.999999,Number.isFinite(random)?random:0));
 if(op.kind==='visit') {
  // Keep an unfinished encounter across midnight; never reroll on re-entry.
  if(!state.current&&today>state.day)state={...state,day:today,seen:[]};
  if(!state.current&&now>=state.nextAt&&state.seen.length<4){
   const available=PLAZA_KINDS.filter(k=>!state.seen.includes(k));
   const kind=state.serial===0?'balloon':available[Math.floor(roll*available.length)];
   state={...state,serial:state.serial+1,seen:[...state.seen,kind],current:{id:`plaza-${state.day}-${state.serial+1}`,kind}};
  }
 } else if(op.kind==='resolve') {
  if(!state.current||state.current.id!==op.id)throw Error('この出会いは、もう終わっています');
  if(!state.current.outcome){
   if(op.choice!=='accept'&&op.choice!=='decline')throw Error('選択を確認できません');
   const delta=op.choice==='accept'?PLAZA_STORIES[state.current.kind].points:0;
   if(points+delta<0)throw Error('預けるには30pt必要です');
   points+=delta;
   const encounter={...state.current,outcome:{choice:op.choice,points:delta,at:now}};
   state={...state,current:encounter,lastEncounter:{date:today,encounter},nextAt:now+300000+Math.floor(roll*240000)};
  }
 } else if(state.current?.id===op.id){
  if(!state.current.outcome)throw Error('まだお話が終わっていません');
  state={...state,current:undefined};
 }
 const changed=state!==old;
 const next=changed?{...feed,points,plazaEvents:state}:feed;
 return {entries:changed?[[key,JSON.stringify(next)]] as StorageEntry[]:[],result:{feed:next,state,changed}};
}

export const PLAZA_HINTS:Record<PlazaKind,string>={balloon:'風船が…',scammer:'いい話があるよ',lost:'どこかしら…',traveler:'ここはどこ？'};
