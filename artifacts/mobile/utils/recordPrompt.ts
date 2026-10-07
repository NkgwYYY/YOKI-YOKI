export type RecordPrompt = { enabled: boolean; time: string; skippedDate: string | null; snoozedUntil: number };
export const DEFAULT_RECORD_PROMPT: RecordPrompt = { enabled: true, time: '20:00', skippedDate: null, snoozedUntil: 0 };
export function validPromptTime(time: string): boolean { return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time); }
export function localPromptDate(now: Date): string {
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
}
export function parseRecordPrompt(raw: string | null): RecordPrompt {
  if (raw === null) return {...DEFAULT_RECORD_PROMPT};
  const p = JSON.parse(raw);
  if (typeof p?.enabled !== 'boolean' || typeof p.time !== 'string' || !validPromptTime(p.time)
    || !(p.skippedDate === null || (typeof p.skippedDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(p.skippedDate)))
    || !Number.isFinite(p.snoozedUntil) || p.snoozedUntil < 0) throw new Error('Invalid record prompt preferences');
  return {enabled:p.enabled,time:p.time,skippedDate:p.skippedDate,snoozedUntil:p.snoozedUntil};
}
export function isRecordPromptDue(p: RecordPrompt, now: Date, recorded: boolean): boolean {
  const [hour, minute] = p.time.split(':').map(Number);
  return p.enabled && !recorded && p.skippedDate !== localPromptDate(now)
    && now.getTime() >= p.snoozedUntil && now.getHours()*60+now.getMinutes() >= hour*60+minute;
}
