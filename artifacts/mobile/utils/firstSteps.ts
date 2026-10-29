/** Local UI preferences never contain diary or profile content. */
export const firstStepsKey = (owner: string) => `@yoki/first-steps/v1/${encodeURIComponent(owner)}`;
export const zodiacKey = (owner: string) => `@yoki/zodiac/v1/${encodeURIComponent(owner)}`;
export function hasMoodForDay(record: {date:string;mood:number}|undefined, date:string) {
  return !!record && record.date===date && Number.isInteger(record.mood) && record.mood>=1 && record.mood<=5;
}
