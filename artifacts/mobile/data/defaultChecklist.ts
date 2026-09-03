import { categoryPalette } from '@/constants/theme';
import type { IconName } from '@/components/ui/Icon';
export type ChecklistCategory = 'basics' | 'body' | 'mind' | 'social';

export interface ChecklistItemDef {
  id: string;
  text: string;
  category: ChecklistCategory;
  isDefault: boolean;
}

export const DEFAULT_CHECKLIST_ITEMS: ChecklistItemDef[] = [
  // ── きほんのき ──────────────────────────────────────────
  { id: 'b1', text: 'お風呂やシャワーを浴びた',      category: 'basics', isDefault: true },
  { id: 'b2', text: '3食ちゃんと食べた',              category: 'basics', isDefault: true },
  { id: 'b3', text: '朝日を浴びた',                   category: 'basics', isDefault: true },
  { id: 'b4', text: '歯磨きをした',                   category: 'basics', isDefault: true },
  { id: 'b5', text: '着替えた',                       category: 'basics', isDefault: true },
  { id: 'b6', text: '外の空気を吸った',               category: 'basics', isDefault: true },
  // ── からだ ───────────────────────────────────────────────
  { id: 'c1', text: '深呼吸を5回した',               category: 'body',   isDefault: true },
  { id: 'c2', text: '水を1L以上飲んだ',              category: 'body',   isDefault: true },
  { id: 'c3', text: '体を動かした',                  category: 'body',   isDefault: true },
  { id: 'c4', text: '7時間以上眠れた',               category: 'body',   isDefault: true },
  // ── こころ ───────────────────────────────────────────────
  { id: 'c5', text: '今日の感謝を3つ思い浮かべた',  category: 'mind',   isDefault: true },
  { id: 'c6', text: '自分を褒める時間を持った',      category: 'mind',   isDefault: true },
  { id: 'c7', text: 'スマホを30分間休んだ',          category: 'mind',   isDefault: true },
  { id: 'c8', text: '好きなことを楽しんだ',          category: 'mind',   isDefault: true },
  // ── つながり ────────────────────────────────────────────
  { id: 'c9',  text: '誰かと会話した',               category: 'social', isDefault: true },
  { id: 'c10', text: '誰かを気にかけた',             category: 'social', isDefault: true },
];

export const CATEGORY_ORDER: ChecklistCategory[] = ['basics', 'body', 'mind', 'social'];

export const CATEGORY_LABELS: Record<ChecklistCategory, string> = {
  basics: 'きほんのき',
  body:   'からだ',
  mind:   'こころ',
  social: 'つながり',
};

export const CATEGORY_ICONS: Record<ChecklistCategory, IconName> = {
  basics: 'sun',
  body:   'activity',
  mind:   'heart',
  social: 'users',
};

/**
 * カテゴリの色。テーマは 1 つなので明暗の出し分けは持たない。
 * （旧 CATEGORY_COLORS_LIGHT / _DARK を統合したもの）
 */
export const CATEGORY_COLORS: Record<ChecklistCategory, string> = categoryPalette;
