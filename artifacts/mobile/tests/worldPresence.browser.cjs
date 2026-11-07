// Isolated browser fixtures; no production account/API writes or native-device claim.
const fs=require('node:fs'),http=require('node:http'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.YOKI_QA_PLAYWRIGHT||'playwright');
const root=path.resolve(process.env.YOKI_QA_EXPORT||'build-yoki-v3'),out=process.env.YOKI_QA_SCREENSHOTS;
const mime={'.html':'text/html','.js':'text/javascript','.png':'image/png','.jpg':'image/jpeg','.ttf':'font/ttf'};
const server=http.createServer((req,res)=>{
  let file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  if(!fs.existsSync(file)||fs.statSync(file).isDirectory())file=path.join(root,'index.html');
  res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({executablePath:process.env.YOKI_QA_BROWSER,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});
 const errors=[];
 const shot=async(p,name)=>{if(out){fs.mkdirSync(out,{recursive:true});await p.screenshot({path:path.join(out,name+'.jpg'),quality:92});}};
 const open=async(viewport,reduce=false,night=false)=>{
  const p=await browser.newPage({viewport,hasTouch:true,locale:'ja-JP',timezoneId:'Asia/Tokyo',reducedMotion:reduce?'reduce':'no-preference'});
  p.on('pageerror',e=>errors.push(e.message));
  await p.clock.install({time:new Date(night?'2026-10-07T21:00:00+09:00':'2026-10-07T12:00:00+09:00')});
  await p.addInitScript(()=>{
   localStorage.setItem('@mentore/profile_v1',JSON.stringify({nickname:'確認',ageRange:'回答しない',gender:'回答しない'}));
   localStorage.setItem('@mentore/encounters_v1',JSON.stringify({list:[{charKey:'egg',metDate:'2026-09-01'}]}));
  });
  await p.goto('http://127.0.0.1:'+server.address().port);await p.getByTestId('room-resident').waitFor();
  await p.getByText('Loading...', {exact:true}).waitFor({state:'hidden'});await p.waitForTimeout(400);return p;
 };
 const foot=p=>p.evaluate(()=>{
  const r=document.querySelector('[data-testid="room-resident"]').getBoundingClientRect(),s=document.querySelector('[data-testid="world-stage"]').getBoundingClientRect();
  return {x:(r.x+r.width/2-s.x)/s.width,y:(r.y+r.height*.92-s.y)/s.height};
 });
 const waitAt=(p,x,y)=>p.waitForFunction(({x,y})=>{
  const el=document.querySelector('[data-testid="room-resident"]'),r=el.getBoundingClientRect(),s=document.querySelector('[data-testid="world-stage"]').getBoundingClientRect();
  return Math.abs((r.x+r.width/2-s.x)/s.width-x)<.005&&Math.abs((r.y+r.height*.92-s.y)/s.height-y)<.005&&!el.getAttribute('aria-label').includes('おさんぽ');
 },{x,y},{timeout:18000});
 try {
  const p=await open({width:390,height:844});
  const resident=p.getByTestId('room-resident'),body=p.getByTestId('resident-body'),shadow=p.getByTestId('resident-contact-shadow');
  const stage=await p.getByTestId('world-stage').boundingBox();let b=await resident.boundingBox();
  assert.ok(b.width/stage.width<.16,'furniture-relative scale');await shot(p,'presence-room');
  const neutral=await body.evaluate(el=>new DOMMatrix(getComputedStyle(el).transform).a);
  await p.mouse.move(b.x+b.width/2,b.y+b.height/2);await p.mouse.down();await p.waitForTimeout(130);
  assert.ok(await body.evaluate(el=>new DOMMatrix(getComputedStyle(el).transform).a)>neutral*1.04,'immediate squash');
  await p.waitForTimeout(220);assert.equal(await resident.evaluate(el=>el.style.zIndex),'999');
  await p.waitForFunction(()=>Number(getComputedStyle(document.querySelector('[data-testid="resident-contact-shadow"]')).opacity)<.5,undefined,{timeout:1500});await shot(p,'presence-held');
  await p.mouse.move(b.x+b.width/2+35,b.y+b.height/2+80,{steps:20});await p.mouse.up();
  await p.getByTestId('world-speech').filter({hasText:'ぽふっ'}).waitFor();await p.waitForTimeout(750);
  assert.ok(Number(await shadow.evaluate(el=>getComputedStyle(el).opacity))>.95);
  assert.ok(Math.abs(await body.evaluate(el=>new DOMMatrix(getComputedStyle(el).transform).d)-1)<.03,'spring restores proportions');
  console.log('PASS scale, press squash, hold shadow, landing recovery');
  await p.getByTestId('world-travel-garden').tap();await p.waitForTimeout(700);
  const a=await foot(p);await p.waitForTimeout(700);const next=await foot(p);
  assert.ok(Math.hypot(a.x-next.x,a.y-next.y)>.002,'continuous walking');
  await waitAt(p,.56,.755);await p.waitForTimeout(700);
  assert.ok((await p.getByTestId('world-stage').boundingBox()).y<stage.y-50,'following camera');
  b=await resident.boundingBox();assert.ok(b.y+b.height<650);await shot(p,'presence-garden');
  await p.getByTestId('world-travel-room').tap();await p.waitForTimeout(500);
  await p.getByTestId('world-travel-terrace').tap();await waitAt(p,.51,.535);await p.waitForTimeout(800);
  let s=await p.getByTestId('world-stage').boundingBox();
  await p.touchscreen.tap(s.x+s.width*.59,s.y+s.height*.64);await waitAt(p,.59,.64);
  const before=await foot(p);s=await p.getByTestId('world-stage').boundingBox();
  await p.touchscreen.tap(s.x+s.width*.29,s.y+s.height*.67);await p.waitForTimeout(500);
  const after=await foot(p);assert.ok(Math.hypot(before.x-after.x,before.y-after.y)<.002,'creek blocked');
  await p.getByTestId('home-daily-record').tap();await p.getByTestId('quick-record-save').waitFor();
  const paused=await foot(p);await p.waitForTimeout(800);assert.deepEqual(await foot(p),paused);
  await p.getByRole('button',{name:'閉じる',exact:true}).last().tap();await p.close();
  console.log('PASS garden/camera, retarget, free ground tap, blocked creek, sheet pause');
  for(const [name,width,height,night] of [['small',320,568,false],['tablet',820,1180,false],['wide',844,390,false],['night',390,844,true]]) {
   const page=await open({width,height},true,night),character=page.getByTestId('room-resident');
   const current=await foot(page);await page.waitForTimeout(7000);assert.deepEqual(await foot(page),current,'no autonomous reduced motion');
   const shapes=await page.getByTestId('resident-body').getAttribute('style');
   await character.focus();await page.keyboard.press('Enter');await page.getByTestId('world-speech').filter({hasText:'きてくれた'}).waitFor();
   assert.equal(await page.getByTestId('resident-body').getAttribute('style'),shapes,'keyboard/reduced motion');
   await page.getByTestId('world-travel-garden').tap();await waitAt(page,.56,.755);
   const r=await character.boundingBox(),nav=await page.getByTestId('world-navigation').boundingBox();
   assert.ok(r.x>=0&&r.x+r.width<=width&&r.y>120&&r.y+r.height<nav.y,`${name}: garden visible`);
   for(const id of ['room','terrace','garden'])assert.ok(await page.getByTestId('world-travel-'+id).evaluate(el=>{const b=el.getBoundingClientRect();return b.height>=44&&el.contains(document.elementFromPoint(b.x+b.width/2,b.y+b.height/2));}));
   await shot(page,'presence-garden-'+name);
   await page.getByTestId('world-travel-room').focus();await page.keyboard.press('Enter');await waitAt(page,.50,.47);
   await shot(page,'presence-room-'+name);await page.close();console.log(`PASS ${name}: accessible stops, reduced motion, camera bounds, return`);
  }
  assert.deepEqual(errors,[]);console.log('PASS no page errors');
 } finally {await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
