import { privateCacheStorage } from '@/utils/privateCacheStorage';
import type { PrivateCache } from '@/utils/privateCache';
import { APP_STORAGE_KEYS as KEYS } from '@/utils/appStorageKeys';
import { createCloudOutbox } from '@/utils/cloudOutbox';
import { subscribeAccountDeletion } from '@/utils/accountDeletion';
import { createAccountOwnership, encodeDataOwner, LOCAL_DATA_OWNER_KEY } from '@/utils/accountOwnership';
import { createCloudSyncSession, createCloudSyncTransport, INITIAL_CLOUD_SYNC_STATE, type CloudSyncState } from '@/utils/cloudSync';
import { mergeEncounterHistory } from '@/utils/mergeEncounters';
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { AppState } from 'react-native';
import { balanceStorage as AsyncStorage } from '@/utils/balanceStorage';
import { claimGardenReward } from '@/utils/gardenReward';
import { prepareItemPurchase } from '@/utils/itemPurchase';
import { prepareRhythmReward } from '@/utils/rhythmReward';
import { prepareDailyRecord } from '@/utils/dailyRecordTransaction';
import { prepareChecklist, type ChecklistOperation } from '@/utils/checklistTransaction';
import { prepareRoomOperation, COMPANION_PRICE, type RoomOperation } from '@/utils/roomPurchase';
import * as Haptics from 'expo-haptics';
import { DEFAULT_CHECKLIST_ITEMS, ChecklistItemDef, ChecklistCategory } from '@/data/defaultChecklist';
import { BADGE_DEFINITIONS } from '@/data/badges';
import { getTodayDate, getYesterdayDate } from '@/utils/dateUtils';
import {
  FOOD_ITEMS,
  FP_PER_CHECKLIST_ITEM,
  FP_PER_FULL_DAY_BONUS,
  FP_PER_MOOD_RECORD,
  SATIETY_DECAY_PER_HOUR,
} from '@/data/foodItems';
import { useAuth, API_BASE } from './AuthContext';
import { Analytics } from '@/utils/analytics';
import {
  GrowthRecord,
  createGrowthRecord,
  applyGrowth,
  applyPlayGrowth,
} from '@/utils/growth';
import {
  MiniGameState,
  DEFAULT_MINI_GAME_STATE,
  resolveMiniGameState,
  GameSlot,
  MAX_PLAYS_PER_SLOT,
} from '@/utils/miniGameUtils';
import {
  LightEnergyState,
  createLightEnergyState,
  resolveLightEnergyState,
  applyElapsedEnergy,
} from '@/utils/lightEnergy';
import {
  PowerPlantState,
  createPowerPlantState,
  resolvePowerPlantState,
  nextTownItem,
  TownItem,
  ECO_POINTS_PER_ENERGY,
} from '@/utils/powerPlant';

export type { PowerPlantState };
import {
  EncountersState,
  createEncountersState,
  resolveEncountersState,
  syncEncounters,
} from '@/utils/encounters';
import type { CharacterKey } from '@/utils/mascotUtils';
import {
  clearHomeCommentCache,
  DEFAULT_HOME_COMMENT_PREFERENCES,
  resolveHomeCommentPreferences,
  type HomeCommentPreferences,
} from '@/utils/homeComment';

export type { EncountersState };

export type { LightEnergyState };

export type { MiniGameState, GameSlot };

export interface DailyRecord {
  id: string;
  date: string;
  mood: number;
  sleep: number;
  /** false for a basic mood-only entry; missing means an existing detailed record. */
  sleepRecorded?: boolean;
  behaviors: string[];
  notes: string;
  // Life-condition extras (optional; added later, older records won't have them)
  exercise?: number; // 1=なし 2=軽め 3=しっかり
  meal?: number;     // 1=乱れた 2=ふつう 3=整ってた
  social?: number;   // 1=しんどい 2=ふつう 3=温かい
  win?: string;      // 今日の小さな成功(1行)
  /** 活動カウント(読書・運動など。タップで+1) */
  activities?: Record<string, number>;
}

export interface UserProfile {
  nickname: string;
  ageRange: string;   // '10代' | '20代' | ... | '70代以上' | '回答しない'
  gender: string;     // '男性' | '女性' | 'その他' | '回答しない'
  goal?: string;      // 今の目標
  mbti?: string;      // 例: 'INTP'
  bloodType?: string; // 'A' | 'B' | 'O' | 'AB'
  occupation?: string;
  concerns?: string[]; // 悩み(仕事・恋愛・健康など)
}

export interface RecordExtras {
  sleepRecorded?: boolean;
  exercise?: number;
  meal?: number;
  social?: number;
  win?: string;
  activities?: Record<string, number>;
}

export interface CheckedItem {
  id: string;
  checked: boolean;
  xpEarned: boolean;
}

export interface CheckedState {
  date: string;
  items: CheckedItem[];
  bonusEarned: boolean;
  /** Daily receipts retained even when a checked item is removed or the list is reset. */
  earnedItemIds?: string[];
}

export interface UserProgress {
  level: number;
  experience: number;
  mentalMuscle: number;
  streak: number;
  totalDays: number;
  lastRecordDate: string;
}

export interface UnlockedBadge {
  id: string;
  unlockedAt: string;
}

export interface FeedState {
  points: number;
  lastFeedTime: string;
  satietyAtFeed: number;
}

export type RoomFurniture = 'none' | 'sofa' | 'vanity' | 'bookshelf';
export type RoomFlower = 'none' | 'pink' | 'violet' | 'rainbow';
export type RoomItemKind = 'furniture' | 'flower';

export interface RoomCustomization {
  furniture: RoomFurniture;
  flower: RoomFlower;
  ownedFurniture: RoomFurniture[];
  ownedFlowers: RoomFlower[];
}

export interface CompanionState {
  extraEggs: number;
}

export const EGG_COMPANION_COST = COMPANION_PRICE;

/** Compute current satiety based on elapsed time since last feed */
export function computeCurrentSatiety(feedState: FeedState): number {
  if (!feedState.lastFeedTime) return 50;
  const hoursElapsed = (Date.now() - new Date(feedState.lastFeedTime).getTime()) / 3_600_000;
  return Math.max(0, Math.round(feedState.satietyAtFeed - hoursElapsed * SATIETY_DECAY_PER_HOUR));
}

/** Compute hours since last app open */
export function computeInactivityHours(lastOpenedAt: string): number {
  if (!lastOpenedAt) return 0;
  return (Date.now() - new Date(lastOpenedAt).getTime()) / 3_600_000;
}

