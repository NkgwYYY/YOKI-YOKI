/** Local UI preferences never contain diary or profile content. */
export const firstStepsKey = (owner: string) => `@yoki/first-steps/v1/${encodeURIComponent(owner)}`;
export const zodiacKey = (owner: string) => `@yoki/zodiac/v1/${encodeURIComponent(owner)}`;
export const dailyCheckinPromptKey = (owner: string, date: string) => `@yoki/daily-check-in/v1/${encodeURIComponent(owner)}/${date}`;
export function hasMoodForDay(record: {date:string;mood:number}|undefined, date:string) {
  return !!record && record.date===date && Number.isInteger(record.mood) && record.mood>=1 && record.mood<=5;
}
/** The final step confirms moyamoya even when the optional fatigue/worry steps are skipped. */
export function hasCompletedDailyCheckin(record: {date:string;mood:number;moyamoya?:{has:boolean}}|undefined, date:string) {
  return hasMoodForDay(record,date) && typeof record?.moyamoya?.has==='boolean';
}
