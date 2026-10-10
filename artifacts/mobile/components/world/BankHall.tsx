import React,{useEffect,useRef,useState} from 'react';
import {AppState,Image,Pressable,StyleSheet,Text,TextInput,View} from 'react-native';
import {useApp} from '@/contexts/AppContext';
import {useAuth} from '@/contexts/AuthContext';
import {BottomSheet} from '@/components/ui/BottomSheet';
import {WorldPill} from './WorldPill';
import {MERCHANT_ART} from '@/utils/worldArt';
import {BANK_CAPACITY,BANK_ENTRY_LABEL,readBankState,type BankOperation,type BankEntry,type BankState} from '@/utils/villageBank';
import {getTodayDate} from '@/utils/dateUtils';

function entryCopy(e:BankEntry){
 if(e.kind==='failure')return `失った預金 ${-e.amount}pt · 手元に${e.returned}pt返還`;
 if(e.kind==='robbery')return `預金の10％、${-e.amount}ptが被害に。手元のポイントは無事です。`;
 if(e.kind==='bonus')return `今日は好景気。特別に2％の利息、＋${e.amount}pt。`;
 return e.amount===0?'1pt未満の利息は繰り越しています。':`預金に ＋${e.amount}pt の利息がつきました。`;
}
export function BankHall({onClose}:{onClose:()=>void}){
 const {feedState,runBank,isLoading}=useApp(),{user,isSignedIn,isLoading:authLoading}=useAuth();
 const account=authLoading?'loading':isSignedIn?`user:${user?.id??'pending'}`:'guest';
 const owner=useRef(account);owner.current=account;
 const alive=useRef(true),pending=useRef(false),command=useRef<BankOperation|null>(null);
 const [ready,setReady]=useState(false),[busy,setBusy]=useState(false),[retry,setRetry]=useState(false);
 const [mode,setMode]=useState<'deposit'|'withdraw'|'history'>('deposit'),[amount,setAmount]=useState('50'),[message,setMessage]=useState(''),[error,setError]=useState(''),[today,setToday]=useState(getTodayDate);
 let bank:BankState|undefined;try{bank=readBankState(feedState.bank);}catch{/* The refresh error keeps transactions disabled for a damaged record. */}
 const balance=bank?.balance??0,closed=bank?.closedOn===today;
 const max=mode==='withdraw'?balance:Math.min(feedState.points,BANK_CAPACITY-balance);
 const value=/^[0-9]+$/.test(amount)?Number(amount):0;
 const news=[...(bank?.history??[])].reverse().find(e=>!['deposit','withdraw'].includes(e.kind));
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 useEffect(()=>{
  let live=true,timer:ReturnType<typeof setTimeout>;
  pending.current=false;command.current=null;setReady(false);setBusy(false);setRetry(false);setError('');setMessage('');
  if(isLoading||authLoading)return;
  const refresh=async()=>{
   if(!live||pending.current)return;
   pending.current=true;setBusy(true);
   try{const result=await runBank({kind:'sync'});if(live&&owner.current===account){setReady(true);setToday(getTodayDate());setError('');if(result.report.days)setMessage(result.message);}}
   catch(e){if(live)setError(e instanceof Error?e.message:'通帳を読み込めませんでした。');}
   finally{if(live){pending.current=false;setBusy(false);}}
  };
  const schedule=()=>{const now=new Date(),midnight=new Date(now);midnight.setHours(24,0,1,0);timer=setTimeout(()=>{void refresh();schedule();},midnight.getTime()-now.getTime());};
  void refresh();schedule();
  const listener=AppState.addEventListener('change',s=>{if(s==='active')void refresh();});
  return()=>{live=false;clearTimeout(timer);listener.remove();};
 },[account,runBank,isLoading,authLoading]);
 const submit=async()=>{
  if(pending.current||isLoading||authLoading)return;
  const scope=account;
  if(!command.current){
   if(!ready||!bank||mode==='history'||value<1||value>max||!Number.isSafeInteger(value))return;
   command.current={kind:mode,amount:value,id:`bank-${Date.now()}-${Math.random().toString(36).slice(2,12)}`,revision:bank.revision};
  }
  pending.current=true;setBusy(true);setError('');setMessage('');
  try{
   const result=await runBank(command.current);
   if(alive.current&&owner.current===scope){command.current=null;setRetry(false);setToday(getTodayDate());setMessage(result.message);if(result.ok)setAmount('');}
  }catch(e){if(alive.current&&owner.current===scope){setRetry(true);setError(e instanceof Error?e.message:'保存できませんでした。同じ取引を確認してください。');}}
  finally{if(alive.current&&owner.current===scope){pending.current=false;setBusy(false);}}
 };
 const reread=async()=>{
  if(pending.current)return;pending.current=true;setBusy(true);const scope=account;
  try{await runBank({kind:'sync'});if(alive.current&&owner.current===scope){setReady(true);setError('');setToday(getTodayDate());}}
  catch(e){if(alive.current&&owner.current===scope)setError(e instanceof Error?e.message:'読み込めませんでした。');}
  finally{if(alive.current&&owner.current===scope){pending.current=false;setBusy(false);}}
 };
 const locked=busy||!ready||retry;
 return <BottomSheet visible title="こもれび銀行" subtitle="少しずつ預けて、村の明日を楽しみに。" onClose={()=>{if(!pending.current)onClose();}}>
  <View style={s.welcome}><Image source={MERCHANT_ART.bank} resizeMode="contain" style={{width:76,height:86}}/><View style={{flex:1,gap:6}}><Text style={s.kicker}>KOMOREBI BANK</Text><Text style={s.copy}>{closed?'本日は預金整理のため休業中です。返還分は手元に戻りました。明日から営業を再開します。':'いらっしゃい。大切なポイントを、通帳に記しておくね。'}</Text></View></View>
  <View style={s.balance}><Text style={s.label}>お預かり残高</Text><Text testID="bank-balance" style={s.total}>{balance.toLocaleString()} <Text style={s.unit}>pt</Text></Text><View style={s.rule}/><Text testID="bank-wallet" style={s.copy}>手元のポイント　{feedState.points.toLocaleString()} pt</Text><Text style={s.note}>これまでの利息 ＋{(bank?.interestEarned??0).toLocaleString()}pt　／　被害 −{(bank?.lost??0).toLocaleString()}pt</Text></View>
  {!!news&&<View testID="bank-news" style={[s.news,(news.kind==='failure'||news.kind==='robbery')&&s.incident]}><Text style={s.kicker}>{news.date}　銀行だより</Text><Text style={s.newsTitle}>{BANK_ENTRY_LABEL[news.kind]}</Text><Text style={s.copy}>{entryCopy(news)}</Text></View>}
  <View style={s.tabs}>{([['deposit','預ける'],['withdraw','引き出す'],['history','通帳']] as const).map(([kind,label])=><Pressable key={kind} testID={`bank-tab-${kind}`} accessibilityRole="button" accessibilityState={{selected:mode===kind,disabled:locked}} disabled={locked} onPress={()=>{setMode(kind);setAmount('');setMessage('');}} style={[s.tab,mode===kind&&s.selected]}><Text style={[s.tabText,mode===kind&&{color:'#F8E8BF'}]}>{label}</Text></Pressable>)}</View>
  {mode==='history'?<View testID="bank-history" style={{gap:4}}>
   {(bank?.history.length??0)===0?<Text style={s.copy}>まだ取引はありません。少しだけ預けてみよう。</Text>:[...(bank?.history??[])].reverse().map(e=><View key={e.seq} style={s.entry}><View style={{flex:1,gap:5}}><Text style={s.note}>{e.date} · No.{e.seq}</Text><Text style={s.copy}>{BANK_ENTRY_LABEL[e.kind]}</Text>{e.kind==='failure'&&<Text style={s.note}>手元に {e.returned}pt 返還</Text>}<Text style={s.note}>預金残高 {e.balance.toLocaleString()}pt</Text></View><Text style={[s.delta,{color:e.amount<0?'#F1B4A8':'#EED298'}]}>{e.amount>0?'＋':e.amount<0?'−':''}{Math.abs(e.amount).toLocaleString()}pt</Text></View>)}
   <Text style={s.note}>通帳は直近80件。利息と被害の合計は、全期間の記録です。</Text>
  </View>:<View style={{gap:12}}>
   <Text style={s.label}>{mode==='deposit'?'預けるポイント':'引き出すポイント'}</Text>
   <View style={s.amountRow}><TextInput testID="bank-amount" accessibilityLabel={mode==='deposit'?'預けるポイント数':'引き出すポイント数'} value={amount} onChangeText={setAmount} keyboardType="number-pad" inputMode="numeric" maxLength={7} editable={!locked} placeholder="ポイント数" placeholderTextColor="#A394AD" style={s.input}/><Text style={s.unit}>pt</Text></View>
   <View style={s.choices}>{[50,100].map(n=><Pressable key={n} testID={`bank-amount-${n}`} accessibilityRole="button" disabled={locked||n>max} onPress={()=>setAmount(String(n))} style={[s.quick,(locked||n>max)&&{opacity:.4}]}><Text style={s.copy}>{n}pt</Text></Pressable>)}<Pressable accessibilityRole="button" testID="bank-amount-all" disabled={locked||max<1} onPress={()=>setAmount(String(max))} style={[s.quick,(locked||max<1)&&{opacity:.4}]}><Text style={s.copy}>全部</Text></Pressable></View>
   {max===0?<Text style={s.note}>{mode==='withdraw'?'まだ預金がありません。':balance===BANK_CAPACITY?'預金は上限に達しています。':'手元にポイントがありません。'}</Text>:!!amount&&(!value||value>max)&&<Text style={s.note}>1〜{max.toLocaleString()}ptの整数で入力してください。</Text>}
   {mode==='deposit'&&<View testID="bank-terms" style={s.terms}><Text style={s.label}>預ける前に</Text><Text style={s.copy}>通常は1日1％の利息。好景気の日は2％。{`\n`}強盗に遭うと預金の10％を失います。経営破綻では25％を失い、75％が手元に戻ります。</Text><Text style={s.note}>1日ごとの確率：通常92％・好景気3％・強盗4％・破綻1％。事件の日は利息なし。手元のポイントは被害を受けません。</Text></View>}
   <WorldPill testID="bank-submit" primary icon={mode==='deposit'?'download':'upload'} label={busy?'記帳中…':mode==='deposit'?closed?'今日は預金整理のため休業':`${value>0?value.toLocaleString()+'ptを':''}預ける`:`${value>0?value.toLocaleString()+'ptを':''}引き出す`} disabled={locked||value<1||value>max||(mode==='deposit'&&closed)} onPress={()=>void submit()}/>
   <Text style={s.note}>翌日から日付が変わるごとに計算します。閉じていた間も同じルールです。1pt未満の利息は繰り越し。引き出し手数料なし・預金上限100万pt。</Text>
  </View>}
  {!!message&&<Text testID="bank-feedback" accessibilityLiveRegion="polite" style={s.message}>{message}</Text>}
  {!!error&&<Text accessibilityRole="alert" style={s.error}>{error}</Text>}
  {retry&&<WorldPill testID="bank-retry" label="同じ取引の保存を確認する" disabled={busy} onPress={()=>void submit()}/>}
  {!ready&&!!error&&<WorldPill label="通帳を読み直す" disabled={busy} onPress={()=>void reread()}/>}
  <Text style={[s.note,{marginTop:16}]}>YOKIポイントだけを使う、村の銀行のゲーム内ルールです。</Text>
 </BottomSheet>;
}
const s=StyleSheet.create({
 welcome:{flexDirection:'row',alignItems:'center',gap:14,marginBottom:16},kicker:{fontSize:10,letterSpacing:1.5,color:'#CCB583'},copy:{fontSize:13,lineHeight:23,color:'#E4D8EE'},label:{fontSize:12,color:'#DACAA8',fontWeight:'600'},note:{fontSize:11,lineHeight:19,color:'#BDB0C8'},
 balance:{padding:20,gap:9,borderWidth:1,borderColor:'#B99F6266',borderRadius:14,backgroundColor:'#30263F'},total:{fontSize:37,lineHeight:45,fontWeight:'600',color:'#F3DCAB'},unit:{fontSize:16,color:'#D4BF97'},rule:{height:1,backgroundColor:'#AC976744',marginVertical:2},
 news:{marginTop:14,padding:15,gap:5,borderRadius:12,backgroundColor:'#3D3745'},incident:{backgroundColor:'#493138'},newsTitle:{fontSize:17,fontWeight:'600',color:'#F3DFC6'},tabs:{flexDirection:'row',gap:4,marginVertical:20,backgroundColor:'#191321',padding:4,borderRadius:10},tab:{flex:1,minHeight:44,justifyContent:'center',alignItems:'center',borderRadius:7},selected:{backgroundColor:'#594768'},tabText:{fontSize:13,color:'#BDB0C8'},
 amountRow:{flexDirection:'row',alignItems:'center',gap:12},input:{flex:1,minHeight:52,borderRadius:9,borderWidth:1,borderColor:'#A48BB4',paddingHorizontal:14,color:'#F6EDD9',fontSize:22,backgroundColor:'#17121E'},choices:{flexDirection:'row',gap:8},quick:{flex:1,minHeight:44,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:'#83718C',borderRadius:8},terms:{padding:14,gap:7,backgroundColor:'#302836',borderRadius:10,borderLeftWidth:3,borderLeftColor:'#C8AA70'},
 entry:{flexDirection:'row',gap:14,paddingVertical:14,borderBottomWidth:1,borderColor:'#A998BC30'},delta:{fontSize:15,fontWeight:'600',marginTop:23},message:{color:'#EBD4A6',fontSize:13,lineHeight:23,marginTop:16},error:{fontSize:13,lineHeight:23,color:'#F1B4A8',marginVertical:12},
});
