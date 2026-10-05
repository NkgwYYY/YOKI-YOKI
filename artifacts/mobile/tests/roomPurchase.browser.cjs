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
    for(const item of [{id:'sofa',name:'ソファ',cost:450},{id:'pink',name:'ローズ',cost:250},{id:'egg',name:'たまご',cost:1000}])for(const mode of ['retry','restart']){
      const page=await browser.newPage({viewport:{width:320,height:568},reducedMotion:'reduce'}),errors=[];
      page.on('pageerror',e=>errors.push(e.message));
      await page.addInitScript(({cost})=>{
        if(!localStorage.getItem('qa-seeded')){
          const data={'@mentore/profile_v1':{nickname:'購入復旧',ageRange:'回答しない',gender:'回答しない'},
            '@mentore/feed_state_v1':{points:cost,lastFeedTime:null,satietyAtFeed:65},
            '@mentore/encounters_v1':{list:[{charKey:'egg',metDate:'2026-09-01'}]}};
          for(const [key,value]of Object.entries(data))localStorage.setItem(key,JSON.stringify(value));
          localStorage.setItem('qa-seeded','true');
        }
        const original=Storage.prototype.setItem;
        Storage.prototype.setItem=function(key,value){
          if(key===localStorage.getItem('qa-block-room')&&localStorage.getItem('@yoki/balance_journal_v1'))throw new DOMException('QA ownership failure','QuotaExceededError');
          return original.call(this,key,value);
        };
      },item);
      const base='http://127.0.0.1:'+server.address().port;
      await page.goto(base);
      const open=async()=>{await page.getByTestId('home-more-menu').click();await page.getByText('部屋の模様替え',{exact:true}).click();};
      await open();
      const buy=()=>item.id==='egg'?page.getByText('1000 pt で迎える',{exact:true}):page.getByRole('button',{name:item.name+' '+item.cost+'ポイント',exact:true});
      const owned=()=>item.id==='egg'?page.getByText('一緒に暮らしています',{exact:true}):page.getByRole('button',{name:item.name+' 使用中',exact:true});
      const key=item.id==='egg'?'@mentore/companions_v1':'@mentore/room_customization_v1';
      await page.evaluate(key=>localStorage.setItem('qa-block-room',key),key);
      await buy().click();await page.getByText('保存できませんでした。もう一度お試しください。',{exact:true}).waitFor();
      assert.equal(await owned().count(),0);
      assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('@mentore/feed_state_v1')).points),0);
      if(mode==='restart'){await page.reload();await page.getByText('もう一度読み込む',{exact:true}).waitFor();}
      await page.evaluate(()=>localStorage.removeItem('qa-block-room'));
      if(mode==='restart'){await page.getByText('もう一度読み込む',{exact:true}).click();await page.getByText('もう一度読み込む',{exact:true}).waitFor({state:'hidden'});await open();}
      else await buy().click();
      await owned().waitFor();
      const verify=async()=>{
        const snapshot=await page.evaluate(()=>({feed:JSON.parse(localStorage.getItem('@mentore/feed_state_v1')),room:JSON.parse(localStorage.getItem('@mentore/room_customization_v1')),egg:JSON.parse(localStorage.getItem('@mentore/companions_v1')),journal:localStorage.getItem('@yoki/balance_journal_v1')}));
        assert.equal(snapshot.feed.points,0);assert.equal(snapshot.journal,null);
        if(item.id==='egg')assert.equal(snapshot.egg.extraEggs,1);
        else assert.deepEqual(snapshot.room[item.id==='pink'?'ownedFlowers':'ownedFurniture'],[item.id]);
      };
      await verify();await page.reload();await page.getByTestId('room-resident').waitFor();await open();await owned().waitFor();await verify();
      assert.deepEqual(errors,[]);await page.close();console.log('PASS '+item.id+' '+mode+': exact-balance purchase, ownership recovery, no duplicate debit and reload');
    }
  }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
