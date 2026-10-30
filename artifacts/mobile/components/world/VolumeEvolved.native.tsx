import React,{useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {StyleSheet,View} from 'react-native';
import {WebView} from 'react-native-webview';
import {runOnJS,useFrameCallback,useSharedValue} from 'react-native-reanimated';
import {StaticMascot} from '@/components/Mascot';
import {nativeResidentDocument} from '@/utils/nativeResidentDocument';
import {mealSample} from '@/utils/residentMeal';
import type {EvolvedForm,EvolvedPose} from '@/utils/evolved3d';
import type {VolumeEvolvedProps} from './VolumeEvolvedFallback';

/** The same renderer and coat as web, isolated in one transparent local surface.
 * Native gestures/transforms stay on the UI thread; pose messages are coalesced
 * to 30 Hz and interpolated at display refresh inside the renderer. */
export function VolumeEvolved(props:VolumeEvolvedProps){
 const {stage,size,displaySize=size,active=true,reduceMotion=false}=props;
 const ref=useRef<WebView>(null),latest=useRef(props);latest.current=props;
 const [ready,setReady]=useState(false),[failed,setFailed]=useState(false);
 const lastSent=useSharedValue(-1),lastPose=useSharedValue('');
 const source=useMemo(()=>({html:nativeResidentDocument(stage as EvolvedForm)}),[stage]);
 const send=useCallback((pose:EvolvedPose)=>{
  const p=latest.current;
  ref.current?.postMessage(JSON.stringify({type:'pose',pose,active:p.active??true,reduceMotion:!!p.reduceMotion,size:p.displaySize??p.size}));
 },[]);
 const frames=useFrameCallback(frame=>{
  if(!ready||failed||!active||frame.timestamp-lastSent.value<1000/30)return;
  lastSent.value=frame.timestamp;
  const meal=mealSample(props.mealProgress?.value??0);
  const pose={rx:props.rx.value,ry:props.ry.value,rz:props.rz.value,blink:props.blink.value,
   happy:props.mood==='happy'||props.mood==='excited',sleepy:props.mood==='sleepy',night:!!props.night,mouthOpen:meal.open,chew:meal.chew,smoking:!!props.smoking};
  const key=JSON.stringify(pose)+displaySize;
  if(key!==lastPose.value){lastPose.value=key;runOnJS(send)(pose);}
 },false);
 useEffect(()=>{frames.setActive(ready&&!failed&&active);lastPose.value='';
  if(ready&&!active){const p=latest.current,meal=mealSample(p.mealProgress?.value??0);send({rx:p.rx.value,ry:p.ry.value,rz:p.rz.value,blink:p.blink.value,happy:p.mood==='happy'||p.mood==='excited',sleepy:p.mood==='sleepy',night:!!p.night,mouthOpen:meal.open,chew:meal.chew,smoking:!!p.smoking});}
  return()=>frames.setActive(false);
 },[ready,failed,active,reduceMotion,frames,send,lastPose]);
 useEffect(()=>{setReady(false);setFailed(false);lastSent.value=-1;lastPose.value='';},[stage]);
 return <View testID={`resident-volume-${stage}`} pointerEvents="none" style={{width:size,height:size}}>
  {(!ready||failed)&&<StaticMascot stage={stage} mood={props.mood} size={size}/>}
  {!failed&&<View testID={ready?'resident-renderer-ready':'resident-renderer-loading'} style={[StyleSheet.absoluteFill,{opacity:ready?1:0}]}>
   <WebView ref={ref} source={source} originWhitelist={['about:blank']} onShouldStartLoadWithRequest={request=>request.url==='about:blank'}
    onMessage={event=>{try{const m=JSON.parse(event.nativeEvent.data);if(m.type==='ready')setReady(true);if(m.type==='failed')setFailed(true);}catch{}}}
    onError={()=>setFailed(true)} onContentProcessDidTerminate={()=>{setReady(false);ref.current?.reload();}}
    scrollEnabled={false} bounces={false} javaScriptEnabled domStorageEnabled={false} allowFileAccess={false} mixedContentMode="never"
    style={{backgroundColor:'transparent'}} containerStyle={{backgroundColor:'transparent'}}
    accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"/>
  </View>}
 </View>;
}
