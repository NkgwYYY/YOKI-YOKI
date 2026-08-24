/**
 * Google Analytics 4 — web only (Expo managed workflow)
 *
 * Add one secret in Replit:
 *   EXPO_PUBLIC_GA_MEASUREMENT_ID = G-XXXXXXXXXX
 *
 * That's it. The gtag script is injected via app/+html.tsx.
 */
import { Platform } from 'react-native';

function gtag(...args: unknown[]) {
  if (Platform.OS !== 'web') return;
  if (typeof window === 'undefined') return;
  const w = window as any;
  if (typeof w.gtag !== 'function') return;
  w.gtag(...args);
}

/** Call once when the app mounts (no-op — gtag auto-initialises from +html.tsx) */
export function initAnalytics() {}

/** Send a custom event */
export function track(name: string, params?: Record<string, unknown>) {
  gtag('event', name, params);
}

/* ── Typed helpers ─────────────────────────────── */
export const Analytics = {
  screenView: (screenName: string) =>
    gtag('event', 'page_view', { page_title: screenName }),

  login:  () => track('login'),
  signUp: () => track('sign_up'),
  guestStarted: () => track('guest_started'),
  guestBackupPromptOpened: () => track('guest_backup_prompt_opened'),
  guestDataBackedUp: () => track('guest_data_backed_up'),

  miniGameStarted:   (slot: string)                  => track('mini_game_started',   { slot }),
  miniGameCompleted: (slot: string, score: number)   => track('mini_game_completed', { slot, score }),

  restEventShown:     ()                            => track('rest_event_shown'),
  restEventScene:     (scene: string)               => track('rest_event_scene',     { scene }),
  restEventCompleted: (felt_better: boolean)        => track('rest_event_completed', { felt_better }),

  checklistItemToggled: (completed: boolean)        => track('checklist_toggled',    { completed }),
  moodRecorded:         (mood: number)              => track('mood_recorded',         { mood }),
  mascotFed:            (foodId: string, cost: number) => track('mascot_fed',        { food_id: foodId, cost }),
  chatMessageSent:      ()                          => track('chat_message_sent'),
  mascotNamed:          ()                          => track('mascot_named'),
  mascotEvolved:        (stage: string)             => track('mascot_evolved',        { stage }),
};
