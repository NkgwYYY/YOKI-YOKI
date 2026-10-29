import React,{useState} from 'react';
import {StyleSheet,Text,View} from 'react-native';
import Animated,{useAnimatedStyle,useDerivedValue,type SharedValue} from 'react-native-reanimated';
import {FeltDecoration} from '@/components/ui/Felt';
import {placeResidentSpeech,type SpeechAnchor} from '@/utils/residentSpeech';
import type {HomeFrame} from '@/utils/homeView';

export function ResidentSpeech({text,anchor,camera,frame,viewport,safeTop,safeBottom}:{
 text:string;anchor:SharedValue<SpeechAnchor>;camera:SharedValue<{zoom:number;panX:number;panY:number}>;
 frame:HomeFrame;viewport:{width:number;height:number};safeTop:number;safeBottom:number;
}){
 const width=Math.min(230,viewport.width-32),[height,setHeight]=useState(66);
 const placement=useDerivedValue(()=>{
   const a=anchor.value,c=camera.value;
   const x=frame.left+frame.width/2+c.panX+(a.x-frame.width/2)*c.zoom;
   const projectY=(y:number)=>frame.top+frame.height/2+c.panY+(y-frame.height/2)*c.zoom;
   return placeResidentSpeech({x,top:projectY(a.top),bottom:projectY(a.bottom),width:a.width*c.zoom},{width,height},
     {left:12,top:safeTop,width:viewport.width-24,height:Math.max(height,safeBottom-safeTop)});
 });
 const position=useAnimatedStyle(()=>({transform:[{translateX:placement.value.left},{translateY:placement.value.top}]}));
 const tail=useAnimatedStyle(()=>({left:placement.value.tailX-4,top:placement.value.tailY,transform:[{rotate:'45deg'}]}));
 return <Animated.View testID="resident-speech-bubble" pointerEvents="none" style={[s.root,{width},position]}>
   <Animated.View style={[s.tail,tail]}/>
   <View style={s.bubble} onLayout={e=>setHeight(e.nativeEvent.layout.height)}>
     <FeltDecoration radius={19}/>
     <Text testID="world-speech" accessibilityLiveRegion="polite" style={s.text}>{text}</Text>
   </View>
 </Animated.View>;
}
const s=StyleSheet.create({
 root:{position:'absolute',left:0,top:0,zIndex:1050},
 bubble:{borderRadius:19,borderWidth:1,borderColor:'#D6C5A6',backgroundColor:'#FFF9ED',paddingHorizontal:17,paddingVertical:13,
   shadowColor:'#55482D',shadowOpacity:.13,shadowRadius:5,shadowOffset:{width:0,height:3},elevation:3},
 text:{fontSize:14,lineHeight:21,color:'#655B4D',textAlign:'center'},
 tail:{position:'absolute',width:10,height:10,backgroundColor:'#FFF9ED',borderRightWidth:1,borderBottomWidth:1,borderColor:'#D6C5A6'},
});
