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
  text: string;
}

const ACTIVITIES: DailyActivity[] = [
  { text: '今日は花を育ててたよ' },
  { text: 'お散歩でどんぐりを拾ってきた！' },
  { text: '君へのプレゼント探してたんだ' },
  { text: 'クッキーを焼いてたとこ！' },
  { text: '面白い本を読んでたよ〜' },
  { text: '鼻歌うたいながら掃除してた' },
  { text: '部屋に植物を飾ってみたの' },
  { text: '夢で星の数を数えてたよ' },
  { text: 'お茶まったりしながら君のこと考えてた' },
  { text: 'なんか絵を描いてみたんだ' },
  { text: '虹を見つけて写真に収めた！' },
  { text: '蝶々と追いかけっこしてた！' },
  { text: '四つ葉のクローバー探してたの' },
  { text: '星を見ながらぼーっとしてた' },
  { text: '君のためにリボン結んでたよ' },
  { text: 'いちごジャムを作ってたの！' },
  { text: 'カップケーキのデコ練習してた' },
  { text: '大好きな曲をずっと聴いてたよ' },
  { text: '君への手紙を書いてたの' },
  { text: 'パズルやってたけど難しかった〜' },
  { text: '花びらを集めてた！ふわふわ〜' },
  { text: '可愛いきのこ見つけてきた' },
  { text: 'ひまわりの種を数えてたの' },
  { text: '新しいこと挑戦しようと計画中！' },
  { text: 'みたらし団子食べながら休憩してた' },
  { text: '流れ星に3つ願いごとしたよ！' },
  { text: '小動物の足跡を追いかけてた' },
  { text: '月に願いごとしてたとこ' },
  { text: '空想の世界で遊んでたよ' },
  { text: '落ち葉でアート作ってみた' },
  { text: '星を観察してたの。きれいだった〜' },
  { text: 'お庭の花に水をあげてたよ' },
  { text: 'ハリネズミの夢を見てた！' },
  { text: '凧揚げの練習してたの' },
  { text: 'シャボン玉とばして遊んでたよ' },
  { text: '波の音を想像してぼーっとしてた' },
  { text: '魔法の練習をひっそりしてた' },
  { text: 'メリーゴーランドの夢見てた' },
  { text: '風に乗って旅する夢見てた' },
  { text: 'ぱりぱり落ち葉踏みながら散歩してた' },
];

export function getTodayActivity(): DailyActivity {
  const now = new Date();
  const seed = `activity-${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
  const r = seededRandom(seed);
  return ACTIVITIES[Math.floor(r * ACTIVITIES.length)];
}

export function getAllActivities(): string[] {
  return ACTIVITIES.map((a) => a.text);
}
