import test from 'node:test';
import assert from 'node:assert/strict';
import {createAccountCache,ACCOUNT_OWNER_KEY,ACCOUNT_SWITCH_KEY} from '../utils/accountCache.ts';
import {needsNativeEntry} from '../utils/entryRoute.ts';
const keys=['profile','diary','progress'];
function fixture(initial={}){
 const data=new Map(Object.entries(initial));let failKey=null;
 const storage={getItem:async k=>data.get(k)??null,setItem:async(k,v)=>{if(k===failKey){failKey=null;throw Error('disk interrupted');}data.set(k,v);},removeItem:async k=>{data.delete(k);}};
 return {data,storage,cache:createAccountCache(storage,keys),fail:k=>{failKey=k;}};
}
test('native first launch offers registration/login, while saved sessions and existing guests skip it',()=>{
 assert.equal(needsNativeEntry(true,true,false,false,null),true);
 assert.equal(needsNativeEntry(true,true,true,true,'account'),false);
 assert.equal(needsNativeEntry(true,true,true,false,'account'),false);
 assert.equal(needsNativeEntry(true,true,false,true,null),false);
 assert.equal(needsNativeEntry(true,true,false,false,'guest'),false);
 assert.equal(needsNativeEntry(true,true,false,true,'account'),true);
 assert.equal(needsNativeEntry(false,true,false,false,null),false);
});
test('web account data replaces the active cache and guest records remain recoverable',async()=>{
 const f=fixture({profile:'guest',diary:'local diary'});
 await f.cache.replace('alice',{profile:'web Alice',progress:{level:4},unrelated:'ignored'});
 assert.equal(f.data.get('profile'),'web Alice');assert.equal(f.data.has('diary'),false);
 assert.equal(f.data.get('progress'),'{"level":4}');assert.equal(f.data.has('unrelated'),false);
 await f.cache.switchOwner('guest');
 assert.equal(f.data.get('profile'),'guest');assert.equal(f.data.get('diary'),'local diary');assert.equal(f.data.has('progress'),false);
});
test('switching accounts never merges the previous account or leaks its missing fields',async()=>{
 const f=fixture();await f.cache.replace('alice',{profile:'Alice',diary:'Alice diary'});
 await f.cache.replace('bob',{profile:'Bob'});
 assert.equal(await f.cache.owner(),'bob');assert.equal(f.data.has('diary'),false);
 await f.cache.switchOwner('alice');assert.equal(f.data.get('diary'),'Alice diary');
});
test('an interrupted cache replacement recovers the complete target before it can be read',async()=>{
 const f=fixture({profile:'old',diary:'old diary'});f.fail('diary');
 await assert.rejects(f.cache.replace('alice',{profile:'Alice',diary:'new diary'}));
 assert.ok(f.data.has(ACCOUNT_SWITCH_KEY));
 const restarted=createAccountCache(f.storage,keys);await restarted.recover();
 assert.equal(f.data.get('profile'),'Alice');assert.equal(f.data.get('diary'),'new diary');
 assert.equal(f.data.get(ACCOUNT_OWNER_KEY),'alice');assert.equal(f.data.has(ACCOUNT_SWITCH_KEY),false);
 await restarted.switchOwner('guest');assert.equal(f.data.get('diary'),'old diary');
});
test('deleting one account removes its backup and preserves the guest and other account',async()=>{
 const f=fixture({diary:'guest'});await f.cache.replace('alice',{diary:'Alice'});await f.cache.replace('bob',{diary:'Bob'});
 await f.cache.removeOwner('bob');assert.equal(f.data.get('diary'),'guest');
 await f.cache.switchOwner('alice');assert.equal(f.data.get('diary'),'Alice');
 await f.cache.switchOwner('bob');assert.equal(f.data.has('diary'),false);
});
