/** 日付シードで毎日変わるキャラクターの「今日のできごと」 */

function seededRandom(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967296;
}

export interface DailyActivity {
  emoji: string;
  text: string;
}

const ACTIVITIES: DailyActivity[] = [
  { emoji: '🌼', text: '今日は花を育ててたよ' },
  { emoji: '🌰', text: 'お散歩でどんぐりを拾ってきた！' },
  { emoji: '🎁', text: '君へのプレゼント探してたんだ' },
  { emoji: '🍪', text: 'クッキーを焼いてたとこ！' },
  { emoji: '📖', text: '面白い本を読んでたよ〜' },
  { emoji: '🎵', text: '鼻歌うたいながら掃除してた' },
  { emoji: '🌿', text: '部屋に植物を飾ってみたの' },
  { emoji: '🌟', text: '夢で星の数を数えてたよ' },
  { emoji: '🍵', text: 'お茶まったりしながら君のこと考えてた' },
  { emoji: '🎨', text: 'なんか絵を描いてみたんだ' },
  { emoji: '🌈', text: '虹を見つけて写真に収めた！' },
  { emoji: '🦋', text: '蝶々と追いかけっこしてた！' },
  { emoji: '🍀', text: '四つ葉のクローバー探してたの' },
  { emoji: '⭐', text: '星を見ながらぼーっとしてた' },
  { emoji: '🎀', text: '君のためにリボン結んでたよ' },
  { emoji: '🍓', text: 'いちごジャムを作ってたの！' },
  { emoji: '🧁', text: 'カップケーキのデコ練習してた' },
  { emoji: '🎶', text: '大好きな曲をずっと聴いてたよ' },
  { emoji: '📝', text: '君への手紙を書いてたの' },
  { emoji: '🧩', text: 'パズルやってたけど難しかった〜' },
  { emoji: '🌸', text: '花びらを集めてた！ふわふわ〜' },
  { emoji: '🍄', text: '可愛いきのこ見つけてきた' },
  { emoji: '🌻', text: 'ひまわりの種を数えてたの' },
  { emoji: '🎯', text: '新しいこと挑戦しようと計画中！' },
  { emoji: '🍡', text: 'みたらし団子食べながら休憩してた' },
  { emoji: '🌠', text: '流れ星に3つ願いごとしたよ！' },
  { emoji: '🐾', text: '小動物の足跡を追いかけてた' },
  { emoji: '🌙', text: '月に願いごとしてたとこ' },
  { emoji: '🎪', text: '空想の世界で遊んでたよ' },
  { emoji: '🍁', text: '落ち葉でアート作ってみた' },
  { emoji: '🔭', text: '星を観察してたの。きれいだった〜' },
  { emoji: '🌺', text: 'お庭の花に水をあげてたよ' },
  { emoji: '🦔', text: 'ハリネズミの夢を見てた！' },
  { emoji: '🪁', text: '凧揚げの練習してたの' },
  { emoji: '🫧', text: 'シャボン玉とばして遊んでたよ' },
  { emoji: '🌊', text: '波の音を想像してぼーっとしてた' },
  { emoji: '🪄', text: '魔法の練習をひっそりしてた' },
  { emoji: '🎠', text: 'メリーゴーランドの夢見てた' },
  { emoji: '🌬️', text: '風に乗って旅する夢見てた' },
  { emoji: '🍂', text: 'ぱりぱり落ち葉踏みながら散歩してた' },
];

export function getTodayActivity(): DailyActivity {
  const now = new Date();
  const seed = `activity-${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
  const r = seededRandom(seed);
  return ACTIVITIES[Math.floor(r * ACTIVITIES.length)];
}

export function getAllActivities(): string[] {
  return ACTIVITIES.map((a) => `${a.emoji} ${a.text}`);
}
