import { activityPalette, colors } from '@/constants/theme';
import type { IconName } from '@/components/ui/Icon';
import { getTodayDate } from './dateUtils';

export type GameSlot = 'morning' | 'noon' | 'night';

export const MAX_PLAYS_PER_SLOT = 2; // 1スロットあたり最大プレイ回数

export interface MiniGameState {
  date: string;
  morning: number;
  noon: number;
  night: number;
}

export const DEFAULT_MINI_GAME_STATE: MiniGameState = {
  date: '',
  morning: 0,
  noon: 0,
  night: 0,
};

export function getCurrentSlot(): GameSlot | null {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'noon';
  if (hour >= 18 || hour < 5) return 'night';
  return null;
}

export function getSlotConfig(slot: GameSlot) {
  return {
    morning: {
      label: '朝のゲーム',
      title: '朝のゲーム',
      description: '10秒でタップ！',
      icon: 'sunrise' as IconName,
      color: activityPalette.study,
      time: '5:00〜11:59',
      rewardLabel: 'ごはんポイント 1〜2pt 獲得',
    },
    noon: {
      label: '昼のゲーム',
      title: '昼のゲーム',
      description: 'ラッキーを探そう',
      icon: 'gift' as IconName,
      color: colors.primary,
      time: '12:00〜17:59',
      rewardLabel: 'ランダムでアイテム獲得',
    },
    night: {
      label: '夜のゲーム',
      title: '夜のゲーム',
      description: '10秒でタップ！',
      icon: 'moon' as IconName,
      color: activityPalette.journal,
      time: '18:00〜4:59',
      rewardLabel: 'XP 5〜10 獲得',
    },
  }[slot];
}

/** Returns fresh state if date changed, handles migration from boolean */
export function resolveMiniGameState(stored: MiniGameState | null): MiniGameState {
  const today = getTodayDate();
  if (!stored || stored.date !== today) {
    return { date: today, morning: 0, noon: 0, night: 0 };
  }
  // Migrate from old boolean format
  return {
    date: stored.date,
    morning: typeof stored.morning === 'boolean' ? (stored.morning ? 1 : 0) : (stored.morning || 0),
    noon:    typeof stored.noon    === 'boolean' ? (stored.noon    ? 1 : 0) : (stored.noon    || 0),
    night:   typeof stored.night   === 'boolean' ? (stored.night   ? 1 : 0) : (stored.night   || 0),
  };
}
