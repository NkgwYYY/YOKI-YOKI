import {colors} from '@/constants/theme';
import React,{useEffect,useRef,useState} from 'react';
import {ActivityIndicator,Image,Keyboard,KeyboardAvoidingView,Platform,ScrollView,StyleSheet,Text,TextInput,View,useWindowDimensions} from 'react-native';
import {Pressable} from 'react-native';
import {NotebookCover,TurningPages,useNotebookMotion} from '@/components/record/NotebookMotion';
import {NotebookPaper,RuledWriting,notebookFont} from '@/components/record/NotebookPaper';
import {useRouter} from 'expo-router';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useApp} from '@/contexts/AppContext';
import {useRoomActivity} from '@/components/room/useRoomActivity';
import {useAuth} from '@/contexts/AuthContext';
import {useItems,resolveItemAssetUrl} from '@/contexts/ItemContext';
import {StaticMascot} from '@/components/Mascot';
import {BottomSheet} from '@/components/ui/BottomSheet';
import {Icon} from '@/components/ui/Icon';
import {getTodayDate,formatDateJP} from '@/utils/dateUtils';
import {getMascotStage,getCharacter} from '@/utils/mascotUtils';
import {roomWearableFrame} from '@/utils/roomWearable';
import {DIARY_TEXT_LIMIT,diaryDetailsFromRecord,type DiaryDetails} from '@/utils/exchangeDiary';
import {ChecklistSheet} from '@/components/record/ChecklistSheet';
import {DiaryDetailsEditor,DiaryDetailsSummary} from '@/components/record/DiaryDetails';
import {DiaryReply} from '@/components/record/DiaryReply';

