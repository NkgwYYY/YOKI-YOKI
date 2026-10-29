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
 if(seen)localStorage.setItem('@yoki/daily-letter/v1/guest/2026-10-27','seen');localStorage.setItem('plush-qa','yes');
}
let browser,page;
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({headless:true,executablePath:process.env.YOKI_QA_BROWSER,args:['--no-sandbox','--disable-dev-shm-usage']});
 for(const [width,height] of [[390,844],[320,568],[1120,900]]){
  const context=await browser.newContext({viewport:{width,height},locale:'ja-JP',timezoneId:'Asia/Tokyo',reducedMotion:'reduce',serviceWorkers:'block'});page=await context.newPage();page.setDefaultTimeout(18000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.clock.setFixedTime(new Date('2026-10-27T03:00:00Z'));await page.addInitScript(seed,{seen:true,empty:width===320});
  await context.route('**/*',r=>{const u=new URL(r.request().url());if(u.origin!==base||u.pathname.startsWith('/api/'))return r.fulfill({status:503,contentType:'application/json',body:'{}'});return r.continue();});
  async function font(){await page.getByTestId('plush-loading').waitFor({state:'hidden'});if(process.env.YOKI_QA_FONT){await page.addStyleTag({content:"@font-face{font-family:QAJP;src:url('/qa-jp.ttf')}body div:not([style*=YokiFeather]):not([style*=feather]),svg text,body h1,body h2,body h3,body button,body input,body textarea{font-family:QAJP,sans-serif!important}"});await page.evaluate(()=>document.fonts.ready);}}
  await page.goto(base+'/growth');await page.getByTestId('compact-growth').waitFor();await font();
  const records=await page.evaluate(()=>localStorage.getItem('@mentore/records_v2'));
  assert.equal(await page.getByTestId('growth-leaf-count').count(),0,'tree is opened on demand');
  const panel=await page.getByTestId('compact-growth').boundingBox();console.log('overview',width,panel.height);assert.ok(panel.height<(width<360?700:650),'compact overview remains one short summary');
  await page.screenshot({path:path.join(out,`growth-${width}.png`)});
  await page.getByTestId('growth-tab-memories').click();await page.getByTestId('growth-memories-panel').waitFor();await page.getByRole('button',{name:/バッジ/}).click();await page.getByRole('heading',{name:'バッジ',exact:true}).waitFor();await page.getByRole('button',{name:'閉じる',exact:true}).click();
  await page.screenshot({path:path.join(out,`memories-${width}.png`)});
  await page.getByRole('button',{name:/アルバム/}).click();await page.getByTestId('album-character-odango').waitFor();assert.equal(await page.getByTestId('album-character-colorful_happa').count(),0);await page.getByRole('button',{name:'閉じる',exact:true}).click();
  await page.getByTestId('growth-tab-records').click();assert.equal(await page.evaluate(()=>localStorage.getItem('@mentore/records_v2')),records);
  await page.goto(base+'/exchange-diary');await page.getByTestId('diary-open-cover').click();await page.getByTestId('diary-character-page').waitFor();await font();
  assert.equal(await page.getByTestId('diary-spread').count(),width>=900?1:0);await page.screenshot({path:path.join(out,`notebook-${width}.png`)});
  if(width<900)await page.getByTestId('diary-tab-user').click();
  const input=page.getByTestId('diary-input'),draft='今日は公園を歩いた。\nあたたかいお茶がおいしかった。';await input.fill(draft);
  await page.getByTestId('diary-home').click();await page.getByRole('heading',{name:'まだ渡していないページがあるよ'}).waitFor();await page.getByRole('button',{name:'書いていたページに戻る',exact:true}).click();assert.equal(await input.inputValue(),draft,'unsent text survives leave dialog');
  if(width<900){await page.getByTestId('diary-tab-character').click();await page.getByTestId('diary-tab-user').click();assert.equal(await input.inputValue(),draft,'bookmark switches retain draft');}
  await page.getByTestId('diary-mood-4').click();await input.scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,`writing-${width}.png`)});
  await page.getByTestId('diary-send').click();await page.getByTestId('diary-user-page').waitFor();assert.match(await page.getByTestId('diary-user-page').innerText(),/公園を歩いた/);
  await page.reload();await page.getByTestId('diary-open-cover').click();if(width<900)await page.getByTestId('diary-tab-user').click();await page.getByTestId('diary-user-page').waitFor();assert.match(await page.getByTestId('diary-user-page').innerText(),/公園を歩いた/);
  await font();await page.screenshot({path:path.join(out,`saved-${width}.png`)});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width);assert.deepEqual(errors,[]);await context.close();console.log(`PASS ${width}px compact overview, memory access, spread/bookmarks, unsaved text, saved text and reload`);
 }
})().catch(async e=>{if(page&&!page.isClosed()){await page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});fs.writeFileSync(path.join(out,'failure.txt'),await page.locator('body').innerText());}console.error(e);process.exitCode=1;}).finally(async()=>{await browser?.close();server.close();});
