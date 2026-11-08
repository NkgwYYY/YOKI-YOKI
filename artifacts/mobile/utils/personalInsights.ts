import {ACTIVITY_LABELS} from './dailyActivities.ts';
/** Personal observations use structured, on-device records only. No journal text is read. */
export type PatternRecord = {
  date: string; mood: number; behaviors?: readonly string[];
  sleep?: number; sleepRecorded?: boolean; behaviorsRecorded?: boolean; dayType?: string;
};
export type InsightEvidence = {
  selectedLabel: string; selectedDays: number; selectedGoodDays: number;
  comparisonLabel: string; comparisonDays: number; comparisonGoodDays: number;
  from: string; to: string;
};
export type PersonalInsight = {
  id: string; title: string; body: string; suggestion: string;
  evidence: InsightEvidence; evidenceText: string;
};
export type PersonalInsightsReport = {
  insights: PersonalInsight[]; recordedDays: number; eligibleDays: number;
  windowStart: string; windowEnd: string;
  status: 'gathering' | 'no-pattern' | 'ready';
  moodDays: { date: string; mood: number }[];
};

export const PERSONAL_INSIGHT_MIN_DAYS = 14;
export const PERSONAL_INSIGHT_WINDOW_DAYS = 30;
const MIN_GROUP = 4;
// Curated activities only: an arbitrary imported tag must never become advice.
const ACTIVITIES = ACTIVITY_LABELS;

function dayNumber(date: string): number | null {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const stamp = Date.parse(`${date}T12:00:00Z`);
  if (!Number.isFinite(stamp) || new Date(stamp).toISOString().slice(0, 10) !== date) return null;
  return Math.floor(stamp / 86400000);
}
const isoDay = (day: number) => new Date(day * 86400000).toISOString().slice(0, 10);
const good = (r: PatternRecord) => r.mood >= 4;
const mean = (rows: PatternRecord[]) => rows.reduce((sum, r) => sum + r.mood, 0) / rows.length;
function logChoose(n: number, k: number): number {
  if (k < 0 || k > n) return -Infinity;
  let result = 0;
  for (let i = 1; i <= Math.min(k, n - k); i++) result += Math.log(n - i + 1) - Math.log(i);
  return result;
}
/** One-sided exact test, adjusted below for the number of candidate comparisons. */
function exactProbability(a: number, b: number, c: number, d: number): number {
  const totalGood = a + c, total = a + b + c + d, selected = a + b;
  let p = 0;
  for (let x = a; x <= Math.min(totalGood, selected); x++) {
    p += Math.exp(logChoose(totalGood, x) + logChoose(total - totalGood, selected - x) - logChoose(total, selected));
  }
  return Math.min(1, p);
}
type Candidate = { key: string; label: string; selected: PatternRecord[]; comparison: PatternRecord[]; comparisonLabel: string; p: number; lift: number };

/**
 * First stored record wins when a damaged import contains duplicate dates, matching
 * AppContext's find()/daily transaction behavior. No duplicate adds evidence.
 * Empty behavior lists are unknown unless explicitly answered with behaviorsRecorded=true. Sleep is a
 * separate comparison and is used only when explicitly recorded or legacy-detailed.
 */
