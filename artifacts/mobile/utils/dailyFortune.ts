import {MOON_PHASES,validDailySky,type DailySky} from './dailySky';
import type {FeedState} from '../contexts/AppContext';
import type {StorageEntry} from './recoverableStorage';

export const BLOOD_TYPES=['A','B','O','AB','不明'] as const;
export const MBTI_TYPES=['ISTJ','ISFJ','INFJ','INTJ','ISTP','ISFP','INFP','INTP','ESTP','ESFP','ENFP','ENTP','ESTJ','ESFJ','ENFJ','ENTJ','未設定'] as const;
export type FortuneInput={bloodType?:string;mbti?:string;sky?:DailySky};
export type FortuneReading={date:string;bloodType:string;mbti:string;title:string;message:string;advice:string;color:string;item:string;stars:number;sky?:DailySky};
export type FortuneState={readings:Record<string,FortuneReading>};
export type FortuneResult={reading:FortuneReading;created:boolean};
export function normalizeFortuneInput(input:FortuneInput){
 const blood=input.bloodType?.toUpperCase().replace(/型/g,'').trim(),mbti=input.mbti?.toUpperCase().trim().replace(/-[AT]$/,'');
 return {bloodType:BLOOD_TYPES.find(t=>t===blood)??'不明',mbti:MBTI_TYPES.find(t=>t===mbti)??'未設定'};
}
const legacyTitles=['小さな一歩が光る日','ひと休みに宝物がある日','やさしさがめぐる日','ひらめきが芽を出す日','いつもの景色が輝く日','好きなものが道しるべの日','余白が味方になる日','出会いにときめく日'];
const themes=[
 ['気になっていたことを試すなら今日','やってみたかったことを、一つだけ試してみよう。'],
 ['今日は休憩を多めに','予定の合間に、お茶を飲む時間を作ってみて。'],
 ['連絡を取ってみよう','最近話していない人に、短いメッセージを送ってみよう。'],
 ['思いついたことをメモしておこう','忘れないうちに、スマホに一行だけ残してみて。'],
 ['いつもと違う道を歩いてみよう','帰り道を少し変えると、気分転換になりそう。'],
 ['好きなことに時間を使おう','音楽でも、ごはんでも。今日は自分の好みを優先してみて。'],
 ['予定を詰めすぎないで','急ぎでない用事を一つ、明日に回してもよさそう。'],
 ['新しいお店をのぞいてみよう','気になっていたお店があれば、立ち寄ってみて。'],
] as const;
/** Refresh old copy for display without drawing again or rewriting saved results. */
export function presentFortune(reading:FortuneReading):FortuneReading{
 const index=legacyTitles.indexOf(reading.title);
 return {...reading,...(index>=0?{title:themes[index][0],message:themes[index][1]}:{}),color:reading.color.replace('月あかりの金色','ゴールド').replace('若葉の緑','グリーン').replace('ミルク色','クリーム')};
}
const interpretations:Record<DailySky['phase'],[string,string]>={
 'New Moon':['今週やりたいことを一つ決める','新月を始まりの節目と捉える占いです。大きな目標より、取りかかれる用事を一つ選んでみて。'],
 'Waxing Crescent':['気になっていたことを試す','満ちていく月を、試してみる時期と捉えています。まずは10分だけ、気になることに使ってみて。'],
 'First Quarter':['予定を一つ選び直す','上弦の月を、選択の節目と捉えています。今週の予定から、優先したいことを一つ選んでみて。'],
 'Waxing Gibbous':['途中のことを仕上げる','満月に近づく月を、仕上げの時期と捉えています。途中になっている小さな用事を一つ片づけてみて。'],
 'Full Moon':['できたことを振り返る','満月を、一区切りの節目と捉える占いです。最近できたことを一つ、日記に残してみて。'],
 'Waning Gibbous':['今週の予定を見直す','欠け始めた月を、振り返る時期と捉えています。予定を見直して、急がない用事は後に回してみて。'],
 'Last Quarter':['身の回りを一つ整理する','下弦の月を、整理の節目と捉えています。机の上など、狭い場所を一つだけ整えてみて。'],
 'Waning Crescent':['休む時間を確保する','新月へ向かう月を、休息の時期と捉えています。今日は予定の合間に、何もしない時間を取ってみて。'],
};
/** The astronomy is sourced; the interpretation is editorial divination, not a prediction. */
export function makeDailyFortune(date:string,input:FortuneInput):FortuneReading{
 if(!validDailySky(input.sky,date))throw Error('天体データを取得できません');
 const [title,advice]=interpretations[input.sky.phase];
 return {date,bloodType:'不明',mbti:'未設定',title,message:`今日の月は「${MOON_PHASES[input.sky.phase]}」。照らされている割合は${input.sky.illumination}%。`,advice,color:'',item:'',stars:0,sky:input.sky};
}
export function latestFortune(state:FortuneState|undefined,today:string):FortuneReading|undefined{
 return Object.entries(state?.readings??{}).filter(([date,r])=>date===today&&validDailySky(r.sky,date)).sort(([a],[b])=>b.localeCompare(a))[0]?.[1];
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
