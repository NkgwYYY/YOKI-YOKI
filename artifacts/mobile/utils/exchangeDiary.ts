import type {DailyRecord,FeedState,UserProgress} from '../contexts/AppContext';
import type {MascotStage} from './mascotUtils';
import type {StorageEntry} from './recoverableStorage';
import {prepareDailyRecord,RECORD_KEYS} from './dailyRecordTransaction';

export const DIARY_TEXT_LIMIT=1600;
export type DiaryLetter={title:string;body:string;feeling:string;source:string};
export type DiaryDetails={sleep:number;sleepRecorded:boolean;behaviors:string[];notes:string;exercise?:number;meal?:number;social?:number;win?:string;activities?:Record<string,number>};
export function diaryDetailsFromRecord(record?:Partial<DailyRecord>):DiaryDetails {
 return {sleep:record?.sleep??0,sleepRecorded:record?record.sleepRecorded!==false:false,behaviors:[...(record?.behaviors??[])],notes:record?.notes??'',exercise:record?.exercise,meal:record?.meal,social:record?.social,win:record?.win,activities:record?.activities};
}
function validateDetails(d:DiaryDetails){
 if(!d||!Number.isFinite(d.sleep)||d.sleep<0||d.sleep>12||typeof d.sleepRecorded!=='boolean'||!Array.isArray(d.behaviors)||d.behaviors.length>30||d.behaviors.some(v=>typeof v!=='string'||v.length>100)||typeof d.notes!=='string'||d.notes.length>10000||[d.exercise,d.meal,d.social].some(v=>v!==undefined&&(!Number.isInteger(v)||v<1||v>3))||(d.win!==undefined&&(typeof d.win!=='string'||d.win.length>60))||(d.activities!==undefined&&(!d.activities||typeof d.activities!=='object'||Array.isArray(d.activities)||Object.values(d.activities).some(v=>!Number.isFinite(v)||v<0))))throw Error('詳しい記録の内容を確認してね');
}
export type DiaryPage={date:string;name:string;stage:MascotStage;letter:DiaryLetter;revision:number;letterReadAt?:number;user?:{text:string;mood:number;savedAt:number;submissionId:string;details?:DiaryDetails};reply?:string};
export type ExchangeDiaryState={pages:Record<string,DiaryPage>};
export type DiaryOperation={kind:'open';date:string}|{kind:'read';date:string}|{kind:'send';date:string;id:string;revision:number;text:string;mood:number;details?:DiaryDetails};
export type DiaryResult={page:DiaryPage;changed:boolean};
/** Only today's exchange needs attention; missed days never build up a backlog. */
export function diaryAttention(state:ExchangeDiaryState|undefined,today:string){
 const page=state?.pages[today];
 const unwritten=!page?.user,unread=!Number.isFinite(page?.letterReadAt);
 return {unwritten,unread,pending:unwritten||unread};
}
const stories:readonly DiaryLetter[]=[
 {title:'雲のパン屋さん',feeling:'のんびり',source:'clouds',body:'今日は噴水のそばで、雲を眺めていたよ。丸いパンみたいな雲を見つけて、ちょっとおなかがすいた。\nもう一度見たら、長いお魚になっていたんだ。空のパン屋さんは、気まぐれだね。'},
 {title:'小さな勇気',feeling:'ちょっと、どきどき',source:'hello',body:'いつもすれ違う村の子に、今日は自分から「こんにちは」って言ってみたよ。声が小さくなっちゃったけど、手を振り返してくれた。\n帰り道、なんだかいつもより足が軽かったな。'},
 {title:'ひと休みも、一日',feeling:'ほっとした',source:'rest',body:'今日はお出かけしようと思ったけど、窓辺でうとうとしてしまった。気づいたら、床の日なたが少し移動していたよ。\n何かを見つけた日も好きだけど、こんな静かな日も好きだな。'},
 {title:'ころんだ先の発見',feeling:'びっくり、のち、にっこり',source:'flower',body:'広場の石畳で、つまずいてころんと転がっちゃった。ちょっとびっくりしたけど、起き上がるときに小さな花を見つけたよ。\n石のすきまから咲いていたんだ。明日もそこを通ってみようかな。'},
 {title:'雨あがりの鏡',feeling:'わくわく',source:'puddle',body:'水たまりに空が映っていたから、そっとのぞいてみたよ。顔を近づけたら、水の中の自分と目が合った。\n葉っぱを一枚浮かべたら、小さな船みたい。しばらく航海を見守ったんだ。'},
 {title:'うまく結べないリボン',feeling:'少し、くやしい',source:'ribbon',body:'小さな包みにリボンを結んでみたけど、何度やっても片方だけ長くなるんだ。\n今日はちょっと休憩。ほどいたリボンを丸めたら、お花みたいになったよ。これはこれで、かわいいかも。'},
 {title:'ラーメン屋さんの湯気',feeling:'ぽかぽか',source:'ramen',body:'赤い提灯の下を通ったら、お店からいいにおいがしたよ。店長が鍋をかき混ぜるたびに、白い湯気がふわっと広がっていた。\nあたたかいものって、見ているだけでも少しうれしくなるね。'},
 {title:'名前のない宝物',feeling:'うれしい',source:'stone',body:'道ばたで、すべすべの小石を拾ったよ。片側だけ、ほんのり紫色なんだ。\n窓辺に置いてみたら、光の向きで色が変わって見えた。今日の宝物として、しばらく飾っておこうと思う。'},
 {title:'ちがう道を通ったら',feeling:'ちょっと冒険',source:'detour',body:'今日はいつも曲がらない角を曲がってみたよ。知らない大きな町に出るかと思ったら、いつもの噴水の裏側に出たんだ。\n同じ場所でも、違うところから見ると新鮮だね。'},
 {title:'猫のくしゃみ',feeling:'くすっとした',source:'cat',body:'占いの館の前で、大きな猫さんがくしゃみをしたよ。立派なひげが、ぴくんって動いた。\n笑いそうになったら、猫さんも目を細めていた。内緒の挨拶をした気分だったよ。'},
 {title:'風の音を集めた日',feeling:'しずかな気持ち',source:'wind',body:'木の下で耳をすませると、葉っぱがさらさら鳴っていたよ。噴水の音も、誰かの足音も、少しずつ違うんだね。\n今日はその音を聞きながら、ゆっくり帰ってきたよ。'},
 {title:'半分こしたおやつ',feeling:'あたたかい気持ち',source:'snack',body:'村の子がおやつを半分わけてくれたよ。どっちが大きいかなって見比べて、二人で笑っちゃった。\n一口ずつ大事に食べたら、いつもより長くおいしかった気がする。'},
 {title:'ふしぎな影',feeling:'おもしろかった',source:'shadow',body:'夕方の道で、自分の影がびっくりするくらい長くなっていたよ。手を上げると、影も同じように手を上げるんだ。\n大きな自分と小さな自分で、並んで帰ってきたよ。'},
 {title:'あと一歩だった日',feeling:'くやしいけど、また今度',source:'reach',body:'ひらひら落ちてくる葉っぱを、空中でつかまえようとしたんだ。あと少しのところで、風に持っていかれちゃった。\nでも、追いかけていたら体がぽかぽかしたよ。次は一枚つかまえたいな。'},
];
function serial(date:string){return Math.floor(Date.parse(`${date}T12:00:00Z`)/86400000);}
function validDate(date:string){return /^\d{4}-\d{2}-\d{2}$/.test(date)&&Number.isFinite(serial(date))&&new Date(`${date}T12:00:00Z`).toISOString().slice(0,10)===date;}
/** A fictional day in the character's world, frozen when this page is first opened. */
export function makeDiaryLetter(date:string,feed:FeedState):DiaryLetter{
 const plaza=feed.plazaEvents;
 const meeting=plaza?.lastEncounter?.date===date?plaza.lastEncounter.encounter:plaza?.day===date?plaza.current:undefined;
 if(meeting?.outcome?.choice==='accept'){
  if(meeting.kind==='balloon')return {title:'赤い風船が戻った日',feeling:'ほっとした',source:'plaza-balloon',body:'今日は広場で、木に引っかかった風船を取ったね。あの子が風船をぎゅっと抱きしめた顔、まだ覚えているよ。\nお礼をもらえたのもうれしかったけど、あの笑顔を見られたことが、今日のいちばんの思い出なんだ。'};
  if(meeting.kind==='scammer')return {title:'ちょっと残念なできごと',feeling:'しょんぼり',source:'plaza-scammer',body:'広場のおじさん、戻ってこなかったね。いい話だと思ったから、少ししょんぼりしたよ。\n今日はあたたかいお茶でも飲んで、ひと休みしようと思う。残念な日のできごとも、このノートに置いておけるといいな。'};
  if(meeting.kind==='lost')return {title:'見つかった、大切なもの',feeling:'うれしい',source:'plaza-lost',body:'あの花のブローチ、おばあさんにとって大切な思い出だったんだね。手のひらにのせて、じっと見ていたよ。\n見つけたときは小さな落とし物だったけど、帰る場所がある宝物だったんだ。'};
  return {title:'地図のつづき',feeling:'にっこり',source:'plaza-traveler',body:'道に迷っていた旅人さん、無事にラーメン屋さんへ着いたかな。地図を逆さにしていたの、ちょっと自分に似ている気がしたよ。\n今度会ったら、何を食べたのか聞いてみたいな。'};
 }
 return {...stories[((serial(date)%stories.length)+stories.length)%stories.length]};
}
export function diaryReply(mood:number,date:string,text:string){
 const variant=Math.abs(serial(date))%3;
 const opening=text.trim()?['今日のことを分けてくれて、ありがとう。','あなたのページ、ゆっくり読んだよ。','言葉にして届けてくれて、ありがとう。'][variant]:'今日の気分、受け取ったよ。言葉が出ない日も、この一ページは残しておこうね。';
 const endings:Record<number,readonly string[]>={
  1:['いまは無理に明るくしなくていいよ。ここでは、そのままでいてね。','つらい気持ちのままでも大丈夫。今日は少し、ひと休みしよう。','今日はうまくまとめなくてもいいよ。一緒に静かに過ごそう。'],
  2:['しんどい日は、いつもよりゆっくりの歩幅でいこう。','今夜は少し、肩の力を抜ける時間があるといいな。','今日はここで、一息ついていってね。'],
  3:['特別なことがない日も、こうして分け合えるのがうれしいな。','何気ない一日も、このノートに並ぶと大切な思い出になるね。','今日のあなたのことを少し知れて、うれしいよ。'],
  4:['いい感じの日を、一緒にこのノートにはさんでおこう。','その気分、少し分けてもらった気がするよ。','今日のページを読み返すのが、楽しみになったよ。'],
  5:['うれしい気持ちを聞けて、こちらまでにっこりしちゃった。','そのうれしさ、今日のページに大事に残しておこうね。','今日は二人分の「うれしい」を、このノートにしまっておこう。'],
 };
 return `${opening}\n${endings[mood][variant]}`;
}
export function prepareDiary(values:Record<string,string|null>,op:DiaryOperation,today:string,yesterday:string,now:number,defaults:{feed:FeedState;progress:UserProgress},character:{name:string;stage:MascotStage},foodPoints:number){
 if(!validDate(op.date)||!validDate(today)||op.date>today||!Number.isFinite(now))throw Error('日記の日付を確認できません');
 const feed:FeedState=values[RECORD_KEYS.feed]?JSON.parse(values[RECORD_KEYS.feed]!):defaults.feed;
 if(!feed||!Number.isFinite(feed.points)||feed.points<0)throw Error('保存済みのデータを確認できません');
 const pages=feed.exchangeDiary?.pages??{};
 if(!pages||typeof pages!=='object'||Array.isArray(pages)||Object.entries(pages).some(([date,p])=>!p||p.date!==date||!p.letter?.body||!Number.isSafeInteger(p.revision)||p.revision<0))throw Error('交換日記の記録を確認できません');
 const previous=pages[op.date];
 let page=previous;
 let record:ReturnType<typeof prepareDailyRecord>['result']|null=null;
 if(op.kind==='open'){
  if(!previous){
   if(op.date!==today)throw Error('この日には、まだ日記がありません');
   page={date:op.date,name:character.name.trim()||'よっきー',stage:character.stage,letter:makeDiaryLetter(op.date,feed),revision:0};
  }
 }else if(op.kind==='read'){
  if(!previous)throw Error('先に日記のページを開いてね');
  if(!Number.isFinite(previous.letterReadAt))page={...previous,letterReadAt:now};
 }else{
  if(!previous)throw Error('先に今日のページを開いてね');
  if(!op.id||op.id.length>100||typeof op.text!=='string'||op.text.length>DIARY_TEXT_LIMIT||!Number.isInteger(op.mood)||op.mood<1||op.mood>5)throw Error('日記の内容を確認してね');
  if(op.details!==undefined)validateDetails(op.details);
  if(previous.user?.submissionId!==op.id){
   if(previous.revision!==op.revision)throw Error('別の画面で日記が更新されました。内容をコピーしてから、ページを開き直してください。');
   page={...previous,revision:previous.revision+1,user:{text:op.text.trim(),mood:op.mood,savedAt:now,submissionId:op.id,details:op.details??previous.user?.details},reply:diaryReply(op.mood,op.date,op.text)};
   // Preserve the original detailed journal fields. The existing daily receipt owns rewards.
   // A page left open across midnight can still be saved, without backdating today's progress.
   if(op.date===today){
    const records:DailyRecord[]=values[RECORD_KEYS.records]?JSON.parse(values[RECORD_KEYS.records]!):[];
    if(!Array.isArray(records))throw Error('今日の記録を確認できません');
    const r=records.find(r=>r.date===today);
    const d=op.details??diaryDetailsFromRecord(r);
    record=prepareDailyRecord(values,{today,yesterday,mood:op.mood,sleep:d.sleep,behaviors:d.behaviors,notes:d.notes,extras:{...r,...d}},defaults,foodPoints,new Date(now)).result;
    page.user!.details=diaryDetailsFromRecord(record.records.find(r=>r.date===today));
   }
  }
 }
 const changed=page!==previous;
 // A retry can recover the journal before this callback; return the committed
 // record snapshot as well, without running the reward or overwriting later edits.
 if(!changed&&op.kind==='send'&&op.date===today){
  const read=(key:string)=>values[key]?JSON.parse(values[key]!):null;
  const records=read(RECORD_KEYS.records),progress=read(RECORD_KEYS.progress),energy=read(RECORD_KEYS.energy),badges=read(RECORD_KEYS.badges);
  if(!Array.isArray(records)||!progress||!energy||!Array.isArray(badges))throw Error('保存した日記を確認できません。もう一度ページを開いてね。');
  if(!feed.happiness)throw Error('保存済みの気分を確認できません');
  record={records,progress,energy,badges,feed:{...feed,happiness:feed.happiness},newestBadge:null,gainedEnergy:0};
 }
 const next=changed?{...(record?.feed??feed),exchangeDiary:{pages:{...pages,[op.date]:page!}}}:feed;
 const entries:StorageEntry[]=changed?[[RECORD_KEYS.feed,JSON.stringify(next)]]:[];
 if(record){
  entries.push([RECORD_KEYS.records,JSON.stringify(record.records)],[RECORD_KEYS.progress,JSON.stringify(record.progress)],[RECORD_KEYS.energy,JSON.stringify(record.energy)],[RECORD_KEYS.badges,JSON.stringify(record.badges)]);
 }
 return {entries:entries.filter(([k,v])=>values[k]!==v),result:{feed:next,page:page!,changed,record}};
}
