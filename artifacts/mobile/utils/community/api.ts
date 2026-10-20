import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';
import { API_BASE } from '@/contexts/AuthContext';
import type { MascotStage } from '@/utils/mascotUtils';
import type { RoomFurniture, RoomFlower } from '@/contexts/AppContext';
import type { VerifiedBonus } from './bonusLedger';

export type HomeSnapshot = { stage: MascotStage; furniture: RoomFurniture; flower: RoomFlower; robot: boolean };
export type Friend = { id: string; home: HomeSnapshot; visits_enabled: boolean };
export type CommunityMe = { id: string; invite_code: string; visits_enabled: boolean; home: HomeSnapshot; friends: Friend[]; visits: { visitor_id: string; greeting: number; created_at: string; home: HomeSnapshot }[]; blocks: { id: string }[] };
export type CommunityConfig = { enabled: boolean; ads: boolean; passSales: boolean; bonusPoints: number; dailyLimit: number };
export type BonusStatus = { remaining: number; day: string; claims: VerifiedBonus[] };
export const GREETINGS = ['遊びにきたよ！', 'お部屋、すてきだね。', 'また一緒にのんびりしよう。', '今日もおつかれさま。'] as const;
export const communityConfig = () => request<CommunityConfig>('/config');
async function request<T>(path: string, token?: string, method = 'GET', body?: unknown): Promise<T> {
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(`${API_BASE}/community${path}`, { method, signal: controller.signal, headers: { ...(token ? { 'X-Yoki-Device': token } : {}), ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw Error(result.error ?? '通信できませんでした。もう一度お試しください。');
    return result;
  } catch (error) { if ((error as Error).name === 'AbortError') throw Error('通信に時間がかかっています。もう一度お試しください。'); throw error; }
  finally { clearTimeout(timer); }
}
export function createCommunityClient(owner: string) {
  let credential: Promise<string | null> | undefined;
  let registration: Promise<{ id: string; token: string }> | undefined;
  const key = Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, owner).then(digest => `yoki.community.${digest.slice(0, 24)}`);
  const read = () => credential ??= key.then(k => Platform.OS === 'web' ? AsyncStorage.getItem(k) : SecureStore.getItemAsync(k));
  const write = async (token: string) => { const k = await key; if (Platform.OS === 'web') await AsyncStorage.setItem(k, token); else await SecureStore.setItemAsync(k, token); credential = Promise.resolve(token); };
  const identity = async () => {
    if (!registration) registration = (async () => {
      let token = await read();
      if (!token) { token = Array.from(await Crypto.getRandomBytesAsync(32), n => n.toString(16).padStart(2, '0')).join(''); await write(token); }
      const result = await request<{ id: string }>('/device', token, 'POST'); return { ...result, token };
    })().catch(error => { registration = undefined; throw error; });
    return registration;
  };
  return {
    identity,
    exists: async () => !!await read(),
    call: async <T>(path: string, method = 'GET', body?: unknown): Promise<T> => { const { token } = await identity(); return request(path, token, method, body); },
    forget: async () => { const k = await key; if (Platform.OS === 'web') await AsyncStorage.removeItem(k); else await SecureStore.deleteItemAsync(k); credential = undefined; registration = undefined; },
  };
}
export type CommunityClient = ReturnType<typeof createCommunityClient>;
