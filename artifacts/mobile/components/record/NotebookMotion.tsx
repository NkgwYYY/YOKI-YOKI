import React,{useEffect,useRef,useState} from 'react';
import {Animated,Easing,PanResponder,Pressable,StyleSheet,Text,View,useWindowDimensions} from 'react-native';
import Svg,{Defs,Line,Pattern,Rect} from 'react-native-svg';
import {useReducedMotion} from '@/utils/useReducedMotion';
import {notebookFont} from './NotebookPaper';

/** Transform-only motion, with a synchronous reduced-motion path and an unmount guard. */
export function useNotebookMotion(){
 const reduce=useReducedMotion(),[opened,setOpened]=useState(false),[turning,setTurning]=useState(false),[direction,setDirection]=useState(1);
 const cover=useRef(new Animated.Value(0)).current,page=useRef(new Animated.Value(0)).current,locked=useRef(false),alive=useRef(true);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;cover.stopAnimation();page.stopAnimation();};},[cover,page]);
 const open=()=>{if(locked.current||opened)return;locked.current=true;setTurning(true);if(reduce){setOpened(true);setTurning(false);locked.current=false;return;}
  Animated.timing(cover,{toValue:1,duration:620,easing:Easing.inOut(Easing.cubic),useNativeDriver:true}).start(()=>{if(!alive.current)return;setOpened(true);setTurning(false);locked.current=false;});};
 const close=()=>{if(locked.current)return;cover.setValue(0);setOpened(false);};
 const turn=(next:()=>void,dir=1)=>{if(locked.current||!opened)return;locked.current=true;setDirection(dir);setTurning(true);
  if(reduce){next();setTurning(false);locked.current=false;return;}
  Animated.timing(page,{toValue:1,duration:190,easing:Easing.in(Easing.quad),useNativeDriver:true}).start(({finished})=>{
   if(!alive.current||!finished){locked.current=false;return;}next();page.setValue(-1);
   Animated.timing(page,{toValue:0,duration:240,easing:Easing.out(Easing.cubic),useNativeDriver:true}).start(()=>{if(!alive.current)return;setTurning(false);locked.current=false;});
  });
 };
 return {opened,turning,direction,cover,page,open,close,turn,reduce};
}
export type NotebookMotion=ReturnType<typeof useNotebookMotion>;
export function NotebookCover({motion,name,days}:{motion:NotebookMotion;name:string;days:number}){
 const size=useWindowDimensions(),width=Math.min(318,size.width-68),height=Math.min(448,size.height-180);
 return <View testID="diary-cover" style={s.coverStage} pointerEvents={motion.turning?'none':'auto'}>
  <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill,{backgroundColor:'#30203D',opacity:motion.cover.interpolate({inputRange:[0,1],outputRange:[1,0]})}]}/>
  <Animated.View style={{width,height,opacity:motion.cover.interpolate({inputRange:[0,.78,1],outputRange:[1,1,0]}),transform:[{perspective:1100},{translateX:-width/2},{rotateY:motion.cover.interpolate({inputRange:[0,1],outputRange:['0deg','-110deg']})},{translateX:width/2}]}}>
   <View pointerEvents="none" style={s.pageEdges}/>
   <Pressable testID="diary-open-cover" accessibilityRole="button" accessibilityLabel="交換日記の表紙を開く" onPress={motion.open} disabled={motion.turning} style={s.cover}>
    <Svg pointerEvents="none" style={StyleSheet.absoluteFill} width="100%" height="100%" accessible={false}><Defs><Pattern id="notebook-linen" width={7} height={7} patternUnits="userSpaceOnUse"><Line x1={0} y1={0} x2={0} y2={7} stroke="#D5BBDF" strokeOpacity={.13}/><Line x1={0} y1={0} x2={7} y2={0} stroke="#1A0B24" strokeOpacity={.2}/></Pattern></Defs><Rect width="100%" height="100%" fill="url(#notebook-linen)"/></Svg>
    <View pointerEvents="none" style={s.coverSpine}/><View pointerEvents="none" style={s.coverFrame}/>
    <Text style={s.edition}>YOKIYOKI</Text><View style={s.foilRule}/>
    <Text style={s.coverTitle}>交換日記</Text><Text style={s.coverNames}>{name} と あなた</Text>
    <View style={s.foilRule}/><Text style={s.volume}>{days}日分の記録</Text><Text style={s.openHint}>タップして開く</Text>
    <View pointerEvents="none" style={s.ribbon}/>
   </Pressable>
  </Animated.View>
 </View>;
}
export function TurningPages({motion,spread,writing,onPrevious,onNext,children}:{motion:NotebookMotion;spread:boolean;writing:boolean;onPrevious:()=>void;onNext:()=>void;children:React.ReactNode}){
 const [width,setWidth]=useState(300),latest=useRef({writing,onPrevious,onNext,motion});latest.current={writing,onPrevious,onNext,motion};
 const pan=useRef(PanResponder.create({onMoveShouldSetPanResponder:(_,g)=>!latest.current.writing&&!latest.current.motion.turning&&Math.abs(g.dx)>24&&Math.abs(g.dx)>Math.abs(g.dy)*1.8,onPanResponderRelease:(_,g)=>{if(g.dx<-48)latest.current.onNext();else if(g.dx>48)latest.current.onPrevious();}})).current;
 const angle=motion.direction>0?['80deg','0deg','-80deg']:['-80deg','0deg','80deg'];
 return <View onLayout={e=>setWidth(e.nativeEvent.layout.width)} {...pan.panHandlers}>
  <Animated.View testID="diary-turning-pages" style={{backfaceVisibility:'hidden',opacity:motion.page.interpolate({inputRange:[-1,-.7,0,.7,1],outputRange:[.45,1,1,1,.45]}),transform:[{perspective:1600},{translateX:-width/2*motion.direction},{rotateY:motion.page.interpolate({inputRange:[-1,0,1],outputRange:angle})},{translateX:width/2*motion.direction}]}}>{children}</Animated.View>
  {motion.turning&&<Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill,{backgroundColor:'#2A143E',opacity:motion.page.interpolate({inputRange:[-1,0,1],outputRange:[.15,0,.15]})}]}/>}
 </View>;
}
const s=StyleSheet.create({coverStage:{...StyleSheet.absoluteFillObject,top:65,justifyContent:'center',alignItems:'center',zIndex:3},pageEdges:{position:'absolute',left:6,right:-7,top:7,bottom:-7,backgroundColor:'#D4C5A5',borderRadius:7,borderRightWidth:4,borderRightColor:'#F3E7D0',borderBottomWidth:4,borderBottomColor:'#E3D5BA',shadowColor:'#100617',shadowRadius:22,shadowOpacity:.4,shadowOffset:{width:5,height:13}},cover:{flex:1,borderRadius:7,backgroundColor:'#59416C',alignItems:'center',justifyContent:'center',padding:22,borderWidth:1,borderColor:'#8E709C',gap:21,shadowColor:'#190C23',shadowRadius:10,shadowOpacity:.4,shadowOffset:{width:3,height:2}},coverSpine:{position:'absolute',left:0,top:0,bottom:0,width:18,backgroundColor:'#3B284D',borderRightWidth:2,borderRightColor:'#7A5D8A'},coverFrame:{position:'absolute',left:32,right:20,top:21,bottom:21,borderWidth:1,borderColor:'#D7B98E80',borderRadius:3},edition:{fontSize:10,color:'#DEC49F',letterSpacing:4},foilRule:{height:1,width:44,backgroundColor:'#D6B583'},coverTitle:{fontSize:29,lineHeight:45,color:'#F2D8AE',fontFamily:notebookFont,letterSpacing:4,textAlign:'center'},coverNames:{fontSize:12,color:'#E1C6A5',fontFamily:notebookFont,letterSpacing:1},volume:{fontSize:10,color:'#C4AECF',letterSpacing:2},openHint:{fontSize:11,color:'#E3D6ED',marginTop:4},ribbon:{position:'absolute',right:40,top:-1,width:17,height:47,backgroundColor:'#BB8C9C',borderBottomLeftRadius:2,borderBottomRightRadius:2}});
