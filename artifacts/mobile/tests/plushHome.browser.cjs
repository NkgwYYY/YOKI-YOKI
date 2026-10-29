'use strict';
const fs=require('node:fs'),http=require('node:http'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.YOKI_QA_PLAYWRIGHT||'playwright');
const root=fs.realpathSync(process.env.YOKI_QA_EXPORT),out=process.env.YOKI_QA_OUTPUT;fs.mkdirSync(out,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.webp':'image/webp','.ttf':'font/ttf'};
const server=http.createServer((req,res)=>{const pathname=new URL(req.url,'http://localhost').pathname;const file=pathname==='/qa-jp.ttf'?process.env.YOKI_QA_FONT:path.join(root,decodeURIComponent(pathname));const actual=file&&fs.existsSync(file)&&fs.statSync(file).isFile()?file:path.join(root,'index.html');res.setHeader('Content-Type',mime[path.extname(actual)]||'application/octet-stream');fs.createReadStream(actual).pipe(res);});
function seed({empty=false,seen=false}){
 if(localStorage.getItem('plush-qa'))return;
 const now=Date.parse('2026-10-27T03:00:00Z');
 const values={
  '@mentore/profile_v1':{nickname:'テスト',ageRange:'回答しない',gender:'回答しない',bloodType:'A',mbti:'INFP'},
  '@mentore/feed_state_v1':{points:850,lastFeedTime:new Date(now).toISOString(),satietyAtFeed:70,happiness:{value:80,updatedOn:'2026-10-27',updatedAt:now,lastSeenAt:now,days:{'2026-10-27':['visit']}},hygiene:{lastBathAt:now,completedBathDate:'2026-10-27',protectedUntil:0},housekeeping:{startedAt:now,updatedAt:now,owned:['robot'],cleaned:{},robotPlaced:false}},
  '@mentore/progress_v2':{level:1,experience:0,mentalMuscle:0,streak:3,totalDays:8,lastRecordDate:'2026-10-27',visits:{version:1,lastDate:'2026-10-27',streak:4,bestStreak:4,totalVisits:4,stage:'odango',highestStage:'odango',dates:['2026-10-24','2026-10-25','2026-10-26','2026-10-27']}},
  '@mentore/encounters_v1':{list:[{charKey:'egg',metDate:'2026-10-24'},{charKey:'odango',metDate:'2026-10-26'}]},
  '@mentore/records_v2':empty?[]:['2026-10-12','2026-10-15','2026-10-19','2026-10-21','2026-10-23','2026-10-24','2026-10-26','2026-10-27'].map((date,i)=>({id:date,date,mood:[3,2,4,3,5,2,4,3][i],sleep:7,sleepRecorded:true,behaviors:['散歩'],notes:'今日はのんびり歩いた。',win:'外の空気を吸えた',activities:{exercise:1},exercise:2,meal:3,social:2})),
 };
 for(const [k,v] of Object.entries(values))localStorage.setItem(k,JSON.stringify(v));
 localStorage.setItem('@yoki/scenic-return/v1/guest/2026-10-27','home');
 if(seen)localStorage.setItem('@yoki/daily-letter/v1/guest/2026-10-27','seen');localStorage.setItem('plush-qa','yes');
}
let browser,page;
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({headless:true,executablePath:process.env.YOKI_QA_BROWSER,args:['--no-sandbox','--disable-dev-shm-usage']});
 for(const [width,height] of [[390,844],[1363,936],[844,390],[320,568]]){
  const context=await browser.newContext({viewport:{width,height},locale:'ja-JP',timezoneId:'Asia/Tokyo',reducedMotion:width===320?'reduce':'no-preference',serviceWorkers:'block'});page=await context.newPage();page.setDefaultTimeout(18000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.clock.setFixedTime(new Date('2026-10-27T03:00:00Z'));await page.addInitScript(seed,{empty:width===320,seen:false});
  await context.route('**/*',r=>{const url=new URL(r.request().url());if(url.pathname==='/api/fortune/sky'){const date=url.searchParams.get('date');return r.fulfill({contentType:'application/json',body:JSON.stringify({sky:{date,phase:'Waning Gibbous',illumination:98,moonrise:'17:12',moonset:'07:01',source:'USNO',sourceUrl:`https://aa.usno.navy.mil/api/rstt/oneday?date=${date}&coords=35.6762,139.6503&tz=9`,fetchedAt:date+'T03:00:00Z',reference:'Tokyo/JST/noon'}})});}if(url.pathname.endsWith('/community/config'))return r.fulfill({contentType:'application/json',body:'{"enabled":false,"ads":false}'});if(url.origin!==base||url.pathname.startsWith('/api/'))return r.fulfill({status:503,contentType:'application/json',body:'{}'});return r.continue();});
  await page.goto(base);await page.getByRole('heading',{name:'今日の便り',exact:true}).waitFor();
  if(process.env.YOKI_QA_FONT){await page.addStyleTag({content:"@font-face{font-family:QAJP;src:url('/qa-jp.ttf')}body div:not([style*=YokiFeather]):not([style*=feather]),svg text,body h1,body h2,body h3,body button,body input,body textarea{font-family:QAJP,sans-serif!important}"});await page.evaluate(()=>document.fonts.ready);}
  await page.getByText('今日の占い',{exact:true}).waitFor();await page.waitForTimeout(450);await page.screenshot({path:path.join(out,`letter-${width}.png`)});
  if(width===320)assert.ok((await page.locator('body').innerText()).includes('未記録'));
  const before=await page.evaluate(()=>({record:JSON.parse(localStorage.getItem('@mentore/records_v2')).find(r=>r.date==='2026-10-27'),points:JSON.parse(localStorage.getItem('@mentore/feed_state_v1')).points}));
  await page.getByTestId('quick-mood-1').click();await page.getByText('今日の気分を保存しました。',{exact:true}).waitFor();assert.equal(await page.getByTestId('checkin-current-mood').innerText(),'つらい');assert.equal(await page.getByText('いったん手を止めて休む',{exact:true}).count(),2);
  const after=await page.evaluate(()=>({record:JSON.parse(localStorage.getItem('@mentore/records_v2')).find(r=>r.date==='2026-10-27'),points:JSON.parse(localStorage.getItem('@mentore/feed_state_v1')).points}));
  assert.equal(after.record.mood,1);if(before.record){assert.deepEqual(after.record,{...before.record,mood:1});assert.equal(after.points,before.points);}else assert.equal(after.record.sleepRecorded,false);
  const meet=page.getByRole('button',{name:'よっきーに会いに行く',exact:true}),meetBox=await meet.boundingBox();assert.ok(meetBox.y>=0&&meetBox.y+meetBox.height<=height,'meet character button always stays visible');await meet.click();await page.getByTestId('home-letter').waitFor();
  assert.equal(await page.getByTestId('home-hygiene').count(),0);await page.screenshot({path:path.join(out,`home-${width}.png`)});
  await page.reload();await page.getByTestId('home-letter').waitFor();await page.getByTestId('world-map-open').waitFor();await page.waitForTimeout(900);assert.equal(await page.getByRole('heading',{name:'今日の便り',exact:true}).count(),0,'brief opens automatically once per local day');
  if(process.env.YOKI_QA_FONT){await page.addStyleTag({content:"@font-face{font-family:QAJP;src:url('/qa-jp.ttf')}body div:not([style*=YokiFeather]):not([style*=feather]),svg text,body h1,body h2,body h3,body button{font-family:QAJP,sans-serif!important}"});await page.evaluate(()=>document.fonts.ready);}
  await page.getByTestId('home-view-toggle').click();await page.getByTestId('home-eye-level').waitFor();await page.waitForTimeout(500);await page.screenshot({path:path.join(out,`close-${width}.png`)});
  await page.getByTestId('world-map-open').click();await page.getByTestId('home-direct-menu').waitFor();await page.waitForTimeout(450);await page.screenshot({path:path.join(out,`menu-${width}.png`)});
  assert.equal(await page.getByText('ここへ向かう',{exact:true}).count(),0);
  await page.getByTestId('menu-fortune').click();await page.getByTestId('zodiac-fortune').waitFor();assert.equal(await page.getByTestId('fortune-draw').count(),0,'lunar interpretation is no longer displayed');await page.getByRole('button',{name:'閉じる',exact:true}).click();
  await page.getByTestId('world-map-open').click();await page.getByTestId('menu-play').click();await page.getByTestId('menu-bowling').click();await page.getByTestId('bowling-game').waitFor();await page.waitForTimeout(450);await page.screenshot({path:path.join(out,`bowling-${width}.png`)});await page.getByTestId('bowling-close').click();
  await page.getByRole('tab',{name:'おふろ',exact:true}).click();await page.getByTestId('bath-tool-towel').waitFor();assert.equal(await page.getByTestId('bath-tool-towel').isEnabled(),true,'completed bath remains optional/repeatable');await page.screenshot({path:path.join(out,`bath-${width}.png`)});
  await page.getByRole('tab',{name:'歩み',exact:true}).click();await page.getByTestId('compact-growth').waitFor();await page.screenshot({path:path.join(out,`growth-${width}.png`)});
  await page.getByTestId('growth-open-tree').click();await page.getByTestId('growth-leaf-count').waitFor();
  await page.getByTestId('growth-leaf-2026-10-27').click();await page.getByTestId('growth-leaf-detail').waitFor();assert.match(await page.getByTestId('growth-leaf-detail').innerText(),/2026-10-27/);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width,'no horizontal overflow');assert.deepEqual(errors,[]);console.log(`PASS ${width}x${height}: brief, one tap, retained diary, same fortune, menu/game, repeat bath, growth and no overflow`);await context.close();
 }
})().catch(async e=>{if(page&&!page.isClosed()){await page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});fs.writeFileSync(path.join(out,'failure.txt'),await page.locator('body').innerText());}console.error(e);process.exitCode=1;}).finally(async()=>{await browser?.close();server.close();});
