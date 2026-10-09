import type {FeedState} from '../contexts/AppContext';
import type {StorageEntry} from './recoverableStorage';

export const BLOOD_TYPES=['A','B','O','AB','不明'] as const;
export const MBTI_TYPES=['ISTJ','ISFJ','INFJ','INTJ','ISTP','ISFP','INFP','INTP','ESTP','ESFP','ENFP','ENTP','ESTJ','ESFJ','ENFJ','ENTJ','未設定'] as const;
export type FortuneInput={bloodType?:string;mbti?:string};
export type FortuneReading={date:string;bloodType:string;mbti:string;title:string;message:string;advice:string;color:string;item:string;stars:number};
export type FortuneState={readings:Record<string,FortuneReading>};
export type FortuneResult={reading:FortuneReading;created:boolean};
export function normalizeFortuneInput(input:FortuneInput){
 const blood=input.bloodType?.toUpperCase().replace(/型/g,'').trim(),mbti=input.mbti?.toUpperCase().trim().replace(/-[AT]$/,'');
 return {bloodType:BLOOD_TYPES.find(t=>t===blood)??'不明',mbti:MBTI_TYPES.find(t=>t===mbti)??'未設定'};
}
const themes=[
 ['小さな一歩が光る日','先のことを全部決めなくても大丈夫。気になることをひとつ、試してごらん。'],
 ['ひと休みに宝物がある日','寄り道の先に、うれしい発見がありそう。今日は自分の歩幅を大切に。'],
 ['やさしさがめぐる日','小さな「ありがとう」が、今日をあたたかくしてくれる予感。'],
 ['ひらめきが芽を出す日','ふと思いついたことを、ひとことメモしてみて。あとで楽しみの種になるかも。'],
 ['いつもの景色が輝く日','慣れた場所にも、まだ見ていない色がある。少し顔を上げて歩いてみよう。'],
 ['好きなものが道しるべの日','今日は「好き」をひとつ選んでごらん。心の向く方へ、小さな一歩を。'],
 ['余白が味方になる日','予定をひとつ軽くして、のんびりする時間を。急がないことも素敵な選択。'],
 ['出会いにときめく日','いつもと違うお店や景色をのぞいてみて。ちいさな驚きが待っているかも。'],
] as const;
const bloodAdvice:Record<string,string[]>={
 A:['身の回りをひとつ整えると、気分もすっきりしそう。','お気に入りの場所で、一息ついてみよう。'],
 B:['気になる道に、ちょっと寄り道してみよう。','好きな色を見つけながら、おさんぽしてみよう。'],
 O:['会えた誰かに、ひとこと声をかけてみよう。','温かいごはんを、ゆっくり味わってみよう。'],
 AB:['見つけた景色を、ことばや絵で残してみよう。','いつもと違う組み合わせを楽しんでみよう。'],
 不明:['おいしいものや景色を、ゆっくり楽しんでみよう。','今の気分を、ひとこと記録してみよう。'],
};
function hash(text:string){let h=2166136261;for(const char of text){h=Math.imul(h^char.charCodeAt(0),16777619);}return h>>>0;}
/** Local, playful daily content; profile data never leaves the existing app storage. */
export function makeDailyFortune(date:string,input:FortuneInput):FortuneReading{
 const profile=normalizeFortuneInput(input),seed=hash(`${date}:${profile.bloodType}:${profile.mbti}:1`);
 const theme=themes[seed%themes.length];
 const social=profile.mbti.startsWith('I')?'自分だけの静かな時間も、忘れずににゃ。':profile.mbti.startsWith('E')?'うれしい気持ちを、誰かと分け合うのもいいにゃ。':'自分が心地よい過ごし方を選んでにゃ。';
 return {date,...profile,title:theme[0],message:`${theme[1]} ${social}`,advice:bloodAdvice[profile.bloodType][(seed>>>5)%2],
  color:['月あかりの金色','すみれ色','若葉の緑','空色','さくら色','ミルク色'][(seed>>>8)%6],
  item:['あたたかいお茶','小さなノート','お気に入りの花','やわらかなタオル','丸いおやつ','読みかけの本'][(seed>>>12)%6],stars:3+(seed>>>16)%3};
}
export function latestFortune(state:FortuneState|undefined,today:string):FortuneReading|undefined{
 return Object.entries(state?.readings??{}).filter(([date])=>date>=today).sort(([a],[b])=>b.localeCompare(a))[0]?.[1];
}
/** The daily limit and reading are committed together in the existing journal. */
export function prepareFortune(values:Record<string,string|null>,input:FortuneInput,today:string,defaultFeed:FeedState){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(today))throw Error('今日の日付を確認できません');
 const key='@mentore/feed_state_v1',feed:FeedState=values[key]?JSON.parse(values[key]!):defaultFeed;
 if(!feed||!Number.isFinite(feed.points)||feed.points<0)throw Error('データを確認できません');
 const readings=feed.fortune?.readings??{};
 if(typeof readings!=='object'||Array.isArray(readings)||Object.entries(readings).some(([date,r])=>!r||r.date!==date||!r.title||!r.message))throw Error('占いの記録を確認できません');
 const previous=latestFortune(feed.fortune,today);
 if(previous)return {entries:[] as StorageEntry[],result:{feed,reading:previous,created:false}};
 const reading=makeDailyFortune(today,input);
 const next={...feed,fortune:{readings:Object.fromEntries([...Object.entries(readings),[today,reading]].sort(([a],[b])=>String(a).localeCompare(String(b))).slice(-32))}};
 return {entries:[[key,JSON.stringify(next)]] as StorageEntry[],result:{feed:next,reading,created:true}};
}
