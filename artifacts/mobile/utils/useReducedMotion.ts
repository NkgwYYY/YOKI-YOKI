import { useSyncExternalStore } from 'react';
import { AccessibilityInfo } from 'react-native';

let reduced = true;
let version = 0;
const listeners = new Set<() => void>();
let subscription: ReturnType<typeof AccessibilityInfo.addEventListener> | undefined;

function publish(value: boolean) {
  if (value === reduced) return;
  reduced = value;
  listeners.forEach(listener => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    const current = ++version;
    subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', value => {
      ++version;
      publish(value);
    });
    AccessibilityInfo.isReduceMotionEnabled().then(value => {
      if (current === version) publish(value);
    }).catch(() => {});
  }
  return () => {
    listeners.delete(listener);
    if (!listeners.size) {
      ++version;
      subscription?.remove();
      subscription = undefined;
      reduced = true;
    }
  };
}

/** One platform subscription shared by all mounted controls. */
export function useReducedMotion() {
  return useSyncExternalStore(subscribe, () => reduced, () => true);
}
