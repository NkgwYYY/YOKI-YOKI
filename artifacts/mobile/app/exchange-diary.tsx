import React,{useEffect,useRef,useState} from 'react';
import {ActivityIndicator,Image,KeyboardAvoidingView,Platform,Pressable,ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';
import {useRouter} from 'expo-router';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useApp} from '@/contexts/AppContext';
import {useAuth} from '@/contexts/AuthContext';
import {useItems,resolveItemAssetUrl} from '@/contexts/ItemContext';
import {StaticMascot} from '@/components/Mascot';
import {BottomSheet} from '@/components/ui/BottomSheet';
import {Icon} from '@/components/ui/Icon';
import {getTodayDate,formatDateJP} from '@/utils/dateUtils';
import {getMascotStage,getCharacter} from '@/utils/mascotUtils';
import {roomWearableFrame} from '@/utils/roomWearable';
import {DIARY_TEXT_LIMIT} from '@/utils/exchangeDiary';

const moods=[{value:1,label:'つらい',icon:'cloud-lightning'},{value:2,label:'しんどい',icon:'cloud-rain'},{value:3,label:'ふつう',icon:'cloud'},{value:4,label:'いい感じ',icon:'sunrise'},{value:5,label:'うれしい',icon:'sun'}] as const;
type Draft={text:string;mood:number|null;revision:number;id:string};
export default function ExchangeDiaryScreen(){
 const {isLoading,cloudSynced}=useApp();
 const {user,isSignedIn,isLoading:authLoading}=useAuth();
 const ready=!isLoading&&!authLoading&&(!isSignedIn||cloudSynced);
 return ready?<DiaryNotebook key={user?.id??'guest'}/>:<View style={[s.root,s.loading]}><ActivityIndicator color="#8C74A3"/><Text style={s.hint}>日記を開いています…</Text></View>;
}
function DiaryNotebook(){
 const router=useRouter(),insets=useSafeAreaInsets();
 const {feedState,runDiary,mascotName,progress,getTodayRecord}=useApp();
 const {items,shopState}=useItems();
 const [today]=useState(getTodayDate),[date,setDate]=useState(getTodayDate);
 const [side,setSide]=useState<'character'|'user'>('character');
 const [shelf,setShelf]=useState(false),[editing,setEditing]=useState(false),[draft,setDraft]=useState<Draft|null>(null);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const pending=useRef(false),alive=useRef(true),scroll=useRef<ScrollView>(null);
 const pages=feedState.exchangeDiary?.pages??{},page=pages[date];
 const dates=Object.keys(pages).sort().reverse(),index=dates.indexOf(date);
 const mine=date===today,name=page?.name||mascotName||'よっきー';
 const stage=page?.stage??getMascotStage(progress.level);
 const wear=items.find(i=>i.id===(shopState.equipped.wear??shopState.equipped.accessory));
 const placement=wear?shopState.placements[wear.id]:undefined;
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 const open=async()=>{
  if(pending.current)return;pending.current=true;setBusy(true);setError('');
  try{await runDiary({kind:'open',date:today});}
  catch(e){if(alive.current)setError(e instanceof Error?e.message:'日記を開けませんでした。もう一度試してね。');}
  finally{pending.current=false;if(alive.current)setBusy(false);}
 };
 useEffect(()=>{void open();},[]);
 useEffect(()=>{
  if(page&&mine&&!draft)setDraft({text:page.user?.text??'',mood:page.user?.mood??getTodayRecord()?.mood??null,revision:page.revision,id:''});
 },[page,mine,draft]);
 const turn=(next:'character'|'user')=>{setSide(next);setNotice('');scroll.current?.scrollTo({y:0,animated:false});};
 const chooseDate=(next:string)=>{setDate(next);setSide('character');setShelf(false);setError('');setNotice('');scroll.current?.scrollTo({y:0,animated:false});};
 const edit=()=>{if(!page)return;setDraft({text:page.user?.text??'',mood:page.user?.mood??getTodayRecord()?.mood??null,revision:page.revision,id:''});setEditing(true);};
 const update=(patch:Partial<Draft>)=>setDraft(d=>d?{...d,...patch,id:''}:d);
 const send=async()=>{
  if(pending.current||!page||!draft||draft.mood===null||!mine)return;
  const id=draft.id||`diary-${Date.now()}-${Math.random().toString(36).slice(2,9)}`;
  const outgoing={...draft,id};setDraft(outgoing);pending.current=true;setBusy(true);setError('');
  try{
   const result=await runDiary({kind:'send',date,id,revision:draft.revision,text:draft.text,mood:draft.mood});
   if(alive.current){setDraft({text:result.page.user!.text,mood:result.page.user!.mood,revision:result.page.revision,id:''});setEditing(false);setNotice('ふたりの一日を、このページに残したよ。');scroll.current?.scrollTo({y:0,animated:false});}
  }catch(e){if(alive.current)setError(e instanceof Error?e.message:'保存できませんでした。書いた内容はそのままです。もう一度渡してね。');}
  finally{pending.current=false;if(alive.current)setBusy(false);}
 };
 const hasDraft=!!draft&&(draft.text!==(pages[today]?.user?.text??'')||draft.mood!==(pages[today]?.user?.mood??getTodayRecord()?.mood??null));
 const [leaveOpen,setLeaveOpen]=useState(false);
 const goHome=()=>{if(hasDraft){setLeaveOpen(true);return;}router.navigate('/(tabs)');};
 const dateButton=(direction:'older'|'newer')=>{
  const target=dates[index+(direction==='older'?1:-1)];
  return <Pressable accessibilityRole="button" accessibilityLabel={direction==='older'?'前の日記':'次の日記'} disabled={!target||busy} onPress={()=>chooseDate(target)} style={s.iconButton}><Icon name={direction==='older'?'chevron-left':'chevron-right'} size={20} color={target?'#6D547F':'#BFB1C8'}/></Pressable>;
 };
 return <KeyboardAvoidingView style={s.root} behavior={Platform.OS==='ios'?'padding':undefined}>
  <View style={[s.top,{paddingTop:Math.max(insets.top,12)}]}><Pressable testID="diary-home" accessibilityRole="button" onPress={goHome} disabled={busy} style={s.topButton}><Icon name="chevron-left" color="#E4D4EA" size={18}/><Text style={s.topText}>おうち</Text></Pressable><Text style={s.topName}>ふたりの交換日記</Text><Pressable testID="diary-history" accessibilityRole="button" accessibilityLabel="これまでの交換日記を開く" disabled={busy} onPress={()=>setShelf(true)} style={s.topButton}><Icon name="book-open" color="#E4D4EA" size={18}/><Text style={s.topText}>本棚</Text></Pressable></View>
  <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" contentContainerStyle={[s.content,{paddingBottom:Math.max(insets.bottom,20)+20}]}>
   <View style={s.intro}><Text style={s.eyebrow}>OUR LITTLE DAYS</Text><Text style={s.title}>{name}と、今日を分け合う。</Text><Text style={s.hint}>大きなできごとも、何もなかった日も。</Text></View>
   <View style={s.dateRow}>{dateButton('older')}<Text testID="diary-date" style={s.date}>{date.slice(0,4)}年 {formatDateJP(date)}</Text>{dateButton('newer')}</View>
   <View style={s.tabs}>{(['character','user'] as const).map(value=><Pressable key={value} testID={`diary-tab-${value}`} accessibilityRole="tab" accessibilityState={{selected:side===value}} onPress={()=>turn(value)} style={[s.tab,side===value&&s.tabSelected]}><Text style={[s.tabText,side===value&&s.tabTextSelected]}>{value==='character'?`${name}のページ`:'あなたのページ'}{value==='user'&&page?.user?' ✓':''}</Text></Pressable>)}</View>
   {!page?<View style={s.paper}><Text style={s.body}>{busy?'今日のページを開いています…':'まだページを開けていません。'}</Text>{!busy&&<Pressable accessibilityRole="button" onPress={()=>{void open();}} style={s.primary}><Text style={s.primaryText}>もう一度開く</Text></Pressable>}</View>
   :side==='character'?<>
    <View testID="diary-character-page" style={s.paper}>
     <View pointerEvents="none" style={s.marginLine}/>
     <View style={s.author}><View style={s.portrait}><StaticMascot stage={stage} mood="happy" size={76}/>{wear?.assetUrl&&<Image source={{uri:resolveItemAssetUrl(wear.assetUrl)}} resizeMode="contain" style={{position:'absolute',...roomWearableFrame(wear.id,getCharacter(stage).key,76,{x:placement?.x??0,y:placement?.y??0,scale:placement?.scale??1})}}/>}</View><View style={{flex:1,gap:6}}><Text style={s.authorName}>{name}の今日</Text><Text style={s.feeling}>{page.letter.feeling}</Text></View><Icon name="feather" size={22} color="#AD946F"/></View>
     <Text style={s.letterTitle}>{page.letter.title}</Text><Text testID="diary-character-story" style={s.handwriting}>{page.letter.body}</Text>
     <Text style={s.signature}>また、ここでお話ししよう。　{name}より</Text>
    </View>
    <Pressable testID="diary-write" accessibilityRole="button" onPress={()=>turn('user')} style={s.primary}><Icon name={page.user?'book-open':'edit-3'} size={18} color="#FAF1E2"/><Text style={s.primaryText}>{page.user?'あなたのページを読む':mine?'あなたの今日も、聞かせて':'あなたのページへ'}</Text></Pressable>
    <Text style={s.footer}>読むだけの日も、大丈夫。日記はいつでも読み返せるよ。</Text>
   </>:page.user&&(!mine||!editing)?<>
    <View testID="diary-user-page" style={s.paper}><View pointerEvents="none" style={s.marginLine}/><View style={s.author}><Text style={s.authorName}>あなたの今日</Text><Text style={s.feeling}>{moods.find(m=>m.value===page.user!.mood)?.label}</Text></View><Text selectable style={s.handwriting}>{page.user.text||'今日は、この気分を届けた。'}</Text><Text style={s.signature}>{name}へ</Text></View>
    <View testID="diary-reply" style={s.reply}><Text style={s.replyLabel}>{name}が、ページのすみに書いたこと</Text><Text style={s.replyText}>{page.reply}</Text></View>
    {!!notice&&<Text accessibilityLiveRegion="polite" style={s.footer}>{notice}</Text>}
    {mine&&<Pressable testID="diary-edit" accessibilityRole="button" onPress={edit} style={s.secondary}><Icon name="edit-3" size={16} color="#735580"/><Text style={s.secondaryText}>あなたのページを書き直す</Text></Pressable>}
   </>:mine&&draft?<View style={s.paper}>
    <Text style={s.authorName}>あなたの今日</Text><Text style={s.body}>{name}へ、どんな一日だった？</Text>
    <TextInput testID="diary-input" accessibilityLabel="今日のできごとを日記に書く" value={draft.text} onChangeText={text=>update({text})} editable={!busy} multiline maxLength={DIARY_TEXT_LIMIT} textAlignVertical="top" placeholder="うれしかったこと、もやもやしたこと。まとまらないままでも、ひとことでも。" placeholderTextColor="#9E919D" style={s.input}/>
    <Text style={s.counter}>{draft.text.length} / {DIARY_TEXT_LIMIT}　「渡す」で保存されます</Text>
    <Text style={s.authorName}>いまの気分</Text><View style={s.moods}>{moods.map(m=><Pressable key={m.value} testID={`diary-mood-${m.value}`} accessibilityRole="button" accessibilityLabel={`気分：${m.label}`} accessibilityState={{selected:draft.mood===m.value}} disabled={busy} onPress={()=>update({mood:m.value})} style={[s.mood,draft.mood===m.value&&s.moodSelected]}><Icon name={m.icon} size={22} color="#84668E"/><Text style={s.moodLabel}>{m.label}</Text></Pressable>)}</View>
    <Text style={s.hint}>言葉が出ない日は、気分だけでも届くよ。</Text>
    <Pressable testID="diary-send" accessibilityRole="button" disabled={busy||draft.mood===null} onPress={()=>{void send();}} style={[s.primary,{opacity:busy||draft.mood===null?.5:1}]}><Icon name="send" size={18} color="#FAF1E2"/><Text style={s.primaryText}>{busy?'日記を届けています…':`${name}に渡す`}</Text></Pressable>
    {editing&&<Pressable accessibilityRole="button" disabled={busy} onPress={()=>{setEditing(false);setDraft({text:page.user?.text??'',mood:page.user?.mood??null,revision:page.revision,id:''});}} style={s.secondary}><Text style={s.secondaryText}>書き直しをやめる</Text></Pressable>}
   </View>:<View style={s.paper}><Text style={s.body}>この日は、読むだけの日。{name}の一日が、このページに残っているよ。</Text></View>}
   {!!error&&<Text testID="diary-error" accessibilityRole="alert" style={s.error}>{error}</Text>}
   <Pressable accessibilityRole="button" disabled={busy} onPress={()=>{if(hasDraft){setLeaveOpen(true);return;}router.push('/(tabs)/record');}} style={s.simpleLink}><Text style={s.hint}>これまでの気分記録・チェックを開く</Text></Pressable>
  </ScrollView>
  {shelf&&<BottomSheet visible title="ふたりの日記の本棚" subtitle={`${dates.length}日分の、ふたりの暮らし。`} onClose={()=>setShelf(false)}>{dates.map(d=><Pressable key={d} testID={`diary-history-${d}`} accessibilityRole="button" onPress={()=>chooseDate(d)} style={s.historyRow}><View style={{flex:1,gap:5}}><Text style={s.historyDate}>{d.slice(0,4)}年 {formatDateJP(d)}</Text><Text style={s.historyTitle}>{pages[d].letter.title}</Text></View><Text style={s.historyStatus}>{pages[d].user?'交換済み':'この子の日記'}</Text></Pressable>)}</BottomSheet>}
  {leaveOpen&&<BottomSheet visible title="まだ渡していないページがあるよ" onClose={()=>setLeaveOpen(false)}><Text style={s.historyTitle}>書いた内容を残すには、気分を選んで日記を渡してね。</Text><Pressable accessibilityRole="button" onPress={()=>{setLeaveOpen(false);setDate(today);setSide('user');}} style={s.primary}><Text style={s.primaryText}>書いていたページに戻る</Text></Pressable><Pressable accessibilityRole="button" onPress={()=>router.navigate('/(tabs)')} style={s.secondary}><Text style={s.secondaryText}>今回は保存せず、おうちへ</Text></Pressable></BottomSheet>}
 </KeyboardAvoidingView>;
}
const s=StyleSheet.create({
 root:{flex:1,backgroundColor:'#F0E8DF'},loading:{justifyContent:'center',alignItems:'center',gap:16},top:{backgroundColor:'#33293F',paddingHorizontal:12,paddingBottom:10,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},topButton:{minHeight:44,flexDirection:'row',alignItems:'center',gap:4},topText:{fontSize:12,color:'#E4D4EA'},topName:{fontSize:13,color:'#F2E3C9',letterSpacing:1},
 content:{width:'100%',maxWidth:650,alignSelf:'center',paddingHorizontal:18,gap:14},intro:{paddingTop:23,gap:8},eyebrow:{fontSize:9,letterSpacing:3,color:'#967F70'},title:{fontSize:22,fontWeight:'600',color:'#503E59',lineHeight:32},hint:{fontSize:12,lineHeight:20,color:'#8A7886'},dateRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},date:{fontSize:13,color:'#735E75'},iconButton:{minWidth:44,minHeight:44,alignItems:'center',justifyContent:'center'},tabs:{flexDirection:'row',borderBottomWidth:1,borderColor:'#CFC0C9'},tab:{flex:1,minHeight:44,alignItems:'center',justifyContent:'center',paddingHorizontal:4},tabSelected:{borderBottomWidth:3,borderColor:'#886D98'},tabText:{fontSize:12,color:'#9D8B9A'},tabTextSelected:{color:'#62486F',fontWeight:'600'},
 paper:{backgroundColor:'#FFFAF0',borderRadius:6,borderWidth:1,borderColor:'#E2D5C3',padding:20,gap:17,shadowColor:'#4D3942',shadowOpacity:.08,shadowRadius:12,shadowOffset:{width:0,height:4}},marginLine:{position:'absolute',left:10,top:0,bottom:0,width:1,backgroundColor:'#DEBBB459'},author:{flexDirection:'row',alignItems:'center',gap:12},portrait:{width:76,height:76,backgroundColor:'#F1E8D9',borderRadius:38},authorName:{fontSize:14,fontWeight:'600',color:'#73527F'},feeling:{fontSize:11,color:'#A17D61',lineHeight:18},letterTitle:{fontSize:19,fontWeight:'600',color:'#544151',lineHeight:28},handwriting:{fontSize:15,lineHeight:29,color:'#655456'},signature:{fontSize:11,lineHeight:20,color:'#9A847D',textAlign:'right',marginTop:4},body:{fontSize:14,lineHeight:23,color:'#77616F'},
 primary:{backgroundColor:'#7B6189',borderRadius:8,minHeight:48,paddingHorizontal:14,paddingVertical:10,flexDirection:'row',justifyContent:'center',alignItems:'center',gap:9},primaryText:{fontSize:14,color:'#FFF5E3',fontWeight:'600',textAlign:'center'},secondary:{minHeight:44,padding:10,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8},secondaryText:{fontSize:12,color:'#795D87'},footer:{fontSize:11,lineHeight:20,color:'#9A8792',textAlign:'center'},input:{minHeight:156,fontSize:15,lineHeight:26,color:'#5A4757',backgroundColor:'#F7EFE6',borderRadius:6,borderWidth:1,borderColor:'#DFD0D4',padding:12},counter:{fontSize:10,textAlign:'right',color:'#A0909B'},moods:{flexDirection:'row',gap:4},mood:{flex:1,minHeight:64,alignItems:'center',justifyContent:'center',gap:7,borderRadius:8,borderWidth:1,borderColor:'#DED1DD'},moodSelected:{backgroundColor:'#EEE2F1',borderColor:'#A084AD'},moodLabel:{fontSize:10,color:'#806C83'},reply:{backgroundColor:'#E9E0ED',padding:19,gap:12,borderRadius:10,borderLeftWidth:3,borderColor:'#AA8DB4'},replyLabel:{fontSize:11,color:'#92709F'},replyText:{fontSize:14,lineHeight:25,color:'#665070'},error:{fontSize:13,lineHeight:21,color:'#A04753',padding:12,backgroundColor:'#FBE5E1',borderRadius:6},simpleLink:{minHeight:44,alignItems:'center',justifyContent:'center'},historyRow:{flexDirection:'row',alignItems:'center',gap:12,paddingVertical:14,borderBottomWidth:1,borderColor:'#6F5C7844'},historyDate:{fontSize:11,color:'#BEAACA'},historyTitle:{fontSize:14,lineHeight:23,color:'#E5D6E8'},historyStatus:{fontSize:10,color:'#D6C29D'},
});
