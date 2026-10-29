import test from 'node:test';
import assert from 'node:assert/strict';
import {placeResidentSpeech} from '../utils/residentSpeech.ts';
import {homeFurnishingFrame} from '../utils/homeFurnishings.ts';
import {fitHomeOverview,homeResidentSize} from '../utils/homeView.ts';

test('speech follows the head, flips below a high resident, and stays inside the controls',()=>{
 const safe={left:12,top:168,width:366,height:520},bubble={width:230,height:68};
 const low={x:195,top:480,bottom:570,width:90},high={x:295,top:170,bottom:240,width:90};
 const a=placeResidentSpeech(low,bubble,safe),b=placeResidentSpeech(high,bubble,safe);
 assert.equal(low.top-(a.top+bubble.height),12);
 assert.equal(b.top-high.bottom,12);
 for(const x of [0,35,195,380,420])for(const top of [120,200,400,600]){
  const p=placeResidentSpeech({x,top,bottom:top+90,width:90},bubble,safe);
  assert.ok(p.left>=safe.left&&p.left+bubble.width<=safe.left+safe.width);
  assert.ok(p.top>=safe.top&&p.top+bubble.height<=safe.top+safe.height);
 }
});
test('furniture has furniture-scale proportions and a grounded base, including wide rooms',()=>{
 for(const [w,h] of [[320,568],[390,844],[844,390],[820,1180]]){
  const frame=fitHomeOverview(w,h),resident=homeResidentSize(frame,h,1);
  for(const id of ['sofa','vanity','bookshelf']){
   const f=homeFurnishingFrame('furniture',id,frame.width,frame.height);
   assert.ok(f.width>resident,'no miniature furniture: '+id);
   assert.ok(f.left>=0&&f.left+f.width<=frame.width);
   assert.ok(f.top>frame.height*.25&&f.top+f.height<=frame.height*.9);
  }
  const stored={x:160,y:-160,scale:1.45},copy={...stored};
  const d=homeFurnishingFrame('decor','catalog-decor-plant',frame.width,frame.height,stored);
  assert.deepEqual(stored,copy,'rendering never rewrites saved custom placement');
  assert.ok(d.left>=0&&d.left+d.width<=frame.width&&d.top>=0);
 }
});
