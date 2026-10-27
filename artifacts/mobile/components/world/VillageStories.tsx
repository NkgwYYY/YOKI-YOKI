import {STORY_DESTINATIONS} from '@/utils/worldProgress';
import {colors} from '@/constants/theme';
import {STORY_RESIDENT_SIZE} from '@/utils/encounterLayout';
import {GrandmotherResident} from './VegetableGarden';
import {MerchantResident} from '@/components/village/MerchantResident';
import React,{useEffect,useRef,useState} from 'react';
import {AppState,Image,Modal,Pressable,ScrollView,StyleSheet,Text,View,useWindowDimensions} from 'react-native';
import Svg,{Defs,LinearGradient,Stop,Path,Ellipse,Circle,Rect} from 'react-native-svg';
import {useApp} from '@/contexts/AppContext';
import {useAuth} from '@/contexts/AuthContext';
import {BottomSheet} from '@/components/ui/BottomSheet';
import {Icon,type IconName} from '@/components/ui/Icon';
import {VillageResident} from '@/components/village/VillageActors';
import {VILLAGE_STORIES,villageStory,type StoryId} from '@/data/villageStories';
import {readVillageStories,storyStatus,storyFinished,type VillageStoryState,type StoryReceipt} from '@/utils/villageStories';
import {rememberedStories,type StoryEncounter} from '@/utils/storyEncounters';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {getTodayDate} from '@/utils/dateUtils';
import {WORLD_MAPS,isMapAvailable,type WorldMapId} from '@/utils/worldMaps';
import {worldArt,FORTUNE_CAT_ART} from '@/utils/worldArt';

const symbols:Record<StoryId,IconName>={grandma:'feather',supply:'shopping-bag',newcomer:'home',ramen:'coffee',bowling:'award',cat:'moon',festival:'sun'};
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

/** Read-only album: undiscovered stories and future episodes never appear here. */
export function VillageStoryArchive({onClose}:{onClose:()=>void}){
 const {state,ready,error}=useVillageStories(true);
 const [selected,setSelected]=useState<StoryId|null>(null);
 const remembered=rememberedStories(state),story=remembered.find(st=>st.id===selected);
 return <BottomSheet visible title="村でのできごと" subtitle="村で出会った、小さな思い出。" onClose={onClose}>
  {!!error&&<Text accessibilityRole="alert" style={s.error}>{error}</Text>}
  {!ready&&!error?<Text style={s.copy}>思い出を開いています…</Text>:!story?<>
   {!remembered.length&&<Text testID="story-album-empty" style={s.copy}>村で誰かと過ごしたできごとが、ここに残っていきます。今日はどこへおさんぽしよう。</Text>}
   {remembered.map(st=><Pressable key={st.id} testID={`story-memory-${st.id}`} accessibilityRole="button" onPress={()=>setSelected(st.id)} style={s.card}><View style={s.row}><Icon name={symbols[st.id]} size={23} color="#C5A77D"/><View style={{flex:1,gap:5}}><Text style={s.title}>{st.title}</Text><Text style={s.small}>{state.arcs[st.id]?.episodes.at(-1)?.date} · {storyFinished(state,st.id)?st.keepsake:'一緒に過ごした思い出'}</Text></View><Icon name="chevron-right" size={18} color="#BDA7CB"/></View></Pressable>)}
  </>:<>
   <Pressable accessibilityRole="button" style={s.button} onPress={()=>setSelected(null)}><Text style={s.buttonText}>‹ 思い出に戻る</Text></Pressable>
   <Text style={s.storyTitle}>{story.title}</Text>
   {storyFinished(state,story.id)&&<View style={s.paper}><StoryMemoryArt id={story.id} state={state}/><Text style={s.inkTitle}>{story.keepsake}</Text><Text style={s.inkSmall}>{story.ending}</Text></View>}
   {(state.arcs[story.id]?.episodes??[]).map((r,i)=><View key={i} style={s.paper}><Text style={s.eyebrow}>{r.date} · {placeName(story.episodes[i].place)}</Text><Text style={s.inkTitle}>{story.episodes[i].title}</Text><Text style={s.narration}>{story.episodes[i].text}</Text><Text style={s.choiceMemory}>あなた：{story.episodes[i].choices[r.choice]}</Text><Text style={s.narration}>{story.episodes[i].replies[r.choice]}</Text>{r.bowlingPins!==undefined&&<Text style={s.inkSmall}>本番の最高記録：{r.bowlingPins}本</Text>}</View>)}
  </>}
 </BottomSheet>;
}

