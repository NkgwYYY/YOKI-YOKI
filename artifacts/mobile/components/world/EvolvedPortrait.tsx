import React,{useEffect} from 'react';
import {cancelAnimation,Easing,useSharedValue,withDelay,withRepeat,withSequence,withTiming} from 'react-native-reanimated';
import type {MascotMood} from '@/utils/mascotUtils';
import type {EvolvedForm} from '@/utils/evolved3d';
import {VolumeEvolved} from './VolumeEvolved';

/** The same resident model is used in conversations and the character book. */
export function EvolvedPortrait({stage,size,mood,active=true,reduceMotion=false,turn=false}:{stage:EvolvedForm;size:number;mood:MascotMood;active?:boolean;reduceMotion?:boolean;turn?:boolean}){
  const rx=useSharedValue(0),ry=useSharedValue(0),rz=useSharedValue(0),blink=useSharedValue(0);
  useEffect(()=>{
    if(active&&!reduceMotion){
      blink.value=withRepeat(withDelay(4200,withSequence(withTiming(1,{duration:85}),withTiming(0,{duration:150}))),-1);
      if(turn)ry.value=withRepeat(withSequence(withDelay(1200,withTiming(Math.PI*2,{duration:15000,easing:Easing.linear})),withTiming(0,{duration:0})),-1);
    }
    return()=>{cancelAnimation(blink);cancelAnimation(ry);};
  },[active,reduceMotion,turn]);
  return <VolumeEvolved stage={stage} size={size} mood={mood} rx={rx} ry={ry} rz={rz} blink={blink} active={active} reduceMotion={reduceMotion}/>;
}
