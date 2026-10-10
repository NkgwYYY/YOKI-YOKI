import React,{memo,useEffect} from 'react';
import {Modal,Pressable,ScrollView,StyleSheet,Text,View,useWindowDimensions} from 'react-native';
import Animated,{cancelAnimation,Easing,useAnimatedStyle,useSharedValue,withRepeat,withSequence,withTiming} from 'react-native-reanimated';
import Svg,{Circle,Defs,Ellipse,G,LinearGradient,Path,Rect,Stop} from 'react-native-svg';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {VillageResident} from '@/components/village/VillageActors';
import {PLAZA_STORIES,type PlazaEncounter,type PlazaKind} from '@/utils/plazaEvents';

/** Small vector props share the existing residents: no extra image downloads. */
const Visitor=memo(function Visitor({kind,size,active,reduceMotion,parent=false}:{kind:PlazaKind;size:number;active:boolean;reduceMotion:boolean;parent?:boolean}){
 return <View style={{width:size,height:size}} pointerEvents="none">
  <VillageResident stage={kind==='lost'?'odango':'egg'} size={size} active={active} reduceMotion={reduceMotion}/>
  <Svg width={size} height={size} viewBox="0 0 100 100" style={StyleSheet.absoluteFill}>
   {kind==='scammer'?<G><Path d="M29 24 L33 8 Q50 1 68 10 L73 25Z" fill="#6E6053" stroke="#403747" strokeWidth="2"/><Path d="M21 25 Q49 18 80 26 Q82 33 47 32 Q18 32 21 25" fill="#8F7A66"/><Path d="M32 19 Q48 15 69 20 L70 24 Q50 19 31 23Z" fill="#37333F"/><Path d="M49 56 Q42 50 35 57 Q27 61 30 53 Q23 66 39 64 L50 61 Q66 68 74 57 Q67 61 64 55 Q55 51 49 56" fill="#594E46"/><Rect x="72" y="72" width="23" height="18" rx="3" fill="#715036" stroke="#CFAC73"/><Path d="M78 71V67H88V71" fill="none" stroke="#785335" strokeWidth="3"/></G>
   :parent?<G><Path d="M30 23 L29 8 H66 L70 25Z" fill="#352A43"/><Ellipse cx="49" cy="24" rx="29" ry="5" fill="#514160"/><Circle cx="57" cy="45" r="9" fill="none" stroke="#CFAD69" strokeWidth="2"/><Path d="M66 46Q79 63 68 76" fill="none" stroke="#CFAD69"/></G>
   :kind==='balloon'?<G><Path d="M23 29Q26 10 51 10Q72 12 77 31" fill="#DCA441" stroke="#F9D886" strokeWidth="2"/><Path d="M43 13L46 29H63Q72 32 81 32" stroke="#9D603D" strokeWidth="4" fill="none"/></G>
   :kind==='lost'?<G><Circle cx="37" cy="48" r="9" fill="#FFFFFF20" stroke="#927046" strokeWidth="2"/><Circle cx="63" cy="48" r="9" fill="#FFFFFF20" stroke="#927046" strokeWidth="2"/><Path d="M46 47H54M83 66V95" stroke="#927046" strokeWidth="3"/><Circle cx="79" cy="65" r="5" fill="none" stroke="#927046" strokeWidth="3"/></G>
   :<G><Path d="M21 29L31 13Q48 5 67 17L78 32Z" fill="#B59867"/><Ellipse cx="49" cy="31" rx="34" ry="5" fill="#D8BD8D"/><Path d="M56 65L71 69L84 64L97 69V94L83 88L71 94L55 87Z" fill="#F0E5BB" stroke="#A69172"/><Path d="M71 70V90M84 66V86M59 78L66 73L77 83L90 75" fill="none" stroke="#749383" strokeWidth="2"/></G>}
  </Svg>
 </View>;
});

