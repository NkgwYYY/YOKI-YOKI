import {PLAN_SCENARIOS} from './moyamoyaScenariosPlan.ts';
import {PERSONAL_SCENARIOS} from './moyamoyaScenariosPersonal.ts';
import type {PatternId} from './moyamoyaContent.ts';
import type {SourceId} from './moyamoyaSources.ts';
export const BATTLE_SCENARIOS = [...PLAN_SCENARIOS,...PERSONAL_SCENARIOS];
export const scenariosFor=(pattern:PatternId)=>BATTLE_SCENARIOS.filter(s=>s.pattern===pattern);
export const findBattleScenario=(pattern:PatternId,id?:string)=>BATTLE_SCENARIOS.find(s=>s.pattern===pattern&&s.id===id);
export const LEGACY_SOURCE_IDS:Record<PatternId,SourceId[]>={
  loop:['nhs-worry','nhs-thoughts'],future:['nhs-worry','nhs-problem'],busy:['nhs-tasks','nhs-problem'],
  people:['nhs-thoughts','mhlw-writing'],self:['nhs-thoughts','nhs-problem'],anger:['nhs-anger','mhlw-writing','ncnp-assertion'],
};
