import {useEffect,useRef,useState} from 'react';
import {Audio} from 'expo-av';
import {useVillageMusic} from '@/contexts/VillageMusicContext';
import type {RestScene} from './RestScenes';
const sounds={campfire:require('@/assets/sounds/campfire.mp3'),rain:require('@/assets/sounds/rain.mp3'),stars:require('@/assets/sounds/stars.mp3'),cat:require('@/assets/sounds/cat_purr.mp3')};
export function useRestAudio(scene:RestScene,enabled:boolean,volume:number){
 const music=useVillageMusic(),hold=useRef(music.withPaused);hold.current=music.withPaused;
 const sound=useRef<Audio.Sound|null>(null),target=useRef(volume);target.current=volume;
 const [error,setError]=useState(false),[retry,setRetry]=useState(0);
 // A counted pause holds the village player for the entire scene, even muted.
 useEffect(()=>{let release:()=>void=()=>{};const done=new Promise<void>(resolve=>{release=resolve;});void hold.current(async()=>{await done;});return release;},[]);
 useEffect(()=>{
  let alive=true,player:Audio.Sound|null=null,ramp:ReturnType<typeof setInterval>|null=null;
  setError(false);
  if(enabled)void(async()=>{
   await Audio.setAudioModeAsync({playsInSilentModeIOS:true,staysActiveInBackground:false,shouldDuckAndroid:true});
   if(!alive)return;
   const created=await Audio.Sound.createAsync(sounds[scene],{isLooping:true,shouldPlay:false,volume:0});player=created.sound;
   if(!alive){await player.unloadAsync();return;}sound.current=player;
   await player.playAsync();if(!alive)return;
   let step=0;ramp=setInterval(()=>{step++;void player?.setVolumeAsync(target.current*Math.min(1,step/8)).catch(()=>{});if(step>=8&&ramp){clearInterval(ramp);ramp=null;}},80);
  })().catch(()=>{if(alive)setError(true);});
  return()=>{alive=false;if(ramp)clearInterval(ramp);if(sound.current===player)sound.current=null;if(player)void player.unloadAsync().catch(()=>{});};
 },[scene,enabled,retry]);
 useEffect(()=>{void sound.current?.setVolumeAsync(volume).catch(()=>{});},[volume]);
 return {error,retry:()=>setRetry(n=>n+1)};
}
