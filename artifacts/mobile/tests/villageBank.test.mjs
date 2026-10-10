import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareBank,bankDayEvent,BANK_CAPACITY} from '../utils/villageBank.ts';
import {createRecoverableStorage} from '../utils/recoverableStorage.ts';
const key='@mentore/feed_state_v1',today='2026-10-10';
const feed={points:1000,lastFeedTime:'today',satietyAtFeed:70,happiness:{value:80},exchangeDiary:{marker:'keep'}};
const nextDay=(date,n=1)=>new Date(Date.parse(date+'T00:00:00Z')+n*86400000).toISOString().slice(0,10);
const seedFor=(kind,date=nextDay(today))=>{for(let seed=0;seed<100000;seed++)if(bankDayEvent(seed,date)===kind)return seed;throw Error('fixture');};
function setup(initial=feed,seed=0){
 const data=new Map([[key,JSON.stringify(initial)]]);let fail=false;
 const store=createRecoverableStorage({getItem:async k=>data.get(k)??null,setItem:async(k,v)=>{if(k===key&&fail){fail=false;throw Error('disk');}data.set(k,v);},removeItem:async k=>data.delete(k)},'journal',[key]);
 return {data,fail:()=>fail=true,run:(op={kind:'sync'},date=today)=>store.transaction(values=>prepareBank(values,op,date,feed,seed))};
}
const transfer=(kind,amount,state,id='one')=>({kind,amount,id,revision:state.revision});
async function funded(seed=0,amount=100,initial=feed){const s=setup(initial,seed),a=await s.run();return {s,r:await s.run(transfer('deposit',amount,a.state))};}
test('deposit and withdrawal conserve wallet+principal and preserve existing care/diary data',async()=>{
 const {s,r}=await funded();assert.equal(r.feed.points,900);assert.equal(r.state.balance,100);
 const result=await s.run(transfer('withdraw',100,r.state,'two'));assert.equal(result.feed.points,1000);assert.equal(result.state.balance,0);
 assert.deepEqual(result.feed.happiness,feed.happiness);assert.deepEqual(result.feed.exchangeDiary,feed.exchangeDiary);
 assert.equal((await s.run()).changed,false);
});
test('daily interest, bonus, robbery and bankruptcy use persisted outcomes and never touch wallet savings',async()=>{
 for(const [kind,balance,points] of [['interest',101,900],['bonus',102,900],['robbery',90,900],['failure',0,975]]){
  const {s}=await funded(seedFor(kind));const r=await s.run({kind:'sync'},nextDay(today));
  assert.equal(r.state.balance,balance);assert.equal(r.feed.points,points);assert.equal(r.state.history.at(-1).kind,kind);
  const again=await s.run({kind:'sync'},nextDay(today));assert.equal(again.changed,false);assert.deepEqual(again.state,r.state);
 }
});
test('small deposits retain fractional interest instead of rounding it away every day',async()=>{
 let seed=0;while(!Array.from({length:10},(_,i)=>bankDayEvent(seed,nextDay(today,i+1))).every(x=>x==='interest'))seed++;
 const {s}=await funded(seed,10),r=await s.run({kind:'sync'},nextDay(today,10));
 assert.equal(r.state.balance,11);assert.equal(r.state.carry,0);assert.equal(r.state.interestEarned,1);
});
test('offline catch-up matches daily visits across month boundaries, with no rerolling',async()=>{
 const a=await funded(1234,800),b=await funded(1234,800);let daily;
 for(let i=1;i<=70;i++)daily=await a.s.run({kind:'sync'},nextDay(today,i));
 const offline=await b.s.run({kind:'sync'},nextDay(today,70));
 for(const field of ['balance','carry','lastDay','history','serial','lost','interestEarned','closedOn'])assert.deepEqual(offline.state[field],daily.state[field]);
 assert.equal(offline.feed.points,daily.feed.points);
});
test('failed deposit after bankruptcy still commits the refund; bank reopens the following day',async()=>{
 const {s,r}=await funded(seedFor('failure'));
 const closed=await s.run(transfer('deposit',50,r.state,'two'),nextDay(today));assert.equal(closed.ok,false);assert.equal(closed.feed.points,975);assert.equal(closed.state.balance,0);
 const reopened=await s.run(transfer('deposit',50,closed.state,'three'),nextDay(today,2));assert.equal(reopened.ok,true);assert.equal(reopened.feed.points,925);
});
test('concurrent/stale operations and duplicate retries cannot debit or credit twice',async()=>{
 const s=setup({...feed,points:80}),r=await s.run(),a=transfer('deposit',60,r.state,'a'),b=transfer('deposit',60,r.state,'b');
 const [one,two]=await Promise.all([s.run(a),s.run(b)]);assert.equal(one.ok,true);assert.equal(two.ok,false);assert.equal(two.feed.points,20);assert.equal(two.state.balance,60);
 assert.equal((await s.run(a)).feed.points,20);
 await assert.rejects(s.run({...a,amount:1}),/取引番号/);
});
test('journal recovery after a failed deposit or daily settlement remains exactly once',async()=>{
 const s=setup(feed,seedFor('failure')),r=await s.run(),op=transfer('deposit',100,r.state);
 s.fail();await assert.rejects(s.run(op),/disk/);const saved=await s.run(op);assert.equal(saved.feed.points,900);assert.equal(saved.state.balance,100);
 s.fail();await assert.rejects(s.run({kind:'sync'},nextDay(today)),/disk/);const recovered=await s.run({kind:'sync'},nextDay(today));
 assert.equal(recovered.feed.points,975);assert.equal(recovered.state.lost,25);assert.equal(recovered.state.history.filter(e=>e.kind==='failure').length,1);
});
test('invalid amounts, corrupt storage and backward clocks cannot change either balance',async()=>{
 const {s,r}=await funded();
 for(const amount of [-1,0,.5,NaN,Infinity,BANK_CAPACITY+1])await assert.rejects(s.run(transfer('deposit',amount,r.state)));
 await assert.rejects(s.run({kind:'sync'},'2026-02-30'),/日付/);await assert.rejects(s.run({kind:'sync'},'2026-10-09'),/日付/);
 assert.equal((await s.run(transfer('withdraw',101,r.state,'too-much'))).ok,false);
 const bad=setup({...feed,bank:{...r.state,balance:-1}});await assert.rejects(bad.run(),/通帳/);
 assert.equal((await s.run()).feed.points,900);
});
test('capacity, history pruning and old command retries remain bounded',async()=>{
 const {s,r}=await funded(seedFor('interest'),BANK_CAPACITY,{...feed,points:BANK_CAPACITY+100});
 const capped=await s.run({kind:'sync'},nextDay(today));assert.equal(capped.state.balance,BANK_CAPACITY);assert.equal(capped.state.carry,0);
 const old=transfer('withdraw',1,capped.state,'old');let current=await s.run(old,nextDay(today));
 for(let i=0;i<82;i++)current=await s.run(transfer(i%2?'deposit':'withdraw',1,current.state,'cmd-'+i),nextDay(today));
 const stale=await s.run(old,nextDay(today));assert.equal(stale.ok,false);assert.equal(stale.state.balance,current.state.balance);assert.equal(stale.state.history.length,80);
});