export function PlazaActors({encounter,width,height,active,reduceMotion,animating,onTalk}:{encounter:PlazaEncounter;width:number;height:number;active:boolean;reduceMotion:boolean;animating:boolean;onTalk:()=>void}){
 const {kind,outcome}=encounter,helped=outcome?.choice==='accept';
 const size=width*(kind==='balloon'?.14:.18),float=useSharedValue(0),progress=useSharedValue(helped?1:0);
 useEffect(()=>{if(active&&!reduceMotion)float.value=withRepeat(withSequence(withTiming(1,{duration:1700}),withTiming(-1,{duration:1700})),-1);return()=>cancelAnimation(float);},[active,reduceMotion]);
 useEffect(()=>{if(animating){progress.value=0;progress.value=withTiming(1,{duration:1500,easing:Easing.inOut(Easing.quad)});}else progress.value=helped?1:0;return()=>cancelAnimation(progress);},[animating,helped]);
 const balloonStyle=useAnimatedStyle(()=>({transform:[{translateX:-width*.12*progress.value},{translateY:height*.12*progress.value+float.value*3}]}));
 const actorStyle=useAnimatedStyle(()=>({opacity:kind==='scammer'&&helped?1-progress.value:1,transform:[{translateX:kind==='scammer'&&helped?width*.25*progress.value:0}]}));
 return <>
  {kind==='balloon'&&<View pointerEvents="none" style={{position:'absolute',left:width*.65,top:height*.52-width*.34,width:width*.24,height:width*.34,zIndex:490}}>
   <Svg width="100%" height="100%" viewBox="0 0 120 170"><Defs><LinearGradient id="plazaLeaves" x1="0" y1="0" x2="1" y2="1"><Stop stopColor="#C8DE78"/><Stop offset="1" stopColor="#498256"/></LinearGradient><LinearGradient id="plazaTrunk"><Stop stopColor="#A97950"/><Stop offset=".5" stopColor="#D0A373"/><Stop offset="1" stopColor="#8F633E"/></LinearGradient></Defs><Ellipse cx="62" cy="161" rx="43" ry="7" fill="#253E3035"/><Path d="M49 160L51 92L32 66L42 62L60 90L75 51L85 57L66 109L73 160Z" fill="url(#plazaTrunk)"/>{[[33,47,31],[79,38,33],[57,28,29],[30,83,29],[84,77,32],[59,67,35]].map(([cx,cy,r],i)=><Circle key={i} cx={cx} cy={cy} r={r} fill="url(#plazaLeaves)"/>)}<Circle cx="32" cy="37" r="8" fill="#EDDB92"/><Circle cx="84" cy="71" r="6" fill="#D6E794"/></Svg>
  </View>}
  {kind==='balloon'&&<Animated.View pointerEvents="none" style={[{position:'absolute',left:width*.70,top:height*.52-width*.34,width:width*.085,height:width*.18,zIndex:570},balloonStyle]}><Svg width="100%" height="100%" viewBox="0 0 45 96"><Defs><LinearGradient id="plazaRed" x1="0" y1="0" x2="1" y2="1"><Stop stopColor="#FFAFAC"/><Stop offset=".45" stopColor="#EF5C68"/><Stop offset="1" stopColor="#9C2C50"/></LinearGradient></Defs><Path d="M23 48Q37 59 23 70Q13 80 21 95" fill="none" stroke="#FAEDCC" strokeWidth="1.5"/><Ellipse cx="23" cy="24" rx="20" ry="24" fill="url(#plazaRed)"/><Ellipse cx="16" cy="14" rx="4" ry="8" fill="#FFE5DD99" transform="rotate(25 16 14)"/><Path d="M23 45L19 52H27Z" fill="#C1485D"/></Svg></Animated.View>}
  {kind==='balloon'&&helped&&!animating&&<View pointerEvents="none" style={{position:'absolute',left:width*.73-width*.075,top:height*.56-width*.18,zIndex:580}}><Visitor kind="balloon" parent size={width*.16} active={active} reduceMotion={reduceMotion}/></View>}
  <Animated.View style={[{position:'absolute',left:width*.63-size/2,top:height*.57-size,width:size,zIndex:620},actorStyle]}>
   <Pressable testID="plaza-visitor" accessibilityRole="button" accessibilityLabel={`${PLAZA_STORIES[kind].name}に話しかける`} disabled={!active} onPress={onTalk} style={{alignItems:'center'}}>
    {!outcome&&<View style={s.bubble}><Text style={s.bubbleText}>{kind==='balloon'?'風船が…':kind==='scammer'?'いい話があるよ':kind==='lost'?'どこかしら…':'ここはどこ？'}</Text></View>}
    <Visitor kind={kind} size={size} active={active} reduceMotion={reduceMotion}/>
   </Pressable>
  </Animated.View>
 </>;
}

