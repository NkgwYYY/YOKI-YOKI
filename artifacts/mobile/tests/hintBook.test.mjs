import test from 'node:test';
import assert from 'node:assert/strict';
import {createHintBook, hintBookKey, parseHintBook} from '../utils/hintBook.ts';
import {applyConversationMode} from '../utils/conversationMode.ts';

function memory() {
  const values = new Map();
  return {values, getItem: async k => values.get(k) ?? null, setItem: async (k,v) => {values.set(k,v);}, removeItem: async k => {values.delete(k);}};
}
const hint = {id:'chat:a_1', title:'ひと呼吸', body:'いったん手を止めて、\n一つだけ確かめてみよう。', source:'conversation'};
test('saved words and timestamps stay unchanged when the same source is saved again', async () => {
  const storage=memory(), book=createHintBook(storage), now=new Date('2026-11-01T00:00:00Z');
  const original=await book.save('guest', hint, now);
  const again=await book.save('guest', {...hint,body:'replacement'}, new Date('2026-11-02T00:00:00Z'));
  assert.deepEqual(again,original); assert.equal((await book.read('guest')).length,1);
  assert.equal(original.body,hint.body); assert.equal(original.savedAt,now.toISOString());
});
test('simultaneous saves do not lose a card; a failed write remains retryable', async () => {
  const storage=memory(), book=createHintBook(storage);
  await Promise.all([book.save('user',hint),book.save('user',{...hint,id:'other'})]);
  assert.equal((await book.read('user')).length,2);
  const original=storage.setItem; storage.setItem=async()=>{throw Error('disk full');};
  await assert.rejects(book.save('user',{...hint,id:'third'}),/disk full/);
  storage.setItem=original;
  assert.equal((await book.read('user')).length,2);
  await book.save('user',{...hint,id:'third'}); assert.equal((await book.read('user')).length,3);
});
test('accounts and guest never read or clear each other’s hints',async()=>{
  const storage=memory(),book=createHintBook(storage);
  await book.save('guest',hint);await book.save('user/a',{...hint,id:'a'});await book.save('user%2Fa',{...hint,id:'b'});
  assert.equal((await book.read('user/a'))[0].id,'a'); assert.equal((await book.read('user%2Fa'))[0].id,'b');
  await book.clear('user/a');assert.deepEqual(await book.read('user/a'),[]);assert.equal((await book.read('guest')).length,1);
  assert.notEqual(hintBookKey('user/a'),hintBookKey('user%2Fa'));
});
test('unreadable storage is preserved, not overwritten by a new save',async()=>{
  for(const raw of ['{bad', '{}', '[{"id":"lost"}]']) {
    const storage=memory(),book=createHintBook(storage);storage.values.set(hintBookKey('guest'),raw);
    await assert.rejects(book.save('guest',hint),/読み込めません/);assert.equal(storage.values.get(hintBookKey('guest')),raw);
  }
  assert.deepEqual(parseHintBook(null),[]);
});
test('insight evidence and saved original survive removal of another hint',async()=>{
  const storage=memory(),book=createHintBook(storage);
  await book.save('guest',hint);
  await book.save('guest',{id:'insight:walking',title:'外に出た日',body:'記録から見つけた傾向',evidence:'30日間の記録。対象8日、比較8日。',source:'insight'});
  await book.remove('guest',hint.id);
  const result=await book.read('guest');assert.equal(result.length,1);assert.equal(result[0].evidence,'30日間の記録。対象8日、比較8日。');
});
test('saved advice preserves its original trusted reference links',async()=>{
  const book=createHintBook(memory());
  const citations=[{title:'参考情報',url:'https://www.mhlw.go.jp/kokoro/youth/stress/self/index.html'}];
  await book.save('guest',{...hint,citations}); citations[0].title='changed later';
  assert.equal((await book.read('guest'))[0].citations[0].title,'参考情報');
  await assert.rejects(book.save('guest',{...hint,id:'unsafe',citations:[{title:'bad',url:'javascript:alert(1)'}]}),/保存できません/);
});
test('conversation preference affects only outgoing last user turn, preserving history',()=>{
  const messages=[{role:'user',content:'昨日は疲れた',dateKey:'2026-10-31'},{role:'assistant',content:'おつかれさま。'},{role:'user',content:'今日は部活のことを話したい'}];
  const before=structuredClone(messages),listen=applyConversationMode(messages,'listen'),think=applyConversationMode(messages,'think');
  assert.deepEqual(messages,before);assert.deepEqual(listen[0],before[0]);assert.deepEqual(listen[1],before[1]);
  assert.match(listen[2].content,/今は聞いてほしい/);assert.match(think[2].content,/場面に合わせて/);
  assert.ok(listen[2].content.endsWith(before[2].content));assert.doesNotMatch(think[2].content,/上司|会社員/);
});
