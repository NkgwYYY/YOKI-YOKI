import {MoyamoyaPicker} from '@/components/moyamoya/MoyamoyaPicker';
import type {PatternId} from '@/utils/moyamoyaContent';
import React,{useEffect,useRef,useState} from 'react';
import {Image,KeyboardAvoidingView,Platform,Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {useLocalSearchParams,useRouter} from 'expo-router';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useApp} from '@/contexts/AppContext';
import {useAuth} from '@/contexts/AuthContext';
import {Icon} from '@/components/ui/Icon';
import {StaticMascot} from '@/components/Mascot';
import {ConditionFace} from '@/components/record/ConditionFace';
import {DiaryDetailsEditor,type DiaryDetailField} from '@/components/record/DiaryDetails';
import {diaryDetailsFromRecord,type DiaryDetails} from '@/utils/exchangeDiary';
import {CONDITION_LABELS,conditionValue} from '@/utils/conditionTrends';
import {getMascotStage} from '@/utils/mascotUtils';
import {getTodayDate} from '@/utils/dateUtils';

const detailSteps=['sleep','dayType','exercise','meal','social','win','notes'] as const;
type Step='mood'|'fatigue'|'worry'|'behaviors'|'moyamoya'|'pattern'|typeof detailSteps[number];
const titles:Record<Step,string>={mood:'いま、どんな気分？',fatigue:'からだの疲れは？',worry:'心配ごとはある？',behaviors:'今日は、どう過ごした？',sleep:'昨夜は、どのくらい眠れた？',dayType:'今日はどんな日？',exercise:'からだを動かした？',meal:'食事はどうだった？',social:'人との関わりはどうだった？',win:'今日、できたことは？',notes:'書いておきたいことは？',moyamoya:'いま、モヤモヤはある？',pattern:'どのモヤモヤに近い？'};
export default function CheckInScreen(){const auth=useAuth();return <CheckIn key={auth.user?.id??'guest'}/>;}
function CheckIn(){
 const app=useApp(),auth=useAuth(),router=useRouter(),insets=useSafeAreaInsets();
 const params=useLocalSearchParams<{returnTo?:string}>();
 const [mood,setMood]=useState<number>(),[fatigue,setFatigue]=useState<number>(),[worry,setWorry]=useState<number>();
 const [hasMoyamoya,setHasMoyamoya]=useState<boolean>(),[pattern,setPattern]=useState<PatternId>(),[memo,setMemo]=useState('');
 const [details,setDetails]=useState<DiaryDetails>(()=>diaryDetailsFromRecord());
 const [step,setStep]=useState<Step>('mood'),[extra,setExtra]=useState(false);
 const scroll=useRef<ScrollView>(null);
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const loaded=useRef(false),lock=useRef(false),alive=useRef(true),day=useRef(getTodayDate());
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 const ready=!app.isLoading&&!app.storageError&&!auth.isLoading&&(!auth.isSignedIn||app.cloudSynced);
 useEffect(()=>{
  if(!ready||loaded.current)return;
  const r=app.getTodayRecord();
  setMood(conditionValue(r,'mood')??undefined);setFatigue(conditionValue(r,'fatigue')??undefined);setWorry(conditionValue(r,'worry')??undefined);
  setHasMoyamoya(r?.moyamoya?.has);setPattern(r?.moyamoya?.pattern);setMemo(r?.moyamoya?.memo??'');
  setDetails(diaryDetailsFromRecord(r));day.current=getTodayDate();loaded.current=true;
 },[ready,app.getTodayRecord]);
 const save=async()=>{
  if(!ready||lock.current||!mood||hasMoyamoya===undefined||(hasMoyamoya&&!pattern))return;
  if(day.current!==getTodayDate()){setError('日付が変わりました。いったん閉じて、今日の記録を開き直してください。');return;}
  lock.current=true;setBusy(true);setError('');
  try{
   await app.saveRecord(mood,details.sleep,details.behaviors,details.notes,{
    ...details,behaviorsRecorded:details.behaviorsRecorded??details.behaviors.length>0,dayType:details.dayType,
    conditionOnly:true,includeDetails:true,fatigue,worry,moyamoya:{has:hasMoyamoya,pattern,memo}
   });
   if(alive.current){
    // Startup has no returnTo: the existing home encounter owns the battle.
    if(params.returnTo==='diary'&&!hasMoyamoya)router.back();
    else router.replace('/(tabs)?place=home');
   }
  }catch{if(alive.current)setError('保存できませんでした。入力は残っています。もう一度お試しください。');}
  finally{lock.current=false;if(alive.current)setBusy(false);}
 };
 const disabled=busy||!ready;
 const sequence:Step[]=['mood','fatigue','worry','behaviors',...(extra?detailSteps:[]),'moyamoya',...(hasMoyamoya?['pattern' as const]:[])];
 const index=sequence.indexOf(step),last=index===sequence.length-1;
 const detailIndex=detailSteps.indexOf(step as typeof detailSteps[number]);
 const mainIndex=step==='mood'?0:step==='fatigue'?1:step==='worry'?2:step==='behaviors'||detailIndex>=0?3:4;
 const canContinue=step==='mood'?!!mood:step==='moyamoya'?hasMoyamoya!==undefined:step==='pattern'?!!pattern:true;
 const optional=step==='behaviors'||detailIndex>=0;
 const go=(next:Step)=>{setStep(next);setError('');scroll.current?.scrollTo({y:0,animated:false});};
 const back=()=>{if(disabled)return;if(index>0)go(sequence[index-1]);else router.back();};
 const next=()=>{if(disabled||!canContinue)return;if(last)void save();else go(sequence[index+1]);};
 return <KeyboardAvoidingView testID="check-in-screen" style={s.root} behavior={Platform.OS==='ios'?'padding':undefined}>
  <View style={[s.scene,{height:145+insets.top,paddingTop:insets.top+8}]}>
   <Image source={require('@/assets/images/world/nook-eye-day.webp')} style={StyleSheet.absoluteFill} resizeMode="cover"/><View style={s.skyWash}/>
   <View style={s.header}><Pressable testID="check-in-back" disabled={disabled} accessibilityRole="button" accessibilityLabel={index>0?'前の設問へ':'戻る'} onPress={back} style={s.back}><Icon name="chevron-left" size={25} color="#705583"/></Pressable><Text style={s.headerTitle}>今日のきろく</Text><Text testID="check-in-progress" style={s.count}>{mainIndex+1} / 5</Text></View>
   <View style={s.resident}><StaticMascot stage={getMascotStage(app.progress)} mood="normal" size={80}/></View>
  </View>
  <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" contentContainerStyle={{flexGrow:1,paddingBottom:20}} showsVerticalScrollIndicator={false}>
   <View testID={'check-in-step-'+step} style={[s.paper,{alignItems:'stretch'}]}>
    <View style={[s.dots,{justifyContent:'center'}]}>{[0,1,2,3,4].map(i=><View key={i} style={[s.dot,i===mainIndex&&s.dotCurrent]}/>)}</View>
    <Text accessibilityRole="header" style={s.question}>{titles[step]}</Text>
    <Text style={s.sub}>{detailIndex>=0?'追加の記録 '+(detailIndex+1)+' / '+detailSteps.length+'・答えたいところだけで大丈夫':optional?'何も選ばず、次へ進んでも大丈夫。':step==='pattern'?'いちばん近いものを、ひとつ選んでね。':'ひとつずつ、自分のペースで。'}</Text>
    {step==='mood'&&<View style={s.moods}>{[[1,2],[3,4,5]].map((row,i)=><View key={i} style={s.moodRow}>{row.map(v=><Pressable testID={'check-in-mood-'+v} key={v} disabled={disabled} accessibilityRole="button" accessibilityLabel={'気分：'+CONDITION_LABELS.mood[v]} accessibilityState={{selected:mood===v}} onPress={()=>setMood(v)} style={[s.mood,{minHeight:100},mood===v&&s.selected]}><ConditionFace mood={v} size={56}/><Text style={s.optionLabel}>{CONDITION_LABELS.mood[v]}</Text></Pressable>)}</View>)}</View>}
    {(step==='fatigue'||step==='worry')&&<View style={s.scale}>
     {[1,2,3].map(v=>{const selected=(step==='fatigue'?fatigue:worry)===v;return <Pressable testID={'check-in-'+step+'-'+v} key={v} disabled={disabled} accessibilityRole="button" accessibilityLabel={(step==='fatigue'?'からだの疲れ：':'心配ごと：')+CONDITION_LABELS[step][v]} accessibilityState={{selected}} onPress={()=>step==='fatigue'?setFatigue(v):setWorry(v)} style={[s.scaleOption,selected&&s.selected]}><Text style={[s.scaleLabel,{flex:1}]}>{CONDITION_LABELS[step][v]}</Text><Icon name={selected?'check-circle':'circle'} size={22} color="#9B7CAE"/></Pressable>;})}
     <Pressable testID={'check-in-'+step+'-clear'} disabled={disabled} accessibilityRole="button" onPress={()=>step==='fatigue'?setFatigue(undefined):setWorry(undefined)} style={s.textButton}><Text style={s.note}>{(step==='fatigue'?fatigue:worry)===undefined?'答えずに次へ進めます':'この項目を未記録に戻す'}</Text></Pressable>
    </View>}
    {optional&&<View testID="check-in-life" style={{gap:16}}>
     <DiaryDetailsEditor key={step} field={step as DiaryDetailField} value={details} onChange={setDetails} disabled={disabled}/>
     {step==='behaviors'&&<Pressable testID="check-in-add-details" disabled={disabled} accessibilityRole="button" onPress={()=>{setExtra(true);go('sleep');}} style={[s.button,s.secondary]}><Text style={[s.buttonText,s.secondaryText]}>睡眠なども記録する</Text></Pressable>}
     {detailIndex>=0&&<Pressable testID="check-in-end-details" disabled={disabled} accessibilityRole="button" onPress={()=>go('moyamoya')} style={s.textButton}><Text style={s.note}>追加の質問を終えて、モヤモヤへ</Text></Pressable>}
    </View>}
    {(step==='moyamoya'||step==='pattern')&&<View testID="check-in-moyamoya-section" style={{gap:12}}>
     <MoyamoyaPicker mode={step==='moyamoya'?'presence':'pattern'} has={hasMoyamoya} onHas={setHasMoyamoya} pattern={pattern} onPattern={setPattern} memo={memo} onMemo={setMemo} disabled={disabled}/>
     <Text style={s.sub}>モヤモヤがある日は、記録後にその内容に合うバトルへ進めます。</Text>
    </View>}
    {!!error&&<Text testID="check-in-error" accessibilityRole="alert" style={s.error}>{error}</Text>}
   </View>
  </ScrollView>
  <View style={{paddingHorizontal:22,paddingTop:10,paddingBottom:Math.max(insets.bottom,12),gap:4,backgroundColor:'#FAF7F1',width:'100%',maxWidth:620,alignSelf:'center'}}>
   <Pressable testID="check-in-next" disabled={disabled||!canContinue} accessibilityRole="button" onPress={next} style={[s.button,(disabled||!canContinue)&&{opacity:.45}]}><Text style={s.buttonText}>{busy?'保存しています…':last?'記録する':'次へ'}</Text>{!last&&<Icon name="chevron-right" size={20} color="#FFFDF9"/>}</Pressable>
   <Pressable testID="check-in-skip" disabled={busy} accessibilityRole="button" onPress={()=>router.back()} style={[s.textButton,{alignItems:'center'}]}><Text style={s.note}>今日は記録しない</Text></Pressable>
  </View>
 </KeyboardAvoidingView>;
}
const s=StyleSheet.create({root:{flex:1,backgroundColor:'#FAF7F1'},scene:{overflow:'hidden'},skyWash:{...StyleSheet.absoluteFillObject,backgroundColor:'#E8EDFF47'},header:{paddingHorizontal:18,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},back:{width:44,height:44,justifyContent:'center'},headerTitle:{fontSize:17,color:'#584268',fontWeight:'600'},count:{width:44,textAlign:'right',fontSize:13,color:'#725A85'},resident:{position:'absolute',bottom:-8,alignSelf:'center'},paper:{marginTop:-12,padding:22,borderTopLeftRadius:32,borderTopRightRadius:32,backgroundColor:'#FAF7F1',gap:14,alignItems:'center',maxWidth:620,width:'100%',alignSelf:'center'},dots:{flexDirection:'row',gap:6,marginBottom:3},dot:{width:6,height:6,borderRadius:3,backgroundColor:'#E2D8E7'},dotCurrent:{width:18,backgroundColor:'#A184B3'},question:{fontSize:25,lineHeight:36,fontWeight:'600',color:'#483153',textAlign:'center'},sub:{fontSize:13,lineHeight:22,color:'#88748F',textAlign:'center',marginBottom:4},moods:{gap:10,width:'100%'},moodRow:{flexDirection:'row',gap:10},mood:{flex:1,alignItems:'center',justifyContent:'center',minHeight:132,paddingVertical:11,paddingHorizontal:5,borderWidth:1.5,borderColor:'#EAE3DA',borderRadius:22,backgroundColor:'#FFFCF6',shadowColor:'#A18A73',shadowOpacity:.08,shadowRadius:8,shadowOffset:{width:0,height:4}},selected:{borderColor:'#A383BA',backgroundColor:'#EFE5F7'},optionLabel:{fontSize:13,color:'#705779',lineHeight:21,fontWeight:'600'},tick:{position:'absolute',top:9,right:9,width:19,height:19,borderRadius:10,backgroundColor:'#9B7CAE',alignItems:'center',justifyContent:'center'},button:{width:'100%',minHeight:56,borderRadius:28,backgroundColor:'#8865A3',paddingHorizontal:22,paddingVertical:14,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:10,shadowColor:'#7D5B95',shadowOpacity:.14,shadowRadius:12,shadowOffset:{width:0,height:5}},buttonText:{fontSize:16,fontWeight:'600',color:'#FFFDF9'},secondary:{backgroundColor:'#FFFBF4',borderWidth:1,borderColor:'#DACEDE',shadowOpacity:0},secondaryText:{color:'#705579'},note:{fontSize:12,lineHeight:21,color:'#917D98'},textButton:{minHeight:40,justifyContent:'center'},scale:{width:'100%',gap:14,paddingVertical:12},scaleOption:{flexDirection:'row',alignItems:'center',gap:16,padding:16,minHeight:94,borderWidth:1.5,borderColor:'#E9E0E6',borderRadius:23,backgroundColor:'#FFFCF6'},scaleIcon:{width:56,height:56,borderRadius:20,alignItems:'center',justifyContent:'center'},scaleLabel:{fontSize:18,fontWeight:'600',color:'#624B70'},scaleHint:{fontSize:12,lineHeight:19,color:'#8D7995'},error:{fontSize:13,lineHeight:22,color:'#A34D58'},saved:{width:55,height:55,borderRadius:30,backgroundColor:'#EBE3F1',alignItems:'center',justifyContent:'center'},savedMood:{fontSize:20,color:'#725781',marginBottom:15}});
