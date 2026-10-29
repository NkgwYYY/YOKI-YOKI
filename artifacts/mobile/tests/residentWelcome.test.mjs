import test from 'node:test';
import assert from 'node:assert/strict';
import {nextWelcomeVisit,welcomeSample,WELCOME_DURATION,WELCOME_RETURN_MS} from '../utils/residentWelcome.ts';
import {mapGroundPoint,WORLD_MAPS} from '../utils/worldMaps.ts';
const initial=()=>({foreground:null,awayAt:0,serial:0,pending:0});
test('first foreground visit welcomes even when native boot initially reports inactive',()=>{
  assert.equal(nextWelcomeVisit(initial(),true,100).pending,1);
  assert.equal(nextWelcomeVisit(nextWelcomeVisit(initial(),false,100),true,200).pending,1);
});
test('sheets and in-app navigation do not generate more welcomes',()=>{
  const shown={...nextWelcomeVisit(initial(),true,100),pending:0};
  assert.equal(nextWelcomeVisit(shown,true,999999),shown);
});
test('brief app interruption does not replay, a real return does',()=>{
  const shown={...nextWelcomeVisit(initial(),true,100),pending:0};
  const away=nextWelcomeVisit(shown,false,200);
  assert.equal(nextWelcomeVisit(away,true,200+WELCOME_RETURN_MS-1).pending,0);
  const returned=nextWelcomeVisit(away,true,200+WELCOME_RETURN_MS);
  assert.equal(returned.pending,2);
  assert.equal(nextWelcomeVisit(returned,true,999999),returned);
});
test('unshown welcome survives a short foreground transition',()=>{
  const pending=nextWelcomeVisit(initial(),true,100);
  assert.equal(nextWelcomeVisit(nextWelcomeVisit(pending,false,200),true,300).pending,1);
});
test('joyful movement stays bounded and ends grounded without stretch or residual lean',()=>{
  let hops=0,wasUp=false,runExtent=0;
  for(let t=0;t<=WELCOME_DURATION+.02;t+=1/120){
    const p=welcomeSample(t);
    assert.ok(Object.values(p).every(x=>typeof x==='boolean'||Number.isFinite(x)));
    assert.ok(p.jump>=-1e-10&&p.jump<=.81&&p.squash>=-1e-10&&p.squash<=.73);
    assert.ok(Math.abs(p.dx)<.089&&Math.abs(p.dy)<.055);
    if(t<2.05){const up=p.jump>.1;if(up&&!wasUp)hops++;wasUp=up;}
    runExtent=Math.max(runExtent,Math.abs(p.dx));
    for(const {id} of WORLD_MAPS){
      const point=mapGroundPoint(id,{x:.5+p.dx,y:.64+p.dy});
      assert.deepEqual(mapGroundPoint(id,point),point);
    }
  }
  assert.equal(hops,3);assert.ok(runExtent>.06);
  assert.deepEqual(welcomeSample(WELCOME_DURATION+10),{dx:0,dy:0,jump:0,squash:0,lean:0,turn:0,done:true});
});