type DialogueProps={encounter:StoryEncounter;onClose:()=>void;onBowl:()=>void;onGo?:(map:WorldMapId)=>void;service?:{label:string;run:()=>void}};
export function VillageStoryDialogue(props:DialogueProps){const {user}=useAuth();return <StoryDialogue key={`${user?.id??'guest'}:${props.encounter.key}`} {...props}/>;}
function StoryDialogue({encounter,onClose,onBowl,onGo,service}:DialogueProps){
 const {runVillageStory,bowlingState}=useApp(),{today,ready,error:readError}=useVillageStories(true);
 const {height}=useWindowDimensions(),insets=useSafeAreaInsets();
 const story=villageStory(encounter.id),episode=story.episodes[encounter.index];
 const [receipt,setReceipt]=useState<StoryReceipt|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const pending=useRef(false),alive=useRef(true);useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 const choose=async(choice:0|1)=>{
  if(!ready||pending.current||receipt)return;
  pending.current=true;setBusy(true);setError('');
  try{const saved=await runVillageStory({id:encounter.id,episode:encounter.index,choice,place:encounter.place});if(alive.current)setReceipt(saved.receipt);}
  catch(e){if(alive.current)setError(e instanceof Error?e.message:'保存できませんでした。もう一度お試しください。');}
  finally{pending.current=false;if(alive.current)setBusy(false);}
 };
 const invitations=receipt?STORY_DESTINATIONS.filter(p=>isMapAvailable(p.id,'web')&&p.story===encounter.id&&p.episodes===encounter.index+1):[];
 const close=()=>{if(!pending.current)onClose();};
 const hasBowled=Object.values(bowlingState.plays).some(p=>p.date===today);
 return <Modal transparent visible animationType="fade" onRequestClose={close}>
  <View style={{flex:1,justifyContent:'flex-end'}} pointerEvents="box-none">
   <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel="会話を閉じる" onPress={close} disabled={busy}/>
   <View testID="story-encounter-dialogue" accessibilityViewIsModal style={[s.talk,{marginBottom:Math.max(insets.bottom,14),maxHeight:height*.57}]}>
    <View style={s.row}><Text style={[s.title,{flex:1}]}>{episode.speaker}</Text><Pressable accessibilityRole="button" accessibilityLabel="またあとで" disabled={busy} onPress={close} style={{width:36,height:36,alignItems:'center',justifyContent:'center'}}><Icon name="x" size={20} color={colors.primary}/></Pressable></View>
    <ScrollView style={{flexShrink:1}} contentContainerStyle={{gap:9,paddingBottom:5}}><Text testID="story-encounter-text" accessibilityLiveRegion="polite" style={s.talkText}>{receipt?episode.replies[receipt.choice]:episode.text}</Text>
     {receipt&&encounter.index===story.episodes.length-1&&<Text style={s.tag}>{story.keepsake}を思い出にしまった。</Text>}
     {invitations.length>0&&<Text testID="story-path-invitation" accessibilityLiveRegion="polite" style={s.tag}>{invitations.map(p=>p.name).join('と')}への道を教えてもらった。地図から、いつでも遊びに行けます。</Text>}
     {!!(readError||error)&&<Text accessibilityRole="alert" style={s.error}>{readError||error}</Text>}
    </ScrollView>
    {receipt?<Pressable testID="story-close" accessibilityRole="button" onPress={close} style={s.answer}><Text style={s.buttonText}>またね</Text></Pressable>:episode.bowl&&!hasBowled?<Pressable testID="story-bowl" accessibilityRole="button" onPress={onBowl} style={s.answer}><Text style={s.buttonText}>受付へ行って、一投する</Text></Pressable>:<View style={{flexDirection:'row',gap:8}}>{episode.choices.map((label,i)=><Pressable key={i} testID={`story-choice-${i}`} accessibilityRole="button" disabled={!ready||busy} onPress={()=>void choose(i as 0|1)} style={[s.answer,{flex:1},(!ready||busy)&&{opacity:.5}]}><Text style={s.buttonText}>{busy?'思い出を残しています…':label}</Text></Pressable>)}</View>}
    {receipt&&encounter.id==='grandma'&&encounter.index===5&&onGo&&<Pressable testID="story-grandma-visit" accessibilityRole="button" onPress={()=>onGo('grandma')} style={s.answer}><Text style={s.buttonText}>おばあさんの家へ、お茶に行く</Text></Pressable>}
    {service&&<Pressable testID="story-service" accessibilityRole="button" disabled={busy} onPress={()=>{if(!pending.current)service.run();}} style={{minHeight:34,justifyContent:'center'}}><Text style={s.small}>{service.label}　→</Text></Pressable>}
   </View>
  </View>
 </Modal>;
}

