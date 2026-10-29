import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';

const source=ts.transpileModule(readFileSync(new URL('../utils/community/commerce.native.ts',import.meta.url),'utf8'),
  {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;

function fixture({rewarded=true}={}) {
  const events=new Map(),timers=new Map();let serial=0,requests=0,privacy=0;
  const ad={addAdEventListener:(name,fn)=>{events.set(name,fn);return()=>events.delete(name);},
    removeAllListeners:()=>events.clear(),load:()=>events.get('loaded')?.(),show:async()=>{}};
  const init=()=>({setRequestConfiguration:async()=>{},initialize:async()=>{}});
  const sdk={__esModule:true,default:init,AdsConsent:{gatherConsent:async()=>({canRequestAds:true}),
    showPrivacyOptionsForm:async()=>{privacy++;}},MaxAdContentRating:{G:'G'},TestIds:{REWARDED:'official-test'},
    RewardedAd:{createForAdRequest:(_unit,options)=>{requests++;assert.equal(options.requestNonPersonalizedAdsOnly,true);return ad;}},
    RewardedAdEventType:{LOADED:'loaded',EARNED_REWARD:'earned'},AdEventType:{PAID:'paid',CLOSED:'closed',ERROR:'error'}};
  const config={yokiAdsConfigured:{ios:true},yokiRewardedIosUnit:rewarded?'test-unit':undefined,yokiBannerIosUnit:'banner-unit'};
  const exports={};
  new Function('require','exports','process','__DEV__','setTimeout','clearTimeout',source)(name=>{
    if(name==='react-native')return{AppState:{currentState:'active'},Platform:{OS:'ios'}};
    if(name==='expo-constants')return{__esModule:true,default:{appOwnership:'standalone',expoConfig:{extra:config}}};
    if(name==='react-native-google-mobile-ads')return sdk;
    throw Error(`Unexpected dependency: ${name}`);
  },exports,{env:{}},false,(fn,ms)=>{timers.set(++serial,{fn,ms});return serial;},id=>timers.delete(id));
  return {api:exports,events,timers,requests:()=>requests,privacy:()=>privacy,
    start:async()=>{
      const result=exports.showRewardedAd({id:'test-reservation',playerId:'test-player'},()=>{});
      // SDK initialization/dynamic import is asynchronous.
      for(let i=0;i<20&&!events.has('closed');i++)await Promise.resolve();
      return {result};
    }};
}

test('native close without reward is false and releases the presentation lock',async()=>{
  const f=fixture(),a=await f.start();f.events.get('closed')();
  assert.equal(await a.result,false);
  const b=await f.start();f.events.get('closed')();assert.equal(await b.result,false);
  assert.equal(f.requests(),2);
});

test('a native interruption after earned reward proceeds to SSV rather than replay',async()=>{
  const f=fixture(),a=await f.start();f.events.get('earned')();f.events.get('error')();
  assert.equal(await a.result,true);assert.equal(f.timers.size,0);
});

test('a missing close callback is bounded and permits recovery',async()=>{
  const f=fixture(),a=await f.start();
  const result=assert.rejects(a.result,/状態/);
  const watchdog=[...f.timers.values()].find(t=>t.ms===180_000);assert.ok(watchdog);
  watchdog.fn();await result;
  const b=await f.start();f.events.get('closed')();assert.equal(await b.result,false);
});

test('banner-only native configurations can reopen the existing privacy form',async()=>{
  const f=fixture({rewarded:false});
  assert.equal(f.api.canShowRewardedAd(),false);assert.equal(f.api.canShowBannerAd(),true);
  await f.api.adPrivacyOptions();assert.equal(f.privacy(),1);
});
