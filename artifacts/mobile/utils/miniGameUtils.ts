import { getTodayDate } from './dateUtils';

export type GameSlot = 'morning' | 'noon' | 'night';

export interface MiniGameState {
  date: string;
  morning: boolean;
  noon: boolean;
  night: boolean;
}

export const DEFAULT_MINI_GAME_STATE: MiniGameState = {
  date: '',
  morning: false,
  noon: false,
  night: false,
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
      title: '☀️ 朝日を集めよう',
      description: '10秒で太陽をタップ！',
      emoji: '☀️',
      color: '#FFB347',
      gradient: ['#FFD700', '#FFB347'] as const,
      time: '5:00〜11:59',
      rewardLabel: '🪙 1〜2pt 獲得',
    },
    noon: {
      label: '昼のゲーム',
      title: '☕ おやつ探し',
      description: '3つの宝箱から1つ選ぼう',
      emoji: '🎁',
      color: '#7C3AED',
      gradient: ['#A855F7', '#7C3AED'] as const,
      time: '12:00〜17:59',
      rewardLabel: 'ランダムでアイテム獲得',
    },
    night: {
      label: '夜のゲーム',
      title: '🌙 星集め',
      description: '10秒で流れ星をタップ！',
      emoji: '⭐',
      color: '#3B82F6',
      gradient: ['#6366F1', '#3B82F6'] as const,
      time: '18:00〜4:59',
      rewardLabel: '✨ XP 5〜10 獲得',
    },
  }[slot];
}

/** Returns fresh state if date changed */
export function resolveMiniGameState(stored: MiniGameState | null): MiniGameState {
  const today = getTodayDate();
  if (!stored || stored.date !== today) {
    return { date: today, morning: false, noon: false, night: false };
  }
  return stored;
}
