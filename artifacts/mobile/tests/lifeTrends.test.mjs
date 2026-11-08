import test from 'node:test';
import assert from 'node:assert/strict';
import {lifeValue,lifeLabel,activityValue,dayTypeValue,lifeSummary} from '../utils/lifeTrends.ts';
test('missing sleep and Moyamoya stay missing while real zero/no are plotted',()=>{
 for(const r of [undefined,{}, {sleep:0,sleepRecorded:false},{sleep:NaN},{sleep:13}])assert.equal(lifeValue(r,'sleep'),null);
 assert.equal(lifeValue({sleep:0,sleepRecorded:true},'sleep'),0);
 assert.equal(lifeLabel({sleep:0,sleepRecorded:true},'sleep'),'0時間');
 assert.equal(lifeValue({sleep:7.5},'sleep'),7.5);
 assert.equal(lifeValue({},'moyamoya'),null);
 assert.equal(lifeValue({moyamoya:{has:false}},'moyamoya'),0);
 assert.equal(lifeValue({moyamoya:{has:true}},'moyamoya'),1);
});
test('unanswered, explicitly none and selected activity values remain distinct',()=>{
 assert.equal(activityValue({},'外に出た'),null);
 assert.equal(activityValue({behaviors:[]},'外に出た'),null);
 assert.equal(activityValue({behaviors:[],behaviorsRecorded:true},'外に出た'),false);
 assert.equal(activityValue({behaviors:['外に出た']},'外に出た'),true);
 assert.equal(activityValue({behaviors:['外に出た']},'運動した'),false);
 assert.equal(activityValue({behaviors:['外に出た'],behaviorsRecorded:false},'外に出た'),null);
});
test('categorical days are not arbitrary numeric scores and invalid scales are excluded',()=>{
 assert.equal(dayTypeValue({},'work'),null);
 assert.equal(dayTypeValue({dayType:'invalid'},'work'),null);
 assert.equal(dayTypeValue({dayType:'rest'},'work'),false);
 assert.equal(dayTypeValue({dayType:'work'},'work'),true);
 for(const metric of ['exercise','meal','social'])for(const v of [0,4,NaN,1.5,undefined])assert.equal(lifeValue({[metric]:v},metric),null);
 assert.ok(lifeSummary({behaviorsRecorded:true,behaviors:[]}).includes('過ごし方：当てはまるものはない'));
});
