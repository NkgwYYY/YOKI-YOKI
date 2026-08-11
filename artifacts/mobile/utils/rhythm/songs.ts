import { Song } from './types';

/**
 * 曲レジストリ。曲を追加するときはここに1エントリ足して、
 * utils/rhythm/charts/ に譜面を登録するだけでよい。
 * BPM/firstBeat はオンセット解析による実測値。
 */
export const SONGS: Song[] = [
  {
    id: 'gritty_boogie',
    title: 'グリッティ・ブギ',
    audio: require('@/assets/sounds/song_gritty_boogie.mp3'),
    bpm: 149.8,
    firstBeat: 0.302,
    duration: 29.5,
    mood: 'ノリノリ',
    emoji: '🕺',
    gradient: ['#FF8A5C', '#FF5C8A'] as const,
  },
  {
    id: 'night_barometer',
    title: 'ナイト・バロメーター',
    audio: require('@/assets/sounds/song_night_barometer.mp3'),
    bpm: 89.1,
    firstBeat: 0.511,
    duration: 29.5,
    mood: 'しっとり',
    emoji: '🌙',
    gradient: ['#5C6BFF', '#8A5CFF'] as const,
  },
  {
    id: 'rolling_days',
    title: 'ローリング・デイズ',
    audio: require('@/assets/sounds/song_rolling_days.mp3'),
    bpm: 99.4,
    firstBeat: 0.215,
    duration: 29.5,
    mood: 'るんるん',
    emoji: '🎡',
    gradient: ['#41C98E', '#37A8D8'] as const,
  },
  {
    id: 'bouncy_away',
    title: 'バウンシー・アウェイ',
    audio: require('@/assets/sounds/song_bouncy_away.mp3'),
    bpm: 77.15,
    firstBeat: 0.313,
    duration: 29.5,
    mood: 'はずむ',
    emoji: '🫧',
    gradient: ['#F7B733', '#E8638C'] as const,
  },
];

export function getSong(id: string): Song | undefined {
  return SONGS.find(s => s.id === id);
}
