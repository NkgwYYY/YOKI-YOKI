import AsyncStorage from '@react-native-async-storage/async-storage';
import type { DailyRecord } from '@/contexts/AppContext';

const CHAT_HISTORY_KEY = '@mentore/chat_history_v1';
const HOME_COMMENT_KEY = '@mentore/home_comment_v1';
const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`;

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
    lines.push(`睡眠: ${record.sleep}時間`);
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

function fallbackComment(record: DailyRecord | undefined, completed: number): string {
  if (record?.win?.trim()) return `きょうもおつかれさま！「${record.win.trim().slice(0, 24)}」、いい感じだね`;
  if (completed > 0) return `きょうもおつかれさま！${completed}こ進められたね`;
  if (record && record.mood <= 2) return 'きょうもおつかれさま。今夜はのんびりしよ';
  if (record && record.sleep < 6) return 'きょうもおつかれさま。今日は早めにひと休みしよ';
  return 'きょうもおつかれさま！今日はどんな一日だった？';
}

export async function getHomeComment(params: {
  date: string;
  mascotName: string;
  record?: DailyRecord;
  completed: number;
  total: number;
}): Promise<string> {
  const context = buildRecordContext(params.record, params.completed, params.total);
  const recentChat = await loadRecentChat();
  const fingerprint = shortHash(`${params.date}\n${params.mascotName}\n${context}\n${recentChat}`);

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
      }),
    });
    if (response.ok) {
      const data = await response.json();
      if (typeof data.comment === 'string') comment = data.comment.trim().slice(0, 120);
    }
  } catch {
    // The local fallback below keeps the character conversational offline.
  }

  if (!comment) comment = fallbackComment(params.record, params.completed);
  await AsyncStorage.setItem(HOME_COMMENT_KEY, JSON.stringify({
    date: params.date,
    fingerprint,
    comment,
  } satisfies CachedHomeComment)).catch(() => {});
  return comment;
}