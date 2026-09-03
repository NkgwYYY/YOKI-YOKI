/**
 * 活動カウント(今日の記録の「やったこと」)の共通定義。
 * 記録タブのカウンターと成長タブの集計で共用する。
 * 色はデザインシステムの activityPalette が唯一の出どころ。
 */
import { activityPalette } from '@/constants/theme';
import type { IconName } from '@/components/ui/Icon';

export interface ActivityDef {
  key: string;
  label: string;
  /** 単色線画アイコン。絵文字は使わない。 */
  icon: IconName;
  color: string;
}

export const ACTIVITY_DEFS: ActivityDef[] = [
  { key: 'reading', label: '読書', icon: 'book-open', color: activityPalette.reading },
  { key: 'exercise', label: '運動', icon: 'activity', color: activityPalette.exercise },
  { key: 'study', label: '勉強・学習', icon: 'book', color: activityPalette.study },
  { key: 'journal', label: '日記・振り返り', icon: 'edit-3', color: activityPalette.journal },
  { key: 'earlySleep', label: '早く寝る', icon: 'moon', color: activityPalette.earlySleep },
  { key: 'selfCare', label: '自分を大切に', icon: 'heart', color: activityPalette.selfCare },
];

/** 1日分のカウント合計 */
export function totalActivityCount(a?: Record<string, number>): number {
  if (!a) return 0;
  return Object.values(a).reduce((s, n) => s + (n || 0), 0);
}
