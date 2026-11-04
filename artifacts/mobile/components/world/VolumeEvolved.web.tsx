import {useResidentSmile} from '@/hooks/useResidentSmile';
import React,{useEffect,useRef,useState} from 'react';
import {View} from 'react-native';
import {Asset} from 'expo-asset';
import {createEvolvedRenderer,type EvolvedForm} from '@/utils/evolved3d';
import {mealSample} from '@/utils/residentMeal';
import {VolumeEvolvedFallback,type VolumeEvolvedProps} from './VolumeEvolvedFallback';

/** Reveal the first fully textured frame. Expression updates keep this renderer
 * and its coat cache; they never show a temporary coat during image decoding. */
export function VolumeEvolved(props:VolumeEvolvedProps){
 const smile=useResidentSmile(props.mood,props.reduceMotion);
 const {size,displaySize=size,stage,active=true}=props;
 const ref=useRef<HTMLCanvasElement>(null),latest=useRef(props);latest.current=props;
 const resumeRef=useRef(()=>{});
 const [failed,setFailed]=useState(false),[ready,setReady]=useState(false);
 useEffect(()=>{
  const canvas=ref.current;if(!canvas||failed)return;
  let renderer:ReturnType<typeof createEvolvedRenderer>|undefined;
  let frame=0,previous='',visible=true,stopped=false,materialReady=stage!=='odango',coat:HTMLImageElement|undefined;
  setReady(false);latest.current.onRendererStateChange?.('loading');
  const cancel=()=>{cancelAnimationFrame(frame);frame=0;};
  const currentPose=()=>{
   const p=latest.current,meal=mealSample(p.mealProgress?.value??0);
   return {rx:p.rx.value,ry:p.ry.value,rz:p.rz.value,blink:p.blink.value,costume:p.costume,smile:smile.value,happy:p.mood==='happy'||p.mood==='excited',sleepy:p.mood==='sleepy',night:!!p.night,mouthOpen:meal.open,chew:meal.chew,smoking:!!p.smoking};
  };
  const draw=()=>{const pose=currentPose(),key=JSON.stringify(pose);if(key!==previous){renderer?.render(pose);previous=key;}};
  const fail=()=>{if(stopped)return;cancel();setFailed(true);latest.current.onRendererStateChange?.('failed');};
  const tick=()=>{
   frame=0;if(stopped||!materialReady||latest.current.active===false||document.hidden||!visible)return;
   try{draw();frame=requestAnimationFrame(tick);}catch{fail();}
  };
  const resume=()=>{
   cancel();if(stopped||!materialReady)return;
   try{draw();if(latest.current.active!==false&&!document.hidden&&visible)frame=requestAnimationFrame(tick);}catch{fail();}
  };
  resumeRef.current=resume;
  const reveal=()=>{
   if(stopped)return;
   try{draw();setReady(true);latest.current.onRendererStateChange?.('ready');resume();}catch{fail();}
  };
  const timer=setTimeout(()=>{if(!materialReady)fail();},10000);
  try{
   canvas.width=canvas.height=Math.min(640,Math.max(192,Math.ceil(displaySize*Math.min(window.devicePixelRatio||1,2))));
   canvas.dataset.motion='display-refresh';
   renderer=createEvolvedRenderer(canvas,stage as EvolvedForm,displaySize<200?'room':'portrait');
   if(stage==='odango'){
    coat=new window.Image();
    coat.onload=()=>{if(stopped||!coat)return;renderer?.setCoatTexture(coat);canvas.dataset.coat='original';materialReady=true;clearTimeout(timer);reveal();};
    coat.onerror=fail;
    coat.src=Asset.fromModule(require('@/assets/images/characters/bone/odango/body.webp')).uri;
   }else reveal();
  }catch{fail();}
  const observer=typeof IntersectionObserver!=='undefined'?new IntersectionObserver(entries=>{visible=entries[0]?.isIntersecting??true;resume();}):null;
  observer?.observe(canvas);document.addEventListener('visibilitychange',resume);
  return()=>{stopped=true;clearTimeout(timer);if(coat){coat.onload=null;coat.onerror=null;}cancel();observer?.disconnect();document.removeEventListener('visibilitychange',resume);renderer?.dispose();resumeRef.current=()=>{};};
 },[stage,size,displaySize,failed,smile]);
 useEffect(()=>{resumeRef.current();},[active,props.mood,props.costume,props.night,props.smoking,props.reduceMotion]);
 if(failed)return <VolumeEvolvedFallback {...props}/>;
 return <View testID={`resident-volume-${stage}`} style={{width:size,height:size}} pointerEvents="none">
  {React.createElement('canvas',{ref,'aria-hidden':true,'data-renderer':'fur-3d-projection',style:{display:'block',width:size,height:size,opacity:ready?1:0,pointerEvents:'none'}})}
 </View>;
}
