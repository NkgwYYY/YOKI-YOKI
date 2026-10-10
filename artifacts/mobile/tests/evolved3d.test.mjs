import test from 'node:test';
import assert from 'node:assert/strict';
import {createEvolvedRenderer,createEvolvedLeafMesh,evolvedRotation,evolvedGroundOffset,EVOLVED_CAMERA_SCALE} from '../utils/evolved3d.ts';
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
