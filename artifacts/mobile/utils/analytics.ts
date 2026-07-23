/**
 * Firebase Analytics — web only (Expo managed workflow)
 * Set these env vars in Replit Secrets:
 *   EXPO_PUBLIC_FIREBASE_API_KEY
 *   EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN
 *   EXPO_PUBLIC_FIREBASE_PROJECT_ID
 *   EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET
 *   EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
 *   EXPO_PUBLIC_FIREBASE_APP_ID
 *   EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID
 */
import { Platform } from 'react-native';

// Lazy-init so native/SSR never attempts to load the web SDK
let _logEvent: ((name: string, params?: Record<string, unknown>) => void) | null = null;
let _initialized = false;

async function init() {
  if (_initialized || Platform.OS !== 'web') return;
  _initialized = true;

  const measurementId = process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID;
  if (!measurementId) return; // not configured yet — silent no-op

  try {
    const { initializeApp, getApps } = await import('firebase/app');
    const { getAnalytics, logEvent, isSupported } = await import('firebase/analytics');

    if (!(await isSupported())) return;

    const firebaseConfig = {
      apiKey:            process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
      authDomain:        process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId:         process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket:     process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId:             process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
      measurementId,
    };

    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    const analytics = getAnalytics(app);

    _logEvent = (name, params) => logEvent(analytics, name, params);
  } catch (e) {
    console.warn('[Analytics] init failed:', e);
  }
}

/** Call once at app startup */
export async function initAnalytics() {
  await init();
}

/** Track a custom event (no-op if not configured or on native) */
export function track(name: string, params?: Record<string, unknown>) {
  _logEvent?.(name, params);
}

/* ── Typed helpers ────────────────────────────────── */

export const Analytics = {
  // Screen views
  screenView: (screenName: string) =>
    track('screen_view', { firebase_screen: screenName }),

  // Auth
  login: () => track('login'),
  signUp: () => track('sign_up'),

  // Mini-games
  miniGameStarted: (slot: string) =>
    track('mini_game_started', { slot }),
  miniGameCompleted: (slot: string, score: number) =>
    track('mini_game_completed', { slot, score }),

  // Rest event
  restEventShown: () => track('rest_event_shown'),
  restEventScene: (scene: string) =>
    track('rest_event_scene_selected', { scene }),
  restEventCompleted: (felt_better: boolean) =>
    track('rest_event_completed', { felt_better }),

  // Core actions
  checklistItemToggled: (completed: boolean) =>
    track('checklist_item_toggled', { completed }),
  moodRecorded: (mood: number) =>
    track('mood_recorded', { mood }),
  mascotFed: (foodId: string, cost: number) =>
    track('mascot_fed', { food_id: foodId, cost }),
  chatMessageSent: () => track('chat_message_sent'),

  // Mascot
  mascotNamed: () => track('mascot_named'),
  mascotEvolved: (stage: string) =>
    track('mascot_evolved', { stage }),
};
