type MemoryRecord = {date: string; mood: number; notes: string; win?: string; behaviors: string[]};
const FEELINGS = ['つらい','しんどい','ふつう','いい感じ','うれしい'];
/** Read-only excerpts from real saved records. No invented visits, streaks or memories. */
export function recentWorldMemories(records: readonly MemoryRecord[]) {
  const dates=new Set<string>();
  return [...records].sort((a,b)=>b.date.localeCompare(a.date)).filter(record=>{
    if(!/^\d{4}-\d{2}-\d{2}$/.test(record.date)||dates.has(record.date))return false;
    dates.add(record.date);return true;
  }).slice(0,3).map(record=>({
    date:record.date,
    caption:record.win?.trim() || record.notes.trim() || record.behaviors.join('、') ||
      (FEELINGS[record.mood-1]?`「${FEELINGS[record.mood-1]}」の気持ちを残した日`:'今日の気持ちを残した日'),
  }));
}
export function memoryDate(date: string) {
  const parts=/^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  return parts?`${Number(parts[2])}月${Number(parts[3])}日`:'';
}
