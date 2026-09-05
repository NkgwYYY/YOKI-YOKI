import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { API_BASE, useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';

export type ItemCategory = 'food' | 'accessory' | 'background' | 'voice';
export interface Item {
  id: string; name: string; category: ItemCategory; cost: number; assetUrl: string;
  posX: number; posY: number; scale: number; isActive: boolean; createdAt: string;
}
export interface ShopState {
  items: Item[]; inventory: string[];
  equipped: { accessory: string | null; background: string | null; voice: string | null };
  points: number;
}

export function resolveItemAssetUrl(assetUrl: string): string {
  if (!assetUrl.startsWith('/')) return assetUrl;
  return `${API_BASE.replace(/\/api$/, '')}${assetUrl}`;
}

const emptyState: ShopState = { items: [], inventory: [], equipped: { accessory: null, background: null, voice: null }, points: 0 };
type ItemContextValue = {
  items: Item[]; shopState: ShopState; loading: boolean; error: string | null;
  adminItems: Item[];
  refreshItems: () => Promise<void>;
  refreshAdminItems: () => Promise<void>;
  buyItem: (itemId: string) => Promise<ShopState>;
  equipItem: (category: Exclude<ItemCategory, 'food'>, itemId: string | null) => Promise<ShopState>;
  saveItem: (item: Partial<Item>) => Promise<void>;
  disableItem: (itemId: string) => Promise<void>;
};
const ItemContext = createContext<ItemContextValue | null>(null);

export function ItemProvider({ children }: { children: React.ReactNode }) {
  const { isSignedIn, getToken } = useAuth();
  const { syncFeedPoints } = useApp();
  const [items, setItems] = useState<Item[]>([]);
  const [adminItems, setAdminItems] = useState<Item[]>([]);
  const [shopState, setShopState] = useState<ShopState>(emptyState);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
    setLoading(true); setError(null);
    try {
      const data = await request('/items', {}, isSignedIn);
      setItems(data.items || []);
      if (data.state) {
        setShopState(data.state);
        await syncFeedPoints(data.state.points);
      }
    } catch (e) { setError(e instanceof Error ? e.message : 'アイテムを読み込めませんでした'); }
    finally { setLoading(false); }
  }, [isSignedIn, request, syncFeedPoints]);
  useEffect(() => { refreshItems(); }, [refreshItems]);
  useEffect(() => { if (!isSignedIn) setShopState(emptyState); else refreshItems(); }, [isSignedIn, refreshItems]);
  const buyItem = useCallback(async (itemId: string) => {
    const data = await request('/shop/buy', { method: 'POST', body: JSON.stringify({ itemId }) }, true);
    setShopState(data.state);
    await syncFeedPoints(data.state.points);
    return data.state;
  }, [request, syncFeedPoints]);
  const equipItem = useCallback(async (category: Exclude<ItemCategory, 'food'>, itemId: string | null) => {
    const data = await request('/character/equip', { method: 'POST', body: JSON.stringify({ category, itemId }) }, true);
    setShopState(data.state); return data.state;
  }, [request]);
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
  return <ItemContext.Provider value={{ items, adminItems, shopState, loading, error, refreshItems, refreshAdminItems, buyItem, equipItem, saveItem, disableItem }}>{children}</ItemContext.Provider>;
}
export function useItems() {
  const value = useContext(ItemContext);
  if (!value) throw new Error('useItems must be used within ItemProvider');
  return value;
}