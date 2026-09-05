import type { DailyRecord } from '@/contexts/AppContext';

export const MOOD_LABELS: Record<number, string> = {
  1: 'しんどい',
  2: '少し低め',
  3: 'おだやか',
  4: 'いい感じ',
  5: 'とてもYOKI',
};

export interface MonthlyReportData {
  monthKey: string;
  monthLabel: string;
  daysInMonth: number;
  records: DailyRecord[];
  recordsByDay: Record<number, DailyRecord>;
  recordedDays: number;
  mostMood: number | null;
  mostMoodLabel: string;
  longestStreak: number;
  review: string;
}

function getLongestStreak(days: number[]): number {
  const sorted = [...new Set(days)].sort((a, b) => a - b);
  let longest = 0;
  let current = 0;
  let previous = -2;
  for (const day of sorted) {
    current = day === previous + 1 ? current + 1 : 1;
    longest = Math.max(longest, current);
    previous = day;
  }
  return longest;
}

function createReview(recordedDays: number, daysInMonth: number, averageMood: number, longestStreak: number): string {
  if (recordedDays === 0) {
    return '今月は、これから気持ちを残していくためのまっさらな1ヶ月です。\n小さなひとことから、あなたのペースで始めてみましょう。';
  }
  const pace = recordedDays >= Math.ceil(daysInMonth * 0.7)
    ? '自分の気持ちと丁寧に向き合えた'
    : recordedDays >= 8 ? '自分のペースで心の声を残せた' : '立ち止まって心を見つめる時間をつくれた';
  const mood = averageMood >= 4.2
    ? '明るい気持ちがたくさん見つかりましたね。'
    : averageMood >= 3
      ? '穏やかな波を大切にできていましたね。'
      : 'しんどい日も記録できたことが、十分すてきな一歩です。';
  const streak = longestStreak >= 7
    ? `最長${longestStreak}日も続けられたあなたを、たくさん労ってあげてください。`
    : 'どの日の気持ちも、あなたらしい大切な記録です。';
  return `今月は、${pace}1ヶ月でした。\n${mood}${streak}`;
}

export function buildMonthlyReport(records: DailyRecord[], monthKey: string): MonthlyReportData {
  const [year, month] = monthKey.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const monthRecords = records.filter((record) => record.date.startsWith(`${monthKey}-`));
  const recordsByDay: Record<number, DailyRecord> = {};
  const counts: Record<number, number> = {};
  for (const record of monthRecords) {
    const day = Number(record.date.slice(8, 10));
    recordsByDay[day] = record;
    counts[record.mood] = (counts[record.mood] ?? 0) + 1;
  }
  const uniqueRecords = Object.values(recordsByDay);
  const mostMood = uniqueRecords.length
    ? Number(Object.entries(counts).sort((a, b) => Number(b[1]) - Number(a[1]) || Number(b[0]) - Number(a[0]))[0][0])
    : null;
  const averageMood = uniqueRecords.length
    ? uniqueRecords.reduce((sum, record) => sum + record.mood, 0) / uniqueRecords.length
    : 0;
  const longestStreak = getLongestStreak(Object.keys(recordsByDay).map(Number));
  return {
    monthKey,
    monthLabel: `${year}年 ${month}月`,
    daysInMonth,
    records: uniqueRecords,
    recordsByDay,
    recordedDays: uniqueRecords.length,
    mostMood,
    mostMoodLabel: mostMood ? MOOD_LABELS[mostMood] : 'これから',
    longestStreak,
    review: createReview(uniqueRecords.length, daysInMonth, averageMood, longestStreak),
  };
}