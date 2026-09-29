import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE, useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { readCatalogCache, readLocalInventory } from '@/utils/itemCache';

/** food is retained only to safely read legacy catalog/inventory records. */
export type ItemCategory = 'food' | 'accessory' | 'background' | 'voice';
export interface Item {
  id: string; name: string; category: ItemCategory; cost: number; assetUrl: string;
  posX: number; posY: number; scale: number; isActive: boolean; createdAt: string;
}
export interface ShopState {
  items: Item[]; inventory: string[];
  equipped: { accessory: string | null; wear: string | null; effect: string | null; decor: string | null; background: string | null; voice: string | null };
  placements: Record<string, { x: number; y: number; scale: number }>;
  points: number;
}
export type EquipmentSlot = 'wear' | 'effect' | 'decor' | 'background' | 'voice';

export function resolveItemAssetUrl(assetUrl: string): string {
  if (!assetUrl.startsWith('/')) return assetUrl;
  return `${API_BASE.replace(/\/api$/, '')}${assetUrl}`;
}

const SHOP_KEY = '@mentore/shop_state_v2';
const CATALOG_KEY = '@yoki/item_catalog_cache_v1';
const emptyState: ShopState = { items: [], inventory: [], equipped: { accessory: null, wear: null, effect: null, decor: null, background: null, voice: null }, placements: {}, points: 0 };
const slotForItem = (item: Item): EquipmentSlot | null => {
  if (item.category === 'food') return null;
  if (item.id.startsWith('catalog-effect-')) return 'effect';
  if (item.id.startsWith('catalog-decor-')) return 'decor';
  if (item.category === 'accessory') return 'wear';
  return item.category;
};
type ItemContextValue = {
  items: Item[]; shopState: ShopState; loading: boolean; error: string | null; catalogOnline: boolean;
  adminItems: Item[];
  refreshItems: () => Promise<void>;
  refreshAdminItems: () => Promise<void>;
  buyItem: (itemId: string) => Promise<ShopState>;
  equipItem: (slot: EquipmentSlot, itemId: string | null) => Promise<ShopState>;
  updateItemPlacement: (itemId: string, placement: { x: number; y: number; scale: number }) => Promise<void>;
  saveItem: (item: Partial<Item>) => Promise<void>;
  disableItem: (itemId: string) => Promise<void>;
};
const ItemContext = createContext<ItemContextValue | null>(null);

