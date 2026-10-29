import {useEffect,useRef,useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Asset} from 'expo-asset';
import {CHARACTER_VOICES,VOICE_KEY,type CharacterVoice} from '@/utils/characterVoice';
import {allowCharacterVoice,type VoiceMoment} from '@/utils/voicePacing';
export function useCharacterVoice(active:boolean){
 const [enabled,setEnabled]=useState(true),[error,setError]=useState('');
 const available=useRef(active),on=useRef(true),last=useRef(-Infinity),version=useRef(0),ready=useRef(false),generation=useRef(0);
 const pendingWelcome=useRef(0);
 const players=useRef(new Map<CharacterVoice,HTMLAudioElement>());
 available.current=active;
 const stop=()=>{generation.current++;pendingWelcome.current=0;players.current.forEach(player=>{player.pause();player.currentTime=0;});};
 useEffect(()=>{const request=version.current;let alive=true;void AsyncStorage.getItem(VOICE_KEY).then(value=>{if(alive&&request===version.current){on.current=value!=='off';setEnabled(on.current);}if(alive)ready.current=true;}).catch(()=>{if(alive)ready.current=true;});return()=>{alive=false;stop();players.current.forEach(p=>p.remove());players.current.clear();};},[]);
 useEffect(()=>{if(!active)stop();},[active]);
 useEffect(()=>{const hide=()=>{if(document.hidden)stop();};document.addEventListener('visibilitychange',hide);return()=>document.removeEventListener('visibilitychange',hide);},[]);
 const play=(kind:CharacterVoice='greet',moment:VoiceMoment='event')=>{
   if(!available.current||!on.current||document.hidden||(kind==='welcome'&&!ready.current))return;
   const now=Date.now();
   if(!allowCharacterVoice(last.current,now,moment,Math.random()))return;
   last.current=now;stop();
   const request=generation.current;
   let player=players.current.get(kind);
   if(!player){player=document.createElement('audio');player.src=Asset.fromModule(CHARACTER_VOICES[kind]).uri;player.preload='none';player.volume=.36;player.dataset.testid=`character-voice-${kind}`;document.body.appendChild(player);players.current.set(kind,player);}
   // Called directly in the user's interaction, including Safari's audio gesture.
   void player.play().then(()=>{if(request===generation.current)setError('');}).catch(error=>{
     if(request!==generation.current)return;
     if(kind==='welcome'){
       // A first Safari visit may require a touch. Retry only during this welcome.
       if(error?.name==='NotAllowedError')pendingWelcome.current=Date.now()+4000;
       return;
     }
     setError('鳴き声を流すには、もう一度キャラにふれてね。');
   });
 };
 useEffect(()=>{
   const unlock=()=>{if(pendingWelcome.current>Date.now())play('welcome','preview');};
   document.addEventListener('pointerdown',unlock);document.addEventListener('keydown',unlock);
   return()=>{document.removeEventListener('pointerdown',unlock);document.removeEventListener('keydown',unlock);};
 },[]);
 const toggle=()=>{version.current++;const next=!on.current;on.current=next;setEnabled(next);stop();setError('');void AsyncStorage.setItem(VOICE_KEY,next?'on':'off').catch(()=>setError('鳴き声の設定を保存できませんでした。'));if(next)play('greet','preview');};
 return {enabled,toggle,play,error};
}
