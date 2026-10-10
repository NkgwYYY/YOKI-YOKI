import test from 'node:test';
import assert from 'node:assert/strict';
import {parseChatReply,conversationPacing} from '../../api-server/src/lib/chatPolicy.ts';
import {normalizeStoredMessage} from '../utils/chatHistory.ts';
test('ordinary chat and unknown model metadata never acquire automatic medical links',()=>{
 for(const referenceTopic of ['none',undefined,'other']){const r=parseChatReply(JSON.stringify({content:'ラーメン、おいしかったんだね。',referenceTopic}));assert.deepEqual(r.citations,[]);assert.equal(r.sourcePolicyVersion,2);}
});
test('health explanation and urgent support select only the relevant allowlisted resource',()=>{
 const health=parseChatReply(JSON.stringify({content:'健康情報',referenceTopic:'self-care'}));assert.equal(health.citations.length,1);assert.match(health.citations[0].url,/stress\/self/);
 const urgent=parseChatReply(JSON.stringify({content:'相談先の案内',referenceTopic:'urgent-support'}));assert.equal(urgent.citations.length,1);assert.match(urgent.citations[0].url,/mamorouyokokoro/);
});
test('blank or malformed output cannot appear as JSON in the conversation',()=>{
 for(const text of ['', 'not json', 'null', '{}','{"content":"  "}'])assert.throws(()=>parseChatReply(text));
});
test('recent assistant questions trigger a pause without counting the user question',()=>{
 const question={role:'assistant',content:'今日はどうだった？'};
 assert.match(conversationPacing([question,{role:'user',content:'疲れた'}]),/すでに問いかけ/);
 assert.match(conversationPacing([{role:'user',content:'どうだった？'}]),/基本は相づち/);
 assert.match(conversationPacing([question,{role:'assistant',content:'おつかれさま。'},{role:'assistant',content:'そばにいるよ。'}]),/基本は相づち/);
});
test('selective source policy survives reload; legacy blanket references are not marked selective',()=>{
 const original={id:'a_1791514800000',role:'assistant',content:'会えてうれしいよ',citations:[{title:'参考',url:'https://www.mhlw.go.jp/'}]};
 assert.equal(normalizeStoredMessage(original).sourcePolicyVersion,undefined);
 assert.equal(normalizeStoredMessage({...original,sourcePolicyVersion:2}).sourcePolicyVersion,2);
});
