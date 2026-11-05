import test from 'node:test';
import assert from 'node:assert/strict';
import {firstStepsKey,zodiacKey,hasMoodForDay,dailyCheckinPromptKey,hasCompletedDailyCheckin} from '../utils/firstSteps.ts';
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
test('daily check-in is not complete after the legacy mood-only entry',()=>{
 const date='2026-11-06',moodOnly={date,mood:3};
 assert.equal(hasCompletedDailyCheckin(moodOnly,date),false);
 assert.equal(hasCompletedDailyCheckin({...moodOnly,fatigue:1,worry:2},date),false);
 for(const has of [true,false])assert.equal(hasCompletedDailyCheckin({...moodOnly,moyamoya:{has}},date),true);
 assert.equal(hasCompletedDailyCheckin({...moodOnly,moyamoya:{has:false}},'2026-11-07'),false);
 assert.equal(hasCompletedDailyCheckin({...moodOnly,mood:0,moyamoya:{has:false}},date),false);
 assert.equal(hasCompletedDailyCheckin(undefined,date),false);
});
test('daily prompt dismissal is separate from the old letter, account and day',()=>{
 const date='2026-11-06',owners=['guest','a/b','a%2Fb','user-b'];
 const keys=owners.flatMap(owner=>[dailyCheckinPromptKey(owner,date),dailyCheckinPromptKey(owner,'2026-11-07')]);
 assert.equal(new Set(keys).size,8);
 assert.ok(keys.every(key=>!key.startsWith('@yoki/daily-letter/')));
});
test('external readings only link to the twelve verified publisher pages',()=>{
 assert.equal(new Set(ZODIAC_SIGNS.map(sign=>sign.id)).size,12);
 for(const sign of ZODIAC_SIGNS)assert.match(zodiacUrl(sign.id),/^https:\/\/uranai\.nifty\.com\/f12seiza\/[a-z]+\/$/);
 assert.equal(zodiacUrl('https://example.com'),null);assert.equal(zodiacUrl('../bad'),null);assert.equal(zodiacUrl(null),null);
});
