export type FoodRarity = 'common' | 'rare' | 'special';

export interface FoodItem {
  id: string;
  emoji: string;
  name: string;
  description: string;
  cost: number;
  satietyGain: number; // 0-100
  rarity: FoodRarity;
}

export const FOOD_ITEMS: FoodItem[] = [
  {
    id: 'berry',
    emoji: '🍒',
    name: 'きのみ',
    description: 'ちょっとだけ元気になるよ',
    cost: 5,
    satietyGain: 15,
    rarity: 'common',
  },
  {
    id: 'apple',
    emoji: '🍎',
    name: 'りんご',
    description: '甘くておいしい！',
    cost: 10,
    satietyGain: 28,
    rarity: 'common',
  },
  {
    id: 'candy',
    emoji: '🍬',
    name: 'キャンディ',
    description: 'とろーっとあまい',
    cost: 20,
    satietyGain: 38,
    rarity: 'common',
  },
  {
    id: 'cake',
    emoji: '🍰',
    name: 'ケーキ',
    description: 'とくべつなごちそう！',
    cost: 40,
    satietyGain: 58,
    rarity: 'rare',
  },
  {
    id: 'ramen',
    emoji: '🍜',
    name: 'ラーメン',
    description: 'がっつりお腹いっぱい！',
    cost: 60,
    satietyGain: 75,
    rarity: 'rare',
  },
  {
    id: 'special',
    emoji: '🌟',
    name: 'スペシャルごはん',
    description: '世界一おいしいごはん！',
    cost: 100,
    satietyGain: 100,
    rarity: 'special',
  },
];

// Feed points earned per action
export const FP_PER_CHECKLIST_ITEM = 2;
export const FP_PER_FULL_DAY_BONUS = 10;
export const FP_PER_MOOD_RECORD = 5;

// Satiety decays: 100 → 0 over 24 hours = ~4.17/hr
export const SATIETY_DECAY_PER_HOUR = 100 / 24;

export const RARITY_COLORS: Record<FoodRarity, { bg: string; text: string; border: string }> = {
  common:  { bg: '#F0F5FF', text: '#6B7280', border: '#E2E8F0' },
  rare:    { bg: '#EDE9FE', text: '#7C3AED', border: '#C4B5FD' },
  special: { bg: '#FEF3C7', text: '#D97706', border: '#FCD34D' },
};
