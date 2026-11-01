import test from 'node:test';
import assert from 'node:assert/strict';
import {createConversationStorage,chatHistoryKey,homeCommentCacheKey} from '../utils/conversationStorage.ts';
function memory(){const data=new Map();return {data,getItem:async k=>data.get(k)??null,setItem:async(k,v)=>{data.set(k,v);},removeItem:async k=>{data.delete(k);}};}
test('legacy ownerless history remains untouched and is never assigned to a newly opened account',async()=>{
 const storage=memory(),conversations=createConversationStorage(storage);
 const legacy='[{"role":"user","content":"private old conversation"}]';
 storage.data.set('@mentore/chat_history_v1',legacy);
 for(const owner of ['guest','alice','bob'])assert.equal(await conversations.read(owner),null);
 await conversations.write('bob','[{"role":"user","content":"new"}]');
 assert.equal(storage.data.get('@mentore/chat_history_v1'),legacy);
 assert.equal(await conversations.read('alice'),null);
});
test('guest and accounts keep their own histories across queued writes and reads',async()=>{
 const storage=memory(),conversations=createConversationStorage(storage);
 const alice=conversations.write('alice','first');
 const bob=conversations.write('bob','other');
 const guest=conversations.write('guest','guest only');
 const aliceSecond=conversations.write('alice','second');
 const read=conversations.read('alice');
 await Promise.all([alice,bob,guest,aliceSecond]);
 assert.equal(await read,'second');assert.equal(await conversations.read('bob'),'other');assert.equal(await conversations.read('guest'),'guest only');
 assert.notEqual(chatHistoryKey('a/b'),chatHistoryKey('a%2Fb'));
});
test('failed write is reported and retry never overwrites another owner',async()=>{
 const storage=memory(),conversations=createConversationStorage(storage);
 await conversations.write('alice','original');
 const set=storage.setItem;storage.setItem=async()=>{throw Error('unavailable');};
 await assert.rejects(conversations.write('alice','new'),/unavailable/);
 storage.setItem=set;assert.equal(await conversations.read('alice'),'original');
 await conversations.write('bob','bob');assert.equal(await conversations.read('alice'),'original');
});
test('account cleanup removes only that owner and attempts cache cleanup even if history removal fails',async()=>{
 const storage=memory(),conversations=createConversationStorage(storage);
 await conversations.write('alice','a');await conversations.write('bob','b');
 storage.data.set(homeCommentCacheKey('alice'),'a comment');storage.data.set(homeCommentCacheKey('bob'),'b comment');
 const remove=storage.removeItem;storage.removeItem=async k=>{if(k===chatHistoryKey('alice'))throw Error('disk error');return remove(k);};
 await assert.rejects(conversations.clearAll('alice'),/disk error/);
 assert.equal(storage.data.has(homeCommentCacheKey('alice')),false);assert.equal(await conversations.read('bob'),'b');
 assert.equal(storage.data.get(homeCommentCacheKey('bob')),'b comment');
 storage.removeItem=remove;await conversations.clearAll('alice');assert.equal(await conversations.read('alice'),null);
});
