import {MerchantResident} from '@/components/village/MerchantResident';
import React,{useEffect,useRef,useState} from 'react';
import {AppState,Image,Pressable,StyleSheet,Text,View} from 'react-native';
import Svg,{Defs,LinearGradient,Stop,Path,Ellipse,Circle} from 'react-native-svg';
import {useApp} from '@/contexts/AppContext';
import {useAuth} from '@/contexts/AuthContext';
import {BottomSheet} from '@/components/ui/BottomSheet';
import {Icon,type IconName} from '@/components/ui/Icon';
import {VillageResident} from '@/components/village/VillageActors';
import {VILLAGE_STORIES,villageStory,type StoryId} from '@/data/villageStories';
import {readVillageStories,storyStatus,storyFinished,type VillageStoryState,type StoryReceipt} from '@/utils/villageStories';
import {getTodayDate} from '@/utils/dateUtils';
import {WORLD_MAPS,type WorldMapId} from '@/utils/worldMaps';
import {worldArt,FORTUNE_CAT_ART} from '@/utils/worldArt';

const symbols:Record<StoryId,IconName>={newcomer:'home',ramen:'coffee',bowling:'award',cat:'moon',festival:'sun'};
const placeName=(id:WorldMapId)=>WORLD_MAPS.find(p=>p.id===id)?.name??'';
export function useVillageStories(active:boolean){
 const {feedState,isLoading,cloudSynced}=useApp(),{isSignedIn,isLoading:authLoading}=useAuth();
 const [today,setToday]=useState(getTodayDate);
 useEffect(()=>{if(!active)return;const tick=()=>setToday(getTodayDate());tick();const timer=setInterval(tick,30000);const listener=AppState.addEventListener('change',s=>{if(s==='active')tick();});return()=>{clearInterval(timer);listener.remove();};},[active]);
 let state:VillageStoryState={version:1,arcs:{}},error='';try{state=readVillageStories(feedState.villageStories);}catch{error='物語の記録を読み込めませんでした。一度おうちに戻って、開き直してね。';}
 const ready=!isLoading&&!authLoading&&(!isSignedIn||cloudSynced)&&!error;
 const available=ready?VILLAGE_STORIES.filter(s=>{const status=storyStatus(state,s.id,today);return status.unlocked&&!status.finished&&!status.waiting&&!status.clockBlocked;}):[];
 return {state,today,ready,error,available};
}

