export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  dateKey: string;
  citations?: Citation[];
}

export interface Citation {
  title: string;
  url: string;
}

export function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function messageDateFromId(id: unknown): Date | null {
  if (typeof id !== 'string') return null;
  const match = id.match(/_(\d{10,})$/);
  if (!match) return null;
  const date = new Date(Number(match[1]));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function normalizeStoredMessage(raw: unknown): Message | null {
  if (!raw || typeof raw !== 'object') return null;
  const message = raw as Partial<Message>;
  if (
    typeof message.id !== 'string'
    || (message.role !== 'user' && message.role !== 'assistant')
    || typeof message.content !== 'string'
  ) return null;
  const idDate = messageDateFromId(message.id);
  const timestampDate = (typeof message.timestamp === 'string' || typeof message.timestamp === 'number')
    ? new Date(message.timestamp) : idDate;
  const validDate = timestampDate && !Number.isNaN(timestampDate.getTime()) ? timestampDate : idDate ?? new Date();
  return {
    id: message.id,
    role: message.role,
    content: message.content,
    timestamp: validDate.toISOString(),
    dateKey: typeof message.dateKey === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(message.dateKey)
      && !Number.isNaN(Date.parse(message.dateKey))
      && new Date(message.dateKey).toISOString().slice(0, 10) === message.dateKey
      ? message.dateKey : localDateKey(validDate),
    citations: Array.isArray(message.citations)
      ? message.citations.filter((citation): citation is Citation =>
          !!citation
          && typeof citation.title === 'string'
          && typeof citation.url === 'string'
          && citation.url.startsWith('https://www.mhlw.go.jp/'))
      : undefined,
  };
}
