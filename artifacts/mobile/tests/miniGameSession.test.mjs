import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import ts from 'typescript';
import React from 'react';

const code=ts.transpileModule(fs.readFileSync(new URL('../components/MiniGameModal.tsx',import.meta.url),'utf8'),{
 compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.React,esModuleInterop:true},
}).outputText;
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
function fixture(){
 const slots=[],effects=[],holds=[];let cursor=0,writes=0;
 const holdLightFlow=value=>holds.push(value);
 const hooks={...React,useRef:initial=>{const i=cursor++;return slots[i]??=( {current:initial});},useState:initial=>{
  const i=cursor++;if(!(i in slots))slots[i]=initial;return [slots[i],value=>{writes++;slots[i]=typeof value==='function'?value(slots[i]):value;}];
 },useEffect:(fn,deps)=>{const i=cursor++,prev=slots[i];if(!prev||deps.some((d,k)=>d!==prev.deps[k]))effects.push(()=>{prev?.cleanup?.();slots[i]={deps,cleanup:fn()};});}};
 const exports={};new Function('require','exports',code)(name=>{
  if(name==='react')return hooks;
  if(name==='react-native')return {Modal:'Modal',Pressable:'Pressable',Text:'Text',View:'View',StyleSheet:{create:v=>v}};
  if(name==='react-native-safe-area-context')return {useSafeAreaInsets:()=>({top:0,bottom:0})};
  if(name.endsWith('/RhythmGameFlow'))return {RhythmGameFlow:'RhythmGameFlow'};
  if(name.endsWith('/Icon'))return {Icon:'Icon'};
  if(name.endsWith('/AppContext'))return {useApp:()=>({holdLightFlow})};
  if(name.endsWith('/analytics'))return {Analytics:{miniGameStarted(){},miniGameCompleted(){}}};
  if(name.endsWith('/useReducedMotion'))return {useReducedMotion:()=>true};
  if(name.endsWith('/types'))return {starRating:()=>4};
  throw Error(name);
 },exports);
 const pending=[];const onReward=(reward,id)=>{const task=deferred();pending.push({...task,reward,id});return task.promise;};
 const render=(visible=true)=>{cursor=0;const tree=exports.MiniGameModal({visible,slot:'morning',onClose(){},onReward});while(effects.length)effects.shift()();return tree;};
 const find=(node,type)=>{if(!React.isValidElement(node))return null;if(node.type===type)return node;for(const child of React.Children.toArray(node.props.children)){const result=find(child,type);if(result)return result;}return null;};
 return {render,pending,holds,flow:()=>find(render(),'RhythmGameFlow'),writes:()=>writes,unmount:()=>slots.forEach(s=>s?.cleanup?.())};
}
for(const fail of [false,true])test(`late ${fail?'failure':'success'} cannot change a reopened game's pending result`,async()=>{
 const f=fixture();f.render();const old=f.flow().props.onResult({score:10});
 f.render(false);f.render();const current=f.flow().props.onResult({score:20});
 assert.equal(f.pending.length,2);assert.notEqual(f.pending[0].id,f.pending[1].id);
 const before=f.writes();if(fail)f.pending[0].reject(Error('late'));else f.pending[0].resolve(3);await old;
 assert.equal(f.writes(),before);assert.equal(f.flow().props.earnedPoints,null);
 f.pending[1].resolve(2);await current;assert.equal(f.flow().props.earnedPoints,2);
 f.unmount();assert.deepEqual(f.holds,[true,false,true,false]);
});
test('unmount suppresses late reward UI updates without cancelling the persistence promise',async()=>{
 const f=fixture();f.render();const result=f.flow().props.onResult({score:1});f.unmount();const before=f.writes();
 f.pending[0].resolve(3);await result;assert.equal(f.writes(),before);assert.deepEqual(f.holds,[true,false]);
});
