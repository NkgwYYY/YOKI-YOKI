import test from 'node:test';
import assert from 'node:assert/strict';
import {allowCharacterVoice, TOUCH_VOICE_GAP_MS, EVENT_VOICE_GAP_MS} from '../utils/voicePacing.ts';

test('ordinary touches vocalize only sometimes, including the first touch',()=>{
  assert.equal(allowCharacterVoice(-Infinity,100,'interaction',.1),true);
  assert.equal(allowCharacterVoice(-Infinity,100,'interaction',.7),false);
  assert.equal(allowCharacterVoice(-Infinity,100,'interaction',1/3),false);
});
test('rapid touching cannot make another sound within ten seconds, even with lucky draws',()=>{
  let last=-Infinity,played=[];
  for(let now=0;now<30_000;now+=100){
    if(allowCharacterVoice(last,now,'interaction',0)){last=now;played.push(now);}
  }
  assert.deepEqual(played,[0,10_000,20_000]);
});
test('any recent sound also keeps subsequent touches quiet',()=>{
  assert.equal(allowCharacterVoice(5000,5000+TOUCH_VOICE_GAP_MS-1,'interaction',0),false);
  assert.equal(allowCharacterVoice(5000,5000+TOUCH_VOICE_GAP_MS,'interaction',0),true);
});
test('welcome and meal events do not depend on a random draw but leave room between clips',()=>{
  assert.equal(allowCharacterVoice(5000,5000+EVENT_VOICE_GAP_MS-1,'event',0),false);
  assert.equal(allowCharacterVoice(5000,5000+EVENT_VOICE_GAP_MS,'event',.99),true);
});
test('explicit listening and autoplay retry can play immediately',()=>{
  assert.equal(allowCharacterVoice(5000,5000,'preview',.99),true);
});
