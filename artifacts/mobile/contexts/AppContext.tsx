import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { DEFAULT_CHECKLIST_ITEMS, ChecklistItemDef } from '@/data/defaultChecklist';
import { BADGE_DEFINITIONS } from '@/data/badges';
import { getTodayDate, getYesterdayDate } from '@/utils/dateUtils';
import {
  calculateLevel,
  calculateMentalMuscle,
  XP_FOR_CHECKLIST_ITEM,
  XP_FOR_MOOD_RECORD,
  XP_FULL_DAY_BONUS,
} from '@/utils/gameLogic';

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

const KEYS = {
  PROGRESS: '@mentore/progress_v2',
  RECORDS: '@mentore/records_v2',
  CHECKED_STATE: '@mentore/checked_state_v2',
  CUSTOM_ITEMS: '@mentore/custom_items_v2',
  BADGES: '@mentore/badges_v2',
};

interface AppContextType {
  progress: UserProgress;
  records: DailyRecord[];
  checkedState: CheckedState;
  customItems: ChecklistItemDef[];
  unlockedBadges: UnlockedBadge[];
  isLoading: boolean;
  newlyUnlockedBadge: string | null;
  clearNewBadge: () => void;
  toggleCheckItem: (id: string) => Promise<void>;
  addCustomItem: (text: string) => Promise<void>;
  saveRecord: (mood: number, sleep: number, behaviors: string[], notes: string) => Promise<void>;
  getTodayRecord: () => DailyRecord | undefined;
  getCompletedCount: () => number;
  getTotalCheckCount: () => number;
}

const defaultProgress: UserProgress = {
  level: 1,
  experience: 0,
  mentalMuscle: 0,
  streak: 0,
  totalDays: 0,
  lastRecordDate: '',
};

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [progress, setProgress] = useState<UserProgress>(defaultProgress);
  const [records, setRecords] = useState<DailyRecord[]>([]);
  const [checkedState, setCheckedState] = useState<CheckedState>({
    date: '',
    items: [],
    bonusEarned: false,
  });
  const [customItems, setCustomItems] = useState<ChecklistItemDef[]>([]);
  const [unlockedBadges, setUnlockedBadges] = useState<UnlockedBadge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newlyUnlockedBadge, setNewlyUnlockedBadge] = useState<string | null>(null);

  useEffect(() => {
    loadAll();
  }, []);

  const buildFreshCheckedState = (customs: ChecklistItemDef[]): CheckedState => {
    const today = getTodayDate();
    const allItems = [...DEFAULT_CHECKLIST_ITEMS, ...customs];
    return {
      date: today,
      items: allItems.map((item) => ({ id: item.id, checked: false, xpEarned: false })),
      bonusEarned: false,
    };
  };

  const loadAll = async () => {
    try {
      const [progressStr, recordsStr, checkedStr, customStr, badgesStr] = await Promise.all([
        AsyncStorage.getItem(KEYS.PROGRESS),
        AsyncStorage.getItem(KEYS.RECORDS),
        AsyncStorage.getItem(KEYS.CHECKED_STATE),
        AsyncStorage.getItem(KEYS.CUSTOM_ITEMS),
        AsyncStorage.getItem(KEYS.BADGES),
      ]);

      const today = getTodayDate();
      const loadedCustom: ChecklistItemDef[] = customStr ? JSON.parse(customStr) : [];

      if (progressStr) setProgress(JSON.parse(progressStr));
      if (recordsStr) setRecords(JSON.parse(recordsStr));
      if (badgesStr) setUnlockedBadges(JSON.parse(badgesStr));
      setCustomItems(loadedCustom);

      if (checkedStr) {
        const state: CheckedState = JSON.parse(checkedStr);
        if (state.date === today) {
          setCheckedState(state);
        } else {
          const fresh = buildFreshCheckedState(loadedCustom);
          setCheckedState(fresh);
          await AsyncStorage.setItem(KEYS.CHECKED_STATE, JSON.stringify(fresh));
        }
      } else {
        const fresh = buildFreshCheckedState(loadedCustom);
        setCheckedState(fresh);
        await AsyncStorage.setItem(KEYS.CHECKED_STATE, JSON.stringify(fresh));
      }
    } catch (e) {
      // If load fails, use defaults
    } finally {
      setIsLoading(false);
    }
  };

  const checkAndUnlockBadges = useCallback(
    async (
      currentBadges: UnlockedBadge[],
      newProgress: UserProgress,
      newRecords: DailyRecord[],
      allChecked: boolean
    ) => {
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
      if (nowChecked && !currentItem.xpEarned) {
        xpGain = XP_FOR_CHECKLIST_ITEM;
      }

      const newItems = checkedState.items.map((i) =>
        i.id === id ? { ...i, checked: nowChecked, xpEarned: nowChecked ? true : i.xpEarned } : i
      );

      const allDefaultChecked = DEFAULT_CHECKLIST_ITEMS.every((def) => {
        const found = newItems.find((i) => i.id === def.id);
        return found?.checked ?? false;
      });

      let bonusXp = 0;
      let newBonusEarned = checkedState.bonusEarned;
      if (allDefaultChecked && !checkedState.bonusEarned) {
        bonusXp = XP_FULL_DAY_BONUS;
        newBonusEarned = true;
      }

      const newState: CheckedState = {
        ...checkedState,
        items: newItems,
        bonusEarned: newBonusEarned,
      };

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

      if (nowChecked) {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      const allChecked = newItems.every((i) => i.checked);
      await checkAndUnlockBadges(unlockedBadges, newProgress, records, allChecked);
    },
    [checkedState, progress, unlockedBadges, records, checkAndUnlockBadges]
  );

  const addCustomItem = useCallback(
    async (text: string) => {
      const id = `custom_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      const newItem: ChecklistItemDef = {
        id,
        text,
        category: 'mind',
        isDefault: false,
      };
      const newCustom = [...customItems, newItem];
      const newChecked: CheckedState = {
        ...checkedState,
        items: [...checkedState.items, { id, checked: false, xpEarned: false }],
      };

      setCustomItems(newCustom);
      setCheckedState(newChecked);
      await AsyncStorage.setItem(KEYS.CUSTOM_ITEMS, JSON.stringify(newCustom));
      await AsyncStorage.setItem(KEYS.CHECKED_STATE, JSON.stringify(newChecked));
    },
    [customItems, checkedState]
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

      const allChecked = checkedState.items.every((i) => i.checked);
      await checkAndUnlockBadges(unlockedBadges, newProgress, newRecords, allChecked);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    [records, progress, unlockedBadges, checkedState, checkAndUnlockBadges]
  );

  const getTodayRecord = useCallback((): DailyRecord | undefined => {
    const today = getTodayDate();
    return records.find((r) => r.date === today);
  }, [records]);

  const getCompletedCount = useCallback((): number => {
    return checkedState.items.filter((i) => i.checked).length;
  }, [checkedState]);

  const getTotalCheckCount = useCallback((): number => {
    return checkedState.items.length;
  }, [checkedState]);

  const clearNewBadge = useCallback(() => setNewlyUnlockedBadge(null), []);

  return (
    <AppContext.Provider
      value={{
        progress,
        records,
        checkedState,
        customItems,
        unlockedBadges,
        isLoading,
        newlyUnlockedBadge,
        clearNewBadge,
        toggleCheckItem,
        addCustomItem,
        saveRecord,
        getTodayRecord,
        getCompletedCount,
        getTotalCheckCount,
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
