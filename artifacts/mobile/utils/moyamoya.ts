import {ACTIONS, BATTLES, getPattern, type PatternId} from './moyamoyaContent.ts';
import type {DailyRecord, FeedState} from '../contexts/AppContext';
import type {StorageEntry} from './recoverableStorage';
import {findBattleScenario,scenariosFor,LEGACY_SOURCE_IDS} from './moyamoyaScenarios.ts';

export type MoyamoyaInput = {has: boolean; pattern?: PatternId; memo?: string};
export type BattleTurn = {actionId:string; title:string; feedback:string; good:boolean};
export type Encounter = {id:string; pattern:PatternId; status:'invited'|'active'|'declined'|'won'|'lost'; heroHp:number; enemyHp:number; turns:BattleTurn[]; awarded:number; scenarioId?:string; scenarioIndex?:number};
export type MoyamoyaRecord = MoyamoyaInput & {battle?:Encounter; participated?:boolean; rewardClaimed?:boolean; cleared?:PatternId[]; scenarioHistory?:Partial<Record<PatternId,number>>};
export type BattleOperation = {kind:'start'|'decline'|'retry';id:string} | {kind:'turn';id:string;expectedTurn:number;actionId:string};
export const MOYAMOYA_REWARD = 10;
const RECORDS='@mentore/records_v2', FEED='@mentore/feed_state_v1';
const newEncounter=(pattern:PatternId,id:string,scenarioIndex:number):Encounter=>({id,pattern,status:'invited',heroHp:2,enemyHp:2,turns:[],awarded:0,scenarioIndex,scenarioId:scenariosFor(pattern)[scenarioIndex%scenariosFor(pattern).length].id});

/** A per-pattern sequence survives check-in edits, retries and moves to another day. */
function nextScenarioIndex(pattern:PatternId,history:(MoyamoyaRecord|undefined)[]) {
  let latest=-1;
  for(const item of history){
    const indices=[item?.scenarioHistory?.[pattern],item?.battle?.pattern===pattern?item.battle.scenarioIndex:undefined];
    for(const index of indices)if(typeof index==='number'&&Number.isSafeInteger(index)&&index>=0)latest=Math.max(latest,index);
  }
  return latest+1;
}
export const battleScenario=(e:Encounter)=>findBattleScenario(e.pattern,e.scenarioId);
export const battleScene=(e:Encounter)=>(battleScenario(e)?.scenes??BATTLES[e.pattern].scenes)[e.enemyHp<2?1:0];
export const battleSourceIds=(e:Encounter)=>battleScenario(e)?.sourceIds??LEGACY_SOURCE_IDS[e.pattern];
function choiceSeed(id:string){let seed=0;for(const char of id)seed=(Math.imul(seed,31)+char.charCodeAt(0))>>>0;return seed;}


/** Updating a check-in preserves daily reward/stamp receipts and an unfinished battle. */
export function recordMoyamoya(previous:MoyamoyaRecord|undefined,input:MoyamoyaInput,id:string,history:(MoyamoyaRecord|undefined)[]=[]):MoyamoyaRecord {
  if(typeof input.has!=='boolean'||(input.has&&!getPattern(input.pattern)))throw Error('モヤモヤの「ある・なし」と、近い種類を選んでね。');
  const memo=String(input.memo??'').trim().slice(0,160);
  const same=previous?.has&&previous.pattern===input.pattern&&previous.memo===memo;
  const keep=same&&previous.battle&&['invited','active'].includes(previous.battle.status);
  const index=input.has&&!keep?nextScenarioIndex(input.pattern!,[...history,previous]):undefined;
  return {...previous,has:input.has,pattern:input.has?input.pattern:undefined,memo:input.has?memo:'',
    ...(index!==undefined?{scenarioHistory:{...previous?.scenarioHistory,[input.pattern!]:index}}:{}),
    battle:input.has?(keep?previous.battle:newEncounter(input.pattern!,id,index!)):undefined};
}

