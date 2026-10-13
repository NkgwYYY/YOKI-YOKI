import React,{useEffect,useRef,useState} from 'react';
import {AppState,Pressable,StyleSheet,Text,View} from 'react-native';
import Svg,{Circle,Defs,Ellipse,G,LinearGradient,Path,RadialGradient,Rect,Stop} from 'react-native-svg';
import {useApp} from '@/contexts/AppContext';
import {useAuth} from '@/contexts/AuthContext';
import {BottomSheet} from '@/components/ui/BottomSheet';
import {VillageResident} from '@/components/village/VillageActors';
import {CROPS,gardenUnlocked,wholesaleUnlocked,readGarden,plotStatus,type CropId,type GardenOperation} from '@/utils/vegetableGarden';
import {getTodayDate} from '@/utils/dateUtils';

const cropIds=Object.keys(CROPS) as CropId[];
type Action=GardenOperation extends infer O?O extends GardenOperation?Omit<O,'revision'>:never:never;
function useGarden(){
 const {feedState,runGarden,isLoading,cloudSynced}=useApp(),{isSignedIn,isLoading:authLoading}=useAuth();
 const [today,setToday]=useState(getTodayDate),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
 const pending=useRef(false),alive=useRef(true);
 useEffect(()=>{alive.current=true;const tick=()=>setToday(getTodayDate());const timer=setInterval(tick,30000);const sub=AppState.addEventListener('change',s=>{if(s==='active')tick();});return()=>{alive.current=false;clearInterval(timer);sub.remove();};},[]);
 let garden=readGarden(undefined),readError='';try{garden=readGarden(feedState.vegetableGarden);}catch{readError='畑の記録を読み込めませんでした。開き直してください。';}
 const unlocked=gardenUnlocked(feedState),ready=unlocked&&!readError&&!isLoading&&!authLoading&&(!isSignedIn||cloudSynced);
 const act=async(op:Action)=>{
  if(!ready||pending.current)return;pending.current=true;setBusy(true);setError('');setMessage('');
  try{const saved=await runGarden({...op,revision:garden.revision});if(alive.current)setMessage(saved.message);}
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
export function CropArt({crop,growth=7,size=72}:{crop:CropId;growth?:number;size?:number}){
 const mature=growth>=7,fruit=growth>=5,leaves=growth>=3;
 return <Svg width={size} height={size} viewBox="0 0 100 100"><Defs><RadialGradient id={`veg-${crop}`} cx=".3" cy=".25"><Stop stopColor={crop==='tomato'?'#FFAD82':crop==='carrot'?'#FFD082':'#FFFDEF'}/><Stop offset="1" stopColor={crop==='tomato'?'#A72F3A':crop==='carrot'?'#CE6127':'#C8BDA6'}/></RadialGradient><LinearGradient id={`leaf-${crop}`}><Stop stopColor="#A9D966"/><Stop offset="1" stopColor="#3F733F"/></LinearGradient></Defs>
  <Ellipse cx="51" cy="83" rx={leaves?29:17} ry="7" fill="#2F2A1D30"/>
  {growth===0?<G><Ellipse cx="48" cy="76" rx="13" ry="5" fill="#8B5636"/><Ellipse cx="48" cy="74" rx="3" ry="2" fill="#EBD1A4"/></G>:<G>
   <Path d={crop==='tomato'&&leaves?'M50 83V30M50 61L26 43M50 53L74 31':'M50 82Q47 62 51 39'} fill="none" stroke="#517F3C" strokeWidth="4"/>
   {(leaves?[[45,49,-35],[60,35,35],[35,62,-55],[63,57,40]]:[[41,62,-35],[59,54,40]]).map(([x,y,r],i)=><Ellipse key={i} cx={x} cy={y} rx={leaves?10:8} ry={leaves?19:13} rotation={r} origin={`${x}, ${y}`} fill={`url(#leaf-${crop})`}/>)}
   {fruit&&(crop==='tomato'?<G>{[[31,63],[67,54],[58,76]].map(([x,y],i)=><G key={i}><Circle cx={x} cy={y} r={mature?14:10} fill={mature?`url(#veg-${crop})`:'#BDCC68'}/><Path d={`M${x-7} ${y-10}l7 3l6-4l-3 7l-7-1Z`} fill="#42743A"/><Ellipse cx={x-4} cy={y-4} rx="3" ry="4" fill="#FFE6BF66"/></G>)}</G>:crop==='turnip'?<G><Path d="M50 81Q58 86 54 92" stroke="#E0D2BD" strokeWidth="2" fill="none"/><Ellipse cx="50" cy="71" rx={mature?23:15} ry={mature?19:12} fill={`url(#veg-${crop})`}/></G>:<G><Path d={mature?'M33 62Q49 51 67 61Q64 84 49 94Q36 79 33 62':'M39 68Q50 59 61 68L51 90Z'} fill={`url(#veg-${crop})`}/><Path d="M40 67L50 69M47 77L58 75M48 85L53 83" stroke="#C66C32" strokeWidth="2" strokeLinecap="round"/></G>)}
  </G>}
 </Svg>;
}
export const GARDEN_PLOTS=[{x:.45,y:.53},{x:.68,y:.53},{x:.45,y:.65},{x:.68,y:.65}];
export function GardenBeds({width,height,active,onPlot}:{width:number;height:number;active:boolean;onPlot:(i:number)=>void}){
 const {garden,today,error}=useGarden();
 return <>{error?<Text style={{position:'absolute',left:width*.24,top:height*.52,color:'#FFF4D9',backgroundColor:'#4C3843',padding:12}}>{error}</Text>:GARDEN_PLOTS.map((point,i)=>{
  const plot=garden.plots[i],status=plotStatus(plot,today),size=width*.20;
  const label=!plot?'種をまく':status.mature?'収穫できるよ':status.watered?'お水をあげたよ':'お水がほしいな';
  return <Pressable testID={`garden-plot-${i}`} key={i} accessibilityRole="button" accessibilityLabel={`畑${i+1}、${plot?CROPS[plot.crop].name+'、':''}${label}`} disabled={!active} onPress={()=>onPlot(i)} style={{position:'absolute',left:width*point.x-size/2,top:height*point.y-size*.54,width:size,height:size*.85,zIndex:600}}>
   <Svg width={size} height={size*.85} viewBox="0 0 140 120"><Defs><LinearGradient id={`soil-${i}`} x2="0" y2="1"><Stop stopColor={status.watered?'#594337':'#94704C'}/><Stop offset="1" stopColor={status.watered?'#3E3029':'#69472F'}/></LinearGradient></Defs><Ellipse cx="71" cy="96" rx="65" ry="17" fill="#3A322636"/><Path d="M4 47L116 36L138 88L22 105Z" fill="#8D623D"/><Path d="M5 39L117 29L138 78L22 95Z" fill={`url(#soil-${i})`} stroke="#C29460" strokeWidth="4"/>{[48,59,70,81].map(y=><Path key={y} d={`M20 ${y}L118 ${y-8}`} stroke="#AE84552F" strokeWidth="2"/>)}</Svg>
   <View pointerEvents="none" style={{position:'absolute',left:size*.16,bottom:size*.18}}>{plot?<CropArt crop={plot.crop} growth={status.growth} size={size*.75}/>:<Text style={{fontSize:24,color:'#DFC9A2'}}>＋</Text>}</View>
   <View pointerEvents="none" style={{position:'absolute',bottom:-11,alignSelf:'center',paddingHorizontal:6,paddingVertical:4,borderRadius:6,backgroundColor:status.mature?'#516643EF':'#332A35E8'}}><Text style={{fontSize:10,color:'#FFF0D4'}}>{label}</Text></View>
  </Pressable>;
 })}</>;
}
function Feedback({garden}:{garden:ReturnType<typeof useGarden>}){return <>{!!garden.error&&<Text accessibilityRole="alert" style={s.error}>{garden.error}</Text>}{!!garden.message&&<Text accessibilityLiveRegion="polite" style={s.success}>{garden.message}</Text>}</>;}
export function GardenSheet({plotIndex,onClose,onShop}:{plotIndex:number;onClose:()=>void;onShop:()=>void}){
 const g=useGarden(),plot=g.garden.plots[plotIndex],status=plotStatus(plot,g.today);
 return <BottomSheet visible title={`おばあさんの畑 · ${plotIndex+1}`} subtitle="少しずつ育つ、ふたりの楽しみ。" onClose={()=>{if(!g.busy)onClose();}}>
  <Feedback garden={g}/>
  {plot?<>
   <View style={{alignItems:'center'}}><CropArt crop={plot.crop} growth={status.growth} size={118}/><Text style={s.title}>{CROPS[plot.crop].name}</Text></View>
   <Text style={s.copy}>{status.mature?'大きく育ったね。そろそろ収穫しよう！':`種まき ${plot.planted} · 育った日 ${status.growth}/7日\n${status.growth<1?'土の中で、芽を出す準備をしている。':status.growth<3?'小さな芽が顔を出した。':status.growth<5?'葉が大きく広がってきた。':plot.crop==='tomato'?'小さな実がふくらんできた。':'土の中で、野菜が丸々と育っている。'}`}</Text>
   <Pressable testID={status.mature?'garden-harvest':'garden-water'} accessibilityRole="button" disabled={!g.ready||g.busy||(!status.mature&&status.watered)} style={[s.button,(!status.mature&&status.watered)&&s.disabled]} onPress={()=>void g.act({kind:status.mature?'harvest':'water',plot:plotIndex})}><Text style={s.buttonText}>{g.busy?'保存しています…':status.mature?`${CROPS[plot.crop].yield}個収穫する`:status.watered?'今日のお水はあげました':'お水をあげる'}</Text></Pressable>
  </>:<>
   <Text style={s.copy}>どの種をまこう。最初のお水も一緒にあげるよ。</Text>
   {cropIds.map(c=><Pressable key={c} testID={`garden-plant-${c}`} accessibilityRole="button" disabled={!g.ready||g.busy||!g.garden.seeds[c]} onPress={()=>void g.act({kind:'plant',plot:plotIndex,crop:c})} style={[s.row,!g.garden.seeds[c]&&s.disabled]}><CropArt crop={c} size={55}/><View style={{flex:1}}><Text style={s.title}>{CROPS[c].seedName}</Text><Text style={s.small}>持っている種 {g.garden.seeds[c]}袋 · 最短7日</Text></View><Text style={s.small}>{g.garden.seeds[c]?'まく':'種がないよ'}</Text></Pressable>)}
  </>}
  <Text style={s.small}>1日1回、お水をあげた翌日に少し育ちます。7日分育つと収穫。来られない日があっても、枯れません。</Text>
  <View style={s.row}><Text style={s.copy}>収穫かご</Text><Text style={s.small}>{cropIds.map(c=>`${CROPS[c].name} ${g.garden.produce[c]}`).join(' / ')}</Text></View>
  <Pressable accessibilityRole="button" disabled={g.busy} onPress={onShop} style={s.button}><Text style={s.buttonText}>暮らしのお店で種を買う・野菜を売る</Text></Pressable>
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
 return <View style={{gap:12}}>{!g.unlocked?<Text style={s.copy}>畑の種は、おばあさんに家へ招待してもらうと買えるようになります。</Text>:<><Text style={s.copy}>どの野菜も最短7日で収穫できます。1袋で1つの畑、収穫は3個。</Text><Feedback garden={g}/>{cropIds.map(c=><View key={c} style={s.row}><CropArt crop={c} size={66}/><View style={{flex:1,gap:6}}><Text style={s.title}>{CROPS[c].seedName}</Text><Text style={s.small}>持っている種 {g.garden.seeds[c]}袋</Text><Pressable testID={`garden-buy-${c}`} accessibilityRole="button" disabled={!g.ready||g.busy||g.feedState.points<CROPS[c].price} onPress={()=>void g.act({kind:'buy',crop:c})} style={[s.button,(g.busy||g.feedState.points<CROPS[c].price)&&s.disabled]}><Text style={s.buttonText}>{CROPS[c].price} ptで1袋買う</Text></Pressable></View></View>)}<ProduceTrade venue="homewares"/></>}</View>;
}
const s=StyleSheet.create({row:{flexDirection:'row',alignItems:'center',gap:12,padding:12,borderRadius:12,backgroundColor:'#302738',marginVertical:5,flexWrap:'wrap'},title:{fontSize:15,fontWeight:'600',color:'#F4E7D6'},copy:{fontSize:13,lineHeight:24,color:'#E5D5C0',marginVertical:10},small:{fontSize:11,lineHeight:20,color:'#C6B5C9'},button:{minHeight:44,paddingHorizontal:13,paddingVertical:11,borderRadius:10,backgroundColor:'#674F76',justifyContent:'center',marginVertical:6},buttonText:{fontSize:13,lineHeight:20,textAlign:'center',color:'#FFF2DD'},disabled:{opacity:.45},error:{fontSize:12,lineHeight:21,color:'#F4BCB4'},success:{fontSize:13,lineHeight:23,color:'#DFE9BA',padding:10,backgroundColor:'#354735',borderRadius:9}});
