import type { Router } from 'expo-router';

/** Preserve the entry screen; direct links have no in-app screen to return to. */
export function backToRoom(router: Pick<Router, 'canGoBack' | 'back' | 'replace'>) {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}
