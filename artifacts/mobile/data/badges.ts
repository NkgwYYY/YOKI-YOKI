import { activityPalette, colors } from '@/constants/theme';
import type { IconName } from '@/components/ui/Icon';

export interface BadgeDef {
  id: string;
  retired?: boolean;
  name: string;
  description: string;
  /** 単色線画アイコン。絵文字は使わない。 */
  icon: IconName;
  iconColor: string;
}

export const BADGE_DEFINITIONS: BadgeDef[] = [
  {
    id: 'firstStep',
    name: '初めの一歩',
    description: '初めて記録をした',
    icon: 'flag',
    iconColor: activityPalette.exercise,
  },
  {
    id: 'streak3',
    name: '3日連続',
    description: '3日連続で記録した',
    icon: 'repeat',
    iconColor: activityPalette.study,
  },
  {
    id: 'streak7',
    name: '一週間の戦士',
    description: '7日連続で記録した',
    icon: 'shield',
    iconColor: activityPalette.exercise,
  },
  {
    id: 'streak30',
    name: '月間チャンピオン',
    description: '30日連続で記録した',
    icon: 'award',
    iconColor: activityPalette.selfCare,
  },
  {
    id: 'checkMaster',
    name: '完全クリア',
    description: '1日でチェックを全て完了した',
    icon: 'check-circle',
    iconColor: activityPalette.exercise,
  },
  {
    id: 'moodLogger7',
    name: '継続は力なり',
    description: '7日間気分を記録した',
    icon: 'heart',
    iconColor: activityPalette.study,
  },
  {
    id: 'levelUp5',
    name: 'これまでの積み重ね',
    description: '以前の成長の記録から引き継いだ、大切な思い出',
    retired: true,
    icon: 'star',
    iconColor: activityPalette.selfCare,
  },
  {
    id: 'allItems',
    name: '万能トレーナー',
    description: '全カテゴリのチェックを完了した',
    icon: 'award',
    iconColor: colors.primary,
  },
];
