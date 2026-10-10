import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import * as contact from '../utils/softContact.ts';
const code=ts.transpileModule(fs.readFileSync(new URL('../utils/evolved3d.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
const model={exports:{}};new Function('require','module','exports',code)(name=>{assert.equal(name,'./softContact');return contact;},model,model.exports);
const {createEvolvedRenderer,createEvolvedLeafMesh,evolvedRotation,evolvedGroundOffset,evolvedBodySupport,EVOLVED_SHAPES,EVOLVED_CAMERA_SCALE}=model.exports;
const forms=['odango','stage3','stage4'];
const pose={rx:0,ry:0,rz:0,blink:0,happy:false,sleepy:false,night:false,mouthOpen:0,chew:0,smoking:false};
// A recording Canvas checks the actual production projection without a browser.
class Path {moveTo(){}quadraticCurveTo(){}}
globalThis.Path2D=Path;
function canvas(){
 const calls=[],gradient={addColorStop(){}};
 const context=new Proxy({}, {get:(_t,key)=> (...args)=>{if(['createRadialGradient'].includes(key))return gradient;if(['ellipse','arc','moveTo','lineTo','translate','scale','bezierCurveTo'].includes(key)){assert.ok(args.filter(a=>typeof a==='number').every(Number.isFinite));calls.push([key,...args]);}},set:()=>true});
 return {width:320,height:320,dataset:{},calls,getContext:()=>context};
}
test('all three production coats rotate without non-finite coordinates, with eyes hidden at the rear',()=>{
 for(const form of forms){
  const c=canvas(),renderer=createEvolvedRenderer(c,form);
  renderer.render(pose);assert.ok(c.calls.filter(x=>x[0]==='arc').length===2,'two original eye glints in front');
  c.calls.length=0;renderer.render({...pose,ry:Math.PI});assert.equal(c.calls.filter(x=>x[0]==='arc').length,0,'no face painted on the back');
  for(const [rx,ry,rz] of [[.6,.7,0],[Math.PI,0,0],[1.57,2.1,-.7],[0,0,Math.PI]])renderer.render({...pose,rx,ry,rz});
  renderer.render({...pose,blink:1});renderer.render({...pose,mouthOpen:.8,chew:.7,smoking:true,night:true});
  const count=c.calls.length;renderer.dispose();renderer.render(pose);assert.equal(c.calls.length,count,'disposed model cannot keep drawing');
 }
});
test('leaves remain inside the camera and above the floor through complete turns',()=>{
 for(const form of forms){
  const mesh=createEvolvedLeafMesh(form);assert.equal(mesh.length>0,form!=='odango');
  for(let a=0;a<Math.PI*2;a+=.12){
   const m=evolvedRotation(a,a*.73,a*.21),origin=evolvedGroundOffset(form,m);
   for(let i=0;i<mesh.length;i+=14){
    const x=50+(m[0]*mesh[i]+m[3]*mesh[i+1]+m[6]*mesh[i+2])*EVOLVED_CAMERA_SCALE;
    const y=origin+(m[1]*mesh[i]+m[4]*mesh[i+1]+m[7]*mesh[i+2])*EVOLVED_CAMERA_SCALE;
    assert.ok(x>=0&&x<=100,`${form} leaf clipped sideways ${x}`);
    assert.ok(y>=0&&y<=93,`${form} leaf clipped vertically ${y}`);
   }
  }
 }
});
test('soft contact keeps a modest level footprint, with smooth shoulders and an unchanged crown',()=>{
 const {softContactHeight:height,softContactSpread:spread}=contact;
 for(const form of forms){
  const r=EVOLVED_SHAPES[form].radius;
  for(let yaw=0;yaw<Math.PI*2;yaw+=.2){
   const m=evolvedRotation(0,yaw,0),support=evolvedBodySupport(form,m),origin=evolvedGroundOffset(form,m);
   const floor=height(support,support);let count=0,left=Infinity,right=-Infinity,lastY=-Infinity;
   assert.ok(floor>support*.85&&floor<support*.96,'only modest compression at the base');
   for(let i=0;i<=200;i++){
    const y=-support+2*support*i/200,compressed=height(y,support);
    assert.ok(compressed>=lastY-1e-10,'compression must not fold the surface');lastY=compressed;
    assert.ok(compressed<=floor+1e-10,'nothing penetrates the contact plane');
    if(y<=0)assert.equal(compressed,y,'round upper half retains its shape');
    if(y>support*.6)assert.ok(spread(y,support)>1,'lower sides spread with the weight');
   }
   for(let i=0;i<=360;i++){
    const a=i*Math.PI/180,x=r[0]*Math.cos(a),y=support*Math.sin(a),sy=height(y,support);
    if(Math.abs(sy-floor)<1e-8){count++;left=Math.min(left,x*spread(y,support));right=Math.max(right,x*spread(y,support));}
   }
   assert.ok(count>20&&right-left>r[0]*.6&&right-left<r[0],'a small contact area retains a rounded body');
   assert.ok(Math.abs(origin+floor*EVOLVED_CAMERA_SCALE-90.3)<1e-8,'soft base remains on the floor');
   for(const seam of [.82,.94]){
    const y=support*seam,e=.0001,dl=(height(y,support)-height(y-e,support))/e,dr=(height(y+e,support)-height(y,support))/e;
    assert.ok(Math.abs(dl-dr)<.001,'no sharp crease at either end of the soft shoulder');
   }
  }
 }
});