export function VillageStoryPanel(props:{place?:WorldMapId;initialStory?:StoryId;onClose:()=>void;onGo:(map:WorldMapId)=>void;onBowl?:()=>void}){
 const {user}=useAuth();return <StoryPanel key={user?.id??'guest'} {...props}/>;
}
function StoryPanel({place,initialStory,onClose,onGo,onBowl}:{place?:WorldMapId;initialStory?:StoryId;onClose:()=>void;onGo:(map:WorldMapId)=>void;onBowl?:()=>void}){
 const {runVillageStory,bowlingState}=useApp();
 const {state,today,ready,error:readError}=useVillageStories(true);
 const [selected,setSelected]=useState<StoryId|null>(initialStory??null),[result,setResult]=useState<{index:number;receipt:StoryReceipt}|null>(null),[history,setHistory]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const pending=useRef(false),alive=useRef(true);useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 const story=selected?villageStory(selected):null,status=selected?storyStatus(state,selected,today):null;
 const select=(id:StoryId|null)=>{setSelected(id);setResult(null);setHistory(false);setError('');};
 const choose=async(choice:0|1)=>{
  if(!story||!status||!place||!ready||pending.current)return;
  pending.current=true;setBusy(true);setError('');const index=status.index;
  try{const saved=await runVillageStory({id:story.id,episode:index,choice,place});if(alive.current)setResult({index,receipt:saved.receipt});}
  catch(e){if(alive.current)setError(e instanceof Error?e.message:'保存できませんでした。もう一度お試しください。');}
  finally{pending.current=false;if(alive.current)setBusy(false);}
 };
 const hasBowled=Object.values(bowlingState.plays).some(p=>p.date===today);
 const button=(label:string,action:()=>void,id?:string,disabled=false)=><Pressable testID={id} accessibilityRole="button" disabled={disabled||busy} accessibilityState={{disabled:disabled||busy}} onPress={action} style={[s.button,(disabled||busy)&&{opacity:.5}]}><Text style={s.buttonText}>{label}</Text></Pressable>;
 return <BottomSheet visible title="村の物語" subtitle="急がなくていい。続きは、あなたが来た日に。" onClose={()=>{if(!pending.current)onClose();}}>
  {!!(readError||error)&&<Text accessibilityRole="alert" style={s.error}>{readError||error}</Text>}
  {!ready&&!readError?<Text style={s.copy}>物語を開いています…</Text>:!story?<>
   <Text style={s.copy}>それぞれ1日1話。遊ばない日があっても、続きはなくなりません。終えたお話と記念品も、ここで読み返せます。</Text>
   {VILLAGE_STORIES.map(st=>{const info=storyStatus(state,st.id,today);return <Pressable key={st.id} testID={`story-${st.id}`} accessibilityRole="button" onPress={()=>select(st.id)} style={s.card}>
    <View style={s.row}><View style={s.symbol}><Icon name={info.unlocked?symbols[st.id]:'lock'} size={23} color="#C5A77D"/></View><View style={{flex:1,gap:5}}><Text style={s.title}>{st.title}</Text><Text style={s.small}>{st.subtitle}</Text></View><Icon name="chevron-right" size={18} color="#BDA7CB"/></View>
    <View style={s.progress}>{st.episodes.map((_,i)=><View key={i} style={[s.segment,i<info.index&&s.filled]}/>)}</View>
    <Text style={s.tag}>{info.finished?`完結 · ${st.keepsake}`:!info.unlocked?`${st.requires.map(id=>villageStory(id).title).join('・')}の完結後に`:info.clockBlocked?'端末の日付を確認してください':info.waiting?`第${info.index}話まで · 続きは明日以降に`:`第${info.index+1}話 · ${placeName(info.episode.place)}で待っています`}</Text>
   </Pressable>;})}
  </>:<>
   {button('‹ 物語の一覧へ',()=>select(null))}
   <Text style={s.storyTitle}>{story.title}</Text>
   {!status!.unlocked?<Text style={s.copy}>{story.requires.map(id=>`「${villageStory(id).title}」`).join('と')}を終えると、このお話が始まります。</Text>:result?<View testID="story-result" style={s.paper}>
    <Text style={s.eyebrow}>第{result.index+1}話 · {story.episodes[result.index].title}</Text><Text style={s.narration}>{story.episodes[result.index].replies[result.receipt.choice]}</Text>
    {result.receipt.bowlingPins!==undefined&&<Text style={s.inkSmall}>今日の最高記録：{result.receipt.bowlingPins}本。挑戦した一投を残しました。</Text>}
    {status!.finished?<><StoryMemoryArt id={story.id} state={state}/><Text style={s.inkTitle}>{story.keepsake}</Text><Text style={s.inkSmall}>{story.ending}</Text><Text style={s.inkSmall}>「思い出 → 村の物語」から、いつでも読み返せます。</Text>{VILLAGE_STORIES.filter(st=>st.requires.includes(story.id)&&storyStatus(state,st.id,today).unlocked).map(st=><Text key={st.id} style={s.inkSmall}>新しいお話「{st.title}」が始められます。</Text>)}</>:<><Text style={s.inkSmall}>つづく · {story.episodes[result.index].teaser}</Text><Text style={s.inkSmall}>今日はここまで。また明日以降、好きな日に。</Text></>}
   </View>:history||status!.finished?<>
    {status!.finished&&<View style={s.paper}><StoryMemoryArt id={story.id} state={state}/><Text style={s.inkTitle}>{story.keepsake}</Text><Text style={s.inkSmall}>{story.ending}</Text></View>}
    {(state.arcs[story.id]?.episodes??[]).map((r,i)=><View key={i} style={s.paper}><Text style={s.eyebrow}>{r.date} · 第{i+1}話</Text><Text style={s.inkTitle}>{story.episodes[i].title}</Text><Text style={s.narration}>{story.episodes[i].text}</Text><Text style={s.choiceMemory}>あなた：{story.episodes[i].choices[r.choice]}</Text><Text style={s.narration}>{story.episodes[i].replies[r.choice]}</Text>{r.bowlingPins!==undefined&&<Text style={s.inkSmall}>本番の最高記録：{r.bowlingPins}本</Text>}</View>)}
    {!status!.finished&&button('続きへ戻る',()=>setHistory(false))}
   </>:status!.waiting||status!.clockBlocked?<View style={s.paper}><Text style={s.inkTitle}>今日は、ここまで。</Text><Text style={s.narration}>{status!.clockBlocked?'端末の日付を確認して、もう一度開いてね。':story.episodes[status!.index-1].teaser}</Text><Text style={s.inkSmall}>続きは明日以降、いつでも。取り逃しはありません。</Text></View>:<>
    <View style={s.paper}><Text style={s.eyebrow}>第{status!.index+1}話 / 6 · {placeName(status!.episode.place)}</Text><Text style={s.inkTitle}>{status!.episode.title}</Text><Text style={s.speaker}>{status!.episode.speaker}</Text><Text style={s.narration}>{status!.episode.text}</Text>
     {story.id==='newcomer'&&status!.index>=2&&<Text style={s.inkSmall}>{state.arcs.newcomer?.episodes[1]?.choice===0?'あの窓辺の花は、今日も元気だって。':'あの椅子は、もうお気に入りになったって。'}</Text>}
    </View>
    {place!==status!.episode.place?button(`${placeName(status!.episode.place)}へ行く`,()=>onGo(status!.episode.place),'story-travel'):status!.episode.bowl&&!hasBowled?<>{button('受付で本番を投げる',()=>onBowl?onBowl():onGo('bowling'),'story-bowl')}<Text style={s.small}>練習なし。本番1回で進みます。今日すでに投げた記録も使えます。</Text></>:status!.episode.choices.map((label,i)=><React.Fragment key={i}>{button(busy?'思い出を保存しています…':label,()=>void choose(i as 0|1),`story-choice-${i}`,!ready)}</React.Fragment>)}
   </>}
   {!history&&!status!.finished&&status!.index>0&&button('ここまでのお話を読み返す',()=>{setResult(null);setHistory(true);})}
   {button('村に戻る',onClose,'story-close',busy)}
  </>}
 </BottomSheet>;
}

