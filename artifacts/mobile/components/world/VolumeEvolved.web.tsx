import React,{useEffect,useRef,useState} from 'react';
import {View} from 'react-native';
import {createEvolvedRenderer,type EvolvedForm} from '@/utils/evolved3d';
import {mealSample} from '@/utils/residentMeal';
import {VolumeEvolvedFallback,type VolumeEvolvedProps} from './VolumeEvolvedFallback';

/** One canvas for the resident. No network textures, per-frame mesh creation,
 * React state updates or background painting. SVG survives unavailable Canvas. */
export function VolumeEvolved(props:VolumeEvolvedProps){
  const {size,displaySize=size,stage,active=true}=props;
  const ref=useRef<HTMLCanvasElement>(null),latest=useRef(props);latest.current=props;
  const [failed,setFailed]=useState(false);
  useEffect(()=>{
    const canvas=ref.current;if(!canvas||failed)return;
    let renderer:ReturnType<typeof createEvolvedRenderer>|undefined;
    let frame=0,previous='',visible=true,stopped=false;
    const cancel=()=>{cancelAnimationFrame(frame);frame=0;};
    const tick=(now:number)=>{
      frame=0;if(stopped||!active||document.hidden||!visible)return;
      frame=requestAnimationFrame(tick);
      const p=latest.current,meal=mealSample(p.mealProgress?.value??0);
      const pose={rx:p.rx.value,ry:p.ry.value,rz:p.rz.value,blink:p.blink.value,happy:p.mood==='happy'||p.mood==='excited',sleepy:p.mood==='sleepy',night:!!p.night,mouthOpen:meal.open,chew:meal.chew,smoking:!!p.smoking};
      const key=JSON.stringify(pose);
      if(key!==previous){renderer?.render(pose);previous=key;}
    };
    const resume=()=>{cancel();if(!stopped&&active&&!document.hidden&&visible)frame=requestAnimationFrame(tick);};
    
    try{
      canvas.width=canvas.height=Math.min(640,Math.max(192,Math.ceil(displaySize*Math.min(window.devicePixelRatio||1,2))));
      canvas.dataset.motion='display-refresh';
      renderer=createEvolvedRenderer(canvas,stage as EvolvedForm,displaySize<200?'room':'portrait');
      // Paint even when reduced motion or a static preview is selected.
      const p=latest.current;
      renderer.render({rx:p.rx.value,ry:p.ry.value,rz:p.rz.value,blink:p.blink.value,happy:p.mood==='happy'||p.mood==='excited',sleepy:p.mood==='sleepy',night:!!p.night,mouthOpen:0,chew:0,smoking:!!p.smoking});
    }catch{renderer?.dispose();setFailed(true);return;}
    const observer=typeof IntersectionObserver!=='undefined'?new IntersectionObserver(entries=>{visible=entries[0]?.isIntersecting??true;resume();}):null;
    observer?.observe(canvas);document.addEventListener('visibilitychange',resume);resume();
    return()=>{stopped=true;cancel();observer?.disconnect();document.removeEventListener('visibilitychange',resume);renderer?.dispose();};
  },[stage,size,displaySize,active,failed]);
  if(failed)return <VolumeEvolvedFallback {...props}/>;
  return <View testID={`resident-volume-${stage}`} style={{width:size,height:size}} pointerEvents="none">
    {React.createElement('canvas',{ref,'aria-hidden':true,'data-renderer':'fur-3d-projection',style:{display:'block',width:size,height:size,pointerEvents:'none'}})}
  </View>;
}
