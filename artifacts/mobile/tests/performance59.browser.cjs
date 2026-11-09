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
  const page=await browser.newPage({viewport:{width:800,height:400}});
  await page.setContent('<body style="margin:0;display:flex;background:#f4efe9"><canvas id="before" width="400" height="400"></canvas><canvas id="after" width="400" height="400"></canvas></body>');
  for(const [label,b] of [['before',before],['after',after]])await page.addScriptTag({content:'window.'+label+'Factory=(()=>{'+b.script+';return evolved.createEvolvedRenderer;})();'});
  const row=await page.evaluate(async({form,costume,coat})=>{
    const image=new Image();image.src=coat;await image.decode();
    const pose={rx:0,ry:0,rz:0,blink:0,smile:0,happy:false,sleepy:false,night:false,mouthOpen:0,chew:0,smoking:false,costume};
    const models=['before','after'].map(label=>{const c=document.getElementById(label),r=window[label+'Factory'](c,form,'portrait');r.setCoatTexture(image);return{c,r};});
    const timings=models.map(({r})=>{const start=performance.now();r.render(pose);const initialMs=performance.now()-start,times=[];for(let i=0;i<25;i++){const t=performance.now();r.render({...pose,blink:(i%3)*.3,smile:(i%5)/5});times.push(performance.now()-t);}return{initialMs,medianMs:times.sort((a,b)=>a-b)[12]};});
    // Read a separate surface: repeated getImageData on the production canvas
    // changes Chromium's raster backend and makes this test itself change the fur.
    const readback=document.createElement('canvas');readback.width=readback.height=400;
    const read=readback.getContext('2d',{willReadFrequently:true});
    const pixels=({c})=>{read.clearRect(0,0,400,400);read.drawImage(c,0,0);return read.getImageData(0,0,400,400).data;};
    const comparisons=[];
    for(const change of [{blink:.5,smile:.7},{ry:.8},{rx:1.7,ry:2.2,rz:.5},{ry:Math.PI},{night:true},{}]){
      for(const {r}of models)r.render({...pose,...change});
      const a=pixels(models[0]),b=pixels(models[1]);let diff=0,visible=0;for(let i=0;i<a.length;i++){diff+=Math.abs(a[i]-b[i]);if(i%4===3&&b[i]>0)visible++;}comparisons.push({mean:diff/a.length,visible});
    }
    return{form,costume,beforeMs:timings[0].medianMs,afterMs:timings[1].medianMs,initialMs:timings[1].initialMs,comparisons};
  },{form,costume,coat:after.coat});
  await page.screenshot({path:path.join(out,`${form}-${costume||'plain'}-comparison.png`)});await page.close();
  results.push(row);console.log(row);fs.writeFileSync(path.join(out,'comparison.json'),JSON.stringify(results,null,2));
  for(const c of row.comparisons){assert.ok(c.visible>10000,'character is painted');assert.ok(c.mean<1.2,`${form}/${costume}: pixel mean error ${c.mean}`);}
  if(form!=='odango'||costume)assert.ok(row.afterMs<row.beforeMs*.65,'expression rendering should remove expensive unchanged coat/costume work');
 }
 fs.writeFileSync(path.join(out,'comparison.json'),JSON.stringify(results,null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
