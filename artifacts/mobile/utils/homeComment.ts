import AsyncStorage from '@react-native-async-storage/async-storage';
import type { DailyRecord } from '@/contexts/AppContext';
import {
  buildHomeCommentCacheSource,
  getHomeCommentTimeOfDay,
  type HomeCommentTimeOfDay,
} from '@/utils/homeCommentTiming';

const CHAT_HISTORY_KEY = '@mentore/chat_history_v1';
const HOME_COMMENT_KEY = '@mentore/home_comment_v1';
export const HOME_COMMENT_PREFERENCES_KEY = '@mentore/home_comment_preferences_v1';
const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`;

export type HomeCommentFrequency = 'daily' | 'after_record' | 'quiet' | 'off';
export type HomeCommentPlacement = 'bottom_left' | 'bottom_center' | 'bottom_right';
export interface HomeCommentPreferences {
  frequency: HomeCommentFrequency;
  includeRecentChat: boolean;
  placement: HomeCommentPlacement;
  positionX: number;
  positionY: number;
  sizeScale: number;
}

export const DEFAULT_HOME_COMMENT_PREFERENCES: HomeCommentPreferences = {
  frequency: 'daily',
  includeRecentChat: true,
  placement: 'bottom_center',
  positionX: 0.5,
  positionY: 0,
  sizeScale: 1,
};

function clamp(value: unknown, min: number, max: number, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(min, Math.min(max, value))
    : fallback;
}

export function resolveHomeCommentPreferences(value: unknown): HomeCommentPreferences {
  if (!value || typeof value !== 'object') return DEFAULT_HOME_COMMENT_PREFERENCES;
  const raw = value as Partial<HomeCommentPreferences>;
  const frequency: HomeCommentFrequency =
    raw.frequency === 'after_record' || raw.frequency === 'quiet' || raw.frequency === 'off'
      ? raw.frequency
      : 'daily';
  const placement: HomeCommentPlacement =
    raw.placement === 'bottom_left' || raw.placement === 'bottom_right'
      ? raw.placement
      : 'bottom_center';
  const legacyPositionX = placement === 'bottom_left' ? 0 : placement === 'bottom_right' ? 1 : 0.5;
  return {
    frequency,
    includeRecentChat: raw.includeRecentChat !== false,
    placement,
    positionX: clamp(raw.positionX, 0, 1, legacyPositionX),
    positionY: clamp(raw.positionY, -0.18, 0.22, 0),
    sizeScale: clamp(raw.sizeScale, 0.72, 1.28, 1),
  };
}

export async function clearHomeCommentCache(): Promise<void> {
  await AsyncStorage.removeItem(HOME_COMMENT_KEY);
}

interface StoredChatMessage {
  role?: unknown;
  content?: unknown;
}

interface CachedHomeComment {
  date: string;
  fingerprint: string;
  comment: string;
}

function shortHash(value: string): string {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function moodLabel(mood: number): string {
  if (mood >= 5) return 'とても良い';
  if (mood >= 4) return '良い';
  if (mood >= 3) return 'ふつう';
  if (mood >= 2) return '少し低め';
  return '低め';
}

function buildRecordContext(record: DailyRecord | undefined, completed: number, total: number): string {
  const lines: string[] = [];
  if (record) {
    lines.push(`今日の気分: ${moodLabel(record.mood)}`);
    if (record.sleepRecorded !== false) lines.push(`睡眠: ${record.sleep}時間`);
    if (record.behaviors.length) lines.push(`今日したこと: ${record.behaviors.slice(0, 4).join('、')}`);
    if (record.win?.trim()) lines.push(`今日の小さな成功: ${record.win.trim().slice(0, 80)}`);
  }
  if (total > 0) lines.push(`今日のチェック: ${completed}/${total}件完了`);
  return lines.join('\n');
}

async function loadRecentChat(): Promise<string> {
  try {
    const raw = await AsyncStorage.getItem(CHAT_HISTORY_KEY);
    if (!raw) return '';
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return '';
    return (parsed as StoredChatMessage[])
      .filter((message) =>
        (message.role === 'user' || message.role === 'assistant') &&
        typeof message.content === 'string' &&
        message.content.trim().length > 0
      )
      .slice(-4)
      .map((message) => `${message.role === 'user' ? 'ユーザー' : 'キャラクター'}: ${String(message.content).trim().slice(0, 120)}`)
      .join('\n')
      .slice(0, 600);
  } catch {
    return '';
  }
}

function fallbackComment(
  record: DailyRecord | undefined,
  completed: number,
  timeOfDay: HomeCommentTimeOfDay
): string {
  if (record?.win?.trim()) {
    const lead = timeOfDay === 'morning' ? '朝からいい感じ！' : 'きょうもおつかれさま！';
    return `${lead}「${record.win.trim().slice(0, 24)}」、いいね`;
  }
  if (completed > 0) {
    const lead = timeOfDay === 'morning' ? '朝から' : 'きょうも';
    return `${lead}${completed}こ進められたね`;
  }
  if (record && record.mood <= 2) {
    return timeOfDay === 'night'
      ? 'きょうもおつかれさま。今夜はのんびりしよ'
      : '今日はゆっくりペースでいこ';
  }
  if (record && record.sleepRecorded !== false && record.sleep < 6) {
    return timeOfDay === 'night'
      ? '眠い日は早めにひと休みしよ'
      : '眠い日は、ひと息つきながらいこ';
  }
  if (timeOfDay === 'morning') return 'おはよう！ゆっくり始めていこ';
  if (timeOfDay === 'daytime') return 'ひと息ついて、午後も自分のペースでいこ';
  if (timeOfDay === 'evening') return '夕方までおつかれさま。ちょっとひと息つこ';
  return 'きょうもおつかれさま。今夜はのんびりしよ';
}

export async function getHomeComment(params: {
  date: string;
  mascotName: string;
  record?: DailyRecord;
  completed: number;
  total: number;
  preferences?: HomeCommentPreferences;
}): Promise<string> {
  const preferences = resolveHomeCommentPreferences(params.preferences);
  if (preferences.frequency === 'off') return '';
  if (preferences.frequency === 'after_record' && !params.record && params.completed === 0) return '';
  if (preferences.frequency === 'quiet') {
    const dayNumber = Math.floor(Date.parse(`${params.date}T00:00:00Z`) / 86_400_000);
    if (!Number.isFinite(dayNumber) || dayNumber % 3 !== 0) return '';
  }

  const context = buildRecordContext(params.record, params.completed, params.total);
  const recentChat = preferences.includeRecentChat ? await loadRecentChat() : '';
  const timeOfDay = getHomeCommentTimeOfDay();
  const source = buildHomeCommentCacheSource({
    date: params.date,
    mascotName: params.mascotName,
    frequency: preferences.frequency,
    includeRecentChat: preferences.includeRecentChat,
    timeOfDay,
    context,
    recentChat,
  });
  const fingerprint = shortHash(
    source
  );

  try {
    const raw = await AsyncStorage.getItem(HOME_COMMENT_KEY);
    if (raw) {
      const cached = JSON.parse(raw) as CachedHomeComment;
      if (cached.date === params.date && cached.fingerprint === fingerprint && cached.comment) {
        return cached.comment;
      }
    }
  } catch {
    // Generate a fresh comment when the local cache cannot be read.
  }

  let comment = '';
  try {
    const response = await fetch(`${API_BASE}/home-comment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mascotName: params.mascotName || 'こころん',
        context: context || undefined,
        recentChat: recentChat || undefined,
        timeOfDay,
      }),
    });
    if (response.ok) {
      const data = await response.json();
      if (typeof data.comment === 'string') comment = data.comment.trim().slice(0, 120);
    }
  } catch {
    // The local fallback below keeps the character conversational offline.
  }

  if (!comment) comment = fallbackComment(params.record, params.completed, timeOfDay);
  await AsyncStorage.setItem(HOME_COMMENT_KEY, JSON.stringify({
    date: params.date,
    fingerprint,
    comment,
  } satisfies CachedHomeComment)).catch(() => {});
  return comment;
}