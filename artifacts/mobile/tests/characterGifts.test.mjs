import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareCharacterGifts, giftReason, giftDateOffset, readCharacterGifts, waitingCharacterGift,GIFT_FEED_KEY} from '../utils/characterGifts.ts';
import {createRecoverableStorage} from '../utils/recoverableStorage.ts';

const RK='@mentore/records_v2',day='2026-10-10',tomorrow='2026-10-11',now=Date.parse('2026-10-10T11:00:00Z');
const who={name:'うちの子',stage:'odango'},feed={points:123,lastFeedTime:'',satietyAtFeed:65,hygiene:{smokeDirt:7},exchangeDiary:{pages:{}}};
const record=(date=day,mood=2,notes='')=>({id:date,date,mood,notes,sleep:7,behaviors:[]});
function fixture(records=[],chat=[],failAt=Infinity){
  const data=new Map([[GIFT_FEED_KEY,JSON.stringify(feed)],[RK,JSON.stringify(records)]]);let writes=0;
  const storage={getItem:async k=>data.get(k)??null,setItem:async(k,v)=>{if(++writes===failAt)throw Error('disk');data.set(k,v);},removeItem:async k=>{if(++writes===failAt)throw Error('disk');data.delete(k);}};
  const open=()=>createRecoverableStorage(storage,'gifts-journal',[GIFT_FEED_KEY,RK]);let store=open();
  return {data,reopen:()=>{store=open();},run:(op={kind:'sync'},date=day,person=who)=>store.transaction(values=>prepareCharacterGifts(values,op,date,now,feed,person,chat))};
}
test('low mood, low energy and effort map to thoughtful gifts, without diagnosing ordinary text',()=>{
  for(const mood of [1,2])assert.equal(giftReason(mood),'comfort');
  for(const text of ['今日は落ち込んでいる','仕事がしんどかった','寂しい気持ち'])assert.equal(giftReason(3,text),'comfort');
  for(const text of ['今日は元気がない','疲れたので休みたい','頑張れない'])assert.equal(giftReason(3,text),'rest');
  for(const text of ['今日はすごく頑張った！','やっと面接を終えた','やりきった','試験に合格した'])assert.equal(giftReason(3,text),'effort');
  for(const text of ['今日はふつう','頑張りたい','頑張れなかった','友達が頑張った','「元気がない」と言っていた','もうつらくない','落ち込んでいない'])assert.equal(giftReason(3,text),null,text);
  assert.equal(giftReason(3,'','朝、起きられた'),'effort');
});
test('today’s report prepares one gift, becomes available tomorrow and has no points or care-stat reward',async()=>{
  const f=fixture([record()]),a=await f.run();
  assert.equal(Object.keys(a.state.gifts).length,1);assert.equal(waitingCharacterGift(a.state,day),undefined);
  const b=await f.run({kind:'sync'},tomorrow),g=waitingCharacterGift(b.state,tomorrow);
  assert.equal(g.from,who.name);assert.equal(g.stage,who.stage);assert.equal(g.dueDate,tomorrow);
  assert.equal(b.feed.points,123);assert.deepEqual(b.feed.hygiene,feed.hygiene);assert.equal(f.data.get(RK),JSON.stringify([record()]));
});
test('diary text, mood-only records, success notes and saved user chat all qualify; assistant text does not',async()=>{
  const a=fixture();const page={date:day,user:{text:'本当にがんばった',mood:3}};
  a.data.set(GIFT_FEED_KEY,JSON.stringify({...feed,exchangeDiary:{pages:{[day]:page}}}));
  assert.equal((await a.run()).state.gifts[`gift-${day}`].kind,'cake');
  const b=fixture([],[{role:'assistant',dateKey:day,content:'今日も頑張ったね'}]);assert.equal(Object.keys((await b.run()).state.gifts).length,0);
  const c=fixture([],[{role:'user',dateKey:day,content:'なんだか元気が出ない'}]);assert.equal((await c.run()).state.gifts[`gift-${day}`].kind,'stone');
  const d=fixture([{...record(day,3),win:'気になっていた手続きを済ませた'}]);assert.equal((await d.run()).state.gifts[`gift-${day}`].kind,'cake');
});
test('one report day creates one item across all sources and repeated home visits',async()=>{
  const f=fixture([record()], [{role:'user',dateKey:day,content:'すごく頑張った'}]);
  const a=await f.run(),b=await f.run();assert.equal(Object.keys(b.state.gifts).length,1);assert.equal(b.changed,false);assert.deepEqual(a.state,b.state);
});
test('same-day sad report takes priority over celebration; next-day letter and giver are frozen',async()=>{
  const f=fixture([record(day,3,'がんばった')]);let a=await f.run();assert.equal(a.state.gifts[`gift-${day}`].kind,'cake');
  f.data.set(RK,JSON.stringify([record()]));a=await f.run();assert.equal(a.state.gifts[`gift-${day}`].reason,'comfort');
  const frozen=a.state.gifts[`gift-${day}`];f.data.set(RK,JSON.stringify([record(day,3,'がんばった')]));
  const b=await f.run({kind:'sync'},tomorrow,{name:'改名した子',stage:'stage4'});assert.deepEqual(b.state.gifts[frozen.id],frozen);
});
test('first upgrade scans yesterday and today, not years of past distress; future reports are ignored',async()=>{
  const f=fixture([record('2020-01-01'),record('2026-10-09'),record('2026-10-12')]);const a=await f.run();
  assert.deepEqual(Object.keys(a.state.gifts),['gift-2026-10-09']);assert.equal(waitingCharacterGift(a.state,day).sourceDate,'2026-10-09');
});
test('missed days never expire a gift; receiving saves its date, letter and item once after reload',async()=>{
  const f=fixture([record()]);const a=await f.run(),id=Object.keys(a.state.gifts)[0];f.reopen();
  const b=await f.run({kind:'sync'},'2026-11-10');assert.equal(waitingCharacterGift(b.state,'2026-11-10').id,id);
  const c=await f.run({kind:'receive',id},'2026-11-10');f.reopen();const d=await f.run({kind:'receive',id},'2026-11-11');
  assert.equal(d.received.receivedDate,'2026-11-10');assert.equal(d.received.receivedAt,c.received.receivedAt);assert.equal(waitingCharacterGift(d.state,'2026-11-11'),undefined);
});
test('receiving early, unknown IDs and clock rollback do not change the saved ledger',async()=>{
  const f=fixture([record()]);await f.run();const before=new Map(f.data);
  await assert.rejects(f.run({kind:'receive',id:`gift-${day}`}));await assert.rejects(f.run({kind:'receive',id:'missing'}));await assert.rejects(f.run({kind:'sync'},'2026-10-09'));assert.deepEqual(f.data,before);
  assert.throws(()=>readCharacterGifts({since:day,lastDate:day,gifts:{bad:{}}}));assert.throws(()=>giftDateOffset('2026-02-30',1));
});
for(const failAt of [1,2,3])test(`interrupted gift preparation ${failAt} recovers one unchanged letter`,async()=>{
  const f=fixture([record()],[],failAt);await assert.rejects(f.run(),/disk/);f.reopen();const a=await f.run();assert.equal(Object.keys(a.state.gifts).length,1);assert.equal(a.feed.points,123);assert.equal(f.data.has('gifts-journal'),false);
});
test('concurrent receives grant no duplicate and keep the original receipt after reloading',async()=>{
  const f=fixture([record()]);await f.run();const id=`gift-${day}`;const [a,b]=await Promise.all([f.run({kind:'receive',id},tomorrow),f.run({kind:'receive',id},tomorrow)]);
  assert.equal(a.changed,true);assert.equal(b.changed,false);assert.deepEqual(a.received,b.received);f.reopen();assert.equal((await f.run({kind:'receive',id},tomorrow)).changed,false);
});
test('calendar dates follow next local day over month, year and leap-day boundaries',()=>{
  assert.equal(giftDateOffset('2026-12-31',1),'2027-01-01');assert.equal(giftDateOffset('2028-02-28',1),'2028-02-29');assert.equal(giftDateOffset('2028-02-29',1),'2028-03-01');
});
