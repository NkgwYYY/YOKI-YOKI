import React, {createContext, useContext, useEffect, useState} from 'react';
import {usePathname} from 'expo-router';
import {useAppActivity} from '@/components/room/useRoomActivity';
import {useVillageBgm} from '@/components/world/useVillageBgm';

type Music = ReturnType<typeof useVillageBgm>;
const MusicContext = createContext<(Music & {setPaused: (paused: boolean) => void}) | null>(null);

/** One player spans the room and its shop; navigating between them never restarts it. */
export function VillageMusicProvider({children}: {children: React.ReactNode}) {
  const pathname = usePathname(), {active} = useAppActivity();
  const [paused, setPaused] = useState(false);
  const music = useVillageBgm(active && (pathname === '/' || pathname === '/shop' || pathname === '/gifts') && !paused);
  return <MusicContext.Provider value={{...music, setPaused}}>{children}</MusicContext.Provider>;
}
export function useVillageMusic() {
  const music = useContext(MusicContext);
  if (!music) throw Error('VillageMusicProvider is missing');
  return music;
}
export function usePauseVillageMusic(paused: boolean) {
  const {setPaused} = useVillageMusic();
  useEffect(() => {setPaused(paused); return () => setPaused(false);}, [paused, setPaused]);
}
