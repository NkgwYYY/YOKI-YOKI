import {useResidentSmile} from '@/hooks/useResidentSmile';
import React,{useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {AppState,StyleSheet,View} from 'react-native';
import {WebView} from 'react-native-webview';
import {runOnJS,useFrameCallback,useSharedValue} from 'react-native-reanimated';
import {VolumeEvolvedFallback} from './VolumeEvolvedFallback';
import {nativeResidentDocument} from '@/utils/nativeResidentDocument';
import {mealSample} from '@/utils/residentMeal';
import type {EvolvedForm,EvolvedPose} from '@/utils/evolved3d';
import {createResidentWebViewLifecycle,residentWebViewTimeout,type ResidentWebViewSnapshot} from '@/utils/residentWebViewLifecycle';
import type {VolumeEvolvedProps} from './VolumeEvolvedFallback';

/** The same renderer and coat as web, isolated in one transparent local surface.
 * Native gestures/transforms stay on the UI thread; pose messages are coalesced
 * to 30 Hz and interpolated at up to 30 fps inside the renderer. */
export function VolumeEvolved(props:VolumeEvolvedProps){
 const smile=useResidentSmile(props.mood,props.reduceMotion);
 const {stage,size,displaySize=size,active=true,reduceMotion=false}=props;
 const ref=useRef<WebView>(null),latest=useRef(props);latest.current=props;
 const [lifecycle]=useState(()=>createResidentWebViewLifecycle(stage));
 const [state,setState]=useState(lifecycle.snapshot);
 const {generation,token,phase}=state,ready=phase==='ready',failed=phase==='failed';
 const apply=useCallback((next:ResidentWebViewSnapshot|null)=>{if(next)setState(next);},[]);
 const lastSent=useSharedValue(-1),lastPose=useSharedValue('');
 // Seed the exact coat, costume, expression and resolution in the local document.
 // Keep its identity stable while poses change: replacing source would reload WKWebView.
 const source=useMemo(()=>{
  const p=latest.current,meal=mealSample(p.mealProgress?.value??0);
  return {html:nativeResidentDocument(stage as EvolvedForm,{
   pose:{rx:p.rx.value,ry:p.ry.value,rz:p.rz.value,blink:p.blink.value,costume:p.costume,smile:smile.value,happy:p.mood==='happy'||p.mood==='excited',sleepy:p.mood==='sleepy',night:!!p.night,mouthOpen:meal.open,chew:meal.chew,smoking:!!p.smoking},
   active:p.active??true,reduceMotion:!!p.reduceMotion,size:p.displaySize??p.size,
  })};
 },[stage,generation]);
 const send=useCallback((pose:EvolvedPose,confirmReady=false)=>{
  const p=latest.current;
  ref.current?.postMessage(JSON.stringify({type:'pose',pose,confirmReady,active:p.active??true,reduceMotion:!!p.reduceMotion,size:p.displaySize??p.size}));
 },[]);
 const sendCurrentPose=useCallback(()=>{
  const p=latest.current,meal=mealSample(p.mealProgress?.value??0);
  send({rx:p.rx.value,ry:p.ry.value,rz:p.rz.value,blink:p.blink.value,costume:p.costume,smile:smile.value,happy:p.mood==='happy'||p.mood==='excited',sleepy:p.mood==='sleepy',night:!!p.night,mouthOpen:meal.open,chew:meal.chew,smoking:!!p.smoking},true);
 },[send,smile]);
 const frames=useFrameCallback(frame=>{
  if(!ready||failed||!active||frame.timestamp-lastSent.value<1000/30)return;
  lastSent.value=frame.timestamp;
  const meal=mealSample(props.mealProgress?.value??0);
  const pose={rx:props.rx.value,ry:props.ry.value,rz:props.rz.value,blink:props.blink.value,
   costume:props.costume,smile:smile.value,happy:props.mood==='happy'||props.mood==='excited',sleepy:props.mood==='sleepy',night:!!props.night,mouthOpen:meal.open,chew:meal.chew,smoking:!!props.smoking};
  const key=JSON.stringify(pose)+displaySize;
  if(key!==lastPose.value){lastPose.value=key;runOnJS(send)(pose);}
 },false);
 useEffect(()=>{frames.setActive(ready&&!failed&&active);lastPose.value='';
  if(ready&&!active){const p=latest.current,meal=mealSample(p.mealProgress?.value??0);send({rx:p.rx.value,ry:p.ry.value,rz:p.rz.value,blink:p.blink.value,costume:p.costume,smile:smile.value,happy:p.mood==='happy'||p.mood==='excited',sleepy:p.mood==='sleepy',night:!!p.night,mouthOpen:meal.open,chew:meal.chew,smoking:!!p.smoking});}
  return()=>frames.setActive(false);
 },[ready,failed,active,reduceMotion,frames,send,lastPose]);
 useEffect(()=>{apply(lifecycle.reset(stage));lastSent.value=-1;lastPose.value='';},[stage,lifecycle,apply,lastSent,lastPose]);
 useEffect(()=>{
  const delay=residentWebViewTimeout(phase);if(delay===null)return;
  const timer=setTimeout(()=>apply(lifecycle.timeout(token,phase)),delay);
  return()=>clearTimeout(timer);
 },[phase,token,lifecycle,apply]);
 useEffect(()=>{
  const subscription=AppState.addEventListener('change',status=>{
   if(status!=='active')return;
   lastPose.value='';apply(lifecycle.resume());sendCurrentPose();
  });
  return()=>subscription.remove();
 },[lifecycle,apply,sendCurrentPose,lastPose]);
 // A fallback never satisfies readiness. Diagnostics are only exposed by QA builds.
 useEffect(()=>{props.onRendererStateChange?.(failed?'failed':ready?'ready':'loading',state.trace);},[failed,ready,state.trace,props.onRendererStateChange]);
 return <View testID={`resident-volume-${stage}`} pointerEvents="none" style={{width:size,height:size}}>
  {/* Keep WKWebView composited during startup; hiding its layer can defer first paint.
      The local canvas stays transparent until the original textured pose is drawn. */}
  {failed&&<VolumeEvolvedFallback {...props}/>}
  {!failed&&<View testID={ready?'resident-renderer-ready':'resident-renderer-loading'} style={StyleSheet.absoluteFill}>
   <WebView key={token} ref={ref} source={source} originWhitelist={['about:blank']} onShouldStartLoadWithRequest={request=>request.url==='about:blank'}
    onMessage={event=>{try{const m=JSON.parse(event.nativeEvent.data);if(m.type==='loaded'){apply(lifecycle.loaded(token));sendCurrentPose();}if(m.type==='ready')apply(lifecycle.ready(token));if(m.type==='failed')apply(lifecycle.error(token,'paint-error'));}catch{}}}
    onLoadStart={()=>apply(lifecycle.note(token,'load-start'))}
    onLoadEnd={()=>{apply(lifecycle.loaded(token));sendCurrentPose();}}
    onError={event=>apply(lifecycle.error(token,'load-error:'+event.nativeEvent.code))} onContentProcessDidTerminate={()=>apply(lifecycle.error(token,'process-terminated'))}
    scrollEnabled={false} bounces={false} javaScriptEnabled domStorageEnabled={false} allowFileAccess={false} mixedContentMode="never"
    style={{backgroundColor:'transparent'}} containerStyle={{backgroundColor:'transparent'}}
    accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"/>
  </View>}
 </View>;
}

