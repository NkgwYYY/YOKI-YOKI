import {useEffect} from 'react';
import {useSharedValue,withTiming} from 'react-native-reanimated';
import type {MascotMood} from '@/utils/mascotUtils';
/** Expression changes only the mouth curve; silhouette and coat never change. */
export function useResidentSmile(mood:MascotMood,reduceMotion=false){
 const target=mood==='happy'||mood==='excited'?1:0;
 const smile=useSharedValue(target);
 useEffect(()=>{smile.value=withTiming(target,{duration:reduceMotion?0:650});},[target,reduceMotion,smile]);
 return smile;
}
