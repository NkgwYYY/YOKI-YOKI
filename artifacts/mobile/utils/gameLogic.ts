export const XP_FOR_CHECKLIST_ITEM = 10;
export const XP_FOR_MOOD_RECORD = 15;
export const XP_FULL_DAY_BONUS = 20;
export const XP_PER_LEVEL = 200;

export const calculateLevel = (experience: number): number => {
  return Math.floor(experience / XP_PER_LEVEL) + 1;
};

export const calculateMentalMuscle = (experience: number): number => {
  return ((experience % XP_PER_LEVEL) / XP_PER_LEVEL) * 100;
};

export const xpToNextLevel = (experience: number): number => {
  return XP_PER_LEVEL - (experience % XP_PER_LEVEL);
};

export const getMotivationalMessage = (level: number, streak: number): string => {
  if (streak >= 7) return `${streak}日連続！すごい継続力です`;
  if (streak >= 3) return `${streak}日連続中。この調子で続けましょう`;
  if (level >= 5) return 'レベル5達成！メンタル筋肉が育ってきた';
  if (level >= 3) return 'レベル3到達！確実に成長しています';
  return '小さな積み重ねが大きな変化を生む';
};