export function buildPersonalInsights(records: readonly PatternRecord[], today: string): PersonalInsightsReport {
  const end = dayNumber(today);
  const start = end === null ? null : end - PERSONAL_INSIGHT_WINDOW_DAYS + 1;
  const report: PersonalInsightsReport = { insights: [], recordedDays: 0, eligibleDays: 0,
    windowStart: start === null ? '' : isoDay(start), windowEnd: end === null ? '' : today,
    status: 'gathering', moodDays: [] };
  if (end === null || start === null || !Array.isArray(records)) return report;
  const byDate = new Map<string, PatternRecord>();
  for (const r of records) {
    if (!r) continue;
    const day = dayNumber(r.date);
    if (day === null || day < start || day > end || !Number.isInteger(r.mood) || r.mood < 1 || r.mood > 5 || byDate.has(r.date)) continue;
    byDate.set(r.date, r);
  }
  const days = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
  const behavioralDays = days.filter(r => r.behaviorsRecorded !== false && Array.isArray(r.behaviors) && (r.behaviorsRecorded === true || r.behaviors.some(b => typeof b === 'string' && b.trim())));
  report.recordedDays = days.length;
  report.eligibleDays = behavioralDays.length;
  report.moodDays = days.map(({ date, mood }) => ({ date, mood }));
  if (days.length < PERSONAL_INSIGHT_MIN_DAYS) return report;
  report.status = 'no-pattern';
  const candidates: Candidate[] = [];
  const consider = (key: string, label: string, selected: PatternRecord[], comparison: PatternRecord[], comparisonLabel: string) => {
    if (selected.length < MIN_GROUP || comparison.length < MIN_GROUP) return;
    // A before/after change alone is not sufficient evidence for an activity link.
    if (selected[0].date > comparison[comparison.length - 1].date || comparison[0].date > selected[selected.length - 1].date) return;
    const a = selected.filter(good).length, c = comparison.filter(good).length;
    candidates.push({ key, label, selected, comparison, comparisonLabel,
      p: exactProbability(a, selected.length - a, c, comparison.length - c),
      lift: a / selected.length - c / comparison.length });
  };
  for (const label of ACTIVITIES) {
    consider(`activity:${label}`, `${label === '新しいことに挑戦' ? '新しいことに挑戦した' : label}日`,
      behavioralDays.filter(r => r.behaviors!.includes(label)),
      behavioralDays.filter(r => !r.behaviors!.includes(label)), 'ほかの過ごし方を記録した日');
  }
  const dayTypeDays=days.filter(r=>r.dayType==='work'||r.dayType==='rest'||r.dayType==='other');
  for(const [id,label] of [['work','仕事・学校の日'],['rest','お休みの日']] as const){
    consider('day:'+id,label,dayTypeDays.filter(r=>r.dayType===id),dayTypeDays.filter(r=>r.dayType!==id),'ほかの生活を記録した日');
  }
  const sleepDays = days.filter(r => r.sleepRecorded !== false && typeof r.sleep === 'number' && Number.isFinite(r.sleep) && r.sleep >= 0 && r.sleep <= 12);
  if (sleepDays.length >= MIN_GROUP * 2) {
    const sortedSleep = sleepDays.map(r => r.sleep!).sort((a, b) => a - b);
    const lower = sortedSleep[Math.floor((sortedSleep.length - 1) / 2)];
    const upper = sortedSleep[Math.ceil((sortedSleep.length - 1) / 2)];
    const boundary = (lower + upper) / 2;
    const selected = sleepDays.filter(r => r.sleep! > boundary), comparison = sleepDays.filter(r => r.sleep! <= boundary);
    if (selected.length && comparison.length && meanSleep(selected) - meanSleep(comparison) >= 1) {
      const minimum = Math.min(...selected.map(r => r.sleep!));
      consider(`sleep:${minimum}`, `睡眠時間が${minimum}時間以上の日`, selected, comparison, `睡眠時間が${minimum}時間未満の日`);
    }
  }
  // Holm adjustment limits chance discoveries across many activity labels. Evidence
  // remains observational, so the UI always exposes the counts and uncertainty.
  const ordered = candidates.sort((a, b) => a.p - b.p || b.lift - a.lift || a.key.localeCompare(b.key));
  const accepted: Candidate[] = [];
  for (let i = 0; i < ordered.length; i++) {
    const c = ordered[i];
    if (c.p > .05 / (ordered.length - i)) break;
    if (c.lift < .3 || mean(c.selected) - mean(c.comparison) < .5) continue;
    // Co-occurring tags do not become several independent-looking discoveries.
    const selectedDates = new Set(c.selected.map(r => r.date));
    if (accepted.some(prev => {
      const previousDates = new Set(prev.selected.map(r => r.date));
      const intersection = [...selectedDates].filter(d => previousDates.has(d)).length;
      return intersection / new Set([...selectedDates, ...previousDates]).size >= .8;
    })) continue;
    accepted.push(c);
  }
  report.insights = accepted.slice(0, 3).map(c => {
    const evidence: InsightEvidence = { selectedLabel: c.label, selectedDays: c.selected.length,
      selectedGoodDays: c.selected.filter(good).length, comparisonLabel: c.comparisonLabel,
      comparisonDays: c.comparison.length, comparisonGoodDays: c.comparison.filter(good).length,
      from: report.windowStart, to: report.windowEnd };
    const isSleep = c.key.startsWith('sleep:');
    return { id: `personal:${c.key}`, title: c.label,
      body: `最近の記録では、${c.label}は「いい感じ」「うれしい」が多かったよ。日による違いを振り返るヒントになるかもしれないね。`,
      suggestion: isSleep ? 'この時間を目標にしなくて大丈夫。起きたときの感じも、一緒に振り返ってみよう。' : '同じ過ごし方を目標にしなくて大丈夫。その日のほかのできごとも、一緒に振り返ってみよう。',
      evidence,
      evidenceText: `${evidence.from}〜${evidence.to}。${evidence.selectedLabel}：${evidence.selectedDays}日中${evidence.selectedGoodDays}日が元気な日。${evidence.comparisonLabel}：${evidence.comparisonDays}日中${evidence.comparisonGoodDays}日。「いい感じ」「うれしい」を選んだ日を、元気な日としています。原因を示すものではありません。`,
    };
  });
  report.status = report.insights.length ? 'ready' : 'no-pattern';
  return report;
}
function meanSleep(rows: PatternRecord[]) { return rows.reduce((sum, r) => sum + r.sleep!, 0) / rows.length; }
