import fs from 'node:fs';
import ts from 'typescript';
import * as sky from '../utils/dailySky.ts';
const output={};new Function('require','exports',ts.transpileModule(fs.readFileSync(new URL('../utils/dailyFortune.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(name=>{if(name!=='./dailySky')throw Error(name);return sky;},output);
export const {makeDailyFortune,normalizeFortuneInput,prepareFortune,latestFortune,presentFortune}=output;
