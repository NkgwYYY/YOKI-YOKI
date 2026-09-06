export type HomeCommentTimeOfDay = 'morning' | 'daytime' | 'evening' | 'night';

export function getHomeCommentTimeOfDay(date = new Date()): HomeCommentTimeOfDay {
  const hour = date.getHours();
  if (hour >= 5 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 16) return 'daytime';
  if (hour >= 16 && hour < 20) return 'evening';
  return 'night';
}

export function buildHomeCommentCacheSource(params: {
  date: string;
  mascotName: string;
  frequency: string;
  includeRecentChat: boolean;
  timeOfDay: HomeCommentTimeOfDay;
  context: string;
  recentChat: string;
}): string {
  const source =
    `time-aware-v2\n${params.date}\n${params.mascotName}\n${params.frequency}` +
    `\n${params.includeRecentChat}\n${params.timeOfDay}`;
  return params.frequency === 'after_record'
    ? `${source}\n${params.context}\n${params.recentChat}`
    : source;
}