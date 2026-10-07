import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import {DEFAULT_RECORD_PROMPT as D,parseRecordPrompt,isRecordPromptDue as due,localPromptDate} from '../utils/recordPrompt.ts';
import * as maps from '../utils/worldMaps.ts';
import {projectEgg,rotatePoint} from '../utils/residentVolume.ts';
const physicsCode=ts.transpileModule(fs.readFileSync(new URL('../utils/residentPhysics.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
const physics={exports:{}};new Function('require','module','exports',physicsCode)(()=>maps,physics,physics.exports);
const {rollStep}=physics.exports;
test('record invitation follows local time, completed record, snooze and one-day rest',()=>{
  const now=new Date(2026,9,7,20,0,0),earlier=new Date(2026,9,7,19,59,59);
  assert.equal(due(D,earlier,false),false);assert.equal(due(D,now,false),true);
  assert.equal(due(D,now,true),false);assert.equal(due({...D,enabled:false},now,false),false);
  const p={...D,snoozedUntil:now.getTime()+1800000};
  assert.equal(due(p,new Date(now.getTime()+1799999),false),false);
  assert.equal(due(p,new Date(now.getTime()+1800000),false),true);
  const skip={...D,skippedDate:localPromptDate(now)};
  assert.equal(due(skip,now,false),false);assert.equal(due(skip,new Date(2026,9,8,20),false),true);
  assert.equal(due({...D,time:'00:00'},new Date(2026,9,8,0),false),true);
});
test('persisted invitation validates without silently erasing bad preferences',()=>{
  assert.deepEqual(parseRecordPrompt(null),D);
  const saved={...D,enabled:false,time:'07:30',snoozedUntil:123};assert.deepEqual(parseRecordPrompt(JSON.stringify(saved)),saved);
  for(const time of ['24:00','20:60','7:00','-1:00','bad'])assert.throws(()=>parseRecordPrompt(JSON.stringify({...D,time})));
  assert.throws(()=>parseRecordPrompt('{broken'));
});
test('three distinct maps unlock at saved level, with connected reachable dry-ground routes',()=>{
  for(const [level,ids] of [[1,['home']],[3,['home','forest']],[6,['home','forest','lake']],[15,['home','forest','lake']]])assert.deepEqual(maps.WORLD_MAPS.filter(m=>maps.canVisitMap(m.id,level)).map(m=>m.id),ids);
  for(const id of ['forest','lake']){
    assert.equal(maps.isMapGround(id,{x:.1,y:.2}),false);
    const points=[maps.mapStart(id),maps.mapGroundPoint(id,{x:-1,y:9}),maps.mapGroundPoint(id,{x:9,y:-1})];
    for(const from of points)for(const to of points){let at=from;for(const next of maps.mapRoute(id,from,to)){for(let t=0;t<=1;t+=.02)assert.ok(maps.isMapGround(id,{x:at.x+(next.x-at.x)*t,y:at.y+(next.y-at.y)*t}));at=next;}assert.deepEqual(at,to);}
  }
});
test('rolling reflects on walls, slows down and remains bounded at different frame rates',()=>{
  for(const map of ['home','forest','lake'])for(const fps of [30,60,120]){
    let s={...maps.mapStart(map),vx:1.1,vy:.8,hit:false},bounced=false;
    for(let i=0;i<fps*6;i++){const before=Math.hypot(s.vx,s.vy);s=rollStep(s,1/fps,1.5,map);bounced||=s.hit;assert.ok(maps.isMapGround(map,s));assert.ok(Math.hypot(s.vx,s.vy)<=before+1e-12);}
    assert.ok(bounced);assert.ok(Math.hypot(s.vx,s.vy)<.001);
  }
  const a=rollStep({x:.65,y:.72,vx:.8,vy:0,hit:false},.033,1.5,'home');assert.ok(a.vx<0);
});
test('volumetric egg hides its face on the rear and projects a different side silhouette',()=>{
  const front=projectEgg(0,0,0),rear=projectEgg(0,Math.PI,0),side=projectEgg(0,Math.PI/2,0),top=projectEgg(Math.PI/2,0,0);
  assert.ok(front.leftEye&&front.rightEye&&front.crack);assert.equal(rear.leftEye,'');assert.equal(rear.rightEye,'');assert.equal(rear.crack,'');
  assert.notEqual(side.body,front.body);assert.notEqual(top.body,front.body);
  assert.notEqual(projectEgg(0,0,0,1).leftEye,front.leftEye);
  for(let angle=0;angle<Math.PI*2;angle+=.1){const p=projectEgg(angle,angle*.7,angle*.3);assert.ok(!/NaN|Infinity/.test(p.body));const v=rotatePoint({x:1,y:2,z:3},angle,angle,angle);assert.ok(Math.abs(Math.hypot(v.x,v.y,v.z)-Math.sqrt(14))<1e-10);}
});
