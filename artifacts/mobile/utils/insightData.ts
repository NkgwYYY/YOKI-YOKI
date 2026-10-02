export interface Insight { title: string; body: string }

/** Reject malformed cache/API data before it reaches React text children. */
export function readInsights(value: unknown): Insight[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  if (!value.every(item => item !== null && typeof item === 'object'
    && typeof item.title === 'string' && item.title.trim().length > 0
    && typeof item.body === 'string' && item.body.trim().length > 0)) return null;
  return value.map(({ title, body }) => ({ title, body }));
}
