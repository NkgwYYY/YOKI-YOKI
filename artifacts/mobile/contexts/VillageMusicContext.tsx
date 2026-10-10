import React, {createContext, useContext} from 'react';
import {useAppActivity} from '@/components/room/useRoomActivity';
import {useVillageBgm} from '@/components/world/useVillageBgm';

type Music = ReturnType<typeof useVillageBgm>;
const MusicContext = createContext<Music | null>(null);

/** A single persistent player follows every screen, tab and conversation. */
export function VillageMusicProvider({children}: {children: React.ReactNode}) {
  const {active} = useAppActivity();
  const music = useVillageBgm(active);
  return <MusicContext.Provider value={music}>{children}</MusicContext.Provider>;
}
export function useVillageMusic() {
  const music = useContext(MusicContext);
  if (!music) throw Error('VillageMusicProvider is missing');
  return music;
}
