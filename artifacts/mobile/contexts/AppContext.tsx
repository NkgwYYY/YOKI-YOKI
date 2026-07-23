import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
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

export interface DailyRecord {
  id: string;
  date: string;
  mood: number;
  sleep: number;
  behaviors: string[];
  notes: string;
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
  currentSatiety: number;
  inactivityHours: number;
  clearNewBadge: () => void;
  toggleCheckItem: (id: string) => Promise<void>;
  addChecklistItem: (text: string, category: ChecklistCategory) => Promise<void>;
  removeChecklistItem: (id: string) => Promise<void>;
  resetChecklistToDefaults: () => Promise<void>;
  saveRecord: (mood: number, sleep: number, behaviors: string[], notes: string) => Promise<void>;
  getTodayRecord: () => DailyRecord | undefined;
  getCompletedCount: () => number;
  getTotalCheckCount: () => number;
  setMascotName: (name: string) => Promise<void>;
  feedMascot: (foodId: string) => Promise<{ success: boolean; message: string; newSatiety: number }>;
  pushDataToCloud: () => Promise<void>;
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

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const tokenRef = useRef(token);
  useEffect(() => { tokenRef.current = token; }, [token]);

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

  const currentSatiety = computeCurrentSatiety(feedState);

  // ─── Cloud sync helpers ───────────────────────────────────────────────
  const pushDataToCloud = useCallback(async () => {
    const t = tokenRef.current;
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
  }, []);

  const pullDataFromCloud = useCallback(async () => {
    const t = tokenRef.current;
    if (!t) return;
    try {
      const res = await fetch(`${API_BASE}/sync`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (!res.ok) return;
      const { data } = await res.json() as { data: Record<string, unknown> };
      // Write cloud data to AsyncStorage
      await Promise.all(
        Object.entries(data).map(([k, v]) =>
          AsyncStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v))
        )
      );
    } catch { /* ignore */ }
  }, []);

  // ─── Load all data from local storage (+ cloud on login) ─────────────
  useEffect(() => {
    loadAll();
  }, []);

  // When token arrives (user logs in), pull cloud data and reload
  const prevToken = useRef<string | null>(null);
  useEffect(() => {
    if (token && token !== prevToken.current) {
      prevToken.current = token;
      (async () => {
        await pullDataFromCloud();
        await loadAll();
      })();
    }
    if (!token) prevToken.current = null;
  }, [token]);

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
      const [progressStr, recordsStr, checkedStr, legacyCustomStr, checklistStr, badgesStr, nameStr, feedStr, lastOpenedStr] =
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
        ]);

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
      if (feedStr)     setFeedState(JSON.parse(feedStr));
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

  const saveFeedState = async (next: FeedState) => {
    setFeedState(next);
    await AsyncStorage.setItem(KEYS.FEED_STATE, JSON.stringify(next));
  };

  const feedMascot = useCallback(
    async (foodId: string): Promise<{ success: boolean; message: string; newSatiety: number }> => {
      const food = FOOD_ITEMS.find((f) => f.id === foodId);
      if (!food) return { success: false, message: 'Unknown food', newSatiety: currentSatiety };
      if (feedState.points < food.cost) {
        return { success: false, message: 'ポイントが足りないよ！', newSatiety: currentSatiety };
      }

      const baseSatiety = computeCurrentSatiety(feedState);
      const newSatiety = Math.min(100, baseSatiety + food.satietyGain);
      const next: FeedState = {
        points: feedState.points - food.cost,
        lastFeedTime: new Date().toISOString(),
        satietyAtFeed: newSatiety,
      };
      await saveFeedState(next);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return { success: true, message: `${food.name}をあげたよ！`, newSatiety };
    },
    [feedState, currentSatiety]
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
        const nextFeed: FeedState = { ...feedState, points: feedState.points + fpGain };
        await saveFeedState(nextFeed);
      }

      if (nowChecked) await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const allChecked = newItems.every((i) => i.checked);
      await checkAndUnlockBadges(unlockedBadges, newProgress, records, allChecked);

      // Sync to cloud (fire-and-forget)
      pushDataToCloud();
    },
    [checkedState, progress, unlockedBadges, records, feedState, checkAndUnlockBadges, pushDataToCloud]
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
    async (mood: number, sleep: number, behaviors: string[], notes: string) => {
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
        const nextFeed: FeedState = { ...feedState, points: feedState.points + FP_PER_MOOD_RECORD };
        await saveFeedState(nextFeed);
      }

      const allChecked = checkedState.items.every((i) => i.checked);
      await checkAndUnlockBadges(unlockedBadges, newProgress, newRecords, allChecked);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Sync to cloud (fire-and-forget)
      pushDataToCloud();
    },
    [records, progress, unlockedBadges, checkedState, feedState, checkAndUnlockBadges, pushDataToCloud]
  );

  const getTodayRecord = useCallback((): DailyRecord | undefined => {
    const today = getTodayDate();
    return records.find((r) => r.date === today);
  }, [records]);

  const getCompletedCount = useCallback(() => checkedState.items.filter((i) => i.checked).length, [checkedState]);
  const getTotalCheckCount = useCallback(() => checkedState.items.length, [checkedState]);
  const clearNewBadge = useCallback(() => setNewlyUnlockedBadge(null), []);

  const setMascotName = useCallback(async (name: string) => {
    setMascotNameState(name);
    await AsyncStorage.setItem(KEYS.MASCOT_NAME, name);
    pushDataToCloud();
  }, [pushDataToCloud]);

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
        currentSatiety,
        inactivityHours,
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
        pushDataToCloud,
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
