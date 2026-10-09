import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import * as base from '../utils/residentVolume.ts';
const code=ts.transpileModule(fs.readFileSync(new URL('../utils/evolvedVolume.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
const model={exports:{}};new Function('require','module','exports',code)(()=>base,model,model.exports);
const {projectOdango,residentSoftScale,residentWalkYaw,EVOLVED_VOLUME_MODELS}=model.exports;
const bounds=d=>{
  const pairs=[...d.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)].map(m=>[+m[1],+m[2]]);
  return {width:Math.max(...pairs.map(p=>p[0]))-Math.min(...pairs.map(p=>p[0])),height:Math.max(...pairs.map(p=>p[1]))-Math.min(...pairs.map(p=>p[1])),bottom:Math.max(...pairs.map(p=>p[1]))};
};
test('odango keeps original broad proportions, furry rear and surface-bound face',()=>{
  const front=projectOdango(0,0,0),side=projectOdango(0,Math.PI/2,0),rear=projectOdango(0,Math.PI,0);
  const b=bounds(front.body);assert.ok(b.width>b.height);assert.equal(b.bottom,91);
  assert.ok(front.leftEye&&front.rightEye&&front.mouth);assert.equal(side.rightEye,'');assert.ok(side.leftEye);
  for(const key of ['leftEye','rightEye','leftCheek','rightCheek','leftSocket','rightSocket','leftShine','rightShine','mouth'])assert.equal(rear[key],'');
  assert.ok(rear.furLight&&rear.furMid&&rear.furShade);assert.notEqual(side.body,front.body);
  assert.notEqual(projectOdango(0,0,0,1).leftEye,front.leftEye);assert.equal(projectOdango(0,0,0,1).leftShine,'');
  assert.notEqual(projectOdango(0,0,0,0,true).mouth,front.mouth);
  assert.deepEqual(Object.keys(EVOLVED_VOLUME_MODELS),['odango']);
});
test('rolling around all axes stays finite, inside frame and in ground contact',()=>{
  for(let a=0;a<Math.PI*4;a+=.08){
    const p=projectOdango(a,a*.7,a*.3),b=bounds(p.body);
    for(const d of Object.values(p))assert.ok(!/NaN|Infinity/.test(d));
    assert.ok(Math.abs(b.bottom-91)<.011);assert.ok(b.width<=90.01);assert.ok(b.height<=90.01);
  }
  assert.equal(projectOdango(Math.PI,0,0).mouth,'','upside-down surface turns face away');
});
test('spring undershoot/held pose never stretches an evolved form vertically',()=>{
  for(let j=-2;j<=2;j+=.03)for(const breath of [-1,0,.5,1,2]){
    const s=residentSoftScale(j,breath);assert.ok(s.y<=1&&s.y>=.816);assert.ok(s.x>=1&&s.x<=1.151);
  }
  assert.deepEqual(residentSoftScale(0,0),{x:1,y:1});
});
test('travel yaw faces the direction of ground motion with scene aspect',()=>{
  assert.equal(residentWalkYaw(1,0,2),Math.PI/2);assert.equal(residentWalkYaw(-1,0,2),-Math.PI/2);
  assert.equal(residentWalkYaw(0,1,2),0);assert.equal(residentWalkYaw(0,-1,2),Math.PI);
});
test('the cigarette follows each real face through turns without replacing or resizing either character',()=>{
 for(const project of [base.projectEgg,projectOdango]){
  for(const yaw of [0,.4,1,-.4,-1,Math.PI]){
   const normal=project(0,yaw,0,0,true),smoking=project(0,yaw,0,0,true,false,0,0,true);
   for(const key of ['body','mouth','leftEye','rightEye','furHalo'])assert.equal(smoking[key],normal[key]);
   assert.equal(normal.cigarettePaper,'');
   if(yaw===Math.PI){assert.equal(smoking.cigarettePaper,'');assert.equal(smoking.cigaretteSmoke,'');}
   else {assert.ok(smoking.cigarettePaper);assert.ok(smoking.cigaretteFilter);assert.ok(!/NaN|Infinity/.test(smoking.cigaretteSmoke));}
  }
  assert.notEqual(project(0,0,0,0,true,false,0,0,true).cigarettePaper,project(0,.4,0,0,true,false,0,0,true).cigarettePaper);
 }
});
test('meal opens the surface mouth and puffs cheeks without changing body proportions',()=>{
  const front=projectOdango(0,0,0),bite=projectOdango(0,0,0,0,false,false,1),chew=projectOdango(0,0,0,0,false,false,0,1);
  assert.equal(front.openMouth,'');assert.ok(bite.openMouth);assert.equal(chew.openMouth,'');
  assert.notEqual(chew.leftCheek,front.leftCheek);assert.notEqual(chew.rightCheek,front.rightCheek);
  assert.equal(bite.body,front.body);assert.equal(chew.body,front.body);
  assert.equal(projectOdango(0,Math.PI,0,0,false,false,1,1).openMouth,'','meal cannot paint a mouth on the rear');
});