interface AppContextType {
  privateCache: PrivateCache | null;
  progress: UserProgress;
  records: DailyRecord[];
  checkedState: CheckedState;
  checklistItems: ChecklistItemDef[];
  unlockedBadges: UnlockedBadge[];
  isLoading: boolean;
  newlyUnlockedBadge: string | null;
  mascotName: string;
  feedState: FeedState;
  /** サーバーで確定したショップ購入後のポイント残高を端末側にも同期する */
  syncFeedPoints: (points: number) => Promise<void>;
  /** 端末側ポイントを不足チェック付きで減算する */
  spendFeedPoints: (points: number) => Promise<boolean>;
  purchaseGuestItem: (itemId: string, cost: number) => Promise<ReturnType<typeof prepareItemPurchase>['result']>;
  currentSatiety: number;
  inactivityHours: number;
  miniGameState: MiniGameState;
  profile: UserProfile | null;
  homeCommentPreferences: HomeCommentPreferences;
  /** True once the post-login cloud pull has finished (safe to decide onboarding) */
  cloudSynced: boolean;
  cloudSyncState: CloudSyncState;
  /** True while signed-in account data is being downloaded or uploaded */
  isCloudSyncing: boolean;
  /** Retry the failed direction: initial download or latest local upload. */
  retryCloudSync: () => void;
  saveProfile: (profile: UserProfile) => Promise<void>;
  saveHomeCommentPreferences: (preferences: HomeCommentPreferences) => Promise<void>;
  clearNewBadge: () => void;
  toggleCheckItem: (id: string) => Promise<void>;
  addChecklistItem: (text: string, category: ChecklistCategory) => Promise<void>;
  removeChecklistItem: (id: string) => Promise<void>;
  resetChecklistToDefaults: () => Promise<void>;
  saveRecord: (mood: number, sleep: number, behaviors: string[], notes: string, extras?: RecordExtras) => Promise<void>;
  getTodayRecord: () => DailyRecord | undefined;
  getCompletedCount: () => number;
  getTotalCheckCount: () => number;
  setMascotName: (name: string) => Promise<void>;
  feedMascot: (foodId: string) => Promise<{ success: boolean; message: string; newSatiety: number }>;
  completeMiniGame: (slot: GameSlot, reward: { fp: number; stars?: number }, playId: string) => Promise<number>;
  /** キャラクターのエネルギー(元気・光の力・チャージ量)の現在の状態 */
  lightEnergy: LightEnergyState;
  storageError: string | null;
  retryStorageRecovery: () => Promise<void>;
  receiveGardenReward: () => Promise<{ received: number }>;
  /** 直近の「ユーザー操作による」光エネルギー獲得イベント(循環演出用)。
   *  クラウド同期・読込では発火しない。seq は毎回増える識別子 */
  lightGainEvent: { amount: number; seq: number } | null;
  /** モーダル表示中は循環演出を保留する(true=保留開始 / false=解除。解除時に保留分を再生) */
  holdLightFlow: (hold: boolean) => void;
  /** エネルギー変換(ポイント・変換履歴・街の発展)の状態 */
  powerPlant: PowerPlantState;
  /** 蓄電エネルギーを全て変換してポイントにする */
  convertStoredEnergy: () => Promise<{ converted: number; gained: number }>;
  /** 後方互換用エイリアス */
  sellEnergy: () => Promise<{ sold: number; gained: number }>;
  /** エコポイントを使って次の街アイテムを建てる */
  buildTownItem: () => Promise<{ built?: TownItem; reason?: 'no_more' | 'not_enough' }>;
  /** 交換待ちポイント(旧エコポイント)をYOKIポイントに受け取る(1:1) */
  exchangeEcoPoints: (amount: number) => Promise<{ exchanged: number }>;
  roomCustomization: RoomCustomization;
  /** 家具や花を選択する(購入済みアイテムのみ) */
  selectRoomItem: (kind: RoomItemKind, id: RoomFurniture | RoomFlower) => Promise<boolean>;
  /** 家具や花をポイントで購入する */
  buyRoomItem: (kind: RoomItemKind, id: RoomFurniture | RoomFlower, cost: number) => Promise<{ success: boolean; reason?: 'already_owned' | 'not_enough' | 'invalid' }>;
  companionState: CompanionState;
  /** YOKIポイントで追加のたまごを仲間にする */
  buyEggCompanion: () => Promise<{ success: boolean; reason?: 'already_owned' | 'not_enough' }>;
  /** 出会い記録(キャラクター図鑑)。出会ったキャラだけが入る */
  encounters: EncountersState;
  /** 「新しい仲間が生まれました!」演出の待ち行列(先頭から表示) */
  newEncounters: CharacterKey[];
  /** 演出を1件閉じる */
  dismissNewEncounter: () => void;
  pushDataToCloud: () => Promise<void>;
  /** サイズ成長(Level/Evolutionとは独立)。マスコットは進化しても同一個体として成長を引き継ぐ */
  growth: GrowthRecord;
  /** 成長表示を見たことを記録(控えめメッセージ用) */
  markGrowthSeen: () => Promise<void>;
}

const defaultProgress: UserProgress = {
  level: 1,
  experience: 0,
  mentalMuscle: 0,
  streak: 0,
  totalDays: 0,
  lastRecordDate: '',
};

const defaultFeedState: FeedState = {
  points: 0,
  lastFeedTime: '',
  satietyAtFeed: 50,
};

const defaultRoomCustomization: RoomCustomization = {
  furniture: 'none',
  flower: 'none',
  ownedFurniture: [],
  ownedFlowers: [],
};

const defaultCompanionState: CompanionState = { extraEggs: 0 };

