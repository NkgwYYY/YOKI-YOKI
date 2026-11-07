import test from 'node:test';
import assert from 'node:assert/strict';
import {rewardAvailability} from '../utils/rewardAvailability.ts';
const ready = {native:true,loading:false,age:'30代',configured:true,enabled:true,ads:true,policy:'daily10',points:10,serviceReady:true};
test('new reward entry is available only after the server confirms the 10pt policy',()=>{
  assert.equal(rewardAvailability(ready),'ready');
  for(const patch of [{policy:undefined},{points:30},{points:100},{serviceReady:false},{ads:false},{enabled:false},{configured:false}]) {
    assert.equal(rewardAvailability({...ready,...patch}),'unavailable');
  }
});
test('web, loading, unknown age and underage explain why without presenting an ad',()=>{
  assert.equal(rewardAvailability({...ready,native:false}),'web');
  assert.equal(rewardAvailability({...ready,loading:true}),'loading');
  for(const age of [undefined,'','回答しない']) assert.equal(rewardAvailability({...ready,age}),'age-unknown');
  assert.equal(rewardAvailability({...ready,age:'10代'}),'age-ineligible');
});