export function battleChoices(e:Encounter) {
  const pattern=getPattern(e.pattern); if(!pattern)return [];
  const used=new Set(e.turns.map(t=>t.actionId));
  const scenario=battleScenario(e);
  if(scenario){
    const choices=scenario.choices.filter(c=>!used.has(c.id));
    const offset=(choiceSeed(e.id)+e.turns.length)%Math.max(1,choices.length);
    return [...choices.slice(offset),...choices.slice(0,offset)];
  }
  // Encounters saved before scenario IDs existed keep their original action IDs.

  const good=pattern.actions.filter(id=>!used.has(id)).slice(0,2).map(id=>({id,...ACTIONS[pattern.id][id],good:true}));
  const poor=BATTLES[pattern.id].bad.filter(a=>!used.has(a.id));
  const all=[good[0],poor[0],poor[1],good[1]].filter((v):v is NonNullable<typeof v>=>!!v);
  const offset=e.turns.length%Math.max(1,all.length);
  return [...all.slice(offset),...all.slice(0,offset)];
}

/** Same recoverable transaction as food/purchases: battle and points commit together. */
export function prepareMoyamoya(values:Record<string,string|null>,operation:BattleOperation,date:string,defaultFeed:FeedState,newId:string) {
  const records:DailyRecord[]=JSON.parse(values[RECORDS]??'[]');
  const feed:FeedState=JSON.parse(values[FEED]??JSON.stringify(defaultFeed));
  if(!Array.isArray(records)||!feed||!Number.isFinite(feed.points)||feed.points<0)throw Error('保存済みのデータを確認できません');
  const record=records.find(r=>r.date===date&&r.moyamoya?.battle?.id===operation.id);
  const m=record?.moyamoya, e=m?.battle;
  if(!m?.has||!e||!getPattern(e.pattern))throw Error('今日のバトルを開き直してください。');
  if(![0,1,2].includes(e.heroHp)||![0,1,2].includes(e.enemyHp)||!Array.isArray(e.turns))throw Error('バトルの記録を確認できません');
  let turn:BattleTurn|undefined,awarded=0;
  if(operation.kind==='start'&&e.status==='invited') e.status='active';
  if(operation.kind==='decline'&&['invited','active'].includes(e.status))e.status='declined';
  if(operation.kind==='retry'&&e.status==='lost'){
    const index=nextScenarioIndex(e.pattern,records.map(r=>r.moyamoya));
    m.scenarioHistory={...m.scenarioHistory,[e.pattern]:index};
    m.battle={...newEncounter(e.pattern,newId,index),status:'active'};
  }
  if(operation.kind==='turn'&&e.status==='active'&&operation.expectedTurn===e.turns.length){
    const choice=battleChoices(e).find(c=>c.id===operation.actionId);
    if(!choice)throw Error('表示されている対処法から選んでね。');
    turn={actionId:choice.id,title:choice.title,feedback:choice.feedback,good:choice.good};
    e.turns.push(turn);m.participated=true;
    if(choice.good)e.enemyHp--;else e.heroHp--;
    if(e.enemyHp===0){
      e.status='won';
      m.cleared=[...new Set([...(m.cleared??[]),e.pattern])];
      // All records on this date count, including merged histories with different IDs.
      if(!records.some(r=>r.date===date&&r.moyamoya?.rewardClaimed)){
        m.rewardClaimed=true;awarded=MOYAMOYA_REWARD;feed.points+=awarded;
      }
      e.awarded=awarded;
    }else if(e.heroHp===0)e.status='lost';
  }
  const entries:StorageEntry[]=[[RECORDS,JSON.stringify(records)],[FEED,JSON.stringify(feed)]];
  return {entries:entries.filter(([key,value])=>values[key]!==value),result:{records,feed,encounter:m.battle!,turn,awarded,
    stampDays:new Set(records.filter(r=>r.moyamoya?.participated).map(r=>r.date)).size}};
}
