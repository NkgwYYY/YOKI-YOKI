const fs=require('node:fs'),http=require('node:http'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.YOKI_QA_PLAYWRIGHT||'playwright');
const root=path.resolve(process.env.YOKI_QA_EXPORT),output=process.env.YOKI_QA_OUTPUT;
const mime={'.html':'text/html','.js':'text/javascript','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.ttf':'font/ttf','.mp3':'audio/mpeg'};
const server=http.createServer((req,res)=>{let f=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!f.startsWith(root+path.sep))f=path.join(root,'index.html');if(!fs.existsSync(f)||fs.statSync(f).isDirectory())f=path.join(root,'index.html');res.setHeader('Content-Type',mime[path.extname(f)]||'application/octet-stream');fs.createReadStream(f).pipe(res);});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});const page=await browser.newPage({viewport:{width:390,height:844},locale:'ja-JP',timezoneId:'Asia/Tokyo'}),calls=[],errors=[];
 let fail=true;
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>{
  const url=new URL(route.request().url()),headers={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'POST,OPTIONS'};
  if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers});
  if(url.pathname.endsWith('/diary/reply')){const body=route.request().postDataJSON();calls.push(body);return route.fulfill({status:fail?503:200,headers,contentType:'application/json',body:JSON.stringify(fail?{error:'offline'}:{reply:body.text.includes('面接')?'面接で言葉に詰まったことが、まだ引っかかっているんだね。準備していた分、思うように話せなかった悔しさがあるんだと思う。今日は無理に良かったことにしなくていいよ。':'研修の司会、緊張しながらも最後までやりきったんだね。参加者が笑ってくれた場面が、今日のうれしい記憶になったんだなあ。ぼくまで笑顔になっちゃった。'})});}
  if(url.origin!==base||url.pathname.startsWith('/api/'))return route.fulfill({status:503,headers,contentType:'application/json',body:'{}'});
  return route.continue();
 });
 await page.addInitScript(()=>{if(localStorage.getItem('diary-quality-seeded'))return;localStorage.setItem('diary-quality-seeded','1');localStorage.setItem('@mentore/profile_v1',JSON.stringify({nickname:'確認用',ageRange:'回答しない',gender:'回答しない'}));localStorage.setItem('@mentore/encounters_v1',JSON.stringify({list:[{charKey:'egg',metDate:'2026-09-01'}]}));});
 try{
  await page.goto(base+'/exchange-diary');await page.getByTestId('diary-write').click();
  const text='新人研修の司会が終わった。緊張したけど参加者が笑ってくれて嬉しかった。';
  await page.getByTestId('diary-input').fill(text);await page.getByTestId('diary-mood-4').click();await page.getByTestId('diary-send').click();await page.getByTestId('diary-user-page').waitFor();
  assert.equal(calls.length,0);const feed=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('@mentore/feed_state_v1')));
  const before=(await feed()).points;
  await page.getByTestId('diary-request-reply').click();await page.getByRole('button',{name:'今は日記の保存だけ',exact:true}).click();assert.equal(calls.length,0);
  await page.getByTestId('diary-request-reply').click();await page.getByRole('button',{name:'同意して、返事をもらう',exact:true}).click();await page.getByText('返事を受け取れませんでした。日記は保存されています。',{exact:true}).waitFor();assert.equal(calls.length,1);
  assert.equal((await feed()).points,before);fail=false;await page.getByTestId('diary-request-reply').click();await page.getByTestId('diary-reply').getByText(/研修の司会、緊張/).waitFor();assert.equal(calls.length,2);assert.deepEqual(Object.keys(calls[1]).sort(),['date','mascotName','mood','text']);assert.equal(calls[1].text,text);
  assert.equal((await feed()).points,before);await page.getByTestId('diary-reply').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(output,'diary-reply.png')});
  await page.reload();await page.getByTestId('diary-tab-user').click();await page.getByTestId('diary-reply').getByText(/研修の司会、緊張/).waitFor();assert.equal(calls.length,2);
  await page.getByTestId('diary-edit').click();await page.getByTestId('diary-input').fill('面接で言葉に詰まった。準備したのに悔しい。');await page.getByTestId('diary-mood-1').click();await page.getByTestId('diary-send').click();await page.getByTestId('diary-reply').getByText(/面接で言葉に詰まった/).waitFor();assert.equal(calls.length,3);assert.equal((await feed()).points,before);
  await page.getByRole('button',{name:'日記のAI返信をオフにする',exact:true}).click();await page.getByTestId('diary-edit').click();await page.getByTestId('diary-input').fill('今日は猫と遊んだ。');await page.getByTestId('diary-send').click();await page.getByTestId('diary-request-reply').waitFor();assert.equal(calls.length,3);
  assert.deepEqual(errors,[]);console.log('PASS diary consent refusal, persisted save before reply, offline retry, grounded payload, persisted reply, automatic edited reply, single reward and withdrawal');
 }catch(e){await page.screenshot({path:path.join(output,'diary-failure.png')});console.log((await page.locator('body').innerText()).slice(-5000));throw e;}
 finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
