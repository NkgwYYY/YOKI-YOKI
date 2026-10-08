import {useEffect,useRef,useState} from 'react';
import {Asset} from 'expo-asset';
export function useKitchenAudio(active:boolean,boiling:boolean){
 const [enabled,setEnabled]=useState(true),[blocked,setBlocked]=useState(false);
 const loop=useRef<HTMLAudioElement|null>(null),lift=useRef<HTMLAudioElement|null>(null);
 const enabledRef=useRef(enabled);enabledRef.current=enabled;
 const ensure=()=>{if(typeof document==='undefined')return;if(!loop.current){loop.current=document.createElement('audio');loop.current.src=Asset.fromModule(require('@/assets/sounds/kitchen-simmer.mp3')).uri;loop.current.loop=true;loop.current.volume=.32;loop.current.preload='auto';loop.current.dataset.testid='kitchen-simmer-audio';document.body.appendChild(loop.current);}if(!lift.current){lift.current=document.createElement('audio');lift.current.src=Asset.fromModule(require('@/assets/sounds/kitchen-lift.mp3')).uri;lift.current.volume=.38;lift.current.preload='auto';lift.current.dataset.testid='kitchen-lift-audio';document.body.appendChild(lift.current);}};
 const start=()=>{ensure();if(enabledRef.current&&active)void loop.current?.play().then(()=>setBlocked(false)).catch(()=>setBlocked(true));};
 const finish=()=>{loop.current?.pause();ensure();if(enabledRef.current&&active&&lift.current){lift.current.currentTime=0;void lift.current.play().catch(()=>{});}};
 useEffect(()=>{if(active&&boiling&&enabled)start();else{loop.current?.pause();if(!active)lift.current?.pause();}},[active,boiling,enabled]);
 useEffect(()=>()=>{loop.current?.pause();loop.current?.remove();lift.current?.pause();lift.current?.remove();loop.current=null;lift.current=null;},[]);
 const toggle=()=>{const next=!enabled;setEnabled(next);enabledRef.current=next;if(next&&boiling)start();else if(!next){loop.current?.pause();lift.current?.pause();}};
 return {enabled,toggle,start,finish,blocked};
}
