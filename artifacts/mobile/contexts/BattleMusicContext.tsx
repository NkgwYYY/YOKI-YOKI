import React,{createContext,useCallback,useContext,useEffect,useRef,useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Audio} from 'expo-av';
import {useAppActivity} from '@/components/room/useRoomActivity';
import {useVillageMusic} from './VillageMusicContext';
export type BattleTrack='encounter'|'battle'|'victory';
const SOURCES={encounter:require('@/assets/moyamoya/encounter.wav'),battle:require('@/assets/moyamoya/battle.wav'),victory:require('@/assets/moyamoya/victory.wav')};
const KEY='@yoki/battle_music_v1';
type Music={enabled:boolean;volume:number;error:string;toggle:()=>void;setVolume:(n:number)=>void;claim:(track:BattleTrack|null)=>()=>void};
const Context=createContext<Music|null>(null);

/** One serialized audio owner. Late loads cannot play after blur/background/mute. */
export function BattleMusicProvider({children}:{children:React.ReactNode}){
 const [enabled,setEnabled]=useState(false),[volume,setVolumeState]=useState(.35),[ready,setReady]=useState(false),[error,setError]=useState('');
 const [scene,setScene]=useState<{id:symbol;track:BattleTrack|null}|null>(null);
 const {active}=useAppActivity(),{acquirePause}=useVillageMusic();
 const queue=useRef(Promise.resolve()),player=useRef<Audio.Sound|null>(null),generation=useRef(0),touched=useRef(false),alive=useRef(true);
 useEffect(()=>{alive.current=true;void AsyncStorage.getItem(KEY).then(raw=>{if(!alive.current)return;if(raw&&!touched.current){const p=JSON.parse(raw);setEnabled(p.enabled===true);if(Number.isFinite(p.volume))setVolumeState(Math.max(0,Math.min(1,p.volume)));}}).catch(()=>{}).finally(()=>{if(alive.current)setReady(true);});return()=>{alive.current=false;};},[]);
 const claim=useCallback((track:BattleTrack|null)=>{const id=Symbol();setScene({id,track});return()=>setScene(current=>current?.id===id?null:current);},[]);
 useEffect(()=>{
  const id=++generation.current,lease=scene?acquirePause():null;
  queue.current=queue.current.catch(()=>{}).then(async()=>{
   if(player.current){const old=player.current;player.current=null;await old.unloadAsync();}
   await lease?.ready;
   if(id!==generation.current||!ready||!enabled||!active||!scene?.track)return;
   await Audio.setAudioModeAsync({playsInSilentModeIOS:false,staysActiveInBackground:false,shouldDuckAndroid:true});
   const created=await Audio.Sound.createAsync(SOURCES[scene.track],{shouldPlay:false,isLooping:scene.track==='battle',volume});
   if(id!==generation.current){await created.sound.unloadAsync();return;}
   player.current=created.sound;await created.sound.playAsync();if(alive.current)setError('');
  }).catch(()=>{if(alive.current&&id===generation.current)setError('BGMを再生できませんでした。ゲームはそのまま続けられます。');});
  return()=>{generation.current++;queue.current=queue.current.catch(()=>{}).then(async()=>{if(player.current){const old=player.current;player.current=null;await old.unloadAsync().catch(()=>{});}lease?.release();});};
 },[scene,enabled,volume,ready,active,acquirePause]);
 const persist=(nextEnabled:boolean,nextVolume:number)=>{touched.current=true;setReady(true);void AsyncStorage.setItem(KEY,JSON.stringify({enabled:nextEnabled,volume:nextVolume})).catch(()=>{setError('音の設定を保存できませんでした。');});};
 const toggle=()=>{setEnabled(!enabled);persist(!enabled,volume);};
 const setVolume=(n:number)=>{const value=Math.max(0,Math.min(1,n));setVolumeState(value);persist(enabled,value);};
 return <Context.Provider value={{enabled,volume,error,toggle,setVolume,claim}}>{children}</Context.Provider>;
}
export function useBattleAudio(){const music=useContext(Context);if(!music)throw Error('BattleMusicProvider is missing');return music;}
export function useBattleTrack(track:BattleTrack|null,active:boolean){const {claim}=useBattleAudio();useEffect(()=>{if(active)return claim(track);},[claim,track,active]);}
