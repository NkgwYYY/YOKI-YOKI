import {useEffect,useRef,useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {homeViewKey,readHomeView,type HomeView} from '@/utils/homeView';

/** Read before accepting a selection; never overwrite a saved view during hydration. */
export function useHomeViewPreference(owner:string,authReady:boolean){
  const key=homeViewKey(owner),latest=useRef(key);latest.current=key;
  const [value,setValue]=useState<{key:string;mode:HomeView;error?:string}|null>(null);
  useEffect(()=>{
    let alive=true;
    if(!authReady)return;
    AsyncStorage.getItem(key).then(saved=>{
      if(alive)setValue({key,mode:readHomeView(saved)});
    }).catch(()=>{if(alive)setValue({key,mode:'overview',error:'保存した視点を読み込めなかったため、お部屋全体を表示しています。'});});
    return()=>{alive=false;};
  },[key,authReady]);
  const ready=authReady&&value?.key===key;
  return {key,ready,mode:ready?value.mode:'overview' as HomeView,error:ready?value.error:undefined,
    async persist(mode:HomeView){
      if(!ready||latest.current!==key)throw Error('View preference is not ready');
      await AsyncStorage.setItem(key,mode);
      if(latest.current!==key)throw Error('View owner changed');
    },
    select(mode:HomeView){if(latest.current===key)setValue({key,mode});},
  };
}
