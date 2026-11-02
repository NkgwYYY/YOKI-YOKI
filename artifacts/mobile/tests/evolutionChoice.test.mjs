import test from 'node:test';
import assert from 'node:assert/strict';
import {advanceVisit,shiftDay} from '../utils/visitGrowth.ts';
import {evolutionFor,evolutionOffer,chooseEvolution,creditStone,mergeEvolution,evolutionForCloud,STONE_PRODUCTS} from '../utils/evolutionChoice.ts';
const roundTrip=value=>JSON.parse(JSON.stringify(value));
function eligible(days=30){
 let p={level:1,visits:advanceVisit(undefined,'2026-10-01')};
 p.evolution=evolutionFor(p);
 for(let i=1;i<days;i++)p.visits=advanceVisit(p.visits,shiftDay('2026-10-01',i));
 return p;
}
const action=(p,kind)=>({kind,stage:p.evolution.stage,revision:p.evolution.revision});
test('thirty visits unlock an offer without automatically replacing the egg; reloading keeps it',()=>{
 const p=roundTrip(eligible());assert.equal(evolutionFor(p).stage,'egg');assert.equal(evolutionOffer(p).free,true);
 const before=roundTrip(p);evolutionOffer(p);assert.deepEqual(p,before,'looking at or dismissing an offer has no side effect');
});
test('each free confirmation advances exactly one stage, even after all attendance thresholds',()=>{
 let p=eligible();
 for(const stage of ['odango','stage3','stage4']){p=chooseEvolution(p,action(p,'free'));assert.equal(p.evolution.stage,stage);}
 assert.equal(evolutionOffer(p).next,null);assert.throws(()=>chooseEvolution(p,action(p,'free')));
});
test('explicit decline is permanent for that stage across visits, reload and cloud merge',()=>{
 const original=eligible(),declined=chooseEvolution(original,action(original,'decline'),100);
 const saved=roundTrip(declined);saved.visits=advanceVisit(saved.visits,'2026-11-15');
 assert.equal(evolutionOffer(saved).free,false);assert.equal(saved.evolution.stage,'egg');assert.throws(()=>chooseEvolution(saved,action(saved,'free')));
 const merged={...saved,evolution:mergeEvolution(original,saved)};assert.equal(evolutionOffer(merged).free,false);
 assert.ok(evolutionForCloud(saved.evolution).declined.includes('egg'));
});
test('a stale confirmation never changes form or consumes a stone',()=>{
 const p=eligible(),old=action(p,'free'),newer=chooseEvolution(p,old,100),before=roundTrip(newer);
 assert.throws(()=>chooseEvolution(newer,old,101),/もう一度/);assert.deepEqual(newer,before);
});
test('new installation and existing legacy forms migrate without jumping or regression',()=>{
 assert.equal(evolutionFor({level:1}).stage,'egg');assert.equal(evolutionFor({level:6}).stage,'stage3');
 assert.equal(mergeEvolution({level:15},{level:1}).stage,'stage4');assert.equal(mergeEvolution({level:1},{level:15}).stage,'stage4');
 assert.throws(()=>evolutionFor({evolution:{stage:'egg'}}),/読み込めません/);
});
test('future stone accounting grants once; one stone changes exactly one stage; regression does not reopen a used free step',()=>{
 let p=chooseEvolution(eligible(),action(eligible(),'decline'),100);
 p=creditStone(p,STONE_PRODUCTS.evolution,'1001');p=creditStone(p,STONE_PRODUCTS.evolution,'1001');assert.equal(p.evolution.wallet.evolution,1);assert.equal(p.evolution.stage,'egg');
 p=chooseEvolution(p,action(p,'evolution'),101);assert.equal(p.evolution.stage,'odango');assert.equal(p.evolution.wallet.evolution,0);
 assert.throws(()=>chooseEvolution(p,action(p,'regression')));
 p=creditStone(p,STONE_PRODUCTS.regression,'1002');p=chooseEvolution(p,action(p,'regression'),102);
 assert.equal(p.evolution.stage,'egg');assert.equal(p.evolution.wallet.regression,0);assert.equal(evolutionOffer(p).free,false);
 assert.throws(()=>chooseEvolution(p,action(p,'regression')));
 assert.throws(()=>creditStone(p,'wrong.product','1003'));assert.throws(()=>creditStone(p,STONE_PRODUCTS.evolution,'invalid'));
});
test('an explicit regression wins over legacy attendance and cloud snapshots cannot copy consumable balances',()=>{
 let p=eligible();p=chooseEvolution(p,action(p,'free'),100);p=creditStone(p,STONE_PRODUCTS.regression,'1004');p=chooseEvolution(p,action(p,'regression'),200);
 const merged=mergeEvolution({level:15},p);assert.equal(merged.stage,'egg');assert.equal(evolutionOffer({...p,evolution:merged}).free,false);
 const cloud=creditStone({...p,evolution:merged},STONE_PRODUCTS.evolution,'1005');const remote=evolutionForCloud(cloud.evolution);assert.equal(remote.wallet.evolution,0);assert.deepEqual(remote.wallet.receipts,[]);
 assert.equal(mergeEvolution(cloud,p).wallet.evolution,0);
});
