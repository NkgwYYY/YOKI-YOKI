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
import {DiaryDetailsSummary} from '@/components/record/DiaryDetails';
import {DiaryReply} from '@/components/record/DiaryReply';
import {PersonalInsightPreview} from '@/components/insights/PersonalInsightPreview';

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
  if(page&&mine&&!draft)setDraft({text:page.user?.text??'',mood:getTodayRecord()?.mood??page.user?.mood??null,revision:page.revision,id:'',details:diaryDetailsFromRecord(getTodayRecord()??page.user?.details),detailsDirty:false});
 },[page,mine,draft]);
 const turn=(next:'character'|'user')=>{if(next===side)return;Keyboard.dismiss();motion.turn(()=>{setSide(next);setNotice('');scroll.current?.scrollTo({y:0,animated:false});},next==='user'?1:-1);};
 const chooseDate=(next:string,nextSide:'character'|'user'='character')=>{setShelf(false);Keyboard.dismiss();motion.turn(()=>{setDate(next);setSide(nextSide);setError('');setNotice('');scroll.current?.scrollTo({y:0,animated:false});},next>date?1:-1);};
 const nextPage=()=>{if(busy)return;if(!spread&&side==='character')turn('user');else if(dates[index-1])chooseDate(dates[index-1]);};
 const previousPage=()=>{if(busy)return;if(!spread&&side==='user')turn('character');else if(dates[index+1])chooseDate(dates[index+1],spread?'character':'user');};
 const pageNumber=(Math.max(0,dates.length-1-index)*2)+1;
 const edit=()=>{if(!page)return;setDraft({text:page.user?.text??'',mood:getTodayRecord()?.mood??page.user?.mood??null,revision:page.revision,id:'',details:diaryDetailsFromRecord(getTodayRecord()??page.user?.details),detailsDirty:false});setEditing(true);};
 const update=(patch:Partial<Draft>)=>setDraft(d=>d?{...d,...patch,id:''}:d);
 const openRecord=()=>router.push({pathname:'/check-in',params:{returnTo:'diary'}});
 const currentRecord=getTodayRecord();
 const send=async()=>{
  if(pending.current||!page||!draft||!mine)return;
  const currentMood=getTodayRecord()?.mood;
  if(!currentMood){openRecord();return;}
  const id=draft.id||`diary-${Date.now()}-${Math.random().toString(36).slice(2,9)}`;
  const outgoing={...draft,id};setDraft(outgoing);pending.current=true;setBusy(true);setError('');
  try{
   const result=await runDiary({kind:'send',date,id,revision:draft.revision,text:draft.text,mood:currentMood});
   if(alive.current){setDraft({text:result.page.user!.text,mood:result.page.user!.mood,revision:result.page.revision,id:'',details:result.page.user!.details??draft.details,detailsDirty:false});setEditing(false);setNotice('日記を保存しました。');scroll.current?.scrollTo({y:0,animated:false});}
  }catch(e){if(alive.current)setError(e instanceof Error?e.message:'保存できませんでした。書いた内容はそのままです。もう一度渡してね。');}
  finally{pending.current=false;if(alive.current)setBusy(false);}
 };
 const hasDraft=!!draft&&(draft.detailsDirty||draft.text!==(pages[today]?.user?.text??''));
 const [leaveOpen,setLeaveOpen]=useState(false);
 const goHome=()=>{if(hasDraft){setLeaveOpen(true);return;}router.navigate('/(tabs)');};
 const dateButton=(direction:'older'|'newer')=>{
  const target=dates[index+(direction==='older'?1:-1)];
  return <Pressable accessibilityRole="button" accessibilityLabel={direction==='older'?'前の日記':'次の日記'} disabled={!target||busy} onPress={()=>chooseDate(target)} style={s.iconButton}><Icon name={direction==='older'?'chevron-left':'chevron-right'} size={20} color={target?'#735580':'#C8BFC8'}/></Pressable>;
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
    <NotebookPaper testID="diary-user-page" style={spread?{flex:1}:undefined}><View style={s.author}><Text style={s.authorName}>あなたの今日</Text><Text style={s.feeling}>{moods.find(m=>m.value===page.user!.mood)?.label}</Text></View><RuledWriting><Text selectable style={s.handwriting}>{page.user.text||'今日は、この気分を届けた。'}</Text></RuledWriting>{(mine?currentRecord:page.user.details)&&<DiaryDetailsSummary value={mine?diaryDetailsFromRecord(currentRecord):page.user.details!}/>}<Text style={s.signature}>{name}へ</Text><Text style={s.pageNumber}>{String(pageNumber+1).padStart(2,'0')} · あなた</Text></NotebookPaper>
    <DiaryReply key={`${date}:${page.revision}`} page={page}/>
    {mine&&<PersonalInsightPreview compact/>}
    {!!notice&&<Text accessibilityLiveRegion="polite" style={s.footer}>{notice}</Text>}
    {mine&&<Pressable testID="diary-edit" accessibilityRole="button" onPress={edit} style={s.secondary}><Icon name="edit-3" size={16} color="#735580"/><Text style={s.secondaryText}>あなたのページを書き直す</Text></Pressable>}
   </>:mine&&draft?<NotebookPaper testID="diary-writing-page" style={spread?{flex:1}:undefined}>
    <Text style={s.authorName}>あなたの今日</Text><Text style={s.body}>今日はどんな一日だった？</Text>
    <RuledWriting><TextInput testID="diary-input" accessibilityLabel="今日のできごとを日記に書く" value={draft.text} onChangeText={text=>update({text})} onFocus={()=>setWriting(true)} onBlur={()=>setWriting(false)} editable={!busy} multiline maxLength={DIARY_TEXT_LIMIT} textAlignVertical="top" placeholder="うれしかったこと、もやもやしたこと。まとまらないままでも、ひとことでも。" placeholderTextColor="#9E919D" style={s.input}/></RuledWriting>
    <Text style={s.counter}>{draft.text.length} / {DIARY_TEXT_LIMIT}　「渡す」で保存されます</Text>
    <View testID="diary-record-summary" style={s.quickActivities}>
     <Text style={s.authorName}>今日のきろく</Text>
     <Text style={s.body}>{currentRecord?'気分：'+(moods.find(m=>m.value===currentRecord.mood)?.label??'未記録'):'今日の気分は、まだ記録していません。'}</Text>
     {currentRecord&&<DiaryDetailsSummary value={diaryDetailsFromRecord(currentRecord)}/>}
     <Text style={s.hint}>気分・モヤモヤ・暮らしの回答は、記録画面でまとめて入力できます。</Text>
     <Pressable testID="diary-open-record" accessibilityRole="button" disabled={busy} onPress={openRecord} style={s.secondary}><Text style={s.secondaryText}>{currentRecord?'今日の記録を確認・変更する':'今日の記録をつける'}</Text></Pressable>
    </View>

    <Pressable testID="diary-send" accessibilityRole="button" disabled={busy} onPress={()=>{void send();}} style={[s.primary,{opacity:busy?.5:1}]}><Icon name="send" size={18} color="#FAF1E2"/><Text style={s.primaryText}>{busy?'日記を届けています…':currentRecord?`${name}に渡す`:'今日の記録をつけて続ける'}</Text></Pressable>
    {editing&&<Pressable accessibilityRole="button" disabled={busy} onPress={()=>{setEditing(false);setDraft({text:page.user?.text??'',mood:page.user?.mood??null,revision:page.revision,id:'',details:diaryDetailsFromRecord(getTodayRecord()??page.user?.details),detailsDirty:false});}} style={s.secondary}><Text style={s.secondaryText}>書き直しをやめる</Text></Pressable>}
   <Text style={s.pageNumber}>{String(pageNumber+1).padStart(2,'0')} · あなた</Text></NotebookPaper>:<NotebookPaper><Text style={s.body}>この日は、読むだけの日。{name}の一日が、このページに残っているよ。</Text></NotebookPaper>}</View>:null;
 return <KeyboardAvoidingView style={s.root} behavior={Platform.OS==='ios'?'padding':undefined}>
  <View style={[s.top,{paddingTop:Math.max(insets.top,12)}]}><Pressable testID="diary-home" accessibilityRole="button" onPress={goHome} disabled={busy} style={s.topButton}><Icon name="chevron-left" color="#735580" size={18}/><Text style={s.topText}>おうち</Text></Pressable><Pressable testID="diary-close-cover" accessibilityRole="button" accessibilityLabel="日記の表紙に戻る" onPress={motion.close} disabled={!motion.opened||motion.turning} style={s.topButton}><Text style={s.topName}>{motion.opened?'表紙に戻る':'交換日記'}</Text></Pressable>{writing&&Platform.OS!=='web'?<Pressable testID="diary-keyboard-done" accessibilityRole="button" accessibilityLabel="日記の入力を終える" onPress={()=>Keyboard.dismiss()} style={s.topButton}><Text style={s.topText}>入力完了</Text></Pressable>:<Pressable testID="diary-history" accessibilityRole="button" accessibilityLabel="これまでの交換日記を開く" disabled={busy||!motion.opened||motion.turning} onPress={()=>setShelf(true)} style={s.topButton}><Icon name="book-open" color="#735580" size={18}/><Text style={s.topText}>本棚</Text></Pressable>}</View>
  <View style={{flex:1}}>
  <View style={{flex:1,opacity:motion.opened||motion.turning?1:0}} pointerEvents={motion.opened&&!motion.turning?'auto':'none'} accessibilityElementsHidden={!motion.opened} importantForAccessibility={motion.opened?'auto':'no-hide-descendants'}>
  <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={[s.content,{paddingBottom:Math.max(insets.bottom,20)+20}]}>
   <View style={s.intro}><Text style={s.eyebrow}>YOKI YOKI — EXCHANGE DIARY</Text><Text style={s.title}>{name}と、あなたのノート</Text></View>
   <View testID="diary-room-vignette" style={s.roomVignette} accessible={false}>
    <Image source={require('@/assets/images/room/diary-open.png')} resizeMode="cover" style={StyleSheet.absoluteFill}/>
    <View style={s.vignetteShade}/><View style={s.vignetteMascot}><StaticMascot stage={stage} mood="happy" size={90}/></View>
    <View style={s.vignetteNote}><Icon name="feather" size={16} color="#735580"/><Text style={s.vignetteText}>ひとことだけでも、大丈夫。</Text></View>
   </View>
   <View style={s.dateRow}>{dateButton('older')}<Text testID="diary-date" style={s.date}>{date.slice(0,4)}年 {formatDateJP(date)}</Text>{dateButton('newer')}</View>
   {!spread&&<View style={s.tabs}>{(['character','user'] as const).map(value=><Pressable key={value} testID={`diary-tab-${value}`} accessibilityRole="tab" accessibilityState={{selected:side===value}} onPress={()=>turn(value)} style={[s.tab,side===value&&s.tabSelected]}><Text style={[s.tabText,side===value&&s.tabTextSelected]}>{value==='character'?`${name}のページ`:'あなたのページ'}{value==='user'&&page?.user?' ✓':''}</Text></Pressable>)}</View>}
   {!page?<NotebookPaper><Text style={s.body}>{busy?'今日のページを開いています…':'まだページを開けていません。'}</Text>{!busy&&<Pressable accessibilityRole="button" onPress={()=>{void open();}} style={s.primary}><Text style={s.primaryText}>もう一度開く</Text></Pressable>}</NotebookPaper>
    :<TurningPages motion={motion} spread={spread} writing={writing} onPrevious={previousPage} onNext={nextPage}><View testID={spread?'diary-spread':'diary-single-page'} style={[s.book,spread&&s.spread]}>{spread?<>{characterPage}{userPage}<View pointerEvents="none" style={s.centerBinding}/></>:side==='character'?characterPage:userPage}</View></TurningPages>}
   {page&&<View style={s.pageNav}><Pressable testID="diary-previous-page" accessibilityRole="button" accessibilityLabel="前のページをめくる" disabled={busy||motion.turning||(!dates[index+1]&&(spread||side==='character'))} onPress={previousPage} style={s.iconButton}><Icon name="chevron-left" size={19} color="#735580"/></Pressable><Text style={s.pageHint}>{spread?`${pageNumber} — ${pageNumber+1}`:`${side==='character'?pageNumber:pageNumber+1} / ${dates.length*2}`} · {spread?'日付をめくる':'左右にスワイプしてめくる'}</Text><Pressable testID="diary-next-page" accessibilityRole="button" accessibilityLabel="次のページをめくる" disabled={busy||motion.turning||(!dates[index-1]&&(spread||side==='user'))} onPress={nextPage} style={s.iconButton}><Icon name="chevron-right" size={19} color="#735580"/></Pressable></View>}
   {!!error&&<Text testID="diary-error" accessibilityRole="alert" style={s.error}>{error}</Text>}
   {!hasDraft&&!editing&&<View style={s.reflectionLinks}><Pressable testID="diary-insights" accessibilityRole="button" onPress={()=>router.push('/insights')} style={s.reflectionLink}><Icon name="sunrise" size={18} color="#856592"/><Text style={s.secondaryText}>元気な日の傾向</Text></Pressable><Pressable testID="diary-hints" accessibilityRole="button" onPress={()=>router.push('/hints')} style={s.reflectionLink}><Icon name="bookmark" size={18} color="#856592"/><Text style={s.secondaryText}>ヒント帳</Text></Pressable></View>}
   <Pressable accessibilityRole="button" disabled={busy} onPress={()=>{if(hasDraft){setLeaveOpen(true);return;}router.push('/(tabs)/condition');}} style={s.simpleLink}><Text style={s.footer}>回答のグラフを見る</Text></Pressable>
  </ScrollView></View>
  {!motion.opened&&<NotebookCover motion={motion} name={name} days={dates.length}/>}
  </View>
  {shelf&&<BottomSheet visible title="日記の本棚" subtitle={`${dates.length}日分の記録。`} onClose={()=>setShelf(false)}>{dates.map(d=><Pressable key={d} testID={`diary-history-${d}`} accessibilityRole="button" onPress={()=>chooseDate(d)} style={s.historyRow}><View style={{flex:1,gap:5}}><Text style={s.historyDate}>{d.slice(0,4)}年 {formatDateJP(d)}</Text><Text style={s.historyTitle}>{pages[d].letter.title}</Text></View><Text style={s.historyStatus}>{pages[d].user?'交換済み':'この子の日記'}</Text></Pressable>)}</BottomSheet>}
  {leaveOpen&&<BottomSheet visible title="まだ渡していないページがあるよ" onClose={()=>setLeaveOpen(false)}><Text style={s.historyTitle}>書いた内容を残すには、日記を渡してね。</Text><Pressable accessibilityRole="button" onPress={()=>{setLeaveOpen(false);setDate(today);setSide('user');if(!motion.opened)motion.open();}} style={s.primary}><Text style={s.primaryText}>書いていたページに戻る</Text></Pressable><Pressable accessibilityRole="button" onPress={()=>router.navigate('/(tabs)')} style={s.secondary}><Text style={s.secondaryText}>今回は保存せず、おうちへ</Text></Pressable></BottomSheet>}
 </KeyboardAvoidingView>;
}
const s=StyleSheet.create({
 reflectionLinks:{flexDirection:'row',gap:8},reflectionLink:{flex:1,minHeight:48,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:7,borderRadius:18,borderWidth:1,borderColor:'#DFD3E3',backgroundColor:'#FFFCF5'},
 roomVignette:{height:150,borderRadius:20,overflow:'hidden',backgroundColor:'#BAD1EB',borderWidth:1,borderColor:'#E4DBC7'},
 vignetteShade:{...StyleSheet.absoluteFillObject,backgroundColor:'#FFF2D51A'},vignetteMascot:{position:'absolute',bottom:11,left:'50%',marginLeft:-45},vignetteNote:{position:'absolute',bottom:10,left:10,paddingHorizontal:10,paddingVertical:7,borderRadius:18,backgroundColor:'#FFFBF0ED',flexDirection:'row',alignItems:'center',gap:5},vignetteText:{fontSize:10,color:'#755D7D'},quickActivities:{gap:10,paddingTop:8},

 pageNav:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},pageHint:{fontSize:10,color:'#837183'},root:{flex:1,backgroundColor:'#F6F1E8'},loading:{justifyContent:'center',alignItems:'center',gap:16},top:{backgroundColor:'#FFFBF3',paddingHorizontal:14,paddingBottom:10,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},topButton:{minHeight:44,flexDirection:'row',alignItems:'center',gap:4},topText:{fontSize:12,color:'#705675'},topName:{fontSize:13,color:'#594360',letterSpacing:1},
 content:{width:'100%',maxWidth:1120,alignSelf:'center',paddingHorizontal:14,gap:12},intro:{paddingTop:16,gap:7,alignItems:'center'},eyebrow:{fontSize:8,letterSpacing:2.5,color:'#947F9D'},title:{fontSize:18,fontFamily:notebookFont,color:'#5E4564',lineHeight:29},hint:{fontSize:11,lineHeight:19,color:'#897D77'},dateRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginTop:2},date:{fontSize:12,color:'#7B687C',letterSpacing:1},iconButton:{minWidth:44,minHeight:44,alignItems:'center',justifyContent:'center'},tabs:{flexDirection:'row',gap:7,paddingHorizontal:7,marginBottom:-12,zIndex:1},tab:{flex:1,minHeight:44,alignItems:'center',justifyContent:'center',paddingHorizontal:4,backgroundColor:'#E9DFEB',borderTopLeftRadius:14,borderTopRightRadius:14},tabSelected:{backgroundColor:'#FFFBEF',borderTopWidth:3,borderTopColor:'#AD90BD'},tabText:{fontSize:12,color:'#89768B'},tabTextSelected:{color:'#634A5E',fontWeight:'600'},
 book:{padding:5,backgroundColor:'#E8DCC7',borderRadius:16,borderWidth:1,borderColor:'#D9CBAF',shadowColor:'#806A49',shadowOpacity:.10,shadowRadius:16,shadowOffset:{width:0,height:8}},spread:{flexDirection:'row',alignItems:'stretch',gap:9},centerBinding:{position:'absolute',left:'50%',width:9,top:6,bottom:6,transform:[{translateX:-4.5}],backgroundColor:'#CCBCA5',borderLeftWidth:2,borderRightWidth:2,borderLeftColor:'#E5D7BF',borderRightColor:'#F8EDDC'},pageColumn:{flex:1,minWidth:0,gap:12},author:{flexDirection:'row',alignItems:'center',gap:15},portrait:{width:76,height:80,backgroundColor:'#F1EBDD',borderWidth:4,borderColor:'#FFFDF6',transform:[{rotate:'-4deg'}],shadowColor:'#4A3D2F',shadowOpacity:.15,shadowRadius:3,shadowOffset:{width:1,height:2}},tape:{position:'absolute',width:33,height:12,top:-10,left:17,backgroundColor:'#D6BC93AA',zIndex:2,transform:[{rotate:'-7deg'}]},authorName:{fontSize:14,fontWeight:'600',color:'#5E455F',fontFamily:notebookFont},feeling:{fontSize:11,color:'#8A7055',lineHeight:18},letterTitle:{fontSize:19,fontFamily:notebookFont,fontWeight:'600',color:'#4E3C4A',lineHeight:30,marginTop:8},handwriting:{fontSize:15,lineHeight:32,color:'#594C46',fontFamily:notebookFont},signature:{fontSize:12,lineHeight:24,color:'#8E7B6C',textAlign:'right',fontFamily:notebookFont},pageNumber:{fontSize:10,color:'#A0927D',textAlign:'center',letterSpacing:1.5,marginTop:5},body:{fontSize:13,lineHeight:23,color:'#776459'},
 detailsButton:{minHeight:62,padding:12,borderRadius:14,borderWidth:1,borderColor:'#DCD0BA',backgroundColor:'#F5EEE3',flexDirection:'row',alignItems:'center',gap:10},
 primary:{backgroundColor:'#886699',borderRadius:24,minHeight:48,paddingHorizontal:14,paddingVertical:10,flexDirection:'row',justifyContent:'center',alignItems:'center',gap:9},primaryText:{fontSize:13,color:'#FFF5E3',fontWeight:'600',textAlign:'center'},secondary:{minHeight:44,padding:10,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,backgroundColor:'#F0E9F3',borderRadius:18},secondaryText:{fontSize:12,color:'#795D87'},footer:{fontSize:11,lineHeight:19,color:'#8B778D',textAlign:'center',paddingHorizontal:8},input:{minHeight:192,fontSize:15,lineHeight:32,color:'#594C46',fontFamily:notebookFont,backgroundColor:'transparent',padding:0,borderWidth:0},counter:{fontSize:9,lineHeight:15,textAlign:'right',color:'#988C80'},moods:{flexDirection:'row',gap:4},mood:{flex:1,minHeight:76,alignItems:'center',justifyContent:'center',gap:6,borderRadius:14,borderWidth:1,borderColor:'#E6DDCE'},moodSelected:{backgroundColor:'#E8DDF0',borderColor:'#9E7CAB'},moodLabel:{fontSize:10,color:'#6B556F',textAlign:'center'},error:{fontSize:13,lineHeight:21,color:'#A04753',padding:12,backgroundColor:'#FBE5E1',borderRadius:6},simpleLink:{minHeight:44,alignItems:'center',justifyContent:'center'},historyRow:{flexDirection:'row',alignItems:'center',gap:12,paddingVertical:14,borderBottomWidth:1,borderColor:'#6F5C7844'},historyDate:{fontSize:11,color:colors.mutedForeground},historyTitle:{fontSize:14,lineHeight:23,color:colors.foreground},historyStatus:{fontSize:10,color:colors.primary},
});