const moods=[{value:1,label:'つらい',icon:'cloud-lightning'},{value:2,label:'しんどい',icon:'cloud-rain'},{value:3,label:'ふつう',icon:'cloud'},{value:4,label:'いい感じ',icon:'sunrise'},{value:5,label:'うれしい',icon:'sun'}] as const;
type Draft={text:string;mood:number|null;revision:number;id:string;details:DiaryDetails;detailsDirty:boolean};
export default function ExchangeDiaryScreen(){
 const {isLoading,cloudSynced}=useApp();
 const {user,isSignedIn,isLoading:authLoading}=useAuth();
 const ready=!isLoading&&!authLoading&&(!isSignedIn||cloudSynced);
 return ready?<DiaryNotebook key={user?.id??'guest'}/>:<View style={[s.root,s.loading]}><ActivityIndicator color="#8C74A3"/><Text style={s.hint}>日記を開いています…</Text></View>;
}
function DiaryNotebook(){
 const router=useRouter(),insets=useSafeAreaInsets();
 const spread=useWindowDimensions().width>=900,motion=useNotebookMotion();
 const {active}=useRoomActivity();
 const [visibleLetter,setVisibleLetter]=useState('');
 const {feedState,runDiary,mascotName,progress,getTodayRecord}=useApp();
 const {items,shopState}=useItems();
 const [today]=useState(getTodayDate),[date,setDate]=useState(getTodayDate);
 const [side,setSide]=useState<'character'|'user'>('character');
 const [shelf,setShelf]=useState(false),[editing,setEditing]=useState(false),[draft,setDraft]=useState<Draft|null>(null);
 const [detailsOpen,setDetailsOpen]=useState(false),[checklistOpen,setChecklistOpen]=useState(false);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [writing,setWriting]=useState(false);
 const pending=useRef(false),alive=useRef(true),scroll=useRef<ScrollView>(null);
 const pages=feedState.exchangeDiary?.pages??{},page=pages[date];
 const dates=Object.keys(pages).sort().reverse(),index=dates.indexOf(date);
 const mine=date===today,name=page?.name||mascotName||'よっきー';
 const stage=page?.stage??getMascotStage(progress);
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
 // Opening storage alone is not reading: wait until the character page is shown.
 useEffect(()=>{
  if(!active||!motion.opened||motion.turning||busy||shelf||(!spread&&side!=='character')||visibleLetter!==date||!page||Number.isFinite(page.letterReadAt))return;
  let current=true;
  const timer=setTimeout(()=>{void runDiary({kind:'read',date}).catch(()=>{
   if(current&&alive.current)setError('読んだしるしを保存できませんでした。もう一度ページを開いてね。');
  });},600);
  return()=>{current=false;clearTimeout(timer);};
 },[active,motion.opened,motion.turning,busy,shelf,side,spread,visibleLetter,date,page?.letterReadAt,runDiary]);
 useEffect(()=>{
  if(page&&mine&&!draft)setDraft({text:page.user?.text??'',mood:page.user?.mood??getTodayRecord()?.mood??null,revision:page.revision,id:'',details:page.user?.details??diaryDetailsFromRecord(getTodayRecord()??undefined),detailsDirty:false});
 },[page,mine,draft]);
 const turn=(next:'character'|'user')=>{if(next===side)return;Keyboard.dismiss();motion.turn(()=>{setSide(next);setNotice('');scroll.current?.scrollTo({y:0,animated:false});},next==='user'?1:-1);};
 const chooseDate=(next:string,nextSide:'character'|'user'='character')=>{setShelf(false);Keyboard.dismiss();motion.turn(()=>{setDate(next);setSide(nextSide);setError('');setNotice('');scroll.current?.scrollTo({y:0,animated:false});},next>date?1:-1);};
 const nextPage=()=>{if(busy)return;if(!spread&&side==='character')turn('user');else if(dates[index-1])chooseDate(dates[index-1]);};
 const previousPage=()=>{if(busy)return;if(!spread&&side==='user')turn('character');else if(dates[index+1])chooseDate(dates[index+1],spread?'character':'user');};
 const pageNumber=(Math.max(0,dates.length-1-index)*2)+1;
 const edit=()=>{if(!page)return;setDraft({text:page.user?.text??'',mood:page.user?.mood??getTodayRecord()?.mood??null,revision:page.revision,id:'',details:page.user?.details??diaryDetailsFromRecord(getTodayRecord()??undefined),detailsDirty:false});setEditing(true);};
 const update=(patch:Partial<Draft>)=>setDraft(d=>d?{...d,...patch,id:''}:d);
 const send=async()=>{
  if(pending.current||!page||!draft||draft.mood===null||!mine)return;
  const id=draft.id||`diary-${Date.now()}-${Math.random().toString(36).slice(2,9)}`;
  const outgoing={...draft,id};setDraft(outgoing);pending.current=true;setBusy(true);setError('');
  try{
   const result=await runDiary({kind:'send',date,id,revision:draft.revision,text:draft.text,mood:draft.mood,details:draft.detailsDirty?draft.details:undefined});
   if(alive.current){setDraft({text:result.page.user!.text,mood:result.page.user!.mood,revision:result.page.revision,id:'',details:result.page.user!.details??draft.details,detailsDirty:false});setEditing(false);setNotice('日記を保存しました。');scroll.current?.scrollTo({y:0,animated:false});}
  }catch(e){if(alive.current)setError(e instanceof Error?e.message:'保存できませんでした。書いた内容はそのままです。もう一度渡してね。');}
  finally{pending.current=false;if(alive.current)setBusy(false);}
 };
 const hasDraft=!!draft&&(draft.detailsDirty||draft.text!==(pages[today]?.user?.text??'')||draft.mood!==(pages[today]?.user?.mood??getTodayRecord()?.mood??null));
 const [leaveOpen,setLeaveOpen]=useState(false);
 const goHome=()=>{if(hasDraft){setLeaveOpen(true);return;}router.navigate('/(tabs)');};
 const dateButton=(direction:'older'|'newer')=>{
  const target=dates[index+(direction==='older'?1:-1)];
  return <Pressable accessibilityRole="button" accessibilityLabel={direction==='older'?'前の日記':'次の日記'} disabled={!target||busy} onPress={()=>chooseDate(target)} style={s.iconButton}><Icon name={direction==='older'?'chevron-left':'chevron-right'} size={20} color={target?'#E5D4F1':'#766084'}/></Pressable>;
 };
 const characterPage=page?<View style={s.pageColumn}>
    <NotebookPaper key={date} testID="diary-character-page" onLayout={()=>setVisibleLetter(date)} style={spread?{flex:1}:undefined}>

     <View style={s.author}><View style={s.portrait}><View pointerEvents="none" style={s.tape}/><StaticMascot stage={stage} mood="happy" size={76}/>{wear?.assetUrl&&<Image source={{uri:resolveItemAssetUrl(wear.assetUrl)}} resizeMode="contain" style={{position:'absolute',...roomWearableFrame(wear.id,getCharacter(stage).key,76,{x:placement?.x??0,y:placement?.y??0,scale:placement?.scale??1})}}/>}</View><View style={{flex:1,gap:6}}><Text style={s.authorName}>{name}の今日</Text><Text style={s.feeling}>{page.letter.feeling}</Text></View><Icon name="feather" size={22} color="#AD946F"/></View>
     <Text style={s.letterTitle}>{page.letter.title}</Text><RuledWriting><Text testID="diary-character-story" style={s.handwriting}>{page.letter.body}</Text></RuledWriting>
     <Text style={s.signature}>{name}より</Text>
     <Text style={s.pageNumber}>{String(pageNumber).padStart(2,'0')} · {name}</Text>
    </NotebookPaper>
    {!spread&&<><Pressable testID="diary-write" accessibilityRole="button" onPress={()=>turn('user')} style={s.primary}><Icon name={page.user?'book-open':'edit-3'} size={18} color="#FAF1E2"/><Text style={s.primaryText}>{page.user?'あなたのページを読む':mine?'あなたのページを書く':'あなたのページへ'}</Text></Pressable>
    <Text style={s.footer}>読むだけの日も、大丈夫。日記はいつでも読み返せるよ。</Text></>}
   </View>:null;
 const userPage=page?<View style={s.pageColumn}>{page.user&&(!mine||!editing)?<>
    <NotebookPaper testID="diary-user-page" style={spread?{flex:1}:undefined}><View style={s.author}><Text style={s.authorName}>あなたの今日</Text><Text style={s.feeling}>{moods.find(m=>m.value===page.user!.mood)?.label}</Text></View><RuledWriting><Text selectable style={s.handwriting}>{page.user.text||'今日は、この気分を届けた。'}</Text></RuledWriting>{page.user.details&&<DiaryDetailsSummary value={page.user.details}/>}<Text style={s.signature}>{name}へ</Text><Text style={s.pageNumber}>{String(pageNumber+1).padStart(2,'0')} · あなた</Text></NotebookPaper>
    <DiaryReply key={`${date}:${page.revision}`} page={page}/>
    {!!notice&&<Text accessibilityLiveRegion="polite" style={s.footer}>{notice}</Text>}
    {mine&&<Pressable testID="diary-edit" accessibilityRole="button" onPress={edit} style={s.secondary}><Icon name="edit-3" size={16} color="#735580"/><Text style={s.secondaryText}>あなたのページを書き直す</Text></Pressable>}
   </>:mine&&draft?<NotebookPaper testID="diary-writing-page" style={spread?{flex:1}:undefined}>
    <Text style={s.authorName}>あなたの今日</Text><Text style={s.body}>{name}へ、どんな一日だった？</Text>
    <RuledWriting><TextInput testID="diary-input" accessibilityLabel="今日のできごとを日記に書く" value={draft.text} onChangeText={text=>update({text})} onFocus={()=>setWriting(true)} onBlur={()=>setWriting(false)} editable={!busy} multiline maxLength={DIARY_TEXT_LIMIT} textAlignVertical="top" placeholder="うれしかったこと、もやもやしたこと。まとまらないままでも、ひとことでも。" placeholderTextColor="#9E919D" style={s.input}/></RuledWriting>
    <Text style={s.counter}>{draft.text.length} / {DIARY_TEXT_LIMIT}　「渡す」で保存されます</Text>
    <Text style={s.authorName}>いまの気分</Text><View style={s.moods}>{moods.map(m=><Pressable key={m.value} testID={`diary-mood-${m.value}`} accessibilityRole="button" accessibilityLabel={`気分：${m.label}`} accessibilityState={{selected:draft.mood===m.value}} disabled={busy} onPress={()=>{Keyboard.dismiss();update({mood:m.value});}} style={[s.mood,draft.mood===m.value&&s.moodSelected]}><Icon name={m.icon} size={22} color="#84668E"/><Text style={s.moodLabel}>{m.label}</Text></Pressable>)}</View>
    <Text style={s.hint}>言葉が出ない日は、気分だけでも届くよ。気分の推移にも残ります。</Text>
    <Pressable testID="diary-details-toggle" accessibilityRole="button" accessibilityState={{expanded:detailsOpen}} disabled={busy} onPress={()=>setDetailsOpen(v=>!v)} style={s.detailsButton}><View style={{flex:1,gap:4}}><Text style={s.secondaryText}>{detailsOpen?'詳しい記録を閉じる':'詳しく残す'}</Text><Text style={s.hint}>睡眠・食事・できたことなど（任意）</Text></View><Icon name={detailsOpen?'chevron-up':'chevron-down'} size={18} color="#735580"/></Pressable>
    {detailsOpen&&<><DiaryDetailsEditor value={draft.details} disabled={busy} onChange={details=>update({details,detailsDirty:true})}/><Pressable accessibilityRole="button" disabled={busy} onPress={()=>setChecklistOpen(true)} style={s.secondary}><Text style={s.secondaryText}>いつものチェックリストを開く</Text></Pressable></>}

    <Pressable testID="diary-send" accessibilityRole="button" disabled={busy||draft.mood===null} onPress={()=>{void send();}} style={[s.primary,{opacity:busy||draft.mood===null?.5:1}]}><Icon name="send" size={18} color="#FAF1E2"/><Text style={s.primaryText}>{busy?'日記を届けています…':`${name}に渡す`}</Text></Pressable>
    {editing&&<Pressable accessibilityRole="button" disabled={busy} onPress={()=>{setEditing(false);setDraft({text:page.user?.text??'',mood:page.user?.mood??null,revision:page.revision,id:'',details:page.user?.details??diaryDetailsFromRecord(getTodayRecord()??undefined),detailsDirty:false});}} style={s.secondary}><Text style={s.secondaryText}>書き直しをやめる</Text></Pressable>}
   <Text style={s.pageNumber}>{String(pageNumber+1).padStart(2,'0')} · あなた</Text></NotebookPaper>:<NotebookPaper><Text style={s.body}>この日は、読むだけの日。{name}の一日が、このページに残っているよ。</Text></NotebookPaper>}</View>:null;
 return <KeyboardAvoidingView style={s.root} behavior={Platform.OS==='ios'?'padding':undefined}>
  <View style={[s.top,{paddingTop:Math.max(insets.top,12)}]}><Pressable testID="diary-home" accessibilityRole="button" onPress={goHome} disabled={busy} style={s.topButton}><Icon name="chevron-left" color="#E5D4F1" size={18}/><Text style={s.topText}>おうち</Text></Pressable><Pressable testID="diary-close-cover" accessibilityRole="button" accessibilityLabel="日記の表紙に戻る" onPress={motion.close} disabled={!motion.opened||motion.turning} style={s.topButton}><Text style={s.topName}>{motion.opened?'表紙に戻る':'交換日記'}</Text></Pressable>{writing&&Platform.OS!=='web'?<Pressable testID="diary-keyboard-done" accessibilityRole="button" accessibilityLabel="日記の入力を終える" onPress={()=>Keyboard.dismiss()} style={s.topButton}><Text style={s.topText}>入力完了</Text></Pressable>:<Pressable testID="diary-history" accessibilityRole="button" accessibilityLabel="これまでの交換日記を開く" disabled={busy||!motion.opened||motion.turning} onPress={()=>setShelf(true)} style={s.topButton}><Icon name="book-open" color="#E5D4F1" size={18}/><Text style={s.topText}>本棚</Text></Pressable>}</View>
  <View style={{flex:1}}>
  <View style={{flex:1,opacity:motion.opened||motion.turning?1:0}} pointerEvents={motion.opened&&!motion.turning?'auto':'none'} accessibilityElementsHidden={!motion.opened} importantForAccessibility={motion.opened?'auto':'no-hide-descendants'}>
  <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={[s.content,{paddingBottom:Math.max(insets.bottom,20)+20}]}>
   <View style={s.intro}><Text style={s.eyebrow}>YOKIYOKI — EXCHANGE DIARY</Text><Text style={s.title}>{name}と、あなたのノート</Text></View>
   <View style={s.dateRow}>{dateButton('older')}<Text testID="diary-date" style={s.date}>{date.slice(0,4)}年 {formatDateJP(date)}</Text>{dateButton('newer')}</View>
   {!spread&&<View style={s.tabs}>{(['character','user'] as const).map(value=><Pressable key={value} testID={`diary-tab-${value}`} accessibilityRole="tab" accessibilityState={{selected:side===value}} onPress={()=>turn(value)} style={[s.tab,side===value&&s.tabSelected]}><Text style={[s.tabText,side===value&&s.tabTextSelected]}>{value==='character'?`${name}のページ`:'あなたのページ'}{value==='user'&&page?.user?' ✓':''}</Text></Pressable>)}</View>}
   {!page?<NotebookPaper><Text style={s.body}>{busy?'今日のページを開いています…':'まだページを開けていません。'}</Text>{!busy&&<Pressable accessibilityRole="button" onPress={()=>{void open();}} style={s.primary}><Text style={s.primaryText}>もう一度開く</Text></Pressable>}</NotebookPaper>
    :<TurningPages motion={motion} spread={spread} writing={writing} onPrevious={previousPage} onNext={nextPage}><View testID={spread?'diary-spread':'diary-single-page'} style={[s.book,spread&&s.spread]}>{spread?<>{characterPage}{userPage}<View pointerEvents="none" style={s.centerBinding}/></>:side==='character'?characterPage:userPage}</View></TurningPages>}
   {page&&<View style={s.pageNav}><Pressable testID="diary-previous-page" accessibilityRole="button" accessibilityLabel="前のページをめくる" disabled={busy||motion.turning||(!dates[index+1]&&(spread||side==='character'))} onPress={previousPage} style={s.iconButton}><Icon name="chevron-left" size={19} color="#D7C3DF"/></Pressable><Text style={s.pageHint}>{spread?`${pageNumber} — ${pageNumber+1}`:`${side==='character'?pageNumber:pageNumber+1} / ${dates.length*2}`} · {spread?'日付をめくる':'左右にスワイプしてめくる'}</Text><Pressable testID="diary-next-page" accessibilityRole="button" accessibilityLabel="次のページをめくる" disabled={busy||motion.turning||(!dates[index-1]&&(spread||side==='user'))} onPress={nextPage} style={s.iconButton}><Icon name="chevron-right" size={19} color="#D7C3DF"/></Pressable></View>}
   {!!error&&<Text testID="diary-error" accessibilityRole="alert" style={s.error}>{error}</Text>}
   <Pressable accessibilityRole="button" disabled={busy} onPress={()=>{if(hasDraft){setLeaveOpen(true);return;}router.push('/monthly-report');}} style={s.simpleLink}><Text style={s.footer}>気分の推移を見る</Text></Pressable>
  </ScrollView></View>
  {!motion.opened&&<NotebookCover motion={motion} name={name} days={dates.length}/>}
  </View>
  {checklistOpen&&<ChecklistSheet visible onClose={()=>setChecklistOpen(false)}/>}
  {shelf&&<BottomSheet visible title="日記の本棚" subtitle={`${dates.length}日分の記録。`} onClose={()=>setShelf(false)}>{dates.map(d=><Pressable key={d} testID={`diary-history-${d}`} accessibilityRole="button" onPress={()=>chooseDate(d)} style={s.historyRow}><View style={{flex:1,gap:5}}><Text style={s.historyDate}>{d.slice(0,4)}年 {formatDateJP(d)}</Text><Text style={s.historyTitle}>{pages[d].letter.title}</Text></View><Text style={s.historyStatus}>{pages[d].user?'交換済み':'この子の日記'}</Text></Pressable>)}</BottomSheet>}
  {leaveOpen&&<BottomSheet visible title="まだ渡していないページがあるよ" onClose={()=>setLeaveOpen(false)}><Text style={s.historyTitle}>書いた内容を残すには、気分を選んで日記を渡してね。</Text><Pressable accessibilityRole="button" onPress={()=>{setLeaveOpen(false);setDate(today);setSide('user');if(!motion.opened)motion.open();}} style={s.primary}><Text style={s.primaryText}>書いていたページに戻る</Text></Pressable><Pressable accessibilityRole="button" onPress={()=>router.navigate('/(tabs)')} style={s.secondary}><Text style={s.secondaryText}>今回は保存せず、おうちへ</Text></Pressable></BottomSheet>}
 </KeyboardAvoidingView>;
}
const s=StyleSheet.create({
 pageNav:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},pageHint:{fontSize:10,color:'#CBB4D4'},root:{flex:1,backgroundColor:'#392746'},loading:{justifyContent:'center',alignItems:'center',gap:16},top:{backgroundColor:'#30203D',paddingHorizontal:14,paddingBottom:10,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},topButton:{minHeight:44,flexDirection:'row',alignItems:'center',gap:4},topText:{fontSize:12,color:'#E5D4F1'},topName:{fontSize:13,color:'#F5EBFD',letterSpacing:1},
 content:{width:'100%',maxWidth:1120,alignSelf:'center',paddingHorizontal:18,gap:12},intro:{paddingTop:24,gap:9,alignItems:'center'},eyebrow:{fontSize:8,letterSpacing:2.5,color:'#C5ABCF'},title:{fontSize:18,fontFamily:notebookFont,color:'#F7EDDF',lineHeight:29},hint:{fontSize:11,lineHeight:19,color:'#897D77'},dateRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginTop:2},date:{fontSize:12,color:'#E5D8EC',letterSpacing:1},iconButton:{minWidth:44,minHeight:44,alignItems:'center',justifyContent:'center'},tabs:{flexDirection:'row',gap:7,paddingHorizontal:7,marginBottom:-12,zIndex:1},tab:{flex:1,minHeight:44,alignItems:'center',justifyContent:'center',paddingHorizontal:4,backgroundColor:'#705779',borderTopLeftRadius:5,borderTopRightRadius:5},tabSelected:{backgroundColor:'#FFFBEF',borderTopWidth:3,borderTopColor:'#B78C62'},tabText:{fontSize:12,color:'#E6D9EB'},tabTextSelected:{color:'#634A5E',fontWeight:'600'},
 book:{padding:6,backgroundColor:'#654B6A',borderRadius:7,borderWidth:1,borderColor:'#806186',shadowColor:'#12081A',shadowOpacity:.25,shadowRadius:16,shadowOffset:{width:0,height:8}},spread:{flexDirection:'row',alignItems:'stretch',gap:9},centerBinding:{position:'absolute',left:'50%',width:9,top:6,bottom:6,transform:[{translateX:-4.5}],backgroundColor:'#372537',borderLeftWidth:2,borderRightWidth:2,borderLeftColor:'#5A405D',borderRightColor:'#927C91'},pageColumn:{flex:1,minWidth:0,gap:12},author:{flexDirection:'row',alignItems:'center',gap:15},portrait:{width:76,height:80,backgroundColor:'#F1EBDD',borderWidth:4,borderColor:'#FFFDF6',transform:[{rotate:'-4deg'}],shadowColor:'#4A3D2F',shadowOpacity:.15,shadowRadius:3,shadowOffset:{width:1,height:2}},tape:{position:'absolute',width:33,height:12,top:-10,left:17,backgroundColor:'#D6BC93AA',zIndex:2,transform:[{rotate:'-7deg'}]},authorName:{fontSize:14,fontWeight:'600',color:'#5E455F',fontFamily:notebookFont},feeling:{fontSize:11,color:'#8A7055',lineHeight:18},letterTitle:{fontSize:19,fontFamily:notebookFont,fontWeight:'600',color:'#4E3C4A',lineHeight:30,marginTop:8},handwriting:{fontSize:15,lineHeight:32,color:'#594C46',fontFamily:notebookFont},signature:{fontSize:12,lineHeight:24,color:'#8E7B6C',textAlign:'right',fontFamily:notebookFont},pageNumber:{fontSize:10,color:'#A0927D',textAlign:'center',letterSpacing:1.5,marginTop:5},body:{fontSize:13,lineHeight:23,color:'#776459'},
 detailsButton:{minHeight:62,padding:10,borderRadius:4,borderWidth:1,borderColor:'#DCD0BA',backgroundColor:'#F4EDD9',flexDirection:'row',alignItems:'center',gap:10},
 primary:{backgroundColor:'#765785',borderRadius:6,minHeight:48,paddingHorizontal:14,paddingVertical:10,flexDirection:'row',justifyContent:'center',alignItems:'center',gap:9},primaryText:{fontSize:13,color:'#FFF5E3',fontWeight:'600',textAlign:'center'},secondary:{minHeight:44,padding:10,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,backgroundColor:'#EEE5F0',borderRadius:5},secondaryText:{fontSize:12,color:'#795D87'},footer:{fontSize:10,lineHeight:18,color:'#D3BEDA',textAlign:'center',paddingHorizontal:8},input:{minHeight:192,fontSize:15,lineHeight:32,color:'#594C46',fontFamily:notebookFont,backgroundColor:'transparent',padding:0,borderWidth:0},counter:{fontSize:9,lineHeight:15,textAlign:'right',color:'#988C80'},moods:{flexDirection:'row',gap:4},mood:{flex:1,minHeight:64,alignItems:'center',justifyContent:'center',gap:7,borderRadius:5,borderWidth:1,borderColor:'#DFD3C1'},moodSelected:{backgroundColor:'#E8DDF0',borderColor:'#9E7CAB'},moodLabel:{fontSize:9,color:'#806C83'},error:{fontSize:13,lineHeight:21,color:'#A04753',padding:12,backgroundColor:'#FBE5E1',borderRadius:6},simpleLink:{minHeight:44,alignItems:'center',justifyContent:'center'},historyRow:{flexDirection:'row',alignItems:'center',gap:12,paddingVertical:14,borderBottomWidth:1,borderColor:'#6F5C7844'},historyDate:{fontSize:11,color:colors.mutedForeground},historyTitle:{fontSize:14,lineHeight:23,color:colors.foreground},historyStatus:{fontSize:10,color:colors.primary},
});
