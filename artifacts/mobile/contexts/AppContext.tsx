import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { DEFAULT_CHECKLIST_ITEMS, ChecklistItemDef, ChecklistCategory } from '@/data/defaultChecklist';
import { BADGE_DEFINITIONS } from '@/data/badges';
import { getTodayDate, getYesterdayDate } from '@/utils/dateUtils';
import {
  calculateLevel,
  calculateMentalMuscle,
  XP_FOR_CHECKLIST_ITEM,
  XP_FOR_MOOD_RECORD,
  XP_FULL_DAY_BONUS,
} from '@/utils/gameLogic';
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
  applyEnergyGain,
  GAIN_CHECK_ITEM,
  GAIN_FULL_DAY_BONUS,
  GAIN_MOOD_RECORD,
  GAIN_DIARY,
  EnergyGain,
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

export type { EncountersState };

export type { LightEnergyState };

export type { MiniGameState, GameSlot };

export interface DailyRecord {
  id: string;
  date: string;
  mood: number;
  sleep: number;
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

export const EGG_COMPANION_COST = 1000;

const KEYS = {
  PROGRESS: '@mentore/progress_v2',
  RECORDS: '@mentore/records_v2',
  CHECKED_STATE: '@mentore/checked_state_v2',
  CUSTOM_ITEMS: '@mentore/custom_items_v2',       // legacy – used for migration only
  CHECKLIST_ITEMS: '@mentore/checklist_items_v3', // unified items list (default + custom)
  BADGES: '@mentore/badges_v2',
  MASCOT_NAME: '@mentore/mascot_name_v1',
  FEED_STATE: '@mentore/feed_state_v1',
  LAST_OPENED: '@mentore/last_opened_v1',
  MINI_GAME: '@mentore/mini_game_v1',
  PROFILE: '@mentore/profile_v1',
  GROWTH: '@mentore/growth_v1',
  LIGHT_ENERGY: '@mentore/light_energy_v1',
  POWER_PLANT: '@mentore/power_plant_v1',
  ENCOUNTERS: '@mentore/encounters_v1',
  ROOM_CUSTOMIZATION: '@mentore/room_customization_v1',
  COMPANIONS: '@mentore/companions_v1',
  SHOP_STATE: '@mentore/shop_state_v2',
};

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
  currentSatiety: number;
  inactivityHours: number;
  miniGameState: MiniGameState;
  profile: UserProfile | null;
  /** True once the post-login cloud pull has finished (safe to decide onboarding) */
  cloudSynced: boolean;
  saveProfile: (profile: UserProfile) => Promise<void>;
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
  completeMiniGame: (slot: GameSlot, reward: { fp?: number; xp?: number; stars?: number }) => Promise<void>;
  /** キャラクターのエネルギー(元気・光の力・チャージ量)の現在の状態 */
  lightEnergy: LightEnergyState;
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
  /** ごほうびポイント(エコポイント)をごはんポイントに交換する(1:1) */
  exchangeEcoPoints: (amount: number) => Promise<{ exchanged: number }>;
  roomCustomization: RoomCustomization;
  /** 家具や花を選択する(購入済みアイテムのみ) */
  selectRoomItem: (kind: RoomItemKind, id: RoomFurniture | RoomFlower) => Promise<boolean>;
  /** 家具や花をポイントで購入する */
  buyRoomItem: (kind: RoomItemKind, id: RoomFurniture | RoomFlower, cost: number) => Promise<{ success: boolean; reason?: 'already_owned' | 'not_enough' | 'invalid' }>;
  companionState: CompanionState;
  /** ごはんポイントで追加のたまごを仲間にする */
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

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { isSignedIn, getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  useEffect(() => { getTokenRef.current = getToken; }, [getToken]);
  const signedInRef = useRef(isSignedIn);
  useEffect(() => { signedInRef.current = isSignedIn; }, [isSignedIn]);

  const [progress, setProgress] = useState<UserProgress>(defaultProgress);
  const [records, setRecords] = useState<DailyRecord[]>([]);
  const [checkedState, setCheckedState] = useState<CheckedState>({ date: '', items: [], bonusEarned: false });
  const [checklistItems, setChecklistItems] = useState<ChecklistItemDef[]>(DEFAULT_CHECKLIST_ITEMS);
  const [unlockedBadges, setUnlockedBadges] = useState<UnlockedBadge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newlyUnlockedBadge, setNewlyUnlockedBadge] = useState<string | null>(null);
  const [mascotName, setMascotNameState] = useState('');
  const [feedState, setFeedState] = useState<FeedState>(defaultFeedState);
  const [inactivityHours, setInactivityHours] = useState(0);
  const [miniGameState, setMiniGameState] = useState<MiniGameState>(DEFAULT_MINI_GAME_STATE);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [cloudSynced, setCloudSynced] = useState(false);
  // The first authenticated transition may be a guest upgrading to an account.
  // Keep this separate from Clerk state so local data can be merged before pull.
  const wasGuestRef = useRef(false);
  // マスコットは進化しても同一個体なので characterId は固定 'mascot'
  const [growth, setGrowth] = useState<GrowthRecord>(() => createGrowthRecord('mascot'));
  const [lightEnergy, setLightEnergy] = useState<LightEnergyState>(() => createLightEnergyState(getTodayDate()));
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

