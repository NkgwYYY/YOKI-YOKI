export type ChecklistCategory = 'body' | 'mind' | 'social';

export interface ChecklistItemDef {
  id: string;
  text: string;
  category: ChecklistCategory;
  isDefault: boolean;
}

export const DEFAULT_CHECKLIST_ITEMS: ChecklistItemDef[] = [
  { id: 'c1', text: '深呼吸を5回した', category: 'body', isDefault: true },
  { id: 'c2', text: '水を1L以上飲んだ', category: 'body', isDefault: true },
  { id: 'c3', text: '体を動かした', category: 'body', isDefault: true },
  { id: 'c4', text: '7時間以上眠れた', category: 'body', isDefault: true },
  { id: 'c5', text: '今日の感謝を3つ思い浮かべた', category: 'mind', isDefault: true },
  { id: 'c6', text: '自分を褒める時間を持った', category: 'mind', isDefault: true },
  { id: 'c7', text: 'スマホを30分間休んだ', category: 'mind', isDefault: true },
  { id: 'c8', text: '好きなことを楽しんだ', category: 'mind', isDefault: true },
  { id: 'c9', text: '誰かと会話した', category: 'social', isDefault: true },
  { id: 'c10', text: '誰かを気にかけた', category: 'social', isDefault: true },
];

export const CATEGORY_LABELS: Record<ChecklistCategory, string> = {
  body: 'からだ',
  mind: 'こころ',
  social: 'つながり',
};

export const CATEGORY_COLORS_LIGHT: Record<ChecklistCategory, string> = {
  body: '#00B894',
  mind: '#FF6B35',
  social: '#FFB800',
};

export const CATEGORY_COLORS_DARK: Record<ChecklistCategory, string> = {
  body: '#00D4AA',
  mind: '#FF6B35',
  social: '#FFB800',
};
