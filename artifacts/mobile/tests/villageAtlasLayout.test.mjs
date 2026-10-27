import test from 'node:test';
import assert from 'node:assert/strict';
import {villageAtlasLayout} from '../utils/villageAtlasLayout.ts';
import {WORLD_MAPS,isMapAvailable} from '../utils/worldMaps.ts';

test('visible destinations fill centred rows after platform and invitation filtering',()=>{
 for(const platform of ['web','ios'])for(const invited of [false,true])for(const wide of [false,true]){
  const ids=WORLD_MAPS.filter(p=>isMapAvailable(p.id,platform)&&(p.id!=='grandma'||invited)).map(p=>p.id);
  const points=villageAtlasLayout(ids,wide);
  assert.deepEqual(Object.keys(points).sort(),[...ids].sort());
  assert.equal(points.bank,undefined);assert.equal(points.forest,undefined);assert.equal(points.village,undefined);
  const rows=new Map();
  for(const p of Object.values(points)){assert.ok(p.x>=.125&&p.x<=.875&&p.y>=.125&&p.y<=.875);rows.set(p.y,[...(rows.get(p.y)||[]),p.x]);}
  for(const row of rows.values())assert.ok(Math.abs(row.reduce((a,b)=>a+b,0)/row.length-.5)<1e-9);
  if(platform==='ios'&&!invited&&!wide)assert.equal(points.home.x,.5,'no empty tobacco/grandmother slots');
 }
});

test('empty rows disappear without producing invalid coordinates',()=>{
 assert.deepEqual(villageAtlasLayout(['home']),{home:{x:.5,y:.5}});
 assert.deepEqual(villageAtlasLayout([]),{});
});
