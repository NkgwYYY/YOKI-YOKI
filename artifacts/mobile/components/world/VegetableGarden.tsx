import React,{useEffect,useRef,useState} from 'react';
import {AppState,Image,Pressable,StyleSheet,Text,View} from 'react-native';
import Svg,{Circle,Defs,Ellipse,Path,RadialGradient,Rect,Stop} from 'react-native-svg';
import {useApp} from '@/contexts/AppContext';
import {useAuth} from '@/contexts/AuthContext';
import {BottomSheet} from '@/components/ui/BottomSheet';
import {VillageResident} from '@/components/village/VillageActors';
import {CROPS,gardenUnlocked,wholesaleUnlocked,readGarden,plotStatus,type CropId,type GardenOperation} from '@/utils/vegetableGarden';
import {getTodayDate} from '@/utils/dateUtils';
import {GARDEN_CROP_ART} from '@/utils/worldArt';

const cropIds=Object.keys(CROPS) as CropId[];
type Action=GardenOperation extends infer O?O extends GardenOperation?Omit<O,'revision'>:never:never;
export function useGarden(){
 const {feedState,runGarden,isLoading,cloudSynced}=useApp(),{isSignedIn,isLoading:authLoading}=useAuth();
 const [today,setToday]=useState(getTodayDate),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
 const pending=useRef(false),alive=useRef(true);
 useEffect(()=>{alive.current=true;const tick=()=>setToday(getTodayDate());const timer=setInterval(tick,30000);const sub=AppState.addEventListener('change',s=>{if(s==='active')tick();});return()=>{alive.current=false;clearInterval(timer);sub.remove();};},[]);
 let garden=readGarden(undefined),readError='';try{garden=readGarden(feedState.vegetableGarden);}catch{readError='畑の記録を読み込めませんでした。開き直してください。';}
 const unlocked=gardenUnlocked(feedState),ready=unlocked&&!readError&&!isLoading&&!authLoading&&(!isSignedIn||cloudSynced);
 const act=async(op:Action)=>{
  if(!ready||pending.current)return;pending.current=true;setBusy(true);setError('');setMessage('');
  try{const saved=await runGarden({...op,revision:garden.revision});if(alive.current)setMessage(saved.message);return saved;}
  catch(e){if(alive.current)setError(e instanceof Error?e.message:'保存できませんでした。もう一度お試しください。');}
  finally{pending.current=false;if(alive.current)setBusy(false);}
 };
 return {garden,today,busy,message,error:error||readError,ready,unlocked,feedState,act};
}
export function GrandmotherResident({size,active,reduceMotion}:{size:number;active:boolean;reduceMotion:boolean}){
 return <View pointerEvents="none" style={{width:size,height:size}}><VillageResident stage="odango" size={size} active={active} reduceMotion={reduceMotion}/><Svg width={size} height={size} viewBox="0 0 100 100" style={StyleSheet.absoluteFill}>
  <Defs><RadialGradient id="grandmaBun" cx=".35" cy=".25"><Stop stopColor="#FAF3E4"/><Stop offset="1" stopColor="#B4A99E"/></RadialGradient></Defs>
  <Ellipse cx="50" cy="14" rx="16" ry="12" fill="url(#grandmaBun)"/><Path d="M38 14Q50 6 61 15M40 17Q50 11 60 18" fill="none" stroke="#C5BCB0" strokeWidth="1"/>
  <Path d="M29 75Q50 84 72 75L76 91Q49 99 24 91Z" fill="#B49BC3"/><Path d="M41 77L39 96H64L60 78" fill="#F1E4CC"/><Rect x="46" y="84" width="10" height="7" rx="2" fill="#DDD0B9"/>
  <Circle cx="37" cy="47" r="10" fill="#FFFFFF08" stroke="#977451" strokeWidth="1.8"/><Circle cx="64" cy="47" r="10" fill="#FFFFFF08" stroke="#977451" strokeWidth="1.8"/><Path d="M47 45Q51 42 54 45M27 45L21 43M74 45L80 43" stroke="#977451" strokeWidth="1.6" fill="none"/>
 </Svg></View>;
}
/** A single shared atlas keeps the field lightweight, including on phones. */
export function CropArt({crop,growth=7,size=72}:{crop:CropId;growth?:number;size?:number}){
 const tile=growth<5?{x:0,y:0}:crop==='turnip'?{x:1,y:0}:crop==='carrot'?{x:0,y:1}:{x:1,y:1};
 if(growth===0)return <Svg width={size} height={size} viewBox="0 0 100 100"><Ellipse cx="50" cy="86" rx="15" ry="4" fill="#422C2466"/><Ellipse cx="47" cy="84" rx="3" ry="1.5" fill="#C3A06A"/><Ellipse cx="54" cy="86" rx="2" ry="1" fill="#E4C998"/></Svg>;
 return <View pointerEvents="none" style={{width:size,height:size,overflow:'hidden'}}><Image source={GARDEN_CROP_ART} resizeMode="stretch" style={{position:'absolute',width:size*2,height:size*2,left:-tile.x*size,top:-tile.y*size}}/></View>;
}
// Logical saved plantings follow the furrows of one continuous field; no plot borders.
export const GARDEN_PLOTS=[.465,.535,.605,.675].map(y=>({x:.55,y}));
function GardenCue({kind}:{kind:'water'|'harvest'|'plant'}){
 return <View style={{width:26,height:26,borderRadius:13,backgroundColor:kind==='water'?'#E6F5F0EA':'#FFF2D4E8',alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:'#FFFFFF80'}}><Svg width={17} height={17} viewBox="0 0 24 24">{kind==='water'?<Path d="M12 3C10 7 5 11 5 15a7 7 0 0 0 14 0c0-4-5-8-7-12Z" fill="#78AFBF" stroke="#47768D" strokeWidth="1.3"/>:kind==='harvest'?<Path d="m12 2 2.8 7.2L22 12l-7.2 2.8L12 22l-2.8-7.2L2 12l7.2-2.8Z" fill="#D3A340"/>:<><Path d="M12 21V10M12 14C3 15 2 6 3 5c7-1 10 3 9 9ZM12 11C12 4 18 2 22 3c0 6-4 9-10 8Z" fill="#72985B" stroke="#4E7041" strokeWidth="1.2"/></>}</Svg></View>;
}
export function GardenBeds({width,height,active,onPlot}:{width:number;height:number;active:boolean;onPlot:(i:number)=>void}){
 const {garden,today,error,ready}=useGarden();
 if(error)return <Text accessibilityRole="alert" style={{position:'absolute',left:width*.24,top:height*.52,color:'#FFF4D9',backgroundColor:'#4C3843',padding:12}}>{error}</Text>;
 return <>{GARDEN_PLOTS.map((row,i)=>{
  const plot=garden.plots[i],status=plotStatus(plot,today);
  const label=!plot?'種をまく':status.mature?'収穫する':status.watered?'育ち具合を見る':'水をあげる';
  const cue=!plot?'plant':status.mature?'harvest':!status.watered?'water':null;
  const scale=status.growth<3?.057+status.growth*.013:status.growth<5?.085+(status.growth-3)*.012:.11+(status.growth-5)*.012;
  return <React.Fragment key={i}>{[.34,.48,.62,.76].map((x,j)=>{
   const y=row.y+(row.x-x)*.16,size=width*scale*(j%2?.95:1.04),hit=Math.max(44,width*.125);
   return <Pressable key={j} testID={`garden-plot-${i}${j?'--'+j:''}`} accessibilityRole="button" accessibilityLabel={`${plot?CROPS[plot.crop].name+'、':''}${label}、${i+1}列目`} disabled={!active||!ready} onPress={()=>onPlot(i)} style={{position:'absolute',left:width*x-hit/2,top:height*y-hit*.80,width:hit,height:hit,zIndex:600+i}}>
    {plot&&<View pointerEvents="none" style={{position:'absolute',left:(hit-size)/2,top:hit*.80-size*.90}}><CropArt crop={plot.crop} growth={status.growth} size={size}/></View>}

   </Pressable>;
  })}{cue&&<Pressable testID={`garden-cue-${i}`} accessibilityRole="button" accessibilityLabel={`${plot?CROPS[plot.crop].name+'、':''}${label}、${i+1}列目`} disabled={!active||!ready} onPress={()=>onPlot(i)} style={{position:'absolute',left:width*.62-22,top:height*(row.y+(row.x-.62)*.16)-Math.max(44,width*.125)*.80+(plot?-Math.max(4,width*scale*1.04-Math.max(44,width*.125)*.58):Math.max(44,width*.125)*.25)-9,width:44,height:44,zIndex:720+i,alignItems:'center',justifyContent:'center'}}><GardenCue kind={cue}/></Pressable>}</React.Fragment>;
 })}</>;
}
function Feedback({garden}:{garden:ReturnType<typeof useGarden>}){return <>{!!garden.error&&<Text accessibilityRole="alert" style={s.error}>{garden.error}</Text>}{!!garden.message&&<Text accessibilityLiveRegion="polite" style={s.success}>{garden.message}</Text>}</>;}
export function GardenSheet({plotIndex,onClose,onShop}:{plotIndex:number;onClose:()=>void;onShop:()=>void}){
 const g=useGarden(),plot=g.garden.plots[plotIndex],status=plotStatus(plot,g.today);
 const plant=async(crop:CropId)=>{const saved=await g.act({kind:'plant',plot:plotIndex,crop});if(saved?.changed)onClose();};
 return <BottomSheet visible title={plot?CROPS[plot.crop].name:'種をまく'} maxHeightRatio={.55} contentStyle={{gap:12}} onClose={()=>{if(!g.busy)onClose();}}>
  <Feedback garden={g}/>
  {plot?<>
   <View style={{alignItems:'center',flexDirection:'row',gap:20}}><CropArt crop={plot.crop} growth={Math.max(1,status.growth)} size={88}/><View style={{gap:12}}><Text style={s.copy}>{status.mature?'収穫できるよ':status.watered?'今日のお水は、ばっちり。':'お水をあげよう'}</Text><View accessibilityLabel={`成長 ${status.growth} / 7日`} style={{flexDirection:'row',gap:6}}>{Array.from({length:7},(_,i)=><View key={i} style={{width:12,height:12,borderRadius:6,backgroundColor:i<status.growth?'#C4D799':'#544A5C'}}/>)}</View></View></View>
   {(!status.watered||status.mature)&&<Pressable testID={status.mature?'garden-harvest':'garden-water'} accessibilityRole="button" disabled={!g.ready||g.busy} style={s.button} onPress={async()=>{const saved=await g.act({kind:status.mature?'harvest':'water',plot:plotIndex});if(saved?.changed)onClose();}}><Text style={s.buttonText}>{status.mature?'収穫する':'水をあげる'}</Text></Pressable>}
  </>:<View style={{flexDirection:'row',gap:8}}>{cropIds.map(c=><Pressable key={c} testID={`garden-plant-${c}`} accessibilityRole="button" accessibilityLabel={`${CROPS[c].seedName}をまく、残り${g.garden.seeds[c]}袋`} disabled={!g.ready||g.busy||!g.garden.seeds[c]} onPress={()=>void plant(c)} style={[{flex:1,alignItems:'center',paddingVertical:12,borderRadius:16,backgroundColor:'#393040',gap:4},!g.garden.seeds[c]&&s.disabled]}><CropArt crop={c} size={68}/><Text style={s.buttonText}>{CROPS[c].name}</Text><Text style={s.small}>× {g.garden.seeds[c]}</Text></Pressable>)}</View>}
  <Pressable accessibilityRole="button" disabled={g.busy} onPress={onShop} style={{minHeight:44,alignItems:'center',justifyContent:'center'}}><Text style={s.small}>種を買いに行く →</Text></Pressable>
 </BottomSheet>;
}
export function ProduceTrade({venue}:{venue:'homewares'|'ramen'}){
 const g=useGarden();if(!g.unlocked||(venue==='ramen'&&!wholesaleUnlocked(g.feedState)))return null;
 return <View style={{gap:10,marginTop:14}}><Text style={s.title}>{venue==='ramen'?'畑の野菜を卸す':'収穫した野菜を売る'}</Text><Text style={s.small}>{venue==='ramen'?'「採れたときだけでいい。きみの畑の野菜、待ってるよ」':'育てた野菜を、1個ずつ買い取ります。'}</Text><Feedback garden={g}/>{cropIds.map(c=>{
  const price=venue==='ramen'?CROPS[c].wholesale:CROPS[c].sell;
  return <View key={c} style={s.row}><CropArt crop={c} size={52}/><View style={{flex:1}}><Text style={s.title}>{CROPS[c].name}</Text><Text style={s.small}>収穫かご {g.garden.produce[c]}個</Text></View><Pressable testID={`garden-sell-${venue}-${c}`} accessibilityRole="button" accessibilityLabel={`${CROPS[c].name}を1個${price}ポイントで${venue==='ramen'?'卸す':'売る'}`} disabled={!g.ready||g.busy||!g.garden.produce[c]} onPress={()=>void g.act({kind:'sell',crop:c,venue})} style={[s.button,(!g.garden.produce[c]||g.busy)&&s.disabled]}><Text style={s.buttonText}>{price} pt / 個</Text></Pressable></View>;
 })}</View>;
}
export function SeedShop(){
 const g=useGarden();
 return <View style={{gap:12}}>{!g.unlocked?<Text style={s.copy}>畑の種は、おばあさんに家へ招待してもらうと買えるようになります。</Text>:<><Text style={s.small}>7日で収穫 · 1袋から3個</Text><Feedback garden={g}/>{cropIds.map(c=><View key={c} style={s.row}><CropArt crop={c} size={66}/><View style={{flex:1,gap:6}}><Text style={s.title}>{CROPS[c].seedName}</Text><Text style={s.small}>持っている種 {g.garden.seeds[c]}袋</Text><Pressable testID={`garden-buy-${c}`} accessibilityRole="button" disabled={!g.ready||g.busy||g.feedState.points<CROPS[c].price} onPress={()=>void g.act({kind:'buy',crop:c})} style={[s.button,(g.busy||g.feedState.points<CROPS[c].price)&&s.disabled]}><Text style={s.buttonText}>{CROPS[c].price} ptで1袋買う</Text></Pressable></View></View>)}<ProduceTrade venue="homewares"/></>}</View>;
}
const s=StyleSheet.create({row:{flexDirection:'row',alignItems:'center',gap:12,padding:12,borderRadius:12,backgroundColor:'#302738',marginVertical:5,flexWrap:'wrap'},title:{fontSize:15,fontWeight:'600',color:'#F4E7D6'},copy:{fontSize:13,lineHeight:24,color:'#E5D5C0',marginVertical:10},small:{fontSize:11,lineHeight:20,color:'#C6B5C9'},button:{minHeight:44,paddingHorizontal:13,paddingVertical:11,borderRadius:10,backgroundColor:'#674F76',justifyContent:'center',marginVertical:6},buttonText:{fontSize:13,lineHeight:20,textAlign:'center',color:'#FFF2DD'},disabled:{opacity:.45},error:{fontSize:12,lineHeight:21,color:'#F4BCB4'},success:{fontSize:13,lineHeight:23,color:'#DFE9BA',padding:10,backgroundColor:'#354735',borderRadius:9}});
