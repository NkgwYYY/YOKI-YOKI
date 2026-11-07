import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const code=ts.transpileModule(fs.readFileSync(new URL('../utils/nativeResidentDocument.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const mod={exports:{}};
new Function('require','module','exports',code)(()=>({NATIVE_RESIDENT_SCRIPT:'const evolved={createEvolvedRenderer:__createRenderer};',NATIVE_ODANGO_COAT:'data:image/webp;base64,original'}),mod,mod.exports);
const pose={rx:.2,ry:.4,rz:.1,blink:0,smile:.8,happy:true,sleepy:false,night:true,mouthOpen:0,chew:0,smoking:false,costume:'cat'};
function fixture(form='odango',initial){
 const events=[],draws=[],images=[],listeners={},frames=new Map(),canvas={width:384,height:384};let creates=0,textureSets=0,frameId=0,clock=0;
 const context={__createRenderer:()=>{creates++;let textured=false;return{setCoatTexture:()=>{textured=true;textureSets++;},render:p=>draws.push({pose:JSON.parse(JSON.stringify(p)),textured,width:canvas.width}),dispose(){}};},
  window:{ReactNativeWebView:{postMessage:data=>events.push({type:JSON.parse(data).type,drawCount:draws.length})},addEventListener:(name,fn)=>{listeners[name]=fn;}},
  document:{getElementById:()=>canvas,hidden:false,addEventListener(){}},
  Image:class{constructor(){images.push(this);}},
  requestAnimationFrame:fn=>{frames.set(++frameId,fn);return frameId;},cancelAnimationFrame:id=>frames.delete(id)};
 vm.runInNewContext(mod.exports.nativeResidentDocument(form,initial).match(/<script>([\s\S]*)<\/script>/)[1],context);
 return{events,draws,images,send:(changes={})=>listeners.message({data:JSON.stringify({type:'pose',pose,active:false,reduceMotion:false,size:230,...changes})}),pump:()=>{for(let n=0;frames.size&&n<80;n++){const callbacks=[...frames.values()];frames.clear();clock+=16;callbacks.forEach(fn=>fn(clock));}},counts:()=>({creates,textureSets})};
}
test('startup reveals only a textured frame at the real pose and resolution, even when inactive',()=>{
 const f=fixture();assert.deepEqual(f.events,[{type:'loaded',drawCount:0}]);
 f.send();assert.equal(f.draws.length,0);assert.equal(f.events.length,1);
 f.images[0].onload();
 assert.deepEqual(f.draws,[{pose,textured:true,width:460}]);
 assert.deepEqual(f.events.at(-1),{type:'ready',drawCount:1});
});
test('fast image decode still waits for native pose, so a neutral placeholder is never revealed',()=>{
 const f=fixture();f.images[0].onload();assert.equal(f.draws.length,0);assert.equal(f.events.length,1);
 f.send();assert.equal(f.draws[0].pose.smile,.8);assert.equal(f.draws[0].pose.costume,'cat');assert.equal(f.events.at(-1).type,'ready');
});
test('expression interpolation reuses the renderer and the original coat',()=>{
 const f=fixture();f.send({pose:{...pose,smile:0,happy:false},active:true});f.images[0].onload();
 f.send({active:true});f.pump();
 assert.deepEqual(f.counts(),{creates:1,textureSets:1});
 assert.ok(f.draws.some(d=>d.pose.smile>0&&d.pose.smile<.8));assert.equal(f.draws.at(-1).pose.smile,.8);
 for(const d of f.draws){const {smile,happy,...body}=d.pose;const {smile:s,happy:h,...expected}=pose;assert.deepEqual(body,expected);assert.ok(d.textured);}
 assert.equal(f.events.filter(e=>e.type==='ready').length,1);
});
test('image failure never reveals an untextured frame or reports ready',()=>{
 const f=fixture();f.send();f.images[0].onerror();f.images[0].onload();
 assert.equal(f.draws.length,0);assert.equal(f.events.at(-1).type,'failed');assert.equal(f.events.filter(e=>e.type==='ready').length,0);
});
test('malformed poses do not reveal the renderer and non-furry stages still complete the handshake',()=>{
 const f=fixture('stage3');f.send({pose:{...pose,rx:null}});assert.equal(f.draws.length,0);
 f.send();assert.equal(f.events.at(-1).type,'ready');assert.equal(f.draws[0].width,460);
});

test('seeded native startup paints the real textured pose without waiting for a bridge reply',()=>{
 const initial={pose,active:false,reduceMotion:false,size:230};
 const f=fixture('odango',initial);
 assert.equal(f.draws.length,0,'original coat must still finish decoding');
 f.images[0].onload();
 assert.deepEqual(f.draws,[{pose,textured:true,width:460}]);
 assert.deepEqual(f.events.at(-1),{type:'ready',drawCount:1});
});
test('latest native pose replaces the seed before the first textured paint',()=>{
 const f=fixture('odango',{pose:{...pose,smile:0,costume:'dog'},active:false,reduceMotion:false,size:120});
 f.send();f.images[0].onload();
 assert.deepEqual(f.draws,[{pose,textured:true,width:460}]);
});
test('non-furry native startup also paints locally without the initial bridge reply',()=>{
 const f=fixture('stage3',{pose,active:false,reduceMotion:true,size:180});
 assert.equal(f.draws.length,1);assert.equal(f.draws[0].width,360);
 assert.deepEqual(f.draws[0].pose,pose);assert.equal(f.events.at(-1).type,'ready');
});

test('load-end confirmation can recover a readiness event without rebuilding the character',()=>{
 const f=fixture('odango',{pose,active:false,reduceMotion:false,size:230});
 f.images[0].onload();f.send({confirmReady:true});
 assert.equal(f.events.filter(e=>e.type==='ready').length,2);
 assert.deepEqual(f.counts(),{creates:1,textureSets:1});
 assert.deepEqual(f.draws.at(-1),{pose,textured:true,width:460});
});
