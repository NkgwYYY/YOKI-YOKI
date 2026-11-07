type DeletionEvent =
  | { accountId: string; phase: 'start' }
  | { accountId: string; phase: 'finish'; serverDeleted: boolean };

const listeners = new Set<(event: DeletionEvent) => void>();

// Synchronous notification invalidates in-flight hydration before DELETE starts.
// This only coordinates local providers; the server must reject late writes too.
export function notifyAccountDeletion(event: DeletionEvent) {
  for (const listener of listeners) listener(event);
}

export function subscribeAccountDeletion(listener: (event: DeletionEvent) => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
