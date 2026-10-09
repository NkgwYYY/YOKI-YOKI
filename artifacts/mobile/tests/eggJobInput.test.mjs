import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import React from 'react';
import * as egg from '../utils/eggJob.ts';
const code=ts.transpileModule(fs.readFileSync(new URL('../app/egg-job.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.React,esModuleInterop:true}}).outputText;
function fixture(reduceMotion=false){
 const slots=[],effects=[],timers=new Map(),operations=[],animations=[];let cursor=0,time=100900,serial=0,resolveSave;
 const shift={id:'test-pot',startedAt:100000,targetMs:900,difficulty:'legend',recipe:'jammy'};
 let feed={points:70,eggJob:{active:shift,receipts:[]}};
 const hooks={...React,useRef:initial=>slots[cursor++]??=( {current:initial}),useState:initial=>{const i=cursor++;if(!(i in slots))slots[i]=initial;return[slots[i],v=>{slots[i]=v;}];},useEffect:(fn,deps)=>{const i=cursor++,prev=slots[i];if(!prev||deps.some((d,k)=>d!==prev.deps[k]))effects.push(()=>{prev?.cleanup?.();slots[i]={deps,cleanup:fn()};});}};
 const audio={enabled:false,start(){},finish(){},toggle(){}};
 const runEggJob=op=>{operations.push(op);return new Promise(resolve=>{resolveSave=()=>{const receipt={...op,...egg.eggGrade(op.finishedAt-shift.startedAt,shift.targetMs,shift.difficulty),elapsed:op.finishedAt-shift.startedAt,targetMs:shift.targetMs,difficulty:shift.difficulty};feed={points:70+receipt.earned,eggJob:{active:null,receipts:[receipt]}};resolve({receipt});};});};
 const exports={};
 new Function('require','exports','Date','setTimeout','clearTimeout','setInterval','clearInterval',code)(name=>{
  if(name==='react')return hooks;
  if(name==='react-native')return{Image:'Image',Platform:{OS:'web'},Pressable:'Pressable',ScrollView:'ScrollView',Text:'Text',View:'View',StyleSheet:{create:s=>s},useWindowDimensions:()=>({width:390,height:697})};
  if(name==='react-native-safe-area-context')return{useSafeAreaInsets:()=>({top:0,bottom:0})};
  if(name==='expo-router')return{useRouter:()=>({})};
  if(name==='expo-linear-gradient')return{LinearGradient:'Gradient'};
  if(name==='react-native-reanimated')return{default:{View:'AnimatedView'},__esModule:true,cancelAnimation(){},useAnimatedStyle:()=>({}),useSharedValue:v=>{const i=cursor++;return slots[i]??={value:v};},withTiming:(v,options)=>{animations.push({v,options});return v;},withDelay:(_delay,v)=>v,Easing:{linear:x=>x,cubic:x=>x,inOut:f=>f}};
  if(name==='react-native-svg')return{__esModule:true,default:'Svg',Defs:'Defs',Ellipse:'Ellipse',RadialGradient:'RadialGradient',Stop:'Stop'};
  if(name.endsWith('AppContext'))return{useApp:()=>({feedState:feed,runEggJob})};
  if(name.endsWith('useRoomActivity'))return{useRoomActivity:()=>({active:true,reduceMotion})};
  if(name.endsWith('useVillageBgm'))return{useVillageBgm:()=>audio};
  if(name.endsWith('useKitchenAudio'))return{useKitchenAudio:()=>audio};
  if(name.endsWith('eggJob'))return egg;
  if(name.endsWith('backToRoom'))return{backToRoom(){}};
  if(name.startsWith('@/assets/'))return name;
  return{[name.split('/').at(-1)]:name.split('/').at(-1)};
 },exports,{now:()=>time},(fn,delay)=>{timers.set(++serial,{fn,delay});return serial;},id=>timers.delete(id),()=>++serial,()=>{});
 function find(node,id){if(!React.isValidElement(node))return; if(node.props.testID===id)return node;return React.Children.toArray(node.props.children).map(c=>find(c,id)).find(Boolean);}
 const render=()=>{cursor=0;const tree=exports.default();while(effects.length)effects.shift()();return tree;};
 return{render,find,operations,animations,setTime:v=>{time=v;},save:async()=>{resolveSave();for(let i=0;i<5;i++)await Promise.resolve();},finishScoop:()=>{for(const [id,t]of timers)if(t.delay===1150){timers.delete(id);t.fn();}},cleanup:()=>slots.forEach(s=>s?.cleanup?.())};
}
test('touch-down captures the score before saving or scooping; release cannot start another order',async()=>{
 const f=fixture();const button=f.find(f.render(),'egg-job-action');
 button.props.onPressIn();
 assert.equal(f.operations.length,1);assert.equal(f.operations[0].finishedAt,100900);
 assert.ok(f.animations.some(a=>a.options.duration===1150));
 f.setTime(102500);await f.save();
 const during=f.find(f.render(),'egg-job-action');assert.equal(during.props.disabled,true);
 f.finishScoop();const ready=f.find(f.render(),'egg-job-action');assert.equal(ready.props.label,'次の注文を受ける');
 ready.props.onPress();assert.equal(f.operations.length,1);
 const pay=f.find(f.render(),'egg-job-pay');assert.equal(pay.props.children,'お給料 ＋180 pt');
 f.cleanup();
});
test('reduced motion reaches the lifted state without a cosmetic wait and keyboard activation still scores',async()=>{
 const f=fixture(true);f.find(f.render(),'egg-job-action').props.onPress();
 assert.equal(f.operations[0].finishedAt,100900);assert.ok(f.animations.some(a=>a.v===1&&a.options.duration===0));
 await f.save();const next=f.find(f.render(),'egg-job-action');assert.equal(next.props.disabled,false);assert.equal(next.props.label,'次の注文を受ける');f.cleanup();
});