export function StoryEncounterActor({encounter,width,height,active,reduceMotion,onTalk}:{encounter:StoryEncounter;width:number;height:number;active:boolean;reduceMotion:boolean;onTalk:()=>void}){
 const size=width*(encounter.place==='market'?STORY_RESIDENT_SIZE:.17);
 return <Pressable testID="story-encounter-resident" accessibilityRole="button" accessibilityLabel={`${villageStory(encounter.id).episodes[encounter.index].speaker}に話しかける`} disabled={!active} onPress={onTalk} style={{position:'absolute',left:width*encounter.point.x-size/2,top:height*encounter.point.y-size,width:size,zIndex:700,alignItems:'center'}}>
  {encounter.id==='grandma'?<GrandmotherResident size={size} active={active} reduceMotion={reduceMotion}/>:<VillageResident stage={encounter.stage} size={size} active={active} reduceMotion={reduceMotion}/>}
  {encounter.id==='newcomer'&&encounter.index===0&&<Svg pointerEvents="none" width={size*.65} height={size*.5} viewBox="0 0 80 60" style={{position:'absolute',bottom:0,right:-size*.18}}><Ellipse cx="42" cy="56" rx="34" ry="4" fill="#382F2433"/><Path d="M7 16L29 4L73 13L53 27Z" fill="#E6C690"/><Path d="M7 16L53 27V57L7 44Z" fill="#BB8C55"/><Path d="M53 27L73 13V43L53 57Z" fill="#8E633F"/><Path d="M28 11L40 14L61 19L53 27L31 21V51L22 48V18Z" fill="#E7CAA0"/><Rect x="36" y="32" width="12" height="9" rx="1" fill="#F2DFC0"/></Svg>}
 </Pressable>;
}

/** Existing world art and residents form a lightweight keepsake; no new asset downloads. */
export function StoryMemoryArt({id,state}:{id:StoryId;state:VillageStoryState}){
 const location=villageStory(id).episodes.at(-1)!.place;
 return <View accessibilityLabel={villageStory(id).keepsake} style={s.photo}>
  <Image source={worldArt(location,id==='cat')} resizeMode="cover" style={StyleSheet.absoluteFill}/>
  <View style={s.photoShade}/><View style={s.photoPeople}>{id==='cat'?<Image source={FORTUNE_CAT_ART} style={{width:135,height:145}} resizeMode="contain"/>:id==='grandma'?<GrandmotherResident size={108} active={false} reduceMotion/>:(id==='ramen'||id==='supply')?<MerchantResident kind="ramen" size={108} active={false} reduceMotion/>:<VillageResident stage="odango" size={95} active={false} reduceMotion/>}{id!=='cat'&&<VillageResident stage={id==='festival'?'stage3':'egg'} size={76} active={false} reduceMotion/>}</View>
  <View style={s.stamp}><Icon name={symbols[id]} size={28} color="#F4D893"/></View>
  <Text style={s.photoCaption}>{villageStory(id).title} · {state.arcs[id]?.episodes.at(-1)?.date}</Text>
 </View>;
}

