import test from 'node:test';
import assert from 'node:assert/strict';
import {conditionDays,conditionValue,conditionSummary,conditionChange} from '../utils/conditionTrends.ts';
test('calendar spacing includes missing days and leap day without turning absence into zero',()=>{
 const source=[{date:'2024-02-28',mood:4},{date:'2024-03-01',mood:3,fatigue:2}];
 const days=conditionDays(source,'2024-03-01',3);
 assert.deepEqual(days.map(d=>d.date),['2024-02-28','2024-02-29','2024-03-01']);
 assert.equal(days[1].record,undefined);assert.equal(conditionValue(source[0],'fatigue'),null);
 assert.equal(conditionValue({mood:0},'mood'),null);assert.equal(conditionValue({worry:4},'worry'),null);
});
test('positive and concerning dimensions use each self-reported scale in the right direction',()=>{
 assert.deepEqual(conditionSummary({mood:4,fatigue:3,worry:1}),{good:['気分','心配ごと'],concern:['からだの疲れ']});
 assert.deepEqual(conditionSummary(undefined),{good:[],concern:[]});
 assert.deepEqual(conditionSummary({mood:3,fatigue:2,worry:2}),{good:[],concern:[]});
});
test('changes compare two recorded observations and never a missing day',()=>{
 const days=conditionDays([{date:'2026-10-29',mood:3,fatigue:1,worry:3},{date:'2026-11-01',mood:4,fatigue:3,worry:1}],'2026-11-01',7);
 assert.equal(conditionChange(days,'mood'),'前回より上向き');
 assert.equal(conditionChange(days,'fatigue'),'前回より強い');
 assert.equal(conditionChange(days,'worry'),'前回より少ない');
 assert.equal(conditionChange(conditionDays([],'2026-11-01',30),'worry'),'記録が増えると比べられます');
});
