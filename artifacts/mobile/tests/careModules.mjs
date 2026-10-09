import fs from 'node:fs';
import ts from 'typescript';
import * as smokingState from '../utils/smokingState.ts';
import * as hygiene from '../utils/hygiene.ts';
// Use the production modules with their real pure dependencies, as in the record tests.
function load(path,deps){const out={};const code=ts.transpileModule(fs.readFileSync(new URL(path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;new Function('require','exports',code)(name=>{if(!Object.hasOwn(deps,name))throw Error('Unexpected dependency '+name);return deps[name];},out);return out;}
export const happiness=load('../utils/happiness.ts',{'./smokingState':smokingState});
export const {HAPPY_REWARDS,grantHappiness,readHappiness,prepareHappiness}=happiness;
export const {prepareSmoking}=load('../utils/smoking.ts',{'./smokingState':smokingState,'./happiness':happiness,'./hygiene':hygiene});
