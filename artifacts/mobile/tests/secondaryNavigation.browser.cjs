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
    const errors=[];
    const makePage=async()=>{
      const page=await browser.newPage({viewport:{width:320,height:568},reducedMotion:'reduce'});
      page.on('pageerror',e=>errors.push(e.message));
      await page.addInitScript(()=>{
        if(localStorage.getItem('qa-nav-seeded'))return;
        const data={
          '@mentore/profile_v1':{nickname:'テスト',ageRange:'回答しない',gender:'回答しない'},
          '@mentore/feed_state_v1':{points:100,lastFeedTime:null,satietyAtFeed:50},
          '@mentore/encounters_v1':{list:[{charKey:'egg',metDate:'2026-09-01'}]},
        };
        for(const [k,v]of Object.entries(data))localStorage.setItem(k,JSON.stringify(v));
        localStorage.setItem('qa-nav-seeded','true');
      });
      await page.addInitScript(()=>{
        const original=Storage.prototype.setItem;
        Storage.prototype.setItem=function(key,value){
          if(key===localStorage.getItem('qa-fail-key'))throw new DOMException('QA disk full','QuotaExceededError');
          return original.call(this,key,value);
        };
      });
      return page;
    };
    const origin='http://127.0.0.1:'+server.address().port;
    const ready=async page=>{await page.getByText('Loading...',{exact:true}).waitFor({state:'hidden'});};
    for(const route of ['record','chat']){
      const page=await makePage();await page.goto(origin+'/'+route);
      await page.getByRole('button',{name:'部屋へ戻る',exact:true}).waitFor();await ready(page);
      await page.getByRole('button',{name:'部屋へ戻る',exact:true}).click();
      await page.getByTestId('room-scene').waitFor();assert.equal(new URL(page.url()).pathname,'/');
      await page.close();console.log('PASS direct '+route+' returns to room');
    }
    const page=await makePage();await page.goto(origin);await page.getByTestId('room-scene').waitFor();await ready(page);
    await page.getByTestId('room-record').click();
    await page.getByText('もっと詳しく記録する・チェック',{exact:true}).click();await page.waitForURL('**/record');
    for(const label of ['くわしく残す','チェックを見る']){
      await page.getByRole('button',{name:label,exact:true}).click();
      await page.getByLabel('閉じる',{exact:true}).last().click();
    }
    await page.getByRole('button',{name:'部屋へ戻る',exact:true}).click();await page.getByTestId('room-scene').waitFor();
    await page.getByTestId('home-more-menu').click();await page.getByText('この子とお話しする',{exact:true}).click();
    await page.getByRole('button',{name:'少し、お話しする',exact:true}).click();await page.waitForURL('**/chat');
    await page.getByRole('button',{name:'部屋へ戻る',exact:true}).click();await page.getByTestId('room-scene').waitFor();
    console.log('PASS record/details/checklist and conversation round trips without sending a message');
    for(const [label,route]of [['ひかりの庭','plant'],['アルバム','growth'],['部屋','']]){
      await page.getByText(label,{exact:true}).last().click();await page.waitForURL(origin+'/'+route);
    }
    await page.goto(origin+'/gallery');await page.waitForURL('**/growth');await page.getByTestId('album-details-toggle').waitFor();
    console.log('PASS three tabs and legacy gallery redirects to album');
    await page.goto(origin+'/profile');await page.getByPlaceholder('例: ゆき').waitFor();await ready(page);
    assert.equal(await page.getByPlaceholder('例: ゆき').inputValue(),'テスト','direct profile waits for saved form values');
    const key='@mentore/profile_v1';
    await page.getByPlaceholder('例: ゆき').fill('再試行した名前');
    await page.evaluate(k=>localStorage.setItem('qa-fail-key',k),key);
    await page.getByRole('button',{name:'保存する',exact:true}).click();
    await page.getByText('プロフィールを保存できませんでした。入力は残っています。もう一度保存してください。',{exact:true}).waitFor();
    assert.equal(new URL(page.url()).pathname,'/profile');
    assert.equal(await page.getByPlaceholder('例: ゆき').inputValue(),'再試行した名前');
    assert.equal(await page.evaluate(k=>JSON.parse(localStorage.getItem(k)).nickname,key),'テスト');
    await page.evaluate(()=>localStorage.removeItem('qa-fail-key'));
    await page.getByRole('button',{name:'保存する',exact:true}).click();await page.getByTestId('room-scene').waitFor();
    await page.goto(origin+'/profile');await page.getByPlaceholder('例: ゆき').waitFor();await ready(page);
    assert.equal(await page.getByPlaceholder('例: ゆき').inputValue(),'再試行した名前');
    console.log('PASS profile save failure retains input and route; retry persists and returns to room');
    const pref='@mentore/home_comment_preferences_v1';
    const off=page.getByRole('radio',{name:'オフ・ホームのひとことを表示しません',exact:true});
    await page.evaluate(k=>localStorage.setItem('qa-fail-key',k),pref);await off.click();
    await page.getByText('設定を保存できませんでした。もう一度選んでください。',{exact:true}).waitFor();
    assert.equal(await off.getAttribute('aria-checked'),'false');
    await page.evaluate(()=>localStorage.removeItem('qa-fail-key'));await off.click();
    await page.waitForFunction(k=>JSON.parse(localStorage.getItem(k))?.frequency==='off',pref);
    assert.equal(await off.getAttribute('aria-checked'),'true');
    await page.reload();await off.waitFor();assert.equal(await off.getAttribute('aria-checked'),'true');
    console.log('PASS preferences failure does not publish selection; retry and reload preserve it');
    assert.deepEqual(errors,[]);await page.close();
  }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
