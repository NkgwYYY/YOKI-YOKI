import { useCallback, useEffect, useState } from 'react';
import { AccessibilityInfo, AppState, Platform } from 'react-native';
import { useFocusEffect } from 'expo-router';

/** Shared by scenes and global feedback: never animate in a hidden/background app. */
export function useAppActivity() {
  const [foreground, setForeground] = useState(AppState.currentState === 'active');
  const [visible, setVisible] = useState(true);
  const [reduceMotion, setReduceMotion] = useState(true);
  useEffect(() => {
    const state = AppState.addEventListener('change', value => setForeground(value === 'active'));
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then(value => { if (alive) setReduceMotion(value); }).catch(() => {});
    const motion = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    const update = () => setVisible(!document.hidden);
    if (Platform.OS === 'web') {
      update();
      document.addEventListener('visibilitychange', update);
    }
    return () => {
      alive = false;
      state.remove(); motion.remove();
      if (Platform.OS === 'web') document.removeEventListener('visibilitychange', update);
    };
  }, []);
  return { active: foreground && visible, reduceMotion };
}

/** Room routines also stop when another navigation screen is focused. */
export function useRoomActivity() {
  const [focused, setFocused] = useState(false);
  useFocusEffect(useCallback(() => { setFocused(true); return () => setFocused(false); }, []));
  const { active, reduceMotion } = useAppActivity();
  return { active: focused && active, reduceMotion };
}
