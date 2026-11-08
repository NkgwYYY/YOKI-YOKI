import {MoyamoyaPicker} from '@/components/moyamoya/MoyamoyaPicker';
import type {PatternId} from '@/utils/moyamoyaContent';
import React,{useEffect,useRef,useState} from 'react';
import {Image,Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {useLocalSearchParams,useRouter} from 'expo-router';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useApp} from '@/contexts/AppContext';
import {useAuth} from '@/contexts/AuthContext';
import {Icon} from '@/components/ui/Icon';
import {StaticMascot} from '@/components/Mascot';
import {ConditionFace} from '@/components/record/ConditionFace';
import {DiaryDetailsEditor} from '@/components/record/DiaryDetails';
import {diaryDetailsFromRecord,type DiaryDetails} from '@/utils/exchangeDiary';
import {CONDITION_LABELS,conditionValue} from '@/utils/conditionTrends';
import {getMascotStage} from '@/utils/mascotUtils';
import {getTodayDate} from '@/utils/dateUtils';

export default function CheckInScreen(){const auth=useAuth();return <CheckIn key={auth.user?.id??'guest'}/>;}
function CheckIn(){
 const app=useApp(),auth=useAuth(),router=useRouter(),insets=useSafeAreaInsets();
 const params=useLocalSearchParams<{returnTo?:string}>();
 const [mood,setMood]=useState<number>(),[fatigue,setFatigue]=useState<number>(),[worry,setWorry]=useState<number>();
 const [hasMoyamoya,setHasMoyamoya]=useState<boolean>(),[pattern,setPattern]=useState<PatternId>(),[memo,setMemo]=useState('');
 const [details,setDetails]=useState<DiaryDetails>(()=>diaryDetailsFromRecord());
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
 return <View testID="check-in-screen" style={s.root}>
  <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{paddingBottom:insets.bottom+25}} showsVerticalScrollIndicator>
   <View style={[s.scene,{height:170+insets.top,paddingTop:insets.top+8}]}>
    <Image source={require('@/assets/images/world/nook-eye-day.webp')} style={StyleSheet.absoluteFill} resizeMode="cover"/><View style={s.skyWash}/>
    <View style={s.header}><Pressable testID="check-in-back" disabled={busy} accessibilityRole="button" accessibilityLabel="戻る" onPress={()=>router.back()} style={s.back}><Icon name="chevron-left" size={25} color="#705583"/></Pressable><Text style={s.headerTitle}>今日のきろく</Text><View style={{width:44}}/></View>
    <View style={s.resident}><StaticMascot stage={getMascotStage(app.progress)} mood="normal" size={96}/></View>
   </View>
   <View style={[s.paper,{alignItems:'stretch'}]}>
    <Text style={s.sub}>ここでまとめて記録できます。{ '\n' }あとから追加・変更できます。</Text>
    <Text accessibilityRole="header" style={s.question}>いま、どんな気分？</Text>
    <View style={s.moods}>{[[1,2],[3,4,5]].map((row,i)=><View key={i} style={s.moodRow}>{row.map(v=><Pressable testID={'check-in-mood-'+v} key={v} disabled={disabled} accessibilityRole="button" accessibilityLabel={'気分：'+CONDITION_LABELS.mood[v]} accessibilityState={{selected:mood===v}} onPress={()=>setMood(v)} style={[s.mood,{minHeight:100},mood===v&&s.selected]}><ConditionFace mood={v} size={56}/><Text style={s.optionLabel}>{CONDITION_LABELS.mood[v]}</Text></Pressable>)}</View>)}</View>
    {(['fatigue','worry'] as const).map(field=>{
     const value=field==='fatigue'?fatigue:worry,change=field==='fatigue'?setFatigue:setWorry;
     return <View key={field} style={{gap:10,paddingVertical:12}}>
      <Text accessibilityRole="header" style={[s.question,{fontSize:20}]}>{field==='fatigue'?'からだの疲れは？':'心配ごとはある？'}</Text>
      <View style={{flexDirection:'row',gap:7}}>{[1,2,3].map(v=><Pressable testID={'check-in-'+field+'-'+v} key={v} disabled={disabled} accessibilityRole="button" accessibilityLabel={(field==='fatigue'?'からだの疲れ：':'心配ごと：')+CONDITION_LABELS[field][v]} accessibilityState={{selected:value===v}} onPress={()=>change(v)} style={[s.scaleOption,{flex:1,minHeight:58,padding:8,justifyContent:'center'},value===v&&s.selected]}><Text style={[s.optionLabel,{textAlign:'center'}]}>{CONDITION_LABELS[field][v]}</Text></Pressable>)}</View>
      <Pressable testID={'check-in-'+field+'-clear'} disabled={disabled} accessibilityRole="button" onPress={()=>change(undefined)} style={s.textButton}><Text style={s.note}>{value===undefined?'未記録':'この項目を未記録に戻す'}</Text></Pressable>
     </View>;
    })}
    <View testID="check-in-life" style={{gap:16,padding:16,borderRadius:24,backgroundColor:'#FFFDF7',borderWidth:1,borderColor:'#E8DDCF'}}>
     <Text accessibilityRole="header" style={[s.question,{fontSize:20}]}>暮らしの記録（任意）</Text>
     <DiaryDetailsEditor value={details} onChange={setDetails} disabled={disabled}/>
     <Text style={s.note}>過ごし方は今日ここまでの内容で大丈夫。夜に追加できます。</Text>
    </View>
    <View testID="check-in-moyamoya-section" style={{gap:12,paddingTop:20}}>
     <Text accessibilityRole="header" style={s.question}>最後に、モヤモヤはある？</Text>
     <MoyamoyaPicker has={hasMoyamoya} onHas={setHasMoyamoya} pattern={pattern} onPattern={setPattern} memo={memo} onMemo={setMemo} disabled={disabled}/>
     <Text style={s.sub}>モヤモヤがある日は、記録後にその内容に合うバトルへ進めます。</Text>
    </View>
    {!!error&&<Text testID="check-in-error" accessibilityRole="alert" style={s.error}>{error}</Text>}
    <Pressable testID="check-in-next" disabled={disabled||!mood||hasMoyamoya===undefined||(hasMoyamoya&&!pattern)} accessibilityRole="button" onPress={()=>void save()} style={[s.button,(disabled||!mood||hasMoyamoya===undefined||(hasMoyamoya&&!pattern))&&{opacity:.45}]}><Text style={s.buttonText}>{busy?'保存しています…':'まとめて記録する'}</Text></Pressable>
    <Pressable testID="check-in-skip" disabled={busy} accessibilityRole="button" onPress={()=>router.back()} style={[s.button,s.secondary]}><Text style={[s.buttonText,s.secondaryText]}>今日は記録しない</Text></Pressable>
   </View>
  </ScrollView>
 </View>;
}
const s=StyleSheet.create({root:{flex:1,backgroundColor:'#FAF7F1'},scene:{overflow:'hidden'},skyWash:{...StyleSheet.absoluteFillObject,backgroundColor:'#E8EDFF47'},header:{paddingHorizontal:18,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},back:{width:44,height:44,justifyContent:'center'},headerTitle:{fontSize:17,color:'#584268',fontWeight:'600'},count:{width:44,textAlign:'right',fontSize:13,color:'#725A85'},resident:{position:'absolute',bottom:-8,alignSelf:'center'},paper:{marginTop:-12,padding:22,borderTopLeftRadius:32,borderTopRightRadius:32,backgroundColor:'#FAF7F1',gap:14,alignItems:'center',maxWidth:620,width:'100%',alignSelf:'center'},dots:{flexDirection:'row',gap:6,marginBottom:3},dot:{width:6,height:6,borderRadius:3,backgroundColor:'#E2D8E7'},dotCurrent:{width:18,backgroundColor:'#A184B3'},question:{fontSize:25,lineHeight:36,fontWeight:'600',color:'#483153',textAlign:'center'},sub:{fontSize:13,lineHeight:22,color:'#88748F',textAlign:'center',marginBottom:4},moods:{gap:10,width:'100%'},moodRow:{flexDirection:'row',gap:10},mood:{flex:1,alignItems:'center',justifyContent:'center',minHeight:132,paddingVertical:11,paddingHorizontal:5,borderWidth:1.5,borderColor:'#EAE3DA',borderRadius:22,backgroundColor:'#FFFCF6',shadowColor:'#A18A73',shadowOpacity:.08,shadowRadius:8,shadowOffset:{width:0,height:4}},selected:{borderColor:'#A383BA',backgroundColor:'#EFE5F7'},optionLabel:{fontSize:13,color:'#705779',lineHeight:21,fontWeight:'600'},tick:{position:'absolute',top:9,right:9,width:19,height:19,borderRadius:10,backgroundColor:'#9B7CAE',alignItems:'center',justifyContent:'center'},button:{width:'100%',minHeight:56,borderRadius:28,backgroundColor:'#8865A3',paddingHorizontal:22,paddingVertical:14,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:10,shadowColor:'#7D5B95',shadowOpacity:.14,shadowRadius:12,shadowOffset:{width:0,height:5}},buttonText:{fontSize:16,fontWeight:'600',color:'#FFFDF9'},secondary:{backgroundColor:'#FFFBF4',borderWidth:1,borderColor:'#DACEDE',shadowOpacity:0},secondaryText:{color:'#705579'},note:{fontSize:12,lineHeight:21,color:'#917D98'},textButton:{minHeight:40,justifyContent:'center'},scale:{width:'100%',gap:14,paddingVertical:12},scaleOption:{flexDirection:'row',alignItems:'center',gap:16,padding:16,minHeight:94,borderWidth:1.5,borderColor:'#E9E0E6',borderRadius:23,backgroundColor:'#FFFCF6'},scaleIcon:{width:56,height:56,borderRadius:20,alignItems:'center',justifyContent:'center'},scaleLabel:{fontSize:18,fontWeight:'600',color:'#624B70'},scaleHint:{fontSize:12,lineHeight:19,color:'#8D7995'},error:{fontSize:13,lineHeight:22,color:'#A34D58'},saved:{width:55,height:55,borderRadius:30,backgroundColor:'#EBE3F1',alignItems:'center',justifyContent:'center'},savedMood:{fontSize:20,color:'#725781',marginBottom:15}});
