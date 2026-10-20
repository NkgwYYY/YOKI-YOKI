import test from 'node:test';
import assert from 'node:assert/strict';
import {readDiaryInput,parseDiaryReply} from '../src/lib/diaryReplyPolicy.ts';
const input={text:'新人研修の司会が終わった。緊張したけど参加者が笑ってくれて嬉しかった。',mood:4,date:'2026-10-20',mascotName:'こころん'};
test('valid diary text is preserved and unrelated context is excluded',()=>{
 assert.deepEqual(readDiaryInput({...input,recentChat:'private',profile:'private',notes:'private'}),input);
 for(const patch of [{text:''},{text:'x'.repeat(1601)},{mood:6},{text:[]},{date:'unknown'},{mascotName:'x'.repeat(41)}])assert.equal(readDiaryInput({...input,...patch}),null);
});
test('provider replies must ground their evidence in the actual entry',()=>{
 const reply='研修の司会、緊張しながらもやりきったんだね。参加者が笑ってくれた瞬間は、肩の力が少し抜ける感じだったのかな。笑顔が返ってきたこと、ぼくも嬉しいな。';
 assert.equal(parseDiaryReply(JSON.stringify({evidence:'参加者が笑ってくれて',reply}),input.text),reply);
 for(const value of [{evidence:'上司に褒められた',reply},{evidence:'',reply},{evidence:'司会',reply:'ok'},{evidence:'司会',reply:'x'.repeat(701)},{evidence:'司会',reply:'リンクを開いてね https://example.com'}])assert.equal(parseDiaryReply(JSON.stringify(value),input.text),null);
 assert.equal(parseDiaryReply('not json',input.text),null);
});
