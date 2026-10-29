/* Isolated production-renderer regression test. Run with YOKI_QA_PLAYWRIGHT,
 * YOKI_QA_BROWSER and YOKI_QA_OUTPUT; no account, network API or saved game. */
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),ts=require('typescript');
const {chromium}=require(process.env.YOKI_QA_PLAYWRIGHT||'playwright');
const out=process.env.YOKI_QA_OUTPUT;fs.mkdirSync(out,{recursive:true});
const modules={};for(const name of ['softContact','odangoFur','evolved3d'])modules['./'+name]=ts.transpileModule(fs.readFileSync(path.join(__dirname,'../utils',name+'.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const html=`<!doctype html><style>body{margin:0;background:#6b426e;display:grid;place-items:center;height:100vh}canvas{width:192px;height:192px}</style><canvas id="resident" width="384" height="384"></canvas><script>
window.qa={draws:0,uploads:0,contexts:[]};
const originalGet=HTMLCanvasElement.prototype.getContext,draw=WebGLRenderingContext.prototype.drawArrays,upload=WebGLRenderingContext.prototype.bufferData;
HTMLCanvasElement.prototype.getContext=function(type,...args){if(type==='webgl'&&location.search==='?fallback')return null;const context=originalGet.call(this,type,...args);if(type==='webgl'&&context&&!qa.contexts.includes(context))qa.contexts.push(context);return context;};
WebGLRenderingContext.prototype.drawArrays=function(...args){qa.draws++;return draw.apply(this,args)};WebGLRenderingContext.prototype.bufferData=function(...args){qa.uploads++;return upload.apply(this,args)};
const modules=${JSON.stringify(modules)},cache={};function require(name){if(cache[name])return cache[name].exports;const m={exports:{}};cache[name]=m;new Function('require','module','exports',modules[name])(require,m,m.exports);return m.exports;}
window.pose={rx:0,ry:0,rz:0,blink:0,happy:false,sleepy:false,night:false,mouthOpen:0,chew:0,smoking:false};window.model=require('./evolved3d');window.canvas=document.querySelector('canvas');window.renderer=model.createEvolvedRenderer(canvas,'odango');window.coat=new Image;coat.onload=()=>{renderer.setCoatTexture(coat);renderer.render(pose);window.ready=true};coat.src='/coat.webp';
</script>`;
const server=http.createServer((req,res)=>{if(req.url==='/coat.webp'){res.setHeader('Content-Type','image/webp');fs.createReadStream(path.join(__dirname,'../assets/images/characters/bone/odango/body.webp')).pipe(res);}else{res.setHeader('Content-Type','text/html');res.end(html);}});
let browser;
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({headless:true,executablePath:process.env.YOKI_QA_BROWSER,args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:390,height:460},deviceScaleFactor:2}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base);await page.waitForFunction(()=>window.ready);
 assert.equal(await page.locator('canvas').getAttribute('data-coat-backend'),'gpu-dense-fur','GPU shader must actually compile and render');
 const reuse=await page.evaluate(()=>{
  const before=qa.draws;renderer.render({...pose,blink:1,mouthOpen:.8});const afterFace=qa.draws;
  renderer.render({...pose,ry:.8});const afterTurn=qa.draws;
  const other=document.createElement('canvas');other.width=other.height=192;const second=model.createEvolvedRenderer(other,'odango');second.setCoatTexture(coat);second.render({...pose,night:true});second.dispose();
  renderer.render(pose);return {face:afterFace-before,turn:afterTurn-afterFace,contexts:qa.contexts.length,uploads:qa.uploads};
 });assert.deepEqual(reuse,{face:0,turn:2,contexts:1,uploads:2});
 for(const [name,x,y] of [['front',0,0],['quarter',0,.65],['side',0,Math.PI/2],['back',0,Math.PI],['top',.6,0],['inverted',Math.PI,0]]){
  const coverage=await page.evaluate(({x,y})=>{renderer.render({...pose,rx:x,ry:y});const {data,width,height}=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height);let solid=0,feathered=0;for(let i=3;i<data.length;i+=4){if(data[i]>250)solid++;else if(data[i]>5&&data[i]<245)feathered++;}return {solid:solid/(width*height),feathered};},{x,y});
  assert.ok(coverage.solid>.36,name+' coat has an opaque, filled volume');assert.ok(coverage.feathered>350,name+' has a soft fur edge');
  await page.screenshot({path:path.join(out,name+'.png')});
 }
 const session=await page.context().newCDPSession(page);await session.send('Emulation.setCPUThrottlingRate',{rate:6});
 const metrics=[];
 for(const action of ['turn','blink','chew']){
  metrics.push(await page.evaluate(async action=>{const gaps=[],times=[];let previous=performance.now();for(let i=0;i<90;i++){await new Promise(requestAnimationFrame);const now=performance.now();if(i>8)gaps.push(now-previous);previous=now;const start=performance.now();renderer.render({...pose,ry:action==='turn'?i*.014:.65,blink:action==='blink'?(1+Math.sin(i*.4))*.5:0,mouthOpen:action==='chew'?(1+Math.sin(i*.4))*.5:0});if(i>8)times.push(performance.now()-start);}const q=(a,p)=>a.slice().sort((a,b)=>a-b)[Math.floor((a.length-1)*p)];return {action,renderMedian:q(times,.5),renderP95:q(times,.95),frameMedian:q(gaps,.5),frameP95:q(gaps,.95)};},action));
 }
 await session.send('Emulation.setCPUThrottlingRate',{rate:1});
 for(const m of metrics){assert.ok(m.frameP95<80,m.action+' remains responsive with 6x CPU throttling');if(m.action!=='turn')assert.ok(m.renderP95<8,m.action+' never redraws the coat');}
 await page.evaluate(()=>{window.loss=qa.contexts[0].getExtension('WEBGL_lose_context');loss.loseContext();});
 await page.waitForFunction(()=>qa.contexts[0].isContextLost());await page.evaluate(()=>renderer.render({...pose,ry:.2}));
 assert.equal(await page.locator('canvas').getAttribute('data-coat-backend'),'cached-coat');
 await page.screenshot({path:path.join(out,'context-lost.png')});
 await page.evaluate(()=>loss.restoreContext());await page.waitForFunction(()=>!qa.contexts[0].isContextLost());
 await page.evaluate(()=>renderer.render(pose));assert.equal(await page.locator('canvas').getAttribute('data-coat-backend'),'gpu-dense-fur');
 const disposal=await page.evaluate(()=>{const before=qa.draws;renderer.dispose();renderer.render({...pose,ry:1.7});return qa.draws-before;});assert.equal(disposal,0);
 await page.goto(base+'/?fallback');await page.waitForFunction(()=>window.ready);assert.equal(await page.locator('canvas').getAttribute('data-coat-backend'),'cached-coat');
 const opaque=await page.evaluate(()=>canvas.getContext('2d').getImageData(192,225,1,1).data[3]);assert.equal(opaque,255);
 await page.screenshot({path:path.join(out,'no-webgl.png')});assert.deepEqual(errors,[]);
 fs.writeFileSync(path.join(out,'metrics.json'),JSON.stringify({cpuThrottle:6,canvas:384,metrics,reuse,errors},null,2));console.log(JSON.stringify({metrics,reuse}));
 console.log('PASS: dense coats at six angles; one shared GPU; cached expressions; context loss/restoration; no-WebGL fallback; disposal; 6x CPU frame budget');
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{await browser?.close();server.close();});
