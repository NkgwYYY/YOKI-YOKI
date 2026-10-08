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
    await page.addInitScript(()=>{
      localStorage.setItem('@mentore/profile_v1',JSON.stringify({nickname:'テスト',ageRange:'回答しない',gender:'回答しない'}));
      localStorage.setItem('@mentore/encounters_v1',JSON.stringify({list:[{charKey:'egg',metDate:'2026-09-01'}]}));
      if(!localStorage.getItem('qa-history-seeded')){localStorage.setItem('@mentore/chat_history_v1','broken');localStorage.setItem('qa-history-seeded','true');}
      const set=Storage.prototype.setItem,remove=Storage.prototype.removeItem;
      Storage.prototype.setItem=function(k,v){if(k==='@yoki/private_cache_v1/guest'&&(localStorage.getItem('qa-write-fail')||(localStorage.getItem('qa-remove-fail')&&!Object.hasOwn(JSON.parse(v).data,'@mentore/chat_history_v1'))))throw Error('QA write failure');return set.call(this,k,v);};
      Storage.prototype.removeItem=function(k){if(k==='@mentore/chat_history_v1'&&localStorage.getItem('qa-remove-fail'))throw Error('QA remove failure');return remove.call(this,k);};
    });
    let calls=0;const headers={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'POST, OPTIONS'};
    await page.route('**/api/chat/message',async route=>{
      if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers});calls++;
      return route.fulfill({status:200,headers,contentType:'application/json',body:JSON.stringify({content:'保存テストの返事'})});
    });
    const url='http://127.0.0.1:'+server.address().port+'/chat';
    const open=async()=>{await page.goto(url);await page.getByText('Loading...',{exact:true}).waitFor({state:'hidden'});};
    await open();await page.getByRole('button',{name:'会話履歴を読み込み直す'}).waitFor();
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('@yoki/private_cache_v1/guest')).data['@mentore/chat_history_v1']),'broken','failed hydration must not overwrite history');
    await page.getByRole('textbox',{name:'話しかける内容'}).fill('保存テスト');
    assert.equal(await page.getByRole('button',{name:'送信',exact:true}).isDisabled(),true);
    await page.evaluate(()=>localStorage.setItem('@yoki/private_cache_v1/guest',JSON.stringify({version:1,accountId:null,data:{'@mentore/chat_history_v1':'[]'}})));
    await page.getByRole('button',{name:'会話履歴を読み込み直す'}).click();
    await page.evaluate(()=>localStorage.setItem('qa-write-fail','true'));
    await page.getByRole('button',{name:'送信',exact:true}).click();await page.getByText('保存テストの返事',{exact:true}).waitFor();
    await page.getByRole('button',{name:'会話履歴を保存し直す'}).waitFor();
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('@yoki/private_cache_v1/guest')).data['@mentore/chat_history_v1']),'[]');
    await page.evaluate(()=>localStorage.removeItem('qa-write-fail'));
    await page.getByRole('button',{name:'会話履歴を保存し直す'}).click();
    await page.getByRole('button',{name:'会話履歴を保存し直す'}).waitFor({state:'hidden'});
    await open();await page.getByText('保存テストの返事',{exact:true}).waitFor();assert.equal(calls,1);
    await page.evaluate(()=>localStorage.setItem('qa-remove-fail','true'));
    await page.getByRole('button',{name:'会話履歴を消す'}).click();await page.getByText('履歴を消せませんでした。もう一度お試しください。',{exact:true}).waitFor();
    assert.equal(await page.evaluate(()=>JSON.parse(JSON.parse(localStorage.getItem('@yoki/private_cache_v1/guest')).data['@mentore/chat_history_v1']).length),2);
    await page.evaluate(()=>localStorage.removeItem('qa-remove-fail'));
    await page.getByRole('button',{name:'会話履歴を消す'}).click();
    await page.getByText('保存テストの返事',{exact:true}).waitFor({state:'hidden'});await open();
    assert.equal(await page.getByText('保存テストの返事',{exact:true}).count(),0);assert.deepEqual(errors,[]);
    console.log('PASS failed hydration preserves data, save-only retry/reload, deletion failure retention and successful deletion/reload; mocked API');
  }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
