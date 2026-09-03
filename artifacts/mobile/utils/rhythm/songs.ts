import { activityPalette } from '@/constants/theme';
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
    icon: 'activity',
    accent: activityPalette.selfCare,
  },
  {
    id: 'night_barometer',
    title: 'ナイト・バロメーター',
    audio: require('@/assets/sounds/song_night_barometer.mp3'),
    bpm: 89.1,
    firstBeat: 0.511,
    duration: 29.5,
    mood: 'しっとり',
    icon: 'moon',
    accent: activityPalette.reading,
  },
  {
    id: 'rolling_days',
    title: 'ローリング・デイズ',
    audio: require('@/assets/sounds/song_rolling_days.mp3'),
    bpm: 99.4,
    firstBeat: 0.215,
    duration: 29.5,
    mood: 'るんるん',
    icon: 'sun',
    accent: activityPalette.exercise,
  },
  {
    id: 'bouncy_away',
    title: 'バウンシー・アウェイ',
    audio: require('@/assets/sounds/song_bouncy_away.mp3'),
    bpm: 77.15,
    firstBeat: 0.313,
    duration: 29.5,
    mood: 'はずむ',
    icon: 'wind',
    accent: activityPalette.study,
  },
];

export function getSong(id: string): Song | undefined {
  return SONGS.find(s => s.id === id);
}
