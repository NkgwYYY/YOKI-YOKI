import { DailyRecord, UserProgress } from '@/contexts/AppContext';

export type MascotStage = 'egg' | 'odango' | 'stage3' | 'stage4' | 'stage5';
export type MascotMood = 'excited' | 'happy' | 'normal' | 'grumpy' | 'tired' | 'sleepy';
export type IdleBehavior = 'rolling' | 'sleeping' | 'playing' | 'normal';
/* 内部キーは保存データ互換のため heart/star/crown のまま。
   表示上は heart=食物タイプ, crown=植物タイプ, star=動物タイプ */
export type EvolutionType = 'heart' | 'star' | 'crown';

export const EVOLUTION_TYPE_INFO: Record<EvolutionType, {
  name: string; emoji: string; desc: string; body: string; accent: string; hint: string;
}> = {
  heart: {
    name: '食物タイプ',  emoji: '🍙',
    desc:  '感情豊かで優しい心の持ち主',
    hint:  '気分を記録するほど育っていく',
    body: '#FF80AB', accent: '#FF4081',
  },
  star: {
    name: '動物タイプ', emoji: '🐾',
    desc:  '継続力と活力あふれる存在',
    hint:  '睡眠と連続記録で元気に育つ',
    body: '#FFB74D', accent: '#EF6C00',
  },
  crown: {
    name: '植物タイプ', emoji: '🌱',
    desc:  '行動力とやる気の達人',
    hint:  'チェックを重ねるとすくすく育つ',
    body: '#81C784', accent: '#2E7D32',
  },
};

/* ── ステージ×タイプごとのキャラクター ──
   1〜2段階目は全タイプ共通。3段階目からタイプで見た目が分かれる。
   植物タイプの5段階目は未定のため、決まるまで4段階目(カラフルはっぱ)を継続表示 */
export type CharacterKey =
  | 'egg' | 'odango'
  | 'onigiri' | 'tako' | 'ebifurai'          // 食物タイプ
  | 'happa' | 'colorful_happa'               // 植物タイプ
  | 'neko' | 'usagi' | 'lion';               // 動物タイプ

export function getCharacter(
  stage: MascotStage,
  evolutionType?: EvolutionType | null,
): { key: CharacterKey; name: string } {
  if (stage === 'egg') return { key: 'egg', name: 'たまご' };
  if (stage === 'odango') return { key: 'odango', name: 'おだんご' };
  const t: EvolutionType = evolutionType ?? 'star';
  const table: Record<'stage3' | 'stage4' | 'stage5', Record<EvolutionType, { key: CharacterKey; name: string }>> = {
    stage3: {
      heart: { key: 'onigiri',        name: '塩おにぎり' },
      crown: { key: 'happa',          name: 'はっぱ' },
      star:  { key: 'neko',           name: 'ねこ' },
    },
    stage4: {
      heart: { key: 'tako',           name: 'タコ' },
      crown: { key: 'colorful_happa', name: 'カラフルはっぱ' },
      star:  { key: 'usagi',          name: 'うさぎ' },
    },
    stage5: {
      heart: { key: 'ebifurai',       name: 'エビフライ' },
      crown: { key: 'colorful_happa', name: 'カラフルはっぱ' }, // 5段階目キャラは検討中
      star:  { key: 'lion',           name: 'ライオン' },
    },
  };
  return table[stage][t];
}

/**
 * 蓄積した記録からどの系統かを判定する。
 * - happinessScore : 気分記録の平均
 * - vitalityScore  : 睡眠平均 + 連続日数
 * - activityScore  : 1日あたり行動チェック数
 */
export function calcEvolutionType(
  records: DailyRecord[],
  streak: number,
): EvolutionType {
  if (records.length === 0) return 'star';

  const avgMood      = records.reduce((s, r) => s + r.mood, 0) / records.length;
  const happinessScore = ((avgMood - 1) / 4) * 100;

  const avgSleep     = records.reduce((s, r) => s + (r.sleep ?? 0), 0) / records.length;
  const vitalityScore  = Math.min(100, (avgSleep / 8) * 55 + Math.min(streak, 30) * 1.5);

  const avgBehaviors = records.reduce((s, r) => s + r.behaviors.length, 0) / records.length;
  const activityScore  = Math.min(100, avgBehaviors * 25);

  if (happinessScore >= vitalityScore && happinessScore >= activityScore) return 'heart';
  if (activityScore >= vitalityScore) return 'crown';
  return 'star';
}

/** Lv6未満のchick段階で「どの系統になりそうか」を予告する */
export function calcDevelopingType(
  records: DailyRecord[],
  streak: number,
): EvolutionType {
  return calcEvolutionType(records, streak);
}

/** 進化系統を加味したステージカラーを返す */
export function getStageColors(
  stage: MascotStage,
  evolutionType?: EvolutionType | null,
): { body: string; accent: string } {
  if ((stage === 'stage3' || stage === 'stage4' || stage === 'stage5') && evolutionType) {
    const t = EVOLUTION_TYPE_INFO[evolutionType];
    return { body: t.body, accent: t.accent };
  }
  return STAGE_COLORS[stage];
}

export const STAGE_LEVEL_MAP: { stage: MascotStage; minLevel: number; name: string; desc: string }[] = [
  { stage: 'egg',    minLevel: 1,  name: 'たまご',   desc: 'まだ眠っている…' },
  { stage: 'odango', minLevel: 3,  name: 'おだんご', desc: 'すこしずつ育っています' },
  { stage: 'stage3', minLevel: 6,  name: '3段階目',  desc: '元気いっぱいです！' },
  { stage: 'stage4', minLevel: 15, name: '4段階目',  desc: 'ぐんぐん育っています' },
  { stage: 'stage5', minLevel: 25, name: '5段階目',  desc: 'メンタルの達人' },
];

