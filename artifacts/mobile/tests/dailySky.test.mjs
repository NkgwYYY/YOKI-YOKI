import test from 'node:test';
import assert from 'node:assert/strict';
import {parseUsnoSky,validDailySky} from '../utils/dailySky.ts';
import {createSkyService,parseUsnoSky as serverParse} from '../../api-server/src/lib/dailySky.ts';
const date='2026-10-28',clock=()=>Date.parse(date+'T03:00:00Z');
const raw=()=>({geometry:{coordinates:[139.6503,35.6762]},properties:{data:{year:2026,month:10,day:28,tz:9,isdst:false,curphase:'Waning Gibbous',fracillum:'95%',moondata:[{phen:'Rise',time:'18:01'},{phen:'Set',time:'08:15'}]}}});
test('USNO payload retains date, location, measured values and verifiable provenance',()=>{
 const sky=parseUsnoSky(raw(),date,new Date(clock()).toISOString());assert.equal(sky.illumination,95);assert.equal(sky.phase,'Waning Gibbous');assert.equal(sky.moonrise,'18:01');assert.equal(validDailySky(sky,date),true);assert.deepEqual(serverParse(raw(),date,sky.fetchedAt),sky);
 for(const change of [{day:27},{tz:0},{fracillum:'105%'},{curphase:'unknown'}]){const value=raw();Object.assign(value.properties.data,change);assert.throws(()=>parseUsnoSky(value,date,sky.fetchedAt));assert.throws(()=>serverParse(value,date,sky.fetchedAt));}
});
test('same-day requests coalesce and cache; failures retry without fabricated data',async()=>{
 let calls=0,fail=true;const service=createSkyService(async(url)=>{calls++;assert.match(url,/aa.usno.navy.mil/);await Promise.resolve();if(fail)return new Response('{}',{status:503});return new Response(JSON.stringify(raw()));},clock);
 await assert.rejects(service(date));fail=false;const [a,b]=await Promise.all([service(date),service(date)]);assert.deepEqual(a,b);assert.equal(calls,2);await service(date);assert.equal(calls,2);await assert.rejects(service('2020-01-01'));
});
