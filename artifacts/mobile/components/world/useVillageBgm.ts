import {useEffect,useRef,useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Audio} from 'expo-av';
const KEY='@yoki/village_bgm_v1';
export function useVillageBgm(active:boolean) {
  const [enabled,setEnabled]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const sound=useRef<Audio.Sound|null>(null),generation=useRef(0),alive=useRef(true);
  const touched=useRef(false);
  useEffect(()=>{
    alive.current=true;touched.current=false;let current=true;
    void AsyncStorage.getItem(KEY).then(value=>{if(current&&alive.current&&!touched.current)setEnabled(value==='on');}).catch(()=>{});
    return()=>{current=false;alive.current=false;generation.current++;void sound.current?.unloadAsync();sound.current=null;};
  },[active]);
  useEffect(()=>{
    const id=++generation.current;
    if(!enabled||!active){void sound.current?.pauseAsync().catch(()=>{});setBusy(false);return;}
    setBusy(true);
    void (async()=>{
      await Audio.setAudioModeAsync({playsInSilentModeIOS:false,staysActiveInBackground:false,shouldDuckAndroid:true});
      if(!alive.current||id!==generation.current)return;
      let player=sound.current;
      if(!player){const created=await Audio.Sound.createAsync(require('@/assets/sounds/village-afternoon.mp3'),{isLooping:true,volume:.20,shouldPlay:false});player=created.sound;
        if(!alive.current||id!==generation.current){await player.unloadAsync();return;}sound.current=player;}
      await player.playAsync();
      if(alive.current&&id===generation.current)setError('');
    })().catch(()=>{if(alive.current&&id===generation.current){setError('BGMを読み込めませんでした。もう一度お試しください。');setEnabled(false);}})
      .finally(()=>{if(alive.current&&id===generation.current)setBusy(false);});
  },[enabled,active]);
  const toggle=()=>{touched.current=true;const next=!enabled;setEnabled(next);void AsyncStorage.setItem(KEY,next?'on':'off').catch(()=>{});};
  return {enabled,busy,toggle,error};
}