/** タイプを加味した表示用ステージ名（キャラクター名） */
export function getStageName(
  stage: MascotStage,
  evolutionType?: EvolutionType | null,
): string {
  return getCharacter(stage, evolutionType).name;
}

export function getMascotStage(level: number): MascotStage {
  let result: MascotStage = 'egg';
  for (const s of STAGE_LEVEL_MAP) {
    if (level >= s.minLevel) result = s.stage;
  }
  return result;
}

export function getNextStageLevel(level: number): number | null {
  for (let i = 0; i < STAGE_LEVEL_MAP.length - 1; i++) {
    if (level < STAGE_LEVEL_MAP[i + 1].minLevel) return STAGE_LEVEL_MAP[i + 1].minLevel;
  }
  return null;
}

/** Pick a random idle behavior for this app-open session */
export function pickIdleBehavior(): IdleBehavior {
  // Weighted: normal appears more often so it doesn't feel annoying
  const options: IdleBehavior[] = [
    'rolling', 'sleeping', 'playing',
    'normal', 'normal', 'normal', 'normal',
  ];
  return options[Math.floor(Math.random() * options.length)];
}

export function getMascotMood(
  progress: UserProgress,
  todayRecord: DailyRecord | undefined,
  completedCount: number,
  totalCount: number,
  extra?: {
    inactivityHours?: number; // hours since last app open
    satiety?: number;         // 0-100
    variance?: number;        // 0-1 random value fixed per session for mood variation
  }
): MascotMood {
  const hour = new Date().getHours();
  const inactivity = extra?.inactivityHours ?? 0;
  const satiety = extra?.satiety ?? 70;
  const v = extra?.variance ?? 0;

  // Night time → sleepy
  if (hour >= 22 || hour < 6) return 'sleepy';

  // Very long absence (24h+) → tired regardless of anything else
  if (inactivity >= 24) return 'tired';

  // Very hungry → tired
  if (satiety <= 10) return 'tired';

  // All tasks done AND reasonably full AND not absent too long → excited
  if (totalCount > 0 && completedCount === totalCount && satiety > 30 && inactivity < 12) return 'excited';

  // Good mood record AND streak going → happy (as long as not starving)
  if (todayRecord && todayRecord.mood >= 4 && progress.streak >= 3 && satiety > 20) return 'happy';

  // Moderate inactivity (8-24h) or quite hungry → tired
  if (inactivity >= 8 || satiety <= 25) return 'tired';

  // No record and no streak → tired
  if (!todayRecord && progress.streak === 0) return 'tired';

  // Grumpy variations — streak exists but no record yet today: 40% chance
  if (!todayRecord && progress.streak > 0 && v < 0.40) return 'grumpy';

  // Random grumpy: 20% of otherwise-normal sessions
  if (v < 0.20) return 'grumpy';

  return 'normal';
}

export const MOOD_MESSAGES: Record<MascotMood, string[]> = {
  excited: [
    '全部できた！最高だね✨',
    'すごい！パーフェクトだよ！',
    'やったね！今日も輝いてる！',
  ],
  happy: [
    'いい調子！その調子で！',
    '連続記録中〜！えらい！',
    'とっても嬉しいな〜！',
  ],
  normal: [
    '今日も一緒に頑張ろう！',
    'できることからはじめよう',
    '小さな一歩が大きな変化を作るよ',
  ],
  grumpy: [
    'べつに…ふん。',
    'きょう、きてくれると思ってなかったし。',
    'おそいんだけど〜。',
    'もう少し早く来てほしかったな…',
    '…ちょっとはさびしかったかも。',
    'なんでもない。ふつうだし。',
    'きのうから待ってたし。べつに。',
  ],
  tired: [
    'お腹すいたよ〜🥺',
    'もっとかまってほしいな…',
    'さみしかった…会いに来てくれてよかった',
  ],
  sleepy: [
    'おやすみ〜 ゆっくり休んでね',
    'よく眠れそう？明日も頑張ろう',
    'もう夜だよ。そろそろ休もう？',
  ],
};

export function getMascotMessage(mood: MascotMood): string {
  const msgs = MOOD_MESSAGES[mood];
  const idx = Math.floor(Date.now() / (1000 * 60 * 15)) % msgs.length;
  return msgs[idx];
}

export interface StatusParams {
  vitality: number;
  happiness: number;
  activity: number;
}

export function calcStatus(
  todayRecord: DailyRecord | undefined,
  completedCount: number,
  totalCount: number,
  streak: number
): StatusParams {
  const sleep = todayRecord?.sleep ?? 0;
  const mood = todayRecord?.mood ?? 0;

  const vitality = todayRecord
    ? Math.min(100, Math.round((Math.min(sleep, 9) / 9) * 70 + streak * 3))
    : Math.max(0, streak * 5);

  const happiness = todayRecord
    ? Math.round(((mood - 1) / 4) * 100)
    : Math.max(0, streak * 8);

  const activity = totalCount > 0
    ? Math.round((completedCount / totalCount) * 100)
    : 0;

  return { vitality, happiness, activity };
}

export const STAGE_COLORS: Record<MascotStage, { body: string; accent: string }> = {
  egg:    { body: '#E8D9F8', accent: '#C9B8E8' },
  odango: { body: '#F8D9E8', accent: '#E8A8C8' },
  stage3: { body: '#B3EDDE', accent: '#00C4A7' },
  stage4: { body: '#00D4AA', accent: '#64FFDA' },
  stage5: { body: '#FFD166', accent: '#FF6FA3' },
};