export function PlazaDialogue({encounter,busy,error,animating,points,onChoose,onClose}:{encounter:PlazaEncounter;busy:boolean;error:string;animating:boolean;points:number;onChoose:(choice:'accept'|'decline')=>void;onClose:()=>void}){
 const {height:screenHeight}=useWindowDimensions();
 const compact=screenHeight<660;
 const insets=useSafeAreaInsets(),story=PLAZA_STORIES[encounter.kind],outcome=encounter.outcome;
 return <Modal transparent visible animationType="fade" onRequestClose={onClose}>
  <View style={s.modal} pointerEvents="box-none">
   <Pressable style={StyleSheet.absoluteFill} accessibilityLabel="広場のお話を閉じる" onPress={onClose} disabled={busy}/>
   <View accessibilityViewIsModal style={[s.dialog,{marginBottom:Math.max(insets.bottom,12),padding:compact?12:16,gap:compact?9:13}]}>
    <View style={s.heading}><View style={{flex:1}}><Text style={s.kicker}>こもれび広場の出会い</Text><Text accessibilityRole="header" style={s.title}>{story.title}</Text></View><Pressable accessibilityRole="button" accessibilityLabel="広場のお話を閉じる" disabled={busy} onPress={onClose} style={s.close}><Text style={s.text}>×</Text></Pressable></View>
    <ScrollView style={{maxHeight:compact?90:150}} contentContainerStyle={{gap:8}}><Text testID="plaza-story" accessibilityLiveRegion="polite" style={s.text}>{outcome?(animating?story.action:outcome.choice==='accept'?story.result:story.decline):story.intro}</Text>
     {outcome&&!animating&&!compact&&<Text testID="plaza-points" style={[s.reward,{color:outcome.points<0?'#E9A69D':'#F3D48F'}]}>{outcome.points>0?`お礼 ＋${outcome.points}pt`:outcome.points<0?`預けた${-outcome.points}ptを失った`:'ポイントの変化なし'}</Text>}
     {!!error&&<Text accessibilityRole="alert" style={s.error}>{error}</Text>}
    </ScrollView>
    {outcome?<Pressable testID="plaza-finish" accessibilityRole="button" onPress={onClose} disabled={busy||animating} style={[s.button,{opacity:busy||animating?.5:1}]}><Text style={s.buttonText}>{busy?'保存中…':animating?'…':compact&&outcome.points?`広場にもどる · ${outcome.points>0?'＋':'−'}${Math.abs(outcome.points)}pt`:'広場にもどる'}</Text></Pressable>
    :<View style={s.choices}><Pressable testID="plaza-decline" accessibilityRole="button" disabled={busy} onPress={()=>onChoose('decline')} style={[s.button,s.secondary]}><Text style={s.buttonText}>今回は断る</Text></Pressable><Pressable testID="plaza-accept" accessibilityRole="button" disabled={busy||(encounter.kind==='scammer'&&points<30)} onPress={()=>onChoose('accept')} style={[s.button,{flex:1,opacity:busy||(encounter.kind==='scammer'&&points<30)?.5:1}]}><Text style={s.buttonText}>{busy?'保存中…':encounter.kind==='scammer'&&points<30?'30pt必要です':story.accept}</Text></Pressable></View>}
   </View>
  </View>
 </Modal>;
}
const s=StyleSheet.create({
 bubble:{position:'absolute',bottom:'96%',backgroundColor:'#FFF5DF',borderRadius:14,paddingHorizontal:10,paddingVertical:7,minWidth:85,borderWidth:1,borderColor:'#B9A478'},bubbleText:{fontSize:11,color:'#635142',textAlign:'center'},
 name:{fontSize:10,textAlign:'center',color:'#FFF1D8',backgroundColor:'#332A3DD9',borderRadius:4,paddingHorizontal:6,paddingVertical:4,minWidth:85},
 modal:{flex:1,justifyContent:'flex-end'},dialog:{width:'94%',maxWidth:500,alignSelf:'center',backgroundColor:'#282033F5',borderColor:'#C6AF7A',borderWidth:1,borderRadius:14,padding:16,gap:13},
 heading:{flexDirection:'row',alignItems:'center',gap:6},kicker:{fontSize:10,color:'#CFB887',letterSpacing:1.5},title:{fontSize:18,color:'#FFF1D7',marginTop:5},close:{width:44,height:44,alignItems:'center',justifyContent:'center'},text:{fontSize:14,lineHeight:22,color:'#E6DACE'},reward:{fontSize:15,fontWeight:'600'},error:{fontSize:12,color:'#F1A9A0'},choices:{flexDirection:'row',gap:9},button:{backgroundColor:'#6B507C',minHeight:46,borderRadius:8,paddingHorizontal:12,alignItems:'center',justifyContent:'center'},secondary:{backgroundColor:'#3B3347'},buttonText:{fontSize:13,color:'#FFF3DB',textAlign:'center'},
});