export function ItemProvider({ children }: { children: React.ReactNode }) {
  const { isSignedIn, getToken } = useAuth();
  const { feedState, syncFeedPoints, spendFeedPoints, pushDataToCloud, isLoading: appLoading, storageError } = useApp();
  const [items, setItems] = useState<Item[]>([]);
  const [adminItems, setAdminItems] = useState<Item[]>([]);
  const [shopState, setShopState] = useState<ShopState>(emptyState);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [catalogOnline, setCatalogOnline] = useState(false);
  const onlineRef = useRef(false);
  const pointsRef = useRef(feedState.points); pointsRef.current = feedState.points;
  const refreshVersion = useRef(0);
  const refreshAbort = useRef<AbortController | null>(null);
  const loadLocal = useCallback(async () => {
    return readLocalInventory(await AsyncStorage.getItem(SHOP_KEY));
  }, []);
  const persistLocal = useCallback(async (next: Pick<ShopState, 'inventory' | 'equipped' | 'placements'>) => {
    await AsyncStorage.setItem(SHOP_KEY, JSON.stringify(next));
    pushDataToCloud();
  }, [pushDataToCloud]);
  const request = useCallback(async (path: string, init: RequestInit = {}, authenticated = false) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(init.headers as Record<string, string> || {}) };
    if (authenticated) {
      const token = await getToken();
      if (!token) throw new Error('ログインが必要です');
      headers.Authorization = `Bearer ${token}`;
    }
    const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.message || body.error || (res.status === 403 ? '管理者権限が必要です' : '通信に失敗しました'));
    return body;
  }, [getToken]);
  const refreshItems = useCallback(async () => {
    const version = ++refreshVersion.current;
    refreshAbort.current?.abort();
    const controller = new AbortController(); refreshAbort.current = controller;
    onlineRef.current = false; setCatalogOnline(false);
    setLoading(true); setError(null);
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const [local, cached] = await Promise.all([loadLocal(), AsyncStorage.getItem(CATALOG_KEY)]);
      if (version !== refreshVersion.current) return;
      const cachedItems = readCatalogCache(cached);
      if (cachedItems.length) setItems(cachedItems);
      // Ownership is local-first and independent of catalog availability.
      setShopState({ ...emptyState, inventory: local.inventory, equipped: { ...emptyState.equipped, ...local.equipped }, placements: local.placements, points: pointsRef.current });
      setLoading(false);
      const data = await request('/items', { signal: controller.signal }, isSignedIn);
      if (version !== refreshVersion.current) return;
      setItems((data.items || []).filter((item: Item) => item.category !== 'food'));
      // An offline equip action may have completed while this request was in flight.
      const latestLocal = await loadLocal();
      if (version !== refreshVersion.current) return;
      if (data.state) {
        const merged = {
          ...emptyState,
          ...data.state,
          inventory: [...new Set([...(data.state.inventory || []), ...latestLocal.inventory])],
          equipped: { ...emptyState.equipped, ...data.state.equipped, ...latestLocal.equipped },
          placements: latestLocal.placements,
        };
        setShopState(merged);
        // Keep server-owned IDs available on the next offline boot, without caching points.
        await AsyncStorage.setItem(SHOP_KEY, JSON.stringify({ inventory: merged.inventory, equipped: merged.equipped, placements: merged.placements }));
        await syncFeedPoints(data.state.points);
      } else {
        setShopState({ ...emptyState, inventory: latestLocal.inventory, equipped: { ...emptyState.equipped, ...latestLocal.equipped }, placements: latestLocal.placements, points: pointsRef.current });
      }
      if (version !== refreshVersion.current) return;
      onlineRef.current = true; setCatalogOnline(true);
      await AsyncStorage.setItem(CATALOG_KEY, JSON.stringify({ version: 1, items: data.items || [] })).catch(() => {});
    } catch {
      if (version === refreshVersion.current) setError('お店に接続できません。保存済みのアイテムを表示しています。新しい交換は再接続後にできます。');
    } finally { clearTimeout(timeout); if (version === refreshVersion.current) setLoading(false); }
  }, [isSignedIn, loadLocal, request, syncFeedPoints]);
  useEffect(() => {
    if (appLoading || storageError) return;
    refreshItems();
    return () => { refreshVersion.current++; refreshAbort.current?.abort(); };
  }, [appLoading, storageError, refreshItems]);
  useEffect(() => { if (!isSignedIn) setShopState((prev) => ({ ...prev, points: feedState.points })); }, [feedState.points, isSignedIn]);
  const buyItem = useCallback(async (itemId: string) => {
    if (shopState.inventory.includes(itemId)) return shopState;
    if (!onlineRef.current) throw new Error('お店に再接続してから交換してください。');
    if (!isSignedIn) {
      const item = items.find((candidate) => candidate.id === itemId && candidate.isActive && candidate.category !== 'food');
      if (!item) throw new Error('このアイテムは購入できません');
      if (shopState.inventory.includes(itemId)) return shopState;
      if (!(await spendFeedPoints(item.cost))) throw new Error('YOKIポイントが足りません');
      const next = { ...shopState, inventory: [...shopState.inventory, itemId], points: feedState.points - item.cost };
      setShopState(next);
      await persistLocal(next);
      return next;
    }
    const data = await request('/shop/buy', { method: 'POST', body: JSON.stringify({ itemId }) }, true);
    const local = await loadLocal();
    const next = { ...emptyState, ...data.state, inventory: [...new Set([...(data.state.inventory || []), ...(local.inventory || [])])], equipped: { ...emptyState.equipped, ...data.state.equipped, ...local.equipped }, placements: local.placements || {} };
    setShopState(next);
    await syncFeedPoints(data.state.points);
    return next;
  }, [feedState.points, isSignedIn, items, loadLocal, persistLocal, request, shopState, spendFeedPoints, syncFeedPoints]);
  const equipItem = useCallback(async (slot: EquipmentSlot, itemId: string | null) => {
    if (itemId) {
      const item = items.find((candidate) => candidate.id === itemId);
      if (!item || slotForItem(item) !== slot || !shopState.inventory.includes(itemId)) throw new Error('このアイテムは装着できません');
    }
    const next = { ...shopState, equipped: { ...shopState.equipped, [slot]: itemId, ...(slot === 'wear' ? { accessory: itemId } : {}) } };
    await persistLocal(next);
    setShopState(next);
    if (isSignedIn && (slot === 'background' || slot === 'voice')) {
      const data = await request('/character/equip', { method: 'POST', body: JSON.stringify({ category: slot, itemId }) }, true);
      setShopState((prev) => ({ ...prev, points: data.state.points }));
    }
    return next;
  }, [isSignedIn, items, persistLocal, request, shopState]);
  const updateItemPlacement = useCallback(async (itemId: string, placement: { x: number; y: number; scale: number }) => {
    const next = { ...shopState, placements: { ...shopState.placements, [itemId]: placement } };
    await persistLocal(next);
    setShopState(next);
  }, [persistLocal, shopState]);
  const refreshAdminItems = useCallback(async () => {
    const data = await request('/admin/items', {}, true);
    setAdminItems(data.items || []);
  }, [request]);
  const saveItem = useCallback(async (item: Partial<Item>) => {
    await request('/admin/items', { method: 'POST', body: JSON.stringify(item) }, true);
    await Promise.all([refreshItems(), refreshAdminItems()]);
  }, [request, refreshItems, refreshAdminItems]);
  const disableItem = useCallback(async (itemId: string) => {
    await request(`/admin/items/${encodeURIComponent(itemId)}`, { method: 'DELETE' }, true);
    await Promise.all([refreshItems(), refreshAdminItems()]);
  }, [request, refreshItems, refreshAdminItems]);
  return <ItemContext.Provider value={{ items, adminItems, shopState, loading, error, catalogOnline, refreshItems, refreshAdminItems, buyItem, equipItem, updateItemPlacement, saveItem, disableItem }}>{children}</ItemContext.Provider>;
}
export function useItems() {
  const value = useContext(ItemContext);
  if (!value) throw new Error('useItems must be used within ItemProvider');
  return value;
}
