/**
 * 活動カウント(今日の記録の「やったこと」)の共通定義。
 * 記録タブのカウンターと成長タブの集計で共用する。
 */
export interface ActivityDef {
  key: string;
  label: string;
  icon: string;   // Ionicons name
  color: string;
}

export const ACTIVITY_DEFS: ActivityDef[] = [
  { key: 'reading', label: '読書', icon: 'book-outline', color: '#9F8CFF' },
  { key: 'exercise', label: '運動', icon: 'walk-outline', color: '#64FFDA' },
  { key: 'study', label: '勉強・学習', icon: 'school-outline', color: '#FFB86B' },
  { key: 'journal', label: '日記・振り返り', icon: 'create-outline', color: '#7FDCA4' },
  { key: 'earlySleep', label: '早く寝る', icon: 'moon-outline', color: '#8AB4FF' },
  { key: 'selfCare', label: '自分を大切に', icon: 'heart-outline', color: '#FF6FA3' },
];

/** 1日分のカウント合計 */
export function totalActivityCount(a?: Record<string, number>): number {
  if (!a) return 0;
  return Object.values(a).reduce((s, n) => s + (n || 0), 0);
}
