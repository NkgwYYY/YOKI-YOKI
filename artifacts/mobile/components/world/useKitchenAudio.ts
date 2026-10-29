import {useEffect,useRef,useState} from 'react';
import {Audio} from 'expo-av';
export function useKitchenAudio(active:boolean,boiling:boolean){
 const [enabled,setEnabled]=useState(true),[blocked,setBlocked]=useState(false),loop=useRef<Audio.Sound|null>(null),lift=useRef<Audio.Sound|null>(null),alive=useRef(true),generation=useRef(0);
 const start=()=>{const id=++generation.current;if(!enabled||!active)return;void(async()=>{let sound=loop.current;if(!sound){sound=(await Audio.Sound.createAsync(require('@/assets/sounds/kitchen-simmer.mp3'),{isLooping:true,volume:.32})).sound;if(!alive.current||generation.current!==id){await sound.unloadAsync();return;}loop.current=sound;}await sound.playAsync();if(alive.current)setBlocked(false);})().catch(()=>{if(alive.current)setBlocked(true);});};
 const finish=()=>{generation.current++;void loop.current?.pauseAsync();if(!enabled||!active)return;void(async()=>{let sound=lift.current;if(!sound){sound=(await Audio.Sound.createAsync(require('@/assets/sounds/kitchen-lift.mp3'),{volume:.38})).sound;if(!alive.current){await sound.unloadAsync();return;}lift.current=sound;}await sound.replayAsync();})().catch(()=>{});};
 useEffect(()=>{if(active&&boiling&&enabled)start();else{generation.current++;void loop.current?.pauseAsync();if(!active)void lift.current?.pauseAsync();}},[active,boiling,enabled]);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;generation.current++;void loop.current?.unloadAsync();void lift.current?.unloadAsync();};},[]);
 return {enabled,toggle:()=>setEnabled(v=>!v),start,finish,blocked};
}
