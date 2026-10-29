'use strict';
const fs=require('node:fs'),http=require('node:http'),path=require('node:path'),assert=require('node:assert/strict');
const engines=require(process.env.YOKI_QA_PLAYWRIGHT||'playwright'),engine=process.env.YOKI_QA_ENGINE||'chromium';
const root=fs.realpathSync(process.env.YOKI_QA_EXPORT),out=process.env.YOKI_QA_OUTPUT;fs.mkdirSync(out,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.webp':'image/webp','.ttf':'font/ttf'};
const server=http.createServer((req,res)=>{const pathname=new URL(req.url,'http://localhost').pathname;const file=pathname==='/qa-jp.ttf'?process.env.YOKI_QA_FONT:path.join(root,decodeURIComponent(pathname));const actual=file&&fs.existsSync(file)&&fs.statSync(file).isFile()?file:path.join(root,'index.html');res.setHeader('Content-Type',mime[path.extname(actual)]||'application/octet-stream');fs.createReadStream(actual).pipe(res);});
function seed({empty=true,seen=true,pending=false}){
 if(localStorage.getItem('plush-qa'))return;
 const now=Date.parse('2026-10-27T03:00:00Z');
 const values={
  '@mentore/room_customization_v1':{furniture:'sofa',flower:'violet',ownedFurniture:['sofa','vanity','bookshelf'],ownedFlowers:['pink','violet','rainbow']},
  '@mentore/profile_v1':{nickname:'テスト',ageRange:'回答しない',gender:'回答しない',bloodType:'A',mbti:'INFP'},
  '@mentore/feed_state_v1':{points:850,lastFeedTime:new Date(now).toISOString(),satietyAtFeed:70,happiness:{value:80,updatedOn:'2026-10-27',updatedAt:now,lastSeenAt:now,days:{'2026-10-27':['visit']}},hygiene:{lastBathAt:now,completedBathDate:'2026-10-27',protectedUntil:0},housekeeping:{startedAt:now,updatedAt:now,owned:['robot'],cleaned:{},robotPlaced:false}},
  '@mentore/progress_v2':{level:1,experience:0,mentalMuscle:0,streak:3,totalDays:8,lastRecordDate:'2026-10-27',visits:{version:1,lastDate:'2026-10-27',streak:4,bestStreak:4,totalVisits:4,stage:'odango',highestStage:'odango',dates:['2026-10-24','2026-10-25','2026-10-26','2026-10-27']}},
  '@mentore/encounters_v1':{list:[{charKey:'egg',metDate:'2026-10-24'},{charKey:'odango',metDate:'2026-10-26'}]},
  '@mentore/records_v2':empty?[]:['2026-10-12','2026-10-15','2026-10-19','2026-10-21','2026-10-23','2026-10-24','2026-10-26','2026-10-27'].map((date,i)=>({id:date,date,mood:[3,2,4,3,5,2,4,3][i],sleep:7,sleepRecorded:true,behaviors:['散歩'],notes:'今日はのんびり歩いた。',win:'外の空気を吸えた',activities:{exercise:1},exercise:2,meal:3,social:2})),
 };
 for(const [k,v] of Object.entries(values))localStorage.setItem(k,JSON.stringify(v));
 if(pending)localStorage.setItem('@yoki/first-steps/v1/guest','pending');
 localStorage.setItem('@yoki/scenic-return/v1/guest/2026-10-27','home');
 if(seen)localStorage.setItem('@yoki/daily-letter/v1/guest/2026-10-27','seen');localStorage.setItem('plush-qa','yes');
}


let browser,page;
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 browser=await engines.chromium.launch({headless:true,executablePath:process.env.YOKI_QA_BROWSER,args:['--no-sandbox','--disable-dev-shm-usage','--no-zygote','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const cases=process.env.YOKI_QA_CASES?JSON.parse(process.env.YOKI_QA_CASES):[[390,844,'day']];
 for(const [width,height,period] of cases){
  const ctx=await browser.newContext({viewport:{width,height},locale:'ja-JP',timezoneId:'Asia/Tokyo',reducedMotion:'reduce',serviceWorkers:'block'});page=await ctx.newPage();page.setDefaultTimeout(18000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.clock.install({time:new Date(period==='night'?'2026-10-27T12:00:00Z':'2026-10-27T03:00:00Z')});await page.addInitScript(seed,{});
  await ctx.route('**/*',r=>{const u=new URL(r.request().url());if(u.origin!==base||u.pathname.startsWith('/api/'))return r.fulfill({status:503,contentType:'application/json',body:'{}'});return r.continue();});
  const tid=id=>page.getByTestId(id).filter({visible:true});
  const ready=async()=>{await tid('home-view-toggle').waitFor();await tid('plush-loading').waitFor({state:'hidden'});await page.waitForTimeout(600);};
  const font=async()=>{await page.addStyleTag({content:"@font-face{font-family:QAJP;src:url('/qa-jp.ttf')}body div:not([style*=YokiFeather]):not([style*=feather]),svg text,body button{font-family:QAJP,sans-serif!important}"});await page.evaluate(()=>document.fonts.ready);};
  const select=async mode=>{await tid('home-view-toggle').click();await tid('home-view-option-'+mode).click();await ready();};
  const check=async(label)=>{
   await tid('world-speech').waitFor();const b=await tid('resident-speech-bubble').boundingBox(),r=await tid('resident-body').boundingBox(),dock=await tid('home-action-dock').boundingBox();
   assert.ok(b.x>=10&&b.x+b.width<=width-10,'speech fits width '+label);
   assert.ok(b.y>=166&&b.y+b.height<=dock.y-3,'speech clears header and dock '+label+' '+JSON.stringify({b,r,dock}));
   const dx=Math.max(b.x-r.x-r.width,r.x-b.x-b.width,0),dy=Math.max(b.y-r.y-r.height,r.y-b.y-b.height,0);
   assert.ok(Math.hypot(dx,dy)<45,'speech stays by resident '+label+' '+JSON.stringify({b,r,dx,dy}));
   const text=await tid('world-speech').evaluate(e=>({h:e.clientHeight,scroll:e.scrollHeight}));assert.ok(text.h>=text.scroll-1,'full text visible');
   return {b,r};
  };
  await page.goto(base);await ready();await font();await page.clock.runFor(8500);
  const catalog=[['cushion','くつろぎクッション'],['picture-book','小さな絵本'],['plant','観葉植物'],['plush','ぬいぐるみ'],['small-pet','小さなおともだち']].map(([key,name])=>({id:'catalog-decor-'+key,name,category:'accessory',assetUrl:'/legacy-'+key+'.png',cost:100,posX:0,posY:0,scale:1,isActive:true,createdAt:'2026-10-27'}));
  await page.evaluate(items=>{localStorage.setItem('@yoki/item_catalog_cache_v1',JSON.stringify({version:1,items}));localStorage.setItem('@mentore/shop_state_v2',JSON.stringify({inventory:items.map(x=>x.id),equipped:{decor:items[0].id},placements:{}}));},catalog);
  for(let i=0;i<catalog.length;i++){
   const item=catalog[i],flower=['pink','violet','rainbow'][i%3];
   await page.evaluate(({id,flower})=>{const k='@mentore/shop_state_v2',s=JSON.parse(localStorage.getItem(k));s.equipped.decor=id;localStorage.setItem(k,JSON.stringify(s));const r='@mentore/room_customization_v1',v=JSON.parse(localStorage.getItem(r));v.furniture='sofa';v.flower=flower;localStorage.setItem(r,JSON.stringify(v));},{id:item.id,flower});
   await page.reload();await ready();await font();await page.clock.runFor(8500);
   for(const id of ['home-decor-'+item.id,'home-flower-'+flower]){
    const art=tid(id);await art.waitFor();const box=await art.boundingBox(),dock=await tid('home-action-dock').boundingBox();
    assert.ok(box.x>=10&&box.x+box.width<=width-10&&box.y+box.height<dock.y,'object fits '+id);
    await art.locator('img').first().evaluate(img=>img.decode());
    assert.ok(await art.locator('img').first().evaluate(img=>img.naturalWidth>0&&img.src.includes('/cozy/')),'cozy bundled asset '+id);
   }
   await tid('room-resident').press('Enter');await page.waitForTimeout(150);await check(item.id);await tid('room-resident').evaluate(e=>e.blur());
   await page.screenshot({path:path.join(out,item.id+'.png')});
  }
  const before=await page.evaluate(()=>({shop:JSON.parse(localStorage.getItem('@mentore/shop_state_v2')),points:JSON.parse(localStorage.getItem('@mentore/feed_state_v1')).points}));
  await page.goto(base+'/shop');await page.getByRole('tab',{name:'家具',exact:true}).waitFor();await font();
  for(const [tab,ids] of [['家具',['sofa','vanity','bookshelf']],['花',['pink','violet','rainbow']],['置物',catalog.map(x=>x.id)]]){
   await page.getByRole('tab',{name:tab,exact:true}).click();
   for(const id of ids){const card=tid(id.startsWith('catalog-')?'shop-item-'+id:'shop-room-'+id);await card.waitFor();await card.locator('img').first().evaluate(img=>img.decode());assert.ok(await card.locator('img').first().evaluate(img=>img.src.includes('/cozy/')),'shop shares room art '+id);}
   await page.screenshot({path:path.join(out,'shop-'+(tab==='家具'?'furniture':tab==='花'?'flowers':'decor')+'.png')});
  }
  const after=await page.evaluate(()=>({shop:JSON.parse(localStorage.getItem('@mentore/shop_state_v2')),points:JSON.parse(localStorage.getItem('@mentore/feed_state_v1')).points}));assert.deepEqual(after,before,'browsing keeps ownership, placements and points');
  const fixtureWear={id:'catalog-wear-round-glasses',name:'QAメガネ',category:'accessory',assetUrl:'data:image/svg+xml;base64,'+Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><circle cx="170" cy="260" r="70" fill="none" stroke="#9b846b" stroke-width="14"/><circle cx="342" cy="260" r="70" fill="none" stroke="#9b846b" stroke-width="14"/></svg>').toString('base64'),cost:100,posX:0,posY:0,scale:1,isActive:true,createdAt:'2026-10-27'};
  await page.evaluate(item=>{const k='@yoki/item_catalog_cache_v1',c=JSON.parse(localStorage.getItem(k));c.items.push(item);localStorage.setItem(k,JSON.stringify(c));const sk='@mentore/shop_state_v2',s=JSON.parse(localStorage.getItem(sk));s.inventory.push(item.id);localStorage.setItem(sk,JSON.stringify(s));},fixtureWear);
  await page.reload();await page.getByRole('tab',{name:'身につける',exact:true}).click();await page.getByRole('button',{name:'QAメガネ：ホームで位置を調整',exact:true}).click();await font();await tid('shop-cozy-room-preview').waitFor();
  const preview=await tid('shop-room-preview').boundingBox(),model=await tid('shop-preview-resident').boundingBox();assert.ok(model.width>60&&model.y>preview.y&&model.y+model.height<preview.y+preview.height,'preview resident visible');
  await page.mouse.move(preview.x+preview.width/2,preview.y+preview.height/2);await page.mouse.down();await page.mouse.move(preview.x+preview.width/2+12,preview.y+preview.height/2,{steps:8});await page.mouse.up();
  await page.waitForTimeout(250);
  const moved=await page.evaluate(()=>JSON.parse(localStorage.getItem('@mentore/shop_state_v2')).placements['catalog-wear-round-glasses']);assert.ok(moved.x>50&&moved.x<110,'drag uses actual preview scale '+JSON.stringify(moved));
  await page.getByRole('button',{name:'この位置で完了',exact:true}).click();assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('@mentore/feed_state_v1')).points),before.points,'preview does not charge points');

  assert.deepEqual(errors,[]);console.log('PASS',width,height,period,'all flowers, decor, catalog art, ownership and points');await ctx.close();
 }
})().catch(async e=>{console.error(e);if(page&&!page.isClosed()){await page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});fs.writeFileSync(path.join(out,'failure.txt'),await page.locator('body').innerText().catch(()=>String(e)));}process.exitCode=1;}).finally(async()=>{await browser?.close();server.close();});
