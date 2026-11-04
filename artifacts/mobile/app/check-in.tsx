import {MoyamoyaPicker} from '@/components/moyamoya/MoyamoyaPicker';
import type {PatternId} from '@/utils/moyamoyaContent';
import React,{useEffect,useRef,useState} from 'react';
import {Image,Pressable,ScrollView,StyleSheet,Text,View,useWindowDimensions} from 'react-native';
import {useRouter} from 'expo-router';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useApp} from '@/contexts/AppContext';
import {useAuth} from '@/contexts/AuthContext';
import {Icon} from '@/components/ui/Icon';
import {StaticMascot} from '@/components/Mascot';
import {ConditionFace} from '@/components/record/ConditionFace';
import {CONDITION_LABELS,conditionValue} from '@/utils/conditionTrends';
import {getMascotStage} from '@/utils/mascotUtils';
import {getTodayDate} from '@/utils/dateUtils';

export default function CheckInScreen(){const auth=useAuth();return <CheckIn key={auth.user?.id??'guest'}/>;}
function CheckIn(){
 const app=useApp(),auth=useAuth(),router=useRouter(),insets=useSafeAreaInsets(),window=useWindowDimensions();
 const [step,setStep]=useState(0),[mood,setMood]=useState<number>(),[fatigue,setFatigue]=useState<number>(),[worry,setWorry]=useState<number>();
 const [hasMoyamoya,setHasMoyamoya]=useState<boolean>(),[pattern,setPattern]=useState<PatternId>(),[memo,setMemo]=useState('');
 const [busy,setBusy]=useState(false),[done,setDone]=useState(false),[error,setError]=useState('');
 const loaded=useRef(false),lock=useRef(false),alive=useRef(true),day=useRef(getTodayDate());
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 const ready=!app.isLoading&&!app.storageError&&!auth.isLoading&&(!auth.isSignedIn||app.cloudSynced);
 useEffect(()=>{if(!ready||loaded.current)return;const r=app.getTodayRecord();setMood(conditionValue(r,'mood')??undefined);setFatigue(conditionValue(r,'fatigue')??undefined);setWorry(conditionValue(r,'worry')??undefined);setHasMoyamoya(r?.moyamoya?.has);setPattern(r?.moyamoya?.pattern);setMemo(r?.moyamoya?.memo??'');day.current=getTodayDate();loaded.current=true;},[ready,app.getTodayRecord]);
 const save=async(moodOnly=false)=>{
  if(!ready||lock.current||!mood)return;
  if(day.current!==getTodayDate()){setError('日付が変わりました。いったん閉じて、今日の記録を開き直してください。');return;}
  if(!moodOnly&&(hasMoyamoya===undefined||(hasMoyamoya&&!pattern)))return;
  lock.current=true;setBusy(true);setError('');
  try{await app.saveRecord(mood,0,[],'',moodOnly?{moodOnly:true,sleepRecorded:false}:{conditionOnly:true,sleepRecorded:false,fatigue,worry,moyamoya:{has:hasMoyamoya!,pattern,memo}});if(alive.current)router.replace('/(tabs)?place=home');}
  catch{if(alive.current)setError('保存できませんでした。入力は残っています。もう一度お試しください。');}
  finally{lock.current=false;if(alive.current)setBusy(false);}
 };
 const goBack=()=>{if(busy)return;if(step>0&&!done)setStep(step-1);else router.back();};
 const button=(label:string,run:()=>void,id:string,secondary=false,disabled=false)=><Pressable testID={id} disabled={busy||disabled||!ready} accessibilityRole="button" onPress={run} style={({pressed})=>[s.button,secondary&&s.secondary,(busy||disabled||!ready)&&{opacity:.45},pressed&&{opacity:.75}]}><Text style={[s.buttonText,secondary&&s.secondaryText]}>{label}</Text>{!secondary&&<Icon name="chevron-right" color="#FFF" size={19}/>}</Pressable>;
 return <View testID="check-in-screen" style={s.root}><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom:insets.bottom+25}}>
  <View style={[s.scene,{height:Math.min(290,window.height*.29),paddingTop:insets.top+8}]}><Image source={require('@/assets/images/world/nook-eye-day.webp')} style={StyleSheet.absoluteFill} resizeMode="cover"/><View style={s.skyWash}/><View style={s.header}><Pressable testID="check-in-back" disabled={busy} accessibilityRole="button" accessibilityLabel="戻る" onPress={goBack} style={s.back}><Icon name="chevron-left" size={25} color="#705583"/></Pressable><Text style={s.headerTitle}>いまの調子</Text><Text style={s.count}>{done?'完了':`${step+1} / 4`}</Text></View><View style={s.resident}><StaticMascot stage={getMascotStage(app.progress)} mood="normal" size={window.height<700?90:122}/></View></View>
  <View style={s.paper}>
   {done?<><View style={s.saved}><Icon name="check" color="#7D668E" size={27}/></View><Text style={s.question}>今日の記録を残しました</Text><Text style={s.sub}>言葉にならない日も、これだけで大丈夫。</Text><ConditionFace mood={mood} size={110}/><Text style={s.savedMood}>{CONDITION_LABELS.mood[mood!]}</Text>{button('調子の推移を見る',()=>router.replace('/(tabs)/condition'),'check-in-trends')}{button('おうちに戻る',()=>router.replace('/(tabs)'),'check-in-home',true)}</>:<>
   <View style={s.dots}>{[0,1,2,3].map(i=><View key={i} style={[s.dot,i===step&&s.dotCurrent]}/>)}</View>
   <Text accessibilityRole="header" style={s.question}>{['いま、どんな気分？','からだの疲れは？','心配ごとはある？','モヤモヤはある？'][step]}</Text>
   <Text style={s.sub}>{['近いものを選んでね。','今のからだの感覚に、近いものを。','今、気になっていることはどれくらい？','うまく言葉にならなくても大丈夫。'][step]}</Text>
   {step===3?<MoyamoyaPicker has={hasMoyamoya} onHas={setHasMoyamoya} pattern={pattern} onPattern={setPattern} memo={memo} onMemo={setMemo} disabled={busy||!ready}/>:step===0?<View style={s.moods}>{[[1,2],[3,4,5]].map((row,i)=><View key={i} style={s.moodRow}>{row.map(v=><Pressable testID={`check-in-mood-${v}`} key={v} disabled={busy||!ready} accessibilityRole="button" accessibilityLabel={`気分：${CONDITION_LABELS.mood[v]}`} accessibilityState={{selected:mood===v}} onPress={()=>setMood(v)} style={[s.mood,mood===v&&s.selected]}><ConditionFace mood={v} size={i===0?83:72}/><Text style={s.optionLabel}>{CONDITION_LABELS.mood[v]}</Text>{mood===v&&<View style={s.tick}><Icon name="check" size={12} color="#FFF"/></View>}</Pressable>)}</View>)}</View>:<View style={s.scale}>{[1,2,3].map(v=>{const field=step===1?'fatigue':'worry',selected=(step===1?fatigue:worry)===v;return <Pressable testID={`check-in-${field}-${v}`} key={v} disabled={busy||!ready} accessibilityRole="button" accessibilityLabel={CONDITION_LABELS[field][v]} accessibilityState={{selected}} onPress={()=>step===1?setFatigue(v):setWorry(v)} style={[s.scaleOption,selected&&s.selected]}><View style={[s.scaleIcon,{backgroundColor:['#E7EEDF','#F0E7D8','#F6E1D4'][v-1]}]}><Icon name={step===1?'battery':'cloud'} size={25} color="#947B9E"/></View><View style={{flex:1,gap:5}}><Text style={s.scaleLabel}>{CONDITION_LABELS[field][v]}</Text><Text style={s.scaleHint}>{(field==='fatigue'?['疲れは感じていない','少し疲れを感じる','かなり疲れを感じる']:['今は気になることがない','少し気になっている','心配ごとでいっぱい'])[v-1]}</Text></View>{selected&&<Icon name="check" size={21} color="#846096"/>}</Pressable>;})}</View>}
   <Text style={s.note}>あとから変えられます。</Text>
   {!!error&&<Text testID="check-in-error" accessibilityRole="alert" style={s.error}>{error}</Text>}
   {button(busy?'保存しています…':step===3?'この内容で記録する':'次へ',()=>step===3?void save():setStep(step+1),'check-in-next',false,!mood||(step===3&&(hasMoyamoya===undefined||(hasMoyamoya&&!pattern))))}
   {step<3&&(step===0?button('今日は記録しない',()=>router.back(),'check-in-skip',true):button(step===1?'疲れは記録せず、次へ':'心配ごとは記録せず、次へ',()=>{if(step===1){setFatigue(undefined);setStep(2);}else{setWorry(undefined);setStep(3);}},'check-in-skip',true))}
   {step===0&&mood&&<Pressable testID="check-in-mood-only" disabled={busy||!ready} accessibilityRole="button" onPress={()=>void save(true)} style={s.textButton}><Text style={s.note}>気分だけを記録する</Text></Pressable>}
   </>}
  </View>
 </ScrollView></View>;

}
const s=StyleSheet.create({root:{flex:1,backgroundColor:'#FAF7F1'},scene:{overflow:'hidden'},skyWash:{...StyleSheet.absoluteFillObject,backgroundColor:'#E8EDFF47'},header:{paddingHorizontal:18,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},back:{width:44,height:44,justifyContent:'center'},headerTitle:{fontSize:17,color:'#584268',fontWeight:'600'},count:{width:44,textAlign:'right',fontSize:13,color:'#725A85'},resident:{position:'absolute',bottom:-8,alignSelf:'center'},paper:{marginTop:-12,padding:22,borderTopLeftRadius:32,borderTopRightRadius:32,backgroundColor:'#FAF7F1',gap:14,alignItems:'center',maxWidth:620,width:'100%',alignSelf:'center'},dots:{flexDirection:'row',gap:6,marginBottom:3},dot:{width:6,height:6,borderRadius:3,backgroundColor:'#E2D8E7'},dotCurrent:{width:18,backgroundColor:'#A184B3'},question:{fontSize:25,lineHeight:36,fontWeight:'600',color:'#483153',textAlign:'center'},sub:{fontSize:13,lineHeight:22,color:'#88748F',textAlign:'center',marginBottom:4},moods:{gap:10,width:'100%'},moodRow:{flexDirection:'row',gap:10},mood:{flex:1,alignItems:'center',justifyContent:'center',minHeight:132,paddingVertical:11,paddingHorizontal:5,borderWidth:1.5,borderColor:'#EAE3DA',borderRadius:22,backgroundColor:'#FFFCF6',shadowColor:'#A18A73',shadowOpacity:.08,shadowRadius:8,shadowOffset:{width:0,height:4}},selected:{borderColor:'#A383BA',backgroundColor:'#EFE5F7'},optionLabel:{fontSize:13,color:'#705779',lineHeight:21,fontWeight:'600'},tick:{position:'absolute',top:9,right:9,width:19,height:19,borderRadius:10,backgroundColor:'#9B7CAE',alignItems:'center',justifyContent:'center'},button:{width:'100%',minHeight:56,borderRadius:28,backgroundColor:'#8865A3',paddingHorizontal:22,paddingVertical:14,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:10,shadowColor:'#7D5B95',shadowOpacity:.14,shadowRadius:12,shadowOffset:{width:0,height:5}},buttonText:{fontSize:16,fontWeight:'600',color:'#FFFDF9'},secondary:{backgroundColor:'#FFFBF4',borderWidth:1,borderColor:'#DACEDE',shadowOpacity:0},secondaryText:{color:'#705579'},note:{fontSize:12,lineHeight:21,color:'#917D98'},textButton:{minHeight:40,justifyContent:'center'},scale:{width:'100%',gap:14,paddingVertical:12},scaleOption:{flexDirection:'row',alignItems:'center',gap:16,padding:16,minHeight:94,borderWidth:1.5,borderColor:'#E9E0E6',borderRadius:23,backgroundColor:'#FFFCF6'},scaleIcon:{width:56,height:56,borderRadius:20,alignItems:'center',justifyContent:'center'},scaleLabel:{fontSize:18,fontWeight:'600',color:'#624B70'},scaleHint:{fontSize:12,lineHeight:19,color:'#8D7995'},error:{fontSize:13,lineHeight:22,color:'#A34D58'},saved:{width:55,height:55,borderRadius:30,backgroundColor:'#EBE3F1',alignItems:'center',justifyContent:'center'},savedMood:{fontSize:20,color:'#725781',marginBottom:15}});