/** Existing world art and residents form a lightweight keepsake; no new asset downloads. */
export function StoryMemoryArt({id,state}:{id:StoryId;state:VillageStoryState}){
 const location=villageStory(id).episodes.at(-1)!.place;
 return <View accessibilityLabel={villageStory(id).keepsake} style={s.photo}>
  <Image source={worldArt(location,id==='cat')} resizeMode="cover" style={StyleSheet.absoluteFill}/>
  <View style={s.photoShade}/><View style={s.photoPeople}>{id==='cat'?<Image source={FORTUNE_CAT_ART} style={{width:135,height:145}} resizeMode="contain"/>:id==='ramen'?<MerchantResident kind="ramen" size={108} active={false} reduceMotion/>:<VillageResident stage="odango" size={95} active={false} reduceMotion/>}{id!=='cat'&&<VillageResident stage={id==='festival'?'stage3':'egg'} size={76} active={false} reduceMotion/>}</View>
  <View style={s.stamp}><Icon name={symbols[id]} size={28} color="#F4D893"/></View>
  <Text style={s.photoCaption}>{villageStory(id).title} · {state.arcs[id]?.episodes.at(-1)?.date}</Text>
 </View>;
}

export function StoryWorldKeepsakes({state,map,width,height,active,reduceMotion,onTalk}:{state:VillageStoryState;map:WorldMapId;width:number;height:number;active:boolean;reduceMotion:boolean;onTalk:()=>void}){
 const newcomer=storyFinished(state,'newcomer'),festival=(state.arcs.festival?.episodes.length??0)>=5,bowling=storyFinished(state,'bowling');
 const warm=state.arcs.festival?.episodes[2]?.choice!==1;
 return <>
  {map==='market'&&newcomer&&<Pressable testID="story-new-neighbor" accessibilityRole="button" accessibilityLabel="引っ越してきたもふもふと話す" disabled={!active} onPress={onTalk} style={{position:'absolute',left:width*.28,top:height*.68-width*.13,width:width*.15,zIndex:680}}><VillageResident stage="odango" size={width*.15} active={active} reduceMotion={reduceMotion}/></Pressable>}
  {map==='market'&&festival&&<View pointerEvents="none" style={{position:'absolute',left:width*.14,top:height*.33,width:width*.72,height:width*.16,zIndex:450}}><Svg width="100%" height="100%" viewBox="0 0 400 80"><Path d="M0 10 Q200 85 400 10" fill="none" stroke="#695035" strokeWidth="3"/>{[45,110,175,240,305,365].map((x,i)=><React.Fragment key={x}><Ellipse cx={x} cy={28+Math.sin(i/5*Math.PI)*27} rx="13" ry="18" fill={warm?'#F3C765':'#BE93D5'} stroke="#FBE6B5" strokeWidth="2"/><Path d={`M${x} ${48+Math.sin(i/5*Math.PI)*27} v8`} stroke="#E9BC74" strokeWidth="2"/></React.Fragment>)}</Svg></View>}
  {map==='bowling'&&bowling&&<View pointerEvents="none" accessibilityLabel="村の大会の記念カップ" style={{position:'absolute',left:width*.79,top:height*.45,width:width*.075,height:width*.11,zIndex:500}}><Svg width="100%" height="100%" viewBox="0 0 60 90"><Defs><LinearGradient id="storyCup"><Stop stopColor="#8B542A"/><Stop offset=".45" stopColor="#FFE1A0"/><Stop offset="1" stopColor="#B37530"/></LinearGradient></Defs><Path d="M12 14H3V32Q3 44 22 45M48 14H57V32Q57 44 38 45" stroke="#DBAB59" strokeWidth="5" fill="none"/><Path d="M10 7H50L45 38Q43 49 33 52V68H44V78H16V68H27V52Q17 49 15 38Z" fill="url(#storyCup)"/><Ellipse cx="30" cy="8" rx="20" ry="5" fill="#E8C278"/><Circle cx="30" cy="30" r="7" fill="#FFF0B7"/></Svg></View>}
 </>;
}
const s=StyleSheet.create({copy:{color:'#CDBCD6',fontSize:13,lineHeight:23,marginBottom:18},small:{color:'#BAAAC5',fontSize:12,lineHeight:19},card:{paddingVertical:18,gap:12,borderBottomWidth:1,borderColor:'#9981A14D'},row:{flexDirection:'row',alignItems:'center',gap:12},symbol:{width:44,height:50,justifyContent:'center',alignItems:'center',borderWidth:1,borderColor:'#B9A07877',borderRadius:16},title:{fontSize:16,fontWeight:'600',color:'#F2E6F2'},storyTitle:{fontSize:23,lineHeight:33,color:'#F3E6F2',marginVertical:17},progress:{flexDirection:'row',gap:5},segment:{height:3,flex:1,backgroundColor:'#50405E',borderRadius:2},filled:{backgroundColor:'#E8C18E'},tag:{fontSize:11,color:'#E5CAA0',lineHeight:18},button:{minHeight:48,borderRadius:12,backgroundColor:'#4F3C60',borderWidth:1,borderColor:'#BEA6C173',paddingHorizontal:16,paddingVertical:13,justifyContent:'center',marginTop:10},buttonText:{color:'#F4E9F4',fontSize:14,lineHeight:22,textAlign:'center'},paper:{backgroundColor:'#F5ECDC',padding:20,borderRadius:16,gap:14,marginVertical:10},eyebrow:{color:'#8B7060',fontSize:11,lineHeight:19,letterSpacing:.5},inkTitle:{color:'#51413A',fontSize:19,lineHeight:29,fontWeight:'600'},narration:{color:'#50413B',fontSize:15,lineHeight:29},speaker:{color:'#917459',fontSize:12,marginTop:4},inkSmall:{color:'#876F60',fontSize:12,lineHeight:22},choiceMemory:{color:'#88664E',fontSize:12,lineHeight:22,borderTopWidth:1,borderColor:'#D8C7AE',paddingTop:12},error:{color:'#FFE0C3',fontSize:13,lineHeight:23,padding:12},photo:{height:205,borderRadius:6,overflow:'hidden',backgroundColor:'#594459'},photoShade:{...StyleSheet.absoluteFillObject,backgroundColor:'#291B302A'},photoPeople:{position:'absolute',left:20,right:20,bottom:24,flexDirection:'row',alignItems:'flex-end',justifyContent:'center'},stamp:{position:'absolute',right:12,top:12,padding:9,backgroundColor:'#352B3DDD',borderRadius:40},photoCaption:{position:'absolute',left:0,right:0,bottom:0,padding:8,fontSize:10,textAlign:'center',color:'#FFF3E4',backgroundColor:'#312237DD'}});
