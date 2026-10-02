import assert from 'node:assert/strict';
import test from 'node:test';
import { readInsights } from '../utils/insightData.ts';
test('insights accept text and copy only presentation fields',()=>{
  const source=[{title:'小さな一歩',body:'記録を残しました。',extra:'ignored'}];
  assert.deepEqual(readInsights(source),[{title:source[0].title,body:source[0].body}]);
  assert.notEqual(readInsights(source)[0],source[0]);
});
test('malformed API or cache insight collections cannot reach rendering',()=>{
  for(const value of [null,undefined,{},'text',[],{length:1},[null],[{}],[{title:[],body:'ok'}],[{title:'ok',body:{}}],[{title:' ',body:'ok'}],[{title:'ok',body:''}],[{title:'ok',body:'ok'},null]])assert.equal(readInsights(value),null);
});
