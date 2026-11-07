import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { prepareVerifiedBonus } from '../utils/community/bonusLedger.ts';
import { createRecoverableStorage } from '../utils/recoverableStorage.ts';
const key='@mentore/feed_state_v1';
test('verified bonus, concurrent callback retries, and storage recovery credit exactly once',async()=>{
 const data=new Map([[key,JSON.stringify({points:120,eggJob:{receipts:[]},happiness:{value:55}})]]);
 let fail=true;
 const store=createRecoverableStorage({getItem:async k=>data.get(k)??null,setItem:async(k,v)=>{if(k===key&&fail){fail=false;throw Error('interrupted');}data.set(k,v);},removeItem:async k=>data.delete(k)},'journal',[key]);
 const claim={id:randomUUID(),receipt_id:'egg-1792030000000-abc1234',amount:30};
 const give=()=>store.transaction(values=>prepareVerifiedBonus(values,claim,{points:0}));
 await assert.rejects(give());
 await Promise.all([give(),give(),give()]);
 const saved=JSON.parse(data.get(key));assert.equal(saved.points,150);assert.deepEqual(saved.communityBonuses,[claim.id]);assert.deepEqual(saved.happiness,{value:55});assert.equal(data.has('journal'),false);
});
test('a malformed reward cannot change the saved balance',()=>{
 assert.throws(()=>prepareVerifiedBonus({}, {id:randomUUID(),receipt_id:'a',amount:3000},{points:12}));
 assert.throws(()=>prepareVerifiedBonus({}, {id:'client-said-watched',receipt_id:'a',amount:30},{points:12}));
});
test('10pt claims and old pending 30pt claims are each credited exactly once',()=>{
 const fallback={points:5}, a={id:randomUUID(),receipt_id:'daily-home-new',amount:10}, b={id:randomUUID(),receipt_id:'daily-home-old',amount:30};
 const values={};
 for(const claim of [a,a,b,b]) {
   const result=prepareVerifiedBonus(values,claim,fallback);
   for(const [k,v] of result.entries)values[k]=v;
 }
 assert.equal(JSON.parse(values[key]).points,45);
 assert.equal(JSON.parse(values[key]).communityBonuses.length,2);
 for(const amount of [0,5,15,29,31,'10',NaN]) assert.throws(()=>prepareVerifiedBonus(values,{...a,id:randomUUID(),amount},fallback));
});
