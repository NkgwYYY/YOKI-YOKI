import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
const base=path.resolve(import.meta.dirname,'../utils'),cache=new Map();
function load(name){const file=path.resolve(base,name.endsWith('.ts')?name:name+'.ts');if(cache.has(file))return cache.get(file);const mod={exports:{}};cache.set(file,mod.exports);const js=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;new Function('require','module','exports',js)(p=>load(path.resolve(path.dirname(file),p)),mod,mod.exports);return mod.exports;}
const wardrobe=load('wardrobe'),geometry=load('costumeGeometry'),volume=load('evolvedVolume'),room=load('roomPlacement'),furnishing=load('homeFurnishings'),purchase=load('roomPurchase'),delivery=load('stoneDelivery'),evolution=load('evolutionChoice'),egg=load('eggJob');
test('build41 wardrobe survives reload; repeat purchase charges exactly once; unequip keeps ownership',()=>{
 let f={points:1500,wardrobe:{version:1,owned:['dog'],equipped:'dog',changedAt:101},legacy:{receipt:'keep'}};
 f=wardrobe.changeCostume(f,{kind:'buy',id:'panda'});assert.equal(f.points,1000);assert.deepEqual(f.legacy,{receipt:'keep'});
 f=wardrobe.changeCostume(JSON.parse(JSON.stringify(f)),{kind:'buy',id:'panda'});assert.equal(f.points,1000);
 f=wardrobe.changeCostume(f,{kind:'equip',id:null},110);assert.deepEqual(f.wardrobe.owned,['dog','panda']);assert.equal(f.wardrobe.equipped,null);
 assert.throws(()=>wardrobe.changeCostume(f,{kind:'equip',id:'frog'}));assert.throws(()=>wardrobe.readWardrobe({version:1,owned:['bogus']}));
});
test('all 20 costumes remain finite and periodic around all three axes',()=>{
 for(const form of ['egg','odango','stage3','stage4'])for(const id of ['dog','cat','rabbit','frog','panda']){
  const front=geometry.projectCostume(form,id,0,0,0);assert.ok(front.some(x=>x.d));
  assert.deepEqual(geometry.projectCostume(form,id,0,Math.PI*2,0),front);
  for(let t=0;t<Math.PI*2;t+=Math.PI/8){const p=geometry.projectCostume(form,id,t,t*.7,t*.9);for(const layer of p){assert.ok(!/NaN|Infinity/.test(layer.d+layer.fur));}}
 }
});
test('neutral to smile changes only the mouth, never the body or coat silhouette',()=>{
 for(const stage of ['odango','stage3','stage4'])for(const [rx,ry,rz] of [[0,0,0],[.7,1.2,2.8],[Math.PI,0,0]]){
  const a=volume.projectEvolved(stage,rx,ry,rz,0,0),b=volume.projectEvolved(stage,rx,ry,rz,0,1);
  for(const key of ['body','furHalo','leftEye','rightEye'])assert.equal(a[key],b[key]);
  const mid=volume.projectEvolved(stage,0,0,0,0,.5);assert.notEqual(mid.mouth,volume.projectEvolved(stage,0,0,0,0,0).mouth);assert.notEqual(mid.mouth,volume.projectEvolved(stage,0,0,0,0,1).mouth);
 }
});
test('furniture and owned ornaments save at the rear, retain scale and survive merge/reload',()=>{
 const feed={points:100},saved={furniture:'sofa',flower:'none',ownedFurniture:['sofa'],ownedFlowers:[]};
 for(const [category,id]of[['furniture','sofa'],['decor','catalog-decor-plush']]){
  const values={'@mentore/feed_state_v1':JSON.stringify(feed),'@mentore/room_customization_v1':JSON.stringify(saved),'@mentore/shop_state_v2':JSON.stringify({inventory:['catalog-decor-plush']})};
  const result=purchase.prepareRoomOperation(values,{kind:'place',category,id,position:{x:.5,y:.425,scale:.6}},feed);assert.ok(result.result.success);
  const p=room.readRoomPositions(JSON.parse(result.entries[0][1]).positions)[`${category}:${id}`];assert.equal(p.y,.425);assert.equal(p.scale,.6);
  const frame=furnishing.homeFurnishingFrame(category,id,390,844,{x:40,y:90,scale:1},undefined,p);
  assert.ok(Math.abs(frame.top+frame.height-844*.425)<.01,'legacy decor offsets do not override saved rear position');
 }
});
test('failed delivery or account change never finishes a purchase; retry is idempotent',async()=>{
 const receipt={transactionId:'1000001',productId:evolution.STONE_PRODUCTS.evolution};let finishes=0,p={level:1};
 await assert.rejects(delivery.deliverStone(receipt,()=>true,async()=>{throw Error('disk');},async()=>finishes++));assert.equal(finishes,0);
 await delivery.deliverStone(receipt,()=>true,async r=>{p=evolution.creditStone(p,r.productId,r.transactionId);},async()=>finishes++);
 await delivery.deliverStone(receipt,()=>true,async r=>{p=evolution.creditStone(p,r.productId,r.transactionId);},async()=>finishes++);
 assert.equal(p.evolution.wallet.evolution,1);assert.equal(finishes,2);
 let current=true;await assert.rejects(delivery.deliverStone(receipt,()=>current,async()=>{current=false;},async()=>finishes++));assert.equal(finishes,2);
});
test('new egg rounds pay 10/4 only for the first six, without ending a successful seventh round',()=>{
 let values={},now=new Date(2026,10,3,12).getTime();const initial={points:0};
 for(let n=0;n<7;n++){
  let result=egg.prepareEggJob(values,{kind:'start',id:'round-'+n},now,initial);for(const [k,v]of result.entries)values[k]=v;
  const pot=result.result.state.active;now=pot.startedAt+pot.targetMs;
  result=egg.prepareEggJob(values,{kind:'finish',id:pot.id,finishedAt:now},now,initial);for(const [k,v]of result.entries)values[k]=v;
  assert.equal(result.result.receipt.earned,n<6?10:0);now+=5000;
 }
 const f=JSON.parse(values['@mentore/feed_state_v1']);assert.equal(f.points,60);assert.equal(f.eggJob.challenge.days[0].successes,7);assert.equal(f.eggJob.challenge.days[0].endedAt,null);
});
