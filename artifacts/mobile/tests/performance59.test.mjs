import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../utils/nativeResidentBundle.ts',import.meta.url),'utf8');
const script=JSON.parse(source.match(/export const NATIVE_RESIDENT_SCRIPT=(.*);/)[1]);
const pose={rx:0,ry:0,rz:0,blink:0,smile:0,happy:false,sleepy:false,night:false,mouthOpen:0,chew:0,smoking:false};
function fixture(){
 const counts={gradients:0,copies:0},layers=[];
 const gradient={addColorStop(){}};
 function canvas(){const c={width:400,height:400,dataset:{}};const ctx=new Proxy({canvas:c},{get:(t,k)=>k in t?t[k]:k==='createRadialGradient'?()=>{counts.gradients++;return gradient}:k==='drawImage'?()=>counts.copies++:()=>{},set:(t,k,v)=>(t[k]=v,true)});c.getContext=type=>type==='2d'?ctx:null;return c;}
 const context={document:{createElement:()=>{const c=canvas();layers.push(c);return c;}},performance,Path2D:class{moveTo(){}lineTo(){}closePath(){}quadraticCurveTo(){}},console};
 vm.runInNewContext(script+';this.factory=evolved.createEvolvedRenderer',context);
 return{counts,layers,canvas,factory:context.factory};
}
test('exact coat cache avoids rebuilds on expression changes and invalidates for view, lighting and size',()=>{
 const f=fixture(),c=f.canvas(),r=f.factory(c,'stage4','portrait');r.render(pose);const first=f.counts.gradients;
 r.render({...pose,blink:.5,smile:.7,mouthOpen:.4});assert.equal(c.dataset.bodyCache,'hit');assert.ok(f.counts.gradients-first<20,'only face gradients are redrawn');
 for(const change of [{ry:.7},{night:true}]){r.render({...pose,...change});assert.equal(c.dataset.bodyCache,'miss');}
 c.width=500;r.render(pose);assert.equal(c.dataset.bodyCache,'miss');r.render(pose);assert.equal(c.dataset.bodyCache,'hit');
 r.dispose();assert.ok(f.layers.every(c=>c.width===0&&c.height===0),'cached rasters released on unmount');
});
