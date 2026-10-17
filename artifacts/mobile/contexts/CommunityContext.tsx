import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import * as Crypto from 'expo-crypto';
import { useApp } from './AppContext';
import { useAuth } from './AuthContext';
import { getMascotStage } from '@/utils/mascotUtils';
import { communityConfig, createCommunityClient, type CommunityClient, type CommunityConfig, type BonusStatus } from '@/utils/community/api';
import { createBonusCollector } from '@/utils/community/collectBonus';
import type { CollectedBonus } from '@/utils/community/dailyAds';
type Community = { client: CommunityClient; config: CommunityConfig | null; reloadConfig: () => Promise<void>; collect: () => Promise<CollectedBonus>; metric: (event: string, durationMs?: number) => void };
const Context = createContext<Community | null>(null);
export function CommunityProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth(), { receiveCommunityBonus, isLoading, cloudSynced, storageError, progress, roomCustomization, feedState } = useApp();
  const owner = user?.id ?? 'guest', client = useMemo(() => createCommunityClient(owner), [owner]);
  const current = useRef(client); current.current = client;
  const [config, setConfig] = useState<CommunityConfig | null>(null);
  const reloadConfig = useCallback(async () => { setConfig(await communityConfig()); }, []);
  const latest = useRef({receiveCommunityBonus, ready: false});
  latest.current = {receiveCommunityBonus, ready: !isLoading && !storageError && (!user || cloudSynced)};
  const collect = useMemo(() => createBonusCollector({
    current: () => current.current === client,
    ready: () => latest.current.ready,
    status: () => client.call<BonusStatus>('/bonus'),
    grant: (claim, isCurrent) => latest.current.receiveCommunityBonus(claim, isCurrent),
    acknowledge: id => client.call(`/bonus/${id}/ack`, 'POST'),
  }), [client]);
  const metric = useCallback((event: string, durationMs?: number) => {
    // No free-form properties, profile, journal text, health scores, or ad identifiers.
    void client.exists().then(exists => exists ? client.call('/metrics', 'POST', { id: Crypto.randomUUID(), event, durationMs }) : undefined).catch(() => {});
  }, [client]);
  useEffect(() => { void reloadConfig().catch(() => {}); }, [reloadConfig]);
  const snapshot = JSON.stringify({stage:getMascotStage(progress.level),furniture:roomCustomization.furniture,flower:roomCustomization.flower,robot:feedState.housekeeping?.robotPlaced===true});
  useEffect(() => {
    if (!config?.enabled || isLoading || storageError || (user && !cloudSynced)) return;
    const timer = setTimeout(() => { void client.exists().then(exists => exists ? client.call('/home','PATCH',{home:JSON.parse(snapshot)}) : undefined).catch(()=>{}); }, 1500);
    return () => clearTimeout(timer);
  }, [snapshot, client, config?.enabled, isLoading, storageError, user, cloudSynced]);
  useEffect(() => {
    const recover = () => { if (config?.enabled) void client.exists().then(exists => exists ? collect() : undefined).catch(() => {}); };
    recover(); const sub = AppState.addEventListener('change', state => { if (state === 'active') recover(); }); return () => sub.remove();
  }, [client, config?.enabled, collect]);
  return <Context.Provider value={{ client, config, reloadConfig, collect, metric }}>{children}</Context.Provider>;
}
export function useCommunity() { const value = useContext(Context); if (!value) throw Error('CommunityProvider missing'); return value; }
