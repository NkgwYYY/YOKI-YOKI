/** Preserve the stored {list: ...} shape when a guest joins an existing account. */
export function mergeEncounterHistory(cloud: unknown, local: unknown) {
  type Entry = { charKey: string; metDate: string };
  const entries = (value: unknown): Entry[] => {
    if (!value || typeof value !== 'object') return [];
    const list = (value as { list?: unknown }).list;
    return Array.isArray(list) ? list.filter((item): item is Entry =>
      !!item && typeof item.charKey === 'string' && typeof item.metDate === 'string') : [];
  };
  const byCharacter = new Map<string, Entry>();
  for (const entry of [...entries(cloud), ...entries(local)]) {
    const previous = byCharacter.get(entry.charKey);
    if (!previous || entry.metDate < previous.metDate) byCharacter.set(entry.charKey, entry);
  }
  return { list: [...byCharacter.values()] };
}
