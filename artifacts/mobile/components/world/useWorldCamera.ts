import {useEffect} from 'react';
import {Gesture} from 'react-native-gesture-handler';
import {cancelAnimation, useAnimatedStyle,useSharedValue,withTiming} from 'react-native-reanimated';

/** Camera is independent of HUD/layout. Pinch focal point stays in place and a
 * two-finger pan never moves the resident. One-finger coordinates remain local. */
export function useWorldCamera({width,height,left,top,active,reduceMotion}: {width:number;height:number;left:number;top:number;active:boolean;reduceMotion:boolean}) {
  const zoom=useSharedValue(1),panX=useSharedValue(0),panY=useSharedValue(0),follow=useSharedValue(0);
  const touching=useSharedValue(0),pinching=useSharedValue(0);
  const startZoom=useSharedValue(1),startX=useSharedValue(0),startY=useSharedValue(0),focusX=useSharedValue(0),focusY=useSharedValue(0);
  const dragX=useSharedValue(0),dragY=useSharedValue(0);
  const clamp=(value:number,extent:number)=>{'worklet';return Math.max(-extent,Math.min(extent,value));};
  const pinch=Gesture.Pinch().enabled(active).onStart(event=>{
    touching.value=1;pinching.value=1;cancelAnimation(zoom);cancelAnimation(panX);cancelAnimation(panY);cancelAnimation(follow);
    startZoom.value=zoom.value;startX.value=panX.value;startY.value=panY.value;
    focusX.value=event.focalX-left-width/2;focusY.value=event.focalY-top-height/2-follow.value;
  }).onUpdate(event=>{
    const next=Math.max(1,Math.min(2.4,startZoom.value*event.scale));
    const ratio=next/startZoom.value;
    panX.value=clamp(event.focalX-left-width/2-(focusX.value-startX.value)*ratio,width*(next-1)/2);
    panY.value=clamp(event.focalY-top-height/2-follow.value-(focusY.value-startY.value)*ratio,height*(next-1)/2);
    zoom.value=next;
  }).onFinalize(()=>{pinching.value=0;touching.value=0;});
  const pan=Gesture.Pan().enabled(active).minPointers(2).maxPointers(2).onStart(()=>{
    touching.value=1;dragX.value=panX.value;dragY.value=panY.value;
  }).onUpdate(event=>{
    if(pinching.value)return;
    panX.value=clamp(dragX.value+event.translationX,width*(zoom.value-1)/2);
    panY.value=clamp(dragY.value+event.translationY,height*(zoom.value-1)/2);
  }).onFinalize(()=>{if(!pinching.value)touching.value=0;});
  const style=useAnimatedStyle(()=>({transform:[{translateX:panX.value},{translateY:follow.value+panY.value},{scale:zoom.value}]}));
  const reset=()=>{zoom.value=withTiming(1,{duration:reduceMotion?0:250});panX.value=withTiming(0,{duration:reduceMotion?0:250});panY.value=withTiming(0,{duration:reduceMotion?0:250});};
  useEffect(()=>{reset();},[width,height]);
  const closer=()=>{zoom.value=withTiming(Math.min(2.4,zoom.value+.35),{duration:reduceMotion?0:250});};
  return {zoom,panX,panY,follow,touching,pinch,gesture:Gesture.Simultaneous(pinch,pan),style,reset,closer};
}
