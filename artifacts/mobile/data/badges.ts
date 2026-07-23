export interface BadgeDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  iconColor: string;
}

export const BADGE_DEFINITIONS: BadgeDef[] = [
  {
    id: 'firstStep',
    name: '初めの一歩',
    description: '初めて記録をした',
    icon: 'footsteps-outline',
    iconColor: '#00D4AA',
  },
  {
    id: 'streak3',
    name: '3日連続',
    description: '3日連続で記録した',
    icon: 'flame-outline',
    iconColor: '#FF6B35',
  },
  {
    id: 'streak7',
    name: '一週間の戦士',
    description: '7日連続で記録した',
    icon: 'shield-checkmark-outline',
    iconColor: '#00D4AA',
  },
  {
    id: 'streak30',
    name: '月間チャンピオン',
    description: '30日連続で記録した',
    icon: 'trophy-outline',
    iconColor: '#FFB800',
  },
  {
    id: 'checkMaster',
    name: '完全クリア',
    description: '1日でチェックを全て完了した',
    icon: 'checkmark-done-circle-outline',
    iconColor: '#00D4AA',
  },
  {
    id: 'moodLogger7',
    name: '継続は力なり',
    description: '7日間気分を記録した',
    icon: 'heart-outline',
    iconColor: '#FF6B35',
  },
  {
    id: 'levelUp5',
    name: 'レベル5達成',
    description: 'メンタルレベル5に到達した',
    icon: 'star-outline',
    iconColor: '#FFB800',
  },
  {
    id: 'allItems',
    name: '万能トレーナー',
    description: '全カテゴリのチェックを完了した',
    icon: 'ribbon-outline',
    iconColor: '#7C3AED',
  },
];
