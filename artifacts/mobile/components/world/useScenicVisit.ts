import {useCallback,useEffect,useState,useRef} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {sceneForVisit,visitReturnKey,type VisitScene} from '@/utils/scenicVisits';
export function useScenicVisit(owner:string,date:string,night:boolean,forceHome:boolean){
 const key=visitReturnKey(owner,date),[value,setValue]=useState<{key:string;scene:VisitScene|null}|null>(null),home=useRef(new Set<string>()),choices=useRef(new Map<string,VisitScene|null>());
 // Pick on entry. A clock tick at sunset must not remount a character during care.
 if(!choices.current.has(key))choices.current.set(key,sceneForVisit(owner,date,night));
 useEffect(()=>{let alive=true;setValue(null);if(forceHome||home.current.has(key)){home.current.add(key);setValue({key,scene:null});if(forceHome)void AsyncStorage.setItem(key,'home').catch(()=>{});return;}
  AsyncStorage.getItem(key).then(returned=>{if(alive&&!home.current.has(key))setValue({key,scene:returned?null:choices.current.get(key)??null});}).catch(()=>{if(alive)setValue({key,scene:null});});
  return()=>{alive=false;};
 },[key,forceHome]);
 const returnHome=useCallback(()=>{home.current.add(key);setValue({key,scene:null});void AsyncStorage.setItem(key,'home').catch(()=>{});},[key]);
 return {scene:!forceHome&&value?.key===key?value.scene:null,returnHome};
}
export const VISIT_ART={sea:require('@/assets/images/world/visit-sea.webp'),meadow:require('@/assets/images/world/visit-meadow.webp'),night:require('@/assets/images/world/visit-night.webp')};
