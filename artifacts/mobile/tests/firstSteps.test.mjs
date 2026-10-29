import test from 'node:test';
import assert from 'node:assert/strict';
import {firstStepsKey,zodiacKey,hasMoodForDay} from '../utils/firstSteps.ts';
import {ZODIAC_SIGNS,zodiacUrl} from '../utils/zodiac.ts';
test('record guidance distinguishes a low mood, missing record and another day',()=>{
 const today='2026-10-28';
 for(const mood of [1,2,3,4,5])assert.equal(hasMoodForDay({date:today,mood},today),true);
 for(const record of [undefined,{date:'2026-10-27',mood:5},{date:today,mood:0},{date:today,mood:NaN},{date:today,mood:3.5}])assert.equal(hasMoodForDay(record,today),false);
});
test('tutorial and zodiac choices stay in separate owner namespaces',()=>{
 const owners=['guest','account/guest','account%2Fguest','user-a','user-b'];
 assert.equal(new Set(owners.flatMap(owner=>[firstStepsKey(owner),zodiacKey(owner)])).size,10);
});
test('external readings only link to the twelve verified publisher pages',()=>{
 assert.equal(new Set(ZODIAC_SIGNS.map(sign=>sign.id)).size,12);
 for(const sign of ZODIAC_SIGNS)assert.match(zodiacUrl(sign.id),/^https:\/\/uranai\.nifty\.com\/f12seiza\/[a-z]+\/$/);
 assert.equal(zodiacUrl('https://example.com'),null);assert.equal(zodiacUrl('../bad'),null);assert.equal(zodiacUrl(null),null);
});
