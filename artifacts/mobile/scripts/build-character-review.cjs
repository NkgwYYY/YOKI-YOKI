// The review uses precisely the production renderer, with no duplicate model.
const fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const root=path.resolve(__dirname,'..');
for(const [input,output] of [['evolved3d','renderer'],['softContact','softContact']]){
 const source=fs.readFileSync(path.join(root,`utils/${input}.ts`),'utf8');
 const code=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.ES2020}}).outputText.replace("'./softContact'","'./softContact.js?v=2'");
 fs.writeFileSync(path.join(root,`public/character-3d/${output}.js`),code);
}
