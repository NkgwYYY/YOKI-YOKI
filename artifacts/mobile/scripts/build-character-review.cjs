// The review uses precisely the production renderer, with no duplicate model.
const fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'utils/evolved3d.ts'),'utf8');
fs.writeFileSync(path.join(root,'public/character-3d/renderer.js'),ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.ES2020}}).outputText);
