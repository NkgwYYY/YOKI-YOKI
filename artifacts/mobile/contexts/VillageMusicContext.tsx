import React, {createContext, useCallback, useContext, useRef, useState} from 'react';
import {useAppActivity} from '@/components/room/useRoomActivity';
import {useVillageBgm} from '@/components/world/useVillageBgm';

type Music = ReturnType<typeof useVillageBgm> & { withPaused: <T>(operation: () => Promise<T>) => Promise<T>; acquirePause:()=>{ready:Promise<void>;release:()=>void} };
const MusicContext = createContext<Music | null>(null);

/** A single persistent player follows every screen, tab and conversation. */
export function VillageMusicProvider({children}: {children: React.ReactNode}) {
  const {active} = useAppActivity();
  const [pauses,setPauses]=useState(0), count=useRef(0);
  const music = useVillageBgm(active && pauses === 0);
  const latest=useRef(music);latest.current=music;
  const acquirePause=useCallback(()=>{
    count.current++;setPauses(count.current);let released=false;
    const ready=latest.current.pauseTemporarily();
    return {ready,release:()=>{if(released)return;released=true;count.current=Math.max(0,count.current-1);setPauses(count.current);if(count.current===0)latest.current.resumeTemporarily();}};
  },[]);
  const withPaused=async<T,>(operation:()=>Promise<T>)=>{
    count.current++;setPauses(count.current);
    try { await music.pauseTemporarily(); return await operation(); }
    finally { count.current=Math.max(0,count.current-1);setPauses(count.current);if(count.current===0)music.resumeTemporarily(); }
  };
  return <MusicContext.Provider value={{...music,withPaused,acquirePause}}>{children}</MusicContext.Provider>;
}
export function useVillageMusic() {
  const music = useContext(MusicContext);
  if (!music) throw Error('VillageMusicProvider is missing');
  return music;
}
