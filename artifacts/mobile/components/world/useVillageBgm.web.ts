import {useEffect,useRef,useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Asset} from 'expo-asset';
const KEY='@yoki/village_bgm_v1';
export function useVillageBgm(active:boolean) {
  const [enabled,setEnabled]=useState(true),[blocked,setBlocked]=useState(false),[ready,setReady]=useState(false);
  const player=useRef<HTMLAudioElement|null>(null),current=useRef(active),generation=useRef(0),alive=useRef(true);
  const touched=useRef(false);
  current.current=active;
  const getPlayer=()=>{
    if(!player.current){
      const audio=new window.Audio(Asset.fromModule(require('@/assets/sounds/village-afternoon.mp3')).uri);
      audio.loop=true;audio.volume=.20;audio.preload='none';audio.dataset.testid='village-bgm-audio';audio.setAttribute('aria-hidden','true');
      document.body.appendChild(audio);player.current=audio;
    }
    return player.current;
  };
  const play=()=>{
    if(!current.current)return;
    const id=++generation.current,audio=getPlayer();
    // Called directly by the BGM button too: Safari gets a real user gesture.
    void audio.play().then(()=>{if(alive.current&&id===generation.current)setBlocked(false);},()=>{if(alive.current&&id===generation.current)setBlocked(true);});
  };
  useEffect(()=>{
    alive.current=true;touched.current=false;let current=true;
    void AsyncStorage.getItem(KEY).then(value=>{if(current&&alive.current){if(!touched.current)setEnabled(value!=='off');setReady(true);}},()=>{if(alive.current)setReady(true);});
    return()=>{current=false;alive.current=false;generation.current++;player.current?.pause();player.current?.remove();player.current=null;};
  },[]);
  useEffect(()=>{
    if(ready&&enabled&&active)play();
    else {generation.current++;player.current?.pause();}
  },[ready,enabled,active]);
  useEffect(()=>{
    if(!ready||!enabled||!active)return;
    const resume=()=>{if(current.current&&player.current?.paused)play();};
    document.addEventListener('pointerup',resume);
    document.addEventListener('keydown',resume);
    return()=>{document.removeEventListener('pointerup',resume);document.removeEventListener('keydown',resume);};
  },[ready,enabled,active]);
  const toggle=()=>{
    touched.current=true;
    if(blocked){setBlocked(false);play();return;}
    const next=!enabled;setEnabled(next);setReady(true);
    void AsyncStorage.setItem(KEY,next?'on':'off').catch(()=>{});
    if(next)play();else {generation.current++;player.current?.pause();}
  };
  return {enabled:enabled&&!blocked,busy:false,toggle,error:blocked?'BGMを押すと音楽が流れます。':''};
}
