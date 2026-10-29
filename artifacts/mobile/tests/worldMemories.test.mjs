import test from 'node:test';
import assert from 'node:assert/strict';
import {memoryDate,recentWorldMemories} from '../utils/worldMemories.ts';
test('book selects recent saved moments without changing records or inventing visits',()=>{
  const records=[
    {date:'2026-10-01',mood:3,notes:'',behaviors:[]},
    {date:'2026-10-05',mood:4,notes:'ゆっくりお茶を飲んだ',win:'朝の散歩',behaviors:[]},
    {date:'2026-10-03',mood:2,notes:'',behaviors:['休んだ']},
    {date:'2026-10-04',mood:3,notes:'本を読んだ',behaviors:[]},
  ];
  const original=JSON.stringify(records);
  assert.deepEqual(recentWorldMemories(records),[
    {date:'2026-10-05',caption:'朝の散歩'},
    {date:'2026-10-04',caption:'本を読んだ'},
    {date:'2026-10-03',caption:'休んだ'},
  ]);
  assert.equal(JSON.stringify(records),original);
  assert.deepEqual(recentWorldMemories([]),[]);
});
test('one page per recorded day; mood-only entries remain meaningful',()=>{
  const r={date:'2026-10-05',mood:3,notes:'',behaviors:[]};
  assert.deepEqual(recentWorldMemories([r,r,{...r,date:'bad'}]),[{date:r.date,caption:'「ふつう」の気持ちを残した日'}]);
  assert.equal(memoryDate(r.date),'10月5日');assert.equal(memoryDate('bad'),'');
});
