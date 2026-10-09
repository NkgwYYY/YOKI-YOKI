import {useEffect,useRef,useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Audio} from 'expo-av';
import {CHARACTER_VOICES,VOICE_KEY,type CharacterVoice} from '@/utils/characterVoice';
export function useCharacterVoice(active:boolean){
 const [enabled,setEnabled]=useState(true),[error,setError]=useState('');
 const available=useRef(active),alive=useRef(true),on=useRef(true),last=useRef(0),generation=useRef(0),version=useRef(0);
 const players=useRef(new Map<CharacterVoice,Audio.Sound>());
 available.current=active;
 const stop=()=>{generation.current++;return Promise.allSettled([...players.current.values()].map(sound=>sound.stopAsync()));};
 useEffect(()=>{alive.current=true;const request=version.current;void AsyncStorage.getItem(VOICE_KEY).then(value=>{if(alive.current&&request===version.current){on.current=value!=='off';setEnabled(on.current);}}).catch(()=>{});return()=>{alive.current=false;stop();players.current.forEach(sound=>void sound.unloadAsync());players.current.clear();};},[]);
 useEffect(()=>{if(!active)stop();},[active]);
 const play=(kind:CharacterVoice='greet',force=false)=>{
   if(!available.current||!on.current||(!force&&Date.now()-last.current<650))return;
   last.current=Date.now();const stopped=stop();const request=generation.current;
   void(async()=>{await stopped;if(!alive.current||request!==generation.current)return;let sound=players.current.get(kind);if(!sound){sound=(await Audio.Sound.createAsync(CHARACTER_VOICES[kind],{volume:.36,shouldPlay:false})).sound;if(!alive.current||request!==generation.current){await sound.unloadAsync();return;}players.current.set(kind,sound);}if(available.current&&on.current&&request===generation.current){await sound.replayAsync();if(alive.current)setError('');}})().catch(()=>{if(alive.current)setError('鳴き声を再生できませんでした。');});
 };
 const toggle=()=>{version.current++;const next=!on.current;on.current=next;setEnabled(next);stop();setError('');void AsyncStorage.setItem(VOICE_KEY,next?'on':'off').catch(()=>{if(alive.current)setError('鳴き声の設定を保存できませんでした。');});if(next)play('greet',true);};
 return {enabled,toggle,play,error};
}
