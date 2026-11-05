import test from 'node:test';
import assert from 'node:assert/strict';
import {createInterstitialSession,reserveBattleAd} from '../utils/community/interstitialSession.ts';
import {acquireFullscreenAd} from '../utils/community/fullscreenAdLock.ts';
const tick=async()=>{for(let i=0;i<15;i++)await Promise.resolve();};
function fixture(options={}){
 const events=new Map();let shows=0,pauses=0,releases=0,current=true,reservations=0;
 const ad={on:(n,f)=>{events.set(n,f);return()=>events.delete(n);},load:()=>{},show:async()=>{shows++;if(options.failShow)throw Error('native failure');}};
 const deps={prepare:async()=>ad,current:()=>current,acquire:acquireFullscreenAd,
 reserve:async()=>{reservations++;return options.reserve!==false;},
 pause:()=>{pauses++;return {ready:Promise.resolve(),release:()=>releases++};},...options};
 return {session:createInterstitialSession(deps),events,ad,stats:()=>({shows,pauses,releases,reservations}),leave:()=>{current=false;}};
}
test('result exit waits for close; repeat taps cannot show again',async()=>{
 const f=fixture();await f.session.preload();f.events.get('loaded')();let done=false;
 const p=f.session.showIfReady().then(()=>done=true);await tick();
 await f.session.showIfReady();assert.equal(f.stats().shows,1);assert.equal(done,false);
 f.events.get('closed')();await p;assert.deepEqual(f.stats(),{shows:1,pauses:1,releases:1,reservations:1});
 assert.equal(f.events.size,0);
});
test('not loaded at exit skips immediately; a late load cannot show',async()=>{
 const f=fixture();await f.session.preload();const late=f.events.get('loaded');
 await f.session.showIfReady();late();assert.equal(f.stats().shows,0);assert.equal(f.events.size,0);
});
test('leaving while SDK consent/loading finishes cannot create a late popup',async()=>{
 let resolve;const f=fixture({prepare:()=>new Promise(r=>resolve=r)});
 const p=f.session.preload();f.session.dispose();resolve(f.ad);await p;
 await f.session.showIfReady();assert.equal(f.events.size,0);assert.equal(f.stats().shows,0);
});
test('account/focus changes during reservation suppress show and release global lock',async()=>{
 let reserve;const f=fixture({reserve:()=>new Promise(r=>reserve=r)});
 await f.session.preload();f.events.get('loaded')();const p=f.session.showIfReady();
 f.leave();reserve(true);await p;assert.equal(f.stats().shows,0);
 const release=acquireFullscreenAd();assert.ok(release);release();
});
test('native show errors release audio and do not block home',async()=>{
 const f=fixture({failShow:true});await f.session.preload();f.events.get('loaded')();
 await f.session.showIfReady();assert.equal(f.stats().releases,1);assert.equal(f.events.size,0);
});
test('simultaneous rewarded/fullscreen owner prevents another ad',async()=>{
 const release=acquireFullscreenAd(),f=fixture();await f.session.preload();f.events.get('loaded')();
 await f.session.showIfReady();assert.equal(f.stats().shows,0);release();
});
test('storage or pause timeout skips and cannot show after resolving',async()=>{
 let reserve;const f=fixture({reserve:()=>new Promise(r=>reserve=r),timeoutMs:5});
 await f.session.preload();f.events.get('loaded')();await f.session.showIfReady();reserve(true);await tick();assert.equal(f.stats().shows,0);
});
test('quota denial skips without touching audio',async()=>{
 const f=fixture({reserve:false});await f.session.preload();f.events.get('loaded')();await f.session.showIfReady();assert.equal(f.stats().pauses,0);
});
test('cap is three per rolling day, with spacing and persistent encounter deduplication',()=>{
 const now=90_000_000;let h=reserveBattleAd([],'a',now);assert.equal(reserveBattleAd(h,'a',now+200_000),null);
 assert.equal(reserveBattleAd(h,'b',now+60_000),null);
 h=reserveBattleAd(h,'b',now+200_000);h=reserveBattleAd(h,'c',now+400_000);
 assert.equal(reserveBattleAd(h,'d',now+600_000),null);
 assert.equal(reserveBattleAd(h,'d',now+86_400_001).length,3);
});

test('screen cleanup during an SDK modal holds music and lock until native close',async()=>{
 const f=fixture();await f.session.preload();f.events.get('loaded')();let done=false;
 const p=f.session.showIfReady().then(()=>done=true);await tick();f.session.dispose();
 assert.equal(done,false);assert.equal(f.stats().releases,0);assert.equal(acquireFullscreenAd(),null);
 f.events.get('closed')();await p;assert.equal(f.stats().releases,1);
 const release=acquireFullscreenAd();assert.ok(release);release();
});