  /** 時間経過ぶんの自然なエネルギーチャージを精算する。読込・復帰・定期更新のすべてで共通利用する */
  const settleElapsedEnergy = useCallback(() => {
    const next = applyElapsedEnergy(lightEnergyRef.current, getTodayDate());
    if (next === lightEnergyRef.current) return next;
    lightEnergyRef.current = next;
    setLightEnergy(next);
    AsyncStorage.setItem(KEYS.LIGHT_ENERGY, JSON.stringify(next)).catch(() => {});
    return next;
  }, []);

  // アプリを開いたまま日付が変わっても日次値(元気・光の力・今日のエネルギー)が
  // 前日のまま表示されないよう、1分ごとに日付ロールオーバーとチャージを精算する
  useEffect(() => {
    const timer = setInterval(() => {
      settleElapsedEnergy();
    }, 60_000);
    return () => clearInterval(timer);
  }, [settleElapsedEnergy]);

  // バックグラウンドから戻った瞬間にも、閉じていた時間のチャージ分を反映する
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') settleElapsedEnergy();
    });
    return () => subscription.remove();
  }, [settleElapsedEnergy]);

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

  /** 光エネルギー獲得(獲得ルールは utils/lightEnergy.ts に集約)。flag 指定時は1日1回のみ */
  const gainLightEnergy = useCallback(
    async (gain: EnergyGain, flag?: keyof LightEnergyState['flags']) => {
      const today = getTodayDate();
      const settled = settleElapsedEnergy();
      const next = applyEnergyGain(settled, gain, today, flag);
      if (next === settled) return;
      // 付与量は totalEnergy の差分で求める(todayEnergy は深夜のロールオーバーで
      // リセットされるため、日付またぎ直後の付与でも正しい量になる)
      const gained = next.totalEnergy - settled.totalEnergy;
      lightEnergyRef.current = next;
      setLightEnergy(next);
      if (gained > 0) queueGainEvent(gained);
      await AsyncStorage.setItem(KEYS.LIGHT_ENERGY, JSON.stringify(next));
    },
    [settleElapsedEnergy]
  );

  // ── 出会い記録の最新化: レベル(=進化段階)が変わるたびに図鑑へ登録する ──
  // ロード完了前(defaultProgress)や、ログイン済みでクラウド取得が終わる前は
  // 誤登録・偽の「新しい仲間」演出につながるためスキップする
  useEffect(() => {
    if (!encountersLoadedRef.current || isLoading) return;
    if (pullingRef.current) return;
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
  }, [progress.level, isLoading, isSignedIn, cloudSynced]);

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
      const energy = lightEnergyRef.current;
      const converted = Math.floor(energy.storedEnergy);
      if (converted <= 0) return { converted: 0, gained: 0 };
      const gained = converted * ECO_POINTS_PER_ENERGY;

      const nextEnergy = { ...energy, storedEnergy: energy.storedEnergy - converted };
      lightEnergyRef.current = nextEnergy;
      setLightEnergy(nextEnergy);

      const nextPlant: PowerPlantState = {
        ...powerPlantRef.current,
        ecoPoints: powerPlantRef.current.ecoPoints + gained,
        totalSold: powerPlantRef.current.totalSold + converted,
        sellCount: powerPlantRef.current.sellCount + 1,
      };
      powerPlantRef.current = nextPlant;
      setPowerPlant(nextPlant);

      await Promise.all([
        AsyncStorage.setItem(KEYS.LIGHT_ENERGY, JSON.stringify(nextEnergy)),
        AsyncStorage.setItem(KEYS.POWER_PLANT, JSON.stringify(nextPlant)),
      ]);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      pushDataToCloud();
      return { converted, gained };
    } finally {
      plantBusyRef.current = false;
    }
  }, []);

  const sellEnergy = useCallback(async (): Promise<{ sold: number; gained: number }> => {
    const { converted, gained } = await convertStoredEnergy();
    return { sold: converted, gained };
  }, [convertStoredEnergy]);

  /** エコポイントを使って次の街アイテムを建てる */
  const buildTownItem = useCallback(async (): Promise<{ built?: TownItem; reason?: 'no_more' | 'not_enough' }> => {
    if (plantBusyRef.current) return { reason: 'not_enough' };
    plantBusyRef.current = true;
    try {
      const plant = powerPlantRef.current;
      const item = nextTownItem(plant);
      if (!item) return { reason: 'no_more' };
      if (plant.ecoPoints < item.cost) return { reason: 'not_enough' };

      const nextPlant: PowerPlantState = {
        ...plant,
        ecoPoints: plant.ecoPoints - item.cost,
        townBuilt: plant.townBuilt + 1,
      };
      powerPlantRef.current = nextPlant;
      setPowerPlant(nextPlant);
      await AsyncStorage.setItem(KEYS.POWER_PLANT, JSON.stringify(nextPlant));
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      pushDataToCloud();
      return { built: item };
    } finally {
      plantBusyRef.current = false;
    }
  }, []);

  /** ごほうびポイント(エコポイント)をごはんポイントに交換する(1:1) */
  const exchangeEcoPoints = useCallback(async (amount: number): Promise<{ exchanged: number }> => {
    if (plantBusyRef.current) return { exchanged: 0 };
    plantBusyRef.current = true;
    try {
      const plant = powerPlantRef.current;
      const exchanged = Math.min(Math.floor(amount), plant.ecoPoints);
      if (exchanged <= 0) return { exchanged: 0 };

      const nextPlant: PowerPlantState = { ...plant, ecoPoints: plant.ecoPoints - exchanged };
      powerPlantRef.current = nextPlant;
      setPowerPlant(nextPlant);
      await AsyncStorage.setItem(KEYS.POWER_PLANT, JSON.stringify(nextPlant));
      await mutateFeedPoints(exchanged);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      pushDataToCloud();
      return { exchanged };
    } finally {
      plantBusyRef.current = false;
    }
  }, []);

  const currentSatiety = computeCurrentSatiety(feedState);

  // ─── Cloud sync helpers ───────────────────────────────────────────────
  // Blocks pushes while the initial post-login pull is running, so a quick
  // user action right after sign-in can't overwrite cloud data.
  const pullingRef = useRef(false);

  // push を直列化するチェーン。並走した push が古いスナップショットで
  // 新しいクラウド状態を上書きしないよう、常に「前の push 完了後に
  // スナップショットを取る」順序を保証する
  const pushChainRef = useRef<Promise<void>>(Promise.resolve());

  const pushDataToCloud = useCallback(async () => {
    if (!signedInRef.current || pullingRef.current) return;
    const run = async () => {
      if (!signedInRef.current || pullingRef.current) return;
      const t = await getTokenRef.current();
      if (!t) return;
      try {
        const keys = Object.values(KEYS);
        const values = await Promise.all(keys.map((k) => AsyncStorage.getItem(k)));
        const data: Record<string, unknown> = {};
        keys.forEach((k, i) => {
          if (values[i] !== null) {
            try { data[k] = JSON.parse(values[i]!); } catch { data[k] = values[i]; }
          }
        });
        await fetch(`${API_BASE}/sync`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
          body: JSON.stringify({ data }),
        });
      } catch { /* fire-and-forget */ }
    };
    const next = pushChainRef.current.then(run, run);
    pushChainRef.current = next;
    await next;
  }, []);

  const pullDataFromCloud = useCallback(async (): Promise<{ ok: boolean; data: Record<string, unknown> }> => {
    if (!signedInRef.current) return { ok: false, data: {} };
    const t = await getTokenRef.current();
    if (!t) return { ok: false, data: {} };
    try {
      const res = await fetch(`${API_BASE}/sync`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (!res.ok) return { ok: false, data: {} };
      const { data } = await res.json() as { data: Record<string, unknown> };
      return { ok: true, data };
    } catch { return { ok: false, data: {} }; }
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
    for (const key of [KEYS.RECORDS, KEYS.BADGES, KEYS.ENCOUNTERS]) {
      const cloud = Array.isArray(cloudData[key]) ? cloudData[key] : [];
      const local = Array.isArray(localData[key]) ? localData[key] : [];
      const byId = new Map<string, unknown>();
      [...cloud, ...local].forEach((item: any) => {
        const id = String(item?.id ?? item?.charKey ?? JSON.stringify(item));
        byId.set(id, item);
      });
      merged[key] = [...byId.values()];
    }
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
    await Promise.all(Object.entries(merged).map(([k, v]) =>
      AsyncStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v))
    ));
  }, []);

  // ─── Load all data from local storage (+ cloud on login) ─────────────
  useEffect(() => {
    loadAll();
  }, []);

  // When the user logs in, pull cloud data and reload
  const prevSignedIn = useRef(false);
  useEffect(() => {
    if (isSignedIn && !prevSignedIn.current) {
      prevSignedIn.current = true;
      (async () => {
        pullingRef.current = true;
        let ok = false;
        let mergedGuestData = false;
        try {
          const pulled = await pullDataFromCloud();
          ok = pulled.ok;
          if (ok && wasGuestRef.current) {
            await mergeGuestWithCloud(pulled.data);
            mergedGuestData = true;
          } else if (ok) {
            await Promise.all(
              Object.entries(pulled.data).map(([k, v]) =>
                AsyncStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v))
              )
            );
            if (!(KEYS.PROFILE in pulled.data)) await AsyncStorage.removeItem(KEYS.PROFILE);
          }
          await loadAll();
        } finally {
          pullingRef.current = false;
          // Only mark synced when the pull actually succeeded, so a failed
          // pull can't send an existing user (with a cloud profile) to onboarding
          if (ok) setCloudSynced(true);
          if (ok && mergedGuestData) {
            await pushDataToCloud();
            Analytics.guestDataBackedUp();
          }
        }
      })();
    }
    if (!isSignedIn) {
      prevSignedIn.current = false;
      setCloudSynced(false);
      if (!isLoading) wasGuestRef.current = true;
    }
  }, [isSignedIn, isLoading, pullDataFromCloud, mergeGuestWithCloud]);

  const buildFreshCheckedState = (items: ChecklistItemDef[]): CheckedState => {
    const today = getTodayDate();
    return {
      date: today,
      items: items.map((item) => ({ id: item.id, checked: false, xpEarned: false })),
      bonusEarned: false,
    };
  };

  const loadAll = async () => {
    try {
      const [progressStr, recordsStr, checkedStr, legacyCustomStr, checklistStr, badgesStr, nameStr, feedStr, lastOpenedStr, miniGameStr, profileStr, growthStr, energyStr, plantStr, encountersStr, roomStr, companionStr] =
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
        ]);

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
        // The first room version showed a sofa and flower before purchase.
        // Treat those starter-only values as empty so the room follows the
        // purchase rule introduced with the shared points wallet.
        const migratedFurniture = ownedFurniture.filter((id) => id !== 'sofa' || ownedFurniture.length > 1);
        const migratedFlowers = ownedFlowers.filter((id) => id !== 'pink' || ownedFlowers.length > 1);
        const resolved: RoomCustomization = {
          furniture: migratedFurniture.includes(parsed.furniture as RoomFurniture) ? parsed.furniture as RoomFurniture : 'none',
          flower: migratedFlowers.includes(parsed.flower as RoomFlower) ? parsed.flower as RoomFlower : 'none',
          ownedFurniture: Array.from(new Set(migratedFurniture)) as RoomFurniture[],
          ownedFlowers: Array.from(new Set(migratedFlowers)) as RoomFlower[],
        };
        setRoomCustomization(resolved);
        await AsyncStorage.setItem(KEYS.ROOM_CUSTOMIZATION, JSON.stringify(resolved));
      }

      // ── 追加のたまご: 保存値を安全に読み込む ──
      {
        let parsed: Partial<CompanionState> = {};
        try { parsed = companionStr ? JSON.parse(companionStr) : {}; } catch {}
        const resolved: CompanionState = { extraEggs: Math.max(0, Math.min(1, Math.floor(parsed.extraEggs ?? 0))) };
        setCompanionState(resolved);
        await AsyncStorage.setItem(KEYS.COMPANIONS, JSON.stringify(resolved));
      }

      if (lastOpenedStr) setInactivityHours(computeInactivityHours(lastOpenedStr));
      await AsyncStorage.setItem(KEYS.LAST_OPENED, new Date().toISOString());

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
      }

      if (progressStr) setProgress(JSON.parse(progressStr));
      if (recordsStr)  setRecords(JSON.parse(recordsStr));
      if (badgesStr)   setUnlockedBadges(JSON.parse(badgesStr));
      if (nameStr)     setMascotNameState(nameStr);
      if (feedStr) {
        const parsed = JSON.parse(feedStr);
        feedStateRef.current = parsed;
        setFeedState(parsed);
      }
      setMiniGameState(resolveMiniGameState(miniGameStr ? JSON.parse(miniGameStr) : null));
      if (profileStr) {
        try { setProfile(JSON.parse(profileStr)); } catch { setProfile(null); }
      } else {
        setProfile(null);
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
        } else {
          const fresh = buildFreshCheckedState(loadedItems);
          setCheckedState(fresh);
          await AsyncStorage.setItem(KEYS.CHECKED_STATE, JSON.stringify(fresh));
        }
      } else {
        const fresh = buildFreshCheckedState(loadedItems);
        setCheckedState(fresh);
        await AsyncStorage.setItem(KEYS.CHECKED_STATE, JSON.stringify(fresh));
      }
    } catch {
      // use defaults on error
    } finally {
      setIsLoading(false);
    }
  };

  // ── サイズ成長: 1時間ごとに経過時間ぶんを再計算(時間ベース。開いた回数は無関係) ──
  useEffect(() => {
    if (isLoading) return;
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
  }, [isLoading]);

  const markGrowthSeen = useCallback(async () => {
    setGrowth((prev) => {
      if (prev.lastSeenSize === prev.growthSize) return prev;
      const next = { ...prev, lastSeenSize: prev.growthSize };
      AsyncStorage.setItem(KEYS.GROWTH, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  // ごはんポイントの同時更新(交換・購入・報酬)で残高が上書きされないよう、
  // 常に最新値を保持する ref を正とする
  const feedStateRef = useRef<FeedState>(defaultFeedState);

  const saveFeedState = async (next: FeedState) => {
    feedStateRef.current = next;
    setFeedState(next);
    await AsyncStorage.setItem(KEYS.FEED_STATE, JSON.stringify(next));
  };

  const syncFeedPoints = useCallback(async (points: number) => {
    if (!Number.isFinite(points) || points < 0) return;
    const next = { ...feedStateRef.current, points };
    await saveFeedState(next);
  }, []);

  /** ポイント増減は必ずこの関数経由(ref ベースで直列に適用) */
  const mutateFeedPoints = async (delta: number): Promise<FeedState> => {
    const cur = feedStateRef.current;
    const next: FeedState = { ...cur, points: Math.max(0, cur.points + delta) };
    await saveFeedState(next);
    return next;
  };

  const spendFeedPoints = useCallback(async (points: number): Promise<boolean> => {
    if (!Number.isFinite(points) || points <= 0 || feedStateRef.current.points < points) return false;
    await mutateFeedPoints(-points);
    pushDataToCloud();
    return true;
  }, [pushDataToCloud]);

  const feedMascot = useCallback(
    async (foodId: string): Promise<{ success: boolean; message: string; newSatiety: number }> => {
      const food = FOOD_ITEMS.find((f) => f.id === foodId);
      if (!food) return { success: false, message: 'Unknown food', newSatiety: currentSatiety };
      // 残高チェック・減算は常に最新の ref を正とする(交換・報酬付与との競合対策)
      const cur = feedStateRef.current;
      if (cur.points < food.cost) {
        return { success: false, message: 'きらめきポイントが足りないよ！', newSatiety: currentSatiety };
      }

      const baseSatiety = computeCurrentSatiety(cur);
      const newSatiety = Math.min(100, baseSatiety + food.satietyGain);
      const next: FeedState = {
        points: cur.points - food.cost,
        lastFeedTime: new Date().toISOString(),
        satietyAtFeed: newSatiety,
      };
      await saveFeedState(next);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return { success: true, message: `${food.name}をあげたよ！`, newSatiety };
    },
    [currentSatiety]
  );

  const checkAndUnlockBadges = useCallback(
    async (currentBadges: UnlockedBadge[], newProgress: UserProgress, newRecords: DailyRecord[], allChecked: boolean) => {
      const unlocked = new Set(currentBadges.map((b) => b.id));
      const updated = [...currentBadges];
      let newest: string | null = null;
      const now = new Date().toISOString();

      const unlock = (id: string) => {
        if (!unlocked.has(id)) {
          unlocked.add(id);
          updated.push({ id, unlockedAt: now });
          newest = id;
        }
      };

      if (newRecords.length >= 1) unlock('firstStep');
      if (newProgress.streak >= 3) unlock('streak3');
      if (newProgress.streak >= 7) unlock('streak7');
      if (newProgress.streak >= 30) unlock('streak30');
      if (newRecords.length >= 7) unlock('moodLogger7');
      if (newProgress.level >= 5) unlock('levelUp5');
      if (allChecked) unlock('checkMaster');

      if (newest) {
        setNewlyUnlockedBadge(newest);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      setUnlockedBadges(updated);
      await AsyncStorage.setItem(KEYS.BADGES, JSON.stringify(updated));
    },
    []
  );

  const toggleCheckItem = useCallback(
    async (id: string) => {
      const currentItem = checkedState.items.find((i) => i.id === id);
      if (!currentItem) return;

      const wasChecked = currentItem.checked;
      const nowChecked = !wasChecked;

      let xpGain = 0;
      if (nowChecked && !currentItem.xpEarned) xpGain = XP_FOR_CHECKLIST_ITEM;

      const newItems = checkedState.items.map((i) =>
        i.id === id ? { ...i, checked: nowChecked, xpEarned: nowChecked ? true : i.xpEarned } : i
      );

      const allDefaultChecked = newItems.every((i) => i.checked);

      let bonusXp = 0;
      let newBonusEarned = checkedState.bonusEarned;
      if (allDefaultChecked && !checkedState.bonusEarned) {
        bonusXp = XP_FULL_DAY_BONUS;
        newBonusEarned = true;
      }

      const newState: CheckedState = { ...checkedState, items: newItems, bonusEarned: newBonusEarned };

      const totalXpGain = xpGain + bonusXp;
      const newExp = progress.experience + totalXpGain;
      const newProgress: UserProgress = {
        ...progress,
        experience: newExp,
        level: calculateLevel(newExp),
        mentalMuscle: calculateMentalMuscle(newExp),
      };

      setCheckedState(newState);
      if (totalXpGain > 0) {
        setProgress(newProgress);
        await AsyncStorage.setItem(KEYS.PROGRESS, JSON.stringify(newProgress));
      }
      await AsyncStorage.setItem(KEYS.CHECKED_STATE, JSON.stringify(newState));

      if (nowChecked && !currentItem.xpEarned) {
        let fpGain = FP_PER_CHECKLIST_ITEM;
        if (allDefaultChecked && !checkedState.bonusEarned) fpGain += FP_PER_FULL_DAY_BONUS;
        await mutateFeedPoints(fpGain);

        // 光エネルギー: チェック1件(初回のみ) + 全達成ボーナス
        await gainLightEnergy(GAIN_CHECK_ITEM);
        if (allDefaultChecked && !checkedState.bonusEarned) {
          await gainLightEnergy(GAIN_FULL_DAY_BONUS);
        }
      }

      if (nowChecked) await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const allChecked = newItems.every((i) => i.checked);
      await checkAndUnlockBadges(unlockedBadges, newProgress, records, allChecked);

      // Sync to cloud (fire-and-forget)
      pushDataToCloud();
    },
    [checkedState, progress, unlockedBadges, records, feedState, checkAndUnlockBadges, pushDataToCloud, gainLightEnergy]
  );

  const addChecklistItem = useCallback(
    async (text: string, category: ChecklistCategory) => {
      const id = `custom_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      const newItem: ChecklistItemDef = { id, text, category, isDefault: false };
      const newItems = [...checklistItems, newItem];
      const newChecked: CheckedState = {
        ...checkedState,
        items: [...checkedState.items, { id, checked: false, xpEarned: false }],
      };
      setChecklistItems(newItems);
      setCheckedState(newChecked);
      await AsyncStorage.setItem(KEYS.CHECKLIST_ITEMS, JSON.stringify(newItems));
      await AsyncStorage.setItem(KEYS.CHECKED_STATE, JSON.stringify(newChecked));
      pushDataToCloud();
    },
    [checklistItems, checkedState, pushDataToCloud]
  );

  const removeChecklistItem = useCallback(
    async (id: string) => {
      const newItems = checklistItems.filter(i => i.id !== id);
      const newChecked: CheckedState = {
        ...checkedState,
        items: checkedState.items.filter(i => i.id !== id),
      };
      setChecklistItems(newItems);
      setCheckedState(newChecked);
      await AsyncStorage.setItem(KEYS.CHECKLIST_ITEMS, JSON.stringify(newItems));
      await AsyncStorage.setItem(KEYS.CHECKED_STATE, JSON.stringify(newChecked));
      pushDataToCloud();
    },
    [checklistItems, checkedState, pushDataToCloud]
  );

  const resetChecklistToDefaults = useCallback(
    async () => {
      const fresh = buildFreshCheckedState(DEFAULT_CHECKLIST_ITEMS);
      setChecklistItems(DEFAULT_CHECKLIST_ITEMS);
      setCheckedState(fresh);
      await AsyncStorage.setItem(KEYS.CHECKLIST_ITEMS, JSON.stringify(DEFAULT_CHECKLIST_ITEMS));
      await AsyncStorage.setItem(KEYS.CHECKED_STATE, JSON.stringify(fresh));
      pushDataToCloud();
    },
    [checkedState, pushDataToCloud]
  );

  const saveRecord = useCallback(
    async (mood: number, sleep: number, behaviors: string[], notes: string, extras?: RecordExtras) => {
      const today = getTodayDate();
      const yesterday = getYesterdayDate();
      const existingIndex = records.findIndex((r) => r.date === today);
      const isNew = existingIndex === -1;

      const record: DailyRecord = {
        id: isNew ? `r_${Date.now()}` : records[existingIndex].id,
        date: today,
        mood,
        sleep,
        behaviors,
        notes,
        exercise: extras?.exercise,
        meal: extras?.meal,
        social: extras?.social,
        win: extras?.win?.trim() || undefined,
        activities: extras?.activities,
      };

      const newRecords = isNew
        ? [...records, record]
        : records.map((r, i) => (i === existingIndex ? record : r));

      let newProgress = { ...progress };
      if (isNew) {
        const newStreak =
          progress.lastRecordDate === yesterday
            ? progress.streak + 1
            : progress.lastRecordDate === today
            ? progress.streak
            : 1;
        const newTotalDays = progress.totalDays + 1;
        const newExp = progress.experience + XP_FOR_MOOD_RECORD;
        newProgress = {
          ...progress,
          experience: newExp,
          level: calculateLevel(newExp),
          mentalMuscle: calculateMentalMuscle(newExp),
          streak: newStreak,
          totalDays: newTotalDays,
          lastRecordDate: today,
        };
      }

      setRecords(newRecords);
      setProgress(newProgress);
      await AsyncStorage.setItem(KEYS.RECORDS, JSON.stringify(newRecords));
      await AsyncStorage.setItem(KEYS.PROGRESS, JSON.stringify(newProgress));

      if (isNew) {
        await mutateFeedPoints(FP_PER_MOOD_RECORD);
      }

      // 光エネルギー: 気分・生活の記録(1日1回) + 日記を書いた(1日1回)
      await gainLightEnergy(GAIN_MOOD_RECORD, 'mood');
      if (notes.trim().length > 0 || (extras?.win?.trim()?.length ?? 0) > 0) {
        await gainLightEnergy(GAIN_DIARY, 'diary');
      }

      const allChecked = checkedState.items.every((i) => i.checked);
      await checkAndUnlockBadges(unlockedBadges, newProgress, newRecords, allChecked);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Sync to cloud (fire-and-forget)
      pushDataToCloud();
    },
    [records, progress, unlockedBadges, checkedState, feedState, checkAndUnlockBadges, pushDataToCloud, gainLightEnergy]
  );

  const getTodayRecord = useCallback((): DailyRecord | undefined => {
    const today = getTodayDate();
    return records.find((r) => r.date === today);
  }, [records]);

  const getCompletedCount = useCallback(() => checkedState.items.filter((i) => i.checked).length, [checkedState]);
  const getTotalCheckCount = useCallback(() => checkedState.items.length, [checkedState]);
  const clearNewBadge = useCallback(() => setNewlyUnlockedBadge(null), []);

  const saveProfile = useCallback(async (p: UserProfile) => {
    setProfile(p);
    await AsyncStorage.setItem(KEYS.PROFILE, JSON.stringify(p));
    pushDataToCloud();
  }, [pushDataToCloud]);

  const setMascotName = useCallback(async (name: string) => {
    setMascotNameState(name);
    await AsyncStorage.setItem(KEYS.MASCOT_NAME, name);
    pushDataToCloud();
  }, [pushDataToCloud]);

  const shopBusyRef = useRef(false);

  const selectRoomItem = useCallback(async (kind: RoomItemKind, id: RoomFurniture | RoomFlower): Promise<boolean> => {
    const current = roomCustomization;
    if (kind === 'furniture') {
      if (id !== 'none' && (!['sofa', 'vanity', 'bookshelf'].includes(id) || !current.ownedFurniture.includes(id as RoomFurniture))) return false;
      const next = { ...current, furniture: id as RoomFurniture };
      setRoomCustomization(next);
      await AsyncStorage.setItem(KEYS.ROOM_CUSTOMIZATION, JSON.stringify(next));
      pushDataToCloud();
      return true;
    }
    if (id !== 'none' && (!['pink', 'violet', 'rainbow'].includes(id) || !current.ownedFlowers.includes(id as RoomFlower))) return false;
    const next = { ...current, flower: id as RoomFlower };
    setRoomCustomization(next);
    await AsyncStorage.setItem(KEYS.ROOM_CUSTOMIZATION, JSON.stringify(next));
    pushDataToCloud();
    return true;
  }, [roomCustomization, pushDataToCloud]);

  const buyRoomItem = useCallback(async (
    kind: RoomItemKind,
    id: RoomFurniture | RoomFlower,
    cost: number,
  ): Promise<{ success: boolean; reason?: 'already_owned' | 'not_enough' | 'invalid' }> => {
    if (shopBusyRef.current) return { success: false, reason: 'not_enough' };
    const validFurniture = ['none', 'sofa', 'vanity', 'bookshelf'].includes(id);
    const validFlower = ['none', 'pink', 'violet', 'rainbow'].includes(id);
    if ((kind === 'furniture' && !validFurniture) || (kind === 'flower' && !validFlower)) {
      return { success: false, reason: 'invalid' };
    }
    const current = roomCustomization;
    if (id === 'none') return { success: false, reason: 'invalid' };
    const owned = kind === 'furniture' ? current.ownedFurniture.includes(id as RoomFurniture) : current.ownedFlowers.includes(id as RoomFlower);
    if (owned) return { success: false, reason: 'already_owned' };
    if (feedStateRef.current.points < cost) return { success: false, reason: 'not_enough' };

    shopBusyRef.current = true;
    try {
      await mutateFeedPoints(-cost);
      const next: RoomCustomization = kind === 'furniture'
        ? { ...current, furniture: id as RoomFurniture, ownedFurniture: [...current.ownedFurniture, id as RoomFurniture] }
        : { ...current, flower: id as RoomFlower, ownedFlowers: [...current.ownedFlowers, id as RoomFlower] };
      setRoomCustomization(next);
      await AsyncStorage.setItem(KEYS.ROOM_CUSTOMIZATION, JSON.stringify(next));
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      pushDataToCloud();
      return { success: true };
    } finally {
      shopBusyRef.current = false;
    }
  }, [roomCustomization, pushDataToCloud]);

  const buyEggCompanion = useCallback(async (): Promise<{ success: boolean; reason?: 'already_owned' | 'not_enough' }> => {
    if (shopBusyRef.current) return { success: false, reason: 'not_enough' };
    if (companionState.extraEggs >= 1) return { success: false, reason: 'already_owned' };
    if (feedStateRef.current.points < EGG_COMPANION_COST) return { success: false, reason: 'not_enough' };

    shopBusyRef.current = true;
    try {
      await mutateFeedPoints(-EGG_COMPANION_COST);
      const next = { extraEggs: 1 };
      setCompanionState(next);
      await AsyncStorage.setItem(KEYS.COMPANIONS, JSON.stringify(next));
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      pushDataToCloud();
      return { success: true };
    } finally {
      shopBusyRef.current = false;
    }
  }, [companionState, pushDataToCloud]);

  // completeMiniGame の同時多重呼び出し(再レンダー前の連打)でも二重付与しないための同期ガード
  const completingSlotsRef = useRef<Set<GameSlot>>(new Set());

  const completeMiniGame = useCallback(async (slot: GameSlot, reward: { fp?: number; xp?: number; stars?: number }) => {
    // スロット上限に達していたら加算も報酬付与もしない (二重付与・上限回避の防止)
    if ((miniGameState[slot] || 0) >= MAX_PLAYS_PER_SLOT) return;
    if (completingSlotsRef.current.has(slot)) return;
    completingSlotsRef.current.add(slot);
    try {
    // Mark slot as done
    const next: MiniGameState = { ...miniGameState, [slot]: (miniGameState[slot] || 0) + 1 };
    setMiniGameState(next);
    await AsyncStorage.setItem(KEYS.MINI_GAME, JSON.stringify(next));

    // Apply FP reward
    if (reward.fp) {
      await mutateFeedPoints(reward.fp);
    }

    // Apply XP reward
    if (reward.xp) {
      const newExp = progress.experience + reward.xp;
      const newProgress: UserProgress = {
        ...progress,
        experience: newExp,
        level: calculateLevel(newExp),
        mentalMuscle: calculateMentalMuscle(newExp),
      };
      setProgress(newProgress);
      await AsyncStorage.setItem(KEYS.PROGRESS, JSON.stringify(newProgress));
    }

    // メンタルケア連携: 音楽と楽しく過ごした記録として、ごく僅かな成長ボーナス
    // (1回では見えない +0.03%。Level/Evolution とは独立、時間ベース成長にも影響しない)
    setGrowth((prev) => {
      const nextG = applyPlayGrowth(prev);
      if (nextG !== prev) AsyncStorage.setItem(KEYS.GROWTH, JSON.stringify(nextG)).catch(() => {});
      return nextG;
    });

    // ミニゲームは「ごはんポイント」だけを生む(光エネルギーは日々の記録から生まれる)

    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    pushDataToCloud();
    } finally {
      completingSlotsRef.current.delete(slot);
    }
  }, [miniGameState, feedState, progress, pushDataToCloud]);

  return (
    <AppContext.Provider
      value={{
        progress,
        records,
        checkedState,
        checklistItems,
        unlockedBadges,
        isLoading,
        newlyUnlockedBadge,
        mascotName,
        feedState,
        syncFeedPoints,
        spendFeedPoints,
        currentSatiety,
        inactivityHours,
        miniGameState,
        profile,
        cloudSynced,
        saveProfile,
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