const AppContext = createContext<AppContextType | null>(null);
const cloudOutbox = createCloudOutbox(AsyncStorage);
const accountOwnership = createAccountOwnership(AsyncStorage, Object.values(KEYS));

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { isSignedIn, getToken, user, isLoading: authLoading } = useAuth();
  const accountId = isSignedIn ? user?.id ?? null : null;
  const accountIdRef = useRef(accountId);
  accountIdRef.current = accountId;
  const identityRef = useRef({ accountId, authLoading });
  if (identityRef.current.accountId !== accountId || identityRef.current.authLoading !== authLoading) {
    identityRef.current = { accountId, authLoading };
  }
  const identity = identityRef.current;
  const [privateScope, setPrivateScope] = useState<PrivateCache | null>(null);
  const getTokenRef = useRef(getToken);
  useEffect(() => { getTokenRef.current = getToken; }, [getToken]);

  const [progress, setProgress] = useState<UserProgress>(defaultProgress);
  const [records, setRecords] = useState<DailyRecord[]>([]);
  const [checkedState, setCheckedState] = useState<CheckedState>({ date: '', items: [], bonusEarned: false });
  const [checklistItems, setChecklistItems] = useState<ChecklistItemDef[]>(DEFAULT_CHECKLIST_ITEMS);
  const [unlockedBadges, setUnlockedBadges] = useState<UnlockedBadge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [localScope, setLocalScope] = useState<{ accountId: string | null; ready: boolean } | null>(null);
  const [scopeRetry, setScopeRetry] = useState(0);
  const scopeCurrent = !authLoading && localScope?.accountId === accountId;
  const localScopeReady = scopeCurrent && localScope?.ready === true;
  const appLoading = isLoading || !scopeCurrent;
  const [newlyUnlockedBadge, setNewlyUnlockedBadge] = useState<string | null>(null);
  const [mascotName, setMascotNameState] = useState('');
  const [feedState, setFeedState] = useState<FeedState>(defaultFeedState);
  const [inactivityHours, setInactivityHours] = useState(0);
  const [miniGameState, setMiniGameState] = useState<MiniGameState>(DEFAULT_MINI_GAME_STATE);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [homeCommentPreferences, setHomeCommentPreferences] =
    useState<HomeCommentPreferences>(DEFAULT_HOME_COMMENT_PREFERENCES);
  const [cloudSyncState, setCloudSyncState] = useState<CloudSyncState>(INITIAL_CLOUD_SYNC_STATE);
  const cloudSyncAccountRef = useRef<string | null>(null);
  const cloudSynced = localScopeReady && cloudSyncState.ready && accountId !== null && cloudSyncAccountRef.current === accountId;
  const isCloudSyncing = cloudSyncState.phase !== 'idle';
  const cloudSessionRef = useRef<ReturnType<typeof createCloudSyncSession> | null>(null);
  const deletingAccountRef = useRef<string | null>(null);
  const [deletionPaused, setDeletionPaused] = useState(false);
  const [syncRestart, setSyncRestart] = useState(0);
  useEffect(() => subscribeAccountDeletion(event => {
    if (event.accountId !== accountIdRef.current) return;
    if (event.phase === 'start') {
      deletingAccountRef.current = event.accountId;
      cloudSessionRef.current?.dispose();
      cloudSessionRef.current = null;
      setDeletionPaused(true);
    } else if (event.serverDeleted) {
      // Local cleanup or identity deletion can fail after server deletion. Keep
      // the account closed and offer completion retry instead of fresh onboarding.
      setCloudSyncState({ ready: false, phase: 'idle', error: 'deleted' });
    } else {
      deletingAccountRef.current = null;
      setDeletionPaused(false);
      setCloudSyncState(INITIAL_CLOUD_SYNC_STATE);
      setSyncRestart(value => value + 1);
    }
  }), []);
  useEffect(() => {
    if (deletingAccountRef.current !== accountId) {
      deletingAccountRef.current = null;
      setDeletionPaused(false);
    }
  }, [accountId]);
  // マスコットは進化しても同一個体なので characterId は固定 'mascot'
  const [growth, setGrowth] = useState<GrowthRecord>(() => createGrowthRecord('mascot'));
  const [lightEnergy, setLightEnergy] = useState<LightEnergyState>(() => createLightEnergyState(getTodayDate()));
  const [storageError, setStorageError] = useState<string | null>(null);
  const dataReady = !deletionPaused && !appLoading && !storageError && localScopeReady && (!isSignedIn || cloudSynced);
  const privateCache = dataReady && privateScope?.isCurrent() ? privateScope : null;
  const feedStateRef = useRef<FeedState>(defaultFeedState);
  // 非同期処理の並走でも付与が失われないよう、最新値を ref でも保持する
  const lightEnergyRef = useRef(lightEnergy);
  useEffect(() => { lightEnergyRef.current = lightEnergy; }, [lightEnergy]);
  const [powerPlant, setPowerPlant] = useState<PowerPlantState>(() => createPowerPlantState());
  const powerPlantRef = useRef(powerPlant);
  useEffect(() => { powerPlantRef.current = powerPlant; }, [powerPlant]);
  // 出会い記録(キャラクター図鑑)。newEncounters は「新しい仲間」演出の待ち行列
  const [encounters, setEncounters] = useState<EncountersState>(() => createEncountersState());
  const encountersRef = useRef(encounters);
  useEffect(() => { encountersRef.current = encounters; }, [encounters]);
  const [newEncounters, setNewEncounters] = useState<CharacterKey[]>([]);
  const encountersLoadedRef = useRef(false);
  const [roomCustomization, setRoomCustomization] = useState<RoomCustomization>(defaultRoomCustomization);
  const [companionState, setCompanionState] = useState<CompanionState>(defaultCompanionState);

  type Balances = { energy: LightEnergyState; plant: PowerPlantState; feed: FeedState };
  const updateBalances = useCallback(async <T,>(change: (state: Balances) => { state: Balances; result: T }): Promise<T> => {
    const saved = await AsyncStorage.transaction(values => {
      const parse = (key: string) => values[key] === null ? null : JSON.parse(values[key]!);
      const state: Balances = {
        energy: resolveLightEnergyState(parse(KEYS.LIGHT_ENERGY), getTodayDate()),
        plant: resolvePowerPlantState(parse(KEYS.POWER_PLANT)),
        feed: parse(KEYS.FEED_STATE) ?? defaultFeedState,
      };
      const next = change(state);
      const entries: [string, string][] = [
        [KEYS.LIGHT_ENERGY, JSON.stringify(next.state.energy)],
        [KEYS.POWER_PLANT, JSON.stringify(next.state.plant)],
        [KEYS.FEED_STATE, JSON.stringify(next.state.feed)],
      ];
      return { entries: entries.filter(([key, value]) => values[key] !== value), result: next };
    });
    lightEnergyRef.current = saved.state.energy; setLightEnergy(saved.state.energy);
    powerPlantRef.current = saved.state.plant; setPowerPlant(saved.state.plant);
    feedStateRef.current = saved.state.feed; setFeedState(saved.state.feed);
    return saved.result;
  }, []);

  /** 時間経過ぶんの自然なエネルギーチャージを精算する。読込・復帰・定期更新のすべてで共通利用する */
  const settleElapsedEnergy = useCallback(() => updateBalances(state => {
    const energy = applyElapsedEnergy(state.energy, getTodayDate());
    return { state: { ...state, energy }, result: energy };
  }), [updateBalances]);

  // アプリを開いたまま日付が変わっても日次値(元気・光の力・今日のエネルギー)が
  // 前日のまま表示されないよう、1分ごとに日付ロールオーバーとチャージを精算する
  useEffect(() => {
    const timer = setInterval(() => {
      if (dataReady) settleElapsedEnergy().catch(() => {});
    }, 60_000);
    return () => clearInterval(timer);
  }, [settleElapsedEnergy, dataReady]);

  // バックグラウンドから戻った瞬間にも、閉じていた時間のチャージ分を反映する
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && dataReady) settleElapsedEnergy().catch(() => {});
    });
    return () => subscription.remove();
  }, [settleElapsedEnergy, dataReady]);

  // ユーザー操作による獲得イベント(循環演出はこれだけを根拠に発火する。
  // クラウドpullや読込による数値変動では発火しない)
  const [lightGainEvent, setLightGainEvent] = useState<{ amount: number; seq: number } | null>(null);
  const gainSeqRef = useRef(0);
  // 1操作で複数の付与が連続する場合(メモ付き記録・全チェックボーナス等)は
  // 短い窓で合算して1イベントにする(バナーの +量 を実際の合計と一致させる)
  const pendingGainRef = useRef(0);
  const gainFlushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (gainFlushTimerRef.current) clearTimeout(gainFlushTimerRef.current);
  }, []);
  // ゲーム等のフルスクリーンモーダル表示中は演出ホスト(タブレイアウト直下)が
  // モーダルの背面に隠れるため、閉じるまでイベントの発行を保留する
  const flowHoldRef = useRef(0);
  const flushGainEvent = useCallback(() => {
    if (flowHoldRef.current > 0) return; // 保留中。解除時に再度呼ばれる
    const amount = pendingGainRef.current;
    pendingGainRef.current = 0;
    if (amount > 0) setLightGainEvent({ amount, seq: ++gainSeqRef.current });
  }, []);
  const queueGainEvent = useCallback((gained: number) => {
    pendingGainRef.current += gained;
    if (gainFlushTimerRef.current) clearTimeout(gainFlushTimerRef.current);
    gainFlushTimerRef.current = setTimeout(() => {
      gainFlushTimerRef.current = null;
      flushGainEvent();
    }, 400);
  }, [flushGainEvent]);
  /** 光の循環演出を保留/解除する(モーダル表示中に演出が隠れないように)。
   *  hold=true で保留カウント+1、false で-1。0に戻った時点で保留分を1回再生 */
  const holdLightFlow = useCallback((hold: boolean) => {
    flowHoldRef.current = Math.max(0, flowHoldRef.current + (hold ? 1 : -1));
    if (flowHoldRef.current === 0 && pendingGainRef.current > 0) {
      // モーダルの閉じアニメーションが終わってから再生
      setTimeout(flushGainEvent, 350);
    }
  }, [flushGainEvent]);

  // ── 出会い記録の最新化: レベル(=進化段階)が変わるたびに図鑑へ登録する ──
  // ロード完了前(defaultProgress)や、ログイン済みでクラウド取得が終わる前は
  // 誤登録・偽の「新しい仲間」演出につながるためスキップする
  useEffect(() => {
    if (!encountersLoadedRef.current || !dataReady) return;
    if (isSignedIn && !cloudSynced) return;
    // アカウントに履歴があるか(既存ユーザーの遡り登録判定に使う)
    const hasHistory = progress.totalDays > 0 || progress.experience > 0 || progress.level > 1;
    const { next, newlyMet } = syncEncounters(encountersRef.current, progress.level, getTodayDate(), hasHistory);
    if (next === encountersRef.current) return;
    encountersRef.current = next;
    setEncounters(next);
    AsyncStorage.setItem(KEYS.ENCOUNTERS, JSON.stringify(next))
      .then(() => pushDataToCloud())
      .catch(() => {});
    if (newlyMet.length > 0) {
      setNewEncounters((prev) => [...prev, ...newlyMet.filter((k) => !prev.includes(k))]);
    }
  }, [progress.level, dataReady, isSignedIn, cloudSynced]);

  /** 「新しい仲間が生まれました!」演出を1件消化する */
  const dismissNewEncounter = useCallback(() => {
    setNewEncounters((prev) => prev.slice(1));
  }, []);

  // エネルギー変換・街づくりの同時多重呼び出しを防ぐ同期ガード
  const plantBusyRef = useRef(false);

  /** 蓄電エネルギーを全て変換してポイントにする */
  const convertStoredEnergy = useCallback(async (): Promise<{ converted: number; gained: number }> => {
    if (plantBusyRef.current) return { converted: 0, gained: 0 };
    plantBusyRef.current = true;
    try {
      const result = await updateBalances(state => {
        const converted = Math.floor(state.energy.storedEnergy);
        const gained = converted * ECO_POINTS_PER_ENERGY;
        if (converted <= 0) return { state, result: { converted: 0, gained: 0 } };
        return { state: { ...state,
          energy: { ...state.energy, storedEnergy: state.energy.storedEnergy - converted },
          plant: { ...state.plant, ecoPoints: state.plant.ecoPoints + gained,
            totalSold: state.plant.totalSold + converted, sellCount: state.plant.sellCount + 1 },
        }, result: { converted, gained } };
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      pushDataToCloud();
      return result;
    } finally {
      plantBusyRef.current = false;
    }
  }, [updateBalances]);

  /** One recoverable transaction from stored light/legacy eco points to food points. */
  const receiveGardenReward = useCallback(async () => {
    if (plantBusyRef.current) return { received: 0 };
    plantBusyRef.current = true;
    try {
      const result = await updateBalances(state => claimGardenReward(state, ECO_POINTS_PER_ENERGY));
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      pushDataToCloud();
      return result;
    } finally { plantBusyRef.current = false; }
  }, [updateBalances]);

  const sellEnergy = useCallback(async (): Promise<{ sold: number; gained: number }> => {
    const { converted, gained } = await convertStoredEnergy();
    return { sold: converted, gained };
  }, [convertStoredEnergy]);

  /** エコポイントを使って次の街アイテムを建てる */
  const buildTownItem = useCallback(async (): Promise<{ built?: TownItem; reason?: 'no_more' | 'not_enough' }> => {
    if (plantBusyRef.current) return { reason: 'not_enough' };
    plantBusyRef.current = true;
    try {
      const result = await updateBalances<{ built?: TownItem; reason?: 'no_more' | 'not_enough' }>(state => {
        const item = nextTownItem(state.plant);
        if (!item) return { state, result: { reason: 'no_more' } };
        if (state.plant.ecoPoints < item.cost) return { state, result: { reason: 'not_enough' } };
        return { state: { ...state, plant: { ...state.plant,
          ecoPoints: state.plant.ecoPoints - item.cost, townBuilt: state.plant.townBuilt + 1,
        } }, result: { built: item } };
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      pushDataToCloud();
      return result;
    } finally {
      plantBusyRef.current = false;
    }
  }, [updateBalances]);

  /** 交換待ちポイント(旧エコポイント)をYOKIポイントに受け取る(1:1) */
  const exchangeEcoPoints = useCallback(async (amount: number): Promise<{ exchanged: number }> => {
    if (plantBusyRef.current) return { exchanged: 0 };
    plantBusyRef.current = true;
    try {
      const result = await updateBalances(state => {
        const exchanged = Number.isFinite(amount) ? Math.min(Math.max(0, Math.floor(amount)), state.plant.ecoPoints) : 0;
        return { state: { ...state,
          plant: { ...state.plant, ecoPoints: state.plant.ecoPoints - exchanged },
          feed: { ...state.feed, points: state.feed.points + exchanged },
        }, result: { exchanged } };
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      pushDataToCloud();
      return result;
    } finally {
      plantBusyRef.current = false;
    }
  }, [updateBalances]);

  const currentSatiety = computeCurrentSatiety(feedState);

  // ─── Cloud sync helpers ───────────────────────────────────────────────
  const readCloudSnapshot = useCallback(async () => {
    const keys = Object.values(KEYS);
    const values = await Promise.all(keys.map(k => AsyncStorage.getItem(k)));
    const data: Record<string, unknown> = {};
    keys.forEach((k, i) => {
      if (values[i] !== null) {
        try { data[k] = JSON.parse(values[i]!); } catch { data[k] = values[i]; }
      }
    });
    return data;
  }, []);

  const pushDataToCloud = useCallback(async () => {
    await cloudSessionRef.current?.push();
  }, []);
  const retryCloudSync = useCallback(() => {
    void cloudSessionRef.current?.retry();
  }, []);

  const mergeGuestWithCloud = useCallback(async (cloudData: Record<string, unknown>) => {
    const keys = Object.values(KEYS);
    const localValues = await Promise.all(keys.map((k) => AsyncStorage.getItem(k)));
    const localData: Record<string, unknown> = {};
    keys.forEach((k, i) => {
      if (localValues[i] !== null) {
        try { localData[k] = JSON.parse(localValues[i]!); } catch { localData[k] = localValues[i]; }
      }
    });

    // Cloud remains the source of truth for existing account settings. Guest-only
    // data fills missing values; append-only histories and progress are merged below.
    const merged: Record<string, unknown> = { ...localData, ...cloudData };
    // Keep both sides of append-only histories and use the most progressed state.
    for (const key of [KEYS.RECORDS, KEYS.BADGES]) {
      const cloud = Array.isArray(cloudData[key]) ? cloudData[key] : [];
      const local = Array.isArray(localData[key]) ? localData[key] : [];
      const byId = new Map<string, unknown>();
      [...cloud, ...local].forEach((item: any) => {
        const id = String(item?.id ?? item?.charKey ?? JSON.stringify(item));
        byId.set(id, item);
      });
      merged[key] = [...byId.values()];
    }
    merged[KEYS.ENCOUNTERS] = mergeEncounterHistory(cloudData[KEYS.ENCOUNTERS], localData[KEYS.ENCOUNTERS]);
    if (cloudData[KEYS.PROGRESS] || localData[KEYS.PROGRESS]) {
      const cloud = (cloudData[KEYS.PROGRESS] ?? {}) as UserProgress;
      const local = (localData[KEYS.PROGRESS] ?? {}) as UserProgress;
      merged[KEYS.PROGRESS] = {
        ...cloud,
        ...local,
        experience: Math.max(cloud.experience ?? 0, local.experience ?? 0),
        mentalMuscle: Math.max(cloud.mentalMuscle ?? 0, local.mentalMuscle ?? 0),
        totalDays: Math.max(cloud.totalDays ?? 0, local.totalDays ?? 0),
        level: Math.max(cloud.level ?? 1, local.level ?? 1),
        lastRecordDate: [cloud.lastRecordDate, local.lastRecordDate].filter(Boolean).sort().at(-1) ?? '',
      };
    }
    if (cloudData[KEYS.SHOP_STATE] || localData[KEYS.SHOP_STATE]) {
      const cloud = (cloudData[KEYS.SHOP_STATE] ?? {}) as any;
      const local = (localData[KEYS.SHOP_STATE] ?? {}) as any;
      merged[KEYS.SHOP_STATE] = {
        ...local,
        ...cloud,
        inventory: [...new Set([...(cloud.inventory ?? []), ...(local.inventory ?? [])])],
        equipped: { ...(local.equipped ?? {}), ...(cloud.equipped ?? {}) },
        placements: { ...(cloud.placements ?? {}), ...(local.placements ?? {}) },
      };
    }
    return merged;
  }, []);

  // ─── Load all data from local storage (+ cloud on login) ─────────────
  useEffect(() => {
    if (authLoading || (isSignedIn && !accountId)) return;
    let active = true;
    const isCurrent = () => active && identityRef.current === identity && (!accountId || deletingAccountRef.current !== accountId);
    setIsLoading(true);
    void (async () => {
      try {
        // Migrate legacy private values under the OLD owner before changing it.
        await AsyncStorage.recover();
        const cache = await privateCacheStorage.open(accountId, isCurrent);
        await accountOwnership.prepare(accountId, isCurrent);
        if (!isCurrent()) return;
        const loaded = await loadAll(isCurrent);
        if (isCurrent()) {
          setPrivateScope(cache);
          setLocalScope({ accountId, ready: loaded });
        }
      } catch {
        if (isCurrent()) {
          setStorageError('保存データの持ち主を確認できませんでした。データを保ったまま、もう一度読み込みます。');
          setLocalScope({ accountId, ready: false });
          setIsLoading(false);
        }
      }
    })();
    return () => { active = false; };
  }, [accountId, authLoading, isSignedIn, scopeRetry]);

  // Wait for local recovery and auth resolution; each identity owns its requests.
  useEffect(() => {
    if (isLoading || authLoading || !localScopeReady || (accountId && deletingAccountRef.current === accountId)) return;
    cloudSyncAccountRef.current = accountId;
    setCloudSyncState(INITIAL_CLOUD_SYNC_STATE);
    if (!accountId) return;
    const transport = createCloudSyncTransport({
      url: `${API_BASE}/sync`, getToken: () => getTokenRef.current(),
    });
    const session = createCloudSyncSession({
      ...transport,
      isCurrent: () => accountIdRef.current === accountId && deletingAccountRef.current !== accountId,
      read: readCloudSnapshot,
      onState: setCloudSyncState,
      onGuestBackup: () => Analytics.guestDataBackedUp(),
      pending: {
        stage: () => cloudOutbox.stage(accountId, async () => {
          const snapshot = await readCloudSnapshot();
          if (accountIdRef.current !== accountId || deletingAccountRef.current === accountId) throw new Error('Account changed');
          return snapshot;
        }),
        read: () => cloudOutbox.read(accountId),
        acknowledge: receipt => cloudOutbox.acknowledge(accountId, receipt),
      },
      apply: async (received, isCurrent) => {
        // A cloud response cannot write auth tokens, journals or unrelated keys.
        const allowed: readonly string[] = Object.values(KEYS);
        const data = Object.fromEntries(Object.entries(received).filter(([key]) => allowed.includes(key)));
        const backup = await accountOwnership.isGuest();
        const snapshot = backup ? await mergeGuestWithCloud(data) : data;
        if (!isCurrent()) throw new Error('Account changed');
        // Guest transfer must survive a restart before the first upload/ack.
        if (backup) await cloudOutbox.stage(accountId, async () => {
          if (!isCurrent()) throw new Error('Account changed');
          return snapshot;
        });
        await AsyncStorage.replaceSnapshot({
          ...Object.fromEntries(Object.entries(snapshot).map(([key, value]) =>
            [key, typeof value === 'string' ? value : JSON.stringify(value)])),
          [LOCAL_DATA_OWNER_KEY]: encodeDataOwner(accountId),
        }, isCurrent);
        if (!isCurrent() || !await loadAll(isCurrent)) throw new Error('Account data could not be loaded');
        return { backup };
      },
    });
    cloudSessionRef.current = session;
    void session.initialize();
    return () => {
      session.dispose();
      if (cloudSessionRef.current === session) cloudSessionRef.current = null;
    };
  }, [accountId, isSignedIn, authLoading, isLoading, localScopeReady, readCloudSnapshot, mergeGuestWithCloud, syncRestart]);

  const buildFreshCheckedState = (items: ChecklistItemDef[]): CheckedState => {
    const today = getTodayDate();
    return {
      date: today,
      items: items.map((item) => ({ id: item.id, checked: false, xpEarned: false })),
      bonusEarned: false,
    };
  };

  const loadAll = async (isCurrent: () => boolean = () => true) => {
    const assertCurrent = () => { if (!isCurrent()) throw new Error('Account changed'); };
    try {
      await AsyncStorage.recover();
      assertCurrent();
      const [progressStr, recordsStr, checkedStr, legacyCustomStr, checklistStr, badgesStr, nameStr, feedStr, lastOpenedStr, miniGameStr, profileStr, growthStr, energyStr, plantStr, encountersStr, roomStr, companionStr, homeCommentPreferencesStr] =
        await Promise.all([
          AsyncStorage.getItem(KEYS.PROGRESS),
          AsyncStorage.getItem(KEYS.RECORDS),
          AsyncStorage.getItem(KEYS.CHECKED_STATE),
          AsyncStorage.getItem(KEYS.CUSTOM_ITEMS),      // legacy
          AsyncStorage.getItem(KEYS.CHECKLIST_ITEMS),   // new unified
          AsyncStorage.getItem(KEYS.BADGES),
          AsyncStorage.getItem(KEYS.MASCOT_NAME),
          AsyncStorage.getItem(KEYS.FEED_STATE),
          AsyncStorage.getItem(KEYS.LAST_OPENED),
          AsyncStorage.getItem(KEYS.MINI_GAME),
          AsyncStorage.getItem(KEYS.PROFILE),
          AsyncStorage.getItem(KEYS.GROWTH),
          AsyncStorage.getItem(KEYS.LIGHT_ENERGY),
          AsyncStorage.getItem(KEYS.POWER_PLANT),
          AsyncStorage.getItem(KEYS.ENCOUNTERS),
          AsyncStorage.getItem(KEYS.ROOM_CUSTOMIZATION),
          AsyncStorage.getItem(KEYS.COMPANIONS),
          AsyncStorage.getItem(KEYS.HOME_COMMENT_PREFERENCES),
        ]);
      assertCurrent();

      // ── サイズ成長: 保存値を読み、経過時間ぶんの成長を適用 ──
      {
        let g: GrowthRecord;
        try {
          g = growthStr ? (JSON.parse(growthStr) as GrowthRecord) : createGrowthRecord('mascot');
        } catch {
          g = createGrowthRecord('mascot');
        }
        const updated = applyGrowth(g);
        setGrowth(updated);
        await AsyncStorage.setItem(KEYS.GROWTH, JSON.stringify(updated));
        assertCurrent();
      }

      // ── 光エネルギー: 保存値を読み、日付が変わっていたら日次値をリセット ──
      {
        let raw: unknown = null;
        try { raw = energyStr ? JSON.parse(energyStr) : null; } catch { raw = null; }
        const resolved = applyElapsedEnergy(
          resolveLightEnergyState(raw, getTodayDate()),
          getTodayDate(),
        );
        lightEnergyRef.current = resolved;
        setLightEnergy(resolved);
        await AsyncStorage.setItem(KEYS.LIGHT_ENERGY, JSON.stringify(resolved));
        assertCurrent();
      }

      // ── 発電所: 保存値を安全に読み込む ──
      {
        let raw: unknown = null;
        try { raw = plantStr ? JSON.parse(plantStr) : null; } catch { raw = null; }
        const resolved = resolvePowerPlantState(raw);
        powerPlantRef.current = resolved;
        setPowerPlant(resolved);
      }

      // ── 出会い記録(図鑑): 保存値を安全に読み込む ──
      {
        let raw: unknown = null;
        try { raw = encountersStr ? JSON.parse(encountersStr) : null; } catch { raw = null; }
        const resolved = resolveEncountersState(raw);
        encountersRef.current = resolved;
        setEncounters(resolved);
        encountersLoadedRef.current = true;
      }

      // ── 部屋のカスタム: 保存値を安全に読み込む ──
      {
        let parsed: Partial<RoomCustomization> = {};
        try { parsed = roomStr ? JSON.parse(roomStr) : {}; } catch {}
        const ownedFurniture = Array.isArray(parsed.ownedFurniture)
          ? parsed.ownedFurniture.filter((v): v is RoomFurniture => ['sofa', 'vanity', 'bookshelf'].includes(v))
          : [];
        const ownedFlowers = Array.isArray(parsed.ownedFlowers)
          ? parsed.ownedFlowers.filter((v): v is RoomFlower => ['pink', 'violet', 'rainbow'].includes(v))
          : [];
        // A single saved sofa/rose may be a legitimate purchase. Without a
        // versioned receipt we cannot infer starter ownership and remove it.
        const resolved: RoomCustomization = {
          furniture: ownedFurniture.includes(parsed.furniture as RoomFurniture) ? parsed.furniture as RoomFurniture : 'none',
          flower: ownedFlowers.includes(parsed.flower as RoomFlower) ? parsed.flower as RoomFlower : 'none',
          ownedFurniture: Array.from(new Set(ownedFurniture)) as RoomFurniture[],
          ownedFlowers: Array.from(new Set(ownedFlowers)) as RoomFlower[],
        };
        setRoomCustomization(resolved);
        await AsyncStorage.setItem(KEYS.ROOM_CUSTOMIZATION, JSON.stringify(resolved));
        assertCurrent();
      }

      // ── 追加のたまご: 保存値を安全に読み込む ──
      {
        let parsed: Partial<CompanionState> = {};
        try { parsed = companionStr ? JSON.parse(companionStr) : {}; } catch {}
        const resolved: CompanionState = { extraEggs: Math.max(0, Math.min(1, Math.floor(parsed.extraEggs ?? 0))) };
        setCompanionState(resolved);
        await AsyncStorage.setItem(KEYS.COMPANIONS, JSON.stringify(resolved));
        assertCurrent();
      }

      setInactivityHours(lastOpenedStr ? computeInactivityHours(lastOpenedStr) : 0);
      await AsyncStorage.setItem(KEYS.LAST_OPENED, new Date().toISOString());
      assertCurrent();

      const today = getTodayDate();

      // ── Resolve unified checklist items ──────────────────────────────
      let loadedItems: ChecklistItemDef[];
      if (checklistStr) {
        loadedItems = JSON.parse(checklistStr);
      } else {
        // First launch with new key: seed defaults + migrate any legacy custom items
        const legacyCustom: ChecklistItemDef[] = legacyCustomStr ? JSON.parse(legacyCustomStr) : [];
        loadedItems = [...DEFAULT_CHECKLIST_ITEMS, ...legacyCustom];
        await AsyncStorage.setItem(KEYS.CHECKLIST_ITEMS, JSON.stringify(loadedItems));
        assertCurrent();
      }

      setProgress(progressStr ? JSON.parse(progressStr) : defaultProgress);
      setRecords(recordsStr ? JSON.parse(recordsStr) : []);
      setUnlockedBadges(badgesStr ? JSON.parse(badgesStr) : []);
      setMascotNameState(nameStr ?? '');
      const loadedFeed = feedStr ? JSON.parse(feedStr) : defaultFeedState;
      feedStateRef.current = loadedFeed;
      setFeedState(loadedFeed);
      setNewlyUnlockedBadge(null);
      setNewEncounters([]);
      setMiniGameState(resolveMiniGameState(miniGameStr ? JSON.parse(miniGameStr) : null));
      if (profileStr) {
        try { setProfile(JSON.parse(profileStr)); } catch { setProfile(null); }
      } else {
        setProfile(null);
      }
      try {
        setHomeCommentPreferences(resolveHomeCommentPreferences(
          homeCommentPreferencesStr ? JSON.parse(homeCommentPreferencesStr) : null
        ));
      } catch {
        setHomeCommentPreferences(DEFAULT_HOME_COMMENT_PREFERENCES);
      }
      setChecklistItems(loadedItems);

      if (checkedStr) {
        const state: CheckedState = JSON.parse(checkedStr);
        if (state.date === today) {
          // Ensure any newly added items are present in today's state
          const missingIds = loadedItems
            .map(i => i.id)
            .filter(id => !state.items.find(s => s.id === id));
          const merged: CheckedState = missingIds.length > 0
            ? { ...state, items: [...state.items, ...missingIds.map(id => ({ id, checked: false, xpEarned: false }))] }
            : state;
          setCheckedState(merged);
          if (missingIds.length > 0) await AsyncStorage.setItem(KEYS.CHECKED_STATE, JSON.stringify(merged));
          assertCurrent();
        } else {
          const fresh = buildFreshCheckedState(loadedItems);
          setCheckedState(fresh);
          await AsyncStorage.setItem(KEYS.CHECKED_STATE, JSON.stringify(fresh));
          assertCurrent();
        }
      } else {
        const fresh = buildFreshCheckedState(loadedItems);
        setCheckedState(fresh);
        await AsyncStorage.setItem(KEYS.CHECKED_STATE, JSON.stringify(fresh));
        assertCurrent();
      }
      setStorageError(null);
      return true;
    } catch {
      if (isCurrent()) setStorageError('保存データを読み込めませんでした。データを保ったまま、もう一度読み込みます。');
      return false;
    } finally {
      if (isCurrent()) setIsLoading(false);
    }
  };

  // ── サイズ成長: 1時間ごとに経過時間ぶんを再計算(時間ベース。開いた回数は無関係) ──
  useEffect(() => {
    if (!dataReady) return;
    const timer = setInterval(() => {
      setGrowth((prev) => {
        const next = applyGrowth(prev);
        if (next !== prev) {
          AsyncStorage.setItem(KEYS.GROWTH, JSON.stringify(next)).catch(() => {});
        }
        return next;
      });
    }, 3_600_000);
    return () => clearInterval(timer);
  }, [dataReady]);

  const markGrowthSeen = useCallback(async () => {
    setGrowth((prev) => {
      if (prev.lastSeenSize === prev.growthSize) return prev;
      const next = { ...prev, lastSeenSize: prev.growthSize };
      AsyncStorage.setItem(KEYS.GROWTH, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  // Point changes read the latest persisted balance inside the serialized transaction.
  const syncFeedPoints = useCallback(async (points: number) => {
    if (!Number.isFinite(points) || points < 0) return;
    await updateBalances(state => ({ state: { ...state, feed: { ...state.feed, points } }, result: undefined }));
  }, [updateBalances]);

  /** Point increments/debits use the same journal/queue as garden receipt. */
  const mutateFeedPoints = async (delta: number): Promise<FeedState> => {
    return updateBalances(state => {
      if (state.feed.points + delta < 0) throw new Error('YOKIポイントが足りません');
      const feed = { ...state.feed, points: state.feed.points + delta };
      return { state: { ...state, feed }, result: feed };
    });
  };

  const spendFeedPoints = useCallback(async (points: number): Promise<boolean> => {
    if (!Number.isFinite(points) || points <= 0 || feedStateRef.current.points < points) return false;
    await mutateFeedPoints(-points);
    pushDataToCloud();
    return true;
  }, [pushDataToCloud]);

  const purchaseGuestItem = useCallback(async (itemId: string, cost: number) => {
    const saved = await AsyncStorage.transaction(values => prepareItemPurchase(values, itemId, cost, defaultFeedState));
    feedStateRef.current = saved.feed;
    setFeedState(saved.feed);
    pushDataToCloud();
    return saved;
  }, [pushDataToCloud]);

  const feedMascot = useCallback(
    async (foodId: string): Promise<{ success: boolean; message: string; newSatiety: number }> => {
      const food = FOOD_ITEMS.find((f) => f.id === foodId);
      if (!food) return { success: false, message: 'Unknown food', newSatiety: currentSatiety };
      // 残高チェック・減算は常に最新の ref を正とする(交換・報酬付与との競合対策)
      const result = await updateBalances(state => {
        const baseSatiety = computeCurrentSatiety(state.feed);
        if (state.feed.points < food.cost) return { state, result: { success: false, message: 'YOKIポイントが足りないよ！', newSatiety: baseSatiety } };
        const newSatiety = Math.min(100, baseSatiety + food.satietyGain);
        return { state: { ...state, feed: {
          points: state.feed.points - food.cost,
          lastFeedTime: new Date().toISOString(), satietyAtFeed: newSatiety,
        } }, result: { success: true, message: `${food.name}をあげたよ！`, newSatiety } };
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      return result;
    },
    [currentSatiety, updateBalances]
  );

  const runChecklist = useCallback(async (operation: ChecklistOperation) => {
    const saved = await AsyncStorage.transaction(values => prepareChecklist(values, operation, getTodayDate(),
      { items: DEFAULT_CHECKLIST_ITEMS, progress: defaultProgress, feed: defaultFeedState },
      { item: FP_PER_CHECKLIST_ITEM, fullDay: FP_PER_FULL_DAY_BONUS }));
    setChecklistItems(saved.items);
    setCheckedState(saved.checked);
    if (operation.kind === 'check') {
      setProgress(saved.progress);
      feedStateRef.current = saved.feed; setFeedState(saved.feed);
      lightEnergyRef.current = saved.energy; setLightEnergy(saved.energy);
      setUnlockedBadges(saved.badges);
      if (saved.newestBadge) setNewlyUnlockedBadge(saved.newestBadge);
      if (saved.gainedEnergy > 0) queueGainEvent(saved.gainedEnergy);
      if (operation.checked) await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    void pushDataToCloud().catch(() => {});
  }, [queueGainEvent, pushDataToCloud]);

  const toggleCheckItem = useCallback(async (id: string) => {
    const current = checkedState.items.find(item => item.id === id);
    if (!current) return;
    // Keep the requested target on retry even if a prior write recovered meanwhile.
    await runChecklist({ kind: 'check', id, checked: !(checkedState.date === getTodayDate() && current.checked) });
  }, [checkedState, runChecklist]);

  const pendingChecklistAdd = useRef<{ text: string; category: ChecklistCategory; id: string } | null>(null);
  const addChecklistItem = useCallback(async (text: string, category: ChecklistCategory) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (!pendingChecklistAdd.current || pendingChecklistAdd.current.text !== trimmed || pendingChecklistAdd.current.category !== category) {
      pendingChecklistAdd.current = { text: trimmed, category, id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 8)}` };
    }
    const pending = pendingChecklistAdd.current;
    await runChecklist({ kind: 'add', item: { ...pending, isDefault: false } });
    if (pendingChecklistAdd.current === pending) pendingChecklistAdd.current = null;
  }, [runChecklist]);

  const removeChecklistItem = useCallback(async (id: string) => {
    await runChecklist({ kind: 'remove', id });
  }, [runChecklist]);

  const resetChecklistToDefaults = useCallback(async () => {
    await runChecklist({ kind: 'reset' });
  }, [runChecklist]);

  const saveRecord = useCallback(
    async (mood: number, sleep: number, behaviors: string[], notes: string, extras?: RecordExtras) => {
      const saved = await AsyncStorage.transaction(values => prepareDailyRecord(values, {
        today: getTodayDate(), yesterday: getYesterdayDate(), mood, sleep, behaviors, notes, extras,
      }, { progress: defaultProgress, feed: defaultFeedState }, FP_PER_MOOD_RECORD));
      // Publish only the committed snapshot; retry first recovers any interrupted write.
      setRecords(saved.records);
      setProgress(saved.progress);
      feedStateRef.current = saved.feed; setFeedState(saved.feed);
      lightEnergyRef.current = saved.energy; setLightEnergy(saved.energy);
      setUnlockedBadges(saved.badges);
      if (saved.newestBadge) setNewlyUnlockedBadge(saved.newestBadge);
      if (saved.gainedEnergy > 0) queueGainEvent(saved.gainedEnergy);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      void pushDataToCloud().catch(() => {});
    },
    [queueGainEvent, pushDataToCloud]
  );

  const getTodayRecord = useCallback((): DailyRecord | undefined => {
    const today = getTodayDate();
    return records.find((r) => r.date === today);
  }, [records]);

  const getCompletedCount = useCallback(() => checkedState.items.filter((i) => i.checked).length, [checkedState]);
  const getTotalCheckCount = useCallback(() => checkedState.items.length, [checkedState]);
  const clearNewBadge = useCallback(() => setNewlyUnlockedBadge(null), []);

  const saveProfile = useCallback(async (p: UserProfile) => {
    await AsyncStorage.setItem(KEYS.PROFILE, JSON.stringify(p));
    setProfile(p);
    void pushDataToCloud().catch(() => {});
  }, [pushDataToCloud]);

  const saveHomeCommentPreferences = useCallback(async (preferences: HomeCommentPreferences) => {
    const resolved = resolveHomeCommentPreferences(preferences);
    const commentInputsChanged =
      resolved.frequency !== homeCommentPreferences.frequency ||
      resolved.includeRecentChat !== homeCommentPreferences.includeRecentChat;
    if (commentInputsChanged) {
      if (!privateCache) throw new Error('Account data is not ready');
      await clearHomeCommentCache(privateCache);
    }
    await AsyncStorage.setItem(KEYS.HOME_COMMENT_PREFERENCES, JSON.stringify(resolved));
    setHomeCommentPreferences(resolved);
    void pushDataToCloud().catch(() => {});
  }, [homeCommentPreferences, pushDataToCloud, privateCache]);

  const setMascotName = useCallback(async (name: string) => {
    await AsyncStorage.setItem(KEYS.MASCOT_NAME, name);
    setMascotNameState(name);
    void pushDataToCloud().catch(() => {});
  }, [pushDataToCloud]);

  const runRoomOperation = useCallback(async (operation: RoomOperation) => {
    const saved = await AsyncStorage.transaction(values => prepareRoomOperation(values, operation, defaultFeedState));
    // Publish recovered snapshots even when the retry finds an existing receipt.
    feedStateRef.current = saved.feed;
    setFeedState(saved.feed);
    setRoomCustomization(saved.room);
    setCompanionState(saved.companions);
    if (saved.success) {
      if (saved.newlyPurchased) await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      void pushDataToCloud().catch(() => {});
    }
    return saved;
  }, [pushDataToCloud]);

  const selectRoomItem = useCallback(async (kind: RoomItemKind, id: RoomFurniture | RoomFlower): Promise<boolean> => {
    const saved = await runRoomOperation({ kind: 'select', category: kind, id });
    return saved.success;
  }, [runRoomOperation]);

  const buyRoomItem = useCallback(async (kind: RoomItemKind, id: RoomFurniture | RoomFlower, cost: number) => {
    const saved = await runRoomOperation({ kind: 'buy', category: kind, id, cost });
    return { success: saved.success, reason: saved.reason };
  }, [runRoomOperation]);

  const buyEggCompanion = useCallback(async (): Promise<{ success: boolean; reason?: 'not_enough' }> => {
    const saved = await runRoomOperation({ kind: 'companion' });
    return { success: saved.success, reason: saved.success ? undefined : 'not_enough' };
  }, [runRoomOperation]);

  const completeMiniGame = useCallback(async (slot: GameSlot, reward: { fp: number; stars?: number }, playId: string) => {
    const saved = await AsyncStorage.transaction(values => prepareRhythmReward(values, playId, slot, reward.fp, getTodayDate(), defaultFeedState, MAX_PLAYS_PER_SLOT));
    setMiniGameState(saved.game);
    feedStateRef.current = saved.feed; setFeedState(saved.feed);
    if (!saved.newlyGranted) return saved.earned;

    // メンタルケア連携: 音楽と楽しく過ごした記録として、ごく僅かな成長ボーナス
    // (1回では見えない +0.03%。Level/Evolution とは独立、時間ベース成長にも影響しない)
    setGrowth((prev) => {
      const nextG = applyPlayGrowth(prev);
      if (nextG !== prev) AsyncStorage.setItem(KEYS.GROWTH, JSON.stringify(nextG)).catch(() => {});
      return nextG;
    });

    // ミニゲームはYOKIポイントだけを生む(光エネルギーは日々の記録から生まれる)

    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    pushDataToCloud();
    return saved.earned;
  }, [pushDataToCloud]);

  return (
    <AppContext.Provider
      value={{
        privateCache,
        progress,
        records,
        checkedState,
        checklistItems,
        unlockedBadges,
        isLoading: appLoading,
        newlyUnlockedBadge,
        mascotName,
        feedState,
        syncFeedPoints,
        spendFeedPoints,
        purchaseGuestItem,
        currentSatiety,
        inactivityHours,
        miniGameState,
        profile,
        homeCommentPreferences,
        cloudSynced,
        cloudSyncState,
        isCloudSyncing,
        retryCloudSync,
        saveProfile,
        saveHomeCommentPreferences,
        clearNewBadge,
        toggleCheckItem,
        addChecklistItem,
        removeChecklistItem,
        resetChecklistToDefaults,
        saveRecord,
        getTodayRecord,
        getCompletedCount,
        getTotalCheckCount,
        setMascotName,
        feedMascot,
        completeMiniGame,
        pushDataToCloud,
        growth,
        markGrowthSeen,
        lightEnergy,
        storageError,
        retryStorageRecovery: async () => {
          if (!localScopeReady) setScopeRetry(value => value + 1);
          else await loadAll(() => accountIdRef.current === accountId);
        },
        receiveGardenReward,
        lightGainEvent,
        holdLightFlow,
        powerPlant,
        convertStoredEnergy,
        sellEnergy,
        buildTownItem,
        exchangeEcoPoints,
        roomCustomization,
        selectRoomItem,
        buyRoomItem,
        companionState,
        buyEggCompanion,
        encounters,
        newEncounters,
        dismissNewEncounter,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextType {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
