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
    const page=await browser.newPage({viewport:{width:320,height:480},reducedMotion:'reduce'}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.addInitScript(()=>{
      const original=Storage.prototype.setItem;
      Storage.prototype.setItem=function(key,value){
        if(key===localStorage.getItem('qa-fail-key'))throw new DOMException('QA write failure','QuotaExceededError');
        return original.call(this,key,value);
      };
    });
    const origin='http://127.0.0.1:'+server.address().port;
    await page.goto(origin);await page.waitForURL('**/onboarding');
    const input=page.getByRole('textbox',{name:'ニックネーム（必須）',exact:true});await input.fill('はじめまして');
    await page.getByRole('button',{name:'回答しない',exact:true}).nth(0).click();
    await page.getByRole('button',{name:'回答しない',exact:true}).nth(1).click();
    await page.evaluate(()=>localStorage.setItem('qa-fail-key','@mentore/profile_v1'));
    const start=page.getByRole('button',{name:'いっしょにはじめる',exact:true});await start.click();
    await page.getByText('保存できませんでした。入力は残っています。もう一度はじめるボタンを押してください。',{exact:true}).waitFor();
    assert.equal(new URL(page.url()).pathname,'/onboarding');assert.equal(await input.inputValue(),'はじめまして');
    assert.equal(await page.evaluate(()=>localStorage.getItem('@mentore/profile_v1')),null);
    await page.evaluate(()=>localStorage.removeItem('qa-fail-key'));await start.click();
    await page.getByTestId('room-scene').waitFor();await page.reload();await page.getByTestId('room-scene').waitFor();
    console.log('PASS fresh onboarding failure retains input; retry and restart reach HOME');
    const openName=async()=>{await page.getByTestId('home-more-menu').click();await page.getByText('なまえをつける',{exact:true}).click();};
    const name=page.getByLabel('なかまの名前',{exact:true}),save=page.getByRole('button',{name:'この名前にする',exact:true});
    await openName();await name.fill('最初の相棒');await save.click();await name.waitFor({state:'hidden'});
    await openName();await name.fill('新しい相棒');
    await page.evaluate(()=>localStorage.setItem('qa-fail-key','@mentore/mascot_name_v1'));await save.click();
    await page.getByText('名前を保存できませんでした。入力は残っています。もう一度お試しください。',{exact:true}).waitFor();
    assert.equal(await name.inputValue(),'新しい相棒');
    assert.equal(await page.evaluate(()=>localStorage.getItem('@mentore/mascot_name_v1')),'最初の相棒');
    assert.equal(await page.getByText('最初の相棒の部屋',{exact:true}).count(),1);
    assert.equal(await page.getByText('新しい相棒の部屋',{exact:true}).count(),0);
    await page.getByRole('button',{name:'閉じる',exact:true}).last().click();
    await openName();assert.equal(await name.inputValue(),'最初の相棒','failed name never becomes the initial saved value');
    await name.fill('新しい相棒');await page.evaluate(()=>localStorage.removeItem('qa-fail-key'));await save.click();
    await name.waitFor({state:'hidden'});await page.getByText('新しい相棒の部屋',{exact:true}).waitFor();
    await page.reload();await page.getByText('新しい相棒の部屋',{exact:true}).waitFor();
    console.log('PASS name failure preserves saved state; closing/reopening, retry and reload are consistent');
    assert.deepEqual(errors,[]);await page.close();
  }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
