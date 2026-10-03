const fs=require('node:fs'),http=require('node:http'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.YOKI_QA_PLAYWRIGHT||'playwright');
const root=path.resolve(process.env.YOKI_QA_EXPORT||path.join(__dirname,'../../../build-yoki-v2-storage'));
const mime={'.html':'text/html','.js':'text/javascript','.png':'image/png','.jpg':'image/jpeg','.ttf':'font/ttf','.mp3':'audio/mpeg'};
const server=http.createServer((req,res)=>{
  let file=path.join(root,decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  if(!fs.existsSync(file)||fs.statSync(file).isDirectory())file=path.join(root,'index.html');
  res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({executablePath:process.env.YOKI_QA_BROWSER,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});
 try{
  const page=await browser.newPage({viewport:{width:320,height:568},reducedMotion:'reduce'}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  let offline=true;
  await page.route('**/api/items',async route=>{
   if(offline)return route.abort();
   const items=await page.evaluate(()=>JSON.parse(localStorage.getItem('@yoki/item_catalog_cache_v1')).items.filter(item=>item.isActive));
   return route.fulfill({json:{items}});
  });
  await page.route('**/qa-item.png',route=>route.fulfill({contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jS1kAAAAASUVORK5CYII=','base64')}));
  await page.addInitScript(()=>{
   if(localStorage.getItem('qa-shop-seeded'))return;
   const items=Array.from({length:42},(_,i)=>({id:`catalog-wear-qa-${i}`,name:`思い出を大切にしまっておける長い名前のアクセサリー ${i}`,category:'accessory',cost:40,assetUrl:'/qa-item.png',posX:0,posY:0,scale:1,isActive:i!==0&&i!==41,createdAt:''}));
   localStorage.setItem('@mentore/profile_v1',JSON.stringify({nickname:'テスト',ageRange:'回答しない',gender:'回答しない'}));
   localStorage.setItem('@mentore/encounters_v1',JSON.stringify({list:[{charKey:'egg',metDate:'2026-09-01'}]}));
   localStorage.setItem('@mentore/feed_state_v1',JSON.stringify({points:123,lastFeedTime:null,satietyAtFeed:50}));
   localStorage.setItem('@yoki/item_catalog_cache_v1',JSON.stringify({version:1,items}));
   localStorage.setItem('@mentore/shop_state_v2',JSON.stringify({inventory:items.slice(0,41).map(item=>item.id),equipped:{accessory:items[0].id},placements:{[items[0].id]:{x:12,y:3,scale:1}}}));
   localStorage.setItem('qa-shop-seeded','true');
  });
  const url='http://127.0.0.1:'+server.address().port+'/shop';await page.goto(url);
  await page.getByText('お店に再接続する',{exact:true}).waitFor();await page.getByText('Loading...',{exact:true}).waitFor({state:'hidden'});
  assert.equal(await page.locator('[data-testid^="shop-item-"]').count(),41);
  assert.equal(await page.getByTestId('shop-item-catalog-wear-qa-41').count(),0,'unowned inactive items stay hidden');
  const first=page.getByTestId('shop-item-catalog-wear-qa-0');
  await first.getByRole('button',{name:/：はずす$/}).click();
  await page.waitForFunction(()=>{const s=JSON.parse(localStorage.getItem('@mentore/shop_state_v2'));return s.equipped.wear===null&&s.equipped.accessory===null;});
  await first.getByRole('button',{name:/：着ける \/ 設定する$/}).click();
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('@mentore/shop_state_v2')).equipped.wear==='catalog-wear-qa-0');
  offline=false;await page.getByText('お店に再接続する',{exact:true}).click();
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('@yoki/item_catalog_cache_v1')).items.length===41);
  await first.getByRole('button',{name:/：はずす$/}).waitFor();
  // Stress browser text size; actual native Dynamic Type requires a device.
  await page.evaluate(()=>{for(const el of document.querySelectorAll('div,span'))if(!el.children.length&&el.textContent?.trim()){const s=getComputedStyle(el);el.style.fontSize=parseFloat(s.fontSize)*1.5+'px';if(s.lineHeight!=='normal')el.style.lineHeight=parseFloat(s.lineHeight)*1.5+'px';}});
  const last=page.getByTestId('shop-item-catalog-wear-qa-40');const equip=last.getByRole('button',{name:/：着ける \/ 設定する$/});await equip.scrollIntoViewIfNeeded();
  const b=await equip.boundingBox();assert.ok(b.x>=0&&b.x+b.width<=320&&b.y>=0&&b.y+b.height<=568&&b.height>=44);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),320);
  const clipped=await page.locator('[data-testid^="shop-item-"]').evaluateAll(cards=>cards.flatMap(card=>{const b=card.getBoundingClientRect();return [...card.querySelectorAll('div,span')].filter(el=>!el.children.length&&el.textContent?.trim()).filter(el=>{const r=el.getBoundingClientRect();return r.left<b.left||r.right>b.right||el.scrollWidth>el.clientWidth+1||el.scrollHeight>el.clientHeight+1;}).map(el=>el.textContent);}));assert.deepEqual(clipped,[]);
  await equip.click();await page.waitForFunction(()=>JSON.parse(localStorage.getItem('@mentore/shop_state_v2')).equipped.wear==='catalog-wear-qa-40');
  await page.reload();await page.getByTestId('shop-item-catalog-wear-qa-40').getByRole('button',{name:/：はずす$/}).waitFor();
  const saved=await page.evaluate(()=>({shop:JSON.parse(localStorage.getItem('@mentore/shop_state_v2')),feed:JSON.parse(localStorage.getItem('@mentore/feed_state_v1'))}));
  assert.equal(saved.shop.inventory.length,41);assert.deepEqual(saved.shop.placements['catalog-wear-qa-0'],{x:12,y:3,scale:1});assert.equal(saved.feed.points,123);assert.deepEqual(errors,[]);
  assert.equal(await page.getByTestId('shop-item-catalog-wear-qa-0').count(),1);
  console.log('PASS 41 owned items, inactive ownership through reconnect/reload, legacy unequip/re-equip, long Japanese names at 150% text, last-item action and reload preservation');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
