import assert from 'node:assert/strict';
import test from 'node:test';
import { guestInsights, insightCacheKey, readInsights } from '../utils/insightData.ts';
test('insights accept text and copy only presentation fields',()=>{
  const source=[{title:'小さな一歩',body:'記録を残しました。',extra:'ignored'}];
  assert.deepEqual(readInsights(source),[{title:source[0].title,body:source[0].body}]);
  assert.notEqual(readInsights(source)[0],source[0]);
});
test('malformed API or cache insight collections cannot reach rendering',()=>{
  for(const value of [null,undefined,{},'text',[],{length:1},[null],[{}],[{title:[],body:'ok'}],[{title:'ok',body:{}}],[{title:' ',body:'ok'}],[{title:'ok',body:''}],[{title:'ok',body:'ok'},null]])assert.equal(readInsights(value),null);
});
test('guest reflection counts recording days without inventing health conclusions', () => {
  const result = guestInsights({dates:['2026-10-20','2026-10-20','2026-10-19'],checkedToday:2,streak:0,badges:1});
  assert.deepEqual(result.map(item => item.title),['2日分の記録を残したね','今日のチェックは2個','1個のバッジが集まったね']);
  assert.ok(readInsights(result));
  assert.deepEqual(guestInsights({dates:[],checkedToday:0,streak:99,badges:0}),[]);
});
test('guest reflection avoids invalid counts and the AI cache is isolated by owner', () => {
  const result=guestInsights({dates:['2026-10-20'],checkedToday:NaN,streak:Infinity,badges:-1});
  assert.equal(result.length,1);
  assert.notEqual(insightCacheKey('first'),insightCacheKey('second'));
  assert.notEqual(insightCacheKey('a/b'),insightCacheKey('a%2Fb'));
});
