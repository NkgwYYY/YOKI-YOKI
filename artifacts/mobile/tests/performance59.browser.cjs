'use strict';
// Render the released and candidate geometry with real Canvas/WebGL. No accounts or APIs.
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const {chromium}=require(process.env.YOKI_QA_PLAYWRIGHT||'playwright');
function bundle(file){const source=fs.readFileSync(file,'utf8');return {script:JSON.parse(source.match(/export const NATIVE_RESIDENT_SCRIPT=(.*);/)[1]),coat:JSON.parse(source.match(/export const NATIVE_ODANGO_COAT=(.*);/)[1])};}
const before=bundle(process.env.YOKI_BEFORE_BUNDLE),after=bundle(path.join(__dirname,'../utils/nativeResidentBundle.ts'));
const out=path.join(__dirname,'../native59-results/performance');fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'chromium',executablePath:process.env.YOKI_QA_BROWSER||undefined,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
 const results=[];
 for(const form of ['odango','stage3','stage4'])for(const costume of [null,'panda']){
  const samples=[];
  for(const [label,b] of [['before',before],['after',after]]){
   const page=await browser.newPage({viewport:{width:400,height:400}});
   await page.setContent('<body style="margin:0;background:#f4efe9"><canvas id="c" width="400" height="400" style="width:400px;height:400px"></canvas></body>');
   await page.addScriptTag({content:b.script+';window.rendererFactory=evolved.createEvolvedRenderer;'});
   const sample=await page.evaluate(async({form,costume,coat})=>{
    const c=document.getElementById('c'),r=window.rendererFactory(c,form,'portrait'),image=new Image();image.src=coat;await image.decode();r.setCoatTexture(image);
    const pose={rx:0,ry:0,rz:0,blink:0,smile:0,happy:false,sleepy:false,night:false,mouthOpen:0,chew:0,smoking:false,costume};
    const start=performance.now();r.render(pose);const initialMs=performance.now()-start;
    const times=[];for(let i=0;i<25;i++){const start=performance.now();r.render({...pose,blink:(i%3)*.3,smile:(i%5)/5});times.push(performance.now()-start);}
    const pixels=[];for(const change of [{blink:.5,smile:.7},{ry:.8},{rx:1.7,ry:2.2,rz:.5},{ry:Math.PI},{night:true},{}]){r.render({...pose,...change});pixels.push(Array.from(c.getContext('2d').getImageData(0,0,400,400).data));}
    window.__r=r;window.__pose=pose;
    return{initialMs,medianMs:times.sort((a,b)=>a-b)[Math.floor(times.length/2)],pixels,cache:c.dataset.bodyCache};
   },{form,costume,coat:b.coat});
   await page.screenshot({path:path.join(out,`${form}-${costume||'plain'}-${label}.png`)});
   samples.push(sample);await page.close();
  }
  let maxMean=0;for(let n=0;n<samples[0].pixels.length;n++){const a=samples[0].pixels[n],b=samples[1].pixels[n];let diff=0,visible=0;for(let i=0;i<a.length;i++){diff+=Math.abs(a[i]-b[i]);if(i%4===3&&b[i]>0)visible++;}assert.ok(visible>10000,'character is painted');const mean=diff/a.length;maxMean=Math.max(maxMean,mean);assert.ok(mean<1.2,`${form}/${costume}: pixel mean error ${mean}`);}
  const row={form,costume,beforeMs:samples[0].medianMs,afterMs:samples[1].medianMs,initialMs:samples[1].initialMs,maxPixelMeanError:maxMean};results.push(row);console.log(row);
  if(form!=='odango'||costume)assert.ok(row.afterMs<row.beforeMs*.65,'expression rendering should remove expensive unchanged coat/costume work');
 }
 fs.writeFileSync(path.join(out,'comparison.json'),JSON.stringify(results,null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
