import React, {createContext, useContext, useEffect, useMemo, useRef, useSyncExternalStore} from 'react';
import {AppState} from 'react-native';
import * as Crypto from 'expo-crypto';
import {useAuth} from './AuthContext';
import {useApp} from './AppContext';
import {useCommunity} from './CommunityContext';
import {useVillageMusic} from './VillageMusicContext';
import {DailyAdProvider} from '@/components/ads/DailyAdPlacements';
import {CommunityBanner} from '@/components/ads/CommunityBanner';
import {createDailyAds, type Reservation} from '@/utils/community/dailyAds';
import {canBuyPass, canShowBannerAd, canShowRewardedAd, showRewardedAd} from '@/utils/community/commerce';

const Context = createContext<ReturnType<typeof createDailyAds> | null>(null);
export function ConnectedDailyAds({children}: {children: React.ReactNode}) {
  const community = useCommunity(), app = useApp(), music = useVillageMusic(), {user} = useAuth();
  const client = community.client;
  const session = useMemo(() => ({client, key: Crypto.randomUUID()}), [client]);
  const current = useRef(session); current.current = session;
  const latest = useRef({community, app, music, user}); latest.current = {community, app, music, user};
  const service = useMemo(() => createDailyAds({
    sessionKey: session.key,
    current: () => current.current === session,
    eligibility: () => {
      const {app: a, community: c, user: u} = latest.current;
      const adult = ['20代','30代','40代','50代','60代','70代以上'].includes(a.profile?.ageRange ?? '');
      const ready = !!c.config?.enabled && !a.isLoading && !a.storageError && !a.isCloudSyncing && (!u || a.cloudSynced);
      return {ready, rewarded: !!c.config?.ads && adult && canShowRewardedAd(),
        banner: !!c.config?.ads && adult && canShowBannerAd(), pass: canBuyPass()};
    },
    collect: () => latest.current.community.collect(),
    pass: async () => (await client.call<{active: boolean}>('/pass')).active === true,
    reserve: (receipt, mode) => client.call<Reservation>('/bonus/reserve', 'POST', {receipt, mode}),
    present: reservation => latest.current.music.withPaused(() => showRewardedAd(reservation,
      latest.current.community.metric,
      estimate => { void client.call(`/bonus/${reservation.id}/revenue`, 'POST', estimate).catch(() => {}); },
      () => current.current === session)),
    credited: id => latest.current.app.feedState.communityBonuses?.includes(id) === true,
    uuid: () => Crypto.randomUUID(), pause: ms => new Promise(resolve => setTimeout(resolve, ms)),
  }), [session, client]);
  const binding = useMemo(() => ({...service, onBannerError: service.bannerError, renderBanner: () => <CommunityBanner onError={service.bannerError}/>}), [service]);
  useEffect(() => {
    const refresh = () => { if (AppState.currentState === 'active') void service.refresh(); };
    refresh();
    const timer = setInterval(refresh, 30_000);
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') { refresh(); void community.reloadConfig().catch(() => {}); } });
    return () => { clearInterval(timer); subscription.remove(); };
  }, [service, community.config, app.isLoading, app.isCloudSyncing, app.cloudSynced, app.storageError, app.profile?.ageRange]);
  return <Context.Provider value={service}><DailyAdProvider binding={binding}>{children}</DailyAdProvider></Context.Provider>;
}
export function useDailyRewardService() {
  const service = useContext(Context);
  if (!service) throw Error('ConnectedDailyAds missing');
  const snapshot = useSyncExternalStore(service.subscribe, service.getSnapshot, service.getSnapshot);
  return {service, snapshot};
}