export function StoryWorldKeepsakes({state,map,width,height,active,reduceMotion,onTalk,hideNewcomer=false}:{state:VillageStoryState;map:WorldMapId;width:number;height:number;active:boolean;reduceMotion:boolean;onTalk:()=>void;hideNewcomer?:boolean}){
 const newcomer=storyFinished(state,'newcomer'),festival=(state.arcs.festival?.episodes.length??0)>=5,bowling=storyFinished(state,'bowling');
 const warm=state.arcs.festival?.episodes[2]?.choice!==1;
 return <>
  {map==='market'&&newcomer&&!hideNewcomer&&<Pressable testID="story-new-neighbor" accessibilityRole="button" accessibilityLabel="引っ越してきたもふもふと話す" disabled={!active} onPress={onTalk} style={{position:'absolute',left:width*.28,top:height*.68-width*.13,width:width*.15,zIndex:680}}><VillageResident stage="odango" size={width*.15} active={active} reduceMotion={reduceMotion}/></Pressable>}
  {map==='market'&&festival&&<View pointerEvents="none" style={{position:'absolute',left:width*.14,top:height*.33,width:width*.72,height:width*.16,zIndex:450}}><Svg width="100%" height="100%" viewBox="0 0 400 80"><Path d="M0 10 Q200 85 400 10" fill="none" stroke="#695035" strokeWidth="3"/>{[45,110,175,240,305,365].map((x,i)=><React.Fragment key={x}><Ellipse cx={x} cy={28+Math.sin(i/5*Math.PI)*27} rx="13" ry="18" fill={warm?'#F3C765':'#BE93D5'} stroke="#FBE6B5" strokeWidth="2"/><Path d={`M${x} ${48+Math.sin(i/5*Math.PI)*27} v8`} stroke="#E9BC74" strokeWidth="2"/></React.Fragment>)}</Svg></View>}
  {map==='bowling'&&bowling&&<View pointerEvents="none" accessibilityLabel="村の大会の記念カップ" style={{position:'absolute',left:width*.79,top:height*.45,width:width*.075,height:width*.11,zIndex:500}}><Svg width="100%" height="100%" viewBox="0 0 60 90"><Defs><LinearGradient id="storyCup"><Stop stopColor="#8B542A"/><Stop offset=".45" stopColor="#FFE1A0"/><Stop offset="1" stopColor="#B37530"/></LinearGradient></Defs><Path d="M12 14H3V32Q3 44 22 45M48 14H57V32Q57 44 38 45" stroke="#DBAB59" strokeWidth="5" fill="none"/><Path d="M10 7H50L45 38Q43 49 33 52V68H44V78H16V68H27V52Q17 49 15 38Z" fill="url(#storyCup)"/><Ellipse cx="30" cy="8" rx="20" ry="5" fill="#E8C278"/><Circle cx="30" cy="30" r="7" fill="#FFF0B7"/></Svg></View>}
 </>;
}
const s=StyleSheet.create({talk:{width:"94%",maxWidth:500,alignSelf:"center",backgroundColor:colors.card,borderWidth:1,borderColor:colors.border,borderRadius:14,padding:15,gap:9},talkText:{fontSize:14,lineHeight:24,color:colors.foreground},answer:{backgroundColor:colors.primary,minHeight:44,borderRadius:9,paddingHorizontal:12,paddingVertical:10,justifyContent:"center"},copy:{color:colors.mutedForeground,fontSize:13,lineHeight:23,marginBottom:18},small:{color:colors.mutedForeground,fontSize:12,lineHeight:19},card:{paddingVertical:18,gap:12,borderBottomWidth:1,borderColor:colors.border},row:{flexDirection:'row',alignItems:'center',gap:12},symbol:{width:44,height:50,justifyContent:'center',alignItems:'center',borderWidth:1,borderColor:colors.border,borderRadius:16},title:{fontSize:16,fontWeight:'600',color:colors.foreground},storyTitle:{fontSize:23,lineHeight:33,color:colors.foreground,marginVertical:17},progress:{flexDirection:'row',gap:5},segment:{height:3,flex:1,backgroundColor:colors.border,borderRadius:2},filled:{backgroundColor:colors.primary},tag:{fontSize:11,color:colors.primary,lineHeight:18},button:{minHeight:48,borderRadius:12,backgroundColor:colors.primary,borderWidth:1,borderColor:colors.primary,paddingHorizontal:16,paddingVertical:13,justifyContent:'center',marginTop:10},buttonText:{color:colors.primaryForeground,fontSize:14,lineHeight:22,textAlign:'center'},paper:{backgroundColor:'#F5ECDC',padding:20,borderRadius:16,gap:14,marginVertical:10},eyebrow:{color:'#8B7060',fontSize:11,lineHeight:19,letterSpacing:.5},inkTitle:{color:'#51413A',fontSize:19,lineHeight:29,fontWeight:'600'},narration:{color:'#50413B',fontSize:15,lineHeight:29},speaker:{color:'#917459',fontSize:12,marginTop:4},inkSmall:{color:'#876F60',fontSize:12,lineHeight:22},choiceMemory:{color:'#88664E',fontSize:12,lineHeight:22,borderTopWidth:1,borderColor:'#D8C7AE',paddingTop:12},error:{color:colors.danger,fontSize:13,lineHeight:23,padding:12},photo:{height:205,borderRadius:16,overflow:'hidden',backgroundColor:'#594459'},photoShade:{...StyleSheet.absoluteFillObject,backgroundColor:'#291B302A'},photoPeople:{position:'absolute',left:20,right:20,bottom:24,flexDirection:'row',alignItems:'flex-end',justifyContent:'center'},stamp:{position:'absolute',right:12,top:12,padding:9,backgroundColor:'#352B3DDD',borderRadius:40},photoCaption:{position:'absolute',left:0,right:0,bottom:0,padding:8,fontSize:10,textAlign:'center',color:'#FFF3E4',backgroundColor:'#312237DD'}});
